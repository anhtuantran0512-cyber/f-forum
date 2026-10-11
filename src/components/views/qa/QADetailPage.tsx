/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bookmark, BookmarkCheck, Coins, Eye, MessageSquare, Wand2 } from 'lucide-react';
import type { Question, Solution, User } from '../../../types';
import type { ReactionKind } from '../../../../shared/qaReactions';
import { ForumPostModeration } from '../../ForumPost';
import { InfoTip } from '../../ui/InfoTip';
import { ShareRow } from '../../ui/ShareRow';
import { DEFAULT_AVATAR, handleImageError } from '../../../utils/mediaFallback';
import { buildSolutionCounts } from '../../../utils/questionSort';
import { buildQuestionPageUrl, buildQuestionPath, resolveQuestionKey } from '../../../utils/qaRoute';
import { navigateTo } from '../../../utils/qaRouter';
import {
  QUESTION_STATUS_META,
  currentTimeMs,
  orderSolutions,
  questionStatusOf,
  relatedQuestions,
  topSolversThisWeek,
  type QuestionStatus,
} from '../../../utils/qaDetail';
import { prefersReducedMotion } from '../../../utils/viewTransition';
import { isOwnSolution, resolveQuestionAuthor, type OpenAuthor } from './authors';
import { QAComposer } from './QAComposer';
import { QADetailUnavailable, QA_DETAIL_FRAME_CLASS, QA_DETAIL_PADDING_CLASS } from './QADetailStates';
import { QAReadingProgress } from './QAReadingProgress';
import { QASolutionCard } from './QASolutionCard';
import { RelatedQuestions, TopSolvers } from './QASidebar';
import './QADetail.css';

export interface QADetailPageProps {
  /** Đoạn `<id>-<slug>` lấy từ URL. */
  routeKey: string;
  questions: Question[];
  solutions: Solution[];
  users: Record<string, User>;
  currentUser: User | null;
  /** False khi lần đồng bộ máy chủ đầu tiên chưa xong → chưa kết luận được "không có câu hỏi này". */
  isSynced: boolean;
  isSuperAdmin: boolean;
  canEditContent: boolean;
  /** Id các câu hỏi người dùng đã lưu (trang tự tra theo câu hỏi đang mở). */
  savedIds: readonly string[];
  onToggleSave: (questionId: string) => void;
  onAddSolution: (questionId: string, content: string, imageUrl?: string) => void;
  onMarkBestSolution: (questionId: string, solutionId: string) => void;
  /** Phản ứng nhanh dưới một lời giải (bấm lần nữa để bỏ). */
  onReactSolution: (solutionId: string, kind: ReactionKind) => void;
  onDeleteSolution?: (solutionId: string) => void;
  onOpenLoginModal?: () => void;
  onOpenAuthor: OpenAuthor;
  onEditPost: (questionId: string) => void;
  onDeletePost: (questionId: string) => void;
  /** "← Quay lại Hỏi đáp" */
  onBack: () => void;
  /** Mở một câu hỏi khác (gợi ý liên quan). */
  onOpenQuestion: (question: Question) => void;
}

const STATUS_STYLE: Record<QuestionStatus, { dot: string; chip: string }> = {
  solved: { dot: 'bg-emerald-400', chip: 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300' },
  discussing: { dot: 'bg-sky-400', chip: 'bg-sky-500/15 border-sky-400/40 text-sky-300' },
  waiting: { dot: 'bg-amber-400', chip: 'bg-amber-500/15 border-amber-400/40 text-amber-300' },
};

/** 🟢 Đã có lời giải đúng · 🔵 Đang thảo luận · 🟡 Đang chờ giải đáp — nhìn thoáng qua là biết tình trạng. */
const StatusPill: React.FC<{ status: QuestionStatus }> = ({ status }) => {
  const meta = QUESTION_STATUS_META[status];
  const style = STATUS_STYLE[status];
  return (
    <span
      data-status={status}
      title={meta.hint}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${style.chip}`}
    >
      <span className={`w-2 h-2 rounded-full ${style.dot}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
};

/** Ảnh + tên người đặt câu hỏi (ẩn danh hiện mặt nạ Pháp sư Ghibli như trước). */
const AuthorIdentity: React.FC<{ question: Question }> = ({ question }) => (
  <>
    <img
      src={question.authorAvatar}
      alt={question.authorName}
      onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
      loading="lazy"
      decoding="async"
      width={28}
      height={28}
      className={`w-7 h-7 rounded-full object-cover border ${
        question.isAnonymous ? 'border-purple-400 p-0.5 shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'border-white/20'
      }`}
    />
    <span className={`text-sm font-semibold ${question.isAnonymous ? 'text-purple-300' : 'text-white'}`}>
      {question.authorName}
    </span>
    {question.isAnonymous && (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-200 border border-purple-400/30 inline-flex items-center gap-1">
        <Wand2 className="w-3 h-3 text-purple-400" aria-hidden="true" />
        Pháp sư Ghibli
      </span>
    )}
  </>
);

type DetailProps = Omit<QADetailPageProps, 'routeKey' | 'isSynced'> & { question: Question };

const QuestionDetail: React.FC<DetailProps> = ({
  question,
  questions,
  solutions,
  users,
  currentUser,
  isSuperAdmin,
  canEditContent,
  savedIds,
  onToggleSave,
  onAddSolution,
  onMarkBestSolution,
  onReactSolution,
  onDeleteSolution,
  onOpenLoginModal,
  onOpenAuthor,
  onEditPost,
  onDeletePost,
  onBack,
  onOpenQuestion,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const solutionsId = useId();

  const questionSolutions = useMemo(
    () => solutions.filter((solution) => solution.questionId === question.id),
    [solutions, question.id],
  );
  /* Đáp án chuẩn luôn nổi lên ĐẦU danh sách. */
  const ordered = useMemo(() => orderSolutions(questionSolutions), [questionSolutions]);
  const status = questionStatusOf(question, questionSolutions);
  const solutionCounts = useMemo(() => buildSolutionCounts(solutions), [solutions]);
  const related = useMemo(() => relatedQuestions(question, questions, 5), [question, questions]);
  const topSolvers = useMemo(() => topSolversThisWeek(solutions, users, currentTimeMs(), 5), [solutions, users]);
  const author = resolveQuestionAuthor(question, users, currentUser);
  const isSaved = savedIds.includes(question.id);

  /* Đáp án vừa được xác nhận NGAY LÚC đang xem (qua thao tác của chính mình hoặc WebSocket) → thẻ nổi lên + sáng một nhịp.
     So sánh ngay khi render (không qua effect) để thẻ không kịp vẽ ở vị trí cũ một khung hình. */
  const bestId = questionSolutions.find((solution) => solution.isBest)?.id ?? null;
  const [seenBestId, setSeenBestId] = useState<string | null>(bestId);
  const [celebration, setCelebration] = useState<{ id: string; firstTime: boolean } | null>(null);
  if (seenBestId !== bestId) {
    setSeenBestId(bestId);
    setCelebration(bestId ? { id: bestId, firstTime: seenBestId === null } : null);
  }
  useEffect(() => {
    if (!celebration) return;
    const timer = window.setTimeout(() => setCelebration(null), 2800);
    return () => window.clearTimeout(timer);
  }, [celebration]);

  /* Địa chỉ chuẩn: bổ sung/đổi slug theo tiêu đề hiện tại (link cũ `?q=`, hoặc admin vừa sửa tiêu đề). */
  useEffect(() => {
    const canonical = buildQuestionPath(question.id, question.title);
    if (window.location.pathname !== canonical) {
      navigateTo(`${canonical}${window.location.search}${window.location.hash}`, { replace: true });
    }
  }, [question.id, question.title]);

  /* Tiêu đề tab + mô tả: người xem đầu tiên của link được chia sẻ, và mục lịch sử của trình duyệt, đều đọc ra đúng câu hỏi. */
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${question.title} · Hỏi đáp F-Forum`;
    return () => {
      document.title = previousTitle;
    };
  }, [question.title]);
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) return;
    const previous = meta.content;
    const excerpt = question.content.replace(/\s+/g, ' ').trim().slice(0, 155);
    if (excerpt) meta.content = excerpt;
    return () => {
      meta.content = previous;
    };
  }, [question.content]);

  /* Trang mới → đưa tiêu điểm bàn phím/trình đọc màn hình về đầu bài (không làm trang cuộn). */
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);

  const scrollToSolutions = () =>
    document
      .getElementById('qa-solutions')
      ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });

  return (
    <>
      <QAReadingProgress scrollerRef={scrollRef} />
      <div ref={scrollRef} className={QA_DETAIL_FRAME_CLASS} data-qa-scroller>
        <div className={QA_DETAIL_PADDING_CLASS}>
          <div className="mx-auto w-full max-w-6xl">
            <nav aria-label="Điều hướng trang" className="mb-4">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3 min-h-10 -ml-3 rounded-xl text-sm font-semibold text-neutral-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Quay lại Hỏi đáp
              </button>
            </nav>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] items-start">
              {/* ─────────── Cột chính ─────────── */}
              <div className="min-w-0 space-y-5">
                <article
                  aria-labelledby={titleId}
                  className="ff-qa-hero liquid-glass rounded-3xl border border-white/15 bg-neutral-950/70 p-5 sm:p-7"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <StatusPill status={status} />
                    <span className="px-2 py-1 rounded-md text-[11px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      #{question.subject}
                    </span>
                    {question.bountyCoin ? (
                      <span
                        title="Coin phần thưởng cho lời giải được chọn"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      >
                        <Coins className="w-3 h-3 text-amber-400" aria-hidden="true" />+{question.bountyCoin} Coin
                      </span>
                    ) : null}
                  </div>

                  <h1
                    id={titleId}
                    ref={titleRef}
                    tabIndex={-1}
                    className="text-2xl sm:text-3xl font-bold text-white leading-tight outline-none [overflow-wrap:anywhere]"
                  >
                    {question.title}
                  </h1>

                  <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-300">
                    {author ? (
                      <button
                        type="button"
                        onClick={(e) => onOpenAuthor(author, { x: e.clientX, y: e.clientY })}
                        className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-left"
                        title="Xem thông tin tác giả"
                      >
                        <AuthorIdentity question={question} />
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-2" title="Tác giả ẩn danh">
                        <AuthorIdentity question={question} />
                      </span>
                    )}
                    <span aria-hidden="true">•</span>
                    <span className="font-mono">{question.createdAt}</span>
                    <span aria-hidden="true">•</span>
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      {question.views} lượt xem
                    </span>
                  </div>

                  <p className="mt-5 text-[15px] sm:text-base text-neutral-100 leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
                    {question.content}
                  </p>

                  {question.imageUrl && (
                    <div className="mt-4 rounded-xl overflow-hidden border border-white/15 max-w-xl bg-black/40 p-1">
                      <img
                        loading="lazy"
                        decoding="async"
                        src={question.imageUrl}
                        alt="Đính kèm câu hỏi"
                        className="max-h-96 rounded-lg object-contain mx-auto"
                      />
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center gap-x-3 gap-y-3">
                    <button
                      type="button"
                      onClick={scrollToSolutions}
                      className="inline-flex items-center gap-1.5 px-3 min-h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-neutral-100 cursor-pointer transition-colors"
                    >
                      <MessageSquare className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                      {questionSolutions.length} lời giải
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleSave(question.id)}
                      aria-pressed={isSaved}
                      className={`inline-flex items-center gap-1.5 px-3 min-h-10 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                        isSaved
                          ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                          : 'bg-white/5 border-white/15 text-neutral-200 hover:bg-white/10'
                      }`}
                      title={isSaved ? 'Bỏ lưu câu hỏi này' : 'Lưu câu hỏi này để xem lại sau'}
                    >
                      {isSaved ? <BookmarkCheck className="w-4 h-4" aria-hidden="true" /> : <Bookmark className="w-4 h-4" aria-hidden="true" />}
                      {isSaved ? 'Đã lưu' : 'Lưu'}
                    </button>
                    <div className="sm:ml-auto">
                      <ShareRow url={buildQuestionPageUrl(window.location.origin, question.id, question.title)} title={question.title} />
                    </div>
                  </div>

                  <ForumPostModeration
                    postId={question.id}
                    onDeletePost={onDeletePost}
                    onEditPost={onEditPost}
                    isSuperAdmin={canEditContent}
                  />
                </article>

                {/* ─────────── Lời giải ─────────── */}
                <section id="qa-solutions" aria-labelledby={solutionsId} className="space-y-3 scroll-mt-28">
                  <h2 id={solutionsId} className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wide">
                    <span>{questionSolutions.length} lời giải</span>
                    <InfoTip label="Ai được xác nhận đáp án chuẩn?" align="start">
                      Chỉ tác giả hoặc Super Admin mới có quyền xác nhận đáp án chuẩn
                    </InfoTip>
                  </h2>

                  {ordered.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-white/15 bg-neutral-950/50 px-4 py-6 text-center text-sm text-neutral-300">
                      Chưa có bạn nào trợ giúp giải câu này. Hãy là người đầu tiên đưa ra đáp án chính xác!
                    </p>
                  ) : (
                    ordered.map((solution) => (
                      <QASolutionCard
                        key={solution.id}
                        solution={solution}
                        question={question}
                        users={users}
                        currentUser={currentUser}
                        isSuperAdmin={isSuperAdmin}
                        canEditContent={canEditContent}
                        celebrate={celebration?.id === solution.id}
                        showXpBonus={Boolean(celebration?.firstTime) && isOwnSolution(currentUser, solution)}
                        onConfirm={onMarkBestSolution}
                        onReact={onReactSolution}
                        onOpenLoginModal={onOpenLoginModal}
                        onDelete={onDeleteSolution}
                        onOpenAuthor={onOpenAuthor}
                      />
                    ))
                  )}
                </section>

                <QAComposer
                  questionId={question.id}
                  currentUser={currentUser}
                  onSubmit={onAddSolution}
                  onOpenLoginModal={onOpenLoginModal}
                />
              </div>

              {/* ─────────── Máy tính: sidebar dính bên phải ─────────── */}
              <aside
                aria-label="Gợi ý và bảng xếp hạng"
                className="hidden lg:block sticky top-24 max-h-[calc(100dvh-7.5rem)] overflow-y-auto space-y-6 rounded-3xl border border-white/10 bg-neutral-950/60 backdrop-blur-sm p-5"
              >
                <RelatedQuestions questions={related} solutionCounts={solutionCounts} onOpen={onOpenQuestion} variant="list" />
                <div className="border-t border-white/10" />
                <TopSolvers solvers={topSolvers} onOpenAuthor={onOpenAuthor} idSuffix="side" />
              </aside>

              {/* ─────────── Máy tính bảng / điện thoại: dồn xuống cuối trang ─────────── */}
              <div className="lg:hidden min-w-0 space-y-6">
                <RelatedQuestions questions={related} solutionCounts={solutionCounts} onOpen={onOpenQuestion} variant="rail" />
                <div className="rounded-2xl border border-white/10 bg-neutral-950/60 backdrop-blur-sm p-4">
                  <TopSolvers solvers={topSolvers} onOpenAuthor={onOpenAuthor} idSuffix="bottom" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

/** Trang chi tiết câu hỏi (`/hoi-dap/:id-slug`) — thay cho modal cũ. */
export const QADetailPage: React.FC<QADetailPageProps> = ({ routeKey, isSynced, ...rest }) => {
  const { questions, onBack } = rest;
  const questionId = useMemo(
    () => resolveQuestionKey(routeKey, questions.map((q) => q.id)),
    [routeKey, questions],
  );
  const question = questionId ? questions.find((q) => q.id === questionId) : undefined;

  return (
    /* key theo câu hỏi: chuyển sang câu liên quan thì trang mới vào lại bằng hoạt ảnh mờ + trượt; đổi slug thì không. */
    <div key={questionId ?? 'pending'} className="ff-qa-page absolute inset-0 z-10">
      {question ? (
        <QuestionDetail {...rest} question={question} />
      ) : (
        <div className={QA_DETAIL_FRAME_CLASS}>
          <div className={QA_DETAIL_PADDING_CLASS}>
            <QADetailUnavailable isSynced={isSynced} onBack={onBack} />
          </div>
        </div>
      )}
    </div>
  );
};
