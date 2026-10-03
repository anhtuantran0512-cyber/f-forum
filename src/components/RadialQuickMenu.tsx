/* Bản quyền trí tuệ thuộc về BroAmStuck
 * Radial quick menu — phỏng theo CodeFronts ccm-02 (radial submenu, pure CSS sin()/cos()). */
import React from 'react';
import { Zap, MessagesSquare, MessageCircleQuestion, Flower2, Crown } from 'lucide-react';

interface RadialQuickMenuProps {
  onNavigate: (view: string) => void;
  onOpenChat: () => void;
  onOpenFocus: () => void;
}

/** Hub ở góc phải màn hình; bấm vào sẽ xoè 4 nút theo hình quạt dùng sin()/cos() thuần CSS. */
export const RadialQuickMenu: React.FC<RadialQuickMenuProps> = ({
  onNavigate,
  onOpenChat,
  onOpenFocus,
}) => {
  const items: {
    key: string;
    angle: number;
    label: string;
    icon: React.ReactNode;
    tone: string;
    onClick: () => void;
  }[] = [
    {
      key: 'chat',
      angle: -90,
      label: 'Trò chuyện',
      icon: <MessagesSquare className="w-4 h-4" />,
      tone: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 hover:shadow-[0_0_18px_rgba(34,211,238,0.45)]',
      onClick: onOpenChat,
    },
    {
      key: 'ask',
      angle: -120,
      label: 'Hỏi bài',
      icon: <MessageCircleQuestion className="w-4 h-4" />,
      tone: 'bg-amber-500/20 text-amber-300 border-amber-400/40 hover:shadow-[0_0_18px_rgba(245,158,11,0.45)]',
      onClick: () => onNavigate('qa'),
    },
    {
      key: 'focus',
      angle: -150,
      label: 'Tập trung',
      icon: <Flower2 className="w-4 h-4" />,
      tone: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 hover:shadow-[0_0_18px_rgba(52,211,153,0.45)]',
      onClick: onOpenFocus,
    },
    {
      key: 'honor',
      angle: -180,
      label: 'Vinh danh',
      icon: <Crown className="w-4 h-4" />,
      tone: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/40 hover:shadow-[0_0_18px_rgba(232,121,249,0.45)]',
      onClick: () => onNavigate('memory'),
    },
  ];

  return (
    <div className="ccm-02 fixed bottom-5 right-5 z-40 hidden md:block select-none" aria-label="Thao tác nhanh">
      <input
        id="ccm-02-toggle"
        type="checkbox"
        className="ccm-02__toggle peer sr-only"
        aria-label="Mở menu thao tác nhanh"
      />

      {/* Radial items — vị trí tính bằng cos()/sin() thuần CSS */}
      {items.map((it, i) => (
        <button
          key={it.key}
          type="button"
          onClick={() => {
            it.onClick();
            const el = document.getElementById('ccm-02-toggle') as HTMLInputElement | null;
            if (el) el.checked = false;
          }}
          title={it.label}
          aria-label={it.label}
          style={{ '--a': `${it.angle}deg`, '--i': i } as React.CSSProperties}
          className={`ccm-02__item absolute left-1/2 top-1/2 w-10 h-10 -ml-5 -mt-5 rounded-full border backdrop-blur-md flex items-center justify-center cursor-pointer transition-[transform,opacity,box-shadow] duration-300 ${it.tone}`}
        >
          {it.icon}
          <span className="ccm-02__tip">{it.label}</span>
        </button>
      ))}

      {/* Hub */}
      <label
        htmlFor="ccm-02-toggle"
        className="ccm-02__hub relative w-12 h-12 rounded-full liquid-glass border border-amber-400/40 flex items-center justify-center cursor-pointer text-amber-300 shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-transform duration-300 hover:scale-105"
        title="Thao tác nhanh"
      >
        <Zap className="w-5 h-5 transition-transform duration-300" />
        <span className="absolute inset-0 rounded-full animate-ping bg-amber-400/10 pointer-events-none" aria-hidden="true" />
      </label>
    </div>
  );
};

export default RadialQuickMenu;
