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

interface DailyEngagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserCoin?: number;
  onRewardCoin?: (amount: number, reason: string) => void;
  onStreakChange?: (streak: number) => void;
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

/** Chọn câu hỏi cố định theo ngày (mọi người cùng thấy 1 câu trong ngày). */
const getDailyTrivia = (): TriviaQuestion => {
  const today = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = (hash * 31 + today.charCodeAt(i)) % 100000;
  }
  return TRIVIA_POOL[hash % TRIVIA_POOL.length];
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const yesterdayISO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

/** Tính chuỗi ngày liên tiếp từ lịch điểm danh (mảng ngày ISO). */
const computeStreak = (log: string[]): number => {
  const set = new Set(log);
  let cursor = set.has(todayISO()) ? todayISO() : set.has(yesterdayISO()) ? yesterdayISO() : '';
  if (!cursor) return 0;
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    const d = new Date(cursor);
    d.setDate(d.getDate() - 1);
    cursor = d.toISOString().slice(0, 10);
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
  currentUserCoin = 0,
  onRewardCoin,
  onStreakChange,
}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'gifts' | 'quiz'>('attendance');
  const [tipIndex, setTipIndex] = useState(0);

  const [attendanceLog, setAttendanceLog] = useState<string[]>(loadAttendanceLog);
  const streak = useMemo(() => computeStreak(attendanceLog), [attendanceLog]);
  const hasClaimedToday = attendanceLog.includes(todayISO());
  const cycleDay = Math.max(1, Math.min(15, streak === 0 && !hasClaimedToday ? 1 : streak));

  const [boxes, setBoxes] = useState<{ blue: number; gold: number; red: number }>(() => {
    try {
      const saved = safeStorage.getItem('fforum_mystery_boxes');
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return { blue: 0, gold: 0, red: 0 };
  });

  const dailyTrivia = useMemo(getDailyTrivia, []);

  const [quizAnswered, setQuizAnswered] = useState<boolean>(() => {
    const lastQuiz = safeStorage.getItem('fforum_last_quiz_date');
    return lastQuiz === todayISO();
  });
  const [reviewMode, setReviewMode] = useState(false);
  const [quizTimer, setQuizTimer] = useState<number>(15);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<{ correct: boolean; reward: number } | null>(null);
  const [openingBox, setOpeningBox] = useState<string | null>(null);
  const [boxReward, setBoxReward] = useState<string | null>(null);

  const handleAnswerQuiz = useCallback(
    (index: number) => {
      if (quizAnswered || reviewMode) return;
      setSelectedOption(index);
      const isCorrect = index === dailyTrivia.correct;
      const reward = isCorrect ? Math.floor(Math.random() * 6) + 5 : 0;

      setQuizResult({ correct: isCorrect, reward });
      setQuizAnswered(true);
      safeStorage.setItem('fforum_last_quiz_date', todayISO());

      if (isCorrect && reward > 0) {
        onRewardCoin?.(reward, 'Trả lời đúng câu hỏi vui');
      }
    },
    [quizAnswered, reviewMode, dailyTrivia, onRewardCoin],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isOpen || activeTab !== 'quiz' || quizAnswered || reviewMode || selectedOption !== null) return;
    const timer = setInterval(() => {
      setQuizTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => handleAnswerQuiz(-1), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, activeTab, quizAnswered, reviewMode, selectedOption, handleAnswerQuiz]);

  useEffect(() => {
    onStreakChange?.(streak);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak]);

  if (!isOpen) return null;

  const handleClaimAttendance = () => {
    if (hasClaimedToday) return;
    const today = todayISO();
    const nextLog = [...attendanceLog, today];
    setAttendanceLog(nextLog);
    safeStorage.setItem('fforum_attendance_log', JSON.stringify(nextLog));

    const newStreak = computeStreak(nextLog);
    const nextBoxes = { ...boxes };
    if (newStreak % 15 === 5 || newStreak === 5) nextBoxes.blue += 1;
    if (newStreak % 15 === 10 || newStreak === 10) nextBoxes.gold += 1;
    if (newStreak > 0 && newStreak % 15 === 0) nextBoxes.red += 1;
    setBoxes(nextBoxes);
    safeStorage.setItem('fforum_mystery_boxes', JSON.stringify(nextBoxes));

    onStreakChange?.(newStreak);
    onRewardCoin?.(25, `Điểm danh ngày (chuỗi ${newStreak})`);
  };

  const handleOpenBox = (type: 'blue' | 'gold' | 'red') => {
    if (boxes[type] <= 0 || openingBox) return;
    setOpeningBox(type);
    setBoxReward(null);

    setTimeout(() => {
      const rewardCoin = type === 'blue' ? 30 : type === 'gold' ? 80 : 200;
      const nextBoxes = { ...boxes, [type]: boxes[type] - 1 };
      setBoxes(nextBoxes);
      safeStorage.setItem('fforum_mystery_boxes', JSON.stringify(nextBoxes));
      setBoxReward(`+${rewardCoin} Coin`);
      onRewardCoin?.(rewardCoin, `Mở hộp quà ${type}`);
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

        {/* Tips Carousel Banner */}
        <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-400/20 mb-4 flex items-center gap-2.5">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <p className="text-[11px] text-amber-200/90 italic leading-snug line-clamp-1">
            <span className="font-semibold not-italic text-amber-300">Bạn có biết: </span>
            {TIPS[tipIndex]}
          </p>
        </div>

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

            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs text-neutral-400">
                {hasClaimedToday
                  ? 'Hôm nay bạn đã điểm danh thành công!'
                  : 'Bấm điểm danh ngay để nhận +25 Coin.'}
              </span>
              <button
                type="button"
                onClick={handleClaimAttendance}
                disabled={hasClaimedToday}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Flame className="w-4 h-4 text-neutral-950" />
                <span>{hasClaimedToday ? 'Đã điểm danh' : 'Điểm danh ngay'}</span>
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
                      onClick={() => handleAnswerQuiz(idx)}
                      className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-left text-xs font-medium text-white transition-all hover:border-amber-400/40 active:scale-98 cursor-pointer"
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
              /* Completed result / read-only review */
              <div className="space-y-3">
                {!reviewMode ? (
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
                    <div className="mt-3 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setReviewMode(true)}
                        className="px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-neutral-950 font-bold text-xs transition-colors cursor-pointer shadow-md"
                      >
                        Xem lại câu hỏi
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <h3 className="text-xs sm:text-sm font-bold text-white max-w-[85%] leading-snug">
                        {dailyTrivia.question}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setReviewMode(false)}
                        className="text-[10px] text-teal-300 hover:text-teal-200 font-bold cursor-pointer shrink-0"
                      >
                        ← Quay lại
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {dailyTrivia.options.map((opt, idx) => {
                        const isCorrectOption = idx === dailyTrivia.correct;
                        return (
                          <div
                            key={opt}
                            className={`p-3 rounded-2xl border text-left text-xs font-medium transition-all ${
                              isCorrectOption
                                ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                                : 'bg-white/5 border-white/10 text-white/60'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-mono mr-2 ${
                                isCorrectOption ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-amber-300'
                              }`}
                            >
                              {String.fromCharCode(65 + idx)}
                            </span>
                            {opt}
                            {isCorrectOption && <span className="ml-1.5 text-emerald-400">✓</span>}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-neutral-500 text-center">
                      Chế độ xem lại — không thể trả lời lại trong hôm nay.
                    </p>
                  </div>
                )}

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

export const StreakFlameWidget: React.FC<{
  streakCount: number;
  onClick: () => void;
  className?: string;
  compact?: boolean;
}> = ({ streakCount, onClick, className = '', compact = false }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ff-streak-widget group relative flex items-center gap-2 rounded-full liquid-glass border border-amber-400/40 hover:border-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition-all cursor-pointer shadow-[0_0_18px_rgba(245,158,11,0.25)] select-none overflow-visible ${
        compact ? 'px-2 py-1' : 'px-3 py-1.5'
      } ${className}`}
      title="Chuỗi điểm danh • Nhấp để mở điểm danh & kho quà"
      aria-label="Chuỗi điểm danh hàng ngày"
    >
      {/* Animated Aura Glow */}
      <span className="absolute -inset-1 rounded-full ff-streak-aura pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity" />

      {/* Fiery Flame Icon with Multi-layer SVG */}
      <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5 text-orange-500 transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_8px_#f97316] ff-flame-flicker"
          fill="currentColor"
        >
          <path d="M12 2C9.5 6.5 6 9 6 13.5C6 17 8.7 20 12 20C15.3 20 18 17 18 13.5C18 9 14.5 6.5 12 2Z" />
        </svg>
        <svg
          viewBox="0 0 24 24"
          className="w-3.5 h-3.5 text-amber-300 absolute inset-0 m-auto animate-pulse"
          fill="currentColor"
        >
          <path d="M12 6C10.5 9 8 10.5 8 13.5C8 15.5 9.8 17.5 12 17.5C14.2 17.5 16 15.5 16 13.5C16 10.5 13.5 9 12 6Z" />
        </svg>
      </div>

      <div className="flex flex-col items-start leading-none relative z-10">
        <span className="text-[11px] font-extrabold ff-aurora-text font-mono tracking-wider">
          {streakCount} NGÀY
        </span>
        {!compact && (
          <span className="text-[8.5px] uppercase font-mono text-amber-200/70 tracking-tight">Streak</span>
        )}
      </div>
    </button>
  );
};

export default DailyEngagementModal;
