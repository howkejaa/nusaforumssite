import React from 'react';
import { X, ShieldCheck, BadgeCheck, MessageSquare, Calendar } from 'lucide-react';
import { formatJoinDate, getInitials } from '../utils/formatters';

export default function MemberProfileModal({
  member,
  isOwnerAdmin,
  currentUserId,
  onClose,
  onStartDirectMessage
}) {
  if (!member) return null;

  const isSelf = member.id === currentUserId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-[#0F1623] border border-[#1F293B] p-6 space-y-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            {member.avatar_url ? (
              <img
                src={member.avatar_url}
                alt={member.display_name}
                className="w-14 h-14 rounded-full object-cover border border-[#1F293B] shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[#1E3A8A] border border-[#2563EB]/40 text-white font-semibold text-base flex items-center justify-center shrink-0">
                {getInitials(member.display_name, member.email)}
              </div>
            )}

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-base font-semibold text-[#F8FAFC] truncate">
                  {member.display_name || 'Member NusaForums'}
                </h3>
                {isOwnerAdmin && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#2563EB]/20 border border-[#2563EB]/40 text-[11px] font-mono text-[#60A5FA]">
                    <ShieldCheck className="w-3 h-3" strokeWidth={1.5} />
                    Owner
                  </span>
                )}
                {!isOwnerAdmin && member.is_verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono text-emerald-400">
                    <BadgeCheck className="w-3 h-3" strokeWidth={1.5} />
                    Verified
                  </span>
                )}
              </div>

              <div className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8]">
                <Calendar className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                <span>Bergabung {formatJoinDate(member.created_at)}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup profil"
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] shrink-0"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="rounded-xl bg-[#161F30] border border-[#1F293B] p-3.5 text-xs text-[#CBD5E1] leading-relaxed break-words">
          {member.bio?.trim()
            ? member.bio
            : 'Member komunitas diskusi dan bursa digital NusaForums.'}
        </div>

        {!isSelf && (
          <button
            type="button"
            onClick={() => {
              onStartDirectMessage(member);
              onClose();
            }}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium transition-colors duration-150"
          >
            <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
            <span>Kirim pesan pribadi</span>
          </button>
        )}
      </div>
    </div>
  );
}
