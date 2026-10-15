/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  BookOpen,
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
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Printer,
  HardDrive,
  WifiOff,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  DimensionView,
  User,
  ExamPaper,
  ExamType,
  ExamDifficulty,
  ExamPeerReview,
} from '../../types';
import { safeStorage } from '../../utils/storage';
import { playChime } from '../../utils/audio';
import {
  EXAM_LIKES_KEY,
  examLikeCount,
  examLikersOf,
  isExamLikedBy,
  parseExamLikes,
  serializeExamLikes,
  toggleExamLike,
  type ExamLikesMap,
} from '../../utils/examLikes';
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
  fetchExamSubmissions,
  reviewExamSubmission,
  submitExamPaper,
} from '../../utils/examSubmissionApi';
import { CbtPracticeModal } from '../exam/CbtPracticeModal';
import { ExamBookmarkDrawer } from '../exam/ExamBookmarkDrawer';
import { ExamPrintExportModal } from '../exam/ExamPrintExportModal';
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
const DOWNLOAD_COUNTS_KEY = 'fforum_exam_download_counts';
const USER_RATINGS_KEY = 'fforum_exam_user_ratings';
const PEER_REVIEWS_KEY = 'fforum_exam_peer_reviews';
const EMPTY_EXAM_SUBMISSIONS: ExamPaper[] = [];

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
    difficulty: 'Vận dụng cao',
    rating: 4.9,
    ratingCount: 168,
    uploader: { name: 'Ban Chuyên Môn Toán Amser', role: 'Ban Biên Tập' },
    uploadDate: '12/10/2026',
    summary: 'Đề chuẩn cấu trúc ma trận mới nhất Bộ GD&ĐT gồm 40 câu trắc nghiệm nhiều lựa chọn, 4 câu đúng sai và 6 câu trả lời ngắn kèm lời giải chi tiết từng bước.',
    sampleQuestions: [
      'Câu 1: Cho hàm số y = f(x) có bảng biến thiên với f\'(x) đổi dấu từ âm sang dương tại x = 2 và f(2) = -3. Tìm toạ độ điểm cực tiểu của đồ thị hàm số.',
      'Câu 2: Trong không gian Oxyz, tìm toạ độ hình chiếu vuông góc của điểm M(2; -1; 3) trên mặt phẳng (P): x + 2y - 2z + 4 = 0.',
      'Câu 3: Một doanh nghiệp sản xuất muốn tối ưu hoá chi phí vận hành theo hàm chi phí bậc ba C(x). Xác định số sản phẩm cần xuất xưởng để lợi nhuận tối đa.',
    ],
    sampleSolutions: [
      {
        questionNumber: 1,
        question: 'Cho hàm số y = f(x) có bảng biến thiên với f\'(x) đổi dấu từ âm sang dương tại x = 2 và f(2) = -3. Tìm toạ độ điểm cực tiểu của đồ thị hàm số.',
        solution: 'Do đạo hàm f\'(x) đổi dấu từ âm sang dương qua điểm x = 2 nên x = 2 là điểm cực tiểu của hàm số, với giá trị cực tiểu là y_CT = f(2) = -3. Do đó, điểm cực tiểu của đồ thị hàm số có toạ độ là (2; -3).',
        keyFormula: 'f\'(x_0) = 0 và f\'(x) đổi dấu từ (-) sang (+) khi qua x_0 => x_0 là điểm cực tiểu.',
        tips: 'Phân biệt rõ: "điểm cực tiểu của hàm số" là giá trị của x, còn "điểm cực tiểu của đồ thị" là cặp toạ độ (x; y).',
      },
      {
        questionNumber: 2,
        question: 'Trong không gian Oxyz, tìm toạ độ hình chiếu vuông góc của điểm M(2; -1; 3) trên mặt phẳng (P): x + 2y - 2z + 4 = 0.',
        solution: 'Mặt phẳng (P) có véctơ pháp tuyến n = (1; 2; -2). Đường thẳng d đi qua M và vuông góc với (P) có phương trình tham số: x = 2 + t, y = -1 + 2t, z = 3 - 2t. Thay vào phương trình (P): (2 + t) + 2(-1 + 2t) - 2(3 - 2t) + 4 = 0 <=> 9t - 2 = 0 <=> t = 2/9. Thay t vào phương trình đường thẳng d ta được toạ độ hình chiếu H(20/9; -5/9; 23/9).',
        keyFormula: 'd qua M(x_0, y_0, z_0) vuông góc (P): Ax + By + Cz + D = 0 nhận n=(A, B, C) làm VTCP.',
        tips: 'Kiểm tra lại bằng cách thay toạ độ điểm H vừa tìm vào phương trình mặt phẳng (P) để đảm bảo vế trái bằng 0.',
      },
      {
        questionNumber: 3,
        question: 'Một doanh nghiệp sản xuất muốn tối ưu hoá chi phí vận hành theo hàm chi phí bậc ba C(x). Xác định số sản phẩm cần xuất xưởng để lợi nhuận tối đa.',
        solution: 'Lợi nhuận được tính bằng doanh thu trừ chi phí: P(x) = R(x) - C(x) = p*x - C(x). Lấy đạo hàm cấp 1: P\'(x) = R\'(x) - C\'(x) = 0 để tìm điểm dừng kinh tế (doanh thu cận biên bằng chi phí cận biên). Khảo sát dấu P\'(x) trên miền x > 0 xác nhận giá trị cực đại toàn cục.',
        keyFormula: 'Doanh thu cận biên MR = Chi phí cận biên MC <=> R\'(x) = C\'(x).',
        tips: 'Đọc kỹ điều kiện ràng buộc công suất tối đa của nhà máy để không chọn nghiệm ngoài miền khả thi.',
      },
    ],
    peerReviews: [
      {
        id: 'rev-01',
        authorName: 'Nguyễn Minh Quân (Chuyên Sư Phạm)',
        authorRole: 'Thành viên Tinh Anh',
        rating: 5,
        date: '13/10/2026',
        content: 'Đề phân hoá rất rõ nét ở 6 câu trả lời ngắn. Phần hình toạ độ Oxyz câu 2 đòi hỏi tính toán chuẩn xác ma trận phân số.',
      },
      {
        id: 'rev-02',
        authorName: 'Trần Thu Hà (Ams 12 Toán 1)',
        authorRole: 'Ban Học Tập',
        rating: 5,
        date: '14/10/2026',
        content: 'Đề bám sát cấu trúc ma trận mới 2026-2027 của Bộ GD&ĐT, rất thích hợp cho các bạn muốn nhắm mục tiêu 9+.',
      },
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
    difficulty: 'Vận dụng',
    rating: 4.8,
    ratingCount: 142,
    uploader: { name: 'CLB Vật Lý CVA', role: 'Học Sinh Chuyên' },
    uploadDate: '08/10/2026',
    summary: 'Tổng hợp lý thuyết trọng tâm, sơ đồ tư duy Mindmap, hệ thống bài tập phân mức độ từ thông hiểu đến vận dụng cao có giải chi tiết.',
    sampleQuestions: [
      'Chuyên đề 1: Phương trình dao động điều hoà, mối liên hệ giữa li độ x, vận tốc v và gia tốc a theo thời gian t.',
      'Chuyên đề 2: Con lắc lò xo treo thẳng đứng: điều kiện để lực đàn hồi triệt tiêu và năng lượng dao động điều hoà bảo toàn.',
      'Chuyên đề 3: Giao thoa sóng cơ trên mặt nước với hai nguồn kết hợp đồng pha: xác định số điểm dao động với biên độ cực đại trên đoạn thẳng nối hai nguồn.',
    ],
    sampleSolutions: [
      {
        questionNumber: 1,
        question: 'Phương trình dao động điều hoà, mối liên hệ giữa li độ x, vận tốc v và gia tốc a theo thời gian t.',
        solution: 'Li độ x = A*cos(omega*t + phi). Vận tốc v = x\' = -omega*A*sin(omega*t + phi), sớm pha pi/2 so với li độ. Gia tốc a = v\' = -omega^2*x, ngược pha (sớm pha pi) so với li độ. Hệ thức độc lập: x^2 + v^2/omega^2 = A^2 và a^2/omega^4 + v^2/omega^2 = A^2.',
        keyFormula: 'x^2 + v^2 / omega^2 = A^2 và a = -omega^2 * x.',
        tips: 'Vẽ vòng tròn lượng giác đa trục (x nằm ngang hướng sang phải, v thẳng đứng hướng xuống, a nằm ngang hướng sang trái) để xác định pha cực nhanh.',
      },
      {
        questionNumber: 2,
        question: 'Con lắc lò xo treo thẳng đứng: điều kiện để lực đàn hồi triệt tiêu và năng lượng dao động điều hoà bảo toàn.',
        solution: 'Độ biến dạng ở VTCB: delta_l_0 = m*g / k. Lực đàn hồi triệt tiêu khi lò xo không biến dạng, tức là li độ x = -delta_l_0. Điều kiện để lực đàn hồi bằng 0 trong quá trình dao động là biên độ A >= delta_l_0.',
        keyFormula: 'delta_l_0 = m*g / k; F_dh = k * |delta_l_0 + x|.',
        tips: 'Phân biệt lực đàn hồi (hướng về vị trí lò xo không biến dạng) và lực kéo về (hướng về vị trí cân bằng O).',
      },
    ],
    peerReviews: [
      {
        id: 'rev-03',
        authorName: 'Lê Hoàng Dương (Chuyên Sư Phạm)',
        authorRole: 'Thành viên Tinh Anh',
        rating: 5,
        date: '10/10/2026',
        content: 'Sơ đồ tư duy con lắc lò xo và đồ thị năng lượng rất trực quan, cứu cánh cho bài kiểm tra 1 tiết!',
      },
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
    difficulty: 'Vận dụng cao',
    rating: 4.9,
    ratingCount: 95,
    uploader: { name: 'Thầy Hoàng Nam', role: 'Giáo Viên' },
    uploadDate: '05/10/2026',
    summary: 'Đề phân hoá rõ nét, rèn luyện kỹ năng xử lý bảng số liệu Ester - Lipit, Amino acid và Polyme thế hệ mới.',
    sampleQuestions: [
      'Câu 12: Thuỷ phân hoàn toàn m gam triglyxerit X trong dung dịch NaOH đun nóng, thu được glixerol và hỗn hợp hai muối natri stearat và natri panmitat.',
      'Câu 24: Thực nghiệm điện phân dung dịch chứa Cu(NO3)2 và NaCl bằng dòng điện không đổi với điện cực trơ, màng ngăn xốp.',
    ],
    sampleSolutions: [
      {
        questionNumber: 1,
        question: 'Thuỷ phân hoàn toàn m gam triglyxerit X trong dung dịch NaOH đun nóng, thu được glixerol và hỗn hợp hai muối natri stearat và natri panmitat.',
        solution: 'Áp dụng định luật bảo toàn khối lượng và phương pháp đồng đẳng hoá hoặc quy đổi: Quy đổi chất béo X thành (HCOO)3C3H5, CH2 và H2 (nếu chưa no). Từ tỷ lệ số mol muối panmitat (C15H31COONa) và stearat (C17H35COONa) suy ra cấu tạo chính xác của triglyxerit X.',
        keyFormula: 'm_chatbeo + m_NaOH = m_muoi + m_glixerol với n_NaOH = 3 * n_glixerol.',
        tips: 'Luôn kiểm tra tỷ lệ số mol NaOH và muối để bảo toàn gốc axit béo.',
      },
    ],
    peerReviews: [
      {
        id: 'rev-04',
        authorName: 'Đặng Quốc Bảo (K52 Phan Bội Châu)',
        authorRole: 'Học Sinh Chuyên Hoá',
        rating: 5,
        date: '07/10/2026',
        content: 'Bài toán điện phân câu 24 có đồ thị số mol electron trao đổi cực kỳ mẫu mực cho đề thi THPT Quốc gia.',
      },
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
    difficulty: 'Thông hiểu',
    rating: 4.7,
    ratingCount: 110,
    uploader: { name: 'English Excellence Club', role: 'CLB Học Sinh' },
    uploadDate: '28/09/2026',
    summary: 'Bao gồm phần phát âm, ngữ pháp trong ngữ cảnh thực tế, đoạn văn đọc hiểu chủ đề Trí tuệ nhân tạo & Môi trường bền vững.',
    sampleQuestions: [
      'Part 1: Phonetics and Word Stress patterns with multi-syllable academic nouns.',
      'Part 2: Cloze Reading Test on ecological restoration and technological innovations.',
      'Part 3: Sentence transformation maintaining synonymous meaning with inversion structure.',
    ],
    sampleSolutions: [
      {
        questionNumber: 1,
        question: 'Part 1: Stress pattern: differentiate words with suffix -tion, -ic, -ical.',
        solution: 'Words ending in -ic and -tion have primary stress placed on the penultimate syllable (immediately before the suffix): eco\'nomic, inno\'vation, sustaina\'bility.',
        keyFormula: 'Suffix rule: -tion, -sion, -ic => Stress on syllable directly preceding suffix.',
        tips: 'Count syllables from the end to quickly verify primary stress position.',
      },
    ],
    peerReviews: [
      {
        id: 'rev-05',
        authorName: 'Mai Anh (Lê Hồng Phong D1)',
        authorRole: 'CLB Tiếng Anh',
        rating: 5,
        date: '02/10/2026',
        content: 'Bài đọc hiểu chủ đề Trí tuệ nhân tạo dùng nhiều từ vựng C1/IELTS rất sát với xu hướng thi cử hiện đại.',
      },
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
    difficulty: 'Vận dụng cao',
    rating: 4.8,
    ratingCount: 84,
    uploader: { name: 'LamSon Math Geek', role: 'Học Sinh' },
    uploadDate: '01/10/2026',
    summary: 'Bộ 10 câu hỏi trắc nghiệm rèn tư duy giải nhanh đồ thị hàm số chứa trị tuyệt đối f(|x|) và |f(x)| có mẹo giải casio và bản chất.',
    sampleQuestions: [
      'Câu 1: Tìm số điểm cực trị của hàm số y = |x^3 - 3x^2 + 2|.',
      'Câu 2: Cho hàm số f(x) có đạo hàm liên tục trên R. Tìm tham số m để hàm số g(x) = f(|x - m|) có đúng 5 điểm cực trị.',
    ],
    sampleSolutions: [
      {
        questionNumber: 1,
        question: 'Tìm số điểm cực trị của hàm số y = |x^3 - 3x^2 + 2|.',
        solution: 'Xét hàm số u(x) = x^3 - 3x^2 + 2. Đạo hàm u\'(x) = 3x^2 - 6x = 0 <=> x = 0 hoặc x = 2 (2 điểm cực trị). Phương trình u(x) = 0 có 3 nghiệm phân biệt. Số điểm cực trị của hàm y = |u(x)| bằng số điểm cực trị của u(x) cộng số nghiệm đơn của u(x)=0: N = 2 + 3 = 5 điểm cực trị.',
        keyFormula: 'Số cực trị của y = |u(x)| bằng a + b (với a là số cực trị của u, b là số nghiệm đơn của u(x) = 0).',
        tips: 'Công thức N = a + b chỉ áp dụng khi các nghiệm của u(x) = 0 không trùng với các điểm cực trị.',
      },
    ],
    peerReviews: [
      {
        id: 'rev-06',
        authorName: 'Hoàng Văn Thái (Chuyên Lam Sơn)',
        authorRole: 'Học Sinh',
        rating: 5,
        date: '04/10/2026',
        content: 'Đề 15 phút nhưng cực kỳ chất lượng, giúp thông não dạng bài biến đổi đồ thị trị tuyệt đối.',
      },
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
    difficulty: 'Thông hiểu',
    rating: 4.6,
    ratingCount: 125,
    uploader: { name: 'Văn Học Trẻ Kim Liên', role: 'Ban Học Tập' },
    uploadDate: '20/09/2026',
    summary: 'Dàn ý mẫu nghị luận 600 chữ về lối sống bản lĩnh của Gen Z, phân tích hình tượng nghệ thuật và các biện pháp tu từ trọng điểm.',
    sampleQuestions: [
      'Phần Đọc hiểu: Ngữ liệu ngoài sách giáo khoa bàn về lòng tự trọng và văn hoá ứng xử không gian mạng.',
      'Phần Làm văn: Viết bài văn nghị luận xã hội khoảng 600 chữ bàn về ý nghĩa của việc dám bước ra khỏi vùng an toàn.',
    ],
    sampleSolutions: [
      {
        questionNumber: 1,
        question: 'Dàn ý phần Làm văn: Ý nghĩa của việc dám bước ra khỏi vùng an toàn trong kỷ nguyên số.',
        solution: 'Mở bài: Dẫn dắt nhận định về giới hạn của sự an toàn và bản lĩnh đương đầu thử thách. Thân bài: Giải thích "vùng an toàn" là trạng thái thoải mái tâm lý không có sự tiến bộ; Phân tích lợi ích (khai phóng tiềm năng, tích luỹ kinh nghiệm phục hồi resilient, thích ứng với biến động AI); Chứng minh bằng tấm gương khởi nghiệp trẻ; Bác bỏ tư tưởng an phận thụ động; Bài học nhận thức và hành động cá nhân.',
        keyFormula: 'Cấu trúc bài văn NLXH 600 chữ: Giải thích (10%) -> Bàn luận & Dẫn chứng (60%) -> Phản đề (15%) -> Bài học (15%).',
        tips: 'Lấy dẫn chứng thực tế gắn liền với khoa học công nghệ hoặc thế hệ trẻ thay vì các tấm gương đã quá cũ.',
      },
    ],
    peerReviews: [
      {
        id: 'rev-07',
        authorName: 'Đỗ Hà My (Kim Liên 11A1)',
        authorRole: 'Học Sinh',
        rating: 5,
        date: '25/09/2026',
        content: 'Dàn ý nghị luận xã hội viết rất hiện đại, có hệ thống luận điểm và dẫn chứng đắt giá.',
      },
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
    difficulty: 'Vận dụng cao',
    rating: 4.8,
    ratingCount: 78,
    uploader: { name: 'Thảo Vy Sinh Học', role: 'Học Sinh' },
    uploadDate: '25/09/2026',
    summary: 'Bao gồm các bài tập tính toán số nucleotit, chuỗi mARN, dịch mã và các bài toán phả hệ di truyền người mức độ vận dụng.',
    sampleQuestions: [
      'Câu 18: Một gen ở sinh vật nhân sơ có chiều dài 4080 Angstrom và có hiệu số giữa A với loại nucleotit khác là 20%.',
      'Câu 32: Cho sơ đồ phả hệ phản ánh sự di truyền của hai bệnh P và Q ở người do hai cặp gen phân ly độc lập quy định.',
    ],
    sampleSolutions: [
      {
        questionNumber: 1,
        question: 'Tính số lượng từng loại nucleotit của gen có chiều dài L = 4080 A và %A - %G = 20%.',
        solution: 'Tổng số nucleotit của gen: N = (2 * L) / 3.4 = (2 * 4080) / 3.4 = 2400 nu. Theo nguyên tắc bổ sung: %A + %G = 50% và %A - %G = 20% => %A = %T = 35%; %G = %X = 15%. Số lượng từng loại: A = T = 2400 * 35% = 840 nu; G = X = 2400 * 15% = 360 nu.',
        keyFormula: 'N = 2L / 3.4; %A + %G = 50%; A = T, G = X.',
        tips: 'Đổi đúng đơn vị: 1 nm = 10 Angstrom; 1 micromet = 10000 Angstrom.',
      },
    ],
    peerReviews: [
      {
        id: 'rev-08',
        authorName: 'Nguyễn Tiến Đạt (Lê Quý Đôn)',
        authorRole: 'Học Sinh',
        rating: 5,
        date: '29/09/2026',
        content: 'Bài phả hệ câu 32 chia trường hợp rất chặt chẽ, đáp án giải thích từng thế hệ rõ ràng.',
      },
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
    difficulty: 'Thông hiểu',
    rating: 4.7,
    ratingCount: 62,
    uploader: { name: 'Sử Học Đất Thành Nam', role: 'CLB Lịch Sử' },
    uploadDate: '18/09/2026',
    summary: '40 câu trắc nghiệm chuẩn cấu trúc ma trận mới: Trật tự hai cực Ianta, Chiến tranh lạnh, xu thế hoà hoãn Đông - Tây và phong trào giải phóng dân tộc.',
    sampleQuestions: [
      'Câu 1: Hội nghị Ianta (tháng 2/1945) đã đưa ra quyết định nào sau đây ảnh hưởng trực tiếp đến việc phân chia khu vực ảnh hưởng ở châu Á?',
      'Câu 15: Xu thế toàn cầu hoá được khởi xướng từ đầu những năm 80 của thế kỷ XX đã tạo ra thời cơ và thách thức gì cho các nước đang phát triển?',
    ],
    sampleSolutions: [
      {
        questionNumber: 1,
        question: 'Quyết định của Hội nghị Ianta ảnh hưởng trực tiếp đến phân chia ảnh hưởng ở châu Á.',
        solution: 'Tại Hội nghị Ianta, ba cường quốc Liên Xô, Mỹ, Anh thống nhất: Liên Xô tham chiến chống Nhật tại châu Á; trả lại cho Liên Xô miền Nam đảo Xakhalin; quốc tế hoá cảng Đại Liên; khôi phục quyền lợi của Nga ở đường sắt Trung Đông; bán đảo Triều Tiên bị chia cắt lấy vĩ tuyến 38 làm ranh giới tạm thời.',
        keyFormula: 'Từ khoá Ianta: Phân chia phạm vi ảnh hưởng giữa Mỹ và Liên Xô, bán đảo Triều Tiên vĩ tuyến 38.',
        tips: 'Ghi nhớ mốc thời gian: Hội nghị Ianta họp từ ngày 4 đến ngày 11 tháng 2 năm 1945 tại Liên Xô.',
      },
    ],
    peerReviews: [
      {
        id: 'rev-09',
        authorName: 'Vũ Thị Minh (LHP Nam Định)',
        authorRole: 'CLB Sử',
        rating: 5,
        date: '22/09/2026',
        content: 'Các câu hỏi so sánh trật tự hai cực Ianta với hệ thống Vécxai - Oasinhtơn rất sâu sắc.',
      },
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
    difficulty: 'Vận dụng cao',
    rating: 5.0,
    ratingCount: 230,
    uploader: { name: 'Thầy Vũ Quang', role: 'Giáo Viên' },
    uploadDate: '10/10/2026',
    summary: 'Đề thi thử vào lớp 10 theo format Sở GD&ĐT Hà Nội, có bài hình 3 ý nâng cao và câu bất đẳng thức phân loại điểm 10.',
    sampleQuestions: [
      'Bài 1: Cho biểu thức P. Rút gọn biểu thức và tìm x nguyên để P nhận giá trị nguyên lớn nhất.',
      'Bài 4: Cho đường tròn (O; R) và điểm A nằm ngoài đường tròn. Kẻ hai tiếp tuyến AB, AC và cát tuyến ADE.',
      'Bài 5: Cho các số thực dương a, b, c thỏa mãn ab + bc + ca = 3. Tìm giá trị nhỏ nhất của biểu thức P = 1 / (1 + a^2) + 1 / (1 + b^2) + 1 / (1 + c^2).',
    ],
    sampleSolutions: [
      {
        questionNumber: 1,
        question: 'Rút gọn biểu thức và tìm x nguyên để P nhận giá trị nguyên lớn nhất.',
        solution: 'Tìm điều kiện xác định x >= 0, x != 4, x != 9. Quy đồng mẫu thức chung (sqrt(x) - 2)(sqrt(x) - 3), thu gọn tử thức thành A = 2*sqrt(x) / (sqrt(x) - 3). Để P nguyên khi x nguyên, tách P = 2 + 6 / (sqrt(x) - 3), từ đó xét các ước số nguyên của 6.',
        keyFormula: 'Phương pháp chia đa thức tách phần nguyên: P(x) = Q(x) + r / mẫu.',
        tips: 'Sau khi tìm được x nguyên, luôn đối chiếu lại với điều kiện xác định ban đầu.',
      },
      {
        questionNumber: 3,
        question: 'Tìm GTNN của P với a, b, c dương và ab + bc + ca = 3.',
        solution: 'Áp dụng bất đẳng thức Cauchy-Schwarz dạng Engel hoặc kỹ thuật thêm bớt bất đẳng thức AM-GM: 1 / (1 + a^2) = 1 - a^2 / (1 + a^2) >= 1 - a^2 / (2a) = 1 - a/2. Cộng ba bất đẳng thức lại ta được P >= 3 - (a+b+c)/2. Do (a+b+c)^2 >= 3(ab+bc+ca) = 9 => a+b+c >= 3. Dấu bằng xảy ra khi a = b = c = 1, khi đó P = 3/2.',
        keyFormula: 'Bất đẳng thức AM-GM đảo ngược: 1 / (1 + x^2) >= 1 - x/2 với x > 0.',
        tips: 'Kỹ thuật Cauchy ngược dấu là chìa khoá vàng cho các bài toán phân thức chứa mẫu 1 + biến bình phương.',
      },
    ],
    peerReviews: [
      {
        id: 'rev-10',
        authorName: 'Phạm Đức Anh (Học sinh lớp 9 Giảng Võ)',
        authorRole: 'Học Sinh',
        rating: 5,
        date: '12/10/2026',
        content: 'Câu bất đẳng thức câu 5 dùng Cauchy ngược dấu giải cực đẹp mắt! Em đã áp dụng làm được bài kiểm tra thử.',
      },
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
    difficulty: 'Vận dụng',
    rating: 4.9,
    ratingCount: 88,
    uploader: { name: 'CodeMasters F-Forum', role: 'BQT F-Forum' },
    uploadDate: '14/10/2026',
    summary: 'Lập trình Python và C++: Mảng 2 chiều, xâu ký tự, danh sách liên kết, bài toán quy hoạch động kinh điển có mã nguồn mẫu.',
    sampleQuestions: [
      'Chương 1: Xử lý tệp trong Python và tối ưu hoá bộ nhớ khi đọc file lớn bằng generator yield.',
      'Chương 2: Cài đặt thuật toán sắp xếp nhanh QuickSort và phân tích độ phức tạp thời gian O(n log n).',
    ],
    sampleSolutions: [
      {
        questionNumber: 1,
        question: 'Cài đặt thuật toán QuickSort phân đoạn Lomuto và phân tích độ phức tạp.',
        solution: 'Chọn phần tử chốt (pivot) là phần tử cuối mảng. Dùng con trỏ i theo dõi ranh giới các phần tử nhỏ hơn chốt. Duyệt j từ đầu đến áp chốt, nếu arr[j] < pivot thì hoán đổi arr[i] và arr[j]. Sau đó đặt chốt vào vị trí i+1 và đệ quy hai nửa trái phải. Độ phức tạp trung bình O(n log n), xấu nhất O(n^2) khi mảng đã có thứ tự.',
        keyFormula: 'T(n) = 2T(n/2) + O(n) => T(n) = O(n log n) theo Định lý Master.',
        tips: 'Để tránh trường hợp xấu nhất O(n^2), nên chọn pivot ngẫu nhiên (Randomized QuickSort).',
      },
    ],
    peerReviews: [
      {
        id: 'rev-11',
        authorName: 'Trần Tuấn Kiệt (CLB Lập Trình LTV)',
        authorRole: 'Thành viên Tinh Anh',
        rating: 5,
        date: '14/10/2026',
        content: 'Mã nguồn C++ và Python trình bày chuẩn PSR, có chú thích chi tiết từng biến đếm.',
      },
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
  return title || paper.title;
};

export const ExamVaultView: React.FC<ExamVaultViewProps> = ({
  currentUser,
  onNavigate,
  onOpenLoginModal,
  onOpenProfile,
  initialSearchQuery = '',
}) => {
  const likeViewerKey = currentUser?.id || currentUser?.email || 'anonymous';
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
    window.dispatchEvent(new CustomEvent('fforum_toggle_theme'));
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
  const [sortBy, setSortBy] = useState<'newest' | 'downloads' | 'rating'>('newest');
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

  /* Real-time Persistent Overrides */
  const [downloadOverrides, setDownloadOverrides] = useState<Record<string, number>>(() => {
    try {
      const raw = safeStorage.getItem(DOWNLOAD_COUNTS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [examLikes, setExamLikes] = useState<ExamLikesMap>(() =>
    parseExamLikes(safeStorage.getItem(EXAM_LIKES_KEY)),
  );
  const examLikesRef = useRef(examLikes);

  const [userRatings, setUserRatings] = useState<Record<string, number>>(() => {
    try {
      const raw = safeStorage.getItem(USER_RATINGS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [peerReviewsMap, setPeerReviewsMap] = useState<Record<string, ExamPeerReview[]>>(() => {
    try {
      const raw = safeStorage.getItem(PEER_REVIEWS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  /* Trạng thái tính năng học thuật mới: CBT Practice, Bookmark Drawer, Print Modal, Offline Cache */
  const [cbtExam, setCbtExam] = useState<ExamPaper | null>(null);
  const [isBookmarkDrawerOpen, setIsBookmarkDrawerOpen] = useState(false);
  const [printExam, setPrintExam] = useState<ExamPaper | null>(null);
  const [cachedExamIds, setCachedExamIds] = useState<string[]>(() => getCachedExamIds());
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  /* Đồng bộ thời gian thực đa tab qua storage event */
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.newValue) {
        if (e.key === OFFLINE_EXAMS_CACHE_KEY) setCachedExamIds([]);
        if (e.key === SAVED_EXAMS_KEY) setSavedExams([]);
        if (e.key === submissionStorageKey) {
          setSubmissions([]);
          setSubmissionsOwnerKey(submissionStorageKey);
        }
        if (e.key === EXAM_LIKES_KEY) {
          examLikesRef.current = {};
          setExamLikes({});
        }
        return;
      }
      try {
        if (e.key === SAVED_EXAMS_KEY) setSavedExams(JSON.parse(e.newValue));
        if (e.key === submissionStorageKey) {
          setSubmissions(JSON.parse(e.newValue));
          setSubmissionsOwnerKey(submissionStorageKey);
        }
        if (e.key === DOWNLOAD_COUNTS_KEY) setDownloadOverrides(JSON.parse(e.newValue));
        if (e.key === USER_RATINGS_KEY) setUserRatings(JSON.parse(e.newValue));
        if (e.key === PEER_REVIEWS_KEY) setPeerReviewsMap(JSON.parse(e.newValue));
        if (e.key === EXAM_LIKES_KEY) {
          const nextLikes = parseExamLikes(e.newValue);
          examLikesRef.current = nextLikes;
          setExamLikes(nextLikes);
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

  /* Heart / Like toggle: one persisted like per viewer, not one per click. */
  const handleToggleLike = useCallback((examId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const nextLikes = toggleExamLike(examLikesRef.current, examId, likeViewerKey);
    examLikesRef.current = nextLikes;
    setExamLikes(nextLikes);
    safeStorage.setItem(EXAM_LIKES_KEY, serializeExamLikes(nextLikes));

    showToast(
      isExamLikedBy(nextLikes, examId, likeViewerKey)
        ? 'Cảm ơn bạn đã yêu thích tài liệu này!'
        : 'Đã bỏ yêu thích tài liệu này.',
    );
    try {
      playChime();
    } catch {
      /* Bỏ qua âm thanh */
    }
  }, [likeViewerKey, showToast]);

  /* Open the actual print-to-PDF flow instead of simulating a download. */
  const handleDownload = useCallback((exam: ExamPaper, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setPrintExam(exam);
  }, []);

  const handleRecordPdfExport = useCallback((exam: ExamPaper) => {
    setDownloadOverrides((prev) => {
      const currentCount = prev[exam.id] ?? exam.downloads;
      const next = { ...prev, [exam.id]: currentCount + 1 };
      safeStorage.setItem(DOWNLOAD_COUNTS_KEY, JSON.stringify(next));
      return next;
    });
    showToast('Trong hộp thoại in, chọn “Lưu dưới dạng PDF” để tải tệp.');
  }, [showToast]);

  /* User Rating Handler */
  const handleRateExam = useCallback((examId: string, stars: number) => {
    setUserRatings((prev) => {
      const next = { ...prev, [examId]: stars };
      safeStorage.setItem(USER_RATINGS_KEY, JSON.stringify(next));
      showToast(`Đã ghi nhận đánh giá ${stars} sao cho tài liệu này!`);
      try {
        playChime();
      } catch {
        /* Bỏ qua */
      }
      return next;
    });
  }, [showToast, setUserRatings]);

  /* Peer Review Submission */
  const handleAddPeerReview = useCallback((examId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewText.trim()) return;

    const newRev: ExamPeerReview = {
      id: `rev-${Date.now()}`,
      authorName: currentUser?.name || 'Học sinh F-Forum',
      authorRole:
        currentUser?.role === 'SUPER_ADMIN'
          ? 'Ban Quản Trị'
          : currentUser?.role === 'CLUB_LEADER'
          ? 'Chủ Nhiệm CLB'
          : 'Học Sinh',
      rating: newReviewRating,
      date: 'Vừa xong',
      content: newReviewText.trim(),
    };

    setPeerReviewsMap((prev) => {
      const existing = prev[examId] || [];
      const updated = [newRev, ...existing];
      const nextMap = { ...prev, [examId]: updated };
      safeStorage.setItem(PEER_REVIEWS_KEY, JSON.stringify(nextMap));
      return nextMap;
    });

    /* Ghi nhận đánh giá sao trực tiếp vào bài thi */
    handleRateExam(examId, newReviewRating);

    setNewReviewText('');
    setNewReviewRating(5);
    showToast('Đã đăng nhận xét đề thi thành công! Nhận ngay +10 XP học tập.');
    try {
      playChime();
    } catch {
      /* Bỏ qua */
    }
  }, [newReviewText, newReviewRating, currentUser, handleRateExam, setPeerReviewsMap, setNewReviewText, setNewReviewRating, showToast]);

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
    const url = `${window.location.origin}/exam-vault?id=${exam.id}`;
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

  /* Combine Seed Exams + Verified Submissions with Overrides */
  const allPapers = useMemo(() => {
    const approvedSubmissionMap = new Map<string, ExamPaper>();
    publicSubmissions.forEach((submission) => approvedSubmissionMap.set(submission.id, submission));
    currentSubmissions
      .filter((submission) => submission.status === 'approved')
      .forEach((submission) => approvedSubmissionMap.set(submission.id, submission));
    const combined = [...approvedSubmissionMap.values(), ...SEED_EXAMS];

    return combined.map((p) => {
      const dl = downloadOverrides[p.id] ?? p.downloads;
      const lk = examLikeCount(p.likes, examLikersOf(examLikes, p.id));
      const userRating = userRatings[p.id];
      const extraReviews = peerReviewsMap[p.id] || [];
      const baseReviews = p.peerReviews || [];
      const allRevs = [...extraReviews, ...baseReviews];

      /* Calculate effective rating */
      const baseCount = Number.isFinite(p.ratingCount) ? Math.max(0, p.ratingCount ?? 0) : 0;
      const baseRating = baseCount > 0 && Number.isFinite(p.rating) ? p.rating ?? 0 : 0;
      const effectiveRatingCount = baseCount + (userRating ? 1 : 0);
      const effectiveRating = effectiveRatingCount > 0
        ? Number(((baseRating * baseCount + (userRating ?? 0)) / effectiveRatingCount).toFixed(1))
        : undefined;

      return {
        ...p,
        downloads: dl,
        likes: lk,
        rating: effectiveRating,
        ratingCount: effectiveRatingCount,
        peerReviews: allRevs,
      };
    });
  }, [currentSubmissions, publicSubmissions, downloadOverrides, examLikes, userRatings, peerReviewsMap]);

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
      result = result.filter((p) => p.subject === selectedSubject);
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

    /* Sorting */
    if (sortBy === 'downloads') {
      result.sort((a, b) => b.downloads - a.downloads);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }

    return result;
  }, [
    allPapers,
    activeTab,
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
        if (cbtExam) setCbtExam(null);
        else if (isBookmarkDrawerOpen) setIsBookmarkDrawerOpen(false);
        else if (printExam) setPrintExam(null);
        else if (previewExam) setPreviewExam(null);
        else if (isSubmitModalOpen) setIsSubmitModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cbtExam, isBookmarkDrawerOpen, printExam, previewExam, isSubmitModalOpen]);

  const isStaffOrAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.staffRole === 'MODERATOR' || currentUser?.staffRole === 'TEACHER';

  /* Active Preview Exam with Latest Reactive Overrides */
  const activePreview = useMemo(() => {
    if (!previewExam) return null;
    return allPapers.find((p) => p.id === previewExam.id) || previewExam;
  }, [previewExam, allPapers]);

  /* Prevent background scrolling when any modal or drawer is open */
  const isAnyModalOpen = Boolean(
    cbtExam || isBookmarkDrawerOpen || printExam || previewExam || isSubmitModalOpen
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
              <span className="hidden sm:inline text-xs font-semibold text-white/90 max-w-[100px] truncate">
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
                  Đề cương <span className="ff-calligraphic-flourish">ôn tập</span>
                </>
              ) : activeTab === 'exams' ? (
                <>
                  Đề thi <span className="ff-calligraphic-flourish">theo môn</span>
                </>
              ) : (
                <>
                  Đề thi <span className="ff-calligraphic-flourish">&amp; đề cương</span>
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
              <option value="downloads">Tải nhiều nhất</option>
              <option value="rating">Yêu thích nhất</option>
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
          <div className="w-full rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center flex flex-col items-center sm:p-12">
            <BookOpen className="w-12 h-12 text-white/20 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Không tìm thấy đề thi phù hợp</h3>
            <p className="text-xs text-neutral-400 max-w-md mb-4">
              Thử đổi từ khoá hoặc bộ lọc.
            </p>
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
        ) : (
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
            {filteredPapers.map((paper) => {
              const isSaved = savedExams.includes(paper.id);
              const isLiked = isExamLikedBy(examLikes, paper.id, likeViewerKey);
              const isPending = paper.status === 'pending';
              const cardTitle = getCompactPaperTitle(paper);

              return (
                <article
                  key={paper.id}
                  tabIndex={0}
                  aria-label={`Xem trước: ${paper.title}`}
                  onClick={(event) => {
                    if ((event.target as HTMLElement).closest('button, a, input, select, textarea')) return;
                    setPreviewExam(paper);
                    setShowDetailedSolutions(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
                    e.preventDefault();
                    setPreviewExam(paper);
                    setShowDetailedSolutions(false);
                  }}
                  className={`ff-exam-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between cursor-pointer relative overflow-visible group ${
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

                      {/* Top actions: Like and Bookmark */}
                      <div className="ff-exam-card-top-actions ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleToggleLike(paper.id, e)}
                          className={`ff-tactile-btn inline-flex min-h-9 items-center gap-1 rounded-lg border px-2 transition-colors cursor-pointer text-[11px] ${
                            isLiked
                              ? 'border-rose-400/35 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
                              : 'border-white/10 bg-white/5 text-white/50 hover:bg-rose-500/20 hover:text-rose-400'
                          }`}
                          aria-label={isLiked ? 'Bỏ yêu thích đề thi' : 'Yêu thích đề thi'}
                          aria-pressed={isLiked}
                          title={isLiked ? 'Bỏ yêu thích' : 'Yêu thích'}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-400 text-rose-400' : ''}`} />
                          <span className="text-[10px] font-mono">{paper.likes}</span>
                        </button>

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
                      {/* Metric pills */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/50">
                        <span className="flex items-center gap-1 text-amber-300/90 font-medium">
                          <Download className="w-3 h-3 text-amber-400" /> {paper.downloads}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {paper.views}
                        </span>
                        {paper.rating && (
                          <span className="flex items-center gap-0.5 text-amber-300 font-semibold">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{paper.rating}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" /> {paper.attachments?.length ? `${paper.attachments.length} tệp` : `${paper.pageCount} tr`}
                        </span>
                      </div>

                      {/* Action buttons */}
                      {isPending && (
                        <span className="ff-exam-pending-badge inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold">
                          <Clock className="h-3.5 w-3.5" /> Chờ duyệt
                        </span>
                      )}

                      <div className="ff-exam-card-actions grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewExam(paper);
                            setShowDetailedSolutions(false);
                          }}
                          className="ff-tactile-btn inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-2 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/[0.12]"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-300" />
                          <span>Xem thử</span>
                        </button>

                        {paper.attachments && paper.attachments.length > 0 ? (
                          <button
                            type="button"
                            onClick={(event) => handleDownloadExamAttachment(paper.id, paper.attachments![0], event)}
                            className="ff-tactile-btn inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-[#0b0d12] bg-[#f4f1de] px-2 py-1.5 text-xs font-extrabold text-[#0b0d12] transition-colors hover:bg-[#f2cc8f]"
                            aria-label={`Tải tệp gốc ${paper.attachments[0].name}`}
                            title="Tải trực tiếp tệp đề gốc"
                          >
                            <Download className="w-3.5 h-3.5 text-[#e07a5f]" />
                            <span>Tải tệp gốc</span>
                          </button>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs mb-4">
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
              <div>
                <span className="text-white/45 block text-[10px] uppercase font-mono">Thời gian làm bài</span>
                <span className="font-semibold text-white">
                  {activePreview.duration ? `${activePreview.duration} phút` : 'Chưa cập nhật'}
                </span>
              </div>
            </div>

            {/* Interactive Rating Pod */}
            <div className="p-3.5 rounded-xl bg-amber-400/5 border border-amber-400/20 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  <span className="text-lg font-extrabold text-amber-300">
                    {activePreview.rating !== undefined ? activePreview.rating.toFixed(1) : '—'}
                  </span>
                  <span className="text-xs text-white/50">/ 5.0</span>
                </div>
                <span className="text-xs text-white/60">({activePreview.ratingCount ?? 0} lượt đánh giá)</span>
              </div>

              {/* Interactive Star Voting */}
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <span className="text-white/60 mr-1">Đánh giá của bạn:</span>
                {[1, 2, 3, 4, 5].map((star) => {
                  const currentRating = userRatings[activePreview.id] ?? 0;
                  const isFilled = (hoverRating || currentRating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => handleRateExam(activePreview.id, star)}
                      className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg cursor-pointer transition-transform hover:scale-110 focus:outline-none"
                      aria-label={`Đánh giá ${star} sao`}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          isFilled ? 'fill-amber-400 text-amber-400' : 'text-white/30'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

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
                    {activePreview.attachments.length} tệp · {activePreview.fileSize}
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
                      className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 font-mono leading-relaxed"
                    >
                      {q}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Peer Reviews & Community Discussion Hub */}
            <div className="mb-5 p-4 rounded-xl bg-white/[0.02] border border-white/10">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h4 className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-amber-300/80">
                  <MessageSquare className="w-3.5 h-3.5" /> Nhận xét
                </h4>
                <span className="text-[11px] text-white/50">
                  {activePreview.peerReviews?.length ?? 0} nhận xét
                </span>
              </div>

              {/* Form submit review */}
              <form onSubmit={(e) => handleAddPeerReview(activePreview.id, e)} className="mb-4">
                <div className="mb-2 flex flex-wrap items-center gap-1">
                  <span className="mr-1 text-[11px] text-white/60">Đánh giá:</span>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNewReviewRating(s)}
                      className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg cursor-pointer"
                      aria-label={`Đánh giá ${s} sao`}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          newReviewRating >= s ? 'fill-amber-400 text-amber-400' : 'text-white/20'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <textarea
                    rows={2}
                    maxLength={1000}
                    value={newReviewText}
                    onChange={(e) => setNewReviewText(e.target.value)}
                    placeholder="Viết nhận xét..."
                    className="w-full ff-exam-input rounded-xl px-3 py-2 text-xs placeholder-white/40 focus:outline-none resize-none"
                  />
                  <button
                    type="submit"
                    disabled={!newReviewText.trim()}
                    className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-[#0b0d12] hover:bg-amber-300 cursor-pointer disabled:opacity-40 transition-colors"
                  >
                    <Send className="w-3 h-3" /> Gửi
                  </button>
                </div>
              </form>

              {/* Reviews list */}
              {activePreview.peerReviews && activePreview.peerReviews.length > 0 ? (
                <div className="space-y-2.5 max-h-60 overflow-y-auto no-scrollbar pr-1">
                  {activePreview.peerReviews.map((rev) => (
                    <div key={rev.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/5 text-xs">
                      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="break-words font-semibold text-amber-200">{rev.authorName}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white/70">
                            {rev.authorRole}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-white/40">{rev.date}</span>
                          <div className="flex items-center">
                            {[...Array(rev.rating)].map((_, i) => (
                              <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-white/80 leading-relaxed text-xs whitespace-pre-line break-words">{rev.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/40 text-center py-2">
                  Chưa có nhận xét.
                </p>
              )}
            </div>

            {/* Cross-Community Links */}
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

            {/* Actions footer */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10 flex-wrap gap-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
                <span>Dung lượng: {activePreview.fileSize}</span>
                <span>•</span>
                <span>{activePreview.attachments?.length ? `${activePreview.attachments.length} tệp gốc` : `${activePreview.pageCount} trang`}</span>
                <span>•</span>
                <span className="text-amber-300 font-semibold">{activePreview.downloads} lượt tải</span>
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
                  onClick={(e) => handleToggleBookmark(activePreview.id, e)}
                  className="ff-tactile-btn inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/[0.08] cursor-pointer"
                >
                  <Bookmark className="w-4 h-4" />
                  <span>{savedExams.includes(activePreview.id) ? 'Đã lưu' : 'Lưu vào kho'}</span>
                </button>

                {activePreview.attachments && activePreview.attachments.length > 0 ? (
                  <button
                    type="button"
                    onClick={(event) => handleDownloadExamAttachment(activePreview.id, activePreview.attachments![0], event)}
                    className="ff-tactile-btn inline-flex min-h-10 items-center gap-1.5 rounded-xl border-2 border-[#0b0d12] bg-[#f4f1de] px-4 py-2 text-xs font-extrabold text-[#0b0d12] transition-colors hover:bg-[#f2cc8f]"
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
              <h2 id="submit-title" className="text-lg sm:text-xl font-bold text-white">
                Gửi đề thi / đề cương
              </h2>
              <p className="text-xs text-neutral-300 mt-1">
                Gửi tài liệu để BQT kiểm duyệt và chia sẻ.
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
      {/* 8. EXAM BOOKMARK / YÊU THÍCH DRAWER                       */}
      {/* ======================================================== */}
      <ExamBookmarkDrawer
        isOpen={isBookmarkDrawerOpen}
        onClose={() => setIsBookmarkDrawerOpen(false)}
        savedExamIds={savedExams}
        allPapers={allPapers}
        cachedExamIds={cachedExamIds}
        onRemoveBookmark={handleRemoveBookmark}
        onClearAllBookmarks={handleClearAllBookmarks}
        onSelectPreview={(p) => {
          setIsBookmarkDrawerOpen(false);
          setPreviewExam(p);
        }}
        onOpenPrint={(p) => {
          setIsBookmarkDrawerOpen(false);
          handleOpenPrint(p);
        }}
      />

      {/* ======================================================== */}
      {/* 9. EXAM PRINT & EXPORT MODAL                             */}
      {/* ======================================================== */}
      {printExam && (
        <ExamPrintExportModal
          paper={printExam}
          onClose={() => setPrintExam(null)}
          onPrint={() => handleRecordPdfExport(printExam)}
        />
      )}

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
