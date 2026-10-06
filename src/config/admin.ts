/* Public brand profile only. Authorization is always decided by the server session. */
export interface FounderProfileConfig {
  name: string;
  role: string;
  avatar: string;
  verifiedBadge: boolean;
  facebookUrl: string;
  level: number;
  xp: number;
  fPoints: number;
  rank: string;
}

export const FOUNDER_PROFILE_CONFIG: FounderProfileConfig = {
  name: 'Trần Văn Anh Tuấn',
  role: 'F-Forum Founder • BroAmStuck Studio',
  avatar:
    'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_a455843c-d8db-461c-8ef6-74a325d2472c.png',
  verifiedBadge: true,
  facebookUrl: 'https://facebook.com/tran.anh.tuan',
  level: 150,
  xp: 45_000,
  fPoints: 45_000,
  rank: 'Tier X',
};

export const isSuperAdminRole = (role?: string | null): boolean =>
  role?.toLowerCase() === 'super_admin';

export const isAdminRole = (role?: string | null): boolean =>
  role === 'moderator' || role === 'admin' || role === 'super_admin';

export const getRoleLabel = (role?: string | null): string => {
  switch (role) {
    case 'super_admin': return 'SUPER ADMIN';
    case 'admin': return 'ADMIN';
    case 'moderator': return 'MODERATOR';
    default: return 'USER';
  }
};
