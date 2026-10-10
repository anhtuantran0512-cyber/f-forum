/* 30 mốc danh hiệu trên 150 cấp. Không thay đổi logic XP hay 8 hạng cũ. */
export type TitleRarity = 'common' | 'rare' | 'epic' | 'legendary';
const names = [
  'Học Sinh', 'Người Mở Sổ', 'Bạn Đồng Bàn', 'Người Ghi Chép', 'Người Đặt Câu Hỏi', 'Bạn Học Chủ Động',
  'Người Giữ Nhịp', 'Bạn Học Đều Đặn', 'Người Ôn Bài', 'Người Tìm Tòi', 'Bạn Học Kiên Trì', 'Người Giải Bài',
  'Người Xếp Ý', 'Người Đọc Sâu', 'Bạn Học Bền Bỉ', 'Người Kết Nối', 'Người Chia Sẻ', 'Người Phản Biện',
  'Người Thực Hành', 'Người Dẫn Nhóm', 'Người Giải Thích', 'Người Hướng Dẫn', 'Người Nghiên Cứu', 'Người Tổng Hợp',
  'Cố Vấn Học Tập', 'Người Soạn Bài', 'Người Thẩm Định', 'Người Truyền Cảm Hứng', 'Người Dẫn Đường', 'Chuyên Gia',
];
const icons = [
  'BookOpen','Pencil','Users','NotebookPen','MessageCircleQuestionMark','CircleCheck',
  'Clock3','CalendarDays','BookMarked','Search','Footprints','SquarePen',
  'ListChecks','BookText','Timer','Network','Share2','MessagesSquare',
  'FlaskConical','UsersRound','Lightbulb','Presentation','Microscope','Layers3',
  'GraduationCap','LibraryBig','ScanSearch','Sparkles','Compass','Award',
] as const;
const iconDescriptions = [
  'sách mở','bút chì','đôi bạn','sổ ghi','dấu hỏi','dấu kiểm','đồng hồ','lịch học','sách đánh dấu','kính lúp',
  'bước chân','bút giải','danh sách','trang sách','bộ đếm','mạng kết nối','mũi tên chia sẻ','đối thoại',
  'bình thí nghiệm','nhóm học','bóng đèn','bảng giảng','kính hiển vi','tầng ghi chú',
  'mũ tốt nghiệp','thư viện','khung kiểm tra','tia sáng','la bàn','huy hiệu',
];
export const TITLE_CONFIGS = names.map((name, index) => ({
  id: `title-${index + 1}`,
  name,
  minLevel: index * 5 + 1,
  rarity: (index < 8 ? 'common' : index < 16 ? 'rare' : index < 24 ? 'epic' : 'legendary') as TitleRarity,
  icon: icons[index],
  iconDescription: iconDescriptions[index],
}));
export const getTitleForLevel = (level: number) => TITLE_CONFIGS[Math.max(0, Math.min(29, Math.floor((Math.max(1, level) - 1) / 5)))];
