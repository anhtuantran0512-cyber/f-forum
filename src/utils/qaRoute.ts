/* Bản quyền trí tuệ thuộc về BroAmStuck */

/* ==========================================================================
   ĐỊNH TUYẾN TRANG HỎI ĐÁP — module THUẦN TUÝ (không import gì)
   --------------------------------------------------------------------------
   Trước đây chi tiết câu hỏi là một MODAL: không có địa chỉ riêng, nút Back
   của trình duyệt không dùng được, và muốn chia sẻ phải gửi kèm `?q=<id>`.
   Nay mỗi câu hỏi là một TRANG có URL riêng:

       /hoi-dap                       → danh sách (feed)
       /hoi-dap/<id>-<slug>           → chi tiết  (vd. /hoi-dap/q-1788…-ab12c-dao-ham-pt-x3-2x2)

   Vì sao phần "slug" chỉ để đọc cho đẹp còn `id` mới là khoá thật:
     • id của hệ thống có dạng `q-<mốc thời gian>-<5 ký tự>` — bản thân nó đã
       chứa dấu gạch nối, nên KHÔNG thể tách `<id>-<slug>` bằng cách cắt ở dấu
       gạch nối đầu tiên. Thay vào đó khớp theo TIỀN TỐ id dài nhất
       (`resolveQuestionKey`).
     • Admin sửa tiêu đề thì slug đổi, nhưng đường dẫn cũ vẫn mở đúng bài.

   Tệp này không import gì nên test được trực tiếp bằng node (tests/qa-detail-page).
   ========================================================================== */

export const QA_BASE_PATH = '/hoi-dap';

/** Ký tự hợp lệ của một đoạn đường dẫn câu hỏi (id + slug); chặn mọi thứ lạ trước khi dùng. */
const KEY_PATTERN = /^[A-Za-z0-9_-]{1,160}$/;

/** Slug dài tối đa chừng này (không tính id) — đủ đọc, không làm URL dài lê thê. */
const SLUG_MAX_LENGTH = 60;

export type QaRoute = { kind: 'list' } | { kind: 'detail'; key: string };

/**
 * Tiêu đề tiếng Việt → slug ASCII.
 *  - NFKD để chữ mũ/phân số thành số thường: `x³+2x²` → `x3+2x2` (đúng ví dụ trong đặc tả).
 *  - `đ/Đ` không tách được dấu nên đổi tay.
 *  - Quá dài thì cắt theo ranh giới từ (trừ khi làm mất hơn nửa).
 */
export const slugifyVi = (input: unknown, maxLength: number = SLUG_MAX_LENGTH): string => {
  const base = String(input ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (base.length <= maxLength) return base;
  const cut = base.slice(0, maxLength);
  const lastDash = cut.lastIndexOf('-');
  const trimmed = base[maxLength] === '-' || lastDash <= maxLength * 0.5 ? cut : cut.slice(0, lastDash);
  return trimmed.replace(/-+$/g, '');
};

/** `<id>-<slug>`; tiêu đề không có chữ/số nào (toàn ký hiệu) thì chỉ còn `<id>`. */
export const buildQuestionKey = (id: string, title: string = ''): string => {
  const slug = slugifyVi(title);
  return slug ? `${id}-${slug}` : id;
};

export const buildQuestionPath = (id: string, title: string = ''): string =>
  `${QA_BASE_PATH}/${encodeURIComponent(buildQuestionKey(id, title))}`;

/** Địa chỉ đầy đủ để chia sẻ. */
export const buildQuestionPageUrl = (origin: string, id: string, title: string = ''): string =>
  `${origin}${buildQuestionPath(id, title)}`;

/**
 * Phân tích `location.pathname`.
 *  - null: không thuộc Hỏi đáp.
 *  - `list`: `/hoi-dap`, `/hoi-dap/`, hoặc đoạn thứ hai hỏng/không an toàn (thà về danh sách còn hơn trang trắng).
 */
export const parseQaPath = (pathname: string): QaRoute | null => {
  const clean = String(pathname || '').replace(/\/+$/, '') || '/';
  if (clean === QA_BASE_PATH) return { kind: 'list' };
  if (!clean.startsWith(`${QA_BASE_PATH}/`)) return null;
  const segment = clean.slice(QA_BASE_PATH.length + 1).split('/')[0];
  let key = '';
  try {
    key = decodeURIComponent(segment);
  } catch {
    return { kind: 'list' };
  }
  return KEY_PATTERN.test(key) ? { kind: 'detail', key } : { kind: 'list' };
};

export const isQaPath = (pathname: string): boolean => parseQaPath(pathname) !== null;

/**
 * Đoạn đường dẫn `<id>-<slug>` → id thật của câu hỏi, hoặc null nếu không có câu nào khớp.
 * Id dài nhất khớp tiền tố thắng (id này có thể là tiền tố của id khác).
 */
export const resolveQuestionKey = (key: string, ids: Iterable<string>): string | null => {
  let best: string | null = null;
  for (const id of ids) {
    if (!id) continue;
    if (key === id || key.startsWith(`${id}-`)) {
      if (best === null || id.length > best.length) best = id;
    }
  }
  return best;
};
