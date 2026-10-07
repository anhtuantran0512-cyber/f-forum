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
  if (Buffer.byteLength(candidate, 'utf8') > 1024) return { ok: false, needsRehash: false };

  if (isHashedPassword(record)) {
    const parts = String(record).split('$');
    const saltHex = parts[1];
    const hashHex = parts[2];
    /* Độ dài khoá/salt cố định: không để dữ liệu JSON hỏng ép scrypt cấp phát
       lượng bộ nhớ tuỳ ý khi đăng nhập hoặc lúc thu hồi mật khẩu cũ. */
    if (parts.length !== 3 || !/^[a-f0-9]{32}$/i.test(saltHex || '') || !/^[a-f0-9]{64}$/i.test(hashHex || '')) {
      return { ok: false, needsRehash: false };
    }
    try {
      const salt = Buffer.from(saltHex, 'hex');
      const expected = Buffer.from(hashHex, 'hex');
      const derived = crypto.scryptSync(candidate, salt, SCRYPT_KEYLEN, SCRYPT_OPTS);
      return {
        ok: crypto.timingSafeEqual(derived, expected),
        needsRehash: false,
      };
    } catch {
      return { ok: false, needsRehash: false };
    }
  }

  /* Tương thích ngược: dữ liệu cũ lưu plaintext → so khớp rồi băm lại. */
  if (Buffer.byteLength(String(record), 'utf8') > 1024) return { ok: false, needsRehash: false };
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

  /**
   * Ảnh chụp tổng hợp cho trang vận hành của quản trị.
   *
   * Chỉ trả SỐ LIỆU GỘP, không trả danh sách khoá: khoá là IP/email của người
   * dùng thật, và endpoint đọc nó dù đã gate quyền vẫn không nên nhân bản dữ liệu
   * cá nhân ra thêm một chỗ. Quản trị cần biết "có bao nhiêu nguồn đang bị chặn",
   * không cần danh sách đó ở đây.
   */
  snapshot(now: number = Date.now()): {
    windowMs: number;
    max: number;
    trackedKeys: number;
    blockedKeys: number;
    totalHits: number;
  } {
    const cutoff = now - this.windowMs;
    let tracked = 0;
    let blocked = 0;
    let total = 0;
    this.hits.forEach((times) => {
      const recent = times.filter((t) => t > cutoff);
      /* Dọn luôn các khoá đã hết hạn trong lúc duyệt — Map này chỉ phình chứ
         không tự co lại, chạy lâu sẽ giữ hàng nghìn khoá rỗng. */
      if (recent.length === 0) return;
      tracked += 1;
      total += recent.length;
      if (recent.length >= this.max) blocked += 1;
    });
    return { windowMs: this.windowMs, max: this.max, trackedKeys: tracked, blockedKeys: blocked, totalHits: total };
  }

  /** Xoá các khoá không còn lượt nào trong cửa sổ — gọi định kỳ để giải phóng bộ nhớ. */
  prune(now: number = Date.now()): number {
    const cutoff = now - this.windowMs;
    let removed = 0;
    this.hits.forEach((times, key) => {
      const recent = times.filter((t) => t > cutoff);
      if (recent.length === 0) {
        this.hits.delete(key);
        removed += 1;
      } else if (recent.length !== times.length) {
        this.hits.set(key, recent);
      }
    });
    return removed;
  }
}

/** Đọc IP thật (có xét proxy) để chặn brute-force theo nguồn. */
/**
  IP dùng làm khoá cho MỌI rate limiter (đăng nhập, đăng ký, gửi tin, tố cáo…).

  LỖ HỔNG TRƯỚC ĐÂY: hàm này luôn tin header `X-Forwarded-For` do client gửi.
  Mà header đó client tự đặt được, nên chỉ cần đổi giá trị mỗi request là mỗi lần
  thử rơi vào một ô đếm khác nhau — toàn bộ chống brute-force bị vô hiệu.

  Repro (giới hạn đăng ký 30 lần/10 phút):
    không đổi header        -> 30/60 thành công, 30 bị chặn   (limiter hoạt động)
    đổi header mỗi lượt     -> 61/61 thành công               (vượt hoàn toàn)

  Nay chỉ tin header này khi người vận hành khai báo rõ là server ĐỨNG SAU proxy
  bằng `FFORUM_TRUST_PROXY=1`. Mặc định lấy địa chỉ socket thật, không thể giả.
*/
export const clientIpOf = (req: IncomingMessage): string => {
  const flag = process.env.FFORUM_TRUST_PROXY;
  if (flag === '1' || flag === 'true') {
    const forwarded = req.headers['x-forwarded-for'];
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    if (first) return String(first).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
};

/* -------------------------------------------------------------------------- */
/* Toàn vẹn bản ghi người dùng                                                */
/* -------------------------------------------------------------------------- */

/**
 * Các trường client KHÔNG BAO GIỜ được tự ghi. Ngoài `role`, vai trò kiểm duyệt,
 * Premium và phạm vi CLB đều là quyền hạn server cấp; để lọt một trường nào cũng
 * có thể mở ra leo thang quyền hoặc giả trạng thái thuê bao.
 */
export const SERVER_OWNED_USER_FIELDS: readonly string[] = [
  'id',
  'email',
  'role',
  'staffRole',
  'premiumUntil',
  'premiumGrantedAt',
  'scopedClubIds',
  'coin',
  'xp',
  'fPoints',
  'level',
  'streakCount',
  'inventory',
  'equippedBadge',
  'joinedAt',
];

const CLIENT_EDITABLE_PROFILE_FIELD_LIMITS = new Map<string, number>([
  ['name', 50],
  ['avatar', 2000],
  ['bio', 20000],
  ['gender', 40],
  ['city', 80],
  ['className', 80],
  ['bannerUrl', 2000],
  ['profileGradient', 500],
]);

/** Lọc theo allowlist hồ sơ: mọi quyền, tài nguyên và trường chưa được duyệt đều bị loại. */
export const sanitizeUserUpdate = (updates: unknown): Record<string, unknown> => {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) return {};
  const clean: Record<string, unknown> = {};

  Object.entries(updates as Record<string, unknown>).forEach(([key, value]) => {
    const maxLength = CLIENT_EDITABLE_PROFILE_FIELD_LIMITS.get(key);
    if (maxLength === undefined || SERVER_OWNED_USER_FIELDS.includes(key) || typeof value !== 'string') return;
    if (key === 'name' && !value.trim()) return;
    clean[key] = (key === 'name' ? value.trim() : value).slice(0, maxLength);
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
