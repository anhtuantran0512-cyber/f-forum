/* Bản quyền trí tuệ thuộc về BroAmStuck */
import type { Question, Solution, User } from '../../../types';
import { MASTER_ADMIN_CONFIG, isMasterAdmin } from '../../../config/admin';

/** Thông tin tác giả đưa vào thẻ nhỏ (xem hồ sơ / tố cáo) khi bấm vào tên hoặc ảnh. */
export interface QAAuthorInfo {
  id: string;
  name: string;
  avatar: string;
  email?: string;
  level: number;
  coin?: number;
}

/** Mở thẻ tác giả tại vị trí bấm. */
export type OpenAuthor = (author: QAAuthorInfo, anchor: { x: number; y: number }) => void;

const sameEmail = (a?: string, b?: string): boolean => Boolean(a && b && a.toLowerCase() === b.toLowerCase());

/** Lời giải này có phải của chính người đang xem không (khớp theo id hoặc email, như `isAuthoredBy` của store). */
export const isOwnSolution = (user: User | null, solution: Pick<Solution, 'authorId' | 'authorEmail'>): boolean =>
  Boolean(user && ((user.id && user.id === solution.authorId) || sameEmail(user.email, solution.authorEmail)));

/** Tác giả câu hỏi — null khi ẩn danh (ẩn danh không có hồ sơ để xem). */
export const resolveQuestionAuthor = (
  question: Question,
  users: Record<string, User>,
  currentUser: User | null,
): QAAuthorInfo | null => {
  if (question.isAnonymous) return null;
  const existing =
    Object.values(users).find((user) => user.id === question.authorId) ||
    (currentUser && currentUser.id === question.authorId ? currentUser : null);
  return {
    id: question.authorId,
    name: existing?.name || question.authorName,
    avatar: existing?.avatar || question.authorAvatar,
    email: existing?.email,
    level: existing?.level || 1,
    coin: existing?.coin || 100,
  };
};

/** Tên + ảnh hiển thị của người giải (Super Admin luôn hiện danh tính chính thức). */
export const solverIdentity = (solution: Pick<Solution, 'authorEmail' | 'authorName' | 'authorAvatar'>) => {
  const isAdmin = isMasterAdmin(solution.authorEmail);
  return {
    isAdmin,
    name: isAdmin ? MASTER_ADMIN_CONFIG.name : solution.authorName,
    avatar: isAdmin ? MASTER_ADMIN_CONFIG.avatar : solution.authorAvatar,
  };
};

export const resolveSolutionAuthor = (
  solution: Solution,
  users: Record<string, User>,
  currentUser: User | null,
): QAAuthorInfo => {
  const identity = solverIdentity(solution);
  const matches = (user: User) => user.id === solution.authorId || sameEmail(user.email, solution.authorEmail);
  const existing = Object.values(users).find(matches) || (currentUser && matches(currentUser) ? currentUser : null);
  return {
    id: solution.authorId,
    name: identity.isAdmin ? MASTER_ADMIN_CONFIG.name : existing?.name || identity.name,
    avatar: identity.isAdmin ? MASTER_ADMIN_CONFIG.avatar : existing?.avatar || identity.avatar,
    email: solution.authorEmail || existing?.email,
    level: identity.isAdmin ? 150 : existing?.level || solution.authorLevel,
    coin: existing?.coin || 100,
  };
};
