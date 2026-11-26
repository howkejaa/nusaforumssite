import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Tag,
  Paperclip,
  Lock,
  ShieldCheck,
  Code2
} from 'lucide-react';
import { SITE_CONFIG } from '../config/siteConfig';

const BLOCK_SLIDES = [
  {
    code: '01',
    icon: MessageSquare,
    title: 'Satu ruang berkumpul',
    metric: '1 Grup Utama',
    description:
      'Seluruh member bertemu dalam satu aliran diskusi terbuka tanpa cabang grup yang memecah perhatian.'
  },
  {
    code: '02',
    icon: Tag,
    title: 'Lapak jualan berjeda',
    metric: 'Cooldown 5 menit',
    description:
      'Tawarkan produk atau jasa dengan label Jualan dan kolom harga. Jeda 5 menit menjaga aliran tetap bersih dari spam.'
  },
  {
    code: '03',
    icon: Paperclip,
    title: 'Media 35 MB & suara',
    metric: 'Maks 35 MB · 2 mnt',
    description:
      'Kirim gabungan foto, video, atau file hingga 35 MB beserta keterangan teks, serta rekaman suara hingga 2 menit.'
  },
  {
    code: '04',
    icon: Lock,
    title: 'Jalur chat pribadi',
    metric: '1-on-1 Terenkripsi',
    description:
      'Ketuk profil member mana saja untuk membuka percakapan pribadi langsung guna bernegosiasi atau bertukar file.'
  }
];

export default function LandingPage({ user, onNavigate }) {
  const heroRef = useRef(null);
  const sliderTrackRef = useRef(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.gsap-hero-item',
        { y: 18, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          stagger: 0.08,
          ease: 'power3.out'
        }
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const scrollSlider = (direction) => {
    const container = sliderTrackRef.current;
    if (!container) return;

    const nextIndex = Math.max(
      0,
      Math.min(BLOCK_SLIDES.length - 1, activeSlideIndex + direction)
    );
    setActiveSlideIndex(nextIndex);

    const cardWidth = 304;
    container.scrollTo({
      left: nextIndex * cardWidth,
      behavior: 'smooth'
    });
  };

  return (
    <div ref={heroRef} className="max-w-7xl mx-auto px-6 py-12 md:py-20 space-y-20">
      {/* Split Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6 space-y-6">
          <div className="gsap-hero-item inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#15181E] border border-white/[0.08]">
            <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
            <span className="text-xs font-mono text-[#9BA1AE]">
              Komunitas Terverifikasi @gmail.com
            </span>
          </div>

          <h1 className="gsap-hero-item text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-tight text-[#F4F5F7] leading-[1.15]">
            Satu ruang forum untuk berdiskusi, berbagi file, dan membuka lapak
          </h1>

          <p className="gsap-hero-item text-base text-[#9BA1AE] leading-relaxed">
            Seluruh member berkumpul dalam satu grup utama yang terstruktur. Kirim pesan suara,
            lampiran media hingga 35 MB, pasang lapak jualan, atau lanjutkan transaksi lewat
            chat pribadi.
          </p>

          <div className="gsap-hero-item pt-2 flex flex-wrap items-center gap-3">
            {user ? (
              <button
                type="button"
                onClick={() => onNavigate('forum')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#3B82F6] text-white text-sm font-medium hover:bg-[#2563EB] transition-colors duration-150"
              >
                <span>Masuk ke grup utama</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('register')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#3B82F6] text-white text-sm font-medium hover:bg-[#2563EB] transition-colors duration-150"
                >
                  <span>Daftar dengan Gmail</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#15181E] border border-white/[0.08] text-[#F4F5F7] text-sm font-medium hover:bg-[#1C2028] transition-colors duration-150"
                >
                  <span>Masuk ke akun</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Pratinjau Aliran Forum Nyata */}
        <div className="gsap-hero-item lg:col-span-6">
          <div className="rounded-2xl bg-[#15181E] border border-white/[0.08] overflow-hidden">
            <div className="px-5 py-3.5 bg-[#1C2028] border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                <span className="text-xs font-medium text-[#F4F5F7]">Grup utama</span>
              </div>
              <span className="text-xs font-mono text-[#68707E]">Aliran langsung</span>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {/* Contoh Pesan Diskusi */}
              <div className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#1C2028] border border-white/[0.08] flex items-center justify-center text-[11px] font-mono text-[#F4F5F7]">
                      RZ
                    </div>
                    <span className="text-sm font-medium text-[#F4F5F7]">Rizal Pratama</span>
                  </div>
                  <span className="text-xs font-mono text-[#68707E] tabular-nums">19:42</span>
                </div>
                <p className="text-sm text-[#9BA1AE] pl-9 leading-relaxed">
                  Ada yang punya referensi konfigurasi Nginx untuk reverse proxy Node.js?
                </p>
              </div>

              {/* Contoh Kartu Lapak Jualan */}
              <div className="p-5 bg-[#1C2028]/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center text-[11px] font-mono text-[#3B82F6]">
                      HK
                    </div>
                    <span className="text-sm font-medium text-[#F4F5F7]">HowKeJaa</span>
                    <span className="px-2 py-0.5 rounded bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[11px] font-mono text-[#3B82F6]">
                      Jualan
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#68707E] tabular-nums">19:45</span>
                </div>

                <div className="pl-9 space-y-2">
                  <div className="inline-block px-2.5 py-1 rounded bg-[#0E1013] border border-white/[0.08] text-xs font-mono text-[#F4F5F7] tabular-nums">
                    Rp 75.000
                  </div>
                  <p className="text-sm text-[#9BA1AE] leading-relaxed">
                    Jasa setup server VPS + SSL otomatis. Bisa lanjut chat pribadi untuk detail
                    spesifikasi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Poster Slide Balok Kecil Interaktif */}
      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-[#F4F5F7]">
              Sorotan fitur forum
            </h2>
            <p className="text-sm text-[#9BA1AE]">
              Geser balok informasi di bawah untuk melihat mekanisme kerja ruang diskusi
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => scrollSlider(-1)}
              aria-label="Geser ke kiri"
              className="p-2.5 rounded-lg bg-[#15181E] border border-white/[0.08] text-[#9BA1AE] hover:text-[#F4F5F7] hover:bg-[#1C2028] transition-colors duration-150"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => scrollSlider(1)}
              aria-label="Geser ke kanan"
              className="p-2.5 rounded-lg bg-[#15181E] border border-white/[0.08] text-[#9BA1AE] hover:text-[#F4F5F7] hover:bg-[#1C2028] transition-colors duration-150"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div
          ref={sliderTrackRef}
          className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2"
        >
          {BLOCK_SLIDES.map((slide, idx) => {
            const IconComponent = slide.icon;
            const isSelected = activeSlideIndex === idx;
            return (
              <motion.div
                key={slide.code}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => setActiveSlideIndex(idx)}
                className={`min-w-[280px] sm:min-w-[296px] max-w-[296px] snap-start rounded-xl p-5 border flex flex-col justify-between space-y-5 cursor-pointer transition-colors duration-150 ${
                  isSelected
                    ? 'bg-[#1C2028] border-[#3B82F6]/50'
                    : 'bg-[#15181E] border-white/[0.08] hover:border-white/15'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-[#0E1013] border border-white/[0.08] flex items-center justify-center text-[#3B82F6]">
                      <IconComponent className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                    <span className="text-xs font-mono text-[#68707E] tabular-nums">
                      {slide.code}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-base font-semibold text-[#F4F5F7]">{slide.title}</h3>
                    <p className="text-xs text-[#9BA1AE] leading-relaxed">
                      {slide.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-xs font-mono text-[#3B82F6] tabular-nums">
                    {slide.metric}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Informasi Forum & Kredit Pembuat */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#15181E] border border-white/[0.08] p-6 space-y-4">
          <div className="w-10 h-10 rounded-lg bg-[#1C2028] border border-white/[0.08] flex items-center justify-center text-[#3B82F6]">
            <ShieldCheck className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-[#F4F5F7]">
              Tentang NusaForums & tata tertib
            </h2>
            <p className="text-sm text-[#9BA1AE] leading-relaxed">
              Setiap akun wajib mendaftar menggunakan alamat Gmail terverifikasi untuk mencegah
              akun bot. Member dilarang membuat grup terpisah sehingga seluruh informasi, diskusi
              teknis, maupun penawaran jual-beli terpusat di satu ruang utama.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-[#15181E] border border-white/[0.08] p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-lg bg-[#1C2028] border border-white/[0.08] flex items-center justify-center text-[#3B82F6]">
              <Code2 className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-[#F4F5F7]">
                Dikembangkan oleh {SITE_CONFIG.creatorName}
              </h2>
              <p className="text-sm text-[#9BA1AE] leading-relaxed">
                Platform ini dirancang dan dikelola langsung oleh {SITE_CONFIG.creatorName} (
                <span className="font-mono text-[#F4F5F7]">
                  {SITE_CONFIG.ownerTelegramHandle}
                </span>
                ). Hubungi pengelola melalui halaman Contact untuk bantuan akun atau informasi
                saluran resmi.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('contact')}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#3B82F6] hover:underline"
            >
              <span>Buka halaman contact</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
