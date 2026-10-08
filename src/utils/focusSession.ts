/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { safeStorage } from './storage';

/* ==========================================================================
   Phiên tập trung (Focus Session) — trạng thái dùng CHUNG toàn ứng dụng
   --------------------------------------------------------------------------
   Vấn đề cũ: đồng hồ Pomodoro nằm trong lòng cửa sổ HUD, đóng HUD là phiên
   học biến mất, và setInterval bị trình duyệt bóp nhịp khi tab ở dưới nền nên
   thời gian đếm sai.

   Cách làm mới: phiên học là một mốc thời gian thật (startedAt → endsAt) lưu
   trong localStorage. Nhờ vậy:
   • Đóng HUD, đổi phân khu, mở tab khác… phiên vẫn chạy đúng.
   • Không phụ thuộc nhịp setInterval — luôn tính theo Date.now().
   • Mọi nơi trong app đọc được cùng một phiên qua sự kiện fforum_focus_sync.
   ========================================================================== */

export const FOCUS_SESSION_KEY = 'fforum_focus_session';
export const FOCUS_SYNC_EVENT = 'fforum_focus_sync';
/** Bắn ra khi một phiên HỌC vừa được ghi vào nhật ký giờ học. */
export const FOCUS_CREDITED_EVENT = 'fforum_focus_credited';
/** HUD xin dừng phiên — FocusSessionWatcher là nơi duy nhất xử lý việc ghi giờ. */
export const FOCUS_STOP_REQUEST_EVENT = 'fforum_focus_stop_request';

export type FocusMode = 'work' | 'break';

export interface FocusSessionState {
  mode: FocusMode;
  /** Thời điểm bắt đầu (ms). */
  startedAt: number;
  /** Thời điểm kết thúc dự kiến (ms). */
  endsAt: number;
  /** Số phút dự kiến của phiên (25 cho Học, 5 cho Nghỉ). */
  plannedMinutes: number;
  /** Mã phiên do máy chủ phát; thiếu mã thì không có phần thưởng số dư. */
  serverSessionId?: string;
}

export const FOCUS_WORK_MINUTES = 25;
export const FOCUS_BREAK_MINUTES = 5;
export const FOCUS_REWARD_MINIMUM_MINUTES = 25;
/** Phiên kết thúc lúc app đóng thì không thể xác thực → không cộng giờ. */
export const FOCUS_STALE_GRACE_MS = 90_000;

const isSession = (value: unknown): value is FocusSessionState => {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<FocusSessionState>;
  return (
    (s.mode === 'work' || s.mode === 'break') &&
    typeof s.startedAt === 'number' &&
    typeof s.endsAt === 'number' &&
    typeof s.plannedMinutes === 'number' &&
    (s.serverSessionId === undefined || typeof s.serverSessionId === 'string') &&
    s.endsAt > s.startedAt
  );
};

export const readFocusSession = (): FocusSessionState | null => {
  try {
    const raw = safeStorage.getItem(FOCUS_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writeFocusSession = (session: FocusSessionState | null): void => {
  if (session) safeStorage.setItem(FOCUS_SESSION_KEY, JSON.stringify(session));
  else safeStorage.removeItem(FOCUS_SESSION_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FOCUS_SYNC_EVENT));
  }
};

export const startFocusSession = (
  mode: FocusMode,
  userEmail?: string | null,
  serverSessionId?: string | null,
  customMinutes?: number
): FocusSessionState => {
  const defaultMinutes = mode === 'work' ? FOCUS_WORK_MINUTES : FOCUS_BREAK_MINUTES;
  const plannedMinutes = customMinutes !== undefined ? customMinutes : defaultMinutes;
  const startedAt = Date.now();
  const session: FocusSessionState = {
    mode,
    startedAt,
    endsAt: startedAt + plannedMinutes * 60_000,
    plannedMinutes,
    ...(serverSessionId ? { serverSessionId } : {}),
  };
  /* Ghi kèm chủ phiên để biết ai đang học (hiển thị + chống lệch tài khoản) */
  if (userEmail) safeStorage.setItem(`${FOCUS_SESSION_KEY}_owner`, userEmail.toLowerCase());
  writeFocusSession(session);
  return session;
};

export const clearFocusSession = (): void => {
  writeFocusSession(null);
};

export const readFocusSessionOwner = (): string => {
  return safeStorage.getItem(`${FOCUS_SESSION_KEY}_owner`) || '';
};

export const subscribeFocusSession = (callback: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(FOCUS_SYNC_EVENT, callback);
  return () => window.removeEventListener(FOCUS_SYNC_EVENT, callback);
};

export const focusRemainingMs = (session: FocusSessionState, now: number = Date.now()): number =>
  Math.max(0, session.endsAt - now);

export const focusRemainingLabel = (session: FocusSessionState, now: number = Date.now()): string => {
  const totalSeconds = Math.ceil(focusRemainingMs(session, now) / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/** Số phút đã học thật của phiên (đã bị chặn trên bởi thời điểm kết thúc). */
export const focusElapsedMinutes = (session: FocusSessionState, now: number = Date.now()): number => {
  const endedAt = Math.min(now, session.endsAt);
  return Math.max(0, Math.floor((endedAt - session.startedAt) / 60_000));
};

export const focusProgressPercent = (session: FocusSessionState, now: number = Date.now()): number => {
  const total = session.endsAt - session.startedAt;
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, ((now - session.startedAt) / total) * 100));
};

/** Yêu cầu dừng phiên hiện tại (kèm ghi nhận số phút thực học nếu đủ 5 phút). */
export const requestFocusStop = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(FOCUS_STOP_REQUEST_EVENT));
};

/** Thông báo cho phần còn lại của app rằng phiên vừa được ghi vào nhật ký. */
export const announceFocusCredited = (minutes: number, mode: FocusMode = 'work'): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(FOCUS_CREDITED_EVENT, { detail: { minutes, mode } }));
};
