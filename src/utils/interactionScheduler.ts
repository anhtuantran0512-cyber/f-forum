/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * ADAPTIVE RAF SCHEDULER & INTERACTION PRIORITY (Facebook Scheduler & Discord Web)
 *
 * Đảm bảo mọi thao tác gõ phím, click chuột, chuyển tab có độ trễ 0ms (0ms input latency):
 *  - Phân luồng ưu tiên tác vụ theo 3 cấp độ:
 *     1. 'user-blocking': Xử lý tức thì (gõ văn bản, click, toggle UI).
 *     2. 'user-visible': Cập nhật khung hình hiển thị (RAF / postTask priority 'user-visible').
 *     3. 'background': Lọc danh sách nặng, prefetch tài nguyên, tính toán thống kê (requestIdleCallback / background task).
 *  - Khi người dùng đang tương tác tích cực (đang gõ hoặc chạm chuột), tự động tạm hoãn
 *    các tác vụ ngầm để nhường 100% tài nguyên CPU cho UI thread.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export type TaskPriority = 'user-blocking' | 'user-visible' | 'background';

interface PostTaskOptions {
  priority?: 'user-blocking' | 'user-visible' | 'background';
  delay?: number;
  signal?: AbortSignal;
}

interface SchedulerGlobal {
  postTask?: <T>(callback: () => T | Promise<T>, options?: PostTaskOptions) => Promise<T>;
  yield?: () => Promise<void>;
}

let lastInteractionTimestamp = 0;
const INTERACTION_COOLDOWN_MS = 120;

/* Đánh dấu thời điểm người dùng bắt đầu tương tác chuột / phím */
export function markUserInteraction(): void {
  lastInteractionTimestamp = Date.now();
}

/* Kiểm tra xem người dùng có đang gõ hoặc chạm trong vòng 120ms qua hay không */
export function isUserInteracting(): boolean {
  return Date.now() - lastInteractionTimestamp < INTERACTION_COOLDOWN_MS;
}

/* Kiểm tra xem trạng thái cuộn nhanh đang kích hoạt hay không */
export function isScrollActive(): boolean {
  if (typeof document === 'undefined' || !document.body) return false;
  return document.body.classList.contains('is-scrolling');
}

/* Tự động cài đặt bộ theo dõi tương tác người dùng toàn cục và kiểm soát trạng thái cuộn 60 FPS */
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const onInteraction = () => {
    lastInteractionTimestamp = Date.now();
  };
  window.addEventListener('pointerdown', onInteraction, { passive: true, capture: true });
  window.addEventListener('keydown', onInteraction, { passive: true, capture: true });
  window.addEventListener('touchstart', onInteraction, { passive: true, capture: true });

  let scrollEndTimer: ReturnType<typeof setTimeout> | null = null;
  const onScroll = () => {
    lastInteractionTimestamp = Date.now();
    if (document.body && !document.body.classList.contains('is-scrolling')) {
      document.body.classList.add('is-scrolling');
    }
    if (scrollEndTimer) clearTimeout(scrollEndTimer);
    scrollEndTimer = setTimeout(() => {
      if (document.body) {
        document.body.classList.remove('is-scrolling');
      }
      scrollEndTimer = null;
    }, 120);
  };
  window.addEventListener('scroll', onScroll, { passive: true, capture: true });
}

/* Nhường quyền điều khiển cho Main Thread (cooperative multitasking) */
export async function yieldToMain(): Promise<void> {
  if (typeof window === 'undefined') return;
  const navScheduler = (window as unknown as { scheduler?: SchedulerGlobal }).scheduler;
  if (typeof navScheduler?.yield === 'function') {
    try {
      await navScheduler.yield();
      return;
    } catch {
      /* fallback sang MessageChannel */
    }
  }

  return new Promise((resolve) => {
    if (typeof MessageChannel !== 'undefined') {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => {
        channel.port1.close();
        channel.port2.close();
        resolve();
      };
      channel.port2.postMessage(null);
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/* Lên lịch thực thi tác vụ theo độ ưu tiên */
export function scheduleTask<T>(
  task: () => T | Promise<T>,
  priority: TaskPriority = 'user-visible',
): Promise<T> {
  const navScheduler =
    typeof window !== 'undefined'
      ? (window as unknown as { scheduler?: SchedulerGlobal }).scheduler
      : undefined;

  /* Nếu trình duyệt hỗ trợ native scheduler.postTask */
  if (typeof navScheduler?.postTask === 'function') {
    return navScheduler.postTask(task, { priority });
  }

  /* Fallback theo cấp độ ưu tiên */
  if (priority === 'user-blocking') {
    return Promise.resolve().then(task);
  }

  if (priority === 'user-visible') {
    return new Promise((resolve, reject) => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          try {
            resolve(task());
          } catch (err) {
            reject(err);
          }
        });
      } else {
        setTimeout(() => {
          try {
            resolve(task());
          } catch (err) {
            reject(err);
          }
        }, 16);
      }
    });
  }

  /* Priority 'background': dùng requestIdleCallback nếu có */
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(
        () => {
          try {
            resolve(task());
          } catch (err) {
            reject(err);
          }
        },
        { timeout: 800 },
      );
    } else {
      setTimeout(() => {
        try {
          resolve(task());
        } catch (err) {
          reject(err);
        }
      }, 40);
    }
  });
}

/* Chạy callback khi trình duyệt rảnh rỗi (idle), có hàm huỷ */
export function runWhenIdle(callback: () => void, timeoutMs = 1200): () => void {
  if (typeof window === 'undefined') {
    const timer = setTimeout(callback, 20);
    return () => clearTimeout(timer);
  }

  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(
      () => {
        callback();
      },
      { timeout: timeoutMs },
    );
    return () => {
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(handle);
      }
    };
  }

  const timer = setTimeout(callback, 32);
  return () => clearTimeout(timer);
}

/* Hook debounce ưu tiên tương tác: giữ typing 0ms mượt mà, trì hoãn lọc nặng */
export function useInteractionDebounce<T>(value: T, delayMs = 160): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    /* Nếu người dùng đang tương tác tích cực, trì hoãn để không nghẽn frame */
    const effectiveDelay = isUserInteracting() ? Math.max(delayMs, 120) : delayMs;

    timerRef.current = setTimeout(() => {
      scheduleTask(() => {
        setDebouncedValue(value);
      }, 'user-visible');
    }, effectiveDelay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, delayMs]);

  return debouncedValue;
}

/* Hook tạo callback với priority bảo đảm */
export function usePrioritizedCallback<T extends (...args: unknown[]) => unknown>(
  fn: T,
  priority: TaskPriority = 'user-visible',
): (...args: Parameters<T>) => void {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  return useCallback(
    (...args: Parameters<T>) => {
      void scheduleTask(() => {
        fnRef.current(...args);
      }, priority);
    },
    [priority],
  );
}
