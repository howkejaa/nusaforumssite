import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { SITE_CONFIG } from '../config/siteConfig';

export default function AuthModal({ initialMode = 'login', onClose }) {
  const [mode, setMode] = useState(initialMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!isSupabaseConfigured || !supabase) {
      setErrorMsg('Konfigurasi database belum terhubung.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@gmail.com')) {
      setErrorMsg('Pendaftaran dan akses hanya menggunakan alamat @gmail.com.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });
        if (error) throw error;
        onClose();
      } else {
        if (displayName.trim().length < 2) {
          throw new Error('Nama tampilan minimal 2 karakter.');
        }

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: displayName.trim()
            }
          }
        });

        if (error) throw error;

        if (data?.session) {
          onClose();
        } else {
          setInfoMsg(
            `Tautan konfirmasi telah dikirim ke ${cleanEmail}. Buka Gmail kamu untuk mengaktifkan akun.`
          );
        }
      }
    } catch (err) {
      setErrorMsg(
        err.message === 'Invalid login credentials'
          ? 'Email Gmail atau kata sandi salah.'
          : err.message || 'Terjadi kesalahan autentikasi.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-[#0F1623] border border-[#1F293B] p-6 sm:p-8 space-y-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-[#F8FAFC]">
              {mode === 'login'
                ? `Masuk ke ${SITE_CONFIG.name}`
                : `Buat akun ${SITE_CONFIG.name}`}
            </h2>
            <p className="text-xs text-[#94A3B8]">
              Wajib menggunakan alamat @gmail.com aktif
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela"
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B]"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Switcher Tab Masuk / Daftar */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-[#161F30] border border-[#1F293B]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
              setInfoMsg('');
            }}
            className={`py-2 rounded-lg text-xs font-medium transition-colors ${
              mode === 'login'
                ? 'bg-[#2563EB] text-white'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Masuk akun
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
              setInfoMsg('');
            }}
            className={`py-2 rounded-lg text-xs font-medium transition-colors ${
              mode === 'register'
                ? 'bg-[#2563EB] text-white'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Daftar baru
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.5} />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.5} />
            <span>{infoMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#CBD5E1]">
                Nama tampilan
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nama panggilan atau toko"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#161F30] border border-[#1F293B] text-sm text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#CBD5E1]">
              Alamat Gmail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="namaanda@gmail.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#161F30] border border-[#1F293B] text-sm font-mono text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#CBD5E1]">
              Kata sandi (minimal 6 karakter)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata sandi"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#161F30] border border-[#1F293B] text-sm text-[#F8FAFC] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-sm font-medium transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />}
            <span>{mode === 'login' ? 'Masuk ke ruang diskusi' : 'Daftar sekarang'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
