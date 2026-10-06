/* Bản quyền trí tuệ thuộc về BroAmStuck */

/* ==========================================================================
   QUẢN LÝ NGƯỜI DÙNG (cấm / khoá gửi tin) — LOGIC THUẦN TUÝ
   --------------------------------------------------------------------------
   Vì sao tách riêng: trước đây quản trị chỉ có thể ĐÁNH DẤU một tố cáo là "đã xử
   lý" chứ không có cách nào thực thi — người bị tố cáo vẫn tiếp tục đăng. Nay có
   cơ chế cấm và khoá gửi tin thật sự.

   Toàn bộ phép tính thời hạn và áp hành động nằm ở đây, không đụng store/HTTP,
   nên node test trực tiếp được (tests/user-moderation). forumServer chỉ việc gọi.

   Quy ước `until`:
     - `undefined` → KHÔNG bị áp chế
     - `0`         → vĩnh viễn
     - `> 0`       → mốc thời gian (ms epoch), hết mốc là tự động hết hiệu lực
   Dùng 0 cho "vĩnh viễn" thay vì Infinity vì JSON không serialise được Infinity
   (sẽ thành null và mất thông tin khi ghi xuống đĩa).
   ========================================================================== */

export type ModerationAction = 'ban' | 'mute' | 'unban' | 'unmute';

export const MODERATION_ACTIONS: ModerationAction[] = ['ban', 'mute', 'unban', 'unmute'];

export const MODERATION_MAX_REASON = 500;

/** Các mức thời hạn cho sẵn trong UI (phút). 0 = vĩnh viễn. */
export const MODERATION_DURATIONS_MIN = [15, 60, 1440, 10080, 0] as const;

export interface ModerationRecord {
  /** Mốc hết hạn bị cấm (ms). 0 = vĩnh viễn. undefined = không bị cấm. */
  bannedUntil?: number;
  /** Mốc hết hạn bị khoá gửi tin (ms). 0 = vĩnh viễn. undefined = không bị khoá. */
  mutedUntil?: number;
  reason?: string;
  /** Email quản trị đã ra quyết định — cần cho việc truy vết. */
  by?: string;
  at?: number;
}

export type ModerationMap = Record<string, ModerationRecord>;

export interface ModerationStatus {
  banned: boolean;
  muted: boolean;
  bannedUntil?: number;
  mutedUntil?: number;
  reason?: string;
}

export const normalizeModerationKey = (value?: string | null): string =>
  String(value || '').trim().toLowerCase();

/**
 * Một mốc `until` còn hiệu lực hay không.
 *
 * `0` là vĩnh viễn nên KHÔNG được so `until > now` — nếu so thì cấm vĩnh viễn sẽ
 * bị coi là đã hết hạn ngay lập tức (0 không lớn hơn now).
 */
export const isUntilActive = (until: number | undefined, now: number = Date.now()): boolean => {
  if (until === undefined || until === null) return false;
  const n = Number(until);
  if (!Number.isFinite(n)) return false;
  if (n === 0) return true;
  return n > now;
};

/** Đọc trạng thái áp chế hiện tại của một người. */
export const moderationStatusOf = (
  map: ModerationMap | undefined,
  email?: string | null,
  now: number = Date.now(),
): ModerationStatus => {
  const key = normalizeModerationKey(email);
  const rec = key ? (map || {})[key] : undefined;
  if (!rec) return { banned: false, muted: false };
  return {
    banned: isUntilActive(rec.bannedUntil, now),
    muted: isUntilActive(rec.mutedUntil, now),
    bannedUntil: rec.bannedUntil,
    mutedUntil: rec.mutedUntil,
    reason: rec.reason,
  };
};

/** Cắt lý do về trần và bỏ khoảng trắng thừa — dữ liệu vào store phải sạch. */
export const normalizeModerationReason = (reason?: string | null): string =>
  String(reason || '').trim().slice(0, MODERATION_MAX_REASON);

export interface ApplyModerationOptions {
  /** Số phút áp chế. 0 hoặc undefined = vĩnh viễn. */
  durationMinutes?: number;
  reason?: string;
  /** Email quản trị ra quyết định. */
  by?: string;
  now?: number;
}

export interface ApplyModerationResult {
  next: ModerationMap;
  record: ModerationRecord | null;
  /** true khi hành động có thật sự đổi trạng thái. */
  changed: boolean;
}

/**
 * Áp một hành động quản lý, trả về map MỚI (không sửa map cũ).
 *
 * Idempotent cho cùng một yêu cầu: bấm lặp trong cùng thời điểm với cùng mức
 * hạn chế / lý do / người ra quyết định là no-op, tránh double-click tạo nhật ký
 * trùng. Nếu chọn thời hạn hoặc lý do khác thì đó là quyết định mới có chủ đích.
 */
export const applyModerationAction = (
  map: ModerationMap | undefined,
  email: string | null | undefined,
  action: ModerationAction,
  options: ApplyModerationOptions = {},
): ApplyModerationResult => {
  const base: ModerationMap = map || {};
  const key = normalizeModerationKey(email);
  const now = Number(options.now ?? Date.now());

  /* Thiếu người dùng hoặc hành động lạ thì trả nguyên map — không tạo khoá rác. */
  if (!key || !MODERATION_ACTIONS.includes(action)) {
    return { next: base, record: null, changed: false };
  }

  const current = base[key] || {};
  const mins = Number(options.durationMinutes);
  /* durationMinutes không hợp lệ (NaN/âm) thì coi như vĩnh viễn, không ném lỗi. */
  const permanent = !Number.isFinite(mins) || mins <= 0;
  const until = permanent ? 0 : now + Math.floor(mins) * 60 * 1000;
  const reason = normalizeModerationReason(options.reason);
  const by = normalizeModerationKey(options.by) || undefined;

  const isRemoval = action === 'unban' || action === 'unmute';
  const alreadyInactive =
    (action === 'unban' && !isUntilActive(current.bannedUntil, now)) ||
    (action === 'unmute' && !isUntilActive(current.mutedUntil, now));

  /* Gỡ một áp chế vốn đã không còn hiệu lực → không có gì để làm. */
  if (isRemoval && alreadyInactive) {
    return { next: base, record: null, changed: false };
  }

  /* Cùng đúng một yêu cầu đã áp dụng (double-click trong cùng millisecond) →
     không tạo bản ghi audit thứ hai. Đổi thời hạn/lý do vẫn là quyết định mới. */
  if (action === 'ban' || action === 'mute') {
    const currentUntil = action === 'ban' ? current.bannedUntil : current.mutedUntil;
    const sameReason = (reason || current.reason) === current.reason;
    if (
      isUntilActive(currentUntil, now) &&
      currentUntil === until &&
      sameReason &&
      by === current.by
    ) {
      return { next: base, record: null, changed: false };
    }
  }

  const record: ModerationRecord = { ...current, reason: reason || current.reason, by, at: now };
  if (action === 'ban') record.bannedUntil = until;
  if (action === 'mute') record.mutedUntil = until;
  if (action === 'unban') delete record.bannedUntil;
  if (action === 'unmute') delete record.mutedUntil;

  const next: ModerationMap = { ...base };
  /* Cả hai áp chế đều đã hết và không còn lý do gì để giữ → xoá hẳn khoá. */
  if (
    !isUntilActive(record.bannedUntil, now) &&
    !isUntilActive(record.mutedUntil, now) &&
    record.bannedUntil === undefined &&
    record.mutedUntil === undefined
  ) {
    delete next[key];
  } else {
    next[key] = record;
  }
  return { next, record, changed: true };
};

/**
 * Dọn các bản ghi đã hết hạn hoàn toàn.
 *
 * Không có bước này thì map chỉ phình: mỗi lần cấm tạm thời để lại một bản ghi
 * chết vĩnh viễn trong tệp dữ liệu. Trả nguyên map khi không có gì để dọn để
 * tránh một lần ghi đĩa vô ích.
 */
export const pruneModeration = (
  map: ModerationMap | undefined,
  now: number = Date.now(),
): ModerationMap => {
  const base = map || {};
  const next: ModerationMap = {};
  let changed = false;
  Object.entries(base).forEach(([key, rec]) => {
    const banned = isUntilActive(rec?.bannedUntil, now);
    const muted = isUntilActive(rec?.mutedUntil, now);
    if (banned || muted) {
      next[key] = rec;
    } else {
      changed = true;
    }
  });
  return changed ? next : base;
};

/** Đọc map từ dữ liệu trên đĩa, bỏ mọi thứ rác (tệp có thể bị sửa tay/hỏng). */
export const parseModerationMap = (raw: unknown): ModerationMap => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const clean: ModerationMap = {};
  Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
    const k = normalizeModerationKey(key);
    if (!k || !value || typeof value !== 'object') return;
    const v = value as Record<string, unknown>;
    const rec: ModerationRecord = {};
    if (typeof v.bannedUntil === 'number' && Number.isFinite(v.bannedUntil)) rec.bannedUntil = v.bannedUntil;
    if (typeof v.mutedUntil === 'number' && Number.isFinite(v.mutedUntil)) rec.mutedUntil = v.mutedUntil;
    if (typeof v.reason === 'string') rec.reason = v.reason.slice(0, MODERATION_MAX_REASON);
    if (typeof v.by === 'string') rec.by = v.by.slice(0, 120);
    if (typeof v.at === 'number' && Number.isFinite(v.at)) rec.at = v.at;
    /* Chỉ giữ bản ghi thật sự có áp chế — bỏ bản ghi rỗng rơi lại từ dữ liệu cũ. */
    if (rec.bannedUntil !== undefined || rec.mutedUntil !== undefined) clean[k] = rec;
  });
  return clean;
};
