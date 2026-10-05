/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { safeStorage } from './storage';

/**
 * Thưởng học tập theo tổng phút đã ghi trong ngày (không tính theo số phiên).
 * 25′ trả đúng 25 Coin; các mốc cao hơn chỉ cộng phần chênh lệch, để tổng
 * thưởng Phòng Tập Trung không vượt quá 120 Coin/ngày và không thể farm bằng
 * cách chia nhỏ một phiên thành nhiều phiên.
 */
export const STUDY_GOAL_REWARD_MILESTONES = [
  { minutes: 25, coins: 25 },
  { minutes: 60, coins: 35 },
  { minutes: 120, coins: 60 },
] as const;

export const MAX_STUDY_GOAL_COINS_PER_DAY = 120;
export const STUDY_REWARD_SYNC_EVENT = 'fforum_study_reward_sync';
const STUDY_REWARD_LEDGER_PREFIX = 'fforum_study_goal_reward_';

export interface StudyGoalReward {
  minutes: number;
  coins: number;
}

export interface StudyGoalRewardState {
  date: string;
  claimedMinutes: number[];
  coinsAwarded: number;
}

const localDateKey = (now: number | Date = Date.now()): string => {
  const date = now instanceof Date ? now : new Date(now);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const storageKeyFor = (owner: string): string =>
  `${STUDY_REWARD_LEDGER_PREFIX}${encodeURIComponent(owner.trim().toLowerCase())}`;

const emptyState = (date: string): StudyGoalRewardState => ({
  date,
  claimedMinutes: [],
  coinsAwarded: 0,
});

/** Đọc trạng thái thưởng của đúng tài khoản, chỉ trong ngày hiện tại. */
export const readStudyGoalRewardState = (
  owner: string | null | undefined,
  now: number | Date = Date.now(),
): StudyGoalRewardState => {
  const date = localDateKey(now);
  if (!owner?.trim()) return emptyState(date);

  try {
    const raw = safeStorage.getItem(storageKeyFor(owner));
    if (!raw) return emptyState(date);
    const parsed = JSON.parse(raw) as Partial<StudyGoalRewardState>;
    if (parsed.date !== date) return emptyState(date);

    const allowedMinutes = new Set<number>(STUDY_GOAL_REWARD_MILESTONES.map((goal) => goal.minutes));
    const claimedMinutes = Array.isArray(parsed.claimedMinutes)
      ? [...new Set(parsed.claimedMinutes.filter((minute): minute is number =>
          typeof minute === 'number' && allowedMinutes.has(minute),
        ))].sort((a, b) => a - b)
      : [];
    const rawCoins = typeof parsed.coinsAwarded === 'number' && Number.isFinite(parsed.coinsAwarded)
      ? Math.floor(parsed.coinsAwarded)
      : 0;

    return {
      date,
      claimedMinutes,
      coinsAwarded: Math.max(0, Math.min(MAX_STUDY_GOAL_COINS_PER_DAY, rawCoins)),
    };
  } catch {
    return emptyState(date);
  }
};

/**
 * Chốt những mốc vừa đạt được. Ledger được ghi đồng bộ trước khi trả phần
 * thưởng, nên lần kiểm tra tiếp theo (kể cả từ một tab khác) không thể nhận lặp.
 */
export const claimStudyGoalRewards = (
  owner: string | null | undefined,
  todayMinutes: number,
  now: number | Date = Date.now(),
): StudyGoalReward[] => {
  if (!owner?.trim() || !Number.isFinite(todayMinutes) || todayMinutes < 0) return [];

  const state = readStudyGoalRewardState(owner, now);
  const claimed = new Set(state.claimedMinutes);
  let coinsAwarded = state.coinsAwarded;
  const rewards: StudyGoalReward[] = [];

  STUDY_GOAL_REWARD_MILESTONES.forEach((goal) => {
    if (todayMinutes < goal.minutes || claimed.has(goal.minutes)) return;

    claimed.add(goal.minutes);
    const coins = Math.min(
      goal.coins,
      Math.max(0, MAX_STUDY_GOAL_COINS_PER_DAY - coinsAwarded),
    );
    if (coins > 0) {
      rewards.push({ minutes: goal.minutes, coins });
      coinsAwarded += coins;
    }
  });

  if (claimed.size !== state.claimedMinutes.length) {
    const nextState: StudyGoalRewardState = {
      date: state.date,
      claimedMinutes: [...claimed].sort((a, b) => a - b),
      coinsAwarded,
    };
    safeStorage.setItem(storageKeyFor(owner), JSON.stringify(nextState));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(STUDY_REWARD_SYNC_EVENT));
    }
  }

  return rewards;
};
