/* Bản quyền trí tuệ thuộc về BroAmStuck */
/*
 * Quyền lợi VÔ VÙNG COIN cho Super Admin.
 *  - Siêu quản trị luôn được coi là có số dư Coin = +∞ (mua/gacha/treo thưởng
 *    không bao giờ chặn vì thiếu Coin — server cũng bỏ qua kiểm tra + không trừ).
 *  - Mọi chỗ HIỂN THỊ số dư Coin dùng formatCoinBalance() để ra "∞" gọn gàng
 *    thay vì "Infinity".
 * Chỉ dựa vào role (nguồn quyền chính thức) — không thêm cờ riêng để tránh
 * hai nguồn sự thật lệch nhau.
 */

/** Số dư Coin hiệu dụng: ∞ cho Super Admin, còn lại = số Coin thật. */
export const effectiveCoinBalance = (role: string | null | undefined, rawCoin: number | null | undefined): number =>
  role === 'SUPER_ADMIN' ? Number.POSITIVE_INFINITY : (Number(rawCoin) || 0);

/** Định dạng số dư Coin để hiển thị (vi-VN, hoặc "∞" cho vô vùng). */
export const formatCoinBalance = (coin: number): string =>
  Number.isFinite(coin) ? Math.round(coin).toLocaleString('vi-VN') : '∞';
