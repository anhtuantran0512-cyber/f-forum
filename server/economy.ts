/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { dailyTriviaForDate, shiftDateKey } from '../shared/dailyTrivia.ts';

export interface DailyRewardProfile {
  attendanceDates: string[];
  lastQuizDate?: string;
  boxes: { blue: number; gold: number; red: number };
}

export interface FocusRewardSession {
  id: string;
  startedAt: number;
  claimedAt?: number;
  reward?: number;
}

export type GiftBoxType = keyof DailyRewardProfile['boxes'];

export const DAILY_ATTENDANCE_REWARD = 25;
export const DAILY_QUIZ_REWARD_MIN = 5;
export const DAILY_QUIZ_REWARD_MAX = 10;
export const GIFT_BOX_REWARDS: Record<GiftBoxType, number> = {
  blue: 30,
  gold: 80,
  red: 200,
};
export const FOCUS_REWARD_MINUTES = 25;
export const FOCUS_REWARD_AMOUNT = 25;
export const FOCUS_REWARD_MINIMUM_MS = FOCUS_REWARD_MINUTES * 60_000;
export const FOCUS_SESSION_MAX_AGE_MS = 2 * 60 * 60_000;
export const DAILY_REWARD_DATES_LIMIT = 400;

const isDateKey = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value;
};

const safeCount = (value: unknown, max = 10_000): number => {
  const count = Number(value);
  return Number.isFinite(count) ? Math.min(max, Math.max(0, Math.floor(count))) : 0;
};

export const createEmptyDailyRewardProfile = (): DailyRewardProfile => ({
  attendanceDates: [],
  boxes: { blue: 0, gold: 0, red: 0 },
});

export const sanitizeDailyRewardProfiles = (
  raw: unknown,
  allowedEmails?: ReadonlySet<string>,
): Record<string, DailyRewardProfile> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const output: Record<string, DailyRewardProfile> = {};
  for (const [rawEmail, rawProfile] of Object.entries(raw as Record<string, unknown>).slice(-20_000)) {
    const email = rawEmail.trim().toLowerCase();
    if (!email || (allowedEmails && !allowedEmails.has(email))) continue;
    if (!rawProfile || typeof rawProfile !== 'object' || Array.isArray(rawProfile)) continue;
    const value = rawProfile as Record<string, unknown>;
    const attendanceDates = Array.isArray(value.attendanceDates)
      ? [...new Set(value.attendanceDates.filter(isDateKey))].sort().slice(-DAILY_REWARD_DATES_LIMIT)
      : [];
    const boxes = value.boxes && typeof value.boxes === 'object' && !Array.isArray(value.boxes)
      ? value.boxes as Record<string, unknown>
      : {};
    const profile: DailyRewardProfile = {
      attendanceDates,
      boxes: {
        blue: safeCount(boxes.blue),
        gold: safeCount(boxes.gold),
        red: safeCount(boxes.red),
      },
    };
    if (isDateKey(value.lastQuizDate)) profile.lastQuizDate = value.lastQuizDate;
    output[email] = profile;
  }
  return output;
};

export const sanitizeFocusRewardSessions = (
  raw: unknown,
  allowedEmails: ReadonlySet<string>,
  now = Date.now(),
): Record<string, FocusRewardSession> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const output: Record<string, FocusRewardSession> = {};
  for (const [rawEmail, rawSession] of Object.entries(raw as Record<string, unknown>)) {
    const email = rawEmail.trim().toLowerCase();
    if (!allowedEmails.has(email) || !rawSession || typeof rawSession !== 'object' || Array.isArray(rawSession)) continue;
    const value = rawSession as Record<string, unknown>;
    const startedAt = Number(value.startedAt);
    const id = typeof value.id === 'string' ? value.id.trim().slice(0, 100) : '';
    if (!id || !Number.isFinite(startedAt) || startedAt > now + 60_000 || now - startedAt > FOCUS_SESSION_MAX_AGE_MS) continue;
    const claimedAt = Number(value.claimedAt);
    const reward = Number(value.reward);
    output[email] = {
      id,
      startedAt: Math.floor(startedAt),
      ...(Number.isFinite(claimedAt) && claimedAt >= startedAt && claimedAt <= now + 60_000
        ? { claimedAt: Math.floor(claimedAt), reward: Number.isInteger(reward) && reward === FOCUS_REWARD_AMOUNT ? reward : FOCUS_REWARD_AMOUNT }
        : {}),
    };
  }
  return output;
};

export const attendanceStreak = (dates: readonly string[], today: string): number => {
  if (!isDateKey(today)) return 0;
  const set = new Set(dates.filter(isDateKey));
  let cursor = set.has(today) ? today : shiftDateKey(today, -1);
  if (!set.has(cursor)) return 0;
  let streak = 0;
  while (cursor && set.has(cursor) && streak < DAILY_REWARD_DATES_LIMIT) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }
  return streak;
};

export interface DailyRewardStatus {
  attendanceDates: string[];
  claimedToday: boolean;
  quizAnswered: boolean;
  streak: number;
  boxes: DailyRewardProfile['boxes'];
}

export const dailyRewardStatus = (
  profile: DailyRewardProfile,
  today: string,
): DailyRewardStatus => ({
  attendanceDates: [...profile.attendanceDates],
  claimedToday: profile.attendanceDates.includes(today),
  quizAnswered: profile.lastQuizDate === today,
  streak: attendanceStreak(profile.attendanceDates, today),
  boxes: { ...profile.boxes },
});

export const claimDailyAttendance = (
  current: DailyRewardProfile,
  today: string,
): { profile: DailyRewardProfile; status: DailyRewardStatus; reward: number; boxGranted?: GiftBoxType } | null => {
  if (!isDateKey(today) || current.attendanceDates.includes(today)) return null;
  const attendanceDates = [...current.attendanceDates, today].sort().slice(-DAILY_REWARD_DATES_LIMIT);
  const streak = attendanceStreak(attendanceDates, today);
  const boxes = { ...current.boxes };
  let boxGranted: GiftBoxType | undefined;
  if (streak % 15 === 5) boxGranted = 'blue';
  else if (streak % 15 === 10) boxGranted = 'gold';
  else if (streak % 15 === 0) boxGranted = 'red';
  if (boxGranted) boxes[boxGranted] += 1;
  const profile: DailyRewardProfile = {
    attendanceDates,
    ...(current.lastQuizDate ? { lastQuizDate: current.lastQuizDate } : {}),
    boxes,
  };
  return { profile, status: dailyRewardStatus(profile, today), reward: DAILY_ATTENDANCE_REWARD, boxGranted };
};

export const claimDailyTrivia = (
  current: DailyRewardProfile,
  today: string,
  answerIndex: unknown,
  reward: number,
): { profile: DailyRewardProfile; status: DailyRewardStatus; reward: number; correct: boolean } | null => {
  if (!isDateKey(today) || current.lastQuizDate === today) return null;
  const question = dailyTriviaForDate(today);
  const answer = Number(answerIndex);
  const correct = Number.isInteger(answer) && answer === question.correct;
  const safeReward = correct
    ? Math.min(DAILY_QUIZ_REWARD_MAX, Math.max(DAILY_QUIZ_REWARD_MIN, Math.floor(reward)))
    : 0;
  const profile: DailyRewardProfile = {
    ...current,
    attendanceDates: [...current.attendanceDates],
    lastQuizDate: today,
    boxes: { ...current.boxes },
  };
  return { profile, status: dailyRewardStatus(profile, today), reward: safeReward, correct };
};

export const claimGiftBox = (
  current: DailyRewardProfile,
  today: string,
  type: unknown,
): { profile: DailyRewardProfile; status: DailyRewardStatus; reward: number; type: GiftBoxType } | null => {
  if (type !== 'blue' && type !== 'gold' && type !== 'red') return null;
  if (!isDateKey(today) || current.boxes[type] <= 0) return null;
  const boxes = { ...current.boxes, [type]: current.boxes[type] - 1 };
  const profile: DailyRewardProfile = {
    ...current,
    attendanceDates: [...current.attendanceDates],
    boxes,
  };
  return { profile, status: dailyRewardStatus(profile, today), reward: GIFT_BOX_REWARDS[type], type };
};
