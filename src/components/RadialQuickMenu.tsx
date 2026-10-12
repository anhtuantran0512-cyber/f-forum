/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useId, useRef, useState } from 'react';
import { Headphones, Flame, Settings, Zap, Command, ChartNoAxesCombined } from 'lucide-react';
import { safeStorage } from '../utils/storage';

export interface RadialQuickMenuProps {
  onOpenFocusMode: () => void;
  onOpenSettings?: () => void;
  onOpenStreak?: () => void;
  onOpenPalette?: () => void;
  /** Lối vào bảng thống kê/quản lý, chỉ được truyền cho nhân sự quản trị. */
  onOpenAdminPanel?: () => void;
  adminAccess?: boolean;
  pendingReportCount?: number;
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
 * bán kính so le giúp các tác vụ xếp thành vòng cung thoáng, không chồng nhau.
 * Ngọn lửa Streak đã được đưa VÀO trong menu này (không còn nổi bên ngoài).
 */
export const RadialQuickMenu: React.FC<RadialQuickMenuProps> = ({
  onOpenFocusMode,
  onOpenSettings,
  onOpenStreak,
  onOpenPalette,
  onOpenAdminPanel,
  adminAccess = false,
  pendingReportCount = 0,
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
      if (e.key === 'Escape') {
        close();
        return;
      }
      if (e.altKey && (e.key === 'z' || e.key === 'Z') && inputRef.current) {
        e.preventDefault();
        inputRef.current.checked = !inputRef.current.checked;
      }
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (hidden) return null;

  /* Quạt 4/5 tác vụ vào góc phần tư trên-phải, không nhân đôi lối vào admin. */
  const actions: QuickAction[] = [
    {
      id: 'streak',
      label: streakCount > 0 ? `Điểm danh · ${streakCount} ngày` : 'Điểm danh & kho quà',
      angle: '-90deg',
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
      angle: '-66deg',
      tier: 'far',
      icon: <Headphones className="w-[21px] h-[21px] text-emerald-300" />,
      onSelect: onOpenFocusMode,
    },
    /* Thống kê & Quản trị (bao gồm Tố cáo + Điều khiển bên trong) */
    ...(adminAccess && onOpenAdminPanel ? [{
      id: 'admin',
      label: 'Bảng thống kê quản trị',
      angle: '-38deg',
      tier: 'far' as const,
      icon: <ChartNoAxesCombined className="w-[21px] h-[21px] text-cyan-300" />,
      extraClass: 'ccm-02__item--admin',
      badge: pendingReportCount > 0 ? (
        <span className="ccm-02__badge">{pendingReportCount > 99 ? '99+' : pendingReportCount}</span>
      ) : undefined,
      onSelect: onOpenAdminPanel,
    }] : []),
    {
      id: 'palette',
      label: 'Bảng lệnh (Ctrl + K)',
      angle: '-18deg',
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
      className={`ccm-02 block fixed ${posClass} z-40 select-none`}
      data-count={actions.length}
      aria-label="Menu tác vụ nhanh"
    >
      <input
        ref={inputRef}
        id={toggleId}
        type="checkbox"
        className="ccm-02__toggle sr-only"
        aria-label="Mở menu tác vụ nhanh"
      />

      {actions.map((action, idx) => {
        /* Tự thích nghi theo số lượng nút thực tế (4 nút cho user thường, 5 nút cho Admin):
           chia đều cung 90° (-90° → 0°) và xen kẽ bán kính far/near để:
           1) Không bao giờ để trống hốc ở giữa khi ẩn Bảng thống kê quản trị,
           2) Nút Streak lửa (idx = 0) luôn vươn lên tầng 'far' (-90°, r=164px), cao hơn hẳn
              nút kế bên nên không bao giờ bị nút khác hay icon tia sét che khuất. */
        const spanDeg = 90;
        const stepDeg = actions.length > 1 ? spanDeg / (actions.length - 1) : 0;
        const adaptiveAngle = `${(-90 + idx * stepDeg).toFixed(2)}deg`;
        const adaptiveTier: 'near' | 'far' =
          action.id === 'admin'
            ? ('far' as const)
            : idx % 2 === 0
            ? 'far'
            : 'near';

        return (
          <button
            key={action.id}
            type="button"
            data-tier={adaptiveTier}
            style={
              {
                '--i': idx,
                '--a': adaptiveAngle,
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
        );
      })}

      <label
        htmlFor={toggleId}
        className="ccm-02__hub relative z-10 w-16 h-16 rounded-full border border-white/15 text-amber-300 flex items-center justify-center cursor-pointer transition-all duration-300"
        title="Tác vụ nhanh (Zap)"
      >
        <Zap className="w-6 h-6 transition-transform duration-300" />
        <span
          className="ccm-02__hub-streak pointer-events-none"
          aria-hidden="true"
        >
          <Flame className="w-3.5 h-3.5 text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
          {streakCount > 0 && <span>{streakCount > 99 ? '99+' : streakCount}</span>}
        </span>
      </label>
    </div>
  );
};

export default RadialQuickMenu;
