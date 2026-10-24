import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Settings,
  ArrowRight,
  Trophy,
  Crown,
  Sparkles,
  BookOpen,
  Clock,
  Sun,
  Moon,
  Search,
  GraduationCap,
  Flame,
} from 'lucide-react';
import type { User, DimensionView } from '../../types';
import { ADMIN_AVATAR_URL, isLegacyAdminAvatar, normalizeAdminAvatar } from '../../config/admin';
import { safeStorage } from '../../utils/storage';
import {
  getSavedAboutData,
  fetchAboutDataFromServer,
  type AboutData,
} from '../../store/adminStore';
import { DEFAULT_CLUB_COVER, handleImageError } from '../../utils/mediaFallback';
import { isMasterAdmin } from '../../config/admin';
import { rafThrottle } from '../../utils/rafThrottle';
import {
  SphereCardBatchUpdater,
  getRendererInfo,
  recordRenderFrameMetrics,
  registerDisposableResource,
} from '../../utils/gpuRenderEngine';

export interface VinhDanhRecord {
  id: string;
  imgId: string;
  title: string;
  place: string;
  note: string;
  customImgUrl?: string;
  isTall?: boolean;
}

export interface FounderProfileState {
  name: string;
  role: string;
  avatarUrl: string;
  bio: string;
}

export interface KhuVinhDanhViewProps {
  onExit: () => void;
  onNavigate?: (view: DimensionView) => void;
  currentUser?: User | null;
}

const CDN_BASE = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/';
const FOUNDER_AVATAR_ID = 'hf_20260922_194417_a455843c-d8db-461c-8ef6-74a325d2472c';

const INITIAL_VINHDANH_RECORDS: VinhDanhRecord[] = [
  {
    id: 'vd-1',
    imgId: 'hf_20260922_194349_26ffdbfd-ac5e-49e9-a07d-c06d3f7cb4cb',
    title: 'Khởi Sinh F-Forum',
    place: 'Đà Nẵng · Việt Nam',
    note: 'Không gian học tập và kết nối học sinh, thắp sáng ước mơ học đường trên khắp mọi miền.',
  },
  {
    id: 'vd-2',
    imgId: 'hf_20260922_194350_5546ea3d-6336-42c7-a59f-06165c5802be',
    title: 'BroAmStuck Studio',
    place: 'Góc Trải Nghiệm Học Thuật',
    note: 'Nơi mỗi ý tưởng và đồ án được chăm chút tỉ mỉ, gìn giữ nét tinh khôi của tuổi học trò.',
  },
  {
    id: 'vd-3',
    imgId: 'hf_20260922_194349_b4533691-cb49-41d4-b56c-51f0fdcbe250',
    title: 'Miền Ký Ức',
    place: 'Biên Niên Sử Trường Xưa',
    note: 'Lưu giữ những nhịp cầu tri thức, góc hành lang rêu phong và ký ức năm tháng học trò.',
  },
  {
    id: 'vd-4',
    imgId: 'hf_20260922_194349_e588abd3-1bfa-4918-894f-05632cc51ccc',
    title: 'Sàn Hỏi Đáp Thân Thiện',
    place: 'Góc học tập mở',
    note: 'Nơi bạn tự do hỏi bài tập khó, cùng nhau trao đổi phương pháp và tiến bộ mỗi ngày.',
  },
  {
    id: 'vd-5',
    imgId: 'hf_20260922_194350_28d92c80-de66-41cb-911e-b3b44aebe1f5',
    title: 'Quảng Trường CLB',
    place: 'Hội Quán Đam Mê',
    note: 'Không gian quy tụ các câu lạc bộ học thuật, nghệ thuật và khám phá khoa học.',
  },
  {
    id: 'vd-6',
    imgId: 'hf_20260922_194349_04e89718-4214-4aff-bac5-490462bbfe2f',
    title: 'Góc Học Chung Trực Tuyến',
    place: 'Đàm Thoại Học Tập',
    note: 'Trao đổi bài học, tìm bạn cùng tiến và san sẻ niềm vui học đường theo thời gian thực.',
  },
  {
    id: 'vd-7',
    imgId: 'hf_20260922_194417_2c031e22-2fad-4c81-a544-83cd6bba1c33',
    title: 'Bậc Thang Trưởng Thành',
    place: 'Hành Trình Rèn Luyện',
    note: 'Ghi nhận từng bước tiến học tập và tinh thần sẵn sàng tương trợ bè bạn.',
  },
  {
    id: 'vd-8',
    imgId: 'hf_20260922_194349_a39c3226-7848-4b15-b840-98ad8aec467b',
    title: 'Thẻ Học Sinh F-Pass',
    place: 'Góc Định Danh Học Đường',
    note: 'Tấm thẻ ghi dấu những cột mốc học tập và thành tích đáng nhớ của mỗi bạn trẻ.',
  },
  {
    id: 'vd-9',
    imgId: 'hf_20260922_194417_555e4d90-f35f-4a1a-8c75-def1e8b71988',
    title: 'Phòng Tập Trung Pomodoro',
    place: 'Không Gian Ôn Luyện',
    note: 'Nhịp học sâu bền bỉ, giúp học sinh duy trì sự tập trung tối đa cho kỳ thi.',
  },
  {
    id: 'vd-10',
    imgId: 'hf_20260922_194417_e525a243-03c8-454b-83b4-60f541baf70a',
    title: 'Đăng Nhập An Toàn',
    place: 'Bảo Vệ Tài Khoản',
    note: 'Bảo mật thông tin thành viên, giúp bạn yên tâm học tập và thảo luận mỗi ngày.',
  },
  {
    id: 'vd-11',
    imgId: 'hf_20260922_194349_ec830e6f-b8e6-4569-8540-ee7f33902c53',
    title: 'Tiếng Nói Học Trò',
    place: 'Diễn Đàn Học Sinh',
    note: 'Nơi mọi tâm tư, sáng kiến và góc nhìn học đường luôn được lắng nghe chân thành.',
  },
  {
    id: 'vd-12',
    imgId: 'hf_20260922_194417_35a9af5f-bd07-45a7-bb73-08b47d19d530',
    title: 'Học Thuật Mở',
    place: 'Tri Thức Cho Mọi Người',
    note: 'Không gian học tập hoàn toàn phi lợi nhuận, đồng hành cùng mọi học sinh hiếu học.',
  },
  {
    id: 'vd-13',
    imgId: 'hf_20260922_194416_30e307a9-1265-45c3-a1a0-5c6fa5bb9f8d',
    title: 'Cộng Đồng Chân Thành',
    place: 'Môi Trường Thân Thiện',
    note: 'Loại bỏ tài khoản ảo, vun đắp không gian thảo luận văn minh, tôn trọng lẫn nhau.',
  },
  {
    id: 'vd-14',
    imgId: 'hf_20260922_194417_ff5cb9f8-8eed-4bfb-bb08-11256da92eae',
    title: 'Khoảnh Khắc Học Đường',
    place: 'Nhật Ký Thời Gian',
    note: 'Ghi lại những khoảnh khắc học tập và tình bạn tươi đẹp dưới mái trường.',
  },
  {
    id: 'vd-15',
    imgId: 'hf_20260922_194418_1d9bff4a-4971-4944-9e49-d72e755ceeb0',
    title: 'Kho Tàng Đề Thi',
    place: 'Thư Viện Học Tập',
    note: 'Tài liệu, đề cương và lời giải chi tiết giúp bạn tự tin trước mọi kỳ thi.',
  },
  {
    id: 'vd-16',
    imgId: 'hf_20260922_194349_75e53821-0807-4ebc-992d-34bae0ec2ce6',
    title: 'Khuôn Viên Kỹ Thuật Số',
    place: 'Mái Nhà Chung',
    note: 'Từng trang giấy, từng câu hỏi là viên gạch xây đắp nên tình bạn học trò bền chặt.',
  },
  {
    id: 'vd-17',
    imgId: 'hf_20260922_194417_5a227847-3796-4438-805d-7e66e9538205',
    title: 'Góc Tâm Sự Học Trò',
    place: 'Thì Thầm Đêm Muộn',
    note: 'Chia sẻ áp lực học tập và những xúc cảm tuổi học trò trong sự đồng cảm, sẻ chia.',
  },
  {
    id: 'vd-18',
    imgId: 'hf_20260922_194350_b49aa67e-0401-4029-af4f-f6ac3ee83398',
    title: 'CLB Tiêu Biểu',
    place: 'Bảng Vàng Thi Đua',
    note: 'Tôn vinh câu lạc bộ có nhiều hoạt động học thuật và chia sẻ bổ ích nhất tháng.',
  },
  {
    id: 'vd-19',
    imgId: 'hf_20260922_194349_89b82779-3a46-4c55-b7c5-f4a0fd955874',
    title: 'Tinh Thần Gương Mẫu',
    place: 'Người Bạn Đồng Hành',
    note: 'Đồng hành bằng sự tận tụy, chân thành và tinh thần tương thân tương ái.',
  },
  {
    id: 'vd-20',
    imgId: 'hf_20260922_194416_47e18c62-253a-42e1-97a9-9e5f6a6b8d59',
    title: 'Bản Sắc Học Trò',
    place: 'BroAmStuck Studio',
    note: 'Lưu giữ tinh thần hiếu học, nhiệt huyết sáng tạo và ước mơ bay cao của tuổi trẻ.',
    isTall: true,
  },
  {
    id: 'vd-21',
    imgId: 'hf_20260922_194417_a455843c-d8db-461c-8ef6-74a325d2472c',
    title: 'Người Giữ Ngọn Lửa',
    place: 'F-Forum Admin',
    note: 'Trần Văn Anh Tuấn — Sáng lập & đồng hành cùng học sinh trường ta.',
    customImgUrl: ADMIN_AVATAR_URL,
  },
];

const N = 21;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

interface FibonacciPoint {
  index: number;
  x: number;
  y: number;
  z: number;
  lat: number;
  lon: number;
}

const FIBONACCI_POINTS: FibonacciPoint[] = Array.from({ length: N }, (_, i) => {
  const y = 1 - (i / (N - 1)) * 2;
  const rad = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = i * GOLDEN_ANGLE;
  const x = Math.cos(theta) * rad;
  const z = Math.sin(theta) * rad;
  const lat = Math.asin(y) * (180 / Math.PI);
  const lon = Math.atan2(x, z) * (180 / Math.PI);
  return { index: i, x, y, z, lat, lon };
});

function computeRadiusAndCardWidth(width: number, height: number) {
  const hr = width <= 380 ? 0.38 : width <= 640 ? 0.42 : 0.46;
  const wr = width <= 380 ? 0.48 : width <= 640 ? 0.52 : 0.58;
  const floor = width <= 380 ? 108 : width <= 640 ? 120 : 155;
  const R = Math.max(floor, Math.min(480, height * hr, width * wr));
  const scale = width <= 380 ? 0.44 : width <= 640 ? 0.46 : 0.47;
  const cw = Math.round(Math.max(72, R * scale));
  return { R, cw };
}

function normalizeVinhDanhRecords(raw: unknown): VinhDanhRecord[] {
  if (!Array.isArray(raw) || raw.length === 0) return INITIAL_VINHDANH_RECORDS;
  return INITIAL_VINHDANH_RECORDS.map((fallback, idx) => {
    const item = (raw[idx] || {}) as Record<string, any>;
    const rawImgUrl = typeof item.customImgUrl === 'string' && item.customImgUrl.trim()
      ? item.customImgUrl.trim()
      : typeof item.imageUrl === 'string' && item.imageUrl.trim()
      ? item.imageUrl.trim()
      : undefined;
    const defaultPng = `${CDN_BASE}${fallback.imgId}.png`;
    const recordImgId = typeof item.imgId === 'string' && item.imgId.trim() ? item.imgId.trim() : fallback.imgId;
    const legacyAdminImg = isLegacyAdminAvatar(rawImgUrl) || (!rawImgUrl && recordImgId === FOUNDER_AVATAR_ID);
    return {
      id: fallback.id,
      imgId: recordImgId,
      title: typeof item.title === 'string' && item.title.trim() ? item.title : fallback.title,
      place:
        typeof item.place === 'string' && item.place.trim()
          ? item.place
          : typeof item.category === 'string' && item.category.trim()
          ? item.category
          : fallback.place,
      note:
        typeof item.note === 'string' && item.note.trim()
          ? item.note
          : typeof item.notes === 'string' && item.notes.trim()
          ? item.notes
          : fallback.note,
      customImgUrl: legacyAdminImg
        ? ADMIN_AVATAR_URL
        : rawImgUrl && rawImgUrl !== defaultPng
        ? rawImgUrl
        : undefined,
      isTall: typeof item.isTall === 'boolean' ? item.isTall : Boolean(fallback.isTall),
    };
  });
}

const DEFAULT_HEADLINE_WORDS = ['BroAmStuck', 'Studio', '•', 'Trần', 'Tuấn'];

interface TopScholar {
  rank: 1 | 2 | 3;
  name: string;
  title: string;
  school: string;
  points: number;
  studyHours: number;
  acceptedAnswers: number;
  mascotName: string;
  mascotType: 'owl' | 'fox' | 'tortoise';
  auraColor: string;
  avatarUrl: string;
}

const TOP_3_SCHOLARS: TopScholar[] = [
  {
    rank: 1,
    name: 'Nguyễn Đăng Khoa',
    title: 'Thủ Khoa Toàn Năng',
    school: 'THPT Chuyên Lê Quý Đôn · Đà Nẵng',
    points: 15420,
    studyHours: 540,
    acceptedAnswers: 1280,
    mascotName: 'Cú Bông Thông Thái',
    mascotType: 'owl',
    auraColor: '#f59e0b',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
  },
  {
    rank: 2,
    name: 'Trần Minh Hoàng',
    title: 'Á Khoa Học Thuật 1',
    school: 'THPT Chuyên Hà Nội - Amsterdam',
    points: 13950,
    studyHours: 495,
    acceptedAnswers: 1110,
    mascotName: 'Cáo Bạc Nhanh Trí',
    mascotType: 'fox',
    auraColor: '#cbd5e1',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80',
  },
  {
    rank: 3,
    name: 'Lê Thảo Nguyên',
    title: 'Á Khoa Học Thuật 2',
    school: 'THPT Chuyên Năng Khiếu · TP.HCM',
    points: 12800,
    studyHours: 462,
    acceptedAnswers: 980,
    mascotName: 'Rùa Đồng Bền Bỉ',
    mascotType: 'tortoise',
    auraColor: '#e07a5f',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&auto=format&fit=crop&q=80',
  },
];

interface HistoricalSubjectRecord {
  id: string;
  name: string;
  category: 'natural' | 'social' | 'specialized';
  solvedQuestions: number;
  acceptanceRate: number;
  valedictorian: string;
  valedictorianSchool: string;
  accentColor: string;
}

const HISTORICAL_12_SUBJECTS: HistoricalSubjectRecord[] = [
  { id: 'sub-1', name: 'Toán học', category: 'natural', solvedQuestions: 384120, acceptanceRate: 99.2, valedictorian: 'Nguyễn Hoàng Long', valedictorianSchool: 'Chuyên KHTN Hà Nội', accentColor: '#3b82f6' },
  { id: 'sub-2', name: 'Vật lý', category: 'natural', solvedQuestions: 245890, acceptanceRate: 98.7, valedictorian: 'Trần Minh Đức', valedictorianSchool: 'Chuyên Lam Sơn', accentColor: '#06b6d4' },
  { id: 'sub-3', name: 'Hóa học', category: 'natural', solvedQuestions: 218440, acceptanceRate: 98.5, valedictorian: 'Lê Bảo Trâm', valedictorianSchool: 'Chuyên Quốc Học Huế', accentColor: '#10b981' },
  { id: 'sub-4', name: 'Sinh học', category: 'natural', solvedQuestions: 167900, acceptanceRate: 97.9, valedictorian: 'Phạm Thuỳ Linh', valedictorianSchool: 'Chuyên Phan Bội Châu', accentColor: '#84cc16' },
  { id: 'sub-5', name: 'Lịch sử', category: 'social', solvedQuestions: 142300, acceptanceRate: 99.1, valedictorian: 'Vũ Duy Khang', valedictorianSchool: 'Chuyên Chu Văn An', accentColor: '#eab308' },
  { id: 'sub-6', name: 'Địa lý', category: 'social', solvedQuestions: 118750, acceptanceRate: 98.4, valedictorian: 'Đỗ Mai Anh', valedictorianSchool: 'Chuyên Lương Thế Vinh', accentColor: '#f97316' },
  { id: 'sub-7', name: 'Ngữ văn', category: 'social', solvedQuestions: 289600, acceptanceRate: 98.8, valedictorian: 'Hoàng Lan Hương', valedictorianSchool: 'Chuyên Trần Phú', accentColor: '#ec4899' },
  { id: 'sub-8', name: 'Tiếng Anh', category: 'social', solvedQuestions: 324500, acceptanceRate: 99.4, valedictorian: 'Đặng Quốc Tuấn', valedictorianSchool: 'Chuyên Ngoại Ngữ', accentColor: '#8b5cf6' },
  { id: 'sub-9', name: 'Tin học', category: 'specialized', solvedQuestions: 198200, acceptanceRate: 99.6, valedictorian: 'Bùi Thế Vinh', valedictorianSchool: 'Chuyên Sư Phạm Hà Nội', accentColor: '#14b8a6' },
  { id: 'sub-10', name: 'Triết học', category: 'specialized', solvedQuestions: 84600, acceptanceRate: 97.6, valedictorian: 'Lâm Hoài Nam', valedictorianSchool: 'ĐH KHXH&NV TP.HCM', accentColor: '#a855f7' },
  { id: 'sub-11', name: 'Thiên văn', category: 'specialized', solvedQuestions: 62400, acceptanceRate: 98.2, valedictorian: 'Trương Gia Bảo', valedictorianSchool: 'ĐH Bách Khoa Đà Nẵng', accentColor: '#6366f1' },
  { id: 'sub-12', name: 'Nghệ thuật', category: 'specialized', solvedQuestions: 54300, acceptanceRate: 98.9, valedictorian: 'Nguyễn Mai Chi', valedictorianSchool: 'ĐH Mỹ Thuật TP.HCM', accentColor: '#f43f5e' },
];

export const KhuVinhDanhView: React.FC<KhuVinhDanhViewProps> = ({
  onExit,
  onNavigate,
  currentUser,
}) => {
  const isSuperAdmin = isMasterAdmin(currentUser?.email);

  const [activeTabMode, setActiveTabMode] = useState<'hall' | 'sphere' | 'archive'>('hall');
  const [subjectFilter, setSubjectFilter] = useState<'all' | 'natural' | 'social' | 'specialized'>('all');
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');

  const [founderProfile, setFounderProfile] = useState<FounderProfileState>(() => {
    const saved = safeStorage.getItem('fforum_vinhdanh_founder');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.name) {
          return {
            ...(parsed as FounderProfileState),
            avatarUrl: normalizeAdminAvatar(parsed.avatarUrl),
          };
        }
      } catch {
      }
    }
    return {
      name: 'Trần Văn Anh Tuấn',
      role: 'Admin F-Forum • Owner BroAmStuck Studio',
      avatarUrl: ADMIN_AVATAR_URL,
      bio: 'Xây dựng F-Forum từ những dòng code đầu tiên. Không gian kết nối thực, dữ liệu thực, tôn vinh tri thức học đường và lưu giữ biên niên sử tuổi học trò.',
    };
  });

  const [records, setRecords] = useState<VinhDanhRecord[]>(() => {
    const saved = safeStorage.getItem('fforum_vinhdanh_records');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === N) return normalizeVinhDanhRecords(parsed);
      } catch {
      }
    }
    return INITIAL_VINHDANH_RECORDS;
  });

  const [headlineWords, setHeadlineWords] = useState<string[]>(() => {
    const about = getSavedAboutData();
    return Array.isArray(about.headlineWords) && about.headlineWords.length === 5
      ? about.headlineWords
      : DEFAULT_HEADLINE_WORDS;
  });

  const [isGridView, setIsGridView] = useState(false);
  const [activeLitRecord, setActiveLitRecord] = useState<VinhDanhRecord | null>(null);
  const [sphereRadius, setSphereRadius] = useState(() => {
    if (typeof window !== 'undefined') {
      return computeRadiusAndCardWidth(window.innerWidth, window.innerHeight).R;
    }
    return 360;
  });

  const setCardRef = (el: HTMLDivElement | null, idx: number) => {
    cardsRef.current[idx] = el;
  };

  useEffect(() => {
    const preloadedImages: HTMLImageElement[] = [];
    let cancelled = false;
    let cursor = 0;

    const loadBatch = () => {
      if (cancelled || cursor >= INITIAL_VINHDANH_RECORDS.length) return;
      const slice = INITIAL_VINHDANH_RECORDS.slice(cursor, cursor + 6);
      cursor += 6;
      slice.forEach((rec) => {
        const thumb = new Image();
        thumb.decoding = 'async';
        thumb.src = `${CDN_BASE}${rec.imgId}_min.webp`;
        preloadedImages.push(thumb);
      });
      if (cursor < INITIAL_VINHDANH_RECORDS.length) {
        window.setTimeout(loadBatch, 90);
      }
    };

    const timer = window.setTimeout(loadBatch, 180);
    const disposeTextures = registerDisposableResource('vinhdanh-sphere-thumbs', 'texture', () => {
      preloadedImages.forEach((img) => {
        img.src = '';
      });
      preloadedImages.length = 0;
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      disposeTextures();
    };
  }, []);

  const [isEditBioModalOpen, setIsEditBioModalOpen] = useState(false);
  const [editBioForm, setEditBioForm] = useState(founderProfile);

  useEffect(() => {
    let cancelled = false;
    const applyServerAboutPayload = (payload: Partial<AboutData> | null | undefined) => {
      if (!payload) return;
      if (payload.founder) {
        const nextFounder: FounderProfileState = {
          name: payload.founder.name || 'Trần Văn Anh Tuấn',
          role: payload.founder.role || 'Admin F-Forum • Owner BroAmStuck Studio',
          avatarUrl: normalizeAdminAvatar(payload.founder.avatarUrl),
          bio: payload.founder.bio || '',
        };
        setFounderProfile(nextFounder);
        setEditBioForm(nextFounder);
      }
      if (Array.isArray(payload.milestones) && payload.milestones.length > 0) {
        setRecords(normalizeVinhDanhRecords(payload.milestones));
      }
      if (Array.isArray(payload.headlineWords) && payload.headlineWords.length === 5) {
        setHeadlineWords(payload.headlineWords);
      }
    };

    fetchAboutDataFromServer()
      .then((serverAbout) => {
        if (!cancelled) applyServerAboutPayload(serverAbout);
      })
      .catch(() => {});

    const onLocalSync = (e: Event) => {
      const detail = (e as CustomEvent<AboutData>).detail;
      if (detail) applyServerAboutPayload(detail);
    };
    window.addEventListener('fforum_about_sync', onLocalSync);

    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('fforum_sync');
        bc.onmessage = (event) => {
          if (event.data?.type === 'SYNC_ABOUT' && event.data?.payload) {
            applyServerAboutPayload(event.data.payload);
          }
        };
      } catch {
      }
    }
    return () => {
      cancelled = true;
      window.removeEventListener('fforum_about_sync', onLocalSync);
      bc?.close();
    };
  }, []);

  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const dotRef = useRef<HTMLDivElement>(null);

  const engineState = useRef({
    tilt: 0,
    spin: 0,
    velX: 0,
    velY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragStartSpin: 0,
    dragStartTilt: 0,
    lastX: 0,
    lastY: 0,
    lastT: 0,
    wheelCamZ: 0,
    camZ: 0,
    R: 360,
    cw: 160,
    hasFinePointer: false,
    mousePos: { x: 0, y: 0 },
    dotPos: { x: 0, y: 0 },
  });

  useEffect(() => {
    let animId = 0;
    let cachedScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    let cachedInnerHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

    const onPassiveScroll = () => {
      cachedScrollY = window.scrollY;
    };

    const handleResize = () => {
      cachedInnerHeight = window.innerHeight;
      const { R, cw } = computeRadiusAndCardWidth(window.innerWidth, window.innerHeight);
      engineState.current.R = R;
      engineState.current.cw = cw;
      setSphereRadius(R);
      if (cardsRef.current) {
        cardsRef.current.forEach((el) => {
          if (el) {
            el.style.width = `${cw}px`;
            el.style.height = `${Math.round(cw * 0.67)}px`;
            el.style.marginLeft = `${-cw / 2}px`;
            el.style.marginTop = `${-Math.round(cw * 0.67) / 2}px`;
          }
        });
      }
    };

    handleResize();
    const handleResizeWithCache = () => {
      cachedInnerHeight = window.innerHeight;
      handleResize();
    };
    const handleResizeFrame = rafThrottle(handleResizeWithCache);
    window.addEventListener('resize', handleResizeFrame, { passive: true });
    window.addEventListener('scroll', onPassiveScroll, { passive: true });

    const cardBatcher = new SphereCardBatchUpdater(FIBONACCI_POINTS.length);
    const disposeSphereGeo = registerDisposableResource('vinhdanh-sphere-geo', 'geometry', () => {
      cardBatcher.reset();
    });
    let lastFrameTs = performance.now();
    const shouldRunAnimation = () =>
      !document.hidden && !isGridView;
    let scheduleTick = () => {};

    const tick = (now: number) => {
      animId = 0;
      if (!shouldRunAnimation()) return;

      const dtMs = Math.min(64, Math.max(4, now - lastFrameTs));
      lastFrameTs = now;
      const state = engineState.current;
      const { R } = state;

      if (!state.isDragging && !activeLitRecord) {
        if (Math.abs(state.velX) > 0.002 || Math.abs(state.velY) > 0.002) {
          state.spin += state.velX;
          state.tilt = Math.max(-32, Math.min(32, state.tilt + state.velY));
          state.velX *= 0.94;
          state.velY *= 0.94;
        } else {
          state.spin += 0.06;
        }
      }

      const p = Math.max(0, Math.min(1, cachedScrollY / (cachedInnerHeight * 0.16)));
      const camZTarget = p * Math.min(64, R * 0.12);
      state.camZ += (camZTarget + state.wheelCamZ - state.camZ) * 0.075;

      const sx = state.tilt;
      const sy = state.spin;
      const camZ = state.camZ;

      if (worldRef.current) {
        worldRef.current.style.transform = `translateZ(${camZ.toFixed(1)}px) rotateY(${sy.toFixed(2)}deg) rotateX(${sx.toFixed(2)}deg)`;
      }

      if (headlineRef.current) {
        headlineRef.current.style.transform = `rotateX(${-sx.toFixed(2)}deg) rotateY(${-sy.toFixed(2)}deg) translateZ(${(R * 0.62).toFixed(1)}px)`;
        headlineRef.current.style.opacity = Math.max(0, 1 - p * 0.55).toFixed(2);
      }

      const sxRad = (sx * Math.PI) / 180;
      const syRad = (sy * Math.PI) / 180;
      const cosX = Math.cos(sxRad);
      const sinX = Math.sin(sxRad);
      const cosY = Math.cos(syRad);
      const sinY = Math.sin(syRad);

      const lowPolyStep = getRendererInfo().pipeline.qualityMode === 'low-poly' ? 2 : 1;
      let visibleCount = 0;
      let culledCount = 0;
      let domCalls = 0;

      FIBONACCI_POINTS.forEach((pt, i) => {
        const cardEl = cardsRef.current[i];
        if (!cardEl) return;

        const z1 = -pt.y * sinX + pt.z * cosX;
        const x1 = pt.x;
        const zf = -x1 * sinY + z1 * cosY;

        const base = 0.14 + 0.86 * Math.pow((zf + 1) / 2, 0.85);
        const shade = 1 - Math.min(1, p * 1.6);
        let dim = shade * (1 - base);

        if (activeLitRecord) {
          dim = Math.min(1, dim + 0.78);
        }

        const res = cardBatcher.updateCard(i, cardEl, zf, dim, -0.42, lowPolyStep);
        if (res.visible) {
          visibleCount++;
        } else {
          culledCount++;
        }
        if (res.mutated) {
          domCalls++;
        }
      });

      recordRenderFrameMetrics({
        fps: 1000 / dtMs,
        calls: domCalls,
        visibleObjects: visibleCount,
        culledObjects: culledCount,
        frameTimeMs: dtMs,
      });

      if (dotRef.current && state.hasFinePointer) {
        const { mousePos, dotPos } = state;
        const dx = mousePos.x - dotPos.x;
        const dy = mousePos.y - dotPos.y;
        if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) {
          dotPos.x += dx * 0.2;
          dotPos.y += dy * 0.2;
          dotRef.current.style.transform = `translate3d(${dotPos.x.toFixed(1)}px, ${dotPos.y.toFixed(1)}px, 0)`;
        }
      }

      scheduleTick();
    };

    scheduleTick = () => {
      if (animId || !shouldRunAnimation()) return;
      animId = requestAnimationFrame(tick);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (animId) cancelAnimationFrame(animId);
        animId = 0;
        return;
      }
      lastFrameTs = performance.now();
      scheduleTick();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    scheduleTick();

    return () => {
      if (animId) cancelAnimationFrame(animId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      disposeSphereGeo();
      window.removeEventListener('resize', handleResizeFrame);
      window.removeEventListener('scroll', onPassiveScroll);
    };
  }, [isGridView, activeLitRecord]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (activeLitRecord) return;
    const state = engineState.current;
    state.isDragging = true;
    state.dragStartX = e.clientX;
    state.dragStartY = e.clientY;
    state.dragStartSpin = state.spin;
    state.dragStartTilt = state.tilt;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    state.lastT = performance.now();
    state.velX = 0;
    state.velY = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const state = engineState.current;
    state.mousePos.x = e.clientX;
    state.mousePos.y = e.clientY;

    if (!state.isDragging) return;
    const now = performance.now();
    const dt = Math.max(1, now - state.lastT);
    const dx = e.clientX - state.lastX;
    const dy = e.clientY - state.lastY;

    state.velX = (dx / dt) * 0.45;
    state.velY = (-dy / dt) * 0.45;

    state.spin = state.dragStartSpin + (e.clientX - state.dragStartX) * 0.24;
    state.tilt = Math.max(-32, Math.min(32, state.dragStartTilt - (e.clientY - state.dragStartY) * 0.2));

    state.lastX = e.clientX;
    state.lastY = e.clientY;
    state.lastT = now;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const state = engineState.current;
    state.isDragging = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (activeLitRecord || isGridView) return;
    engineState.current.wheelCamZ = Math.max(-120, Math.min(100, engineState.current.wheelCamZ - e.deltaY * 0.15));
  };

  const openLightbox = (record: VinhDanhRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveLitRecord(record);
  };

  const closeLightbox = () => {
    setActiveLitRecord(null);
  };

  const filteredSubjects = useMemo(() => {
    return HISTORICAL_12_SUBJECTS.filter((sub) => {
      const matchCat = subjectFilter === 'all' || sub.category === subjectFilter;
      const matchSearch =
        sub.name.toLowerCase().includes(subjectSearchQuery.toLowerCase()) ||
        sub.valedictorian.toLowerCase().includes(subjectSearchQuery.toLowerCase()) ||
        sub.valedictorianSchool.toLowerCase().includes(subjectSearchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [subjectFilter, subjectSearchQuery]);

  const renderMiniMascot = (type: 'owl' | 'fox' | 'tortoise') => {
    if (type === 'owl') {
      return (
        <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center relative shadow-[0_0_15px_rgba(245,158,11,0.3)]">
          <svg viewBox="0 0 48 48" className="w-9 h-9">
            <circle cx="24" cy="24" r="18" fill="#f59e0b" fillOpacity="0.85" />
            <circle cx="18" cy="22" r="5" fill="#ffffff" />
            <circle cx="30" cy="22" r="5" fill="#ffffff" />
            <circle cx="18" cy="22" r="2.5" fill="#0b0d12" />
            <circle cx="30" cy="22" r="2.5" fill="#0b0d12" />
            <polygon points="24,25 21,30 27,30" fill="#e07a5f" />
            <polygon points="24,6 10,14 24,18 38,14" fill="#0b0d12" />
            <line x1="38" y1="14" x2="39" y2="22" stroke="#f2cc8f" strokeWidth="2" />
            <circle cx="39" cy="22" r="2" fill="#f2cc8f" />
          </svg>
        </div>
      );
    }
    if (type === 'fox') {
      return (
        <div className="w-14 h-14 rounded-2xl bg-slate-400/20 border border-slate-300/40 flex items-center justify-center relative shadow-[0_0_15px_rgba(203,213,225,0.3)]">
          <svg viewBox="0 0 48 48" className="w-9 h-9">
            <polygon points="12,12 24,28 36,12" fill="#e2e8f0" />
            <polygon points="14,14 18,22 10,22" fill="#94a3b8" />
            <polygon points="34,14 30,22 38,22" fill="#94a3b8" />
            <circle cx="18" cy="22" r="2" fill="#0b0d12" />
            <circle cx="30" cy="22" r="2" fill="#0b0d12" />
            <circle cx="24" cy="28" r="2.5" fill="#0b0d12" />
            <line x1="24" y1="18" x2="32" y2="8" stroke="#38bdf8" strokeWidth="2" />
            <circle cx="32" cy="8" r="2" fill="#38bdf8" />
          </svg>
        </div>
      );
    }
    return (
      <div className="w-14 h-14 rounded-2xl bg-orange-400/20 border border-orange-400/40 flex items-center justify-center relative shadow-[0_0_15px_rgba(224,122,95,0.3)]">
        <svg viewBox="0 0 48 48" className="w-9 h-9">
          <ellipse cx="24" cy="26" rx="14" ry="11" fill="#e07a5f" />
          <circle cx="38" cy="26" r="5" fill="#f2cc8f" />
          <circle cx="39" cy="25" r="1.5" fill="#0b0d12" />
          <circle cx="14" cy="18" r="3.5" fill="#f2cc8f" />
          <circle cx="14" cy="34" r="3.5" fill="#f2cc8f" />
          <circle cx="34" cy="18" r="3.5" fill="#f2cc8f" />
          <circle cx="34" cy="34" r="3.5" fill="#f2cc8f" />
          <line x1="20" y1="21" x2="28" y2="21" stroke="#fff" strokeWidth="1.5" strokeOpacity="0.5" />
          <line x1="18" y1="26" x2="30" y2="26" stroke="#fff" strokeWidth="1.5" strokeOpacity="0.5" />
          <line x1="20" y1="31" x2="28" y2="31" stroke="#fff" strokeWidth="1.5" strokeOpacity="0.5" />
        </svg>
      </div>
    );
  };

  return (
    <div className="khu-vinh-danh-standalone relative w-full min-h-screen bg-[#07090e] text-[#f4f2ef] overflow-x-hidden selection:bg-amber-400/30">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#07090e]/85 border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="btn-feastables ff-tactile-pop px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
            aria-label="Rời sảnh vinh danh"
          >
            <X className="w-4 h-4" />
            <span>Quay lại</span>
          </button>

          <div className="h-5 w-[1px] bg-white/15 hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-amber-300 hidden md:inline">
              Đại Sảnh Vinh Danh 2027
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10">
          <button
            type="button"
            onClick={() => {
              setActiveTabMode('hall');
              setIsGridView(false);
            }}
            className={`btn-feastables ff-tactile-pop px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTabMode === 'hall'
                ? 'bg-amber-400 text-[#0b0d12] shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            Triển Lãm Danh Giá
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTabMode('sphere');
              setIsGridView(false);
            }}
            className={`btn-feastables ff-tactile-pop px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTabMode === 'sphere'
                ? 'bg-amber-400 text-[#0b0d12] shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            Quả Cầu 3D Ký Ức
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTabMode('archive');
              setIsGridView(true);
            }}
            className={`btn-feastables ff-tactile-pop px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTabMode === 'archive'
                ? 'bg-amber-400 text-[#0b0d12] shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            Kho Cột Mốc
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setIsEditBioModalOpen(true)}
              className="btn-feastables ff-tactile-pop p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white cursor-pointer"
              title="Quản trị nội dung Đại Sảnh"
            >
              <Settings className="w-4 h-4 text-amber-300" />
            </button>
          )}
        </div>
      </header>

      {activeTabMode === 'hall' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-16 space-y-16 sm:space-y-24">
          <section className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/25 text-amber-300 text-xs font-bold font-mono uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Academic Hall of Fame · F-Forum 2027</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-white font-['Fraunces','Playfair_Display',Georgia,serif]">
              <span className="ff-swash-flourish text-amber-300 mr-1.5 text-4xl sm:text-6xl lg:text-7xl">Đ</span>
              ại Sảnh Vinh Danh Tri Thức
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
              Không gian triển lãm danh giá tôn vinh những dấu ấn học thuật kiệt xuất, tinh thần học tập bền bỉ không ngừng nghỉ và những đóng góp tri thức vô giá cho cộng đồng học sinh - sinh viên.
            </p>
          </section>

          <section className="space-y-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5 font-['Fraunces','Playfair_Display',Georgia,serif]">
                  <Crown className="w-6 h-6 text-amber-400 shrink-0" />
                  <span>Bục Vinh Danh Top 3 Thủ Khoa</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Xếp hạng theo điểm cống hiến giải đáp, thời gian học sâu và sự chấp thuận từ cộng đồng
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-amber-300/80 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-xl">
                <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Cập nhật bảng vàng: Kỳ thi 2026 - 2027</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-8 pb-4">
              <div className="order-2 md:order-1 flex flex-col items-center">
                <div className="card-hard w-full p-6 bg-[#0f141e] border-slate-300/30 flex flex-col items-center text-center relative group hover:-translate-y-1 transition-all shadow-[0_0_24px_rgba(203,213,225,0.15)]">
                  <div className="absolute -top-7">{renderMiniMascot('fox')}</div>
                  <div className="mt-8 relative mb-3">
                    <img
                      src={TOP_3_SCHOLARS[1].avatarUrl}
                      alt={TOP_3_SCHOLARS[1].name}
                      loading="lazy"
                      decoding="async"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-300 shadow-lg"
                    />
                    <span className="absolute -bottom-2 -right-2 w-7 h-7 rounded-xl bg-slate-300 text-[#0b0d12] font-black text-xs flex items-center justify-center shadow-md">
                      2
                    </span>
                  </div>

                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-bold px-2 py-0.5 rounded bg-slate-400/10 border border-slate-400/20 mb-1">
                    {TOP_3_SCHOLARS[1].title}
                  </span>
                  <h3 className="text-lg font-extrabold text-white">{TOP_3_SCHOLARS[1].name}</h3>
                  <p className="text-xs text-slate-400 mb-4">{TOP_3_SCHOLARS[1].school}</p>

                  <div className="w-full grid grid-cols-2 gap-2 pt-3 border-t border-white/10 text-xs">
                    <div className="p-2 rounded-xl bg-white/5">
                      <span className="block text-[10px] text-slate-400">Giờ học sâu</span>
                      <strong className="font-mono text-white text-sm">{TOP_3_SCHOLARS[1].studyHours}h</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5">
                      <span className="block text-[10px] text-slate-400">Lời giải chuẩn</span>
                      <strong className="font-mono text-white text-sm">{TOP_3_SCHOLARS[1].acceptedAnswers}</strong>
                    </div>
                  </div>
                </div>

                <div className="w-full h-36 bg-gradient-to-t from-slate-800 to-slate-700/80 rounded-b-2xl border-x-2 border-b-2 border-slate-400/40 flex flex-col items-center justify-center text-slate-200 shadow-xl">
                  <span className="text-4xl font-black font-mono tracking-wider opacity-60">II</span>
                  <span className="text-[11px] font-bold uppercase tracking-widest mt-1 text-slate-300">Á Khoa 1</span>
                </div>
              </div>

              <div className="order-1 md:order-2 flex flex-col items-center">
                <div className="card-hard w-full p-7 bg-[#141a27] border-amber-400/50 flex flex-col items-center text-center relative group hover:-translate-y-1 transition-all shadow-[0_0_36px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/30">
                  <div className="absolute -top-8">{renderMiniMascot('owl')}</div>
                  <div className="mt-8 relative mb-3">
                    <img
                      src={TOP_3_SCHOLARS[0].avatarUrl}
                      alt={TOP_3_SCHOLARS[0].name}
                      loading="lazy"
                      decoding="async"
                      className="w-24 h-24 rounded-2xl object-cover border-2 border-amber-400 shadow-xl"
                    />
                    <span className="absolute -bottom-2.5 -right-2.5 w-8 h-8 rounded-xl bg-amber-400 text-[#0b0d12] font-black text-sm flex items-center justify-center shadow-md">
                      1
                    </span>
                  </div>

                  <span className="text-xs font-mono uppercase tracking-wider text-amber-300 font-extrabold px-2.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/30 mb-1">
                    {TOP_3_SCHOLARS[0].title}
                  </span>
                  <h3 className="text-xl font-black text-white">{TOP_3_SCHOLARS[0].name}</h3>
                  <p className="text-xs text-amber-200/80 mb-4">{TOP_3_SCHOLARS[0].school}</p>

                  <div className="w-full grid grid-cols-2 gap-2 pt-3 border-t border-white/10 text-xs">
                    <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20">
                      <span className="block text-[10px] text-amber-200/80">Giờ học sâu</span>
                      <strong className="font-mono text-amber-300 text-base">{TOP_3_SCHOLARS[0].studyHours}h</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20">
                      <span className="block text-[10px] text-amber-200/80">Lời giải chuẩn</span>
                      <strong className="font-mono text-amber-300 text-base">{TOP_3_SCHOLARS[0].acceptedAnswers}</strong>
                    </div>
                  </div>
                </div>

                <div className="w-full h-48 bg-gradient-to-t from-amber-900/90 via-amber-800/80 to-amber-700/80 rounded-b-2xl border-x-2 border-b-2 border-amber-400/60 flex flex-col items-center justify-center text-amber-100 shadow-2xl">
                  <span className="text-5xl font-black font-mono tracking-wider text-amber-300">I</span>
                  <span className="text-xs font-extrabold uppercase tracking-widest mt-1 text-amber-200">Thủ Khoa</span>
                </div>
              </div>

              <div className="order-3 flex flex-col items-center">
                <div className="card-hard w-full p-6 bg-[#0f141e] border-[#e07a5f]/40 flex flex-col items-center text-center relative group hover:-translate-y-1 transition-all shadow-[0_0_24px_rgba(224,122,95,0.15)]">
                  <div className="absolute -top-7">{renderMiniMascot('tortoise')}</div>
                  <div className="mt-8 relative mb-3">
                    <img
                      src={TOP_3_SCHOLARS[2].avatarUrl}
                      alt={TOP_3_SCHOLARS[2].name}
                      loading="lazy"
                      decoding="async"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-[#e07a5f] shadow-lg"
                    />
                    <span className="absolute -bottom-2 -right-2 w-7 h-7 rounded-xl bg-[#e07a5f] text-[#0b0d12] font-black text-xs flex items-center justify-center shadow-md">
                      3
                    </span>
                  </div>

                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#f2cc8f] font-bold px-2 py-0.5 rounded bg-[#e07a5f]/15 border border-[#e07a5f]/25 mb-1">
                    {TOP_3_SCHOLARS[2].title}
                  </span>
                  <h3 className="text-lg font-extrabold text-white">{TOP_3_SCHOLARS[2].name}</h3>
                  <p className="text-xs text-slate-400 mb-4">{TOP_3_SCHOLARS[2].school}</p>

                  <div className="w-full grid grid-cols-2 gap-2 pt-3 border-t border-white/10 text-xs">
                    <div className="p-2 rounded-xl bg-white/5">
                      <span className="block text-[10px] text-slate-400">Giờ học sâu</span>
                      <strong className="font-mono text-white text-sm">{TOP_3_SCHOLARS[2].studyHours}h</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5">
                      <span className="block text-[10px] text-slate-400">Lời giải chuẩn</span>
                      <strong className="font-mono text-white text-sm">{TOP_3_SCHOLARS[2].acceptedAnswers}</strong>
                    </div>
                  </div>
                </div>

                <div className="w-full h-28 bg-gradient-to-t from-orange-950 to-[#7a3928] rounded-b-2xl border-x-2 border-b-2 border-[#e07a5f]/50 flex flex-col items-center justify-center text-orange-200 shadow-xl">
                  <span className="text-4xl font-black font-mono tracking-wider opacity-60">III</span>
                  <span className="text-[11px] font-bold uppercase tracking-widest mt-1 text-orange-200">Á Khoa 2</span>
                </div>
              </div>
            </div>
          </section>

          <section className="card-hard p-6 sm:p-10 bg-[#0d121c] border-white/15 space-y-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5 font-['Fraunces','Playfair_Display',Georgia,serif]">
                  <Clock className="w-6 h-6 text-amber-400 shrink-0" />
                  <span>Đồng Hồ Thời Gian Học Tập Trọn Đời</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Biểu đồ phân bổ nhịp học sâu ban ngày (Thần Quang) và ban đêm (Dạ Túc) trên toàn hệ thống
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono text-slate-400 block">Tổng giờ học tích luỹ:</span>
                <span className="text-3xl sm:text-4xl font-black text-amber-300 font-mono tracking-tight">
                  128,450
                  <span className="text-base font-normal text-white/50 ml-1">giờ</span>
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                <div className="flex items-center gap-2 text-amber-300">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Thần Quang · Nhịp Học Ban Ngày (06:00 - 18:00): 75,015 giờ (58.4%)</span>
                </div>
                <div className="flex items-center gap-2 text-indigo-300">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span>Dạ Túc · Nhịp Học Ban Đêm (18:00 - 06:00): 53,435 giờ (41.6%)</span>
                </div>
              </div>

              <div className="w-full h-5 rounded-xl bg-white/5 overflow-hidden flex border border-white/10 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-l-lg transition-all duration-700"
                  style={{ width: '58.4%' }}
                  title="Nhịp ngày: 58.4%"
                />
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-r-lg transition-all duration-700"
                  style={{ width: '41.6%' }}
                  title="Nhịp đêm: 41.6%"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                  <span className="text-[11px] text-slate-400 block font-medium">Học sinh đang học cùng lúc</span>
                  <strong className="text-lg font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    3,420 thành viên
                  </strong>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                  <span className="text-[11px] text-slate-400 block font-medium">Thời lượng trung bình phiên Pomodoro</span>
                  <strong className="text-lg font-mono font-bold text-amber-300">52 phút / phiên</strong>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                  <span className="text-[11px] text-slate-400 block font-medium">Tỷ lệ duy trì chuỗi học tập đều đặn</span>
                  <strong className="text-lg font-mono font-bold text-cyan-300">98.2% học sinh</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5 font-['Fraunces','Playfair_Display',Georgia,serif]">
                  <BookOpen className="w-6 h-6 text-amber-400 shrink-0" />
                  <span>Bảng Tổng Sắp 12 Môn Học Lịch Sử</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Dữ liệu đối sánh từ hơn 2,400,000 phiên thảo luận học thuật (chuẩn mực HoiDap247, Lazi và F-Forum)
                </p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    maxLength={50}
                    value={subjectSearchQuery}
                    onChange={(e) => setSubjectSearchQuery(e.target.value)}
                    placeholder="Tìm môn học hoặc thủ khoa..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setSubjectFilter('all')}
                    className={`btn-feastables ff-tactile-pop px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      subjectFilter === 'all' ? 'bg-amber-400 text-[#0b0d12]' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubjectFilter('natural')}
                    className={`btn-feastables ff-tactile-pop px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      subjectFilter === 'natural' ? 'bg-amber-400 text-[#0b0d12]' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Tự nhiên
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubjectFilter('social')}
                    className={`btn-feastables ff-tactile-pop px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      subjectFilter === 'social' ? 'bg-amber-400 text-[#0b0d12]' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Xã hội
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubjectFilter('specialized')}
                    className={`btn-feastables ff-tactile-pop px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      subjectFilter === 'specialized' ? 'bg-amber-400 text-[#0b0d12]' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Chuyên ngành
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSubjects.map((sub, idx) => (
                <div
                  key={sub.id}
                  className="card-hard p-5 bg-[#0e131d] border-white/15 hover:border-amber-400/40 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-white/10 text-white font-mono text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h3 className="text-base font-extrabold text-white">{sub.name}</h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-400/10 text-amber-300 border border-amber-400/20">
                        {sub.category}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                        <span className="text-[10px] text-slate-400 block">Số lời giải chuẩn</span>
                        <strong className="font-mono text-white text-sm">{sub.solvedQuestions.toLocaleString()}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                        <span className="text-[10px] text-slate-400 block">Tỷ lệ chấp thuận</span>
                        <strong className="font-mono text-emerald-400 text-sm">{sub.acceptanceRate}%</strong>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Thủ khoa môn học:</span>
                      <strong className="text-amber-200">{sub.valedictorian}</strong>
                      <span className="text-[10px] text-slate-400 block">{sub.valedictorianSchool}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5 text-amber-300">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card-hard p-8 bg-gradient-to-r from-amber-500/10 via-[#0e131d] to-[#0e131d] border-amber-400/30 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-xl font-extrabold text-white font-['Fraunces','Playfair_Display',Georgia,serif]">
                Bạn Đã Sẵn Sàng Ghi Danh Lên Bảng Vàng?
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                Tham gia phòng thi thử CBT hoặc giải đáp câu hỏi hóc búa tại Đấu trường tri thức để tích lũy điểm cống hiến và giờ học sâu ngay hôm nay.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate?.('exam-vault')}
                className="btn-feastables ff-tactile-pop px-5 py-2.5 rounded-xl bg-amber-400 text-[#0b0d12] text-xs font-black flex items-center gap-2 cursor-pointer shadow-md"
              >
                <span>Vào Kho Đề Thi CBT</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate?.('qa')}
                className="btn-feastables ff-tactile-pop px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                <span>Sàn Hỏi Đáp Học Thuật</span>
              </button>
            </div>
          </section>
        </main>
      )}

      {activeTabMode === 'sphere' && (
        <div className="relative w-full h-[90vh]">
          <div
            id="stage"
            ref={stageRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            className="absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing select-none"
            style={{ perspective: '1100px', touchAction: 'pan-y' }}
          >
            <div
              id="world"
              ref={worldRef}
              className="absolute top-1/2 left-1/2 w-0 h-0 transform-style-3d will-change-transform"
            >
              <div id="orb" className="absolute top-0 left-0 w-0 h-0 transform-style-3d opacity-100">
                {records.map((rec, i) => {
                  const pt = FIBONACCI_POINTS[i];
                  const thumbUrl = rec.customImgUrl || `${CDN_BASE}${rec.imgId}_min.webp`;
                  return (
                    <div
                      key={rec.id}
                      ref={(el) => setCardRef(el, i)}
                      data-idx={i}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => openLightbox(rec, e)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openLightbox(rec, e as any);
                        }
                      }}
                      aria-label={`Xem ảnh vinh danh: ${rec.title}`}
                      className={`card absolute top-0 left-0 cursor-pointer transform-style-3d transition-transform duration-300 hover:scale-105 ${
                        rec.isTall ? 'tall' : ''
                      }`}
                      style={{
                        transform: `rotateY(${pt.lon}deg) rotateX(${-pt.lat}deg) translateZ(${sphereRadius}px)`,
                      }}
                    >
                      <figure className="card-figure relative w-full h-full rounded-[3px] overflow-hidden bg-[#0a0a0a]">
                        <img
                          src={thumbUrl}
                          alt={rec.title}
                          onError={(e) => handleImageError(e, DEFAULT_CLUB_COVER)}
                          className="w-full h-full object-cover transition-opacity duration-700"
                          loading="eager"
                          decoding="async"
                          width={280}
                          height={180}
                        />
                      </figure>
                    </div>
                  );
                })}
              </div>

              <h1
                id="headline"
                ref={headlineRef}
                className="absolute top-0 left-0 w-[min(56vw,640px)] -ml-[calc(min(56vw,640px)/2)] text-center font-['Playfair_Display'] text-white select-none pointer-events-none font-playfair tracking-tight"
              >
                <span className="inner absolute top-0 left-0 w-full -translate-y-1/2">
                  <span style={{ '--i': 0 } as React.CSSProperties}>{headlineWords[0] ?? 'BroAmStuck'}</span>{' '}
                  <span style={{ '--i': 1 } as React.CSSProperties}>{headlineWords[1] ?? 'Studio'}</span>{' '}
                  <span style={{ '--i': 2 } as React.CSSProperties}>{headlineWords[2] ?? '•'}</span>{' '}
                  <span style={{ '--i': 3 } as React.CSSProperties}>{headlineWords[3] ?? 'Trần'}</span>{' '}
                  <span style={{ '--i': 4 } as React.CSSProperties}>{headlineWords[4] ?? 'Tuấn'}</span>
                </span>
              </h1>
            </div>
          </div>
        </div>
      )}

      {activeTabMode === 'archive' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {records.map((rec) => {
              const thumbUrl = rec.customImgUrl || `${CDN_BASE}${rec.imgId}_min.webp`;
              return (
                <div
                  key={rec.id}
                  onClick={(e) => openLightbox(rec, e)}
                  className="card-hard group relative aspect-[3/2] rounded-xl overflow-hidden bg-[#0b0b0b] border border-white/10 cursor-pointer"
                >
                  <img
                    src={thumbUrl}
                    alt={rec.title}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => handleImageError(e, DEFAULT_CLUB_COVER)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-4 flex flex-col justify-end">
                    <span className="text-[10px] text-amber-300 font-mono font-bold uppercase">{rec.place}</span>
                    <h4 className="text-sm font-bold text-white">{rec.title}</h4>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeLitRecord && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeLitRecord.title}
          onClick={closeLightbox}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
        >
          <div
            className="card-hard max-w-xl w-full bg-[#111722] border-white/20 p-5 rounded-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-300 uppercase">{activeLitRecord.place}</span>
              <button
                type="button"
                onClick={closeLightbox}
                className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-[16/10] rounded-xl overflow-hidden bg-black/50 border border-white/10">
              <img
                src={activeLitRecord.customImgUrl || `${CDN_BASE}${activeLitRecord.imgId}.png`}
                alt={activeLitRecord.title}
                loading="lazy"
                decoding="async"
                onError={(e) => handleImageError(e, DEFAULT_CLUB_COVER)}
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-1">{activeLitRecord.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{activeLitRecord.note}</p>
            </div>
          </div>
        </div>
      )}

      {isEditBioModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Quản trị nội dung Đại Sảnh"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
        >
          <div className="card-hard max-w-lg w-full bg-[#111722] border-white/20 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Quản trị Đại Sảnh Vinh Danh</h3>
              <button
                type="button"
                onClick={() => setIsEditBioModalOpen(false)}
                className="p-1 text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Họ tên người sáng lập</label>
                <input
                  type="text"
                  maxLength={100}
                  value={editBioForm.name}
                  onChange={(e) => setEditBioForm({ ...editBioForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Chức danh</label>
                <input
                  type="text"
                  maxLength={100}
                  value={editBioForm.role}
                  onChange={(e) => setEditBioForm({ ...editBioForm, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Lời ngỏ / Tiểu sử</label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={editBioForm.bio}
                  onChange={(e) => setEditBioForm({ ...editBioForm, bio: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-sm text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsEditBioModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-xs text-white"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  setFounderProfile(editBioForm);
                  safeStorage.setItem('fforum_vinhdanh_founder', JSON.stringify(editBioForm));
                  setIsEditBioModalOpen(false);
                }}
                className="btn-feastables ff-tactile-pop px-5 py-2 rounded-xl bg-amber-400 text-[#0b0d12] text-xs font-bold"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KhuVinhDanhView;
