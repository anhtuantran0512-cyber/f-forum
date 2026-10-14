/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  Flame,
  CheckCircle2,
  ArrowRight,
  X,
  Send,
  Lightbulb,
  Target,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { safeStorage } from '../../utils/storage';

export type ExamTierFilter = 'all' | '15p' | 'khaosat' | 'gk1' | 'ck1' | 'gk2' | 'ck2';
export type ExamGradeFilter = 'all' | '10' | '11' | '12';
export type ExamSubjectFilter = 'all' | 'Toán' | 'Lý' | 'Hóa' | 'Anh' | 'Tin';

export interface ExamQuestionItem {
  id: string;
  number: number;
  prompt: string;
  formulaBox?: string;
  options: string[];
  hintStep1: string;
  finalAnswer: string;
  stuckCount: number;
  teacherVerified?: boolean;
}

export interface ExamDiscussionReply {
  id: string;
  questionId: string;
  anonCode: string;
  gradeLabel: string;
  content: string;
  createdAt: string;
  isTeacherVerified?: boolean;
}

export interface ExamPaperItem {
  id: string;
  code: string;
  tier: Exclude<ExamTierFilter, 'all'>;
  tierLabel: string;
  grade: '10' | '11' | '12';
  subject: Exclude<ExamSubjectFilter, 'all'>;
  title: string;
  questionCount: number;
  durationMinutes: number;
  summaryNote: string;
  verifiedLabel: string;
  isOfficialHolo: boolean;
  hasDetailedSolution: boolean;
  discussingCount: number;
  hotspotLabel: string;
  featuredSpan?: boolean;
  questions: ExamQuestionItem[];
}

const INITIAL_EXAM_PAPERS: ExamPaperItem[] = [
  {
    id: 'exam-toan12-ck1-104',
    code: '#TOAN12-CK1-104',
    tier: 'ck1',
    tierLabel: 'Cuối HK1',
    grade: '12',
    subject: 'Toán',
    title: 'ĐỀ CHÍNH THỨC CUỐI KỲ 1 TOÁN 12 (2025-2026)',
    questionCount: 50,
    durationMinutes: 90,
    summaryNote: '50 câu · 90 phút · Đủ lời giải chi tiết',
    verifiedLabel: '✓ Thầy/Cô đã xác nhận cách giải',
    isOfficialHolo: true,
    hasDetailedSolution: true,
    discussingCount: 14,
    hotspotLabel: '🔥 14 câu đang bàn luận',
    featuredSpan: true,
    questions: [
      {
        id: 'q-104-14',
        number: 14,
        prompt: 'Cho hàm số y = f(x) liên tục trên ℝ có đạo hàm f\'(x) = (x - 1)(x² - 4)(x - 3). Số điểm cực tiểu của hàm số g(x) = f(|x| - 2) là bao nhiêu?',
        formulaBox: 'g\'(x) = (x / |x|) · f\'(|x| - 2) = 0 ⇔ x = 0 hoặc |x| - 2 ∈ {-2, 1, 2, 3}',
        options: ['A. 3 điểm cực tiểu', 'B. 4 điểm cực tiểu', 'C. 5 điểm cực tiểu', 'D. 2 điểm cực tiểu'],
        hintStep1: 'Đặt t = |x| - 2 (t ≥ -2). Xét dấu f\'(t) tại các nghiệm đơn t = -2, t = 1, t = 2, t = 3 trước khi suy ra trục xét dấu của g(x).',
        finalAnswer: 'Đáp án B (4 điểm cực tiểu). Vì hàm chẵn g(x) nhận x = 0 là cực đại, đổi dấu từ âm sang dương tại 4 nghiệm đối xứng ±3 và ±5.',
        stuckCount: 24,
        teacherVerified: true,
      },
      {
        id: 'q-104-39',
        number: 39,
        prompt: 'Trong không gian Oxyz, cho mặt cầu (S): (x - 1)² + (y + 2)² + (z - 3)² = 16 và điểm A(3; 0; 5). Mặt phẳng (P) đi qua A cắt (S) theo giao tuyến là đường tròn có bán kính nhỏ nhất. Bán kính r_min bằng:',
        formulaBox: 'r_min = √(R² - IA²) với I(1; -2; 3), R = 4, IA = √(2² + 2² + 2²) = √12',
        options: ['A. r = 2', 'B. r = √6', 'C. r = 2√3', 'D. r = √2'],
        hintStep1: 'Kiểm tra vị trí điểm A so với mặt cầu: IA = √12 < R = 4 nên A nằm trong mặt cầu (S). Bán kính đường tròn giao tuyến nhỏ nhất khi IH = IA.',
        finalAnswer: 'Đáp án A (r = 2). Ta có r_min = √(R² - IA²) = √(16 - 12) = 2.',
        stuckCount: 19,
        teacherVerified: true,
      },
      {
        id: 'q-104-46',
        number: 46,
        prompt: 'Tìm tất cả giá trị thực của tham số m để phương trình log₂²(x) - 2(m + 1)log₂(x) + 2m + 1 = 0 có hai nghiệm phân biệt x₁, x₂ thỏa mãn x₁ + 2x₂ = 6.',
        formulaBox: 't = log₂(x) ⇒ (t - 1)(t - 2m - 1) = 0 ⇔ t = 1 hoặc t = 2m + 1',
        options: ['A. m = 0', 'B. m = 1/2', 'C. m = 0 hoặc m = log₂(5) - 1', 'D. m = 1'],
        hintStep1: 'Phương trình theo t = log₂(x) có Δ\' = m² nên luôn tách nhân tử được thành t₁ = 1 (tức x = 2) và t₂ = 2m + 1 (tức x = 2^(2m+1)).',
        finalAnswer: 'Đáp án A (m = 0). Xét 2 trường hợp (x₁ = 2, x₂ = 2) loại vì trùng nghiệm; (x₂ = 2 ⇒ x₁ = 2) loại; với x₁ = 4, x₂ = 1 ⇒ 2m + 1 = 0 ⇔ m = -1/2 hoặc kiểm tra điều kiện phân biệt.',
        stuckCount: 31,
        teacherVerified: true,
      },
    ],
  },
  {
    id: 'exam-ly11-15p-02',
    code: '#LY11-15P-02',
    tier: '15p',
    tierLabel: '15 Phút',
    grade: '11',
    subject: 'Lý',
    title: 'Đề 15p Dao động điều hòa & Vòng tròn lượng giác',
    questionCount: 10,
    durationMinutes: 15,
    summaryNote: '10 câu · Mẹo bấm Casio',
    verifiedLabel: '✓ Tổ Lý',
    isOfficialHolo: false,
    hasDetailedSolution: true,
    discussingCount: 9,
    hotspotLabel: '🙋 28 bạn bí câu 9',
    questions: [
      {
        id: 'q-ly11-9',
        number: 9,
        prompt: 'Một chất điểm dao động điều hòa với chu kỳ T = 1,2s và biên độ A = 8cm. Khoảng thời gian ngắn nhất để tốc độ của vật không vượt quá 8π√3 (cm/s) trong một nửa chu kỳ là:',
        formulaBox: 'v_max = ωA = (2π / 1,2) · 8 = (40π / 3) cm/s; |v| ≤ v_max · (√3 / 2)',
        options: ['A. 0,4s', 'B. 0,2s', 'C. 0,8s', 'D. 0,3s'],
        hintStep1: 'Trên đường tròn lượng giác, tốc độ |v| ≤ v_max·√3/2 ứng với góc quét gần hai biên tổng cộng Δφ = 2 · (2π/3) trong 1 chu kỳ.',
        finalAnswer: 'Đáp án A (0,4s). Trong nửa chu kỳ T/2 = 0,6s, góc quét thỏa mãn là 2π/3 ứng với Δt = T/3 = 0,4s.',
        stuckCount: 28,
        teacherVerified: true,
      },
    ],
  },
  {
    id: 'exam-hoa12-gk1-05',
    code: '#HOA12-GK1-05',
    tier: 'gk1',
    tierLabel: 'Giữa HK1',
    grade: '12',
    subject: 'Hóa',
    title: 'Đề Giữa HK1 Hóa 12 — Este, Lipit & Carbohydrate vận dụng cao',
    questionCount: 40,
    durationMinutes: 50,
    summaryNote: '40 câu · 50 phút · Bảo toàn khối lượng & Quy đổi',
    verifiedLabel: '✓ Thầy/Cô đã xác nhận cách giải',
    isOfficialHolo: true,
    hasDetailedSolution: true,
    discussingCount: 18,
    hotspotLabel: '🔥 18 câu đang bàn luận',
    questions: [
      {
        id: 'q-hoa12-38',
        number: 38,
        prompt: 'Thủy phân hoàn toàn m gam hỗn hợp E gồm 3 este mạch hở bằng dung dịch NaOH vừa đủ, thu được 25,8g hỗn hợp muối của hai axit cacboxylic kế tiếp và 15,2g một ancol hai chức. Giá trị của m là:',
        formulaBox: 'n_NaOH = 2 · n_ancol = 2 · (15,2 / 76) = 0,4 mol ⇒ m_E + 0,4·40 = 25,8 + 15,2',
        options: ['A. 25,0 gam', 'B. 26,4 gam', 'C. 24,8 gam', 'D. 27,2 gam'],
        hintStep1: 'Ancol hai chức tạo este với axit đơn chức nên M_ancol = 76 (C₃H₆(OH)₂), số mol nhóm -COO- bằng 2 lần số mol ancol.',
        finalAnswer: 'Đáp án A (25,0 gam). Bảo toàn khối lượng: m_E = 25,8 + 15,2 - 0,4 × 40 = 25,0 gam.',
        stuckCount: 18,
        teacherVerified: true,
      },
    ],
  },
  {
    id: 'exam-anh12-ks-09',
    code: '#ANH12-KS-09',
    tier: 'khaosat',
    tierLabel: 'Khảo Sát',
    grade: '12',
    subject: 'Anh',
    title: 'Đề Khảo Sát Chất Lượng Tiếng Anh 12 — Bẫy Collocations & Đọc Hiểu',
    questionCount: 50,
    durationMinutes: 60,
    summaryNote: '50 câu · 60 phút · Giải thích ngữ cảnh từng đáp án',
    verifiedLabel: '✓ Tổ Ngoại Ngữ',
    isOfficialHolo: false,
    hasDetailedSolution: true,
    discussingCount: 11,
    hotspotLabel: '🙋 19 bạn bí câu 34',
    questions: [
      {
        id: 'q-anh12-34',
        number: 34,
        prompt: 'Had it not been for the teacher\'s timely hint, none of the students ______ the last geometry problem before the bell rang.',
        formulaBox: 'Đảo ngữ điều kiện loại 3: Had + S + (not) + V3/ed, S + would/could + have + V3/ed',
        options: ['A. would solve', 'B. could have solved', 'C. had solved', 'D. will have solved'],
        hintStep1: 'Cấu trúc "Had it not been for + N" tương đương "If it hadn\'t been for + N" (Điều kiện loại 3 trái với quá khứ).',
        finalAnswer: 'Đáp án B (could have solved). Mệnh đề chính của câu điều kiện loại 3 dùng could/would have + V3/ed.',
        stuckCount: 19,
        teacherVerified: true,
      },
    ],
  },
  {
    id: 'exam-tin11-ck2-03',
    code: '#TIN11-CK2-03',
    tier: 'ck2',
    tierLabel: 'Cuối HK2',
    grade: '11',
    subject: 'Tin',
    title: 'Đề Cuối Kỳ 2 Tin Học 11 — Quy hoạch động, Đồ thị & Độ phức tạp O(n log n)',
    questionCount: 28,
    durationMinutes: 45,
    summaryNote: '28 câu trắc nghiệm + 2 bài code Python/C++',
    verifiedLabel: '✓ Thầy/Cô đã xác nhận cách giải',
    isOfficialHolo: true,
    hasDetailedSolution: true,
    discussingCount: 16,
    hotspotLabel: '🔥 16 câu đang bàn luận',
    questions: [
      {
        id: 'q-tin11-28',
        number: 28,
        prompt: 'Cho mảng A gồm n số nguyên dương (n ≤ 10⁵). Thuật toán tìm dãy con tăng dài nhất (LIS) sử dụng tìm kiếm nhị phân (binary search) trên mảng phụ có độ phức tạp thời gian là:',
        formulaBox: 'dp[k] = phần tử kết thúc nhỏ nhất của dãy con tăng độ dài k ⇒ cập nhật bằng lower_bound trong O(log n)',
        options: ['A. O(n²)', 'B. O(n log n)', 'C. O(n)', 'D. O(2ⁿ)'],
        hintStep1: 'Mỗi phần tử trong n phần tử chỉ thực hiện 1 phép tìm kiếm nhị phân trên mảng độ dài tối đa n.',
        finalAnswer: 'Đáp án B (O(n log n)). Duyệt n phần tử × O(log n) binary search = O(n log n).',
        stuckCount: 15,
        teacherVerified: true,
      },
    ],
  },
  {
    id: 'exam-toan10-gk2-07',
    code: '#TOAN10-GK2-07',
    tier: 'gk2',
    tierLabel: 'Giữa HK2',
    grade: '10',
    subject: 'Toán',
    title: 'Đề Giữa HK2 Toán 10 — Tam thức bậc hai & Phương pháp tọa độ trong mặt phẳng',
    questionCount: 35,
    durationMinutes: 60,
    summaryNote: '35 câu · 60 phút · Kèm hình vẽ Oxy trực quan',
    verifiedLabel: '✓ Tổ Toán',
    isOfficialHolo: false,
    hasDetailedSolution: true,
    discussingCount: 12,
    hotspotLabel: '🙋 12 bạn bí câu 22',
    questions: [
      {
        id: 'q-toan10-22',
        number: 22,
        prompt: 'Trong mặt phẳng Oxy, cho tam giác ABC có A(1; 4), đường cao BH: x - 2y + 3 = 0 và đường trung tuyến CM: 2x + y - 5 = 0. Tìm tọa độ đỉnh B.',
        formulaBox: 'B ∈ BH ⇒ B(2b - 3; b); M là trung điểm AB ⇒ M((2b - 2)/2; (b + 4)/2) ∈ CM',
        options: ['A. B(1; 2)', 'B. B(3; 3)', 'C. B(-1; 1)', 'D. B(5; 4)'],
        hintStep1: 'Tham số hóa tọa độ B theo phương trình đường cao BH, từ đó biểu diễn trung điểm M của AB rồi thế vào phương trình trung tuyến CM.',
        finalAnswer: 'Đáp án A (B(1; 2)). Từ M(b - 1; (b + 4)/2) ∈ CM ⇒ 2(b - 1) + (b + 4)/2 - 5 = 0 ⇔ b = 2 ⇒ B(1; 2).',
        stuckCount: 12,
        teacherVerified: true,
      },
    ],
  },
];

const INITIAL_EXAM_REPLIES: ExamDiscussionReply[] = [
  {
    id: 'er-1',
    questionId: 'q-104-14',
    anonCode: '#ANON-402',
    gradeLabel: 'Khối 12',
    content: 'Câu 14 này nhớ gạch bỏ nghiệm kép x = -2 của f\'(x) = (x - 1)(x - 2)(x + 2)(x - 3) hay giữ nguyên vậy mọi người? Mình vẽ trục số hay bị nhầm chỗ trị tuyệt đối.',
    createdAt: '6 phút trước',
  },
  {
    id: 'er-2',
    questionId: 'q-104-14',
    anonCode: '#GV-TOAN-01',
    gradeLabel: 'Tổ Toán',
    content: 'f\'(t) = (t - 1)(t - 2)(t + 2)(t - 3) có 4 nghiệm ĐƠN phân biệt t ∈ {-2, 1, 2, 3}. Khi giải |x| - 2 = -2 thì x = 0 là nghiệm đơn của đổi dấu đạo hàm nên giữ nguyên nhé!',
    createdAt: '3 phút trước',
    isTeacherVerified: true,
  },
  {
    id: 'er-3',
    questionId: 'q-ly11-9',
    anonCode: '#ANON-712',
    gradeLabel: 'Khối 11',
    content: 'Câu 9 đề 15p Lý nhớ nhìn kỹ đề hỏi "tốc độ không vượt quá" tức là |v| ≤ v_max√3/2 (vùng gần 2 biên), đừng lấy nhầm vùng gần VTCB nha!',
    createdAt: '11 phút trước',
    isTeacherVerified: true,
  },
];

const EXAM_REPLIES_STORAGE_KEY = 'fforum_exam_vault_replies_v1';
const EXAM_STUCK_STORAGE_KEY = 'fforum_exam_vault_stuck_v1';

export interface ExamVaultSectionProps {
  onAskQuestionFromExam?: (prefill: { title: string; content: string; subject: string }) => void;
}

export const ExamVaultSection: React.FC<ExamVaultSectionProps> = ({
  onAskQuestionFromExam,
}) => {
  const [tierFilter, setTierFilter] = useState<ExamTierFilter>('all');
  const [gradeFilter, setGradeFilter] = useState<ExamGradeFilter>('all');
  const [subjectFilter, setSubjectFilter] = useState<ExamSubjectFilter>('all');
  const [onlyWithSolution, setOnlyWithSolution] = useState<boolean>(true);

  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [replyDraft, setReplyDraft] = useState('');

  const [stuckVotes, setStuckVotes] = useState<Record<string, number>>(() => {
    try {
      const raw = safeStorage.getItem(EXAM_STUCK_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [replies, setReplies] = useState<ExamDiscussionReply[]>(() => {
    try {
      const raw = safeStorage.getItem(EXAM_REPLIES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      /* fallback */
    }
    return INITIAL_EXAM_REPLIES;
  });

  const filteredExams = useMemo(() => {
    return INITIAL_EXAM_PAPERS.filter((exam) => {
      if (tierFilter !== 'all' && exam.tier !== tierFilter) return false;
      if (gradeFilter !== 'all' && exam.grade !== gradeFilter) return false;
      if (subjectFilter !== 'all' && exam.subject !== subjectFilter) return false;
      if (onlyWithSolution && !exam.hasDetailedSolution) return false;
      return true;
    });
  }, [tierFilter, gradeFilter, subjectFilter, onlyWithSolution]);

  const activeExam = useMemo(
    () => INITIAL_EXAM_PAPERS.find((e) => e.id === activeExamId) || null,
    [activeExamId],
  );

  const selectedQuestion = useMemo(() => {
    if (!activeExam) return null;
    return (
      activeExam.questions.find((q) => q.id === activeQuestionId) ||
      activeExam.questions[0] ||
      null
    );
  }, [activeExam, activeQuestionId]);

  const questionReplies = useMemo(() => {
    if (!selectedQuestion) return [];
    return replies.filter((r) => r.questionId === selectedQuestion.id);
  }, [replies, selectedQuestion]);

  const handleOpenExam = (exam: ExamPaperItem) => {
    setActiveExamId(exam.id);
    setActiveQuestionId(exam.questions[0]?.id || null);
  };

  const handleBumpStuck = (questionId: string) => {
    setStuckVotes((prev) => {
      const next = { ...prev, [questionId]: (prev[questionId] || 0) + 1 };
      try {
        safeStorage.setItem(EXAM_STUCK_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleSendAnonymousReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestion || !replyDraft.trim()) return;
    const anonNum = 100 + Math.floor((Date.now() / 1000) % 899);
    const newReply: ExamDiscussionReply = {
      id: `er-${Date.now()}`,
      questionId: selectedQuestion.id,
      anonCode: `#ANON-${anonNum}`,
      gradeLabel: activeExam ? `Khối ${activeExam.grade}` : 'Khối 12',
      content: replyDraft.trim(),
      createdAt: 'Vừa xong',
    };
    const next = [newReply, ...replies];
    setReplies(next);
    setReplyDraft('');
    try {
      safeStorage.setItem(EXAM_REPLIES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <section
      aria-label="Kho Đề Thi Nội Bộ Đã Kiểm Duyệt"
      className="rounded-xl bg-[#11161f] border border-[#1e293b] p-4 sm:p-6 space-y-5 shadow-[0_8px_28px_rgba(0,0,0,0.45)]"
    >
      {/* 1. TYPOGRAPHY-LED HEADER (#1) + ORGANIC HAND-DRAWN UNDERLINE (#10) */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-dashed border-[#334155]">
        <div className="space-y-2 min-w-0">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#171e2b] border border-[#334155] text-[11px] font-mono text-[#38bdf8]">
            <span className="w-2 h-2 rounded-full bg-[#10b981]" />
            <span>KHO ĐỀ THI NỘI BỘ · ĐÃ KIỂM DUYỆT</span>
          </div>
          <h2 className="ff-2027-display-title !text-2xl sm:!text-3xl lg:!text-4xl tracking-tight text-[#f1f5f9]">
            Kho đề nội bộ &amp;{' '}
            <span className="relative inline-block text-[#ff6b2b]">
              Cấp cứu bài tập trước giờ G
              <svg
                className="w-full h-2.5 -mt-1 text-[#e07a5f]"
                viewBox="0 0 240 12"
                fill="none"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M2 8.5C48 2.5 96 10.5 144 5.5C182 2 214 8.5 238 4.5"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-[#94a3b8]">
            Đề thật của trường qua các năm. Bí câu nào hỏi ẩn danh ngay câu đó.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 font-mono text-xs tabular-nums">
          <span className="px-3 py-1.5 rounded-lg bg-[#171e2b] border border-[#334155] text-[#f1f5f9]">
            <b className="text-[#10b981]">{INITIAL_EXAM_PAPERS.length}</b> đề chuẩn
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-[#171e2b] border border-[#334155] text-[#f1f5f9]">
            <b className="text-[#f59e0b]">100%</b> có lời giải
          </span>
        </div>
      </div>

      {/* 2. BỘ LỌC ĐA TẦNG — RAW GRID EXPOSED (#7) */}
      <div className="rounded-xl bg-[#090c10] border border-dashed border-[#334155] p-3.5 space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#94a3b8] shrink-0 mr-1">
            Cấp đề:
          </span>
          {(
            [
              { id: 'all', label: 'Tất cả' },
              { id: '15p', label: '15 Phút' },
              { id: 'khaosat', label: 'Khảo Sát' },
              { id: 'gk1', label: 'Giữa HK1' },
              { id: 'ck1', label: 'Cuối HK1' },
              { id: 'gk2', label: 'Giữa HK2' },
              { id: 'ck2', label: 'Cuối HK2' },
            ] as const
          ).map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => setTierFilter(tier.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap cursor-pointer transition ${
                tierFilter === tier.id
                  ? 'bg-[#ff6b2b] text-white shadow-[2px_2px_0px_#f1f5f9]'
                  : 'bg-[#171e2b] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#1e293b]'
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-dashed border-[#334155]">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-mono text-[#94a3b8] shrink-0">Khối:</span>
            {(['all', '10', '11', '12'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGradeFilter(g)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold cursor-pointer ${
                  gradeFilter === g
                    ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/60'
                    : 'bg-[#171e2b] text-[#94a3b8] hover:text-[#f1f5f9]'
                }`}
              >
                {g === 'all' ? 'Tất cả' : `Khối ${g}`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-mono text-[#94a3b8] shrink-0">Môn:</span>
            {(['all', 'Toán', 'Lý', 'Hóa', 'Anh', 'Tin'] as const).map((subj) => (
              <button
                key={subj}
                type="button"
                onClick={() => setSubjectFilter(subj)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold cursor-pointer ${
                  subjectFilter === subj
                    ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/60'
                    : 'bg-[#171e2b] text-[#94a3b8] hover:text-[#f1f5f9]'
                }`}
              >
                {subj === 'all' ? 'Tất cả' : subj}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setOnlyWithSolution((v) => !v)}
            className={`px-3 py-1 rounded-md text-xs font-mono font-bold cursor-pointer border transition ${
              onlyWithSolution
                ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/50'
                : 'bg-[#171e2b] text-[#94a3b8] border-[#334155]'
            }`}
          >
            ✓ Có giải
          </button>
        </div>
      </div>

      {/* 3. BENTO GRID DANH SÁCH ĐỀ THI (#2 Bento + #7 Raw Code + #9 Holographic) */}
      {filteredExams.length === 0 ? (
        <div className="rounded-xl bg-[#090c10] border border-dashed border-[#334155] p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-[#f1f5f9]">
            Chưa có ai hỏi câu này cả. Mở bát hỏi trước đi, mọi người vào cứu liền!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ff-2027-bento-dense">
          {filteredExams.map((exam) => (
            <article
              key={exam.id}
              className={`min-w-0 overflow-hidden rounded-xl bg-[#171e2b] border border-[#1e293b] hover:border-[#38bdf8]/55 p-4 flex flex-col justify-between gap-3.5 transition ${
                exam.featuredSpan ? 'md:col-span-2 lg:col-span-2' : ''
              }`}
            >
              <div className="space-y-2.5 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="ff-2027-raw-code">{exam.code}</span>
                  {exam.isOfficialHolo ? (
                    <span className="ff-2027-holo-pill">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{exam.verifiedLabel}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#10b981]/15 border border-[#10b981]/40 text-[#10b981] text-[11px] font-mono font-bold">
                      {exam.verifiedLabel}
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-extrabold text-[#f1f5f9] line-clamp-2 leading-snug">
                  {exam.title}
                </h3>

                <div className="flex items-center gap-2 flex-wrap text-xs text-[#94a3b8] font-mono tabular-nums">
                  <span className="px-2 py-0.5 rounded bg-[#090c10] border border-[#1e293b] text-[#38bdf8]">
                    {exam.tierLabel} · Khối {exam.grade}
                  </span>
                  <span>{exam.summaryNote}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-dashed border-[#334155] flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-[#f59e0b] tabular-nums">
                  {exam.hotspotLabel}
                </span>

                <button
                  type="button"
                  onClick={() => handleOpenExam(exam)}
                  className="ff-2027-squishy-cta px-3.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Mở đề &amp; Giải</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* 4. MODAL / SPLIT-VIEW XEM ĐỀ & HỎI ĐÁP TỪNG CÂU (2 CỘT — #4 Glassmorphism + #3 Neo-Brutalist + #8 Squishy) */}
      {activeExam &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={activeExam.title}
            className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md"
          >
            <div className="w-full max-w-6xl max-h-[92vh] rounded-2xl bg-[#11161f] border border-[#334155] shadow-2xl flex flex-col overflow-hidden">
              {/* Top Modal Header */}
              <div className="px-4 sm:px-6 py-3.5 bg-[#090c10] border-b border-[#1e293b] flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                  <span className="ff-2027-raw-code">{activeExam.code}</span>
                  <h3 className="text-sm sm:text-base font-extrabold text-[#f1f5f9] truncate">
                    {activeExam.title}
                  </h3>
                  <span className="ff-2027-holo-pill">{activeExam.verifiedLabel}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveExamId(null)}
                  className="p-2 rounded-lg bg-[#171e2b] hover:bg-[#1e293b] text-[#94a3b8] hover:text-white cursor-pointer"
                  aria-label="Đóng đề thi"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 2-Column Split View Body */}
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#1e293b] overflow-y-auto lg:overflow-hidden">
                {/* CỘT TRÁI (7 CỘT): NỘI DUNG TỪNG CÂU TRONG ĐỀ */}
                <div className="lg:col-span-7 p-4 sm:p-5 space-y-4 lg:overflow-y-auto">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-mono uppercase tracking-wider text-[#94a3b8]">
                      Danh sách câu hỏi tiêu điểm ({activeExam.questions.length} câu trích lọc)
                    </span>
                    <div className="flex items-center gap-1.5">
                      {activeExam.questions.map((q) => (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setActiveQuestionId(q.id)}
                          className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold cursor-pointer tabular-nums ${
                            selectedQuestion?.id === q.id
                              ? 'bg-[#ff6b2b] text-white'
                              : 'bg-[#171e2b] text-[#94a3b8] hover:text-white'
                          }`}
                        >
                          Câu {q.number}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedQuestion && (
                    <div className="rounded-xl bg-[#171e2b] border-2 border-[#f1f5f9] shadow-[4px_4px_0px_#ff6b2b] p-4 sm:p-5 space-y-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-md bg-[#090c10] border border-[#334155] font-mono text-xs font-extrabold text-[#38bdf8]">
                          Câu {selectedQuestion.number} · {activeExam.code}
                        </span>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleBumpStuck(selectedQuestion.id)}
                            className="ff-2027-squishy-cta px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5 cursor-pointer tabular-nums"
                          >
                            <Flame className="w-3.5 h-3.5" />
                            <span>
                              🔥 Em cũng bí câu này (
                              {selectedQuestion.stuckCount + (stuckVotes[selectedQuestion.id] || 0)})
                            </span>
                          </button>

                          {onAskQuestionFromExam && (
                            <button
                              type="button"
                              onClick={() => {
                                const qTitle = `[${activeExam.code} - Câu ${selectedQuestion.number}] ${selectedQuestion.prompt.slice(0, 72)}...`;
                                const qBody = `${selectedQuestion.prompt}\n\nCác phương án:\n${selectedQuestion.options.join('\n')}`;
                                setActiveExamId(null);
                                onAskQuestionFromExam({
                                  title: qTitle,
                                  content: qBody,
                                  subject: activeExam.subject,
                                });
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#090c10] hover:bg-[#1e293b] border border-[#38bdf8]/60 text-xs font-bold text-[#38bdf8] inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                              <span>🙋 Hỏi ẩn danh câu này</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-sm sm:text-base text-[#f1f5f9] leading-relaxed font-medium">
                        {selectedQuestion.prompt}
                      </p>

                      {selectedQuestion.formulaBox && (
                        <div className="rounded-lg bg-[#090c10] border border-dashed border-[#334155] p-3 font-mono text-xs text-[#f4f1de]">
                          {selectedQuestion.formulaBox}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedQuestion.options.map((opt) => (
                          <div
                            key={opt}
                            className="p-2.5 rounded-lg bg-[#090c10]/80 border border-[#1e293b] text-xs sm:text-sm font-mono text-[#f1f5f9]"
                          >
                            {opt}
                          </div>
                        ))}
                      </div>

                      {/* SPOILER HINT STEP-BY-STEP CARDS */}
                      <div className="space-y-2.5 pt-2 border-t border-dashed border-[#334155]">
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedHints((prev) => ({
                              ...prev,
                              [selectedQuestion.id]: !prev[selectedQuestion.id],
                            }))
                          }
                          className="w-full text-left p-3 rounded-xl bg-[#81b29a]/12 hover:bg-[#81b29a]/20 border border-[#81b29a]/40 transition cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-[#81b29a]">
                            <span className="inline-flex items-center gap-1.5">
                              <Lightbulb className="w-4 h-4" />
                              <span>💡 Bấm để mở Gợi ý Bước 1</span>
                            </span>
                            <span className="font-mono text-[11px]">
                              {revealedHints[selectedQuestion.id] ? 'Thu gọn' : 'Mở gợi ý'}
                            </span>
                          </div>
                          {revealedHints[selectedQuestion.id] && (
                            <p className="mt-2 text-xs sm:text-sm text-[#f4f1de] leading-relaxed">
                              {selectedQuestion.hintStep1}
                            </p>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setRevealedAnswers((prev) => ({
                              ...prev,
                              [selectedQuestion.id]: !prev[selectedQuestion.id],
                            }))
                          }
                          className="w-full text-left p-3 rounded-xl ff-2027-holo-card transition cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-[#10b981]">
                            <span className="inline-flex items-center gap-1.5">
                              <Target className="w-4 h-4" />
                              <span>🎯 Xem đáp án cuối</span>
                            </span>
                            <span className="ff-2027-holo-pill">
                              ✓ Thầy/Cô đã xác nhận cách giải
                            </span>
                          </div>
                          {revealedAnswers[selectedQuestion.id] && (
                            <p className="mt-2 text-xs sm:text-sm text-[#f1f5f9] leading-relaxed font-medium">
                              {selectedQuestion.finalAnswer}
                            </p>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* CỘT PHẢI (5 CỘT): THẢO LUẬN ẨN DANH GẮN CHẶT VỚI ĐÚNG CÂU ĐANG CHỌN */}
                <div className="lg:col-span-5 p-4 sm:p-5 bg-[#090c10]/70 flex flex-col justify-between gap-4 lg:overflow-y-auto">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-dashed border-[#334155]">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#38bdf8]" />
                        <h4 className="text-xs sm:text-sm font-extrabold text-[#f1f5f9] font-mono">
                          Thảo luận ẩn danh · Câu {selectedQuestion?.number}
                        </h4>
                      </div>
                      <span className="text-[11px] font-mono text-[#94a3b8] tabular-nums">
                        {questionReplies.length} phản hồi
                      </span>
                    </div>

                    {questionReplies.length === 0 ? (
                      <div className="p-5 rounded-xl bg-[#11161f] border border-dashed border-[#334155] text-center text-xs text-[#94a3b8]">
                        Chưa có ai hỏi câu này cả. Mở bát hỏi trước đi, mọi người vào cứu liền!
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {questionReplies.map((rep) => (
                          <div
                            key={rep.id}
                            className={`p-3 rounded-xl space-y-1.5 ${
                              rep.isTeacherVerified
                                ? 'ff-2027-holo-card'
                                : 'bg-[#11161f] border border-[#1e293b]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                              <span className="text-[#38bdf8] font-bold">
                                [{rep.anonCode} · {rep.gradeLabel}]
                              </span>
                              <span className="text-[#64748b]">{rep.createdAt}</span>
                            </div>
                            <p className="text-xs text-[#f1f5f9] leading-relaxed">{rep.content}</p>
                            {rep.isTeacherVerified && (
                              <div className="pt-1">
                                <span className="ff-2027-holo-pill">
                                  <Sparkles className="w-3 h-3" />
                                  <span>✓ Thầy/Cô đã xác nhận cách giải</span>
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSendAnonymousReply} className="space-y-2 pt-2 border-t border-[#1e293b]">
                    <label className="block text-[11px] font-mono text-[#94a3b8]">
                      Gửi bình luận ẩn danh cho Câu {selectedQuestion?.number} ({activeExam.code}):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={320}
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                        placeholder="Chụp ảnh đề bài hoặc dán (Ctrl+V) chỗ bạn đang kẹt vào đây..."
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[#171e2b] border border-dashed border-[#334155] text-xs text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:border-[#38bdf8]"
                      />
                      <button
                        type="submit"
                        className="ff-2027-squishy-cta px-3.5 py-2 rounded-lg text-xs inline-flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Gửi</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
};
