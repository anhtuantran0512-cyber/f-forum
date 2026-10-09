/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { safeStorage } from './storage.ts';
import { signalSessionSuspect } from './sessionWatch.ts';

/* ==========================================================================
   Phiên đăng nhập phía client
   --------------------------------------------------------------------------
   Máy chủ xác thực mọi thao tác ghi bằng token có chữ ký (HMAC). Gom vào một
   chỗ để không còn cảnh mỗi fetch tự chế header riêng.

   EPIC 5 — hai chế độ phiên:
   • COOKIE (ưu tiên): token nằm trong cookie `__Host-ff_session` HttpOnly; Secure;
     SameSite=Strict do máy chủ đặt. JavaScript KHÔNG đọc được token → một lỗ XSS
     không thể lấy cắp phiên mang đi nơi khác. localStorage chỉ giữ một "gợi ý"
     không bí mật (hạn dùng) để biết đang đăng nhập.
   • BEARER (dự phòng): như trước — token trong localStorage, gắn vào header
     `Authorization`. Dùng khi chạy HTTP thường, khi app bị nhúng trong iframe
     khác site (trình duyệt không lưu cookie SameSite=Strict ở đó — ví dụ khung
     xem trước), hoặc khi trình duyệt chặn cookie.
   Chế độ cookie chỉ được bật sau khi KIỂM CHỨNG cookie thật sự hoạt động.
   ========================================================================== */

export const AUTH_TOKEN_KEY = 'f_forum_auth_token';
/** Gợi ý phiên cookie: `{ transport: 'cookie', expiresAt }` — không chứa bí mật. */
export const SESSION_HINT_KEY = 'f_forum_session_hint';
/** Header xin máy chủ cấp phiên bằng cookie HttpOnly. */
export const SESSION_TRANSPORT_HEADER = 'X-FForum-Session';

interface SessionHint {
  transport: 'cookie';
  expiresAt: number;
}

const readHint = (): SessionHint | null => {
  const raw = safeStorage.getItem(SESSION_HINT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.transport === 'cookie' && typeof parsed.expiresAt === 'number' && Number.isFinite(parsed.expiresAt)) {
      return { transport: 'cookie', expiresAt: parsed.expiresAt };
    }
  } catch {
    /* gợi ý hỏng → coi như không có */
  }
  return null;
};

const writeHint = (expiresAt: number): void => {
  safeStorage.setItem(SESSION_HINT_KEY, JSON.stringify({ transport: 'cookie', expiresAt }));
};

export const getAuthToken = (): string | null => safeStorage.getItem(AUTH_TOKEN_KEY);

export const setAuthToken = (token?: string | null): void => {
  if (token) safeStorage.setItem(AUTH_TOKEN_KEY, token);
  else safeStorage.removeItem(AUTH_TOKEN_KEY);
};

/** Xoá dấu vết phiên phía client (cookie HttpOnly phải nhờ máy chủ xoá — xem requestServerLogout). */
export const clearAuthToken = (): void => {
  safeStorage.removeItem(AUTH_TOKEN_KEY);
  safeStorage.removeItem(SESSION_HINT_KEY);
};

/**
 * Có nên xin cookie HttpOnly không?
 * Cần HTTPS (cookie Secure), cookie được bật, và app chạy ở cửa sổ chính — trong
 * iframe khác site trình duyệt không lưu/gửi cookie SameSite=Strict.
 */
export const canUseCookieSession = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  try {
    return window.location.protocol === 'https:' && navigator.cookieEnabled && window.self === window.top;
  } catch {
    return false;
  }
};

/** Đang dùng phiên cookie còn hạn. */
export const usesCookieSession = (now: number = Date.now()): boolean => {
  const hint = readHint();
  return Boolean(hint && hint.expiresAt > now);
};

/** Có dấu vết phiên nào để khôi phục không (token Bearer hoặc gợi ý cookie). */
export const hasStoredSession = (): boolean => Boolean(getAuthToken()) || Boolean(readHint());

/** Giải mã hạn dùng (`exp`, ms) từ phần claims của token `f_token_<b64url>.<sig>`. */
export const decodeTokenExpiry = (token?: string | null): number | null => {
  if (!token || typeof token !== 'string') return null;
  try {
    const raw = token.startsWith('f_token_') ? token.slice('f_token_'.length) : token;
    const body = raw.split('.')[0];
    if (!body) return null;
    const base64 = body.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = JSON.parse(atob(padded));
    return typeof json?.exp === 'number' && Number.isFinite(json.exp) ? json.exp : null;
  } catch {
    return null;
  }
};

/** Hạn dùng của phiên hiện tại (ms) hoặc null nếu không xác định được. */
export const getSessionExpiry = (): number | null => {
  const hint = readHint();
  if (hint) return hint.expiresAt;
  return decodeTokenExpiry(getAuthToken());
};

/** Kiểm tra hạn token ngay ở client — không chờ máy chủ trả 401 mới biết. */
export const isSessionExpired = (now: number = Date.now()): boolean => {
  const expiry = getSessionExpiry();
  return expiry !== null && expiry <= now;
};

/** Header JSON + Bearer khi ở chế độ token (chế độ cookie: trình duyệt tự gửi cookie). */
export const authHeaders = (extra?: Record<string, string>): Record<string, string> => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  };
};

/** Header cho các request đăng nhập/đăng ký: xin cookie HttpOnly khi môi trường cho phép. */
export const sessionRequestHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(canUseCookieSession() ? { [SESSION_TRANSPORT_HEADER]: 'cookie' } : {}),
});

/** POST JSON kèm token; trả về `{ status, data }` để nơi gọi tự quyết định. */
export const postJson = async (
  url: string,
  body: unknown,
): Promise<{ status: number; data: any }> => {
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  /* 401 = token có thể đã bị thu hồi/hết hạn → nhờ bộ kiểm phiên xác minh lại. */
  signalSessionSuspect(res.status);
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
};

/** Cookie có thật sự được trình duyệt lưu và gửi kèm không? (gọi KHÔNG kèm Bearer) */
const cookieSessionWorks = async (): Promise<boolean> => {
  try {
    const res = await fetch('/api/auth/session', {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
};

export type SessionTransport = 'cookie' | 'bearer';

/**
 * Nhận phiên từ phản hồi đăng nhập/đăng ký. Máy chủ luôn trả token (tương thích
 * ngược); nếu nó đã đặt cookie, kiểm chứng cookie rồi BỎ token khỏi bộ nhớ — chỉ
 * giữ gợi ý hạn dùng. Kiểm chứng thất bại thì quay về Bearer như cũ.
 */
export const adoptSession = async (data: {
  token?: string;
  expiresAt?: number;
  sessionTransport?: string;
} | null | undefined): Promise<SessionTransport> => {
  if (data?.sessionTransport === 'cookie' && typeof data.expiresAt === 'number' && (await cookieSessionWorks())) {
    safeStorage.removeItem(AUTH_TOKEN_KEY);
    writeHint(data.expiresAt);
    return 'cookie';
  }
  safeStorage.removeItem(SESSION_HINT_KEY);
  setAuthToken(data?.token);
  return 'bearer';
};

/**
 * Nâng phiên Bearer cũ (token đang nằm trong localStorage) lên cookie HttpOnly.
 * Trả `true` nếu đã chuyển xong và token đã được xoá khỏi localStorage.
 */
export const upgradeLegacySession = async (): Promise<boolean> => {
  const token = getAuthToken();
  if (!token || !canUseCookieSession()) return false;
  try {
    const res = await fetch('/api/auth/session/cookie', {
      method: 'POST',
      headers: { ...authHeaders(), [SESSION_TRANSPORT_HEADER]: 'cookie' },
      body: '{}',
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data?.sessionTransport !== 'cookie' || typeof data.expiresAt !== 'number') return false;
    if (!(await cookieSessionWorks())) return false;
    /* Chỉ xoá đúng token đã nâng cấp — tab khác có thể vừa đăng nhập tài khoản khác. */
    if (getAuthToken() === token) {
      safeStorage.removeItem(AUTH_TOKEN_KEY);
      writeHint(data.expiresAt);
      return true;
    }
  } catch {
    /* giữ nguyên phiên Bearer */
  }
  return false;
};

/**
 * Hỏi máy chủ còn phiên cookie nào không khi client đã mất gợi ý (vd. người dùng
 * xoá localStorage). `probe=1` → máy chủ trả 200 `{ authenticated: false }` thay
 * cho 401 để khách vãng lai không thấy lỗi đỏ trong console mỗi lần tải trang.
 */
export const probeCookieSession = async (): Promise<{ user: unknown; expiresAt: number; moderation?: unknown } | null> => {
  if (!canUseCookieSession() || hasStoredSession()) return null;
  try {
    const res = await fetch('/api/auth/session?probe=1', { cache: 'no-store', credentials: 'same-origin' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.success && data.user && typeof data.expiresAt === 'number') {
      writeHint(data.expiresAt);
      /* `moderation`: trạng thái khoá máy chủ tính theo giờ hiện tại (báo khi mở app). */
      return { user: data.user, expiresAt: data.expiresAt, moderation: data.moderation };
    }
  } catch {
    /* ngoại tuyến */
  }
  return null;
};

/**
 * Báo máy chủ đăng xuất: xoá cookie HttpOnly (JavaScript không tự xoá được).
 * `everywhere` → thu hồi mọi token đã phát cho tài khoản (mọi thiết bị).
 * Gửi header TRƯỚC khi client xoá token để máy chủ còn nhận ra tài khoản.
 */
export const requestServerLogout = async (everywhere = false): Promise<boolean> => {
  try {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ everywhere }),
      keepalive: true,
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return everywhere ? Boolean(data?.revoked) : true;
  } catch {
    return false;
  }
};
