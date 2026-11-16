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
  WifiOff,
  BookOpen,
} from 'lucide-react';
import type { ExamPaper, ExamCBTQuestion } from '../../types';
import { getExamCBTQuestions } from './cbtData';
import { playChime, playPaperPageFlip, playCrystallineChime } from '../../utils/audio';
import {
  saveOfflineFlashcardProgress,
  loadOfflineFlashcardProgress,
  OFFLINE_BADGE_LABEL,
} from '../../utils/offlineStudyCache';
import './ExamFlashcardModal.css';

export interface ExamFlashcardModalProps {
  paper: ExamPaper;
  isOpen: boolean;
  onClose: () => void;
  onOpenCbt?: () => void;
}

type FilterMode = 'all' | 'review' | 'mastered';

const SCHOLASTIC_12_SUBJECTS = [
  'Toán học',
  'Vật lý',
  'Hóa học',
  'Sinh học',
  'Lịch sử',
  'Địa lý',
  'Ngữ văn',
  'Tiếng Anh',
  'Tin học',
  'Triết học',
  'Thiên văn',
  'Nghệ thuật',
];

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
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const saved = loadOfflineFlashcardProgress(`paper_${paper.id}`);
    if (saved) {
      if (typeof saved.cardIndex === 'number' && saved.cardIndex < allQuestions.length) {
        setRawIndex(saved.cardIndex);
      }
      if (Array.isArray(saved.masteredIds)) {
        setMasteredIds(new Set(saved.masteredIds));
      }
      if (Array.isArray(saved.reviewIds)) {
        setReviewIds(new Set(saved.reviewIds));
      }
    }
  }, [paper.id, allQuestions.length]);

  const activeQuestions = useMemo(() => {
    if (filterMode === 'mastered') {
      return allQuestions.filter((q) => masteredIds.has(q.id));
    }
    if (filterMode === 'review') {
      return allQuestions.filter((q) => reviewIds.has(q.id));
    }
    return allQuestions;
  }, [allQuestions, filterMode, masteredIds, reviewIds]);

  const currentIndex = activeQuestions.length > 0 && rawIndex >= activeQuestions.length ? 0 : rawIndex;
  const currentQuestion = activeQuestions[currentIndex] || activeQuestions[0] || null;
  const isFlipped = currentQuestion ? flippedCardId === currentQuestion.id : false;

  const totalCount = allQuestions.length;
  const masteredCount = masteredIds.size;
  const reviewCount = reviewIds.size;
  const learningCount = Math.max(0, totalCount - masteredCount - reviewCount);

  const masteredPct = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;
  const reviewPct = totalCount > 0 ? Math.round((reviewCount / totalCount) * 100) : 0;
  const learningPct = totalCount > 0 ? Math.max(0, 100 - masteredPct - reviewPct) : 0;

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
    playPaperPageFlip();
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
    playCrystallineChime();
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

  useEffect(() => {
    saveOfflineFlashcardProgress(
      `paper_${paper.id}`,
      currentIndex,
      Array.from(masteredIds),
      Array.from(reviewIds),
    );
  }, [paper.id, currentIndex, masteredIds, reviewIds]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStartX(e.touches[0].clientX);
      setIsSwiping(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null || !isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX;
    setSwipeOffset(diff);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null) return;
    if (swipeOffset > 75) {
      handleMarkMastered();
    } else if (swipeOffset < -75) {
      handleMarkReview();
    }
    setTouchStartX(null);
    setSwipeOffset(0);
    setIsSwiping(false);
  };

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
  }, [isOpen, isCompletedView, handleToggleFlip, handleNext, handlePrev, handleMarkMastered, handleMarkReview, onClose, reviewIds.size]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Thẻ ghi nhớ & Ôn tập nhanh"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-[22px] bg-[#161a24] border-[1.5px] border-[#f4f1de]/20 text-[#f4f1de] shadow-[0_24px_64px_rgba(0,0,0,0.85)] p-4 sm:p-6 overflow-hidden">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-dashed border-[#f4f1de]/15 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#f2cc8f]/20 border border-[#f2cc8f]/40 flex items-center justify-center text-[#f2cc8f] shrink-0 shadow-sm">
              <Sparkles className="w-5 h-5 text-[#f2cc8f]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-[#f4f1de] truncate">
                  <span className="ff-swash-cap text-sm">T</span>hẻ Ghi Nhớ &amp; Ôn Tập Nhanh
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f2cc8f]/15 border border-[#f2cc8f]/30 text-[10.5px] font-bold text-[#f2cc8f]">
                  <BookOpen className="w-3 h-3" />
                  {paper.subject || 'Toán học'}
                </span>
              </div>
              <p className="text-xs text-[#9a978e] truncate">
                {paper.title} · Ôn từng thẻ, nhớ sâu hơn.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isOnline && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{OFFLINE_BADGE_LABEL}</span>
              </span>
            )}
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

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2 border-b border-white/5 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9a978e] shrink-0 mr-1">Phân luồng:</span>
          {SCHOLASTIC_12_SUBJECTS.map((sub) => {
            const isCurrent = (paper.subject || '').includes(sub.replace(' học', '')) || (sub === 'Toán học' && (paper.subject || '').includes('Toán'));
            return (
              <span
                key={sub}
                className={`px-2 py-0.5 rounded-lg text-[10.5px] font-semibold whitespace-nowrap transition-colors shrink-0 ${
                  isCurrent
                    ? 'bg-[#FBF2E1] text-[#2B2331] font-bold border border-[#2B2331]/30 shadow-sm'
                    : 'bg-white/5 text-[#9a978e] border border-white/5'
                }`}
              >
                {sub}
              </span>
            );
          })}
        </div>

        <div className="flex flex-col gap-2.5 my-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
            </div>
          </div>

          <div className="p-2 rounded-xl bg-black/40 border border-white/10 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10.5px] font-mono">
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Đã thuộc: {masteredCount} ({masteredPct}%)
              </span>
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Đang học: {learningCount} ({learningPct}%)
              </span>
              <span className="text-[#ff9b71] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#73324c] border border-[#ff9b71]" />
                Cần ôn gấp: {reviewCount} ({reviewPct}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-[#0b0d12] rounded-full overflow-hidden flex border border-[#f4f1de]/15">
              <div
                className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                style={{ width: `${masteredPct}%` }}
                title={`Đã thuộc: ${masteredCount}`}
              />
              <div
                className="h-full bg-amber-500 transition-all duration-500 ease-out"
                style={{ width: `${learningPct}%` }}
                title={`Đang học: ${learningCount}`}
              />
              <div
                className="h-full bg-[#73324c] transition-all duration-500 ease-out"
                style={{ width: `${reviewPct}%` }}
                title={`Cần ôn gấp: ${reviewCount}`}
              />
            </div>
          </div>
        </div>

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
                  {reviewCount}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
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
            <div
              className="ff-flashcard-perspective relative cursor-pointer select-none touch-pan-y"
              onClick={handleToggleFlip}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                transform: swipeOffset ? `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.07}deg)` : undefined,
                transition: isSwiping ? 'none' : 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
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
              {swipeOffset > 35 && (
                <div className="absolute top-4 right-4 z-40 px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-black text-xs shadow-lg border border-white/40 flex items-center gap-1.5 select-none animate-pulse">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ĐÃ THUỘC (VUỐT PHẢI)</span>
                </div>
              )}
              {swipeOffset < -35 && (
                <div className="absolute top-4 left-4 z-40 px-3 py-1.5 rounded-xl bg-rose-500 text-white font-black text-xs shadow-lg border border-white/40 flex items-center gap-1.5 select-none animate-pulse">
                  <RotateCcw className="w-4 h-4" />
                  <span>CẦN ÔN LẠI (VUỐT TRÁI)</span>
                </div>
              )}
              <div className={`ff-flashcard-inner ${isFlipped ? 'is-flipped' : ''}`}>
                <div className="ff-flashcard-face ff-flashcard-front card-hard rounded-[16px] p-5 sm:p-7">
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

                    <h4 className="text-sm sm:text-base font-bold text-[#FBF2E1] leading-relaxed mt-4">
                      {currentQuestion.question}
                    </h4>

                    {currentQuestion.options && currentQuestion.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pt-3 border-t border-dashed border-[#f4f1de]/10">
                        {currentQuestion.options.map((opt) => (
                          <div
                            key={opt.id}
                            className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-[#d8d5ce] flex items-start gap-2"
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

                <div className="ff-flashcard-face ff-flashcard-back card-hard rounded-[16px] p-5 sm:p-7">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-emerald-600/20 text-emerald-800 dark:text-emerald-300 border border-emerald-600/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Đáp án đúng: {currentQuestion.correctAnswer}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono text-[#2B2331] dark:text-[#f2cc8f] bg-black/5 dark:bg-[#f2cc8f]/15 border border-black/10 dark:border-[#f2cc8f]/30">
                          {currentQuestion.topic}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-[#2B2331] dark:text-[#f2cc8f]">Mặt sau</span>
                    </div>

                    {currentQuestion.keyFormula && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-600/35 text-[#2B2331] dark:text-[#f2cc8f] text-xs font-mono mb-3.5 flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-600 dark:text-[#f2cc8f] shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-[11px] uppercase tracking-wider mb-0.5">
                            Công thức &amp; Định lý cốt lõi:
                          </strong>
                          <span>{currentQuestion.keyFormula}</span>
                        </div>
                      </div>
                    )}

                    <div className="p-3.5 rounded-xl bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 text-xs sm:text-sm text-[#2B2331] dark:text-[#f4f1de] leading-relaxed space-y-1.5">
                      <span className="font-bold text-emerald-700 dark:text-[#81b29a] block text-xs uppercase tracking-wide">
                        Hướng dẫn phương pháp giải:
                      </span>
                      <p className="text-[#3b3240] dark:text-[#dad7d0]">{currentQuestion.explanation}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-dashed border-black/10 dark:border-[#f4f1de]/12 text-xs text-[#2B2331]/70 dark:text-[#9a978e]">
                    <span className="flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-[#81b29a]" />
                      Bấm lại để xem câu hỏi
                    </span>
                    <span className="font-mono text-[11px]">Đã giải nghĩa</span>
                  </div>
                </div>
              </div>
            </div>

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
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <p className="text-sm text-[#9a978e]">
              {filterMode === 'review'
                ? 'Tuyệt vời! Bạn không còn câu hỏi nào cần ôn lại.'
                : 'Chưa có câu hỏi nào trong mục này.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setFilterMode('all');
                setRawIndex(0);
              }}
              className="px-4 py-2 rounded-xl bg-[#f4f1de] text-[#0b0d12] text-xs font-bold"
            >
              Xem tất cả câu hỏi
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
