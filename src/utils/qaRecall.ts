/* Bản quyền trí tuệ thuộc về BroAmStuck */

import type { Question, Solution, SubjectTag } from '../types';

/** Các mục hỏi đáp phù hợp để ôn kiến thức, không phải thảo luận đời sống. */
const RECALL_SUBJECTS = new Set<SubjectTag>([
  'toan',
  'ly',
  'hoa',
  'sinh',
  'anh',
  'tin',
  'van',
  'su',
  'kinhnghiem',
]);

export interface RecallEntry {
  question: Question;
  solution: Solution;
}

export type RecallSolutionPart =
  | { type: 'text'; content: string }
  | { type: 'image'; url: string };

const isUsableBestSolution = (solution: Solution): boolean =>
  solution.isBest &&
  solution.status !== 'deleted' &&
  solution.status !== 'review' &&
  (Boolean(solution.content?.trim()) || Boolean(solution.imageUrl?.trim()));

/**
 * Tạo một thẻ luyện từ câu hỏi đã giải và lời giải thành viên được đánh dấu tốt nhất.
 * Nội dung lời giải luôn giữ nguyên nguồn; hàm này không sinh hay sửa đáp án.
 */
export const buildRecallEntry = (
  question: Question,
  candidateSolutions: readonly Solution[],
): RecallEntry | null => {
  if (
    question.status === 'deleted' ||
    !question.isSolved ||
    !question.title?.trim() ||
    !RECALL_SUBJECTS.has(question.subject)
  ) {
    return null;
  }

  const usableSolutions = candidateSolutions.filter(
    (solution) => solution.questionId === question.id && isUsableBestSolution(solution),
  );
  const solution =
    usableSolutions.find((candidate) => candidate.id === question.bestSolutionId) ?? usableSolutions[0];

  return solution ? { question, solution } : null;
};

/**
 * Dựng bộ luyện theo đúng thứ tự mục đã lưu mới nhất trước. Chỉ đưa vào câu hỏi
 * còn tồn tại, thuộc môn học, đã giải và có lời giải cộng đồng đang hoạt động.
 */
export const buildSavedRecallDeck = (
  questions: readonly Question[],
  solutions: readonly Solution[],
  savedQuestionIds: readonly string[],
): RecallEntry[] => {
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const solutionsByQuestionId = new Map<string, Solution[]>();

  for (const solution of solutions) {
    const current = solutionsByQuestionId.get(solution.questionId);
    if (current) current.push(solution);
    else solutionsByQuestionId.set(solution.questionId, [solution]);
  }

  const uniqueSavedIds = Array.from(
    new Set(savedQuestionIds.map((id) => String(id ?? '').trim()).filter(Boolean)),
  );

  return uniqueSavedIds.flatMap((questionId) => {
    const question = questionsById.get(questionId);
    if (!question) return [];
    const entry = buildRecallEntry(question, solutionsByQuestionId.get(questionId) ?? []);
    return entry ? [entry] : [];
  });
};

/** Tách theo dòng/đoạn do người viết tạo, giữ nguyên thứ tự; không diễn giải. */
export const splitRecallSolution = (solution: Solution): RecallSolutionPart[] => {
  const textParts = (solution.content ?? '')
    .split(/\r?\n+/u)
    .map((content) => content.trim())
    .filter(Boolean)
    .map((content): RecallSolutionPart => ({ type: 'text', content }));
  const imageUrl = solution.imageUrl?.trim();

  return imageUrl ? [...textParts, { type: 'image', url: imageUrl }] : textParts;
};
