/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { slugifyVi } from './qaRoute.ts';

/* ==========================================================================
   TRANG CHI TIẾT HỎI ĐÁP — các phép tính THUẦN TUÝ (không đụng DOM/React)
   --------------------------------------------------------------------------
   Tách khỏi component để test trực tiếp bằng node (tests/qa-detail-page).
   Mọi con số hiển thị đều tính từ dữ liệu thật đang có trong bộ nhớ; không có
   số liệu nào được bịa ra để trang trông "sôi động" hơn thực tế.
   ========================================================================== */

/* ────────────────────────── Trạng thái câu hỏi ────────────────────────── */

export type QuestionStatus = 'solved' | 'discussing' | 'waiting';

export const QUESTION_STATUS_META: Record<QuestionStatus, { label: string; hint: string }> = {
  solved: { label: 'Đã có lời giải đúng', hint: 'Tác giả hoặc Super Admin đã xác nhận một đáp án chuẩn.' },
  discussing: { label: 'Đang thảo luận', hint: 'Đã có lời giải nhưng chưa xác nhận đáp án nào.' },
  waiting: { label: 'Đang chờ giải đáp', hint: 'Chưa có ai gửi lời giải.' },
};

/**
 * 🟢 solved     — đã có đáp án chuẩn (cờ `isSolved` của câu hỏi hoặc có lời giải `isBest`)
 * 🔵 discussing — đã có lời giải nhưng chưa xác nhận
 * 🟡 waiting    — chưa ai trả lời
 */
export const questionStatusOf = (
  question: { isSolved?: boolean },
  questionSolutions: readonly { isBest?: boolean }[],
): QuestionStatus => {
  if (question.isSolved || questionSolutions.some((solution) => solution.isBest)) return 'solved';
  return questionSolutions.length > 0 ? 'discussing' : 'waiting';
};

/** Đáp án chuẩn nổi lên ĐẦU danh sách; phần còn lại giữ nguyên thứ tự gốc. */
export const orderSolutions = <T extends { isBest?: boolean }>(solutions: readonly T[]): T[] => [
  ...solutions.filter((solution) => solution.isBest),
  ...solutions.filter((solution) => !solution.isBest),
];

/**
 * Phần thưởng của lời giải được xác nhận: 50% tiền cược + 100 Coin danh dự.
 * Phải khớp `solverAwardFor` ở máy chủ (server/authGuard.ts) — đó mới là nơi quyết định số thật.
 */
export const bestRewardCoin = (bountyCoin?: number): number => Math.floor((bountyCoin || 20) * 0.5) + 100;

/* ────────────────────────── Câu hỏi liên quan ────────────────────────── */

export interface RelatableQuestion {
  id: string;
  title: string;
  content?: string;
  subject: string;
  createdAtMs?: number;
}

/* Từ nối tiếng Việt (đã bỏ dấu) — không mang nghĩa chủ đề nên không được tính là "trùng". */
const STOPWORDS = new Set([
  'la', 'va', 'cua', 'cho', 'voi', 'mot', 'nhung', 'cac', 'nay', 'do', 'trong', 'tai', 'sao', 'nao', 'gi',
  'em', 'minh', 'toi', 'giup', 'ho', 'bai', 'cau', 'hoi', 'giai', 'nhu', 'co', 'khong', 'duoc', 'de', 'khi',
  'neu', 'thi', 'ma', 'hay', 'nhe', 'the', 'lam', 'cach', 'tim', 'xin',
]);

/** Từ khoá của một đoạn văn: bỏ dấu, tách theo ký tự không phải chữ/số, bỏ từ nối và mảnh 1 ký tự. */
export const keywordsOf = (text: unknown): Set<string> => {
  const words = slugifyVi(text, 600).split('-');
  return new Set(words.filter((word) => word.length >= 2 && !STOPWORDS.has(word)));
};

const timeOf = (question: { createdAtMs?: number }): number => {
  const ms = Number(question.createdAtMs);
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
};

/**
 * Gợi ý câu hỏi liên quan theo CHỦ ĐỀ (tag) và TỪ KHOÁ trùng — thuật toán xác định, không phải AI.
 *
 *   điểm = 60 nếu cùng chủ đề + tối đa 40 theo mức trùng từ khoá (tiêu đề + đầu nội dung)
 *
 * Chỉ lấy câu cùng chủ đề, hoặc khác chủ đề nhưng trùng ≥ 2 từ khoá — thà ít còn hơn gợi ý bừa.
 * Đồng điểm thì câu mới hơn trước, rồi theo id → thứ tự ổn định giữa các lần render.
 */
export const relatedQuestions = <T extends RelatableQuestion>(
  current: RelatableQuestion,
  all: readonly T[],
  limit: number = 5,
): T[] => {
  const currentWords = keywordsOf(`${current.title} ${String(current.content ?? '').slice(0, 300)}`);
  const scored: { question: T; score: number }[] = [];
  for (const question of all) {
    if (!question || question.id === current.id) continue;
    const words = keywordsOf(`${question.title} ${String(question.content ?? '').slice(0, 300)}`);
    let shared = 0;
    for (const word of words) if (currentWords.has(word)) shared += 1;
    const sameSubject = question.subject === current.subject;
    if (!sameSubject && shared < 2) continue;
    const overlap = shared / Math.max(1, Math.min(currentWords.size, words.size));
    scored.push({ question, score: (sameSubject ? 60 : 0) + Math.round(overlap * 40) });
  }
  scored.sort(
    (a, b) => b.score - a.score || timeOf(b.question) - timeOf(a.question) || String(a.question.id).localeCompare(String(b.question.id)),
  );
  return scored.slice(0, Math.max(0, limit)).map((entry) => entry.question);
};

/* ────────────────────────── Top người giải tuần này ────────────────────────── */

export interface SolverSolutionLike {
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorEmail?: string;
  authorLevel: number;
  isBest?: boolean;
  createdAtMs?: number;
}

export interface SolverUserLike {
  id: string;
  name: string;
  avatar: string;
  email: string;
  level: number;
}

export interface TopSolver {
  key: string;
  authorId: string;
  name: string;
  avatar: string;
  level: number;
  email?: string;
  /** Số lời giải gửi trong tuần */
  solved: number;
  /** Trong đó được xác nhận là đáp án chuẩn */
  best: number;
  points: number;
}

/** Thời điểm hiện tại. Tách thành hàm cấp module để thân component không gọi `Date.now()` trực tiếp (quy ước của repo). */
export const currentTimeMs = (): number => Date.now();

/** 0h thứ Hai (giờ máy) của tuần chứa `nowMs` — cùng định nghĩa "Tuần" với bảng xếp hạng. */
export const weekStartOf = (nowMs: number): number => {
  const date = new Date(nowMs);
  const sinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - sinceMonday);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/** Điểm mỗi lời giải / mỗi đáp án chuẩn — cùng thang với bảng xếp hạng "Điểm đóng góp". */
export const SOLVER_POINTS = { solution: 25, best: 100 } as const;

/**
 * Xếp hạng người giải trong tuần: chỉ tính lời giải CÓ mốc thời gian nằm trong tuần
 * (dữ liệu cũ thiếu `createdAtMs` không dựng được mốc nên không được tính — không đoán bừa).
 */
export const topSolversThisWeek = (
  solutions: readonly SolverSolutionLike[],
  users: Record<string, SolverUserLike> | undefined,
  nowMs: number,
  limit: number = 5,
): TopSolver[] => {
  const since = weekStartOf(nowMs);
  const registry = users ?? {};
  const byId = new Map<string, SolverUserLike>();
  for (const user of Object.values(registry)) if (user?.id) byId.set(user.id, user);

  const rows = new Map<string, TopSolver>();
  for (const solution of solutions) {
    const at = Number(solution?.createdAtMs);
    if (!Number.isFinite(at) || at < since || at > nowMs + 5 * 60_000) continue;
    const email = String(solution.authorEmail || '').toLowerCase();
    const key = email || String(solution.authorId || '');
    if (!key) continue;
    const owner = (email ? registry[email] : undefined) ?? byId.get(solution.authorId);
    const row = rows.get(key) ?? {
      key,
      authorId: solution.authorId,
      name: owner?.name ?? solution.authorName,
      avatar: owner?.avatar ?? solution.authorAvatar,
      level: owner?.level ?? solution.authorLevel,
      email: email || undefined,
      solved: 0,
      best: 0,
      points: 0,
    };
    row.solved += 1;
    row.points += SOLVER_POINTS.solution;
    if (solution.isBest) {
      row.best += 1;
      row.points += SOLVER_POINTS.best;
    }
    rows.set(key, row);
  }

  return [...rows.values()]
    .sort(
      (a, b) =>
        b.points - a.points || b.best - a.best || b.solved - a.solved || String(a.name).localeCompare(String(b.name), 'vi'),
    )
    .slice(0, Math.max(0, limit));
};

/* ────────────────────────── Soạn lời giải ────────────────────────── */

/**
 * Chèn ký hiệu vào ĐÚNG chỗ con trỏ (hoặc thay phần đang bôi đen). Bản cũ luôn nối vào cuối
 * nên gõ công thức dài rồi muốn chèn √ giữa chừng là phải cắt dán. Vượt giới hạn ký tự thì
 * không chèn gì (giữ nguyên nội dung) thay vì cắt cụt công thức.
 */
export const insertAtSelection = (
  text: string,
  start: number | null | undefined,
  end: number | null | undefined,
  insert: string,
  maxLength: number = 1500,
): { text: string; caret: number } => {
  const length = text.length;
  const from = Math.min(length, Math.max(0, start ?? length));
  const to = Math.min(length, Math.max(from, end ?? from));
  const next = text.slice(0, from) + insert + text.slice(to);
  if (next.length > maxLength) return { text, caret: from };
  return { text: next, caret: from + insert.length };
};

/* ────────────────────────── Tiến độ đọc ────────────────────────── */

/** 0 → 1; trang ngắn (không có gì để cuộn) trả 0 để thanh tiến độ ẩn đi thay vì đầy 100% vô nghĩa. */
export const readingProgress = (scrollTop: number, scrollHeight: number, clientHeight: number): number => {
  const max = scrollHeight - clientHeight;
  if (!(max > 8)) return 0;
  return Math.min(1, Math.max(0, scrollTop / max));
};
