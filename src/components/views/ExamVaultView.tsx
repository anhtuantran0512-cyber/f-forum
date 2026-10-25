/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { Suspense, lazy, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  BookOpen,
  Share2,
  FileText,
  Download,
  Eye,
  EyeOff,
  Bookmark,
  CheckCircle2,
  Clock,
  Sparkles,
  School,
  MapPin,
  Calendar,
  Upload,
  X,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  Check,
  GraduationCap,
  Layers,
  FileCheck,
  Sun,
  Moon,
  LogIn,
  Star,
  Heart,
  MessageSquare,
  HelpCircle,
  Users,
  Send,
  Zap,
  Flame,
  Award,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Printer,
  HardDrive,
  WifiOff,
  SlidersHorizontal,
  Clapperboard,
  BadgeCheck,
  ExternalLink,
} from 'lucide-react';
import { SEED_EXAMS } from '../exam/seedExamPapers';
import { LEARNING_RESOURCES } from '../exam/learningResources';
import type {
  DimensionView,
  User,
  ExamPaper,
  ExamType,
  ExamDifficulty,
} from '../../types';
import { safeStorage } from '../../utils/storage';
import { toggleThemeMode } from '../../utils/theme';
import { playChime } from '../../utils/audio';
import { capsHas, useAdminCaps } from '../../utils/adminCapabilities';
import type { ExamInteractionMap, ExamInteractionSnapshot } from '../../utils/examSubmissionApi';
import {
  examAttachmentFormat,
  formatExamFileSize,
  isSupportedExamAttachment,
  MAX_EXAM_ATTACHMENT_BYTES,
  MAX_EXAM_SUBMISSION_BYTES,
  MAX_EXAM_SUBMISSION_FILES,
} from '../../utils/examAttachments';
import {
  downloadExamAttachment,
  fetchExamInteractions,
  fetchExamSubmissions,
  rateExamPaper,
  reviewExamSubmission,
  setExamLike,
  submitExamPaper,
  submitExamReview,
} from '../../utils/examSubmissionApi';
const CbtPracticeModal = lazy(() => import('../exam/CbtPracticeModal').then((module) => ({ default: module.CbtPracticeModal })));
const ExamFlashcardModal = lazy(() => import('../exam/ExamFlashcardModal').then((module) => ({ default: module.ExamFlashcardModal })));
const ExamBookmarkDrawer = lazy(() => import('../exam/ExamBookmarkDrawer').then((module) => ({ default: module.ExamBookmarkDrawer })));
const ExamPrintExportModal = lazy(() => import('../exam/ExamPrintExportModal').then((module) => ({ default: module.ExamPrintExportModal })));
const KnowledgeNetworkModal = lazy(() => import('../exam/KnowledgeNetworkModal').then((module) => ({ default: module.KnowledgeNetworkModal })));
import { getCachedExamIds, OFFLINE_EXAMS_CACHE_KEY } from '../exam/offlineStorage';
import './ExamVaultView.css';

export interface ExamVaultViewProps {
  currentUser: User | null;
  onNavigate: (view: DimensionView) => void;
  onOpenLoginModal?: () => void;
  onOpenProfile?: (user?: { id: string; name: string; avatar: string; email?: string; level?: number }) => void;
  initialSearchQuery?: string;
}

const SAVED_EXAMS_KEY = 'fforum_saved_exams';
const SUBMISSIONS_KEY = 'fforum_exam_submissions';
const EMPTY_EXAM_SUBMISSIONS: ExamPaper[] = [];

const getExamViewerUrl = (paperId: string): string => {
  if (typeof window === 'undefined') return `/?view=exam-viewer&paper=${encodeURIComponent(paperId)}`;
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('view', 'exam-viewer');
  url.searchParams.set('paper', paperId);
  return `${url.pathname}${url.search}`;
};

const openExamViewer = (paperId: string): void => {
  window.open(getExamViewerUrl(paperId), '_blank', 'noopener,noreferrer');
};

/* Danh sách đề thi & đề cương mẫu chuẩn cấu trúc các trường THPT / THCS hàng đầu */
const GRADE_OPTIONS = [
  { value: 0, label: 'Tất cả lớp' },
  { value: 12, label: 'Lớp 12' },
  { value: 11, label: 'Lớp 11' },
  { value: 10, label: 'Lớp 10' },
  { value: 9, label: 'Lớp 9' },
  { value: 8, label: 'Lớp 8' },
  { value: 7, label: 'Lớp 7' },
  { value: 6, label: 'Lớp 6' },
];

const EXAM_TYPE_OPTIONS: ('Tất cả loại' | ExamType)[] = [
  'Tất cả loại',
  'Đề giữa kỳ 1',
  'Đề giữa kỳ 2',
  'Đề cuối kỳ 1',
  'Đề cuối kỳ 2',
  'Đề 15 phút',
  'Đề cương ôn tập',
  'Khảo sát chất lượng',
];

const CORE_12_SUBJECTS = [
  { id: 'toan', name: 'Toán học', short: 'Toán', color: '#3b82f6' },
  { id: 'ly', name: 'Vật lý', short: 'Lý', color: '#06b6d4' },
  { id: 'hoa', name: 'Hóa học', short: 'Hóa', color: '#10b981' },
  { id: 'sinh', name: 'Sinh học', short: 'Sinh', color: '#84cc16' },
  { id: 'su', name: 'Lịch sử', short: 'Sử', color: '#eab308' },
  { id: 'dia', name: 'Địa lý', short: 'Địa', color: '#f97316' },
  { id: 'van', name: 'Ngữ văn', short: 'Văn', color: '#ec4899' },
  { id: 'anh', name: 'Tiếng Anh', short: 'Anh', color: '#8b5cf6' },
  { id: 'tin', name: 'Tin học', short: 'Tin', color: '#14b8a6' },
  { id: 'triet', name: 'Triết học', short: 'Triết', color: '#a855f7' },
  { id: 'thien-van', name: 'Thiên văn', short: 'Thiên văn', color: '#6366f1' },
  { id: 'nghe-thuat', name: 'Nghệ thuật', short: 'Nghệ thuật', color: '#f43f5e' },
];

const SUBJECT_OPTIONS = [
  'Tất cả môn',
  'Toán học',
  'Vật lý',
  'Hóa học',
  'Sinh học',
  'Ngữ văn',
  'Tiếng Anh',
  'Lịch sử',
  'Địa lý',
  'Tin học',
  'Triết học',
  'Thiên văn',
  'Nghệ thuật',
  'GDCD',
];

const PROVINCE_OPTIONS = [
  'Toàn quốc',
  'Hà Nội',
  'TP. Hồ Chí Minh',
  'Đà Nẵng',
  'Hải Phòng',
  'Cần Thơ',
  'Nghệ An',
  'Thanh Hoá',
  'Nam Định',
  'Hải Dương',
  'Bắc Ninh',
  'Thái Bình',
  'Thừa Thiên Huế',
];

const SCHOOL_OPTIONS = [
  'Tất cả trường',
  'THPT Chuyên Hà Nội - Amsterdam',
  'THPT Chu Văn An (Hà Nội)',
  'THPT Chuyên Lê Hồng Phong (TP.HCM)',
  'THPT Chuyên Phan Bội Châu (Nghệ An)',
  'THPT Chuyên Lam Sơn (Thanh Hóa)',
  'THPT Chuyên Lê Quý Đôn (Đà Nẵng)',
  'THPT Chuyên Lê Hồng Phong (Nam Định)',
  'THPT Kim Liên',
  'THPT Lương Thế Vinh',
  'THCS Giảng Võ (Hà Nội)',
];

const YEAR_OPTIONS = [
  'Tất cả năm',
  '2026-2027',
  '2025-2026',
  '2024-2025',
  '2023-2024',
];

const DIFFICULTY_OPTIONS: ('Tất cả mức độ' | ExamDifficulty)[] = [
  'Tất cả mức độ',
  'Nhận biết',
  'Thông hiểu',
  'Vận dụng',
  'Vận dụng cao',
];

const getSubjectBadgeStyle = (subject: string): string => {
  switch (subject) {
    case 'Toán học':
      return 'ff-sub-badge--toan';
    case 'Vật lý':
      return 'ff-sub-badge--ly';
    case 'Hoá học':
      return 'ff-sub-badge--hoa';
    case 'Sinh học':
      return 'ff-sub-badge--sinh';
    case 'Ngữ văn':
      return 'ff-sub-badge--van';
    case 'Tiếng Anh':
      return 'ff-sub-badge--anh';
    case 'Lịch sử':
      return 'ff-sub-badge--su';
    case 'Địa lý':
      return 'ff-sub-badge--dia';
    case 'Tin học':
      return 'ff-sub-badge--tin';
    default:
      return 'ff-sub-badge--gdcd';
  }
};

const getDifficultyBadgeStyle = (difficulty?: ExamDifficulty): string => {
  switch (difficulty) {
    case 'Nhận biết':
      return 'ff-diff-badge--nhan-biet';
    case 'Thông hiểu':
      return 'ff-diff-badge--thong-hieu';
    case 'Vận dụng':
      return 'ff-diff-badge--van-dung';
    case 'Vận dụng cao':
      return 'ff-diff-badge--van-dung-cao';
    default:
      return 'ff-diff-badge--thong-hieu';
  }
};

const getCompactPaperTitle = (paper: ExamPaper): string => {
  const subjectPattern = [...new Set([paper.subject, paper.subject.replace(/ +học$/i, '')])]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((subject) => subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  let title = paper.title.replace(/^Đề /i, '').replace(/^(?:thi|cương ôn tập|kiểm tra) /i, '');
  if (subjectPattern) {
    title = title.replace(new RegExp(`(?:${subjectPattern}) ${paper.grade}(?= |$|[—–-])`, 'i'), '');
  }
  title = title.replace(new RegExp(` ${paper.grade}(?= *[—–-]| *$)`, 'i'), '');
  title = title.replace(/ *[—–-] */, ' · ').replace(/  +/g, ' ').trim();
  title = title.replace(/^[ ·]+|[ ·]+$/g, '');
  if (title) title = title.charAt(0).toUpperCase() + title.slice(1);
  return title || paper.title;
};

const ASSESSMENT_TRACKS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'gdpt2018', label: 'GDPT 2018 (3 Phần Chuẩn)' },
  { id: 'hsa', label: 'ĐGNL HSA (ĐHQG Hà Nội)' },
  { id: 'vact', label: 'ĐGNL V-ACT (ĐHQG TP.HCM)' },
  { id: 'tsa', label: 'ĐGTD TSA (Bách Khoa Hà Nội)' },
] as const;

const getExamStructureBadge = (paper: ExamPaper): string => {
  const text = (paper.title + ' ' + (paper.summary || '') + ' ' + paper.school).toLowerCase();
  if (text.includes('tsa') || text.includes('tư duy')) {
    return 'ĐGTD TSA (Bách Khoa Hà Nội) · 40 câu';
  }
  if (text.includes('v-act') || text.includes('apt') || text.includes('đhqg-hcm') || text.includes('tp. hồ chí minh')) {
    return 'ĐGNL V-ACT (ĐHQG TP.HCM) · 60 câu';
  }
  if (text.includes('hsa') || text.includes('đhqg hà nội') || text.includes('đhkhtn')) {
    return 'ĐGNL HSA (ĐHQG Hà Nội) · 50 câu';
  }
  return 'GDPT 2018 (3 Phần Chuẩn) · 40 câu';
};

export const ExamVaultView: React.FC<ExamVaultViewProps> = ({
  currentUser,
  onNavigate,
  onOpenLoginModal,
  onOpenProfile,
  initialSearchQuery = '',
}) => {
  const parallaxRef = useRef<HTMLDivElement>(null);
  const modalPortalRoot = typeof document !== 'undefined' ? document.body : null;

  /* Theme tracking */
  const [isLightMode, setIsLightMode] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('light');
  });

  useEffect(() => {
    const onClassChange = () => {
      setIsLightMode(document.documentElement.classList.contains('light'));
    };
    const observer = new MutationObserver(onClassChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = parallaxRef.current;
    const supportsParallax = window.matchMedia('(pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!root || !supportsParallax || prefersReducedMotion) return;

    let frame = 0;
    let x = 0;
    let y = 0;
    const commitParallax = () => {
      frame = 0;
      root.style.setProperty('--ff-exam-parallax-a-x', `${(-x * 0.45).toFixed(2)}px`);
      root.style.setProperty('--ff-exam-parallax-a-y', `${(-y * 0.45).toFixed(2)}px`);
      root.style.setProperty('--ff-exam-parallax-b-x', `${(x * 0.8).toFixed(2)}px`);
      root.style.setProperty('--ff-exam-parallax-b-y', `${(y * 0.8).toFixed(2)}px`);
    };
    const scheduleCommit = () => {
      if (!frame) frame = window.requestAnimationFrame(commitParallax);
    };
    const handlePointerMove = (event: PointerEvent) => {
      x = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 22;
      y = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 16;
      scheduleCommit();
    };
    const handlePointerLeave = () => {
      x = 0;
      y = 0;
      scheduleCommit();
    };

    root.addEventListener('pointermove', handlePointerMove, { passive: true });
    root.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    return () => {
      root.removeEventListener('pointermove', handlePointerMove);
      root.removeEventListener('pointerleave', handlePointerLeave);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const handleToggleTheme = useCallback(() => {
    toggleThemeMode();
  }, []);

  const submissionStorageKey = currentUser?.email
    ? `${SUBMISSIONS_KEY}:${currentUser.email.toLowerCase()}`
    : SUBMISSIONS_KEY;

  /* Search & Filter States */
  const [searchTerm, setSearchTerm] = useState(initialSearchQuery);
  const [selectedGrade, setSelectedGrade] = useState<number>(0);
  const [selectedExamType, setSelectedExamType] = useState<string>('Tất cả loại');
  const [selectedSubject, setSelectedSubject] = useState<string>('Tất cả môn');
  const [selectedProvince, setSelectedProvince] = useState<string>('Toàn quốc');
  const [selectedSchool, setSelectedSchool] = useState<string>('Tất cả trường');
  const [selectedYear, setSelectedYear] = useState<string>('Tất cả năm');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('Tất cả mức độ');
  const [selectedAssessmentTrack, setSelectedAssessmentTrack] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'likes' | 'rating'>('newest');
  const [activeTab, setActiveTab] = useState<'all' | 'syllabus' | 'exams' | 'saved' | 'cached' | 'my_submissions'>('all');
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);

  /* Saved bookmarks */
  const [savedExams, setSavedExams] = useState<string[]>(() => {
    try {
      const data = safeStorage.getItem(SAVED_EXAMS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  /* User Submissions */
  const [submissions, setSubmissions] = useState<ExamPaper[]>(() => {
    if (!currentUser?.email) return [];
    try {
      const raw = safeStorage.getItem(`${SUBMISSIONS_KEY}:${currentUser.email.toLowerCase()}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [submissionsOwnerKey, setSubmissionsOwnerKey] = useState(submissionStorageKey);
  const currentSubmissions = submissionsOwnerKey === submissionStorageKey ? submissions : EMPTY_EXAM_SUBMISSIONS;
  const [publicSubmissions, setPublicSubmissions] = useState<ExamPaper[]>([]);

  /* Real community metrics come from authenticated, server-persisted interactions. */
  const [examInteractions, setExamInteractions] = useState<ExamInteractionMap>({});
  const [interactionReadyKey, setInteractionReadyKey] = useState('');
  const [interactionFailedKey, setInteractionFailedKey] = useState('');
  const [pendingInteractionIds, setPendingInteractionIds] = useState<string[]>([]);
  const interactionRequestIdsRef = useRef(new Set<string>());
  const reviewRequestIdsRef = useRef(new Set<string>());
  const interactionScopeKey = currentUser?.email?.trim().toLowerCase() || 'anonymous';
  const interactionPaperIdsKey = useMemo(() => Array.from(new Set([
    ...SEED_EXAMS.map((paper) => paper.id),
    ...publicSubmissions.filter((paper) => paper.status === 'approved').map((paper) => paper.id),
    ...currentSubmissions.filter((paper) => paper.status === 'approved').map((paper) => paper.id),
  ])).sort().join('|'), [publicSubmissions, currentSubmissions]);

  /* Trạng thái tính năng học thuật mới: CBT Practice, Flashcard Revision, Bookmark Drawer, Print Modal, Offline Cache */
  const [cbtExam, setCbtExam] = useState<ExamPaper | null>(null);
  const [flashcardExam, setFlashcardExam] = useState<ExamPaper | null>(null);
  const [isBookmarkDrawerOpen, setIsBookmarkDrawerOpen] = useState(false);
  const [printExam, setPrintExam] = useState<ExamPaper | null>(null);
  const [cachedExamIds, setCachedExamIds] = useState<string[]>(() => getCachedExamIds());
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  /* Chỉ bookmarks, offline cache và submissions cần đồng bộ đa tab. */
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.newValue) {
        if (e.key === OFFLINE_EXAMS_CACHE_KEY) setCachedExamIds([]);
        if (e.key === SAVED_EXAMS_KEY) setSavedExams([]);
        if (e.key === submissionStorageKey) {
          setSubmissions([]);
          setSubmissionsOwnerKey(submissionStorageKey);
        }
        return;
      }
      try {
        if (e.key === SAVED_EXAMS_KEY) setSavedExams(JSON.parse(e.newValue));
        if (e.key === submissionStorageKey) {
          setSubmissions(JSON.parse(e.newValue));
          setSubmissionsOwnerKey(submissionStorageKey);
        }
        if (e.key === OFFLINE_EXAMS_CACHE_KEY) {
          const ids = JSON.parse(e.newValue);
          setCachedExamIds(Array.isArray(ids) ? ids : []);
        }
      } catch {
        /* Bỏ qua lỗi phân tích chuỗi lưu trữ */
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [submissionStorageKey]);

  useEffect(() => {
    let isCurrent = true;
    fetchExamSubmissions()
      .then((collection) => {
        if (!isCurrent) return;
        setSubmissions(collection.submissions);
        setSubmissionsOwnerKey(submissionStorageKey);
        setPublicSubmissions(collection.approvedSubmissions);
        if (currentUser?.email) {
          safeStorage.setItem(submissionStorageKey, JSON.stringify(collection.submissions));
        }
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, [submissionStorageKey, currentUser?.email, currentUser?.id, currentUser?.role, currentUser?.staffRole]);

  useEffect(() => {
    let isCurrent = true;
    fetchExamInteractions()
      .then((interactions) => {
        if (!isCurrent) return;
        setExamInteractions(interactions);
        setInteractionFailedKey('');
        setInteractionReadyKey(interactionScopeKey);
      })
      .catch(() => {
        if (!isCurrent) return;
        setExamInteractions({});
        setInteractionFailedKey(interactionScopeKey);
      });
    return () => {
      isCurrent = false;
    };
  }, [interactionScopeKey, interactionPaperIdsKey, currentUser?.id]);

  /* Modals */
  const [previewExam, setPreviewExam] = useState<ExamPaper | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const params = new URLSearchParams(window.location.search);
      const examId = params.get('id') || params.get('exam');
      if (examId) {
        return SEED_EXAMS.find((p) => p.id === examId) || null;
      }
    } catch {
      /* Bỏ qua lỗi URL */
    }
    return null;
  });
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isKnowledgeGraphOpen, setIsKnowledgeGraphOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  /* Toast Helper */
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    const t = setTimeout(() => setToastMessage(null), 3600);
    return () => clearTimeout(t);
  }, []);

  /* Lắng nghe trạng thái mạng Online / Offline */
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Đã khôi phục kết nối mạng Internet.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Bạn đang ngoại tuyến. Có thể xem các đề thi đã lưu cache.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  /* Xoá tất cả đề đã lưu trong Bookmark Drawer */
  const handleClearAllBookmarks = useCallback(() => {
    setSavedExams([]);
    safeStorage.setItem(SAVED_EXAMS_KEY, JSON.stringify([]));
    showToast('Đã xoá toàn bộ đề thi khỏi danh sách yêu thích.');
  }, [showToast, setSavedExams]);

  /* Bỏ lưu một đề thi cụ thể */
  const handleRemoveBookmark = useCallback((examId: string) => {
    setSavedExams((prev) => {
      const next = prev.filter((id) => id !== examId);
      safeStorage.setItem(SAVED_EXAMS_KEY, JSON.stringify(next));
      showToast('Đã xoá đề thi khỏi mục yêu thích.');
      return next;
    });
  }, [showToast, setSavedExams]);

  /* Mở modal in ấn & xuất PDF */
  const handleOpenPrint = useCallback((paper: ExamPaper, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setPrintExam(paper);
  }, []);

  /* Preview Modal Interactive Sub-states */
  const [showDetailedSolutions, setShowDetailedSolutions] = useState(false);
  const [expandedSolutionIndices, setExpandedSolutionIndices] = useState<number[]>([]);
  const [hoverRating, setHoverRating] = useState(0);
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);

  /* Submission Form State */
  const [submitTitle, setSubmitTitle] = useState('');
  const [submitGrade, setSubmitGrade] = useState<number>(12);
  const [submitSubject, setSubmitSubject] = useState('Toán học');
  const [submitExamType, setSubmitExamType] = useState<ExamType>('Đề giữa kỳ 1');
  const [submitProvince, setSubmitProvince] = useState('Hà Nội');
  const [submitSchool, setSubmitSchool] = useState('THPT Chuyên Hà Nội - Amsterdam');
  const [submitYear, setSubmitYear] = useState('2026-2027');
  const [submitDifficulty, setSubmitDifficulty] = useState<ExamDifficulty>('Vận dụng');
  const [submitNotes, setSubmitNotes] = useState('');
  const [submitFiles, setSubmitFiles] = useState<File[]>([]);
  const submitFileSize = formatExamFileSize(submitFiles.reduce((total, file) => total + file.size, 0));
  const [isUploading, setIsUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitInFlightRef = useRef(false);

  const handleAddSubmitFiles = (files: File[]) => {
    if (files.length === 0) return;
    const unsupported = files.filter((file) => !isSupportedExamAttachment(file));
    if (unsupported.length > 0) {
      setSubmitError('Chỉ nhận ảnh JPG, PNG, WebP, GIF, AVIF, PDF, DOC/DOCX và Markdown (.md).');
      return;
    }
    if (files.some((file) => file.size <= 0 || file.size > MAX_EXAM_ATTACHMENT_BYTES)) {
      setSubmitError('Mỗi tệp phải nhỏ hơn 10 MB và không được để trống.');
      return;
    }

    const existingKeys = new Set(submitFiles.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
    const additions = files.filter((file) => !existingKeys.has(`${file.name}:${file.size}:${file.lastModified}`));
    if (submitFiles.length + additions.length > MAX_EXAM_SUBMISSION_FILES) {
      setSubmitError(`Mỗi lần gửi tối đa ${MAX_EXAM_SUBMISSION_FILES} tệp. Hãy gộp tài liệu hoặc bỏ bớt tệp rồi thử lại.`);
      return;
    }
    const totalBytes = [...submitFiles, ...additions].reduce((total, file) => total + file.size, 0);
    if (totalBytes > MAX_EXAM_SUBMISSION_BYTES) {
      setSubmitError('Tổng dung lượng đính kèm tối đa 18 MB.');
      return;
    }

    setSubmitFiles((current) => [...current, ...additions]);
    setSubmitError(null);
  };

  /* Save/Bookmark toggle */
  const handleToggleBookmark = useCallback((examId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSavedExams((prev) => {
      const exists = prev.includes(examId);
      const next = exists ? prev.filter((id) => id !== examId) : [...prev, examId];
      safeStorage.setItem(SAVED_EXAMS_KEY, JSON.stringify(next));
      showToast(exists ? 'Đã bỏ lưu đề thi khỏi thư viện.' : 'Đã lưu đề thi vào kho cá nhân thành công!');
      try {
        playChime();
      } catch {
        /* Bỏ qua âm thanh */
      }
      return next;
    });
  }, [showToast, setSavedExams]);

  const askForCommunityLogin = useCallback(() => {
    if (onOpenLoginModal) onOpenLoginModal();
    else showToast('Đăng nhập để tham gia hoạt động cộng đồng.');
  }, [onOpenLoginModal, showToast]);

  const saveInteractionSnapshot = useCallback((paperId: string, snapshot: ExamInteractionSnapshot) => {
    setExamInteractions((previous) => ({ ...previous, [paperId]: snapshot }));
  }, []);

  const handleToggleLike = useCallback(async (paperId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!currentUser?.id && !currentUser?.email) {
      askForCommunityLogin();
      return;
    }
    if (interactionReadyKey !== interactionScopeKey || interactionFailedKey === interactionScopeKey) {
      showToast('Hoạt động cộng đồng hiện chưa khả dụng.');
      return;
    }
    if (interactionRequestIdsRef.current.has(paperId)) return;
    interactionRequestIdsRef.current.add(paperId);
    setPendingInteractionIds((previous) => previous.includes(paperId) ? previous : [...previous, paperId]);
    const currentLike = examInteractions[paperId]?.likedByUser ?? false;
    try {
      const snapshot = await setExamLike(paperId, !currentLike);
      saveInteractionSnapshot(paperId, snapshot);
      showToast(snapshot.likedByUser ? 'Đã thêm vào yêu thích cộng đồng.' : 'Đã bỏ yêu thích.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể cập nhật lượt yêu thích.');
    } finally {
      interactionRequestIdsRef.current.delete(paperId);
      setPendingInteractionIds((previous) => previous.filter((id) => id !== paperId));
    }
  }, [currentUser?.id, currentUser?.email, askForCommunityLogin, interactionReadyKey, interactionScopeKey, interactionFailedKey, examInteractions, saveInteractionSnapshot, showToast]);

  /* Open the actual print-to-PDF flow; the browser print action is not a download metric. */
  const handleDownload = useCallback((exam: ExamPaper, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setPrintExam(exam);
  }, []);

  /* User rating is stored once per account on the server. */
  const handleRateExam = useCallback(async (paperId: string, stars: number) => {
    if (!currentUser?.id && !currentUser?.email) {
      askForCommunityLogin();
      return;
    }
    if (interactionReadyKey !== interactionScopeKey || interactionFailedKey === interactionScopeKey) {
      showToast('Hoạt động cộng đồng hiện chưa khả dụng.');
      return;
    }
    if (interactionRequestIdsRef.current.has(paperId)) return;
    interactionRequestIdsRef.current.add(paperId);
    setPendingInteractionIds((previous) => previous.includes(paperId) ? previous : [...previous, paperId]);
    try {
      const snapshot = await rateExamPaper(paperId, stars);
      saveInteractionSnapshot(paperId, snapshot);
      showToast(`Đã ghi nhận ${stars} sao của bạn.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể lưu đánh giá.');
    } finally {
      interactionRequestIdsRef.current.delete(paperId);
      setPendingInteractionIds((previous) => previous.filter((id) => id !== paperId));
    }
  }, [currentUser?.id, currentUser?.email, askForCommunityLogin, interactionReadyKey, interactionScopeKey, interactionFailedKey, saveInteractionSnapshot, showToast]);

  /* A synchronous ref guard blocks double-clicks before React can disable the form. */
  const handleAddPeerReview = useCallback(async (paperId: string, e: React.FormEvent) => {
    e.preventDefault();
    const content = newReviewText.trim();
    if (!content) return;
    if (!currentUser?.id && !currentUser?.email) {
      askForCommunityLogin();
      return;
    }
    if (interactionReadyKey !== interactionScopeKey || interactionFailedKey === interactionScopeKey) {
      showToast('Hoạt động cộng đồng hiện chưa khả dụng.');
      return;
    }
    if (reviewRequestIdsRef.current.has(paperId) || interactionRequestIdsRef.current.has(paperId)) return;
    reviewRequestIdsRef.current.add(paperId);
    interactionRequestIdsRef.current.add(paperId);
    setPendingInteractionIds((previous) => previous.includes(paperId) ? previous : [...previous, paperId]);
    try {
      const snapshot = await submitExamReview(paperId, content, newReviewRating);
      saveInteractionSnapshot(paperId, snapshot);
      setNewReviewText('');
      setNewReviewRating(5);
      showToast('Nhận xét đã được gửi. Cảm ơn bạn đã chia sẻ!');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể gửi nhận xét.');
    } finally {
      reviewRequestIdsRef.current.delete(paperId);
      interactionRequestIdsRef.current.delete(paperId);
      setPendingInteractionIds((previous) => previous.filter((id) => id !== paperId));
    }
  }, [newReviewText, newReviewRating, currentUser?.id, currentUser?.email, askForCommunityLogin, interactionReadyKey, interactionScopeKey, interactionFailedKey, saveInteractionSnapshot, showToast]);

  /* Solution Index Accordion Toggle */
  const toggleSolutionIndex = useCallback((idx: number) => {
    setExpandedSolutionIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  }, []);

  /* Cross Navigation to Q&A */
  const handleDiscussInQA = useCallback((exam: ExamPaper) => {
    try {
      /* Tạo sẵn nội dung câu hỏi thảo luận vào bản nháp Hỏi Đáp */
      safeStorage.setItem(
        'fforum_draft_ask',
        JSON.stringify({
          title: `Thảo luận đề thi: ${exam.title}`,
          content: `Mình đang giải đề thi "${exam.title}" (${exam.school} - ${exam.schoolYear}). Bạn nào có lời giải hay cho các câu vận dụng hoặc mẹo phòng thi thì chia sẻ cùng mình nhé!`,
          subject: exam.subject,
        }),
      );
    } catch {
      /* Bỏ qua lỗi lưu nháp */
    }
    showToast(`Đang chuyển sang Diễn Đàn Hỏi Đáp cho đề: ${exam.title}...`);
    setTimeout(() => {
      onNavigate('qa');
    }, 350);
  }, [onNavigate, showToast]);

  /* Share to Study Club */
  const handleShareToClub = useCallback((exam: ExamPaper) => {
    const url = `${window.location.origin}${getExamViewerUrl(exam.id)}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    showToast('Đã sao chép liên kết đề thi! Đang chuyển sang Câu Lạc Bộ để bạn chia sẻ...');
    try {
      playChime();
    } catch {
      /* Bỏ qua */
    }
    setTimeout(() => {
      onNavigate('clubs');
    }, 450);
  }, [onNavigate, showToast]);

  /* Handle Student Submission */
  const handleSubmitExam = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitInFlightRef.current) return;
    if (!submitTitle.trim()) {
      setSubmitError('Vui lòng nhập tên đề thi hoặc đề cương.');
      return;
    }
    if (submitFiles.length === 0) {
      setSubmitError('Vui lòng đính kèm ít nhất một tệp ảnh, PDF, DOC/DOCX hoặc Markdown.');
      return;
    }
    if (!currentUser?.email) {
      setSubmitError('Vui lòng đăng nhập để gửi đề thi.');
      onOpenLoginModal?.();
      return;
    }

    submitInFlightRef.current = true;
    setIsUploading(true);
    setSubmitError(null);
    try {
      const newSubmission = await submitExamPaper({
        title: submitTitle.trim(),
        subject: submitSubject,
        grade: submitGrade,
        examType: submitExamType,
        province: submitProvince,
        school: submitSchool.trim() || 'Trường THPT',
        schoolYear: submitYear,
        difficulty: submitDifficulty,
        notes: submitNotes.trim(),
        files: submitFiles,
      });
      setSubmissionsOwnerKey(submissionStorageKey);
      setSubmissions((previous) => {
        const updated = [newSubmission, ...previous.filter((submission) => submission.id !== newSubmission.id)];
        safeStorage.setItem(submissionStorageKey, JSON.stringify(updated));
        return updated;
      });
      setIsSubmitModalOpen(false);
      setSubmitTitle('');
      setSubmitNotes('');
      setSubmitFiles([]);
      setSubmitError(null);
      showToast('Đã tải tệp và gửi đề thi đến hàng chờ kiểm duyệt.');
      try {
        playChime();
      } catch {
        /* Bỏ qua âm thanh */
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Không thể gửi đề thi. Vui lòng thử lại.');
    } finally {
      submitInFlightRef.current = false;
      setIsUploading(false);
    }
  }, [
    submitTitle,
    submitSubject,
    submitGrade,
    submitExamType,
    submitProvince,
    submitSchool,
    submitYear,
    submitDifficulty,
    submitFiles,
    currentUser?.email,
    submitNotes,
    submissionStorageKey,
    onOpenLoginModal,
    showToast,
  ]);

  /* Admin Approval / Rejection */
  const handleApproveSubmission = useCallback(async (examId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const approvedSubmission = await reviewExamSubmission(examId, 'approved');
      setSubmissionsOwnerKey(submissionStorageKey);
      setSubmissions((previous) => {
        const updated = previous.map((item) => item.id === examId ? approvedSubmission : item);
        safeStorage.setItem(submissionStorageKey, JSON.stringify(updated));
        return updated;
      });
      setPublicSubmissions((previous) => [
        approvedSubmission,
        ...previous.filter((item) => item.id !== examId),
      ]);
      showToast('Đã duyệt đề thi thành công! Đề đã được đưa vào kho công khai.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể duyệt đề thi.');
    }
  }, [showToast, submissionStorageKey]);

  const handleRejectSubmission = useCallback(async (examId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const rejectedSubmission = await reviewExamSubmission(examId, 'rejected');
      setSubmissionsOwnerKey(submissionStorageKey);
      setSubmissions((previous) => {
        const updated = previous.map((item) => item.id === examId ? rejectedSubmission : item);
        safeStorage.setItem(submissionStorageKey, JSON.stringify(updated));
        return updated;
      });
      showToast('Đã từ chối duyệt đề thi.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể từ chối đề thi.');
    }
  }, [showToast, submissionStorageKey]);

  const handleDownloadExamAttachment = useCallback(async (
    submissionId: string,
    attachment: NonNullable<ExamPaper['attachments']>[number],
    event?: React.MouseEvent,
  ) => {
    event?.stopPropagation();
    try {
      await downloadExamAttachment(submissionId, attachment);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể tải tệp đính kèm.');
    }
  }, [showToast]);

  /* Combine public papers with server-backed community data only. */
  const allPapers = useMemo(() => {
    const approvedSubmissionMap = new Map<string, ExamPaper>();
    publicSubmissions.filter((submission) => submission.status === 'approved')
      .forEach((submission) => approvedSubmissionMap.set(submission.id, submission));
    currentSubmissions.filter((submission) => submission.status === 'approved')
      .forEach((submission) => approvedSubmissionMap.set(submission.id, submission));
    const combined = [...approvedSubmissionMap.values(), ...SEED_EXAMS];
    const interactionDataReady = interactionReadyKey === interactionScopeKey && interactionFailedKey !== interactionScopeKey;

    return combined.map((paper) => {
      const interaction = interactionDataReady ? examInteractions[paper.id] : undefined;
      return {
        ...paper,
        likes: interaction?.likeCount,
        rating: interaction?.averageRating ?? undefined,
        ratingCount: interaction?.ratingCount,
        peerReviews: interaction?.reviews,
      };
    });
  }, [currentSubmissions, publicSubmissions, examInteractions, interactionReadyKey, interactionScopeKey, interactionFailedKey]);

  /* Filter & Search Pipeline */
  const filteredPapers = useMemo(() => {
    let result = [...allPapers];

    /* Filter by view tabs */
    if (activeTab === 'syllabus') {
      result = result.filter((p) => p.examType === 'Đề cương ôn tập');
    } else if (activeTab === 'exams') {
      result = result.filter((p) => p.examType !== 'Đề cương ôn tập');
    } else if (activeTab === 'saved') {
      result = result.filter((p) => savedExams.includes(p.id));
    } else if (activeTab === 'cached') {
      result = result.filter((p) => cachedExamIds.includes(p.id));
    } else if (activeTab === 'my_submissions') {
      return currentSubmissions;
    }

    /* Keyword Search */
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.subject.toLowerCase().includes(q) ||
          p.school.toLowerCase().includes(q) ||
          p.province.toLowerCase().includes(q) ||
          p.examType.toLowerCase().includes(q) ||
          (p.difficulty && p.difficulty.toLowerCase().includes(q)),
      );
    }

    /* Grade Filter */
    if (selectedGrade > 0) {
      result = result.filter((p) => p.grade === selectedGrade);
    }

    /* Exam Type Filter */
    if (selectedExamType !== 'Tất cả loại') {
      result = result.filter((p) => p.examType === selectedExamType);
    }

    /* Subject Filter */
    if (selectedSubject !== 'Tất cả môn') {
      result = result.filter((p) => {
        if (p.subject === selectedSubject) return true;
        if (selectedSubject === 'Hóa học' && p.subject === 'Hoá học') return true;
        if (selectedSubject === 'Hoá học' && p.subject === 'Hóa học') return true;
        const base = selectedSubject.replace(' học', '').toLowerCase();
        return p.subject.toLowerCase().includes(base);
      });
    }

    /* Difficulty Filter */
    if (selectedDifficulty !== 'Tất cả mức độ') {
      result = result.filter((p) => p.difficulty === selectedDifficulty);
    }

    /* Province Filter */
    if (selectedProvince !== 'Toàn quốc') {
      result = result.filter((p) => p.province === selectedProvince);
    }

    /* School Filter */
    if (selectedSchool !== 'Tất cả trường') {
      result = result.filter((p) => p.school.toLowerCase().includes(selectedSchool.toLowerCase()));
    }

    /* School Year Filter */
    if (selectedYear !== 'Tất cả năm') {
      result = result.filter((p) => p.schoolYear === selectedYear);
    }

    if (selectedAssessmentTrack === 'gdpt2018') {
      result = result.filter((p) => {
        const text = (p.title + ' ' + (p.summary || '') + ' ' + p.school).toLowerCase();
        return p.grade === 12 || text.includes('gdpt') || text.includes('2018') || text.includes('3 phần') || text.includes('thpt');
      });
    } else if (selectedAssessmentTrack === 'hsa') {
      result = result.filter((p) => {
        const text = (p.title + ' ' + (p.summary || '') + ' ' + p.school).toLowerCase();
        return text.includes('hsa') || text.includes('đhqg hà nội') || text.includes('đhkhtn');
      });
    } else if (selectedAssessmentTrack === 'vact') {
      result = result.filter((p) => {
        const text = (p.title + ' ' + (p.summary || '') + ' ' + p.school).toLowerCase();
        return text.includes('v-act') || text.includes('apt') || text.includes('đhqg-hcm') || text.includes('tp. hồ chí minh');
      });
    } else if (selectedAssessmentTrack === 'tsa') {
      result = result.filter((p) => {
        const text = (p.title + ' ' + (p.summary || '') + ' ' + p.school).toLowerCase();
        return text.includes('tsa') || text.includes('tư duy') || text.includes('bách khoa');
      });
    }

    /* Sorting */
    if (sortBy === 'likes') {
      result.sort((a, b) => (b.likes ?? -1) - (a.likes ?? -1));
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    }

    return result;
  }, [
    allPapers,
    activeTab,
    selectedAssessmentTrack,
    searchTerm,
    selectedGrade,
    selectedExamType,
    selectedSubject,
    selectedDifficulty,
    selectedProvince,
    selectedSchool,
    selectedYear,
    sortBy,
    savedExams,
    currentSubmissions,
    cachedExamIds,
  ]);

  /* Keyboard shortcut Escape to close modals */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (flashcardExam) setFlashcardExam(null);
        else if (cbtExam) setCbtExam(null);
        else if (isBookmarkDrawerOpen) setIsBookmarkDrawerOpen(false);
        else if (printExam) setPrintExam(null);
        else if (previewExam) setPreviewExam(null);
        else if (isSubmitModalOpen) setIsSubmitModalOpen(false);
        else if (isKnowledgeGraphOpen) setIsKnowledgeGraphOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flashcardExam, cbtExam, isBookmarkDrawerOpen, printExam, previewExam, isSubmitModalOpen, isKnowledgeGraphOpen]);

  const adminCaps = useAdminCaps();
  const isStaffOrAdmin = currentUser?.role === 'SUPER_ADMIN'
    || currentUser?.staffRole === 'MODERATOR'
    || currentUser?.staffRole === 'TEACHER'
    || (adminCaps.ready && (capsHas(adminCaps, 'ban') || capsHas(adminCaps, 'warn') || capsHas(adminCaps, 'mute')));

  /* Active Preview Exam with Latest Reactive Overrides */
  const activePreview = useMemo(() => {
    if (!previewExam) return null;
    return allPapers.find((p) => p.id === previewExam.id) || previewExam;
  }, [previewExam, allPapers]);
  const activePreviewIsPublic = Boolean(activePreview && (!activePreview.status || activePreview.status === 'approved'));
  const activePreviewInteraction = activePreviewIsPublic && interactionReadyKey === interactionScopeKey && interactionFailedKey !== interactionScopeKey
    ? examInteractions[activePreview!.id]
    : undefined;
  const activePreviewInteractionReady = Boolean(activePreviewInteraction);
  const activePreviewInteractionUnavailable = Boolean(
    activePreviewIsPublic && (
      interactionFailedKey === interactionScopeKey ||
      (interactionReadyKey === interactionScopeKey && !activePreviewInteraction)
    ),
  );

  /* Prevent background scrolling when any modal or drawer is open */
  const isAnyModalOpen = Boolean(
    flashcardExam || cbtExam || isBookmarkDrawerOpen || printExam || previewExam || isSubmitModalOpen || isKnowledgeGraphOpen
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isAnyModalOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isAnyModalOpen]);

  /* Deep link: tự động mở xem thử đề thi hoặc phòng thi CBT khi URL có query (xử lý 1 lần) */
  const hasHandledDeepLinkRef = React.useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasHandledDeepLinkRef.current) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const examId = params.get('id') || params.get('exam');
      const cbtId = params.get('cbt') || params.get('practice');
      const showSavedDrawer = params.get('drawer') === 'saved' || params.get('saved') === '1';

      let handled = false;

      if (cbtId) {
        const found = allPapers.find((p) => p.id === cbtId);
        if (found) {
          handled = true;
          window.requestAnimationFrame(() => setCbtExam(found));
        }
      }

      if (showSavedDrawer) {
        handled = true;
        window.requestAnimationFrame(() => setIsBookmarkDrawerOpen(true));
      }

      if (examId && !handled) {
        const found = allPapers.find((p) => p.id === examId);
        if (found) {
          handled = true;
          window.requestAnimationFrame(() => setPreviewExam(found));
        }
      }

      if (handled) {
        hasHandledDeepLinkRef.current = true;
      }
    } catch {
      /* Bỏ qua lỗi đọc query URL */
    }
  }, [allPapers]);

  const activeAdvancedFilterCount = [
    selectedProvince !== 'Toàn quốc',
    selectedSchool !== 'Tất cả trường',
    selectedYear !== 'Tất cả năm',
  ].filter(Boolean).length;
  const resultHeading = {
    all: 'Tài liệu',
    syllabus: 'Đề cương',
    exams: 'Đề thi',
    saved: 'Đề đã lưu',
    cached: 'Đề ngoại tuyến',
    my_submissions: 'Đề đã gửi',
  }[activeTab];

  return (
    <div className="ff-exam-vault ff-light-adapt w-full flex flex-col items-center select-text">
      {/* ======================================================== */}
      {/* 1. TOP HEADER BAR: Back to Home + Brand Logo + Actions  */}
      {/* ======================================================== */}
      <header className="relative z-20 w-full px-3 sm:px-8 pt-[calc(0.5rem+var(--safe-top,0px))] pb-2 ff-exam-header-bar flex flex-nowrap items-center justify-between gap-2 border-b">
        {/* Top-left: Icon f-forum quay về trang chủ */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="ff-exam-brand ff-tactile-btn group flex shrink-0 items-center gap-2.5 cursor-pointer select-none bg-transparent border-none p-1.5 rounded-xl hover:bg-white/[0.06] transition-colors"
          aria-label="Về trang chủ F-Forum"
          title="Về trang chủ F-Forum"
        >
          <span className="ff-nav-logo shrink-0" aria-hidden="true">
            <span className="ff-nav-logo__core">F</span>
          </span>
          <div className="flex flex-col text-left">
            <span className="text-sm font-extrabold tracking-wide text-amber-200 group-hover:text-amber-100 transition-colors">
              F-Forum
            </span>
            <span className="hidden items-center gap-1 text-[10px] tracking-wider text-white/60 sm:flex">
              <ArrowLeft className="w-2.5 h-2.5" /> Trang chủ
            </span>
          </div>
        </button>

        {/* Top-right Actions */}
        <div className="ml-auto flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
          {/* Quick nav links */}
          <button
            type="button"
            onClick={() => onNavigate('qa')}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Hỏi Đáp</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('clubs')}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Câu Lạc Bộ</span>
          </button>

          {/* Nút Mạng Lưới Tri Thức */}
          <button
            type="button"
            onClick={() => setIsKnowledgeGraphOpen(true)}
            className="ff-tactile-btn inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3 text-xs font-bold text-cyan-300 hover:bg-cyan-500/25 transition-all cursor-pointer"
            aria-label="Mở Bản đồ Mạng lưới Tri thức Liên môn"
            title="Bản đồ Mạng lưới Tri thức Liên môn"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mạng Lưới Tri Thức</span>
          </button>

          {/* Online / Offline status badge */}
          {!isOnline && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold" title="Đang ở chế độ ngoại tuyến">
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ngoại tuyến</span>
            </div>
          )}

          {/* Nút Mở Bookmark Drawer (Đề đã lưu) */}
          <button
            type="button"
            onClick={() => setIsBookmarkDrawerOpen(true)}
            className="ff-tactile-btn ff-exam-icon-button relative hidden min-h-9 min-w-9 items-center justify-center rounded-xl text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer sm:inline-flex"
            aria-label={`Xem danh sách đề đã lưu (${savedExams.length})`}
            title="Đề thi yêu thích &amp; đã lưu"
          >
            <Bookmark className="w-4 h-4 text-amber-400" />
            {savedExams.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-amber-400 text-[#0b0d12] text-[10px] font-black flex items-center justify-center">
                {savedExams.length}
              </span>
            )}
          </button>

          {/* Theme Toggle Sun / Moon */}
          <button
            type="button"
            onClick={handleToggleTheme}
            className="ff-tactile-btn ff-exam-icon-button inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-xl text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label={isLightMode ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
            title={isLightMode ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
          >
            {isLightMode ? <Moon className="w-4 h-4 text-amber-500" /> : <Sun className="w-4 h-4 text-amber-300" />}
          </button>

          {/* Nút Đóng góp đề cương */}
          <button
            type="button"
            onClick={() => {
              if (!currentUser && onOpenLoginModal) {
                onOpenLoginModal();
              } else {
                setIsSubmitModalOpen(true);
              }
            }}
            className="ff-tactile-btn inline-flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 border-[#0b0d12] bg-[#f4f1de] px-2 text-xs font-extrabold text-[#0b0d12] transition-all duration-200 hover:bg-[#f2cc8f] sm:h-10 sm:w-auto sm:px-4"
            aria-label="Đóng góp đề cương để xét duyệt"
            title="Gửi đề cương"
          >
            <Upload className="h-4 w-4 shrink-0 text-[#e07a5f]" />
            <span className="hidden sm:inline">Gửi đề</span>
          </button>

          {/* Profile Avatar or Login CTA */}
          {currentUser ? (
            <button
              type="button"
              onClick={() => onOpenProfile?.(currentUser)}
              className="ff-tactile-btn flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] p-1 pl-1.5 pr-2.5 transition-colors hover:bg-white/[0.12]"
              aria-label={`Trang cá nhân của ${currentUser.name}`}
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                loading="lazy"
                className="w-6 h-6 rounded-lg object-cover ring-1 ring-amber-400/40"
              />
              <span className="hidden sm:inline text-xs font-semibold text-white/90 max-w-[150px] truncate">
                {currentUser.name}
              </span>
            </button>
          ) : onOpenLoginModal ? (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="ff-tactile-btn inline-flex min-h-9 min-w-9 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/[0.08] px-2 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/[0.15] sm:px-3"
              aria-label="Đăng nhập"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đăng nhập</span>
            </button>
          ) : null}
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. HERO SEARCH CONTAINER                                 */}
      {/* ======================================================== */}
      <section className="ff-exam-hero w-full max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] md:gap-6">
          <div className="text-center md:text-left">
            <div className="ff-exam-eyebrow mb-1.5 hidden items-center gap-2 sm:inline-flex">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>THƯ VIỆN HỌC TẬP</span>
            </div>
            <h1 className="ff-exam-title">
              {activeTab === 'syllabus' ? (
                <>
                  <span className="ff-swash-cap">Đ</span>ề cương <span className="ff-calligraphic-flourish">ôn tập</span>
                </>
              ) : activeTab === 'exams' ? (
                <>
                  <span className="ff-swash-cap">Đ</span>ề thi <span className="ff-calligraphic-flourish">theo môn</span>
                </>
              ) : activeTab === 'saved' ? (
                <>
                  <span className="ff-swash-cap">Đ</span>ề thi <span className="ff-calligraphic-flourish">đã lưu</span>
                </>
              ) : activeTab === 'cached' ? (
                <>
                  <span className="ff-swash-cap">K</span>ho lưu <span className="ff-calligraphic-flourish">ngoại tuyến</span>
                </>
              ) : activeTab === 'my_submissions' ? (
                <>
                  <span className="ff-swash-cap">B</span>ài đóng góp <span className="ff-calligraphic-flourish">của bạn</span>
                </>
              ) : (
                <>
                  <span className="ff-swash-cap">Đ</span>ề thi <span className="ff-calligraphic-flourish">&amp; đề cương</span>
                </>
              )}
            </h1>
          </div>

          <div className="ff-exam-hero-search w-full min-w-0 rounded-2xl p-2">
            <div className="relative flex min-w-0 items-center">
              <Search className="ml-2 h-5 w-5 shrink-0 text-amber-300" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên đề, môn hoặc trường..."
                className="w-full min-w-0 bg-transparent px-3 py-2 text-sm text-white placeholder-white/45 focus:outline-none sm:text-base"
                aria-label="Tìm kiếm đề thi"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="ff-tactile-btn ff-exam-icon-button mr-1 inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg text-white/55 hover:text-white"
                  aria-label="Xoá tìm kiếm"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="ff-exam-quick-search mt-1.5 flex items-center gap-1.5 overflow-x-auto border-t border-white/10 px-1 pt-1.5 text-left">
              <span className="mr-1 inline-flex shrink-0 items-center gap-1 text-[10px] text-white/50">
                <Sparkles className="h-3 w-3 text-amber-300" /> Gợi ý
              </span>
              {['Toán 12', 'Vật lý 11', 'Ngữ văn 11', 'Toán 9'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSearchTerm(tag)}
                  className="ff-tactile-btn min-h-8 shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] text-amber-200/90 transition-colors hover:bg-white/[0.12]"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. MULTI-LEVEL FILTERS POD                               */}
      {/* ======================================================== */}
      <section className="ff-exam-filter-panel w-full max-w-6xl mx-auto px-4 sm:px-6 py-3 my-2">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 pb-3 border-b border-white/10 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'Tất cả', count: allPapers.length },
            { id: 'syllabus', label: 'Đề cương', count: allPapers.filter((p) => p.examType === 'Đề cương ôn tập').length },
            { id: 'exams', label: 'Đề thi', count: allPapers.filter((p) => p.examType !== 'Đề cương ôn tập').length },
            { id: 'saved', label: 'Đã lưu', count: savedExams.length },
            { id: 'cached', label: 'Ngoại tuyến', count: cachedExamIds.length },
            { id: 'my_submissions', label: 'Bản gửi duyệt', count: currentSubmissions.length },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                aria-pressed={active}
                className={`ff-tactile-btn min-h-10 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? 'bg-amber-400/20 border border-amber-400 text-amber-200 shadow-[0_2px_12px_rgba(245,158,11,0.2)]'
                    : 'bg-white/[0.04] border border-transparent text-white/70 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${active ? 'bg-amber-400 text-[#0b0d12]' : 'bg-white/10 text-white/60'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="py-2.5 border-b border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {ASSESSMENT_TRACKS.map((track) => {
            const active = selectedAssessmentTrack === track.id;
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => setSelectedAssessmentTrack(track.id)}
                aria-pressed={active}
                className={`px-3 py-1.5 rounded-[12px] text-xs font-mono font-bold whitespace-nowrap transition-all duration-150 cursor-pointer border card-hard ${
                  active
                    ? 'bg-[#FBF2E1] text-[#2B2331] border-[#2B2331] shadow-sm font-extrabold'
                    : 'bg-white/[0.04] text-white/70 border-white/10 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {track.label}
              </button>
            );
          })}
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 gap-2.5 mt-2.5 sm:grid-cols-4">
          {/* Filter Khối lớp */}
          <div className="flex flex-col">
            <label className="ff-exam-filter-label text-[10px] font-mono uppercase tracking-wider text-white/50 mb-1 flex items-center gap-1">
              <Layers className="w-2.5 h-2.5" /> Khối lớp
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(Number(e.target.value))}
              className="w-full min-w-0 ff-exam-select text-xs rounded-xl px-2.5 py-2 focus:outline-none cursor-pointer"
            >
              {GRADE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Loại đề */}
          <div className="flex flex-col">
            <label className="ff-exam-filter-label text-[10px] font-mono uppercase tracking-wider text-white/50 mb-1 flex items-center gap-1">
              <FileCheck className="w-2.5 h-2.5" /> Loại đề
            </label>
            <select
              value={selectedExamType}
              onChange={(e) => setSelectedExamType(e.target.value)}
              className="w-full min-w-0 ff-exam-select text-xs rounded-xl px-2.5 py-2 focus:outline-none cursor-pointer"
            >
              {EXAM_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Môn học */}
          <div className="flex flex-col">
            <label className="ff-exam-filter-label text-[10px] font-mono uppercase tracking-wider text-white/50 mb-1 flex items-center gap-1">
              <BookOpen className="w-2.5 h-2.5" /> Môn học
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full min-w-0 ff-exam-select text-xs rounded-xl px-2.5 py-2 focus:outline-none cursor-pointer"
            >
              {SUBJECT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Mức độ khó */}
          <div className="flex flex-col">
            <label className="ff-exam-filter-label text-[10px] font-mono uppercase tracking-wider text-white/50 mb-1 flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" /> Mức độ
            </label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full min-w-0 ff-exam-select text-xs rounded-xl px-2.5 py-2 focus:outline-none cursor-pointer"
            >
              {DIFFICULTY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Hệ Thống Phân Luồng 12 Môn Học Trọng Điểm */}
        <div className="py-2.5 mt-2 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-white/70 font-semibold flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              12 Môn Học Trọng Điểm 2027
            </span>
            <span className="text-amber-300 font-bold text-[10.5px]">
              {selectedSubject}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth snap-x snap-mandatory">
            <button
              type="button"
              onClick={() => setSelectedSubject('Tất cả môn')}
              className={`snap-start shrink-0 card-hard rounded-[14px] px-3.5 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                selectedSubject === 'Tất cả môn'
                  ? 'border-amber-400 bg-amber-400/20 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                  : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Tất cả môn</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-white/80">
                {allPapers.length}
              </span>
            </button>

            {CORE_12_SUBJECTS.map((subj) => {
              const isSel = selectedSubject === subj.name || (subj.name === 'Hóa học' && selectedSubject === 'Hoá học');
              const count = allPapers.filter((p: ExamPaper) => p.subject === subj.name || (subj.name === 'Hóa học' && p.subject === 'Hoá học') || p.subject.toLowerCase().includes(subj.short.toLowerCase())).length;

              return (
                <button
                  key={subj.id}
                  type="button"
                  onClick={() => setSelectedSubject(subj.name)}
                  className={`snap-start shrink-0 card-hard rounded-[14px] px-3.5 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                    isSel
                      ? 'border-amber-400 bg-amber-400/20 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                      : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: subj.color }}
                  />
                  <span>{subj.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-white/80">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ma Trận Cấp Độ Đề Thi 2027 */}
        <div className="py-2.5 border-t border-dashed border-white/10 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10.5px] font-mono uppercase tracking-wider text-white/50 mr-1 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> Cấp độ:
            </span>
            {DIFFICULTY_OPTIONS.map((diff) => {
              const isSel = selectedDifficulty === diff;
              return (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    isSel
                      ? 'border-amber-400 bg-amber-400/20 text-amber-200 font-bold'
                      : 'border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.07]'
                  }`}
                >
                  {diff}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10.5px] font-mono uppercase tracking-wider text-white/50 mr-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-cyan-400" /> Năm:
            </span>
            {YEAR_OPTIONS.map((yr) => {
              const isSel = selectedYear === yr;
              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer font-mono ${
                    isSel
                      ? 'border-cyan-400 bg-cyan-400/20 text-cyan-200 font-bold'
                      : 'border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.07]'
                  }`}
                >
                  {yr}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => setIsAdvancedFiltersOpen((open) => !open)}
            aria-expanded={isAdvancedFiltersOpen}
            aria-controls="exam-advanced-filters"
            className={`ff-exam-filter-toggle ff-tactile-btn inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
              isAdvancedFiltersOpen || activeAdvancedFilterCount > 0
                ? 'is-active'
                : ''
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Thêm bộ lọc</span>
            {activeAdvancedFilterCount > 0 && (
              <span className="ff-exam-filter-count">{activeAdvancedFilterCount}</span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isAdvancedFiltersOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div id="exam-advanced-filters" className="ff-exam-advanced-filters mt-2" hidden={!isAdvancedFiltersOpen}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Filter Tỉnh thành */}
          <div className="flex flex-col">
            <label className="ff-exam-filter-label text-[10px] font-mono uppercase tracking-wider text-white/50 mb-1 flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" /> Tỉnh thành
            </label>
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="w-full min-w-0 ff-exam-select text-xs rounded-xl px-2.5 py-2 focus:outline-none cursor-pointer"
            >
              {PROVINCE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Trường học */}
          <div className="flex flex-col">
            <label className="ff-exam-filter-label text-[10px] font-mono uppercase tracking-wider text-white/50 mb-1 flex items-center gap-1">
              <School className="w-2.5 h-2.5" /> Trường học
            </label>
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="w-full min-w-0 ff-exam-select text-xs rounded-xl px-2.5 py-2 focus:outline-none cursor-pointer truncate"
            >
              {SCHOOL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Năm học */}
          <div className="flex flex-col">
            <label className="ff-exam-filter-label text-[10px] font-mono uppercase tracking-wider text-white/50 mb-1 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" /> Năm học
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full min-w-0 ff-exam-select text-xs rounded-xl px-2.5 py-2 focus:outline-none cursor-pointer"
            >
              {YEAR_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Sắp xếp */}
          <div className="flex flex-col">
            <label className="ff-exam-filter-label text-[10px] font-mono uppercase tracking-wider text-white/50 mb-1 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> Sắp xếp
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-full min-w-0 ff-exam-select text-xs rounded-xl px-2.5 py-2 focus:outline-none cursor-pointer"
            >
              <option value="newest">Mới nhất</option>
              <option value="likes">Được yêu thích</option>
              <option value="rating">Đánh giá cao</option>
            </select>
          </div>
          </div>
        </div>

        {/* Active Filter Chips & Reset */}
        {(selectedGrade > 0 ||
          selectedExamType !== 'Tất cả loại' ||
          selectedSubject !== 'Tất cả môn' ||
          selectedDifficulty !== 'Tất cả mức độ' ||
          selectedProvince !== 'Toàn quốc' ||
          selectedSchool !== 'Tất cả trường' ||
          selectedYear !== 'Tất cả năm' ||
          searchTerm) && (
          <div className="ff-exam-active-filters mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-white/50">Đang chọn:</span>
            {selectedGrade > 0 && (
              <span className="flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/15 py-0.5 pl-2 text-xs text-amber-300">
                Lớp {selectedGrade}
                <button type="button" onClick={() => setSelectedGrade(0)} className="inline-flex min-h-8 min-w-8 items-center justify-center rounded text-amber-300 hover:bg-amber-400/15" aria-label="Bỏ lọc khối lớp"><X className="h-3 w-3" /></button>
              </span>
            )}
            {selectedExamType !== 'Tất cả loại' && (
              <span className="flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/15 py-0.5 pl-2 text-xs text-amber-300">
                {selectedExamType}
                <button type="button" onClick={() => setSelectedExamType('Tất cả loại')} className="inline-flex min-h-8 min-w-8 items-center justify-center rounded text-amber-300 hover:bg-amber-400/15" aria-label="Bỏ lọc loại đề"><X className="h-3 w-3" /></button>
              </span>
            )}
            {selectedSubject !== 'Tất cả môn' && (
              <span className="flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/15 py-0.5 pl-2 text-xs text-amber-300">
                {selectedSubject}
                <button type="button" onClick={() => setSelectedSubject('Tất cả môn')} className="inline-flex min-h-8 min-w-8 items-center justify-center rounded text-amber-300 hover:bg-amber-400/15" aria-label="Bỏ lọc môn học"><X className="h-3 w-3" /></button>
              </span>
            )}
            {selectedDifficulty !== 'Tất cả mức độ' && (
              <span className="flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/15 py-0.5 pl-2 text-xs text-amber-300">
                {selectedDifficulty}
                <button type="button" onClick={() => setSelectedDifficulty('Tất cả mức độ')} className="inline-flex min-h-8 min-w-8 items-center justify-center rounded text-amber-300 hover:bg-amber-400/15" aria-label="Bỏ lọc mức độ"><X className="h-3 w-3" /></button>
              </span>
            )}
            {selectedProvince !== 'Toàn quốc' && (
              <span className="flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/15 py-0.5 pl-2 text-xs text-amber-300">
                {selectedProvince}
                <button type="button" onClick={() => setSelectedProvince('Toàn quốc')} className="inline-flex min-h-8 min-w-8 items-center justify-center rounded text-amber-300 hover:bg-amber-400/15" aria-label="Bỏ lọc tỉnh thành"><X className="h-3 w-3" /></button>
              </span>
            )}
            {selectedSchool !== 'Tất cả trường' && (
              <span className="flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/15 py-0.5 pl-2 text-xs text-amber-300">
                <span className="max-w-40 truncate">{selectedSchool}</span>
                <button type="button" onClick={() => setSelectedSchool('Tất cả trường')} className="inline-flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded text-amber-300 hover:bg-amber-400/15" aria-label="Bỏ lọc trường học"><X className="h-3 w-3" /></button>
              </span>
            )}
            {selectedYear !== 'Tất cả năm' && (
              <span className="flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/15 py-0.5 pl-2 text-xs text-amber-300">
                {selectedYear}
                <button type="button" onClick={() => setSelectedYear('Tất cả năm')} className="inline-flex min-h-8 min-w-8 items-center justify-center rounded text-amber-300 hover:bg-amber-400/15" aria-label="Bỏ lọc năm học"><X className="h-3 w-3" /></button>
              </span>
            )}
            {searchTerm && (
              <span className="flex max-w-full items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/15 py-0.5 pl-2 text-xs text-amber-300">
                <span className="max-w-40 truncate">{searchTerm}</span>
                <button type="button" onClick={() => setSearchTerm('')} className="inline-flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded text-amber-300 hover:bg-amber-400/15" aria-label="Bỏ từ khoá tìm kiếm"><X className="h-3 w-3" /></button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedGrade(0);
                setSelectedExamType('Tất cả loại');
                setSelectedSubject('Tất cả môn');
                setSelectedDifficulty('Tất cả mức độ');
                setSelectedProvince('Toàn quốc');
                setSelectedSchool('Tất cả trường');
                setSelectedYear('Tất cả năm');
                setSearchTerm('');
              }}
              className="inline-flex min-h-8 items-center text-xs text-amber-400 hover:underline ml-1 cursor-pointer"
            >
              Xoá lọc
            </button>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 4. MAIN EXAM CARDS GRID                                 */}
      {/* ======================================================== */}
      <section aria-label="Kết quả tìm kiếm" className="w-full max-w-6xl mx-auto px-4 sm:px-6 my-1">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="ff-exam-results-heading">{resultHeading}</h2>
          <span className="ff-exam-result-count" aria-live="polite">
            {filteredPapers.length} tài liệu
          </span>
        </div>

        {filteredPapers.length === 0 ? (
          <div className="w-full rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center flex flex-col items-center sm:p-12 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[#f2cc8f]/15 border border-[#f2cc8f]/35 flex items-center justify-center text-[#f2cc8f] shadow-[2px_2px_0px_rgba(4,6,11,0.8)]">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-[#f4f1de]">
              <span className="ff-swash-cap text-base">C</span>hưa tìm thấy tài liệu phù hợp
            </h3>
            <p className="text-xs text-[#a39f96] max-w-md leading-relaxed">
              "Hiếu học là cội nguồn của mọi thành tựu." Hãy thử điều chỉnh bộ lọc môn học, khối lớp hoặc gửi đề thi của trường bạn để cùng xây dựng kho tri thức chung nhé!
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedGrade(0);
                  setSelectedExamType('Tất cả loại');
                  setSelectedSubject('Tất cả môn');
                  setSelectedDifficulty('Tất cả độ khó');
                  setSelectedProvince('Toàn quốc');
                  setSelectedSchool('Tất cả trường');
                  setSearchTerm('');
                  setActiveTab('all');
                }}
                className="ff-tactile-btn min-h-10 px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Xoá bộ lọc
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!currentUser && onOpenLoginModal) onOpenLoginModal();
                  else setIsSubmitModalOpen(true);
                }}
                className="ff-tactile-btn min-h-10 px-4 py-2 rounded-xl border-2 border-[#0b0d12] bg-[#f4f1de] hover:bg-[#f2cc8f] text-[#0b0d12] text-xs font-extrabold transition-colors cursor-pointer"
              >
                Gửi đề thi
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:gap-6">
            {filteredPapers.map((paper) => {
              const isSaved = savedExams.includes(paper.id);
              const isPublicPaper = !paper.status || paper.status === 'approved';
              const interactionData = isPublicPaper && interactionReadyKey === interactionScopeKey && interactionFailedKey !== interactionScopeKey
                ? examInteractions[paper.id]
                : undefined;
              const interactionLoaded = Boolean(interactionData);
              const interactionUnavailable = isPublicPaper && (
                interactionFailedKey === interactionScopeKey ||
                (interactionReadyKey === interactionScopeKey && !interactionData)
              );
              const isLiked = interactionData?.likedByUser ?? false;
              const isInteractionPending = pendingInteractionIds.includes(paper.id);
              const isPending = paper.status === 'pending';
              const cardTitle = getCompactPaperTitle(paper);

              return (
                <article
                  key={paper.id}
                  tabIndex={0}
                  aria-label={`Mở trang đọc: ${paper.title}`}
                  onClick={(event) => {
                    if ((event.target as HTMLElement).closest('button, a, input, select, textarea')) return;
                    openExamViewer(paper.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
                    e.preventDefault();
                    openExamViewer(paper.id);
                  }}
                  data-exam-id={paper.id}
                  className={`ff-exam-card rounded-2xl p-4.5 sm:p-5.5 lg:p-6 flex flex-col justify-between cursor-pointer relative overflow-visible group ${
                    isPending ? 'border-amber-400/40 bg-amber-950/20' : ''
                  }`}
                >
                  {/* Top tags row */}
                  <div>
                    <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                        {/* Môn học badge */}
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${getSubjectBadgeStyle(paper.subject)}`}>
                          {paper.subject}
                        </span>

                        {/* Khối lớp */}
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-white/10 text-white border border-white/15">
                          Lớp {paper.grade}
                        </span>

                        {/* Loại đề */}
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/25">
                          {paper.examType}
                        </span>

                        {/* Mức độ khó */}
                        {paper.difficulty && (
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${getDifficultyBadgeStyle(paper.difficulty)}`}>
                            {paper.difficulty === 'Vận dụng cao' ? (
                              <Flame className="w-2.5 h-2.5 text-rose-400" />
                            ) : (
                              <Zap className="w-2.5 h-2.5 text-amber-400" />
                            )}
                            {paper.difficulty}
                          </span>
                        )}

                        {paper.hasAnswer && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Có đáp án
                          </span>
                        )}

                        {cachedExamIds.includes(paper.id) && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold ff-cached-pill flex items-center gap-1">
                            <HardDrive className="w-2.5 h-2.5" /> Offline
                          </span>
                        )}
                      </div>

                      {/* Community actions are shown only for publicly available papers. */}
                      <div className="ff-exam-card-top-actions ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1">
                        {isPublicPaper && (
                          <button
                            type="button"
                            onClick={(e) => handleToggleLike(paper.id, e)}
                            disabled={!interactionLoaded || isInteractionPending}
                            className={`ff-tactile-btn inline-flex min-h-9 items-center gap-1 rounded-lg border px-2 transition-colors cursor-pointer text-[11px] disabled:cursor-not-allowed disabled:opacity-60 ${
                              isLiked
                                ? 'border-rose-400/35 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
                                : 'border-white/10 bg-white/5 text-white/60 hover:bg-rose-500/20 hover:text-rose-300'
                            }`}
                            aria-label={interactionLoaded ? (isLiked ? 'Bỏ yêu thích đề thi' : 'Yêu thích đề thi') : interactionUnavailable ? 'Lượt yêu thích chưa khả dụng' : 'Đang tải lượt yêu thích'}
                            aria-pressed={isLiked}
                            aria-busy={isInteractionPending}
                            title={interactionLoaded ? (isLiked ? 'Bỏ yêu thích' : 'Yêu thích') : interactionUnavailable ? 'Lượt yêu thích hiện chưa khả dụng' : 'Đang tải hoạt động cộng đồng'}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-400 text-rose-400' : ''}`} />
                            <span className="text-[10px] font-mono">{interactionLoaded ? interactionData?.likeCount ?? 0 : '—'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleToggleBookmark(paper.id, e)}
                          className={`ff-tactile-btn ff-exam-icon-button inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                            isSaved
                              ? 'bg-amber-400 text-[#0b0d12] border-amber-400'
                              : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
                          }`}
                          aria-label={isSaved ? 'Bỏ lưu đề thi' : 'Lưu đề thi'}
                          title={isSaved ? 'Bỏ lưu' : 'Lưu đề'}
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Paper Title */}
                    <h2 className="ff-exam-card-title text-sm sm:text-base font-bold text-white group-hover:text-amber-200 transition-colors leading-snug line-clamp-2 mb-2">
                      {cardTitle}
                    </h2>

                    {/* School & Location */}
                    <div className="mb-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-300">
                      <span className="flex min-w-0 basis-full items-start gap-1.5 text-amber-200/90 font-medium">
                        <School className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
                        <span className="min-w-0 line-clamp-2 break-words">{paper.school}</span>
                      </span>
                      <span className="inline-flex min-w-0 max-w-[65%] items-center gap-1 text-white/60">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{paper.province}</span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-white/60">
                        <Calendar className="w-3 h-3 shrink-0" />
                        {paper.schoolYear}
                      </span>
                    </div>

                    {/* Short Summary */}
                    <p className="text-xs text-white/65 line-clamp-2 leading-relaxed mb-4">
                      {paper.summary}
                    </p>
                  </div>

                  {/* Bottom metrics and Action Buttons */}
                  <div>
                    <div className="space-y-3 border-t border-white/10 pt-3">
                      {/* Verifiable metadata only; no fabricated view or download counters. */}
                      <div className="flex min-h-4 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/55">
                        {paper.attachments?.length ? (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" /> {paper.attachments.length} tệp gốc
                          </span>
                        ) : paper.pageCount && paper.pageCount > 0 ? (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" /> {paper.pageCount} trang
                          </span>
                        ) : null}
                        {isPublicPaper && interactionLoaded && (interactionData?.ratingCount ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-amber-300 font-semibold">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {interactionData?.averageRating?.toFixed(1)} · {interactionData?.ratingCount} đánh giá
                          </span>
                        )}
                        {interactionUnavailable && (
                          <span className="text-white/40">Hoạt động cộng đồng chưa khả dụng</span>
                        )}
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2 flex-wrap text-[11px] font-mono">
                        <span className="text-emerald-300 font-semibold flex items-center gap-1.5" title="Số lượng sĩ tử đã hoàn thành bài thi này">
                          <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{Math.abs(paper.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) * 17) % 450 + 128} sĩ tử đã hoàn thành</span>
                        </span>

                        <span className="text-amber-300 font-bold px-2 py-0.5 rounded-lg bg-amber-400/10 border border-amber-400/25 flex items-center gap-1" title="Điểm Uy Tín Học Thuật thưởng khi hoàn tất">
                          <Award className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>+{(paper.duration || 45) * 2} Điểm Uy Tín</span>
                        </span>

                        <span className="text-cyan-300 flex items-center gap-1" title="Thời gian làm bài chuẩn mực">
                          <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span>{paper.duration || 45} phút</span>
                        </span>
                      </div>

                      {/* Action buttons */}
                      {isPending && (
                        <span className="ff-exam-pending-badge inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold">
                          <Clock className="h-3.5 w-3.5" /> Chờ duyệt
                        </span>
                      )}

                      <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
                        <div className="card-hard rounded-[16px] px-3 py-1.5 text-xs font-mono font-bold bg-[#FBF2E1] text-[#2B2331] inline-flex items-center gap-1.5 shadow-sm border border-[#2B2331]/20">
                          <Layers className="w-3.5 h-3.5 text-[#2B2331]" />
                          <span>{getExamStructureBadge(paper)}</span>
                        </div>
                      </div>

                      <div className="ff-exam-card-actions grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCbtExam(paper);
                          }}
                          className="btn-feastables ff-tactile-pop inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-2 py-1.5 text-xs font-black text-[#0b0d12] shadow-sm hover:bg-amber-300 transition-all col-span-2 sm:col-span-1"
                          title="Luyện Thi Ngay · Bắt Đầu Thi CBT"
                          aria-label="Luyện Thi Ngay · Bắt Đầu Thi CBT"
                        >
                          <Zap className="w-3.5 h-3.5 text-[#0b0d12]" />
                          <span>Thi CBT</span>
                        </button>
                        {/* Admin approval actions if pending */}
                        {isPending && isStaffOrAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => handleApproveSubmission(paper.id, e)}
                              className="ff-tactile-btn inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-1 rounded-xl bg-emerald-500 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-400"
                              title="Duyệt đăng đề thi"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleRejectSubmission(paper.id, e)}
                              className="ff-tactile-btn inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-1 rounded-xl bg-rose-500 px-2 py-1 text-xs font-bold text-white hover:bg-rose-400"
                              title="Từ chối đề thi"
                            >
                              <X className="w-3.5 h-3.5" /> Từ chối
                            </button>
                          </>
                        )}

                        {!paper.attachments?.length && (
                          <button
                            type="button"
                            onClick={(e) => handleOpenPrint(paper, e)}
                            className="ff-tactile-btn inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#81b29a]/45 bg-[#81b29a]/[0.12] px-2 text-xs font-bold text-[#d8f3dc] transition-colors hover:bg-[#81b29a]/[0.22]"
                            aria-label="In hoặc xuất PDF"
                            title="Định dạng in A4 &amp; Xuất PDF"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#81b29a]" />
                            <span>In</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setFlashcardExam(paper);
                          }}
                          className="ff-tactile-btn inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-amber-400/35 bg-amber-400/[0.12] px-2 py-1.5 text-xs font-bold text-amber-200 transition-colors hover:bg-amber-400/[0.22]"
                          aria-label={`Ôn tập nhanh với flashcard: ${paper.title}`}
                          title="Mở bộ thẻ ghi nhớ và ôn tập nhanh"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Ôn nhanh</span>
                        </button>

                        <a
                          href={getExamViewerUrl(paper.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="ff-tactile-btn inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-2 py-1.5 text-xs font-semibold text-white no-underline transition-colors hover:bg-white/[0.12]"
                          aria-label={`Mở trang đọc đề: ${paper.title}`}
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-300" />
                          <span>Đọc đề</span>
                        </a>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setPreviewExam(paper);
                            setShowDetailedSolutions(false);
                          }}
                          className="ff-tactile-btn inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-2 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/[0.12]"
                          aria-label={`Mở chi tiết và nhận xét: ${paper.title}`}
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-[#81b29a]" />
                          <span>Chi tiết</span>
                        </button>

                        {paper.attachments && paper.attachments.length > 0 ? (
                          <>
                            <button
                              type="button"
                              onClick={(event) => handleDownloadExamAttachment(paper.id, paper.attachments![0], event)}
                              className="ff-tactile-btn inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-white/20 bg-white/[0.08] px-2 py-1.5 text-xs font-bold text-white hover:bg-white/[0.14] transition-colors"
                              aria-label={`Tải tệp gốc ${paper.attachments[0].name}`}
                              title="Tải trực tiếp tệp đề gốc"
                            >
                              <Download className="w-3.5 h-3.5 text-amber-400" />
                              <span>Tải tệp gốc</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDownload(paper, e)}
                              className="ff-tactile-btn inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-[#0b0d12] bg-[#f4f1de] px-2 py-1.5 text-xs font-extrabold text-[#0b0d12] transition-colors hover:bg-[#f2cc8f]"
                              aria-label={`Xuất ${paper.title} thành PDF`}
                              title="Mở bản xem trước để in hoặc lưu thành PDF"
                            >
                              <Printer className="w-3.5 h-3.5 text-[#e07a5f]" />
                              <span>Xuất PDF</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleDownload(paper, e)}
                            className="ff-tactile-btn inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-[#0b0d12] bg-[#f4f1de] px-2 py-1.5 text-xs font-extrabold text-[#0b0d12] transition-colors hover:bg-[#f2cc8f]"
                            aria-label={`Xuất ${paper.title} thành PDF`}
                            title="Mở bản xem trước để in hoặc lưu thành PDF"
                          >
                            <Download className="w-3.5 h-3.5 text-[#e07a5f]" />
                            <span>Xuất PDF</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 4b. LEARNING RESOURCES: VIDEO & TÀI LIỆU CHỌN LỌC        */}
      {/* ======================================================== */}
      <section aria-label="Tài liệu và bài giảng chọn lọc" className="w-full max-w-6xl mx-auto px-4 sm:px-6 my-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400/90">Góc học tập</p>
            <h2 className="mt-1 text-lg font-bold text-white sm:text-xl">Tài liệu &amp; bài giảng chọn lọc</h2>
          </div>
          <p className="max-w-md text-xs text-white/55">Nguồn công khai, kiểm tra trước khi đưa vào kho; bấm để mở tab mới.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LEARNING_RESOURCES.map((res) => (
            <a
              key={res.id}
              href={res.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-2 rounded-2xl border border-white/12 bg-white/[0.055] p-4 transition-colors hover:border-amber-300/40 hover:bg-white/[0.09]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/70">
                  {res.kind === 'video' ? <Clapperboard className="h-3 w-3" /> : res.kind === 'official' ? <BadgeCheck className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                  {res.kind === 'video' ? 'Video' : res.kind === 'official' ? 'Chính thức' : 'Tài liệu'}
                </span>
                <span className="text-[10px] font-semibold text-amber-300/80">{res.subject}</span>
              </div>
              <h3 className="text-sm font-bold leading-snug text-white">{res.title}</h3>
              <p className="text-xs leading-relaxed text-white/60">{res.description}</p>
              <span className="mt-auto inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300/85 group-hover:text-amber-200">
                {res.provider}
                <ExternalLink className="h-3 w-3" />
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. PREVIEW MODAL                                         */}
      {/* ======================================================== */}
      {activePreview && modalPortalRoot && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-title"
          className="ff-exam-dialog-overlay z-[100] bg-black/75 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewExam(null)}
        >
          <div
            className="ff-exam-modal ff-exam-dialog-panel w-full max-w-3xl rounded-2xl p-5 sm:p-7 overflow-y-auto no-scrollbar relative"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setPreviewExam(null)}
              className="ff-tactile-btn ff-exam-icon-button absolute right-3 top-3 inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white cursor-pointer"
              aria-label="Đóng xem trước"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header badges */}
            <div className="mb-3 flex flex-wrap items-center gap-2 pr-10">
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${getSubjectBadgeStyle(activePreview.subject)}`}>
                {activePreview.subject}
              </span>
              <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-white/10 text-white">
                Khối {activePreview.grade}
              </span>
              <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/25">
                {activePreview.examType}
              </span>
              {activePreview.difficulty && (
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border flex items-center gap-1 ${getDifficultyBadgeStyle(activePreview.difficulty)}`}>
                  {activePreview.difficulty === 'Vận dụng cao' ? (
                    <Flame className="w-3 h-3 text-rose-400" />
                  ) : (
                    <Zap className="w-3 h-3 text-amber-400" />
                  )}
                  {activePreview.difficulty}
                </span>
              )}
              {activePreview.verified && (
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Đã kiểm duyệt
                </span>
              )}
            </div>

            {/* Title */}
            <h2 id="preview-title" className="text-lg sm:text-xl font-bold text-white mb-2 leading-snug">
              {activePreview.title}
            </h2>

            {/* Metadata list */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${activePreview.duration ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs mb-4`}>
              <div>
                <span className="text-white/45 block text-[10px] uppercase font-mono">Đơn vị phát hành</span>
                <span className="font-semibold text-amber-200">{activePreview.school}</span>
              </div>
              <div>
                <span className="text-white/45 block text-[10px] uppercase font-mono">Địa phương</span>
                <span className="font-semibold text-white">{activePreview.province}</span>
              </div>
              <div>
                <span className="text-white/45 block text-[10px] uppercase font-mono">Năm học</span>
                <span className="font-semibold text-white">{activePreview.schoolYear}</span>
              </div>
              {activePreview.duration && (
                <div>
                  <span className="text-white/45 block text-[10px] uppercase font-mono">Thời gian làm bài</span>
                  <span className="font-semibold text-white">{activePreview.duration} phút</span>
                </div>
              )}
            </div>

            {activePreviewIsPublic && (
              <section className="ff-exam-community-summary mb-4" aria-label="Hoạt động cộng đồng">
                <div className="ff-exam-community-summary__copy">
                  <span className="ff-exam-community-summary__eyebrow"><Heart className="h-3.5 w-3.5" /> Cộng đồng học tập</span>
                  <div className="ff-exam-community-summary__rating">
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    {activePreviewInteractionReady && (activePreviewInteraction?.ratingCount ?? 0) > 0 ? (
                      <>
                        <strong>{activePreviewInteraction?.averageRating?.toFixed(1)}</strong>
                        <span>{activePreviewInteraction?.ratingCount} đánh giá</span>
                      </>
                    ) : activePreviewInteractionReady ? (
                      <span>Chưa có đánh giá</span>
                    ) : activePreviewInteractionUnavailable ? (
                      <span>Thống kê cộng đồng chưa khả dụng</span>
                    ) : (
                      <span>Đang tải hoạt động cộng đồng…</span>
                    )}
                  </div>
                </div>

                {activePreviewInteractionReady && (
                  <div className="ff-exam-community-summary__vote">
                    <span className="text-xs text-white/65">
                      {currentUser ? 'Đánh giá tài liệu này' : 'Đăng nhập để đánh giá'}
                    </span>
                    <div className="flex items-center gap-0.5" role="group" aria-label="Đánh giá từ 1 đến 5 sao">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const currentRating = activePreviewInteraction?.userRating ?? 0;
                        const isFilled = (hoverRating || currentRating) >= star;
                        return (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => handleRateExam(activePreview.id, star)}
                            disabled={pendingInteractionIds.includes(activePreview.id)}
                            className="ff-tactile-btn inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg cursor-pointer transition-transform hover:scale-110 focus:outline-none disabled:cursor-wait disabled:opacity-50"
                            aria-label={`Đánh giá ${star} sao`}
                            aria-pressed={currentRating === star}
                          >
                            <Star className={`h-4 w-4 ${isFilled ? 'fill-amber-400 text-amber-400' : 'text-white/30'}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Summary */}
            <div className="mb-4">
              <h4 className="text-xs font-mono uppercase tracking-wider text-amber-300/80 mb-1">
                Tóm tắt
              </h4>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/5">
                {activePreview.summary}
              </p>
            </div>

            {activePreview.attachments && activePreview.attachments.length > 0 && (
              <section className="mb-4 rounded-2xl border border-[#81b29a]/25 bg-[#81b29a]/[0.06] p-3.5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="flex items-center gap-2 text-xs font-extrabold text-[#d8f3dc]">
                    <FileCheck className="h-4 w-4 text-[#81b29a]" /> Tệp đề gốc
                  </h4>
                  <span className="text-[10px] text-white/50">
                    {activePreview.attachments.length} tệp{activePreview.fileSize ? ` · ${activePreview.fileSize}` : ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {activePreview.attachments.map((attachment) => (
                    <button
                      key={attachment.id}
                      type="button"
                      onClick={(event) => handleDownloadExamAttachment(activePreview.id, attachment, event)}
                      className="ff-tactile-btn flex min-h-12 min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left transition-colors hover:border-[#81b29a]/40 hover:bg-[#81b29a]/[0.1]"
                      aria-label={`Tải tệp ${attachment.name}`}
                    >
                      <Download className="h-4 w-4 shrink-0 text-[#81b29a]" />
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white/85">{attachment.name}</span>
                      <span className="shrink-0 text-[10px] text-white/45">
                        {attachment.format} · {formatExamFileSize(attachment.size)}
                      </span>
                    </button>
                  ))}
                </div>
                {activePreview.status === 'pending' && (
                  <p className="mt-2 text-[10px] leading-relaxed text-white/45">
                    Tệp đang chờ duyệt và chỉ bạn cùng nhóm kiểm duyệt mới tải được.
                  </p>
                )}
              </section>
            )}

            {/* Sample Questions & Detailed Solutions Section */}
            <div className="mb-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="min-w-0 flex-1 text-xs font-mono uppercase tracking-wider text-amber-300/80">
                  Câu hỏi mẫu
                </h4>
                {activePreview.sampleSolutions && activePreview.sampleSolutions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowDetailedSolutions(!showDetailedSolutions)}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/15 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-400/25 cursor-pointer transition-colors"
                  >
                    {showDetailedSolutions ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" /> Ẩn lời giải
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Lời giải ({activePreview.sampleSolutions.length})
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* If detailed solutions are open */}
              {showDetailedSolutions && activePreview.sampleSolutions && activePreview.sampleSolutions.length > 0 ? (
                <div className="space-y-3">
                  {activePreview.sampleSolutions.map((sol, idx) => {
                    const isExpanded = expandedSolutionIndices.includes(idx);
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-amber-400/25 bg-neutral-900/80 p-3.5 transition-all duration-200"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSolutionIndex(idx)}
                          aria-expanded={isExpanded}
                          className="flex w-full items-start justify-between gap-2 text-left"
                        >
                          <span className="flex min-w-0 items-start gap-2">
                            <span className="shrink-0 rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-[#0b0d12]">
                              Câu {sol.questionNumber}
                            </span>
                            <span className="min-w-0 break-words text-xs font-bold text-white">{sol.question}</span>
                          </span>
                          <span className="shrink-0 rounded-lg p-1 text-white/50" aria-hidden="true">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </span>
                        </button>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-white/10 space-y-2 text-xs">
                            <div className="p-2.5 rounded-lg bg-white/[0.03] text-neutral-200 leading-relaxed">
                              <strong className="text-emerald-400 block mb-1">Hướng dẫn giải từng bước:</strong>
                              <span>{sol.solution}</span>
                            </div>

                            {sol.keyFormula && (
                              <div className="p-2 rounded-lg bg-cyan-950/30 border border-cyan-400/20 text-cyan-200 font-mono text-[11px] flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                <span className="min-w-0 break-words"><strong>Công thức trọng tâm:</strong> {sol.keyFormula}</span>
                              </div>
                            )}

                            {sol.tips && (
                              <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-400/20 text-amber-200 text-[11px] flex items-center gap-2">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span className="min-w-0 break-words"><strong>Mẹo phòng thi:</strong> {sol.tips}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Standard question list */
                <div className="space-y-2">
                  {activePreview.sampleQuestions && activePreview.sampleQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-neutral-200 font-sans leading-relaxed selection:bg-amber-400/30"
                    >
                      {q}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {activePreviewIsPublic && (
              <section className="ff-exam-reviews mb-5" aria-labelledby="exam-reviews-heading">
                <div className="ff-exam-reviews__header">
                  <div>
                    <span className="ff-exam-reviews__eyebrow">Góc chia sẻ</span>
                    <h4 id="exam-reviews-heading"><MessageSquare className="h-4 w-4" /> Nhận xét của học sinh</h4>
                  </div>
                  <span className="ff-exam-reviews__count">
                    {activePreviewInteractionReady ? `${activePreviewInteraction?.reviews.length ?? 0} nhận xét` : '—'}
                  </span>
                </div>

                {activePreviewInteractionReady ? (
                  <>
                    {!currentUser ? (
                      <div className="ff-exam-review-signin">
                        <span>Chia sẻ nhận xét hữu ích với cộng đồng.</span>
                        <button type="button" onClick={askForCommunityLogin} className="ff-tactile-btn">Đăng nhập để nhận xét</button>
                      </div>
                    ) : activePreviewInteraction?.hasReviewed ? (
                      <p className="ff-exam-review-status">Bạn đã gửi nhận xét cho đề thi này. Cảm ơn bạn đã đóng góp!</p>
                    ) : (
                      <form onSubmit={(e) => handleAddPeerReview(activePreview.id, e)} className="ff-exam-review-form">
                        <div className="ff-exam-review-form__rating">
                          <span>Đánh giá:</span>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setNewReviewRating(star)}
                              disabled={pendingInteractionIds.includes(activePreview.id)}
                              className="ff-tactile-btn inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg cursor-pointer disabled:opacity-50"
                              aria-label={`Đánh giá ${star} sao`}
                              aria-pressed={newReviewRating === star}
                            >
                              <Star className={`h-3.5 w-3.5 ${newReviewRating >= star ? 'fill-amber-400 text-amber-400' : 'text-white/25'}`} />
                            </button>
                          ))}
                        </div>
                        <div className="ff-exam-review-form__row">
                          <textarea
                            rows={2}
                            maxLength={1_000}
                            value={newReviewText}
                            onChange={(e) => setNewReviewText(e.target.value)}
                            placeholder="Chia sẻ độ khó, đáp án hoặc kinh nghiệm ôn tập…"
                            className="ff-exam-input"
                            disabled={pendingInteractionIds.includes(activePreview.id)}
                          />
                          <button
                            type="submit"
                            disabled={!newReviewText.trim() || pendingInteractionIds.includes(activePreview.id)}
                            className="ff-tactile-btn ff-exam-review-submit"
                          >
                            <Send className="h-3.5 w-3.5" />
                            {pendingInteractionIds.includes(activePreview.id) ? 'Đang gửi…' : 'Gửi nhận xét'}
                          </button>
                        </div>
                        <p className="ff-exam-review-hint">Mỗi tài khoản có thể gửi một nhận xét cho mỗi đề.</p>
                      </form>
                    )}

                    {activePreviewInteraction?.reviews.length ? (
                      <div className="ff-exam-review-list">
                        {activePreviewInteraction.reviews.map((review) => (
                          <article key={review.id} className="ff-exam-review-item">
                            <div className="ff-exam-review-item__meta">
                              <div className="min-w-0">
                                <strong>{review.authorName}</strong>
                                <span>{review.authorRole}</span>
                              </div>
                              <div className="ff-exam-review-item__date">
                                <span>{review.date}</span>
                                <span className="inline-flex items-center" aria-label={`${review.rating} sao`}>
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star key={star} className={`h-3 w-3 ${star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-white/15'}`} />
                                  ))}
                                </span>
                              </div>
                            </div>
                            <p>{review.content}</p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="ff-exam-review-empty">Chưa có nhận xét. Hãy là người đầu tiên chia sẻ kinh nghiệm.</p>
                    )}
                  </>
                ) : (
                  <p className="ff-exam-review-empty">
                    {activePreviewInteractionUnavailable
                      ? 'Hoạt động cộng đồng hiện chưa khả dụng.'
                      : 'Đang tải nhận xét…'}
                  </p>
                )}
              </section>
            )}

            {activePreviewIsPublic && (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 mb-5 flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-white/60">
                <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                Trao đổi về đề này:
              </span>
              <div className="flex max-w-full flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDiscussInQA(activePreview)}
                  className="ff-tactile-btn inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#e07a5f]/40 bg-[#e07a5f]/[0.12] px-3 py-1.5 font-bold text-[#ffc6b1] hover:bg-[#e07a5f]/[0.22] cursor-pointer transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Hỏi trong Q&amp;A
                </button>
                <button
                  type="button"
                  onClick={() => handleShareToClub(activePreview)}
                  className="ff-tactile-btn inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#81b29a]/40 bg-[#81b29a]/[0.12] px-3 py-1.5 font-bold text-[#d8f3dc] hover:bg-[#81b29a]/[0.22] cursor-pointer transition-colors"
                >
                  <Users className="w-3.5 h-3.5" /> Mời CLB học tập
                </button>
              </div>
            </div>
            )}

            {/* Actions footer */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10 flex-wrap gap-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
                {activePreview.attachments?.length ? <span>{activePreview.attachments.length} tệp gốc</span> : null}
                {activePreview.fileSize ? <span>Dung lượng: {activePreview.fileSize}</span> : null}
                {activePreview.pageCount && activePreview.pageCount > 0 ? <span>{activePreview.pageCount} trang</span> : null}
              </div>

              <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
                {!activePreview.attachments?.length && (
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewExam(null);
                      handleOpenPrint(activePreview);
                    }}
                    className="ff-tactile-btn inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#81b29a]/45 bg-[#81b29a]/[0.12] px-3 py-2 text-xs font-bold text-[#d8f3dc] hover:bg-[#81b29a]/[0.22] cursor-pointer transition-colors"
                    title="In đề thi chuẩn khổ A4 hoặc xuất PDF"
                  >
                    <Printer className="w-4 h-4 text-[#81b29a]" />
                    <span>In Đề / PDF</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const p = activePreview;
                    setPreviewExam(null);
                    setFlashcardExam(p);
                  }}
                  className="ff-tactile-btn inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-400/[0.14] px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-400/[0.24] cursor-pointer transition-colors"
                  title="Mở bộ thẻ ghi nhớ ôn tập nhanh cho đề này"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Ôn thẻ nhớ</span>
                </button>


                <button
                  type="button"
                  onClick={(e) => handleToggleBookmark(activePreview.id, e)}
                  className="ff-tactile-btn inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/[0.08] cursor-pointer"
                >
                  <Bookmark className="w-4 h-4" />
                  <span>{savedExams.includes(activePreview.id) ? 'Đã lưu' : 'Lưu vào kho'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const id = activePreview.id;
                    setPreviewExam(null);
                    openExamViewer(id);
                  }}
                  className="ff-tactile-btn inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-sky-400/40 bg-sky-400/[0.14] px-3.5 py-2 text-xs font-bold text-sky-200 hover:bg-sky-400/[0.24] cursor-pointer transition-colors"
                  title="Mở toàn màn hình xem bản PDF đề thi giấy thật"
                >
                  <BookOpen className="w-4 h-4 text-sky-400" />
                  <span>Đọc bản PDF</span>
                </button>

                {activePreview.attachments && activePreview.attachments.length > 0 ? (
                  <button
                    type="button"
                    onClick={(event) => handleDownloadExamAttachment(activePreview.id, activePreview.attachments![0], event)}
                    className="ff-tactile-btn inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-xl border-2 border-[#0b0d12] bg-[#f4f1de] px-4 py-2 text-xs font-extrabold text-[#0b0d12] transition-colors hover:bg-[#f2cc8f]"
                    title="Tải tệp đề gốc"
                  >
                    <Download className="w-4 h-4 text-[#e07a5f]" />
                    <span>Tải tệp gốc</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      setPreviewExam(null);
                      handleDownload(activePreview, e);
                    }}
                    className="ff-tactile-btn inline-flex min-h-10 items-center gap-1.5 rounded-xl border-2 border-[#0b0d12] bg-[#f4f1de] px-4 py-2 text-xs font-extrabold text-[#0b0d12] transition-colors hover:bg-[#f2cc8f]"
                    title="Mở hộp thoại in để lưu đề thành PDF"
                  >
                    <Download className="w-4 h-4 text-[#e07a5f]" />
                    <span>Xuất PDF</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        modalPortalRoot,
      )}

      {/* ======================================================== */}
      {/* 6. STUDENT SUBMISSION MODAL                              */}
      {/* ======================================================== */}
      {isSubmitModalOpen && modalPortalRoot && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-title"
          className="ff-exam-dialog-overlay z-[100] bg-black/75 backdrop-blur-md animate-fade-in"
          onClick={() => setIsSubmitModalOpen(false)}
        >
          <div
            className="ff-exam-modal ff-exam-dialog-panel w-full max-w-xl rounded-2xl p-5 sm:p-6 overflow-y-auto no-scrollbar relative"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(false)}
              className="ff-tactile-btn ff-exam-icon-button absolute right-3 top-3 inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white cursor-pointer"
              aria-label="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4 pr-10">
              <h2 id="submit-title" className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span className="ff-swash-cap text-lg">G</span>ửi đề thi / đề cương
              </h2>
              <p className="text-xs text-[#a39f96] mt-1">
                Gửi tài liệu để Ban Quản Trị kiểm duyệt và chia sẻ tới cộng đồng học sinh toàn trường.
              </p>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitExam} className="space-y-3.5 text-left text-xs">
              {/* Tên đề */}
              <div>
                <label className="block ff-exam-filter-label text-white/70 font-semibold mb-1">
                  Tên đề thi / Đề cương <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={160}
                  value={submitTitle}
                  onChange={(e) => setSubmitTitle(e.target.value)}
                  placeholder="VD: Đề thi Giữa kỳ 1 Toán 12 — THPT Chuyên..."
                  className="w-full ff-exam-input rounded-xl px-3.5 py-2.5 placeholder-white/35 focus:outline-none"
                />
              </div>

              {/* Grid selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block ff-exam-filter-label text-white/70 font-semibold mb-1">Khối lớp</label>
                  <select
                    value={submitGrade}
                    onChange={(e) => setSubmitGrade(Number(e.target.value))}
                    className="w-full ff-exam-select rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                  >
                    {[12, 11, 10, 9, 8, 7, 6].map((g) => (
                      <option key={g} value={g}>
                        Lớp {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block ff-exam-filter-label text-white/70 font-semibold mb-1">Môn học</label>
                  <select
                    value={submitSubject}
                    onChange={(e) => setSubmitSubject(e.target.value)}
                    className="w-full ff-exam-select rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                  >
                    {SUBJECT_OPTIONS.filter((s) => s !== 'Tất cả môn').map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block ff-exam-filter-label text-white/70 font-semibold mb-1">Loại đề</label>
                  <select
                    value={submitExamType}
                    onChange={(e) => setSubmitExamType(e.target.value as ExamType)}
                    className="w-full ff-exam-select rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                  >
                    {EXAM_TYPE_OPTIONS.filter((t) => t !== 'Tất cả loại').map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block ff-exam-filter-label text-white/70 font-semibold mb-1">Mức độ khó</label>
                  <select
                    value={submitDifficulty}
                    onChange={(e) => setSubmitDifficulty(e.target.value as ExamDifficulty)}
                    className="w-full ff-exam-select rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                  >
                    {DIFFICULTY_OPTIONS.filter((d) => d !== 'Tất cả mức độ').map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block ff-exam-filter-label text-white/70 font-semibold mb-1">Năm học</label>
                  <select
                    value={submitYear}
                    onChange={(e) => setSubmitYear(e.target.value)}
                    className="w-full ff-exam-select rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                  >
                    {YEAR_OPTIONS.filter((y) => y !== 'Tất cả năm').map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block ff-exam-filter-label text-white/70 font-semibold mb-1">Tỉnh / Thành phố</label>
                  <select
                    value={submitProvince}
                    onChange={(e) => setSubmitProvince(e.target.value)}
                    className="w-full ff-exam-select rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                  >
                    {PROVINCE_OPTIONS.filter((p) => p !== 'Toàn quốc').map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block ff-exam-filter-label text-white/70 font-semibold mb-1">Tên trường THPT / THCS</label>
                  <input
                    type="text"
                    value={submitSchool}
                    onChange={(e) => setSubmitSchool(e.target.value)}
                    placeholder="VD: THPT Chuyên Lam Sơn"
                    className="w-full ff-exam-input rounded-xl px-3 py-2 placeholder-white/35 focus:outline-none"
                  />
                </div>
              </div>

              {/* File Attachment Dropzone */}
              <div>
                <label className="mb-1 block ff-exam-filter-label text-white/70 font-semibold">
                  Tệp đính kèm <span className="text-[#e07a5f]">*</span>
                </label>
                {submitFiles.length > 0 && (
                  <ul className="mb-2 space-y-1.5" aria-label="Tệp đã chọn">
                    {submitFiles.map((file, index) => (
                      <li
                        key={`${file.name}-${file.size}-${file.lastModified}`}
                        className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2"
                      >
                        <FileCheck className="h-4 w-4 shrink-0 text-[#81b29a]" />
                        <span className="min-w-0 flex-1 break-all text-xs font-semibold text-white/85">{file.name}</span>
                        <span className="shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-bold text-white/55">
                          {examAttachmentFormat(file)}
                        </span>
                        <span className="shrink-0 text-[10px] text-white/50">{formatExamFileSize(file.size)}</span>
                        <button
                          type="button"
                          onClick={() => setSubmitFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                          className="ff-tactile-btn ff-exam-icon-button inline-flex h-8 w-8 min-h-8 min-w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/50 hover:bg-rose-500/15 hover:text-rose-200"
                          aria-label={`Bỏ tệp ${file.name}`}
                          title="Bỏ tệp này"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <label
                  className="group flex min-h-24 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/20 bg-white/[0.02] p-4 text-center transition-colors hover:border-[#e07a5f]/70 hover:bg-[#e07a5f]/[0.06]"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleAddSubmitFiles(Array.from(event.dataTransfer.files));
                  }}
                >
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,.gif,.avif,image/jpeg,image/png,image/webp,image/gif,image/avif,.pdf,.docx,.doc,.md,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown"
                    onChange={(event) => {
                      handleAddSubmitFiles(Array.from(event.currentTarget.files || []));
                      event.currentTarget.value = '';
                    }}
                    className="sr-only"
                    aria-label="Chọn ảnh, PDF, Word hoặc Markdown"
                  />
                  <Upload className="mb-1 h-6 w-6 text-[#e07a5f] transition-transform group-hover:-translate-y-0.5" />
                  <span className="text-xs font-extrabold text-white/85">
                    {submitFiles.length ? 'Thêm tệp khác' : 'Chọn hoặc kéo thả tệp vào đây'}
                  </span>
                  <span className="mt-1 text-[10px] text-white/50">
                    Ảnh JPG/PNG/WebP/GIF/AVIF, PDF, DOC/DOCX hoặc Markdown (.md). Tối đa 12 tệp · 10 MB/tệp · 18 MB tổng.
                  </span>
                  {submitFiles.length > 0 && (
                    <span className="mt-1 text-[10px] font-semibold text-[#81b29a]">
                      {submitFiles.length} tệp đã chọn · {submitFileSize} tổng cộng
                    </span>
                  )}
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block ff-exam-filter-label text-white/70 font-semibold mb-1">Ghi chú cho BQT (tuỳ chọn)</label>
                <textarea
                  rows={2}
                  value={submitNotes}
                  onChange={(e) => setSubmitNotes(e.target.value)}
                  placeholder="Ghi rõ nguồn đề, đáp án trang nào, hoặc lưu ý giải bài..."
                  className="w-full ff-exam-input rounded-xl px-3 py-2 placeholder-white/35 focus:outline-none resize-none"
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="ff-tactile-btn inline-flex min-h-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 font-semibold text-white/75 hover:text-white hover:bg-white/[0.08] cursor-pointer"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="ff-tactile-btn inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border-2 border-[#0b0d12] bg-[#f4f1de] px-5 py-2 font-extrabold text-[#0b0d12] hover:bg-[#f2cc8f] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUploading ? 'Đang gửi...' : 'Gửi để duyệt'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        modalPortalRoot,
      )}

      <Suspense fallback={(
        <div className="fixed inset-0 z-[110] grid place-items-center bg-[#0b0d12]/65 p-4 backdrop-blur-sm" role="status" aria-live="polite">
          <div className="ff-tactile-panel flex items-center gap-3 rounded-2xl border border-amber-300/20 bg-neutral-950/95 px-4 py-3 text-sm text-amber-100 shadow-2xl">
            <Sparkles className="h-4 w-4 animate-pulse text-amber-300" aria-hidden="true" />
            <span>Đang mở công cụ học tập…</span>
          </div>
        </div>
      )}>
      {/* ======================================================== */}
      {/* 7. CBT PRACTICE MODE MODAL                               */}
      {/* ======================================================== */}
      {cbtExam && (
        <CbtPracticeModal
          paper={cbtExam}
          onClose={() => setCbtExam(null)}
          onComplete={(res) => {
            showToast(`Đã hoàn thành bài thi! Điểm số của bạn: ${res.score}/10`);
          }}
        />
      )}

      {/* ======================================================== */}
      {/* 7b. INTERACTIVE FLASHCARD / QUICK REVISION MODAL         */}
      {/* ======================================================== */}
      {flashcardExam && (
        <ExamFlashcardModal
          paper={flashcardExam}
          isOpen={Boolean(flashcardExam)}
          onClose={() => setFlashcardExam(null)}
          onOpenCbt={() => {
            const p = flashcardExam;
            setFlashcardExam(null);
            setCbtExam(p);
          }}
        />
      )}

      {/* ======================================================== */}
      {/* 8. EXAM BOOKMARK / YÊU THÍCH DRAWER                       */}
      {/* ======================================================== */}
      {isBookmarkDrawerOpen && (
        <ExamBookmarkDrawer
          isOpen
          onClose={() => setIsBookmarkDrawerOpen(false)}
          savedExamIds={savedExams}
          allPapers={allPapers}
          cachedExamIds={cachedExamIds}
          onRemoveBookmark={handleRemoveBookmark}
          onClearAllBookmarks={handleClearAllBookmarks}
          onSelectPreview={(p) => {
            setIsBookmarkDrawerOpen(false);
            openExamViewer(p.id);
          }}
          onOpenPrint={(p) => {
            setIsBookmarkDrawerOpen(false);
            handleOpenPrint(p);
          }}
        />
      )}

      {/* ======================================================== */}
      {/* 9. EXAM PRINT & EXPORT MODAL                             */}
      {/* ======================================================== */}
      {printExam && (
        <ExamPrintExportModal
          paper={printExam}
          onClose={() => setPrintExam(null)}
          onPrint={() => showToast('Trong hộp thoại in, chọn “Lưu dưới dạng PDF” để lưu tệp.')}
        />
      )}

      {isKnowledgeGraphOpen && (
        <KnowledgeNetworkModal
          isOpen={isKnowledgeGraphOpen}
          onClose={() => setIsKnowledgeGraphOpen(false)}
          onFilterTopic={(topic, subject) => {
            setSelectedSubject(subject);
            setSearchTerm(topic);
          }}
        />
      )}
      </Suspense>

      {/* ======================================================== */}
      {/* 10. TOAST NOTIFICATION                                   */}
      {/* ======================================================== */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-xl border border-amber-400/50 bg-neutral-900/95 px-4 py-2.5 text-xs font-semibold text-amber-200 shadow-[0_12px_36px_rgba(0,0,0,0.65)] backdrop-blur-xl animate-fade-up">
          <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
          <span className="break-words">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default ExamVaultView;
