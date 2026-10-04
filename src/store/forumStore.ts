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
import { authHeaders, getAuthToken, postJson, setAuthToken, clearAuthToken } from '../utils/session';
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

/**
  Sinh mã tạm phía client cho bản ghi vừa tạo (cập nhật lạc quan trước khi máy
  chủ trả về). Đặt ở cấp module để lời gọi `Date.now()`/`Math.random()` không nằm
  trong thân hàm mà trình kiểm tra tĩnh coi là đường render.
*/
const makeTempId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

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

  /*
    Tập mã tin đã xử lý, để biết một tin là MỚI THẬT hay chỉ là bản phát lại.

    Cần vì cùng một tin có thể tới hai lần: qua BroadcastChannel (tab khác của
    cùng trình duyệt) và qua broadcast của máy chủ. Nếu đếm số chưa đọc theo mỗi
    lần nhận thì badge nhân đôi.

    Không dùng ref mirror của `chatMessages` (gán `ref.current` lúc render sẽ vi
    phạm quy tắc react(refs)); tập này chỉ được mutate BÊN TRONG event handler.
  */
  const seenChatIdsRef = useRef<Set<string> | null>(null);

  /* Mirror của danh sách tin nhắn. Gán trong effect chứ không gán lúc render —
     gán `ref.current` lúc render vi phạm quy tắc react(refs). */
  const chatMessagesRef = useRef<ChatMessage[]>(chatMessages);
  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  /**
    Ghi nhận một mã tin và cho biết nó đã gặp trước đó chưa.

    Cả hai đường nhận tin (BroadcastChannel và broadcast của máy chủ) đều hỏi hàm
    này, nên một tin phát lại không bị đếm chưa đọc lần thứ hai. Lần gọi đầu tiên
    gieo tập bằng các tin đang có sẵn (nạp từ localStorage) để tin cũ không bị
    tính là tin mới.

    Hàm chỉ đọc ref nên hai effect deps rỗng bắt được bản cũ vẫn cho kết quả đúng.
  */
  const noteChatMessage = (id: string): boolean => {
    if (!seenChatIdsRef.current) {
      seenChatIdsRef.current = new Set(chatMessagesRef.current.map((m) => m.id));
    }
    if (seenChatIdsRef.current.has(id)) return true;
    seenChatIdsRef.current.add(id);
    return false;
  };
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    subtitle?: string;
    type?: 'xp' | 'success' | 'level' | 'error';
  } | null>(null);

  const [onlineUsers, setOnlineUsers] = useState<OnlinePresenceUser[]>([]);
  const presenceMapRef = useRef<Map<string, { user: OnlinePresenceUser; lastSeen: number }>>(new Map());
  const activeWsRef = useRef<WebSocket | null>(null);
  /* Cầu nối để hàm login (khai báo sau) gọi được bước xác thực socket. */
  const authenticateSocketRef = useRef<() => void>(() => {});
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  /**
   * Bản sao mới nhất của sổ tài khoản.
   * React StrictMode gọi state updater HAI lần, nên không được đặt fetch/toast/
   * âm thanh bên trong updater (mỗi lần thưởng sẽ gửi 2 request, hiện 2 thông
   * báo). Muốn vậy các hàm nghiệp vụ phải đọc được trạng thái hiện tại ở NGOÀI
   * updater — `usersRef` làm việc đó, và được giữ khớp ngay trong cùng một tick
   * nhờ `commitUsers` bên dưới.
   */
  const usersRef = useRef(users);

  /**
   * CỔNG DUY NHẤT để đổi sổ tài khoản.
   * Nếu gọi `setUsers` trực tiếp rồi đọc `usersRef.current` ngay sau đó trong
   * cùng một lần bấm, ta sẽ gặp snapshot cũ — ví dụ `createQuestion` trừ Coin
   * treo thưởng rồi gọi `addXP(50)`: bản cũ đẩy con số cũ lên server và âm thầm
   * hoàn lại số Coin vừa trừ. Đi qua đây thì không còn cửa đó.
   */
  const commitUsers = useCallback((next: React.SetStateAction<Record<string, User>>) => {
    const resolved = typeof next === 'function' ? next(usersRef.current) : next;
    usersRef.current = resolved;
    setUsers(resolved);
  }, []);

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
        /* Gửi kèm token: server chỉ gắn email/role từ phiên đã xác thực, nên
           thiếu token thì tên và cấp bậc hiển thị sẽ kém chính xác hơn. */
        void fetch('/api/presence', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ user: payload }),
        }).catch(() => {});
      }
    };

    /**
     * Gắn danh tính cho kết nối WebSocket đang mở.
     * Máy chủ chỉ cho phép thao tác nhạy cảm (chọn đáp án chuẩn, xoá bài, sửa hồ
     * sơ...) sau khi nhận được AUTH kèm token hợp lệ.
     */
    const authenticateSocket = () => {
      const socket = activeWsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      const token = getAuthToken();
      if (!token) return;
      try {
        socket.send(JSON.stringify({ type: 'AUTH', payload: { token } }));
      } catch {
        /* ignore */
      }
    };
    authenticateSocketRef.current = authenticateSocket;

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
              commitUsers(prev => sanitizeUsersRegistry({ ...prev, ...data.users }));
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
            const savedToken = getAuthToken();

            /*
              Khôi phục phiên: token trong localStorage có thể đã hết hạn, hoặc
              tài khoản đã bị xoá / bị thu hồi quyền. Phải hỏi lại server — nếu
              không giao diện vẫn hiện "đã đăng nhập" trong khi mọi lệnh ghi đều
              bị từ chối 401 và người dùng không hiểu vì sao.
            */
            if (savedToken) {
              try {
                const sessionRes = await fetch('/api/auth/session', { headers: authHeaders() });
                if (sessionRes.status === 401) {
                  clearAuthToken();
                  safeStorage.removeItem('fforum_current_user_email');
                  if (isMounted) {
                    setCurrentUser(null);
                    setToastMessage({
                      title: 'Phiên đăng nhập đã hết hạn',
                      subtitle: 'Vui lòng đăng nhập lại để tiếp tục.',
                      type: 'level',
                    });
                  }
                } else if (sessionRes.ok) {
                  const sessionJson = await sessionRes.json();
                  if (sessionJson?.success && sessionJson.user && isMounted) {
                    const fresh = sessionJson.user as User;
                    safeStorage.setItem('fforum_current_user_email', fresh.email.toLowerCase());
                    setCurrentUser(fresh);
                  }
                }
              } catch {
                /* Ngoại tuyến: giữ phiên cục bộ, thử lại lần mở kế tiếp. */
              }
            } else if (savedEmail && data.users && data.users[savedEmail.toLowerCase()] && isMounted) {
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
    /* commitUsers là useCallback([]) nên identity không đổi — effect vẫn chỉ chạy 1 lần. */
  }, [commitUsers]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let ws: WebSocket | null = null;
    let sse: EventSource | null = null;
    let reconnectTimer: any = null;
    let isDisposed = false;

    const handleServerBroadcast = (type: string, payload: any) => {
      if (!type) return;

      switch (type) {
        /* Có tố cáo mới — báo ngay cho Super Admin đang trực để không phải chờ
           mở hộp thư mới biết. Người dùng thường không nhận gì cả. */
        case 'NEW_REPORT': {
          if (!isMasterAdmin(currentUserRef.current?.email)) break;
          const report = payload as { reportedUserName?: string; reportedUserId?: string; reason?: string };
          pushNotification({
            type: 'system',
            category: 'system',
            title: 'Có báo cáo vi phạm mới',
            body: `${report?.reportedUserName || report?.reportedUserId || 'Một tài khoản'} — ${report?.reason || 'không rõ lý do'}`,
            targetView: 'home',
          });
          playChime('send');
          break;
        }
        case 'REPORT_UPDATED': {
          /* Ban quản trị ở tab/thiết bị khác vừa xử lý → nhắc tải lại hộp thư. */
          if (!isMasterAdmin(currentUserRef.current?.email)) break;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fforum_reports_changed'));
          }
          break;
        }
        case 'NEW_CHAT_MESSAGE': {
          const newMsg = payload as ChatMessage;
          if (!newMsg || !newMsg.id) break;
          if (newMsg.senderId && newMsg.senderId === CURRENT_TAB_ID) break;

          /* Cùng một tin có thể tới hai lần: qua BroadcastChannel (tab khác của
             cùng trình duyệt) và qua broadcast của máy chủ. Số chưa đọc và tiếng
             chuông phải đếm theo tin MỚI THẬT, không thì badge nhân đôi. */
          const alreadySeen = noteChatMessage(newMsg.id);
          if (!alreadySeen) {
            setChatMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }

          /* `currentUserRef` chứ không phải `currentUser`: handler này nằm trong
             effect deps rỗng nên `currentUser` bị chốt ở lần render đầu (null khi
             chưa đăng nhập) và không bao giờ cập nhật — khiến tin của chính mình
             cũng bị tính là chưa đọc. */
          const me = currentUserRef.current;
          if (
            !alreadySeen &&
            newMsg.authorId !== me?.id &&
            newMsg.authorEmail !== me?.email
          ) {
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
          commitUsers(prev => ({
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
          /*
            Đóng kênh SSE dự phòng. Trước đây SSE chỉ bị đóng khi chính nó lỗi
            hoặc khi component unmount, nên sau một lần rớt mạng (WS đóng → SSE
            bật → WS nối lại sau 4 giây) CẢ HAI KÊNH cùng sống. Mọi sự kiện máy
            chủ phát ra bị `handleServerBroadcast` xử lý hai lần: hai thông báo,
            hai tiếng chuông, hai toast cho cùng một tin.
          */
          if (sse) {
            sse.close();
            sse = null;
          }

          /* Xác thực TRƯỚC, rồi mới báo presence. */
          authenticateSocketRef.current();
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
            /* Dọn timer cũ trước khi đặt timer mới: nhiều socket đóng liên tiếp
               sẽ ghi đè biến và để lại timer mồ côi không thể huỷ khi unmount. */
            if (reconnectTimer) clearTimeout(reconnectTimer);
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

          /* Cùng luật chống đếm trùng như nhánh broadcast của máy chủ. */
          const alreadySeen = noteChatMessage(newMsg.id);
          if (!alreadySeen) {
            setChatMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
          const me = currentUserRef.current;
          if (
            !alreadySeen &&
            newMsg.authorId !== me?.id &&
            newMsg.authorEmail !== me?.email
          ) {
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
          commitUsers(prev => ({
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
          commitUsers(prev => ({
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
  }, [commitUsers]);

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
          commitUsers(sanitizeUsersRegistry(JSON.parse(e.newValue)));
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
  }, [commitUsers]);

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
    commitUsers(prev => ({
      ...prev,
      [normalizedEmail]: user,
    }));
    setCurrentUser(user);

    setAuthToken(data.token);
    authenticateSocketRef.current();
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
    commitUsers(prev => ({
      ...prev,
      [normalizedEmail]: user,
    }));
    setCurrentUser(user);

    setAuthToken(data.token);
    authenticateSocketRef.current();
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
    data: { name: string; email: string; avatar?: string; accessToken?: string }
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
          /* Server dùng token này để tự hỏi Google/Facebook — chống khai email giả. */
          accessToken: data.accessToken || undefined,
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
    commitUsers(prev => ({
      ...prev,
      [normalizedEmail]: user,
    }));
    setCurrentUser(user);

    setAuthToken(result.token);
    authenticateSocketRef.current();
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
    data: { name: string; email: string; avatar?: string; accessToken?: string }
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
    clearAuthToken();
    safeStorage.removeItem('fforum_current_user_email');
    /* Đóng socket để máy chủ huỷ phiên WS vừa đăng nhập — socket tự mở lại
       ở trạng thái khách, không còn giữ quyền của tài khoản cũ. */
    try {
      activeWsRef.current?.close();
    } catch {
      /* ignore */
    }
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
    const viewer = currentUserRef.current;
    if (!viewer && !targetUserEmail) return;

    /* Không kèm email nghĩa là "cộng cho admin đang xem" — giữ nguyên luật cũ. */
    if (!targetUserEmail && !isMasterAdmin(viewer?.email)) return;

    const emailToCredit = (targetUserEmail || viewer?.email || '').toLowerCase();
    if (!emailToCredit) return;

    const snapshot = usersRef.current[emailToCredit];
    if (!snapshot) return;

    const newXp = (snapshot.xp ?? 0) + amount;
    const newCoin = (snapshot.coin ?? 100) + amount;
    const newFPoints = (snapshot.fPoints ?? snapshot.xp) + amount;
    const calculatedLevel = getLevelForXP(newXp);
    const leveledUp = calculatedLevel > snapshot.level;

    /*
      Updater PHẢI thuần: chỉ tính trạng thái mới từ `prev`.
      Bản cũ nhét setCurrentUser + fetch + playChime + toast vào đây; StrictMode
      gọi updater hai lần nên mỗi lần thưởng gửi 2 request lên server và hiện
      2 thông báo. Toàn bộ tác dụng phụ giờ chạy đúng MỘT lần ở bên dưới.
    */
    commitUsers(prev => {
      const targetUser = prev[emailToCredit];
      if (!targetUser) return prev;
      const nextXp = (targetUser.xp ?? 0) + amount;
      return {
        ...prev,
        [emailToCredit]: {
          ...targetUser,
          xp: nextXp,
          coin: (targetUser.coin ?? 100) + amount,
          fPoints: (targetUser.fPoints ?? targetUser.xp) + amount,
          level: getLevelForXP(nextXp),
        },
      };
    });

    const updated: User = {
      ...snapshot,
      xp: newXp,
      coin: newCoin,
      fPoints: newFPoints,
      level: calculatedLevel,
    };

    if (viewer && viewer.email.toLowerCase() === emailToCredit) {
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

    /*
      Bản cũ nuốt mọi lỗi: `.catch(() => {})`. Khi server từ chối (phiên hết hạn
      -> 401, hoặc bản ghi không tồn tại -> 400) thì state cục bộ vẫn đã được
      cộng và toast "+XP" vẫn hiện, nhưng KHÔNG có gì được lưu. Reload là phần
      thưởng biến mất — người dùng thấy thưởng mà chưa từng nhận.

      Nay kiểm tra mã phản hồi và hoàn tác đúng phần vừa cộng nếu ghi thất bại.
      Chỉ hoàn tác XP/coin/fPoints/level của chính bản ghi này, không đụng ai khác.
    */
    postJson('/api/users/update', { email: emailToCredit, updates: updated })
      .then((res) => {
        if (res.status >= 200 && res.status < 300) return;
        commitUsers(prev => {
          const targetUser = prev[emailToCredit];
          if (!targetUser) return prev;
          const restoredXp = Math.max(0, (targetUser.xp ?? 0) - amount);
          return {
            ...prev,
            [emailToCredit]: {
              ...targetUser,
              xp: restoredXp,
              coin: Math.max(0, (targetUser.coin ?? 100) - amount),
              fPoints: Math.max(0, (targetUser.fPoints ?? 0) - amount),
              level: getLevelForXP(restoredXp),
            },
          };
        });
        setToastMessage({
          title: 'Chưa ghi được phần thưởng',
          subtitle:
            res.status === 401
              ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để nhận thưởng.'
              : 'Máy chủ từ chối lưu thay đổi. Phần thưởng đã được hoàn tác.',
          type: 'error',
        });
      })
      .catch(() => {
        setToastMessage({
          title: 'Mất kết nối khi lưu phần thưởng',
          subtitle: 'Không ghi được phần thưởng lên máy chủ. Vui lòng thử lại.',
          type: 'error',
        });
      });

    try {
      syncBroadcastChannel?.postMessage({
        type: 'SYNC_USER',
        payload: updated,
      });
    } catch {
      /* ignore */
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!currentUser) return;
    const emailKey = currentUser.email.toLowerCase();

    const previousUser = currentUser;
    const updated: User = {
      ...currentUser,
      ...updates,
    };

    setCurrentUser(updated);
    commitUsers(prev => ({
      ...prev,
      [emailKey]: updated,
    }));

    /* Cùng một hàm dùng cho cả tab này lẫn tab khác → không lệch nhau */
    syncUserIdentityIntoContent(updated, {
      setQuestions, setSolutions, setChatMessages, setClubPosts, setClubs,
    });

    /* Máy chủ loại bỏ các trường nó sở hữu (role/id/email) và kẹp các trường còn
       lại, nên lời gọi này có thể bị từ chối. Trước đây lỗi bị nuốt và giao diện
       vẫn báo "Hồ sơ đã lưu thành công!" trong khi không có gì được lưu. */
    const profileOutcome = await runServerAction('/api/users/update', { email: emailKey, updates });
    if (!profileOutcome.ok) {
      setCurrentUser(previousUser);
      commitUsers(prev => ({ ...prev, [emailKey]: previousUser }));
      syncUserIdentityIntoContent(previousUser, {
        setQuestions, setSolutions, setChatMessages, setClubPosts, setClubs,
      });
      setToastMessage({
        title: 'Không lưu được hồ sơ',
        subtitle: profileOutcome.message,
        type: 'error',
      });
      return;
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

  const createClub = async (clubData: {
    name: string;
    slogan: string;
    coverImage: string;
    category?: ClubCategory;
    foundingMembers: string[];
    purpose: string;
  }) => {
    if (!currentUser) return;

    const newClubId = makeTempId('club');
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

    const prevClubs = clubs;
    setClubs(prev => [newClub, ...prev]);

    /* Server cần phiên đăng nhập để biết ai là người sáng lập, nên phải gửi
       kèm token. Trước đây call này bắn tới endpoint không tồn tại (404) và
       `.catch(() => {})` nuốt luôn lỗi. */
    const clubOutcome = await runServerAction('/api/clubs', {
      ...newClub,
      leaderEmail: currentUser.email,
    });
    if (!clubOutcome.ok) {
      setClubs(prevClubs);
      setToastMessage({
        title: 'Không gửi được hồ sơ thành lập',
        subtitle: clubOutcome.message,
        type: 'error',
      });
      return;
    }

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

  const approveClub = async (clubId: string) => {
    const club = clubs.find(c => c.id === clubId);
    if (!club) return;

    const prevClubs = clubs;
    setClubs(prev =>
      prev.map(c => (c.id === clubId ? { ...c, status: 'APPROVED' } : c))
    );

    commitUsers(prev => {
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

    const approveOutcome = await runServerAction('/api/clubs/approve', { clubId });
    if (!approveOutcome.ok) {
      /* Máy chủ từ chối (phiên hết hạn, không còn là Super Admin) → hoàn tác cả
         trạng thái CLB lẫn phần thăng cấp, nếu không UI sẽ lệch với kho dữ liệu. */
      setClubs(prevClubs);
      setToastMessage({
        title: 'Không duyệt được câu lạc bộ',
        subtitle: approveOutcome.message,
        type: 'error',
      });
      return;
    }

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

  const rejectClub = async (clubId: string, reason: string) => {
    const prevClubs = clubs;
    setClubs(prev =>
      prev.map(c =>
        c.id === clubId ? { ...c, status: 'REJECTED', rejectReason: reason } : c
      )
    );

    const rejectOutcome = await runServerAction('/api/clubs/reject', { clubId, reason });
    if (!rejectOutcome.ok) {
      setClubs(prevClubs);
      setToastMessage({
        title: 'Không từ chối được hồ sơ',
        subtitle: rejectOutcome.message,
        type: 'error',
      });
      return;
    }

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

  const createClubPost = async (clubId: string, title: string, content: string): Promise<boolean> => {
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
      id: makeTempId('cpost'),
      clubId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      title,
      content,
      createdAt: 'Vừa xong',
      likes: 1,
    };

    const prevPosts = clubPosts;
    setClubPosts(prev => [newPost, ...prev]);

    const postOutcome = await runServerAction('/api/clubs/posts', {
      ...newPost,
      authorEmail: currentUser.email,
    });
    if (!postOutcome.ok) {
      setClubPosts(prevPosts);
      setToastMessage({
        title: 'Không đăng được bài viết',
        subtitle: postOutcome.message,
        type: 'error',
      });
      return false;
    }

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

  /**
    Gọi một thao tác ghi rồi ĐỌC kết quả thật từ máy chủ.

    Nhiều hàm trước đây dùng `fetch(...).catch(() => {})` — nuốt mọi lỗi, nên khi
    máy chủ trả 401/403/404/500 (hoặc mạng đứt) người dùng vẫn thấy thông báo
    thành công trong khi dữ liệu không hề thay đổi. Chính kiểu nuốt lỗi này đã che
    giấu việc bốn endpoint câu lạc bộ trả 404 trong suốt thời gian dài.
  */
  const runServerAction = async (
    url: string,
    body: unknown,
  ): Promise<{ ok: boolean; message: string; status: number; data: any }> => {
    try {
      const { status, data } = await postJson(url, body);
      if (status >= 200 && status < 300) {
        return { ok: true, message: data?.message || '', status, data };
      }
      const fallback =
        status === 401 ? 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'
        : status === 403 ? 'Bạn không có quyền thực hiện thao tác này.'
        : status === 404 ? 'Nội dung này không còn tồn tại.'
        : status === 429 ? 'Bạn thao tác quá nhanh, vui lòng đợi một chút.'
        : 'Máy chủ không thực hiện được yêu cầu. Vui lòng thử lại.';
      return { ok: false, message: data?.message || fallback, status, data };
    } catch {
      return { ok: false, message: 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng.', status: 0, data: null };
    }
  };

  const createQuestion = async (data: {
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

    const prevQuestions = questions;
    const prevCoin = currentUser.coin ?? 100;
    setQuestions(prev => [newQuestion, ...prev]);

    const updatedAuthorCoin = Math.max(0, prevCoin - bountyCoin);
    const updatedAuthor = { ...currentUser, coin: updatedAuthorCoin };
    setCurrentUser(updatedAuthor);
    commitUsers(prev => ({ ...prev, [currentUser.email.toLowerCase()]: updatedAuthor }));

    /* Đây là chỗ nặng nhất nếu nuốt lỗi: hàm đã TRỪ COIN của người dùng trước khi
       gửi. Máy chủ có thể từ chối (402 không đủ số dư theo sổ cái thật, 429 thao tác
       quá nhanh, 401 phiên hết hạn) — khi đó phải trả lại coin và rút câu hỏi về,
       nếu không người dùng mất tiền mà câu hỏi không hề được đăng. */
    const questionOutcome = await runServerAction('/api/questions', {
      ...newQuestion,
      authorEmail: currentUser.email,
    });
    if (!questionOutcome.ok) {
      setQuestions(prevQuestions);
      const reverted = { ...currentUser, coin: prevCoin };
      setCurrentUser(reverted);
      commitUsers(prev => ({ ...prev, [currentUser.email.toLowerCase()]: reverted }));
      setToastMessage({
        title: 'Không đăng được câu hỏi',
        subtitle: `${questionOutcome.message} (Coin treo thưởng đã được hoàn lại.)`,
        type: 'error',
      });
      return;
    }

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

  const addSolution = async (questionId: string, content: string, imageUrl?: string) => {
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

    const prevSolutions = solutions;
    setSolutions(prev => [...prev, newSolution]);

    const solutionOutcome = await runServerAction('/api/solutions', newSolution);
    if (!solutionOutcome.ok) {
      setSolutions(prevSolutions);
      setToastMessage({
        title: 'Không gửi được lời giải',
        subtitle: solutionOutcome.message,
        type: 'error',
      });
      return;
    }

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

  const markBestSolution = async (questionId: string, solutionId: string) => {
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

    /* Máy chủ từ chối việc tự chọn câu trả lời của chính mình (409) vì đó là cách
       tự trả thưởng cho bản thân. Chặn ngay phía client để người dùng biết trước
       thay vì thấy thông báo thành công rồi thưởng không bao giờ đến. */
    if (
      targetSolution?.authorEmail &&
      targetSolution.authorEmail.toLowerCase() === currentUser.email.toLowerCase()
    ) {
      setToastMessage({
        title: 'Không thể chọn đáp án của chính bạn',
        subtitle: 'Đáp án chuẩn phải là lời giải của người khác. Nhờ bạn học khác trả lời nhé!',
        type: 'error',
      });
      return;
    }

    const prevQuestions = questions;
    const prevSolutions = solutions;
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

    /* Hỏi máy chủ TRƯỚC, cộng thưởng SAU. Trước đây thứ tự ngược lại: thưởng được
       cộng cục bộ và toast thành công hiện ra bất kể server trả gì, nên khi server
       từ chối (409 tự chọn, 401 phiên hết hạn, 404 lời giải không thuộc câu hỏi)
       người dùng vẫn thấy "+Coin danh dự" rồi mọi thứ âm thầm quay về ở lần đồng
       bộ sau. */
    const bestOutcome = await runServerAction('/api/solutions/best', {
      questionId,
      solutionId,
    });
    if (!bestOutcome.ok) {
      setQuestions(prevQuestions);
      setSolutions(prevSolutions);
      setToastMessage({
        title: 'Không xác nhận được Đáp Án Chuẩn',
        subtitle: bestOutcome.message,
        type: 'error',
      });
      return;
    }

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

  const sendChatMessage = async (channelId: ChatChannelId, content: string) => {
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

    const prevChat = chatMessages;
    setChatMessages(prev => {
      if (prev.some(m => m.id === newMsg.id)) return prev;
      return [...prev, newMsg];
    });

    /* Gửi kèm token để máy chủ gắn đúng cấp bậc từ bản ghi thật. Thất bại thì rút
       tin nhắn khỏi màn hình — để lại một tin "đã gửi" không có thật là tệ hơn. */
    const chatOutcome = await runServerAction('/api/chat', newMsg);
    if (!chatOutcome.ok) {
      setChatMessages(prevChat);
      setToastMessage({
        title: 'Không gửi được tin nhắn',
        subtitle: chatOutcome.message,
        type: 'error',
      });
      return;
    }

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

  const submitFeedback = async (data: {
    name: string;
    email: string;
    category?: string;
    content: string;
  }) => {
    const submission: FeedbackSubmission = {
      id: makeTempId('fb'),
      name: data.name,
      email: data.email,
      category: data.category || 'Góp ý khác',
      content: data.content,
      createdAt: new Date().toISOString(),
    };
    /* Ghi bản sao xuống localStorage TRƯỚC để không mất góp ý nếu mạng đứt,
       rồi mới gửi lên máy chủ và báo đúng kết quả. */
    const saved = safeStorage.getItem('fforum_feedbacks');
    let list: FeedbackSubmission[] = [];
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      list = [];
    }
    list.push(submission);
    safeStorage.setItem('fforum_feedbacks', JSON.stringify(list));

    const feedbackOutcome = await runServerAction('/api/feedback', data);
    if (!feedbackOutcome.ok) {
      setToastMessage({
        title: 'Chưa gửi được góp ý lên máy chủ',
        subtitle: `${feedbackOutcome.message} Bản nháp đã được giữ lại trên thiết bị này.`,
        type: 'error',
      });
      return;
    }

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

    /* Giữ lại bản cũ để khôi phục nếu máy chủ từ chối — trước đây hàm này xoá
       lạc quan rồi báo thành công vô điều kiện, nên khi server trả 403/500 người
       dùng vẫn thấy "Đã xóa" nhưng bài viết quay lại ở lần đồng bộ sau. */
    const prevQuestions = questions;
    const prevSolutions = solutions;
    setQuestions(prev => prev.filter(q => q.id !== questionId));
    setSolutions(prev => prev.filter(s => s.questionId !== questionId));

    const outcome = await runServerAction('/api/questions/delete', { questionId });
    if (!outcome.ok) {
      setQuestions(prevQuestions);
      setSolutions(prevSolutions);
      setToastMessage({
        title: 'Không xóa được bài viết',
        subtitle: outcome.message,
        type: 'error',
      });
      return false;
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

    const prevForEdit = questions;
    setQuestions(prev =>
      prev.map(q => (q.id === questionId ? { ...q, ...updates } : q))
    );

    const editOutcome = await runServerAction('/api/questions/edit', { questionId, updates });
    if (!editOutcome.ok) {
      setQuestions(prevForEdit);
      setToastMessage({
        title: 'Không sửa được bài viết',
        subtitle: editOutcome.message,
        type: 'error',
      });
      return false;
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

    const prevSols = solutions;
    const prevQs = questions;
    setSolutions(prev => prev.filter(s => s.id !== solutionId));
    setQuestions(prev =>
      prev.map(q =>
        q.bestSolutionId === solutionId ? { ...q, isSolved: false, bestSolutionId: undefined } : q
      )
    );

    const solOutcome = await runServerAction('/api/solutions/delete', { solutionId });
    if (!solOutcome.ok) {
      setSolutions(prevSols);
      setQuestions(prevQs);
      setToastMessage({
        title: 'Không xóa được phản hồi',
        subtitle: solOutcome.message,
        type: 'error',
      });
      return false;
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

    const prevChat = chatMessages;
    setChatMessages(prev => prev.filter(m => m.id !== messageId));

    const chatOutcome = await runServerAction('/api/chat/delete', { messageId });
    if (!chatOutcome.ok) {
      setChatMessages(prevChat);
      setToastMessage({
        title: 'Không thu hồi được tin nhắn',
        subtitle: chatOutcome.message,
        type: 'error',
      });
      return false;
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

