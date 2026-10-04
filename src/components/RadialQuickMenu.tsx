/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useId, useRef, useState } from 'react';
import { HelpCircle, Headphones, Flame, Settings, Zap } from 'lucide-react';
import type { DimensionView } from '../types';
import { safeStorage } from '../utils/storage';

export interface RadialQuickMenuProps {
  onNavigate: (view: DimensionView) => void;
  onToggleChat?: () => void;
  onOpenFocusMode: () => void;
  onOpenSettings?: () => void;
  onOpenStreak?: () => void;
  hidden?: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  angle: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

/**
 * CodeFronts ccm-02 — Radial Submenu (Pure CSS sin()/cos() fan-out).
 * Positioned at the bottom-left corner right below the Streak widget,
 * scaled +10% (53px hub, 44px satellite items) fanning into the top-right quadrant.
 */
export const RadialQuickMenu: React.FC<RadialQuickMenuProps> = ({
  onNavigate,
  onOpenFocusMode,
  onOpenSettings,
  onOpenStreak,
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

  /* Fan into the upper-right quadrant (-90deg straight up to 0deg right) */
  const actions: QuickAction[] = [
    {
      id: 'streak',
      label: 'Streak',
      angle: '-86deg',
      icon: <Flame className="w-[18px] h-[18px] text-rose-400" />,
      onSelect: () => {
        if (onOpenStreak) {
          onOpenStreak();
        } else if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('fforum_open_daily'));
        }
      },
    },
    {
      id: 'qa',
      label: 'Hỏi bài',
      angle: '-56deg',
      icon: <HelpCircle className="w-[18px] h-[18px] text-cyan-300" />,
      onSelect: () => onNavigate('qa'),
    },
    {
      id: 'focus',
      label: 'Tập trung',
      angle: '-28deg',
      icon: <Headphones className="w-[18px] h-[18px] text-emerald-300" />,
      onSelect: onOpenFocusMode,
    },
    {
      id: 'settings',
      label: 'Cài đặt',
      angle: '2deg',
      icon: <Settings className="w-[18px] h-[18px] text-amber-300" />,
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
      className={`ccm-02 hidden md:block fixed ${posClass} z-40 select-none`}
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
          className="ccm-02__item group absolute inset-0 m-auto w-11 h-11 rounded-full bg-[#131926]/95 border border-white/15 text-slate-200 flex items-center justify-center shadow-[0_10px_28px_rgba(0,0,0,0.65)] hover:border-cyan-400/50 hover:text-cyan-300 cursor-pointer"
          aria-label={action.label}
          title={action.label}
        >
          {action.icon}
          <span className="ccm-02__tip">{action.label}</span>
        </button>
      ))}

      <label
        htmlFor={toggleId}
        className="ccm-02__hub relative z-10 w-[53px] h-[53px] rounded-full bg-gradient-to-br from-[#1b2234] to-[#111726] border border-white/15 text-amber-300 flex items-center justify-center cursor-pointer shadow-[0_14px_34px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.14)] hover:border-amber-400/45 transition-colors"
        title="Tác vụ nhanh"
      >
        <Zap className="w-5 h-5 transition-transform duration-300" />
      </label>
    </div>
  );
};

export default RadialQuickMenu;
