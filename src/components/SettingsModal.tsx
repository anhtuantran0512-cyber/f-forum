/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useRef, useEffect } from 'react';
import {
  Settings,
  X,
  Volume2,
  VolumeX,
  Timer,
  Sparkles,
  Zap,
  Move,
} from 'lucide-react';

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
  dockPosition?: 'top' | 'bottom' | 'left' | 'right';
}

import { GODRAY_PRESETS } from '../utils/godrays';

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
  dockPosition,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const activeDockPos = dockPosition || navbarPosition;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Transparent Click-Outside Backdrop */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Đóng cài đặt"
        className="fixed inset-0 z-40 bg-transparent cursor-default border-none outline-none"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />

      {/* iOS Liquid Glass Settings Popover Flyout with position-aware Dynamic Island / Hyperland spring scale */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Cài đặt hệ thống"
        className={`absolute z-50 w-[380px] max-w-[calc(100vw-28px)] liquid-glass rounded-3xl p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.92)] pointer-events-auto border border-white/20 select-none max-h-[82vh] overflow-y-auto no-scrollbar transition-all duration-300 transform scale-100 opacity-100 ${
          activeDockPos === 'bottom'
            ? 'bottom-[calc(100%+14px)] top-auto right-0 origin-bottom-right'
            : activeDockPos === 'left'
            ? 'left-[calc(100%+16px)] bottom-0 top-auto origin-bottom-left'
            : activeDockPos === 'right'
            ? 'right-[calc(100%+16px)] bottom-0 top-auto origin-bottom-right'
            : 'top-[calc(100%+12px)] right-0 origin-top-right'
        }`}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Directional Anchor Caret */}
        <div
          className={`absolute pointer-events-none transition-all ${
            activeDockPos === 'bottom'
              ? '-bottom-1.5 right-4 w-3 h-3 bg-[#0a0f14] border-b border-r border-amber-400/50 rotate-45 shadow-[0_4px_10px_rgba(0,0,0,0.8)]'
              : activeDockPos === 'left'
              ? '-left-1.5 bottom-4 w-3 h-3 bg-[#0a0f14] border-b border-l border-amber-400/50 rotate-45 shadow-[-4px_0_10px_rgba(0,0,0,0.8)]'
              : activeDockPos === 'right'
              ? '-right-1.5 bottom-4 w-3 h-3 bg-[#0a0f14] border-t border-r border-amber-400/50 rotate-45 shadow-[4px_0_10px_rgba(0,0,0,0.8)]'
              : '-top-1.5 right-4 w-3 h-3 bg-[#0a0f14] border-t border-l border-amber-400/50 rotate-45 shadow-[0_-4px_10px_rgba(0,0,0,0.8)]'
          }`}
        />
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
              <Settings className="w-3.5 h-3.5 text-amber-400 animate-[spin_12s_linear_infinite]" />
            </div>
            <span className="font-bold text-xs tracking-wider uppercase text-white font-mono">
              CÀI ĐẶT & GIAO DIỆN
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

        {/* Setting Groups */}
        <div className="space-y-2.5">
          {/* ======================================================== */}
          {/* 1. CREATIVE CARTOON LIGHT / DARK THEME SWITCH CARD       */}
          {/* ======================================================== */}
          <div className="rounded-2xl p-3 bg-black/30 border border-white/10 flex items-center justify-between gap-3 group transition-colors">
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white tracking-wide">
                  Giao diện (Theme)
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-400/30">
                  {theme === 'light' ? 'Sáng' : 'Tối'}
                </span>
              </div>
              <p className="text-[10.5px] text-white/60 leading-tight mt-0.5 truncate">
                {theme === 'light'
                  ? '☀️ Chế độ Pha Lê Sáng'
                  : '🌙 Chế độ Huyền Bí Tối'}
              </p>
            </div>

            {/* Playful High-Quality Cartoon Switch */}
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
              {/* Animated Track Sky Background: Midnight vs Morning Sun (Pill Masked) */}
              <div className="rounded-full overflow-hidden pointer-events-none absolute inset-0">
                <div
                  className={`absolute inset-0 transition-opacity duration-500 ${
                    theme === 'dark' ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {/* Midnight starry indigo gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f1d] via-[#141b33] to-[#1e1b4b]" />

                  {/* Twinkling Cartoon Stars */}
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

                  {/* Sleeping Night Cloud silhouette */}
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
                  {/* Bright Azure Morning Sky gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#38bdf8] via-[#60a5fa] to-[#93c5fd]" />

                  {/* Floating Fluffy Cartoon Clouds */}
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

              {/* Bouncy Spring Toggle Knob (Moon <-> Sun) */}
              <div
                className={`relative w-[34px] h-[34px] rounded-full transition-transform duration-500 shadow-lg ${
                  theme === 'light' ? 'translate-x-[42px]' : 'translate-x-[1px]'
                }`}
                style={{
                  transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                {/* 1A. SLEEPY MOON FACE (Visible in Dark Mode) */}
                <div
                  className={`absolute inset-0 rounded-full bg-gradient-to-tr from-[#fef08a] via-[#fde047] to-[#fef9c3] border border-amber-200/90 shadow-[0_0_12px_rgba(250,204,21,0.65)] flex items-center justify-center transition-all duration-500 ${
                    theme === 'dark'
                      ? 'opacity-100 scale-100 rotate-0'
                      : 'opacity-0 scale-50 -rotate-90 pointer-events-none'
                  }`}
                >
                  {/* Moon Crater Dots */}
                  <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-amber-500/25" />
                  <span className="absolute bottom-2 right-2.5 w-1.5 h-1.5 rounded-full bg-amber-500/20" />
                  <span className="absolute top-3 left-1.5 w-1 h-1 rounded-full bg-amber-500/20" />

                  {/* Rosy Cheek Blush */}
                  <span className="absolute top-[18px] left-[5px] w-2 h-1 rounded-full bg-pink-400/60" />
                  <span className="absolute top-[18px] right-[5px] w-2 h-1 rounded-full bg-pink-400/60" />

                  {/* Sleepy Moon Face Eyes & Mouth */}
                  <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none">
                    <path
                      d="M 8 14 Q 11 11 14 14"
                      stroke="#78350f"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 18 14 Q 21 11 24 14"
                      stroke="#78350f"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 13 19 Q 16 22 19 19"
                      stroke="#78350f"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {/* 1B. CHEERFUL SUN FACE WITH ROTATING RAYS (Visible in Light Mode) */}
                <div
                  className={`absolute inset-0 rounded-full bg-gradient-to-tr from-[#f59e0b] via-[#fbbf24] to-[#fde047] border border-yellow-200 shadow-[0_0_18px_rgba(245,158,11,0.85)] flex items-center justify-center transition-all duration-500 ${
                    theme === 'light'
                      ? 'opacity-100 scale-100 rotate-0'
                      : 'opacity-0 scale-50 rotate-90 pointer-events-none'
                  }`}
                >
                  {/* Rotating Sunrays Halo */}
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

                  {/* Rosy Coral Cheeks */}
                  <span className="absolute top-[18px] left-[5px] w-2 h-1 rounded-full bg-rose-400/80" />
                  <span className="absolute top-[18px] right-[5px] w-2 h-1 rounded-full bg-rose-400/80" />

                  {/* Cheerful Cartoon Sun Eyes & Smile */}
                  <svg className="w-6 h-6 relative z-10" viewBox="0 0 32 32" fill="none">
                    <ellipse cx="10.5" cy="13" rx="1.6" ry="2.2" fill="#78350f" />
                    <circle cx="10" cy="12.2" r="0.6" fill="#ffffff" />
                    <ellipse cx="21.5" cy="13" rx="1.6" ry="2.2" fill="#78350f" />
                    <circle cx="21" cy="12.2" r="0.6" fill="#ffffff" />
                    <path
                      d="M 11 18 Q 16 25 21 18"
                      stroke="#78350f"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path d="M 13.5 21 Q 16 23.5 18.5 21" fill="#f43f5e" />
                  </svg>
                </div>
              </div>
            </button>
          </div>

          {/* ======================================================== */}
          {/* 2. GODRAYS GRADIENTS PRESETS (Grainient Collection)      */}
          {/* ======================================================== */}
          <div className="rounded-2xl p-3 bg-black/30 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white tracking-wide">
                Hào Quang Godrays (Grainient)
              </span>
              <span className="text-[10px] text-amber-300 font-mono">
                {godrayIntensity}% Độ rực
              </span>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {GODRAY_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectGodray?.(p.id)}
                  className={`p-1.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-1.5 ${
                    godrayPreset === p.id
                      ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full bg-gradient-to-tr ${p.color} shrink-0 border border-white/30`} />
                  <span className="text-[10px] font-medium text-white truncate">{p.name}</span>
                </button>
              ))}
            </div>

            {/* Intensity slider */}
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

          {/* ======================================================== */}
          {/* 3. COMBINED COMPACT GLASS BLUR & FONT SIZE               */}
          {/* ======================================================== */}
          <div className="rounded-2xl p-3 bg-black/30 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Độ mờ kính & Cỡ chữ</span>
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

          {/* ======================================================== */}
          {/* 4. NAVBAR POSITION CONTROLLER (4-QUADRANT VISUAL SELECTOR) */}
          {/* ======================================================== */}
          <div className="rounded-2xl p-3 bg-black/30 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-white">Vị trí thanh Navbar</span>
                <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                  {navbarPosition === 'top' ? 'TRÊN' : navbarPosition === 'bottom' ? 'DƯỚI' : navbarPosition === 'left' ? 'TRÁI' : 'PHẢI'}
                </span>
              </div>

              {/* Auto-hide Navbar */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-white/60">Tự ẩn 1s:</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={navbarAutoHide}
                  onClick={onToggleNavbarAutoHide}
                  className={`w-8 h-4.5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center shrink-0 ${
                    navbarAutoHide ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-white/20'
                  }`}
                  title="Tự động ẩn Navbar khi rời chuột 1s"
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform ${
                      navbarAutoHide ? 'translate-x-3.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 4-Quadrant Interactive Edge Selector */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { id: 'top' as const, label: 'Trên', icon: '▲', desc: 'Đỉnh' },
                { id: 'bottom' as const, label: 'Dưới', icon: '▼', desc: 'Đáy' },
                { id: 'left' as const, label: 'Trái', icon: '◀', desc: 'Cạnh trái' },
                { id: 'right' as const, label: 'Phải', icon: '▶', desc: 'Cạnh phải' },
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
                    title={`Chuyển thanh điều hướng về ${pos.desc}`}
                  >
                    <span className="text-[11px] font-mono leading-none">{pos.icon}</span>
                    <span className="text-[10px] font-semibold tracking-wide">{pos.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* 5. SINGLE-ROW SFX & REDUCED MOTION (TIA SÉT)             */}
          {/* ======================================================== */}
          <div className="rounded-2xl p-2.5 bg-black/30 border border-white/10 grid grid-cols-2 gap-2">
            {/* Left: SFX */}
            <div className="flex items-center justify-between p-1.5 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-1.5 min-w-0 pr-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] font-semibold text-white truncate">
                  Hiệu ứng âm thanh (SFX)
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={soundEffects}
                onClick={onToggleSoundEffects}
                className={`w-8 h-4.5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center shrink-0 ${
                  soundEffects ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-white/20'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform ${
                    soundEffects ? 'translate-x-3.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Right: Reduced Motion with Zap Tia sét */}
            <div className="flex items-center justify-between p-1.5 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-1.5 min-w-0 pr-1">
                <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-[11px] font-semibold text-white truncate">
                  Giảm chuyển động
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={reducedMotion}
                onClick={onToggleReducedMotion}
                className={`w-8 h-4.5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center shrink-0 ${
                  reducedMotion ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'bg-white/20'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform ${
                    reducedMotion ? 'translate-x-3.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 6. AMBIENT AUDIO SANCTUARY OPTION                         */}
          {/* ======================================================== */}
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
                  <div className="text-xs font-semibold text-white">
                    Âm thanh Ambient (432Hz)
                  </div>
                  <div className="text-[10px] text-white/60 truncate">
                    {isAudioPlaying ? 'Binaural 432Hz đang chạy' : 'Tập trung sâu & thư giãn'}
                  </div>
                </div>
              </div>

              {/* Play / Pause Toggle Button */}
              <button
                type="button"
                role="switch"
                aria-checked={isAudioPlaying}
                onClick={onToggleAudio}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center shrink-0 ${
                  isAudioPlaying ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-white/20'
                }`}
                aria-label="Bật/Tắt âm thanh binaural ambient"
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${
                    isAudioPlaying ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Quick Focus Mode sanctuary shortcut button */}
            <button
              type="button"
              onClick={onOpenFocusMode}
              className="w-full px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Timer className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Mở Focus Mode</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsModal;
