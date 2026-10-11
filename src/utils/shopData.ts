/* Bản quyền trí tuệ thuộc về BroAmStuck */
import type { ShopItem, ShopTierColor } from '../types/index.ts';

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'pencil_starter', name: 'Viền Trang Vở', price: 50, tierColor: 'green', category: 'Khung avatar', description: 'Viền giấy kẻ ô cho ảnh đại diện.', iconType: 'Frame' },
  { id: 'seed_wisdom', name: 'Ghim Ghi Nhớ', price: 80, tierColor: 'green', category: 'Góc hồ sơ', description: 'Ghim một dấu nhỏ bên hồ sơ.', iconType: 'Pin' },
  { id: 'journal_memories', name: 'Sổ Học Kỳ', price: 120, tierColor: 'green', category: 'Góc hồ sơ', description: 'Trang sổ lưu dấu chặng học.', iconType: 'NotebookPen' },
  { id: 'magnifier_detective', name: 'Viền Tra Cứu', price: 200, tierColor: 'blue', category: 'Khung avatar', description: 'Viền kính trong quanh ảnh.', iconType: 'Search' },
  { id: 'ruler_quantum', name: 'Viền Kẻ Dòng', price: 300, tierColor: 'blue', category: 'Khung avatar', description: 'Đường kẻ mảnh quanh ảnh.', iconType: 'Ruler' },
  { id: 'flask_energy', name: 'Sắc Xanh Bàn Học', price: 450, tierColor: 'blue', category: 'Theme Focus', description: 'Màu dịu cho góc tập trung.', iconType: 'FlaskConical' },
  { id: 'compass_galaxy', name: 'La Bàn Nhóm Học', price: 650, tierColor: 'red', category: 'Góc hồ sơ', description: 'Dấu chỉ hướng bên hồ sơ.', iconType: 'Compass' },
  { id: 'hourglass_time', name: 'Nhịp Ôn Bài', price: 850, tierColor: 'red', category: 'Hiệu ứng', description: 'Cát chuyển động khi xem thẻ.', iconType: 'Hourglass' },
  { id: 'torch_victory', name: 'Đèn Đọc Khuya', price: 1200, tierColor: 'red', category: 'Hiệu ứng', description: 'Ánh đèn dịu trên thẻ học.', iconType: 'LampDesk' },
  { id: 'crown_celestial', name: 'Viền Học Kỳ Vàng', price: 1800, tierColor: 'purple', category: 'Khung avatar', description: 'Viền Holographic + hạt sao thiên hà', iconType: 'GraduationCap' },
  { id: 'talisman_focus', name: 'Focus Đêm Ấm', price: 2500, tierColor: 'purple', category: 'Theme Focus', description: 'Nền thiên hà ấm áp cho phiên học tối', iconType: 'Moon' },
  { id: 'prism_universe', name: 'Viền Lăng Kính', price: 4000, tierColor: 'purple', category: 'Khung avatar', description: 'Viền cầu vồng lăng kính + hạt sao xoay', iconType: 'Gem' },
  { id: 'lantern_firefly', name: 'Đom Đóm Trang Sổ', price: 380, tierColor: 'blue', category: 'Hiệu ứng', description: 'Đốm sáng nhỏ bên ghi chú.', iconType: 'Lamp', addedAt: '2026-10-09' },
  { id: 'owl_nightwatch', name: 'Cú Bông Canh Giờ', price: 980, tierColor: 'red', category: 'Góc hồ sơ', description: 'Cú Bông nhắc nghỉ đúng lúc.', iconType: 'Bird', addedAt: '2026-10-09' },
  { id: 'frame_chalk', name: 'Viền Bảng Phấn', price: 110, tierColor: 'green', category: 'Khung avatar', description: 'Viền phấn mỏng trên bảng tối.', iconType: 'Square' },
  { id: 'frame_grid', name: 'Viền Ô Ly', price: 170, tierColor: 'green', category: 'Khung avatar', description: 'Nếp ô ly quanh ảnh đại diện.', iconType: 'Grid3X3' },
  { id: 'frame_library', name: 'Viền Thư Viện', price: 390, tierColor: 'blue', category: 'Khung avatar', description: 'Đường sách đôi quanh chân dung.', iconType: 'LibraryBig' },
  { id: 'frame_sunrise', name: 'Viền Sáng Sớm', price: 540, tierColor: 'blue', category: 'Khung avatar', description: 'Viền nắng nhẹ đầu ngày.', iconType: 'Sunrise' },
  { id: 'frame_blueprint', name: 'Viền Bản Vẽ', price: 720, tierColor: 'red', category: 'Khung avatar', description: 'Nét vẽ kỹ thuật gọn gàng.', iconType: 'DraftingCompass' },
  { id: 'frame_thesis', name: 'Viền Luận Văn', price: 1600, tierColor: 'purple', category: 'Khung avatar', description: 'Viền đồng kiểu bìa luận văn.', iconType: 'ScrollText' },
  { id: 'effect_page', name: 'Lật Trang', price: 140, tierColor: 'green', category: 'Hiệu ứng', description: 'Chuyển trang khi mở thẻ.', iconType: 'BookOpen' },
  { id: 'effect_pencil', name: 'Nét Chì', price: 240, tierColor: 'blue', category: 'Hiệu ứng', description: 'Nét chì vẽ nhẹ khi mở.', iconType: 'PencilLine' },
  { id: 'effect_clock', name: 'Kim Đồng Hồ', price: 480, tierColor: 'blue', category: 'Hiệu ứng', description: 'Kim nhích khẽ theo phút.', iconType: 'Clock3' },
  { id: 'effect_notes', name: 'Mảnh Ghi Chú', price: 780, tierColor: 'red', category: 'Hiệu ứng', description: 'Một tờ giấy rung nhẹ.', iconType: 'StickyNote' },
  { id: 'effect_moon', name: 'Trăng Học Đêm', price: 1480, tierColor: 'purple', category: 'Hiệu ứng', description: 'Vầng trăng nhỏ bên F-Pass.', iconType: 'MoonStar' },
  { id: 'theme_cream', name: 'Focus Giấy Kem', price: 180, tierColor: 'green', category: 'Theme Focus', description: 'Nền giấy kem dịu mắt.', iconType: 'Palette' },
  { id: 'theme_slate', name: 'Focus Đá Phiến', price: 320, tierColor: 'blue', category: 'Theme Focus', description: 'Nền xanh xám tĩnh lặng.', iconType: 'PanelTop' },
  { id: 'theme_moss', name: 'Focus Rêu Nhạt', price: 500, tierColor: 'blue', category: 'Theme Focus', description: 'Sắc rêu dịu cho buổi đọc.', iconType: 'Leaf' },
  { id: 'theme_ink', name: 'Focus Mực Đêm', price: 900, tierColor: 'red', category: 'Theme Focus', description: 'Nền mực tối ít phân tâm.', iconType: 'Droplets' },
  { id: 'theme_oak', name: 'Focus Gỗ Sồi', price: 1950, tierColor: 'purple', category: 'Theme Focus', description: 'Sắc gỗ trầm cho giờ học.', iconType: 'Trees' },
  { id: 'profile_bookmark', name: 'Dấu Trang', price: 90, tierColor: 'green', category: 'Góc hồ sơ', description: 'Đánh dấu sách đang đọc.', iconType: 'Bookmark' },
  { id: 'profile_calendar', name: 'Lịch Học', price: 270, tierColor: 'blue', category: 'Góc hồ sơ', description: 'Lịch nhỏ bên góc hồ sơ.', iconType: 'CalendarDays' },
  { id: 'profile_shelf', name: 'Kệ Sách', price: 590, tierColor: 'blue', category: 'Góc hồ sơ', description: 'Kệ sách gọn trên F-Pass.', iconType: 'Blocks' },
  { id: 'profile_stamp', name: 'Dấu Bài Tốt', price: 1050, tierColor: 'red', category: 'Góc hồ sơ', description: 'Con dấu trên thẻ thành tích.', iconType: 'Stamp' },
  { id: 'profile_archive', name: 'Hộp Lưu Trữ', price: 2200, tierColor: 'purple', category: 'Góc hồ sơ', description: 'Hộp kỷ niệm cuối học kỳ.', iconType: 'Archive' },
];

export const getTierColorStyles = (tier: ShopTierColor) => {
  switch (tier) {
    case 'green':
      return {
        border: 'border-emerald-500/40 hover:border-emerald-400',
        bg: 'bg-emerald-950/30',
        glow: 'shadow-[0_0_15px_rgba(16,185,129,0.25)]',
        badge: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
        dot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
        btn: 'bg-emerald-500 hover:bg-emerald-400 text-black',
      };
    case 'blue':
      return {
        border: 'border-cyan-500/40 hover:border-cyan-400',
        bg: 'bg-cyan-950/30',
        glow: 'shadow-[0_0_18px_rgba(6,182,212,0.3)]',
        badge: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
        dot: 'bg-cyan-400 shadow-[0_0_8px_#38bdf8]',
        btn: 'bg-cyan-500 hover:bg-cyan-400 text-black',
      };
    case 'red':
      return {
        border: 'border-rose-500/40 hover:border-rose-400',
        bg: 'bg-rose-950/30',
        glow: 'shadow-[0_0_20px_rgba(244,63,94,0.35)]',
        badge: 'text-rose-300 bg-rose-500/10 border-rose-500/30',
        dot: 'bg-rose-400 shadow-[0_0_8px_#fb7185]',
        btn: 'bg-rose-500 hover:bg-rose-400 text-white',
      };
    case 'purple':
      return {
        border: 'border-purple-500/50 hover:border-purple-400',
        bg: 'bg-purple-950/35',
        glow: 'shadow-[0_0_22px_rgba(168,85,247,0.4)]',
        badge: 'text-purple-300 bg-purple-500/10 border-purple-500/30',
        dot: 'bg-purple-400 shadow-[0_0_8px_#c084fc]',
        btn: 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white',
      };
  }
};

/* ==========================================================================
   Epic 4 — Hệ độ hiếm (Nhiemvu_5): Thường · Hiếm · Sử thi · Huyền thoại.
   Ánh xạ từ tierColor sẵn có nên KHÔNG đổi dữ liệu đã lưu của người dùng.
   ========================================================================== */
export type ShopRarity = 'common' | 'rare' | 'epic' | 'legendary';

export const RARITY_OF_TIER: Record<ShopTierColor, ShopRarity> = {
  green: 'common',
  blue: 'rare',
  red: 'epic',
  purple: 'legendary',
};

export const RARITY_META: Record<ShopRarity, { label: string; en: string; order: number }> = {
  common: { label: 'Thường', en: 'Common', order: 0 },
  rare: { label: 'Hiếm', en: 'Rare', order: 1 },
  epic: { label: 'Sử thi', en: 'Epic', order: 2 },
  legendary: { label: 'Huyền thoại', en: 'Legendary', order: 3 },
};

export const rarityOf = (item: Pick<ShopItem, 'tierColor'>): ShopRarity => RARITY_OF_TIER[item.tierColor] || 'common';

/** Vật phẩm "Mới": phát hành trong 30 ngày gần nhất (dựa vào addedAt thật). */
export const SHOP_NEW_WINDOW_DAYS = 30;
export const isNewItem = (item: Pick<ShopItem, 'addedAt'>, now: number = Date.now()): boolean => {
  if (!item.addedAt) return false;
  const added = Date.parse(`${item.addedAt}T00:00:00+07:00`);
  if (!Number.isFinite(added) || added > now) return false;
  return now - added < SHOP_NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
};

/* --------------------------------------------------------------------------
   Ưu đãi tuần — hàm THUẦN dùng chung cho client (hiển thị) và server (tính tiền),
   nên nhãn "Giảm giá" luôn khớp số Coin bị trừ thật. Tuần tính theo giờ Việt Nam
   (UTC+7), bắt đầu thứ Hai 00:00. Chỉ áp cho hạng Sử thi/Huyền thoại.
   -------------------------------------------------------------------------- */
export const WEEKLY_DEAL_PERCENT = 20;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const FIRST_MONDAY_UTC = Date.UTC(1970, 0, 5);

export interface WeeklyDeal {
  itemId: string;
  percent: number;
  /** Mốc kết thúc (ms) — thứ Hai kế tiếp 00:00 giờ Việt Nam. */
  endsAt: number;
}

export const getWeeklyDeal = (now: number = Date.now()): WeeklyDeal => {
  const pool = SHOP_ITEMS.filter((item) => item.tierColor === 'red' || item.tierColor === 'purple')
    .map((item) => item.id)
    .sort();
  const weekIndex = Math.floor((now + VN_OFFSET_MS - FIRST_MONDAY_UTC) / WEEK_MS);
  return {
    itemId: pool[((weekIndex % pool.length) + pool.length) % pool.length],
    percent: WEEKLY_DEAL_PERCENT,
    endsAt: FIRST_MONDAY_UTC + (weekIndex + 1) * WEEK_MS - VN_OFFSET_MS,
  };
};

/** Giá thực trả tại thời điểm `now` (đã áp ưu đãi tuần nếu có). */
export const effectivePrice = (item: Pick<ShopItem, 'id' | 'price'>, now: number = Date.now()): number => {
  const deal = getWeeklyDeal(now);
  return deal.itemId === item.id ? Math.round(item.price * (100 - deal.percent) / 100) : item.price;
};

/* ============================================================================
   PHẦN 3 — BOUTIQUE SHOP PREMIUM REDESIGN: RARITY HIERARCHY, GACHA & 6H SALE
   ============================================================================ */

export interface RarityPremiumDetail {
  tierCode: 'COMMON' | 'RARE' | 'EPIC' | 'MYTHIC';
  badgeIcon: string;
  badgeLabel: string;
  borderDesc: string;
  perks: string[];
  flairTitle?: string;
}

export const RARITY_PREMIUM_META: Record<ShopRarity, RarityPremiumDetail> = {
  common: {
    tierCode: 'COMMON',
    badgeIcon: '●',
    badgeLabel: 'COMMON · Thường',
    borderDesc: '2px solid #9CA3AF',
    perks: ['Viền cơ bản thanh lịch', 'Hiển thị trên hồ sơ cá nhân'],
  },
  rare: {
    tierCode: 'RARE',
    badgeIcon: '●',
    badgeLabel: 'RARE · Hiếm',
    borderDesc: '3px gradient #3B82F6 → #06B6D4',
    perks: ['Viền xanh lam phát sáng nhẹ', 'Hiệu ứng glow mờ quanh ảnh đại diện'],
  },
  epic: {
    tierCode: 'EPIC',
    badgeIcon: '●',
    badgeLabel: 'EPIC · Sử thi',
    borderDesc: 'Conic-gradient xoay #A855F7 → #EC4899',
    perks: [
      'Viền tím xoay động + Aura pulse',
      'Tên người dùng đổi màu Gradient tím',
      'Danh hiệu Học Giả Sử Thi',
    ],
    flairTitle: 'Học Giả Sử Thi',
  },
  legendary: {
    tierCode: 'MYTHIC',
    badgeIcon: '●',
    badgeLabel: 'MYTHIC · Huyền thoại',
    borderDesc: 'Holographic xoay + Hạt sao vàng quỹ đạo',
    perks: [
      'Viền cầu vồng Holographic + Hue-cycle',
      'Hạt sao vàng bay quanh quỹ đạo Avatar',
      'Aura đa sắc + Danh hiệu Thần Thoại Tri Thức',
    ],
    flairTitle: 'Thần Thoại Tri Thức',
  },
};

export const rarityFrameClass = (rarity: ShopRarity): string => {
  switch (rarity) {
    case 'legendary':
      return 'frame-mythic';
    case 'epic':
      return 'frame-epic';
    case 'rare':
      return 'frame-rare';
    default:
      return 'frame-common';
  }
};

export const rarityDotClass = (rarity: ShopRarity): string =>
  rarity === 'legendary' ? 'mythic' : rarity;

export interface EquippedCombo {
  frame: ShopItem | null;
  aura: ShopItem | null;
  theme: ShopItem | null;
  corner: ShopItem | null;
  highestRarity: ShopRarity;
  mythicTitle: string | null;
}

const COMBO_STORAGE_PREFIX = 'fforum_equipped_combo_v1:';

export function getStoredComboMap(userKey: string = 'default'): Record<string, string> {
  const storage = (globalThis as { localStorage?: { getItem(k: string): string | null } }).localStorage;
  if (!storage) return {};
  try {
    const raw = storage.getItem(`${COMBO_STORAGE_PREFIX}${userKey}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveEquippedComboSlot(category: string, itemId: string, userKey: string = 'default'): Record<string, string> {
  const storage = (globalThis as { localStorage?: { setItem(k: string, v: string): void } }).localStorage;
  if (!storage) return {};
  try {
    const current = getStoredComboMap(userKey);
    const next = { ...current };
    if (!itemId) {
      delete next[category];
    } else {
      next[category] = itemId;
    }
    storage.setItem(`${COMBO_STORAGE_PREFIX}${userKey}`, JSON.stringify(next));
    return next;
  } catch {
    return {};
  }
}

export function resolveEquippedCombo(
  inventory: string[] = [],
  equippedBadge?: string,
  userKey: string = 'default',
): EquippedCombo {
  const ownedSet = new Set(inventory);
  if (equippedBadge) ownedSet.add(equippedBadge);
  const stored = getStoredComboMap(userKey);
  const activeItem = equippedBadge ? SHOP_ITEMS.find((i) => i.id === equippedBadge) || null : null;

  const pickSlot = (category: string): ShopItem | null => {
    if (activeItem && activeItem.category === category) return activeItem;
    const storedId = stored[category];
    if (storedId === '__none__') return null;
    if (storedId && ownedSet.has(storedId)) {
      const found = SHOP_ITEMS.find((i) => i.id === storedId && i.category === category);
      if (found) return found;
    }
    const ownedInCat = SHOP_ITEMS.filter((i) => i.category === category && ownedSet.has(i.id));
    if (ownedInCat.length === 0) return null;
    return ownedInCat.sort((a, b) => {
      const rDiff = RARITY_META[rarityOf(b)].order - RARITY_META[rarityOf(a)].order;
      return rDiff !== 0 ? rDiff : b.price - a.price;
    })[0];
  };

  const frame = pickSlot('Khung avatar');
  const aura = pickSlot('Hiệu ứng');
  const theme = pickSlot('Theme Focus');
  const corner = pickSlot('Góc hồ sơ');

  const equippedList = [frame, aura, theme, corner, activeItem].filter((x): x is ShopItem => Boolean(x));
  let highestRarity: ShopRarity = 'common';
  for (const it of equippedList) {
    const r = rarityOf(it);
    if (RARITY_META[r].order > RARITY_META[highestRarity].order) {
      highestRarity = r;
    }
  }
  const mythicTitle =
    highestRarity === 'legendary'
      ? RARITY_PREMIUM_META.legendary.flairTitle || 'Thần Thoại Tri Thức'
      : highestRarity === 'epic'
        ? RARITY_PREMIUM_META.epic.flairTitle || 'Học Giả Sử Thi'
        : null;

  return { frame, aura, theme, corner, highestRarity, mythicTitle };
}

/** Chu kỳ xoay vòng giảm giá động: mỗi 6 giờ (00:00, 06:00, 12:00, 18:00 giờ VN) */
export const DYNAMIC_DISCOUNT_ROTATION_MS = 6 * 60 * 60 * 1000;

export interface DynamicDiscountEntry {
  itemId: string;
  percent: number;
  originalPrice: number;
  discountedPrice: number;
  isSuperSale: boolean; /* 81% - 90% → "SIÊU SALE!" */
  tierBucket: '10-20' | '21-40' | '41-60' | '61-80' | '81-90';
}

export interface DynamicDiscountSnapshot {
  slotIndex: number;
  startsAt: number;
  endsAt: number;
  remainingMs: number;
  deals: Record<string, DynamicDiscountEntry>;
  list: DynamicDiscountEntry[];
}

/** Bộ sinh số giả ngẫu nhiên tất định (Mulberry32) để mọi tab/máy khách thấy cùng đợt giảm giá 6h */
function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Rút mức phần trăm giảm giá theo đúng phân phối xác suất Phần 3.E:
 * - 10% – 20%: 40% xác suất
 * - 21% – 40%: 30% xác suất
 * - 41% – 60%: 18% xác suất
 * - 61% – 80%:  9% xác suất
 * - 81% – 90%:  3% xác suất (SIÊU SALE!)
 */
export function rollWeightedDiscountPercent(randBucket: number, randWithin: number): {
  percent: number;
  tierBucket: DynamicDiscountEntry['tierBucket'];
  isSuperSale: boolean;
} {
  const r = Math.max(0, Math.min(0.999999, randBucket));
  const w = Math.max(0, Math.min(0.999999, randWithin));
  if (r < 0.40) {
    const percent = 10 + Math.floor(w * 11); // 10..20
    return { percent, tierBucket: '10-20', isSuperSale: false };
  }
  if (r < 0.70) {
    const percent = 21 + Math.floor(w * 20); // 21..40
    return { percent, tierBucket: '21-40', isSuperSale: false };
  }
  if (r < 0.88) {
    const percent = 41 + Math.floor(w * 20); // 41..60
    return { percent, tierBucket: '41-60', isSuperSale: false };
  }
  if (r < 0.97) {
    const percent = 61 + Math.floor(w * 20); // 61..80
    return { percent, tierBucket: '61-80', isSuperSale: false };
  }
  const percent = 81 + Math.floor(w * 10); // 81..90
  return { percent, tierBucket: '81-90', isSuperSale: true };
}

/**
 * Tính danh sách vật phẩm đang giảm giá trong khung 6h hiện tại (20–30% tổng số vật phẩm,
 * tương đương 9/35 vật phẩm ~ 25.7%).
 */
export const getDynamicDiscounts = (now: number = Date.now()): DynamicDiscountSnapshot => {
  const vnNow = now + VN_OFFSET_MS;
  const slotIndex = Math.floor(vnNow / DYNAMIC_DISCOUNT_ROTATION_MS);
  const startsAt = slotIndex * DYNAMIC_DISCOUNT_ROTATION_MS - VN_OFFSET_MS;
  const endsAt = (slotIndex + 1) * DYNAMIC_DISCOUNT_ROTATION_MS - VN_OFFSET_MS;
  const remainingMs = Math.max(0, endsAt - now);

  const rng = createSeededRng(slotIndex * 2654435761 + 1013904223);
  const pool = [...SHOP_ITEMS];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }

  /* Chọn 9/35 vật phẩm (~25.7%, nằm chuẩn trong khoảng 20–30%) */
  const count = 9;
  const selected = pool.slice(0, count);
  const deals: Record<string, DynamicDiscountEntry> = {};
  const list: DynamicDiscountEntry[] = [];

  selected.forEach((item, idx) => {
    /* Đảm bảo mỗi khung 6h có ít nhất 1 vật phẩm chạm mốc cao hoặc dùng đúng phân phối chuẩn */
    const bucketRoll = idx === 0 ? Math.max(0.89, rng()) : rng();
    const withinRoll = rng();
    const { percent, tierBucket, isSuperSale } = rollWeightedDiscountPercent(bucketRoll, withinRoll);
    const discountedPrice = Math.max(5, Math.round((item.price * (100 - percent)) / 100));
    const entry: DynamicDiscountEntry = {
      itemId: item.id,
      percent,
      originalPrice: item.price,
      discountedPrice,
      isSuperSale,
      tierBucket,
    };
    deals[item.id] = entry;
    list.push(entry);
  });

  return { slotIndex, startsAt, endsAt, remainingMs, deals, list };
};

/** Định dạng đồng hồ đếm ngược HH:MM:SS cho đợt xoay vòng giảm giá 6h */
export const formatCountdownHMS = (ms: number): string => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
};

/* ============================================================================
   PHẦN 3.D — HỆ THỐNG GACHA (3 GÓI QUAY + BẢO HIỂM PITY 50 / 100)
   ============================================================================ */

export type GachaPoolId = 'standard' | 'epic_focus' | 'mythic_hunter';

export interface GachaPoolConfig {
  id: GachaPoolId;
  name: string;
  subtitle: string;
  cost: number;
  badge: string;
  accentGradient: string;
  rates: {
    common: number;    /* % */
    rare: number;      /* % */
    epic: number;      /* % */
    legendary: number; /* % (Mythic — KHÔNG BAO GIỜ vượt quá 5%) */
  };
}

export const GACHA_POOLS: Record<GachaPoolId, GachaPoolConfig> = {
  standard: {
    id: 'standard',
    name: 'Standard Pull',
    subtitle: 'Triệu hồi tiêu chuẩn • Cơ hội sở hữu mọi bậc vật phẩm',
    cost: 120,
    badge: 'TIÊU CHUẨN',
    accentGradient: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
    rates: {
      common: 70,
      rare: 22,
      epic: 7,
      legendary: 1,
    },
  },
  epic_focus: {
    id: 'epic_focus',
    name: 'Epic Focus Pull',
    subtitle: 'Nhân đôi tỷ lệ Sử Thi & Huyền Thoại • Tối ưu săn khung động',
    cost: 350,
    badge: 'TĂNG TỶ LỆ EPIC',
    accentGradient: 'linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%)',
    rates: {
      common: 45,
      rare: 38,
      epic: 15,
      legendary: 2,
    },
  },
  mythic_hunter: {
    id: 'mythic_hunter',
    name: 'Mythic Hunter Pull',
    subtitle: 'Gói đại sứ tối thượng • Tỷ lệ Mythic chạm ngưỡng 4% (Tối đa ≤ 5%)',
    cost: 850,
    badge: 'SĂN MYTHIC 👑',
    accentGradient: 'linear-gradient(135deg, #F59E0B 0%, #EC4899 50%, #8B5CF6 100%)',
    rates: {
      common: 26,
      rare: 45,
      epic: 25,
      legendary: 4,
    },
  },
};

export const GACHA_EPIC_PITY_LIMIT = 50;
export const GACHA_MYTHIC_PITY_LIMIT = 100;

export interface GachaPityState {
  epicPity: number;   /* số lần liên tiếp chưa ra Epic/Mythic (0..49) */
  mythicPity: number; /* số lần liên tiếp chưa ra Mythic (0..99) */
  totalPulls: number;
}

export interface GachaPullResult {
  poolId: GachaPoolId;
  rarity: ShopRarity;
  item: ShopItem;
  pityTriggered: 'mythic_100' | 'epic_50' | null;
  nextPity: GachaPityState;
}

/**
 * Thực hiện 1 lượt quay Gacha với tỷ lệ minh bạch & hệ thống Pity 50 (Epic+) / 100 (Mythic).
 */
export function rollGachaPull(
  poolId: GachaPoolId,
  currentPity: GachaPityState,
  randRarity: number = Math.random(),
  randItem: number = Math.random(),
): GachaPullResult {
  const pool = GACHA_POOLS[poolId] || GACHA_POOLS.standard;
  const nextEpicCounter = (currentPity.epicPity || 0) + 1;
  const nextMythicCounter = (currentPity.mythicPity || 0) + 1;

  let rarity: ShopRarity;
  let pityTriggered: GachaPullResult['pityTriggered'] = null;

  /* 1. Kiểm tra bảo hiểm Pity 100 lượt (Chắc chắn ra Mythic / legendary) */
  if (nextMythicCounter >= GACHA_MYTHIC_PITY_LIMIT) {
    rarity = 'legendary';
    pityTriggered = 'mythic_100';
  } else if (nextEpicCounter >= GACHA_EPIC_PITY_LIMIT) {
    /* 2. Kiểm tra bảo hiểm Pity 50 lượt (Chắc chắn ra từ Epic trở lên) */
    const mythicShare = pool.rates.legendary / (pool.rates.epic + pool.rates.legendary);
    rarity = randRarity * 100 < mythicShare * 100 ? 'legendary' : 'epic';
    pityTriggered = 'epic_50';
  } else {
    /* 3. Quay theo bảng xác suất của Gói (Mythic luôn bị kẹp <= 5%) */
    const mythicRate = Math.min(5, pool.rates.legendary);
    const epicRate = pool.rates.epic;
    const rareRate = pool.rates.rare;
    const rollPct = Math.max(0, Math.min(99.9999, randRarity * 100));

    if (rollPct < mythicRate) {
      rarity = 'legendary';
    } else if (rollPct < mythicRate + epicRate) {
      rarity = 'epic';
    } else if (rollPct < mythicRate + epicRate + rareRate) {
      rarity = 'rare';
    } else {
      rarity = 'common';
    }
  }

  const candidates = SHOP_ITEMS.filter(item => RARITY_OF_TIER[item.tierColor] === rarity);
  const chosenPool = candidates.length > 0 ? candidates : SHOP_ITEMS;
  const itemIndex = Math.min(chosenPool.length - 1, Math.max(0, Math.floor(randItem * chosenPool.length)));
  const item = chosenPool[itemIndex];

  const isMythic = rarity === 'legendary';
  const isEpicOrAbove = rarity === 'epic' || rarity === 'legendary';

  const nextPity: GachaPityState = {
    epicPity: isEpicOrAbove ? 0 : nextEpicCounter,
    mythicPity: isMythic ? 0 : nextMythicCounter,
    totalPulls: (currentPity.totalPulls || 0) + 1,
  };

  return {
    poolId: pool.id,
    rarity,
    item,
    pityTriggered,
    nextPity,
  };
}

