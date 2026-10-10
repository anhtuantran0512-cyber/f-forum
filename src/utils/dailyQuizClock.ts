/* A wall-clock deadline survives throttled tabs and modal tab switches. */
export const QUIZ_DURATION_SECONDS = 15;
export const quizSecondsLeft = (deadline: number, now = Date.now()): number =>
  Math.max(0, Math.ceil((deadline - now) / 1000));
