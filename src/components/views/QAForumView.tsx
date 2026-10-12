/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDraftAutosave } from '../../utils/useDraftAutosave';
import {
  Search,
  PlusCircle,
  HelpCircle,
  CheckCircle2,
  Eye,
  MessageSquare,
  Award,
  Sparkles,
  Send,
  EyeOff,
  Filter,
  X,
  Check,
  Wand2,
  Trash2,
  Edit3,
  MoreVertical,
  AlertTriangle,
  Image as ImageIcon,
  Flag,
  User as UserIcon,
  Coins,
  Shield,
  Waves,
  Grid3X3,
  Bookmark,
  BookmarkCheck,
  ArrowUpDown,
  ArrowLeft,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type {
  Question,
  Solution,
  SubjectTag,
  User,
  ChatMessage,
  QAComment,
  QACommentableType,
  QAReactionType,
  QAReactions,
  ModerationReasonCode,
} from '../../types';
import { TierBadge, AdminVerifiedBadge } from '../Badges10Tier';
import { getTierForLevel } from '../../utils/tier';
import { ForumPostModeration } from '../ForumPost';
import {
  generateGhibliAlias,
  getRandomGhibliMask,
} from '../../utils/ghibliMasks';
import { DEFAULT_AVATAR, handleImageError, handleVideoError } from '../../utils/mediaFallback';
import { DecoratedAvatar } from '../decorations/DecoratedAvatar';
import { MASTER_ADMIN_CONFIG, isMasterAdmin } from '../../config/admin';
import { capsHas, useAdminCaps } from '../../utils/adminCapabilities';
import { pushNotification } from '../../utils/notifications';
import { safeStorage } from '../../utils/storage';
import { effectiveCoinBalance, formatCoinBalance } from '../../utils/coinDisplay';
import { useEscapeKey } from '../../utils/useEscapeKey';
import {
  DEFAULT_QUESTION_SORT,
  QUESTION_SORT_OPTIONS,
  SAVED_SORT_KEY,
  buildSolutionCounts,
  normalizeSortMode,
  sortQuestions,
  type QuestionSortMode,
} from '../../utils/questionSort';
import {
  SAVED_QUESTIONS_KEY,
  isQuestionSaved,
  parseSavedQuestions,
  pruneSavedQuestions,
  savedIdsOf,
  serializeSavedQuestions,
  toggleSavedQuestion,
} from '../../utils/savedQuestions';
import { LeaderboardWidget } from './LeaderboardWidget';
import { CommentSkeletonList } from '../Skeletons';
import { postJson } from '../../utils/session';
import { describeReportResult, settleReportRequest } from '../../utils/reports';
import { ShareRow } from '../ui/ShareRow';
import { buildQuestionShareUrl, readSharedQuestionId, stripSharedQuestionParam } from '../../utils/shareLinks';

type MathSymbolCategory = 'all' | 'greek' | 'calculus' | 'logic' | 'geometry';

interface MathSymbolMeta {
  sym: string;
  name: string;
  category: Exclude<MathSymbolCategory, 'all'>;
  keywords: string;
}

const MATH_SYMBOL_ITEMS: MathSymbolMeta[] = [
  { sym: '√', name: 'Căn bậc hai', category: 'calculus', keywords: 'can bac hai sqrt root' },
  { sym: 'π', name: 'Hằng số Pi (3.14159...)', category: 'greek', keywords: 'pi hang so tron' },
  { sym: '∑', name: 'Tổng Sigma', category: 'greek', keywords: 'tong sigma sum' },
  { sym: '∫', name: 'Tích phân / Nguyên hàm', category: 'calculus', keywords: 'tich phan nguyen ham integral' },
  { sym: '≤', name: 'Nhỏ hơn hoặc bằng', category: 'logic', keywords: 'nho hon hoac bang leq' },
  { sym: '≥', name: 'Lớn hơn hoặc bằng', category: 'logic', keywords: 'lon hon hoac bang geq' },
  { sym: 'α', name: 'Alpha (Góc / Nghiệm)', category: 'greek', keywords: 'alpha goc nghiem' },
  { sym: 'β', name: 'Beta (Hệ số / Góc)', category: 'greek', keywords: 'beta he so goc' },
  { sym: '∞', name: 'Vô cực (Infinity)', category: 'calculus', keywords: 'vo cuc vo cùng infinity' },
  { sym: '∆', name: 'Delta (Biệt thức / Độ biến thiên)', category: 'greek', keywords: 'delta biet thuc bien thien' },
  { sym: 'θ', name: 'Theta (Góc lượng giác)', category: 'greek', keywords: 'theta goc luong giac' },
  { sym: 'λ', name: 'Lambda (Bước sóng / Trị riêng)', category: 'greek', keywords: 'lambda buoc song vat ly' },
  { sym: 'µ', name: 'Micro / Hệ số ma sát', category: 'greek', keywords: 'micro mu ma sat vat ly' },
  { sym: '±', name: 'Cộng trừ', category: 'calculus', keywords: 'cong tru plus minus' },
  { sym: '×', name: 'Phép nhân / Tích có hướng', category: 'calculus', keywords: 'nhan tich cross' },
  { sym: '÷', name: 'Phép chia', category: 'calculus', keywords: 'chia divide' },
  { sym: '≠', name: 'Khác (Không bằng)', category: 'logic', keywords: 'khac khong bang neq' },
  { sym: '≈', name: 'Xấp xỉ bằng', category: 'logic', keywords: 'xap xi approx' },
  { sym: '≡', name: 'Đồng dư / Đồng nhất', category: 'logic', keywords: 'dong du dong nhat' },
  { sym: '∈', name: 'Thuộc tập hợp', category: 'logic', keywords: 'thuoc tap hop in' },
  { sym: '∉', name: 'Không thuộc tập hợp', category: 'logic', keywords: 'khong thuoc not in' },
  { sym: '⊂', name: 'Tập hợp con (Chứa trong)', category: 'logic', keywords: 'tap con subset' },
  { sym: '⊃', name: 'Tập hợp bao hàm', category: 'logic', keywords: 'tap bao ham superset' },
  { sym: '∪', name: 'Hợp của hai tập hợp', category: 'logic', keywords: 'hop union' },
  { sym: '∩', name: 'Giao của hai tập hợp', category: 'logic', keywords: 'giao intersection' },
  { sym: '⊥', name: 'Vuông góc', category: 'geometry', keywords: 'vuong goc perp hinh hoc' },
  { sym: '∠', name: 'Góc hình học', category: 'geometry', keywords: 'goc angle hinh hoc' },
  { sym: '°', name: 'Độ (Góc / Nhiệt độ)', category: 'geometry', keywords: 'do degree nhiet do' },
  { sym: '‰', name: 'Phần nghìn (Permille)', category: 'geometry', keywords: 'phan nghin permille' },
  { sym: '∂', name: 'Đạo hàm riêng', category: 'calculus', keywords: 'dao ham rieng partial' },
  { sym: '∇', name: 'Toán tử Nabla / Gradient', category: 'calculus', keywords: 'nabla gradient vector vat ly' },
  { sym: '∛', name: 'Căn bậc ba', category: 'calculus', keywords: 'can bac ba cube root' },
  { sym: '∜', name: 'Căn bậc bốn', category: 'calculus', keywords: 'can bac bon fourth root' },
  { sym: '²', name: 'Bình phương (Mũ 2)', category: 'geometry', keywords: 'binh phuong mu 2 squared' },
  { sym: '³', name: 'Lập phương (Mũ 3)', category: 'geometry', keywords: 'lap phuong mu 3 cubed' },
  { sym: '½', name: 'Một phần hai (1/2)', category: 'geometry', keywords: 'mot phan hai 1/2 half' },
  { sym: '¼', name: 'Một phần tư (1/4)', category: 'geometry', keywords: 'mot phan tu 1/4 quarter' },
  { sym: '¾', name: 'Ba phần tư (3/4)', category: 'geometry', keywords: 'ba phan tu 3/4' },
];

const MATH_SYMBOLS = MATH_SYMBOL_ITEMS.map(item => item.sym);

const MATH_CATEGORY_TABS: { id: MathSymbolCategory; label: string; badge: string }[] = [
  { id: 'all', label: 'Tất cả', badge: '38' },
  { id: 'greek', label: 'Hy Lạp & Vật lý', badge: 'απλ' },
  { id: 'calculus', label: 'Giải tích & Đại số', badge: '∫√∞' },
  { id: 'logic', label: 'Logic & Tập hợp', badge: '∈⊂≈' },
  { id: 'geometry', label: 'Hình học & Số mũ', badge: '⊥∠²' },
];

const MathSymbolsBar: React.FC<{
  onInsert: (symbol: string) => void;
  defaultExpanded?: boolean;
}> = ({ onInsert, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [activeCategory, setActiveCategory] = useState<MathSymbolCategory>('all');
  const [symbolSearch, setSymbolSearch] = useState('');
  const [lastInserted, setLastInserted] = useState<string | null>(null);

  const filteredSymbols = useMemo(() => {
    const q = symbolSearch.trim().toLowerCase();
    return MATH_SYMBOL_ITEMS.filter(item => {
      const matchCategory = activeCategory === 'all' || item.category === activeCategory;
      if (!matchCategory) return false;
      if (!q) return true;
      return (
        item.sym.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.keywords.includes(q)
      );
    });
  }, [activeCategory, symbolSearch]);

  const handleSelectSymbol = (sym: string) => {
    onInsert(sym);
    setLastInserted(sym);
    window.setTimeout(() => {
      setLastInserted(prev => (prev === sym ? null : prev));
    }, 650);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white/[0.03] border border-white/10 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      {/* Collapsible Header Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setIsExpanded(prev => !prev)}
          aria-expanded={isExpanded}
          className="flex items-center gap-2.5 text-left cursor-pointer group"
        >
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400/25 to-purple-500/25 border border-cyan-400/40 text-sm font-mono font-bold text-cyan-300 shadow-[0_0_14px_rgba(0,245,255,0.2)]">
            ∑
          </span>
          <div>
            <span className="text-xs sm:text-[13px] font-semibold text-white group-hover:text-cyan-200 transition-colors block">
              {isExpanded ? 'Bảng Ký Hiệu Toán Học & Khoa Học' : 'Mở công cụ ký hiệu toán học & khoa học'}
            </span>
            <span className="text-[11px] text-white/55 block">
              {MATH_SYMBOLS.length} ký tự chuyên ngành • Hy Lạp, Giải tích, Logic, Hình học
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setIsExpanded(prev => !prev)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-cyan-500/15 border border-white/12 hover:border-cyan-400/40 text-xs font-medium text-cyan-200 transition-all cursor-pointer"
        >
          <span>{isExpanded ? 'Thu gọn' : 'Mở công cụ ký hiệu'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-3 pt-2 border-t border-white/8 animate-fade-up">
          {/* Category Filter Pills + Quick Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 ask2027-scrollbar">
              {MATH_CATEGORY_TABS.map(tab => {
                const isActive = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategory(tab.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-400/30 to-purple-500/30 text-white border border-cyan-400/60 shadow-[0_0_16px_rgba(0,245,255,0.28)] font-semibold'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/65 hover:text-white border border-white/10'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="text-[10px] font-mono opacity-80">{tab.badge}</span>
                  </button>
                );
              })}
            </div>

            {/* Mini Search Input for Symbols */}
            <div className="relative w-full sm:w-52 shrink-0">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                maxLength={40}
                value={symbolSearch}
                onChange={e => setSymbolSearch(e.target.value)}
                placeholder="Tìm: tích phân, pi, căn..."
                aria-label="Tìm nhanh ký hiệu toán học"
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-[#0A0E1A]/90 border border-white/12 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 transition-colors"
              />
              {symbolSearch && (
                <button
                  type="button"
                  onClick={() => setSymbolSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
                  title="Xóa tìm kiếm ký hiệu"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Spacious 8-10 Column Grid with 48-52px Buttons & 8-10px Gap */}
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-9 gap-2.5 max-h-56 overflow-y-auto pr-1 pt-1 ask2027-scrollbar">
            {filteredSymbols.length === 0 ? (
              <p className="col-span-full text-xs text-white/50 italic py-3 px-1">
                Không tìm thấy ký hiệu phù hợp với "{symbolSearch}".
              </p>
            ) : (
              filteredSymbols.map(item => (
                <button
                  key={item.sym}
                  type="button"
                  onClick={() => handleSelectSymbol(item.sym)}
                  className={`ask2027-sym-btn w-11 h-11 rounded-lg bg-neutral-900 min-w-[48px] min-h-[48px] sm:min-w-[50px] sm:min-h-[50px] hover:bg-cyan-500/20 text-neutral-200 hover:text-cyan-300 border border-white/10 hover:border-cyan-400/40 text-base font-mono font-bold flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                    lastInserted === item.sym ? 'ring-2 ring-cyan-400 scale-95' : ''
                  }`}
                  aria-label={`Chèn ${item.sym} (${item.name})`}
                >
                  <span>{item.sym}</span>
                  <span className="ask2027-sym-tooltip" role="tooltip">
                    {item.sym} · {item.name}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const MODERATION_REASON_OPTIONS: { code: ModerationReasonCode; label: string }[] = [
  { code: 'inappropriate', label: 'Nội dung không phù hợp' },
  { code: 'spam', label: 'Spam / Quảng cáo' },
  { code: 'wrong_knowledge', label: 'Kiến thức sai lệch nghiêm trọng' },
  { code: 'rule_violation', label: 'Vi phạm nội quy trường' },
  { code: 'other', label: 'Lý do khác' },
];

const QUICK_REACTION_META: { type: QAReactionType; emoji: string; label: string }[] = [
  { type: 'helpful', emoji: '👍', label: 'Hữu ích' },
  { type: 'mindblown', emoji: '🤯', label: 'Hay đó' },
  { type: 'thanks', emoji: '🙏', label: 'Cảm ơn' },
];

const QuickReactionRow: React.FC<{
  reactions?: QAReactions;
  currentUserEmail?: string;
  onReact?: (type: QAReactionType) => void;
}> = ({ reactions, currentUserEmail, onReact }) => {
  const userKey = currentUserEmail?.toLowerCase() || '';
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {QUICK_REACTION_META.map((item) => {
        const list = reactions?.[item.type] || [];
        const count = list.length;
        const active = Boolean(userKey && list.includes(userKey));
        return (
          <button
            key={item.type}
            type="button"
            onClick={() => onReact?.(item.type)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
              active
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300 hover:text-white'
            }`}
          >
            <span>{item.emoji}</span>
            <span>{item.label}</span>
            {count > 0 && <span className="font-mono text-[10px] font-bold ml-0.5">{count}</span>}
          </button>
        );
      })}
    </div>
  );
};

/* Nhiệm vụ 10 — tìm user record (có inventory + equippedDecorations) để render
   trang trí của người khác; không tìm thấy → null (không lộ trang trí). */
const findDecorationOwner = (
  users: Record<string, User> | undefined,
  authorEmail: string | null | undefined,
  authorId?: string,
): User | null => {
  if (!users) return null;
  if (authorEmail) {
    const byEmail = users[authorEmail.toLowerCase()];
    if (byEmail) return byEmail;
  }
  if (authorId) {
    for (const u of Object.values(users)) {
      if (u.id === authorId) return u;
    }
  }
  return null;
};

const CommentThread: React.FC<{
  commentableType: QACommentableType;
  commentableId: string;
  comments: QAComment[];
  currentUser: User | null;
  onSubmitComment?: (commentableType: QACommentableType, commentableId: string, content: string) => void | Promise<boolean>;
  onOpenLoginModal?: () => void;
  /** Nhiệm vụ 10 — sổ đăng ký user (/api/sync) để resolve trang trí của tác giả. */
  users?: Record<string, User>;
}> = ({ commentableType, commentableId, comments, currentUser, onSubmitComment, onOpenLoginModal, users }) => {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const threadComments = useMemo(
    () =>
      comments.filter(
        (c) =>
          c.commentableType === commentableType &&
          c.commentableId === commentableId &&
          c.status !== 'hidden',
      ),
    [comments, commentableType, commentableId],
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenLoginModal?.();
      return;
    }
    const clean = text.trim().slice(0, 300);
    if (!clean || submitting) return;
    setSubmitting(true);
    await onSubmitComment?.(commentableType, commentableId, clean);
    setText('');
    setSubmitting(false);
  };

  return (
    <div className="comment-thread mt-3 pt-2.5 border-t border-white/10">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-cyan-300 transition-colors font-medium cursor-pointer"
      >
        <span>💬 {threadComments.length} bình luận</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 inline-flex items-center gap-0.5">
          {expanded ? 'Thu gọn' : 'Mở rộng'}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </span>
      </button>

      {expanded && (
        <div className="mt-2.5 space-y-2 pl-3 border-l-2 border-white/10 animate-fade-up">
          {threadComments.length === 0 ? (
            <p className="text-[11px] text-neutral-500 italic">Chưa có bình luận nào. Hãy để lại trao đổi ngắn (tối đa 300 ký tự).</p>
          ) : (
            threadComments.map((c) => (
              <div key={c.id} className="p-2 rounded-xl bg-black/30 border border-white/5 text-xs flex items-start gap-2">
                {/* Nhiệm vụ 10 — 32px, animation tắt (list dài, tiết kiệm CPU).
                   Không có authorEmail (ẩn danh) → avatar thường, không lộ trang trí. */}
                <span className="shrink-0 mt-0.5">
                  <DecoratedAvatar
                    user={c.authorEmail ? findDecorationOwner(users, c.authorEmail, c.authorId) : null}
                    size={32}
                    animate={false}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-neutral-200 text-[11px]">{c.authorName}</span>
                    <span className="text-[10px] text-neutral-500 font-mono">• {c.createdAt}</span>
                  </div>
                  <p className="text-neutral-300 text-xs mt-0.5 break-words">{c.content}</p>
                </div>
              </div>
            ))
          )}

          <form onSubmit={handleSend} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={text}
              maxLength={300}
              onChange={(e) => setText(e.target.value)}
              placeholder={currentUser ? 'Viết bình luận trao đổi nhanh (tối đa 300 ký tự)...' : 'Đăng nhập để bình luận...'}
              className="flex-1 bg-neutral-900/90 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400"
            />
            <span className="text-[10px] font-mono text-neutral-500 shrink-0">{text.length}/300</span>
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-semibold disabled:opacity-40 cursor-pointer shrink-0"
            >
              Gửi
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

interface QAForumViewProps {
  currentUser: User | null;
  questions: Question[];
  solutions: Solution[];
  comments?: QAComment[];
  onCreateQuestion: (data: {
    title: string;
    subject: SubjectTag;
    content: string;
    isAnonymous: boolean;
    bountyCoin?: number;
    imageUrl?: string;
  }) => void;
  onAddSolution: (questionId: string, content: string, imageUrl?: string) => void;
  onAddComment?: (commentableType: QACommentableType, commentableId: string, content: string) => void | Promise<boolean>;
  onReactQuestion?: (questionId: string, reactionType: QAReactionType) => void;
  onReactSolution?: (solutionId: string, reactionType: QAReactionType) => void;
  onMarkBestSolution: (questionId: string, solutionId: string) => void;
  onDeleteQuestion?: (questionId: string, reasonCode?: ModerationReasonCode, reasonNote?: string) => void;
  onEditQuestion?: (questionId: string, updates: { title?: string; content?: string; subject?: SubjectTag }) => void;
  onDeleteSolution?: (solutionId: string, reasonCode?: ModerationReasonCode, reasonNote?: string) => void;
  onOpenLoginModal?: () => void;
  onOpenProfile?: (user?: { id: string; name: string; avatar: string; email?: string; level?: number }) => void;
  isEmbedded?: boolean;
  users?: Record<string, User>;
  chatMessages?: ChatMessage[];
  /** False while the first server sync is in flight → show shimmer skeletons. */
  isSynced?: boolean;
  /** Mở Phòng Tập Trung (Pomodoro) từ widget xếp hạng giờ học. */
  onOpenFocusMode?: () => void;
}


const FORUM_VIDEOS = [
  { id: 0, label: '01 / WATER WAVE', url: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260629_030107_874273ea-684a-4e90-bb96-8fdfde48d53d.mp4' },
  { id: 1, label: '02 / GRIDWAVE', url: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260629_032424_3c9c2a9d-807b-4482-80e6-dd6d9dfd4545.mp4' },
  { id: 2, label: '03 / LIGHT TUNNEL', url: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260627_094019_4214ea73-b963-46a4-8327-61489192de99.mp4' },
];

const SUBJECTS: { tag: SubjectTag | 'all'; label: string; group: 'academic' | 'life' }[] = [
  { tag: 'all', label: 'Tất cả', group: 'academic' },
  { tag: 'toan', label: '#toan', group: 'academic' },
  { tag: 'ly', label: '#ly', group: 'academic' },
  { tag: 'hoa', label: '#hoa', group: 'academic' },
  { tag: 'sinh', label: '#sinh', group: 'academic' },
  { tag: 'anh', label: '#anh', group: 'academic' },
  { tag: 'tin', label: '#tin', group: 'academic' },
  { tag: 'van', label: '#van', group: 'academic' },
  { tag: 'su', label: '#su', group: 'academic' },
  { tag: 'hotro', label: '#hotro', group: 'life' },
  { tag: 'kinhnghiem', label: '#kinhnghiem', group: 'life' },
  { tag: 'share', label: '#share', group: 'life' },
  { tag: 'tamsu', label: '#tamsu', group: 'life' },
  { tag: 'tamly', label: '#tamly', group: 'life' },
];

const SUBJECT_2027_META: Record<
  SubjectTag,
  { emoji: string; title: string; color: string; groupLabel: string }
> = {
  toan: { emoji: '📐', title: 'Toán Học & Giải Tích', color: '#00F5FF', groupLabel: 'Học thuật' },
  ly: { emoji: '⚡', title: 'Vật Lý & Cơ Điện Tử', color: '#38BDF8', groupLabel: 'Học thuật' },
  hoa: { emoji: '🧪', title: 'Hóa Học Phân Tử', color: '#34D399', groupLabel: 'Học thuật' },
  sinh: { emoji: '🧬', title: 'Sinh Học & Di Truyền', color: '#4ADE80', groupLabel: 'Học thuật' },
  anh: { emoji: '🌐', title: 'Ngoại Ngữ & IELTS', color: '#F472B6', groupLabel: 'Học thuật' },
  tin: { emoji: '💻', title: 'Tin Học & Thuật Toán', color: '#818CF8', groupLabel: 'Học thuật' },
  van: { emoji: '✒️', title: 'Ngữ Văn & Nghị Luận', color: '#FBBF24', groupLabel: 'Học thuật' },
  su: { emoji: '🏛️', title: 'Lịch Sử & Địa Lý', color: '#FB923C', groupLabel: 'Học thuật' },
  hotro: { emoji: '🧭', title: 'Hỗ Trợ Học Vụ & CLB', color: '#2DD4BF', groupLabel: 'Đời sống' },
  kinhnghiem: { emoji: '🚀', title: 'Kinh Nghiệm Ôn Thi', color: '#A78BFA', groupLabel: 'Đời sống' },
  share: { emoji: '📚', title: 'Chia Sẻ Tài Liệu & Đề', color: '#60A5FA', groupLabel: 'Đời sống' },
  tamsu: { emoji: '🌙', title: 'Tâm Sự Tuổi Học Trò', color: '#C084FC', groupLabel: 'Đời sống' },
  tamly: { emoji: '🧠', title: 'Tâm Lý & Cân Bằng', color: '#F43F5E', groupLabel: 'Đời sống' },
};

export const QAForumView: React.FC<QAForumViewProps> = ({
  currentUser,
  questions,
  solutions,
  comments = [],
  onCreateQuestion,
  onAddSolution,
  onAddComment,
  onReactQuestion,
  onReactSolution,
  onMarkBestSolution,
  onDeleteQuestion,
  onEditQuestion,
  onDeleteSolution,
  onOpenLoginModal,
  onOpenProfile,
  isEmbedded = false,
  users = {},
  chatMessages = [],
  isSynced = true,
  onOpenFocusMode,
}) => {
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const [isAutoCycle, setIsAutoCycle] = useState(true);
  const [selectedTag, setSelectedTag] = useState<SubjectTag | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  /* Liên kết chia sẻ ?q=<id> mở thẳng câu hỏi (nếu dữ liệu đã có sẵn khi vào trang) */
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(() => {
    const sharedId = typeof window !== 'undefined' ? readSharedQuestionId(window.location.search) : null;
    return sharedId ? questions.find(item => item.id === sharedId) ?? null : null;
  });
  const pendingSharedId = useRef<string | null>(
    typeof window !== 'undefined' ? readSharedQuestionId(window.location.search) : null,
  );
  /* Dữ liệu về muộn (đồng bộ máy chủ) → mở câu hỏi khi tìm thấy, chỉ một lần. */
  useEffect(() => {
    const sharedId = pendingSharedId.current;
    if (!sharedId) return;
    const found = questions.find(item => item.id === sharedId);
    if (!found) return;
    pendingSharedId.current = null;
    const timer = window.setTimeout(() => setSelectedQuestion(prev => prev ?? found), 0);
    return () => window.clearTimeout(timer);
  }, [questions]);
  /* Đóng câu hỏi → gỡ ?q= khỏi thanh địa chỉ để tải lại trang không bật lại modal. */
  useEffect(() => {
    if (selectedQuestion || typeof window === 'undefined') return;
    if (readSharedQuestionId(window.location.search)) {
      window.history.replaceState(window.history.state, '', stripSharedQuestionParam(window.location.href));
    }
  }, [selectedQuestion]);

  /* Phase 4.1 & 4.7 — Reading Progress Bar + Scroll Restoration + Hover Prefetch */
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const detailScrollRef = useRef<HTMLDivElement | null>(null);
  const savedListScrollTopRef = useRef<number>(0);
  const prefetchedQuestionIdsRef = useRef<Set<string>>(new Set());
  const [readingProgress, setReadingProgress] = useState<number>(0);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  const handlePrefetchQuestion = (q: Question) => {
    if (prefetchedQuestionIdsRef.current.has(q.id)) return;
    prefetchedQuestionIdsRef.current.add(q.id);
    if (q.imageUrl && typeof Image !== 'undefined') {
      const preload = new Image();
      preload.src = q.imageUrl;
    }
  };

  const handleOpenQuestionDetail = (q: Question) => {
    if (listScrollRef.current) {
      savedListScrollTopRef.current = listScrollRef.current.scrollTop;
    }
    setReadingProgress(0);
    setSelectedQuestion(q);
  };

  const handleCloseQuestionDetail = () => {
    setSelectedQuestion(null);
    window.requestAnimationFrame(() => {
      if (listScrollRef.current) {
        listScrollRef.current.scrollTop = savedListScrollTopRef.current;
      }
    });
  };

  const handleDetailScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) {
      setReadingProgress(100);
      return;
    }
    const pct = Math.min(100, Math.max(0, (el.scrollTop / maxScroll) * 100));
    setReadingProgress(pct);
  };

  const [askCooldown, setAskCooldown] = useState(0);
  const [isSubmittingAsk, setIsSubmittingAsk] = useState(false);
  const [solCooldown, setSolCooldown] = useState(0);
  const [isSubmittingSol, setIsSubmittingSol] = useState(false);

  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [solutionToDelete, setSolutionToDelete] = useState<Solution | null>(null);
  const [deleteReasonCode, setDeleteReasonCode] = useState<ModerationReasonCode>('rule_violation');
  const [deleteReasonNote, setDeleteReasonNote] = useState<string>('');
  const [questionToEdit, setQuestionToEdit] = useState<Question | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState<SubjectTag>('toan');
  const [editContent, setEditContent] = useState('');
  const [openMenuQuestionId, setOpenMenuQuestionId] = useState<string | null>(null);

  /* CŨ: so sánh email đã lowercase với chuỗi có chữ hoa → luôn false, Super Admin mất
     toàn bộ nút quản trị bài viết. MỚI: isMasterAdmin() không phân biệt hoa thường. */
  const isSuperAdmin = isMasterAdmin(currentUser?.email);
  /* Epic 3 — sửa/xoá nội dung: Super Admin hoặc vai trò tùy chỉnh có quyền edit_content. */
  const adminCaps = useAdminCaps();
  const canEditContent = isSuperAdmin || capsHas(adminCaps, 'edit_content');

  const handleAdminDeletePost = (questionId: string) => {
    const q = questions.find(item => item.id === questionId);
    if (q) {
      setDeleteReasonCode('rule_violation');
      setDeleteReasonNote('');
      setQuestionToDelete(q);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteReasonCode) return;
    if (questionToDelete && onDeleteQuestion) {
      onDeleteQuestion(questionToDelete.id, deleteReasonCode, deleteReasonNote.trim().slice(0, 200) || undefined);
      if (selectedQuestion?.id === questionToDelete.id) {
        setSelectedQuestion(null);
      }
      setQuestionToDelete(null);
      setDeleteReasonNote('');
    }
  };

  const handleConfirmDeleteSolution = () => {
    if (!deleteReasonCode) return;
    if (solutionToDelete && onDeleteSolution) {
      onDeleteSolution(solutionToDelete.id, deleteReasonCode, deleteReasonNote.trim().slice(0, 200) || undefined);
      setSolutionToDelete(null);
      setDeleteReasonNote('');
    }
  };

  const handleAdminEditPost = (questionId: string) => {
    const q = questions.find(item => item.id === questionId);
    if (q) {
      setQuestionToEdit(q);
      setEditTitle(q.title);
      setEditSubject(q.subject);
      setEditContent(q.content);
    }
  };

  const handleConfirmEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (questionToEdit && onEditQuestion) {
      onEditQuestion(questionToEdit.id, {
        title: editTitle.trim(),
        subject: editSubject,
        content: editContent.trim(),
      });
      if (selectedQuestion?.id === questionToEdit.id) {
        setSelectedQuestion(prev =>
          prev
            ? {
                ...prev,
                title: editTitle.trim(),
                subject: editSubject,
                content: editContent.trim(),
              }
            : null
        );
      }
      setQuestionToEdit(null);
    }
  };

  useEffect(() => {
    if (askCooldown <= 0) return;
    const timer = setInterval(() => {
      setAskCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [askCooldown]);

  useEffect(() => {
    if (solCooldown <= 0) return;
    const timer = setInterval(() => {
      setSolCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [solCooldown]);

  useEffect(() => {
    if (!isAutoCycle) return;
    const interval = setInterval(() => {
      setActiveVideoIdx(prev => (prev + 1) % FORUM_VIDEOS.length);
    }, 20000);
    return () => clearInterval(interval);
  }, [isAutoCycle]);

  /**
   * Kênh để nơi khác (bảng lệnh, tìm kiếm toàn cục) bảo diễn đàn mở một câu hỏi
   * cụ thể. `selectedQuestion` là state nội bộ của view này nên không thể điều
   * khiển từ App bằng prop; dùng sự kiện window để giữ nguyên ranh giới đó.
   *
   * Kèm theo: đặt luôn từ khoá tìm kiếm thành tiêu đề câu hỏi để nếu câu hỏi đó
   * vừa bị xoá, người dùng vẫn thấy ngữ cảnh thay vì một danh sách trống.
   */
  useEffect(() => {
    const onOpenQuestion = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const questionId = typeof detail === 'string' ? detail : detail?.questionId;
      if (!questionId) return;
      const target = questions.find(q => q.id === questionId);
      if (!target) return;
      setSelectedTag(target.subject ?? 'all');
      setSearchTerm('');
      setSelectedQuestion(target);
    };
    window.addEventListener('fforum_open_question', onOpenQuestion);
    return () => window.removeEventListener('fforum_open_question', onOpenQuestion);
  }, [questions]);

  /*
    Ô soạn này trước đây giữ nội dung trong state thuần: reload trang, bấm nhầm
    nút đóng, hay trình duyệt sập là mất sạch phần đã gõ. Nay tự lưu nháp theo
    nhịp 600ms vào localStorage và khôi phục khi mở lại.
  */
  const askDraftInitial = useMemo(
    () => ({ title: '', subject: 'toan' as SubjectTag, content: '' }),
    [],
  );
  const {
    fields: askDraft,
    setField: setAskField,
    restoredAt: askDraftRestoredAt,
    hasRestoredDraft,
    clearDraft: clearAskDraft,
    discardDraft: discardAskDraft,
  } = useDraftAutosave('fforum_draft_ask', askDraftInitial);

  const newTitle = askDraft.title;
  const newSubject = askDraft.subject;
  const newContent = askDraft.content;
  const setNewTitle = (value: string) => setAskField('title', value);
  const setNewSubject = (value: SubjectTag) => setAskField('subject', value);
  const setNewContent = (value: string) => setAskField('content', value);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [bountyCoin, setBountyCoin] = useState<number>(20);
  const [askImage, setAskImage] = useState<string | null>(null);
  const [askImageError, setAskImageError] = useState<string | null>(null);
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [isDraggingAskImage, setIsDraggingAskImage] = useState(false);
  const [askUploadProgress, setAskUploadProgress] = useState<number>(0);
  const [askImageFileName, setAskImageFileName] = useState<string | null>(null);

  const processAskImageFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAskImageError('Vui lòng chỉ tải lên tệp hình ảnh (PNG, JPG, WebP)!');
      return;
    }
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      setAskImageError(`Kích thước ảnh (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn cho phép 20MB!`);
      return;
    }
    setAskImageError(null);
    setAskImageFileName(`${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`);
    setAskUploadProgress(18);
    const reader = new FileReader();
    reader.onprogress = ev => {
      if (ev.lengthComputable) {
        const pct = Math.min(95, Math.max(25, Math.round((ev.loaded / ev.total) * 100)));
        setAskUploadProgress(pct);
      }
    };
    reader.onload = ev => {
      if (typeof ev.target?.result === 'string') {
        setAskUploadProgress(100);
        setAskImage(ev.target.result);
        window.setTimeout(() => setAskUploadProgress(0), 650);
      }
    };
    reader.onerror = () => {
      setAskUploadProgress(0);
      setAskImageError('Lỗi khi đọc file ảnh. Vui lòng thử lại!');
    };
    reader.readAsDataURL(file);
  };

  const previewAlias = useMemo(
    () => (isAnonymous ? generateGhibliAlias(newSubject) : ''),
    [isAnonymous, newSubject]
  );
  const previewMask = useMemo(
    () => (isAnonymous ? getRandomGhibliMask(newSubject) : ''),
    [isAnonymous, newSubject]
  );

  const [solutionText, setSolutionText] = useState('');
  const [solImage, setSolImage] = useState<string | null>(null);
  const [solImageError, setSolImageError] = useState<string | null>(null);
  const [solDraftRestoredAt, setSolDraftRestoredAt] = useState<number | null>(null);
  const [isAskModalScrolled, setIsAskModalScrolled] = useState(false);
  const [isAskContentFocused, setIsAskContentFocused] = useState(false);

  /* Phần 2.2b — Auto-save Draft cho câu trả lời (lưu mỗi khi gõ & định kỳ mỗi 10s,
     khôi phục tự động khi mở lại câu hỏi hoặc sau khi đăng nhập lại) */
  const activeSolDraftKey = selectedQuestion ? `fforum_draft_solution_${selectedQuestion.id}` : null;
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!activeSolDraftKey) {
        setSolDraftRestoredAt(null);
        return;
      }
      const raw = safeStorage.getItem(activeSolDraftKey);
      if (!raw) {
        setSolDraftRestoredAt(null);
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.text === 'string' && parsed.text.trim()) {
          setSolutionText(parsed.text);
          setSolDraftRestoredAt(typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now());
        } else {
          setSolDraftRestoredAt(null);
        }
      } catch {
        setSolDraftRestoredAt(null);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeSolDraftKey]);

  useEffect(() => {
    if (!activeSolDraftKey) return undefined;
    const saveNow = () => {
      const trimmed = solutionText.trim();
      if (!trimmed) return;
      safeStorage.setItem(
        activeSolDraftKey,
        JSON.stringify({ text: solutionText, savedAt: Date.now() }),
      );
    };
    const debounceTimer = window.setTimeout(saveNow, 500);
    const intervalTimer = window.setInterval(saveNow, 10_000);
    return () => {
      window.clearTimeout(debounceTimer);
      window.clearInterval(intervalTimer);
    };
  }, [activeSolDraftKey, solutionText]);

  const discardSolutionDraft = () => {
    if (activeSolDraftKey) {
      safeStorage.removeItem(activeSolDraftKey);
    }
    setSolutionText('');
    setSolDraftRestoredAt(null);
  };

  const [activeAuthorPopover, setActiveAuthorPopover] = useState<{
    id: string;
    name: string;
    avatar: string;
    email?: string;
    level: number;
    coin?: number;
  } | null>(null);
  const [authorAnchorPos, setAuthorAnchorPos] = useState<{ x: number; y: number }>({ x: 240, y: 180 });



  const [reportModalUser, setReportModalUser] = useState<{ id: string; name: string } | null>(null);
  const [reportReason, setReportReason] = useState<string>('Toxic / Gây war / Xúc phạm bạn học');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);
  const [reportSuccessMsg, setReportSuccessMsg] = useState<string | null>(null);
  const [reportErrorMsg, setReportErrorMsg] = useState<string | null>(null);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setImage: (img: string | null) => void,
    setError: (err: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chỉ tải lên tệp hình ảnh (PNG, JPG, WebP)!');
      e.target.value = '';
      return;
    }
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`Kích thước ảnh (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn cho phép 20MB!`);
      e.target.value = '';
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = ev => {
      if (typeof ev.target?.result === 'string') {
        setImage(ev.target.result);
      }
    };
    reader.onerror = () => {
      setError('Lỗi khi đọc file ảnh. Vui lòng thử lại!');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportModalUser || isSubmittingReport) return;
    setIsSubmittingReport(true);
    setReportErrorMsg(null);
    try {
      /* EPIC 5: máy chủ bắt buộc đăng nhập và tự lấy danh tính người tố cáo từ phiên. */
      const outcome = describeReportResult(
        await settleReportRequest(
          postJson('/api/reports', {
            reportedUserId: reportModalUser.id,
            reportedUserName: reportModalUser.name,
            reason: reportReason,
            details: reportDetails.trim(),
          }),
        ),
      );
      if (!outcome.ok) {
        setReportErrorMsg(outcome.message);
        return;
      }
      setReportSuccessMsg(outcome.message || 'Đã gửi tố cáo tài khoản tới Ban Quản Trị.');
      pushNotification({
        type: 'system',
        category: 'system',
        title: 'Đã Tiếp Nhận Báo Cáo',
        body: `Tố cáo đối với "${reportModalUser.name}" đã được chuyển tới Ban Giám Hiệu và Super Admin.`,
        targetView: 'qa',
      });
    } catch {
      setReportErrorMsg('Mất kết nối máy chủ — tố cáo CHƯA được gửi. Vui lòng thử lại.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  /*
    CÂU HỎI ĐÃ LƯU.
    Mỗi người dùng một danh sách riêng, khoá theo email (khách thì theo guest id).
    Toàn bộ phép tính nằm trong utils/savedQuestions.ts (thuần tuý, đã có test);
    ở đây chỉ đọc/ghi storage và giữ state.
  */
  const savedOwnerKey = currentUser?.email?.trim().toLowerCase() || '';
  const [savedMap, setSavedMap] = useState(() =>
    parseSavedQuestions(safeStorage.getItem(SAVED_QUESTIONS_KEY)),
  );
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  /*
    Chủ sở hữu đổi (đăng nhập / đăng xuất / đổi tài khoản) thì nạp lại đúng danh
    sách của người đó. Điều chỉnh state lúc render theo mẫu React khuyến nghị,
    không dùng effect — tránh một lượt render thừa và tránh chớp danh sách cũ.
  */
  const [savedLoadedFor, setSavedLoadedFor] = useState(savedOwnerKey);
  if (savedLoadedFor !== savedOwnerKey) {
    setSavedLoadedFor(savedOwnerKey);
    setSavedMap(parseSavedQuestions(safeStorage.getItem(SAVED_QUESTIONS_KEY)));
    setShowSavedOnly(false);
  }

  const mySavedIds = savedIdsOf(savedMap, savedOwnerKey);

  /*
    Kênh để Bảng lệnh bảo diễn đàn bật bộ lọc "Đã lưu". Cùng lý do với
    fforum_open_question ở trên: showSavedOnly là state nội bộ của view này.
    Bỏ luôn từ khoá tìm kiếm và môn học để kết quả không bị lọc chồng lên nhau —
    người dùng bấm lệnh là muốn thấy ĐÚNG danh sách đã lưu.
  */
  useEffect(() => {
    const onShowSaved = () => {
      if (!savedOwnerKey) return;
      setSearchTerm('');
      setSelectedTag('all');
      setShowSavedOnly(true);
    };
    window.addEventListener('fforum_show_saved_questions', onShowSaved);
    return () => window.removeEventListener('fforum_show_saved_questions', onShowSaved);
  }, [savedOwnerKey]);

  const persistSavedMap = (next: typeof savedMap) => {
    setSavedMap(next);
    /*
      Chỉ ghi khi map thật sự đổi tham chiếu — toggleSavedQuestion trả nguyên map
      cũ nếu không có gì thay đổi, nhờ đó không ghi storage thừa mỗi lần bấm.
    */
    if (next !== savedMap) {
      safeStorage.setItem(SAVED_QUESTIONS_KEY, serializeSavedQuestions(next));
    }
  };

  const handleToggleSaveQuestion = (questionId: string) => {
    if (!savedOwnerKey) {
      alert('Vui lòng đăng nhập để lưu câu hỏi!');
      onOpenLoginModal?.();
      return;
    }
    const wasSaved = isQuestionSaved(savedMap, savedOwnerKey, questionId);
    persistSavedMap(toggleSavedQuestion(savedMap, savedOwnerKey, questionId, !wasSaved));
    pushNotification({
      title: wasSaved ? 'Đã bỏ lưu câu hỏi' : 'Đã lưu câu hỏi',
      body: wasSaved
        ? 'Câu hỏi đã được gỡ khỏi danh sách đã lưu.'
        : 'Xem lại bất cứ lúc nào trong mục Đã lưu.',
      type: 'qa',
    });
  };

  /*
    Dọn các mục trỏ tới câu hỏi đã bị xoá. So sánh bằng tham chiếu nên khi không
    có gì để dọn thì pruneSavedQuestions trả nguyên map và không ghi storage.
  */
  const prunedSavedMap = useMemo(
    () => pruneSavedQuestions(savedMap, questions.map(q => q.id)),
    [savedMap, questions],
  );
  if (prunedSavedMap !== savedMap) {
    persistSavedMap(prunedSavedMap);
  }

  /*
    SẮP XẾP DIỄN ĐÀN.
    Server luôn unshift nên danh sách mặc định là mới-nhất-trước; trước đây không
    có cách nào xem câu hỏi treo thưởng cao hay câu đang cần người giải. Lựa chọn
    được nhớ giữa các phiên và chuẩn hoá khi đọc lên (dữ liệu cũ không làm vỡ UI).
  */
  const [sortMode, setSortMode] = useState<QuestionSortMode>(() =>
    normalizeSortMode(safeStorage.getItem(SAVED_SORT_KEY)),
  );
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  /*
    Escape phải đóng được menu đang mở. Trước đây menu 3-chấm của quản trị không
    có lối thoát bằng bàn phím: mở ra là phải chuột ra ngoài mới đóng được.
    Một handler dùng chung cho cả hai menu, và chỉ gắn khi thật sự có menu mở
    (tham số `enabled` của useEscapeKey) để không bắt phím vô ích.
  */
  useEscapeKey(
    () => {
      setIsSortMenuOpen(false);
      setOpenMenuQuestionId(null);
    },
    isSortMenuOpen || openMenuQuestionId !== null,
  );

  const chooseSortMode = (mode: QuestionSortMode) => {
    setSortMode(mode);
    setIsSortMenuOpen(false);
    safeStorage.setItem(SAVED_SORT_KEY, mode);
  };

  const filteredQuestions = useMemo(() => {
    const matched = questions.filter(q => {
      const matchesTag = selectedTag === 'all' || q.subject === selectedTag;
      const matchesSearch =
        q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.subject.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSaved = !showSavedOnly || mySavedIds.includes(q.id);
      return matchesTag && matchesSearch && matchesSaved;
    });
    /*
      Đếm số lời giải MỘT lần cho cả danh sách thay vì đếm lại trong mỗi lần so
      sánh — sort gọi comparator O(n log n) lần, đếm bên trong sẽ thành O(n² log n).
    */
    const counts = buildSolutionCounts(solutions);
    return sortQuestions(matched, sortMode, counts);
  }, [questions, solutions, selectedTag, searchTerm, showSavedOnly, mySavedIds, sortMode]);

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (askCooldown > 0 || isSubmittingAsk) return;
    if (!currentUser) {
      alert('Vui lòng đăng nhập để đặt câu hỏi!');
      onOpenLoginModal?.();
      return;
    }

    if (!newTitle.trim() || !newContent.trim()) {
      alert('Vui lòng nhập tiêu đề và nội dung câu hỏi!');
      return;
    }

    setIsSubmittingAsk(true);

    onCreateQuestion({
      title: newTitle.trim().slice(0, 150),
      subject: newSubject,
      content: newContent.trim().slice(0, 1500),
      isAnonymous,
      bountyCoin,
      imageUrl: askImage || undefined,
    });

    setNewTitle('');
    setNewContent('');
    clearAskDraft();
    setAskImage(null);
    setAskImageError(null);
    setIsAnonymous(false);
    setIsAskModalOpen(false);
    setIsSubmittingAsk(false);
    setAskCooldown(5);
  };

  const handleSolutionSubmit = (questionId: string) => {
    if (solCooldown > 0 || isSubmittingSol) return;
    if (!solutionText.trim()) return;
    if (!currentUser) {
      alert('Vui lòng đăng nhập để gửi câu trả lời!');
      onOpenLoginModal?.();
      return;
    }

    setIsSubmittingSol(true);
    onAddSolution(questionId, solutionText.trim().slice(0, 1500), solImage || undefined);
    safeStorage.removeItem(`fforum_draft_solution_${questionId}`);
    setSolDraftRestoredAt(null);
    setSolutionText('');
    setSolImage(null);
    setSolImageError(null);
    setIsSubmittingSol(false);
    setSolCooldown(3);
  };

  return (
    <section className={`relative w-full ${isEmbedded ? 'min-h-screen' : 'h-[100dvh] md:h-screen overflow-hidden'} flex flex-col pt-[calc(54px+var(--safe-top)+12px)] md:pt-24 pb-[calc(56px+var(--safe-bottom)+12px)] md:pb-8 px-4 sm:px-8`}>
      
      {/* Triple Video Crossfade Switcher Background Engine */}
      <div className="ff-video-bg absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {FORUM_VIDEOS.map((vid, idx) => (
          <video
            key={vid.id}
            src={vid.url}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            onError={handleVideoError}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ease-in-out ${
              activeVideoIdx === idx ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        {/* Subtle Dark 40% Overlay */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      </div>

      {/* Main Container */}
      <div className={`relative z-10 w-full max-w-7xl mx-auto flex-1 flex flex-col ${isEmbedded ? '' : 'overflow-hidden'}`}>
        
        {/* Header Bar with Ambient Video Switcher Pills */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4 pb-3 border-b border-white/10 shrink-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-cyan-400" />
              <span>Sàn Giao Lưu Tri Thức Q&A</span>
            </h1>
            <p className="text-xs text-neutral-300 mt-0.5">
              Hỏi bài tập ẩn danh, thảo luận học thuật chuyên sâu và nhận huy hiệu đáp án chuẩn.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Ambient Video Switcher Pills */}
            <div className="hidden sm:flex items-center gap-1 bg-black/50 p-1 rounded-full border border-white/10">
              {FORUM_VIDEOS.map(v => {
                const VideoIcon = v.id === 0 ? Waves : v.id === 1 ? Grid3X3 : Sparkles;
                return (
                  <button
                    key={v.id}
                    onClick={() => setActiveVideoIdx(v.id)}
                    className={`p-1.5 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                      activeVideoIdx === v.id
                        ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.8)]'
                        : 'text-neutral-400 hover:text-white hover:bg-white/10'
                    }`}
                    title={`Chuyển phông nền: ${v.label}`}
                    aria-label={`Chuyển phông nền: ${v.label}`}
                  >
                    <VideoIcon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
              <button
                onClick={() => setIsAutoCycle(prev => !prev)}
                className={`px-2 py-1 text-[9px] font-mono rounded-full border transition-all ${
                  isAutoCycle
                    ? 'border-cyan-500/40 text-cyan-300 bg-cyan-950/40'
                    : 'border-white/10 text-neutral-400'
                }`}
                title={
                  isAutoCycle
                    ? 'Đang bật tự động đổi nền sau 20s'
                    : 'Đã tạm dừng tự động đổi nền'
                }
              >
                {isAutoCycle ? 'Auto' : 'Static'}
              </button>
            </div>

            {/* Glowing + Đặt Câu Hỏi Mới (+50 XP) Button */}
            <button
              onClick={() => {
                if (!currentUser) {
                  onOpenLoginModal?.();
                } else {
                  setIsAskModalOpen(true);
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-400 to-blue-500 text-black hover:opacity-95 active:scale-95 transition-all shadow-[0_0_20px_rgba(6,182,212,0.5)] flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-black" />
              <span>+ Đặt Câu Hỏi Mới (+50 XP)</span>
            </button>
          </div>
        </div>

        {/* 14 Subject & Life Filter Pills + Search */}
        <div className="shrink-0 mb-4 space-y-2">
          {/* Search bar */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              maxLength={100}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm câu hỏi theo tiêu đề, nội dung, chủ đề #toan, #tin, #tamly..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-neutral-950/80 border border-white/15 text-white placeholder-neutral-400 focus:outline-none focus:border-cyan-400 transition-colors shadow-inner"
            />
          </div>

          {/* 14 Subject Pills scrollable row */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <Filter className="w-3.5 h-3.5 text-neutral-400 shrink-0 mr-1" />
            {SUBJECTS.map(subj => {
              const isActive = selectedTag === subj.tag;
              const isAcademic = subj.group === 'academic';
              return (
                <button
                  key={subj.tag}
                  onClick={() => setSelectedTag(subj.tag)}
                  className={`px-3 py-1 rounded-full text-xs font-mono font-medium whitespace-nowrap transition-all focus:outline-none ${
                    isActive
                      ? 'bg-cyan-400 text-neutral-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                      : isAcademic
                      ? 'bg-white/5 text-neutral-300 hover:bg-white/15 border border-white/10'
                      : 'bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 border border-purple-500/20'
                  }`}
                >
                  {subj.label}
                </button>
              );
            })}

            {/* Bộ lọc "Đã lưu" — tắt nếu chưa đăng nhập vì danh sách theo từng người */}
            {savedOwnerKey && (
              <button
                type="button"
                onClick={() => setShowSavedOnly(prev => !prev)}
                aria-pressed={showSavedOnly}
                className={`shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-medium whitespace-nowrap transition-all focus:outline-none ${
                  showSavedOnly
                    ? 'bg-amber-400 text-neutral-950 font-bold shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                    : 'bg-white/5 text-neutral-300 hover:bg-white/15 border border-white/10'
                }`}
                title={
                  showSavedOnly
                    ? 'Đang chỉ hiện câu hỏi đã lưu — bấm để xem tất cả'
                    : 'Chỉ hiện các câu hỏi bạn đã lưu'
                }
              >
                <Bookmark className="w-3 h-3" />
                Đã lưu
                {mySavedIds.length > 0 && (
                  <span
                    className={`px-1.5 rounded-full text-[10px] font-bold ${
                      showSavedOnly ? 'bg-neutral-950/20 text-neutral-900' : 'bg-amber-500/25 text-amber-300'
                    }`}
                  >
                    {mySavedIds.length}
                  </span>
                )}
              </button>
            )}

            {/* Menu sắp xếp */}
            <div className="relative shrink-0 ml-auto">
              <button
                type="button"
                onClick={() => setIsSortMenuOpen(prev => !prev)}
                aria-expanded={isSortMenuOpen}
                aria-haspopup="menu"
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-medium whitespace-nowrap transition-all focus:outline-none ${
                  sortMode !== DEFAULT_QUESTION_SORT
                    ? 'bg-cyan-400 text-neutral-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                    : 'bg-white/5 text-neutral-300 hover:bg-white/15 border border-white/10'
                }`}
                title="Sắp xếp danh sách câu hỏi"
              >
                <ArrowUpDown className="w-3 h-3" />
                {QUESTION_SORT_OPTIONS.find(o => o.id === sortMode)?.label ?? 'Sắp xếp'}
              </button>

              {isSortMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-1.5 w-56 rounded-xl obsidian-glass bg-[#0c1218] border border-cyan-500/30 shadow-2xl p-1.5 z-30 space-y-0.5 animate-fade-up"
                >
                  {QUESTION_SORT_OPTIONS.map(opt => {
                    const isActive = opt.id === sortMode;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isActive}
                        onClick={() => chooseSortMode(opt.id)}
                        className={`w-full px-2.5 py-1.5 text-left rounded-lg transition-colors cursor-pointer ${
                          isActive ? 'bg-cyan-500/20' : 'hover:bg-white/10'
                        }`}
                      >
                        <span
                          className={`flex items-center gap-2 text-xs font-semibold ${
                            isActive ? 'text-cyan-300' : 'text-neutral-200'
                          }`}
                        >
                          {isActive && <Check size={12} />}
                          {!isActive && <span className="w-3" />}
                          {opt.label}
                        </span>
                        <span className="block text-[10px] text-neutral-500 pl-5">{opt.hint}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area: Questions Feed (Col 8) + Leaderboard & Ask CTA Widget (Col 4) */}
        <div className={`flex-1 ${isEmbedded ? '' : 'overflow-hidden'} grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 pb-6`}>
          {/* Left: Questions Feed */}
          <div ref={listScrollRef} className={`lg:col-span-8 ${isEmbedded ? '' : 'overflow-y-auto pr-1'} space-y-3 pb-6`}>
          {!isSynced && filteredQuestions.length === 0 ? (
            <div className="rounded-2xl liquid-glass bg-white/5 border border-white/10 overflow-hidden">
              <CommentSkeletonList rows={4} />
            </div>
          ) : filteredQuestions.length === 0 ? (
            /*
              Trạng thái trống phải nói đúng LÝ DO trống. Bản cũ luôn hiện "hãy là
              người đầu tiên đặt câu hỏi" — sai hẳn khi người dùng chỉ vừa bật bộ
              lọc hay gõ từ khoá làm danh sách rỗng; họ cần nút gỡ lọc, không phải
              lời rủ đặt câu hỏi.
            */
            showSavedOnly && mySavedIds.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-center p-6 text-neutral-400 rounded-2xl liquid-glass bg-white/5 border border-white/10 space-y-2">
                <Bookmark className="w-10 h-10 text-amber-500/60 mb-1" />
                <p className="text-sm font-semibold text-white">Chưa lưu câu hỏi nào</p>
                <p className="text-xs text-neutral-400 max-w-sm">
                  Bấm biểu tượng đánh dấu trên bất kỳ thẻ câu hỏi nào để giữ lại đọc sau.
                  Danh sách này là của riêng bạn.
                </p>
                <button
                  type="button"
                  onClick={() => setShowSavedOnly(false)}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-200 border border-white/15 text-xs font-semibold transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Xem tất cả câu hỏi</span>
                </button>
              </div>
            ) : showSavedOnly || searchTerm || selectedTag !== 'all' ? (
              <div className="h-56 flex flex-col items-center justify-center text-center p-6 text-neutral-400 rounded-2xl liquid-glass bg-white/5 border border-white/10 space-y-2">
                <Search className="w-10 h-10 text-neutral-500 mb-1" />
                <p className="text-sm font-semibold text-white">Không có câu hỏi nào khớp bộ lọc</p>
                <p className="text-xs text-neutral-400 max-w-sm">
                  {searchTerm
                    ? `Không tìm thấy kết quả cho "${searchTerm}".`
                    : 'Không có câu hỏi nào trong mục này.'}{' '}
                  Thử bỏ bớt điều kiện lọc để xem nhiều hơn.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowSavedOnly(false);
                    setSearchTerm('');
                    setSelectedTag('all');
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 text-xs font-semibold transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Xoá toàn bộ bộ lọc</span>
                </button>
              </div>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-center p-6 text-neutral-400 rounded-2xl liquid-glass bg-white/5 border border-white/10 space-y-2">
                <HelpCircle className="w-10 h-10 text-neutral-500 mb-1" />
                <p className="text-sm font-semibold text-white">Chưa có câu hỏi nào trên sàn thảo luận</p>
                <p className="text-xs text-neutral-400 max-w-sm">
                  Hãy là người đầu tiên đặt câu hỏi để cùng thảo luận bài học và nhận giải đáp từ cộng đồng!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      onOpenLoginModal?.();
                    } else {
                      setIsAskModalOpen(true);
                    }
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 text-xs font-semibold transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Đặt câu hỏi đầu tiên</span>
                </button>
              </div>
            )
          ) : (
            filteredQuestions.map(q => {
              const qSolutions = solutions.filter(s => s.questionId === q.id);
              const bestSol = qSolutions.find(s => s.isBest);

              return (
                <div
                  key={q.id}
                  role="button"
                  tabIndex={0}
                  onMouseEnter={() => handlePrefetchQuestion(q)}
                  onClick={() => handleOpenQuestionDetail(q)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      const target = e.target as HTMLElement;
                      if (!target.closest('button')) {
                        e.preventDefault();
                        handleOpenQuestionDetail(q);
                      }
                    }
                  }}
                  aria-label={`Xem chi tiết câu hỏi: ${q.title}`}
                  className={`cursor-pointer rounded-2xl liquid-glass p-4 border transition-all duration-200 group hover:scale-[1.008] ${
                    q.isSolved
                      ? 'bg-neutral-950/70 border-amber-500/40 hover:border-amber-400 shadow-[0_4px_20px_rgba(245,158,11,0.1)]'
                      : 'bg-neutral-950/60 border-white/10 hover:border-cyan-400/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Solved Badge */}
                        {q.isSolved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-300 font-mono">
                            <CheckCircle2 className="w-3 h-3 text-amber-400" />
                            ĐÃ GIẢI QUYẾT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-[10px] font-bold text-cyan-300 font-mono">
                            ĐANG CHỜ LỜI GIẢI
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/10 text-neutral-300 border border-white/10">
                          #{q.subject}
                        </span>

                        {q.bountyCoin && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[10px] font-mono font-bold text-amber-300">
                            <Coins className="w-3 h-3 text-amber-400" />
                            +{q.bountyCoin} Coin
                          </span>
                        )}

                        <span className="text-[10px] text-neutral-500 font-mono">{q.createdAt}</span>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {q.title}
                      </h3>

                      <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">
                        {q.content}
                      </p>

                      {q.imageUrl && (
                        <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-cyan-300 font-mono">
                          <ImageIcon className="w-3 h-3 text-cyan-400" />
                          <span>Đính kèm hình ảnh</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center sm:flex-col sm:items-end gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {q.views}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-cyan-400 font-bold">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {qSolutions.length} lời giải
                        </span>

                        {/* Nút lưu câu hỏi — stopPropagation vì cả thẻ là role="button" */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSaveQuestion(q.id);
                          }}
                          aria-pressed={isQuestionSaved(savedMap, savedOwnerKey, q.id)}
                          className={`p-1 rounded-md border transition-colors cursor-pointer ${
                            isQuestionSaved(savedMap, savedOwnerKey, q.id)
                              ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                              : 'bg-white/5 border-white/10 text-neutral-400 hover:bg-white/15 hover:text-white'
                          }`}
                          title={
                            isQuestionSaved(savedMap, savedOwnerKey, q.id)
                              ? 'Bỏ lưu câu hỏi này'
                              : 'Lưu câu hỏi này để xem lại sau'
                          }
                          aria-label={
                            isQuestionSaved(savedMap, savedOwnerKey, q.id)
                              ? `Bỏ lưu câu hỏi: ${q.title}`
                              : `Lưu câu hỏi: ${q.title}`
                          }
                        >
                          {isQuestionSaved(savedMap, savedOwnerKey, q.id) ? (
                            <BookmarkCheck size={13} />
                          ) : (
                            <Bookmark size={13} />
                          )}
                        </button>

                        {/* Menu 3 chấm quản trị nội dung (Super Admin / quyền edit_content) */}
                        {canEditContent && (
                          <div className="relative ml-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuQuestionId(prev => (prev === q.id ? null : q.id));
                              }}
                              className="p-1 rounded-md bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
                              title="Tùy chọn quản trị bài viết"
                              aria-label="Tùy chọn quản trị bài viết"
                            >
                              <MoreVertical size={13} />
                            </button>

                            {openMenuQuestionId === q.id && (
                              <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl obsidian-glass bg-[#0c1218] border border-cyan-500/30 shadow-2xl p-1.5 z-30 space-y-1 animate-fade-up">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuQuestionId(null);
                                    handleAdminEditPost(q.id);
                                  }}
                                  className="w-full px-2.5 py-1.5 text-left text-xs text-amber-300 hover:bg-amber-500/20 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <Edit3 size={12} />
                                  <span>[Chỉnh sửa bài viết]</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuQuestionId(null);
                                    handleAdminDeletePost(q.id);
                                  }}
                                  className="w-full px-2.5 py-1.5 text-left text-xs text-red-400 hover:bg-red-500/20 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <Trash2 size={12} />
                                  <span>[Xóa bài viết]</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAuthorAnchorPos({ x: e.clientX, y: e.clientY });
                          if (!q.isAnonymous) {
                            const existing = Object.values(users).find(u => u.id === q.authorId) ||
                              (currentUser && currentUser.id === q.authorId ? currentUser : null);
                            setActiveAuthorPopover({
                              id: q.authorId,
                              name: existing?.name || q.authorName,
                              avatar: existing?.avatar || q.authorAvatar,
                              email: existing?.email,
                              level: existing?.level || 1,
                              coin: existing?.coin || 100,
                            });
                          }
                        }}
                        className="flex items-center gap-1.5 mt-1 hover:opacity-80 transition-opacity cursor-pointer text-left"
                        title={q.isAnonymous ? 'Tác giả ẩn danh' : 'Xem thông tin tác giả'}
                      >
                        <img
                          src={q.authorAvatar}
                          alt={q.authorName}
                          onError={e => handleImageError(e, DEFAULT_AVATAR)}
                          loading="lazy"
                          decoding="async"
                          width={20}
                          height={20}
                          className={`w-5 h-5 rounded-full object-cover border ${
                            q.isAnonymous
                              ? 'border-purple-400 p-0.5 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                              : 'border-white/20'
                          }`}
                        />
                        <span
                          className={`text-xs truncate max-w-[140px] ${
                            q.isAnonymous
                              ? 'text-purple-300 font-medium'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          {q.authorName}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Best Answer Preview Callout */}
                  {bestSol && (
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
                      <div className="flex items-center gap-2 truncate">
                        <Award className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="font-bold text-amber-300">Đáp Án Chuẩn:</span>
                        <span className="truncate italic text-neutral-200">{bestSol.content}</span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-400 font-bold ml-2 shrink-0">
                        ✓ ĐÁP ÁN CHUẨN
                      </span>
                    </div>
                  )}

                  {/* Super Admin Moderation Bar on Question Card */}
                  <ForumPostModeration
                    postId={q.id}
                    onDeletePost={handleAdminDeletePost}
                    onEditPost={handleAdminEditPost}
                    isSuperAdmin={canEditContent}
                  />
                </div>
              );

            })
          )}
          </div>

          {/* Right Sidebar: Leaderboard & "Bạn muốn hỏi điều gì?" Widget */}
          <div className={`lg:col-span-4 ${isEmbedded ? '' : 'overflow-y-auto pr-1'} space-y-4 pb-6`}>
            
            {/* Đặt câu hỏi CTA Widget */}
            <div className="pc-12-shell p-4 rounded-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full pc-12-well flex items-center justify-center">
                  <HelpCircle className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Bạn đang có thắc mắc?</h3>
                  <p className="text-xs text-neutral-400">Đừng ngần ngại đặt câu hỏi, cộng đồng F-Forum luôn sẵn sàng hỗ trợ bạn!</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      onOpenLoginModal?.();
                    } else {
                      setIsAskModalOpen(true);
                    }
                  }}
                  className="w-full mt-1 pc-12-btn py-2.5 rounded-xl text-cyan-50 font-bold text-xs flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Đặt câu hỏi ngay</span>
                </button>
              </div>
            </div>

            <LeaderboardWidget
              currentUser={currentUser}
              users={users}
              questions={questions}
              solutions={solutions}
              chatMessages={chatMessages}
              onOpenProfile={onOpenProfile}
              onOpenAskModal={() => {
                if (!currentUser) {
                  onOpenLoginModal?.();
                } else {
                  setIsAskModalOpen(true);
                }
              }}
              onOpenFocusMode={onOpenFocusMode}
            />
          </div>
        </div>
      </div>

      {/* Modal: Đặt Câu Hỏi Học Thuật Mới — Futuristic UI/UX 2027 Redesign (Phần 1: 780px Width + 3 Card Sections + Visual Breathing Room) */}
      {isAskModalOpen && (() => {
        const currentSubjectMeta = SUBJECT_2027_META[newSubject] || SUBJECT_2027_META.toan;
        /* Super Admin: Coin vô vùng (∞) — không chặn mức treo thưởng. */
        const userBalance = effectiveCoinBalance(currentUser?.role, currentUser?.coin ?? 100);

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Đặt câu hỏi mới"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsSubjectDropdownOpen(false);
                setIsAskModalOpen(false);
              }
            }}
            className="ask2027-backdrop fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-5 animate-fade-up"
          >
            <div className="modal-container ask2027-modal w-full h-full sm:h-auto sm:max-w-[780px] rounded-none sm:rounded-[24px] relative">
              {/* Background Mesh Gradient & Floating Particles Layer */}
              <div className="ask2027-mesh-layer" aria-hidden="true">
                <div className="ask2027-mesh-blob-cyan" />
                <div className="ask2027-mesh-blob-purple" />
                <div className="ask2027-particles" />
              </div>

              {/* STICKY HEADER — 3D Animated Gradient Icon + Cyan→Purple Title + Circular Glass Close + Scroll Shadow */}
              <div
                className={`flex items-center justify-between px-5 sm:px-8 pt-5 pb-4 border-b border-white/10 shrink-0 transition-shadow duration-200 z-20 ${
                  isAskModalScrolled ? 'bg-[#0A0E1A]/95 shadow-[0_14px_32px_rgba(0,0,0,0.75)]' : ''
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-white/[0.06] border border-white/15 flex items-center justify-center shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_0_24px_rgba(0,245,255,0.25)]">
                    <svg
                      viewBox="0 0 36 36"
                      className="w-6 h-6 ask2027-orb-icon"
                      aria-hidden="true"
                    >
                      <defs>
                        <linearGradient id="ask2027PrismGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#00F5FF" />
                          <stop offset="52%" stopColor="#7B61FF" />
                          <stop offset="100%" stopColor="#B14EFF" />
                        </linearGradient>
                        <radialGradient id="ask2027CoreGlow" cx="35%" cy="30%" r="65%">
                          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                          <stop offset="45%" stopColor="#00F5FF" stopOpacity="0.85" />
                          <stop offset="100%" stopColor="#B14EFF" stopOpacity="0.9" />
                        </radialGradient>
                      </defs>
                      <polygon
                        points="18,2 31,11 26,30 10,30 5,11"
                        fill="url(#ask2027PrismGrad)"
                        fillOpacity="0.28"
                        stroke="url(#ask2027PrismGrad)"
                        strokeWidth="1.6"
                      />
                      <path
                        d="M18 4 L22.2 13.8 L32 18 L22.2 22.2 L18 32 L13.8 22.2 L4 18 L13.8 13.8 Z"
                        fill="url(#ask2027CoreGlow)"
                      />
                      <circle cx="18" cy="18" r="3.2" fill="#FFFFFF" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg sm:text-[22px] leading-tight tracking-tight ask2027-title-gradient truncate">
                      Đặt Câu Hỏi Học Thuật Mới
                    </h3>
                    <p className="text-[12.5px] text-white/65 mt-0.5 truncate">
                      Không gian thảo luận học thuật thông minh • Tự động lưu nháp &amp; gợi ý người giải bài
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsSubjectDropdownOpen(false);
                    setIsAskModalOpen(false);
                  }}
                  aria-label="Đóng hộp thoại đặt câu hỏi"
                  className="ask2027-close-btn w-10 h-10 rounded-full flex items-center justify-center text-white/75 hover:text-white cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAskSubmit} className="flex flex-col flex-1 min-h-0">
                <div
                  onScroll={e => setIsAskModalScrolled(e.currentTarget.scrollTop > 8)}
                  className="modal-body ask2027-scrollbar px-5 sm:px-8 py-6 space-y-5"
                >
                  {/* Khôi phục bản nháp tự động */}
                  {hasRestoredDraft && (
                    <div className="flex items-center gap-3 rounded-2xl border border-amber-300/35 bg-amber-400/10 px-4 py-3 shadow-[0_0_18px_rgba(245,158,11,0.12)]">
                      <Sparkles className="w-4 h-4 shrink-0 text-amber-300" />
                      <span className="min-w-0 flex-1 text-xs leading-relaxed text-amber-100">
                        Đã khôi phục bản nháp
                        {askDraftRestoredAt
                          ? ` lưu lúc ${new Date(askDraftRestoredAt).toLocaleString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                            })}`
                          : ''}
                        .
                      </span>
                      <button
                        type="button"
                        onClick={discardAskDraft}
                        className="shrink-0 rounded-xl border border-amber-300/35 px-3 py-1 text-[11px] font-bold text-amber-200 transition hover:bg-amber-400/20 cursor-pointer"
                      >
                        Bỏ nháp
                      </button>
                    </div>
                  )}

                  {/* ============================================================
                      [CARD 1] THÔNG TIN CƠ BẢN (Chủ đề + Phân luồng 2 cột đều & Tiêu đề full-width)
                      ============================================================ */}
                  <div className="ask2027-card-section">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-300/90 font-bold">
                        01 · THÔNG TIN CƠ BẢN
                      </span>
                      <span className="text-[11px] text-white/50">
                        Phân luồng môn học &amp; chế độ danh tính
                      </span>
                    </div>

                    {/* Hàng 1: 2 Cột đều nhau (Chủ đề môn học + Chế độ Ẩn danh Ghibli) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                      {/* Cột 1: Custom Glass Subject Dropdown */}
                      <div className="relative">
                        <label className="block text-[13.5px] font-medium text-white/90 mb-2">
                          Chủ đề môn học / đời sống <span className="text-cyan-400">*</span>
                        </label>

                        {/* Screen-reader & form compatible select */}
                        <select
                          aria-label="Chọn chủ đề môn học"
                          value={newSubject}
                          onChange={e => setNewSubject(e.target.value as SubjectTag)}
                          className="sr-only"
                        >
                          {SUBJECTS.filter(s => s.tag !== 'all').map(s => (
                            <option key={s.tag} value={s.tag}>
                              {s.label} ({s.group === 'academic' ? 'Học thuật' : 'Đời sống'})
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => setIsSubjectDropdownOpen(prev => !prev)}
                          aria-expanded={isSubjectDropdownOpen}
                          className="ask2027-field-shell w-full px-3.5 py-2.5 flex items-center justify-between gap-2.5 text-left cursor-pointer min-h-[58px]"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 border"
                              style={{
                                background: `color-mix(in srgb, ${currentSubjectMeta.color} 18%, rgba(255,255,255,0.04))`,
                                borderColor: `color-mix(in srgb, ${currentSubjectMeta.color} 48%, transparent)`,
                                boxShadow: `0 0 14px color-mix(in srgb, ${currentSubjectMeta.color} 28%, transparent)`,
                              }}
                            >
                              {currentSubjectMeta.emoji}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[14px] font-semibold text-white truncate">
                                  {currentSubjectMeta.title}
                                </span>
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border shrink-0"
                                  style={{
                                    color: currentSubjectMeta.color,
                                    borderColor: `color-mix(in srgb, ${currentSubjectMeta.color} 45%, transparent)`,
                                    background: `color-mix(in srgb, ${currentSubjectMeta.color} 14%, transparent)`,
                                  }}
                                >
                                  #{newSubject}
                                </span>
                              </div>
                              <span className="text-[11px] text-white/55 block">
                                Phân luồng: {currentSubjectMeta.groupLabel}
                              </span>
                            </div>
                          </div>

                          <ChevronDown
                            className={`w-4 h-4 text-cyan-300 shrink-0 transition-transform duration-200 ${
                              isSubjectDropdownOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </div>

                      {/* Cột 2: Phân luồng Danh tính (Công khai / Ẩn danh Ghibli Mask) */}
                      <div>
                        <label className="block text-[13.5px] font-medium text-white/90 mb-2">
                          Chế độ hiển thị người hỏi
                        </label>
                        <div className="ask2027-field-shell px-3.5 py-2.5 flex items-center justify-between gap-3 min-h-[58px]">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                                isAnonymous
                                  ? 'bg-purple-500/20 border-purple-400/45 text-purple-300 shadow-[0_0_14px_rgba(177,78,255,0.3)]'
                                  : 'bg-white/[0.05] border-white/10 text-cyan-300'
                              }`}
                            >
                              <EyeOff className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[13.5px] font-semibold text-white block truncate">
                                {isAnonymous ? 'Ẩn danh (Ghibli Mask)' : 'Công khai học thuật'}
                              </span>
                              <span className="text-[11px] text-white/55 block truncate">
                                {isAnonymous ? previewAlias || 'Pháp sư Tri thức Ghibli' : 'Hiển thị tên & cấp bậc thật'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsAnonymous(prev => !prev)}
                            aria-pressed={isAnonymous}
                            className={`w-12 h-6 rounded-full transition-all relative focus:outline-none cursor-pointer shrink-0 ${
                              isAnonymous
                                ? 'bg-gradient-to-r from-cyan-400 to-purple-500 shadow-[0_0_14px_rgba(177,78,255,0.5)]'
                                : 'bg-white/15'
                            }`}
                          >
                            <span
                              className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${
                                isAnonymous ? 'translate-x-7' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Animated Glass Dropdown Panel (nếu đang mở chọn chủ đề) */}
                    {isSubjectDropdownOpen && (
                      <div className="mb-5 p-3 rounded-2xl bg-[#0D1230]/95 backdrop-blur-xl border border-cyan-400/35 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(0,245,255,0.18)] grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto ask2027-scrollbar animate-fade-up z-30">
                        {SUBJECTS.filter(s => s.tag !== 'all').map(s => {
                          const tag = s.tag as SubjectTag;
                          const meta = SUBJECT_2027_META[tag];
                          const isSelected = newSubject === tag;
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                setNewSubject(tag);
                                setIsSubjectDropdownOpen(false);
                              }}
                              className={`p-2.5 rounded-xl flex items-center gap-2.5 text-left transition-all cursor-pointer border ${
                                isSelected
                                  ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-400/55 shadow-[0_0_15px_rgba(0,245,255,0.22)]'
                                  : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/8'
                              }`}
                            >
                              <span
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                                style={{
                                  background: `color-mix(in srgb, ${meta.color} 18%, rgba(255,255,255,0.03))`,
                                }}
                              >
                                {meta.emoji}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-semibold text-white truncate">
                                    {meta.title}
                                  </span>
                                  <span
                                    className="text-[10px] font-mono font-bold shrink-0"
                                    style={{ color: meta.color }}
                                  >
                                    {s.label}
                                  </span>
                                </div>
                                <span className="text-[10px] text-white/50 block">
                                  {meta.groupLabel}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Ghibli Preview Pill (chỉ hiện khi bật Ẩn danh) */}
                    {isAnonymous && (
                      <div className="mb-5 p-3 rounded-2xl bg-purple-950/40 border border-purple-400/35 flex items-center gap-3 animate-fade-up">
                        {previewMask && (
                          <img
                            src={previewMask}
                            alt="Ghibli Wizard Mask"
                            onError={e => handleImageError(e, DEFAULT_AVATAR)}
                            loading="lazy"
                            decoding="async"
                            width={38}
                            height={38}
                            className="w-9 h-9 rounded-full border border-purple-400/60 p-0.5 shadow-[0_0_12px_rgba(168,85,247,0.45)] shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-purple-200 truncate">
                              {previewAlias}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-purple-500/25 text-purple-200 border border-purple-400/40 flex items-center gap-1 shrink-0">
                              <Wand2 className="w-3 h-3 text-purple-300" />
                              GHIBLI MASK
                            </span>
                          </div>
                          <p className="text-[11px] text-white/60 mt-0.5">
                            Tên thật &amp; avatar của bạn được bảo mật tuyệt đối sau lớp mặt nạ pháp sư.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Hàng 2: Tiêu đề câu hỏi (Full width, gap 8px giữa label và input) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label htmlFor="tieu-de-cau-hoi" className="text-[13.5px] font-medium text-white/90 flex items-center gap-1.5">
                          <span>Tiêu đề câu hỏi</span>
                          <span className="text-cyan-400">*</span>
                        </label>
                        <span className="text-[11px] text-white/50">
                          Ngắn gọn, nêu đúng trọng tâm bài toán
                        </span>
                      </div>
                      <div className="ask2027-field-shell flex items-center px-4 py-3 gap-3">
                        <Lightbulb className="w-4 h-4 text-cyan-400/85 shrink-0" />
                        <input
                          id="tieu-de-cau-hoi"
                          type="text"
                          required
                          maxLength={150}
                          value={newTitle}
                          onChange={e => setNewTitle(e.target.value)}
                          placeholder="VD: Cách giải phương trình vi phân cấp 2 bài tập số 3..."
                          className="w-full bg-transparent text-[15px] text-white placeholder-white/40 focus:outline-none leading-relaxed"
                        />
                        <span
                          className={`text-[11px] font-mono shrink-0 px-2 py-0.5 rounded-md ${
                            newTitle.length >= 135
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-white/[0.04] text-white/50'
                          }`}
                        >
                          {newTitle.length}/150
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ============================================================
                      [CARD 2] NỘI DUNG CHI TIẾT (Textarea min-height 150px + Progressive Disclosure)
                      ============================================================ */}
                  <div className="ask2027-card-section">
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="noi-dung-chi-tiet-thac-mac" className="text-[13.5px] font-medium text-white/90 flex items-center gap-2">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-300/90 font-bold">
                          02 · NỘI DUNG CHI TIẾT
                        </span>
                        <span className="text-cyan-400">*</span>
                      </label>
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${
                          newContent.length >= 1400
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-white/[0.04] text-white/55'
                        }`}
                      >
                        {newContent.length}/1500 ký tự
                      </span>
                    </div>

                    <div className="ask2027-field-shell p-4">
                      <textarea
                        id="noi-dung-chi-tiet-thac-mac"
                        required
                        rows={5}
                        maxLength={1500}
                        value={newContent}
                        onFocus={() => setIsAskContentFocused(true)}
                        onBlur={() => setIsAskContentFocused(false)}
                        onChange={e => setNewContent(e.target.value)}
                        placeholder="Ghi rõ đề bài, dữ kiện đã cho và bước biến đổi em đang vướng mắc để cộng đồng trợ giúp chính xác nhất..."
                        className="w-full min-h-[152px] bg-transparent text-[15px] text-white placeholder-white/40 focus:outline-none resize-y leading-[1.7] ask2027-scrollbar"
                      />

                      {/* Progressive Disclosure: chỉ hiện gợi ý công cụ khi người dùng đang focus vào textarea */}
                      {isAskContentFocused && (
                        <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-white/8 text-[11.5px] animate-fade-up">
                          <span className="text-cyan-200/80 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                            <span>Mẹo: Mở "Công cụ ký hiệu toán học" ở mục 03 bên dưới để chèn nhanh ∫, ∑, √, π...</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ============================================================
                      [CARD 3] CÔNG CỤ HỖ TRỢ (Bảng Ký Hiệu Toán Thu Gọn Mặc Định + Đính Kèm Ảnh)
                      ============================================================ */}
                  <div className="ask2027-card-section">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-300/90 font-bold">
                        03 · CÔNG CỤ HỖ TRỢ &amp; HÌNH ẢNH ĐỀ BÀI
                      </span>
                      <span className="text-[11px] text-white/50">
                        Tùy chọn • Công thức &amp; Sơ đồ minh họa
                      </span>
                    </div>

                    {/* Bảng ký hiệu toán học — Mặc định THU GỌN (collapsed), mở ra mới hiện lưới 48-52px */}
                    <MathSymbolsBar
                      defaultExpanded={false}
                      onInsert={sym => setNewContent(newContent + sym)}
                    />

                    <div className="ask2027-section-divider" />

                    {/* Khu vực đính kèm hình ảnh (Drag & Drop + Animated Dashed Border + Progress Bar) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[13.5px] font-medium text-white/90">
                          Đính kèm ảnh đề bài / sơ đồ (Tối đa 20MB)
                        </label>
                        <span className="text-[11px] font-mono text-cyan-300/80">
                          PNG • JPG • WEBP
                        </span>
                      </div>

                      {askUploadProgress > 0 && (
                        <div className="mb-3 space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300">
                            <span>Đang xử lý ảnh đính kèm...</span>
                            <span>{askUploadProgress}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full ask2027-progress-bar transition-all duration-200"
                              style={{ width: `${askUploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {askImage ? (
                        <div className="relative rounded-[20px] overflow-hidden border border-cyan-400/35 bg-[#080C22]/90 p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.65),0_0_24px_rgba(0,245,255,0.14)]">
                          <img
                            loading="lazy"
                            decoding="async"
                            src={askImage}
                            alt="Đính kèm câu hỏi"
                            className="max-h-52 rounded-2xl object-contain mx-auto shadow-lg"
                          />
                          {askImageFileName && (
                            <div className="mt-2.5 text-center">
                              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[11px] font-mono text-white/75">
                                <ImageIcon className="w-3 h-3 text-cyan-300" />
                                {askImageFileName}
                              </span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setAskImage(null);
                              setAskImageFileName(null);
                            }}
                            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-black/65 hover:bg-red-500/25 backdrop-blur-md border border-white/20 hover:border-red-400 text-white hover:text-red-200 flex items-center justify-center cursor-pointer transition-all hover:shadow-[0_0_18px_rgba(239,68,68,0.65)] active:scale-95"
                            title="Gỡ ảnh đính kèm"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label
                          htmlFor="field"
                          onDragOver={e => {
                            e.preventDefault();
                            if (!isDraggingAskImage) setIsDraggingAskImage(true);
                          }}
                          onDragLeave={() => setIsDraggingAskImage(false)}
                          onDrop={e => {
                            e.preventDefault();
                            setIsDraggingAskImage(false);
                            const droppedFile = e.dataTransfer?.files?.[0];
                            processAskImageFile(droppedFile);
                          }}
                          className={`ask2027-dropzone flex flex-col sm:flex-row items-center justify-center gap-3.5 p-5 cursor-pointer ${
                            isDraggingAskImage ? 'is-dragging' : ''
                          }`}
                        >
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-purple-500/20 border border-cyan-400/35 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(0,245,255,0.2)]">
                            <ImageIcon className="w-5 h-5 text-cyan-300" />
                          </div>
                          <div className="text-center sm:text-left">
                            <span className="text-xs sm:text-[13.5px] font-semibold text-white block">
                              Kéo &amp; thả ảnh vào đây hoặc <span className="text-cyan-300 underline decoration-cyan-400/50">chọn tệp từ thiết bị</span>
                            </span>
                            <span className="text-[11.5px] text-white/55 block mt-0.5">
                              Hỗ trợ ảnh chụp đề bài, nháp giải tay hoặc hình vẽ minh họa (&le; 20MB)
                            </span>
                          </div>
                          <input
                            id="field"
                            type="file"
                            accept="image/*"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) {
                                processAskImageFile(file);
                                e.target.value = '';
                              } else {
                                handleImageUpload(e, setAskImage, setAskImageError);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      )}
                      {askImageError && (
                        <p className="text-[11px] text-red-400 mt-2 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{askImageError}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* ============================================================
                    STICKY FOOTER — Cược Coin (Bounty Bet) + Pulsing XP + Submit CTA
                    ============================================================ */}
                <div className="modal-footer px-5 sm:px-8 py-4 bg-[#080C1C]/95 space-y-3">
                  {/* Hàng trên của Footer: Cược Coin Phần Thưởng (Bounty Bet) */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/8">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-semibold text-white/90">
                        Cược Coin thưởng:
                      </span>
                      <div className="ask2027-coin-badge px-2.5 py-1 rounded-full flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span className="text-[11px] font-mono font-bold text-amber-200">
                          Số dư: {formatCoinBalance(userBalance)} Coin
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* +/- Stepper */}
                      <div className="inline-flex items-center gap-1.5 bg-[#0A0E24] border border-amber-400/35 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => setBountyCoin(prev => Math.max(10, prev - 10))}
                          disabled={bountyCoin <= 10}
                          aria-label="Giảm 10 Coin cược"
                          className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-amber-500/20 text-white font-mono font-bold text-sm flex items-center justify-center disabled:opacity-35 cursor-pointer"
                        >
                          −
                        </button>
                        <span className="px-2.5 text-xs sm:text-sm font-mono font-extrabold text-amber-300 min-w-[74px] text-center">
                          {bountyCoin} Coin
                        </span>
                        <button
                          type="button"
                          onClick={() => setBountyCoin(prev => Math.min(Math.max(100, userBalance), prev + 10))}
                          aria-label="Tăng 10 Coin cược"
                          className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-amber-500/20 text-white font-mono font-bold text-sm flex items-center justify-center cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1.5">
                        {[10, 20, 50, 100].map(amt => {
                          const isSelected = bountyCoin === amt;
                          return (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setBountyCoin(amt)}
                              className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 ${
                                isSelected
                                  ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                                  : 'bg-white/[0.04] border-white/10 text-white/65 hover:bg-white/[0.09] hover:text-white'
                              }`}
                            >
                              {amt}C
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Hàng dưới của Footer: XP Reward Badge + Nút Hủy & Đăng Câu Hỏi */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="ask2027-xp-pill inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-200 border border-cyan-400/40">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                        <span>+50 XP THƯỞNG KHI ĐĂNG BÀI</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSubjectDropdownOpen(false);
                          setIsAskModalOpen(false);
                        }}
                        className="ask2027-ghost-btn px-4 py-2.5 rounded-2xl text-xs font-semibold cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={askCooldown > 0 || isSubmittingAsk}
                        className="ask2027-submit-btn px-6 py-2.5 rounded-2xl font-bold text-xs sm:text-[13.5px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isSubmittingAsk ? (
                          <>
                            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            <span>Đang khởi tạo câu hỏi...</span>
                          </>
                        ) : askCooldown > 0 ? (
                          <span>Chờ {askCooldown}s...</span>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Đăng Câu Hỏi</span>
                            <span className="px-1.5 py-0.5 rounded-md bg-black/25 text-[10px] font-mono text-cyan-100 border border-white/15">
                              +50 XP
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Phase 4.1–4.7: TRANG RIÊNG Chi Tiết Câu Hỏi & Solutions Feed — Sub-layout dưới Navbar (calc(100vh - var(--navbar-height))), không che Navbar */}
      {selectedQuestion && (() => {
        const activeSolutions = solutions
          .filter(s => s.questionId === selectedQuestion.id && s.status !== 'deleted')
          .sort((a, b) => (b.isBest ? 1 : 0) - (a.isBest ? 1 : 0));
        const remainingSlots = Math.max(0, 3 - activeSolutions.length);
        const isAnswerLimitReached = activeSolutions.length >= 3;
        const isCompactQuestionWithImage = Boolean(
          selectedQuestion.imageUrl && selectedQuestion.content.trim().length < 100
        );

        /* AI Tag-matching & keyword overlap for Related Questions (Phase 4.7) */
        const titleWords = selectedQuestion.title
          .toLowerCase()
          .split(/\s+/)
          .filter(w => w.length >= 3);
        const relatedQuestions = questions
          .filter(q => q.id !== selectedQuestion.id && q.status !== 'deleted')
          .map(q => {
            let score = q.subject === selectedQuestion.subject ? 10 : 0;
            const hay = `${q.title} ${q.content}`.toLowerCase();
            for (const word of titleWords) {
              if (hay.includes(word)) score += 2;
            }
            if (q.isSolved) score += 1;
            return { q, score };
          })
          .filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map(item => item.q);

        /* Top Solvers in this Subject (Phase 4.7) */
        const subjectQuestionIds = new Set(
          questions.filter(q => q.subject === selectedQuestion.subject && q.status !== 'deleted').map(q => q.id)
        );
        const solverStatsMap = new Map<string, { id: string; name: string; avatar: string; count: number; verified: number }>();
        for (const s of solutions) {
          if (s.status === 'deleted' || !subjectQuestionIds.has(s.questionId)) continue;
          const prev = solverStatsMap.get(s.authorId) || {
            id: s.authorId,
            name: s.authorName,
            avatar: s.authorAvatar,
            count: 0,
            verified: 0,
          };
          prev.count += 1;
          if (s.isBest) prev.verified += 1;
          solverStatsMap.set(s.authorId, prev);
        }
        const topSubjectSolvers = Array.from(solverStatsMap.values())
          .sort((a, b) => b.verified * 3 + b.count - (a.verified * 3 + a.count))
          .slice(0, 3);

        return (
          <div
            role="region"
            aria-label="Trang chi tiết câu hỏi"
            className="page-content-wrapper fixed inset-x-0 top-[var(--navbar-height)] bottom-0 z-40 overflow-hidden bg-[#080d12] animate-fade-up flex flex-col md:flex-row"
          >
            {/* Sticky 2px Reading Progress Bar (Phase 4.1) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 left-0 right-0 h-[2px] bg-white/5 z-50 overflow-hidden"
            >
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-amber-400 transition-[width] duration-150 ease-out"
                style={{ width: `${readingProgress}%` }}
              />
            </div>

            {/* CỘT CHÍNH — Header cố định / Body cuộn / Footer cố định */}
            <div className="flex-1 flex flex-col min-h-0 min-w-0 md:max-w-3xl lg:max-w-4xl md:mx-auto w-full">
              {/* Header — CỐ ĐỊNH, có nút ← Quay lại */}
              <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={handleCloseQuestionDetail}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors mb-2 cursor-pointer"
                  title="Quay lại Sàn Hỏi Đáp"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Quay lại Hỏi đáp
                </button>
                <div className="space-y-1">
                  {/* Status pill động theo trạng thái câu hỏi (Phase 4.7) */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedQuestion.isSolved ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-bold">
                        <span>🟢 Đã có đáp án đúng</span>
                      </span>
                    ) : activeSolutions.length === 0 ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                        <span>🟡 Đang chờ giải đáp</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        <span>🔵 Đang thảo luận</span>
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      #{selectedQuestion.subject}
                    </span>
                    {selectedQuestion.bountyCoin && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-bold">
                        <Coins className="w-3 h-3 text-amber-400" />
                        +{selectedQuestion.bountyCoin} Coin Phần Thưởng
                      </span>
                    )}
                    {selectedQuestion.isSolved && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Đã Giải Quyết
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-base sm:text-lg text-white">
                    {selectedQuestion.title}
                  </h3>
                  <div className="pt-2">
                    <ShareRow
                      url={buildQuestionShareUrl(selectedQuestion.id, window.location.origin, window.location.pathname)}
                      title={selectedQuestion.title}
                    />
                  </div>
                </div>
              </div>

              {/* Body — CUỘN duy nhất ở đây (Phase 4.1) */}
              <div
                ref={detailScrollRef}
                onScroll={handleDetailScroll}
                className="px-4 sm:px-6 pt-4 pb-6 overflow-y-auto flex-1 min-h-0"
              >
                {/* Question Card (Phase 4.2 & 4.3) */}
                <div className={`question-card ${isCompactQuestionWithImage ? 'compact-with-image' : ''}`}>
                  <div className="question-text min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          setAuthorAnchorPos({ x: e.clientX, y: e.clientY });
                          if (!selectedQuestion.isAnonymous) {
                            const existing = Object.values(users).find(u => u.id === selectedQuestion.authorId) ||
                              (currentUser && currentUser.id === selectedQuestion.authorId ? currentUser : null);
                            setActiveAuthorPopover({
                              id: selectedQuestion.authorId,
                              name: existing?.name || selectedQuestion.authorName,
                              avatar: existing?.avatar || selectedQuestion.authorAvatar,
                              email: existing?.email,
                              level: existing?.level || 1,
                              coin: existing?.coin || 100,
                            });
                          }
                        }}
                        className="flex items-center gap-2 text-xs text-neutral-400 hover:opacity-80 transition-opacity cursor-pointer text-left"
                        title={selectedQuestion.isAnonymous ? 'Tác giả ẩn danh' : 'Xem thông tin tác giả'}
                      >
                        <img
                          src={selectedQuestion.authorAvatar}
                          alt={selectedQuestion.authorName}
                          onError={e => handleImageError(e, DEFAULT_AVATAR)}
                          loading="lazy"
                          decoding="async"
                          width={24}
                          height={24}
                          className={`w-6 h-6 rounded-full object-cover border ${
                            selectedQuestion.isAnonymous
                              ? 'border-purple-400 p-0.5 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                              : 'border-white/20'
                          }`}
                        />
                        <span
                          className={`font-semibold ${
                            selectedQuestion.isAnonymous ? 'text-purple-300' : 'text-white'
                          }`}
                        >
                          {selectedQuestion.authorName}
                        </span>
                        {selectedQuestion.isAnonymous && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/20 text-purple-200 border border-purple-400/30 flex items-center gap-1">
                            <Wand2 className="w-3 h-3 text-purple-400" />
                            Pháp sư Ghibli
                          </span>
                        )}
                        <span>•</span>
                        <span>{selectedQuestion.createdAt}</span>
                      </button>
                    </div>

                    <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed whitespace-pre-line">
                      {selectedQuestion.content}
                    </p>

                    {!isCompactQuestionWithImage && selectedQuestion.imageUrl && (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setLightboxImageUrl(selectedQuestion.imageUrl || null)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setLightboxImageUrl(selectedQuestion.imageUrl || null);
                          }
                        }}
                        className="image-wrapper mt-3"
                        title="Bấm để phóng to ảnh (Lightbox)"
                      >
                        <img
                          loading="lazy"
                          decoding="async"
                          src={selectedQuestion.imageUrl}
                          alt="Đính kèm câu hỏi"
                          className="rounded-lg object-contain mx-auto"
                        />
                      </div>
                    )}

                    {/* Quick Reactions & Polymorphic Comments on Question (Phase 4.4 & 4.7) */}
                    <QuickReactionRow
                      reactions={selectedQuestion.reactions}
                      currentUserEmail={currentUser?.email}
                      onReact={type => {
                        if (!currentUser) {
                          onOpenLoginModal?.();
                        } else {
                          onReactQuestion?.(selectedQuestion.id, type);
                        }
                      }}
                    />

                    <CommentThread
                      commentableType="question"
                      commentableId={selectedQuestion.id}
                      comments={comments}
                      currentUser={currentUser}
                      onSubmitComment={onAddComment}
                      onOpenLoginModal={onOpenLoginModal}
                      users={users}
                    />

                    <ForumPostModeration
                      postId={selectedQuestion.id}
                      onDeletePost={handleAdminDeletePost}
                      onEditPost={handleAdminEditPost}
                      isSuperAdmin={canEditContent}
                    />
                  </div>

                  {isCompactQuestionWithImage && selectedQuestion.imageUrl && (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setLightboxImageUrl(selectedQuestion.imageUrl || null)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setLightboxImageUrl(selectedQuestion.imageUrl || null);
                        }
                      }}
                      className="image-wrapper"
                      title="Bấm để phóng to ảnh (Lightbox)"
                    >
                      <img
                        loading="lazy"
                        decoding="async"
                        src={selectedQuestion.imageUrl}
                        alt="Đính kèm câu hỏi"
                        className="rounded-lg object-contain mx-auto"
                      />
                    </div>
                  )}
                </div>

                {/* Phase 4.2 Visual Divider: ───── X/3 LỜI GIẢI ĐÃ GỬI ───── */}
                <div className="answer-section-label">
                  <span>{activeSolutions.length}/3 LỜI GIẢI ĐÃ GỬI</span>
                  <span className="text-[10px] font-mono text-cyan-300/90 normal-case tracking-normal">
                    ({remainingSlots > 0 ? `Còn ${remainingSlots}/3 chỗ trống` : 'Đã đủ 3/3 lời giải'})
                  </span>
                </div>

                {/* Solutions Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="font-semibold text-neutral-300">
                      CÁC BÀI GIẢI ĐÃ ĐÓNG GÓP ({activeSolutions.length})
                    </span>
                    <span>Chỉ tác giả hoặc Super Admin mới có quyền xác nhận đáp án chuẩn</span>
                  </div>

                  {activeSolutions.length === 0 ? (
                    <p className="text-neutral-500 text-xs italic text-center py-4">
                      Chưa có bạn nào trợ giúp giải câu này. Hãy là người đầu tiên đưa ra đáp án chính xác!
                    </p>
                  ) : (
                    activeSolutions.map(sol => {
                      const isSuperAdminSolver = isMasterAdmin(sol.authorEmail);
                      const solverName = isSuperAdminSolver ? MASTER_ADMIN_CONFIG.name : sol.authorName;
                      const solverAvatar = isSuperAdminSolver ? MASTER_ADMIN_CONFIG.avatar : sol.authorAvatar;
                      const canConfirmBest =
                        isSuperAdmin || currentUser?.id === selectedQuestion.authorId;

                      return (
                        <div
                          key={sol.id}
                          className={`answer-card transition-all ${sol.isBest ? 'verified' : ''}`}
                        >
                          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                setAuthorAnchorPos({ x: e.clientX, y: e.clientY });
                                const existing = Object.values(users).find(u => u.id === sol.authorId || (sol.authorEmail && u.email?.toLowerCase() === sol.authorEmail.toLowerCase())) ||
                                  (currentUser && (currentUser.id === sol.authorId || (sol.authorEmail && currentUser.email?.toLowerCase() === sol.authorEmail.toLowerCase())) ? currentUser : null);
                                setActiveAuthorPopover({
                                  id: sol.authorId,
                                  name: isSuperAdminSolver ? MASTER_ADMIN_CONFIG.name : (existing?.name || solverName),
                                  avatar: isSuperAdminSolver ? MASTER_ADMIN_CONFIG.avatar : (existing?.avatar || solverAvatar),
                                  email: sol.authorEmail || existing?.email,
                                  level: isSuperAdminSolver ? 150 : (existing?.level || sol.authorLevel),
                                  coin: existing?.coin || 100,
                                });
                              }}
                              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-left"
                              title="Xem hồ sơ người giải bài"
                            >
                              <div className="relative">
                                {/* Nhiệm vụ 10 — 32px + trang trí Discord (animation tắt);
                                    Super Admin giả mạo → avatar thường. */}
                                <DecoratedAvatar
                                  user={isSuperAdminSolver ? null : findDecorationOwner(users, sol.authorEmail, sol.authorId)}
                                  size={32}
                                  animate={false}
                                  className={isSuperAdminSolver ? 'ring-2 ring-amber-400' : undefined}
                                />
                                <span className="absolute -bottom-1 -right-1">
                                  <TierBadge level={isSuperAdminSolver ? 150 : sol.authorLevel} size={14} showTooltip={false} />
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-xs ${
                                    isSuperAdminSolver ? 'discord-admin-name' : 'font-bold text-white'
                                  }`}
                                >
                                  {solverName}
                                </span>
                                {isSuperAdminSolver && <AdminVerifiedBadge size={13} />}
                                <span className="text-[10px] text-neutral-500 font-mono">
                                  • Lv.{sol.authorLevel}
                                </span>
                              </div>
                            </button>

                            {sol.isBest && (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-black text-[10px] font-extrabold flex items-center gap-1 shadow-md">
                                <Award className="w-3 h-3" />
                                ✓ LỜI GIẢI ĐƯỢC XÁC NHẬN (+{Math.floor((selectedQuestion.bountyCoin || 20) * 0.5) + 100} COIN)
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-neutral-200 leading-relaxed whitespace-pre-line">
                            {sol.content}
                          </p>

                          {sol.imageUrl && (
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => setLightboxImageUrl(sol.imageUrl || null)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setLightboxImageUrl(sol.imageUrl || null);
                                }
                              }}
                              className="image-wrapper mt-2.5"
                              title="Bấm để phóng to ảnh lời giải"
                            >
                              <img
                                loading="lazy"
                                decoding="async"
                                src={sol.imageUrl}
                                alt="Hình ảnh lời giải"
                                className="rounded-lg object-contain mx-auto"
                              />
                            </div>
                          )}

                          {/* Quick Reactions on Answer (Phase 4.7) */}
                          <QuickReactionRow
                            reactions={sol.reactions}
                            currentUserEmail={currentUser?.email}
                            onReact={type => {
                              if (!currentUser) {
                                onOpenLoginModal?.();
                              } else {
                                onReactSolution?.(sol.id, type);
                              }
                            }}
                          />

                          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400">
                            <span className="text-[10px] font-mono">{sol.createdAt}</span>

                            <div className="flex items-center gap-2">
                              {/* Xoá lời giải với Lý do bắt buộc (Phase 4.6) */}
                              {canEditContent && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteReasonCode('rule_violation');
                                    setDeleteReasonNote('');
                                    setSolutionToDelete(sol);
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition-colors px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 cursor-pointer"
                                  title="Xóa phản hồi vi phạm"
                                >
                                  <Trash2 size={11} /> Xóa phản hồi vi phạm
                                </button>
                              )}

                              {/* Nút xác nhận Đáp Án Chuẩn */}
                              {canConfirmBest && !sol.isBest && (
                                <button
                                  onClick={() => onMarkBestSolution(selectedQuestion.id, sol.id)}
                                  className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-bold text-[11px] border border-amber-400/40 transition-all flex items-center gap-1 cursor-pointer"
                                  title={`Xác nhận đáp án chính xác nhất để thưởng +${Math.floor((selectedQuestion.bountyCoin || 20) * 0.5) + 100} Coin`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  ✓ Xác nhận Đáp Án Chuẩn (+{Math.floor((selectedQuestion.bountyCoin || 20) * 0.5) + 100} Coin)
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Polymorphic Comment Thread on Answer (Phase 4.4) */}
                          <CommentThread
                            commentableType="answer"
                            commentableId={sol.id}
                            comments={comments}
                            currentUser={currentUser}
                            onSubmitComment={onAddComment}
                            onOpenLoginModal={onOpenLoginModal}
                            users={users}
                          />
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Phase 4.5: Giới hạn 3 câu trả lời / câu hỏi */}
                {isAnswerLimitReached ? (
                  <div className="mt-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1">
                    <p className="text-xs font-bold text-emerald-300">
                      ✅ Đã đủ 3 lời giải — Hãy bình luận vào các lời giải có sẵn nếu bạn muốn bổ sung ý kiến
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Nếu một lời giải bị xóa do vi phạm hoặc không chính xác, ô đóng góp lời giải sẽ tự động mở lại.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 pt-5 border-t border-white/10 space-y-2.5">
                    {solDraftRestoredAt && (
                      <div className="flex items-center justify-between gap-2.5 rounded-xl border border-amber-400/35 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                        <span className="flex items-center gap-1.5 min-w-0 truncate">
                          <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span>
                            Đã khôi phục bản nháp lời giải (lưu tự động lúc{' '}
                            {new Date(solDraftRestoredAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            )
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={discardSolutionDraft}
                          className="shrink-0 rounded-lg border border-amber-300/35 px-2.5 py-0.5 text-[11px] font-bold text-amber-200 hover:bg-amber-400/20 cursor-pointer"
                        >
                          Bỏ nháp
                        </button>
                      </div>
                    )}
                    <label htmlFor="field-2" className="block text-xs font-semibold text-neutral-300 flex items-center justify-between flex-wrap gap-2">
                      <span>Đóng góp lời giải của bạn:</span>
                      <span className="text-[10px] font-mono text-cyan-300">
                        Còn {remainingSlots}/3 chỗ trống • Tự động lưu nháp mỗi 10s • +25 XP
                      </span>
                    </label>

                    <textarea
                      id="field-2"
                      rows={3}
                      maxLength={1500}
                      value={solutionText}
                      onChange={e => setSolutionText(e.target.value)}
                      placeholder="Nhập chi tiết từng bước giải bài, định lý hoặc lời khuyên học tập..."
                      className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none mb-1"
                    />

                    <MathSymbolsBar onInsert={sym => setSolutionText(prev => prev + sym)} />
                  </div>
                )}
              </div>

              {/* Footer — CỐ ĐỊNH, chỉ hiện khi chưa đạt giới hạn 3 lời giải (Phase 1.1 & 4.5) */}
              {!isAnswerLimitReached && (
                <div className="modal-footer px-4 sm:px-6 py-3 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    {solImage ? (
                      <div className="relative inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-xs text-cyan-300">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Đã đính kèm ảnh</span>
                        <button
                          type="button"
                          onClick={() => setSolImage(null)}
                          className="p-0.5 rounded-full hover:bg-red-500/30 text-red-400 cursor-pointer"
                          title="Gỡ ảnh"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="field-3" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-white/20 hover:border-cyan-400/50 bg-white/5 hover:bg-white/10 text-xs text-neutral-300 cursor-pointer transition-all">
                        <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Đính kèm ảnh lời giải (&le; 20MB)</span>
                        <input
                          id="field-3"
                          type="file"
                          accept="image/*"
                          onChange={e => handleImageUpload(e, setSolImage, setSolImageError)}
                          className="hidden"
                        />
                      </label>
                    )}
                    {solImageError && (
                      <p className="text-[11px] text-red-400 mt-1">{solImageError}</p>
                    )}
                  </div>

                  <button
                    onClick={() => handleSolutionSubmit(selectedQuestion.id)}
                    disabled={!solutionText.trim() || solCooldown > 0 || isSubmittingSol}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{solCooldown > 0 ? `Chờ ${solCooldown}s...` : isSubmittingSol ? 'Đang gửi...' : '+ Trợ Giúp Giải Bài (+25 XP)'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* SIDEBAR PHẢI — Câu hỏi liên quan (AI Tag-matching) + Top giải bài môn này tuần qua (Phase 4.7) */}
            <aside className="hidden lg:flex w-80 shrink-0 flex-col gap-5 border-l border-white/10 p-5 overflow-y-auto">
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  💡 CÂU HỎI LIÊN QUAN
                </h4>
                {relatedQuestions.map(q => {
                  const qSols = solutions.filter(s => s.questionId === q.id && s.status !== 'deleted');
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => handleOpenQuestionDetail(q)}
                      className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/40 transition-all cursor-pointer block"
                    >
                      <span className="text-[10px] font-mono text-cyan-300">#{q.subject}</span>
                      <p className="text-xs font-semibold text-white line-clamp-2 mt-1">{q.title}</p>
                      <span className="text-[10px] text-neutral-400 font-mono mt-1 block">
                        {qSols.length}/3 trả lời
                        {q.isSolved ? ' • ✓ đã có đáp án' : ''}
                      </span>
                    </button>
                  );
                })}
                {relatedQuestions.length === 0 && (
                  <p className="text-[11px] text-neutral-500 italic">Chưa có câu hỏi cùng chủ đề.</p>
                )}
              </div>

              <div className="pt-4 border-t border-white/10 space-y-2.5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Award className="w-4 h-4 text-amber-400" />
                  🏆 TOP GIẢI BÀI MÔN #{selectedQuestion.subject.toUpperCase()}
                </h4>
                {topSubjectSolvers.length === 0 ? (
                  <p className="text-[11px] text-neutral-500 italic">
                    Chưa có bảng xếp hạng cho môn này. Hãy giải bài để dẫn đầu!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {topSubjectSolvers.map((solver, idx) => {
                      const medals = ['🥇', '🥈', '🥉'];
                      return (
                        <div
                          key={solver.id}
                          className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm shrink-0">{medals[idx] || '🏅'}</span>
                            <img
                              src={solver.avatar}
                              alt={solver.name}
                              onError={e => handleImageError(e, DEFAULT_AVATAR)}
                              loading="lazy"
                              decoding="async"
                              width={24}
                              height={24}
                              className="w-6 h-6 rounded-full object-cover border border-white/15 shrink-0"
                            />
                            <span className="text-xs font-semibold text-white truncate">
                              {solver.name}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-amber-300 shrink-0">
                            {solver.count} bài{solver.verified > 0 ? ` (${solver.verified}✓)` : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>
          </div>
        );
      })()}

      {/* Phase 4.3 Lightbox Modal khi click vào ảnh câu hỏi hoặc lời giải */}
      {lightboxImageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh phóng to"
          onClick={() => setLightboxImageUrl(null)}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-up cursor-zoom-out"
        >
          <button
            type="button"
            onClick={() => setLightboxImageUrl(null)}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 cursor-pointer"
            aria-label="Đóng ảnh phóng to"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxImageUrl}
            alt="Ảnh phóng to"
            loading="lazy"
            decoding="async"
            onClick={e => e.stopPropagation()}
            className="max-h-[88vh] max-w-[92vw] rounded-2xl object-contain border border-white/15 shadow-2xl cursor-default"
          />
        </div>
      )}

      {/* Phase 4.6 Modal: Xác nhận xóa bài viết / lời giải có lý do bắt buộc (Admin / Moderator) */}
      {canEditContent && (questionToDelete || solutionToDelete) && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={questionToDelete ? 'Xác nhận xóa câu hỏi' : 'Xác nhận xóa lời giải'}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-up"
        >
          <div className="modal-container w-full max-w-md rounded-2xl bg-neutral-950 border border-red-500/40 shadow-2xl">
            <div className="modal-body space-y-4">
              <div className="flex items-center gap-2 text-red-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-bold text-sm text-white">
                  {questionToDelete ? 'Xác nhận xóa bài viết' : 'Xác nhận xóa lời giải vi phạm'}
                </h3>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {questionToDelete ? (
                  <>
                    Bạn sắp xóa câu hỏi <strong>"{questionToDelete.title}"</strong>. Hệ thống sẽ lưu bản chụp vào <code>ModerationLogs</code> và gửi thông báo kèm lý do cho tác giả.
                  </>
                ) : (
                  <>
                    Bạn sắp xóa lời giải của <strong>{solutionToDelete?.authorName}</strong>. Số slot trả lời của câu hỏi sẽ tự động giảm xuống để mở lại chỗ trống.
                  </>
                )}
              </p>

              <div className="space-y-2">
                <span className="block text-xs font-semibold text-neutral-200">
                  Chọn lý do xóa (Bắt buộc *):
                </span>
                <div className="space-y-1.5">
                  {MODERATION_REASON_OPTIONS.map(opt => (
                    <label
                      key={opt.code}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                        deleteReasonCode === opt.code
                          ? 'bg-red-500/15 border-red-500/40 text-white font-semibold'
                          : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                      }`}
                    >
                      <input
                        type="radio"
                        name="moderation-reason-code"
                        value={opt.code}
                        checked={deleteReasonCode === opt.code}
                        onChange={() => setDeleteReasonCode(opt.code)}
                        className="accent-red-500"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Ghi chú thêm cho tác giả (Tùy chọn, tối đa 200 ký tự):
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={deleteReasonNote}
                  onChange={e => setDeleteReasonNote(e.target.value)}
                  placeholder="VD: Vui lòng trình bày rõ các bước biến đổi..."
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400"
                />
              </div>
            </div>

            <div className="modal-footer flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setQuestionToDelete(null);
                  setSolutionToDelete(null);
                  setDeleteReasonNote('');
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={questionToDelete ? handleConfirmDelete : handleConfirmDeleteSolution}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Xác nhận xóa &amp; Gửi thông báo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Chỉnh sửa bài viết (Admin Only) — Phase 1.1 Modal Container / Body / Footer */}
      {canEditContent && questionToEdit && (
        <div role="dialog" aria-modal="true" aria-label="Chỉnh sửa câu hỏi" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-up">
          <div className="modal-container w-full max-w-lg rounded-2xl bg-neutral-950 border border-amber-500/40 shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2 text-amber-400">
                <Edit3 className="w-4 h-4" />
                <h3 className="font-bold text-sm text-white">Chỉnh sửa bài viết Q&A</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuestionToEdit(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmEdit} className="flex flex-col flex-1 min-h-0">
              <div className="modal-body space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Môn học / Nhãn (*):</label>
                <select
                  value={editSubject}
                  onChange={e => setEditSubject(e.target.value as SubjectTag)}
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                >
                  {SUBJECTS.filter(s => s.tag !== 'all').map(s => (
                    <option key={s.tag} value={s.tag}>
                      {s.label} ({s.group === 'academic' ? 'Học thuật' : 'Đời sống'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="tieu-de-cau-hoi-2" className="block text-xs font-semibold text-neutral-300 mb-1">Tiêu đề câu hỏi (*):</label>
                <input id="tieu-de-cau-hoi-2"
                  type="text"
                  required
                  maxLength={150}
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                  <label className="text-xs font-semibold text-neutral-300">Nội dung chi tiết (*):</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const warning = '\n\n[⚠️ CẢNH BÁO TỪ BQT: Bài viết cần tuân thủ văn hóa ứng xử và quy định của diễn đàn F-Forum]';
                        if (!editContent.includes(warning.trim())) {
                          setEditContent(prev => (prev + warning).slice(0, 1500));
                        }
                      }}
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/30 transition-colors cursor-pointer"
                      title="Gắn cảnh báo vi phạm nội quy"
                    >
                      <AlertTriangle size={10} />
                      <span>Cảnh báo nội quy</span>
                    </button>
                  </div>
                </div>
                <textarea
                  required
                  rows={4}
                  maxLength={1500}
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>
              </div>

              <div className="modal-footer flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuestionToEdit(null)}
                  className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Compact Floating Author Context Popover — portaled to document.body */}
      {activeAuthorPopover && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Thông tin người dùng"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveAuthorPopover(null);
          }}
          className="fixed inset-0 z-[100] bg-transparent"
        >
          <div
            style={{
              position: 'fixed',
              left:
                typeof window !== 'undefined'
                  ? Math.max(12, Math.min(authorAnchorPos.x + 12, window.innerWidth - 264))
                  : 24,
              top:
                typeof window !== 'undefined'
                  ? Math.max(12, Math.min(authorAnchorPos.y - 20, window.innerHeight - 230))
                  : 120,
            }}
            className="pc-12-shell w-[248px] rounded-2xl p-3.5 shadow-[0_18px_48px_rgba(0,0,0,0.85)] popover-morph-enter"
          >
            <button
              type="button"
              onClick={() => setActiveAuthorPopover(null)}
              className="absolute top-2.5 right-2.5 p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-2.5 pb-2.5 border-b border-white/10 pr-5">
              <div className="relative shrink-0">
                {/* Nhiệm vụ 10 — 40px + trang trí Discord (nếu tác giả có trang bị). */}
                <DecoratedAvatar
                  user={findDecorationOwner(users, activeAuthorPopover.email, activeAuthorPopover.id)}
                  size={40}
                  animate={false}
                  alt={activeAuthorPopover.name}
                  className="rounded-full ring-1 ring-amber-400/60 shadow-md"
                />
                <span className="absolute -bottom-1 -right-1">
                  <TierBadge level={activeAuthorPopover.level} size={16} showTooltip={false} />
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white flex items-center gap-1 truncate">
                  <span className="truncate">{activeAuthorPopover.name}</span>
                  {isMasterAdmin(activeAuthorPopover.email) && <AdminVerifiedBadge size={12} />}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[9.5px] font-mono font-bold">
                    {getTierForLevel(activeAuthorPopover.level).titleVi}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Lv.{activeAuthorPopover.level}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2.5 flex flex-col gap-1.5">
              {onOpenProfile && (
                <button
                  type="button"
                  onClick={() => {
                    const user = activeAuthorPopover;
                    setActiveAuthorPopover(null);
                    onOpenProfile(user);
                  }}
                  className="pc-12-btn w-full py-2 px-3 rounded-xl text-cyan-200 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Trang cá nhân</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const user = activeAuthorPopover;
                  setActiveAuthorPopover(null);
                  setReportModalUser({ id: user.id, name: user.name });
                }}
                className="pc-12-btn w-full py-2 px-3 rounded-xl text-red-200 hover:text-red-100 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5 text-red-400" />
                <span>Tố cáo</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Tố cáo tài khoản — portaled to document.body */}
      {reportModalUser && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tố cáo tài khoản vi phạm"
          onClick={e => {
            if (e.target === e.currentTarget) {
              setReportModalUser(null);
              setReportSuccessMsg(null);
            }
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-up"
        >
          <div className="liquid-glass w-full max-w-md rounded-3xl bg-neutral-950/95 border border-red-500/40 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2 text-red-400">
                <Flag className="w-5 h-5 text-red-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">Tố Cáo Tài Khoản Vi Phạm</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReportModalUser(null);
                  setReportSuccessMsg(null);
                }}
                className="p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSuccessMsg ? (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs text-emerald-200">{reportSuccessMsg}</p>
                <button
                  type="button"
                  onClick={() => {
                    setReportModalUser(null);
                    setReportSuccessMsg(null);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 text-black text-xs font-bold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-3.5">
                {reportErrorMsg && (
                  <p role="alert" className="ff-report-error">{reportErrorMsg}</p>
                )}
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300">
                  Đối tượng tố cáo: <strong className="text-white">{reportModalUser.name}</strong>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Lý do vi phạm (*):
                  </label>
                  <select
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400"
                  >
                    <option value="Toxic / Gây war / Xúc phạm bạn học">Toxic / Gây war / Xúc phạm bạn học</option>
                    <option value="Spam / Quảng cáo / Lừa đảo">Spam / Quảng cáo / Lừa đảo</option>
                    <option value="Nội dung phản cảm / Đồi trụy">Nội dung phản cảm / Đồi trụy</option>
                    <option value="Gian lận điểm / Hack Coin">Gian lận điểm / Hack Coin</option>
                    <option value="Khác">Lý do khác</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="chi-tiet-vi-pham" className="block text-xs font-semibold text-neutral-300 mb-1">
                    Chi tiết vi phạm:
                  </label>
                  <textarea id="chi-tiet-vi-pham"
                    value={reportDetails}
                    onChange={e => setReportDetails(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Mô tả cụ thể hành vi hoặc bằng chứng vi phạm..."
                    className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400 resize-none"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-500/20 text-[10px] text-red-300 space-y-1">
                  <span className="font-bold flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-red-400" />
                    Kỷ luật trường học nghiêm ngặt:
                  </span>
                  <p>
                    Báo cáo vi phạm sẽ được chuyển tới Ban Quản Trị để xử lý theo nội quy.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setReportModalUser(null)}
                    className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingReport ? 'Đang gửi...' : 'Gửi Tố Cáo'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </section>
  );
};
