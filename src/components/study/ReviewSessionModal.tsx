/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, RotateCcw, Sparkles, CheckCircle2, Keyboard, Flag, Layers } from 'lucide-react';
import type { StudyCard, StudyDeck } from '../../types';
import {
  SUBJECT_LABELS,
  calculateReviewXP,
  estimateNextIntervalMs,
  formatInterval,
  isCardDue,
  type StudyGrade,
} from '../../store/studyLogic';

interface ReviewSessionModalProps {
  deck: StudyDeck;
  onClose: () => void;
  onGradeCard: (deckId: string, cardId: string, grade: StudyGrade) => { card: StudyCard; xp: number } | null;
  onFinish: (result: { deckId: string; correct: number; total: number; xpAwarded: number }) => void;
  onSyncProgress?: (deckId: string) => void;
}

interface QueueItem {
  card: StudyCard;
  isRelearn: boolean;
}

/** Ưu tiên các thẻ đến hạn; nếu không còn thẻ nào đến hạn thì ôn lại toàn bộ bộ thẻ. */
function buildQueueFromDeck(deck: StudyDeck): QueueItem[] {
  const due = deck.cards.filter(card => isCardDue(card, Date.now()));
  const source = due.length > 0 ? due : deck.cards;
  return source.map(card => ({ card, isRelearn: false }));
}

const GRADES: { grade: StudyGrade; label: string; className: string }[] = [
  { grade: 'again', label: 'Quên rồi', className: 'border-rose-400/40 text-rose-200 hover:bg-rose-500/15' },
  { grade: 'hard', label: 'Khó', className: 'border-amber-400/40 text-amber-200 hover:bg-amber-500/15' },
  { grade: 'good', label: 'Được', className: 'border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/15' },
  { grade: 'easy', label: 'Dễ', className: 'border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/15' },
];

export const ReviewSessionModal: React.FC<ReviewSessionModalProps> = ({
  deck,
  onClose,
  onGradeCard,
  onFinish,
  onSyncProgress,
}) => {
  /* Modal được mount mới mỗi khi mở một bộ thẻ (key theo deck.id). */
  const [queue, setQueue] = useState<QueueItem[]>(() => buildQueueFromDeck(deck));
  const [cursor, setCursor] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [grades, setGrades] = useState<StudyGrade[]>([]);
  const [finished, setFinished] = useState(false);
  const [relearnCount, setRelearnCount] = useState(0);

  const total = queue.length;
  const queuedCards = total > 0 ? total : 0;
  const current = queue[cursor];

  const sessionXp = useMemo(() => calculateReviewXP(grades), [grades]);
  const goodCount = useMemo(() => grades.filter(g => g === 'good' || g === 'easy').length, [grades]);

  const handleGrade = useCallback(
    (grade: StudyGrade) => {
      if (!current) return;

      const graded = onGradeCard(deck.id, current.card.id, grade);
      setGrades(prev => [...prev, grade]);

      let nextQueue = queue;
      if (grade === 'again') {
        nextQueue = [...queue, { card: graded?.card ?? current.card, isRelearn: true }];
        setRelearnCount(prev => prev + 1);
        setQueue(nextQueue);
      }

      setFlipped(false);

      const isLast = cursor + 1 >= nextQueue.length;
      if (isLast) {
        setFinished(true);
        onSyncProgress?.(deck.id);
      } else {
        setCursor(prev => prev + 1);
      }
    },
    [deck, current, onGradeCard, queue, cursor, onSyncProgress],
  );

  const handleClose = useCallback(() => {
    if (grades.length > 0 && !finished) {
      onFinish({
        deckId: deck.id,
        correct: goodCount,
        total: grades.length,
        xpAwarded: calculateReviewXP(grades),
      });
    }
    onClose();
  }, [deck.id, grades, goodCount, finished, onFinish, onClose]);

  const handleFinishNow = useCallback(() => {
    onFinish({
      deckId: deck.id,
      correct: goodCount,
      total: grades.length,
      xpAwarded: calculateReviewXP(grades),
    });
    onClose();
  }, [deck.id, goodCount, grades, onFinish, onClose]);

  /* Keyboard shortcuts: Space = lật thẻ, 1..4 = chấm điểm */
  useEffect(() => {
    if (finished) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        event.preventDefault();
        setFlipped(prev => !prev);
      } else if (flipped && ['1', '2', '3', '4'].includes(event.key)) {
        event.preventDefault();
        handleGrade(GRADES[Number(event.key) - 1].grade);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finished, flipped, handleGrade, handleClose]);

  const accuracyPct = grades.length === 0 ? 0 : Math.round((goodCount / grades.length) * 100);
  const progressPct = queuedCards === 0 ? 0 : Math.min(100, Math.round((cursor / queuedCards) * 100));

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={`Phiên ôn tập bộ thẻ ${deck.title}`}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Đóng phiên ôn tập"
        className="fixed inset-0 bg-transparent border-none outline-none cursor-default"
        onClick={handleClose}
      />

      <div className="liquid-glass animate-modal-pop w-full max-w-2xl rounded-3xl bg-[#0c1218]/95 border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.9)] relative z-10 max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <header className="p-4 sm:p-5 border-b border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-300/90">
                Phiên ôn tập • {SUBJECT_LABELS[deck.subject] || 'Tổng hợp'}
              </p>
              <h2 className="text-base sm:text-lg font-bold text-white truncate mt-0.5">{deck.title}</h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Đóng"
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-200 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-neutral-300 shrink-0">
              {Math.min(cursor + (finished ? 0 : 1), queuedCards)}/{queuedCards}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-3 text-[11px] text-neutral-400">
            <span className="inline-flex items-center gap-1">
              <Layers className="w-3 h-3 text-cyan-300" /> {deck.cards.length} thẻ trong bộ
            </span>
            {relearnCount > 0 && (
              <span className="inline-flex items-center gap-1 text-rose-300">
                <RotateCcw className="w-3 h-3" /> {relearnCount} lượt ôn lại
              </span>
            )}
            <span className="ml-auto inline-flex items-center gap-1 text-amber-300">
              <Sparkles className="w-3 h-3" /> +{sessionXp} XP
            </span>
          </div>
        </header>

        {finished ? (
          /* ------------------------------ Kết thúc ------------------------------ */
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-400/30 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Hoàn thành phiên ôn tập!</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Bạn đã ôn {grades.length} lượt thẻ và giữ được {accuracyPct}% nhớ đúng.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[10px] uppercase tracking-wider text-neutral-400">Lượt ôn</p>
                <p className="text-lg font-bold text-white">{grades.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[10px] uppercase tracking-wider text-neutral-400">Nhớ đúng</p>
                <p className="text-lg font-bold text-emerald-300">{accuracyPct}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[10px] uppercase tracking-wider text-neutral-400">XP nhận</p>
                <p className="text-lg font-bold text-amber-300">+{calculateReviewXP(grades)}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setQueue(buildQueueFromDeck(deck));
                  setCursor(0);
                  setFlipped(false);
                  setGrades([]);
                  setFinished(false);
                  setRelearnCount(0);
                }}
                className="text-xs px-4 py-2 rounded-full border border-white/15 text-neutral-200 hover:bg-white/10 transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Ôn tiếp thẻ đến hạn
              </button>
              <button
                type="button"
                onClick={handleFinishNow}
                className="text-xs px-4 py-2 rounded-full bg-white text-neutral-900 font-semibold hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Lưu kết quả & đóng
              </button>
            </div>
          </div>
        ) : !current ? (
          /* ------------------------------ Trống ------------------------------ */
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-cyan-500/15 border border-cyan-400/30 mx-auto flex items-center justify-center">
              <Flag className="w-7 h-7 text-cyan-300" />
            </div>
            <h3 className="text-base font-bold text-white">Bộ thẻ đang trống</h3>
            <p className="text-xs text-neutral-400">
              Hãy thêm thẻ ghi nhớ trước khi bắt đầu ôn tập.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="text-xs px-4 py-2 rounded-full bg-white text-neutral-900 font-semibold hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        ) : (
          /* ------------------------------ Thẻ ôn tập ------------------------------ */
          <>
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
              <button
                type="button"
                onClick={() => setFlipped(prev => !prev)}
                aria-label={flipped ? 'Xem lại mặt trước thẻ' : 'Lật thẻ để xem đáp án'}
                className="w-full text-left cursor-pointer group"
                style={{ perspective: '1400px' }}
              >
                <div
                  className="relative w-full min-h-[240px] sm:min-h-[280px] transition-transform duration-500"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}
                >
                  {/* Mặt trước */}
                  <div
                    className="absolute inset-0 rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-6 flex flex-col items-center justify-center text-center gap-3"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-400">
                      {current.isRelearn ? 'Thẻ vừa quên — ôn lại' : 'Mặt trước'}
                    </span>
                    <p className="text-lg sm:text-2xl font-semibold text-white leading-snug whitespace-pre-wrap">
                      {current.card.front}
                    </p>
                    {current.card.hint && (
                      <p className="text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-400/25 rounded-full px-3 py-1">
                        Gợi ý: {current.card.hint}
                      </p>
                    )}
                    <span className="text-[11px] text-neutral-500 mt-2 inline-flex items-center gap-1">
                      <Keyboard className="w-3 h-3" /> Nhấn Space hoặc bấm vào thẻ để xem đáp án
                    </span>
                  </div>

                  {/* Mặt sau */}
                  <div
                    className="absolute inset-0 rounded-3xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/[0.12] to-white/[0.02] p-6 flex flex-col items-center justify-center text-center gap-3"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-300/90">
                      Mặt sau • Đáp án
                    </span>
                    <p className="text-lg sm:text-2xl font-semibold text-emerald-50 leading-snug whitespace-pre-wrap">
                      {current.card.back}
                    </p>
                    <span className="text-[11px] text-neutral-400 mt-2">
                      Hộp Leitner hiện tại: {current.card.box}/5 • đã ôn {current.card.reviews} lần
                    </span>
                  </div>
                </div>
              </button>
            </div>

            {/* Grade bar */}
            <footer className="p-4 sm:p-5 border-t border-white/10">
              {flipped ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GRADES.map((option, index) => (
                    <button
                      key={option.grade}
                      type="button"
                      onClick={() => handleGrade(option.grade)}
                      className={`rounded-2xl border bg-white/[0.03] px-3 py-2.5 text-left transition-colors cursor-pointer ${option.className}`}
                    >
                      <span className="block text-xs font-bold">
                        {index + 1}. {option.label}
                      </span>
                      <span className="block text-[10px] text-neutral-400 mt-0.5">
                        ôn lại sau {formatInterval(estimateNextIntervalMs(option.grade, current.card.box))}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] text-neutral-400">
                    Tự đánh giá trung thực để hệ thống xếp lịch ôn chính xác cho bạn.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFlipped(true)}
                    className="text-xs px-4 py-2 rounded-full bg-white text-neutral-900 font-semibold hover:bg-neutral-200 transition-colors cursor-pointer shrink-0"
                  >
                    Xem đáp án
                  </button>
                </div>
              )}
            </footer>
          </>
        )}
      </div>
    </div>
  );
};

export default ReviewSessionModal;
