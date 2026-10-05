/* Server-defined study reward milestones shared by the display surfaces. */
export const STUDY_GOAL_REWARD_MILESTONES = [
  { minutes: 25, coins: 25 },
  { minutes: 60, coins: 35 },
  { minutes: 120, coins: 60 },
] as const;

export const MAX_STUDY_GOAL_COINS_PER_DAY = 120;
export const STUDY_REWARD_SYNC_EVENT = 'fforum_study_reward_sync';
