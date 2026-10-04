/* Bản quyền trí tuệ thuộc về BroAmStuck */
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import {
  MASTER_ADMIN_EMAIL,
  SlidingWindowRateLimiter,
  authorizeRequest,
  clientIpOf,
  createSessionToken,
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
  bio: string;
  gender?: string;
  city?: string;
  className?: string;
  joinedAt?: string;
  bannerUrl?: string;
  profileGradient?: string;
  scopedClubIds: string[];
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

let store: ForumDataStore = {
  users: {
    'anhtuantran0512@gmail.com': {
      id: 'user-admin',
      name: 'Trần Văn Anh Tuấn',
      email: 'anhtuantran0512@gmail.com',
      avatar: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_a455843c-d8db-461c-8ef6-74a325d2472c.png',
      role: 'SUPER_ADMIN',
      level: 150,
      xp: 45000,
      fPoints: 45000,
      streakCount: 36,
      bio: 'F-Forum Architect & Core Administrator. Xây dựng tương lai tri thức học đường.',
      gender: 'Nam',
      city: 'Hà Nội',
      className: 'K19 Software Engineering',
      scopedClubIds: [],
    },
  },
  passwords: {
    'anhtuantran0512@gmail.com': 'admin123',
  },
  clubs: [],
  clubPosts: [],
  questions: [],
  solutions: [],
  chatMessages: [],
  feedbacks: [],
  about: {
    headline: 'Người Kiến Tạo & Quản Trị Hệ Thống',
    subtitle: 'Field Notes & Development Chronicles — BroAmStuck Studio',
    founder: {
      name: 'Trần Văn Anh Tuấn',
      role: 'Admin F-Forum • Owner BroAmStuck Studio',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=600&fit=crop&crop=faces',
      bio: 'Xây dựng F-Forum từ những dòng code đầu tiên với mong muốn tạo nên một không gian số bình đẳng, nơi học sinh tự do kết nối tri thức, chia sẻ câu lạc bộ và lưu giữ ký ức tuổi học trò mà không bị rào cản bởi phán xét hay công nghệ phức tạp.',
      email: 'anhtuantran0512@gmail.com',
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

/**
  Chuẩn hoá bản ghi người dùng nạp từ đĩa.

  Chỉ spread thô (`{ ...raw, email }`) là không đủ: tệp dữ liệu viết ra từ bản cũ
  thiếu hẳn những trường thêm về sau (ví dụ `scopedClubIds`). Bản ghi đó đi thẳng
  vào store với trường `undefined`, và chỗ nào spread/cộng dồn trường ấy sẽ ném
  `TypeError` — làm dở dang cả một luồng đang mutate nhiều bước.
*/
function sanitizeUsers(rawUsers: any): Record<string, UserRecord> {
  const out: Record<string, UserRecord> = {};
  if (!rawUsers || typeof rawUsers !== 'object') return out;
  Object.values(rawUsers).forEach((raw: any) => {
    if (!raw || typeof raw !== 'object') return;
    const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
    if (!email || !email.includes('@') || email.endsWith(RETIRED_VIRTUAL_DOMAIN)) return;
    if (!raw.id || !raw.name) return;
    out[email] = {
      ...raw,
      email,
      role: typeof raw.role === 'string' ? raw.role : 'STUDENT',
      avatar: typeof raw.avatar === 'string' ? raw.avatar : '',
      level: asCount(raw.level, 1),
      xp: asCount(raw.xp),
      fPoints: asCount(raw.fPoints, asCount(raw.xp)),
      coin: asCount(raw.coin, 100),
      scopedClubIds: Array.isArray(raw.scopedClubIds)
        ? raw.scopedClubIds.map((c: unknown) => String(c))
        : [],
    };
  });
  return out;
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
          clubs: Array.isArray(parsed.clubs) ? parsed.clubs : [],
          clubPosts: Array.isArray(parsed.clubPosts) ? parsed.clubPosts : [],
          questions: Array.isArray(parsed.questions) ? parsed.questions : [],
          solutions: Array.isArray(parsed.solutions) ? parsed.solutions : [],
          chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
          feedbacks: Array.isArray(parsed.feedbacks) ? parsed.feedbacks : [],
          /* LỖI MẤT DỮ LIỆU: bản cũ dựng lại store mà bỏ quên `reports`, nên mọi
             báo cáo vi phạm đã ghi xuống đĩa bị vứt đi mỗi lần khởi động lại. */
          reports: Array.isArray(parsed.reports) ? parsed.reports : store.reports || [],
          about: parsed.about || store.about,
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

let shutdownHooksInstalled = false;
function installShutdownFlush() {
  if (shutdownHooksInstalled) return;
  shutdownHooksInstalled = true;
  for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP'] as const) {
    process.on(signal, () => {
      flushPendingSave();
      process.exit(0);
    });
  }
  /* `exit` không chạy được code bất đồng bộ, nhưng ghi ở đây là đồng bộ. */
  process.on('exit', flushPendingSave);
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

const sessionOf = (ws: WebSocket): SessionClaims | null => wsSessions.get(ws) || null;

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

const startedAtMs = Date.now();

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
    avatar: String(verifiedUser?.avatar ?? payload.avatar ?? DEFAULT_AVATAR).slice(0, 2000),
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

function requireSuperAdmin(req: IncomingMessage, body: any): SessionClaims | null {
  const claims = authorizeRequest(req, null, body?.adminToken || body?.token || null);
  if (!claims) return null;
  if (!isMasterAdminEmail(claims.email)) return null;
  if (store.users[claims.email]?.role !== 'SUPER_ADMIN') return null;
  return claims;
}


export function setupForumServer(httpServer: any, middlewares: any) {
  loadStoreFromDisk();
  installShutdownFlush();

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

    wss.on('connection', (ws) => {
      if (wsClients.size >= MAX_WS_CLIENTS) {
        try {
          ws.send(JSON.stringify({ type: 'SERVER_FULL', payload: { message: 'Máy chủ đang quá tải, vui lòng thử lại sau.' } }));
        } catch { /* ignore */ }
        ws.close();
        return;
      }
      wsClients.add(ws);

      ws.send(JSON.stringify({ type: 'WS_CONNECTED', payload: { clientCount: wsClients.size } }));

      ws.on('message', (messageRaw) => {
        try {
          const { type, payload } = JSON.parse(messageRaw.toString());
          if (!type) return;

          const session = sessionOf(ws);

          switch (type) {
            case 'PING': {
              ws.send(JSON.stringify({ type: 'PONG' }));
              break;
            }
            case 'AUTH': {
              /* Gắn danh tính cho kết nối này. Không có bước này thì mọi thao tác
                 nhạy cảm bên dưới đều bị từ chối. */
              const token = typeof payload === 'string' ? payload : payload?.token;
              const claims = verifySessionToken(token);
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
                  persistStoreToDisk();
                  broadcastServerEvent('NEW_CHAT_MESSAGE', relayed);
                  break;
                }
                broadcastServerEvent('NEW_CHAT_MESSAGE', payload);
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
              if (!payload || !payload.id || !String(payload.title || '').trim() || !String(payload.content || '').trim()) break;
              /* Không trùng id → không thể phát lại một câu hỏi để nhân đôi. */
              if (store.questions.some(q => q.id === payload.id)) break;

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
                id: String(payload.id).slice(0, 80),
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
                authorAvatar: String(
                  (payload.isAnonymous ? payload.anonymousMask : asker.avatar) || DEFAULT_AVATAR
                ).slice(0, 2000),
                isAnonymous: Boolean(payload.isAnonymous),
                createdAt: 'Vừa xong',
                createdAtMs: Date.now(),
                isSolved: false,
                views: 1,
                bountyCoin: requestedBounty,
                imageUrl: typeof payload.imageUrl === 'string' ? payload.imageUrl.slice(0, 2000) : undefined,
              };

              /* Trừ coin treo thưởng THẬT — đây là phần đường HTTP có mà WS thiếu. */
              asker.coin = Math.max(0, balance - requestedBounty);
              broadcastServerEvent('SYNC_USER', asker);

              /* Vẫn KHÔNG cộng XP ở đường WS: XP do đường HTTP kiểm soát cấp. */
              store.questions.unshift(relayedQuestion);
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
              const targetQId = String(payload?.questionId || '').trim();
              if (!payload || !payload.id || !targetQId || !String(payload.content || '').trim()) break;
              /* Câu hỏi phải tồn tại, giống đường HTTP. */
              if (!store.questions.some(q => q.id === targetQId)) break;
              if (store.solutions.some(s => s.id === payload.id)) break;

              const relayedSolution = {
                id: String(payload.id).slice(0, 80),
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
                imageUrl: typeof payload.imageUrl === 'string' ? payload.imageUrl.slice(0, 2000) : undefined,
              };
              /* Không cộng XP ở đường WS — giữ nguyên như trước. */
              store.solutions.push(relayedSolution);
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
              store.questions = store.questions.map(q =>
                q.id === questionId ? { ...q, isSolved: true, bestSolutionId: solutionId } : q
              );
              store.solutions = store.solutions.map(s => {
                if (s.id === solutionId) return { ...s, isBest: true, upvotes: (s.upvotes || 0) + 5 };
                if (s.id === previousBestId) return { ...s, isBest: false };
                return s;
              });

              const solverEmail = String(targetSolution.authorEmail || '').toLowerCase();
              const solver = solverEmail ? store.users[solverEmail] : undefined;
              if (solver) {
                const award = solverAwardFor(targetQuestion.bountyCoin ?? 20);
                solver.coin = (solver.coin ?? 100) + award;
                /* fPoints phải lấy từ XP TRƯỚC khi cộng. Bản cũ viết
                   `(fPoints ?? xp) + award` SAU dòng `xp += award`, nên nếu fPoints
                   thiếu thì nhánh ?? lấy XP đã cộng làm gốc và bị cộng đôi. */
                solver.fPoints = (solver.fPoints ?? solver.xp) + award;
                solver.xp += award;
                solver.level = calculateLevelFromXP(solver.xp);
                broadcastServerEvent('SYNC_USER', solver);
              }
              persistStoreToDisk();
              broadcastServerEvent('MARK_BEST_SOLUTION', payload);
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
              persistStoreToDisk();
              broadcastServerEvent('NEW_CLUB', relayedClub);
              break;
            }
            case 'APPROVE_CLUB': {
              if (!isWsSuperAdmin(ws)) {
                ws.send(JSON.stringify({ type: 'FORBIDDEN', payload: { action: type } }));
                break;
              }
              const clubId = payload;
              /* Cùng chốt idempotent như đường HTTP. */
              const pendingClub = store.clubs.find(c => c.id === clubId);
              if (!pendingClub || pendingClub.status === 'APPROVED') break;
              store.clubs = store.clubs.map(c => (c.id === clubId ? { ...c, status: 'APPROVED' } : c));
              const club = store.clubs.find(c => c.id === clubId);
              if (club) {
                const creator = Object.values(store.users).find(u => u.id === club.leaderId);
                if (creator) {
                  creator.role = creator.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'CLUB_LEADER';
                  creator.scopedClubIds = Array.from(new Set([...(creator.scopedClubIds || []), clubId]));
                  creator.fPoints = (creator.fPoints ?? creator.xp) + 250;
                  creator.xp += 250;
                  creator.level = calculateLevelFromXP(creator.xp);
                  broadcastServerEvent('SYNC_USER', creator);
                }
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
              const { clubId, reason } = payload || {};
              store.clubs = store.clubs.map(c =>
                c.id === clubId ? { ...c, status: 'REJECTED', rejectReason: reason } : c
              );
              persistStoreToDisk();
              broadcastServerEvent('REJECT_CLUB', payload);
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
              persistStoreToDisk();
              broadcastServerEvent('NEW_CLUB_POST', relayedPost);
              break;
            }
            case 'SYNC_USER': {
              /* Chỉ chủ tài khoản mới được sửa hồ sơ của chính mình, và KHÔNG
                 được đụng tới `role` / `id` / `email` — server sở hữu ba trường đó. */
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

    if (method === 'OPTIONS' && url.startsWith('/api/')) {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.end();
      return;
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
        'Access-Control-Allow-Origin': '*',
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

        const authorEmail = String(body.authorEmail || '').trim().toLowerCase();
        const knownAuthor = authorEmail ? store.users[authorEmail] : undefined;

        const msg = {
          id: body.id || randomId('msg'),
          channelId: String(body.channelId).slice(0, 60),
          authorId: String(body.authorId || 'guest').slice(0, MAX_NAME_LENGTH),
          authorName: String(knownAuthor?.name || body.authorName || 'Học sinh').slice(0, MAX_NAME_LENGTH),
          authorEmail,
          authorAvatar: String(knownAuthor?.avatar || body.authorAvatar || DEFAULT_AVATAR).slice(0, 2000),
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
          const balance = author.coin ?? 100;
          if (balance < bountyCoin) {
            sendJson(res, 402, {
              success: false,
              message: `Số dư không đủ để treo thưởng ${bountyCoin} Coin. Hiện có ${balance} Coin.`,
            });
            return;
          }
        }

        const throttle = writeLimiter.check(`question:${clientIpOf(req)}`);
        if (!throttle.allowed) {
          sendRateLimited(res, throttle.retryAfterMs, 'đặt câu hỏi');
          return;
        }

        const isAnonymousQuestion = Boolean(body.isAnonymous);

        const newQuestion = {
          id: randomId('q'),
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
          authorId: String(author?.id ?? body.authorId ?? '').slice(0, MAX_NAME_LENGTH),
          authorName: String(
            isAnonymousQuestion
              ? (body.anonymousAlias || body.authorName || 'Pháp sư Ghibli')
              : (author?.name ?? body.authorName ?? 'Học sinh')
          ).slice(0, MAX_NAME_LENGTH),
          /* Trước đây authorEmail bị bỏ rơi → server không biết câu hỏi của ai
             và không thể kiểm tra quyền "chọn đáp án chuẩn". */
          authorEmail: authorEmail || undefined,
          authorLevel: author?.level ?? 1,
          authorAvatar: String(
            isAnonymousQuestion
              ? (body.anonymousMask || body.authorAvatar || DEFAULT_AVATAR)
              : (author?.avatar ?? body.authorAvatar ?? DEFAULT_AVATAR)
          ).slice(0, 2000),
          isAnonymous: isAnonymousQuestion,
          anonymousAlias: typeof body.anonymousAlias === 'string' ? body.anonymousAlias.slice(0, 40) : undefined,
          anonymousMask: typeof body.anonymousMask === 'string' ? body.anonymousMask.slice(0, 2000) : undefined,
          createdAt: 'Vừa xong',
          createdAtMs: Date.now(),
          isSolved: false,
          views: 1,
          bountyCoin,
          imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl.slice(0, 2000) : undefined,
        };

        store.questions.unshift(newQuestion);

        if (author) {
          author.coin = Math.max(0, (author.coin ?? 100) - bountyCoin);
          author.fPoints = (author.fPoints ?? author.xp ?? 0) + 50;
          author.xp = (author.xp ?? 0) + 50;
          author.level = calculateLevelFromXP(author.xp);
          broadcastServerEvent('SYNC_USER', author);
        }

        persistStoreToDisk();
        broadcastServerEvent('NEW_QUESTION', newQuestion);
        sendJson(res, 200, { success: true, question: newQuestion });
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
        if (!store.questions.some(q => q.id === questionId)) {
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
        }

        const throttle = writeLimiter.check(`solution:${clientIpOf(req)}`);
        if (!throttle.allowed) {
          sendRateLimited(res, throttle.retryAfterMs, 'gửi lời giải');
          return;
        }

        const newSolution = {
          id: randomId('sol'),
          questionId,
          /* Danh tính lấy từ bản ghi thật khi đã đăng nhập, như ở câu hỏi. */
          authorId: String(author?.id ?? body.authorId ?? '').slice(0, MAX_NAME_LENGTH),
          authorName: String(author?.name ?? body.authorName ?? 'Học sinh').slice(0, MAX_NAME_LENGTH),
          authorEmail: authorEmail || undefined,
          authorAvatar: String(author?.avatar ?? body.authorAvatar ?? DEFAULT_AVATAR).slice(0, 2000),
          authorLevel: author?.level ?? 1,
          content: content.slice(0, 20000),
          createdAt: 'Vừa xong',
          createdAtMs: Date.now(),
          isBest: false,
          upvotes: 1,
          imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl.slice(0, 2000) : undefined,
        };

        store.solutions.push(newSolution);

        if (author) {
          author.fPoints = (author.fPoints ?? author.xp ?? 0) + 25;
          author.xp = (author.xp ?? 0) + 25;
          author.level = calculateLevelFromXP(author.xp);
          broadcastServerEvent('SYNC_USER', author);
        }

        persistStoreToDisk();
        broadcastServerEvent('NEW_SOLUTION', newSolution);
        sendJson(res, 200, { success: true, solution: newSolution });
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

        /* Chọn lại đúng đáp án cũ thì không phát thưởng lần thứ hai. */
        const alreadyBest = (targetQ as any).bestSolutionId === solutionId;

        store.questions = store.questions.map(q =>
          q.id === questionId ? { ...q, isSolved: true, bestSolutionId: solutionId } : q
        );

        store.solutions = store.solutions.map(s => {
          if (s.questionId === questionId) {
            if (s.id === solutionId) {
              return alreadyBest ? { ...s, isBest: true } : { ...s, isBest: true, upvotes: (s.upvotes || 0) + 5 };
            }
            return { ...s, isBest: false };
          }
          return s;
        });

        const sol = store.solutions.find(s => s.id === solutionId);
        if (!alreadyBest && sol && sol.authorEmail && store.users[sol.authorEmail.toLowerCase()]) {
          const solver = store.users[sol.authorEmail.toLowerCase()];
          const bounty = (targetQ as any).bountyCoin || 20;
          const solverAward = solverAwardFor(bounty);
          solver.coin = (solver.coin ?? 100) + solverAward;
          solver.fPoints = (solver.fPoints ?? solver.xp) + solverAward;
          solver.xp += solverAward;
          solver.level = calculateLevelFromXP(solver.xp);
          broadcastServerEvent('SYNC_USER', solver);
        }

        persistStoreToDisk();
        broadcastServerEvent('MARK_BEST_SOLUTION', { questionId, solutionId });
        sendJson(res, 200, { success: true });
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
              email: 'anhtuantran0512@gmail.com',
              avatar: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_a455843c-d8db-461c-8ef6-74a325d2472c.png',
              role: 'SUPER_ADMIN',
              level: 150,
              xp: 45000,
              coin: 99999,
              fPoints: 45000,
              streakCount: 36,
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
            };

        store.users[email] = newUser;
        /* Không bao giờ lưu mật khẩu thô — chỉ giữ bản băm scrypt. */
        store.passwords[email] = hashPassword(password);
        persistStoreToDisk();

        broadcastServerEvent('SYNC_USER', newUser);

        sendJson(res, 200, { success: true, user: newUser, token: issueTokenFor(newUser) });
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

        const user = store.users[email];
        if (!user) {
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
            message: 'Tài khoản này đăng nhập bằng Google/Facebook. Vui lòng chọn nút đăng nhập mạng xã hội!',
          });
          return;
        }

        const check = verifyPassword(password, registeredPassword);
        if (!check.ok) {
          sendJson(res, 400, { success: false, message: 'Mật khẩu không chính xác. Vui lòng thử lại!' });
          return;
        }

        /* Mật khẩu plaintext cũ → băm lại ngay lần đăng nhập thành công này. */
        if (check.needsRehash) {
          store.passwords[email] = hashPassword(password);
          persistStoreToDisk();
        }

        loginLimiter.reset(`login:${ip}:${email}`);
        sendJson(res, 200, { success: true, user, token: issueTokenFor(user) });
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
    if (method === 'GET' && url.startsWith('/api/auth/session')) {
      const claims = authorizeRequest(req, null, null);
      if (!claims) {
        sendJson(res, 401, { success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
        return;
      }
      const account = store.users[claims.email];
      if (!account) {
        sendJson(res, 401, { success: false, message: 'Tài khoản này không còn tồn tại.' });
        return;
      }
      /* Role đọc từ bản ghi thật, không từ token — thu hồi quyền là có hiệu lực ngay. */
      sendJson(res, 200, {
        success: true,
        user: account,
        role: account.role,
        expiresAt: claims.exp,
      });
      return;
    }

    if (method === 'POST' && url === '/api/auth/social') {
      try {
        const body = await parseJsonBody(req);
        const provider: 'google' | 'facebook' = body.provider === 'facebook' ? 'facebook' : 'google';
        const name = (body.name || '').trim();
        const email = (body.email || '').trim().toLowerCase();
        const avatar = (body.avatar || '').trim();
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
              };

          store.users[email] = user;
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

        sendJson(res, 200, { success: true, user, token: issueTokenFor(user) });
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
          createdAt: new Date().toISOString().split('T')[0],
        };

        if (store.clubs.some(c => c.id === club.id)) {
          sendJson(res, 200, { success: true, club, duplicated: true });
          return;
        }
        store.clubs = [club, ...store.clubs].slice(0, MAX_CLUBS);
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
        if (club.status === 'APPROVED') {
          sendJson(res, 200, { success: true, club, alreadyApproved: true, message: 'Câu lạc bộ này đã được duyệt trước đó.' });
          return;
        }

        store.clubs = store.clubs.map(c => (c.id === clubId ? { ...c, status: 'APPROVED' } : c));
        const approved = store.clubs.find(c => c.id === clubId);
        const creator = Object.values(store.users).find(u => u.id === approved?.leaderId);
        if (creator) {
          creator.role = creator.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'CLUB_LEADER';
          creator.scopedClubIds = Array.from(new Set([...(creator.scopedClubIds || []), clubId]));
          /* fPoints lấy từ XP trước khi cộng — xem ghi chú ở nhánh WS. */
          creator.fPoints = (creator.fPoints ?? creator.xp) + 250;
          creator.xp += 250;
          creator.level = calculateLevelFromXP(creator.xp);
          broadcastServerEvent('SYNC_USER', creator);
        }
        persistStoreToDisk();
        broadcastServerEvent('APPROVE_CLUB', clubId);
        sendJson(res, 200, { success: true, club: approved, message: 'Đã duyệt câu lạc bộ.' });
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
        if (!store.clubs.some(c => c.id === clubId)) {
          sendJson(res, 404, { success: false, message: 'Không tìm thấy câu lạc bộ này!' });
          return;
        }
        store.clubs = store.clubs.map(c =>
          c.id === clubId ? { ...c, status: 'REJECTED', rejectReason: reason.slice(0, 500) } : c
        );
        persistStoreToDisk();
        broadcastServerEvent('REJECT_CLUB', { clubId, reason });
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
        persistStoreToDisk();
        broadcastServerEvent('NEW_CLUB_POST', post);
        sendJson(res, 200, { success: true, post, message: 'Đã đăng bài viết.' });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err?.message || 'Không đăng được bài viết' });
      }
      return;
    }

    if (method === 'POST' && url === '/api/reports') {
      try {
        const body = await parseJsonBody(req);
        const reporterId = (body.reporterId || '').trim();
        const reporterName = (body.reporterName || '').trim();
        const reporterEmail = (body.reporterEmail || '').trim();
        const reportedUserId = (body.reportedUserId || '').trim();
        const reportedUserName = (body.reportedUserName || '').trim();
        const reason = (body.reason || '').trim();
        const details = (body.details || '').trim();

        if (!reportedUserId || !reason) {
          sendJson(res, 400, { success: false, message: 'Vui lòng cung cấp lý do tố cáo!' });
          return;
        }

        const throttle = writeLimiter.check(`report:${clientIpOf(req)}`);
        if (!throttle.allowed) {
          sendRateLimited(res, throttle.retryAfterMs, 'gửi tố cáo');
          return;
        }

        const reportSubmission = {
          id: randomId('rep'),
          reporterId: reporterId.slice(0, 120),
          reporterName: reporterName.slice(0, 120),
          reporterEmail: reporterEmail.slice(0, 200).toLowerCase(),
          reportedUserId: reportedUserId.slice(0, 120),
          reportedUserName: reportedUserName.slice(0, 120),
          reason: reason.slice(0, 200),
          details: details.slice(0, 2000),
          targetEmail: MASTER_ADMIN_EMAIL,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        };

        if (!store.reports) {
          store.reports = [];
        }
        /* Cùng một người tố cùng một mục với cùng lý do trong thời gian ngắn thì
           gộp lại, tránh một nút bấm spam làm ngập hộp thư ban quản trị. */
        const duplicate = store.reports.find(
          r =>
            r.reporterId === reportSubmission.reporterId &&
            r.reportedUserId === reportSubmission.reportedUserId &&
            r.reason === reportSubmission.reason &&
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
        store.reports = capTail([...store.reports, reportSubmission], MAX_REPORTS);
        persistStoreToDisk();
        broadcastServerEvent('NEW_REPORT', reportSubmission);
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

        /* Bỏ `role` / `id` / `email` khỏi payload, kẹp số về khoảng hợp lý —
           đây chính là chỗ trước kia cho phép tự phong SUPER_ADMIN. */
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
        broadcastServerEvent('REPORT_UPDATED', { reportId, action, report: updated });
        sendJson(res, 200, { success: true, report: updated, reports: store.reports });
      } catch (err: any) {
        handleApiError(res, err);
      }
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
        if (!requireSuperAdmin(req, body)) {
          sendJson(res, 403, { success: false, message: 'Chỉ Super Admin mới có quyền xóa bài viết!' });
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
        if (!requireSuperAdmin(req, body)) {
          sendJson(res, 403, { success: false, message: 'Chỉ Super Admin mới có quyền sửa bài viết!' });
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
        if (!requireSuperAdmin(req, body)) {
          sendJson(res, 403, { success: false, message: 'Chỉ Super Admin mới có quyền xóa phản hồi!' });
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
        if (!requireSuperAdmin(req, body)) {
          sendJson(res, 403, { success: false, message: 'Chỉ Super Admin mới có quyền thu hồi tin nhắn!' });
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
