import React, { useState, useEffect, useCallback } from 'react';
import {
  Pin,
  Trash2,
  Ban,
  UserCheck,
  ShieldAlert,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Save
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { formatRelativeTime } from '../utils/mediaHelpers';

export default function AdminPanelPage({ user, onBackHome, onSignOut }) {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // State Pengumuman Tersemat
  const [pinnedTitle, setPinnedTitle] = useState('');
  const [pinnedContent, setPinnedContent] = useState('');
  const [savingPin, setSavingPin] = useState(false);

  // State Daftar Member & Kiriman Grup
  const [membersList, setMembersList] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const loadAdminData = useCallback(async () => {
    if (!supabase) return;
    setLoadingData(true);
    try {
      const [{ data: pinRow }, { data: usersData }, { data: msgsData }] = await Promise.all([
        supabase.from('forum_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase
          .from('forum_messages')
          .select('*, author:profiles!forum_messages_user_id_fkey(display_name, email)')
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      if (pinRow) {
        setPinnedTitle(pinRow.pinned_title || '');
        setPinnedContent(pinRow.pinned_content || '');
      }
      if (Array.isArray(usersData)) setMembersList(usersData);
      if (Array.isArray(msgsData)) setRecentMessages(msgsData);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function checkAdmin() {
      if (!user || !supabase || !isSupabaseConfigured) {
        if (active) {
          setIsAdmin(false);
          setCheckingAdmin(false);
        }
        return;
      }

      setCheckingAdmin(true);
      try {
        const { data, error } = await supabase
          .from('app_admins')
          .select('email')
          .ilike('email', user.email)
          .maybeSingle();

        if (!active) return;

        if (!error && data) {
          setIsAdmin(true);
          loadAdminData();
        } else {
          setIsAdmin(false);
        }
      } finally {
        if (active) setCheckingAdmin(false);
      }
    }

    checkAdmin();
    return () => {
      active = false;
    };
  }, [user, loadAdminData]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword
      });
      if (error) throw error;
    } catch (err) {
      setLoginError(err.message || 'Gagal masuk ke admin panel.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSavePinned = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionMessage('');
    setSavingPin(true);

    try {
      const { error } = await supabase
        .from('forum_settings')
        .upsert({
          id: 1,
          pinned_title: pinnedTitle.trim(),
          pinned_content: pinnedContent.trim(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setActionMessage('Pengumuman tersemat berhasil diperbarui.');
    } catch (err) {
      setActionError(err.message || 'Gagal menyimpan pengumuman.');
    } finally {
      setSavingPin(false);
    }
  };

  const handleToggleBan = async (targetUser) => {
    setActionError('');
    setActionMessage('');
    if (targetUser.id === user.id) {
      setActionError('Tidak dapat memblokir akun admin milik sendiri.');
      return;
    }

    try {
      const nextBanState = !targetUser.is_banned;
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: nextBanState })
        .eq('id', targetUser.id);

      if (error) throw error;

      setMembersList((prev) =>
        prev.map((m) => (m.id === targetUser.id ? { ...m, is_banned: nextBanState } : m))
      );
      setActionMessage(
        nextBanState
          ? `Akun ${targetUser.display_name} berhasil diblokir.`
          : `Akses akun ${targetUser.display_name} telah dipulihkan.`
      );
    } catch (err) {
      setActionError(err.message || 'Gagal mengubah status blokir member.');
    }
  };

  const handleDeleteForumPost = async (msg) => {
    setActionError('');
    setActionMessage('');
    try {
      if (msg.media_path) {
        await supabase.storage.from('forum-media').remove([msg.media_path]);
      }
      const { error } = await supabase.from('forum_messages').delete().eq('id', msg.id);
      if (error) throw error;

      setRecentMessages((prev) => prev.filter((item) => item.id !== msg.id));
      setActionMessage('Kiriman dan file lampiran berhasil dihapus.');
    } catch (err) {
      setActionError(err.message || 'Gagal menghapus kiriman.');
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-6 py-16">
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-2 text-sm text-[#9BA1AE] hover:text-[#F4F5F7] mb-6"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          <span>Kembali ke beranda</span>
        </button>

        <div className="rounded-2xl bg-[#15181E] border border-white/[0.08] p-8 space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-mono text-[#3B82F6]">Akses terbatas</span>
            <h1 className="text-xl font-semibold text-[#F4F5F7]">Admin panel NusaForums</h1>
            <p className="text-sm text-[#9BA1AE]">
              Masuk menggunakan Gmail owner yang terdaftar di database.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/25 text-xs text-red-400">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <input
              type="email"
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="Email owner (@gmail.com)"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0E1013] border border-white/[0.08] text-sm font-mono text-[#F4F5F7] focus:outline-none focus:border-[#3B82F6]"
            />
            <input
              type="password"
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Kata sandi"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0E1013] border border-white/[0.08] text-sm text-[#F4F5F7] focus:outline-none focus:border-[#3B82F6]"
            />
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#3B82F6] text-white text-sm font-medium hover:bg-[#2563EB] disabled:opacity-60"
            >
              {loginLoading ? 'Memproses...' : 'Masuk ke admin panel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (checkingAdmin) {
    return (
      <div className="py-24 flex items-center justify-center gap-2 text-sm text-[#68707E]">
        <Loader2 className="w-4 h-4 animate-spin text-[#3B82F6]" strokeWidth={1.5} />
        <span>Memverifikasi hak akses pengelola...</span>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="rounded-2xl bg-[#15181E] border border-white/[0.08] p-8 space-y-5">
          <div className="w-11 h-11 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold text-[#F4F5F7]">Akses ditolak</h1>
            <p className="text-sm text-[#9BA1AE]">
              Akun <span className="font-mono text-[#F4F5F7]">{user.email}</span> tidak
              memiliki izin pengelola.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onBackHome}
              className="flex-1 py-2.5 rounded-lg bg-[#3B82F6] text-white text-sm font-medium"
            >
              Ke forum
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="px-4 py-2.5 rounded-lg border border-white/[0.08] text-sm text-[#9BA1AE]"
            >
              Keluar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[#F4F5F7]">
            Admin panel · Moderasi NusaForums
          </h1>
          <p className="text-sm text-[#9BA1AE]">
            Atur pengumuman tersemat, hapus kiriman grup utama, dan kelola status blokir member
          </p>
        </div>

        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#15181E] border border-white/[0.08] text-sm font-medium text-[#F4F5F7] hover:bg-[#1C2028] self-start"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          <span>Kembali ke forum</span>
        </button>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          <span>{actionError}</span>
        </div>
      )}

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-xs text-[#3B82F6]">
          {actionMessage}
        </div>
      )}

      {/* Pengaturan Pengumuman Tersemat */}
      <form
        onSubmit={handleSavePinned}
        className="rounded-2xl bg-[#15181E] border border-white/[0.08] p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Pin className="w-4 h-4 text-[#3B82F6]" strokeWidth={1.5} />
          <h2 className="text-base font-semibold text-[#F4F5F7]">
            Pengumuman tersemat di grup utama
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4 space-y-1.5">
            <label className="block text-xs font-medium text-[#9BA1AE]">Judul pengumuman</label>
            <input
              type="text"
              value={pinnedTitle}
              onChange={(e) => setPinnedTitle(e.target.value)}
              placeholder="Contoh: Informasi penting member"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0E1013] border border-white/[0.08] text-sm text-[#F4F5F7] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div className="md:col-span-8 space-y-1.5">
            <label className="block text-xs font-medium text-[#9BA1AE]">
              Isi pengumuman (kosongkan keduanya untuk menyembunyikan)
            </label>
            <input
              type="text"
              value={pinnedContent}
              onChange={(e) => setPinnedContent(e.target.value)}
              placeholder="Tulis aturan atau info terbaru untuk seluruh member..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0E1013] border border-white/[0.08] text-sm text-[#F4F5F7] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={savingPin}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3B82F6] text-white text-xs font-medium hover:bg-[#2563EB] disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>{savingPin ? 'Menyimpan...' : 'Simpan pengumuman'}</span>
        </button>
      </form>

      {/* Grid Moderasi Member & Kiriman */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kelola Member */}
        <div className="lg:col-span-5 rounded-2xl bg-[#15181E] border border-white/[0.08] overflow-hidden">
          <div className="px-5 py-4 bg-[#1C2028] border-b border-white/[0.08] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#F4F5F7]">Daftar akun member</h2>
            <span className="text-xs font-mono text-[#68707E] tabular-nums">
              {membersList.length}
            </span>
          </div>

          <div
            data-lenis-prevent
            className="divide-y divide-white/[0.06] max-h-[460px] overflow-y-auto"
          >
            {loadingData ? (
              <div className="p-8 text-center text-xs text-[#68707E]">Memuat data...</div>
            ) : (
              membersList.map((member) => (
                <div
                  key={member.id}
                  className="p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#F4F5F7] truncate">
                        {member.display_name}
                      </p>
                      {member.is_banned && (
                        <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-[10px] font-mono text-red-400">
                          Diblokir
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-[#68707E] truncate">{member.email}</p>
                  </div>

                  {member.id !== user.id && (
                    <button
                      type="button"
                      onClick={() => handleToggleBan(member)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium shrink-0 transition-colors duration-150 ${
                        member.is_banned
                          ? 'bg-[#0E1013] border-white/[0.08] text-[#3B82F6] hover:bg-[#1C2028]'
                          : 'bg-[#0E1013] border-white/[0.08] text-red-400 hover:border-red-500/40'
                      }`}
                    >
                      {member.is_banned ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
                          <span>Pulihkan</span>
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
              ))
            )}
          </div>
        </div>

        {/* Moderasi Kiriman Grup Utama */}
        <div className="lg:col-span-7 rounded-2xl bg-[#15181E] border border-white/[0.08] overflow-hidden">
          <div className="px-5 py-4 bg-[#1C2028] border-b border-white/[0.08] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#F4F5F7]">Kiriman terbaru grup utama</h2>
            <span className="text-xs font-mono text-[#68707E] tabular-nums">
              {recentMessages.length}
            </span>
          </div>

          <div
            data-lenis-prevent
            className="divide-y divide-white/[0.06] max-h-[460px] overflow-y-auto"
          >
            {recentMessages.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#68707E]">Belum ada kiriman.</div>
            ) : (
              recentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-4 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#F4F5F7]">
                        {msg.author?.display_name || 'Member'}
                      </span>
                      <span className="text-[11px] font-mono text-[#3B82F6]">
                        {msg.category}
                      </span>
                      <span className="text-[11px] font-mono text-[#68707E] tabular-nums">
                        {formatRelativeTime(msg.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-[#9BA1AE] line-clamp-2">
                      {msg.content || `[Lampiran ${msg.media_type}: ${msg.media_name || 'file'}]`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteForumPost(msg)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0E1013] border border-white/[0.08] text-xs font-medium text-red-400 hover:border-red-500/40 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Hapus</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
