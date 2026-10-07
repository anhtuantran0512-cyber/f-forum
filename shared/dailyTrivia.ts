/* Bản quyền trí tuệ thuộc về BroAmStuck */

export interface TriviaQuestion {
  question: string;
  options: string[];
  correct: number;
}

/** Bộ câu hỏi dùng chung ở client và server; đáp án phải được server kiểm tra. */
export const TRIVIA_POOL: readonly TriviaQuestion[] = [
  {
    question: 'Thung lũng McMurdo (thung lũng Khô) nằm ở châu lục nào?',
    options: ['Châu Úc', 'Châu Phi', 'Châu Mỹ', 'Châu Nam Cực'],
    correct: 3,
  },
  {
    question: 'Kim loại nào có tính dẫn điện tốt nhất ở điều kiện thường?',
    options: ['Vàng (Au)', 'Bạc (Ag)', 'Đồng (Cu)', 'Nhôm (Al)'],
    correct: 1,
  },
  {
    question: 'Tác phẩm "Bình Ngô Đại Cáo" được sáng tác bởi danh nhân nào?',
    options: ['Nguyễn Trãi', 'Lê Lợi', 'Nguyễn Du', 'Trần Hưng Đạo'],
    correct: 0,
  },
  {
    question: 'Đơn vị đo cường độ dòng điện trong hệ SI là gì?',
    options: ['Volt (V)', 'Watt (W)', 'Ampere (A)', 'Ohm (Ω)'],
    correct: 2,
  },
  {
    question: 'Nguyên tố hóa học nào có ký hiệu "Fe"?',
    options: ['Flo', 'Sắt', 'Phốt pho', 'Fermi'],
    correct: 1,
  },
  {
    question: 'Sông nào dài nhất Việt Nam?',
    options: ['Sông Mã', 'Sông Hồng', 'Sông Đồng Nai', 'Sông Đà'],
    correct: 2,
  },
  {
    question: 'Trong Pascal, kiểu dữ liệu nào lưu được số thực?',
    options: ['Integer', 'Boolean', 'Real', 'Char'],
    correct: 2,
  },
  {
    question: 'Vận tốc ánh sáng trong chân không xấp xỉ bao nhiêu?',
    options: ['300.000 km/s', '150.000 km/s', '300.000 m/s', '30.000 km/s'],
    correct: 0,
  },
  {
    question: 'Ai là tác giả của "Truyện Kiều"?',
    options: ['Nguyễn Du', 'Hồ Xuân Hương', 'Nguyễn Đình Chiểu', 'Xuân Diệu'],
    correct: 0,
  },
  {
    question: 'Nước có công thức hóa học là gì?',
    options: ['CO2', 'H2O', 'O2', 'NaCl'],
    correct: 1,
  },
  {
    question: 'Đỉnh núi cao nhất Việt Nam là?',
    options: ['Phan Xi Păng', 'Bạch Mã', 'Bà Đen', 'Ngọc Linh'],
    correct: 0,
  },
  {
    question: 'Số nào sau đây là số nguyên tố?',
    options: ['51', '57', '53', '55'],
    correct: 2,
  },
];

/** Ngày vận hành hiển thị theo múi giờ cấu hình, mặc định Việt Nam. */
export const dateKeyInTimeZone = (
  value: number | Date = Date.now(),
  timeZone = 'Asia/Ho_Chi_Minh',
): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value instanceof Date ? value : new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

export const shiftDateKey = (dateKey: string, amount: number): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return '';
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
};

export const dailyTriviaForDate = (dateKey: string): TriviaQuestion => {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i += 1) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) % 100000;
  }
  return TRIVIA_POOL[hash % TRIVIA_POOL.length];
};
