/* Bản quyền trí tuệ thuộc về BroAmStuck */
import fs from 'node:fs';
import path from 'node:path';
import { randomInt } from 'node:crypto';
import { SHOP_ITEMS, effectivePrice } from '../src/utils/shopData.ts';
import { dateKeyInTimeZone } from '../shared/dailyTrivia.ts';
import { GHIBLI_MASKS, getRandomGhibliMask } from '../src/utils/ghibliMasks.ts';
import {
  claimDailyAttendance,
  claimDailyTrivia,
  claimGiftBox,
  createEmptyDailyRewardProfile,
  dailyRewardStatus,
  sanitizeDailyRewardProfiles,
  sanitizeFocusRewardSessions,
  focusRewardForMinutes,
  FOCUS_REWARD_AMOUNT,
  FOCUS_REWARD_MINIMUM_MS,
  FOCUS_SESSION_MAX_AGE_MS,
  normalizeFocusTargetMinutes,
  type DailyRewardProfile,
  type FocusRewardSession,
} from './economy.ts';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import {
  MODERATION_ACTIONS,
  MODERATION_DURATIONS_MIN,
  applyModerationAction,
  isUntilActive,
  moderationStatusOf,
  moderationForLogin,
  normalizeModerationReason,
  parseModerationMap,
  pruneModeration,
  type ModerationAction,
  type ModerationMap,
} from './moderation.ts';
import {
  MASTER_ADMIN_EMAIL,
  SESSION_TTL_MS,
  SlidingWindowRateLimiter,
  authorizeRequest,
  buildClearedSessionCookie,
  buildSessionCookie,
  clientIpOf,
  createSessionToken,
  isCrossSiteRequest,
  isSessionRevoked,
  readBearerToken,
  readSessionCookie,
  sanitizeMediaUrl,
  sanitizePlainText,
  setSessionRevocationCheck,
  hashPassword,
  isHashedPassword,
  isMasterAdminEmail,
  normalizeBounty,
  randomId,
  sanitizeUserUpdate,
  solverAwardFor,
  verifyPassword,
  verifySessionToken,
  type SessionClaims,
} from './authGuard.ts';
import { decideSocialAccess } from './socialAuth.ts';
import { applyCorsHeaders, requestIsHttps } from './securityHeaders.ts';
import { handleMediaRequest, processUploadedImage, MediaUploadError, type MediaKind } from './mediaPipeline.ts';
import {
  buildAnalyticsReport,
  createEmptyAnalytics,
  recordAnalyticsActivity,
  recordAnalyticsHeartbeat,
  recordAnalyticsPageView,
  recordAnalyticsSignup,
  recordAnalyticsVisit,
  sanitizeAnalyticsStore,
  type AnalyticsStore,
} from './analytics.ts';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'SUPER_ADMIN' | 'CLUB_LEADER' | 'STUDENT';
  /** Vai trò được Super Admin cấp riêng; không thay đổi quyền sở hữu CLB. */
  staffRole?: 'MODERATOR' | 'TEACHER';
  /** ID vai trò tùy chỉnh do Super Admin tạo (xem customRoles trong store). */
  customRole?: string;
  /** Mốc Premium (ms); 0 = vĩnh viễn, undefined = chưa được cấp. */
  premiumUntil?: number;
  premiumGrantedAt?: number;
  level: number;
  xp: number;
  fPoints?: number;
  streakCount?: number;
  coin?: number;
  inventory?: string[];
  equippedBadge?: string;
  bio: string;
  gender?: string;
  city?: string;
  className?: string;
  joinedAt?: string;
  bannerUrl?: string;
  profileGradient?: string;
  scopedClubIds: string[];
}

export interface AdminWarningRecord {
  id: string;
  at: number;
  targetEmail: string;
  reason: string;
  by: string;
}

/* Epic 3 — mục 3.5: vai trò tùy chỉnh. Danh sách quyền và icon là whitelist
   duy nhất — client chỉ được gửi giá trị nằm trong hai danh sách này. */
export type CustomRolePermission = 'ban' | 'warn' | 'mute' | 'give_role' | 'edit_content' | 'view_analytics';
export const CUSTOM_ROLE_PERMISSIONS: readonly CustomRolePermission[] = [
  'ban', 'warn', 'mute', 'give_role', 'edit_content', 'view_analytics',
];
export const CUSTOM_ROLE_MODERATION_PERMISSIONS: readonly CustomRolePermission[] = ['ban', 'warn', 'mute'];
export const CUSTOM_ROLE_ICONS: readonly string[] = [
  'shield', 'graduation-cap', 'star', 'zap', 'crown', 'sparkles', 'heart', 'swords', 'gem', 'flame',
];

export interface CustomRoleRecord {
  id: string;
  name: string;
  icon: string;
  /** Mã màu hex của badge, ví dụ #f59e0b. */
  color: string;
  /** Ký tự đặc biệt đi kèm tên (tối đa 2 ký tự). */
  specialChar: string;
  permissions: CustomRolePermission[];
  createdAt: number;
  createdBy: string;
}

const CUSTOM_ROLE_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function sanitizeCustomRoleInput(input: any): { ok: true; value: { name: string; icon: string; color: string; specialChar: string; permissions: CustomRolePermission[] } } | { ok: false; message: string } {
  const name = String(input?.name || '').trim().slice(0, 24);
  if (name.length < 2) return { ok: false, message: 'Tên vai trò cần ít nhất 2 ký tự (tối đa 24).' };
  const icon = String(input?.icon || '').trim().toLowerCase();
  if (!CUSTOM_ROLE_ICONS.includes(icon)) return { ok: false, message: 'Icon vai trò không nằm trong danh sách cho phép.' };
  const color = String(input?.color || '').trim();
  if (!CUSTOM_ROLE_COLOR_RE.test(color)) return { ok: false, message: 'Màu badge phải là mã hex (#rgb hoặc #rrggbb).' };
  const specialChar = String(input?.specialChar || '').trim().slice(0, 2);
  const rawPermissions: unknown[] = Array.isArray(input?.permissions) ? input.permissions : [];
  const uniquePermissions = Array.from(new Set(
    rawPermissions
      .map((permission: unknown) => String(permission || '').trim())
      .filter((permission): permission is CustomRolePermission => (CUSTOM_ROLE_PERMISSIONS as readonly string[]).includes(permission)),
  ));
  if (uniquePermissions.length === 0) return { ok: false, message: 'Vai trò cần ít nhất 1 quyền hợp lệ.' };
  return { ok: true, value: { name, icon, color: color.toLowerCase(), specialChar, permissions: uniquePermissions } };
}

/** Nạp lại vai trò tùy chỉnh từ đĩa — dùng chung luật kiểm tra với API tạo role (tối đa 200 role). */
export function sanitizeCustomRoles(raw: unknown): Record<string, CustomRoleRecord> {
  const out: Record<string, CustomRoleRecord> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [key, value] of Object.entries(raw as Record<string, any>).slice(0, 200)) {
    if (!value || typeof value !== 'object') continue;
    const id = String(value.id || '').trim();
    if (!id || id !== key || id.length > 120 || !id.startsWith('role')) continue;
    const checked = sanitizeCustomRoleInput(value);
    if (!checked.ok) continue;
    out[id] = {
      id,
      ...checked.value,
      createdAt: Number.isFinite(value.createdAt) ? Math.max(0, Math.floor(value.createdAt)) : 0,
      createdBy: String(value.createdBy || '').trim().toLowerCase().slice(0, 254),
    };
  }
  return out;
}

/** Quyền của vai trò tùy chỉnh gắn với một user (đọc từ store hiện tại). */
export function customRolePermissionsOf(user: UserRecord | undefined): CustomRolePermission[] {
  if (!user?.customRole) return [];
  const role = store.customRoles?.[user.customRole];
  return role ? [...role.permissions] : [];
}

export interface ForumDataStore {
  users: Record<string, UserRecord>;
  passwords: Record<string, string>;
  clubs: any[];
  clubPosts: any[];
  questions: any[];
  solutions: any[];
  chatMessages: any[];
  feedbacks: any[];
  reports?: any[];
  about?: any;
  /** Áp chế theo email: cấm / khoá gửi tin, có thời hạn. Xem server/moderation.ts. */
  moderation?: ModerationMap;
  /** Nhật ký hành động quản trị — cần cho truy vết, tối đa 300 mục. */
  auditLog?: any[];
  /** Thời lượng, lượt mở và hoạt động; visitor ID được băm trước khi lưu. */
  analytics?: AnalyticsStore;
  /** Cảnh cáo riêng tư, tối đa 1.000 bản ghi mới nhất. */
  adminWarnings?: AdminWarningRecord[];
  /** Vai trò tùy chỉnh do Super Admin tạo (Epic 3 — mục 3.5), kèm bộ quyền riêng. */
  customRoles?: Record<string, CustomRoleRecord>;
  /** Điểm danh, lượt trả lời và kho hộp quà do máy chủ quản lý. */
  dailyRewards?: Record<string, DailyRewardProfile>;
  /** Phiên Pomodoro đang mở, đối chiếu bằng đồng hồ máy chủ khi nhận thưởng. */
  focusRewardSessions?: Record<string, FocusRewardSession>;
  /** Epic 5 — "đăng xuất mọi thiết bị": email → mốc (ms); token phát hành TRƯỚC mốc bị
   *  thu hồi. Để NGOÀI bản ghi user vì `users` được phát công khai qua /api/sync. */
  sessionRevocations?: Record<string, number>;
}


const XP_THRESHOLDS: number[] = Array.from({ length: 151 }, (_, lvl) =>
  lvl <= 1 ? 0 : Math.floor(140 * (lvl - 1) + 1.08 * Math.pow(lvl - 1, 2))
);

export function calculateLevelFromXP(xp: number): number {
  if (xp <= 0) return 1;
  let low = 1;
  let high = 150;
  let ans = 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (xp >= XP_THRESHOLDS[mid]) {
      ans = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return ans;
}

const DEFAULT_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231a2332"/><circle cx="50" cy="38" r="20" fill="%234a5d78"/><path d="M20 90 Q50 65 80 90" fill="%234a5d78"/></svg>`;

/* Epic 5 — ảnh do client gửi (khách / bản cũ) phải là URL ảnh an toàn; sai thì về mặc định. */
const safeAvatarUrl = (value: unknown): string =>
  (typeof value === 'string' ? sanitizeMediaUrl(value, 2000) : null) || DEFAULT_AVATAR;

/*
  Mặt nạ ẩn danh: chỉ nhận đúng các mặt nạ chính thức của app. Trước đây server lưu
  chuỗi client gửi và CẮT còn 2000 ký tự — trong khi 4/5 mặt nạ dài 1918–2550 ký tự,
  nên ảnh mặt nạ của câu hỏi ẩn danh bị hỏng. Allowlist vừa sửa lỗi đó vừa chặn
  việc nhét dữ liệu tuỳ ý vào trường ảnh.
*/
const GHIBLI_MASK_SET = new Set<string>(GHIBLI_MASKS);
const safeAnonymousMask = (value: unknown, seed: string): string =>
  typeof value === 'string' && GHIBLI_MASK_SET.has(value) ? value : getRandomGhibliMask(seed);

/**
 * Thư mục dữ liệu — đổi được qua `FFORUM_DATA_DIR` (hữu ích khi chạy test song
 * song). Đọc biến môi trường MỖI LẦN dùng chứ không chốt lúc import: nếu chốt
 * sớm thì việc đặt `FFORUM_DATA_DIR` sau khi nạp module bị bỏ qua âm thầm.
 */
const dataDir = (): string =>
  process.env.FFORUM_DATA_DIR
    ? path.resolve(process.env.FFORUM_DATA_DIR)
    : path.resolve(process.cwd(), 'data');
const dataFilePath = (): string => path.join(dataDir(), 'forum-data.json');
const ADMIN_BOOTSTRAP_PASSWORD_MIN_LENGTH = 12;

/**
 * Mật khẩu quản trị chỉ được khởi tạo từ secret ngoài mã nguồn. Mật khẩu yếu
 * hoặc thiếu không tạo credential; khi đó Super Admin chỉ đăng nhập được qua
 * OAuth phía máy chủ đã xác minh.
 */
const configuredAdminBootstrapPassword = (): string | null => {
  const password = String(process.env.FFORUM_ADMIN_PASSWORD || '').trim();
  return password.length >= ADMIN_BOOTSTRAP_PASSWORD_MIN_LENGTH ? password : null;
};

let store: ForumDataStore = {
  users: {
    'broamstuck@gmail.com': {
      id: 'user-admin',
      name: 'Trần Văn Anh Tuấn',
      email: 'BroAmStuck@gmail.com',
      avatar: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_a455843c-d8db-461c-8ef6-74a325d2472c.png',
      role: 'SUPER_ADMIN',
      level: 150,
      xp: 45000,
      fPoints: 45000,
      streakCount: 36,
      inventory: [],
      equippedBadge: '',
      bio: 'F-Forum Architect & Core Administrator. Xây dựng tương lai tri thức học đường.',
      gender: 'Nam',
      city: 'Hà Nội',
      className: 'K19 Software Engineering',
      scopedClubIds: [],
    },
  },
  passwords: {},
  clubs: [],
  clubPosts: [],
  questions: [],
  solutions: [],
  chatMessages: [],
  feedbacks: [],
  analytics: createEmptyAnalytics(),
  adminWarnings: [],
  dailyRewards: {},
  focusRewardSessions: {},
  about: {
    headline: 'Người Kiến Tạo & Quản Trị Hệ Thống',
    subtitle: 'Field Notes & Development Chronicles — BroAmStuck Studio',
    founder: {
      name: 'Trần Văn Anh Tuấn',
      role: 'Admin F-Forum • Owner BroAmStuck Studio',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=600&fit=crop&crop=faces',
      bio: 'Xây dựng F-Forum từ những dòng code đầu tiên với mong muốn tạo nên một không gian số bình đẳng, nơi học sinh tự do kết nối tri thức, chia sẻ câu lạc bộ và lưu giữ ký ức tuổi học trò mà không bị rào cản bởi phán xét hay công nghệ phức tạp.',
      email: 'BroAmStuck@gmail.com',
    },
    milestones: [
      {
        id: 'ms-1',
        title: 'Khởi Sinh F-Forum',
        category: 'Kiến trúc hạ tầng Zero-Cost',
        place: 'F-Forum Cloud Architecture • Cloudflare Tunnel Zero-Cost Edge',
        imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=800&fit=crop',
        notes: 'Kiến trúc hạ tầng Zero-Cost qua Cloudflare Tunnel kết hợp WebSockets, tối ưu hóa chi phí vận hành 0 đồng nhưng vẫn đảm bảo độ trễ thấp và băng thông không giới hạn.',
      },
      {
        id: 'ms-2',
        title: 'BroAmStuck Studio',
        category: 'Xưởng sáng tạo Web Interactive Awwwards & MotionSites',
        place: 'BroAmStuck Studio • Awwwards Interactive Design Lab',
        imageUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1200&h=800&fit=crop',
        notes: 'Xưởng sáng tạo các giao diện Web Interactive Awwwards & MotionSites đỉnh cao năm 2026, ứng dụng Bento Grid và obsidian glass.',
      },
      {
        id: 'ms-3',
        title: 'Không Gian Kết Nối',
        category: 'Sàn Q&A ẩn danh, phòng chat thời gian thực và miền ký ức',
        place: 'F-Forum Virtual Campus • Realtime Q&A & Memory Space',
        imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=800&fit=crop',
        notes: 'Sàn Q&A ẩn danh, phòng chat thời gian thực và miền ký ức học đường giúp học sinh kết nối tri thức và lưu giữ tuổi thanh xuân.',
      },
    ],
  },
};

/** Miền email của lớp tài khoản mô phỏng đã bị xoá — chặn vĩnh viễn ở tầng server */
const RETIRED_VIRTUAL_DOMAIN = '@sv.f-forum.vn';

/** Email hợp lệ (kiểm tra thực dụng, không cần RFC 5322 đầy đủ). */
const EMAIL_PATTERN = /^[^\s@,;:]+@[^\s@,;:.]+(\.[^\s@,;:.]+)+$/;

/** Chỉ giữ tài khoản thật: bỏ bản ghi mô phỏng cũ và bản ghi hỏng */
/** Số nguyên không âm, dùng để lấp các trường số của bản ghi cũ. */
const asCount = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
};

const asBoundedCount = (value: unknown, fallback: number, max: number): number =>
  Math.min(max, asCount(value, fallback));

const SHOP_ITEM_BY_ID = new Map(SHOP_ITEMS.map((item) => [item.id, item]));
const MAX_USER_COIN = 10_000_000;
const MAX_USER_XP = 100_000_000;

/**
  Chuẩn hoá bản ghi người dùng nạp từ đĩa.

  Chỉ spread thô (`{ ...raw, email }`) là không đủ: tệp dữ liệu viết ra từ bản cũ
  thiếu hẳn những trường thêm về sau (ví dụ `scopedClubIds`). Bản ghi đó đi thẳng
  vào store với trường `undefined`, và chỗ nào spread/cộng dồn trường ấy sẽ ném
  `TypeError` — làm dở dang cả một luồng đang mutate nhiều bước.
*/
/**
 * Mốc thu hồi phiên: chỉ giữ số hữu hạn > 0 của tài khoản còn tồn tại. Gộp cả giá trị
 * cũ từng nằm trong bản ghi user (`sessionsRevokedAt`) để nâng cấp không làm "sống lại"
 * những token người dùng đã chủ động thu hồi.
 */
function sanitizeSessionRevocations(raw: unknown, legacyUsers: unknown, known: Set<string>): Record<string, number> {
  const out: Record<string, number> = {};
  const take = (email: unknown, at: unknown) => {
    const key = String(email || '').trim().toLowerCase();
    const value = Number(at);
    if (!known.has(key) || !Number.isFinite(value) || value <= 0) return;
    out[key] = Math.max(out[key] || 0, Math.floor(value));
  };
  if (raw && typeof raw === 'object') {
    Object.entries(raw as Record<string, unknown>).forEach(([email, at]) => take(email, at));
  }
  if (legacyUsers && typeof legacyUsers === 'object') {
    Object.values(legacyUsers as Record<string, unknown>).forEach((user) => {
      if (user && typeof user === 'object') {
        const legacy = user as { email?: unknown; sessionsRevokedAt?: unknown };
        take(legacy.email, legacy.sessionsRevokedAt);
      }
    });
  }
  return out;
}

function sanitizeUsers(rawUsers: any): Record<string, UserRecord> {
  const out: Record<string, UserRecord> = {};
  if (!rawUsers || typeof rawUsers !== 'object') return out;
  Object.values(rawUsers).forEach((raw: any) => {
    if (!raw || typeof raw !== 'object') return;
    const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
    if (!email || !email.includes('@') || email.endsWith(RETIRED_VIRTUAL_DOMAIN)) return;
    if (!raw.id || !raw.name) return;
    const allowedRole = ['SUPER_ADMIN', 'CLUB_LEADER', 'STUDENT'].includes(raw.role)
      ? raw.role as UserRecord['role']
      : 'STUDENT';
    const role: UserRecord['role'] = isMasterAdminEmail(email) ? 'SUPER_ADMIN' : allowedRole;
    const staffRole = role !== 'SUPER_ADMIN' && ['MODERATOR', 'TEACHER'].includes(raw.staffRole)
      ? raw.staffRole as 'MODERATOR' | 'TEACHER'
      : undefined;
    const premiumUntil = typeof raw.premiumUntil === 'number' && Number.isFinite(raw.premiumUntil) && raw.premiumUntil >= 0
      ? Math.floor(raw.premiumUntil)
      : undefined;
    const safeRaw = { ...raw };
    delete safeRaw.premiumGrantedBy;
    /* Mốc thu hồi phiên là dữ liệu nội bộ (đã chuyển sang store.sessionRevocations). */
    delete safeRaw.sessionsRevokedAt;
    const xp = asBoundedCount(raw.xp, 0, MAX_USER_XP);
    const inventory = Array.isArray(raw.inventory)
      ? [...new Set(raw.inventory.filter((id: unknown) => typeof id === 'string' && SHOP_ITEM_BY_ID.has(id)))].slice(0, 500)
      : [];
    out[email] = {
      ...safeRaw,
      email,
      role,
      staffRole,
      ...(premiumUntil !== undefined ? { premiumUntil } : {}),
      ...(typeof raw.premiumGrantedAt === 'number' && Number.isFinite(raw.premiumGrantedAt)
        ? { premiumGrantedAt: Math.max(0, Math.floor(raw.premiumGrantedAt)) }
        : {}),
      avatar: typeof raw.avatar === 'string' ? raw.avatar : '',
      level: calculateLevelFromXP(xp),
      xp,
      fPoints: asBoundedCount(raw.fPoints, xp, MAX_USER_XP),
      coin: asBoundedCount(raw.coin, 100, MAX_USER_COIN),
      streakCount: asBoundedCount(raw.streakCount, 0, 100_000),
      inventory,
      equippedBadge: typeof raw.equippedBadge === 'string' && inventory.includes(raw.equippedBadge)
        ? raw.equippedBadge
        : '',
      scopedClubIds: Array.isArray(raw.scopedClubIds)
        ? raw.scopedClubIds.slice(0, 500).map((c: unknown) => String(c))
        : [],
    };
    /* Super Admin cố định theo email: không gắn kèm vai trò tùy chỉnh nào. */
    if (role === 'SUPER_ADMIN') delete out[email].customRole;
  });
  return out;
}

/**
 * Nhật ký là dữ liệu nội bộ nhưng vẫn phải chuẩn hoá khi nạp: file JSON có thể
 * là bản cũ, bị sửa tay hoặc hỏng một vài dòng. Không cho object lạ tràn vào UI
 * quản trị (ví dụ `at: {}` làm `new Date(...).toISOString()` ném lỗi).
 */
function sanitizeAuditLog(rawLog: unknown): any[] {
  if (!Array.isArray(rawLog)) return [];
  return rawLog
    .filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))
    .slice(0, 300)
    .map((entry: any) => ({
      id: typeof entry.id === 'string' && entry.id ? entry.id.slice(0, 120) : randomId('audit'),
      at: typeof entry.at === 'number' && Number.isFinite(entry.at) && entry.at >= 0 ? entry.at : 0,
      action: typeof entry.action === 'string' ? entry.action.slice(0, 80) : 'unknown',
      targetEmail: typeof entry.targetEmail === 'string' ? entry.targetEmail.slice(0, 120).toLowerCase() : '',
      reason: typeof entry.reason === 'string' ? entry.reason.slice(0, 500) : '',
      by: typeof entry.by === 'string' ? entry.by.slice(0, 120).toLowerCase() : '',
    }));
}

function sanitizeAdminWarnings(rawWarnings: unknown): AdminWarningRecord[] {
  if (!Array.isArray(rawWarnings)) return [];
  return rawWarnings
    .filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))
    .slice(0, 1000)
    .map((entry: any) => ({
      id: typeof entry.id === 'string' && entry.id ? entry.id.slice(0, 120) : randomId('warning'),
      at: typeof entry.at === 'number' && Number.isFinite(entry.at) && entry.at >= 0 ? entry.at : 0,
      targetEmail: typeof entry.targetEmail === 'string' ? entry.targetEmail.trim().toLowerCase().slice(0, 120) : '',
      reason: typeof entry.reason === 'string' ? entry.reason.trim().slice(0, 500) : '',
      by: typeof entry.by === 'string' ? entry.by.trim().toLowerCase().slice(0, 120) : '',
    }))
    .filter((entry) => entry.targetEmail && entry.reason);
}

function loadStoreFromDisk() {
  try {
    if (fs.existsSync(dataFilePath())) {
      const raw = fs.readFileSync(dataFilePath(), 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const cleanUsers = sanitizeUsers({ ...store.users, ...(parsed.users || {}) });
        const cleanPasswords: Record<string, string> = {};
        Object.entries(parsed.passwords || {}).forEach(([email, pw]) => {
          const key = email.trim().toLowerCase();
          if (cleanUsers[key]) cleanPasswords[key] = pw as string;
        });
        store = {
          users: cleanUsers,
          passwords: { ...store.passwords, ...cleanPasswords },
          clubs: Array.isArray(parsed.clubs)
            ? parsed.clubs.map((club: any) => club && typeof club === 'object'
              ? {
                  ...club,
                  /* Dữ liệu cũ đã từng duyệt CLB được xem là đã nhận thưởng;
                     không mở lại cửa cộng XP sau khi từ chối rồi duyệt lại. */
                  founderRewardGranted: club.founderRewardGranted === true || club.status === 'APPROVED',
                }
              : club)
            : [],
          clubPosts: Array.isArray(parsed.clubPosts) ? parsed.clubPosts : [],
          questions: Array.isArray(parsed.questions)
            ? parsed.questions.map((question: any) => question && typeof question === 'object'
              ? {
                  ...question,
                  /* Với bản ghi cũ, đã có đáp án chuẩn nghĩa là thưởng có thể
                     đã được trả; giữ khóa chống phát lại sau khi xóa/chọn lại. */
                  bountyRewardClaimed: question.bountyRewardClaimed === true || Boolean(question.bestSolutionId),
                  solutionRewardedEmails: Array.isArray(question.solutionRewardedEmails)
                    ? [...new Set(question.solutionRewardedEmails.filter((email: unknown) => typeof email === 'string').map((email: string) => email.toLowerCase()))].slice(0, 1000)
                    : [],
                }
              : question)
            : [],
          solutions: Array.isArray(parsed.solutions)
            ? parsed.solutions.map((solution: any) => solution && typeof solution === 'object'
              ? {
                  ...solution,
                  /* Đáp án từng được chọn đã nhận +5 upvote từ logic cũ; khóa
                     bonus ở dữ liệu nạp để không cộng lại khi đổi rồi chọn lại. */
                  bestSelectionBonusGranted: solution.bestSelectionBonusGranted === true || Boolean(solution.isBest),
                }
              : solution)
            : [],
          chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
          feedbacks: Array.isArray(parsed.feedbacks) ? parsed.feedbacks : [],
          /* LỖI MẤT DỮ LIỆU: bản cũ dựng lại store mà bỏ quên `reports`, nên mọi
             báo cáo vi phạm đã ghi xuống đĩa bị vứt đi mỗi lần khởi động lại. */
          reports: Array.isArray(parsed.reports) ? parsed.reports : store.reports || [],
          about: parsed.about || store.about,
          /* Hai field này PHẢI được liệt kê ở đây: loadStoreFromDisk dựng lại store
             bằng một object literal nên field nào không liệt kê sẽ bị vứt mỗi lần
             khởi động. `reports` từng mất dữ liệu đúng theo cách đó. */
          moderation: parseModerationMap(parsed.moderation),
          auditLog: sanitizeAuditLog(parsed.auditLog),
          analytics: sanitizeAnalyticsStore(parsed.analytics),
          adminWarnings: sanitizeAdminWarnings(parsed.adminWarnings),
          /* Epic 3 — vai trò tùy chỉnh. PHẢI liệt kê ở đây (xem cảnh báo ở trên):
             thiếu dòng này thì mọi role biến mất sau mỗi lần khởi động lại. */
          customRoles: sanitizeCustomRoles(parsed.customRoles),
          dailyRewards: sanitizeDailyRewardProfiles(parsed.dailyRewards, new Set(Object.keys(cleanUsers))),
          focusRewardSessions: sanitizeFocusRewardSessions(
            parsed.focusRewardSessions,
            new Set(Object.keys(cleanUsers)),
          ),
          /* PHẢI liệt kê ở đây (xem cảnh báo ở trên): thiếu dòng này thì mỗi lần khởi
             động lại, mọi token đã bị "đăng xuất mọi thiết bị" sẽ hợp lệ trở lại. */
          sessionRevocations: sanitizeSessionRevocations(
            parsed.sessionRevocations,
            parsed.users,
            new Set(Object.keys(cleanUsers)),
          ),
        };
      }
    }
  } catch (err) {
    console.error('[Forum Server] Failed to load data from disk:', err);
    /*
      Không được để yên rồi ghi đè. Nếu tệp hỏng (đĩa đầy, bị ngắt giữa chừng ở
      bản cũ chưa ghi atomic) thì store giữ giá trị rỗng mặc định, và lần
      persistStoreToDisk đầu tiên sẽ XOÁ SẠCH tệp đó — mất luôn cơ hội cứu.
      Đổi tên tệp hỏng sang một bản sao có dấu thời gian để còn khôi phục tay.
    */
    try {
      const file = dataFilePath();
      if (fs.existsSync(file)) {
        const backup = `${file}.corrupt-${Date.now()}`;
        fs.renameSync(file, backup);
        console.error(`[Forum Server] Đã giữ lại tệp dữ liệu hỏng tại ${backup} để khôi phục.`);
      }
    } catch (backupErr) {
      console.error('[Forum Server] Không giữ lại được tệp dữ liệu hỏng:', backupErr);
    }
  }
}

let saveTimeout: NodeJS.Timeout | null = null;
/**
  Ghi store xuống đĩa NGAY, đồng bộ. Trả về true nếu ghi được.
*/
/**
  Ghi store xuống đĩa NGAY, đồng bộ. Trả về true nếu ghi được.

  Ghi qua tệp tạm rồi `rename`, không ghi thẳng. `rename` là thao tác atomic trên
  cùng một hệ tệp, nên tệp dữ liệu không bao giờ ở trạng thái viết dở: tiến trình
  chết giữa chừng thì hoặc là bản cũ còn nguyên, hoặc là bản mới đã xong. Ghi
  thẳng bằng `writeFileSync` mà bị ngắt giữa chừng sẽ để lại JSON cắt cụt — không
  parse được, tức mất TOÀN BỘ dữ liệu ở lần khởi động sau.
*/
function flushStoreToDisk(): boolean {
  try {
    const dir = dataDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const target = dataFilePath();
    const tmp = `${target}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf8');
    fs.renameSync(tmp, target);
    return true;
  } catch (err) {
    console.error('[Forum Server] Failed to persist data to disk:', err);
    return false;
  }
}

function persistStoreToDisk() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    flushStoreToDisk();
  }, 200);
  saveTimeout.unref();
}

/**
  Ghi nốt lần thay đổi đang chờ (nếu có) trước khi tiến trình tắt.

  `persistStoreToDisk` debounce 200ms và gọi `.unref()`, nên timer không giữ tiến
  trình sống. Trước đây không có chỗ nào ghi nốt: tắt server trong vòng 200ms sau
  một thao tác (Ctrl+C, container bị dừng, crash) là lần ghi cuối cùng MẤT — người
  dùng vừa đăng bài mà khởi động lại thì bài biến mất.
*/
function flushPendingSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
    flushStoreToDisk();
  }
}

/**
  Các handler ghi-dữ-liệu-khi-tắt đang gắn trên `process`.

  Phải lưu trên `globalThis` chứ không phải biến cấp module: Vite reload module
  server mỗi lần tệp thay đổi, nên biến cấp module bị đặt lại và mỗi lần reload
  lại cộng thêm một bộ handler mới. Kết quả实测 là cảnh báo
  `MaxListenersExceededWarning: 11 SIGTERM listeners added` sau vài lần restart.

  Nguy hiểm hơn việc tràn listener: handler của module CŨ vẫn giữ closure trỏ tới
  `store` của module cũ, nên nếu chúng chạy thì sẽ ghi đè tệp dữ liệu bằng bản
  đã lỗi thời. Vì vậy phải GỠ bộ cũ trước khi gắn bộ mới.
*/
const SHUTDOWN_HOOKS_KEY = Symbol.for('fforum.shutdownHooks');
type ShutdownHooks = {
  signals: Array<{ signal: NodeJS.Signals; handler: () => void }>;
  exit: () => void;
};

function installShutdownFlush() {
  const globalRef = globalThis as unknown as Record<symbol, ShutdownHooks | undefined>;

  /* Gỡ bộ handler của lần nạp module trước, nếu có. */
  const previous = globalRef[SHUTDOWN_HOOKS_KEY];
  if (previous) {
    for (const { signal, handler } of previous.signals) {
      process.removeListener(signal, handler);
    }
    process.removeListener('exit', previous.exit);
  }

  const signals: ShutdownHooks['signals'] = [];
  for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP'] as const) {
    const handler = () => {
      flushPendingSave();
      process.exit(0);
    };
    process.on(signal, handler);
    signals.push({ signal, handler });
  }
  /* `exit` không chạy được code bất đồng bộ, nhưng ghi ở đây là đồng bộ. */
  const exitHandler = () => flushPendingSave();
  process.on('exit', exitHandler);

  globalRef[SHUTDOWN_HOOKS_KEY] = { signals, exit: exitHandler };
}

export { flushStoreToDisk, flushPendingSave };

const wsClients = new Set<WebSocket>();
const sseClients = new Set<ServerResponse>();

/* -------------------------------------------------------------------------- */
/* Phiên đăng nhập của từng kết nối WebSocket                                 */
/* -------------------------------------------------------------------------- */
/**
 * Kết nối WS chỉ được đụng vào dữ liệu "nhạy cảm" sau khi gửi `AUTH` kèm token
 * hợp lệ. Trước đây mọi client đều có quyền như admin.
 */
const wsSessions = new WeakMap<WebSocket, SessionClaims>();

/**
  IP của từng kết nối WS, lấy từ request lúc bắt tay.

  Cần có để khoá rate limiter cho các đường ghi qua WS. Trước đây NĂM đường ghi
  qua WS (`NEW_CHAT_MESSAGE`, `NEW_QUESTION`, `NEW_SOLUTION`, `NEW_CLUB`,
  `NEW_CLUB_POST`) không có limiter nào, trong khi bản HTTP của chúng thì có —
  nên chỉ cần chuyển sang kênh WS là vượt mọi giới hạn ghi.

  Repro với giới hạn 120 lượt/phút:
    HTTP /api/chat 200 lượt        -> 120 thành công (limiter hoạt động)
    WS NEW_CHAT_MESSAGE 200 lượt   -> 200 được lưu   (không giới hạn)
*/
const wsClientIps = new WeakMap<WebSocket, string>();

const sessionOf = (ws: WebSocket): SessionClaims | null => {
  const session = wsSessions.get(ws);
  if (!session) return null;
  /* Token đã bị thu hồi ("đăng xuất mọi thiết bị") → kết nối đang mở mất danh tính
     NGAY ở tin nhắn kế tiếp, không đợi tới lần kết nối lại (trước đây socket đã AUTH
     vẫn chat/đăng bài được bằng token đã bị thu hồi). */
  if (isSessionRevoked(session)) {
    wsSessions.delete(ws);
    return null;
  }
  return session;
};

const isWsSuperAdmin = (ws: WebSocket): boolean =>
  isMasterAdminEmail(sessionOf(ws)?.email);

/* -------------------------------------------------------------------------- */
/* Chặn brute-force trên các cổng đăng nhập                                   */
/* -------------------------------------------------------------------------- */
const AUTH_WINDOW_MS = 10 * 60 * 1000;
const loginLimiter = new SlidingWindowRateLimiter(AUTH_WINDOW_MS, 12);
const registerLimiter = new SlidingWindowRateLimiter(AUTH_WINDOW_MS, 30);
const socialLimiter = new SlidingWindowRateLimiter(AUTH_WINDOW_MS, 30);
const writeLimiter = new SlidingWindowRateLimiter(60 * 1000, 120);
/*
  Epic 5 — hai lớp đếm LẦN ĐĂNG NHẬP SAI bổ sung cho loginLimiter (khoá theo cặp
  IP + email). Thiếu chúng thì một IP có thể rải một mật khẩu qua hàng trăm email
  (password spraying), hoặc một tài khoản bị dò từ nhiều IP mà không bị chặn.
  Chỉ đếm lần SAI nên người dùng thật gõ đúng không bao giờ chạm trần.
*/
const loginFailureIpLimiter = new SlidingWindowRateLimiter(AUTH_WINDOW_MS, 40);
const loginFailureAccountLimiter = new SlidingWindowRateLimiter(AUTH_WINDOW_MS, 25);
/* Epic 5 — tố cáo: bắt buộc đăng nhập, giới hạn riêng theo tài khoản VÀ theo IP
   (trước đây dùng chung limiter ghi 120 lượt/phút, không cần đăng nhập). */
const REPORT_WINDOW_MS = 10 * 60 * 1000;
const reportAccountLimiter = new SlidingWindowRateLimiter(REPORT_WINDOW_MS, 6);
const reportIpLimiter = new SlidingWindowRateLimiter(REPORT_WINDOW_MS, 20);
/* Epic 5 — tải ảnh đại diện / ảnh bìa (xử lý bằng sharp, tốn CPU). */
const uploadLimiter = new SlidingWindowRateLimiter(10 * 60 * 1000, 20);

/**
  Chỉ dành cho bộ kiểm thử.

  Các limiter nằm ở cấp module nên dùng chung giữa mọi test trong cùng tiến trình:
  bộ test càng dài thì các test ở cuối càng dễ va trần (giới hạn đăng ký 30 lượt/
  10 phút trong khi bộ test tạo hơn 30 tài khoản). Đây là giới hạn của hạ tầng
  kiểm thử, không phải của sản phẩm, nên cho phép đặt lại giữa các test thay vì
  nới giới hạn thật.
*/
export function resetRateLimitersForTest() {
  loginLimiter.reset();
  registerLimiter.reset();
  socialLimiter.reset();
  writeLimiter.reset();
  loginFailureIpLimiter.reset();
  loginFailureAccountLimiter.reset();
  reportAccountLimiter.reset();
  reportIpLimiter.reset();
  uploadLimiter.reset();
  presenceLimiter.reset();
  analyticsLimiter.reset();
}

const startedAtMs = Date.now();

/**
 * Vô hiệu hoá credential quản trị mẫu từng được phát hành trong mã nguồn.
 * Nhận diện cả bản plaintext cũ lẫn bản đã được migrate sang scrypt. Nếu nhà
 * vận hành đã đặt secret mới đủ mạnh thì dùng secret đó; nếu chưa, xoá credential
 * cũ để tài khoản phải đăng nhập qua OAuth đã xác minh hoặc được bootstrap an toàn.
 */
function retirePublicAdminPassword(): boolean {
  const stored = store.passwords[MASTER_ADMIN_EMAIL.toLowerCase()];
  if (typeof stored !== 'string' || !stored) return false;
  if (!verifyPassword('admin123', stored).ok) return false;

  delete store.passwords[MASTER_ADMIN_EMAIL.toLowerCase()];
  persistStoreToDisk();
  return true;
}

/**
 * Secret cấu hình là nguồn có thẩm quyền cho mật khẩu Super Admin: cài mới được
 * bootstrap và đổi secret trong secret manager sẽ xoay mật khẩu khi restart.
 */
function syncAdminPasswordFromEnvironment(): 'created' | 'rotated' | null {
  const configured = configuredAdminBootstrapPassword();
  if (!configured) return null;
  const existing = store.passwords[MASTER_ADMIN_EMAIL.toLowerCase()];
  if (existing && verifyPassword(configured, existing).ok) return null;
  store.passwords[MASTER_ADMIN_EMAIL.toLowerCase()] = hashPassword(configured);
  persistStoreToDisk();
  return existing ? 'rotated' : 'created';
}

/**
 * Dời mật khẩu plaintext cũ sang scrypt. Chạy một lần lúc khởi động để
 * `data/forum-data.json` không còn chứa mật khẩu đọc được bằng mắt thường.
 */
function migratePlaintextPasswords(): number {
  let migrated = 0;
  Object.keys(store.passwords).forEach((email) => {
    const record = store.passwords[email];
    if (typeof record === 'string' && record && !isHashedPassword(record)) {
      store.passwords[email] = hashPassword(record);
      migrated += 1;
    }
  });
  if (migrated > 0) persistStoreToDisk();
  return migrated;
}

/** Cấp token phiên cho một tài khoản (dùng chung register / login / social). */
const issueTokenFor = (user: UserRecord): string => createSessionToken(user.email, user.role);

/** Trình duyệt xin phiên bằng cookie HttpOnly qua header này (xem src/utils/session.ts). */
const wantsCookieSession = (req: IncomingMessage): boolean =>
  String(req.headers['x-fforum-session'] || '').trim().toLowerCase() === 'cookie';

/**
 * Epic 5 — cấp phiên cho một lần đăng nhập/đăng ký thành công.
 *
 * Luôn trả token trong JSON (client cũ, công cụ dòng lệnh, bộ test dùng Bearer).
 * Nếu trình duyệt xin cookie VÀ kết nối là HTTPS VÀ request cùng nguồn, đặt thêm
 * cookie `__Host-ff_session` (HttpOnly; Secure; SameSite=Strict). Client kiểm chứng
 * cookie hoạt động rồi mới bỏ token khỏi bộ nhớ — trong iframe khác site (vd. khung
 * xem trước) trình duyệt không lưu cookie Strict, khi đó client tự giữ Bearer.
 */
function issueSession(req: IncomingMessage, res: ServerResponse, user: UserRecord, existingToken?: string) {
  const token = existingToken || issueTokenFor(user);
  const claims = verifySessionToken(token);
  const expiresAt = claims?.exp ?? Date.now() + SESSION_TTL_MS;
  let sessionTransport: 'cookie' | 'bearer' = 'bearer';
  if (wantsCookieSession(req) && requestIsHttps(req) && !isCrossSiteRequest(req)) {
    res.setHeader('Set-Cookie', buildSessionCookie(token, expiresAt - Date.now()));
    sessionTransport = 'cookie';
  }
  return { token, expiresAt, sessionTransport };
}

/**
 * Gộp dữ liệu Khu Vinh Danh thay vì thay nguyên khối.
 *
 * Client có quyền gửi một phần tài liệu (ví dụ chỉ đổi `headline`). Nếu ghi đè
 * cả khối thì một payload thiếu sẽ XOÁ SẠCH `founder` và `milestones`, rồi
 * `persistStoreToDisk` ghi luôn xuống đĩa — làm hỏng dữ liệu cho MỌI lần khởi
 * động về sau, kể cả ở tiến trình khác. Gộp thì payload thiếu chỉ cập nhật đúng
 * phần nó mang theo.
 */
function mergeAboutData(incoming: any): any {
  const base: any = store.about || {};
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return base;

  const merged: any = { ...base, ...incoming };
  /*
    Không cho phép xoá mất hai khối lõi. Mảng RỖNG cũng bị coi là "không gửi"
    — một payload thiếu sót hay một lời gọi lỗi không được phép thổi bay toàn bộ
    danh sách mốc kỷ niệm. Muốn gỡ từng mốc thì gửi lại danh sách còn lại.
  */
  if (!merged.founder || typeof merged.founder !== 'object') merged.founder = base.founder;
  if (!Array.isArray(merged.milestones) || merged.milestones.length === 0) {
    merged.milestones = Array.isArray(base.milestones) ? base.milestones : [];
  }
  return merged;
}

export function broadcastServerEvent(type: string, payload: any) {
  const eventMessage = JSON.stringify({ type, payload, timestamp: Date.now() });

  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(eventMessage);
      } catch {
        /* ignore */
      }
    }
  }

  for (const res of sseClients) {
    try {
      res.write(`data: ${eventMessage}\n\n`);
    } catch {
      /* ignore */
    }
  }
}

/** Giới hạn body JSON — quá cỡ thì từ chối thẳng, không nạp hết vào RAM. */
const MAX_JSON_BODY_BYTES = 25 * 1024 * 1024;

/*
  Giới hạn nội dung. Ô nhập phía client đã có `maxLength`, nhưng client thì ai
  cũng sửa được — server PHẢI tự giữ giới hạn của mình, nếu không một request
  thủ công nhét được "tin nhắn" vài MB vào kho rồi phát cho mọi người.
*/
const MAX_CHAT_CONTENT = 500;
const MAX_FEEDBACK_CONTENT = 4000;
const MAX_NAME_LENGTH = 120;

/**
  Trần số tin nhắn giữ trong kho. Mảng này được serialize toàn bộ mỗi lần ghi
  đĩa và trả về nguyên khối cho mọi client qua /api/sync, nên để nó phình vô
  hạn thì cả hai đường đều chậm dần theo thời gian chạy.
*/
const MAX_CHAT_MESSAGES = 500;
const MAX_FEEDBACKS = 500;
const MAX_REPORTS = 500;
const MAX_CLUBS = 300;
const MAX_CLUB_POSTS = 800;

/*
  Trần kết nối đồng thời. Mỗi kết nối SSE/WebSocket giữ một socket và (với SSE)
  một interval nhịp tim, nên không giới hạn thì một vòng lặp mở kết nối là đủ
  làm cạn tài nguyên máy chủ.
*/
const MAX_SSE_CLIENTS = 300;
const MAX_WS_CLIENTS = 300;

/** Khung WebSocket tối đa. Mặc định của thư viện `ws` là 100 MiB — quá rộng. */
const MAX_WS_FRAME_BYTES = 256 * 1024;

/** Giữ lại N phần tử MỚI NHẤT (mảng chat/feedback được push thêm vào cuối). */
const capTail = <T,>(list: T[], max: number): T[] => (list.length > max ? list.slice(list.length - max) : list);

export class PayloadTooLargeError extends Error {
  constructor() {
    super('Payload too large');
    this.name = 'PayloadTooLargeError';
  }
}

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let received = 0;
    const chunks: Buffer[] = [];
    let settled = false;

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      req.off('data', onData);
      req.off('end', onEnd);
      reject(err);
    };

    function onData(chunk: Buffer) {
      received += chunk.length;
      if (received > MAX_JSON_BODY_BYTES) {
        /* Huỷ socket NGAY, không đọc tiếp phần còn lại của payload. */
        fail(new PayloadTooLargeError());
        try {
          req.destroy();
        } catch {
          /* ignore */
        }
        return;
      }
      chunks.push(chunk);
    }

    function onEnd() {
      if (settled) return;
      settled = true;
      const body = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new SyntaxError('Invalid JSON body'));
      }
    }

    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', fail);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  if (res.writableEnded || res.destroyed) return;
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  /* Epic 5: bỏ CORS `*` (CORS giờ do applyCorsHeaders quyết theo Origin) và cấm
     lưu đệm — phản hồi API chứa dữ liệu cá nhân, không được nằm trong cache chung. */
  if (!res.hasHeader('Cache-Control')) res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

/** Bắt lỗi chung cho mọi endpoint: đúng mã, đúng thông điệp, không rò stack. */
function handleApiError(res: ServerResponse, err: any) {
  if (err instanceof PayloadTooLargeError) {
    sendJson(res, 413, { success: false, message: 'Dữ liệu gửi lên quá lớn (tối đa 25MB).' });
    return;
  }
  if (err instanceof SyntaxError) {
    sendJson(res, 400, { success: false, message: 'Dữ liệu JSON không hợp lệ.' });
    return;
  }
  console.error('[Forum Server] Request failed:', err);
  sendJson(res, 500, { success: false, message: 'Máy chủ gặp sự cố, vui lòng thử lại.' });
}

/** Phản hồi 429 kèm thời gian chờ, để client biết khi nào được thử lại. */
function sendRateLimited(res: ServerResponse, retryAfterMs: number, what: string) {
  res.setHeader('Retry-After', String(Math.ceil(retryAfterMs / 1000)));
  sendJson(res, 429, {
    success: false,
    message: `Quá nhiều lượt ${what}. Vui lòng thử lại sau ${Math.ceil(retryAfterMs / 60000)} phút.`,
  });
}

/** Xác thực quản trị: token hợp lệ + email trong token là Super Admin. */
/**
  Lọc gói presence trước khi phát cho mọi client.

  Trước đây server nhận `body.user` rồi broadcast NGUYÊN KHỐI. Client tự khai
  được `email`, nên một request giả mạo khai email của Super Admin sẽ làm chấm
  "Ban Quản Trị đang trực tuyến" sáng lên trên màn hình của mọi người; khai
  `name`/`avatar`/`role` tuỳ ý thì hiện ra thành bất kỳ ai. Mỗi gói còn được phát
  tới MỌI kết nối, nên không lọc là vừa mạo danh vừa khuếch đại.

  `email` và `role` chỉ được lấy từ phiên đăng nhập đã xác thực — không bao giờ
  từ body. Khách chưa đăng nhập thì hai trường đó bị bỏ.
*/
function sanitizePresence(payload: any, claims: SessionClaims | null) {
  if (!payload || typeof payload !== 'object') return null;
  const id = String(payload.id || '').trim().slice(0, 120);
  if (!id) return null;

  const verifiedUser = claims ? store.users[claims.email] : undefined;
  const cleaned: Record<string, unknown> = {
    id,
    name: String(verifiedUser?.name ?? payload.name ?? 'Học sinh').slice(0, MAX_NAME_LENGTH),
    avatar: verifiedUser?.avatar ? String(verifiedUser.avatar).slice(0, 4000) : safeAvatarUrl(payload.avatar),
  };

  const level = Number(verifiedUser?.level ?? payload.level);
  if (Number.isFinite(level)) cleaned.level = Math.min(150, Math.max(1, Math.floor(level)));

  if (typeof payload.rank === 'string') cleaned.rank = payload.rank.slice(0, 20);

  /* Chỉ tài khoản đã đăng nhập mới được gắn email/role — và phải đúng của chính
     tài khoản đó, lấy từ bản ghi thật trên server. */
  if (verifiedUser) {
    cleaned.email = verifiedUser.email;
    cleaned.role = verifiedUser.role;
  }
  return cleaned;
}

/** Chặn flood presence: client thật ping mỗi 15 giây, ngưỡng này còn rất rộng. */
const presenceLimiter = new SlidingWindowRateLimiter(60 * 1000, 40);
/** Nhịp tracker tối đa 2 heartbeat/phút; vẫn dư chỗ cho chuyển trang và mở tab. */
const analyticsLimiter = new SlidingWindowRateLimiter(60 * 1000, 180);

/**
  Chỉ cho sửa ba trường nội dung của một câu hỏi.

  Cả hai đường sửa bài đều gộp `{ ...q, ...updates }` — tức là nhận MỌI trường
  client gửi. Dù cổng này chỉ Super Admin qua được, `authorEmail` là trường quyết
  định quyền sở hữu (chọn đáp án chuẩn, xoá bài) và `bountyCoin` là trường quyết
  định tiền thưởng, nên để ghi đè được hai trường đó là một lỗ mass-assignment:
  một token admin lộ ra, hay một nút bấm gửi nhầm payload, cũng đủ đổi chủ câu
  hỏi hoặc thổi tiền thưởng. Client thật chỉ gửi title/content/subject.
*/
function sanitizeQuestionUpdates(updates: any) {
  if (!updates || typeof updates !== 'object') return null;
  const clean: Record<string, unknown> = {};
  if (typeof updates.title === 'string' && updates.title.trim()) {
    clean.title = updates.title.trim().slice(0, 200);
  }
  if (typeof updates.content === 'string' && updates.content.trim()) {
    clean.content = updates.content.trim().slice(0, 20000);
  }
  if (typeof updates.subject === 'string' && updates.subject.trim()) {
    clean.subject = updates.subject.trim().slice(0, 40);
  }
  return Object.keys(clean).length > 0 ? clean : null;
}

/**
 * Trạng thái khoá trả kèm khi đăng nhập / khôi phục phiên — tính theo GIỜ HIỆN TẠI
 * (lệnh cấm đã hết hạn = đã gỡ) và dọn luôn bản ghi đã hết hạn của tài khoản đó.
 */
function loginModerationStatus(email: string) {
  const { status, staleKey } = moderationForLogin(store.moderation, email, Date.now());
  if (staleKey && store.moderation?.[staleKey]) {
    delete store.moderation[staleKey];
    persistStoreToDisk();
  }
  return status;
}

/**
 * Kiểm tra một người có được phép tạo nội dung hay không.
 *
 * MỘT helper duy nhất, gọi ở MỌI đường ghi trên CẢ HAI transport. Đây là bài học
 * đã trả giá hai lần trong dự án này (defect 34 và 37): một đột biến có hai đường
 * HTTP và WebSocket, vá một đường thì đường kia vẫn hở. Vì thế việc kiểm tra nằm
 * ở đây chứ không rải ra từng nhánh.
 *
 * `kind`:
 *   - 'chat'    → bị chặn khi BANNED hoặc MUTED (khoá gửi tin chỉ áp cho chat)
 *   - 'content' → chỉ bị chặn khi BANNED (đăng câu hỏi, lời giải, CLB, bài CLB)
 */
function checkCanPost(
  email: string | null | undefined,
  kind: 'chat' | 'content',
): { ok: true } | { ok: false; status: number; message: string } {
  const st = moderationStatusOf(store.moderation, email);
  if (st.banned) {
    const until = st.bannedUntil === 0 ? 'vĩnh viễn' : `đến ${new Date(st.bannedUntil as number).toLocaleString('vi-VN')}`;
    return {
      ok: false,
      status: 403,
      message: `Tài khoản của bạn đã bị quản trị viên khoá ${until}.${st.reason ? ` Lý do: ${st.reason}` : ''}`,
    };
  }
  if (kind === 'chat' && st.muted) {
    const until = st.mutedUntil === 0 ? 'vĩnh viễn' : `đến ${new Date(st.mutedUntil as number).toLocaleString('vi-VN')}`;
    return {
      ok: false,
      status: 403,
      message: `Bạn đang bị khoá gửi tin ${until}.${st.reason ? ` Lý do: ${st.reason}` : ''}`,
    };
  }
  return { ok: true };
}

/** Ghi một dòng vào nhật ký quản trị (giữ tối đa 300 mục mới nhất). */
function pushAuditLog(entry: Record<string, unknown>): void {
  const log = Array.isArray(store.auditLog) ? store.auditLog : [];
  log.unshift({ id: randomId('audit'), at: Date.now(), ...entry });
  store.auditLog = log.slice(0, 300);
}

function requireSuperAdmin(req: IncomingMessage, body: any): SessionClaims | null {
  const claims = authorizeRequest(req, null, body?.adminToken || body?.token || null);
  if (!claims) return null;
  if (!isMasterAdminEmail(claims.email)) return null;
  if (store.users[claims.email]?.role !== 'SUPER_ADMIN') return null;
  return claims;
}

function authenticatedUser(req: IncomingMessage, body?: any): { claims: SessionClaims; user: UserRecord } | null {
  const claims = authorizeRequest(req, null, body?.token || null);
  if (!claims) return null;
  const user = store.users[claims.email];
  return user ? { claims, user } : null;
}

interface AdminActor {
  claims: SessionClaims;
  user: UserRecord;
  role: 'SUPER_ADMIN' | 'MODERATOR' | 'TEACHER';
  /** Quyền của vai trò tùy chỉnh (rỗng nếu actor dùng vai trò có sẵn). */
  permissions: CustomRolePermission[];
  /** true nếu quyền kiểm duyệt đến từ vai trò tùy chỉnh — từng endpoint phải đối chiếu quyền cụ thể. */
  viaCustomRole: boolean;
}

/** Quyền luôn đọc từ hồ sơ server hiện tại, không tin role cũ trong token. */
function requireModerationStaff(req: IncomingMessage, body: any): AdminActor | null {
  const claims = authorizeRequest(req, null, body?.adminToken || body?.token || null);
  if (!claims) return null;
  const user = store.users[claims.email];
  if (!user) return null;
  const isSuper = isMasterAdminEmail(claims.email) && user.role === 'SUPER_ADMIN';
  const staffRole = user.staffRole === 'MODERATOR' || user.staffRole === 'TEACHER' ? user.staffRole : null;
  const customPermissions = customRolePermissionsOf(user);
  /* give_role cũng đủ để XEM danh bạ (cần chọn người để cấp vai trò); các endpoint
     ghi (warn/moderate) vẫn đối chiếu quyền cụ thể khi actor.viaCustomRole. */
  const hasCustomModeration = [...CUSTOM_ROLE_MODERATION_PERMISSIONS, 'give_role' as const]
    .some((permission) => customPermissions.includes(permission));
  if (!isSuper && !staffRole && !hasCustomModeration) return null;
  const role: AdminActor['role'] = isSuper ? 'SUPER_ADMIN' : staffRole || 'MODERATOR';
  return {
    claims: { ...claims, role: user.role },
    user,
    role,
    permissions: customPermissions,
    viaCustomRole: !isSuper && !staffRole,
  };
}

/** Super Admin hoặc vai trò tùy chỉnh có quyền edit_content — dùng cho sửa/xoá nội dung vi phạm. */
function requireContentEditor(req: IncomingMessage, body: any): SessionClaims | null {
  const superClaims = requireSuperAdmin(req, body);
  if (superClaims) return superClaims;
  const claims = authorizeRequest(req, null, body?.adminToken || body?.token || null);
  if (!claims) return null;
  return customRolePermissionsOf(store.users[claims.email]).includes('edit_content') ? claims : null;
}

/** Super Admin hoặc vai trò tùy chỉnh có quyền give_role — dùng cho cấp vai trò (mục 3.1/3.5). */
function requireRoleGrantor(req: IncomingMessage, body: any): AdminActor | null {
  const claims = authorizeRequest(req, null, body?.adminToken || body?.token || null);
  if (!claims) return null;
  const user = store.users[claims.email];
  if (!user) return null;
  if (isMasterAdminEmail(claims.email) && user.role === 'SUPER_ADMIN') {
    return { claims: { ...claims, role: user.role }, user, role: 'SUPER_ADMIN', permissions: [...CUSTOM_ROLE_PERMISSIONS], viaCustomRole: false };
  }
  const customPermissions = customRolePermissionsOf(user);
  if (!customPermissions.includes('give_role')) return null;
  return {
    claims: { ...claims, role: user.role },
    user,
    role: user.staffRole === 'MODERATOR' || user.staffRole === 'TEACHER' ? user.staffRole : 'MODERATOR',
    permissions: customPermissions,
    viaCustomRole: true,
  };
}

function isPremiumActive(user: UserRecord | undefined, now: number = Date.now()): boolean {
  return typeof user?.premiumUntil === 'number' &&
    (user.premiumUntil === 0 || user.premiumUntil > now);
}

function getAnalyticsStore(): AnalyticsStore {
  if (!store.analytics) store.analytics = createEmptyAnalytics();
  return store.analytics;
}

function getDailyRewardProfile(email: string): DailyRewardProfile {
  if (!store.dailyRewards) store.dailyRewards = {};
  const key = email.trim().toLowerCase();
  if (!store.dailyRewards[key]) store.dailyRewards[key] = createEmptyDailyRewardProfile();
  return store.dailyRewards[key];
}

function currentRewardDateKey(now = Date.now()): string {
  const configuredZone = String(process.env.FFORUM_REWARD_TIME_ZONE || 'Asia/Ho_Chi_Minh').trim();
  try {
    return dateKeyInTimeZone(now, configuredZone || 'Asia/Ho_Chi_Minh');
  } catch {
    console.warn(`[Forum Server] Múi giờ thưởng "${configuredZone}" không hợp lệ; dùng Asia/Ho_Chi_Minh.`);
    return dateKeyInTimeZone(now, 'Asia/Ho_Chi_Minh');
  }
}

function grantCoinsAndExperience(user: UserRecord, amount: number): void {
  const credit = Math.max(0, Math.floor(amount));
  const previousXp = asBoundedCount(user.xp, 0, MAX_USER_XP);
  const previousFPoints = asBoundedCount(user.fPoints, previousXp, MAX_USER_XP);
  user.coin = Math.min(MAX_USER_COIN, asBoundedCount(user.coin, 100, MAX_USER_COIN) + credit);
  user.xp = Math.min(MAX_USER_XP, previousXp + credit);
  user.fPoints = Math.min(MAX_USER_XP, previousFPoints + credit);
  user.level = calculateLevelFromXP(user.xp);
}

function grantExperience(user: UserRecord, amount: number): void {
  const credit = Math.max(0, Math.floor(amount));
  const previousXp = asBoundedCount(user.xp, 0, MAX_USER_XP);
  const previousFPoints = asBoundedCount(user.fPoints, previousXp, MAX_USER_XP);
  user.xp = Math.min(MAX_USER_XP, previousXp + credit);
  user.fPoints = Math.min(MAX_USER_XP, previousFPoints + credit);
  user.level = calculateLevelFromXP(user.xp);
}

function notifyUserSockets(email: string, type: string, payload: unknown): void {
  const target = String(email || '').trim().toLowerCase();
  const message = JSON.stringify({ type, payload, timestamp: Date.now() });
  wsClients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN || sessionOf(client)?.email !== target) return;
    try { client.send(message); } catch { /* kết nối vừa có thể đóng */ }
  });
}

/**
 * "Đăng xuất mọi thiết bị": báo mọi socket đang mở của tài khoản (SESSION_REVOKED)
 * rồi gỡ danh tính khỏi chúng. Duyệt wsSessions trực tiếp vì sau khi đặt mốc thu hồi,
 * sessionOf() đã coi các phiên này là vô hiệu nên notifyUserSockets() không thấy nữa.
 */
function revokeAccountSockets(email: string): number {
  const target = String(email || '').trim().toLowerCase();
  const message = JSON.stringify({ type: 'SESSION_REVOKED', payload: { reason: 'everywhere' }, timestamp: Date.now() });
  let count = 0;
  wsClients.forEach((client) => {
    if (wsSessions.get(client)?.email !== target) return;
    wsSessions.delete(client);
    count += 1;
    if (client.readyState !== WebSocket.OPEN) return;
    try { client.send(message); } catch { /* kết nối vừa có thể đóng */ }
  });
  return count;
}

export function setupForumServer(httpServer: any, middlewares: any) {
  loadStoreFromDisk();
  installShutdownFlush();

  /* Epic 5: token phát hành trước mốc "đăng xuất mọi thiết bị" của tài khoản bị từ chối. */
  setSessionRevocationCheck((claims) => {
    const revokedAt = Number(store.sessionRevocations?.[claims.email] || 0);
    return revokedAt > 0 && claims.iat < revokedAt;
  });

  const retiredAdminPassword = retirePublicAdminPassword();
  if (retiredAdminPassword) {
    console.warn('[Forum Server] Đã thu hồi mật khẩu quản trị mẫu từng được phát hành công khai.');
  }
  const adminPasswordSync = syncAdminPasswordFromEnvironment();
  if (adminPasswordSync) {
    console.info(`[Forum Server] Đã ${adminPasswordSync === 'created' ? 'bootstrap' : 'xoay'} mật khẩu Super Admin từ secret máy chủ (chỉ lưu scrypt).`);
  } else if (String(process.env.FFORUM_ADMIN_PASSWORD || '').trim() && !configuredAdminBootstrapPassword()) {
    console.warn('[Forum Server] Bỏ qua FFORUM_ADMIN_PASSWORD vì mật khẩu phải dài tối thiểu 12 ký tự.');
  }

  delete store.users['hocsinhmoi@fpt.edu.vn'];
  delete store.passwords['hocsinhmoi@fpt.edu.vn'];

  /* Mật khẩu plaintext còn sót từ bản cũ → băm lại trước khi mở cổng. */
  const migrated = migratePlaintextPasswords();
  if (migrated > 0) {
    console.log(`[Forum Server] Đã băm lại ${migrated} mật khẩu plaintext (scrypt).`);
  }

  if (httpServer) {
    const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_WS_FRAME_BYTES });

    httpServer.on('upgrade', (req: IncomingMessage, socket: any, head: any) => {
      const url = req.url || '';
      if (url === '/ws' || url.startsWith('/ws?') || url.startsWith('/api/ws')) {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      }
    });

    wss.on('connection', (ws, req) => {
      /* `wss.emit('connection', ws, req)` có truyền req nhưng handler cũ không
         nhận, nên không có cách nào biết IP của kết nối để giới hạn tốc độ. */
      if (req) wsClientIps.set(ws, clientIpOf(req));

      if (wsClients.size >= MAX_WS_CLIENTS) {
        try {
          ws.send(JSON.stringify({ type: 'SERVER_FULL', payload: { message: 'Máy chủ đang quá tải, vui lòng thử lại sau.' } }));
        } catch { /* ignore */ }
        ws.close();
        return;
      }
      wsClients.add(ws);

      /*
        Epic 5 — phiên cookie HttpOnly: JavaScript không đọc được token nên không gửi
        được gói AUTH; trình duyệt tự kèm cookie trong bước bắt tay WebSocket. Chỉ
        nhận khi bắt tay đến từ chính site (chống Cross-Site WebSocket Hijacking).
      */
      let cookieBound: SessionClaims | null = null;
      if (req && !isCrossSiteRequest(req)) {
        const cookieClaims = verifySessionToken(readSessionCookie(req));
        const cookieAccount = cookieClaims && !isSessionRevoked(cookieClaims)
          ? store.users[cookieClaims.email]
          : undefined;
        if (cookieClaims && cookieAccount) {
          cookieBound = { ...cookieClaims, role: cookieAccount.role || 'STUDENT' };
          wsSessions.set(ws, cookieBound);
        }
      }

      ws.send(JSON.stringify({ type: 'WS_CONNECTED', payload: { clientCount: wsClients.size } }));
      if (cookieBound) {
        ws.send(JSON.stringify({ type: 'AUTH_OK', payload: { email: cookieBound.email, role: cookieBound.role, via: 'cookie' } }));
      }

      ws.on('message', (messageRaw) => {
        try {
          const { type, payload } = JSON.parse(messageRaw.toString());
          if (!type) return;

          const session = sessionOf(ws);

          /*
            Chặn spam qua kênh WS bằng ĐÚNG bộ limiter và đúng khoá IP như bản HTTP.

            Trước đây năm đường ghi qua WS không có limiter nào, nên chỉ cần chuyển
            từ HTTP sang WS là vượt mọi giới hạn: HTTP /api/chat chặn ở lượt 121, còn
            WS NEW_CHAT_MESSAGE cho lưu cả 200 lượt.

            Khoá theo IP (không theo phiên) để khớp hành vi HTTP; chưa AUTH thì vẫn
            tính vào ô của IP đó, không có đường lách bằng cách không đăng nhập.
          */
          const WS_WRITE_ACTIONS = [
            'NEW_CHAT_MESSAGE',
            'NEW_QUESTION',
            'NEW_SOLUTION',
            'NEW_CLUB',
            'NEW_CLUB_POST',
          ];
          if (WS_WRITE_ACTIONS.includes(type)) {
            const wsIp = wsClientIps.get(ws) || 'ws-unknown';
            const key =
              type === 'NEW_CHAT_MESSAGE' ? `chat:${wsIp}`
              : type === 'NEW_QUESTION' ? `question:${wsIp}`
              : type === 'NEW_SOLUTION' ? `solution:${wsIp}`
              : type === 'NEW_CLUB' ? `club:${wsIp}`
              : `clubpost:${wsIp}`;
            const throttle = writeLimiter.check(key);
            if (!throttle.allowed) {
              ws.send(JSON.stringify({
                type: 'RATE_LIMITED',
                payload: { action: type, retryAfterMs: throttle.retryAfterMs },
              }));
              /* `return` chứ không phải `break`: đoạn này nằm trong thân hàm xử lý
                 message, TRƯỚC switch, nên break sẽ nhảy sai phạm vi. */
              return;
            }

            /*
              QUẢN LÝ NGƯỜI DÙNG trên đường WS — cùng một helper checkCanPost như
              HTTP, đặt ngay trước switch nên MỘT chỗ phủ cả năm hành động ghi.

              Đây đúng là lớp lỗi đã gặp hai lần (defect 34 và 37): một đột biến có
              hai transport, vá HTTP thì WS vẫn hở. Người bị cấm chỉ cần chuyển sang
              WebSocket là đăng tiếp được nếu thiếu đoạn này.

              Ưu tiên danh tính từ phiên đã AUTH (không giả mạo được); chưa AUTH thì
              xét authorEmail trong payload để khách không lách bằng cách không đăng
              nhập — khớp cách HTTP đối xử với tác giả.
            */
            const wsSessionEmail = sessionOf(ws)?.email || null;
            const claimedWsEmail = String((payload as any)?.authorEmail || '').trim().toLowerCase();

            /* Chat có chế độ khách, nhưng không cho khách mạo danh một tài khoản có
               thật; phiên đã đăng nhập cũng không được khai email người khác. */
            if (type === 'NEW_CHAT_MESSAGE') {
              if (wsSessionEmail && claimedWsEmail && claimedWsEmail !== wsSessionEmail) {
                ws.send(JSON.stringify({
                  type: 'FORBIDDEN',
                  payload: { action: type, reason: 'Email người gửi không khớp với phiên đăng nhập.' },
                }));
                return;
              }
              if (!wsSessionEmail && claimedWsEmail && store.users[claimedWsEmail]) {
                ws.send(JSON.stringify({
                  type: 'FORBIDDEN',
                  payload: { action: type, reason: 'Vui lòng xác thực tài khoản trước khi gửi tin.' },
                }));
                return;
              }
            }

            /* Chỉ phiên đã AUTH mới là danh tính có thể áp chế; payload không được
               dùng để tự nhận mình là một tài khoản khác. */
            const wsGate = checkCanPost(
              wsSessionEmail,
              type === 'NEW_CHAT_MESSAGE' ? 'chat' : 'content',
            );
            if (!wsGate.ok) {
              ws.send(JSON.stringify({
                type: 'FORBIDDEN',
                payload: { action: type, reason: wsGate.message },
              }));
              return;
            }
          }

          switch (type) {
            case 'PING': {
              ws.send(JSON.stringify({ type: 'PONG' }));
              break;
            }
            case 'AUTH': {
              /* Gắn danh tính cho kết nối này. Không có bước này thì mọi thao tác
                 nhạy cảm bên dưới đều bị từ chối. */
              const token = typeof payload === 'string' ? payload : payload?.token;
              const verified = verifySessionToken(token);
              const claims = verified && !isSessionRevoked(verified) ? verified : null;
              /* Không tin `role` trong token một cách mù quáng: đối chiếu bản ghi
                 thật trên server để token cũ không giữ được quyền đã bị thu hồi. */
              const account = claims ? store.users[claims.email] : undefined;
              if (!claims || !account) {
                wsSessions.delete(ws);
                ws.send(JSON.stringify({ type: 'AUTH_ERROR', payload: { message: 'Phiên đăng nhập không hợp lệ.' } }));
                break;
              }
              const bound: SessionClaims = { ...claims, role: account.role || 'STUDENT' };
              wsSessions.set(ws, bound);
              ws.send(JSON.stringify({ type: 'AUTH_OK', payload: { email: bound.email, role: bound.role } }));
              break;
            }
            case 'NEW_CHAT_MESSAGE': {
              if (payload && payload.content) {
                if (!store.chatMessages.some(m => m.id === payload.id)) {
                  /* Cùng một luật như đường HTTP: cắt nội dung và giữ trần kho. */
                  const relayed = {
                    ...payload,
                    content: String(payload.content).slice(0, MAX_CHAT_CONTENT),
                  };
                  store.chatMessages = capTail([...store.chatMessages, relayed], MAX_CHAT_MESSAGES);
                  recordAnalyticsActivity(getAnalyticsStore(), 'messages', String(relayed.authorEmail || session?.email || '') || undefined);
                  persistStoreToDisk();
                  broadcastServerEvent('NEW_CHAT_MESSAGE', relayed);
                  break;
                }
                /*
                  Tin đã có trong kho (client gửi lại, hoặc hai kênh cùng đưa về).
                  Bản cũ phát ngược NGUYÊN payload client cho mọi người: chỉ cần lấy
                  một id có sẵn kèm nội dung tuỳ ý là đẩy được một tin MA lên màn
                  hình tất cả client mà tin đó không hề nằm trong store — reload là
                  biến mất, và không bị giới hạn độ dài hay lọc gì cả.
                  Nay phát lại đúng bản đã lưu.
                */
                const existing = store.chatMessages.find(m => m.id === payload.id);
                if (existing) broadcastServerEvent('NEW_CHAT_MESSAGE', existing);
              }
              break;
            }
            case 'PRESENCE_PING': {
              /* Cùng một bộ lọc như đường HTTP; `session` là phiên đã xác thực
                 qua thông điệp AUTH nên email/role không thể khai man. */
              const cleaned = sanitizePresence(payload, session);
              if (cleaned) broadcastServerEvent('PRESENCE_PING', cleaned);
              break;
            }
            case 'NEW_QUESTION': {
              /*
                LỖ HỔNG NẶNG ĐÃ VÁ. Trước đây nhánh này ghi NGUYÊN payload vào kho,
                không đòi phiên đăng nhập và không kiểm số dư. Chuỗi khai thác:
                  AUTH → NEW_QUESTION{bountyCoin:999999, authorEmail:mình}
                       → NEW_SOLUTION{authorEmail:mình}
                       → MARK_BEST_SOLUTION
                vì thưởng = bounty*0.5 + 100, một tài khoản mới (100 coin) tự bơm
                và tự chọn đáp án để nhận 500.199 coin. Đã xác nhận bằng repro.

                Nay áp đúng luật kinh tế của đường HTTP: phải đăng nhập, danh tính
                lấy từ phiên, và coin treo thưởng bị kiểm số dư + trừ thật.
              */
              const askerEmail = session?.email || '';
              const asker = askerEmail ? store.users[askerEmail] : undefined;
              if (!session || !asker) {
                ws.send(JSON.stringify({ type: 'FORBIDDEN', payload: { action: type } }));
                break;
              }
              const requestedQuestionId = typeof payload?.id === 'string' ? payload.id.trim().slice(0, 80) : '';
              if (!requestedQuestionId || !String(payload.title || '').trim() || !String(payload.content || '').trim()) break;
              /* Chuẩn hoá trước khi tra cứu; ID dài bị cắt không được nhân bản. */
              if (store.questions.some(q => q.id === requestedQuestionId)) break;

              const requestedBounty = normalizeBounty(payload.bountyCoin);
              const balance = asker.coin ?? 100;
              if (balance < requestedBounty) {
                ws.send(JSON.stringify({
                  type: 'FORBIDDEN',
                  payload: { action: type, reason: 'Số dư không đủ để treo thưởng.' },
                }));
                break;
              }

              const relayedQuestion = {
                id: requestedQuestionId,
                title: String(payload.title).trim().slice(0, 200),
                subject: String(payload.subject || 'toan').slice(0, 40),
                content: String(payload.content).trim().slice(0, 20000),
                authorId: String(asker.id).slice(0, MAX_NAME_LENGTH),
                /* Cùng ngoại lệ ẩn danh như đường HTTP. */
                authorName: String(
                  payload.isAnonymous
                    ? (payload.anonymousAlias || payload.authorName || 'Pháp sư Ghibli')
                    : asker.name
                ).slice(0, MAX_NAME_LENGTH),
                authorEmail: asker.email,
                authorLevel: asker.level ?? 1,
                authorAvatar: payload.isAnonymous
                  ? safeAnonymousMask(payload.anonymousMask, String(payload.id || asker.id))
                  : String(asker.avatar || DEFAULT_AVATAR).slice(0, 4000),
                isAnonymous: Boolean(payload.isAnonymous),
                createdAt: 'Vừa xong',
                createdAtMs: Date.now(),
                isSolved: false,
                views: 1,
                bountyCoin: requestedBounty,
                bountyRewardClaimed: false,
                solutionRewardedEmails: [],
                imageUrl: typeof payload.imageUrl === 'string' ? payload.imageUrl.slice(0, 2000) : undefined,
              };

              /* Cùng sổ cái với HTTP: trừ bounty rồi phát thưởng do server tính. */
              asker.coin = Math.max(0, balance - requestedBounty);
              grantCoinsAndExperience(asker, 50);
              broadcastServerEvent('SYNC_USER', asker);

              store.questions.unshift(relayedQuestion);
              recordAnalyticsActivity(getAnalyticsStore(), 'questions', asker.email);
              persistStoreToDisk();
              broadcastServerEvent('NEW_QUESTION', relayedQuestion);
              break;
            }
            case 'NEW_SOLUTION': {
              /* Cùng lý do như trên: phải đăng nhập và danh tính lấy từ phiên. */
              const solverEmail = session?.email || '';
              const solver = solverEmail ? store.users[solverEmail] : undefined;
              if (!session || !solver) {
                ws.send(JSON.stringify({ type: 'FORBIDDEN', payload: { action: type } }));
                break;
              }
              const targetQId = String(payload?.questionId || '').trim().slice(0, 80);
              const requestedSolutionId = typeof payload?.id === 'string' ? payload.id.trim().slice(0, 80) : '';
              if (!requestedSolutionId || !targetQId || !String(payload.content || '').trim()) break;
              /* Câu hỏi phải tồn tại, giống đường HTTP. */
              const targetQuestion = store.questions.find(q => q.id === targetQId);
              if (!targetQuestion) break;
              if (store.solutions.some(s => s.id === requestedSolutionId)) break;

              const relayedSolution = {
                id: requestedSolutionId,
                questionId: targetQId.slice(0, 80),
                authorId: String(solver.id).slice(0, MAX_NAME_LENGTH),
                authorName: String(solver.name).slice(0, MAX_NAME_LENGTH),
                authorEmail: solver.email,
                authorLevel: solver.level ?? 1,
                authorAvatar: String(solver.avatar || DEFAULT_AVATAR).slice(0, 2000),
                content: String(payload.content).trim().slice(0, 20000),
                createdAt: 'Vừa xong',
                createdAtMs: Date.now(),
                isBest: false,
                upvotes: 1,
                bestSelectionBonusGranted: false,
                imageUrl: typeof payload.imageUrl === 'string' ? payload.imageUrl.slice(0, 2000) : undefined,
              };
              const rewardedEmails: string[] = Array.isArray(targetQuestion.solutionRewardedEmails)
                ? targetQuestion.solutionRewardedEmails
                : [];
              if (!rewardedEmails.includes(solver.email)) {
                targetQuestion.solutionRewardedEmails = [...rewardedEmails, solver.email].slice(-1000);
                grantCoinsAndExperience(solver, 25);
                broadcastServerEvent('SYNC_USER', solver);
              }
              store.solutions.push(relayedSolution);
              recordAnalyticsActivity(getAnalyticsStore(), 'answers', solver.email);
              persistStoreToDisk();
              broadcastServerEvent('NEW_SOLUTION', relayedSolution);
              break;
            }
            case 'MARK_BEST_SOLUTION': {
              const { questionId, solutionId } = payload || {};
              if (!questionId || !solutionId) break;

              /* Phải đăng nhập, và phải là tác giả câu hỏi (hoặc Super Admin).
                 Đường HTTP đã kiểm tra điều này từ trước; đường WS thì chưa. */
              const targetQuestion = store.questions.find(q => q.id === questionId);
              if (!targetQuestion) break;
              const isOwner = Boolean(session && targetQuestion.authorEmail &&
                String(targetQuestion.authorEmail).toLowerCase() === session.email);
              if (!session || (!isOwner && !isWsSuperAdmin(ws))) {
                ws.send(JSON.stringify({ type: 'FORBIDDEN', payload: { action: type } }));
                break;
              }
              const targetSolution = store.solutions.find(s => s.id === solutionId);
              if (!targetSolution || targetSolution.questionId !== questionId) break;
              /* Cùng luật như đường HTTP: không tự chấm câu trả lời của chính mình. */
              const wsSolutionAuthor = String(targetSolution.authorEmail || '').toLowerCase();
              if (wsSolutionAuthor && wsSolutionAuthor === session.email) {
                ws.send(JSON.stringify({
                  type: 'FORBIDDEN',
                  payload: { action: type, reason: 'Không thể chọn câu trả lời của chính bạn.' },
                }));
                break;
              }

              /* Idempotent: chọn lại đúng đáp án cũ không được cộng thưởng lần nữa. */
              if (targetQuestion.bestSolutionId === solutionId) break;

              const previousBestId = targetQuestion.bestSolutionId;
              const rewardAlreadyClaimed = targetQuestion.bountyRewardClaimed === true;
              store.questions = store.questions.map(q =>
                q.id === questionId
                  ? { ...q, isSolved: true, bestSolutionId: solutionId, bountyRewardClaimed: true }
                  : q
              );
              store.solutions = store.solutions.map(s => {
                if (s.id === solutionId) {
                  const upvotes = Number.isFinite(s.upvotes) ? s.upvotes : 0;
                  const bonusAlreadyClaimed = s.bestSelectionBonusGranted === true;
                  return {
                    ...s,
                    isBest: true,
                    upvotes: bonusAlreadyClaimed ? upvotes : upvotes + 5,
                    bestSelectionBonusGranted: true,
                  };
                }
                if (s.id === previousBestId) return { ...s, isBest: false };
                return s;
              });

              const solverEmail = String(targetSolution.authorEmail || '').toLowerCase();
              const solver = solverEmail ? store.users[solverEmail] : undefined;
              if (solver && !rewardAlreadyClaimed) {
                const award = solverAwardFor(targetQuestion.bountyCoin ?? 20);
                grantCoinsAndExperience(solver, award);
                broadcastServerEvent('SYNC_USER', solver);
              }
              persistStoreToDisk();
              /* Phát đúng hai trường client dùng, không phát ngược payload thô —
                 khớp với bản HTTP của cùng thao tác này. */
              broadcastServerEvent('MARK_BEST_SOLUTION', {
                questionId: targetQuestion.id,
                solutionId: targetSolution.id,
              });
              break;
            }
            case 'NEW_CLUB': {
              /*
                Trước đây nhánh này ghi nguyên payload, không đòi phiên đăng nhập.
                Một client chưa xác thực chèn được CLB có sẵn status:'APPROVED'
                kèm followerCount/membersCount/leaderName tự đặt — vòng qua toàn bộ
                quy trình duyệt. Đã xác nhận bằng repro.
              */
              const clubFounderEmail = session?.email || '';
              const clubFounder = clubFounderEmail ? store.users[clubFounderEmail] : undefined;
              if (!session || !clubFounder) {
                ws.send(JSON.stringify({ type: 'FORBIDDEN', payload: { action: type } }));
                break;
              }
              if (!payload || !payload.id || !String(payload.name || '').trim()) break;
              if (store.clubs.some(c => c.id === payload.id)) break;

              const relayedClub = {
                id: String(payload.id).slice(0, 80),
                name: String(payload.name).trim().slice(0, 120),
                slogan: String(payload.slogan || '').slice(0, 200),
                coverImage: String(payload.coverImage || '').slice(0, 2000),
                category: String(payload.category || 'Công nghệ').slice(0, 60),
                foundingMembers: Array.isArray(payload.foundingMembers)
                  ? payload.foundingMembers.slice(0, 20).map((m: unknown) => String(m).slice(0, MAX_NAME_LENGTH))
                  : [],
                purpose: String(payload.purpose || '').slice(0, 2000),
                leaderId: clubFounder.id,
                leaderName: clubFounder.name,
                followerCount: 1,
                membersCount: Math.max(1, Array.isArray(payload.foundingMembers) ? payload.foundingMembers.length : 0),
                /* Hồ sơ mới luôn chờ duyệt — không tự phong trạng thái được. */
                status: 'PENDING',
                createdAt: new Date().toISOString().split('T')[0],
              };

              store.clubs = [relayedClub, ...store.clubs].slice(0, MAX_CLUBS);
              recordAnalyticsActivity(getAnalyticsStore(), 'clubsCreated', clubFounder.email);
              persistStoreToDisk();
              broadcastServerEvent('NEW_CLUB', relayedClub);
              break;
            }
            case 'APPROVE_CLUB': {
              if (!isWsSuperAdmin(ws)) {
                ws.send(JSON.stringify({ type: 'FORBIDDEN', payload: { action: type } }));
                break;
              }
              /*
                Nhận cả hai dạng payload. Client gửi APPROVE_CLUB với payload là
                CHÍNH CHUỖI mã CLB, còn REJECT_CLUB (cùng là thao tác của admin lên
                một CLB) lại gửi `{ clubId, reason }`. Hai thao tác cùng loại mà hai
                kiểu khác nhau rất dễ踩: gửi nhầm `{ clubId }` thì `find` không thấy
                gì và handler im lặng bỏ qua, không báo lỗi — người duyệt bấm mà
                không có chuyện gì xảy ra.
              */
              const clubId = typeof payload === 'string' ? payload : String(payload?.clubId || '');
              if (!clubId) {
                ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Thiếu mã câu lạc bộ!' } }));
                break;
              }
              /* Cùng chốt idempotent như đường HTTP. */
              const pendingClub = store.clubs.find(c => c.id === clubId);
              if (!pendingClub) {
                ws.send(JSON.stringify({ type: 'NOT_FOUND', payload: { action: type } }));
                break;
              }
              if (pendingClub.status === 'APPROVED') {
                ws.send(JSON.stringify({ type: 'APPROVE_CLUB', payload: clubId }));
                break;
              }
              const creator = Object.values(store.users).find(u => u.id === pendingClub.leaderId);
              const reward = creator && pendingClub.founderRewardGranted !== true ? 250 : 0;
              const founderRewardGranted = pendingClub.founderRewardGranted === true || reward > 0;
              store.clubs = store.clubs.map(c => c.id === clubId
                ? { ...c, status: 'APPROVED', founderRewardGranted }
                : c);
              if (creator) {
                creator.role = creator.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'CLUB_LEADER';
                creator.scopedClubIds = Array.from(new Set([...(creator.scopedClubIds || []), clubId]));
                if (reward > 0) grantExperience(creator, reward);
                broadcastServerEvent('SYNC_USER', creator);
              }
              persistStoreToDisk();
              broadcastServerEvent('APPROVE_CLUB', clubId);
              break;
            }
            case 'REJECT_CLUB': {
              if (!isWsSuperAdmin(ws)) {
                ws.send(JSON.stringify({ type: 'FORBIDDEN', payload: { action: type } }));
                break;
              }
              /*
                Bản HTTP của cùng thao tác này validate đầy đủ (thiếu mã -> 400,
                CLB không tồn tại -> 404, lý do cắt 500 ký tự). Nhánh WS thì
                không làm gì cả:

                  store.clubs = store.clubs.map(c =>
                    c.id === clubId ? { ...c, status:'REJECTED', rejectReason: reason } : c);
                  broadcastServerEvent('REJECT_CLUB', payload);

                nên (1) `reason` thô của client được ghi thẳng vào store và xuống
                đĩa không giới hạn độ dài, (2) phát ngược nguyên payload client cho
                MỌI client thay vì bản đã làm sạch, (3) từ chối một mã không tồn
                tại vẫn báo thành công và vẫn phát sóng, khiến các client khác hiện
                trạng thái REJECTED cho một CLB không có thật.
              */
              const clubId = String(payload?.clubId || '').trim();
              if (!clubId) {
                ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Thiếu mã câu lạc bộ!' } }));
                break;
              }
              const target = store.clubs.find(c => c.id === clubId);
              if (!target) {
                ws.send(JSON.stringify({ type: 'NOT_FOUND', payload: { action: type } }));
                break;
              }
              const reason = String(payload?.reason || '').trim().slice(0, 500);
              const wasApproved = target.status === 'APPROVED';
              store.clubs = store.clubs.map(c =>
                c.id === clubId ? { ...c, status: 'REJECTED', rejectReason: reason } : c
              );
              /*
                Từ chối một CLB ĐÃ DUYỆT thì phải rút lại quyền đã trao. Nếu không,
                chủ nhiệm vẫn giữ role CLUB_LEADER và vẫn còn mã CLB trong
                scopedClubIds — tức còn quyền quản trị phạm vi một CLB đã bị loại.
              */
              if (wasApproved && target.leaderId) {
                const leader = Object.values(store.users).find(u => u.id === target.leaderId);
                if (leader) {
                  leader.scopedClubIds = [...(leader.scopedClubIds || [])].filter(id => id !== clubId);
                  if (leader.role === 'CLUB_LEADER' && leader.scopedClubIds.length === 0) {
                    leader.role = 'STUDENT';
                  }
                  broadcastServerEvent('SYNC_USER', leader);
                }
              }
              persistStoreToDisk();
              /* Phát bản đã làm sạch, không phát ngược payload client. */
              broadcastServerEvent('REJECT_CLUB', { clubId, reason });
              break;
            }
            case 'NEW_CLUB_POST': {
              /* Cùng lý do: phải đăng nhập, tác giả lấy từ phiên, CLB phải tồn tại. */
              const posterEmail = session?.email || '';
              const poster = posterEmail ? store.users[posterEmail] : undefined;
              if (!session || !poster) {
                ws.send(JSON.stringify({ type: 'FORBIDDEN', payload: { action: type } }));
                break;
              }
              const postClubId = String(payload?.clubId || '').trim();
              if (!payload || !payload.id || !postClubId ||
                  !String(payload.title || '').trim() || !String(payload.content || '').trim()) break;
              if (!store.clubs.some(c => c.id === postClubId)) break;
              if (store.clubPosts.some(p => p.id === payload.id)) break;

              const relayedPost = {
                id: String(payload.id).slice(0, 80),
                clubId: postClubId.slice(0, 80),
                authorId: poster.id,
                authorName: poster.name,
                authorAvatar: poster.avatar || DEFAULT_AVATAR,
                title: String(payload.title).trim().slice(0, 200),
                content: String(payload.content).trim().slice(0, 5000),
                createdAt: new Date().toISOString(),
                likes: 0,
              };
              store.clubPosts = [relayedPost, ...store.clubPosts].slice(0, MAX_CLUB_POSTS);
              recordAnalyticsActivity(getAnalyticsStore(), 'clubPosts', poster.email);
              persistStoreToDisk();
              broadcastServerEvent('NEW_CLUB_POST', relayedPost);
              break;
            }
            case 'SYNC_USER': {
              /* Chỉ chủ tài khoản mới được sửa hồ sơ của chính mình. Các trường
                 quyền (role/staffRole), Premium và phạm vi CLB luôn do server cấp. */
              const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : '';
              if (!session || !email || session.email !== email) {
                ws.send(JSON.stringify({ type: 'FORBIDDEN', payload: { action: type } }));
                break;
              }
              if (!store.users[email]) break;
              const patch = sanitizeUserUpdate(payload);
              const merged = { ...store.users[email], ...patch };
              merged.level = calculateLevelFromXP(merged.xp ?? 0);
              store.users[email] = merged;
              persistStoreToDisk();
              broadcastServerEvent('SYNC_USER', merged);
              break;
            }
            case 'DELETE_QUESTION': {
              const { questionId } = payload || {};
              if (!questionId) break;
              const owned = store.questions.find(q => q.id === questionId);
              const mayDelete = isWsSuperAdmin(ws) ||
                Boolean(session && owned && owned.authorEmail &&
                  String(owned.authorEmail).toLowerCase() === session.email);
              if (!mayDelete) {
                ws.send(JSON.stringify({ type: 'FORBIDDEN', payload: { action: type } }));
                break;
              }
              store.questions = store.questions.filter(q => q.id !== questionId);
              store.solutions = store.solutions.filter(s => s.questionId !== questionId);
              persistStoreToDisk();
              broadcastServerEvent('DELETE_QUESTION', { questionId });
              break;
            }
            case 'EDIT_QUESTION': {
              const { questionId, updates } = payload || {};
              if (!questionId || !updates) break;
              if (!isWsSuperAdmin(ws)) {
                ws.send(JSON.stringify({ type: 'FORBIDDEN', payload: { action: type } }));
                break;
              }
              /* Cùng một bộ lọc như đường HTTP: không ghi đè được authorEmail
                 hay bountyCoin qua cửa sửa bài. */
              const safeWsUpdates = sanitizeQuestionUpdates(updates);
              if (!safeWsUpdates) break;
              if (!store.questions.some(q => q.id === questionId)) break;
              store.questions = store.questions.map(q =>
                q.id === questionId ? { ...q, ...safeWsUpdates } : q
              );
              persistStoreToDisk();
              broadcastServerEvent('EDIT_QUESTION', { questionId, updates: safeWsUpdates });
              break;
            }
            case 'DELETE_SOLUTION': {
              const { solutionId } = payload || {};
              if (!solutionId) break;
              const ownedSolution = store.solutions.find(s => s.id === solutionId);
              const mayDeleteSolution = isWsSuperAdmin(ws) ||
                Boolean(session && ownedSolution && ownedSolution.authorEmail &&
                  String(ownedSolution.authorEmail).toLowerCase() === session.email);
              if (!mayDeleteSolution) {
                ws.send(JSON.stringify({ type: 'FORBIDDEN', payload: { action: type } }));
                break;
              }
              store.solutions = store.solutions.filter(s => s.id !== solutionId);
              store.questions = store.questions.map(q =>
                q.bestSolutionId === solutionId ? { ...q, isSolved: false, bestSolutionId: undefined } : q
              );
              persistStoreToDisk();
              broadcastServerEvent('DELETE_SOLUTION', { solutionId });
              break;
            }
            case 'DELETE_CHAT_MESSAGE': {
              const { messageId } = payload || {};
              if (!messageId) break;
              if (!isWsSuperAdmin(ws)) {
                ws.send(JSON.stringify({ type: 'FORBIDDEN', payload: { action: type } }));
                break;
              }
              store.chatMessages = store.chatMessages.filter(m => m.id !== messageId);
              persistStoreToDisk();
              broadcastServerEvent('DELETE_CHAT_MESSAGE', { messageId });
              break;
            }
            case 'SYNC_ABOUT': {
              if (!isWsSuperAdmin(ws)) {
                ws.send(JSON.stringify({ type: 'FORBIDDEN', payload: { action: type } }));
                break;
              }
              if (payload) {
                /* Gộp, không thay khối — payload thiếu không được xoá founder/milestones. */
                store.about = mergeAboutData(payload);
                persistStoreToDisk();
                broadcastServerEvent('SYNC_ABOUT', store.about);
              }
              break;
            }
          }
        } catch (err) {
          console.error('[Forum Server WS] Error handling message:', err);
        }
      });

      ws.on('close', () => {
        wsClients.delete(ws);
      });

      ws.on('error', () => {
        wsClients.delete(ws);
      });
    });

    const wsPingTimer = setInterval(() => {
      for (const client of wsClients) {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.ping();
          } catch {
            wsClients.delete(client);
          }
        }
      }
    }, 25000);
    wsPingTimer.unref();

    httpServer.on('close', () => {
      clearInterval(wsPingTimer);
      try {
        wss.close();
      } catch {
        /* ignore */
      }
    });
  }

  middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url || '';
    const method = req.method || 'GET';

    if (url.startsWith('/api/')) applyCorsHeaders(req, res);

    if (method === 'OPTIONS' && url.startsWith('/api/')) {
      res.statusCode = 204;
      res.end();
      return;
    }

    /* Epic 5 — ảnh đại diện/ảnh bìa đã xử lý bằng sharp (cache dài hạn, tên có hash). */
    if ((method === 'GET' || method === 'HEAD') && url.startsWith('/media/')) {
      if (handleMediaRequest(req, res)) return;
    }

    if (method === 'GET' && url.startsWith('/api/events')) {
      if (sseClients.size >= MAX_SSE_CLIENTS) {
        sendJson(res, 503, { success: false, message: 'Kênh sự kiện đang quá tải, vui lòng thử lại sau.' });
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientCount: sseClients.size + 1 })}\n\n`);
      sseClients.add(res);

      /* Trước đây interval nhịp tim KHÔNG bị dọn khi client ngắt → mỗi lần
         reload trang lại rò một timer vĩnh viễn. Giờ dọn ở cả hai ngả. */
      const heartbeat = setInterval(() => {
        if (res.writableEnded || res.destroyed) {
          clearInterval(heartbeat);
          sseClients.delete(res);
          return;
        }
        try {
          res.write(':keepalive\n\n');
        } catch {
          clearInterval(heartbeat);
          sseClients.delete(res);
        }
      }, 20000);
      heartbeat.unref?.();

      const cleanup = () => {
        clearInterval(heartbeat);
        sseClients.delete(res);
      };

      req.on('close', cleanup);
      req.on('error', cleanup);
      res.on('close', cleanup);

      return;
    }

    /**
     * Đo lượt mở, thời gian tab đang hiển thị và lượt chuyển phân khu.
     * Mã khách do trình duyệt tạo là ngẫu nhiên, được băm trước khi lưu; email
     * chỉ được gắn khi token hợp lệ. Không lưu IP hay dấu vân tay thiết bị.
     */
    if (method === 'POST' && url.split('?')[0] === '/api/analytics/track') {
      try {
        const body = await parseJsonBody(req);
        const throttle = analyticsLimiter.check(`analytics:${clientIpOf(req)}`);
        if (!throttle.allowed) {
          sendRateLimited(res, throttle.retryAfterMs, 'cập nhật thống kê');
          return;
        }
        const visitorId = String(body?.visitorId || '').trim();
        const sessionId = String(body?.sessionId || '').trim();
        const eventId = String(body?.eventId || '').trim();
        if (!/^[A-Za-z0-9_-]{20,100}$/.test(visitorId) ||
            !/^[A-Za-z0-9_-]{20,100}$/.test(sessionId) ||
            !/^[A-Za-z0-9_-]{20,100}$/.test(eventId)) {
          sendJson(res, 400, { success: false, message: 'Mã phiên thống kê không hợp lệ.' });
          return;
        }
        const claims = authorizeRequest(req, null, body?.token);
        const analyticsEmail = claims && store.users[claims.email] ? claims.email : undefined;
        const analytics = getAnalyticsStore();
        let result: { ok: boolean; duplicate: boolean };
        if (body.type === 'visit') {
          result = recordAnalyticsVisit(analytics, { visitorId, sessionId, eventId, email: analyticsEmail });
        } else if (body.type === 'heartbeat') {
          const activeSeconds = Number(body.activeSeconds);
          if (!Number.isFinite(activeSeconds) || activeSeconds < 0 || activeSeconds > 60) {
            sendJson(res, 400, { success: false, message: 'Thời lượng phiên không hợp lệ.' });
            return;
          }
          result = recordAnalyticsHeartbeat(analytics, {
            visitorId, sessionId, eventId, email: analyticsEmail, activeSeconds,
          });
        } else if (body.type === 'page_view') {
          const allowedViews = ['landing', 'home', 'clubs', 'qa', 'chat', 'memory', 'chronicles', 'coming-soon'];
          if (!allowedViews.includes(String(body.view || ''))) {
            sendJson(res, 400, { success: false, message: 'Phân khu thống kê không hợp lệ.' });
            return;
          }
          result = recordAnalyticsPageView(analytics, { visitorId, sessionId, eventId, email: analyticsEmail });
        } else {
          sendJson(res, 400, { success: false, message: 'Loại sự kiện thống kê không hợp lệ.' });
          return;
        }
        if (!result.ok) {
          sendJson(res, 409, { success: false, message: 'Mã phiên đã gắn với một trình duyệt khác.' });
          return;
        }
        persistStoreToDisk();
        sendJson(res, 200, { success: true, duplicate: result.duplicate });
      } catch (err: any) {
        handleApiError(res, err);
      }
      return;
    }

    /** Trạng thái máy chủ — dùng cho trang vận hành và cho test smoke. */
    if (method === 'GET' && url.startsWith('/api/health')) {
      sendJson(res, 200, {
        success: true,
        status: 'ok',
        uptimeSeconds: Math.round((Date.now() - startedAtMs) / 1000),
        counts: {
          users: Object.keys(store.users).length,
          clubs: store.clubs.length,
          clubPosts: store.clubPosts.length,
          questions: store.questions.length,
          solutions: store.solutions.length,
          chatMessages: store.chatMessages.length,
          feedbacks: store.feedbacks.length,
          reports: store.reports?.length ?? 0,
        },
        connections: {
          websocket: wsClients.size,
          sse: sseClients.size,
        },
      });
      return;
    }

    if (method === 'GET' && url.startsWith('/api/sync')) {
      sendJson(res, 200, {
        success: true,
        data: {
          users: store.users,
          clubs: store.clubs,
          clubPosts: store.clubPosts,
          questions: store.questions,
          solutions: store.solutions,
          chatMessages: store.chatMessages,
          feedbacks: store.feedbacks,
          about: store.about,
        },
      });
      return;
    }

    if (method === 'POST' && url === '/api/chat') {
      try {
        const body = await parseJsonBody(req);
        const content = String(body.content ?? '').trim();
        if (!content || !body.channelId) {
          sendJson(res, 400, { success: false, message: 'Nội dung tin nhắn không được để trống' });
          return;
        }
        if (content.length > MAX_CHAT_CONTENT) {
          sendJson(res, 400, {
            success: false,
            message: `Tin nhắn tối đa ${MAX_CHAT_CONTENT} ký tự.`,
          });
          return;
        }

        const throttle = writeLimiter.check(`chat:${clientIpOf(req)}`);
        if (!throttle.allowed) {
          sendRateLimited(res, throttle.retryAfterMs, 'gửi tin nhắn');
          return;
        }

        const claimedEmail = String(body.authorEmail || '').trim().toLowerCase();
        const claims = authorizeRequest(req, null, body.token);
        const authorEmail = claims?.email || '';

        /*
          Chat công khai vẫn cho khách gửi tin, nhưng không được mạo danh tài khoản
          đã đăng ký bằng cách tự gõ email vào payload. Tài khoản thật phải có Bearer
          token khớp; nếu không, ghi nhận là khách (email rỗng). Nếu bỏ bước này,
          người bị cấm chỉ cần đổi authorEmail sang người không bị cấm để lách.
        */
        if (claims && claimedEmail && claimedEmail !== claims.email) {
          sendJson(res, 403, { success: false, message: 'Email người gửi không khớp với phiên đăng nhập.' });
          return;
        }
        if (!claims && claimedEmail && store.users[claimedEmail]) {
          sendJson(res, 401, { success: false, message: 'Vui lòng đăng nhập để gửi tin bằng tài khoản này.' });
          return;
        }
        const knownAuthor = authorEmail ? store.users[authorEmail] : undefined;

        /* Quản lý người dùng: khoá gửi tin áp riêng cho chat, cấm thì chặn hết. */
        const chatGate = checkCanPost(authorEmail, 'chat');
        if (!chatGate.ok) {
          sendJson(res, chatGate.status, { success: false, message: chatGate.message });
          return;
        }

        const msg = {
          id: body.id || randomId('msg'),
          channelId: String(body.channelId).slice(0, 60),
          authorId: String(body.authorId || 'guest').slice(0, MAX_NAME_LENGTH),
          authorName: String(knownAuthor?.name || body.authorName || 'Học sinh').slice(0, MAX_NAME_LENGTH),
          authorEmail,
          authorAvatar: knownAuthor?.avatar ? String(knownAuthor.avatar).slice(0, 4000) : safeAvatarUrl(body.authorAvatar),
          /* Cấp bậc lấy từ bản ghi thật — client tự khai thì ai cũng tự phong cấp 150. */
          authorLevel: knownAuthor?.level ?? 1,
          content: content.slice(0, MAX_CHAT_CONTENT),
          senderId: String(body.senderId || '').slice(0, MAX_NAME_LENGTH),
          timestamp: body.timestamp || new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };

        if (!store.chatMessages.some(m => m.id === msg.id)) {
          store.chatMessages = capTail([...store.chatMessages, msg], MAX_CHAT_MESSAGES);
          recordAnalyticsActivity(getAnalyticsStore(), 'messages', authorEmail || undefined);
          persistStoreToDisk();
        }
        broadcastServerEvent('NEW_CHAT_MESSAGE', msg);
        sendJson(res, 200, { success: true, message: msg });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/presence') {
      try {
        const body = await parseJsonBody(req);
        if (!body || !body.user) {
          sendJson(res, 400, { success: false, message: 'Thiếu thông tin người dùng' });
          return;
        }

        const throttle = presenceLimiter.check(clientIpOf(req));
        if (!throttle.allowed) {
          sendRateLimited(res, throttle.retryAfterMs, 'cập nhật trạng thái trực tuyến');
          return;
        }

        const claims = authorizeRequest(req, null, body.token);
        const cleaned = sanitizePresence(body.user, claims);
        if (!cleaned) {
          sendJson(res, 400, { success: false, message: 'Thiếu mã định danh người dùng' });
          return;
        }
        broadcastServerEvent('PRESENCE_PING', cleaned);
        sendJson(res, 200, { success: true });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/questions') {
      try {
        const body = await parseJsonBody(req);

        const title = String(body.title || '').trim();
        const content = String(body.content || '').trim();
        if (!title || !content) {
          sendJson(res, 400, { success: false, message: 'Tiêu đề và nội dung câu hỏi không được để trống!' });
          return;
        }

        const authorEmail = String(body.authorEmail || '').trim().toLowerCase();
        const author = authorEmail ? store.users[authorEmail] : undefined;

        /* Treo thưởng là tiêu tiền thật → chỉ tài khoản đã đăng nhập và đủ số dư
           mới được đặt. Khách ẩn danh nhận bountyCoin = 0 thay vì thưởng miễn phí. */
        const wantedBounty = normalizeBounty(body.bountyCoin);
        let bountyCoin = author ? wantedBounty : 0;

        if (author) {
          const claims = authorizeRequest(req, authorEmail, body.token);
          if (!claims) {
            sendJson(res, 401, { success: false, message: 'Vui lòng đăng nhập lại để đặt câu hỏi!' });
            return;
          }
          /* Chỉ báo lý do áp chế sau khi chứng minh đây đúng là tài khoản đó. */
          const questionGate = checkCanPost(claims.email, 'content');
          if (!questionGate.ok) {
            sendJson(res, questionGate.status, { success: false, message: questionGate.message });
            return;
          }
        }

        const requestedId = typeof body.id === 'string' && body.id.trim()
          ? body.id.trim().slice(0, 80)
          : randomId('q');
        const duplicateQuestion = store.questions.find(q => q.id === requestedId);
        if (duplicateQuestion) {
          const existingOwner = String(duplicateQuestion.authorEmail || '').trim().toLowerCase();
          const requestedOwner = author?.email || '';
          if (existingOwner !== requestedOwner) {
            sendJson(res, 409, { success: false, message: 'Mã yêu cầu đã được dùng cho một nội dung khác.' });
            return;
          }
          sendJson(res, 200, {
            success: true,
            duplicate: true,
            reward: 0,
            question: duplicateQuestion,
            user: author,
            message: 'Câu hỏi này đã được tiếp nhận trước đó.',
          });
          return;
        }

        const balance = author?.coin ?? 100;
        if (author && balance < bountyCoin) {
          sendJson(res, 402, {
            success: false,
            message: `Số dư không đủ để treo thưởng ${bountyCoin} Coin. Hiện có ${balance} Coin.`,
          });
          return;
        }

        const throttle = writeLimiter.check(`question:${clientIpOf(req)}`);
        if (!throttle.allowed) {
          sendRateLimited(res, throttle.retryAfterMs, 'đặt câu hỏi');
          return;
        }

        const isAnonymousQuestion = Boolean(body.isAnonymous);

        const newQuestion = {
          id: requestedId,
          title: title.slice(0, 200),
          subject: String(body.subject || 'toan').slice(0, 40),
          content: content.slice(0, 20000),
          /* Đã đăng nhập thì danh tính hiển thị lấy từ bản ghi thật — không thì
             ai cũng đăng bài dưới tên và ảnh đại diện của người khác. Khách chưa
             đăng nhập vẫn dùng tên tự nhập.
             NGOẠI LỆ: câu hỏi ẩn danh. Diễn đàn cho phép hỏi mà không lộ tên, và
             giao diện render chính trường `authorName` làm bí danh ("Pháp sư
             Ghibli"), nên ở chế độ này phải giữ bí danh client gửi. Danh tính thật
             vẫn nằm ở `authorEmail`/`authorId` để kiểm quyền chọn đáp án chuẩn. */
          authorId: String(author?.id ?? '').slice(0, MAX_NAME_LENGTH),
          authorName: String(
            isAnonymousQuestion
              ? (body.anonymousAlias || body.authorName || 'Pháp sư Ghibli')
              : (author?.name ?? body.authorName ?? 'Học sinh')
          ).slice(0, MAX_NAME_LENGTH),
          /* Trước đây authorEmail bị bỏ rơi → server không biết câu hỏi của ai
             và không thể kiểm tra quyền "chọn đáp án chuẩn". */
          authorEmail: author?.email,
          authorLevel: author?.level ?? 1,
          authorAvatar: isAnonymousQuestion
            ? safeAnonymousMask(body.anonymousMask, String(body.id || body.title || Date.now()))
            : author?.avatar
              ? String(author.avatar).slice(0, 4000)
              : safeAvatarUrl(body.authorAvatar),
          isAnonymous: isAnonymousQuestion,
          anonymousAlias: typeof body.anonymousAlias === 'string' ? body.anonymousAlias.slice(0, 40) : undefined,
          anonymousMask: isAnonymousQuestion && typeof body.anonymousMask === 'string' && GHIBLI_MASK_SET.has(body.anonymousMask)
            ? body.anonymousMask
            : undefined,
          createdAt: 'Vừa xong',
          createdAtMs: Date.now(),
          isSolved: false,
          views: 1,
          bountyCoin,
          bountyRewardClaimed: false,
          solutionRewardedEmails: [],
          imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl.slice(0, 2000) : undefined,
        };

        store.questions.unshift(newQuestion);
        recordAnalyticsActivity(getAnalyticsStore(), 'questions', author?.email);

        if (author) {
          author.coin = Math.max(0, (author.coin ?? 100) - bountyCoin);
          grantCoinsAndExperience(author, 50);
          broadcastServerEvent('SYNC_USER', author);
        }

        persistStoreToDisk();
        broadcastServerEvent('NEW_QUESTION', newQuestion);
        sendJson(res, 200, { success: true, question: newQuestion, user: author, reward: author ? 50 : 0 });
      } catch (err: any) {
        handleApiError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/solutions') {
      try {
        const body = await parseJsonBody(req);

        const questionId = String(body.questionId || '').trim();
        const content = String(body.content || '').trim();
        if (!questionId || !content) {
          sendJson(res, 400, { success: false, message: 'Nội dung lời giải không được để trống!' });
          return;
        }
        /* Trả lời một câu hỏi không tồn tại chỉ làm rác kho dữ liệu. */
        const targetQuestion = store.questions.find(q => q.id === questionId);
        if (!targetQuestion) {
          sendJson(res, 404, { success: false, message: 'Câu hỏi này không còn tồn tại.' });
          return;
        }

        const authorEmail = String(body.authorEmail || '').trim().toLowerCase();
        const author = authorEmail ? store.users[authorEmail] : undefined;

        if (author) {
          const claims = authorizeRequest(req, authorEmail, body.token);
          if (!claims) {
            sendJson(res, 401, { success: false, message: 'Vui lòng đăng nhập lại để gửi lời giải!' });
            return;
          }
          /* Không cho người ngoài dò trạng thái/lý do áp chế bằng email mục tiêu. */
          const solutionGate = checkCanPost(claims.email, 'content');
          if (!solutionGate.ok) {
            sendJson(res, solutionGate.status, { success: false, message: solutionGate.message });
            return;
          }
        }

        const requestedSolutionId = typeof body.id === 'string' && body.id.trim()
          ? body.id.trim().slice(0, 80)
          : randomId('sol');
        const duplicateSolution = store.solutions.find(s => s.id === requestedSolutionId);
        if (duplicateSolution) {
          const existingOwner = String(duplicateSolution.authorEmail || '').trim().toLowerCase();
          const requestedOwner = author?.email || '';
          if (duplicateSolution.questionId !== questionId || existingOwner !== requestedOwner) {
            sendJson(res, 409, { success: false, message: 'Mã yêu cầu đã được dùng cho một nội dung khác.' });
            return;
          }
          sendJson(res, 200, {
            success: true,
            duplicate: true,
            reward: 0,
            solution: duplicateSolution,
            user: author,
            message: 'Lời giải này đã được tiếp nhận trước đó.',
          });
          return;
        }

        const throttle = writeLimiter.check(`solution:${clientIpOf(req)}`);
        if (!throttle.allowed) {
          sendRateLimited(res, throttle.retryAfterMs, 'gửi lời giải');
          return;
        }

        const newSolution = {
          id: requestedSolutionId,
          questionId,
          /* Danh tính lấy từ bản ghi thật khi đã đăng nhập, như ở câu hỏi. */
          authorId: String(author?.id ?? '').slice(0, MAX_NAME_LENGTH),
          authorName: String(author?.name ?? body.authorName ?? 'Học sinh').slice(0, MAX_NAME_LENGTH),
          authorEmail: author?.email,
          authorAvatar: author?.avatar ? String(author.avatar).slice(0, 4000) : safeAvatarUrl(body.authorAvatar),
          authorLevel: author?.level ?? 1,
          content: content.slice(0, 20000),
          createdAt: 'Vừa xong',
          createdAtMs: Date.now(),
          isBest: false,
          upvotes: 1,
          bestSelectionBonusGranted: false,
          imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl.slice(0, 2000) : undefined,
        };

        store.solutions.push(newSolution);
        recordAnalyticsActivity(getAnalyticsStore(), 'answers', author?.email);

        const rewardedEmails: string[] = Array.isArray(targetQuestion.solutionRewardedEmails)
          ? targetQuestion.solutionRewardedEmails
          : [];
        const reward = author && !rewardedEmails.includes(author.email) ? 25 : 0;
        if (author && reward > 0) {
          targetQuestion.solutionRewardedEmails = [...rewardedEmails, author.email].slice(-1000);
          grantCoinsAndExperience(author, reward);
          broadcastServerEvent('SYNC_USER', author);
        }

        persistStoreToDisk();
        broadcastServerEvent('NEW_SOLUTION', newSolution);
        sendJson(res, 200, { success: true, solution: newSolution, user: author, reward });
      } catch (err: any) {
        handleApiError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/solutions/best') {
      try {
        const body = await parseJsonBody(req);
        const { questionId, solutionId } = body;

        const targetQ = store.questions.find(q => q.id === questionId);
        if (!targetQ) {
          sendJson(res, 404, { success: false, message: 'Câu hỏi này không còn tồn tại.' });
          return;
        }

        /* CŨ: tin `currentUserId` / `currentUserEmail` trong body → ai biết id
           tác giả là giả được. MỚI: phải có token hợp lệ của chính tài khoản đó. */
        const claims = authorizeRequest(req, null, body.token);
        const questionOwnerEmail = String((targetQ as any).authorEmail || '').toLowerCase();
        const isAuthor = Boolean(claims && questionOwnerEmail && claims.email === questionOwnerEmail);
        const isSuperAdmin = Boolean(claims && isMasterAdminEmail(claims.email));

        if (!claims || (!isSuperAdmin && !isAuthor)) {
          sendJson(res, 403, {
            success: false,
            message: 'Chỉ tác giả câu hỏi hoặc Super Admin mới có quyền xác nhận đáp án chuẩn!',
          });
          return;
        }

        const targetSolution = store.solutions.find(s => s.id === solutionId);
        if (!targetSolution || targetSolution.questionId !== questionId) {
          sendJson(res, 404, { success: false, message: 'Lời giải không thuộc câu hỏi này.' });
          return;
        }
        /*
          Không cho tự chọn câu trả lời của CHÍNH MÌNH làm đáp án chuẩn.

          Thưởng = bounty*0.5 + 100, mà người hỏi đã được trừ bounty khi đặt câu.
          Nếu tự hỏi rồi tự trả lời rồi tự chọn, mỗi vòng bỏ túi +50 coin và
          +225 XP — lặp vô hạn, tự động hoá được. Đã xác nhận bằng repro:
            [1] vòng 1: coin = 150 | xp = 225
            [2] vòng 2: coin = 200 | xp = 450
            [3] vòng 3: coin = 250 | xp = 675
          Về mặt nghiệp vụ cũng vô nghĩa: không ai tự chấm mình là người giải đúng.
        */
        const solutionAuthorEmail = String((targetSolution as any).authorEmail || '').toLowerCase();
        if (solutionAuthorEmail && solutionAuthorEmail === claims.email) {
          sendJson(res, 409, {
            success: false,
            message: 'Không thể chọn câu trả lời của chính bạn làm đáp án chuẩn!',
          });
          return;
        }

        /* Chọn lại đúng đáp án cũ là no-op thật: không tăng upvote hay phát lại sự kiện. */
        const alreadyBest = (targetQ as any).bestSolutionId === solutionId;
        if (alreadyBest) {
          sendJson(res, 200, {
            success: true,
            duplicate: true,
            reward: 0,
            question: targetQ,
            solution: targetSolution,
          });
          return;
        }

        const rewardAlreadyClaimed = (targetQ as any).bountyRewardClaimed === true;
        store.questions = store.questions.map(q =>
          q.id === questionId
            ? { ...q, isSolved: true, bestSolutionId: solutionId, bountyRewardClaimed: true }
            : q
        );

        store.solutions = store.solutions.map(s => {
          if (s.questionId === questionId) {
            if (s.id === solutionId) {
              const upvotes = Number.isFinite(s.upvotes) ? s.upvotes : 0;
              const bonusAlreadyClaimed = s.bestSelectionBonusGranted === true;
              return {
                ...s,
                isBest: true,
                upvotes: bonusAlreadyClaimed ? upvotes : upvotes + 5,
                bestSelectionBonusGranted: true,
              };
            }
            return { ...s, isBest: false };
          }
          return s;
        });

        const sol = store.solutions.find(s => s.id === solutionId);
        let awardedUser: UserRecord | undefined;
        let awardedAmount = 0;
        if (sol?.authorEmail && store.users[sol.authorEmail.toLowerCase()]) {
          awardedUser = store.users[sol.authorEmail.toLowerCase()];
          if (!rewardAlreadyClaimed) {
            awardedAmount = solverAwardFor((targetQ as any).bountyCoin || 20);
            grantCoinsAndExperience(awardedUser, awardedAmount);
            broadcastServerEvent('SYNC_USER', awardedUser);
          }
        }

        persistStoreToDisk();
        broadcastServerEvent('MARK_BEST_SOLUTION', { questionId, solutionId });
        sendJson(res, 200, {
          success: true,
          reward: awardedAmount,
          user: awardedUser,
          question: store.questions.find((question) => question.id === questionId),
          solution: store.solutions.find((solution) => solution.id === solutionId),
        });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/auth/register') {
      try {
        const body = await parseJsonBody(req);
        const name = (body.name || '').trim();
        const email = (body.email || '').trim().toLowerCase();
        const password = (body.password || '').trim();

        if (!name) {
          sendJson(res, 400, { success: false, message: 'Vui lòng nhập họ và tên của bạn!' });
          return;
        }
        if (!name || name.length > 80) {
          sendJson(res, 400, { success: false, message: 'Họ tên tối đa 80 ký tự!' });
          return;
        }
        if (!EMAIL_PATTERN.test(email)) {
          sendJson(res, 400, { success: false, message: 'Vui lòng nhập địa chỉ email hợp lệ!' });
          return;
        }
        if (!password || password.length < 6) {
          sendJson(res, 400, { success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự!' });
          return;
        }
        /* Mật khẩu quá dài khiến scrypt tốn tài nguyên vô ích. */
        if (password.length > 200) {
          sendJson(res, 400, { success: false, message: 'Mật khẩu tối đa 200 ký tự!' });
          return;
        }

        if (email.endsWith(RETIRED_VIRTUAL_DOMAIN)) {
          sendJson(res, 400, { success: false, message: 'Miền email này không còn được hỗ trợ. Vui lòng dùng email thật!' });
          return;
        }

        const throttle = registerLimiter.check(`register:${clientIpOf(req)}`);
        if (!throttle.allowed) {
          sendRateLimited(res, throttle.retryAfterMs, 'đăng ký');
          return;
        }

        if (store.users[email]) {
          sendJson(res, 400, { success: false, message: 'Email này đã được đăng ký. Vui lòng đăng nhập!' });
          return;
        }

        const isSuperAdmin = isMasterAdminEmail(email);
        const newUser: UserRecord = isSuperAdmin
          ? {
              id: 'user-admin',
              name: name || 'Trần Văn Anh Tuấn',
              email: 'BroAmStuck@gmail.com',
              avatar: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_a455843c-d8db-461c-8ef6-74a325d2472c.png',
              role: 'SUPER_ADMIN',
              level: 150,
              xp: 45000,
              coin: 99999,
              fPoints: 45000,
              streakCount: 36,
              inventory: [],
              equippedBadge: '',
              bio: 'F-Forum Architect & Core Administrator. Xây dựng tương lai tri thức học đường.',
              gender: 'Nam',
              city: 'Hà Nội',
              className: 'K19 Software Engineering',
              scopedClubIds: [],
            }
          : {
              id: randomId('user'),
              name,
              email,
              avatar: DEFAULT_AVATAR,
              role: 'STUDENT',
              level: 1,
              xp: 0,
              coin: 100,
              fPoints: 0,
              streakCount: 0,
              bio: '',
              gender: 'Chưa cập nhật',
              city: 'Chưa cập nhật',
              className: 'Chưa cập nhật',
              joinedAt: new Date().toISOString(),
              scopedClubIds: [],
              inventory: [],
              equippedBadge: '',
            };

        store.users[email] = newUser;
        recordAnalyticsSignup(getAnalyticsStore(), email);
        /* Không bao giờ lưu mật khẩu thô — chỉ giữ bản băm scrypt. */
        store.passwords[email] = hashPassword(password);
        persistStoreToDisk();

        broadcastServerEvent('SYNC_USER', newUser);

        sendJson(res, 200, { success: true, user: newUser, ...issueSession(req, res, newUser) });
      } catch (err: any) {
        handleApiError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/auth/login') {
      try {
        const body = await parseJsonBody(req);
        const email = (body.email || '').trim().toLowerCase();
        const password = (body.password || '').trim();

        if (!email) {
          sendJson(res, 400, { success: false, message: 'Vui lòng nhập địa chỉ email!' });
          return;
        }

        const ip = clientIpOf(req);
        const throttle = loginLimiter.check(`login:${ip}:${email}`);
        if (!throttle.allowed) {
          sendRateLimited(res, throttle.retryAfterMs, 'đăng nhập');
          return;
        }
        /* Epic 5: đã sai quá nhiều lần từ IP này (mọi email) hoặc vào tài khoản này
           (mọi IP) → chặn trước khi tốn công chạy scrypt. */
        const failureKeys = { ip: `login-fail-ip:${ip}`, account: `login-fail-account:${email}` };
        const failureGate = [
          loginFailureIpLimiter.peek(failureKeys.ip),
          loginFailureAccountLimiter.peek(failureKeys.account),
        ].find((result) => !result.allowed);
        if (failureGate) {
          sendRateLimited(res, failureGate.retryAfterMs, 'đăng nhập sai');
          return;
        }
        const recordLoginFailure = () => {
          loginFailureIpLimiter.record(failureKeys.ip);
          loginFailureAccountLimiter.record(failureKeys.account);
        };

        const user = store.users[email];
        if (!user) {
          recordLoginFailure();
          sendJson(res, 400, {
            success: false,
            message: 'Tài khoản không tồn tại. Vui lòng đăng ký trước!',
          });
          return;
        }

        const registeredPassword = store.passwords[email];

        /* LỖ HỔNG CŨ: `if (registeredPassword && registeredPassword !== password)`
           — tài khoản tạo qua Google/Facebook không có bản ghi mật khẩu nên điều
           kiện bị bỏ qua và MỌI mật khẩu đều được chấp nhận (chiếm tài khoản).
           Giờ: không có mật khẩu = không đăng nhập được bằng form này. */
        if (!registeredPassword) {
          sendJson(res, 400, {
            success: false,
            message: 'Tài khoản này chưa có mật khẩu. Vui lòng dùng phương thức đăng nhập đã liên kết; Super Admin cần được bootstrap bằng cấu hình máy chủ.',
          });
          return;
        }

        const check = verifyPassword(password, registeredPassword);
        if (!check.ok) {
          recordLoginFailure();
          sendJson(res, 400, { success: false, message: 'Mật khẩu không chính xác. Vui lòng thử lại!' });
          return;
        }

        /* Mật khẩu plaintext cũ → băm lại ngay lần đăng nhập thành công này. */
        if (check.needsRehash) {
          store.passwords[email] = hashPassword(password);
          persistStoreToDisk();
        }

        loginLimiter.reset(`login:${ip}:${email}`);
        /* Chỉ xoá bộ đếm theo TÀI KHOẢN. Bộ đếm theo IP giữ nguyên: nếu không, kẻ rải
           mật khẩu chỉ cần đăng nhập đúng một tài khoản của chính mình để "rửa" IP. */
        loginFailureAccountLimiter.reset(failureKeys.account);
        sendJson(res, 200, { success: true, user, moderation: loginModerationStatus(email), ...issueSession(req, res, user) });
      } catch (err: any) {
        handleApiError(res, err);
      }
      return;
    }

    /**
     * Kiểm tra token đang giữ còn hiệu lực không.
     * Client khôi phục phiên từ localStorage nên cần một nơi hỏi lại server:
     * token hết hạn / tài khoản bị xoá / role bị thu hồi thì phải đăng xuất,
     * thay vì để giao diện tưởng đã đăng nhập trong khi mọi API đều trả 401.
     */
    /**
     * Epic 5 — nâng phiên Bearer cũ (token trong localStorage) lên cookie HttpOnly.
     * Chỉ chấp nhận Bearer hợp lệ; cookie mang ĐÚNG token đó (cùng hạn dùng).
     */
    if (method === 'POST' && url === '/api/auth/session/cookie') {
      const bearer = readBearerToken(req);
      const claims = bearer ? authorizeRequest(req, null, null) : null;
      const account = claims ? store.users[claims.email] : undefined;
      if (!claims || !account || !bearer) {
        sendJson(res, 401, { success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
        return;
      }
      const session = issueSession(req, res, account, bearer);
      sendJson(res, 200, {
        success: true,
        expiresAt: session.expiresAt,
        sessionTransport: session.sessionTransport,
      });
      return;
    }

    /**
     * Epic 5 — đăng xuất: xoá cookie HttpOnly (JavaScript không tự xoá được).
     * `everywhere: true` → thu hồi MỌI token đã phát cho tài khoản (mọi thiết bị).
     */
    if (method === 'POST' && url === '/api/auth/logout') {
      try {
        const body = await parseJsonBody(req).catch(() => ({}));
        const claims = authorizeRequest(req, null, null);
        let revoked = false;
        if (claims && body?.everywhere === true) {
          const account = store.users[claims.email];
          if (account) {
            store.sessionRevocations = { ...(store.sessionRevocations || {}), [claims.email]: Date.now() };
            persistStoreToDisk();
            revokeAccountSockets(claims.email);
            revoked = true;
          }
        }
        if (readSessionCookie(req) || requestIsHttps(req)) {
          res.setHeader('Set-Cookie', buildClearedSessionCookie());
        }
        sendJson(res, 200, { success: true, revoked });
      } catch (err: any) {
        handleApiError(res, err);
      }
      return;
    }

    if (method === 'GET' && url.startsWith('/api/auth/session')) {
      /* Epic 5: `?probe=1` — client dò phiên cookie khi đã mất gợi ý cục bộ; trả 200
         `authenticated: false` để khách vãng lai không thấy lỗi 401 mỗi lần tải trang. */
      const probe = /[?&]probe=1(?:&|$)/.test(url);
      const claims = authorizeRequest(req, null, null);
      if (!claims) {
        if (probe) {
          sendJson(res, 200, { success: false, authenticated: false });
          return;
        }
        sendJson(res, 401, { success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
        return;
      }
      const account = store.users[claims.email];
      if (!account) {
        if (probe) {
          sendJson(res, 200, { success: false, authenticated: false });
          return;
        }
        sendJson(res, 401, { success: false, message: 'Tài khoản này không còn tồn tại.' });
        return;
      }
      /* Role đọc từ bản ghi thật, không từ token — thu hồi quyền là có hiệu lực ngay. */
      sendJson(res, 200, {
        success: true,
        user: account,
        role: account.role,
        expiresAt: claims.exp,
        moderation: loginModerationStatus(claims.email),
      });
      return;
    }

    if (method === 'POST' && url === '/api/auth/social') {
      try {
        const body = await parseJsonBody(req);
        const provider: 'google' | 'facebook' = body.provider === 'facebook' ? 'facebook' : 'google';
        const name = (body.name || '').trim();
        const email = (body.email || '').trim().toLowerCase();
        /* Epic 5: ảnh từ nhà cung cấp OAuth vẫn phải là URL ảnh an toàn. */
        const avatar = sanitizeMediaUrl(String(body.avatar || ''), 2000) || '';
        const accessToken = typeof body.accessToken === 'string' ? body.accessToken : null;

        if (!EMAIL_PATTERN.test(email)) {
          sendJson(res, 400, { success: false, message: 'Địa chỉ email mạng xã hội không hợp lệ!' });
          return;
        }
        if (email.endsWith(RETIRED_VIRTUAL_DOMAIN)) {
          sendJson(res, 400, { success: false, message: 'Miền email này không còn được hỗ trợ!' });
          return;
        }

        const throttle = socialLimiter.check(`social:${clientIpOf(req)}:${email}`);
        if (!throttle.allowed) {
          sendRateLimited(res, throttle.retryAfterMs, 'đăng nhập mạng xã hội');
          return;
        }

        /* Email là do client tự khai → phải kiểm chứng với nhà cung cấp, và
           quyền SUPER_ADMIN thì KHÔNG BAO GIỜ được cấp từ một lời khai. */
        const decision = await decideSocialAccess({ provider, accessToken, claimedEmail: email });
        if (!decision.allowed) {
          console.warn(`[Forum Server] Chặn đăng nhập social ${email}: ${decision.message}`);
          sendJson(res, decision.status || 403, { success: false, message: decision.message });
          return;
        }

        let user = store.users[email];
        if (!user) {
          const isSuperAdmin = isMasterAdminEmail(email);
          user = isSuperAdmin
            ? {
                id: 'user-admin',
                name: name || 'Trần Văn Anh Tuấn',
                email: MASTER_ADMIN_EMAIL,
                avatar: avatar || 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_a455843c-d8db-461c-8ef6-74a325d2472c.png',
                role: 'SUPER_ADMIN',
                level: 150,
                xp: 45000,
                coin: 99999,
                fPoints: 45000,
                streakCount: 36,
                inventory: [],
                equippedBadge: '',
                bio: 'F-Forum Architect & Core Administrator. Xây dựng tương lai tri thức học đường.',
                gender: 'Nam',
                city: 'Hà Nội',
                className: 'K19 Software Engineering',
                scopedClubIds: [],
              }
            : {
                id: randomId('user'),
                name: name || (provider === 'google' ? 'Google User' : 'Facebook User'),
                email,
                avatar: avatar || DEFAULT_AVATAR,
                role: 'STUDENT',
                level: 1,
                xp: 0,
                coin: 100,
                fPoints: 0,
                streakCount: 0,
                bio: '',
                gender: 'Chưa cập nhật',
                city: 'Chưa cập nhật',
                className: 'Chưa cập nhật',
                joinedAt: new Date().toISOString(),
                scopedClubIds: [],
                inventory: [],
                equippedBadge: '',
              };

          store.users[email] = user;
          recordAnalyticsSignup(getAnalyticsStore(), email);
          persistStoreToDisk();
          broadcastServerEvent('SYNC_USER', user);
        } else {
          let updated = false;
          if (avatar && (user.avatar === DEFAULT_AVATAR || !user.avatar)) {
            user.avatar = avatar;
            updated = true;
          }
          if (name && (user.name === 'Google User' || user.name === 'Facebook User')) {
            user.name = name;
            updated = true;
          }
          if (updated) {
            persistStoreToDisk();
            broadcastServerEvent('SYNC_USER', user);
          }
        }

        sendJson(res, 200, { success: true, user, ...issueSession(req, res, user) });
      } catch (err: any) {
        handleApiError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/feedback') {
      try {
        const body = await parseJsonBody(req);
        const name = (body.name || '').trim();
        const email = (body.email || '').trim();
        const category = body.category || 'Góp ý khác';
        const content = (body.content || '').trim();

        if (!name || !email || !content) {
          sendJson(res, 400, { success: false, message: 'Vui lòng điền đầy đủ các trường thông tin!' });
          return;
        }

        if (content.length < 20) {
          sendJson(res, 400, {
            success: false,
            message: 'Nội dung góp ý cần tối thiểu 20 ký tự để Ban Quản Trị hiểu rõ ý kiến của bạn.',
          });
          return;
        }
        if (content.length > MAX_FEEDBACK_CONTENT) {
          sendJson(res, 400, { success: false, message: `Nội dung góp ý tối đa ${MAX_FEEDBACK_CONTENT} ký tự.` });
          return;
        }

        const fbThrottle = writeLimiter.check(`feedback:${clientIpOf(req)}`);
        if (!fbThrottle.allowed) {
          sendRateLimited(res, fbThrottle.retryAfterMs, 'gửi góp ý');
          return;
        }

        const submission = {
          id: randomId('fb'),
          name: name.slice(0, MAX_NAME_LENGTH),
          email: email.slice(0, 200),
          category: String(category).slice(0, 80),
          content: content.slice(0, MAX_FEEDBACK_CONTENT),
          createdAt: new Date().toISOString(),
        };

        store.feedbacks = capTail([...store.feedbacks, submission], MAX_FEEDBACKS);
        persistStoreToDisk();
        broadcastServerEvent('NEW_FEEDBACK', submission);
        sendJson(res, 200, {
          success: true,
          message: 'Cảm ơn bạn! Ý kiến đóng góp đã được chuyển tới Ban Quản Trị.',
        });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    /*
      ───────────────────────────────────────────────────────────────────────────
      CÂU LẠC BỘ
      Bốn thao tác này trước đây CHỈ gọi HTTP tới endpoint không tồn tại (404) và
      phát BroadcastChannel — tức là chỉ tới các tab CÙNG trình duyệt. Handler WS
      phía server có sẵn nhưng client không bao giờ gửi, nên hồ sơ CLB lập trên
      điện thoại sẽ biến mất trên mọi thiết bị khác. Nay đi qua HTTP có xác thực.
      ───────────────────────────────────────────────────────────────────────────
    */
    if (method === 'POST' && url === '/api/clubs') {
      try {
        const body = await parseJsonBody(req);
        const name = String(body.name || '').trim();
        const purpose = String(body.purpose || '').trim();
        if (!name) {
          sendJson(res, 400, { success: false, message: 'Tên câu lạc bộ không được để trống!' });
          return;
        }

        const throttle = writeLimiter.check(`club:${clientIpOf(req)}`);
        if (!throttle.allowed) {
          sendRateLimited(res, throttle.retryAfterMs, 'thành lập câu lạc bộ');
          return;
        }

        /* Người sáng lập lấy THUẦN từ token — `leaderEmail` trong body chỉ để
           tham khảo và bị bỏ qua, nên không ai mạo danh người khác được. */
        const claims = authorizeRequest(req, null, body.token);
        const founder = claims ? store.users[claims.email] : undefined;
        if (!founder) {
          sendJson(res, 401, { success: false, message: 'Vui lòng đăng nhập để thành lập câu lạc bộ!' });
          return;
        }

        /* Quản lý người dùng: tài khoản bị cấm không được lập CLB mới. */
        const clubGate = checkCanPost(founder.email, 'content');
        if (!clubGate.ok) {
          sendJson(res, clubGate.status, { success: false, message: clubGate.message });
          return;
        }

        const club = {
          id: typeof body.id === 'string' && body.id ? body.id.slice(0, 80) : randomId('club'),
          name: name.slice(0, 120),
          slogan: String(body.slogan || '').slice(0, 200),
          coverImage: String(body.coverImage || '').slice(0, 2000),
          category: String(body.category || 'Công nghệ').slice(0, 60),
          foundingMembers: Array.isArray(body.foundingMembers)
            ? body.foundingMembers.slice(0, 20).map((m: unknown) => String(m).slice(0, 120))
            : [],
          purpose: purpose.slice(0, 2000),
          leaderId: founder.id,
          leaderName: founder.name,
          followerCount: 1,
          membersCount: Math.max(1, Array.isArray(body.foundingMembers) ? body.foundingMembers.length : 0),
          /* Hồ sơ mới luôn ở trạng thái chờ — người dùng không tự duyệt cho mình. */
          status: 'PENDING',
          founderRewardGranted: false,
          createdAt: new Date().toISOString().split('T')[0],
        };

        const existingClub = store.clubs.find(c => c.id === club.id);
        if (existingClub) {
          sendJson(res, 200, {
            success: true,
            club: existingClub,
            duplicated: true,
            message: 'Hồ sơ thành lập này đã được tiếp nhận trước đó.',
          });
          return;
        }
        store.clubs = [club, ...store.clubs].slice(0, MAX_CLUBS);
        recordAnalyticsActivity(getAnalyticsStore(), 'clubsCreated', founder.email);
        persistStoreToDisk();
        broadcastServerEvent('NEW_CLUB', club);
        sendJson(res, 200, { success: true, club, message: 'Hồ sơ thành lập đã được gửi tới Ban Quản Trị.' });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err?.message || 'Không tạo được câu lạc bộ' });
      }
      return;
    }

    /** Duyệt hồ sơ CLB — chỉ Super Admin. Logic thăng cấp giữ nguyên như nhánh WS. */
    if (method === 'POST' && url === '/api/clubs/approve') {
      try {
        const body = await parseJsonBody(req);
        const clubId = String(body.clubId || '').trim();
        if (!clubId) {
          sendJson(res, 400, { success: false, message: 'Thiếu mã câu lạc bộ!' });
          return;
        }
        if (!requireSuperAdmin(req, body)) {
          sendJson(res, 403, { success: false, message: 'Chỉ Super Admin mới duyệt được câu lạc bộ!' });
          return;
        }

        const club = store.clubs.find(c => c.id === clubId);
        if (!club) {
          sendJson(res, 404, { success: false, message: 'Không tìm thấy câu lạc bộ này!' });
          return;
        }
        /* Idempotent: duyệt lại một CLB đã duyệt không được thăng cấp và cộng
           250 XP lần nữa. Không có chốt này thì bấm duyệt bao nhiêu lần cũng được. */
        const creator = Object.values(store.users).find(u => u.id === club.leaderId);
        if (club.status === 'APPROVED') {
          sendJson(res, 200, {
            success: true,
            club,
            user: creator,
            reward: 0,
            alreadyApproved: true,
            message: 'Câu lạc bộ này đã được duyệt trước đó.',
          });
          return;
        }

        /* Một CLB chỉ phát thưởng sáng lập đúng một lần, kể cả khi bị từ chối
           rồi được duyệt lại. Cờ này do server đặt và được lưu cùng CLB. */
        const reward = creator && club.founderRewardGranted !== true ? 250 : 0;
        const founderRewardGranted = club.founderRewardGranted === true || reward > 0;
        store.clubs = store.clubs.map(c => c.id === clubId
          ? { ...c, status: 'APPROVED', founderRewardGranted }
          : c);
        const approved = store.clubs.find(c => c.id === clubId);
        if (creator) {
          creator.role = creator.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'CLUB_LEADER';
          creator.scopedClubIds = Array.from(new Set([...(creator.scopedClubIds || []), clubId]));
          if (reward > 0) grantExperience(creator, reward);
          broadcastServerEvent('SYNC_USER', creator);
        }
        persistStoreToDisk();
        broadcastServerEvent('APPROVE_CLUB', clubId);
        sendJson(res, 200, {
          success: true,
          club: approved,
          user: creator,
          reward,
          message: 'Đã duyệt câu lạc bộ.',
        });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err?.message || 'Không duyệt được câu lạc bộ' });
      }
      return;
    }

    /** Từ chối hồ sơ CLB kèm lý do — chỉ Super Admin. */
    if (method === 'POST' && url === '/api/clubs/reject') {
      try {
        const body = await parseJsonBody(req);
        const clubId = String(body.clubId || '').trim();
        const reason = String(body.reason || '').trim();
        if (!clubId) {
          sendJson(res, 400, { success: false, message: 'Thiếu mã câu lạc bộ!' });
          return;
        }
        if (!requireSuperAdmin(req, body)) {
          sendJson(res, 403, { success: false, message: 'Chỉ Super Admin mới từ chối được câu lạc bộ!' });
          return;
        }
        const rejectedTarget = store.clubs.find(c => c.id === clubId);
        if (!rejectedTarget) {
          sendJson(res, 404, { success: false, message: 'Không tìm thấy câu lạc bộ này!' });
          return;
        }
        /*
          Từ chối một CLB ĐÃ DUYỆT thì phải rút lại quyền đã trao. Nhánh WS của
          cùng thao tác này đã làm việc đó, còn bản HTTP thì quên: chủ nhiệm vẫn
          giữ role CLUB_LEADER và vẫn còn mã CLB trong scopedClubIds, tức còn quyền
          quản trị phạm vi một câu lạc bộ đã bị loại. E2E bắt được đúng chỗ này.
        */
        const wasApproved = rejectedTarget.status === 'APPROVED';
        const safeReason = reason.slice(0, 500);
        store.clubs = store.clubs.map(c =>
          c.id === clubId ? { ...c, status: 'REJECTED', rejectReason: safeReason } : c
        );
        if (wasApproved && rejectedTarget.leaderId) {
          const leader = Object.values(store.users).find(u => u.id === rejectedTarget.leaderId);
          if (leader) {
            leader.scopedClubIds = [...(leader.scopedClubIds || [])].filter(id => id !== clubId);
            if (leader.role === 'CLUB_LEADER' && leader.scopedClubIds.length === 0) {
              leader.role = 'STUDENT';
            }
            broadcastServerEvent('SYNC_USER', leader);
          }
        }
        persistStoreToDisk();
        broadcastServerEvent('REJECT_CLUB', { clubId, reason: safeReason });
        sendJson(res, 200, { success: true, clubId, message: 'Đã từ chối hồ sơ câu lạc bộ.' });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err?.message || 'Không từ chối được câu lạc bộ' });
      }
      return;
    }

    /** Bài viết trong CLB — cần đăng nhập. */
    if (method === 'POST' && url === '/api/clubs/posts') {
      try {
        const body = await parseJsonBody(req);
        const title = String(body.title || '').trim();
        const content = String(body.content || '').trim();
        const clubId = String(body.clubId || '').trim();
        if (!clubId || !title || !content) {
          sendJson(res, 400, { success: false, message: 'Tiêu đề và nội dung bài viết không được để trống!' });
          return;
        }
        if (!store.clubs.some(c => c.id === clubId)) {
          sendJson(res, 404, { success: false, message: 'Không tìm thấy câu lạc bộ này!' });
          return;
        }

        const throttle = writeLimiter.check(`clubpost:${clientIpOf(req)}`);
        if (!throttle.allowed) {
          sendRateLimited(res, throttle.retryAfterMs, 'đăng bài');
          return;
        }

        /* Tác giả bài viết cũng lấy thuần từ token. */
        const claims = authorizeRequest(req, null, body.token);
        const author = claims ? store.users[claims.email] : undefined;
        if (!author) {
          sendJson(res, 401, { success: false, message: 'Vui lòng đăng nhập để đăng bài!' });
          return;
        }

        /* Quản lý người dùng: bị cấm thì không được đăng bài trong CLB. */
        const clubPostGate = checkCanPost(author.email, 'content');
        if (!clubPostGate.ok) {
          sendJson(res, clubPostGate.status, { success: false, message: clubPostGate.message });
          return;
        }

        const post = {
          id: typeof body.id === 'string' && body.id ? body.id.slice(0, 80) : randomId('cpost'),
          clubId: clubId.slice(0, 80),
          authorId: author.id,
          authorName: author.name,
          authorAvatar: author.avatar || DEFAULT_AVATAR,
          title: title.slice(0, 200),
          content: content.slice(0, 5000),
          createdAt: new Date().toISOString(),
          likes: 0,
        };

        if (store.clubPosts.some(p => p.id === post.id)) {
          sendJson(res, 200, { success: true, post, duplicated: true });
          return;
        }
        store.clubPosts = [post, ...store.clubPosts].slice(0, MAX_CLUB_POSTS);
        recordAnalyticsActivity(getAnalyticsStore(), 'clubPosts', author.email);
        persistStoreToDisk();
        broadcastServerEvent('NEW_CLUB_POST', post);
        sendJson(res, 200, { success: true, post, message: 'Đã đăng bài viết.' });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err?.message || 'Không đăng được bài viết' });
      }
      return;
    }

    /**
     * Epic 5 — tải ảnh đại diện / ảnh bìa qua pipeline sharp (3 cỡ, WebP, hash).
     * Trả URL ngắn để lưu vào hồ sơ thay cho data URL dài (trước đây bị cắt hỏng).
     */
    if (method === 'POST' && url === '/api/media/upload') {
      try {
        const body = await parseJsonBody(req);
        const claims = authorizeRequest(req, null, typeof body?.token === 'string' ? body.token : null);
        const account = claims ? store.users[claims.email] : undefined;
        if (!claims || !account) {
          sendJson(res, 401, { success: false, message: 'Bạn cần đăng nhập để tải ảnh lên.' });
          return;
        }
        const kind: MediaKind = body?.kind === 'banner' ? 'banner' : 'avatar';
        const throttle = uploadLimiter.check(`upload:${claims.email}`);
        if (!throttle.allowed) {
          sendRateLimited(res, throttle.retryAfterMs, 'tải ảnh');
          return;
        }
        const media = await processUploadedImage({
          kind,
          ownerEmail: claims.email,
          dataUrl: body?.dataUrl,
          keepUrls: [account.avatar, account.bannerUrl],
        });
        sendJson(res, 200, { success: true, ...media });
      } catch (err: any) {
        if (err instanceof MediaUploadError) {
          sendJson(res, err.status, { success: false, message: err.message });
          return;
        }
        handleApiError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/reports') {
      try {
        const body = await parseJsonBody(req);

        /*
          Epic 5 — BẮT BUỘC ĐĂNG NHẬP.
          Trước đây endpoint này không xác thực: reporterId/Name/Email do client tự
          khai nên ai cũng gửi tố cáo dưới tên người khác, và bước gộp trùng dựa trên
          reporterId tự khai nên đổi ID là spam tiếp được. Nay danh tính lấy từ token
          + hồ sơ trên server; các trường reporter* trong body bị bỏ qua.
        */
        const claims = authorizeRequest(req, null, typeof body?.token === 'string' ? body.token : null);
        const reporter = claims ? store.users[claims.email] : undefined;
        if (!claims || !reporter) {
          sendJson(res, 401, { success: false, message: 'Bạn cần đăng nhập để gửi tố cáo.' });
          return;
        }

        const reportedUserId = sanitizePlainText(String(body?.reportedUserId ?? '').trim(), 120);
        const reportedUserName = sanitizePlainText(String(body?.reportedUserName ?? '').trim(), 120);
        const reason = sanitizePlainText(String(body?.reason ?? '').trim(), 200);
        const details = sanitizePlainText(String(body?.details ?? '').trim(), 2000, true);

        if (!reportedUserId || !reason) {
          sendJson(res, 400, { success: false, message: 'Vui lòng cung cấp lý do tố cáo!' });
          return;
        }
        if (reportedUserId === reporter.id) {
          sendJson(res, 400, { success: false, message: 'Bạn không thể tự tố cáo chính mình.' });
          return;
        }

        const ipThrottle = reportIpLimiter.check(`report-ip:${clientIpOf(req)}`);
        if (!ipThrottle.allowed) {
          sendRateLimited(res, ipThrottle.retryAfterMs, 'gửi tố cáo');
          return;
        }

        if (!store.reports) {
          store.reports = [];
        }
        /* Cùng một người tố cùng một mục với cùng lý do khi bản cũ còn chờ xử lý thì
           gộp lại (không tính vào hạn mức tài khoản), tránh ngập hộp thư quản trị. */
        const duplicate = store.reports.find(
          r =>
            r.reporterId === reporter.id &&
            r.reportedUserId === reportedUserId &&
            r.reason === reason &&
            r.status === 'PENDING',
        );
        if (duplicate) {
          sendJson(res, 200, {
            success: true,
            message: 'Bạn đã tố cáo trường hợp này và Ban Quản Trị đang xử lý.',
            reportId: duplicate.id,
            duplicated: true,
          });
          return;
        }

        const accountThrottle = reportAccountLimiter.check(`report-account:${claims.email}`);
        if (!accountThrottle.allowed) {
          sendRateLimited(res, accountThrottle.retryAfterMs, 'gửi tố cáo');
          return;
        }

        const reportSubmission = {
          id: randomId('rep'),
          reporterId: String(reporter.id || '').slice(0, 120),
          reporterName: sanitizePlainText(String(reporter.name || ''), 120),
          reporterEmail: String(reporter.email || claims.email).slice(0, 200).toLowerCase(),
          reportedUserId,
          reportedUserName,
          reason,
          details,
          targetEmail: MASTER_ADMIN_EMAIL,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        };

        store.reports = capTail([...store.reports, reportSubmission], MAX_REPORTS);
        persistStoreToDisk();
        /* Epic 5: KHÔNG phát cho mọi kết nối nữa — trước đây cả tên/email người tố cáo
           đi tới mọi socket/SSE (người bị tố đọc được trong tab Network). Chỉ socket đã
           xác thực của Super Admin nhận, và chỉ phần cần để hiện thông báo. */
        notifyUserSockets(MASTER_ADMIN_EMAIL, 'NEW_REPORT', {
          id: reportSubmission.id,
          reportedUserId,
          reportedUserName,
          reason,
          createdAt: reportSubmission.createdAt,
        });
        sendJson(res, 200, {
          success: true,
          message: 'Báo cáo vi phạm đã được ghi nhận và chuyển tới Ban Quản Trị để xử lý theo nội quy.',
          reportId: reportSubmission.id,
        });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'GET' && url.split('?')[0] === '/api/rewards/daily/status') {
      const actor = authenticatedUser(req);
      if (!actor) {
        sendJson(res, 401, { success: false, message: 'Vui lòng đăng nhập để xem phần thưởng hằng ngày.' });
        return;
      }
      const today = currentRewardDateKey();
      sendJson(res, 200, {
        success: true,
        date: today,
        status: { ...dailyRewardStatus(getDailyRewardProfile(actor.user.email), today), date: today },
      });
      return;
    }

    if (method === 'POST' && url === '/api/rewards/daily/claim') {
      try {
        const body = await parseJsonBody(req) || {};
        const actor = authenticatedUser(req, body);
        if (!actor) {
          sendJson(res, 401, { success: false, message: 'Vui lòng đăng nhập để nhận phần thưởng hằng ngày.' });
          return;
        }
        const throttle = writeLimiter.check(`daily-reward:${actor.user.email}`);
        if (!throttle.allowed) {
          sendRateLimited(res, throttle.retryAfterMs, 'nhận phần thưởng');
          return;
        }

        const today = currentRewardDateKey();
        const profile = getDailyRewardProfile(actor.user.email);
        let rewardResult: ReturnType<typeof claimDailyAttendance> | ReturnType<typeof claimDailyTrivia> | ReturnType<typeof claimGiftBox> = null;
        let actionMessage = '';

        if (body.action === 'attendance') {
          rewardResult = claimDailyAttendance(profile, today);
          actionMessage = 'Điểm danh thành công.';
        } else if (body.action === 'quiz') {
          rewardResult = claimDailyTrivia(profile, today, body.answerIndex, randomInt(5, 11));
          actionMessage = 'Đã ghi nhận câu trả lời hôm nay.';
        } else if (body.action === 'box') {
          rewardResult = claimGiftBox(profile, today, body.boxType);
          actionMessage = 'Đã mở hộp quà.';
        } else {
          sendJson(res, 400, { success: false, message: 'Loại phần thưởng không hợp lệ.' });
          return;
        }

        if (!rewardResult) {
          sendJson(res, 409, {
            success: false,
            message: body.action === 'attendance'
              ? 'Bạn đã điểm danh hôm nay.'
              : body.action === 'quiz'
                ? 'Bạn đã trả lời câu hỏi hôm nay.'
                : 'Bạn không còn hộp quà loại này.',
            status: { ...dailyRewardStatus(profile, today), date: today },
          });
          return;
        }

        store.dailyRewards![actor.user.email] = rewardResult.profile;
        if (body.action === 'attendance') actor.user.streakCount = rewardResult.status.streak;
        if (rewardResult.reward > 0) grantCoinsAndExperience(actor.user, rewardResult.reward);
        persistStoreToDisk();
        if (rewardResult.reward > 0 || body.action === 'attendance') {
          broadcastServerEvent('SYNC_USER', actor.user);
        }
        sendJson(res, 200, {
          success: true,
          action: body.action,
          reward: rewardResult.reward,
          correct: 'correct' in rewardResult ? rewardResult.correct : undefined,
          boxGranted: 'boxGranted' in rewardResult ? rewardResult.boxGranted : undefined,
          status: { ...rewardResult.status, date: today },
          user: actor.user,
          message: actionMessage,
        });
      } catch (err: any) {
        handleApiError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/rewards/focus/start') {
      try {
        const body = await parseJsonBody(req) || {};
        const actor = authenticatedUser(req, body);
        if (!actor) {
          sendJson(res, 401, { success: false, message: 'Vui lòng đăng nhập để nhận thưởng phiên tập trung.' });
          return;
        }
        const throttle = writeLimiter.check(`focus:${actor.user.email}`);
        if (!throttle.allowed) {
          sendRateLimited(res, throttle.retryAfterMs, 'bắt đầu phiên tập trung');
          return;
        }

        const now = Date.now();
        if (!store.focusRewardSessions) store.focusRewardSessions = {};
        const existing = store.focusRewardSessions[actor.user.email];
        if (existing && !existing.claimedAt && now - existing.startedAt < FOCUS_SESSION_MAX_AGE_MS) {
          sendJson(res, 200, {
            success: true,
            sessionId: existing.id,
            startedAt: existing.startedAt,
            resumed: true,
          });
          return;
        }

        const targetMinutes = body.targetMinutes === undefined ? 25 : normalizeFocusTargetMinutes(body.targetMinutes);
        if (targetMinutes === null) {
          sendJson(res, 400, { success: false, message: 'Thời lượng tập trung phải từ 5 đến 120 phút, theo bước 5 phút.' });
          return;
        }
        const reward = focusRewardForMinutes(targetMinutes);
        if (reward <= 0) {
          sendJson(res, 400, { success: false, message: 'Phiên dưới 25 phút vẫn được ghi giờ học nhưng không có phần thưởng Coin.' });
          return;
        }
        const session: FocusRewardSession = { id: randomId('focus'), startedAt: now, targetMinutes };
        store.focusRewardSessions[actor.user.email] = session;
        persistStoreToDisk();
        sendJson(res, 200, {
          success: true,
          sessionId: session.id,
          startedAt: session.startedAt,
          targetMinutes,
          reward,
          resumed: false,
        });
      } catch (err: any) {
        handleApiError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/rewards/focus/complete') {
      try {
        const body = await parseJsonBody(req) || {};
        const actor = authenticatedUser(req, body);
        if (!actor) {
          sendJson(res, 401, { success: false, message: 'Vui lòng đăng nhập để nhận thưởng phiên tập trung.' });
          return;
        }
        const throttle = writeLimiter.check(`focus:${actor.user.email}`);
        if (!throttle.allowed) {
          sendRateLimited(res, throttle.retryAfterMs, 'nhận thưởng phiên tập trung');
          return;
        }

        const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
        const session = store.focusRewardSessions?.[actor.user.email];
        if (!sessionId || !session || session.id !== sessionId) {
          sendJson(res, 409, { success: false, message: 'Phiên tập trung không còn hợp lệ.' });
          return;
        }
        if (session.claimedAt) {
          sendJson(res, 200, {
            success: true,
            duplicate: true,
            reward: session.reward || FOCUS_REWARD_AMOUNT,
            user: actor.user,
          });
          return;
        }

        const now = Date.now();
        const elapsed = now - session.startedAt;
        const targetMinutes = session.targetMinutes || 25;
        const requiredMs = Math.max(FOCUS_REWARD_MINIMUM_MS - 10000, targetMinutes * 60 * 1000 - 10000); /* grace 10s */

        if (elapsed < requiredMs) {
          sendJson(res, 409, { success: false, message: `Bạn cần hoàn thành đủ ${targetMinutes >= 25 ? targetMinutes : 25} phút tập trung mới nhận được thưởng.` });
          return;
        }
        if (elapsed > FOCUS_SESSION_MAX_AGE_MS) {
          delete store.focusRewardSessions![actor.user.email];
          persistStoreToDisk();
          sendJson(res, 409, { success: false, message: 'Phiên tập trung đã hết hạn; hãy bắt đầu phiên mới.' });
          return;
        }

        const reward = focusRewardForMinutes(targetMinutes);
        let boxGranted: string | undefined;

        if (targetMinutes >= 120) {
          boxGranted = 'mystery';
        } else if (targetMinutes >= 60) {
          boxGranted = 'small';
        }

        grantCoinsAndExperience(actor.user, reward);
        if (boxGranted) {
          actor.user.inventory = actor.user.inventory || [];
          actor.user.inventory.push(boxGranted);
        }

        session.claimedAt = now;
        session.reward = reward;
        persistStoreToDisk();
        broadcastServerEvent('SYNC_USER', actor.user);
        sendJson(res, 200, {
          success: true,
          reward,
          boxGranted,
          user: actor.user,
          message: `Đã ghi nhận ${targetMinutes} phút tập trung và phần thưởng tương ứng.`,
        });
      } catch (err: any) {
        handleApiError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/rewards/focus/cancel') {
      try {
        const body = await parseJsonBody(req) || {};
        const actor = authenticatedUser(req, body);
        if (!actor) {
          sendJson(res, 401, { success: false, message: 'Phiên đăng nhập không hợp lệ.' });
          return;
        }
        const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
        const session = store.focusRewardSessions?.[actor.user.email];
        const cancelled = Boolean(sessionId && session && session.id === sessionId && !session.claimedAt);
        if (cancelled) {
          delete store.focusRewardSessions![actor.user.email];
          persistStoreToDisk();
        }
        sendJson(res, 200, { success: true, cancelled });
      } catch (err: any) {
        handleApiError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/shop/purchase') {
      try {
        const body = await parseJsonBody(req) || {};
        const actor = authenticatedUser(req, body);
        if (!actor) {
          sendJson(res, 401, { success: false, message: 'Vui lòng đăng nhập để mua vật phẩm.' });
          return;
        }
        const throttle = writeLimiter.check(`shop:${actor.user.email}`);
        if (!throttle.allowed) {
          sendRateLimited(res, throttle.retryAfterMs, 'mua vật phẩm');
          return;
        }
        const itemId = typeof body.itemId === 'string' ? body.itemId.trim() : '';
        const item = SHOP_ITEM_BY_ID.get(itemId);
        if (!item) {
          sendJson(res, 404, { success: false, message: 'Vật phẩm không tồn tại trong cửa hàng.' });
          return;
        }
        const inventory = Array.isArray(actor.user.inventory) ? actor.user.inventory : [];
        if (inventory.includes(itemId)) {
          sendJson(res, 200, { success: true, duplicate: true, user: actor.user, item: { id: item.id, price: item.price } });
          return;
        }
        const balance = asBoundedCount(actor.user.coin, 100, MAX_USER_COIN);
        /* Epic 4 — giá do catalog + ưu đãi tuần phía MÁY CHỦ quyết định (client không gửi giá). */
        const price = effectivePrice(item, Date.now());
        if (balance < price) {
          sendJson(res, 402, { success: false, message: `Bạn cần ${price} Coin; số dư hiện tại là ${balance} Coin.` });
          return;
        }
        actor.user.coin = balance - price;
        actor.user.inventory = [...inventory, itemId];
        persistStoreToDisk();
        broadcastServerEvent('SYNC_USER', actor.user);
        sendJson(res, 200, {
          success: true,
          user: actor.user,
          item: { id: item.id, name: item.name, price, listPrice: item.price },
        });
      } catch (err: any) {
        handleApiError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/shop/equip') {
      try {
        const body = await parseJsonBody(req) || {};
        const actor = authenticatedUser(req, body);
        if (!actor) {
          sendJson(res, 401, { success: false, message: 'Vui lòng đăng nhập để thay đổi trang bị.' });
          return;
        }
        const itemId = typeof body.itemId === 'string' ? body.itemId.trim() : '';
        if (itemId) {
          if (!SHOP_ITEM_BY_ID.has(itemId)) {
            sendJson(res, 404, { success: false, message: 'Vật phẩm không tồn tại trong cửa hàng.' });
            return;
          }
          if (!(actor.user.inventory || []).includes(itemId)) {
            sendJson(res, 403, { success: false, message: 'Bạn chưa sở hữu vật phẩm này.' });
            return;
          }
        }
        actor.user.equippedBadge = itemId;
        persistStoreToDisk();
        broadcastServerEvent('SYNC_USER', actor.user);
        sendJson(res, 200, { success: true, user: actor.user });
      } catch (err: any) {
        handleApiError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/users/update') {
      try {
        const body = await parseJsonBody(req);
        const email = (body.email || '').trim().toLowerCase();

        if (!email || !store.users[email]) {
          sendJson(res, 400, { success: false, message: 'Người dùng không tồn tại' });
          return;
        }

        /* Phải là CHÍNH CHỦ (hoặc Super Admin) mới được sửa bản ghi này. */
        const claims = authorizeRequest(req, null, body.token);
        if (!claims || (claims.email !== email && !isMasterAdminEmail(claims.email))) {
          sendJson(res, 401, {
            success: false,
            message: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại!',
          });
          return;
        }

        /* Loại mọi trường quyền do server sở hữu (role/staffRole, Premium,
           phạm vi CLB), đồng thời kẹp số về khoảng hợp lý. */
        const patch = sanitizeUserUpdate(body.updates);
        const merged = { ...store.users[email], ...patch };
        merged.level = calculateLevelFromXP(merged.xp ?? 0);

        store.users[email] = merged;
        persistStoreToDisk();
        broadcastServerEvent('SYNC_USER', merged);
        sendJson(res, 200, { success: true, user: merged });
      } catch (err: any) {
        handleApiError(res, err);
      }
      return;
    }

    /**
     * Hộp thư báo cáo vi phạm — chỉ Super Admin đọc được.
     * Trước đây `/api/reports` chỉ ghi vào kho rồi thôi: không có cổng đọc, và
     * `reports` còn bị vứt khi khởi động lại, nên tố cáo rơi vào khoảng không.
     */
    if (method === 'GET' && url.startsWith('/api/admin/reports')) {
      if (!requireSuperAdmin(req, {})) {
        sendJson(res, 403, { success: false, message: 'Chỉ Super Admin mới xem được báo cáo vi phạm!' });
        return;
      }
      const list = store.reports || [];
      sendJson(res, 200, {
        success: true,
        reports: list,
        pending: list.filter((r) => r?.status !== 'RESOLVED' && r?.status !== 'DISMISSED').length,
      });
      return;
    }

    /** Đánh dấu đã xử lý / bỏ qua / xoá hẳn một báo cáo. */
    if (method === 'POST' && url === '/api/admin/reports/resolve') {
      try {
        const body = await parseJsonBody(req);
        if (!requireSuperAdmin(req, body)) {
          sendJson(res, 403, { success: false, message: 'Chỉ Super Admin mới xử lý được báo cáo vi phạm!' });
          return;
        }
        const reportId = String(body.reportId || '').trim();
        const action = body.action === 'delete' ? 'delete' : String(body.status || 'RESOLVED');
        if (!reportId) {
          sendJson(res, 400, { success: false, message: 'Thiếu reportId' });
          return;
        }
        if (!store.reports) store.reports = [];
        if (!store.reports.some((r) => r?.id === reportId)) {
          sendJson(res, 404, { success: false, message: 'Báo cáo không tồn tại' });
          return;
        }

        if (action === 'delete') {
          store.reports = store.reports.filter((r) => r.id !== reportId);
        } else {
          const status = ['RESOLVED', 'DISMISSED'].includes(action) ? action : 'RESOLVED';
          store.reports = store.reports.map((r) =>
            r.id === reportId
              ? { ...r, status, resolvedAt: new Date().toISOString(), resolutionNote: String(body.note || '').slice(0, 500) }
              : r
          );
        }

        persistStoreToDisk();
        const updated = (store.reports || []).find((r) => r.id === reportId) || null;
        /* Chỉ Super Admin xem được hộp thư → chỉ socket của Super Admin nhận cập nhật. */
        notifyUserSockets(MASTER_ADMIN_EMAIL, 'REPORT_UPDATED', { reportId, action });
        sendJson(res, 200, { success: true, report: updated, reports: store.reports });
      } catch (err: any) {
        handleApiError(res, err);
      }
      return;
    }

    /**
     * SỐ LIỆU NGƯỜI DÙNG — chỉ Super Admin.
     * Lượt khách là trình duyệt cài ID ngẫu nhiên; tài khoản đăng nhập được gộp
     * theo email đã xác thực để không đếm nhiều thiết bị của cùng một tài khoản.
     */
    if (method === 'GET' && url.split('?')[0] === '/api/admin/analytics') {
      /* Super Admin hoặc vai trò tùy chỉnh có quyền view_analytics (mục 3.1/3.3). */
      const claims = authorizeRequest(req, null, null);
      const viewer = claims ? store.users[claims.email] : undefined;
      const canView = Boolean(viewer && (
        (isMasterAdminEmail(String(claims?.email || '')) && viewer.role === 'SUPER_ADMIN')
        || customRolePermissionsOf(viewer).includes('view_analytics')
      ));
      if (!canView) {
        sendJson(res, 403, { success: false, message: 'Chỉ Super Admin hoặc vai trò có quyền xem thống kê mới xem được báo cáo này.' });
        return;
      }
      const params = new URL(url, 'http://fforum.local').searchParams;
      const report = buildAnalyticsReport(getAnalyticsStore(), store.users, params.get('range'), Date.now(), {
        reports: store.reports,
        clubs: store.clubs,
        clubPosts: store.clubPosts,
      });
      sendJson(res, 200, { success: true, analytics: report });
      return;
    }

    /** Danh bạ hồ sơ có phân trang; giáo viên/moderator chỉ nhận trường cần kiểm duyệt. */
    if (method === 'GET' && url.split('?')[0] === '/api/admin/members') {
      const actor = requireModerationStaff(req, {});
      if (!actor) {
        sendJson(res, 403, { success: false, message: 'Chỉ Super Admin, Giáo viên hoặc Moderator mới xem được danh sách thành viên.' });
        return;
      }
      const params = new URL(url, 'http://fforum.local').searchParams;
      const query = String(params.get('q') || '').trim().slice(0, 120);
      const roleFilter = String(params.get('role') || 'ALL').trim().toUpperCase();
      const allowedFilters = ['ALL', 'SUPER_ADMIN', 'MODERATOR', 'TEACHER', 'CLUB_LEADER', 'STUDENT', 'PREMIUM'];
      const role = allowedFilters.includes(roleFilter) ? roleFilter : 'ALL';
      /* Epic 3 — lọc theo trạng thái kiểu ct-03 (All / Active / Banned / Muted / Warned). */
      const statusFilterRaw = String(params.get('status') || 'ALL').trim().toUpperCase();
      const statusFilter = ['ALL', 'ACTIVE', 'BANNED', 'MUTED', 'WARNED'].includes(statusFilterRaw) ? statusFilterRaw : 'ALL';
      const warnedEmails = new Set((store.adminWarnings || []).map((warning) => warning.targetEmail));
      /* Hồ sơ riêng tư (tiểu sử, khu vực, lớp…) chỉ dành cho Super Admin và Admin
         (vai trò tùy chỉnh có give_role); Giáo viên/Moderator nhận dữ liệu thống kê tối thiểu. */
      const canSeeFullProfiles = (actor.role === 'SUPER_ADMIN' && !actor.viaCustomRole) || actor.permissions.includes('give_role');
      const rawPage = Number(params.get('page'));
      const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
      const rawLimit = Number(params.get('limit'));
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(100, Math.floor(rawLimit)) : 50;
      const now = Date.now();
      const fold = (value: unknown) => String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase();
      const q = fold(query);
      const all = Object.entries(store.users).map(([email, user]) => {
        const displayRole = isMasterAdminEmail(email)
          ? 'SUPER_ADMIN'
          : user.staffRole || user.role;
        const moderation = moderationStatusOf(store.moderation, email, now);
        const premiumActive = isPremiumActive(user, now);
        return { email, user, displayRole, moderation, premiumActive };
      }).filter(({ email, user, displayRole, moderation, premiumActive }) => {
        const visibleSearchFields = canSeeFullProfiles
          ? `${user.city || ''} ${user.className || ''} ${user.bio || ''}`
          : '';
        const queryMatch = !q || fold(`${email} ${user.name} ${user.id} ${visibleSearchFields}`).includes(q);
        const roleMatch = role === 'ALL' || (role === 'PREMIUM'
          ? premiumActive
          : displayRole === role || user.role === role);
        const statusMatch = statusFilter === 'ALL'
          || (statusFilter === 'ACTIVE' && !moderation.banned && !moderation.muted)
          || (statusFilter === 'BANNED' && moderation.banned)
          || (statusFilter === 'MUTED' && moderation.muted)
          || (statusFilter === 'WARNED' && warnedEmails.has(email));
        return queryMatch && roleMatch && statusMatch;
      }).sort((a, b) => {
        const aLast = getAnalyticsStore().members[a.email]?.lastSeenAt || 0;
        const bLast = getAnalyticsStore().members[b.email]?.lastSeenAt || 0;
        return bLast - aLast || String(a.user.name || '').localeCompare(String(b.user.name || ''), 'vi');
      });
      const total = all.length;
      const entries = all.slice((page - 1) * limit, page * limit).map(({ email, user, displayRole, moderation, premiumActive }) => {
        const metrics = getAnalyticsStore().members[email];
        const warnings = (store.adminWarnings || []).filter((warning) => warning.targetEmail === email).slice(0, 5);
        const fullProfile = canSeeFullProfiles ? {
          bio: String(user.bio || '').slice(0, 1000),
          city: String(user.city || '').slice(0, 120),
          className: String(user.className || '').slice(0, 120),
          gender: String(user.gender || '').slice(0, 40),
          joinedAt: String(user.joinedAt || ''),
          bannerUrl: String(user.bannerUrl || '').slice(0, 2000),
          profileGradient: String(user.profileGradient || '').slice(0, 120),
        } : undefined;
        const customRoleDef = user.customRole ? store.customRoles?.[user.customRole] || null : null;
        return {
          id: String(user.id || '').slice(0, 120),
          email,
          name: String(user.name || 'Người dùng').slice(0, 120),
          avatar: String(user.avatar || '').slice(0, 2000),
          role: displayRole,
          userRole: user.role,
          staffRole: user.staffRole || null,
          customRole: user.customRole || null,
          customRoleDef,
          joinedAt: String(user.joinedAt || ''),
          level: Math.max(1, Math.min(150, Math.floor(Number(user.level) || 1))),
          moderation,
          premium: {
            active: premiumActive,
            until: typeof user.premiumUntil === 'number' ? user.premiumUntil : null,
            grantedAt: typeof user.premiumGrantedAt === 'number' ? user.premiumGrantedAt : null,
          },
          metrics: {
            visits: metrics?.visits || 0,
            activeSeconds: metrics?.activeSeconds || 0,
            pageViews: metrics?.pageViews || 0,
            messages: metrics?.messages || 0,
            questions: metrics?.questions || 0,
            answers: metrics?.answers || 0,
            clubsCreated: metrics?.clubsCreated || 0,
            clubPosts: metrics?.clubPosts || 0,
            lastSeenAt: metrics?.lastSeenAt || 0,
          },
          warningCount: (store.adminWarnings || []).filter((warning) => warning.targetEmail === email).length,
          warnings,
          ...(fullProfile ? { profile: fullProfile } : {}),
        };
      });
      sendJson(res, 200, {
        success: true,
        members: entries,
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
        role,
        status: statusFilter,
        canAssignRoles: actor.role === 'SUPER_ADMIN' || actor.permissions.includes('give_role'),
        canManagePremium: actor.role === 'SUPER_ADMIN',
      });
      return;
    }

    /** Vai trò do Super Admin (hoặc vai trò tùy chỉnh có quyền give_role) cấp;
       không có API nào nhận lệnh cấp SUPER_ADMIN. Hỗ trợ cả vai trò tùy chỉnh (mục 3.5). */
    if (method === 'POST' && url === '/api/admin/role') {
      try {
        const body = await parseJsonBody(req);
        const actor = requireRoleGrantor(req, body);
        if (!actor) {
          sendJson(res, 403, { success: false, message: 'Chỉ Super Admin hoặc vai trò có quyền give_role mới được cấp/thu hồi vai trò.' });
          return;
        }
        const claims = actor.claims;
        const email = String(body?.email || '').trim().toLowerCase();
        const target = store.users[email];
        if (!target) {
          sendJson(res, 404, { success: false, message: 'Không tìm thấy thành viên.' });
          return;
        }
        if (isMasterAdminEmail(email) || target.role === 'SUPER_ADMIN') {
          sendJson(res, 400, { success: false, message: 'Vai trò Super Admin được bảo vệ và không thể cấp từ danh sách này.' });
          return;
        }
        const requestedRole = body?.staffRole;
        const requestedCustomRole = typeof body?.customRole === 'string' ? body.customRole : null;
        const hasStaffRoleField = Object.prototype.hasOwnProperty.call(body || {}, 'staffRole');
        const hasCustomRoleField = Object.prototype.hasOwnProperty.call(body || {}, 'customRole');
        if (!hasStaffRoleField && !hasCustomRoleField) {
          sendJson(res, 400, { success: false, message: 'Thiếu trường staffRole hoặc customRole.' });
          return;
        }
        if (hasStaffRoleField && requestedRole !== null && requestedRole !== 'MODERATOR' && requestedRole !== 'TEACHER') {
          sendJson(res, 400, { success: false, message: 'Chỉ được cấp vai trò Giáo viên hoặc Moderator; vai trò Super Admin không thể cấp.' });
          return;
        }
        /* Một tài khoản chỉ giữ MỘT vai trò quản trị tại một thời điểm:
           chọn vai trò tùy chỉnh thì xoá staffRole cũ và ngược lại. */
        let nextCustomRole: string | undefined;
        if (hasCustomRoleField && requestedCustomRole) {
          const roleDef = store.customRoles?.[requestedCustomRole];
          if (!roleDef) {
            sendJson(res, 404, { success: false, message: 'Không tìm thấy vai trò tùy chỉnh này.' });
            return;
          }
          nextCustomRole = roleDef.id;
        }
        const previousRole = target.staffRole || null;
        const previousCustomRole = target.customRole || null;
        const nextStaffRole = hasCustomRoleField ? null : requestedRole;
        if (actor.role !== 'SUPER_ADMIN' || actor.viaCustomRole) {
          if (email === claims.email) {
            sendJson(res, 400, { success: false, message: 'Không thể tự thay đổi vai trò của chính mình.' });
            return;
          }
          if (customRolePermissionsOf(target).includes('give_role')) {
            sendJson(res, 403, { success: false, message: 'Chỉ Super Admin mới được thay đổi vai trò của Admin khác.' });
            return;
          }
          const grantedPermissions: readonly CustomRolePermission[] = nextCustomRole
            ? store.customRoles?.[nextCustomRole]?.permissions || []
            : nextStaffRole
              ? CUSTOM_ROLE_MODERATION_PERMISSIONS
              : [];
          const exceeding = grantedPermissions.filter((permission) => !actor.permissions.includes(permission));
          if (exceeding.length > 0) {
            sendJson(res, 403, { success: false, message: `Không thể cấp vai trò vượt quyền của bạn (${exceeding.join(', ')}).` });
            return;
          }
        }
        if (previousRole === nextStaffRole && previousCustomRole === (nextCustomRole || null)) {
          sendJson(res, 200, { success: true, changed: false, member: target });
          return;
        }
        if (nextStaffRole) target.staffRole = nextStaffRole;
        else delete target.staffRole;
        if (nextCustomRole) target.customRole = nextCustomRole;
        else delete target.customRole;
        const assignedLabel = nextCustomRole
          ? `vai trò tùy chỉnh ${store.customRoles?.[nextCustomRole]?.name || nextCustomRole}`
          : nextStaffRole;
        pushAuditLog({
          action: assignedLabel ? `role:assign:${assignedLabel}` : 'role:revoke',
          targetEmail: email,
          reason: String(body?.reason || (assignedLabel ? 'Cấp vai trò quản trị cộng đồng.' : 'Thu hồi vai trò quản trị cộng đồng.')).trim().slice(0, 500),
          by: claims.email,
        });
        persistStoreToDisk();
        broadcastServerEvent('SYNC_USER', target);
        sendJson(res, 200, {
          success: true,
          changed: true,
          previousRole,
          staffRole: target.staffRole || null,
          customRole: target.customRole || null,
          member: target,
        });
      } catch (err: any) {
        handleApiError(res, err);
      }
      return;
    }

    /** Năng lực quản trị của chính người gọi — client dùng để ẩn/hiện nút,
       server vẫn kiểm quyền độc lập ở từng endpoint. */
    if (method === 'GET' && url.split('?')[0] === '/api/admin/me') {
      const claims = authorizeRequest(req, null, null);
      const me = claims ? store.users[claims.email] : undefined;
      if (!claims || !me) {
        sendJson(res, 401, { success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
        return;
      }
      const isSuper = isMasterAdminEmail(claims.email) && me.role === 'SUPER_ADMIN';
      const staffRole = me.staffRole === 'MODERATOR' || me.staffRole === 'TEACHER' ? me.staffRole : null;
      const customRoleDef = me.customRole ? store.customRoles?.[me.customRole] || null : null;
      const permissions: CustomRolePermission[] = isSuper
        ? [...CUSTOM_ROLE_PERMISSIONS]
        : staffRole
          ? [...CUSTOM_ROLE_MODERATION_PERMISSIONS]
          : customRolePermissionsOf(me);
      sendJson(res, 200, {
        success: true,
        isSuperAdmin: isSuper,
        staffRole,
        customRoleDef,
        permissions,
        canCreateRole: isSuper || permissions.includes('give_role'),
      });
      return;
    }

    /** Danh sách vai trò tùy chỉnh (mục 3.5) — người có quyền give_role được xem để gán. */
    if (method === 'GET' && url.split('?')[0] === '/api/admin/roles') {
      const actor = requireRoleGrantor(req, {});
      if (!actor) {
        sendJson(res, 403, { success: false, message: 'Chỉ Super Admin hoặc vai trò có quyền give_role mới xem được danh sách vai trò.' });
        return;
      }
      const roles = Object.values(store.customRoles || {})
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((role) => ({ ...role, memberCount: Object.values(store.users).filter((user) => user.customRole === role.id).length }));
      sendJson(res, 200, { success: true, roles });
      return;
    }

    /** Tạo vai trò tùy chỉnh (mục 3.5) — chỉ Admin/Super Admin (người có quyền give_role).
       Chống leo thang quyền: Admin chỉ tạo được vai trò có quyền ⊆ quyền của chính mình. */
    if (method === 'POST' && url.split('?')[0] === '/api/admin/roles') {
      try {
        const body = await parseJsonBody(req);
        const actor = requireRoleGrantor(req, body);
        if (!actor) {
          sendJson(res, 403, { success: false, message: 'Chỉ Admin/Super Admin mới được tạo vai trò tùy chỉnh.' });
          return;
        }
        const claims = actor.claims;
        const sanitized = sanitizeCustomRoleInput(body);
        if (!sanitized.ok) {
          sendJson(res, 400, { success: false, message: sanitized.message });
          return;
        }
        const exceeding = sanitized.value.permissions.filter((permission) => !actor.permissions.includes(permission));
        if (exceeding.length > 0) {
          sendJson(res, 403, { success: false, message: `Không thể tạo vai trò vượt quyền của bạn (${exceeding.join(', ')}).` });
          return;
        }
        if (!store.customRoles) store.customRoles = {};
        const duplicate = Object.values(store.customRoles).some((role) => role.name.toLowerCase() === sanitized.value.name.toLowerCase());
        if (duplicate) {
          sendJson(res, 400, { success: false, message: 'Đã có vai trò trùng tên.' });
          return;
        }
        const role: CustomRoleRecord = {
          id: randomId('role'),
          ...sanitized.value,
          createdAt: Date.now(),
          createdBy: claims.email,
        };
        store.customRoles[role.id] = role;
        pushAuditLog({ action: 'role:create', targetEmail: '', reason: `Tạo vai trò tùy chỉnh "${role.name}"`, by: claims.email });
        persistStoreToDisk();
        sendJson(res, 200, { success: true, role });
      } catch (err: any) {
        handleApiError(res, err);
      }
      return;
    }

    /** Xoá vai trò tùy chỉnh — Super Admin xoá mọi vai trò; Admin chỉ xoá vai trò do chính mình tạo.
       Gỡ luôn mọi lượt gán đang dùng vai trò đó. */
    if (method === 'DELETE' && url.split('?')[0] === '/api/admin/roles') {
      try {
        const actor = requireRoleGrantor(req, {});
        if (!actor) {
          sendJson(res, 403, { success: false, message: 'Chỉ Admin/Super Admin mới được xoá vai trò tùy chỉnh.' });
          return;
        }
        const claims = actor.claims;
        const params = new URL(url, 'http://fforum.local').searchParams;
        const id = String(params.get('id') || '').trim();
        const role = store.customRoles?.[id];
        if (!role) {
          sendJson(res, 404, { success: false, message: 'Không tìm thấy vai trò tùy chỉnh này.' });
          return;
        }
        if (actor.role !== 'SUPER_ADMIN' && role.createdBy !== claims.email) {
          sendJson(res, 403, { success: false, message: 'Bạn chỉ được xoá vai trò do chính mình tạo.' });
          return;
        }
        if (actor.role !== 'SUPER_ADMIN' && actor.user.customRole === id) {
          sendJson(res, 400, { success: false, message: 'Không thể xoá vai trò bạn đang giữ.' });
          return;
        }
        delete store.customRoles![id];
        let cleared = 0;
        for (const user of Object.values(store.users)) {
          if (user.customRole === id) {
            delete user.customRole;
            cleared += 1;
            broadcastServerEvent('SYNC_USER', user);
          }
        }
        pushAuditLog({ action: 'role:delete', targetEmail: '', reason: `Xoá vai trò tùy chỉnh "${role.name}" (gỡ ${cleared} lượt gán)`, by: claims.email });
        persistStoreToDisk();
        sendJson(res, 200, { success: true, deleted: role.id, clearedAssignments: cleared });
      } catch (err: any) {
        handleApiError(res, err);
      }
      return;
    }

    /** Cảnh cáo nội dung và gửi riêng cho chính thành viên nhận cảnh cáo. */
    if (method === 'POST' && url === '/api/admin/warn') {
      try {
        const body = await parseJsonBody(req);
        const actor = requireModerationStaff(req, body);
        if (!actor) {
          sendJson(res, 403, { success: false, message: 'Chỉ nhân sự kiểm duyệt mới được gửi cảnh cáo.' });
          return;
        }
        if (actor.viaCustomRole && !actor.permissions.includes('warn')) {
          sendJson(res, 403, { success: false, message: 'Vai trò tùy chỉnh của bạn không có quyền cảnh cáo.' });
          return;
        }
        const email = String(body?.email || '').trim().toLowerCase();
        const target = store.users[email];
        if (!target) {
          sendJson(res, 404, { success: false, message: 'Không tìm thấy thành viên.' });
          return;
        }
        if (email === actor.claims.email || target.role === 'SUPER_ADMIN' || isMasterAdminEmail(email)) {
          sendJson(res, 400, { success: false, message: 'Không thể cảnh cáo chính mình hoặc tài khoản Super Admin.' });
          return;
        }
        if (actor.role !== 'SUPER_ADMIN' && (target.staffRole || target.customRole)) {
          sendJson(res, 403, { success: false, message: 'Nhân sự kiểm duyệt chỉ có thể cảnh cáo thành viên không giữ vai trò kiểm duyệt.' });
          return;
        }
        const reason = String(body?.reason || '').trim().slice(0, 500);
        if (reason.length < 3) {
          sendJson(res, 400, { success: false, message: 'Cảnh cáo cần nội dung cụ thể (ít nhất 3 ký tự).' });
          return;
        }
        const warning: AdminWarningRecord = {
          id: randomId('warning'),
          at: Date.now(),
          targetEmail: email,
          reason,
          by: actor.claims.email,
        };
        store.adminWarnings = [warning, ...(store.adminWarnings || [])].slice(0, 1000);
        pushAuditLog({ action: 'warning', targetEmail: email, reason, by: actor.claims.email });
        persistStoreToDisk();
        notifyUserSockets(email, 'USER_WARNED', { id: warning.id, reason: warning.reason, at: warning.at });
        sendJson(res, 200, { success: true, warning, warningCount: store.adminWarnings.filter((item) => item.targetEmail === email).length });
      } catch (err: any) {
        handleApiError(res, err);
      }
      return;
    }

    /** Cấp F-Forum Premium thủ công; đây không phải thanh toán hay gói thu phí. */
    if (method === 'POST' && url === '/api/admin/premium') {
      try {
        const body = await parseJsonBody(req);
        const claims = requireSuperAdmin(req, body);
        if (!claims) {
          sendJson(res, 403, { success: false, message: 'Chỉ Super Admin mới được cấp hoặc thu hồi Premium.' });
          return;
        }
        const email = String(body?.email || '').trim().toLowerCase();
        const target = store.users[email];
        if (!target) {
          sendJson(res, 404, { success: false, message: 'Không tìm thấy thành viên.' });
          return;
        }
        if (target.role === 'SUPER_ADMIN' || isMasterAdminEmail(email)) {
          sendJson(res, 400, { success: false, message: 'Không cần cấp Premium cho tài khoản Super Admin.' });
          return;
        }
        const action = body?.action;
        const reason = String(body?.reason || '').trim().slice(0, 500);
        if (reason.length < 3) {
          sendJson(res, 400, { success: false, message: 'Vui lòng ghi lý do cấp/thu hồi Premium (ít nhất 3 ký tự).' });
          return;
        }
        if (action === 'grant') {
          const days = Number(body?.durationDays);
          if (![30, 90, 365, 0].includes(days)) {
            sendJson(res, 400, { success: false, message: 'Thời hạn Premium không hợp lệ.' });
            return;
          }
          target.premiumUntil = days === 0 ? 0 : Date.now() + days * 24 * 60 * 60 * 1000;
          target.premiumGrantedAt = Date.now();
        } else if (action === 'revoke') {
          delete target.premiumUntil;
          delete target.premiumGrantedAt;
        } else {
          sendJson(res, 400, { success: false, message: 'Thao tác Premium không hợp lệ.' });
          return;
        }
        pushAuditLog({ action: `premium:${action}`, targetEmail: email, reason, by: claims.email });
        persistStoreToDisk();
        broadcastServerEvent('SYNC_USER', target);
        notifyUserSockets(email, 'USER_PREMIUM_UPDATED', { active: isPremiumActive(target), until: target.premiumUntil ?? null });
        sendJson(res, 200, {
          success: true,
          action,
          premium: { active: isPremiumActive(target), until: target.premiumUntil ?? null, grantedAt: target.premiumGrantedAt ?? null },
        });
      } catch (err: any) {
        handleApiError(res, err);
      }
      return;
    }

    /**
     * TỔNG QUAN VẬN HÀNH — chỉ Super Admin.
     *
     * `/api/health` đã phơi số đếm nhưng nó CÔNG KHAI và chỉ cho biết "có bao
     * nhiêu". Quản trị cần biết "đang có gì cần xử lý" và "hệ thống có khoẻ
     * không": hàng chờ duyệt, tỉ lệ câu hỏi chưa có lời giải, nguồn nào đang bị
     * chặn, tệp dữ liệu còn chỗ không. Endpoint này gộp tất cả vào một lần gọi để
     * bảng điều khiển không phải bắn năm sáu request.
     */
    if (method === 'GET' && url.startsWith('/api/admin/overview')) {
      const claims = requireSuperAdmin(req, {});
      if (!claims) {
        sendJson(res, 403, { success: false, message: 'Chỉ Super Admin mới xem được tổng quan hệ thống!' });
        return;
      }
      try {
        const now = Date.now();

        /*
          Dọn các áp chế đã hết hạn. Không có bước này thì mỗi lần cấm tạm thời để
          lại một bản ghi chết vĩnh viễn trong tệp dữ liệu — map chỉ phình chứ
          không tự co. Trả nguyên map khi không có gì để dọn nên không ghi đĩa thừa.
        */
        const prunedModeration = pruneModeration(store.moderation, now);
        if (prunedModeration !== store.moderation) {
          store.moderation = prunedModeration;
          persistStoreToDisk();
        }

        /*
          Đếm áp chế đang có hiệu lực. Duyệt trực tiếp theo cặp khoá–bản ghi rồi
          gọi isUntilActive trên từng mốc: cách viết trước dò ngược khoá bằng
          `Object.keys().find(k => map[k] === rec)` — so sánh tham chiếu, vừa chậm
          vừa sai nếu hai bản ghi trùng nội dung.
        */
        const modEntries = Object.entries(store.moderation || {});
        const moderationSummary = {
          banned: modEntries.filter(([, r]) => isUntilActive(r?.bannedUntil, now)).length,
          muted: modEntries.filter(([, r]) => isUntilActive(r?.mutedUntil, now)).length,
          records: modEntries.length,
          auditEntries: Array.isArray(store.auditLog) ? store.auditLog.length : 0,
        };

        /* Dọn các khoá limiter đã hết hạn trước khi chụp ảnh — Map này chỉ phình
           chứ không tự co, chạy lâu sẽ giữ hàng nghìn khoá rỗng. */
        const limiters = [
          { name: 'login', limiter: loginLimiter },
          { name: 'register', limiter: registerLimiter },
          { name: 'social', limiter: socialLimiter },
          { name: 'write', limiter: writeLimiter },
          { name: 'presence', limiter: presenceLimiter },
          { name: 'analytics', limiter: analyticsLimiter },
        ].map(({ name, limiter }) => {
          limiter.prune(now);
          return { name, ...limiter.snapshot(now) };
        });

        const allUsers = Object.values(store.users) as any[];
        const reports = store.reports || [];
        const pendingReports = reports.filter(
          (r) => r?.status !== 'RESOLVED' && r?.status !== 'DISMISSED',
        );
        const clubs = store.clubs || [];
        const questions = store.questions || [];
        const solutions = store.solutions || [];

        /* Câu hỏi chưa ai trả lời — khác với "chưa được chọn đáp án chuẩn": câu có
           ba lời giải nhưng chưa chốt vẫn là đang chờ, còn câu zero lời giải mới là
           đang bị bỏ rơi. Quản trị cần phân biệt hai loại này. */
        const answeredIds = new Set(solutions.map((s: any) => s?.questionId).filter(Boolean));
        const unanswered = questions.filter((q: any) => !answeredIds.has(q?.id)).length;

        /* Kích thước tệp dữ liệu: store giữ toàn bộ trong RAM và ghi đè một tệp,
           nên đây là chỉ báo sớm cho việc sắp chạm trần. */
        let dataFileBytes = 0;
        let dataFileOk = false;
        try {
          const st = fs.statSync(dataFilePath());
          dataFileBytes = st.size;
          dataFileOk = true;
        } catch {
          dataFileOk = false;
        }
        let corruptBackups = 0;
        try {
          corruptBackups = fs
            .readdirSync(dataDir())
            .filter((f) => f.startsWith('forum-data.json.corrupt-')).length;
        } catch {
          corruptBackups = 0;
        }

        /*
          Nguồn bị tố cáo nhiều nhất — vào thẳng việc cần xử lý, không bắt quản trị
          tự lật danh sách. Báo cáo có `reportedUserId`/`reportedUserName`; trường
          `targetEmail` chỉ là địa chỉ NHẬN báo cáo (luôn là admin), tuyệt đối không
          được dùng làm người bị tố — nếu không dashboard sẽ báo chính admin là
          người bị tố cáo nhiều nhất. Ánh xạ id thật về email để tìm kiếm được.
          Chỉ lấy 5 mục và không kèm nội dung/lý do tố cáo.
        */
        const reportUserById = new Map<string, string>();
        Object.entries(store.users).forEach(([email, user]) => {
          if (user?.id) reportUserById.set(String(user.id), email);
          reportUserById.set(email, email);
        });
        const reportTally = new Map<string, number>();
        reports.forEach((r: any) => {
          const id = String(r?.reportedUserId || r?.targetId || '').trim();
          const target =
            reportUserById.get(id) ||
            String(r?.reportedUserEmail || r?.reportedUserName || id).trim();
          if (!target) return;
          reportTally.set(target, (reportTally.get(target) || 0) + 1);
        });
        const topReported = Array.from(reportTally.entries())
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .slice(0, 5)
          .map(([target, count]) => ({ target, count }));

        sendJson(res, 200, {
          success: true,
          generatedAt: new Date(now).toISOString(),
          server: {
            uptimeSeconds: Math.round((now - startedAtMs) / 1000),
            node: process.version,
            dataFileBytes,
            dataFileOk,
            corruptBackups,
          },
          counts: {
            users: allUsers.length,
            clubs: clubs.length,
            clubPosts: (store.clubPosts || []).length,
            questions: questions.length,
            solutions: solutions.length,
            chatMessages: (store.chatMessages || []).length,
            feedbacks: (store.feedbacks || []).length,
            reports: reports.length,
          },
          connections: { websocket: wsClients.size, sse: sseClients.size },
          pending: {
            reports: pendingReports.length,
            clubs: clubs.filter((c: any) => c?.status === 'PENDING').length,
          },
          /* Áp chế đang có hiệu lực — quản trị cần biết đã khoá ai mà không phải
             mở tệp dữ liệu ra đọc. */
          moderation: moderationSummary,
          contentHealth: {
            unansweredQuestions: unanswered,
            unsolvedQuestions: questions.filter((q: any) => !q?.isSolved).length,
            solvedRate:
              questions.length === 0
                ? 0
                : Math.round((questions.filter((q: any) => q?.isSolved).length / questions.length) * 100),
            anonymousQuestions: questions.filter((q: any) => q?.isAnonymous).length,
            openBountyCoin: questions
              .filter((q: any) => !q?.isSolved)
              .reduce((sum: number, q: any) => sum + (Number(q?.bountyCoin) || 0), 0),
          },
          community: {
            superAdmins: allUsers.filter((u) => u?.role === 'SUPER_ADMIN').length,
            clubLeaders: allUsers.filter((u) => u?.role === 'CLUB_LEADER').length,
            students: allUsers.filter((u) => u?.role === 'STUDENT').length,
            totalCoin: allUsers.reduce((sum, u) => sum + (Number(u?.coin) || 0), 0),
            highestLevel: allUsers.reduce((max, u) => Math.max(max, Number(u?.level) || 0), 0),
          },
          rateLimits: limiters,
          topReported,
        });
      } catch (err: any) {
        handleApiError(res, err);
      }
      return;
    }

    /**
     * CẤM / KHOÁ GỬI TIN — Super Admin, Giáo viên hoặc Moderator.
     *
     * Đây là mảnh còn thiếu của quy trình tố cáo: trước đây quản trị chỉ đánh dấu
     * được một báo cáo là "đã xử lý" chứ không có cách nào thực thi, người bị tố
     * cáo vẫn tiếp tục đăng.
     */
    if (method === 'POST' && url === '/api/admin/moderate') {
      try {
        const body = await parseJsonBody(req);
        const actor = requireModerationStaff(req, body);
        if (!actor) {
          sendJson(res, 403, { success: false, message: 'Chỉ Super Admin, Giáo viên hoặc Moderator mới được kiểm duyệt người dùng.' });
          return;
        }
        const claims = actor.claims;
        const action = String(body?.action || '').trim() as ModerationAction;
        if (!MODERATION_ACTIONS.includes(action)) {
          sendJson(res, 400, {
            success: false,
            message: `Hành động không hợp lệ. Phải là một trong: ${MODERATION_ACTIONS.join(', ')}.`,
          });
          return;
        }
        const requiredPermission: CustomRolePermission | null =
          action === 'ban' || action === 'unban' ? 'ban'
          : action === 'mute' || action === 'unmute' ? 'mute'
          : null;
        if (actor.viaCustomRole && requiredPermission && !actor.permissions.includes(requiredPermission)) {
          sendJson(res, 403, { success: false, message: `Vai trò tùy chỉnh của bạn không có quyền ${requiredPermission === 'ban' ? 'cấm đăng' : 'khoá chat'}.` });
          return;
        }

        /* Email mục tiêu phải khớp một tài khoản thật trong store; không tạo bản
           ghi áp chế cho email tuỳ ý chưa đăng ký (vốn không thể truy vết/gỡ). */
        const targetEmail = String(body?.email || '').trim().toLowerCase();
        if (!targetEmail) {
          sendJson(res, 400, { success: false, message: 'Thiếu email người dùng cần quản lý.' });
          return;
        }
        const targetUser = store.users[targetEmail];
        if (!targetUser) {
          sendJson(res, 404, { success: false, message: 'Không tìm thấy người dùng này trong hệ thống.' });
          return;
        }

        /* Không cho phép quản trị tự khoá mình hoặc khoá bất kỳ tài khoản quản trị
           nào — dễ tự nhốt toàn bộ hệ thống ngoài quyền gỡ. */
        if (targetEmail === String(claims.email).trim().toLowerCase() || targetUser.role === 'SUPER_ADMIN' || isMasterAdminEmail(targetEmail)) {
          sendJson(res, 400, { success: false, message: 'Không thể áp chế chính mình hoặc tài khoản Super Admin.' });
          return;
        }
        if (actor.role !== 'SUPER_ADMIN' && (targetUser.staffRole || targetUser.customRole)) {
          sendJson(res, 403, { success: false, message: 'Nhân sự kiểm duyệt chỉ được quản lý thành viên không giữ vai trò kiểm duyệt.' });
          return;
        }

        const isApplyingRestriction = action === 'ban' || action === 'mute';
        const reason = normalizeModerationReason(body?.reason);
        if (isApplyingRestriction && reason.length < 3) {
          sendJson(res, 400, { success: false, message: 'Vui lòng ghi lý do quản lý (ít nhất 3 ký tự) để lưu vào nhật ký.' });
          return;
        }
        const durationMinutes = Number(body?.durationMinutes);
        if (isApplyingRestriction && !MODERATION_DURATIONS_MIN.some((allowed) => allowed === durationMinutes)) {
          sendJson(res, 400, {
            success: false,
            message: `Thời hạn không hợp lệ. Chọn một trong: ${MODERATION_DURATIONS_MIN.map((m) => m === 0 ? 'vĩnh viễn' : `${m} phút`).join(', ')}.`,
          });
          return;
        }

        const result = applyModerationAction(store.moderation, targetEmail, action, {
          durationMinutes: isApplyingRestriction ? durationMinutes : undefined,
          reason,
          by: claims.email,
        });
        if (!result.changed) {
          sendJson(res, 200, {
            success: true,
            changed: false,
            message: 'Không có gì thay đổi — áp chế này vốn đã ở trạng thái bạn yêu cầu.',
            status: moderationStatusOf(store.moderation, targetEmail),
          });
          return;
        }

        store.moderation = result.next;
        const auditReason = reason || (
          action === 'unban' ? 'Gỡ cấm đăng theo quyết định quản trị.'
          : action === 'unmute' ? 'Gỡ khoá chat theo quyết định quản trị.'
          : result.record?.reason || ''
        );
        pushAuditLog({
          action: `moderate:${action}`,
          targetEmail,
          reason: auditReason,
          by: claims.email,
        });
        persistStoreToDisk();

        /* Chỉ báo cho các WS đang đăng nhập đúng tài khoản đó — không broadcast
           email/lý do áp chế ra toàn cộng đồng. Việc gửi nội dung mới vẫn được gate
           ở server nên đóng WS chỉ là tín hiệu cập nhật tức thời, không phải hàng rào
           bảo mật duy nhất. */
        const st = moderationStatusOf(store.moderation, targetEmail);
        notifyUserSockets(targetEmail, 'USER_MODERATED', { banned: st.banned, muted: st.muted });

        sendJson(res, 200, {
          success: true,
          changed: true,
          action,
          targetEmail,
          status: st,
        });
      } catch (err: any) {
        handleApiError(res, err);
      }
      return;
    }

    /**
     * Tra cứu tài khoản cho công cụ quản lý — chỉ Super Admin.
     *
     * Không trả toàn bộ store.users (có thể chứa thông tin hồ sơ riêng tư).
     * Tìm kiếm trả tối đa 20 bản ghi với các trường tối thiểu cần để quản lý;
     * query rỗng chỉ trả các tài khoản hiện đang bị cấm/khoá gửi tin để admin
     * thấy ngay ai đang bị áp chế, không biến endpoint thành danh bạ đại trà.
     */
    if (method === 'GET' && url.split('?')[0] === '/api/admin/users') {
      if (!requireSuperAdmin(req, {})) {
        sendJson(res, 403, { success: false, message: 'Chỉ Super Admin mới được tra cứu người dùng!' });
        return;
      }

      const searchParams = new URL(url, 'http://fforum.local').searchParams;
      const query = String(searchParams.get('q') || '').trim().slice(0, 120);
      const fold = (value: unknown) => String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase();

      const now = Date.now();
      const pruned = pruneModeration(store.moderation, now);
      if (pruned !== store.moderation) {
        store.moderation = pruned;
        persistStoreToDisk();
      }

      const q = fold(query);
      const matching = Object.entries(store.users)
        .map(([email, raw]) => {
          const user = raw as any;
          const status = moderationStatusOf(store.moderation, email, now);
          const searchable = fold(`${email} ${user?.name || ''} ${user?.id || ''} ${user?.className || ''}`);
          return { email, user, status, searchable };
        })
        .filter(({ searchable, status }) => q.length >= 2 ? searchable.includes(q) : status.banned || status.muted)
        .sort((a, b) => {
          if (q.length < 2) {
            const aBan = a.status.banned ? 0 : 1;
            const bBan = b.status.banned ? 0 : 1;
            return aBan - bBan || String(a.user?.name || '').localeCompare(String(b.user?.name || ''), 'vi');
          }
          const rank = (email: string, name: string) => {
            const e = fold(email);
            const n = fold(name);
            return e === q ? 0 : e.startsWith(q) ? 1 : n.startsWith(q) ? 2 : e.includes(q) ? 3 : n.includes(q) ? 4 : 5;
          };
          return rank(a.email, a.user?.name) - rank(b.email, b.user?.name)
            || String(a.user?.name || '').localeCompare(String(b.user?.name || ''), 'vi');
        });
      const total = matching.length;
      const entries = matching.slice(0, 20).map(({ email, user, status }) => ({
          id: String(user?.id || '').slice(0, 120),
          email,
          name: String(user?.name || 'Người dùng').slice(0, 120),
          avatar: String(user?.avatar || '').slice(0, 2000),
          role: ['SUPER_ADMIN', 'CLUB_LEADER', 'STUDENT'].includes(user?.role) ? user.role : 'STUDENT',
          level: Math.max(1, Math.min(150, Math.floor(Number(user?.level) || 1))),
          moderation: status,
        }));

      sendJson(res, 200, {
        success: true,
        query,
        mode: q.length >= 2 ? 'search' : 'active-moderation',
        users: entries,
        total,
        limit: 20,
      });
      return;
    }

    /** Nhật ký hành động quản trị — chỉ Super Admin đọc được. */
    if (method === 'GET' && url.startsWith('/api/admin/audit')) {
      if (!requireSuperAdmin(req, {})) {
        sendJson(res, 403, { success: false, message: 'Chỉ Super Admin mới xem được nhật ký quản trị!' });
        return;
      }
      const log = Array.isArray(store.auditLog) ? store.auditLog : [];
      const searchParams = new URL(url, 'http://fforum.local').searchParams;
      const rawLimit = Number(searchParams.get('limit'));
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(100, Math.floor(rawLimit)) : 50;
      sendJson(res, 200, { success: true, auditLog: log.slice(0, limit), total: log.length, limit });
      return;
    }

    if (method === 'GET' && url.startsWith('/api/admin/about')) {
      sendJson(res, 200, {
        success: true,
        about: store.about,
        ...store.about,
      });
      return;
    }

    if (method === 'POST' && url === '/api/admin/about') {
      try {
        const body = await parseJsonBody(req);
        /* `adminEmail` trong body là do client tự khai — phải kèm token hợp lệ
           của đúng tài khoản Super Admin, nếu không ai cũng giả được admin. */
        if (!requireSuperAdmin(req, body)) {
          sendJson(res, 403, { success: false, message: 'Chỉ Super Admin mới có quyền cập nhật Khu Vinh Danh!' });
          return;
        }
        const aboutPayload = body.about || body.aboutData;
        if (!aboutPayload || typeof aboutPayload !== 'object') {
          sendJson(res, 400, { success: false, message: 'Dữ liệu không hợp lệ!' });
          return;
        }
        store.about = mergeAboutData(aboutPayload);
        persistStoreToDisk();
        broadcastServerEvent('SYNC_ABOUT', store.about);
        sendJson(res, 200, { success: true, about: store.about, ...store.about });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/questions/delete') {
      try {
        const body = await parseJsonBody(req);
        /* `adminEmail` trong body là do client tự khai — phải kèm token hợp lệ
           của đúng tài khoản Super Admin, nếu không ai cũng giả được admin. */
        if (!requireContentEditor(req, body)) {
          sendJson(res, 403, { success: false, message: 'Chỉ Super Admin hoặc vai trò có quyền sửa nội dung mới được xóa bài viết!' });
          return;
        }
        const { questionId } = body;
        if (!questionId) {
          sendJson(res, 400, { success: false, message: 'Thiếu questionId' });
          return;
        }
        store.questions = store.questions.filter(q => q.id !== questionId);
        store.solutions = store.solutions.filter(s => s.questionId !== questionId);
        persistStoreToDisk();
        broadcastServerEvent('DELETE_QUESTION', { questionId });
        sendJson(res, 200, { success: true, message: 'Đã xóa bài viết thành công' });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/questions/edit') {
      try {
        const body = await parseJsonBody(req);
        /* `adminEmail` trong body là do client tự khai — phải kèm token hợp lệ
           của đúng tài khoản Super Admin, nếu không ai cũng giả được admin. */
        if (!requireContentEditor(req, body)) {
          sendJson(res, 403, { success: false, message: 'Chỉ Super Admin hoặc vai trò có quyền sửa nội dung mới được sửa bài viết!' });
          return;
        }
        const { questionId, updates } = body;
        if (!questionId || !updates) {
          sendJson(res, 400, { success: false, message: 'Thiếu thông tin cập nhật' });
          return;
        }
        const safeUpdates = sanitizeQuestionUpdates(updates);
        if (!safeUpdates) {
          sendJson(res, 400, {
            success: false,
            message: 'Chỉ sửa được tiêu đề, nội dung và môn học của câu hỏi.',
          });
          return;
        }
        if (!store.questions.some(q => q.id === questionId)) {
          sendJson(res, 404, { success: false, message: 'Câu hỏi này không còn tồn tại.' });
          return;
        }
        store.questions = store.questions.map(q =>
          q.id === questionId ? { ...q, ...safeUpdates } : q
        );
        persistStoreToDisk();
        broadcastServerEvent('EDIT_QUESTION', { questionId, updates: safeUpdates });
        const updatedQ = store.questions.find(q => q.id === questionId);
        sendJson(res, 200, { success: true, message: 'Đã cập nhật bài viết thành công', question: updatedQ });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/solutions/delete') {
      try {
        const body = await parseJsonBody(req);
        /* `adminEmail` trong body là do client tự khai — phải kèm token hợp lệ
           của đúng tài khoản Super Admin, nếu không ai cũng giả được admin. */
        if (!requireContentEditor(req, body)) {
          sendJson(res, 403, { success: false, message: 'Chỉ Super Admin hoặc vai trò có quyền sửa nội dung mới được xóa phản hồi!' });
          return;
        }
        const { solutionId } = body;
        if (!solutionId) {
          sendJson(res, 400, { success: false, message: 'Thiếu solutionId' });
          return;
        }
        store.solutions = store.solutions.filter(s => s.id !== solutionId);
        store.questions = store.questions.map(q =>
          q.bestSolutionId === solutionId ? { ...q, isSolved: false, bestSolutionId: undefined } : q
        );
        persistStoreToDisk();
        broadcastServerEvent('DELETE_SOLUTION', { solutionId });
        sendJson(res, 200, { success: true, message: 'Đã xóa phản hồi thành công' });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/chat/delete') {
      try {
        const body = await parseJsonBody(req);
        /* `adminEmail` trong body là do client tự khai — phải kèm token hợp lệ
           của đúng tài khoản Super Admin, nếu không ai cũng giả được admin. */
        if (!requireContentEditor(req, body)) {
          sendJson(res, 403, { success: false, message: 'Chỉ Super Admin hoặc vai trò có quyền sửa nội dung mới được thu hồi tin nhắn!' });
          return;
        }
        const { messageId } = body;
        if (!messageId) {
          sendJson(res, 400, { success: false, message: 'Thiếu messageId' });
          return;
        }
        store.chatMessages = store.chatMessages.filter(m => m.id !== messageId);
        persistStoreToDisk();
        broadcastServerEvent('DELETE_CHAT_MESSAGE', { messageId });
        sendJson(res, 200, { success: true, message: 'Đã thu hồi tin nhắn thành công' });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    next();
  });
}
