export type GiftBoxType = 'blue' | 'gold' | 'red';

export interface DailyRewardStatus {
  /** Ngày theo múi giờ do máy chủ chọn. */
  date?: string;
  attendanceDates: string[];
  claimedToday: boolean;
  quizAnswered: boolean;
  streak: number;
  boxes: Record<GiftBoxType, number>;
}

export type DailyRewardAction =
  | { action: 'attendance' }
  | { action: 'quiz'; answerIndex: number }
  | { action: 'box'; boxType: GiftBoxType };

export interface DailyRewardActionResult {
  ok: boolean;
  message?: string;
  status?: DailyRewardStatus;
  reward?: number;
  correct?: boolean;
  boxGranted?: GiftBoxType;
  httpStatus?: number;
}
