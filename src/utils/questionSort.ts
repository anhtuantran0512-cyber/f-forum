/* Bản quyền trí tuệ thuộc về BroAmStuck */

/* ==========================================================================
   SẮP XẾP DIỄN ĐÀN HỎI ĐÁP — module THUẦN TUÝ (không import gì)
   --------------------------------------------------------------------------
   Tách ra theo khuôn profileLikes.ts / savedQuestions.ts để node test trực tiếp.

   Lưu ý dữ liệu: `createdAt` là CHUỖI HIỂN THỊ ('Vừa xong', '2 giờ trước', …)
   nên không parse được thành thời điểm. Chỉ `createdAtMs` là số đáng tin, nhưng
   nó optional (câu hỏi cũ trên đĩa có thể thiếu). Mọi hàm dưới đây phải chịu
   được trường hợp thiếu mà không ném lỗi và không đổi thứ tự tương đối.
   ========================================================================== */

export type QuestionSortMode = 'newest' | 'bounty' | 'active' | 'unsolved';

/** Nhãn hiển thị + từ khoá tìm kiếm cho bảng lệnh / menu. */
export const QUESTION_SORT_OPTIONS: {
  id: QuestionSortMode;
  label: string;
  hint: string;
}[] = [
  { id: 'newest', label: 'Mới nhất', hint: 'Câu hỏi vừa đăng lên trước' },
  { id: 'bounty', label: 'Thưởng cao', hint: 'Câu hỏi treo nhiều Coin nhất' },
  { id: 'active', label: 'Sôi nổi', hint: 'Nhiều lời giải nhất' },
  { id: 'unsolved', label: 'Chưa có lời giải', hint: 'Ưu tiên câu hỏi đang cần người giúp' },
];

export const DEFAULT_QUESTION_SORT: QuestionSortMode = 'newest';

export const SAVED_SORT_KEY = 'fforum_question_sort_v1';

/** Coi mọi giá trị lạ là chế độ mặc định — dữ liệu cũ trong storage không làm vỡ UI. */
export const normalizeSortMode = (value?: string | null): QuestionSortMode => {
  const v = String(value || '').trim();
  return (QUESTION_SORT_OPTIONS.some((o) => o.id === v) ? v : DEFAULT_QUESTION_SORT) as QuestionSortMode;
};

export interface SortableQuestion {
  id: string;
  createdAtMs?: number;
  bountyCoin?: number;
  isSolved?: boolean;
}

/** Thời điểm đăng: thiếu `createdAtMs` thì coi như 0 (đẩy về cuối khi xếp mới-nhất). */
export const questionTimeOf = (q: SortableQuestion): number => {
  const ms = Number(q?.createdAtMs);
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
};

/** Số lời giải: tra từ map đã đếm sẵn để không phải đếm lại mỗi lần so sánh. */
export const buildSolutionCounts = (
  solutions: Iterable<{ questionId: string }>,
): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const s of solutions) {
    const qid = String(s?.questionId || '');
    if (!qid) continue;
    counts[qid] = (counts[qid] || 0) + 1;
  }
  return counts;
};

/**
 * Trả về mảng MỚI đã sắp xếp — KHÔNG sửa mảng gốc.
 *
 * `sort` của JS là bất định khi hai phần tử bằng điểm, nên mọi nhánh đều có
 * khoá phụ là thời điểm đăng rồi tới `id`. Nhờ vậy thứ tự ổn định giữa các lần
 * render (không bị "nhảy chỗ" khi dữ liệu mới về) và ổn định giữa các trình duyệt.
 */
export const sortQuestions = <T extends SortableQuestion>(
  questions: T[],
  mode: QuestionSortMode,
  solutionCounts: Record<string, number> = {},
): T[] => {
  const list = Array.isArray(questions) ? [...questions] : [];
  if (list.length < 2) return list;

  const countOf = (q: T) => Number(solutionCounts[q.id] || 0);
  const timeOf = (q: T) => questionTimeOf(q);

  /* Khoá phụ dùng chung: mới hơn trước, rồi tới id để phá hoà triệt để. */
  const tieBreak = (a: T, b: T): number => timeOf(b) - timeOf(a) || String(a.id).localeCompare(String(b.id));

  switch (normalizeSortMode(mode)) {
    case 'bounty':
      return list.sort((a, b) => Number(b.bountyCoin || 0) - Number(a.bountyCoin || 0) || tieBreak(a, b));
    case 'active':
      return list.sort((a, b) => countOf(b) - countOf(a) || tieBreak(a, b));
    case 'unsolved':
      /* Chưa giải lên trước; trong mỗi nhóm vẫn giữ mới-nhất-trước. */
      return list.sort((a, b) => Number(Boolean(a.isSolved)) - Number(Boolean(b.isSolved)) || tieBreak(a, b));
    case 'newest':
    default:
      return list.sort(tieBreak);
  }
};
