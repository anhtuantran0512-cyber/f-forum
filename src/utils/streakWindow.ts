/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Cửa sổ giữ chuỗi điểm danh (code_yeucau · cdt-16 "daily streak reset countdown").
 * Ranh giới ngày PHẢI trùng với cách máy chủ chấm điểm danh: ngày lịch theo
 * Asia/Ho_Chi_Minh (shared/dailyTrivia.ts → dateKeyInTimeZone), không phải giờ
 * của trình duyệt — người dùng ở múi giờ khác vẫn thấy đúng mốc reset.
 * Hàm thuần, không phụ thuộc React để test trực tiếp bằng Node.
 */
export const DAY_MS = 86_400_000;
export const STREAK_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export type StreakUrgency = 'done' | 'safe' | 'warn' | 'critical';

/** Số giây đã trôi qua kể từ 0h của ngày hiện tại tại múi giờ chỉ định. */
export const secondsIntoDay = (now: number = Date.now(), timeZone: string = STREAK_TIME_ZONE): number => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(now));
  const read = (type: Intl.DateTimeFormatPartTypes): number => Number(parts.find((p) => p.type === type)?.value || 0);
  return (read('hour') % 24) * 3600 + read('minute') * 60 + read('second');
};

/** Mili-giây còn lại tới 0h ngày kế tiếp (mốc chuỗi bị reset nếu chưa điểm danh). */
export const msUntilNextDay = (now: number = Date.now(), timeZone: string = STREAK_TIME_ZONE): number => {
  const remaining = (86_400 - secondsIntoDay(now, timeZone)) * 1000 - (((now % 1000) + 1000) % 1000);
  return Math.min(DAY_MS, Math.max(0, remaining));
};

/** Độ sáng ngọn lửa 0..1 — mờ dần khi cửa sổ trong ngày khép lại. */
export const streakFlameLevel = (msLeft: number): number => Math.min(1, Math.max(0, msLeft / DAY_MS));

/** Mức khẩn: đã điểm danh → done; ≤ 2 giờ → critical; ≤ 6 giờ → warn. */
export const streakUrgency = (msLeft: number, claimedToday: boolean): StreakUrgency => {
  if (claimedToday) return 'done';
  if (msLeft <= 2 * 3_600_000) return 'critical';
  if (msLeft <= 6 * 3_600_000) return 'warn';
  return 'safe';
};

/** Định dạng HH:MM:SS (luôn 2 chữ số mỗi phần). */
export const formatCountdown = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
};
