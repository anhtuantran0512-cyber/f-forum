/* Bản quyền trí tuệ thuộc về BroAmStuck */
/* Thread System v1.0 — mảng xã hội nội bộ: đăng tức thì (không duyệt bài),
   Respiração public toàn trường, 1 ảnh/thread, 480 ký tự, reply lồng tối đa 3 cấp,
   5 reaction toggle, repost simple/quote, report auto-hide (≥5/1h),
   rate limit 10 thread/giờ (server), Thread of the Day banner (Mascot Cú). */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Heart, Laugh, Flame, Zap, HandHeart, ImagePlus, Send,
  Repeat2, Flag, Trash2, MessageSquareQuote, X, Users,
  Sparkles, Search, Hash, Image as ImageIcon, Clock, TrendingUp,
  Bookmark, ZoomIn,
} from 'lucide-react';
import type { Thread, ThreadReactionType, User } from '../../types';
import { DEFAULT_AVATAR, handleImageError } from '../../utils/mediaFallback';
import { isMasterAdmin } from '../../config/admin';
import { safeStorage } from '../../utils/storage';
import { DecoratedAvatar, DecoratedName } from '../decorations/DecoratedAvatar';
import { useVirtualWindow } from '../../utils/virtualWindow';
import { useInteractionDebounce } from '../../utils/interactionScheduler';
import './ThreadsView.css';

const SAVED_THREADS_KEY = 'fforum_saved_threads_v1';

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

const QUICK_TOPICS = ['#HọcTập', '#TâmSựĐêm', '#TìmĐồngĐội', '#ChiaSẻ', '#GócChill'] as const;

const renderContentWithHashtags = (
  text: string,
  onSelectTag?: (tag: string) => void,
): React.ReactNode => {
  if (!text) return null;
  const parts = text.split(/(#[\p{L}\p{N}_]+)/gu);
  return parts.map((part, idx) => {
    if (part.startsWith('#') && part.length > 1) {
      return (
        <button
          key={`${part}-${idx}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectTag?.(part);
          }}
          className="thread-hashtag-pill"
        >
          {part}
        </button>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
};

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
  users?: Record<string, User>;
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

const resolveThreadUser = (
  users: Record<string, User> | undefined,
  currentUser: User | null,
  email?: string | null,
  id?: string | null,
): User | null => {
  const cleanEmail = email ? email.trim().toLowerCase() : '';
  if (users) {
    if (cleanEmail && users[cleanEmail]) return users[cleanEmail];
    if (isMasterAdmin(cleanEmail) && users['broamstuck@gmail.com']) {
      return users['broamstuck@gmail.com'];
    }
    if ((id === 'admin-master' || id === 'user-admin') && users['broamstuck@gmail.com']) {
      return users['broamstuck@gmail.com'];
    }
    if (id) {
      for (const u of Object.values(users)) {
        if (u.id === id) return u;
      }
    }
  }
  if (
    currentUser &&
    ((cleanEmail && currentUser.email.toLowerCase() === cleanEmail) ||
      (id && currentUser.id === id))
  ) {
    return currentUser;
  }
  return null;
};

/* === Card Thread (dùng cho feed + reply lồng + repost-card) === */
const ThreadCard: React.FC<{
  thread: Thread;
  allThreads?: Thread[];
  depth?: number;
  currentUser: User | null;
  users?: Record<string, User>;
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
    onSelectTag?: (tag: string) => void;
    onToggleSave?: (id: string) => void;
    isSaved?: (id: string) => boolean;
    onOpenLightbox?: (url: string) => void;
  };
  showActions?: boolean;
}> = ({ thread: rootThread, allThreads, depth = 0, currentUser, users, replyText, onReplyTextChange, viewModel, showActions = true }) => {
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
            <DecoratedAvatar
              user={resolveThreadUser(users, currentUser, rootThread.authorEmail, rootThread.authorId)}
              fallbackSrc={rootThread.authorAvatar || DEFAULT_AVATAR}
              size={38}
              animate
              className="author-avatar rounded-full"
              alt={rootThread.authorName}
            />
            <div className="author-info">
              <div className="author-line">
                <span className="author-name inline-flex items-center">
                  <DecoratedName
                    user={resolveThreadUser(users, currentUser, rootThread.authorEmail, rootThread.authorId)}
                    name={rootThread.authorName.replace(/ \(.*\)/, '')}
                    width={142}
                    height={27}
                    animate
                    showFallbackTag
                  />
                </span>
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

        <p className="thread-content">
          {renderContentWithHashtags(rootThread.content, viewModel.onSelectTag)}
        </p>

        {rootThread.imageUrl && (
          <div
            className="thread-image-wrap group cursor-zoom-in relative"
            onClick={() => viewModel.onOpenLightbox?.(rootThread.imageUrl!)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                viewModel.onOpenLightbox?.(rootThread.imageUrl!);
              }
            }}
            aria-label="Phóng to ảnh đính kèm"
          >
            <img
              src={rootThread.imageUrl}
              loading="lazy"
              decoding="async"
              onError={(e) => handleImageError(e, '')}
              className="thread-image"
              alt="Ảnh đính kèm thread"
            />
            <span className="thread-image-zoom-badge" aria-hidden="true">
              <ZoomIn className="w-3.5 h-3.5" />
            </span>
          </div>
        )}

        {/* Khung trích dẫn Quote Repost theo spec */}
        {quotedThread && (
          <div className="repost-quote-box">
            <div className="repost-quote-header">
              <DecoratedAvatar
                user={resolveThreadUser(users, currentUser, quotedThread.authorEmail, quotedThread.authorId)}
                fallbackSrc={quotedThread.authorAvatar || DEFAULT_AVATAR}
                size={24}
                animate
                className="repost-quote-avatar rounded-full"
                alt={quotedThread.authorName}
              />
              <span className="repost-quote-name inline-flex items-center">
                <DecoratedName
                  user={resolveThreadUser(users, currentUser, quotedThread.authorEmail, quotedThread.authorId)}
                  name={quotedThread.authorName.replace(/ \(.*\)/, '')}
                  width={126}
                  height={24}
                  animate
                  showFallbackTag
                />
              </span>
              <span className="repost-quote-level">Lv.{quotedThread.authorLevel}</span>
              <span className="repost-quote-time">{formatRelativeTime(quotedThread.createdAtMs)}</span>
            </div>
            <p className="repost-quote-content">
              {renderContentWithHashtags(quotedThread.content, viewModel.onSelectTag)}
            </p>
            {quotedThread.imageUrl && (
              <img
                src={quotedThread.imageUrl}
                loading="lazy"
                decoding="async"
                onClick={() => viewModel.onOpenLightbox?.(quotedThread.imageUrl!)}
                onError={(e) => handleImageError(e, '')}
                className="repost-quote-image cursor-zoom-in"
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
                <span className="reaction-hint">Thả cảm xúc đầu tiên</span>
              )}
            </div>
            <div className="thread-cta-group">
              <button type="button" onClick={() => setIsReplyOpen((v) => !v)} className={`action-text-btn ${isReplyOpen ? 'is-active' : ''}`}>
                <MessageSquareQuote className="w-4 h-4" />
                Phản hồi
                {childReplies.length > 0 && (
                  <span className="thread-reply-pill">{childReplies.length}</span>
                )}
              </button>
              <button type="button" onClick={() => setIsRepostOpen((v) => !v)} className={`action-text-btn ${isRepostOpen ? 'is-active' : ''}`}>
                <Repeat2 className="w-4 h-4" />
                Chia sẻ lại
              </button>
              <button
                type="button"
                onClick={() => viewModel.onToggleSave?.(rootThread.id)}
                className={`action-text-btn subtle ${viewModel.isSaved?.(rootThread.id) ? 'is-saved' : ''}`}
                title={viewModel.isSaved?.(rootThread.id) ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
                aria-pressed={Boolean(viewModel.isSaved?.(rootThread.id))}
              >
                <Bookmark className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setIsReportOpen(true)} className="action-text-btn subtle" title="Báo cáo vi phạm">
                <Flag className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {showActions && isReplyOpen && (
          <div className="reply-composer mt-3 p-4 rounded-2xl bg-[#0b111d] border border-cyan-400/30 space-y-3 shadow-lg">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-bold text-cyan-300">Phản hồi bài viết của {rootThread.authorName.replace(/ \(.*\)/, '')}</span>
              <span className="font-mono text-slate-400">{replyTextValue.length}/{THREAD_MAX_CHARS} ký tự</span>
            </div>
            <textarea
              rows={3}
              maxLength={THREAD_MAX_CHARS}
              value={replyTextValue}
              onChange={(e) => setReplyTextValue(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  submitReply();
                }
              }}
              placeholder="Viết phản hồi của cậu… (Ctrl + Enter để gửi nhanh)"
              className="reply-input w-full min-h-[88px] rounded-xl bg-[#070b13] border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <div className="reply-composer-foot flex items-center justify-between gap-2 flex-wrap pt-1">
              {replyError ? <span className="reply-error text-xs text-rose-400">{replyError}</span> : <span className="text-[11px] text-slate-500">Nhấn Ctrl + Enter để đăng nhanh</span>}
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setIsReplyOpen(false); setReplyError(''); }} className="small-btn subtle px-3.5 py-1.5 rounded-xl text-xs font-semibold">Hủy</button>
                <button type="button" onClick={submitReply} className="small-btn cyan px-4 py-1.5 rounded-xl text-xs font-bold">Gửi phản hồi</button>
              </div>
            </div>
          </div>
        )}

        {showActions && isRepostOpen && (
          <div className="repost-modal mt-3 p-4 sm:p-5 rounded-2xl bg-[#0b111d] border border-amber-400/35 space-y-3.5 shadow-xl">
            <div className="repost-modal-head flex items-center justify-between">
              <span className="repost-modal-title text-sm font-bold text-white">Chia sẻ lại bài viết</span>
              <button type="button" onClick={() => setIsRepostOpen(false)} className="post-modal-close p-1 rounded-lg hover:bg-white/10" title="Đóng">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="repost-type-row grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setRepostMode('simple')} className={`repost-type-btn py-2 px-3 rounded-xl text-xs font-bold ${repostMode === 'simple' ? 'active' : ''}`}>
                Chia sẻ đơn giản
              </button>
              <button type="button" onClick={() => setRepostMode('quote')} className={`repost-type-btn py-2 px-3 rounded-xl text-xs font-bold ${repostMode === 'quote' ? 'active' : ''}`}>
                Trích dẫn kèm lời bình
              </button>
            </div>
            {repostMode === 'quote' && (
              <textarea
                rows={3}
                maxLength={THREAD_MAX_CHARS}
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="Thêm lời bình của cậu (tùy chọn)…"
                className="quote-input w-full min-h-[88px] rounded-xl bg-[#070b13] border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            )}
            <div className="repost-modal-foot flex items-center justify-between gap-3 pt-1">
              <span className="repost-hint text-xs text-slate-400">
                {repostMode === 'simple' ? 'Thread gốc cho vào bảng tin của cậu nguyên vẹn.' : 'Đính kèm lời bình của cậu lên đầu bài viết.'}
              </span>
              <button type="button" onClick={repostMode === 'simple' ? submitSimpleRepost : submitQuoteRepost} className="small-btn amber px-4 py-2 rounded-xl text-xs font-bold shrink-0">
                {repostMode === 'simple' ? 'Đăng lại ngay' : 'Đăng lời trích'}
              </button>
            </div>
          </div>
        )}

        {isReportOpen && typeof document !== 'undefined' && createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Báo cáo bài viết vi phạm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsReportOpen(false);
                setReportReason('');
              }
            }}
            className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-up"
          >
            <div className="w-full max-w-xl rounded-3xl bg-[#0b111e] border border-rose-500/40 shadow-[0_28px_80px_rgba(0,0,0,0.9)] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-400/35 flex items-center justify-center text-rose-300">
                    <Flag className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-extrabold text-white">Báo cáo bài viết vi phạm</h3>
                    <p className="text-xs text-slate-400">Bài viết của {rootThread.authorName.replace(/ \(.*\)/, '')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsReportOpen(false); setReportReason(''); }}
                  className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] text-slate-300 hover:text-white cursor-pointer"
                  title="Đóng"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-slate-300 line-clamp-2">
                  <span className="text-slate-400 font-semibold mr-1.5">Nội dung bài viết:</span>
                  "{rootThread.content}"
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-bold text-slate-200">Chọn nhanh nhóm vi phạm:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Ngôn từ xúc phạm / Gây gổ bạn học',
                      'Spam / Quảng cáo / Lừa đảo',
                      'Nội dung phản cảm / Không phù hợp',
                      'Thông tin sai sự thật / Quấy rối',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setReportReason(preset)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                          reportReason === preset
                            ? 'bg-rose-500/20 border-rose-400 text-rose-100'
                            : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-slate-300'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-200">Mô tả chi tiết vi phạm (*):</label>
                    <span className="font-mono text-slate-400">{reportReason.length}/500</span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={500}
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Mô tả cụ thể vi phạm bạn nhìn thấy để Ban Quản Trị kiểm tra và xử lý..."
                    className="w-full min-h-[110px] rounded-2xl bg-[#070b13] border border-white/15 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 leading-relaxed resize-y"
                  />
                </div>

                <p className="text-xs text-slate-400 bg-rose-500/10 border border-rose-500/25 rounded-xl px-3.5 py-2.5">
                  Bài viết nhận từ 5 báo cáo hợp lệ trong 1 giờ sẽ tự động tạm ẩn khỏi bảng tin để chờ Ban Quản Trị xét duyệt.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-white/10 bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => { setIsReportOpen(false); setReportReason(''); }}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={!reportReason.trim()}
                  onClick={() => { viewModel.onReport(rootThread.id, reportReason.trim()); setIsReportOpen(false); setReportReason(''); }}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-extrabold shadow-lg cursor-pointer"
                >
                  Gửi báo cáo vi phạm
                </button>
              </div>
            </div>
          </div>,
          document.body,
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
              users={users}
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
                users={users}
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
  users?: Record<string, User>;
  viewModel: any;
  depth: number;
}> = ({ reply, allThreads, currentUser, users, viewModel, depth }) => {
  return (
    <div className="reply-node" style={{ marginLeft: Math.min(depth, 3) * 16 }}>
      <ThreadCard
        thread={reply}
        allThreads={allThreads}
        currentUser={currentUser}
        users={users}
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
  users,
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
  const [feedMode, setFeedMode] = useState<'latest' | 'hot' | 'media' | 'mine' | 'saved'>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useInteractionDebounce(searchQuery, 120);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const raw = safeStorage.getItem(SAVED_THREADS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSaveThread = (threadId: string) => {
    setSavedIds((prev) => {
      const exists = prev.includes(threadId);
      const next = exists ? prev.filter((id) => id !== threadId) : [threadId, ...prev];
      safeStorage.setItem(SAVED_THREADS_KEY, JSON.stringify(next));
      return next;
    });
  };

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

  /* Tự động trích xuất chủ đề #hashtag đang thịnh hành trong toàn bộ mạch chuyện */
  const trendingTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tag of QUICK_TOPICS) counts.set(tag, 0);
    if (Array.isArray(threads)) {
      for (const t of threads) {
        if (!t.content) continue;
        const matches = t.content.match(/#[\p{L}\p{N}_]+/gu);
        if (!matches) continue;
        for (const m of matches) {
          counts.set(m, (counts.get(m) || 0) + 1);
        }
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [threads]);

  /* Feed: thread gốc không phải reply + repost xếp cùng dòng thời gian + lọc/tìm kiếm thông minh */
  const visibleThreads = useMemo(() => {
    if (!Array.isArray(threads)) return [];
    const replyCountByParent = new Map<string, number>();
    for (const t of threads) {
      if (t.parentThreadId) {
        replyCountByParent.set(t.parentThreadId, (replyCountByParent.get(t.parentThreadId) || 0) + 1);
      }
    }
    const q = debouncedSearchQuery.trim().toLowerCase();
    const tagLower = activeTag ? activeTag.toLowerCase() : null;
    const savedSet = new Set(savedIds);
    const roots = threads.filter((t) => {
      if (t.parentThreadId) return false;
      if (feedMode === 'media' && !t.imageUrl) return false;
      if (feedMode === 'saved' && !savedSet.has(t.id)) return false;
      if (
        feedMode === 'mine' &&
        (!currentUser ||
          (t.authorId !== currentUser.id &&
            t.authorEmail?.toLowerCase() !== currentUser.email?.toLowerCase()))
      ) {
        return false;
      }
      if (tagLower && !t.content.toLowerCase().includes(tagLower)) return false;
      if (q) {
        const hitContent = t.content.toLowerCase().includes(q);
        const hitAuthor = t.authorName.toLowerCase().includes(q);
        if (!hitContent && !hitAuthor) return false;
      }
      return true;
    });

    if (feedMode === 'hot') {
      return [...roots].sort((a, b) => {
        const score = (item: Thread) => {
          const rx = Object.values(item.reactions || {}).reduce((s, arr) => s + arr.length, 0);
          const rep = replyCountByParent.get(item.id) || 0;
          return rx * 2 + rep * 3;
        };
        const diff = score(b) - score(a);
        return diff !== 0 ? diff : b.createdAtMs - a.createdAtMs;
      });
    }
    return [...roots].sort((a, b) => b.createdAtMs - a.createdAtMs);
  }, [threads, feedMode, debouncedSearchQuery, activeTag, currentUser, savedIds]);

  const feedScrollRef = useRef<HTMLElement | null>(null);

  const { isItemVisible: isThreadVisible } = useVirtualWindow({
    totalItems: visibleThreads.length,
    itemHeight: 160,
    columns: 1,
    overscan: 12,
    containerRef: isEmbedded ? undefined : feedScrollRef,
  });

  const feedStats = useMemo(() => {
    if (!Array.isArray(threads)) return { roots: 0, replies: 0, reactions: 0 };
    let roots = 0;
    let replies = 0;
    let reactions = 0;
    for (const t of threads) {
      if (t.parentThreadId) replies += 1;
      else roots += 1;
      reactions += Object.values(t.reactions || {}).reduce((s, arr) => s + arr.length, 0);
    }
    return { roots, replies, reactions };
  }, [threads]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftContent(e.target.value);
    setRemainingChars(THREAD_MAX_CHARS - e.target.value.length);
  };

  const insertTopicTag = (tag: string) => {
    if (!currentUser) {
      onOpenLoginModal?.();
      return;
    }
    if (draftContent.includes(tag)) return;
    const prefix = draftContent.length > 0 && !draftContent.endsWith(' ') && !draftContent.endsWith('\n') ? ' ' : '';
    const next = `${draftContent}${prefix}${tag} `;
    if (next.length <= THREAD_MAX_CHARS) {
      setDraftContent(next);
      setRemainingChars(THREAD_MAX_CHARS - next.length);
    }
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
  const usedRatio = Math.min(1, Math.max(0, draftContent.length / THREAD_MAX_CHARS));
  const ringCircumference = 2 * Math.PI * 9;
  const ringOffset = ringCircumference * (1 - usedRatio);

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
    onSelectTag: (tag: string) => setActiveTag((prev) => (prev === tag ? null : tag)),
    onToggleSave: toggleSaveThread,
    isSaved: (id: string) => savedIds.includes(id),
    onOpenLightbox: (url: string) => setLightboxImage(url),
  };

  return (
    <section ref={feedScrollRef} className={`relative w-full ${isEmbedded ? 'min-h-screen' : 'h-[100dvh] md:h-screen overflow-y-auto'} flex flex-col pt-[calc(54px+var(--safe-top)+12px)] md:pt-24 pb-[calc(56px+var(--safe-bottom)+12px)] md:pb-8 px-4 sm:px-8 threads-bg ff-raw-grid-surface`}>
      <div className="relative z-10 w-full max-w-2xl mx-auto flex-1 flex flex-col">
        {/* Thanh đầu trang hiện đại: Tiêu đề + Thống kê + Tìm kiếm & Bộ lọc */}
        <header className="threads-hero-bar">
          <div className="threads-hero-top">
            <div className="threads-hero-brand">
              <span className="threads-hero-badge ff-holo-badge">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Góc Tâm Sự
              </span>
              <span className="threads-hero-stats ff-raw-meta">
                <b>{feedStats.roots}</b> mạch chuyện · <b>{feedStats.replies}</b> phản hồi · <b>{feedStats.reactions}</b> cảm xúc
              </span>
            </div>
            <div className="threads-search-box">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tâm sự, tác giả, #chủđề…"
                className="threads-search-input"
                aria-label="Tìm kiếm trong Góc Tâm Sự"
              />
              {(searchQuery || activeTag) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveTag(null);
                  }}
                  className="threads-search-clear"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="threads-filter-bar">
            <div className="threads-filter-tabs" role="tablist" aria-label="Bộ lọc mạch chuyện">
              <button
                type="button"
                role="tab"
                aria-selected={feedMode === 'latest'}
                onClick={() => setFeedMode('latest')}
                className={`threads-filter-pill ${feedMode === 'latest' ? 'is-active' : ''}`}
              >
                <Clock className="w-3.5 h-3.5" />
                Mới nhất
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={feedMode === 'hot'}
                onClick={() => setFeedMode('hot')}
                className={`threads-filter-pill ${feedMode === 'hot' ? 'is-active' : ''}`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Sôi nổi
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={feedMode === 'media'}
                onClick={() => setFeedMode('media')}
                className={`threads-filter-pill ${feedMode === 'media' ? 'is-active' : ''}`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Có ảnh
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={feedMode === 'saved'}
                onClick={() => setFeedMode('saved')}
                className={`threads-filter-pill ${feedMode === 'saved' ? 'is-active' : ''}`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                Đã lưu{savedIds.length > 0 ? ` (${savedIds.length})` : ''}
              </button>
              {currentUser && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={feedMode === 'mine'}
                  onClick={() => setFeedMode('mine')}
                  className={`threads-filter-pill ${feedMode === 'mine' ? 'is-active' : ''}`}
                >
                  Của tôi
                </button>
              )}
            </div>

            {activeTag && (
              <button
                type="button"
                onClick={() => setActiveTag(null)}
                className="threads-active-tag-chip"
                title="Bỏ lọc chủ đề"
              >
                <Hash className="w-3 h-3" />
                <span>{activeTag.replace(/^#/, '')}</span>
                <X className="w-3 h-3 opacity-70" />
              </button>
            )}
          </div>

          {trendingTags.length > 0 && (
            <div className="threads-trending-strip">
              <span className="threads-trending-label">Xu hướng:</span>
              {trendingTags.map(([tag, count]) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag((prev) => (prev === tag ? null : tag))}
                  className={`threads-trending-chip ${activeTag === tag ? 'is-active' : ''}`}
                >
                  <span>{tag}</span>
                  {count > 0 && <span className="threads-trending-count">{count}</span>}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Thread of the Day banner — Mascot Cú */}
        {ofTheDay && (
          <div className="totd-banner">
            <div className="totd-icon-orb" aria-hidden="true">
              <Flame className="w-5 h-5 text-amber-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="totd-head-row">
                <div className="totd-label">Tâm điểm hôm nay</div>
                <span className="totd-pill">Đề cử nổi bật</span>
              </div>
              <p className="totd-content">{ofTheDay.content}</p>
              <span className="totd-author inline-flex items-center gap-2 mt-1.5">
                <DecoratedAvatar
                  user={resolveThreadUser(users, currentUser, ofTheDay.authorEmail, ofTheDay.authorId)}
                  fallbackSrc={ofTheDay.authorAvatar || DEFAULT_AVATAR}
                  size={24}
                  animate
                  className="rounded-full"
                  alt={ofTheDay.authorName}
                />
                <DecoratedName
                  user={resolveThreadUser(users, currentUser, ofTheDay.authorEmail, ofTheDay.authorId)}
                  name={ofTheDay.authorName.replace(/ \(.*\)/, '')}
                  width={136}
                  height={25}
                  animate
                  showFallbackTag
                />
              </span>
            </div>
          </div>
        )}

        {/* Composer — "Cậu đang nghĩ gì thế?" */}
        <div className="thread-composer-card">
          {currentUser && (
            <div className="thread-composer-head">
              <DecoratedAvatar
                user={currentUser}
                fallbackSrc={currentUser.avatar || DEFAULT_AVATAR}
                size={36}
                animate
                eager
                priority="high"
                className="rounded-full"
                alt={currentUser.name}
              />
              <DecoratedName
                user={currentUser}
                name={currentUser.name.replace(/ \(.*\)/, '')}
                width={142}
                height={26}
                animate
                eager
                priority="high"
                showFallbackTag
              />
              <span className="thread-composer-badge">Đăng công khai</span>
            </div>
          )}
          <textarea
            rows={3}
            maxLength={THREAD_MAX_CHARS}
            value={draftContent}
            onChange={handleContentChange}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canSubmit) {
                e.preventDefault();
                submitThread();
              }
            }}
            placeholder={currentUser ? 'Cậu đang nghĩ gì thế? Chia sẻ câu chuyện hoặc gắn #chủđề… (Ctrl + Enter để đăng nhanh)' : 'Đăng nhập để tham gia trò chuyện nhé!'}
            className="thread-composer-input"
            onClick={() => { if (!currentUser) onOpenLoginModal?.(); }}
            readOnly={!currentUser}
          />
          {draftImage && (
            <div className="draft-image-preview">
              <img src={draftImage} alt="Xem trước ảnh" loading="lazy" decoding="async" className="draft-image" />
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={firePickImage}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950/90 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-400/50 text-xs font-extrabold transition-colors cursor-pointer"
                >
                  Đổi ảnh
                </button>
                <button
                  type="button"
                  onClick={cancelDraftImage}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950/90 hover:bg-rose-500/80 text-rose-300 hover:text-white border border-rose-400/40 text-xs font-extrabold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Gỡ ảnh"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Gỡ</span>
                </button>
              </div>
            </div>
          )}
          {draftImageError && <p className="image-error">{draftImageError}</p>}

          {/* Gợi ý chủ đề 1 chạm */}
          <div className="thread-topic-bar">
            <span className="thread-topic-label">Chủ đề:</span>
            {QUICK_TOPICS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => insertTopicTag(tag)}
                className={`thread-topic-chip ${draftContent.includes(tag) ? 'is-selected' : ''}`}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="thread-composer-actions">
            <button type="button" onClick={firePickImage} className="icon-btn subtle" title="Đính kèm 1 ảnh (≤20MB)">
              <ImagePlus className="w-4 h-4 text-cyan-400" />
              <span>Đính kèm ảnh</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChosen}
              className="hidden"
              tabIndex={-1}
            />
            <div className="char-counter-wrap">
              <svg className="char-ring" width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
                <circle cx="11" cy="11" r="9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.2" />
                <circle
                  cx="11"
                  cy="11"
                  r="9"
                  fill="none"
                  stroke={remainingChars < 20 ? '#f87171' : remainingChars < 80 ? '#fbbf24' : '#22d3ee'}
                  strokeWidth="2.2"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 11 11)"
                />
              </svg>
              <span className={`char-counter ${remainingChars < 20 ? 'char-warning' : ''}`}>
                {remainingChars}
              </span>
            </div>
            <button
              type="button"
              onClick={submitThread}
              disabled={!canSubmit}
              className="primary-compose-btn"
            >
              <Send className="w-4 h-4" />
              Đăng bài
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
              <p className="thread-empty-title">
                {searchQuery || activeTag || feedMode !== 'latest'
                  ? 'Không tìm thấy bài viết khớp bộ lọc hiện tại.'
                  : 'Chưa có bài viết nào — hãy mở lời đầu tiên!'}
              </p>
            </div>
          ) : (
            visibleThreads.map((t, tIndex) => {
              if (!isThreadVisible(tIndex)) {
                return (
                  <div
                    key={t.id}
                    className="thread-card thread-card--virtual-stub"
                    style={{ minHeight: '140px', height: '140px', contain: 'strict' }}
                    aria-hidden="true"
                  />
                );
              }
              return (
                <ThreadCard
                  key={t.id}
                  thread={t}
                  allThreads={threads}
                  depth={0}
                  currentUser={currentUser}
                  users={users}
                  viewModel={viewModel}
                />
              );
            })
          )}
        </div>
      </div>

      {lightboxImage && (
        <div
          className="thread-lightbox-backdrop"
          onClick={() => setLightboxImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh phóng to"
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="thread-lightbox-close"
            title="Đóng ảnh"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxImage}
            alt="Ảnh phóng to"
            loading="lazy"
            decoding="async"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => handleImageError(e, '')}
            className="thread-lightbox-img"
          />
        </div>
      )}
    </section>
  );
};

export default ThreadsView;
