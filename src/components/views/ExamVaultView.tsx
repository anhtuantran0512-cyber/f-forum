/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  BookOpen,
  FileText,
  Download,
  Eye,
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
} from 'lucide-react';
import type { DimensionView, User, ExamPaper, ExamType } from '../../types';
import { safeStorage } from '../../utils/storage';
import { playChime } from '../../utils/audio';
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

/* Danh sách đề thi & đề cương mẫu chuẩn cấu trúc các trường THPT / THCS hàng đầu */
const SEED_EXAMS: ExamPaper[] = [
  {
    id: 'ex-01',
    title: 'Đề thi Giữa học kỳ 1 Toán 12 — Chuyên đề Khảo sát hàm số & Tọa độ không gian',
    subject: 'Toán học',
    grade: 12,
    examType: 'Đề giữa kỳ 1',
    province: 'Hà Nội',
    school: 'THPT Chuyên Hà Nội - Amsterdam',
    schoolYear: '2026-2027',
    format: 'PDF',
    fileSize: '2.4 MB',
    downloads: 1420,
    views: 3890,
    likes: 412,
    verified: true,
    hasAnswer: true,
    pageCount: 8,
    duration: 90,
    uploader: { name: 'Ban Chuyên Môn Toán Amser', role: 'Ban Biên Tập' },
    uploadDate: '12/10/2026',
    summary: 'Đề chuẩn cấu trúc ma trận mới nhất Bộ GD&ĐT gồm 40 câu trắc nghiệm nhiều lựa chọn, 4 câu đúng sai và 6 câu trả lời ngắn kèm lời giải chi tiết từng bước.',
    sampleQuestions: [
      'Câu 1: Cho hàm số y = f(x) có bảng biến thiên như hình vẽ. Điểm cực tiểu của hàm số là gì?',
      'Câu 2: Trong không gian Oxyz, tìm toạ độ hình chiếu vuông góc của điểm M(2; -1; 3) trên mặt phẳng (P): x + 2y - 2z + 4 = 0.',
      'Câu 3: Một doanh nghiệp sản xuất muốn tối ưu hoá chi phí vận hành theo hàm bậc ba. Xác định số sản phẩm cần xuất xưởng để lợi nhuận tối đa.',
    ],
    status: 'approved',
  },
  {
    id: 'ex-02',
    title: 'Đề cương ôn tập Học kỳ 1 Vật lý 11 — Toàn bộ Chuyên đề Dao động cơ & Sóng cơ học',
    subject: 'Vật lý',
    grade: 11,
    examType: 'Đề cương ôn tập',
    province: 'Hà Nội',
    school: 'THPT Chu Văn An (Hà Nội)',
    schoolYear: '2026-2027',
    format: 'PDF',
    fileSize: '3.1 MB',
    downloads: 1850,
    views: 4520,
    likes: 567,
    verified: true,
    hasAnswer: true,
    pageCount: 16,
    duration: 60,
    uploader: { name: 'CLB Vật Lý CVA', role: 'Học Sinh Chuyên' },
    uploadDate: '08/10/2026',
    summary: 'Tổng hợp lý thuyết trọng tâm, sơ đồ tư duy Mindmap, hệ thống bài tập phân mức độ từ thông hiểu đến vận dụng cao có giải chi tiết.',
    sampleQuestions: [
      'Chuyên đề 1: Phương trình dao động điều hoà, mối liên hệ giữa li độ, vận tốc và gia tốc trong chuyển động điều hoà.',
      'Chuyên đề 2: Con lắc đơn, con lắc lò xo và sự biến thiên động năng - thế năng bảo toàn.',
      'Chuyên đề 3: Giao thoa sóng cơ trên mặt nước, vị trí cực đại và cực tiểu giao thoa.',
    ],
    status: 'approved',
  },
  {
    id: 'ex-03',
    title: 'Đề thi Khảo sát chất lượng Đợt 1 Hoá học 12 — Liên trường THPT Chuyên',
    subject: 'Hoá học',
    grade: 12,
    examType: 'Khảo sát chất lượng',
    province: 'Nghệ An',
    school: 'THPT Chuyên Phan Bội Châu (Nghệ An)',
    schoolYear: '2026-2027',
    format: 'PDF',
    fileSize: '1.9 MB',
    downloads: 980,
    views: 2950,
    likes: 345,
    verified: true,
    hasAnswer: true,
    pageCount: 6,
    duration: 50,
    uploader: { name: 'Thầy Hoàng Nam', role: 'Giáo Viên' },
    uploadDate: '05/10/2026',
    summary: 'Đề phân hoá rõ nét, rèn luyện kỹ năng xử lý bảng số liệu Ester - Lipit, Amino acid và Polyme thế hệ mới.',
    sampleQuestions: [
      'Câu 12: Thuỷ phân hoàn toàn m gam triglyxerit X trong dung dịch NaOH đun nóng, thu được glixerol và hỗn hợp hai muối natri stearat và natri panmitat.',
      'Câu 24: Thực nghiệm điện phân dung dịch chứa Cu(NO3)2 và NaCl bằng dòng điện không đổi với điện cực trơ.',
    ],
    status: 'approved',
  },
  {
    id: 'ex-04',
    title: 'Đề thi Cuối học kỳ 1 Tiếng Anh 10 — Format Đổi Mới Cấu Trúc Đọc Hiểu & Nghe',
    subject: 'Tiếng Anh',
    grade: 10,
    examType: 'Đề cuối kỳ 1',
    province: 'TP. Hồ Chí Minh',
    school: 'THPT Chuyên Lê Hồng Phong (TP.HCM)',
    schoolYear: '2025-2026',
    format: 'DOCX',
    fileSize: '1.2 MB',
    downloads: 1210,
    views: 3100,
    likes: 290,
    verified: true,
    hasAnswer: true,
    pageCount: 7,
    duration: 60,
    uploader: { name: 'English Excellence Club', role: 'CLB Học Sinh' },
    uploadDate: '28/09/2026',
    summary: 'Bao gồm phần phát âm, ngữ pháp trong ngữ cảnh thực tế, đoạn văn đọc hiểu chủ đề Trí tuệ nhân tạo & Môi trường bền vững.',
    sampleQuestions: [
      'Part 1: Phonetics and Word Stress patterns with multi-syllable academic nouns.',
      'Part 2: Cloze Reading Test on ecological restoration and technological innovations.',
      'Part 3: Sentence transformation maintaining synonymous meaning.',
    ],
    status: 'approved',
  },
  {
    id: 'ex-05',
    title: 'Đề kiểm tra 15 phút Giải tích 12 — Cực trị hàm số chứa dấu giá trị tuyệt đối',
    subject: 'Toán học',
    grade: 12,
    examType: 'Đề 15 phút',
    province: 'Thanh Hoá',
    school: 'THPT Chuyên Lam Sơn (Thanh Hóa)',
    schoolYear: '2026-2027',
    format: 'PDF',
    fileSize: '820 KB',
    downloads: 740,
    views: 1980,
    likes: 180,
    verified: true,
    hasAnswer: true,
    pageCount: 3,
    duration: 15,
    uploader: { name: 'LamSon Math Geek', role: 'Học Sinh' },
    uploadDate: '01/10/2026',
    summary: 'Bộ 10 câu hỏi trắc nghiệm rèn tư duy giải nhanh đồ thị hàm số chứa trị tuyệt đối f(|x|) và |f(x)| có mẹo giải casio và bản chất.',
    sampleQuestions: [
      'Câu 1: Tìm số điểm cực trị của hàm số y = |x^3 - 3x^2 + 2|.',
      'Câu 2: Cho hàm số f(x) có đạo hàm liên tục trên R. Tìm m để hàm số g(x) = f(|x - m|) có đúng 5 điểm cực trị.',
    ],
    status: 'approved',
  },
  {
    id: 'ex-06',
    title: 'Đề cương ôn tập Giữa kỳ 1 Ngữ văn 11 — Nghị luận xã hội & Đọc hiểu Thơ Hiện Đại',
    subject: 'Ngữ văn',
    grade: 11,
    examType: 'Đề cương ôn tập',
    province: 'Hà Nội',
    school: 'THPT Kim Liên',
    schoolYear: '2026-2027',
    format: 'DOCX',
    fileSize: '1.5 MB',
    downloads: 1630,
    views: 4120,
    likes: 489,
    verified: true,
    hasAnswer: true,
    pageCount: 12,
    duration: 90,
    uploader: { name: 'Văn Học Trẻ Kim Liên', role: 'Ban Học Tập' },
    uploadDate: '20/09/2026',
    summary: 'Dàn ý mẫu nghị luận 600 chữ về lối sống bản lĩnh của Gen Z, phân tích hình tượng nghệ thuật và các biện pháp tu từ trọng điểm.',
    sampleQuestions: [
      'Phần Đọc hiểu: Ngữ liệu ngoài sách giáo khoa bàn về lòng tự trọng và văn hoá ứng xử không gian mạng.',
      'Phần Làm văn: Viết bài văn nghị luận xã hội bàn về ý nghĩa của việc dám bước ra khỏi vùng an toàn.',
    ],
    status: 'approved',
  },
  {
    id: 'ex-07',
    title: 'Đề thi Giữa học kỳ 1 Sinh học 12 — Di truyền học phân tử & Quy luật di truyền Mendel',
    subject: 'Sinh học',
    grade: 12,
    examType: 'Đề giữa kỳ 1',
    province: 'Đà Nẵng',
    school: 'THPT Chuyên Lê Quý Đôn (Đà Nẵng)',
    schoolYear: '2026-2027',
    format: 'PDF',
    fileSize: '1.8 MB',
    downloads: 620,
    views: 1840,
    likes: 195,
    verified: true,
    hasAnswer: true,
    pageCount: 6,
    duration: 50,
    uploader: { name: 'Thảo Vy Sinh Học', role: 'Học Sinh' },
    uploadDate: '25/09/2026',
    summary: 'Bao gồm các bài tập tính toán số nucleotit, chuỗi mARN, dịch mã và các bài toán phả hệ di truyền người mức độ vận dụng.',
    sampleQuestions: [
      'Câu 18: Một gen ở sinh vật nhân sơ có chiều dài 4080 Angstrom và có hiệu số giữa A với loại nu khác là 20%.',
      'Câu 32: Cho sơ đồ phả hệ phản ánh sự di truyền của hai bệnh P và Q ở người do hai cặp gen phân ly độc lập quy định.',
    ],
    status: 'approved',
  },
  {
    id: 'ex-08',
    title: 'Đề thi Giữa kỳ 1 Lịch sử 12 — Quan hệ quốc tế trong nửa sau thế kỷ XX',
    subject: 'Lịch sử',
    grade: 12,
    examType: 'Đề giữa kỳ 1',
    province: 'Nam Định',
    school: 'THPT Chuyên Lê Hồng Phong (Nam Định)',
    schoolYear: '2026-2027',
    format: 'PDF',
    fileSize: '1.1 MB',
    downloads: 510,
    views: 1420,
    likes: 140,
    verified: true,
    hasAnswer: true,
    pageCount: 5,
    duration: 45,
    uploader: { name: 'Sử Học Đất Thành Nam', role: 'CLB Lịch Sử' },
    uploadDate: '18/09/2026',
    summary: '40 câu trắc nghiệm chuẩn cấu trúc ma trận mới: Trật tự hai cực Ianta, Chiến tranh lạnh, xu thế hoà hoãn Đông - Tây và phong trào giải phóng dân tộc.',
    sampleQuestions: [
      'Câu 1: Hội nghị Ianta (tháng 2/1945) đã đưa ra quyết định nào sau đây ảnh hưởng trực tiếp đến việc phân chia khu vực ảnh hưởng ở châu Á?',
      'Câu 15: Xu thế toàn cầu hoá được khởi xướng từ đầu những năm 80 của thế kỷ XX đã tạo ra thời cơ và thách thức gì cho các nước đang phát triển?',
    ],
    status: 'approved',
  },
  {
    id: 'ex-09',
    title: 'Đề thi Khảo sát Toán 9 vào 10 — Chuyên đề Hình học Đường tròn & Bất đẳng thức',
    subject: 'Toán học',
    grade: 9,
    examType: 'Khảo sát chất lượng',
    province: 'Hà Nội',
    school: 'THCS Giảng Võ (Hà Nội)',
    schoolYear: '2026-2027',
    format: 'PDF',
    fileSize: '2.1 MB',
    downloads: 2150,
    views: 5200,
    likes: 720,
    verified: true,
    hasAnswer: true,
    pageCount: 6,
    duration: 120,
    uploader: { name: 'Thầy Vũ Quang', role: 'Giáo Viên' },
    uploadDate: '10/10/2026',
    summary: 'Đề thi thử vào lớp 10 theo format Sở GD&ĐT Hà Nội, có bài hình 3 ý nâng cao và câu bất đẳng thức phân loại điểm 10.',
    sampleQuestions: [
      'Bài 1: Cho biểu thức P. Rút gọn biểu thức và tìm x nguyên để P nhận giá trị nguyên lớn nhất.',
      'Bài 4: Cho đường tròn (O; R) và điểm A nằm ngoài đường tròn. Kẻ hai tiếp tuyến AB, AC và cát tuyến ADE.',
      'Bài 5: Cho các số thực dương a, b, c thỏa mãn ab + bc + ca = 3. Tìm giá trị nhỏ nhất của biểu thức.',
    ],
    status: 'approved',
  },
  {
    id: 'ex-10',
    title: 'Đề cương ôn tập Tin học 11 — Lập trình cấu trúc dữ liệu & Thuật toán đệ quy',
    subject: 'Tin học',
    grade: 11,
    examType: 'Đề cương ôn tập',
    province: 'Hà Nội',
    school: 'THPT Lương Thế Vinh',
    schoolYear: '2026-2027',
    format: 'PDF',
    fileSize: '2.7 MB',
    downloads: 870,
    views: 2410,
    likes: 310,
    verified: true,
    hasAnswer: true,
    pageCount: 14,
    duration: 45,
    uploader: { name: 'CodeMasters F-Forum', role: 'BQT F-Forum' },
    uploadDate: '14/10/2026',
    summary: 'Lập trình Python và C++: Mảng 2 chiều, xâu ký tự, danh sách liên kết, bài toán quy hoạch động kinh điển có mã nguồn mẫu.',
    sampleQuestions: [
      'Chương 1: Xử lý tệp trong Python và tối ưu hoá bộ nhớ khi đọc file lớn.',
      'Chương 2: Cài đặt thuật toán sắp xếp nhanh QuickSort và phân tích độ phức tạp thời gian O(n log n).',
    ],
    status: 'approved',
  },
];

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

const SUBJECT_OPTIONS = [
  'Tất cả môn',
  'Toán học',
  'Vật lý',
  'Hoá học',
  'Sinh học',
  'Ngữ văn',
  'Tiếng Anh',
  'Lịch sử',
  'Địa lý',
  'Tin học',
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

export const ExamVaultView: React.FC<ExamVaultViewProps> = ({
  currentUser,
  onNavigate,
  onOpenLoginModal,
  onOpenProfile,
  initialSearchQuery = '',
}) => {
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

  const handleToggleTheme = useCallback(() => {
    window.dispatchEvent(new CustomEvent('fforum_toggle_theme'));
  }, []);

  /* Search & Filter States */
  const [searchTerm, setSearchTerm] = useState(initialSearchQuery);
  const [selectedGrade, setSelectedGrade] = useState<number>(0);
  const [selectedExamType, setSelectedExamType] = useState<string>('Tất cả loại');
  const [selectedSubject, setSelectedSubject] = useState<string>('Tất cả môn');
  const [selectedProvince, setSelectedProvince] = useState<string>('Toàn quốc');
  const [selectedSchool, setSelectedSchool] = useState<string>('Tất cả trường');
  const [selectedYear, setSelectedYear] = useState<string>('Tất cả năm');
  const [sortBy, setSortBy] = useState<'newest' | 'downloads' | 'rating'>('newest');
  const [activeTab, setActiveTab] = useState<'all' | 'syllabus' | 'exams' | 'saved' | 'my_submissions'>('all');

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
    try {
      const raw = safeStorage.getItem(SUBMISSIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  /* Modals */
  const [previewExam, setPreviewExam] = useState<ExamPaper | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  /* Submission Form State */
  const [submitTitle, setSubmitTitle] = useState('');
  const [submitGrade, setSubmitGrade] = useState<number>(12);
  const [submitSubject, setSubmitSubject] = useState('Toán học');
  const [submitExamType, setSubmitExamType] = useState<ExamType>('Đề giữa kỳ 1');
  const [submitProvince, setSubmitProvince] = useState('Hà Nội');
  const [submitSchool, setSubmitSchool] = useState('THPT Chuyên Hà Nội - Amsterdam');
  const [submitYear, setSubmitYear] = useState('2026-2027');
  const [submitNotes, setSubmitNotes] = useState('');
  const [submitFileName, setSubmitFileName] = useState('');
  const [submitFileSize, setSubmitFileSize] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* Toast Helper */
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    const t = setTimeout(() => setToastMessage(null), 3600);
    return () => clearTimeout(t);
  }, []);

  /* Save/Bookmark toggle */
  const handleToggleBookmark = useCallback((examId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSavedExams((prev) => {
      const exists = prev.includes(examId);
      const next = exists ? prev.filter((id) => id !== examId) : [...prev, examId];
      safeStorage.setItem(SAVED_EXAMS_KEY, JSON.stringify(next));
      showToast(exists ? 'Đã bỏ lưu đề thi khỏi thư viện.' : 'Đã lưu đề thi vào kho cá nhân thành công!');
      return next;
    });
  }, [showToast]);

  /* Simulated Download */
  const handleDownload = useCallback((exam: ExamPaper, event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (downloadingId) return;
    setDownloadingId(exam.id);
    setDownloadProgress(10);
    try {
      playChime();
    } catch {
      /* Bỏ qua âm thanh nếu trình duyệt chặn */
    }

    let progress = 10;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 25) + 15;
      if (progress >= 100) {
        clearInterval(interval);
        setDownloadProgress(100);
        setTimeout(() => {
          setDownloadingId(null);
          setDownloadProgress(0);
          showToast(`Tải xuống hoàn tất: ${exam.title} (${exam.fileSize})`);
        }, 400);
      } else {
        setDownloadProgress(progress);
      }
    }, 120);
  }, [downloadingId, showToast]);

  /* Handle Student Submission */
  const handleSubmitExam = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!submitTitle.trim()) {
      setSubmitError('Vui lòng nhập tên đề thi hoặc đề cương.');
      return;
    }
    if (!submitFileName) {
      setSubmitError('Vui lòng đính kèm tệp đề thi (PDF hoặc Word).');
      return;
    }

    setIsUploading(true);
    setTimeout(() => {
      const newSubmission: ExamPaper = {
        id: `sub-${Date.now()}`,
        title: submitTitle.trim(),
        subject: submitSubject,
        grade: submitGrade,
        examType: submitExamType,
        province: submitProvince,
        school: submitSchool.trim() || 'Trường THPT',
        schoolYear: submitYear,
        format: submitFileName.toLowerCase().endsWith('.docx') ? 'DOCX' : 'PDF',
        fileSize: submitFileSize || '1.8 MB',
        downloads: 0,
        views: 1,
        likes: 0,
        verified: false,
        hasAnswer: true,
        pageCount: 8,
        duration: 90,
        uploader: {
          id: currentUser?.id || 'guest',
          name: currentUser?.name || 'Học sinh F-Forum',
          role: currentUser?.role || 'Học Sinh',
        },
        uploadDate: 'Hôm nay',
        summary: submitNotes.trim() || 'Tài liệu do học sinh đóng góp gửi tới Ban Quản Trị.',
        status: 'pending',
      };

      const updated = [newSubmission, ...submissions];
      setSubmissions(updated);
      safeStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(updated));

      setIsUploading(false);
      setIsSubmitModalOpen(false);
      setSubmitTitle('');
      setSubmitNotes('');
      setSubmitFileName('');
      setSubmitFileSize('');
      setSubmitError(null);

      showToast('Đã gửi đề thi thành công! Ban Quản Trị sẽ xét duyệt và thông báo sớm nhất.');
      try {
        playChime();
      } catch {
        /* bỏ qua */
      }
    }, 600);
  }, [
    submitTitle,
    submitFileName,
    submitSubject,
    submitGrade,
    submitExamType,
    submitProvince,
    submitSchool,
    submitYear,
    submitFileSize,
    currentUser,
    submitNotes,
    submissions,
    showToast,
  ]);

  /* Admin Approval / Rejection */
  const handleApproveSubmission = useCallback((examId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSubmissions((prev) => {
      const updated = prev.map((item) => (item.id === examId ? { ...item, status: 'approved' as const, verified: true } : item));
      safeStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(updated));
      showToast('Đã duyệt đề thi thành công! Đề đã được đưa vào kho công khai.');
      return updated;
    });
  }, [showToast]);

  const handleRejectSubmission = useCallback((examId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSubmissions((prev) => {
      const updated = prev.map((item) => (item.id === examId ? { ...item, status: 'rejected' as const } : item));
      safeStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(updated));
      showToast('Đã từ chối duyệt đề thi.');
      return updated;
    });
  }, [showToast]);

  /* Combine Seed Exams + Verified Submissions */
  const allPapers = useMemo(() => {
    const approvedSubmissions = submissions.filter((s) => s.status === 'approved');
    return [...approvedSubmissions, ...SEED_EXAMS];
  }, [submissions]);

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
    } else if (activeTab === 'my_submissions') {
      return submissions;
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
          p.examType.toLowerCase().includes(q),
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
      result = result.filter((p) => p.subject === selectedSubject);
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

    /* Sorting */
    if (sortBy === 'downloads') {
      result.sort((a, b) => b.downloads - a.downloads);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => b.likes - a.likes);
    }

    return result;
  }, [
    allPapers,
    activeTab,
    searchTerm,
    selectedGrade,
    selectedExamType,
    selectedSubject,
    selectedProvince,
    selectedSchool,
    selectedYear,
    sortBy,
    savedExams,
    submissions,
  ]);

  /* Keyboard shortcut Escape to close modals */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewExam) setPreviewExam(null);
        if (isSubmitModalOpen) setIsSubmitModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewExam, isSubmitModalOpen]);

  const isStaffOrAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.staffRole === 'MODERATOR' || currentUser?.staffRole === 'TEACHER';

  return (
    <div className="ff-exam-vault ff-light-adapt w-full flex flex-col items-center select-text">
      {/* ======================================================== */}
      {/* 1. TOP HEADER BAR: Back to Home + Brand Logo + Actions  */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-40 w-full px-4 sm:px-8 py-3.5 ff-exam-header-bar flex items-center justify-between border-b">
        {/* Top-left: Icon f-forum quay về trang chủ */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="ff-exam-brand group flex items-center gap-2.5 cursor-pointer select-none bg-transparent border-none p-1.5 rounded-xl hover:bg-white/[0.06] transition-colors"
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
            <span className="text-[10px] text-white/60 tracking-wider flex items-center gap-1">
              <ArrowLeft className="w-2.5 h-2.5" /> Trang chủ
            </span>
          </div>
        </button>

        {/* Center Badge: Kho Đề Thi Số Hoá 2027 */}
        <div className="hidden md:flex items-center gap-2 px-3.5 py-1 rounded-full border border-amber-400/25 bg-amber-400/10 text-amber-200 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="ff-calligraphic-flourish text-[13px]">Kho Tàng Đề Thi &amp; Đề Cương Số Hoá</span>
        </div>

        {/* Top-right Actions */}
        <div className="flex items-center gap-2">
          {/* Quick nav links */}
          <button
            type="button"
            onClick={() => onNavigate('qa')}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            Hỏi Đáp
          </button>
          <button
            type="button"
            onClick={() => onNavigate('clubs')}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            Câu Lạc Bộ
          </button>

          {/* Theme Toggle Sun / Moon */}
          <button
            type="button"
            onClick={handleToggleTheme}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
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
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#0b0d12] text-xs sm:text-sm font-extrabold shadow-[0_4px_16px_rgba(245,158,11,0.35)] transition-all duration-200 cursor-pointer"
            aria-label="Đóng góp đề cương để xét duyệt"
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Đóng Góp Đề Thi</span>
            <span className="sm:hidden">Gửi đề</span>
          </button>

          {/* Profile Avatar or Login CTA */}
          {currentUser ? (
            <button
              type="button"
              onClick={() => onOpenProfile?.(currentUser)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-colors cursor-pointer"
              aria-label={`Trang cá nhân của ${currentUser.name}`}
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                loading="lazy"
                className="w-6 h-6 rounded-lg object-cover ring-1 ring-amber-400/40"
              />
              <span className="hidden sm:inline text-xs font-semibold text-white/90 max-w-[100px] truncate">
                {currentUser.name}
              </span>
            </button>
          ) : onOpenLoginModal ? (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-semibold border border-white/15 transition-colors cursor-pointer"
              aria-label="Đăng nhập"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>
          ) : null}
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. HERO SEARCH CONTAINER                                 */}
      {/* ======================================================== */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-4 text-center">
        <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/25 text-cyan-300 text-xs font-semibold">
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Hệ thống chia sẻ đề thi toàn quốc cho học sinh</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 leading-tight">
          Tra Cứu Đề Thi &amp; Đề Cương{' '}
          <span className="ff-calligraphic-flourish text-amber-300 text-[115%]">
            Chuẩn Cấu Trúc
          </span>
        </h1>
        <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl mx-auto mb-6">
          Kho đề thi giữa kỳ, cuối kỳ, 15 phút và đề cương ôn tập có đáp án chi tiết từ các trường THPT Chuyên và Sở GD&amp;ĐT trên toàn quốc.
        </p>

        {/* Thanh tìm kiếm phong cách 2027 Liquid Glass Pod */}
        <div className="ff-exam-hero-search w-full max-w-3xl mx-auto rounded-2xl p-2.5 sm:p-3 transition-all duration-300">
          <div className="relative flex items-center w-full">
            <Search className="w-5 h-5 text-amber-300 ml-3 shrink-0 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nhập tên đề thi, trường (Amsterdam, Chu Văn An), môn học, chuyên đề..."
              className="w-full bg-transparent px-3 py-2 text-sm sm:text-base text-white placeholder-white/45 focus:outline-none"
              aria-label="Tìm kiếm đề thi"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-1.5 rounded-lg text-white/50 hover:text-white mr-2 cursor-pointer"
                aria-label="Xoá tìm kiếm"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              className="hidden sm:inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0b0d12] text-xs font-bold shrink-0 cursor-pointer transition-colors"
            >
              <span>Tìm kiếm</span>
            </button>
          </div>

          {/* Quick search tags */}
          <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-white/10 flex-wrap text-left px-2">
            <span className="text-[11px] text-white/50 flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-amber-300" /> Gợi ý nhanh:
            </span>
            {[
              'Toán 12 Giữa kỳ 1',
              'Vật lý 11 Chu Văn An',
              'Hoá học Chuyên Phan Bội Châu',
              'Đề cương Ngữ văn 11',
              'Khảo sát Toán 9',
            ].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSearchTerm(tag)}
                className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-amber-200/90 border border-white/10 transition-colors cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. MULTI-LEVEL FILTERS POD                               */}
      {/* ======================================================== */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 my-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 pb-3 border-b border-white/10 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'Tất cả tài liệu', count: allPapers.length },
            { id: 'syllabus', label: 'Đề cương ôn tập', count: allPapers.filter((p) => p.examType === 'Đề cương ôn tập').length },
            { id: 'exams', label: 'Đề thi & Kiểm tra', count: allPapers.filter((p) => p.examType !== 'Đề cương ôn tập').length },
            { id: 'saved', label: 'Đề đã lưu', count: savedExams.length },
            { id: 'my_submissions', label: 'Đề tôi gửi duyệt', count: submissions.length },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
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

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 mt-3.5">
          {/* Filter Khối lớp */}
          <div className="flex flex-col">
            <label className="ff-exam-filter-label text-[10px] font-mono uppercase tracking-wider text-white/50 mb-1 flex items-center gap-1">
              <Layers className="w-2.5 h-2.5" /> Khối lớp
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(Number(e.target.value))}
              className="ff-exam-select text-xs rounded-xl px-2.5 py-2 focus:outline-none cursor-pointer"
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
              className="ff-exam-select text-xs rounded-xl px-2.5 py-2 focus:outline-none cursor-pointer"
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
              className="ff-exam-select text-xs rounded-xl px-2.5 py-2 focus:outline-none cursor-pointer"
            >
              {SUBJECT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Tỉnh thành */}
          <div className="flex flex-col">
            <label className="ff-exam-filter-label text-[10px] font-mono uppercase tracking-wider text-white/50 mb-1 flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" /> Tỉnh thành
            </label>
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="ff-exam-select text-xs rounded-xl px-2.5 py-2 focus:outline-none cursor-pointer"
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
              className="ff-exam-select text-xs rounded-xl px-2.5 py-2 focus:outline-none cursor-pointer truncate"
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
              className="ff-exam-select text-xs rounded-xl px-2.5 py-2 focus:outline-none cursor-pointer"
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
              className="ff-exam-select text-xs rounded-xl px-2.5 py-2 focus:outline-none cursor-pointer"
            >
              <option value="newest">Mới nhất</option>
              <option value="downloads">Tải nhiều nhất</option>
              <option value="rating">Yêu thích nhất</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips & Reset */}
        {(selectedGrade > 0 || selectedExamType !== 'Tất cả loại' || selectedSubject !== 'Tất cả môn' || selectedProvince !== 'Toàn quốc' || selectedSchool !== 'Tất cả trường' || selectedYear !== 'Tất cả năm' || searchTerm) && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-[11px] text-white/50">Đang lọc:</span>
            {selectedGrade > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs flex items-center gap-1">
                Lớp {selectedGrade}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedGrade(0)} />
              </span>
            )}
            {selectedExamType !== 'Tất cả loại' && (
              <span className="px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs flex items-center gap-1">
                {selectedExamType}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedExamType('Tất cả loại')} />
              </span>
            )}
            {selectedSubject !== 'Tất cả môn' && (
              <span className="px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs flex items-center gap-1">
                {selectedSubject}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedSubject('Tất cả môn')} />
              </span>
            )}
            {selectedProvince !== 'Toàn quốc' && (
              <span className="px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs flex items-center gap-1">
                {selectedProvince}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedProvince('Toàn quốc')} />
              </span>
            )}
            {selectedSchool !== 'Tất cả trường' && (
              <span className="px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs flex items-center gap-1">
                {selectedSchool}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedSchool('Tất cả trường')} />
              </span>
            )}
            {selectedYear !== 'Tất cả năm' && (
              <span className="px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs flex items-center gap-1">
                {selectedYear}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedYear('Tất cả năm')} />
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedGrade(0);
                setSelectedExamType('Tất cả loại');
                setSelectedSubject('Tất cả môn');
                setSelectedProvince('Toàn quốc');
                setSelectedSchool('Tất cả trường');
                setSelectedYear('Tất cả năm');
                setSearchTerm('');
              }}
              className="text-xs text-amber-400 hover:underline ml-1 cursor-pointer"
            >
              Xoá tất cả bộ lọc
            </button>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 4. MAIN EXAM CARDS GRID                                 */}
      {/* ======================================================== */}
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 my-2">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-white/70">
            Tìm thấy <strong className="text-amber-300">{filteredPapers.length}</strong> tài liệu phù hợp
          </span>
          <span className="text-[11px] font-mono text-white/40">
            Cập nhật liên tục · Kiểm duyệt chất lượng
          </span>
        </div>

        {filteredPapers.length === 0 ? (
          <div className="w-full p-12 text-center rounded-2xl border border-white/10 bg-white/[0.02] flex flex-col items-center">
            <BookOpen className="w-12 h-12 text-white/20 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Không tìm thấy đề thi phù hợp</h3>
            <p className="text-xs text-neutral-400 max-w-md mb-4">
              Hãy thử chọn bớt bộ lọc hoặc gõ từ khoá khác. Bạn cũng có thể đóng góp đề thi của trường bạn để làm phong phú kho tài liệu nhé!
            </p>
            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0b0d12] text-xs font-bold transition-colors cursor-pointer"
            >
              Đóng góp đề cương ngay
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredPapers.map((paper) => {
              const isSaved = savedExams.includes(paper.id);
              const isDownloading = downloadingId === paper.id;
              const isPending = paper.status === 'pending';

              return (
                <article
                  key={paper.id}
                  onClick={() => setPreviewExam(paper)}
                  className={`ff-exam-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between cursor-pointer relative overflow-hidden group ${
                    isPending ? 'border-amber-400/40 bg-amber-950/20' : ''
                  }`}
                >
                  {/* Top tags row */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
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

                        {paper.hasAnswer && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Có đáp án
                          </span>
                        )}
                      </div>

                      {/* Bookmark button */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleBookmark(paper.id, e)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
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

                    {/* Paper Title */}
                    <h2 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-200 transition-colors leading-snug line-clamp-2 mb-2">
                      {paper.title}
                    </h2>

                    {/* School & Location */}
                    <div className="flex items-center gap-3 text-xs text-neutral-300 mb-3 flex-wrap">
                      <span className="flex items-center gap-1 text-amber-200/90 font-medium">
                        <School className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        {paper.school}
                      </span>
                      <span className="flex items-center gap-1 text-white/60">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {paper.province}
                      </span>
                      <span className="flex items-center gap-1 text-white/60">
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
                    {/* Downloading progress bar if active */}
                    {isDownloading && (
                      <div className="w-full mb-3">
                        <div className="flex items-center justify-between text-[10px] text-amber-300 mb-1">
                          <span>Đang tải xuống...</span>
                          <span>{downloadProgress}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full ff-exam-progress-bar rounded-full transition-all duration-150"
                            style={{ width: `${downloadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2.5 border-t border-white/10 flex-wrap gap-2">
                      {/* Metric pills */}
                      <div className="flex items-center gap-3 text-[11px] text-white/50">
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3" /> {paper.downloads}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {paper.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" /> {paper.pageCount} trang
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        {/* Admin approval actions if pending */}
                        {isPending && isStaffOrAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => handleApproveSubmission(paper.id, e)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                              title="Duyệt đăng đề thi"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleRejectSubmission(paper.id, e)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                              title="Từ chối đề thi"
                            >
                              <X className="w-3.5 h-3.5" /> Từ chối
                            </button>
                          </>
                        )}

                        {/* Status badge if user submitted */}
                        {isPending && (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold">
                            Chờ BQT duyệt
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewExam(paper);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-semibold flex items-center gap-1 border border-white/10 cursor-pointer transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-300" />
                          <span>Xem thử</span>
                        </button>

                        <button
                          type="button"
                          disabled={isDownloading}
                          onClick={(e) => handleDownload(paper, e)}
                          className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0b0d12] text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Tải {paper.format}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* 5. PREVIEW MODAL                                         */}
      {/* ======================================================== */}
      {previewExam && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewExam(null)}
        >
          <div
            className="ff-exam-modal w-full max-w-2xl rounded-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto no-scrollbar relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setPreviewExam(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer"
              aria-label="Đóng xem trước"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header badges */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${getSubjectBadgeStyle(previewExam.subject)}`}>
                {previewExam.subject}
              </span>
              <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-white/10 text-white">
                Khối {previewExam.grade}
              </span>
              <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/25">
                {previewExam.examType}
              </span>
              {previewExam.verified && (
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Đã kiểm duyệt
                </span>
              )}
            </div>

            {/* Title */}
            <h2 id="preview-title" className="text-lg sm:text-xl font-bold text-white mb-2 leading-snug">
              {previewExam.title}
            </h2>

            {/* Metadata list */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs mb-4">
              <div>
                <span className="text-white/45 block text-[10px] uppercase font-mono">Đơn vị phát hành</span>
                <span className="font-semibold text-amber-200">{previewExam.school}</span>
              </div>
              <div>
                <span className="text-white/45 block text-[10px] uppercase font-mono">Địa phương</span>
                <span className="font-semibold text-white">{previewExam.province}</span>
              </div>
              <div>
                <span className="text-white/45 block text-[10px] uppercase font-mono">Năm học</span>
                <span className="font-semibold text-white">{previewExam.schoolYear}</span>
              </div>
              <div>
                <span className="text-white/45 block text-[10px] uppercase font-mono">Thời gian làm bài</span>
                <span className="font-semibold text-white">{previewExam.duration} phút</span>
              </div>
            </div>

            {/* Summary */}
            <div className="mb-4">
              <h4 className="text-xs font-mono uppercase tracking-wider text-amber-300/80 mb-1">
                Tóm tắt cấu trúc ma trận đề:
              </h4>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/5">
                {previewExam.summary}
              </p>
            </div>

            {/* Sample Questions */}
            {previewExam.sampleQuestions && previewExam.sampleQuestions.length > 0 && (
              <div className="mb-5">
                <h4 className="text-xs font-mono uppercase tracking-wider text-amber-300/80 mb-2">
                  Trích dẫn câu hỏi tiêu biểu:
                </h4>
                <div className="space-y-2">
                  {previewExam.sampleQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 font-mono leading-relaxed"
                    >
                      {q}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions footer */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10 flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs text-white/50">
                <span>Dung lượng: {previewExam.fileSize}</span>
                <span>•</span>
                <span>{previewExam.pageCount} trang</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleToggleBookmark(previewExam.id, e)}
                  className="px-3 py-2 rounded-xl border border-white/15 text-xs font-semibold text-white hover:bg-white/10 cursor-pointer flex items-center gap-1.5"
                >
                  <Bookmark className="w-4 h-4" />
                  <span>{savedExams.includes(previewExam.id) ? 'Đã lưu' : 'Lưu vào kho'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload(previewExam)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#0b0d12] text-xs font-extrabold cursor-pointer flex items-center gap-1.5 shadow-[0_4px_16px_rgba(245,158,11,0.3)]"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải Đầy Đủ {previewExam.format}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. STUDENT SUBMISSION MODAL                              */}
      {/* ======================================================== */}
      {isSubmitModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
          onClick={() => setIsSubmitModalOpen(false)}
        >
          <div
            className="ff-exam-modal w-full max-w-xl rounded-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto no-scrollbar relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer"
              aria-label="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                <Sparkles className="w-3.5 h-3.5" /> Chia sẻ tri thức
              </span>
              <h2 id="submit-title" className="text-lg sm:text-xl font-bold text-white">
                Đóng Góp Đề Thi &amp; Đề Cương
              </h2>
              <p className="text-xs text-neutral-300 mt-1">
                Gửi file đề thi hoặc đề cương của trường bạn để Ban Quản Trị xét duyệt và đăng tải. Học sinh sẽ nhận ngay +50 XP khi tài liệu được duyệt!
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
              <div className="grid grid-cols-2 gap-3">
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

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block ff-exam-filter-label text-white/70 font-semibold mb-1">Năm học</label>
                  <select
                    value={submitYear}
                    onChange={(e) => setSubmitYear(e.target.value)}
                    className="w-full ff-exam-select rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                  >
                    <option value="2026-2027">2026-2027</option>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2024-2025">2024-2025</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                <label className="block ff-exam-filter-label text-white/70 font-semibold mb-1">
                  Tệp đính kèm (PDF, DOCX, Ảnh) <span className="text-amber-400">*</span>
                </label>
                <div className="w-full p-4 rounded-xl border-2 border-dashed border-white/20 hover:border-amber-400/50 bg-white/[0.02] flex flex-col items-center justify-center text-center cursor-pointer relative">
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.zip,.jpg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSubmitFileName(file.name);
                        const mb = (file.size / (1024 * 1024)).toFixed(1);
                        setSubmitFileSize(`${mb} MB`);
                        setSubmitError(null);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {submitFileName ? (
                    <div className="flex items-center gap-2 text-amber-300 font-semibold">
                      <FileCheck className="w-5 h-5 text-emerald-400" />
                      <span>{submitFileName}</span>
                      <span className="text-[10px] text-white/50">({submitFileSize})</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-white/40 mb-1" />
                      <span className="text-xs font-semibold text-white/80">
                        Bấm để chọn tệp hoặc kéo thả vào đây
                      </span>
                      <span className="text-[10px] text-white/40 mt-0.5">
                        Hỗ trợ định dạng PDF, Word (DOCX) hoặc ZIP · Tối đa 25 MB
                      </span>
                    </>
                  )}
                </div>
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
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/15 text-white/70 hover:text-white hover:bg-white/5 font-semibold cursor-pointer"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#0b0d12] font-extrabold cursor-pointer shadow-[0_4px_16px_rgba(245,158,11,0.3)] disabled:opacity-50"
                >
                  {isUploading ? 'Đang gửi lên...' : 'Gửi đề cương cho BQT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. TOAST NOTIFICATION                                    */}
      {/* ======================================================== */}
      {toastMessage && (
        <div className="fixed bottom-6 z-50 px-4 py-2.5 rounded-xl bg-neutral-900/95 border border-amber-400/50 text-amber-200 text-xs font-semibold shadow-[0_12px_36px_rgba(0,0,0,0.65)] backdrop-blur-xl animate-fade-up flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default ExamVaultView;
