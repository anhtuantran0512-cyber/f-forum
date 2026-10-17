/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  X,
  Lightbulb,
  Gift,
  Flame,
  CheckCircle2,
  Clock,
  HelpCircle,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { safeStorage } from '../utils/storage';
import { formatCoinBalance } from '../utils/coinDisplay';
import { SwipeDeck } from './ui/SwipeDeck';
import { StreakCountdown } from './engagement/StreakCountdown';
import { QUIZ_DURATION_SECONDS, quizSecondsLeft } from '../utils/dailyQuizClock';
import './engagement/DailyQuiz.css';
import './engagement/DailyEngagementModal.css';
import { dailyTriviaForDate, dateKeyInTimeZone, shiftDateKey } from '../../shared/dailyTrivia';
import type { DailyRewardAction, DailyRewardActionResult, DailyRewardStatus } from '../types/rewards';
import { ATTENDANCE_BOX_MILESTONES, getAttendanceCycleProgress } from '../utils/dailyAttendance';

interface DailyEngagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  currentUserEmail?: string;
  currentUserCoin?: number;
  onOpenLogin?: () => void;
  onLoadRewardStatus?: () => Promise<{ ok: boolean; status?: DailyRewardStatus; message?: string }>;
  onClaimReward?: (action: DailyRewardAction) => Promise<DailyRewardActionResult>;
}

/* Mẹo hằng ngày — hiển thị dạng chồng thẻ kéo-để-lướt (code_yeucau · stk-02). */
const TIPS: { id: string; title: string; body: string }[] = [
  { id: 'answer', title: 'Lời giải chỉn chu', body: 'Trả lời đầy đủ các bước giải để nhận Đáp Án Chuẩn.' },
  { id: 'ask', title: 'Hỏi rõ ràng', body: 'Đặt câu hỏi cụ thể để nhận lời giải nhanh.' },
  { id: 'streak', title: 'Giữ lửa mỗi ngày', body: 'Điểm danh đủ mốc 5, 10, 15 ngày để nhận hộp quà.' },
  { id: 'share', title: 'Chia sẻ để thăng hạng', body: 'Chia sẻ lời giải hay để tích lũy Coin và thăng hạng.' },
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

const loadAttendanceLog = (key: string | null): string[] => {
  if (!key) return [];
  try {
    const saved = safeStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.filter((day) => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day));
    }
  } catch {
    /* ignore */
  }
  return [];
};

const loadBoxes = (key: string | null): { blue: number; gold: number; red: number } => {
  if (!key) return { blue: 0, gold: 0, red: 0 };
  try {
    const saved = safeStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : null;
    const count = (value: unknown) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(10_000, Math.floor(Number(value)))) : 0;
    return parsed && typeof parsed === 'object'
      ? { blue: count(parsed.blue), gold: count(parsed.gold), red: count(parsed.red) }
      : { blue: 0, gold: 0, red: 0 };
  } catch {
    return { blue: 0, gold: 0, red: 0 };
  }
};

export const DailyEngagementModal: React.FC<DailyEngagementModalProps> = ({
  isOpen,
  onClose,
  isAuthenticated,
  currentUserEmail,
  currentUserCoin = 0,
  onOpenLogin,
  onLoadRewardStatus,
  onClaimReward,
}) => {
  const storagePrefix = currentUserEmail?.trim()
    ? `fforum_daily_${encodeURIComponent(currentUserEmail.trim().toLowerCase())}`
    : null;
  const attendanceStorageKey = storagePrefix ? `${storagePrefix}_attendance` : null;
  const boxesStorageKey = storagePrefix ? `${storagePrefix}_boxes` : null;
  const quizStorageKey = storagePrefix ? `${storagePrefix}_quiz` : null;
  const [activeTab, setActiveTab] = useState<'attendance' | 'gifts' | 'quiz'>('attendance');
  const [rewardDate, setRewardDate] = useState(todayISO());
  const rewardDateRef = useRef(rewardDate);
  const [attendanceLog, setAttendanceLog] = useState<string[]>(() => loadAttendanceLog(attendanceStorageKey));
  const [boxes, setBoxes] = useState<{ blue: number; gold: number; red: number }>(() => loadBoxes(boxesStorageKey));
  const [quizAnswered, setQuizAnswered] = useState<boolean>(() =>
    Boolean(quizStorageKey && safeStorage.getItem(quizStorageKey) === todayISO()),
  );
  const [quizTimer, setQuizTimer] = useState<number>(QUIZ_DURATION_SECONDS);
  const [quizStarted, setQuizStarted] = useState(false);
  const quizDeadlineRef = useRef<number | null>(null);
  const timeoutSubmittedRef = useRef(false);
  const quizSubmittingRef = useRef(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<{ correct: boolean; reward: number } | null>(null);
  const [openingBox, setOpeningBox] = useState<string | null>(null);
  const [boxReward, setBoxReward] = useState<string | null>(null);
  const [isClaimingAttendance, setIsClaimingAttendance] = useState(false);
  const [hasLoadedRewardStatus, setHasLoadedRewardStatus] = useState(false);
  const [actionError, setActionError] = useState('');
  const isStatusLoading = Boolean(isOpen && isAuthenticated && onLoadRewardStatus && !hasLoadedRewardStatus);

  const streak = useMemo(() => computeStreak(attendanceLog, rewardDate), [attendanceLog, rewardDate]);
  const hasClaimedToday = attendanceLog.includes(rewardDate);
  const cycleProgress = useMemo(
    () => getAttendanceCycleProgress(streak, hasClaimedToday),
    [streak, hasClaimedToday],
  );
  const cycleDay = cycleProgress.cycleDay;
  const dailyTrivia = useMemo(() => dailyTriviaForDate(rewardDate), [rewardDate]);

  const applyRewardStatus = useCallback((status: DailyRewardStatus): void => {
    const date = status.date || todayISO();
    if (rewardDateRef.current !== date) {
      rewardDateRef.current = date;
      quizDeadlineRef.current = null;
      timeoutSubmittedRef.current = false;
      quizSubmittingRef.current = false;
      setQuizStarted(false);
      setQuizTimer(QUIZ_DURATION_SECONDS);
      setSelectedOption(null);
      setQuizResult(null);
    }
    setRewardDate(date);
    setAttendanceLog(status.attendanceDates);
    setBoxes(status.boxes);
    setQuizAnswered(status.quizAnswered);
    if (attendanceStorageKey) safeStorage.setItem(attendanceStorageKey, JSON.stringify(status.attendanceDates));
    if (boxesStorageKey) safeStorage.setItem(boxesStorageKey, JSON.stringify(status.boxes));
    if (quizStorageKey) safeStorage.setItem(quizStorageKey, status.quizAnswered ? date : '');
  }, [attendanceStorageKey, boxesStorageKey, quizStorageKey]);

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
    void onLoadRewardStatus().then((result) => {
      if (!active) return;
      if (result.ok && result.status) {
        applyRewardStatus(result.status);
        setActionError('');
      } else if (result.message) {
        setActionError(result.message);
      }
      setHasLoadedRewardStatus(true);
    }).catch(() => {
      if (!active) return;
      setActionError('Không kết nối được máy chủ để tải trạng thái phần thưởng.');
      setHasLoadedRewardStatus(true);
    });
    return () => { active = false; };
  }, [isOpen, isAuthenticated, onLoadRewardStatus, applyRewardStatus]);

  /* Tự động làm mới trạng thái điểm danh & câu hỏi khi bước qua 0h đêm */
  useEffect(() => {
    if (!isOpen) return;
    const checkDateTransition = () => {
      const currentIso = todayISO();
      if (rewardDateRef.current !== currentIso) {
        rewardDateRef.current = currentIso;
        setRewardDate(currentIso);
        quizDeadlineRef.current = null;
        timeoutSubmittedRef.current = false;
        quizSubmittingRef.current = false;
        setQuizStarted(false);
        setQuizTimer(QUIZ_DURATION_SECONDS);
        setSelectedOption(null);
        setQuizResult(null);
        setQuizAnswered(Boolean(quizStorageKey && safeStorage.getItem(quizStorageKey) === currentIso));
        if (isAuthenticated && onLoadRewardStatus) {
          void onLoadRewardStatus().then((result) => {
            if (result.ok && result.status) applyRewardStatus(result.status);
          });
        }
      }
    };
    const interval = window.setInterval(checkDateTransition, 10000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkDateTransition();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isOpen, isAuthenticated, onLoadRewardStatus, applyRewardStatus, quizStorageKey]);

  const startQuiz = () => {
    if (quizAnswered || quizStarted) return;
    quizDeadlineRef.current = Date.now() + QUIZ_DURATION_SECONDS * 1000;
    timeoutSubmittedRef.current = false;
    quizSubmittingRef.current = false;
    setQuizTimer(QUIZ_DURATION_SECONDS);
    setSelectedOption(null);
    setActionError('');
    setQuizStarted(true);
  };

  const handleAnswerQuiz = useCallback(async (index: number) => {
    if (!quizStarted || quizAnswered || quizSubmittingRef.current) return;
    quizSubmittingRef.current = true;
    const answerIndex = quizDeadlineRef.current && quizSecondsLeft(quizDeadlineRef.current) === 0 ? -1 : index;
    setSelectedOption(answerIndex);
    const result = await performClaim({ action: 'quiz', answerIndex });
    if (!result.ok && !result.status?.quizAnswered) {
      quizSubmittingRef.current = false;
      setSelectedOption(null);
      /* Retry only when there is still time. An expired/unauthenticated attempt
         goes back to the ready screen instead of looping forever at 0s. */
      if (!isAuthenticated || answerIndex === -1 || !quizDeadlineRef.current ||
          quizSecondsLeft(quizDeadlineRef.current) === 0) {
        quizDeadlineRef.current = null;
        setQuizTimer(QUIZ_DURATION_SECONDS);
        setQuizStarted(false);
      }
      return;
    }
    const correct = Boolean(result.correct);
    const reward = Math.max(0, Number(result.reward) || 0);
    setQuizResult({ correct, reward });
    setQuizAnswered(true);
    if (quizStorageKey) safeStorage.setItem(quizStorageKey, result.status?.date || rewardDate);
  }, [quizStarted, quizAnswered, performClaim, rewardDate, isAuthenticated, quizStorageKey]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'quiz' || !quizStarted || quizAnswered || selectedOption !== null) return;
    const tick = () => {
      if (quizDeadlineRef.current === null) return;
      const remaining = quizSecondsLeft(quizDeadlineRef.current);
      setQuizTimer(remaining);
      if (remaining === 0 && !timeoutSubmittedRef.current) {
        timeoutSubmittedRef.current = true;
        void handleAnswerQuiz(-1);
      }
    };
    tick();
    const timer = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [isOpen, activeTab, quizStarted, quizAnswered, selectedOption, handleAnswerQuiz]);

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

      <div className="ff-daily-panel modal-container liquid-glass w-full max-w-2xl p-4 sm:p-6 relative z-10 overflow-hidden max-h-[95vh] overflow-y-auto">
        <header className="ff-daily-header">
          <div className="ff-daily-header__top">
            <div className="ff-daily-heading">
              <span className="ff-daily-mark" aria-hidden="true">F</span>
              <div>
                <h2 className="ff-daily-heading__title">Nhịp học mỗi ngày</h2>
              </div>
            </div>
            <button type="button" onClick={onClose} className="ff-daily-close ff-tactile-btn" aria-label="Đóng">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <div className="ff-daily-tabs" role="group" aria-label="Chọn hoạt động hằng ngày">
            {([
              { id: 'quiz', label: 'Câu hỏi vui', icon: HelpCircle },
              { id: 'attendance', label: 'Điểm danh', icon: Flame },
              { id: 'gifts', label: 'Kho quà', icon: Gift },
            ] as const).map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-pressed={isActive}
                  className={`ff-daily-tab ff-tactile-btn${isActive ? ' ff-daily-tab--active' : ''}`}
                >
                  <Icon size={14} aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </header>

        {/* Mẹo hằng ngày: chồng thẻ kéo-để-lướt thay cho dải chữ tự chạy 1 dòng */}
        <div className="mb-4">
          <SwipeDeck
            label="Mẹo hằng ngày"
            autoAdvanceMs={2000}
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
          <section className="ff-daily-attendance" aria-labelledby="ff-daily-attendance-title" aria-busy={isStatusLoading || isClaimingAttendance}>
            <div className="ff-daily-attendance__intro">
              <div className="ff-daily-attendance__title-group">
                <span className="ff-daily-attendance__eyebrow"><Calendar size={13} aria-hidden="true" /> Điểm danh</span>
                <h3 id="ff-daily-attendance-title">Giữ nhịp học mỗi ngày</h3>
                <p>{hasClaimedToday ? 'Hôm nay đã được ghi nhận trên tài khoản của bạn.' : 'Một lần mỗi ngày · chu kỳ quà lặp lại sau mỗi 15 ngày liên tiếp.'}</p>
              </div>
              <div className="ff-daily-attendance__streak" aria-label={`Chuỗi ${streak} ngày`}>
                <Flame size={17} aria-hidden="true" />
                <span><strong>{streak}</strong><small>ngày liên tiếp</small></span>
              </div>
            </div>

            <div className="ff-daily-cycle-heading">
              <span className="ff-daily-cycle-heading__round">Vòng {cycleProgress.cycleNumber}</span>
              <strong>Ngày {cycleDay} <span>/ 15</span></strong>
              <span className="ff-daily-cycle-heading__state">
                {isStatusLoading ? 'Đang xác nhận dữ liệu…' : hasClaimedToday ? 'Đã hoàn thành hôm nay' : `${cycleProgress.completedDays}/15 ngày hoàn thành`}
              </span>
            </div>
            <div
              className="ff-daily-cycle-progress"
              role="progressbar"
              aria-label={`Tiến độ chu kỳ ${cycleProgress.completedDays} trên 15 ngày`}
              aria-valuemin={0}
              aria-valuemax={15}
              aria-valuenow={cycleProgress.completedDays}
              aria-valuetext={`${cycleProgress.completedDays} trong 15 ngày đã hoàn thành`}
            >
              <span style={{ width: `${(cycleProgress.completedDays / 15) * 100}%` }} />
            </div>

            <ol className="ff-daily-attendance-track" aria-label={`Chu kỳ điểm danh số ${cycleProgress.cycleNumber}`}>
              {Array.from({ length: 15 }, (_, index) => index + 1).map((day) => {
                const isAttended = day <= cycleProgress.completedDays;
                const isCurrent = day === cycleDay;
                const milestoneIndex = (ATTENDANCE_BOX_MILESTONES as readonly number[]).indexOf(day);
                const boxName = day === 5 ? 'xanh' : day === 10 ? 'vàng' : 'đỏ';
                const dayState = isAttended ? 'đã điểm danh' : isCurrent ? (hasClaimedToday ? 'đã điểm danh hôm nay' : 'hôm nay') : 'chưa điểm danh';
                return (
                  <li
                    key={day}
                    className={`ff-daily-day${isAttended ? ' is-attended' : ''}${isCurrent ? ' is-current' : ''}${milestoneIndex >= 0 ? ' is-milestone' : ''}`}
                    aria-current={isCurrent ? 'step' : undefined}
                    aria-label={`Ngày ${day}: ${dayState}${milestoneIndex >= 0 ? ` · mốc nhận hộp ${boxName}` : ''}`}
                  >
                    <span className="ff-daily-day__label">Ngày</span>
                    <strong>{String(day).padStart(2, '0')}</strong>
                    <span className="ff-daily-day__state">
                      {isAttended ? <CheckCircle2 size={12} aria-hidden="true" /> : isCurrent && hasClaimedToday ? <CheckCircle2 size={12} aria-hidden="true" /> : null}
                      {isAttended ? 'Xong' : isCurrent ? (hasClaimedToday ? 'Xong' : 'Hôm nay') : 'Chờ'}
                    </span>
                    {milestoneIndex >= 0 && (
                      <span className={`ff-daily-day__gift ff-daily-day__gift--${day}`} title={`Mốc ${day} ngày · hộp quà ${boxName}`}>
                        <Gift size={12} aria-hidden="true" />
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>

            <div className="ff-daily-milestones" aria-label="Mốc hộp quà trong chu kỳ">
              {ATTENDANCE_BOX_MILESTONES.map((day) => {
                const reached = cycleProgress.completedDays >= day;
                const boxName = day === 5 ? 'Hộp xanh' : day === 10 ? 'Hộp vàng' : 'Hộp đỏ';
                return (
                  <span key={day} className={`ff-daily-milestone${reached ? ' is-reached' : ''}`}>
                    <Gift size={13} aria-hidden="true" />
                    <span><b>{day} ngày</b><small>{boxName}</small></span>
                    {reached && <CheckCircle2 size={12} aria-label="Đã đạt mốc" />}
                  </span>
                );
              })}
            </div>

            <StreakCountdown streak={streak} claimedToday={hasClaimedToday} />

            <div className="ff-daily-attendance__actions">
              <p><b>+25 Coin</b><span>mỗi lần điểm danh</span></p>
              <button
                type="button"
                onClick={handleClaimAttendance}
                disabled={hasClaimedToday || isClaimingAttendance || isStatusLoading}
                aria-busy={isClaimingAttendance}
                className="ff-tactile-btn ff-daily-attendance__claim"
              >
                <Flame size={16} aria-hidden="true" />
                <span>{isStatusLoading ? 'Đang đồng bộ…' : isClaimingAttendance ? 'Đang ghi nhận…' : hasClaimedToday ? 'Đã điểm danh' : 'Điểm danh hôm nay'}</span>
              </button>
            </div>
          </section>
        )}

        {/* TAB 2: KHO QUÀ */}
        {activeTab === 'gifts' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-[#0b0d12]/80 border border-[#f4f1de]/15 text-xs text-[#d8d5ce]">
              <p className="font-bold text-[#f4f1de]">Chuỗi 5 · 10 · 15 ngày = 1 hộp quà Coin thật</p>
            </div>

            {/* 3 Isometric Gift Boxes */}
            <div className="grid grid-cols-3 gap-3">
              {/* Blue Box */}
              <div className="rounded-xl p-3 bg-[#0b0d12]/80 border border-[#81b29a]/40 flex flex-col items-center text-center relative group">
                <div className="relative w-16 h-16 flex items-center justify-center mb-2">
                  <svg viewBox="0 0 64 64" className="w-14 h-14 drop-shadow-[0_0_12px_rgba(129,178,154,0.45)]">
                    <defs>
                      <linearGradient id="blueBoxTop" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#81b29a" />
                        <stop offset="100%" stopColor="#52796f" />
                      </linearGradient>
                      <linearGradient id="blueBoxLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#52796f" />
                        <stop offset="100%" stopColor="#354f52" />
                      </linearGradient>
                      <linearGradient id="blueBoxRight" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6b9080" />
                        <stop offset="100%" stopColor="#52796f" />
                      </linearGradient>
                    </defs>
                    <polygon points="32,8 54,20 32,32 10,20" fill="url(#blueBoxTop)" stroke="#a3c9b8" strokeWidth="1" />
                    <polygon points="10,20 32,32 32,54 10,42" fill="url(#blueBoxLeft)" stroke="#81b29a" strokeWidth="1" />
                    <polygon points="32,32 54,20 54,42 32,54" fill="url(#blueBoxRight)" stroke="#81b29a" strokeWidth="1" />
                    <path d="M26 12 C24 6 30 6 32 10 C34 6 40 6 38 12 C34 16 30 16 26 12 Z" fill="#f4f1de" stroke="#81b29a" strokeWidth="1" />
                  </svg>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-neutral-950 font-black font-mono text-[10px] flex items-center justify-center border border-amber-200 shadow-md">
                    {boxes.blue}
                  </span>
                </div>
                <span className="text-xs font-bold text-[#f4f1de]">Hộp Xanh Lam</span>
                <span className="text-[10px] text-[#81b29a] font-mono mt-0.5">Sở hữu: {boxes.blue}</span>
                <button
                  type="button"
                  onClick={() => handleOpenBox('blue')}
                  disabled={boxes.blue <= 0 || openingBox !== null}
                  className="ff-tactile-btn mt-3 w-full py-1.5 rounded-lg bg-[#81b29a] hover:bg-[#95c4ae] border-2 border-[#0b0d12] disabled:opacity-40 text-[#0b0d12] text-xs font-extrabold transition-all cursor-pointer"
                >
                  {openingBox === 'blue' ? 'Đang mở...' : 'Mở hộp'}
                </button>
              </div>

              {/* Gold Box */}
              <div className="rounded-xl p-3 bg-[#0b0d12]/80 border border-[#f2cc8f]/40 flex flex-col items-center text-center relative group">
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
                <span className="text-xs font-bold text-[#f4f1de]">Hộp Quà Vàng</span>
                <span className="text-[10px] text-[#f2cc8f] font-mono mt-0.5">Sở hữu: {boxes.gold}</span>
                <button
                  type="button"
                  onClick={() => handleOpenBox('gold')}
                  disabled={boxes.gold <= 0 || openingBox !== null}
                  className="ff-tactile-btn mt-3 w-full py-1.5 rounded-lg bg-[#f2cc8f] hover:bg-[#f4f1de] border-2 border-[#0b0d12] disabled:opacity-40 text-[#0b0d12] text-xs font-extrabold transition-all cursor-pointer"
                >
                  {openingBox === 'gold' ? 'Đang mở...' : 'Mở hộp'}
                </button>
              </div>

              {/* Red Box */}
              <div className="rounded-xl p-3 bg-[#0b0d12]/80 border border-[#e07a5f]/40 flex flex-col items-center text-center relative group">
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
                <span className="text-xs font-bold text-[#f4f1de]">Hộp Quà Đỏ</span>
                <span className="text-[10px] text-[#e07a5f] font-mono mt-0.5">Sở hữu: {boxes.red}</span>
                <button
                  type="button"
                  onClick={() => handleOpenBox('red')}
                  disabled={boxes.red <= 0 || openingBox !== null}
                  className="ff-tactile-btn mt-3 w-full py-1.5 rounded-lg bg-[#e07a5f] hover:bg-[#f2cc8f] border-2 border-[#0b0d12] disabled:opacity-40 text-[#0b0d12] text-xs font-extrabold transition-all cursor-pointer"
                >
                  {openingBox === 'red' ? 'Đang mở...' : 'Mở hộp'}
                </button>
              </div>
            </div>

            {boxReward && (
              <div className="p-3 rounded-xl bg-[#81b29a]/20 border border-[#81b29a]/40 text-center animate-fade-up">
                <span className="text-xs font-bold text-[#d8f3dc]">{boxReward}</span>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CÂU HỎI VUI */}
        {activeTab === 'quiz' && (
          <div className="space-y-4">
            {!quizAnswered ? (
              !quizStarted ? (
                <section className="ff-daily-quiz-intro ff-keep-dark" aria-label="Giới thiệu câu hỏi vui">
                  <span className="ff-daily-quiz-intro__orbit" aria-hidden="true"><Sparkles size={27} /></span>
                  <h3>Câu hỏi vui mỗi ngày</h3>
                  <button type="button" className="ff-daily-quiz-intro__start" onClick={startQuiz}>
                    <span>Sẵn sàng</span><span aria-hidden="true">↗</span>
                  </button>
                </section>
              ) : (
              <div className="ff-daily-quiz-question ff-keep-dark" key={rewardDate}>
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <h3 className="text-xs sm:text-sm font-bold text-white leading-snug">
                    {dailyTrivia.question}
                  </h3>
                  <div
                    className="ff-daily-quiz-clock shrink-0"
                    role="timer"
                    aria-label={`Còn ${quizTimer} giây`}
                    style={{ '--quiz-progress': `${(quizTimer / QUIZ_DURATION_SECONDS) * 100}%` } as React.CSSProperties}
                    data-urgent={quizTimer <= 5}
                  >
                    <Clock className="w-3 h-3 absolute -top-1 -right-1 text-[#f2cc8f]" aria-hidden="true" />
                    <span>{quizTimer}s</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3">
                  {dailyTrivia.options.map((opt, idx) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => { void handleAnswerQuiz(idx); }}
                      disabled={selectedOption !== null}
                      className="ff-daily-quiz-option p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-left text-xs font-medium text-white transition-all hover:border-amber-400/40 active:scale-98 disabled:opacity-50 cursor-pointer"
                    >
                      <span className="w-5 h-5 rounded-full bg-white/10 inline-flex items-center justify-center text-[10px] font-mono mr-2 text-amber-300">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>
                {selectedOption !== null && <p className="text-xs text-[#f2cc8f] pt-2" role="status">Đang ghi nhận câu trả lời…</p>}
              </div>
              )
            ) : (
              <div className="space-y-3">
                <div
                  className="ff-daily-quiz-result ff-keep-dark"
                  data-outcome={quizResult?.correct ? 'correct' : 'complete'}
                  role="status"
                >
                  <span className="ff-daily-quiz-result__seal" aria-hidden="true">
                    {quizResult?.correct ? <CheckCircle2 size={21} /> : <Sparkles size={21} />}
                  </span>
                  <p className="ff-daily-quiz-result__title">
                    {quizResult?.correct
                      ? `Trả lời đúng +${quizResult.reward} Coin`
                      : quizResult
                        ? 'Chưa chính xác'
                        : 'Đã hoàn thành'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#f2cc8f]">
            <span>Số dư:</span>
            <span className="font-bold text-[#f4f1de]">{formatCoinBalance(currentUserCoin)} Coin</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ff-tactile-btn px-4 py-1.5 rounded-xl bg-[#f4f1de] hover:bg-[#f2cc8f] text-[#0b0d12] border-2 border-[#0b0d12] font-extrabold text-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyEngagementModal;
