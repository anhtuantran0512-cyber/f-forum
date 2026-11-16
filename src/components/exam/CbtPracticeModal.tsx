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
  Delete,
} from 'lucide-react';
import type { ExamPaper, ExamCBTQuestion, CBTResult } from '../../types';
import { getExamCBTQuestions } from './cbtData';
import { StepSolutionAccordion } from './StepSolutionAccordion';
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
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D' | Record<string, boolean> | string | number>>({});
  const [flagged, setFlagged] = useState<number[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(initialDurationSeconds);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showReviewMode, setShowReviewMode] = useState(false);
  const [showStepSolutions, setShowStepSolutions] = useState(false);
  const [selectedPartFilter, setSelectedPartFilter] = useState<0 | 1 | 2 | 3>(0);
  const [cbtResult, setCbtResult] = useState<CBTResult | null>(null);

  const [violationCount, setViolationCount] = useState(0);
  const [showViolationAlert, setShowViolationAlert] = useState(false);
  const [lastViolationReason, setLastViolationReason] = useState('');
  const [isZenMode, setIsZenMode] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitted) return;
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (e.key === 'z' || e.key === 'Z' || e.key === 'f' || e.key === 'F') {
        setIsZenMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitted]);

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

    let part1Total = 0;
    let part1Correct = 0;

    let part2Total = 0;
    let part2CorrectStatements = 0;
    let part2Score = 0;

    let part3Total = 0;
    let part3Correct = 0;

    questions.forEach((q) => {
      const qPart = q.part ?? (q.questionType === 'true_false' || (q.statements && q.statements.length > 0) ? 2 : q.questionType === 'short_answer' || q.numericAnswer !== undefined ? 3 : 1);
      const userAns = answers[q.number];

      if (!topicBreakdown[q.topic]) {
        topicBreakdown[q.topic] = { total: 0, correct: 0 };
      }
      topicBreakdown[q.topic].total += 1;

      if (!difficultyBreakdown[q.difficulty]) {
        difficultyBreakdown[q.difficulty] = { total: 0, correct: 0 };
      }
      difficultyBreakdown[q.difficulty].total += 1;

      if (qPart === 1) {
        part1Total += 1;
        const isCorrect = userAns === q.correctAnswer;
        if (isCorrect) {
          correctCount += 1;
          part1Correct += 1;
          topicBreakdown[q.topic].correct += 1;
          difficultyBreakdown[q.difficulty].correct += 1;
        }
      } else if (qPart === 2) {
        part2Total += 1;
        const stmts = q.statements || [];
        const userMap = (userAns as Record<string, boolean>) || {};
        let qCorrectStmts = 0;
        stmts.forEach((st) => {
          if (userMap[st.id] === st.isCorrect) {
            qCorrectStmts += 1;
            part2CorrectStatements += 1;
          }
        });

        if (qCorrectStmts === 1) part2Score += 0.1;
        else if (qCorrectStmts === 2) part2Score += 0.25;
        else if (qCorrectStmts === 3) part2Score += 0.5;
        else if (qCorrectStmts === 4) part2Score += 1.0;

        if (qCorrectStmts === stmts.length && stmts.length > 0) {
          correctCount += 1;
          topicBreakdown[q.topic].correct += 1;
          difficultyBreakdown[q.difficulty].correct += 1;
        }
      } else if (qPart === 3) {
        part3Total += 1;
        const userStr = String(userAns ?? '').trim();
        const targetVal = Number(q.numericAnswer ?? q.correctAnswer);
        const userVal = Number(userStr);
        const tol = q.tolerance !== undefined ? q.tolerance : 0.05;
        const isCorrect = userStr !== '' && !isNaN(userVal) && !isNaN(targetVal) && Math.abs(userVal - targetVal) <= tol;
        if (isCorrect) {
          correctCount += 1;
          part3Correct += 1;
          topicBreakdown[q.topic].correct += 1;
          difficultyBreakdown[q.difficulty].correct += 1;
        }
      }
    });

    let part1Score = 0;
    if (part1Total > 0) {
      part1Score = (part1Correct / part1Total) * 3.0;
    }
    let part3Score = 0;
    if (part3Total > 0) {
      part3Score = (part3Correct / part3Total) * 3.0;
    }

    let finalScore: number;
    if (part2Total === 0 && part3Total === 0) {
      finalScore = totalQuestions > 0 ? (part1Correct / totalQuestions) * 10 : 0;
    } else {
      finalScore = Math.min(10, part1Score + part2Score + part3Score);
    }
    const score = Math.round(finalScore * 100) / 100;
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
      partBreakdown: {
        part1: { total: part1Total, correct: part1Correct, score: Math.round(part1Score * 100) / 100 },
        part2: { total: part2Total, correctStatements: part2CorrectStatements, score: Math.round(part2Score * 100) / 100 },
        part3: { total: part3Total, correct: part3Correct, score: Math.round(part3Score * 100) / 100 },
      },
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

  const handleSelectTrueFalse = (qNumber: number, statementId: string, value: boolean) => {
    if (isSubmitted) return;
    setAnswers((prev) => {
      const curMap = (typeof prev[qNumber] === 'object' && prev[qNumber] !== null ? prev[qNumber] : {}) as Record<string, boolean>;
      return {
        ...prev,
        [qNumber]: {
          ...curMap,
          [statementId]: value,
        },
      };
    });
    try {
      playChime();
    } catch {
    }
  };

  const handleKeypadPress = (qNumber: number, key: string) => {
    if (isSubmitted) return;
    const curVal = String(answers[qNumber] ?? '');
    let nextVal = curVal;
    if (key === 'backspace') {
      nextVal = curVal.slice(0, -1);
    } else if (key === 'clear') {
      nextVal = '';
    } else if (key === '-') {
      if (curVal.startsWith('-')) {
        nextVal = curVal.slice(1);
      } else {
        nextVal = '-' + curVal;
      }
    } else if (key === '.') {
      if (!curVal.includes('.')) {
        nextVal = (curVal || '0') + '.';
      }
    } else {
      if (curVal.length < 12) {
        nextVal = curVal + key;
      }
    }
    setAnswers((prev) => ({ ...prev, [qNumber]: nextVal }));
    try {
      playChime();
    } catch {
    }
  };

  const handleDirectInput = (qNumber: number, val: string) => {
    if (isSubmitted) return;
    const sanitized = val.replace(/[^0-9.-]/g, '');
    setAnswers((prev) => ({ ...prev, [qNumber]: sanitized }));
  };

  const handleToggleFlag = (qNumber: number) => {
    setFlagged((prev) =>
      prev.includes(qNumber) ? prev.filter((n) => n !== qNumber) : [...prev, qNumber],
    );
  };

  const isQuestionAnswered = (q: ExamCBTQuestion): boolean => {
    const ans = answers[q.number];
    const qPart = q.part ?? (q.questionType === 'true_false' || (q.statements && q.statements.length > 0) ? 2 : q.questionType === 'short_answer' || q.numericAnswer !== undefined ? 3 : 1);
    if (qPart === 2) {
      if (!ans || typeof ans !== 'object') return false;
      const map = ans as Record<string, boolean>;
      const stmts = q.statements || [];
      return stmts.length > 0 && Object.keys(map).length >= stmts.length;
    }
    if (qPart === 3) {
      return ans !== undefined && String(ans).trim() !== '';
    }
    return ans !== undefined && ans !== '';
  };

  const answeredCount = useMemo(() => {
    return questions.filter((q) => isQuestionAnswered(q)).length;
  }, [questions, answers]);

  const handleSubmitExam = () => {
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
    setShowStepSolutions(false);
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
  const currentQPart = currentQ?.part ?? (currentQ?.questionType === 'true_false' || (currentQ?.statements && currentQ?.statements.length > 0) ? 2 : currentQ?.questionType === 'short_answer' || currentQ?.numericAnswer !== undefined ? 3 : 1);
  const isUrgent = secondsLeft < 300;
  const percentLeft = initialDurationSeconds > 0 ? Math.max(0, Math.min(100, (secondsLeft / initialDurationSeconds) * 100)) : 0;
  const circumference = 2 * Math.PI * 9;
  const strokeDashoffset = circumference - (percentLeft / 100) * circumference;

  const filteredQuestions = useMemo(() => {
    if (selectedPartFilter === 0) return questions;
    return questions.filter((q) => {
      const p = q.part ?? (q.questionType === 'true_false' || (q.statements && q.statements.length > 0) ? 2 : q.questionType === 'short_answer' || q.numericAnswer !== undefined ? 3 : 1);
      return p === selectedPartFilter;
    });
  }, [questions, selectedPartFilter]);

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
        className="ff-exam-modal ff-exam-dialog-panel w-full max-w-5xl min-h-0 rounded-[16px] p-4 sm:p-6 flex flex-col overflow-hidden relative shadow-[0_25px_80px_rgba(0,0,0,0.85)] border-2 border-[#2B2331]/30 bg-[#0c1017] card-hard"
        onClick={(event) => event.stopPropagation()}
      >
        {isZenMode ? (
          <header className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsZenMode(false)}
                className="btn-feastables ff-tactile-pop px-3 py-1.5 rounded-[16px] bg-amber-400 text-[#0b0d12] text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm card-hard"
                title="Thoát chế độ Zen Focus"
              >
                <Target className="w-3.5 h-3.5" />
                <span>Thoát Zen Focus</span>
              </button>
              <span className="text-xs font-mono font-semibold text-white/70">
                Câu {currentQ?.number || 1} / {totalQuestions}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {!isSubmitted ? (
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-[16px] border font-mono font-bold text-xs sm:text-sm transition-all duration-300 ${
                    isUrgent
                      ? 'bg-amber-500/15 border-amber-400/50 text-amber-200 animate-pulse'
                      : 'bg-white/10 border-white/15 text-white'
                  }`}
                >
                  <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 -rotate-90" viewBox="0 0 24 24">
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.15)"
                        strokeWidth="2.5"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        fill="none"
                        stroke={isUrgent ? '#f59e0b' : '#38bdf8'}
                        strokeWidth="2.5"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-linear"
                      />
                    </svg>
                    <Clock className="w-2.5 h-2.5 text-amber-400 absolute inset-0 m-auto" />
                  </div>
                  <span>{formatTime(secondsLeft)}</span>
                  <button
                    type="button"
                    onClick={() => setIsTimerPaused(!isTimerPaused)}
                    className="ml-1 inline-flex min-h-7 min-w-7 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white cursor-pointer"
                    aria-label={isTimerPaused ? 'Tiếp tục đếm giờ' : 'Tạm dừng đếm giờ'}
                    title={isTimerPaused ? 'Tiếp tục' : 'Tạm dừng'}
                  >
                    {isTimerPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3" />}
                  </button>
                </div>
              ) : (
                <div className="px-3 py-1 rounded-[16px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Đã hoàn thành
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-[16px] bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label="Đóng phòng thi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>
        ) : (
          <header className="flex items-center justify-between pb-3.5 border-b border-white/10 flex-wrap gap-2 shrink-0">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="p-2.5 rounded-[16px] bg-amber-400/20 text-amber-300 border border-amber-400/30 card-hard">
                <Timer className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20">
                    CBT 3 Phần GDPT 2018
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
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-[16px] bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Vi phạm: {violationCount}</span>
                </span>
              )}

              {!isSubmitted && (
                <button
                  type="button"
                  onClick={() => setIsZenMode(true)}
                  className="btn-feastables ff-tactile-pop px-3 py-1.5 rounded-[16px] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all bg-white/10 text-white/80 hover:text-white border border-white/15 card-hard"
                  title="Chế độ thi tập trung sâu Zen Focus"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Zen Focus</span>
                </button>
              )}

              {!isSubmitted ? (
                <div
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[16px] border font-mono font-bold text-xs sm:text-sm transition-all duration-300 ${
                    isUrgent
                      ? 'bg-amber-500/15 border-amber-400/50 text-amber-200 animate-pulse'
                      : 'bg-white/10 border-white/15 text-white'
                  }`}
                >
                  <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 -rotate-90" viewBox="0 0 24 24">
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.15)"
                        strokeWidth="2.5"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        fill="none"
                        stroke={isUrgent ? '#f59e0b' : '#38bdf8'}
                        strokeWidth="2.5"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-linear"
                      />
                    </svg>
                    <Clock className="w-2.5 h-2.5 text-amber-400 absolute inset-0 m-auto" />
                  </div>
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
                <div className="px-3 py-1 rounded-[16px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Đã hoàn thành
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-[16px] bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
                aria-label="Đóng phòng thi"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>
        )}

        <div className="py-2.5 px-1 border-b border-white/10 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-1.5">
            {[
              { id: 0 as const, label: 'Tất cả câu hỏi' },
              { id: 1 as const, label: 'Phần I: 4 Lựa chọn' },
              { id: 2 as const, label: 'Phần II: Đúng/Sai (4 ý)' },
              { id: 3 as const, label: 'Phần III: Điền số thực' },
            ].map((partTab) => {
              const active = selectedPartFilter === partTab.id;
              return (
                <button
                  key={partTab.id}
                  type="button"
                  onClick={() => setSelectedPartFilter(partTab.id)}
                  className={`px-3 py-1.5 rounded-[12px] text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer border ${
                    active
                      ? 'bg-[#FBF2E1] text-[#2B2331] border-[#2B2331] shadow-sm font-extrabold'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {partTab.label}
                </button>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-white/60 shrink-0">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Đã làm: {answeredCount}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Đang chọn
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" /> Cần xem: {flagged.length}
            </span>
          </div>
        </div>

        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar py-4 ${isZenMode ? 'bg-[#0a0e14]' : ''}`}>
          {!isSubmitted || showReviewMode ? (
            <div className={isZenMode ? 'max-w-3xl mx-auto space-y-4' : 'grid grid-cols-1 lg:grid-cols-12 gap-5'}>
              <div className={isZenMode ? 'w-full' : 'lg:col-span-8 flex flex-col justify-between'}>
                {currentQ && (
                  <div className={`card-hard rounded-[16px] p-5 sm:p-7 border-2 border-white/15 flex flex-col justify-between min-h-[380px] sm:min-h-[440px] ${isZenMode ? 'bg-[#0f141d]' : 'bg-[#111722]'}`}>
                    <div className="min-w-0">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="px-3 py-1 rounded-[12px] bg-[#FBF2E1] text-[#2B2331] text-xs font-black shadow-sm border border-[#2B2331]/30">
                            Câu {currentQ.number} / {totalQuestions}
                          </span>
                          <span className="px-2.5 py-1 rounded-[12px] bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-mono font-bold">
                            {currentQPart === 1 ? 'Phần I · 4 Lựa chọn' : currentQPart === 2 ? 'Phần II · Đúng/Sai 4 ý' : 'Phần III · Điền số thực'}
                          </span>
                          <span className="min-w-0 max-w-full break-words rounded-[12px] border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90">
                            {currentQ.topic}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-[12px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold">
                            {currentQ.difficulty}
                          </span>
                        </div>

                        {!isSubmitted && (
                          <button
                            type="button"
                            onClick={() => handleToggleFlag(currentQ.number)}
                            className={`ml-auto inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-[12px] border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                              flagged.includes(currentQ.number)
                                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
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

                      {currentQPart === 1 && (
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
                                className={`btn-feastables ff-tactile-pop w-full p-4 rounded-[14px] text-left flex items-start gap-3.5 transition-all cursor-pointer disabled:cursor-default card-hard ${optionTheme}`}
                              >
                                <span
                                  className={`w-8 h-8 rounded-[10px] font-mono font-black text-sm flex items-center justify-center shrink-0 border ${badgeTheme}`}
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
                      )}

                      {currentQPart === 2 && (
                        <div className="space-y-3">
                          <div className="p-2.5 rounded-[12px] bg-white/[0.03] border border-white/10 text-xs text-white/70 flex items-center justify-between">
                            <span className="font-semibold">Mỗi ý chọn Đúng hoặc Sai (Bộ GD&ĐT quy chế 0.1 - 0.25 - 0.5 - 1.0 điểm)</span>
                            <span className="text-[11px] font-mono text-amber-300">4 mệnh đề độc lập</span>
                          </div>

                          {(currentQ.statements || [
                            { id: 'a', label: 'a', text: currentQ.options[0]?.text || 'Mệnh đề a', isCorrect: true },
                            { id: 'b', label: 'b', text: currentQ.options[1]?.text || 'Mệnh đề b', isCorrect: true },
                            { id: 'c', label: 'c', text: currentQ.options[2]?.text || 'Mệnh đề c', isCorrect: false },
                            { id: 'd', label: 'd', text: currentQ.options[3]?.text || 'Mệnh đề d', isCorrect: true },
                          ]).map((stmt) => {
                            const curTf = (typeof answers[currentQ.number] === 'object' && answers[currentQ.number] !== null ? answers[currentQ.number] : {}) as Record<string, boolean>;
                            const selectedVal = curTf[stmt.id];
                            const isCorrectVal = selectedVal === stmt.isCorrect;

                            return (
                              <div
                                key={stmt.id}
                                className="p-3.5 sm:p-4 rounded-[14px] bg-[#161f2e] border border-[#293241] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 card-hard"
                              >
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                  <span className="w-7 h-7 rounded-[8px] bg-[#FBF2E1] text-[#2B2331] font-mono font-black text-xs flex items-center justify-center shrink-0 border border-[#2B2331]">
                                    {stmt.label})
                                  </span>
                                  <span className="text-sm text-slate-100 leading-relaxed font-medium select-text pt-0.5">
                                    {stmt.text}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                  <button
                                    type="button"
                                    disabled={isSubmitted}
                                    onClick={() => handleSelectTrueFalse(currentQ.number, stmt.id, true)}
                                    className={`px-3.5 py-1.5 rounded-[10px] text-xs font-mono font-bold transition-all cursor-pointer border card-hard ${
                                      selectedVal === true
                                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-md font-extrabold'
                                        : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                                    }`}
                                  >
                                    Đúng
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isSubmitted}
                                    onClick={() => handleSelectTrueFalse(currentQ.number, stmt.id, false)}
                                    className={`px-3.5 py-1.5 rounded-[10px] text-xs font-mono font-bold transition-all cursor-pointer border card-hard ${
                                      selectedVal === false
                                        ? 'bg-rose-500 text-white border-rose-400 shadow-md font-extrabold'
                                        : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                                    }`}
                                  >
                                    Sai
                                  </button>

                                  {isSubmitted && (
                                    <span className={`text-xs font-bold px-2 py-1 rounded-[8px] border ml-1 ${
                                      isCorrectVal
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    }`}>
                                      {stmt.isCorrect ? 'Đúng' : 'Sai'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {currentQPart === 3 && (
                        <div className="space-y-4 max-w-lg mx-auto">
                          <div className="p-4 rounded-[16px] bg-[#161f2e] border-2 border-amber-400/40 space-y-3 card-hard">
                            <label className="text-xs font-mono text-amber-300 uppercase tracking-wider block font-bold">
                              Kết quả số thực điền vào ô:
                            </label>

                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                disabled={isSubmitted}
                                value={String(answers[currentQ.number] ?? '')}
                                onChange={(e) => handleDirectInput(currentQ.number, e.target.value)}
                                placeholder="Nhập số thực (ví dụ: 3.14, -5, 11)..."
                                className="w-full px-4 py-3 rounded-[12px] bg-black/50 border border-white/20 text-white font-mono text-lg font-bold text-center focus:outline-none focus:border-amber-400 tracking-wider"
                              />
                              {!isSubmitted && (
                                <button
                                  type="button"
                                  onClick={() => handleKeypadPress(currentQ.number, 'clear')}
                                  className="px-3 py-3 rounded-[12px] bg-white/10 text-white/70 hover:bg-white/20 text-xs font-mono font-bold"
                                  title="Xoá ô nhập"
                                >
                                  Xoá
                                </button>
                              )}
                            </div>

                            {isSubmitted && (
                              <div className="p-3 rounded-[10px] bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 font-mono">
                                <span>Đáp án chuẩn: <strong>{currentQ.numericAnswer ?? currentQ.correctAnswer}</strong> (dung sai ±{currentQ.tolerance ?? 0.05})</span>
                              </div>
                            )}
                          </div>

                          {!isSubmitted && (
                            <div className="p-3.5 rounded-[16px] bg-black/40 border border-white/10 space-y-2 card-hard">
                              <span className="text-[11px] font-mono text-white/50 block text-center">
                                Bàn phím số tactile ảo (hỗ trợ nhập nhanh trên mobile &amp; tablet):
                              </span>
                              <div className="grid grid-cols-3 gap-2">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '0', '.'].map((key) => (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleKeypadPress(currentQ.number, key)}
                                    className="py-3 rounded-[12px] bg-[#1f2937] hover:bg-[#374151] border border-white/15 text-white font-mono font-bold text-base transition-all active:scale-95 card-hard cursor-pointer"
                                  >
                                    {key}
                                  </button>
                                ))}
                              </div>
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleKeypadPress(currentQ.number, 'backspace')}
                                  className="py-2.5 rounded-[12px] bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-mono font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer card-hard"
                                >
                                  <Delete className="w-4 h-4" /> Xoá ký tự lùi
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleKeypadPress(currentQ.number, 'clear')}
                                  className="py-2.5 rounded-[12px] bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono font-bold text-xs cursor-pointer card-hard"
                                >
                                  Xoá toàn bộ
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {isSubmitted && (
                        <div className="mt-6 p-4 sm:p-5 rounded-[16px] bg-neutral-900/90 border border-amber-400/30 space-y-3 text-xs sm:text-sm card-hard">
                          <div className="flex items-center gap-2 font-bold text-emerald-400">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>
                              {currentQPart === 1
                                ? `Đáp án chính xác: Phương án ${currentQ.correctAnswer}`
                                : currentQPart === 2
                                  ? 'Lời giải chi tiết 4 mệnh đề Đúng/Sai:'
                                  : `Giá trị số thực chuẩn: ${currentQ.numericAnswer ?? currentQ.correctAnswer}`}
                            </span>
                          </div>

                          <div className="p-3.5 rounded-[12px] bg-white/[0.03] text-neutral-200 leading-relaxed select-text">
                            <strong className="text-amber-300 block mb-1">Hướng dẫn giải bài:</strong>
                            <span>{currentQ.explanation}</span>
                          </div>

                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => setShowStepSolutions(!showStepSolutions)}
                              className="px-3.5 py-1.5 rounded-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>{showStepSolutions ? 'Ẩn lời giải từng bước KaTeX' : 'Xem Lời Giải Chi Tiết Từng Bước (KaTeX)'}</span>
                            </button>
                          </div>

                          {showStepSolutions && (
                            <div className="pt-2">
                              <StepSolutionAccordion
                                solutionText={currentQ.explanation}
                                formula={currentQ.keyFormula}
                                subject={paper.subject}
                              />
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
                        className="px-4 py-2 rounded-[12px] border border-white/15 text-white/80 hover:text-white hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:pointer-events-none card-hard"
                      >
                        <ChevronLeft className="w-4 h-4" /> Câu trước
                      </button>

                      {isSubmitted && (
                        <button
                          type="button"
                          onClick={() => setShowReviewMode(false)}
                          className="btn-feastables ff-tactile-pop px-4 py-2 rounded-[12px] bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-semibold cursor-pointer card-hard"
                        >
                          Quay lại bảng kết quả &amp; Radar
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={currentIndex === totalQuestions - 1}
                        onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                        className="btn-feastables ff-tactile-pop px-4 py-2 rounded-[12px] bg-amber-400 text-[#0b0d12] hover:bg-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:pointer-events-none card-hard"
                      >
                        Câu tiếp <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {isZenMode && !isSubmitted && (
                <div className="card-hard rounded-[16px] p-3.5 bg-[#0f141d] border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-white/70">
                    <span className="flex items-center gap-1.5 font-bold text-amber-300">
                      <Layers className="w-3.5 h-3.5" /> Điều hướng nhanh ({answeredCount}/{totalQuestions})
                    </span>
                    <button
                      type="button"
                      onClick={handleSubmitExam}
                      className="btn-feastables ff-tactile-pop px-3 py-1 rounded-[10px] bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-sm card-hard"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Nộp bài
                    </button>
                  </div>
                  <div className="grid grid-cols-10 gap-1.5 max-h-[160px] overflow-y-auto no-scrollbar pr-0.5">
                    {questions.map((q, idx) => {
                      const isCurrent = currentIndex === idx;
                      const isAnswered = isQuestionAnswered(q);
                      const isFlagged = flagged.includes(q.number);

                      let btnStyle = 'bg-white/[0.04] border-white/10 text-white/50 hover:bg-white/10 hover:text-white';
                      if (isCurrent) {
                        btnStyle = 'border-amber-400 bg-amber-400/30 text-amber-200 font-extrabold ring-2 ring-amber-400';
                      } else if (isFlagged) {
                        btnStyle = 'bg-rose-500/20 border-rose-400/40 text-rose-300 font-semibold';
                      } else if (isAnswered) {
                        btnStyle = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold';
                      }

                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setCurrentIndex(idx)}
                          className={`h-8 rounded-[8px] border text-xs font-mono font-bold flex items-center justify-center transition-all cursor-pointer relative ${btnStyle}`}
                        >
                          <span>{q.number}</span>
                          {isFlagged && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 absolute top-0.5 right-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {!isZenMode && (
                <div className="lg:col-span-4 card-hard rounded-[16px] p-5 bg-[#111722] border-2 border-white/15 flex flex-col justify-between">
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

                    <div className="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                      {filteredQuestions.map((q) => {
                        const idx = questions.findIndex((item) => item.id === q.id);
                        const isCurrent = currentIndex === idx;
                        const isAnswered = isQuestionAnswered(q);
                        const isFlagged = flagged.includes(q.number);

                        let btnStyle = 'bg-white/[0.04] border-white/10 text-white/50 hover:bg-white/10 hover:text-white';
                        if (isCurrent) {
                          btnStyle = 'border-amber-400 bg-amber-400 text-[#0b0d12] font-black ring-2 ring-amber-300 shadow-md';
                        } else if (isFlagged) {
                          btnStyle = 'bg-[#73324c]/40 border-rose-400/50 text-rose-200 font-bold';
                        } else if (isAnswered) {
                          btnStyle = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold';
                        }

                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setCurrentIndex(idx)}
                            className={`h-10 rounded-[12px] border text-xs font-mono font-bold flex items-center justify-center transition-all duration-150 cursor-pointer relative card-hard ${btnStyle}`}
                          >
                            <span>{q.number}</span>
                            {isFlagged && (
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 absolute top-1 right-1" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3.5 border-t border-white/10 text-[11px] text-white/65">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/40" /> Đã làm
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-white/[0.04] border border-white/10" /> Chưa làm
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-[#73324c]/40 border border-rose-400/40" /> Đánh dấu
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-amber-400 text-black border border-amber-400" /> Đang chọn
                      </span>
                    </div>
                  </div>

                  {!isSubmitted && (
                    <div className="pt-4 border-t border-white/10 mt-4">
                      <button
                        type="button"
                        onClick={handleSubmitExam}
                        className="btn-feastables ff-tactile-pop w-full py-3 rounded-[12px] bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all card-hard"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Nộp bài thi trực tuyến</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            cbtResult && (
              <div className="p-4 sm:p-7 rounded-[16px] bg-[#111722] border-2 border-white/15 space-y-6 animate-fade-in card-hard">
                <div className="flex flex-col sm:flex-row items-center justify-between p-6 rounded-[16px] bg-gradient-to-r from-amber-500/20 via-emerald-500/10 to-transparent border border-amber-400/35 gap-4 text-center sm:text-left card-hard">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-[16px] bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0 card-hard">
                      <Award className="w-9 h-9 text-amber-300" />
                    </div>
                    <div>
                      <span className="text-[11px] font-mono text-amber-300 uppercase font-bold tracking-wider">
                        Bảng Tổng Kết Kết Quả CBT GDPT 2018
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
                        Hoàn thành {cbtResult.correctCount}/{cbtResult.totalQuestions} câu hỏi · Thời gian làm: {formatTime(cbtResult.timeSpentSeconds)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center sm:items-end">
                    <div className="text-3xl sm:text-4xl font-black text-amber-300 font-mono tracking-tight">
                      {cbtResult.score.toFixed(2)}
                      <span className="text-sm sm:text-base font-normal text-white/50"> / 10</span>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                      <Sparkles className="w-3 h-3" /> +25 XP Chuyên Cần F-Forum
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="p-4 rounded-[14px] bg-[#161f2e] border border-white/10 card-hard space-y-1.5">
                    <span className="text-[10.5px] font-mono uppercase text-amber-300 font-bold block">
                      Phần I: 4 Lựa chọn
                    </span>
                    <div className="text-lg font-mono font-bold text-white">
                      {cbtResult.partBreakdown?.part1.correct ?? 0} / {cbtResult.partBreakdown?.part1.total ?? 0} câu
                    </div>
                    <p className="text-xs text-emerald-400 font-mono font-semibold">
                      {(cbtResult.partBreakdown?.part1.score ?? 0).toFixed(2)} / 3.0 điểm
                    </p>
                  </div>

                  <div className="p-4 rounded-[14px] bg-[#161f2e] border border-white/10 card-hard space-y-1.5">
                    <span className="text-[10.5px] font-mono uppercase text-cyan-300 font-bold block">
                      Phần II: Đúng/Sai (4 ý)
                    </span>
                    <div className="text-lg font-mono font-bold text-white">
                      {cbtResult.partBreakdown?.part2.correctStatements ?? 0} ý chính xác
                    </div>
                    <p className="text-xs text-emerald-400 font-mono font-semibold">
                      {(cbtResult.partBreakdown?.part2.score ?? 0).toFixed(2)} / 4.0 điểm
                    </p>
                  </div>

                  <div className="p-4 rounded-[14px] bg-[#161f2e] border border-white/10 card-hard space-y-1.5">
                    <span className="text-[10.5px] font-mono uppercase text-emerald-300 font-bold block">
                      Phần III: Điền số thực
                    </span>
                    <div className="text-lg font-mono font-bold text-white">
                      {cbtResult.partBreakdown?.part3.correct ?? 0} / {cbtResult.partBreakdown?.part3.total ?? 0} câu
                    </div>
                    <p className="text-xs text-emerald-400 font-mono font-semibold">
                      {(cbtResult.partBreakdown?.part3.score ?? 0).toFixed(2)} / 3.0 điểm
                    </p>
                  </div>
                </div>

                <div className="p-5 sm:p-6 rounded-[16px] bg-[#0d121c] border border-white/10 card-hard">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1 w-full space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-[12px] bg-amber-400/15 border border-amber-400/30 text-amber-300 card-hard">
                          <Target className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-white">
                            Biểu Đồ Radar: Phân Tích Lỗ Hổng Kiến Thức
                          </h3>
                          <p className="text-xs text-slate-400">
                            Đánh giá đa chiều năng lực theo ma trận kiến thức GDPT 2018
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="p-3.5 rounded-[12px] bg-emerald-950/30 border border-emerald-500/30 text-xs card-hard">
                          <div className="flex items-center gap-2 font-bold text-emerald-300 mb-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>Điểm mạnh nổi trội ({strongestTopics.length} chuyên đề):</span>
                          </div>
                          {strongestTopics.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {strongestTopics.map((t) => (
                                <span key={t.label} className="px-2.5 py-1 rounded-[8px] bg-emerald-500/20 text-emerald-200 font-semibold text-[11px]">
                                  {t.label} ({t.score}%)
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-300 text-[11px]">Hãy làm quen thêm với các dạng bài cơ bản để thiết lập thế mạnh.</p>
                          )}
                        </div>

                        <div className="p-3.5 rounded-[12px] bg-rose-950/30 border border-rose-500/30 text-xs card-hard">
                          <div className="flex items-center gap-2 font-bold text-rose-300 mb-1">
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>Lỗ hổng kiến thức cần củng cố ({gapTopics.length} chuyên đề):</span>
                          </div>
                          {gapTopics.length > 0 ? (
                            <div className="space-y-2 mt-2">
                              <div className="flex flex-wrap gap-1.5">
                                {gapTopics.map((t) => (
                                  <span key={t.label} className="px-2.5 py-1 rounded-[8px] bg-rose-500/20 text-rose-200 font-semibold text-[11px]">
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

                <div className="flex items-center justify-between pt-4 border-t border-white/10 flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleRestartExam}
                    className="btn-feastables ff-tactile-pop px-4 py-2.5 rounded-[12px] border border-white/15 text-white hover:bg-white/10 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors card-hard"
                  >
                    <RotateCcw className="w-4 h-4" /> Làm lại đề này
                  </button>

                  <div className="flex flex-wrap items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowReviewMode(true);
                        setShowStepSolutions(true);
                      }}
                      className="btn-feastables ff-tactile-pop px-4 py-2.5 rounded-[12px] bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/40 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors card-hard"
                    >
                      <Eye className="w-4 h-4" /> Xem Lời Giải Chi Tiết Từng Bước
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn-feastables ff-tactile-pop px-5 py-2.5 rounded-[12px] bg-amber-400 hover:bg-amber-300 text-[#0b0d12] text-xs font-extrabold cursor-pointer transition-colors card-hard"
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
            <div className="w-full max-w-md space-y-4 rounded-[16px] border-2 border-rose-500 bg-neutral-900 p-5 text-center sm:p-6 card-hard shadow-2xl">
              <div className="w-14 h-14 rounded-[12px] bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto card-hard">
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
                  className="btn-feastables ff-tactile-pop px-6 py-2.5 rounded-[12px] bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs cursor-pointer shadow-md card-hard"
                >
                  Tôi Đã Hiểu, Quay Lại Làm Bài
                </button>
              </div>
            </div>
          </div>
        )}

        {showConfirmSubmit && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md space-y-4 rounded-[16px] border border-amber-400/40 bg-neutral-900 p-4 text-center sm:p-6 card-hard">
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
                  className="btn-feastables ff-tactile-pop px-4 py-2 rounded-[12px] border border-white/20 text-white hover:bg-white/10 text-xs font-semibold cursor-pointer card-hard"
                >
                  Làm tiếp
                </button>
                <button
                  type="button"
                  onClick={finalizeSubmit}
                  className="btn-feastables ff-tactile-pop px-5 py-2 rounded-[12px] bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold cursor-pointer card-hard"
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
