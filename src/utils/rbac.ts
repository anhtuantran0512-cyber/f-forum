/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * RBAC — Ma trận phân quyền tập trung cho toàn bộ giao diện quản trị (Epic 3).
 * Server (server/forumServer.ts) là nơi thực thi thật; module này chỉ là bản client
 * của cùng một ma trận để ẩn/hiện nút đúng theo quyền — KHÔNG phải lớp bảo mật.
 *
 * Cây quyền (Nhiemvu_3.md — mục 3.1):
 *   SuperAdmin            → toàn quyền, duy nhất 1 tài khoản (email cố định)
 *   Admin (vai trò tùy chỉnh có give_role) → toàn quyền trừ tạo/xoá role & cấp Super Admin
 *   Teacher / Mod         → ban / warn / mute, KHÔNG được give role
 */

export type AdminPermission = 'ban' | 'warn' | 'mute' | 'give_role' | 'edit_content' | 'view_analytics';

export const ADMIN_PERMISSIONS: readonly AdminPermission[] = [
  'ban', 'warn', 'mute', 'give_role', 'edit_content', 'view_analytics',
];

/** Vai trò kiểm duyệt có sẵn vẫn giữ nguyên ý nghĩa cũ. */
export const MODERATION_PERMISSIONS: readonly AdminPermission[] = ['ban', 'warn', 'mute'];

export interface CustomRoleDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  specialChar: string;
  permissions: string[];
  memberCount?: number;
}

/** Tối thiểu cần có để tính quyền — Deliberately structural để test được mà không cần User đầy đủ. */
export interface AdminActorLike {
  email?: string;
  role?: string;
  staffRole?: 'MODERATOR' | 'TEACHER' | null;
  customRoleDef?: CustomRoleDef | null;
}

export const SUPER_ADMIN_EMAIL = 'broamstuck@gmail.com';

export function isSuperAdminUser(user: AdminActorLike | null | undefined): boolean {
  if (!user) return false;
  return Boolean(user.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL) || user.role === 'SUPER_ADMIN';
}

/** Toàn bộ quyền hiệu dụng của actor (Super Admin có đủ mọi quyền). */
export function resolvePermissions(user: AdminActorLike | null | undefined): AdminPermission[] {
  if (isSuperAdminUser(user)) return [...ADMIN_PERMISSIONS];
  if (!user) return [];
  if (user.staffRole === 'MODERATOR' || user.staffRole === 'TEACHER') return [...MODERATION_PERMISSIONS];
  if (user.customRoleDef?.permissions?.length) {
    return user.customRoleDef.permissions.filter((permission): permission is AdminPermission =>
      (ADMIN_PERMISSIONS as readonly string[]).includes(permission),
    );
  }
  return [];
}

export function hasPermission(user: AdminActorLike | null | undefined, permission: AdminPermission): boolean {
  return resolvePermissions(user).includes(permission);
}

/** Teacher/Mod hoặc vai trò tùy chỉnh có quyền kiểm duyệt nào đó. */
export function canModerate(user: AdminActorLike | null | undefined): boolean {
  if (isSuperAdminUser(user)) return true;
  if (user?.staffRole === 'MODERATOR' || user?.staffRole === 'TEACHER') return true;
  return MODERATION_PERMISSIONS.some((permission) => hasPermission(user, permission));
}

export const canBan = (user: AdminActorLike | null | undefined): boolean => hasPermission(user, 'ban');
export const canWarn = (user: AdminActorLike | null | undefined): boolean => hasPermission(user, 'warn');
export const canMute = (user: AdminActorLike | null | undefined): boolean => hasPermission(user, 'mute');

/** Chỉ Admin/SuperAdmin thấy nút Give Role (mục 3.1). */
export const canGiveRole = (user: AdminActorLike | null | undefined): boolean => hasPermission(user, 'give_role');

/** Chỉ Admin/SuperAdmin thấy nút Create Role (mục 3.5). Server còn chặn thêm:
    Admin chỉ tạo được vai trò có quyền ⊆ quyền của chính mình. */
export const canCreateRole = (user: AdminActorLike | null | undefined): boolean => canGiveRole(user);

/** Quyền nào actor được phép đưa vào một vai trò mới (chống leo thang quyền). */
export const grantablePermissions = (user: AdminActorLike | null | undefined): AdminPermission[] =>
  canGiveRole(user) ? resolvePermissions(user) : [];

/** Nhãn + mô tả tiếng Việt của từng quyền — dùng cho checkbox tạo role & ma trận RBAC. */
export const PERMISSION_META: Record<AdminPermission, { label: string; hint: string }> = {
  ban: { label: 'Cấm đăng', hint: 'Chặn chat, câu hỏi, lời giải và bài CLB có thời hạn' },
  warn: { label: 'Cảnh cáo', hint: 'Gửi cảnh cáo riêng và lưu lịch sử' },
  mute: { label: 'Khoá chat', hint: 'Chỉ chặn gửi tin nhắn' },
  give_role: { label: 'Cấp vai trò', hint: 'Gán/thu hồi vai trò & tạo role mới (cấp Admin)' },
  edit_content: { label: 'Sửa nội dung', hint: 'Chỉnh sửa/ẩn bài viết vi phạm' },
  view_analytics: { label: 'Xem thống kê', hint: 'Mở tab Dashboard số liệu người dùng' },
};

/** Xem dashboard thống kê (mục 3.3). */
export const canViewAnalytics = (user: AdminActorLike | null | undefined): boolean => hasPermission(user, 'view_analytics');

/** Xem hồ sơ chi tiết thành viên (mục 3.4 — menu ⋯). */
export const canViewMemberProfile = canModerate;

/** Icon Admin trên menu tia sét (mục 3.2). */
export function canAccessAdminPanel(user: AdminActorLike | null | undefined): boolean {
  return canModerate(user) || canViewAnalytics(user);
}
