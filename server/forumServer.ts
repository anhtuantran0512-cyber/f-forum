/* Bản quyền trí tuệ thuộc về BroAmStuck */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { createHash, pbkdf2 as pbkdf2Callback, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'SUPER_ADMIN' | 'CLUB_LEADER' | 'STUDENT';
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
const ADMIN_EMAIL = (process.env.FFORUM_ADMIN_EMAIL || 'anhtuantran0512@gmail.com').trim().toLowerCase();
const SESSION_COOKIE_NAME = 'fforum_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
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
};
const ACCOUNT_ROUTE_RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  '/api/chat': { maxRequests: 30, windowMs: 60_000 },
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
const sessions = new Map<string, { email: string; userId: string; expiresAt: number }>();
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
const UNAUTHENTICATED_POST_PATHS = new Set([
  '/api/auth/register', '/api/auth/login', '/api/auth/social', '/api/auth/logout',
  '/api/feedback', '/api/presence',
]);
const ADMIN_POST_PATHS = new Set([
  '/api/admin/about', '/api/questions/delete', '/api/questions/edit',
  '/api/solutions/delete', '/api/chat/delete',
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
  users: {
    [ADMIN_EMAIL]: {
      id: 'user-admin',
      name: 'Trần Văn Anh Tuấn',
      email: ADMIN_EMAIL,
      avatar: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_a455843c-d8db-461c-8ef6-74a325d2472c.png',
      role: 'SUPER_ADMIN',
      level: 150,
      xp: 45000,
      fPoints: 45000,
      coin: 99999,
      streakCount: 36,
      bio: 'F-Forum Architect & Core Administrator. Xây dựng tương lai tri thức học đường.',
      gender: 'Nam',
      city: 'Hà Nội',
      className: 'K19 Software Engineering',
      scopedClubIds: [],
    },
  },
  // Password credentials are hashed on registration; the admin password must be
  // supplied through FFORUM_ADMIN_PASSWORD and is never shipped in source.
  passwords: {},
  dailyRewards: {},
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
      role: 'Admin F-Forum • Owner BroAmStuck Studio',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=600&fit=crop&crop=faces',
      bio: 'Xây dựng F-Forum từ những dòng code đầu tiên với mong muốn tạo nên một không gian số bình đẳng, nơi học sinh tự do kết nối tri thức, chia sẻ câu lạc bộ và lưu giữ ký ức tuổi học trò mà không bị rào cản bởi phán xét hay công nghệ phức tạp.',
      email: ADMIN_EMAIL,
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

    const role: UserRecord['role'] = email === ADMIN_EMAIL
      ? 'SUPER_ADMIN'
      : raw.role === 'CLUB_LEADER'
        ? 'CLUB_LEADER'
        : 'STUDENT';
    const avatar = safeString(raw.avatar, 2_000, DEFAULT_AVATAR);
    out[email] = {
      id,
      name,
      email,
      avatar: avatar.startsWith('https://') || avatar === DEFAULT_AVATAR || avatar.startsWith('data:image/png;base64,') || avatar.startsWith('data:image/jpeg;base64,') || avatar.startsWith('data:image/webp;base64,') ? avatar : DEFAULT_AVATAR,
      role,
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
      joinedAt: safeString(raw.joinedAt, 64),
      bannerUrl: safeString(raw.bannerUrl, 2_000),
      profileGradient: safeString(raw.profileGradient, 120),
      scopedClubIds: Array.isArray(raw.scopedClubIds) ? raw.scopedClubIds.filter((id: unknown) => typeof id === 'string').slice(0, 100) : [],
    };
  });
  return out;
}

function isPasswordHash(value: unknown): boolean {
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

function timingSafeTextEqual(left: string, right: string): boolean {
  const leftDigest = createHash('sha256').update(left).digest();
  const rightDigest = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
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
      if (!cleanUsers[key] || key === ADMIN_EMAIL || typeof value !== 'string' || value.length > 128) continue;
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

    store = {
      users: cleanUsers,
      passwords: cleanPasswords,
      dailyRewards: cleanDailyRewards,
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
    if (migratedLegacyPassword || Object.keys(parsedPasswords).some(email => email.trim().toLowerCase() === ADMIN_EMAIL)) {
      persistStoreToDisk();
    }
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
      fs.writeFileSync(dataFilePath, JSON.stringify(store, null, 2), { encoding: 'utf8', mode: 0o600 });
      try {
        fs.chmodSync(dataFilePath, 0o600);
      } catch {
        /* File permissions may be unavailable on some deployment platforms. */
      }
    } catch (err) {
      console.error('[Forum Server] Failed to persist data to disk:', err);
    }
  }, 200);
  saveTimeout.unref();
}

const wsClients = new Set<WebSocket>();
const sseClients = new Set<ServerResponse>();

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
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "object-src 'none'; base-uri 'self'; form-action 'self'");
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
    const socketProtocol = Boolean((req.socket as any).encrypted) ? 'https' : 'http';
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
  if (!user || user.id !== session.userId) {
    sessions.delete(tokenHash);
    return null;
  }
  return user;
}

function isSuperAdmin(user: UserRecord | null | undefined): boolean {
  return Boolean(user && user.email.toLowerCase() === ADMIN_EMAIL && user.role === 'SUPER_ADMIN');
}

function createSession(res: ServerResponse, user: UserRecord) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  if (sessions.size > 20_000) {
    for (const [key, session] of sessions) {
      if (session.expiresAt <= Date.now()) sessions.delete(key);
    }
  }
  sessions.set(tokenHash, { email: user.email.toLowerCase(), userId: user.id, expiresAt });
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`);
}

function clearSession(req: IncomingMessage, res: ServerResponse) {
  const token = getSessionToken(req);
  if (token) sessions.delete(createHash('sha256').update(token).digest('hex'));
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
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
  const address = req.socket.remoteAddress || 'unknown';
  return consumeRateLimitByKey(`${bucketName}:${address}`, maxRequests, windowMs);
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
    role: 'STUDENT',
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
        req.pause();
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
      wsClients.add(ws);
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

      ws.on('close', () => wsClients.delete(ws));
      ws.on('error', () => wsClients.delete(ws));
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
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && req.headers['sec-fetch-site'] === 'cross-site') {
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
    if (method === 'POST' && url.startsWith('/api/')) {
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
        const user = getAuthenticatedUser(req);
        if (!user) {
          sendJson(res, 401, { success: false, message: 'Vui lòng đăng nhập để tiếp tục.' });
          return;
        }
        (req as AuthenticatedRequest).forumUser = user;
        if (ADMIN_POST_PATHS.has(url) && !isSuperAdmin(user)) {
          sendJson(res, 403, { success: false, message: 'Bạn không có quyền thực hiện thao tác này.' });
          return;
        }

        const accountRetryAfter = consumeRateLimitByKey(`account-write:${user.id}`, 60, 60_000);
        const routeLimit = ACCOUNT_ROUTE_RATE_LIMITS[url];
        const routeRetryAfter = routeLimit
          ? consumeRateLimitByKey(`account-route:${user.id}:${url}`, routeLimit.maxRequests, routeLimit.windowMs)
          : null;
        const retryAfter = Math.max(accountRetryAfter || 0, routeRetryAfter || 0);
        if (retryAfter > 0) {
          res.setHeader('Retry-After', String(retryAfter));
          sendJson(res, 429, { success: false, message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.' });
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
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      });
      res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientCount: sseClients.size + 1 })}\n\n`);
      sseClients.add(res);

      req.on('close', () => {
        sseClients.delete(res);
      });

      const heartbeat = setInterval(() => {
        try {
          res.write(':keepalive\n\n');
        } catch {
          clearInterval(heartbeat);
          sseClients.delete(res);
        }
      }, 20000);

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

    if (method === 'POST' && url === '/api/chat') {
      try {
        const body = await parseJsonBody(req);
        const user = (req as AuthenticatedRequest).forumUser!;
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
        if (!isSuperAdmin(user) && targetQ.authorId !== user.id) {
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
        if (email === ADMIN_EMAIL) {
          sendJson(res, 409, { success: false, message: 'Địa chỉ này dành cho tài khoản quản trị đã cấu hình.' });
          return;
        }
        if (email.endsWith(RETIRED_VIRTUAL_DOMAIN)) {
          sendJson(res, 400, { success: false, message: 'Miền email này không còn được hỗ trợ.' });
          return;
        }
        if (store.users[email]) {
          sendJson(res, 409, { success: false, message: 'Email này đã được đăng ký. Vui lòng đăng nhập.' });
          return;
        }

        const newUser: UserRecord = {
          id: `user-${randomBytes(16).toString('hex')}`,
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
        };
        const passwordHash = await hashPassword(password);
        store.users[email] = newUser;
        store.passwords[email] = passwordHash;
        persistStoreToDisk();
        broadcastServerEvent('SYNC_USER', newUser);
        createSession(res, newUser);
        sendJson(res, 200, { success: true, user: newUser });
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
        const user = store.users[email];
        let valid = false;

        if (email === ADMIN_EMAIL) {
          const configuredPassword = process.env.FFORUM_ADMIN_PASSWORD || '';
          valid = Boolean(configuredPassword && configuredPassword.length >= 16 && password.length <= 128 && timingSafeTextEqual(password, configuredPassword));
        } else if (user && password.length <= 128) {
          const storedPassword = store.passwords[email];
          if (isPasswordHash(storedPassword)) {
            valid = await verifyPasswordHash(password, storedPassword);
            const storedIterations = Number(storedPassword.split('$')[1]);
            if (valid && storedIterations < PASSWORD_HASH_ITERATIONS) {
              store.passwords[email] = await hashPassword(password);
              persistStoreToDisk();
            }
          } else if (typeof storedPassword === 'string' && storedPassword.length > 0) {
            // One-time migration guard for old stores that have not yet been loaded
            // through the normal migration path.
            valid = timingSafeTextEqual(password, storedPassword);
            if (valid) {
              store.passwords[email] = await hashPassword(password);
              persistStoreToDisk();
            }
          }
        }
        if (!valid) {
          await verifyPasswordHash(password.slice(0, 128), await getDummyPasswordHash());
          sendJson(res, 401, { success: false, message: 'Thông tin đăng nhập không chính xác.' });
          return;
        }
        if (!user) {
          sendJson(res, 401, { success: false, message: 'Thông tin đăng nhập không chính xác.' });
          return;
        }

        createSession(res, user);
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
          sendJson(res, 400, { success: false, message: 'Nhà cung cấp đăng nhập không hợp lệ.' });
          return;
        }
        const identity = await verifySocialCredential(provider, credential);
        if (!identity) {
          sendJson(res, 401, { success: false, message: 'Không thể xác thực tài khoản mạng xã hội.' });
          return;
        }
        if (identity.email.endsWith(RETIRED_VIRTUAL_DOMAIN)) {
          sendJson(res, 400, { success: false, message: 'Miền email này không còn được hỗ trợ.' });
          return;
        }

        let user = store.users[identity.email];
        if (!user) {
          user = {
            id: `user-${randomBytes(16).toString('hex')}`,
            name: identity.name,
            email: identity.email,
            avatar: identity.avatar || DEFAULT_AVATAR,
            role: identity.email === ADMIN_EMAIL ? 'SUPER_ADMIN' : 'STUDENT',
            level: identity.email === ADMIN_EMAIL ? 150 : 1,
            xp: identity.email === ADMIN_EMAIL ? 45_000 : 0,
            coin: identity.email === ADMIN_EMAIL ? 99_999 : 100,
            fPoints: identity.email === ADMIN_EMAIL ? 45_000 : 0,
            streakCount: identity.email === ADMIN_EMAIL ? 36 : 0,
            bio: identity.email === ADMIN_EMAIL ? 'F-Forum Architect & Core Administrator. Xây dựng tương lai tri thức học đường.' : '',
            gender: 'Chưa cập nhật',
            city: 'Chưa cập nhật',
            className: 'Chưa cập nhật',
            joinedAt: new Date().toISOString(),
            scopedClubIds: [],
            inventory: [],
          };
          store.users[identity.email] = user;
          persistStoreToDisk();
          broadcastServerEvent('SYNC_USER', user);
        }
        // User-controlled profile fields never determine which account is logged in.
        createSession(res, user);
        sendJson(res, 200, { success: true, user });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/auth/logout') {
      clearSession(req, res);
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
          targetEmail: 'anhtuantran0512@gmail.com',
          createdAt: new Date().toISOString(),
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
        const updates = body.updates;
        if (requestedEmail !== user.email.toLowerCase() || !updates || typeof updates !== 'object' || Array.isArray(updates)) {
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
        store.users[user.email.toLowerCase()] = user;
        persistStoreToDisk();
        broadcastServerEvent('SYNC_USER', user);
        sendJson(res, 200, { success: true, user });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'GET' && url.startsWith('/api/admin/about')) {
      const about = publicAbout();
      sendJson(res, 200, { success: true, about, ...about });
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
        store.about = aboutPayload;
        persistStoreToDisk();
        broadcastServerEvent('SYNC_ABOUT', store.about);
        sendJson(res, 200, { success: true, about: store.about, ...store.about });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/questions/delete') {
      try {
        const body = await parseJsonBody(req);
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
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/questions/edit') {
      try {
        const body = await parseJsonBody(req);
        const { questionId, updates } = body;
        if (!questionId || !updates) {
          sendJson(res, 400, { success: false, message: 'Thiếu thông tin cập nhật' });
          return;
        }
        store.questions = store.questions.map(q =>
          q.id === questionId ? { ...q, ...updates } : q
        );
        persistStoreToDisk();
        broadcastServerEvent('EDIT_QUESTION', { questionId, updates });
        const updatedQ = store.questions.find(q => q.id === questionId);
        sendJson(res, 200, { success: true, message: 'Đã cập nhật bài viết thành công', question: updatedQ });
      } catch (err: any) {
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/solutions/delete') {
      try {
        const body = await parseJsonBody(req);
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
        sendRequestError(res, err);
      }
      return;
    }

    if (method === 'POST' && url === '/api/chat/delete') {
      try {
        const body = await parseJsonBody(req);
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
        sendRequestError(res, err);
      }
      return;
    }

    next();
  });
}
