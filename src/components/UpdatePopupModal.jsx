import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { SITE_CONFIG } from '../config/siteConfig';

export default function UpdatePopupModal({ isOpen, settings, onClose }) {
  if (!isOpen || !settings) return null;

  const hasBanner = Boolean(settings.popup_banner_url?.trim());
  const title = settings.popup_title?.trim() || `Pembaruan ${SITE_CONFIG.name}`;
  const content =
    settings.popup_content?.trim() ||
    'Selamat datang di pembaruan terbaru NusaForums.';

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-popup-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-lg rounded-2xl bg-[#0F1623] border border-[#1F293B] shadow-2xl overflow-hidden"
        >
          {/* Tombol X Menutup Popup */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup informasi update"
            className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-[#090D16]/85 border border-[#1F293B] text-[#F8FAFC] hover:bg-[#2563EB] hover:border-[#2563EB] flex items-center justify-center transition-colors duration-150"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>

          {/* Banner Berbentuk Balok Persegi Panjang */}
          {hasBanner ? (
            <div className="w-full aspect-[16/9] bg-[#161F30] border-b border-[#1F293B] overflow-hidden">
              <img
                src={settings.popup_banner_url}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-36 bg-[#161F30] border-b border-[#1F293B] px-6 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#2563EB]/15 border border-[#2563EB]/30 text-[#60A5FA] flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-mono text-[#60A5FA] block">
                  Pengumuman resmi
                </span>
                <span className="text-sm font-medium text-[#F8FAFC] truncate block">
                  {SITE_CONFIG.name} Release Notes
                </span>
              </div>
            </div>
          )}

          {/* Informasi Update di Bawah Banner */}
          <div className="p-6 space-y-4">
            <div className="space-y-2 min-w-0">
              <h2
                id="update-popup-title"
                className="text-lg sm:text-xl font-semibold text-[#F8FAFC] leading-snug break-words"
              >
                {title}
              </h2>
              <div className="max-h-52 overflow-y-auto pr-1 text-sm text-[#CBD5E1] leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere]">
                {content}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium transition-colors duration-150"
              >
                Lanjutkan ke forum
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
