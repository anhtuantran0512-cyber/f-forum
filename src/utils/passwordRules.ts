/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Luật mật khẩu phía client — PHẢI khớp máy chủ (server/forumServer.ts: đăng ký và
 * POST /api/auth/password): trim, 6–200 ký tự. Client chỉ kiểm sớm cho trải nghiệm;
 * máy chủ vẫn là nơi quyết định.
 */
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 200;

/** Trả thông báo lỗi tiếng Việt, hoặc `null` nếu hợp lệ. */
export function validatePasswordChange(current: string, next: string, confirm: string): string | null {
  const cur = current.trim();
  const nxt = next.trim();
  if (!cur) return 'Nhập mật khẩu hiện tại.';
  if (nxt.length < PASSWORD_MIN_LENGTH) return `Mật khẩu mới phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`;
  if (nxt.length > PASSWORD_MAX_LENGTH) return `Mật khẩu mới tối đa ${PASSWORD_MAX_LENGTH} ký tự.`;
  if (nxt !== confirm.trim()) return 'Hai lần nhập mật khẩu mới không khớp.';
  if (nxt === cur) return 'Mật khẩu mới phải khác mật khẩu hiện tại.';
  return null;
}

/**
 * Gợi ý độ mạnh (0–3) — chỉ để nhắc, không chặn: độ dài là yếu tố chính, cộng thêm
 * khi trộn nhiều loại ký tự.
 */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 {
  const value = password.trim();
  if (value.length < PASSWORD_MIN_LENGTH) return 0;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length;
  if (value.length >= 12 && kinds >= 3) return 3;
  if (value.length >= 10 || kinds >= 3) return 2;
  return 1;
}
