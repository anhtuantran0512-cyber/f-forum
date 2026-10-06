/* Bản quyền trí tuệ thuộc về BroAmStuck */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { createHash, pbkdf2 as pbkdf2Callback, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { isIP } from 'node:net';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'user' | 'moderator' | 'admin' | 'super_admin';
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
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

interface UserModerationState {
  lockedAt?: string;
  lockReason?: string;
  mutedAt?: string;
  mutedUntil?: number | null;
  muteReason?: string;
}

interface AdminAuditEvent {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetId: string;
  targetName: string;
  reason: string;
  createdAt: string;
  ip?: string;
  userAgent?: string;
  result: 'success' | 'failure';
}

export type RewardBoxType = 'blue' | 'gold' | 'red';

export interface DailyRewardBoxRecord {
  id: string;
  type: RewardBoxType;
  earnedOn: string;
  streak: number;
}

export interface StoredDailyRewardState {
  lastAttendanceDate: string;
  attendanceStreak: number;
  boxes: DailyRewardBoxRecord[];
  openedBoxes: Record<string, { type: RewardBoxType; coins: number; openedOn: string }>;
  date: string;
  triviaClaimed: boolean;
  triviaCorrect: boolean;
  triviaCoins: number;
  studyMilliseconds: number;
  studyClaimedMinutes: number[];
  activeStudySession: { id: string; startedAt: number; lastHeartbeatAt: number } | null;
}

export interface ForumDataStore {
  schemaVersion: number;
  users: Record<string, UserRecord>;
  passwords: Record<string, string>;
  dailyRewards: Record<string, StoredDailyRewardState>;
  clubs: any[];
  clubPosts: any[];
  questions: any[];
  solutions: any[];
  chatMessages: any[];
  feedbacks: any[];
  reports?: any[];
  userModeration: Record<string, UserModerationState>;
  adminAuditLog: AdminAuditEvent[];
  coinCredits: Record<string, { date: string; amount: number }>;
  about?: any;
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
const DATA_SCHEMA_VERSION = 3;
const USER_ROLE_VALUES = new Set(['user', 'moderator', 'admin', 'super_admin']);
const ADMIN_PERMISSIONS: Record<UserRecord['role'], string[]> = {
  user: [],
  moderator: ['admin.access', 'users.view', 'users.edit', 'posts.view', 'posts.delete', 'reports.view', 'reports.resolve', 'analytics.view'],
  admin: ['admin.access', 'users.view', 'users.edit', 'users.delete', 'posts.view', 'posts.edit', 'posts.delete', 'reports.view', 'reports.resolve', 'analytics.view', 'logs.view', 'settings.view', 'settings.edit'],
  super_admin: ['admin.access', 'users.view', 'users.edit', 'users.delete', 'users.role', 'posts.view', 'posts.edit', 'posts.delete', 'reports.view', 'reports.resolve', 'analytics.view', 'logs.view', 'settings.view', 'settings.edit'],
};
const SESSION_COOKIE_NAME = 'fforum_session';
const configuredTestSessionTtl = Number(process.env.FFORUM_TEST_SESSION_TTL_MS);
const SESSION_TTL_MS = process.env.NODE_TEST_CONTEXT && Number.isSafeInteger(configuredTestSessionTtl) && configuredTestSessionTtl >= 500 && configuredTestSessionTtl <= 60_000
  ? configuredTestSessionTtl
  : 12 * 60 * 60 * 1000;
const PASSWORD_HASH_ITERATIONS = 600_000;
const MAX_REQUEST_BODY_BYTES = 25 * 1024 * 1024;
const MAX_QA_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_QA_IMAGE_DATA_URL_CHARS = Math.ceil(MAX_QA_IMAGE_BYTES / 3) * 4 + 32;
const MAX_DAILY_REWARD_COIN_CREDIT = 500;
const MAX_STUDY_SESSION_IDLE_MS = 2 * 60_000;
const MAX_STUDY_CREDIT_PER_HEARTBEAT_MS = 60_000;
const MAX_DAILY_STUDY_MILLISECONDS = 120 * 60_000;
const STUDY_REWARD_MILESTONES = [
  { minutes: 25, coins: 25 },
  { minutes: 60, coins: 35 },
  { minutes: 120, coins: 60 },
] as const;
const BOX_COIN_REWARDS: Record<RewardBoxType, number> = { blue: 30, gold: 80, red: 200 };
const TRIVIA_CORRECT_OPTION_INDICES = [3, 1, 0, 2, 1, 2, 2, 0, 0, 1, 0, 2] as const;
const ACCOUNT_READ_ROUTE_RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  '/api/sync': { maxRequests: 60, windowMs: 60_000 },
  '/api/events': { maxRequests: 30, windowMs: 60_000 },
  '/api/rewards/daily/state': { maxRequests: 30, windowMs: 60_000 },
  '/api/admin/console': { maxRequests: 30, windowMs: 60_000 },
  '/api/admin/users': { maxRequests: 30, windowMs: 60_000 },
  '/api/admin/posts': { maxRequests: 30, windowMs: 60_000 },
  '/api/admin/reports': { maxRequests: 30, windowMs: 60_000 },
  '/api/admin/logs': { maxRequests: 20, windowMs: 60_000 },
};
const ACCOUNT_ROUTE_RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  '/api/chat': { maxRequests: 30, windowMs: 60_000 },
  '/api/clubs/posts': { maxRequests: 10, windowMs: 60 * 60_000 },
  '/api/questions': { maxRequests: 10, windowMs: 60 * 60_000 },
  '/api/solutions': { maxRequests: 30, windowMs: 60 * 60_000 },
  '/api/reports': { maxRequests: 10, windowMs: 60 * 60_000 },
  '/api/rewards/coin': { maxRequests: 20, windowMs: 60_000 },
  '/api/rewards/daily/attendance': { maxRequests: 3, windowMs: 60_000 },
  '/api/rewards/daily/trivia': { maxRequests: 3, windowMs: 60_000 },
  '/api/rewards/daily/boxes/open': { maxRequests: 10, windowMs: 60_000 },
  '/api/rewards/study/start': { maxRequests: 5, windowMs: 60_000 },
  '/api/rewards/study/pulse': { maxRequests: 6, windowMs: 60_000 },
  '/api/rewards/study/stop': { maxRequests: 5, windowMs: 60_000 },
};
const pbkdf2 = promisify(pbkdf2Callback);
const sessions = new Map<string, { email: string; userId: string; expiresAt: number; elevatedUntil?: number }>();
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
const UNAUTHENTICATED_POST_PATHS = new Set([
  '/api/auth/register', '/api/auth/login', '/api/auth/social', '/api/auth/logout',
  '/api/feedback', '/api/presence',
]);
let dummyPasswordHashPromise: Promise<string> | null = null;

const isNodeTestProcess = process.env.NODE_TEST_CONTEXT === 'child-v8';
const projectRoot = path.resolve(process.cwd());
const defaultPrivateDataDir = path.join(os.homedir(), '.local', 'share', 'f-forum');
const isolatedTestDataDir = path.join(os.tmpdir(), 'f-forum-test-data', String(process.pid));
const configuredDataDir = process.env.FFORUM_DATA_DIR ? path.resolve(process.env.FFORUM_DATA_DIR) : '';
const configuredDataDirRelativePath = configuredDataDir ? path.relative(projectRoot, configuredDataDir) : '';
const configuredDataDirIsInsideProject = Boolean(configuredDataDir) && (
  configuredDataDirRelativePath === '' ||
  (configuredDataDirRelativePath !== '..' && !configuredDataDirRelativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(configuredDataDirRelativePath))
);
if (!isNodeTestProcess && configuredDataDirIsInsideProject) {
  console.warn('[Forum Server] FFORUM_DATA_DIR must be outside the project root; using the private home data directory instead.');
}
const dataDir = configuredDataDir && (isNodeTestProcess || !configuredDataDirIsInsideProject)
  ? configuredDataDir
  : isNodeTestProcess
    ? isolatedTestDataDir
    : defaultPrivateDataDir;
const dataFilePath = path.join(dataDir, 'forum-data.json');
const legacyDataFilePath = path.resolve(process.cwd(), 'data', 'forum-data.json');

let store: ForumDataStore = {
  schemaVersion: DATA_SCHEMA_VERSION,
  users: {},
  passwords: {},
  dailyRewards: {},
  userModeration: {},
  adminAuditLog: [],
  clubs: [],
  clubPosts: [],
  questions: [],
  solutions: [],
  chatMessages: [],
  feedbacks: [],
  coinCredits: {},
  about: {
    headline: 'Người Kiến Tạo & Quản Trị Hệ Thống',
    subtitle: 'Field Notes & Development Chronicles — BroAmStuck Studio',
    founder: {
      name: 'Trần Văn Anh Tuấn',
      role: 'F-Forum Founder • BroAmStuck Studio',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=600&fit=crop&crop=faces',
      bio: 'Xây dựng F-Forum từ những dòng code đầu tiên với mong muốn tạo nên một không gian số bình đẳng, nơi học sinh tự do kết nối tri thức, chia sẻ câu lạc bộ và lưu giữ ký ức tuổi học trò mà không bị rào cản bởi phán xét hay công nghệ phức tạp.',
      email: '',
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

/** Chỉ giữ tài khoản thật và những trường hồ sơ được phép; vai trò đến từ máy chủ. */
function sanitizeUsers(rawUsers: any): Record<string, UserRecord> {
  const out: Record<string, UserRecord> = {};
  if (!rawUsers || typeof rawUsers !== 'object' || Array.isArray(rawUsers)) return out;
  const safeString = (value: unknown, maxLength: number, fallback = '') =>
    typeof value === 'string' ? value.trim().slice(0, maxLength) : fallback;
  const safeNumber = (value: unknown, min: number, max: number, fallback: number) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.floor(number))) : fallback;
  };

  Object.values(rawUsers).forEach((raw: any) => {
    if (!raw || typeof raw !== 'object') return;
    const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.endsWith(RETIRED_VIRTUAL_DOMAIN)) return;
    const id = safeString(raw.id, 128);
    const name = safeString(raw.name, 60);
    if (!id || !name) return;

    const storedRole = typeof raw.role === 'string' ? raw.role.trim().toLowerCase() : '';
    // Migration is performed only while loading the private server-owned store.
    // Legacy CLUB_LEADER/STUDENT accounts become ordinary users; club scope is retained.
    const role: UserRecord['role'] = storedRole === 'super_admin' || storedRole === 'super-admin'
      ? 'super_admin'
      : storedRole === 'admin'
        ? 'admin'
        : storedRole === 'moderator'
          ? 'moderator'
          : 'user';
    const safeDate = (value: unknown, fallback: string) => {
      if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return fallback;
      return new Date(value).toISOString();
    };
    const createdAt = safeDate(raw.createdAt, safeDate(raw.joinedAt, new Date().toISOString()));
    const avatar = safeString(raw.avatar, 2_000, DEFAULT_AVATAR);
    out[email] = {
      id,
      name,
      email,
      avatar: avatar.startsWith('https://') || avatar === DEFAULT_AVATAR || avatar.startsWith('data:image/png;base64,') || avatar.startsWith('data:image/jpeg;base64,') || avatar.startsWith('data:image/webp;base64,') ? avatar : DEFAULT_AVATAR,
      role,
      createdAt,
      updatedAt: safeDate(raw.updatedAt, createdAt),
      lastLoginAt: safeDate(raw.lastLoginAt, ''),
      level: safeNumber(raw.level, 1, 150, 1),
      xp: safeNumber(raw.xp, 0, 1_000_000_000, 0),
      fPoints: safeNumber(raw.fPoints, 0, 1_000_000_000, 0),
      streakCount: safeNumber(raw.streakCount, 0, 100_000, 0),
      coin: safeNumber(raw.coin, 0, 1_000_000_000, 100),
      inventory: Array.isArray(raw.inventory) ? raw.inventory.filter((item: unknown) => typeof item === 'string').slice(0, 500) : [],
      equippedBadge: safeString(raw.equippedBadge, 80),
      bio: safeString(raw.bio, 2_000),
      gender: safeString(raw.gender, 40),
      city: safeString(raw.city, 100),
      className: safeString(raw.className, 100),
      joinedAt: safeDate(raw.joinedAt, createdAt),
      bannerUrl: safeString(raw.bannerUrl, 2_000),
      profileGradient: safeString(raw.profileGradient, 120),
      scopedClubIds: Array.isArray(raw.scopedClubIds) ? raw.scopedClubIds.filter((id: unknown) => typeof id === 'string').slice(0, 100) : [],
    };
  });
  return out;
}

type EncodedPasswordHash = string & { readonly __encodedPasswordHash: true };

function isPasswordHash(value: unknown): value is EncodedPasswordHash {
  return typeof value === 'string' && /^pbkdf2-sha256\$\d{6,7}\$[a-f0-9]{32,128}\$[a-f0-9]{64}$/.test(value);
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const digest = await pbkdf2(password, salt, PASSWORD_HASH_ITERATIONS, 32, 'sha256') as Buffer;
  return `pbkdf2-sha256$${PASSWORD_HASH_ITERATIONS}$${salt.toString('hex')}$${digest.toString('hex')}`;
}

async function verifyPasswordHash(password: string, encodedHash: string): Promise<boolean> {
  const match = /^pbkdf2-sha256\$(\d{6,7})\$([a-f0-9]{32,128})\$([a-f0-9]{64})$/.exec(encodedHash);
  if (!match) return false;
  const iterations = Number(match[1]);
  if (iterations < 100_000 || iterations > 1_000_000) return false;
  const salt = Buffer.from(match[2], 'hex');
  const expected = Buffer.from(match[3], 'hex');
  const derived = await pbkdf2(password, salt, iterations, expected.length, 'sha256') as Buffer;
  return timingSafeEqual(derived, expected);
}

async function getDummyPasswordHash(): Promise<string> {
  if (!dummyPasswordHashPromise) dummyPasswordHashPromise = hashPassword(randomBytes(32).toString('hex'));
  return dummyPasswordHashPromise;
}

const isDateKey = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

function emptyDailyRewardState(): StoredDailyRewardState {
  return {
    lastAttendanceDate: '',
    attendanceStreak: 0,
    boxes: [],
    openedBoxes: {},
    date: '',
    triviaClaimed: false,
    triviaCorrect: false,
    triviaCoins: 0,
    studyMilliseconds: 0,
    studyClaimedMinutes: [],
    activeStudySession: null,
  };
}

function sanitizeDailyRewardState(value: any): StoredDailyRewardState {
  const empty = emptyDailyRewardState();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return empty;
  const validBoxTypes = new Set<RewardBoxType>(['blue', 'gold', 'red']);
  const boxes = Array.isArray(value.boxes)
    ? value.boxes.slice(-500).flatMap((box: any) => {
        if (!box || typeof box !== 'object' || !validBoxTypes.has(box.type) || typeof box.id !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(box.id) || !isDateKey(box.earnedOn)) return [];
        const streak = Number(box.streak);
        if (!Number.isSafeInteger(streak) || streak < 1 || streak > 1_000_000) return [];
        return [{ id: box.id, type: box.type as RewardBoxType, earnedOn: box.earnedOn, streak }];
      })
    : [];
  const openedBoxes: StoredDailyRewardState['openedBoxes'] = {};
  const rawOpenedBoxes = value.openedBoxes && typeof value.openedBoxes === 'object' ? Object.entries(value.openedBoxes).slice(-500) : [];
  for (const [id, entry] of rawOpenedBoxes) {
    const box = entry as any;
    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(id) || !box || !validBoxTypes.has(box.type) || !isDateKey(box.openedOn)) continue;
    if (Number(box.coins) !== BOX_COIN_REWARDS[box.type as RewardBoxType]) continue;
    openedBoxes[id] = { type: box.type as RewardBoxType, coins: BOX_COIN_REWARDS[box.type as RewardBoxType], openedOn: box.openedOn };
  }
  const rawClaimedMinutes: unknown[] = Array.isArray(value.studyClaimedMinutes) ? value.studyClaimedMinutes : [];
  const studyClaimedMinutes: number[] = [...new Set<number>(rawClaimedMinutes.filter((minute): minute is number =>
    typeof minute === 'number' && STUDY_REWARD_MILESTONES.some(goal => goal.minutes === minute),
  ))].sort((left, right) => left - right);
  const rawStudyMilliseconds = Number(value.studyMilliseconds);
  const rawActive = value.activeStudySession;
  const now = Date.now();
  const activeStudySession = rawActive && typeof rawActive === 'object' &&
    typeof rawActive.id === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(rawActive.id) &&
    Number.isFinite(rawActive.startedAt) && Number.isFinite(rawActive.lastHeartbeatAt) &&
    rawActive.startedAt > 0 && rawActive.startedAt <= now + 60_000 &&
    rawActive.lastHeartbeatAt >= rawActive.startedAt && rawActive.lastHeartbeatAt <= now + 60_000
    ? { id: rawActive.id, startedAt: rawActive.startedAt, lastHeartbeatAt: rawActive.lastHeartbeatAt }
    : null;
  const triviaCoins = Number(value.triviaCoins);
  return {
    lastAttendanceDate: isDateKey(value.lastAttendanceDate) ? value.lastAttendanceDate : '',
    attendanceStreak: Number.isSafeInteger(value.attendanceStreak) ? Math.max(0, Math.min(1_000_000, value.attendanceStreak)) : 0,
    boxes,
    openedBoxes,
    date: isDateKey(value.date) ? value.date : '',
    triviaClaimed: Boolean(value.triviaClaimed),
    triviaCorrect: Boolean(value.triviaCorrect),
    triviaCoins: Number.isSafeInteger(triviaCoins) ? Math.max(0, Math.min(10, triviaCoins)) : 0,
    studyMilliseconds: Number.isFinite(rawStudyMilliseconds) ? Math.max(0, Math.min(MAX_DAILY_STUDY_MILLISECONDS, Math.floor(rawStudyMilliseconds))) : 0,
    studyClaimedMinutes,
    activeStudySession,
  };
}

async function loadStoreFromDisk() {
  try {
    if (!isNodeTestProcess && path.resolve(dataFilePath) !== path.resolve(legacyDataFilePath) && !fs.existsSync(dataFilePath) && fs.existsSync(legacyDataFilePath)) {
      fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
      try {
        fs.renameSync(legacyDataFilePath, dataFilePath);
      } catch (error: any) {
        if (error?.code !== 'EXDEV') throw error;
        const migrationPath = `${dataFilePath}.migration-${randomBytes(6).toString('hex')}`;
        fs.copyFileSync(legacyDataFilePath, migrationPath, fs.constants.COPYFILE_EXCL);
        fs.chmodSync(migrationPath, 0o600);
        fs.renameSync(migrationPath, dataFilePath);
        fs.unlinkSync(legacyDataFilePath);
      }
      fs.chmodSync(dataFilePath, 0o600);
    }
    if (!fs.existsSync(dataFilePath)) return;
    try {
      fs.chmodSync(dataDir, 0o700);
      fs.chmodSync(dataFilePath, 0o600);
    } catch {
      /* Restrictive permissions are best-effort on platforms without chmod support. */
    }
    const raw = fs.readFileSync(dataFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;

    const cleanUsers = sanitizeUsers({ ...store.users, ...(parsed.users || {}) });
    const cleanPasswords: Record<string, string> = {};
    let migratedLegacyPassword = false;
    const parsedPasswords = parsed.passwords && typeof parsed.passwords === 'object' ? parsed.passwords : {};
    for (const [email, value] of Object.entries(parsedPasswords)) {
      const key = email.trim().toLowerCase();
      if (!cleanUsers[key] || typeof value !== 'string' || value.length > 128) continue;
      if (isPasswordHash(value)) {
        cleanPasswords[key] = value;
      } else if (value.length >= 1) {
        cleanPasswords[key] = await hashPassword(value);
        migratedLegacyPassword = true;
      }
    }

    const cleanCoinCredits: Record<string, { date: string; amount: number }> = {};
    const rawCoinCredits = parsed.coinCredits && typeof parsed.coinCredits === 'object' ? parsed.coinCredits : {};
    for (const [email, value] of Object.entries(rawCoinCredits)) {
      const key = email.trim().toLowerCase();
      if (!cleanUsers[key] || !value || typeof value !== 'object') continue;
      const date = isDateKey((value as any).date) ? (value as any).date : '';
      const amount = Number((value as any).amount);
      if (date && Number.isFinite(amount) && amount >= 0 && amount <= MAX_DAILY_REWARD_COIN_CREDIT) {
        cleanCoinCredits[key] = { date, amount: Math.floor(amount) };
      }
    }
    const cleanDailyRewards: ForumDataStore['dailyRewards'] = {};
    const rawDailyRewards = parsed.dailyRewards && typeof parsed.dailyRewards === 'object' ? parsed.dailyRewards : {};
    for (const [email, value] of Object.entries(rawDailyRewards)) {
      const key = email.trim().toLowerCase();
      if (cleanUsers[key]) cleanDailyRewards[key] = sanitizeDailyRewardState(value);
    }

    const validUserIds = new Set(Object.values(cleanUsers).map(user => user.id));
    const cleanUserModeration: ForumDataStore['userModeration'] = {};
    const rawUserModeration = parsed.userModeration && typeof parsed.userModeration === 'object'
      ? parsed.userModeration
      : {};
    for (const [userId, rawState] of Object.entries(rawUserModeration)) {
      if (!validUserIds.has(userId) || !rawState || typeof rawState !== 'object' || Array.isArray(rawState)) continue;
      const state = rawState as any;
      const sanitized: UserModerationState = {};
      if (typeof state.lockedAt === 'string' && Number.isFinite(Date.parse(state.lockedAt))) {
        sanitized.lockedAt = new Date(state.lockedAt).toISOString();
        sanitized.lockReason = asSafeText(state.lockReason, 500);
      }
      if (typeof state.mutedAt === 'string' && Number.isFinite(Date.parse(state.mutedAt)) &&
          (state.mutedUntil === null || (Number.isSafeInteger(state.mutedUntil) && state.mutedUntil > 0))) {
        sanitized.mutedAt = new Date(state.mutedAt).toISOString();
        sanitized.mutedUntil = state.mutedUntil === null ? null : Number(state.mutedUntil);
        sanitized.muteReason = asSafeText(state.muteReason, 500);
      }
      if (Object.keys(sanitized).length > 0) cleanUserModeration[userId] = sanitized;
    }
    const cleanAdminAuditLog: AdminAuditEvent[] = Array.isArray(parsed.adminAuditLog)
      ? parsed.adminAuditLog.slice(-1_000).flatMap((raw: any) => {
          if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' ||
              typeof raw.action !== 'string' || typeof raw.createdAt !== 'string' ||
              !Number.isFinite(Date.parse(raw.createdAt))) return [];
          return [{
            id: asSafeText(raw.id, 120),
            actorId: asSafeText(raw.actorId, 128),
            actorName: asSafeText(raw.actorName, 80),
            action: asSafeText(raw.action, 80),
            targetId: asSafeText(raw.targetId, 128),
            targetName: asSafeText(raw.targetName, 100),
            reason: asSafeText(raw.reason, 500),
            createdAt: new Date(raw.createdAt).toISOString(),
            ip: asSafeText(raw.ip, 80),
            userAgent: asSafeText(raw.userAgent, 512),
            result: raw.result === 'failure' ? 'failure' : 'success',
          }];
        })
      : [];

    store = {
      schemaVersion: DATA_SCHEMA_VERSION,
      users: cleanUsers,
      passwords: cleanPasswords,
      dailyRewards: cleanDailyRewards,
      userModeration: cleanUserModeration,
      adminAuditLog: cleanAdminAuditLog,
      clubs: Array.isArray(parsed.clubs) ? parsed.clubs : [],
      clubPosts: Array.isArray(parsed.clubPosts) ? parsed.clubPosts : [],
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      solutions: Array.isArray(parsed.solutions) ? parsed.solutions : [],
      chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
      feedbacks: Array.isArray(parsed.feedbacks) ? parsed.feedbacks : [],
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
      coinCredits: cleanCoinCredits,
      about: parsed.about || store.about,
    };
    delete store.users['hocsinhmoi@fpt.edu.vn'];
    delete store.passwords['hocsinhmoi@fpt.edu.vn'];
    const requiresSchemaMigration = Number(parsed.schemaVersion || 0) < DATA_SCHEMA_VERSION;
    store.schemaVersion = DATA_SCHEMA_VERSION;
    if (migratedLegacyPassword || requiresSchemaMigration) persistStoreToDisk();
  } catch {
    // Keep the safe in-memory defaults if an old or corrupt data file cannot be loaded.
    console.error('[Forum Server] Failed to load data from disk.');
  }
}

let saveTimeout: NodeJS.Timeout | null = null;
function persistStoreToDisk() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
      }
      try {
        fs.chmodSync(dataDir, 0o700);
      } catch {
        /* File permissions may be unavailable on some deployment platforms. */
      }
      store.schemaVersion = DATA_SCHEMA_VERSION;
      const temporaryPath = `${dataFilePath}.tmp-${process.pid}-${randomBytes(6).toString('hex')}`;
      let descriptor: number | undefined;
      try {
        descriptor = fs.openSync(temporaryPath, 'wx', 0o600);
        fs.writeFileSync(descriptor, JSON.stringify(store, null, 2), { encoding: 'utf8' });
        fs.fsyncSync(descriptor);
        fs.closeSync(descriptor);
        descriptor = undefined;
        fs.renameSync(temporaryPath, dataFilePath);
        try { fs.chmodSync(dataFilePath, 0o600); } catch { /* best-effort on restricted platforms */ }
      } catch (writeError) {
        if (descriptor !== undefined) {
          try { fs.closeSync(descriptor); } catch { /* ignore */ }
        }
        try { fs.unlinkSync(temporaryPath); } catch { /* ignore */ }
        throw writeError;
      }
    } catch (err) {
      console.error('[Forum Server] Failed to persist data to disk:', err);
    }
  }, 200);
  saveTimeout.unref();
}

const wsClients = new Set<WebSocket>();
const sseClients = new Set<ServerResponse>();
const wsClientUsers = new Map<WebSocket, string>();
const sseClientUsers = new Map<ServerResponse, string>();

function disconnectUserStreams(userId: string, type: string, message: string, closeCode: number, closeReason: string) {
  const eventMessage = JSON.stringify({ type, payload: { message }, timestamp: Date.now() });
  for (const client of wsClients) {
    if (wsClientUsers.get(client) !== userId) continue;
    if (client.readyState === WebSocket.OPEN) {
      try { client.send(eventMessage); } catch { /* ignore */ }
    }
    if (client.readyState !== WebSocket.CLOSED) {
      try { client.close(closeCode, closeReason); } catch { /* ignore */ }
    }
  }
  for (const response of sseClients) {
    if (sseClientUsers.get(response) !== userId) continue;
    try { response.write(`data: ${eventMessage}\n\n`); } catch { /* ignore */ }
    try { response.end(); } catch { /* ignore */ }
    sseClients.delete(response);
    sseClientUsers.delete(response);
  }
}

function disconnectLockedAccount(userId: string) {
  disconnectUserStreams(userId, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa bởi quản trị viên.', 4003, 'Account locked');
}

export function broadcastServerEvent(type: string, payload: any) {
  const safePayload = sanitizeBroadcastPayload(type, payload);
  if (safePayload === null) return;
  const eventMessage = JSON.stringify({ type, payload: safePayload, timestamp: Date.now() });

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

type AuthenticatedRequest = IncomingMessage & { forumUser?: UserRecord };

function requestPath(req: IncomingMessage): string {
  try {
    return new URL(req.url || '/', 'http://forum.local').pathname;
  } catch {
    return '/';
  }
}

function setSecurityHeaders(res: ServerResponse) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    `object-src 'none'; base-uri 'self'; form-action 'self'${isProduction ? "; frame-ancestors 'none'" : ''}`,
  );
  if (isProduction) {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }
}

function isSameOriginRequest(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return true; // Native clients and same-origin GETs do not always send Origin.
  if (origin === 'null' || !req.headers.host) return false;
  try {
    const originUrl = new URL(origin);
    const forwardedProtocol = req.headers['x-forwarded-proto'];
    const proxyProtocol = (Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol)
      ?.split(',')[0]
      .trim()
      .toLowerCase()
      .replace(/:$/, '');
    const socketProtocol = (req.socket as any).encrypted ? 'https' : 'http';
    const requestProtocol = proxyProtocol === 'https' || proxyProtocol === 'http' ? proxyProtocol : socketProtocol;
    return !originUrl.username && !originUrl.password &&
      originUrl.host.toLowerCase() === String(req.headers.host).toLowerCase() &&
      originUrl.protocol === `${requestProtocol}:`;
  } catch {
    return false;
  }
}

function getSessionToken(req: IncomingMessage): string | null {
  const cookieHeader = req.headers.cookie;
  if (typeof cookieHeader !== 'string') return null;
  const prefix = `${SESSION_COOKIE_NAME}=`;
  const cookie = cookieHeader.split(';').map(part => part.trim()).find(part => part.startsWith(prefix));
  return cookie ? cookie.slice(prefix.length) : null;
}

function getUserModerationState(userId: string): UserModerationState {
  return store.userModeration[userId] || {};
}

function isAccountLocked(userId: string): boolean {
  return Boolean(getUserModerationState(userId).lockedAt);
}

function getActiveChatMute(userId: string): { mutedUntil: number | null; reason: string } | null {
  const state = getUserModerationState(userId);
  if (typeof state.mutedAt !== 'string' || state.mutedUntil === undefined) return null;
  if (state.mutedUntil !== null && state.mutedUntil <= Date.now()) return null;
  return { mutedUntil: state.mutedUntil, reason: state.muteReason || '' };
}

function getClientIp(req: IncomingMessage): string {
  const directAddress = req.socket.remoteAddress || 'unknown';
  if (process.env.FFORUM_TRUST_CLOUDFLARE_PROXY === 'true') {
    const forwardedAddress = req.headers['cf-connecting-ip'];
    if (typeof forwardedAddress === 'string') {
      const candidate = forwardedAddress.trim();
      if (isIP(candidate)) return candidate;
    }
  }
  return directAddress;
}

function appendAuditEvent(
  actorId: string,
  actorName: string,
  action: string,
  targetId: string,
  targetName: string,
  reason: string,
  req?: IncomingMessage,
  result: 'success' | 'failure' = 'success',
) {
  const ip = req ? getClientIp(req) : '';
  const userAgent = typeof req?.headers['user-agent'] === 'string'
    ? asSafeText(req.headers['user-agent'], 512)
    : '';
  const event: AdminAuditEvent = {
    id: `audit-${Date.now()}-${randomBytes(6).toString('hex')}`,
    actorId: asSafeText(actorId, 128),
    actorName: asSafeText(actorName, 80),
    action: asSafeText(action, 80),
    targetId: asSafeText(targetId, 128),
    targetName: asSafeText(targetName, 100),
    reason: asSafeText(reason, 500),
    createdAt: new Date().toISOString(),
    ...(ip ? { ip: asSafeText(ip, 80) } : {}),
    ...(userAgent ? { userAgent } : {}),
    result,
  };
  store.adminAuditLog.push(event);
  if (store.adminAuditLog.length > 1_000) store.adminAuditLog.splice(0, store.adminAuditLog.length - 1_000);
  return event;
}

function addAdminAuditEvent(
  actor: UserRecord,
  action: string,
  targetId: string,
  targetName: string,
  reason = '',
  req?: IncomingMessage,
  result: 'success' | 'failure' = 'success',
) {
  return appendAuditEvent(actor.id, actor.name, action, targetId, targetName, reason, req, result);
}

function addSecurityAuditEvent(
  req: IncomingMessage,
  action: string,
  targetId: string,
  targetName: string,
  result: 'success' | 'failure',
  actor?: UserRecord | null,
) {
  return appendAuditEvent(
    actor?.id || 'anonymous',
    actor?.name || 'Unauthenticated',
    action,
    targetId,
    targetName,
    '',
    req,
    result,
  );
}

function getAuthenticatedUser(req: IncomingMessage): UserRecord | null {
  const token = getSessionToken(req);
  if (!token || token.length > 200) return null;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const session = sessions.get(tokenHash);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(tokenHash);
    return null;
  }
  const user = store.users[session.email];
  if (!user || user.id !== session.userId || isAccountLocked(session.userId)) {
    sessions.delete(tokenHash);
    return null;
  }
  return user;
}

function hasPermission(user: UserRecord | null | undefined, permission: string): boolean {
  return Boolean(user && ADMIN_PERMISSIONS[user.role]?.includes(permission));
}

function permissionsFor(user: UserRecord): string[] {
  return [...ADMIN_PERMISSIONS[user.role]];
}

function isSecureRequest(req: IncomingMessage): boolean {
  const forwarded = req.headers['x-forwarded-proto'];
  const proxyProtocol = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
    ?.split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/:$/, '');
  return process.env.NODE_ENV === 'production' || proxyProtocol === 'https' || Boolean((req.socket as any).encrypted);
}

function createSession(req: IncomingMessage, res: ServerResponse, user: UserRecord) {
  // Rotate the browser's previous session on every successful authentication.
  const previousToken = getSessionToken(req);
  if (previousToken) sessions.delete(createHash('sha256').update(previousToken).digest('hex'));
  const token = randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  if (sessions.size > 20_000) {
    for (const [key, session] of sessions) {
      if (session.expiresAt <= Date.now()) sessions.delete(key);
    }
  }
  sessions.set(tokenHash, { email: user.email.toLowerCase(), userId: user.id, expiresAt });
  const secure = isSecureRequest(req) ? '; Secure' : '';
  const expires = new Date(expiresAt).toUTCString();
  res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}; Expires=${expires}${secure}`);
}

function revokeUserSessions(userId: string) {
  for (const [tokenHash, session] of sessions) {
    if (session.userId === userId) sessions.delete(tokenHash);
  }
  disconnectUserStreams(userId, 'SESSION_REVOKED', 'Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.', 4001, 'Session revoked');
}

function clearSession(req: IncomingMessage, res: ServerResponse) {
  const token = getSessionToken(req);
  if (token) sessions.delete(createHash('sha256').update(token).digest('hex'));
  const secure = isSecureRequest(req) ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`);
}

function consumeRateLimitByKey(key: string, maxRequests: number, windowMs: number): number | null {
  const now = Date.now();
  let bucket = rateLimitBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    rateLimitBuckets.set(key, bucket);
  }
  bucket.count += 1;

  if (rateLimitBuckets.size > 10_000) {
    for (const [oldKey, value] of rateLimitBuckets) {
      if (value.resetAt <= now) rateLimitBuckets.delete(oldKey);
    }
  }
  // Keep the limiter's own memory bounded under high-cardinality request floods.
  if (rateLimitBuckets.size > 20_000) {
    let toEvict = rateLimitBuckets.size - 15_000;
    for (const oldKey of rateLimitBuckets.keys()) {
      if (toEvict-- <= 0) break;
      rateLimitBuckets.delete(oldKey);
    }
  }

  return bucket.count > maxRequests ? Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) : null;
}

function consumeRateLimit(req: IncomingMessage, bucketName: string, maxRequests: number, windowMs: number): number | null {
  const address = getClientIp(req);
  // Node's test suite hosts several independent ephemeral HTTP servers in one process;
  // keep their in-memory rate-limit state isolated without changing production keys.
  const testServerNamespace = isNodeTestProcess ? `:${req.socket.localPort || 'unknown-port'}` : '';
  return consumeRateLimitByKey(`${bucketName}:${address}${testServerNamespace}`, maxRequests, windowMs);
}

async function verifyAccountPassword(user: UserRecord, password: unknown): Promise<boolean> {
  const candidate = typeof password === 'string' ? password : '';
  const storedHash = store.passwords[user.email.toLowerCase()];
  if (candidate.length > 128 || !isPasswordHash(storedHash)) {
    await verifyPasswordHash(candidate.slice(0, 128), await getDummyPasswordHash());
    return false;
  }
  return verifyPasswordHash(candidate, storedHash);
}

function findUserById(userId: string): UserRecord | undefined {
  return Object.values(store.users).find(user => user.id === userId);
}

function serializeAdminAccount(user: UserRecord) {
  const moderation = getUserModerationState(user.id);
  const activeMute = getActiveChatMute(user.id);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    level: user.level,
    joinedAt: user.joinedAt || user.createdAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    accountLocked: Boolean(moderation.lockedAt),
    lockedAt: moderation.lockedAt || '',
    lockReason: moderation.lockReason || '',
    chatMuted: Boolean(activeMute),
    mutedAt: activeMute ? moderation.mutedAt || '' : '',
    mutedUntil: activeMute?.mutedUntil ?? null,
    muteReason: activeMute?.reason || '',
  };
}

function serializeAdminReport(report: any) {
  return {
    id: asSafeText(report.id, 120),
    reporterId: asSafeText(report.reporterId, 128),
    reporterName: asSafeText(report.reporterName, 80),
    reporterEmail: asSafeText(report.reporterEmail, 254),
    reportedUserId: asSafeText(report.reportedUserId, 128),
    reportedUserName: asSafeText(report.reportedUserName, 80),
    reason: asSafeText(report.reason, 200),
    details: asSafeText(report.details, 5_000),
    createdAt: typeof report.createdAt === 'string' ? report.createdAt : '',
    status: ['resolved', 'dismissed'].includes(report.status) ? report.status : 'open',
    reviewedAt: typeof report.reviewedAt === 'string' ? report.reviewedAt : '',
    reviewNote: asSafeText(report.reviewNote, 500),
    reviewedByName: asSafeText(report.reviewedByName, 80),
  };
}

function serializeAdminContent() {
  return {
    questions: store.questions.slice(-500).map(item => publicAuthoredItem(item)),
    solutions: store.solutions.slice(-500).map(item => publicAuthoredItem(item)),
    chatMessages: store.chatMessages.slice(-500).map(item => publicAuthoredItem(item)),
    clubPosts: store.clubPosts.slice(-500).map(item => publicAuthoredItem(item)),
  };
}

function adminSettingsOverview() {
  return {
    schemaVersion: DATA_SCHEMA_VERSION,
    storage: 'private-json',
    singleInstanceSessions: true,
    sessionTtlHours: Math.round(SESSION_TTL_MS / 3_600_000 * 100) / 100,
    sessionCookie: 'HttpOnly; SameSite=Lax; Secure on HTTPS/production',
    passwordHash: `PBKDF2-SHA256 · ${PASSWORD_HASH_ITERATIONS.toLocaleString()} iterations`,
    socialLogin: {
      google: Boolean(process.env.FFORUM_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID),
      facebook: Boolean(process.env.FFORUM_FACEBOOK_APP_ID && process.env.FFORUM_FACEBOOK_APP_SECRET),
    },
    roles: [...USER_ROLE_VALUES],
    superAdminCount: Object.values(store.users).filter(user => user.role === 'super_admin').length,
  };
}

function sanitizeAboutInput(value: any) {
  const current = publicAbout(store.about) || {};
  const incoming = value && typeof value === 'object' ? value : {};
  const cleanText = (value: unknown, fallback: string, maxLength: number) =>
    asSafeText(value, maxLength) || fallback;
  const baseFounder = current.founder && typeof current.founder === 'object' ? current.founder : {};
  const founder = incoming.founder && typeof incoming.founder === 'object' ? incoming.founder : {};
  const avatarUrl = asSafeText(founder.avatarUrl, 2_000);
  const milestones = Array.isArray(incoming.milestones)
    ? incoming.milestones.slice(0, 200).filter((item: any) => item && typeof item === 'object').map((item: any, index: number) => ({
      id: cleanText(item.id, `milestone-${index + 1}`, 100),
      title: cleanText(item.title, 'Mốc hoạt động', 160),
      category: cleanText(item.category, 'Hoạt động', 120),
      place: cleanText(item.place, '', 160),
      imageUrl: /^https:\/\//i.test(asSafeText(item.imageUrl, 2_000)) ? asSafeText(item.imageUrl, 2_000) : '',
      notes: cleanText(item.notes, '', 4_000),
      isTall: item.isTall === true,
    }))
    : (Array.isArray(current.milestones) ? current.milestones : []);
  return {
    headline: cleanText(incoming.headline, cleanText(current.headline, 'F-Forum', 160), 160),
    subtitle: cleanText(incoming.subtitle, cleanText(current.subtitle, '', 240), 240),
    founder: {
      name: cleanText(founder.name, cleanText(baseFounder.name, 'F-Forum Founder', 100), 100),
      role: cleanText(founder.role, cleanText(baseFounder.role, 'F-Forum Founder', 160), 160),
      avatarUrl: /^https:\/\//i.test(avatarUrl) ? avatarUrl : asSafeText(baseFounder.avatarUrl, 2_000),
      bio: cleanText(founder.bio, cleanText(baseFounder.bio, '', 2_000), 2_000),
    },
    milestones,
  };
}

function adminOverviewMetrics() {
  const accounts = Object.values(store.users);
  const reports = store.reports || [];
  return {
    members: accounts.length,
    questions: store.questions.length,
    answers: store.solutions.length,
    chatMessages: store.chatMessages.length,
    clubPosts: store.clubPosts.length,
    openReports: reports.filter((report: any) => report.status !== 'resolved' && report.status !== 'dismissed').length,
    lockedAccounts: accounts.filter(account => isAccountLocked(account.id)).length,
    mutedAccounts: accounts.filter(account => Boolean(getActiveChatMute(account.id))).length,
  };
}

function isSafeQaImage(image: unknown): boolean {
  if (image === undefined || image === null || image === '') return true;
  if (typeof image !== 'string' || image.length > MAX_QA_IMAGE_DATA_URL_CHARS) return false;

  const match = /^data:image\/(png|jpeg|webp);base64,([a-z0-9+/]+={0,2})$/i.exec(image);
  if (!match || match[2].length % 4 !== 0) return false;
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length === 0 || bytes.length > MAX_QA_IMAGE_BYTES || bytes.toString('base64') !== match[2]) return false;

  switch (match[1].toLowerCase()) {
    case 'png':
      return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'jpeg':
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case 'webp':
      return bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
    default:
      return false;
  }
}

function asSafeText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function vietnamDateKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDateKey(date: string, offsetDays: number): string {
  if (!isDateKey(date)) return '';
  const timestamp = Date.parse(`${date}T00:00:00.000Z`) + offsetDays * 86_400_000;
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function getDailyTriviaIndex(date: string): number {
  let hash = 0;
  for (let index = 0; index < date.length; index += 1) {
    hash = (hash * 31 + date.charCodeAt(index)) % 100_000;
  }
  return hash % TRIVIA_CORRECT_OPTION_INDICES.length;
}

export function getNextAttendanceStreak(lastDate: string, currentStreak: number, today: string): number {
  return lastDate === shiftDateKey(today, -1) ? Math.max(0, currentStreak) + 1 : 1;
}

export function getAttendanceBoxType(streak: number): RewardBoxType | null {
  if (streak <= 0) return null;
  const cycleDay = streak % 15 || 15;
  return cycleDay === 5 ? 'blue' : cycleDay === 10 ? 'gold' : cycleDay === 15 ? 'red' : null;
}

function getUserDailyRewardState(user: UserRecord, today: string): { state: StoredDailyRewardState; changed: boolean } {
  const key = user.email.toLowerCase();
  const state = store.dailyRewards[key] || emptyDailyRewardState();
  let changed = !store.dailyRewards[key];
  if (state.date !== today) {
    state.date = today;
    state.triviaClaimed = false;
    state.triviaCorrect = false;
    state.triviaCoins = 0;
    state.studyMilliseconds = 0;
    state.studyClaimedMinutes = [];
    if (state.activeStudySession) state.activeStudySession.lastHeartbeatAt = Date.now();
    changed = true;
  }
  store.dailyRewards[key] = state;
  return { state, changed };
}

function toDailyRewardSummary(state: StoredDailyRewardState, today: string) {
  const lastDate = state.lastAttendanceDate;
  const visibleStreak = lastDate === today || lastDate === shiftDateKey(today, -1) ? state.attendanceStreak : 0;
  return {
    date: today,
    attendanceStreak: visibleStreak,
    attendanceClaimed: lastDate === today,
    boxes: {
      blue: state.boxes.filter(box => box.type === 'blue').map(box => box.id),
      gold: state.boxes.filter(box => box.type === 'gold').map(box => box.id),
      red: state.boxes.filter(box => box.type === 'red').map(box => box.id),
    },
    triviaIndex: getDailyTriviaIndex(today),
    triviaClaimed: state.triviaClaimed,
    triviaCorrect: state.triviaClaimed ? state.triviaCorrect : null,
    triviaCoins: state.triviaClaimed ? state.triviaCoins : 0,
    studyMinutes: Math.floor(state.studyMilliseconds / 60_000),
    studyClaimedMinutes: [...state.studyClaimedMinutes],
  };
}

function creditDailyRewardCoins(user: UserRecord, amount: number, today: string): boolean {
  if (!Number.isSafeInteger(amount) || amount <= 0) return false;
  const accountKey = user.email.toLowerCase();
  const previousCredit = store.coinCredits[accountKey];
  const creditedToday = previousCredit?.date === today ? previousCredit.amount : 0;
  if (creditedToday + amount > MAX_DAILY_REWARD_COIN_CREDIT) return false;
  const currentCoin = typeof user.coin === 'number' && Number.isSafeInteger(user.coin) ? user.coin : 100;
  if (!Number.isSafeInteger(currentCoin + amount) || currentCoin + amount > 1_000_000_000) return false;
  user.coin = currentCoin + amount;
  store.coinCredits[accountKey] = { date: today, amount: creditedToday + amount };
  store.users[accountKey] = user;
  return true;
}

function publishRewardUser(user: UserRecord) {
  persistStoreToDisk();
  broadcastServerEvent('SYNC_USER', user);
}

function accrueServerStudyTime(state: StoredDailyRewardState, now: number): number {
  const active = state.activeStudySession;
  if (!active) return 0;
  const gap = now - active.lastHeartbeatAt;
  active.lastHeartbeatAt = now;
  if (!Number.isFinite(gap) || gap <= 0 || gap > MAX_STUDY_SESSION_IDLE_MS) return 0;
  const creditedMilliseconds = Math.min(gap, MAX_STUDY_CREDIT_PER_HEARTBEAT_MS);
  state.studyMilliseconds = Math.min(MAX_DAILY_STUDY_MILLISECONDS, state.studyMilliseconds + creditedMilliseconds);
  return creditedMilliseconds;
}

function grantReachedStudyRewards(user: UserRecord, state: StoredDailyRewardState, today: string) {
  const todayMinutes = Math.floor(state.studyMilliseconds / 60_000);
  const claimed = new Set(state.studyClaimedMinutes);
  const rewards: Array<{ minutes: number; coins: number }> = [];
  for (const milestone of STUDY_REWARD_MILESTONES) {
    if (todayMinutes < milestone.minutes || claimed.has(milestone.minutes)) continue;
    claimed.add(milestone.minutes);
    if (creditDailyRewardCoins(user, milestone.coins, today)) {
      rewards.push(milestone);
    }
  }
  state.studyClaimedMinutes = [...claimed].sort((left, right) => left - right);
  return { rewards, todayMinutes };
}

function safePresencePayload(payload: any, user: UserRecord | null, req: IncomingMessage) {
  if (user) {
    return {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      level: user.level,
      rank: typeof payload?.rank === 'string' ? payload.rank.slice(0, 12) : 'I',
    };
  }
  const suppliedId = asSafeText(payload?.id, 80);
  const guestKey = createHash('sha256')
    .update(`${req.socket.remoteAddress || 'unknown'}:${suppliedId}`)
    .digest('hex')
    .slice(0, 12);
  return {
    id: `guest-${guestKey}`,
    name: asSafeText(payload?.name, 32) || 'Khách',
    avatar: DEFAULT_AVATAR,
    role: 'user',
    level: 1,
    rank: 'I',
  };
}

function publicUser(user: UserRecord): UserRecord {
  return { ...user, email: `${user.id}@public.invalid`, scopedClubIds: [...(user.scopedClubIds || [])] };
}

function publicAuthoredItem<T extends Record<string, any>>(item: T): T {
  const copy: Record<string, any> = { ...item };
  if ('authorEmail' in copy) copy.authorEmail = '';
  if (copy.isAnonymous === true && 'authorId' in copy) copy.authorId = '';
  if ('reporterEmail' in copy) copy.reporterEmail = '';
  if ('email' in copy && typeof copy.email === 'string') copy.email = '';
  return copy as T;
}

function publicAbout(value: any = store.about) {
  const about = value && typeof value === 'object' ? { ...value } : value;
  if (about?.founder && typeof about.founder === 'object') {
    about.founder = { ...about.founder };
    delete about.founder.email;
  }
  return about;
}

function sanitizeBroadcastPayload(type: string, payload: any): any | null {
  if (type === 'NEW_REPORT' || type === 'NEW_FEEDBACK') return null;
  if (type === 'SYNC_USER' && payload && typeof payload === 'object') return publicUser(payload as UserRecord);
  if (type === 'SYNC_ABOUT') return publicAbout(payload);
  if (type === 'PRESENCE_PING' && payload && typeof payload === 'object') {
    const { email: _email, ...presence } = payload;
    return presence;
  }
  if (['NEW_CHAT_MESSAGE', 'NEW_QUESTION', 'NEW_SOLUTION', 'NEW_CLUB_POST'].includes(type) && payload && typeof payload === 'object') {
    return publicAuthoredItem(payload);
  }
  return payload;
}

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const declaredLength = Number(req.headers['content-length'] || 0);
    if (declaredLength > MAX_REQUEST_BODY_BYTES) {
      const error = Object.assign(new Error('Request body too large'), { statusCode: 413 });
      reject(error);
      req.resume();
      return;
    }
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;
    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    req.on('data', (chunk: Buffer | string) => {
      if (settled) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer.length;
      if (totalBytes > MAX_REQUEST_BODY_BYTES) {
        req.resume();
        rejectOnce(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
        return;
      }
      chunks.push(buffer);
    });
    req.on('end', () => {
      if (settled) return;
      try {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve(body ? JSON.parse(body) : {});
      } catch {
        rejectOnce(Object.assign(new Error('Malformed JSON body'), { statusCode: 400 }));
      }
    });
    req.on('error', error => rejectOnce(error));
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

function sendRequestError(res: ServerResponse, error: any) {
  const status = Number(error?.statusCode);
  if (status === 400 || status === 413) {
    sendJson(res, status, { success: false, message: status === 413 ? 'Yêu cầu vượt quá kích thước cho phép.' : 'Dữ liệu gửi lên không hợp lệ.' });
    return;
  }
  sendJson(res, 500, { success: false, message: 'Lỗi máy chủ nội bộ.' });
}

async function verifySocialCredential(provider: string, credential: string): Promise<{ name: string; email: string; avatar?: string } | null> {
  if (!['google', 'facebook'].includes(provider) || typeof credential !== 'string' || credential.length < 20 || credential.length > 4096) return null;
  try {
    let profileUrl: string;
    if (provider === 'google') {
      const clientId = process.env.FFORUM_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
      if (!clientId) return null;
      const tokenInfoResponse = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(credential)}`,
        { signal: AbortSignal.timeout(5_000) },
      );
      if (!tokenInfoResponse.ok) return null;
      const tokenInfo: any = await tokenInfoResponse.json();
      if (tokenInfo?.aud !== clientId || (tokenInfo?.azp && tokenInfo.azp !== clientId)) return null;
      profileUrl = 'https://www.googleapis.com/oauth2/v3/userinfo';
    } else {
      const appId = process.env.FFORUM_FACEBOOK_APP_ID || process.env.VITE_FACEBOOK_APP_ID || '';
      const appSecret = process.env.FFORUM_FACEBOOK_APP_SECRET || '';
      if (!appId || !appSecret) return null;
      const debugUrl = new URL('https://graph.facebook.com/debug_token');
      debugUrl.searchParams.set('input_token', credential);
      debugUrl.searchParams.set('access_token', `${appId}|${appSecret}`);
      const debugResponse = await fetch(debugUrl, { signal: AbortSignal.timeout(5_000) });
      if (!debugResponse.ok) return null;
      const debugResult: any = await debugResponse.json();
      if (debugResult?.data?.is_valid !== true || String(debugResult.data.app_id) !== appId || !debugResult.data.user_id) return null;
      profileUrl = 'https://graph.facebook.com/me?fields=id,name,email,picture.width(200).height(200)';
      const profileResponse = await fetch(profileUrl, {
        headers: { Authorization: `Bearer ${credential}` },
        signal: AbortSignal.timeout(5_000),
      });
      if (!profileResponse.ok) return null;
      const profile: any = await profileResponse.json();
      if (String(profile?.id) !== String(debugResult.data.user_id)) return null;
      return normalizeSocialProfile(provider, profile);
    }

    const response = await fetch(profileUrl, {
      headers: { Authorization: `Bearer ${credential}` },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    const profile: any = await response.json();
    return normalizeSocialProfile(provider, profile);
  } catch {
    return null;
  }
}

function normalizeSocialProfile(provider: string, profile: any): { name: string; email: string; avatar?: string } | null {
  const email = typeof profile?.email === 'string' ? profile.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  if (provider === 'google' && profile.email_verified !== true) return null;
  const avatar = provider === 'google' ? profile.picture : profile.picture?.data?.url;
  return {
    name: asSafeText(profile.name || profile.given_name, 60) || (provider === 'google' ? 'Google User' : 'Facebook User'),
    email,
    ...(typeof avatar === 'string' && avatar.startsWith('https://') ? { avatar: avatar.slice(0, 2_000) } : {}),
  };
}

function adminPermissionForRequest(method: string, url: string): string | null {
  const key = `${method.toUpperCase()} ${url}`;
  const routePermissions: Record<string, string> = {
    'GET /api/admin/me': 'admin.access',
    'GET /api/admin/console': 'analytics.view',
    'GET /api/admin/overview': 'analytics.view',
    'GET /api/admin/users': 'users.view',
    'GET /api/admin/posts': 'posts.view',
    'GET /api/admin/reports': 'reports.view',
    'GET /api/admin/logs': 'logs.view',
    'GET /api/admin/settings': 'settings.view',
    'GET /api/admin/about': 'settings.view',
    'POST /api/admin/users/role': 'users.role',
    'POST /api/admin/users/delete': 'users.delete',
    'POST /api/admin/users/moderation': 'users.edit',
    'POST /api/admin/reports/review': 'reports.resolve',
    'POST /api/admin/club-posts/delete': 'posts.delete',
    'POST /api/admin/about': 'settings.edit',
    'POST /api/admin/settings': 'settings.edit',
    'POST /api/questions/delete': 'posts.delete',
    'POST /api/questions/edit': 'posts.edit',
    'POST /api/solutions/delete': 'posts.delete',
    'POST /api/chat/delete': 'posts.delete',
  };
  if (routePermissions[key]) return routePermissions[key];
  return url.startsWith('/api/admin/') ? 'admin.access' : null;
}

function isAdminSensitiveLegacyRoute(method: string, url: string): boolean {
  return adminPermissionForRequest(method, url) !== null && !url.startsWith('/api/admin/');
}

function getAuditTargetForRequest(req: IncomingMessage): { id: string; name: string } {
  const route = requestPath(req).slice(0, 128);
  return { id: route, name: route };
}

/** Test-only fixture helper; production callers are rejected. No HTTP route exposes this path. */
export function setUserRoleForTest(email: string, role: UserRecord['role']): UserRecord {
  if (!isNodeTestProcess) throw new Error('Test role fixture is available only under Node’s test runner.');
  const key = email.trim().toLowerCase();
  const user = store.users[key];
  if (!user) throw new Error('Test role fixture requires an existing registered user.');
  user.role = role;
  user.updatedAt = new Date().toISOString();
  store.users[key] = user;
  persistStoreToDisk();
  return { ...user, scopedClubIds: [...user.scopedClubIds] };
}

export function setupForumServer(httpServer: any, middlewares: any) {
  const storeReady = loadStoreFromDisk();

  if (httpServer) {
    const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });

    httpServer.on('upgrade', (req: IncomingMessage, socket: any, head: any) => {
      if (requestPath(req) !== '/ws' && requestPath(req) !== '/api/ws') return;
      if (!isSameOriginRequest(req)) {
        try {
          socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
        } catch {
          socket.destroy();
        }
        return;
      }
      if (!getAuthenticatedUser(req)) {
        try {
          socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
        } catch {
          socket.destroy();
        }
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    });

    wss.on('connection', (ws, req) => {
      const connectedUser = getAuthenticatedUser(req);
      if (!connectedUser) {
        ws.close(4001, 'Authentication required');
        return;
      }
      wsClients.add(ws);
      wsClientUsers.set(ws, connectedUser.id);
      ws.send(JSON.stringify({ type: 'WS_CONNECTED', payload: { clientCount: wsClients.size } }));
      let messageCount = 0;
      let messageWindowStart = Date.now();

      ws.on('message', (messageRaw) => {
        if (Date.now() - messageWindowStart >= 60_000) {
          messageCount = 0;
          messageWindowStart = Date.now();
        }
        messageCount += 1;
        if (messageCount > 60) {
          ws.close(1008, 'Rate limit exceeded');
          return;
        }
        try {
          const message = JSON.parse(messageRaw.toString());
          if (!message || typeof message !== 'object') return;
          if (message.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG' }));
            return;
          }
          if (message.type === 'PRESENCE_PING') {
            const presence = safePresencePayload(message.payload, getAuthenticatedUser(req), req);
            broadcastServerEvent('PRESENCE_PING', presence);
            return;
          }
          // Persistent state and moderation may only be changed through the
          // authenticated, validated HTTP API—not client-originated broadcasts.
          ws.send(JSON.stringify({
            type: 'WS_ERROR',
            payload: { status: 403, message: 'Client-originated write events are not allowed.' },
          }));
        } catch {
          ws.close(1007, 'Invalid message');
        }
      });

      ws.on('close', () => {
        wsClients.delete(ws);
        wsClientUsers.delete(ws);
      });
      ws.on('error', () => {
        wsClients.delete(ws);
        wsClientUsers.delete(ws);
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
    }, 25_000);
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
    await storeReady;
    setSecurityHeaders(res);
    const url = requestPath(req);
    const method = req.method || 'GET';

    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && url.startsWith('/api/') && !isSameOriginRequest(req)) {
      sendJson(res, 403, { success: false, message: 'Yêu cầu khác nguồn bị từ chối.' });
      return;
    }
    const fetchSite = req.headers['sec-fetch-site'];
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' &&
        typeof fetchSite === 'string' && fetchSite !== 'same-origin') {
      sendJson(res, 403, { success: false, message: 'Yêu cầu khác nguồn bị từ chối.' });
      return;
    }
    if (method === 'OPTIONS' && url.startsWith('/api/')) {
      res.statusCode = 204;
      res.setHeader('Allow', 'GET, POST, OPTIONS');
      res.end();
      return;
    }
    if (url.startsWith('/api/') && Number(req.headers['content-length'] || 0) > MAX_REQUEST_BODY_BYTES) {
      sendJson(res, 413, { success: false, message: 'Yêu cầu vượt quá kích thước cho phép.' });
      req.resume();
      return;
    }
    const isMutatingMethod = !['GET', 'HEAD', 'OPTIONS'].includes(method);
    const adminPermission = adminPermissionForRequest(method, url);
    let authenticatedUser: UserRecord | null = null;

    if (isMutatingMethod && url.startsWith('/api/')) {
      const isAuthentication = url.startsWith('/api/auth/');
      const ipRetryAfter = isAuthentication
        ? consumeRateLimit(req, `auth:${url}`, 20, 15 * 60_000)
        : consumeRateLimit(req, 'write', 120, 60_000);
      if (ipRetryAfter !== null) {
        res.setHeader('Retry-After', String(ipRetryAfter));
        sendJson(res, 429, { success: false, message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.' });
        return;
      }
      if (url === '/api/feedback') {
        const feedbackRetryAfter = consumeRateLimit(req, 'public-feedback', 20, 60 * 60_000);
        if (feedbackRetryAfter !== null) {
          res.setHeader('Retry-After', String(feedbackRetryAfter));
          sendJson(res, 429, { success: false, message: 'Bạn đã gửi quá nhiều góp ý. Vui lòng thử lại sau.' });
          return;
        }
      }
      if (!UNAUTHENTICATED_POST_PATHS.has(url)) {
        authenticatedUser = getAuthenticatedUser(req);
        if (!authenticatedUser) {
          sendJson(res, 401, { success: false, message: 'Vui lòng đăng nhập để tiếp tục.' });
          return;
        }
        (req as AuthenticatedRequest).forumUser = authenticatedUser;
      }
    }

    // Every /api/admin route is authenticated, including GETs and unknown endpoints.
    // Legacy moderation URLs are also mapped to explicit permissions for compatibility.
    if (url.startsWith('/api/admin/') || isAdminSensitiveLegacyRoute(method, url)) {
      authenticatedUser ||= getAuthenticatedUser(req);
      if (!authenticatedUser) {
        sendJson(res, 401, { success: false, message: 'Vui lòng đăng nhập để tiếp tục.' });
        return;
      }
      (req as AuthenticatedRequest).forumUser = authenticatedUser;
      const permission = adminPermission || 'admin.access';
      if (!hasPermission(authenticatedUser, permission)) {
        const target = getAuditTargetForRequest(req);
        addSecurityAuditEvent(req, 'authorization_denied', target.id, target.name, 'failure', authenticatedUser);
        persistStoreToDisk();
        sendJson(res, 403, { success: false, message: 'Bạn không có quyền thực hiện thao tác này.' });
        return;
      }
      const routeKey = url.startsWith('/api/admin/') ? url : `legacy:${url}`;
      const retryAfter = consumeRateLimitByKey(`admin-route:${authenticatedUser.id}:${routeKey}`, 40, 60_000);
      if (retryAfter !== null) {
        res.setHeader('Retry-After', String(retryAfter));
        sendJson(res, 429, { success: false, message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.' });
        return;
      }
    }

    if (isMutatingMethod && url.startsWith('/api/') &&
        !UNAUTHENTICATED_POST_PATHS.has(url) && !authenticatedUser) {
      authenticatedUser = getAuthenticatedUser(req);
      if (!authenticatedUser) {
        sendJson(res, 401, { success: false, message: 'Vui lòng đăng nhập để tiếp tục.' });
        return;
      }
      (req as AuthenticatedRequest).forumUser = authenticatedUser;
    }

    if (isMutatingMethod && authenticatedUser && !url.startsWith('/api/admin/') && !isAdminSensitiveLegacyRoute(method, url)) {
      const accountRetryAfter = consumeRateLimitByKey(`account-write:${authenticatedUser.id}`, 60, 60_000);
      const routeLimit = ACCOUNT_ROUTE_RATE_LIMITS[url];
      const routeRetryAfter = routeLimit
        ? consumeRateLimitByKey(`account-route:${authenticatedUser.id}:${url}`, routeLimit.maxRequests, routeLimit.windowMs)
        : null;
      const retryAfter = Math.max(accountRetryAfter || 0, routeRetryAfter || 0);
      if (retryAfter > 0) {
        res.setHeader('Retry-After', String(retryAfter));
        sendJson(res, 429, { success: false, message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.' });
        return;
      }
    }

    if (url.startsWith('/api/admin/') && method === 'GET') {
      const routeLimit = ACCOUNT_READ_ROUTE_RATE_LIMITS[url];
      if (routeLimit && authenticatedUser) {
        const retryAfter = consumeRateLimitByKey(`account-read:${authenticatedUser.id}:${url}`, routeLimit.maxRequests, routeLimit.windowMs);
        if (retryAfter !== null) {
          res.setHeader('Retry-After', String(retryAfter));
          sendJson(res, 429, { success: false, message: 'Bạn gửi quá nhiều yêu cầu đọc dữ liệu. Vui lòng thử lại sau.' });
          return;
        }
      }
    }

    const protectedReadRoute = method === 'GET'
      ? url.startsWith('/api/sync')
        ? '/api/sync'
        : url.startsWith('/api/events')
          ? '/api/events'
          : url === '/api/rewards/daily/state'
            ? '/api/rewards/daily/state'
            : null
      : null;
    if (protectedReadRoute) {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { success: false, message: 'Vui lòng đăng nhập để đồng bộ dữ liệu diễn đàn.' });
        return;
      }
      (req as AuthenticatedRequest).forumUser = user;
      const routeLimit = ACCOUNT_READ_ROUTE_RATE_LIMITS[protectedReadRoute];
      const retryAfter = consumeRateLimitByKey(
        `account-read:${user.id}:${protectedReadRoute}`,
        routeLimit.maxRequests,
        routeLimit.windowMs,
      );
      if (retryAfter !== null) {
        res.setHeader('Retry-After', String(retryAfter));
        sendJson(res, 429, { success: false, message: 'Bạn gửi quá nhiều yêu cầu đọc dữ liệu. Vui lòng thử lại sau.' });
        return;
      }
    }

    if (method === 'GET' && url.startsWith('/api/events')) {
      const viewer = getAuthenticatedUser(req);
      if (!viewer) {
        sendJson(res, 401, { success: false, message: 'Vui lòng đăng nhập để nhận cập nhật thời gian thực.' });
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      });
      res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientCount: sseClients.size + 1 })}\n\n`);
      sseClients.add(res);
      sseClientUsers.set(res, viewer.id);

      let heartbeat: ReturnType<typeof setInterval> | undefined;
      let forgotten = false;
      const forgetClient = () => {
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = undefined;
        }
        if (forgotten) return;
        forgotten = true;
        sseClients.delete(res);
        sseClientUsers.delete(res);
      };
      req.on('close', forgetClient);
      res.on('close', forgetClient);

      heartbeat = setInterval(() => {
        if (res.destroyed || res.writableEnded) {
          forgetClient();
          return;
        }
        try {
          res.write(':keepalive\n\n');
        } catch {
          forgetClient();
        }
      }, 20000);
      heartbeat.unref();

      return;
    }

    if (method === 'GET' && url === '/api/auth/session') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        sendJson(res, 401, { success: false, message: 'Phiên đăng nhập không còn hợp lệ.' });
        return;
      }
      sendJson(res, 200, { success: true, user });
      return;
    }

    if (method === 'GET' && url === '/api/rewards/daily/state') {
      const user = getAuthenticatedUser(req)!;
      const today = vietnamDateKey();
      const { state, changed } = getUserDailyRewardState(user, today);
      if (changed) persistStoreToDisk();
      sendJson(res, 200, { success: true, state: toDailyRewardSummary(state, today) });
      return;
    }

    if (method === 'GET' && url.startsWith('/api/sync')) {
      const viewer = getAuthenticatedUser(req);
      if (!viewer) {
        sendJson(res, 401, { success: false, message: 'Vui lòng đăng nhập để đồng bộ dữ liệu diễn đàn.' });
        return;
      }
      const publicUsers = Object.fromEntries(Object.values(store.users).map(user => {
        const safeUser = publicUser(user);
        return [safeUser.email, safeUser];
      }));
      const publicQuestions = store.questions.map(question => {
        const safeQuestion = publicAuthoredItem(question);
        // An anonymous author gets their own identity back for account features; everyone else sees no account identifier.
        if (question.isAnonymous && question.authorId === viewer.id) safeQuestion.authorId = viewer.id;
        return safeQuestion;
      });
      sendJson(res, 200, {
        success: true,
        data: {
          users: publicUsers,
          clubs: store.clubs,
          clubPosts: store.clubPosts.map(post => publicAuthoredItem(post)),
          questions: publicQuestions,
          solutions: store.solutions.map(solution => publicAuthoredItem(solution)),
          chatMessages: store.chatMessages.map(message => publicAuthoredItem(message)),
          feedbacks: [],
          about: publicAbout(),
        },
      });
      return;
    }

    if (method === 'POST' && url === '/api/clubs/posts') {
      try {
        const body = await parseJsonBody(req);
        const user = (req as AuthenticatedRequest).forumUser!;
        const clubId = asSafeText(body.clubId, 128);
        const title = asSafeText(body.title, 100);
        const content = asSafeText(body.content, 1_000);
        const isAuthorizedLeader = (user.scopedClubIds || []).includes(clubId);
        if (!hasPermission(user, 'posts.edit') && !isAuthorizedLeader) {
          sendJson(res, 403, { success: false, message: 'Chỉ Chủ nhiệm được cấp quyền hoặc Super Admin mới có thể đăng bài trong CLB này.' });
          return;
        }
        if (!clubId || title.length < 2 || !content) {
          sendJson(res, 400, { success: false, message: 'Vui lòng nhập tiêu đề và nội dung bài viết hợp lệ.' });
          return;
        }
        const post = {
          id: `cpost-${randomBytes(12).toString('hex')}`,
          clubId,
          authorId: user.id,
          authorName: user.name,
          authorAvatar: user.avatar,
          title,
          content,
          createdAt: new Date().toISOString(),
          likes: 0,
        };
        store.clubPosts.push(post);
        if (store.clubPosts.length > 5_000) store.clubPosts.splice(0, store.clubPosts.length - 5_000);
        persistStoreToDisk();
        broadcastServerEvent('NEW_CLUB_POST', post);
        sendJson(res, 200, { success: true, post });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/chat') {
      try {
        const body = await parseJsonBody(req);
        const user = (req as AuthenticatedRequest).forumUser!;
        const activeMute = getActiveChatMute(user.id);
        if (activeMute) {
          const expiry = activeMute.mutedUntil
            ? ` đến ${new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date(activeMute.mutedUntil))}`
            : ' vô thời hạn';
          sendJson(res, 403, {
            success: false,
            code: 'CHAT_MUTED',
            mutedUntil: activeMute.mutedUntil,
            message: `Tài khoản đang bị tạm ngưng quyền nhắn tin${expiry}.`,
          });
          return;
        }
        const content = typeof body.content === 'string' ? body.content.trim() : '';
        const validChannels = new Set(['hallway', 'quick-qa', 'confessions', 'club-hub']);
        if (!content || content.length > 2_000 || !validChannels.has(body.channelId)) {
          sendJson(res, 400, { success: false, message: 'Tin nhắn không hợp lệ.' });
          return;
        }

        const msg = {
          id: `msg-${randomBytes(12).toString('hex')}`,
          channelId: body.channelId,
          authorId: user.id,
          authorName: user.name,
          authorEmail: user.email,
          authorAvatar: user.avatar,
          authorLevel: user.level,
          authorRole: user.role,
          content,
          senderId: asSafeText(body.senderId, 100),
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          timestampMs: Date.now(),
        };

        store.chatMessages.push(msg);
        if (store.chatMessages.length > 5_000) store.chatMessages.splice(0, store.chatMessages.length - 5_000);
        persistStoreToDisk();
        broadcastServerEvent('NEW_CHAT_MESSAGE', msg);
        sendJson(res, 200, { success: true, message: msg });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/presence') {
      try {
        const body = await parseJsonBody(req);
        const presence = safePresencePayload(body?.user, getAuthenticatedUser(req), req);
        broadcastServerEvent('PRESENCE_PING', presence);
        sendJson(res, 200, { success: true });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/questions') {
      try {
        const body = await parseJsonBody(req);
        const user = (req as AuthenticatedRequest).forumUser!;
        const title = typeof body.title === 'string' ? body.title.trim() : '';
        const content = typeof body.content === 'string' ? body.content.trim() : '';
        if (!title || title.length > 200 || !content || content.length > 20_000 || !isSafeQaImage(body.imageUrl)) {
          sendJson(res, 400, { success: false, message: 'Tiêu đề, nội dung hoặc hình ảnh câu hỏi không hợp lệ.' });
          return;
        }
        const requestedBounty = Number(body.bountyCoin);
        const bountyCoin = body.bountyCoin ? Math.max(10, Math.min(100, Number.isFinite(requestedBounty) ? Math.floor(requestedBounty) : 20)) : 20;
        if ((user.coin ?? 100) < bountyCoin) {
          sendJson(res, 400, { success: false, message: 'Bạn không đủ Coin để đặt phần thưởng cho câu hỏi.' });
          return;
        }
        const requestedId = asSafeText(body.id, 100);
        const id = /^[a-zA-Z0-9_-]+$/.test(requestedId) ? requestedId : `q-${randomBytes(12).toString('hex')}`;
        if (store.questions.some(question => question.id === id)) {
          sendJson(res, 409, { success: false, message: 'Câu hỏi này đã được gửi.' });
          return;
        }
        const isAnonymous = Boolean(body.isAnonymous);
        const newQuestion = {
          id,
          title,
          subject: asSafeText(body.subject, 40) || 'toan',
          content,
          authorId: user.id,
          authorName: isAnonymous ? (asSafeText(body.anonymousAlias || body.authorName, 60) || 'Ẩn danh') : user.name,
          authorAvatar: isAnonymous ? DEFAULT_AVATAR : user.avatar,
          authorEmail: user.email,
          isAnonymous,
          anonymousAlias: isAnonymous ? (asSafeText(body.anonymousAlias || body.authorName, 60) || 'Ẩn danh') : undefined,
          anonymousMask: isAnonymous ? DEFAULT_AVATAR : undefined,
          createdAt: 'Vừa xong',
          createdAtMs: Date.now(),
          isSolved: false,
          views: 1,
          bountyCoin,
          imageUrl: typeof body.imageUrl === 'string' && body.imageUrl ? body.imageUrl : undefined,
        };

        store.questions.unshift(newQuestion);
        user.coin = Math.max(0, (user.coin ?? 100) - bountyCoin);
        user.xp += 50;
        user.fPoints = (user.fPoints ?? user.xp) + 50;
        user.level = calculateLevelFromXP(user.xp);
        broadcastServerEvent('SYNC_USER', user);
        persistStoreToDisk();
        broadcastServerEvent('NEW_QUESTION', newQuestion);
        sendJson(res, 200, { success: true, question: newQuestion, user });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/solutions') {
      try {
        const body = await parseJsonBody(req);
        const user = (req as AuthenticatedRequest).forumUser!;
        const questionId = asSafeText(body.questionId, 100);
        const targetQuestion = store.questions.find(question => question.id === questionId);
        const content = typeof body.content === 'string' ? body.content.trim() : '';
        if (!questionId || !targetQuestion || !content || content.length > 20_000 || !isSafeQaImage(body.imageUrl)) {
          sendJson(res, 400, { success: false, message: 'Lời giải, câu hỏi hoặc hình ảnh không hợp lệ.' });
          return;
        }
        if (targetQuestion.isAnonymous && targetQuestion.authorId === user.id) {
          sendJson(res, 403, { success: false, message: 'Không thể trả lời câu hỏi ẩn danh do chính tài khoản của bạn tạo.' });
          return;
        }
        if (store.solutions.some(solution => solution.questionId === questionId && solution.authorId === user.id)) {
          sendJson(res, 409, { success: false, message: 'Bạn đã gửi lời giải cho câu hỏi này rồi.' });
          return;
        }
        const requestedId = asSafeText(body.id, 100);
        const id = /^[a-zA-Z0-9_-]+$/.test(requestedId) ? requestedId : `sol-${randomBytes(12).toString('hex')}`;
        if (store.solutions.some(solution => solution.id === id)) {
          sendJson(res, 409, { success: false, message: 'Lời giải này đã được gửi.' });
          return;
        }
        const newSolution = {
          id,
          questionId,
          authorId: user.id,
          authorName: user.name,
          authorEmail: user.email,
          authorAvatar: user.avatar,
          authorLevel: user.level,
          authorRole: user.role,
          content,
          createdAt: 'Vừa xong',
          createdAtMs: Date.now(),
          isBest: false,
          upvotes: 1,
          imageUrl: typeof body.imageUrl === 'string' && body.imageUrl ? body.imageUrl : undefined,
        };

        store.solutions.push(newSolution);
        user.xp += 25;
        user.fPoints = (user.fPoints ?? user.xp) + 25;
        user.level = calculateLevelFromXP(user.xp);
        broadcastServerEvent('SYNC_USER', user);
        persistStoreToDisk();
        broadcastServerEvent('NEW_SOLUTION', newSolution);
        sendJson(res, 200, { success: true, solution: newSolution, user });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/solutions/best') {
      try {
        const body = await parseJsonBody(req);
        const user = (req as AuthenticatedRequest).forumUser!;
        const questionId = asSafeText(body.questionId, 100);
        const solutionId = asSafeText(body.solutionId, 100);
        const targetQ = store.questions.find(q => q.id === questionId);
        const selectedSolution = store.solutions.find(s => s.id === solutionId && s.questionId === questionId);
        if (!targetQ || !selectedSolution) {
          sendJson(res, 404, { success: false, message: 'Không tìm thấy câu hỏi hoặc lời giải.' });
          return;
        }
        if (user.role !== 'super_admin' && targetQ.authorId !== user.id) {
          sendJson(res, 403, { success: false, message: 'Chỉ tác giả câu hỏi hoặc Super Admin mới có quyền xác nhận đáp án chuẩn.' });
          return;
        }
        if (targetQ.isSolved) {
          sendJson(res, 409, { success: false, message: 'Câu hỏi đã có đáp án chuẩn.' });
          return;
        }
        if (selectedSolution.authorId === targetQ.authorId) {
          sendJson(res, 403, { success: false, message: 'Tác giả không thể tự trao Coin thưởng cho lời giải của chính mình.' });
          return;
        }

        store.questions = store.questions.map(question =>
          question.id === questionId ? { ...question, isSolved: true, bestSolutionId: solutionId } : question
        );
        store.solutions = store.solutions.map(solution => {
          if (solution.questionId !== questionId) return solution;
          return solution.id === solutionId
            ? { ...solution, isBest: true, upvotes: (solution.upvotes || 0) + 5 }
            : { ...solution, isBest: false };
        });

        const solver = store.users[selectedSolution.authorEmail?.toLowerCase() || ''];
        if (solver) {
          const bounty = Number(targetQ.bountyCoin) || 20;
          const solverAward = Math.floor(bounty * 0.5) + 100;
          solver.coin = (solver.coin ?? 100) + solverAward;
          solver.xp += solverAward;
          solver.fPoints = (solver.fPoints ?? solver.xp) + solverAward;
          solver.level = calculateLevelFromXP(solver.xp);
          broadcastServerEvent('SYNC_USER', solver);
        }

        persistStoreToDisk();
        broadcastServerEvent('MARK_BEST_SOLUTION', { questionId, solutionId });
        sendJson(res, 200, { success: true });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/auth/register') {
      try {
        const body = await parseJsonBody(req);
        const name = asSafeText(body.name, 60);
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';

        if (!name) {
          sendJson(res, 400, { success: false, message: 'Vui lòng nhập họ và tên của bạn.' });
          return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          sendJson(res, 400, { success: false, message: 'Vui lòng nhập địa chỉ email hợp lệ.' });
          return;
        }
        if (password.length < 12 || password.length > 128) {
          sendJson(res, 400, { success: false, message: 'Mật khẩu phải có từ 12 đến 128 ký tự.' });
          return;
        }
        if (email.endsWith(RETIRED_VIRTUAL_DOMAIN)) {
          sendJson(res, 400, { success: false, message: 'Miền email này không còn được hỗ trợ.' });
          return;
        }
        // Pay the same password-hashing cost for an existing address so the
        // registration response is less useful as a timing-based account oracle.
        const passwordHash = await hashPassword(password);
        if (store.users[email]) {
          addSecurityAuditEvent(req, 'auth_register_duplicate', `email:${createHash('sha256').update(email).digest('hex').slice(0, 20)}`, 'Account registration', 'failure');
          persistStoreToDisk();
          sendJson(res, 202, {
            success: true,
            message: 'Nếu tài khoản có thể được tạo, bạn có thể đăng nhập để tiếp tục.',
          });
          return;
        }

        const now = new Date().toISOString();
        const newUser: UserRecord = {
          id: `user-${randomBytes(16).toString('hex')}`,
          name,
          email,
          avatar: DEFAULT_AVATAR,
          role: 'user',
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
          level: 1,
          xp: 0,
          coin: 100,
          fPoints: 0,
          streakCount: 0,
          bio: '',
          gender: 'Chưa cập nhật',
          city: 'Chưa cập nhật',
          className: 'Chưa cập nhật',
          joinedAt: now,
          scopedClubIds: [],
          inventory: [],
        };
        store.users[email] = newUser;
        store.passwords[email] = passwordHash;
        addSecurityAuditEvent(req, 'auth_register', newUser.id, newUser.name, 'success', newUser);
        persistStoreToDisk();
        // Do not broadcast account creation: realtime listeners must not be able
        // to distinguish a new address from an already-registered one.
        sendJson(res, 202, {
          success: true,
          message: 'Nếu tài khoản có thể được tạo, bạn có thể đăng nhập để tiếp tục.',
        });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/auth/login') {
      try {
        const body = await parseJsonBody(req);
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';
        const emailKey = createHash('sha256').update(email.slice(0, 254)).digest('hex');
        const emailRetryAfter = consumeRateLimitByKey(`auth-login-email:${emailKey}`, 10, 15 * 60_000);
        if (emailRetryAfter !== null) {
          res.setHeader('Retry-After', String(emailRetryAfter));
          addSecurityAuditEvent(req, 'auth_login_rate_limited', `email:${emailKey.slice(0, 20)}`, 'Password login', 'failure');
          persistStoreToDisk();
          sendJson(res, 429, { success: false, message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.' });
          return;
        }
        const user = store.users[email];
        const storedPassword = user ? store.passwords[email] : undefined;
        let valid = false;

        if (isPasswordHash(storedPassword) && password.length <= 128) {
          valid = await verifyPasswordHash(password, storedPassword);
          const storedIterations = Number(storedPassword.split('$')[1]);
          if (valid && storedIterations < PASSWORD_HASH_ITERATIONS) {
            store.passwords[email] = await hashPassword(password);
          }
        } else {
          await verifyPasswordHash(password.slice(0, 128), await getDummyPasswordHash());
        }

        if (!valid || !user || isAccountLocked(user.id)) {
          const targetId = user?.id || `email:${emailKey.slice(0, 20)}`;
          addSecurityAuditEvent(req, 'auth_login_failure', targetId, 'Password login', 'failure', user || null);
          persistStoreToDisk();
          sendJson(res, 401, { success: false, message: 'Thông tin đăng nhập không chính xác.' });
          return;
        }

        const now = new Date().toISOString();
        user.lastLoginAt = now;
        user.updatedAt = now;
        addSecurityAuditEvent(req, 'auth_login_success', user.id, user.name, 'success', user);
        persistStoreToDisk();
        createSession(req, res, user);
        sendJson(res, 200, { success: true, user });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/auth/social') {
      try {
        const body = await parseJsonBody(req);
        const provider = typeof body.provider === 'string' ? body.provider : '';
        const credential = typeof body.credential === 'string' ? body.credential : '';
        if (!['google', 'facebook'].includes(provider)) {
          addSecurityAuditEvent(req, 'auth_social_failure', provider || 'unknown-provider', 'Social login', 'failure');
          persistStoreToDisk();
          sendJson(res, 400, { success: false, message: 'Nhà cung cấp đăng nhập không hợp lệ.' });
          return;
        }
        const identity = await verifySocialCredential(provider, credential);
        if (!identity) {
          addSecurityAuditEvent(req, 'auth_social_failure', provider, 'Social login', 'failure');
          persistStoreToDisk();
          sendJson(res, 401, { success: false, message: 'Không thể xác thực tài khoản mạng xã hội.' });
          return;
        }
        if (identity.email.endsWith(RETIRED_VIRTUAL_DOMAIN)) {
          addSecurityAuditEvent(req, 'auth_social_failure', provider, 'Social login', 'failure');
          persistStoreToDisk();
          sendJson(res, 401, { success: false, message: 'Không thể xác thực tài khoản mạng xã hội.' });
          return;
        }

        const now = new Date().toISOString();
        let user = store.users[identity.email];
        if (!user) {
          user = {
            id: `user-${randomBytes(16).toString('hex')}`,
            name: identity.name,
            email: identity.email,
            avatar: identity.avatar || DEFAULT_AVATAR,
            role: 'user',
            createdAt: now,
            updatedAt: now,
            lastLoginAt: now,
            level: 1,
            xp: 0,
            coin: 100,
            fPoints: 0,
            streakCount: 0,
            bio: '',
            gender: 'Chưa cập nhật',
            city: 'Chưa cập nhật',
            className: 'Chưa cập nhật',
            joinedAt: now,
            scopedClubIds: [],
            inventory: [],
          };
          store.users[identity.email] = user;
        }
        if (isAccountLocked(user.id)) {
          addSecurityAuditEvent(req, 'auth_social_failure', user.id, user.name, 'failure', user);
          persistStoreToDisk();
          sendJson(res, 401, { success: false, message: 'Không thể xác thực tài khoản mạng xã hội.' });
          return;
        }
        // Provider-verified identity can update only ordinary public profile fields.
        if (user.role === 'user' && identity.avatar && user.avatar === DEFAULT_AVATAR) user.avatar = identity.avatar;
        user.lastLoginAt = now;
        user.updatedAt = now;
        addSecurityAuditEvent(req, 'auth_social_success', user.id, user.name, 'success', user);
        persistStoreToDisk();
        broadcastServerEvent('SYNC_USER', user);
        createSession(req, res, user);
        sendJson(res, 200, { success: true, user });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/auth/logout') {
      const actor = getAuthenticatedUser(req);
      const token = getSessionToken(req);
      addSecurityAuditEvent(req, 'auth_logout', actor?.id || 'session', actor?.name || 'Session', 'success', actor);
      clearSession(req, res);
      if (token) persistStoreToDisk();
      sendJson(res, 200, { success: true });
      return;
    }

    if (method === 'POST' && url === '/api/feedback') {
      try {
        const body = await parseJsonBody(req);
        const name = asSafeText(body.name, 80);
        const email = asSafeText(body.email, 254).toLowerCase();
        const category = asSafeText(body.category, 80) || 'Góp ý khác';
        const content = asSafeText(body.content, 5_000);

        if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !content) {
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

        const submission = {
          id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name,
          email,
          category,
          content,
          createdAt: new Date().toISOString(),
        };

        store.feedbacks.push(submission);
        persistStoreToDisk();
        broadcastServerEvent('NEW_FEEDBACK', submission);
        sendJson(res, 200, {
          success: true,
          message: 'Cảm ơn bạn! Ý kiến đóng góp đã được chuyển tới Ban Quản Trị.',
        });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/reports') {
      try {
        const body = await parseJsonBody(req);
        const reporter = (req as AuthenticatedRequest).forumUser!;
        const reporterId = reporter.id;
        const reporterName = reporter.name;
        const reporterEmail = reporter.email;
        const reportedUserId = asSafeText(body.reportedUserId, 128);
        const reportedUserName = asSafeText(body.reportedUserName, 80);
        const reason = asSafeText(body.reason, 200);
        const details = asSafeText(body.details, 5_000);

        if (!reportedUserId || !reason) {
          sendJson(res, 400, { success: false, message: 'Vui lòng cung cấp lý do tố cáo!' });
          return;
        }

        const reportSubmission = {
          id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          reporterId,
          reporterName,
          reporterEmail,
          reportedUserId,
          reportedUserName,
          reason,
          details,
          createdAt: new Date().toISOString(),
          status: 'open',
        };

        if (!store.reports) {
          store.reports = [];
        }
        store.reports.push(reportSubmission);
        persistStoreToDisk();
        broadcastServerEvent('NEW_REPORT', reportSubmission);
        sendJson(res, 200, {
          success: true,
          message: 'Báo cáo vi phạm đã được ghi nhận và chuyển tới Ban Quản Trị để xử lý theo nội quy.',
          reportId: reportSubmission.id,
        });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/rewards/coin') {
      sendJson(res, 410, {
        success: false,
        message: 'Phần thưởng Coin phải được xác nhận bằng hành động hợp lệ trên máy chủ.',
      });
      return;
    }

    if (method === 'POST' && url === '/api/rewards/daily/attendance') {
      try {
        await parseJsonBody(req);
        const user = (req as AuthenticatedRequest).forumUser!;
        const today = vietnamDateKey();
        const { state, changed } = getUserDailyRewardState(user, today);
        if (state.lastAttendanceDate === today) {
          if (changed) persistStoreToDisk();
          sendJson(res, 200, {
            success: true,
            alreadyClaimed: true,
            rewardCoins: 0,
            state: toDailyRewardSummary(state, today),
            user,
          });
          return;
        }
        if (!creditDailyRewardCoins(user, 25, today)) {
          if (changed) persistStoreToDisk();
          sendJson(res, 403, { success: false, message: 'Đã đạt giới hạn Coin thưởng trong ngày.' });
          return;
        }

        const nextStreak = getNextAttendanceStreak(state.lastAttendanceDate, state.attendanceStreak, today);
        state.lastAttendanceDate = today;
        state.attendanceStreak = nextStreak;
        user.streakCount = nextStreak;
        const boxType = getAttendanceBoxType(nextStreak);
        if (boxType) {
          state.boxes.push({
            id: randomBytes(18).toString('base64url'),
            type: boxType,
            earnedOn: today,
            streak: nextStreak,
          });
        }
        publishRewardUser(user);
        sendJson(res, 200, {
          success: true,
          alreadyClaimed: false,
          rewardCoins: 25,
          earnedBox: boxType,
          state: toDailyRewardSummary(state, today),
          user,
        });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/rewards/daily/trivia') {
      try {
        const body = await parseJsonBody(req);
        const answerIndex = body.answerIndex;
        if (!Number.isInteger(answerIndex) || answerIndex < -1 || answerIndex > 3) {
          sendJson(res, 400, { success: false, message: 'Câu trả lời không hợp lệ.' });
          return;
        }
        const user = (req as AuthenticatedRequest).forumUser!;
        const today = vietnamDateKey();
        const { state, changed } = getUserDailyRewardState(user, today);
        if (state.triviaClaimed) {
          if (changed) persistStoreToDisk();
          sendJson(res, 200, {
            success: true,
            alreadyClaimed: true,
            rewardCoins: 0,
            correct: state.triviaCorrect,
            previousRewardCoins: state.triviaCoins,
            state: toDailyRewardSummary(state, today),
            user,
          });
          return;
        }
        const triviaIndex = getDailyTriviaIndex(today);
        const correct = answerIndex === TRIVIA_CORRECT_OPTION_INDICES[triviaIndex];
        const rewardCoins = correct ? randomInt(5, 11) : 0;
        if (rewardCoins > 0 && !creditDailyRewardCoins(user, rewardCoins, today)) {
          if (changed) persistStoreToDisk();
          sendJson(res, 403, { success: false, message: 'Đã đạt giới hạn Coin thưởng trong ngày.' });
          return;
        }
        state.triviaClaimed = true;
        state.triviaCorrect = correct;
        state.triviaCoins = rewardCoins;
        if (rewardCoins > 0) publishRewardUser(user);
        else persistStoreToDisk();
        sendJson(res, 200, {
          success: true,
          alreadyClaimed: false,
          correct,
          rewardCoins,
          state: toDailyRewardSummary(state, today),
          user,
        });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/rewards/daily/boxes/open') {
      try {
        const body = await parseJsonBody(req);
        const boxId = asSafeText(body.boxId, 100);
        if (!/^[a-zA-Z0-9_-]{8,100}$/.test(boxId)) {
          sendJson(res, 400, { success: false, message: 'Hộp quà không hợp lệ.' });
          return;
        }
        const user = (req as AuthenticatedRequest).forumUser!;
        const today = vietnamDateKey();
        const { state, changed } = getUserDailyRewardState(user, today);
        const previouslyOpened = state.openedBoxes[boxId];
        if (previouslyOpened) {
          if (changed) persistStoreToDisk();
          sendJson(res, 200, {
            success: true,
            alreadyOpened: true,
            rewardCoins: 0,
            previousRewardCoins: previouslyOpened.coins,
            state: toDailyRewardSummary(state, today),
            user,
          });
          return;
        }
        const boxIndex = state.boxes.findIndex(box => box.id === boxId);
        if (boxIndex < 0) {
          if (changed) persistStoreToDisk();
          sendJson(res, 409, { success: false, message: 'Hộp quà đã được mở hoặc không thuộc tài khoản này.' });
          return;
        }
        const [box] = state.boxes.splice(boxIndex, 1);
        const rewardCoins = BOX_COIN_REWARDS[box.type];
        if (!creditDailyRewardCoins(user, rewardCoins, today)) {
          state.boxes.splice(boxIndex, 0, box);
          if (changed) persistStoreToDisk();
          sendJson(res, 403, { success: false, message: 'Đã đạt giới hạn Coin thưởng trong ngày.' });
          return;
        }
        state.openedBoxes[boxId] = { type: box.type, coins: rewardCoins, openedOn: today };
        publishRewardUser(user);
        sendJson(res, 200, {
          success: true,
          alreadyOpened: false,
          boxType: box.type,
          rewardCoins,
          state: toDailyRewardSummary(state, today),
          user,
        });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/rewards/study/start') {
      const user = (req as AuthenticatedRequest).forumUser!;
      const today = vietnamDateKey();
      const { state } = getUserDailyRewardState(user, today);
      const now = Date.now();
      if (!state.activeStudySession || now - state.activeStudySession.lastHeartbeatAt > MAX_STUDY_SESSION_IDLE_MS) {
        state.activeStudySession = {
          id: randomBytes(18).toString('base64url'),
          startedAt: now,
          lastHeartbeatAt: now,
        };
      }
      persistStoreToDisk();
      sendJson(res, 200, {
        success: true,
        sessionId: state.activeStudySession.id,
        studyMinutes: Math.floor(state.studyMilliseconds / 60_000),
        user,
      });
      return;
    }

    if (method === 'POST' && (url === '/api/rewards/study/pulse' || url === '/api/rewards/study/stop')) {
      let body: any;
      try {
        body = await parseJsonBody(req);
      } catch (err: any) {
        sendRequestError(res, err);
        return;
      }
      const sessionId = asSafeText(body.sessionId, 100);
      if (!/^[a-zA-Z0-9_-]{8,100}$/.test(sessionId)) {
        sendJson(res, 400, { success: false, message: 'Phiên học không hợp lệ.' });
        return;
      }
      const user = (req as AuthenticatedRequest).forumUser!;
      const today = vietnamDateKey();
      const { state, changed } = getUserDailyRewardState(user, today);
      const isStop = url.endsWith('/stop');
      if (!state.activeStudySession) {
        if (changed) persistStoreToDisk();
        if (!isStop) {
          sendJson(res, 409, { success: false, message: 'Chưa có phiên học đã xác nhận trên máy chủ.' });
          return;
        }
        sendJson(res, 200, {
          success: true,
          rewards: [],
          studyMinutes: Math.floor(state.studyMilliseconds / 60_000),
          user,
        });
        return;
      }
      if (state.activeStudySession.id !== sessionId) {
        sendJson(res, 409, { success: false, message: 'Phiên học đã được thay thế hoặc đã kết thúc.' });
        return;
      }

      accrueServerStudyTime(state, Date.now());
      if (isStop) state.activeStudySession = null;
      const { rewards, todayMinutes } = grantReachedStudyRewards(user, state, today);
      if (rewards.length > 0) publishRewardUser(user);
      else persistStoreToDisk();
      sendJson(res, 200, { success: true, rewards, studyMinutes: todayMinutes, user });
      return;
    }

    if (method === 'POST' && url === '/api/users/update') {
      try {
        const body = await parseJsonBody(req);
        const user = (req as AuthenticatedRequest).forumUser!;
        const requestedEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : user.email;
        const requestedUserId = typeof body.userId === 'string' ? body.userId : user.id;
        const updates = body.updates;
        if (requestedEmail !== user.email.toLowerCase() || requestedUserId !== user.id || !updates || typeof updates !== 'object' || Array.isArray(updates)) {
          sendJson(res, 403, { success: false, message: 'Bạn chỉ có thể cập nhật hồ sơ của chính mình.' });
          return;
        }
        const allowed = new Set(['name', 'avatar', 'bio', 'gender', 'city', 'className', 'bannerUrl', 'profileGradient', 'coin', 'inventory', 'equippedBadge']);
        if (Object.keys(updates).some(key => !allowed.has(key))) {
          sendJson(res, 403, { success: false, message: 'Một số trường hồ sơ được bảo vệ và không thể chỉnh sửa.' });
          return;
        }

        const safeUpdates: Partial<UserRecord> = {};
        if (Object.hasOwn(updates, 'name')) {
          const name = asSafeText(updates.name, 60);
          if (name.length < 2) {
            sendJson(res, 400, { success: false, message: 'Tên hiển thị không hợp lệ.' });
            return;
          }
          safeUpdates.name = name;
        }
        if (Object.hasOwn(updates, 'avatar')) {
          const avatar = typeof updates.avatar === 'string' ? updates.avatar.slice(0, 2_000_000) : '';
          safeUpdates.avatar = avatar.startsWith('https://') || avatar === DEFAULT_AVATAR || /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(avatar)
            ? avatar
            : DEFAULT_AVATAR;
        }
        for (const field of ['bio', 'gender', 'city', 'className'] as const) {
          if (Object.hasOwn(updates, field)) {
            const value = asSafeText(updates[field], field === 'bio' ? 2_000 : 100);
            (safeUpdates as any)[field] = value;
          }
        }
        for (const field of ['bannerUrl'] as const) {
          if (Object.hasOwn(updates, field)) {
            const value = typeof updates[field] === 'string' ? updates[field].slice(0, 2_000_000) : '';
            if (value.startsWith('https://') || /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value)) {
              (safeUpdates as any)[field] = value;
            }
          }
        }
        if (Object.hasOwn(updates, 'profileGradient') && typeof updates.profileGradient === 'string' && /^[a-z0-9#%,.() -]{1,120}$/i.test(updates.profileGradient)) {
          safeUpdates.profileGradient = updates.profileGradient;
        }

        const shopPrices: Record<string, number> = {
          pencil_starter: 50, seed_wisdom: 80, journal_memories: 120,
          magnifier_detective: 200, ruler_quantum: 300, flask_energy: 450,
          compass_galaxy: 650, hourglass_time: 850, torch_victory: 1_200,
          crown_celestial: 1_800, talisman_focus: 2_500, prism_universe: 4_000,
        };
        const currentInventory = Array.isArray(user.inventory) ? [...user.inventory] : [];
        if (Object.hasOwn(updates, 'inventory')) {
          const nextInventory = Array.isArray(updates.inventory) ? updates.inventory.filter((item: unknown) => typeof item === 'string') : [];
          const added = nextInventory.filter((item: string) => !currentInventory.includes(item));
          const removed = currentInventory.filter(item => !nextInventory.includes(item));
          const price = added.length === 1 && removed.length === 0 ? shopPrices[added[0]] : undefined;
          const currentCoin = typeof user.coin === 'number' && Number.isSafeInteger(user.coin) ? user.coin : 100;
          if (price === undefined || !Number.isSafeInteger(updates.coin) || updates.coin !== currentCoin - price || currentCoin < price) {
            sendJson(res, 403, { success: false, message: 'Số dư và vật phẩm chỉ được thay đổi qua thao tác mua hợp lệ.' });
            return;
          }
          safeUpdates.coin = currentCoin - price;
          safeUpdates.inventory = Array.from(new Set([...currentInventory, added[0]])).slice(0, 500);
        } else if (Object.hasOwn(updates, 'coin')) {
          sendJson(res, 403, { success: false, message: 'Coin thưởng chỉ được cộng qua API thưởng có giới hạn ngày.' });
          return;
        }
        if (Object.hasOwn(updates, 'equippedBadge')) {
          const badge = typeof updates.equippedBadge === 'string' ? updates.equippedBadge.slice(0, 80) : '';
          const inventoryAfterUpdate = safeUpdates.inventory || user.inventory || [];
          if (badge && !inventoryAfterUpdate.includes(badge)) {
            sendJson(res, 403, { success: false, message: 'Bạn chưa sở hữu vật phẩm này.' });
            return;
          }
          (safeUpdates as any).equippedBadge = badge;
        }

        Object.assign(user, safeUpdates);
        user.updatedAt = new Date().toISOString();
        store.users[user.email.toLowerCase()] = user;
        persistStoreToDisk();
        broadcastServerEvent('SYNC_USER', user);
        sendJson(res, 200, { success: true, user });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'GET' && url === '/api/admin/me') {
      const viewer = (req as AuthenticatedRequest).forumUser!;
      sendJson(res, 200, {
        success: true,
        user: { id: viewer.id, name: viewer.name, email: viewer.email, role: viewer.role },
        permissions: permissionsFor(viewer),
      });
      return;
    }

    if (method === 'GET' && url === '/api/admin/overview') {
      sendJson(res, 200, { success: true, metrics: adminOverviewMetrics() });
      return;
    }

    if (method === 'GET' && url === '/api/admin/users') {
      const accounts = Object.values(store.users)
        .map(serializeAdminAccount)
        .sort((left, right) => left.name.localeCompare(right.name, 'vi'))
        .slice(0, 2_000);
      sendJson(res, 200, { success: true, accounts });
      return;
    }

    if (method === 'GET' && url === '/api/admin/posts') {
      sendJson(res, 200, { success: true, content: serializeAdminContent() });
      return;
    }

    if (method === 'GET' && url === '/api/admin/reports') {
      const reports = (store.reports || []).slice(-1_000).map(serializeAdminReport)
        .sort((left, right) => Date.parse(right.createdAt || '') - Date.parse(left.createdAt || ''));
      sendJson(res, 200, { success: true, reports });
      return;
    }

    if (method === 'GET' && url === '/api/admin/logs') {
      sendJson(res, 200, { success: true, auditLog: store.adminAuditLog.slice(-250).reverse() });
      return;
    }

    if (method === 'GET' && url === '/api/admin/settings') {
      sendJson(res, 200, { success: true, settings: adminSettingsOverview() });
      return;
    }

    if (method === 'POST' && url === '/api/admin/users/role') {
      try {
        const body = await parseJsonBody(req);
        const actor = (req as AuthenticatedRequest).forumUser!;
        const userId = asSafeText(body.userId, 128);
        const nextRole = typeof body.role === 'string' ? body.role.trim().toLowerCase() : '';
        const reason = asSafeText(body.reason, 500);
        if (!userId || !USER_ROLE_VALUES.has(nextRole) || reason.length < 5) {
          sendJson(res, 400, { success: false, message: 'Vui lòng chọn vai trò hợp lệ và ghi rõ lý do (ít nhất 5 ký tự).' });
          return;
        }
        if (actor.id === userId) {
          sendJson(res, 403, { success: false, message: 'Không thể đổi vai trò của chính tài khoản đang dùng.' });
          return;
        }
        const target = findUserById(userId);
        if (!target) {
          sendJson(res, 404, { success: false, message: 'Không tìm thấy tài khoản cần cập nhật.' });
          return;
        }
        if (target.role === nextRole) {
          sendJson(res, 409, { success: false, message: 'Tài khoản hiện đã có vai trò này.' });
          return;
        }
        if (target.role === 'super_admin' && Object.values(store.users).filter(user => user.role === 'super_admin').length <= 1) {
          sendJson(res, 409, { success: false, message: 'Phải duy trì ít nhất một Super Admin đang hoạt động.' });
          return;
        }
        const reauthRetryAfter = consumeRateLimitByKey(`admin-role-reauth:${actor.id}`, 5, 15 * 60_000);
        if (reauthRetryAfter !== null) {
          res.setHeader('Retry-After', String(reauthRetryAfter));
          sendJson(res, 429, { success: false, message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.' });
          return;
        }
        if (!await verifyAccountPassword(actor, body.currentPassword)) {
          addAdminAuditEvent(actor, 'role_change_reauth_failure', target.id, target.name, reason, req, 'failure');
          persistStoreToDisk();
          sendJson(res, 401, { success: false, message: 'Xác minh lại mật khẩu không thành công.' });
          return;
        }

        const previousRole = target.role;
        target.role = nextRole as UserRecord['role'];
        target.updatedAt = new Date().toISOString();
        revokeUserSessions(target.id);
        addAdminAuditEvent(actor, 'role_change', target.id, target.name, `${previousRole} → ${nextRole}. ${reason}`, req);
        persistStoreToDisk();
        broadcastServerEvent('SYNC_USER', target);
        sendJson(res, 200, {
          success: true,
          account: { id: target.id, name: target.name, role: target.role, updatedAt: target.updatedAt },
          sessionsRevoked: true,
        });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/admin/users/delete') {
      try {
        const body = await parseJsonBody(req);
        const actor = (req as AuthenticatedRequest).forumUser!;
        const userId = asSafeText(body.userId, 128);
        const reason = asSafeText(body.reason, 500);
        const target = findUserById(userId);
        if (!target) {
          sendJson(res, 404, { success: false, message: 'Không tìm thấy tài khoản cần xóa.' });
          return;
        }
        if (actor.id === target.id || target.role === 'super_admin' ||
            (actor.role === 'admin' && target.role === 'admin')) {
          sendJson(res, 403, { success: false, message: 'Không thể xóa chính mình hoặc tài khoản có quyền ngang/cao hơn.' });
          return;
        }
        if (reason.length < 5 || typeof body.confirmation !== 'string' || body.confirmation !== target.email) {
          sendJson(res, 400, { success: false, message: 'Cần nhập đúng email xác nhận của tài khoản và lý do (ít nhất 5 ký tự).' });
          return;
        }
        const reauthRetryAfter = consumeRateLimitByKey(`admin-delete-reauth:${actor.id}`, 5, 15 * 60_000);
        if (reauthRetryAfter !== null) {
          res.setHeader('Retry-After', String(reauthRetryAfter));
          sendJson(res, 429, { success: false, message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.' });
          return;
        }
        if (!await verifyAccountPassword(actor, body.currentPassword)) {
          addAdminAuditEvent(actor, 'delete_user_reauth_failure', target.id, target.name, reason, req, 'failure');
          persistStoreToDisk();
          sendJson(res, 401, { success: false, message: 'Xác minh lại mật khẩu không thành công.' });
          return;
        }

        addAdminAuditEvent(actor, 'delete_user', target.id, target.name, reason, req);
        revokeUserSessions(target.id);
        delete store.users[target.email.toLowerCase()];
        delete store.passwords[target.email.toLowerCase()];
        delete store.userModeration[target.id];
        delete store.dailyRewards[target.email.toLowerCase()];
        delete store.coinCredits[target.email.toLowerCase()];
        const deletedQuestionIds = new Set(store.questions.filter(item => item.authorId === target.id).map(item => item.id));
        const deletedSolutionIds = new Set(store.solutions.filter(item => item.authorId === target.id).map(item => item.id));
        store.questions = store.questions.filter(item => item.authorId !== target.id);
        store.solutions = store.solutions.filter(item => item.authorId !== target.id && !deletedQuestionIds.has(item.questionId));
        store.questions = store.questions.map(item => deletedSolutionIds.has(item.bestSolutionId) ? { ...item, bestSolutionId: undefined, isSolved: false } : item);
        store.chatMessages = store.chatMessages.filter(item => item.authorId !== target.id);
        store.clubPosts = store.clubPosts.filter(item => item.authorId !== target.id);
        persistStoreToDisk();
        broadcastServerEvent('ACCOUNT_DELETED', { userId: target.id });
        sendJson(res, 200, { success: true, deletedUserId: target.id });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'GET' && url === '/api/admin/console') {
      const viewer = (req as AuthenticatedRequest).forumUser!;
      const accounts = hasPermission(viewer, 'users.view')
        ? Object.values(store.users).map(serializeAdminAccount).sort((left, right) => left.name.localeCompare(right.name, 'vi'))
        : [];
      const reports = hasPermission(viewer, 'reports.view')
        ? (store.reports || []).slice(-1_000).map(serializeAdminReport)
          .sort((left, right) => Date.parse(right.createdAt || '') - Date.parse(left.createdAt || ''))
        : [];
      const auditLog = hasPermission(viewer, 'logs.view') ? store.adminAuditLog.slice(-250).reverse() : [];
      sendJson(res, 200, {
        success: true,
        data: {
          metrics: adminOverviewMetrics(),
          accounts,
          reports,
          auditLog,
          content: hasPermission(viewer, 'posts.view') ? serializeAdminContent() : null,
          settings: hasPermission(viewer, 'settings.view') ? adminSettingsOverview() : null,
          permissions: permissionsFor(viewer),
        },
      });
      return;
    }

    if (method === 'GET' && url === '/api/about') {
      const about = publicAbout();
      sendJson(res, 200, { success: true, about, ...about });
      return;
    }

    if (method === 'GET' && url === '/api/admin/about') {
      const about = publicAbout();
      sendJson(res, 200, { success: true, about, ...about });
      return;
    }

    if (method === 'POST' && url === '/api/admin/users/moderation') {
      try {
        const body = await parseJsonBody(req);
        const actor = (req as AuthenticatedRequest).forumUser!;
        const userId = asSafeText(body.userId, 128);
        const action = asSafeText(body.action, 24);
        const reason = asSafeText(body.reason, 500);
        const validActions = new Set(['mute', 'unmute', 'lock', 'unlock']);
        if (!userId || !validActions.has(action) || reason.length < 5) {
          sendJson(res, 400, { success: false, message: 'Vui lòng chọn thao tác hợp lệ và ghi rõ lý do (ít nhất 5 ký tự).' });
          return;
        }
        const target = Object.values(store.users).find(user => user.id === userId);
        if (!target) {
          sendJson(res, 404, { success: false, message: 'Không tìm thấy tài khoản cần xử lý.' });
          return;
        }
        const actorRank = actor.role === 'super_admin' ? 3 : actor.role === 'admin' ? 2 : 1;
        const targetRank = target.role === 'super_admin' ? 3 : target.role === 'admin' ? 2 : target.role === 'moderator' ? 1 : 0;
        if (target.id === actor.id || target.role === 'super_admin' || actorRank <= targetRank) {
          sendJson(res, 403, { success: false, message: 'Không thể áp dụng chế tài lên chính mình hoặc tài khoản có quyền ngang/cao hơn.' });
          return;
        }

        const moderation: UserModerationState = { ...getUserModerationState(target.id) };
        const now = Date.now();
        const nowIso = new Date(now).toISOString();
        let auditAction = '';
        if (action === 'mute') {
          const rawDuration = body.durationMinutes;
          const durationMinutes = typeof rawDuration === 'number'
            ? rawDuration
            : typeof rawDuration === 'string' && /^\d+$/.test(rawDuration)
              ? Number(rawDuration)
              : Number.NaN;
          const permittedDurations = new Set([10, 60, 1_440, 10_080, 0]);
          if (!Number.isSafeInteger(durationMinutes) || !permittedDurations.has(durationMinutes)) {
            sendJson(res, 400, { success: false, message: 'Thời lượng mute không hợp lệ.' });
            return;
          }
          moderation.mutedAt = nowIso;
          moderation.mutedUntil = durationMinutes === 0 ? null : now + durationMinutes * 60_000;
          moderation.muteReason = reason;
          auditAction = 'mute_chat';
        } else if (action === 'unmute') {
          delete moderation.mutedAt;
          delete moderation.mutedUntil;
          delete moderation.muteReason;
          auditAction = 'unmute_chat';
        } else if (action === 'lock') {
          moderation.lockedAt = nowIso;
          moderation.lockReason = reason;
          auditAction = 'lock_account';
        } else {
          delete moderation.lockedAt;
          delete moderation.lockReason;
          auditAction = 'unlock_account';
        }

        if (Object.keys(moderation).length > 0) store.userModeration[target.id] = moderation;
        else delete store.userModeration[target.id];
        addAdminAuditEvent(actor, auditAction, target.id, target.name, reason, req);
        persistStoreToDisk();
        if (action === 'lock') {
          disconnectLockedAccount(target.id);
          revokeUserSessions(target.id);
        }
        const activeMute = getActiveChatMute(target.id);
        sendJson(res, 200, {
          success: true,
          account: {
            id: target.id,
            accountLocked: isAccountLocked(target.id),
            lockedAt: moderation.lockedAt || '',
            lockReason: moderation.lockReason || '',
            chatMuted: Boolean(activeMute),
            mutedAt: activeMute ? moderation.mutedAt || '' : '',
            mutedUntil: activeMute?.mutedUntil ?? null,
            muteReason: activeMute?.reason || '',
          },
        });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/admin/reports/review') {
      try {
        const body = await parseJsonBody(req);
        const actor = (req as AuthenticatedRequest).forumUser!;
        const reportId = asSafeText(body.reportId, 120);
        const status = asSafeText(body.status, 24);
        const reviewNote = asSafeText(body.reviewNote, 500);
        if (!reportId || !['open', 'resolved', 'dismissed'].includes(status)) {
          sendJson(res, 400, { success: false, message: 'Trạng thái xử lý báo cáo không hợp lệ.' });
          return;
        }
        const report = (store.reports || []).find((item: any) => item.id === reportId);
        if (!report) {
          sendJson(res, 404, { success: false, message: 'Không tìm thấy báo cáo.' });
          return;
        }
        report.status = status;
        report.reviewedAt = new Date().toISOString();
        report.reviewedById = actor.id;
        report.reviewedByName = actor.name;
        report.reviewNote = reviewNote;
        addAdminAuditEvent(
          actor,
          status === 'open' ? 'reopen_report' : status === 'resolved' ? 'resolve_report' : 'dismiss_report',
          report.id,
          asSafeText(report.reportedUserName, 80) || 'Báo cáo',
          reviewNote || `Report ${status}`,
          req,
        );
        persistStoreToDisk();
        sendJson(res, 200, { success: true, report: { id: report.id, status, reviewedAt: report.reviewedAt, reviewNote } });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/admin/club-posts/delete') {
      try {
        const body = await parseJsonBody(req);
        const actor = (req as AuthenticatedRequest).forumUser!;
        const postId = asSafeText(body.postId, 128);
        const reason = asSafeText(body.reason, 500);
        if (!postId || reason.length < 5) {
          sendJson(res, 400, { success: false, message: 'Vui lòng cung cấp bài viết và lý do xóa (ít nhất 5 ký tự).' });
          return;
        }
        const post = store.clubPosts.find(item => item.id === postId);
        if (!post) {
          sendJson(res, 404, { success: false, message: 'Không tìm thấy bài viết câu lạc bộ.' });
          return;
        }
        store.clubPosts = store.clubPosts.filter(item => item.id !== postId);
        addAdminAuditEvent(actor, 'delete_club_post', postId, asSafeText(post.title, 100) || 'Bài viết CLB', reason, req);
        persistStoreToDisk();
        broadcastServerEvent('DELETE_CLUB_POST', { postId });
        sendJson(res, 200, { success: true, message: 'Đã xóa bài viết câu lạc bộ.' });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/admin/about') {
      try {
        const body = await parseJsonBody(req);
        const aboutPayload = body.about || body.aboutData;
        if (!aboutPayload || typeof aboutPayload !== 'object') {
          sendJson(res, 400, { success: false, message: 'Dữ liệu không hợp lệ!' });
          return;
        }
        store.about = sanitizeAboutInput(aboutPayload);
        const actor = (req as AuthenticatedRequest).forumUser!;
        addAdminAuditEvent(actor, 'update_about', 'about-page', 'Khu Vinh Danh', asSafeText(body.reason, 500) || 'Cập nhật nội dung Khu Vinh Danh', req);
        persistStoreToDisk();
        broadcastServerEvent('SYNC_ABOUT', publicAbout(store.about));
        const about = publicAbout(store.about);
        sendJson(res, 200, { success: true, about, ...about });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/questions/delete') {
      try {
        const body = await parseJsonBody(req);
        const questionId = asSafeText(body.questionId, 128);
        const reason = asSafeText(body.reason, 500);
        if (!questionId || reason.length < 5) {
          sendJson(res, 400, { success: false, message: 'Vui lòng cung cấp câu hỏi và lý do xóa (ít nhất 5 ký tự).' });
          return;
        }
        const target = store.questions.find(question => question.id === questionId);
        if (!target) {
          sendJson(res, 404, { success: false, message: 'Không tìm thấy câu hỏi.' });
          return;
        }
        store.questions = store.questions.filter(q => q.id !== questionId);
        store.solutions = store.solutions.filter(s => s.questionId !== questionId);
        const actor = (req as AuthenticatedRequest).forumUser!;
        addAdminAuditEvent(actor, 'delete_question', questionId, asSafeText(target.title, 100) || 'Câu hỏi', reason, req);
        persistStoreToDisk();
        broadcastServerEvent('DELETE_QUESTION', { questionId });
        sendJson(res, 200, { success: true, message: 'Đã xóa bài viết thành công' });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/questions/edit') {
      try {
        const body = await parseJsonBody(req);
        const questionId = asSafeText(body.questionId, 128);
        const updates = body.updates;
        const reason = asSafeText(body.reason, 500);
        const allowedFields = new Set(['title', 'content', 'subject']);
        if (!questionId || !updates || typeof updates !== 'object' || Array.isArray(updates) ||
            Object.keys(updates).length === 0 || Object.keys(updates).some(key => !allowedFields.has(key)) || reason.length < 5) {
          sendJson(res, 400, { success: false, message: 'Chỉ cho phép cập nhật tiêu đề, nội dung hoặc chủ đề và cần ghi rõ lý do.' });
          return;
        }
        const target = store.questions.find(question => question.id === questionId);
        if (!target) {
          sendJson(res, 404, { success: false, message: 'Không tìm thấy câu hỏi.' });
          return;
        }
        const safeUpdates: Record<string, string> = {};
        if (Object.hasOwn(updates, 'title')) {
          const title = asSafeText(updates.title, 200);
          if (title.length < 2) {
            sendJson(res, 400, { success: false, message: 'Tiêu đề câu hỏi không hợp lệ.' });
            return;
          }
          safeUpdates.title = title;
        }
        if (Object.hasOwn(updates, 'content')) {
          const content = typeof updates.content === 'string' ? updates.content.trim() : '';
          if (!content || content.length > 20_000) {
            sendJson(res, 400, { success: false, message: 'Nội dung câu hỏi không hợp lệ.' });
            return;
          }
          safeUpdates.content = content;
        }
        if (Object.hasOwn(updates, 'subject')) {
          const subject = typeof updates.subject === 'string' ? updates.subject : '';
          if (!new Set(['toan', 'ly', 'hoa', 'sinh', 'anh', 'tin', 'van', 'su', 'hotro', 'kinhnghiem', 'share', 'tamsu', 'tamly']).has(subject)) {
            sendJson(res, 400, { success: false, message: 'Chủ đề câu hỏi không hợp lệ.' });
            return;
          }
          safeUpdates.subject = subject;
        }
        store.questions = store.questions.map(question =>
          question.id === questionId ? { ...question, ...safeUpdates } : question
        );
        const actor = (req as AuthenticatedRequest).forumUser!;
        addAdminAuditEvent(actor, 'edit_question', questionId, asSafeText(target.title, 100) || 'Câu hỏi', reason, req);
        persistStoreToDisk();
        broadcastServerEvent('EDIT_QUESTION', { questionId, updates: safeUpdates });
        const updatedQ = store.questions.find(question => question.id === questionId);
        sendJson(res, 200, { success: true, message: 'Đã cập nhật bài viết thành công', question: updatedQ });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/solutions/delete') {
      try {
        const body = await parseJsonBody(req);
        const solutionId = asSafeText(body.solutionId, 128);
        const reason = asSafeText(body.reason, 500);
        if (!solutionId || reason.length < 5) {
          sendJson(res, 400, { success: false, message: 'Vui lòng cung cấp lời giải và lý do xóa (ít nhất 5 ký tự).' });
          return;
        }
        const target = store.solutions.find(solution => solution.id === solutionId);
        if (!target) {
          sendJson(res, 404, { success: false, message: 'Không tìm thấy câu trả lời.' });
          return;
        }
        store.solutions = store.solutions.filter(s => s.id !== solutionId);
        store.questions = store.questions.map(q =>
          q.bestSolutionId === solutionId ? { ...q, isSolved: false, bestSolutionId: undefined } : q
        );
        const actor = (req as AuthenticatedRequest).forumUser!;
        addAdminAuditEvent(actor, 'delete_solution', solutionId, asSafeText(target.content, 100) || 'Câu trả lời', reason, req);
        persistStoreToDisk();
        broadcastServerEvent('DELETE_SOLUTION', { solutionId });
        sendJson(res, 200, { success: true, message: 'Đã xóa phản hồi thành công' });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/chat/delete') {
      try {
        const body = await parseJsonBody(req);
        const messageId = asSafeText(body.messageId, 128);
        const reason = asSafeText(body.reason, 500);
        if (!messageId || reason.length < 5) {
          sendJson(res, 400, { success: false, message: 'Vui lòng cung cấp tin nhắn và lý do xóa (ít nhất 5 ký tự).' });
          return;
        }
        const target = store.chatMessages.find(message => message.id === messageId);
        if (!target) {
          sendJson(res, 404, { success: false, message: 'Không tìm thấy tin nhắn.' });
          return;
        }
        store.chatMessages = store.chatMessages.filter(m => m.id !== messageId);
        const actor = (req as AuthenticatedRequest).forumUser!;
        addAdminAuditEvent(actor, 'delete_chat_message', messageId, asSafeText(target.content, 100) || 'Tin nhắn chat', reason, req);
        persistStoreToDisk();
        broadcastServerEvent('DELETE_CHAT_MESSAGE', { messageId });
        sendJson(res, 200, { success: true, message: 'Đã thu hồi tin nhắn thành công' });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    next();
  });
}
