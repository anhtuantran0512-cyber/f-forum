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
import { safeStorage } from '../utils/storage';

interface DailyEngagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserCoin?: number;
  onRewardCoin?: (amount: number, reason: string) => void;
}

const TIPS = [
  'Hãy trả lời chỉn chu và đầy đủ các bước giải để dễ nhận được xác nhận Đáp Án Chuẩn!',
  'Nên đặt câu hỏi một cách rõ ràng và cụ thể để nhận được câu trả lời nhanh nhất.',
  'Điểm danh mỗi ngày tích lũy chuỗi streak và mở khóa hộp quà bí ẩn ngày 5, 10, 15.',
  'Chia sẻ lời giải hay trên sàn Q&A giúp bạn tích lũy Coin và thăng hạng danh hiệu học sinh.',
];

const TRIVIA_QUESTIONS = [
  {
    question: 'Thung lũng McMurdo (thung lũng Khô) nằm ở châu lục nào?',
    options: ['Châu Úc', 'Châu Phi', 'Không có đáp án đúng', 'Châu Nam Cực'],
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
];

export const DailyEngagementModal: React.FC<DailyEngagementModalProps> = ({
  isOpen,
  onClose,
  currentUserCoin = 100,
  onRewardCoin,
}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'gifts' | 'quiz'>('attendance');
  const [tipIndex, setTipIndex] = useState(0);

  // Attendance state
  const [attendedDays, setAttendedDays] = useState<number[]>(() => {
    const saved = safeStorage.getItem('fforum_attended_days');
    return saved ? JSON.parse(saved) : [1];
  });
  const [currentDay] = useState<number>(() => {
    const saved = safeStorage.getItem('fforum_current_day');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [hasClaimedToday, setHasClaimedToday] = useState<boolean>(() => {
    const lastClaim = safeStorage.getItem('fforum_last_claim_date');
    const today = new Date().toISOString().slice(0, 10);
    return lastClaim === today;
  });

  // Gift Boxes state: { blue: number, gold: number, red: number }
  const [boxes, setBoxes] = useState<{ blue: number; gold: number; red: number }>(() => {
    const saved = safeStorage.getItem('fforum_mystery_boxes');
    return saved ? JSON.parse(saved) : { blue: 1, gold: 0, red: 0 };
  });

  // Quiz state
  const [quizAnswered, setQuizAnswered] = useState<boolean>(() => {
    const lastQuiz = safeStorage.getItem('fforum_last_quiz_date');
    const today = new Date().toISOString().slice(0, 10);
    return lastQuiz === today;
  });
  const [quizTimer, setQuizTimer] = useState<number>(15);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<{ correct: boolean; reward: number } | null>(null);
  const [openingBox, setOpeningBox] = useState<string | null>(null);
  const [boxReward, setBoxReward] = useState<string | null>(null);

  const handleAnswerQuiz = useCallback((index: number) => {
    if (quizAnswered || selectedOption !== null) return;
    setSelectedOption(index);
    const isCorrect = index === TRIVIA_QUESTIONS[0].correct;
    const today = new Date().toISOString().slice(0, 10);
    const reward = isCorrect ? Math.floor(Math.random() * 6) + 5 : 0; // 5 - 10 Coin

    setQuizResult({ correct: isCorrect, reward });
    setQuizAnswered(true);
    safeStorage.setItem('fforum_last_quiz_date', today);

    if (isCorrect && reward > 0) {
      onRewardCoin?.(reward, 'Trả lời đúng Câu hỏi vui');
    }
  }, [quizAnswered, selectedOption, onRewardCoin]);

  // Tips cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Quiz timer countdown
  useEffect(() => {
    if (activeTab !== 'quiz' || quizAnswered || selectedOption !== null) return;
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
  }, [activeTab, quizAnswered, selectedOption, handleAnswerQuiz]);

  if (!isOpen) return null;

  const handleClaimAttendance = () => {
    if (hasClaimedToday) return;
    const today = new Date().toISOString().slice(0, 10);
    const nextAttended = Array.from(new Set([...attendedDays, currentDay]));
    setAttendedDays(nextAttended);
    setHasClaimedToday(true);
    safeStorage.setItem('fforum_attended_days', JSON.stringify(nextAttended));
    safeStorage.setItem('fforum_last_claim_date', today);

    // Milestone box awards
    const nextBoxes = { ...boxes };
    if (currentDay === 5) nextBoxes.blue += 1;
    if (currentDay === 10) nextBoxes.gold += 1;
    if (currentDay === 15) nextBoxes.red += 1;
    setBoxes(nextBoxes);
    safeStorage.setItem('fforum_mystery_boxes', JSON.stringify(nextBoxes));

    // Award +25 Coin for check-in
    onRewardCoin?.(25, `Điểm danh ngày ${currentDay}`);
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
      setBoxReward(`+${rewardCoin} Coin & Huy hiệu may mắn`);
      onRewardCoin?.(rewardCoin, `Mở hộp quà ${type}`);
      setOpeningBox(null);
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-up"
      role="dialog"
      aria-modal="true"
      aria-label="Daily Engagement Hub"
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
        {/* Header Tabs with thick golden underline */}
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

        {/* TAB 1: ĐIỂM DANH (15-Day Attendance Calendar Grid) */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-neutral-300">
              <span className="flex items-center gap-1.5 font-semibold text-white">
                <Calendar className="w-4 h-4 text-amber-400" />
                Chu kỳ điểm danh 15 ngày
              </span>
              <span className="text-[11px] text-amber-300 font-mono">
                Chuỗi Streak: {attendedDays.length} ngày 🔥
              </span>
            </div>

            {/* 3 rows x 5 cols grid */}
            <div className="grid grid-cols-5 gap-2.5 sm:gap-3">
              {Array.from({ length: 15 }, (_, i) => i + 1).map((day) => {
                const isAttended = attendedDays.includes(day);
                const isActive = day === currentDay;
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

                    {/* Milestone badge */}
                    {isMilestone && (
                      <div
                        className="absolute bottom-1 right-1 p-0.5 rounded-full"
                        title={`Hộp quà mốc ngày ${day}`}
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

        {/* TAB 2: KHO QUÀ (GIFT INVENTORY & MYSTERY BOXES) */}
        {activeTab === 'gifts' && (
          <div className="space-y-4">
            {/* Khung thông tin quy đổi có đường viền xám bên trái */}
            <div className="p-3.5 rounded-2xl bg-black/40 border-l-4 border-l-neutral-400 border border-white/10 text-xs text-neutral-300 space-y-1.5">
              <p className="font-semibold text-white">🎁 Thông tin quy đổi quà tặng:</p>
              <p className="text-[11.5px] text-neutral-300 leading-relaxed">
                Mở quà có cơ hội nhận được điểm, móc khoá, sổ tay, bộ sticker, con dấu, mũ, vở, áo mưa, bình giữ nhiệt...{' '}
                <span className="text-sky-400 hover:underline cursor-pointer">chi tiết &amp; hướng dẫn nhận quà</span>
              </p>
              <p className="text-[11px] text-amber-300/90 font-medium hover:underline cursor-pointer">
                → Danh sách trúng quà hiện vật tại đây
              </p>
            </div>

            {/* 3 Isometric Gift Boxes Display with Star Patterns & Circular Gold Count Badges */}
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
                    {/* Isometric 3D Box Top */}
                    <polygon points="32,8 54,20 32,32 10,20" fill="url(#blueBoxTop)" stroke="#7dd3fc" strokeWidth="1" />
                    {/* Isometric 3D Box Left */}
                    <polygon points="10,20 32,32 32,54 10,42" fill="url(#blueBoxLeft)" stroke="#38bdf8" strokeWidth="1" />
                    {/* Isometric 3D Box Right */}
                    <polygon points="32,32 54,20 54,42 32,54" fill="url(#blueBoxRight)" stroke="#38bdf8" strokeWidth="1" />
                    {/* Star Pattern Accent */}
                    <polygon points="21,30 22,33 25,33 23,35 24,38 21,36 18,38 19,35 17,33 20,33" fill="#bae6fd" opacity="0.8" />
                    <polygon points="43,30 44,33 47,33 45,35 46,38 43,36 40,38 41,35 39,33 42,33" fill="#bae6fd" opacity="0.8" />
                    {/* Cyan Bow */}
                    <path d="M26 12 C24 6 30 6 32 10 C34 6 40 6 38 12 C34 16 30 16 26 12 Z" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1" />
                  </svg>
                  {/* Circular Gold Count Badge */}
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
                  {openingBox === 'blue' ? 'Đang mở...' : 'Mở Hộp'}
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
                    <polygon points="21,30 22,33 25,33 23,35 24,38 21,36 18,38 19,35 17,33 20,33" fill="#fef9c3" opacity="0.8" />
                    <polygon points="43,30 44,33 47,33 45,35 46,38 43,36 40,38 41,35 39,33 42,33" fill="#fef9c3" opacity="0.8" />
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
                  {openingBox === 'gold' ? 'Đang mở...' : 'Mở Hộp'}
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
                    <polygon points="21,30 22,33 25,33 23,35 24,38 21,36 18,38 19,35 17,33 20,33" fill="#ffe4e6" opacity="0.8" />
                    <polygon points="43,30 44,33 47,33 45,35 46,38 43,36 40,38 41,35 39,33 42,33" fill="#ffe4e6" opacity="0.8" />
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
                  {openingBox === 'red' ? 'Đang mở...' : 'Mở Hộp'}
                </button>
              </div>
            </div>

            {/* Nút phụ: Dòng chữ in đậm 'Lịch sử mở quà' đặt ngay dưới hộp quà thứ 3 */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setBoxReward(boxes.blue + boxes.gold + boxes.red > 0 ? 'Đã nhận chuỗi phần thưởng quà điểm danh' : 'Chưa có lịch sử mở quà gần đây')}
                className="text-xs font-bold text-amber-300 hover:text-amber-200 underline transition-colors cursor-pointer"
              >
                Lịch sử mở quà
              </button>
            </div>

            {boxReward && (
              <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-center animate-fade-up">
                <span className="text-xs font-bold text-emerald-300">
                  🎉 {boxReward}!
                </span>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CÂU HỎI VUI (DAILY TRIVIA QUIZ) */}
        {activeTab === 'quiz' && (
          <div className="space-y-4">
            {!quizAnswered ? (
              <>
                {/* Active Question with 15s Countdown */}
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h3 className="text-xs sm:text-sm font-bold text-white max-w-[80%] leading-snug">
                    {TRIVIA_QUESTIONS[0].question}
                  </h3>
                  <div className="relative w-10 h-10 flex items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-400/40 text-cyan-300 font-mono font-bold text-xs shrink-0">
                    <Clock className="w-3 h-3 absolute -top-1 -right-1 text-cyan-400" />
                    <span>{quizTimer}s</span>
                  </div>
                </div>

                {/* 4 Choices */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TRIVIA_QUESTIONS[0].options.map((opt, idx) => (
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
              /* Rules & Completed Result with "Xem lại" button */
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
                      ? `Trả lời đúng +${quizResult.reward} điểm`
                      : 'Rất tiếc chưa chính xác. Hẹn bạn vào ngày mai nhé!'}
                  </p>
                  {/* Nút hành động phụ: Nút bo góc màu xanh ngọc "Xem lại" */}
                  <div className="mt-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setQuizAnswered(false);
                        setSelectedOption(null);
                        setQuizTimer(15);
                      }}
                      className="px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-neutral-950 font-bold text-xs transition-colors cursor-pointer shadow-md"
                    >
                      Xem lại
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-1.5 text-xs text-neutral-300">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                    Luật chơi câu hỏi vui:
                  </p>
                  <p className="text-[11px] text-neutral-400">🟢 Mỗi ngày có thể tham gia trả lời câu hỏi vui 1 lần.</p>
                  <p className="text-[11px] text-neutral-400">🟢 Bạn có 15 giây để đọc và trả lời câu hỏi.</p>
                  <p className="text-[11px] text-neutral-400">🟢 Bạn sẽ nhận được ngẫu nhiên từ 5 đến 10 điểm nếu trả lời đúng câu hỏi.</p>
                  <p className="text-[11px] text-neutral-400">🟢 Trả lời sai không bị mất điểm.</p>
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
            ĐÓNG
          </button>
        </div>
      </div>
    </div>
  );
};

// Streak Flame Widget Component with GPU-accelerated animated fire & aura
export const StreakFlameWidget: React.FC<{
  streakCount: number;
  onClick: () => void;
  className?: string;
}> = ({ streakCount, onClick, className = '' }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-full liquid-glass border border-amber-400/40 hover:border-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition-all cursor-pointer shadow-[0_0_18px_rgba(245,158,11,0.25)] select-none ${className}`}
      title="Chuỗi điểm danh hàng ngày • Nhấp để mở Lò Coin & Kho Quà"
      aria-label="Chuỗi điểm danh hàng ngày"
    >
      {/* Animated Aura Glow */}
      <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-500/30 via-orange-500/20 to-yellow-400/30 blur-sm pointer-events-none group-hover:opacity-100 transition-opacity opacity-70 animate-pulse" />

      {/* Fiery Flame Icon with Multi-layer SVG */}
      <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5 text-orange-500 transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_8px_#f97316]"
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
        <span className="text-[11px] font-extrabold text-amber-300 font-mono tracking-wider">
          {streakCount} NGÀY
        </span>
        <span className="text-[8.5px] uppercase font-mono text-amber-200/70 tracking-tight">
          STREAK
        </span>
      </div>
    </button>
  );
};

export default DailyEngagementModal;
