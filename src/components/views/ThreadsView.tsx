/* Bản quyền trí tuệ thuộc về BroAmStuck */
/* Thread System v1.0 — mảng xã hội nội bộ: đăng tức thì (không duyệt bài),
   Respiração public toàn trường, 1 ảnh/thread, 480 ký tự, reply lồng tối đa 3 cấp,
   5 reaction toggle, repost simple/quote, report auto-hide (≥5/1h),
   rate limit 10 thread/giờ (server), Thread of the Day banner (Mascot Cú). */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Heart, Laugh, Flame, Zap, HandHeart, ImagePlus, Send,
  Repeat2, Flag, Trash2, MessageSquareQuote, X, Users,
  AlertTriangle,
} from 'lucide-react';
import type { Thread, ThreadReactionType, User } from '../../types';
import { handleImageError } from '../../utils/mediaFallback';
import { isMasterAdmin } from '../../config/admin';
import './ThreadsView.css';

/* Giới hạn spec Final Lock */
const THREAD_MAX_CHARS = 480;
/* Bản ghi mặt cười/cảm xúc theo spec: love / haha / fire / wow / support */
const REACTIONS: { type: ThreadReactionType; label: string; icon: React.FC<{ className?: string }> }[] = [
  { type: 'love', label: 'Thương', icon: Heart },
  { type: 'haha', label: 'Haha', icon: Laugh },
  { type: 'fire', label: 'Bùng', icon: Flame },
  { type: 'wow', label: 'Wow', icon: Zap },
  { type: 'support', label: 'Ủng hộ', icon: HandHeart },
];

const formatRelativeTime = (ms: number): string => {
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'Vừa xong';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút trước`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} giờ trước`;
  return `${Math.floor(diff / 86_400_000)} ngày trước`;
};

/* Tách các chuỗi data:image => URL upload; để an toàn dùng cùng quy tắc gửi ảnh ≤20MB như QA view. */
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

interface ThreadsViewProps {
  currentUser: User | null;
  threads: Thread[];
  onCreateThread: (payload: { id?: string; content: string; imageUrl?: string }) => void | Promise<void>;
  onReplyThread: (parentId: string, content: string) => void | Promise<void>;
  onRepost: (threadId: string, type: 'simple' | 'quote', content?: string) => void | Promise<void>;
  onReact: (threadId: string, type: ThreadReactionType) => void | Promise<string | void>;
  onReport: (threadId: string, reason: string) => void | Promise<void>;
  onDelete?: (threadId: string) => void | Promise<void>;
  onOpenLoginModal?: () => void;
  onOpenProfile?: (user?: { id: string; name: string; avatar: string; email?: string; level?: number }) => void;
  isEmbedded?: boolean;
  isSynced?: boolean;
}

/* === Card Thread (dùng cho feed + reply lồng + repost-card) === */
const ThreadCard: React.FC<{
  thread: Thread;
  allThreads?: Thread[];
  depth?: number;
  currentUser: User | null;
  replyingTo?: Thread | null;
  onCancelReply?: () => void;
  replyText?: string;
  onReplyTextChange?: (v: string) => void;
  onSendReply?: () => void;
  viewModel: {
    onReply?: (parentId: string, content: string) => void;
    onReact: (id: string, type: ThreadReactionType) => void;
    onRepost: (id: string, type: 'simple' | 'quote', content?: string) => void;
    onReport: (id: string, reason: string) => void;
    onDelete?: (id: string) => void;
    onOpenProfile?: ThreadsViewProps['onOpenProfile'];
    onOpenLoginModal?: () => void;
  };
  showActions?: boolean;
}> = ({ thread: rootThread, allThreads, depth = 0, currentUser, replyText, onReplyTextChange, viewModel, showActions = true }) => {
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [repostMode, setRepostMode] = useState<'simple' | 'quote'>('simple');
  const [isRepostOpen, setIsRepostOpen] = useState(false);
  const [quoteText, setQuoteText] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [replyError, setReplyError] = useState('');
  /* Bộ nhớ reply cục bộ của card này — prop replyText chỉ cho kiểm soát từ ngoài nếu cần */
  const [localReplyText, setLocalReplyText] = useState('');
  const replyTextValue = replyText ?? localReplyText;
  const setReplyTextValue = onReplyTextChange ?? setLocalReplyText;
  const isSuperAdmin = isMasterAdmin(currentUser?.email);
  const isAuthor = currentUser ? rootThread.authorId === currentUser.id || rootThread.authorEmail === currentUser.email : false;

  /* Quoted thread nếu đây là quote repost */
  const quotedThread = useMemo(() => {
    if (!rootThread.repostOfId) return null;
    return allThreads?.find((t) => t.id === rootThread.repostOfId) || null;
  }, [rootThread.repostOfId, allThreads]);

  /* Các phản hồi lồng của thread này */
  const childReplies = useMemo(() => {
    if (!allThreads) return [];
    return allThreads
      .filter((t) => t.parentThreadId === rootThread.id)
      .sort((a, b) => a.createdAtMs - b.createdAtMs);
  }, [allThreads, rootThread.id]);

  const [isRepliesExpanded, setIsRepliesExpanded] = useState(false);

  /* Đếm mỗi loại reaction từ map email → [type] */
  const reactionCounts = useMemo(() => {
    const out: Record<ThreadReactionType, number> = { love: 0, haha: 0, fire: 0, wow: 0, support: 0 };
    Object.values(rootThread.reactions || {}).forEach((types) => {
      types.forEach((t) => { out[t] += 1; });
    });
    return out;
  }, [rootThread.reactions]);
  const myReactions = useMemo(() => {
    if (!currentUser) return [];
    return (rootThread.reactions || {})[currentUser.email?.toLowerCase() || ''] || [];
  }, [rootThread.reactions, currentUser]);

  const totalReactionCount = Object.values(reactionCounts).reduce((s, n) => s + n, 0);
  const submitReply = () => {
    if (!replyTextValue.trim()) {
      setReplyError('Xin hãy nhập nội dung trước khi gửi');
      return;
    }
    if (replyTextValue.length > THREAD_MAX_CHARS) return;
    viewModel.onReply?.(rootThread.id, replyTextValue.trim());
    setLocalReplyText('');
    setIsReplyOpen(false);
    setReplyError('');
  };

  const submitSimpleRepost = () => {
    viewModel.onRepost(rootThread.id, 'simple');
    setIsRepostOpen(false);
  };

  const submitQuoteRepost = () => {
    viewModel.onRepost(rootThread.id, 'quote', quoteText.trim());
    setIsRepostOpen(false);
    setQuoteText('');
  };

  return (
    <div>
      <div className="thread-card">
        <div className="thread-author">
          <button
            type="button"
            onClick={() => viewModel.onOpenProfile?.({
              id: rootThread.authorId,
              name: rootThread.authorName,
              avatar: rootThread.authorAvatar,
              email: rootThread.authorEmail,
              level: rootThread.authorLevel,
            })}
            className="author-button"
            title="Xem hồ sơ"
          >
            <img
              src={rootThread.authorAvatar}
              loading="lazy"
              onError={(e) => handleImageError(e, '')}
              className="author-avatar"
              alt={rootThread.authorName}
            />
            <div className="author-info">
              <div className="author-line">
                <span className="author-name">{rootThread.authorName}</span>
                {rootThread.authorLevel >= 150 && isSuperAdmin && <span className="author-level-badge">ADMIN</span>}
                {/* Streak badge — 🔥{n} bằng chữ chỉ khi > 0 */}
                {typeof currentUser?.streakCount === 'number' && currentUser.streakCount > 0 && rootThread.authorEmail === currentUser.email && (
                  <span className="streak-badge">🔥 {currentUser.streakCount}</span>
                )}
                <span className="author-level">Lv.{rootThread.authorLevel}</span>
              </div>
              <span className="author-time">{formatRelativeTime(rootThread.createdAtMs)}</span>
            </div>
          </button>
          {showActions && (
            <div className="thread-top-actions">
              {isAuthor || isSuperAdmin ? (
                <button
                  type="button"
                  className="icon-btn danger"
                  title={isAuthor ? 'Xóa thread của cậu' : 'Xóa thread (Moderator)'}
                  onClick={() => viewModel.onDelete?.(rootThread.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          )}
        </div>

        <p className="thread-content">{rootThread.content}</p>

        {rootThread.imageUrl && (
          <div className="thread-image-wrap">
            <img
              src={rootThread.imageUrl}
              loading="lazy"
              onError={(e) => handleImageError(e, '')}
              className="thread-image"
              alt="Ảnh đính kèm thread"
            />
          </div>
        )}

        {/* Khung trích dẫn Quote Repost theo spec */}
        {quotedThread && (
          <div className="repost-quote-box">
            <div className="repost-quote-header">
              <img
                src={quotedThread.authorAvatar}
                loading="lazy"
                onError={(e) => handleImageError(e, '')}
                className="repost-quote-avatar"
                alt={quotedThread.authorName}
              />
              <span className="repost-quote-name">{quotedThread.authorName}</span>
              <span className="repost-quote-level">Lv.{quotedThread.authorLevel}</span>
              <span className="repost-quote-time">{formatRelativeTime(quotedThread.createdAtMs)}</span>
            </div>
            <p className="repost-quote-content">{quotedThread.content}</p>
            {quotedThread.imageUrl && (
              <img
                src={quotedThread.imageUrl}
                loading="lazy"
                onError={(e) => handleImageError(e, '')}
                className="repost-quote-image"
                alt="Ảnh trích dẫn"
              />
            )}
          </div>
        )}

        {
          /* ✓ Khu reaction & action (chỉ hiển thị ở card gốc, không lồng sâu) */
        }
        {showActions && (
          <div className="thread-actions">
            <div className="thread-reactions">
              {REACTIONS.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => viewModel.onReact(rootThread.id, type)}
                  className={`reaction-btn ${myReactions.includes(type) ? 'reacted' : ''}`}
                  title={label}
                >
                  <Icon className="w-4 h-4" />
                  {reactionCounts[type] > 0 && <span className="reaction-count">{reactionCounts[type]}</span>}
                </button>
              ))}
              {totalReactionCount === 0 && (
                <span className="reaction-hint">Chưa ai bày tỏ — thả cảm xúc đầu tiên nào</span>
              )}
            </div>
            <div className="thread-cta-group">
              <button type="button" onClick={() => setIsReplyOpen((v) => !v)} className="action-text-btn">
                <MessageSquareQuote className="w-4 h-4" />
                Phản hồi
              </button>
              <button type="button" onClick={() => setIsRepostOpen((v) => !v)} className="action-text-btn">
                <Repeat2 className="w-4 h-4" />
                Chia sẻ lại
              </button>
              <button type="button" onClick={() => setIsReportOpen(true)} className="action-text-btn subtle" title="Báo cáo vi phạm">
                <Flag className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {showActions && isReplyOpen && (
          <div className="reply-composer">
            <textarea
              rows={2}
              maxLength={THREAD_MAX_CHARS}
              value={replyTextValue}
              onChange={(e) => setReplyTextValue(e.target.value)}
              placeholder="Cậu nghĩ sao? 💭"
              className="reply-input"
            />
            <div className="reply-composer-foot">
              <span className="char-count">{replyTextValue.length}/{THREAD_MAX_CHARS}</span>
              {replyError && <span className="reply-error">{replyError}</span>}
              <button type="button" onClick={submitReply} className="small-btn cyan">Gửi phản hồi</button>
              <button type="button" onClick={() => { setIsReplyOpen(false); setReplyError(''); }} className="small-btn subtle">Hủy</button>
            </div>
          </div>
        )}

        {showActions && isRepostOpen && (
          <div className="repost-modal">
            <div className="repost-modal-head">
              <span className="repost-modal-title">Chọn kiểu chia sẻ lại</span>
              <button type="button" onClick={() => setIsRepostOpen(false)} className="post-modal-close" title="Đóng">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="repost-type-row">
              <button type="button" onClick={() => setRepostMode('simple')} className={`repost-type-btn ${repostMode === 'simple' ? 'active' : ''}`}>
                Chia sẻ đơn giản
              </button>
              <button type="button" onClick={() => setRepostMode('quote')} className={`repost-type-btn ${repostMode === 'quote' ? 'active' : ''}`}>
                Trích dẫn + lời
              </button>
            </div>
            {repostMode === 'quote' && (
              <textarea
                rows={2}
                maxLength={THREAD_MAX_CHARS}
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="Thêm lời bình của cậu (tùy chọn)…"
                className="quote-input"
              />
            )}
            <div className="repost-modal-foot">
              <span className="repost-hint">
                {repostMode === 'simple' ? 'Thread gốc cho vào feed của cậu nguyên vẹn.' : 'Kèm lời bình của cậu lên đầu.'}
              </span>
              <button type="button" onClick={repostMode === 'simple' ? submitSimpleRepost : submitQuoteRepost} className="small-btn amber">
                {repostMode === 'simple' ? 'Đăng lại' : 'Đăng lời trích'}
              </button>
            </div>
          </div>
        )}

        {isReportOpen && (
          <div className="repost-modal">
            <div className="repost-modal-head">
              <span className="repost-modal-title"><AlertTriangle className="w-4 h-4 inline text-amber-400" /> Báo cáo vi phạm</span>
              <button type="button" onClick={() => { setIsReportOpen(false); setReportReason(''); }} className="post-modal-close" title="Đóng">
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              rows={2}
              maxLength={500}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Mô tả vi phạm cậu nhìn thấy (bắt buộc)…"
              className="quote-input"
            />
            <div className="repost-modal-foot">
              <span className="repost-hint">5 báo cáo trong 1 giờ → thread tự ẩn khỏi feed chờ Admin xử lý.</span>
              <button
                type="button"
                onClick={() => { viewModel.onReport(rootThread.id, reportReason.trim()); setIsReportOpen(false); setReportReason(''); }}
                className="small-btn red"
              >
                Gửi báo cáo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Phản hồi lồng đệ quy (Nested replies) tối đa 3 cấp theo spec Nhiemvu_8 */}
      {showActions && depth < 3 && childReplies.length > 0 && (
        <div className="thread-replies-container">
          {childReplies.slice(0, isRepliesExpanded ? childReplies.length : 3).map((reply) => (
            <ThreadReplyNode
              key={reply.id}
              reply={reply}
              allThreads={allThreads || []}
              currentUser={currentUser}
              viewModel={viewModel}
              depth={depth + 1}
            />
          ))}
          {childReplies.length > 3 && !isRepliesExpanded && (
            <button
              type="button"
              onClick={() => setIsRepliesExpanded(true)}
              className="view-more-replies"
            >
              Xem thêm {childReplies.length - 3} phản hồi →
            </button>
          )}
        </div>
      )}

      {/* Khi depth >= 3: Làm phẳng (flatten) và hiển thị nút "Xem thêm phản hồi" */}
      {showActions && depth >= 3 && childReplies.length > 0 && (
        <div className="thread-replies-container">
          {!isRepliesExpanded ? (
            <button
              type="button"
              onClick={() => setIsRepliesExpanded(true)}
              className="view-more-replies"
            >
              Xem thêm {childReplies.length} phản hồi sâu hơn →
            </button>
          ) : (
            childReplies.map((reply) => (
              <ThreadCard
                key={reply.id}
                thread={reply}
                allThreads={allThreads}
                currentUser={currentUser}
                viewModel={viewModel}
                depth={depth}
                showActions={true}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

/* Component đệ quy cho reply lồng nhau (tối đa 3 cấp) theo spec Nhiemvu_8 */
const ThreadReplyNode: React.FC<{
  reply: Thread;
  allThreads: Thread[];
  currentUser: User | null;
  viewModel: any;
  depth: number;
}> = ({ reply, allThreads, currentUser, viewModel, depth }) => {
  return (
    <div className="reply-node" style={{ marginLeft: Math.min(depth, 3) * 16 }}>
      <ThreadCard
        thread={reply}
        allThreads={allThreads}
        currentUser={currentUser}
        viewModel={viewModel}
        depth={depth}
        showActions={true}
      />
    </div>
  );
};

/* === View chính === */
export const ThreadsView: React.FC<ThreadsViewProps> = ({
  currentUser,
  threads,
  onCreateThread,
  onReplyThread,
  onRepost,
  onReact,
  onReport,
  onDelete,
  onOpenLoginModal,
  onOpenProfile,
  isEmbedded = false,
  isSynced = true,
}) => {
  const [draftContent, setDraftContent] = useState('');
  const [draftImage, setDraftImage] = useState<string | null>(null);
  const [draftImageError, setDraftImageError] = useState('');
  const [remainingChars, setRemainingChars] = useState(THREAD_MAX_CHARS);
  const [ofTheDay, setOfTheDay] = useState<Thread | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Tải Thread of the Day (cron server tính mỗi giờ, cache 1h) */
  useEffect(() => {
    let cancelled = false;
    void fetch('/api/threads/of-the-day')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.success) setOfTheDay(data.thread || null);
      })
      .catch(() => { /* offline thì bỏ banner, không chặn feed */ });
    return () => { cancelled = true; };
  }, [threads.length]);

  /* Feed: thread gốc không phải reply + repost xếp cùng dòng thời gian */
  const visibleThreads = useMemo(() => {
    if (!Array.isArray(threads)) return [];
    return threads
      .filter((t) => !t.parentThreadId)
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
  }, [threads]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftContent(e.target.value);
    setRemainingChars(THREAD_MAX_CHARS - e.target.value.length);
  };

  const firePickImage = () => {
    if (!currentUser) {
      onOpenLoginModal?.();
      return;
    }
    fileInputRef.current?.click();
  };

  const handleImageChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setDraftImageError('Đây không phải ảnh hợp lệ!');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setDraftImageError(`Ảnh vượt quá giới hạn 20MB (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      e.target.value = '';
      return;
    }
    setDraftImageError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setDraftImage(ev.target.result);
      }
    };
    reader.onerror = () => setDraftImageError('Lỗi đọc ảnh, thử lại nhé!');
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const cancelDraftImage = () => { setDraftImage(null); setDraftImageError(''); };

  const canSubmit = draftContent.trim().length > 0 && remainingChars >= 0 && !draftImageError;

  const submitThread = () => {
    if (!currentUser) {
      onOpenLoginModal?.();
      return;
    }
    if (!canSubmit) return;
    void onCreateThread({
      id: `thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      content: draftContent.trim(),
      imageUrl: draftImage || undefined,
    });
    setDraftContent('');
    setDraftImage(null);
    setRemainingChars(THREAD_MAX_CHARS);
  };

  const viewModel = {
    onReply: (parentId: string, content: string) => void onReplyThread(parentId, content),
    onReact: (id: string, type: ThreadReactionType) => void onReact(id, type),
    onRepost: (id: string, type: 'simple' | 'quote', content?: string) => void onRepost(id, type, content),
    onReport: (id: string, reason: string) => void onReport(id, reason),
    onDelete: (id: string) => void onDelete?.(id),
    onOpenProfile,
    onOpenLoginModal,
  };

  return (
    <section className={`relative w-full ${isEmbedded ? 'min-h-screen' : 'h-[100dvh] md:h-screen overflow-y-auto'} flex flex-col pt-[calc(54px+var(--safe-top)+12px)] md:pt-24 pb-[calc(56px+var(--safe-bottom)+12px)] md:pb-8 px-4 sm:px-8 threads-bg`}>
      <div className="relative z-10 w-full max-w-2xl mx-auto flex-1 flex flex-col">
        {/* Thread of the Day banner — Mascot Cú 🦉 */}
        {ofTheDay && (
          <div className="totd-banner">
            <span className="totd-mascot" role="img" aria-label="Cú">
              🦉
            </span>
            <div>
              <div className="totd-label">Cú tâm đắc hôm nay</div>
              <p className="totd-content">{ofTheDay.content}</p>
              <span className="totd-author">✍️ {ofTheDay.authorName}</span>
            </div>
          </div>
        )}

        {/* Composer — "Cậu đang nghĩ gì thế?" */}
        <div className="thread-composer-card">
          <textarea
            rows={3}
            maxLength={THREAD_MAX_CHARS}
            value={draftContent}
            onChange={handleContentChange}
            placeholder={currentUser ? 'Cậu đang nghĩ gì thế? 💭' : 'Đăng nhập để tham gia trò chuyện nhé! 💭'}
            className="thread-composer-input"
            onClick={() => { if (!currentUser) onOpenLoginModal?.(); }}
            readOnly={!currentUser}
          />
          {draftImage && (
            <div className="draft-image-preview">
              <img src={draftImage} alt="Xem trước ảnh" loading="lazy" className="draft-image" />
              <button type="button" onClick={cancelDraftImage} className="draft-image-remove" title="Gỡ ảnh">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {draftImageError && <p className="image-error">{draftImageError}</p>}
          <div className="thread-composer-actions">
            <button type="button" onClick={firePickImage} className="icon-btn subtle" title="Đính kèm 1 ảnh (≤20MB)">
              <ImagePlus className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChosen}
              className="hidden"
              tabIndex={-1}
            />
            <span className={`char-counter ${remainingChars < 20 ? 'char-warning' : ''}`}>
              {remainingChars}
            </span>
            <button
              type="button"
              onClick={submitThread}
              disabled={!canSubmit}
              className="primary-compose-btn"
            >
              <Send className="w-4 h-4" />
              Đăng
            </button>
          </div>
        </div>

        {/* Feed */}
        <div className="thread-feed">
          {!isSynced ? (
            <div className="thread-feed-skeleton" aria-busy="true">
              <p className="skeleton-note">Đang tải các thread từ máy chủ…</p>
            </div>
          ) : visibleThreads.length === 0 ? (
            <div className="thread-empty">
              <Users className="w-12 h-12 text-neutral-600 mx-auto" />
              <p className="thread-empty-title">Chưa thread nào — cậu sẽ là người mở đầu! 🚀</p>
            </div>
          ) : (
            visibleThreads.map((t) => (
              <ThreadCard
                key={t.id}
                thread={t}
                allThreads={threads}
                depth={0}
                currentUser={currentUser}
                viewModel={viewModel}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default ThreadsView;
