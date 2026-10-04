/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  X,
  ChevronDown,
  Bell,
  Home,
  Users,
  HelpCircle,
  Compass,
  Sparkles,
  Settings,
  Rocket,
  Flame,
  Film,
  Trophy,
  NotebookPen,
  Command,
  Timer,
} from 'lucide-react';
import type { DimensionView, User } from '../types';
import { TierBadge, AdminVerifiedBadge } from './Badges10Tier';
import { toggleAmbientAudio, isAmbientActive, playChime } from '../utils/audio';
import { ProfileDropdown } from './ProfileDropdown';
import { DEFAULT_AVATAR, handleImageError } from '../utils/mediaFallback';
import { NotificationsModal } from './NotificationsModal';
import { SettingsModal } from './SettingsModal';
import { safeStorage } from '../utils/storage';
import { DailyEngagementModal } from './DailyEngagementModal';

export interface NavbarProps {
  currentView: DimensionView;
  onViewChange: (view: DimensionView) => void;
  currentUser: User | null;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
  unreadChatCount: number;
  onOpenProfile: (tab?: 'overview' | 'card' | 'stats' | 'shop' | 'activity' | 'edit') => void;
  onOpenFocusMode: () => void;
  isInsideCinema?: boolean;
  onRewardCoins?: (amount: number, reason: string) => void;
  onUpdateStreak?: (streak: number) => void;
  eyeRestEnabled?: boolean;
  onToggleEyeRest?: () => void;
}

const NAV_ICONS: Record<DimensionView, React.ReactNode> = {
  landing: <Sparkles size={16} className="text-amber-300" />,
  home: <Home size={16} className="text-amber-400" />,
  clubs: <Users size={16} className="text-emerald-400" />,
  qa: <HelpCircle size={16} className="text-cyan-400" />,
  chat: <MessageSquare size={16} className="text-orange-400" />,
  memory: (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 ff-nav-tab-icon text-pink-300">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M3 15l5-5c.9-.9 2.3-.9 3.2 0l6.8 6.8" />
      <path d="M14 14.5l1.5-1.5c.8-.8 2.2-.8 3 0L21 15.5" />
      <circle cx="8" cy="8" r="1.5" />
    </svg>
  ),
  chronicles: (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 ff-nav-tab-icon text-amber-300">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H8v4h8v-4h-1c-.55 0-1-.45-1-1v-2.34" />
      <path d="M6 4h12a1 1 0 0 1 1 1v4c0 3.87-3.13 7-7 7s-7-3.13-7-7V5a1 1 0 0 1 1-1z" />
    </svg>
  ),
  'coming-soon': <Rocket size={16} className="text-yellow-400" />,
};

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  currentUser,
  onOpenLoginModal,
  onLogout,
  onToggleChat,
  unreadChatCount,
  onOpenProfile,
  onOpenFocusMode,
  isInsideCinema = false,
  onRewardCoins,
  onUpdateStreak,
  eyeRestEnabled = false,
  onToggleEyeRest,
}) => {
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (safeStorage.getItem('fforum_theme') as 'dark' | 'light') || 'dark';
  });
  const [soundEffects, setSoundEffects] = useState(() => {
    return safeStorage.getItem('fforum_sfx') !== 'false';
  });
  const [reducedMotion, setReducedMotion] = useState(() => {
    return safeStorage.getItem('fforum_reduced_motion') === 'true';
  });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const settingsTriggerRef = useRef<HTMLDivElement>(null);
  const notifTriggerRef = useRef<HTMLDivElement>(null);
  const userTriggerRef = useRef<HTMLDivElement>(null);
  const mobileUserMenuRef = useRef<HTMLDivElement>(null);
  const mobileNotifMenuRef = useRef<HTMLDivElement>(null);
  const mobileSettingsMenuRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number; top: number; height: number; opacity: number }>({
    left: 0,
    width: 0,
    top: 0,
    height: 0,
    opacity: 0,
  });
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [godrayPreset, setGodrayPreset] = useState(() => {
    return safeStorage.getItem('fforum_godray_preset') || 'godray-gold';
  });
  const [godrayIntensity, setGodrayIntensity] = useState(() => {
    const val = safeStorage.getItem('fforum_godray_intensity');
    return val ? parseInt(val, 10) : 70;
  });
  const [glassBlur, setGlassBlur] = useState(() => {
    const val = safeStorage.getItem('fforum_glass_blur');
    return val ? parseInt(val, 10) : 14;
  });
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>(() => {
    return (safeStorage.getItem('fforum_font_size') as 'sm' | 'md' | 'lg') || 'md';
  });
  const [navbarAutoHide, setNavbarAutoHide] = useState<boolean>(() => {
    return safeStorage.getItem('fforum_navbar_autohide') === 'true';
  });
  const [navbarPosition, setNavbarPosition] = useState<'top' | 'bottom' | 'left' | 'right'>(() => {
    return (safeStorage.getItem('fforum_navbar_pos') as 'top' | 'bottom' | 'left' | 'right') || 'top';
  });
  const [alwaysCompact, setAlwaysCompact] = useState<boolean>(() => {
    return safeStorage.getItem('fforum_nav_compact') === 'true';
  });
  const [isNavbarHovered, setIsNavbarHovered] = useState<boolean>(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ============================================================ */
  /* iOS-26 compact capsule state machine                          */
  /* ============================================================ */
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    return safeStorage.getItem('fforum_nav_compact') === 'true';
  });
  const compactTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollYRef = useRef<number>(0);
  const anyPopoverOpen = isFlyoutOpen || isNotificationsOpen || isSettingsOpen || isDailyModalOpen || isMobileMenuOpen;
  const anyPopoverOpenRef = useRef(anyPopoverOpen);
  anyPopoverOpenRef.current = anyPopoverOpen;

  const forceExpand = useCallback(() => {
    if (compactTimerRef.current) {
      clearTimeout(compactTimerRef.current);
      compactTimerRef.current = null;
    }
    if (!alwaysCompact) {
      setIsCompact(false);
    }
  }, [alwaysCompact]);

  const scheduleCompact = useCallback((delay = 500) => {
    if (alwaysCompact) {
      setIsCompact(true);
      return;
    }
    if (compactTimerRef.current) clearTimeout(compactTimerRef.current);
    compactTimerRef.current = setTimeout(() => {
      if (!anyPopoverOpenRef.current) setIsCompact(true);
    }, delay);
  }, [alwaysCompact]);

  /* Scroll direction drives compact/expand (like the iOS 26 tab bar) */
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const last = lastScrollYRef.current;
      lastScrollYRef.current = y;
      if (anyPopoverOpenRef.current) return;
      if (alwaysCompact) {
        setIsCompact(true);
        return;
      }

      if (y > last + 10 && y > 50) {
        setIsCompact(true);
      } else if (y < last - 10) {
        forceExpand();
      }

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        if (!anyPopoverOpenRef.current && !alwaysCompact) forceExpand();
      }, 900);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [alwaysCompact, forceExpand]);

  /* Sync compact state when user toggles "Chỉ hiện icon" */
  useEffect(() => {
    setIsCompact(alwaysCompact);
  }, [alwaysCompact]);

  /* Khi đổi vị trí dock (trên/dưới/trái/phải): chạy hoạt ảnh morph để việc
     chuyển giữa GUI lớn ↔ GUI nhỏ không còn bị "giật" hình. */
  const [isMorphing, setIsMorphing] = useState(false);
  useEffect(() => {
    setIsMorphing(true);
    const t = window.setTimeout(() => setIsMorphing(false), 480);
    return () => window.clearTimeout(t);
  }, [navbarPosition]);

  const handleNavPointerEnter = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setIsNavbarHovered(true);
    if (!alwaysCompact) {
      forceExpand();
    }
  };

  const handleNavPointerLeave = () => {
    /* 0.5s grace: the capsule folds into icon-only mode */
    if (!alwaysCompact && !anyPopoverOpenRef.current) {
      scheduleCompact(500);
    }
    if (!navbarAutoHide) return;
    if (anyPopoverOpenRef.current) return;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!anyPopoverOpenRef.current) {
        setIsNavbarHovered(false);
      }
    }, 900);
  };

  useEffect(() => {
    if (!navbarAutoHide) {
      setIsNavbarHovered(true);
      return;
    }
    const TRIGGER_DISTANCE = 96;
    const handleMouseMove = (e: MouseEvent) => {
      if (anyPopoverOpenRef.current) {
        setIsNavbarHovered(true);
        return;
      }
      const { clientX, clientY } = e;
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      let isNearEdge = false;
      if (navbarPosition === 'bottom') {
        isNearEdge = clientY >= winH - TRIGGER_DISTANCE;
      } else if (navbarPosition === 'left') {
        isNearEdge = clientX <= TRIGGER_DISTANCE;
      } else if (navbarPosition === 'right') {
        isNearEdge = clientX >= winW - TRIGGER_DISTANCE;
      } else {
        isNearEdge = clientY <= TRIGGER_DISTANCE;
      }

      if (isNearEdge) {
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        setIsNavbarHovered(true);
        if (!alwaysCompact) forceExpand();
      } else {
        if (!hideTimerRef.current) {
          hideTimerRef.current = setTimeout(() => {
            if (!anyPopoverOpenRef.current) setIsNavbarHovered(false);
            hideTimerRef.current = null;
          }, 900);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [navbarAutoHide, navbarPosition, alwaysCompact, forceExpand]);

  const isVertical = navbarPosition === 'left' || navbarPosition === 'right';
  const effectiveCompact = isCompact || alwaysCompact;

  /* ============================================================ */
  /* Robust active pill measurement (offset-based + rAF tracker)   */
  /* ============================================================ */
  useEffect(() => {
    let rafId: number | null = null;
    const startMs = performance.now();

    const updatePill = () => {
      const container = tabsContainerRef.current;
      const activeEl = tabRefs.current[currentView];
      if (!container || !activeEl) {
        setPillStyle((prev) => ({ ...prev, opacity: 0 }));
        return;
      }

      /* Use offsetLeft / offsetWidth which are strictly relative to tabsContainerRef
         and unaffected by parent CSS transforms or scale animations */
      const maxScrollW = Math.max(container.scrollWidth, container.clientWidth);
      const maxScrollH = Math.max(container.scrollHeight, container.clientHeight);
      const rawLeft = activeEl.offsetLeft;
      const rawWidth = activeEl.offsetWidth;
      const rawTop = activeEl.offsetTop;
      const rawHeight = activeEl.offsetHeight;

      const left = Math.max(0, Math.min(rawLeft, Math.max(0, maxScrollW - rawWidth)));
      const width = Math.max(0, Math.min(rawWidth, maxScrollW - left));
      const top = Math.max(0, Math.min(rawTop, Math.max(0, maxScrollH - rawHeight)));
      const height = Math.max(0, Math.min(rawHeight, maxScrollH - top));

      setPillStyle((prev) => {
        if (
          Math.abs(prev.left - left) < 0.5 &&
          Math.abs(prev.width - width) < 0.5 &&
          Math.abs(prev.top - top) < 0.5 &&
          Math.abs(prev.height - height) < 0.5 &&
          prev.opacity === 1
        ) {
          return prev;
        }
        return { left, width, top, height, opacity: width > 0 ? 1 : 0 };
      });
    };

    const tick = () => {
      updatePill();
      if (performance.now() - startMs < 550) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    window.addEventListener('resize', updatePill);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && tabsContainerRef.current) {
      ro = new ResizeObserver(updatePill);
      ro.observe(tabsContainerRef.current);
      Object.values(tabRefs.current).forEach((el) => el && ro!.observe(el));
    }
    const containerEl = tabsContainerRef.current;
    containerEl?.addEventListener('scroll', updatePill, { passive: true });
    containerEl?.addEventListener('transitionend', updatePill);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updatePill);
      ro?.disconnect();
      containerEl?.removeEventListener('scroll', updatePill);
      containerEl?.removeEventListener('transitionend', updatePill);
    };
  }, [currentView, isVertical, effectiveCompact, navbarPosition]);

  /* Keep the active tab visible inside the scrollable strip */
  useEffect(() => {
    const activeEl = tabRefs.current[currentView];
    if (activeEl && !isVertical) {
      try {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
      } catch {
        /* ignore */
      }
    }
  }, [currentView, isVertical]);

  useEffect(() => {
    const handleOpenDaily = () => setIsDailyModalOpen(true);
    const handleOpenSettings = () => {
      setIsSettingsOpen((prev) => !prev);
      setIsNotificationsOpen(false);
      setIsFlyoutOpen(false);
    };
    window.addEventListener('fforum_open_daily', handleOpenDaily);
    window.addEventListener('fforum_open_settings', handleOpenSettings);
    return () => {
      window.removeEventListener('fforum_open_daily', handleOpenDaily);
      window.removeEventListener('fforum_open_settings', handleOpenSettings);
    };
  }, []);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }

    if (reducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, [theme, reducedMotion]);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    safeStorage.setItem('fforum_theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  };

  /* Cho phép Bảng lệnh (⌘K) và các phím tắt đổi theme từ bên ngoài Navbar */
  useEffect(() => {
    const onToggleTheme = () => handleToggleTheme();
    const onOpenDaily = () => setIsDailyModalOpen(true);
    window.addEventListener('fforum_toggle_theme', onToggleTheme);
    window.addEventListener('fforum_open_daily', onOpenDaily);
    return () => {
      window.removeEventListener('fforum_toggle_theme', onToggleTheme);
      window.removeEventListener('fforum_open_daily', onOpenDaily);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  const handleToggleSoundEffects = () => {
    setSoundEffects((prev) => {
      const next = !prev;
      safeStorage.setItem('fforum_sfx', String(next));
      return next;
    });
  };

  const handleToggleReducedMotion = () => {
    setReducedMotion((prev) => {
      const next = !prev;
      safeStorage.setItem('fforum_reduced_motion', String(next));
      if (next) {
        document.documentElement.classList.add('reduce-motion');
      } else {
        document.documentElement.classList.remove('reduce-motion');
      }
      return next;
    });
  };

  const isSuperAdmin = currentUser?.email === 'anhtuantran0512@gmail.com';

  useEffect(() => {
    if (!isFlyoutOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const insideDesktop = userMenuRef.current && userMenuRef.current.contains(target);
      const insideTrigger = userTriggerRef.current && userTriggerRef.current.contains(target);
      const insideMobile = mobileUserMenuRef.current && mobileUserMenuRef.current.contains(target);
      if (!insideDesktop && !insideMobile && !insideTrigger) {
        setIsFlyoutOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFlyoutOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFlyoutOpen]);

  useEffect(() => {
    if (!isNotificationsOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const insideDesktop = notifMenuRef.current && notifMenuRef.current.contains(target);
      const insideTrigger = notifTriggerRef.current && notifTriggerRef.current.contains(target);
      const insideMobile = mobileNotifMenuRef.current && mobileNotifMenuRef.current.contains(target);
      if (!insideDesktop && !insideMobile && !insideTrigger) {
        setIsNotificationsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isNotificationsOpen]);

  useEffect(() => {
    if (!isSettingsOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const insideDesktop = settingsMenuRef.current && settingsMenuRef.current.contains(target);
      const insideTrigger = settingsTriggerRef.current && settingsTriggerRef.current.contains(target);
      const insideMobile = mobileSettingsMenuRef.current && mobileSettingsMenuRef.current.contains(target);
      if (!insideDesktop && !insideMobile && !insideTrigger) {
        setIsSettingsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSettingsOpen]);

  const toggleFocusAudio = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      if (!audioCtxRef.current && typeof window !== 'undefined') {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
    } catch {
      /* ignore */
    }
    const active = toggleAmbientAudio(audioCtxRef.current);
    setIsAudioPlaying(active || isAmbientActive());
  };

  const navItems: { id: DimensionView; label: string }[] = [
    { id: 'landing', label: 'GIỚI THIỆU' },
    { id: 'home', label: 'TRANG CHỦ' },
    { id: 'clubs', label: 'CÂU LẠC BỘ' },
    { id: 'qa', label: 'HỎI ĐÁP' },
    { id: 'chat', label: 'PHÒNG CHAT' },
    { id: 'memory', label: 'MIỀN KÝ ỨC' },
    { id: 'chronicles', label: 'KHU VINH DANH' },
    { id: 'coming-soon', label: 'UPDATE' },
  ];

  const sharedSettingsProps = {
    isOpen: isSettingsOpen,
    onClose: () => setIsSettingsOpen(false),
    theme,
    onToggleTheme: handleToggleTheme,
    isAudioPlaying,
    onToggleAudio: toggleFocusAudio,
    onOpenFocusMode: () => {
      setIsSettingsOpen(false);
      onOpenFocusMode();
    },
    soundEffects,
    onToggleSoundEffects: handleToggleSoundEffects,
    reducedMotion,
    onToggleReducedMotion: handleToggleReducedMotion,
    godrayPreset,
    onSelectGodray: (preset: string) => {
      setGodrayPreset(preset);
      safeStorage.setItem('fforum_godray_preset', preset);
      window.dispatchEvent(new CustomEvent('fforum_theme_sync'));
    },
    godrayIntensity,
    onChangeGodrayIntensity: (val: number) => {
      setGodrayIntensity(val);
      safeStorage.setItem('fforum_godray_intensity', String(val));
      window.dispatchEvent(new CustomEvent('fforum_theme_sync'));
    },
    glassBlur,
    onChangeGlassBlur: (val: number) => {
      setGlassBlur(val);
      safeStorage.setItem('fforum_glass_blur', String(val));
      document.documentElement.style.setProperty('--glass-blur', `${val}px`);
    },
    fontSize,
    onChangeFontSize: (sz: 'sm' | 'md' | 'lg') => {
      setFontSize(sz);
      safeStorage.setItem('fforum_font_size', sz);
      document.documentElement.classList.remove('text-size-sm', 'text-size-md', 'text-size-lg');
      document.documentElement.classList.add(`text-size-${sz}`);
    },
    navbarAutoHide,
    onToggleNavbarAutoHide: () => {
      setNavbarAutoHide((prev) => {
        const next = !prev;
        safeStorage.setItem('fforum_navbar_autohide', String(next));
        if (!next) setIsNavbarHovered(true);
        return next;
      });
    },
    navbarPosition,
    onSwapNavbarPosition: () => {
      const list: ('top' | 'bottom' | 'left' | 'right')[] = ['top', 'bottom', 'left', 'right'];
      const next = list[(list.indexOf(navbarPosition) + 1) % list.length];
      setNavbarPosition(next);
      safeStorage.setItem('fforum_navbar_pos', next);
      window.dispatchEvent(new CustomEvent('fforum_navbar_pos_change', { detail: next }));
      if (soundEffects) playChime('success');
    },
    onSelectNavbarPosition: (pos: 'top' | 'bottom' | 'left' | 'right') => {
      setNavbarPosition(pos);
      safeStorage.setItem('fforum_navbar_pos', pos);
      window.dispatchEvent(new CustomEvent('fforum_navbar_pos_change', { detail: pos }));
      if (soundEffects) playChime('success');
    },
    alwaysCompact,
    onToggleAlwaysCompact: () => {
      setAlwaysCompact((prev) => {
        const next = !prev;
        safeStorage.setItem('fforum_nav_compact', String(next));
        setIsCompact(next);
        return next;
      });
    },
    dockPosition: navbarPosition,
    eyeRestEnabled,
    onToggleEyeRest,
  };

  const isDockHidden = isInsideCinema || (navbarAutoHide && !isNavbarHovered && !anyPopoverOpen);

  return (
    <>
      {/* Auto-Hide Hover Trigger Zone (Synchronized across all 4 edges) */}
      {navbarAutoHide && (
        <div
          className={`hidden md:block fixed z-[51] pointer-events-auto opacity-0 transition-all ${
            navbarPosition === 'bottom'
              ? 'bottom-0 inset-x-0 h-[88px]'
              : navbarPosition === 'left'
              ? 'left-0 inset-y-0 w-[88px]'
              : navbarPosition === 'right'
              ? 'right-0 inset-y-0 w-[88px]'
              : 'top-0 inset-x-0 h-[88px]'
          }`}
          onMouseEnter={handleNavPointerEnter}
        />
      )}

      {/* ======================================================== */}
      {/* 1. DESKTOP FLOATING GLASS CAPSULE (Viewports >= 768px)   */}
      {/* ======================================================== */}
      <div
        onMouseEnter={handleNavPointerEnter}
        onMouseLeave={handleNavPointerLeave}
        className={`hidden md:block fixed inset-0 z-50 pointer-events-none transition-all duration-500 dock-container dock-pos-${navbarPosition} ${
          isMorphing ? 'ff-nav-morphing' : ''
        }`}
        style={{
          transform: isDockHidden
            ? navbarPosition === 'bottom'
              ? 'translateY(120px)'
              : navbarPosition === 'left'
              ? 'translateX(-120px)'
              : navbarPosition === 'right'
              ? 'translateX(120px)'
              : 'translateY(-120px)'
            : undefined,
          opacity: isDockHidden ? 0 : 1,
        }}
      >
        <nav
          data-compact={effectiveCompact && !isVertical ? 'true' : 'false'}
          onPointerEnter={forceExpand}
          onFocusCapture={forceExpand}
          className="ff-nav-capsule fixed top-5 inset-x-0 mx-auto z-50 w-[94%] max-w-[1180px] h-14 liquid-glass rounded-full px-4 flex items-center justify-between gap-1 shadow-2xl"
          aria-label="Điều hướng chính"
        >
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => {
              onViewChange('home');
              setIsMobileMenuOpen(false);
            }}
            className="group text-left focus:outline-none cursor-pointer flex-shrink-0 pointer-events-auto"
            title="F-Forum - Trở về Trang chủ"
            aria-label="Trang chủ F-Forum"
          >
            <div className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap select-none">
              <div className="w-8 h-8 rounded-full ff-gradient-ring flex-shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                <div className="w-full h-full bg-[#0a0f14] rounded-full flex items-center justify-center text-amber-400 font-bold text-sm">
                  F
                </div>
              </div>
              <span className="ff-nav-brand-text nav-brand-text font-['Playfair_Display'] italic font-bold text-xl tracking-wide ff-aurora-text flex-shrink-0 drop-shadow-[0_2px_12px_rgba(245,158,11,0.3)]">
                F-Forum
              </span>
            </div>
          </button>

          {/* Center Tabs: text-only when expanded, icon-only when compact or vertical */}
          <div ref={tabsContainerRef} className="relative flex items-center gap-1 overflow-x-auto no-scrollbar py-1 nav-center-tabs">
            {!isVertical && pillStyle.opacity > 0 && (
              <>
                {/* Liquid sliding pill indicator */}
                <div
                  className="absolute top-1 bottom-1 nav-liquid-pill pointer-events-none hidden lg:block"
                  style={{
                    left: `${pillStyle.left}px`,
                    width: `${pillStyle.width}px`,
                    opacity: pillStyle.opacity,
                  }}
                />

                {/* Organic liquid droplet bead */}
                <div
                  className={`absolute ${navbarPosition === 'bottom' ? 'top-0' : 'bottom-0'} nav-liquid-drop pointer-events-none hidden lg:block`}
                  style={{
                    left: `${Math.max(4, pillStyle.left + pillStyle.width / 2 - 8)}px`,
                    width: '16px',
                    height: '4px',
                    opacity: pillStyle.opacity,
                  }}
                />
              </>
            )}

            {/* Vertical organic liquid droplet bead */}
            {isVertical && pillStyle.opacity > 0 && (
              <div
                className={`absolute ${navbarPosition === 'left' ? 'left-0.5' : 'right-0.5'} nav-liquid-drop-vertical pointer-events-none`}
                style={{
                  top: `${Math.max(4, pillStyle.top + (pillStyle.height ? pillStyle.height / 2 - 9 : 10))}px`,
                  width: '4px',
                  height: '18px',
                  opacity: pillStyle.opacity,
                }}
              />
            )}

            {navItems.map((item) => {
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    tabRefs.current[item.id] = el;
                  }}
                  onClick={() => onViewChange(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`nav-tab-btn px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider whitespace-nowrap flex-shrink-0 select-none transition-all cursor-pointer flex items-center justify-center z-10 group/tab relative ${
                    isActive
                      ? 'bg-amber-500/20 lg:bg-amber-500/15 text-amber-300 border border-amber-500/35 shadow-[0_0_14px_rgba(245,158,11,0.22)]'
                      : 'text-white/75 hover:text-white hover:bg-white/10 border border-transparent'
                  }`}
                >
                  {/* Icon: shown ONLY in compact mode or vertical dock */}
                  <span className="dock-nav-icon ff-nav-tab-icon-wrap flex items-center justify-center ff-nav-tab-icon">
                    {NAV_ICONS[item.id]}
                  </span>

                  {/* Label: shown ONLY in expanded horizontal mode */}
                  <span className="ff-nav-label nav-tab-label whitespace-nowrap select-none">
                    {item.label}
                  </span>

                  {/* Hover Tooltip in Vertical or Compact Mode */}
                  <span
                    className={`pointer-events-none opacity-0 group-hover/tab:opacity-100 transition-all duration-200 fixed ${
                      navbarPosition === 'left'
                        ? 'left-24'
                        : navbarPosition === 'right'
                        ? 'right-24'
                        : navbarPosition === 'bottom'
                        ? 'bottom-20'
                        : 'top-20'
                    } px-2.5 py-1 rounded-xl bg-[#0a0f14]/95 backdrop-blur-xl border border-white/20 text-[11px] font-bold text-amber-300 shadow-[0_10px_25px_rgba(0,0,0,0.8)] z-50 whitespace-nowrap hidden dock-vertical-tooltip`}
                  >
                    {item.label}
                  </span>

                  {item.id === 'chat' && unreadChatCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0 ml-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Side: Quick Dock */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 nav-actions-dock">
            {/* Settings Trigger */}
            <div ref={settingsTriggerRef} className="relative inline-flex items-center justify-center flex-shrink-0">
              <button
                type="button"
                data-settings-trigger="true"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSettingsOpen((prev) => !prev);
                  setIsNotificationsOpen(false);
                  setIsFlyoutOpen(false);
                }}
                className={`relative w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:border-amber-400/30 text-white/70 hover:text-white cursor-pointer pointer-events-auto flex items-center justify-center transition-all duration-300 focus:outline-none ${
                  isSettingsOpen
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.4)]'
                    : 'hover:bg-white/10'
                }`}
                title="Cài đặt"
                aria-label="Cài đặt hệ thống"
              >
                <Settings
                  className={`w-4 h-4 transition-transform duration-500 ${
                    isSettingsOpen ? 'rotate-90 text-amber-300' : 'group-hover:rotate-45'
                  }`}
                />
              </button>
            </div>

            {/* Chat Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleChat();
              }}
              className="relative w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/30 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer pointer-events-auto"
              title="Mở phòng chat"
              aria-label="Mở phòng chat"
            >
              <MessageSquare className="w-4 h-4 text-amber-400" />
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-amber-600 text-[10px] font-bold text-black rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-black animate-pulse">
                  {unreadChatCount}
                </span>
              )}
            </button>

            {/* Notification Bell Trigger */}
            <div ref={notifTriggerRef} className="relative inline-flex items-center justify-center flex-shrink-0">
              <button
                type="button"
                data-notif-trigger="true"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsNotificationsOpen((prev) => !prev);
                  setIsFlyoutOpen(false);
                  setIsSettingsOpen(false);
                }}
                className="relative w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors pointer-events-auto cursor-pointer"
                aria-label="Thông báo"
                title="Thông báo"
              >
                <Bell size={18} className={isNotificationsOpen ? 'text-amber-300' : 'text-amber-400'} />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black ring-2 ring-[#0a0f14]">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>
            </div>

            {/* Auth Capsule or Login Button */}
            {!currentUser ? (
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="nav-login-btn bg-white text-neutral-900 px-3.5 py-1.5 rounded-full text-xs font-semibold hover:bg-neutral-200 transition-colors shadow-md cursor-pointer whitespace-nowrap flex-shrink-0 pointer-events-auto"
              >
                Đăng nhập
              </button>
            ) : (
              <div ref={userTriggerRef} className="relative inline-flex items-center justify-center flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlyoutOpen((prev) => !prev);
                    setIsNotificationsOpen(false);
                    setIsSettingsOpen(false);
                  }}
                  className={`nav-profile-trigger cursor-pointer pointer-events-auto flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full transition-all duration-200 group focus:outline-none flex-shrink-0 ${
                    isFlyoutOpen
                      ? 'bg-amber-500/15 border border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/30'
                  }`}
                  title="Tài khoản"
                  aria-label="Tài khoản cá nhân"
                >
                  {/* Avatar with status ring */}
                  <div className="relative shrink-0">
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                      loading="lazy"
                      decoding="async"
                      width={28}
                      height={28}
                      className="w-7 h-7 rounded-full object-cover ring-2 ring-amber-400/60 shadow-sm"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#0a0f14] shadow-[0_0_6px_#34d399]" />
                  </div>

                  {/* Roman Rank icon (hidden when vertical or compact to prevent overflow) */}
                  <div className="shrink-0 flex items-center justify-center nav-user-extra">
                    <TierBadge level={currentUser.level} size={17} showTooltip={false} />
                  </div>

                  {/* Name & Verified Tick */}
                  <div className="hidden sm:flex items-center gap-1.5 leading-none nav-user-text">
                    <span
                      className={`text-xs font-medium ${
                        isSuperAdmin ? 'discord-admin-name' : 'text-white'
                      }`}
                    >
                      {currentUser.name.replace(/ \(.*\)/, '')}
                    </span>
                    {isSuperAdmin && (
                      <AdminVerifiedBadge size={13} tooltipPosition="bottom" />
                    )}
                  </div>

                  <ChevronDown
                    className={`w-3 h-3 text-neutral-400 group-hover:text-amber-400 transition-transform duration-200 nav-user-extra ${
                      isFlyoutOpen ? 'rotate-180 text-amber-400' : ''
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* ======================================================== */}
      {/* DESKTOP POPOVERS (Rendered outside transformed nav!)     */}
      {/* ======================================================== */}
      <div className="hidden md:block">
        <div ref={settingsMenuRef}>
          <SettingsModal {...sharedSettingsProps} anchorRef={settingsTriggerRef} />
        </div>

        <div ref={notifMenuRef}>
          <NotificationsModal
            isOpen={isNotificationsOpen}
            onClose={() => setIsNotificationsOpen(false)}
            onNavigate={(view) => {
              setIsNotificationsOpen(false);
              onViewChange(view);
            }}
            onUnreadCountChange={setUnreadNotifCount}
            dockPosition={navbarPosition}
            anchorRef={notifTriggerRef}
          />
        </div>

        {currentUser && (
          <div ref={userMenuRef}>
            <ProfileDropdown
              currentUser={currentUser}
              isOpen={isFlyoutOpen}
              onClose={() => setIsFlyoutOpen(false)}
              onOpenProfile={onOpenProfile}
              onLogout={onLogout}
              dockPosition={navbarPosition}
              anchorRef={userTriggerRef}
            />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. MOBILE TOP HEADER BAR (Viewports < 768px)             */}
      {/* ======================================================== */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 h-[calc(54px+var(--safe-top))] pt-[var(--safe-top)] liquid-glass border-b border-white/10 px-4 flex items-center justify-between pointer-events-auto select-none">
        {/* Left: Brand Logo */}
        <button
          type="button"
          onClick={() => {
            onViewChange('home');
            setIsMobileMenuOpen(false);
          }}
          className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap select-none cursor-pointer focus:outline-none"
          aria-label="Trang chủ F-Forum"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-200 p-[1px] flex-shrink-0">
            <div className="w-full h-full bg-[#0a0f14] rounded-full flex items-center justify-center text-amber-400 font-bold text-xs">
              F
            </div>
          </div>
          <span className="font-['Playfair_Display'] italic font-bold text-lg tracking-wide bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent whitespace-nowrap">
            F-Forum
          </span>
        </button>

        {/* Right: Settings button + Notification Bell button + User Avatar pill */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Settings Button (Mobile) */}
          <div ref={mobileSettingsMenuRef} className="relative inline-flex items-center flex-shrink-0">
            <button
              type="button"
              data-settings-trigger="true"
              onClick={(e) => {
                e.stopPropagation();
                setIsSettingsOpen((prev) => !prev);
                setIsNotificationsOpen(false);
                setIsFlyoutOpen(false);
              }}
              className={`relative p-2 rounded-full transition-colors focus:outline-none pointer-events-auto cursor-pointer ${
                isSettingsOpen ? 'bg-amber-500/20 text-amber-300' : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
              aria-label="Cài đặt hệ thống"
              title="Cài đặt"
            >
              <Settings size={18} className={isSettingsOpen ? 'text-amber-300 rotate-90 transition-transform' : 'text-amber-400'} />
            </button>

            {/* Mobile Settings Modal */}
            <div className="md:hidden">
              <SettingsModal {...sharedSettingsProps} />
            </div>
          </div>

          {/* Notification Bell Button */}
          <div ref={mobileNotifMenuRef} className="relative inline-flex items-center flex-shrink-0">
            <button
              type="button"
              data-notif-trigger="true"
              onClick={(e) => {
                e.stopPropagation();
                setIsNotificationsOpen((prev) => !prev);
                setIsFlyoutOpen(false);
                setIsSettingsOpen(false);
              }}
              className="relative p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors focus:outline-none pointer-events-auto cursor-pointer"
              aria-label="Thông báo"
            >
              <Bell size={18} className={isNotificationsOpen ? 'text-amber-300' : 'text-amber-400'} />
              {unreadNotifCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black ring-2 ring-[#0a0f14]">
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </span>
              )}
            </button>

            {/* Mobile anchored notification modal */}
            <div className="md:hidden">
              <NotificationsModal
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                onNavigate={(view) => {
                  setIsNotificationsOpen(false);
                  onViewChange(view);
                }}
                onUnreadCountChange={setUnreadNotifCount}
              />
            </div>
          </div>

          {/* User Avatar pill / Login */}
          {!currentUser ? (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="bg-white text-neutral-900 px-3 py-1 rounded-full text-xs font-semibold hover:bg-neutral-200 transition-colors shadow-md cursor-pointer whitespace-nowrap"
            >
              Đăng nhập
            </button>
          ) : (
            <div ref={mobileUserMenuRef} className="relative inline-flex items-center flex-shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlyoutOpen((prev) => !prev);
                  setIsNotificationsOpen(false);
                  setIsSettingsOpen(false);
                }}
                className="flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 rounded-full bg-white/5 border border-white/10 hover:border-amber-400/30 transition-all cursor-pointer pointer-events-auto"
                aria-label="Tài khoản cá nhân"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                  loading="lazy"
                  decoding="async"
                  width={24}
                  height={24}
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-amber-400/60"
                />
                <span className="text-xs font-medium text-white max-w-[70px] truncate whitespace-nowrap">
                  {currentUser.name.replace(/ \(.*\)/, '')}
                </span>
                <ChevronDown
                  className={`w-3 h-3 text-neutral-400 transition-transform ${
                    isFlyoutOpen ? 'rotate-180 text-amber-400' : ''
                  }`}
                />
              </button>

              <div className="md:hidden">
                <ProfileDropdown
                  currentUser={currentUser}
                  isOpen={isFlyoutOpen}
                  onClose={() => setIsFlyoutOpen(false)}
                  onOpenProfile={onOpenProfile}
                  onLogout={onLogout}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ======================================================== */}
      {/* 3. MOBILE BOTTOM NAVIGATION DOCK (Viewports < 768px)     */}
      {/* ======================================================== */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 h-[calc(56px+var(--safe-bottom))] pb-[var(--safe-bottom)] liquid-glass border-t border-white/10 px-2 flex items-center justify-around pointer-events-auto select-none">
        {/* Tab 1: Trang Chủ */}
        <button
          type="button"
          onClick={() => {
            onViewChange('home');
            setIsMobileMenuOpen(false);
            setIsNotificationsOpen(false);
            setIsFlyoutOpen(false);
          }}
          className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] px-2 py-1 rounded-xl transition-all cursor-pointer ${
            currentView === 'home' && !isMobileMenuOpen
              ? 'text-amber-400 font-semibold'
              : 'text-white/60 hover:text-white'
          }`}
          aria-label="Trang Chủ"
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight whitespace-nowrap">Trang Chủ</span>
        </button>

        {/* Tab 2: CLB */}
        <button
          type="button"
          onClick={() => {
            onViewChange('clubs');
            setIsMobileMenuOpen(false);
            setIsNotificationsOpen(false);
            setIsFlyoutOpen(false);
          }}
          className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] px-2 py-1 rounded-xl transition-all cursor-pointer ${
            currentView === 'clubs' && !isMobileMenuOpen
              ? 'text-amber-400 font-semibold'
              : 'text-white/60 hover:text-white'
          }`}
          aria-label="Câu Lạc Bộ"
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight whitespace-nowrap">CLB</span>
        </button>

        {/* Tab 3: Hỏi Đáp */}
        <button
          type="button"
          onClick={() => {
            onViewChange('qa');
            setIsMobileMenuOpen(false);
            setIsNotificationsOpen(false);
            setIsFlyoutOpen(false);
          }}
          className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] px-2 py-1 rounded-xl transition-all cursor-pointer ${
            currentView === 'qa' && !isMobileMenuOpen
              ? 'text-cyan-400 font-semibold'
              : 'text-white/60 hover:text-white'
          }`}
          aria-label="Hỏi Đáp"
        >
          <HelpCircle className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight whitespace-nowrap">Hỏi Đáp</span>
        </button>

        {/* Tab 4: Chat */}
        <button
          type="button"
          onClick={() => {
            onViewChange('chat');
            setIsMobileMenuOpen(false);
            setIsNotificationsOpen(false);
            setIsFlyoutOpen(false);
          }}
          className={`relative flex flex-col items-center justify-center min-w-[48px] min-h-[44px] px-2 py-1 rounded-xl transition-all cursor-pointer ${
            currentView === 'chat' && !isMobileMenuOpen
              ? 'text-orange-400 font-semibold'
              : 'text-white/60 hover:text-white'
          }`}
          aria-label="Phòng Chat"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 mb-0.5" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <span className="text-[10px] tracking-tight whitespace-nowrap">Chat</span>
        </button>

        {/* Tab 5: Menu / Khám Phá */}
        <button
          type="button"
          onClick={() => {
            setIsNotificationsOpen(false);
            setIsFlyoutOpen(false);
            setIsMobileMenuOpen((prev) => !prev);
          }}
          className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] px-2 py-1 rounded-xl transition-all cursor-pointer ${
            isMobileMenuOpen || currentView === 'landing' || currentView === 'memory' || currentView === 'chronicles' || currentView === 'coming-soon'
              ? 'text-amber-400 font-semibold'
              : 'text-white/60 hover:text-white'
          }`}
          aria-label="Khám Phá"
        >
          <Compass
            className={`w-5 h-5 mb-0.5 transition-transform duration-200 ${
              isMobileMenuOpen ? 'rotate-90 text-amber-400' : ''
            }`}
          />
          <span className="text-[10px] tracking-tight whitespace-nowrap">Khám Phá</span>
        </button>
      </nav>

      {/* ======================================================== */}
      {/* 4. MOBILE MENU / KHÁM PHÁ DRAWER                         */}
      {/* ======================================================== */}
      {isMobileMenuOpen && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Đóng menu khám phá"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden border-none outline-none cursor-default"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu khám phá"
            className="fixed bottom-[calc(56px+var(--safe-bottom)+8px)] inset-x-3 z-50 rounded-3xl bg-[#0c1218]/95 backdrop-blur-2xl border border-white/15 p-3.5 shadow-2xl animate-fade-up md:hidden pointer-events-auto"
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                Khám phá
              </span>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
                aria-label="Đóng menu khám phá"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lưới icon chủ đề — thay cho danh sách chữ dài dòng */}
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  onViewChange('landing');
                  setIsMobileMenuOpen(false);
                }}
                data-active={currentView === 'landing' ? 'true' : 'false'}
                className="ff-explore-tile p-2 flex flex-col items-center gap-1.5 cursor-pointer"
                aria-label="Giới thiệu F-Forum"
                title="Giới thiệu F-Forum"
              >
                <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-400/25 to-yellow-200/10 border border-amber-300/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </span>
                <span className="text-[9.5px] font-semibold text-white/85 leading-tight text-center">
                  Giới thiệu
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onViewChange('memory');
                  setIsMobileMenuOpen(false);
                }}
                data-active={currentView === 'memory' ? 'true' : 'false'}
                className="ff-explore-tile p-2 flex flex-col items-center gap-1.5 cursor-pointer"
                aria-label="Miền Ký Ức"
                title="Miền Ký Ức"
              >
                <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-pink-400/25 to-fuchsia-500/10 border border-pink-300/30 flex items-center justify-center">
                  <Film className="w-4 h-4 text-pink-300" />
                </span>
                <span className="text-[9.5px] font-semibold text-white/85 leading-tight text-center">
                  Ký ức
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onViewChange('chronicles');
                  setIsMobileMenuOpen(false);
                }}
                data-active={currentView === 'chronicles' ? 'true' : 'false'}
                className="ff-explore-tile p-2 flex flex-col items-center gap-1.5 cursor-pointer"
                aria-label="Khu Vinh Danh"
                title="Khu Vinh Danh"
              >
                <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-300/25 to-orange-500/10 border border-amber-300/30 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-amber-300" />
                </span>
                <span className="text-[9.5px] font-semibold text-white/85 leading-tight text-center">
                  Vinh danh
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onViewChange('coming-soon');
                  setIsMobileMenuOpen(false);
                }}
                data-active={currentView === 'coming-soon' ? 'true' : 'false'}
                className="ff-explore-tile p-2 flex flex-col items-center gap-1.5 cursor-pointer"
                aria-label="Bản nâng cấp"
                title="Bản nâng cấp"
              >
                <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-cyan-400/25 to-blue-500/10 border border-cyan-300/30 flex items-center justify-center">
                  <Rocket className="w-4 h-4 text-cyan-300" />
                </span>
                <span className="text-[9.5px] font-semibold text-white/85 leading-tight text-center">
                  Update
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDailyModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="ff-explore-tile relative p-2 flex flex-col items-center gap-1.5 cursor-pointer"
                aria-label="Điểm danh và kho quà"
                title="Điểm danh &amp; kho quà"
              >
                <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-rose-500/25 to-red-500/10 border border-rose-400/30 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-rose-300" />
                </span>
                <span className="text-[9.5px] font-semibold text-white/85 leading-tight text-center">
                  Điểm danh
                </span>
                {(currentUser?.streakCount ?? 0) > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-red-600 to-rose-500 text-[9px] font-bold text-white flex items-center justify-center border border-rose-200/40">
                    {currentUser?.streakCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('fforum_open_notes'));
                  setIsMobileMenuOpen(false);
                }}
                className="ff-explore-tile p-2 flex flex-col items-center gap-1.5 cursor-pointer"
                aria-label="Sổ tay nhanh"
                title="Sổ tay nhanh"
              >
                <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-sky-400/25 to-cyan-500/10 border border-sky-300/30 flex items-center justify-center">
                  <NotebookPen className="w-4 h-4 text-sky-300" />
                </span>
                <span className="text-[9.5px] font-semibold text-white/85 leading-tight text-center">
                  Sổ tay
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('fforum_open_palette'));
                  setIsMobileMenuOpen(false);
                }}
                className="ff-explore-tile p-2 flex flex-col items-center gap-1.5 cursor-pointer"
                aria-label="Bảng lệnh nhanh"
                title="Bảng lệnh nhanh"
              >
                <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-400/25 to-indigo-500/10 border border-violet-300/30 flex items-center justify-center">
                  <Command className="w-4 h-4 text-violet-300" />
                </span>
                <span className="text-[9.5px] font-semibold text-white/85 leading-tight text-center">
                  Bảng lệnh
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenFocusMode();
                  setIsMobileMenuOpen(false);
                }}
                className="ff-explore-tile p-2 flex flex-col items-center gap-1.5 cursor-pointer"
                aria-label="Không gian tập trung"
                title="Không gian tập trung"
              >
                <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-400/25 to-teal-500/10 border border-emerald-300/30 flex items-center justify-center">
                  <Timer className="w-4 h-4 text-emerald-300" />
                </span>
                <span className="text-[9.5px] font-semibold text-white/85 leading-tight text-center">
                  Tập trung
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Streak giờ nằm TRONG menu tia sét (RadialQuickMenu) — không còn ngọn lửa nổi bên ngoài */}
      <DailyEngagementModal
        isOpen={isDailyModalOpen}
        onClose={() => setIsDailyModalOpen(false)}
        currentUserCoin={currentUser?.coin ?? 0}
        onRewardCoin={(amount, reason) => {
          safeStorage.setItem('fforum_coin_reward', JSON.stringify({ amount, reason, date: Date.now() }));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fforum_coin_sync'));
          }
          onRewardCoins?.(amount, reason);
        }}
        onStreakChange={(streak) => onUpdateStreak?.(streak)}
      />
    </>
  );
};

export default Navbar;
