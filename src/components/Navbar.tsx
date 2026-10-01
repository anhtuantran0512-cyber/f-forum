import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  ChevronDown,
  Timer,
  Bell,
  Home,
  Users,
  HelpCircle,
  Compass,
  Sparkles,
  Award,
  Settings,
} from 'lucide-react';
import type { DimensionView, User } from '../types';
import { TierBadge, AdminVerifiedBadge } from './Badges10Tier';
import { toggleAmbientAudio, isAmbientActive } from '../utils/audio';
import { ProfileDropdown } from './ProfileDropdown';
import { DEFAULT_AVATAR, handleImageError } from '../utils/mediaFallback';
import { NotificationsModal } from './NotificationsModal';
import { SettingsModal } from './SettingsModal';
import { safeStorage } from '../utils/storage';

export interface NavbarProps {
  currentView: DimensionView;
  onViewChange: (view: DimensionView) => void;
  currentUser: User | null;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
  unreadChatCount: number;
  onOpenProfile: (tab?: 'card' | 'edit') => void;
  onOpenFocusMode: () => void;
  isInsideCinema?: boolean;
}

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
  const mobileUserMenuRef = useRef<HTMLDivElement>(null);
  const mobileNotifMenuRef = useRef<HTMLDivElement>(null);
  const mobileSettingsMenuRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  // Liquid navbar sliding pill indicator calculation
  useEffect(() => {
    const updatePill = () => {
      const activeEl = tabRefs.current[currentView];
      if (activeEl) {
        setPillStyle({
          left: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
          opacity: 1,
        });
      } else {
        setPillStyle((prev) => ({ ...prev, opacity: 0 }));
      }
    };

    updatePill();
    window.addEventListener('resize', updatePill);
    return () => window.removeEventListener('resize', updatePill);
  }, [currentView]);

  // Synchronize theme & motion classes on DOM
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

  // Soft sliding pill calculation
  useEffect(() => {
    const updatePill = () => {
      const activeEl = tabRefs.current[currentView];
      if (activeEl) {
        setPillStyle({
          left: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
          opacity: 1,
        });
      } else {
        setPillStyle(prev => ({ ...prev, opacity: 0 }));
      }
    };

    updatePill();
    window.addEventListener('resize', updatePill);
    return () => window.removeEventListener('resize', updatePill);
  }, [currentView]);

  useEffect(() => {
    if (!isFlyoutOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const insideDesktop = userMenuRef.current && userMenuRef.current.contains(target);
      const insideMobile = mobileUserMenuRef.current && mobileUserMenuRef.current.contains(target);
      if (!insideDesktop && !insideMobile) {
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
      const insideMobile = mobileNotifMenuRef.current && mobileNotifMenuRef.current.contains(target);
      if (!insideDesktop && !insideMobile) {
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
      const insideMobile = mobileSettingsMenuRef.current && mobileSettingsMenuRef.current.contains(target);
      if (!insideDesktop && !insideMobile) {
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
      // AudioContext resume catch
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

  return (
    <>
      {/* ======================================================== */}
      {/* 1. DESKTOP FLOATING PILL NAVBAR (Viewports >= 768px)      */}
      {/* ======================================================== */}
      <div
        className={`hidden md:block fixed top-0 inset-x-0 z-50 pointer-events-none transition-all duration-500 ${
          isInsideCinema ? 'opacity-0 -translate-y-12' : 'opacity-100 translate-y-0'
        }`}
      >
        <nav className="fixed top-5 inset-x-0 mx-auto z-50 w-[94%] max-w-[1180px] h-14 liquid-glass rounded-full px-5 flex items-center justify-between shadow-2xl">
          
          {/* Brand Logo: Strictly Single-line Unbreakable F-Forum */}
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
            <div className="flex items-center gap-2.5 flex-shrink-0 whitespace-nowrap select-none mr-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-200 p-[1px] flex-shrink-0">
                <div className="w-full h-full bg-[#0a0f14] rounded-full flex items-center justify-center text-amber-400 font-bold text-sm">
                  F
                </div>
              </div>
              <span className="font-['Playfair_Display'] italic font-bold text-xl tracking-wide bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent flex-shrink-0 whitespace-nowrap drop-shadow-[0_2px_12px_rgba(245,158,11,0.3)]">
                F-Forum
              </span>
            </div>
          </button>

          {/* Center Tabs: Strictly 1 Single Line, NO wrapping into 2 rows */}
          <div className="relative flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-1">
            {/* Liquid sliding pill indicator */}
            <div
              className="absolute top-1 bottom-1 rounded-full bg-gradient-to-r from-amber-500/25 via-amber-400/20 to-yellow-500/25 backdrop-blur-xl border border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none hidden lg:block"
              style={{
                left: `${pillStyle.left}px`,
                width: `${pillStyle.width}px`,
                opacity: pillStyle.opacity,
              }}
            />

            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    tabRefs.current[item.id] = el;
                  }}
                  onClick={() => onViewChange(item.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider whitespace-nowrap flex-shrink-0 select-none transition-all cursor-pointer flex items-center gap-1.5 z-10 ${
                    isActive
                      ? 'bg-amber-500/20 lg:bg-transparent text-amber-300 border border-amber-500/30 lg:border-transparent shadow-[0_0_15px_rgba(245,158,11,0.25)] lg:shadow-none'
                      : 'text-white/70 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span className="whitespace-nowrap flex-shrink-0 select-none">{item.label}</span>
                  {item.id === 'chat' && unreadChatCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Side: Quick Dock */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            {/* Sleek Settings button with iOS Liquid Glass flyout */}
            <div ref={settingsMenuRef} className="relative inline-flex items-center flex-shrink-0">
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
                title="Cài đặt & Giao diện (Settings)"
                aria-label="Cài đặt hệ thống"
              >
                <Settings
                  className={`w-4 h-4 transition-transform duration-500 ${
                    isSettingsOpen ? 'rotate-90 text-amber-300' : 'group-hover:rotate-45'
                  }`}
                />
              </button>

              {/* iOS Liquid Glass Settings Flyout */}
              <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                theme={theme}
                onToggleTheme={handleToggleTheme}
                isAudioPlaying={isAudioPlaying}
                onToggleAudio={toggleFocusAudio}
                onOpenFocusMode={() => {
                  setIsSettingsOpen(false);
                  onOpenFocusMode();
                }}
                soundEffects={soundEffects}
                onToggleSoundEffects={handleToggleSoundEffects}
                reducedMotion={reducedMotion}
                onToggleReducedMotion={handleToggleReducedMotion}
              />
            </div>

            {/* Chat Toggle Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleChat();
              }}
              className="relative w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/30 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer pointer-events-auto"
              title="Mở Phòng Chat Trực Tuyến"
              aria-label="Mở Phòng Chat Trực Tuyến"
            >
              <MessageSquare className="w-4 h-4 text-amber-400" />
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-amber-600 text-[10px] font-bold text-black rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-black animate-pulse">
                  {unreadChatCount}
                </span>
              )}
            </button>

            {/* Notification Bell Container with clean anchor */}
            <div ref={notifMenuRef} className="relative inline-flex items-center flex-shrink-0">
              <button
                type="button"
                data-notif-trigger="true"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsNotificationsOpen((prev) => !prev);
                  setIsFlyoutOpen(false);
                }}
                className="relative p-2.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors pointer-events-auto cursor-pointer"
                aria-label="Thông báo"
                title="Trung tâm thông báo"
              >
                <Bell size={19} className={isNotificationsOpen ? 'text-amber-300' : 'text-amber-400'} />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black ring-2 ring-[#0a0f14]">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Popover anchored directly below Bell trigger */}
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

            {/* Auth Capsule or Login Button */}
            {!currentUser ? (
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="bg-white text-neutral-900 px-4 py-1.5 rounded-full text-xs font-semibold hover:bg-neutral-200 transition-colors shadow-md cursor-pointer whitespace-nowrap flex-shrink-0"
              >
                Đăng nhập
              </button>
            ) : (
              <div ref={userMenuRef} className="relative inline-flex items-center flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlyoutOpen((prev) => !prev);
                    setIsNotificationsOpen(false);
                  }}
                  className={`cursor-pointer pointer-events-auto flex items-center gap-2 pl-1.5 pr-2.5 sm:pr-3 py-1 rounded-full transition-all duration-200 group focus:outline-none flex-shrink-0 ${
                    isFlyoutOpen
                      ? 'bg-amber-500/15 border border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/30'
                  }`}
                  title="Mở bảng điều khiển tài khoản"
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

                  {/* Roman Rank icon */}
                  <div className="shrink-0 flex items-center justify-center">
                    <TierBadge level={currentUser.level} size={17} showTooltip={false} />
                  </div>

                  {/* Name & Verified Tick */}
                  <div className="hidden sm:flex items-center gap-1.5 leading-none">
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
                    className={`w-3 h-3 text-neutral-400 group-hover:text-amber-400 transition-transform duration-200 ${
                      isFlyoutOpen ? 'rotate-180 text-amber-400' : ''
                    }`}
                  />
                </button>

                {/* Profile Card */}
                <ProfileDropdown
                  currentUser={currentUser}
                  isOpen={isFlyoutOpen}
                  onClose={() => setIsFlyoutOpen(false)}
                  onOpenProfile={onOpenProfile}
                  onLogout={onLogout}
                />
              </div>
            )}
          </div>
        </nav>
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
              title="Cài đặt & Giao diện"
            >
              <Settings size={18} className={isSettingsOpen ? 'text-amber-300 rotate-90 transition-transform' : 'text-amber-400'} />
            </button>

            {/* Mobile Settings Modal */}
            <SettingsModal
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
              theme={theme}
              onToggleTheme={handleToggleTheme}
              isAudioPlaying={isAudioPlaying}
              onToggleAudio={toggleFocusAudio}
              onOpenFocusMode={() => {
                setIsSettingsOpen(false);
                onOpenFocusMode();
              }}
              soundEffects={soundEffects}
              onToggleSoundEffects={handleToggleSoundEffects}
              reducedMotion={reducedMotion}
              onToggleReducedMotion={handleToggleReducedMotion}
            />
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

              <ProfileDropdown
                currentUser={currentUser}
                isOpen={isFlyoutOpen}
                onClose={() => setIsFlyoutOpen(false)}
                onOpenProfile={onOpenProfile}
                onLogout={onLogout}
              />
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
            className="fixed bottom-[calc(56px+var(--safe-bottom)+8px)] inset-x-3 z-50 rounded-3xl bg-[#0c1218]/95 backdrop-blur-2xl border border-white/15 p-4 shadow-2xl animate-fade-up md:hidden pointer-events-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-amber-400" />
                KHÁM PHÁ F-FORUM
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

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => {
                  onViewChange('landing');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full p-3 rounded-2xl border transition-all text-left flex items-center gap-3 cursor-pointer ${
                  currentView === 'landing'
                    ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Giới thiệu F-Forum</div>
                  <div className="text-[10px] text-neutral-400">Trang giới thiệu, tính năng &amp; bảng giá</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onViewChange('memory');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full p-3 rounded-2xl border transition-all text-left flex items-center gap-3 cursor-pointer ${
                  currentView === 'memory'
                    ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Miền Ký Ức</div>
                  <div className="text-[10px] text-neutral-400">Cuộn dòng thời gian điện ảnh 3700px</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onViewChange('chronicles');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full p-3 rounded-2xl border transition-all text-left flex items-center gap-3 cursor-pointer ${
                  currentView === 'chronicles'
                    ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                <Award className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Khu Vinh Danh</div>
                  <div className="text-[10px] text-neutral-400">Quả cầu 3D Fibonacci & 21 cột mốc</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onViewChange('coming-soon');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full p-3 rounded-2xl border transition-all text-left flex items-center gap-3 cursor-pointer ${
                  currentView === 'coming-soon'
                    ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                <Timer className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Bản Nâng Cấp (UPDATE)</div>
                  <div className="text-[10px] text-neutral-400">Không gian phát triển tính năng mới</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Navbar;
