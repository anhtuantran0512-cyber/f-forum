/* Bản quyền trí tuệ thuộc về BroAmStuck */

/* ==========================================================================
   PHẢN ỨNG NHANH dưới mỗi lời giải Hỏi đáp: 👍 Hữu ích · 🤯 Hay đó · 🙏 Cảm ơn.
   --------------------------------------------------------------------------
   Dùng chung ở máy chủ (kiểm tra + lưu) và giao diện (hiển thị + cập nhật lạc quan),
   nên chỉ gồm các phép tính THUẦN TUÝ, không import gì — chạy được thẳng bằng node.

   Phản ứng chỉ là tín hiệu xã hội: KHÔNG cộng XP/Coin, KHÔNG đổi `upvotes`
   (con số đó đang nuôi thống kê hồ sơ và thưởng đáp án chuẩn) — nghiệp vụ cũ giữ nguyên.
   ========================================================================== */

/** Ba phản ứng. Thứ tự này cũng là thứ tự hiển thị. */
export const REACTION_KINDS = ['helpful', 'wow', 'thanks'] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];

export interface ReactionMeta {
  emoji: string;
  label: string;
  /** Gợi ý ngắn khi rê chuột/đọc bằng trình đọc màn hình. */
  hint: string;
}

export const REACTION_META: Record<ReactionKind, ReactionMeta> = {
  helpful: { emoji: '👍', label: 'Hữu ích', hint: 'Lời giải này giúp mình hiểu bài' },
  wow: { emoji: '🤯', label: 'Hay đó', hint: 'Cách giải hay, bất ngờ' },
  thanks: { emoji: '🙏', label: 'Cảm ơn', hint: 'Cảm ơn bạn đã giải giúp' },
};

/**
 * ID tài khoản đã chọn, theo từng loại. Lưu ID (đã công khai sẵn qua /api/sync) chứ không lưu email,
 * để mọi client tự biết "mình đã chọn chưa" mà không cần một API riêng theo người dùng.
 */
export type SolutionReactions = Partial<Record<ReactionKind, string[]>>;

/** Trần số người cho MỖI loại trên MỘT lời giải — chặn dữ liệu phình vô hạn do tài khoản rác. */
export const MAX_REACTORS_PER_KIND = 2000;

const MAX_ID_LENGTH = 120;

export const isReactionKind = (value: unknown): value is ReactionKind =>
  typeof value === 'string' && (REACTION_KINDS as readonly string[]).includes(value);

export const reactionCount = (reactions: SolutionReactions | null | undefined, kind: ReactionKind): number =>
  reactions?.[kind]?.length ?? 0;

export const hasReacted = (
  reactions: SolutionReactions | null | undefined,
  kind: ReactionKind,
  userId: string | null | undefined,
): boolean => Boolean(userId) && Boolean(reactions?.[kind]?.includes(userId as string));

/**
 * Đặt (`active` = true) hoặc bỏ (`false`) phản ứng của MỘT người. Không sửa object đầu vào.
 * Idempotent: đã đúng trạng thái thì trả về CHÍNH object cũ — bấm lặp/gửi lại không bao giờ cộng dồn.
 * Đã đủ {@link MAX_REACTORS_PER_KIND} người thì không thêm nữa (trả về nguyên trạng).
 */
export const setReaction = (
  reactions: SolutionReactions | null | undefined,
  kind: ReactionKind,
  userId: string,
  active: boolean,
): SolutionReactions => {
  const current: SolutionReactions = reactions ?? {};
  const list = current[kind] ?? [];
  const present = list.includes(userId);
  if (active === present) return current;
  if (active) {
    if (list.length >= MAX_REACTORS_PER_KIND) return current;
    return { ...current, [kind]: [...list, userId] };
  }
  const rest = list.filter((id) => id !== userId);
  const next: SolutionReactions = { ...current };
  if (rest.length > 0) next[kind] = rest;
  else delete next[kind];
  return next;
};

/**
 * Làm sạch dữ liệu từ đĩa / từ mạng: chỉ giữ loại hợp lệ, ID là chuỗi không rỗng, không trùng, có trần.
 * Không còn gì → `undefined` (lời giải chưa có phản ứng thì không mang trường này).
 */
export const sanitizeReactions = (raw: unknown): SolutionReactions | undefined => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const source = raw as Record<string, unknown>;
  const clean: SolutionReactions = {};
  for (const kind of REACTION_KINDS) {
    const value = source[kind];
    if (!Array.isArray(value)) continue;
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const item of value) {
      if (typeof item !== 'string') continue;
      const id = item.trim();
      if (!id || id.length > MAX_ID_LENGTH || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
      if (ids.length >= MAX_REACTORS_PER_KIND) break;
    }
    if (ids.length > 0) clean[kind] = ids;
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
};
