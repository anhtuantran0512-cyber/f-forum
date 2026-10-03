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
import { getTierForLevel } from '../utils/tier';
import { pushNotification } from '../utils/notifications';
import { sanitizePersistedUser, sanitizeUserRegistry } from '../utils/userSanitizer';

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

const INITIAL_CHATS: ChatMessage[] = [];
const INITIAL_QUESTIONS: Question[] = [];
const INITIAL_SOLUTIONS: Solution[] = [];
const INITIAL_CLUBS: Club[] = [];
const INITIAL_CLUB_POSTS: ClubPost[] = [];

export function useForumStore() {
  safeStorage.removeItem('f_forum_auth_token');

  const [currentView, setCurrentView] = useState<DimensionView>(() => {
    const hasSession = Boolean(safeStorage.getItem('fforum_current_user_email'));
    const hasSeenLanding = safeStorage.getItem('fforum_landing_seen') === 'true';
    return hasSession || hasSeenLanding ? 'home' : 'landing';
  });

  const [users, setUsers] = useState<Record<string, User>>(() => {
    const saved = safeStorage.getItem('fforum_users_registry');
    if (!saved) return {};
    try {
      return sanitizeUserRegistry(JSON.parse(saved));
    } catch {
      return {};
    }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);

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
    safeStorage.setItem('fforum_users_registry', JSON.stringify(users));
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
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data && isMounted) {
            const data = json.data;
            const normalizedUsers = sanitizeUserRegistry(data.users || {});
            if (Object.keys(normalizedUsers).length > 0) {
              setUsers(prev => ({ ...prev, ...normalizedUsers }));
            }
            if (Array.isArray(data.clubs)) setClubs(data.clubs);
            if (Array.isArray(data.clubPosts)) setClubPosts(data.clubPosts);
            if (Array.isArray(data.questions)) setQuestions(data.questions);
            if (Array.isArray(data.solutions)) setSolutions(data.solutions);
            if (Array.isArray(data.chatMessages)) {
              const cleanMsgs = data.chatMessages.filter(
                (m: any) =>
                  m &&
                  m.id &&
                  m.content &&
                  !m.content.includes('tôi là acc clone') &&
                  !m.content.includes('acc clone đang test')
              );
              setChatMessages(cleanMsgs);
            }
            if (data.about) {
              setAboutData(data.about);
              saveAboutDataLocally(data.about);
            }


            try {
              const sessionResponse = await fetch('/api/auth/session');
              const session = await sessionResponse.json();
              if (sessionResponse.ok && session.success && session.user) {
                const authenticatedUser = sanitizePersistedUser(session.user);
                if (authenticatedUser) {
                  setCurrentUser(authenticatedUser);
                  setUsers((prev) => ({ ...prev, [authenticatedUser.email.toLowerCase()]: authenticatedUser }));
                }
              } else {
                setCurrentUser(null);
                safeStorage.removeItem('fforum_current_user_email');
              }
            } catch {
              /* Keep browsing as a guest if the server cannot validate a cached session. */
              setCurrentUser(null);
              safeStorage.removeItem('fforum_current_user_email');
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
          break;
        }
        case 'USER_LOGIN': {
          const loggedUser = payload as User;
          setUsers(prev => ({
            ...prev,
            [loggedUser.email.toLowerCase()]: loggedUser,
          }));
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
          setUsers(JSON.parse(e.newValue));
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
    const response = await fetch('/api/auth/social', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        avatar: data.avatar?.trim() || undefined,
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.success || !result.user) {
      throw new Error(result.message || 'Đăng nhập mạng xã hội chưa khả dụng.');
    }
    const user = sanitizePersistedUser(result.user);
    if (!user) throw new Error('Không thể xác thực tài khoản.');
    setUsers((prev) => ({ ...prev, [user.email.toLowerCase()]: user }));
    setCurrentUser(user);
    safeStorage.setItem('fforum_current_user_email', user.email.toLowerCase());
    playChime('success');
    setToastMessage({ title: 'Đăng nhập thành công', subtitle: `Chào mừng ${user.name} quay lại.`, type: 'success' });
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
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setCurrentUser(null);
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

  const addXP = async (amount: number) => {
    if (!currentUser || amount !== 25) return;
    try {
      const response = await fetch('/api/users/award-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          userId: currentUser.id,
          action: 'focus_session',
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setToastMessage({
          title: 'Chưa ghi nhận được XP',
          subtitle: result.message || 'Hãy hoàn thành một phiên tập trung trước khi nhận thưởng.',
          type: 'success',
        });
        return;
      }

      const updated = sanitizePersistedUser(result.user, currentUser.email);
      if (!updated) return;
      setUsers((prev) => ({ ...prev, [updated.email.toLowerCase()]: updated }));
      setCurrentUser(updated);
      playChime(updated.level > currentUser.level ? 'level-up' : 'xp');
      setToastMessage({
        title: updated.level > currentUser.level ? `Đã lên cấp ${updated.level}` : '+25 XP',
        subtitle: 'Hoàn thành phiên tập trung 25 phút.',
        type: updated.level > currentUser.level ? 'level' : 'xp',
      });
      pushNotification({
        type: 'system',
        category: 'system',
        title: 'Phiên tập trung hoàn tất',
        body: 'Bạn đã nhận 25 XP sau một phiên học 25 phút.',
        targetView: 'home',
      });
    } catch {
      setToastMessage({
        title: 'Không thể kết nối',
        subtitle: 'Phiên tập trung đã hoàn tất nhưng chưa đồng bộ được phần thưởng.',
        type: 'success',
      });
    }
  };

  const applyServerUser = (rawUser: unknown) => {
    const updated = sanitizePersistedUser(rawUser, currentUser?.email);
    if (!updated) return null;
    setUsers((prev) => ({ ...prev, [updated.email.toLowerCase()]: updated }));
    setCurrentUser((previous) => previous?.id === updated.id ? updated : previous);
    return updated;
  };

  const checkInDaily = async () => {
    if (!currentUser) return { success: false, message: 'Đăng nhập để điểm danh.' };
    try {
      const response = await fetch('/api/daily/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, userId: currentUser.id }),
      });
      const result = await response.json();
      if (result.user) applyServerUser(result.user);
      if (result.success) playChime('success');
      return result;
    } catch {
      return { success: false, message: 'Không thể kết nối để điểm danh.' };
    }
  };

  const answerDailyQuestion = async (questionId: string, choice: number) => {
    if (!currentUser) return { success: false, message: 'Đăng nhập để trả lời.' };
    try {
      const response = await fetch('/api/daily/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          userId: currentUser.id,
          questionId,
          choice,
        }),
      });
      const result = await response.json();
      if (result.user) applyServerUser(result.user);
      if (result.success) playChime(result.correct ? 'success' : 'send');
      return result;
    } catch {
      return { success: false, message: 'Không thể gửi câu trả lời.' };
    }
  };

  const openDailyBox = async (type: 'blue' | 'gold' | 'red') => {
    if (!currentUser) return { success: false, message: 'Đăng nhập để mở hộp quà.' };
    try {
      const response = await fetch('/api/daily/open-box', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, userId: currentUser.id, type }),
      });
      const result = await response.json();
      if (result.user) applyServerUser(result.user);
      if (result.success) playChime('success');
      return result;
    } catch {
      return { success: false, message: 'Không thể mở hộp quà.' };
    }
  };

  const purchaseShopItem = async (itemId: string) => {
    if (!currentUser) return { success: false, message: 'Đăng nhập để mua vật phẩm.' };
    try {
      const response = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, userId: currentUser.id, itemId }),
      });
      const result = await response.json();
      if (result.user) applyServerUser(result.user);
      if (result.success) playChime('success');
      return result;
    } catch {
      return { success: false, message: 'Không thể kết nối cửa hàng.' };
    }
  };

  const updateProfile = async (updates: Partial<User>): Promise<boolean> => {
    if (!currentUser) return false;
    const emailKey = currentUser.email.toLowerCase();
    const allowedUpdates = {
      name: updates.name,
      avatar: updates.avatar,
      bio: updates.bio,
      gender: updates.gender,
      city: updates.city,
      className: updates.className,
      equippedBadge: updates.equippedBadge,
    };
    try {
      const response = await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, userId: currentUser.id, updates: allowedUpdates }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể lưu hồ sơ.');
      const saved = sanitizePersistedUser(result.user, currentUser.email);
      if (!saved) throw new Error('Dữ liệu hồ sơ không hợp lệ.');
      setCurrentUser(saved);
      setUsers((prev) => ({ ...prev, [emailKey]: saved }));
      setQuestions((previous) => previous.map((question) =>
        question.authorId === saved.id && !question.isAnonymous
          ? { ...question, authorName: saved.name, authorAvatar: saved.avatar }
          : question,
      ));
      setSolutions((previous) => previous.map((solution) =>
        solution.authorId === saved.id ? { ...solution, authorName: saved.name, authorAvatar: saved.avatar } : solution,
      ));
      setChatMessages((previous) => previous.map((message) =>
        message.authorId === saved.id ? { ...message, authorName: saved.name, authorAvatar: saved.avatar } : message,
      ));
      syncBroadcastChannel?.postMessage({ type: 'SYNC_USER', payload: saved });
      playChime('success');
      return true;
    } catch (error) {
      setToastMessage({
        title: 'Không thể lưu hồ sơ',
        subtitle: error instanceof Error ? error.message : 'Vui lòng thử lại.',
        type: 'level',
      });
      return false;
    }
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
      subtitle: 'Đang chờ phê duyệt từ Super Admin (anhtuantran0512@gmail.com).',
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

  const createQuestion = async (data: {
    title: string;
    subject: SubjectTag;
    content: string;
    isAnonymous: boolean;
    bountyCoin?: number;
    imageUrl?: string;
  }): Promise<boolean> => {
    if (!currentUser) return false;
    const bountyCoin = Math.max(0, Math.min(100, Number(data.bountyCoin) || 0));
    if (bountyCoin > 0 && bountyCoin < 10) {
      alert('Mức cược tối thiểu là 10 Coin.');
      return false;
    }
    if (bountyCoin > (currentUser.coin || 0)) {
      alert(`Bạn đang có ${currentUser.coin || 0} Coin; hãy giảm mức cược hoặc bỏ cược.`);
      return false;
    }

    const anonymousAlias = data.isAnonymous ? generateGhibliAlias(data.subject) : undefined;
    const anonymousMask = data.isAnonymous
      ? getRandomGhibliMask(data.title + Date.now().toString())
      : undefined;
    const newQuestion: Question = {
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: data.title,
      subject: data.subject,
      content: data.content,
      authorId: currentUser.id,
      authorName: anonymousAlias || currentUser.name,
      authorAvatar: anonymousMask || currentUser.avatar,
      isAnonymous: data.isAnonymous,
      anonymousAlias,
      anonymousMask,
      createdAt: new Date().toISOString(),
      isSolved: false,
      views: 0,
      bountyCoin,
      imageUrl: data.imageUrl,
    };

    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newQuestion, authorEmail: currentUser.email }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể đăng câu hỏi.');
      setQuestions((prev) => prev.some((question) => question.id === result.question.id)
        ? prev
        : [result.question, ...prev]);
      const updated = sanitizePersistedUser(result.user, currentUser.email);
      if (updated) {
        setCurrentUser(updated);
        setUsers((prev) => ({ ...prev, [updated.email.toLowerCase()]: updated }));
      }
      playChime('success');
      setToastMessage({ title: '+20 XP', subtitle: 'Câu hỏi đã được đăng.', type: 'xp' });
      return true;
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không thể đăng câu hỏi. Vui lòng thử lại.');
      return false;
    }
  };

  const addSolution = async (questionId: string, content: string, imageUrl?: string): Promise<boolean> => {
    if (!currentUser) return false;
    const newSolution: Solution = {
      id: `sol-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      questionId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorEmail: currentUser.email,
      authorAvatar: currentUser.avatar,
      authorLevel: currentUser.level,
      content,
      createdAt: new Date().toISOString(),
      isBest: false,
      upvotes: 0,
      imageUrl,
    };
    try {
      const response = await fetch('/api/solutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSolution),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể gửi lời giải.');
      setSolutions((prev) => prev.some((solution) => solution.id === result.solution.id)
        ? prev
        : [...prev, result.solution]);
      const updated = sanitizePersistedUser(result.user, currentUser.email);
      if (updated) {
        setCurrentUser(updated);
        setUsers((prev) => ({ ...prev, [updated.email.toLowerCase()]: updated }));
      }
      playChime('success');
      setToastMessage({ title: '+10 XP', subtitle: 'Lời giải đã được gửi.', type: 'xp' });
      return true;
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không thể gửi lời giải. Vui lòng thử lại.');
      return false;
    }
  };

  const markBestSolution = async (questionId: string, solutionId: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const response = await fetch('/api/solutions/best', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          solutionId,
          currentUserId: currentUser.id,
          currentUserEmail: currentUser.email,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể chọn lời giải.');
      setQuestions((prev) => prev.map((question) => question.id === questionId
        ? { ...question, isSolved: true, bestSolutionId: solutionId, bountyPaid: Boolean(result.rewardCoin) }
        : question));
      setSolutions((prev) => prev.map((solution) => solution.questionId === questionId
        ? { ...solution, isBest: solution.id === solutionId }
        : solution));
      const updated = sanitizePersistedUser(result.user, result.user?.email);
      if (updated) {
        setUsers((prev) => ({ ...prev, [updated.email.toLowerCase()]: updated }));
        setCurrentUser((previous) => previous?.id === updated.id ? updated : previous);
      }
      playChime('success');
      setToastMessage({ title: 'Đã chọn lời giải tốt nhất', subtitle: 'Tác giả nhận 25 XP và phần thưởng cược (nếu có).', type: 'success' });
      return true;
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không thể chọn lời giải. Vui lòng thử lại.');
      return false;
    }
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
      title: 'Đã gửi ý kiến đóng góp thành công tới Admin!',
      subtitle: `Chuyển tiếp trực tiếp đến anhtuantran0512@gmail.com. Cảm ơn bạn!`,
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
    checkInDaily,
    answerDailyQuestion,
    openDailyBox,
    purchaseShopItem,
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

