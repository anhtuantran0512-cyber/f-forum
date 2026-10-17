/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Quyền cộng đồng — dùng chung cho giao diện và máy chủ.
 * `role` là tư cách cộng đồng (Học sinh / Trưởng CLB / Super Admin);
 * `staffRole` là vai trò được cấp (Giáo viên / Moderator).
 * Máy chủ vẫn là nơi thực thi cuối cùng; các hàm này chỉ mô tả ma trận.
 */
export type CommunityPermission =
  | 'ask_qa'
  | 'answer_qa'
  | 'comment_react'
  | 'create_forum_post'
  | 'publish_exam'
  | 'review_exam_submission'
  | 'pin_qa_solution'
  | 'moderate';

export interface CommunityRoleActor {
  role?: string | null;
  staffRole?: string | null;
}

export interface CommunityRoleRow {
  id: 'STUDENT' | 'CLUB_LEADER' | 'TEACHER' | 'MODERATOR' | 'SUPER_ADMIN';
  label: string;
  summary: string;
  default?: boolean;
  permissions: readonly CommunityPermission[];
}

const STUDENT_PERMISSIONS: readonly CommunityPermission[] = [
  'ask_qa', 'answer_qa', 'comment_react',
];
const TEACHER_PERMISSIONS: readonly CommunityPermission[] = [
  ...STUDENT_PERMISSIONS, 'create_forum_post', 'publish_exam', 'review_exam_submission', 'pin_qa_solution', 'moderate',
];
const MODERATOR_PERMISSIONS: readonly CommunityPermission[] = [
  ...STUDENT_PERMISSIONS, 'publish_exam', 'review_exam_submission', 'moderate',
];
const SUPER_ADMIN_PERMISSIONS: readonly CommunityPermission[] = [
  ...TEACHER_PERMISSIONS,
];

/** Ma trận mô tả đúng các quyền đang được thực thi tại máy chủ. */
export const COMMUNITY_ROLE_MATRIX: readonly CommunityRoleRow[] = [
  {
    id: 'STUDENT',
    label: 'Học sinh',
    summary: 'Vai trò mặc định khi tạo tài khoản.',
    default: true,
    permissions: STUDENT_PERMISSIONS,
  },
  {
    id: 'CLUB_LEADER',
    label: 'Trưởng CLB',
    summary: 'Có quyền đăng bài gốc lên diễn đàn; quyền CLB cụ thể vẫn theo phạm vi được cấp.',
    permissions: [...STUDENT_PERMISSIONS, 'create_forum_post'],
  },
  {
    id: 'TEACHER',
    label: 'Giáo viên',
    summary: 'Đăng đề, đăng bài diễn đàn và ghim lời giải bằng reaction.',
    permissions: TEACHER_PERMISSIONS,
  },
  {
    id: 'MODERATOR',
    label: 'Moderator',
    summary: 'Kiểm duyệt và duyệt hồ sơ đề; không mặc định có quyền đăng bài gốc.',
    permissions: MODERATOR_PERMISSIONS,
  },
  {
    id: 'SUPER_ADMIN',
    label: 'Super Admin',
    summary: 'Quản trị toàn hệ thống và có toàn bộ quyền cộng đồng.',
    permissions: SUPER_ADMIN_PERMISSIONS,
  },
];

export const COMMUNITY_PERMISSION_META: Record<CommunityPermission, { label: string; shortLabel: string }> = {
  ask_qa: { label: 'Đặt câu hỏi hỏi đáp', shortLabel: 'Hỏi đáp' },
  answer_qa: { label: 'Gửi lời giải hỏi đáp', shortLabel: 'Lời giải' },
  comment_react: { label: 'Bình luận và thả reaction', shortLabel: 'Bình luận / reaction' },
  create_forum_post: { label: 'Đăng bài gốc trên diễn đàn', shortLabel: 'Bài diễn đàn' },
  publish_exam: { label: 'Xuất bản đề lên Khu đề thi', shortLabel: 'Xuất bản đề' },
  review_exam_submission: { label: 'Duyệt hồ sơ đề thi', shortLabel: 'Duyệt đề' },
  pin_qa_solution: { label: 'Ghim lời giải bằng reaction giáo viên', shortLabel: 'Ghim lời giải' },
  moderate: { label: 'Cấm đăng, khoá chat, cảnh cáo', shortLabel: 'Kiểm duyệt' },
};

export function communityRoleKeys(actor: CommunityRoleActor | null | undefined): CommunityRoleRow['id'][] {
  if (!actor) return [];
  const roles: CommunityRoleRow['id'][] = [];
  if (actor.role === 'SUPER_ADMIN') roles.push('SUPER_ADMIN');
  else if (actor.role === 'CLUB_LEADER') roles.push('CLUB_LEADER');
  else roles.push('STUDENT');
  if (actor.staffRole === 'TEACHER') roles.push('TEACHER');
  if (actor.staffRole === 'MODERATOR') roles.push('MODERATOR');
  return roles;
}

export function hasCommunityPermission(
  actor: CommunityRoleActor | null | undefined,
  permission: CommunityPermission,
): boolean {
  return communityRoleKeys(actor).some((roleKey) =>
    COMMUNITY_ROLE_MATRIX.find((row) => row.id === roleKey)?.permissions.includes(permission),
  );
}

export const canCreateForumPost = (actor: CommunityRoleActor | null | undefined): boolean =>
  hasCommunityPermission(actor, 'create_forum_post');
export const canPublishExam = (actor: CommunityRoleActor | null | undefined): boolean =>
  hasCommunityPermission(actor, 'publish_exam');
export const canReviewExamSubmission = (actor: CommunityRoleActor | null | undefined): boolean =>
  hasCommunityPermission(actor, 'review_exam_submission');
export const canPinQASolution = (actor: CommunityRoleActor | null | undefined): boolean =>
  hasCommunityPermission(actor, 'pin_qa_solution');
