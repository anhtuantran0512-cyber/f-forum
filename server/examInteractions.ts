/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { sanitizePlainText } from './authGuard.ts';

const SEED_PAPER_ID = /^ex-\d{2}$/;
const SUBMISSION_PAPER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PUBLIC_REVIEWS_PER_PAPER = 100;
export const SEED_EXAM_INTERACTION_PAPER_IDS = Array.from({ length: 10 }, (_, index) => `ex-${String(index + 1).padStart(2, '0')}`);
const MAX_STORED_INTERACTION_PAPERS = 1_000;

export interface ExamInteractionReviewRecord {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  rating: number;
  content: string;
  createdAt: string;
}

export interface ExamPaperInteractionRecord {
  likes: string[];
  ratings: Record<string, number>;
  reviews: ExamInteractionReviewRecord[];
}

export type ExamInteractionsStore = Record<string, ExamPaperInteractionRecord>;

export interface PublicExamReview {
  id: string;
  authorName: string;
  authorRole: string;
  rating: number;
  date: string;
  content: string;
}

export interface ExamInteractionSnapshot {
  likeCount: number;
  likedByUser: boolean;
  averageRating: number | null;
  ratingCount: number;
  userRating: number | null;
  hasReviewed: boolean;
  reviews: PublicExamReview[];
}

export type ExamInteractionMap = Record<string, ExamInteractionSnapshot>;

export const isValidExamInteractionPaperId = (value: string): boolean =>
  SEED_PAPER_ID.test(value) || SUBMISSION_PAPER_ID.test(value);

export const isValidExamInteractionUserId = (value: string): boolean =>
  /^[a-zA-Z0-9._:-]{1,120}$/.test(value);

const userIdOf = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const userId = value.trim();
  return isValidExamInteractionUserId(userId) ? userId : '';
};

const sanitizeReview = (raw: unknown): ExamInteractionReviewRecord | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const authorId = userIdOf(item.authorId);
  const rating = Number(item.rating);
  const createdAt = typeof item.createdAt === 'string' && Number.isFinite(Date.parse(item.createdAt))
    ? new Date(item.createdAt).toISOString()
    : '';
  const content = sanitizePlainText(item.content, 1_000, true).trim();
  if (!authorId || !createdAt || !content || !Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  return {
    id: sanitizePlainText(item.id, 80) || `review-${authorId}`,
    authorId,
    authorName: sanitizePlainText(item.authorName, 60) || 'Học sinh F-Forum',
    authorRole: sanitizePlainText(item.authorRole, 40) || 'Học sinh',
    rating,
    content,
    createdAt,
  };
};

export const sanitizeExamInteractions = (raw: unknown): ExamInteractionsStore => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: ExamInteractionsStore = {};
  for (const [paperId, value] of Object.entries(raw as Record<string, unknown>).slice(0, MAX_STORED_INTERACTION_PAPERS)) {
    if (!isValidExamInteractionPaperId(paperId) || !value || typeof value !== 'object' || Array.isArray(value)) continue;
    const item = value as Record<string, unknown>;
    const likes = Array.from(new Set(
      (Array.isArray(item.likes) ? item.likes : []).map(userIdOf).filter(Boolean),
    )).slice(0, 50_000);
    const ratings: Record<string, number> = Object.create(null) as Record<string, number>;
    if (item.ratings && typeof item.ratings === 'object' && !Array.isArray(item.ratings)) {
      for (const [rawUserId, rawRating] of Object.entries(item.ratings as Record<string, unknown>).slice(0, 50_000)) {
        const userId = userIdOf(rawUserId);
        const rating = Number(rawRating);
        if (userId && Number.isInteger(rating) && rating >= 1 && rating <= 5) ratings[userId] = rating;
      }
    }
    const reviewsByUser = new Map<string, ExamInteractionReviewRecord>();
    for (const review of (Array.isArray(item.reviews) ? item.reviews : []).slice(0, 10_000)) {
      const clean = sanitizeReview(review);
      if (clean && !reviewsByUser.has(clean.authorId)) reviewsByUser.set(clean.authorId, clean);
    }
    const reviews = [...reviewsByUser.values()]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, MAX_PUBLIC_REVIEWS_PER_PAPER);
    result[paperId] = { likes, ratings, reviews };
  }
  return result;
};

export const emptyExamPaperInteraction = (): ExamPaperInteractionRecord => ({
  likes: [],
  ratings: Object.create(null) as Record<string, number>,
  reviews: [],
});

export const ensureExamPaperInteraction = (
  store: ExamInteractionsStore,
  paperId: string,
): ExamPaperInteractionRecord => {
  const existing = store[paperId];
  if (existing) return existing;
  const empty = emptyExamPaperInteraction();
  store[paperId] = empty;
  return empty;
};

export const buildExamInteractionSnapshots = (
  store: ExamInteractionsStore,
  publicPaperIds: Iterable<string>,
  userId?: string,
): ExamInteractionMap => {
  const snapshots: ExamInteractionMap = {};
  for (const paperId of publicPaperIds) {
    if (!isValidExamInteractionPaperId(paperId)) continue;
    const record = store[paperId] || emptyExamPaperInteraction();
    const ratings = Object.values(record.ratings);
    const ratingTotal = ratings.reduce((sum, rating) => sum + rating, 0);
    const latestReviews = [...record.reviews]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, MAX_PUBLIC_REVIEWS_PER_PAPER);
    snapshots[paperId] = {
      likeCount: new Set(record.likes).size,
      likedByUser: Boolean(userId && record.likes.includes(userId)),
      averageRating: ratings.length ? Math.round((ratingTotal / ratings.length) * 10) / 10 : null,
      ratingCount: ratings.length,
      userRating: userId ? record.ratings[userId] ?? null : null,
      hasReviewed: Boolean(userId && record.reviews.some((review) => review.authorId === userId)),
      reviews: latestReviews.map((review) => ({
        id: review.id,
        authorName: review.authorName,
        authorRole: review.authorRole,
        rating: review.rating,
        date: new Date(review.createdAt).toLocaleDateString('vi-VN'),
        content: review.content,
      })),
    };
  }
  return snapshots;
};

export const setExamPaperLike = (
  record: ExamPaperInteractionRecord,
  userId: string,
  liked: boolean,
): void => {
  const likes = new Set(record.likes);
  if (liked) likes.add(userId);
  else likes.delete(userId);
  record.likes = [...likes];
};

export const setExamPaperRating = (
  record: ExamPaperInteractionRecord,
  userId: string,
  rating: number,
): void => {
  record.ratings[userId] = rating;
};

export const addExamPaperReview = (
  record: ExamPaperInteractionRecord,
  review: ExamInteractionReviewRecord,
): boolean => {
  if (record.reviews.some((entry) => entry.authorId === review.authorId)) return false;
  record.reviews = [review, ...record.reviews].slice(0, MAX_PUBLIC_REVIEWS_PER_PAPER);
  record.ratings[review.authorId] = review.rating;
  return true;
};
