import React from 'react';
import {
  Reply,
  BadgeCheck,
  ShieldCheck,
  Tag,
  CheckCheck,
  FileText,
  Download,
  MessageSquare,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import {
  formatTimeShort,
  formatBytes,
  isJualanCategory,
  getInitials
} from '../utils/formatters';

export default function MessageBubble({
  message,
  senderProfile,
  isOwn,
  isSenderOwner,
  isGroupChat,
  isCurrentUserAdmin,
  onReply,
  onOpenProfile,
  onToggleSold,
  onChatSeller,
  onDeleteMessage,
  onPreviewImage
}) {
  const isJualan = isGroupChat && isJualanCategory(message.category);
  const senderName =
    senderProfile?.display_name || senderProfile?.email?.split('@')[0] || 'Member';
  const replyData = message.reply_preview;

  const isImage = message.media_type?.startsWith('image/');
  const isVideo = message.media_type?.startsWith('video/');
  const isAudio = message.media_type?.startsWith('audio/');

  return (
    <div
      className={`flex w-full min-w-0 gap-2.5 ${
        isOwn ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* Avatar Pengirim (Hanya untuk pesan user lain di sebelah kiri) */}
      {!isOwn && isGroupChat && (
        <button
          type="button"
          onClick={() => senderProfile && onOpenProfile(senderProfile)}
          className="mt-1 shrink-0 focus:outline-none"
          title={`Lihat profil ${senderName}`}
        >
          {senderProfile?.avatar_url ? (
            <img
              src={senderProfile.avatar_url}
              alt={senderName}
              className="w-8 h-8 rounded-full object-cover border border-[#1F293B]"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#161F30] border border-[#1F293B] text-xs font-medium text-[#CBD5E1] flex items-center justify-center">
              {getInitials(senderName, senderProfile?.email)}
            </div>
          )}
        </button>
      )}

      {/* Gelembung Pesan (Kanan = Milik Kita, Kiri = User Lain) */}
      <div
        className={`group relative min-w-0 max-w-[85%] sm:max-w-[74%] lg:max-w-[65%] rounded-2xl px-3.5 py-2.5 border transition-colors ${
          isOwn
            ? 'bg-[#1E3A8A] border-[#2563EB]/50 text-[#F8FAFC] rounded-tr-sm'
            : 'bg-[#161F30] border-[#1F293B] text-[#F8FAFC] rounded-tl-sm'
        }`}
      >
        {/* Header Nama Pengirim untuk Pesan Masuk di Grup */}
        {!isOwn && isGroupChat && (
          <div className="flex items-center gap-1.5 mb-1 min-w-0 flex-wrap">
            <button
              type="button"
              onClick={() => senderProfile && onOpenProfile(senderProfile)}
              className="text-xs font-semibold text-[#60A5FA] hover:underline truncate max-w-[180px]"
            >
              {senderName}
            </button>

            {isSenderOwner && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#2563EB]/25 text-[10px] font-mono text-[#93C5FD]">
                <ShieldCheck className="w-2.5 h-2.5" strokeWidth={1.5} />
                Owner
              </span>
            )}

            {!isSenderOwner && senderProfile?.is_verified && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/15 text-[10px] font-mono text-emerald-400">
                <BadgeCheck className="w-2.5 h-2.5" strokeWidth={1.5} />
                Verified
              </span>
            )}
          </div>
        )}

        {/* Kotak Kutipan Balas Pesan (Reply Quote ala WhatsApp) */}
        {replyData && (
          <div
            className={`mb-2 px-2.5 py-1.5 rounded-lg border-l-2 text-xs min-w-0 ${
              isOwn
                ? 'bg-[#090D16]/35 border-[#93C5FD] text-[#DBEAFE]'
                : 'bg-[#090D16]/55 border-[#2563EB] text-[#CBD5E1]'
            }`}
          >
            <div className="font-semibold text-[11px] text-[#93C5FD] truncate">
              {replyData.sender_name || 'Member'}
            </div>
            <div className="text-[11px] opacity-85 line-clamp-2 break-words [overflow-wrap:anywhere]">
              {replyData.content || 'Lampiran media'}
            </div>
          </div>
        )}

        {/* Header Khusus Kartu Lapak Jualan */}
        {isJualan && (
          <div
            className={`mb-2 p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
              isOwn
                ? 'bg-[#090D16]/35 border-[#2563EB]/40'
                : 'bg-[#0F1623] border-[#1F293B]'
            }`}
          >
            <div className="inline-flex items-center gap-1.5 min-w-0">
              <Tag className="w-3.5 h-3.5 text-[#60A5FA] shrink-0" strokeWidth={1.5} />
              <span className="text-xs font-mono font-semibold text-[#F8FAFC] truncate tabular-nums">
                {message.price_text?.trim() || 'Hubungi penjual'}
              </span>
            </div>

            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono shrink-0 ${
                message.is_sold
                  ? 'bg-slate-700/70 text-slate-300'
                  : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {message.is_sold ? 'Terjual' : 'Tersedia'}
            </span>
          </div>
        )}

        {/* Lampiran Media (Gambar, Video, Voice Note, Dokumen) */}
        {message.media_url && (
          <div className="mb-2 overflow-hidden rounded-xl border border-white/10 bg-[#090D16]/40">
            {isImage && (
              <button
                type="button"
                onClick={() => onPreviewImage && onPreviewImage(message.media_url)}
                className="block w-full text-left focus:outline-none"
              >
                <img
                  src={message.media_url}
                  alt={message.media_name || 'Lampiran gambar'}
                  loading="lazy"
                  className="max-h-64 w-full object-cover"
                />
              </button>
            )}

            {isVideo && (
              <video
                src={message.media_url}
                controls
                preload="metadata"
                className="max-h-64 w-full bg-black"
              />
            )}

            {isAudio && (
              <div className="p-2.5">
                <audio src={message.media_url} controls className="w-full h-9" />
              </div>
            )}

            {!isImage && !isVideo && !isAudio && (
              <a
                href={message.media_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2.5 p-2.5 text-xs hover:bg-white/5 transition-colors min-w-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-[#60A5FA] shrink-0" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {message.media_name || 'Berkas lampiran'}
                    </div>
                    {message.media_size > 0 && (
                      <div className="text-[10px] font-mono text-[#94A3B8] tabular-nums">
                        {formatBytes(message.media_size)}
                      </div>
                    )}
                  </div>
                </div>
                <Download className="w-4 h-4 text-[#94A3B8] shrink-0" strokeWidth={1.5} />
              </a>
            )}
          </div>
        )}

        {/* Teks Isi Pesan */}
        {message.content && (
          <p className="text-sm leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere]">
            {message.content}
          </p>
        )}

        {/* Aksi Cepat pada Lapak Jualan */}
        {isJualan && (
          <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
            {isOwn ? (
              <button
                type="button"
                onClick={() => onToggleSold && onToggleSold(message)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#090D16]/45 hover:bg-[#090D16]/70 text-[11px] font-medium text-[#DBEAFE] transition-colors"
              >
                <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} />
                <span>{message.is_sold ? 'Tandai tersedia lagi' : 'Tandai terjual'}</span>
              </button>
            ) : (
              senderProfile && (
                <button
                  type="button"
                  onClick={() => onChatSeller && onChatSeller(senderProfile)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-[11px] font-medium text-white transition-colors"
                >
                  <MessageSquare className="w-3 h-3" strokeWidth={1.5} />
                  <span>Chat penjual</span>
                </button>
              )
            )}
          </div>
        )}

        {/* Baris Bawah: Tombol Reply, Hapus (Admin/Pemilik) & Waktu */}
        <div className="mt-1.5 flex items-center justify-between gap-3 text-[10px] font-mono">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onReply({
                  id: message.id,
                  sender_name: isOwn ? 'Anda' : senderName,
                  content:
                    message.content ||
                    (message.media_name ? `Lampiran: ${message.media_name}` : 'Media')
                })
              }
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                isOwn
                  ? 'text-[#BFDBFE] hover:bg-white/10'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
              }`}
            >
              <Reply className="w-3 h-3" strokeWidth={1.5} />
              <span>Balas</span>
            </button>

            {(isOwn || isCurrentUserAdmin) && isGroupChat && onDeleteMessage && (
              <button
                type="button"
                onClick={() => onDeleteMessage(message.id)}
                title="Hapus pesan"
                className="text-[#94A3B8] hover:text-red-400 p-0.5"
              >
                <Trash2 className="w-3 h-3" strokeWidth={1.5} />
              </button>
            )}
          </div>

          <div
            className={`inline-flex items-center gap-1 tabular-nums shrink-0 ${
              isOwn ? 'text-[#BFDBFE]' : 'text-[#94A3B8]'
            }`}
          >
            <span>{formatTimeShort(message.created_at)}</span>
            {isOwn && (
              <CheckCheck
                className={`w-3.5 h-3.5 ${
                  message.is_read ? 'text-[#60A5FA]' : 'text-[#BFDBFE]/70'
                }`}
                strokeWidth={1.5}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
