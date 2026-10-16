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
import { CelebrationBurst } from './CelebrationBurst';
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
import { OrbButton } from './ui/OrbButton';
import { SHOP_ITEMS } from '../utils/shopData';
import './FocusTheme.css';

interface FocusSanctuaryProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRewardSession?: (targetMinutes: number) => Promise<string | null>;
  /** Email người đang học — dùng để ghi giờ học vào đúng tài khoản. */
  userEmail?: string;
  equippedItemId?: string;
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
  equippedItemId?: string;
}> = ({ onClose, onStartRewardSession, userEmail, equippedItemId }) => {
  const [mode, setMode] = useState<FocusMode>('work');
  const [targetMinutes, setTargetMinutes] = useState(25);
  const [session, setSession] = useState<FocusSessionState | null>(() => readFocusSession());
  const [isStarting, setIsStarting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [flash, setFlash] = useState<{ minutes: number; total: number } | null>(null);
  /* Hiệu ứng confetti (bể hạt ánh sáng) khi đạt mốc 25/60/120 phút */
  const [burstTick, setBurstTick] = useState(0);
  const [burstHeadline, setBurstHeadline] = useState('');

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

  /* Khi FocusSessionWatcher ghi xong một phiên: hiện dải "đã ghi", gợi ý nghỉ
     và BẮN CONFETTI nếu đạt mốc phần thưởng (25/60/120 phút). */
  useEffect(() => {
    const onCredited = (event: Event) => {
      const detail = (event as CustomEvent<{ minutes: number }>).detail;
      const minutes = detail?.minutes || FOCUS_WORK_MINUTES;
      const total = computeStudyTotals(readStudySessions()).todayMinutes;
      setFlash({ minutes, total });
      setMode('break');
      if (minutes >= 25) {
        setBurstTick((n) => n + 1);
        setBurstHeadline(`Mốc ${minutes} phút · +${minutes} Coin`);
      }
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
    { id: 'today', label: 'Hôm nay', value: formatDuration(totals.todayMinutes), icon: <Timer className="w-3.5 h-3.5" />, tone: 'text-[#81b29a]' },
    { id: 'week', label: 'Tuần này', value: `${(totals.weekMinutes / 60).toFixed(1)} giờ`, icon: <CalendarDays className="w-3.5 h-3.5" />, tone: 'text-amber-300' },
    { id: 'month', label: 'Tháng này', value: `${(totals.monthMinutes / 60).toFixed(1)} giờ`, icon: <TrendingUp className="w-3.5 h-3.5" />, tone: 'text-emerald-300' },
    { id: 'streak', label: 'Chuỗi ngày học', value: `${totals.streakDays} ngày`, icon: <Flame className="w-3.5 h-3.5" />, tone: 'text-rose-300' },
  ];

  const focusTheme = SHOP_ITEMS.find(item => item.id === equippedItemId && item.category === 'Theme Focus');
  return (
    <div className={`focus-signature ${focusTheme ? `focus-signature--${focusTheme.id}` : ''} fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#0b0d12]/90 backdrop-blur-xl animate-fade-up`}>
      {focusTheme && <span className="focus-signature__theme">{focusTheme.name}</span>}
      {/* Confetti toàn màn hình khi hoàn thành phiên ở mốc 25/60/120 phút */}
      <CelebrationBurst trigger={burstTick} tone="gold" headline={burstHeadline} />
      <div className="liquid-glass modal-container w-full max-w-5xl rounded-2xl p-5 sm:p-7 relative flex flex-col max-h-[92vh] overflow-y-auto">
        {/* HUD Top Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-dashed border-[#f4f1de]/15 mb-5 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#e07a5f]/20 border-[1.5px] border-[#e07a5f]/50 flex items-center justify-center text-[#f2cc8f] shadow-[2px_2px_0px_rgba(4,6,11,0.9)]">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="ff-typo-poster !text-base sm:!text-lg text-[#f4f1de] tracking-wide flex items-center gap-1">
                  <span className="ff-swash-cap text-lg">P</span>HÒNG TẬP TRUNG
                </h2>
                <span className="ff-atelier-ribbon !py-0.2 !px-1.5 !text-[8.5px]">
                  Học · Hỏi · Chia sẻ
                </span>
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-[#f2cc8f]/20 text-[#f2cc8f] border border-[#f2cc8f]/40">
                  {targetMinutes} / {FOCUS_BREAK_MINUTES} MIN
                </span>
                <span
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${
                    isRunning
                      ? 'bg-[#81b29a]/20 text-[#d8f3dc] border-[#81b29a]/45'
                      : 'bg-white/5 text-[#9a978e] border-white/10'
                  }`}
                >
                  {isRunning ? 'ĐANG HỌC' : 'SẴN SÀNG'}
                </span>
              </div>
              {/* Đóng cửa sổ này vẫn KHÔNG mất phiên học — đồng hồ chạy theo thời gian thật */}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">

            <button
              onClick={onClose}
              className="ff-tactile-btn p-2 rounded-lg bg-[#0b0d12] border border-[#f4f1de]/18 text-[#d8d5ce] hover:text-[#f4f1de] transition-colors cursor-pointer"
              title="Đóng HUD (phiên học vẫn tiếp tục)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dải liên kết với NHẬT KÝ GIỜ HỌC — số giờ thật, cập nhật ngay khi ghi */}
        <div className="shrink-0 mb-5 rounded-xl border-[1.5px] border-[#f4f1de]/14 bg-[#0b0d12]/80 p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#f2cc8f]">
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
              <div key={s.id} className="rounded-xl bg-[#151a26] border border-[#f4f1de]/12 px-3 py-2">
                <span className={`inline-flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-wide ${s.tone}`}>
                  {s.icon}
                  {s.label}
                </span>
                <p className="text-sm font-extrabold text-[#f4f1de] mt-1 font-mono">{s.value}</p>
              </div>
            ))}
          </div>              {flash && (
            <p className="ff-focus-flash mt-2.5 text-[11px] font-semibold text-emerald-300 inline-flex items-center gap-1.5 flex-wrap">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Đã ghi +{flash.minutes} phút ({formatDuration(flash.total)} hôm nay).</span>
              {flash.minutes >= 120 ? <span className="text-amber-300 font-bold ml-1">+120 Coin &amp; Rương Huyền Bí</span> :
               flash.minutes >= 60 ? <span className="text-amber-300 font-bold ml-1">+60 Coin &amp; Hộp Quà Nhỏ</span> :
               flash.minutes >= 25 ? <span className="text-amber-300 font-bold ml-1">+25 Coin</span> : null}
            </p>
          )}
        </div>

        {/* HUD Center: Pomodoro + Scratchpad */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch">
          {/* Left: Pomodoro */}
          <div className="lg:col-span-7 flex flex-col items-center justify-between p-6 rounded-xl bg-[#0b0d12]/80 border-[1.5px] border-[#f4f1de]/14 space-y-6">
            <div className="flex items-center gap-1.5 bg-[#151a26] p-1.5 rounded-xl border border-[#f4f1de]/14 w-full max-w-xs justify-center">
              <button
                onClick={() => handleSwitchMode('work')}
                className={`ff-tactile-btn flex-1 py-1.5 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  activeMode === 'work' ? 'bg-[#f4f1de] text-[#0b0d12] border-[#0b0d12]' : 'text-[#9a978e] hover:text-[#f4f1de] border-transparent'
                }`}
              >
                <Timer className="w-3.5 h-3.5 text-[#e07a5f]" />
                <span>Học ({targetMinutes}m)</span>
              </button>
              <button
                onClick={() => handleSwitchMode('break')}
                className={`ff-tactile-btn flex-1 py-1.5 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  activeMode === 'break' ? 'bg-[#81b29a] text-[#0b0d12] border-[#0b0d12]' : 'text-[#9a978e] hover:text-[#f4f1de] border-transparent'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Nghỉ (5m)</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center w-64 h-64 sm:w-72 sm:h-72">
              <CircularProgressRing
                progress={progressPercent}
                size={isRunning ? 280 : 220}
                strokeWidth={6}
                breathing={isRunning && activeMode === 'work'}
                label={remainingLabel}
                flip
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
                      background: 'radial-gradient(circle, rgba(224,122,95,0.2), transparent 70%)',
                      top: '-20%',
                      right: '-10%',
                      animation: 'ffOrbDrift 8s ease-in-out infinite',
                    }}
                  />
                  <div
                    className="absolute w-32 h-32 rounded-full blur-3xl pointer-events-none"
                    style={
                      {
                        background: 'radial-gradient(circle, rgba(129,178,154,0.15), transparent 70%)',
                        bottom: '-15%',
                        left: '-5%',
                        animation: 'ffOrbDrift 12s ease-in-out infinite reverse',
                      }
                    }
                  />
                </>
              )}
            </div>

            {/* Milestone reward display */}
            {milestoneActive && flash && (
              <div className="w-full max-w-sm mx-auto animate-[fadeRise_0.5s_ease-out_forwards]">
                <div className="rounded-xl bg-[#151a26] border border-[#f2cc8f]/40 p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-[#f2cc8f] font-bold">
                    <Sparkles className="w-5 h-5" />
                    <span className="text-sm uppercase tracking-widest">{flash.minutes} phút — {rewardMilestone?.label}</span>
                  </div>
                  <p className="text-2xl font-extrabold text-[#f4f1de] mt-1">+{flash.minutes} Coin</p>
                  <p className="text-xs text-[#9a978e] mt-1">Đã ghi vào nhật ký giờ học</p>
                </div>
              </div>
            )}

            {!isRunning && activeMode === 'work' && (
              <div className="w-full px-4 flex items-center gap-3 mt-[-10px] z-10">
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={targetMinutes}
                  onChange={(e) => setTargetMinutes(Number(e.target.value))}
                  aria-label="Mục tiêu thời gian (phút)"
                  className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#e07a5f] hover:accent-[#f2cc8f]"
                />
                {/* Nhập số trực tiếp — tối thiểu 5 phút theo spec */}
                <input
                  type="number"
                  min={5}
                  max={120}
                  step={5}
                  maxLength={3}
                  value={targetMinutes}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) setTargetMinutes(Math.min(120, Math.max(5, v)));
                  }}
                  aria-label="Nhập số phút trực tiếp"
                  className="w-14 px-2 py-1 rounded-lg bg-[#151a26] border border-[#f4f1de]/18 text-center text-xs font-mono font-bold text-[#f2cc8f] focus:outline-none focus:border-[#f2cc8f]"
                />
                <span className="text-[10px] font-mono text-[#f2cc8f] font-semibold">phút</span>
              </div>
            )}

            {activeMode === 'work' && (
              <div className="grid grid-cols-3 gap-2 w-full max-w-md" aria-label="Mốc phần thưởng Coin">
                {[25, 60, 120].map((minutes) => {
                  const active = targetMinutes >= minutes;
                  return (
                    <div key={minutes} className={`rounded-xl border px-2 py-2 text-center transition-colors ${active ? 'border-[#f2cc8f]/45 bg-[#f2cc8f]/12 text-[#f2cc8f]' : 'border-white/10 bg-white/[0.03] text-white/45'}`}>
                      <div className="flex items-center justify-center gap-1 text-[10px] font-bold"><Target className="w-3 h-3" />{minutes}m</div>
                      <div className="mt-0.5 text-[11px] font-extrabold">+{minutes} Coin</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="w-full">
              <button
                onClick={isRunning ? handleStop : () => { void handleStart(); }}
                disabled={!isRunning && isStarting}
                aria-busy={!isRunning && isStarting}
                className={`ff-tactile-btn w-full px-8 py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all border-2 border-[#0b0d12] disabled:opacity-60 cursor-pointer ${
                  isRunning
                    ? 'bg-[#f2cc8f] text-[#0b0d12] hover:bg-[#f4f1de]'
                    : 'bg-[#f4f1de] text-[#0b0d12] hover:bg-[#f2cc8f]'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4 fill-current text-[#e07a5f]" />
                    <span>Dừng</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current text-[#e07a5f]" />
                    <span>{isStarting ? 'Đang mở...' : 'Bắt đầu'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Scratchpad */}
          <div className="lg:col-span-5 flex flex-col p-5 rounded-xl bg-[#0b0d12]/80 border-[1.5px] border-[#f4f1de]/14">
            <div className="flex items-center justify-between pb-3 border-b border-dashed border-[#f4f1de]/15 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#f2cc8f]/15 border border-[#f2cc8f]/30 flex items-center justify-center text-[#f2cc8f]">
                  <NotebookPen className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-[#f4f1de] uppercase tracking-wider font-mono flex items-center gap-1">
                  <span className="ff-swash-cap text-xs">S</span>ổ tay tập trung
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <OrbButton
                  size="sm"
                  tone={copied ? 'mauve' : 'silver'}
                  motion={copied ? 'check' : 'fly'}
                  labelSide="left"
                  index={0}
                  label={copied ? 'Đã chép' : 'Sao chép'}
                  title="Sao chép"
                  icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  onClick={handleCopyNotes}
                />
                <OrbButton
                  size="sm"
                  tone="rose"
                  labelSide="left"
                  index={1}
                  label="Xóa"
                  title="Xóa"
                  icon={<Trash2 className="w-4 h-4" />}
                  onClick={handleClearNotes}
                  disabled={!notes}
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={5000}
                placeholder="Ghi chép công thức then chốt, ý tưởng cốt lõi hoặc câu hỏi cần đào sâu sau phiên học…"
                className="w-full flex-1 min-h-[160px] bg-[#151a26] border border-[#f4f1de]/15 rounded-xl p-3.5 text-xs text-[#f4f1de] placeholder-[#84817a] focus:outline-none focus:border-[#f2cc8f] transition-colors resize-none font-mono leading-relaxed"
              />
              <div className="flex items-center justify-between text-[10px] text-[#9a978e] font-mono pt-2">
                <span className="text-[10px] text-[#a39f96] truncate mr-2">
                  Chủ động ghi chép · Khắc sâu tri thức
                </span>
                <span className="shrink-0">{notes.length} / 5000 ký tự</span>
              </div>
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
  equippedItemId,
}) => {
  if (!isOpen) return null;
  return (
    <FocusSanctuaryInner
      onClose={onClose}
      onStartRewardSession={onStartRewardSession}
      userEmail={userEmail}
      equippedItemId={equippedItemId}
    />
  );
};

export default FocusSanctuary;
