/* Bản quyền trí tuệ thuộc về BroAmStuck */

export const EARNED_BADGES = [
  { id: 'first-question', name: 'Người đặt câu hỏi', description: 'Đăng câu hỏi học tập đầu tiên.' },
  { id: 'first-answer', name: 'Người hỗ trợ', description: 'Gửi lời giải đầu tiên cho cộng đồng.' },
  { id: 'best-answer', name: 'Lời giải hữu ích', description: 'Có lời giải được chọn là tốt nhất.' },
  { id: 'daily-quiz-correct', name: 'Trả lời chính xác', description: 'Trả lời đúng câu hỏi hằng ngày.' },
  { id: 'streak-7', name: 'Bền bỉ 7 ngày', description: 'Điểm danh liên tiếp đủ 7 ngày.' },
  { id: 'streak-30', name: 'Bền bỉ 30 ngày', description: 'Điểm danh liên tiếp đủ 30 ngày.' },
] as const;

export type EarnedBadgeId = (typeof EARNED_BADGES)[number]['id'];
export const EARNED_BADGE_IDS = new Set<string>(EARNED_BADGES.map((badge) => badge.id));
