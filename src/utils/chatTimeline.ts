/* Bản quyền trí tuệ thuộc về BroAmStuck */
import type { ChatMessage } from '../types';

const clockMinutes = (value: string): number | null => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

/**
 * Gộp các tin liên tiếp của cùng một tác giả trong cùng kênh nếu cách nhau
 * không quá 5 phút tính từ tin đầu cụm. Tin cách xa cụm hoặc khác tác giả sẽ
 * mở cụm mới để giữ nhịp đọc rõ ràng thay vì treo lặp tên/avatar ở từng dòng.
 * Timestamp không đọc được thì mở cụm mới (không đoán bừa).
 */
const MAX_GROUP_GAP_MINUTES = 5;

const minutesBetween = (start: ChatMessage | string, current: ChatMessage): number | null => {
  if (
    typeof start !== 'string' &&
    typeof start.timestampMs === 'number' &&
    Number.isFinite(start.timestampMs) &&
    typeof current.timestampMs === 'number' &&
    Number.isFinite(current.timestampMs)
  ) {
    return (current.timestampMs - start.timestampMs) / 60000;
  }
  const startTime = clockMinutes(typeof start === 'string' ? start : start.timestamp);
  const currentTime = clockMinutes(current.timestamp);
  if (startTime === null || currentTime === null) return null;
  return currentTime - startTime;
};

/**
 * Gộp các tin liên tiếp của cùng một tác giả trong cùng kênh nếu cách nhau
 * không quá 5 phút tính từ tin đầu cụm. Tin cách xa cụm hoặc khác tác giả sẽ
 * mở cụm mới để giữ nhịp đọc rõ ràng thay vì treo lặp tên/avatar ở từng dòng.
 * Timestamp không đọc được thì mở cụm mới (không đoán bừa).
 */
export const isChatContinuation = (
  previous: ChatMessage | null | undefined,
  current: ChatMessage,
  groupStart?: ChatMessage | string | null,
): boolean => {
  if (!previous) return false;
  if (previous.authorId !== current.authorId) return false;
  if (previous.channelId !== current.channelId) return false;
  const gap = minutesBetween(groupStart ?? previous, current);
  return gap !== null && gap >= 0 && gap <= MAX_GROUP_GAP_MINUTES;
};

/** Cờ đầu cụm cho từng tin, tính một lượt để không phải giữ biến đổi trong render. */
export const getChatGroupStarts = (messages: ChatMessage[]): boolean[] => {
  const starts: boolean[] = [];
  let groupStart: ChatMessage | null = null;
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    const previous = index > 0 ? messages[index - 1] : null;
    const continuation = isChatContinuation(previous, message, groupStart);
    starts.push(!continuation);
    if (!continuation) groupStart = message;
  }
  return starts;
};
