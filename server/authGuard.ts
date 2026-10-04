/* Bản quyền trí tuệ thuộc về BroAmStuck */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage } from 'node:http';

/* ==========================================================================
   authGuard — tầng xác thực & toàn vẹn dữ liệu của máy chủ F-Forum
   --------------------------------------------------------------------------
   Trước khi có tệp này, máy chủ tin MỌI thứ client gửi lên:
     • /api/auth/login bỏ qua mật khẩu khi tài khoản chưa có bản ghi mật khẩu
       (tài khoản đăng nhập Google/Facebook) → đăng nhập bằng mật khẩu bất kỳ.
     • Mật khẩu lưu plaintext trong data/forum-data.json.
     • Token chỉ là chuỗi ngẫu nhiên, server không kiểm tra được → mọi API
       "dành cho admin" chỉ nhìn `adminEmail` trong body, ai cũng giả được.
     • WS SYNC_USER cho phép client tự phong SUPER_ADMIN / coin / level.
   Tệp này gom toàn bộ phép kiểm tra vào một nơi, thuần và test được.
   ========================================================================== */

export const MASTER_ADMIN_EMAIL = 'anhtuantran0512@gmail.com';

export const isMasterAdminEmail = (email?: string | null): boolean =>
  String(email || '').trim().toLowerCase() === MASTER_ADMIN_EMAIL;

/* -------------------------------------------------------------------------- */
/* Khoá ký token                                                              */
/* -------------------------------------------------------------------------- */

const dataDir = process.env.FFORUM_DATA_DIR
  ? path.resolve(process.env.FFORUM_DATA_DIR)
  : path.resolve(process.cwd(), 'data');
const keyFilePath = path.join(dataDir, 'session-key');

/**
 * Khoá HMAC dùng ký/kiểm token. Ưu tiên biến môi trường, kế đến là tệp
 * `data/session-key` (tạo một lần, quyền 0600) để token không chết mỗi lần
 * khởi động lại server. Nếu không ghi được tệp thì dùng khoá trong RAM.
 */
function loadOrCreateSecret(): string {
  const fromEnv = (process.env.FFORUM_SESSION_SECRET || '').trim();
  if (fromEnv.length >= 16) return fromEnv;
  try {
    if (fs.existsSync(keyFilePath)) {
      const saved = fs.readFileSync(keyFilePath, 'utf8').trim();
      if (saved.length >= 32) return saved;
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(keyFilePath, generated, { encoding: 'utf8', mode: 0o600 });
    return generated;
  } catch {
    return crypto.randomBytes(32).toString('hex');
  }
}

let sessionSecret = loadOrCreateSecret();

/** Cho phép test chốt khoá để kiểm chứng token giả bị từ chối. */
export const setSessionSecret = (secret: string): void => {
  if (typeof secret === 'string' && secret.length >= 16) sessionSecret = secret;
};

/* -------------------------------------------------------------------------- */
/* Mật khẩu — scrypt + so sánh thời gian cố định                              */
/* -------------------------------------------------------------------------- */

const SCRYPT_KEYLEN = 32;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const HASH_PREFIX = 'scrypt$';

/** `scrypt$<salt hex>$<hash hex>` — tự mô tả tham số, đổi được sau này. */
export const hashPassword = (password: string): string => {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN, SCRYPT_OPTS);
  return `${HASH_PREFIX}${salt.toString('hex')}$${derived.toString('hex')}`;
};

export const isHashedPassword = (record?: string | null): boolean =>
  Boolean(record) && String(record).startsWith(HASH_PREFIX);

export interface PasswordCheck {
  ok: boolean;
  /** Bản ghi cũ dạng plaintext khớp → cần băm lại ngay lần đăng nhập này. */
  needsRehash: boolean;
}

/**
 * Kiểm mật khẩu. KHÔNG có bản ghi mật khẩu = KHÔNG đăng nhập được:
 * tài khoản tạo qua Google/Facebook phải đi qua `/api/auth/social`.
 */
export const verifyPassword = (password: string, record?: string | null): PasswordCheck => {
  if (!record) return { ok: false, needsRehash: false };
  const candidate = String(password ?? '');

  if (isHashedPassword(record)) {
    const parts = String(record).split('$');
    const saltHex = parts[1];
    const hashHex = parts[2];
    if (!saltHex || !hashHex) return { ok: false, needsRehash: false };
    try {
      const salt = Buffer.from(saltHex, 'hex');
      const expected = Buffer.from(hashHex, 'hex');
      if (expected.length === 0) return { ok: false, needsRehash: false };
      const derived = crypto.scryptSync(candidate, salt, expected.length, SCRYPT_OPTS);
      return {
        ok: derived.length === expected.length && crypto.timingSafeEqual(derived, expected),
        needsRehash: false,
      };
    } catch {
      return { ok: false, needsRehash: false };
    }
  }

  /* Tương thích ngược: dữ liệu cũ lưu plaintext → so khớp rồi băm lại. */
  const expected = Buffer.from(String(record), 'utf8');
  const given = Buffer.from(candidate, 'utf8');
  const ok = expected.length === given.length && crypto.timingSafeEqual(expected, given);
  return { ok, needsRehash: ok };
};

/* -------------------------------------------------------------------------- */
/* Token phiên có chữ ký (HMAC-SHA256)                                        */
/* -------------------------------------------------------------------------- */

export interface SessionClaims {
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/** 30 ngày — đủ dài cho thiết bị cá nhân, đủ ngắn để thu hồi theo hạn. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const TOKEN_PREFIX = 'f_token_';

export const createSessionToken = (
  email: string,
  role: string = 'STUDENT',
  ttlMs: number = SESSION_TTL_MS,
): string => {
  const now = Date.now();
  const claims = {
    email: String(email).trim().toLowerCase(),
    role: String(role || 'STUDENT'),
    iat: now,
    exp: now + ttlMs,
  };
  const body = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', sessionSecret).update(body).digest('base64url');
  /* Giữ tiền tố `f_token_` để tương thích client cũ đang đọc localStorage. */
  return `${TOKEN_PREFIX}${body}.${signature}`;
};

/** Trả về claims nếu chữ ký hợp lệ và chưa hết hạn, ngược lại `null`. */
export const verifySessionToken = (token?: string | null): SessionClaims | null => {
  if (!token || typeof token !== 'string') return null;
  const raw = token.startsWith(TOKEN_PREFIX) ? token.slice(TOKEN_PREFIX.length) : token;
  const dot = raw.indexOf('.');
  if (dot <= 0) return null;
  const body = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  if (!body || !signature) return null;

  let expected: Buffer;
  let provided: Buffer;
  try {
    expected = crypto.createHmac('sha256', sessionSecret).update(body).digest();
    provided = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) return null;

  try {
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!claims || typeof claims.email !== 'string' || !claims.email) return null;
    if (typeof claims.exp !== 'number' || claims.exp <= Date.now()) return null;
    return {
      email: claims.email.trim().toLowerCase(),
      role: typeof claims.role === 'string' ? claims.role : 'STUDENT',
      iat: typeof claims.iat === 'number' ? claims.iat : 0,
      exp: claims.exp,
    };
  } catch {
    return null;
  }
};

/** Đọc token từ header `Authorization: Bearer <token>`. */
export const readBearerToken = (req?: IncomingMessage | null): string | null => {
  const header = req?.headers?.authorization;
  const value = Array.isArray(header) ? header[0] : header;
  if (!value || typeof value !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(value.trim());
  return match ? match[1].trim() : null;
};

/** Xác thực một request: token hợp lệ + email trong token khớp email đang thao tác. */
export const authorizeRequest = (
  req: IncomingMessage,
  email?: string | null,
  bodyToken?: string | null,
): SessionClaims | null => {
  const claims = verifySessionToken(readBearerToken(req) || bodyToken || null);
  if (!claims) return null;
  if (email && claims.email !== String(email).trim().toLowerCase()) return null;
  return claims;
};

/* -------------------------------------------------------------------------- */
/* Chặn ghi đè giới hạn (rate limit)                                          */
/* -------------------------------------------------------------------------- */

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
  remaining: number;
}

/** Cửa sổ trượt: đơn giản, chính xác, không cần Redis. */
export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly max: number;

  constructor(windowMs: number, max: number) {
    this.windowMs = windowMs;
    this.max = max;
  }

  check(key: string, now: number = Date.now()): RateLimitResult {
    const cutoff = now - this.windowMs;
    const recent = (this.hits.get(key) || []).filter((t) => t > cutoff);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return { allowed: false, retryAfterMs: Math.max(0, recent[0] + this.windowMs - now), remaining: 0 };
    }
    recent.push(now);
    this.hits.set(key, recent);
    return { allowed: true, retryAfterMs: 0, remaining: Math.max(0, this.max - recent.length) };
  }

  reset(key?: string): void {
    if (key) this.hits.delete(key);
    else this.hits.clear();
  }

  get trackedKeys(): number {
    return this.hits.size;
  }
}

/** Đọc IP thật (có xét proxy) để chặn brute-force theo nguồn. */
export const clientIpOf = (req: IncomingMessage): string => {
  const forwarded = req.headers['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (first) return String(first).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
};

/* -------------------------------------------------------------------------- */
/* Toàn vẹn bản ghi người dùng                                                */
/* -------------------------------------------------------------------------- */

/**
 * Các trường client KHÔNG BAO GIỜ được tự ghi. `role` ở đây là lỗ hổng nặng
 * nhất: trước đây WS `SYNC_USER` cho phép tự phong SUPER_ADMIN.
 */
export const SERVER_OWNED_USER_FIELDS: readonly string[] = ['id', 'email', 'role'];

/** Giới hạn hợp lý để một payload bẩn không phá vỡ bảng xếp hạng. */
const NUMERIC_BOUNDS: Record<string, [number, number]> = {
  coin: [0, 10_000_000],
  xp: [0, 100_000_000],
  fPoints: [0, 100_000_000],
  level: [1, 150],
  streakCount: [0, 100_000],
};

const MAX_TEXT_LENGTH = 20_000;

/** Lọc payload cập nhật hồ sơ: bỏ trường server sở hữu, kẹp số, cắt chuỗi dài. */
export const sanitizeUserUpdate = (updates: unknown): Record<string, unknown> => {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) return {};
  const clean: Record<string, unknown> = {};

  Object.entries(updates as Record<string, unknown>).forEach(([key, value]) => {
    if (SERVER_OWNED_USER_FIELDS.includes(key)) return;
    if (value === undefined) return;

    const bounds = NUMERIC_BOUNDS[key];
    if (bounds) {
      const num = Number(value);
      if (!Number.isFinite(num)) return;
      clean[key] = Math.max(bounds[0], Math.min(bounds[1], Math.round(num)));
      return;
    }

    if (key === 'inventory' || key === 'scopedClubIds') {
      if (Array.isArray(value)) clean[key] = Array.from(new Set(value.slice(0, 500).map(String)));
      return;
    }

    if (typeof value === 'string') {
      clean[key] = value.length > MAX_TEXT_LENGTH ? value.slice(0, MAX_TEXT_LENGTH) : value;
      return;
    }

    if (typeof value === 'boolean' || typeof value === 'number') clean[key] = value;
  });

  return clean;
};

/* -------------------------------------------------------------------------- */
/* Néo tiền thưởng (bounty)                                                   */
/* -------------------------------------------------------------------------- */

export const BOUNTY_MIN = 10;
export const BOUNTY_MAX = 100;
export const BOUNTY_DEFAULT = 20;

export const normalizeBounty = (value: unknown): number => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return BOUNTY_DEFAULT;
  return Math.max(BOUNTY_MIN, Math.min(BOUNTY_MAX, Math.round(num)));
};

/** Số coin trả cho người có lời giải được chọn: 50% tiền cược + 100 coin danh dự. */
export const solverAwardFor = (bountyCoin: number): number =>
  Math.floor(Math.max(0, Number(bountyCoin) || 0) * 0.5) + 100;

/* -------------------------------------------------------------------------- */
/* ID an toàn                                                                 */
/* -------------------------------------------------------------------------- */

export const randomId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
