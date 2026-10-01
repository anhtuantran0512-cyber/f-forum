import React from 'react';
import { getTierForLevel } from '../utils/tier';

// 1. Bronze Antique Aegis shield (32px aura, earthy bronze gradients)
const Tier1Aegis = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    className="transition-transform duration-300 hover:scale-110 drop-shadow-[0_0_16px_rgba(217,119,6,0.6)]"
  >
    <defs>
      <radialGradient id="aegisGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#d97706" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#78350f" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="50%" stopColor="#b45309" />
        <stop offset="100%" stopColor="#451a03" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="46" fill="url(#aegisGlow)" />
    <polygon
      points="50,14 85,26 78,72 50,88 22,72 15,26"
      fill="url(#bronzeGrad)"
      stroke="#fcd34d"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <polygon
      points="50,24 74,34 68,66 50,78 32,66 26,34"
      fill="#78350f"
      opacity="0.85"
      stroke="#f59e0b"
      strokeWidth="1.5"
    />
    <circle cx="50" cy="50" r="10" fill="#fef3c7" stroke="#b45309" strokeWidth="2" />
    <path
      d="M50 44 L50 56 M44 50 L56 50"
      stroke="#78350f"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

// 2. Silver Steel Hexagon with neon orange spikes (38px aura)
const Tier2Hexagon = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    className="transition-transform duration-300 hover:scale-110 drop-shadow-[0_0_18px_rgba(249,115,22,0.7)]"
  >
    <defs>
      <radialGradient id="hexOrangeAura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#f97316" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="steelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="40%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#334155" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="46" fill="url(#hexOrangeAura)" />
    <polygon points="50,4 56,22 44,22" fill="#ea580c" />
    <polygon points="50,96 56,78 44,78" fill="#ea580c" />
    <polygon points="96,50 78,56 78,44" fill="#ea580c" />
    <polygon points="4,50 22,56 22,44" fill="#ea580c" />
    <polygon
      points="50,18 82,34 82,66 50,82 18,66 18,34"
      fill="url(#steelGrad)"
      stroke="#fdba74"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <polygon
      points="50,26 74,38 74,62 50,74 26,62 26,38"
      fill="#1e293b"
      opacity="0.9"
      stroke="#f97316"
      strokeWidth="1.5"
    />
    <circle cx="50" cy="50" r="7" fill="#fb923c" />
  </svg>
);

// 3. Decagram Solar Star (10 points, 48px radiant gold aura)
const Tier3SolarStar = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    className="transition-transform duration-300 hover:scale-110 drop-shadow-[0_0_22px_rgba(234,179,8,0.8)]"
  >
    <defs>
      <radialGradient id="solarAura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fde047" stopOpacity="0.95" />
        <stop offset="50%" stopColor="#ca8a04" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#854d0e" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#a16207" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#solarAura)" />
    <polygon
      points="50,8 59,26 78,16 75,37 94,44 81,59 90,78 70,78 64,96 50,82 36,96 30,78 10,78 19,59 6,44 25,37 22,16 41,26"
      fill="url(#goldGrad)"
      stroke="#fef9c3"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="50" cy="50" r="16" fill="#713f12" stroke="#fef08a" strokeWidth="2" />
    <polygon
      points="50,38 54,46 62,50 54,54 50,62 46,54 38,50 46,46"
      fill="#fef08a"
    />
  </svg>
);

// 4. Cyberpunk Cyan Sapphire Diamond (52px neon cyan aura)
const Tier4CyanDiamond = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    className="transition-transform duration-300 hover:scale-110 drop-shadow-[0_0_24px_rgba(6,182,212,0.85)]"
  >
    <defs>
      <radialGradient id="cyanAura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.95" />
        <stop offset="60%" stopColor="#0891b2" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#164e63" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="diamondGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#cffafe" />
        <stop offset="50%" stopColor="#06b6d4" />
        <stop offset="100%" stopColor="#0e7490" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#cyanAura)" />
    <polygon
      points="50,10 88,50 50,90 12,50"
      fill="url(#diamondGrad)"
      stroke="#a5f3fc"
      strokeWidth="3"
    />
    <polygon points="50,10 50,50 12,50" fill="#67e8f9" opacity="0.6" />
    <polygon points="50,50 88,50 50,90" fill="#0891b2" opacity="0.8" />
    <polygon
      points="50,26 74,50 50,74 26,50"
      stroke="#ecfeff"
      strokeWidth="1.8"
      fill="none"
    />
    <circle cx="50" cy="50" r="5" fill="#ffffff" />
  </svg>
);

// 5. Dragon-eye Amethyst Pentagon (58px royal purple aura)
const Tier5AmethystPentagon = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    className="transition-transform duration-300 hover:scale-110 drop-shadow-[0_0_26px_rgba(168,85,247,0.85)]"
  >
    <defs>
      <radialGradient id="amethystAura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#c084fc" stopOpacity="0.95" />
        <stop offset="55%" stopColor="#7e22ce" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#3b0764" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f3e8ff" />
        <stop offset="50%" stopColor="#9333ea" />
        <stop offset="100%" stopColor="#581c87" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#amethystAura)" />
    <polygon
      points="50,12 88,40 73,86 27,86 12,40"
      fill="url(#purpleGrad)"
      stroke="#e9d5ff"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <polygon
      points="50,24 78,44 67,78 33,78 22,44"
      fill="#3b0764"
      opacity="0.8"
      stroke="#a855f7"
      strokeWidth="1.5"
    />
    <ellipse
      cx="50"
      cy="50"
      rx="14"
      ry="18"
      fill="#facc15"
      stroke="#713f12"
      strokeWidth="1.5"
    />
    <path
      d="M50 36 C47 43 47 57 50 64 C53 57 53 43 50 36 Z"
      fill="#000000"
    />
  </svg>
);

// 6. Amber Emerald Crest (60px emerald amber aura)
const Tier6EmeraldCrest = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    className="transition-transform duration-300 hover:scale-110 drop-shadow-[0_0_28px_rgba(16,185,129,0.85)]"
  >
    <defs>
      <radialGradient id="emeraldAura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#34d399" stopOpacity="0.95" />
        <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#064e3b" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="crestGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a7f3d0" />
        <stop offset="45%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#emeraldAura)" />
    <polygon
      points="50,6 74,20 90,46 72,80 50,92 28,80 10,46 26,20"
      fill="url(#crestGrad)"
      stroke="#fef08a"
      strokeWidth="2.5"
    />
    <polygon
      points="50,18 68,28 78,48 66,72 50,82 34,72 22,48 32,28"
      fill="#064e3b"
      opacity="0.85"
      stroke="#34d399"
      strokeWidth="1.5"
    />
    <circle cx="50" cy="50" r="10" fill="#f59e0b" stroke="#fef3c7" strokeWidth="2" />
    <polygon
      points="50,43 53,49 59,50 55,54 56,60 50,57 44,60 45,54 41,50 47,49"
      fill="#ffffff"
    />
  </svg>
);

// 7. Royal Quartz Octagon (68px deep magenta quartz aura)
const Tier7MagentaOctagon = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    className="transition-transform duration-300 hover:scale-110 drop-shadow-[0_0_30px_rgba(236,72,153,0.9)]"
  >
    <defs>
      <radialGradient id="quartzAura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.95" />
        <stop offset="50%" stopColor="#be123c" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#4c0519" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="quartzGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fecdd3" />
        <stop offset="45%" stopColor="#e11d48" />
        <stop offset="100%" stopColor="#881337" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#quartzAura)" />
    <polygon
      points="32,10 68,10 90,32 90,68 68,90 32,90 10,68 10,32"
      fill="url(#quartzGrad)"
      stroke="#ffe4e6"
      strokeWidth="3"
    />
    <polygon
      points="36,22 64,22 78,36 78,64 64,78 36,78 22,64 22,36"
      fill="#4c0519"
      opacity="0.85"
      stroke="#fb7185"
      strokeWidth="2"
    />
    <polygon
      points="50,26 56,44 74,50 56,56 50,74 44,56 26,50 44,44"
      fill="#ffffff"
      opacity="0.9"
    />
  </svg>
);

// 8. Prismatic Optical Sigil (75px shifting rainbow prism aura)
const Tier8PrismaticSigil = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    className="transition-transform duration-300 hover:scale-110 drop-shadow-[0_0_34px_rgba(99,102,241,0.95)]"
  >
    <defs>
      <radialGradient id="prismAura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#818cf8" stopOpacity="1" />
        <stop offset="35%" stopColor="#ec4899" stopOpacity="0.5" />
        <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="prismGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="25%" stopColor="#818cf8" />
        <stop offset="50%" stopColor="#c084fc" />
        <stop offset="75%" stopColor="#f43f5e" />
        <stop offset="100%" stopColor="#fbbf24" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#prismAura)" />
    <polygon
      points="50,8 88,74 12,74"
      fill="url(#prismGrad)"
      stroke="#ffffff"
      strokeWidth="2"
      opacity="0.9"
    />
    <polygon
      points="50,92 12,26 88,26"
      fill="#0f172a"
      stroke="url(#prismGrad)"
      strokeWidth="2.5"
      opacity="0.8"
    />
    <circle cx="50" cy="50" r="14" fill="#ffffff" opacity="0.85" />
    <circle cx="50" cy="50" r="8" fill="#4f46e5" />
  </svg>
);

// 9. Void Astral Wing (85px starlight nebula deep aura)
const Tier9AstralWing = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    className="transition-transform duration-300 hover:scale-110 drop-shadow-[0_0_38px_rgba(56,189,248,1)]"
  >
    <defs>
      <radialGradient id="astralAura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#38bdf8" stopOpacity="1" />
        <stop offset="40%" stopColor="#6366f1" stopOpacity="0.6" />
        <stop offset="75%" stopColor="#a855f7" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#030712" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="astralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e0f2fe" />
        <stop offset="35%" stopColor="#38bdf8" />
        <stop offset="70%" stopColor="#4f46e5" />
        <stop offset="100%" stopColor="#1e1b4b" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#astralAura)" />
    <path
      d="M50 12 L65 32 L88 38 L72 56 L82 82 L50 68 L18 82 L28 56 L12 38 L35 32 Z"
      fill="url(#astralGrad)"
      stroke="#bae6fd"
      strokeWidth="2.5"
    />
    <path
      d="M50 24 L59 38 L74 42 L63 54 L69 70 L50 60 L31 70 L37 54 L26 42 L41 38 Z"
      fill="#090d16"
      stroke="#38bdf8"
      strokeWidth="1.5"
    />
    <circle cx="50" cy="48" r="6" fill="#ffffff" />
    <polygon
      points="50,42 52,48 58,50 52,52 50,58 48,52 42,50 48,48"
      fill="#38bdf8"
    />
  </svg>
);

// 10. Supreme Taiji 16-apex Celestial Nexus (100px cosmic super-aura)
const Tier10CelestialNexus = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    className="transition-transform duration-300 hover:scale-115 drop-shadow-[0_0_45px_rgba(251,191,36,1)]"
  >
    <defs>
      <radialGradient id="taiJiAura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
        <stop offset="30%" stopColor="#fbbf24" stopOpacity="0.85" />
        <stop offset="60%" stopColor="#d97706" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="celestialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="30%" stopColor="#fde047" />
        <stop offset="70%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#78350f" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="49" fill="url(#taiJiAura)" />
    <circle
      cx="50"
      cy="50"
      r="42"
      stroke="url(#celestialGrad)"
      strokeWidth="3"
      strokeDasharray="6 3"
    />
    <polygon
      points="50,6 59,20 74,12 76,28 92,28 88,43 98,54 86,63 88,78 72,80 66,94 50,88 34,94 28,80 12,78 14,63 2,54 12,43 8,28 24,28 26,12 41,20"
      fill="url(#celestialGrad)"
      stroke="#ffffff"
      strokeWidth="1.5"
    />
    <circle cx="50" cy="50" r="22" fill="#ffffff" stroke="#f59e0b" strokeWidth="2" />
    <path
      d="M50 28 A11 11 0 0 1 50 50 A11 11 0 0 0 50 72 A22 22 0 0 1 50 28 Z"
      fill="#0f172a"
    />
    <circle cx="50" cy="39" r="4" fill="#0f172a" />
    <circle cx="50" cy="61" r="4" fill="#ffffff" />
  </svg>
);

export const TierSvg: React.FC<{ tierNumber: number; size?: number }> = ({
  tierNumber,
  size = 28,
}) => {
  switch (tierNumber) {
    case 1:
      return <Tier1Aegis size={size} />;
    case 2:
      return <Tier2Hexagon size={size} />;
    case 3:
      return <Tier3SolarStar size={size} />;
    case 4:
      return <Tier4CyanDiamond size={size} />;
    case 5:
      return <Tier5AmethystPentagon size={size} />;
    case 6:
      return <Tier6EmeraldCrest size={size} />;
    case 7:
      return <Tier7MagentaOctagon size={size} />;
    case 8:
      return <Tier8PrismaticSigil size={size} />;
    case 9:
      return <Tier9AstralWing size={size} />;
    case 10:
      return <Tier10CelestialNexus size={size} />;
    default:
      return <Tier1Aegis size={size} />;
  }
};

// Tier Badge Component with Tooltip matching exact prompt spec: "Thành viên hăng hái, level [N] - Tier [ROMAN]"
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
          Thành viên hăng hái, level {level} - Tier {tier.roman}
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

// Super Admin Facebook Blue Verified Tick with Sweep reflection + cyan pulse
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
        Đây là 1 chuyên gia của server
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
