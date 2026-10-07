/* Bản quyền trí tuệ thuộc về BroAmStuck */

/* ==========================================================================
   CÂU HỎI ĐÃ LƯU — toàn bộ phép tính nằm ở ĐÂY, thuần tuý (không import gì)
   --------------------------------------------------------------------------
   Tách theo đúng khuôn của `profileLikes.ts`: mọi hàm nhận TRẠNG THÁI MONG MUỐN
   (muốn lưu / muốn bỏ) nên gọi lặp lại bao nhiêu lần kết quả vẫn chỉ đúng một
   lần (idempotent). Nhờ vậy nút bấm có bị double-fire (StrictMode, double-click,
   hai kênh BroadcastChannel cùng đưa về) thì danh sách cũng không bị lặp.

   Tệp này không import gì nên test được trực tiếp bằng node (tests/saved-questions).
   ========================================================================== */

export const SAVED_QUESTIONS_KEY = 'fforum_saved_questions_v1';

/** Mỗi người dùng một danh sách riêng, khoá theo email/ID đã chuẩn hoá. */
export type SavedQuestionsMap = Record<string, string[]>;

/** Trần danh sách: giữ mới nhất, tránh localStorage phình vô hạn. */
export const MAX_SAVED_QUESTIONS = 200;

export const normalizeSavedKey = (value?: string | null): string =>
  String(value || '').trim().toLowerCase();

/** Đọc chuỗi JSON từ storage → map sạch, bỏ mọi dữ liệu rác. */
export const parseSavedQuestions = (raw?: string | null): SavedQuestionsMap => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const clean: SavedQuestionsMap = {};
    Object.entries(parsed as Record<string, unknown>).forEach(([key, value]) => {
      const ownerKey = normalizeSavedKey(key);
      if (!ownerKey || !Array.isArray(value)) return;
      const ids = cleanIds(value);
      if (ids.length > 0) clean[ownerKey] = ids;
    });
    return clean;
  } catch {
    /* JSON cắt cụt (hết dung lượng, ghi dở) thì coi như chưa lưu gì,
       đừng để cả trang hỏi đáp vỡ theo. */
    return {};
  }
};

/** Loại trùng, bỏ rác, và cắt về trần — giữ các mục ĐẦU (mới lưu nhất). */
const cleanIds = (value: unknown[]): string[] =>
  Array.from(new Set(value.map((v) => String(v ?? '').trim()).filter(Boolean))).slice(
    0,
    MAX_SAVED_QUESTIONS,
  );

export const serializeSavedQuestions = (map: SavedQuestionsMap): string => {
  const clean: SavedQuestionsMap = {};
  Object.entries(map || {}).forEach(([key, value]) => {
    const ownerKey = normalizeSavedKey(key);
    if (!ownerKey || !Array.isArray(value)) return;
    const ids = cleanIds(value);
    if (ids.length > 0) clean[ownerKey] = ids;
  });
  return JSON.stringify(clean);
};

/** Danh sách mã câu hỏi đã lưu của một người (đã loại trùng). */
export const savedIdsOf = (
  map: SavedQuestionsMap,
  ownerKey?: string | null,
): string[] => (map || {})[normalizeSavedKey(ownerKey)] || [];

export const isQuestionSaved = (
  map: SavedQuestionsMap,
  ownerKey?: string | null,
  questionId?: string | null,
): boolean => {
  const owner = normalizeSavedKey(ownerKey);
  const id = String(questionId || '').trim();
  if (!owner || !id) return false;
  return savedIdsOf(map, owner).includes(id);
};

/**
 * Trả về map MỚI với câu hỏi được lưu hoặc bỏ lưu.
 *
 * Không sửa map cũ (giữ bất biến để React thấy tham chiếu đổi và render lại).
 * Mục mới được đưa lên ĐẦU danh sách để "mới lưu nhất" hiện trước.
 */
export const toggleSavedQuestion = (
  map: SavedQuestionsMap,
  ownerKey?: string | null,
  questionId?: string | null,
  wantSaved = true,
): SavedQuestionsMap => {
  const owner = normalizeSavedKey(ownerKey);
  const id = String(questionId || '').trim();
  /* Thiếu chủ sở hữu hoặc mã câu hỏi thì trả nguyên map — không tạo khoá rác. */
  if (!owner || !id) return map || {};

  const current = savedIdsOf(map, owner);
  const alreadySaved = current.includes(id);
  if (alreadySaved === wantSaved) return map || {};

  const next = wantSaved
    ? [id, ...current.filter((x) => x !== id)].slice(0, MAX_SAVED_QUESTIONS)
    : current.filter((x) => x !== id);

  const result = { ...(map || {}) };
  if (next.length === 0) {
    /* Bỏ lưu mục cuối thì xoá luôn khoá, đừng để lại mảng rỗng trong storage. */
    delete result[owner];
  } else {
    result[owner] = next;
  }
  return result;
};

/** Dọn các mục trỏ tới câu hỏi không còn tồn tại (đã bị xoá). */
export const pruneSavedQuestions = (
  map: SavedQuestionsMap,
  existingQuestionIds: Iterable<string>,
): SavedQuestionsMap => {
  const alive = new Set(Array.from(existingQuestionIds).map((id) => String(id)));
  const result: SavedQuestionsMap = {};
  let changed = false;
  Object.entries(map || {}).forEach(([owner, ids]) => {
    const kept = ids.filter((id) => alive.has(id));
    if (kept.length !== ids.length) changed = true;
    if (kept.length > 0) result[owner] = kept;
  });
  /* Không đổi gì thì trả nguyên map để tránh một lần ghi storage vô ích. */
  return changed ? result : map || {};
};
