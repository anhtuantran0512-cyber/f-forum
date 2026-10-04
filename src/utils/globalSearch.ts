/**
 * Chỉ mục tìm kiếm toàn cục, dựng hoàn toàn ở client.
 *
 * Dữ liệu đã có sẵn trong store sau lần `/api/sync`, nên tìm kiếm không tốn thêm
 * request nào và trả kết quả tức thì.
 *
 * Có một hàng đợi "trọng số" thay vì lọc `includes` thuần: khớp ở tiêu đề được ưu
 * tiên hơn khớp trong nội dung, và chuỗi gõ xuất hiện ở ĐẦU tiêu đề thì lên trên
 * cùng. Nhờ vậy gõ "toan" sẽ thấy các câu hỏi môn Toán trước, thay vì một câu
 * tình cờ nhắc chữ "toan" ở đoạn thứ ba của nội dung.
 */

export type SearchKind = 'question' | 'club' | 'clubPost' | 'user';

export interface SearchHit {
  id: string;
  kind: SearchKind;
  title: string;
  /** Dòng mô tả ngắn, ví dụ tên môn học hoặc tên CLB. */
  subtitle: string;
  score: number;
  /** Mã cần thiết để nhảy tới đúng nơi (câu hỏi, CLB…). */
  targetId: string;
}

/** Bỏ dấu tiếng Việt để gõ "hoi dap" vẫn ra "Hỏi Đáp". */
export const foldVietnamese = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();

/** Cắt nội dung dài thành đoạn xem trước, không cắt giữa chừng một từ. */
const excerpt = (value: string, max = 90): string => {
  const flat = value.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : max)}…`;
};

interface IndexableQuestion {
  id: string;
  title?: string;
  content?: string;
  subject?: string;
  isSolved?: boolean;
}
interface IndexableClub {
  id: string;
  name?: string;
  slogan?: string;
  purpose?: string;
  status?: string;
}
interface IndexableClubPost {
  id: string;
  clubId?: string;
  title?: string;
  content?: string;
  authorName?: string;
}
interface IndexableUser {
  id: string;
  name?: string;
  className?: string;
  city?: string;
  role?: string;
}

export interface SearchCorpus {
  questions?: IndexableQuestion[];
  clubs?: IndexableClub[];
  clubPosts?: IndexableClubPost[];
  users?: Record<string, IndexableUser>;
}

/**
 * Chấm điểm một chuỗi so với từ khoá. Trả 0 nếu không khớp.
 *
 * - Khớp ở đầu chuỗi: điểm cao nhất (người dùng thường nhớ vài chữ đầu tiêu đề).
 * - Khớp cả từ: cao hơn khớp nằm giữa một từ khác.
 * - Khớp một phần: vẫn tính, nhưng thấp.
 */
const scoreMatch = (haystack: string, needle: string): number => {
  if (!needle) return 0;
  const at = haystack.indexOf(needle);
  if (at === -1) return 0;
  if (at === 0) return 60;
  if (haystack[at - 1] === ' ') return 42;
  return 24;
};

const SUBJECT_LABELS: Record<string, string> = {
  toan: 'Toán',
  ly: 'Vật lý',
  hoa: 'Hoá học',
  van: 'Ngữ văn',
  anh: 'Tiếng Anh',
  sinh: 'Sinh học',
  su: 'Lịch sử',
  dia: 'Địa lý',
  tin: 'Tin học',
  gdcd: 'GDCD',
  khac: 'Khác',
};

const subjectLabel = (subject?: string): string =>
  (subject && SUBJECT_LABELS[subject]) || subject || 'Chung';

/**
 * Tìm trong toàn bộ ngữ liệu, trả về tối đa `limit` kết quả đã sắp xếp.
 *
 * Từ khoá rỗng trả về mảng rỗng — bảng lệnh tự hiển thị danh mục lệnh khi đó.
 */
export function searchCorpus(corpus: SearchCorpus, rawQuery: string, limit = 8): SearchHit[] {
  const query = foldVietnamese(rawQuery);
  if (!query) return [];

  /* Hỗ trợ nhiều từ khoá: mọi từ đều phải khớp ở đâu đó trong bản ghi. */
  const terms = query.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const hits: SearchHit[] = [];

  const consider = (
    kind: SearchKind,
    id: string,
    targetId: string,
    title: string,
    subtitle: string,
    /** Các trường phụ để khớp, kèm hệ số (tiêu đề quan trọng hơn nội dung). */
    fields: Array<{ text: string; weight: number }>,
  ) => {
    const foldedTitle = foldVietnamese(title);
    const all = fields.map((f) => ({ text: foldVietnamese(f.text), weight: f.weight }));

    let total = 0;
    for (const term of terms) {
      let best = 0;
      for (const field of all) {
        const s = scoreMatch(field.text, term) * field.weight;
        if (s > best) best = s;
      }
      /* Một từ không khớp ở đâu cả → loại bản ghi này. */
      if (best === 0) return;
      total += best;
      /* Khớp ngay trong tiêu đề thì cộng thêm — tiêu đề là thứ người dùng nhớ. */
      if (scoreMatch(foldedTitle, term) > 0) total += 30;
    }

    hits.push({ id, kind, title, subtitle, score: total, targetId });
  };

  for (const q of corpus.questions ?? []) {
    consider(
      'question',
      q.id,
      q.id,
      q.title || '(Không có tiêu đề)',
      `${subjectLabel(q.subject)}${q.isSolved ? ' · đã có đáp án chuẩn' : ''}`,
      [
        { text: q.title || '', weight: 2.0 },
        { text: subjectLabel(q.subject), weight: 1.4 },
        { text: q.content || '', weight: 0.6 },
      ],
    );
  }

  for (const c of corpus.clubs ?? []) {
    consider(
      'club',
      c.id,
      c.id,
      c.name || '(CLB chưa đặt tên)',
      c.slogan || excerpt(c.purpose || '', 60) || 'Câu lạc bộ',
      [
        { text: c.name || '', weight: 2.0 },
        { text: c.slogan || '', weight: 1.2 },
        { text: c.purpose || '', weight: 0.6 },
      ],
    );
  }

  for (const p of corpus.clubPosts ?? []) {
    consider(
      'clubPost',
      p.id,
      p.clubId || p.id,
      p.title || '(Bài viết không tiêu đề)',
      p.authorName ? `Bài đăng bởi ${p.authorName}` : 'Bài đăng trong CLB',
      [
        { text: p.title || '', weight: 2.0 },
        { text: p.content || '', weight: 0.6 },
        { text: p.authorName || '', weight: 1.0 },
      ],
    );
  }

  for (const u of Object.values(corpus.users ?? {})) {
    consider(
      'user',
      u.id,
      u.id,
      u.name || '(Không rõ tên)',
      [u.className, u.city].filter(Boolean).join(' · ') || 'Thành viên',
      [
        { text: u.name || '', weight: 2.0 },
        { text: u.className || '', weight: 1.2 },
        { text: u.city || '', weight: 0.8 },
      ],
    );
  }

  hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'vi'));
  return hits.slice(0, limit);
}
