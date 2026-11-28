import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  ArrowRight,
  MessageSquare,
  ShoppingBag,
  ShieldCheck,
  BadgeCheck,
  Lock
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { SITE_CONFIG } from '../config/siteConfig';
import {
  formatTimeShort,
  isJualanCategory,
  getInitials
} from '../utils/formatters';

export default function LandingPage({ onOpenAuth, blockedNotice }) {
  const rootRef = useRef(null);
  const [previewPosts, setPreviewPosts] = useState([]);
  const [stats, setStats] = useState({ members: 0, messages: 0, jualan: 0 });

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.nusa-hero-item',
        { y: 16, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power3.out'
        }
      );
    }, rootRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    async function fetchPublicSnapshot() {
      const [msgRes, profCountRes, totalMsgCountRes, jualanCountRes] =
        await Promise.all([
          supabase
            .from('forum_messages')
            .select('id, user_id, category, price_text, content, is_sold, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('forum_messages').select('id', { count: 'exact', head: true }),
          supabase
            .from('forum_messages')
            .select('id', { count: 'exact', head: true })
            .eq('category', 'jualan')
        ]);

      const msgs = Array.isArray(msgRes.data) ? msgRes.data.reverse() : [];
      const userIds = [...new Set(msgs.map((m) => m.user_id))];

      let profMap = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, display_name, is_verified')
          .in('id', userIds);
        if (Array.isArray(profs)) {
          profMap = Object.fromEntries(profs.map((p) => [p.id, p]));
        }
      }

      setPreviewPosts(
        msgs.map((m) => ({
          ...m,
          author: profMap[m.user_id] || { display_name: 'Member', is_verified: false }
        }))
      );

      setStats({
        members: profCountRes.count || 0,
        messages: totalMsgCountRes.count || 0,
        jualan: jualanCountRes.count || 0
      });
    }

    fetchPublicSnapshot();
  }, []);

  return (
    <div ref={rootRef} className="min-h-screen bg-[#090D16] text-[#F8FAFC]">
            {/* Navigasi Atas */}
      <header className="sticky top-0 z-30 bg-[#090D16]/90 backdrop-blur-md border-b border-[#1F293B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center min-w-0">
            <img
              src="/logo.png"
              alt={SITE_CONFIG.name}
              className="h-9 sm:h-10 w-auto max-w-[170px] sm:max-w-[200px] object-contain shrink-0"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium text-[#CBD5E1] hover:text-white hover:bg-[#161F30] transition-colors"
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-medium transition-colors"
            >
              Daftar gratis
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20 space-y-16">
        {blockedNotice && (
          <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-sm text-red-300">
            {blockedNotice}
          </div>
        )}

        {/* Split Hero Asimetris: Kiri Value Proposition, Kanan Live Preview Forum */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-6 min-w-0">
            <div className="nusa-hero-item inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0F1623] border border-[#1F293B]">
              <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
              <span className="text-xs font-mono text-[#94A3B8]">
                Forum Diskusi & Bursa Digital Real-Time
              </span>
            </div>

            <h1 className="nusa-hero-item text-3xl sm:text-4xl lg:text-[44px] font-semibold tracking-tight text-[#F8FAFC] leading-[1.15]">
              Ruang kolaborasi, jual beli digital, dan obrolan komunitas dalam satu layar
            </h1>

            <p className="nusa-hero-item text-sm sm:text-base text-[#94A3B8] leading-relaxed">
              Terhubung langsung dengan kreator, penjual script, dan pelaku produk digital
              Indonesia melalui grup diskusi aktif, lapak terstruktur, dan pesan pribadi
              instan.
            </p>

            <div className="nusa-hero-item flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium transition-colors"
              >
                <span>Gabung dengan Gmail</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </button>

              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0F1623] border border-[#1F293B] hover:border-[#2563EB] text-[#F8FAFC] text-sm font-medium transition-colors"
              >
                <span>Sudah punya akun</span>
              </button>
            </div>

            {/* Statistik Komunitas */}
            <div className="nusa-hero-item grid grid-cols-3 gap-4 pt-4 border-t border-[#1F293B]">
              <div>
                <div className="text-xl sm:text-2xl font-semibold font-mono text-[#F8FAFC] tabular-nums">
                  {stats.members}
                </div>
                <div className="text-xs text-[#64748B]">Member terdaftar</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-semibold font-mono text-[#60A5FA] tabular-nums">
                  {stats.messages}
                </div>
                <div className="text-xs text-[#64748B]">Pesan terkirim</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-semibold font-mono text-[#F8FAFC] tabular-nums">
                  {stats.jualan}
                </div>
                <div className="text-xs text-[#64748B]">Lapak diposting</div>
              </div>
            </div>
          </div>

          {/* Momen Utama: Pratinjau Langsung Percakapan & Bursa */}
          <div className="nusa-hero-item lg:col-span-6 min-w-0">
            <div className="rounded-2xl bg-[#0F1623] border border-[#1F293B] overflow-hidden shadow-2xl">
              <div className="px-5 py-3.5 bg-[#161F30] border-b border-[#1F293B] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-xs font-semibold text-[#F8FAFC] truncate">
                    Pratinjau Langsung · Grup Utama
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#64748B] shrink-0">
                  Mode baca
                </span>
              </div>

              <div className="p-4 sm:p-5 space-y-3 chat-canvas-pattern min-h-[300px]">
                {previewPosts.length === 0 ? (
                  <div className="py-16 text-center text-xs text-[#94A3B8]">
                    Masuk atau daftar untuk melihat seluruh obrolan dan lapak komunitas.
                  </div>
                ) : (
                  previewPosts.map((item) => {
                    const isJualan = isJualanCategory(item.category);
                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-2.5 min-w-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#1E3A8A] text-[11px] font-semibold text-white flex items-center justify-center shrink-0 mt-0.5">
                          {getInitials(item.author.display_name)}
                        </div>
                        <div className="flex-1 min-w-0 rounded-2xl rounded-tl-sm bg-[#161F30] border border-[#1F293B] px-3.5 py-2.5 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-semibold text-[#60A5FA] truncate">
                                {item.author.display_name}
                              </span>
                              {item.author.is_verified && (
                                <BadgeCheck
                                  className="w-3.5 h-3.5 text-emerald-400 shrink-0"
                                  strokeWidth={1.5}
                                />
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-[#64748B] shrink-0 tabular-nums">
                              {formatTimeShort(item.created_at)}
                            </span>
                          </div>

                          {isJualan && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#2563EB]/20 text-[11px] font-mono text-[#93C5FD]">
                              <span>Jualan · {item.price_text || 'Tersedia'}</span>
                            </div>
                          )}

                          <p className="text-xs sm:text-sm text-[#E2E8F0] line-clamp-2 break-words [overflow-wrap:anywhere]">
                            {item.content || 'Lampiran media komunitas'}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bilah Ajakan Daftar di Bawah Pratinjau */}
              <div className="p-4 bg-[#161F30] border-t border-[#1F293B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                  <Lock className="w-3.5 h-3.5 text-[#60A5FA] shrink-0" strokeWidth={1.5} />
                  <span>Daftar akun Gmail untuk membalas pesan & buka bursa</span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium shrink-0 transition-colors"
                >
                  Buat akun sekarang
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Pilar Utama Platform */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-2xl bg-[#0F1623] border border-[#1F293B] p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/15 text-[#60A5FA] flex items-center justify-center">
              <MessageSquare className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h2 className="text-base font-semibold text-[#F8FAFC]">
              Obrolan Real-Time & DM Pribadi
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
              Diskusi cepat dengan fitur kutip balasan, lampiran berkas hingga 35 MB,
              pesan suara, serta chat pribadi langsung antar member.
            </p>
          </div>

          <div className="rounded-2xl bg-[#0F1623] border border-[#1F293B] p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/15 text-[#60A5FA] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h2 className="text-base font-semibold text-[#F8FAFC]">
              Bursa Produk & Jasa Digital
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
              Kanal khusus penawaran script, bot, jasa desain, dan produk digital lengkap
              dengan label harga dan status ketersediaan barang.
            </p>
          </div>

          <div className="rounded-2xl bg-[#0F1623] border border-[#1F293B] p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/15 text-[#60A5FA] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h2 className="text-base font-semibold text-[#F8FAFC]">
              Member Terverifikasi & Moderasi Aktif
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
              Verifikasi akun Gmail wajib, lencana penjual tepercaya, serta pengawasan
              moderasi untuk menjaga kenyamanan transaksi komunitas.
            </p>
          </div>
        </section>
      </main>

            <footer className="border-t border-[#1F293B] py-8 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#64748B]">
          <img
            src="/logo.png"
            alt={SITE_CONFIG.name}
            className="h-7 w-auto max-w-[150px] object-contain"
          />
          <a
            href={SITE_CONFIG.ownerTelegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono hover:text-[#60A5FA] transition-colors"
          >
            Official Contact: {SITE_CONFIG.ownerHandle}
          </a>
        </div>
      </footer>
    </div>
  );
}
