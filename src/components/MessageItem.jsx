import React, { useState } from 'react';
import { FileText, Download, Trash2, Mail } from 'lucide-react';
import { formatFileSize, formatRelativeTime, getInitials } from '../utils/mediaHelpers';

export default function MessageItem({
  message,
  currentUserId,
  isAdmin,
  onDelete,
  onStartDm,
  showDmAction = true
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const author = message.author || {};
  const isOwn = message.user_id === currentUserId || message.sender_id === currentUserId;
  const canDelete = isOwn || isAdmin;
  const isJualan = message.category === 'jualan';

  return (
    <article
      className={`p-5 transition-colors duration-150 ${
        isJualan
          ? 'bg-[#1C2028]/55 border-l-2 border-l-[#3B82F6]'
          : 'hover:bg-[#15181E]/80'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {author.avatar_url ? (
            <img
              src={author.avatar_url}
              alt={author.display_name || 'Member'}
              className="w-8 h-8 rounded-full object-cover border border-white/[0.08] shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#1C2028] border border-white/[0.08] flex items-center justify-center text-xs font-mono text-[#F4F5F7] shrink-0">
              {getInitials(author.display_name || author.email)}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-[#F4F5F7] truncate">
              {author.display_name || 'Member'}
            </span>

            {isJualan && (
              <span className="px-2 py-0.5 rounded bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[11px] font-mono text-[#3B82F6]">
                Jualan
              </span>
            )}

            <span className="text-xs font-mono text-[#68707E] tabular-nums">
              {formatRelativeTime(message.created_at)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {showDmAction && !isOwn && author.id && (
            <button
              type="button"
              onClick={() => onStartDm(author)}
              title={`Kirim pesan pribadi ke ${author.display_name || 'member'}`}
              className="p-1.5 rounded-lg text-[#68707E] hover:text-[#3B82F6] hover:bg-[#1C2028] transition-colors duration-150"
            >
              <Mail className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}

          {canDelete && (
            <>
              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onDelete(message)}
                    className="px-2 py-1 rounded bg-red-600 text-white text-[11px] font-medium hover:bg-red-700"
                  >
                    Hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2 py-1 rounded bg-[#1C2028] text-[#9BA1AE] text-[11px]"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  title="Hapus kiriman"
                  className="p-1.5 rounded-lg text-[#68707E] hover:text-red-400 hover:bg-[#1C2028] transition-colors duration-150"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Isi Pesan, Harga Jualan & Lampiran Media */}
      <div className="pl-11 mt-2.5 space-y-3">
        {isJualan && message.price_text && (
          <div className="inline-block px-2.5 py-1 rounded-md bg-[#0E1013] border border-white/[0.08] text-xs font-mono font-medium text-[#F4F5F7] tabular-nums">
            {message.price_text}
          </div>
        )}

        {message.content && (
          <p className="text-sm text-[#F4F5F7]/90 whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </p>
        )}

        {/* Lampiran Foto */}
        {message.media_url && message.media_type === 'image' && (
          <a
            href={message.media_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block max-w-md rounded-xl overflow-hidden border border-white/[0.08] bg-[#0E1013]"
          >
            <img
              src={message.media_url}
              alt={message.media_name || 'Lampiran gambar'}
              loading="lazy"
              className="max-h-80 w-auto object-contain"
            />
          </a>
        )}

        {/* Lampiran Video */}
        {message.media_url && message.media_type === 'video' && (
          <div className="max-w-md rounded-xl overflow-hidden border border-white/[0.08] bg-[#0E1013]">
            <video
              src={message.media_url}
              controls
              preload="metadata"
              className="max-h-80 w-full"
            />
          </div>
        )}

        {/* Lampiran Pesan Suara */}
        {message.media_url && message.media_type === 'voice' && (
          <div className="max-w-sm rounded-xl bg-[#0E1013] border border-white/[0.08] p-3">
            <audio src={message.media_url} controls preload="metadata" className="w-full h-9" />
          </div>
        )}

        {/* Lampiran File Dokumen / Arsip */}
        {message.media_url && message.media_type === 'file' && (
          <a
            href={message.media_url}
            target="_blank"
            rel="noopener noreferrer"
            className="max-w-md flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#0E1013] border border-white/[0.08] hover:border-[#3B82F6]/50 transition-colors duration-150"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#15181E] border border-white/[0.08] flex items-center justify-center text-[#3B82F6] shrink-0">
                <FileText className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#F4F5F7] truncate">
                  {message.media_name || 'Lampiran berkas'}
                </p>
                <p className="text-[11px] font-mono text-[#68707E] tabular-nums">
                  {formatFileSize(message.media_size)}
                </p>
              </div>
            </div>

            <Download className="w-4 h-4 text-[#9BA1AE] shrink-0" strokeWidth={1.5} />
          </a>
        )}
      </div>
    </article>
  );
}
