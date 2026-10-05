/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { safeStorage } from './storage';

/* ==========================================================================
   Phiên tập trung — trạng thái dùng CHUNG toàn ứng dụng
   --------------------------------------------------------------------------
   Đồng hồ Học là stopwatch tự do: không có thời điểm kết thúc bắt buộc. Thời
   lượng luôn được tính từ startedAt, nên không phụ thuộc nhịp setInterval và
   vẫn chính xác khi đóng HUD / chuyển tab. Chế độ Nghỉ (nếu chọn) vẫn có hẹn
   giờ 5 phút riêng, nhưng không ghi vào nhật ký học.
   ========================================================================== */

export const FOCUS_SESSION_KEY = 'fforum_focus_session';
export const FOCUS_SESSION_OWNER_KEY = `${FOCUS_SESSION_KEY}_owner`;
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
  /** Môn học tùy chọn của phiên Học, được chuyển nguyên vẹn vào nhật ký. */
  subject?: string;
  /** Chỉ có ở chế độ nghỉ; phiên Học không có endsAt và chạy tự do. */
  endsAt?: number;
}

/** Mốc học được dùng làm thước tiến độ, không phải thời lượng bắt buộc. */
export const FOCUS_WORK_MINUTES = 25;
export const FOCUS_BREAK_MINUTES = 5;
export const FOCUS_DAILY_GOAL_MINUTES = 120;
/** Phiên nghỉ kết thúc lúc app đóng thì không thể xác thực → không cộng giờ. */
export const FOCUS_STALE_GRACE_MS = 90_000;

export const normalizeFocusSubject = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || (code >= 127 && code <= 159) ? ' ' : character;
  }).join('').trim().replace(/\s+/g, ' ');
  const subject = Array.from(normalized).slice(0, 32).join('');
  return subject || undefined;
};

const isSession = (value: unknown): value is FocusSessionState => {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<FocusSessionState>;
  if (
    (session.mode !== 'work' && session.mode !== 'break') ||
    typeof session.startedAt !== 'number' ||
    !Number.isFinite(session.startedAt) ||
    session.startedAt > Date.now()
  ) {
    return false;
  }

  /* Accept legacy Pomodoro entries, but deliberately ignore their old work endsAt. */
  if (session.mode === 'work') return true;
  return (
    typeof session.endsAt === 'number' &&
    Number.isFinite(session.endsAt) &&
    session.endsAt > session.startedAt
  );
};

export const readFocusSession = (): FocusSessionState | null => {
  try {
    const raw = safeStorage.getItem(FOCUS_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isSession(parsed)) return null;
    if (parsed.mode === 'work') {
      const subject = normalizeFocusSubject(parsed.subject);
      return { mode: 'work', startedAt: parsed.startedAt, ...(subject ? { subject } : {}) };
    }
    return { mode: 'break', startedAt: parsed.startedAt, endsAt: parsed.endsAt };
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
  subject?: string,
): FocusSessionState => {
  const startedAt = Date.now();
  const cleanSubject = normalizeFocusSubject(subject);
  const session: FocusSessionState = mode === 'work'
    ? { mode, startedAt, ...(cleanSubject ? { subject: cleanSubject } : {}) }
    : { mode, startedAt, endsAt: startedAt + FOCUS_BREAK_MINUTES * 60_000 };

  /* Ghi kèm chủ phiên để biết ai đang học (hiển thị + chống lệch tài khoản). */
  if (userEmail?.trim()) safeStorage.setItem(FOCUS_SESSION_OWNER_KEY, userEmail.trim().toLowerCase());
  else safeStorage.removeItem(FOCUS_SESSION_OWNER_KEY);
  writeFocusSession(session);
  return session;
};

export const clearFocusSession = (): void => {
  writeFocusSession(null);
  safeStorage.removeItem(FOCUS_SESSION_OWNER_KEY);
};

export const readFocusSessionOwner = (): string => {
  return (safeStorage.getItem(FOCUS_SESSION_OWNER_KEY) || '').trim().toLowerCase();
};

export const subscribeFocusSession = (callback: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(FOCUS_SYNC_EVENT, callback);
  return () => window.removeEventListener(FOCUS_SYNC_EVENT, callback);
};

/** Chỉ phiên nghỉ đếm ngược; đồng hồ Học là stopwatch nên không còn thời gian còn lại. */
export const focusRemainingMs = (session: FocusSessionState, now: number = Date.now()): number =>
  session.mode === 'break' && session.endsAt ? Math.max(0, session.endsAt - now) : 0;

const formatClock = (totalSeconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const mmss = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return hours > 0 ? `${String(hours).padStart(2, '0')}:${mmss}` : mmss;
};

/** Học đếm lên; Nghỉ đếm ngược. */
export const focusClockLabel = (session: FocusSessionState, now: number = Date.now()): string => {
  if (session.mode === 'break') {
    const remainingSeconds = Math.ceil(focusRemainingMs(session, now) / 1000);
    return formatClock(remainingSeconds);
  }
  return formatClock((now - session.startedAt) / 1000);
};

/** Số phút thực tế của phiên Học; không giới hạn ở mốc 25 phút. */
export const focusElapsedMinutes = (session: FocusSessionState, now: number = Date.now()): number => {
  if (session.mode !== 'work') return 0;
  return Math.max(0, Math.floor((now - session.startedAt) / 60_000));
};

/** Tiến độ vòng tròn tới mục tiêu ngày 120′; đồng hồ vẫn tiếp tục chạy sau mốc này. */
export const focusProgressPercent = (
  session: FocusSessionState,
  now: number = Date.now(),
  targetMinutes: number = FOCUS_DAILY_GOAL_MINUTES,
): number => {
  const total = session.mode === 'break'
    ? (session.endsAt || session.startedAt) - session.startedAt
    : Math.max(1, targetMinutes) * 60_000;
  if (total <= 0) return 100;
  const elapsed = now - session.startedAt;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
};

/** Yêu cầu dừng phiên hiện tại; mọi phút trọn vẹn đều có thể được ghi nhận. */
export const requestFocusStop = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(FOCUS_STOP_REQUEST_EVENT));
};

/** Thông báo cho phần còn lại của app rằng phiên vừa được ghi vào nhật ký. */
export const announceFocusCredited = (
  minutes: number,
  mode: FocusMode = 'work',
  owner?: string,
  subject?: string,
): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(FOCUS_CREDITED_EVENT, { detail: { minutes, mode, owner, subject } }));
};
