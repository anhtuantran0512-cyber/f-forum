/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Mô tả trạng thái khoá trả về khi đăng nhập (server/moderation.ts → moderationForLogin).
 * Máy chủ đã tính theo giờ hiện tại, nên client chỉ diễn đạt lại — không tự so thời gian.
 */
export interface LoginModeration {
  banned?: boolean;
  muted?: boolean;
  bannedUntil?: number;
  mutedUntil?: number;
  reason?: string;
}

const untilText = (until?: number): string =>
  until === 0 || until === undefined ? 'vĩnh viễn' : `đến ${new Date(until).toLocaleString('vi-VN')}`;

export const describeLoginModeration = (m?: LoginModeration | null): { title: string; subtitle: string } | null => {
  if (!m) return null;
  const reason = m.reason ? ` Lý do: ${m.reason}` : '';
  if (m.banned) {
    return {
      title: 'Tài khoản đang bị khoá đăng bài',
      subtitle: `Bạn vẫn xem được nội dung nhưng không thể đăng ${untilText(m.bannedUntil)}.${reason}`,
    };
  }
  if (m.muted) {
    return {
      title: 'Bạn đang bị khoá gửi tin nhắn',
      subtitle: `Khoá chat ${untilText(m.mutedUntil)}.${reason}`,
    };
  }
  return null;
};
