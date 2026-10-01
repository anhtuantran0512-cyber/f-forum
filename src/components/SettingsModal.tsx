import React, { useRef, useEffect } from 'react';
import {
  Settings,
  X,
  Volume2,
  VolumeX,
  Timer,
  Sparkles,
  Zap,
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
}

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
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

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
      <div
        className="fixed inset-0 z-40 bg-transparent cursor-default"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />

      {/* iOS Liquid Glass Settings Popover Flyout */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Cài đặt hệ thống"
        onClick={(e) => e.stopPropagation()}
        className="absolute top-[calc(100%+12px)] right-0 z-50 w-[350px] max-w-[calc(100vw-32px)] liquid-glass rounded-3xl p-5 shadow-[0_25px_60px_rgba(0,0,0,0.9)] animate-fade-up pointer-events-auto border border-white/15 select-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
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
        <div className="space-y-3">
          {/* ======================================================== */}
          {/* 1. CREATIVE CARTOON LIGHT / DARK THEME SWITCH CARD       */}
          {/* ======================================================== */}
          <div className="rounded-2xl p-3.5 bg-black/25 border border-white/10 flex items-center justify-between gap-3 group transition-colors">
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white tracking-wide">
                  Giao diện (Theme)
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-400/30">
                  {theme === 'light' ? 'Sáng' : 'Tối'}
                </span>
              </div>
              <p className="text-[11px] text-white/60 leading-tight mt-1 truncate">
                {theme === 'light'
                  ? '☀️ Pha lê iOS Liquid Glass (Nguyên bản)'
                  : '🌙 Huyền bí Obsidian Liquid Glass (Tối)'}
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
              <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
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
          {/* 2. AMBIENT AUDIO SANCTUARY OPTION                         */}
          {/* ======================================================== */}
          <div className="rounded-2xl p-3.5 bg-black/25 border border-white/10 space-y-2.5 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isAudioPlaying
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                      : 'bg-white/5 text-white/60 border border-white/10'
                  }`}
                >
                  {isAudioPlaying ? (
                    <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white tracking-wide">
                    Âm thanh Ambient (432Hz)
                  </div>
                  <div className="text-[11px] text-white/60 truncate">
                    {isAudioPlaying ? 'Binaural 432Hz đang hoạt động' : 'Tập trung sâu & thư giãn'}
                  </div>
                </div>
              </div>

              {/* Play / Pause Toggle Button */}
              <div className="flex items-center gap-2 shrink-0">
                {isAudioPlaying && (
                  <div className="flex items-end gap-[2px] h-3 w-3.5 justify-center">
                    <span className="w-[2px] rounded-full bg-amber-400 eq-bar-1" />
                    <span className="w-[2px] rounded-full bg-amber-400 eq-bar-2" />
                    <span className="w-[2px] rounded-full bg-amber-400 eq-bar-3" />
                    <span className="w-[2px] rounded-full bg-amber-400 eq-bar-4" />
                  </div>
                )}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAudioPlaying}
                  onClick={onToggleAudio}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer flex items-center ${
                    isAudioPlaying ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-white/20'
                  }`}
                  aria-label="Bật/Tắt âm thanh binaural ambient"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                      isAudioPlaying ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Quick Focus Mode sanctuary shortcut button */}
            <button
              type="button"
              onClick={onOpenFocusMode}
              className="w-full px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Timer className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Mở Focus Mode (Không gian tập trung)</span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* 3. SOUND EFFECTS (SFX) TOGGLE                            */}
          {/* ======================================================== */}
          <div className="rounded-2xl p-3 bg-black/25 border border-white/10 flex items-center justify-between gap-3 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  soundEffects
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                    : 'bg-white/5 text-white/50 border border-white/10'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white">Hiệu ứng âm thanh (SFX)</div>
                <div className="text-[10px] text-white/60 truncate">Âm thanh click & thông báo</div>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={soundEffects}
              onClick={onToggleSoundEffects}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer flex items-center ${
                soundEffects ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-white/20'
              }`}
              aria-label="Bật/Tắt hiệu ứng âm thanh"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                  soundEffects ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* ======================================================== */}
          {/* 4. REDUCED MOTION TOGGLE                                 */}
          {/* ======================================================== */}
          <div className="rounded-2xl p-3 bg-black/25 border border-white/10 flex items-center justify-between gap-3 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  reducedMotion
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                    : 'bg-white/5 text-white/50 border border-white/10'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white">Giảm chuyển động</div>
                <div className="text-[10px] text-white/60 truncate">Tối ưu hóa hiệu năng & độ mượt</div>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={reducedMotion}
              onClick={onToggleReducedMotion}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer flex items-center ${
                reducedMotion ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-white/20'
              }`}
              aria-label="Bật/Tắt giảm chuyển động"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                  reducedMotion ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer Brand Tag */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-white/40 font-mono">
          <span>F-Forum v2.5</span>
          <span className="text-amber-400/70">Apple iOS Liquid Glass</span>
        </div>
      </div>
    </>
  );
};
