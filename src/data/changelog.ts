/* Bản quyền trí tuệ thuộc về BroAmStuck */
import type { ReleaseHighlight, ReleaseNote, RoadmapItem } from '../types';

export const CURRENT_VERSION = '2.4.0';
export const CURRENT_RELEASE_DATE = '2026-10-04';

export function formatReleaseDate(date: string): string {
  return date.split('-').reverse().join('/');
}

export const RELEASE_KIND_META: Record<
  ReleaseHighlight['kind'],
  { label: string; className: string }
> = {
  feature: {
    label: 'Tính năng mới',
    className: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200',
  },
  improvement: {
    label: 'Cải tiến',
    className: 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200',
  },
  fix: {
    label: 'Sửa lỗi',
    className: 'border-amber-400/40 bg-amber-500/15 text-amber-200',
  },
  security: {
    label: 'Bảo mật',
    className: 'border-rose-400/40 bg-rose-500/15 text-rose-200',
  },
};

export const ROADMAP_STATUS_META: Record<
  RoadmapItem['status'],
  { label: string; className: string; dot: string }
> = {
  shipped: {
    label: 'Đã phát hành',
    className: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300',
    dot: 'bg-emerald-400',
  },
  'in-progress': {
    label: 'Đang triển khai',
    className: 'border-amber-400/40 bg-amber-500/15 text-amber-300',
    dot: 'bg-amber-400',
  },
  planned: {
    label: 'Đã lên kế hoạch',
    className: 'border-cyan-400/40 bg-cyan-500/15 text-cyan-300',
    dot: 'bg-cyan-400',
  },
  exploring: {
    label: 'Đang khảo sát',
    className: 'border-purple-400/40 bg-purple-500/15 text-purple-300',
    dot: 'bg-purple-400',
  },
};

export const RELEASES: ReleaseNote[] = [
  {
    version: '2.4.0',
    date: '2026-10-04',
    codename: 'Phòng Ôn Tập & Leitner Engine',
    title: 'Phòng Ôn Tập Leitner 6 Hộp, Bộ Thẻ Học Tập & Bảng Tin Cập Nhật',
    summary:
      'Bổ sung không gian ôn thi toàn diện cho học sinh sinh viên với thuật toán lặp lại ngắt quãng Leitner 6 hộp, tạo và chia sẻ bộ thẻ flashcard, phòng thi trắc nghiệm bấm giờ 20 giây và bảng tin cập nhật minh bạch.',
    highlights: [
      {
        kind: 'feature',
        text: 'Phòng Ôn Tập Leitner 6 hộp hỗ trợ thẻ lật 3D, tự đánh giá 4 cấp độ và thi trắc nghiệm tính giờ 20 giây.',
      },
      {
        kind: 'feature',
        text: 'Bộ công cụ tạo bộ thẻ flashcard, nhập nhanh hàng loạt theo cú pháp, chia sẻ công khai và sao chép bộ thẻ bạn bè.',
      },
      {
        kind: 'improvement',
        text: 'Bảng tin Cập nhật mới thay thế hoàn toàn trang chờ cũ với nhật ký 6 phiên bản phát hành và lộ trình minh bạch.',
      },
      {
        kind: 'security',
        text: 'Đồng bộ tức thì bộ thẻ và phiên ôn tập qua WebSocket, kiểm soát quyền sở hữu và phòng chống can thiệp từ client.',
      },
      {
        kind: 'fix',
        text: 'Khắc phục hoàn toàn lỗi phân trang khi duyệt danh sách câu hỏi lớn và tối ưu bộ nhớ đệm lịch sử phiên.',
      },
    ],
  },
  {
    version: '2.3.0',
    date: '2026-10-03',
    codename: 'Hồ Sơ Gaming & Radar Năng Lực',
    title: 'Thẻ Hologram 3D, UserQuickCard, Radar Phân Môn & Tải Ảnh Bìa 15MB',
    summary:
      'Nâng cấp toàn bộ trải nghiệm hồ sơ cá nhân theo tiêu chuẩn kính mờ 3D trong suốt, bổ sung thẻ popover nhanh trong khung chat, biểu đồ radar 5 trục năng lực học tập và cho phép tải ảnh bìa dung lượng cao.',
    highlights: [
      {
        kind: 'feature',
        text: 'Thẻ cá nhân UserQuickCard bật ngay tại vị trí nhấp chuột trong phòng chat và diễn đàn hỏi đáp học tập.',
      },
      {
        kind: 'feature',
        text: 'Hỗ trợ tải lên ảnh bìa tùy biến lên đến 15MB với trình nén thông minh trực tiếp trong trình duyệt.',
      },
      {
        kind: 'improvement',
        text: 'Biểu đồ radar 5 trục năng lực phân môn (KHTN, KHXH, KHCN, Ngoại Ngữ, Nghệ Thuật) dựa 100% trên dữ liệu thật.',
      },
      {
        kind: 'fix',
        text: 'Sửa lỗi lệch tâm popover cài đặt khi thanh điều hướng chuyển đổi giữa 4 vị trí neo màn hình.',
      },
    ],
  },
  {
    version: '2.2.0',
    date: '2026-10-02',
    codename: 'Bảo Mật Máy Chủ & Điểm Danh 15 Ngày',
    title: 'Mã Hóa Mật Khẩu scryptSync, Câu Hỏi Vui Trivia & Rương Bí Ẩn',
    summary:
      'Tăng cường an toàn tài khoản với cơ chế băm mật khẩu chuẩn mật mã scryptSync, xác thực token phiên ngẫu nhiên, ra mắt chuỗi điểm danh 15 ngày có quà rương bí ẩn và câu hỏi vui trí tuệ mỗi ngày.',
    highlights: [
      {
        kind: 'security',
        text: 'Cơ chế băm mật khẩu scryptSync an toàn tuyệt đối chống tấn công vét cạn và bảo vệ toàn bộ dữ liệu tài khoản.',
      },
      {
        kind: 'feature',
        text: 'Chuỗi điểm danh học đường 15 ngày liên tục với phần thưởng rương bí ẩn xanh, vàng và đỏ tại các mốc ngày.',
      },
      {
        kind: 'feature',
        text: 'Ngân hàng câu hỏi trắc nghiệm kiến thức thường thức hàng ngày có tính giờ 15 giây và cộng Coin thưởng.',
      },
      {
        kind: 'improvement',
        text: 'Bảng xếp hạng thành viên hăng hái lọc theo mốc thời gian tuần, tháng, năm và toàn thời gian.',
      },
    ],
  },
  {
    version: '2.1.0',
    date: '2026-10-01',
    codename: 'Thanh Điều Hướng Liquid Capsule',
    title: 'Navbar Kính Mờ iOS 26, Liquid Active Pill & Menu Radial Xoay Tròn',
    summary:
      'Thiết kế lại hoàn toàn thanh điều hướng theo ngôn ngữ kính lỏng hiện đại, tự động thu nhỏ khi không thao tác, chỉ báo tab dạng giọt nước đàn hồi và menu phím tắt tròn phân bổ lượng giác sin cos.',
    highlights: [
      {
        kind: 'feature',
        text: 'Thanh điều hướng kiểu viên thuốc kính nổi có khả năng tự thu gọn thành hàng biểu tượng khi rời chuột.',
      },
      {
        kind: 'feature',
        text: 'Menu tác vụ nhanh RadialQuickMenu xoay tròn mở rộng mượt mà theo công thức lượng giác toán học.',
      },
      {
        kind: 'improvement',
        text: 'Chỉ báo tab đang hoạt động hiệu ứng giọt nước động co giãn mượt mà theo kích thước từng đề mục.',
      },
      {
        kind: 'fix',
        text: 'Khắc phục xung đột phím tắt chuyển đổi giao diện khi đang nhập nội dung trong khung soạn thảo câu hỏi.',
      },
    ],
  },
  {
    version: '2.0.0',
    date: '2026-09-28',
    codename: 'Kinh Tế Coin & Cửa Hàng Vật Phẩm',
    title: 'Hệ Thống Tiền Tệ Coin Thống Nhất, Cửa Hàng Chill Box & Cược Hỏi Đáp',
    summary:
      'Đại cập nhật chuyển đổi toàn bộ điểm kinh nghiệm thành đơn vị Coin thống nhất, mở cửa hàng đổi phụ kiện trang trí ảo Chill Box, đặt thưởng tiền cược cho câu hỏi khó và thăng hạng 8 cấp bậc học sinh.',
    highlights: [
      {
        kind: 'feature',
        text: 'Hệ thống điểm thưởng Coin duy nhất dùng để thăng cấp, mở khóa tính năng và mua sắm vật phẩm trang trí.',
      },
      {
        kind: 'feature',
        text: 'Cửa hàng Chill Box cung cấp các vật phẩm sưu tầm ảo với các cấp độ màu sắc độc đáo từ thường đến thần thoại.',
      },
      {
        kind: 'feature',
        text: 'Cơ chế cược Coin cho câu hỏi để khuyến khích lời giải nhanh, người trả lời xuất sắc nhận 50% tiền thưởng.',
      },
      {
        kind: 'improvement',
        text: 'Tiến trình thăng hạng 8 cấp bậc thuần Việt từ Học Sinh đến Chuyên Gia với biểu tượng thiết kế riêng biệt.',
      },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-09-20',
    codename: 'Khởi Nguyên F-Forum',
    title: 'Phát Hành Nền Tảng Học Tập Cộng Đồng F-Forum Bản Chính Thức',
    summary:
      'Ra mắt phiên bản đầu tiên của diễn đàn học sinh F-Forum bao gồm hệ thống hỏi đáp học tập, không gian sinh hoạt câu lạc bộ ngoại khóa, phòng chat trực tuyến thời gian thực và xác thực đăng nhập bảo mật.',
    highlights: [
      {
        kind: 'feature',
        text: 'Diễn đàn hỏi đáp học tập đa môn với hỗ trợ gõ công thức toán học và đính kèm tệp bài tập dung lượng cao.',
      },
      {
        kind: 'feature',
        text: 'Phòng trò chuyện trực tuyến thời gian thực kết nối mạng nội bộ trường học với độ trễ siêu thấp.',
      },
      {
        kind: 'feature',
        text: 'Phân hệ quản lý câu lạc bộ học thuật và ngoại khóa cho phép thành lập và nộp đơn ứng tuyển trực tiếp.',
      },
      {
        kind: 'security',
        text: 'Hệ thống tài khoản và phân quyền chặt chẽ giữa học sinh, trưởng ban câu lạc bộ và ban quản trị.',
      },
    ],
  },
];

export const ROADMAP: RoadmapItem[] = [
  {
    id: 'study-leitner',
    title: 'Phòng Ôn Tập Leitner 6 Hộp & Thẻ Ghi Nhớ',
    description: 'Động cơ lặp lại ngắt quãng khoa học giúp học sinh ghi nhớ bài lâu dài và tự động sinh đề luyện tập.',
    status: 'shipped',
    progress: 100,
    kind: 'feature',
    horizon: 'v2.4.0',
  },
  {
    id: 'update-hub-release',
    title: 'Bảng Tin Cập Nhật & Đóng Góp Ý Kiến',
    description: 'Nhật ký phát hành công khai, lộ trình phát triển minh bạch và hòm thư thu nhận đề xuất từ cộng đồng.',
    status: 'shipped',
    progress: 100,
    kind: 'improvement',
    horizon: 'v2.4.0',
  },
  {
    id: 'group-study-room',
    title: 'Phòng Học Nhóm Pomodoro Trực Tuyến',
    description: 'Không gian học chung có đồng hồ Pomodoro bấm giờ đồng bộ nhiều người, bảng trắng chia sẻ và nhạc tập trung lofi.',
    status: 'in-progress',
    progress: 65,
    kind: 'feature',
    horizon: 'v2.5.0',
  },
  {
    id: 'ai-tutor-assistant',
    title: 'Trợ Lý AI Gợi Ý Lời Giải & Hướng Dẫn Tư Duy',
    description: 'Tích hợp AI hướng dẫn từng bước giải bài tập, không đưa trực tiếp đáp số mà khơi gợi phương pháp tư duy.',
    status: 'in-progress',
    progress: 40,
    kind: 'feature',
    horizon: 'v2.5.0',
  },
  {
    id: 'exam-countdown-widget',
    title: 'Đồng Hồ Đếm Ngược Kỳ Thi & Lịch Thi Đấu',
    description: 'Tiện ích ghim lịch thi cử học kỳ, thi thử tốt nghiệp và các giải đấu học thuật lớn của trường học.',
    status: 'planned',
    progress: 15,
    kind: 'improvement',
    horizon: 'v2.6.0',
  },
  {
    id: 'mobile-app-pwa',
    title: 'Ứng Dụng Di Động PWA Hỗ Trợ Offline',
    description: 'Cài đặt trực tiếp lên điện thoại iOS và Android như app bản địa, cho phép ôn thẻ flashcard ngay cả khi mất mạng.',
    status: 'planned',
    progress: 10,
    kind: 'feature',
    horizon: 'v2.6.0',
  },
  {
    id: 'peer-code-sandbox',
    title: 'Môi Trường Chạy Thử Mã Nguồn Lập Trình Trực Tuyến',
    description: 'Hỗ trợ biên dịch và chạy thử code Python, C++, JavaScript ngay trong bài hỏi đáp môn Tin học.',
    status: 'exploring',
    progress: 5,
    kind: 'feature',
    horizon: 'v2.7.0',
  },
  {
    id: 'cross-campus-olympiad',
    title: 'Đấu Trường Trí Tuệ Liên Cơ Sở',
    description: 'Các giải đấu đối kháng trắc nghiệm tính giờ trực tiếp giữa các lớp và các phân hiệu trên toàn quốc.',
    status: 'exploring',
    progress: 0,
    kind: 'feature',
    horizon: 'v2.7.0',
  },
];
