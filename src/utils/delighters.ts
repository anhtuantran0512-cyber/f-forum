/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * VÒNG NÂNG CẤP R3 · Delighters toàn cục.
 * Một listener `pointerdown` uỷ quyền duy nhất cho cả ứng dụng (không gắn từng nút):
 *  - mọi phần tử bấm được → tiếng tick siêu nhẹ (tắt được ở Cài đặt → Hiệu ứng âm thanh);
 *  - nhóm nút hành động chính → gợn sóng từ đúng điểm chạm.
 * Bỏ qua phần tử disabled, vùng có data-silent (đã có âm riêng như đèn pin), thanh trượt.
 */
import { playUiTick } from './audio.ts';
import { spawnRipple } from './ripple.ts';

export const TICK_SELECTOR =
  'button, [role="button"], [role="tab"], [role="menuitem"], [role="switch"], a[href], summary, input[type="checkbox"], input[type="radio"]';
/** Nút có tooltip/badge tràn viền KHÔNG nằm ở đây (gợn sóng tạm đặt overflow: hidden). */
export const RIPPLE_SELECTOR = '.auth-submit, .ff-orb, .ff-deck__btn, .pc-12-btn, .ff-explore-tile, [data-ripple]';
export const SILENT_SELECTOR = '[data-silent], input[type="range"]';

export function installDelighters(root: Document = document): () => void {
  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const origin = event.target instanceof Element ? event.target : null;
    const el = origin?.closest<HTMLElement>(TICK_SELECTOR);
    if (!el || el.matches(':disabled, [aria-disabled="true"]') || el.closest(SILENT_SELECTOR)) return;
    playUiTick();
    if (el.matches(RIPPLE_SELECTOR)) spawnRipple(el, event);
  };
  root.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
  return () => root.removeEventListener('pointerdown', onPointerDown, { capture: true });
}
