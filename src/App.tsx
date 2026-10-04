/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { installInteractionWatchdog } from './utils/interactionWatchdog';
import { useForumStore } from './store/forumStore';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/views/HomeView';
import { GlobalCursor } from './components/GlobalCursor';
import {
  Eye,
  Sparkles,
  Trophy,
  CheckCircle,
  Info,
  Home,
  Users,
  HelpCircle,
  MessageSquare,
  Compass,
  Award,
  Rocket,
  Headphones,
  NotebookPen,
  Command as CommandIcon,
  Palette,
  Settings as SettingsIcon,
  Flame,
  User as UserIcon,
  ShieldAlert,
  AlertCircle,
} from 'lucide-react';
import type { DimensionView, User } from './types';
import { CommandPalette, type PaletteCommand } from './components/CommandPalette';
import { QuickNotesDock } from './components/QuickNotesDock';
import { StudyCareCoach } from './components/StudyCareCoach';
import { ViewTransitionLoader } from './components/ViewTransitionLoader';
import { FocusSessionWatcher } from './components/FocusSessionWatcher';
import { AuthProvider } from './context/AuthContext';
import { GODRAY_PRESETS } from './utils/godrays';
import { safeStorage } from './utils/storage';
import { PageResourceLoader } from './components/PageResourceLoader';
import { UserQuickCard } from './components/UserQuickCard';
import { RadialQuickMenu } from './components/RadialQuickMenu';

const LandingPage = lazyWithRetry(() => import('./components/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const ClubsView = lazyWithRetry(() => import('./components/views/ClubsView').then(m => ({ default: m.ClubsView })));
const QAForumView = lazyWithRetry(() => import('./components/views/QAForumView').then(m => ({ default: m.QAForumView })));
const ChatView = lazyWithRetry(() => import('./components/views/ChatView').then(m => ({ default: m.ChatView })));
const KhuVinhDanhView = lazyWithRetry(() => import('./components/views/KhuVinhDanhView').then(m => ({ default: m.KhuVinhDanhView })));
const ComingSoonView = lazyWithRetry(() => import('./components/views/ComingSoonView').then(m => ({ default: m.ComingSoonView })));
const MemoryRealm = lazyWithRetry(() => import('./components/MemoryRealm').then(m => ({ default: m.MemoryRealm })));
const ChatDock = lazyWithRetry(() => import('./components/ChatDock').then(m => ({ default: m.ChatDock })));
const ProfileModal = lazyWithRetry(() => import('./components/ProfileModal').then(m => ({ default: m.ProfileModal })));
const FocusSanctuary = lazyWithRetry(() => import('./components/FocusSanctuary').then(m => ({ default: m.FocusSanctuary })));
const AuthModal = lazyWithRetry(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const XPSandboxDock = lazyWithRetry(() => import('./components/XPSandboxDock').then(m => ({ default: m.XPSandboxDock })));
const ReportInboxModal = lazyWithRetry(() => import('./components/ReportInboxModal').then(m => ({ default: m.ReportInboxModal })));

const ViewLoadingFallback = () => (
  <div className="w-full h-full min-h-[50vh] flex items-center justify-center" aria-busy="true" aria-label="Đang tải giao diện">
    <div className="w-8 h-8 rounded-full border-2 border-amber-400/20 border-t-amber-400 animate-spin" />
  </div>
);

const CORE_SCROLL_VIEWS: DimensionView[] = ['home', 'clubs', 'qa', 'coming-soon'];
const SCROLL_COOLDOWN_MS = 650;

/* Thứ tự phân khu dùng để biết hướng trượt (lên/xuống) khi chuyển trang */
const VIEW_ORDER: DimensionView[] = [
  'landing',
  'home',
  'clubs',
  'qa',
  'chat',
  'memory',
  'chronicles',
  'coming-soon',
];

/* Phân khu cần màn hình chờ (CodeFronts la-09 vinyl / la-05 dots).
   home là trang nhẹ nên vào thẳng, không chặn người dùng. */
const VIEW_LOADERS: Partial<Record<DimensionView, { label: string; variant: 'vinyl' | 'dots' }>> = {
  landing: { label: 'Trang Giới thiệu', variant: 'vinyl' },
  clubs: { label: 'Câu lạc bộ', variant: 'vinyl' },
  qa: { label: 'Sàn Hỏi đáp', variant: 'vinyl' },
  chat: { label: 'Phòng Chat', variant: 'dots' },
  memory: { label: 'Miền Ký Ức', variant: 'vinyl' },
  chronicles: { label: 'Khu Vinh Danh', variant: 'vinyl' },
  'coming-soon': { label: 'Bản nâng cấp', variant: 'vinyl' },
};

const LOADER_MIN_MS = 950; /* lần đầu vào phân khu */
const LOADER_REVISIT_MS = 520; /* quay lại phân khu đã tải rồi */
const LOADER_HARD_CAP_MS = 2600;

/**
 * Kiểm tra con trỏ có đang nằm trong một khung cuộn dọc còn cuộn được không.
 * Nếu có thì nhường cuộn cho khung đó, không nhảy phân khu (tránh cướp cuộn
 * ở sidebar Hỏi đáp, danh sách CLB…).
 */
const isInsideScrollable = (el: HTMLElement | null, deltaY: number): boolean => {
  let node: HTMLElement | null = el;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    if (/(auto|scroll|overlay)/.test(style.overflowY) && node.scrollHeight - node.clientHeight > 4) {
      const atTop = node.scrollTop <= 1;
      const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
      if (deltaY > 0 ? !atBottom : !atTop) return true;
    }
    node = node.parentElement;
  }
  return false;
};

/** Báo cho App biết phân khu đã dựng xong (đã tải xong chunk lazy). */
const ViewReadySignal: React.FC<{ view: DimensionView; onReady: (view: DimensionView) => void }> = ({
  view,
  onReady,
}) => {
  useEffect(() => {
    onReady(view);
  }, [view, onReady]);
  return null;
};

export const App: React.FC = () => {
  const {
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
    adminDeleteQuestion,
    adminEditQuestion,
    adminDeleteSolution,
    adminDeleteChatMessage,
  } = useForumStore();

  const [isResourceLoading, setIsResourceLoading] = useState(true);
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<'overview' | 'card' | 'stats' | 'shop' | 'activity' | 'edit'>('overview');
  const [targetProfileUser, setTargetProfileUser] = useState<User | null>(null);
  const [quickProfile, setQuickProfile] = useState<{ user: User; anchor?: { x: number; y: number } | null } | null>(null);
  const [scrollInsideCinema, setScrollInsideCinema] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('login');
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  /* Hộp thư tố cáo — chỉ Super Admin mở được. */
  const [isReportInboxOpen, setIsReportInboxOpen] = useState(false);
  const [pendingReportCount, setPendingReportCount] = useState(0);
  const [eyeRestEnabled, setEyeRestEnabled] = useState<boolean>(() => {
    return safeStorage.getItem('fforum_eye_rest') === 'true';
  });
  const [transition, setTransition] = useState<{ target: DimensionView; startedAt: number; revisit: boolean } | null>(null);
  const [readyView, setReadyView] = useState<DimensionView | null>(null);
  const visitedViewsRef = useRef<Set<DimensionView>>(new Set<DimensionView>([currentView]));
  const [slideDir, setSlideDir] = useState<'up' | 'down' | 'none'>('none');
  const prevViewIndexRef = useRef<number>(VIEW_ORDER.indexOf(currentView));

  const isInsideCinema = currentView === 'memory' && scrollInsideCinema;

  const [godrayPreset, setGodrayPreset] = useState<string>(() => {
    return safeStorage.getItem('fforum_godray_preset') || 'godray-gold';
  });
  const [godrayIntensity, setGodrayIntensity] = useState<number>(() => {
    const val = safeStorage.getItem('fforum_godray_intensity');
    return val ? parseInt(val, 10) : 70;
  });

  useEffect(() => {
    const handleSyncGodray = () => {
      const p = safeStorage.getItem('fforum_godray_preset') || 'godray-gold';
      const i = safeStorage.getItem('fforum_godray_intensity');
      setGodrayPreset(p);
      if (i) setGodrayIntensity(parseInt(i, 10));
    };
    window.addEventListener('fforum_theme_sync', handleSyncGodray);
    return () => window.removeEventListener('fforum_theme_sync', handleSyncGodray);
  }, []);

  useEffect(() => {
    if (currentView !== 'memory') return;

    const checkScroll = () => {
      const cinemaEl = document.getElementById('cinema');
      if (cinemaEl) {
        const rect = cinemaEl.getBoundingClientRect();
        const inCinema = rect.top <= 60 && rect.bottom > window.innerHeight;
        setScrollInsideCinema(inCinema);
      } else {
        setScrollInsideCinema(false);
      }
    };

    window.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll, { passive: true });
    const timer = setTimeout(checkScroll, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [currentView]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentView]);

  const handleOpenAuth = useCallback(
    (tab: 'login' | 'register' = 'login') => {
      setAuthInitialTab(tab);
      setIsLoginModalOpen(true);
    },
    [setIsLoginModalOpen],
  );

  const handleOpenProfile = (
    tab: 'overview' | 'card' | 'stats' | 'shop' | 'activity' | 'edit' = 'overview',
    userToView?: { id: string; name: string; avatar: string; email?: string; level?: number }
  ) => {
    if (userToView) {
      const emailKey = userToView.email ? userToView.email.toLowerCase() : '';
      const existing = (emailKey && users[emailKey]) || Object.values(users).find(u => u.id === userToView.id);
      if (existing) {
        setTargetProfileUser(existing);
      } else {
        setTargetProfileUser({
          id: userToView.id,
          name: userToView.name,
          email: userToView.email || '',
          avatar: userToView.avatar,
          role: userToView.email === 'anhtuantran0512@gmail.com' ? 'SUPER_ADMIN' : 'STUDENT',
          level: userToView.level || 1,
          xp: 0,
          coin: 100,
          bio: '',
          scopedClubIds: [],
        });
      }
      setProfileInitialTab(tab);
      setIsProfileModalOpen(true);
      return;
    }

    if (!currentUser) {
      handleOpenAuth('login');
      return;
    }
    setTargetProfileUser(null);
    setProfileInitialTab(tab);
    setIsProfileModalOpen(true);
  };

  const handleOpenUserProfile = (
    userToView?: { id: string; name: string; avatar: string; email?: string; level?: number },
    anchor?: { x: number; y: number } | null,
  ) => {
    if (!userToView) {
      handleOpenProfile('overview');
      return;
    }

    /* If an explicit anchor is passed, open the quick card; otherwise ("Trang cá nhân" button),
       open the full ProfileModal directly so no extra modal blocks the screen. */
    if (anchor) {
      const emailKey = userToView.email ? userToView.email.toLowerCase() : '';
      const existing = (emailKey && users[emailKey]) || Object.values(users).find(u => u.id === userToView.id);
      const resolved: User = existing || {
        id: userToView.id,
        name: userToView.name,
        email: userToView.email || '',
        avatar: userToView.avatar,
        role: 'STUDENT',
        level: userToView.level || 1,
        xp: 0,
        bio: '',
        scopedClubIds: [],
      };
      setQuickProfile({ user: resolved, anchor });
      return;
    }

    handleOpenProfile('overview', userToView);
  };

  const handleToggleChat = () => {
    setIsChatOpen(prev => {
      const next = !prev;
      if (next) {
        setUnreadChatCount(0);
      }
      return next;
    });
  };

  /* Chuyển phân khu kèm màn hình chờ cho các trang nặng */
  const beginTransition = useCallback(
    (v: DimensionView) => {
      if (!VIEW_LOADERS[v]) return;
      const revisit = visitedViewsRef.current.has(v);
      visitedViewsRef.current.add(v);
      setReadyView(null);
      setTransition({ target: v, startedAt: Date.now(), revisit });
    },
    [],
  );

  const handleNavigate = (v: DimensionView) => {
    /* Bấm lại đúng phân khu đang mở thì chỉ cuộn lên đầu, không chạy màn hình chờ */
    if (v === currentView) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      return;
    }
    beginTransition(v);
    setCurrentView(v);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleViewChange = useCallback(
    (v: DimensionView) => {
      if (v === currentView) {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        return;
      }
      beginTransition(v);
      setCurrentView(v);
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    },
    [currentView, setCurrentView, beginTransition],
  );

  const handleViewReady = useCallback((view: DimensionView) => {
    setReadyView(view);
  }, []);

  /* Phiên Pomodoro hoàn thành: cộng XP đúng tài khoản đang đăng nhập.
     (addXP(amount) không kèm email sẽ bị bỏ qua với người dùng thường.) */
  const handleFocusReward = useCallback(
    (amount: number) => {
      if (currentUser) addXP(amount, currentUser.email);
    },
    [addXP, currentUser],
  );

  /* Hướng trượt khi đổi phân khu (lướt như lật trang) */
  useEffect(() => {
    const idx = VIEW_ORDER.indexOf(currentView);
    const prev = prevViewIndexRef.current;
    if (idx === -1 || prev === -1) return;
    setSlideDir(idx > prev ? 'up' : idx < prev ? 'down' : 'none');
    prevViewIndexRef.current = idx;
  }, [currentView]);

  /* Tắt màn hình chờ: sớm nhất sau LOADER_MIN_MS khi phân khu đã dựng xong,
     muộn nhất là LOADER_HARD_CAP_MS để không bao giờ treo người dùng. */
  useEffect(() => {
    if (!transition) return;
    const elapsed = Date.now() - transition.startedAt;
    const isReady = readyView === transition.target;
    const minMs = transition.revisit ? LOADER_REVISIT_MS : LOADER_MIN_MS;
    const delay = isReady ? Math.max(0, minMs - elapsed) + 170 : Math.max(0, LOADER_HARD_CAP_MS - elapsed);
    const timer = window.setTimeout(() => setTransition(null), delay);
    return () => window.clearTimeout(timer);
  }, [transition, readyView]);

  const loaderMeta = transition ? VIEW_LOADERS[transition.target] : null;

  const lastScrollTimeRef = useRef<number>(0);
  const lastWheelTimeRef = useRef<number>(0);
  const transitionActiveRef = useRef(false);

  useEffect(() => {
    transitionActiveRef.current = transition !== null;
  }, [transition]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      /* Đang chạy màn hình chờ thì bỏ qua cuộn, tránh nhảy hai phân khu một lúc */
      if (transitionActiveRef.current) return;

      if (currentView === 'chat' || currentView === 'memory' || currentView === 'chronicles') {
        return;
      }

      if (currentView === 'landing') {
        return;
      }

      if (
        isLoginModalOpen ||
        isProfileModalOpen ||
        isFocusModeOpen ||
        isChatOpen ||
        isPaletteOpen ||
        isNotesOpen
      ) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (target && target.closest('input, textarea, select, [role="dialog"]')) {
        return;
      }

      const currentIndex = CORE_SCROLL_VIEWS.indexOf(currentView);
      if (currentIndex === -1) return;

      const deltaY = e.deltaY;
      if (Math.abs(deltaY) <= 30) return;

      /* Đang cuộn trong một khung nội bộ (sidebar, danh sách dài) → nhường */
      if (isInsideScrollable(target, deltaY)) return;

      const now = Date.now();
      const timeSinceLastScroll = now - lastScrollTimeRef.current;
      if (timeSinceLastScroll < SCROLL_COOLDOWN_MS) {
        lastWheelTimeRef.current = now;
        return;
      }

      lastWheelTimeRef.current = now;

      if (deltaY > 30) {
        if (currentIndex < CORE_SCROLL_VIEWS.length - 1) {
          lastScrollTimeRef.current = now;
          handleViewChange(CORE_SCROLL_VIEWS[currentIndex + 1]);
        }
      } else if (deltaY < -30) {
        if (currentIndex > 0) {
          lastScrollTimeRef.current = now;
          handleViewChange(CORE_SCROLL_VIEWS[currentIndex - 1]);
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [
    currentView,
    isLoginModalOpen,
    isProfileModalOpen,
    isFocusModeOpen,
    isChatOpen,
    isPaletteOpen,
    isNotesOpen,
    handleViewChange,
  ]);

  /* ============================================================
     F-ID Hidden Layer — bảng lệnh (⌘K), sổ tay nhanh (⌘I) & phím tắt
     ============================================================ */
  useEffect(() => {
    const openPalette = () => setIsPaletteOpen(true);
    const openNotes = () => setIsNotesOpen((prev) => !prev);
    window.addEventListener('fforum_open_palette', openPalette);
    window.addEventListener('fforum_open_notes', openNotes);
    return () => {
      window.removeEventListener('fforum_open_palette', openPalette);
      window.removeEventListener('fforum_open_notes', openNotes);
    };
  }, []);

  const toggleEyeRest = useCallback(() => {
    setEyeRestEnabled((prev) => {
      const next = !prev;
      safeStorage.setItem('fforum_eye_rest', String(next));
      if (next) {
        setToastMessage({
          title: 'Đã bật nhắc nghỉ mắt 20-20-20',
          subtitle: 'Cứ 20 phút F-Forum sẽ nhắc bạn thư giãn mắt 20 giây.',
          type: 'success',
        });
      }
      return next;
    });
  }, [setToastMessage]);

  const paletteCommands: PaletteCommand[] = React.useMemo(() => {
    const views: { id: DimensionView; label: string; hint: string; icon: React.ReactNode; keywords: string }[] = [
      { id: 'home', label: 'Trang chủ', hint: 'Bảng tin tổng hợp & thống kê', icon: <Home className="w-4 h-4" />, keywords: 'home bang tin' },
      { id: 'clubs', label: 'Câu lạc bộ', hint: 'CLB, sự kiện & bài đăng nhóm', icon: <Users className="w-4 h-4" />, keywords: 'clb club' },
      { id: 'qa', label: 'Hỏi đáp', hint: 'Sàn hỏi bài theo môn học', icon: <HelpCircle className="w-4 h-4" />, keywords: 'hoi bai qa' },
      { id: 'chat', label: 'Phòng chat', hint: 'Trò chuyện thời gian thực', icon: <MessageSquare className="w-4 h-4" />, keywords: 'chat tin nhan' },
      { id: 'memory', label: 'Miền ký ức', hint: 'Chuyến cuộn phim thanh xuân', icon: <Compass className="w-4 h-4" />, keywords: 'ky uc memory' },
      { id: 'chronicles', label: 'Khu vinh danh', hint: 'Quả cầu 3D & cột mốc', icon: <Award className="w-4 h-4" />, keywords: 'vinh danh' },
      { id: 'coming-soon', label: 'Bản nâng cấp', hint: 'Những gì đang được phát triển', icon: <Rocket className="w-4 h-4" />, keywords: 'update' },
      { id: 'landing', label: 'Giới thiệu F-Forum', hint: 'Trang marketing & bảng giá', icon: <Sparkles className="w-4 h-4" />, keywords: 'gioi thieu landing' },
    ];

    const viewCommands: PaletteCommand[] = views.map((v) => ({
      id: `view-${v.id}`,
      label: v.label,
      hint: v.hint,
      group: 'Điều hướng',
      icon: v.icon,
      keywords: v.keywords,
      run: () => handleViewChange(v.id),
    }));

    const actionCommands: PaletteCommand[] = [
      {
        id: 'act-palette-shortcut',
        label: 'Bảng lệnh nhanh',
        hint: 'Đang mở — gõ để lọc mọi tác vụ',
        group: 'Tác vụ',
        icon: <CommandIcon className="w-4 h-4" />,
        shortcut: '⌘K',
        keywords: 'command palette lenh',
        run: () => setIsPaletteOpen(true),
      },
      {
        id: 'act-notes',
        label: 'Sổ tay nhanh',
        hint: 'Ghi chú dùng chung với Focus Sanctuary',
        group: 'Tác vụ',
        icon: <NotebookPen className="w-4 h-4" />,
        shortcut: '⌘I',
        keywords: 'so tay ghi chu note',
        run: () => setIsNotesOpen(true),
      },
      {
        id: 'act-focus',
        label: 'Vào không gian tập trung',
        hint: 'Pomodoro 25 phút + âm thanh 432Hz',
        group: 'Không gian',
        icon: <Headphones className="w-4 h-4" />,
        shortcut: '⌘⇧F',
        keywords: 'focus pomodoro tap trung',
        run: () => setIsFocusModeOpen(true),
      },
      {
        id: 'act-attendance',
        label: 'Điểm danh & mở kho quà',
        hint: 'Giữ chuỗi ngày, nhận Coin',
        group: 'Không gian',
        icon: <Flame className="w-4 h-4" />,
        keywords: 'diem danh streak hop qua',
        run: () => window.dispatchEvent(new CustomEvent('fforum_open_daily')),
      },
      {
        id: 'act-chat',
        label: 'Bật / tắt khung chat nhanh',
        hint: 'Chat Dock trượt bên phải',
        group: 'Không gian',
        icon: <MessageSquare className="w-4 h-4" />,
        keywords: 'chat dock',
        run: handleToggleChat,
      },
      {
        id: 'act-eye-rest',
        label: eyeRestEnabled ? 'Tắt nhắc nghỉ mắt 20-20-20' : 'Bật nhắc nghỉ mắt 20-20-20',
        hint: eyeRestEnabled ? 'Đang bật — cứ 20 phút nhắc một lần' : 'Bảo vệ mắt khi học lâu trên màn hình',
        group: 'Không gian',
        icon: <Eye className="w-4 h-4" />,
        keywords: 'nghi mat eye rest 20-20-20',
        run: toggleEyeRest,
      },
      {
        id: 'act-eye-rest-now',
        label: 'Nghỉ mắt ngay (20 giây)',
        hint: 'Mở lớp phủ thư giãn mắt tức thì',
        group: 'Không gian',
        icon: <Eye className="w-4 h-4" />,
        keywords: 'nghi mat ngay thu gian',
        run: () => window.dispatchEvent(new CustomEvent('fforum_eye_rest_now')),
      },
      {
        id: 'act-theme',
        label: 'Đổi chế độ Sáng / Tối',
        hint: 'Chuyển nhanh giao diện Obsidian ↔ Pha lê',
        group: 'Giao diện',
        icon: <Palette className="w-4 h-4" />,
        shortcut: '⌘⇧L',
        keywords: 'theme sang toi dark light',
        run: () => window.dispatchEvent(new CustomEvent('fforum_toggle_theme')),
      },
      {
        id: 'act-settings',
        label: 'Mở trung tâm điều khiển',
        hint: 'Giao diện, trải nghiệm & dữ liệu',
        group: 'Giao diện',
        icon: <SettingsIcon className="w-4 h-4" />,
        keywords: 'cai dat setting',
        run: () => window.dispatchEvent(new CustomEvent('fforum_open_settings')),
      },
    ];

    if (currentUser) {
      actionCommands.push({
        id: 'act-profile',
        label: 'Trang cá nhân của tôi',
        hint: `${currentUser.name} · Cấp ${currentUser.level}`,
        group: 'Tài khoản',
        icon: <UserIcon className="w-4 h-4" />,
        keywords: 'profile ho so ca nhan',
        run: () => handleOpenProfile('overview'),
      });
    }

    return [...viewCommands, ...actionCommands];
  }, [currentUser, handleViewChange, handleToggleChat, handleOpenProfile, eyeRestEnabled, toggleEyeRest]);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
        return;
      }
      if (e.key.toLowerCase() === 'i' && !e.shiftKey) {
        if (isTypingTarget(e.target)) return;
        e.preventDefault();
        setIsNotesOpen((prev) => !prev);
        return;
      }
      if (e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('fforum_toggle_theme'));
        return;
      }
      if (e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFocusModeOpen(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  /* Lưới an toàn cuối: nếu một lớp phủ VÔ HÌNH nào đó đang nuốt cú bấm, tự gỡ
     nó để giao diện không bao giờ rơi vào trạng thái "bấm gì cũng không mở". */
  useEffect(() => installInteractionWatchdog(), []);

  const solvedQuestionsCount = questions.filter(q => q.isSolved).length;
  const isScrollableView =
    currentView === 'memory' || currentView === 'chronicles' || currentView === 'landing';

  const activeGodray = GODRAY_PRESETS.find(p => p.id === godrayPreset) || GODRAY_PRESETS[0];

  useEffect(() => {
    document.documentElement.style.setProperty('--ff-accent', activeGodray.accent);
    document.documentElement.style.setProperty('--ff-godray-gradient', activeGodray.gradient);
    document.documentElement.style.setProperty(
      '--ff-godray-opacity',
      String(Math.min(0.95, (godrayIntensity / 100) * 0.92))
    );
  }, [activeGodray, godrayIntensity]);

  return (
    <AuthProvider currentUser={currentUser}>
      {/* Global Radiant Cursor (Active across entire app on pointer devices) */}
      <GlobalCursor />

      <div
        className={`relative w-full ${
          isScrollableView ? 'min-h-screen' : 'h-[100dvh] md:h-screen overflow-hidden'
        } ${currentView === 'landing' ? 'bg-[var(--ff-bg)]' : 'bg-black'} text-white font-sans`}
      >
        {/* Ambient Godray Gradient Lighting Overlay (Enhanced influence across viewport) */}
        <div
          className="fixed inset-0 pointer-events-none z-[1] overflow-hidden transition-all duration-700"
          style={{
            background: activeGodray.gradient,
            opacity: Math.min(0.95, (godrayIntensity / 100) * 0.92),
          }}
          aria-hidden="true"
        />
        <div
          className="fixed -top-24 inset-x-0 h-[360px] pointer-events-none z-[1] blur-3xl transition-all duration-700"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${activeGodray.accent}55 0%, transparent 72%)`,
            opacity: Math.min(0.9, (godrayIntensity / 100) * 0.85),
          }}
          aria-hidden="true"
        />
      
      {/* Floating Global Navbar Dock (Viewport fixed wrapper with graceful transitions) */}
      {currentView !== 'chronicles' && (
        currentView === 'landing' ? null : (
        <Navbar
          currentView={currentView}
          onViewChange={handleViewChange}
          currentUser={currentUser}
          onOpenLoginModal={() => handleOpenAuth('login')}
          onLogout={logout}
          isChatOpen={isChatOpen}
          onToggleChat={handleToggleChat}
          unreadChatCount={unreadChatCount}
          onOpenProfile={handleOpenProfile}
          onOpenFocusMode={() => setIsFocusModeOpen(true)}
          isInsideCinema={isInsideCinema}
          onRewardCoins={(amount) => {
            if (currentUser) addXP(amount, currentUser.email);
          }}
          onUpdateStreak={(streak) => {
            if (currentUser && (currentUser.streakCount ?? 0) !== streak) {
              updateProfile({ streakCount: streak });
            }
          }}
          eyeRestEnabled={eyeRestEnabled}
          onToggleEyeRest={toggleEyeRest}
        />
        )
      )}

      {/* Main Dimension View Routing (Single-Viewport Multi-View Architecture) */}
      <main className={`w-full ${currentView === 'memory' || currentView === 'chronicles' ? 'min-h-[116vh]' : 'h-full'}`}>
        <Suspense fallback={<ViewLoadingFallback />}>
          {/* Bọc theo key để mỗi lần đổi phân khu chạy lại hoạt ảnh trượt */}
          <div
            key={currentView}
            className={`w-full h-full ${
              slideDir === 'up' ? 'ff-view-slide-up' : slideDir === 'down' ? 'ff-view-slide-down' : ''
            }`}
          >
          <ViewReadySignal view={currentView} onReady={handleViewReady} />
          {currentView === 'landing' && (
            <LandingPage
              currentUser={currentUser}
              onOpenAuth={() => handleOpenAuth('register')}
              onEnterApp={() => handleViewChange('home')}
              onlineCount={onlineUsers.length}
              totalQuestions={questions.length}
              solvedQuestions={solvedQuestionsCount}
              totalClubs={clubs.filter(c => c.status === 'APPROVED').length}
            />
          )}

          {currentView === 'home' && (
            <div className="relative w-full h-full">
              <HomeView
                onNavigate={handleNavigate}
                onOpenLanding={() => handleViewChange('landing')}
                totalClubs={clubs.filter(c => c.status === 'APPROVED').length}
                totalQuestions={questions.length}
                solvedQuestionsCount={solvedQuestionsCount}
                onlineCount={onlineUsers.length}
                onlineUsersCount={onlineUsers.length}
                resolvedQuestionsCount={solvedQuestionsCount}
                totalClubsCount={clubs.filter(c => c.status === 'APPROVED').length}
                chatMessagesTodayCount={chatMessages.length}
                streakCount={currentUser?.streakCount || 0}
                onOpenDaily={() => window.dispatchEvent(new CustomEvent('fforum_open_daily'))}
              />
            </div>
          )}

          {currentView === 'clubs' && (
            <ClubsView
              currentUser={currentUser}
              clubs={clubs}
              clubPosts={clubPosts}
              onCreateClub={createClub}
              onApproveClub={approveClub}
              onRejectClub={rejectClub}
              onCreateClubPost={createClubPost}
              chatMessages={chatMessages}
              onOpenLoginModal={() => handleOpenAuth('login')}
            />
          )}

          {currentView === 'qa' && (
            <QAForumView
              currentUser={currentUser}
              questions={questions}
              solutions={solutions}
              onCreateQuestion={createQuestion}
              onAddSolution={addSolution}
              onMarkBestSolution={markBestSolution}
              onDeleteQuestion={adminDeleteQuestion}
              onEditQuestion={adminEditQuestion}
              onDeleteSolution={adminDeleteSolution}
              onOpenLoginModal={() => handleOpenAuth('login')}
              onOpenProfile={handleOpenUserProfile}
              users={users}
              chatMessages={chatMessages}
              isSynced={isSynced}
              onOpenFocusMode={() => setIsFocusModeOpen(true)}
            />
          )}

          {currentView === 'chat' && (
            <ChatView
              currentUser={currentUser}
              messages={chatMessages}
              onSendMessage={sendChatMessage}
              onDeleteMessage={adminDeleteChatMessage}
              onlineUsers={onlineUsers}
              onlineCount={onlineUsers.length}
              onOpenLoginModal={() => handleOpenAuth('login')}
              onOpenProfile={handleOpenUserProfile}
              isSynced={isSynced}
            />
          )}

          {currentView === 'memory' && (
            <div className="w-full min-h-screen bg-black">
              <MemoryRealm
                onNavigateSection={(sectionId) => {
                  if (sectionId === 'clubs' || sectionId === 'qa' || sectionId === 'chronicles') {
                    handleViewChange(sectionId as DimensionView);
                  } else {
                    const el = document.getElementById(sectionId);
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              />
            </div>
          )}

          {currentView === 'chronicles' && (
            <KhuVinhDanhView
              onExit={() => setCurrentView('home')}
              onNavigate={(v) => setCurrentView(v)}
              currentUser={currentUser}
            />
          )}

          {currentView === 'coming-soon' && (
            <ComingSoonView onReturnHome={handleViewChange} />
          )}
          </div>
        </Suspense>
      </main>

      {/* Màn hình chờ chuyển phân khu (CodeFronts la-09 vinyl / la-05 dots) */}
      <ViewTransitionLoader
        visible={Boolean(transition) && Boolean(loaderMeta)}
        targetLabel={loaderMeta?.label}
        variant={loaderMeta?.variant || 'vinyl'}
        onSkip={() => setTransition(null)}
      />

      {/* Radial quick actions (ccm-02 sin()/cos() fan at bottom-left below Streak) */}
      {currentView !== 'landing' && currentView !== 'chronicles' && !isChatOpen && (
        <RadialQuickMenu
          onNavigate={(v) => handleNavigate(v as DimensionView)}
          onToggleChat={handleToggleChat}
          onOpenFocusMode={() => setIsFocusModeOpen(true)}
          onOpenStreak={() => window.dispatchEvent(new CustomEvent('fforum_open_daily'))}
          onOpenNotes={() => setIsNotesOpen(true)}
          onOpenPalette={() => setIsPaletteOpen(true)}
          streakCount={currentUser?.streakCount ?? 0}
        />
      )}

      <Suspense fallback={null}>
        {/* Slide-over Chat Dock (For quick chatting when browsing Home, Clubs, QA, Chronicles) */}
        {currentView !== 'chat' && (
          currentView === 'landing' ? null : (
          <ChatDock
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            currentUser={currentUser}
            messages={chatMessages}
            onSendMessage={sendChatMessage}
            onDeleteMessage={adminDeleteChatMessage}
            onOpenLoginModal={() => handleOpenAuth('login')}
            onOpenProfile={handleOpenUserProfile}
            isSynced={isSynced}
          />
          )
        )}

        {/* User Profile (F-ID Settings Modal) */}
        {(targetProfileUser || currentUser) && (
          <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => {
              setIsProfileModalOpen(false);
              setTargetProfileUser(null);
            }}
            currentUser={targetProfileUser || currentUser!}
            viewerUser={currentUser}
            onSaveProfile={updateProfile}
            initialTab={profileInitialTab}
            questions={questions}
            solutions={solutions}
          />
        )}

        {/* Quick Profile Card (click a user → preview, then open full profile on demand) */}
        <UserQuickCard
          user={quickProfile?.user || null}
          isOpen={Boolean(quickProfile)}
          onClose={() => setQuickProfile(null)}
          onOpenFullProfile={(user, tab) => {
            setQuickProfile(null);
            handleOpenProfile(tab || 'overview', {
              id: user.id,
              name: user.name,
              avatar: user.avatar,
              email: user.email,
              level: user.level,
            });
          }}
          questions={questions}
          solutions={solutions}
        />

        {/* Authentication Modal */}
        <AuthModal
          key={authInitialTab}
          initialTab={authInitialTab}
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLogin={login}
          onLoginSocial={loginSocial}
          onLoginWithPassword={loginWithPassword}
          onRegister={registerWithPassword}
        />

        {/* Focus Sanctuary & Pomodoro HUD Mode */}
        <FocusSanctuary
          isOpen={isFocusModeOpen}
          onClose={() => setIsFocusModeOpen(false)}
          userEmail={currentUser?.email}
          onRewardXP={handleFocusReward}
        />
      </Suspense>

      {/* Người giữ nhịp Phòng Tập Trung: đếm theo thời gian thật ở cấp App,
          ghi giờ học + XP kể cả khi HUD đã đóng, kèm chip đếm ngược nổi. */}
      <FocusSessionWatcher
        userEmail={currentUser?.email}
        onRewardXP={handleFocusReward}
        isHudOpen={isFocusModeOpen}
        onOpenHud={() => setIsFocusModeOpen(true)}
      />

      {/* ======================================================== */}
      {/* HIDDEN PREMIUM LAYER: Bảng lệnh, Sổ tay nhanh, Nghỉ mắt  */}
      {/* ======================================================== */}
      <Suspense fallback={null}>
        <CommandPalette
          isOpen={isPaletteOpen}
          onClose={() => setIsPaletteOpen(false)}
          commands={paletteCommands}
        />

        <QuickNotesDock
          isOpen={isNotesOpen}
          onClose={() => setIsNotesOpen(false)}
          onOpenFocusMode={() => setIsFocusModeOpen(true)}
        />

        <StudyCareCoach
          enabled={eyeRestEnabled}
          onToast={(title, subtitle) => setToastMessage({ title, subtitle, type: 'success' })}
        />
      </Suspense>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 sm:top-24 right-4 sm:right-6 z-50 animate-fade-up">
          <div className="liquid-glass rounded-2xl bg-neutral-950/95 border border-white/20 p-3 sm:p-4 shadow-2xl backdrop-blur-xl flex items-center gap-3 max-w-sm">
            <div className="shrink-0 p-2 rounded-xl bg-white/10">
              {toastMessage.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-rose-400" />
              ) : toastMessage.type === 'level' ? (
                <Trophy className="w-5 h-5 text-amber-400 animate-bounce" />
              ) : toastMessage.type === 'xp' ? (
                <Sparkles className="w-5 h-5 text-cyan-400 animate-spin" />
              ) : toastMessage.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <Info className="w-5 h-5 text-blue-400" />
              )}
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">{toastMessage.title}</h4>
              {toastMessage.subtitle && (
                <p className="text-[11px] text-neutral-300 mt-0.5 leading-snug">
                  {toastMessage.subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Super Admin XP & Level Management Sandbox */}
      {currentUser?.email === 'anhtuantran0512@gmail.com' && (
        <XPSandboxDock
          level={currentUser.level}
          xp={currentUser.xp}
          onAddXP={addXP}
        />
      )}

      {/* Lối vào hộp thư tố cáo — chỉ hiện với Super Admin */}
      {currentUser?.email === 'anhtuantran0512@gmail.com' && !isReportInboxOpen && (
        <button
          type="button"
          onClick={() => setIsReportInboxOpen(true)}
          aria-label={`Hộp thư tố cáo${pendingReportCount > 0 ? ` — ${pendingReportCount} báo cáo chờ xử lý` : ''}`}
          className="fixed bottom-4 left-24 z-40 flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-2xl liquid-glass bg-[#0c1218]/95 border border-rose-400/25 text-neutral-200 hover:border-rose-400/50 hover:text-white transition-colors shadow-[0_18px_45px_rgba(0,0,0,0.7)]"
        >
          <ShieldAlert className="w-4 h-4 text-rose-300" />
          <span className="text-[11px] font-medium">Tố cáo</span>
          {pendingReportCount > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500/90 text-white text-[10px] font-bold flex items-center justify-center">
              {pendingReportCount > 99 ? '99+' : pendingReportCount}
            </span>
          )}
        </button>
      )}

      <Suspense fallback={<ViewLoadingFallback />}>
        {isReportInboxOpen && (
          <ReportInboxModal
            isOpen={isReportInboxOpen}
            onClose={() => setIsReportInboxOpen(false)}
            onPendingCountChange={setPendingReportCount}
          />
        )}
      </Suspense>

      {/* CodeFronts .la-08 Healthcare Appointment & Resource Loading Animation */}
      {isResourceLoading && (
        <PageResourceLoader onLoaded={() => setIsResourceLoading(false)} />
      )}

      </div>
    </AuthProvider>
  );
};

export default App;
