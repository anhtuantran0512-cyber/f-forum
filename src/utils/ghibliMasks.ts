/* Bản quyền trí tuệ thuộc về BroAmStuck */
import type { SubjectTag } from '../types';

export const GHIBLI_MASKS = [
  'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="howlGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="50%" stop-color="#1e1b4b"/>
            <stop offset="100%" stop-color="#090d16"/>
          </linearGradient>
          <radialGradient id="howlEye" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#0284c7"/>
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
        <path d="M15,35 Q50,10 85,35 Q90,65 50,85 Q10,65 15,35 Z" fill="url(#howlGrad)" stroke="#facc15" stroke-width="2.5"/>
        <path d="M22,42 Q36,36 45,46 Q34,54 22,42 Z" fill="#030712" stroke="#38bdf8" stroke-width="1.5"/>
        <path d="M78,42 Q64,36 55,46 Q66,54 78,42 Z" fill="#030712" stroke="#38bdf8" stroke-width="1.5"/>
        <circle cx="35" cy="45" r="3.5" fill="url(#howlEye)"/>
        <circle cx="65" cy="45" r="3.5" fill="url(#howlEye)"/>
        <polygon points="50,18 54,28 64,30 56,38 58,48 50,42 42,48 44,38 36,30 46,28" fill="#facc15"/>
        <path d="M50,48 L50,66 M42,58 L58,58" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>
      </svg>`
    ),

  'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="nofaceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#f8fafc"/>
            <stop offset="100%" stop-color="#cbd5e1"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="#030712" stroke="#a855f7" stroke-width="2"/>
        <ellipse cx="50" cy="52" rx="34" ry="40" fill="url(#nofaceGrad)" stroke="#475569" stroke-width="1.5"/>
        <ellipse cx="36" cy="42" rx="6" ry="4" fill="#09090b"/>
        <ellipse cx="64" cy="42" rx="6" ry="4" fill="#09090b"/>
        <path d="M36,25 L36,35 M64,25 L64,35" stroke="#9333ea" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M36,49 L36,63 M64,49 L64,63" stroke="#9333ea" stroke-width="4.5" stroke-linecap="round"/>
        <ellipse cx="50" cy="72" rx="9" ry="3.5" fill="#09090b"/>
        <circle cx="50" cy="24" r="3.5" fill="#fbbf24"/>
      </svg>`
    ),

  'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <radialGradient id="monoAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ef4444"/>
            <stop offset="100%" stop-color="#991b1b"/>
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="#18181b" stroke="#ef4444" stroke-width="2"/>
        <circle cx="50" cy="50" r="38" fill="url(#monoAura)"/>
        <circle cx="34" cy="44" r="8" fill="#f8fafc" stroke="#18181b" stroke-width="2.5"/>
        <circle cx="66" cy="44" r="8" fill="#f8fafc" stroke="#18181b" stroke-width="2.5"/>
        <circle cx="34" cy="44" r="3" fill="#18181b"/>
        <circle cx="66" cy="44" r="3" fill="#18181b"/>
        <ellipse cx="50" cy="68" rx="8" ry="6" fill="#f8fafc" stroke="#18181b" stroke-width="2"/>
        <ellipse cx="50" cy="68" rx="3.5" ry="3.5" fill="#18181b"/>
        <polygon points="50,14 44,28 56,28" fill="#fef08a"/>
        <polygon points="20,50 30,44 30,56" fill="#fef08a"/>
        <polygon points="80,50 70,44 70,56" fill="#fef08a"/>
      </svg>`
    ),

  'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="calciferGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#0284c7"/>
            <stop offset="50%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#bae6fd"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="#082f49" stroke="#38bdf8" stroke-width="2"/>
        <path d="M22,78 Q10,48 30,35 Q35,15 50,10 Q65,15 70,35 Q90,48 78,78 Q50,92 22,78 Z" fill="url(#calciferGrad)" stroke="#fef08a" stroke-width="2"/>
        <circle cx="37" cy="48" r="9" fill="#ffffff" stroke="#0369a1" stroke-width="2"/>
        <circle cx="63" cy="48" r="9" fill="#ffffff" stroke="#0369a1" stroke-width="2"/>
        <circle cx="37" cy="48" r="4.5" fill="#0c4a6e"/>
        <circle cx="63" cy="48" r="4.5" fill="#0c4a6e"/>
        <circle cx="35" cy="46" r="1.5" fill="#ffffff"/>
        <circle cx="61" cy="46" r="1.5" fill="#ffffff"/>
        <path d="M42,66 Q50,74 58,66" stroke="#0c4a6e" stroke-width="3" stroke-linecap="round" fill="none"/>
      </svg>`
    ),

  'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="totoroGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#059669"/>
            <stop offset="100%" stop-color="#064e3b"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="#022c22" stroke="#10b981" stroke-width="2"/>
        <ellipse cx="50" cy="54" rx="38" ry="34" fill="url(#totoroGrad)" stroke="#34d399" stroke-width="2"/>
        <ellipse cx="32" cy="20" rx="8" ry="16" fill="#059669" stroke="#34d399" stroke-width="2"/>
        <ellipse cx="68" cy="20" rx="8" ry="16" fill="#059669" stroke="#34d399" stroke-width="2"/>
        <circle cx="35" cy="46" r="8" fill="#ffffff"/>
        <circle cx="65" cy="46" r="8" fill="#ffffff"/>
        <circle cx="35" cy="46" r="3.5" fill="#0f172a"/>
        <circle cx="65" cy="46" r="3.5" fill="#0f172a"/>
        <ellipse cx="50" cy="50" rx="4" ry="2.5" fill="#0f172a"/>
        <path d="M18,48 L30,49 M18,53 L30,52 M70,49 L82,48 M70,52 L82,53" stroke="#e2e8f0" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M40,68 Q50,73 60,68" stroke="#f8fafc" stroke-width="2" fill="none"/>
      </svg>`
    ),
];

export function getRandomGhibliMask(seed?: string | number): string {
  if (seed === undefined) {
    const idx = Math.floor(Math.random() * GHIBLI_MASKS.length);
    return GHIBLI_MASKS[idx];
  }
  let num = 0;
  if (typeof seed === 'number') {
    num = Math.abs(seed);
  } else {
    for (let i = 0; i < seed.length; i++) {
      num = (num * 31 + seed.charCodeAt(i)) >>> 0;
    }
  }
  return GHIBLI_MASKS[num % GHIBLI_MASKS.length];
}

const SUBJECT_TITLES: Record<SubjectTag, string[]> = {
  toan: ['Pháp sư Toán học', 'Pháp sư Giải tích', 'Thuật sĩ Đại số Howl', 'Hiền giả Hình học'],
  ly: ['Pháp sư Vật lý', 'Pháp sư Lượng tử Calcifer', 'Nhà giả kim Cơ học', 'Pháp sư Quang học'],
  hoa: ['Nhà giả kim Hóa học', 'Dược sư Hóa hữu cơ', 'Pháp sư Hóa nghiệm', 'Pháp sư Nguyên tố Howl'],
  sinh: ['Pháp sư Thảo mộc Yaku', 'Dược sư Sinh học', 'Pháp sư Rừng thiêng', 'Hiền giả Di truyền'],
  anh: ['Pháp sư Ngôn ngữ Totoro', 'Pháp sư Ngoại ngữ', 'Học giả Ngôn từ', 'Thuật sĩ IELTS'],
  tin: ['Pháp sư Thuật toán Cyber', 'Pháp sư Lập trình viên', 'Bậc thầy Mã hóa', 'Hiền giả Binary'],
  van: ['Pháp sư Thi ca Chihiro', 'Văn nhân Phù thủy', 'Thuật sĩ Ngôn từ', 'Sử gia Văn học'],
  su: ['Sử gia Phù thủy Haku', 'Nhà chép sử Thời gian', 'Pháp sư Cổ sử', 'Hiền giả Sử học'],
  hotro: ['Pháp sư Hỗ trợ Tân sinh viên', 'Người đồng hành Bí ẩn', 'Sứ giả Trợ giúp'],
  kinhnghiem: ['Hiền giả Kinh nghiệm FPT', 'Bậc thầy Thủ khoa', 'Tiền bối Ẩn danh'],
  share: ['Sứ giả Tri thức Mở', 'Pháp sư Chia sẻ', 'Người gieo mầm Tài liệu'],
  tamsu: ['Pháp sư Lắng nghe Tâm sự', 'Tri kỷ Dưới mưa Totoro', 'Người giữ Bí mật'],
  tamly: ['Pháp sư Chữa lành Tâm hồn', 'Nhà trị liệu Chihiro', 'Pháp sư Bình an'],
};

export function generateGhibliAlias(subject?: SubjectTag, seed?: number): string {
  let code: number;
  if (seed !== undefined) {
    const abs = Math.abs(seed);
    code = abs >= 100 && abs <= 999 ? abs : (abs % 900) + 100;
  } else {
    code = Math.floor(Math.random() * 900) + 100;
  }
  if (subject && SUBJECT_TITLES[subject]) {
    const list = SUBJECT_TITLES[subject];
    const title = list[code % list.length];
    return `${title} #${code}`;
  }
  const defaultList = [
    'Pháp sư Tri thức Ghibli',
    'Hiền giả Vô danh Howl',
    'Thuật sĩ Giác ngộ Chihiro',
    'Pháp sư Rừng thiêng Totoro',
    'Nhà giả kim Bí ẩn',
  ];
  const title = defaultList[code % defaultList.length];
  return `${title} #${code}`;
}
