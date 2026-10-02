import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  NotebookPen,
  Copy,
  Check,
  Trash2,
  Sparkles,
  Timer,
  Coffee,
  BrainCircuit,
} from 'lucide-react';
import {
  startFocusLofiAmbient,
  stopFocusLofiAmbient,
  playChime,
} from '../utils/audio';
import { safeStorage } from '../utils/storage';

interface FocusSanctuaryProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardXP?: (amount: number) => void;
}

const FocusSanctuaryInner: React.FC<{
  onClose: () => void;
  onRewardXP?: (amount: number) => void;
}> = ({ onClose, onRewardXP }) => {
  const [timerMode, setTimerMode] = useState<'work' | 'break'>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 min default
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  const timeLeftRef = useRef(timeLeft);
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  const [isAudioPlaying, setIsAudioPlaying] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [notes, setNotes] = useState(() => {
    return safeStorage.getItem('fforum_focus_scratchpad') || '';
  });
  const [copied, setCopied] = useState(false);

  // Audio start on mount and stop on unmount
  useEffect(() => {
    startFocusLofiAmbient();
    return () => {
      stopFocusLofiAmbient();
    };
  }, []);

  // Persist notes
  useEffect(() => {
    safeStorage.setItem('fforum_focus_scratchpad', notes);
  }, [notes]);

  // Timer interval countdown
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const current = timeLeftRef.current;
      if (current <= 1) {
        // Session finished
        playChime('level-up');
        if (timerMode === 'work') {
          setCompletedSessions(s => s + 1);
          if (onRewardXP) {
            onRewardXP(25); // +25 XP upon completed Pomodoro study
          }
          setTimerMode('break');
          const nextDuration = 5 * 60;
          timeLeftRef.current = nextDuration;
          setTimeLeft(nextDuration);
        } else {
          setTimerMode('work');
          const nextDuration = 25 * 60;
          timeLeftRef.current = nextDuration;
          setTimeLeft(nextDuration);
        }
      } else {
        const nextTime = current - 1;
        timeLeftRef.current = nextTime;
        setTimeLeft(nextTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timerMode, onRewardXP]);

  const handleToggleTimer = () => {
    setIsRunning(prev => !prev);
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setTimeLeft(timerMode === 'work' ? 25 * 60 : 5 * 60);
  };

  const handleSwitchMode = (mode: 'work' | 'break') => {
    setIsRunning(false);
    setTimerMode(mode);
    setTimeLeft(mode === 'work' ? 25 * 60 : 5 * 60);
  };

  const handleToggleAudio = async (e?: React.MouseEvent) => {
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
    if (isAudioPlaying) {
      stopFocusLofiAmbient();
      setIsAudioPlaying(false);
    } else {
      const active = startFocusLofiAmbient(audioCtxRef.current);
      setIsAudioPlaying(active);
    }
  };

  const handleCopyNotes = () => {
    if (!notes.trim()) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(notes)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          // Gracefully handle clipboard write restrictions
        });
    }
  };

  const handleClearNotes = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ ghi chú tập trung?')) {
      setNotes('');
    }
  };

  const totalDuration = timerMode === 'work' ? 25 * 60 : 5 * 60;
  const progressPercent = Math.min(100, Math.max(0, ((totalDuration - timeLeft) / totalDuration) * 100));
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl animate-fade-up">
      {/* Subtle Cyberpunk Neon Glow Rings */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Focus HUD Window */}
      <div className="liquid-glass w-full max-w-4xl rounded-3xl bg-neutral-950/95 border border-cyan-400/30 shadow-[0_0_80px_rgba(6,182,212,0.25)] p-5 sm:p-7 relative flex flex-col max-h-[92vh] overflow-y-auto">
        
        {/* HUD Top Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <BrainCircuit className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide font-['Inter']">
                  FOCUS SANCTUARY & POMODORO HUD
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  25 / 5 MIN
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono">
                Không gian thiền định học tập • Âm hưởng Binaural Cyberpunk Lofi 432Hz
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Lofi Sound Toggle Button */}
            <button
              onClick={handleToggleAudio}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border transition-all ${
                isAudioPlaying
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white'
              }`}
              title={isAudioPlaying ? 'Tắt âm hưởng Lofi' : 'Bật âm hưởng Lofi'}
            >
              {isAudioPlaying ? (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
              <span className="hidden sm:inline font-mono">
                {isAudioPlaying ? 'Lofi Playing' : 'Lofi Muted'}
              </span>
            </button>

            {/* Exit HUD Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              title="Thoát chế độ tập trung"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* HUD Center: Split Grid (Left: Pomodoro Timer, Right: Scratchpad) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch">
          
          {/* Left Column: Pomodoro HUD (col-span-6) */}
          <div className="lg:col-span-6 flex flex-col items-center justify-between p-6 rounded-3xl bg-neutral-900/60 border border-white/10 shadow-inner space-y-6">
            
            {/* Mode Switcher (Work 25m vs Break 5m) */}
            <div className="flex items-center bg-black/60 p-1.5 rounded-full border border-white/15 w-full max-w-xs justify-center">
              <button
                onClick={() => handleSwitchMode('work')}
                className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  timerMode === 'work'
                    ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                <span>Học Tập (25m)</span>
              </button>
              <button
                onClick={() => handleSwitchMode('break')}
                className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  timerMode === 'break'
                    ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.6)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Nghỉ Ngơi (5m)</span>
              </button>
            </div>

            {/* Circular Digital Timer */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
              {/* Outer SVG circular ring */}
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-neutral-800"
                  strokeWidth="5"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className={`transition-all duration-500 ${
                    timerMode === 'work' ? 'stroke-cyan-400' : 'stroke-purple-400'
                  }`}
                  strokeWidth="5"
                  strokeDasharray={264}
                  strokeDashoffset={264 - (264 * progressPercent) / 100}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>

              {/* Inner Countdown Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                  {formattedTime}
                </span>
                <span className="text-xs font-mono font-semibold uppercase tracking-widest text-cyan-300 mt-1">
                  {timerMode === 'work' ? 'DEEP STUDY' : 'RECHARGE BREAK'}
                </span>
                <span className="text-[11px] text-neutral-400 font-mono mt-0.5">
                  Đã hoàn thành: {completedSessions} chu kỳ
                </span>
              </div>
            </div>

            {/* Timer Action Controls */}
            <div className="flex items-center gap-3 w-full justify-center">
              <button
                onClick={handleResetTimer}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-all border border-white/10"
                title="Khởi động lại thời gian"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={handleToggleTimer}
                className={`px-8 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all shadow-xl active:scale-95 ${
                  isRunning
                    ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                    : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black hover:opacity-95 shadow-[0_0_20px_rgba(6,182,212,0.5)]'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>TẠM DỪNG</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>BẮT ĐẦU TẬP TRUNG</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleSwitchMode(timerMode === 'work' ? 'break' : 'work')}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-all border border-white/10"
                title="Bỏ qua phiên hiện tại"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Column: Quick Scratchpad for Notes (col-span-6) */}
          <div className="lg:col-span-6 flex flex-col p-5 rounded-3xl bg-neutral-900/60 border border-white/10 shadow-inner">
            
            {/* Scratchpad Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <NotebookPen className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  BẢNG GHI CHÚ NHANH (SCRATCHPAD)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyNotes}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 text-xs flex items-center gap-1 transition-colors"
                  title="Sao chép nội dung"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 text-[10px]">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Sao chép</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleClearNotes}
                  className="p-1 rounded-lg hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors"
                  title="Xóa ghi chú"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Scratchpad Textarea */}
            <div className="flex-1 flex flex-col">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                maxLength={5000}
                placeholder="Ghi nhanh công thức toán lý, ý tưởng bài giảng, link tham khảo hoặc kế hoạch học tập trong phiên Pomodoro này..."
                className="w-full flex-1 min-h-[160px] bg-black/40 border border-white/10 rounded-2xl p-3.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-cyan-400 transition-colors resize-none font-mono leading-relaxed"
              />
              <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono pt-2">
                <span>Tự động lưu vào bộ nhớ trình duyệt</span>
                <span>{notes.length} ký tự</span>
              </div>
            </div>

            {/* Motivational Quote */}
            <div className="mt-4 p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-200 flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-[11px] leading-relaxed">
                Hoàn thành 1 chu kỳ Pomodoro 25 phút để nhận ngay <strong>+25 Coin</strong> danh dự và giữ chuỗi ngọn lửa xanh!
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export const FocusSanctuary: React.FC<FocusSanctuaryProps> = ({
  isOpen,
  onClose,
  onRewardXP,
}) => {
  if (!isOpen) return null;
  return <FocusSanctuaryInner onClose={onClose} onRewardXP={onRewardXP} />;
};

export default FocusSanctuary;
