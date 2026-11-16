/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Edit3,
  Upload,
  X,
  RotateCcw,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Flame,
  WifiOff,
} from 'lucide-react';
import './MemoryRealm.css';
import { rafThrottle } from '../utils/rafThrottle';
import type { User } from '../types';
import { isMasterAdmin } from '../config/admin';
import { safeStorage } from '../utils/storage';
import { playChime, playPaperPageFlip, playCrystallineChime } from '../utils/audio';
import {
  saveOfflineFlashcardProgress,
  loadOfflineFlashcardProgress,
  OFFLINE_BADGE_LABEL,
} from '../utils/offlineStudyCache';
import {
  getSavedAboutData,
  fetchAboutDataFromServer,
  saveAboutDataToServer,
  type MemoryRealmCMSData,
  type MemorySightCMSItem,
  type AboutData,
} from '../store/adminStore';
import { uploadImageToServer } from '../utils/imagePipeline';
import { DEFAULT_CLUB_COVER, handleImageError } from '../utils/mediaFallback';

const SKY_IMG = "https://raft-blast-61784561.figma.site/_assets/v11/16b5007d9c93971e26ffe4e0e3e37946f6bd538c.png";
const BACK_FOUR_IMG = "https://raft-blast-61784561.figma.site/_assets/v11/8a7f8af50e0ce92ec2e228e7b0b4112178c51cf1.png";
const BAZAAR_IMG = "https://raft-blast-61784561.figma.site/_assets/v11/864afe00e41e2fa20a5aa546e15cb807e0f81384.png";
const SPLIT_LEFT_IMG = "https://raft-blast-61784561.figma.site/_assets/v11/7536d7b60a1fce482cf6edf3f0bffd3bad5d0f8a.png";
const SPLIT_RIGHT_IMG = "https://raft-blast-61784561.figma.site/_assets/v11/392db6a6a6b98e868bd7f8d3f55bb719d51e5028.png";
const BRIDGE_IMG = "https://raft-blast-61784561.figma.site/_assets/v11/c6a6d8ef49bca43f708aa852692942c45ec950d4.png";
const FRAME_TWO_IMG = "https://raft-blast-61784561.figma.site/_assets/v11/ba75252bab2b1c510987b74837770f7bc8a6b2d4.png";

const ICON1 = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230438_d526b8b6-8a2e-4e3b-9993-3908acae03a7.png";
const ICON2 = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230442_140bc25b-b165-4249-904a-f708bff6970e.png";
const ICON3 = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230448_825949c9-ccdb-4857-b4a6-e349eccc9010.png";

interface LocalizedSightCard {
  kicker: { vie: string; eng: string };
  h3: { vie: string; eng: string };
  p: { vie: string; eng: string };
  pin: string;
}

const ORIGINAL_SIGHTS_DATA: LocalizedSightCard[] = [
  {
    kicker: { vie: "Cột Mốc 01", eng: "Milestone 01" },
    h3: { vie: "Cây Cầu Tri Thức", eng: "Bridge of Knowledge" },
    p: {
      vie: "Cổng vòm đá sừng sững bắc qua dòng sông tuổi trẻ, biểu tượng kết nối muôn phương.",
      eng: "A monumental stone arch spanning the river of youth, symbol of boundless connection.",
    },
    pin: ICON1,
  },
  {
    kicker: { vie: "Góc Hội Quán", eng: "Guild Corner" },
    h3: { vie: "Phố Cũ Rêu Phong", eng: "Cobblestone Alleys" },
    p: {
      vie: "Những con ngõ lát đá, nơi các câu lạc bộ tụ họp và thắp lên ngọn lửa đam mê.",
      eng: "Stone-paved alleys where student clubs gather and kindle the flames of passion.",
    },
    pin: ICON2,
  },
  {
    kicker: { vie: "Điểm Nhìn Cao", eng: "High Vantage" },
    h3: { vie: "Tháp Chuông Kỷ Niệm", eng: "Memory Belltower" },
    p: {
      vie: "Điểm ngắm nhìn trọn vẹn toàn cảnh miền ký ức và dòng chảy nhiệt huyết học đường.",
      eng: "A panoramic vantage point overlooking the memory realm and the vibrant stream of campus life.",
    },
    pin: ICON3,
  },
  {
    kicker: { vie: "Di Sản Trường", eng: "Campus Heritage" },
    h3: { vie: "Nhà Truyền Thống", eng: "Heritage Hall" },
    p: {
      vie: "Không gian lưu giữ những bảng thành tích, đồ án và kỷ vật của nhiều thế hệ học sinh.",
      eng: "A sanctuary preserving accolades, graduation projects, and memorabilia across generations.",
    },
    pin: ICON1,
  },
  {
    kicker: { vie: "Triển Lãm", eng: "Exhibition" },
    h3: { vie: "Biên Niên Sử F-Forum", eng: "F-Forum Chronicles" },
    p: {
      vie: "Kho lưu trữ hình ảnh và những câu chuyện kiến tạo diễn đàn đầy xúc cảm.",
      eng: "An evocative archive of photographs and the founding stories that created the forum.",
    },
    pin: ICON2,
  },
];

interface RealmFlashcard {
  id: string;
  deck: string;
  question: string;
  answer: string;
  keyFormula?: string;
  topic: string;
  difficulty: 'Cơ bản' | 'Vận dụng' | 'Vận dụng cao';
}

const REALM_FLASHCARD_DECKS: Record<string, { title: string; cards: RealmFlashcard[] }> = {
  math: {
    title: 'Toán học: Đạo hàm & Khảo sát hàm số',
    cards: [
      {
        id: 'mr-m-1',
        deck: 'math',
        question: 'Điều kiện cần và đủ để hàm số y = f(x) có đạo hàm trên (a; b) đồng biến trên (a; b)?',
        answer: 'f\'(x) >= 0 với mọi x thuộc (a; b) và đẳng thức f\'(x) = 0 chỉ xảy ra tại hữu hạn điểm.',
        keyFormula: "f'(x) \\ge 0, \\forall x \\in (a; b)",
        topic: 'Đơn điệu',
        difficulty: 'Cơ bản',
      },
      {
        id: 'mr-m-2',
        deck: 'math',
        question: 'Quy tắc tìm cực trị hàm số bằng đạo hàm cấp 2 (Dấu hiệu 2)?',
        answer: "Nếu f'(x_0) = 0 và f''(x_0) > 0 thì x_0 là điểm cực tiểu. Nếu f'(x_0) = 0 và f''(x_0) < 0 thì x_0 là điểm cực đại.",
        keyFormula: "f'(x_0) = 0, f''(x_0) \\gtrless 0",
        topic: 'Cực trị',
        difficulty: 'Vận dụng',
      },
      {
        id: 'mr-m-3',
        deck: 'math',
        question: 'Công thức tính khoảng cách từ điểm M(x_0, y_0, z_0) đến mặt phẳng (P): Ax + By + Cz + D = 0?',
        answer: 'd(M, (P)) = |Ax_0 + By_0 + Cz_0 + D| / sqrt(A^2 + B^2 + C^2)',
        keyFormula: "d(M, (P)) = \\frac{|Ax_0 + By_0 + Cz_0 + D|}{\\sqrt{A^2 + B^2 + C^2}}",
        topic: 'Hình học Oxyz',
        difficulty: 'Cơ bản',
      },
    ],
  },
  physics: {
    title: 'Vật lý: Dao động cơ & Sóng cơ',
    cards: [
      {
        id: 'mr-p-1',
        deck: 'physics',
        question: 'Mối liên hệ về pha giữa li độ x, vận tốc v và gia tốc a trong dao động điều hòa?',
        answer: 'Vận tốc sớm pha pi/2 so với li độ. Gia tốc sớm pha pi/2 so với vận tốc (ngược pha so với li độ).',
        keyFormula: "v \\perp x, a \\text{ ngược pha } x",
        topic: 'Dao động điều hòa',
        difficulty: 'Cơ bản',
      },
      {
        id: 'mr-p-2',
        deck: 'physics',
        question: 'Công thức tần số góc của con lắc lò xo và con lắc đơn?',
        answer: 'Con lắc lò xo: omega = sqrt(k/m). Con lắc đơn: omega = sqrt(g/l).',
        keyFormula: "\\omega = \\sqrt{\\frac{k}{m}}, \\omega = \\sqrt{\\frac{g}{l}}",
        topic: 'Con lắc',
        difficulty: 'Vận dụng',
      },
    ],
  },
  chemistry: {
    title: 'Hóa học: Este - Lipit & Polime',
    cards: [
      {
        id: 'mr-c-1',
        deck: 'chemistry',
        question: 'Phản ứng xà phòng hóa este là phản ứng một chiều hay thuận nghịch? Viết phương trình tổng quát?',
        answer: 'Phản ứng xà phòng hóa (thủy phân este trong môi trường kiềm) là phản ứng một chiều: RCOOR\' + NaOH -> RCOONa + R\'OH (đun nóng).',
        keyFormula: "\\text{RCOOR}' + \\text{NaOH} \\xrightarrow{t^o} \\text{RCOONa} + \\text{R}'\\text{OH}",
        topic: 'Este - Lipit',
        difficulty: 'Cơ bản',
      },
    ],
  },
  biology: {
    title: 'Sinh học: Cơ chế di truyền & Sinh thái',
    cards: [
      {
        id: 'mr-b-1',
        deck: 'biology',
        question: 'Tính thoái hóa của mã di truyền nghĩa là gì và mang ý nghĩa sinh học như thế nào?',
        answer: 'Nhiều bộ ba khác nhau cùng mã hóa cho một loại axit amin (trừ AUG và UGG), bảo vệ cơ thể trước các đột biến thay thế nucleotit.',
        keyFormula: "61 \\text{ bộ ba mã hóa } 20 \\text{ axit amin}",
        topic: 'Mã di truyền',
        difficulty: 'Cơ bản',
      },
    ],
  },
  history: {
    title: 'Lịch sử: Kháng chiến & Đổi mới',
    cards: [
      {
        id: 'mr-h-1',
        deck: 'history',
        question: 'Bài học kinh nghiệm quý báu nhất của Cách mạng Tháng Tám năm 1945 đối với sự nghiệp xây dựng đất nước?',
        answer: 'Chớp thời cơ chuẩn xác, kết hợp sức mạnh đại đoàn kết toàn dân tộc với đấu tranh chính trị và lực lượng vũ trang nhân dân.',
        keyFormula: "\\text{Thời cơ Tháng Tám 1945}",
        topic: 'Cách mạng 1945',
        difficulty: 'Vận dụng',
      },
    ],
  },
  geography: {
    title: 'Địa lý: Vùng kinh tế trọng điểm',
    cards: [
      {
        id: 'mr-g-1',
        deck: 'geography',
        question: 'Tại sao Đồng bằng sông Cửu Long là vùng sản xuất lương thực, thực phẩm lớn nhất cả nước?',
        answer: 'Nhờ diện tích đất phù sa màu mỡ rộng lớn, nguồn nước dồi dào từ sông Tiền và sông Hậu, khí hậu cận xích đạo nắng ấm quanh năm.',
        keyFormula: "\\text{ĐBSCL: Vựa lúa & thủy sản}",
        topic: 'Vùng kinh tế',
        difficulty: 'Cơ bản',
      },
    ],
  },
  literature: {
    title: 'Ngữ văn: Tác phẩm văn học hiện đại',
    cards: [
      {
        id: 'mr-l-1',
        deck: 'literature',
        question: 'Nghịch lý trong bức tranh toàn cảnh và chi tiết cận cảnh của Chiếc thuyền ngoài xa (Nguyễn Minh Châu)?',
        answer: 'Toàn cảnh từ xa là cảnh đắt trời cho thơ mộng thanh thuần; cận cảnh lại là cảnh tượng bạo lực gia đình tàn nhẫn, nhắc nhở người nghệ sĩ phải nhìn đời đa diện.',
        keyFormula: "\\text{Khoảng cách nghệ thuật và hiện thực}",
        topic: 'Hiện thực nhân sinh',
        difficulty: 'Vận dụng cao',
      },
    ],
  },
  english: {
    title: 'Tiếng Anh: Cấu trúc câu & Cụm từ nâng cao',
    cards: [
      {
        id: 'mr-e-1',
        deck: 'english',
        question: 'Cấu trúc đảo ngữ với Hardly / Scarcely mang nghĩa vừa mới... thì...?',
        answer: 'Hardly / Scarcely + had + S + V(pII) + when + S + V(quá khứ đơn).',
        keyFormula: "\\text{Hardly had S + V3 when S + V2}",
        topic: 'Inversion',
        difficulty: 'Vận dụng',
      },
    ],
  },
  informatics: {
    title: 'Tin học: Thuật toán & Cấu trúc dữ liệu',
    cards: [
      {
        id: 'mr-i-1',
        deck: 'informatics',
        question: 'Hai điều kiện tiên quyết để áp dụng phương pháp Quy hoạch động (Dynamic Programming)?',
        answer: 'Bài toán có cấu trúc con tối ưu (Optimal Substructure) và các bài toán con gối nhau (Overlapping Subproblems).',
        keyFormula: "\\text{DP: Memoization / Tabulation}",
        topic: 'Quy hoạch động',
        difficulty: 'Vận dụng cao',
      },
    ],
  },
  philosophy: {
    title: 'Triết học: Phép biện chứng duy vật',
    cards: [
      {
        id: 'mr-ph-1',
        deck: 'philosophy',
        question: 'Nội dung cốt lõi của quy luật chuyển hóa từ những sự thay đổi về lượng dẫn đến sự thay đổi về chất?',
        answer: 'Tích lũy về lượng đến giới hạn điểm nút sẽ dẫn tới bước nhảy làm chất cũ mất đi, chất mới ra đời ở độ mới.',
        keyFormula: "\\text{Lượng đổi } \\rightarrow \\text{ Điểm nút } \\rightarrow \\text{ Bước nhảy Chất mới}",
        topic: 'Biện chứng duy vật',
        difficulty: 'Cơ bản',
      },
    ],
  },
  astronomy: {
    title: 'Thiên văn: Cơ học thiên thể & Vật lý sao',
    cards: [
      {
        id: 'mr-as-1',
        deck: 'astronomy',
        question: 'Định luật Kepler thứ ba về chuyển động hành tinh quanh Mặt Trời phát biểu thế nào?',
        answer: 'Bình phương chu kỳ quỹ đạo tỉ lệ thuận với lập phương bán trục lớn của quỹ đạo hình elip.',
        keyFormula: "\\frac{T_1^2}{T_2^2} = \\frac{a_1^3}{a_2^3}",
        topic: 'Định luật Kepler',
        difficulty: 'Vận dụng',
      },
    ],
  },
  arts: {
    title: 'Nghệ thuật: Lịch sử mỹ thuật & Hòa âm',
    cards: [
      {
        id: 'mr-ar-1',
        deck: 'arts',
        question: 'Đặc điểm then chốt làm nên sự bứt phá của trường phái Ấn tượng (Impressionism)?',
        answer: 'Nắm bắt khoảnh khắc ánh sáng và màu sắc tức thời ngoài thiên nhiên, từ bỏ lối vẽ pha trộn mịn màng kinh viện để dùng những nhát cọ ngắn dứt khoát.',
        keyFormula: "\\text{Trường phái Ấn tượng: Ánh sáng & Khoảnh khắc}",
        topic: 'Hội họa kinh điển',
        difficulty: 'Cơ bản',
      },
    ],
  },
};

const DEFAULT_MEMORY_CMS: Required<MemoryRealmCMSData> = {
  heroTitleVie: 'KÝ ỨC',
  heroTitleEng: 'MEMORY',
  introCopyVie:
    'Một nhịp cầu đá, dòng nước xanh ngọc và miền ký ức trường xưa đọng lại qua từng khoảnh khắc không thể nào quên.',
  introCopyEng:
    'A stone bridge, emerald waters, and memories of campus life etched into every unforgettable moment.',
  heroTagsVie: ['Cây Cầu Tri Thức', 'Dòng Sông Tuổi Trẻ', 'Di Sản F-Forum'],
  heroTagsEng: ['Bridge of Knowledge', 'River of Youth', 'F-Forum Heritage'],
  bridgeTitleVie: 'Cây cầu kết nối ngàn thế hệ.',
  bridgeTitleEng: 'The bridge connecting generations.',
  bridgeBodyVie:
    'Nhịp cầu nối đôi bờ sông quá khứ và tương lai, nâng đỡ những ước mơ học trò vươn ra biển lớn.',
  bridgeBodyEng:
    'A span bridging the rivers of past and future, carrying student dreams out into the wider world.',
  fact1Title: '2026',
  fact1DescVie: 'Dấu ấn F-Forum khởi sinh kỷ nguyên tri thức',
  fact1DescEng: 'F-Forum milestone marks the dawn of a knowledge era',
  fact2TitleVie: 'VÔ HẠN',
  fact2TitleEng: 'INFINITE',
  fact2DescVie: 'Những tình bạn và kỷ niệm lưu dấu ngàn sau',
  fact2DescEng: 'Friendships and memories preserved forever',
  bazaarTitleVie: 'Góc phố lưu giữ bước chân xưa.',
  bazaarTitleEng: 'Streets echoing past footsteps.',
  bazaarBodyVie:
    'Những góc hành lang, quán nước thân thương và tiếng cười bạn bè vẫn vẹn nguyên trong từng nhịp thở của thời gian.',
  bazaarBodyEng:
    'Familiar corridors, cozy hangout corners, and laughter of friends remain vivid in every breath of time.',
  bazaarButtonVie: 'Khám phá biên niên sử',
  bazaarButtonEng: 'Explore Chronicles',
  skyImg: SKY_IMG,
  backFourImg: BACK_FOUR_IMG,
  bazaarImg: BAZAAR_IMG,
  splitLeftImg: SPLIT_LEFT_IMG,
  splitRightImg: SPLIT_RIGHT_IMG,
  bridgeImg: BRIDGE_IMG,
  frameTwoImg: FRAME_TWO_IMG,
  sights: ORIGINAL_SIGHTS_DATA.map((item) => ({
    kickerVie: item.kicker.vie,
    kickerEng: item.kicker.eng,
    titleVie: item.h3.vie,
    titleEng: item.h3.eng,
    descVie: item.p.vie,
    descEng: item.p.eng,
    pinUrl: item.pin,
  })),
};

function mergeMemoryCMS(raw?: MemoryRealmCMSData | null): Required<MemoryRealmCMSData> {
  if (!raw || typeof raw !== 'object') return DEFAULT_MEMORY_CMS;
  const mergedSights: MemorySightCMSItem[] = DEFAULT_MEMORY_CMS.sights.map((def, i) => {
    const s = Array.isArray(raw.sights) ? raw.sights[i] : undefined;
    return {
      kickerVie: s?.kickerVie || def.kickerVie,
      kickerEng: s?.kickerEng || def.kickerEng,
      titleVie: s?.titleVie || def.titleVie,
      titleEng: s?.titleEng || def.titleEng,
      descVie: s?.descVie || def.descVie,
      descEng: s?.descEng || def.descEng,
      pinUrl: s?.pinUrl || def.pinUrl,
    };
  });
  return {
    ...DEFAULT_MEMORY_CMS,
    ...raw,
    heroTagsVie:
      Array.isArray(raw.heroTagsVie) && raw.heroTagsVie.length === 3
        ? raw.heroTagsVie
        : DEFAULT_MEMORY_CMS.heroTagsVie,
    heroTagsEng:
      Array.isArray(raw.heroTagsEng) && raw.heroTagsEng.length === 3
        ? raw.heroTagsEng
        : DEFAULT_MEMORY_CMS.heroTagsEng,
    sights: mergedSights,
  };
}

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const smoothstep = (e0: number, e1: number, v: number) => {
  const x = clamp((v - e0) / (e1 - e0));
  return x * x * (3 - 2 * x);
};
const segmentInOut = (s: number, a: number, b: number, c: number, d: number) => {
  const enter = smoothstep(a, b, s);
  const exit = smoothstep(c, d, s);
  return { enter, exit, active: enter * (1 - exit) };
};

export interface MemoryRealmProps {
  onNavigateSection?: (sectionId: string) => void;
  currentUser?: User | null;
}

export const MemoryRealm: React.FC<MemoryRealmProps> = ({ onNavigateSection, currentUser }) => {
  const isSuperAdmin = isMasterAdmin(currentUser?.email);
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const [activeSight, setActiveSight] = useState(5);
  const [isJumping, setIsJumping] = useState(false);
  const [language, setLanguage] = useState<'VIE' | 'ENG'>('VIE');
  const isTransitioningRef = useRef(false);

  const [cmsData, setCmsData] = useState<Required<MemoryRealmCMSData>>(() => {
    const savedAbout = getSavedAboutData();
    if (savedAbout.memoryRealm) return mergeMemoryCMS(savedAbout.memoryRealm);
    const localSaved = safeStorage.getItem('fforum_memory_realm_data');
    if (localSaved) {
      try {
        return mergeMemoryCMS(JSON.parse(localSaved));
      } catch {
        
      }
    }
    return DEFAULT_MEMORY_CMS;
  });

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'sights' | 'copy' | 'layers'>('sights');
  const [selectedSightIdx, setSelectedSightIdx] = useState(0);
  const [isUploadingImg, setIsUploadingImg] = useState(false);

  const [realmMode, setRealmMode] = useState<'panorama' | 'srs'>('panorama');
  const [selectedDeckKey, setSelectedDeckKey] = useState<string>('math');
  const [srsIndex, setSrsIndex] = useState(0);
  const [isSrsFlipped, setIsSrsFlipped] = useState(false);
  const [masteredSrsIds, setMasteredSrsIds] = useState<Set<string>>(() => new Set());
  const [reviewSrsIds, setReviewSrsIds] = useState<Set<string>>(() => new Set());
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  const [srsTouchStartX, setSrsTouchStartX] = useState<number | null>(null);
  const [srsSwipeOffset, setSrsSwipeOffset] = useState<number>(0);
  const [isSrsSwiping, setIsSrsSwiping] = useState<boolean>(false);

  const activeDeck = REALM_FLASHCARD_DECKS[selectedDeckKey] || REALM_FLASHCARD_DECKS.math;
  const activeDeckCards = activeDeck.cards;
  const currentSrsCard = activeDeckCards[srsIndex] || activeDeckCards[0];

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const saved = loadOfflineFlashcardProgress(`realm_${selectedDeckKey}`);
    if (saved) {
      if (typeof saved.cardIndex === 'number' && saved.cardIndex < activeDeckCards.length) {
        setSrsIndex(saved.cardIndex);
      }
      if (Array.isArray(saved.masteredIds)) {
        setMasteredSrsIds(new Set(saved.masteredIds));
      }
      if (Array.isArray(saved.reviewIds)) {
        setReviewSrsIds(new Set(saved.reviewIds));
      }
    }
  }, [selectedDeckKey, activeDeckCards.length]);

  useEffect(() => {
    saveOfflineFlashcardProgress(
      `realm_${selectedDeckKey}`,
      srsIndex,
      Array.from(masteredSrsIds),
      Array.from(reviewSrsIds)
    );
  }, [selectedDeckKey, srsIndex, masteredSrsIds, reviewSrsIds]);

  const handleSrsTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setSrsTouchStartX(e.touches[0].clientX);
      setIsSrsSwiping(true);
    }
  };

  const handleSrsTouchMove = (e: React.TouchEvent) => {
    if (srsTouchStartX === null || !isSrsSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - srsTouchStartX;
    setSrsSwipeOffset(diff);
  };

  const handleSrsTouchEnd = () => {
    if (srsTouchStartX === null) return;
    if (srsSwipeOffset > 75) {
      if (currentSrsCard) {
        setMasteredSrsIds((prev) => new Set([...prev, currentSrsCard.id]));
        setReviewSrsIds((prev) => {
          const next = new Set(prev);
          next.delete(currentSrsCard.id);
          return next;
        });
        playCrystallineChime();
        playChime('success');
        setIsSrsFlipped(false);
        setSrsIndex((prev) => (prev < activeDeckCards.length - 1 ? prev + 1 : 0));
      }
    } else if (srsSwipeOffset < -75) {
      if (currentSrsCard) {
        setReviewSrsIds((prev) => new Set([...prev, currentSrsCard.id]));
        setMasteredSrsIds((prev) => {
          const next = new Set(prev);
          next.delete(currentSrsCard.id);
          return next;
        });
        playChime('xp');
        setIsSrsFlipped(false);
        setSrsIndex((prev) => (prev < activeDeckCards.length - 1 ? prev + 1 : 0));
      }
    }
    setSrsTouchStartX(null);
    setSrsSwipeOffset(0);
    setIsSrsSwiping(false);
  };

  useEffect(() => {
    let cancelled = false;
    fetchAboutDataFromServer()
      .then((about) => {
        if (!cancelled && about?.memoryRealm) {
          setCmsData(mergeMemoryCMS(about.memoryRealm));
        }
      })
      .catch(() => {});

    const onLocalSync = (e: Event) => {
      const detail = (e as CustomEvent<AboutData>).detail;
      if (detail?.memoryRealm) setCmsData(mergeMemoryCMS(detail.memoryRealm));
    };
    window.addEventListener('fforum_about_sync', onLocalSync);
    return () => {
      cancelled = true;
      window.removeEventListener('fforum_about_sync', onLocalSync);
    };
  }, []);

  const allSightCards = useMemo<LocalizedSightCard[]>(() => {
    const base: LocalizedSightCard[] = cmsData.sights.map((s) => ({
      kicker: { vie: s.kickerVie, eng: s.kickerEng },
      h3: { vie: s.titleVie, eng: s.titleEng },
      p: { vie: s.descVie, eng: s.descEng },
      pin: s.pinUrl,
    }));
    return [...base, ...base, ...base];
  }, [cmsData.sights]);

  const handleSaveMemoryCMS = useCallback(() => {
    safeStorage.setItem('fforum_memory_realm_data', JSON.stringify(cmsData));
    if (currentUser && isSuperAdmin) {
      const currentAbout = getSavedAboutData();
      saveAboutDataToServer(
        {
          ...currentAbout,
          memoryRealm: cmsData,
        },
        currentUser.email,
      ).catch(() => {});
    }
    setIsAdminModalOpen(false);
  }, [cmsData, currentUser, isSuperAdmin]);

  const handleUploadMemoryImage = (
    e: React.ChangeEvent<HTMLInputElement>,
    applyUrl: (url: string) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) applyUrl(dataUrl);
    };
    reader.readAsDataURL(file);

    setIsUploadingImg(true);
    uploadImageToServer(file, 'post')
      .then((uploaded) => {
        if (uploaded.url) applyUrl(uploaded.url);
      })
      .catch(() => {})
      .finally(() => setIsUploadingImg(false));
  };

  useEffect(() => {
    let currentSmoothScroll = 0;
    let targetScroll = 0;
    let rafId = 0;
    let isInitialized = false;

    const getScrollDistance = () => {
      if (!sectionRef.current) return 0;
      return clamp(
        -sectionRef.current.getBoundingClientRect().top,
        0,
        Math.max(1, sectionRef.current.offsetHeight - window.innerHeight)
      );
    };

    const update = () => {
      rafId = 0;
      targetScroll = getScrollDistance();
      if (!isInitialized) {
        currentSmoothScroll = targetScroll;
        isInitialized = true;
      } else {
        currentSmoothScroll += (targetScroll - currentSmoothScroll) * 0.22;
        if (Math.abs(targetScroll - currentSmoothScroll) < 0.15) {
          currentSmoothScroll = targetScroll;
        }
      }
      const smoothScroll = currentSmoothScroll;

      const frame2 = segmentInOut(smoothScroll, 280, 520, 820, 1040);
      const frame3 = segmentInOut(smoothScroll, 1080, 1320, 1580, 1740);
      const progress = clamp(smoothScroll / 1740);
      const introExit = smoothstep(50, 360, smoothScroll);
      const sightsEnterRaw = smoothstep(1380, 1960, smoothScroll);
      const sightsEnter = Math.pow(sightsEnterRaw, 1.35);
      const sightsControlsEnter = smoothstep(1780, 2100, smoothScroll);
      const blurActive = clamp(frame2.active + frame3.active);
      const frame2Opacity = frame2.active * (1 - frame3.enter);
      const splitDrift = Math.pow(frame2.enter, 1.4);
      const panel2Opacity = frame2.active * (1 - frame2.exit);
      const panel3Opacity = frame3.active * (1 - frame3.exit);
      const backScale = 0.76 + progress * 0.2 + frame2.enter * 0.18 + frame3.enter * 0.16;
      const sharedHeroY = progress * -74;
      const sharedHeroScale = progress * 0.23;
      const sightsScreenTop = Math.min(220, Math.max(112, window.innerHeight * 0.19)) - 50;
      const sightsParentTop = sightsScreenTop;

      const el = sectionRef.current;
      if (el) {
        el.style.setProperty('--back-scale', backScale.toFixed(4));
        el.style.setProperty('--back-y', `${(progress * -40).toFixed(2)}px`);
        el.style.setProperty('--four-y', `${(10 - progress * 8).toFixed(2)}vh`);
        el.style.setProperty('--four-scale', `${(0.78 + progress * 0.12).toFixed(4)}`);
        el.style.setProperty('--bazaar-y', `${(20 - progress * 16).toFixed(2)}vh`);
        el.style.setProperty('--blur-px', '0px');
        el.style.setProperty('--back-brightness', (1 - blurActive * 0.15).toFixed(3));
        el.style.setProperty('--bazaar-blur-px', '0px');
        el.style.setProperty('--bazaar-brightness', (1 + frame3.active * 0.1).toFixed(3));
        el.style.setProperty('--bazaar-saturation', (1 + blurActive * 0.2).toFixed(3));

        el.style.setProperty('--shade-top-alpha', (blurActive * 0.25).toFixed(3));
        el.style.setProperty('--shade-mid-alpha', (blurActive * 0.45).toFixed(3));
        el.style.setProperty('--shade-bottom-alpha', (blurActive * 0.65).toFixed(3));

        el.style.setProperty('--title-y', `${sharedHeroY.toFixed(2)}px`);
        el.style.setProperty('--title-scale', (1 + sharedHeroScale).toFixed(4));
        el.style.setProperty('--title-opacity', (1 - introExit).toFixed(3));

        el.style.setProperty('--bridge-y', `${(frame2.enter * 180).toFixed(2)}px`);
        el.style.setProperty('--bridge-scale', (1.02 + frame2.enter * 0.35).toFixed(4));

        el.style.setProperty('--split-left-x', `calc(-50% - ${(splitDrift * 35).toFixed(2)}vw)`);
        el.style.setProperty('--split-left-y', `${(splitDrift * 40).toFixed(2)}px`);
        el.style.setProperty('--split-left-scale', (1 + splitDrift * 0.1).toFixed(4));

        el.style.setProperty('--split-right-x', `calc(-50% + ${(splitDrift * 35).toFixed(2)}vw)`);
        el.style.setProperty('--split-right-y', `${(splitDrift * 40).toFixed(2)}px`);
        el.style.setProperty('--split-right-scale', (1 + splitDrift * 0.1).toFixed(4));

        el.style.setProperty('--frame2-opacity', frame2Opacity.toFixed(3));
        el.style.setProperty('--frame2-scale', (1.06 + frame2.exit * 0.1).toFixed(4));

        el.style.setProperty('--intro-copy-y', `${(introExit * -50).toFixed(2)}px`);
        el.style.setProperty('--intro-copy-opacity', (1 - introExit).toFixed(3));

        el.style.setProperty('--panel2-opacity', panel2Opacity.toFixed(3));
        el.style.setProperty('--panel2-y', `calc(-50% + ${((1 - frame2.enter) * 58 - frame2.exit * 40).toFixed(2)}px)`);

        el.style.setProperty('--panel3-opacity', panel3Opacity.toFixed(3));
        el.style.setProperty('--panel3-y', `calc(-50% + ${((1 - frame3.enter) * 58 - frame3.exit * 40).toFixed(2)}px)`);
        el.style.setProperty('--panel3-pointer-events', panel3Opacity > 0.15 ? 'auto' : 'none');

        el.style.setProperty('--sights-opacity', sightsEnter.toFixed(3));
        el.style.setProperty('--sights-controls-opacity', sightsControlsEnter.toFixed(3));
        el.style.setProperty('--sights-enter-x', `${((1 - sightsEnter) * 120).toFixed(2)}vw`);
        el.style.setProperty('--sights-visibility', sightsEnterRaw > 0.001 ? 'visible' : 'hidden');
        el.style.setProperty('--sights-top', `${sightsParentTop.toFixed(2)}px`);
        el.style.setProperty('--sights-screen-top', `${sightsScreenTop.toFixed(2)}px`);
      }

      if (controlsRef.current) {
        if (sightsControlsEnter > 0.7) {
          controlsRef.current.classList.add('is-ready');
        } else {
          controlsRef.current.classList.remove('is-ready');
        }
      }

      if (Math.abs(targetScroll - currentSmoothScroll) >= 0.15) {
        rafId = requestAnimationFrame(update);
      }
    };

    const scheduleUpdate = () => {
      if (!rafId) {
        rafId = requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, []);

  useEffect(() => {
    let mouseRaf = 0;
    let clientX = 0;
    let clientY = 0;
    const flushMouse = () => {
      mouseRaf = 0;
      if (!sectionRef.current) return;
      const mx = (clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      const my = (clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
      sectionRef.current.style.setProperty('--mx', mx.toFixed(3));
      sectionRef.current.style.setProperty('--my', my.toFixed(3));
    };
    const handleMouseMove = (e: MouseEvent) => {
      clientX = e.clientX;
      clientY = e.clientY;
      if (!mouseRaf) {
        mouseRaf = requestAnimationFrame(flushMouse);
      }
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      if (mouseRaf) cancelAnimationFrame(mouseRaf);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const getCardStep = useCallback(() => {
    if (!trackRef.current) return 400;
    const cards = trackRef.current.querySelectorAll('.sight-card');
    if (cards.length >= 2) {
      const el0 = cards[0] as HTMLElement;
      const el1 = cards[1] as HTMLElement;
      const delta = el1.offsetLeft - el0.offsetLeft;
      if (delta > 50) return delta;
    }
    if (typeof window !== 'undefined') {
      if (window.innerWidth <= 640) {
        return Math.min(window.innerWidth * 0.82, 330) + 16;
      }
      const cardWidth = Math.min(430, Math.max(360, window.innerWidth * 0.194));
      const gap = Math.min(24, Math.max(16, window.innerWidth * 0.0115));
      return cardWidth + gap;
    }
    return 400;
  }, []);

  const updateSliderShift = useCallback((index: number) => {
    if (!sectionRef.current) return;
    const step = getCardStep();
    const shift = -index * step;
    sectionRef.current.style.setProperty('--sights-shift', `${shift}px`);
  }, [getCardStep]);

  useEffect(() => {
    updateSliderShift(activeSight);
  }, [activeSight, updateSliderShift]);

  useEffect(() => {
    const handleResize = () => {
      const track = trackRef.current;
      if (track && sectionRef.current) {
        track.classList.add('is-jumping');
        void track.offsetHeight;
        updateSliderShift(activeSight);
        void track.offsetHeight;
        requestAnimationFrame(() => {
          if (trackRef.current && !isJumping) {
            trackRef.current.classList.remove('is-jumping');
          }
        });
      }
    };
    
    const handleResizeFrame = rafThrottle(handleResize);
    window.addEventListener('resize', handleResizeFrame, { passive: true });
    return () => { window.removeEventListener('resize', handleResizeFrame); handleResizeFrame.cancel(); }
  }, [activeSight, isJumping, updateSliderShift]);

  const moveSightSlider = (delta: number) => {
    if (isJumping || isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setActiveSight(prev => {
      const next = prev + delta;
      return Math.max(1, Math.min(13, next));
    });
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 700);
  };

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target !== trackRef.current || (e.propertyName && e.propertyName !== 'transform')) return;
    isTransitioningRef.current = false;

    const track = trackRef.current;
    if (!track || !sectionRef.current) return;

    if (activeSight >= 10 || activeSight < 5) {
      const reset = activeSight >= 10 ? activeSight - 5 : activeSight + 5;

      track.classList.add('is-jumping');
      setIsJumping(true);

      void track.offsetHeight;

      const step = getCardStep();
      sectionRef.current.style.setProperty('--sights-shift', `${-reset * step}px`);
      void track.offsetHeight;

      setActiveSight(reset);

      requestAnimationFrame(() => {
        track.classList.remove('is-jumping');
        setIsJumping(false);
      });
    }
  };

  const scrollToScrubPoint = (e: React.MouseEvent, scrubPx: number) => {
    e.preventDefault();
    if (!sectionRef.current) return;
    const sectionTop = window.scrollY + sectionRef.current.getBoundingClientRect().top;
    window.scrollTo({ top: sectionTop + scrubPx, behavior: 'smooth' });
  };

  const scrollToChronicles = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigateSection) {
      onNavigateSection('chronicles');
      return;
    }
    const el = document.getElementById('chronicles-section') || document.getElementById('routes');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else if (sectionRef.current) {
      const sectionBottom = window.scrollY + sectionRef.current.getBoundingClientRect().top + sectionRef.current.offsetHeight;
      window.scrollTo({ top: sectionBottom, behavior: 'smooth' });
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'VIE' ? 'ENG' : 'VIE'));
  };

  return (
    <section className="cinema-scroll" id="cinema" aria-label="Mostar cinematic scroll story" ref={sectionRef}>
      <div className="stage">
        <div className="world">
          <img
            className="scene-img sky-img"
            src={cmsData.skyImg}
            alt="Sky layer"
            loading="lazy"
            decoding="async"
            width={1920}
            height={1080}
            onError={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
          />

          <header className="site-header" aria-label="Primary navigation">
            <a
              className="site-logo flex items-center gap-2"
              href="#cinema"
              onClick={(e) => scrollToScrubPoint(e, 0)}
            >
              <span>
                <span className="ff-swash-cap text-base">M</span>iền Ký Ức
              </span>
            </a>
            <nav className="site-nav" aria-label="Main menu">
              <a href="#cinema" onClick={(e) => scrollToScrubPoint(e, 0)}>
                {language === 'VIE' ? 'Khởi nguyên' : 'Origin'}
              </a>
              <a href="#bridge" onClick={(e) => scrollToScrubPoint(e, 520)}>
                {language === 'VIE' ? 'Nhịp cầu' : 'The Bridge'}
              </a>
              <a href="#bazaar" onClick={(e) => scrollToScrubPoint(e, 1320)}>
                {language === 'VIE' ? 'Góc quán' : 'The Bazaar'}
              </a>
              <a href="#routes" onClick={scrollToChronicles}>
                {language === 'VIE' ? 'Biên niên sử' : 'Chronicles'}
              </a>
            </nav>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setRealmMode((prev) => (prev === 'panorama' ? 'srs' : 'panorama'));
                  setIsSrsFlipped(false);
                }}
                className="ff-tactile-btn px-3 py-1.5 rounded-full bg-[#f4f1de] hover:bg-[#f2cc8f] text-[#0b0d12] border-2 border-[#0b0d12] text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md"
                title={realmMode === 'panorama' ? 'Chuyển sang Vương Quốc Trí Nhớ SRS Flashcard' : 'Quay lại toàn cảnh'}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#e07a5f]" />
                <span>{realmMode === 'panorama' ? 'Trí Nhớ SRS' : 'Toàn Cảnh'}</span>
              </button>
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setAdminTab('layers');
                    setIsAdminModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold flex items-center gap-1.5 shadow-lg cursor-pointer transition-all"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Đổi ảnh nền</span>
                </button>
              )}
              <button
                className="language-switcher"
                aria-label="Change language"
                onClick={toggleLanguage}
              >
                <span>{language}</span>
                <span aria-hidden="true">⌄</span>
              </button>
            </div>
          </header>

          {realmMode === 'srs' && (() => {
            const totalSrsCount = activeDeckCards.length;
            const masteredSrsCount = masteredSrsIds.size;
            const reviewSrsCount = reviewSrsIds.size;
            const learningSrsCount = Math.max(0, totalSrsCount - masteredSrsCount - reviewSrsCount);
            const masteredSrsPct = totalSrsCount > 0 ? Math.round((masteredSrsCount / totalSrsCount) * 100) : 0;
            const reviewSrsPct = totalSrsCount > 0 ? Math.round((reviewSrsCount / totalSrsCount) * 100) : 0;
            const learningSrsPct = totalSrsCount > 0 ? Math.max(0, 100 - masteredSrsPct - reviewSrsPct) : 0;

            return (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4 sm:p-8 bg-[#090d14]/95 backdrop-blur-xl overflow-y-auto animate-fade-in">
              <div className="w-full max-w-2xl flex flex-col space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-dashed border-white/15 gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#f2cc8f]/18 border-[1.5px] border-[#f2cc8f]/40 flex items-center justify-center text-[#f2cc8f] shadow-sm">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[#f4f1de] flex items-center gap-2">
                        <span className="ff-swash-cap text-base">V</span>ương Quốc Trí Nhớ Flashcard SRS
                      </h2>
                      <p className="text-xs text-[#9a978e]">Ôn tập lặp lại ngắt quãng để khắc sâu tri thức dài hạn</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isOnline && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
                        <WifiOff className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{OFFLINE_BADGE_LABEL}</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setRealmMode('panorama')}
                      className="ff-tactile-btn p-2 rounded-xl bg-[#111722] hover:bg-white/10 border border-white/15 text-[#d8d5ce] cursor-pointer"
                      title="Quay lại toàn cảnh"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {Object.entries(REALM_FLASHCARD_DECKS).map(([k, d]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setSelectedDeckKey(k);
                        setSrsIndex(0);
                        setIsSrsFlipped(false);
                      }}
                      className={`ff-tactile-btn px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                        selectedDeckKey === k
                          ? 'bg-[#FBF2E1] text-[#2B2331] border-[#2B2331] shadow-sm font-extrabold'
                          : 'bg-[#111722] text-[#9a978e] border-white/10 hover:text-white'
                      }`}
                    >
                      {d.title.split(':')[0]}
                    </button>
                  ))}
                </div>

                <div className="p-3 rounded-2xl bg-[#111722] border border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-mono flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-300 font-bold">
                        <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span>Chuỗi 7 ngày</span>
                      </span>
                      <span className="text-[#81b29a]">
                        Tỷ lệ nhớ: <strong className="text-white">{masteredSrsCount > 0 ? Math.round((masteredSrsCount / Math.max(1, totalSrsCount)) * 100) : 0}%</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        Thuộc: {masteredSrsCount} ({masteredSrsPct}%)
                      </span>
                      <span className="text-amber-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        Đang học: {learningSrsCount} ({learningSrsPct}%)
                      </span>
                      <span className="text-[#ff9b71] flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#73324c] border border-[#ff9b71]" />
                        Cần ôn: {reviewSrsCount} ({reviewSrsPct}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-[#0b0d12] rounded-full overflow-hidden flex border border-[#f4f1de]/15">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                      style={{ width: `${masteredSrsPct}%` }}
                      title={`Đã thuộc: ${masteredSrsCount}`}
                    />
                    <div
                      className="h-full bg-amber-500 transition-all duration-500 ease-out"
                      style={{ width: `${learningSrsPct}%` }}
                      title={`Đang học: ${learningSrsCount}`}
                    />
                    <div
                      className="h-full bg-[#73324c] transition-all duration-500 ease-out"
                      style={{ width: `${reviewSrsPct}%` }}
                      title={`Cần ôn gấp: ${reviewSrsCount}`}
                    />
                  </div>
                </div>

                <div
                  className="ff-flashcard-perspective relative cursor-pointer select-none touch-pan-y"
                  onClick={() => {
                    setIsSrsFlipped(!isSrsFlipped);
                    playPaperPageFlip();
                  }}
                  onTouchStart={handleSrsTouchStart}
                  onTouchMove={handleSrsTouchMove}
                  onTouchEnd={handleSrsTouchEnd}
                  style={{
                    transform: srsSwipeOffset ? `translateX(${srsSwipeOffset}px) rotate(${srsSwipeOffset * 0.07}deg)` : undefined,
                    transition: isSrsSwiping ? 'none' : 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  }}
                >
                  {srsSwipeOffset > 35 && (
                    <div className="absolute top-4 right-4 z-40 px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-black text-xs shadow-lg border border-white/40 flex items-center gap-1.5 select-none animate-pulse">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ĐÃ THUỘC (VUỐT PHẢI)</span>
                    </div>
                  )}
                  {srsSwipeOffset < -35 && (
                    <div className="absolute top-4 left-4 z-40 px-3 py-1.5 rounded-xl bg-rose-500 text-white font-black text-xs shadow-lg border border-white/40 flex items-center gap-1.5 select-none animate-pulse">
                      <RotateCcw className="w-4 h-4" />
                      <span>CẦN ÔN LẠI (VUỐT TRÁI)</span>
                    </div>
                  )}
                  <div className={`ff-flashcard-inner ${isSrsFlipped ? 'is-flipped' : ''}`}>
                    <div className="ff-flashcard-face ff-flashcard-front card-hard rounded-[16px] p-6 flex flex-col justify-between" style={{ background: '#2B2331', color: '#FBF2E1' }}>
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-[#f2cc8f]/20 text-[#f2cc8f] border border-[#f2cc8f]/35">
                              Thẻ {srsIndex + 1} / {activeDeckCards.length}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white/10 text-[#d8d5ce]">
                              {currentSrsCard.topic}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#81b29a]/20 text-[#d8f3dc]">
                              {currentSrsCard.difficulty}
                            </span>
                          </div>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-[#FBF2E1] leading-relaxed mt-4">
                          {currentSrsCard.question}
                        </h3>
                      </div>
                      <div className="pt-4 border-t border-dashed border-white/10 flex items-center justify-between text-xs text-[#9a978e]">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#f2cc8f]" />
                          Bấm thẻ để lật đáp án
                        </span>
                        <span className="font-mono text-[11px]">Mặt trước</span>
                      </div>
                    </div>

                    <div className="ff-flashcard-face ff-flashcard-back card-hard rounded-[16px] p-6 flex flex-col justify-between" style={{ background: '#FBF2E1', color: '#2B2331' }}>
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-emerald-600/20 text-emerald-800 border border-emerald-600/40 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Giải nghĩa chuẩn
                          </span>
                          <span className="font-mono text-[11px] text-[#2B2331]">Mặt sau</span>
                        </div>
                        {currentSrsCard.keyFormula && (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-600/35 text-[#2B2331] text-xs font-mono mb-3 flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block text-[10px] uppercase tracking-wider mb-0.5">Công thức then chốt:</strong>
                              <span>{currentSrsCard.keyFormula}</span>
                            </div>
                          </div>
                        )}
                        <div className="p-3.5 rounded-xl bg-black/5 border border-black/10 text-xs sm:text-sm text-[#2B2331] leading-relaxed">
                          <p className="text-[#3b3240]">{currentSrsCard.answer}</p>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-dashed border-black/10 flex items-center justify-between text-xs text-[#2B2331]/70">
                        <span className="flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5 text-[#81b29a]" />
                          Bấm lại để xem câu hỏi
                        </span>
                        <span className="font-mono text-[11px]">Đã giải nghĩa</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSrsFlipped(false);
                        setSrsIndex((prev) => Math.max(0, prev - 1));
                      }}
                      disabled={srsIndex === 0}
                      className="ff-tactile-btn flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-[#111722] hover:bg-white/10 disabled:opacity-40 text-[#f4f1de] border border-white/15 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Trước</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSrsFlipped(!isSrsFlipped);
                        playPaperPageFlip();
                      }}
                      className="ff-tactile-btn flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-[#f2cc8f]/20 hover:bg-[#f2cc8f]/30 text-[#f2cc8f] border border-[#f2cc8f]/40 text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isSrsFlipped ? 'Xem câu hỏi' : 'Lật đáp án'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSrsFlipped(false);
                        setSrsIndex((prev) => Math.min(activeDeckCards.length - 1, prev + 1));
                      }}
                      disabled={srsIndex >= activeDeckCards.length - 1}
                      className="ff-tactile-btn flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-[#111722] hover:bg-white/10 disabled:opacity-40 text-[#f4f1de] border border-white/15 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Sau</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setReviewSrsIds((prev) => new Set(prev).add(currentSrsCard.id));
                        setMasteredSrsIds((prev) => {
                          const n = new Set(prev);
                          n.delete(currentSrsCard.id);
                          return n;
                        });
                        setIsSrsFlipped(false);
                        playChime('xp');
                        setSrsIndex((prev) => (prev < activeDeckCards.length - 1 ? prev + 1 : 0));
                      }}
                      className="ff-tactile-pop btn-feastables flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 border border-rose-500/50 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                      <span>Lại</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReviewSrsIds((prev) => new Set(prev).add(currentSrsCard.id));
                        setMasteredSrsIds((prev) => {
                          const n = new Set(prev);
                          n.delete(currentSrsCard.id);
                          return n;
                        });
                        setIsSrsFlipped(false);
                        playChime('xp');
                        setSrsIndex((prev) => (prev < activeDeckCards.length - 1 ? prev + 1 : 0));
                      }}
                      className="ff-tactile-pop btn-feastables flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/50 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Khó</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMasteredSrsIds((prev) => new Set(prev).add(currentSrsCard.id));
                        setReviewSrsIds((prev) => {
                          const n = new Set(prev);
                          n.delete(currentSrsCard.id);
                          return n;
                        });
                        setIsSrsFlipped(false);
                        playCrystallineChime();
                        playChime('success');
                        setSrsIndex((prev) => (prev < activeDeckCards.length - 1 ? prev + 1 : 0));
                      }}
                      className="ff-tactile-pop btn-feastables flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/35 text-sky-300 border border-sky-500/50 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Tốt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMasteredSrsIds((prev) => new Set(prev).add(currentSrsCard.id));
                        setReviewSrsIds((prev) => {
                          const n = new Set(prev);
                          n.delete(currentSrsCard.id);
                          return n;
                        });
                        setIsSrsFlipped(false);
                        playCrystallineChime();
                        playChime('success');
                        setSrsIndex((prev) => (prev < activeDeckCards.length - 1 ? prev + 1 : 0));
                      }}
                      className="ff-tactile-pop btn-feastables flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[#81b29a] hover:bg-[#95c4ae] text-[#0b0d12] border-2 border-[#0b0d12] text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Dễ</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

          <div className="back-stack">
            <img
              className="scene-img back-img back-four"
              src={cmsData.backFourImg}
              alt="Back layer four"
              loading="lazy"
              decoding="async"
              width={1920}
              height={1080}
              onError={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
            />
            <img
              className="scene-img back-img back-bazaar"
              src={cmsData.bazaarImg}
              alt="Bazaar layer"
              loading="lazy"
              decoding="async"
              width={1920}
              height={1080}
              onError={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
            />
          </div>

          <section className="sights-slider" aria-label="Mostar sights slider">
            <div
              className={`sights-track ${isJumping ? 'is-jumping' : ''}`}
              ref={trackRef}
              onTransitionEnd={handleTransitionEnd}
            >
              {allSightCards.map((card, idx) => {
                const baseIdx = idx % 5;
                return (
                  <div className="sight-card relative group" key={idx}>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSightIdx(baseIdx);
                          setAdminTab('sights');
                          setIsAdminModalOpen(true);
                        }}
                        className="absolute bottom-3 right-3 z-20 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-extrabold flex items-center gap-1 shadow-lg cursor-pointer transition-all"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Sửa</span>
                      </button>
                    )}
                    <span className="sight-kicker">
                      {language === 'VIE' ? card.kicker.vie : card.kicker.eng}
                    </span>
                    <img
                      className="sight-pin"
                      src={card.pin}
                      alt={language === 'VIE' ? card.h3.vie : card.h3.eng}
                      loading="lazy"
                      decoding="async"
                      width={320}
                      height={420}
                      onError={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
                    />
                    <h3>{language === 'VIE' ? card.h3.vie : card.h3.eng}</h3>
                    <p>{language === 'VIE' ? card.p.vie : card.p.eng}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="sights-controls" ref={controlsRef} aria-label="Slider controls">
            <button
              className="sight-nav sight-prev"
              onClick={() => moveSightSlider(-1)}
              aria-label="Previous sight card"
            >
              ←
            </button>
            <button
              className="sight-nav sight-next"
              onClick={() => moveSightSlider(1)}
              aria-label="Next sight card"
            >
              →
            </button>
          </div>

          <h1 className="hero-title">{language === 'VIE' ? cmsData.heroTitleVie : cmsData.heroTitleEng}</h1>

          <img
            className="scene-img splitframe-img splitframe-left"
            src={cmsData.splitLeftImg}
            alt="Split frame left"
            loading="lazy"
            decoding="async"
            width={960}
            height={1080}
            onError={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
          />
          <img
            className="scene-img splitframe-img splitframe-right"
            src={cmsData.splitRightImg}
            alt="Split frame right"
            loading="lazy"
            decoding="async"
            width={960}
            height={1080}
            onError={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
          />
          <img
            className="scene-img bridge-img"
            src={cmsData.bridgeImg}
            alt="Bridge layer"
            loading="lazy"
            decoding="async"
            width={1920}
            height={1080}
            onError={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
          />
          <img
            className="scene-img frame-two-img"
            src={cmsData.frameTwoImg}
            alt="Frame two layer"
            loading="lazy"
            decoding="async"
            width={1920}
            height={1080}
            onError={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
          />

          <div className="shade"></div>
        </div>

        <section className="intro-copy" aria-label="Mostar overview">
          <p>{language === 'VIE' ? cmsData.introCopyVie : cmsData.introCopyEng}</p>
          <div className="hero-tags" aria-label="Mostar highlights">
            {(language === 'VIE' ? cmsData.heroTagsVie : cmsData.heroTagsEng).map((tag, i) => (
              <span key={i}>{tag}</span>
            ))}
          </div>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => {
                setAdminTab('copy');
                setIsAdminModalOpen(true);
              }}
              className="mt-3 pointer-events-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/25 hover:bg-amber-500/40 border border-amber-400/50 text-amber-200 text-xs font-bold cursor-pointer transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Sửa Mở Đầu &amp; Từ Khóa</span>
            </button>
          )}
        </section>

        <section className="story-panel story-panel-bridge" id="bridge" aria-label="Old Bridge details">
          <h2>{language === 'VIE' ? cmsData.bridgeTitleVie : cmsData.bridgeTitleEng}</h2>
          <p>{language === 'VIE' ? cmsData.bridgeBodyVie : cmsData.bridgeBodyEng}</p>
          <dl className="facts">
            <div>
              <dt>{cmsData.fact1Title}</dt>
              <dd>{language === 'VIE' ? cmsData.fact1DescVie : cmsData.fact1DescEng}</dd>
            </div>
            <div>
              <dt>{language === 'VIE' ? cmsData.fact2TitleVie : cmsData.fact2TitleEng}</dt>
              <dd>{language === 'VIE' ? cmsData.fact2DescVie : cmsData.fact2DescEng}</dd>
            </div>
          </dl>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => {
                setAdminTab('copy');
                setIsAdminModalOpen(true);
              }}
              className="mt-3 pointer-events-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/25 hover:bg-amber-500/40 border border-amber-400/50 text-amber-200 text-xs font-bold cursor-pointer transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Sửa Nội Dung Nhịp Cầu</span>
            </button>
          )}
        </section>

        <section className="story-panel story-panel-bazaar" id="bazaar" aria-label="Old town details">
          <h2>{language === 'VIE' ? cmsData.bazaarTitleVie : cmsData.bazaarTitleEng}</h2>
          <p>{language === 'VIE' ? cmsData.bazaarBodyVie : cmsData.bazaarBodyEng}</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button className="note-button" onClick={scrollToChronicles}>
              <span aria-hidden="true">↗</span>
              <span>{language === 'VIE' ? cmsData.bazaarButtonVie : cmsData.bazaarButtonEng}</span>
            </button>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  setAdminTab('copy');
                  setIsAdminModalOpen(true);
                }}
                className="pointer-events-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-500/25 hover:bg-amber-500/40 border border-amber-400/50 text-amber-200 text-xs font-bold cursor-pointer transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Sửa</span>
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Portaled Admin Studio Modal for MemoryRealm */}
      {isAdminModalOpen &&
        isSuperAdmin &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md">
            <div className="modal-container w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-5 text-[#f4f1de]">
              <div className="flex items-center justify-between border-b border-dashed border-[#f4f1de]/15 pb-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-[#f4f1de]">
                    Quản Trị Miền Ký Ức
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="ff-tactile-btn p-2 rounded-lg bg-[#0b0d12] border border-[#f4f1de]/18 text-[#d8d5ce] hover:text-[#f4f1de] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 3 Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-xl bg-[#0b0d12] border border-[#f4f1de]/15">
                <button
                  type="button"
                  onClick={() => setAdminTab('sights')}
                  className={`ff-tactile-btn py-2.5 px-3 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer border ${
                    adminTab === 'sights'
                      ? 'bg-[#f4f1de] text-[#0b0d12] border-[#0b0d12]'
                      : 'text-[#d8d5ce] hover:text-[#f4f1de] border-transparent'
                  }`}
                >
                  1. Cột mốc
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab('copy')}
                  className={`ff-tactile-btn py-2.5 px-3 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer border ${
                    adminTab === 'copy'
                      ? 'bg-[#f4f1de] text-[#0b0d12] border-[#0b0d12]'
                      : 'text-[#d8d5ce] hover:text-[#f4f1de] border-transparent'
                  }`}
                >
                  2. Nội dung
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab('layers')}
                  className={`ff-tactile-btn py-2.5 px-3 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer border ${
                    adminTab === 'layers'
                      ? 'bg-[#f4f1de] text-[#0b0d12] border-[#0b0d12]'
                      : 'text-[#d8d5ce] hover:text-[#f4f1de] border-transparent'
                  }`}
                >
                  3. Cảnh nền
                </button>
              </div>

              {adminTab === 'sights' && (
                <div className="space-y-4">
                  {/* Chọn 1 trong 5 thẻ cột mốc */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {cmsData.sights.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedSightIdx(i)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedSightIdx === i
                            ? 'bg-[#e07a5f]/20 border-[#e07a5f] text-[#f2cc8f]'
                            : 'bg-[#0b0d12] border-[#f4f1de]/12 text-[#d8d5ce] hover:border-[#f2cc8f]/40'
                        }`}
                      >
                        <div className="text-[10px] font-mono text-[#f2cc8f]">{s.kickerVie}</div>
                        <div className="text-xs font-bold truncate mt-0.5">{s.titleVie}</div>
                      </button>
                    ))}
                  </div>

                  {cmsData.sights[selectedSightIdx] && (
                    <div className="rounded-xl bg-[#0b0d12] border border-[#f4f1de]/15 p-4 sm:p-5 space-y-4">
                      {/* Ảnh thẻ cột mốc */}
                      <div className="flex flex-col sm:flex-row items-center gap-4 pb-4 border-b border-dashed border-[#f4f1de]/15">
                        <img
                          src={cmsData.sights[selectedSightIdx].pinUrl}
                          alt={cmsData.sights[selectedSightIdx].titleVie}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => handleImageError(e, DEFAULT_CLUB_COVER)}
                          className="w-28 h-32 rounded-xl object-contain bg-black/60 border border-[#f4f1de]/15 p-2 shrink-0"
                        />
                        <div className="flex-1 w-full space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-bold text-[#f2cc8f]">
                              Hình ảnh / Biểu tượng Thẻ #{selectedSightIdx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const defPin = DEFAULT_MEMORY_CMS.sights[selectedSightIdx].pinUrl;
                                setCmsData((prev) => ({
                                  ...prev,
                                  sights: prev.sights.map((it, idx) =>
                                    idx === selectedSightIdx ? { ...it, pinUrl: defPin } : it,
                                  ),
                                }));
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-[#d8d5ce] cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Ảnh gốc</span>
                            </button>
                          </div>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <input
                              type="text"
                              maxLength={500}
                              value={cmsData.sights[selectedSightIdx].pinUrl}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCmsData((prev) => ({
                                  ...prev,
                                  sights: prev.sights.map((it, idx) =>
                                    idx === selectedSightIdx ? { ...it, pinUrl: val } : it,
                                  ),
                                }));
                              }}
                              placeholder="Dán URL ảnh hoặc tải ảnh từ máy..."
                              className="flex-1 bg-[#151a26] border border-[#f4f1de]/20 rounded-xl px-3.5 py-2.5 text-sm text-[#f4f1de] focus:outline-none focus:border-[#f2cc8f]"
                            />
                            <label className="ff-tactile-btn px-4 py-2.5 rounded-xl bg-[#e07a5f] hover:bg-[#f2cc8f] text-[#0b0d12] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                              <Upload className="w-4 h-4" />
                              <span>{isUploadingImg ? 'Đang tải...' : 'Tải ảnh từ máy'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                maxLength={200}
                                onChange={(e) =>
                                  handleUploadMemoryImage(e, (url) => {
                                    setCmsData((prev) => ({
                                      ...prev,
                                      sights: prev.sights.map((it, idx) =>
                                        idx === selectedSightIdx ? { ...it, pinUrl: url } : it,
                                      ),
                                    }));
                                  })
                                }
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-[#d8d5ce] block mb-1">Nhãn phụ (Tiếng Việt)</label>
                          <input
                            type="text"
                            maxLength={80}
                            value={cmsData.sights[selectedSightIdx].kickerVie}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCmsData((prev) => ({
                                ...prev,
                                sights: prev.sights.map((it, idx) =>
                                  idx === selectedSightIdx ? { ...it, kickerVie: val } : it,
                                ),
                              }));
                            }}
                            className="w-full bg-[#151a26] border border-[#f4f1de]/20 rounded-xl px-3.5 py-2.5 text-sm text-[#f4f1de] focus:outline-none focus:border-[#f2cc8f]"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-[#d8d5ce] block mb-1">Nhãn phụ (English)</label>
                          <input
                            type="text"
                            maxLength={80}
                            value={cmsData.sights[selectedSightIdx].kickerEng}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCmsData((prev) => ({
                                ...prev,
                                sights: prev.sights.map((it, idx) =>
                                  idx === selectedSightIdx ? { ...it, kickerEng: val } : it,
                                ),
                              }));
                            }}
                            className="w-full bg-[#151a26] border border-[#f4f1de]/20 rounded-xl px-3.5 py-2.5 text-sm text-[#f4f1de] focus:outline-none focus:border-[#f2cc8f]"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-[#d8d5ce] block mb-1">Tiêu đề thẻ (Tiếng Việt)</label>
                          <input
                            type="text"
                            maxLength={120}
                            value={cmsData.sights[selectedSightIdx].titleVie}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCmsData((prev) => ({
                                ...prev,
                                sights: prev.sights.map((it, idx) =>
                                  idx === selectedSightIdx ? { ...it, titleVie: val } : it,
                                ),
                              }));
                            }}
                            className="w-full bg-[#151a26] border border-[#f4f1de]/20 rounded-xl px-3.5 py-2.5 text-sm text-[#f4f1de] focus:outline-none focus:border-[#f2cc8f]"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-[#d8d5ce] block mb-1">Tiêu đề thẻ (English)</label>
                          <input
                            type="text"
                            maxLength={120}
                            value={cmsData.sights[selectedSightIdx].titleEng}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCmsData((prev) => ({
                                ...prev,
                                sights: prev.sights.map((it, idx) =>
                                  idx === selectedSightIdx ? { ...it, titleEng: val } : it,
                                ),
                              }));
                            }}
                            className="w-full bg-[#151a26] border border-[#f4f1de]/20 rounded-xl px-3.5 py-2.5 text-sm text-[#f4f1de] focus:outline-none focus:border-[#f2cc8f]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-[#d8d5ce] block mb-1">Mô tả chi tiết (Tiếng Việt)</label>
                          <textarea
                            rows={3}
                            maxLength={350}
                            value={cmsData.sights[selectedSightIdx].descVie}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCmsData((prev) => ({
                                ...prev,
                                sights: prev.sights.map((it, idx) =>
                                  idx === selectedSightIdx ? { ...it, descVie: val } : it,
                                ),
                              }));
                            }}
                            className="w-full bg-[#151a26] border border-[#f4f1de]/20 rounded-xl px-3.5 py-2.5 text-sm text-[#f4f1de] focus:outline-none focus:border-[#f2cc8f] resize-y"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-[#d8d5ce] block mb-1">Mô tả chi tiết (English)</label>
                          <textarea
                            rows={3}
                            maxLength={350}
                            value={cmsData.sights[selectedSightIdx].descEng}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCmsData((prev) => ({
                                ...prev,
                                sights: prev.sights.map((it, idx) =>
                                  idx === selectedSightIdx ? { ...it, descEng: val } : it,
                                ),
                              }));
                            }}
                            className="w-full bg-[#151a26] border border-[#f4f1de]/20 rounded-xl px-3.5 py-2.5 text-sm text-[#f4f1de] focus:outline-none focus:border-[#f2cc8f] resize-y"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {adminTab === 'copy' && (
                <div className="space-y-5">
                  {/* Phần 1: Hero & Intro */}
                  <div className="rounded-xl bg-[#0b0d12] border border-[#f4f1de]/15 p-4 space-y-3">
                    <h4 className="text-sm font-extrabold text-[#f2cc8f]">Phân đoạn 1: Tiêu đề lớn &amp; Mở đầu</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-[#d8d5ce] block mb-1">Chữ nền khổng lồ (VIE)</label>
                        <input
                          type="text"
                          maxLength={40}
                          value={cmsData.heroTitleVie}
                          onChange={(e) => setCmsData({ ...cmsData, heroTitleVie: e.target.value })}
                          className="w-full bg-[#151a26] border border-[#f4f1de]/20 rounded-xl px-3.5 py-2 text-sm text-[#f4f1de]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#d8d5ce] block mb-1">Chữ nền khổng lồ (ENG)</label>
                        <input
                          type="text"
                          maxLength={40}
                          value={cmsData.heroTitleEng}
                          onChange={(e) => setCmsData({ ...cmsData, heroTitleEng: e.target.value })}
                          className="w-full bg-[#151a26] border border-[#f4f1de]/20 rounded-xl px-3.5 py-2 text-sm text-[#f4f1de]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-[#d8d5ce] block mb-1">Đoạn văn mở đầu (Tiếng Việt)</label>
                      <textarea
                        rows={2}
                        maxLength={350}
                        value={cmsData.introCopyVie}
                        onChange={(e) => setCmsData({ ...cmsData, introCopyVie: e.target.value })}
                        className="w-full bg-[#151a26] border border-[#f4f1de]/20 rounded-xl px-3.5 py-2 text-sm text-[#f4f1de]"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {cmsData.heroTagsVie.map((tag, idx) => (
                        <input
                          key={idx}
                          type="text"
                          maxLength={60}
                          value={tag}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCmsData((prev) => ({
                              ...prev,
                              heroTagsVie: prev.heroTagsVie.map((t, i) => (i === idx ? val : t)),
                            }));
                          }}
                          className="bg-[#151a26] border border-[#f4f1de]/20 rounded-xl px-3 py-2 text-xs text-[#f4f1de]"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Phần 2: Nhịp cầu (#bridge) */}
                  <div className="rounded-xl bg-[#0b0d12] border border-[#f4f1de]/15 p-4 space-y-3">
                    <h4 className="text-sm font-extrabold text-[#f2cc8f]">Phân đoạn 2: Nhịp Cầu (#bridge)</h4>
                    <div>
                      <label className="text-xs text-[#d8d5ce] block mb-1">Tiêu đề Nhịp cầu (Tiếng Việt)</label>
                      <input
                        type="text"
                        maxLength={120}
                        value={cmsData.bridgeTitleVie}
                        onChange={(e) => setCmsData({ ...cmsData, bridgeTitleVie: e.target.value })}
                        className="w-full bg-[#151a26] border border-[#f4f1de]/20 rounded-xl px-3.5 py-2 text-sm text-[#f4f1de]"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#d8d5ce] block mb-1">Nội dung Nhịp cầu (Tiếng Việt)</label>
                      <textarea
                        rows={2}
                        maxLength={350}
                        value={cmsData.bridgeBodyVie}
                        onChange={(e) => setCmsData({ ...cmsData, bridgeBodyVie: e.target.value })}
                        className="w-full bg-[#151a26] border border-[#f4f1de]/20 rounded-xl px-3.5 py-2 text-sm text-[#f4f1de]"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-[#d8d5ce] block mb-1">Cột mốc số 1 &amp; Mô tả</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={30}
                            value={cmsData.fact1Title}
                            onChange={(e) => setCmsData({ ...cmsData, fact1Title: e.target.value })}
                            className="w-24 bg-[#151a26] border border-[#f4f1de]/20 rounded-xl px-3 py-2 text-sm text-[#f4f1de]"
                          />
                          <input
                            type="text"
                            maxLength={150}
                            value={cmsData.fact1DescVie}
                            onChange={(e) => setCmsData({ ...cmsData, fact1DescVie: e.target.value })}
                            className="flex-1 bg-[#151a26] border border-[#f4f1de]/20 rounded-xl px-3 py-2 text-sm text-[#f4f1de]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-[#d8d5ce] block mb-1">Cột mốc số 2 &amp; Mô tả</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={30}
                            value={cmsData.fact2TitleVie}
                            onChange={(e) => setCmsData({ ...cmsData, fact2TitleVie: e.target.value })}
                            className="w-28 bg-[#151a26] border border-[#f4f1de]/20 rounded-xl px-3 py-2 text-sm text-[#f4f1de]"
                          />
                          <input
                            type="text"
                            maxLength={150}
                            value={cmsData.fact2DescVie}
                            onChange={(e) => setCmsData({ ...cmsData, fact2DescVie: e.target.value })}
                            className="flex-1 bg-[#151a26] border border-[#f4f1de]/20 rounded-xl px-3 py-2 text-sm text-[#f4f1de]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Phần 3: Góc quán (#bazaar) */}
                  <div className="rounded-xl bg-[#0b0d12] border border-[#f4f1de]/15 p-4 space-y-3">
                    <h4 className="text-sm font-extrabold text-[#f2cc8f]">Phân đoạn 3: Góc Quán (#bazaar)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-[#d8d5ce] block mb-1">Tiêu đề Góc quán (Tiếng Việt)</label>
                        <input
                          type="text"
                          maxLength={120}
                          value={cmsData.bazaarTitleVie}
                          onChange={(e) => setCmsData({ ...cmsData, bazaarTitleVie: e.target.value })}
                          className="w-full bg-[#151a26] border border-[#f4f1de]/20 rounded-xl px-3.5 py-2 text-sm text-[#f4f1de]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#d8d5ce] block mb-1">Nhãn nút hành động</label>
                        <input
                          type="text"
                          maxLength={80}
                          value={cmsData.bazaarButtonVie}
                          onChange={(e) => setCmsData({ ...cmsData, bazaarButtonVie: e.target.value })}
                          className="w-full bg-[#151a26] border border-[#f4f1de]/20 rounded-xl px-3.5 py-2 text-sm text-[#f4f1de]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-[#d8d5ce] block mb-1">Nội dung Góc quán (Tiếng Việt)</label>
                      <textarea
                        rows={2}
                        maxLength={350}
                        value={cmsData.bazaarBodyVie}
                        onChange={(e) => setCmsData({ ...cmsData, bazaarBodyVie: e.target.value })}
                        className="w-full bg-[#151a26] border border-[#f4f1de]/20 rounded-xl px-3.5 py-2 text-sm text-[#f4f1de]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {adminTab === 'layers' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(
                    [
                      { key: 'skyImg', label: '1. Bầu trời nền (Sky Layer)', def: SKY_IMG },
                      { key: 'backFourImg', label: '2. Núi & Thành cổ xa (Back Layer)', def: BACK_FOUR_IMG },
                      { key: 'bazaarImg', label: '3. Phố cổ & Hội quán (Bazaar Layer)', def: BAZAAR_IMG },
                      { key: 'bridgeImg', label: '4. Nhịp cầu chính (Bridge Layer)', def: BRIDGE_IMG },
                      { key: 'frameTwoImg', label: '5. Tiền cảnh vòm đá (Frame Two Layer)', def: FRAME_TWO_IMG },
                      { key: 'splitLeftImg', label: '6. Vách đá trái (Split Left)', def: SPLIT_LEFT_IMG },
                      { key: 'splitRightImg', label: '7. Vách đá phải (Split Right)', def: SPLIT_RIGHT_IMG },
                    ] as const
                  ).map((layer) => (
                    <div
                      key={layer.key}
                      className="rounded-xl bg-[#0b0d12] border border-[#f4f1de]/15 p-3.5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#f2cc8f]">{layer.label}</span>
                        <button
                          type="button"
                          onClick={() => setCmsData((prev) => ({ ...prev, [layer.key]: layer.def }))}
                          className="text-[11px] text-[#9a978e] hover:text-[#f4f1de] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Mặc định</span>
                        </button>
                      </div>
                      <div className="w-full aspect-[16/9] rounded-xl overflow-hidden bg-black border border-white/10">
                        <img
                          src={cmsData[layer.key]}
                          alt={layer.label}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => handleImageError(e, DEFAULT_CLUB_COVER)}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={500}
                          value={cmsData[layer.key]}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCmsData((prev) => ({ ...prev, [layer.key]: val }));
                          }}
                          className="flex-1 bg-[#151a26] border border-[#f4f1de]/20 rounded-xl px-3 py-2 text-xs text-[#f4f1de]"
                        />
                        <label className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1 cursor-pointer shrink-0">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Tải ảnh</span>
                          <input
                            type="file"
                            accept="image/*"
                            maxLength={200}
                            onChange={(e) =>
                              handleUploadMemoryImage(e, (url) => {
                                setCmsData((prev) => ({ ...prev, [layer.key]: url }));
                              })
                            }
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setCmsData(DEFAULT_MEMORY_CMS)}
                  className="ff-tactile-btn inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0b0d12] hover:bg-white/10 border border-[#f4f1de]/18 text-xs sm:text-sm font-semibold text-[#d8d5ce] cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Khôi phục</span>
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAdminModalOpen(false)}
                    className="ff-tactile-btn px-4 py-2.5 rounded-xl bg-[#0b0d12] hover:bg-white/10 border border-[#f4f1de]/18 text-xs sm:text-sm font-bold text-[#d8d5ce] hover:text-white cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMemoryCMS}
                    className="ff-tactile-btn px-6 py-2.5 rounded-xl bg-[#f4f1de] hover:bg-[#f2cc8f] text-[#0b0d12] border-2 border-[#0b0d12] font-extrabold text-xs sm:text-sm cursor-pointer transition-all"
                  >
                    Lưu
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
};

export default MemoryRealm;
