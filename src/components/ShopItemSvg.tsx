/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';

export const ShopItemSvg: React.FC<{ type: string; size?: number; className?: string }> = ({
  type,
  size = 40,
  className = '',
}) => {
  switch (type) {
    case 'pencil':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#064e3b" fillOpacity="0.6" stroke="#10b981" strokeWidth="1.5" />
          <path d="M14 34 L18 35 L34 19 L30 15 L14 31 Z" fill="#34d399" stroke="#a7f3d0" strokeWidth="1.5" />
          <path d="M14 34 L12 37 L18 35 Z" fill="#f59e0b" />
          <circle cx="12.5" cy="36.5" r="1" fill="#18181b" />
          <path d="M30 15 L33 12 C34.5 10.5 37 10.5 38.5 12 C40 13.5 40 16 38.5 17.5 L35.5 20.5 Z" fill="#f43f5e" stroke="#fda4af" strokeWidth="1.5" />
        </svg>
      );
    case 'seed':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#022c22" fillOpacity="0.7" stroke="#22c55e" strokeWidth="1.5" />
          <path d="M24 38 C24 30 25 22 24 16" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M24 24 C16 20 14 12 20 8 C26 10 26 18 24 24 Z" fill="#22c55e" stroke="#86efac" strokeWidth="1.2" />
          <path d="M24 20 C32 18 34 10 28 6 C22 8 22 16 24 20 Z" fill="#4ade80" stroke="#bbf7d0" strokeWidth="1.2" />
          <circle cx="24" cy="14" r="2" fill="#fef08a" />
        </svg>
      );
    case 'journal':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#064e3b" fillOpacity="0.5" stroke="#10b981" strokeWidth="1.5" />
          <rect x="13" y="10" width="22" height="28" rx="3" fill="#047857" stroke="#6ee7b7" strokeWidth="1.5" />
          <rect x="11" y="10" width="4" height="28" rx="1.5" fill="#065f46" stroke="#34d399" strokeWidth="1" />
          <line x1="18" y1="18" x2="31" y2="18" stroke="#a7f3d0" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="18" y1="24" x2="28" y2="24" stroke="#a7f3d0" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="18" y1="30" x2="25" y2="30" stroke="#a7f3d0" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M28 8 L32 12 L28 16" stroke="#fcd34d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'magnifier':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#083344" fillOpacity="0.6" stroke="#06b6d4" strokeWidth="1.5" />
          <circle cx="21" cy="21" r="10" fill="#0e7490" fillOpacity="0.4" stroke="#38bdf8" strokeWidth="2.5" />
          <path d="M28 28 L37 37" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
          <circle cx="17.5" cy="17.5" r="3" fill="#e0f2fe" fillOpacity="0.8" />
          <path d="M23 23 L25 25" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'ruler':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#082f49" fillOpacity="0.6" stroke="#0ea5e9" strokeWidth="1.5" />
          <path d="M12 36 L36 12" stroke="#0284c7" strokeWidth="9" strokeLinecap="round" />
          <path d="M12 36 L36 12" stroke="#38bdf8" strokeWidth="7" strokeLinecap="round" />
          <line x1="18" y1="28" x2="20" y2="30" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="22" y1="24" x2="25" y2="27" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="26" y1="20" x2="28" y2="22" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="30" y1="16" x2="33" y2="19" stroke="#0f172a" strokeWidth="1.5" />
        </svg>
      );
    case 'flask':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#083344" fillOpacity="0.7" stroke="#06b6d4" strokeWidth="1.5" />
          <path d="M21 11 L27 11 L27 19 L34 32 C35.5 35 33 38 29.5 38 L18.5 38 C15 38 12.5 35 14 32 L21 19 Z" fill="#0e7490" fillOpacity="0.7" stroke="#67e8f9" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M16 29 L32 29 C33.5 32 32 36 29 36 L19 36 C16 36 14.5 32 16 29 Z" fill="#22d3ee" />
          <circle cx="21" cy="32" r="1.5" fill="#ecfeff" />
          <circle cx="27" cy="33" r="1" fill="#ecfeff" />
          <circle cx="24" cy="25" r="1.2" fill="#ecfeff" />
        </svg>
      );
    case 'compass':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#4c0519" fillOpacity="0.6" stroke="#f43f5e" strokeWidth="1.5" />
          <circle cx="24" cy="24" r="14" stroke="#fda4af" strokeWidth="1.5" />
          <polygon points="24,12 28,24 24,22 20,24" fill="#ef4444" stroke="#fee2e2" strokeWidth="0.8" />
          <polygon points="24,36 28,24 24,26 20,24" fill="#94a3b8" stroke="#f1f5f9" strokeWidth="0.8" />
          <circle cx="24" cy="24" r="2" fill="#fcd34d" />
        </svg>
      );
    case 'hourglass':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#450a0a" fillOpacity="0.7" stroke="#ef4444" strokeWidth="1.5" />
          <line x1="14" y1="12" x2="34" y2="12" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="14" y1="36" x2="34" y2="36" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M17 12 C17 22 23 24 24 24 C25 24 31 22 31 12 Z" fill="#991b1b" stroke="#fca5a5" strokeWidth="1.5" />
          <path d="M17 36 C17 26 23 24 24 24 C25 24 31 26 31 36 Z" fill="#991b1b" stroke="#fca5a5" strokeWidth="1.5" />
          <path d="M19 35 C19 31 29 31 29 35 Z" fill="#fbbf24" />
          <circle cx="24" cy="24" r="1" fill="#fef08a" />
        </svg>
      );
    case 'torch':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#450a0a" fillOpacity="0.7" stroke="#f43f5e" strokeWidth="1.5" />
          <path d="M24 8 C28 14 31 19 27 24 C25 26 23 26 21 24 C17 19 20 14 24 8 Z" fill="#ef4444" stroke="#fee2e2" strokeWidth="1" />
          <path d="M24 13 C26 17 27 20 25 22 C24 23 23 23 22 22 C20 20 21 17 24 13 Z" fill="#fbbf24" />
          <polygon points="21,25 27,25 25,38 23,38" fill="#78350f" stroke="#d97706" strokeWidth="1.2" />
        </svg>
      );
    case 'crown':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#3b0764" fillOpacity="0.7" stroke="#a855f7" strokeWidth="1.5" />
          <path d="M13 32 L15 18 L21 25 L24 14 L27 25 L33 18 L35 32 Z" fill="#9333ea" stroke="#d8b4fe" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="15" cy="18" r="2" fill="#f43f5e" />
          <circle cx="24" cy="14" r="2.5" fill="#fef08a" stroke="#d97706" strokeWidth="0.8" />
          <circle cx="33" cy="18" r="2" fill="#06b6d4" />
          <line x1="14" y1="32" x2="34" y2="32" stroke="#fde047" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'talisman':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#2e1065" fillOpacity="0.7" stroke="#8b5cf6" strokeWidth="1.5" />
          <polygon points="24,9 35,16 35,32 24,39 13,32 13,16" fill="#6b21a8" stroke="#c084fc" strokeWidth="1.8" />
          <circle cx="24" cy="24" r="6" fill="#a855f7" stroke="#f3e8ff" strokeWidth="1.2" />
          <path d="M24 15 L24 33 M15 24 L33 24" stroke="#e9d5ff" strokeWidth="1" strokeDasharray="2 2" />
          <circle cx="24" cy="24" r="2" fill="#38bdf8" />
        </svg>
      );
    case 'prism':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#1e1b4b" fillOpacity="0.8" stroke="#a855f7" strokeWidth="1.5" />
          <polygon points="24,10 38,34 10,34" fill="#581c87" stroke="#e9d5ff" strokeWidth="2" strokeLinejoin="round" />
          <polygon points="24,16 33,32 15,32" fill="#7e22ce" stroke="#c084fc" strokeWidth="1.2" />
          <circle cx="24" cy="24" r="3" fill="#fdf4ff" />
          <line x1="8" y1="26" x2="16" y2="24" stroke="#38bdf8" strokeWidth="1.8" />
          <line x1="32" y1="24" x2="40" y2="22" stroke="#f43f5e" strokeWidth="1.8" />
          <line x1="32" y1="26" x2="41" y2="27" stroke="#f59e0b" strokeWidth="1.8" />
        </svg>
      );
    /* Epic 4 — vật phẩm mới (tự thiết kế, cùng ngôn ngữ hình khối với bộ cũ). */
    case 'lantern':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#0c1e3a" fillOpacity="0.78" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="24" cy="24" r="12" fill="#fbbf24" fillOpacity="0.1" />
          <path d="M24 7.5 V11" stroke="#7dd3fc" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M19.5 11 H28.5 L30 14.2 H18 Z" fill="#0ea5e9" stroke="#bae6fd" strokeWidth="1.1" strokeLinejoin="round" />
          <rect x="16.5" y="14.2" width="15" height="18.8" rx="6.2" fill="#fde68a" fillOpacity="0.2" stroke="#7dd3fc" strokeWidth="1.5" />
          <ellipse cx="24" cy="23.6" rx="5.2" ry="6.6" fill="#fbbf24" fillOpacity="0.55" />
          <ellipse cx="24" cy="23.6" rx="2.6" ry="3.4" fill="#fef3c7" fillOpacity="0.9" />
          <path d="M18.6 33 H29.4 L27.9 36.2 H20.1 Z" fill="#0ea5e9" stroke="#bae6fd" strokeWidth="1.1" strokeLinejoin="round" />
          <circle cx="21.2" cy="20.4" r="1.15" fill="#fef08a" />
          <circle cx="26.8" cy="26.2" r="1" fill="#fef08a" />
          <circle cx="11.5" cy="15.5" r="1.2" fill="#fde047" />
          <circle cx="36.8" cy="18.6" r="1.4" fill="#fde047" />
          <circle cx="35.2" cy="33.8" r="1" fill="#fde047" />
          <circle cx="12.8" cy="31.4" r="0.85" fill="#fde047" />
        </svg>
      );
    case 'owl':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#3b0a1e" fillOpacity="0.78" stroke="#fb7185" strokeWidth="1.5" />
          <path d="M34.5 8.6 a6.2 6.2 0 1 0 5.6 8.7 a5 5 0 1 1 -5.6 -8.7 Z" fill="#fde68a" fillOpacity="0.9" />
          <path d="M14.2 12.6 L19.4 18.4 L15.4 20.2 Z" fill="#b45309" stroke="#fdba74" strokeWidth="1" strokeLinejoin="round" />
          <path d="M33.8 12.6 L28.6 18.4 L32.6 20.2 Z" fill="#b45309" stroke="#fdba74" strokeWidth="1" strokeLinejoin="round" />
          <ellipse cx="24" cy="26.6" rx="10.2" ry="11" fill="#92400e" stroke="#fdba74" strokeWidth="1.4" />
          <ellipse cx="24" cy="30.4" rx="5.6" ry="6" fill="#fcd34d" fillOpacity="0.32" />
          <path d="M21.4 30 q1.3 1.1 2.6 0 M24 31.6 q1.3 1.1 2.6 0" stroke="#fde68a" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
          <circle cx="20" cy="23" r="3.7" fill="#fef3c7" stroke="#fbbf24" strokeWidth="1.2" />
          <circle cx="28" cy="23" r="3.7" fill="#fef3c7" stroke="#fbbf24" strokeWidth="1.2" />
          <circle cx="20" cy="23" r="1.75" fill="#1c1917" />
          <circle cx="28" cy="23" r="1.75" fill="#1c1917" />
          <circle cx="20.65" cy="22.35" r="0.6" fill="#ffffff" />
          <circle cx="28.65" cy="22.35" r="0.6" fill="#ffffff" />
          <path d="M24 25.1 L22.6 26.9 H25.4 Z" fill="#f59e0b" />
          <path d="M16.5 37 H31.5" stroke="#fdba74" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M21 36.6 V38.4 M27 36.6 V38.4" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
          <circle cx="24" cy="24" r="22" fill="#18181b" stroke="#52525b" strokeWidth="1.5" />
          <circle cx="24" cy="24" r="10" fill="#a1a1aa" />
        </svg>
      );
  }
};

export default ShopItemSvg;
