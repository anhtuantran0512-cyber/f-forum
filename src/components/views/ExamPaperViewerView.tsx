/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  Heart,
  LoaderCircle,
  MapPin,
  Moon,
  Printer,
  School,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
} from 'lucide-react';
import type { ExamAttachment, ExamPaper, User } from '../../types';
import { SEED_EXAMS } from '../exam/seedExamPapers';
import { ExamFlashcardModal } from '../exam/ExamFlashcardModal';
import { safeStorage } from '../../utils/storage';
import { toggleThemeMode } from '../../utils/theme';
import { authHeaders } from '../../utils/session';
import { formatExamFileSize } from '../../utils/examAttachments';
import {
  downloadExamAttachment,
  examAttachmentUrl,
  fetchExamInteractions,
  fetchExamSubmissions,
  rateExamPaper,
  setExamLike,
  submitExamReview,
} from '../../utils/examSubmissionApi';
import type { ExamInteractionSnapshot } from '../../types';
import './ExamPaperViewerView.css';

const SAVED_EXAMS_KEY = 'fforum_saved_exams';
const EMPTY_ATTACHMENTS: ExamAttachment[] = [];

const currentPaperId = (): string => {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return (params.get('paper') || params.get('id') || '').trim();
};

const attachmentIconLabel = (format: ExamAttachment['format']): string => {
  switch (format) {
    case 'PDF': return 'PDF';
    case 'DOCX': return 'Word';
    case 'DOC': return 'Word';
    case 'IMAGE': return 'Ảnh';
    case 'MD': return 'Markdown';
  }
};

const readSavedExamIds = (): string[] => {
  try {
    const saved = safeStorage.getItem(SAVED_EXAMS_KEY);
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

interface ExamPaperViewerViewProps {
  currentUser: User | null;
  onBack: () => void;
  onOpenLoginModal?: () => void;
}

export const ExamPaperViewerView: React.FC<ExamPaperViewerViewProps> = ({
  currentUser,
  onBack,
  onOpenLoginModal,
}) => {
  const paperId = currentPaperId();
  const seedPaper = useMemo(() => SEED_EXAMS.find((item) => item.id === paperId) || null, [paperId]);
  const [paper, setPaper] = useState<ExamPaper | null>(seedPaper);
  const [isLoading, setIsLoading] = useState(Boolean(paperId && !seedPaper));
  const [loadError, setLoadError] = useState(paperId ? '' : 'Không tìm thấy mã đề thi trong đường dẫn.');
  const [selectedAttachmentId, setSelectedAttachmentId] = useState('');
  const [privateAttachment, setPrivateAttachment] = useState<{ key: string; url: string } | null>(null);
  const [markdownData, setMarkdownData] = useState<{ key: string; text: string; error: string } | null>(null);
  const [isSolutionsOpen, setIsSolutionsOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('light'),
  );
  const [interactionState, setInteractionState] = useState<{
    key: string;
    snapshot: ExamInteractionSnapshot | null;
    loading: boolean;
    error: boolean;
  }>({ key: '', snapshot: null, loading: false, error: false });
  const [selectedRating, setSelectedRating] = useState(5);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [pendingAction, setPendingAction] = useState<'like' | 'rating' | 'review' | 'download' | null>(null);
  const [toast, setToast] = useState('');
  const [savedPaperIds, setSavedPaperIds] = useState<string[]>(readSavedExamIds);
  const [isFlashcardOpen, setIsFlashcardOpen] = useState(false);
  const requestLockRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLightMode(document.documentElement.classList.contains('light'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!paperId) return;
    let isCurrent = true;

    fetchExamSubmissions()
      .then(({ submissions, approvedSubmissions }) => {
        if (!isCurrent) return;
        const serverPaper = [
          ...approvedSubmissions,
          ...submissions,
        ].find((item) => item.id === paperId);
        if (serverPaper) {
          setPaper(serverPaper);
          setLoadError('');
        } else if (!seedPaper) {
          setPaper(null);
          setLoadError('Đề thi không tồn tại, chưa được công khai hoặc bạn không có quyền xem.');
        }
      })
      .catch((error: unknown) => {
        if (!isCurrent || seedPaper) return;
        setPaper(null);
        setLoadError(error instanceof Error ? error.message : 'Không thể tải đề thi. Vui lòng thử lại.');
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => { isCurrent = false; };
  }, [paperId, seedPaper]);

  const attachments = paper?.attachments ?? EMPTY_ATTACHMENTS;
  const selectedAttachment = attachments.find((item) => item.id === selectedAttachmentId) || attachments[0] || null;
  const isPublicPaper = Boolean(paper && (!paper.status || paper.status === 'approved'));
  const isPrivatePaper = Boolean(paper?.status && paper.status !== 'approved');
  const isSaved = Boolean(paper && savedPaperIds.includes(paper.id));
  const activePaperId = paper?.id || '';
  const attachmentKey = `${activePaperId}:${paper?.status || 'approved'}:${selectedAttachment?.id || ''}`;
  const interactionKey = `${activePaperId}:${paper?.status || 'approved'}`;
  const interaction = isPublicPaper && interactionState.key === interactionKey ? interactionState.snapshot : null;
  const interactionLoading = isPublicPaper && (
    interactionState.key !== interactionKey || interactionState.loading
  );
  const interactionError = isPublicPaper && interactionState.key === interactionKey && interactionState.error;
  const markdownContent = markdownData?.key === attachmentKey ? markdownData.text : '';
  const markdownError = markdownData?.key === attachmentKey ? markdownData.error : '';
  const privateAttachmentUrl = privateAttachment?.key === attachmentKey ? privateAttachment.url : '';
  const attachmentRequestUrl = useMemo(() => {
    if (!activePaperId || !selectedAttachment) return '';
    try {
      return examAttachmentUrl(activePaperId, selectedAttachment, true);
    } catch {
      return '';
    }
  }, [activePaperId, selectedAttachment]);
  const attachmentInlineUrl = isPrivatePaper && (selectedAttachment?.format === 'PDF' || selectedAttachment?.format === 'IMAGE')
    ? privateAttachmentUrl
    : attachmentRequestUrl;

  useEffect(() => {
    if (
      !isPrivatePaper ||
      !selectedAttachment ||
      !['PDF', 'IMAGE'].includes(selectedAttachment.format) ||
      !attachmentRequestUrl
    ) return;
    const controller = new AbortController();
    let objectUrl = '';
    fetch(attachmentRequestUrl, {
      headers: authHeaders(),
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.message || 'Bạn không có quyền xem tệp này.');
        }
        return response.blob();
      })
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setPrivateAttachment({ key: attachmentKey, url: objectUrl });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : 'Không thể tải tệp riêng tư.');
        }
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isPrivatePaper, selectedAttachment, attachmentRequestUrl, attachmentKey]);

  useEffect(() => {
    if (!activePaperId || !selectedAttachment || selectedAttachment.format !== 'MD' || !attachmentRequestUrl) return;
    const controller = new AbortController();
    fetch(attachmentRequestUrl, {
      headers: authHeaders(),
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.message || 'Không thể tải nội dung Markdown.');
        }
        return response.text();
      })
      .then((text) => setMarkdownData({ key: attachmentKey, text, error: '' }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setMarkdownData({
          key: attachmentKey,
          text: '',
          error: error instanceof Error ? error.message : 'Không thể hiển thị nội dung Markdown.',
        });
      });

    return () => controller.abort();
  }, [activePaperId, selectedAttachment, attachmentRequestUrl, attachmentKey]);

  useEffect(() => {
    if (!activePaperId || !isPublicPaper) return;
    let isCurrent = true;
    fetchExamInteractions()
      .then((snapshots) => {
        if (isCurrent) {
          setInteractionState({
            key: interactionKey,
            snapshot: snapshots[activePaperId] || null,
            loading: false,
            error: false,
          });
        }
      })
      .catch(() => {
        if (isCurrent) {
          setInteractionState({ key: interactionKey, snapshot: null, loading: false, error: true });
        }
      });
    return () => { isCurrent = false; };
  }, [activePaperId, isPublicPaper, interactionKey]);

  useEffect(() => () => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 3200);
  }, []);

  const requireLogin = useCallback(() => {
    if (currentUser?.id || currentUser?.email) return true;
    onOpenLoginModal?.();
    showToast('Đăng nhập để tham gia hoạt động cộng đồng.');
    return false;
  }, [currentUser?.id, currentUser?.email, onOpenLoginModal, showToast]);

  const runInteraction = useCallback(async (
    action: 'like' | 'rating' | 'review',
    operation: () => Promise<ExamInteractionSnapshot>,
    successMessage: string,
  ) => {
    if (!paper || !isPublicPaper || requestLockRef.current) return;
    if (!requireLogin()) return;
    if (interactionError || !interaction) {
      showToast('Hoạt động cộng đồng hiện chưa khả dụng.');
      return;
    }
    requestLockRef.current = true;
    setPendingAction(action);
    try {
      const nextInteraction = await operation();
      setInteractionState({ key: interactionKey, snapshot: nextInteraction, loading: false, error: false });
      if (action === 'review') setReviewText('');
      showToast(successMessage);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể hoàn tất thao tác. Vui lòng thử lại.');
    } finally {
      requestLockRef.current = false;
      setPendingAction(null);
    }
  }, [paper, isPublicPaper, interactionKey, requireLogin, interactionError, interaction, showToast]);

  const handleLike = useCallback(() => {
    if (!paper) return;
    void runInteraction(
      'like',
      () => setExamLike(paper.id, !(interaction?.likedByUser ?? false)),
      interaction?.likedByUser ? 'Đã bỏ yêu thích.' : 'Đã thêm vào yêu thích cộng đồng.',
    );
  }, [paper, runInteraction, interaction?.likedByUser]);

  const handleRate = useCallback((rating: number) => {
    if (!paper) return;
    setSelectedRating(rating);
    void runInteraction('rating', () => rateExamPaper(paper.id, rating), 'Đã cập nhật đánh giá của bạn.');
  }, [paper, runInteraction]);

  const handleReviewSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    const content = reviewText.trim();
    if (!paper || !content) return;
    void runInteraction(
      'review',
      () => submitExamReview(paper.id, content, reviewRating),
      'Nhận xét đã được gửi. Cảm ơn bạn đã chia sẻ!',
    );
  }, [paper, reviewText, reviewRating, runInteraction]);

  const handleDownload = useCallback(async () => {
    if (!paper || !selectedAttachment || pendingAction === 'download') return;
    try {
      setPendingAction('download');
      await downloadExamAttachment(paper.id, selectedAttachment);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể tải tệp đính kèm.');
    } finally {
      setPendingAction(null);
    }
  }, [paper, selectedAttachment, pendingAction, showToast]);

  const handleToggleBookmark = useCallback(() => {
    if (!paper) return;
    const next = savedPaperIds.includes(paper.id)
      ? savedPaperIds.filter((id) => id !== paper.id)
      : [...savedPaperIds, paper.id];
    setSavedPaperIds(next);
    safeStorage.setItem(SAVED_EXAMS_KEY, JSON.stringify(next));
    showToast(next.includes(paper.id) ? 'Đã lưu đề vào kho cá nhân.' : 'Đã bỏ lưu đề.');
  }, [paper, savedPaperIds, showToast]);

  const handlePrint = useCallback(() => {
    const frame = document.querySelector<HTMLIFrameElement>('.ff-paper-pdf-frame');
    if (selectedAttachment?.format === 'PDF' && frame?.contentWindow) {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      return;
    }
    window.print();
  }, [selectedAttachment?.format]);

  if (isLoading && !paper) {
    return (
      <div className="ff-paper-viewer ff-paper-viewer--loading" aria-live="polite">
        <LoaderCircle className="h-7 w-7 animate-spin" aria-hidden="true" />
        <p>Đang tải đề thi…</p>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="ff-paper-viewer ff-paper-viewer--empty">
        <div className="ff-paper-empty-card space-y-3">
          <div className="ff-paper-empty-icon"><AlertCircle size={24} /></div>
          <h1 className="flex items-center justify-center gap-1.5 text-base sm:text-lg font-bold text-[#f4f1de]">
            <span className="ff-swash-cap text-base">K</span>hông thể mở đề thi
          </h1>
          <p className="text-xs text-[#a39f96] leading-relaxed max-w-sm mx-auto">
            {loadError || 'Liên kết có thể đã hết hạn hoặc đề chưa được công khai.'}
          </p>
          <div className="pt-2">
            <button type="button" className="ff-ui-button ff-ui-button--primary" onClick={onBack}>
              <ArrowLeft size={16} /> Quay lại Kho đề thi
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isAttachmentPending = paper.status === 'pending';
  const format = selectedAttachment?.format;
  const ratingCount = interaction?.ratingCount ?? 0;
  const averageRating = interaction?.averageRating;

  return (
    <div className="ff-paper-viewer">
      <header className="ff-paper-viewer__topbar">
        <div className="ff-paper-viewer__brand">
          <button type="button" className="ff-paper-viewer__back" onClick={onBack}>
            <ArrowLeft size={17} aria-hidden="true" />
            <span>Kho đề thi</span>
          </button>
          <span className="ff-paper-viewer__divider" aria-hidden="true">/</span>
          <span className="ff-paper-viewer__brand-label flex items-center gap-1.5"><BookOpen size={16} /> <span><span className="ff-swash-cap text-sm">F</span>-Forum Học tập</span></span>
        </div>
        <div className="ff-paper-viewer__top-actions">
          <button
            type="button"
            className="ff-ui-button ff-ui-button--secondary ff-ui-button--icon"
            onClick={toggleThemeMode}
            aria-label={isLightMode ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
            title={isLightMode ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
          >
            {isLightMode ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          <button
            type="button"
            className="ff-ui-button ff-ui-button--secondary ff-ui-button--icon"
            onClick={() => setIsFlashcardOpen(true)}
            aria-label="Mở thẻ ghi nhớ ôn tập nhanh"
            title="Thẻ ghi nhớ & Ôn tập nhanh"
          >
            <Sparkles size={17} />
          </button>
          <button
            type="button"
            className="ff-ui-button ff-ui-button--secondary ff-ui-button--icon"
            onClick={handleToggleBookmark}
            aria-pressed={isSaved}
            aria-label={isSaved ? 'Bỏ lưu đề thi' : 'Lưu đề thi'}
            title={isSaved ? 'Đã lưu đề thi' : 'Lưu đề thi'}
          >
            {isSaved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
          </button>
          {selectedAttachment && (
            <button
              type="button"
              className="ff-ui-button ff-ui-button--primary ff-paper-viewer__download"
              onClick={() => void handleDownload()}
              disabled={pendingAction === 'download'}
            >
              {pendingAction === 'download' ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}
              <span>{pendingAction === 'download' ? 'Đang tải…' : 'Tải tệp'}</span>
            </button>
          )}
        </div>
      </header>

      <div className="ff-paper-viewer__main">
        <section className="ff-paper-viewer__intro ff-ui-card" aria-labelledby="ff-paper-title">
          <div className="ff-paper-viewer__intro-top">
            <div className="ff-paper-viewer__badges">
              <span className="ff-paper-viewer__subject">{paper.subject}</span>
              <span className="ff-paper-viewer__tag">Lớp {paper.grade}</span>
              <span className="ff-paper-viewer__tag">{paper.examType}</span>
              {paper.verified && <span className="ff-paper-viewer__verified"><ShieldCheck size={14} /> Đã kiểm duyệt</span>}
              {isAttachmentPending && <span className="ff-paper-viewer__pending">Đang chờ duyệt</span>}
              <span className="ff-atelier-ribbon !py-0.2 !px-1.5 !text-[8.5px]">Đọc kỹ, nhớ lâu.</span>
            </div>
            <div className="ff-paper-viewer__intro-actions">
              {isPublicPaper && (
                <button
                  type="button"
                  className={`ff-paper-like ${interaction?.likedByUser ? 'is-liked' : ''}`}
                  onClick={handleLike}
                  disabled={pendingAction === 'like' || !interaction || interactionError}
                  aria-pressed={interaction?.likedByUser ?? false}
                  aria-label={interaction?.likedByUser ? 'Bỏ yêu thích' : 'Yêu thích đề thi'}
                >
                  {pendingAction === 'like' ? <LoaderCircle size={16} className="animate-spin" /> : <Heart size={16} fill={interaction?.likedByUser ? 'currentColor' : 'none'} />}
                  <span>{interaction ? interaction.likeCount : '—'}</span>
                </button>
              )}
            </div>
          </div>
          <h1 id="ff-paper-title">{paper.title}</h1>
          <div className="ff-paper-viewer__meta">
            <span><School size={15} /> {paper.school || 'Chưa có thông tin trường'}</span>
            <span><MapPin size={15} /> {paper.province || 'Toàn quốc'}</span>
            <span><CalendarDays size={15} /> {paper.schoolYear || 'Chưa cập nhật năm học'}</span>
            {paper.duration && <span><CheckCircle2 size={15} /> {paper.duration} phút</span>}
          </div>
          {paper.summary && <p className="ff-paper-viewer__summary">{paper.summary}</p>}
          {loadError && <p className="ff-paper-viewer__inline-warning"><AlertCircle size={14} /> {loadError}</p>}
        </section>

        <div className="ff-paper-viewer__layout">
          <section className="ff-paper-document ff-ui-card" aria-label="Nội dung đề thi">
            <div className="ff-paper-document__toolbar">
              <div className="ff-paper-document__heading">
                <div className="ff-paper-document__icon"><FileText size={18} /></div>
                <div className="ff-paper-document__file-label">
                  <strong>{selectedAttachment?.name || 'Nội dung đề thi'}</strong>
                  <span>
                    {selectedAttachment
                      ? `${attachmentIconLabel(selectedAttachment.format)}${selectedAttachment.size ? ` · ${formatExamFileSize(selectedAttachment.size)}` : ''}`
                      : 'Bản đọc trực tuyến'}
                  </span>
                </div>
              </div>
              <div className="ff-paper-document__toolbar-actions">
                {attachments.length > 1 && (
                  <label className="ff-paper-file-select">
                    <span className="sr-only">Chọn tệp đề</span>
                    <select
                      value={selectedAttachment?.id || ''}
                      onChange={(event) => setSelectedAttachmentId(event.target.value)}
                    >
                      {attachments.map((attachment) => (
                        <option key={attachment.id} value={attachment.id}>{attachment.name}</option>
                      ))}
                    </select>
                  </label>
                )}
                {(selectedAttachment || paper.sampleQuestions?.length) && (
                  <button type="button" className="ff-ui-button ff-ui-button--secondary ff-ui-button--icon" onClick={handlePrint} aria-label="In đề thi" title="In đề thi">
                    <Printer size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="ff-paper-document__canvas">
              {!selectedAttachment ? (
                <div className="ff-paper-sample">
                  <div className="ff-paper-sample__label"><BookOpen size={15} /> Bản xem nội dung</div>
                  {paper.sampleQuestions?.length ? (
                    <ol className="ff-paper-sample__questions">
                      {paper.sampleQuestions.map((question, index) => <li key={`${paper.id}-question-${index}`}>{question}</li>)}
                    </ol>
                  ) : (
                    <p className="ff-paper-sample__empty">Đề này chưa có tệp đính kèm hoặc nội dung mẫu để đọc trực tuyến.</p>
                  )}
                  {paper.sampleSolutions?.length ? (
                    <div className="ff-paper-solutions">
                      <button type="button" className="ff-paper-solutions__toggle" onClick={() => setIsSolutionsOpen((open) => !open)} aria-expanded={isSolutionsOpen}>
                        {isSolutionsOpen ? 'Ẩn lời giải tham khảo' : `Xem lời giải tham khảo (${paper.sampleSolutions.length})`}
                      </button>
                      {isSolutionsOpen && (
                        <div className="ff-paper-solutions__list">
                          {paper.sampleSolutions.map((solution) => (
                            <article key={`${paper.id}-solution-${solution.questionNumber}`} className="ff-paper-solution">
                              <h3>Câu {solution.questionNumber}</h3>
                              <p className="ff-paper-solution__question">{solution.question}</p>
                              <p>{solution.solution}</p>
                              {solution.keyFormula && <p className="ff-paper-solution__formula">Công thức: {solution.keyFormula}</p>}
                              {solution.tips && <p className="ff-paper-solution__tip">Mẹo: {solution.tips}</p>}
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : format === 'PDF' ? (
                attachmentInlineUrl
                  ? <iframe className="ff-paper-pdf-frame" src={attachmentInlineUrl} title={`Đọc đề thi: ${selectedAttachment.name}`} />
                  : <div className="ff-paper-docx-fallback"><LoaderCircle size={20} className="animate-spin" /><p>{loadError || 'Đang tải tệp PDF…'}</p></div>
              ) : format === 'IMAGE' ? (
                attachmentInlineUrl
                  ? <a className="ff-paper-image-frame" href={attachmentInlineUrl} target="_blank" rel="noreferrer" aria-label={`Mở ảnh ${selectedAttachment.name} ở kích thước đầy đủ`}>
                      <img src={attachmentInlineUrl} alt={`Trang đề thi: ${selectedAttachment.name}`} loading="lazy" />
                    </a>
                  : <div className="ff-paper-docx-fallback"><LoaderCircle size={20} className="animate-spin" /><p>{loadError || 'Đang tải ảnh…'}</p></div>
              ) : format === 'MD' ? (
                <div className="ff-paper-markdown-frame">
                  {markdownError ? <p className="ff-paper-sample__empty"><AlertCircle size={16} /> {markdownError}</p> : markdownContent ? <pre>{markdownContent}</pre> : <p>Đang tải nội dung…</p>}
                </div>
              ) : (
                <div className="ff-paper-docx-fallback">
                  <div className="ff-paper-docx-fallback__icon"><FileText size={30} /></div>
                  <h2>Không thể xem trực tiếp tệp Word trong trình duyệt</h2>
                  <p>Tải tệp xuống để mở bằng Word, Google Docs hoặc ứng dụng đọc tài liệu khác.</p>
                  <button type="button" className="ff-ui-button ff-ui-button--primary" onClick={() => void handleDownload()} disabled={pendingAction === 'download'}>
                    <Download size={16} /> Tải {selectedAttachment?.format === 'DOC' ? 'DOC' : 'DOCX'}
                  </button>
                </div>
              )}
            </div>
          </section>

          <aside className="ff-paper-sidebar">
            <section className="ff-paper-side-card ff-ui-card">
              <h2>Thông tin đề</h2>
              <dl className="ff-paper-facts">
                <div><dt>Người gửi</dt><dd>{paper.uploader?.name || 'Thành viên F-Forum'}</dd></div>
                <div><dt>Mức độ</dt><dd>{paper.difficulty || 'Chưa phân loại'}</dd></div>
                <div><dt>Đáp án</dt><dd>{paper.hasAnswer ? 'Có lời giải' : 'Chưa có lời giải'}</dd></div>
                <div><dt>Tệp gốc</dt><dd>{attachments.length ? `${attachments.length} tệp` : 'Không có tệp đính kèm'}</dd></div>
              </dl>
              {selectedAttachment && (
                <button type="button" className="ff-ui-button ff-ui-button--primary ff-paper-side-download" onClick={() => void handleDownload()} disabled={pendingAction === 'download'}>
                  <Download size={16} /> Tải tệp gốc
                </button>
              )}
            </section>

            {isPublicPaper && (
              <section className="ff-paper-side-card ff-ui-card" aria-labelledby="ff-paper-community-title">
                <div className="ff-paper-community__heading">
                  <div>
                    <span className="ff-paper-eyebrow">Cộng đồng</span>
                    <h2 id="ff-paper-community-title">Đánh giá &amp; nhận xét</h2>
                  </div>
                  {interactionLoading ? <LoaderCircle size={17} className="animate-spin" aria-label="Đang tải đánh giá" /> : null}
                </div>
                {interactionError ? (
                  <p className="ff-paper-community__empty"><AlertCircle size={15} /> Hoạt động cộng đồng hiện chưa khả dụng.</p>
                ) : (
                  <>
                    <div className="ff-paper-rating-summary">
                      <strong>{averageRating === null || averageRating === undefined ? '—' : averageRating.toFixed(1)}</strong>
                      <div>
                        <div className="ff-paper-stars" aria-label={ratingCount ? `${averageRating?.toFixed(1)} trên 5 sao` : 'Chưa có đánh giá'}>
                          {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={14} fill={star <= Math.round(averageRating || 0) ? 'currentColor' : 'none'} />)}
                        </div>
                        <span>{ratingCount ? `${ratingCount} đánh giá` : interaction ? 'Chưa có đánh giá' : 'Đang tải…'}</span>
                      </div>
                    </div>
                    <div className="ff-paper-rate-control" aria-label="Đánh giá đề thi">
                      <span>Đánh giá của bạn</span>
                      <div>
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            type="button"
                            onClick={() => handleRate(rating)}
                            disabled={pendingAction !== null || !interaction}
                            aria-label={`${rating} sao`}
                            aria-pressed={interaction?.userRating === rating || selectedRating === rating}
                          >
                            <Star size={17} fill={rating <= (interaction?.userRating || selectedRating) ? 'currentColor' : 'none'} />
                          </button>
                        ))}
                      </div>
                    </div>
                    {interaction?.hasReviewed ? (
                      <p className="ff-paper-community__empty"><CheckCircle2 size={15} /> Bạn đã gửi nhận xét cho đề này.</p>
                    ) : (
                      <form className="ff-paper-review-form" onSubmit={handleReviewSubmit}>
                        <div className="ff-paper-rate-control ff-paper-review-rating">
                          <span>Điểm cho nhận xét</span>
                          <div>
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <button
                                key={rating}
                                type="button"
                                onClick={() => setReviewRating(rating)}
                                aria-label={`${rating} sao cho nhận xét`}
                                aria-pressed={reviewRating === rating}
                              >
                                <Star size={15} fill={rating <= reviewRating ? 'currentColor' : 'none'} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <label htmlFor="ff-paper-review">Chia sẻ góp ý hữu ích</label>
                        <textarea
                          id="ff-paper-review"
                          value={reviewText}
                          onChange={(event) => setReviewText(event.target.value)}
                          maxLength={1000}
                          rows={3}
                          placeholder="Độ khó, lời giải, hoặc phần cần lưu ý…"
                        />
                        <div className="ff-paper-review-form__bottom">
                          <span>{reviewText.length}/1000</span>
                          <button type="submit" className="ff-ui-button ff-ui-button--secondary" disabled={!reviewText.trim() || pendingAction !== null || !interaction}>
                            {pendingAction === 'review' ? <LoaderCircle size={14} className="animate-spin" /> : null}
                            Gửi nhận xét
                          </button>
                        </div>
                      </form>
                    )}
                    {interaction?.reviews.length ? (
                      <div className="ff-paper-reviews">
                        {interaction.reviews.slice(0, 5).map((review) => (
                          <article key={review.id} className="ff-paper-review">
                            <div><strong>{review.authorName}</strong><span>{review.date}</span></div>
                            <div className="ff-paper-stars" aria-label={`${review.rating} sao`}>
                              {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={11} fill={star <= review.rating ? 'currentColor' : 'none'} />)}
                            </div>
                            <p>{review.content}</p>
                          </article>
                        ))}
                      </div>
                    ) : interaction && !interactionLoading ? (
                      <p className="ff-paper-community__empty">Chưa có nhận xét. Hãy là người đầu tiên chia sẻ.</p>
                    ) : null}
                  </>
                )}
              </section>
            )}
          </aside>
        </div>
      </div>

      {toast && <div className="ff-paper-viewer__toast" role="status" aria-live="polite">{toast}</div>}

      {isFlashcardOpen && paper && (
        <ExamFlashcardModal
          paper={paper}
          isOpen={isFlashcardOpen}
          onClose={() => setIsFlashcardOpen(false)}
        />
      )}
    </div>
  );
};
