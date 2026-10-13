/**
 * Bản quyền trí tuệ thuộc về BroAmStuck
 *
 * AI Moderation v1.0 — Kiểm duyệt câu trả lời theo mức độ LIÊN QUAN.
 *
 * Nguyên tắc (theo đặc tả hệ thống):
 * - Bot KHÔNG phải giáo viên chấm bài: KHÔNG từ chối vì ngắn, lỗi chính tả,
 *   diễn đạt yếu, chưa đầy đủ hay "có vẻ sai". Chỉ xét độ liên quan tới câu hỏi.
 * - Ba trạng thái:
 *   ACCEPT  — liên quan rõ ràng (trực tiếp hoặc gián tiếp) → đăng ngay.
 *   REJECT  — LẠC ĐỀ rõ ràng / spam / xúc phạm → không đăng, kèm phản hồi để sửa.
 *   REVIEW  — không chắc chắn → vào hàng chờ quản trị viên. KHÔNG bao giờ
 *             tự động xoá; quản trị viên là người quyết định cuối cùng.
 * - Kiểm tra an toàn (spam, xúc phạm, lộ thông tin cá nhân) là một BƯỚC RIÊNG,
 *   tách khỏi đánh giá liên quan.
 * - Mọi phán quyết (status, relevance, reason, engine, thời điểm) được lưu kèm
 *   lời giải để quản trị viên kiểm tra lại (audit).
 *
 * Kiến trúc:
 * - Máy chủ tự động kiểm duyệt khi nhận lời giải (client KHÔNG thể tự khai
 *   ACCEPT — phán quyết luôn do máy chủ tính lại).
 * - Nếu có `FFORUM_AI_API_KEY` (OpenAI-compatible) → gọi LLM với prompt chuẩn;
 *   không có key / gọi lỗi / hết thời gian → rơi xuống bộ heuristic tiếng Việt
 *   tất định (normalize dấu + token + n-gram + từ khoá môn học), cùng hợp đồng
 *   JSON {status, relevance, reason, feedback}. API key CHỈ tồn tại server-side.
 */

/* ============ Hợp đồng phán quyết (JSON) ============ */

export type ModerationStatus = 'ACCEPT' | 'REJECT' | 'REVIEW';
export type RelevanceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type ModerationEngine = 'ai' | 'heuristic';

export interface ModerationVerdict {
  status: ModerationStatus;
  relevance: RelevanceLevel;
  /** Lý do ngắn (cho audit/quản trị). */
  reason: string;
  /** Phản hồi thân thiện cho học sinh chỉnh sửa (khi REJECT/REVIEW). */
  feedback: string;
  engine: ModerationEngine;
  safety: { ok: boolean; flags: string[] };
  at: number;
  /** Quản trị viên xử lý hàng chờ: lưu lại khi duyệt/từ chối. */
  review?: { by: string; at: number; action: 'approve' | 'reject'; note?: string };
}

export interface ModerationInput {
  questionTitle: string;
  questionContent: string;
  questionSubject: string;
  answerContent: string;
}

const REASON_MAX = 300;
const FEEDBACK_MAX = 400;

function clampReason(v: string): string {
  const s = String(v || '').trim().slice(0, REASON_MAX);
  return s || 'Không có lý do.';
}
function clampFeedback(v: string): string {
  const s = String(v || '').trim().slice(0, FEEDBACK_MAX);
  return s;
}

/* ============ Bước 1 — Kiểm tra an toàn (riêng biệt) ============ */

/**
 * Dò spam / quảng cáo / xúc phạm / lộ thông tin cá nhân.
 * Tách khỏi đánh giá liên quan: câu trả lời liên quan 100% nhưng chứa spam
 * vẫn bị REJECT; câu liên quan bình thường không bao giờ dính flag.
 */
export function checkAnswerSafety(content: string): { ok: boolean; flags: string[] } {
  const flags: string[] = [];
  const text = String(content || '');
  const lower = text.toLowerCase();

  /* Spam: quá nhiều liên kết. */
  const links = text.match(/https?:\/\/\S+/gi) || [];
  if (links.length >= 3) flags.push('spam-links');

  /* Spam: từ khoá quảng cáo / chốt đơn / bán hàng. */
  const promoPattern =
    /shopee|lazada|tiktok\s*shop|aliexpress|đặt\s*hàng|ship\s*cod|giá\s*rẻ|hàng\s*xịn|deal\s*hot|ưu\s*đãi\s*dành\s*cho|hotline|giao\s*thông\s*toàn\s*quốc|đặt\s*liền|bấm\s*vào\s*link/i;
  if (promoPattern.test(lower)) flags.push('spam-promo');

  /* Spam: viết hoa toàn bộ câu dài (shouting). */
  const capsWords = text.split(/\s+/).filter((w) => /^[A-ZÀ-Ý]{4,}$/.test(w));
  if (capsWords.length >= 5) flags.push('spam-caps');

  /* PII: số điện thoại Việt Nam (10 chữ số: 0 + 9 + 8 số, hoặc +84 + 9 số). */
  if (/(^|\D)(0|\+84)[\s-]?(3|5|7|8|9)\d{8}(\D|$)/.test(text)) flags.push('pii-phone');
  /* PII: email. */
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) flags.push('pii-email');

  /* Xúc phạm (bộ từ vựng tối thiểu, không dấu để bắt cả gõ tắt/lỗi chính tả). */
  const norm = normalizeVi(text);
  const insultBigrams = [
    'do ngu', 'ngu vo', 'ngu nhap', 'cai de', 'cai cho', 'dam vo', 'dam ngu',
    'con ngu', 'ngu cu', 'me de', 'do ngoc', 'ngu xui', 'ngu lam', 'ngu ngu',
    'ngu di', 'ngu co', 'ngu the', 'ngu qua', 'ngu thay',
  ];
  let insulted = false;
  for (const phrase of insultBigrams) {
    if (norm.includes(phrase)) { insulted = true; break; }
  }
  /* KHÔNG dùng "ngu" đứng một mình: bỏ dấu của "ngủ" (to sleep) cũng ra "ngu",
     sẽ chặn oan câu trả lời học tập. Chỉ chặn khi là cụm rõ ràng. */
  if (insulted) flags.push('insult');

  return { ok: flags.length === 0, flags };
}

/* ============ Bước 2 — Heuristic liên quan (tiếng Việt) ============ */

/** Bỏ dấu tiếng Việt + viết thường: "phương trình" → "phuong trinh". */
export function normalizeVi(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd');
}

/* CẢNH BÁO: tiếng Việt bỏ dấu sinh ra đồng âm ("khi" = khi/khí, "da" = đã/đá,
   "do" = đó/độ, "de" = để/đề, "van" = vẫn/văn) — danh sách stopword PHẢI cực
   ngắn, chỉ giữ từ chức năng rõ ràng. Lọc sai một nội dung từ là hỏng điểm. */
const STOP_WORDS = new Set([
  /* Vietnamese function words (an toàn khi bỏ dấu). */
  'va', 'voi', 'la', 'co', 'di', 'vi', 'ma', 'thi', 'the', 'neu', 'nhung',
  'nhe', 'minh', 'toi', 'no', 'ho', 'ay', 'nay', 'nhu', 'rat', 'cung',
  'luon', 'se', 'roi', 'vay', 'chua', 'vao', 'ra', 'khong', 'lam', 'cua',
  /* English function words. */
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'is', 'are',
  'was', 'were', 'be', 'been', 'with', 'that', 'this', 'it', 'i', 'you',
  'we', 'they', 'he', 'she', 'me', 'my', 'your', 'so', 'but', 'if', 'not',
  'no', 'yes', 'as', 'at', 'by',
]);

/** Tách từ (đã bỏ dấu), lọc từ ngắn và stopword. */
export function tokenizeVi(s: string): string[] {
  const raw = normalizeVi(s)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  return raw;
}

/** Bộ trigram ký tự (trên chuỗi không dấu, bỏ khoảng trắng thừa) để bắt
    gần đúng từ có lỗi chính tả: "phuongtrinh" ≈ "phươngtrình". */
function charTrigrams(s: string): Set<string> {
  const packed = normalizeVi(s).replace(/\s+/g, '');
  const set = new Set<string>();
  for (let i = 0; i + 3 <= packed.length; i++) set.add(packed.slice(i, i + 3));
  return set;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/**
 * Từ khoá đặc trưng theo môn học — câu hỏi và câu trả lời cùng chạm nhóm
 * từ vựng của môn → cộng điểm liên quan (bắt được ví dụ, giải thích vòng
 * ngoài mà không cần lặp lại từ khoá chính của đề).
 */
/* Từ viết không dấu (normalizeVi chạy 2 vế nên khớp cả câu hỏi/câu trả lời
   gõ có dấu hay không dấu). */
/* Từ viết KHÔNG dấu (normalizeVi chạy cả 2 vế nên khớp cả gõ có dấu/không dấu).
   Tránh từ quá chung (khi, bai, so, chu...) — chỉ giữ từ chuyên ngành/đặc trưng. */
const SUBJECT_KEYWORDS: Record<string, string[]> = {
  toan: ['toán', 'toán học', 'bài toán', 'phuong', 'trinh', 'nghiem', 'bang',
    'dao', 'tich', 'phuc', 'hop', 'giac', 'tam', 'vuong', 'truc', 'toa',
    'chuan', 'tieu', 'bat', 'dinh', 'thuc', 'tap', 'luan', 'chung', 'hàm',
    'giá trị', 'biến', 'công thức', 'điều kiện', 'tuyến', 'bậc', 'nhân tử',
    'hieu', 'chuyen', 'rut'],
  ly: ['vật lý', 'newton', 'luc', 'gia toc', 'khoi luong', 'nang', 'suc',
    'dong', 'truong', 'dien', 'quang', 'song', 'cong', 'thuc', 'nhiệt',
    'dòng', 'điện', 'sóng'],
  hoa: ['hóa học', 'phan ung', 'chat', 'mol', 'axit', 'baz', 'oxi', 'thuy',
    'dien', 'tut', 'dao', 'dao', 'phuong trinh', 'nguyen tu'],
  sinh: ['sinh học', 'nguyen khuan', 'nhan', 'thanh phan', 'di truy', 'gen',
    'mem', 'thanh bu', 'tiêu hoá', 'quang hop'],
  anh: ['tieng', 'anh', 'vung', 'nghe', 'noi', 'doc', 'viet', 'grammar',
    'sentence', 'pronunciation', 'listening', 'speaking', 'vocab', 'cau',
    'hoi', 'dap', 'nghĩa', 'từ', 'phiên'],
  tin: ['thuat', 'python', 'java', 'cpp', 'code', 'lua', 'chương', 'trình',
    'biến', 'vòng', 'lặp', 'hàm', 'mảng', 'xử', 'lý', 'dữ', 'liệu', 'thuật',
    'toán', 'ma', 'giai'],
  van: ['van', 'hoc', 'tac', 'pham', 'ngu', 'thuyet', 'minh', 'luan',
    'chung', 'cau', 'chu', 'doan', 'bao', 'hanh', 'dong', 'tác', 'giả',
    'nghệ', 'thuật', 'thể'],
  su: ['lich', 'su', 'chieu', 'gian', 'cung', 'soc', 'nha', 'nuoc', 'dan',
    'chung', 'cm', 'giải', 'phóng', 'kháng', 'chiến', 'cách', 'mạng', 'khi',
    'hau', 'khí', 'hậu'],
  hotro: ['giao', 'vu', 'hoi', 'nhu', 'giup', 'do', 'hoc', 'tap', 'bai',
    'kiem', 'tra', 'giai', 'đề', 'bài'],
  kinhnghiem: ['kinh', 'nghiem', 'phuong', 'phap', 'cach', 'hoc', 'tap',
    'ghi', 'chu', 'duy', 'thoi', 'gian', 'thi', 'dau', 'ôn', 'tap', 'phương',
    'pháp'],
  share: ['share', 'chia', 'se', 'tài', 'liệu', 'sach', 'giao', 'trinh',
    'file', 'download', 'tổng', 'hợp', 'tự', 'luận', 'đề', 'tham', 'khảo'],
  tamsu: ['tâm', 'sự', 'buồn', 'vui', 'stres', 'áp', 'lực', 'mệt', 'mõi',
    'thất', 'vọng', 'buông', 'bỏ', 'thương', 'nhớ', 'cô', 'đơn', 'thoải',
    'mái'],
  tamly: ['tâm', 'lý', 'trí', 'óc', 'cảm', 'xúc', 'tình', 'stress', 'lo',
    'âu', 'trầm', 'tự', 'tin', 'tập', 'trung', 'thở', 'thiền'],
};

/* Bỏ dấu + khử trùng trước khi dùng (khóa sẵn để không inflate điểm). */
const SUBJECT_KEYWORDS_NORM: Record<string, string[]> = Object.fromEntries(
  Object.entries(SUBJECT_KEYWORDS).map(([k, list]) => [
    k,
    Array.from(new Set(list.map(normalizeVi).filter((x) => x.length >= 2))),
  ]),
);

export interface RelevanceResult {
  status: ModerationStatus;
  relevance: RelevanceLevel;
  reason: string;
  feedback: string;
  score: number;
}

/**
 * Bộ chấm điểm liên quan tất định (fallback khi không có AI key / AI lỗi):
 * - Chồng lấp token (từ có trọng số, trần mẫu số để đề dài không "làm đói" điểm).
 * - Trigram ký tự để dung cho lỗi chính tả / gõ không dấu.
 * - Từ khoá môn học (cùng chạm nhóm vựng môn → điểm cộng).
 * Ngưỡng: >=0.30 ACCEPT·HIGH, >=0.14 ACCEPT·MEDIUM, <0.05 REJECT·LOW, còn lại REVIEW.
 * Câu trả lời ngắn (<12 ký tự) KHÔNG bao giờ bị REJECT vì ngắn: có liên quan
 * thì ACCEPT·MEDIUM, không rõ thì REVIEW.
 */
export function classifyRelevance(input: ModerationInput): RelevanceResult {
  const answer = String(input.answerContent || '').trim();
  const questionText = `${input.questionTitle || ''} ${input.questionContent || ''}`;

  const qTokens = tokenizeVi(questionText);
  const aTokens = tokenizeVi(answer);
  const aTokenSet = new Set(aTokens);
  const qTokenSet = new Set(qTokens);

  /* Chồng lấp: mỗi từ khoá của câu hỏi xuất hiện trong câu trả lời → điểm. */
  let hit = 0;
  for (const t of qTokenSet) if (aTokenSet.has(t)) hit++;
  const qSample = Math.min(qTokenSet.size, 8);
  const overlap = qSample > 0 ? hit / qSample : 0;

  /* Gần đúng (lỗi chính tả / không dấu): trigram trên chuỗi từ NỘI DUNG
     (đã lọc stopword) — trigram trên toàn văn bản bị nhiễu bởi chức năng từ. */
  const trigramSim = jaccard(
    charTrigrams(aTokens.length ? aTokens.join('') : ''),
    charTrigrams(qTokens.length ? qTokens.join('') : ''),
  );

  /* Từ khoá môn học: đề thuộc môn (chạm từ vựng môn) + câu trả lời dùng từ
     chuyên ngành của môn đó → cộng điểm (bắt được định luật/ví dụ không lặp
     từ khoá của đề). */
  const subjectKeys = SUBJECT_KEYWORDS_NORM[String(input.questionSubject || '')] || [];
  const qNorm = normalizeVi(questionText);
  const aNorm = normalizeVi(answer);
  /* Từ đơn: khớp theo ranh giới từ (tránh "tu" (tử) dính vào "tuan" (tuần)).
     Cụm nhiều từ: khớp chuỗi con. */
  const qWords = new Set(qNorm.split(/\s+/));
  const aWords = new Set(aNorm.split(/\s+/));
  const keyIn = (key: string, words: Set<string>, packed: string) =>
    key.includes(' ') ? packed.includes(key) : words.has(key);
  const qSubjectHits = subjectKeys.filter((k) => keyIn(k, qWords, qNorm)).length;
  const aSubjectHits = subjectKeys.filter((k) => keyIn(k, aWords, aNorm)).length;
  const subjectScore =
    qSubjectHits >= 1 && aSubjectHits >= 3 ? 0.2
    : qSubjectHits >= 1 && aSubjectHits >= 2 ? 0.15
    : qSubjectHits >= 1 && aSubjectHits === 1 ? 0.08
    : 0;

  /* Đề "mở" (ngắn, ít từ khoá nội dung) → không đủ bằng chứng để REJECT:
     kẹp điểm vào vùng REVIEW để người quản trị quyết. */
  const ambiguousQuestion = qTokenSet.size <= 6 && questionText.length < 60;

  /* Trigram chỉ là tín hiệu phụ (bắt lỗi chính tả): trọng số thấp để câu
     lạc đề rõ ràng không bị "cứu" bởi trùng trigram ngẫu nhiên. */
  let score = 0.6 * overlap + 0.12 * trigramSim + subjectScore;
  if (ambiguousQuestion && overlap === 0) score = Math.max(score, 0.05, Math.min(score, 0.13));

  /* Ngắn dưới 24 ký tự: KHÔNG bao giờ tự REJECT (ngắn ≠ lỗi) — không rõ thì REVIEW. */
  const veryShort = answer.length < 24;

  if (score >= 0.3) {
    return {
      status: 'ACCEPT', relevance: 'HIGH', score,
      reason: `Liên quan rõ: trùng ${hit}/${qTokenSet.size || 0} từ khoá của câu hỏi${aSubjectHits ? ', cùng nhóm từ vựng môn ' + String(input.questionSubject) : ''}.`,
      feedback: '',
    };
  }
  if (score >= 0.14) {
    return {
      status: 'ACCEPT', relevance: 'MEDIUM', score,
      reason: `Liên quan gián tiếp: điểm trùng ${score.toFixed(2)}${aSubjectHits ? ', cùng nhóm từ vựng môn ' + String(input.questionSubject) : ''} — chấp nhận theo nguyên tắc "không yêu cầu từ khoá chính xác".`,
      feedback: '',
    };
  }
  if (score < 0.05) {
    if (veryShort) {
      /* Ngắn + không liên quan rõ: KHÔNG kết án vì ngắn — để người xem xét. */
      return {
        status: 'REVIEW', relevance: 'LOW', score,
        reason: 'Câu trả lời rất ngắn và chưa thấy dấu hiệu liên quan tới câu hỏi — cần người xem xét (không tự động từ chối vì ngắn).',
        feedback: 'Câu trả lời đang được xem xét. Bạn có thể bổ sung thêm một vài chi tiết để rõ hơn nhé.',
      };
    }
    return {
      status: 'REJECT', relevance: 'LOW', score,
      reason: `Không liên quan: không trùng từ khoá nào của câu hỏi (điểm ${score.toFixed(2)}).`,
      feedback: 'Câu trả lời này chưa liên quan đến câu hỏi đã đăng. Hãy trả lời đúng nội dung câu hỏi (dùng cách nói, ví dụ của bạn cũng được) rồi gửi lại nhé.',
    };
  }
  return {
    status: 'REVIEW', relevance: 'LOW', score,
    reason: `Mức liên quan không chắc chắn (điểm ${score.toFixed(2)}) — chuyển hàng chờ quản trị viên, không tự động từ chối.`,
    feedback: 'Câu trả lời đang chờ người quản trị xem xét — không mất dữ liệu, bạn cứ yên tâm.',
  };
}

/* ============ Bước 3 — AI provider (tùy chọn, server-side) ============ */

function buildAiPrompt(input: ModerationInput): string {
  return [
    'You are the answer-moderation bot of a Vietnamese school forum.',
    'Your ONLY job: decide how RELEVANT the student answer is to the student question.',
    '',
    'STRICT RULES:',
    '1. Relevance is the ONLY criterion. NEVER judge accuracy, correctness, quality, length, spelling, grammar or completeness. An answer can be WRONG but RELEVANT -> it must be accepted.',
    '2. Accept direct AND indirect relevance: step-by-step solutions, ideas, partial hints, examples, advice, opinions, counter-arguments. Do NOT require exact keywords, synonyms and natural phrasing count.',
    '3. Do NOT reject short answers, typos or rough wording. Never auto-score students.',
    '4. REJECT only when the answer is clearly OFF-TOPIC (totally unrelated to the question) or is spam/advertisement.',
    '5. When uncertain in any way -> status "REVIEW" (a human admin decides; nothing is auto-deleted).',
    '6. Relevance level: HIGH = clearly on-topic; MEDIUM = related indirectly/partially; LOW = off-topic.',
    '7. HIGH or MEDIUM => ACCEPT (if genuinely related). LOW => REJECT only if truly off-topic, else REVIEW.',
    '',
    'Output: ONLY one JSON object, no markdown, exactly these keys:',
    '{"status":"ACCEPT|REJECT|REVIEW","relevance":"HIGH|MEDIUM|LOW","reason":"<=300 chars, in Vietnamese, what you observed","feedback":"<=400 chars, friendly Vietnamese note for the student to fix the answer (empty string for ACCEPT)"}',
    '',
    `CÂU HỎI (môn: ${input.questionSubject || 'không rõ'}):\n"${input.questionTitle}"\n${input.questionContent}`,
    '',
    `CÂU TRẢ LỜI:\n"${input.answerContent}"`,
  ].join('\n');
}

interface AiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

function readAiConfig(): AiConfig | null {
  const apiKey = process.env.FFORUM_AI_API_KEY || '';
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (process.env.FFORUM_AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: process.env.FFORUM_AI_MODEL || 'gpt-4o-mini',
  };
}

function parseAiVerdict(raw: string): { status: ModerationStatus; relevance: RelevanceLevel; reason: string; feedback: string } | null {
  const text = String(raw || '').trim();
  /* Bỏ fence markdown nếu model vẫn bọc ```json ... ```. */
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let obj: any;
  try {
    obj = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!obj || typeof obj !== 'object') return null;
  const status = obj.status;
  const relevance = obj.relevance;
  if (!['ACCEPT', 'REJECT', 'REVIEW'].includes(status)) return null;
  if (!['HIGH', 'MEDIUM', 'LOW'].includes(relevance)) return null;
  /* Bảo vệ logic: LOW + không lạc đề rõ => REVIEW (không tự kết án). */
  let finalStatus: ModerationStatus = status;
  if (relevance === 'LOW' && status === 'REJECT') {
    /* Giữ REJECT của AI khi LOW — nhưng chỉ khi AI nói rõ "off-topic".
       Nếu không rõ, hạ xuống REVIEW (nguyên tắc "khi không chắc => REVIEW"). */
    const reasonLower = String(obj.reason || '').toLowerCase();
    if (!/off[-\s]?topic|lạc đề|không liên quan|chủ đề khác/i.test(reasonLower)) {
      finalStatus = 'REVIEW';
    }
  }
  return {
    status: finalStatus,
    relevance,
    reason: clampReason(String(obj.reason || '')),
    feedback: clampFeedback(String(obj.feedback || '')),
  };
}

async function callAiOnce(cfg: AiConfig, prompt: string, signal: AbortSignal): Promise<string> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0,
      max_tokens: 400,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = new Error(`AI provider HTTP ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const data: any = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('AI provider: missing content');
  return content;
}

/**
 * Gọi LLM (chỉ khi có key). Hết thời gian 8s, thử lại 1 lần với lỗi mạng/5xx.
 * Mọi thất bại → null (người gọi dùng heuristic). Không bao giờ ném lỗi.
 */
export async function callAiModerator(input: ModerationInput): Promise<{ status: ModerationStatus; relevance: RelevanceLevel; reason: string; feedback: string } | null> {
  const cfg = readAiConfig();
  if (!cfg) return null;
  const prompt = buildAiPrompt(input);
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const raw = await callAiOnce(cfg, prompt, controller.signal);
      const parsed = parseAiVerdict(raw);
      if (parsed) return parsed;
      return null; /* Không parse được => coi như AI lỗi. */
    } catch (e: any) {
      const status = e?.status;
      const retryable = !status || status >= 500 || e?.name === 'AbortError';
      if (!retryable || attempt === 1) return null;
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

/* ============ Orchestrate: an toàn -> AI -> heuristic ============ */

/**
 * Phán quyết cuối cùng cho một lời giải. LUÔN chạy server-side.
 * Client không thể tự khai status — mọi field của verdict đều do máy chủ sinh.
 */
export async function moderateAnswer(input: ModerationInput): Promise<ModerationVerdict> {
  const safety = checkAnswerSafety(input.answerContent);
  const at = Date.now();

  if (!safety.ok) {
    const flagText = safety.flags.join(', ');
    return {
      status: 'REJECT',
      relevance: 'LOW',
      reason: `Bộ lọc an toàn chặn: ${flagText}.`,
      feedback:
        safety.flags.includes('insult')
          ? 'Câu trả lời có từ ngữ chưa phù hợp. Diễn đạt lại lịch sự hơn và tập trung vào việc giải bài nhé.'
          : 'Câu trả lời chứa nội dung quảng cáo/liên kết/ thông tin cá nhân — không phù hợp cho diễn đàn học tập. Hãy gửi lại phần trả lời bài học, không kèm quảng cáo hay thông tin liên hệ.',
      engine: 'heuristic',
      safety,
      at,
    };
  }

  /* Có key AI thì hỏi AI trước; không thì heuristic. */
  const ai = await callAiModerator(input);
  if (ai) {
    return {
      status: ai.status,
      relevance: ai.relevance,
      reason: ai.reason,
      feedback: ai.feedback,
      engine: 'ai',
      safety,
      at,
    };
  }

  const heur = classifyRelevance(input);
  return {
    status: heur.status,
    relevance: heur.relevance,
    reason: heur.reason,
    feedback: heur.feedback,
    engine: 'heuristic',
    safety,
    at,
  };
}
