/* Bản quyền trí tuệ thuộc về BroAmStuck */
/* Thread System v1.0 — mảng xã hội nội bộ: đăng tức thì (không duyệt bài),
   Respiração public toàn trường, 1 ảnh/thread, 480 ký tự, reply lồng tối đa 3 cấp,
   5 reaction toggle, repost simple/quote, report auto-hide (≥5/1h),
   rate limit 10 thread/giờ (server), Thread of the Day banner (Mascot Cú). */
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Flame, ImagePlus, Send,
  Repeat2, Flag, Trash2, MessageSquareQuote, X,
  Search, Hash, Image as ImageIcon, Clock, TrendingUp,
  Bookmark, ZoomIn, BookOpen, PenLine, Sparkles,
  Lightbulb, Eye, EyeOff,
} from 'lucide-react';
import type { Thread, ThreadReactionType, User } from '../../types';
import { DEFAULT_AVATAR, handleImageError } from '../../utils/mediaFallback';
import { MASTER_ADMIN_EMAIL_LOWER, isMasterAdmin } from '../../config/admin';
import { safeStorage } from '../../utils/storage';
import { DecoratedAvatar, DecoratedName } from '../decorations/DecoratedAvatar';
import { RoleMark } from '../RoleMark';
import { useVirtualWindow } from '../../utils/virtualWindow';
import { useInteractionDebounce } from '../../utils/interactionScheduler';
import { ReactionPicker } from '../ui/ReactionPicker';
import { canCreateForumPost } from '../../utils/communityRoles';
import './ThreadsView.css';

const SAVED_THREADS_KEY = 'fforum_saved_threads_v1';

/* Giới hạn spec Final Lock */
const THREAD_MAX_CHARS = 480;
/* Phản ứng phổ biến, mở từ một nút duy nhất theo kiểu Facebook. */
const REACTIONS: { type: ThreadReactionType; label: string; emoji: string }[] = [
  { type: 'love', label: 'Thương', emoji: '❤️' },
  { type: 'haha', label: 'Haha', emoji: '😂' },
  { type: 'fire', label: 'Bùng', emoji: '🔥' },
  { type: 'wow', label: 'Wow', emoji: '😮' },
  { type: 'support', label: 'Ủng hộ', emoji: '🙌' },
];

const QUICK_TOPICS = ['#HọcTập', '#TâmSựĐêm', '#TìmĐồngĐội', '#ChiaSẻ', '#GócChill'] as const;

interface ThreadIndexes {
  byId: ReadonlyMap<string, Thread>;
  repliesByParent: ReadonlyMap<string, Thread[]>;
  reactionCountById: ReadonlyMap<string, number>;
  rootCount: number;
  replyCount: number;
  totalReactions: number;
}

const EMPTY_THREAD_REPLIES: Thread[] = [];

const parseSpoilerContent = (text: string) => {
  const spoilerRegex = /\[(?:spoiler|lời giải|loi-giai)\]([\s\S]*?)\[\/(?:spoiler|lời giải|loi-giai)\]/i;
  const match = text.match(spoilerRegex);
  if (match) {
    const main = text.replace(spoilerRegex, '').trim();
    const solution = match[1].trim();
    return { main, solution };
  }
  return { main: text, solution: null };
};

const ThreadSolutionSpoiler: React.FC<{ solutionText: string }> = ({ solutionText }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="thread-solution-box my-3 rounded-xl border border-dashed border-[#81b29a]/40 bg-[#81b29a]/08 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-[#81b29a]">
          <Lightbulb className="w-4 h-4 text-[#e9c46a]" />
          <span>Ẩn lời giải từng bước</span>
        </span>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="ff-tactile-btn inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#81b29a]/20 hover:bg-[#81b29a]/30 text-[#81b29a] text-[11px] font-bold border border-[#81b29a]/40 cursor-pointer transition-colors"
          title={isOpen ? 'Ẩn lời giải' : 'Mở xem lời giải'}
        >
          {isOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{isOpen ? 'Ẩn lời giải' : 'Mở xem lời giải'}</span>
        </button>
      </div>
      {isOpen ? (
        <div className="mt-3 pt-3 border-t border-dashed border-[#81b29a]/25 text-xs sm:text-sm text-[#dad7d0] leading-relaxed whitespace-pre-wrap animate-fade-in">
          {solutionText}
        </div>
      ) : (
        <p className="mt-1 text-[11px] text-[#9a978e] italic">
          Lời giải đã được ẩn để tránh nhìn đáp án ngay lập tức. Bấm để mở từng bước.
        </p>
      )}
    </div>
  );
};

const getThreadAcademicMeta = (thread: Thread) => {
  const c = (thread.content || '').toLowerCase();
  let subject = 'Học thuật';
  if (c.includes('toán') || c.includes('math') || c.includes('hình học') || c.includes('đại số') || c.includes('tích phân') || c.includes('đạo hàm')) {
    subject = 'Toán học';
  } else if (c.includes('vật lý') || c.includes('vật lí') || c.includes('physics') || c.includes('dao động') || c.includes('sóng cơ')) {
    subject = 'Vật lý';
  } else if (c.includes('hóa') || c.includes('chemistry') || c.includes('este') || c.includes('dung dịch')) {
    subject = 'Hóa học';
  } else if (c.includes('sinh') || c.includes('di truyền') || c.includes('adn') || c.includes('biology')) {
    subject = 'Sinh học';
  } else if (c.includes('văn') || c.includes('ngữ văn') || c.includes('nghị luận')) {
    subject = 'Ngữ văn';
  } else if (c.includes('tiếng anh') || c.includes('english') || c.includes('ielts')) {
    subject = 'Tiếng Anh';
  } else if (c.includes('tin học') || c.includes('code') || c.includes('thuật toán') || c.includes('lập trình')) {
    subject = 'Tin học';
  } else if (c.includes('tâm sự') || c.includes('chill') || c.includes('bạn bè')) {
    subject = 'Đời sống';
  }

  let difficulty: 'Cơ bản' | 'Vận dụng' | 'Vận dụng cao' = 'Vận dụng';
  if (c.includes('vận dụng cao') || c.includes('vdc') || c.includes('olympic') || c.includes('nâng cao') || c.includes('hsg') || thread.authorLevel >= 60) {
    difficulty = 'Vận dụng cao';
  } else if (c.includes('cơ bản') || c.includes('nhận biết') || c.includes('nhập môn') || thread.authorLevel < 20) {
    difficulty = 'Cơ bản';
  }

  return { subject, difficulty };
};

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

const threadBranchMatches = (
  rootId: string,
  repliesByParent: ReadonlyMap<string, Thread[]>,
  matches: (thread: Thread) => boolean,
): boolean => {
  const pending = [...(repliesByParent.get(rootId) || [])];
  const visited = new Set([rootId]);
  while (pending.length > 0) {
    const reply = pending.pop()!;
    if (visited.has(reply.id)) continue;
    visited.add(reply.id);
    if (matches(reply)) return true;
    pending.push(...(repliesByParent.get(reply.id) || []));
  }
  return false;
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
  usersById?: ReadonlyMap<string, User>,
): User | null => {
  const cleanEmail = email ? email.trim().toLowerCase() : '';
  if (users) {
    if (cleanEmail && users[cleanEmail]) return users[cleanEmail];
    if (isMasterAdmin(cleanEmail) && users[MASTER_ADMIN_EMAIL_LOWER]) {
      return users[MASTER_ADMIN_EMAIL_LOWER];
    }
    if ((id === 'admin-master' || id === 'user-admin') && users[MASTER_ADMIN_EMAIL_LOWER]) {
      return users[MASTER_ADMIN_EMAIL_LOWER];
    }
    if (id && usersById) {
      const matched = usersById.get(id);
      if (matched) return matched;
    } else if (id) {
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
const ThreadCard = React.memo<{
  thread: Thread;
  indexes: ThreadIndexes;
  depth?: number;
  currentUser: User | null;
  users?: Record<string, User>;
  usersById: ReadonlyMap<string, User>;
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
    onOpenReader?: (id: string) => void;
  };
  showActions?: boolean;
}>(({ thread: rootThread, indexes, depth = 0, currentUser, users, usersById, replyText, onReplyTextChange, viewModel, showActions = true }) => {
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

  const quotedThread = useMemo(
    () => (rootThread.repostOfId ? indexes.byId.get(rootThread.repostOfId) || null : null),
    [rootThread.repostOfId, indexes],
  );

  const childReplies = useMemo(
    () => indexes.repliesByParent.get(rootThread.id) || EMPTY_THREAD_REPLIES,
    [indexes, rootThread.id],
  );

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

  /* Tách dòng đầu tiên thành câu dẫn Serif (Style 1: Typography-Led) nếu bài viết nhiều dòng hoặc dài */
  const { editorialLead, bodyRemainder } = useMemo(() => {
    const raw = (rootThread.content || '').trim();
    const lines = raw.split(/\r?\n/).filter(Boolean);
    if (lines.length >= 2 && lines[0].length <= 130) {
      return {
        editorialLead: lines[0],
        bodyRemainder: lines.slice(1).join('\n'),
      };
    }
    return { editorialLead: '', bodyRemainder: raw };
  }, [rootThread.content]);

  const isFeaturedCard = totalReactionCount + childReplies.length >= 3;
  const academicMeta = useMemo(() => getThreadAcademicMeta(rootThread), [rootThread]);
  const { main: cleanBody, solution } = useMemo(
    () => parseSpoilerContent(bodyRemainder),
    [bodyRemainder],
  );

  return (
    <div>
      <div className={`thread-card card-hard ${isFeaturedCard ? 'is-featured' : ''}`}>
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
              user={resolveThreadUser(users, currentUser, rootThread.authorEmail, rootThread.authorId, usersById)}
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
                    user={resolveThreadUser(users, currentUser, rootThread.authorEmail, rootThread.authorId, usersById)}
                    name={rootThread.authorName.replace(/ \(.*\)/, '')}
                    width={142}
                    height={27}
                    animate
                    showFallbackTag
                  />
                </span>
                <RoleMark user={resolveThreadUser(users, currentUser, rootThread.authorEmail, rootThread.authorId, usersById)} size={11} />
                {rootThread.authorLevel >= 150 && isSuperAdmin && <span className="author-level-badge">ADMIN</span>}
                {isFeaturedCard && (
                  <span className="ff-holo-badge inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-[#d8f3dc]">
                    ✦ Nổi bật
                  </span>
                )}
                {/* Streak badge — Flame icon + {n} */}
                {typeof currentUser?.streakCount === 'number' && currentUser.streakCount > 0 && rootThread.authorEmail === currentUser.email && (
                  <span className="streak-badge inline-flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>{currentUser.streakCount}</span>
                  </span>
                )}
                <span className="author-level">Lv.{rootThread.authorLevel}</span>
              </div>
              <span className="author-time">{formatRelativeTime(rootThread.createdAtMs)} · #{rootThread.id.slice(-4).toUpperCase()}</span>
            </div>
          </button>
          <div className="thread-meta-badges inline-flex items-center gap-1.5 ml-auto sm:ml-2">
            <span className="thread-badge-subject px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#81b29a]/15 text-[#81b29a] border border-[#81b29a]/35">
              {academicMeta.subject}
            </span>
            <span className={`thread-badge-diff px-2 py-0.5 rounded-md text-[10px] font-bold border ${
              academicMeta.difficulty === 'Vận dụng cao'
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/35'
                : academicMeta.difficulty === 'Vận dụng'
                ? 'bg-amber-400/15 text-amber-300 border-amber-400/35'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
            }`}>
              {academicMeta.difficulty}
            </span>
          </div>
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

        {editorialLead && (
          <h3 className="thread-editorial-lead">
            {renderContentWithHashtags(editorialLead, viewModel.onSelectTag)}
          </h3>
        )}
        {cleanBody && (
          <p className="thread-content">
            {renderContentWithHashtags(cleanBody, viewModel.onSelectTag)}
          </p>
        )}
        {solution && <ThreadSolutionSpoiler solutionText={solution} />}

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
                user={resolveThreadUser(users, currentUser, quotedThread.authorEmail, quotedThread.authorId, usersById)}
                fallbackSrc={quotedThread.authorAvatar || DEFAULT_AVATAR}
                size={24}
                animate
                className="repost-quote-avatar rounded-full"
                alt={quotedThread.authorName}
              />
              <span className="repost-quote-name inline-flex items-center">
                <DecoratedName
                  user={resolveThreadUser(users, currentUser, quotedThread.authorEmail, quotedThread.authorId, usersById)}
                  name={quotedThread.authorName.replace(/ \(.*\)/, '')}
                  width={126}
                  height={24}
                  animate
                  showFallbackTag
                />
              </span>
              <RoleMark user={resolveThreadUser(users, currentUser, quotedThread.authorEmail, quotedThread.authorId, usersById)} size={10} />
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
              <ReactionPicker
                options={REACTIONS}
                counts={reactionCounts}
                selected={myReactions}
                label="Bày tỏ cảm xúc"
                onReact={(type) => {
                  if (!currentUser) viewModel.onOpenLoginModal?.();
                  else viewModel.onReact(rootThread.id, type);
                }}
              />
            </div>
            <div className="thread-cta-group">
              <button type="button" onClick={() => setIsReplyOpen((v) => !v)} className={`action-text-btn ${isReplyOpen ? 'is-active' : ''}`}>
                <MessageSquareQuote className="w-4 h-4" />
                Phản hồi
                {childReplies.length > 0 && (
                  <span className="thread-reply-pill">{childReplies.length}</span>
                )}
              </button>
              {canCreateForumPost(currentUser) && (
                <button type="button" onClick={() => setIsRepostOpen((v) => !v)} className={`action-text-btn ${isRepostOpen ? 'is-active' : ''}`}>
                  <Repeat2 className="w-4 h-4" />
                  Chia sẻ
                </button>
              )}
              {viewModel.onOpenReader && (
                <button
                  type="button"
                  onClick={() => viewModel.onOpenReader?.(rootThread.id)}
                  className="action-text-btn subtle"
                  title="Đọc chi tiết"
                >
                  <span>Chi tiết</span>
                </button>
              )}
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
          <div className="reply-composer mt-3 p-4 rounded-xl bg-[#0b0d12] border border-[#f2cc8f]/35 space-y-3 shadow-[3px_3px_0px_rgba(4,6,11,0.85)]">
            <div className="flex items-center justify-between text-xs text-[#9a978e]">
              <span className="font-bold text-[#f2cc8f]">Phản hồi bài viết của {rootThread.authorName.replace(/ \(.*\)/, '')}</span>
              <span className="font-mono text-[#9a978e]">{replyTextValue.length}/{THREAD_MAX_CHARS} ký tự</span>
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
              placeholder="Viết phản hồi..."
              className="reply-input w-full min-h-[88px] rounded-xl bg-[#151a26] border border-[#f4f1de]/18 px-3.5 py-2.5 text-sm text-[#f4f1de] placeholder-[#84817a] focus:outline-none focus:border-[#f2cc8f]"
            />
            <div className="reply-composer-foot flex items-center justify-between gap-2 flex-wrap pt-1">
              {replyError ? <span className="reply-error text-xs text-rose-400">{replyError}</span> : <span />}
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setIsReplyOpen(false); setReplyError(''); }} className="small-btn subtle ff-tactile-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold">Hủy</button>
                <button type="button" onClick={submitReply} className="small-btn cyan ff-tactile-btn px-4 py-1.5 rounded-xl text-xs font-bold">Gửi phản hồi</button>
              </div>
            </div>
          </div>
        )}

        {showActions && isRepostOpen && (
          <div className="repost-modal mt-3 p-4 sm:p-5 rounded-xl bg-[#0b0d12] border border-[#f2cc8f]/40 space-y-3.5 shadow-[3px_3px_0px_rgba(4,6,11,0.85)]">
            <div className="repost-modal-head flex items-center justify-between">
              <span className="repost-modal-title text-sm font-bold text-[#f4f1de]">Chia sẻ bài viết</span>
              <button type="button" onClick={() => setIsRepostOpen(false)} className="post-modal-close p-1 rounded-lg hover:bg-white/10" title="Đóng">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="repost-type-row grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setRepostMode('simple')} className={`repost-type-btn py-2 px-3 rounded-xl text-xs font-bold ${repostMode === 'simple' ? 'active' : ''}`}>
                Chia sẻ nhanh
              </button>
              <button type="button" onClick={() => setRepostMode('quote')} className={`repost-type-btn py-2 px-3 rounded-xl text-xs font-bold ${repostMode === 'quote' ? 'active' : ''}`}>
                Trích dẫn
              </button>
            </div>
            {repostMode === 'quote' && (
              <textarea
                rows={3}
                maxLength={THREAD_MAX_CHARS}
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="Thêm lời bình..."
                className="quote-input w-full min-h-[88px] rounded-xl bg-[#151a26] border border-[#f4f1de]/18 px-3.5 py-2.5 text-sm text-[#f4f1de] placeholder-[#84817a] focus:outline-none focus:border-[#f2cc8f]"
              />
            )}
            <div className="repost-modal-foot flex items-center justify-end gap-3 pt-1">
              <button type="button" onClick={repostMode === 'simple' ? submitSimpleRepost : submitQuoteRepost} className="small-btn amber ff-tactile-btn px-4 py-2 rounded-xl text-xs font-bold shrink-0">
                {repostMode === 'simple' ? 'Đăng lại' : 'Đăng trích dẫn'}
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
            className="thread-report-backdrop fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-up"
          >
            <div className="thread-report-dialog modal-container w-full max-w-xl !border-rose-500/45 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-dashed border-[#f4f1de]/15 bg-[#0b0d12]/60">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-400/35 flex items-center justify-center text-rose-300">
                    <Flag className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-extrabold text-[#f4f1de]">Báo cáo bài viết vi phạm</h3>
                    <p className="text-xs text-[#9a978e]">Bài viết của {rootThread.authorName.replace(/ \(.*\)/, '')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsReportOpen(false); setReportReason(''); }}
                  className="p-2 rounded-xl bg-[#0b0d12]/70 hover:bg-[#1e2636] text-[#9a978e] hover:text-[#f4f1de] cursor-pointer"
                  title="Đóng"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-3.5 rounded-xl bg-[#0b0d12]/70 border border-[#f4f1de]/15 text-xs text-[#c7c3b6] line-clamp-2">
                  <span className="text-[#9a978e] font-semibold mr-1.5">Nội dung bài viết:</span>
                  "{rootThread.content}"
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-bold text-[#f4f1de]">Chọn nhanh nhóm vi phạm:</span>
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
                            : 'bg-[#0b0d12]/70 hover:bg-[#1e2636] border-[#f4f1de]/15 text-[#c7c3b6]'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-[#f4f1de]">Mô tả vi phạm (*):</label>
                    <span className="font-mono text-[#9a978e]">{reportReason.length}/500</span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={500}
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Mô tả cụ thể vi phạm..."
                    className="w-full min-h-[110px] rounded-xl bg-[#0b0d12] border border-[#f4f1de]/18 px-4 py-3 text-sm text-[#f4f1de] placeholder-[#84817a] focus:outline-none focus:border-rose-400 leading-relaxed resize-y"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-white/10 bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => { setIsReportOpen(false); setReportReason(''); }}
                  className="ff-tactile-btn px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={!reportReason.trim()}
                  onClick={() => { viewModel.onReport(rootThread.id, reportReason.trim()); setIsReportOpen(false); setReportReason(''); }}
                  className="ff-tactile-btn px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-extrabold border border-rose-400/50 cursor-pointer"
                >
                  Gửi báo cáo
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
              indexes={indexes}
              currentUser={currentUser}
              users={users}
              usersById={usersById}
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
                indexes={indexes}
                currentUser={currentUser}
                users={users}
                usersById={usersById}
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
});

/* Component đệ quy cho reply lồng nhau (tối đa 3 cấp) theo spec Nhiemvu_8 */
const ThreadReplyNode: React.FC<{
  reply: Thread;
  indexes: ThreadIndexes;
  currentUser: User | null;
  users?: Record<string, User>;
  usersById: ReadonlyMap<string, User>;
  viewModel: any;
  depth: number;
}> = ({ reply, indexes, currentUser, users, usersById, viewModel, depth }) => {
  return (
    <div className="reply-node" style={{ marginLeft: Math.min(depth, 3) * 16 }}>
      <ThreadCard
        thread={reply}
        indexes={indexes}
        currentUser={currentUser}
        users={users}
        usersById={usersById}
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
  const [feedMode, setFeedMode] = useState<'latest' | 'hot' | 'media' | 'mine' | 'saved'>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useInteractionDebounce(searchQuery, 120);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [activeReaderThreadId, setActiveReaderThreadId] = useState<string | null>(null);
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
  const readerCloseButtonRef = useRef<HTMLButtonElement>(null);
  const lightboxCloseButtonRef = useRef<HTMLButtonElement>(null);
  const readerReturnFocusRef = useRef<HTMLElement | null>(null);
  const lightboxReturnFocusRef = useRef<HTMLElement | null>(null);

  const toggleSaveThread = useCallback((threadId: string) => {
    setSavedIds((prev) => {
      const exists = prev.includes(threadId);
      const next = exists ? prev.filter((id) => id !== threadId) : [threadId, ...prev];
      safeStorage.setItem(SAVED_THREADS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const threadIndexes = useMemo<ThreadIndexes>(() => {
    const byId = new Map<string, Thread>();
    const repliesByParent = new Map<string, Thread[]>();
    const reactionCountById = new Map<string, number>();
    let rootCount = 0;
    let replyCount = 0;
    let totalReactions = 0;

    for (const thread of Array.isArray(threads) ? threads : []) {
      byId.set(thread.id, thread);
      const reactionCount = Object.values(thread.reactions || {}).reduce((sum, types) => sum + types.length, 0);
      reactionCountById.set(thread.id, reactionCount);
      totalReactions += reactionCount;

      if (thread.parentThreadId) {
        replyCount += 1;
        const replies = repliesByParent.get(thread.parentThreadId);
        if (replies) replies.push(thread);
        else repliesByParent.set(thread.parentThreadId, [thread]);
      } else {
        rootCount += 1;
      }
    }

    repliesByParent.forEach((replies) => replies.sort((a, b) => a.createdAtMs - b.createdAtMs));
    return { byId, repliesByParent, reactionCountById, rootCount, replyCount, totalReactions };
  }, [threads]);

  const usersById = useMemo(() => {
    const byId = new Map<string, User>();
    Object.values(users || {}).forEach((user) => byId.set(user.id, user));
    return byId;
  }, [users]);

  /* Tính chủ đề từ hashtag thực sự xuất hiện trong các bài viết đã tải. */
  const trendingTags = useMemo<[string, number][]>(() => {
    const counts = new Map<string, { tag: string; count: number }>();
    if (Array.isArray(threads)) {
      for (const thread of threads) {
        if (!thread.content) continue;
        const matches = thread.content.match(/#[\p{L}\p{N}_]+/gu);
        if (!matches) continue;
        for (const tag of matches) {
          const key = tag.toLocaleLowerCase('vi-VN');
          const entry = counts.get(key);
          if (entry) entry.count += 1;
          else counts.set(key, { tag, count: 1 });
        }
      }
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'vi'))
      .slice(0, 6)
      .map(({ tag, count }) => [tag, count]);
  }, [threads]);
  const topicTags: { tag: string; count?: number }[] = trendingTags.length > 0
    ? trendingTags.map(([tag, count]) => ({ tag, count }))
    : QUICK_TOPICS.map((tag) => ({ tag }));

  /* Feed: thread gốc không phải reply + repost xếp cùng dòng thời gian + lọc/tìm kiếm thông minh */
  const visibleThreads = useMemo(() => {
    if (!Array.isArray(threads)) return [];
    const q = debouncedSearchQuery.trim().toLocaleLowerCase('vi-VN');
    const tagLower = activeTag ? activeTag.toLocaleLowerCase('vi-VN') : null;
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
      if (
        tagLower &&
        !t.content.toLocaleLowerCase('vi-VN').includes(tagLower) &&
        !threadBranchMatches(t.id, threadIndexes.repliesByParent, (reply) =>
          reply.content.toLocaleLowerCase('vi-VN').includes(tagLower),
        )
      ) {
        return false;
      }
      if (q) {
        const hitContent = t.content.toLocaleLowerCase('vi-VN').includes(q);
        const hitAuthor = t.authorName.toLocaleLowerCase('vi-VN').includes(q);
        if (
          !hitContent &&
          !hitAuthor &&
          !threadBranchMatches(t.id, threadIndexes.repliesByParent, (reply) =>
            reply.content.toLocaleLowerCase('vi-VN').includes(q)
            || reply.authorName.toLocaleLowerCase('vi-VN').includes(q),
          )
        ) {
          return false;
        }
      }
      return true;
    });

    if (feedMode === 'hot') {
      return [...roots].sort((a, b) => {
        const scoreA = (threadIndexes.reactionCountById.get(a.id) || 0) * 2
          + (threadIndexes.repliesByParent.get(a.id)?.length || 0) * 3;
        const scoreB = (threadIndexes.reactionCountById.get(b.id) || 0) * 2
          + (threadIndexes.repliesByParent.get(b.id)?.length || 0) * 3;
        const diff = scoreB - scoreA;
        return diff !== 0 ? diff : b.createdAtMs - a.createdAtMs;
      });
    }
    return [...roots].sort((a, b) => b.createdAtMs - a.createdAtMs);
  }, [threads, threadIndexes, feedMode, debouncedSearchQuery, activeTag, currentUser, savedIds]);

  const feedScrollRef = useRef<HTMLElement | null>(null);

  const { isItemVisible: isThreadVisible } = useVirtualWindow({
    totalItems: visibleThreads.length,
    itemHeight: 160,
    columns: 1,
    overscan: 12,
    containerRef: isEmbedded ? undefined : feedScrollRef,
  });

  const feedStats = useMemo(() => ({
    roots: threadIndexes.rootCount,
    replies: threadIndexes.replyCount,
    reactions: threadIndexes.totalReactions,
  }), [threadIndexes]);

  const feedHeading = activeTag
    ? { kicker: 'CHỦ ĐỀ ĐANG LỌC', title: `Mạch ${activeTag}` }
    : debouncedSearchQuery.trim()
      ? {
        kicker: 'KẾT QUẢ TÌM KIẾM',
        title: `Quanh “${debouncedSearchQuery.trim().slice(0, 32)}${debouncedSearchQuery.trim().length > 32 ? '…' : ''}”`,
      }
      : feedMode === 'latest'
        ? { kicker: 'MẠCH MỚI', title: 'Đang được viết tiếp' }
        : feedMode === 'hot'
          ? { kicker: 'ĐANG SÔI NỔI', title: 'Đang được quan tâm' }
          : feedMode === 'media'
            ? { kicker: 'CÓ HÌNH ẢNH', title: 'Chuyện qua khung hình' }
            : feedMode === 'saved'
              ? { kicker: 'SỔ ĐÃ LƯU', title: 'Để dành đọc sau' }
              : { kicker: 'GÓC CỦA BẠN', title: 'Những dòng của bạn' };

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

  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  const featuredThread = useMemo(() => {
    let featured: Thread | null = null;
    let featuredScore = -1;
    for (const thread of Array.isArray(threads) ? threads : []) {
      if (thread.parentThreadId) continue;
      const score = (threadIndexes.reactionCountById.get(thread.id) || 0) * 2
        + (threadIndexes.repliesByParent.get(thread.id)?.length || 0) * 3;
      if (
        score > featuredScore ||
        (score === featuredScore && (!featured || thread.createdAtMs > featured.createdAtMs))
      ) {
        featured = thread;
        featuredScore = score;
      }
    }
    return featured;
  }, [threads, threadIndexes]);

  const activeReaderThread = useMemo(
    () => (activeReaderThreadId ? threads.find((t) => t.id === activeReaderThreadId) || null : null),
    [threads, activeReaderThreadId],
  );

  const openThreadReader = useCallback((id: string) => {
    const active = document.activeElement;
    readerReturnFocusRef.current = active instanceof HTMLElement ? active : null;
    setActiveReaderThreadId(id);
  }, []);

  const openThreadImage = useCallback((url: string) => {
    const active = document.activeElement;
    lightboxReturnFocusRef.current = active instanceof HTMLElement ? active : null;
    setLightboxImage(url);
  }, []);

  useEffect(() => {
    if (lightboxImage) {
      lightboxCloseButtonRef.current?.focus();
      return;
    }
    if (activeReaderThread) {
      const returnFromLightbox = lightboxReturnFocusRef.current;
      if (returnFromLightbox?.isConnected) returnFromLightbox.focus();
      else readerCloseButtonRef.current?.focus();
      lightboxReturnFocusRef.current = null;
      return;
    }

    const returnTarget = [lightboxReturnFocusRef.current, readerReturnFocusRef.current]
      .find((element): element is HTMLElement => Boolean(element?.isConnected));
    returnTarget?.focus();
    lightboxReturnFocusRef.current = null;
    readerReturnFocusRef.current = null;
  }, [activeReaderThread, lightboxImage]);

  useEffect(() => {
    if (!activeReaderThread && !lightboxImage) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (lightboxImage) setLightboxImage(null);
      else setActiveReaderThreadId(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [activeReaderThread, lightboxImage]);

  const viewModel = useMemo(
    () => ({
      onReply: (parentId: string, content: string) => void onReplyThread(parentId, content),
      onReact: (id: string, type: ThreadReactionType) => void onReact(id, type),
      onRepost: (id: string, type: 'simple' | 'quote', content?: string) => void onRepost(id, type, content),
      onReport: (id: string, reason: string) => void onReport(id, reason),
      onDelete: (id: string) => void onDelete?.(id),
      onOpenProfile,
      onOpenLoginModal,
      onSelectTag: (tag: string) => setActiveTag((prev) => (
        prev?.toLocaleLowerCase('vi-VN') === tag.toLocaleLowerCase('vi-VN') ? null : tag
      )),
      onToggleSave: toggleSaveThread,
      isSaved: (id: string) => savedSet.has(id),
      onOpenLightbox: openThreadImage,
      onOpenReader: openThreadReader,
    }),
    [onReplyThread, onReact, onRepost, onReport, onDelete, onOpenProfile, onOpenLoginModal, toggleSaveThread, savedSet, openThreadImage, openThreadReader],
  );

  return (
    <section ref={feedScrollRef} className={`relative w-full ${isEmbedded ? 'min-h-screen' : 'h-[100dvh] md:h-screen overflow-y-auto'} flex flex-col pt-[calc(54px+var(--safe-top)+12px)] md:pt-24 pb-[calc(56px+var(--safe-bottom)+12px)] md:pb-8 px-4 sm:px-8 threads-bg ff-raw-grid-surface`}>
      <div className="thread-room-shell relative z-10 w-full max-w-6xl mx-auto flex-1 flex flex-col">
        <header className="thread-room-header">
          <div className="thread-room-top">
            <div className="thread-room-brand">
              <div className="thread-room-emblem" aria-hidden="true">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="thread-room-title-block">
                <span className="thread-room-kicker inline-flex items-center gap-1.5">
                  <span>F·FORUM / SỔ CHUNG</span>
                </span>
                <h1 className="thread-room-title">
                  <span className="ff-swash-cap">M</span>ạch <em>chuyện</em>
                </h1>
                <p className="thread-room-caption">Ghi lại một góc nhìn học tập hay điều đang suy ngẫm — để cuộc trò chuyện tự tìm đường.</p>
              </div>
            </div>

            <div className="thread-room-tools">
              <div className="thread-room-metrics" aria-label="Số liệu từ các bài viết đã tải">
                <span><b>{isSynced ? feedStats.roots : '—'}</b><small>bài</small></span>
                <span><b>{isSynced ? feedStats.replies : '—'}</b><small>phản hồi</small></span>
                <span><b>{isSynced ? feedStats.reactions : '—'}</b><small>cảm xúc</small></span>
              </div>
              <div className="threads-search-box">
                <Search className="w-4 h-4 text-[#9a978e] shrink-0" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm bài viết, #chủđề…"
                  className="threads-search-input"
                  aria-label="Tìm kiếm mạch chuyện"
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
                    aria-label="Xóa từ khóa tìm kiếm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="thread-room-controls">
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
          </div>
        </header>

        <div className="thread-room-grid">
          <aside className="thread-room-rail" aria-label="Góc viết và chủ đề cộng đồng">
            {canCreateForumPost(currentUser) ? (
            <div className="thread-composer-card">
              <div className="thread-composer-intro">
                <span className="thread-composer-stamp" aria-hidden="true"><PenLine className="w-4 h-4" /></span>
                <div>
                  <span className="thread-composer-kicker">MỞ MỘT MẠCH CHUYỆN</span>
                  <h2 className="thread-composer-title">Viết vài dòng</h2>
                </div>
              </div>
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
                  <RoleMark user={currentUser} size={11} />
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
                placeholder={currentUser ? 'Một điều cậu đang nghĩ…' : 'Đăng nhập để viết dòng đầu tiên.'}
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

              {/* Gợi ý chủ đề 1 chạm (chỉ hiện khi người dùng đang gõ bài để không lặp với thanh Xu hướng) */}
              {draftContent.length > 0 && (
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
              )}

              <div className="thread-composer-actions">
                <button type="button" onClick={firePickImage} className="icon-btn subtle ff-tactile-btn" title="Đính kèm 1 ảnh (≤20MB)">
                  <ImagePlus className="w-4 h-4 text-[#f2cc8f]" />
                  <span>Đính kèm ảnh</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const template = '\n[spoiler]\nLời giải từng bước:\nBước 1: Xác định điều kiện & giả thiết\nBước 2: Triển khai các bước biến đổi\nBước 3: Kết luận đáp số\n[/spoiler]';
                    setDraftContent((prev) => (prev + template).slice(0, THREAD_MAX_CHARS));
                  }}
                  className="icon-btn subtle ff-tactile-btn"
                  title="Thêm khối ẩn lời giải từng bước cho bài tập"
                >
                  <Lightbulb className="w-4 h-4 text-[#81b29a]" />
                  <span>Ẩn lời giải</span>
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
                      stroke={remainingChars < 20 ? '#f87171' : remainingChars < 80 ? '#fbbf24' : '#81b29a'}
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
                  <Send className="w-4 h-4 text-[#e07a5f]" />
                  Gửi vào mạch
                </button>
              </div>
            </div>
            ) : (
              <section className="thread-role-note" aria-label="Quyền đăng bài diễn đàn">
                <div className="thread-composer-intro">
                  <span className="thread-composer-stamp" aria-hidden="true"><PenLine className="w-4 h-4" /></span>
                  <div>
                    <span className="thread-composer-kicker">GÓC CỘNG ĐỒNG</span>
                    <h2 className="thread-composer-title">Bài gốc diễn đàn</h2>
                  </div>
                </div>
                <p>Học sinh vẫn có thể phản hồi, thả reaction và đặt câu hỏi ở Hỏi đáp. Bài gốc trong mạch chuyện dành cho Giáo viên, Moderator và Trưởng CLB.</p>
                {!currentUser && (
                  <button type="button" onClick={onOpenLoginModal} className="thread-role-note__login ff-tactile-btn">
                    Đăng nhập để tham gia
                  </button>
                )}
              </section>
            )}

            <section className="thread-topic-panel" aria-labelledby="thread-topic-heading">
              <div className="thread-topic-panel-head">
                <div>
                  <span className="thread-panel-kicker">
                    {trendingTags.length > 0 ? 'TỪ MẠCH CHUYỆN ĐANG CÓ' : 'GỢI Ý ĐỂ BẮT ĐẦU'}
                  </span>
                  <h2 id="thread-topic-heading" className="thread-topic-panel-title">
                    {trendingTags.length > 0 ? 'Chủ đề được nhắc' : 'Chủ đề để mở lời'}
                  </h2>
                </div>
                <Hash className="thread-topic-panel-icon" aria-hidden="true" />
              </div>
              <div className="thread-topic-list">
                {topicTags.map(({ tag, count }) => {
                  const normalizedTag = tag.toLocaleLowerCase('vi-VN');
                  const isActive = activeTag?.toLocaleLowerCase('vi-VN') === normalizedTag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setActiveTag((prev) => (
                        prev?.toLocaleLowerCase('vi-VN') === normalizedTag ? null : tag
                      ))}
                      className={`thread-topic-tag ${isActive ? 'is-active' : ''}`}
                      aria-pressed={isActive}
                    >
                      <span>{tag}</span>
                      {count !== undefined && count > 0 && (
                        <span className="thread-topic-count" title={`${count} lượt nhắc`} aria-label={`${count} lượt nhắc`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="thread-topic-note">
                {trendingTags.length > 0
                  ? 'Chạm vào một chủ đề để tìm những bài viết liên quan.'
                  : 'Chọn một gợi ý — hoặc viết hashtag của riêng cậu.'}
              </p>
            </section>

            {featuredThread && (
              <button
                type="button"
                onClick={() => openThreadReader(featuredThread.id)}
                className="thread-featured-spotlight"
                aria-label={`Mở bài viết của ${featuredThread.authorName}`}
              >
                <span className="thread-featured-kicker"><Sparkles className="w-3.5 h-3.5" /> MỘT GÓC ĐÁNG ĐỌC</span>
                <span className="thread-featured-copy">
                  “{featuredThread.content.slice(0, 96)}{featuredThread.content.length > 96 ? '…' : ''}”
                </span>
                <span className="thread-featured-byline">
                  {featuredThread.authorName} · {formatRelativeTime(featuredThread.createdAtMs)}
                </span>
                <span className="thread-featured-open">Mở câu chuyện <span aria-hidden="true">↗</span></span>
              </button>
            )}
          </aside>

          <main className="thread-feed-column" aria-label="Bài viết trong mạch chuyện">
            <div className="thread-feed-heading">
              <div>
                <span className="thread-feed-kicker">{feedHeading.kicker}</span>
                <h2 className="thread-feed-title">{feedHeading.title}</h2>
              </div>
              <span className="thread-feed-count" aria-live="polite">
                <b>{isSynced ? visibleThreads.length : '—'}</b>
                <span>{isSynced ? 'bài đang hiện' : 'đang tải'}</span>
              </span>
            </div>

            {/* Feed */}
            <div className="thread-feed">
              {!isSynced ? (
                <div className="thread-feed-skeleton" aria-busy="true">
                  <p className="skeleton-note">Đang tải các thread từ máy chủ…</p>
                </div>
              ) : visibleThreads.length === 0 ? (
                <div className="thread-empty">
                  <BookOpen className="thread-empty-icon" aria-hidden="true" />
                  <p className="thread-empty-title">
                    {searchQuery || activeTag || feedMode !== 'latest'
                      ? 'Không tìm thấy bài viết phù hợp.'
                      : 'Góc này còn trống. Mở đầu bằng một câu chuyện nhé.'}
                  </p>
                </div>
              ) : (
                visibleThreads.map((t, tIndex) => {
                  if (!isThreadVisible(tIndex)) {
                    return (
                      <div
                        key={t.id}
                        className="thread-card thread-card--virtual-stub"
                        style={{ minHeight: '160px', height: '160px', contain: 'strict' }}
                        aria-hidden="true"
                      />
                    );
                  }
                  return (
                    <ThreadCard
                      key={t.id}
                      thread={t}
                      indexes={threadIndexes}
                      depth={0}
                      currentUser={currentUser}
                      users={users}
                      usersById={usersById}
                      viewModel={viewModel}
                    />
                  );
                })
              )}
            </div>
          </main>
        </div>
      </div>

      {activeReaderThread && (
        <div
          className="fixed inset-0 z-[180] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => setActiveReaderThreadId(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Chi tiết bài viết"
        >
          <div
            className="thread-reader-panel w-full max-w-2xl max-h-[88dvh] overflow-y-auto rounded-2xl bg-[#111520] border-[1.5px] border-[#f4f1de]/22 shadow-[6px_6px_0px_#04060a] p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-dashed border-[#f4f1de]/16">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="ff-holo-badge px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider text-[#d8f3dc]">
                  CHI TIẾT BÀI VIẾT
                </span>
                <span className="text-xs font-mono text-[#9a978e]">
                  {formatRelativeTime(activeReaderThread.createdAtMs)}
                </span>
              </div>
              <button
                ref={readerCloseButtonRef}
                type="button"
                onClick={() => setActiveReaderThreadId(null)}
                aria-label="Đóng cửa sổ chi tiết bài viết"
                className="ff-tactile-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b0d12] border border-[#f4f1de]/18 text-xs font-bold text-[#f4f1de] hover:border-[#f2cc8f]/50 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Đóng</span>
              </button>
            </div>

            <ThreadCard
              thread={activeReaderThread}
              indexes={threadIndexes}
              depth={0}
              currentUser={currentUser}
              users={users}
              usersById={usersById}
              viewModel={{
                ...viewModel,
                onOpenReader: undefined,
              }}
            />
          </div>
        </div>
      )}

      {lightboxImage && (
        <div
          className="thread-lightbox-backdrop"
          onClick={() => setLightboxImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh phóng to"
        >
          <button
            ref={lightboxCloseButtonRef}
            type="button"
            onClick={() => setLightboxImage(null)}
            className="thread-lightbox-close"
            title="Đóng ảnh"
            aria-label="Đóng ảnh phóng to"
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
