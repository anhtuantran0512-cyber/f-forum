/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Lightbulb,
  Gift,
  Flame,
  CheckCircle2,
  Clock,
  HelpCircle,
  Calendar,
} from 'lucide-react';
import { safeStorage } from '../utils/storage';
import { SwipeDeck } from './ui/SwipeDeck';
import { StreakCountdown } from './engagement/StreakCountdown';
import { dailyTriviaForDate, dateKeyInTimeZone, shiftDateKey } from '../../shared/dailyTrivia';
import type { DailyRewardAction, DailyRewardActionResult, DailyRewardStatus } from '../types/rewards';

interface DailyEngagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  currentUserCoin?: number;
  onOpenLogin?: () => void;
  onLoadRewardStatus?: () => Promise<{ ok: boolean; status?: DailyRewardStatus; message?: string }>;
  onClaimReward?: (action: DailyRewardAction) => Promise<DailyRewardActionResult>;
}

/* Mẹo hằng ngày — hiển thị dạng chồng thẻ kéo-để-lướt (code_yeucau · stk-02). */
const TIPS: { id: string; title: string; body: string }[] = [
  { id: 'answer', title: 'Lời giải chỉn chu', body: 'Hãy trả lời chỉn chu và đầy đủ các bước giải để dễ nhận được xác nhận Đáp Án Chuẩn!' },
  { id: 'ask', title: 'Hỏi rõ ràng', body: 'Nên đặt câu hỏi một cách rõ ràng và cụ thể để nhận được câu trả lời nhanh nhất.' },
  { id: 'streak', title: 'Giữ lửa mỗi ngày', body: 'Điểm danh mỗi ngày tích lũy chuỗi streak và mở khóa hộp quà ở mốc 5, 10, 15 ngày.' },
  { id: 'share', title: 'Chia sẻ để thăng hạng', body: 'Chia sẻ lời giải hay trên sàn hỏi đáp giúp bạn tích lũy Coin và thăng hạng danh hiệu.' },
];

const todayISO = () => dateKeyInTimeZone();

/** Tính chuỗi ngày liên tiếp bằng ngày lịch Việt Nam, không phụ thuộc timezone trình duyệt. */
const computeStreak = (log: string[], today = todayISO()): number => {
  const set = new Set(log);
  let cursor = set.has(today) ? today : shiftDateKey(today, -1);
  if (!set.has(cursor)) return 0;
  let streak = 0;
  while (cursor && set.has(cursor) && streak < 400) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }
  return streak;
};

const loadAttendanceLog = (): string[] => {
  try {
    const saved = safeStorage.getItem('fforum_attendance_log');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d));
    }
  } catch {
    /* ignore */
  }
  return [];
};

export const DailyEngagementModal: React.FC<DailyEngagementModalProps> = ({
  isOpen,
  onClose,
  isAuthenticated,
  currentUserCoin = 0,
  onOpenLogin,
  onLoadRewardStatus,
  onClaimReward,
}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'gifts' | 'quiz'>('attendance');
  const [rewardDate, setRewardDate] = useState(todayISO());
  const [attendanceLog, setAttendanceLog] = useState<string[]>(loadAttendanceLog);
  const [boxes, setBoxes] = useState<{ blue: number; gold: number; red: number }>(() => {
    try {
      const saved = safeStorage.getItem('fforum_mystery_boxes');
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return { blue: 0, gold: 0, red: 0 };
  });
  const [quizAnswered, setQuizAnswered] = useState<boolean>(() =>
    safeStorage.getItem('fforum_last_quiz_date') === todayISO(),
  );
  const [quizTimer, setQuizTimer] = useState<number>(15);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<{ correct: boolean; reward: number } | null>(null);
  const [openingBox, setOpeningBox] = useState<string | null>(null);
  const [boxReward, setBoxReward] = useState<string | null>(null);
  const [isClaimingAttendance, setIsClaimingAttendance] = useState(false);
  const [actionError, setActionError] = useState('');

  const streak = useMemo(() => computeStreak(attendanceLog, rewardDate), [attendanceLog, rewardDate]);
  const hasClaimedToday = attendanceLog.includes(rewardDate);
  const cycleDay = Math.max(1, Math.min(15, streak === 0 && !hasClaimedToday ? 1 : streak));
  const dailyTrivia = useMemo(() => dailyTriviaForDate(rewardDate), [rewardDate]);

  const applyRewardStatus = useCallback((status: DailyRewardStatus): void => {
    const date = status.date || todayISO();
    setRewardDate(date);
    setAttendanceLog(status.attendanceDates);
    setBoxes(status.boxes);
    setQuizAnswered(status.quizAnswered);
    safeStorage.setItem('fforum_attendance_log', JSON.stringify(status.attendanceDates));
    safeStorage.setItem('fforum_mystery_boxes', JSON.stringify(status.boxes));
    safeStorage.setItem('fforum_last_quiz_date', status.quizAnswered ? date : '');
  }, []);

  const performClaim = useCallback(async (action: DailyRewardAction): Promise<DailyRewardActionResult> => {
    if (!isAuthenticated) {
      setActionError('Đăng nhập để lưu điểm danh và nhận Coin vào tài khoản.');
      onOpenLogin?.();
      return { ok: false, message: 'Vui lòng đăng nhập trước.' };
    }
    if (!onClaimReward) return { ok: false, message: 'Chức năng phần thưởng chưa sẵn sàng.' };
    try {
      const result = await onClaimReward(action);
      if (result.status) applyRewardStatus(result.status);
      if (!result.ok && result.httpStatus === 401) onOpenLogin?.();
      setActionError(result.ok ? '' : result.message || 'Máy chủ chưa ghi nhận phần thưởng.');
      return result;
    } catch {
      const result = { ok: false, message: 'Không kết nối được máy chủ. Vui lòng thử lại.' };
      setActionError(result.message);
      return result;
    }
  }, [isAuthenticated, onClaimReward, onOpenLogin, applyRewardStatus]);

  useEffect(() => {
    if (!isOpen || !isAuthenticated || !onLoadRewardStatus) return;
    let active = true;
    onLoadRewardStatus().then((result) => {
      if (!active) return;
      if (result.ok && result.status) {
        applyRewardStatus(result.status);
        setActionError('');
      } else if (result.message) {
        setActionError(result.message);
      }
    }).catch(() => {
      if (active) setActionError('Không kết nối được máy chủ để tải trạng thái phần thưởng.');
    });
    return () => { active = false; };
  }, [isOpen, isAuthenticated, onLoadRewardStatus, applyRewardStatus]);

  const handleAnswerQuiz = useCallback(async (index: number) => {
    if (quizAnswered || selectedOption !== null) return;
    setSelectedOption(index);
    const result = await performClaim({ action: 'quiz', answerIndex: index });
    if (!result.ok && !result.status?.quizAnswered) {
      setSelectedOption(null);
      return;
    }
    const correct = Boolean(result.correct);
    const reward = Math.max(0, Number(result.reward) || 0);
    setQuizResult({ correct, reward });
    setQuizAnswered(true);
    safeStorage.setItem('fforum_last_quiz_date', rewardDate);
  }, [quizAnswered, selectedOption, performClaim, rewardDate]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'quiz' || quizAnswered || selectedOption !== null) return;
    const timer = setInterval(() => {
      setQuizTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => { void handleAnswerQuiz(-1); }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, activeTab, quizAnswered, selectedOption, handleAnswerQuiz]);

  if (!isOpen) return null;

  const handleClaimAttendance = async () => {
    if (hasClaimedToday || isClaimingAttendance) return;
    setIsClaimingAttendance(true);
    await performClaim({ action: 'attendance' });
    setIsClaimingAttendance(false);
  };

  const handleOpenBox = (type: 'blue' | 'gold' | 'red') => {
    if (boxes[type] <= 0 || openingBox) return;
    setOpeningBox(type);
    setBoxReward(null);

    window.setTimeout(async () => {
      const result = await performClaim({ action: 'box', boxType: type });
      if (result.ok) setBoxReward(`+${result.reward || 0} Coin`);
      else setBoxReward('Chưa mở được hộp quà');
      setOpeningBox(null);
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-up"
      role="dialog"
      aria-modal="true"
      aria-label="Điểm danh và câu hỏi hằng ngày"
    >
      {/* Invisible backdrop */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Đóng bảng tương tác hàng ngày"
        className="fixed inset-0 bg-transparent border-none outline-none cursor-default"
        onClick={onClose}
      />

      <div className="liquid-glass w-full max-w-xl rounded-3xl bg-[#0c1218]/95 border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.9)] p-4 sm:p-6 relative z-10 overflow-hidden max-h-[95vh] overflow-y-auto">
        {/* Header Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
          <div className="flex items-center bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/10 gap-1 sm:gap-2">
            {(
              [
                { id: 'quiz', label: 'Câu hỏi vui' },
                { id: 'attendance', label: 'Điểm danh' },
                { id: 'gifts', label: 'Kho quà' },
              ] as const
            ).map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm transition-all relative cursor-pointer ${
                    isActive
                      ? 'bg-amber-400 text-neutral-950 font-black shadow-md border-b-4 border-amber-600'
                      : 'text-neutral-300 hover:text-white font-medium hover:bg-white/5'
                  }`}
                >
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mẹo hằng ngày: chồng thẻ kéo-để-lướt thay cho dải chữ tự chạy 1 dòng */}
        <div className="mb-4">
          <SwipeDeck
            label="Mẹo hằng ngày"
            items={TIPS.map((tip) => ({ ...tip, icon: <Lightbulb className="w-4 h-4" /> }))}
          />
        </div>

        {actionError && (
          <p className="mb-3 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200" role="alert">
            {actionError}
          </p>
        )}

        {/* TAB 1: ĐIỂM DANH */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-neutral-300">
              <span className="flex items-center gap-1.5 font-semibold text-white">
                <Calendar className="w-4 h-4 text-amber-400" />
                Chu kỳ điểm danh 15 ngày
              </span>
              <span className="text-[11px] text-amber-300 font-mono">
                Chuỗi streak: {streak} ngày 🔥
              </span>
            </div>

            {/* 3 rows x 5 cols grid */}
            <div className="grid grid-cols-5 gap-2.5 sm:gap-3">
              {Array.from({ length: 15 }, (_, i) => i + 1).map((day) => {
                const isAttended = day <= streak;
                const isActive = day === cycleDay && !hasClaimedToday;
                const isMilestone = day === 5 || day === 10 || day === 15;

                return (
                  <div
                    key={day}
                    className={`aspect-square rounded-2xl p-2 flex flex-col items-center justify-between relative transition-all ${
                      isActive
                        ? 'border-2 border-dashed border-amber-500 bg-amber-500/15 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                        : isAttended
                        ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                        : 'bg-white/5 border border-white/10 text-neutral-400'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-mono opacity-60">Ngày</span>
                    <span className="text-base sm:text-lg font-extrabold text-white">{day}</span>

                    {isMilestone && (
                      <div
                        className="absolute bottom-1 right-1 p-0.5 rounded-full"
                        title={`Hộp quà mốc ${day} ngày`}
                      >
                        <Gift
                          className={`w-3.5 h-3.5 ${
                            day === 5
                              ? 'text-cyan-400'
                              : day === 10
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        />
                      </div>
                    )}

                    {isAttended && !isMilestone && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                );
              })}
            </div>

            <StreakCountdown streak={streak} claimedToday={hasClaimedToday} />

            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs text-neutral-400">
                {hasClaimedToday
                  ? 'Hôm nay bạn đã điểm danh thành công!'
                  : 'Bấm điểm danh ngay để nhận +25 Coin.'}
              </span>
              <button
                type="button"
                onClick={handleClaimAttendance}
                disabled={hasClaimedToday || isClaimingAttendance}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Flame className="w-4 h-4 text-neutral-950" />
                <span>{isClaimingAttendance ? 'Đang ghi nhận...' : hasClaimedToday ? 'Đã điểm danh' : 'Điểm danh ngay'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: KHO QUÀ */}
        {activeTab === 'gifts' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-black/40 border-l-4 border-l-neutral-400 border border-white/10 text-xs text-neutral-300 space-y-1.5">
              <p className="font-semibold text-white">🎁 Chuỗi 5 · 10 · 15 ngày = 1 hộp quà Coin thật</p>
            </div>

            {/* 3 Isometric Gift Boxes */}
            <div className="grid grid-cols-3 gap-3">
              {/* Blue Box */}
              <div className="rounded-2xl p-3 bg-gradient-to-b from-cyan-950/40 to-black/60 border border-cyan-500/30 flex flex-col items-center text-center relative group">
                <div className="relative w-16 h-16 flex items-center justify-center mb-2">
                  <svg viewBox="0 0 64 64" className="w-14 h-14 drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]">
                    <defs>
                      <linearGradient id="blueBoxTop" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#0284c7" />
                      </linearGradient>
                      <linearGradient id="blueBoxLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0284c7" />
                        <stop offset="100%" stopColor="#0369a1" />
                      </linearGradient>
                      <linearGradient id="blueBoxRight" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0ea5e9" />
                        <stop offset="100%" stopColor="#0284c7" />
                      </linearGradient>
                    </defs>
                    <polygon points="32,8 54,20 32,32 10,20" fill="url(#blueBoxTop)" stroke="#7dd3fc" strokeWidth="1" />
                    <polygon points="10,20 32,32 32,54 10,42" fill="url(#blueBoxLeft)" stroke="#38bdf8" strokeWidth="1" />
                    <polygon points="32,32 54,20 54,42 32,54" fill="url(#blueBoxRight)" stroke="#38bdf8" strokeWidth="1" />
                    <path d="M26 12 C24 6 30 6 32 10 C34 6 40 6 38 12 C34 16 30 16 26 12 Z" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1" />
                  </svg>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-neutral-950 font-black font-mono text-[10px] flex items-center justify-center border border-amber-200 shadow-md">
                    {boxes.blue}
                  </span>
                </div>
                <span className="text-xs font-bold text-white">Hộp Xanh Lam</span>
                <span className="text-[10px] text-cyan-300 font-mono mt-0.5">Sở hữu: {boxes.blue}</span>
                <button
                  type="button"
                  onClick={() => handleOpenBox('blue')}
                  disabled={boxes.blue <= 0 || openingBox !== null}
                  className="mt-3 w-full py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black text-xs font-bold transition-all cursor-pointer"
                >
                  {openingBox === 'blue' ? 'Đang mở...' : 'Mở hộp'}
                </button>
              </div>

              {/* Gold Box */}
              <div className="rounded-2xl p-3 bg-gradient-to-b from-amber-950/40 to-black/60 border border-amber-500/30 flex flex-col items-center text-center relative group">
                <div className="relative w-16 h-16 flex items-center justify-center mb-2">
                  <svg viewBox="0 0 64 64" className="w-14 h-14 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                    <defs>
                      <linearGradient id="goldBoxTop" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fde047" />
                        <stop offset="100%" stopColor="#eab308" />
                      </linearGradient>
                      <linearGradient id="goldBoxLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ca8a04" />
                        <stop offset="100%" stopColor="#a16207" />
                      </linearGradient>
                      <linearGradient id="goldBoxRight" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#eab308" />
                        <stop offset="100%" stopColor="#ca8a04" />
                      </linearGradient>
                    </defs>
                    <polygon points="32,8 54,20 32,32 10,20" fill="url(#goldBoxTop)" stroke="#fef08a" strokeWidth="1" />
                    <polygon points="10,20 32,32 32,54 10,42" fill="url(#goldBoxLeft)" stroke="#facc15" strokeWidth="1" />
                    <polygon points="32,32 54,20 54,42 32,54" fill="url(#goldBoxRight)" stroke="#facc15" strokeWidth="1" />
                    <path d="M26 12 C24 6 30 6 32 10 C34 6 40 6 38 12 C34 16 30 16 26 12 Z" fill="#a3e635" stroke="#65a30d" strokeWidth="1" />
                  </svg>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-neutral-950 font-black font-mono text-[10px] flex items-center justify-center border border-amber-200 shadow-md">
                    {boxes.gold}
                  </span>
                </div>
                <span className="text-xs font-bold text-white">Hộp Quà Vàng</span>
                <span className="text-[10px] text-amber-300 font-mono mt-0.5">Sở hữu: {boxes.gold}</span>
                <button
                  type="button"
                  onClick={() => handleOpenBox('gold')}
                  disabled={boxes.gold <= 0 || openingBox !== null}
                  className="mt-3 w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-xs font-bold transition-all cursor-pointer"
                >
                  {openingBox === 'gold' ? 'Đang mở...' : 'Mở hộp'}
                </button>
              </div>

              {/* Red Box */}
              <div className="rounded-2xl p-3 bg-gradient-to-b from-rose-950/40 to-black/60 border border-rose-500/30 flex flex-col items-center text-center relative group">
                <div className="relative w-16 h-16 flex items-center justify-center mb-2">
                  <svg viewBox="0 0 64 64" className="w-14 h-14 drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]">
                    <defs>
                      <linearGradient id="redBoxTop" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fb7185" />
                        <stop offset="100%" stopColor="#e11d48" />
                      </linearGradient>
                      <linearGradient id="redBoxLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#be123c" />
                        <stop offset="100%" stopColor="#9f1239" />
                      </linearGradient>
                      <linearGradient id="redBoxRight" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#e11d48" />
                        <stop offset="100%" stopColor="#be123c" />
                      </linearGradient>
                    </defs>
                    <polygon points="32,8 54,20 32,32 10,20" fill="url(#redBoxTop)" stroke="#fecdd3" strokeWidth="1" />
                    <polygon points="10,20 32,32 32,54 10,42" fill="url(#redBoxLeft)" stroke="#f43f5e" strokeWidth="1" />
                    <polygon points="32,32 54,20 54,42 32,54" fill="url(#redBoxRight)" stroke="#f43f5e" strokeWidth="1" />
                    <path d="M26 12 C24 6 30 6 32 10 C34 6 40 6 38 12 C34 16 30 16 26 12 Z" fill="#fde047" stroke="#ca8a04" strokeWidth="1" />
                  </svg>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-neutral-950 font-black font-mono text-[10px] flex items-center justify-center border border-amber-200 shadow-md">
                    {boxes.red}
                  </span>
                </div>
                <span className="text-xs font-bold text-white">Hộp Quà Đỏ</span>
                <span className="text-[10px] text-rose-300 font-mono mt-0.5">Sở hữu: {boxes.red}</span>
                <button
                  type="button"
                  onClick={() => handleOpenBox('red')}
                  disabled={boxes.red <= 0 || openingBox !== null}
                  className="mt-3 w-full py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  {openingBox === 'red' ? 'Đang mở...' : 'Mở hộp'}
                </button>
              </div>
            </div>

            {boxReward && (
              <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-center animate-fade-up">
                <span className="text-xs font-bold text-emerald-300">🎉 {boxReward}!</span>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CÂU HỎI VUI */}
        {activeTab === 'quiz' && (
          <div className="space-y-4">
            {!quizAnswered ? (
              <>
                {/* Active Question with 15s Countdown */}
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h3 className="text-xs sm:text-sm font-bold text-white max-w-[80%] leading-snug">
                    {dailyTrivia.question}
                  </h3>
                  <div className="relative w-10 h-10 flex items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-400/40 text-cyan-300 font-mono font-bold text-xs shrink-0">
                    <Clock className="w-3 h-3 absolute -top-1 -right-1 text-cyan-400" />
                    <span>{quizTimer}s</span>
                  </div>
                </div>

                {/* 4 Choices */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {dailyTrivia.options.map((opt, idx) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => { void handleAnswerQuiz(idx); }}
                      disabled={selectedOption !== null}
                      className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-left text-xs font-medium text-white transition-all hover:border-amber-400/40 active:scale-98 disabled:opacity-50 cursor-pointer"
                    >
                      <span className="w-5 h-5 rounded-full bg-white/10 inline-flex items-center justify-center text-[10px] font-mono mr-2 text-amber-300">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              /* Kết quả trong ngày (đã bỏ chế độ ôn tập/xem lại dư thừa) */
              <div className="space-y-3">
                <div
                  className={`p-4 rounded-2xl border text-center ${
                    quizResult?.correct
                      ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-neutral-300'
                  }`}
                >
                  <p className="text-xs text-neutral-400">Bạn đã trả lời câu hỏi hôm nay</p>
                  <p className="text-sm sm:text-base font-bold text-white mt-1">
                    {quizResult?.correct
                      ? `Trả lời đúng +${quizResult.reward} Coin`
                      : quizResult
                        ? 'Rất tiếc chưa chính xác. Hẹn bạn vào ngày mai nhé!'
                        : 'Hôm nay bạn đã hoàn thành câu hỏi vui.'}
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-2">
                    Câu hỏi vui làm mới mỗi ngày — không cần ôn lại, cứ quay lại vào ngày mai là có câu mới.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-1.5 text-xs text-neutral-300">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                    Luật chơi:
                  </p>
                  <p className="text-[11px] text-neutral-400">🟢 Mỗi ngày trả lời câu hỏi vui 1 lần.</p>
                  <p className="text-[11px] text-neutral-400">🟢 Bạn có 15 giây để đọc và trả lời.</p>
                  <p className="text-[11px] text-neutral-400">🟢 Trả lời đúng nhận ngẫu nhiên 5–10 Coin.</p>
                  <p className="text-[11px] text-neutral-400">🟢 Trả lời sai không bị mất gì.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-mono text-amber-300">
            <span>Số dư:</span>
            <span className="font-bold text-white">{currentUserCoin} Coin</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyEngagementModal;
