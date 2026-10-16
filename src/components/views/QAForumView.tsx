/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDraftAutosave } from '../../utils/useDraftAutosave';
import { useVirtualWindow } from '../../utils/virtualWindow';
import { useInteractionDebounce } from '../../utils/interactionScheduler';
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
  Bookmark,
  BookmarkCheck,
  ArrowUpDown,
  ArrowLeft,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Clock,
  ThumbsUp,
  Heart,
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
import {
  generateGhibliAlias,
  getRandomGhibliMask,
} from '../../utils/ghibliMasks';
import { DEFAULT_AVATAR, handleImageError } from '../../utils/mediaFallback';
import { DecoratedAvatar, DecoratedName, UserNameplateBg } from '../decorations/DecoratedAvatar';
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
import './QAForumView.css';

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
    <div className="flex flex-col gap-2.5 rounded-xl bg-[#0b0d12]/70 border-[1.5px] border-[#f4f1de]/14 p-3">
      {/* Collapsible Header Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setIsExpanded(prev => !prev)}
          aria-expanded={isExpanded}
          className="flex items-center gap-2 text-left cursor-pointer group"
        >
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#f2cc8f]/18 border border-[#f2cc8f]/45 text-xs font-mono font-bold text-[#f2cc8f]">
            ∑
          </span>
          <span className="text-xs font-bold text-[#f4f1de] group-hover:text-[#f2cc8f] transition-colors">
            Bảng ký hiệu toán &amp; khoa học ({MATH_SYMBOLS.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setIsExpanded(prev => !prev)}
          className="ff-tactile-btn inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#151a26] hover:bg-[#e07a5f]/20 border border-[#f4f1de]/18 hover:border-[#f2cc8f]/50 text-[11px] font-bold text-[#f4f1de] transition-all cursor-pointer"
        >
          <span>{isExpanded ? 'Thu gọn' : 'Mở bảng'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-3 pt-2 border-t border-dashed border-[#f4f1de]/14 animate-fade-up">
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
                    className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#e07a5f]/25 text-[#f4f1de] border-[#e07a5f]/60 shadow-[2px_2px_0px_rgba(4,6,11,0.9)]'
                        : 'bg-[#151a26] hover:bg-[#f4f1de]/10 text-[#d8d5ce] hover:text-[#f4f1de] border-[#f4f1de]/14'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="text-[10px] font-mono text-[#f2cc8f]">{tab.badge}</span>
                  </button>
                );
              })}
            </div>

            {/* Mini Search Input for Symbols */}
            <div className="relative w-full sm:w-52 shrink-0">
              <Search className="w-3.5 h-3.5 text-[#9a978e] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                maxLength={40}
                value={symbolSearch}
                onChange={e => setSymbolSearch(e.target.value)}
                placeholder="Tìm: tích phân, pi, căn..."
                aria-label="Tìm nhanh ký hiệu toán học"
                className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-[#0b0d12] border border-[#f4f1de]/18 text-xs text-[#f4f1de] placeholder-[#84817a] focus:outline-none focus:border-[#f2cc8f] transition-colors"
              />
              {symbolSearch && (
                <button
                  type="button"
                  onClick={() => setSymbolSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9a978e] hover:text-[#f4f1de] cursor-pointer"
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
              <p className="col-span-full text-xs text-[#9a978e] italic py-3 px-1">
                Không tìm thấy ký hiệu phù hợp với "{symbolSearch}".
              </p>
            ) : (
              filteredSymbols.map(item => (
                <button
                  key={item.sym}
                  type="button"
                  onClick={() => handleSelectSymbol(item.sym)}
                  className={`ask2027-sym-btn w-11 h-11 rounded-lg bg-neutral-900 min-w-[48px] min-h-[48px] sm:min-w-[50px] sm:min-h-[50px] hover:bg-[#e07a5f]/20 text-[#f4f1de] hover:text-[#f2cc8f] border border-[#f4f1de]/15 hover:border-[#f2cc8f]/50 text-base font-mono font-bold flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2cc8f] ${
                    lastInserted === item.sym ? 'ring-2 ring-[#f2cc8f] scale-95' : ''
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

const QUICK_REACTION_META: {
  type: QAReactionType;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { type: 'helpful', label: 'Hữu ích', Icon: ThumbsUp },
  { type: 'mindblown', label: 'Sáng tạo', Icon: Sparkles },
  { type: 'thanks', label: 'Cảm ơn', Icon: Heart },
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
        const IconComp = item.Icon;
        return (
          <button
            key={item.type}
            type="button"
            onClick={() => onReact?.(item.type)}
            className={`ff-tactile-btn inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border-[1.5px] transition-colors cursor-pointer ${
              active
                ? 'bg-[#e07a5f]/22 border-[#e07a5f]/55 text-[#f4f1de]'
                : 'bg-[#f4f1de]/[0.04] hover:bg-[#f4f1de]/[0.09] border-[#f4f1de]/14 text-[#d8d5ce] hover:text-[#f4f1de]'
            }`}
          >
            <IconComp className="w-3.5 h-3.5 shrink-0" />
            <span>{item.label}</span>
            {count > 0 && <span className="font-mono text-[10px] font-bold ml-0.5 text-[#f2cc8f]">{count}</span>}
          </button>
        );
      })}
    </div>
  );
};

/* Nhiệm vụ 10 — tìm user record (có inventory + equippedDecorations) để render
   trang trí của người khác; không tìm thấy → null (không lộ trang trí). */
const qaUsersByIdCache = new WeakMap<Record<string, User>, Map<string, User>>();
const getQaUsersById = (users: Record<string, User>): Map<string, User> => {
  let map = qaUsersByIdCache.get(users);
  if (!map) {
    map = new Map<string, User>();
    for (const k in users) {
      const u = users[k];
      if (u?.id) map.set(u.id, u);
    }
    qaUsersByIdCache.set(users, map);
  }
  return map;
};

const EMPTY_QA_SOLUTIONS: Solution[] = [];

const findDecorationOwner = (
  users: Record<string, User> | undefined,
  authorEmail: string | null | undefined,
  authorId?: string,
): User | null => {
  if (!users) return null;
  if (authorEmail) {
    const clean = authorEmail.trim().toLowerCase();
    const byEmail = users[clean];
    if (byEmail) return byEmail;
    if (isMasterAdmin(clean) && users['broamstuck@gmail.com']) {
      return users['broamstuck@gmail.com'];
    }
  }
  if ((authorId === 'admin-master' || authorId === 'user-admin') && users['broamstuck@gmail.com']) {
    return users['broamstuck@gmail.com'];
  }
  if (authorId) {
    return getQaUsersById(users).get(authorId) || null;
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
    <div className="comment-thread mt-2.5 pt-2.5 border-t border-dashed border-[#f4f1de]/12">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="inline-flex items-center gap-1.5 text-xs text-[#d8d5ce] hover:text-[#f2cc8f] transition-colors font-bold cursor-pointer"
      >
        <MessageSquare className="w-3.5 h-3.5 text-[#81b29a]" />
        <span>{threadComments.length} bình luận</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f4f1de]/[0.05] border border-[#f4f1de]/14 inline-flex items-center gap-0.5 font-mono">
          {expanded ? 'Thu gọn' : 'Mở'}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </span>
      </button>

      {expanded && (
        <div className="mt-2.5 space-y-2 pl-3 border-l-2 border-[#e07a5f]/35 animate-fade-up">
          {threadComments.length === 0 ? (
            <p className="text-[11px] text-[#9a978e]">Chưa có bình luận.</p>
          ) : (
            threadComments.map((c) => (
              <div key={c.id} className="p-2.5 rounded-lg bg-[#0b0d12]/70 border border-[#f4f1de]/12 text-xs flex items-start gap-2.5">
                <span className="shrink-0 mt-0.5">
                  <DecoratedAvatar
                    user={c.authorEmail ? findDecorationOwner(users, c.authorEmail, c.authorId) : null}
                    fallbackSrc={c.authorAvatar}
                    size={28}
                    animate
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <DecoratedName
                      user={c.authorEmail ? findDecorationOwner(users, c.authorEmail, c.authorId) : null}
                      name={c.authorName.replace(/ \(.*\)/, '')}
                      width={136}
                      height={26}
                      animate
                      showFallbackTag
                    />
                    <span className="text-[10px] text-[#9a978e] font-mono">· {c.createdAt}</span>
                  </div>
                  <p className="text-[#f4f1de] text-xs mt-0.5 break-words leading-relaxed">{c.content}</p>
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
              placeholder={currentUser ? 'Viết bình luận...' : 'Đăng nhập để bình luận...'}
              className="flex-1 bg-[#0b0d12] border-[1.5px] border-[#f4f1de]/16 rounded-lg px-3 py-1.5 text-xs text-[#f4f1de] placeholder-[#84817a] focus:outline-none focus:border-[#f2cc8f]/65"
            />
            <span className="text-[10px] font-mono text-[#9a978e] shrink-0">{text.length}/300</span>
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="ff-tactile-btn px-3 py-1.5 rounded-lg bg-[#e07a5f] hover:bg-[#f2cc8f] border border-[#f4f1de] text-[#0b0d12] text-xs font-extrabold disabled:opacity-40 cursor-pointer shrink-0"
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
    images?: string[];
  }) => void;
  /* AI Moderation v1.0 — kết quả do máy chủ quyết định (bot không cho client
     tự khai). 'rejected' giữ nội dung để sửa; 'review' chờ Admin. */
  onAddSolution: (questionId: string, content: string, imageUrl?: string) => Promise<'accepted' | 'review' | 'rejected' | 'error'> | void;
  /* Lý do bot giữ lại câu trả lời lần gửi gần nhất (inline bên ô trả lời). */
  solutionRejection?: { questionId: string; feedback: string; reason: string; at: number } | null;
  onDismissSolutionRejection?: () => void;
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
  /** Báo cho App biết đang mở chi tiết câu hỏi để ẩn thanh Navbar. */
  onDetailOpenChange?: (open: boolean) => void;
}

const SUBJECTS: { tag: SubjectTag | 'all'; label: string; group: 'academic' | 'life' }[] = [
  { tag: 'all', label: 'Tất cả', group: 'academic' },
  { tag: 'toan', label: 'Toán học', group: 'academic' },
  { tag: 'ly', label: 'Vật lý', group: 'academic' },
  { tag: 'hoa', label: 'Hóa học', group: 'academic' },
  { tag: 'sinh', label: 'Sinh học', group: 'academic' },
  { tag: 'anh', label: 'Tiếng Anh', group: 'academic' },
  { tag: 'tin', label: 'Tin học', group: 'academic' },
  { tag: 'van', label: 'Ngữ văn', group: 'academic' },
  { tag: 'su', label: 'Sử - Địa', group: 'academic' },
  { tag: 'hotro', label: 'Hỗ trợ', group: 'life' },
  { tag: 'kinhnghiem', label: 'Ôn thi', group: 'life' },
  { tag: 'share', label: 'Tài liệu', group: 'life' },
  { tag: 'tamsu', label: 'Tâm sự', group: 'life' },
  { tag: 'tamly', label: 'Tâm lý', group: 'life' },
];

const SUBJECT_2027_META: Record<
  SubjectTag,
  { emoji: string; title: string; color: string; groupLabel: string }
> = {
  toan: { emoji: '', title: 'Toán học', color: '#81b29a', groupLabel: 'Học thuật' },
  ly: { emoji: '', title: 'Vật lý', color: '#81b29a', groupLabel: 'Học thuật' },
  hoa: { emoji: '', title: 'Hóa học', color: '#81b29a', groupLabel: 'Học thuật' },
  sinh: { emoji: '', title: 'Sinh học', color: '#81b29a', groupLabel: 'Học thuật' },
  anh: { emoji: '', title: 'Tiếng Anh', color: '#f2cc8f', groupLabel: 'Học thuật' },
  tin: { emoji: '', title: 'Tin học', color: '#a78bfa', groupLabel: 'Học thuật' },
  van: { emoji: '', title: 'Ngữ văn', color: '#f2cc8f', groupLabel: 'Học thuật' },
  su: { emoji: '', title: 'Sử - Địa', color: '#f2cc8f', groupLabel: 'Học thuật' },
  hotro: { emoji: '', title: 'Hỗ trợ', color: '#e07a5f', groupLabel: 'Đời sống' },
  kinhnghiem: { emoji: '', title: 'Ôn thi', color: '#e07a5f', groupLabel: 'Đời sống' },
  share: { emoji: '', title: 'Tài liệu', color: '#a78bfa', groupLabel: 'Đời sống' },
  tamsu: { emoji: '', title: 'Tâm sự', color: '#e07a5f', groupLabel: 'Đời sống' },
  tamly: { emoji: '', title: 'Tâm lý', color: '#e07a5f', groupLabel: 'Đời sống' },
};

/* Bản đồ màu sắc 4 nhóm hài hòa theo Color Theory 60-30-10 (Sage · Sand · Terracotta · Iris) */
const getSubjectBadgeStyle = (subjectTag: string): string => {
  switch (subjectTag) {
    case 'toan':
    case 'ly':
    case 'hoa':
    case 'sinh':
      return 'bg-[#81b29a]/18 text-[#d8f3dc] border-[#81b29a]/45';
    case 'van':
    case 'su':
    case 'anh':
      return 'bg-[#f2cc8f]/18 text-[#f4f1de] border-[#f2cc8f]/45';
    case 'tin':
    case 'share':
      return 'bg-[#a78bfa]/18 text-[#ede9fe] border-[#a78bfa]/45';
    case 'hotro':
    case 'kinhnghiem':
    case 'tamsu':
    case 'tamly':
      return 'bg-[#e07a5f]/18 text-[#ffedd5] border-[#e07a5f]/45';
    default:
      return 'bg-white/[0.06] text-[#f4f1de] border-white/20';
  }
};

function getQuestionAttachedImages(q?: Question | null): string[] {
  if (!q) return [];
  const out: string[] = [];
  if (Array.isArray(q.images)) {
    for (const item of q.images) {
      if (typeof item === 'string' && item.trim() && !out.includes(item.trim())) {
        out.push(item.trim());
      }
    }
  }
  if (typeof q.imageUrl === 'string' && q.imageUrl.trim() && !out.includes(q.imageUrl.trim())) {
    out.unshift(q.imageUrl.trim());
  }
  return out;
}

function compressQuestionImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lỗi khi đọc file ảnh.'));
    reader.onload = (ev) => {
      const rawDataUrl = typeof ev.target?.result === 'string' ? ev.target.result : '';
      if (!rawDataUrl) {
        reject(new Error('Không đọc được nội dung ảnh.'));
        return;
      }
      if (typeof document === 'undefined' || typeof Image === 'undefined' || file.size <= 350 * 1024) {
        resolve(rawDataUrl);
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          const maxSide = 1600;
          const srcW = Math.max(1, img.naturalWidth || img.width);
          const srcH = Math.max(1, img.naturalHeight || img.height);
          const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
          const targetW = Math.max(1, Math.round(srcW * scale));
          const targetH = Math.max(1, Math.round(srcH * scale));
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, targetW, targetH);
          const webp = canvas.toDataURL('image/webp', 0.88);
          resolve(webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.88));
        } catch {
          resolve(rawDataUrl);
        }
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export const QAForumView: React.FC<QAForumViewProps> = ({
  currentUser,
  questions,
  solutions,
  comments = [],
  onCreateQuestion,
  onAddSolution,
  solutionRejection = null,
  onDismissSolutionRejection,
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
  onDetailOpenChange,
}) => {
  const [selectedTag, setSelectedTag] = useState<SubjectTag | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unsolved' | 'solved' | 'with_image'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useInteractionDebounce(searchTerm, 120);
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  /* Liên kết chia sẻ ?q=<id> mở thẳng câu hỏi (nếu dữ liệu đã có sẵn khi vào trang) */
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(() => {
    const sharedId = typeof window !== 'undefined' ? readSharedQuestionId(window.location.search) : null;
    return sharedId ? questions.find(item => item.id === sharedId) ?? null : null;
  });
  /* Đồng bộ selectedQuestion mỗi khi danh sách questions cập nhật (ảnh đính kèm, lượt thích, đáp án chuẩn, chỉnh sửa) */
  if (selectedQuestion) {
    const latest = questions.find(item => item.id === selectedQuestion.id);
    if (latest && latest !== selectedQuestion) {
      setSelectedQuestion(latest);
    }
  }
  useEffect(() => {
    onDetailOpenChange?.(Boolean(selectedQuestion));
    if (typeof document !== 'undefined' && selectedQuestion) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
        onDetailOpenChange?.(false);
      };
    }
    return () => onDetailOpenChange?.(false);
  }, [selectedQuestion, onDetailOpenChange]);
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
  const listScrollRef = useRef<HTMLElement | null>(null);
  const questionFeedRef = useRef<HTMLDivElement | null>(null);
  const detailScrollRef = useRef<HTMLDivElement | null>(null);
  const savedListScrollTopRef = useRef<number>(0);
  const [questionHeights, setQuestionHeights] = useState(() => new Map<string, number>());
  const questionHeightCacheRef = useRef(new Map<string, number>());
  const questionCardObserversRef = useRef(new Map<string, ResizeObserver>());
  const setQuestionCardRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const questionId = node.dataset.questionId;
    if (!questionId) return;
    const updateHeight = () => {
      const measuredHeight = Math.ceil(node.getBoundingClientRect().height);
      if (measuredHeight <= 0 || questionHeightCacheRef.current.get(questionId) === measuredHeight) return;
      questionHeightCacheRef.current.set(questionId, measuredHeight);
      setQuestionHeights((current) => {
        if (current.get(questionId) === measuredHeight) return current;
        const next = new Map(current);
        next.set(questionId, measuredHeight);
        return next;
      });
    };
    updateHeight();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateHeight);
      observer.observe(node);
      questionCardObserversRef.current.set(questionId, observer);
      return () => {
        observer.disconnect();
        if (questionCardObserversRef.current.get(questionId) === observer) {
          questionCardObserversRef.current.delete(questionId);
        }
      };
    }
  }, []);
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
      savedListScrollTopRef.current = isEmbedded ? window.scrollY : listScrollRef.current.scrollTop;
    }
    setReadingProgress(0);
    setSelectedQuestion(q);
  };

  const handleCloseQuestionDetail = () => {
    setSelectedQuestion(null);
    window.requestAnimationFrame(() => {
      if (isEmbedded) {
        window.scrollTo({ top: savedListScrollTopRef.current, left: 0, behavior: 'instant' });
      } else if (listScrollRef.current) {
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

  const isAskCooling = askCooldown > 0;
  useEffect(() => {
    if (!isAskCooling) return;
    const timer = setInterval(() => {
      setAskCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isAskCooling]);

  const isSolCooling = solCooldown > 0;
  useEffect(() => {
    if (!isSolCooling) return;
    const timer = setInterval(() => {
      setSolCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isSolCooling]);

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
  const [askImages, setAskImages] = useState<string[]>([]);
  const [askImageError, setAskImageError] = useState<string | null>(null);
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [isDraggingAskImage, setIsDraggingAskImage] = useState(false);
  const [askUploadProgress, setAskUploadProgress] = useState<number>(0);
  const [askImageFileName, setAskImageFileName] = useState<string | null>(null);

  const processAskImageFiles = async (fileList: FileList | File[] | undefined | null) => {
    if (!fileList) return;
    const files = Array.from(fileList).filter(Boolean);
    if (files.length === 0) return;
    if (askImages.length >= 6) {
      setAskImageError('Tối đa 6 ảnh đính kèm cho mỗi câu hỏi!');
      return;
    }
    const maxSize = 20 * 1024 * 1024;
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setAskImageError('Vui lòng chỉ tải lên tệp hình ảnh (PNG, JPG, WebP)!');
        return;
      }
      if (file.size > maxSize) {
        setAskImageError(`Kích thước ảnh (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn cho phép 20MB!`);
        return;
      }
    }

    setAskImageError(null);
    const toProcess = files.slice(0, Math.max(1, 6 - askImages.length));
    setAskImageFileName(
      toProcess.length === 1
        ? `${toProcess[0].name} (${Math.max(1, Math.round(toProcess[0].size / 1024))} KB)`
        : `Đã chọn thêm ${toProcess.length} ảnh`,
    );
    setAskUploadProgress(35);
    try {
      const processedUrls: string[] = [];
      for (const file of toProcess) {
        const dataUrl = await compressQuestionImageFile(file);
        if (dataUrl) processedUrls.push(dataUrl);
      }
      setAskUploadProgress(100);
      setAskImages((prev) => {
        const next = [...prev, ...processedUrls].slice(0, 6);
        setAskImage(next[0] ?? null);
        return next;
      });
      window.setTimeout(() => setAskUploadProgress(0), 500);
    } catch {
      setAskUploadProgress(0);
      setAskImageError('Lỗi khi xử lý file ảnh. Vui lòng thử lại!');
    }
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

  const solutionsByQuestionId = useMemo(() => {
    const map = new Map<string, Solution[]>();
    for (const s of solutions) {
      const list = map.get(s.questionId);
      if (list) list.push(s);
      else map.set(s.questionId, [s]);
    }
    return map;
  }, [solutions]);

  const filteredQuestions = useMemo(() => {
    const matched = questions.filter(q => {
      const matchesTag = selectedTag === 'all' || q.subject === selectedTag;
      const matchesSearch =
        q.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        q.content.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        q.subject.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesSaved = !showSavedOnly || mySavedIds.includes(q.id);
      const qImages = getQuestionAttachedImages(q);
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'unsolved'
            ? !q.isSolved
            : statusFilter === 'solved'
              ? Boolean(q.isSolved)
              : qImages.length > 0;
      return matchesTag && matchesSearch && matchesSaved && matchesStatus;
    });
    /*
      Đếm số lời giải MỘT lần cho cả danh sách thay vì đếm lại trong mỗi lần so
      sánh — sort gọi comparator O(n log n) lần, đếm bên trong sẽ thành O(n² log n).
    */
    const counts = buildSolutionCounts(solutions);
    return sortQuestions(matched, sortMode, counts);
  }, [questions, solutions, selectedTag, statusFilter, debouncedSearchTerm, showSavedOnly, mySavedIds, sortMode]);

  const { isItemVisible: isQuestionVisible } = useVirtualWindow({
    totalItems: filteredQuestions.length,
    itemHeight: 280,
    columns: 1,
    overscan: 6,
    containerRef: isEmbedded ? undefined : listScrollRef,
    rootRef: questionFeedRef,
  });

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
    const finalImages = askImages.length > 0 ? askImages : askImage ? [askImage] : [];

    onCreateQuestion({
      title: newTitle.trim().slice(0, 150),
      subject: newSubject,
      content: newContent.trim().slice(0, 1500),
      isAnonymous,
      bountyCoin,
      imageUrl: finalImages[0] || undefined,
      images: finalImages.length > 0 ? finalImages : undefined,
    });

    setNewTitle('');
    setNewContent('');
    clearAskDraft();
    setAskImage(null);
    setAskImages([]);
    setAskImageFileName(null);
    setAskImageError(null);
    setIsAnonymous(false);
    setIsAskModalOpen(false);
    setIsSubmittingAsk(false);
    setAskCooldown(5);
  };

  const handleSolutionSubmit = async (questionId: string) => {
    if (solCooldown > 0 || isSubmittingSol) return;
    if (!solutionText.trim()) return;
    if (!currentUser) {
      alert('Vui lòng đăng nhập để gửi câu trả lời!');
      onOpenLoginModal?.();
      return;
    }

    setIsSubmittingSol(true);
    const trimmed = solutionText.trim().slice(0, 1500);
    const result = await onAddSolution(questionId, trimmed, solImage || undefined);
    if (result === 'rejected') {
      /* Bot chưa đăng (lạc đề/spam): GIỮ nguyên nội dung để học sinh đọc lý do,
         chỉnh sửa rồi gửi lại — không xoá, không mất công viết. */
      setSolutionText(trimmed);
    } else {
      safeStorage.removeItem(`fforum_draft_solution_${questionId}`);
      setSolDraftRestoredAt(null);
      setSolutionText('');
      setSolImage(null);
      setSolImageError(null);
    }
    setIsSubmittingSol(false);
    setSolCooldown(3);
  };

  return (
    <section
      ref={listScrollRef}
      aria-labelledby="qa-forum-title"
      className={`ff-qa-room relative w-full ${
        isEmbedded
          ? 'min-h-screen overflow-visible'
          : 'h-[100dvh] md:h-screen overflow-y-auto'
      } flex flex-col pt-[calc(54px+var(--safe-top)+12px)] md:pt-24 pb-[calc(56px+var(--safe-bottom)+16px)] md:pb-10 px-4 sm:px-6 lg:px-8`}
    >
      <div className="ff-qa-bg ff-raw-grid-surface fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0d12] via-[#10141d] to-[#0b0d12]" />
        <div className="absolute top-[-15%] left-[20%] w-[600px] h-[600px] rounded-full bg-[#e07a5f]/[0.035] blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[650px] h-[650px] rounded-full bg-[#81b29a]/[0.03] blur-[150px]" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex-1 flex flex-col">
        {/* Top Neo-Brutalist Academic Dispatch Header */}
        <div className="ff-qa-dispatch-board relative z-20 mb-5 shrink-0 flex flex-col">
          <div className="p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-[6px] bg-[#e07a5f]/18 border-2 border-[#e07a5f]/55 flex items-center justify-center shrink-0 shadow-[3px_3px_0px_#04060a]">
                <HelpCircle className="w-5 h-5 text-[#f2cc8f]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 id="qa-forum-title" className="ff-typo-poster ff-qa-page-title !text-xl sm:!text-2xl text-[#f4f1de]">
                    <span className="ff-swash-cap">H</span>ỏi đáp <em className="font-['Cormorant_Garamond',Georgia,serif] italic font-semibold text-[#f2cc8f]">học thuật</em>
                  </h1>
                  <span
                    className="ff-brutal-index"
                    aria-label={`${questions.length} câu hỏi, ${questions.filter(q => q.isSolved).length} đã có lời giải chuẩn`}
                  >
                    {questions.length} câu · {questions.filter(q => q.isSolved).length} giải
                  </span>
                  <span className="ff-atelier-ribbon hidden sm:inline-flex !py-0.5 !px-2.5 !text-[10px]">
                    Học · Hỏi · Chia sẻ
                  </span>
                </div>
                <svg className="w-28 h-2 mt-0.5 ff-organic-squiggle" viewBox="0 0 140 8" aria-hidden="true">
                  <path d="M2 5 C28 1, 56 8, 84 4 S118 1, 138 5" />
                </svg>
                <p className="ff-qa-subtitle">Đặt câu hỏi rõ bản chất, đối chiếu lập luận và cùng nhau tháo gỡ từng bước.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Bộ lọc "Đã lưu" */}
              {savedOwnerKey && (
                <button
                  type="button"
                  onClick={() => setShowSavedOnly(prev => !prev)}
                  aria-pressed={showSavedOnly}
                  className={`ff-tactile-btn inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border-[1.5px] transition-colors cursor-pointer ${
                    showSavedOnly
                      ? 'bg-[#f2cc8f]/20 border-[#f2cc8f]/55 text-[#f4f1de]'
                      : 'bg-[#0b0d12]/80 text-[#d8d5ce] hover:text-[#f4f1de] border-[#f4f1de]/15'
                  }`}
                  title={showSavedOnly ? 'Bấm để xem tất cả câu hỏi' : 'Chỉ hiện câu hỏi đã lưu'}
                >
                  <Bookmark className="w-3.5 h-3.5 text-[#f2cc8f]" />
                  <span>Đã lưu</span>
                  {mySavedIds.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded bg-[#f2cc8f]/25 text-[#f4f1de] text-[10px] font-mono font-bold">
                      {mySavedIds.length}
                    </span>
                  )}
                </button>
              )}

              {/* Menu sắp xếp */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSortMenuOpen(prev => !prev)}
                  aria-expanded={isSortMenuOpen}
                  aria-haspopup="menu"
                  className={`ff-tactile-btn inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border-[1.5px] transition-colors cursor-pointer ${
                    sortMode !== DEFAULT_QUESTION_SORT
                      ? 'bg-[#81b29a]/20 border-[#81b29a]/50 text-[#f4f1de]'
                      : 'bg-[#0b0d12]/80 text-[#d8d5ce] hover:text-[#f4f1de] border-[#f4f1de]/15'
                  }`}
                  title="Sắp xếp danh sách câu hỏi"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#81b29a]" />
                  <span>{QUESTION_SORT_OPTIONS.find(o => o.id === sortMode)?.label ?? 'Sắp xếp'}</span>
                </button>

                {isSortMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-1.5 w-56 rounded-xl ff-glass-depth-2 p-1.5 z-50 space-y-0.5 animate-fade-up"
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
                          className={`w-full px-2.5 py-2 text-left rounded-lg transition-colors cursor-pointer ${
                            isActive ? 'bg-[#e07a5f]/20' : 'hover:bg-white/[0.06]'
                          }`}
                        >
                          <span
                            className={`flex items-center gap-2 text-xs font-semibold ${
                              isActive ? 'text-[#f2cc8f]' : 'text-[#f4f1de]'
                            }`}
                          >
                            {isActive ? <Check size={12} /> : <span className="w-3" />}
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Đặt câu hỏi CTA (Style 3 Neo-Brutalist + Style 8 Tactile Squishy) */}
              <button
                onClick={() => {
                  if (!currentUser) {
                    onOpenLoginModal?.();
                  } else {
                    setIsAskModalOpen(true);
                  }
                }}
                className="ff-tactile-btn px-4 py-2 rounded-xl text-xs font-extrabold bg-[#f4f1de] hover:bg-[#f2cc8f] text-[#0b0d12] border-2 border-[#0b0d12] transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-[#e07a5f]" />
                <span>Đặt câu hỏi</span>
              </button>
            </div>
          </div>

          {/* Row 2: Search Input + Status Filter Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2.5 border-t border-dashed border-[#f4f1de]/10">
            <div className="relative flex-1 sm:max-w-sm ff-qa-search">
              <Search className="w-3.5 h-3.5 text-[#9a978e] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                aria-label="Tìm câu hỏi theo từ khóa"
                maxLength={100}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Tìm bài tập, môn học..."
                className="w-full pl-8 pr-8 py-1.5 rounded-lg text-xs bg-[#0b0d12]/85 border-[1.5px] border-[#f4f1de]/15 text-[#f4f1de] placeholder-[#84817a] focus:outline-none focus:border-[#f2cc8f]/60 transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9a978e] hover:text-[#f4f1de] cursor-pointer"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Tabs */}
            <div className="ff-qa-status-filters flex items-center gap-1.5 shrink-0 flex-wrap" role="group" aria-label="Lọc câu hỏi theo trạng thái">
              {([
                { id: 'all', label: 'Tất cả' },
                { id: 'unsolved', label: 'Chờ giải' },
                { id: 'solved', label: 'Đã giải' },
                { id: 'with_image', label: 'Có ảnh' },
              ] as const).map(tab => {
                const active = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    aria-pressed={active}
                    className={`ff-qa-filter-chip px-2.5 py-1.5 rounded-md text-xs font-bold border-[1.5px] transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#e07a5f]/22 border-[#e07a5f]/55 text-[#f4f1de] shadow-[2px_2px_0px_rgba(4,6,11,0.9)]'
                        : 'bg-[#f4f1de]/[0.04] hover:bg-[#f4f1de]/[0.09] border-[#f4f1de]/12 text-[#b5b2a9] hover:text-[#f4f1de]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Full-Width Subject Tags Strip */}
          <div className="ff-qa-subject-filters flex items-center gap-1.5 flex-wrap pt-2 border-t border-dashed border-[#f4f1de]/10" role="group" aria-label="Lọc câu hỏi theo môn học">
            <Filter className="w-3.5 h-3.5 text-[#9a978e] shrink-0 mr-0.5" aria-hidden="true" />
            {SUBJECTS.map(subj => {
              const isActive = selectedTag === subj.tag;
              return (
                <button
                  key={subj.tag}
                  type="button"
                  onClick={() => setSelectedTag(subj.tag)}
                  aria-pressed={isActive}
                  className={`ff-qa-subject-chip px-2.5 py-1 rounded-md text-xs font-mono font-bold whitespace-nowrap border-[1.5px] transition-colors cursor-pointer inline-flex items-center gap-1 ${
                    isActive
                      ? subj.tag === 'all'
                        ? 'bg-[#f2cc8f]/22 text-[#f4f1de] border-[#f2cc8f]/55 shadow-[2px_2px_0px_rgba(4,6,11,0.9)]'
                        : `${getSubjectBadgeStyle(subj.tag)} shadow-[2px_2px_0px_rgba(4,6,11,0.9)]`
                      : 'bg-[#f4f1de]/[0.03] text-[#b5b2a9] hover:bg-[#f4f1de]/[0.08] hover:text-[#f4f1de] border-[#f4f1de]/12'
                  }`}
                >
                  <span>{subj.label}</span>
                </button>
              );
            })}
          </div>
          </div>
        </div>

        {/* Main Content Area: Questions Feed (Col 8) + Leaderboard (Col 4) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 pb-6 items-start">
          {/* Left: Questions Feed */}
          <div ref={questionFeedRef} className="ff-qa-feed lg:col-span-8 space-y-2.5 pb-6">
          {(isSynced || filteredQuestions.length > 0) && (
            <div className="ff-qa-feed-summary" role="status" aria-live="polite" aria-atomic="true">
              <span className="ff-qa-feed-label">BẢNG CÂU HỎI</span>
              <span className="ff-qa-feed-count">
                {filteredQuestions.length} câu phù hợp
              </span>
            </div>
          )}
          {!isSynced && filteredQuestions.length === 0 ? (
            <div className="rounded-2xl bg-[#0e1522]/90 border border-white/[0.08] overflow-hidden">
              <CommentSkeletonList rows={4} />
            </div>
          ) : filteredQuestions.length === 0 ? (
            showSavedOnly && mySavedIds.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-center p-6 text-[#9a978e] ff-bento-cell space-y-2">
                <Bookmark className="w-8 h-8 text-[#f2cc8f] mb-1" />
                <p className="text-sm font-bold text-[#f4f1de]">
                  <span className="ff-swash-cap text-base">C</span>hưa lưu câu hỏi nào
                </p>
                <p className="text-xs text-[#a39f96] max-w-sm">
                  Đánh dấu các bài toán hoặc thảo luận hay để dễ dàng xem lại khi ôn tập bạn nhé.
                </p>
                <button
                  type="button"
                  onClick={() => setShowSavedOnly(false)}
                  className="ff-tactile-btn mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#e07a5f] hover:bg-[#f2cc8f] text-[#0b0d12] border border-[#f4f1de] text-xs font-extrabold transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Xem tất cả câu hỏi</span>
                </button>
              </div>
            ) : showSavedOnly || searchTerm || selectedTag !== 'all' ? (
              <div className="h-56 flex flex-col items-center justify-center text-center p-6 text-[#9a978e] ff-bento-cell space-y-2">
                <Search className="w-8 h-8 text-[#f2cc8f] mb-1" />
                <p className="text-sm font-bold text-[#f4f1de]">
                  <span className="ff-swash-cap text-base">K</span>hông có câu hỏi khớp bộ lọc
                </p>
                <p className="text-xs text-[#a39f96] max-w-sm">
                  Thử tìm kiếm với từ khoá khác hoặc xoá bộ lọc để khám phá toàn bộ giảng đường.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowSavedOnly(false);
                    setSearchTerm('');
                    setSelectedTag('all');
                  }}
                  className="ff-tactile-btn mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#e07a5f] hover:bg-[#f2cc8f] text-[#0b0d12] border border-[#f4f1de] text-xs font-extrabold transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Xoá bộ lọc</span>
                </button>
              </div>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-center p-6 text-[#9a978e] ff-bento-cell space-y-2">
                <HelpCircle className="w-8 h-8 text-[#f2cc8f] mb-1" />
                <p className="text-sm font-bold text-[#f4f1de]">
                  <span className="ff-swash-cap text-base">C</span>hưa có câu hỏi nào
                </p>
                <p className="text-xs text-[#a39f96] max-w-sm">
                  Cậu đang băn khoăn bài tập nào không? Hãy mở đầu bằng câu hỏi đầu tiên để cùng thảo luận nhé!
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
                  className="ff-tactile-btn mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#e07a5f] hover:bg-[#f2cc8f] text-[#0b0d12] border border-[#f4f1de] text-xs font-extrabold transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Đặt câu hỏi đầu tiên</span>
                </button>
              </div>
            )
          ) : (
            filteredQuestions.map((q, qIndex) => {
              if (!isQuestionVisible(qIndex)) {
                return (
                  <div
                    key={q.id}
                    className="ff-virtual-card ff-virtual-card--recycled"
                    style={{
                      height: `${questionHeights.get(q.id) ?? 280}px`,
                      contain: 'strict',
                      opacity: 0,
                      background: 'transparent',
                      border: 0,
                    }}
                    aria-hidden="true"
                  />
                );
              }
              const qSolutions = solutionsByQuestionId.get(q.id) || EMPTY_QA_SOLUTIONS;
              const bestSol = qSolutions.find(s => s.isBest);
              const subjectLabel = SUBJECTS.find(s => s.tag === q.subject)?.label || q.subject;
              const attachedImages = getQuestionAttachedImages(q);

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
                  data-question-id={q.id}
                  ref={setQuestionCardRef}
                  className={`ff-virtual-card ff-qa-card cursor-pointer p-4 sm:p-5 group ${
                    q.isSolved ? 'is-solved' : 'is-unsolved'
                  }`}
                >
                  <div className="flex items-stretch">
                    {/* Cột Trái (Style 3 Neo-Brutalism + Style 7 Raw Exposed Grid): Mã thứ tự, Ô đếm lời giải & Mức thưởng */}
                    <div className="hidden sm:flex flex-col items-center justify-between w-[84px] shrink-0 pr-4 mr-4 border-r-[1.5px] border-dashed border-[#f4f1de]/18 select-none">
                      <span className="w-full text-center py-0.5 rounded-[4px] bg-[#0b0d12] border border-[#f4f1de]/15 text-[10px] font-mono font-extrabold text-[#9a978e]">
                        #{String(qIndex + 1).padStart(2, '0')}
                      </span>

                      <div
                        className={`w-full my-2 py-2 px-1.5 rounded-[5px] border-[1.5px] text-center shadow-[2px_2px_0px_#04060a] transition-colors ${
                          q.isSolved
                            ? 'bg-[#81b29a]/20 border-[#81b29a]/60 text-[#d8f3dc]'
                            : qSolutions.length > 0
                            ? 'bg-[#f2cc8f]/15 border-[#f2cc8f]/50 text-[#f2cc8f]'
                            : 'bg-[#0b0d12]/80 border-[#f4f1de]/18 text-[#9a978e]'
                        }`}
                      >
                        <div className="text-base font-mono font-extrabold leading-none">
                          {qSolutions.length}/3
                        </div>
                        <div className="text-[9px] font-mono font-bold uppercase tracking-wider mt-1 opacity-85">
                          {q.isSolved ? 'ĐÃ GIẢI' : 'LỜI GIẢI'}
                        </div>
                      </div>

                      <span className="w-full text-center py-0.5 px-1 rounded-[4px] bg-[#f2cc8f]/15 border border-[#f2cc8f]/45 text-[10px] font-mono font-extrabold text-[#f2cc8f]">
                        +{q.bountyCoin || 20}C
                      </span>
                    </div>

                    {/* Cột Phải: Nội dung câu hỏi (Typography-Led + Kinetic Underline + Raw Telemetry Footer) */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      {/* Hàng 1: Nhãn môn học (Neo-Brutalist), Trạng thái (Holographic / Organic), Mã câu hỏi & Công cụ */}
                      <div className="flex items-center justify-between gap-2.5 mb-2.5">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className={`ff-brutal-tag ${getSubjectBadgeStyle(q.subject)}`}>
                            <span>{subjectLabel}</span>
                          </span>

                          {q.isSolved ? (
                            <span className="sm:hidden ff-holo-badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[5px] text-xs font-bold text-[#d8f3dc]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#81b29a] shrink-0" />
                              <span>Đã giải</span>
                            </span>
                          ) : (
                            <span className="sm:hidden ff-organic-badge !py-0.5 !px-2.5 !rounded-[5px] inline-flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#e07a5f] shrink-0" />
                              <span>Chờ giải</span>
                            </span>
                          )}

                          <span className="sm:hidden inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[5px] bg-[#f2cc8f]/15 border-[1.5px] border-[#f2cc8f]/40 text-xs font-mono font-bold text-[#f2cc8f] shadow-[2px_2px_0px_rgba(4,6,11,0.85)]">
                            <Coins className="w-3.5 h-3.5 text-[#f2cc8f] shrink-0" />
                            <span>+{q.bountyCoin || 20} Coin</span>
                          </span>

                          {attachedImages.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[5px] bg-[#81b29a]/15 border-[1.5px] border-[#81b29a]/40 text-xs font-semibold text-[#d8f3dc]">
                              <ImageIcon className="w-3.5 h-3.5 text-[#81b29a] shrink-0" />
                              <span>{attachedImages.length} ảnh</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSaveQuestion(q.id);
                            }}
                            aria-pressed={isQuestionSaved(savedMap, savedOwnerKey, q.id)}
                            className={`ff-tactile-btn p-2 rounded-[6px] border transition-colors cursor-pointer ${
                              isQuestionSaved(savedMap, savedOwnerKey, q.id)
                                ? 'bg-[#f2cc8f]/20 border-[#f2cc8f]/55 text-[#f2cc8f]'
                                : 'bg-[#0b0d12]/70 border-[#f4f1de]/15 text-[#b5b2a9] hover:bg-[#f4f1de]/10 hover:text-[#f4f1de]'
                            }`}
                            title={
                              isQuestionSaved(savedMap, savedOwnerKey, q.id)
                                ? 'Bỏ lưu câu hỏi này'
                                : 'Lưu câu hỏi này'
                            }
                            aria-label={
                              isQuestionSaved(savedMap, savedOwnerKey, q.id)
                                ? `Bỏ lưu câu hỏi: ${q.title}`
                                : `Lưu câu hỏi: ${q.title}`
                            }
                          >
                            {isQuestionSaved(savedMap, savedOwnerKey, q.id) ? (
                              <BookmarkCheck size={14} />
                            ) : (
                              <Bookmark size={14} />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!currentUser) {
                                onOpenLoginModal?.();
                                return;
                              }
                              setReportModalUser({
                                id: q.authorId,
                                name: `${q.authorName} — Bài hỏi: "${q.title.slice(0, 48)}"`,
                              });
                            }}
                            className="ff-tactile-btn p-2 rounded-[6px] bg-[#0b0d12]/70 hover:bg-rose-500/15 border border-[#f4f1de]/15 hover:border-rose-400/40 text-[#b5b2a9] hover:text-rose-200 transition-colors cursor-pointer"
                            title="Báo cáo bài viết vi phạm"
                            aria-label={`Báo cáo bài viết: ${q.title}`}
                          >
                            <Flag size={14} />
                          </button>

                          {canEditContent && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuQuestionId(prev => (prev === q.id ? null : q.id));
                                }}
                                className="ff-tactile-btn p-2 rounded-[6px] bg-[#0b0d12]/70 hover:bg-[#f4f1de]/10 text-[#b5b2a9] hover:text-[#f4f1de] border border-[#f4f1de]/15 transition-colors cursor-pointer"
                                title="Tùy chọn quản trị bài viết"
                                aria-label="Tùy chọn quản trị bài viết"
                              >
                                <MoreVertical size={14} />
                              </button>

                              {openMenuQuestionId === q.id && (
                                <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-[#0b0d12] border-[1.5px] border-[#f4f1de]/20 shadow-[4px_4px_0px_#04060a] p-2 z-30 space-y-1 animate-fade-up">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuQuestionId(null);
                                      handleAdminEditPost(q.id);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs font-semibold text-[#f2cc8f] hover:bg-[#f2cc8f]/15 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <Edit3 size={13} />
                                    <span>Chỉnh sửa bài viết</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuQuestionId(null);
                                      handleAdminDeletePost(q.id);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-200 hover:bg-rose-500/15 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                    <span>Xóa bài viết</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hàng 2: Tiêu đề (Typography-Led + Kinetic Underline) & Nội dung tóm tắt */}
                      <div className="min-w-0 space-y-1.5">
                        <h3 className="ff-typo-thread-title ff-kinetic-title ff-kinetic-underline text-base sm:text-[18.5px] font-extrabold text-[#f4f1de] group-hover:text-[#f2cc8f] transition-colors leading-snug">
                          {q.title}
                        </h3>
                        <p className="ff-typo-measure text-[13.5px] sm:text-sm text-[#d8d5ce] line-clamp-2 leading-relaxed">
                          {q.content}
                        </p>
                      </div>

                      {/* Hàng 3: Tác giả & Nút mở câu hỏi (Exposed Grid Footer) */}
                      <div className="flex items-center justify-between gap-3 mt-3.5 pt-2.5 border-t-[1.5px] border-dashed border-[#f4f1de]/14 flex-wrap">
                        <div className="flex items-center gap-2.5 min-w-0">
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
                            className="inline-flex items-center gap-2 hover:opacity-85 transition-opacity cursor-pointer text-left min-w-0"
                            title={q.isAnonymous ? 'Tác giả ẩn danh' : 'Xem thông tin tác giả'}
                          >
                            {q.isAnonymous ? (
                              <img
                                src={q.authorAvatar}
                                alt={q.authorName}
                                onError={e => handleImageError(e, DEFAULT_AVATAR)}
                                loading="lazy"
                                decoding="async"
                                width={28}
                                height={28}
                                className="w-7 h-7 rounded-full object-cover border border-[#f4f1de]/20 shrink-0"
                              />
                            ) : (
                              <span className="shrink-0">
                                <DecoratedAvatar
                                  user={findDecorationOwner(users, undefined, q.authorId)}
                                  fallbackSrc={q.authorAvatar}
                                  size={28}
                                  animate
                                  alt={q.authorName}
                                />
                              </span>
                            )}
                            {q.isAnonymous ? (
                              <span className="text-xs font-semibold truncate max-w-[160px] text-[#f2cc8f]">
                                {q.authorName}
                              </span>
                            ) : (
                              <DecoratedName
                                user={findDecorationOwner(users, undefined, q.authorId)}
                                name={q.authorName.replace(/ \(.*\)/, '')}
                                width={136}
                                height={26}
                                animate
                                showFallbackTag
                              />
                            )}
                            {q.isAnonymous && (
                              <span className="px-1.5 py-0.5 rounded-[4px] bg-[#e07a5f]/18 border border-[#e07a5f]/40 text-[10px] text-[#f2cc8f] font-mono font-bold shrink-0">
                                Ẩn danh
                              </span>
                            )}
                          </button>
                          <span className="text-xs text-[#9a978e] font-mono">· {q.createdAt}</span>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-mono text-[#d8d5ce] shrink-0">
                          <span className="inline-flex items-center gap-1" title="Lượt xem">
                            <Eye className="w-3.5 h-3.5 text-[#9a978e]" />
                            <span>{q.views}</span>
                          </span>
                          <span className="ff-tactile-btn inline-flex items-center gap-1.5 px-3 py-1 rounded-[5px] bg-[#81b29a]/18 group-hover:bg-[#81b29a]/30 border-[1.5px] border-[#81b29a]/50 text-[#f4f1de] font-bold transition-colors">
                            <MessageSquare className="w-3.5 h-3.5 text-[#81b29a]" />
                            <span>{bestSol ? 'Xem lời giải →' : 'Giải bài →'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Đáp án chuẩn tóm tắt (Style 9: Holographic Iridescent Verified Banner) */}
                      {bestSol && (
                        <div className="ff-holo-card mt-3 px-3.5 py-2 rounded-[6px] flex items-center justify-between gap-2 text-xs text-[#f4f1de]">
                          <div className="flex items-center gap-2 min-w-0">
                            <Award className="w-4 h-4 text-[#81b29a] shrink-0" />
                            <span className="font-bold text-[#d8f3dc] shrink-0">Đáp án chuẩn:</span>
                            <span className="truncate text-[#f4f1de]">{bestSol.content}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          </div>

          {/* Right Sidebar: Leaderboard */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4 pb-6">
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

      {/* Modal: Đặt Câu Hỏi Học Thuật Mới — Portaled Full-bleed Studio Modal */}
      {isAskModalOpen && typeof document !== 'undefined' && (() => {
        const currentSubjectMeta = SUBJECT_2027_META[newSubject] || SUBJECT_2027_META.toan;
        /* Super Admin: Coin vô vùng (∞) — không chặn mức treo thưởng. */
        const userBalance = effectiveCoinBalance(currentUser?.role, currentUser?.coin ?? 100);

        return createPortal(
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
            className="ask2027-backdrop fixed inset-0 z-[130] flex items-center justify-center p-0 sm:p-5 animate-fade-up"
          >
            <div className="modal-container ask2027-modal w-full h-full sm:h-auto sm:max-w-[860px] rounded-none sm:rounded-[28px] relative">
              {/* Background Mesh Gradient Layer (Calm Academic Library) */}
              <div className="ask2027-mesh-layer" aria-hidden="true">
                <div className="ask2027-mesh-blob-cyan" />
                <div className="ask2027-mesh-blob-purple" />
              </div>

              {/* STICKY HEADER — Clean Academic Library Seal & High-Contrast Title */}
              <div
                className={`flex items-center justify-between px-5 sm:px-8 pt-5 pb-4 border-b border-white/10 shrink-0 transition-shadow duration-200 z-20 ${
                  isAskModalScrolled ? 'bg-[#0A0E1A]/95 shadow-[0_14px_32px_rgba(0,0,0,0.75)]' : ''
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#81b29a]/15 border border-[#81b29a]/40 flex items-center justify-center shrink-0">
                    <svg
                      viewBox="0 0 36 36"
                      className="w-6 h-6 ask2027-orb-icon"
                      aria-hidden="true"
                    >
                      <defs>
                        <linearGradient id="ask2027PrismGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#81b29a" />
                          <stop offset="100%" stopColor="#e9c46a" />
                        </linearGradient>
                        <radialGradient id="ask2027CoreGlow" cx="35%" cy="30%" r="65%">
                          <stop offset="0%" stopColor="#f8f7f4" stopOpacity="0.95" />
                          <stop offset="55%" stopColor="#e9c46a" stopOpacity="0.85" />
                          <stop offset="100%" stopColor="#81b29a" stopOpacity="0.9" />
                        </radialGradient>
                      </defs>
                      <polygon
                        points="18,2 31,11 26,30 10,30 5,11"
                        fill="url(#ask2027PrismGrad)"
                        fillOpacity="0.22"
                        stroke="url(#ask2027PrismGrad)"
                        strokeWidth="1.6"
                      />
                      <path
                        d="M18 4 L22.2 13.8 L32 18 L22.2 22.2 L18 32 L13.8 22.2 L4 18 L13.8 13.8 Z"
                        fill="url(#ask2027CoreGlow)"
                      />
                      <circle cx="18" cy="18" r="3.2" fill="#f8f7f4" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex items-center gap-2">
                    <h3 className="font-bold text-lg sm:text-[22px] leading-tight tracking-tight ask2027-title-gradient truncate">
                      <span className="ff-swash-cap text-xl">Đ</span>ặt câu hỏi
                    </h3>
                    <span className="ff-atelier-ribbon !py-0.2 !px-1.5 !text-[8.5px] hidden sm:inline-flex">
                      Học · Hỏi · Chia sẻ
                    </span>
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
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[#f2cc8f] font-bold">
                        01 · THÔNG TIN CƠ BẢN
                      </span>
                    </div>

                    {/* Hàng 1: 2 Cột đều nhau (Chủ đề môn học + Chế độ Ẩn danh Ghibli) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                      {/* Cột 1: Custom Glass Subject Dropdown */}
                      <div className="relative">
                        <label className="block text-[13.5px] font-medium text-[#f4f1de] mb-2">
                          Chủ đề <span className="text-[#e07a5f]">*</span>
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
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-mono font-bold shrink-0 border"
                              style={{
                                background: `color-mix(in srgb, ${currentSubjectMeta.color} 18%, rgba(255,255,255,0.04))`,
                                borderColor: `color-mix(in srgb, ${currentSubjectMeta.color} 48%, transparent)`,
                                color: currentSubjectMeta.color,
                              }}
                            >
                              #{newSubject}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[14px] font-semibold text-[#f4f1de] truncate">
                                  {currentSubjectMeta.title}
                                </span>
                              </div>
                              <span className="text-[11px] text-[#9a978e] block">
                                {currentSubjectMeta.groupLabel}
                              </span>
                            </div>
                          </div>

                          <ChevronDown
                            className={`w-4 h-4 text-[#f2cc8f] shrink-0 transition-transform duration-200 ${
                              isSubjectDropdownOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </div>

                      {/* Cột 2: Phân luồng Danh tính (Công khai / Ẩn danh) */}
                      <div>
                        <label className="block text-[13.5px] font-medium text-[#f4f1de] mb-2">
                          Chế độ hiển thị
                        </label>
                        <div className="ask2027-field-shell px-3.5 py-2.5 flex items-center justify-between gap-3 min-h-[58px]">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                                isAnonymous
                                  ? 'bg-[#e07a5f]/20 border-[#e07a5f]/50 text-[#f2cc8f]'
                                  : 'bg-white/[0.05] border-white/10 text-[#81b29a]'
                              }`}
                            >
                              <EyeOff className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[13.5px] font-semibold text-[#f4f1de] block truncate">
                                {isAnonymous ? 'Ẩn danh' : 'Công khai'}
                              </span>
                              <span className="text-[11px] text-[#9a978e] block truncate">
                                {isAnonymous ? previewAlias || 'Biệt danh ẩn danh' : 'Hiển thị tên thật'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsAnonymous(prev => !prev)}
                            aria-pressed={isAnonymous}
                            className={`w-12 h-6 rounded-full transition-all relative focus:outline-none cursor-pointer shrink-0 ${
                              isAnonymous
                                ? 'bg-[#e07a5f]'
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
                      <div className="mb-5 p-3 rounded-xl bg-[#151a26] border-[1.5px] border-[#f4f1de]/20 shadow-[4px_4px_0px_rgba(4,6,11,0.95)] grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto ask2027-scrollbar animate-fade-up z-30">
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
                              className={`p-2.5 rounded-lg flex items-center gap-2.5 text-left transition-all cursor-pointer border ${
                                isSelected
                                  ? 'bg-[#e07a5f]/20 border-[#e07a5f]/55 shadow-[2px_2px_0px_rgba(4,6,11,0.9)]'
                                  : 'bg-[#0b0d12]/60 hover:bg-[#f4f1de]/[0.06] border-[#f4f1de]/10'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-bold text-[#f4f1de] truncate">
                                    {meta.title}
                                  </span>
                                  <span
                                    className="text-[10px] font-mono font-bold shrink-0"
                                    style={{ color: meta.color }}
                                  >
                                    {s.label}
                                  </span>
                                </div>
                                <span className="text-[10px] text-[#9a978e] block">
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
                      <div className="mb-5 p-3 rounded-xl bg-[#0b0d12] border-[1.5px] border-[#f2cc8f]/40 flex items-center gap-3 animate-fade-up">
                        {previewMask && (
                          <img
                            src={previewMask}
                            alt="Ghibli Wizard Mask"
                            onError={e => handleImageError(e, DEFAULT_AVATAR)}
                            loading="lazy"
                            decoding="async"
                            width={38}
                            height={38}
                            className="w-9 h-9 rounded-full border border-[#f2cc8f]/60 p-0.5 shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#f2cc8f] truncate">
                              {previewAlias}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-[#f2cc8f]/20 text-[#f4f1de] border border-[#f2cc8f]/40 flex items-center gap-1 shrink-0">
                              <Wand2 className="w-3 h-3 text-[#f2cc8f]" />
                              Ẩn danh
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Hàng 2: Tiêu đề câu hỏi */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label htmlFor="tieu-de-cau-hoi" className="text-[13.5px] font-medium text-[#f4f1de] flex items-center gap-1.5">
                          <span>Tiêu đề câu hỏi</span>
                          <span className="text-[#e07a5f]">*</span>
                        </label>
                      </div>
                      <div className="ask2027-field-shell flex items-center px-4 py-3 gap-3">
                        <Lightbulb className="w-4 h-4 text-[#f2cc8f] shrink-0" />
                        <input
                          id="tieu-de-cau-hoi"
                          type="text"
                          required
                          maxLength={150}
                          value={newTitle}
                          onChange={e => setNewTitle(e.target.value)}
                          placeholder="VD: Cách giải phương trình vi phân cấp 2 bài tập số 3..."
                          className="w-full bg-transparent text-[15px] text-[#f4f1de] placeholder-[#84817a] focus:outline-none leading-relaxed"
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
                      <label htmlFor="noi-dung-chi-tiet-thac-mac" className="text-[13.5px] font-medium text-[#f4f1de] flex items-center gap-2">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-[#f2cc8f] font-bold">
                          02 · NỘI DUNG CHI TIẾT
                        </span>
                        <span className="text-[#e07a5f]">*</span>
                      </label>
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${
                          newContent.length >= 1400
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-white/[0.04] text-[#9a978e]'
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
                        onChange={e => setNewContent(e.target.value)}
                        placeholder="Ghi rõ đề bài, dữ kiện đã cho và bước biến đổi đang vướng mắc..."
                        className="w-full min-h-[152px] bg-transparent text-[15px] text-[#f4f1de] placeholder-[#84817a] focus:outline-none resize-y leading-[1.7] ask2027-scrollbar"
                      />
                    </div>
                  </div>

                  {/* ============================================================
                      [CARD 3] CÔNG CỤ HỖ TRỢ (Bảng Ký Hiệu Toán Thu Gọn Mặc Định + Đính Kèm Ảnh)
                      ============================================================ */}
                  <div className="ask2027-card-section">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[#f2cc8f] font-bold">
                        03 · CÔNG CỤ HỖ TRỢ
                      </span>
                    </div>

                    {/* Bảng ký hiệu toán học — Mặc định THU GỌN (collapsed), mở ra mới hiện lưới 48-52px */}
                    <MathSymbolsBar
                      defaultExpanded={false}
                      onInsert={sym => setNewContent(newContent + sym)}
                    />

                    <div className="ask2027-section-divider" />

                    {/* Khu vực đính kèm hình ảnh */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[13.5px] font-medium text-[#f4f1de]">
                          Đính kèm ảnh (Tối đa 6 ảnh · &le; 20MB/ảnh)
                        </label>
                        <span className="text-[11px] font-mono text-[#81b29a]">
                          {askImages.length > 0 ? `Đã đính kèm ${askImages.length}/6 ảnh` : 'PNG • JPG • WEBP'}
                        </span>
                      </div>

                      {askUploadProgress > 0 && (
                        <div className="mb-3 space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono text-[#f2cc8f]">
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

                      {askImages.length > 0 ? (
                        <div className="rounded-xl border-[1.5px] border-[#81b29a]/45 bg-[#0b0d12]/90 p-3.5 space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {askImages.map((imgUrl, idx) => (
                              <div
                                key={`${idx}-${imgUrl.slice(0, 24)}`}
                                className="relative rounded-xl overflow-hidden bg-black/50 border border-[#f4f1de]/15 aspect-[4/3] group"
                              >
                                <img
                                  loading="lazy"
                                  decoding="async"
                                  src={imgUrl}
                                  alt={`Đính kèm câu hỏi ${idx + 1}`}
                                  onClick={() => setLightboxImageUrl(imgUrl)}
                                  className="w-full h-full object-contain cursor-zoom-in"
                                />
                                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/75 border border-[#f4f1de]/15 text-[10px] font-mono text-[#f2cc8f]">
                                  Ảnh {idx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAskImages((prev) => {
                                      const next = prev.filter((_, i) => i !== idx);
                                      setAskImage(next[0] ?? null);
                                      if (next.length === 0) setAskImageFileName(null);
                                      return next;
                                    });
                                  }}
                                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/75 hover:bg-red-500/35 border border-white/25 hover:border-red-400 text-white hover:text-red-200 flex items-center justify-center cursor-pointer transition-all"
                                  title="Gỡ ảnh này"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-dashed border-[#f4f1de]/12">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#d8f3dc]">
                              <ImageIcon className="w-3.5 h-3.5 text-[#81b29a]" />
                              <span>Đính kèm {askImages.length} ảnh{askImageFileName ? ` · ${askImageFileName}` : ''}</span>
                            </span>

                            <div className="flex items-center gap-2">
                              {askImages.length < 6 && (
                                <label
                                  htmlFor="field-more-images"
                                  className="ff-tactile-btn px-3 py-1 rounded-lg bg-[#81b29a]/20 hover:bg-[#81b29a]/35 border border-[#81b29a]/50 text-xs font-bold text-[#d8f3dc] inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                  <span>Thêm ảnh ({askImages.length}/6)</span>
                                  <input
                                    id="field-more-images"
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => {
                                      if (e.target.files?.length) {
                                        void processAskImageFiles(e.target.files);
                                        e.target.value = '';
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </label>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setAskImages([]);
                                  setAskImage(null);
                                  setAskImageFileName(null);
                                }}
                                className="px-3 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/35 text-xs font-semibold text-rose-200 cursor-pointer"
                              >
                                Xóa tất cả ảnh
                              </button>
                            </div>
                          </div>
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
                            if (e.dataTransfer?.files?.length) {
                              void processAskImageFiles(e.dataTransfer.files);
                            }
                          }}
                          className={`ask2027-dropzone flex flex-col sm:flex-row items-center justify-center gap-3.5 p-5 cursor-pointer ${
                            isDraggingAskImage ? 'is-dragging' : ''
                          }`}
                        >
                          <div className="w-11 h-11 rounded-xl bg-[#f2cc8f]/18 border border-[#f2cc8f]/45 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-5 h-5 text-[#f2cc8f]" />
                          </div>
                          <div className="text-center sm:text-left">
                            <span className="text-xs sm:text-[13.5px] font-bold text-[#f4f1de] block">
                              Kéo &amp; thả ảnh vào đây hoặc <span className="text-[#f2cc8f] underline decoration-[#f2cc8f]/50">chọn tệp từ thiết bị</span>
                            </span>
                          </div>
                          <input
                            id="field"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={e => {
                              if (e.target.files?.length) {
                                void processAskImageFiles(e.target.files);
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
                <div className="modal-footer px-5 sm:px-8 py-4 bg-[#0b0d12]/95 space-y-3">
                  {/* Hàng trên của Footer: Cược Coin Phần Thưởng (Bounty Bet) */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-dashed border-[#f4f1de]/12">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-bold text-[#f4f1de]">
                        Cược Coin thưởng:
                      </span>
                      <div className="ask2027-coin-badge px-2.5 py-1 rounded-full flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-[#f2cc8f] shrink-0" />
                        <span className="text-[11px] font-mono font-bold text-[#f2cc8f]">
                          Số dư: {formatCoinBalance(userBalance)} Coin
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* +/- Stepper */}
                      <div className="inline-flex items-center gap-1.5 bg-[#151a26] border border-[#f2cc8f]/40 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => setBountyCoin(prev => Math.max(10, prev - 10))}
                          disabled={bountyCoin <= 10}
                          aria-label="Giảm 10 Coin cược"
                          className="w-7 h-7 rounded-lg bg-[#0b0d12] hover:bg-[#f2cc8f]/20 text-[#f4f1de] font-mono font-bold text-sm flex items-center justify-center disabled:opacity-35 cursor-pointer"
                        >
                          −
                        </button>
                        <span className="px-2.5 text-xs sm:text-sm font-mono font-extrabold text-[#f2cc8f] min-w-[74px] text-center">
                          {bountyCoin} Coin
                        </span>
                        <button
                          type="button"
                          onClick={() => setBountyCoin(prev => Math.min(Math.max(100, userBalance), prev + 10))}
                          aria-label="Tăng 10 Coin cược"
                          className="w-7 h-7 rounded-lg bg-[#0b0d12] hover:bg-[#f2cc8f]/20 text-[#f4f1de] font-mono font-bold text-sm flex items-center justify-center cursor-pointer"
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
                              className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 ${
                                isSelected
                                  ? 'bg-[#f2cc8f]/25 border-[#f2cc8f] text-[#f4f1de]'
                                  : 'bg-[#151a26] border-[#f4f1de]/15 text-[#9a978e] hover:bg-[#f4f1de]/10 hover:text-[#f4f1de]'
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
                      <span className="ask2027-xp-pill inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-mono font-bold bg-[#81b29a]/18 text-[#d8f3dc] border border-[#81b29a]/45">
                        <Sparkles className="w-3.5 h-3.5 text-[#81b29a]" />
                        <span>+50 XP</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSubjectDropdownOpen(false);
                          setIsAskModalOpen(false);
                        }}
                        className="ask2027-ghost-btn px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={askCooldown > 0 || isSubmittingAsk}
                        className="ff-tactile-btn px-6 py-2.5 rounded-xl font-extrabold text-xs sm:text-[13.5px] bg-[#f4f1de] hover:bg-[#f2cc8f] text-[#0b0d12] border-2 border-[#0b0d12] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isSubmittingAsk ? (
                          <>
                            <span className="w-4 h-4 rounded-full border-2 border-[#0b0d12]/30 border-t-[#0b0d12] animate-spin" />
                            <span>Đang gửi...</span>
                          </>
                        ) : askCooldown > 0 ? (
                          <span>Chờ {askCooldown}s...</span>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 text-[#e07a5f]" />
                            <span>Đăng câu hỏi</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        );
      })()}

      {/* Giao diện Chi Tiết Câu Hỏi & Trả Lời — Full-screen (ẩn Navbar), bố cục gọn, không emoji thừa, khung trả lời liền mạch */}
      {selectedQuestion && (() => {
        const activeSolutions = solutions
          .filter(s => s.questionId === selectedQuestion.id && s.status !== 'deleted')
          .sort((a, b) => (b.isBest ? 1 : 0) - (a.isBest ? 1 : 0));
        const remainingSlots = Math.max(0, 3 - activeSolutions.length);
        const isAnswerLimitReached = activeSolutions.length >= 3;
        const detailImages = getQuestionAttachedImages(selectedQuestion);

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

        const detailSubjectLabel =
          SUBJECTS.find(s => s.tag === selectedQuestion.subject)?.label || selectedQuestion.subject;
        const bestBonusCoin = Math.floor((selectedQuestion.bountyCoin || 20) * 0.5) + 100;

        const detailPageNode = (
          <div
            role="region"
            aria-label="Trang chi tiết câu hỏi"
            className="ff-qa-detail fixed inset-0 z-[75] w-screen h-[100dvh] overflow-hidden bg-[#0b0d12] ff-raw-grid-surface animate-fade-up flex flex-col"
          >
            {/* Thanh tiến trình đọc 2px trên cùng */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 left-0 right-0 h-[2.5px] bg-[#f4f1de]/10 z-50 overflow-hidden"
            >
              <div
                className="h-full bg-gradient-to-r from-[#e07a5f] via-[#f2cc8f] to-[#81b29a] transition-[width] duration-150 ease-out"
                style={{ width: `${readingProgress}%` }}
              />
            </div>

            {/* Thanh điều hướng riêng của Trang Câu Hỏi */}
            <header className="px-4 sm:px-8 lg:px-12 h-16 border-b border-dashed border-[#f4f1de]/15 bg-[#151a26]/95 backdrop-blur-xl flex items-center justify-between gap-3 shrink-0 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={handleCloseQuestionDetail}
                  className="ff-tactile-btn inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0b0d12] hover:bg-[#f4f1de]/[0.08] border-[1.5px] border-[#f4f1de]/20 text-xs sm:text-sm font-bold text-[#f4f1de] transition-colors cursor-pointer shrink-0"
                  title="Quay lại danh sách câu hỏi"
                >
                  <ArrowLeft className="w-4 h-4 text-[#f2cc8f]" />
                  <span>
                    <span className="ff-swash-cap text-xs">D</span>iễn đàn Hỏi đáp
                  </span>
                </button>

                <span className="h-5 w-px bg-[#f4f1de]/15 hidden sm:block" aria-hidden="true" />
                <span className="ff-atelier-ribbon !py-0.2 !px-1.5 !text-[8px] hidden md:inline-flex">
                  Học · Hỏi · Chia sẻ
                </span>

                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className={`ff-brutal-tag ${getSubjectBadgeStyle(selectedQuestion.subject)}`}>
                    <span>{detailSubjectLabel}</span>
                  </span>

                  {selectedQuestion.isSolved ? (
                    <span className="ff-holo-badge px-2.5 py-0.5 rounded-md text-xs font-bold text-[#d8f3dc] inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#81b29a] shrink-0" />
                      <span>Đã có đáp án chuẩn</span>
                    </span>
                  ) : activeSolutions.length === 0 ? (
                    <span className="ff-organic-badge !py-0.5 !px-2.5 !rounded-md inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#e07a5f] shrink-0" />
                      <span>Đang chờ lời giải</span>
                    </span>
                  ) : (
                    <span className="ff-organic-sage-badge !py-0.5 !px-2.5 !rounded-md inline-flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-[#81b29a] shrink-0" />
                      <span>Đang thảo luận ({activeSolutions.length}/3)</span>
                    </span>
                  )}

                  <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-[#f2cc8f]/15 text-[#f2cc8f] border-[1.5px] border-[#f2cc8f]/40 shadow-[2px_2px_0px_rgba(4,6,11,0.85)] inline-flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-[#f2cc8f] shrink-0" />
                    <span>+{selectedQuestion.bountyCoin || 20} Coin</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <ShareRow
                  url={buildQuestionShareUrl(selectedQuestion.id, window.location.origin, window.location.pathname)}
                  title={selectedQuestion.title}
                />
                <button
                  type="button"
                  onClick={() => handleToggleSaveQuestion(selectedQuestion.id)}
                  aria-pressed={isQuestionSaved(savedMap, savedOwnerKey, selectedQuestion.id)}
                  className={`ff-tactile-btn inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-[1.5px] text-xs font-bold transition-colors cursor-pointer ${
                    isQuestionSaved(savedMap, savedOwnerKey, selectedQuestion.id)
                      ? 'bg-[#f2cc8f]/20 border-[#f2cc8f]/55 text-[#f4f1de]'
                      : 'bg-[#0b0d12] border-[#f4f1de]/18 text-[#d8d5ce] hover:text-[#f4f1de]'
                  }`}
                  title={
                    isQuestionSaved(savedMap, savedOwnerKey, selectedQuestion.id)
                      ? 'Bỏ lưu câu hỏi'
                      : 'Lưu câu hỏi'
                  }
                >
                  {isQuestionSaved(savedMap, savedOwnerKey, selectedQuestion.id) ? (
                    <BookmarkCheck size={15} className="text-[#f2cc8f]" />
                  ) : (
                    <Bookmark size={15} />
                  )}
                  <span className="hidden md:inline">
                    {isQuestionSaved(savedMap, savedOwnerKey, selectedQuestion.id) ? 'Đã lưu' : 'Lưu bài'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      onOpenLoginModal?.();
                      return;
                    }
                    setReportModalUser({
                      id: selectedQuestion.authorId,
                      name: `${selectedQuestion.authorName} — Bài hỏi: "${selectedQuestion.title.slice(0, 48)}"`,
                    });
                  }}
                  className="ff-tactile-btn inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#e07a5f]/15 hover:bg-[#e07a5f]/28 border-[1.5px] border-[#e07a5f]/40 text-xs font-bold text-[#ffedd5] transition-colors cursor-pointer"
                  title="Báo cáo bài viết vi phạm"
                >
                  <Flag size={14} />
                  <span className="hidden md:inline">Báo cáo</span>
                </button>

                {canEditContent && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleAdminEditPost(selectedQuestion.id)}
                      className="ff-tactile-btn inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#f2cc8f]/20 hover:bg-[#f2cc8f]/30 border-[1.5px] border-[#f2cc8f]/45 text-xs font-bold text-[#f4f1de] cursor-pointer"
                      title="Chỉnh sửa nội dung câu hỏi"
                    >
                      <Edit3 size={14} />
                      <span className="hidden lg:inline">Sửa bài</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdminDeletePost(selectedQuestion.id)}
                      className="ff-tactile-btn inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border-[1.5px] border-rose-400/45 text-xs font-bold text-rose-200 cursor-pointer"
                      title="Xóa câu hỏi vi phạm"
                    >
                      <Trash2 size={14} />
                      <span className="hidden lg:inline">Xóa</span>
                    </button>
                  </>
                )}
              </div>
            </header>

            {/* Vùng nội dung cuộn rộng rãi: Cột chính (Đề bài + Lời giải + Ô trả lời) & Sidebar */}
            <div
              ref={detailScrollRef}
              onScroll={handleDetailScroll}
              className="flex-1 overflow-y-auto min-h-0"
            >
              <div className="max-w-[1380px] w-full mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
                {/* CỘT CHÍNH (8/12) */}
                <div className="lg:col-span-8 min-w-0 space-y-6">
                  {/* Khối câu hỏi chính */}
                  <div className="question-card">
                    <div className="question-text min-w-0">
                      <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-white/10 flex-wrap">
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
                          className="inline-flex items-center gap-3 text-xs text-slate-200 hover:opacity-90 transition-opacity cursor-pointer text-left min-w-0"
                          title={selectedQuestion.isAnonymous ? 'Tác giả ẩn danh' : 'Xem thông tin tác giả'}
                        >
                          {selectedQuestion.isAnonymous ? (
                            <img
                              src={selectedQuestion.authorAvatar}
                              alt={selectedQuestion.authorName}
                              onError={e => handleImageError(e, DEFAULT_AVATAR)}
                              loading="lazy"
                              decoding="async"
                              width={38}
                              height={38}
                              className="w-9 h-9 rounded-full object-cover border border-white/15 shrink-0"
                            />
                          ) : (
                            <span className="shrink-0">
                              <DecoratedAvatar
                                user={findDecorationOwner(users, undefined, selectedQuestion.authorId)}
                                fallbackSrc={selectedQuestion.authorAvatar}
                                size={38}
                                animate
                                alt={selectedQuestion.authorName}
                              />
                            </span>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {selectedQuestion.isAnonymous ? (
                                <span className="text-sm font-bold truncate text-indigo-200">
                                  {selectedQuestion.authorName}
                                </span>
                              ) : (
                                <DecoratedName
                                  user={findDecorationOwner(users, undefined, selectedQuestion.authorId)}
                                  name={selectedQuestion.authorName.replace(/ \(.*\)/, '')}
                                  width={154}
                                  height={28}
                                  animate
                                  showFallbackTag
                                />
                              )}
                              {selectedQuestion.isAnonymous && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-500/15 text-indigo-200 border border-indigo-400/25 inline-flex items-center gap-1 shrink-0">
                                  <Wand2 className="w-3 h-3 text-indigo-300" />
                                  <span>Ẩn danh</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                              Đăng lúc {selectedQuestion.createdAt} · {selectedQuestion.views} lượt xem
                            </span>
                          </div>
                        </button>

                        <span className="ff-brutal-tag bg-[#e07a5f]/15 border-[#e07a5f]/50 text-[#f4f1de]">
                          CÂU HỎI MÔN {detailSubjectLabel.toUpperCase()}
                        </span>
                      </div>

                      <h1 className="ff-typo-hero-title text-xl sm:text-2xl text-[#f4f1de] leading-snug mb-4">
                        {selectedQuestion.title}
                      </h1>

                      <div className="p-4 sm:p-5 rounded-xl bg-[#0b0d12]/80 border border-[#f4f1de]/14 mb-4">
                        <p className="text-sm sm:text-base text-[#f4f1de] leading-[1.8] whitespace-pre-line">
                          {selectedQuestion.content}
                        </p>
                      </div>

                      {detailImages.length > 0 && (
                        <div className="my-4 space-y-2.5">
                          <div className="flex items-center justify-between gap-2 text-xs text-[#f2cc8f] font-bold">
                            <span className="inline-flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5 text-[#f2cc8f]" />
                              <span>Đính kèm {detailImages.length} ảnh đề bài</span>
                            </span>
                            <span className="text-[11px] text-[#9a978e]">
                              Nhấn vào ảnh để phóng to
                            </span>
                          </div>
                          <div className={`grid gap-3 ${detailImages.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                            {detailImages.map((imgUrl, idx) => (
                              <div
                                key={`${idx}-${imgUrl.slice(0, 24)}`}
                                role="button"
                                tabIndex={0}
                                onClick={() => setLightboxImageUrl(imgUrl)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setLightboxImageUrl(imgUrl);
                                  }
                                }}
                                className="relative rounded-xl overflow-hidden bg-black/55 border border-[#f4f1de]/18 hover:border-[#f2cc8f]/55 p-2 transition-all cursor-zoom-in group"
                                title="Bấm để phóng to ảnh"
                              >
                                <img
                                  loading="lazy"
                                  decoding="async"
                                  src={imgUrl}
                                  alt={`Đính kèm câu hỏi ${idx + 1}`}
                                  className="max-h-[440px] w-full rounded-lg object-contain mx-auto"
                                />
                                {detailImages.length > 1 && (
                                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/75 border border-[#f4f1de]/18 text-[10.5px] font-mono text-[#f2cc8f]">
                                    Ảnh {idx + 1}/{detailImages.length}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
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

                        {!isAnswerLimitReached && (
                          <button
                            type="button"
                            onClick={() => {
                              const box = document.getElementById('field-2');
                              box?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              box?.focus();
                            }}
                            className="ff-tactile-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f4f1de] hover:bg-[#f2cc8f] border-2 border-[#0b0d12] text-xs font-extrabold text-[#0b0d12] cursor-pointer transition-colors"
                          >
                            <Send className="w-3.5 h-3.5 text-[#e07a5f]" />
                            <span>Giải bài (+25 Coin)</span>
                          </button>
                        )}
                      </div>

                      <CommentThread
                        commentableType="question"
                        commentableId={selectedQuestion.id}
                        comments={comments}
                        currentUser={currentUser}
                        onSubmitComment={onAddComment}
                        onOpenLoginModal={onOpenLoginModal}
                        users={users}
                      />
                    </div>
                  </div>

                  {/* Tiêu đề danh sách lời giải */}
                  <div className="answer-section-label">
                    <span className="inline-flex items-center gap-2 text-base font-extrabold text-[#f4f1de]">
                      <MessageSquare className="w-4 h-4 text-[#81b29a]" />
                      <span>Lời giải ({activeSolutions.length}/3)</span>
                    </span>
                    <span className="ff-brutal-index">
                      {remainingSlots > 0 ? `Còn ${remainingSlots} vị trí` : 'Đủ 3/3 lời giải'}
                    </span>
                  </div>

                  {/* Danh sách lời giải */}
                  <div className="space-y-4">
                    {activeSolutions.length === 0 ? (
                      <div className="ff-bento-cell py-8 px-6 text-center space-y-1">
                        <p className="text-[#f4f1de] text-sm font-bold">
                          <span className="ff-swash-cap text-base">C</span>hưa có lời giải nào được gửi
                        </p>
                        <p className="text-xs text-[#a39f96]">
                          Cậu nắm rõ cách giải bài này chứ? Hãy viết lời giải để hỗ trợ bạn bè nhé!
                        </p>
                      </div>
                    ) : (
                      activeSolutions.map((sol, solIdx) => {
                        const isSuperAdminSolver = isMasterAdmin(sol.authorEmail);
                        const solverName = isSuperAdminSolver ? MASTER_ADMIN_CONFIG.name : sol.authorName;
                        const solverAvatar = isSuperAdminSolver ? MASTER_ADMIN_CONFIG.avatar : sol.authorAvatar;
                        const canConfirmBest =
                          isSuperAdmin || currentUser?.id === selectedQuestion.authorId;

                        return (
                          <div
                            key={sol.id}
                            className={`answer-card ${sol.isBest ? 'verified' : ''}`}
                          >
                            <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/[0.08] flex-wrap gap-2">
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
                                className="inline-flex items-center gap-3 hover:opacity-85 transition-opacity cursor-pointer text-left"
                                title="Xem hồ sơ người giải bài"
                              >
                                <div className="relative shrink-0">
                                  <DecoratedAvatar
                                    user={findDecorationOwner(users, isSuperAdminSolver ? MASTER_ADMIN_CONFIG.email : sol.authorEmail, sol.authorId)}
                                    fallbackSrc={solverAvatar}
                                    size={38}
                                    animate
                                    className={isSuperAdminSolver ? 'ring-2 ring-amber-400 rounded-full' : 'rounded-full'}
                                  />
                                  <span className="absolute -bottom-1 -right-1 z-[4]">
                                    <TierBadge level={isSuperAdminSolver ? 150 : sol.authorLevel} size={15} showTooltip={false} />
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <DecoratedName
                                    user={findDecorationOwner(users, isSuperAdminSolver ? MASTER_ADMIN_CONFIG.email : sol.authorEmail, sol.authorId)}
                                    name={solverName.replace(/ \(.*\)/, '')}
                                    width={150}
                                    height={28}
                                    animate
                                    showFallbackTag
                                  />
                                  {isSuperAdminSolver && <AdminVerifiedBadge size={13} />}
                                  <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10 text-[10.5px] text-slate-300 font-mono">
                                    Lv.{sol.authorLevel}
                                  </span>
                                  <span className="text-xs text-slate-400 font-mono">
                                    · {sol.createdAt}
                                  </span>
                                </div>
                              </button>

                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] font-mono font-bold text-slate-300">
                                  LỜI GIẢI #{solIdx + 1}
                                </span>
                                {sol.isBest && (
                                  <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/45 text-emerald-200 text-xs font-extrabold inline-flex items-center gap-1.5">
                                    <Award className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                                    <span>Đáp án chuẩn (+{bestBonusCoin} Coin)</span>
                                  </span>
                                )}
                                {sol.status === 'review' && (
                                  <span
                                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/35 text-amber-200 text-[11px] font-semibold inline-flex items-center gap-1"
                                    title={sol.moderation?.feedback || 'Câu trả lời đang chờ người quản trị xem xét.'}
                                  >
                                    <Clock className="w-3 h-3 text-amber-300 shrink-0" />
                                    <span>Đang chờ xem xét</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                              <p className="text-sm sm:text-[15px] text-slate-100 leading-[1.78] whitespace-pre-line">
                                {sol.content}
                              </p>
                            </div>

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
                                className="image-wrapper mt-3.5"
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

                            <div className="mt-3.5 pt-3 border-t border-white/[0.08] flex items-center justify-between flex-wrap gap-2.5">
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

                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!currentUser) {
                                      onOpenLoginModal?.();
                                      return;
                                    }
                                    setReportModalUser({
                                      id: sol.authorId,
                                      name: `${solverName} — Lời giải #${solIdx + 1}`,
                                    });
                                  }}
                                  className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-rose-200 transition-colors px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/15 border border-white/10 hover:border-rose-400/35 cursor-pointer"
                                  title="Báo cáo lời giải vi phạm"
                                >
                                  <Flag size={12} />
                                  <span>Báo cáo</span>
                                </button>

                                {canEditContent && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeleteReasonCode('rule_violation');
                                      setDeleteReasonNote('');
                                      setSolutionToDelete(sol);
                                    }}
                                    className="inline-flex items-center gap-1.5 text-xs text-rose-200 hover:text-rose-100 transition-colors px-3 py-1.5 rounded-xl bg-rose-500/12 border border-rose-500/30 cursor-pointer font-semibold"
                                    title="Xóa phản hồi vi phạm"
                                  >
                                    <Trash2 size={12} />
                                    <span>Xóa phản hồi vi phạm</span>
                                  </button>
                                )}

                                {canConfirmBest && !sol.isBest && (
                                  <button
                                    onClick={() => onMarkBestSolution(selectedQuestion.id, sol.id)}
                                    className="ff-tactile-btn px-3.5 py-1.5 rounded-lg bg-[#81b29a]/22 hover:bg-[#81b29a]/35 text-[#d8f3dc] font-bold text-xs border-[1.5px] border-[#81b29a]/55 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                                    title={`Chọn làm đáp án chuẩn (+${bestBonusCoin} Coin)`}
                                  >
                                    <Check className="w-3.5 h-3.5 text-[#81b29a]" />
                                    <span>Chọn đáp án chuẩn (+{bestBonusCoin} Coin)</span>
                                  </button>
                                )}
                              </div>
                            </div>

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

                  {/* Khung soạn câu trả lời rộng rãi, liền mạch */}
                  {isAnswerLimitReached ? (
                    <div className="p-5 rounded-xl bg-[#81b29a]/15 border-[1.5px] border-[#81b29a]/45 flex items-center justify-center gap-2.5 text-sm font-bold text-[#d8f3dc]">
                      <CheckCircle2 className="w-4 h-4 text-[#81b29a] shrink-0" />
                      <span>Câu hỏi đã đủ 3/3 lời giải. Bạn có thể trao đổi thêm ở phần bình luận.</span>
                    </div>
                  ) : (
                    <div className="ff-bento-cell !p-5 sm:!p-6 space-y-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <label htmlFor="field-2" className="text-sm sm:text-base font-extrabold text-[#f4f1de] flex items-center gap-2">
                          <span>
                            <span className="ff-swash-cap text-base">V</span>iết lời giải của bạn
                          </span>
                        </label>
                        <div className="flex items-center gap-2">
                          {solDraftRestoredAt && (
                            <button
                              type="button"
                              onClick={discardSolutionDraft}
                              className="ff-tactile-btn inline-flex items-center gap-1 rounded-lg border border-[#f2cc8f]/40 bg-[#f2cc8f]/15 px-2.5 py-1 text-xs font-bold text-[#f2cc8f] cursor-pointer"
                            >
                              <span>Bỏ nháp đã lưu</span>
                            </button>
                          )}
                          <span className="px-2.5 py-1 rounded-md bg-[#81b29a]/18 border-[1.5px] border-[#81b29a]/45 text-xs font-mono font-bold text-[#d8f3dc]">
                            +25 Coin · +25 XP
                          </span>
                        </div>
                      </div>

                      {solutionRejection && solutionRejection.questionId === selectedQuestion.id && (
                        <div className="rounded-xl border-[1.5px] border-[#e07a5f]/50 bg-[#e07a5f]/15 px-4 py-3.5 flex items-start gap-3 animate-fade-up">
                          <AlertTriangle className="w-5 h-5 text-[#f2cc8f] shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-[#f4f1de]">Câu trả lời cần chỉnh sửa thêm</p>
                            <p className="text-xs text-[#d8d5ce] mt-1 leading-relaxed">
                              {solutionRejection.feedback ||
                                'Câu trả lời này chưa liên quan rõ tới câu hỏi. Hãy trả lời đúng nội dung bài rồi gửi lại nhé.'}
                            </p>
                            <button
                              type="button"
                              onClick={onDismissSolutionRejection}
                              className="ff-tactile-btn mt-2 px-3 py-1 rounded-lg bg-[#f2cc8f]/20 border border-[#f2cc8f]/45 text-xs font-bold text-[#f4f1de] cursor-pointer"
                            >
                              Đã hiểu
                            </button>
                          </div>
                        </div>
                      )}

                      <textarea
                        id="field-2"
                        rows={6}
                        maxLength={1500}
                        value={solutionText}
                        onChange={e => setSolutionText(e.target.value)}
                        placeholder="Trình bày rõ các bước biến đổi, công thức hoặc lập luận giải bài của bạn..."
                        className="w-full min-h-[150px] bg-[#0b0d12] border-[1.5px] border-[#f4f1de]/18 rounded-xl px-4 py-3.5 text-sm sm:text-[15px] text-[#f4f1de] placeholder-[#84817a] focus:outline-none focus:border-[#f2cc8f] resize-y leading-relaxed"
                      />

                      <MathSymbolsBar onInsert={sym => setSolutionText(prev => prev + sym)} />

                      <div className="pt-3 border-t border-dashed border-[#f4f1de]/15 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          {solImage ? (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#81b29a]/18 border-[1.5px] border-[#81b29a]/45 text-xs font-bold text-[#d8f3dc]">
                              <ImageIcon className="w-4 h-4 text-[#81b29a]" />
                              <span>Đã đính kèm ảnh lời giải</span>
                              <button
                                type="button"
                                onClick={() => setSolImage(null)}
                                className="p-0.5 rounded hover:bg-rose-500/25 text-rose-300 cursor-pointer"
                                title="Gỡ ảnh"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <label
                              htmlFor="field-3"
                              className="ff-tactile-btn inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border-[1.5px] border-[#f4f1de]/18 hover:border-[#f2cc8f]/55 bg-[#0b0d12] text-xs font-bold text-[#f4f1de] cursor-pointer transition-colors"
                            >
                              <ImageIcon className="w-4 h-4 text-[#f2cc8f]" />
                              <span>Đính kèm ảnh bài giải</span>
                              <input
                                id="field-3"
                                type="file"
                                accept="image/*"
                                maxLength={200}
                                onChange={e => handleImageUpload(e, setSolImage, setSolImageError)}
                                className="hidden"
                              />
                            </label>
                          )}
                          <span className="text-xs font-mono text-[#9a978e]">
                            {solutionText.length}/1500 ký tự
                          </span>
                          {solImageError && (
                            <span className="text-xs text-rose-400">{solImageError}</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSolutionSubmit(selectedQuestion.id)}
                          disabled={!solutionText.trim() || solCooldown > 0 || isSubmittingSol}
                          className="ff-tactile-btn px-5 py-2.5 rounded-xl bg-[#f4f1de] hover:bg-[#f2cc8f] text-[#0b0d12] font-extrabold text-xs sm:text-sm border-2 border-[#0b0d12] inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          <Send className="w-4 h-4 text-[#e07a5f]" />
                          <span>
                            {solCooldown > 0
                              ? `Chờ ${solCooldown}s...`
                              : isSubmittingSol
                              ? 'Đang gửi...'
                              : 'Gửi lời giải'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* SIDEBAR PHẢI (4/12) — Bento Cards: Tóm tắt thông tin bài hỏi, Câu hỏi liên quan & Bảng xếp hạng môn */}
                <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-6">
                  <div className="ff-bento-cell !p-5 space-y-3.5">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-[#f2cc8f] font-bold">
                      Thông tin câu hỏi
                    </h4>
                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div className="p-3 rounded-xl bg-[#0b0d12]/75 border border-[#f4f1de]/12">
                        <span className="text-[#9a978e] block text-[11px]">Thưởng trả lời</span>
                        <strong className="text-[#81b29a] font-mono text-sm mt-0.5 block">+25 Coin · +25 XP</strong>
                      </div>
                      <div className="p-3 rounded-xl bg-[#0b0d12]/75 border border-[#f4f1de]/12">
                        <span className="text-[#9a978e] block text-[11px]">Thưởng Đáp án chuẩn</span>
                        <strong className="text-[#f2cc8f] font-mono text-sm mt-0.5 block">+{bestBonusCoin} Coin</strong>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#d8d5ce] pt-2 border-t border-dashed border-[#f4f1de]/12">
                      <span>Số lời giải hiện có:</span>
                      <strong className="font-mono text-[#f4f1de]">{activeSolutions.length}/3 lời giải</strong>
                    </div>
                  </div>

                  <div className="ff-bento-cell !p-5 space-y-3">
                    <h4 className="text-sm font-extrabold text-[#f4f1de] flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-[#f2cc8f] shrink-0" />
                      <span>Câu hỏi liên quan</span>
                    </h4>
                    {relatedQuestions.map(q => {
                      const qSols = solutions.filter(s => s.questionId === q.id && s.status !== 'deleted');
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => handleOpenQuestionDetail(q)}
                          className="w-full text-left p-3 rounded-xl bg-[#0b0d12]/70 hover:bg-[#f4f1de]/[0.06] border border-[#f4f1de]/12 hover:border-[#f2cc8f]/45 transition-colors cursor-pointer block"
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#9a978e]">
                            <span className="text-[#f2cc8f] font-bold">#{q.subject}</span>
                            <span>{qSols.length}/3 lời giải</span>
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-[#f4f1de] line-clamp-2 mt-1 leading-snug">{q.title}</p>
                        </button>
                      );
                    })}
                    {relatedQuestions.length === 0 && (
                      <p className="text-xs text-[#9a978e]">Chưa có câu hỏi cùng chủ đề.</p>
                    )}
                  </div>

                  <div className="ff-bento-cell !p-5 space-y-3">
                    <h4 className="text-sm font-extrabold text-[#f4f1de] flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#f2cc8f] shrink-0" />
                      <span>Tích cực môn #{selectedQuestion.subject}</span>
                    </h4>
                    {topSubjectSolvers.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        Chưa có thống kê cho môn này.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {topSubjectSolvers.map((solver, idx) => (
                          <div
                            key={solver.id}
                            className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.08]"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-6 h-6 rounded-lg text-[11px] font-mono font-bold flex items-center justify-center shrink-0 ${
                                  idx === 0
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/35'
                                    : idx === 1
                                    ? 'bg-slate-400/20 text-slate-200 border border-slate-300/30'
                                    : 'bg-orange-500/15 text-orange-300 border border-orange-400/30'
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <img
                                src={solver.avatar}
                                alt={solver.name}
                                onError={e => handleImageError(e, DEFAULT_AVATAR)}
                                loading="lazy"
                                decoding="async"
                                width={26}
                                height={26}
                                className="w-6.5 h-6.5 rounded-full object-cover border border-white/15 shrink-0"
                              />
                              <span className="text-xs font-semibold text-slate-100 truncate">
                                {solver.name}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-amber-300 shrink-0">
                              {solver.count} bài{solver.verified > 0 ? ` · ${solver.verified} chuẩn` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            </div>
          </div>
        );

        return typeof document !== 'undefined' ? createPortal(detailPageNode, document.body) : detailPageNode;
      })()}

      {/* Phase 4.3 Lightbox Modal khi click vào ảnh câu hỏi hoặc lời giải */}
      {lightboxImageUrl && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh phóng to"
          onClick={() => setLightboxImageUrl(null)}
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/92 backdrop-blur-md animate-fade-up cursor-zoom-out"
        >
          <button
            type="button"
            onClick={() => setLightboxImageUrl(null)}
            className="absolute top-5 right-5 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 cursor-pointer"
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
            className="max-h-[90vh] max-w-[94vw] rounded-2xl object-contain border border-white/15 shadow-2xl cursor-default"
          />
        </div>,
        document.body
      )}

      {/* Phase 4.6 Modal: Xác nhận xóa bài viết / lời giải có lý do bắt buộc (Admin / Moderator) — rộng rãi & portaled */}
      {canEditContent && (questionToDelete || solutionToDelete) && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={questionToDelete ? 'Xác nhận xóa câu hỏi' : 'Xác nhận xóa lời giải'}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setQuestionToDelete(null);
              setSolutionToDelete(null);
              setDeleteReasonNote('');
            }
          }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-up"
        >
          <div className="modal-container w-full max-w-xl">
            <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-dashed border-[#f4f1de]/15 bg-[#0b0d12]/60 shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-400/35 flex items-center justify-center text-rose-300">
                  <Trash2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-[#f4f1de]">
                    {questionToDelete ? 'Xóa câu hỏi' : 'Xóa lời giải'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuestionToDelete(null);
                  setSolutionToDelete(null);
                  setDeleteReasonNote('');
                }}
                className="ff-tactile-btn p-2 rounded-lg bg-[#0b0d12] border border-[#f4f1de]/18 text-[#d8d5ce] hover:text-[#f4f1de] cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="modal-body px-6 sm:px-8 py-6 space-y-5">
              <div className="p-4 rounded-xl bg-[#0b0d12] border border-[#f4f1de]/15 text-xs sm:text-sm text-[#d8d5ce] leading-relaxed">
                {questionToDelete ? (
                  <>
                    Xóa câu hỏi <strong className="text-[#f4f1de]">"{questionToDelete.title}"</strong>.
                  </>
                ) : (
                  <>
                    Xóa lời giải của <strong className="text-[#f4f1de]">{solutionToDelete?.authorName}</strong>.
                  </>
                )}
              </div>

              <div className="space-y-2.5">
                <span className="block text-xs sm:text-sm font-bold text-[#f4f1de]">
                  Lý do (*):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {MODERATION_REASON_OPTIONS.map(opt => (
                    <label
                      key={opt.code}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs sm:text-sm cursor-pointer transition-all ${
                        deleteReasonCode === opt.code
                          ? 'bg-rose-500/18 border-rose-400/60 text-[#f4f1de] font-bold shadow-sm'
                          : 'bg-[#0b0d12]/60 border-[#f4f1de]/12 text-[#d8d5ce] hover:bg-[#f4f1de]/[0.05]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="moderation-reason-code"
                        value={opt.code}
                        checked={deleteReasonCode === opt.code}
                        onChange={() => setDeleteReasonCode(opt.code)}
                        className="accent-rose-500"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs sm:text-sm font-bold text-[#f4f1de]">
                    Ghi chú:
                  </label>
                  <span className="text-xs font-mono text-[#9a978e]">{deleteReasonNote.length}/200</span>
                </div>
                <input
                  type="text"
                  maxLength={200}
                  value={deleteReasonNote}
                  onChange={e => setDeleteReasonNote(e.target.value)}
                  placeholder="Ghi chú thêm (nếu có)..."
                  className="w-full bg-[#0b0d12] border-[1.5px] border-[#f4f1de]/20 rounded-xl px-4 py-3 text-sm text-[#f4f1de] placeholder-[#84817a] focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>

            <div className="modal-footer px-6 sm:px-8 py-4 bg-[#0b0d12]/60 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setQuestionToDelete(null);
                  setSolutionToDelete(null);
                  setDeleteReasonNote('');
                }}
                className="ff-tactile-btn px-4 py-2.5 rounded-xl bg-[#0b0d12] hover:bg-[#f4f1de]/10 border border-[#f4f1de]/18 text-xs sm:text-sm font-bold text-[#d8d5ce] hover:text-[#f4f1de] transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={questionToDelete ? handleConfirmDelete : handleConfirmDeleteSolution}
                className="ff-tactile-btn px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs sm:text-sm transition-all cursor-pointer"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Chỉnh sửa bài viết & nội dung Q&A — Rộng rãi (max-w-2xl), có thanh ký hiệu toán học & portaled */}
      {canEditContent && questionToEdit && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Chỉnh sửa câu hỏi"
          onClick={(e) => {
            if (e.target === e.currentTarget) setQuestionToEdit(null);
          }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-up"
        >
          <div className="modal-container w-full max-w-2xl">
            <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-dashed border-[#f4f1de]/15 bg-[#0b0d12]/60 shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-[#f2cc8f]/20 border border-[#f2cc8f]/45 flex items-center justify-center text-[#f2cc8f]">
                  <Edit3 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-[#f4f1de]">Chỉnh sửa câu hỏi</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuestionToEdit(null)}
                className="ff-tactile-btn p-2 rounded-lg bg-[#0b0d12] border border-[#f4f1de]/18 text-[#d8d5ce] hover:text-[#f4f1de] cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmEdit} className="flex flex-col flex-1 min-h-0">
              <div className="modal-body px-6 sm:px-8 py-6 space-y-5">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#f4f1de] mb-2">Môn học / Chuyên mục (*):</label>
                  <select
                    value={editSubject}
                    onChange={e => setEditSubject(e.target.value as SubjectTag)}
                    className="w-full bg-[#0b0d12] border-[1.5px] border-[#f4f1de]/20 rounded-xl px-4 py-3 text-sm text-[#f4f1de] focus:outline-none focus:border-[#f2cc8f] font-semibold"
                  >
                    {SUBJECTS.filter(s => s.tag !== 'all').map(s => (
                      <option key={s.tag} value={s.tag}>
                        {s.label} (#{s.tag} · {s.group === 'academic' ? 'Học thuật' : 'Đời sống'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="tieu-de-cau-hoi-2" className="block text-xs sm:text-sm font-bold text-[#f4f1de]">
                      Tiêu đề câu hỏi (*):
                    </label>
                    <span className="text-xs font-mono text-[#9a978e]">{editTitle.length}/150</span>
                  </div>
                  <input
                    id="tieu-de-cau-hoi-2"
                    type="text"
                    required
                    maxLength={150}
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full bg-[#0b0d12] border-[1.5px] border-[#f4f1de]/20 rounded-xl px-4 py-3 text-sm sm:text-[15px] text-[#f4f1de] focus:outline-none focus:border-[#f2cc8f]"
                  />
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs sm:text-sm font-bold text-[#f4f1de]">Nội dung chi tiết (*):</label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#9a978e]">{editContent.length}/1500</span>
                      <button
                        type="button"
                        onClick={() => {
                          const warning = '\n\n[CẢNH BÁO TỪ BQT: Bài viết cần tuân thủ văn hóa ứng xử và quy định của diễn đàn F-Forum]';
                          if (!editContent.includes(warning.trim())) {
                            setEditContent(prev => (prev + warning).slice(0, 1500));
                          }
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 border border-rose-400/35 transition-colors cursor-pointer"
                        title="Gắn cảnh báo vi phạm nội quy"
                      >
                        <AlertTriangle size={12} />
                        <span>Chèn nhắc nhở nội quy</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    required
                    rows={7}
                    maxLength={1500}
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="w-full min-h-[180px] bg-[#0b0d12] border-[1.5px] border-[#f4f1de]/20 rounded-xl px-4 py-3.5 text-sm sm:text-[15px] text-[#f4f1de] focus:outline-none focus:border-[#f2cc8f] leading-relaxed resize-y"
                  />
                  <MathSymbolsBar
                    defaultExpanded={false}
                    onInsert={sym => setEditContent(prev => (prev + sym).slice(0, 1500))}
                  />
                </div>
              </div>

              <div className="modal-footer px-6 sm:px-8 py-4 bg-[#0b0d12]/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setQuestionToEdit(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#0b0d12] hover:bg-[#f4f1de]/10 border border-[#f4f1de]/18 text-xs sm:text-sm font-bold text-[#d8d5ce] hover:text-[#f4f1de] cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="ff-tactile-btn px-6 py-2.5 rounded-xl bg-[#e07a5f] hover:bg-[#f2cc8f] text-[#0b0d12] border border-[#f4f1de] font-extrabold text-xs sm:text-sm cursor-pointer"
                >
                  Lưu thay đổi bài viết
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
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
                  ? Math.max(12, Math.min(authorAnchorPos.x + 12, window.innerWidth - 332))
                  : 24,
              top:
                typeof window !== 'undefined'
                  ? Math.max(12, Math.min(authorAnchorPos.y - 20, window.innerHeight - 245))
                  : 120,
            }}
            className="pc-12-shell w-[320px] max-w-[calc(100vw-24px)] rounded-2xl p-4 popover-morph-enter"
          >
            <button
              type="button"
              onClick={() => setActiveAuthorPopover(null)}
              className="absolute top-2.5 right-2.5 z-[5] p-1 rounded-full text-[#9a978e] hover:text-[#f4f1de] cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="ff-discord-userbar flex items-center gap-3.5 p-3 rounded-xl bg-[#0b0d12] border border-[#f4f1de]/15 pr-6">
              <UserNameplateBg
                user={findDecorationOwner(users, activeAuthorPopover.email, activeAuthorPopover.id)}
                width={268}
                eager
                animate
                priority="high"
              />
              <div className="relative z-[2] shrink-0">
                {/* Nhiệm vụ 10 — 44px + trang trí Discord (nếu tác giả có trang bị). */}
                <DecoratedAvatar
                  user={findDecorationOwner(users, activeAuthorPopover.email, activeAuthorPopover.id)}
                  fallbackSrc={activeAuthorPopover.avatar}
                  size={44}
                  eager
                  animate
                  alt={activeAuthorPopover.name}
                  className="rounded-full ring-1 ring-[#f2cc8f]/60 shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 z-[4]">
                  <TierBadge level={activeAuthorPopover.level} size={16} showTooltip={false} />
                </span>
              </div>

              <div className="relative z-[2] min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <DecoratedName
                    user={findDecorationOwner(users, activeAuthorPopover.email, activeAuthorPopover.id)}
                    name={activeAuthorPopover.name.replace(/ \(.*\)/, '')}
                    width={176}
                    height={33}
                    eager
                    animate
                    priority="high"
                    showFallbackTag
                  />
                  {isMasterAdmin(activeAuthorPopover.email) && <AdminVerifiedBadge size={12} />}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="px-2 py-0.5 rounded-full bg-[#f2cc8f]/25 text-[#f2cc8f] border border-[#f2cc8f]/40 text-[9.5px] font-mono font-bold shadow-sm">
                    {getTierForLevel(activeAuthorPopover.level).titleVi}
                  </span>
                  <span className="text-[10px] text-[#f4f1de]/85 font-mono drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
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
                  className="pc-12-btn w-full py-2 px-3 rounded-xl text-[#f4f1de] hover:text-[#f2cc8f] text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <UserIcon className="w-3.5 h-3.5 text-[#f2cc8f]" />
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

      {/* Modal: Báo cáo bài viết / tài khoản vi phạm — rộng rãi, dễ nhìn & portaled to document.body */}
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
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-up"
        >
          <div className="modal-container w-full max-w-xl overflow-hidden relative">
            <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-dashed border-[#f4f1de]/15 bg-[#0b0d12]/60">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-[#e07a5f]/20 border-[1.5px] border-[#e07a5f]/50 flex items-center justify-center text-[#f2cc8f]">
                  <Flag className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-[#f4f1de]">Báo cáo vi phạm</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReportModalUser(null);
                  setReportSuccessMsg(null);
                }}
                className="ff-tactile-btn p-2 rounded-lg bg-[#0b0d12] border border-[#f4f1de]/18 text-[#d8d5ce] hover:text-[#f4f1de] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSuccessMsg ? (
              <div className="p-8 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-sm text-emerald-200 font-semibold">{reportSuccessMsg}</p>
                <button
                  type="button"
                  onClick={() => {
                    setReportModalUser(null);
                    setReportSuccessMsg(null);
                  }}
                  className="ff-tactile-btn px-6 py-2.5 rounded-xl bg-[#f4f1de] hover:bg-[#f2cc8f] text-[#0b0d12] border-2 border-[#0b0d12] text-xs sm:text-sm font-extrabold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="px-6 sm:px-8 py-6 space-y-5">
                {reportErrorMsg && (
                  <p role="alert" className="ff-report-error">{reportErrorMsg}</p>
                )}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs sm:text-sm text-slate-300">
                  Đối tượng: <strong className="text-white">{reportModalUser.name}</strong>
                </div>

                <div className="space-y-2.5">
                  <label className="block text-xs sm:text-sm font-bold text-slate-200">
                    Lý do (*):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      'Toxic / Gây war / Xúc phạm bạn học',
                      'Spam / Quảng cáo / Lừa đảo',
                      'Nội dung phản cảm / Đồi trụy',
                      'Gian lận điểm / Hack Coin',
                    ].map((reasonOpt) => (
                      <button
                        key={reasonOpt}
                        type="button"
                        onClick={() => setReportReason(reasonOpt)}
                        className={`ff-tactile-btn px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold border transition cursor-pointer ${
                          reportReason === reasonOpt
                            ? 'bg-rose-500/20 border-rose-400 text-rose-100 shadow-sm'
                            : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10 text-slate-300'
                        }`}
                      >
                        {reasonOpt}
                      </button>
                    ))}
                  </div>
                  <select
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    className="w-full bg-[#0b0d12] border-[1.5px] border-[#f4f1de]/20 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#f4f1de] focus:outline-none focus:border-rose-400"
                  >
                    <option value="Toxic / Gây war / Xúc phạm bạn học">Toxic / Gây war / Xúc phạm bạn học</option>
                    <option value="Spam / Quảng cáo / Lừa đảo">Spam / Quảng cáo / Lừa đảo</option>
                    <option value="Nội dung phản cảm / Đồi trụy">Nội dung phản cảm / Đồi trụy</option>
                    <option value="Gian lận điểm / Hack Coin">Gian lận điểm / Hack Coin</option>
                    <option value="Khác">Lý do khác</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="chi-tiet-vi-pham" className="block text-xs sm:text-sm font-bold text-[#f4f1de]">
                      Chi tiết:
                    </label>
                    <span className="text-xs font-mono text-[#9a978e]">{reportDetails.length}/500</span>
                  </div>
                  <textarea
                    id="chi-tiet-vi-pham"
                    value={reportDetails}
                    onChange={e => setReportDetails(e.target.value)}
                    maxLength={500}
                    rows={4}
                    placeholder="Mô tả nội dung vi phạm..."
                    className="w-full min-h-[115px] bg-[#0b0d12] border-[1.5px] border-[#f4f1de]/20 rounded-xl px-4 py-3 text-sm text-[#f4f1de] placeholder-[#84817a] focus:outline-none focus:border-rose-400 leading-relaxed resize-y"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setReportModalUser(null)}
                    className="ff-tactile-btn px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-xs sm:text-sm font-bold text-slate-300 hover:text-white cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="ff-tactile-btn px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs sm:text-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingReport ? 'Đang gửi...' : 'Gửi báo cáo'}
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
