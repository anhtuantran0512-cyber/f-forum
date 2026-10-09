/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * EPIC 5 — phần THUẦN của lớp răn đe DevTools (không phụ thuộc React) để kiểm thử
 * trực tiếp bằng Node. Hook dùng chúng nằm ở ./devtoolsGuard.ts.
 */

export const SECURITY_NOTICE_EVENT = 'fforum_security_notice';
export type SecurityNoticeKind = 'shortcut' | 'context-menu' | 'devtools';

export const emitSecurityNotice = (kind: SecurityNoticeKind): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SECURITY_NOTICE_EVENT, { detail: { kind } }));
};

type ShortcutLike = Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>;

/** Tổ hợp phím mở DevTools / console / xem nguồn trang. */
export const isDevtoolsShortcut = (e: ShortcutLike): boolean => {
  if (e.key === 'F12' || e.code === 'F12') return true;
  const code = e.code || '';
  if (e.ctrlKey && e.shiftKey && ['KeyI', 'KeyJ', 'KeyC', 'KeyK'].includes(code)) return true;
  if (e.ctrlKey && !e.shiftKey && !e.altKey && code === 'KeyU') return true;
  if (e.metaKey && e.altKey && ['KeyI', 'KeyJ', 'KeyC', 'KeyU', 'KeyK'].includes(code)) return true;
  if (e.metaKey && e.shiftKey && code === 'KeyC') return true;
  return false;
};

export interface ViewportSnapshot {
  innerWidth: number;
  innerHeight: number;
  outerWidth: number;
  outerHeight: number;
  dpr: number;
}

/**
 * DevTools dạng dock làm vùng nhìn (inner) co lại ĐỘT NGỘT trong khi cửa sổ
 * (outer) giữ nguyên và tỉ lệ điểm ảnh không đổi (nếu đổi là người dùng zoom).
 * Heuristic cũ so `outerWidth` với `screen.width` nên báo nhầm với MỌI cửa sổ
 * không phóng to tối đa — đã bỏ.
 */
export const isLikelyDevtoolsResize = (prev: ViewportSnapshot, next: ViewportSnapshot, threshold = 160): boolean => {
  if (prev.outerWidth !== next.outerWidth || prev.outerHeight !== next.outerHeight) return false;
  if (Math.abs(prev.dpr - next.dpr) > 0.001) return false;
  return prev.innerWidth - next.innerWidth >= threshold || prev.innerHeight - next.innerHeight >= threshold;
};
