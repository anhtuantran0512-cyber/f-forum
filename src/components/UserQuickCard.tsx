/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useMemo } from 'react';
import { MessageSquare, ChevronRight, X } from 'lucide-react';
import type { User } from '../types';
import { TierBadge, AdminVerifiedBadge } from './Badges10Tier';
import { getTierForLevel } from '../utils/tier';
import { DEFAULT_AVATAR, handleImageError } from '../utils/mediaFallback';

export interface QuickProfileStats {
  questions: number;
  solutions: number;
  best: number;
  joinedAt?: string;
}

interface UserQuickCardProps {
  user: User;
  stats?: QuickProfileStats;
  anchor?: { x: number; y: number } | null;
  isOwn?: boolean;
  onClose: () => void;
  onOpenFullProfile: (user: User) => void;
  onMessage?: () => void;
}

/** Gaming-style quick profile overlay: xem nhanh, bấm tiếp để mở hồ sơ đầy đủ. */
export const UserQuickCard: React.FC<UserQuickCardProps> = ({
  user,
  stats,
  anchor,
  isOwn = false,
  onClose,
  onOpenFullProfile,
  onMessage,
}) => {
  const tier = getTierForLevel(user.level);
  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  // Clamp the card near the click point, always inside the viewport
  const pos = useMemo(() => {
    const W = 308;
    const H = 380;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    if (!anchor) {
      return { left: Math.max(12, (vw - W) / 2), top: Math.max(12, (vh - H) / 2) };
    }
    let left = anchor.x + 14;
    let top = anchor.y - 40;
    if (left + W > vw - 12) left = Math.max(12, anchor.x - W - 14);
    if (top + H > vh - 12) top = Math.max(12, vh - H - 12);
    if (top < 12) top = 12;
    return { left, top };
  }, [anchor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const joinedLabel = user.joinedAt
    ? new Date(user.joinedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Đóng thẻ hồ sơ"
        className="fixed inset-0 z-[75] bg-black/40 backdrop-blur-[2px] cursor-default border-none outline-none"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-label={`Hồ sơ nhanh của ${user.name}`}
        className="fixed z-[80] w-[308px] animate-modal-pop"
        style={{ left: pos.left, top: pos.top }}
      >
        <div className="rounded-2xl overflow-hidden bg-[#111214] border border-white/15 shadow-[0_20px_50px_-18px_rgba(0,0,0,0.9)]">
          {/* Animated gradient banner */}
          <div className="h-24 ff-aurora-surface" style={{ background: 'linear-gradient(120deg, rgba(21,24,32,1), rgba(21,24,32,0.6))' }}>
            <button
              type="button"
              onClick={onClose}
              className="absolute top-2 right-2 p-1 rounded-lg bg-black/40 text-white/60 hover:text-white cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Avatar overlapping banner edge */}
          <div className="relative px-5">
            <div className="-mt-10 w-[84px] h-[84px]">
              <div className="ff-gradient-ring w-full h-full">
                <img
                  src={user.avatar}
                  alt={user.name}
                  onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                  className="w-full h-full rounded-full object-cover border-4 border-[#111214]"
                />
              </div>
              {/* Presence dot */}
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 border-4 border-[#111214] shadow-[0_0_8px_#34d399]" />
            </div>
          </div>

          <div className="px-5 pb-5 pt-2.5">
            {/* Name row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className={`text-base font-extrabold truncate ${isSuperAdmin ? 'discord-admin-name' : 'text-white'}`}>
                  {user.name}
                </h3>
                {isSuperAdmin && <AdminVerifiedBadge size={14} tooltipPosition="bottom" />}
              </div>
              <TierBadge level={user.level} size={20} showTooltip={false} />
            </div>

            {/* Sub info (no private data) */}
            <p className="text-[11.5px] text-neutral-400 mt-0.5 truncate">
              {[user.className, user.city].filter((v) => v && v !== 'Chưa cập nhật' && v !== 'Học sinh').join(' • ') ||
                `Level ${user.level} • ${tier.name}`}
            </p>

            {/* Mini stats — real numbers only */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white/[0.05] border border-white/10 px-2 py-1.5 text-center">
                <div className="text-sm font-black text-white font-mono">{stats?.questions ?? 0}</div>
                <div className="text-[9px] uppercase tracking-wider text-neutral-400">Câu hỏi</div>
              </div>
              <div className="rounded-xl bg-white/[0.05] border border-white/10 px-2 py-1.5 text-center">
                <div className="text-sm font-black text-white font-mono">{stats?.solutions ?? 0}</div>
                <div className="text-[9px] uppercase tracking-wider text-neutral-400">Trả lời</div>
              </div>
              <div className="rounded-xl bg-white/[0.05] border border-white/10 px-2 py-1.5 text-center">
                <div className="text-sm font-black text-amber-300 font-mono">{stats?.best ?? 0}</div>
                <div className="text-[9px] uppercase tracking-wider text-neutral-400">Đáp án</div>
              </div>
            </div>

            {/* Role chips */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="text-[10px] px-2 py-1 rounded-lg font-semibold" style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)' }}>
                Danh hiệu {tier.roman}
              </span>
              <span className="text-[10px] px-2 py-1 rounded-lg font-semibold" style={{ color: '#22d3ee', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.35)' }}>
                {user.role === 'SUPER_ADMIN' ? 'Quản trị' : user.role === 'CLUB_LEADER' ? 'Chủ nhiệm CLB' : 'Học sinh'}
              </span>
              {joinedLabel && (
                <span className="text-[10px] px-2 py-1 rounded-lg font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-400/30">
                  Tham gia {joinedLabel}
                </span>
              )}
            </div>

            {/* Actions */}
            <button
              type="button"
              onClick={() => onOpenFullProfile(user)}
              className="w-full mt-4 py-2.5 rounded-xl border-none cursor-pointer font-bold text-[13px] text-neutral-950 ff-aurora-bar shadow-[0_8px_20px_-8px_rgba(245,158,11,0.7)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
            >
              <span>Xem hồ sơ</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {!isOwn && onMessage && (
              <button
                type="button"
                onClick={onMessage}
                className="w-full mt-2 py-2 rounded-xl cursor-pointer font-semibold text-xs text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-colors flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                <span>Nhắn tin</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UserQuickCard;
