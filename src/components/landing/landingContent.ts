/* Bản quyền trí tuệ thuộc về BroAmStuck */
import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck,
  Command,
  BellRing,
  BookOpenCheck,
  Bot,
  Compass,
  Flame,
  Gauge,
  GraduationCap,
  Timer,
  HelpCircle,
  Lock,
  MessagesSquare,
  Moon,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

/* ==========================================================================
   Landing copy — single source of truth so the marketing surface stays
   consistent and easy to iterate on.
   ========================================================================== */

export interface LandingStat {
  id: string;
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  label: string;
  hint: string;
}

export const HERO_TRUST = ['Miễn phí 100% cho sinh viên', 'Không quảng cáo', 'Bảo mật dữ liệu học tập'];

export const FEATURES: {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  span: 'lg' | 'md';
  bullets?: string[];
}[] = [
  {
    id: 'qa',
    title: 'Sàn hỏi đáp tri thức',
    description:
      'Đặt câu hỏi theo môn học, nhận lời giải từ bạn bè và giảng viên trong vài phút. Lời giải hay nhất được bình chọn và ghim ngay đầu câu hỏi.',
    icon: HelpCircle,
    accent: 'amber',
    span: 'lg',
    bullets: ['13 chủ đề: Toán, Lý, Hóa, Anh, Tin…', 'Chế độ hỏi ẩn danh an toàn', 'Bình chọn “Lời giải hay nhất”'],
  },
  {
    id: 'clubs',
    title: 'Câu lạc bộ & sự kiện',
    description:
      'Hơn 4 nhóm ngành: Công nghệ, Nghệ thuật, Thể thao, Học thuật. Đăng ký tham gia, đăng bài cho CLB và theo dõi hoạt động trong một nơi duy nhất.',
    icon: Users,
    accent: 'sky',
    span: 'md',
  },
  {
    id: 'chat',
    title: 'Phòng chat thời gian thực',
    description:
      '4 kênh riêng biệt: Hành lang, Hỏi nhanh, Tâm sự, CLB Hub. Tin nhắn đồng bộ tức thì giữa các tab và thiết bị, có danh sách bạn đang online.',
    icon: MessagesSquare,
    accent: 'violet',
    span: 'md',
  },
  {
    id: 'xp',
    title: 'Coin, chuỗi ngày & 8 danh hiệu học sinh',
    description:
      'Mỗi câu trả lời hữu ích, mỗi buổi học tập trung đều được ghi nhận. Hệ thống cấp độ và 8 danh hiệu vinh danh biến việc học thành hành trình có thưởng.',
    icon: Trophy,
    accent: 'amber',
    span: 'md',
  },
  {
    id: 'focus',
    title: 'Focus Sanctuary',
    description:
      'Đồng hồ học tự do, mục tiêu 25 / 60 / 120 phút và nhật ký ghi lại thời lượng học thật — không ép đủ 25 phút mỗi phiên, không làm gián đoạn dòng tập trung.',
    icon: Timer,
    accent: 'emerald',
    span: 'md',
  },
  {
    id: 'command',
    title: 'Bảng lệnh & tiện ích ẩn',
    description:
      'Nhấn ⌘/Ctrl + K để mở bảng lệnh nhanh, ⌘/Ctrl + I để ghi chú tức thì ở bất kỳ phân khu nào, kèm nhắc nghỉ mắt 20-20-20 khi học lâu.',
    icon: Command,
    accent: 'violet',
    span: 'md',
    bullets: ['Bảng lệnh ⌘K không rời bàn phím', 'Sổ tay nhanh dùng chung với Focus', 'Nhắc nghỉ mắt 20-20-20'],
  },
  {
    id: 'memory',
    title: 'Miền Ký Ức & Khu Vinh Danh',
    description:
      'Kể lại thanh xuân bằng chuyến cuộn phim 3700px và quả cầu ký ức 3D Fibonacci — nơi những khoảnh khắc đẹp nhất của tập thể được lưu giữ mãi mãi.',
    icon: Sparkles,
    accent: 'violet',
    span: 'lg',
    bullets: ['Kể chuyện thị sai nhiều lớp', 'Quả cầu ảnh 3D tương tác 360°', 'Bảng vinh danh thành tích'],
  },
];

export const SHOWCASE_STEPS: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  points: string[];
}[] = [
  {
    id: 'ask',
    eyebrow: 'Bước 01',
    title: 'Hỏi đúng người, đúng môn',
    description:
      'Đăng câu hỏi kèm chủ đề môn học, hoặc ẩn danh khi bạn cần sự riêng tư. Cộng đồng và Ban Quản Trị cùng kiểm duyệt để mọi câu trả lời đều đáng tin.',
    icon: BookOpenCheck,
    points: ['Gắn thẻ môn học & mức độ khó', 'Ẩn danh với bút danh Ghibli', 'Thông báo khi có lời giải mới'],
  },
  {
    id: 'belong',
    eyebrow: 'Bước 02',
    title: 'Tìm câu lạc bộ của riêng bạn',
    description:
      'Từ lập trình, truyền thông đến bóng rổ và học thuật — mỗi câu lạc bộ có không gian đăng bài, thành viên và lịch hoạt động riêng.',
    icon: Compass,
    points: ['Đăng ký thành lập CLB mới', 'Bảng tin & slogan riêng', 'Duyệt minh bạch trong 24h'],
  },
  {
    id: 'grow',
    eyebrow: 'Bước 03',
    title: 'Học tập trung, ghi dấu thành tích',
    description:
      'Bật Focus Sanctuary để học sâu, tích Coin mỗi ngày và leo bảng vinh danh. Hồ sơ năng lực của bạn được xây dựng theo cách tự nhiên nhất.',
    icon: Target,
    points: ['Đồng hồ học tự do + nhật ký giờ học', 'Mốc học ngày & phần thưởng Coin', '8 danh hiệu học sinh vinh danh'],
  },
];

export const BENEFITS: {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  stat: string;
  statLabel: string;
}[] = [
  {
    id: 'speed',
    title: 'Trả lời nhanh hơn, ghi nhớ sâu hơn',
    description:
      'Câu hỏi được phân loại theo môn học và ngữ cảnh, giúp người trả lời tìm thấy đúng chủ đề. Lời giải hay nhất luôn nằm ở đầu để bạn không mất thời gian đọc lại.',
    icon: Zap,
    stat: '13',
    statLabel: 'chủ đề học thuật',
  },
  {
    id: 'community',
    title: 'Không còn học một mình',
    description:
      'Nhóm học, kênh chat và câu lạc bộ giúp bạn tìm được những người cùng mục tiêu. Hoạt động cộng đồng còn giúp hồ sơ của bạn nổi bật hơn.',
    icon: Users,
    stat: '4',
    statLabel: 'kênh kết nối',
  },
  {
    id: 'discipline',
    title: 'Kỷ luật học tập được tự động hoá',
    description:
      'Chuỗi ngày, nhắc nhở và mục tiêu học tập rõ ràng giúp bạn duy trì động lực. Mỗi phiên học đều được ghi nhận thành XP và cấp độ.',
    icon: Gauge,
    stat: '150',
    statLabel: 'cấp độ ghi nhận',
  },
  {
    id: 'trust',
    title: 'Môi trường an toàn, kiểm duyệt rõ ràng',
    description:
      'Ban Quản Trị duyệt nội dung, xử lý báo cáo và minh bạch tiêu chí. Dữ liệu học tập của bạn thuộc về bạn, và bạn có thể đăng xuất hay xoá dữ liệu bất cứ lúc nào.',
    icon: ShieldCheck,
    stat: '24h',
    statLabel: 'thời gian kiểm duyệt',
  },
];

/**
 * Khối "Năng lực hệ thống" trên trang giới thiệu.
 * Trước đây chỗ này là 6 lời chứng thực của những sinh viên mô phỏng (kèm bậc
 * danh hiệu ảo) — đã bị xoá cùng toàn bộ tài khoản ảo ở vòng 11. Nay mỗi thẻ
 * mô tả đúng một tính năng đang chạy thật trong ứng dụng.
 */
export const HIGHLIGHTS: {
  id: string;
  tag: string;
  title: string;
  body: string;
  icon: 'qa' | 'chat' | 'rank' | 'focus' | 'clubs' | 'memory';
  from: string;
  to: string;
}[] = [
  {
    id: 'h1',
    tag: 'Hỏi đáp',
    title: 'Câu hỏi ẩn danh, lời giải chọn lọc',
    body: 'Đăng câu hỏi dưới bút danh, nhận lời giải chi tiết và bình chọn “Lời giải hay nhất” để đáp án đúng luôn nằm trên cùng.',
    icon: 'qa',
    from: '#fbbf24',
    to: '#f97316',
  },
  {
    id: 'h2',
    tag: 'Phòng chat',
    title: 'Kênh chung và kênh riêng cho CLB',
    body: 'Tin nhắn thời gian thực, đồng bộ tức thời giữa các tab và mọi người trong trường, kèm bộ đếm chờ chống spam.',
    icon: 'chat',
    from: '#38bdf8',
    to: '#818cf8',
  },
  {
    id: 'h3',
    tag: 'Danh hiệu',
    title: '8 bậc danh hiệu tính từ dữ liệu thật',
    body: 'XP chỉ đến từ câu hỏi, câu trả lời, lời giải hay nhất và phiên học thật — huy hiệu tự tiến bậc, không có tài khoản ảo trên bảng.',
    icon: 'rank',
    from: '#34d399',
    to: '#22d3ee',
  },
  {
    id: 'h4',
    tag: 'Tập trung',
    title: 'Focus Sanctuary và nhật ký giờ học',
    body: 'Đồng hồ học tự do, mục tiêu 25 / 60 / 120 phút; dừng bất cứ lúc nào để ghi thời lượng thật vào nhật ký theo ngày, tuần, tháng.',
    icon: 'focus',
    from: '#a855f7',
    to: '#6366f1',
  },
  {
    id: 'h5',
    tag: 'Câu lạc bộ',
    title: 'CLB có duyệt, có lý do phản hồi',
    body: 'Tạo CLB, đăng bài trong kênh riêng và để Ban Quản Trị duyệt minh bạch — hồ sơ năng lực dày lên theo hoạt động thật.',
    icon: 'clubs',
    from: '#f472b6',
    to: '#a855f7',
  },
  {
    id: 'h6',
    tag: 'Ký ức',
    title: 'Khu Vinh Danh lưu lại cột mốc học đường',
    body: 'Mỗi mùa học để lại một quả cầu ký ức: ảnh, cột mốc và những con số thật của cả trường trong học kỳ đó.',
    icon: 'memory',
    from: '#fbbf24',
    to: '#ec4899',
  },
];

export const PRICING_PLANS: {
  id: string;
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  cta: string;
  highlight?: boolean;
  badge?: string;
  features: string[];
  footnote?: string;
}[] = [
  {
    id: 'student',
    name: 'Sinh viên',
    tagline: 'Dành cho mọi sinh viên, trọn đời miễn phí.',
    monthly: 0,
    yearly: 0,
    cta: 'Tham gia miễn phí',
    features: [
      'Hỏi đáp không giới hạn theo môn học',
      'Tham gia tất cả câu lạc bộ công khai',
      '4 kênh chat thời gian thực',
      'Focus Sanctuary & nhật ký giờ học',
      'Hệ thống Coin, chuỗi ngày, 8 danh hiệu',
      'Miền Ký Ức & Khu Vinh Danh',
    ],
    footnote: 'Không quảng cáo, không phí ẩn.',
  },
  {
    id: 'pro',
    name: 'Pro Học tập',
    tagline: 'Tăng tốc mùa thi với công cụ học sâu.',
    monthly: 49000,
    yearly: 470000,
    cta: 'Nhận ưu đãi Early Access',
    highlight: true,
    badge: 'Sắp ra mắt',
    features: [
      'Tất cả quyền lợi gói Sinh viên',
      'Bảng lệnh ⌘K, Sổ tay nhanh & nhắc nghỉ mắt 20-20-20',
      'Thống kê tiến độ học tập theo tuần',
      'Chế độ thi đua nhóm & bảng xếp hạng riêng',
      'Huy hiệu Pro & khung hồ sơ đặc biệt',
      'Hỗ trợ ưu tiên từ Ban Quản Trị',
    ],
    footnote: 'Đăng ký để nhận 50% học phí 3 tháng đầu.',
  },
  {
    id: 'org',
    name: 'Khoa & Câu lạc bộ',
    tagline: 'Không gian điều hành cho tổ chức sinh viên.',
    monthly: -1,
    yearly: -1,
    cta: 'Liên hệ Ban Quản Trị',
    features: [
      'Tất cả quyền lợi gói Pro cho thành viên',
      'Trang quản trị câu lạc bộ & thành viên',
      'Thống kê tương tác và báo cáo học kỳ',
      'Đồng hành triển khai sự kiện cùng F-Forum',
      'Phân quyền nhiều quản trị viên',
    ],
    footnote: 'Miễn phí cho các câu lạc bộ chính thức của trường.',
  },
];

export const FAQ_ITEMS: { id: string; question: string; answer: string }[] = [
  {
    id: 'f1',
    question: 'F-Forum có thật sự miễn phí không?',
    answer:
      'Có. Toàn bộ tính năng học tập cốt lõi — hỏi đáp, câu lạc bộ, phòng chat, Coin và Focus Sanctuary — miễn phí trọn đời cho sinh viên. Gói Pro chỉ là lớp tiện ích bổ sung đang trong giai đoạn thử nghiệm và bạn không cần dùng nó để học tốt hơn.',
  },
  {
    id: 'f2',
    question: 'Làm sao để bắt đầu sử dụng?',
    answer:
      'Bạn đăng nhập bằng tài khoản Google hoặc email trong khoảng 30 giây, chọn môn học quan tâm, rồi đặt câu hỏi đầu tiên hoặc tham gia một câu lạc bộ. Không cần thẻ, không cần xác minh phức tạp.',
  },
  {
    id: 'f3',
    question: 'Câu hỏi ẩn danh có thật sự an toàn?',
    answer:
      'Có. Khi bật chế độ ẩn danh, nội dung hiển thị dưới bút danh do hệ thống sinh ra và danh tính của bạn không xuất hiện với người khác. Ban Quản Trị vẫn có thể hỗ trợ riêng khi cần thiết.',
  },
  {
    id: 'f4',
    question: 'Hệ thống điểm Coin và danh hiệu hoạt động thế nào?',
    answer:
      'Mỗi hoạt động có ích — trả lời được bình chọn, hoàn thành phiên học tập trung, duy trì chuỗi ngày — đều cộng Coin. Coin tích luỹ giúp nâng hạng và mở khoá 8 danh hiệu vinh danh hiển thị trên hồ sơ của bạn.',
  },
  {
    id: 'f5',
    question: 'Tôi có thể lập câu lạc bộ riêng trên F-Forum?',
    answer:
      'Có. Bạn gửi đề xuất câu lạc bộ kèm mục tiêu, thành viên sáng lập và slogan. Ban Quản Trị phản hồi trong vòng 24 giờ; nếu chưa đạt, bạn nhận lý do cụ thể để chỉnh sửa.',
  },
  {
    id: 'f6',
    question: 'Dữ liệu của tôi được xử lý ra sao?',
    answer:
      'Nền tảng chỉ lưu những dữ liệu cần cho hoạt động học tập như tên hiển thị, email, Coin và nội dung bạn đăng. Bạn có thể đăng xuất, xoá bài viết hoặc yêu cầu xoá dữ liệu bất cứ lúc nào từ phần cài đặt hồ sơ.',
  },
];

export const TRUST_PILLARS: { icon: LucideIcon; label: string }[] = [
  { icon: BadgeCheck, label: 'Kiểm duyệt nội dung' },
  { icon: Lock, label: 'Riêng tư dữ liệu học tập' },
  { icon: BellRing, label: 'Không quảng cáo' },
  { icon: Moon, label: 'Dark mode chống mỏi mắt' },
  { icon: Bot, label: 'Presence & gợi ý thông minh' },
  { icon: Flame, label: 'Chuỗi ngày học tập' },
  { icon: GraduationCap, label: 'Thiết kế cho sinh viên FPT' },
];
