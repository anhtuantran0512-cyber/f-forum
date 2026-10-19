/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { MASTER_ADMIN_EMAIL, MASTER_ADMIN_EMAIL_LOWER } from '../../shared/identityStrings.ts';

/* Chuỗi gốc được che giấu trong `shared/identityStrings.ts`; đây là trạm phát
   chuẩn cho toàn bộ client — không file nào được viết lại nguyên văn. */
export { MASTER_ADMIN_EMAIL, MASTER_ADMIN_EMAIL_LOWER };

export interface MasterAdminConfig {
  name: string;
  email: string;
  role: string;
  avatar: string;
  verifiedBadge: boolean;
  facebookUrl: string;
  level: number;
  xp: number;
  fPoints: number;
  rank: string;
}

export const MASTER_ADMIN_CONFIG: MasterAdminConfig = {
  name: 'Trần Văn Anh Tuấn',
  email: MASTER_ADMIN_EMAIL,
  role: 'Admin F-Forum • Owner BroAmStuck Studio',
  avatar:
    'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_a455843c-d8db-461c-8ef6-74a325d2472c.png',
  verifiedBadge: true,
  facebookUrl: 'https://facebook.com/tran.anh.tuan',
  level: 150,
  xp: 45000,
  fPoints: 45000,
  rank: 'Tier X',
};

export const isMasterAdmin = (email?: string | null): boolean => {
  if (!email) return false;
  return email.trim().toLowerCase() === MASTER_ADMIN_CONFIG.email.toLowerCase();
};
