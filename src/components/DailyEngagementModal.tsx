/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect, useCallback } from 'react';
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
import type { DailyRewardAction, DailyRewardStateSummary, RewardApiResponse } from '../types/rewards';

interface DailyEngagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  currentUserCoin?: number;
  onClaimReward?: (action: DailyRewardAction) => Promise<RewardApiResponse | null>;
}

const TIPS = [
  'Hãy trả lời chỉn chu và đầy đủ các bước giải để dễ nhận được xác nhận Đáp Án Chuẩn!',
  'Nên đặt câu hỏi một cách rõ ràng và cụ thể để nhận được câu trả lời nhanh nhất.',
  'Điểm danh mỗi ngày tích lũy chuỗi streak và mở khóa hộp quà ở mốc 5, 10, 15 ngày.',
  'Chia sẻ lời giải hay trên sàn hỏi đáp giúp bạn tích lũy Coin và thăng hạng danh hiệu.',
];

interface TriviaQuestion {
  question: string;
  options: string[];
  correct: number;
}

const TRIVIA_POOL: TriviaQuestion[] = [
  {
    question: 'Thung lũng McMurdo (thung lũng Khô) nằm ở châu lục nào?',
    options: ['Châu Úc', 'Châu Phi', 'Châu Mỹ', 'Châu Nam Cực'],
    correct: 3,
  },
  {
    question: 'Kim loại nào có tính dẫn điện tốt nhất ở điều kiện thường?',
    options: ['Vàng (Au)', 'Bạc (Ag)', 'Đồng (Cu)', 'Nhôm (Al)'],
    correct: 1,
  },
  {
    question: 'Tác phẩm "Bình Ngô Đại Cáo" được sáng tác bởi danh nhân nào?',
    options: ['Nguyễn Trãi', 'Lê Lợi', 'Nguyễn Du', 'Trần Hưng Đạo'],
    correct: 0,
  },
  {
    question: 'Đơn vị đo cường độ dòng điện trong hệ SI là gì?',
    options: ['Volt (V)', 'Watt (W)', 'Ampere (A)', 'Ohm (Ω)'],
    correct: 2,
  },
  {
    question: 'Nguyên tố hóa học nào có ký hiệu "Fe"?',
    options: ['Flo', 'Sắt', 'Phốt pho', 'Fermi'],
    correct: 1,
  },
  {
    question: 'Sông nào dài nhất Việt Nam?',
    options: ['Sông Mã', 'Sông Hồng', 'Sông Đồng Nai', 'Sông Đà'],
    correct: 2,
  },
  {
    question: 'Trong Pascal, kiểu dữ liệu nào lưu được số thực?',
    options: ['Integer', 'Boolean', 'Real', 'Char'],
    correct: 2,
  },
  {
    question: 'Vận tốc ánh sáng trong chân không xấp xỉ bao nhiêu?',
    options: ['300.000 km/s', '150.000 km/s', '300.000 m/s', '30.000 km/s'],
    correct: 0,
  },
  {
    question: 'Ai là tác giả của "Truyện Kiều"?',
    options: ['Nguyễn Du', 'Hồ Xuân Hương', 'Nguyễn Đình Chiểu', 'Xuân Diệu'],
    correct: 0,
  },
  {
    question: 'Nước có công thức hóa học là gì?',
    options: ['CO2', 'H2O', 'O2', 'NaCl'],
    correct: 1,
  },
  {
    question: 'Đỉnh núi cao nhất Việt Nam là?',
    options: ['Phan Xi Păng', 'Bạch Mã', 'Bà Đen', 'Ngọc Linh'],
    correct: 0,
  },
  {
    question: 'Số nào sau đây là số nguyên tố?',
    options: ['51', '57', '53', '55'],
    correct: 2,
  },
];

export const DailyEngagementModal: React.FC<DailyEngagementModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  currentUserCoin = 0,
  onClaimReward,
}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'gifts' | 'quiz'>('attendance');
  const [tipIndex, setTipIndex] = useState(0);
  const [rewardState, setRewardState] = useState<DailyRewardStateSummary | null>(null);
  const [rewardStateOwnerId, setRewardStateOwnerId] = useState<string | null>(null);
  const [isSubmittingReward, setIsSubmittingReward] = useState(false);
  const [rewardError, setRewardError] = useState<string | null>(null);
  const [rewardErrorOwnerId, setRewardErrorOwnerId] = useState<string | null>(null);
  const [quizTimer, setQuizTimer] = useState<number>(15);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [openingBox, setOpeningBox] = useState<string | null>(null);
  const [boxReward, setBoxReward] = useState<string | null>(null);

  const visibleRewardState = rewardStateOwnerId === currentUserId ? rewardState : null;
  const streak = visibleRewardState?.attendanceStreak ?? 0;
  const hasClaimedToday = Boolean(visibleRewardState?.attendanceClaimed);
  const completedCycleDay = streak % 15 || (streak > 0 ? 15 : 0);
  const cycleDay = hasClaimedToday
    ? ((Math.max(1, streak) - 1) % 15) + 1
    : (streak % 15) + 1;
  const attendedDays = hasClaimedToday ? cycleDay : completedCycleDay;
  const boxes = visibleRewardState?.boxes ?? { blue: [], gold: [], red: [] };
  const dailyTrivia = TRIVIA_POOL[visibleRewardState?.triviaIndex ?? 0] || TRIVIA_POOL[0];
  const quizAnswered = Boolean(visibleRewardState?.triviaClaimed);
  const quizResult = quizAnswered
    ? { correct: Boolean(visibleRewardState?.triviaCorrect), reward: visibleRewardState?.triviaCoins ?? 0 }
    : null;
  const displayedRewardError = currentUserId
    ? (rewardErrorOwnerId === currentUserId ? rewardError : null)
    : 'Đăng nhập để nhận và đồng bộ phần thưởng trên tài khoản.';
  const isLoadingRewards = Boolean(
    isOpen && currentUserId && rewardStateOwnerId !== currentUserId && !displayedRewardError,
  );

  useEffect(() => {
    const interval = setInterval(() => setTipIndex(previous => (previous + 1) % TIPS.length), 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (!currentUserId) return;

    let isMounted = true;
    fetch('/api/rewards/daily/state', { credentials: 'same-origin', cache: 'no-store' })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success || !data.state) {
          throw new Error(typeof data.message === 'string' ? data.message : 'Không thể tải trạng thái phần thưởng.');
        }
        if (isMounted) {
          setRewardState(data.state as DailyRewardStateSummary);
          setRewardStateOwnerId(currentUserId);
          setSelectedOption(null);
          setQuizTimer(15);
          setBoxReward(null);
          setRewardError(null);
          setRewardErrorOwnerId(currentUserId);
        }
      })
      .catch(error => {
        if (isMounted) {
          setRewardError(error instanceof Error ? error.message : 'Không thể kết nối máy chủ.');
          setRewardErrorOwnerId(currentUserId);
        }
      });

    return () => { isMounted = false; };
  }, [isOpen, currentUserId]);

  const handleAnswerQuiz = useCallback(async (index: number) => {
    if (!currentUserId || !visibleRewardState || quizAnswered || selectedOption !== null || isSubmittingReward) return;
    setSelectedOption(index);
    setIsSubmittingReward(true);
    setRewardError(null);
    const result = await onClaimReward?.({ type: 'trivia', answerIndex: index });
    if (result?.state) {
      setRewardState(result.state);
      setRewardStateOwnerId(currentUserId ?? null);
    }
    if (!result?.success) {
      setSelectedOption(null);
      setRewardError(result?.message || 'Chưa ghi nhận được câu trả lời. Vui lòng thử lại.');
      setRewardErrorOwnerId(currentUserId);
    }
    setIsSubmittingReward(false);
  }, [currentUserId, visibleRewardState, quizAnswered, selectedOption, isSubmittingReward, onClaimReward]);

  useEffect(() => {
    if (!isOpen || !visibleRewardState || isLoadingRewards || activeTab !== 'quiz' || quizAnswered || selectedOption !== null) return;
    const timer = setInterval(() => {
      setQuizTimer(previous => {
        if (previous <= 1) {
          clearInterval(timer);
          setTimeout(() => { void handleAnswerQuiz(-1); }, 0);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, visibleRewardState, isLoadingRewards, activeTab, quizAnswered, selectedOption, handleAnswerQuiz]);

  if (!isOpen) return null;

  const handleClaimAttendance = async () => {
    if (!currentUserId || !visibleRewardState || hasClaimedToday || isSubmittingReward) return;
    setIsSubmittingReward(true);
    setRewardError(null);
    const result = await onClaimReward?.({ type: 'attendance' });
    if (result?.state) {
      setRewardState(result.state);
      setRewardStateOwnerId(currentUserId ?? null);
    }
    if (!result?.success) setRewardError(result?.message || 'Chưa ghi nhận được điểm danh. Vui lòng thử lại.');
    else setRewardError(result.alreadyClaimed ? 'Hôm nay tài khoản đã điểm danh.' : 'Đã điểm danh thành công: +25 Coin.');
    setRewardErrorOwnerId(currentUserId);
    setIsSubmittingReward(false);
  };

  const handleOpenBox = (type: 'blue' | 'gold' | 'red') => {
    const boxId = boxes[type][0];
    if (!boxId || openingBox || isSubmittingReward || !currentUserId) return;
    setOpeningBox(type);
    setBoxReward(null);
    setRewardError(null);

    window.setTimeout(() => {
      void (async () => {
        setIsSubmittingReward(true);
        const result = await onClaimReward?.({ type: 'open-box', boxId });
        if (result?.state) {
          setRewardState(result.state);
          setRewardStateOwnerId(currentUserId ?? null);
        }
        if (result?.success) {
          setBoxReward(result.alreadyOpened
            ? 'Hộp này đã được mở trước đó'
            : `+${result.rewardCoins ?? 0} Coin`);
        } else {
          setRewardError(result?.message || 'Không thể mở hộp quà. Vui lòng tải lại trạng thái.');
          setRewardErrorOwnerId(currentUserId);
        }
        setIsSubmittingReward(false);
        setOpeningBox(null);
      })();
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

        {/* Tips Carousel Banner */}
        <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-400/20 mb-4 flex items-center gap-2.5">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <p className="text-[11px] text-amber-200/90 italic leading-snug line-clamp-1">
            <span className="font-semibold not-italic text-amber-300">Bạn có biết: </span>
            {TIPS[tipIndex]}
          </p>
        </div>

        {(isLoadingRewards || displayedRewardError) && (
          <p className="mb-3 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200" role="status" aria-live="polite">
            {isLoadingRewards ? 'Đang đồng bộ phần thưởng với máy chủ...' : displayedRewardError}
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
                const isAttended = day <= attendedDays;
                const isActive = day === cycleDay && !hasClaimedToday && Boolean(visibleRewardState) && !isLoadingRewards;
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

            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs text-neutral-400">
                {isLoadingRewards
                  ? 'Đang đồng bộ trạng thái phần thưởng...'
                  : !currentUserId
                  ? 'Đăng nhập để lưu chuỗi điểm danh trên máy chủ.'
                  : hasClaimedToday
                  ? 'Hôm nay bạn đã điểm danh thành công!'
                  : 'Bấm điểm danh ngay để nhận +25 Coin.'}
              </span>
              <button
                type="button"
                onClick={handleClaimAttendance}
                disabled={!currentUserId || !visibleRewardState || isLoadingRewards || isSubmittingReward || hasClaimedToday}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Flame className="w-4 h-4 text-neutral-950" />
                <span>{isSubmittingReward ? 'Đang ghi nhận...' : hasClaimedToday ? 'Đã điểm danh' : 'Điểm danh ngay'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: KHO QUÀ */}
        {activeTab === 'gifts' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-black/40 border-l-4 border-l-neutral-400 border border-white/10 text-xs text-neutral-300 space-y-1.5">
              <p className="font-semibold text-white">🎁 Quy đổi quà tặng:</p>
              <p className="text-[11.5px] text-neutral-300 leading-relaxed">
                Giữ chuỗi điểm danh để nhận hộp quà ở mốc 5, 10 và 15 ngày. Mở hộp để nhận Coin thật vào tài khoản của bạn.
              </p>
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
                    {boxes.blue.length}
                  </span>
                </div>
                <span className="text-xs font-bold text-white">Hộp Xanh Lam</span>
                <span className="text-[10px] text-cyan-300 font-mono mt-0.5">Sở hữu: {boxes.blue.length}</span>
                <button
                  type="button"
                  onClick={() => handleOpenBox('blue')}
                  disabled={boxes.blue.length === 0 || openingBox !== null || isSubmittingReward || !visibleRewardState}
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
                    {boxes.gold.length}
                  </span>
                </div>
                <span className="text-xs font-bold text-white">Hộp Quà Vàng</span>
                <span className="text-[10px] text-amber-300 font-mono mt-0.5">Sở hữu: {boxes.gold.length}</span>
                <button
                  type="button"
                  onClick={() => handleOpenBox('gold')}
                  disabled={boxes.gold.length === 0 || openingBox !== null || isSubmittingReward || !visibleRewardState}
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
                    {boxes.red.length}
                  </span>
                </div>
                <span className="text-xs font-bold text-white">Hộp Quà Đỏ</span>
                <span className="text-[10px] text-rose-300 font-mono mt-0.5">Sở hữu: {boxes.red.length}</span>
                <button
                  type="button"
                  onClick={() => handleOpenBox('red')}
                  disabled={boxes.red.length === 0 || openingBox !== null || isSubmittingReward || !visibleRewardState}
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
                      onClick={() => handleAnswerQuiz(idx)}
                      disabled={!currentUserId || !visibleRewardState || isLoadingRewards || isSubmittingReward}
                      className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-left text-xs font-medium text-white transition-all hover:border-amber-400/40 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
                      : 'Rất tiếc chưa chính xác. Hẹn bạn vào ngày mai nhé!'}
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
