export interface TierInfo {
  tierNumber: number;
  roman: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  auraRadius: number; // In pixels as per prompt specs: 32px up to 100px
  auraColor: string;
  badgeColor: string;
}

export const TIER_CONFIGS: TierInfo[] = [
  {
    tierNumber: 1,
    roman: 'I',
    name: 'Bronze Antique Aegis',
    minLevel: 1,
    maxLevel: 5,
    auraRadius: 32,
    auraColor: 'rgba(217, 119, 6, 0.45)',
    badgeColor: '#b45309',
  },
  {
    tierNumber: 2,
    roman: 'II',
    name: 'Silver Steel Hexagon',
    minLevel: 6,
    maxLevel: 12,
    auraRadius: 38,
    auraColor: 'rgba(249, 115, 22, 0.55)',
    badgeColor: '#ea580c',
  },
  {
    tierNumber: 3,
    roman: 'III',
    name: 'Decagram Solar Star',
    minLevel: 13,
    maxLevel: 22,
    auraRadius: 48,
    auraColor: 'rgba(234, 179, 8, 0.7)',
    badgeColor: '#eab308',
  },
  {
    tierNumber: 4,
    roman: 'IV',
    name: 'Cyberpunk Cyan Diamond',
    minLevel: 23,
    maxLevel: 35,
    auraRadius: 52,
    auraColor: 'rgba(6, 182, 212, 0.75)',
    badgeColor: '#06b6d4',
  },
  {
    tierNumber: 5,
    roman: 'V',
    name: 'Dragon-eye Amethyst Pentagon',
    minLevel: 36,
    maxLevel: 50,
    auraRadius: 58,
    auraColor: 'rgba(168, 85, 247, 0.8)',
    badgeColor: '#a855f7',
  },
  {
    tierNumber: 6,
    roman: 'VI',
    name: 'Amber Emerald Crest',
    minLevel: 51,
    maxLevel: 68,
    auraRadius: 60,
    auraColor: 'rgba(16, 185, 129, 0.82)',
    badgeColor: '#10b981',
  },
  {
    tierNumber: 7,
    roman: 'VII',
    name: 'Royal Quartz Octagon',
    minLevel: 69,
    maxLevel: 88,
    auraRadius: 68,
    auraColor: 'rgba(236, 72, 153, 0.85)',
    badgeColor: '#ec4899',
  },
  {
    tierNumber: 8,
    roman: 'VIII',
    name: 'Prismatic Optical Sigil',
    minLevel: 89,
    maxLevel: 110,
    auraRadius: 75,
    auraColor: 'rgba(99, 102, 241, 0.9)',
    badgeColor: '#6366f1',
  },
  {
    tierNumber: 9,
    roman: 'IX',
    name: 'Void Astral Wing',
    minLevel: 111,
    maxLevel: 135,
    auraRadius: 85,
    auraColor: 'rgba(56, 189, 248, 0.95)',
    badgeColor: '#38bdf8',
  },
  {
    tierNumber: 10,
    roman: 'X',
    name: 'Supreme Taiji Celestial Nexus',
    minLevel: 136,
    maxLevel: 150,
    auraRadius: 100,
    auraColor: 'rgba(251, 191, 36, 1)',
    badgeColor: '#fbbf24',
  },
];

export function getTierForLevel(level: number): TierInfo {
  const clamped = Math.max(1, Math.min(150, level));
  const found = TIER_CONFIGS.find(
    t => clamped >= t.minLevel && clamped <= t.maxLevel
  );
  return found || TIER_CONFIGS[TIER_CONFIGS.length - 1];
}
