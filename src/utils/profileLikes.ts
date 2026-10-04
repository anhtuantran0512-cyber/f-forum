/* Bản quyền trí tuệ thuộc về BroAmStuck */

/* ==========================================================================
   LƯỢT THẢ TIM HỒ SƠ — toàn bộ phép tính nằm ở ĐÂY, thuần tuý (không import gì)
   --------------------------------------------------------------------------
   Vì sao phải tách ra: bản cũ để nút tim tự cộng/trừ bằng state nội bộ, lại
   thêm một lần cộng nữa ở component cha khi danh sách người thích đổi → bấm một
   lần mà số nhảy 2. Giờ chỉ có một nguồn sự thật là `ProfileLikesMap`, và các
   hàm dưới đây nhận TRẠNG THÁI MONG MUỐN (muốn thích / muốn bỏ) nên gọi lặp lại
   bao nhiêu lần kết quả vẫn chỉ là +1 hoặc −1 đúng một lần (idempotent).
   Tệp này không import gì nên test được trực tiếp bằng node (tests/like-heart).
   ========================================================================== */

export const PROFILE_LIKES_KEY = 'fforum_profile_likes_v1';

/** email/ID hồ sơ (chữ thường) → danh sách người đã thả tim */
export type ProfileLikesMap = Record<string, string[]>;

export const normalizeLikeKey = (value?: string | null): string =>
  String(value || '').trim().toLowerCase();

/** Đọc dữ liệu thô từ storage (chuỗi JSON) → map sạch, bỏ mọi dữ liệu rác. */
export const parseProfileLikes = (raw?: string | null): ProfileLikesMap => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const clean: ProfileLikesMap = {};
    Object.entries(parsed as Record<string, unknown>).forEach(([key, value]) => {
      const profileKey = normalizeLikeKey(key);
      if (!profileKey || !Array.isArray(value)) return;
      const likers = Array.from(
        new Set(value.map((v) => normalizeLikeKey(String(v))).filter(Boolean)),
      );
      if (likers.length > 0) clean[profileKey] = likers;
    });
    return clean;
  } catch {
    return {};
  }
};

export const serializeProfileLikes = (map: ProfileLikesMap): string => {
  const clean: ProfileLikesMap = {};
  Object.entries(map || {}).forEach(([key, value]) => {
    const profileKey = normalizeLikeKey(key);
    if (!profileKey || !Array.isArray(value)) return;
    const likers = Array.from(
      new Set(value.map((v) => normalizeLikeKey(String(v))).filter(Boolean)),
    );
    if (likers.length > 0) clean[profileKey] = likers;
  });
  return JSON.stringify(clean);
};

/** Danh sách người đã thả tim cho một hồ sơ (đã loại trùng). */
export const profileLikersOf = (
  map: ProfileLikesMap,
  profileKey?: string | null,
): string[] => (map || {})[normalizeLikeKey(profileKey)] || [];

export const isProfileLikedBy = (
  map: ProfileLikesMap,
  profileKey?: string | null,
  viewerKey?: string | null,
): boolean => {
  const viewer = normalizeLikeKey(viewerKey);
  if (!viewer) return false;
  return profileLikersOf(map, profileKey).includes(viewer);
};

/**
 * Số lượt thích hiển thị = cảm ơn thật (bình chọn lời giải) + số người đã thả
 * tim hồ sơ. Mỗi người chỉ tính một lần nên bấm lại không thể nhân đôi con số.
 */
export const profileLikeCount = (
  thanksCount: number,
  likers?: string[] | null,
): number => {
  const thanks = Number.isFinite(thanksCount) ? Math.max(0, Math.round(thanksCount)) : 0;
  const unique = new Set((likers || []).map((v) => normalizeLikeKey(v)).filter(Boolean));
  return thanks + unique.size;
};

/**
 * Thả/bỏ tim. `liked = true` nghĩa là "hãy bảo đảm người này đã thả tim".
 * Nếu trạng thái đã đúng thì trả về map cũ nguyên vẹn → không bao giờ cộng dồn.
 */
export const setProfileLike = (
  map: ProfileLikesMap,
  profileKey?: string | null,
  viewerKey?: string | null,
  liked?: boolean,
): ProfileLikesMap => {
  const key = normalizeLikeKey(profileKey);
  const viewer = normalizeLikeKey(viewerKey);
  if (!key || !viewer) return map;

  const current = profileLikersOf(map, key);
  const exists = current.includes(viewer);
  const wanted = Boolean(liked);
  if (exists === wanted) return map;

  const nextList = wanted ? [...current, viewer] : current.filter((k) => k !== viewer);
  return { ...map, [key]: nextList };
};

/** Đảo trạng thái hiện tại (dùng khi chỉ có một nút tim). */
export const toggleProfileLike = (
  map: ProfileLikesMap,
  profileKey?: string | null,
  viewerKey?: string | null,
): ProfileLikesMap =>
  setProfileLike(map, profileKey, viewerKey, !isProfileLikedBy(map, profileKey, viewerKey));
