/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { safeStorage } from './storage';

/* ==========================================================================
   Phiên đăng nhập phía client
   --------------------------------------------------------------------------
   Máy chủ giờ xác thực mọi thao tác ghi bằng token có chữ ký (HMAC). Client chỉ
   việc đọc token đã lưu và gắn vào header `Authorization: Bearer ...`.
   Gom vào một chỗ để không còn cảnh mỗi fetch tự chế header riêng.
   ========================================================================== */

export const AUTH_TOKEN_KEY = 'f_forum_auth_token';

export const getAuthToken = (): string | null => safeStorage.getItem(AUTH_TOKEN_KEY);

export const setAuthToken = (token?: string | null): void => {
  if (token) safeStorage.setItem(AUTH_TOKEN_KEY, token);
  else safeStorage.removeItem(AUTH_TOKEN_KEY);
};

export const clearAuthToken = (): void => safeStorage.removeItem(AUTH_TOKEN_KEY);

/** Header JSON + Bearer token (bỏ trống nếu chưa đăng nhập). */
export const authHeaders = (extra?: Record<string, string>): Record<string, string> => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  };
};

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
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
};
