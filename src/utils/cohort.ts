/* Bản quyền trí tuệ thuộc về BroAmStuck */
import type { User, UserRole } from '../types';
import type { StudyPeriod } from './studyLog';

/* ==========================================================================
   NHÓM SINH VIÊN MÔ PHỎNG (cohort) CHO BẢNG XẾP HẠNG
   --------------------------------------------------------------------------
   Bảng xếp hạng cần đủ dữ liệu để xếp hạng có ý nghĩa (top 100). Ngoài tài
   khoản thật trong sổ đăng ký, bảng được lấp bằng một nhóm sinh viên mô phỏng
   TẤT ĐỊNH: cùng một email luôn cho cùng tên, cùng avatar, cùng XP và cùng
   nhịp đóng góp — không đổi giữa các lần render hay các kỳ.
   Mọi thành viên mô phỏng đều bị đánh dấu `estimated` để giao diện ghi rõ là
   số liệu ước lượng, không trộn lẫn với số liệu thật của bạn.
   ========================================================================== */

const COHORT_DOMAIN = '@sv.f-forum.vn';
const COHORT_SIZE = 112;

const FAMILY_NAMES = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
  'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Trịnh', 'Đinh', 'Tạ', 'Lâm',
  'Mai', 'Tô', 'Hà', 'Cao', 'Chu', 'Quách', 'Vương', 'Đoàn',
];

const GIVEN_NAMES = [
  'An', 'Anh', 'Bảo', 'Bình', 'Châu', 'Chi', 'Cường', 'Dũng', 'Duy', 'Duyên',
  'Giang', 'Hân', 'Hà', 'Hải', 'Hiếu', 'Hoà', 'Huy', 'Hùng', 'Hương', 'Khang',
  'Khánh', 'Khoa', 'Kiên', 'Lam', 'Lan', 'Linh', 'Long', 'Minh', 'My', 'Nam',
  'Nga', 'Ngân', 'Nhi', 'Nhân', 'Nhung', 'Oanh', 'Phát', 'Phong', 'Phúc', 'Quân',
  'Quỳnh', 'Sơn', 'Tâm', 'Tân', 'Thảo', 'Thắng', 'Thiện', 'Thu', 'Thư', 'Tiến',
  'Trang', 'Trí', 'Trinh', 'Trung', 'Tú', 'Tuấn', 'Uyên', 'Việt', 'Vy', 'Yến',
];

const MIDDLE_NAMES = [
  'Minh', 'Gia', 'Khánh', 'Bảo', 'Hoàng', 'Tuấn', 'Thị', 'Ngọc', 'Thanh', 'Hữu',
  'Đức', 'Quốc', 'Anh', 'Nhật', 'Thiên', 'Kim', 'Phương', 'Hồng', 'Văn', 'Xuân',
];

/* Bộ sinh số giả ngẫu nhiên tất định (LCG) — cùng hạt giống luôn cùng kết quả */
const makeRandom = (seed: number) => {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

const hashString = (value: string): number => {
  let hash = 7;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) % 2147483647;
  return hash;
};

/* Cấp độ suy ra từ XP — cùng công thức với store/getXPForLevel */
const levelForXp = (xp: number): number => {
  for (let lvl = 150; lvl >= 1; lvl -= 1) {
    const need = lvl <= 1 ? 0 : Math.floor(140 * (lvl - 1) + 1.08 * Math.pow(lvl - 1, 2));
    if (xp >= need) return lvl;
  }
  return 1;
};

const AVATAR_PALETTE = [
  ['#38bdf8', '#0ea5e9'],
  ['#f59e0b', '#f97316'],
  ['#34d399', '#059669'],
  ['#a78bfa', '#7c3aed'],
  ['#fb7185', '#e11d48'],
  ['#22d3ee', '#0891b2'],
  ['#facc15', '#eab308'],
  ['#f472b6', '#db2777'],
];

/** Avatar tự sinh (SVG nội tuyến) — không gọi mạng, luôn có sẵn. */
const buildAvatar = (name: string, seed: number): string => {
  const parts = name.trim().split(/\s+/);
  const initials = ((parts[parts.length - 2]?.[0] || '') + (parts[parts.length - 1]?.[0] || 'F')).toUpperCase();
  const [from, to] = AVATAR_PALETTE[hashString(name) % AVATAR_PALETTE.length];
  const rotate = 20 + (seed % 40);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">` +
    `<defs><linearGradient id="g" gradientTransform="rotate(${rotate})">` +
    `<stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/></linearGradient></defs>` +
    `<rect width="96" height="96" rx="48" fill="url(#g)"/>` +
    `<text x="48" y="60" font-family="Inter,system-ui,sans-serif" font-size="36" font-weight="700" ` +
    `fill="#0b1017" text-anchor="middle">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export interface CohortMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  level: number;
  xp: number;
  /** Điểm đóng góp ước lượng trong một tháng */
  monthlyPoints: number;
}

const buildCohort = (): CohortMember[] => {
  const random = makeRandom(20260214);
  const members: CohortMember[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < COHORT_SIZE; i += 1) {
    let name = '';
    /* Tên duy nhất: thử tối đa 12 lần rồi mới ghép thêm hậu tố */
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const family = FAMILY_NAMES[Math.floor(random() * FAMILY_NAMES.length)];
      const middle = MIDDLE_NAMES[Math.floor(random() * MIDDLE_NAMES.length)];
      const given = GIVEN_NAMES[Math.floor(random() * GIVEN_NAMES.length)];
      const candidate = `${family} ${middle} ${given}`;
      if (!usedNames.has(candidate)) {
        name = candidate;
        break;
      }
    }
    if (!name) {
      const family = FAMILY_NAMES[i % FAMILY_NAMES.length];
      name = `${family} ${GIVEN_NAMES[(i * 3) % GIVEN_NAMES.length]} ${i + 1}`;
    }
    usedNames.add(name);

    /* Phân bố XP: phần lớn sinh viên 200–6.000, nhóm dẫn đầu tới ~26.000 */
    const roll = random();
    const xp =
      roll > 0.93
        ? 12000 + Math.floor(random() * 14000)
        : roll > 0.7
        ? 4000 + Math.floor(random() * 8000)
        : 200 + Math.floor(random() * 3800);

    const slug = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase()
      .replace(/[^a-z]/g, '');

    members.push({
      id: `cohort-${i + 1}`,
      name,
      email: `sv${i + 1}.${slug || 'f'}${COHORT_DOMAIN}`,
      avatar: buildAvatar(name, i),
      level: levelForXp(xp),
      xp,
      monthlyPoints: Math.round(Math.max(60, xp * 0.42 + random() * 260)),
    });
  }

  return members;
};

export const COHORT_MEMBERS: CohortMember[] = buildCohort();

const COHORT_INDEX = new Map(COHORT_MEMBERS.map((m) => [m.email.toLowerCase(), m]));

/** Bản đồ người dùng mô phỏng, đúng dạng `Record<email, User>` của store. */
export const COHORT_USERS: Record<string, User> = COHORT_MEMBERS.reduce<
  Record<string, User>
>((acc, m) => {
  acc[m.email.toLowerCase()] = {
    id: m.id,
    name: m.name,
    email: m.email,
    avatar: m.avatar,
    role: 'STUDENT' as UserRole,
    level: m.level,
    xp: m.xp,
    coin: 0,
    fPoints: m.xp,
    streakCount: 0,
    bio: '',
    scopedClubIds: [],
  };
  return acc;
}, {});

export const isCohortMember = (emailKey?: string | null): boolean =>
  Boolean(emailKey) && COHORT_INDEX.has(String(emailKey).toLowerCase());

/**
 * Điểm đóng góp ước lượng của thành viên mô phỏng trong kỳ.
 * Toàn thời gian = XP tích luỹ; các kỳ ngắn quy theo nhịp đóng góp tháng.
 */
export const cohortActivityPoints = (emailKey: string, period: StudyPeriod): number => {
  const member = COHORT_INDEX.get(emailKey.toLowerCase());
  if (!member) return 0;
  const jitter = 0.82 + (hashString(emailKey) % 37) / 100; /* 0.82 – 1.18 */
  const share: Record<StudyPeriod, number> = { week: 0.3, month: 1, year: 9, all: 0 };
  if (period === 'all') return member.xp;
  return Math.max(0, Math.round(member.monthlyPoints * share[period] * jitter));
};

export const cohortMemberByEmail = (emailKey: string): CohortMember | undefined =>
  COHORT_INDEX.get(emailKey.toLowerCase());

export { COHORT_DOMAIN };
