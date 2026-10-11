/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { flushSync } from 'react-dom';

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => { finished: Promise<void> };
};

/** Tôn trọng cả cài đặt hệ điều hành lẫn công tắc "giảm chuyển động" của chính app. */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return true;
  return (
    document.documentElement.classList.contains('reduce-motion') ||
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  );
};

export interface SharedElementOptions {
  /** Phần tử ở trang cũ sẽ "phóng to" thành phần tử cùng tên ở trang mới (vd. thẻ câu hỏi → đầu trang chi tiết). */
  element?: HTMLElement | null;
  name?: string;
  /**
   * Trang mới có thể chưa dựng xong ngay sau `update` (vd. thành phần nạp lười luôn "treo" ở lần render đầu). Khi có hàm này,
   * khung "sau" chỉ được chụp khi nó trả true (hoặc hết 500ms) — nếu không, phần tử dùng chung sẽ không có cặp để khớp.
   */
  until?: () => boolean;
}

const UNTIL_TIMEOUT_MS = 500;

/* Dùng setTimeout chứ không phải requestAnimationFrame: lúc chờ callback, trình duyệt tạm dừng vẽ (rendering suppressed)
   nên rAF không chạy; timer và bộ lập lịch của React (MessageChannel) thì vẫn chạy. */
const waitUntil = (condition: () => boolean): Promise<void> =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    const poll = () => {
      if (condition() || Date.now() - startedAt > UNTIL_TIMEOUT_MS) resolve();
      else window.setTimeout(poll, 16);
    };
    poll();
  });

/**
 * Chạy `update` (đổi route → DOM mới) kèm chuyển cảnh phần tử dùng chung (Shared Element / View Transitions API).
 * Trình duyệt không hỗ trợ hoặc người dùng giảm chuyển động → chạy thẳng, trang mới tự có hiệu ứng mờ + trượt nhẹ.
 * Quy tắc CSS của chuyển cảnh chỉ bật khi <html> có lớp `ff-vt-qa` (xem QADetail.css) nên không ảnh hưởng chỗ khác.
 */
export function runWithSharedElementTransition(update: () => void, options: SharedElementOptions = {}): void {
  const { element, name = 'qa-hero', until } = options;
  const doc = document as ViewTransitionDocument;
  if (typeof doc.startViewTransition !== 'function' || prefersReducedMotion()) {
    update();
    return;
  }
  const root = document.documentElement;
  if (element) element.style.setProperty('view-transition-name', name);
  root.classList.add('ff-vt-qa');
  const cleanup = () => {
    element?.style.removeProperty('view-transition-name');
    root.classList.remove('ff-vt-qa');
  };
  try {
    /* flushSync: DOM của trang mới phải sẵn sàng ngay trong callback để trình duyệt chụp trạng thái "sau". */
    const transition = doc.startViewTransition(async () => {
      flushSync(update);
      if (until) await waitUntil(until);
    });
    void transition.finished.then(cleanup, cleanup);
  } catch {
    cleanup();
    update();
  }
}
