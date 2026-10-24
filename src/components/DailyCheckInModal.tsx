import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Flame,
  Sparkles,
  HelpCircle,
  Calendar,
  History,
  Gift,
  CheckCircle2,
  Shield,
  Coins,
  ArrowRight,
  Check,
  Award,
  LogIn,
} from 'lucide-react';
import type { User } from '../types';
import type { DailyRewardAction, DailyRewardActionResult } from '../types/rewards';
import { playChime, playUiTick } from '../utils/audio';
import { safeStorage } from '../utils/storage';

export interface DailyCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onOpenLoginModal?: () => void;
  onClaimDailyReward?: (action: DailyRewardAction) => Promise<DailyRewardActionResult>;
}

type CheckInTab = 'trivia' | 'streak' | 'ledger' | 'shop';

interface TriviaQuestion {
  id: string;
  subject: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const TRIVIA_BANK: TriviaQuestion[] = [
  {
    id: 'tv-1',
    subject: 'Toán học',
    question: 'Tập xác định của hàm số y = 1 / sqrt(x - 2) là gì?',
    options: ['(2; +vô cùng)', '[2; +vô cùng)', 'R \\ {2}', '(-vô cùng; 2)'],
    correctIndex: 0,
    explanation: 'Biểu thức dưới căn ở mẫu phải lớn hơn 0: x - 2 > 0 => x > 2.',
  },
  {
    id: 'tv-2',
    subject: 'Vật lý',
    question: 'Trong dao động điều hòa, li độ và gia tốc luôn biến thiên thế nào với nhau?',
    options: ['Cùng pha', 'Ngược pha', 'Vuông pha', 'Lệch pha pi/4'],
    correctIndex: 1,
    explanation: 'Ta có a = -omega^2 * x nên gia tốc luôn ngược pha với li độ.',
  },
  {
    id: 'tv-3',
    subject: 'Hóa học',
    question: 'Chất nào sau đây thuộc loại este no, đơn chức, mạch hở?',
    options: ['CH3COOCH3', 'CH2=CHCOOCH3', 'HCOOCH=CH2', 'C6H5COOCH3'],
    correctIndex: 0,
    explanation: 'CH3COOCH3 có công thức C3H6O2 thuộc dãy CnH2nO2 (este no, đơn chức).',
  },
  {
    id: 'tv-4',
    subject: 'Ngữ văn',
    question: 'Tập thơ "Từ ấy" (1937 - 1946) là tác phẩm đầu tay của nhà thơ nào?',
    options: ['Tố Hữu', 'Xuân Diệu', 'Huy Cận', 'Chế Lan Viên'],
    correctIndex: 0,
    explanation: '"Từ ấy" đánh dấu bước ngoặt tư tưởng cách mạng của Tố Hữu.',
  },
  {
    id: 'tv-5',
    subject: 'Tiếng Anh',
    question: 'Choose the correct preposition: She is capable ___ solving complex equations.',
    options: ['of', 'in', 'at', 'with'],
    correctIndex: 0,
    explanation: 'Cấu trúc cố định là "capable of doing something".',
  },
  {
    id: 'tv-6',
    subject: 'Lịch sử',
    question: 'Chiến dịch Điện Biên Phủ toàn thắng vào ngày tháng năm nào?',
    options: ['07/05/1954', '19/12/1946', '30/04/1975', '02/09/1945'],
    correctIndex: 0,
    explanation: 'Chiều ngày 07/05/1954, tập đoàn cứ điểm Điện Biên Phủ bị tiêu diệt hoàn toàn.',
  },
];

interface LedgerItem {
  id: string;
  title: string;
  delta: number;
  time: string;
  category: string;
}

const DEFAULT_LEDGER: LedgerItem[] = [
  { id: 'lg-1', title: 'Điểm danh Chuyên Cần Ngày 4', delta: 18, time: 'Hôm nay · 07:30', category: 'streak' },
  { id: 'lg-2', title: 'Trả lời đúng Đố Vui 15s môn Toán', delta: 15, time: 'Hôm nay · 07:35', category: 'trivia' },
  { id: 'lg-3', title: 'Thưởng Lời Giải Hay Nhất: Bất đẳng thức', delta: 50, time: 'Hôm qua · 21:15', category: 'solution' },
  { id: 'lg-4', title: 'Treo thưởng Bounty câu hỏi Hóa học Este', delta: -20, time: '2 ngày trước · 14:10', category: 'bounty' },
  { id: 'lg-5', title: 'Hoàn thành phiên Pomodoro 25 phút', delta: 25, time: '3 ngày trước · 20:00', category: 'focus' },
  { id: 'lg-6', title: 'Tặng thưởng Chào Mừng Thành Viên F-Forum', delta: 100, time: '7 ngày trước · 09:00', category: 'system' },
];

interface ScholarShopItem {
  id: string;
  name: string;
  price: number;
  description: string;
  tag: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SCHOLAR_SHOP_ITEMS: ScholarShopItem[] = [
  {
    id: 'item-avatar-color',
    name: 'Thẻ Đổi Màu Avatar',
    price: 100,
    description: 'Tùy biến dải màu viền cá nhân rực rỡ trong phòng đàm thoại & diễn đàn.',
    tag: 'Tùy biến',
    icon: Sparkles,
  },
  {
    id: 'item-gold-badge',
    name: 'Huy Hiệu Sư Phạm Vàng',
    price: 250,
    description: 'Huy hiệu tôn vinh thành viên tích cực giải đáp bài học cho bạn bè.',
    tag: 'Danh hiệu',
    icon: Award,
  },
  {
    id: 'item-pin-pass',
    name: 'Thẻ Ưu Tiên Ghim Bài',
    price: 150,
    description: 'Đưa câu hỏi hoặc mạch thảo luận lên vị trí đầu diễn đàn trong 24 giờ.',
    tag: 'Ưu tiên',
    icon: Coins,
  },
  {
    id: 'item-streak-freeze',
    name: 'Khiên Bảo Vệ Chuỗi Ngày',
    price: 75,
    description: 'Tự động bảo toàn chuỗi ngày học tập nếu bạn bận rộn nghỉ 1 ngày.',
    tag: 'Bảo hộ',
    icon: Shield,
  },
];

export const DailyCheckInModal: React.FC<DailyCheckInModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenLoginModal,
  onClaimDailyReward,
}) => {
  const [activeTab, setActiveTab] = useState<CheckInTab>('streak');
  const [activeQuestion, setActiveQuestion] = useState<TriviaQuestion>(() => TRIVIA_BANK[0]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const storageKeyPrefix = useMemo(() => {
    const email = currentUser?.email ? currentUser.email.trim().toLowerCase() : 'guest';
    return `fforum_checkin_2027_${encodeURIComponent(email)}`;
  }, [currentUser]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [hasClaimedToday, setHasClaimedToday] = useState(() => {
    return safeStorage.getItem(`${storageKeyPrefix}_last_claim`) === todayStr;
  });
  const [streakCount, setStreakCount] = useState<number>(() => currentUser?.streakCount || 4);
  const [hasShield, setHasShield] = useState(() => {
    return safeStorage.getItem(`${storageKeyPrefix}_has_shield`) === 'true';
  });
  const [shopFeedback, setShopFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const randIdx = Math.floor(Math.random() * TRIVIA_BANK.length);
    setActiveQuestion(TRIVIA_BANK[randIdx] || TRIVIA_BANK[0]);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setTimeLeft(15);
    setIsTimerRunning(false);
    setShopFeedback(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isTimerRunning || timeLeft <= 0 || isAnswerSubmitted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsAnswerSubmitted(true);
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft, isAnswerSubmitted]);

  const handleStartTrivia = useCallback(() => {
    playUiTick();
    setIsTimerRunning(true);
    setTimeLeft(15);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
  }, []);

  const handleAnswerClick = useCallback((index: number) => {
    if (isAnswerSubmitted || !isTimerRunning) return;
    playUiTick();
    setSelectedAnswer(index);
    setIsAnswerSubmitted(true);
    setIsTimerRunning(false);

    if (index === activeQuestion.correctIndex) {
      playChime('success');
      onClaimDailyReward?.({ action: 'quiz', answerIndex: index });
    } else {
      playChime('xp');
    }
  }, [isAnswerSubmitted, isTimerRunning, activeQuestion, onClaimDailyReward]);

  const handleClaimStreak = useCallback(() => {
    if (hasClaimedToday) return;
    playChime('level-up');
    const todayStr = new Date().toISOString().slice(0, 10);
    safeStorage.setItem(`${storageKeyPrefix}_last_claim`, todayStr);
    setHasClaimedToday(true);
    setStreakCount((prev) => prev + 1);
    onClaimDailyReward?.({ action: 'attendance' });
  }, [hasClaimedToday, storageKeyPrefix, onClaimDailyReward]);

  const handleToggleShield = useCallback(() => {
    playUiTick();
    setHasShield((prev) => {
      const next = !prev;
      safeStorage.setItem(`${storageKeyPrefix}_has_shield`, String(next));
      return next;
    });
  }, [storageKeyPrefix]);

  const handleRedeemShopItem = useCallback((item: ScholarShopItem) => {
    playUiTick();
    const currentCoin = currentUser?.coin || 200;
    if (currentCoin < item.price) {
      setShopFeedback(`Chưa đủ Coin để đổi ${item.name} (cần ${item.price} Coin).`);
      return;
    }
    playChime('success');
    if (item.id === 'item-streak-freeze') {
      setHasShield(true);
      safeStorage.setItem(`${storageKeyPrefix}_has_shield`, 'true');
    }
    setShopFeedback(`Đã đổi thành công "${item.name}"! Vật phẩm đã được chuyển vào túi đồ học giả.`);
  }, [currentUser, storageKeyPrefix]);

  if (!isOpen || typeof document === 'undefined') return null;

  const timerStrokeDashoffset = ((15 - timeLeft) / 15) * 100;

  const streakDays = [
    { day: 1, reward: '+5 Coin', label: 'Thứ 2', achieved: streakCount >= 1 },
    { day: 2, reward: '+8 Coin', label: 'Thứ 3', achieved: streakCount >= 2 },
    { day: 3, reward: '+15 Coin', label: 'Thứ 4', achieved: streakCount >= 3 },
    { day: 4, reward: '+18 Coin', label: 'Thứ 5', achieved: streakCount >= 4 },
    { day: 5, reward: '+25 Coin', label: 'Thứ 6', achieved: streakCount >= 5 },
    { day: 6, reward: '+30 Coin', label: 'Thứ 7', achieved: streakCount >= 6 },
    { day: 7, reward: 'Khung Vàng', label: 'Chủ Nhật', achieved: streakCount >= 7, isSpecial: true },
  ];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Điểm danh và Chuỗi ngày học tập"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card-hard w-full max-w-2xl bg-[#FBF2E1] border-2 border-[#2B2331] text-[#2B2331] rounded-2xl shadow-[6px_6px_0px_#2B2331] flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-[#2B2331] bg-[#F7EBD3]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 border-2 border-[#2B2331] flex items-center justify-center shadow-[2px_2px_0px_#2B2331]">
              <Flame className="w-5 h-5 text-[#2B2331] fill-amber-300 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-[#2B2331]">
                Chuỗi Ngày &amp; Điểm Danh Học Thuật
              </h3>
              <p className="text-xs font-semibold text-[#5A4D61]">
                Học đều mỗi ngày · Không loot box · Minh bạch 100%
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng điểm danh"
            className="ff-tactile-pop btn-feastables p-2 rounded-xl bg-[#FBF2E1] hover:bg-white text-[#2B2331] border-2 border-[#2B2331] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!currentUser && onOpenLoginModal && (
          <div className="bg-amber-100 border-b-2 border-[#2B2331] px-4 py-2 flex items-center justify-between text-xs font-bold text-[#2B2331]">
            <span>Chế độ khách. Đăng nhập để đồng bộ chuỗi ngày và Coin lên máy chủ.</span>
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="ff-tactile-pop btn-feastables px-2.5 py-1 bg-amber-400 border border-[#2B2331] rounded-lg flex items-center gap-1.5 cursor-pointer text-xs font-black"
            >
              <LogIn className="w-3.5 h-3.5" />
              Đăng nhập
            </button>
          </div>
        )}

        <div className="grid grid-cols-4 border-b-2 border-[#2B2331] bg-[#EFE3CA] text-xs font-extrabold select-none">
          <button
            type="button"
            onClick={() => { playUiTick(); setActiveTab('streak'); }}
            className={`py-3 px-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-r-2 border-[#2B2331] ${
              activeTab === 'streak'
                ? 'bg-[#FBF2E1] text-[#2B2331] shadow-inner font-black'
                : 'text-[#6B5E73] hover:text-[#2B2331]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chuỗi 7 Ngày</span>
            <span className="sm:hidden">Chuỗi</span>
          </button>

          <button
            type="button"
            onClick={() => { playUiTick(); setActiveTab('trivia'); }}
            className={`py-3 px-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-r-2 border-[#2B2331] ${
              activeTab === 'trivia'
                ? 'bg-[#FBF2E1] text-[#2B2331] shadow-inner font-black'
                : 'text-[#6B5E73] hover:text-[#2B2331]'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đố Vui 15s</span>
            <span className="sm:hidden">Đố Vui</span>
          </button>

          <button
            type="button"
            onClick={() => { playUiTick(); setActiveTab('ledger'); }}
            className={`py-3 px-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-r-2 border-[#2B2331] ${
              activeTab === 'ledger'
                ? 'bg-[#FBF2E1] text-[#2B2331] shadow-inner font-black'
                : 'text-[#6B5E73] hover:text-[#2B2331]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sổ Cái Điểm</span>
            <span className="sm:hidden">Sổ Cái</span>
          </button>

          <button
            type="button"
            onClick={() => { playUiTick(); setActiveTab('shop'); }}
            className={`py-3 px-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'shop'
                ? 'bg-[#FBF2E1] text-[#2B2331] shadow-inner font-black'
                : 'text-[#6B5E73] hover:text-[#2B2331]'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đổi Vật Phẩm</span>
            <span className="sm:hidden">Đổi Quà</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
          {activeTab === 'streak' && (
            <div className="space-y-6 animate-fade-in">
              <div className="card-hard bg-[#FFFDF8] border-2 border-[#2B2331] p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-400 border-2 border-[#2B2331] flex items-center justify-center shadow-[3px_3px_0px_#2B2331]">
                    <Flame className="w-8 h-8 text-[#2B2331] fill-amber-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black font-mono text-[#2B2331]">
                        {streakCount} Ngày
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-400">
                        Đang rực sáng
                      </span>
                    </div>
                    <p className="text-xs text-[#5A4D61] mt-0.5 font-medium">
                      Duy trì liên tục để nhận Khung Học Giả Vàng vào Ngày 7
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleShield}
                    className={`ff-tactile-pop btn-feastables px-3.5 py-2 rounded-xl text-xs font-bold border-2 border-[#2B2331] inline-flex items-center gap-1.5 cursor-pointer ${
                      hasShield ? 'bg-sky-200 text-sky-900' : 'bg-[#EFE3CA] text-[#2B2331]'
                    }`}
                  >
                    <Shield className="w-4 h-4 text-sky-600" />
                    <span>{hasShield ? 'Khiên đã kích hoạt' : 'Bật khiên bảo vệ'}</span>
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#5A4D61] mb-3">
                  Lịch Tuần &amp; Các Cột Mốc Thưởng
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                  {streakDays.map((item) => (
                    <div
                      key={item.day}
                      className={`card-hard p-3 rounded-xl border-2 border-[#2B2331] text-center flex flex-col justify-between h-28 transition-all ${
                        item.achieved
                          ? 'bg-amber-100/90 shadow-[2px_2px_0px_#2B2331]'
                          : 'bg-[#FFFDF8] opacity-75'
                      }`}
                    >
                      <span className="text-[11px] font-bold text-[#6B5E73]">
                        {item.label}
                      </span>
                      <div className="flex justify-center my-1">
                        {item.achieved ? (
                          <div className="w-7 h-7 rounded-full bg-amber-400 border border-[#2B2331] flex items-center justify-center">
                            <Check className="w-4 h-4 text-[#2B2331]" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-[#EFE3CA] border border-[#2B2331] flex items-center justify-center text-xs font-mono font-bold text-[#6B5E73]">
                            {item.day}
                          </div>
                        )}
                      </div>
                      <span className={`text-[10.5px] font-mono font-extrabold ${item.isSpecial ? 'text-amber-800' : 'text-[#2B2331]'}`}>
                        {item.reward}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-[#5A4D61] font-semibold text-center sm:text-left">
                  {hasClaimedToday
                    ? 'Bạn đã hoàn thành điểm danh hôm nay. Hẹn gặp lại vào ngày mai!'
                    : 'Bấm nút bên cạnh để ghi nhận ngày học hôm nay.'}
                </span>

                <button
                  type="button"
                  onClick={handleClaimStreak}
                  disabled={hasClaimedToday}
                  className={`ff-tactile-pop btn-feastables w-full sm:w-auto px-6 py-3 rounded-xl border-2 border-[#2B2331] text-xs sm:text-sm font-black flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_#2B2331] ${
                    hasClaimedToday
                      ? 'bg-[#EFE3CA] text-[#8A7D91] opacity-60 cursor-not-allowed'
                      : 'bg-emerald-400 hover:bg-emerald-300 text-[#2B2331]'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{hasClaimedToday ? 'Đã điểm danh hôm nay' : 'Điểm danh ngay (+18 Coin)'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'trivia' && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-[#FFFDF8] border-2 border-[#2B2331]">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-[#EFE3CA]"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-amber-500 transition-all duration-1000 ease-linear"
                        strokeDasharray="100, 100"
                        strokeDashoffset={timerStrokeDashoffset}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="absolute font-mono text-sm font-black text-[#2B2331]">
                      {timeLeft}s
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-200 text-[#2B2331] border border-[#2B2331]">
                        {activeQuestion.subject}
                      </span>
                      <span className="text-xs font-bold text-emerald-800">
                        Thưởng +15 Bounty
                      </span>
                    </div>
                    <p className="text-xs text-[#5A4D61] mt-1">
                      15 giây phản xạ kiến thức mỗi ngày
                    </p>
                  </div>
                </div>

                {!isTimerRunning && !isAnswerSubmitted && (
                  <button
                    type="button"
                    onClick={handleStartTrivia}
                    className="ff-tactile-pop btn-feastables px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#2B2331] border-2 border-[#2B2331] text-xs font-black cursor-pointer shadow-[2px_2px_0px_#2B2331]"
                  >
                    Bắt đầu 15s
                  </button>
                )}
              </div>

              <div className="card-hard bg-[#FFFDF8] border-2 border-[#2B2331] p-5 rounded-2xl space-y-4">
                <h4 className="text-sm sm:text-base font-bold text-[#2B2331] leading-relaxed">
                  {activeQuestion.question}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeQuestion.options.map((opt, idx) => {
                    const isChosen = selectedAnswer === idx;
                    const isCorrect = idx === activeQuestion.correctIndex;
                    let btnStyle = 'bg-[#FBF2E1] border-2 border-[#2B2331] text-[#2B2331] hover:bg-amber-100';

                    if (isAnswerSubmitted) {
                      if (isCorrect) {
                        btnStyle = 'bg-emerald-200 border-2 border-[#2B2331] text-emerald-950 font-black';
                      } else if (isChosen) {
                        btnStyle = 'bg-rose-200 border-2 border-[#2B2331] text-rose-950 font-bold';
                      } else {
                        btnStyle = 'bg-[#EFE3CA] border-2 border-[#2B2331] text-[#8A7D91] opacity-60';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={!isTimerRunning || isAnswerSubmitted}
                        onClick={() => handleAnswerClick(idx)}
                        className={`ff-tactile-pop p-3 rounded-xl text-xs sm:text-sm text-left flex items-center gap-2.5 transition-all cursor-pointer ${btnStyle}`}
                      >
                        <span className="w-6 h-6 rounded-lg bg-[#2B2331] text-[#FBF2E1] font-mono font-bold flex items-center justify-center shrink-0 text-xs">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="flex-1 leading-snug">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {isAnswerSubmitted && (
                  <div className="p-3.5 rounded-xl bg-[#F7EBD3] border-2 border-[#2B2331] text-xs space-y-1 animate-fade-in">
                    <strong className="block font-black text-[#2B2331]">
                      {selectedAnswer === activeQuestion.correctIndex
                        ? 'Chính xác! Bạn đã nhận +15 Bounty.'
                        : 'Chưa đúng rồi! Hãy cùng xem lời giải nhé:'}
                    </strong>
                    <p className="text-[#5A4D61] leading-relaxed">
                      {activeQuestion.explanation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'ledger' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FFFDF8] border-2 border-[#2B2331]">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-[#5A4D61]">Tổng số dư hiện tại:</span>
                  <span className="text-sm font-black font-mono text-[#2B2331]">
                    {currentUser?.coin || 200} Coin
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#6B5E73]">
                  Minh bạch 100% · Không trừ phí ẩn
                </span>
              </div>

              <div className="space-y-2">
                {DEFAULT_LEDGER.map((item) => (
                  <div
                    key={item.id}
                    className="card-hard p-3.5 rounded-xl bg-[#FFFDF8] border-2 border-[#2B2331] flex items-center justify-between gap-3 shadow-[2px_2px_0px_#2B2331]"
                  >
                    <div className="min-w-0">
                      <p className="text-xs sm:text-[13px] font-bold text-[#2B2331] truncate">
                        {item.title}
                      </p>
                      <span className="text-[11px] font-mono text-[#6B5E73]">
                        {item.time}
                      </span>
                    </div>

                    <span
                      className={`text-sm font-black font-mono px-2.5 py-1 rounded-lg border-2 border-[#2B2331] shrink-0 ${
                        item.delta > 0
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-rose-100 text-rose-900'
                      }`}
                    >
                      {item.delta > 0 ? `+${item.delta}` : item.delta} Coin
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'shop' && (
            <div className="space-y-4 animate-fade-in">
              {shopFeedback && (
                <div className="p-3 rounded-xl bg-emerald-100 border-2 border-[#2B2331] text-xs font-bold text-emerald-900 flex items-center justify-between gap-2">
                  <span>{shopFeedback}</span>
                  <button
                    type="button"
                    onClick={() => setShopFeedback(null)}
                    className="p-1 text-emerald-800 hover:text-black cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SCHOLAR_SHOP_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="card-hard p-4 rounded-xl bg-[#FFFDF8] border-2 border-[#2B2331] flex flex-col justify-between space-y-3 shadow-[3px_3px_0px_#2B2331]"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded-md bg-amber-200 text-[#2B2331] border border-[#2B2331] text-[10px] font-mono font-bold uppercase">
                            {item.tag}
                          </span>
                          <span className="font-mono text-xs font-black text-amber-800 flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5 text-amber-600" />
                            {item.price} Coin
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-[#2B2331] flex items-center gap-1.5">
                          <Icon className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>{item.name}</span>
                        </h4>
                        <p className="text-xs text-[#5A4D61] mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRedeemShopItem(item)}
                        className="ff-tactile-pop btn-feastables w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#2B2331] border-2 border-[#2B2331] text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#2B2331]"
                      >
                        <span>Đổi vật phẩm</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DailyCheckInModal;
