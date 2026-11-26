import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Paperclip,
  X,
  Mail,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { SITE_CONFIG } from '../config/siteConfig';
import {
  compressImageFile,
  formatFileSize,
  getInitials
} from '../utils/mediaHelpers';
import MessageItem from './MessageItem';
import VoiceRecorderButton from './VoiceRecorderButton';

export default function DirectMessagesView({
  user,
  profile,
  members,
  selectedPartner,
  onSelectPartner,
  onMessagesRead
}) {
  const [threadMessages, setThreadMessages] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedMediaType, setSelectedMediaType] = useState(null);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef(null);
  const endRef = useRef(null);

  const otherMembers = members.filter((m) => m.id !== user.id);

  const scrollBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!selectedPartner?.id) {
      setThreadMessages([]);
      return;
    }

    let active = true;

    async function loadConversation() {
      setLoadingThread(true);
      setErrorMsg('');

      try {
        const { data, error } = await supabase
          .from('direct_messages')
          .select('*')
          .or(
            `and(sender_id.eq.${user.id},recipient_id.eq.${selectedPartner.id}),and(sender_id.eq.${selectedPartner.id},recipient_id.eq.${user.id})`
          )
          .order('created_at', { ascending: true })
          .limit(150);

        if (!active) return;
        if (error) throw error;

        const enriched = (data || []).map((item) => ({
          ...item,
          author: item.sender_id === user.id ? profile : selectedPartner
        }));
        setThreadMessages(enriched);

        // Tandai pesan masuk dari lawan bicara sebagai terbaca
        await supabase
          .from('direct_messages')
          .update({ is_read: true })
          .eq('sender_id', selectedPartner.id)
          .eq('recipient_id', user.id)
          .eq('is_read', false);

        if (onMessagesRead) onMessagesRead();
        setTimeout(scrollBottom, 120);
      } catch (err) {
        if (active) setErrorMsg(err.message || 'Gagal memuat chat pribadi.');
      } finally {
        if (active) setLoadingThread(false);
      }
    }

    loadConversation();
    return () => {
      active = false;
    };
  }, [selectedPartner, user.id, profile, onMessagesRead, scrollBottom]);

  // Realtime untuk chat pribadi yang sedang dibuka
  useEffect(() => {
    if (!selectedPartner?.id) return;

    const channel = supabase
      .channel(`dm-thread-${user.id}-${selectedPartner.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        async (payload) => {
          const row = payload.new;
          if (!row) return;

          const isThisConversation =
            (row.sender_id === user.id && row.recipient_id === selectedPartner.id) ||
            (row.sender_id === selectedPartner.id && row.recipient_id === user.id);

          if (!isThisConversation) return;

          const enrichedRow = {
            ...row,
            author: row.sender_id === user.id ? profile : selectedPartner
          };

          setThreadMessages((prev) => {
            if (prev.some((item) => item.id === row.id)) return prev;
            return [...prev, enrichedRow];
          });

          if (row.sender_id === selectedPartner.id) {
            await supabase
              .from('direct_messages')
              .update({ is_read: true })
              .eq('id', row.id);
            if (onMessagesRead) onMessagesRead();
          }

          setTimeout(scrollBottom, 100);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'direct_messages' },
        (payload) => {
          if (payload.old?.id) {
            setThreadMessages((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPartner, user.id, profile, onMessagesRead, scrollBottom]);

  const handleFilePick = (e) => {
    setErrorMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > SITE_CONFIG.maxFileSizeBytes) {
      setErrorMsg('Ukuran file maksimal 35 MB.');
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

  const handleSendDm = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedPartner?.id) return;
    if (profile?.is_banned) {
      setErrorMsg('Akun kamu sedang dibatasi oleh pengelola.');
      return;
    }

    const cleanContent = content.trim();
    if (!cleanContent && !selectedFile) return;

    setSending(true);
    try {
      let mediaUrl = null;
      let mediaName = null;
      let mediaSize = null;
      let mediaPath = null;

      if (selectedFile) {
        const readyFile =
          selectedMediaType === 'image'
            ? await compressImageFile(selectedFile)
            : selectedFile;

        const safeName = readyFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${user.id}/dm-${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('forum-media')
          .upload(path, readyFile, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: pubData } = supabase.storage.from('forum-media').getPublicUrl(path);
        mediaUrl = pubData?.publicUrl || null;
        mediaName = selectedFile.name;
        mediaSize = readyFile.size;
        mediaPath = path;
      }

      const { error } = await supabase.from('direct_messages').insert({
        sender_id: user.id,
        recipient_id: selectedPartner.id,
        content: cleanContent,
        media_url: mediaUrl,
        media_type: selectedMediaType,
        media_name: mediaName,
        media_size: mediaSize,
        media_path: mediaPath
      });

      if (error) throw error;

      setContent('');
      setSelectedFile(null);
      setSelectedMediaType(null);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mengirim pesan pribadi.');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteDm = async (msg) => {
    try {
      if (msg.media_path) {
        await supabase.storage.from('forum-media').remove([msg.media_path]);
      }
      await supabase.from('direct_messages').delete().eq('id', msg.id);
      setThreadMessages((prev) => prev.filter((item) => item.id !== msg.id));
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menghapus pesan.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Daftar Kontak Member */}
      <div className="lg:col-span-4 rounded-2xl bg-[#15181E] border border-white/[0.08] overflow-hidden flex flex-col max-h-[72vh]">
        <div className="px-5 py-4 bg-[#1C2028] border-b border-white/[0.08] flex items-center justify-between">
          <h1 className="text-base font-semibold text-[#F4F5F7]">Chat pribadi</h1>
          <span className="text-xs font-mono text-[#68707E]">1-on-1</span>
        </div>

        <div data-lenis-prevent className="flex-1 overflow-y-auto divide-y divide-white/[0.06]">
          {otherMembers.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#68707E]">
              Belum ada member lain yang terdaftar.
            </div>
          ) : (
            otherMembers.map((member) => {
              const isSelected = selectedPartner?.id === member.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => onSelectPartner(member)}
                  className={`w-full text-left px-5 py-3.5 flex items-center gap-3 transition-colors duration-150 ${
                    isSelected ? 'bg-[#1C2028]' : 'hover:bg-[#1C2028]/50'
                  }`}
                >
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.display_name}
                      className="w-9 h-9 rounded-full object-cover border border-white/[0.08] shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#0E1013] border border-white/[0.08] flex items-center justify-center text-xs font-mono text-[#F4F5F7] shrink-0">
                      {getInitials(member.display_name)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#F4F5F7] truncate">
                      {member.display_name}
                    </p>
                    <p className="text-xs text-[#68707E] truncate">
                      {member.bio || 'Ketuk untuk membuka percakapan'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Ruang Percakapan 1-on-1 */}
      <div className="lg:col-span-8 rounded-2xl bg-[#15181E] border border-white/[0.08] overflow-hidden flex flex-col min-h-[72vh]">
        {selectedPartner ? (
          <>
            <div className="px-5 py-4 bg-[#1C2028] border-b border-white/[0.08] flex items-center gap-3">
              {selectedPartner.avatar_url ? (
                <img
                  src={selectedPartner.avatar_url}
                  alt={selectedPartner.display_name}
                  className="w-8 h-8 rounded-full object-cover border border-white/[0.08]"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#0E1013] border border-white/[0.08] flex items-center justify-center text-xs font-mono text-[#F4F5F7]">
                  {getInitials(selectedPartner.display_name)}
                </div>
              )}
              <div>
                <h2 className="text-sm font-semibold text-[#F4F5F7]">
                  {selectedPartner.display_name}
                </h2>
                <p className="text-xs text-[#68707E]">Jalur percakapan pribadi</p>
              </div>
            </div>

            <div
              data-lenis-prevent
              className="flex-1 overflow-y-auto max-h-[58vh] divide-y divide-white/[0.06]"
            >
              {loadingThread ? (
                <div className="py-20 flex items-center justify-center gap-2 text-sm text-[#68707E]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#3B82F6]" strokeWidth={1.5} />
                  <span>Memuat percakapan...</span>
                </div>
              ) : threadMessages.length === 0 ? (
                <div className="py-20 text-center px-6 space-y-1">
                  <p className="text-sm font-medium text-[#F4F5F7]">
                    Belum ada pesan dengan {selectedPartner.display_name}
                  </p>
                  <p className="text-xs text-[#68707E]">
                    Kirim pesan teks, lampiran media hingga 35 MB, atau pesan suara di bawah
                  </p>
                </div>
              ) : (
                threadMessages.map((msg) => (
                  <MessageItem
                    key={msg.id}
                    message={msg}
                    currentUserId={user.id}
                    isAdmin={false}
                    onDelete={handleDeleteDm}
                    showDmAction={false}
                  />
                ))
              )}
              <div ref={endRef} />
            </div>

            <div className="p-4 bg-[#1C2028] border-t border-white/[0.08]">
              <form onSubmit={handleSendDm} className="space-y-3">
                {errorMsg && (
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-xs text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {selectedFile && (
                  <div className="px-3 py-2 rounded-lg bg-[#0E1013] border border-white/[0.08] flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-[#F4F5F7] truncate">
                      {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setSelectedMediaType(null);
                      }}
                      className="p-1 text-[#68707E] hover:text-[#F4F5F7]"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFilePick}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0E1013] border border-white/[0.08] text-xs font-medium text-[#9BA1AE] hover:text-[#F4F5F7] shrink-0"
                  >
                    <Paperclip className="w-4 h-4" strokeWidth={1.5} />
                    <span className="hidden sm:inline">Media</span>
                  </button>

                  <VoiceRecorderButton
                    disabled={sending}
                    onRecorded={(voiceFile) => {
                      setSelectedFile(voiceFile);
                      setSelectedMediaType('voice');
                    }}
                    onError={(msg) => setErrorMsg(msg)}
                  />

                  <textarea
                    rows={1}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={`Kirim pesan ke ${selectedPartner.display_name}...`}
                    className="flex-1 px-3.5 py-2 rounded-lg bg-[#0E1013] border border-white/[0.08] text-sm text-[#F4F5F7] placeholder:text-[#68707E] focus:outline-none focus:border-[#3B82F6] resize-none"
                  />

                  <button
                    type="submit"
                    disabled={sending}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3B82F6] text-white text-sm font-medium hover:bg-[#2563EB] disabled:opacity-50 shrink-0"
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
            </div>
          </>
        ) : (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-11 h-11 rounded-xl bg-[#0E1013] border border-white/[0.08] flex items-center justify-center text-[#3B82F6]">
              <Mail className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-[#F4F5F7]">Pilih member untuk memulai chat</p>
            <p className="text-xs text-[#68707E] max-w-xs leading-relaxed">
              Pilih salah satu member di panel sebelah kiri untuk membuka percakapan pribadi
              1-on-1
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
