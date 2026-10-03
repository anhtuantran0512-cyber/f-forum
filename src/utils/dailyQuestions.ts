/* Bản quyền trí tuệ thuộc về BroAmStuck */

export interface DailyQuestion {
  id: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export const DAILY_QUESTIONS: DailyQuestion[] = [
  {
    id: 'si-current',
    question: 'Đơn vị đo cường độ dòng điện trong hệ SI là gì?',
    options: ['Volt (V)', 'Watt (W)', 'Ampere (A)', 'Ohm (Ω)'],
    answer: 2,
    explanation: 'Cường độ dòng điện được đo bằng ampere (A).',
  },
  {
    id: 'nguyen-trai',
    question: 'Ai là tác giả của Bình Ngô đại cáo?',
    options: ['Nguyễn Du', 'Nguyễn Trãi', 'Lê Thánh Tông', 'Trần Hưng Đạo'],
    answer: 1,
    explanation: 'Nguyễn Trãi soạn Bình Ngô đại cáo năm 1428.',
  },
  {
    id: 'silver-conductivity',
    question: 'Kim loại nào dẫn điện tốt nhất ở điều kiện thường?',
    options: ['Vàng', 'Đồng', 'Bạc', 'Nhôm'],
    answer: 2,
    explanation: 'Bạc có độ dẫn điện cao nhất trong các kim loại ở điều kiện thường.',
  },
  {
    id: 'antarctic-dry-valleys',
    question: 'Thung lũng Khô McMurdo nằm ở châu lục nào?',
    options: ['Châu Á', 'Châu Phi', 'Châu Nam Cực', 'Châu Âu'],
    answer: 2,
    explanation: 'Thung lũng Khô McMurdo nằm tại Nam Cực.',
  },
  {
    id: 'photosynthesis',
    question: 'Sắc tố nào giúp thực vật hấp thụ ánh sáng để quang hợp?',
    options: ['Hemoglobin', 'Melanin', 'Chlorophyll', 'Keratin'],
    answer: 2,
    explanation: 'Chlorophyll (diệp lục) hấp thụ năng lượng ánh sáng cho quang hợp.',
  },
  {
    id: 'pithagoras',
    question: 'Trong tam giác vuông, định lý Pythagoras liên hệ những cạnh nào?',
    options: ['Hai góc nhọn', 'Hai cạnh góc vuông và cạnh huyền', 'Chu vi và diện tích', 'Bán kính và đường kính'],
    answer: 1,
    explanation: 'Bình phương cạnh huyền bằng tổng bình phương hai cạnh góc vuông.',
  },
  {
    id: 'water-boiling',
    question: 'Ở áp suất khí quyển tiêu chuẩn, nước sôi ở nhiệt độ nào?',
    options: ['0°C', '50°C', '100°C', '212°C'],
    answer: 2,
    explanation: 'Ở áp suất 1 atm, nước sôi ở 100°C.',
  },
  {
    id: 'earth-orbit',
    question: 'Trái Đất mất khoảng bao lâu để quay một vòng quanh Mặt Trời?',
    options: ['24 giờ', '30 ngày', '365,24 ngày', '10 năm'],
    answer: 2,
    explanation: 'Một năm thiên văn dài khoảng 365,24 ngày.',
  },
  {
    id: 'binary',
    question: 'Trong hệ nhị phân, chữ số nào được sử dụng?',
    options: ['0 và 1', '1 và 2', '0 đến 7', '0 đến 9'],
    answer: 0,
    explanation: 'Hệ nhị phân chỉ dùng hai chữ số 0 và 1.',
  },
  {
    id: 'vn-capital',
    question: 'Thủ đô của Việt Nam là thành phố nào?',
    options: ['Huế', 'Đà Nẵng', 'Hà Nội', 'Cần Thơ'],
    answer: 2,
    explanation: 'Hà Nội là thủ đô của Việt Nam.',
  },
];

/** Same question for everyone on a given UTC day; changes deterministically next day. */
export function getDailyQuestion(dateKey = new Date().toISOString().slice(0, 10)): DailyQuestion {
  let hash = 2166136261;
  for (const char of dateKey) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const index = (hash >>> 0) % DAILY_QUESTIONS.length;
  return DAILY_QUESTIONS[index];
}

export function getDailyQuestionById(id: string): DailyQuestion | undefined {
  return DAILY_QUESTIONS.find((question) => question.id === id);
}
