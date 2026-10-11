/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Liên kết chia sẻ câu hỏi KIỂU CŨ: `?q=<id>` mở thẳng câu hỏi ở Sàn hỏi đáp.
 *
 * Từ khi chi tiết câu hỏi là một trang riêng, địa chỉ chuẩn là `/hoi-dap/<id>-<slug>` (xem utils/qaRoute.ts).
 * Những liên kết `?q=` đã lỡ chia sẻ vẫn dùng được: App đọc chúng bằng `readSharedQuestionId`, đổi sang đường dẫn
 * mới bằng `replaceState` (utils/qaRouter.ts) nên người nhận không thấy `?q=` trên thanh địa chỉ.
 * Id được lọc chặt (chữ, số, gạch nối/gạch dưới, ≤ 80 ký tự) trước khi dùng.
 */
export const SHARE_QUERY_KEY = 'q';
const SAFE_ID = /^[A-Za-z0-9_-]{1,80}$/;

export const readSharedQuestionId = (search: string): string | null => {
  const id = new URLSearchParams(search).get(SHARE_QUERY_KEY);
  return id && SAFE_ID.test(id) ? id : null;
};

/** @deprecated Dùng `buildQuestionPageUrl` (utils/qaRoute.ts). Chỉ còn để dựng/kiểm thử định dạng liên kết cũ. */
export const buildQuestionShareUrl = (id: string, origin: string, pathname: string): string =>
  `${origin}${pathname}?${SHARE_QUERY_KEY}=${encodeURIComponent(id)}`;

/** Đường dẫn tương đối sau khi gỡ `?q=` (dùng cho history.replaceState). */
export const stripSharedQuestionParam = (href: string): string => {
  const url = new URL(href);
  url.searchParams.delete(SHARE_QUERY_KEY);
  return `${url.pathname}${url.search}${url.hash}`;
};
