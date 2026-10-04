/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { createPortal } from 'react-dom';
import React, { useRef, useEffect, useState } from 'react';
import {
  Settings,
  X,
  Volume2,
  VolumeX,
  Timer,
  Sparkles,
  Zap,
  Move,
  Trash2,
  MousePointer2,
} from 'lucide-react';
import { GODRAY_PRESETS } from '../utils/godrays';
import { safeStorage } from '../utils/storage';
import { usePopoverPosition, type DockPosition } from '../utils/popover';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isAudioPlaying: boolean;
  onToggleAudio: (e?: React.MouseEvent) => void;
  onOpenFocusMode: () => void;
  soundEffects: boolean;
  onToggleSoundEffects: () => void;
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
  godrayPreset?: string;
  onSelectGodray?: (preset: string) => void;
  godrayIntensity?: number;
  onChangeGodrayIntensity?: (val: number) => void;
  glassBlur?: number;
  onChangeGlassBlur?: (val: number) => void;
  fontSize?: 'sm' | 'md' | 'lg';
  onChangeFontSize?: (size: 'sm' | 'md' | 'lg') => void;
  navbarAutoHide?: boolean;
  onToggleNavbarAutoHide?: () => void;
  navbarPosition?: 'top' | 'bottom' | 'left' | 'right';
  onSwapNavbarPosition?: () => void;
  onSelectNavbarPosition?: (pos: 'top' | 'bottom' | 'left' | 'right') => void;
  alwaysCompact?: boolean;
  onToggleAlwaysCompact?: () => void;
  dockPosition?: DockPosition;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

const SectionTitle: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div className="flex items-center gap-2 mb-2">
    <span className="w-5 h-5 rounded-md bg-gradient-to-tr from-amber-500/25 to-fuchsia-500/25 border border-amber-400/30 flex items-center justify-center">
      {icon}
    </span>
    <span className="text-[11px] font-bold uppercase tracking-widest ff-aurora-text">{children}</span>
    <span className="flex-1 h-px ff-aurora-bar opacity-40 rounded-full" />
  </div>
);

const MiniSwitch: React.FC<{ on: boolean; onToggle: () => void; color?: string; label: string }> = ({
  on,
  onToggle,
  color = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
  label,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={onToggle}
    className={`w-8 h-4.5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center shrink-0 ${on ? color : 'bg-white/20'}`}
  >
    <div
      className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform ${
        on ? 'translate-x-3.5' : 'translate-x-0'
      }`}
    />
  </button>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  isAudioPlaying,
  onToggleAudio,
  onOpenFocusMode,
  soundEffects,
  onToggleSoundEffects,
  reducedMotion,
  onToggleReducedMotion,
  godrayPreset = 'godray-gold',
  onSelectGodray,
  godrayIntensity = 70,
  onChangeGodrayIntensity,
  glassBlur = 14,
  onChangeGlassBlur,
  fontSize = 'md',
  onChangeFontSize,
  navbarAutoHide = false,
  onToggleNavbarAutoHide,
  navbarPosition = 'top',
  onSwapNavbarPosition,
  onSelectNavbarPosition,
  alwaysCompact = false,
  onToggleAlwaysCompact,
  dockPosition,
  anchorRef,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const activeDockPos: DockPosition = dockPosition || navbarPosition;
  const pop = usePopoverPosition(isOpen, anchorRef, activeDockPos, 380, 600);
  const [confirmReset, setConfirmReset] = useState<null | 'cache' | 'full'>(null);
  const [resetDone, setResetDone] = useState<string | null>(null);
  const [fxRims, setFxRims] = useState(() => safeStorage.getItem('fforum_fx_rims') !== 'false');
  const [fxAmbient, setFxAmbient] = useState(() => safeStorage.getItem('fforum_fx_ambient') !== 'false');
  const toggleFx = (key: 'rims' | 'ambient') => {
    const next = key === 'rims' ? !fxRims : !fxAmbient;
    if (key === 'rims') setFxRims(next);
    else setFxAmbient(next);
    safeStorage.setItem(`fforum_fx_${key}`, String(next));
    document.documentElement.classList.toggle(key === 'rims' ? 'ff-fx-rims' : 'ff-fx-ambient', next);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmReset) {
          setConfirmReset(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, confirmReset]);

  useEffect(() => {
    if (!isOpen) {
      setConfirmReset(null);
      setResetDone(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleResetCache = () => {
    const keys: string[] = [];
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith('fforum_')) keys.push(k);
      }
    } catch {
      /* ignore */
    }
    const keep = new Set([
      'fforum_current_user_email',
      'f_forum_auth_token',
      'fforum_users_registry',
      'fforum_questions',
      'fforum_solutions',
      'fforum_chat_messages',
      'fforum_clubs',
      'fforum_club_posts',
      'fforum_guest_id',
    ]);
    keys.forEach((k) => {
      if (!keep.has(k)) safeStorage.removeItem(k);
    });
    setResetDone('Đã xóa cache & tùy chỉnh giao diện.');
    setConfirmReset(null);
    setTimeout(() => window.location.reload(), 700);
  };

  const handleResetFull = () => {
    const keys: string[] = [];
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && (k.startsWith('fforum_') || k === 'f_forum_auth_token')) keys.push(k);
      }
    } catch {
      /* ignore */
    }
    keys.forEach((k) => safeStorage.removeItem(k));
    setResetDone('Đã đặt lại toàn bộ dữ liệu cục bộ.');
    setConfirmReset(null);
    setTimeout(() => window.location.reload(), 700);
  };

  /* Mobile / no-anchor fallback: centered dialog */
  const useCentered = !anchorRef || !pop.ready;

  return createPortal(
    <>
      {/* Transparent Click-Outside Backdrop */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Đóng cài đặt"
        className="fixed inset-0 z-[60] bg-transparent cursor-default border-none outline-none"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />

      {/* Settings Flyout */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Cài đặt hệ thống"
        data-ff-popover="true"
        className={`z-[70] liquid-glass rounded-3xl p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.92)] pointer-events-auto border border-white/20 select-none max-h-[82vh] overflow-y-auto no-scrollbar popover-morph-enter bg-[#0c1218]/95 ${
          useCentered ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] max-w-[calc(100vw-28px)]' : ''
        }`}
        style={useCentered ? undefined : pop.style}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
              <Settings className="w-3.5 h-3.5 text-amber-400 animate-[spin_12s_linear_infinite]" />
            </div>
            <span className="font-bold text-xs tracking-wider uppercase text-white font-mono">
              Cài đặt
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Đóng cài đặt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reset confirmation inline */}
        {confirmReset && (
          <div className="mb-3 p-3 rounded-2xl bg-red-950/40 border border-red-500/40 space-y-2">
            <p className="text-[11px] text-red-200 font-semibold">
              {confirmReset === 'cache'
                ? 'Xóa cache & tùy chỉnh giao diện trên máy này?'
                : 'Đặt lại TOÀN BỘ dữ liệu cục bộ (bao gồm đăng xuất)?'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmReset === 'cache' ? handleResetCache : handleResetFull}
                className="px-3 py-1 rounded-lg bg-red-500 hover:bg-red-400 text-white text-[11px] font-bold cursor-pointer"
              >
                Xác nhận
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(null)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </div>
        )}
        {resetDone && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-[11px] text-emerald-200">
            {resetDone} Đang tải lại...
          </div>
        )}

        {/* Setting Groups */}
        <div className="space-y-4">
          {/* 1. THEME */}
          <section>
            <SectionTitle icon={<Sparkles className="w-3 h-3 text-amber-300" />}>Theme</SectionTitle>
            <div className="rounded-2xl p-3 bg-black/30 border border-white/10 flex items-center justify-between gap-3 group transition-colors">
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white tracking-wide">Theme</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-400/30">
                    {theme === 'light' ? 'Sáng' : 'Tối'}
                  </span>
                </div>
              </div>

              {/* Cartoon Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={theme === 'light'}
                aria-label="Chuyển chế độ Sáng / Tối"
                onClick={onToggleTheme}
                className={`relative w-[84px] h-[42px] rounded-full p-[3px] select-none cursor-pointer transition-all duration-500 shrink-0 group-hover:scale-105 active:scale-95 border ${
                  theme === 'light'
                    ? 'border-amber-400/80 shadow-[inset_0_2px_6px_rgba(0,0,0,0.15),_0_0_18px_rgba(245,158,11,0.35)]'
                    : 'border-indigo-500/40 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8),_0_0_15px_rgba(99,102,241,0.25)]'
                }`}
              >
                <div className="rounded-full overflow-hidden pointer-events-none absolute inset-0">
                  <div
                    className={`absolute inset-0 transition-opacity duration-500 ${
                      theme === 'dark' ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f1d] via-[#141b33] to-[#1e1b4b]" />
                    <svg
                      className="absolute top-2 right-3 w-3 h-3 text-amber-200 animate-pulse"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
                    </svg>
                    <svg
                      className="absolute bottom-2 right-6 w-2 h-2 text-yellow-100 opacity-80"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
                    </svg>
                    <div className="absolute top-3.5 right-8 w-1 h-1 rounded-full bg-white opacity-80 shadow-[0_0_4px_#fff]" />
                    <svg
                      className="absolute -bottom-1.5 right-0.5 w-8 h-5 text-indigo-400/35"
                      viewBox="0 0 32 20"
                      fill="currentColor"
                    >
                      <path d="M7 16 C4.5 16 2 14 2 11.5 C2 9 4 7 6.5 7 C7.5 4.5 10 3 13 3 C16.5 3 19.5 5 20 8.5 C21 8 22 8 23 8 C26 8 28.5 10.5 28.5 13.5 C28.5 16.5 26 19 23 19 L7 19 Z" />
                    </svg>
                  </div>

                  <div
                    className={`absolute inset-0 transition-opacity duration-500 ${
                      theme === 'light' ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#38bdf8] via-[#60a5fa] to-[#93c5fd]" />
                    <svg
                      className="absolute top-1 left-2 w-7 h-4 text-white/95 drop-shadow-sm"
                      viewBox="0 0 32 20"
                      fill="currentColor"
                    >
                      <path d="M6 16 C3.8 16 2 14.2 2 12 C2 9.8 3.8 8 6 8 C6.8 5.7 9 4 11.5 4 C14.5 4 17 6.1 17.5 9 C18.3 8.4 19.4 8 20.5 8 C23 8 25 10 25 12.5 C25 15 23 17 20.5 17 L6 17 Z" />
                    </svg>
                    <svg
                      className="absolute bottom-1 left-6 w-5 h-3 text-white/80"
                      viewBox="0 0 32 20"
                      fill="currentColor"
                    >
                      <path d="M6 16 C3.8 16 2 14.2 2 12 C2 9.8 3.8 8 6 8 C6.8 5.7 9 4 11.5 4 C14.5 4 17 6.1 17.5 9 C18.3 8.4 19.4 8 20.5 8 C23 8 25 10 25 12.5 C25 15 23 17 20.5 17 L6 17 Z" />
                    </svg>
                    <div className="absolute top-2 left-9 w-1 h-1 rounded-full bg-white shadow-[0_0_6px_#fff]" />
                  </div>
                </div>

                <div
                  className={`relative w-[34px] h-[34px] rounded-full transition-transform duration-500 shadow-lg ${
                    theme === 'light' ? 'translate-x-[42px]' : 'translate-x-[1px]'
                  }`}
                  style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                >
                  {/* Moon */}
                  <div
                    className={`absolute inset-0 rounded-full bg-gradient-to-tr from-[#fef08a] via-[#fde047] to-[#fef9c3] border border-amber-200/90 shadow-[0_0_12px_rgba(250,204,21,0.65)] flex items-center justify-center transition-all duration-500 ${
                      theme === 'dark'
                        ? 'opacity-100 scale-100 rotate-0'
                        : 'opacity-0 scale-50 -rotate-90 pointer-events-none'
                    }`}
                  >
                    <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-amber-500/25" />
                    <span className="absolute bottom-2 right-2.5 w-1.5 h-1.5 rounded-full bg-amber-500/20" />
                    <span className="absolute top-3 left-1.5 w-1 h-1 rounded-full bg-amber-500/20" />
                    <span className="absolute top-[18px] left-[5px] w-2 h-1 rounded-full bg-pink-400/60" />
                    <span className="absolute top-[18px] right-[5px] w-2 h-1 rounded-full bg-pink-400/60" />
                    <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none">
                      <path d="M 8 14 Q 11 11 14 14" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M 18 14 Q 21 11 24 14" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M 13 19 Q 16 22 19 19" stroke="#78350f" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>

                  {/* Sun */}
                  <div
                    className={`absolute inset-0 rounded-full bg-gradient-to-tr from-[#f59e0b] via-[#fbbf24] to-[#fde047] border border-yellow-200 shadow-[0_0_18px_rgba(245,158,11,0.85)] flex items-center justify-center transition-all duration-500 ${
                      theme === 'light'
                        ? 'opacity-100 scale-100 rotate-0'
                        : 'opacity-0 scale-50 rotate-90 pointer-events-none'
                    }`}
                  >
                    <svg
                      className="absolute -inset-1.5 w-[46px] h-[46px] text-amber-500/90 animate-[spin_10s_linear_infinite] pointer-events-none"
                      viewBox="0 0 46 46"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <line x1="23" y1="2" x2="23" y2="6" />
                      <line x1="23" y1="40" x2="23" y2="44" />
                      <line x1="2" y1="23" x2="6" y2="23" />
                      <line x1="40" y1="23" x2="44" y2="23" />
                      <line x1="8.1" y1="8.1" x2="11" y2="11" />
                      <line x1="35" y1="35" x2="37.9" y2="37.9" />
                      <line x1="8.1" y1="37.9" x2="11" y2="35" />
                      <line x1="35" y1="11" x2="37.9" y2="8.1" />
                    </svg>
                    <span className="absolute top-[18px] left-[5px] w-2 h-1 rounded-full bg-rose-400/80" />
                    <span className="absolute top-[18px] right-[5px] w-2 h-1 rounded-full bg-rose-400/80" />
                    <svg className="w-6 h-6 relative z-10" viewBox="0 0 32 32" fill="none">
                      <ellipse cx="10.5" cy="13" rx="1.6" ry="2.2" fill="#78350f" />
                      <circle cx="10" cy="12.2" r="0.6" fill="#ffffff" />
                      <ellipse cx="21.5" cy="13" rx="1.6" ry="2.2" fill="#78350f" />
                      <circle cx="21" cy="12.2" r="0.6" fill="#ffffff" />
                      <path d="M 11 18 Q 16 25 21 18" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M 13.5 21 Q 16 23.5 18.5 21" fill="#f43f5e" />
                    </svg>
                  </div>
                </div>
              </button>
            </div>
          </section>

          {/* 2. GRADIENT */}
          <section>
            <SectionTitle icon={<Zap className="w-3 h-3 text-fuchsia-300" />}>Gradient</SectionTitle>
            <div className="rounded-2xl p-3 bg-black/30 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-300 font-mono">{godrayIntensity}% độ rực</span>
              </div>

              {/* One horizontal spectrum rail: tap a colour stop, the knob glides to it */}
              {(() => {
                const activeIdx = Math.max(0, GODRAY_PRESETS.findIndex((p) => p.id === godrayPreset));
                const active = GODRAY_PRESETS[activeIdx];
                const stops = GODRAY_PRESETS.map((p, i) => `${p.accent} ${(i / (GODRAY_PRESETS.length - 1)) * 100}%`).join(', ');
                const pct = (activeIdx / Math.max(1, GODRAY_PRESETS.length - 1)) * 100;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-white flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor]" style={{ background: active?.accent, color: active?.accent }} />
                        {active?.name}
                      </span>
                    </div>
                    <div className="ff-spectrum relative h-9 rounded-full p-1 border border-white/15 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]" style={{ background: `linear-gradient(90deg, ${stops})` }}>
                      <span className="absolute inset-0 rounded-full ff-spectrum-sheen pointer-events-none" aria-hidden="true" />
                      <div className="relative h-full flex items-center justify-between" role="radiogroup" aria-label="Bảng màu gradient">
                        {GODRAY_PRESETS.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            role="radio"
                            aria-checked={godrayPreset === p.id}
                            aria-label={p.name}
                            title={p.name}
                            onClick={() => onSelectGodray?.(p.id)}
                            className="relative z-10 w-3 h-3 rounded-full cursor-pointer bg-white/25 hover:bg-white/80 hover:scale-150 transition-all duration-300"
                          />
                        ))}
                        <span
                          className="ff-spectrum-knob absolute top-1/2 w-7 h-7 rounded-full border-2 border-white pointer-events-none"
                          style={{ left: `calc(${pct}% - ${(pct / 100) * 12}px - 8px)`, background: active?.accent, boxShadow: `0 0 0 4px rgba(255,255,255,0.12), 0 0 22px ${active?.accent}` }}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-1 flex items-center gap-2">
                <span className="text-[10px] text-neutral-400 shrink-0">Độ rực:</span>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={godrayIntensity}
                  onChange={(e) => onChangeGodrayIntensity?.(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>
            </div>
          </section>

          {/* 3. GLASS & FONT */}
          <section>
            <SectionTitle icon={<Sparkles className="w-3 h-3 text-cyan-300" />}>Hiển thị</SectionTitle>
            <div className="rounded-2xl p-3 bg-black/30 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Cỡ chữ</span>
                <div className="flex items-center gap-1 bg-black/50 p-0.5 rounded-lg border border-white/10">
                  {(['sm', 'md', 'lg'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => onChangeFontSize?.(sz)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                        fontSize === sz
                          ? 'bg-amber-500 text-black font-bold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {sz === 'sm' ? 'A-' : sz === 'md' ? 'A' : 'A+'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[10px] text-neutral-400 shrink-0">Độ mờ kính:</span>
                <input
                  type="range"
                  min={6}
                  max={28}
                  value={glassBlur}
                  onChange={(e) => onChangeGlassBlur?.(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                <span className="text-[10px] font-mono text-amber-300 shrink-0">{glassBlur}px</span>
              </div>
            </div>
          </section>

          {/* 3b. EFFECTS */}
          <section>
            <SectionTitle icon={<Zap className="w-3 h-3 text-pink-300" />}>Hiệu ứng</SectionTitle>
            <div className="rounded-2xl p-3 bg-black/30 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-white block">Viền gradient động</span>
                  <span className="text-[10px] text-white/45">Thẻ & bảng kính có viền màu chuyển động</span>
                </div>
                <MiniSwitch on={fxRims} onToggle={() => toggleFx('rims')} label="Viền gradient động" />
              </div>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-white block">Nền ambient</span>
                  <span className="text-[10px] text-white/45">Dải màu gradient trôi nhẹ phía sau trang</span>
                </div>
                <MiniSwitch on={fxAmbient} onToggle={() => toggleFx('ambient')} label="Nền ambient" />
              </div>
            </div>
          </section>

          {/* 4. NAVBAR */}
          <section>
            <SectionTitle icon={<Move className="w-3 h-3 text-amber-300" />}>Thanh điều hướng</SectionTitle>
            <div className="rounded-2xl p-3 bg-black/30 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white">Vị trí</span>
                  <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                    {navbarPosition === 'top' ? 'TRÊN' : navbarPosition === 'bottom' ? 'DƯỚI' : navbarPosition === 'left' ? 'TRÁI' : 'PHẢI'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-white/60">Tự ẩn:</span>
                  <MiniSwitch
                    on={navbarAutoHide}
                    onToggle={() => onToggleNavbarAutoHide?.()}
                    label="Tự động ẩn Navbar khi rời chuột"
                  />
                </div>
              </div>

              {/* 4-Quadrant Edge Selector */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[
                  { id: 'top' as const, label: 'Trên', icon: '▲' },
                  { id: 'bottom' as const, label: 'Dưới', icon: '▼' },
                  { id: 'left' as const, label: 'Trái', icon: '◀' },
                  { id: 'right' as const, label: 'Phải', icon: '▶' },
                ].map((pos) => {
                  const isActive = navbarPosition === pos.id;
                  return (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => {
                        if (onSelectNavbarPosition) {
                          onSelectNavbarPosition(pos.id);
                        } else {
                          onSwapNavbarPosition?.();
                        }
                      }}
                      className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-500/20 border-amber-400/60 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="text-[11px] font-mono leading-none">{pos.icon}</span>
                      <span className="text-[10px] font-semibold tracking-wide">{pos.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Icon-only mode */}
              <div className="flex items-center justify-between p-1.5 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-1.5 min-w-0 pr-1">
                  <MousePointer2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="text-[11px] font-semibold text-white truncate">Chỉ hiện icon</span>
                </div>
                <MiniSwitch
                  on={alwaysCompact}
                  onToggle={() => onToggleAlwaysCompact?.()}
                  color="bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                  label="Luôn thu gọn thanh điều hướng thành icon"
                />
              </div>
            </div>
          </section>

          {/* 5. SFX & MOTION */}
          <section>
            <SectionTitle icon={<Zap className="w-3 h-3 text-amber-300" />}>Âm thanh & chuyển động</SectionTitle>
            <div className="rounded-2xl p-2.5 bg-black/30 border border-white/10 grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between p-1.5 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-1.5 min-w-0 pr-1">
                  <Volume2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[11px] font-semibold text-white truncate">Âm thanh</span>
                </div>
                <MiniSwitch on={soundEffects} onToggle={onToggleSoundEffects} label="Hiệu ứng âm thanh" />
              </div>

              <div className="flex items-center justify-between p-1.5 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-1.5 min-w-0 pr-1">
                  <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="text-[11px] font-semibold text-white truncate">Giảm chuyển động</span>
                </div>
                <MiniSwitch
                  on={reducedMotion}
                  onToggle={onToggleReducedMotion}
                  color="bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                  label="Giảm chuyển động"
                />
              </div>
            </div>
          </section>

          {/* 6. AMBIENT & FOCUS */}
          <section>
            <SectionTitle icon={<Volume2 className="w-3 h-3 text-emerald-300" />}>Không gian tập trung</SectionTitle>
            <div className="rounded-2xl p-3 bg-black/30 border border-white/10 space-y-2 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      isAudioPlaying
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                        : 'bg-white/5 text-white/60 border border-white/10'
                    }`}
                  >
                    {isAudioPlaying ? (
                      <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white">Âm thanh Ambient (432Hz)</div>
                    <div className="text-[10px] text-white/60 truncate">
                      {isAudioPlaying ? 'Binaural 432Hz đang chạy' : 'Tập trung sâu & thư giãn'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isAudioPlaying}
                  onClick={onToggleAudio}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center shrink-0 ${
                    isAudioPlaying ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-white/20'
                  }`}
                  aria-label="Bật/Tắt âm thanh ambient"
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${
                      isAudioPlaying ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={onOpenFocusMode}
                className="w-full px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Timer className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Mở Focus Mode</span>
              </button>
            </div>
          </section>

          {/* 7. DỮ LIỆU */}
          <section>
            <SectionTitle icon={<Trash2 className="w-3 h-3 text-red-300" />}>Dữ liệu cục bộ</SectionTitle>
            <div className="rounded-2xl p-3 bg-black/30 border border-white/10 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset('cache')}
                  className="px-2 py-2 rounded-xl text-[11px] font-semibold text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer"
                  title="Xóa cache và các tùy chỉnh giao diện đã lưu trên máy này"
                >
                  Xóa cache & tùy chỉnh
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset('full')}
                  className="px-2 py-2 rounded-xl text-[11px] font-semibold text-red-300 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 hover:border-red-400/50 transition-all cursor-pointer"
                  title="Đặt lại toàn bộ dữ liệu cục bộ và đăng xuất"
                >
                  Đặt lại toàn bộ
                </button>
              </div>
              <p className="text-[10px] text-white/40 leading-snug">
                Dữ liệu được lưu trên trình duyệt này. Nội dung đã gửi lên máy chủ (câu hỏi, tin nhắn...) không bị ảnh hưởng.
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  , document.body);
};

export default SettingsModal;
