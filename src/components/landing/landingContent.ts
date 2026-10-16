/* Bản quyền trí tuệ thuộc về BroAmStuck */
import type { LucideIcon } from 'lucide-react';
import {
  BookOpenCheck,
  Compass,
  FileText,
  Headphones,
  HelpCircle,
  Lightbulb,
  MessagesSquare,
  Paperclip,
  ShieldCheck,
  Users,
} from 'lucide-react';

/*
 * Landing copy stays focused on academic use. Avoid live totals, simulated
 * community proof, response-time promises, and features that are not available.
 */

export const HERO_TRUST = [
  'Tập trung vào học thuật',
  'Có thể dùng bút danh',
  'Tính năng cốt lõi hiện miễn phí',
];

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
    title: 'Hỏi đáp theo môn học',
    description:
      'Mô tả điều đang vướng, thêm bối cảnh và cùng người học khác trao đổi. Những lời giải hữu ích có thể được nhận diện mà không biến lượt thích thành thước đo thành tích.',
    icon: HelpCircle,
    accent: 'amber',
    span: 'lg',
    bullets: ['Gắn câu hỏi với môn học', 'Dùng bút danh khi phù hợp', 'Giữ lời giải ngay dưới câu hỏi'],
  },
  {
    id: 'materials',
    title: 'Kho đề và học liệu',
    description:
      'Chia sẻ ảnh, PDF, DOCX hoặc Markdown. PDF có thể xem ngay trong trình duyệt; hãy kiểm tra môn học, nguồn và quyền chia sẻ của tài liệu.',
    icon: FileText,
    accent: 'sky',
    span: 'md',
  },
  {
    id: 'clubs',
    title: 'Câu lạc bộ & nhóm học',
    description:
      'Tìm không gian theo môn học hoặc mối quan tâm, theo dõi bài đăng và tiếp tục trao đổi cùng những người có chung chủ đề.',
    icon: Users,
    accent: 'violet',
    span: 'md',
  },
  {
    id: 'chat',
    title: 'Trao đổi khi cần',
    description:
      'Phòng chat phù hợp cho câu hỏi ngắn và trao đổi nhanh. Với lời giải cần lập luận hoặc muốn tìm lại sau này, hãy dùng khu vực hỏi đáp.',
    icon: MessagesSquare,
    accent: 'amber',
    span: 'md',
  },
  {
    id: 'focus',
    title: 'Góc tập trung',
    description:
      'Đồng hồ Pomodoro và âm thanh nền là công cụ tùy chọn để tự sắp xếp buổi học — không phải lời hứa về năng suất hay kết quả.',
    icon: Headphones,
    accent: 'emerald',
    span: 'md',
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
    eyebrow: 'Hỏi',
    title: 'Bắt đầu từ điều còn vướng',
    description:
      'Nêu môn học, bối cảnh và phần bạn chưa hiểu. Nếu muốn, bạn có thể dùng bút danh thay vì hiển thị tên công khai.',
    icon: BookOpenCheck,
    points: ['Gắn chủ đề môn học', 'Nói rõ điều đã thử', 'Dùng bút danh khi phù hợp'],
  },
  {
    id: 'belong',
    eyebrow: 'Trao đổi',
    title: 'Cùng học quanh một chủ đề',
    description:
      'Câu lạc bộ tạo không gian cho những mối quan tâm chung. Bài đăng và thảo luận nằm cạnh nhau để người học tiếp tục trao đổi đúng ngữ cảnh.',
    icon: Compass,
    points: ['Tìm câu lạc bộ phù hợp', 'Theo dõi bài đăng liên quan', 'Giữ trao đổi đúng chủ đề'],
  },
  {
    id: 'materials',
    eyebrow: 'Học liệu',
    title: 'Lưu tài liệu để xem lại',
    description:
      'Kho đề nhận nhiều định dạng tài liệu học tập; PDF có thể mở ngay trong trình duyệt. Tệp do thành viên chia sẻ nên hãy tự kiểm tra nguồn và thông tin môn học.',
    icon: FileText,
    points: ['Ảnh, PDF, DOCX và Markdown', 'Xem PDF trong trình duyệt', 'Chia sẻ tài liệu có quyền đăng'],
  },
];

export const BENEFITS: {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    id: 'context',
    title: 'Bối cảnh trước, lời giải sau',
    description:
      'Một câu hỏi có môn học, đề bài và chỗ đang mắc thường dễ được trao đổi đúng trọng tâm hơn một dòng chỉ xin đáp án.',
    icon: HelpCircle,
  },
  {
    id: 'reasoning',
    title: 'Cách nghĩ quan trọng như kết quả',
    description:
      'Chia sẻ các bước lập luận giúp người hỏi hiểu vì sao một cách làm có thể đúng — và khi nào nó không còn phù hợp.',
    icon: Lightbulb,
  },
  {
    id: 'verification',
    title: 'Đối chiếu, đừng tin tuyệt đối',
    description:
      'Nội dung do cộng đồng đóng góp không thay thế giáo trình hay giảng viên. Hãy kiểm tra lời giải với tài liệu của môn học.',
    icon: ShieldCheck,
  },
];

export const QUESTION_GUIDE: {
  id: string;
  tag: string;
  title: string;
  body: string;
  icon: LucideIcon;
}[] = [
  {
    id: 'context',
    tag: 'Bối cảnh',
    title: 'Nêu môn học và đề bài',
    body: 'Cho người đọc biết bạn đang học phần nào và đề bài yêu cầu gì. Chỉ trích dẫn phần cần thiết.',
    icon: BookOpenCheck,
  },
  {
    id: 'stuck',
    tag: 'Điểm mắc',
    title: 'Chỉ ra điều chưa thông',
    body: 'Nói bạn đã thử cách nào, vướng ở bước nào, hoặc muốn người khác kiểm tra giả định nào.',
    icon: HelpCircle,
  },
  {
    id: 'source',
    tag: 'Tài liệu',
    title: 'Đính kèm đúng phần liên quan',
    body: 'Thêm ảnh hoặc tài liệu khi cần, nêu nguồn và tránh chia sẻ thông tin cá nhân hay tệp không được phép đăng.',
    icon: Paperclip,
  },
];

export const PRICING_PLANS: {
  id: string;
  name: string;
  tagline: string;
  highlight?: boolean;
  badge?: string;
  features: string[];
  footnote?: string;
}[] = [
  {
    id: 'student',
    name: 'F-Forum',
    tagline: 'Các tính năng học tập cốt lõi hiện mở miễn phí cho sinh viên.',
    highlight: true,
    badge: 'ĐANG MỞ',
    features: [
      'Hỏi đáp và thảo luận theo môn học',
      'Kho đề: chia sẻ ảnh, PDF, DOCX và Markdown',
      'Câu lạc bộ và phòng trao đổi',
      'Công cụ tập trung tùy chọn',
    ],
    footnote: 'Thông tin ở đây mô tả những gì đang mở, không phải tính năng tương lai.',
  },
];

export const FAQ_ITEMS: { id: string; question: string; answer: string }[] = [
  {
    id: 'f1',
    question: 'F-Forum hiện có miễn phí không?',
    answer:
      'Các tính năng học tập cốt lõi hiện đang mở miễn phí cho sinh viên. Trang này chỉ mô tả điều kiện hiện tại; hãy xem thông báo trong ứng dụng nếu có cập nhật.',
  },
  {
    id: 'f2',
    question: 'Tôi có thể chia sẻ những định dạng tài liệu nào?',
    answer:
      'Kho đề nhận hình ảnh, PDF, DOC/DOCX và Markdown. PDF có thể xem trong trình duyệt; trước khi chia sẻ, hãy kiểm tra nguồn và quyền sử dụng tài liệu.',
  },
  {
    id: 'f3',
    question: 'Ẩn danh có nghĩa là không ai biết tôi là ai không?',
    answer:
      'Bút danh thay đổi cách câu hỏi hiển thị với thành viên khác; đây không phải công cụ bảo vệ thông tin nhạy cảm. Đừng đăng email, mã sinh viên hay dữ liệu cá nhân trong nội dung hoặc tệp đính kèm.',
  },
  {
    id: 'f4',
    question: 'Tôi có thể tin mọi lời giải trên diễn đàn không?',
    answer:
      'Không nên mặc định như vậy. Câu trả lời do thành viên đóng góp và có thể thiếu hoặc sai; hãy dùng chúng để tham khảo, rồi đối chiếu với giáo trình, đề cương hoặc giảng viên.',
  },
  {
    id: 'f5',
    question: 'Tôi nên làm gì nếu thấy nội dung không phù hợp?',
    answer:
      'Dùng công cụ báo cáo có sẵn trong ứng dụng hoặc liên hệ nhóm quản trị qua thông tin ở cuối trang. Thời gian phản hồi có thể thay đổi; đừng gửi dữ liệu nhạy cảm qua kênh công khai.',
  },
];
