/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * VÒNG NÂNG CẤP R4 · Hiệu năng — gộp sự kiện dày (scroll/resize/pointermove) về tối
 * đa MỘT lần xử lý mỗi khung hình. Lần gọi cuối cùng trong khung luôn được xử lý
 * (không mất trạng thái cuối như debounce kiểu "bỏ qua"). Có `cancel()` để dọn
 * trong cleanup của effect.
 */
export interface RafThrottled<T extends unknown[]> {
  (...args: T): void;
  cancel: () => void;
}

export function rafThrottle<T extends unknown[]>(fn: (...args: T) => void): RafThrottled<T> {
  let frame = 0;
  let lastArgs: T | null = null;
  const schedule =
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16) as unknown as number;
  const cancelFrame =
    typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : (id: number) => clearTimeout(id);
  const throttled = ((...args: T) => {
    lastArgs = args;
    if (frame) return;
    frame = schedule(() => {
      frame = 0;
      const callArgs = lastArgs as T;
      lastArgs = null;
      fn(...callArgs);
    });
  }) as RafThrottled<T>;
  throttled.cancel = () => {
    if (frame) cancelFrame(frame);
    frame = 0;
    lastArgs = null;
  };
  return throttled;
}
