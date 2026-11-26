import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Paperclip,
  X,
  Pin,
  Users,
  Search,
  AlertCircle,
  Loader2,
  Ban
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { SITE_CONFIG } from '../config/siteConfig';
import {
  compressImageFile,
  formatFileSize,
  formatDuration,
  getInitials
} from '../utils/mediaHelpers';
import MessageItem from './MessageItem';
import VoiceRecorderButton from './VoiceRecorderButton';

export default function ForumWorkspace({
  user,
  profile,
  isAdmin,
  members,
  onStartDm
}) {
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [pinned, setPinned] = useState({ pinned_title: '', pinned_content: '' });
  const [memberSearch, setMemberSearch] = useState('');

  // State composer kirim pesan
  const [category, setCategory] = useState('obrolan');
  const [priceText, setPriceText] = useState('');
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedMediaType, setSelectedMediaType] = useState(null);
  const [sending, setSending] = useState(false);
  const [composerError, setComposerError] = useState('');

  // Timer hitung mundur jeda 5 menit kategori Jualan
  const [jualanCooldownLeft, setJualanCooldownLeft] = useState(0);

  const fileInputRef = useRef(null);
  const streamEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    streamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Muat pengumuman tersemat & pesan grup utama
  useEffect(() => {
    let active = true;

    async function fetchInitialData() {
      setLoadingMessages(true);
      try {
        const [{ data: pinData }, { data: msgData }] = await Promise.all([
          supabase.from('forum_settings').select('*').eq('id', 1).maybeSingle(),
          supabase
            .from('forum_messages')
            .select(
              '*, author:profiles!forum_messages_user_id_fkey(id, display_name, avatar_url, email, is_banned)'
            )
            .order('created_at', { ascending: true })
            .limit(120)
        ]);

        if (!active) return;

        if (pinData) setPinned(pinData);

        if (Array.isArray(msgData)) {
          setMessages(msgData);

          // Hitung sisa jeda jualan milik user saat ini jika ada
          const myLastJualan = [...msgData]
            .reverse()
            .find((m) => m.user_id === user.id && m.category === 'jualan');

          if (myLastJualan) {
            const elapsed = Math.floor(
              (Date.now() - new Date(myLastJualan.created_at).getTime()) / 1000
            );
            if (elapsed < SITE_CONFIG.jualanCooldownSeconds) {
              setJualanCooldownLeft(SITE_CONFIG.jualanCooldownSeconds - elapsed);
            }
          }

          setTimeout(scrollToBottom, 150);
        }
      } finally {
        if (active) setLoadingMessages(false);
      }
    }

    fetchInitialData();
    return () => {
      active = false;
    };
  }, [user.id, scrollToBottom]);

  // Timer detik untuk cooldown jualan
  useEffect(() => {
    if (jualanCooldownLeft <= 0) return;
    const interval = setInterval(() => {
      setJualanCooldownLeft((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [jualanCooldownLeft]);

  // Realtime listener untuk pesan baru & penghapusan pesan
  useEffect(() => {
    const channel = supabase
      .channel('nusaforums-main-stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'forum_messages' },
        async (payload) => {
          const newId = payload.new?.id;
          if (!newId) return;

          const { data: fullRow } = await supabase
            .from('forum_messages')
            .select(
              '*, author:profiles!forum_messages_user_id_fkey(id, display_name, avatar_url, email, is_banned)'
            )
            .eq('id', newId)
            .maybeSingle();

          if (fullRow) {
            setMessages((prev) => {
              if (prev.some((item) => item.id === fullRow.id)) return prev;
              return [...prev, fullRow];
            });
            setTimeout(scrollToBottom, 100);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'forum_messages' },
        (payload) => {
          const deletedId = payload.old?.id;
          if (deletedId) {
            setMessages((prev) => prev.filter((item) => item.id !== deletedId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'forum_settings' },
        (payload) => {
          if (payload.new) setPinned(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scrollToBottom]);

  const handleFileChange = (e) => {
    setComposerError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > SITE_CONFIG.maxFileSizeBytes) {
      setComposerError('Ukuran file melebihi batas maksimal 35 MB.');
      e.target.value = '';
      return;
    }

    let type = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';

    setSelectedFile(file);
    setSelectedMediaType(type);
    e.target.value = '';
  };

  const handleVoiceRecorded = (voiceFile) => {
    setComposerError('');
    setSelectedFile(voiceFile);
    setSelectedMediaType('voice');
  };

  const clearAttachment = () => {
    setSelectedFile(null);
    setSelectedMediaType(null);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setComposerError('');

    if (profile?.is_banned) {
      setComposerError('Akun kamu sedang diblokir oleh pengelola forum.');
      return;
    }

    if (category === 'jualan' && jualanCooldownLeft > 0) {
      setComposerError(
        `Tunggu ${formatDuration(jualanCooldownLeft)} sebelum mengirim lapak jualan berikutnya.`
      );
      return;
    }

    const cleanContent = content.trim();
    const cleanPrice = priceText.trim();

    if (!cleanContent && !selectedFile) {
      setComposerError('Tulis pesan atau lampirkan media terlebih dahulu.');
      return;
    }

    setSending(true);
    try {
      let mediaUrl = null;
      let mediaName = null;
      let mediaSize = null;
      let mediaPath = null;
      let finalMediaType = selectedMediaType;

      if (selectedFile) {
        const uploadReadyFile =
          selectedMediaType === 'image'
            ? await compressImageFile(selectedFile)
            : selectedFile;

        const safeName = uploadReadyFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${user.id}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('forum-media')
          .upload(path, uploadReadyFile, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: pubUrlData } = supabase.storage
          .from('forum-media')
          .getPublicUrl(path);

        mediaUrl = pubUrlData?.publicUrl || null;
        mediaName = selectedFile.name;
        mediaSize = uploadReadyFile.size;
        mediaPath = path;
      }

      const { error: insertError } = await supabase.from('forum_messages').insert({
        user_id: user.id,
        category,
        price_text: category === 'jualan' && cleanPrice ? cleanPrice : null,
        content: cleanContent,
        media_url: mediaUrl,
        media_type: finalMediaType,
        media_name: mediaName,
        media_size: mediaSize,
        media_path: mediaPath
      });

      if (insertError) throw insertError;

      if (category === 'jualan') {
        setJualanCooldownLeft(SITE_CONFIG.jualanCooldownSeconds);
      }

      setContent('');
      setPriceText('');
      clearAttachment();
    } catch (err) {
      setComposerError(err.message || 'Gagal mengirim pesan.');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (msg) => {
    try {
      if (msg.media_path) {
        await supabase.storage.from('forum-media').remove([msg.media_path]);
      }
      await supabase.from('forum_messages').delete().eq('id', msg.id);
      setMessages((prev) => prev.filter((item) => item.id !== msg.id));
    } catch (err) {
      setComposerError(err.message || 'Gagal menghapus kiriman.');
    }
  };

  const filteredMembers = members.filter((m) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      m.display_name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Kolom Utama: Aliran Grup Forum */}
      <div className="lg:col-span-8 flex flex-col rounded-2xl bg-[#15181E] border border-white/[0.08] overflow-hidden min-h-[72vh]">
        {/* Header Grup Utama */}
        <div className="px-5 py-4 bg-[#1C2028] border-b border-white/[0.08] flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
              <h1 className="text-base font-semibold text-[#F4F5F7]">Grup utama NusaForums</h1>
            </div>
            <p className="text-xs text-[#9BA1AE]">
              Diskusi bebas, berbagi file maksimal 35 MB, dan lapak jualan
            </p>
          </div>

          <span className="text-xs font-mono text-[#68707E] tabular-nums shrink-0">
            {members.length} member
          </span>
        </div>

        {/* Pengumuman Tersemat (Pinned) */}
        {(pinned.pinned_title || pinned.pinned_content) && (
          <div className="px-5 py-3.5 bg-[#0E1013] border-b border-white/[0.08] flex items-start gap-3">
            <Pin className="w-4 h-4 text-[#3B82F6] shrink-0 mt-0.5" strokeWidth={1.5} />
            <div className="space-y-0.5 min-w-0">
              {pinned.pinned_title && (
                <p className="text-xs font-semibold text-[#F4F5F7]">{pinned.pinned_title}</p>
              )}
              {pinned.pinned_content && (
                <p className="text-xs text-[#9BA1AE] leading-relaxed">
                  {pinned.pinned_content}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Daftar Aliran Pesan */}
        <div
          data-lenis-prevent
          className="flex-1 overflow-y-auto max-h-[58vh] divide-y divide-white/[0.06]"
        >
          {loadingMessages ? (
            <div className="py-20 flex items-center justify-center gap-2.5 text-sm text-[#68707E]">
              <Loader2 className="w-4 h-4 animate-spin text-[#3B82F6]" strokeWidth={1.5} />
              <span>Memuat percakapan forum...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="py-20 text-center px-6 space-y-1">
              <p className="text-sm font-medium text-[#F4F5F7]">Belum ada kiriman di grup ini</p>
              <p className="text-xs text-[#68707E]">
                Mulai percakapan atau pasang lapak pertama melalui kolom di bawah
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                currentUserId={user.id}
                isAdmin={isAdmin}
                onDelete={handleDeleteMessage}
                onStartDm={onStartDm}
              />
            ))
          )}
          <div ref={streamEndRef} />
        </div>

        {/* Bilah Input Pesan & Lampiran */}
        <div className="p-4 bg-[#1C2028] border-t border-white/[0.08]">
          {profile?.is_banned ? (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-400 flex items-center gap-2.5">
              <Ban className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span>
                Akun kamu dibatasi oleh pengelola sehingga tidak dapat mengirim pesan di forum.
              </span>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="space-y-3">
              {/* Pilihan Mode: Obrolan vs Jualan */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex rounded-lg bg-[#0E1013] p-1 border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setCategory('obrolan')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors duration-150 ${
                      category === 'obrolan'
                        ? 'bg-[#1C2028] text-[#F4F5F7]'
                        : 'text-[#68707E] hover:text-[#9BA1AE]'
                    }`}
                  >
                    Obrolan
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('jualan')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors duration-150 tabular-nums ${
                      category === 'jualan'
                        ? 'bg-[#3B82F6] text-white'
                        : 'text-[#68707E] hover:text-[#9BA1AE]'
                    }`}
                  >
                    {jualanCooldownLeft > 0
                      ? `Jualan (${formatDuration(jualanCooldownLeft)})`
                      : 'Jualan'}
                  </button>
                </div>

                {category === 'jualan' && (
                  <input
                    type="text"
                    maxLength={40}
                    value={priceText}
                    onChange={(e) => setPriceText(e.target.value)}
                    placeholder="Harga (misal: Rp 50.000)"
                    className="px-3 py-1.5 rounded-lg bg-[#0E1013] border border-white/[0.08] text-xs font-mono text-[#F4F5F7] placeholder:text-[#68707E] focus:outline-none focus:border-[#3B82F6]"
                  />
                )}
              </div>

              {composerError && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-xs text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                  <span>{composerError}</span>
                </div>
              )}

              {/* Pratinjau File yang Dipilih */}
              {selectedFile && (
                <div className="px-3 py-2 rounded-lg bg-[#0E1013] border border-white/[0.08] flex items-center justify-between gap-2">
                  <div className="text-xs font-mono text-[#F4F5F7] truncate">
                    Lampiran ({selectedMediaType}): {selectedFile.name} ·{' '}
                    <span className="text-[#68707E] tabular-nums">
                      {formatFileSize(selectedFile.size)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={clearAttachment}
                    className="p-1 text-[#68707E] hover:text-[#F4F5F7]"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              )}

              {/* Input Teks & Tombol Media */}
              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  title="Lampirkan foto, video, atau file (maks 35 MB)"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0E1013] border border-white/[0.08] text-xs font-medium text-[#9BA1AE] hover:text-[#F4F5F7] hover:border-white/15 disabled:opacity-50 transition-colors duration-150 shrink-0"
                >
                  <Paperclip className="w-4 h-4" strokeWidth={1.5} />
                  <span className="hidden sm:inline">Media</span>
                </button>

                <VoiceRecorderButton
                  disabled={sending}
                  onRecorded={handleVoiceRecorded}
                  onError={(msg) => setComposerError(msg)}
                />

                <textarea
                  rows={1}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    category === 'jualan'
                      ? 'Tulis deskripsi produk atau jasa...'
                      : 'Tulis pesan atau keterangan lampiran...'
                  }
                  className="flex-1 px-3.5 py-2 rounded-lg bg-[#0E1013] border border-white/[0.08] text-sm text-[#F4F5F7] placeholder:text-[#68707E] focus:outline-none focus:border-[#3B82F6] resize-none"
                />

                <button
                  type="submit"
                  disabled={sending || (category === 'jualan' && jualanCooldownLeft > 0)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3B82F6] text-white text-sm font-medium hover:bg-[#2563EB] disabled:opacity-50 transition-colors duration-150 shrink-0"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                  ) : (
                    <Send className="w-4 h-4" strokeWidth={1.5} />
                  )}
                  <span className="hidden sm:inline">Kirim</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Kolom Samping: Daftar Member untuk Chat Pribadi */}
      <aside className="lg:col-span-4 rounded-2xl bg-[#15181E] border border-white/[0.08] overflow-hidden flex flex-col max-h-[72vh]">
        <div className="px-5 py-4 bg-[#1C2028] border-b border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#3B82F6]" strokeWidth={1.5} />
              <h2 className="text-sm font-semibold text-[#F4F5F7]">Member terdaftar</h2>
            </div>
            <span className="text-xs font-mono text-[#68707E] tabular-nums">
              {members.length}
            </span>
          </div>

          <div className="relative">
            <Search
              className="w-4 h-4 text-[#68707E] absolute left-3 top-1/2 -translate-y-1/2"
              strokeWidth={1.5}
            />
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Cari nama member"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0E1013] border border-white/[0.08] text-xs text-[#F4F5F7] placeholder:text-[#68707E] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>
        </div>

        <div data-lenis-prevent className="flex-1 overflow-y-auto divide-y divide-white/[0.06]">
          {filteredMembers.map((member) => {
            const isSelf = member.id === user.id;
            return (
              <div
                key={member.id}
                className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-[#1C2028]/50 transition-colors duration-150"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.display_name}
                      className="w-8 h-8 rounded-full object-cover border border-white/[0.08] shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#1C2028] border border-white/[0.08] flex items-center justify-center text-xs font-mono text-[#F4F5F7] shrink-0">
                      {getInitials(member.display_name)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#F4F5F7] truncate">
                      {member.display_name} {isSelf ? '(Anda)' : ''}
                    </p>
                    {member.bio && (
                      <p className="text-xs text-[#68707E] truncate">{member.bio}</p>
                    )}
                  </div>
                </div>

                {!isSelf && (
                  <button
                    type="button"
                    onClick={() => onStartDm(member)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0E1013] border border-white/[0.08] text-xs font-medium text-[#9BA1AE] hover:text-[#3B82F6] hover:border-[#3B82F6]/40 transition-colors duration-150 shrink-0"
                  >
                    Chat
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
