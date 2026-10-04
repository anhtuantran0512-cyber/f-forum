/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { safeStorage } from './storage';

/* ==========================================================================
   Nhật ký giờ học (Study Log)
   --------------------------------------------------------------------------
   Nguồn dữ liệu THẬT cho bảng xếp hạng giờ học:
   • Mỗi phiên Học 25 phút trong Phòng Tập Trung (Pomodoro) được ghi tự động.
   • Phiên bị dừng giữa đường vẫn ghi số phút đã học thật (từ 5 phút trở lên).
   Dữ liệu lưu cục bộ trên trình duyệt, đồng bộ giữa các tab qua CustomEvent.
   ========================================================================== */

export type StudySource = 'focus' | 'manual' | 'quiz' | 'reading';

export interface StudySession {
  id: string;
  /** Thời điểm kết thúc phiên (ms). */
  at: number;
  minutes: number;
  source: StudySource;
  subject?: string;
  /** Email người học (chữ thường) để tách dữ liệu theo tài khoản. */
  owner?: string;
}

export const STUDY_LOG_KEY = 'fforum_study_log';
export const STUDY_GOAL_KEY = 'fforum_study_weekly_goal';
export const STUDY_TARGET_KEY = 'fforum_study_daily_target';
export const DEFAULT_WEEKLY_GOAL_MINUTES = 15 * 60; /* 15 giờ / tuần */
export const DEFAULT_DAILY_TARGET_MINUTES = 120; /* 2 giờ / ngày */

const MAX_SESSIONS = 2000;

const isSession = (value: unknown): value is StudySession => {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<StudySession>;
  return typeof s.at === 'number' && typeof s.minutes === 'number' && s.minutes > 0;
};

export const genId = (): string =>
  `study-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Đọc toàn bộ phiên học đã ghi (mới nhất đứng đầu). */
export const readStudySessions = (): StudySession[] => {
  try {
    const raw = safeStorage.getItem(STUDY_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSession).sort((a, b) => b.at - a.at);
  } catch {
    return [];
  }
};

const writeStudySessions = (sessions: StudySession[]): void => {
  const trimmed = sessions.slice(0, MAX_SESSIONS);
  safeStorage.setItem(STUDY_LOG_KEY, JSON.stringify(trimmed));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fforum_study_sync'));
  }
};

/**
 * Ghi nhận thời gian học.
 * @returns tổng số phút đã ghi sau khi lưu.
 */
export const logStudyMinutes = (
  minutes: number,
  source: StudySource = 'manual',
  owner?: string,
  subject?: string,
): number => {
  const safeMinutes = Math.max(1, Math.min(600, Math.round(minutes)));
  const session: StudySession = {
    id: genId(),
    at: Date.now(),
    minutes: safeMinutes,
    source,
    owner: owner ? owner.toLowerCase() : undefined,
    subject,
  };
  const next = [session, ...readStudySessions()];
  writeStudySessions(next);
  return safeMinutes;
};

export const removeStudySession = (id: string): void => {
  writeStudySessions(readStudySessions().filter((s) => s.id !== id));
};

export const clearStudyLog = (): void => {
  writeStudySessions([]);
};

/* -------------------------------------------------------------------------- */
/* Khoảng thời gian                                                            */
/* -------------------------------------------------------------------------- */

export type StudyPeriod = 'week' | 'month' | 'year' | 'all';

export const PERIOD_LABELS: Record<StudyPeriod, string> = {
  week: 'Tuần',
  month: 'Tháng',
  year: 'Năm',
  all: 'Toàn thời gian',
};

const startOfDay = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export const periodStartMs = (period: StudyPeriod, now = new Date()): number => {
  if (period === 'week') {
    const day = (now.getDay() + 6) % 7; /* Thứ hai = 0 */
    const d = new Date(now);
    d.setDate(d.getDate() - day);
    return startOfDay(d);
  }
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  if (period === 'year') return new Date(now.getFullYear(), 0, 1).getTime();
  return 0;
};

export interface StudyTotals {
  todayMinutes: number;
  weekMinutes: number;
  monthMinutes: number;
  yearMinutes: number;
  allMinutes: number;
  /** Số ngày liên tiếp có ghi nhận học (tính tới hôm nay hoặc hôm qua). */
  streakDays: number;
  /** Số ngày có học trong tuần này. */
  activeDaysThisWeek: number;
  sessionCount: number;
}

export const computeStudyTotals = (
  sessions: StudySession[],
  now = new Date(),
): StudyTotals => {
  const todayStart = startOfDay(now);
  const weekStart = periodStartMs('week', now);
  const monthStart = periodStartMs('month', now);
  const yearStart = periodStartMs('year', now);

  let todayMinutes = 0;
  let weekMinutes = 0;
  let monthMinutes = 0;
  let yearMinutes = 0;
  let allMinutes = 0;
  const dayKeys = new Set<string>();

  sessions.forEach((s) => {
    allMinutes += s.minutes;
    if (s.at >= yearStart) yearMinutes += s.minutes;
    if (s.at >= monthStart) monthMinutes += s.minutes;
    if (s.at >= weekStart) {
      weekMinutes += s.minutes;
      dayKeys.add(new Date(s.at).toDateString());
    }
    if (s.at >= todayStart) todayMinutes += s.minutes;
  });

  /* Chuỗi ngày học liên tiếp */
  const studiedDays = new Set(sessions.map((s) => new Date(s.at).toDateString()));
  let streakDays = 0;
  const cursor = new Date(now);
  if (!studiedDays.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (studiedDays.has(cursor.toDateString())) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    todayMinutes,
    weekMinutes,
    monthMinutes,
    yearMinutes,
    allMinutes,
    streakDays,
    activeDaysThisWeek: dayKeys.size,
    sessionCount: sessions.length,
  };
};

export const periodMinutes = (totals: StudyTotals, period: StudyPeriod): number => {
  if (period === 'week') return totals.weekMinutes;
  if (period === 'month') return totals.monthMinutes;
  if (period === 'year') return totals.yearMinutes;
  return totals.allMinutes;
};

/* -------------------------------------------------------------------------- */
/* Mục tiêu học tập                                                            */
/* -------------------------------------------------------------------------- */

export const readWeeklyGoalMinutes = (): number => {
  const raw = parseInt(safeStorage.getItem(STUDY_GOAL_KEY) || '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_WEEKLY_GOAL_MINUTES;
};

export const saveWeeklyGoalMinutes = (minutes: number): number => {
  const safe = Math.max(60, Math.min(80 * 60, Math.round(minutes)));
  safeStorage.setItem(STUDY_GOAL_KEY, String(safe));
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('fforum_study_sync'));
  return safe;
};

export const readDailyTargetMinutes = (): number => {
  const raw = parseInt(safeStorage.getItem(STUDY_TARGET_KEY) || '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_DAILY_TARGET_MINUTES;
};

export const saveDailyTargetMinutes = (minutes: number): number => {
  const safe = Math.max(15, Math.min(16 * 60, Math.round(minutes)));
  safeStorage.setItem(STUDY_TARGET_KEY, String(safe));
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('fforum_study_sync'));
  return safe;
};

/* -------------------------------------------------------------------------- */
/* Xếp hạng giờ học toàn thành viên                                            */
/* -------------------------------------------------------------------------- */

export interface StudyRankMember {
  key: string;
  id: string;
  name: string;
  avatar: string;
  email?: string;
  level: number;
  minutes: number;
  isYou?: boolean;
  /** Ước lượng từ XP (chỉ dùng khi thành viên chưa có nhật ký giờ học thật). */
  estimated?: boolean;
}

/**
 * Quy đổi XP tích luỹ của một thành viên thành số phút học ước lượng.
 * Dùng hàm băm tất định trên email để mỗi người có một nhịp học ổn định
 * (không đổi mỗi lần render), và trải đều theo kỳ được chọn.
 */
export const estimateMinutesFromXp = (
  seed: string,
  xp: number,
  period: StudyPeriod,
): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }
  const jitter = 0.72 + (hash % 57) / 100; /* 0.72 – 1.28 */
  const base = Math.max(0, xp) * 0.32; /* ~19 phút cho mỗi 60 XP */
  const share: Record<StudyPeriod, number> = { week: 0.14, month: 0.42, year: 0.78, all: 1 };
  return Math.round(base * share[period] * jitter);
};

export interface StudyUserLike {
  id: string;
  name: string;
  avatar: string;
  email: string;
  level: number;
  xp: number;
}

/**
 * Bảng xếp hạng giờ học cho một kỳ.
 * Thành viên có nhật ký thật (thường là chính bạn) dùng số liệu thật, những
 * người còn lại được quy đổi từ XP để bảng luôn đủ dữ liệu so sánh.
 */
export const buildStudyLeaderboard = (
  users: Record<string, StudyUserLike>,
  sessions: StudySession[],
  period: StudyPeriod,
  currentUserEmail?: string | null,
): StudyRankMember[] => {
  const mine = currentUserEmail ? currentUserEmail.toLowerCase() : '';
  const since = periodStartMs(period);
  const inPeriod = (at: number) => period === 'all' || at >= since;

  const realMinutes = new Map<string, number>();
  sessions.forEach((s) => {
    if (!inPeriod(s.at)) return;
    const owner = (s.owner || mine).toLowerCase();
    if (!owner) return;
    realMinutes.set(owner, (realMinutes.get(owner) || 0) + s.minutes);
  });

  const members: StudyRankMember[] = Object.entries(users).map(([emailKey, u]) => {
    const key = emailKey.toLowerCase();
    const real = realMinutes.get(key);
    const hasReal = typeof real === 'number' && real > 0;
    return {
      key,
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      email: u.email,
      level: u.level,
      minutes: hasReal ? real : estimateMinutesFromXp(key || u.id, u.xp || 0, period),
      isYou: Boolean(mine) && key === mine,
      estimated: !hasReal,
    };
  });

  /* Đảm bảo chính bạn luôn xuất hiện, kể cả khi chưa có trong danh bạ */
  if (mine && !members.some((m) => m.key === mine)) {
    const real = realMinutes.get(mine) || 0;
    members.push({
      key: mine,
      id: 'me',
      name: 'Bạn',
      avatar: '',
      email: mine,
      level: 1,
      minutes: real,
      isYou: true,
      estimated: false,
    });
  }

  members.sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));
  return members.filter((m) => m.minutes > 0 || m.isYou);
};

/* -------------------------------------------------------------------------- */
/* Định dạng                                                                   */
/* -------------------------------------------------------------------------- */

export const formatHours = (minutes: number, decimals = 1): string => {
  const hours = minutes / 60;
  if (hours >= 100 || decimals === 0) return Math.round(hours).toLocaleString('vi-VN');
  return hours.toFixed(decimals).replace('.', ',');
};

/**
 * Lọc nhật ký theo chủ tài khoản.
 * • Đã đăng nhập: lấy phiên của mình + phiên cũ không gắn tài khoản.
 * • Chưa đăng nhập: chỉ lấy phiên không gắn tài khoản (không lẫn dữ liệu người khác).
 */
export const sessionsForOwner = (sessions: StudySession[], owner?: string | null): StudySession[] => {
  if (!owner) return sessions.filter((s) => !s.owner);
  const me = owner.toLowerCase();
  return sessions.filter((s) => !s.owner || s.owner === me);
};

/* -------------------------------------------------------------------------- */
/* Thống kê chi tiết cho trang "Giờ học"                                       */
/* -------------------------------------------------------------------------- */

/** Mốc 00:00 của một ngày (lệch `offsetDays` ngày so với hôm nay). */
export const dayStartMs = (offsetDays = 0, now: Date = new Date()): number => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() + offsetDays);
  return d.getTime();
};

const VI_WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export interface StudyDayBar {
  key: string;
  /** Nhãn ngắn: T2…T7, CN */
  label: string;
  /** Ngày/tháng để đọc rõ hơn khi cần. */
  dateLabel: string;
  minutes: number;
  isToday: boolean;
  /** Chiều cao cột 8–100% để vẽ biểu đồ. */
  heightPercent: number;
}

/** Chuỗi N ngày gần nhất (cũ → mới) kèm số phút học thật mỗi ngày. */
export const studyDaySeries = (sessions: StudySession[], days = 7): StudyDayBar[] => {
  const now = new Date();
  const buckets = new Map<number, number>();
  sessions.forEach((s) => {
    const key = dayStartMs(0, new Date(s.at));
    buckets.set(key, (buckets.get(key) || 0) + s.minutes);
  });

  const raw: StudyDayBar[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const start = dayStartMs(-i, now);
    const d = new Date(start);
    const minutes = buckets.get(start) || 0;
    raw.push({
      key: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
      label: VI_WEEKDAY[d.getDay()],
      dateLabel: `${d.getDate()}/${d.getMonth() + 1}`,
      minutes,
      isToday: i === 0,
      heightPercent: minutes > 0 ? 8 : 3,
    });
  }

  const max = Math.max(1, ...raw.map((b) => b.minutes));
  return raw.map((b) => ({
    ...b,
    heightPercent: b.minutes > 0 ? Math.max(10, Math.round((b.minutes / max) * 100)) : 3,
  }));
};

export interface StudyStats {
  totalMinutes: number;
  sessionCount: number;
  activeDays: number;
  avgMinutesPerActiveDay: number;
  bestDayLabel: string;
  bestDayMinutes: number;
  focusMinutes: number;
  longestSessionMinutes: number;
}

/** Thống kê chi tiết toàn bộ nhật ký (mọi thời gian). */
export const computeStudyStats = (sessions: StudySession[]): StudyStats => {
  const dayTotals = new Map<number, number>();
  let totalMinutes = 0;
  let focusMinutes = 0;
  let longestSessionMinutes = 0;

  sessions.forEach((s) => {
    totalMinutes += s.minutes;
    if (s.source === 'focus') focusMinutes += s.minutes;
    if (s.minutes > longestSessionMinutes) longestSessionMinutes = s.minutes;
    const key = dayStartMs(0, new Date(s.at));
    dayTotals.set(key, (dayTotals.get(key) || 0) + s.minutes);
  });

  let bestDayKey = 0;
  let bestDayMinutes = 0;
  dayTotals.forEach((minutes, key) => {
    if (minutes > bestDayMinutes) {
      bestDayMinutes = minutes;
      bestDayKey = key;
    }
  });

  const bestDate = bestDayKey ? new Date(bestDayKey) : null;
  const activeDays = dayTotals.size;

  return {
    totalMinutes,
    sessionCount: sessions.length,
    activeDays,
    avgMinutesPerActiveDay: activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0,
    bestDayLabel: bestDate ? `${bestDate.getDate()}/${bestDate.getMonth() + 1}` : '—',
    bestDayMinutes,
    focusMinutes,
    longestSessionMinutes,
  };
};

/** Giờ:phút của một mốc thời gian. */
export const formatClock = (at: number): string => {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Nhãn ngày thân thiện: Hôm nay / Hôm qua / dd/mm. */
export const formatDayLabel = (at: number, now: Date = new Date()): string => {
  const key = dayStartMs(0, new Date(at));
  const today = dayStartMs(0, now);
  const yesterday = dayStartMs(-1, now);
  if (key === today) return 'Hôm nay';
  if (key === yesterday) return 'Hôm qua';
  const d = new Date(at);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

export interface StudySessionRow extends StudySession {
  dayLabel: string;
  clock: string;
}

/** N phiên gần nhất kèm nhãn ngày/giờ đã định dạng sẵn cho giao diện. */
export const recentStudySessions = (sessions: StudySession[], limit = 6): StudySessionRow[] =>
  sessions.slice(0, limit).map((s) => ({
    ...s,
    dayLabel: formatDayLabel(s.at),
    clock: formatClock(s.at),
  }));

export const STUDY_SOURCE_LABELS: Record<StudySource, string> = {
  focus: 'Phòng Tập Trung',
  manual: 'Ghi tay',
  quiz: 'Luyện đề',
  reading: 'Đọc tài liệu',
};

export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h <= 0) return `${m} phút`;
  if (m === 0) return `${h} giờ`;
  return `${h} giờ ${m} phút`;
};
