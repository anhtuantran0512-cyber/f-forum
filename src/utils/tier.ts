/* Bản quyền trí tuệ thuộc về BroAmStuck */
export interface TierInfo {
  tierNumber: number;
  roman: string;
  name: string;
  titleVi?: string;
  minLevel: number;
  maxLevel: number;
  minPoints: number;
  minMedals?: number;
  auraRadius: number;
  auraColor: string;
  badgeColor: string;
  accentColor?: string;
  description: string;
}

export const TIER_CONFIGS: TierInfo[] = [
  {
    tierNumber: 1,
    roman: 'I',
    name: 'Măng Non',
    minLevel: 1,
    maxLevel: 5,
    minPoints: 0,
    auraRadius: 32,
    auraColor: 'rgba(74, 222, 128, 0.45)',
    badgeColor: '#4ADE80',
    description: 'Mầm măng vừa nhú khỏi đất, còn bọc bẹ',
  },
  {
    tierNumber: 2,
    roman: 'II',
    name: 'Măng Vươn',
    minLevel: 6,
    maxLevel: 15,
    minPoints: 100,
    auraRadius: 40,
    auraColor: 'rgba(74, 222, 128, 0.55)',
    badgeColor: '#4ADE80',
    description: 'Măng cao hơn, bẹ bắt đầu hé, lộ chút lá non',
  },
  {
    tierNumber: 3,
    roman: 'III',
    name: 'Tre Non',
    minLevel: 16,
    maxLevel: 30,
    minPoints: 250,
    auraRadius: 48,
    auraColor: 'rgba(74, 222, 128, 0.65)',
    badgeColor: '#4ADE80',
    description: 'Thành thân tre mảnh đầu tiên, 2 đốt, vài lá nhỏ',
  },
  {
    tierNumber: 4,
    roman: 'IV',
    name: 'Tre Vươn Mình',
    minLevel: 31,
    maxLevel: 50,
    minPoints: 500,
    minMedals: 5,
    auraRadius: 56,
    auraColor: 'rgba(56, 189, 248, 0.75)',
    badgeColor: '#38BDF8',
    description: 'Cao hơn, nhiều đốt hơn, lá rậm hơn — đổi sang xanh dương',
  },
  {
    tierNumber: 5,
    roman: 'V',
    name: 'Tre Trưởng Thành',
    minLevel: 51,
    maxLevel: 75,
    minPoints: 1000,
    minMedals: 10,
    auraRadius: 65,
    auraColor: 'rgba(56, 189, 248, 0.82)',
    badgeColor: '#38BDF8',
    description: 'Thân cao vững, tán lá đầy tầng',
  },
  {
    tierNumber: 6,
    roman: 'VI',
    name: 'Bụi Tre',
    minLevel: 76,
    maxLevel: 105,
    minPoints: 2000,
    minMedals: 20,
    auraRadius: 75,
    auraColor: 'rgba(167, 139, 250, 0.88)',
    badgeColor: '#A78BFA',
    description: '2 thân tre mọc cùng bụi — "tre bao giờ cũng mọc thành khóm"',
  },
  {
    tierNumber: 7,
    roman: 'VII',
    name: 'Lũy Tre Làng',
    minLevel: 106,
    maxLevel: 130,
    minPoints: 4000,
    minMedals: 35,
    auraRadius: 85,
    auraColor: 'rgba(192, 132, 252, 0.92)',
    badgeColor: '#C084FC',
    description: '3 thân, lá rậm rạp, bắt đầu có hào quang bao bọc',
  },
  {
    tierNumber: 8,
    roman: 'VIII',
    name: 'Lũy Tre Cổ Thụ',
    minLevel: 131,
    maxLevel: 150,
    minPoints: 8000,
    minMedals: 50,
    auraRadius: 100,
    auraColor: 'rgba(251, 191, 36, 1)',
    badgeColor: '#FBBF24',
    description: 'Toàn bụi tre vững chãi, vàng kim, hào quang tỏa sáng mạnh — "trúc hóa rồng"',
  },
];

export function getTierForLevel(level: number): TierInfo {
  const clamped = Math.max(1, Math.min(150, level));
  const found =
    TIER_CONFIGS.find(t => clamped >= t.minLevel && clamped <= t.maxLevel) ||
    TIER_CONFIGS[TIER_CONFIGS.length - 1];
  return {
    ...found,
    titleVi: found.name,
    accentColor: found.badgeColor,
  };
}

/**
 * Mốc XP để đạt một cấp — DÙNG CHUNG công thức với store
 * (`forumStore.getXPForLevel`), nhờ vậy thanh tiến độ trong hồ sơ và bảng rank
 * luôn khớp đúng cấp độ thật của tài khoản.
 */
export function xpThresholdForLevel(level: number): number {
  const lvl = Math.max(0, Math.round(level));
  if (lvl <= 1) return 0;
  return Math.floor(140 * (lvl - 1) + 1.08 * Math.pow(lvl - 1, 2));
}

export function getXPProgress(xp: number, level: number): { current: number; next: number; percent: number } {
  const lvl = Math.max(1, Math.min(150, level));
  const curThreshold = xpThresholdForLevel(lvl);
  const nextThreshold = lvl >= 150 ? curThreshold + 1000 : xpThresholdForLevel(lvl + 1);
  const span = Math.max(1, nextThreshold - curThreshold);
  const intoLevel = Math.max(0, xp - curThreshold);
  const percent = lvl >= 150 ? 100 : Math.max(0, Math.min(100, Math.round((intoLevel / span) * 100)));
  return { current: intoLevel, next: span, percent };
}

