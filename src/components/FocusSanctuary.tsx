/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Play,
  Pause,
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
  Flame,
  CalendarDays,
  TrendingUp,
  Clock,
  Coins,
} from 'lucide-react';
import { startFocusLofiAmbient, stopFocusLofiAmbient } from '../utils/audio';
import { safeStorage } from '../utils/storage';
import { computeStudyTotals, formatDuration, readStudySessions, sessionsForOwner } from '../utils/studyLog';
import {
  FOCUS_BREAK_MINUTES,
  FOCUS_CREDITED_EVENT,
  FOCUS_DAILY_GOAL_MINUTES,
  focusClockLabel,
  focusElapsedMinutes,
  focusProgressPercent,
  readFocusSession,
  readFocusSessionOwner,
  requestFocusStop,
  startFocusSession,
  subscribeFocusSession,
  type FocusMode,
  type FocusSessionState,
} from '../utils/focusSession';
import {
  readStudyGoalRewardState,
  STUDY_GOAL_REWARD_MILESTONES,
  STUDY_REWARD_SYNC_EVENT,
} from '../utils/studyRewards';

interface FocusSanctuaryProps {
  isOpen: boolean;
  onClose: () => void;
  /** Email người đang học — dùng để ghi giờ học vào đúng tài khoản. */
  userEmail?: string;
}

/* --------------------------------------------------------------------------
   Phòng Tập Trung — stopwatch tự do + các mốc mục tiêu theo ngày.
   Đồng hồ học là một mốc thời gian thật lưu ở localStorage và được watcher
   cấp App ghi nhận khi dừng; đóng HUD / đổi phân khu không làm mất phiên.
   -------------------------------------------------------------------------- */
const FocusSanctuaryInner: React.FC<{
  onClose: () => void;
  userEmail?: string;
}> = ({ onClose, userEmail }) => {
  const [session, setSession] = useState<FocusSessionState | null>(() => readFocusSession());
  const [mode, setMode] = useState<FocusMode>(() => readFocusSession()?.mode || 'work');
  const [now, setNow] = useState(() => Date.now());
  const [flash, setFlash] = useState<{ minutes: number; total: number } | null>(null);

  const [isAudioPlaying, setIsAudioPlaying] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [notes, setNotes] = useState(() => safeStorage.getItem('fforum_focus_scratchpad') || '');
  const [copied, setCopied] = useState(false);
  const [studyTick, setStudyTick] = useState(0);

  /* Âm hưởng Lofi khi ở trong phòng */
  useEffect(() => {
    startFocusLofiAmbient();
    return () => {
      stopFocusLofiAmbient();
    };
  }, []);

  useEffect(() => {
    safeStorage.setItem('fforum_focus_scratchpad', notes);
  }, [notes]);

  /* Theo dõi đồng hồ, nhật ký và ledger thưởng dùng chung. */
  useEffect(() => subscribeFocusSession(() => setSession(readFocusSession())), []);
  useEffect(() => {
    const sync = () => setStudyTick((n) => n + 1);
    window.addEventListener('fforum_study_sync', sync);
    window.addEventListener(STUDY_REWARD_SYNC_EVENT, sync);
    return () => {
      window.removeEventListener('fforum_study_sync', sync);
      window.removeEventListener(STUDY_REWARD_SYNC_EVENT, sync);
    };
  }, []);

  /* Khi watcher ghi xong một phiên, làm mới số liệu của đúng chủ tài khoản. */
  useEffect(() => {
    const onCredited = (event: Event) => {
      const detail = (event as CustomEvent<{ minutes: number; owner?: string }>).detail;
      const minutes = detail?.minutes || 0;
      const owner = detail?.owner || userEmail;
      const total = computeStudyTotals(sessionsForOwner(readStudySessions(), owner)).todayMinutes;
      if (minutes > 0) {
        setFlash({ minutes, total });
        window.setTimeout(() => setFlash(null), 9000);
      }
    };
    window.addEventListener(FOCUS_CREDITED_EVENT, onCredited);
    return () => window.removeEventListener(FOCUS_CREDITED_EVENT, onCredited);
  }, [userEmail]);

  /* Nhịp 500ms chỉ để vẽ lại; thời gian luôn suy từ Date.now() */
  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [session]);

  const studyOwnerEmail = session?.mode === 'work' ? readFocusSessionOwner() || userEmail : userEmail;
  const totals = useMemo(() => {
    /* `session` và `flash` chỉ để ép tính lại số liệu ngay khi phiên vừa được ghi */
    const revision = `${studyTick}:${session?.startedAt ?? 0}:${flash?.minutes ?? 0}`;
    void revision;
    return computeStudyTotals(sessionsForOwner(readStudySessions(), studyOwnerEmail));
  }, [studyTick, session, flash, studyOwnerEmail]);

  const isRunning = Boolean(session);
  const activeMode: FocusMode = session ? session.mode : mode;
  const sessionMinutes = session ? focusElapsedMinutes(session, now) : 0;
  const todayStudyMinutes = totals.todayMinutes + (session?.mode === 'work' ? sessionMinutes : 0);
  const clockLabel = session
    ? focusClockLabel(session, now)
    : activeMode === 'work'
      ? '00:00'
      : `${String(FOCUS_BREAK_MINUTES).padStart(2, '0')}:00`;
  const progressPercent = activeMode === 'work'
    ? Math.min(100, (todayStudyMinutes / FOCUS_DAILY_GOAL_MINUTES) * 100)
    : session
      ? focusProgressPercent(session, now)
      : 0;
  const rewardState = readStudyGoalRewardState(studyOwnerEmail, now);

  const handleStart = () => {
    startFocusSession(mode, userEmail);
    setSession(readFocusSession());
    setNow(Date.now());
  };

  const handleStop = () => {
    /* Một luồng duy nhất: FocusSessionWatcher dừng phiên + ghi phút thật. */
    requestFocusStop();
    setNow(Date.now());
  };

  const handleSwitchMode = (next: FocusMode) => {
    if (activeMode === next) return;
    if (isRunning) requestFocusStop();
    setSession(null);
    setMode(next);
    setNow(Date.now());
  };

  const handleToggleAudio = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      if (!audioCtxRef.current && typeof window !== 'undefined') {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
    } catch {
      /* Thiết bị không cho phát audio — bỏ qua, HUD vẫn chạy */
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
        .catch(() => {});
    }
  };

  const handleClearNotes = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ ghi chú tập trung?')) {
      setNotes('');
    }
  };

  const studyStats = [
    { id: 'today', label: 'Hôm nay', value: formatDuration(totals.todayMinutes), icon: <Timer className="w-3.5 h-3.5" />, tone: 'text-cyan-300' },
    { id: 'week', label: 'Tuần này', value: `${(totals.weekMinutes / 60).toFixed(1)} giờ`, icon: <CalendarDays className="w-3.5 h-3.5" />, tone: 'text-amber-300' },
    { id: 'month', label: 'Tháng này', value: `${(totals.monthMinutes / 60).toFixed(1)} giờ`, icon: <TrendingUp className="w-3.5 h-3.5" />, tone: 'text-emerald-300' },
    { id: 'streak', label: 'Chuỗi ngày học', value: `${totals.streakDays} ngày`, icon: <Flame className="w-3.5 h-3.5" />, tone: 'text-rose-300' },
  ];

  return (
    <div className="ff-focus-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl animate-fade-up">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="ff-focus-panel liquid-glass w-full max-w-4xl rounded-3xl bg-neutral-950/95 border border-cyan-400/30 shadow-[0_0_80px_rgba(6,182,212,0.25)] p-5 sm:p-7 relative flex flex-col max-h-[92vh] overflow-y-auto">
        {/* HUD Top Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <BrainCircuit className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">PHÒNG TẬP TRUNG</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  STOPWATCH · 25 / 60 / 120′
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                    isRunning
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40'
                      : 'bg-white/5 text-neutral-400 border-white/10'
                  }`}
                >
                  {isRunning ? 'ĐANG HỌC' : 'SẴN SÀNG'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono truncate">
                Học tự do, dừng khi bạn muốn · đóng cửa sổ vẫn giữ phiên và thời gian thật
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleToggleAudio}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border transition-all ${
                isAudioPlaying
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white'
              }`}
              title={isAudioPlaying ? 'Tắt âm hưởng Lofi' : 'Bật âm hưởng Lofi'}
            >
              {isAudioPlaying ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline font-mono">{isAudioPlaying ? 'Lofi Playing' : 'Lofi Muted'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              title="Đóng HUD (phiên học vẫn tiếp tục)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dải liên kết với NHẬT KÝ GIỜ HỌC — số giờ thật, cập nhật ngay khi ghi */}
        <div className="shrink-0 mb-5 rounded-2xl border border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-transparent p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-300">
              <Clock className="w-3.5 h-3.5" /> Nhật ký giờ học
            </span>
            {session && session.mode === 'work' && (
              <span className="ff-focus-live inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-300">
                Phiên này +{sessionMinutes}′
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5">
            {studyStats.map((s) => (
              <div key={s.id} className="rounded-xl bg-black/30 border border-white/8 px-3 py-2">
                <span className={`inline-flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-wide ${s.tone}`}>
                  {s.icon}
                  {s.label}
                </span>
                <p className="text-sm font-extrabold text-white mt-1 font-mono">{s.value}</p>
              </div>
            ))}
          </div>
          {flash && (
            <p className="ff-focus-flash mt-2.5 text-[11px] font-semibold text-emerald-300 inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              Đã ghi +{flash.minutes} phút vào nhật ký · hôm nay {formatDuration(flash.total)}.
            </p>
          )}
        </div>

        {/* HUD Center: Stopwatch + Scratchpad */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch">
          {/* Left: free-running stopwatch */}
          <div className="lg:col-span-6 flex flex-col items-center justify-between p-6 rounded-3xl bg-neutral-900/60 border border-white/10 shadow-inner space-y-6">
            <div className="flex items-center bg-black/60 p-1.5 rounded-full border border-white/15 w-full max-w-xs justify-center">
              <button
                onClick={() => handleSwitchMode('work')}
                className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeMode === 'work' ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.6)]' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                <span>Học tự do</span>
              </button>
              <button
                onClick={() => handleSwitchMode('break')}
                className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeMode === 'break' ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.6)]' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Nghỉ Ngơi (5m)</span>
              </button>
            </div>

            <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" className="stroke-neutral-800" strokeWidth="5" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className={`transition-all duration-500 ${activeMode === 'work' ? 'stroke-cyan-400' : 'stroke-purple-400'}`}
                  strokeWidth="5"
                  strokeDasharray={264}
                  strokeDashoffset={264 - (264 * progressPercent) / 100}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                  {clockLabel}
                </span>
                <span className="text-xs font-mono font-semibold uppercase tracking-widest text-cyan-300 mt-1">
                  {activeMode === 'work' ? 'STOPWATCH · HỌC TỰ DO' : 'RECHARGE BREAK'}
                </span>
                <span className="text-[11px] text-neutral-400 font-mono mt-0.5">
                  {isRunning
                    ? activeMode === 'work'
                      ? `Phiên này ${sessionMinutes} phút · hôm nay ${formatDuration(todayStudyMinutes)}`
                      : 'Đang nghỉ 5 phút'
                    : activeMode === 'work'
                      ? `Hôm nay ${formatDuration(todayStudyMinutes)} · dừng lúc nào cũng được`
                      : 'Nghỉ 5 phút'}
                </span>
              </div>
            </div>

            <div className="w-full space-y-2.5">
              <div className="grid grid-cols-3 gap-2" aria-label="Mục tiêu học tập và thưởng Coin hôm nay">
                {STUDY_GOAL_REWARD_MILESTONES.map((goal) => {
                  const reached = todayStudyMinutes >= goal.minutes;
                  const claimed = rewardState.claimedMinutes.includes(goal.minutes);
                  const percent = Math.min(100, (todayStudyMinutes / goal.minutes) * 100);
                  return (
                    <div
                      key={goal.minutes}
                      className={`rounded-2xl border p-2.5 transition-all ${
                        claimed
                          ? 'border-amber-300/40 bg-amber-400/10 shadow-[0_0_18px_rgba(251,191,36,0.08)]'
                          : reached
                            ? 'border-emerald-300/35 bg-emerald-400/10'
                            : 'border-white/10 bg-black/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-black text-white">{goal.minutes}′</span>
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-200">
                          <Coins className="w-3 h-3" />+{goal.coins}
                        </span>
                      </div>
                      <div
                        className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden"
                        role="progressbar"
                        aria-label={`Tiến độ mục tiêu ${goal.minutes} phút`}
                        aria-valuemin={0}
                        aria-valuemax={goal.minutes}
                        aria-valuenow={Math.min(goal.minutes, todayStudyMinutes)}
                      >
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-cyan-400 to-amber-300 transition-[width] duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <small className="mt-1.5 block text-[9px] text-neutral-400">
                        {claimed
                          ? 'Đã nhận hôm nay'
                          : reached
                            ? userEmail
                              ? 'Mốc đạt · đang ghi thưởng'
                              : 'Mốc đạt · đăng nhập nhận Coin'
                            : `Còn ${Math.ceil(goal.minutes - todayStudyMinutes)} phút`}
                      </small>
                    </div>
                  );
                })}
              </div>
              <p className="text-[9.5px] text-neutral-400 text-center leading-relaxed">
                Mốc ngày cộng thêm +25, +35, +60 Coin · tối đa 120 Coin/ngày · mỗi mốc chỉ nhận một lần.
              </p>
            </div>

            <div className="w-full space-y-3">
              <button
                onClick={isRunning ? handleStop : handleStart}
                className={`w-full px-8 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xl active:scale-[0.98] ${
                  isRunning
                    ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                    : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black hover:opacity-95 shadow-[0_0_20px_rgba(6,182,212,0.5)]'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>DỪNG PHIÊN (ghi phần đã học)</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>BẮT ĐẦU TẬP TRUNG</span>
                  </>
                )}
              </button>

              <p className="text-[10.5px] text-neutral-400 text-center leading-relaxed font-mono">
                Bấm bắt đầu rồi dừng bất cứ lúc nào: nhật ký ghi số phút thực học (từ 1 phút), không bắt buộc đủ 25′.
                Coin tính theo tổng giờ học trong ngày; mỗi mốc chỉ nhận một lần.
              </p>
            </div>
          </div>

          {/* Right: Scratchpad */}
          <div className="lg:col-span-6 flex flex-col p-5 rounded-3xl bg-neutral-900/60 border border-white/10 shadow-inner">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <NotebookPen className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  SỔ TAY NHANH · DÙNG CHUNG VỚI CTRL + I
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

            <div className="flex-1 flex flex-col">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={5000}
                placeholder="Ghi nhanh công thức toán lý, ý tưởng bài giảng, link tham khảo hoặc kế hoạch học tập trong phiên tập trung này..."
                className="w-full flex-1 min-h-[160px] bg-black/40 border border-white/10 rounded-2xl p-3.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-cyan-400 transition-colors resize-none font-mono leading-relaxed"
              />
              <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono pt-2">
                <span>Tự động lưu vào bộ nhớ trình duyệt</span>
                <span>{notes.length} ký tự</span>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-200 flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-[11px] leading-relaxed">
                Nhật ký giờ học ghi thời gian thực khi bạn dừng đồng hồ; 25′, 60′ và 120′ là{' '}
                <b className="text-white">mốc mục tiêu theo ngày</b>, không phải độ dài phiên bắt buộc.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FocusSanctuary: React.FC<FocusSanctuaryProps> = ({ isOpen, onClose, userEmail }) => {
  if (!isOpen) return null;
  return <FocusSanctuaryInner onClose={onClose} userEmail={userEmail} />;
};

export default FocusSanctuary;
