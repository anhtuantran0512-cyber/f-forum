/* Bản quyền trí tuệ thuộc về BroAmStuck */
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';

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

function loadStoreFromDisk() {
  try {
    if (fs.existsSync(dataFilePath)) {
      const raw = fs.readFileSync(dataFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        store = {
          users: { ...store.users, ...(parsed.users || {}) },
          passwords: { ...store.passwords, ...(parsed.passwords || {}) },
          clubs: Array.isArray(parsed.clubs) ? parsed.clubs : [],
          clubPosts: Array.isArray(parsed.clubPosts) ? parsed.clubPosts : [],
          questions: Array.isArray(parsed.questions) ? parsed.questions : [],
          solutions: Array.isArray(parsed.solutions) ? parsed.solutions : [],
          chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
          feedbacks: Array.isArray(parsed.feedbacks) ? parsed.feedbacks : [],
          about: parsed.about || store.about,
        };
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
      if (body.length > 25 * 1024 * 1024) {
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

    wss.on('connection', (ws) => {
      wsClients.add(ws);

      ws.send(JSON.stringify({ type: 'WS_CONNECTED', payload: { clientCount: wsClients.size } }));

      ws.on('message', (messageRaw) => {
        try {
          const { type, payload } = JSON.parse(messageRaw.toString());
          if (!type) return;

          switch (type) {
            case 'PING': {
              ws.send(JSON.stringify({ type: 'PONG' }));
              break;
            }
            case 'NEW_CHAT_MESSAGE': {
              if (payload && payload.content) {
                if (!store.chatMessages.some(m => m.id === payload.id)) {
                  store.chatMessages.push(payload);
                  persistStoreToDisk();
                }
                broadcastServerEvent('NEW_CHAT_MESSAGE', payload);
              }
              break;
            }
            case 'PRESENCE_PING': {
              if (payload) {
                broadcastServerEvent('PRESENCE_PING', payload);
              }
              break;
            }
            case 'NEW_QUESTION': {
              if (payload && payload.id) {
                store.questions.unshift(payload);
                const user = Object.values(store.users).find(u => u.id === payload.authorId);
                if (user) {
                  user.xp += 50;
                  user.fPoints = (user.fPoints ?? user.xp) + 50;
                  user.level = calculateLevelFromXP(user.xp);
                  broadcastServerEvent('SYNC_USER', user);
                }
                persistStoreToDisk();
                broadcastServerEvent('NEW_QUESTION', payload);
              }
              break;
            }
            case 'NEW_SOLUTION': {
              if (payload && payload.id) {
                store.solutions.push(payload);
                const user = Object.values(store.users).find(u => u.id === payload.authorId);
                if (user) {
                  user.xp += 25;
                  user.fPoints = (user.fPoints ?? user.xp) + 25;
                  user.level = calculateLevelFromXP(user.xp);
                  broadcastServerEvent('SYNC_USER', user);
                }
                persistStoreToDisk();
                broadcastServerEvent('NEW_SOLUTION', payload);
              }
              break;
            }
            case 'MARK_BEST_SOLUTION': {
              const { questionId, solutionId } = payload || {};
              store.questions = store.questions.map(q =>
                q.id === questionId ? { ...q, isSolved: true, bestSolutionId: solutionId } : q
              );
              const sol = store.solutions.find(s => s.id === solutionId);
              if (sol) {
                sol.isBest = true;
                sol.upvotes = (sol.upvotes || 0) + 5;
                if (sol.authorEmail && store.users[sol.authorEmail.toLowerCase()]) {
                  const solver = store.users[sol.authorEmail.toLowerCase()];
                  solver.xp += 100;
                  solver.fPoints = (solver.fPoints ?? solver.xp) + 100;
                  solver.level = calculateLevelFromXP(solver.xp);
                  broadcastServerEvent('SYNC_USER', solver);
                }
              }
              persistStoreToDisk();
              broadcastServerEvent('MARK_BEST_SOLUTION', payload);
              break;
            }
            case 'NEW_CLUB': {
              if (payload && payload.id) {
                store.clubs.unshift(payload);
                persistStoreToDisk();
                broadcastServerEvent('NEW_CLUB', payload);
              }
              break;
            }
            case 'APPROVE_CLUB': {
              const clubId = payload;
              store.clubs = store.clubs.map(c => (c.id === clubId ? { ...c, status: 'APPROVED' } : c));
              const club = store.clubs.find(c => c.id === clubId);
              if (club) {
                const creator = Object.values(store.users).find(u => u.id === club.leaderId);
                if (creator) {
                  creator.role = creator.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'CLUB_LEADER';
                  creator.scopedClubIds = Array.from(new Set([...creator.scopedClubIds, clubId]));
                  creator.xp += 250;
                  creator.fPoints = (creator.fPoints ?? creator.xp) + 250;
                  creator.level = calculateLevelFromXP(creator.xp);
                  broadcastServerEvent('SYNC_USER', creator);
                }
              }
              persistStoreToDisk();
              broadcastServerEvent('APPROVE_CLUB', clubId);
              break;
            }
            case 'REJECT_CLUB': {
              const { clubId, reason } = payload || {};
              store.clubs = store.clubs.map(c =>
                c.id === clubId ? { ...c, status: 'REJECTED', rejectReason: reason } : c
              );
              persistStoreToDisk();
              broadcastServerEvent('REJECT_CLUB', payload);
              break;
            }
            case 'NEW_CLUB_POST': {
              if (payload && payload.id) {
                store.clubPosts.unshift(payload);
                persistStoreToDisk();
                broadcastServerEvent('NEW_CLUB_POST', payload);
              }
              break;
            }
            case 'SYNC_USER': {
              if (payload && payload.email) {
                store.users[payload.email.toLowerCase()] = payload;
                persistStoreToDisk();
                broadcastServerEvent('SYNC_USER', payload);
              }
              break;
            }
            case 'DELETE_QUESTION': {
              const { questionId } = payload || {};
              if (questionId) {
                store.questions = store.questions.filter(q => q.id !== questionId);
                store.solutions = store.solutions.filter(s => s.questionId !== questionId);
                persistStoreToDisk();
                broadcastServerEvent('DELETE_QUESTION', { questionId });
              }
              break;
            }
            case 'EDIT_QUESTION': {
              const { questionId, updates } = payload || {};
              if (questionId && updates) {
                store.questions = store.questions.map(q =>
                  q.id === questionId ? { ...q, ...updates } : q
                );
                persistStoreToDisk();
                broadcastServerEvent('EDIT_QUESTION', { questionId, updates });
              }
              break;
            }
            case 'DELETE_SOLUTION': {
              const { solutionId } = payload || {};
              if (solutionId) {
                store.solutions = store.solutions.filter(s => s.id !== solutionId);
                store.questions = store.questions.map(q =>
                  q.bestSolutionId === solutionId ? { ...q, isSolved: false, bestSolutionId: undefined } : q
                );
                persistStoreToDisk();
                broadcastServerEvent('DELETE_SOLUTION', { solutionId });
              }
              break;
            }
            case 'DELETE_CHAT_MESSAGE': {
              const { messageId } = payload || {};
              if (messageId) {
                store.chatMessages = store.chatMessages.filter(m => m.id !== messageId);
                persistStoreToDisk();
                broadcastServerEvent('DELETE_CHAT_MESSAGE', { messageId });
              }
              break;
            }
            case 'SYNC_ABOUT': {
              if (payload) {
                store.about = payload;
                persistStoreToDisk();
                broadcastServerEvent('SYNC_ABOUT', payload);
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
        if (!body.content || !body.channelId) {
          sendJson(res, 400, { success: false, message: 'Nội dung tin nhắn không được để trống' });
          return;
        }

        const msg = {
          id: body.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
          channelId: body.channelId,
          authorId: body.authorId || 'guest',
          authorName: body.authorName || 'Học sinh',
          authorEmail: body.authorEmail || '',
          authorAvatar: body.authorAvatar || DEFAULT_AVATAR,
          authorLevel: body.authorLevel || 1,
          content: body.content,
          senderId: body.senderId || '',
          timestamp: body.timestamp || new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
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
        const body = await parseJsonBody(req);
        if (body && body.user) {
          broadcastServerEvent('PRESENCE_PING', body.user);
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
        const bountyCoin = body.bountyCoin ? Math.max(10, Math.min(100, Number(body.bountyCoin) || 20)) : 20;
        const newQuestion = {
          id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: body.title,
          subject: body.subject || 'toan',
          content: body.content,
          authorId: body.authorId,
          authorName: body.authorName,
          authorAvatar: body.authorAvatar || DEFAULT_AVATAR,
          isAnonymous: Boolean(body.isAnonymous),
          anonymousAlias: body.anonymousAlias,
          anonymousMask: body.anonymousMask,
          createdAt: 'Vừa xong',
          isSolved: false,
          views: 1,
          bountyCoin,
          imageUrl: body.imageUrl || undefined,
        };

        store.questions.unshift(newQuestion);

        if (body.authorEmail && store.users[body.authorEmail.toLowerCase()]) {
          const user = store.users[body.authorEmail.toLowerCase()];
          user.coin = Math.max(0, (user.coin ?? 100) - bountyCoin);
          user.xp += 50;
          user.fPoints = (user.fPoints ?? user.xp) + 50;
          user.level = calculateLevelFromXP(user.xp);
          broadcastServerEvent('SYNC_USER', user);
        }

        persistStoreToDisk();
        broadcastServerEvent('NEW_QUESTION', newQuestion);
        sendJson(res, 200, { success: true, question: newQuestion });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/solutions') {
      try {
        const body = await parseJsonBody(req);
        const newSolution = {
          id: `sol-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          questionId: body.questionId,
          authorId: body.authorId,
          authorName: body.authorName,
          authorEmail: body.authorEmail,
          authorAvatar: body.authorAvatar || DEFAULT_AVATAR,
          authorLevel: body.authorLevel || 1,
          content: body.content,
          createdAt: 'Vừa xong',
          isBest: false,
          upvotes: 1,
          imageUrl: body.imageUrl || undefined,
        };

        store.solutions.push(newSolution);

        if (body.authorEmail && store.users[body.authorEmail.toLowerCase()]) {
          const user = store.users[body.authorEmail.toLowerCase()];
          user.xp += 25;
          user.fPoints = (user.fPoints ?? user.xp) + 25;
          user.level = calculateLevelFromXP(user.xp);
          broadcastServerEvent('SYNC_USER', user);
        }

        persistStoreToDisk();
        broadcastServerEvent('NEW_SOLUTION', newSolution);
        sendJson(res, 200, { success: true, solution: newSolution });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/solutions/best') {
      try {
        const body = await parseJsonBody(req);
        const { questionId, solutionId } = body;

        const isSuperAdmin = (body.currentUserEmail || '').trim().toLowerCase() === 'anhtuantran0512@gmail.com';
        const targetQ = store.questions.find(q => q.id === questionId);
        const isAuthor = Boolean(targetQ && body.currentUserId && targetQ.authorId === body.currentUserId);

        if (!isSuperAdmin && !isAuthor) {
          sendJson(res, 403, {
            success: false,
            message: 'Chỉ tác giả câu hỏi hoặc Super Admin mới có quyền xác nhận đáp án chuẩn!',
          });
          return;
        }

        store.questions = store.questions.map(q =>
          q.id === questionId ? { ...q, isSolved: true, bestSolutionId: solutionId } : q
        );

        store.solutions = store.solutions.map(s => {
          if (s.questionId === questionId) {
            if (s.id === solutionId) {
              return { ...s, isBest: true, upvotes: (s.upvotes || 0) + 5 };
            }
            return { ...s, isBest: false };
          }
          return s;
        });

        const sol = store.solutions.find(s => s.id === solutionId);
        if (sol && sol.authorEmail && store.users[sol.authorEmail.toLowerCase()]) {
          const solver = store.users[sol.authorEmail.toLowerCase()];
          const bounty = (targetQ && (targetQ as any).bountyCoin) ? (targetQ as any).bountyCoin : 20;
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

        const isSuperAdmin = email === 'anhtuantran0512@gmail.com';
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
              id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
        store.passwords[email] = password;
        persistStoreToDisk();

        broadcastServerEvent('SYNC_USER', newUser);

        const token = `f_token_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        sendJson(res, 200, { success: true, user: newUser, token });
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
        if (registeredPassword && registeredPassword !== password) {
          sendJson(res, 400, { success: false, message: 'Mật khẩu không chính xác. Vui lòng thử lại!' });
          return;
        }

        const token = `f_token_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        sendJson(res, 200, { success: true, user, token });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/auth/social') {
      try {
        const body = await parseJsonBody(req);
        const provider = body.provider || 'google';
        const name = (body.name || '').trim();
        const email = (body.email || '').trim().toLowerCase();
        const avatar = (body.avatar || '').trim();

        if (!email || !email.includes('@')) {
          sendJson(res, 400, { success: false, message: 'Địa chỉ email mạng xã hội không hợp lệ!' });
          return;
        }

        let user = store.users[email];
        if (!user) {
          const isSuperAdmin = email === 'anhtuantran0512@gmail.com';
          user = isSuperAdmin
            ? {
                id: 'user-admin',
                name: name || 'Trần Văn Anh Tuấn',
                email: 'anhtuantran0512@gmail.com',
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
                id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
          const isSuperAdmin = email === 'anhtuantran0512@gmail.com';
          if (isSuperAdmin) {
            if (user.role !== 'SUPER_ADMIN') {
              user.role = 'SUPER_ADMIN';
              updated = true;
            }
            if (user.level !== 150) {
              user.level = 150;
              updated = true;
            }
            if (user.xp < 45000) {
              user.xp = 45000;
              user.fPoints = 45000;
              updated = true;
            }
          }
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

        const token = `f_token_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        sendJson(res, 200, { success: true, user, token });
      } catch (err: any) {
        sendJson(res, 500, { success: false, message: err.message });
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
        sendJson(res, 500, { success: false, message: err.message });
      }
      return;
    }

    if (method === 'POST' && url === '/api/users/update') {
      try {
        const body = await parseJsonBody(req);
        const email = (body.email || '').trim().toLowerCase();
        if (email && store.users[email] && body.updates) {
          store.users[email] = { ...store.users[email], ...body.updates };
          persistStoreToDisk();
          broadcastServerEvent('SYNC_USER', store.users[email]);
          sendJson(res, 200, { success: true, user: store.users[email] });
          return;
        }
        sendJson(res, 400, { success: false, message: 'Người dùng không tồn tại' });
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
        const adminEmail = (body.adminEmail || '').trim().toLowerCase();
        if (adminEmail !== 'anhtuantran0512@gmail.com') {
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
        const adminEmail = (body.adminEmail || '').trim().toLowerCase();
        if (adminEmail !== 'anhtuantran0512@gmail.com') {
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
        const adminEmail = (body.adminEmail || '').trim().toLowerCase();
        if (adminEmail !== 'anhtuantran0512@gmail.com') {
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
        const adminEmail = (body.adminEmail || '').trim().toLowerCase();
        if (adminEmail !== 'anhtuantran0512@gmail.com') {
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
        const adminEmail = (body.adminEmail || '').trim().toLowerCase();
        if (adminEmail !== 'anhtuantran0512@gmail.com') {
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
