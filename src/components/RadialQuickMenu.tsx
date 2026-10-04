/* Bản quyền trí tuệ thuộc về BroAmStuck
 * Radial quick menu — phỏng theo CodeFronts ccm-02 (radial submenu, pure CSS sin()/cos()). */
import React from 'react';
import { Zap, Settings, MessageCircleQuestion, Flower2, Flame } from 'lucide-react';

interface RadialQuickMenuProps {
  onNavigate: (view: string) => void;
  onOpenSettings: () => void;
  onOpenStreak: () => void;
  onOpenFocus: () => void;
  /** Screen side the hub sits on — the fan always opens toward the screen interior. */
  side?: 'left' | 'right';
}

/** Hub nằm ngay dưới nút Streak; bấm vào sẽ xoè 4 nút theo hình quạt dùng sin()/cos() thuần CSS. */
export const RadialQuickMenu: React.FC<RadialQuickMenuProps> = ({
  onNavigate,
  onOpenSettings,
  onOpenStreak,
  onOpenFocus,
  side = 'left',
}) => {
  const base = side === 'left' ? [-90, -60, -30, 0] : [-90, -120, -150, -180];
  const items: {
    key: string;
    label: string;
    icon: React.ReactNode;
    tone: string;
    onClick: () => void;
  }[] = [
    {
      key: 'settings',
      label: 'Cài đặt',
      icon: <Settings className="w-[18px] h-[18px]" />,
      tone: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 hover:shadow-[0_0_18px_rgba(34,211,238,0.45)]',
      onClick: onOpenSettings,
    },
    {
      key: 'ask',
      label: 'Hỏi bài',
      icon: <MessageCircleQuestion className="w-[18px] h-[18px]" />,
      tone: 'bg-amber-500/20 text-amber-300 border-amber-400/40 hover:shadow-[0_0_18px_rgba(245,158,11,0.45)]',
      onClick: () => onNavigate('qa'),
    },
    {
      key: 'focus',
      label: 'Tập trung',
      icon: <Flower2 className="w-[18px] h-[18px]" />,
      tone: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 hover:shadow-[0_0_18px_rgba(52,211,153,0.45)]',
      onClick: onOpenFocus,
    },
    {
      key: 'streak',
      label: 'Streak',
      icon: <Flame className="w-[18px] h-[18px]" />,
      tone: 'bg-orange-500/20 text-orange-300 border-orange-400/40 hover:shadow-[0_0_18px_rgba(251,146,60,0.5)]',
      onClick: onOpenStreak,
    },
  ];

  const close = () => {
    const el = document.getElementById('ccm-02-toggle') as HTMLInputElement | null;
    if (el) el.checked = false;
  };

  return (
    <div className={`ccm-02 ccm-02--${side} relative hidden md:block select-none`} aria-label="Thao tác nhanh">
      <input
        id="ccm-02-toggle"
        type="checkbox"
        className="ccm-02__toggle peer sr-only"
        aria-label="Mở menu thao tác nhanh"
      />

      {items.map((it, i) => (
        <button
          key={it.key}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            close();
            it.onClick();
          }}
          title={it.label}
          aria-label={it.label}
          style={{ '--a': `${base[i]}deg`, '--i': i } as React.CSSProperties}
          className={`ccm-02__item absolute left-1/2 top-1/2 w-11 h-11 -ml-[22px] -mt-[22px] rounded-full border backdrop-blur-md flex items-center justify-center cursor-pointer ${it.tone}`}
        >
          {it.icon}
          <span className="ccm-02__tip">{it.label}</span>
        </button>
      ))}

      <label
        htmlFor="ccm-02-toggle"
        className="ccm-02__hub relative w-[53px] h-[53px] rounded-full liquid-glass ff-depth-ring border border-amber-400/40 flex items-center justify-center cursor-pointer text-amber-300 shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-transform duration-300 hover:scale-105"
        title="Thao tác nhanh"
      >
        <Zap className="w-[22px] h-[22px] transition-transform duration-300" />
        <span className="absolute inset-0 rounded-full animate-ping bg-amber-400/10 pointer-events-none" aria-hidden="true" />
      </label>
    </div>
  );
};

export default RadialQuickMenu;
