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
  'ex-05': [
    {
      id: 'q-ex05-1',
      number: 1,
      question: 'Số điểm cực trị của hàm số y = |x^3 - 3x^2 + 2| là:',
      options: [
        { id: 'A', text: '3 điểm cực trị' },
        { id: 'B', text: '5 điểm cực trị' },
        { id: 'C', text: '2 điểm cực trị' },
        { id: 'D', text: '4 điểm cực trị' },
      ],
      correctAnswer: 'B',
      topic: 'Cực trị hàm trị tuyệt đối y = |f(x)|',
      difficulty: 'Thông hiểu',
      explanation: 'Xét u(x) = x^3 - 3x^2 + 2. Đạo hàm u\'(x) = 3x^2 - 6x = 0 <=> x = 0 (u = 2) hoặc x = 2 (u = -2). Đồ thị có 2 cực trị nằm về 2 phía trục hoành nên u(x) = 0 có đúng 3 nghiệm phân biệt. Số điểm cực trị của y = |u(x)| bằng 2 + 3 = 5.',
      keyFormula: 'Số cực trị của y = |u(x)| = (số cực trị của u) + (số nghiệm đơn của u(x) = 0).',
    },
    {
      id: 'q-ex05-2',
      number: 2,
      question: 'Cho hàm số bậc ba y = f(x) có 2 điểm cực trị dương x1 > 0, x2 > 0. Số điểm cực trị của hàm số g(x) = f(|x|) là:',
      options: [
        { id: 'A', text: '5 điểm cực trị' },
        { id: 'B', text: '3 điểm cực trị' },
        { id: 'C', text: '4 điểm cực trị' },
        { id: 'D', text: '7 điểm cực trị' },
      ],
      correctAnswer: 'A',
      topic: 'Cực trị hàm số chẵn y = f(|x|)',
      difficulty: 'Vận dụng',
      explanation: 'Hàm số y = f(|x|) là hàm số chẵn, đồ thị đối xứng qua Oy. Với k là số điểm cực trị dương của f(x), số cực trị của f(|x|) bằng 2k + 1. Ở đây k = 2 nên số cực trị là 2*2 + 1 = 5 điểm cực trị.',
      keyFormula: 'Số cực trị của y = f(|x|) = 2k + 1 (với k là số điểm cực trị dương của f(x)).',
    },
    {
      id: 'q-ex05-3',
      number: 3,
      question: 'Tìm tất cả các giá trị của tham số m để đồ thị hàm số y = |x^3 - 3x + m| có đúng 3 điểm cực trị:',
      options: [
        { id: 'A', text: '-2 < m < 2' },
        { id: 'B', text: 'm = 2 hoặc m = -2' },
        { id: 'C', text: '-2 <= m <= 2' },
        { id: 'D', text: 'm > 2 hoặc m < -2' },
      ],
      correctAnswer: 'D',
      topic: 'Tham số cực trị hàm trị tuyệt đối',
      difficulty: 'Vận dụng cao',
      explanation: 'Hàm u(x) = x^3 - 3x + m có 2 cực trị là u(-1) = m + 2 và u(1) = m - 2. Hàm |u(x)| có 3 cực trị khi u(x) = 0 có đúng 1 nghiệm đơn, tức là đồ thị u(x) nằm hoàn toàn về một phía trục hoành (không cắt giữa 2 cực trị): (m + 2)(m - 2) > 0 <=> m > 2 hoặc m < -2.',
      keyFormula: '|u(x)| có 3 cực trị <=> u(x_CD) * u(x_CT) > 0.',
    },
  ],
  'ex-06': [
    {
      id: 'q-ex06-1',
      number: 1,
      question: 'Trong văn bản nghị luận xã hội, thao tác lập luận nào đóng vai trò nòng cốt giúp làm rõ bản chất đối tượng bằng cách chia tách thành từng khía cạnh?',
      options: [
        { id: 'A', text: 'Thao tác phân tích' },
        { id: 'B', text: 'Thao tác so sánh' },
        { id: 'C', text: 'Thao tác bác bỏ' },
        { id: 'D', text: 'Thao tác bình luận' },
      ],
      correctAnswer: 'A',
      topic: 'Thao tác lập luận văn học',
      difficulty: 'Nhận biết',
      explanation: 'Phân tích là thao tác chia tách đối tượng thành các yếu tố, bộ phận để nhận thức toàn diện, sâu sắc bản chất và các mối quan hệ bên trong của đối tượng nghị luận.',
      keyFormula: 'Phân tích: chia nhỏ đối tượng để thấu thị bản chất và luận giải logic.',
    },
    {
      id: 'q-ex06-2',
      number: 2,
      question: 'Xác định biện pháp tu từ độc đáo trong câu thơ hiện đại: "Tiếng rơi rất mỏng như là rơi nghiêng":',
      options: [
        { id: 'A', text: 'Hoán dụ và lặp từ' },
        { id: 'B', text: 'Nhân hoá hành động' },
        { id: 'C', text: 'Ẩn dụ chuyển đổi cảm giác kết hợp so sánh' },
        { id: 'D', text: 'Nói giảm nói tránh' },
      ],
      correctAnswer: 'C',
      topic: 'Đọc hiểu Thơ Hiện Đại',
      difficulty: 'Thông hiểu',
      explanation: '"Tiếng rơi" (thính giác) được cảm nhận qua độ dày "rất mỏng" (xúc giác/thị giác) và hình dáng "rơi nghiêng" (thị giác) tạo nên ẩn dụ chuyển đổi cảm giác giàu sức gợi.',
      keyFormula: 'Ẩn dụ chuyển đổi cảm giác: chuyển đổi cảm thụ giữa thính giác -> xúc giác -> thị giác.',
    },
    {
      id: 'q-ex06-3',
      number: 3,
      question: 'Khi triển khai bài văn nghị luận xã hội 600 chữ về "Bản lĩnh bước ra khỏi vùng an toàn của Gen Z", cấu trúc lập luận chuẩn mực cần đảm bảo:',
      options: [
        { id: 'A', text: 'Chỉ kể câu chuyện cá nhân và không cần bài học hành động' },
        { id: 'B', text: 'Giải thích khái niệm -> Phân tích lợi ích & dẫn chứng -> Phản biện lật ngược -> Bài học nhận thức & hành động' },
        { id: 'C', text: 'Liệt kê danh ngôn của người nổi tiếng mà không phân tích dẫn chứng' },
        { id: 'D', text: 'Tập trung phê phán xã hội và né tránh giải pháp cụ thể' },
      ],
      correctAnswer: 'B',
      topic: 'Kỹ năng làm văn NLXH 600 chữ',
      difficulty: 'Vận dụng',
      explanation: 'Cấu trúc bài nghị luận xã hội chuẩn ma trận kỳ thi THPT gồm 4 trụ cột: Giải thích rõ nghĩa (10%) -> Bàn luận & Dẫn chứng đa chiều (60%) -> Phản đề/Mở rộng góc nhìn (15%) -> Bài học nhận thức và hành động thực tế (15%).',
      keyFormula: 'Cấu trúc NLXH: Giải thích -> Bàn luận/Dẫn chứng -> Phản đề -> Bài học cá nhân.',
    },
  ],
  'ex-07': [
    {
      id: 'q-ex07-1',
      number: 1,
      question: 'Một phân tử ADN mạch kép có 3000 nuclêôtit và có số nuclêôtit loại A chiếm 20% tổng số nuclêôtit. Số liên kết hiđrô của phân tử ADN này là:',
      options: [
        { id: 'A', text: '3600 liên kết' },
        { id: 'B', text: '3900 liên kết' },
        { id: 'C', text: '3000 liên kết' },
        { id: 'D', text: '4200 liên kết' },
      ],
      correctAnswer: 'B',
      topic: 'Cấu trúc ADN & Di truyền phân tử',
      difficulty: 'Thông hiểu',
      explanation: 'Tổng số nuclêôtit N = 3000. Số nuclêôtit loại A = T = 3000 * 20% = 600 nu. Theo nguyên tắc bổ sung: G = X = (3000 - 2*600)/2 = 900 nu. Số liên kết hiđrô H = 2A + 3G = 2*600 + 3*900 = 1200 + 2700 = 3900 liên kết.',
      keyFormula: 'N = 2A + 2G; H = 2A + 3G.',
    },
    {
      id: 'q-ex07-2',
      number: 2,
      question: 'Đặc điểm nào sau đây thể hiện tính "thoái hoá" (dư thừa) của mã di truyền sinh học?',
      options: [
        { id: 'A', text: 'Tất cả các loài sinh vật đều sử dụng chung một bảng mã di truyền chuẩn' },
        { id: 'B', text: 'Một bộ ba nuclêôtit có thể mã hoá cho nhiều axit amin khác nhau' },
        { id: 'C', text: 'Mã di truyền được đọc liên tục từ một điểm xác định không gối lên nhau' },
        { id: 'D', text: 'Nhiều bộ ba nuclêôtit khác nhau có thể cùng mã hoá cho một loại axit amin' },
      ],
      correctAnswer: 'D',
      topic: 'Cơ chế phiên mã & Dịch mã',
      difficulty: 'Nhận biết',
      explanation: 'Tính thoái hoá của mã di truyền có nghĩa là nhiều côđon (bộ ba) khác nhau cùng xác định một axit amin (trừ AUG mã hoá Met và UGG mã hoá Trp).',
      keyFormula: 'Tính thoái hoá: nhiều bộ ba mã hoá cho 1 axit amin (bảo vệ chuỗi pôlipeptit trước đột biến).',
    },
    {
      id: 'q-ex07-3',
      number: 3,
      question: 'Ở đậu Hà Lan, gen A quy định hạt vàng trội hoàn toàn so với gen a quy định hạt xanh. Cho cây hạt vàng dị hợp Aa tự thụ phấn, tỉ lệ kiểu hình ở đời con F1 là:',
      options: [
        { id: 'A', text: '3 hạt vàng : 1 hạt xanh' },
        { id: 'B', text: '1 hạt vàng : 1 hạt xanh' },
        { id: 'C', text: '100% hạt vàng' },
        { id: 'D', text: '9 hạt vàng : 7 hạt xanh' },
      ],
      correctAnswer: 'A',
      topic: 'Quy luật di truyền phân ly Mendel',
      difficulty: 'Thông hiểu',
      explanation: 'Phép lai Aa x Aa cho tỉ lệ kiểu gen 1 AA : 2 Aa : 1 aa. Vì A trội hoàn toàn so với a, kiểu gen AA và Aa đều biểu hiện hạt vàng (tổng 3/4), aa biểu hiện hạt xanh (1/4). Tỉ lệ kiểu hình là 3 vàng : 1 xanh.',
      keyFormula: 'P: Aa x Aa => F1 kiểu hình: 3 trội : 1 lặn.',
    },
  ],
  'ex-08': [
    {
      id: 'q-ex08-1',
      number: 1,
      question: 'Hội nghị Ianta (tháng 2/1945) được triệu tập tại Liên Xô với sự tham gia của nguyên thủ ba cường quốc trụ cột trong phe Đồng minh là:',
      options: [
        { id: 'A', text: 'Liên Xô, Mỹ, Anh' },
        { id: 'B', text: 'Liên Xô, Mỹ, Pháp' },
        { id: 'C', text: 'Mỹ, Anh, Trung Quốc' },
        { id: 'D', text: 'Liên Xô, Pháp, Đức' },
      ],
      correctAnswer: 'A',
      topic: 'Trật tự hai cực Ianta',
      difficulty: 'Nhận biết',
      explanation: 'Hội nghị Ianta (Crimea, Liên Xô) diễn ra từ 4 đến 11/2/1945 với sự tham dự của I. Stalin (Liên Xô), F. Roosevelt (Mỹ) và W. Churchill (Anh) để định đoạt cục diện thế giới sau chiến tranh.',
      keyFormula: 'Tam cường Ianta: I. Stalin (Liên Xô), F. Roosevelt (Mỹ), W. Churchill (Anh).',
    },
    {
      id: 'q-ex08-2',
      number: 2,
      question: 'Theo quyết định của Hội nghị Ianta, việc phân chia khu vực chiếm đóng và phạm vi ảnh hưởng ở châu Á được thoả thuận như thế nào đối với bán đảo Triều Tiên?',
      options: [
        { id: 'A', text: 'Bán đảo Triều Tiên do quân đội Trung Quốc và Mỹ cùng quản lý' },
        { id: 'B', text: 'Liên Hợp Quốc cử lực lượng gìn giữ hoà bình tiếp quản' },
        { id: 'C', text: 'Quân đội Liên Xô chiếm đóng phía Bắc và quân đội Mỹ chiếm đóng phía Nam vĩ tuyến 38' },
        { id: 'D', text: 'Trao trả độc lập thống nhất ngay lập tức cho nhân dân Triều Tiên' },
      ],
      correctAnswer: 'C',
      topic: 'Quan hệ quốc tế thời kỳ Chiến tranh lạnh',
      difficulty: 'Thông hiểu',
      explanation: 'Hội nghị Ianta quyết định lấy vĩ tuyến 38 làm ranh giới phân chia quân sự tạm thời: Liên Xô giải giáp quân Nhật ở phía Bắc và Mỹ giải giáp ở phía Nam, đặt tiền đề cho sự phân chia bán đảo sau này.',
      keyFormula: 'Vĩ tuyến 38: Ranh giới chiếm đóng giữa Liên Xô (Bắc) và Mỹ (Nam).',
    },
    {
      id: 'q-ex08-3',
      number: 3,
      question: 'Sự kiện nào sau đây được xem là mốc mở đầu cho phong trào giải phóng dân tộc ở châu Phi sau Chiến tranh thế giới thứ hai?',
      options: [
        { id: 'A', text: 'Chiến thắng Điện Biên Phủ tại Việt Nam' },
        { id: 'B', text: 'Sự sụp đổ của chế độ phân biệt chủng tộc Apacthai năm 1993' },
        { id: 'C', text: 'Năm châu Phi 1960 với 17 quốc gia tuyên bố độc lập' },
        { id: 'D', text: 'Cuộc binh biến của các sĩ quan yêu nước Ai Cập lật đổ vương triều Faruk năm 1952' },
      ],
      correctAnswer: 'D',
      topic: 'Phong trào giải phóng dân tộc châu Phi',
      difficulty: 'Vận dụng',
      explanation: 'Cuộc cách mạng tháng 7/1952 do tổ chức "Sĩ quan tự do" đứng đầu là Gamal Abdel Nasser lật đổ chế độ quân chủ Faruk, thành lập nước Cộng hoà Ai Cập (1953), mở đầu phong trào đấu tranh giành độc lập ở lục địa đen.',
      keyFormula: 'Ai Cập 1952: Phát súng hiệu mở đầu phong trào giải phóng dân tộc tại châu Phi.',
    },
  ],
  'ex-09': [
    {
      id: 'q-ex09-1',
      number: 1,
      question: 'Điều kiện xác định của biểu thức chứa căn bậc hai P = sqrt(x - 3) / (x - 5) là:',
      options: [
        { id: 'A', text: 'x >= 3 và x != 5' },
        { id: 'B', text: 'x > 3' },
        { id: 'C', text: 'x >= 3' },
        { id: 'D', text: 'x != 5' },
      ],
      correctAnswer: 'A',
      topic: 'Căn thức bậc hai & Rút gọn',
      difficulty: 'Nhận biết',
      explanation: 'Biểu thức xác định khi biểu thức dưới dấu căn không âm: x - 3 >= 0 <=> x >= 3; và mẫu thức khác 0: x - 5 != 0 <=> x != 5. Kết hợp lại ta có x >= 3 và x != 5.',
      keyFormula: 'ĐKXĐ: Biểu thức dưới căn >= 0 và Mẫu thức != 0.',
    },
    {
      id: 'q-ex09-2',
      number: 2,
      question: 'Cho tam giác ABC vuông tại A có đường cao AH. Biết hình chiếu BH = 4 cm và CH = 9 cm. Độ dài đường cao AH bằng:',
      options: [
        { id: 'A', text: '13 cm' },
        { id: 'B', text: '6 cm' },
        { id: 'C', text: '36 cm' },
        { id: 'D', text: '6.5 cm' },
      ],
      correctAnswer: 'B',
      topic: 'Hệ thức lượng trong tam giác vuông',
      difficulty: 'Thông hiểu',
      explanation: 'Áp dụng hệ thức lượng trong tam giác vuông ABC: AH^2 = BH * CH = 4 * 9 = 36. Do AH > 0 nên AH = sqrt(36) = 6 cm.',
      keyFormula: 'AH^2 = BH * CH (Bình phương đường cao bằng tích hai hình chiếu).',
    },
    {
      id: 'q-ex09-3',
      number: 3,
      question: 'Cho các số thực dương a, b thoả mãn tích ab = 1. Giá trị nhỏ nhất của biểu thức S = (a + 1)(b + 1) bằng:',
      options: [
        { id: 'A', text: '2' },
        { id: 'B', text: '8' },
        { id: 'C', text: '4' },
        { id: 'D', text: '1' },
      ],
      correctAnswer: 'C',
      topic: 'Bất đẳng thức AM-GM',
      difficulty: 'Vận dụng cao',
      explanation: 'Khai triển S = ab + a + b + 1 = 1 + (a + b) + 1 = 2 + (a + b). Áp dụng bất đẳng thức Cauchy (AM-GM) cho hai số dương a, b: a + b >= 2*sqrt(ab) = 2*1 = 2. Do đó S >= 2 + 2 = 4. Dấu "=" xảy ra khi a = b = 1.',
      keyFormula: 'a + b >= 2*sqrt(ab); Dấu bằng xảy ra khi a = b.',
    },
  ],
  'ex-10': [
    {
      id: 'q-ex10-1',
      number: 1,
      question: 'Trong trường hợp trung bình, thuật toán sắp xếp nhanh QuickSort có độ phức tạp thời gian là:',
      options: [
        { id: 'A', text: 'O(n log n)' },
        { id: 'B', text: 'O(n^2)' },
        { id: 'C', text: 'O(n)' },
        { id: 'D', text: 'O(log n)' },
      ],
      correctAnswer: 'A',
      topic: 'Độ phức tạp thuật toán QuickSort',
      difficulty: 'Nhận biết',
      explanation: 'QuickSort hoạt động theo nguyên lý chia để trị (Divide and Conquer), chia mảng thành hai nửa và sắp xếp đệ quy. Trong trường hợp trung bình và tốt nhất, độ phức tạp đạt O(n log n). Trường hợp xấu nhất xảy ra khi pivot phân chia lệch hoàn toàn, đạt O(n^2).',
      keyFormula: 'QuickSort trung bình: T(n) = 2T(n/2) + O(n) => O(n log n).',
    },
    {
      id: 'q-ex10-2',
      number: 2,
      question: 'Cấu trúc dữ liệu nào sau đây hoạt động theo nguyên lý LIFO (Last In, First Out — Vào sau, Ra trước)?',
      options: [
        { id: 'A', text: 'Hàng đợi (Queue)' },
        { id: 'B', text: 'Mảng tĩnh (Static Array)' },
        { id: 'C', text: 'Danh sách liên kết đơn (Linked List)' },
        { id: 'D', text: 'Ngăn xếp (Stack)' },
      ],
      correctAnswer: 'D',
      topic: 'Cấu trúc dữ liệu Ngăn xếp (Stack)',
      difficulty: 'Nhận biết',
      explanation: 'Ngăn xếp (Stack) lưu trữ các phần tử theo nguyên tắc LIFO, phần tử được nạp vào sau cùng (push) sẽ là phần tử đầu tiên được lấy ra (pop). Ngược lại, Hàng đợi (Queue) tuân theo nguyên tắc FIFO.',
      keyFormula: 'Stack: LIFO (Push / Pop ở đỉnh); Queue: FIFO (Enqueue ở đuôi / Dequeue ở đầu).',
    },
    {
      id: 'q-ex10-3',
      number: 3,
      question: 'Thành phần bắt buộc phải có trong một hàm đệ quy để ngăn chương trình rơi vào vòng lặp vô hạn và tràn bộ nhớ Stack (Stack Overflow) là:',
      options: [
        { id: 'A', text: 'Vòng lặp while kiểm tra điều kiện' },
        { id: 'B', text: 'Điều kiện dừng / Trường hợp cơ sở (Base case)' },
        { id: 'C', text: 'Cấp phát bộ nhớ động bằng con trỏ' },
        { id: 'D', text: 'Khối lệnh bắt ngoại lệ try-catch' },
      ],
      correctAnswer: 'B',
      topic: 'Thuật toán đệ quy & Điều kiện dừng',
      difficulty: 'Thông hiểu',
      explanation: 'Mỗi hàm đệ quy bắt buộc phải có trường hợp cơ sở (base case) để kết thúc chuỗi gọi đệ quy và trả về giá trị trực tiếp, tránh tiêu tốn toàn bộ không gian ngăn xếp của bộ nhớ thực thi.',
      keyFormula: 'Hàm đệ quy = Base Case (điều kiện dừng) + Recursive Step (bước đệ quy thu nhỏ bài toán).',
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

  /* Fallback: sinh từ sampleQuestions và sampleSolutions với đáp án phân bổ đa dạng */
  const results: ExamCBTQuestion[] = [];
  const sampleList = paper.sampleQuestions || [];
  const solutions = paper.sampleSolutions || [];

  if (sampleList.length > 0) {
    sampleList.forEach((qText, idx) => {
      const qNum = idx + 1;
      const sol = solutions.find((s) => s.questionNumber === qNum) || solutions[idx];
      const diffLevels: ExamDifficulty[] = ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'];
      const assignedDiff = diffLevels[idx % diffLevels.length];

      /* Phân bổ đáp án đúng luân phiên giữa A, B, C, D thay vì luôn chọn A */
      const targetAnswer = (['A', 'B', 'C', 'D'] as const)[idx % 4];
      const correctText = sol ? sol.solution.slice(0, 70) + '...' : 'Khẳng định chính xác theo chuẩn chương trình.';
      const distractors = [
        'Phương án gây nhiễu loại 1 (sai về điều kiện xác định biên).',
        'Phương án gây nhiễu loại 2 (nhầm lẫn dấu phép toán biến đổi).',
        'Phương án gây nhiễu loại 3 (chưa tối giản biểu thức cuối cùng).',
      ];
      let distIdx = 0;
      const options = (['A', 'B', 'C', 'D'] as const).map((letter) => {
        if (letter === targetAnswer) {
          return { id: letter, text: correctText };
        }
        return { id: letter, text: distractors[distIdx++] };
      });

      results.push({
        id: `cbt-gen-${paper.id}-${qNum}`,
        number: qNum,
        question: qText.replace(/^Câu \d+:\s*/, '').replace(/^Bài \d+:\s*/, ''),
        options,
        correctAnswer: targetAnswer,
        topic: `${paper.subject} - Lớp ${paper.grade}`,
        difficulty: assignedDiff,
        explanation: sol ? sol.solution : 'Xem chi tiết trong hướng dẫn chấm thi của Sở GD&ĐT.',
        keyFormula: sol?.keyFormula,
      });
    });
  } else {
    /* Mặc định tối thiểu 4 câu chuẩn phân bổ cân bằng A, B, C, D */
    const defaultTopics = ['Lý thuyết trọng tâm', 'Kỹ năng vận dụng cơ bản', 'Phân tích dữ liệu', 'Bài toán tổng hợp'];
    defaultTopics.forEach((tp, i) => {
      const targetAnswer = (['A', 'B', 'C', 'D'] as const)[i % 4];
      const correctText = 'Khẳng định đúng theo định lý và kiến thức chuẩn sách giáo khoa.';
      const distractors = [
        'Khẳng định sai do thiếu điều kiện biên.',
        'Khẳng định chưa đủ cơ sở chứng minh khoa học.',
        'Phương án không liên quan đến phạm vi bài học.',
      ];
      let distIdx = 0;
      const options = (['A', 'B', 'C', 'D'] as const).map((letter) => {
        if (letter === targetAnswer) {
          return { id: letter, text: correctText };
        }
        return { id: letter, text: distractors[distIdx++] };
      });

      results.push({
        id: `cbt-def-${paper.id}-${i + 1}`,
        number: i + 1,
        question: `Câu hỏi kiểm tra kiến thức ${tp} thuộc chương trình môn ${paper.subject} lớp ${paper.grade}:`,
        options,
        correctAnswer: targetAnswer,
        topic: tp,
        difficulty: (['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'] as ExamDifficulty[])[i % 4],
        explanation: `Lời giải chuẩn: Vận dụng kiến thức bài học môn ${paper.subject} để xác định phương án ${targetAnswer} là chính xác.`,
      });
    });
  }

  return results;
}

