/* Bản quyền trí tuệ thuộc về BroAmStuck */

/** Local, cross-tab record of unique viewers who liked each exam paper. */
export const EXAM_LIKES_KEY = 'fforum_exam_likes_v1';

export type ExamLikesMap = Record<string, string[]>;

const normalizeExamId = (value?: string | null): string => String(value || '').trim();
const normalizeViewerKey = (value?: string | null): string =>
  String(value || '').trim().toLowerCase();

const uniqueViewerKeys = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((viewer): viewer is string => typeof viewer === 'string')
        .map(normalizeViewerKey)
        .filter(Boolean),
    ),
  );
};

/** Read a stored likes map, dropping malformed entries and duplicate viewers. */
export const parseExamLikes = (raw?: string | null): ExamLikesMap => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const clean: ExamLikesMap = {};
    Object.entries(parsed as Record<string, unknown>).forEach(([rawExamId, viewers]) => {
      const examId = normalizeExamId(rawExamId);
      const uniqueViewers = uniqueViewerKeys(viewers);
      if (examId && uniqueViewers.length > 0) clean[examId] = uniqueViewers;
    });
    return clean;
  } catch {
    return {};
  }
};

/** Serialize a clean map so repeated clicks or duplicate storage values cannot inflate counts. */
export const serializeExamLikes = (map: ExamLikesMap): string => {
  const clean: ExamLikesMap = {};
  Object.entries(map || {}).forEach(([rawExamId, viewers]) => {
    const examId = normalizeExamId(rawExamId);
    const uniqueViewers = uniqueViewerKeys(viewers);
    if (examId && uniqueViewers.length > 0) clean[examId] = uniqueViewers;
  });
  return JSON.stringify(clean);
};

export const examLikersOf = (map: ExamLikesMap, examId?: string | null): string[] =>
  map?.[normalizeExamId(examId)] || [];

export const isExamLikedBy = (
  map: ExamLikesMap,
  examId?: string | null,
  viewerKey?: string | null,
): boolean => {
  const viewer = normalizeViewerKey(viewerKey);
  return Boolean(viewer && examLikersOf(map, examId).includes(viewer));
};

/** Seed likes plus one contribution per unique viewer. */
export const examLikeCount = (baseCount: number, likers?: string[] | null): number => {
  const base = Number.isFinite(baseCount) ? Math.max(0, Math.round(baseCount)) : 0;
  return base + uniqueViewerKeys(likers).length;
};

/** Set one viewer's desired state; setting the same state twice is a no-op. */
export const setExamLike = (
  map: ExamLikesMap,
  examId?: string | null,
  viewerKey?: string | null,
  liked?: boolean,
): ExamLikesMap => {
  const key = normalizeExamId(examId);
  const viewer = normalizeViewerKey(viewerKey);
  if (!key || !viewer) return map;

  const current = examLikersOf(map, key);
  const exists = current.includes(viewer);
  const wanted = Boolean(liked);
  if (exists === wanted) return map;

  const nextViewers = wanted ? [...current, viewer] : current.filter((item) => item !== viewer);
  const next = { ...map };
  if (nextViewers.length > 0) next[key] = nextViewers;
  else delete next[key];
  return next;
};

/** Toggle one viewer's like without ever accumulating duplicate likes. */
export const toggleExamLike = (
  map: ExamLikesMap,
  examId?: string | null,
  viewerKey?: string | null,
): ExamLikesMap =>
  setExamLike(map, examId, viewerKey, !isExamLikedBy(map, examId, viewerKey));
