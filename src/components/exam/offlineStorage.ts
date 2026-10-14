/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { safeStorage } from '../../utils/storage';
import type { ExamPaper } from '../../types';

export const OFFLINE_EXAMS_CACHE_KEY = 'fforum_cached_exam_ids';
export const OFFLINE_EXAMS_DATA_KEY = 'fforum_cached_exams_data';

/* Lấy danh sách ID các đề thi đã được lưu ngoại tuyến */
export function getCachedExamIds(): string[] {
  try {
    const raw = safeStorage.getItem(OFFLINE_EXAMS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* Kiểm tra xem một đề thi có đang ở trong bộ nhớ ngoại tuyến hay không */
export function isExamCachedOffline(examId: string): boolean {
  const ids = getCachedExamIds();
  return ids.includes(examId);
}

/* Lưu toàn bộ dữ liệu đề thi vào bộ nhớ cache ngoại tuyến */
export function cacheExamOffline(paper: ExamPaper): boolean {
  try {
    const ids = getCachedExamIds();
    if (!ids.includes(paper.id)) {
      ids.push(paper.id);
      safeStorage.setItem(OFFLINE_EXAMS_CACHE_KEY, JSON.stringify(ids));
    }

    const rawData = safeStorage.getItem(OFFLINE_EXAMS_DATA_KEY);
    const dataMap: Record<string, ExamPaper> = rawData ? JSON.parse(rawData) : {};
    dataMap[paper.id] = { ...paper, isCachedOffline: true };
    safeStorage.setItem(OFFLINE_EXAMS_DATA_KEY, JSON.stringify(dataMap));
    return true;
  } catch {
    return false;
  }
}

/* Xoá đề thi khỏi bộ nhớ cache ngoại tuyến */
export function removeExamFromOfflineCache(examId: string): boolean {
  try {
    const ids = getCachedExamIds().filter((id) => id !== examId);
    safeStorage.setItem(OFFLINE_EXAMS_CACHE_KEY, JSON.stringify(ids));

    const rawData = safeStorage.getItem(OFFLINE_EXAMS_DATA_KEY);
    if (rawData) {
      const dataMap: Record<string, ExamPaper> = JSON.parse(rawData);
      delete dataMap[examId];
      safeStorage.setItem(OFFLINE_EXAMS_DATA_KEY, JSON.stringify(dataMap));
    }
    return true;
  } catch {
    return false;
  }
}

/* Xoá toàn bộ cache đề thi ngoại tuyến */
export function clearAllOfflineExamCache(): boolean {
  try {
    safeStorage.removeItem(OFFLINE_EXAMS_CACHE_KEY);
    safeStorage.removeItem(OFFLINE_EXAMS_DATA_KEY);
    return true;
  } catch {
    return false;
  }
}

/* Lấy danh sách các đề thi được lưu trong bộ nhớ ngoại tuyến */
export function getOfflineCachedPapers(): ExamPaper[] {
  try {
    const rawData = safeStorage.getItem(OFFLINE_EXAMS_DATA_KEY);
    if (!rawData) return [];
    const dataMap: Record<string, ExamPaper> = JSON.parse(rawData);
    return Object.values(dataMap);
  } catch {
    return [];
  }
}
