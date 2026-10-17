/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { Crown, GraduationCap, Shield, Users } from 'lucide-react';
import type { User } from '../../types';

interface ChatRoleIconProps {
  user?: Pick<User, 'role' | 'staffRole'> | null;
  isSuperAdmin?: boolean;
  size?: number;
}

const ROLE_DETAILS = {
  superAdmin: {
    label: 'Super Admin',
    description: 'Quản trị toàn hệ thống.',
    icon: Crown,
    className: 'ff-chat-role-mark--admin',
  },
  teacher: {
    label: 'Giáo viên',
    description: 'Đăng đề và bài diễn đàn; ghim lời giải bằng reaction.',
    icon: GraduationCap,
    className: 'ff-chat-role-mark--teacher',
  },
  moderator: {
    label: 'Moderator',
    description: 'Hỗ trợ kiểm duyệt và giữ an toàn cho cộng đồng.',
    icon: Shield,
    className: 'ff-chat-role-mark--moderator',
  },
  clubLeader: {
    label: 'Trưởng CLB',
    description: 'Đại diện đăng bài cho câu lạc bộ.',
    icon: Users,
    className: 'ff-chat-role-mark--club',
  },
} as const;

export function ChatRoleIcon({ user, isSuperAdmin = false, size = 13 }: ChatRoleIconProps) {
  const details = isSuperAdmin || user?.role === 'SUPER_ADMIN'
    ? ROLE_DETAILS.superAdmin
    : user?.staffRole === 'TEACHER'
      ? ROLE_DETAILS.teacher
      : user?.staffRole === 'MODERATOR'
        ? ROLE_DETAILS.moderator
        : user?.role === 'CLUB_LEADER'
          ? ROLE_DETAILS.clubLeader
          : null;
  if (!details) return null;
  const Icon = details.icon;
  const accessibleLabel = `${details.label} · ${details.description}`;

  return (
    <span
      className={`ff-chat-role-mark ${details.className}`}
      title={accessibleLabel}
      aria-label={accessibleLabel}
      role="img"
      tabIndex={0}
    >
      <Icon size={size} aria-hidden="true" />
    </span>
  );
}
