/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useId, useRef, useState } from 'react';
import { HelpCircle, Headphones, Flame, Settings, Zap, NotebookPen, Command, ShieldCheck } from 'lucide-react';
import type { DimensionView } from '../types';
import { safeStorage } from '../utils/storage';

export interface RadialQuickMenuProps {
  onNavigate: (view: DimensionView) => void;
  onToggleChat?: () => void;
  onOpenFocusMode: () => void;
  onOpenSettings?: () => void;
  onOpenStreak?: () => void;
  onOpenNotes?: () => void;
  onOpenPalette?: () => void;
  /** Lối vào bảng thống kê/quản lý, chỉ được truyền cho nhân sự quản trị. */
  onOpenAdminPanel?: () => void;
  adminAccess?: boolean;
  streakCount?: number;
  hidden?: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  angle: string;
  tier: 'near' | 'far';
  icon: React.ReactNode;
  extraClass?: string;
  badge?: React.ReactNode;
  onSelect: () => void;
}

/**
 * CodeFronts ccm-02 v2 — Radial Submenu (pure CSS sin()/cos()).
 * Neo bên trái dưới màn hình, kích thước hub 64px & item 53px (+20% so với bản 53/44px),
 * bán kính so le 136/170px giúp 6 tác vụ xếp thành vòng cung thoáng, không chồng nhau.
 * Ngọn lửa Streak đã được đưa VÀO trong menu này (không còn nổi bên ngoài).
 */
export const RadialQuickMenu: React.FC<RadialQuickMenuProps> = ({
  onNavigate,
  onOpenFocusMode,
  onOpenSettings,
  onOpenStreak,
  onOpenNotes,
  onOpenPalette,
  onOpenAdminPanel,
  adminAccess = false,
  streakCount = 0,
  hidden = false,
}) => {
  const toggleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [navPos, setNavPos] = useState<'top' | 'bottom' | 'left' | 'right'>(() => {
    return (safeStorage.getItem('fforum_navbar_pos') as 'top' | 'bottom' | 'left' | 'right') || 'top';
  });

  useEffect(() => {
    const onPosChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as 'top' | 'bottom' | 'left' | 'right' | undefined;
      setNavPos(detail || ((safeStorage.getItem('fforum_navbar_pos') as 'top' | 'bottom' | 'left' | 'right') || 'top'));
    };
    window.addEventListener('fforum_navbar_pos_change', onPosChange);
    return () => window.removeEventListener('fforum_navbar_pos_change', onPosChange);
  }, []);

  const close = () => {
    if (inputRef.current) inputRef.current.checked = false;
  };

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!inputRef.current?.checked) return;
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (hidden) return null;

  /* Quạt 6 tác vụ vào góc phần tư trên-phải: -90° (thẳng đứng) → 0° (ngang phải) */
  const actions: QuickAction[] = [
    ...(adminAccess && onOpenAdminPanel ? [{
      id: 'admin',
      label: 'Bảng quản trị · thống kê, thành viên & vai trò',
      angle: '-96deg',
      tier: 'near' as const,
      icon: <ShieldCheck className="w-[21px] h-[21px] text-cyan-300" />,
      extraClass: 'ccm-02__item--admin',
      onSelect: onOpenAdminPanel,
    }] : []),
    {
      id: 'streak',
      label: streakCount > 0 ? `Điểm danh · ${streakCount} ngày` : 'Điểm danh & kho quà',
      angle: adminAccess ? '-80deg' : '-90deg',
      tier: 'near',
      icon: <Flame className="w-[21px] h-[21px] text-rose-400" />,
      extraClass: 'ccm-02__item--hot ff-streak-red-aura',
      badge: streakCount > 0 ? <span className="ccm-02__badge">{streakCount > 99 ? '99+' : streakCount}</span> : undefined,
      onSelect: () => {
        if (onOpenStreak) {
          onOpenStreak();
        } else if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('fforum_open_daily'));
        }
      },
    },
    {
      id: 'focus',
      label: 'Vào không gian tập trung',
      angle: adminAccess ? '-64deg' : '-72deg',
      tier: 'far',
      icon: <Headphones className="w-[21px] h-[21px] text-emerald-300" />,
      onSelect: onOpenFocusMode,
    },
    {
      id: 'qa',
      label: 'Hỏi bài',
      angle: adminAccess ? '-48deg' : '-54deg',
      tier: 'near',
      icon: <HelpCircle className="w-[21px] h-[21px] text-cyan-300" />,
      onSelect: () => onNavigate('qa'),
    },
    {
      id: 'notes',
      label: 'Sổ tay nhanh (Ctrl + I)',
      angle: adminAccess ? '-32deg' : '-36deg',
      tier: 'far',
      icon: <NotebookPen className="w-[21px] h-[21px] text-sky-300" />,
      onSelect: () => {
        if (onOpenNotes) {
          onOpenNotes();
        } else if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('fforum_open_notes'));
        }
      },
    },
    {
      id: 'palette',
      label: 'Bảng lệnh (Ctrl + K)',
      angle: adminAccess ? '-16deg' : '-18deg',
      tier: 'near',
      icon: <Command className="w-[21px] h-[21px] text-violet-300" />,
      onSelect: () => {
        if (onOpenPalette) {
          onOpenPalette();
        } else if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('fforum_open_palette'));
        }
      },
    },
    {
      id: 'settings',
      label: 'Cài đặt',
      angle: '0deg',
      tier: 'far',
      icon: <Settings className="w-[21px] h-[21px] text-amber-300" />,
      onSelect: () => {
        if (onOpenSettings) {
          onOpenSettings();
        } else if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('fforum_open_settings'));
        }
      },
    },
  ];

  const posClass =
    navPos === 'bottom'
      ? 'bottom-24 left-4 md:bottom-24 md:left-5'
      : navPos === 'left'
      ? 'bottom-4 left-24 md:bottom-5 md:left-24'
      : 'bottom-4 left-4 md:bottom-5 md:left-5';

  return (
    <div
      ref={rootRef}
      className={`ccm-02 ${adminAccess ? 'block' : 'hidden md:block'} fixed ${posClass} z-40 select-none`}
      aria-label="Menu tác vụ nhanh"
    >
      <input
        ref={inputRef}
        id={toggleId}
        type="checkbox"
        className="ccm-02__toggle sr-only"
        aria-label="Mở menu tác vụ nhanh"
      />

      {actions.map((action, idx) => (
        <button
          key={action.id}
          type="button"
          data-tier={action.tier}
          style={
            {
              '--i': idx,
              '--a': action.angle,
            } as React.CSSProperties
          }
          onClick={() => {
            close();
            action.onSelect();
          }}
          className={`ccm-02__item group absolute inset-0 m-auto w-[53px] h-[53px] rounded-full bg-[#131926]/95 border border-white/15 text-slate-200 flex items-center justify-center shadow-[0_14px_34px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.1)] hover:border-cyan-400/50 hover:text-cyan-300 cursor-pointer ${action.extraClass ?? ''}`}
          aria-label={action.label}
          title={action.label}
        >
          {action.icon}
          {action.badge}
          <span className="ccm-02__tip">{action.label}</span>
        </button>
      ))}

      <label
        htmlFor={toggleId}
        className="ccm-02__hub relative z-10 w-16 h-16 rounded-full border border-white/15 text-amber-300 flex items-center justify-center cursor-pointer transition-all duration-300"
        title="Tác vụ nhanh (Zap)"
      >
        <Zap className="w-6 h-6 transition-transform duration-300" />
      </label>
    </div>
  );
};

export default RadialQuickMenu;
