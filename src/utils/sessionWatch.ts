/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Hỏi lại máy chủ xem phiên đăng nhập còn hiệu lực không — cho những lúc client
 * KHÔNG thể tự biết:
 *  - phiên bị thu hồi khi tab đang ngủ / mất mạng ("đăng xuất mọi thiết bị" chỉ đẩy
 *    SESSION_REVOKED tới socket đang mở ĐÚNG lúc đó);
 *  - đang chạy kênh dự phòng SSE (không gắn danh tính, không nhận sự kiện riêng);
 *  - tài khoản bị xoá, khoá ký phiên của máy chủ bị thay.
 *
 * Thuần (không đụng window/fetch trực tiếp) để test được bằng đồng hồ + fetch giả.
 * CHỈ HTTP 401 mới bị coi là phiên hỏng: lỗi mạng, 5xx hay máy chủ đang khởi động
 * lại đều KHÔNG được đăng xuất người dùng.
 */

/** Nhịp tối thiểu giữa hai lần kiểm "thụ động" (tab hiện lại, có mạng lại, định kỳ). */
export const SESSION_RECHECK_MS = 60_000;
/** Nhịp tối thiểu cho tín hiệu mạnh (socket báo AUTH_ERROR, API trả 401) — chống bão request. */
export const SESSION_FORCED_RECHECK_MS = 5_000;
/** Kiểm định kỳ khi tab đang hiển thị — phủ trường hợp chỉ có kênh SSE. */
export const SESSION_PERIODIC_MS = 5 * 60_000;
/** Sự kiện window: "vừa có request bị 401" — chỉ là nghi vấn, bộ kiểm sẽ xác minh lại. */
export const SESSION_SUSPECT_EVENT = 'fforum_session_suspect';

export interface SessionCheckerDeps {
  /** Gọi GET /api/auth/session kèm thông tin phiên hiện tại. */
  fetchSession: () => Promise<{ status: number }>;
  /** Máy chủ xác nhận phiên hỏng (401) — gọi đúng MỘT lần. */
  onInvalid: () => void;
  now?: () => number;
  isOnline?: () => boolean;
}

export interface SessionCheckerOptions {
  passiveGapMs?: number;
  forcedGapMs?: number;
}

export interface SessionChecker {
  /**
   * Kiểm phiên. `force` = tín hiệu mạnh, chỉ chịu nhịp chống bão thay vì nhịp 60 giây.
   * Trả `false` khi máy chủ xác nhận phiên hỏng; `true` khi còn hiệu lực HOẶC chưa biết.
   */
  check: (force?: boolean) => Promise<boolean>;
  dispose: () => void;
}

export function createSessionChecker(
  deps: SessionCheckerDeps,
  options: SessionCheckerOptions = {},
): SessionChecker {
  const now = deps.now ?? Date.now;
  const isOnline = deps.isOnline ?? (() => true);
  const passiveGap = options.passiveGapMs ?? SESSION_RECHECK_MS;
  const forcedGap = options.forcedGapMs ?? SESSION_FORCED_RECHECK_MS;
  /* Phiên vừa được xác thực (đăng nhập / khôi phục) ngay trước khi bộ kiểm được tạo. */
  let lastCheck = now();
  let inflight: Promise<boolean> | null = null;
  let disposed = false;
  let invalidated = false;

  const check = (force = false): Promise<boolean> => {
    if (invalidated) return Promise.resolve(false);
    if (disposed) return Promise.resolve(true);
    /* Nhiều tín hiệu cùng lúc (vd. 5 request cùng bị 401) → chung một lần hỏi. */
    if (inflight) return inflight;
    if (now() - lastCheck < (force ? forcedGap : passiveGap)) return Promise.resolve(true);
    if (!isOnline()) return Promise.resolve(true);
    lastCheck = now();
    /* Promise.resolve().then: lỗi ném ĐỒNG BỘ trong fetchSession cũng thành "chưa biết". */
    const pending = Promise.resolve()
      .then(() => deps.fetchSession())
      .then((res) => {
        if (res.status !== 401 || disposed || invalidated) return true;
        invalidated = true;
        deps.onInvalid();
        return false;
      })
      .catch(() => true)
      .finally(() => {
        if (inflight === pending) inflight = null;
      });
    inflight = pending;
    return pending;
  };

  return {
    check,
    dispose: () => {
      disposed = true;
    },
  };
}

/** Báo "request vừa bị 401" cho bộ kiểm phiên (no-op ngoài trình duyệt). */
export const signalSessionSuspect = (status: number): void => {
  if (status !== 401 || typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  try {
    window.dispatchEvent(new Event(SESSION_SUSPECT_EVENT));
  } catch {
    /* môi trường không có Event */
  }
};
