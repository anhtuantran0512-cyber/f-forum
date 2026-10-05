/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  DimensionView,
  User,
  Club,
  ClubPost,
  Question,
  Solution,
  ChatMessage,
  ChatChannelId,
  FeedbackSubmission,
  SubjectTag,
  ClubCategory,
  OnlinePresenceUser,
} from '../types';
import { playChime } from '../utils/audio';
import {
  generateGhibliAlias,
  getRandomGhibliMask,
} from '../utils/ghibliMasks';
import { safeStorage } from '../utils/storage';
import { DEFAULT_AVATAR } from '../utils/mediaFallback';
import {
  type AboutData,
  getSavedAboutData,
  saveAboutDataLocally,
  saveAboutDataToServer,
} from './adminStore';
import { MASTER_ADMIN_CONFIG, isMasterAdmin } from '../config/admin';
import { getTierForLevel } from '../utils/tier';
import { pushNotification } from '../utils/notifications';

const CURRENT_TAB_ID =
  typeof window !== 'undefined'
    ? ((window as any).__FFORUM_TAB_ID__ ||
        ((window as any).__FFORUM_TAB_ID__ =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : 'tab-' + Math.random().toString(36).slice(2, 9)))
    : 'tab-node';


const XP_THRESHOLDS: number[] = Array.from({ length: 151 }, (_, lvl) =>
  lvl <= 1 ? 0 : Math.floor(140 * (lvl - 1) + 1.08 * Math.pow(lvl - 1, 2))
);

export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level >= 150) return XP_THRESHOLDS[150];
  return XP_THRESHOLDS[level];
}

export function getLevelForXP(xp: number): number {
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

let syncBroadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    syncBroadcastChannel = new BroadcastChannel('fforum_sync');
  }
} catch {
  syncBroadcastChannel = null;
}

/* -------------------------------------------------------------------------- */
/* Vệ sinh sổ đăng ký tài khoản                                               */
/* -------------------------------------------------------------------------- */
/**
 * Miền email của lớp tài khoản mô phỏng đã bị xoá vĩnh viễn khỏi hệ thống.
 * Bất kỳ bản ghi cũ nào còn sót trong localStorage / payload đồng bộ đều bị loại.
 */
export const RETIRED_VIRTUAL_DOMAIN = '@sv.f-forum.vn';

/** Số Coin chào mừng, đúng bằng mức server cấp khi tạo tài khoản thật */
const welcomeCoinFor = (email: string) => (email === 'anhtuantran0512@gmail.com' ? 99999 : 100);

/**
 * Chuẩn hoá sổ đăng ký: chỉ giữ tài khoản thật, khoá theo email (chữ thường),
 * bỏ tài khoản mô phỏng đã xoá và bản ghi hỏng. Nhờ vậy mọi bề mặt (bảng xếp
 * hạng, thẻ hồ sơ, danh sách thành viên) luôn nhìn đúng một nguồn dữ liệu.
 */
export function sanitizeUsersRegistry(input: unknown): Record<string, User> {
  if (!input || typeof input !== 'object') return {};
  const out: Record<string, User> = {};
  Object.values(input as Record<string, unknown>).forEach((raw) => {
    if (!raw || typeof raw !== 'object') return;
    const u = raw as User;
    const email = typeof u.email === 'string' ? u.email.trim().toLowerCase() : '';
    if (!email || !email.includes('@') || email.endsWith(RETIRED_VIRTUAL_DOMAIN)) return;
    if (!u.id || !u.name) return;
    out[email] = u.coin === undefined ? { ...u, email, coin: welcomeCoinFor(email) } : { ...u, email };
  });
  return out;
}

/* -------------------------------------------------------------------------- */
/* Đồng bộ danh tính vào nội dung đã đăng                                     */
/* -------------------------------------------------------------------------- */
/** Phần dữ liệu mà mỗi bài viết/tin nhắn tự lưu bản sao tên + ảnh tác giả */
interface AuthoredItem {
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorEmail?: string;
  authorLevel?: number;
  isAnonymous?: boolean;
}

/** Nội dung này có phải của tài khoản đang xét không (khớp theo id hoặc email) */
const isAuthoredBy = (item: AuthoredItem, user: User, emailKey: string) =>
  (Boolean(user.id) && item.authorId === user.id) ||
  (Boolean(emailKey) && (item.authorEmail || '').toLowerCase() === emailKey);

/**
 * Đổi tên / ảnh / cấp ở MỘT nơi thì mọi nội dung cũ của người đó cũng đổi theo ở
 * MỌI tab và mọi thiết bị: câu hỏi, lời giải, tin nhắn, bài CLB, tên trưởng CLB.
 * Câu hỏi ẩn danh được giữ nguyên bút danh (không lộ danh tính).
 */
function syncUserIdentityIntoContent(
  user: User,
  setters: {
    setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
    setSolutions: React.Dispatch<React.SetStateAction<Solution[]>>;
    setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    setClubPosts: React.Dispatch<React.SetStateAction<ClubPost[]>>;
    setClubs: React.Dispatch<React.SetStateAction<Club[]>>;
  },
) {
  const emailKey = (user.email || '').toLowerCase();

  setters.setQuestions(prev =>
    prev.map(q =>
      isAuthoredBy(q, user, emailKey) && !q.isAnonymous
        ? { ...q, authorName: user.name, authorAvatar: user.avatar }
        : q,
    ),
  );
  setters.setSolutions(prev =>
    prev.map(s =>
      isAuthoredBy(s, user, emailKey)
        ? { ...s, authorName: user.name, authorAvatar: user.avatar, authorLevel: user.level ?? s.authorLevel }
        : s,
    ),
  );
  setters.setChatMessages(prev =>
    prev.map(m =>
      isAuthoredBy(m, user, emailKey)
        ? { ...m, authorName: user.name, authorAvatar: user.avatar, authorLevel: user.level ?? m.authorLevel }
        : m,
    ),
  );
  setters.setClubPosts(prev =>
    prev.map(p =>
      isAuthoredBy(p, user, emailKey) ? { ...p, authorName: user.name, authorAvatar: user.avatar } : p,
    ),
  );
  setters.setClubs(prev => prev.map(c => (c.leaderId === user.id ? { ...c, leaderName: user.name } : c)));
}

const INITIAL_CHATS: ChatMessage[] = [];
const INITIAL_QUESTIONS: Question[] = [];
const INITIAL_SOLUTIONS: Solution[] = [];
const INITIAL_CLUBS: Club[] = [];
const INITIAL_CLUB_POSTS: ClubPost[] = [];

export function useForumStore() {
  const [currentView, setCurrentView] = useState<DimensionView>(() => {
    const hasSession = Boolean(safeStorage.getItem('fforum_current_user_email'));
    const hasSeenLanding = safeStorage.getItem('fforum_landing_seen') === 'true';
    return hasSession || hasSeenLanding ? 'home' : 'landing';
  });

  const [users, setUsers] = useState<Record<string, User>>(() => {
    const saved = safeStorage.getItem('fforum_users_registry');
    if (saved) {
      try {
        return sanitizeUsersRegistry(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
    return {};
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedEmail = safeStorage.getItem('fforum_current_user_email');
    if (!savedEmail) return null;
    const savedRegistry = safeStorage.getItem('fforum_users_registry');
    if (!savedRegistry) return null;
    try {
      return sanitizeUsersRegistry(JSON.parse(savedRegistry))[savedEmail.toLowerCase()] || null;
    } catch {
      return null;
    }
  });

  const [clubs, setClubs] = useState<Club[]>(() => {
    const saved = safeStorage.getItem('fforum_clubs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        /* ignore */
      }
    }
    return INITIAL_CLUBS;
  });

  const [clubPosts, setClubPosts] = useState<ClubPost[]>(() => {
    const saved = safeStorage.getItem('fforum_club_posts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        /* ignore */
      }
    }
    return INITIAL_CLUB_POSTS;
  });

  const [questions, setQuestions] = useState<Question[]>(() => {
    const saved = safeStorage.getItem('fforum_questions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        /* ignore */
      }
    }
    return INITIAL_QUESTIONS;
  });

  const [solutions, setSolutions] = useState<Solution[]>(() => {
    const saved = safeStorage.getItem('fforum_solutions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        /* ignore */
      }
    }
    return INITIAL_SOLUTIONS;
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = safeStorage.getItem('fforum_chat_messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (m: any) =>
              m &&
              m.id &&
              m.content &&
              !m.content.includes('tôi là acc clone') &&
              !m.content.includes('acc clone đang test')
          );
        }
      } catch {
        /* ignore */
      }
    }
    return INITIAL_CHATS;
  });

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    subtitle?: string;
    type?: 'xp' | 'success' | 'level';
  } | null>(null);

  const [onlineUsers, setOnlineUsers] = useState<OnlinePresenceUser[]>([]);
  const presenceMapRef = useRef<Map<string, { user: OnlinePresenceUser; lastSeen: number }>>(new Map());
  const activeWsRef = useRef<WebSocket | null>(null);
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const getGuestId = useCallback(() => {
    let gid = safeStorage.getItem('fforum_guest_id');
    if (!gid) {
      gid =
        'guest-' +
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID().slice(0, 8)
          : Math.random().toString(36).slice(2, 8));
      safeStorage.setItem('fforum_guest_id', gid);
    }
    return gid;
  }, []);

  const getSelfPresence = useCallback((): OnlinePresenceUser => {
    const user = currentUserRef.current;
    if (user) {
      const tier = getTierForLevel(user.level || 1);
      return {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        level: user.level,
        email: user.email,
        rank: tier.roman,
      };
    }
    const gid = getGuestId();
    return {
      id: gid,
      name: `Khách #${gid.slice(-4)}`,
      avatar: DEFAULT_AVATAR,
      role: 'STUDENT',
      level: 1,
      rank: 'I',
    };
  }, [getGuestId]);

  const getSelfPresenceRef = useRef(getSelfPresence);
  getSelfPresenceRef.current = getSelfPresence;

  const recomputeOnlineUsers = useCallback(() => {
    const now = Date.now();
    const active: OnlinePresenceUser[] = [];
    presenceMapRef.current.forEach((val, key) => {
      if (now - val.lastSeen <= 35000) {
        active.push(val.user);
      } else {
        presenceMapRef.current.delete(key);
      }
    });

    const self = getSelfPresenceRef.current();
    if (!active.some(u => u.id === self.id)) {
      active.unshift(self);
      presenceMapRef.current.set(self.id, { user: self, lastSeen: now });
    }

    const unique = Array.from(new Map(active.map(u => [u.id, u])).values());
    setOnlineUsers(unique);
  }, []);

  const handleIncomingPresencePing = useCallback(
    (incoming: OnlinePresenceUser) => {
      if (!incoming || !incoming.id) return;
      presenceMapRef.current.set(incoming.id, {
        user: incoming,
        lastSeen: Date.now(),
      });
      recomputeOnlineUsers();
    },
    [recomputeOnlineUsers]
  );

  const handleIncomingPresencePingRef = useRef(handleIncomingPresencePing);
  handleIncomingPresencePingRef.current = handleIncomingPresencePing;

  useEffect(() => {
    const ping = () => {
      const payload = getSelfPresence();
      presenceMapRef.current.set(payload.id, { user: payload, lastSeen: Date.now() });
      recomputeOnlineUsers();

      try {
        syncBroadcastChannel?.postMessage({
          type: 'PRESENCE_PING',
          payload,
        });
      } catch {
        /* ignore */
      }

      if (activeWsRef.current && activeWsRef.current.readyState === WebSocket.OPEN) {
        try {
          activeWsRef.current.send(JSON.stringify({ type: 'PRESENCE_PING', payload }));
        } catch {
          /* ignore */
        }
      } else {
        fetch('/api/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: payload }),
        }).catch(() => {});
      }
    };

    ping();
    const timer = setInterval(ping, 15000);
    const pruneTimer = setInterval(recomputeOnlineUsers, 5000);

    return () => {
      clearInterval(timer);
      clearInterval(pruneTimer);
    };
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      safeStorage.setItem('fforum_current_user_email', currentUser.email.toLowerCase());
    } else {
      safeStorage.removeItem('fforum_current_user_email');
    }
  }, [currentUser]);

  useEffect(() => {
    /* Ghi bản đã vệ sinh: tab khác nhận storage event cũng không thấy tài khoản mô phỏng */
    safeStorage.setItem('fforum_users_registry', JSON.stringify(sanitizeUsersRegistry(users)));
  }, [users]);

  useEffect(() => {
    safeStorage.setItem('fforum_clubs', JSON.stringify(clubs));
  }, [clubs]);

  useEffect(() => {
    safeStorage.setItem('fforum_club_posts', JSON.stringify(clubPosts));
  }, [clubPosts]);

  useEffect(() => {
    safeStorage.setItem('fforum_questions', JSON.stringify(questions));
  }, [questions]);

  useEffect(() => {
    safeStorage.setItem('fforum_solutions', JSON.stringify(solutions));
  }, [solutions]);

  useEffect(() => {
    safeStorage.setItem('fforum_chat_messages', JSON.stringify(chatMessages));
  }, [chatMessages]);

  const [aboutData, setAboutData] = useState<AboutData>(() => {
    return getSavedAboutData();
  });

  useEffect(() => {
    safeStorage.setItem('fforum_about_data', JSON.stringify(aboutData));
  }, [aboutData]);


  useEffect(() => {
    let isMounted = true;

    async function fetchServerState() {
      try {
        const res = await fetch('/api/sync');
        if (isMounted) setIsSynced(true);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data && isMounted) {
            const data = json.data;
            /* Sổ đăng ký chuẩn từ server (đã vệ sinh). Dùng nó gắn lại danh tính MỚI NHẤT
               cho nội dung tải về, để tên/ảnh cũ không nằm cứng trong bài viết. */
            const registry = sanitizeUsersRegistry({ ...(data.users || {}) });
            const resolveOwner = <T extends AuthoredItem>(item: T): T => {
              const owner =
                (item.authorEmail ? registry[item.authorEmail.toLowerCase()] : undefined) ||
                Object.values(registry).find(candidate => candidate.id === item.authorId);
              if (!owner) return item;
              if (owner.name === item.authorName && owner.avatar === item.authorAvatar) return item;
              return { ...item, authorName: owner.name, authorAvatar: owner.avatar } as T;
            };

            if (data.users && Object.keys(data.users).length > 0) {
              /* Server là nguồn chuẩn; vệ sinh để tài khoản mô phỏng cũ không quay lại */
              setUsers(prev => sanitizeUsersRegistry({ ...prev, ...data.users }));
            }
            if (Array.isArray(data.clubs)) {
              setClubs(
                data.clubs.map((c: Club) => {
                  const owner = Object.values(registry).find(candidate => candidate.id === c.leaderId);
                  return owner && owner.name !== c.leaderName ? { ...c, leaderName: owner.name } : c;
                })
              );
            }
            if (Array.isArray(data.clubPosts)) {
              setClubPosts(data.clubPosts.map((p: ClubPost) => resolveOwner(p)));
            }
            if (Array.isArray(data.questions)) {
              /* Câu hỏi ẩn danh giữ nguyên bút danh */
              setQuestions(data.questions.map((q: Question) => (q.isAnonymous ? q : resolveOwner(q))));
            }
            if (Array.isArray(data.solutions)) {
              setSolutions(data.solutions.map((sol: Solution) => resolveOwner(sol)));
            }
            if (Array.isArray(data.chatMessages)) {
              const cleanMsgs = data.chatMessages
                .filter(
                  (m: any) =>
                    m &&
                    m.id &&
                    m.content &&
                    !m.content.includes('tôi là acc clone') &&
                    !m.content.includes('acc clone đang test')
                )
                .map((m: ChatMessage) => resolveOwner(m));
              setChatMessages(cleanMsgs);
            }
            if (data.about) {
              setAboutData(data.about);
              saveAboutDataLocally(data.about);
            }


            const savedEmail = safeStorage.getItem('fforum_current_user_email');
            if (savedEmail && data.users && data.users[savedEmail.toLowerCase()]) {
              setCurrentUser(data.users[savedEmail.toLowerCase()]);
            }
          }
        }
      } catch {
        /* ignore offline/error */
      }
    }

    fetchServerState();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let ws: WebSocket | null = null;
    let sse: EventSource | null = null;
    let reconnectTimer: any = null;
    let isDisposed = false;

    const handleServerBroadcast = (type: string, payload: any) => {
      if (!type) return;

      switch (type) {
        case 'NEW_CHAT_MESSAGE': {
          const newMsg = payload as ChatMessage;
          if (!newMsg || !newMsg.id) break;
          if (newMsg.senderId && newMsg.senderId === CURRENT_TAB_ID) break;
          setChatMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (newMsg.authorId !== currentUser?.id && newMsg.authorEmail !== currentUser?.email) {
            setUnreadChatCount(c => c + 1);
            playChime('send');
          }
          break;
        }
        case 'PRESENCE_PING': {
          const incomingUser = payload as OnlinePresenceUser;
          if (incomingUser && incomingUser.id) {
            handleIncomingPresencePing(incomingUser);
          }
          break;
        }
        case 'NEW_QUESTION': {
          const newQuestion = payload as Question;
          setQuestions(prev => {
            if (prev.some(q => q.id === newQuestion.id)) return prev;
            return [newQuestion, ...prev];
          });
          break;
        }
        case 'NEW_SOLUTION': {
          const newSolution = payload as Solution;
          setSolutions(prev => {
            if (prev.some(s => s.id === newSolution.id)) return prev;
            return [...prev, newSolution];
          });
          break;
        }
        case 'MARK_BEST_SOLUTION': {
          const { questionId, solutionId } = payload as { questionId: string; solutionId: string };
          setQuestions(prev =>
            prev.map(q => (q.id === questionId ? { ...q, isSolved: true, bestSolutionId: solutionId } : q))
          );
          setSolutions(prev =>
            prev.map(s => (s.id === solutionId ? { ...s, isBest: true, upvotes: s.upvotes + 5 } : s))
          );
          break;
        }
        case 'NEW_CLUB': {
          const newClub = payload as Club;
          setClubs(prev => {
            if (prev.some(c => c.id === newClub.id)) return prev;
            return [newClub, ...prev];
          });
          break;
        }
        case 'APPROVE_CLUB': {
          const clubId = payload as string;
          setClubs(prev => prev.map(c => (c.id === clubId ? { ...c, status: 'APPROVED' } : c)));
          break;
        }
        case 'REJECT_CLUB': {
          const { clubId, reason } = payload as { clubId: string; reason: string };
          setClubs(prev => prev.map(c => (c.id === clubId ? { ...c, status: 'REJECTED', rejectReason: reason } : c)));
          break;
        }
        case 'NEW_CLUB_POST': {
          const newPost = payload as ClubPost;
          setClubPosts(prev => {
            if (prev.some(p => p.id === newPost.id)) return prev;
            return [newPost, ...prev];
          });
          break;
        }
        case 'SYNC_USER': {
          const updatedUser = payload as User;
          setUsers(prev => ({
            ...prev,
            [updatedUser.email.toLowerCase()]: updatedUser,
          }));
          setCurrentUser(prev => {
            if (prev && prev.email.toLowerCase() === updatedUser.email.toLowerCase()) {
              return updatedUser;
            }
            return prev;
          });
          /* Đổi hồ sơ ở thiết bị khác → tên/ảnh trong mọi bài viết cũ đổi theo */
          syncUserIdentityIntoContent(updatedUser, {
            setQuestions, setSolutions, setChatMessages, setClubPosts, setClubs,
          });
          break;
        }
        case 'DELETE_QUESTION': {
          const { questionId } = payload as { questionId: string };
          setQuestions(prev => prev.filter(q => q.id !== questionId));
          setSolutions(prev => prev.filter(s => s.questionId !== questionId));
          break;
        }
        case 'EDIT_QUESTION': {
          const { questionId, updates } = payload as { questionId: string; updates: any };
          setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, ...updates } : q));
          break;
        }
        case 'DELETE_SOLUTION': {
          const { solutionId } = payload as { solutionId: string };
          setSolutions(prev => prev.filter(s => s.id !== solutionId));
          setQuestions(prev => prev.map(q => q.bestSolutionId === solutionId ? { ...q, isSolved: false, bestSolutionId: undefined } : q));
          break;
        }
        case 'DELETE_CHAT_MESSAGE': {
          const { messageId } = payload as { messageId: string };
          setChatMessages(prev => prev.filter(m => m.id !== messageId));
          break;
        }
        case 'SYNC_ABOUT': {
          const newAbout = payload as AboutData;
          setAboutData(newAbout);
          saveAboutDataLocally(newAbout);
          break;
        }

      }
    };

    function startSSE() {
      if (isDisposed || sse) return;
      try {
        sse = new EventSource('/api/events');
        sse.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data && data.type) {
              handleServerBroadcast(data.type, data.payload);
            }
          } catch {
            /* ignore */
          }
        };
        sse.onerror = () => {
          sse?.close();
          sse = null;
        };
      } catch {
        /* ignore */
      }
    }

    function startWS() {
      if (isDisposed) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        ws = new WebSocket(wsUrl);
        activeWsRef.current = ws;

        ws.onopen = () => {
          const payload = getSelfPresenceRef.current();
          try {
            ws?.send(JSON.stringify({ type: 'PRESENCE_PING', payload }));
          } catch {
            /* ignore */
          }
        };

        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data && data.type) {
              handleServerBroadcast(data.type, data.payload);
            }
          } catch {
            /* ignore */
          }
        };

        ws.onerror = () => {
          activeWsRef.current = null;
          startSSE();
        };

        ws.onclose = () => {
          activeWsRef.current = null;
          ws = null;
          startSSE();
          if (!isDisposed) {
            reconnectTimer = setTimeout(startWS, 4000);
          }
        };
      } catch {
        activeWsRef.current = null;
        startSSE();
      }
    }

    startWS();

    return () => {
      isDisposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        activeWsRef.current = null;
        ws.close();
      }
      if (sse) sse.close();
    };
  }, []);

  useEffect(() => {
    if (!syncBroadcastChannel) return;

    const handleBroadcast = (event: MessageEvent) => {
      const { type, payload } = event.data || {};
      if (!type) return;

      switch (type) {
        case 'NEW_CHAT_MESSAGE': {
          const newMsg = payload as ChatMessage;
          if (!newMsg || !newMsg.id) break;
          if (newMsg.senderId && newMsg.senderId === CURRENT_TAB_ID) break;
          setChatMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (newMsg.authorId !== currentUserRef.current?.id && newMsg.authorEmail !== currentUserRef.current?.email) {
            setUnreadChatCount(c => c + 1);
          }
          break;
        }
        case 'PRESENCE_PING': {
          const incomingUser = payload as OnlinePresenceUser;
          if (incomingUser && incomingUser.id) {
            handleIncomingPresencePingRef.current(incomingUser);
          }
          break;
        }
        case 'NEW_CLUB': {
          const newClub = payload as Club;
          setClubs(prev => {
            if (prev.some(c => c.id === newClub.id)) return prev;
            return [newClub, ...prev];
          });
          break;
        }
        case 'APPROVE_CLUB': {
          const clubId = payload as string;
          setClubs(prev => prev.map(c => (c.id === clubId ? { ...c, status: 'APPROVED' } : c)));
          break;
        }
        case 'REJECT_CLUB': {
          const { clubId, reason } = payload as { clubId: string; reason: string };
          setClubs(prev => prev.map(c => (c.id === clubId ? { ...c, status: 'REJECTED', rejectReason: reason } : c)));
          break;
        }
        case 'NEW_CLUB_POST': {
          const newPost = payload as ClubPost;
          setClubPosts(prev => {
            if (prev.some(p => p.id === newPost.id)) return prev;
            return [newPost, ...prev];
          });
          break;
        }
        case 'NEW_QUESTION': {
          const newQuestion = payload as Question;
          setQuestions(prev => {
            if (prev.some(q => q.id === newQuestion.id)) return prev;
            return [newQuestion, ...prev];
          });
          break;
        }
        case 'NEW_SOLUTION': {
          const newSolution = payload as Solution;
          setSolutions(prev => {
            if (prev.some(s => s.id === newSolution.id)) return prev;
            return [...prev, newSolution];
          });
          break;
        }
        case 'MARK_BEST_SOLUTION': {
          const { questionId, solutionId } = payload as { questionId: string; solutionId: string };
          setQuestions(prev =>
            prev.map(q => (q.id === questionId ? { ...q, isSolved: true, bestSolutionId: solutionId } : q))
          );
          setSolutions(prev =>
            prev.map(s => (s.id === solutionId ? { ...s, isBest: true, upvotes: s.upvotes + 5 } : s))
          );
          break;
        }
        case 'SYNC_USER': {
          const updatedUser = payload as User;
          setUsers(prev => ({
            ...prev,
            [updatedUser.email.toLowerCase()]: updatedUser,
          }));
          /* Sửa hồ sơ ở tab khác → tab này cập nhật ngay, không cần tải lại */
          setCurrentUser(prev =>
            prev && prev.email.toLowerCase() === updatedUser.email.toLowerCase() ? updatedUser : prev
          );
          syncUserIdentityIntoContent(updatedUser, {
            setQuestions, setSolutions, setChatMessages, setClubPosts, setClubs,
          });
          break;
        }
        case 'USER_LOGIN': {
          const loggedUser = payload as User;
          setUsers(prev => ({
            ...prev,
            [loggedUser.email.toLowerCase()]: loggedUser,
          }));
          syncUserIdentityIntoContent(loggedUser, {
            setQuestions, setSolutions, setChatMessages, setClubPosts, setClubs,
          });
          break;
        }
        case 'USER_LOGOUT': {
          break;
        }
        case 'DELETE_QUESTION': {
          const { questionId } = payload as { questionId: string };
          setQuestions(prev => prev.filter(q => q.id !== questionId));
          setSolutions(prev => prev.filter(s => s.questionId !== questionId));
          break;
        }
        case 'EDIT_QUESTION': {
          const { questionId, updates } = payload as { questionId: string; updates: any };
          setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, ...updates } : q));
          break;
        }
        case 'DELETE_SOLUTION': {
          const { solutionId } = payload as { solutionId: string };
          setSolutions(prev => prev.filter(s => s.id !== solutionId));
          setQuestions(prev => prev.map(q => q.bestSolutionId === solutionId ? { ...q, isSolved: false, bestSolutionId: undefined } : q));
          break;
        }
        case 'DELETE_CHAT_MESSAGE': {
          const { messageId } = payload as { messageId: string };
          setChatMessages(prev => prev.filter(m => m.id !== messageId));
          break;
        }
        case 'SYNC_ABOUT': {
          const newAbout = payload as AboutData;
          setAboutData(newAbout);
          saveAboutDataLocally(newAbout);
          break;
        }
      }
    };

    syncBroadcastChannel.addEventListener('message', handleBroadcast);
    return () => {
      syncBroadcastChannel.removeEventListener('message', handleBroadcast);
    };
  }, []);

  useEffect(() => {
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'fforum_chat_messages' && e.newValue) {
        try {
          setChatMessages(JSON.parse(e.newValue));
        } catch {
          /* ignore */
        }
      } else if (e.key === 'fforum_clubs' && e.newValue) {
        try {
          setClubs(JSON.parse(e.newValue));
        } catch {
          /* ignore */
        }
      } else if (e.key === 'fforum_club_posts' && e.newValue) {
        try {
          setClubPosts(JSON.parse(e.newValue));
        } catch {
          /* ignore */
        }
      } else if (e.key === 'fforum_questions' && e.newValue) {
        try {
          setQuestions(JSON.parse(e.newValue));
        } catch {
          /* ignore */
        }
      } else if (e.key === 'fforum_solutions' && e.newValue) {
        try {
          setSolutions(JSON.parse(e.newValue));
        } catch {
          /* ignore */
        }
      } else if (e.key === 'fforum_users_registry' && e.newValue) {
        try {
          setUsers(sanitizeUsersRegistry(JSON.parse(e.newValue)));
        } catch {
          /* ignore */
        }
      } else if (e.key === 'fforum_about_data' && e.newValue) {
        try {
          setAboutData(JSON.parse(e.newValue));
        } catch {
          /* ignore */
        }
      }
    };


    window.addEventListener('storage', handleStorageEvent);
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const registerWithPassword = async (name: string, email: string, password: string): Promise<User> => {
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmedName, email: normalizedEmail, password }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Đăng ký tài khoản thất bại');
    }

    const user = data.user as User;
    setUsers(prev => ({
      ...prev,
      [normalizedEmail]: user,
    }));
    setCurrentUser(user);

    safeStorage.setItem('f_forum_auth_token', data.token);
    safeStorage.setItem('fforum_current_user_email', normalizedEmail);

    try {
      syncBroadcastChannel?.postMessage({
        type: 'USER_LOGIN',
        payload: user,
      });
    } catch {
      /* ignore */
    }

    playChime('success');
    setToastMessage({
      title: 'Đăng ký tài khoản thành công!',
      subtitle: `Chào mừng ${user.name} gia nhập F-Forum (Level 1, 0 XP).`,
      type: 'success',
    });

    return user;
  };

  const loginWithPassword = async (email: string, password: string): Promise<User> => {
    const normalizedEmail = email.trim().toLowerCase();

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, password }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Đăng nhập thất bại');
    }

    const user = data.user as User;
    setUsers(prev => ({
      ...prev,
      [normalizedEmail]: user,
    }));
    setCurrentUser(user);

    safeStorage.setItem('f_forum_auth_token', data.token);
    safeStorage.setItem('fforum_current_user_email', normalizedEmail);

    try {
      syncBroadcastChannel?.postMessage({
        type: 'USER_LOGIN',
        payload: user,
      });
    } catch {
      /* ignore */
    }

    playChime('success');
    setToastMessage({
      title: 'Đăng nhập thành công!',
      subtitle: `Chào mừng ${user.name} quay trở lại F-Forum.`,
      type: 'success',
    });

    return user;
  };

  const loginSocial = async (
    provider: 'google' | 'facebook',
    data: { name: string; email: string; avatar?: string }
  ): Promise<User> => {
    const trimmedName = data.name.trim();
    const normalizedEmail = data.email.trim().toLowerCase();

    let result: { success: boolean; user: User; token: string };

    try {
      const res = await fetch('/api/auth/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          name: trimmedName,
          email: normalizedEmail,
          avatar: data.avatar?.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Đăng nhập mạng xã hội thất bại');
      }
      result = json;
    } catch (err: any) {
      const errMsg = String(err?.message || '').toLowerCase();
      const isNetworkError =
        err?.name === 'TypeError' ||
        errMsg.includes('fetch') ||
        errMsg.includes('network') ||
        errMsg.includes('failed') ||
        errMsg.includes('load') ||
        errMsg.includes('offline');

      if (!isNetworkError) {
        throw err;
      }

      const isSuperAdmin = isMasterAdmin(normalizedEmail);
      const existing = users[normalizedEmail];
      const localUser: User = isSuperAdmin
        ? {
            ...(existing || {}),
            id: existing?.id || 'user-admin',
            name: trimmedName || existing?.name || MASTER_ADMIN_CONFIG.name,
            email: 'anhtuantran0512@gmail.com',
            avatar: data.avatar || existing?.avatar || MASTER_ADMIN_CONFIG.avatar,
            role: 'SUPER_ADMIN',
            level: 150,
            xp: Math.max(existing?.xp || 0, 45000),
            fPoints: Math.max(existing?.fPoints || 0, 45000),
            streakCount: Math.max(existing?.streakCount || 0, 36),
            bio: existing?.bio || 'F-Forum Architect & Core Administrator. Xây dựng tương lai tri thức học đường.',
            gender: existing?.gender || 'Nam',
            city: existing?.city || 'Hà Nội',
            className: existing?.className || 'K19 Software Engineering',
            scopedClubIds: existing?.scopedClubIds || [],
          }
        : (existing || {
            id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: trimmedName || (provider === 'google' ? 'Google Student' : 'Facebook Student'),
            email: normalizedEmail,
            avatar: data.avatar || DEFAULT_AVATAR,
            role: 'STUDENT',
            level: 1,
            xp: 0,
            fPoints: 0,
            streakCount: 0,
            bio: '',
            gender: 'Chưa cập nhật',
            city: 'Chưa cập nhật',
            className: 'Chưa cập nhật',
            joinedAt: new Date().toISOString(),
            scopedClubIds: [],
            inventory: [],
          });

      result = {
        success: true,
        user: localUser,
        token: `f_token_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      };
    }

    const user = result.user;
    setUsers(prev => ({
      ...prev,
      [normalizedEmail]: user,
    }));
    setCurrentUser(user);

    safeStorage.setItem('f_forum_auth_token', result.token);
    safeStorage.setItem('fforum_current_user_email', normalizedEmail);

    try {
      syncBroadcastChannel?.postMessage({
        type: 'USER_LOGIN',
        payload: user,
      });
    } catch {
      /* ignore */
    }

    playChime('success');
    setToastMessage({
      title: 'Đăng nhập thành công!',
      subtitle: `Chào mừng ${user.name} (${provider === 'google' ? 'Google' : 'Facebook'}) gia nhập F-Forum.`,
      type: 'success',
    });

    return user;
  };

  const login = (
    provider: 'google' | 'facebook',
    data: { name: string; email: string; avatar?: string }
  ) => {
    loginSocial(provider, data).catch((err) => {
      setToastMessage({
        title: 'Đăng nhập không thành công',
        subtitle: err.message,
        type: 'level',
      });
    });
  };

  const logout = () => {
    setCurrentUser(null);
    safeStorage.removeItem('f_forum_auth_token');
    safeStorage.removeItem('fforum_current_user_email');
    try {
      syncBroadcastChannel?.postMessage({
        type: 'USER_LOGOUT',
      });
    } catch {
      /* ignore */
    }
    playChime('send');
    setToastMessage({
      title: 'Đã đăng xuất',
      subtitle: 'Bạn đang duyệt F-Forum ở chế độ Khách.',
      type: 'success',
    });
  };

  const addXP = (amount: number, targetUserEmail?: string) => {
    if (!currentUser && !targetUserEmail) return;

    if (!targetUserEmail && currentUser?.email !== 'anhtuantran0512@gmail.com') {
      return;
    }

    const emailToCredit = (targetUserEmail || currentUser?.email || '').toLowerCase();
    if (!emailToCredit) return;

    setUsers(prev => {
      const targetUser = prev[emailToCredit];
      if (!targetUser) return prev;

      const newXp = targetUser.xp + amount;
      const newCoin = (targetUser.coin ?? 100) + amount;
      const newFPoints = (targetUser.fPoints ?? targetUser.xp) + amount;
      const calculatedLevel = getLevelForXP(newXp);
      const leveledUp = calculatedLevel > targetUser.level;

      const updated = {
        ...targetUser,
        xp: newXp,
        coin: newCoin,
        fPoints: newFPoints,
        level: calculatedLevel,
      };

      if (currentUser && currentUser.email.toLowerCase() === emailToCredit) {
        setCurrentUser(updated);

        if (leveledUp) {
          playChime('level-up');
          setToastMessage({
            title: `Chúc mừng thăng cấp! LEVEL ${calculatedLevel}`,
            subtitle: `+${amount} Coin nhận được. Bạn đã tiến gần hơn tới đỉnh cao danh dự!`,
            type: 'level',
          });
          pushNotification({
            type: 'system',
            category: 'system',
            title: `Thăng cấp! Cấp độ ${calculatedLevel}`,
            body: `Bạn đã đạt Cấp độ ${calculatedLevel} và nhận thêm Coin. Hãy tiếp tục cống hiến tri thức!`,
            targetView: 'home',
          });
        } else {
          playChime('xp');
          setToastMessage({
            title: `+${amount} XP thưởng`,
            subtitle: `Tổng XP hiện tại: ${newXp.toLocaleString()}`,
            type: 'xp',
          });
        }
      }

      fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToCredit, updates: updated }),
      }).catch(() => {});

      try {
        syncBroadcastChannel?.postMessage({
          type: 'SYNC_USER',
          payload: updated,
        });
      } catch {
        /* ignore */
      }

      return {
        ...prev,
        [emailToCredit]: updated,
      };
    });
  };

  /** Cộng Coin thuần, không làm thay đổi XP / FPoints / cấp độ. */
  const addCoins = (amount: number, targetUserEmail?: string) => {
    const safeAmount = Math.floor(amount);
    if (!Number.isFinite(safeAmount) || safeAmount <= 0) return;
    if (!currentUser && !targetUserEmail) return;

    const emailToCredit = (targetUserEmail || currentUser?.email || '').trim().toLowerCase();
    if (!emailToCredit) return;

    setUsers(prev => {
      const targetUser = prev[emailToCredit];
      if (!targetUser) return prev;

      const currentCoins = Number.isFinite(targetUser.coin) ? Math.max(0, targetUser.coin ?? 0) : 100;
      const updated = { ...targetUser, coin: currentCoins + safeAmount };

      if (currentUserRef.current?.email.toLowerCase() === emailToCredit) {
        setCurrentUser(current =>
          current && current.email.toLowerCase() === emailToCredit
            ? { ...current, coin: updated.coin }
            : current,
        );
      }

      fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToCredit, updates: { coin: updated.coin } }),
      }).catch(() => {});

      try {
        syncBroadcastChannel?.postMessage({ type: 'SYNC_USER', payload: updated });
      } catch {
        /* ignore */
      }

      return { ...prev, [emailToCredit]: updated };
    });
  };

  const updateProfile = (updates: Partial<User>) => {
    if (!currentUser) return;
    const emailKey = currentUser.email.toLowerCase();

    const updated: User = {
      ...currentUser,
      ...updates,
    };

    setCurrentUser(updated);
    setUsers(prev => ({
      ...prev,
      [emailKey]: updated,
    }));

    /* Cùng một hàm dùng cho cả tab này lẫn tab khác → không lệch nhau */
    syncUserIdentityIntoContent(updated, {
      setQuestions, setSolutions, setChatMessages, setClubPosts, setClubs,
    });

    try {
      fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailKey, updates }),
      }).catch(() => {});
    } catch {
      /* ignore */
    }

    try {
      syncBroadcastChannel?.postMessage({
        type: 'SYNC_USER',
        payload: updated,
      });
    } catch {
      /* ignore */
    }

    playChime('success');
    setToastMessage({
      title: 'Hồ sơ đã lưu thành công!',
      subtitle: 'Thông tin mới đã được cập nhật toàn hệ thống F-Forum.',
      type: 'success',
    });
  };

  const createClub = (clubData: {
    name: string;
    slogan: string;
    coverImage: string;
    category?: ClubCategory;
    foundingMembers: string[];
    purpose: string;
  }) => {
    if (!currentUser) return;

    const newClubId = `club-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newClub: Club = {
      id: newClubId,
      name: clubData.name,
      slogan: clubData.slogan,
      coverImage:
        clubData.coverImage ||
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&h=500&fit=crop',
      category: clubData.category || 'Công nghệ',
      foundingMembers: clubData.foundingMembers,
      purpose: clubData.purpose,
      leaderId: currentUser.id,
      leaderName: currentUser.name,
      followerCount: 1,
      membersCount: clubData.foundingMembers.length || 1,
      status: 'PENDING',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setClubs(prev => [newClub, ...prev]);

    fetch('/api/clubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClub),
    }).catch(() => {});

    try {
      syncBroadcastChannel?.postMessage({
        type: 'NEW_CLUB',
        payload: newClub,
      });
    } catch {
      /* ignore */
    }

    playChime('success');
    setToastMessage({
      title: 'Hồ sơ thành lập CLB đã gửi!',
      subtitle: 'Đang chờ phê duyệt từ Ban Quản Trị.',
      type: 'success',
    });
  };

  const approveClub = (clubId: string) => {
    const club = clubs.find(c => c.id === clubId);
    if (!club) return;

    setClubs(prev =>
      prev.map(c => (c.id === clubId ? { ...c, status: 'APPROVED' } : c))
    );

    setUsers(prev => {
      const nextUsers = { ...prev };
      const creatorKey = Object.keys(nextUsers).find(
        k => nextUsers[k].id === club.leaderId || nextUsers[k].name === club.leaderName
      );

      if (creatorKey) {
        const creator = nextUsers[creatorKey];
        const newXp = creator.xp + 250;
        const newLevel = getLevelForXP(newXp);
        const updatedCreator: User = {
          ...creator,
          role: creator.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'CLUB_LEADER',
          scopedClubIds: Array.from(new Set([...creator.scopedClubIds, clubId])),
          xp: newXp,
          fPoints: (creator.fPoints ?? creator.xp) + 250,
          level: newLevel,
        };
        nextUsers[creatorKey] = updatedCreator;

        if (currentUser && currentUser.id === creator.id) {
          setCurrentUser(updatedCreator);
        }
      }
      return nextUsers;
    });

    fetch('/api/clubs/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clubId, adminEmail: currentUser?.email }),
    }).catch(() => {});

    try {
      syncBroadcastChannel?.postMessage({
        type: 'APPROVE_CLUB',
        payload: clubId,
      });
    } catch {
      /* ignore */
    }

    playChime('level-up');
    setToastMessage({
      title: `Đã phê duyệt CLB "${club.name}"!`,
      subtitle: `Đã cấp quyền Chủ nhiệm CLB và tặng +250 XP cho người sáng lập (${club.leaderName}).`,
      type: 'level',
    });
  };

  const rejectClub = (clubId: string, reason: string) => {
    setClubs(prev =>
      prev.map(c =>
        c.id === clubId ? { ...c, status: 'REJECTED', rejectReason: reason } : c
      )
    );

    fetch('/api/clubs/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clubId, reason, adminEmail: currentUser?.email }),
    }).catch(() => {});

    try {
      syncBroadcastChannel?.postMessage({
        type: 'REJECT_CLUB',
        payload: { clubId, reason },
      });
    } catch {
      /* ignore */
    }

    playChime('send');
    setToastMessage({
      title: 'Đã từ chối đơn thành lập CLB',
      subtitle: `Lý do phản hồi: ${reason}`,
      type: 'success',
    });
  };

  const createClubPost = (clubId: string, title: string, content: string): boolean => {
    if (!currentUser) return false;

    const isSuperAdmin =
      currentUser.email === 'anhtuantran0512@gmail.com' ||
      currentUser.role === 'SUPER_ADMIN';
    const isClubLeader = currentUser.scopedClubIds.includes(clubId);

    if (!isSuperAdmin && !isClubLeader) {
      alert(
        'Bạn không có quyền đăng bài trong CLB này! Chỉ Chủ nhiệm CLB hoặc Super Admin mới được phép.'
      );
      return false;
    }

    const newPost: ClubPost = {
      id: `cpost-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      clubId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      title,
      content,
      createdAt: 'Vừa xong',
      likes: 1,
    };

    setClubPosts(prev => [newPost, ...prev]);

    fetch('/api/clubs/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPost),
    }).catch(() => {});

    try {
      syncBroadcastChannel?.postMessage({
        type: 'NEW_CLUB_POST',
        payload: newPost,
      });
    } catch {
      /* ignore */
    }

    playChime('success');
    setToastMessage({
      title: 'Đã đăng bài viết mới vào CLB!',
      subtitle: title,
      type: 'success',
    });
    return true;
  };

  const createQuestion = (data: {
    title: string;
    subject: SubjectTag;
    content: string;
    isAnonymous: boolean;
    bountyCoin?: number;
    imageUrl?: string;
  }) => {
    if (!currentUser) return;

    const bountyCoin = data.bountyCoin ? Math.max(10, Math.min(100, data.bountyCoin)) : 20;
    if (currentUser.email !== 'anhtuantran0512@gmail.com' && (currentUser.coin ?? 100) < bountyCoin) {
      alert(`Bạn cần tối thiểu ${bountyCoin} Coin để đặt câu hỏi kèm cược phần thưởng. Số dư hiện tại: ${currentUser.coin ?? 100} Coin.`);
      return;
    }

    const ghibliAlias = data.isAnonymous
      ? generateGhibliAlias(data.subject)
      : currentUser.name;
    const ghibliMask = data.isAnonymous
      ? getRandomGhibliMask(data.title + Date.now().toString())
      : currentUser.avatar;

    const newQuestion: Question = {
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: data.title,
      subject: data.subject,
      content: data.content,
      authorId: currentUser.id,
      authorName: ghibliAlias,
      authorAvatar: ghibliMask,
      isAnonymous: data.isAnonymous,
      anonymousAlias: data.isAnonymous ? ghibliAlias : undefined,
      anonymousMask: data.isAnonymous ? ghibliMask : undefined,
      createdAt: 'Vừa xong',
      createdAtMs: Date.now(),
      isSolved: false,
      views: 1,
      bountyCoin,
      imageUrl: data.imageUrl,
    };

    setQuestions(prev => [newQuestion, ...prev]);

    const updatedAuthorCoin = Math.max(0, (currentUser.coin ?? 100) - bountyCoin);
    const updatedAuthor = { ...currentUser, coin: updatedAuthorCoin };
    setCurrentUser(updatedAuthor);
    setUsers(prev => ({ ...prev, [currentUser.email.toLowerCase()]: updatedAuthor }));

    fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newQuestion, authorEmail: currentUser.email }),
    }).catch(() => {});

    try {
      syncBroadcastChannel?.postMessage({
        type: 'NEW_QUESTION',
        payload: newQuestion,
      });
    } catch {
      /* ignore */
    }

    addXP(50);
  };

  const addSolution = (questionId: string, content: string, imageUrl?: string) => {
    if (!currentUser) return;

    const newSolution: Solution = {
      id: `sol-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      questionId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorEmail: currentUser.email,
      authorAvatar: currentUser.avatar,
      authorLevel: currentUser.level,
      content,
      createdAt: 'Vừa xong',
      createdAtMs: Date.now(),
      isBest: false,
      upvotes: 1,
      imageUrl,
    };

    setSolutions(prev => [...prev, newSolution]);

    fetch('/api/solutions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSolution),
    }).catch(() => {});

    try {
      syncBroadcastChannel?.postMessage({
        type: 'NEW_SOLUTION',
        payload: newSolution,
      });
    } catch {
      /* ignore */
    }

    const targetQ = questions.find(q => q.id === questionId);
    if (targetQ && targetQ.authorId !== currentUser.id) {
      pushNotification({
        type: 'interactive',
        category: 'interactive',
        title: 'Lời Giải Mới Cho Câu Hỏi Của Bạn!',
        body: `${currentUser.name} vừa gửi lời giải cho "${targetQ.title.slice(0, 35)}...". Nhấp để kiểm tra và xác nhận Đáp Án Chuẩn!`,
        targetView: 'qa',
      });
    }

    addXP(25);
  };

  const markBestSolution = (questionId: string, solutionId: string) => {
    if (!currentUser) return;
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    const isAuthorized =
      currentUser.email === 'anhtuantran0512@gmail.com' ||
      currentUser.id === question.authorId;

    if (!isAuthorized) {
      alert('Chỉ tác giả câu hỏi hoặc Super Admin mới có quyền xác nhận đáp án chuẩn!');
      return;
    }

    const targetSolution = solutions.find(s => s.id === solutionId);

    setQuestions(prev =>
      prev.map(q =>
        q.id === questionId
          ? { ...q, isSolved: true, bestSolutionId: solutionId }
          : q
      )
    );

    setSolutions(prev =>
      prev.map(s => {
        if (s.id === solutionId) {
          return { ...s, isBest: true, upvotes: s.upvotes + 5 };
        }
        return s.questionId === questionId ? { ...s, isBest: false } : s;
      })
    );

    const bounty = question.bountyCoin || 20;
    const solverCoinAward = Math.floor(bounty * 0.5) + 100;
    if (targetSolution && targetSolution.authorEmail) {
      addXP(solverCoinAward, targetSolution.authorEmail);
      pushNotification({
        type: 'interactive',
        category: 'interactive',
        title: 'Chúc mừng Đáp Án Chuẩn!',
        body: `Lời giải của bạn đã được xác nhận là Đáp Án Chuẩn. Bạn nhận được +${solverCoinAward} Coin (+50% bounty + 100 Coin danh dự).`,
        targetView: 'qa',
      });
    }

    fetch('/api/solutions/best', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId,
        solutionId,
        currentUserId: currentUser.id,
        currentUserEmail: currentUser.email,
      }),
    }).catch(() => {});

    try {
      syncBroadcastChannel?.postMessage({
        type: 'MARK_BEST_SOLUTION',
        payload: { questionId, solutionId },
      });
    } catch {
      /* ignore */
    }

    playChime('level-up');
    setToastMessage({
      title: '✓ Đã xác nhận Đáp Án Chuẩn!',
      subtitle: `Người giải bài (${targetSolution?.authorName || 'Bạn học'}) đã nhận thưởng +${solverCoinAward} Coin danh dự.`,
      type: 'level',
    });
  };

  const sendChatMessage = (channelId: ChatChannelId, content: string) => {
    if (!currentUser) return;

    const messageId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const newMsg: ChatMessage = {
      id: messageId,
      channelId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorEmail: currentUser.email,
      authorAvatar: currentUser.avatar,
      authorLevel: currentUser.level,
      content,
      senderId: CURRENT_TAB_ID,
      timestamp: new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      timestampMs: Date.now(),
    };

    setChatMessages(prev => {
      if (prev.some(m => m.id === newMsg.id)) return prev;
      return [...prev, newMsg];
    });

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMsg),
    }).catch(() => {});

    try {
      syncBroadcastChannel?.postMessage({
        type: 'NEW_CHAT_MESSAGE',
        payload: newMsg,
      });
    } catch {
      /* ignore */
    }

    playChime('send');
  };

  const submitFeedback = (data: {
    name: string;
    email: string;
    category?: string;
    content: string;
  }) => {
    const submission: FeedbackSubmission = {
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: data.name,
      email: data.email,
      category: data.category || 'Góp ý khác',
      content: data.content,
      createdAt: new Date().toISOString(),
    };
    const saved = safeStorage.getItem('fforum_feedbacks');
    const list: FeedbackSubmission[] = saved ? JSON.parse(saved) : [];
    list.push(submission);
    safeStorage.setItem('fforum_feedbacks', JSON.stringify(list));

    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});

    playChime('success');
    setToastMessage({
      title: 'Đã gửi ý kiến đóng góp thành công!',
      subtitle: 'Ý kiến của bạn đã được chuyển tới Ban Quản Trị. Cảm ơn bạn!',
      type: 'success',
    });
  };

  const adminDeleteQuestion = async (questionId: string): Promise<boolean> => {
    if (!currentUser || currentUser.email !== 'anhtuantran0512@gmail.com') {
      alert('Chỉ Super Admin mới có quyền xóa bài viết!');
      return false;
    }

    setQuestions(prev => prev.filter(q => q.id !== questionId));
    setSolutions(prev => prev.filter(s => s.questionId !== questionId));

    try {
      await fetch('/api/questions/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, adminEmail: currentUser.email }),
      });
    } catch {
      /* ignore */
    }

    try {
      syncBroadcastChannel?.postMessage({
        type: 'DELETE_QUESTION',
        payload: { questionId },
      });
    } catch {
      /* ignore */
    }

    playChime('send');
    setToastMessage({
      title: 'Đã xóa bài viết vi phạm',
      subtitle: 'Nội dung và toàn bộ thảo luận đã bị xóa khỏi hệ thống.',
      type: 'success',
    });
    return true;
  };

  const adminEditQuestion = async (
    questionId: string,
    updates: { title?: string; content?: string; subject?: SubjectTag }
  ): Promise<boolean> => {
    if (!currentUser || currentUser.email !== 'anhtuantran0512@gmail.com') {
      alert('Chỉ Super Admin mới có quyền sửa bài viết!');
      return false;
    }

    setQuestions(prev =>
      prev.map(q => (q.id === questionId ? { ...q, ...updates } : q))
    );

    try {
      await fetch('/api/questions/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, updates, adminEmail: currentUser.email }),
      });
    } catch {
      /* ignore */
    }

    try {
      syncBroadcastChannel?.postMessage({
        type: 'EDIT_QUESTION',
        payload: { questionId, updates },
      });
    } catch {
      /* ignore */
    }

    playChime('success');
    setToastMessage({
      title: 'Đã cập nhật bài viết',
      subtitle: 'Nội dung bài viết đã được chỉnh sửa theo quy chuẩn.',
      type: 'success',
    });
    return true;
  };

  const adminDeleteSolution = async (solutionId: string): Promise<boolean> => {
    if (!currentUser || currentUser.email !== 'anhtuantran0512@gmail.com') {
      alert('Chỉ Super Admin mới có quyền xóa phản hồi!');
      return false;
    }

    setSolutions(prev => prev.filter(s => s.id !== solutionId));
    setQuestions(prev =>
      prev.map(q =>
        q.bestSolutionId === solutionId ? { ...q, isSolved: false, bestSolutionId: undefined } : q
      )
    );

    try {
      await fetch('/api/solutions/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solutionId, adminEmail: currentUser.email }),
      });
    } catch {
      /* ignore */
    }

    try {
      syncBroadcastChannel?.postMessage({
        type: 'DELETE_SOLUTION',
        payload: { solutionId },
      });
    } catch {
      /* ignore */
    }

    playChime('send');
    setToastMessage({
      title: 'Đã xóa phản hồi vi phạm',
      subtitle: 'Câu trả lời không phù hợp đã bị gỡ bỏ.',
      type: 'success',
    });
    return true;
  };

  const adminDeleteChatMessage = async (messageId: string): Promise<boolean> => {
    if (!currentUser || currentUser.email !== 'anhtuantran0512@gmail.com') {
      alert('Chỉ Super Admin mới có quyền thu hồi tin nhắn!');
      return false;
    }

    setChatMessages(prev => prev.filter(m => m.id !== messageId));

    try {
      await fetch('/api/chat/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, adminEmail: currentUser.email }),
      });
    } catch {
      /* ignore */
    }

    try {
      syncBroadcastChannel?.postMessage({
        type: 'DELETE_CHAT_MESSAGE',
        payload: { messageId },
      });
    } catch {
      /* ignore */
    }

    playChime('send');
    setToastMessage({
      title: 'Đã thu hồi tin nhắn',
      subtitle: 'Tin nhắn đã được xóa khỏi phòng chat.',
      type: 'success',
    });
    return true;
  };

  const adminUpdateAbout = async (newAboutData: AboutData): Promise<AboutData> => {
    if (!currentUser || currentUser.email !== 'anhtuantran0512@gmail.com') {
      alert('Chỉ Super Admin mới có quyền cập nhật Khu Vinh Danh!');
      return aboutData;
    }

    setAboutData(newAboutData);
    saveAboutDataLocally(newAboutData);

    try {
      await saveAboutDataToServer(newAboutData, currentUser.email);
    } catch {
      /* ignore */
    }

    try {
      syncBroadcastChannel?.postMessage({
        type: 'SYNC_ABOUT',
        payload: newAboutData,
      });
    } catch {
      /* ignore */
    }

    playChime('success');
    setToastMessage({
      title: 'Đã cập nhật Khu Vinh Danh',
      subtitle: 'Thông tin hồ sơ và cột mốc đã được lưu thành công.',
      type: 'success',
    });
    return newAboutData;
  };

  return {
    currentView,
    setCurrentView,
    currentUser,
    users,
    login,
    loginWithPassword,
    registerWithPassword,
    loginSocial,
    logout,
    addXP,
    addCoins,
    updateProfile,
    clubs,
    clubPosts,
    createClub,
    approveClub,
    rejectClub,
    createClubPost,
    questions,
    solutions,
    createQuestion,
    addSolution,
    markBestSolution,
    chatMessages,
    sendChatMessage,
    onlineUsers,
    isChatOpen,
    setIsChatOpen,
    unreadChatCount,
    setUnreadChatCount,
    isProfileModalOpen,
    setIsProfileModalOpen,
    isLoginModalOpen,
    setIsLoginModalOpen,
    isSynced,
    toastMessage,
    setToastMessage,
    submitFeedback,
    aboutData,
    adminDeleteQuestion,
    adminEditQuestion,
    adminDeleteSolution,
    adminDeleteChatMessage,
    adminUpdateAbout,
  };
}

export type ForumStore = ReturnType<typeof useForumStore>;

