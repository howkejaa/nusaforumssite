import React, { useState, useEffect, useCallback } from 'react';
import Lenis from 'lenis';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import LandingPage from './components/LandingPage';
import AuthModal from './components/AuthModal';
import ChatWorkspace from './components/ChatWorkspace';
import AdminPanelPage from './components/AdminPanelPage';
import UpdatePopupModal from './components/UpdatePopupModal';

function isAdminPath() {
  return window.location.pathname.replace(/\/+$/, '') === '/adminpanel';
}

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState(null);

  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [authModalMode, setAuthModalMode] = useState(null);
  const [blockedNotice, setBlockedNotice] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(isAdminPath);
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);

  // Aktifkan Lenis Smooth Scroll hanya saat di halaman Beranda / Admin (bukan di layar penuh chat)
  useEffect(() => {
    if (user && !showAdminPanel) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    });

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [user, showAdminPanel]);

  useEffect(() => {
    const onPopState = () => setShowAdminPanel(isAdminPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const fetchSettings = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) return null;
    const { data } = await supabase
      .from('forum_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (data) setSettings(data);
    return data;
  }, []);

  // Cek apakah popup update terbaru perlu ditampilkan setelah login/daftar
  const evaluateUpdatePopup = useCallback((latestSettings, justAuthenticated = false) => {
    if (!latestSettings?.popup_enabled) return;
    const versionKey = `nusaforums-popup-seen-${latestSettings.popup_updated_at || 'v1'}`;
    const alreadySeen = localStorage.getItem(versionKey) === '1';

    if (justAuthenticated || !alreadySeen) {
      setShowUpdatePopup(true);
    }
  }, []);

  const handleCloseUpdatePopup = () => {
    if (settings) {
      const versionKey = `nusaforums-popup-seen-${settings.popup_updated_at || 'v1'}`;
      localStorage.setItem(versionKey, '1');
    }
    setShowUpdatePopup(false);
  };

  const hydrateUserSession = useCallback(
    async (currentUser, justAuthenticated = false) => {
      if (!currentUser || !supabase) {
        setProfile(null);
        setIsAdmin(false);
        return;
      }

      const [profRes, adminRes, latestSettings] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle(),
        supabase
          .from('app_admins')
          .select('email')
          .ilike('email', currentUser.email)
          .maybeSingle(),
        fetchSettings()
      ]);

      const prof = profRes.data;
      if (prof?.is_banned) {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        setBlockedNotice('Akun Anda telah diblokir oleh pengelola NusaForums.');
        return;
      }

      setBlockedNotice('');
      setProfile(prof || null);
      setIsAdmin(Boolean(adminRes.data));
      evaluateUpdatePopup(latestSettings, justAuthenticated);
    },
    [fetchSettings, evaluateUpdatePopup]
  );

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(async ({ data }) => {
      const activeUser = data?.session?.user || null;
      setUser(activeUser);
      if (activeUser) {
        await hydrateUserSession(activeUser, false);
      } else {
        await fetchSettings();
      }
      setAuthReady(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const updatedUser = session?.user || null;
        setUser(updatedUser);

        if (updatedUser) {
          const isFreshSignIn = event === 'SIGNED_IN';
          await hydrateUserSession(updatedUser, isFreshSignIn);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setShowUpdatePopup(false);
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [hydrateUserSession, fetchSettings]);

  const handleOpenAdmin = () => {
    window.history.pushState({}, '', '/adminpanel');
    setShowAdminPanel(true);
  };

  const handleBackFromAdmin = () => {
    window.history.pushState({}, '', '/');
    setShowAdminPanel(false);
  };

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
    handleBackFromAdmin();
  };

  if (!authReady) {
    return (
      <div className="h-[100dvh] bg-[#090D16] text-[#94A3B8] flex items-center justify-center text-sm">
        Menghubungkan ke NusaForums...
      </div>
    );
  }

  // Rute Khusus /adminpanel
  if (showAdminPanel) {
    if (!user) {
      return (
        <>
          <LandingPage
            onOpenAuth={(mode) => setAuthModalMode(mode)}
            blockedNotice="Silakan masuk dengan akun Owner untuk membuka Admin Panel."
          />
          {authModalMode && (
            <AuthModal
              initialMode={authModalMode}
              onClose={() => setAuthModalMode(null)}
            />
          )}
        </>
      );
    }

    return (
      <AdminPanelPage
        user={user}
        isAdmin={isAdmin}
        settings={settings}
        onSettingsSaved={fetchSettings}
        onBackToForum={handleBackFromAdmin}
      />
    );
  }

  return (
    <>
      {user ? (
        <ChatWorkspace
          user={user}
          profile={profile}
          isAdmin={isAdmin}
          settings={settings}
          onOpenAdminPanel={handleOpenAdmin}
          onSignOut={handleSignOut}
          onProfileUpdated={() => hydrateUserSession(user, false)}
        />
      ) : (
        <LandingPage
          onOpenAuth={(mode) => setAuthModalMode(mode)}
          blockedNotice={blockedNotice}
        />
      )}

      {authModalMode && (
        <AuthModal
          initialMode={authModalMode}
          onClose={() => setAuthModalMode(null)}
        />
      )}

      <UpdatePopupModal
        isOpen={Boolean(user && showUpdatePopup)}
        settings={settings}
        onClose={handleCloseUpdatePopup}
      />
    </>
  );
}
