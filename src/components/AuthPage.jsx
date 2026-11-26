import React, { useState } from 'react';
import { MailCheck, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export default function AuthPage({ mode, onSwitchMode, onBackHome }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [awaitingVerification, setAwaitingVerification] = useState(false);

  const isRegister = mode === 'register';

  const isValidGmail = (addr) => {
    const clean = addr.trim().toLowerCase();
    return /^[a-z0-9._%+-]+@gmail\.com$/.test(clean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!isSupabaseConfigured || !supabase) {
      setErrorMsg('Konfigurasi database Supabase belum dipasang pada Vercel.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!isValidGmail(cleanEmail)) {
      setErrorMsg('Hanya alamat email berakhiran @gmail.com yang diperbolehkan.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal terdiri dari 6 karakter.');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const cleanName = displayName.trim() || cleanEmail.split('@')[0];
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: cleanName
            }
          }
        });

        if (error) throw error;

        if (data?.user && !data?.session) {
          setAwaitingVerification(true);
        } else {
          setInfoMsg('Pendaftaran berhasil.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            setAwaitingVerification(true);
            throw new Error(
              'Akun Gmail kamu belum diverifikasi. Periksa kotak masuk atau folder spam.'
            );
          }
          throw error;
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memproses permintaan akun.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!supabase || !email) return;
    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;
      setInfoMsg('Tautan verifikasi baru telah dikirim ke Gmail kamu.');
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mengirim ulang tautan verifikasi.');
    } finally {
      setLoading(false);
    }
  };

  if (awaitingVerification) {
    return (
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="rounded-2xl bg-[#15181E] border border-white/[0.08] p-8 space-y-6">
          <div className="w-11 h-11 rounded-xl bg-[#3B82F6]/15 text-[#3B82F6] flex items-center justify-center">
            <MailCheck className="w-5 h-5" strokeWidth={1.5} />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-[#F4F5F7]">Verifikasi Gmail kamu</h1>
            <p className="text-sm text-[#9BA1AE] leading-relaxed">
              Tautan aktivasi telah dikirim ke{' '}
              <span className="font-mono text-[#F4F5F7]">{email}</span>. Klik tautan di dalam
              pesan tersebut untuk masuk ke grup utama NusaForums.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/25 text-xs text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.5} />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="p-3.5 rounded-lg bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-xs text-[#3B82F6]">
              {infoMsg}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#3B82F6] text-white text-sm font-medium hover:bg-[#2563EB] disabled:opacity-60 transition-colors duration-150"
            >
              {loading ? 'Mengirim ulang...' : 'Kirim ulang tautan ke Gmail'}
            </button>

            <button
              type="button"
              onClick={() => {
                setAwaitingVerification(false);
                onSwitchMode('login');
              }}
              className="w-full py-2.5 px-4 rounded-lg border border-white/[0.08] text-sm font-medium text-[#F4F5F7] hover:bg-[#1C2028] transition-colors duration-150"
            >
              Kembali ke halaman masuk
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <button
        type="button"
        onClick={onBackHome}
        className="inline-flex items-center gap-2 text-sm text-[#9BA1AE] hover:text-[#F4F5F7] mb-6 transition-colors duration-150"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        <span>Kembali ke beranda</span>
      </button>

      <div className="rounded-2xl bg-[#15181E] border border-white/[0.08] p-8 space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold text-[#F4F5F7]">
            {isRegister ? 'Buat akun NusaForums' : 'Masuk ke NusaForums'}
          </h1>
          <p className="text-sm text-[#9BA1AE]">
            {isRegister
              ? 'Gunakan alamat @gmail.com aktif untuk menerima tautan verifikasi.'
              : 'Masuk dengan akun Gmail terverifikasi untuk bergabung di grup utama.'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/25 text-xs text-red-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.5} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="space-y-1.5">
              <label htmlFor="reg-name" className="block text-sm font-medium text-[#F4F5F7]">
                Nama tampilan
              </label>
              <input
                id="reg-name"
                type="text"
                required
                maxLength={32}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nama yang tampil di forum"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0E1013] border border-white/[0.08] text-sm text-[#F4F5F7] placeholder:text-[#68707E] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="auth-gmail" className="block text-sm font-medium text-[#F4F5F7]">
              Alamat Gmail
            </label>
            <input
              id="auth-gmail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="namaakun@gmail.com"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0E1013] border border-white/[0.08] text-sm font-mono text-[#F4F5F7] placeholder:text-[#68707E] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="auth-pass" className="block text-sm font-medium text-[#F4F5F7]">
              Kata sandi
            </label>
            <input
              id="auth-pass"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0E1013] border border-white/[0.08] text-sm text-[#F4F5F7] placeholder:text-[#68707E] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#3B82F6] text-white text-sm font-medium hover:bg-[#2563EB] disabled:opacity-60 transition-colors duration-150"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />}
            <span>{isRegister ? 'Daftar & kirim verifikasi' : 'Masuk sekarang'}</span>
          </button>
        </form>

        <div className="pt-4 border-t border-white/[0.08] text-center text-sm text-[#9BA1AE]">
          {isRegister ? (
            <>
              Sudah memiliki akun?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  onSwitchMode('login');
                }}
                className="font-medium text-[#3B82F6] hover:underline"
              >
                Masuk di sini
              </button>
            </>
          ) : (
            <>
              Belum punya akun?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  onSwitchMode('register');
                }}
                className="font-medium text-[#3B82F6] hover:underline"
              >
                Daftar akun baru
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
