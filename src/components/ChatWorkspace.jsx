import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search,
  Users,
  ShoppingBag,
  MessageSquarePlus,
  Send,
  Paperclip,
  Mic,
  Square,
  X,
  ArrowLeft,
  Shield,
  LogOut,
  Pin,
  Settings,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { SITE_CONFIG } from '../config/siteConfig';
import {
  formatTimeShort,
  formatDateHeader,
  isJualanCategory,
  getInitials
} from '../utils/formatters';
import MessageBubble from './MessageBubble';
import MemberProfileModal from './MemberProfileModal';

export default function ChatWorkspace({
  user,
  profile,
  isAdmin,
  settings,
  onOpenAdminPanel,
  onSignOut,
  onProfileUpdated
}) {
  // Data profil seluruh member (untuk nama, avatar, badge Verified)
  const [profilesMap, setProfilesMap] = useState({});
  const [adminEmailsSet, setAdminEmailsSet] = useState(new Set());
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());

  // Navigasi dua-panel ala WhatsApp: 'group' | 'bursa' | 'dm:<uuid>'
  const [activeThread, setActiveThread] = useState('group');
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [showNewDmPicker, setShowNewDmPicker] = useState(false);

  // Filter pesan di Grup Utama: 'all' | 'obrolan' | 'jualan'
  const [groupFilter, setGroupFilter] = useState('all');

  // Data pesan
  const [forumMessages, setForumMessages] = useState([]);
  const [directMessages, setDirectMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);

  // State Composer
  const [composerText, setComposerText] = useState('');
  const [postCategory, setPostCategory] = useState('obrolan');
  const [priceText, setPriceText] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [composerError, setComposerError] = useState('');
  const [cooldownLeft, setCooldownLeft] = useState(0);

  // Voice Note Recorder
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Modal Profil Member, Edit Profil Sendiri & Lightbox Gambar
  const [inspectedMember, setInspectedMember] = useState(null);
  const [editingOwnProfile, setEditingOwnProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(profile?.display_name || '');
  const [editBio, setEditBio] = useState(profile?.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto'
      });
    }, 60);
  }, []);

  // Muat profil semua member
  const fetchAllProfiles = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, email, display_name, avatar_url, bio, is_verified, is_banned, created_at');

    if (Array.isArray(data)) {
      const mapObj = {};
      for (const row of data) {
        mapObj[row.id] = row;
      }
      setProfilesMap(mapObj);
    }
  }, []);

  // Muat pesan grup & DM
  const fetchInitialMessages = useCallback(async () => {
    if (!supabase || !user) return;
    setLoadingMessages(true);
    try {
      const [forumRes, dmRes] = await Promise.all([
        supabase
          .from('forum_messages')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(200),
        supabase
          .from('direct_messages')
          .select('*')
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order('created_at', { ascending: true })
          .limit(300)
      ]);

      if (Array.isArray(forumRes.data)) setForumMessages(forumRes.data);
      if (Array.isArray(dmRes.data)) setDirectMessages(dmRes.data);
    } finally {
      setLoadingMessages(false);
      scrollToBottom(false);
    }
  }, [user, scrollToBottom]);

  useEffect(() => {
    fetchAllProfiles();
    fetchInitialMessages();

    if (isAdmin && user?.email) {
      setAdminEmailsSet(new Set([user.email.toLowerCase()]));
    }
  }, [fetchAllProfiles, fetchInitialMessages, isAdmin, user]);

  // Hitung sisa cooldown 5 menit untuk kategori Jualan milik user sendiri
  useEffect(() => {
    const myJualanPosts = forumMessages.filter(
      (m) => m.user_id === user.id && isJualanCategory(m.category)
    );
    if (myJualanPosts.length === 0) {
      setCooldownLeft(0);
      return;
    }

    const latestPost = myJualanPosts[myJualanPosts.length - 1];
    const calcRemaining = () => {
      const elapsed = Math.floor(
        (Date.now() - new Date(latestPost.created_at).getTime()) / 1000
      );
      return Math.max(0, SITE_CONFIG.jualanCooldownSeconds - elapsed);
    };

    setCooldownLeft(calcRemaining());
    const interval = setInterval(() => {
      setCooldownLeft(calcRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [forumMessages, user.id]);

  // Realtime Subscription: Pesan Grup, DM & Presence Online
  useEffect(() => {
    if (!supabase || !user) return;

    const channel = supabase.channel('nusaforums-live-hub', {
      config: { presence: { key: user.id } }
    });

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'forum_messages' },
        (payload) => {
          setForumMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          fetchAllProfiles();
          scrollToBottom(true);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'forum_messages' },
        (payload) => {
          setForumMessages((prev) =>
            prev.map((m) => (m.id === payload.new.id ? payload.new : m))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'forum_messages' },
        (payload) => {
          setForumMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const msg = payload.new;
          if (msg.sender_id === user.id || msg.recipient_id === user.id) {
            setDirectMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            fetchAllProfiles();
            scrollToBottom(true);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'direct_messages' },
        (payload) => {
          setDirectMessages((prev) =>
            prev.map((m) => (m.id === payload.new.id ? payload.new : m))
          );
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const ids = new Set(Object.keys(state));
        ids.add(user.id);
        setOnlineUserIds(ids);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
          await supabase
            .from('profiles')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', user.id);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchAllProfiles, scrollToBottom]);

  // Tandai DM sebagai sudah dibaca saat membuka ruang DM tersebut
  useEffect(() => {
    if (!activeThread.startsWith('dm:') || !supabase || !user) return;
    const partnerId = activeThread.replace('dm:', '');

    const unreadIds = directMessages
      .filter(
        (m) =>
          m.sender_id === partnerId &&
          m.recipient_id === user.id &&
          m.is_read === false
      )
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      supabase
        .from('direct_messages')
        .update({ is_read: true })
        .in('id', unreadIds)
        .then(() => {
          setDirectMessages((prev) =>
            prev.map((m) => (unreadIds.includes(m.id) ? { ...m, is_read: true } : m))
          );
        });
    }
  }, [activeThread, directMessages, user]);

  // Susun daftar percakapan DM di panel kiri
  const dmConversations = useMemo(() => {
    const partnerMap = new Map();

    for (const msg of directMessages) {
      const partnerId =
        msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
      const existing = partnerMap.get(partnerId);
      const isUnread =
        msg.recipient_id === user.id && msg.sender_id === partnerId && !msg.is_read;

      if (!existing) {
        partnerMap.set(partnerId, {
          partnerId,
          lastMessage: msg,
          unreadCount: isUnread ? 1 : 0
        });
      } else {
        existing.lastMessage = msg;
        if (isUnread) existing.unreadCount += 1;
      }
    }

    return Array.from(partnerMap.values()).sort(
      (a, b) =>
        new Date(b.lastMessage.created_at).getTime() -
        new Date(a.lastMessage.created_at).getTime()
    );
  }, [directMessages, user.id]);

  const handleSelectThread = (threadId) => {
    setActiveThread(threadId);
    setReplyTarget(null);
    setComposerError('');
    setMobileShowChat(true);
    if (threadId === 'bursa') {
      setPostCategory('jualan');
    } else if (threadId === 'group') {
      setPostCategory('obrolan');
    }
    scrollToBottom(false);
  };

  const handleStartDirectMessage = (targetMember) => {
    if (!targetMember || targetMember.id === user.id) return;
    setProfilesMap((prev) => ({ ...prev, [targetMember.id]: targetMember }));
    handleSelectThread(`dm:${targetMember.id}`);
  };

  // Unggah lampiran ke Supabase Storage
  const uploadAttachment = async (fileObj) => {
    if (!fileObj) return null;
    if (fileObj.size > SITE_CONFIG.maxUploadBytes) {
      throw new Error('Ukuran berkas maksimal 35 MB.');
    }

    const ext = fileObj.name?.split('.').pop() || 'bin';
    const filePath = `${user.id}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(SITE_CONFIG.storageBucket)
      .upload(filePath, fileObj, { upsert: false });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from(SITE_CONFIG.storageBucket)
      .getPublicUrl(filePath);

    return {
      media_url: urlData.publicUrl,
      media_type: fileObj.type || 'application/octet-stream',
      media_name: fileObj.name || 'lampiran',
      media_size: fileObj.size,
      media_path: filePath
    };
  };

  // Kirim Pesan (Grup Utama, Bursa Jualan, atau DM)
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    setComposerError('');

    const cleanText = composerText.trim();
    if (!cleanText && !selectedFile) return;

    const isDm = activeThread.startsWith('dm:');
    const effectiveCategory =
      activeThread === 'bursa' ? 'jualan' : postCategory;

    if (!isDm && effectiveCategory === 'jualan' && cooldownLeft > 0) {
      setComposerError(
        `Jeda posting jualan tersisa ${Math.floor(cooldownLeft / 60)}m ${
          cooldownLeft % 60
        }d.`
      );
      return;
    }

    setSending(true);
    try {
      let mediaPayload = {
        media_url: null,
        media_type: null,
        media_name: null,
        media_size: null,
        media_path: null
      };

      if (selectedFile) {
        mediaPayload = await uploadAttachment(selectedFile);
      }

      if (isDm) {
        const recipientId = activeThread.replace('dm:', '');
        const { data, error } = await supabase
          .from('direct_messages')
          .insert({
            sender_id: user.id,
            recipient_id: recipientId,
            content: cleanText,
            reply_to_id: replyTarget?.id || null,
            reply_preview: replyTarget || null,
            ...mediaPayload
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setDirectMessages((prev) =>
            prev.some((m) => m.id === data.id) ? prev : [...prev, data]
          );
        }
      } else {
        const { data, error } = await supabase
          .from('forum_messages')
          .insert({
            user_id: user.id,
            category: effectiveCategory,
            price_text: effectiveCategory === 'jualan' ? priceText.trim() : null,
            content: cleanText,
            reply_to_id: replyTarget?.id || null,
            reply_preview: replyTarget || null,
            is_sold: false,
            ...mediaPayload
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setForumMessages((prev) =>
            prev.some((m) => m.id === data.id) ? prev : [...prev, data]
          );
        }
      }

      setComposerText('');
      setPriceText('');
      setSelectedFile(null);
      setReplyTarget(null);
      scrollToBottom(true);
    } catch (err) {
      setComposerError(err.message || 'Gagal mengirim pesan.');
    } finally {
      setSending(false);
    }
  };

  // Rekam Voice Note
  const handleStartRecording = async () => {
    setComposerError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, {
          type: 'audio/webm'
        });
        setSelectedFile(audioFile);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
    } catch {
      setComposerError('Izin mikrofon ditolak atau tidak tersedia di browser ini.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    if (!isRecording) return;
    const timer = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  const handleToggleSold = async (msg) => {
    const nextSold = !msg.is_sold;
    const { error } = await supabase
      .from('forum_messages')
      .update({ is_sold: nextSold })
      .eq('id', msg.id);

    if (!error) {
      setForumMessages((prev) =>
        prev.map((item) => (item.id === msg.id ? { ...item, is_sold: nextSold } : item))
      );
    }
  };

  const handleDeleteMessage = async (msgId) => {
    const { error } = await supabase.from('forum_messages').delete().eq('id', msgId);
    if (!error) {
      setForumMessages((prev) => prev.filter((item) => item.id !== msgId));
    }
  };

  const handleSaveOwnProfile = async (e) => {
    e.preventDefault();
    if (!editDisplayName.trim()) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: editDisplayName.trim(),
          bio: editBio.trim()
        })
        .eq('id', user.id);

      if (error) throw error;
      await fetchAllProfiles();
      if (onProfileUpdated) onProfileUpdated();
      setEditingOwnProfile(false);
    } finally {
      setSavingProfile(false);
    }
  };

  // Filter pesan untuk panel kanan aktif
  const displayedMessages = useMemo(() => {
    if (activeThread === 'bursa') {
      return forumMessages.filter((m) => isJualanCategory(m.category));
    }
    if (activeThread === 'group') {
      if (groupFilter === 'jualan') {
        return forumMessages.filter((m) => isJualanCategory(m.category));
      }
      if (groupFilter === 'obrolan') {
        return forumMessages.filter((m) => !isJualanCategory(m.category));
      }
      return forumMessages;
    }
    if (activeThread.startsWith('dm:')) {
      const partnerId = activeThread.replace('dm:', '');
      return directMessages.filter(
        (m) =>
          (m.sender_id === user.id && m.recipient_id === partnerId) ||
          (m.sender_id === partnerId && m.recipient_id === user.id)
      );
    }
    return [];
  }, [activeThread, groupFilter, forumMessages, directMessages, user.id]);

  const activeDmPartner = activeThread.startsWith('dm:')
    ? profilesMap[activeThread.replace('dm:', '')]
    : null;

  const latestGroupMsg = forumMessages[forumMessages.length - 1];
  const jualanList = forumMessages.filter((m) => isJualanCategory(m.category));
  const latestJualanMsg = jualanList[jualanList.length - 1];

  const allMembersList = useMemo(() => {
    const q = sidebarSearch.trim().toLowerCase();
    return Object.values(profilesMap).filter((p) => {
      if (p.id === user.id || p.is_banned) return false;
      if (!q) return true;
      return (
        p.display_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q)
      );
    });
  }, [profilesMap, user.id, sidebarSearch]);

  return (
    <div className="h-[100dvh] w-full max-w-[100vw] overflow-hidden flex bg-[#090D16] text-[#F8FAFC]">
      {/* ============================================================
          PANEL KIRI (DAFTAR RUANG & DM ALA WHATSAPP)
         ============================================================ */}
      <aside
        className={`w-full md:w-[350px] lg:w-[380px] shrink-0 flex flex-col bg-[#0F1623] border-r border-[#1F293B] h-full min-w-0 ${
          mobileShowChat ? 'hidden md:flex' : 'flex'
        }`}
      >
                {/* Header Akun & Brand */}
        <div className="h-16 px-4 border-b border-[#1F293B] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center min-w-0">
            <img
              src="/logo.png"
              alt={SITE_CONFIG.name}
              className="h-8 sm:h-9 w-auto max-w-[155px] sm:max-w-[185px] object-contain shrink-0"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isAdmin && (
              <button
                type="button"
                onClick={onOpenAdminPanel}
                title="Buka Admin Panel"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#2563EB]/15 border border-[#2563EB]/40 text-xs font-medium text-[#60A5FA] hover:bg-[#2563EB] hover:text-white transition-colors"
              >
                <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Admin</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setEditDisplayName(profile?.display_name || '');
                setEditBio(profile?.bio || '');
                setEditingOwnProfile(true);
              }}
              title="Edit profil"
              className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors"
            >
              <Settings className="w-4 h-4" strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={onSignOut}
              title="Keluar akun"
              className="p-2 rounded-lg text-[#94A3B8] hover:text-red-400 hover:bg-[#1E293B] transition-colors"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Bilah Pencarian & Tombol Chat Pribadi Baru */}
        <div className="p-3 border-b border-[#1F293B] flex items-center gap-2 shrink-0">
          <div className="relative flex-1 min-w-0">
            <Search
              className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2"
              strokeWidth={1.5}
            />
            <input
              type="text"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="Cari member atau obrolan..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#161F30] border border-[#1F293B] text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowNewDmPicker((prev) => !prev)}
            title="Mulai chat pribadi baru"
            className={`p-2 rounded-xl border transition-colors shrink-0 ${
              showNewDmPicker
                ? 'bg-[#2563EB] border-[#2563EB] text-white'
                : 'bg-[#161F30] border-[#1F293B] text-[#CBD5E1] hover:border-[#2563EB]'
            }`}
          >
            <MessageSquarePlus className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Strip Member Online Sekarang */}
        <div className="px-4 py-2.5 border-b border-[#1F293B] flex items-center justify-between text-xs shrink-0">
          <div className="inline-flex items-center gap-2 text-[#94A3B8]">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Member online</span>
          </div>
          <span className="font-mono text-[#F8FAFC] tabular-nums">
            {onlineUserIds.size} aktif
          </span>
        </div>

        {/* Daftar Kanal & Percakapan */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#1F293B]/60">
          {/* Pilihan Mulai DM Baru jika diklik */}
          {showNewDmPicker && (
            <div className="p-3 bg-[#161F30]/60 space-y-2">
              <div className="flex items-center justify-between text-xs text-[#94A3B8] px-1">
                <span>Pilih member untuk chat pribadi</span>
                <button
                  type="button"
                  onClick={() => setShowNewDmPicker(false)}
                  className="text-[#60A5FA] hover:underline"
                >
                  Tutup
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {allMembersList.length === 0 ? (
                  <p className="text-xs text-[#64748B] px-1 py-2">
                    Member tidak ditemukan.
                  </p>
                ) : (
                  allMembersList.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setShowNewDmPicker(false);
                        handleStartDirectMessage(m);
                      }}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#1E293B] text-left transition-colors min-w-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#1E3A8A] text-xs font-medium text-white flex items-center justify-center shrink-0">
                        {getInitials(m.display_name, m.email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-[#F8FAFC] truncate">
                          {m.display_name || m.email.split('@')[0]}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 1. Ruang Grup Utama */}
          <button
            type="button"
            onClick={() => handleSelectThread('group')}
            className={`w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors min-w-0 ${
              activeThread === 'group' ? 'bg-[#1E293B]' : 'hover:bg-[#161F30]/70'
            }`}
          >
            <div className="w-11 h-11 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" strokeWidth={1.5} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[#F8FAFC] truncate">
                  Grup Utama NusaForums
                </span>
                {latestGroupMsg && (
                  <span className="text-[11px] font-mono text-[#64748B] shrink-0 tabular-nums">
                    {formatTimeShort(latestGroupMsg.created_at)}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#94A3B8] truncate mt-0.5">
                {latestGroupMsg
                  ? `${
                      profilesMap[latestGroupMsg.user_id]?.display_name || 'Member'
                    }: ${latestGroupMsg.content || 'Lampiran media'}`
                  : 'Diskusi umum dan lapak komunitas'}
              </p>
            </div>
          </button>

          {/* 2. Ruang Bursa Jualan */}
          <button
            type="button"
            onClick={() => handleSelectThread('bursa')}
            className={`w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors min-w-0 ${
              activeThread === 'bursa' ? 'bg-[#1E293B]' : 'hover:bg-[#161F30]/70'
            }`}
          >
            <div className="w-11 h-11 rounded-full bg-[#161F30] border border-[#2563EB]/40 text-[#60A5FA] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[#F8FAFC] truncate">
                  Bursa Jualan
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#2563EB]/15 text-[10px] font-mono text-[#60A5FA] shrink-0 tabular-nums">
                  {jualanList.length} lapak
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] truncate mt-0.5">
                {latestJualanMsg
                  ? `${latestJualanMsg.price_text || 'Lapak'} · ${
                      latestJualanMsg.content || 'Media'
                    }`
                  : 'Katalog script, jasa & produk digital'}
              </p>
            </div>
          </button>

          {/* 3. Daftar Chat Pribadi (DM) */}
          {dmConversations.map(({ partnerId, lastMessage, unreadCount }) => {
            const partner = profilesMap[partnerId];
            const partnerName =
              partner?.display_name || partner?.email?.split('@')[0] || 'Member';
            const isOnline = onlineUserIds.has(partnerId);
            const threadKey = `dm:${partnerId}`;

            if (
              sidebarSearch.trim() &&
              !partnerName.toLowerCase().includes(sidebarSearch.trim().toLowerCase())
            ) {
              return null;
            }

            return (
              <button
                key={partnerId}
                type="button"
                onClick={() => handleSelectThread(threadKey)}
                className={`w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors min-w-0 ${
                  activeThread === threadKey ? 'bg-[#1E293B]' : 'hover:bg-[#161F30]/70'
                }`}
              >
                <div className="relative shrink-0">
                  {partner?.avatar_url ? (
                    <img
                      src={partner.avatar_url}
                      alt={partnerName}
                      className="w-11 h-11 rounded-full object-cover border border-[#1F293B]"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-[#161F30] border border-[#1F293B] text-xs font-semibold text-[#CBD5E1] flex items-center justify-center">
                      {getInitials(partnerName, partner?.email)}
                    </div>
                  )}
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0F1623]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#F8FAFC] truncate">
                      {partnerName}
                    </span>
                    <span className="text-[11px] font-mono text-[#64748B] shrink-0 tabular-nums">
                      {formatTimeShort(lastMessage.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-[#94A3B8] truncate">
                      {lastMessage.sender_id === user.id ? 'Anda: ' : ''}
                      {lastMessage.content || 'Lampiran media'}
                    </p>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#2563EB] text-[10px] font-mono font-semibold text-white shrink-0 tabular-nums">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ============================================================
          PANEL KANAN (RUANG PERCAKAPAN AKTIF ALA WHATSAPP)
         ============================================================ */}
      <section
        className={`flex-1 flex flex-col h-full min-w-0 chat-canvas-pattern ${
          mobileShowChat ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Header Ruang Chat */}
        <header className="h-16 px-4 bg-[#0F1623]/95 backdrop-blur-md border-b border-[#1F293B] flex items-center justify-between gap-2 shrink-0 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileShowChat(false)}
              aria-label="Kembali ke daftar chat"
              className="md:hidden p-2 -ml-1 rounded-lg text-[#CBD5E1] hover:bg-[#1E293B] shrink-0"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>

            {activeThread === 'group' && (
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-semibold text-[#F8FAFC] truncate">
                  Grup Utama NusaForums
                </h1>
                <p className="text-[11px] text-[#94A3B8] truncate tabular-nums">
                  {Object.keys(profilesMap).length} member terdaftar · {onlineUserIds.size}{' '}
                  online
                </p>
              </div>
            )}

            {activeThread === 'bursa' && (
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-semibold text-[#F8FAFC] truncate">
                  Bursa Jualan Komunitas
                </h1>
                <p className="text-[11px] text-[#94A3B8] truncate">
                  Jeda posting jualan 5 menit per kiriman
                </p>
              </div>
            )}

            {activeThread.startsWith('dm:') && (
              <button
                type="button"
                onClick={() => activeDmPartner && setInspectedMember(activeDmPartner)}
                className="flex items-center gap-2.5 text-left min-w-0"
              >
                <div className="w-9 h-9 rounded-full bg-[#1E3A8A] text-xs font-semibold text-white flex items-center justify-center shrink-0">
                  {getInitials(
                    activeDmPartner?.display_name,
                    activeDmPartner?.email
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#F8FAFC] truncate">
                    {activeDmPartner?.display_name ||
                      activeDmPartner?.email?.split('@')[0] ||
                      'Chat Pribadi'}
                  </div>
                  <div className="text-[11px] text-[#94A3B8] truncate">
                    {onlineUserIds.has(activeThread.replace('dm:', ''))
                      ? 'Online sekarang'
                      : 'Ketuk untuk lihat profil'}
                  </div>
                </div>
              </button>
            )}
          </div>

          {/* Filter Cepat di Grup Utama */}
          {activeThread === 'group' && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#161F30] border border-[#1F293B] shrink-0">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'obrolan', label: 'Obrolan' },
                { id: 'jualan', label: 'Jualan' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setGroupFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    groupFilter === tab.id
                      ? 'bg-[#2563EB] text-white'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Papan Pengumuman Disematkan (Pinned Bar dari Admin) */}
        {(activeThread === 'group' || activeThread === 'bursa') &&
          settings?.pinned_content && (
            <div className="px-4 py-2 bg-[#161F30]/95 border-b border-[#1F293B] flex items-center gap-2.5 text-xs shrink-0 min-w-0">
              <Pin className="w-3.5 h-3.5 text-[#60A5FA] shrink-0" strokeWidth={1.5} />
              <div className="min-w-0 flex-1 truncate text-[#CBD5E1]">
                <span className="font-semibold text-[#F8FAFC]">
                  {settings.pinned_title || 'Info'}:{' '}
                </span>
                <span>{settings.pinned_content}</span>
              </div>
            </div>
          )}

        {/* Aliran Pesan (Kanan = Milik Kita, Kiri = User Lain) */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-3 min-w-0">
          {loadingMessages ? (
            <div className="h-full flex items-center justify-center gap-2 text-xs text-[#94A3B8]">
              <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" strokeWidth={1.5} />
              <span>Memuat percakapan...</span>
            </div>
          ) : displayedMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center px-4">
              <div className="max-w-xs space-y-1">
                <p className="text-sm font-medium text-[#F8FAFC]">
                  Belum ada pesan di ruang ini
                </p>
                <p className="text-xs text-[#94A3B8]">
                  Tulis pesan pertama di kolom bawah untuk memulai percakapan.
                </p>
              </div>
            </div>
          ) : (
            displayedMessages.map((msg, idx) => {
              const prevMsg = displayedMessages[idx - 1];
              const showDateBadge =
                !prevMsg ||
                new Date(prevMsg.created_at).toDateString() !==
                  new Date(msg.created_at).toDateString();

              const ownerId =
                msg.user_id !== undefined ? msg.user_id : msg.sender_id;
              const isOwn = ownerId === user.id;
              const senderProf = profilesMap[ownerId];
              const isSenderOwner =
                senderProf?.email &&
                adminEmailsSet.has(senderProf.email.toLowerCase());

              return (
                <React.Fragment key={msg.id}>
                  {showDateBadge && (
                    <div className="flex justify-center my-2">
                      <span className="px-3 py-1 rounded-full bg-[#0F1623] border border-[#1F293B] text-[11px] font-mono text-[#94A3B8]">
                        {formatDateHeader(msg.created_at)}
                      </span>
                    </div>
                  )}

                  <MessageBubble
                    message={msg}
                    senderProfile={senderProf}
                    isOwn={isOwn}
                    isSenderOwner={isSenderOwner}
                    isGroupChat={!activeThread.startsWith('dm:')}
                    isCurrentUserAdmin={isAdmin}
                    onReply={(quoteObj) => setReplyTarget(quoteObj)}
                    onOpenProfile={(prof) => setInspectedMember(prof)}
                    onToggleSold={handleToggleSold}
                    onChatSeller={handleStartDirectMessage}
                    onDeleteMessage={handleDeleteMessage}
                    onPreviewImage={(url) => setPreviewImageUrl(url)}
                  />
                </React.Fragment>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ============================================================
            AREA KETIK & LAMPIRAN BAWAH (RESPONSIF ANTI OVERFLOW)
           ============================================================ */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 bg-[#0F1623] border-t border-[#1F293B] space-y-2.5 shrink-0 min-w-0"
        >
          {composerError && (
            <div className="px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span className="truncate">{composerError}</span>
              </div>
              <button
                type="button"
                onClick={() => setComposerError('')}
                className="shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Pratinjau Balasan (Reply Quote) */}
          {replyTarget && (
            <div className="px-3 py-2 rounded-xl bg-[#161F30] border-l-2 border-[#2563EB] flex items-center justify-between gap-2 min-w-0">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-[#60A5FA] truncate">
                  Membalas {replyTarget.sender_name}
                </div>
                <div className="text-xs text-[#94A3B8] truncate">
                  {replyTarget.content}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplyTarget(null)}
                className="p-1 text-[#94A3B8] hover:text-white shrink-0"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          )}

          {/* Pratinjau Berkas Terpilih */}
          {selectedFile && (
            <div className="px-3 py-2 rounded-xl bg-[#161F30] border border-[#1F293B] flex items-center justify-between gap-2 min-w-0">
              <span className="text-xs font-mono text-[#60A5FA] truncate">
                Lampiran: {selectedFile.name}
              </span>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="p-1 text-[#94A3B8] hover:text-white shrink-0"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          )}

          {/* Mode Obrolan vs Jualan (Khusus Grup Utama) */}
          {activeThread === 'group' && (
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <div className="inline-flex rounded-lg bg-[#161F30] border border-[#1F293B] p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setPostCategory('obrolan')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    postCategory === 'obrolan'
                      ? 'bg-[#2563EB] text-white'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  Mode Obrolan
                </button>
                <button
                  type="button"
                  onClick={() => setPostCategory('jualan')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    postCategory === 'jualan'
                      ? 'bg-[#2563EB] text-white'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  Mode Jualan
                </button>
              </div>

              {postCategory === 'jualan' && (
                <input
                  type="text"
                  value={priceText}
                  onChange={(e) => setPriceText(e.target.value)}
                  placeholder="Harga (mis. Rp 25.000)"
                  className="flex-1 min-w-[130px] px-3 py-1 rounded-lg bg-[#161F30] border border-[#1F293B] text-xs font-mono text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB]"
                />
              )}
            </div>
          )}

          {activeThread === 'bursa' && (
            <input
              type="text"
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
              placeholder="Harga produk / jasa (mis. Rp 30.000)"
              className="w-full px-3 py-1.5 rounded-lg bg-[#161F30] border border-[#1F293B] text-xs font-mono text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB]"
            />
          )}

          {/* Baris Input Utama */}
          <div className="flex items-end gap-2 min-w-0">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setSelectedFile(f);
                e.target.value = '';
              }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Lampirkan file atau media (maks 35 MB)"
              className="p-2.5 rounded-xl bg-[#161F30] border border-[#1F293B] text-[#94A3B8] hover:text-white hover:border-[#2563EB] shrink-0 transition-colors"
            >
              <Paperclip className="w-4 h-4" strokeWidth={1.5} />
            </button>

            {isRecording ? (
              <button
                type="button"
                onClick={handleStopRecording}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-600 text-white text-xs font-mono shrink-0"
              >
                <Square className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>{recordSeconds}d</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartRecording}
                title="Rekam pesan suara"
                className="p-2.5 rounded-xl bg-[#161F30] border border-[#1F293B] text-[#94A3B8] hover:text-white hover:border-[#2563EB] shrink-0 transition-colors"
              >
                <Mic className="w-4 h-4" strokeWidth={1.5} />
              </button>
            )}

            <textarea
              rows={1}
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 768) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                activeThread === 'bursa' || postCategory === 'jualan'
                  ? 'Tulis deskripsi produk atau jasa...'
                  : 'Ketik pesan...'
              }
              className="flex-1 min-w-0 max-h-28 px-3.5 py-2.5 rounded-xl bg-[#161F30] border border-[#1F293B] text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB] resize-none"
            />

            <button
              type="submit"
              disabled={sending || (!composerText.trim() && !selectedFile)}
              aria-label="Kirim pesan"
              className="p-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-45 text-white shrink-0 transition-colors"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
              ) : (
                <Send className="w-4 h-4" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Modal Profil Member lain */}
      <MemberProfileModal
        member={inspectedMember}
        isOwnerAdmin={
          inspectedMember?.email &&
          adminEmailsSet.has(inspectedMember.email.toLowerCase())
        }
        currentUserId={user.id}
        onClose={() => setInspectedMember(null)}
        onStartDirectMessage={handleStartDirectMessage}
      />

      {/* Modal Edit Profil Sendiri */}
      {editingOwnProfile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setEditingOwnProfile(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveOwnProfile}
            className="w-full max-w-sm rounded-2xl bg-[#0F1623] border border-[#1F293B] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#F8FAFC]">Profil saya</h3>
              <button
                type="button"
                onClick={() => setEditingOwnProfile(false)}
                className="p-1 text-[#94A3B8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-[#94A3B8]">Nama tampilan</label>
              <input
                type="text"
                required
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#161F30] border border-[#1F293B] text-sm text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-[#94A3B8]">Bio singkat</label>
              <textarea
                rows={3}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Tulis keahlian atau informasi lapakmu..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#161F30] border border-[#1F293B] text-sm text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium"
            >
              <Check className="w-4 h-4" strokeWidth={1.5} />
              <span>{savingProfile ? 'Menyimpan...' : 'Simpan profil'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Lightbox Pratinjau Gambar Penuh */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85"
          onClick={() => setPreviewImageUrl('')}
        >
          <button
            type="button"
            onClick={() => setPreviewImageUrl('')}
            className="absolute top-4 right-4 p-2 rounded-full bg-[#0F1623] border border-[#1F293B] text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={previewImageUrl}
            alt="Pratinjau"
            className="max-h-[85dvh] max-w-full rounded-xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
