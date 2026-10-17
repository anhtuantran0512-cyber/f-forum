/* One canonical icon, palette, and capability description per platform role. */
import { Crown, GraduationCap, Shield, Users } from 'lucide-react';

export interface RoleActor {
  role?: string | null;
  staffRole?: string | null;
}

export interface RoleDetails {
  key: 'super-admin' | 'teacher' | 'moderator' | 'club-leader';
  label: string;
  description: string;
  icon: typeof Crown;
}

const ROLE_DETAILS: Record<RoleDetails['key'], RoleDetails> = {
  'super-admin': {
    key: 'super-admin',
    label: 'Super Admin',
    description: 'Quản trị toàn hệ thống.',
    icon: Crown,
  },
  teacher: {
    key: 'teacher',
    label: 'Giáo viên',
    description: 'Đăng đề, bài diễn đàn và ghim lời giải bằng reaction.',
    icon: GraduationCap,
  },
  moderator: {
    key: 'moderator',
    label: 'Moderator',
    description: 'Đăng bài diễn đàn, duyệt hồ sơ đề và hỗ trợ an toàn cộng đồng.',
    icon: Shield,
  },
  'club-leader': {
    key: 'club-leader',
    label: 'Trưởng CLB',
    description: 'Đại diện câu lạc bộ đăng bài lên diễn đàn.',
    icon: Users,
  },
};

export const getRoleDetails = (actor?: RoleActor | null, isSuperAdmin = false): RoleDetails | null => {
  if (isSuperAdmin || actor?.role === 'SUPER_ADMIN') return ROLE_DETAILS['super-admin'];
  if (actor?.staffRole === 'TEACHER' || actor?.role === 'TEACHER') return ROLE_DETAILS.teacher;
  if (actor?.staffRole === 'MODERATOR' || actor?.role === 'MODERATOR') return ROLE_DETAILS.moderator;
  if (actor?.role === 'CLUB_LEADER') return ROLE_DETAILS['club-leader'];
  return null;
};
