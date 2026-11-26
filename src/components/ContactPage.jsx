import React from 'react';
import { Send, Radio, ArrowUpRight } from 'lucide-react';
import { SITE_CONFIG } from '../config/siteConfig';

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-16 space-y-10">
      <div className="space-y-2 max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F4F5F7]">
          Kontak pengelola & saluran resmi
        </h1>
        <p className="text-sm sm:text-base text-[#9BA1AE] leading-relaxed">
          Hubungi pemilik forum secara langsung melalui Telegram untuk laporan pelanggaran,
          bantuan akun, atau pantau pengumuman terbaru di saluran resmi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kartu Telegram Owner */}
        <a
          href={SITE_CONFIG.ownerTelegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl bg-[#15181E] border border-white/[0.08] hover:border-[#3B82F6]/50 p-6 flex flex-col justify-between space-y-6 group transition-colors duration-150"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-[#3B82F6]/15 text-[#3B82F6] flex items-center justify-center">
                <Send className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <ArrowUpRight
                className="w-5 h-5 text-[#68707E] group-hover:text-[#3B82F6] transition-colors duration-150"
                strokeWidth={1.5}
              />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold text-[#F4F5F7]">
                Owner ({SITE_CONFIG.creatorName})
              </h2>
              <p className="text-sm text-[#9BA1AE] leading-relaxed">
                Kirim pesan langsung ke akun Telegram pengelola NusaForums untuk bantuan teknis
                dan pelaporan member bermasalah.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
            <span className="text-xs font-mono text-[#3B82F6]">
              {SITE_CONFIG.ownerTelegramHandle}
            </span>
            <span className="text-xs font-medium text-[#F4F5F7]">Buka Telegram</span>
          </div>
        </a>

        {/* Kartu Saluran Telegram */}
        <a
          href={SITE_CONFIG.telegramChannelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl bg-[#15181E] border border-white/[0.08] hover:border-[#3B82F6]/50 p-6 flex flex-col justify-between space-y-6 group transition-colors duration-150"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-[#3B82F6]/15 text-[#3B82F6] flex items-center justify-center">
                <Radio className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <ArrowUpRight
                className="w-5 h-5 text-[#68707E] group-hover:text-[#3B82F6] transition-colors duration-150"
                strokeWidth={1.5}
              />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold text-[#F4F5F7]">
                Saluran Telegram resmi
              </h2>
              <p className="text-sm text-[#9BA1AE] leading-relaxed">
                Ikuti saluran pengumuman untuk mendapatkan informasi pembaruan fitur, aturan
                komunitas, dan kabar resmi NusaForums.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
            <span className="text-xs font-mono text-[#3B82F6]">
              {SITE_CONFIG.telegramChannelHandle}
            </span>
            <span className="text-xs font-medium text-[#F4F5F7]">Gabung saluran</span>
          </div>
        </a>
      </div>
    </div>
  );
}
