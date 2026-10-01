import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck,
  BellRing,
  BookOpenCheck,
  Bot,
  Compass,
  Flame,
  Gauge,
  GraduationCap,
  Headphones,
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
    title: 'XP, chuỗi ngày & 10 bậc huy hiệu',
    description:
      'Mỗi câu trả lời hữu ích, mỗi buổi học tập trung đều được ghi nhận. Hệ thống 150 cấp độ và 10 bậc huy hiệu Roman biến việc học thành hành trình có thưởng.',
    icon: Trophy,
    accent: 'amber',
    span: 'md',
  },
  {
    id: 'focus',
    title: 'Focus Sanctuary',
    description:
      'Pomodoro tích hợp cùng âm thanh môi trường tổng hợp 432Hz (mưa, sóng biển, thư viện) — không tải tệp nặng, không làm gián đoạn dòng tập trung.',
    icon: Headphones,
    accent: 'emerald',
    span: 'md',
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
      'Bật Focus Sanctuary để học sâu, tích XP mỗi ngày và leo bảng vinh danh. Hồ sơ năng lực của bạn được xây dựng theo cách tự nhiên nhất.',
    icon: Target,
    points: ['Pomodoro + âm thanh tập trung', 'Chuỗi ngày & phần thưởng XP', 'Huy hiệu 10 bậc Roman'],
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
      'Chuỗi ngày, nhắc nhở và âm thanh tập trung sinh học giúp bạn duy trì động lực. Mỗi phiên học đều được ghi nhận thành XP và cấp độ.',
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

export const TESTIMONIALS: {
  id: string;
  quote: string;
  name: string;
  role: string;
  initials: string;
  from: string;
  to: string;
  tier: string;
}[] = [
  {
    id: 't1',
    quote:
      'Mình đăng câu hỏi lúc 22h và có lời giải chi tiết trước khi đi ngủ. Phần “Lời giải hay nhất” giúp mình tiết kiệm hẳn nửa tiếng đọc lan man.',
    name: 'Minh Anh',
    role: 'Sinh viên K19 · Công nghệ thông tin',
    initials: 'MA',
    from: '#fbbf24',
    to: '#f97316',
    tier: 'Bậc III',
  },
  {
    id: 't2',
    quote:
      'Tham gia CLB Lập trình qua F-Forum là bước ngoặt của mình. Có nơi để hỏi, có người cùng làm dự án, và hồ sơ năng lực cứ thế dày lên.',
    name: 'Khánh Linh',
    role: 'Sinh viên K18 · Kỹ thuật phần mềm',
    initials: 'KL',
    from: '#38bdf8',
    to: '#818cf8',
    tier: 'Bậc IV',
  },
  {
    id: 't3',
    quote:
      'Focus Sanctuary là thứ mình dùng mỗi tối. Tiếng mưa 432Hz cộng với Pomodoro khiến việc học 2 tiếng trôi qua rất nhẹ.',
    name: 'Minh Quân',
    role: 'Sinh viên K19 · Anh ngữ',
    initials: 'MQ',
    from: '#34d399',
    to: '#22d3ee',
    tier: 'Bậc IV',
  },
  {
    id: 't4',
    quote:
      'Khu Vinh Danh cuối học kỳ khiến cả khoa phải bấm vào xem. Nhìn lại quả cầu ký ức 3D, mình thấy một học kỳ thật trọn vẹn.',
    name: 'Thanh Trúc',
    role: 'Sinh viên K17 · Truyền thông',
    initials: 'TT',
    from: '#f472b6',
    to: '#a855f7',
    tier: 'Bậc V',
  },
  {
    id: 't5',
    quote:
      'Mình hỏi ẩn danh những chuyện khó nói về áp lực học tập và được Ban Quản Trị phản hồi riêng. Điều đó khiến mình tin tưởng nền tảng này.',
    name: 'Hoàng Nam',
    role: 'Sinh viên K20 · Học thuật',
    initials: 'HN',
    from: '#94a3b8',
    to: '#64748b',
    tier: 'Bậc II',
  },
  {
    id: 't6',
    quote:
      'Cả nhóm mình chuyển từ nhóm chat rời rạc sang F-Forum. Tin nhắn đồng bộ, có kênh riêng cho CLB, chẳng bỏ sót deadline nào.',
    name: 'Quốc Bảo',
    role: 'Trưởng CLB Truyền thông',
    initials: 'QB',
    from: '#fbbf24',
    to: '#ec4899',
    tier: 'Bậc V',
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
      'Focus Sanctuary & âm thanh 432Hz',
      'Hệ thống XP, chuỗi ngày, 10 bậc huy hiệu',
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
      'Kho lời giải ưu tiên & ôn tập thông minh',
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
      'Có. Toàn bộ tính năng học tập cốt lõi — hỏi đáp, câu lạc bộ, phòng chat, XP và Focus Sanctuary — miễn phí trọn đời cho sinh viên. Gói Pro chỉ là lớp tiện ích bổ sung đang trong giai đoạn thử nghiệm và bạn không cần dùng nó để học tốt hơn.',
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
    question: 'Hệ thống điểm XP và huy hiệu hoạt động thế nào?',
    answer:
      'Mỗi hoạt động có ích — trả lời được bình chọn, hoàn thành phiên học tập trung, duy trì chuỗi ngày — đều cộng XP. XP tích luỹ lên tối đa 150 cấp độ và 10 bậc huy hiệu Roman hiển thị trên hồ sơ của bạn.',
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
      'Nền tảng chỉ lưu những dữ liệu cần cho hoạt động học tập như tên hiển thị, email, XP và nội dung bạn đăng. Bạn có thể đăng xuất, xoá bài viết hoặc yêu cầu xoá dữ liệu bất cứ lúc nào từ phần cài đặt hồ sơ.',
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
