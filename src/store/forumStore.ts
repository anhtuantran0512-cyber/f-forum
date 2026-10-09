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
import {
  adoptSession,
  authHeaders,
  canUseCookieSession,
  clearAuthToken,
  getAuthToken,
  getSessionExpiry,
  hasStoredSession,
  isSessionExpired,
  postJson,
  probeCookieSession,
  requestServerLogout,
  sessionRequestHeaders,
  upgradeLegacySession,
  type SessionTransport,
} from '../utils/session';
import { DEFAULT_AVATAR } from '../utils/mediaFallback';
import {
  type AboutData,
  getSavedAboutData,
  saveAboutDataLocally,
  saveAboutDataToServer,
} from './adminStore';
import { MASTER_ADMIN_CONFIG, isMasterAdmin } from '../config/admin';
import { capsHas, getAdminCaps } from '../utils/adminCapabilities';

/** Epic 3 — sửa/xoá nội dung: Super Admin hoặc vai trò tùy chỉnh có quyền edit_content.
    Chỉ là chốt chặn giao diện; máy chủ (requireContentEditor) kiểm lại từng yêu cầu. */
const canEditContentNow = (email?: string | null): boolean =>
  isMasterAdmin(email) || capsHas(getAdminCaps(), 'edit_content');
import { getTierForLevel } from '../utils/tier';
import { pushNotification } from '../utils/notifications';
import type { DailyRewardAction, DailyRewardActionResult, DailyRewardStatus } from '../types/rewards';
import { readSharedQuestionId } from '../utils/shareLinks';
import { describeLoginModeration } from '../utils/moderationNotice';

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
const welcomeCoinFor = (email: string) => (isMasterAdmin(email) ? 99999 : 100);

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
    // Liên kết chia sẻ câu hỏi (?q=<id>) đưa thẳng vào Sàn hỏi đáp.
    if (typeof window !== 'undefined' && readSharedQuestionId(window.location.search)) return 'qa';
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
  /** Epic 5: mở lại WebSocket ngay (phiên cookie chỉ được đọc lúc bắt tay). */
  const reconnectSocketRef = useRef<() => void>(() => {});
  /* Các ref "bản sao mới nhất" phải được đồng bộ trong effect, KHÔNG gán lúc
     render: gán ref khi render là side effect và cho kết quả sai khi React render
     thử nhiều lần (StrictMode) hoặc khi render bị vứt giữa chừng. */
  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
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
   * CỔNG DUY NHẤT để đổi sổ tài khoản phía client. Số dư, XP, cấp, streak,
   * kho vật phẩm và quyền vẫn do API máy chủ cấp; hàm này chỉ nhận snapshot
   * máy chủ hoặc cập nhật lạc quan cho trường hồ sơ có thể tự sửa.
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
  useEffect(() => {
    getSelfPresenceRef.current = getSelfPresence;
  }, [getSelfPresence]);

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
  useEffect(() => {
    handleIncomingPresencePingRef.current = handleIncomingPresencePing;
  }, [handleIncomingPresencePing]);

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
    /* Hai hàm này bọc useCallback với deps ổn định (getSelfPresence phụ thuộc
       getGuestId, mà getGuestId có deps rỗng) nên liệt kê vào đây không làm effect
       chạy lại — chỉ để thoả exhaustive-deps. */
  }, [currentUser, recomputeOnlineUsers, getSelfPresence]);

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

            /*
              Khôi phục phiên: token trong localStorage có thể đã hết hạn, hoặc
              tài khoản đã bị xoá / bị thu hồi quyền. Phải hỏi lại server — nếu
              không giao diện vẫn hiện "đã đăng nhập" trong khi mọi lệnh ghi đều
              bị từ chối 401 và người dùng không hiểu vì sao.

              Epic 5: kiểm hạn token NGAY ở client trước (đọc `exp` trong token hoặc
              gợi ý phiên cookie) — không cần chờ máy chủ, kể cả khi đang ngoại tuyến.
            */
            /* Epic 5: "token" gồm cả phiên cookie HttpOnly (localStorage chỉ còn gợi ý hạn dùng). */
            const savedToken = hasStoredSession();
            if (savedToken) {
              if (isSessionExpired()) {
                clearAuthToken();
                safeStorage.removeItem('fforum_current_user_email');
                if (isMounted) {
                  setCurrentUser(null);
                  setToastMessage({
                    title: 'Phiên đăng nhập đã hết hạn',
                    subtitle: 'Vì an toàn, vui lòng đăng nhập lại để tiếp tục.',
                    type: 'level',
                  });
                }
              } else {
                try {
                  const sessionRes = await fetch('/api/auth/session', { headers: authHeaders(), cache: 'no-store' });
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
                      /* Epic 5: phiên Bearer cũ → nâng lên cookie HttpOnly khi chạy HTTPS ở
                         cửa sổ chính, rồi xoá token khỏi localStorage. */
                      if (getAuthToken() && canUseCookieSession()) void upgradeLegacySession();
                    }
                  }
                } catch {
                  /* Ngoại tuyến: giữ phiên cục bộ, thử lại lần mở kế tiếp. */
                }
              }
            } else {
              /* Mất gợi ý cục bộ (vd. đã xoá localStorage) nhưng cookie HttpOnly còn hạn. */
              const probed = await probeCookieSession();
              if (probed && isMounted) {
                const fresh = probed.user as User;
                safeStorage.setItem('fforum_current_user_email', fresh.email.toLowerCase());
                setCurrentUser(fresh);
              } else if (savedEmail && data.users && data.users[savedEmail.toLowerCase()] && isMounted) {
                setCurrentUser(data.users[savedEmail.toLowerCase()]);
              }
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
        case 'USER_MODERATED': {
          /* Máy chủ chỉ gửi sự kiện riêng này tới socket đã AUTH của đúng người.
             Báo ngay khi quyết định có hiệu lực để lần gửi nội dung kế tiếp không
             trở thành một lỗi khó hiểu, nhưng không tiết lộ lý do nội bộ. */
          const restriction = payload as { banned?: boolean; muted?: boolean };
          if (restriction?.banned) {
            setToastMessage({
              title: 'Tài khoản đang bị hạn chế đăng',
              subtitle: 'Bạn vẫn có thể xem diễn đàn; chat và các nội dung mới sẽ bị chặn. Liên hệ Ban Quản Trị nếu cần trao đổi.',
              type: 'error',
            });
          } else if (restriction?.muted) {
            setToastMessage({
              title: 'Tạm khoá gửi tin chat',
              subtitle: 'Bạn vẫn có thể đọc chat và đăng câu hỏi/lời giải. Liên hệ Ban Quản Trị nếu cần trao đổi.',
              type: 'error',
            });
          } else {
            setToastMessage({
              title: 'Đã gỡ hạn chế tài khoản',
              subtitle: 'Bạn có thể tiếp tục sử dụng các tính năng đã được mở lại.',
              type: 'success',
            });
          }
          break;
        }
        case 'USER_WARNED': {
          const warning = payload as { id?: string; reason?: string; at?: number };
          const reason = String(warning?.reason || '').trim().slice(0, 500);
          if (!reason) break;
          pushNotification({
            id: warning.id,
            type: 'system',
            category: 'system',
            title: 'Cảnh cáo từ Ban Quản Trị',
            body: reason,
            time: warning.at ? new Date(warning.at).toLocaleString('vi-VN') : undefined,
            targetView: 'home',
          });
          setToastMessage({
            title: 'Bạn nhận được cảnh cáo',
            subtitle: reason,
            type: 'error',
          });
          playChime('send');
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
            /* Gọi qua ref cho nhất quán với nhánh WS bên dưới: hàm này nằm trong
               closure của effect kết nối có deps rỗng, gọi trực tiếp sẽ bị chốt vào
               bản cũ và mất mọi cập nhật sau đó. */
            handleIncomingPresencePingRef.current(incomingUser);
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

    /* Epic 5: đóng socket hiện tại KHÔNG qua nhánh onclose (tránh chờ 4 giây + bật
       SSE thừa) rồi mở ngay socket mới — bước bắt tay mới mang theo cookie phiên. */
    reconnectSocketRef.current = () => {
      if (isDisposed) return;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      const previous = ws;
      if (previous) {
        previous.onclose = null;
        previous.onerror = null;
        try {
          previous.close();
        } catch {
          /* ignore */
        }
      }
      ws = null;
      activeWsRef.current = null;
      startWS();
    };

    return () => {
      isDisposed = true;
      reconnectSocketRef.current = () => {};
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        activeWsRef.current = null;
        ws.close();
      }
      if (sse) sse.close();
    };
    /* commitUsers có deps rỗng nên địa chỉ không bao giờ đổi: liệt kê vào đây
       không khiến effect kết nối chạy lại (và do đó không gây reconnect). */
  }, [commitUsers]);

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

  /*
    Epic 5 — kiểm tra hạn phiên (JWT expiry) ngay ở client.
    Máy chủ đã từ chối token quá hạn, nhưng nếu chỉ dựa vào đó thì giao diện vẫn
    hiện "đã đăng nhập" cho tới lần ghi kế tiếp mới vỡ 401. Hẹn giờ đúng mốc `exp`
    (đọc từ token hoặc gợi ý phiên cookie) và kiểm lại mỗi khi tab hiện trở lại —
    máy ngủ/tab nền có thể làm trễ setTimeout hàng giờ.
  */
  const sessionOwnerEmail = currentUser?.email || null;
  useEffect(() => {
    if (!sessionOwnerEmail || typeof window === 'undefined') return undefined;
    let timer: number | null = null;
    const expire = () => {
      if (!isSessionExpired()) {
        schedule();
        return;
      }
      void requestServerLogout();
      clearAuthToken();
      safeStorage.removeItem('fforum_current_user_email');
      setCurrentUser(null);
      try {
        activeWsRef.current?.close();
      } catch {
        /* ignore */
      }
      setToastMessage({
        title: 'Phiên đăng nhập đã hết hạn',
        subtitle: 'Vì an toàn, vui lòng đăng nhập lại để tiếp tục.',
        type: 'level',
      });
    };
    function schedule() {
      if (timer) window.clearTimeout(timer);
      const expiry = getSessionExpiry();
      if (expiry === null) return;
      /* Trần của setTimeout ~24,8 ngày: hẹn tối đa chừng đó rồi tự hẹn lại. */
      const wait = Math.min(Math.max(0, expiry - Date.now()) + 250, 2_000_000_000);
      timer = window.setTimeout(expire, wait);
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') schedule();
    };
    schedule();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (timer) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [sessionOwnerEmail]);

  /** Epic 5: phiên cookie → mở lại WS để bắt tay mang cookie; phiên Bearer → gửi gói AUTH. */
  const bindSessionToSocket = (transport: SessionTransport) => {
    if (transport === 'cookie') reconnectSocketRef.current();
    else authenticateSocketRef.current();
  };

  const registerWithPassword = async (name: string, email: string, password: string): Promise<User> => {
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: sessionRequestHeaders(),
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

    bindSessionToSocket(await adoptSession(data));
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

    /* BẢO MẬT: từng có một "cửa hậu" ở đây — so khớp mật khẩu hardcode rồi tự tạo
       phiên Super Admin GIẢ (token giả) mà không hỏi máy chủ. Giao diện tưởng là
       Super Admin nhưng mọi API quản trị đều bị từ chối. Đã gỡ: mọi đăng nhập đều
       phải qua /api/auth/login; mật khẩu Super Admin chỉ nằm ở secret máy chủ
       (FFORUM_ADMIN_PASSWORD, lưu dạng scrypt) — Yeucau.md §16. */
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: sessionRequestHeaders(),
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

    bindSessionToSocket(await adoptSession(data));
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
    /* R3 · máy chủ trả trạng thái khoá tính theo giờ hiện tại → báo ngay khi vào */
    const moderationNotice = describeLoginModeration(data.moderation);
    setToastMessage(
      moderationNotice
        ? { ...moderationNotice, type: 'level' }
        : {
            title: 'Đăng nhập thành công!',
            subtitle: `Chào mừng ${user.name} quay trở lại F-Forum.`,
            type: 'success',
          },
    );

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
        headers: sessionRequestHeaders(),
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

      /* Tài khoản quản trị KHÔNG BAO GIỜ được tạo phiên ngoại tuyến (token giả):
         máy chủ sẽ từ chối mọi thao tác và người dùng chỉ thấy lỗi khó hiểu. */
      if (isMasterAdmin(normalizedEmail)) {
        throw new Error('Không kết nối được máy chủ để xác minh tài khoản quản trị. Vui lòng thử lại sau giây lát.');
      }

      const isSuperAdmin = isMasterAdmin(normalizedEmail);
      const existing = users[normalizedEmail];
      const localUser: User = isSuperAdmin
        ? {
            ...(existing || {}),
            id: existing?.id || 'user-admin',
            name: trimmedName || existing?.name || MASTER_ADMIN_CONFIG.name,
            email: 'BroAmStuck@gmail.com',
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

    bindSessionToSocket(await adoptSession(result));
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

  const logout = (options?: { skipServer?: boolean }) => {
    setCurrentUser(null);
    /* Epic 5: nhờ máy chủ xoá cookie HttpOnly (gửi header trước khi xoá token cục bộ). */
    if (!options?.skipServer) void requestServerLogout();
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

  /** Đăng xuất MỌI thiết bị: máy chủ thu hồi toàn bộ token của tài khoản; chỉ khi
   *  máy chủ xác nhận mới xoá phiên ở máy này (lỗi mạng → giữ nguyên để thử lại). */
  const logoutEverywhere = async (): Promise<boolean> => {
    const revoked = await requestServerLogout(true);
    if (!revoked) return false;
    logout({ skipServer: true });
    return true;
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

    const savedUser = (profileOutcome.data?.user || updated) as User;
    setCurrentUser(savedUser);
    commitUsers((prev) => ({ ...prev, [emailKey]: savedUser }));
    syncUserIdentityIntoContent(savedUser, {
      setQuestions, setSolutions, setChatMessages, setClubPosts, setClubs,
    });

    try {
      syncBroadcastChannel?.postMessage({
        type: 'SYNC_USER',
        payload: savedUser,
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

    /* Vai trò, phạm vi CLB và XP chỉ đổi sau khi server xác nhận; không dựng
       trạng thái tạm trên client vì đó là các trường server-owned. */
    const approveOutcome = await runServerAction('/api/clubs/approve', { clubId });
    if (!approveOutcome.ok) {
      setToastMessage({
        title: 'Không duyệt được câu lạc bộ',
        subtitle: approveOutcome.message,
        type: 'error',
      });
      return;
    }

    const approvedClub = approveOutcome.data?.club as Club | undefined;
    if (approvedClub) {
      setClubs(prev => prev.map(c => c.id === approvedClub.id ? approvedClub : c));
    }
    if (approveOutcome.data?.user) applyServerUser(approveOutcome.data.user as User);

    try {
      syncBroadcastChannel?.postMessage({
        type: 'APPROVE_CLUB',
        payload: clubId,
      });
    } catch {
      /* ignore */
    }

    const reward = Number(approveOutcome.data?.reward) || 0;
    playChime(reward > 0 ? 'level-up' : 'success');
    setToastMessage({
      title: `Đã phê duyệt CLB "${club.name}"!`,
      subtitle: reward > 0
        ? `Máy chủ đã cấp quyền Chủ nhiệm CLB và tặng +${reward} XP cho người sáng lập (${club.leaderName}).`
        : 'Quyền Chủ nhiệm đã được cập nhật; phần thưởng sáng lập đã được ghi nhận trước đó.',
      type: reward > 0 ? 'level' : 'success',
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
      isMasterAdmin(currentUser.email) ||
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
  const runServerAction = useCallback(async (
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
  }, []);

  const applyServerUser = useCallback((serverUser: User): void => {
    if (!serverUser?.email) return;
    const emailKey = serverUser.email.toLowerCase();
    commitUsers((prev) => ({ ...prev, [emailKey]: serverUser }));
    setCurrentUser((previous) =>
      previous && previous.email.toLowerCase() === emailKey ? serverUser : previous,
    );
    syncUserIdentityIntoContent(serverUser, {
      setQuestions, setSolutions, setChatMessages, setClubPosts, setClubs,
    });
  }, [commitUsers]);

  const postStoreAction = useCallback(async (url: string, body: unknown) => {
    const outcome = await runServerAction(url, body);
    if (outcome.ok && outcome.data?.user) applyServerUser(outcome.data.user as User);
    return outcome;
  }, [runServerAction, applyServerUser]);

  const loadDailyRewardStatus = useCallback(async (): Promise<{ ok: boolean; status?: DailyRewardStatus; message?: string }> => {
    try {
      const response = await fetch('/api/rewards/daily/status', { headers: authHeaders() });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.status) {
        return { ok: false, message: data?.message || 'Không tải được trạng thái phần thưởng.' };
      }
      return { ok: true, status: data.status as DailyRewardStatus };
    } catch {
      return { ok: false, message: 'Không kết nối được máy chủ để tải phần thưởng.' };
    }
  }, []);

  const claimDailyReward = useCallback(async (action: DailyRewardAction): Promise<DailyRewardActionResult> => {
    const outcome = await postStoreAction('/api/rewards/daily/claim', action);
    if (!outcome.ok) {
      return {
        ok: false,
        message: outcome.message,
        httpStatus: outcome.status,
        status: outcome.data?.status as DailyRewardStatus | undefined,
      };
    }
    return {
      ok: true,
      message: outcome.message,
      httpStatus: outcome.status,
      status: outcome.data?.status as DailyRewardStatus | undefined,
      reward: Number(outcome.data?.reward) || 0,
      correct: typeof outcome.data?.correct === 'boolean' ? outcome.data.correct : undefined,
      boxGranted: outcome.data?.boxGranted,
    };
  }, [postStoreAction]);

  const startFocusRewardSession = useCallback(async (targetMinutes: number): Promise<string | null> => {
    if (!currentUserRef.current) return null;
    const outcome = await postStoreAction('/api/rewards/focus/start', { targetMinutes });
    if (!outcome.ok) {
      setToastMessage({ title: 'Không mở được phiên thưởng', subtitle: outcome.message, type: 'error' });
      return null;
    }
    return typeof outcome.data?.sessionId === 'string' ? outcome.data.sessionId : null;
  }, [postStoreAction]);

  const completeFocusRewardSession = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!sessionId) return false;
    const email = currentUserRef.current?.email.toLowerCase();
    const previousLevel = email ? usersRef.current[email]?.level ?? 1 : 1;
    const outcome = await postStoreAction('/api/rewards/focus/complete', { sessionId });
    if (!outcome.ok) {
      setToastMessage({ title: 'Chưa nhận được thưởng tập trung', subtitle: outcome.message, type: 'error' });
      return false;
    }
    const reward = Number(outcome.data?.reward) || 0;
    const updatedUser = outcome.data?.user as User | undefined;
    if (updatedUser && updatedUser.level > previousLevel) {
      playChime('level-up');
      pushNotification({
        type: 'system',
        category: 'system',
        title: `Thăng cấp! Cấp độ ${updatedUser.level}`,
        body: `Bạn nhận ${reward} Coin và XP sau phiên tập trung.`,
        targetView: 'home',
      });
      setToastMessage({
        title: `Chúc mừng thăng cấp! LEVEL ${updatedUser.level}`,
        subtitle: `Máy chủ đã ghi nhận +${reward} Coin và XP cho phiên tập trung.`,
        type: 'level',
      });
    } else {
      playChime('xp');
      setToastMessage({
        title: `+${reward} XP và Coin`,
        subtitle: 'Phần thưởng phiên tập trung đã được lưu trên máy chủ.',
        type: 'xp',
      });
    }
    return reward > 0;
  }, [postStoreAction]);

  const cancelFocusRewardSession = useCallback(async (sessionId?: string): Promise<void> => {
    if (!sessionId) return;
    await postStoreAction('/api/rewards/focus/cancel', { sessionId });
  }, [postStoreAction]);

  const purchaseShopItem = useCallback(async (itemId: string): Promise<boolean> => {
    const outcome = await postStoreAction('/api/shop/purchase', { itemId });
    if (!outcome.ok) {
      setToastMessage({ title: 'Không mua được vật phẩm', subtitle: outcome.message, type: 'error' });
      return false;
    }
    playChime('success');
    setToastMessage({
      title: outcome.data?.duplicate ? 'Vật phẩm đã có trong kho' : 'Mua vật phẩm thành công',
      subtitle: outcome.data?.duplicate ? 'Không trừ Coin lần nữa.' : 'Kho và số dư đã được máy chủ cập nhật.',
      type: 'success',
    });
    return true;
  }, [postStoreAction]);

  const equipShopItem = useCallback(async (itemId: string): Promise<boolean> => {
    const outcome = await postStoreAction('/api/shop/equip', { itemId });
    if (!outcome.ok) {
      setToastMessage({ title: 'Không trang bị được vật phẩm', subtitle: outcome.message, type: 'error' });
      return false;
    }
    playChime('success');
    return true;
  }, [postStoreAction]);

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
    setQuestions(prev => [newQuestion, ...prev]);

    /* Nội dung có thể hiện lạc quan trong lúc gửi; Coin tuyệt đối không đổi tại
       client. Số dư, trừ bounty và thưởng đăng bài chỉ đến từ phản hồi máy chủ. */
    const questionOutcome = await runServerAction('/api/questions', {
      ...newQuestion,
      authorEmail: currentUser.email,
    });
    if (!questionOutcome.ok) {
      setQuestions(prevQuestions);
      setToastMessage({
        title: 'Không đăng được câu hỏi',
        subtitle: questionOutcome.message,
        type: 'error',
      });
      return;
    }

    const persistedQuestion = (questionOutcome.data?.question || newQuestion) as Question;
    setQuestions((prev) => [
      persistedQuestion,
      ...prev.filter((question) => question.id !== newQuestion.id && question.id !== persistedQuestion.id),
    ]);
    if (questionOutcome.data?.user) applyServerUser(questionOutcome.data.user as User);
    const reward = Math.max(0, Number(questionOutcome.data?.reward) || 0);
    playChime(reward > 0 ? 'xp' : 'success');
    setToastMessage({
      title: reward > 0 ? `Đã đăng câu hỏi · +${reward} XP và Coin` : 'Câu hỏi đã được tiếp nhận',
      subtitle: reward > 0
        ? 'Phần thưởng và số dư đã được máy chủ xác nhận.'
        : 'Yêu cầu này đã được ghi nhận trước đó; máy chủ không cấp thưởng lần hai.',
      type: reward > 0 ? 'xp' : 'success',
    });
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

    const persistedSolution = (solutionOutcome.data?.solution || newSolution) as Solution;
    setSolutions((prev) => [
      ...prev.filter((solution) => solution.id !== newSolution.id && solution.id !== persistedSolution.id),
      persistedSolution,
    ]);
    if (solutionOutcome.data?.user) applyServerUser(solutionOutcome.data.user as User);

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

    const reward = Math.max(0, Number(solutionOutcome.data?.reward) || 0);
    playChime(reward > 0 ? 'xp' : 'success');
    setToastMessage({
      title: reward > 0
        ? `Đã gửi lời giải · +${reward} XP và Coin`
        : solutionOutcome.data?.duplicate ? 'Lời giải đã được tiếp nhận trước đó' : 'Đã gửi lời giải',
      subtitle: reward > 0
        ? 'Phần thưởng đã được máy chủ xác nhận.'
        : 'Bạn đã nhận phần thưởng cho câu hỏi này trước đó; không phát thưởng lặp.',
      type: reward > 0 ? 'xp' : 'success',
    });
  };

  const markBestSolution = async (questionId: string, solutionId: string) => {
    if (!currentUser) return;
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    const isAuthorized =
      isMasterAdmin(currentUser.email) ||
      currentUser.id === question.authorId;

    if (!isAuthorized) {
      alert('Chỉ tác giả câu hỏi hoặc Super Admin mới có quyền xác nhận đáp án chuẩn!');
      return;
    }

    const targetSolution = solutions.find(s => s.id === solutionId);
    if (question.bestSolutionId === solutionId) return;

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

    /* Mọi đột biến và phần thưởng của đáp án chuẩn do máy chủ xác nhận trước;
       không cộng lạc quan ở client để sự kiện phát lại không tăng upvote lần hai. */
    const bestOutcome = await postStoreAction('/api/solutions/best', {
      questionId,
      solutionId,
    });
    if (!bestOutcome.ok) {
      setToastMessage({
        title: 'Không xác nhận được Đáp Án Chuẩn',
        subtitle: bestOutcome.message,
        type: 'error',
      });
      return;
    }

    const awardedAmount = Math.max(0, Number(bestOutcome.data?.reward) || 0);
    const savedQuestion = bestOutcome.data?.question as Question | undefined;
    const savedSolution = bestOutcome.data?.solution as Solution | undefined;
    if (savedQuestion) {
      setQuestions((prev) => prev.map((item) => item.id === savedQuestion.id ? savedQuestion : item));
    }
    if (savedSolution) {
      setSolutions((prev) => prev.map((item) => item.id === savedSolution.id ? savedSolution : item));
    }

    if (targetSolution && targetSolution.authorEmail && awardedAmount > 0) {
      pushNotification({
        type: 'interactive',
        category: 'interactive',
        title: 'Chúc mừng Đáp Án Chuẩn!',
        body: `Lời giải của bạn đã được xác nhận là Đáp Án Chuẩn. Bạn nhận được +${awardedAmount} Coin.`,
        targetView: 'qa',
      });
    }

    playChime(awardedAmount > 0 ? 'level-up' : 'success');
    setToastMessage({
      title: '✓ Đã xác nhận Đáp Án Chuẩn!',
      subtitle: awardedAmount > 0
        ? `Người giải bài (${targetSolution?.authorName || 'Bạn học'}) nhận +${awardedAmount} Coin và XP đã ghi trên máy chủ.`
        : 'Đáp án đã được cập nhật trên máy chủ.',
      type: awardedAmount > 0 ? 'level' : 'success',
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
    if (!currentUser || !canEditContentNow(currentUser.email)) {
      alert('Chỉ Super Admin hoặc vai trò có quyền sửa nội dung mới được xóa bài viết!');
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
    if (!currentUser || !canEditContentNow(currentUser.email)) {
      alert('Chỉ Super Admin hoặc vai trò có quyền sửa nội dung mới được sửa bài viết!');
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
    if (!currentUser || !canEditContentNow(currentUser.email)) {
      alert('Chỉ Super Admin hoặc vai trò có quyền sửa nội dung mới được xóa phản hồi!');
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
    if (!currentUser || !canEditContentNow(currentUser.email)) {
      alert('Chỉ Super Admin hoặc vai trò có quyền sửa nội dung mới được thu hồi tin nhắn!');
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
    if (!currentUser || !isMasterAdmin(currentUser.email)) {
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
    logoutEverywhere,
    updateProfile,
    loadDailyRewardStatus,
    claimDailyReward,
    startFocusRewardSession,
    completeFocusRewardSession,
    cancelFocusRewardSession,
    purchaseShopItem,
    equipShopItem,
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

