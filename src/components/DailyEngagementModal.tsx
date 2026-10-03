/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, CheckCircle2, Clock3, Flame, Gift, Lightbulb, LockKeyhole, X } from 'lucide-react';
import type { User } from '../types';
import { getDailyQuestion } from '../utils/dailyQuestions';

export interface DailyActionResult {
  success: boolean;
  message?: string;
  rewardCoin?: number;
  rewardXp?: number;
  boxType?: 'blue' | 'gold' | 'red' | null;
  correct?: boolean;
  answer?: number;
  explanation?: string;
  user?: User;
}

interface DailyEngagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onOpenLoginModal: () => void;
  onClaimAttendance: () => Promise<DailyActionResult>;
  onAnswerQuestion: (questionId: string, choice: number) => Promise<DailyActionResult>;
  onOpenBox: (type: 'blue' | 'gold' | 'red') => Promise<DailyActionResult>;
}

const TIPS = [
  'Câu hỏi rõ ràng giúp bạn học cùng nhau hiệu quả hơn.',
  'Chọn lời giải tốt nhất để ghi nhận phần đóng góp hữu ích.',
  'Điểm danh liên tục giúp duy trì chuỗi ngày học tập.',
];

const getTodayKey = () => new Date().toISOString().slice(0, 10);

export const DailyEngagementModal: React.FC<DailyEngagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenLoginModal,
  onClaimAttendance,
  onAnswerQuestion,
  onOpenBox,
}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'gifts' | 'quiz'>('attendance');
  const [tipIndex, setTipIndex] = useState(0);
  const [quizTimer, setQuizTimer] = useState(15);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<DailyActionResult | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);
  const [openingBox, setOpeningBox] = useState<'blue' | 'gold' | 'red' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [claimedTodayLocally, setClaimedTodayLocally] = useState(false);
  const today = getTodayKey();
  const quiz = useMemo(() => getDailyQuestion(today), [today]);
  const checkedInToday = Boolean(currentUser?.lastCheckInDate === today || claimedTodayLocally);
  const answeredToday = Boolean(currentUser?.lastQuizDate === today || quizResult?.success);
  const streak = currentUser?.streakCount || 0;
  const boxes = currentUser?.mysteryBoxes || { blue: 0, gold: 0, red: 0 };
  const tips = TIPS;

  useEffect(() => {
    const timer = window.setInterval(() => setTipIndex((index) => (index + 1) % tips.length), 7000);
    return () => window.clearInterval(timer);
  }, [tips.length]);

  useEffect(() => {
    if (!isOpen) return;
    setQuizTimer(15);
    setSelectedOption(null);
    setQuizResult(null);
    setMessage(null);
  }, [isOpen, currentUser?.id, today]);

  const submitAnswer = useCallback(async (choice: number) => {
    if (!currentUser) {
      onOpenLoginModal();
      return;
    }
    if (answeredToday || submittingQuiz) return;
    setSubmittingQuiz(true);
    setSelectedOption(choice);
    const result = await onAnswerQuestion(quiz.id, choice);
    setSubmittingQuiz(false);
    if (!result.success) {
      setSelectedOption(null);
      setQuizTimer(15);
      setMessage(result.message || 'Không thể gửi câu trả lời. Thử lại nhé.');
      return;
    }
    setQuizResult(result);
    setMessage(result.correct
      ? `Đúng rồi · +${result.rewardXp || 0} XP, +${result.rewardCoin || 0} Coin.`
      : 'Đã ghi nhận câu trả lời. Hẹn bạn với câu hỏi mới vào ngày mai.');
  }, [answeredToday, currentUser, onAnswerQuestion, onOpenLoginModal, quiz.id, submittingQuiz]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'quiz' || !currentUser || answeredToday || submittingQuiz) return;
    const timer = window.setInterval(() => {
      setQuizTimer((remaining) => {
        if (remaining <= 1) {
          window.clearInterval(timer);
          void submitAnswer(-1);
          return 0;
        }
        return remaining - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeTab, answeredToday, currentUser, isOpen, submittingQuiz, submitAnswer]);

  const handleClaimAttendance = async () => {
    if (!currentUser) {
      onOpenLoginModal();
      return;
    }
    if (checkedInToday || submittingCheckIn) return;
    setSubmittingCheckIn(true);
    const result = await onClaimAttendance();
    setSubmittingCheckIn(false);
    if (result.success) {
      setClaimedTodayLocally(true);
      setMessage(`Đã điểm danh · +${result.rewardCoin || 0} Coin, +${result.rewardXp || 0} XP.`);
    } else {
      setMessage(result.message || 'Không thể điểm danh. Thử lại nhé.');
    }
  };

  const handleOpenBox = async (type: 'blue' | 'gold' | 'red') => {
    if (!currentUser || openingBox || (boxes[type] || 0) < 1) return;
    setOpeningBox(type);
    const result = await onOpenBox(type);
    setOpeningBox(null);
    setMessage(result.success
      ? `Đã mở hộp · +${result.rewardCoin || 0} Coin.`
      : result.message || 'Không thể mở hộp quà.');
  };

  if (!isOpen) return null;

  const recentDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: new Intl.DateTimeFormat('vi-VN', { weekday: 'short', timeZone: 'UTC' }).format(date),
      day: date.getUTCDate(),
      attended: Boolean(currentUser?.attendanceDates?.includes(key) || (key === today && checkedInToday)),
      isToday: key === today,
    };
  });

  const tabs = [
    { id: 'attendance' as const, label: 'Điểm danh' },
    { id: 'quiz' as const, label: 'Câu hỏi ngày' },
    { id: 'gifts' as const, label: 'Hộp quà' },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Điểm danh và câu hỏi ngày">
      <button type="button" tabIndex={-1} aria-label="Đóng" className="fixed inset-0 cursor-default" onClick={onClose} />
      <section className="relative z-10 w-full max-w-xl max-h-[92dvh] overflow-y-auto rounded-3xl border border-white/15 bg-[#0c1218]/95 p-4 shadow-[0_24px_70px_rgba(0,0,0,.7)] sm:p-6">
        <header className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h2 className="text-base font-bold text-white">Nhịp học tập</h2>
            <p className="mt-0.5 text-xs text-white/50">Phần thưởng được ghi nhận sau mỗi hoạt động.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Đóng bảng">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="mb-4 flex gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} aria-pressed={activeTab === tab.id}
              className={`flex-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition-colors sm:text-xs ${activeTab === tab.id ? 'bg-amber-400 text-neutral-950' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-300/15 bg-amber-300/[0.06] p-3 text-xs text-amber-100/80">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p>{tips[tipIndex]}</p>
        </div>

        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <CalendarDays className="h-4 w-4 text-amber-300" /> Chuỗi điểm danh
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-300"><Flame className="h-4 w-4" />{streak} ngày</span>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {recentDays.map((day) => (
                <div key={day.key} className={`rounded-xl border p-2 text-center ${day.attended ? 'border-emerald-400/35 bg-emerald-400/10' : day.isToday ? 'border-amber-300/30 bg-amber-300/[0.06]' : 'border-white/10 bg-white/[0.03]'}`}>
                  <div className="text-[9px] text-white/45">{day.label}</div>
                  <div className="mt-1 text-xs font-bold text-white">{day.day}</div>
                  <div className="mt-1 flex justify-center">{day.attended ? <Check className="h-3 w-3 text-emerald-300" /> : <span className="h-3 w-3" />}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{checkedInToday ? 'Đã điểm danh hôm nay' : 'Điểm danh hôm nay'}</p>
                <p className="mt-1 text-xs text-white/50">Thưởng: 25 Coin và 5 XP · mỗi ngày một lần</p>
              </div>
              <button type="button" onClick={handleClaimAttendance} disabled={checkedInToday || submittingCheckIn}
                className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-neutral-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50">
                {submittingCheckIn ? 'Đang ghi nhận…' : checkedInToday ? 'Đã nhận' : currentUser ? 'Điểm danh' : 'Đăng nhập'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300">Câu hỏi ngày</p>
                <h3 className="mt-2 text-sm font-semibold leading-relaxed text-white">{quiz.question}</h3>
              </div>
              {!answeredToday && <div className="flex shrink-0 items-center gap-1 rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-2.5 py-1.5 font-mono text-xs text-cyan-200"><Clock3 className="h-3.5 w-3.5" />{quizTimer}s</div>}
            </div>
            {!currentUser ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <p className="text-xs text-white/60">Đăng nhập để trả lời và lưu kết quả.</p>
                <button type="button" onClick={onOpenLoginModal} className="mt-3 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-neutral-950">Đăng nhập</button>
              </div>
            ) : answeredToday ? (
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.07] p-4 text-center">
                <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-300" />
                <p className="mt-2 text-sm font-semibold text-white">{quizResult?.correct ?? currentUser.lastQuizCorrect ? 'Đáp án chính xác' : 'Đã hoàn thành hôm nay'}</p>
                {quizResult?.explanation && <p className="mt-1 text-xs text-white/60">{quizResult.explanation}</p>}
                <p className="mt-2 text-[11px] text-white/45">Câu hỏi mới sẽ có vào ngày mai.</p>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {quiz.options.map((option, index) => (
                  <button key={option} type="button" onClick={() => void submitAnswer(index)} disabled={submittingQuiz || selectedOption !== null}
                    className={`rounded-xl border p-3 text-left text-xs text-white transition ${selectedOption === index ? 'border-amber-300/50 bg-amber-300/10' : 'border-white/10 bg-white/[0.03] hover:border-cyan-300/30 hover:bg-white/[0.06]'} disabled:opacity-60`}>
                    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 font-mono text-[10px] text-cyan-200">{String.fromCharCode(65 + index)}</span>
                    {option}
                  </button>
                ))}
              </div>
            )}
            <p className="text-[11px] text-white/45">Đúng: 10 XP và 5 Coin · Sai hoặc hết giờ: không mất điểm.</p>
          </div>
        )}

        {activeTab === 'gifts' && (
          <div className="space-y-3">
            <p className="text-xs text-white/55">Hộp quà chỉ xuất hiện sau các mốc điểm danh 5, 10 và 15 ngày.</p>
            {(['blue', 'gold', 'red'] as const).map((type) => {
              const title = type === 'blue' ? 'Mốc 5 ngày' : type === 'gold' ? 'Mốc 10 ngày' : 'Mốc 15 ngày';
              const count = boxes[type] || 0;
              return (
                <div key={type} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${type === 'blue' ? 'bg-sky-400/10 text-sky-300' : type === 'gold' ? 'bg-amber-400/10 text-amber-300' : 'bg-rose-400/10 text-rose-300'}`}><Gift className="h-5 w-5" /></span>
                    <span><span className="block text-xs font-semibold text-white">{title}</span><span className="mt-0.5 block text-[10px] text-white/45">Số lượng: {count}</span></span>
                  </div>
                  <button type="button" onClick={() => void handleOpenBox(type)} disabled={count === 0 || Boolean(openingBox) || !currentUser}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[11px] font-semibold text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">
                    {count > 0 ? <Gift className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}
                    {openingBox === type ? 'Đang mở…' : count > 0 ? 'Mở hộp' : 'Chưa có'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {message && <p role="status" className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70">{message}</p>}

        <footer className="mt-5 flex items-center justify-between border-t border-white/10 pt-3">
          <span className="text-xs text-white/45">Số dư <strong className="text-white">{currentUser?.coin || 0} Coin</strong></span>
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-xs font-semibold text-white/60 hover:bg-white/10 hover:text-white">Đóng</button>
        </footer>
      </section>
    </div>
  );
};

export const StreakFlameWidget: React.FC<{
  streakCount: number;
  onClick: () => void;
  className?: string;
}> = ({ streakCount, onClick, className = '' }) => (
  <button type="button" onClick={onClick}
    className={`group inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-[#10161d]/90 px-3 py-2 shadow-lg transition hover:border-amber-300/60 hover:bg-amber-500/10 ${className}`}
    title="Mở điểm danh và câu hỏi ngày" aria-label={`Chuỗi điểm danh: ${streakCount} ngày`}>
    <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-orange-400/10"><Flame className="h-4 w-4 text-orange-300 transition group-hover:scale-110" /></span>
    <span className="flex flex-col items-start leading-none">
      <span className="text-[11px] font-bold text-amber-200">{streakCount} ngày</span>
      <span className="mt-1 text-[9px] uppercase tracking-wide text-white/40">Chuỗi học</span>
    </span>
  </button>
);

export default DailyEngagementModal;
