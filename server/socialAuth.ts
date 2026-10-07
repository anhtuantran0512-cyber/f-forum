/* Bản quyền trí tuệ thuộc về BroAmStuck */

/* ==========================================================================
   socialAuth — kiểm chứng đăng nhập Google / Facebook ở phía máy chủ
   --------------------------------------------------------------------------
   Vì sao cần: `/api/auth/social` trước đây nhận `email` do client tự khai và
   cấp thẳng tài khoản. Nghĩa là một lệnh POST với
   `{"provider":"google","email":"anhtuantran0512@gmail.com"}` là đủ để nhận
   token SUPER_ADMIN — chiếm quyền quản trị mà không cần biết mật khẩu nào.

   Nguyên tắc sau khi vá:
     • Có credential của nhà cung cấp → gọi thẳng API của họ để kiểm chứng
       access token, rồi SO KHỚP email trong phản hồi với email client khai.
     • Không có credential (chế độ demo) → vẫn cho tạo tài khoản HỌC SINH,
       nhưng TUYỆT ĐỐI không cấp SUPER_ADMIN.
   ========================================================================== */

import { MASTER_ADMIN_EMAIL, isMasterAdminEmail } from './authGuard.ts';

export type SocialProvider = 'google' | 'facebook';

export interface SocialCredential {
  provider: SocialProvider;
  /** Access token lấy từ Google Identity Services / Facebook SDK. */
  accessToken?: string | null;
  /** Email do client khai — phải khớp với email nhà cung cấp trả về. */
  claimedEmail: string;
}

export interface SocialVerification {
  ok: boolean;
  /** Email đã được nhà cung cấp xác nhận (chỉ có khi ok = true). */
  email?: string;
  /** Lý do từ chối, dùng cho thông báo và log. */
  reason?:
    | 'MISSING_ACCESS_TOKEN'
    | 'PROVIDER_REJECTED'
    | 'EMAIL_MISMATCH'
    | 'UNSUPPORTED_PROVIDER';
}

const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v20.0/me';
/** Gọi ra ngoài có thể treo — luôn đặt hạn mức. */
const VERIFY_TIMEOUT_MS = 8000;

const normalizeEmail = (value: unknown): string =>
  String(value || '').trim().toLowerCase();

export const googleClientId = (): string =>
  (process.env.FFORUM_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim();

export const facebookAppId = (): string =>
  (process.env.FFORUM_FACEBOOK_APP_ID || process.env.VITE_FACEBOOK_APP_ID || '').trim();

export const facebookAppSecret = (): string =>
  (process.env.FFORUM_FACEBOOK_APP_SECRET || '').trim();

/** Nhà cung cấp đã được cấu hình credential thật (không phải giá trị mẫu). */
export const isProviderConfigured = (provider: SocialProvider): boolean => {
  if (provider === 'google') {
    const id = googleClientId();
    return Boolean(id) && !id.toUpperCase().includes('YOUR_GOOGLE');
  }
  return Boolean(facebookAppId()) && !facebookAppId().toUpperCase().includes('YOUR_FACEBOOK');
};

/* -------------------------------------------------------------------------- */
/* Điểm chèn cho kiểm thử: thay lời gọi mạng bằng bản ghi giả                 */
/* -------------------------------------------------------------------------- */

export type ProviderLookup = (accessToken: string) => Promise<{ email?: string } | null>;

const lookups: Record<SocialProvider, ProviderLookup> = {
  google: async (accessToken) => {
    const res = await fetchWithTimeout(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as { email?: string };
  },
  facebook: async (accessToken) => {
    /* Có app secret thì dùng /debug_token (chắc chắn hơn), không thì /me. */
    const secret = facebookAppSecret();
    const target = secret
      ? `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(`${facebookAppId()}|${secret}`)}`
      : `${FACEBOOK_GRAPH_URL}?fields=email,name&access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetchWithTimeout(target, {});
    if (!res.ok) return null;
    const json = (await res.json()) as any;
    if (secret) {
      const data = json?.data;
      if (!data?.is_valid) return null;
      return { email: data.user_id ? data.email : undefined };
    }
    return { email: json?.email } as { email?: string };
  },
};

/** Cho phép test thay lời gọi mạng. Trả về hàm khôi phục. */
export const setProviderLookupForTest = (
  provider: SocialProvider,
  lookup: ProviderLookup,
): (() => void) => {
  const original = lookups[provider];
  lookups[provider] = lookup;
  return () => {
    lookups[provider] = original;
  };
};

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/* -------------------------------------------------------------------------- */
/* Kiểm chứng                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Kiểm chứng access token với nhà cung cấp và so khớp email.
 * `email` trả về luôn lấy từ phản hồi của nhà cung cấp, không từ client.
 */
export const verifySocialCredential = async (
  credential: SocialCredential,
): Promise<SocialVerification> => {
  const provider = credential.provider;
  if (provider !== 'google' && provider !== 'facebook') {
    return { ok: false, reason: 'UNSUPPORTED_PROVIDER' };
  }

  const accessToken = String(credential.accessToken || '').trim();
  if (!accessToken) return { ok: false, reason: 'MISSING_ACCESS_TOKEN' };

  let profile: { email?: string } | null = null;
  try {
    profile = await lookups[provider](accessToken);
  } catch {
    return { ok: false, reason: 'PROVIDER_REJECTED' };
  }

  const confirmedEmail = normalizeEmail(profile?.email);
  if (!confirmedEmail) return { ok: false, reason: 'PROVIDER_REJECTED' };
  if (normalizeEmail(credential.claimedEmail) !== confirmedEmail) {
    return { ok: false, reason: 'EMAIL_MISMATCH' };
  }

  return { ok: true, email: confirmedEmail };
};

export interface SocialAccessDecision {
  allowed: boolean;
  /** 403 khi bị chặn cấp quyền quản trị, 400 khi credential sai. */
  status?: 400 | 403;
  message?: string;
}

/**
 * Quyết định cuối cùng cho một yêu cầu đăng nhập mạng xã hội.
 * - Email thường: cho qua (có kiểm chứng khi đã cấu hình nhà cung cấp).
 * - Email Super Admin: BẮT BUỘC kiểm chứng thành công.
 */
export const decideSocialAccess = async (
  credential: SocialCredential,
): Promise<SocialAccessDecision> => {
  const email = normalizeEmail(credential.claimedEmail);
  const wantsPrivilege = isMasterAdminEmail(email) || email === MASTER_ADMIN_EMAIL;

  if (wantsPrivilege) {
    const verification = await verifySocialCredential(credential);
    if (!verification.ok) {
      return {
        allowed: false,
        status: 403,
        message:
          'Tài khoản quản trị chỉ đăng nhập được khi xác minh thành công với Google/Facebook.',
      };
    }
    return { allowed: true };
  }

  /* Nhà cung cấp đã cấu hình thì kiểm chứng cho cả tài khoản thường. */
  if (isProviderConfigured(credential.provider)) {
    const verification = await verifySocialCredential(credential);
    if (!verification.ok) {
      return {
        allowed: false,
        status: 400,
        message: 'Không xác minh được tài khoản mạng xã hội này. Vui lòng thử đăng nhập lại!',
      };
    }
  }

  return { allowed: true };
};
