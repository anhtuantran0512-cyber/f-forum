/* Bản quyền trí tuệ thuộc về BroAmStuck */
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { sanitizePersistedUser } from '../src/utils/userSanitizer.ts';
import { SHOP_ITEMS } from '../src/utils/shopData.ts';
import { getDailyQuestionById } from '../src/utils/dailyQuestions.ts';
import { EARNED_BADGE_IDS, type EarnedBadgeId } from '../src/utils/badges.ts';

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
  earnedBadges?: string[];
  equippedBadge?: string;
  bio: string;
  gender?: string;
  city?: string;
  className?: string;
  scopedClubIds: string[];
  activityLog?: { id: string; points: number; reason: string; createdAt: string }[];
  attendanceDates?: string[];
  lastCheckInDate?: string;
  lastQuizDate?: string;
  lastQuizQuestionId?: string;
  lastQuizCorrect?: boolean;
  lastFocusRewardAt?: string;
  mysteryBoxes?: { blue: number; gold: number; red: number };
  stats?: {
    thanksCount: number;
    bestCount: number;
    fiveStarCount: number;
    verifiedCount: number;
    helpedCount: number;
    answersCount: number;
    questionsCount: number;
  };
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
  profileLikes?: Record<string, string[]>;
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

function appendPointActivity(user: UserRecord, points: number, reason: string) {
  if (!Number.isFinite(points) || points <= 0) return;
  const activity = {
    id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    points,
    reason,
    createdAt: new Date().toISOString(),
  };
  user.activityLog = [...(user.activityLog || []), activity].slice(-500);
  user.xp = Math.max(0, Number(user.xp) || 0) + points;
  user.fPoints = user.xp;
  user.level = calculateLevelFromXP(user.xp);
}

function awardBadge(user: UserRecord, badgeId: EarnedBadgeId): void {
  if (!EARNED_BADGE_IDS.has(badgeId)) return;
  user.earnedBadges ||= [];
  if (!user.earnedBadges.includes(badgeId)) user.earnedBadges.push(badgeId);
}

interface ServerSession {
  userId: string;
  email: string;
  expiresAt: number;
}

const sessions = new Map<string, ServerSession>();
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_COOKIE = 'fforum_session';

function getSessionToken(req: IncomingMessage): string | null {
  const cookieHeader = req.headers.cookie || '';
  const cookie = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (cookie) return decodeURIComponent(cookie.slice(SESSION_COOKIE.length + 1));
  const authorization = req.headers.authorization || '';
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : null;
}

function getAuthenticatedUser(req: IncomingMessage): UserRecord | undefined {
  const token = getSessionToken(req);
  if (!token) return undefined;
  const session = sessions.get(token);
  if (!session) return undefined;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return undefined;
  }
  const user = store.users[session.email];
  if (!user || user.id !== session.userId) {
    sessions.delete(token);
    return undefined;
  }
  return user;
}

function setSessionCookie(req: IncomingMessage, res: ServerResponse, token: string, maxAge: number) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const isSecure = Boolean((req.socket as any).encrypted) || forwardedProto === 'https';
  const secure = isSecure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`);
}

function createSession(req: IncomingMessage, res: ServerResponse, user: UserRecord): void {
  const token = randomBytes(32).toString('base64url');
  sessions.set(token, { userId: user.id, email: user.email.toLowerCase(), expiresAt: Date.now() + SESSION_LIFETIME_MS });
  setSessionCookie(req, res, token, Math.floor(SESSION_LIFETIME_MS / 1000));
}

function clearSession(req: IncomingMessage, res: ServerResponse): void {
  const token = getSessionToken(req);
  if (token) sessions.delete(token);
  setSessionCookie(req, res, '', 0);
}

function findUserForRequest(req: IncomingMessage, emailValue?: unknown, idValue?: unknown): UserRecord | undefined {
  const user = getAuthenticatedUser(req);
  if (!user) return undefined;
  const email = String(emailValue || '').trim().toLowerCase();
  if (email && email !== user.email.toLowerCase()) return undefined;
  if (idValue && user.id !== String(idValue)) return undefined;
  return user;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(stored: string, password: string): boolean {
  if (!stored.startsWith('scrypt$')) return stored === password;
  const [, salt, expectedHex] = stored.split('$');
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231a2332"/><circle cx="50" cy="38" r="20" fill="%234a5d78"/><path d="M20 90 Q50 65 80 90" fill="%234a5d78"/></svg>`;

const dataDir = path.resolve(process.cwd(), 'data');
const dataFilePath = path.join(dataDir, 'forum-data.json');

let store: ForumDataStore = {
  users: {
    'anhtuantran0512@gmail.com': {
      id: 'user-admin',
      name: 'Trần Văn Anh Tuấn',
      email: 'anhtuantran0512@gmail.com',
      avatar: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_a455843c-d8db-461c-8ef6-74a325d2472c.png',
      role: 'SUPER_ADMIN',
      level: 1,
      xp: 0,
      fPoints: 0,
      coin: 0,
      streakCount: 0,
      bio: '',
      scopedClubIds: [],
      inventory: [],
      activityLog: [],
      attendanceDates: [],
      mysteryBoxes: { blue: 0, gold: 0, red: 0 },
      stats: {
        thanksCount: 0,
        bestCount: 0,
        fiveStarCount: 0,
        verifiedCount: 1,
        helpedCount: 0,
        answersCount: 0,
        questionsCount: 0,
      },
    },
  },
  passwords: {},
  profileLikes: {},

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

function sanitizeUserRegistryForServer(input: Record<string, unknown>): Record<string, UserRecord> {
  const result: Record<string, UserRecord> = {};
  for (const [key, rawUser] of Object.entries(input)) {
    const user = sanitizePersistedUser(rawUser, key);
    if (!user) continue;
    const isMasterAdmin = user.email.toLowerCase() === 'anhtuantran0512@gmail.com';
    const safeRole = isMasterAdmin
      ? 'SUPER_ADMIN'
      : user.role === 'CLUB_LEADER'
        ? 'CLUB_LEADER'
        : 'STUDENT';
    const actualQuestionCount = store.questions.filter((question) => question.authorId === user.id).length;
    const actualSolutions = store.solutions.filter((solution) => solution.authorId === user.id);
    result[user.email] = {
      ...user,
      role: safeRole,
      stats: {
        thanksCount: Number(user.stats?.thanksCount) || 0,
        bestCount: actualSolutions.filter((solution) => solution.isBest).length,
        fiveStarCount: 0,
        verifiedCount: isMasterAdmin ? 1 : 0,
        helpedCount: actualSolutions.length,
        answersCount: actualSolutions.length,
        questionsCount: actualQuestionCount,
      },
    };
  }
  return result;
}

function loadStoreFromDisk() {
  try {
    if (fs.existsSync(dataFilePath)) {
      const raw = fs.readFileSync(dataFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const mergedUsers = sanitizeUserRegistryForServer({ ...store.users, ...(parsed.users || {}) });
        const passwords = { ...store.passwords, ...(parsed.passwords || {}) };
        if (passwords['anhtuantran0512@gmail.com'] === 'admin123') {
          delete passwords['anhtuantran0512@gmail.com'];
        }
        store = {
          users: mergedUsers,
          passwords,
          clubs: Array.isArray(parsed.clubs) ? parsed.clubs : [],
          clubPosts: Array.isArray(parsed.clubPosts) ? parsed.clubPosts : [],
          questions: Array.isArray(parsed.questions) ? parsed.questions : [],
          solutions: Array.isArray(parsed.solutions) ? parsed.solutions : [],
          chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
          feedbacks: Array.isArray(parsed.feedbacks) ? parsed.feedbacks : [],
          reports: Array.isArray(parsed.reports) ? parsed.reports : [],
          profileLikes: parsed.profileLikes && typeof parsed.profileLikes === 'object' ? parsed.profileLikes : {},
          about: parsed.about || store.about,
        };
        store.users = sanitizeUserRegistryForServer(store.users);
      }
    }
  } catch (err) {
    console.error('[Forum Server] Failed to load data from disk:', err);
  }
}

let saveTimeout: NodeJS.Timeout | null = null;
function persistStoreToDisk() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(dataFilePath, JSON.stringify(store, null, 2), 'utf8');
    } catch (err) {
      console.error('[Forum Server] Failed to persist data to disk:', err);
    }
  }, 200);
  saveTimeout.unref();
}

const wsClients = new Set<WebSocket>();
const sseClients = new Set<ServerResponse>();

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

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(data));
}

export function setupForumServer(httpServer: any, middlewares: any) {
  loadStoreFromDisk();

  delete store.users['hocsinhmoi@fpt.edu.vn'];
  delete store.passwords['hocsinhmoi@fpt.edu.vn'];

  if (httpServer) {
    const wss = new WebSocketServer({ noServer: true });

    httpServer.on('upgrade', (req: IncomingMessage, socket: any, head: any) => {
      const url = req.url || '';
      if (url === '/ws' || url.startsWith('/ws?') || url.startsWith('/api/ws')) {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      }
    });

    wss.on('connection', (ws, req) => {
      const socketUser = getAuthenticatedUser(req);
      wsClients.add(ws);

      ws.send(JSON.stringify({ type: 'WS_CONNECTED', payload: { clientCount: wsClients.size } }));

      ws.on('message', (messageRaw) => {
        try {
          const { type } = JSON.parse(messageRaw.toString());
          if (!type) return;

          switch (type) {
            case 'PING': {
              ws.send(JSON.stringify({ type: 'PONG' }));
              break;
            }
            case 'NEW_CHAT_MESSAGE': {
              // Persistent chat writes go through REST, where identity comes from the session.
              break;
            }
            case 'PRESENCE_PING': {
              if (socketUser) {
                broadcastServerEvent('PRESENCE_PING', {
                  id: socketUser.id,
                  name: socketUser.name,
                  avatar: socketUser.avatar,
                  role: socketUser.role,
                  level: socketUser.level,
                  email: socketUser.email,
                });
              }
              break;
            }
            case 'NEW_QUESTION': {
              // Question creation and its reward are handled atomically by /api/questions.
              // Ignore legacy client-side writes so a second device cannot mint rewards.
              break;
            }
            case 'NEW_SOLUTION': {
              // Solution creation and its reward are handled by /api/solutions.
              break;
            }
            case 'MARK_BEST_SOLUTION': {
              // Best-answer selection is authorized and rewarded by /api/solutions/best.
              break;
            }
            case 'NEW_CLUB':
            case 'APPROVE_CLUB':
            case 'REJECT_CLUB':
            case 'NEW_CLUB_POST': {
              // Club writes must pass through the validating REST endpoints below.
              break;
            }
            case 'SYNC_USER': {
              // Do not accept account, role, or reward changes from an unauthenticated WS message.
              break;
            }
            case 'DELETE_QUESTION':
            case 'EDIT_QUESTION':
            case 'DELETE_SOLUTION':
            case 'DELETE_CHAT_MESSAGE':
            case 'SYNC_ABOUT': {
              // Moderation and content updates are accepted only through authenticated REST routes.
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
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
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
        sendJson(res, 401, { success: false, message: 'Phiên đăng nhập đã hết hạn.' });
        return;
      }
      sendJson(res, 200, { success: true, user });
      return;
    }

    if (method === 'POST' && url === '/api/auth/logout') {
      clearSession(req, res);
      sendJson(res, 200, { success: true });
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
          profileLikes: store.profileLikes || {},
          about: store.about,
        },
      });
      return;
    }

    if (method === 'GET' && url.startsWith('/api/profile-likes')) {
      const requestUrl = new URL(url, 'http://f-forum.local');
      const targetId = requestUrl.searchParams.get('targetId') || '';
      const viewerId = requestUrl.searchParams.get('viewerId') || '';
      const targetUser = Object.values(store.users).find((user) => user.id === targetId);
      if (!targetUser) {
        sendJson(res, 404, { success: false, message: 'Không tìm thấy hồ sơ.' });
        return;
      }
      const likers = store.profileLikes?.[targetId] || [];
      const viewer = getAuthenticatedUser(req);
      const liked = Boolean(viewer && viewerId === viewer.id && likers.includes(viewer.id));
      sendJson(res, 200, { success: true, count: likers.length, liked });
      return;
    }

    if (method === 'POST' && url === '/api/profile-likes') {
      try {
        const body = await parseJsonBody(req);
        const target = Object.values(store.users).find((user) => user.id === body.targetId);
        const viewer = getAuthenticatedUser(req);
        if (!viewer || !target || target.id === viewer.id) {
          sendJson(res, viewer ? 400 : 401, { success: false, message: 'Đăng nhập để gửi cảm ơn cho hồ sơ này.' });
          return;
        }
        store.profileLikes ||= {};
        const likers = store.profileLikes[target.id] || [];
        const liked = likers.includes(viewer.id);
        store.profileLikes[target.id] = liked
          ? likers.filter((id) => id !== viewer.id)
          : [...likers, viewer.id];
        target.stats ||= { thanksCount: 0, bestCount: 0, fiveStarCount: 0, verifiedCount: 0, helpedCount: 0, answersCount: 0, questionsCount: 0 };
        target.stats.thanksCount = store.profileLikes[target.id].length;
        persistStoreToDisk();
        broadcastServerEvent('SYNC_USER', target);
        sendJson(res, 200, { success: true, count: target.stats.thanksCount, liked: !liked });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/users/award-xp') {
      try {
        const body = await parseJsonBody(req);
        const user = findUserForRequest(req, body.email, body.userId);
        if (!user || body.action !== 'focus_session') {
          sendJson(res, 400, { success: false, message: 'Không thể ghi nhận phiên tập trung.' });
          return;
        }
        const now = Date.now();
        const lastReward = user.lastFocusRewardAt ? Date.parse(user.lastFocusRewardAt) : 0;
        if (lastReward && now - lastReward < 25 * 60 * 1000) {
          sendJson(res, 429, { success: false, message: 'Phần thưởng phiên tập trung chỉ được ghi nhận sau một phiên 25 phút.' });
          return;
        }
        appendPointActivity(user, 25, 'Hoàn thành phiên tập trung');
        user.lastFocusRewardAt = new Date(now).toISOString();
        persistStoreToDisk();
        broadcastServerEvent('SYNC_USER', user);
        sendJson(res, 200, { success: true, user, points: 25 });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/daily/check-in') {
      try {
        const body = await parseJsonBody(req);
        const user = findUserForRequest(req, body.email, body.userId);
        if (!user) {
          sendJson(res, 401, { success: false, message: 'Đăng nhập để điểm danh.' });
          return;
        }
        const today = todayKey();
        if (user.lastCheckInDate === today) {
          sendJson(res, 409, { success: false, message: 'Bạn đã điểm danh hôm nay rồi.' });
          return;
        }
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        user.streakCount = user.lastCheckInDate === yesterday ? (user.streakCount || 0) + 1 : 1;
        user.lastCheckInDate = today;
        user.attendanceDates = [...new Set([...(user.attendanceDates || []), today])].slice(-60);
        user.coin = (user.coin || 0) + 25;
        user.mysteryBoxes ||= { blue: 0, gold: 0, red: 0 };
        let boxType: 'blue' | 'gold' | 'red' | null = null;
        if (user.streakCount % 15 === 0) boxType = 'red';
        else if (user.streakCount % 10 === 0) boxType = 'gold';
        else if (user.streakCount % 5 === 0) boxType = 'blue';
        if (boxType) user.mysteryBoxes[boxType] += 1;
        appendPointActivity(user, 5, 'Điểm danh hằng ngày');
        if (user.streakCount === 7) awardBadge(user, 'streak-7');
        if (user.streakCount === 30) awardBadge(user, 'streak-30');
        persistStoreToDisk();
        broadcastServerEvent('SYNC_USER', user);
        sendJson(res, 200, { success: true, user, rewardCoin: 25, rewardXp: 5, boxType });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/daily/quiz') {
      try {
        const body = await parseJsonBody(req);
        const user = findUserForRequest(req, body.email, body.userId);
        const question = getDailyQuestionById(String(body.questionId || ''));
        if (!user || !question) {
          sendJson(res, 400, { success: false, message: 'Câu hỏi hoặc tài khoản không hợp lệ.' });
          return;
        }
        const today = todayKey();
        if (user.lastQuizDate === today) {
          sendJson(res, 409, { success: false, message: 'Bạn đã trả lời câu hỏi hôm nay rồi.' });
          return;
        }
        const choice = Number(body.choice);
        const correct = Number.isInteger(choice) && choice === question.answer;
        user.lastQuizDate = today;
        user.lastQuizQuestionId = question.id;
        user.lastQuizCorrect = correct;
        if (correct) {
          appendPointActivity(user, 10, 'Trả lời đúng câu hỏi ngày');
          user.coin = (user.coin || 0) + 5;
          awardBadge(user, 'daily-quiz-correct');
        }
        persistStoreToDisk();
        broadcastServerEvent('SYNC_USER', user);
        sendJson(res, 200, {
          success: true,
          user,
          correct,
          rewardCoin: correct ? 5 : 0,
          rewardXp: correct ? 10 : 0,
          answer: question.answer,
          explanation: question.explanation,
        });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/daily/open-box') {
      try {
        const body = await parseJsonBody(req);
        const user = findUserForRequest(req, body.email, body.userId);
        const type = body.type as 'blue' | 'gold' | 'red';
        if (!user || !['blue', 'gold', 'red'].includes(type)) {
          sendJson(res, 400, { success: false, message: 'Hộp quà không hợp lệ.' });
          return;
        }
        user.mysteryBoxes ||= { blue: 0, gold: 0, red: 0 };
        if (user.mysteryBoxes[type] <= 0) {
          sendJson(res, 400, { success: false, message: 'Bạn chưa có hộp quà này.' });
          return;
        }
        const rewardCoin = type === 'blue' ? 30 : type === 'gold' ? 80 : 200;
        user.mysteryBoxes[type] -= 1;
        user.coin = (user.coin || 0) + rewardCoin;
        persistStoreToDisk();
        broadcastServerEvent('SYNC_USER', user);
        sendJson(res, 200, { success: true, user, rewardCoin });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/shop/purchase') {
      try {
        const body = await parseJsonBody(req);
        const user = findUserForRequest(req, body.email, body.userId);
        const item = SHOP_ITEMS.find((entry) => entry.id === body.itemId);
        if (!user || !item) {
          sendJson(res, 400, { success: false, message: 'Tài khoản hoặc vật phẩm không hợp lệ.' });
          return;
        }
        user.inventory ||= [];
        if (user.inventory.includes(item.id)) {
          sendJson(res, 409, { success: false, message: 'Bạn đã sở hữu vật phẩm này.' });
          return;
        }
        if ((user.coin || 0) < item.price) {
          sendJson(res, 400, { success: false, message: `Bạn cần ${item.price} Coin để mua vật phẩm này.` });
          return;
        }
        user.coin = (user.coin || 0) - item.price;
        user.inventory = [...user.inventory, item.id];
        persistStoreToDisk();
        broadcastServerEvent('SYNC_USER', user);
        sendJson(res, 200, { success: true, user, item });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/clubs') {
      try {
        const body = await parseJsonBody(req);
        const leader = findUserForRequest(req, body.leaderEmail, body.leaderId);
        if (!leader || !String(body.name || '').trim() || !String(body.purpose || '').trim()) {
          sendJson(res, 400, { success: false, message: 'Vui lòng nhập tên CLB và mục tiêu hoạt động.' });
          return;
        }
        const id = String(body.id || `club-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
        const duplicate = store.clubs.find((club) => club.id === id);
        if (duplicate) {
          sendJson(res, 200, { success: true, club: duplicate, duplicate: true });
          return;
        }
        const club = {
          id,
          name: String(body.name).trim().slice(0, 80),
          slogan: String(body.slogan || '').trim().slice(0, 160),
          coverImage: String(body.coverImage || ''),
          category: body.category || 'Học thuật',
          foundingMembers: [leader.name],
          purpose: String(body.purpose).trim().slice(0, 2000),
          leaderId: leader.id,
          leaderName: leader.name,
          followerCount: 1,
          membersCount: 1,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        };
        store.clubs.unshift(club);
        persistStoreToDisk();
        broadcastServerEvent('NEW_CLUB', club);
        sendJson(res, 200, { success: true, club });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/clubs/approve') {
      try {
        const body = await parseJsonBody(req);
        const admin = getAuthenticatedUser(req);
        const club = store.clubs.find((entry) => entry.id === body.clubId);
        if (admin?.role !== 'SUPER_ADMIN' || !club) {
          sendJson(res, 403, { success: false, message: 'Không có quyền phê duyệt CLB này.' });
          return;
        }
        if (club.status !== 'PENDING') {
          sendJson(res, 409, { success: false, message: 'Yêu cầu CLB đã được xử lý.' });
          return;
        }
        club.status = 'APPROVED';
        const creator = Object.values(store.users).find((user) => user.id === club.leaderId);
        if (creator && creator.role !== 'SUPER_ADMIN') {
          creator.role = 'CLUB_LEADER';
          creator.scopedClubIds = [...new Set([...(creator.scopedClubIds || []), club.id])];
          broadcastServerEvent('SYNC_USER', creator);
        }
        persistStoreToDisk();
        broadcastServerEvent('APPROVE_CLUB', club.id);
        sendJson(res, 200, { success: true, club, user: creator });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/clubs/reject') {
      try {
        const body = await parseJsonBody(req);
        const admin = getAuthenticatedUser(req);
        const club = store.clubs.find((entry) => entry.id === body.clubId);
        if (admin?.role !== 'SUPER_ADMIN' || !club) {
          sendJson(res, 403, { success: false, message: 'Không có quyền xử lý CLB này.' });
          return;
        }
        club.status = 'REJECTED';
        club.rejectReason = String(body.reason || '').trim().slice(0, 300);
        persistStoreToDisk();
        broadcastServerEvent('REJECT_CLUB', { clubId: club.id, reason: club.rejectReason });
        sendJson(res, 200, { success: true, club });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/clubs/posts') {
      try {
        const body = await parseJsonBody(req);
        const author = findUserForRequest(req, body.authorEmail, body.authorId);
        const club = store.clubs.find((entry) => entry.id === body.clubId && entry.status === 'APPROVED');
        const canPost = Boolean(author && (author.role === 'SUPER_ADMIN' || author.scopedClubIds.includes(body.clubId)));
        if (!author || !club || !canPost || !String(body.title || '').trim() || !String(body.content || '').trim()) {
          sendJson(res, 403, { success: false, message: 'Bạn chưa có quyền đăng bài trong CLB này.' });
          return;
        }
        const id = String(body.id || `cpost-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
        const duplicate = store.clubPosts.find((entry) => entry.id === id);
        if (duplicate) {
          sendJson(res, 200, { success: true, post: duplicate, duplicate: true });
          return;
        }
        const post = {
          id,
          clubId: club.id,
          authorId: author.id,
          authorName: author.name,
          authorAvatar: author.avatar,
          title: String(body.title).trim().slice(0, 150),
          content: String(body.content).trim().slice(0, 5000),
          createdAt: new Date().toISOString(),
          likes: 0,
        };
        store.clubPosts.unshift(post);
        persistStoreToDisk();
        broadcastServerEvent('NEW_CLUB_POST', post);
        sendJson(res, 200, { success: true, post });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/chat') {
      try {
        const body = await parseJsonBody(req);
        if (!body.content || !body.channelId) {
          sendJson(res, 400, { success: false, message: 'Nội dung tin nhắn không được để trống' });
          return;
        }

        const author = getAuthenticatedUser(req);
        const msg = {
          id: `msg-${Date.now()}-${randomBytes(6).toString('hex')}`,
          channelId: ['hallway', 'quick-qa', 'confessions', 'club-hub'].includes(body.channelId) ? body.channelId : 'hallway',
          authorId: author?.id || 'guest',
          authorName: author?.name || 'Khách',
          authorEmail: author?.email || '',
          authorAvatar: author?.avatar || DEFAULT_AVATAR,
          authorLevel: author?.level || 1,
          content: String(body.content).trim().slice(0, 2000),
          senderId: typeof body.senderId === 'string' ? body.senderId.slice(0, 80) : '',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };

        if (!store.chatMessages.some(m => m.id === msg.id)) {
          store.chatMessages.push(msg);
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
        const user = getAuthenticatedUser(req);
        if (user) {
          broadcastServerEvent('PRESENCE_PING', {
            id: user.id, name: user.name, avatar: user.avatar, role: user.role,
            level: user.level, email: user.email,
          });
        }
        sendJson(res, 200, { success: true });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/questions') {
      try {
        const body = await parseJsonBody(req);
        const author = findUserForRequest(req, body.authorEmail, body.authorId);
        if (!author || !String(body.title || '').trim() || !String(body.content || '').trim()) {
          sendJson(res, 400, { success: false, message: 'Tài khoản, tiêu đề hoặc nội dung câu hỏi chưa hợp lệ.' });
          return;
        }
        const requestedBounty = Number(body.bountyCoin) || 0;
        const bountyCoin = requestedBounty > 0 ? Math.max(10, Math.min(100, requestedBounty)) : 0;
        if ((author.coin || 0) < bountyCoin) {
          sendJson(res, 400, { success: false, message: `Bạn cần ${bountyCoin} Coin để đặt cược cho câu hỏi này.` });
          return;
        }
        const id = String(body.id || `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
        const duplicate = store.questions.find((question) => question.id === id);
        if (duplicate) {
          sendJson(res, 200, { success: true, question: duplicate, user: author, duplicate: true });
          return;
        }
        const createdAt = typeof body.createdAt === 'string' && !Number.isNaN(Date.parse(body.createdAt))
          ? body.createdAt
          : new Date().toISOString();
        const newQuestion = {
          id,
          title: String(body.title).trim().slice(0, 150),
          subject: body.subject || 'toan',
          content: String(body.content).trim().slice(0, 5000),
          authorId: author.id,
          authorName: body.isAnonymous ? String(body.anonymousAlias || 'Ẩn danh') : author.name,
          authorAvatar: body.isAnonymous ? String(body.anonymousMask || DEFAULT_AVATAR) : author.avatar,
          isAnonymous: Boolean(body.isAnonymous),
          anonymousAlias: body.isAnonymous ? String(body.anonymousAlias || 'Ẩn danh') : undefined,
          anonymousMask: body.isAnonymous ? String(body.anonymousMask || DEFAULT_AVATAR) : undefined,
          createdAt,
          isSolved: false,
          views: 0,
          bountyCoin,
          imageUrl: body.imageUrl || undefined,
        };
        const isFirstQuestion = !store.questions.some((question) => question.authorId === author.id);
        if (bountyCoin > 0) author.coin = (author.coin || 0) - bountyCoin;
        appendPointActivity(author, 20, 'Đặt câu hỏi');
        if (isFirstQuestion) awardBadge(author, 'first-question');
        if (author.stats) author.stats.questionsCount += 1;
        store.questions.unshift(newQuestion);
        persistStoreToDisk();
        broadcastServerEvent('SYNC_USER', author);
        broadcastServerEvent('NEW_QUESTION', newQuestion);
        sendJson(res, 200, { success: true, question: newQuestion, user: author });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/solutions') {
      try {
        const body = await parseJsonBody(req);
        const author = findUserForRequest(req, body.authorEmail, body.authorId);
        const question = store.questions.find((entry) => entry.id === body.questionId);
        if (!author || !question || !String(body.content || '').trim()) {
          sendJson(res, 400, { success: false, message: 'Tài khoản, câu hỏi hoặc nội dung lời giải chưa hợp lệ.' });
          return;
        }
        const id = String(body.id || `sol-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
        const duplicate = store.solutions.find((solution) => solution.id === id);
        if (duplicate) {
          sendJson(res, 200, { success: true, solution: duplicate, user: author, duplicate: true });
          return;
        }
        const createdAt = typeof body.createdAt === 'string' && !Number.isNaN(Date.parse(body.createdAt))
          ? body.createdAt
          : new Date().toISOString();
        const newSolution = {
          id,
          questionId: question.id,
          authorId: author.id,
          authorName: author.name,
          authorEmail: author.email,
          authorAvatar: author.avatar || DEFAULT_AVATAR,
          authorLevel: author.level || 1,
          content: String(body.content).trim().slice(0, 5000),
          createdAt,
          isBest: false,
          upvotes: 0,
          imageUrl: body.imageUrl || undefined,
        };
        const isFirstAnswer = !store.solutions.some((solution) => solution.authorId === author.id);
        store.solutions.push(newSolution);
        appendPointActivity(author, 10, 'Gửi lời giải');
        if (isFirstAnswer) awardBadge(author, 'first-answer');
        if (author.stats) {
          author.stats.answersCount += 1;
          author.stats.helpedCount += 1;
        }
        persistStoreToDisk();
        broadcastServerEvent('SYNC_USER', author);
        broadcastServerEvent('NEW_SOLUTION', newSolution);
        sendJson(res, 200, { success: true, solution: newSolution, user: author });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/solutions/best') {
      try {
        const body = await parseJsonBody(req);
        const { questionId, solutionId } = body;
        const targetQ = store.questions.find((question) => question.id === questionId);
        const actor = findUserForRequest(req, body.currentUserEmail, body.currentUserId);
        const solution = store.solutions.find((entry) => entry.id === solutionId && entry.questionId === questionId);
        const isSuperAdmin = actor?.role === 'SUPER_ADMIN';
        const isAuthor = Boolean(targetQ && actor && targetQ.authorId === actor.id);

        if (!actor || !targetQ || !solution) {
          sendJson(res, 400, { success: false, message: 'Không tìm thấy câu hỏi hoặc lời giải.' });
          return;
        }
        if (!isSuperAdmin && !isAuthor) {
          sendJson(res, 403, { success: false, message: 'Chỉ tác giả câu hỏi mới có quyền chọn lời giải tốt nhất.' });
          return;
        }
        if (targetQ.isSolved) {
          sendJson(res, 409, { success: false, message: 'Câu hỏi đã có lời giải tốt nhất.' });
          return;
        }

        targetQ.isSolved = true;
        targetQ.bestSolutionId = solutionId;
        targetQ.bountyPaid = Number(targetQ.bountyCoin) > 0;
        store.solutions = store.solutions.map((entry) =>
          entry.questionId === questionId ? { ...entry, isBest: entry.id === solutionId } : entry,
        );

        const solver = Object.values(store.users).find((user) => user.id === solution.authorId);
        const bounty = Math.max(0, Number(targetQ.bountyCoin) || 0);
        let updatedSolver: UserRecord | undefined;
        if (solver && solver.id !== targetQ.authorId) {
          solver.coin = (solver.coin || 0) + bounty;
          appendPointActivity(solver, 25, 'Lời giải được chọn');
          awardBadge(solver, 'best-answer');
          if (solver.stats) solver.stats.bestCount += 1;
          updatedSolver = solver;
        }

        persistStoreToDisk();
        if (updatedSolver) broadcastServerEvent('SYNC_USER', updatedSolver);
        broadcastServerEvent('MARK_BEST_SOLUTION', { questionId, solutionId });
        sendJson(res, 200, { success: true, user: updatedSolver, rewardCoin: bounty, rewardXp: updatedSolver ? 25 : 0 });
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
        if (!email || !email.includes('@')) {
          sendJson(res, 400, { success: false, message: 'Vui lòng nhập địa chỉ email hợp lệ!' });
          return;
        }
        if (!password || password.length < 6) {
          sendJson(res, 400, { success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự!' });
          return;
        }

        if (store.users[email]) {
          sendJson(res, 400, { success: false, message: 'Email này đã được đăng ký. Vui lòng đăng nhập!' });
          return;
        }

        const newUser: UserRecord = {
          id: `user-${Date.now()}-${randomBytes(6).toString('hex')}`,
          name,
          email,
          avatar: DEFAULT_AVATAR,
          role: 'STUDENT',
          level: 1,
          xp: 0,
          coin: 0,
          fPoints: 0,
          streakCount: 0,
          bio: '',
          gender: '',
          city: '',
          className: '',
          scopedClubIds: [],
          inventory: [],
          earnedBadges: [],
          activityLog: [],
          attendanceDates: [],
          mysteryBoxes: { blue: 0, gold: 0, red: 0 },
          stats: {
            thanksCount: 0,
            bestCount: 0,
            fiveStarCount: 0,
            verifiedCount: 0,
            helpedCount: 0,
            answersCount: 0,
            questionsCount: 0,
          },
        };

        store.users[email] = newUser;
        store.passwords[email] = hashPassword(password);
        persistStoreToDisk();

        broadcastServerEvent('SYNC_USER', newUser);

        createSession(req, res, newUser);
        sendJson(res, 200, { success: true, user: newUser });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
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

        const user = store.users[email];
        if (!user) {
          sendJson(res, 400, {
            success: false,
            message: 'Tài khoản không tồn tại. Vui lòng đăng ký trước!',
          });
          return;
        }

        const registeredPassword = store.passwords[email];
        if (!registeredPassword) {
          sendJson(res, 400, {
            success: false,
            message: 'Tài khoản này đăng nhập bằng Google hoặc Facebook. Hãy dùng đúng phương thức đã đăng ký.',
          });
          return;
        }
        if (!verifyPassword(registeredPassword, password)) {
          sendJson(res, 400, { success: false, message: 'Mật khẩu không chính xác. Vui lòng thử lại!' });
          return;
        }
        if (!registeredPassword.startsWith('scrypt$')) {
          store.passwords[email] = hashPassword(password);
          persistStoreToDisk();
        }
        createSession(req, res, user);
        sendJson(res, 200, { success: true, user });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/auth/social') {
      // The client must not be able to authenticate by posting an email address.
      // Add a verified OAuth callback before enabling social sign-in again.
      sendJson(res, 501, { success: false, message: 'Đăng nhập Google/Facebook chưa được cấu hình xác thực.' });
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
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/reports') {
      try {
        const body = await parseJsonBody(req);
        const reporter = getAuthenticatedUser(req);
        if (!reporter) {
          sendJson(res, 401, { success: false, message: 'Đăng nhập để gửi tố cáo.' });
          return;
        }
        const reportedUserId = String(body.reportedUserId || '').trim().slice(0, 160);
        const target = Object.values(store.users).find((user) => user.id === reportedUserId);
        const reportedUserName = target?.name || String(body.reportedUserName || 'Nội dung vi phạm').trim().slice(0, 80);
        const reason = String(body.reason || '').trim().slice(0, 120);
        const details = String(body.details || '').trim().slice(0, 1000);

        if (!reportedUserId || !reason || reportedUserId === reporter.id) {
          sendJson(res, 400, { success: false, message: 'Vui lòng kiểm tra đối tượng và lý do tố cáo.' });
          return;
        }

        const reportSubmission = {
          id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          reporterId: reporter.id,
          reporterName: reporter.name,
          reportedUserId,
          reportedUserName,
          reason,
          details,
          createdAt: new Date().toISOString(),
        };

        store.reports ||= [];
        store.reports.push(reportSubmission);
        persistStoreToDisk();
        sendJson(res, 200, {
          success: true,
          message: 'Báo cáo đã được ghi nhận.',
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
        const user = findUserForRequest(req, body.email, body.userId || body.updates?.id);
        if (!user || !body.updates || typeof body.updates !== 'object') {
          sendJson(res, 400, { success: false, message: 'Người dùng không tồn tại.' });
          return;
        }
        const updates = body.updates;
        if (typeof updates.name === 'string') user.name = updates.name.trim().slice(0, 60);
        if (typeof updates.avatar === 'string') user.avatar = updates.avatar.slice(0, 150000);
        if (typeof updates.bio === 'string') user.bio = updates.bio.trim().slice(0, 500);
        if (typeof updates.gender === 'string') user.gender = updates.gender.slice(0, 30);
        if (typeof updates.city === 'string') user.city = updates.city.trim().slice(0, 80);
        if (typeof updates.className === 'string') user.className = updates.className.trim().slice(0, 80);
        if (typeof updates.equippedBadge === 'string') {
          const badge = updates.equippedBadge;
          user.equippedBadge = !badge || (user.inventory || []).includes(badge) ? badge : user.equippedBadge || '';
        }
        store.questions = store.questions.map((question) =>
          question.authorId === user.id && !question.isAnonymous
            ? { ...question, authorName: user.name, authorAvatar: user.avatar }
            : question,
        );
        store.solutions = store.solutions.map((solution) =>
          solution.authorId === user.id
            ? { ...solution, authorName: user.name, authorAvatar: user.avatar, authorLevel: user.level }
            : solution,
        );
        store.chatMessages = store.chatMessages.map((message) =>
          message.authorId === user.id
            ? { ...message, authorName: user.name, authorAvatar: user.avatar, authorLevel: user.level }
            : message,
        );
        persistStoreToDisk();
        broadcastServerEvent('SYNC_USER', user);
        sendJson(res, 200, { success: true, user });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
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
        const admin = getAuthenticatedUser(req);
        if (admin?.role !== 'SUPER_ADMIN') {
          sendJson(res, 403, { success: false, message: 'Chỉ Super Admin mới có quyền cập nhật Khu Vinh Danh!' });
          return;
        }
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
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/questions/delete') {
      try {
        const body = await parseJsonBody(req);
        const admin = getAuthenticatedUser(req);
        if (admin?.role !== 'SUPER_ADMIN') {
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
        const admin = getAuthenticatedUser(req);
        if (admin?.role !== 'SUPER_ADMIN') {
          sendJson(res, 403, { success: false, message: 'Chỉ Super Admin mới có quyền sửa bài viết!' });
          return;
        }
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
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/solutions/delete') {
      try {
        const body = await parseJsonBody(req);
        const admin = getAuthenticatedUser(req);
        if (admin?.role !== 'SUPER_ADMIN') {
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
        const admin = getAuthenticatedUser(req);
        if (admin?.role !== 'SUPER_ADMIN') {
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
