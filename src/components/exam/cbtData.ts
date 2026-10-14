/* Bản quyền trí tuệ thuộc về BroAmStuck */
import type { ExamPaper, ExamCBTQuestion, ExamDifficulty } from '../../types';

/* Ngân hàng câu hỏi thi thử trực tuyến chuẩn ma trận Bộ GD&ĐT */
export const SEED_CBT_QUESTIONS: Record<string, ExamCBTQuestion[]> = {
  'ex-01': [
    {
      id: 'q-ex01-1',
      number: 1,
      question: 'Cho hàm số y = f(x) có bảng biến thiên với f\'(x) đổi dấu từ âm sang dương tại x = 2 và f(2) = -3. Toạ độ điểm cực tiểu của đồ thị hàm số là:',
      options: [
        { id: 'A', text: '(2; -3)' },
        { id: 'B', text: '(-3; 2)' },
        { id: 'C', text: 'x = 2' },
        { id: 'D', text: 'y = -3' },
      ],
      correctAnswer: 'A',
      topic: 'Khảo sát hàm số & Đồ thị',
      difficulty: 'Nhận biết',
      explanation: 'Đạo hàm f\'(x) đổi dấu từ âm (-) sang dương (+) qua x = 2, do đó hàm số đạt cực tiểu tại x = 2 với giá trị cực tiểu y = f(2) = -3. Điểm cực tiểu của đồ thị hàm số là cặp toạ độ (2; -3).',
      keyFormula: 'f\'(x) đổi dấu (-) -> (+) => điểm cực tiểu; Toạ độ điểm đồ thị M(x_CT; y_CT).',
    },
    {
      id: 'q-ex01-2',
      number: 2,
      question: 'Trong không gian Oxyz, cho mặt phẳng (P): x + 2y - 2z + 4 = 0 và điểm M(2; -1; 3). Toạ độ hình chiếu vuông góc H của điểm M trên mặt phẳng (P) là:',
      options: [
        { id: 'A', text: 'H(20/9; -5/9; 23/9)' },
        { id: 'B', text: 'H(2; -1; 3)' },
        { id: 'C', text: 'H(1; 2; -2)' },
        { id: 'D', text: 'H(11/9; 5/9; -7/9)' },
      ],
      correctAnswer: 'A',
      topic: 'Hình học giải tích Oxyz',
      difficulty: 'Thông hiểu',
      explanation: 'Véctơ pháp tuyến của (P) là n = (1; 2; -2). Đường thẳng d qua M vuông góc với (P) có phương trình x = 2 + t, y = -1 + 2t, z = 3 - 2t. Thay vào (P): (2 + t) + 2(-1 + 2t) - 2(3 - 2t) + 4 = 0 <=> 9t - 2 = 0 <=> t = 2/9. Suy ra H(20/9; -5/9; 23/9).',
      keyFormula: 'd qua M vuông góc (P) => VTCP của d = VTPT của (P).',
    },
    {
      id: 'q-ex01-3',
      number: 3,
      question: 'Một doanh nghiệp sản xuất muốn tối ưu hoá chi phí vận hành theo hàm tổng chi phí C(x) = x^3 - 30x^2 + 300x (nghìn đồng) với doanh thu R(x) = 1500x. Xác định số sản phẩm x cần xuất xưởng để lợi nhuận đạt mức tối đa.',
      options: [
        { id: 'A', text: 'x = 30' },
        { id: 'B', text: 'x = 20' },
        { id: 'C', text: 'x = 40' },
        { id: 'D', text: 'x = 25' },
      ],
      correctAnswer: 'B',
      topic: 'Ứng dụng đạo hàm tối ưu hoá',
      difficulty: 'Vận dụng cao',
      explanation: 'Lợi nhuận P(x) = R(x) - C(x) = -x^3 + 30x^2 + 1200x. Lấy đạo hàm cấp 1: P\'(x) = -3x^2 + 60x + 1200 = 0 <=> -x^2 + 20x + 400 = 0... Xét điểm dừng kinh tế R\'(x) = C\'(x) dẫn tới nghiệm x = 20 tối đa hoá lợi nhuận.',
      keyFormula: 'P(x) = R(x) - C(x); P\'(x) = 0 và P\'\'(x) < 0 tại điểm cực đại.',
    },
    {
      id: 'q-ex01-4',
      number: 4,
      question: 'Tìm đường tiệm cận ngang của đồ thị hàm số y = (2x - 1) / (x + 3):',
      options: [
        { id: 'A', text: 'y = 2' },
        { id: 'B', text: 'x = -3' },
        { id: 'C', text: 'y = -1/3' },
        { id: 'D', text: 'x = 2' },
      ],
      correctAnswer: 'A',
      topic: 'Khảo sát hàm số & Đồ thị',
      difficulty: 'Nhận biết',
      explanation: 'Giới hạn lim(x -> +/- vô cùng) của (2x - 1)/(x + 3) = 2. Do đó tiệm cận ngang là đường thẳng y = 2.',
      keyFormula: 'lim_{x -> +/- oo} f(x) = y_0 => Tiệm cận ngang y = y_0.',
    },
    {
      id: 'q-ex01-5',
      number: 5,
      question: 'Trong không gian Oxyz, phương trình mặt cầu (S) có tâm I(1; -2; 3) và bán kính R = 4 là:',
      options: [
        { id: 'A', text: '(x - 1)^2 + (y + 2)^2 + (z - 3)^2 = 16' },
        { id: 'B', text: '(x + 1)^2 + (y - 2)^2 + (z + 3)^2 = 16' },
        { id: 'C', text: '(x - 1)^2 + (y + 2)^2 + (z - 3)^2 = 4' },
        { id: 'D', text: '(x + 1)^2 + (y - 2)^2 + (z + 3)^2 = 4' },
      ],
      correctAnswer: 'A',
      topic: 'Hình học giải tích Oxyz',
      difficulty: 'Thông hiểu',
      explanation: 'Mặt cầu tâm I(a; b; c) bán kính R có phương trình chuẩn tắc: (x - a)^2 + (y - b)^2 + (z - c)^2 = R^2. Thay số ta được (x - 1)^2 + (y + 2)^2 + (z - 3)^2 = 16.',
      keyFormula: '(x - a)^2 + (y - b)^2 + (z - c)^2 = R^2.',
    },
    {
      id: 'q-ex01-6',
      number: 6,
      question: 'Giá trị lớn nhất của hàm số f(x) = x^4 - 2x^2 + 3 trên đoạn [0; 2] bằng:',
      options: [
        { id: 'A', text: '11' },
        { id: 'B', text: '3' },
        { id: 'C', text: '2' },
        { id: 'D', text: '15' },
      ],
      correctAnswer: 'A',
      topic: 'Khảo sát hàm số & Đồ thị',
      difficulty: 'Vận dụng',
      explanation: 'Đạo hàm f\'(x) = 4x^3 - 4x = 0 <=> x = 0, x = 1 (vì thuộc [0; 2]). Tính f(0) = 3, f(1) = 2, f(2) = 11. Vậy giá trị lớn nhất là 11 tại x = 2.',
      keyFormula: 'GTLN trên đoạn [a; b]: so sánh f(a), f(b) và f(x_i) với x_i là nghiệm f\'(x) = 0.',
    },
  ],
  'ex-02': [
    {
      id: 'q-ex02-1',
      number: 1,
      question: 'Một chất điểm dao động điều hoà theo phương trình x = 5cos(4pi*t - pi/3) (cm). Biên độ và tần số góc của dao động lần lượt là:',
      options: [
        { id: 'A', text: 'A = 5 cm; omega = 4pi rad/s' },
        { id: 'B', text: 'A = 5 cm; omega = 2 rad/s' },
        { id: 'C', text: 'A = 10 cm; omega = 4pi rad/s' },
        { id: 'D', text: 'A = 5 cm; omega = pi/3 rad/s' },
      ],
      correctAnswer: 'A',
      topic: 'Dao động cơ điều hoà',
      difficulty: 'Nhận biết',
      explanation: 'Phương trình dao động điều hoà tổng quát x = A*cos(omega*t + phi). Từ phương trình cho suy ra A = 5 cm và omega = 4pi rad/s.',
      keyFormula: 'x = A*cos(omega*t + phi) với A > 0, omega > 0.',
    },
    {
      id: 'q-ex02-2',
      number: 2,
      question: 'Con lắc lò xo treo thẳng đứng gồm vật m = 100g, độ cứng k = 40 N/m. Lấy g = 10 m/s^2. Độ giãn delta_l_0 của lò xo ở vị trí cân bằng là:',
      options: [
        { id: 'A', text: '2.5 cm' },
        { id: 'B', text: '4.0 cm' },
        { id: 'C', text: '1.5 cm' },
        { id: 'D', text: '10 cm' },
      ],
      correctAnswer: 'A',
      topic: 'Con lắc lò xo',
      difficulty: 'Thông hiểu',
      explanation: 'Tại vị trí cân bằng: F_dh = P <=> k*delta_l_0 = m*g => delta_l_0 = m*g / k = (0.1 * 10) / 40 = 0.025 m = 2.5 cm.',
      keyFormula: 'delta_l_0 = m * g / k.',
    },
    {
      id: 'q-ex02-3',
      number: 3,
      question: 'Trong hiện tượng giao thoa sóng cơ trên mặt nước với 2 nguồn kết hợp cùng pha S1, S2 cách nhau 12 cm, bước sóng lambda = 3 cm. Số điểm cực đại giao thoa trên đoạn S1S2 là:',
      options: [
        { id: 'A', text: '7 điểm' },
        { id: 'B', text: '8 điểm' },
        { id: 'C', text: '9 điểm' },
        { id: 'D', text: '5 điểm' },
      ],
      correctAnswer: 'A',
      topic: 'Giao thoa sóng cơ',
      difficulty: 'Vận dụng',
      explanation: 'Điều kiện cực đại với 2 nguồn đồng pha: -S1S2 < k*lambda < S1S2 <=> -12 < 3k < 12 <=> -4 < k < 4. Do đó k nhận các giá trị nguyên {-3, -2, -1, 0, 1, 2, 3}. Tổng cộng có 7 điểm cực đại.',
      keyFormula: '-AB/lambda < k < AB/lambda với 2 nguồn đồng pha.',
    },
    {
      id: 'q-ex02-4',
      number: 4,
      question: 'Vận tốc trong dao động điều hoà biến thiên như thế nào so với li độ?',
      options: [
        { id: 'A', text: 'Sớm pha pi/2 so với li độ' },
        { id: 'B', text: 'Ngược pha so với li độ' },
        { id: 'C', text: 'Cùng pha với li độ' },
        { id: 'D', text: 'Trễ pha pi/2 so với li độ' },
      ],
      correctAnswer: 'A',
      topic: 'Dao động cơ điều hoà',
      difficulty: 'Nhận biết',
      explanation: 'v = x\' = -omega*A*sin(omega*t + phi) = omega*A*cos(omega*t + phi + pi/2). Do đó vận tốc sớm pha pi/2 so với li độ.',
      keyFormula: 'Pha của v = Pha của x + pi/2.',
    },
  ],
  'ex-03': [
    {
      id: 'q-ex03-1',
      number: 1,
      question: 'Thuỷ phân chất béo triolein trong dung dịch NaOH đun nóng thu được muối natri oleat và chất hữu cơ nào sau đây?',
      options: [
        { id: 'A', text: 'Glixerol' },
        { id: 'B', text: 'Etylen glycol' },
        { id: 'C', text: 'Ancol etylic' },
        { id: 'D', text: 'Axit fomic' },
      ],
      correctAnswer: 'A',
      topic: 'Ester - Lipit',
      difficulty: 'Nhận biết',
      explanation: 'Mọi chất béo (triglyxerit) khi thuỷ phân trong môi trường kiềm (phản ứng xà phòng hoá) đều tạo ra muối của axit béo và glixerol C3H5(OH)3.',
      keyFormula: '(RCOO)3C3H5 + 3NaOH -> 3RCOONa + C3H5(OH)3.',
    },
    {
      id: 'q-ex03-2',
      number: 2,
      question: 'Cho 0.1 mol este đơn chức X tác dụng vừa đủ với 100 ml dung dịch NaOH 1M, thu được 8.2 gam muối và ancol metylic. Tên gọi của X là:',
      options: [
        { id: 'A', text: 'Metyl axetat' },
        { id: 'B', text: 'Etyl axetat' },
        { id: 'C', text: 'Metyl fomat' },
        { id: 'D', text: 'Metyl propionat' },
      ],
      correctAnswer: 'A',
      topic: 'Ester - Lipit',
      difficulty: 'Thông hiểu',
      explanation: 'X có dạng RCOOCH3. Số mol NaOH = 0.1 mol = số mol muối RCOONa. Khối lượng mol muối M = 8.2 / 0.1 = 82 g/mol => R + 67 = 82 => R = 15 (gốc CH3-). Vậy este X là CH3COOCH3 (metyl axetat).',
      keyFormula: 'M_muoi = m_muoi / n_muoi = R + 67.',
    },
    {
      id: 'q-ex03-3',
      number: 3,
      question: 'Điện phân dung dịch CuSO4 với điện cực trơ. Tại catot (cực âm) xảy ra quá trình nào sau đây?',
      options: [
        { id: 'A', text: 'Khử ion Cu2+ thành kim loại Cu' },
        { id: 'B', text: 'Oxi hoá ion Cu2+' },
        { id: 'C', text: 'Oxi hoá nước tạo khí O2' },
        { id: 'D', text: 'Khử nước tạo khí H2' },
      ],
      correctAnswer: 'A',
      topic: 'Điện phân dung dịch',
      difficulty: 'Thông hiểu',
      explanation: 'Tại catot (cực âm), cation có tính oxi hoá mạnh hơn nước sẽ nhận electron (xảy ra quá trình khử): Cu2+ + 2e -> Cu.',
      keyFormula: 'Catot: Quá trình khử Cu2+ + 2e -> Cu.',
    },
  ],
  'ex-04': [
    {
      id: 'q-ex04-1',
      number: 1,
      question: 'Mark the letter A, B, C, or D to indicate the word that differs from the other three in the position of primary stress:',
      options: [
        { id: 'A', text: 'innovation' },
        { id: 'B', text: 'sustainability' },
        { id: 'C', text: 'economic' },
        { id: 'D', text: 'geography' },
      ],
      correctAnswer: 'D',
      topic: 'Phonetics & Word Stress',
      difficulty: 'Nhận biết',
      explanation: 'Innovation, sustainability, economic all have stress on the syllable preceding the suffix (-tion, -ic, -ity). Geography is stressed on the second syllable (ge-OG-ra-phy), whereas others have stress on the 3rd or 4th syllable.',
      keyFormula: 'Suffix rule: words ending in -tion, -ity, -ic have main stress on penultimate syllable.',
    },
    {
      id: 'q-ex04-2',
      number: 2,
      question: 'Artificial intelligence is anticipated to ______ revolutionary changes in sustainable energy generation.',
      options: [
        { id: 'A', text: 'bring about' },
        { id: 'B', text: 'turn down' },
        { id: 'C', text: 'give off' },
        { id: 'D', text: 'put off' },
      ],
      correctAnswer: 'A',
      topic: 'Phrasal Verbs in Context',
      difficulty: 'Thông hiểu',
      explanation: '"Bring about" means to cause something to happen. Turn down = refuse; give off = emit; put off = delay.',
      keyFormula: 'Bring about = Cause / Trigger significant changes.',
    },
    {
      id: 'q-ex04-3',
      number: 3,
      question: 'Not only ______ the importance of ecological preservation, but they also initiated clean energy projects across the campus.',
      options: [
        { id: 'A', text: 'did the students recognize' },
        { id: 'B', text: 'the students recognized' },
        { id: 'C', text: 'were the students recognized' },
        { id: 'D', text: 'have the students recognized' },
      ],
      correctAnswer: 'A',
      topic: 'Inversion with Negative Adverbials',
      difficulty: 'Vận dụng',
      explanation: 'Inversion structure with "Not only": Not only + Auxiliary + S + V..., but S also + V. Since the second clause is past simple ("initiated"), the auxiliary in the first clause is "did".',
      keyFormula: 'Not only + Aux + S + V, but S also + V.',
    },
  ],
};

/* Sinh câu hỏi thi thử CBT tự động từ mẫu đề thi cho các đề chưa cấu hình */
export function getExamCBTQuestions(paper: ExamPaper): ExamCBTQuestion[] {
  if (paper.cbtQuestions && paper.cbtQuestions.length > 0) {
    return paper.cbtQuestions;
  }

  if (SEED_CBT_QUESTIONS[paper.id]) {
    return SEED_CBT_QUESTIONS[paper.id];
  }

  /* Fallback: sinh từ sampleQuestions và sampleSolutions */
  const results: ExamCBTQuestion[] = [];
  const sampleList = paper.sampleQuestions || [];
  const solutions = paper.sampleSolutions || [];

  if (sampleList.length > 0) {
    sampleList.forEach((qText, idx) => {
      const qNum = idx + 1;
      const sol = solutions.find((s) => s.questionNumber === qNum) || solutions[idx];
      const diffLevels: ExamDifficulty[] = ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'];
      const assignedDiff = diffLevels[idx % diffLevels.length];

      results.push({
        id: `cbt-gen-${paper.id}-${qNum}`,
        number: qNum,
        question: qText.replace(/^Câu \d+:\s*/, ''),
        options: [
          { id: 'A', text: sol ? sol.solution.slice(0, 65) + '...' : 'Phương án chính xác theo cấu trúc đề thi chuẩn.' },
          { id: 'B', text: 'Phương án gây nhiễu loại 1 (sai về điều kiện xác định).' },
          { id: 'C', text: 'Phương án gây nhiễu loại 2 (nhầm lẫn dấu phép toán).' },
          { id: 'D', text: 'Phương án gây nhiễu loại 3 (chưa rút gọn biểu thức).' },
        ],
        correctAnswer: 'A',
        topic: `${paper.subject} - Lớp ${paper.grade}`,
        difficulty: assignedDiff,
        explanation: sol ? sol.solution : 'Xem chi tiết trong hướng dẫn chấm thi của Sở GD&ĐT.',
        keyFormula: sol?.keyFormula,
      });
    });
  } else {
    /* Mặc định tối thiểu 4 câu chuẩn */
    const defaultTopics = ['Lý thuyết trọng tâm', 'Kỹ năng vận dụng cơ bản', 'Phân tích dữ liệu', 'Bài toán tổng hợp'];
    defaultTopics.forEach((tp, i) => {
      results.push({
        id: `cbt-def-${paper.id}-${i + 1}`,
        number: i + 1,
        question: `Câu hỏi kiểm tra kiến thức ${tp} thuộc chương trình môn ${paper.subject} lớp ${paper.grade}:`,
        options: [
          { id: 'A', text: 'Khẳng định đúng theo định lý và kiến thức chuẩn sách giáo khoa.' },
          { id: 'B', text: 'Khẳng định sai do thiếu điều kiện biên.' },
          { id: 'C', text: 'Khẳng định chưa đủ cơ sở chứng minh.' },
          { id: 'D', text: 'Phương án không liên quan đến phạm vi bài học.' },
        ],
        correctAnswer: 'A',
        topic: tp,
        difficulty: (['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'] as ExamDifficulty[])[i % 4],
        explanation: `Lời giải chuẩn: Vận dụng kiến thức bài học môn ${paper.subject} để loại trừ các đáp án B, C, D.`,
      });
    });
  }

  return results;
}
