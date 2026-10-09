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
} from 'lucide-react';
import type { Question, Solution, SubjectTag, User, ChatMessage } from '../../types';
import { TierBadge, AdminVerifiedBadge } from '../Badges10Tier';
import { getTierForLevel } from '../../utils/tier';
import { ForumPostModeration } from '../ForumPost';
import {
  generateGhibliAlias,
  getRandomGhibliMask,
} from '../../utils/ghibliMasks';
import { DEFAULT_AVATAR, handleImageError, handleVideoError } from '../../utils/mediaFallback';
import { MASTER_ADMIN_CONFIG, isMasterAdmin } from '../../config/admin';
import { capsHas, useAdminCaps } from '../../utils/adminCapabilities';
import { pushNotification } from '../../utils/notifications';
import { safeStorage } from '../../utils/storage';
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

const MATH_SYMBOLS = [
  '√', 'π', '∑', '∫', '≤', '≥', 'α', 'β', '∞', '∆',
  'θ', 'λ', 'µ', '±', '×', '÷', '≠', '≈', '≡', '∈',
  '∉', '⊂', '⊃', '∪', '∩', '⊥', '∠', '°', '‰', '∂',
  '∇', '∛', '∜', '²', '³', '½', '¼', '¾',
];

const MathSymbolsBar: React.FC<{ onInsert: (symbol: string) => void }> = ({ onInsert }) => (
  <div className="flex flex-col gap-1 p-2 rounded-xl bg-white/5 border border-white/10 my-1.5">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-mono font-semibold text-cyan-300 uppercase tracking-wider">
        ∑ Ký Hiệu Toán Học & Khoa Học (38 ký tự)
      </span>
      <span className="text-[9px] text-neutral-400 font-mono">Click để chèn</span>
    </div>
    <div className="flex items-center gap-1 flex-wrap max-h-20 overflow-y-auto pr-1">
      {MATH_SYMBOLS.map(sym => (
        <button
          key={sym}
          type="button"
          onClick={() => onInsert(sym)}
          className="w-6 h-6 rounded-md bg-neutral-900 hover:bg-cyan-500/20 text-neutral-200 hover:text-cyan-300 border border-white/10 hover:border-cyan-400/40 text-xs font-mono font-bold flex items-center justify-center transition-all cursor-pointer active:scale-90"
          title={`Chèn ${sym}`}
        >
          {sym}
        </button>
      ))}
    </div>
  </div>
);

interface QAForumViewProps {
  currentUser: User | null;
  questions: Question[];
  solutions: Solution[];
  onCreateQuestion: (data: {
    title: string;
    subject: SubjectTag;
    content: string;
    isAnonymous: boolean;
    bountyCoin?: number;
    imageUrl?: string;
  }) => void;
  onAddSolution: (questionId: string, content: string, imageUrl?: string) => void;
  onMarkBestSolution: (questionId: string, solutionId: string) => void;
  onDeleteQuestion?: (questionId: string) => void;
  onEditQuestion?: (questionId: string, updates: { title?: string; content?: string; subject?: SubjectTag }) => void;
  onDeleteSolution?: (solutionId: string) => void;
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

export const QAForumView: React.FC<QAForumViewProps> = ({
  currentUser,
  questions,
  solutions,
  onCreateQuestion,
  onAddSolution,
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
  // Liên kết chia sẻ ?q=<id> mở thẳng câu hỏi (nếu dữ liệu đã có sẵn khi vào trang)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(() => {
    const sharedId = typeof window !== 'undefined' ? readSharedQuestionId(window.location.search) : null;
    return sharedId ? questions.find(item => item.id === sharedId) ?? null : null;
  });
  const pendingSharedId = useRef<string | null>(
    typeof window !== 'undefined' ? readSharedQuestionId(window.location.search) : null,
  );
  // Dữ liệu về muộn (đồng bộ máy chủ) → mở câu hỏi khi tìm thấy, chỉ một lần.
  useEffect(() => {
    const sharedId = pendingSharedId.current;
    if (!sharedId) return;
    const found = questions.find(item => item.id === sharedId);
    if (!found) return;
    pendingSharedId.current = null;
    const timer = window.setTimeout(() => setSelectedQuestion(prev => prev ?? found), 0);
    return () => window.clearTimeout(timer);
  }, [questions]);
  // Đóng câu hỏi → gỡ ?q= khỏi thanh địa chỉ để tải lại trang không bật lại modal.
  useEffect(() => {
    if (selectedQuestion || typeof window === 'undefined') return;
    if (readSharedQuestionId(window.location.search)) {
      window.history.replaceState(window.history.state, '', stripSharedQuestionParam(window.location.href));
    }
  }, [selectedQuestion]);

  const [askCooldown, setAskCooldown] = useState(0);
  const [isSubmittingAsk, setIsSubmittingAsk] = useState(false);
  const [solCooldown, setSolCooldown] = useState(0);
  const [isSubmittingSol, setIsSubmittingSol] = useState(false);

  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
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
    if (q) setQuestionToDelete(q);
  };

  const handleConfirmDelete = () => {
    if (questionToDelete && onDeleteQuestion) {
      onDeleteQuestion(questionToDelete.id);
      if (selectedQuestion?.id === questionToDelete.id) {
        setSelectedQuestion(null);
      }
      setQuestionToDelete(null);
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
          <div className={`lg:col-span-8 ${isEmbedded ? '' : 'overflow-y-auto pr-1'} space-y-3 pb-6`}>
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
                  onClick={() => setSelectedQuestion(q)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      const target = e.target as HTMLElement;
                      if (!target.closest('button')) {
                        e.preventDefault();
                        setSelectedQuestion(q);
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

      {/* Modal: Đặt Câu Hỏi Mới (+50 XP) */}
      {isAskModalOpen && (
        <div role="dialog" aria-modal="true" aria-label="Đặt câu hỏi mới" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-up">
          <div className="liquid-glass w-full max-w-lg rounded-3xl bg-neutral-950/95 border border-cyan-400/40 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-base text-white">Đặt Câu Hỏi Học Thuật Mới</h3>
              </div>
              <button
                onClick={() => setIsAskModalOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAskSubmit} className="space-y-3.5">
              {/* Báo cho người dùng biết nội dung đang có là nháp được khôi phục,
                  kèm đường bỏ nháp — đừng âm thầm điền sẵn rồi để họ tưởng là
                  mình vừa gõ. */}
              {hasRestoredDraft && (
                <div className="flex items-center gap-2 rounded-2xl border border-amber-300/30 bg-amber-400/10 px-3 py-2.5">
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-300" />
                  <span className="min-w-0 flex-1 text-[11px] leading-snug text-amber-100">
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
                    className="shrink-0 rounded-lg border border-amber-300/30 px-2 py-1 text-[10.5px] font-bold text-amber-200 transition hover:bg-amber-400/20 cursor-pointer"
                  >
                    Bỏ nháp
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Chủ đề môn học / đời sống (*):
                </label>
                <select
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value as SubjectTag)}
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                >
                  {SUBJECTS.filter(s => s.tag !== 'all').map(s => (
                    <option key={s.tag} value={s.tag}>
                      {s.label} ({s.group === 'academic' ? 'Học thuật' : 'Đời sống'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="tieu-de-cau-hoi" className="block text-xs font-semibold text-neutral-300 mb-1">
                  Tiêu đề câu hỏi (*):
                </label>
                <input id="tieu-de-cau-hoi"
                  type="text"
                  required
                  maxLength={150}
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="VD: Cách giải phương trình vi phân cấp 2 bài tập số 3..."
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label htmlFor="noi-dung-chi-tiet-thac-mac" className="block text-xs font-semibold text-neutral-300 mb-1">
                  Nội dung chi tiết & thắc mắc (*):
                </label>
                <textarea id="noi-dung-chi-tiet-thac-mac"
                  required
                  rows={4}
                  maxLength={1500}
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Ghi rõ đề bài, dữ kiện đã cho và phần em đang vướng mắc để các bạn trợ giúp nhanh nhất..."
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none"
                />
                <MathSymbolsBar onInsert={sym => setNewContent(newContent + sym)} />
              </div>

              {/* 20MB Image Upload */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Đính kèm hình ảnh (Tối đa 20MB):
                </label>
                {askImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/20 bg-black/40 p-2 max-w-xs">
                    <img loading="lazy" decoding="async" src={askImage} alt="Đính kèm câu hỏi" className="max-h-36 rounded-lg object-contain mx-auto" />
                    <button
                      type="button"
                      onClick={() => setAskImage(null)}
                      className="absolute top-3 right-3 p-1 rounded-full bg-red-600/80 hover:bg-red-600 text-white cursor-pointer shadow-lg"
                      title="Gỡ ảnh"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="field" className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-white/20 hover:border-cyan-400/50 bg-white/5 hover:bg-white/10 text-xs text-neutral-300 cursor-pointer transition-all">
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    <span>Tải ảnh câu hỏi / đề bài / sơ đồ (Tối đa 20MB)</span>
                    <input id="field"
                      type="file"
                      accept="image/*"
                      onChange={e => handleImageUpload(e, setAskImage, setAskImageError)}
                      className="hidden"
                    />
                  </label>
                )}
                {askImageError && (
                  <p className="text-[11px] text-red-400 mt-1">{askImageError}</p>
                )}
              </div>

              {/* Bounty Coin Selector (10 - 100 Coin) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-neutral-300">
                    Cược Coin Phần Thưởng (Bounty Bet) (*):
                  </label>
                  <span className="text-[11px] font-mono text-amber-300">
                    Số dư: {(currentUser?.coin ?? 100).toLocaleString()} Coin
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 20, 50, 100].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setBountyCoin(amt)}
                      className={`py-1.5 px-2 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        bountyCoin === amt
                          ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                          : 'bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Coins className="w-3 h-3 text-amber-400" />
                      <span>{amt} Coin</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Người giải bài được trao Đáp Án Chuẩn sẽ nhận 50% tiền cược + 100 Coin danh dự.
                </p>
              </div>

              {/* Incognito / Anonymous Toggle Switch with Ghibli Wizard Disguise */}
              <div className="space-y-2">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${isAnonymous ? 'bg-purple-500/20 text-purple-300' : 'bg-neutral-800 text-neutral-400'}`}>
                      <EyeOff className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Đăng bài ẩn danh</span>
                      <span className="text-[10px] text-neutral-400">
                        Hóa trang thành Pháp sư Tri thức Ghibli bí ẩn
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAnonymous(prev => !prev)}
                    className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                      isAnonymous ? 'bg-purple-600' : 'bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        isAnonymous ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Ghibli Wizard Disguise Preview Card */}
                {isAnonymous && (
                  <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center gap-3 animate-fade-up">
                    {previewMask && (
                      <img
                        src={previewMask}
                        alt="Ghibli Wizard Mask"
                        onError={e => handleImageError(e, DEFAULT_AVATAR)}
                        loading="lazy"
                        decoding="async"
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full border border-purple-400/50 p-0.5 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-300 truncate">
                          {previewAlias}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-500/20 text-purple-200 border border-purple-400/30 flex items-center gap-1 shrink-0">
                          <Wand2 className="w-3 h-3 text-purple-400" />
                          GHIBLI MASK
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        Tên thật & avatar của bạn sẽ được bảo mật tuyệt đối sau lớp mặt nạ pháp sư.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-white/10">
                <span className="text-[11px] font-mono text-cyan-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Nhận ngay +50 XP khi đăng bài
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAskModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={askCooldown > 0 || isSubmittingAsk}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-bold text-xs shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {askCooldown > 0 ? `Chờ ${askCooldown}s...` : isSubmittingAsk ? 'Đang gửi...' : 'Đăng Câu Hỏi (+50 XP)'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chi Tiết Câu Hỏi & Solutions Feed */}
      {selectedQuestion && (
        <div role="dialog" aria-modal="true" aria-label="Chi tiết câu hỏi" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-up">
          <div className="liquid-glass w-full max-w-2xl rounded-3xl bg-neutral-950/95 border border-white/20 shadow-2xl p-6 relative max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/10 mb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
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

              <button
                onClick={() => setSelectedQuestion(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Author bar & Question Content */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-5">
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

              {selectedQuestion.imageUrl && (
                <div className="mt-3 rounded-xl overflow-hidden border border-white/15 max-w-md bg-black/40 p-1">
                  <img loading="lazy" decoding="async"
                    src={selectedQuestion.imageUrl}
                    alt="Đính kèm câu hỏi"
                    className="max-h-72 rounded-lg object-contain mx-auto"
                  />
                </div>
              )}

              <ForumPostModeration
                postId={selectedQuestion.id}
                onDeletePost={handleAdminDeletePost}
                onEditPost={handleAdminEditPost}
                isSuperAdmin={canEditContent}
              />
            </div>

            {/* Solutions Section */}
            <div className="space-y-3 mb-5">
              <h4 className="font-bold text-xs sm:text-sm text-white flex items-center justify-between">
                <span>CÁC BÀI GIẢI ĐÃ ĐÓNG GÓP ({solutions.filter(s => s.questionId === selectedQuestion.id).length})</span>
                <span className="text-[10px] text-neutral-400 font-normal">
                  Chỉ tác giả hoặc Super Admin mới có quyền xác nhận đáp án chuẩn
                </span>
              </h4>

              {solutions.filter(s => s.questionId === selectedQuestion.id).length === 0 ? (
                <p className="text-neutral-500 text-xs italic text-center py-4">
                  Chưa có bạn nào trợ giúp giải câu này. Hãy là người đầu tiên đưa ra đáp án chính xác!
                </p>
              ) : (
                solutions
                  .filter(s => s.questionId === selectedQuestion.id)
                  .sort((a, b) => (b.isBest ? 1 : 0) - (a.isBest ? 1 : 0))
                  .map(sol => {
                    const isSuperAdminSolver = isMasterAdmin(sol.authorEmail);
                    const solverName = isSuperAdminSolver ? MASTER_ADMIN_CONFIG.name : sol.authorName;
                    const solverAvatar = isSuperAdminSolver ? MASTER_ADMIN_CONFIG.avatar : sol.authorAvatar;
                    const canConfirmBest =
                      isSuperAdmin || currentUser?.id === selectedQuestion.authorId;

                    return (
                      <div
                        key={sol.id}
                        className={`p-4 rounded-2xl transition-all ${
                          sol.isBest
                            ? 'bg-amber-950/30 border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
                            : 'bg-white/5 border border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
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
                              <img
                                src={solverAvatar}
                                alt={solverName}
                                onError={e => handleImageError(e, DEFAULT_AVATAR)}
                                loading="lazy"
                                decoding="async"
                                width={28}
                                height={28}
                                className={`w-7 h-7 rounded-full object-cover ${
                                  isSuperAdminSolver ? 'border border-amber-400' : ''
                                }`}
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
                            <span className="px-2.5 py-1 rounded-full bg-amber-500 text-black text-[10px] font-extrabold flex items-center gap-1 shadow-md">
                              <Award className="w-3 h-3" />
                              ĐÁP ÁN CHUẨN (+{Math.floor((selectedQuestion.bountyCoin || 20) * 0.5) + 100} COIN)
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-neutral-200 leading-relaxed whitespace-pre-line">
                          {sol.content}
                        </p>

                        {sol.imageUrl && (
                          <div className="mt-2.5 rounded-xl overflow-hidden border border-white/10 max-w-sm bg-black/40 p-1">
                            <img loading="lazy" decoding="async"
                              src={sol.imageUrl}
                              alt="Hình ảnh lời giải"
                              className="max-h-56 rounded-lg object-contain mx-auto"
                            />
                          </div>
                        )}

                        <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400">
                          <span className="text-[10px] font-mono">{sol.createdAt}</span>

                          <div className="flex items-center gap-2">
                            {/* Xoá lời giải (Super Admin / quyền edit_content) */}
                            {canEditContent && (
                              <button
                                type="button"
                                onClick={() => onDeleteSolution?.(sol.id)}
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
                      </div>
                    );
                  })
              )}
            </div>

            {/* Submit New Solution (+25 XP) */}
            <div className="pt-3 border-t border-white/10">
              <label htmlFor="field-2" className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center justify-between">
                <span>Đóng góp lời giải của bạn:</span>
                <span className="text-[10px] font-mono text-cyan-300">+25 XP khi gửi lời giải</span>
              </label>

              <textarea id="field-2"
                rows={3}
                maxLength={1500}
                value={solutionText}
                onChange={e => setSolutionText(e.target.value)}
                placeholder="Nhập chi tiết từng bước giải bài, định lý hoặc lời khuyên học tập..."
                className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none mb-1.5"
              />

              <MathSymbolsBar onInsert={sym => setSolutionText(prev => prev + sym)} />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
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
                      <input id="field-3"
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
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xác nhận xóa bài viết (Admin Only) */}
      {canEditContent && questionToDelete && (
        <div role="dialog" aria-modal="true" aria-label="Xác nhận xóa câu hỏi" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-up">
          <div className="w-full max-w-md rounded-2xl bg-neutral-950 border border-red-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" />
              <h3 className="font-bold text-sm text-white">Xác nhận xóa bài viết</h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa vĩnh viễn bài viết <strong>"{questionToDelete.title}"</strong> không? Toàn bộ các câu trả lời liên quan cũng sẽ bị xóa khỏi hệ thống.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuestionToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Xác nhận xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Chỉnh sửa bài viết (Admin Only) */}
      {canEditContent && questionToEdit && (
        <div role="dialog" aria-modal="true" aria-label="Chỉnh sửa câu hỏi" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-up">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-950 border border-amber-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
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

            <form onSubmit={handleConfirmEdit} className="space-y-3.5">
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

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
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
                <img loading="lazy" decoding="async"
                  src={activeAuthorPopover.avatar}
                  alt={activeAuthorPopover.name}
                  onError={e => handleImageError(e, DEFAULT_AVATAR)}
                  width={42}
                  height={42}
                  className="w-10 h-10 rounded-full object-cover border border-amber-400/60 shadow-md"
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
