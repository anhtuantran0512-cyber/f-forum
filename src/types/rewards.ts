import type { User } from './index';

export type RewardBoxType = 'blue' | 'gold' | 'red';

export interface StudyRewardMilestone {
  minutes: number;
  coins: number;
}

export interface DailyRewardStateSummary {
  date: string;
  attendanceStreak: number;
  attendanceClaimed: boolean;
  boxes: Record<RewardBoxType, string[]>;
  triviaIndex: number;
  triviaClaimed: boolean;
  triviaCorrect: boolean | null;
  triviaCoins: number;
  studyMinutes: number;
  studyClaimedMinutes: number[];
}

export type DailyRewardAction =
  | { type: 'attendance' }
  | { type: 'trivia'; answerIndex: number }
  | { type: 'open-box'; boxId: string };

export interface RewardApiResponse {
  success: boolean;
  message?: string;
  user?: User;
  state?: DailyRewardStateSummary;
  rewardCoins?: number;
  previousRewardCoins?: number;
  alreadyClaimed?: boolean;
  alreadyOpened?: boolean;
  correct?: boolean;
  rewards?: StudyRewardMilestone[];
  studyMinutes?: number;
  sessionId?: string;
}
