/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Timer,
  Clock,
  CheckCircle2,
  AlertCircle,
  Flag,
  Award,
  RotateCcw,
  Eye,
  BookOpen,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Target,
  ShieldAlert,
} from 'lucide-react';
import type { ExamPaper, ExamCBTQuestion, CBTResult } from '../../types';
import { getExamCBTQuestions } from './cbtData';
import { safeStorage } from '../../utils/storage';
import { playChime } from '../../utils/audio';
import {
  saveCbtExamState,
  loadCbtExamState,
  clearCbtExamState,
  setupExamSecurityGuard,
} from '../../security/examSecurityGuard';

export const CBT_HISTORY_KEY = 'fforum_cbt_history';

export interface CbtPracticeModalProps {
  paper: ExamPaper;
  onClose: () => void;
  onComplete?: (result: CBTResult) => void;
}

export const CbtPracticeModal: React.FC<CbtPracticeModalProps> = ({
  paper,
  onClose,
  onComplete,
}) => {
  const questions: ExamCBTQuestion[] = useMemo(() => getExamCBTQuestions(paper), [paper]);
  const totalQuestions = questions.length;
  const initialDurationSeconds = (paper.duration || 45) * 60;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({});
  const [flagged, setFlagged] = useState<number[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(initialDurationSeconds);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showReviewMode, setShowReviewMode] = useState(false);
  const [cbtResult, setCbtResult] = useState<CBTResult | null>(null);

  const [violationCount, setViolationCount] = useState(0);
  const [showViolationAlert, setShowViolationAlert] = useState(false);
  const [lastViolationReason, setLastViolationReason] = useState('');

  useEffect(() => {
    const saved = loadCbtExamState(paper.id);
    if (saved && saved.answers && !isSubmitted) {
      setAnswers(saved.answers);
      if (typeof saved.secondsLeft === 'number' && saved.secondsLeft > 0) {
        setSecondsLeft(saved.secondsLeft);
      }
      if (typeof saved.currentIndex === 'number' && saved.currentIndex < totalQuestions) {
        setCurrentIndex(saved.currentIndex);
      }
      if (Array.isArray(saved.flagged)) {
        setFlagged(saved.flagged);
      }
    }
  }, [paper.id, totalQuestions]);

  useEffect(() => {
    if (isSubmitted) return;
    saveCbtExamState(paper.id, {
      paperId: paper.id,
      answers,
      secondsLeft,
      currentIndex,
      flagged,
      savedAt: Date.now(),
    });
  }, [paper.id, answers, secondsLeft, currentIndex, flagged, isSubmitted]);

  useEffect(() => {
    if (isSubmitted) return;
    const cleanup = setupExamSecurityGuard({
      isActive: !isSubmitted && !isTimerPaused,
      onViolation: (count, reason) => {
        setViolationCount(count);
        setLastViolationReason(reason);
        setShowViolationAlert(true);
      },
    });
    return cleanup;
  }, [isSubmitted, isTimerPaused]);

  useEffect(() => {
    if (isSubmitted || isTimerPaused) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted, isTimerPaused]);

  const calculateResult = useCallback((): CBTResult => {
    let correctCount = 0;
    const topicBreakdown: Record<string, { total: number; correct: number }> = {};
    const difficultyBreakdown: Record<string, { total: number; correct: number }> = {};

    questions.forEach((q) => {
      if (!topicBreakdown[q.topic]) {
        topicBreakdown[q.topic] = { total: 0, correct: 0 };
      }
      topicBreakdown[q.topic].total += 1;

      if (!difficultyBreakdown[q.difficulty]) {
        difficultyBreakdown[q.difficulty] = { total: 0, correct: 0 };
      }
      difficultyBreakdown[q.difficulty].total += 1;

      const userAns = answers[q.number];
      if (userAns === q.correctAnswer) {
        correctCount += 1;
        topicBreakdown[q.topic].correct += 1;
        difficultyBreakdown[q.difficulty].correct += 1;
      }
    });

    const rawScore = totalQuestions > 0 ? (correctCount / totalQuestions) * 10 : 0;
    const score = Math.round(rawScore * 10) / 10;
    const timeSpentSeconds = initialDurationSeconds - secondsLeft;

    const result: CBTResult = {
      examId: paper.id,
      examTitle: paper.title,
      totalQuestions,
      correctCount,
      score,
      timeSpentSeconds,
      submittedAt: new Date().toISOString(),
      topicBreakdown,
      difficultyBreakdown,
      answers,
    };

    try {
      const rawHistory = safeStorage.getItem(CBT_HISTORY_KEY);
      const historyList: CBTResult[] = rawHistory ? JSON.parse(rawHistory) : [];
      historyList.unshift(result);
      safeStorage.setItem(CBT_HISTORY_KEY, JSON.stringify(historyList.slice(0, 50)));
    } catch {
    }

    return result;
  }, [questions, answers, totalQuestions, initialDurationSeconds, secondsLeft, paper.id, paper.title]);

  const finalizeSubmit = useCallback(() => {
    const res = calculateResult();
    setCbtResult(res);
    setIsSubmitted(true);
    setShowConfirmSubmit(false);
    clearCbtExamState(paper.id);
    onComplete?.(res);
    try {
      playChime();
    } catch {
    }
  }, [calculateResult, onComplete, paper.id]);

  useEffect(() => {
    if (secondsLeft === 0 && !isSubmitted) {
      requestAnimationFrame(() => {
        finalizeSubmit();
      });
    }
  }, [secondsLeft, isSubmitted, finalizeSubmit]);

  const handleSelectOption = (qNumber: number, optionId: 'A' | 'B' | 'C' | 'D') => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [qNumber]: optionId }));
    try {
      playChime();
    } catch {
    }
  };

  const handleToggleFlag = (qNumber: number) => {
    setFlagged((prev) =>
      prev.includes(qNumber) ? prev.filter((n) => n !== qNumber) : [...prev, qNumber],
    );
  };

  const handleSubmitExam = () => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < totalQuestions && !showConfirmSubmit) {
      setShowConfirmSubmit(true);
      return;
    }
    finalizeSubmit();
  };

  const handleRestartExam = () => {
    clearCbtExamState(paper.id);
    setAnswers({});
    setFlagged([]);
    setSecondsLeft(initialDurationSeconds);
    setIsTimerPaused(false);
    setIsSubmitted(false);
    setShowReviewMode(false);
    setCbtResult(null);
    setCurrentIndex(0);
    setViolationCount(0);
    setShowViolationAlert(false);
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isUrgent = secondsLeft < 300;

  const radarData = useMemo(() => {
    if (!cbtResult) return [];
    const entries = Object.entries(cbtResult.topicBreakdown).map(([label, stats]) => ({
      label,
      score: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      total: stats.total,
      correct: stats.correct,
    }));
    if (entries.length < 3) {
      Object.entries(cbtResult.difficultyBreakdown).forEach(([label, stats]) => {
        if (!entries.some((e) => e.label === label)) {
          entries.push({
            label,
            score: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
            total: stats.total,
            correct: stats.correct,
          });
        }
      });
    }
    if (entries.length < 3) {
      entries.push({ label: 'Tốc độ phản xạ', score: Math.min(100, Math.round((cbtResult.score / 10) * 90)), total: 1, correct: 1 });
      entries.push({ label: 'Độ chính xác chung', score: Math.round((cbtResult.correctCount / Math.max(1, cbtResult.totalQuestions)) * 100), total: 1, correct: 1 });
    }
    return entries;
  }, [cbtResult]);

  const strongestTopics = useMemo(() => {
    return radarData.filter((d) => d.score >= 75);
  }, [radarData]);

  const gapTopics = useMemo(() => {
    return radarData.filter((d) => d.score < 75);
  }, [radarData]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cbt-modal-title"
      className="ff-exam-dialog-overlay z-[100] bg-black/85 backdrop-blur-xl animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="ff-exam-modal ff-exam-dialog-panel w-full max-w-5xl min-h-0 rounded-3xl p-4 sm:p-6 flex flex-col overflow-hidden relative shadow-[0_25px_80px_rgba(0,0,0,0.85)] border border-white/10 bg-[#0c1017]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between pb-3.5 border-b border-white/10 flex-wrap gap-2 shrink-0">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <Timer className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20">
                  CBT Practice Mode
                </span>
                {!paper.duration && (
                  <span className="text-[10px] text-white/45" title="Bộ đếm luyện tập mặc định; không phải thời lượng đề gốc.">
                    Bộ đếm mặc định · 45 phút
                  </span>
                )}
                <span className="text-xs text-white/50">{paper.subject} · Lớp {paper.grade}</span>
              </div>
              <h1 id="cbt-modal-title" className="max-w-full break-words text-sm sm:text-base font-extrabold text-white">
                {paper.title}
              </h1>
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            {violationCount > 0 && !isSubmitted && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Vi phạm: {violationCount}</span>
              </span>
            )}

            {!isSubmitted ? (
              <div
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono font-bold text-xs sm:text-sm transition-all duration-300 ${
                  isUrgent
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse'
                    : 'bg-white/10 border-white/15 text-white'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span>{formatTime(secondsLeft)}</span>
                <button
                  type="button"
                  onClick={() => setIsTimerPaused(!isTimerPaused)}
                  className="ml-1 inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white cursor-pointer"
                  aria-label={isTimerPaused ? 'Tiếp tục đếm giờ' : 'Tạm dừng đếm giờ'}
                  title={isTimerPaused ? 'Tiếp tục' : 'Tạm dừng'}
                >
                  {isTimerPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <div className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Đã hoàn thành
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
              aria-label="Đóng phòng thi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar py-4">
          {!isSubmitted || showReviewMode ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-8 flex flex-col justify-between">
                {currentQ && (
                  <div className="card-hard p-5 sm:p-7 bg-[#111722] border-white/15 flex flex-col justify-between min-h-[360px] sm:min-h-[420px]">
                    <div className="min-w-0">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="px-3 py-1 rounded-lg bg-amber-400 text-[#0b0d12] text-xs font-extrabold shadow-sm">
                            Câu {currentQ.number} / {totalQuestions}
                          </span>
                          <span className="min-w-0 max-w-full break-words rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90">
                            {currentQ.topic}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold">
                            {currentQ.difficulty}
                          </span>
                        </div>

                        {!isSubmitted && (
                          <button
                            type="button"
                            onClick={() => handleToggleFlag(currentQ.number)}
                            className={`ml-auto inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                              flagged.includes(currentQ.number)
                                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                                : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                            }`}
                            title="Đánh dấu câu hỏi để xem lại sau"
                          >
                            <Flag className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Xem lại</span>
                          </button>
                        )}
                      </div>

                      <h2 className="mb-6 break-words text-base sm:text-lg font-semibold leading-relaxed sm:leading-loose text-white select-text">
                        {currentQ.question}
                      </h2>

                      <div className="space-y-3.5">
                        {currentQ.options.map((opt) => {
                          const isSelected = answers[currentQ.number] === opt.id;
                          const isCorrect = opt.id === currentQ.correctAnswer;
                          const isUserWrong = isSubmitted && isSelected && !isCorrect;

                          let optionTheme = 'border-[#293241] bg-[#161f2e] text-slate-200 hover:bg-[#1c283b]';
                          let badgeTheme = 'bg-white/10 text-white/80 border-white/15';

                          if (isSubmitted) {
                            if (isCorrect) {
                              optionTheme = 'border-emerald-500/70 bg-emerald-950/40 text-emerald-100';
                              badgeTheme = 'bg-emerald-500 text-white border-emerald-400';
                            } else if (isUserWrong) {
                              optionTheme = 'border-rose-500/70 bg-rose-950/40 text-rose-100';
                              badgeTheme = 'bg-rose-500 text-white border-rose-400';
                            } else {
                              optionTheme = 'border-white/10 bg-white/[0.02] text-white/40';
                              badgeTheme = 'bg-white/5 text-white/40 border-white/10';
                            }
                          } else if (isSelected) {
                            optionTheme = 'border-amber-400 bg-amber-400/20 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.25)]';
                            badgeTheme = 'bg-amber-400 text-[#0b0d12] border-amber-300 font-black';
                          }

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              disabled={isSubmitted}
                              onClick={() => handleSelectOption(currentQ.number, opt.id)}
                              className={`btn-feastables ff-tactile-pop w-full p-4 rounded-xl text-left flex items-start gap-3.5 transition-all cursor-pointer disabled:cursor-default ${optionTheme}`}
                            >
                              <span
                                className={`w-8 h-8 rounded-lg font-mono font-black text-sm flex items-center justify-center shrink-0 border ${badgeTheme}`}
                              >
                                {opt.id}
                              </span>
                              <span className="min-w-0 break-words text-[15px] sm:text-base leading-relaxed pt-0.5 select-text font-medium">
                                {opt.text}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {isSubmitted && (
                        <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-neutral-900/90 border border-amber-400/30 space-y-2.5 text-xs sm:text-sm">
                          <div className="flex items-center gap-2 font-bold text-emerald-400">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Đáp án chính xác: Phương án {currentQ.correctAnswer}</span>
                          </div>
                          <div className="p-3.5 rounded-xl bg-white/[0.03] text-neutral-200 leading-relaxed select-text">
                            <strong className="text-amber-300 block mb-1">Hướng dẫn giải chi tiết:</strong>
                            <span>{currentQ.explanation}</span>
                          </div>
                          {currentQ.keyFormula && (
                            <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-400/25 text-cyan-200 font-mono text-xs flex items-center gap-2 select-text">
                              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                              <span><strong>Công thức then chốt:</strong> {currentQ.keyFormula}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-5 mt-6 border-t border-white/10">
                      <button
                        type="button"
                        disabled={currentIndex === 0}
                        onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                        className="px-4 py-2 rounded-xl border border-white/15 text-white/80 hover:text-white hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <ChevronLeft className="w-4 h-4" /> Câu trước
                      </button>

                      {isSubmitted && (
                        <button
                          type="button"
                          onClick={() => setShowReviewMode(false)}
                          className="btn-feastables ff-tactile-pop px-4 py-2 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-semibold cursor-pointer"
                        >
                          Quay lại bảng điểm &amp; Radar
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={currentIndex === totalQuestions - 1}
                        onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                        className="btn-feastables ff-tactile-pop px-4 py-2 rounded-xl bg-amber-400 text-[#0b0d12] hover:bg-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                      >
                        Câu tiếp <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-4 card-hard p-5 bg-[#111722] border-white/15 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-400" /> Bảng câu hỏi ({answeredCount}/{totalQuestions})
                    </span>
                    <span className="text-[11px] font-mono text-white/50">
                      {totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0}%
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-4">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                      style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-5 gap-2 max-h-[280px] overflow-y-auto no-scrollbar pr-1">
                    {questions.map((q, idx) => {
                      const isCurrent = currentIndex === idx;
                      const isAnswered = answers[q.number] !== undefined;
                      const isFlagged = flagged.includes(q.number);
                      const isCorrect = answers[q.number] === q.correctAnswer;

                      let btnStyle = 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white';
                      if (isSubmitted) {
                        const baseStyle = isCorrect
                          ? 'bg-emerald-500/25 border-emerald-500/50 text-emerald-300 font-bold'
                          : 'bg-rose-500/25 border-rose-500/50 text-rose-300 font-bold';
                        btnStyle = isCurrent
                          ? `${baseStyle} ring-2 ring-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]`
                          : baseStyle;
                      } else if (isCurrent) {
                        btnStyle = 'border-amber-400 bg-amber-400/30 text-amber-200 font-extrabold ring-2 ring-amber-400';
                      } else if (isAnswered) {
                        btnStyle = 'bg-amber-400/20 border-amber-400/40 text-amber-300 font-bold';
                      } else if (isFlagged) {
                        btnStyle = 'bg-purple-500/20 border-purple-500/40 text-purple-300';
                      }

                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setCurrentIndex(idx)}
                          className={`h-10 rounded-xl border text-xs font-mono font-bold flex items-center justify-center transition-all duration-150 cursor-pointer relative ${btnStyle}`}
                        >
                          <span>{q.number}</span>
                          {isFlagged && !isSubmitted && (
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 absolute top-1 right-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3.5 border-t border-white/10 text-[11px] text-white/65">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-amber-400/30 border border-amber-400/50" /> Đã làm
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-white/10 border border-white/20" /> Chưa làm
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-purple-500/30 border border-purple-500/50" /> Đánh dấu
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded border border-amber-400 ring-1 ring-amber-400" /> Đang chọn
                    </span>
                  </div>
                </div>

                {!isSubmitted && (
                  <div className="pt-4 border-t border-white/10 mt-4">
                    <button
                      type="button"
                      onClick={handleSubmitExam}
                      className="btn-feastables ff-tactile-pop w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Nộp bài thi trực tuyến</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            cbtResult && (
              <div className="p-4 sm:p-7 rounded-3xl bg-[#111722] border border-white/15 space-y-6 animate-fade-in card-hard">
                <div className="flex flex-col sm:flex-row items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-amber-500/20 via-emerald-500/10 to-transparent border border-amber-400/35 gap-4 text-center sm:text-left">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                      <Award className="w-9 h-9 text-amber-300" />
                    </div>
                    <div>
                      <span className="text-[11px] font-mono text-amber-300 uppercase font-bold tracking-wider">
                        Kết Quả Thi Thử Trực Tuyến
                      </span>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                        {cbtResult.score >= 8.5
                          ? 'Thành Tích Xuất Sắc!'
                          : cbtResult.score >= 7.0
                            ? 'Làm Tốt Lắm!'
                            : cbtResult.score >= 5.0
                              ? 'Cần Ôn Luyện Thêm'
                              : 'Hãy Xem Kỹ Lời Giải!'}
                      </h2>
                      <p className="text-xs text-white/60">
                        Hoàn thành {cbtResult.correctCount}/{cbtResult.totalQuestions} câu hỏi · Thời gian: {formatTime(cbtResult.timeSpentSeconds)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center sm:items-end">
                    <div className="text-3xl sm:text-4xl font-black text-amber-300 font-mono tracking-tight">
                      {cbtResult.score}
                      <span className="text-sm sm:text-base font-normal text-white/50"> / 10</span>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                      <Sparkles className="w-3 h-3" /> +25 XP Chuyên Cần F-Forum
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-6 rounded-2xl bg-[#0d121c] border border-white/10">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1 w-full space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-300">
                          <Target className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-white">
                            Biểu Đồ Radar: Phân Tích Lỗ Hổng Kiến Thức
                          </h3>
                          <p className="text-xs text-slate-400">
                            Đánh giá đa chiều năng lực theo từng dạng bài và chuyên đề chuyên biệt
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs">
                          <div className="flex items-center gap-2 font-bold text-emerald-300 mb-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>Điểm mạnh nổi trội ({strongestTopics.length} chuyên đề):</span>
                          </div>
                          {strongestTopics.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {strongestTopics.map((t) => (
                                <span key={t.label} className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-200 font-semibold text-[11px]">
                                  {t.label} ({t.score}%)
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-300 text-[11px]">Hãy làm quen thêm với các dạng bài cơ bản để thiết lập thế mạnh.</p>
                          )}
                        </div>

                        <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs">
                          <div className="flex items-center gap-2 font-bold text-rose-300 mb-1">
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>Lỗ hổng kiến thức cần củng cố ({gapTopics.length} chuyên đề):</span>
                          </div>
                          {gapTopics.length > 0 ? (
                            <div className="space-y-2 mt-2">
                              <div className="flex flex-wrap gap-1.5">
                                {gapTopics.map((t) => (
                                  <span key={t.label} className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-200 font-semibold text-[11px]">
                                    {t.label} ({t.score}%)
                                  </span>
                                ))}
                              </div>
                              <p className="text-rose-200/80 text-[11px] leading-relaxed">
                                Gợi ý trọng tâm: Ôn luyện lại lý thuyết và các ví dụ mẫu thuộc {gapTopics[0].label} trong kho đề thi hoặc thảo luận tại Sàn Hỏi Đáp.
                              </p>
                            </div>
                          ) : (
                            <p className="text-emerald-300 text-[11px]">Tuyệt vời! Bạn không có lỗ hổng kiến thức nghiêm trọng nào trong đề này.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="w-full sm:w-[320px] h-[320px] flex items-center justify-center shrink-0 relative">
                      {(() => {
                        const size = 300;
                        const center = size / 2;
                        const radius = 100;
                        const count = radarData.length;
                        if (count < 3) return null;

                        const rings = [0.25, 0.5, 0.75, 1.0];
                        const angleStep = (2 * Math.PI) / count;

                        const dataPoints = radarData.map((d, i) => {
                          const angle = i * angleStep - Math.PI / 2;
                          const r = (Math.max(10, d.score) / 100) * radius;
                          return {
                            x: center + r * Math.cos(angle),
                            y: center + r * Math.sin(angle),
                            labelX: center + (radius + 24) * Math.cos(angle),
                            labelY: center + (radius + 24) * Math.sin(angle),
                            score: d.score,
                            label: d.label,
                          };
                        });

                        const polygonPath = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

                        return (
                          <svg width={size} height={size} className="overflow-visible">
                            {rings.map((pct, ringIdx) => {
                              const r = pct * radius;
                              const ringPoints = radarData.map((_, i) => {
                                const angle = i * angleStep - Math.PI / 2;
                                return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
                              }).join(' ');
                              return (
                                <polygon
                                  key={ringIdx}
                                  points={ringPoints}
                                  fill={ringIdx === 3 ? 'rgba(255,255,255,0.02)' : 'none'}
                                  stroke="rgba(255,255,255,0.15)"
                                  strokeWidth="1"
                                  strokeDasharray={ringIdx < 3 ? '3 3' : 'none'}
                                />
                              );
                            })}

                            {radarData.map((_, i) => {
                              const angle = i * angleStep - Math.PI / 2;
                              const x2 = center + radius * Math.cos(angle);
                              const y2 = center + radius * Math.sin(angle);
                              return (
                                <line
                                  key={i}
                                  x1={center}
                                  y1={center}
                                  x2={x2}
                                  y2={y2}
                                  stroke="rgba(255,255,255,0.18)"
                                  strokeWidth="1"
                                />
                              );
                            })}

                            <polygon
                              points={polygonPath}
                              fill="rgba(245, 158, 11, 0.28)"
                              stroke="#f59e0b"
                              strokeWidth="2.5"
                            />

                            {dataPoints.map((p, i) => (
                              <g key={i}>
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="4.5"
                                  fill="#f59e0b"
                                  stroke="#0c1017"
                                  strokeWidth="2"
                                />
                                <text
                                  x={p.labelX}
                                  y={p.labelY}
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  fill="#f4f1de"
                                  fontSize="9.5"
                                  fontFamily="sans-serif"
                                  fontWeight="600"
                                  className="select-none"
                                >
                                  {p.label.length > 12 ? `${p.label.slice(0, 11)}…` : p.label} ({p.score}%)
                                </text>
                              </g>
                            ))}
                          </svg>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-amber-300/80 mb-3 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-amber-400" /> Bảng Thống Kê Chi Tiết Từng Phần
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                      <span className="text-xs font-bold text-white block">Theo mức độ tư duy nhận thức:</span>
                      {Object.entries(cbtResult.difficultyBreakdown).map(([diff, stats]) => {
                        const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                        return (
                          <div key={diff} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-white/70">{diff}</span>
                              <span className="font-mono text-amber-300 font-semibold">
                                {stats.correct}/{stats.total} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                      <span className="text-xs font-bold text-white block">Theo chuyên đề kiến thức:</span>
                      {Object.entries(cbtResult.topicBreakdown).map(([topic, stats]) => {
                        const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                        return (
                          <div key={topic} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-white/70 truncate max-w-[200px]" title={topic}>{topic}</span>
                              <span className="font-mono text-emerald-300 font-semibold">
                                {stats.correct}/{stats.total} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10 flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleRestartExam}
                    className="btn-feastables ff-tactile-pop px-4 py-2.5 rounded-xl border border-white/15 text-white hover:bg-white/10 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" /> Làm lại đề này
                  </button>

                  <div className="flex flex-wrap items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowReviewMode(true)}
                      className="btn-feastables ff-tactile-pop px-4 py-2.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/40 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Eye className="w-4 h-4" /> Xem giải thích chi tiết từng câu
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn-feastables ff-tactile-pop px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0b0d12] text-xs font-extrabold cursor-pointer transition-colors"
                    >
                      Hoàn thành &amp; Đóng
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {showViolationAlert && !isSubmitted && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md space-y-4 rounded-2xl border-2 border-rose-500 bg-neutral-900 p-5 text-center sm:p-6 card-hard shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  CẢNH BÁO GIÁM SÁT THI CBT
                </span>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Bạn đã rời khỏi phòng thi!
                </h3>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Hệ thống phát hiện hành vi: <strong className="text-rose-400">{lastViolationReason}</strong> (Vi phạm lần thứ <strong className="text-amber-400">{violationCount}</strong>).
                Mọi hành vi chuyển tab hoặc rời tiêu điểm đều được ghi nhận vào nhật ký kiểm định.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowViolationAlert(false)}
                  className="btn-feastables ff-tactile-pop px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs cursor-pointer shadow-md"
                >
                  Tôi Đã Hiểu, Quay Lại Làm Bài
                </button>
              </div>
            </div>
          </div>
        )}

        {showConfirmSubmit && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md space-y-4 rounded-2xl border border-amber-400/40 bg-neutral-900 p-4 text-center sm:p-6 card-hard">
              <div className="w-12 h-12 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Chưa hoàn thành tất cả câu hỏi!</h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Bạn đã trả lời <strong className="text-amber-300">{answeredCount}</strong> trên tổng số{' '}
                <strong className="text-white">{totalQuestions}</strong> câu ({totalQuestions - answeredCount} câu chưa chọn). Bạn có chắc chắn muốn nộp bài ngay bây giờ?
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(false)}
                  className="btn-feastables ff-tactile-pop px-4 py-2 rounded-xl border border-white/20 text-white hover:bg-white/10 text-xs font-semibold cursor-pointer"
                >
                  Làm tiếp
                </button>
                <button
                  type="button"
                  onClick={finalizeSubmit}
                  className="btn-feastables ff-tactile-pop px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold cursor-pointer"
                >
                  Xác nhận nộp bài
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default CbtPracticeModal;
