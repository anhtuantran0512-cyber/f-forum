/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'lucide-react';
import type { ExamPaper, ExamCBTQuestion, CBTResult } from '../../types';
import { getExamCBTQuestions } from './cbtData';
import { safeStorage } from '../../utils/storage';
import { playChime } from '../../utils/audio';

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

  /* Đếm ngược thời gian làm bài */
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

  /* Tính ma trận kết quả & chấm điểm */
  const calculateResult = useCallback((): CBTResult => {
    let correctCount = 0;
    const topicBreakdown: Record<string, { total: number; correct: number }> = {};
    const difficultyBreakdown: Record<string, { total: number; correct: number }> = {};

    questions.forEach((q) => {
      /* Thống kê chuyên đề */
      if (!topicBreakdown[q.topic]) {
        topicBreakdown[q.topic] = { total: 0, correct: 0 };
      }
      topicBreakdown[q.topic].total += 1;

      /* Thống kê mức độ khó */
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

    /* Lưu lịch sử thi vào safeStorage */
    try {
      const rawHistory = safeStorage.getItem(CBT_HISTORY_KEY);
      const historyList: CBTResult[] = rawHistory ? JSON.parse(rawHistory) : [];
      historyList.unshift(result);
      safeStorage.setItem(CBT_HISTORY_KEY, JSON.stringify(historyList.slice(0, 50)));
    } catch {
      /* Bỏ qua lỗi lưu lịch sử */
    }

    return result;
  }, [questions, answers, totalQuestions, initialDurationSeconds, secondsLeft, paper.id, paper.title]);

  /* Kết thúc và nộp bài thi */
  const finalizeSubmit = useCallback(() => {
    const res = calculateResult();
    setCbtResult(res);
    setIsSubmitted(true);
    setShowConfirmSubmit(false);
    onComplete?.(res);
    try {
      playChime();
    } catch {
      /* Bỏ qua lỗi phát âm thanh */
    }
  }, [calculateResult, onComplete]);

  /* Tự động nộp bài khi hết giờ */
  useEffect(() => {
    if (secondsLeft === 0 && !isSubmitted) {
      requestAnimationFrame(() => {
        finalizeSubmit();
      });
    }
  }, [secondsLeft, isSubmitted, finalizeSubmit]);

  /* Xử lý chọn đáp án */
  const handleSelectOption = (qNumber: number, optionId: 'A' | 'B' | 'C' | 'D') => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [qNumber]: optionId }));
    try {
      playChime();
    } catch {
      /* Bỏ qua */
    }
  };

  /* Đánh dấu cờ câu hỏi */
  const handleToggleFlag = (qNumber: number) => {
    setFlagged((prev) =>
      prev.includes(qNumber) ? prev.filter((n) => n !== qNumber) : [...prev, qNumber],
    );
  };

  /* Nộp bài thi thủ công */
  const handleSubmitExam = () => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < totalQuestions && !showConfirmSubmit) {
      setShowConfirmSubmit(true);
      return;
    }
    finalizeSubmit();
  };

  /* Làm lại đề thi */
  const handleRestartExam = () => {
    setAnswers({});
    setFlagged([]);
    setSecondsLeft(initialDurationSeconds);
    setIsTimerPaused(false);
    setIsSubmitted(false);
    setShowReviewMode(false);
    setCbtResult(null);
    setCurrentIndex(0);
  };

  /* Định dạng mm:ss */
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isUrgent = secondsLeft < 300; /* Dưới 5 phút báo động */

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cbt-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl animate-fade-in select-none"
    >
      <div className="ff-exam-modal w-full max-w-5xl rounded-3xl p-4 sm:p-6 max-h-[96vh] flex flex-col justify-between overflow-hidden relative shadow-[0_25px_80px_rgba(0,0,0,0.85)]">
        {/* ======================================================== */}
        {/* 1. TOP BAR: Title, Timer, Status Badges, Close Button    */}
        {/* ======================================================== */}
        <header className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20">
                  CBT Practice Mode
                </span>
                <span className="text-xs text-white/50">{paper.subject} · Lớp {paper.grade}</span>
              </div>
              <h1 id="cbt-modal-title" className="text-sm sm:text-base font-extrabold text-white truncate max-w-md sm:max-w-xl">
                {paper.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Countdown Timer Capsule */}
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
                  className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white cursor-pointer ml-1"
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

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
              aria-label="Đóng phòng thi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ======================================================== */}
        {/* 2. BODY CONTENT: Exam Questions OR Score Analysis        */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-4">
          {!isSubmitted || showReviewMode ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Column (8 cols): Active Question Card */}
              <div className="lg:col-span-8 flex flex-col justify-between">
                {currentQ && (
                  <div className="p-4 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between min-h-[380px]">
                    <div>
                      {/* Question meta badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-[#0b0d12] text-xs font-extrabold">
                            Câu {currentQ.number} / {totalQuestions}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white/80 text-[11px] font-medium border border-white/15">
                            {currentQ.topic}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                            {currentQ.difficulty}
                          </span>
                        </div>

                        {!isSubmitted && (
                          <button
                            type="button"
                            onClick={() => handleToggleFlag(currentQ.number)}
                            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                              flagged.includes(currentQ.number)
                                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                                : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                            }`}
                            title="Đánh dấu câu hỏi để xem lại sau"
                          >
                            <Flag className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Xem lại</span>
                          </button>
                        )}
                      </div>

                      {/* Question Text */}
                      <h2 className="text-sm sm:text-base font-semibold text-white leading-relaxed mb-6 select-text">
                        {currentQ.question}
                      </h2>

                      {/* 4 Multiple Choice Options (A, B, C, D) */}
                      <div className="space-y-3">
                        {currentQ.options.map((opt) => {
                          const isSelected = answers[currentQ.number] === opt.id;
                          const isCorrect = opt.id === currentQ.correctAnswer;
                          const isUserWrong = isSubmitted && isSelected && !isCorrect;

                          let optionStyles = 'border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08]';
                          if (isSubmitted) {
                            if (isCorrect) {
                              optionStyles = 'border-emerald-500/60 bg-emerald-500/20 text-emerald-200';
                            } else if (isUserWrong) {
                              optionStyles = 'border-rose-500/60 bg-rose-500/20 text-rose-200';
                            } else {
                              optionStyles = 'border-white/10 bg-white/[0.02] text-white/50';
                            }
                          } else if (isSelected) {
                            optionStyles = 'border-amber-400 bg-amber-400/20 text-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.25)]';
                          }

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              disabled={isSubmitted}
                              onClick={() => handleSelectOption(currentQ.number, opt.id)}
                              className={`w-full p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all duration-200 cursor-pointer disabled:cursor-default ${optionStyles}`}
                            >
                              <span
                                className={`w-6 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                                  isSubmitted
                                    ? isCorrect
                                      ? 'bg-emerald-500 text-white'
                                      : isUserWrong
                                        ? 'bg-rose-500 text-white'
                                        : 'bg-white/10 text-white/50'
                                    : isSelected
                                      ? 'bg-amber-400 text-[#0b0d12]'
                                      : 'bg-white/10 text-white/80'
                                }`}
                              >
                                {opt.id}
                              </span>
                              <span className="text-xs sm:text-sm leading-relaxed pt-0.5 select-text">
                                {opt.text}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* If in Review Mode: Show Full Step-by-Step Solution */}
                      {isSubmitted && (
                        <div className="mt-5 p-4 rounded-xl bg-neutral-900/90 border border-amber-400/25 space-y-2 text-xs">
                          <div className="flex items-center gap-2 font-bold text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Đáp án chính xác: Phương án {currentQ.correctAnswer}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white/[0.03] text-neutral-200 leading-relaxed select-text">
                            <strong className="text-amber-300 block mb-1">Hướng dẫn giải chi tiết:</strong>
                            <span>{currentQ.explanation}</span>
                          </div>
                          {currentQ.keyFormula && (
                            <div className="p-2 rounded-lg bg-cyan-950/30 border border-cyan-400/20 text-cyan-200 font-mono text-[11px] flex items-center gap-2 select-text">
                              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              <span><strong>Công thức then chốt:</strong> {currentQ.keyFormula}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Question Controls */}
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/10">
                      <button
                        type="button"
                        disabled={currentIndex === 0}
                        onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                        className="px-3.5 py-1.5 rounded-xl border border-white/15 text-white/80 hover:text-white hover:bg-white/10 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <ChevronLeft className="w-4 h-4" /> Câu trước
                      </button>

                      {isSubmitted && (
                        <button
                          type="button"
                          onClick={() => setShowReviewMode(false)}
                          className="px-3 py-1.5 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-semibold cursor-pointer"
                        >
                          Quay lại bảng điểm
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={currentIndex === totalQuestions - 1}
                        onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-400 text-[#0b0d12] hover:bg-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                      >
                        Câu tiếp <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column (4 cols): Question Navigation Grid Palette */}
              <div className="lg:col-span-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400" /> Bảng câu hỏi ({answeredCount}/{totalQuestions})
                    </span>
                    <span className="text-[11px] font-mono text-white/50">
                      {totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-4">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                      style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
                    />
                  </div>

                  {/* Question Grid Buttons */}
                  <div className="grid grid-cols-5 gap-2 max-h-[260px] overflow-y-auto no-scrollbar pr-1">
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
                        btnStyle = 'border-amber-400 bg-amber-400/30 text-amber-200 font-extrabold ring-2 ring-amber-400/40';
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
                          className={`h-9 rounded-xl border text-xs font-mono flex items-center justify-center transition-all duration-150 cursor-pointer relative ${btnStyle}`}
                        >
                          <span>{q.number}</span>
                          {isFlagged && !isSubmitted && (
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 absolute top-1 right-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/10 text-[10px] text-white/60">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-amber-400/25 border border-amber-400/40" /> Đã làm
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-white/10 border border-white/20" /> Chưa làm
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-purple-500/25 border border-purple-500/40" /> Đánh dấu
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded border border-amber-400 ring-1 ring-amber-400/40" /> Đang chọn
                    </span>
                  </div>
                </div>

                {/* Submit Action CTA */}
                {!isSubmitted && (
                  <div className="pt-4 border-t border-white/10 mt-4">
                    <button
                      type="button"
                      onClick={handleSubmitExam}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Nộp bài thi trực tuyến</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* 3. SCORE & KNOWLEDGE MATRIX REPORT                       */
            /* ======================================================== */
            cbtResult && (
              <div className="p-4 sm:p-7 rounded-2xl bg-white/[0.03] border border-white/10 space-y-6 animate-fade-in">
                {/* Top Summary Banner */}
                <div className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-transparent border border-amber-400/30 gap-4 text-center sm:text-left">
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

                  {/* Score Pill */}
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

                {/* Knowledge Matrix Section */}
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-amber-300/80 mb-3 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-amber-400" /> Phân Tích Ma Trận Kiến Thức &amp; Năng Lực
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* By Cognitive Level */}
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

                    {/* By Topic */}
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

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10 flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleRestartExam}
                    className="px-4 py-2.5 rounded-xl border border-white/15 text-white hover:bg-white/10 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" /> Làm lại đề này
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowReviewMode(true)}
                      className="px-4 py-2.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/40 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Eye className="w-4 h-4" /> Xem giải thích chi tiết từng câu
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0b0d12] text-xs font-extrabold cursor-pointer transition-colors"
                    >
                      Hoàn thành &amp; Đóng
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {/* ======================================================== */}
        {/* 4. CONFIRM SUBMIT MODAL (IF UNANSWERED QUESTIONS)        */}
        {/* ======================================================== */}
        {showConfirmSubmit && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="p-6 rounded-2xl bg-neutral-900 border border-amber-400/40 max-w-md w-full text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Chưa hoàn thành tất cả câu hỏi!</h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Bạn đã trả lời <strong className="text-amber-300">{answeredCount}</strong> trên tổng số{' '}
                <strong className="text-white">{totalQuestions}</strong> câu ({totalQuestions - answeredCount} câu chưa chọn). Bạn có chắc chắn muốn nộp bài ngay bây giờ?
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(false)}
                  className="px-4 py-2 rounded-xl border border-white/20 text-white hover:bg-white/10 text-xs font-semibold cursor-pointer"
                >
                  Làm tiếp
                </button>
                <button
                  type="button"
                  onClick={finalizeSubmit}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold cursor-pointer"
                >
                  Xác nhận nộp bài
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CbtPracticeModal;
