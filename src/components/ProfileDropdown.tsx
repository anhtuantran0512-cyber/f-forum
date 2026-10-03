/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import { ChevronRight, CreditCard, LogOut, Settings, UserRound, X } from 'lucide-react';
import type { User } from '../types';
import { TierBadge } from './Badges10Tier';
import { getTierForLevel } from '../utils/tier';
import { getXPForLevel } from '../store/forumStore';
import { DEFAULT_AVATAR, handleImageError } from '../utils/mediaFallback';

export interface ProfileDropdownProps {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: (tab?: 'overview' | 'card' | 'stats' | 'shop' | 'activity' | 'edit') => void;
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
  if (!isOpen) return null;
  const tier = getTierForLevel(currentUser.level);
  const currentLevelXP = getXPForLevel(currentUser.level);
  const nextLevelXP = getXPForLevel(Math.min(150, currentUser.level + 1));
  const progress = currentUser.level >= 150
    ? 100
    : Math.min(100, Math.max(0, Math.round(((currentUser.xp - currentLevelXP) / Math.max(1, nextLevelXP - currentLevelXP)) * 100)));
  const openProfile = (tab: 'overview' | 'card' | 'stats' | 'shop' | 'activity' | 'edit') => {
    onClose();
    onOpenProfile(tab);
  };

  return (
    <div
      role="menu"
      aria-label="Menu tài khoản"
      className={`absolute z-50 w-[300px] rounded-2xl border border-white/10 bg-[#0c1218]/95 p-3.5 text-left shadow-2xl backdrop-blur-2xl ${
        dockPosition === 'bottom'
          ? 'bottom-[calc(100%+12px)] right-0 origin-bottom-right'
          : dockPosition === 'left'
            ? 'left-[calc(100%+12px)] top-1/2 -translate-y-1/2 origin-left'
            : dockPosition === 'right'
              ? 'right-[calc(100%+12px)] top-1/2 -translate-y-1/2 origin-right'
              : 'top-[calc(100%+12px)] right-0 origin-top-right'
      }`}
    >
      <div className="flex items-start gap-3">
        <img
          src={currentUser.avatar || DEFAULT_AVATAR}
          alt=""
          onError={(event) => handleImageError(event, DEFAULT_AVATAR)}
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-xl border border-white/10 object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-white">{currentUser.name}</span>
            <TierBadge level={currentUser.level} size={17} showTooltip={false} />
          </div>
          <p className="mt-0.5 truncate text-[11px] text-white/45">Cấp {currentUser.level} · {tier.name}</p>
          <p className="mt-1 truncate font-mono text-[10px] text-white/35">{currentUser.email}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Đóng menu" className="rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-white"><X size={14} /></button>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-white/50">
        <span>Tiến độ cấp</span>
        <span>{currentUser.level >= 150 ? 'Tối đa' : `${progress}%`}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-300 transition-[width]" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-white/40">XP</span>
        <span className="font-mono text-teal-100">{currentUser.xp.toLocaleString()} / {nextLevelXP.toLocaleString()}</span>
      </div>

      <button type="button" onClick={() => openProfile('overview')} className="mt-4 flex w-full items-center justify-between rounded-xl border border-teal-200/15 bg-teal-300/[0.06] px-3 py-2.5 text-xs font-semibold text-teal-100 transition hover:bg-teal-300/10">
        <span className="inline-flex items-center gap-2"><UserRound size={15} /> Cá nhân</span>
        <ChevronRight size={15} className="text-teal-100/55" />
      </button>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => openProfile('card')} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-xs text-white/65 transition hover:bg-white/[0.07] hover:text-white"><CreditCard size={14} /> Thẻ</button>
        <button type="button" onClick={() => openProfile('edit')} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-xs text-white/65 transition hover:bg-white/[0.07] hover:text-white"><Settings size={14} /> Chỉnh sửa</button>
      </div>

      <button type="button" onClick={() => { onClose(); onLogout(); }} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200/10 bg-rose-200/[0.04] px-3 py-2 text-xs font-semibold text-rose-100/75 transition hover:bg-rose-200/10 hover:text-rose-100"><LogOut size={14} /> Đăng xuất</button>
    </div>
  );
};

export default ProfileDropdown;
