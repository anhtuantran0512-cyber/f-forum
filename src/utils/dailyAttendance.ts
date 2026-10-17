/* Bản quyền trí tuệ thuộc về BroAmStuck */

export const ATTENDANCE_CYCLE_DAYS = 15;
export const ATTENDANCE_BOX_MILESTONES = [5, 10, 15] as const;

export interface AttendanceCycleProgress {
  cycleNumber: number;
  cycleDay: number;
  completedDays: number;
  streak: number;
  claimedToday: boolean;
}

/**
 * Convert the authoritative consecutive-day streak into the repeating 15-day
 * reward cycle used by the server (box grants at streak % 15 = 5, 10, or 0).
 */
export const getAttendanceCycleProgress = (
  streakValue: number,
  claimedToday: boolean,
): AttendanceCycleProgress => {
  const streak = Number.isFinite(streakValue) ? Math.max(0, Math.floor(streakValue)) : 0;
  const daysBeforeToday = claimedToday ? Math.max(0, streak - 1) : streak;
  const cycleNumber = Math.floor(daysBeforeToday / ATTENDANCE_CYCLE_DAYS) + 1;
  const cycleDay = claimedToday
    ? Math.max(1, ((streak - 1) % ATTENDANCE_CYCLE_DAYS) + 1)
    : (streak % ATTENDANCE_CYCLE_DAYS) + 1;

  return {
    cycleNumber,
    cycleDay,
    completedDays: claimedToday ? cycleDay : cycleDay - 1,
    streak,
    claimedToday,
  };
};
