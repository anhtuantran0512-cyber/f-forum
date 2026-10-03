/* Bản quyền trí tuệ thuộc về BroAmStuck */
export interface TierInfo {
  tierNumber: number;
  roman: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  auraRadius: number;
  auraColor: string;
  badgeColor: string;
  description: string;
}

export const TIER_CONFIGS: TierInfo[] = [
  {
    tierNumber: 1,
    roman: 'I',
    name: 'Học Sinh',
    minLevel: 1,
    maxLevel: 5,
    auraRadius: 32,
    auraColor: 'rgba(34, 197, 94, 0.45)',
    badgeColor: '#22c55e',
    description: 'Mầm cây non 1 lá xanh biếc vươn chồi đón ánh sáng tri thức',
  },
  {
    tierNumber: 2,
    roman: 'II',
    name: 'Học Sinh Giỏi',
    minLevel: 6,
    maxLevel: 15,
    auraRadius: 40,
    auraColor: 'rgba(16, 185, 129, 0.55)',
    badgeColor: '#10b981',
    description: 'Cặp lá kép mầm xanh tri thức đối xứng tràn đầy sức sống',
  },
  {
    tierNumber: 3,
    roman: 'III',
    name: 'Học Sinh Xuất Sắc',
    minLevel: 16,
    maxLevel: 30,
    auraRadius: 48,
    auraColor: 'rgba(20, 184, 166, 0.65)',
    badgeColor: '#14b8a6',
    description: 'Nhánh 3 lá xòe nở hoa tri thức viền xanh ngọc bích',
  },
  {
    tierNumber: 4,
    roman: 'IV',
    name: 'Thông Thái',
    minLevel: 31,
    maxLevel: 50,
    auraRadius: 56,
    auraColor: 'rgba(6, 182, 212, 0.75)',
    badgeColor: '#06b6d4',
    description: 'Cành 4 lá tinh hoa hội tụ lăng kính quang học phát sáng',
  },
  {
    tierNumber: 5,
    roman: 'V',
    name: 'Tài Năng',
    minLevel: 51,
    maxLevel: 75,
    auraRadius: 65,
    auraColor: 'rgba(59, 130, 246, 0.82)',
    badgeColor: '#3b82f6',
    description: 'Ngôi sao tri thức 5 cánh lam saphir rực rỡ và sắc sảo',
  },
  {
    tierNumber: 6,
    roman: 'VI',
    name: 'Thiên Tài',
    minLevel: 76,
    maxLevel: 105,
    auraRadius: 75,
    auraColor: 'rgba(245, 158, 11, 0.88)',
    badgeColor: '#f59e0b',
    description: 'Bông lúa mì vàng trĩu hạt kết hợp hào quang mặt trời rạng ngời',
  },
  {
    tierNumber: 7,
    roman: 'VII',
    name: 'Bậc Thầy',
    minLevel: 106,
    maxLevel: 130,
    auraRadius: 85,
    auraColor: 'rgba(239, 68, 68, 0.92)',
    badgeColor: '#ef4444',
    description: 'Ngọn đuốc trí tuệ bừng cháy và vương miện hồng ngọc kiên định',
  },
  {
    tierNumber: 8,
    roman: 'VIII',
    name: 'Chuyên Gia',
    minLevel: 131,
    maxLevel: 150,
    auraRadius: 100,
    auraColor: 'rgba(168, 85, 247, 1)',
    badgeColor: '#a855f7',
    description: 'Tinh thể vũ trụ huyền bí đính ngọc tím ma thuật, vầng hào quang tối thượng',
  },
];

export function getTierForLevel(level: number): TierInfo {
  const clamped = Math.max(1, Math.min(150, level));
  const found = TIER_CONFIGS.find(
    t => clamped >= t.minLevel && clamped <= t.maxLevel
  );
  return found || TIER_CONFIGS[TIER_CONFIGS.length - 1];
}
