/* Bản quyền trí tuệ thuộc về BroAmStuck */

/* ==========================================================================
   Lưới an toàn tương tác (interaction watchdog)
   --------------------------------------------------------------------------
   Yêu cầu cứng của F-Forum: giao diện KHÔNG BAO GIỜ được "đứng hình" — bấm gì
   cũng không mở. Nguyên nhân phổ biến nhất của kiểu lỗi đó là một lớp phủ
   (overlay) phủ kín màn hình nhưng lại trong suốt/ẩn, nằm trên cùng và vẫn
   bắt sự kiện chuột.

   Watchdog này chỉ can thiệp khi hội đủ cả ba điều kiện — tức là chắc chắn
   KHÔNG thể là thứ cần bắt chuột:
     1. Phủ ≥ 96% chiều rộng và chiều cao khung nhìn,
     2. Độ mờ thực tế ≤ 0.02 (coi như vô hình),
     3. Định vị fixed/absolute (lớp phủ toàn màn hình).
   Bị "nuốt" 2 lần liên tiếp vào cùng một phần tử như vậy → tự đặt
   `pointer-events: none` để trả lại khả năng bấm cho người dùng, kèm cảnh báo
   trong console để còn truy vết.
   ========================================================================== */

const INVISIBLE_OPACITY = 0.02;
const VIEWPORT_COVERAGE = 0.96;
const HITS_BEFORE_HEAL = 2;

export const NEUTRALIZED_EVENT = 'fforum_overlay_neutralized';

const describeElement = (el: Element): string => {
  const tag = el.tagName.toLowerCase();
  const raw = typeof el.className === 'string' ? el.className : '';
  const classes = raw.trim().split(/\s+/).filter(Boolean).slice(0, 4).join('.');
  return classes ? `${tag}.${classes}` : tag;
};

export function installInteractionWatchdog(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  let lastTarget: Element | null = null;
  let hits = 0;

  const reset = () => {
    lastTarget = null;
    hits = 0;
  };

  const onPointerDown = (event: PointerEvent) => {
    /* Chuột phải / thao tác hệ thống thì bỏ qua */
    if (event.button !== 0) return;

    const el = document.elementFromPoint(event.clientX, event.clientY);
    if (!el || el === document.documentElement || el === document.body) {
      reset();
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = el.getBoundingClientRect();
    const coversViewport =
      rect.width >= vw * VIEWPORT_COVERAGE && rect.height >= vh * VIEWPORT_COVERAGE;
    if (!coversViewport) {
      reset();
      return;
    }

    const style = window.getComputedStyle(el);
    const isFixedLike = style.position === 'fixed' || style.position === 'absolute';
    const isInvisible = Number(style.opacity) <= INVISIBLE_OPACITY;
    if (!isFixedLike || !isInvisible) {
      reset();
      return;
    }

    if (lastTarget === el) hits += 1;
    else {
      lastTarget = el;
      hits = 1;
    }

    if (hits < HITS_BEFORE_HEAL) return;

    (el as HTMLElement).style.setProperty('pointer-events', 'none', 'important');
    console.warn(
      '[F-Forum] Đã tự gỡ một lớp phủ vô hình đang chặn chuột — hãy báo lại lớp phủ này:',
      el,
    );
    window.dispatchEvent(
      new CustomEvent(NEUTRALIZED_EVENT, { detail: { target: describeElement(el) } }),
    );
    reset();
  };

  document.addEventListener('pointerdown', onPointerDown, true);
  return () => document.removeEventListener('pointerdown', onPointerDown, true);
}

export default installInteractionWatchdog;
