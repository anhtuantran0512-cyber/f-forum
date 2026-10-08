/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Play,
  Pause,

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
  Target,
} from 'lucide-react';
import { CircularProgressRing } from './CircularProgressRing';
import { safeStorage } from '../utils/storage';
import { computeStudyTotals, formatDuration, readStudySessions, sessionsForOwner } from '../utils/studyLog';
import {
  FOCUS_BREAK_MINUTES,
  FOCUS_CREDITED_EVENT,
  FOCUS_REWARD_MINIMUM_MINUTES,
  FOCUS_WORK_MINUTES,
  focusElapsedMinutes,
  focusProgressPercent,
  focusRemainingLabel,
  readFocusSession,
  requestFocusStop,
  startFocusSession,
  subscribeFocusSession,
  type FocusMode,
  type FocusSessionState,
} from '../utils/focusSession';

interface FocusSanctuaryProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRewardSession?: (targetMinutes: number) => Promise<string | null>;
  /** Email người đang học — dùng để ghi giờ học vào đúng tài khoản. */
  userEmail?: string;
}

/* --------------------------------------------------------------------------
   Phòng Tập Trung (Pomodoro)
   Đồng hồ KHÔNG còn tự đếm bằng setInterval bên trong HUD nữa: phiên học là
   một mốc thời gian thật lưu ở localStorage (utils/focusSession) và được
   FocusSessionWatcher ghi nhận ở cấp App. Nhờ vậy đóng HUD, đổi phân khu hay
   để tab chạy nền thì phiên vẫn chạy đúng và giờ học vẫn vào nhật ký.
   -------------------------------------------------------------------------- */
const FocusSanctuaryInner: React.FC<{
  onClose: () => void;
  onStartRewardSession?: (targetMinutes: number) => Promise<string | null>;
  userEmail?: string;
}> = ({ onClose, onStartRewardSession, userEmail }) => {
  const [mode, setMode] = useState<FocusMode>('work');
  const [targetMinutes, setTargetMinutes] = useState(25);
  const [session, setSession] = useState<FocusSessionState | null>(() => readFocusSession());
  const [isStarting, setIsStarting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [flash, setFlash] = useState<{ minutes: number; total: number } | null>(null);

  const [notes, setNotes] = useState(() => safeStorage.getItem('fforum_focus_scratchpad') || '');
  const [copied, setCopied] = useState(false);
  const [studyTick, setStudyTick] = useState(0);

  useEffect(() => {
    safeStorage.setItem('fforum_focus_scratchpad', notes);
  }, [notes]);

  /* Theo dõi phiên học dùng chung + nhật ký giờ học */
  useEffect(() => subscribeFocusSession(() => setSession(readFocusSession())), []);
  useEffect(() => {
    const sync = () => setStudyTick((n) => n + 1);
    window.addEventListener('fforum_study_sync', sync);
    return () => window.removeEventListener('fforum_study_sync', sync);
  }, []);

  /* Khi FocusSessionWatcher ghi xong một phiên: hiện dải "đã ghi" và gợi ý nghỉ */
  useEffect(() => {
    const onCredited = (event: Event) => {
      const detail = (event as CustomEvent<{ minutes: number }>).detail;
      const minutes = detail?.minutes || FOCUS_WORK_MINUTES;
      const total = computeStudyTotals(readStudySessions()).todayMinutes;
      setFlash({ minutes, total });
      setMode('break');
      window.setTimeout(() => setFlash(null), 9000);
    };
    window.addEventListener(FOCUS_CREDITED_EVENT, onCredited);
    return () => window.removeEventListener(FOCUS_CREDITED_EVENT, onCredited);
  }, []);

  /* Nhịp 500ms chỉ để vẽ lại; thời gian luôn suy từ Date.now() */
  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [session]);

  const totals = useMemo(() => {
    /* `session` và `flash` chỉ để ép tính lại số liệu ngay khi phiên vừa được ghi */
    const revision = `${studyTick}:${session?.startedAt ?? 0}:${flash?.minutes ?? 0}`;
    void revision;
    return computeStudyTotals(sessionsForOwner(readStudySessions(), userEmail));
  }, [studyTick, session, flash, userEmail]);

  const isRunning = Boolean(session);
  const activeMode: FocusMode = session ? session.mode : mode;
  const remainingLabel = session ? focusRemainingLabel(session, now) : `${String(activeMode === 'work' ? targetMinutes : FOCUS_BREAK_MINUTES).padStart(2, '0')}:00`;
  const progressPercent = session ? focusProgressPercent(session, now) : 0;
  const sessionMinutes = session ? focusElapsedMinutes(session, now) : 0;
  const rewardMilestone = targetMinutes >= 120
    ? { minutes: 120, reward: 120, label: 'Rương Huyền Bí' }
    : targetMinutes >= 60
      ? { minutes: 60, reward: 60, label: 'Hộp Quà Nhỏ' }
      : targetMinutes >= 25
        ? { minutes: 25, reward: 25, label: 'Mốc khởi động' }
        : null;

  const milestoneActive = targetMinutes >= FOCUS_REWARD_MINIMUM_MINUTES && flash !== null;

  const handleStart = async () => {
    if (isStarting) return;
    setIsStarting(true);
    let serverSessionId: string | null = null;
    try {
      if (mode === 'work' && targetMinutes >= FOCUS_REWARD_MINIMUM_MINUTES && userEmail && onStartRewardSession) {
        serverSessionId = await onStartRewardSession(targetMinutes);
      }
    } catch {
      serverSessionId = null;
    } finally {
      startFocusSession(mode, userEmail, serverSessionId, targetMinutes);
      setSession(readFocusSession());
      setNow(Date.now());
      setIsStarting(false);
    }
  };

  const handleStop = () => {
    /* Một luồng duy nhất: FocusSessionWatcher dừng phiên + ghi số phút thực học */
    requestFocusStop();
    setNow(Date.now());
  };

  const handleSwitchMode = (next: FocusMode) => {
    if (isRunning) requestFocusStop();
    setSession(null);
    setMode(next);
    setNow(Date.now());
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#06101c]/95 backdrop-blur-xl animate-fade-up">
      <div className="liquid-glass w-full max-w-5xl rounded-2xl bg-[linear-gradient(145deg,rgba(10,25,42,0.98),rgba(5,12,24,0.98))] border border-cyan-300/25 shadow-[0_24px_80px_rgba(0,0,0,0.48)] p-5 sm:p-7 relative flex flex-col max-h-[92vh] overflow-y-auto">
        {/* HUD Top Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-300/30 flex items-center justify-center text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">PHÒNG TẬP TRUNG</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  {targetMinutes} / {FOCUS_BREAK_MINUTES} MIN
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
                Đóng cửa sổ này vẫn KHÔNG mất phiên học — đồng hồ chạy theo thời gian thật
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">

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
        <div className="shrink-0 mb-5 rounded-xl border border-cyan-300/15 bg-[#0d2034]/70 p-3">
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
          </div>              {flash && (
            <p className="ff-focus-flash mt-2.5 text-[11px] font-semibold text-emerald-300 inline-flex items-center gap-1.5 flex-wrap">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Đã ghi +{flash.minutes} phút vào nhật ký · hôm nay {formatDuration(flash.total)}. Nghỉ 5 phút rồi học tiếp nhé!</span>
              {flash.minutes >= 120 ? <span className="text-amber-300 font-bold ml-1">Mốc 120p: +120 Coin và Rương Huyền Bí. 🎉</span> :
               flash.minutes >= 60 ? <span className="text-amber-300 font-bold ml-1">Mốc 60p: +60 Coin và Hộp Quà Nhỏ. 🎁</span> :
               flash.minutes >= 25 ? <span className="text-amber-300 font-bold ml-1">Mốc 25p: +25 Coin. ⚡</span> : null}
            </p>
          )}
        </div>

        {/* HUD Center: Pomodoro + Scratchpad */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch">
          {/* Left: Pomodoro */}
          <div className="lg:col-span-7 flex flex-col items-center justify-between p-6 rounded-2xl bg-[#071727]/75 border border-white/10 shadow-inner space-y-6">
            <div className="flex items-center bg-[#06101c] p-1.5 rounded-xl border border-white/10 w-full max-w-xs justify-center">
              <button
                onClick={() => handleSwitchMode('work')}
                className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeMode === 'work' ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.6)]' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                <span>Học Tập ({targetMinutes}m)</span>
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

            <div className="relative flex items-center justify-center w-64 h-64 sm:w-72 sm:h-72">
              <CircularProgressRing
                progress={progressPercent}
                size={isRunning ? 280 : 220}
                strokeWidth={6}
                label={remainingLabel}
                milestone={milestoneActive ? {
                  reached: flash !== null,
                  label: flash ? `Đã hoàn thành! +${flash.minutes}m` : rewardMilestone?.label || '',
                  minutes: flash?.minutes || rewardMilestone?.minutes || 0,
                } : undefined}
                className="relative z-10"
              />

              {/* Background decorative orbs (Aurora Mesh - lightweight) */}
              {isRunning && activeMode === 'work' && (
                <>
                  <div
                    className="absolute w-40 h-40 rounded-full blur-3xl pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle, rgba(6,182,212,0.2), transparent 70%)',
                      top: '-20%',
                      right: '-10%',
                      animation: 'potatorMeshDrift 8s ease-in-out infinite',
                    }}
                  />
                  <div
                    className="absolute w-32 h-32 rounded-full blur-3xl pointer-events-none"
                    style={
                      {
                        background: 'radial-gradient(circle, rgba(168,85,247,0.15), transparent 70%)',
                        bottom: '-15%',
                        left: '-5%',
                        animation: 'potatorMeshDrift 12s ease-in-out infinite reverse',
                      }
                    }
                  />
                </>
              )}
            </div>

            {/* Milestone reward display */}
            {milestoneActive && flash && (
              <div className="w-full max-w-sm mx-auto animate-[fadeRise_0.5s_ease-out_forwards]">
                <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 via-pink-500/15 to-violet-500/20 border border-amber-400/30 p-4 text-center backdrop-blur-md">
                  <div className="flex items-center justify-center gap-2 text-amber-300 font-bold">
                    <Sparkles className="w-5 h-5" />
                    <span className="text-sm uppercase tracking-widest">{flash.minutes} phút — {rewardMilestone?.label}</span>
                  </div>
                  <p className="text-2xl font-extrabold text-white mt-1">+{flash.minutes} Coin</p>
                  <p className="text-xs text-neutral-400 mt-1">Đã ghi vào nhật ký giờ học</p>
                </div>
              </div>
            )}

            {!isRunning && activeMode === 'work' && (
              <div className="w-full px-4 flex flex-col gap-1.5 mt-[-10px] z-10">
                <div className="flex justify-between text-[10px] font-mono text-cyan-300/80 font-semibold px-1">
                  <span>5m</span>
                  <span>120m</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={targetMinutes}
                  onChange={(e) => setTargetMinutes(Number(e.target.value))}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300"
                />
              </div>
            )}

            {activeMode === 'work' && (
              <div className="grid grid-cols-3 gap-2 w-full max-w-md" aria-label="Mốc phần thưởng Coin">
                {[25, 60, 120].map((minutes) => {
                  const active = targetMinutes >= minutes;
                  return (
                    <div key={minutes} className={`rounded-xl border px-2 py-2 text-center transition-colors ${active ? 'border-amber-300/45 bg-amber-400/10 text-amber-200' : 'border-white/10 bg-white/[0.03] text-white/45'}`}>
                      <div className="flex items-center justify-center gap-1 text-[10px] font-bold"><Target className="w-3 h-3" />{minutes}m</div>
                      <div className="mt-0.5 text-[11px] font-extrabold">+{minutes} Coin</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="w-full space-y-3">
              <button
                onClick={isRunning ? handleStop : () => { void handleStart(); }}
                disabled={!isRunning && isStarting}
                aria-busy={!isRunning && isStarting}
                className={`w-full px-8 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xl active:scale-[0.98] disabled:opacity-60 ${
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
                    <span>{isStarting ? 'ĐANG MỞ PHIÊN...' : 'BẮT ĐẦU TẬP TRUNG'}</span>
                  </>
                )}
              </button>

              <p className="text-[10.5px] text-neutral-400 text-center leading-relaxed font-mono">
                Học đủ {targetMinutes} phút sẽ ghi vào nhật ký. {rewardMilestone ? <><b className="text-amber-300"> Mốc hiện tại: +{rewardMilestone.reward} Coin</b> · {rewardMilestone.label}.</> : ' Từ 25 phút sẽ mở phần thưởng Coin.'}
              </p>
            </div>
          </div>

          {/* Right: Scratchpad */}
          <div className="lg:col-span-5 flex flex-col p-5 rounded-2xl bg-[#071727]/75 border border-white/10 shadow-inner">
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
                placeholder="Ghi nhanh công thức toán lý, ý tưởng bài giảng, link tham khảo hoặc kế hoạch học tập trong phiên Pomodoro này..."
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
                Giờ học chỉ đến từ phòng này — hoàn thành phiên 25 phút để leo{' '}
                <b className="text-white">bảng xếp hạng Giờ học</b> và giữ chuỗi ngày học.
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
  onStartRewardSession,
  userEmail,
}) => {
  if (!isOpen) return null;
  return (
    <FocusSanctuaryInner
      onClose={onClose}
      onStartRewardSession={onStartRewardSession}
      userEmail={userEmail}
    />
  );
};

export default FocusSanctuary;
