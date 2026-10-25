/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Brain,
  Check,
  Eye,
  Image as ImageIcon,
  Lightbulb,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { RecallEntry } from '../../utils/qaRecall';
import { splitRecallSolution } from '../../utils/qaRecall';
import type { SubjectTag } from '../../types';
import './QuestionRecallStudio.css';

interface QuestionRecallStudioProps {
  entries: RecallEntry[];
  onClose: () => void;
}

type RecallAssessment = 'solved' | 'understood' | 'revisit';
type StudioPhase = 'select' | 'recall' | 'answer' | 'summary';

const SUBJECT_LABELS: Record<SubjectTag, string> = {
  toan: 'Toán học',
  ly: 'Vật lý',
  hoa: 'Hóa học',
  sinh: 'Sinh học',
  anh: 'Tiếng Anh',
  tin: 'Tin học',
  van: 'Ngữ văn',
  su: 'Sử - Địa',
  hotro: 'Hỗ trợ',
  kinhnghiem: 'Ôn thi',
  share: 'Tài liệu',
  tamsu: 'Tâm sự',
  tamly: 'Tâm lý',
};

const getQuestionImages = (entry: RecallEntry): string[] => {
  const images = [...(entry.question.images ?? [])];
  if (entry.question.imageUrl) images.unshift(entry.question.imageUrl);
  return Array.from(new Set(images.map((image) => image.trim()).filter(Boolean)));
};

const normalizeDeckSearch = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

const ASSESSMENTS: {
  value: RecallAssessment;
  title: string;
  detail: string;
  className: string;
}[] = [
  {
    value: 'solved',
    title: 'Tự giải được',
    detail: 'Em đã tự tìm ra hướng làm.',
    className: 'ff-recall-choice--sage',
  },
  {
    value: 'understood',
    title: 'Hiểu sau khi xem',
    detail: 'Lời giải đã gỡ được chỗ vướng.',
    className: 'ff-recall-choice--brass',
  },
  {
    value: 'revisit',
    title: 'Cần ôn lại',
    detail: 'Đưa câu này vào lượt xem lại.',
    className: 'ff-recall-choice--clay',
  },
];

export default function QuestionRecallStudio({ entries, onClose }: QuestionRecallStudioProps) {
  const startsWithDeckBuilder = entries.length > 1;
  const [candidateEntries] = useState(entries);
  const [sessionEntries, setSessionEntries] = useState<RecallEntry[]>(startsWithDeckBuilder ? [] : entries);
  const [activeEntries, setActiveEntries] = useState<RecallEntry[]>(startsWithDeckBuilder ? [] : entries);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<StudioPhase>(startsWithDeckBuilder ? 'select' : 'recall');
  const [revealedCount, setRevealedCount] = useState(0);
  const [attemptDraft, setAttemptDraft] = useState('');
  const [assessments, setAssessments] = useState<Record<string, RecallAssessment>>({});
  const [isReviewRound, setIsReviewRound] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(
    () => new Set(entries.map((entry) => entry.question.id)),
  );
  const [subjectFilter, setSubjectFilter] = useState<SubjectTag | 'all'>('all');
  const [deckSearch, setDeckSearch] = useState('');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const currentEntry = activeEntries[currentIndex] ?? null;
  const answerParts = useMemo(
    () => (currentEntry ? splitRecallSolution(currentEntry.solution) : []),
    [currentEntry],
  );
  const questionImages = useMemo(
    () => (currentEntry ? getQuestionImages(currentEntry) : []),
    [currentEntry],
  );
  const filteredCandidateEntries = useMemo(() => {
    const normalizedSearch = normalizeDeckSearch(deckSearch.trim());
    return candidateEntries.filter(({ question }) => {
      const matchesSubject = subjectFilter === 'all' || question.subject === subjectFilter;
      const searchableText = normalizeDeckSearch(
        `${question.title} ${question.content} ${SUBJECT_LABELS[question.subject]}`,
      );
      return matchesSubject && (!normalizedSearch || searchableText.includes(normalizedSearch));
    });
  }, [candidateEntries, deckSearch, subjectFilter]);
  const subjectOptions = useMemo(() => {
    const counts = new Map<SubjectTag, number>();
    for (const entry of candidateEntries) {
      counts.set(entry.question.subject, (counts.get(entry.question.subject) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) =>
      SUBJECT_LABELS[a[0]].localeCompare(SUBJECT_LABELS[b[0]], 'vi'),
    );
  }, [candidateEntries]);
  const selectedEntries = useMemo(
    () => candidateEntries.filter((entry) => selectedQuestionIds.has(entry.question.id)),
    [candidateEntries, selectedQuestionIds],
  );
  const reviewEntries = sessionEntries.filter(
    (entry) => assessments[entry.question.id] === 'revisit',
  );
  const summaryCounts = {
    solved: sessionEntries.filter((entry) => assessments[entry.question.id] === 'solved').length,
    understood: sessionEntries.filter((entry) => assessments[entry.question.id] === 'understood').length,
    revisit: reviewEntries.length,
  };

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestionIds((previous) => {
      const next = new Set(previous);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const selectEveryCandidate = () => {
    setSelectedQuestionIds(new Set(candidateEntries.map((entry) => entry.question.id)));
  };

  const selectOnlyFilteredCandidates = () => {
    setSelectedQuestionIds(new Set(filteredCandidateEntries.map((entry) => entry.question.id)));
  };

  const startSelectedSession = () => {
    if (selectedEntries.length === 0) return;
    setSessionEntries(selectedEntries);
    setActiveEntries(selectedEntries);
    setCurrentIndex(0);
    setAttemptDraft('');
    setRevealedCount(0);
    setIsReviewRound(false);
    setPhase('recall');
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeIsInside = panelRef.current?.contains(document.activeElement);
      if (!activeIsInside) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    };
  }, [onClose]);

  const advanceToNextQuestion = () => {
    setAttemptDraft('');
    setRevealedCount(0);
    if (currentIndex < activeEntries.length - 1) {
      setCurrentIndex((index) => index + 1);
      setPhase('recall');
    } else {
      setPhase('summary');
    }
  };

  const recordAssessment = (assessment: RecallAssessment) => {
    if (!currentEntry) return;
    setAssessments((previous) => ({
      ...previous,
      [currentEntry.question.id]: assessment,
    }));
    advanceToNextQuestion();
  };

  const startReviewRound = () => {
    if (reviewEntries.length === 0) return;
    setActiveEntries(reviewEntries);
    setCurrentIndex(0);
    setAttemptDraft('');
    setRevealedCount(0);
    setIsReviewRound(true);
    setPhase('recall');
  };

  const showAllAnswerParts = () => {
    setRevealedCount(answerParts.length);
  };

  const openNextAnswerPart = () => {
    setRevealedCount((count) => Math.min(answerParts.length, count + 1));
  };

  return (
    <div
      className="ff-recall-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ff-recall-title"
      aria-describedby="ff-recall-description"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={panelRef} className="ff-recall-studio" data-phase={phase}>
        <header className="ff-recall-header">
          <div className="ff-recall-brand">
            <span className="ff-recall-brand-mark" aria-hidden="true"><Brain size={19} /></span>
            <span>HỎI ĐÁP · LUYỆN NHỚ</span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="ff-recall-close"
            onClick={onClose}
            aria-label="Đóng phòng luyện nhớ"
            title="Đóng (Esc)"
          >
            <X size={19} />
          </button>
        </header>

        <main className="ff-recall-content">
          <div className="ff-recall-heading">
            <div>
              <p className="ff-recall-kicker">
                {phase === 'select'
                  ? 'SOẠN BỘ ÔN TẬP'
                  : phase === 'summary'
                    ? 'GHI NHẬN CỦA BẠN'
                    : phase === 'answer'
                      ? 'ĐỐI CHIẾU LỜI GIẢI'
                      : isReviewRound
                        ? 'LƯỢT XEM LẠI'
                        : 'THỬ NHỚ TRƯỚC'}
              </p>
              <h2 id="ff-recall-title">
                {phase === 'select'
                  ? 'Chọn câu cho lượt ôn'
                  : phase === 'summary'
                    ? 'Một vòng học có chủ đích'
                    : 'Phòng luyện nhớ'}
              </h2>
              <p id="ff-recall-description">
                {phase === 'select'
                  ? `${candidateEntries.length} câu đã lưu có lời giải phù hợp. Lựa chọn chỉ áp dụng cho phiên này.`
                  : phase === 'summary'
                    ? 'Kết quả chỉ phản ánh lựa chọn của bạn trong phiên này.'
                    : 'Tự thử trước, rồi mở dần lời giải thật từ cộng đồng.'}
              </p>
            </div>
            {phase !== 'summary' && phase !== 'select' && (
              <div className="ff-recall-progress" aria-live="polite" aria-atomic="true">
                <span>{currentIndex + 1}</span>
                <span aria-hidden="true">/</span>
                <span>{activeEntries.length}</span>
                <small>{isReviewRound ? 'ôn lại' : 'câu'}</small>
              </div>
            )}
          </div>

          {phase === 'select' && (
            <section className="ff-recall-deck-builder" aria-labelledby="ff-recall-deck-title">
              <div className="ff-recall-deck-overview">
                <div>
                  <p className="ff-recall-kicker">BỘ NGUỒN CỦA BẠN</p>
                  <h3 id="ff-recall-deck-title">Chọn nội dung muốn ôn</h3>
                  <p>Câu mới lưu xếp trước; mỗi câu có lời giải cộng đồng được đánh dấu tốt nhất.</p>
                </div>
                <div className="ff-recall-deck-overview-counts" aria-label={`${candidateEntries.length} câu hỏi, ${subjectOptions.length} môn học`}>
                  <strong>{candidateEntries.length}</strong>
                  <span>{subjectOptions.length} môn</span>
                </div>
              </div>

              <div className="ff-recall-deck-filters">
                <label className="ff-recall-search" htmlFor="ff-recall-deck-search">
                  <Search size={16} aria-hidden="true" />
                  <input
                    id="ff-recall-deck-search"
                    type="search"
                    value={deckSearch}
                    maxLength={100}
                    onChange={(event) => setDeckSearch(event.target.value)}
                    placeholder="Tìm trong tiêu đề hoặc đề bài…"
                  />
                </label>
                <div className="ff-recall-subject-tabs" role="group" aria-label="Lọc bộ ôn theo môn">
                  <button
                    type="button"
                    aria-pressed={subjectFilter === 'all'}
                    onClick={() => setSubjectFilter('all')}
                  >
                    <span>Tất cả</span><small>{candidateEntries.length}</small>
                  </button>
                  {subjectOptions.map(([subject, count]) => (
                    <button
                      type="button"
                      key={subject}
                      aria-pressed={subjectFilter === subject}
                      onClick={() => setSubjectFilter(subject)}
                    >
                      <span>{SUBJECT_LABELS[subject]}</span><small>{count}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="ff-recall-deck-actions">
                <span>{filteredCandidateEntries.length} đang hiển thị · {selectedEntries.length} đã chọn</span>
                <div>
                  <button
                    type="button"
                    className="ff-recall-deck-text-action"
                    onClick={selectEveryCandidate}
                    disabled={selectedEntries.length === candidateEntries.length}
                  >
                    Chọn cả bộ
                  </button>
                  <button
                    type="button"
                    className="ff-recall-deck-text-action"
                    onClick={selectOnlyFilteredCandidates}
                    disabled={filteredCandidateEntries.length === 0}
                  >
                    Chỉ chọn kết quả
                  </button>
                  <button
                    type="button"
                    className="ff-recall-deck-text-action"
                    onClick={() => setSelectedQuestionIds(new Set<string>())}
                    disabled={selectedEntries.length === 0}
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              {filteredCandidateEntries.length > 0 ? (
                <div className="ff-recall-deck-list" role="group" aria-label="Câu hỏi trong bộ ôn">
                  {filteredCandidateEntries.map((entry) => {
                    const questionId = entry.question.id;
                    const isSelected = selectedQuestionIds.has(questionId);
                    const imageCount = getQuestionImages(entry).length;
                    const excerpt = entry.question.content?.trim().replace(/\s+/g, ' ');
                    return (
                      <button
                        type="button"
                        key={questionId}
                        className={`ff-recall-deck-card ${isSelected ? 'is-selected' : ''}`}
                        aria-pressed={isSelected}
                        aria-label={`${isSelected ? 'Bỏ chọn' : 'Chọn'} câu hỏi: ${entry.question.title}`}
                        onClick={() => toggleQuestionSelection(questionId)}
                      >
                        <span className="ff-recall-deck-check" aria-hidden="true">
                          {isSelected && <Check size={15} />}
                        </span>
                        <span className="ff-recall-deck-card-copy">
                          <span className="ff-recall-deck-card-meta">
                            <span className="ff-recall-subject">{SUBJECT_LABELS[entry.question.subject]}</span>
                            <span>Lời giải được chọn</span>
                          </span>
                          <strong>{entry.question.title}</strong>
                          {excerpt && <span className="ff-recall-deck-excerpt">{excerpt}</span>}
                          <span className="ff-recall-deck-card-footer">
                            <span>Lời giải từ {entry.solution.authorName || 'thành viên'}</span>
                            {imageCount > 0 && (
                              <span className="ff-recall-deck-image-count">
                                <ImageIcon size={13} aria-hidden="true" /> {imageCount} ảnh
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="ff-recall-empty-state" role="status">
                  Không tìm thấy câu hỏi phù hợp. Thử đổi từ khóa hoặc môn học.
                </div>
              )}
            </section>
          )}

          {phase !== 'summary' && phase !== 'select' && currentEntry && (
            <>
              <div className="ff-recall-question-meta">
                <span className="ff-recall-subject">{SUBJECT_LABELS[currentEntry.question.subject]}</span>
                <span className="ff-recall-saved-note">Câu hỏi đã có lời giải được chọn</span>
              </div>

              <article className="ff-recall-question" aria-label="Đề bài">
                <h3>{currentEntry.question.title}</h3>
                {currentEntry.question.content?.trim() && (
                  <p className="ff-recall-question-copy">{currentEntry.question.content}</p>
                )}
                {questionImages.length > 0 && (
                  <div className="ff-recall-images" aria-label="Ảnh đề bài đính kèm">
                    {questionImages.map((url, index) => (
                      <img
                        key={`${index}-${url.slice(0, 32)}`}
                        src={url}
                        alt={`Ảnh đề bài ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                      />
                    ))}
                  </div>
                )}
              </article>

              {phase === 'recall' ? (
                <section className="ff-recall-attempt" aria-labelledby="ff-recall-attempt-title">
                  <div className="ff-recall-section-title">
                    <Lightbulb size={17} aria-hidden="true" />
                    <h3 id="ff-recall-attempt-title">Em sẽ bắt đầu từ đâu?</h3>
                  </div>
                  <p className="ff-recall-instruction">
                    Thử tự giải trong đầu hoặc ghi vài ý bên dưới trước khi mở lời giải.
                  </p>
                  <label className="ff-recall-scratch-label" htmlFor="ff-recall-scratch">
                    Bản nháp riêng của em <span>(không bắt buộc)</span>
                  </label>
                  <textarea
                    id="ff-recall-scratch"
                    value={attemptDraft}
                    onChange={(event) => setAttemptDraft(event.target.value)}
                    maxLength={2000}
                    rows={4}
                    placeholder="Ghi hướng làm, công thức hoặc điều em đang phân vân…"
                  />
                  <div className="ff-recall-attempt-footer">
                    <span><ShieldCheck size={14} aria-hidden="true" /> Chỉ nằm trong phiên này; không gửi đi hay lưu lại.</span>
                    <button
                      type="button"
                      className="ff-recall-primary"
                      onClick={() => setPhase('answer')}
                    >
                      <span>Tôi đã thử — mở lời giải</span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                </section>
              ) : (
                <section className="ff-recall-answer" aria-labelledby="ff-recall-answer-title">
                  <div className="ff-recall-answer-heading">
                    <div>
                      <p className="ff-recall-kicker">NGUỒN CỘNG ĐỒNG</p>
                      <h3 id="ff-recall-answer-title">Lời giải được đánh dấu tốt nhất</h3>
                    </div>
                    <span className="ff-recall-author">{currentEntry.solution.authorName || 'Thành viên'}</span>
                  </div>
                  {attemptDraft.trim() && (
                    <div className="ff-recall-draft-compare">
                      <span>Bản nháp của em</span>
                      <p>{attemptDraft}</p>
                    </div>
                  )}
                  <div className="ff-recall-source-note">
                    Lời giải lấy từ bài trả lời đã đăng; F-Forum không sinh hay diễn giải lại nội dung trong phiên này.
                  </div>
                  <div className="ff-recall-parts" aria-live="polite" aria-relevant="additions text">
                    {answerParts.slice(0, revealedCount).map((part, index) => (
                      part.type === 'text' ? (
                        <p className="ff-recall-answer-copy" key={`text-${index}`}>
                          <span className="ff-recall-part-index">{index + 1}</span>
                          {part.content}
                        </p>
                      ) : (
                        <figure className="ff-recall-answer-image" key={`image-${index}`}>
                          <img src={part.url} alt="Ảnh lời giải do thành viên đính kèm" loading="lazy" decoding="async" />
                          <figcaption>Ảnh lời giải · phần {index + 1}</figcaption>
                        </figure>
                      )
                    ))}
                    {revealedCount === 0 && (
                      <div className="ff-recall-covered-answer">
                        <Eye size={18} aria-hidden="true" />
                        <span>Lời giải đang được giữ lại cho đến khi em sẵn sàng.</span>
                      </div>
                    )}
                  </div>

                  {revealedCount < answerParts.length ? (
                    <div className="ff-recall-reveal-actions">
                      <span aria-live="polite">Phần {revealedCount + 1} / {answerParts.length}</span>
                      <div>
                        {answerParts.length > 1 && revealedCount > 0 && (
                          <button type="button" className="ff-recall-secondary" onClick={showAllAnswerParts}>
                            Mở toàn bộ
                          </button>
                        )}
                        <button type="button" className="ff-recall-primary" onClick={openNextAnswerPart}>
                          <Eye size={16} aria-hidden="true" />
                          <span>
                            {revealedCount === 0
                              ? answerParts[0]?.type === 'image' ? 'Mở ảnh lời giải' : 'Mở lời giải'
                              : answerParts[revealedCount]?.type === 'image' ? 'Mở ảnh tiếp theo' : 'Mở phần tiếp'}
                          </span>
                          <ArrowRight size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="ff-recall-self-check">
                      <div>
                        <h4>Em tự đánh giá thế nào?</h4>
                        <p>Không có điểm số — chọn điều mô tả đúng nhất với em.</p>
                      </div>
                      <div className="ff-recall-choices">
                        {ASSESSMENTS.map((assessment) => (
                          <button
                            type="button"
                            key={assessment.value}
                            className={`ff-recall-choice ${assessment.className}`}
                            onClick={() => recordAssessment(assessment.value)}
                          >
                            <span className="ff-recall-choice-title">
                              {assessment.value === 'solved' ? <Check size={16} aria-hidden="true" /> : null}
                              {assessment.title}
                            </span>
                            <span className="ff-recall-choice-detail">{assessment.detail}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          {phase === 'summary' && (
            <section className="ff-recall-summary" aria-label="Tổng kết tự đánh giá">
              <div className="ff-recall-summary-lead">
                <span className="ff-recall-summary-icon"><Check size={21} aria-hidden="true" /></span>
                <div>
                  <h3>Đã luyện qua {sessionEntries.length} câu.</h3>
                  <p>Đây là tự đánh giá của bạn, không phải điểm hay thống kê cộng đồng.</p>
                </div>
              </div>
              <div className="ff-recall-summary-counts">
                <div><strong>{summaryCounts.solved}</strong><span>Tự giải được</span></div>
                <div><strong>{summaryCounts.understood}</strong><span>Hiểu sau khi xem</span></div>
                <div><strong>{summaryCounts.revisit}</strong><span>Cần ôn lại</span></div>
              </div>
              <div className="ff-recall-privacy-note">
                <ShieldCheck size={16} aria-hidden="true" />
                <span>Lượt tự đánh giá và bản nháp chỉ tồn tại trong bộ nhớ của phiên này.</span>
              </div>
              <div className="ff-recall-summary-actions">
                {reviewEntries.length > 0 && (
                  <button type="button" className="ff-recall-secondary" onClick={startReviewRound}>
                    <RotateCcw size={15} aria-hidden="true" />
                    <span>Ôn lại {reviewEntries.length} câu cần xem</span>
                  </button>
                )}
                <button type="button" className="ff-recall-primary" onClick={onClose}>
                  <span>Kết thúc phiên</span>
                  <Check size={16} aria-hidden="true" />
                </button>
              </div>
            </section>
          )}
        </main>

        {phase === 'select' && (
          <footer className="ff-recall-footer ff-recall-deck-footer">
            <div className="ff-recall-selection-total" aria-live="polite" aria-atomic="true">
              <strong>{selectedEntries.length}</strong>
              <span>/ {candidateEntries.length} câu được chọn · không lưu bộ chọn này</span>
            </div>
            <div className="ff-recall-deck-footer-actions">
              <button type="button" className="ff-recall-secondary" onClick={onClose}>Đóng</button>
              <button
                type="button"
                className="ff-recall-primary"
                onClick={startSelectedSession}
                disabled={selectedEntries.length === 0}
              >
                <span>{selectedEntries.length > 0 ? `Bắt đầu ${selectedEntries.length} câu` : 'Chọn câu luyện'}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </footer>
        )}
        {phase !== 'summary' && phase !== 'select' && currentEntry && (
          <footer className="ff-recall-footer">
            <span><span className="ff-recall-footer-dot" aria-hidden="true" /> Nguồn: lời giải cộng đồng</span>
            <span>{isReviewRound ? 'Lượt ôn lại' : `${sessionEntries.length} câu trong phiên`}</span>
          </footer>
        )}
      </div>
    </div>
  );
}
