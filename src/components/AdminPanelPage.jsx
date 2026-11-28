import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Megaphone,
  Pin,
  Users,
  MessageSquare,
  Upload,
  BadgeCheck,
  Ban,
  CheckCircle2,
  Trash2,
  Loader2,
  ShieldAlert,
  Eye
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { SITE_CONFIG } from '../config/siteConfig';

export default function AdminPanelPage({
  user,
  isAdmin,
  settings,
  onSettingsSaved,
  onBackToForum
}) {
  const [activeTab, setActiveTab] = useState('popup');
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  // State Popup Update Terbaru
  const [popupEnabled, setPopupEnabled] = useState(Boolean(settings?.popup_enabled));
  const [popupBannerUrl, setPopupBannerUrl] = useState(settings?.popup_banner_url || '');
  const [popupTitle, setPopupTitle] = useState(
    settings?.popup_title || 'Pembaruan NusaForums 2.0'
  );
  const [popupContent, setPopupContent] = useState(settings?.popup_content || '');
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [savingPopup, setSavingPopup] = useState(false);

  // State Pinned Announcement
  const [pinnedTitle, setPinnedTitle] = useState(settings?.pinned_title || '');
  const [pinnedContent, setPinnedContent] = useState(settings?.pinned_content || '');
  const [savingPinned, setSavingPinned] = useState(false);

  // State Kelola Member & Moderasi Pesan
  const [members, setMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [recentMessages, setRecentMessages] = useState([]);

  useEffect(() => {
    if (settings) {
      setPopupEnabled(Boolean(settings.popup_enabled));
      setPopupBannerUrl(settings.popup_banner_url || '');
      setPopupTitle(settings.popup_title || 'Pembaruan NusaForums 2.0');
      setPopupContent(settings.popup_content || '');
      setPinnedTitle(settings.pinned_title || '');
      setPinnedContent(settings.pinned_content || '');
    }
  }, [settings]);

  const loadAdminData = useCallback(async () => {
    if (!supabase || !isAdmin) return;
    setLoadingMembers(true);
    try {
      const [memRes, msgRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('forum_messages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(40)
      ]);
      if (Array.isArray(memRes.data)) setMembers(memRes.data);
      if (Array.isArray(msgRes.data)) setRecentMessages(msgRes.data);
    } finally {
      setLoadingMembers(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleUploadBannerFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;
    setUploadingBanner(true);
    setFeedback({ type: '', text: '' });
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `admin-banners/popup-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from(SITE_CONFIG.storageBucket)
        .upload(path, file, { upsert: true });

      if (error) throw error;
      const { data } = supabase.storage
        .from(SITE_CONFIG.storageBucket)
        .getPublicUrl(path);

      setPopupBannerUrl(data.publicUrl);
      setFeedback({ type: 'ok', text: 'Gambar banner berhasil diunggah.' });
    } catch (err) {
      setFeedback({ type: 'err', text: err.message || 'Gagal mengunggah banner.' });
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSavePopupSettings = async (e) => {
    e.preventDefault();
    setSavingPopup(true);
    setFeedback({ type: '', text: '' });
    try {
      const payload = {
        popup_enabled: popupEnabled,
        popup_banner_url: popupBannerUrl.trim(),
        popup_title: popupTitle.trim(),
        popup_content: popupContent.trim(),
        popup_updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('forum_settings')
        .update(payload)
        .eq('id', 1);

      if (error) throw error;
      if (onSettingsSaved) onSettingsSaved();
      setFeedback({
        type: 'ok',
        text: 'Pengaturan Popup Update tersimpan. Member akan melihat pembaruan ini saat login.'
      });
    } catch (err) {
      setFeedback({ type: 'err', text: err.message || 'Gagal menyimpan popup.' });
    } finally {
      setSavingPopup(false);
    }
  };

  const handleSavePinned = async (e) => {
    e.preventDefault();
    setSavingPinned(true);
    setFeedback({ type: '', text: '' });
    try {
      const { error } = await supabase
        .from('forum_settings')
        .update({
          pinned_title: pinnedTitle.trim(),
          pinned_content: pinnedContent.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);

      if (error) throw error;
      if (onSettingsSaved) onSettingsSaved();
      setFeedback({ type: 'ok', text: 'Pengumuman disematkan berhasil diperbarui.' });
    } catch (err) {
      setFeedback({ type: 'err', text: err.message || 'Gagal menyimpan pengumuman.' });
    } finally {
      setSavingPinned(false);
    }
  };

  const handleToggleVerified = async (member) => {
    const nextVal = !member.is_verified;
    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: nextVal })
      .eq('id', member.id);

    if (!error) {
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, is_verified: nextVal } : m))
      );
    }
  };

  const handleToggleBanned = async (member) => {
    if (member.id === user?.id) return;
    const nextVal = !member.is_banned;
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: nextVal })
      .eq('id', member.id);

    if (!error) {
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, is_banned: nextVal } : m))
      );
    }
  };

  const handleDeleteForumPost = async (msgId) => {
    const { error } = await supabase.from('forum_messages').delete().eq('id', msgId);
    if (!error) {
      setRecentMessages((prev) => prev.filter((m) => m.id !== msgId));
    }
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#090D16] text-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl bg-[#0F1623] border border-[#1F293B] p-8 space-y-5">
          <div className="w-11 h-11 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold">Akses Admin Panel Ditolak</h1>
            <p className="text-xs sm:text-sm text-[#94A3B8]">
              Halaman ini hanya dapat dibuka oleh akun Owner yang terdaftar di tabel
              app_admins.
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToForum}
            className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-medium"
          >
            Kembali ke beranda
          </button>
        </div>
      </div>
    );
  }

  const filteredMembers = members.filter((m) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      m.display_name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#090D16] text-[#F8FAFC] pb-16">
      <header className="sticky top-0 z-30 bg-[#0F1623]/95 backdrop-blur-md border-b border-[#1F293B]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBackToForum}
              className="p-2 rounded-xl bg-[#161F30] border border-[#1F293B] text-[#CBD5E1] hover:text-white shrink-0"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-semibold truncate">
                Admin Panel · {SITE_CONFIG.name}
              </h1>
              <p className="text-[11px] font-mono text-[#64748B] truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Navigasi Tab Admin */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'popup', label: 'Popup Update', icon: Megaphone },
            { id: 'pinned', label: 'Pengumuman Pinned', icon: Pin },
            { id: 'members', label: 'Member & Verified', icon: Users },
            { id: 'moderation', label: 'Moderasi Pesan', icon: MessageSquare }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setFeedback({ type: '', text: '' });
                }}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#2563EB] border-[#2563EB] text-white'
                    : 'bg-[#0F1623] border-[#1F293B] text-[#94A3B8] hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {feedback.text && (
          <div
            className={`p-3.5 rounded-xl border text-xs ${
              feedback.type === 'ok'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/15 border-red-500/30 text-red-300'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* TAB 1: PENGATURAN POPUP INFORMASI UPDATE */}
        {activeTab === 'popup' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleSavePopupSettings}
              className="lg:col-span-7 rounded-2xl bg-[#0F1623] border border-[#1F293B] p-6 space-y-5"
            >
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#1F293B]">
                <div>
                  <h2 className="text-base font-semibold">Popup Informasi Update</h2>
                  <p className="text-xs text-[#94A3B8]">
                    Muncul otomatis setelah member login atau daftar akun baru
                  </p>
                </div>

                <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={popupEnabled}
                    onChange={(e) => setPopupEnabled(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#2563EB]"
                  />
                  <span className="text-xs font-medium">
                    {popupEnabled ? 'Aktif' : 'Nonaktif'}
                  </span>
                </label>
              </div>

              {/* Unggah / URL Banner Balok */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#CBD5E1]">
                  Banner persegi panjang (unggah gambar atau tempel URL)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={popupBannerUrl}
                    onChange={(e) => setPopupBannerUrl(e.target.value)}
                    placeholder="https://... atau unggah gambar di sebelah"
                    className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-[#161F30] border border-[#1F293B] text-xs font-mono text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                  />
                  <label className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#161F30] border border-[#1F293B] hover:border-[#2563EB] text-xs font-medium cursor-pointer shrink-0">
                    {uploadingBanner ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" strokeWidth={1.5} />
                    )}
                    <span>Unggah Banner</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadBannerFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#CBD5E1]">
                  Judul informasi update
                </label>
                <input
                  type="text"
                  required
                  value={popupTitle}
                  onChange={(e) => setPopupTitle(e.target.value)}
                  placeholder="Pembaruan Tampilan & Fitur Baru NusaForums"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#161F30] border border-[#1F293B] text-sm text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#CBD5E1]">
                  Isi informasi update (tampil di bawah banner)
                </label>
                <textarea
                  rows={5}
                  required
                  value={popupContent}
                  onChange={(e) => setPopupContent(e.target.value)}
                  placeholder="Tuliskan poin pembaruan, promo, atau pengumuman untuk seluruh member..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#161F30] border border-[#1F293B] text-sm text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <button
                type="submit"
                disabled={savingPopup}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium transition-colors"
              >
                {savingPopup ? 'Menyimpan...' : 'Simpan & publikasikan popup'}
              </button>
            </form>

            {/* Pratinjau Langsung Bentuk Popup */}
            <div className="lg:col-span-5 space-y-2.5">
              <div className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8]">
                <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Pratinjau tampilan popup di layar member</span>
              </div>

              <div className="rounded-2xl bg-[#0F1623] border border-[#1F293B] overflow-hidden">
                {popupBannerUrl.trim() ? (
                  <div className="w-full aspect-[16/9] bg-[#161F30] border-b border-[#1F293B]">
                    <img
                      src={popupBannerUrl}
                      alt="Pratinjau banner"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-[16/9] bg-[#161F30] border-b border-[#1F293B] flex items-center justify-center text-xs font-mono text-[#64748B]">
                    Area Banner Balok (16:9)
                  </div>
                )}

                <div className="p-5 space-y-2">
                  <h3 className="text-base font-semibold text-[#F8FAFC] break-words">
                    {popupTitle || 'Judul Update'}
                  </h3>
                  <p className="text-xs text-[#CBD5E1] whitespace-pre-line break-words leading-relaxed">
                    {popupContent || 'Deskripsi pembaruan akan tampil di bawah banner.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PENGUMUMAN DISMATKAN (PINNED BAR) */}
        {activeTab === 'pinned' && (
          <form
            onSubmit={handleSavePinned}
            className="max-w-2xl rounded-2xl bg-[#0F1623] border border-[#1F293B] p-6 space-y-4"
          >
            <h2 className="text-base font-semibold">Papan Pengumuman di Atas Chat</h2>
            <div className="space-y-1.5">
              <label className="block text-xs text-[#94A3B8]">Judul singkat</label>
              <input
                type="text"
                value={pinnedTitle}
                onChange={(e) => setPinnedTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#161F30] border border-[#1F293B] text-sm text-[#F8FAFC]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs text-[#94A3B8]">Isi baris pengumuman</label>
              <textarea
                rows={3}
                value={pinnedContent}
                onChange={(e) => setPinnedContent(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#161F30] border border-[#1F293B] text-sm text-[#F8FAFC]"
              />
            </div>
            <button
              type="submit"
              disabled={savingPinned}
              className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium"
            >
              {savingPinned ? 'Menyimpan...' : 'Perbarui pengumuman'}
            </button>
          </form>
        )}

        {/* TAB 3: KELOLA MEMBER & LENCANA VERIFIED SELLER */}
        {activeTab === 'members' && (
          <div className="rounded-2xl bg-[#0F1623] border border-[#1F293B] overflow-hidden">
            <div className="p-4 border-b border-[#1F293B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-sm font-semibold tabular-nums">
                Total Member ({members.length})
              </span>
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Cari nama atau Gmail member..."
                className="px-3.5 py-2 rounded-xl bg-[#161F30] border border-[#1F293B] text-xs text-[#F8FAFC] w-full sm:w-64"
              />
            </div>

            {loadingMembers ? (
              <div className="p-10 text-center text-xs text-[#94A3B8]">
                Memuat daftar member...
              </div>
            ) : (
              <div className="divide-y divide-[#1F293B]">
                {filteredMembers.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold truncate">
                          {m.display_name || 'Member'}
                        </span>
                        {m.is_verified && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-[10px] font-mono text-emerald-400">
                            Verified
                          </span>
                        )}
                        {m.is_banned && (
                          <span className="px-2 py-0.5 rounded bg-red-500/15 text-[10px] font-mono text-red-400">
                            Diblokir
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-[#64748B] truncate">
                        {m.email}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleVerified(m)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          m.is_verified
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : 'bg-[#161F30] border-[#1F293B] text-[#CBD5E1] hover:border-[#2563EB]'
                        }`}
                      >
                        <BadgeCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>{m.is_verified ? 'Cabut Verified' : 'Beri Verified'}</span>
                      </button>

                      {m.id !== user.id && (
                        <button
                          type="button"
                          onClick={() => handleToggleBanned(m)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                            m.is_banned
                              ? 'bg-[#161F30] border-[#1F293B] text-emerald-400'
                              : 'bg-red-500/10 border-red-500/30 text-red-400'
                          }`}
                        >
                          {m.is_banned ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                              <span>Buka blokir</span>
                            </>
                          ) : (
                            <>
                              <Ban className="w-3.5 h-3.5" strokeWidth={1.5} />
                              <span>Blokir</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MODERASI PESAN */}
        {activeTab === 'moderation' && (
          <div className="rounded-2xl bg-[#0F1623] border border-[#1F293B] divide-y divide-[#1F293B]">
            {recentMessages.map((msg) => (
              <div
                key={msg.id}
                className="p-4 flex items-start justify-between gap-4 min-w-0"
              >
                <div className="min-w-0 space-y-1">
                  <span className="px-2 py-0.5 rounded bg-[#161F30] text-[10px] font-mono text-[#60A5FA]">
                    {msg.category || 'obrolan'}
                  </span>
                  <p className="text-xs sm:text-sm text-[#E2E8F0] break-words">
                    {msg.content || msg.media_name || 'Lampiran media'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteForumPost(msg.id)}
                  className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 shrink-0"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
