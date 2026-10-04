/* Bản quyền trí tuệ thuộc về BroAmStuck */
import type { StudyCard, StudyDeck, StudySession, SubjectTag } from '../types';

/* =========================================================================
 * Phòng Ôn Tập — Động cơ lặp lại ngắt quãng (Leitner 6 hộp)
 * Toàn bộ hàm trong file này là hàm thuần (pure) để có thể kiểm thử bằng
 * Node Test Runner mà không cần DOM.
 * ========================================================================= */

export type StudyGrade = 'again' | 'hard' | 'good' | 'easy';

export const STUDY_BOX_COUNT = 6;
export const MASTERED_BOX = STUDY_BOX_COUNT - 1;

export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** Khoảng cách ôn tập của từng hộp Leitner (index = hộp). */
export const STUDY_BOX_INTERVALS_MS: number[] = [
  0, /* 0 — thẻ mới hoặc vừa quên: ôn lại ngay trong phiên */
  10 * MINUTE_MS, /* 1 */
  1 * DAY_MS, /* 2 */
  3 * DAY_MS, /* 3 */
  7 * DAY_MS, /* 4 */
  21 * DAY_MS, /* 5 — đã thuộc */
];

export const RELEARN_DELAY_MS = MINUTE_MS;

export const STUDY_GRADE_LABELS: Record<StudyGrade, string> = {
  again: 'Quên rồi',
  hard: 'Khó',
  good: 'Được',
  easy: 'Dễ',
};

export const SUBJECT_LABELS: Record<SubjectTag, string> = {
  toan: 'Toán học',
  ly: 'Vật lý',
  hoa: 'Hóa học',
  sinh: 'Sinh học',
  anh: 'Tiếng Anh',
  tin: 'Tin học',
  van: 'Ngữ văn',
  su: 'Lịch sử',
  hotro: 'Hỗ trợ học tập',
  kinhnghiem: 'Kinh nghiệm',
  share: 'Chia sẻ tài liệu',
  tamsu: 'Tâm sự',
  tamly: 'Tâm lý',
};

function randomId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  return `${prefix}-${rand}`;
}

/** Khoảng thời gian [đầu ngày, đầu ngày kế tiếp) theo giờ máy — dùng cho thống kê. */
export function getStudyDayWindow(referenceMs: number = Date.now(), dayOffset = 0): { start: number; end: number } {
  const reference = new Date(referenceMs);
  reference.setHours(0, 0, 0, 0);
  const start = reference.getTime() + dayOffset * DAY_MS;
  return { start, end: start + DAY_MS };
}

/* ------------------------------ Khởi tạo ------------------------------ */

export function createStudyCard(front: string, back: string, hint?: string, now = Date.now()): StudyCard {
  return {
    id: randomId('card'),
    front: front.trim(),
    back: back.trim(),
    hint: hint?.trim() || undefined,
    box: 0,
    dueAt: now,
    lapses: 0,
    reviews: 0,
    createdAt: now,
  };
}

export function createStudyDeck(input: {
  title: string;
  description?: string;
  subject: SubjectTag;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  isPublic?: boolean;
  cards?: StudyCard[];
  now?: number;
}): StudyDeck {
  const now = input.now ?? Date.now();
  return {
    id: randomId('deck'),
    title: input.title.trim(),
    description: (input.description || '').trim(),
    subject: input.subject,
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    ownerAvatar: input.ownerAvatar,
    cards: input.cards ?? [],
    isPublic: input.isPublic ?? true,
    createdAt: now,
    updatedAt: now,
    starredBy: [],
    cloneCount: 0,
  };
}

/* --------------------------- Truy vấn trạng thái --------------------------- */

export function isCardDue(card: StudyCard, now = Date.now()): boolean {
  return card.dueAt <= now;
}

export function isCardNew(card: StudyCard): boolean {
  return card.reviews === 0;
}

export function isCardMastered(card: StudyCard): boolean {
  return card.box >= MASTERED_BOX;
}

export function getDueCards(deck: StudyDeck, now = Date.now()): StudyCard[] {
  return deck.cards.filter(card => isCardDue(card, now));
}

export function getNewCards(deck: StudyDeck): StudyCard[] {
  return deck.cards.filter(card => isCardNew(card));
}

export interface DeckStats {
  total: number;
  due: number;
  fresh: number;
  learning: number;
  mastered: number;
  masteredPct: number;
  avgBox: number;
  nextDueAt: number | null;
  accuracyPct: number;
}

export function getDeckStats(deck: StudyDeck, now = Date.now()): DeckStats {
  const total = deck.cards.length;
  let due = 0;
  let fresh = 0;
  let learning = 0;
  let mastered = 0;
  let boxSum = 0;
  let reviews = 0;
  let lapses = 0;
  let nextDueAt: number | null = null;

  for (const card of deck.cards) {
    if (isCardDue(card, now)) due += 1;
    if (isCardNew(card)) fresh += 1;
    if (!isCardNew(card) && !isCardMastered(card)) learning += 1;
    if (isCardMastered(card)) mastered += 1;
    boxSum += card.box;
    reviews += card.reviews;
    lapses += card.lapses;
    if (card.dueAt > now) {
      nextDueAt = nextDueAt === null ? card.dueAt : Math.min(nextDueAt, card.dueAt);
    }
  }

  const accuracyPct = reviews === 0 ? 0 : Math.round(((reviews - lapses) / reviews) * 100);

  return {
    total,
    due,
    fresh,
    learning,
    mastered,
    masteredPct: total === 0 ? 0 : Math.round((mastered / total) * 100),
    avgBox: total === 0 ? 0 : Math.round((boxSum / total) * 10) / 10,
    nextDueAt,
    accuracyPct: Math.max(0, Math.min(100, accuracyPct)),
  };
}

/* ------------------------------- Ôn tập ------------------------------- */

/** Khoảng thời gian dự kiến tới lần ôn kế tiếp, dùng cho nhãn nút chấm điểm. */
export function estimateNextIntervalMs(grade: StudyGrade, currentBox: number): number {
  switch (grade) {
    case 'again':
      return RELEARN_DELAY_MS;
    case 'hard': {
      const box = Math.max(1, Math.min(MASTERED_BOX, currentBox));
      return Math.max(STUDY_BOX_INTERVALS_MS[box], 5 * MINUTE_MS);
    }
    case 'good': {
      const box = Math.min(MASTERED_BOX, Math.max(0, currentBox) + 1);
      return STUDY_BOX_INTERVALS_MS[box];
    }
    case 'easy': {
      const box = Math.min(MASTERED_BOX, Math.max(0, currentBox) + 2);
      return STUDY_BOX_INTERVALS_MS[box];
    }
    default:
      return RELEARN_DELAY_MS;
  }
}

export function reviewStudyCard(card: StudyCard, grade: StudyGrade, now = Date.now()): StudyCard {
  const nextInterval = estimateNextIntervalMs(grade, card.box);

  let nextBox: number;
  if (grade === 'again') {
    nextBox = 0;
  } else if (grade === 'hard') {
    nextBox = Math.max(1, Math.min(MASTERED_BOX, card.box));
  } else if (grade === 'good') {
    nextBox = Math.min(MASTERED_BOX, card.box + 1);
  } else {
    nextBox = Math.min(MASTERED_BOX, card.box + 2);
  }

  return {
    ...card,
    box: nextBox,
    dueAt: now + nextInterval,
    reviews: card.reviews + 1,
    lapses: grade === 'again' ? card.lapses + 1 : card.lapses,
    lastReviewedAt: now,
  };
}

export function formatInterval(ms: number): string {
  if (ms < HOUR_MS) {
    const minutes = Math.max(1, Math.round(ms / MINUTE_MS));
    return `${minutes} phút`;
  }
  if (ms < DAY_MS) {
    const hours = Math.max(1, Math.round(ms / HOUR_MS));
    return `${hours} giờ`;
  }
  const days = Math.round(ms / DAY_MS);
  if (days < 30) return `${days} ngày`;
  const months = Math.round(days / 30);
  return months >= 12 ? `${Math.round(days / 365)} năm` : `${months} tháng`;
}

/** Nhãn ngắn gọn cho mốc ôn kế tiếp: "Hôm nay", "Ngày mai", "12/10". */
export function formatDueLabel(dueAt: number, now = Date.now()): string {
  if (dueAt <= now) return 'Đến hạn';
  const diff = dueAt - now;
  if (diff < HOUR_MS) return `${Math.max(1, Math.round(diff / MINUTE_MS))} phút nữa`;
  if (diff < DAY_MS) return `${Math.round(diff / HOUR_MS)} giờ nữa`;
  if (diff < 2 * DAY_MS) return 'Ngày mai';
  const date = new Date(dueAt);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

/* --------------------------------- Quiz --------------------------------- */

export interface QuizQuestion {
  cardId: string;
  prompt: string;
  hint?: string;
  options: string[];
  answerIndex: number;
}

/** PRNG nhỏ, xác định (deterministic) để quiz có thể kiểm thử. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const QUIZ_MIN_CARDS = 3;

/**
 * Sinh đề trắc nghiệm từ một bộ thẻ.
 * - Cần tối thiểu `QUIZ_MIN_CARDS` thẻ có mặt sau khác nhau để tạo phương án nhiễu.
 * - Trả về tối đa `count` câu, mỗi câu 4 lựa chọn (hoặc ít hơn nếu bộ thẻ quá nhỏ).
 */
export function buildQuizQuestions(deck: StudyDeck, count = 10, seed = 1): QuizQuestion[] {
  const usable = deck.cards.filter(card => card.front.trim() && card.back.trim());
  const distinctAnswers = Array.from(new Set(usable.map(card => card.back.trim())));
  if (usable.length < QUIZ_MIN_CARDS || distinctAnswers.length < QUIZ_MIN_CARDS) return [];

  const rand = mulberry32(seed + deck.id.length * 7919);
  const picked = shuffle(usable, rand).slice(0, Math.max(1, count));

  return picked.map(card => {
    const correct = card.back.trim();
    const distractors = shuffle(
      distinctAnswers.filter(answer => answer !== correct),
      rand,
    ).slice(0, 3);

    const options = shuffle([correct, ...distractors], rand);
    return {
      cardId: card.id,
      prompt: card.front.trim(),
      hint: card.hint,
      options,
      answerIndex: options.indexOf(correct),
    };
  });
}

export function computeQuizScore(questions: QuizQuestion[], answers: (number | null)[]): { correct: number; total: number; scorePct: number } {
  const total = questions.length;
  let correct = 0;
  questions.forEach((question, index) => {
    if (answers[index] === question.answerIndex) correct += 1;
  });
  return { correct, total, scorePct: total === 0 ? 0 : Math.round((correct / total) * 100) };
}

/* -------------------------------- Phần thưởng -------------------------------- */

export const STUDY_REVIEW_XP: Record<StudyGrade, number> = { again: 0, hard: 1, good: 2, easy: 3 };
export const REVIEW_SESSION_XP_CAP = 120;
export const QUIZ_CORRECT_XP = 4;
export const QUIZ_BONUS_XP = 25;
export const QUIZ_PERFECT_BONUS_XP = 25;

export function calculateReviewXP(grades: StudyGrade[]): number {
  const raw = grades.reduce((sum, grade) => sum + (STUDY_REVIEW_XP[grade] ?? 0), 0);
  return Math.min(REVIEW_SESSION_XP_CAP, raw);
}

export function calculateQuizXP(correct: number, total: number): number {
  if (total <= 0) return 0;
  const base = correct * QUIZ_CORRECT_XP;
  const scorePct = Math.round((correct / total) * 100);
  if (scorePct === 100) return base + QUIZ_BONUS_XP + QUIZ_PERFECT_BONUS_XP;
  if (scorePct >= 80) return base + QUIZ_BONUS_XP;
  return base;
}

/* --------------------------- Đồng bộ & dữ liệu bẩn --------------------------- */

export const MAX_DECK_CARDS = 300;
export const MAX_CARDS_PER_IMPORT = 200;

export function parseBulkCards(text: string): { front: string; back: string; hint?: string }[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, MAX_CARDS_PER_IMPORT)
    .map(line => {
      const parts = line.split('|').map(part => part.trim());
      return { front: parts[0] || '', back: parts[1] || '', hint: parts[2] || undefined };
    })
    .filter(entry => entry.front && entry.back);
}

/** Chuẩn hoá dữ liệu bộ thẻ đến từ localStorage / WebSocket / REST. */
export function sanitizeDeck(raw: any): StudyDeck | null {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id !== 'string' || !raw.id) return null;
  if (typeof raw.title !== 'string' || !raw.title.trim()) return null;

  const rawCards = Array.isArray(raw.cards) ? raw.cards : [];
  const cards: StudyCard[] = rawCards
    .filter((card: any) => card && typeof card === 'object' && typeof card.id === 'string')
    .slice(0, MAX_DECK_CARDS)
    .map((card: any): StudyCard => ({
      id: card.id,
      front: String(card.front ?? ''),
      back: String(card.back ?? ''),
      hint: card.hint ? String(card.hint) : undefined,
      box: Math.max(0, Math.min(MASTERED_BOX, Number(card.box) || 0)),
      dueAt: Number(card.dueAt) || 0,
      lapses: Math.max(0, Number(card.lapses) || 0),
      reviews: Math.max(0, Number(card.reviews) || 0),
      lastReviewedAt: card.lastReviewedAt ? Number(card.lastReviewedAt) : undefined,
      createdAt: Number(card.createdAt) || Date.now(),
    }));

  return {
    id: raw.id,
    title: String(raw.title).trim(),
    description: typeof raw.description === 'string' ? raw.description : '',
    subject: (raw.subject || 'toan') as SubjectTag,
    ownerId: String(raw.ownerId ?? 'unknown'),
    ownerName: String(raw.ownerName ?? 'Học sinh'),
    ownerAvatar: raw.ownerAvatar ? String(raw.ownerAvatar) : undefined,
    cards,
    isPublic: raw.isPublic !== false,
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Number(raw.createdAt) || Date.now(),
    starredBy: Array.isArray(raw.starredBy) ? raw.starredBy.map(String) : [],
    cloneCount: Math.max(0, Number(raw.cloneCount) || 0),
  };
}

export function sanitizeDecks(raw: any): StudyDeck[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(sanitizeDeck).filter((deck): deck is StudyDeck => Boolean(deck));
}

export function summarizeSession(session: StudySession): string {
  if (session.mode === 'quiz') {
    return `${session.scorePct}% • ${session.correct}/${session.total} câu đúng`;
  }
  return `Ôn ${session.total} thẻ • +${session.xpAwarded} XP`;
}
