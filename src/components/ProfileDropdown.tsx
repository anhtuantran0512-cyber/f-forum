import React, { useRef, useEffect } from 'react';
import { CreditCard, UserPen, Award, LogOut } from 'lucide-react';
import type { User } from '../types';
import { TierBadge, AdminVerifiedBadge } from './Badges10Tier';
import { getTierForLevel } from '../utils/tier';
import { getXPForLevel } from '../store/forumStore';
import { DEFAULT_AVATAR, handleImageError } from '../utils/mediaFallback';

export interface ProfileDropdownProps {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: (tab?: 'card' | 'edit') => void;
  onLogout: () => void;
  dockPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  currentUser,
  isOpen,
  onClose,
  onOpenProfile,
  onLogout,
  dockPosition = 'top',
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isSuperAdmin = currentUser.email === 'anhtuantran0512@gmail.com';
  const tier = getTierForLevel(currentUser.level);

  // Compute accurate XP progress
  const currentLevelBaseXP = getXPForLevel(currentUser.level);
  const nextLevelBaseXP = getXPForLevel(Math.min(150, currentUser.level + 1));
  const range = Math.max(1, nextLevelBaseXP - currentLevelBaseXP);
  const progress =
    currentUser.level >= 150
      ? 100
      : Math.min(100, Math.max(0, Math.round(((currentUser.xp - currentLevelBaseXP) / range) * 100)));

  return (
    <div
      ref={dropdownRef}
      role="menu"
      aria-label="Menu tài khoản"
      className={`absolute z-50 w-[320px] bg-[#0c1218]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-fade-up select-none pointer-events-auto transition-all ${
        dockPosition === 'bottom'
          ? 'bottom-[calc(100%+14px)] top-auto right-0 origin-bottom-right'
          : dockPosition === 'left'
          ? 'left-[calc(100%+16px)] bottom-0 top-auto origin-bottom-left'
          : dockPosition === 'right'
          ? 'right-[calc(100%+16px)] bottom-0 top-auto origin-bottom-right'
          : 'top-[calc(100%+12px)] right-0 origin-top-right'
      }`}
    >
      {/* Top Section (Current Real User) */}
      <div className="flex flex-col">
        {/* Avatar + Info */}
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
              loading="lazy"
              decoding="async"
              width={44}
              height={44}
              className="w-11 h-11 rounded-xl object-cover ring-2 ring-amber-400/50 shadow-md"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0c1218] shadow-[0_0_6px_#34d399]" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-sm font-semibold truncate ${
                  isSuperAdmin ? 'discord-admin-name' : 'text-white'
                }`}
                title={currentUser.name}
              >
                {currentUser.name}
              </span>
              {isSuperAdmin && (
                <AdminVerifiedBadge size={14} tooltipPosition="bottom" />
              )}
            </div>

            <p className="text-[11px] text-white/50 truncate mt-0.5 font-mono">
              {currentUser.email}
            </p>
          </div>
        </div>

        {/* Rank & Level Badge */}
        <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10">
          <div className="flex items-center gap-2">
            <TierBadge level={currentUser.level} size={20} showTooltip={false} />
            <div className="flex flex-col">
              <span className="text-xs font-mono font-bold text-amber-300">
                {`Danh hiệu: ${tier.name} • Level ${currentUser.level}`}
              </span>
              <span className="text-[10px] text-white/40 font-mono">
                {tier.name}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/25 font-semibold flex items-center gap-1">
            <Award className="w-3 h-3 text-amber-400" />
            {currentUser.role === 'SUPER_ADMIN'
              ? 'ADMIN'
              : currentUser.role === 'CLUB_LEADER'
              ? 'LEADER'
              : 'STUDENT'}
          </span>
        </div>

        {/* Mini Coin Progress Bar */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-white/60">Coin tích lũy</span>
            <span className="text-amber-300 font-semibold">
              {currentUser.level >= 150
                ? `${currentUser.xp.toLocaleString()} / MAX`
                : `${currentUser.xp.toLocaleString()} / ${nextLevelBaseXP.toLocaleString()} Coin`}
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 rounded-full transition-all duration-500 relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>

        {/* Action Buttons: F-Pass Card & Profile Edit */}
        <div className="mt-3.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenProfile('card');
            }}
            className="py-1.5 px-2.5 rounded-xl text-xs font-semibold text-white/90 hover:text-amber-300 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/30 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
            <span>Thẻ F-Pass</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenProfile('edit');
            }}
            className="py-1.5 px-2.5 rounded-xl text-xs font-semibold text-white/90 hover:text-amber-300 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/30 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <UserPen className="w-3.5 h-3.5 text-amber-400" />
            <span>Cài đặt hồ sơ</span>
          </button>
        </div>

        {/* Divider */}
        <div className="h-[1px] w-full bg-white/10 my-3" />

        {/* Clean Logout Button */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onLogout();
          }}
          className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-red-300 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <LogOut className="w-3.5 h-3.5 text-red-400" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
};

export default ProfileDropdown;
