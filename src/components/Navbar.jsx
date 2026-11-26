import React, { useState } from 'react';
import { Menu, X, LogOut, MessageSquare, Mail, User } from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function Navbar({
  activePage,
  onNavigate,
  user,
  profile,
  unreadDmCount,
  onSignOut
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelect = (pageId) => {
    onNavigate(pageId);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0E1013]/95 backdrop-blur-md border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <BrandLogo onClick={() => handleSelect(user ? 'forum' : 'home')} />

        {/* Navigasi Desktop */}
        <nav className="hidden md:flex items-center gap-2" aria-label="Navigasi utama">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => handleSelect('forum')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  activePage === 'forum'
                    ? 'bg-[#1C2028] text-[#F4F5F7] border border-white/[0.08]'
                    : 'text-[#9BA1AE] hover:text-[#F4F5F7] hover:bg-[#15181E]'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-[#3B82F6]" strokeWidth={1.5} />
                <span>Grup utama</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelect('dm')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  activePage === 'dm'
                    ? 'bg-[#1C2028] text-[#F4F5F7] border border-white/[0.08]'
                    : 'text-[#9BA1AE] hover:text-[#F4F5F7] hover:bg-[#15181E]'
                }`}
              >
                <Mail className="w-4 h-4 text-[#9BA1AE]" strokeWidth={1.5} />
                <span>Chat pribadi</span>
                {unreadDmCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-[#3B82F6] text-[11px] font-mono font-medium text-white tabular-nums">
                    {unreadDmCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSelect('profile')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  activePage === 'profile'
                    ? 'bg-[#1C2028] text-[#F4F5F7] border border-white/[0.08]'
                    : 'text-[#9BA1AE] hover:text-[#F4F5F7] hover:bg-[#15181E]'
                }`}
              >
                <User className="w-4 h-4 text-[#9BA1AE]" strokeWidth={1.5} />
                <span>Profil</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelect('contact')}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  activePage === 'contact'
                    ? 'bg-[#1C2028] text-[#F4F5F7] border border-white/[0.08]'
                    : 'text-[#9BA1AE] hover:text-[#F4F5F7] hover:bg-[#15181E]'
                }`}
              >
                Contact
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleSelect('home')}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  activePage === 'home'
                    ? 'bg-[#1C2028] text-[#F4F5F7] border border-white/[0.08]'
                    : 'text-[#9BA1AE] hover:text-[#F4F5F7] hover:bg-[#15181E]'
                }`}
              >
                Beranda
              </button>

              <button
                type="button"
                onClick={() => handleSelect('contact')}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  activePage === 'contact'
                    ? 'bg-[#1C2028] text-[#F4F5F7] border border-white/[0.08]'
                    : 'text-[#9BA1AE] hover:text-[#F4F5F7] hover:bg-[#15181E]'
                }`}
              >
                Contact
              </button>
            </>
          )}
        </nav>

        {/* Tombol Akun Desktop */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => handleSelect('profile')}
                className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#15181E] border border-white/[0.08] hover:border-white/15 transition-colors duration-150"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                )}
                <span className="text-xs font-medium text-[#F4F5F7] max-w-[140px] truncate">
                  {profile?.display_name || user.email?.split('@')[0]}
                </span>
              </button>

              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/[0.08] text-sm font-medium text-[#9BA1AE] hover:text-[#F4F5F7] hover:bg-[#15181E] transition-colors duration-150"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.5} />
                <span>Keluar</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleSelect('login')}
                className="px-3.5 py-2 rounded-lg text-sm font-medium text-[#9BA1AE] hover:text-[#F4F5F7] transition-colors duration-150"
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => handleSelect('register')}
                className="px-4 py-2 rounded-lg bg-[#3B82F6] text-white text-sm font-medium hover:bg-[#2563EB] transition-colors duration-150"
              >
                Daftar akun
              </button>
            </>
          )}
        </div>

        {/* Tombol Menu Mobile */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
          className="md:hidden p-2 rounded-lg text-[#9BA1AE] hover:text-[#F4F5F7] hover:bg-[#15181E] transition-colors duration-150"
        >
          {mobileOpen ? (
            <X className="w-5 h-5" strokeWidth={1.5} />
          ) : (
            <Menu className="w-5 h-5" strokeWidth={1.5} />
          )}
        </button>
      </div>

      {/* Menu Mobile */}
      {mobileOpen && (
        <div className="md:hidden bg-[#15181E] border-b border-white/[0.08] px-6 py-4 space-y-2">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => handleSelect('forum')}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activePage === 'forum'
                    ? 'bg-[#1C2028] text-[#F4F5F7]'
                    : 'text-[#9BA1AE] hover:text-[#F4F5F7]'
                }`}
              >
                Grup utama
              </button>
              <button
                type="button"
                onClick={() => handleSelect('dm')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activePage === 'dm'
                    ? 'bg-[#1C2028] text-[#F4F5F7]'
                    : 'text-[#9BA1AE] hover:text-[#F4F5F7]'
                }`}
              >
                <span>Chat pribadi</span>
                {unreadDmCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-[#3B82F6] text-xs font-mono text-white tabular-nums">
                    {unreadDmCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSelect('profile')}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activePage === 'profile'
                    ? 'bg-[#1C2028] text-[#F4F5F7]'
                    : 'text-[#9BA1AE] hover:text-[#F4F5F7]'
                }`}
              >
                Profil saya
              </button>
              <button
                type="button"
                onClick={() => handleSelect('contact')}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activePage === 'contact'
                    ? 'bg-[#1C2028] text-[#F4F5F7]'
                    : 'text-[#9BA1AE] hover:text-[#F4F5F7]'
                }`}
              >
                Contact
              </button>
              <div className="pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onSignOut();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-white/[0.08] text-sm font-medium text-[#F4F5F7]"
                >
                  <LogOut className="w-4 h-4" strokeWidth={1.5} />
                  <span>Keluar dari akun</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleSelect('home')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#F4F5F7]"
              >
                Beranda
              </button>
              <button
                type="button"
                onClick={() => handleSelect('contact')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#9BA1AE]"
              >
                Contact
              </button>
              <div className="pt-2 border-t border-white/[0.08] grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSelect('login')}
                  className="px-4 py-2.5 rounded-lg border border-white/[0.08] text-sm font-medium text-[#F4F5F7]"
                >
                  Masuk
                </button>
                <button
                  type="button"
                  onClick={() => handleSelect('register')}
                  className="px-4 py-2.5 rounded-lg bg-[#3B82F6] text-white text-sm font-medium"
                >
                  Daftar
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
