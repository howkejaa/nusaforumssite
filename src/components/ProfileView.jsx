import React, { useState, useRef } from 'react';
import { Camera, Save, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { compressImageFile, getInitials } from '../utils/mediaHelpers';

export default function ProfileView({ user, profile, onProfileUpdated }) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fileInputRef = useRef(null);

  const handleAvatarUpload = async (e) => {
    setErrorMsg('');
    setSuccessMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Pilih file gambar (.jpg, .png, atau .webp) untuk foto profil.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const compressed = await compressImageFile(file, 512, 0.85);
      const path = `${user.id}/avatar-${Date.now()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, compressed, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(path);
      const newUrl = pubData?.publicUrl || '';

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(newUrl);
      setSuccessMsg('Foto profil berhasil diperbarui.');
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mengunggah foto profil.');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanName = displayName.trim();
    if (!cleanName) {
      setErrorMsg('Nama tampilan tidak boleh kosong.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: cleanName,
          bio: bio.trim()
        })
        .eq('id', user.id);

      if (error) throw error;

      setSuccessMsg('Perubahan profil berhasil disimpan.');
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menyimpan perubahan profil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[#F4F5F7]">Profil akun</h1>
        <p className="text-sm text-[#9BA1AE]">
          Atur nama tampilan, deskripsi singkat, dan foto profil yang dilihat member lain
        </p>
      </div>

      <div className="rounded-2xl bg-[#15181E] border border-white/[0.08] p-6 sm:p-8 space-y-6">
        {/* Bagian Foto Profil */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-white/[0.08]">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-20 h-20 rounded-full object-cover border border-white/[0.08]"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[#1C2028] border border-white/[0.08] flex items-center justify-center text-xl font-mono text-[#F4F5F7]">
              {getInitials(displayName || user.email)}
            </div>
          )}

          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1C2028] border border-white/[0.08] text-xs font-medium text-[#F4F5F7] hover:border-[#3B82F6]/50 disabled:opacity-50 transition-colors duration-150"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#3B82F6]" strokeWidth={1.5} />
              ) : (
                <Camera className="w-4 h-4 text-[#3B82F6]" strokeWidth={1.5} />
              )}
              <span>{uploadingAvatar ? 'Mengunggah foto...' : 'Ganti foto profil'}</span>
            </button>
            <p className="text-xs font-mono text-[#68707E]">{user.email}</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/25 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-lg bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-xs text-[#3B82F6]">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="prof-name" className="block text-sm font-medium text-[#F4F5F7]">
              Nama tampilan
            </label>
            <input
              id="prof-name"
              type="text"
              required
              maxLength={32}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0E1013] border border-white/[0.08] text-sm text-[#F4F5F7] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="prof-bio" className="block text-sm font-medium text-[#F4F5F7]">
              Bio / keterangan singkat
            </label>
            <input
              id="prof-bio"
              type="text"
              maxLength={100}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Contoh: Penyedia jasa desain & produk digital"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0E1013] border border-white/[0.08] text-sm text-[#F4F5F7] placeholder:text-[#68707E] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#3B82F6] text-white text-sm font-medium hover:bg-[#2563EB] disabled:opacity-50 transition-colors duration-150"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <Save className="w-4 h-4" strokeWidth={1.5} />
            )}
            <span>Simpan perubahan</span>
          </button>
        </form>
      </div>
    </div>
  );
}
