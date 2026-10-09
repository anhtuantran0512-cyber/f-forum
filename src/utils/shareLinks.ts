/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Liên kết chia sẻ câu hỏi: `?q=<id>` mở thẳng câu hỏi ở Sàn hỏi đáp.
 * Id được lọc chặt (chữ, số, gạch nối/gạch dưới, ≤ 80 ký tự) trước khi dùng.
 */
export const SHARE_QUERY_KEY = 'q';
const SAFE_ID = /^[A-Za-z0-9_-]{1,80}$/;

export const readSharedQuestionId = (search: string): string | null => {
  const id = new URLSearchParams(search).get(SHARE_QUERY_KEY);
  return id && SAFE_ID.test(id) ? id : null;
};

export const buildQuestionShareUrl = (id: string, origin: string, pathname: string): string =>
  `${origin}${pathname}?${SHARE_QUERY_KEY}=${encodeURIComponent(id)}`;

/** Đường dẫn tương đối sau khi gỡ `?q=` (dùng cho history.replaceState). */
export const stripSharedQuestionParam = (href: string): string => {
  const url = new URL(href);
  url.searchParams.delete(SHARE_QUERY_KEY);
  return `${url.pathname}${url.search}${url.hash}`;
};
