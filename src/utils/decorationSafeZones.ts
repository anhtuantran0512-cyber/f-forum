/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Nhiệm vụ 10 — SAFE ZONE theo decoration (chuẩn Discord).
 *
 * Artwork trong mỗi asset KHÔNG nhất thiết đặt đúng tâm canvas (mỗi file có
 * khung rộng/hẹp, hiệu ứng lệch tâm khác nhau). Config này dịch + scale
 * chính xác lớp frame/aura để hiệu ứng căn đúng tâm AVATAR, không trôi dạt.
 *
 *  - dx, dy: % so với KÍCH THƯỚC SLOT (dương = dịch phải / xuống dưới).
 *  - scale: tỉ lệ so với slot (1.0 = giữ nguyên).
 *
 * Mặc định = {dx:0, dy:0, scale:1} (artwork đã đặt tâm — đa số asset).
 * Thêm item mới vào map khi quan sát được lệch trên mọi kích thước (24–256px).
 */
export interface DecorationSafeZone {
  dx?: number;
  dy?: number;
  scale?: number;
}

const DEFAULT_ZONE: DecorationSafeZone = { dx: 0, dy: 0, scale: 1 };

const SAFE_ZONES: Record<string, DecorationSafeZone> = {
  /* Vòng sáng trong file lệch khối lượng về góc trái-dưới → đẩy lên phải-trên để re-center. */
  'frame-air': { dx: 3, dy: -3 },
};

export const getDecorationSafeZone = (itemId?: string | null): DecorationSafeZone =>
  (itemId && SAFE_ZONES[itemId]) || DEFAULT_ZONE;
