/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Timer, Trophy, CheckCircle2, XCircle, RotateCcw, Target } from 'lucide-react';
import type { StudyDeck } from '../../types';
import {
  QUIZ_MIN_CARDS,
  SUBJECT_LABELS,
  buildQuizQuestions,
  calculateQuizXP,
  computeQuizScore,
  type QuizQuestion,
} from '../../store/studyLogic';

interface QuizSessionModalProps {
  deck: StudyDeck;
  onClose: () => void;
  onFinish: (result: { deckId: string; correct: number; total: number; xpAwarded: number }) => void;
}

const QUESTION_SECONDS = 20;
const QUESTION_COUNT = 10;

const LETTERS = ['A', 'B', 'C', 'D'];

/** Seed xác định theo bộ thẻ + số lần làm lại, tránh gọi Date.now() khi render. */
function hashCode(text: string): number {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export const QuizSessionModal: React.FC<QuizSessionModalProps> = ({ deck, onClose, onFinish }) => {
  /* Modal được mount mới mỗi lần mở (key theo deck.id). */
  const [attempt, setAttempt] = useState(0);
  const [questions, setQuestions] = useState<QuizQuestion[]>(() =>
    buildQuizQuestions(deck, QUESTION_COUNT, hashCode(deck.id)),
  );
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS);
  const [locked, setLocked] = useState(false);
  const [finished, setFinished] = useState(false);

  const startQuiz = useCallback(() => {
    const nextAttempt = attempt + 1;
    setAttempt(nextAttempt);
    setQuestions(buildQuizQuestions(deck, QUESTION_COUNT, hashCode(deck.id) + nextAttempt * 1013));
    setAnswers([]);
    setIndex(0);
    setLocked(false);
    setFinished(false);
    setSecondsLeft(QUESTION_SECONDS);
  }, [deck, attempt]);

  const score = useMemo(
    () => computeQuizScore(questions, answers),
    [questions, answers],
  );

  const current = questions[index];
  const picked = answers[index];

  /* Đồng hồ đếm ngược mỗi câu hỏi (cập nhật trong callback của timer). */
  useEffect(() => {
    if (finished || locked || !current) return;
    const timer = setTimeout(() => {
      if (secondsLeft <= 1) {
        setSecondsLeft(0);
        setLocked(true);
        setAnswers(prev => {
          const next = [...prev];
          next[index] = null;
          return next;
        });
      } else {
        setSecondsLeft(prev => prev - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [finished, locked, current, secondsLeft, index]);

  const handleSelect = useCallback(
    (optionIndex: number) => {
      if (locked || !current) return;
      const next = [...answers];
      next[index] = optionIndex;
      setAnswers(next);
      setLocked(true);
    },
    [locked, current, answers, index],
  );

  const handleNext = useCallback(() => {
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIndex(prev => prev + 1);
    setLocked(false);
    setSecondsLeft(QUESTION_SECONDS);
  }, [index, questions.length]);

  const handleSubmit = useCallback(() => {
    onFinish({
      deckId: deck.id,
      correct: score.correct,
      total: score.total,
      xpAwarded: calculateQuizXP(score.correct, score.total),
    });
    onClose();
  }, [deck.id, onFinish, onClose, score]);

  /* Đóng sau khi đã làm hết đề → lưu kết quả; bỏ ngang giữa chừng thì không tính XP. */
  const handleClose = useCallback(() => {
    if (finished && questions.length > 0) {
      handleSubmit();
      return;
    }
    onClose();
  }, [finished, questions.length, handleSubmit, onClose]);

  /* Phím tắt 1..4 để chọn đáp án nhanh */
  useEffect(() => {
    if (finished) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
        return;
      }
      if (locked && event.key === 'Enter') {
        event.preventDefault();
        handleNext();
        return;
      }
      if (!locked && ['1', '2', '3', '4'].includes(event.key)) {
        const optionIndex = Number(event.key) - 1;
        if (current && optionIndex < current.options.length) {
          event.preventDefault();
          handleSelect(optionIndex);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finished, locked, current, handleNext, handleSelect, handleClose]);

  const notEnoughCards = questions.length === 0;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={`Luyện đề trắc nghiệm từ bộ thẻ ${deck.title}`}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Đóng phần luyện đề"
        className="fixed inset-0 bg-transparent border-none outline-none cursor-default"
        onClick={handleClose}
      />

      <div className="liquid-glass animate-modal-pop w-full max-w-2xl rounded-3xl bg-[#0c1218]/95 border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.9)] relative z-10 max-h-[94vh] flex flex-col overflow-hidden">
        <header className="p-4 sm:p-5 border-b border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-300/90">
                Luyện đề trắc nghiệm • {SUBJECT_LABELS[deck.subject] || 'Tổng hợp'}
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

          {!finished && !notEnoughCards && current && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-200 transition-all duration-300"
                  style={{ width: `${Math.round(((index + (locked ? 1 : 0)) / questions.length) * 100)}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-neutral-300 shrink-0">
                Câu {index + 1}/{questions.length}
              </span>
              <span
                className={`text-[11px] font-mono shrink-0 inline-flex items-center gap-1 ${
                  secondsLeft <= 5 ? 'text-rose-300' : 'text-neutral-300'
                }`}
              >
                <Timer className="w-3 h-3" /> {Math.max(0, secondsLeft)}s
              </span>
            </div>
          )}
        </header>

        {notEnoughCards ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-amber-500/15 border border-amber-400/30 mx-auto flex items-center justify-center">
              <Target className="w-7 h-7 text-amber-300" />
            </div>
            <h3 className="text-base font-bold text-white">Chưa đủ thẻ để luyện đề</h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              Cần tối thiểu {QUIZ_MIN_CARDS} thẻ có mặt sau khác nhau để tạo phương án nhiễu. Bộ thẻ này hiện có{' '}
              {deck.cards.length} thẻ — hãy bổ sung thêm rồi thử lại.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-4 py-2 rounded-full bg-white text-neutral-900 font-semibold hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        ) : finished ? (
          <div className="p-6 sm:p-8 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-cyan-500/15 border border-cyan-400/30 mx-auto flex items-center justify-center">
                <Trophy className="w-8 h-8 text-cyan-300" />
              </div>
              <h3 className="text-lg font-bold text-white">
                {score.scorePct >= 80 ? 'Xuất sắc!' : score.scorePct >= 50 ? 'Khá tốt!' : 'Cần ôn thêm nhé!'}
              </h3>
              <p className="text-xs text-neutral-400">
                Bạn trả lời đúng {score.correct}/{score.total} câu ({score.scorePct}%) • nhận +
                {calculateQuizXP(score.correct, score.total)} XP
              </p>
            </div>

            <ul className="space-y-1.5 max-h-[34vh] overflow-y-auto pr-1">
              {questions.map((question, questionIndex) => {
                const answer = answers[questionIndex];
                const isCorrect = answer === question.answerIndex;
                return (
                  <li
                    key={question.cardId}
                    className={`rounded-2xl border px-3 py-2 text-xs ${
                      isCorrect
                        ? 'border-emerald-400/25 bg-emerald-500/[0.07]'
                        : 'border-rose-400/25 bg-rose-500/[0.07]'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <p className="text-white font-medium">{question.prompt}</p>
                        {!isCorrect && (
                          <p className="text-[11px] text-neutral-300 mt-0.5">
                            Đáp án đúng:{' '}
                            <span className="text-emerald-300">{question.options[question.answerIndex]}</span>
                            {answer !== null && answer !== undefined && (
                              <span className="text-rose-300"> • Bạn chọn: {question.options[answer]}</span>
                            )}
                            {answer === null && <span className="text-neutral-400"> • Hết giờ</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={startQuiz}
                className="text-xs px-4 py-2 rounded-full border border-white/15 text-neutral-200 hover:bg-white/10 transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Làm đề mới
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="text-xs px-4 py-2 rounded-full bg-white text-neutral-900 font-semibold hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Lưu kết quả & đóng
              </button>
            </div>
          </div>
        ) : (
          current && (
            <>
              <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-4">
                <p className="text-base sm:text-xl font-semibold text-white leading-snug">{current.prompt}</p>
                {current.hint && (
                  <p className="text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-400/25 rounded-full px-3 py-1 inline-block">
                    Gợi ý: {current.hint}
                  </p>
                )}

                <div className="grid gap-2">
                  {current.options.map((option, optionIndex) => {
                    const isAnswer = optionIndex === current.answerIndex;
                    const isPicked = picked === optionIndex;
                    const stateClass = !locked
                      ? 'border-white/12 bg-white/[0.03] hover:border-cyan-400/40 hover:bg-cyan-500/[0.06] text-white'
                      : isAnswer
                      ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100'
                      : isPicked
                      ? 'border-rose-400/50 bg-rose-500/15 text-rose-100'
                      : 'border-white/10 bg-white/[0.02] text-neutral-400';

                    return (
                      <button
                        key={`${option}-${optionIndex}`}
                        type="button"
                        disabled={locked}
                        onClick={() => handleSelect(optionIndex)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition-colors cursor-pointer disabled:cursor-default flex items-start gap-3 ${stateClass}`}
                      >
                        <span className="w-5 h-5 rounded-lg border border-white/20 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {LETTERS[optionIndex]}
                        </span>
                        <span className="whitespace-pre-wrap">{option}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <footer className="p-4 sm:p-5 border-t border-white/10 flex items-center justify-between gap-3">
                <p className="text-[11px] text-neutral-400">
                  {locked
                    ? picked === current.answerIndex
                      ? 'Chính xác! Nhấn Enter để sang câu tiếp theo.'
                      : 'Chưa đúng — xem đáp án rồi nhấn Enter để tiếp tục.'
                    : 'Chọn đáp án đúng (phím 1-4). Mỗi câu có 20 giây.'}
                </p>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!locked}
                  className="text-xs px-4 py-2 rounded-full bg-white text-neutral-900 font-semibold hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-40 shrink-0"
                >
                  {index + 1 >= questions.length ? 'Xem kết quả' : 'Câu tiếp theo'}
                </button>
              </footer>
            </>
          )
        )}
      </div>
    </div>
  );
};

export default QuizSessionModal;
