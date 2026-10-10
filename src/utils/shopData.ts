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
  { id: 'crown_celestial', name: 'Viền Học Kỳ Vàng', price: 1800, tierColor: 'purple', category: 'Khung avatar', description: 'Nét đồng mảnh cho ảnh đại diện.', iconType: 'GraduationCap' },
  { id: 'talisman_focus', name: 'Focus Đêm Ấm', price: 2500, tierColor: 'purple', category: 'Theme Focus', description: 'Nền ấm cho phiên học tối.', iconType: 'Moon' },
  { id: 'prism_universe', name: 'Viền Lăng Kính', price: 4000, tierColor: 'purple', category: 'Khung avatar', description: 'Viền ánh sáng có tiết chế.', iconType: 'Gem' },
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
