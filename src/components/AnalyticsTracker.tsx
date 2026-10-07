/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { useEffect, useRef, type FC } from 'react';
import type { DimensionView } from '../types';
import { authHeaders } from '../utils/session';
import { safeStorage } from '../utils/storage';

const VISITOR_KEY = 'fforum_analytics_visitor_v1';
const SESSION_KEY = 'fforum_analytics_tab_session_v1';
const SESSION_FALLBACK_KEY = 'fforum_analytics_tab_session_fallback_v1';
const HEARTBEAT_MS = 30_000;

const createId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(24);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    /* Trình duyệt cũ/chế độ riêng tư có thể chặn Web Crypto. */
  }
  return `ff${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
};

const readOrCreate = (read: () => string | null, write: (value: string) => void): string => {
  try {
    const existing = read();
    if (existing && /^[A-Za-z0-9_-]{20,100}$/.test(existing)) return existing;
  } catch {
    /* Không chặn ứng dụng nếu trình duyệt tắt storage. */
  }
  const next = createId();
  try { write(next); } catch { /* phiên hiện tại vẫn tiếp tục bằng mã trong RAM */ }
  return next;
};

const getSessionStorage = (): Storage | null => {
  try { return typeof window === 'undefined' ? null : window.sessionStorage; }
  catch { return null; }
};

interface AnalyticsTrackerProps {
  /** Chỉ dùng để nhận biết lúc token đăng nhập vừa thay đổi; không gửi email. */
  accountKey?: string;
  view: DimensionView;
}

/**
 * Theo dõi lượt mở, thời gian tab đang hiện và lượt chuyển phân khu.
 * Không thu IP, dấu vân tay thiết bị, nội dung trang hay lịch sử nhập liệu.
 * Mã khách ngẫu nhiên được băm tiếp ở máy chủ trước khi lưu.
 */
export const AnalyticsTracker: FC<AnalyticsTrackerProps> = ({ accountKey, view }) => {
  const lastViewRef = useRef<DimensionView | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const visitorId = readOrCreate(
      () => safeStorage.getItem(VISITOR_KEY),
      (value) => safeStorage.setItem(VISITOR_KEY, value),
    );
    const sessionStorage = getSessionStorage();
    const sessionId = readOrCreate(
      () => sessionStorage?.getItem(SESSION_KEY) || safeStorage.getItem(SESSION_FALLBACK_KEY),
      (value) => {
        if (sessionStorage) sessionStorage.setItem(SESSION_KEY, value);
        else safeStorage.setItem(SESSION_FALLBACK_KEY, value);
      },
    );
    let active = document.visibilityState === 'visible';
    let lastTickAt = Date.now();
    let disposed = false;

    const send = (type: 'visit' | 'heartbeat' | 'page_view', details: Record<string, unknown> = {}) => {
      if (disposed) return;
      const payload = {
        type,
        visitorId,
        sessionId,
        eventId: createId(),
        ...details,
      };
      void fetch('/api/analytics/track', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
        keepalive: type === 'heartbeat',
      }).catch(() => {
        /* Thống kê không được làm gián đoạn trải nghiệm nếu máy chủ tạm mất kết nối. */
      });
    };

    const flushVisibleTime = () => {
      if (!active) return;
      const now = Date.now();
      const elapsed = Math.min(60, Math.max(0, Math.floor((now - lastTickAt) / 1000)));
      lastTickAt = now;
      if (elapsed > 0) send('heartbeat', { activeSeconds: elapsed });
    };

    send('visit');
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') flushVisibleTime();
      else lastTickAt = Date.now();
    }, HEARTBEAT_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushVisibleTime();
        active = false;
      } else {
        active = true;
        lastTickAt = Date.now();
      }
    };
    const onPageHide = () => flushVisibleTime();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      flushVisibleTime();
      disposed = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [accountKey]);

  useEffect(() => {
    if (lastViewRef.current === view) return;
    lastViewRef.current = view;
    const visitorId = safeStorage.getItem(VISITOR_KEY);
    const sessionStorage = getSessionStorage();
    const sessionId = sessionStorage?.getItem(SESSION_KEY) || safeStorage.getItem(SESSION_FALLBACK_KEY);
    if (!visitorId || !sessionId) return;
    void fetch('/api/analytics/track', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        type: 'page_view',
        visitorId,
        sessionId,
        eventId: createId(),
        view,
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [accountKey, view]);

  return null;
};

export default AnalyticsTracker;
