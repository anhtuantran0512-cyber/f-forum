/* Bản quyền trí tuệ thuộc về BroAmStuck */
export type LearningResourceKind = 'video' | 'document' | 'official';

export interface LearningResource {
  id: string;
  kind: LearningResourceKind;
  title: string;
  provider: string;
  subject: string;
  description: string;
  url: string;
}

/**
 * Góc học tập: tài liệu và bài giảng chọn lọc cho học sinh.
 * Mỗi mục đều là nguồn công khai, đã kiểm tra truy cập trước khi đưa vào kho.
 */
export const LEARNING_RESOURCES: LearningResource[] = [
  {
    id: 'res-01',
    kind: 'video',
    title: 'Kênh bài giảng Tiếng Anh — cô Vũ Mai Phương',
    provider: 'YouTube · Vũ Mai Phương',
    subject: 'Tiếng Anh',
    description: 'Video chữa đề, ôn ngữ pháp và từ vựng bám sát định dạng tốt nghiệp THPT; phù hợp tự học theo chuyên đề.',
    url: 'https://www.youtube.com/@vumaiphuong',
  },
  {
    id: 'res-02',
    kind: 'video',
    title: 'Kênh bài giảng Hóa học — thầy Vũ Khắc Ngọc',
    provider: 'YouTube · Thầy Vũ Khắc Ngọc',
    subject: 'Hóa học',
    description: 'Bài giảng hóa hữu cơ và vô cơ lớp 12, kỹ thuật giải nhanh và chữa đề thi thật.',
    url: 'https://www.youtube.com/@vukhacngoc',
  },
  {
    id: 'res-03',
    kind: 'document',
    title: 'TOANMATH — kho đề và chuyên đề Toán THPT',
    provider: 'TOANMATH.com',
    subject: 'Toán học',
    description: 'Đề chính thức, đề tham khảo, chuyên đề và lời giải chi tiết miễn phí cho học sinh THPT.',
    url: 'https://toanmath.com',
  },
  {
    id: 'res-04',
    kind: 'document',
    title: 'Thư viện Học liệu — đề thi và lời giải',
    provider: 'thuvienhoclieu.com',
    subject: 'Đa môn',
    description: 'Kho đề tốt nghiệp THPT, đề khảo sát và lời giải theo từng môn, cập nhật theo năm học.',
    url: 'https://thuvienhoclieu.com',
  },
  {
    id: 'res-05',
    kind: 'official',
    title: 'Bộ Giáo dục và Đào tạo — thông tin kỳ thi',
    provider: 'moet.gov.vn',
    subject: 'Đa môn',
    description: 'Văn bản hướng dẫn, lịch thi và đề tham khảo chính thức của Bộ GD&ĐT.',
    url: 'https://moet.gov.vn',
  },
  {
    id: 'res-06',
    kind: 'official',
    title: 'Đánh giá năng lực HSA — ĐHQG Hà Nội',
    provider: 'hsa.edu.vn',
    subject: 'ĐGNL',
    description: 'Thông tin kỳ thi, đề minh hoạ và đăng ký dự thi đánh giá năng lực HSA.',
    url: 'https://hsa.edu.vn',
  },
  {
    id: 'res-07',
    kind: 'official',
    title: 'Đánh giá năng lực APT — ĐHQG TP.HCM',
    provider: 'thinangluc.vnuhcm.edu.vn',
    subject: 'ĐGNL',
    description: 'Cổng thông tin kỳ thi đánh giá năng lực ĐHQG TP.HCM, đề mẫu và lịch thi.',
    url: 'https://thinangluc.vnuhcm.edu.vn',
  },
];
