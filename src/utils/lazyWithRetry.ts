/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* Kiểu props nào cũng nhận — giống hệt cách React.lazy tự khai báo kiểu. */
type AnyProps = any;

/* ==========================================================================
   Nạp module theo kiểu "có lưới an toàn"
   --------------------------------------------------------------------------
   Vì sao cần: app chia nhỏ gói (lazy chunk). Nếu một chunk lỗi mạng, hoặc dev
   server vừa đổi file đúng lúc trình duyệt đang tải (import bị hỏng), React sẽ
   nhận promise bị reject và — vì không có error boundary — cả cây giao diện có
   thể "chết", biểu hiện đúng như người dùng gặp: bấm gì cũng không phản hồi.

   Cách xử lý:
   1. Thử lại 1 lần sau 400ms (phần lớn lỗi chỉ là nhất thời).
   2. Vẫn lỗi → tự tải lại trang ĐÚNG MỘT LẦN cho mỗi chunk (đánh dấu bằng
      sessionStorage) để dựng lại module graph; nếu vẫn lỗi thì ném ra
      AppErrorBoundary để hiện nút "Tải lại" thay vì để trang chết im lặng.
   ========================================================================== */

const RELOAD_FLAG_PREFIX = 'fforum_chunk_reload_';
/* Mỗi chunk được một khoá riêng (thứ tự khai báo trong App là cố định, nên khoá
   vẫn ổn định qua các lần tải lại trang). */
let autoChunkId = 0;

const markReloadAttempt = (key: string): boolean => {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return false;
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, '1');
    return true;
  } catch {
    return false;
  }
};

const clearReloadFlag = (key: string): void => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
};

export function lazyWithRetry<T extends ComponentType<AnyProps>>(
  factory: () => Promise<{ default: T }>,
  name?: string,
): LazyExoticComponent<T> {
  autoChunkId += 1;
  const flagKey = `${RELOAD_FLAG_PREFIX}${name ?? `auto-${autoChunkId}`}`;

  return lazy(() => {
    const attempt = () =>
      factory().then((mod) => {
        /* Nạp được rồi thì xoá cờ, lần sau có lỗi vẫn được phép thử lại */
        clearReloadFlag(flagKey);
        return mod;
      });

    return attempt().catch(
      () =>
        new Promise<{ default: T }>((_resolve, reject) => {
          window.setTimeout(() => {
            attempt().catch((error) => {
              if (markReloadAttempt(flagKey)) {
                window.location.reload();
                return;
              }
              reject(error);
            });
          }, 400);
        }),
    );
  });
}

export default lazyWithRetry;
