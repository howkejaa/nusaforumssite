import React, { useState, useEffect, useCallback } from 'react';
import Lenis from 'lenis';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import Navbar from './components/Navbar';
import BrandLogo from './components/BrandLogo';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import ForumWorkspace from './components/ForumWorkspace';
import DirectMessagesView from './components/DirectMessagesView';
import ProfileView from './components/ProfileView';
import ContactPage from './components/ContactPage';
import AdminPanelPage from './components/AdminPanelPage';
import { SITE_CONFIG } from './config/siteConfig';

function getInitialRoute() {
  const cleanPath = window.location.pathname.replace(/\/+$/, '');
  if (cleanPath === '/adminpanel') return 'adminpanel';
  return 'home';
}

export default function App() {
  const [activePage, setActivePage] = useState(getInitialRoute);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [members, setMembers] = useState([]);
  const [selectedDmPartner, setSelectedDmPartner] = useState(null);
  const [unreadDmCount, setUnreadDmCount] = useState(0);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);

  // Inisialisasi Lenis Smooth Scroll
  useEffect(() => {
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
  }, []);

  // Dengarkan tombol Back/Forward browser untuk /adminpanel
  useEffect(() => {
    const onPopState = () => setActivePage(getInitialRoute());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const loadUserWorkspaceData = useCallback(async (currentUser) => {
    if (!currentUser || !supabase) return;

    const [{ data: myProfile }, { data: allProfiles }, { count: unreadCount }] =
      await Promise.all([
        supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle(),
        supabase
          .from('profiles')
          .select('id, display_name, avatar_url, bio, email, is_banned')
          .order('display_name', { ascending: true }),
        supabase
          .from('direct_messages')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_id', currentUser.id)
          .eq('is_read', false)
      ]);

    if (myProfile) setProfile(myProfile);
    if (Array.isArray(allProfiles)) setMembers(allProfiles);
    setUnreadDmCount(unreadCount || 0);
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!user || !supabase) return;
    const { count } = await supabase
      .from('direct_messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false);
    setUnreadDmCount(count || 0);
  }, [user]);

  // Pantau status autentikasi Supabase
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      const currentUser = data?.session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        loadUserWorkspaceData(currentUser);
        if (getInitialRoute() === 'home') {
          setActivePage('forum');
        }
      }
      setAuthReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const updatedUser = session?.user || null;
      setUser(updatedUser);

      if (updatedUser) {
        loadUserWorkspaceData(updatedUser);
        setActivePage((prev) =>
          prev === 'login' || prev === 'register' || prev === 'home' ? 'forum' : prev
        );
      } else {
        setProfile(null);
        setMembers([]);
        setUnreadDmCount(0);
      }
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, [loadUserWorkspaceData]);

  // Pantau notifikasi pesan pribadi baru secara realtime
  useEffect(() => {
    if (!user || !supabase) return;

    const dmNotifyChannel = supabase
      .channel(`dm-unread-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${user.id}`
        },
        () => {
          refreshUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dmNotifyChannel);
    };
  }, [user, refreshUnreadCount]);

  const handleNavigate = (pageId) => {
    if (window.location.pathname.replace(/\/+$/, '') === '/adminpanel' && pageId !== 'adminpanel') {
      window.history.pushState({}, '', '/');
    }

    const protectedPages = ['forum', 'dm', 'profile'];
    if (protectedPages.includes(pageId) && !user) {
      setActivePage('login');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setActivePage(pageId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartDirectMessage = (targetMember) => {
    setSelectedDmPartner(targetMember);
    handleNavigate('dm');
  };

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    if (window.location.pathname.replace(/\/+$/, '') === '/adminpanel') {
      window.history.pushState({}, '', '/');
    }
    setActivePage('home');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0E1013] text-[#F4F5F7]">
      <Navbar
        activePage={activePage}
        onNavigate={handleNavigate}
        user={user}
        profile={profile}
        unreadDmCount={unreadDmCount}
        onSignOut={handleSignOut}
      />

      <main className="flex-1">
        {!authReady ? (
          <div className="py-24 text-center text-sm text-[#68707E]">Memuat sesi forum...</div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {activePage === 'home' && (
                <LandingPage user={user} onNavigate={handleNavigate} />
              )}

              {(activePage === 'login' || activePage === 'register') && (
                <AuthPage
                  mode={activePage}
                  onSwitchMode={(newMode) => setActivePage(newMode)}
                  onBackHome={() => handleNavigate('home')}
                />
              )}

              {activePage === 'forum' && user && (
                <ForumWorkspace
                  user={user}
                  profile={profile}
                  isAdmin={false}
                  members={members}
                  onStartDm={handleStartDirectMessage}
                />
              )}

              {activePage === 'dm' && user && (
                <DirectMessagesView
                  user={user}
                  profile={profile}
                  members={members}
                  selectedPartner={selectedDmPartner}
                  onSelectPartner={setSelectedDmPartner}
                  onMessagesRead={refreshUnreadCount}
                />
              )}

              {activePage === 'profile' && user && (
                <ProfileView
                  user={user}
                  profile={profile}
                  onProfileUpdated={() => loadUserWorkspaceData(user)}
                />
              )}

              {activePage === 'contact' && <ContactPage />}

              {activePage === 'adminpanel' && (
                <AdminPanelPage
                  user={user}
                  onBackHome={() => handleNavigate(user ? 'forum' : 'home')}
                  onSignOut={handleSignOut}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <footer className="bg-[#15181E] border-t border-white/[0.08] py-8 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <BrandLogo size="sm" onClick={() => handleNavigate(user ? 'forum' : 'home')} />
          <p className="text-xs font-mono text-[#68707E]">
            © {new Date().getFullYear()} {SITE_CONFIG.appName} — Developed by{' '}
            {SITE_CONFIG.creatorName}
          </p>
        </div>
      </footer>
    </div>
  );
  }
