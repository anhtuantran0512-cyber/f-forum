/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Award,
  Timer,
  Check,
  Lightbulb,
  Flame,
} from 'lucide-react';
import type { ExamPaper, ExamCBTQuestion } from '../../types';
import { getExamCBTQuestions } from './cbtData';
import { playChime } from '../../utils/audio';
import './ExamFlashcardModal.css';

export interface ExamFlashcardModalProps {
  paper: ExamPaper;
  isOpen: boolean;
  onClose: () => void;
  onOpenCbt?: () => void;
}

type FilterMode = 'all' | 'review' | 'mastered';

export const ExamFlashcardModal: React.FC<ExamFlashcardModalProps> = ({
  paper,
  isOpen,
  onClose,
  onOpenCbt,
}) => {
  const allQuestions: ExamCBTQuestion[] = useMemo(() => getExamCBTQuestions(paper), [paper]);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [masteredIds, setMasteredIds] = useState<Set<string>>(() => new Set());
  const [reviewIds, setReviewIds] = useState<Set<string>>(() => new Set());
  const [rawIndex, setRawIndex] = useState(0);
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  const [isCompletedView, setIsCompletedView] = useState(false);

  /* Danh sách câu hỏi sau khi áp dụng bộ lọc trạng thái */
  const activeQuestions = useMemo(() => {
    if (filterMode === 'mastered') {
      return allQuestions.filter((q) => masteredIds.has(q.id));
    }
    if (filterMode === 'review') {
      return allQuestions.filter((q) => reviewIds.has(q.id));
    }
    return allQuestions;
  }, [allQuestions, filterMode, masteredIds, reviewIds]);

  /* Đảm bảo chỉ số câu hỏi hợp lệ trong mọi trường hợp lọc */
  const currentIndex = activeQuestions.length > 0 && rawIndex >= activeQuestions.length ? 0 : rawIndex;
  const currentQuestion = activeQuestions[currentIndex] || activeQuestions[0] || null;
  const isFlipped = currentQuestion ? flippedCardId === currentQuestion.id : false;

  const totalCount = allQuestions.length;
  const masteredCount = masteredIds.size;
  const reviewCount = reviewIds.size;

  const handleNext = useCallback(() => {
    setFlippedCardId(null);
    if (currentIndex < activeQuestions.length - 1) {
      setRawIndex(currentIndex + 1);
    } else {
      setIsCompletedView(true);
      playChime('level-up');
    }
  }, [activeQuestions.length, currentIndex]);

  const handlePrev = useCallback(() => {
    setFlippedCardId(null);
    if (currentIndex > 0) {
      setRawIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleToggleFlip = useCallback(() => {
    if (!currentQuestion) return;
    setFlippedCardId((prev) => (prev === currentQuestion.id ? null : currentQuestion.id));
    playChime('send');
  }, [currentQuestion]);

  const handleMarkMastered = useCallback(() => {
    if (!currentQuestion) return;
    setMasteredIds((prev) => {
      const next = new Set(prev);
      next.add(currentQuestion.id);
      return next;
    });
    setReviewIds((prev) => {
      const next = new Set(prev);
      next.delete(currentQuestion.id);
      return next;
    });
    playChime('success');
    handleNext();
  }, [currentQuestion, handleNext]);

  const handleMarkReview = useCallback(() => {
    if (!currentQuestion) return;
    setReviewIds((prev) => {
      const next = new Set(prev);
      next.add(currentQuestion.id);
      return next;
    });
    setMasteredIds((prev) => {
      const next = new Set(prev);
      next.delete(currentQuestion.id);
      return next;
    });
    playChime('xp');
    handleNext();
  }, [currentQuestion, handleNext]);

  /* Bắt phím tắt trợ năng cho việc ôn tập siêu tốc */
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (isCompletedView) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (reviewIds.size > 0) {
            setFilterMode('review');
          } else {
            setFilterMode('all');
          }
          setRawIndex(0);
          setFlippedCardId(null);
          setIsCompletedView(false);
        }
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleToggleFlip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleMarkMastered();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleMarkReview();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isCompletedView, reviewIds.size, handleToggleFlip, handleNext, handlePrev, handleMarkMastered, handleMarkReview]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Thẻ ghi nhớ & Ôn tập nhanh"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="liquid-glass modal-container card-hard w-full max-w-2xl rounded-2xl p-4 sm:p-6 relative flex flex-col max-h-[94vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-dashed border-[#f4f1de]/15 mb-4 shrink-0 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#f2cc8f]/18 border-[1.5px] border-[#f2cc8f]/40 flex items-center justify-center text-[#f2cc8f] shrink-0 shadow-[2px_2px_0px_rgba(4,6,11,0.8)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="ff-typo-poster !text-base sm:!text-lg text-[#f4f1de]">
                  <span className="ff-swash-cap text-base">T</span>hẻ Ghi Nhớ &amp; Ôn Tập Nhanh
                </h3>
                <span className="sr-only">Ôn từng thẻ, nhớ sâu hơn.</span>
              </div>
              <p className="text-xs text-[#9a978e] truncate max-w-md mt-0.5">
                {paper.title} · Môn {paper.subject} Lớp {paper.grade}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenCbt && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCbt();
                }}
                className="ff-tactile-btn hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#81b29a]/45 bg-[#81b29a]/15 text-[#d8f3dc] text-xs font-bold hover:bg-[#81b29a]/25 cursor-pointer transition-colors"
                title="Chuyển sang phòng thi thử trắc nghiệm tính giờ"
              >
                <Timer className="w-3.5 h-3.5 text-[#81b29a]" />
                <span>Thi thử CBT</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="ff-tactile-btn p-2 rounded-xl bg-[#0b0d12] hover:bg-white/10 border border-[#f4f1de]/15 text-[#d8d5ce] hover:text-[#f4f1de] transition-colors cursor-pointer"
              aria-label="Đóng thẻ ghi nhớ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills & Progress Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0b0d12]/70 border border-[#f4f1de]/12 w-fit">
            <button
              type="button"
              onClick={() => {
                setFilterMode('all');
                setRawIndex(0);
                setFlippedCardId(null);
                setIsCompletedView(false);
              }}
              className={`ff-tactile-btn px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-[#f4f1de] text-[#0b0d12]'
                  : 'text-[#9a978e] hover:text-[#f4f1de]'
              }`}
            >
              Tất cả ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('review');
                setRawIndex(0);
                setFlippedCardId(null);
                setIsCompletedView(false);
              }}
              className={`ff-tactile-btn px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'review'
                  ? 'bg-[#e07a5f] text-[#0b0d12]'
                  : 'text-[#9a978e] hover:text-[#e07a5f]'
              }`}
            >
              Cần ôn lại ({reviewCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('mastered');
                setRawIndex(0);
                setFlippedCardId(null);
                setIsCompletedView(false);
              }}
              className={`ff-tactile-btn px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'mastered'
                  ? 'bg-[#81b29a] text-[#0b0d12]'
                  : 'text-[#9a978e] hover:text-[#81b29a]'
              }`}
            >
              Đã thuộc ({masteredCount})
            </button>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-[#d8d5ce] flex-wrap justify-end">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[11px] font-bold">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Chuỗi 7 ngày</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-[#81b29a]">
              <span>Tỷ lệ nhớ:</span>
              <strong className="font-bold text-[#f4f1de]">{Math.round((masteredCount / Math.max(1, totalCount)) * 100)}%</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <span>Đã nắm vững:</span>
              <span className="font-extrabold text-[#f2cc8f]">
                {masteredCount}/{totalCount}
              </span>
            </div>
            <div className="w-24 h-2 bg-[#0b0d12] rounded-full overflow-hidden border border-[#f4f1de]/12">
              <div
                className="h-full bg-gradient-to-r from-[#81b29a] to-[#f2cc8f] transition-all duration-300"
                style={{ width: `${totalCount > 0 ? (masteredCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card Body */}
        {isCompletedView ? (
          <div className="flex flex-col items-center justify-center text-center py-10 px-4 space-y-4 rounded-2xl bg-[#0b0d12]/75 border-[1.5px] border-[#f2cc8f]/35 shadow-[3px_3px_0px_rgba(4,6,11,0.85)]">
            <div className="w-16 h-16 rounded-2xl bg-[#f2cc8f]/18 border border-[#f2cc8f]/40 flex items-center justify-center text-[#f2cc8f] shadow-lg">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <h4 className="ff-typo-poster !text-lg sm:!text-xl text-[#f4f1de]">
                <span className="ff-swash-cap text-lg">H</span>oàn Tất Lượt Ôn Tập
              </h4>
              <p className="text-xs text-[#d8d5ce] mt-1 max-w-md italic">
                "Học mà thường xuyên ôn lại, chẳng cũng vui sao? — Luận Ngữ"
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full max-w-sm pt-2">
              <div className="p-3 rounded-xl bg-[#151a26] border border-[#81b29a]/35 text-center">
                <span className="text-[11px] text-[#81b29a] font-bold block">Đã nắm vững</span>
                <span className="text-xl font-extrabold font-mono text-[#f4f1de]">
                  {masteredCount}/{totalCount}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#151a26] border border-[#e07a5f]/35 text-center">
                <span className="text-[11px] text-[#e07a5f] font-bold block">Cần ôn lại</span>
                <span className="text-xl font-extrabold font-mono text-[#f4f1de]">
                  {reviewCount}/{totalCount}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-4">
              {reviewCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterMode('review');
                    setRawIndex(0);
                    setFlippedCardId(null);
                    setIsCompletedView(false);
                  }}
                  className="ff-tactile-btn px-4 py-2 rounded-xl bg-[#e07a5f] hover:bg-[#f2cc8f] text-[#0b0d12] border-2 border-[#0b0d12] text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ôn lại {reviewCount} câu chưa thuộc</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setFilterMode('all');
                  setRawIndex(0);
                  setFlippedCardId(null);
                  setIsCompletedView(false);
                }}
                className="ff-tactile-btn px-4 py-2 rounded-xl bg-[#f4f1de] hover:bg-[#f2cc8f] text-[#0b0d12] border-2 border-[#0b0d12] text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Bắt đầu lại từ đầu</span>
              </button>
              {onOpenCbt && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCbt();
                  }}
                  className="ff-tactile-btn px-4 py-2 rounded-xl bg-[#81b29a] hover:bg-[#95c4ae] text-[#0b0d12] border-2 border-[#0b0d12] text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Timer className="w-3.5 h-3.5" />
                  <span>Vào thi thử CBT</span>
                </button>
              )}
            </div>
          </div>
        ) : currentQuestion ? (
          <div className="flex-1 flex flex-col space-y-4">
            {/* 3D Flashcard Container */}
            <div
              className="ff-flashcard-perspective cursor-pointer select-none"
              onClick={handleToggleFlip}
              role="button"
              tabIndex={0}
              aria-label={isFlipped ? 'Mặt sau thẻ ghi nhớ, bấm để lật lại' : 'Mặt trước thẻ ghi nhớ, bấm để xem đáp án'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggleFlip();
                }
              }}
            >
              <div className={`ff-flashcard-inner ${isFlipped ? 'is-flipped' : ''}`}>
                {/* Mặt trước của Thẻ (Front: Câu hỏi, chuyên đề, độ khó) */}
                <div className="ff-flashcard-face ff-flashcard-front card-hard p-5 sm:p-7">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-[#f2cc8f]/20 text-[#f2cc8f] border border-[#f2cc8f]/35 font-mono">
                          Câu {currentQuestion.number} / {activeQuestions.length}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-white/10 text-[#d8d5ce] border border-white/12">
                          {currentQuestion.topic}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#81b29a]/20 text-[#d8f3dc] border border-[#81b29a]/35">
                          {currentQuestion.difficulty}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[#9a978e]">
                        {masteredIds.has(currentQuestion.id) ? (
                          <span className="text-[#81b29a] font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Đã thuộc
                          </span>
                        ) : reviewIds.has(currentQuestion.id) ? (
                          <span className="text-[#e07a5f] font-bold flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" /> Cần ôn lại
                          </span>
                        ) : (
                          'Chưa đánh giá'
                        )}
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-[#f4f1de] leading-relaxed mt-4">
                      {currentQuestion.question}
                    </h4>

                    {/* Danh sách lựa chọn tham khảo */}
                    {currentQuestion.options && currentQuestion.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pt-3 border-t border-dashed border-[#f4f1de]/10">
                        {currentQuestion.options.map((opt) => (
                          <div
                            key={opt.id}
                            className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-[#d8d5ce] flex items-start gap-2"
                          >
                            <span className="w-5 h-5 rounded-md bg-[#f2cc8f]/15 text-[#f2cc8f] font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                              {opt.id}
                            </span>
                            <span className="min-w-0 break-words leading-tight pt-0.5">{opt.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-dashed border-[#f4f1de]/12 text-xs text-[#9a978e]">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#f2cc8f]" />
                      Bấm vào thẻ hoặc phím [Cách] để lật đáp án
                    </span>
                    <span className="font-mono text-[11px]">Mặt trước</span>
                  </div>
                </div>

                {/* Mặt sau của Thẻ (Back: Đáp án chuẩn, công thức, giải thích) */}
                <div className="ff-flashcard-face ff-flashcard-back card-hard p-5 sm:p-7">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Đáp án đúng: {currentQuestion.correctAnswer}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono text-[#f2cc8f] bg-[#f2cc8f]/15 border border-[#f2cc8f]/30">
                          {currentQuestion.topic}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-[#f2cc8f]">Mặt sau</span>
                    </div>

                    {/* Công thức trọng tâm nếu có */}
                    {currentQuestion.keyFormula && (
                      <div className="p-3 rounded-xl bg-[#f2cc8f]/10 border border-[#f2cc8f]/35 text-[#f2cc8f] text-xs font-mono mb-3.5 flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-[#f2cc8f] shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-[11px] uppercase tracking-wider mb-0.5">
                            Công thức &amp; Định lý cốt lõi:
                          </strong>
                          <span>{currentQuestion.keyFormula}</span>
                        </div>
                      </div>
                    )}

                    {/* Lời giải chi tiết */}
                    <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-[#f4f1de] leading-relaxed space-y-1.5">
                      <span className="font-bold text-[#81b29a] block text-xs uppercase tracking-wide">
                        Hướng dẫn phương pháp giải:
                      </span>
                      <p className="text-[#dad7d0]">{currentQuestion.explanation}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-dashed border-[#f4f1de]/12 text-xs text-[#9a978e]">
                    <span className="flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-[#81b29a]" />
                      Bấm lại để xem câu hỏi
                    </span>
                    <span className="font-mono text-[11px]">Đã giải nghĩa</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Controls Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="ff-tactile-btn flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-[#0b0d12] hover:bg-white/10 disabled:opacity-40 text-[#f4f1de] border border-[#f4f1de]/15 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                  title="Câu trước (Phím ←)"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Trước</span>
                </button>
                <button
                  type="button"
                  onClick={handleToggleFlip}
                  className="ff-tactile-btn flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-[#f2cc8f]/20 hover:bg-[#f2cc8f]/30 text-[#f2cc8f] border border-[#f2cc8f]/40 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Lật thẻ (Phím Cách)"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isFlipped ? 'Xem câu hỏi' : 'Lật đáp án'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="ff-tactile-btn flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-[#0b0d12] hover:bg-white/10 text-[#f4f1de] border border-[#f4f1de]/15 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                  title="Câu kế (Phím →)"
                >
                  <span>Sau</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
                <button
                  type="button"
                  onClick={handleMarkReview}
                  className="ff-tactile-pop btn-feastables flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 border border-rose-500/50 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Đánh dấu cần xem lại (Phím ↓)"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  <span>Lại</span>
                </button>
                <button
                  type="button"
                  onClick={handleMarkReview}
                  className="ff-tactile-pop btn-feastables flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/50 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Đánh dấu mức độ Khó"
                >
                  <span>Khó</span>
                </button>
                <button
                  type="button"
                  onClick={handleMarkMastered}
                  className="ff-tactile-pop btn-feastables flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/35 text-sky-300 border border-sky-500/50 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Đánh dấu mức độ Tốt"
                >
                  <span>Tốt</span>
                </button>
                <button
                  type="button"
                  onClick={handleMarkMastered}
                  className="ff-tactile-pop btn-feastables flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[#81b29a] hover:bg-[#95c4ae] text-[#0b0d12] border-2 border-[#0b0d12] text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Đánh dấu đã thuộc (Phím ↑)"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Dễ</span>
                </button>
              </div>
            </div>

            <p className="text-[10px] font-mono text-[#9a978e] text-center pt-1">
              Phím tắt: [Cách] lật thẻ · [←/→] chuyển câu · [↑] đã thuộc · [↓] cần ôn lại · [Esc] đóng
            </p>
          </div>
        ) : (
          <div className="p-8 sm:p-12 text-center rounded-2xl bg-[#0b0d12]/75 border-[1.5px] border-[#f4f1de]/15 shadow-[3px_3px_0px_rgba(4,6,11,0.85)] flex flex-col items-center justify-center space-y-3.5">
            <div className="w-14 h-14 rounded-2xl bg-[#81b29a]/15 border border-[#81b29a]/35 flex items-center justify-center text-[#81b29a] shadow-[2px_2px_0px_rgba(4,6,11,0.8)]">
              {filterMode === 'review' ? (
                <CheckCircle2 className="w-7 h-7 text-[#81b29a]" />
              ) : filterMode === 'mastered' ? (
                <Lightbulb className="w-7 h-7 text-[#f2cc8f]" />
              ) : (
                <Sparkles className="w-7 h-7 text-[#f2cc8f]" />
              )}
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-extrabold text-[#f4f1de]">
                <span className="ff-swash-cap text-base">
                  {filterMode === 'review' ? 'X' : filterMode === 'mastered' ? 'C' : 'K'}
                </span>
                {filterMode === 'review'
                  ? 'uất sắc! Bạn không còn câu hỏi nào cần ôn lại'
                  : filterMode === 'mastered'
                  ? 'hưa có câu hỏi nào được đánh dấu đã thuộc'
                  : 'hông có câu hỏi nào trong danh mục lọc này'}
              </h4>
              <p className="text-xs text-[#a39f96] max-w-md mt-1 leading-relaxed">
                {filterMode === 'review'
                  ? 'Toàn bộ các nội dung quan trọng đã được bạn làm chủ. Hãy thử sức ngay với bài thi trắc nghiệm tính giờ để củng cố phản xạ!'
                  : filterMode === 'mastered'
                  ? 'Mỗi lần lật thẻ là một bước khắc sâu kiến thức. Hãy bấm vào thẻ và chọn "Đã nắm vững" khi ghi nhớ nhé!'
                  : 'Hãy quay lại chế độ hiển thị toàn bộ đề để tiếp tục hành trình ôn luyện chủ động.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setFilterMode('all');
                  setRawIndex(0);
                  setFlippedCardId(null);
                  setIsCompletedView(false);
                }}
                className="ff-tactile-btn px-4 py-2 rounded-xl bg-[#f4f1de] hover:bg-[#f2cc8f] text-[#0b0d12] border-2 border-[#0b0d12] text-xs font-extrabold cursor-pointer"
              >
                Xem tất cả câu hỏi ({totalCount})
              </button>
              {filterMode === 'review' && onOpenCbt && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCbt();
                  }}
                  className="ff-tactile-btn px-4 py-2 rounded-xl bg-[#81b29a] hover:bg-[#95c4ae] text-[#0b0d12] border-2 border-[#0b0d12] text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Timer className="w-3.5 h-3.5" />
                  <span>Vào thi thử CBT</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default ExamFlashcardModal;
