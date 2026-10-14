/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useId, useRef, useState } from 'react';
import { Headphones, Flame, Users, Zap, Command, ChartNoAxesCombined } from 'lucide-react';
import { safeStorage } from '../utils/storage';

export interface RadialQuickMenuProps {
  onOpenFocusMode: () => void;
  onOpenClubs?: () => void;
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

const ZAP_POS_STORAGE_KEY = 'fforum_zap_pos_v1';
const HUB_SIZE_PX = 64;
const EDGE_MARGIN_PX = 12;

const clampZapPosition = (x: number, y: number): { x: number; y: number } => {
  if (typeof window === 'undefined') return { x, y };
  const maxX = Math.max(EDGE_MARGIN_PX, window.innerWidth - HUB_SIZE_PX - EDGE_MARGIN_PX);
  const maxY = Math.max(EDGE_MARGIN_PX, window.innerHeight - HUB_SIZE_PX - EDGE_MARGIN_PX);
  return {
    x: Math.min(maxX, Math.max(EDGE_MARGIN_PX, Math.round(x))),
    y: Math.min(maxY, Math.max(EDGE_MARGIN_PX, Math.round(y))),
  };
};

/**
 * CodeFronts ccm-02 v2 — Radial Submenu (pure CSS sin()/cos()).
 * Neo bên trái dưới màn hình (hoặc kéo thả tự do bằng chuột/cảm ứng tới bất kỳ đâu),
 * kích thước hub 64px & item 53px (+20% so với bản 53/44px),
 * bán kính so le giúp các tác vụ xếp thành vòng cung thoáng, không chồng nhau.
 * Ngọn lửa Streak đã được đưa VÀO trong menu này (không còn nổi bên ngoài).
 */
export const RadialQuickMenu: React.FC<RadialQuickMenuProps> = ({
  onOpenFocusMode,
  onOpenClubs,
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
  const didDragRef = useRef(false);
  const dragStateRef = useRef<{
    active: boolean;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const [navPos, setNavPos] = useState<'top' | 'bottom' | 'left' | 'right'>(() => {
    return (safeStorage.getItem('fforum_navbar_pos') as 'top' | 'bottom' | 'left' | 'right') || 'top';
  });
  const [customPos, setCustomPos] = useState<{ x: number; y: number } | null>(() => {
    try {
      const raw = safeStorage.getItem(ZAP_POS_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { x?: unknown; y?: unknown };
      if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
        return clampZapPosition(parsed.x, parsed.y);
      }
      return null;
    } catch {
      return null;
    }
  });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const onPosChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as 'top' | 'bottom' | 'left' | 'right' | undefined;
      setNavPos(detail || ((safeStorage.getItem('fforum_navbar_pos') as 'top' | 'bottom' | 'left' | 'right') || 'top'));
    };
    window.addEventListener('fforum_navbar_pos_change', onPosChange);
    return () => window.removeEventListener('fforum_navbar_pos_change', onPosChange);
  }, []);

  useEffect(() => {
    if (!customPos || typeof window === 'undefined') return;
    const onResize = () => {
      setCustomPos((prev) => (prev ? clampZapPosition(prev.x, prev.y) : null));
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, [customPos]);

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

  useEffect(() => {
    const onMove = (clientX: number, clientY: number) => {
      const st = dragStateRef.current;
      if (!st || !st.active) return;
      const dx = clientX - st.startClientX;
      const dy = clientY - st.startClientY;
      if (!didDragRef.current && Math.hypot(dx, dy) < 5) return;
      if (!didDragRef.current) {
        didDragRef.current = true;
        setIsDragging(true);
      }
      const next = clampZapPosition(st.originX + dx, st.originY + dy);
      setCustomPos(next);
    };

    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onEnd = () => {
      const st = dragStateRef.current;
      if (!st || !st.active) return;
      st.active = false;
      dragStateRef.current = null;
      setIsDragging(false);
      if (didDragRef.current) {
        setCustomPos((latest) => {
          if (latest) {
            safeStorage.setItem(ZAP_POS_STORAGE_KEY, JSON.stringify(latest));
          }
          return latest;
        });
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  const beginDrag = (clientX: number, clientY: number) => {
    const el = rootRef.current;
    const rect = el ? el.getBoundingClientRect() : null;
    const originX = customPos?.x ?? (rect ? rect.left : 20);
    const originY = customPos?.y ?? (rect ? rect.top : (typeof window !== 'undefined' ? window.innerHeight - 84 : 500));
    didDragRef.current = false;
    dragStateRef.current = {
      active: true,
      startClientX: clientX,
      startClientY: clientY,
      originX,
      originY,
    };
  };

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
      icon: <ChartNoAxesCombined className="w-[21px] h-[21px] text-[#81b29a]" />,
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
      id: 'clubs',
      label: 'Câu Lạc Bộ',
      angle: '0deg',
      tier: 'far',
      icon: <Users className="w-[21px] h-[21px] text-[#81b29a]" />,
      onSelect: () => {
        if (onOpenClubs) {
          onOpenClubs();
        } else if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('fforum_open_clubs'));
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

  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const openRight = !customPos || customPos.x <= viewportW / 2;
  const openUp = !customPos || customPos.y >= 210;
  const startDeg = openUp ? -90 : 90;
  const endDeg = openRight ? 0 : openUp ? -180 : 180;

  return (
    <div
      ref={rootRef}
      className={`ccm-02 block fixed ${customPos ? '' : posClass} ${isDragging ? 'ccm-02--dragging' : ''} z-40 select-none`}
      style={customPos ? { left: `${customPos.x}px`, top: `${customPos.y}px` } : undefined}
      data-count={actions.length}
      data-side={openRight ? 'left' : 'right'}
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
        /* Tự thích nghi theo số lượng nút thực tế (4 nút cho user thường, 5 nút cho Admin)
           VÀ theo góc màn hình khi người dùng kéo thả nút Tia Sét tới vị trí bất kỳ. */
        const spanDeg = endDeg - startDeg;
        const stepDeg = actions.length > 1 ? spanDeg / (actions.length - 1) : 0;
        const deg = startDeg + idx * stepDeg;
        const adaptiveAngle = `${deg.toFixed(2)}deg`;
        const adaptiveTier: 'near' | 'far' =
          action.id === 'admin'
            ? ('far' as const)
            : idx % 2 === 0
            ? 'far'
            : 'near';
        const radiusPx = adaptiveTier === 'far' ? 164 : 132;
        const rad = (deg * Math.PI) / 180;
        const txPx = `${Math.round(Math.cos(rad) * radiusPx)}px`;
        const tyPx = `${Math.round(Math.sin(rad) * radiusPx)}px`;

        return (
          <button
            key={action.id}
            type="button"
            data-tier={adaptiveTier}
            style={
              {
                '--i': idx,
                '--a': adaptiveAngle,
                '--tx': txPx,
                '--ty': tyPx,
              } as React.CSSProperties
            }
            onClick={() => {
              close();
              action.onSelect();
            }}
            className={`ccm-02__item group absolute inset-0 m-auto w-[53px] h-[53px] rounded-full bg-[#151a26]/95 border border-[#f4f1de]/25 text-[#f4f1de] flex items-center justify-center shadow-[0_14px_34px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.1)] hover:border-[#f2cc8f] hover:text-[#f2cc8f] cursor-pointer ${action.extraClass ?? ''}`}
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
        onMouseDown={(e) => {
          if (e.button === 0) beginDrag(e.clientX, e.clientY);
        }}
        onTouchStart={(e) => {
          if (e.touches.length > 0) beginDrag(e.touches[0].clientX, e.touches[0].clientY);
        }}
        onClick={(e) => {
          if (didDragRef.current) {
            e.preventDefault();
            e.stopPropagation();
            didDragRef.current = false;
          }
        }}
        onDoubleClick={() => {
          setCustomPos(null);
          safeStorage.removeItem(ZAP_POS_STORAGE_KEY);
        }}
        className={`ccm-02__hub relative z-10 w-16 h-16 rounded-full border border-white/15 text-amber-300 flex items-center justify-center ${isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab'} transition-all duration-300`}
        title="Tác vụ nhanh (Giữ chuột để kéo di chuyển · Nháy đúp để về góc mặc định)"
      >
        <Zap className="w-6 h-6 transition-transform duration-300 pointer-events-none" />
      </label>
    </div>
  );
};

export default RadialQuickMenu;
