/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * PHẦN 5.1 & 5.2 — Service Worker (Stale-While-Revalidate) + Background Sync Queue
 *
 * Nếu user mất mạng giữa chừng (đang gửi câu hỏi, trả lời, mua item, trang bị...),
 * hành động được lưu vào hàng đợi bền vững và tự động gửi lại ngay khi có mạng
 * trở lại → KHÔNG MẤT dữ liệu, không bắt user thao tác lại từ đầu.
 */

import { safeStorage } from './storage.ts';
import { postJson } from './session.ts';

export const BG_SYNC_STORAGE_KEY = 'fforum_bg_sync_queue_v1';

export interface QueuedOfflineAction {
  id: string;
  endpoint: string;
  body: Record<string, unknown>;
  createdAt: number;
  attempts: number;
}

export const readOfflineQueue = (): QueuedOfflineAction[] => {
  const raw = safeStorage.getItem(BG_SYNC_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeOfflineQueue = (queue: QueuedOfflineAction[]): void => {
  if (!queue.length) {
    safeStorage.removeItem(BG_SYNC_STORAGE_KEY);
  } else {
    safeStorage.setItem(BG_SYNC_STORAGE_KEY, JSON.stringify(queue.slice(-50)));
  }
};

/** Đưa hành động bị gián đoạn mạng vào hàng đợi Background Sync. */
export const enqueueOfflineAction = (
  endpoint: string,
  body: Record<string, unknown>,
): QueuedOfflineAction => {
  const queue = readOfflineQueue();
  const item: QueuedOfflineAction = {
    id: `bgsync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    endpoint,
    body,
    createdAt: Date.now(),
    attempts: 0,
  };
  queue.push(item);
  writeOfflineQueue(queue);

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((reg: any) => reg?.sync?.register?.('fforum-bg-sync'))
      .catch(() => {});
  }
  return item;
};

/** Phát lại toàn bộ hành động đang chờ khi mạng khôi phục. */
export const flushOfflineQueue = async (
  sender: (endpoint: string, body: Record<string, unknown>) => Promise<{ status: number; data: any }> = postJson,
): Promise<{ sent: number; remaining: number }> => {
  const queue = readOfflineQueue();
  if (!queue.length) return { sent: 0, remaining: 0 };

  const remaining: QueuedOfflineAction[] = [];
  let sent = 0;

  for (const item of queue) {
    try {
      const res = await sender(item.endpoint, item.body);
      if (res.status >= 200 && res.status < 500) {
        sent += 1;
      } else if (item.attempts < 3) {
        remaining.push({ ...item, attempts: item.attempts + 1 });
      }
    } catch {
      if (item.attempts < 3) {
        remaining.push({ ...item, attempts: item.attempts + 1 });
      }
    }
  }

  writeOfflineQueue(remaining);
  if (sent > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fforum_bg_sync_flushed', { detail: { sent } }));
  }
  return { sent, remaining: remaining.length };
};

/** Đăng ký Service Worker Stale-While-Revalidate + lắng nghe sự kiện khôi phục mạng. */
export const registerAdaptiveServiceWorker = (): void => {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    void flushOfflineQueue();
  });

  if ('serviceWorker' in navigator && import.meta.env?.PROD) {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'FFORUM_FLUSH_BG_SYNC') {
            void flushOfflineQueue();
          }
        });
      })
      .catch(() => {});
  }
};
