import React from 'react';
import { getTierForLevel } from '../utils/tier';

// 1. HỌC SINH (Level 1-5): Mầm non 1 lá xanh tươi
export const Tier1HocSinh = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    className="transition-transform duration-300 hover:scale-110 drop-shadow-[0_0_12px_rgba(34,197,94,0.6)]"
  >
    <defs>
      <radialGradient id="rank1Glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#15803d" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="leafGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#86efac" />
        <stop offset="100%" stopColor="#16a34a" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="44" fill="url(#rank1Glow)" stroke="#22c55e" strokeWidth="2.5" strokeDasharray="4 2" />
    <circle cx="50" cy="50" r="34" fill="#0f172a" fillOpacity="0.8" stroke="#4ade80" strokeWidth="1.5" />
    {/* Stem */}
    <path d="M50 72 C50 56 49 46 50 36" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" />
    {/* Single sprouting leaf */}
    <path
      d="M50 46 C52 32 68 28 72 38 C72 48 58 56 50 46 Z"
      fill="url(#leafGrad1)"
      stroke="#bbf7d0"
      strokeWidth="1.5"
    />
    <circle cx="50" cy="34" r="2.5" fill="#fef08a" />
  </svg>
);

// 2. HỌC SINH GIỎI (Level 6-15): Cặp lá kép đối xứng
export const Tier2HocSinhGioi = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    className="transition-transform duration-300 hover:scale-110 drop-shadow-[0_0_15px_rgba(16,185,129,0.7)]"
  >
    <defs>
      <radialGradient id="rank2Glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#047857" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="leafGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6ee7b7" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="44" fill="url(#rank2Glow)" stroke="#10b981" strokeWidth="2.5" />
    <circle cx="50" cy="50" r="35" fill="#062e24" fillOpacity="0.85" stroke="#34d399" strokeWidth="1.8" />
    {/* Central Stem */}
    <path d="M50 75 L50 32" stroke="#34d399" strokeWidth="3.5" strokeLinecap="round" />
    {/* Left Leaf */}
    <path
      d="M50 54 C36 48 30 36 38 28 C48 30 50 44 50 54 Z"
      fill="url(#leafGrad2)"
      stroke="#a7f3d0"
      strokeWidth="1.5"
    />
    {/* Right Leaf */}
    <path
      d="M50 54 C64 48 70 36 62 28 C52 30 50 44 50 54 Z"
      fill="url(#leafGrad2)"
      stroke="#a7f3d0"
      strokeWidth="1.5"
    />
    {/* Top Sprout Tip */}
    <circle cx="50" cy="28" r="3" fill="#fde047" />
  </svg>
);

// 3. HỌC SINH XUẤT SẮC (Level 16-30): Nhánh 3 lá xòe nở hoa
export const Tier3HocSinhXuatSac = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    className="transition-transform duration-300 hover:scale-110 drop-shadow-[0_0_18px_rgba(20,184,166,0.75)]"
  >
    <defs>
      <radialGradient id="rank3Glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#0f766e" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="leafGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#5eead4" />
        <stop offset="100%" stopColor="#0d9488" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="45" fill="url(#rank3Glow)" stroke="#14b8a6" strokeWidth="2.5" />
    <polygon points="50,12 85,32 85,68 50,88 15,68 15,32" fill="#042f2e" fillOpacity="0.85" stroke="#2dd4bf" strokeWidth="2" strokeLinejoin="round" />
    {/* Left Leaf */}
    <path d="M50 58 C32 54 26 40 35 32 C45 35 48 50 50 58 Z" fill="url(#leafGrad3)" stroke="#99f6e4" strokeWidth="1.5" />
    {/* Right Leaf */}
    <path d="M50 58 C68 54 74 40 65 32 C55 35 52 50 50 58 Z" fill="url(#leafGrad3)" stroke="#99f6e4" strokeWidth="1.5" />
    {/* Center High Leaf */}
    <path d="M50 62 C44 44 44 26 50 18 C56 26 56 44 50 62 Z" fill="url(#leafGrad3)" stroke="#99f6e4" strokeWidth="1.5" />
    <circle cx="50" cy="48" r="4.5" fill="#fef08a" stroke="#0d9488" strokeWidth="1.5" />
  </svg>
);

// 4. THÔNG THÁI (Level 31-50): Lăng kính 4 lá tinh hoa phát sáng Cyan
export const Tier4ThongThai = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    className="transition-transform duration-300 hover:scale-110 drop-shadow-[0_0_20px_rgba(6,182,212,0.8)]"
  >
    <defs>
      <radialGradient id="rank4Glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#0e7490" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="cyanGrad4" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a5f3fc" />
        <stop offset="100%" stopColor="#0891b2" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="46" fill="url(#rank4Glow)" stroke="#06b6d4" strokeWidth="2.5" />
    {/* Diamond outer frame */}
    <polygon points="50,10 90,50 50,90 10,50" fill="#082f49" fillOpacity="0.9" stroke="#38bdf8" strokeWidth="2.5" />
    {/* 4 Petals/Foliage */}
    <path d="M50 50 C50 30 40 20 50 16 C60 20 50 30 50 50 Z" fill="url(#cyanGrad4)" />
    <path d="M50 50 C50 70 60 80 50 84 C40 80 50 70 50 50 Z" fill="url(#cyanGrad4)" />
    <path d="M50 50 C30 50 20 60 16 50 C20 40 30 50 50 50 Z" fill="url(#cyanGrad4)" />
    <path d="M50 50 C70 50 80 40 84 50 C80 60 70 50 50 50 Z" fill="url(#cyanGrad4)" />
    {/* Center Prismatic Core */}
    <polygon points="50,38 62,50 50,62 38,50" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
    <circle cx="50" cy="50" r="3" fill="#38bdf8" />
  </svg>
);

// 5. TÀI NĂNG (Level 51-75): Ngôi sao tri thức 5 cánh lam saphir rực rỡ
export const Tier5TaiNang = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    className="transition-transform duration-300 hover:scale-110 drop-shadow-[0_0_22px_rgba(59,130,246,0.85)]"
  >
    <defs>
      <radialGradient id="rank5Glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="blueStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#93c5fd" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="46" fill="url(#rank5Glow)" stroke="#3b82f6" strokeWidth="3" />
    <circle cx="50" cy="50" r="38" fill="#0f172a" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="3 3" />
    {/* 5-pointed Sapphire Star */}
    <polygon
      points="50,14 61,38 86,38 66,54 74,78 50,62 26,78 34,54 14,38 39,38"
      fill="url(#blueStarGrad)"
      stroke="#bfdbfe"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="50" cy="50" r="7" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="2" />
    <circle cx="50" cy="50" r="3" fill="#1e40af" />
  </svg>
);

// 6. THIÊN TÀI (Level 76-105): Bông lúa mì vàng trĩu hạt kết hợp mặt trời
export const Tier6ThienTai = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    className="transition-transform duration-300 hover:scale-110 drop-shadow-[0_0_24px_rgba(245,158,11,0.9)]"
  >
    <defs>
      <radialGradient id="rank6Glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#78350f" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="wheatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="46" fill="url(#rank6Glow)" stroke="#f59e0b" strokeWidth="3" />
    {/* Solar Rays Ring */}
    <circle cx="50" cy="50" r="37" fill="#451a03" fillOpacity="0.85" stroke="#fbbf24" strokeWidth="2" />
    {/* Wheat Stem arching upwards */}
    <path d="M50 78 C50 60 52 42 50 20" stroke="#fcd34d" strokeWidth="3" strokeLinecap="round" />
    {/* Wheat Grains */}
    <ellipse cx="43" cy="28" rx="6" ry="3.5" transform="rotate(-30 43 28)" fill="url(#wheatGrad)" stroke="#fef08a" strokeWidth="1.2" />
    <ellipse cx="57" cy="28" rx="6" ry="3.5" transform="rotate(30 57 28)" fill="url(#wheatGrad)" stroke="#fef08a" strokeWidth="1.2" />
    <ellipse cx="42" cy="38" rx="7" ry="4" transform="rotate(-35 42 38)" fill="url(#wheatGrad)" stroke="#fef08a" strokeWidth="1.2" />
    <ellipse cx="58" cy="38" rx="7" ry="4" transform="rotate(35 58 38)" fill="url(#wheatGrad)" stroke="#fef08a" strokeWidth="1.2" />
    <ellipse cx="43" cy="48" rx="7" ry="4" transform="rotate(-40 43 48)" fill="url(#wheatGrad)" stroke="#fef08a" strokeWidth="1.2" />
    <ellipse cx="57" cy="48" rx="7" ry="4" transform="rotate(40 57 48)" fill="url(#wheatGrad)" stroke="#fef08a" strokeWidth="1.2" />
    <ellipse cx="45" cy="58" rx="6" ry="3.5" transform="rotate(-35 45 58)" fill="url(#wheatGrad)" stroke="#fef08a" strokeWidth="1.2" />
    <ellipse cx="55" cy="58" rx="6" ry="3.5" transform="rotate(35 55 58)" fill="url(#wheatGrad)" stroke="#fef08a" strokeWidth="1.2" />
    {/* Top crowning grain */}
    <ellipse cx="50" cy="18" rx="4" ry="7" fill="#fef08a" stroke="#d97706" strokeWidth="1.2" />
  </svg>
);

// 7. BẬC THẦY (Level 106-130): Ngọn đuốc trí tuệ & Vương miện hồng ngọc
export const Tier7BacThay = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    className="transition-transform duration-300 hover:scale-110 drop-shadow-[0_0_26px_rgba(239,68,68,0.95)]"
  >
    <defs>
      <radialGradient id="rank7Glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="rubyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fca5a5" />
        <stop offset="50%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#991b1b" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="46" fill="url(#rank7Glow)" stroke="#ef4444" strokeWidth="3" />
    {/* Octagon crest */}
    <polygon points="50,10 78,22 90,50 78,78 50,90 22,78 10,50 22,22" fill="#450a0a" fillOpacity="0.9" stroke="#f87171" strokeWidth="2.5" />
    {/* Torch / Flame */}
    <path
      d="M50 18 C58 26 64 36 56 46 C52 50 48 50 44 46 C36 36 42 26 50 18 Z"
      fill="url(#rubyGrad)"
      stroke="#fee2e2"
      strokeWidth="1.5"
    />
    <path
      d="M50 26 C54 32 56 38 52 42 C50 44 48 44 46 42 C44 38 46 32 50 26 Z"
      fill="#fef08a"
    />
    {/* Torch handle */}
    <polygon points="46,50 54,50 52,74 48,74" fill="#78350f" stroke="#f59e0b" strokeWidth="1.5" />
    {/* Ruby gems */}
    <circle cx="50" cy="50" r="3.5" fill="#fca5a5" stroke="#ef4444" strokeWidth="1" />
  </svg>
);

// 8. CHUYÊN GIA (Level 131-150): Tinh thể vũ trụ tím huyền bí & Vầng hào quang
export const Tier8ChuyenGia = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    className="transition-transform duration-300 hover:scale-110 drop-shadow-[0_0_28px_rgba(168,85,247,1)]"
  >
    <defs>
      <radialGradient id="rank8Glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#4c1d95" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="purpleGrad8" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e9d5ff" />
        <stop offset="40%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#6b21a8" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="46" fill="url(#rank8Glow)" stroke="#c084fc" strokeWidth="3" />
    {/* Outer 12-point starburst ring */}
    <circle cx="50" cy="50" r="38" fill="#1e1b4b" fillOpacity="0.95" stroke="#d8b4fe" strokeWidth="2" strokeDasharray="5 2" />
    {/* Supreme Cosmic Faceted Crystal */}
    <polygon points="50,14 74,32 74,68 50,86 26,68 26,32" fill="url(#purpleGrad8)" stroke="#f3e8ff" strokeWidth="2.5" strokeLinejoin="round" />
    <polygon points="50,24 64,38 64,62 50,76 36,62 36,38" fill="#3b0764" fillOpacity="0.8" stroke="#c084fc" strokeWidth="1.5" />
    <circle cx="50" cy="50" r="8" fill="#fdf4ff" stroke="#a855f7" strokeWidth="2" />
    <circle cx="50" cy="50" r="4" fill="#7e22ce" />
    {/* Four Orbit Points */}
    <circle cx="50" cy="14" r="2.5" fill="#fbcfe8" />
    <circle cx="86" cy="50" r="2.5" fill="#fbcfe8" />
    <circle cx="50" cy="86" r="2.5" fill="#fbcfe8" />
    <circle cx="14" cy="50" r="2.5" fill="#fbcfe8" />
  </svg>
);

export const TierSvg = ({
  tierNumber,
  size = 28,
}: {
  tierNumber: number;
  size?: number;
}) => {
  switch (tierNumber) {
    case 1:
      return <Tier1HocSinh size={size} />;
    case 2:
      return <Tier2HocSinhGioi size={size} />;
    case 3:
      return <Tier3HocSinhXuatSac size={size} />;
    case 4:
      return <Tier4ThongThai size={size} />;
    case 5:
      return <Tier5TaiNang size={size} />;
    case 6:
      return <Tier6ThienTai size={size} />;
    case 7:
      return <Tier7BacThay size={size} />;
    case 8:
      return <Tier8ChuyenGia size={size} />;
    default:
      return <Tier1HocSinh size={size} />;
  }
};

// Tier Badge Component with Tooltip
interface TierBadgeProps {
  level: number;
  size?: number;
  showTooltip?: boolean;
  tooltipPosition?: 'top' | 'bottom';
  className?: string;
}

export const TierBadge: React.FC<TierBadgeProps> = ({
  level,
  size = 28,
  showTooltip = true,
  tooltipPosition = 'top',
  className = '',
}) => {
  const tier = getTierForLevel(level);

  return (
    <div
      className={`relative group inline-flex items-center justify-center ${className}`}
    >
      <TierSvg tierNumber={tier.tierNumber} size={size} />
      {showTooltip && (
        <div
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 z-50 opacity-0 group-hover:opacity-100 transition-all duration-200 text-xs font-medium text-white px-2.5 py-1 rounded-md bg-neutral-900/95 border border-white/20 whitespace-nowrap shadow-xl ${
            tooltipPosition === 'bottom'
              ? 'top-full mt-2'
              : 'bottom-full mb-2'
          }`}
        >
          {tier.name} • Cấp {level} ({tier.description})
          <div
            className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
              tooltipPosition === 'bottom'
                ? 'bottom-full -mb-1 border-b-neutral-900'
                : 'top-full -mt-1 border-t-neutral-900'
            }`}
          />
        </div>
      )}
    </div>
  );
};

// Super Admin Verified Tick
export const AdminVerifiedBadge: React.FC<{
  size?: number;
  tooltipPosition?: 'top' | 'bottom';
  className?: string;
}> = ({ size = 18, tooltipPosition = 'top', className = '' }) => {
  return (
    <div className={`relative group inline-flex items-center ${className}`}>
      <span
        style={{ width: size, height: size }}
        className="admin-verified-badge shrink-0"
      >
        <svg
          viewBox="0 0 24 24"
          width={size * 0.75}
          height={size * 0.75}
          fill="none"
          stroke="white"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <div
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 z-50 opacity-0 group-hover:opacity-100 transition-all duration-200 text-xs font-semibold text-white px-2.5 py-1 rounded-md bg-neutral-900/95 border border-cyan-400/40 whitespace-nowrap shadow-xl ${
          tooltipPosition === 'bottom'
            ? 'top-full mt-2'
            : 'bottom-full mb-2'
        }`}
      >
        Super Admin F-Forum
        <div
          className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
            tooltipPosition === 'bottom'
              ? 'bottom-full -mb-1 border-b-neutral-900'
              : 'top-full -mt-1 border-t-neutral-900'
          }`}
        />
      </div>
    </div>
  );
};
