/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Edit3,
  Upload,
  MapPin,
  Settings,
  Compass,
  ArrowRight,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';
import type { User, DimensionView } from '../../types';
import { AdminVerifiedBadge } from '../Badges10Tier';
import { safeStorage } from '../../utils/storage';
import {
  getSavedAboutData,
  fetchAboutDataFromServer,
  saveAboutDataToServer,
  type MilestoneItem,
  type AboutData,
} from '../../store/adminStore';
import { DEFAULT_CLUB_COVER, DEFAULT_AVATAR, handleImageError } from '../../utils/mediaFallback';
import { isMasterAdmin } from '../../config/admin';
import { rafThrottle } from '../../utils/rafThrottle';
import { uploadImageToServer } from '../../utils/imagePipeline';
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
const INTRO_FILM_URL = `${CDN_BASE}hf_20260922_195107_ed3f055a-3a13-4a71-b743-e10310454246.mp4`;
const FOUNDER_AVATAR_ID = 'hf_20260922_194417_a455843c-d8db-461c-8ef6-74a325d2472c';

const INITIAL_VINHDANH_RECORDS: VinhDanhRecord[] = [
  {
    id: 'vd-1',
    imgId: 'hf_20260922_194349_26ffdbfd-ac5e-49e9-a07d-c06d3f7cb4cb',
    title: 'Khởi Sinh F-Forum',
    place: 'Đà Nẵng · Việt Nam',
    note: 'Hạ tầng máy chủ tự chủ toàn quốc chạy trực tiếp từ máy cá nhân qua Cloudflare Tunnel.',
  },
  {
    id: 'vd-2',
    imgId: 'hf_20260922_194350_5546ea3d-6336-42c7-a59f-06165c5802be',
    title: 'BroAmStuck Studio',
    place: 'Creative Lab',
    note: 'Xưởng thiết kế giao diện tương tác cao cấp, định hình trải nghiệm web điện ảnh thế hệ mới.',
  },
  {
    id: 'vd-3',
    imgId: 'hf_20260922_194349_b4533691-cb49-41d4-b56c-51f0fdcbe250',
    title: 'Miền Ký Ức',
    place: 'Biên Niên Sử',
    note: 'Tái hiện dòng chảy thời gian của trường xưa bằng kỹ thuật cuộn đa tầng Mostar.',
  },
  {
    id: 'vd-4',
    imgId: 'hf_20260922_194349_e588abd3-1bfa-4918-894f-05632cc51ccc',
    title: 'Sàn Q&A Ẩn Danh',
    place: 'Không Gian Tri Thức',
    note: 'Nơi học sinh tự do hỏi bài tập khó mà không sợ định kiến hay phán xét.',
  },
  {
    id: 'vd-5',
    imgId: 'hf_20260922_194350_28d92c80-de66-41cb-911e-b3b44aebe1f5',
    title: 'Quảng Trường CLB',
    place: 'Hội Quán Đam Mê',
    note: 'Không gian quy tụ các câu lạc bộ công nghệ, nghệ thuật và thiên văn.',
  },
  {
    id: 'vd-6',
    imgId: 'hf_20260922_194349_04e89718-4214-4aff-bac5-490462bbfe2f',
    title: 'Phòng Chat Đàm Thoại',
    place: 'Kết Nối Real-Time',
    note: 'Đồng bộ tin nhắn tức thì giữa các thiết bị với cơ sở dữ liệu và WebSocket.',
  },
  {
    id: 'vd-7',
    imgId: 'hf_20260922_194417_2c031e22-2fad-4c81-a544-83cd6bba1c33',
    title: 'Hệ Thống 8 Bậc Danh Hiệu',
    place: 'Thánh Địa Ghibli',
    note: 'Vinh danh nỗ lực học tập của thành viên bằng huy hiệu vector kỳ ảo.',
  },
  {
    id: 'vd-8',
    imgId: 'hf_20260922_194349_a39c3226-7848-4b15-b840-98ad8aec467b',
    title: 'Thẻ Học Sinh F-Pass 3D',
    place: 'Không Gian Hologram',
    note: 'Thẻ định danh kỹ thuật số hiệu ứng 3D nghiêng theo tọa độ chuột.',
  },
  {
    id: 'vd-9',
    imgId: 'hf_20260922_194417_555e4d90-f35f-4a1a-8c75-def1e8b71988',
    title: 'Focus Sanctuary 432Hz',
    place: 'Tịnh Tâm Thư Phòng',
    note: 'Âm thanh sóng não Alpha và đồng hồ Pomodoro hỗ trợ ôn thi hiệu quả.',
  },
  {
    id: 'vd-10',
    imgId: 'hf_20260922_194417_e525a243-03c8-454b-83b4-60f541baf70a',
    title: 'Dual Real OAuth',
    place: 'Bảo Mật Google & Meta',
    note: 'Đăng nhập an toàn một chạm bằng tài khoản Google và Facebook chính thức.',
  },
  {
    id: 'vd-11',
    imgId: 'hf_20260922_194349_ec830e6f-b8e6-4569-8540-ee7f33902c53',
    title: 'Hội Đồng Học Sinh',
    place: 'Tiếng Nói Trẻ',
    note: 'Nơi mọi ý kiến đóng góp được tôn trọng và chuyển thẳng tới quản trị viên.',
  },
  {
    id: 'vd-12',
    imgId: 'hf_20260922_194417_35a9af5f-bd07-45a7-bb73-08b47d19d530',
    title: 'Zero-Cost Deployment',
    place: 'Hạ Tầng Tự Chủ',
    note: 'Kiến trúc biến máy tính cá nhân thành máy chủ phục vụ toàn quốc.',
  },
  {
    id: 'vd-13',
    imgId: 'hf_20260922_194416_30e307a9-1265-45c3-a1a0-5c6fa5bb9f8d',
    title: 'Bảo Mật Dữ Liệu Thực',
    place: 'Phòng Tuyến An Ninh',
    note: 'Loại bỏ bot tự động và tài khoản ảo, cam kết 100% tương tác thực tế.',
  },
  {
    id: 'vd-14',
    imgId: 'hf_20260922_194417_ff5cb9f8-8eed-4bfb-bb08-11256da92eae',
    title: 'Boomerang Video Engine',
    place: 'Visual Lab',
    note: 'Kỹ thuật bắt khung hình Canvas HTML5 phát lặp xuôi ngược 30fps mượt mà.',
  },
  {
    id: 'vd-15',
    imgId: 'hf_20260922_194418_1d9bff4a-4971-4944-9e49-d72e755ceeb0',
    title: 'Tri Thức Mở',
    place: 'Thư Viện Học Đường',
    note: 'Kho tàng lời giải bài tập từ môn Toán, Lý, Hóa đến các đề tài xã hội.',
  },
  {
    id: 'vd-16',
    imgId: 'hf_20260922_194349_75e53821-0807-4ebc-992d-34bae0ec2ce6',
    title: 'Khuôn Viên Kỹ Thuật Số',
    place: 'Không Gian Sáng Tạo',
    note: 'Mỗi dòng mã nguồn là một viên gạch xây đắp nên mái nhà chung cho học trò.',
  },
  {
    id: 'vd-17',
    imgId: 'hf_20260922_194417_5a227847-3796-4438-805d-7e66e9538205',
    title: 'Góc Tâm Sự Học Trò',
    place: 'Thì Thầm Đêm Muộn',
    note: 'Chia sẻ áp lực điểm số và những rung động đầu đời trong sự thấu cảm.',
  },
  {
    id: 'vd-18',
    imgId: 'hf_20260922_194350_b49aa67e-0401-4029-af4f-f6ac3ee83398',
    title: 'CLB Xuất Sắc Nhất Tháng',
    place: 'Bảng Vàng Danh Dự',
    note: 'Tôn vinh câu lạc bộ có đóng góp tích cực và hoạt động sôi nổi nhất.',
  },
  {
    id: 'vd-19',
    imgId: 'hf_20260922_194349_89b82779-3a46-4c55-b7c5-f4a0fd955874',
    title: 'Tinh Thần Thủ Lĩnh',
    place: 'Ban Quản Trị',
    note: 'Dẫn dắt bằng sự tận tụy, không ngừng đổi mới và phụng sự cộng đồng.',
  },
  {
    id: 'vd-20',
    imgId: 'hf_20260922_194416_47e18c62-253a-42e1-97a9-9e5f6a6b8d59',
    title: 'Bản Sắc Học Trò',
    place: 'BroAmStuck Studio',
    note: 'Kỷ vật lưu giữ tinh thần sáng tạo không giới hạn của tuổi trẻ.',
    isTall: true,
  },
  {
    id: 'vd-21',
    imgId: 'hf_20260922_194417_a455843c-d8db-461c-8ef6-74a325d2472c',
    title: 'Người Giữ Ngọn Lửa',
    place: 'F-Forum Admin',
    note: 'Trần Văn Anh Tuấn — Founder & Lead Developer.',
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
    return {
      id: fallback.id,
      imgId: typeof item.imgId === 'string' && item.imgId.trim() ? item.imgId.trim() : fallback.imgId,
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
      customImgUrl: rawImgUrl && rawImgUrl !== defaultPng ? rawImgUrl : undefined,
      isTall: typeof item.isTall === 'boolean' ? item.isTall : Boolean(fallback.isTall),
    };
  });
}

const DEFAULT_HEADLINE_WORDS = ['BroAmStuck', 'Studio', '•', 'Trần', 'Tuấn'];
const DEFAULT_COLOPHON = 'BroAmStuck Studio • 2026';

export const KhuVinhDanhView: React.FC<KhuVinhDanhViewProps> = ({
  onExit,
  onNavigate,
  currentUser,
}) => {
  const isSuperAdmin = isMasterAdmin(currentUser?.email);

  const [founderProfile, setFounderProfile] = useState<FounderProfileState>(() => {
    const saved = safeStorage.getItem('fforum_vinhdanh_founder');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.name) return parsed as FounderProfileState;
      } catch {
        /* ignore */
      }
    }
    return {
      name: 'Trần Văn Anh Tuấn',
      role: 'Admin F-Forum • Owner BroAmStuck Studio',
      avatarUrl: `${CDN_BASE}${FOUNDER_AVATAR_ID}.png`,
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
        /* ignore */
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
  const [colophonText, setColophonText] = useState<string>(() => {
    const about = getSavedAboutData();
    return about.colophon || DEFAULT_COLOPHON;
  });
  const [introFilmUrl, setIntroFilmUrl] = useState<string>(() => {
    const about = getSavedAboutData();
    return about.introFilmUrl || INTRO_FILM_URL;
  });
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const [isRevealed, setIsRevealed] = useState(false);
  const [isSplashDone, setIsSplashDone] = useState(false);
  const [isIntroFilmPlaying, setIsIntroFilmPlaying] = useState(false);
  const [isIntroFading, setIsIntroFading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGridView, setIsGridView] = useState(false);
  const [activeLitRecord, setActiveLitRecord] = useState<VinhDanhRecord | null>(null);
  const [fullImgLoaded, setFullImgLoaded] = useState(false);
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
    const splashTimer = setTimeout(() => {
      setIsSplashDone(true);
      setIsIntroFilmPlaying(true);
    }, 1200);
    return () => clearTimeout(splashTimer);
  }, []);

  /* P3: Nạp trước thumbnail theo từng lô nhỏ khi rảnh (6 ảnh/lượt) thay vì giải mã đồng loạt 48 ảnh,
     đồng thời đăng ký .dispose() giải phóng bộ nhớ khi rời trang. */
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

  useEffect(() => {
    if (isIntroFilmPlaying && filmVideoRef.current) {
      filmVideoRef.current.currentTime = 0;
      filmVideoRef.current.playbackRate = 2;
      filmVideoRef.current.play().catch(() => {});
    }
  }, [isIntroFilmPlaying]);

  const [isEditRecordModalOpen, setIsEditRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<VinhDanhRecord | null>(null);
  const [isEditBioModalOpen, setIsEditBioModalOpen] = useState(false);
  const [editBioForm, setEditBioForm] = useState(founderProfile);
  const [adminModalTab, setAdminModalTab] = useState<'bio' | 'milestones' | 'scene'>('bio');
  const [adminSelectedMilestoneIdx, setAdminSelectedMilestoneIdx] = useState(0);
  const milestoneFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    const applyServerAboutPayload = (payload: Partial<AboutData> | null | undefined) => {
      if (!payload) return;
      if (payload.founder) {
        const nextFounder: FounderProfileState = {
          name: payload.founder.name || 'Trần Văn Anh Tuấn',
          role: payload.founder.role || 'Admin F-Forum • Owner BroAmStuck Studio',
          avatarUrl: payload.founder.avatarUrl || `${CDN_BASE}${FOUNDER_AVATAR_ID}.png`,
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
      if (typeof payload.colophon === 'string' && payload.colophon.trim()) {
        setColophonText(payload.colophon);
      }
      if (typeof payload.introFilmUrl === 'string' && payload.introFilmUrl.trim()) {
        setIntroFilmUrl(payload.introFilmUrl);
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
        /* ignore */
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
  const filmVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const engineState = useRef({
    spin: 0,
    tilt: -4,
    camZ: 0,
    wheelCamZ: 0,
    velX: 0,
    velY: 0,
    isDragging: false,
    lastPointerX: 0,
    lastPointerY: 0,
    pointerStartX: 0,
    pointerStartY: 0,
    mousePos: { x: -100, y: -100 },
    dotPos: { x: -100, y: -100 },
    R: 360,
    cw: 140,
    hasFinePointer: true,
  });

  const finishIntroFilm = useCallback(() => {
    setIsIntroFading(true);
    setTimeout(() => {
      setIsIntroFilmPlaying(false);
      setIsRevealed(true);
    }, 700);
  }, []);

  const handleSetVideoSpeed = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    e.currentTarget.playbackRate = 2;
  }, []);

  const applyCardLayout = useCallback((R: number, cw: number) => {
    engineState.current.R = R;
    engineState.current.cw = cw;

    FIBONACCI_POINTS.forEach((pt, i) => {
      const cardEl = cardsRef.current[i];
      if (!cardEl) return;
      const rec = records[i] || INITIAL_VINHDANH_RECORDS[i];
      const isTall = Boolean(rec.isTall);

      const cardW = cw;
      const cardH = isTall ? Math.round(cw * 1.25) : Math.round(cw / 1.5);
      const marginX = -Math.round(cardW / 2);
      const marginY = isTall ? -Math.round(cw * 0.625) : -Math.round(cw / 3);

      cardEl.style.width = `${cardW}px`;
      cardEl.style.height = `${cardH}px`;
      cardEl.style.marginLeft = `${marginX}px`;
      cardEl.style.marginTop = `${marginY}px`;
      cardEl.style.transform = `rotateY(${pt.lon}deg) rotateX(${-pt.lat}deg) translateZ(${R}px)`;
    });
  }, [records]);

  useEffect(() => {
    let animId: number;

    const checkFinePointer = () => {
      engineState.current.hasFinePointer = window.matchMedia('(pointer: fine)').matches;
    };
    checkFinePointer();

    const dims = computeRadiusAndCardWidth(window.innerWidth, window.innerHeight);
    applyCardLayout(dims.R, dims.cw);

    const handleResize = () => {
      const nextDims = computeRadiusAndCardWidth(window.innerWidth, window.innerHeight);
      setSphereRadius(nextDims.R);
      applyCardLayout(nextDims.R, nextDims.cw);
    };

    /* R4: gộp resize về 1 lần/khung hình */
    let cachedScrollY = window.scrollY || 0;
    let cachedInnerHeight = Math.max(1, window.innerHeight || 800);
    const onPassiveScroll = () => {
      cachedScrollY = window.scrollY || 0;
    };
    const handleResizeWithCache = () => {
      cachedInnerHeight = Math.max(1, window.innerHeight || 800);
      handleResize();
    };
    const handleResizeFrame = rafThrottle(handleResizeWithCache);
    window.addEventListener('resize', handleResizeFrame, { passive: true });
    window.addEventListener('scroll', onPassiveScroll, { passive: true });

    /* P1 + P4: Bộ cập nhật theo lô (dirty-checking) + Back-Hemisphere Culling */
    const cardBatcher = new SphereCardBatchUpdater(FIBONACCI_POINTS.length);
    const disposeSphereGeo = registerDisposableResource('vinhdanh-sphere-geo', 'geometry', () => {
      cardBatcher.reset();
    });
    let lastFrameTs = performance.now();

    const tick = (now = performance.now()) => {
      /* P0: Tạm dừng xử lý 3D hoàn toàn khi tab ẩn, đang mở dạng lưới phẳng, menu hoặc đang xem phim intro */
      if (
        (typeof document !== 'undefined' && document.hidden) ||
        isGridView ||
        isMenuOpen ||
        isIntroFilmPlaying
      ) {
        animId = requestAnimationFrame(tick);
        return;
      }

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
        if (res.visible) visibleCount += 1;
        else culledCount += 1;
        if (res.mutated) domCalls += 1;
      });

      recordRenderFrameMetrics({
        calls: domCalls,
        triangles: visibleCount * 2,
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

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      disposeSphereGeo();
      window.removeEventListener('scroll', onPassiveScroll);
      { window.removeEventListener('resize', handleResizeFrame); handleResizeFrame.cancel(); }
    };
  }, [applyCardLayout, activeLitRecord, isGridView, isMenuOpen, isIntroFilmPlaying]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeLitRecord) return;
    if (e.button !== 0) return;

    engineState.current.isDragging = true;
    engineState.current.lastPointerX = e.clientX;
    engineState.current.lastPointerY = e.clientY;
    engineState.current.pointerStartX = e.clientX;
    engineState.current.pointerStartY = e.clientY;

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = engineState.current;
    state.mousePos.x = e.clientX;
    state.mousePos.y = e.clientY;

    if (!state.isDragging) return;

    const dx = e.clientX - state.lastPointerX;
    const dy = e.clientY - state.lastPointerY;
    state.lastPointerX = e.clientX;
    state.lastPointerY = e.clientY;

    state.velX = dx * 0.13;
    state.velY = -dy * 0.13;

    state.spin += state.velX;
    state.tilt = Math.max(-32, Math.min(32, state.tilt + state.velY));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    engineState.current.isDragging = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const state = engineState.current;
    const { R } = state;
    state.wheelCamZ = Math.max(-R * 0.35, Math.min(R * 0.5, state.wheelCamZ - e.deltaY * 0.2));
  };

  const openLightbox = (record: VinhDanhRecord, e: React.MouseEvent<HTMLElement>) => {
    const state = engineState.current;
    const slop = Math.hypot(e.clientX - state.pointerStartX, e.clientY - state.pointerStartY);
    if (slop > 10) return;

    e.stopPropagation();
    setActiveLitRecord(record);
    setFullImgLoaded(false);

    const fullImg = new Image();
    fullImg.src = record.customImgUrl || `${CDN_BASE}${record.imgId}.png`;
    fullImg.onload = () => setFullImgLoaded(true);
    fullImg.onerror = () => setFullImgLoaded(true);
    if ('decode' in fullImg && typeof fullImg.decode === 'function') {
      fullImg.decode().then(() => {
        setFullImgLoaded(true);
      }).catch(() => {
        /* handled by onload fallback */
      });
    }
  };

  const closeLightbox = () => {
    setActiveLitRecord(null);
  };

  const handleOpenEditRecord = (rec: VinhDanhRecord) => {
    setEditingRecord({ ...rec });
    setIsEditRecordModalOpen(true);
  };

  const syncToServer = useCallback((
    updatedFounder: typeof founderProfile,
    updatedRecords: VinhDanhRecord[],
    extra?: { headlineWords?: string[]; colophon?: string; introFilmUrl?: string },
  ) => {
    if (!currentUser || !isSuperAdmin) return;
    const currentAbout = getSavedAboutData();
    const milestones: MilestoneItem[] = updatedRecords.map((r, idx) => ({
      id: `ms-${idx + 1}`,
      imgId: r.imgId,
      title: r.title,
      category: r.place,
      place: r.place,
      imageUrl: r.customImgUrl || `${CDN_BASE}${r.imgId}.png`,
      customImgUrl: r.customImgUrl || undefined,
      notes: r.note,
      note: r.note,
      isTall: Boolean(r.isTall),
    }));

    const nextHeadlineWords = extra?.headlineWords || headlineWords;
    const nextColophon = extra?.colophon ?? colophonText;
    const nextIntroFilmUrl = extra?.introFilmUrl ?? introFilmUrl;

    saveAboutDataToServer({
      ...currentAbout,
      headline: nextHeadlineWords.join(' '),
      subtitle: 'Khu Vinh Danh • 3D Fibonacci Sphere Chronicles & System Archive',
      headlineWords: nextHeadlineWords,
      colophon: nextColophon,
      introFilmUrl: nextIntroFilmUrl,
      founder: {
        name: updatedFounder.name,
        role: updatedFounder.role,
        avatarUrl: updatedFounder.avatarUrl,
        bio: updatedFounder.bio,
        email: 'BroAmStuck@gmail.com',
      },
      milestones,
    }, currentUser.email).catch(() => {});
  }, [currentUser, isSuperAdmin, headlineWords, colophonText, introFilmUrl]);

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const nextRecords = records.map((r) => (r.id === editingRecord.id ? editingRecord : r));
    setRecords(nextRecords);
    safeStorage.setItem('fforum_vinhdanh_records', JSON.stringify(nextRecords));
    if (activeLitRecord?.id === editingRecord.id) {
      setActiveLitRecord(editingRecord);
    }
    syncToServer(founderProfile, nextRecords);
    setIsEditRecordModalOpen(false);
  };

  const handleSaveBio = (e: React.FormEvent) => {
    e.preventDefault();
    setFounderProfile(editBioForm);
    safeStorage.setItem('fforum_vinhdanh_founder', JSON.stringify(editBioForm));
    syncToServer(editBioForm, records);
    setIsEditBioModalOpen(false);
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    mode: 'avatar' | 'record' | 'milestone-tab' = 'record',
  ) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    e.target.value = '';

    const applyUrl = (url: string) => {
      if (mode === 'avatar') {
        setEditBioForm((prev: FounderProfileState) => ({ ...prev, avatarUrl: url }));
      } else if (mode === 'milestone-tab') {
        setRecords((prev) =>
          prev.map((r, i) => (i === adminSelectedMilestoneIdx ? { ...r, customImgUrl: url } : r)),
        );
      } else {
        setEditingRecord((prev: VinhDanhRecord | null) => (prev ? { ...prev, customImgUrl: url } : null));
      }
    };

    /* Hiển thị xem trước ngay lập tức, đồng thời tải lên máy chủ để lưu bền vững (.webp) */
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) applyUrl(dataUrl);
    };
    reader.readAsDataURL(file);

    setIsUploadingMedia(true);
    uploadImageToServer(file, 'post')
      .then((uploaded) => {
        if (uploaded.url) applyUrl(uploaded.url);
      })
      .catch(() => {})
      .finally(() => setIsUploadingMedia(false));
  };

  return (
    <div
      className={`khu-vinh-danh-standalone relative w-full min-h-[116vh] bg-[#000000] text-[#f4f2ef] overflow-x-hidden ${
        isRevealed ? 'revealed' : ''
      }`}
      style={{
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
      onWheel={handleWheel}
    >
      {/* 1. Scoped CSS Tokens & Breakpoints verbatim from spec */}
      <style>{`
        .khu-vinh-danh-standalone {
          --bg: #000000;
          --ink: #f4f2ef;
          --dim: #8c8783;
          --line: rgba(244, 242, 239, 0.28);
          --pad: clamp(14px, 2.6vw, 34px);
          --ease: cubic-bezier(0.22, 0.61, 0.36, 1);
          --hw: min(56vw, 640px);
          --persp: 1150px;
        }

        #headline {
          font-family: "Playfair Display", "Times New Roman", serif;
          font-weight: 400;
          font-size: clamp(25px, 3.7vw, 55px);
          line-height: 1.06;
          letter-spacing: -0.005em;
          color: #fff;
          text-shadow: 0 2px 34px rgba(0, 0, 0, 0.55);
        }

        #headline .inner {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          transform: translateY(-50%);
        }

        #headline .inner span {
          display: inline-block;
          opacity: 0;
          transform: translateY(0.42em);
          filter: blur(7px);
          transition: opacity 1.05s, transform 1.15s, filter 1.05s;
          transition-delay: calc(0.9s + var(--i, 0) * 0.085s);
        }

        .revealed #headline .inner span {
          opacity: 1;
          transform: none;
          filter: blur(0);
        }

        .transform-style-3d {
          transform-style: preserve-3d;
        }

        .card-figure::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: rgba(0, 0, 0, var(--d, 0));
          border-radius: 3px;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.07);
          transition: background 0.08s linear;
        }

        /* Menu Bars */
        .menu-btn .bar-top {
          transform: translateY(-5px);
          transition: transform 0.35s var(--ease), width 0.35s var(--ease);
        }
        .menu-btn .bar-bot {
          transform: translateY(5px);
          width: clamp(34px, 3.6vw, 50px);
          transition: transform 0.35s var(--ease), width 0.35s var(--ease);
        }
        .menu-btn:hover .bar-bot {
          transform: translateY(5px) translateX(-8px);
        }
        .menu-btn.open .bar-top {
          transform: translateY(0) rotate(45deg);
          width: 100%;
        }
        .menu-btn.open .bar-bot {
          transform: translateY(0) rotate(-45deg);
          width: 100%;
        }

        /* Grid Button */
        .gridbtn b {
          display: block;
          background: #f4f2ef;
          border-radius: 2px;
          transition: transform 0.3s var(--ease), background 0.2s;
        }
        .gridbtn:hover b {
          background: #fff;
          transform: scale(0.86);
        }
        .gridbtn.is-grid b:nth-child(1) { transform: translate(3px, 3px); }
        .gridbtn.is-grid b:nth-child(4) { transform: translate(-3px, -3px); }

        /* Scroll Cue Line sweep */
        @keyframes cueSweep {
          0% { transform: translateX(-100%); }
          55% { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }
        .cue-line::after {
          content: '';
          position: absolute;
          inset: 0;
          background: #f4f2ef;
          animation: cueSweep 2.6s var(--ease) infinite;
        }

        /* Responsive Breakpoints verbatim */
        @media (max-width: 900px) {
          .khu-vinh-danh-standalone { --persp: 920px; }
          .bio-card { max-width: min(420px, calc(100vw - var(--pad) * 2)); }
          .colophon-card { font-size: 11px; }
          .lit-meta { grid-template-columns: 1fr !important; gap: 10px !important; padding-top: 14px !important; }
          .grid-rows { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)) !important; }
        }

        @media (max-width: 768px) {
          .colophon-card { display: none !important; }
          .bio-card { max-width: calc(100vw - var(--pad) * 2); }
          #headline {
            font-size: clamp(22px, 6.4vw, 34px);
            margin-left: calc(var(--hw) / -2);
          }
          .menu-link { font-size: clamp(28px, 9vw, 54px) !important; }
        }

        @media (max-width: 640px) {
          .khu-vinh-danh-standalone {
            --hw: min(84vw, 360px);
            --pad: clamp(12px, 4vw, 18px);
            --persp: 760px;
          }
          .bio-avatar { width: 42px !important; height: 42px !important; }
          .cue-card { display: none !important; }
          .lit-dialog { max-width: 560px !important; }
          .grid-rows { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
        }

        @media (max-width: 380px) {
          .khu-vinh-danh-standalone {
            --hw: min(88vw, 320px);
            --persp: 620px;
          }
          .bio-p { display: none !important; }
          .grid-rows { grid-template-columns: 1fr !important; }
        }

        @media (max-height: 520px) and (orientation: landscape) {
          .bio-card, .colophon-card, .cue-card { display: none !important; }
          #headline { font-size: clamp(18px, 4.8vh, 28px); }
        }
      `}</style>

      {/* Layer 1: #scrolltrack — height 116vh for 16vh zoom dolly */}
      <div id="scrolltrack" className="h-[116vh] w-full pointer-events-none" />

      {/* Layer 2: #stage — fixed inset-0, z-10 */}
      <div
        id="stage"
        ref={stageRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="fixed inset-0 z-10 overflow-hidden cursor-grab active:cursor-grabbing select-none"
        style={{ perspective: 'var(--persp)', touchAction: 'pan-y' }}
      >
        <div
          id="world"
          ref={worldRef}
          className="absolute top-1/2 left-1/2 w-0 h-0 transform-style-3d will-change-transform"
        >
          {/* #orb: 21 milestone cards mapped on Fibonacci sphere */}
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

          {/* h1#headline: Exactly 5 spans, optical lock at sphere center */}
          <h1
            id="headline"
            ref={headlineRef}
            className="absolute top-0 left-0 w-[var(--hw)] -ml-[calc(var(--hw)/2)] text-center font-['Playfair_Display'] text-white select-none pointer-events-none font-playfair tracking-tight"
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

      {/* Layer 3: .vig — fixed inset-0 z-12 radial vignette */}
      <div
        className={`vig fixed inset-0 z-12 pointer-events-none transition-opacity duration-500 ${
          isGridView || activeLitRecord ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          background:
            'radial-gradient(ellipse 88% 92% at 50% 50%, transparent 48%, rgba(0,0,0,.26) 80%, rgba(0,0,0,.72) 100%)',
        }}
      />

      {/* Layer 4: #grid — fixed inset-0 z-20 flat archive */}
      <div
        id="grid"
        className={`fixed inset-0 z-20 overflow-y-auto bg-black transition-opacity duration-500 pt-[calc(var(--pad)*3.4)] px-[var(--pad)] pb-[calc(var(--pad)*4)] ${
          isGridView ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="grid-rows grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-[1680px] mx-auto">
          {records.map((rec, idx) => {
            const thumbUrl = rec.customImgUrl || `${CDN_BASE}${rec.imgId}_min.webp`;
            return (
              <figure
                key={rec.id}
                className="group relative aspect-[3/2] rounded-xl overflow-hidden bg-[#0b0b0b] border border-white/10"
              >
                <button
                  type="button"
                  onClick={(e) => openLightbox(rec, e)}
                  aria-label={`Xem ảnh: ${rec.title} - ${rec.place}`}
                  className="w-full h-full text-left p-0 border-0 bg-transparent block relative cursor-pointer"
                >
                  <img
                    src={thumbUrl}
                    alt={rec.title}
                    onError={(e) => handleImageError(e, DEFAULT_CLUB_COVER)}
                    className="w-full h-full object-cover opacity-85 group-hover:scale-105 group-hover:opacity-100 transition-all duration-700"
                    loading="lazy"
                    decoding="async"
                    width={360}
                    height={240}
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 p-3.5 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col justify-end pointer-events-none">
                    <span className="text-[10px] font-mono text-amber-300/90">#{String(idx + 1).padStart(2, '0')} · {rec.place}</span>
                    <span className="font-['Playfair_Display'] text-sm sm:text-base text-white font-semibold">{rec.title}</span>
                  </figcaption>
                </button>
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditRecord(rec);
                    }}
                    className="absolute top-2.5 right-2.5 z-10 px-3 py-1.5 rounded-lg bg-black/80 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-400/50 text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Thay ảnh &amp; Sửa</span>
                  </button>
                )}
              </figure>
            );
          })}
        </div>
      </div>

      {/* Layer 5: Chrome Elements */}
      {/* Header.chrome — Sub-header layer (z-40) cleanly positioned below Global Navbar (z-50) */}
      <header className="chrome fixed top-[74px] sm:top-[78px] inset-x-0 z-40 flex items-center justify-between py-2 px-[var(--pad)] pointer-events-none">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onExit();
          }}
          className="wordmark font-['Playfair_Display'] text-[clamp(19px,2.1vw,27px)] tracking-[0.005em] text-white no-underline pointer-events-auto cursor-pointer"
          aria-label="Quay lại F-Forum"
        >
          BroAmStuck<em className="not-italic">Studio</em>
        </a>

        {/* Minimalist Top Social Links & Vào Forum Button */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Facebook Link */}
          <a
            href="https://www.facebook.com/TuanNotTun/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-full bg-blue-600/25 hover:bg-blue-600/40 border border-blue-500/40 text-blue-300 hover:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(59,130,246,0.3)] backdrop-blur-md"
            title="Facebook Admin"
            aria-label="Facebook Admin"
          >
            <svg className="w-3.5 h-3.5 fill-[#1877F2]" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>

          {/* Discord Link */}
          <a
            href="https://discord.gg/GMDCnxxJwX"
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-full bg-[#5865F2]/25 hover:bg-[#5865F2]/40 border border-[#5865F2]/50 text-indigo-200 hover:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(88,101,242,0.3)] backdrop-blur-md"
            title="Discord F-Forum"
            aria-label="Discord F-Forum"
          >
            <svg className="w-3.5 h-3.5 fill-[#5865F2]" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </a>

          {/* Vào Forum Button */}
          <button
            type="button"
            onClick={() => {
              if (onNavigate) {
                onNavigate('qa');
              } else {
                onExit();
              }
            }}
            className="ff-enter-forum-btn flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:from-cyan-400 hover:via-indigo-400 hover:to-purple-500 border border-cyan-300/40 shadow-[0_0_18px_rgba(34,211,238,0.35)] hover:shadow-[0_0_24px_rgba(168,85,247,0.5)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
            title="Chuyển đến Diễn đàn F-Forum Q&A"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-200" />
            <span>Vào Forum</span>
            <ArrowRight className="w-3 h-3 text-purple-200" />
          </button>
        </div>

        <button
          id="menuBtn"
          className={`menu-btn flex flex-col items-end gap-1.5 p-2 pointer-events-auto cursor-pointer ${
            isMenuOpen ? 'open' : ''
          }`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-expanded={isMenuOpen}
          aria-label="Toggle menu"
        >
          <span className={`menu-label text-[clamp(12px,1.25vw,15px)] text-white tracking-[0.01em] transition-opacity ${
            isMenuOpen ? 'opacity-0' : 'opacity-100'
          }`}>
            Menu
          </span>
          <span className="bars relative w-[clamp(42px,4.4vw,62px)] h-[clamp(16px,2vw,22px)] flex items-center">
            <i className="bar-top absolute left-0 right-0 top-1/2 h-[1px] bg-white block" />
            <i className="bar-bot absolute left-0 right-0 top-1/2 h-[1px] bg-white block" />
          </span>
        </button>
      </header>

      {/* Photographer Card .bio */}
      <div
        className={`bio-card bio chrome fixed left-[var(--pad)] bottom-[var(--pad)] z-40 max-w-[min(360px,48vw)] transition-opacity duration-300 ${
          isGridView || activeLitRecord ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="who flex items-center gap-3.5 mb-3">
          <div className="relative group shrink-0">
            <img
              src={founderProfile.avatarUrl}
              alt={founderProfile.name}
              onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
              loading="lazy"
              decoding="async"
              width={52}
              height={52}
              className="bio-avatar w-[52px] h-[52px] rounded-[3px] object-cover grayscale-[0.15] border border-white/20"
            />
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  setEditBioForm(founderProfile);
                  setAdminModalTab('bio');
                  setIsEditBioModalOpen(true);
                }}
                className="absolute inset-0 bg-black/70 rounded-[3px] opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold text-amber-300 transition-opacity cursor-pointer"
              >
                Đổi ảnh
              </button>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
              <b className="font-['Playfair_Display'] text-[18px] text-white font-normal truncate">
                {founderProfile.name}
              </b>
              <AdminVerifiedBadge size={14} />
            </div>
            <p className="text-[11px] text-[#8c8783] font-mono mt-0.5">{founderProfile.role}</p>
          </div>
        </div>
        <p className="bio-p text-[12.5px] leading-[1.62] text-[#f4f2ef]/75 font-light">
          {founderProfile.bio}
        </p>
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => {
              setEditBioForm(founderProfile);
              setAdminModalTab('bio');
              setIsEditBioModalOpen(true);
            }}
            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/45 text-amber-200 text-[11px] font-semibold cursor-pointer transition-colors"
          >
            <Edit3 className="w-3 h-3" />
            <span>Sửa Hồ sơ &amp; Ảnh Founder</span>
          </button>
        )}
      </div>

      {/* Colophon .colophon */}
      <div
        className={`colophon-card colophon chrome fixed right-[var(--pad)] bottom-[var(--pad)] z-40 text-[12.5px] text-[#f4f2ef]/70 flex items-center gap-2 transition-opacity duration-300 ${
          isGridView || activeLitRecord ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <span>{colophonText}</span>
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => {
              setAdminModalTab('scene');
              setIsEditBioModalOpen(true);
            }}
            className="px-2 py-0.5 rounded bg-white/10 hover:bg-amber-500/30 text-[10px] text-amber-300 border border-amber-400/35 cursor-pointer"
          >
            Sửa tiêu đề
          </button>
        )}
      </div>

      {/* Grid Toggle Button button#gridBtn — cleanly stacked above .bio-card */}
      <button
        id="gridBtn"
        className={`gridbtn fixed left-[var(--pad)] bottom-[calc(var(--pad)+210px)] z-40 w-[44px] h-[44px] p-2.5 grid grid-cols-2 gap-1 rounded-lg bg-black/60 border border-white/15 backdrop-blur-md cursor-pointer ${
          isGridView ? 'is-grid' : ''
        }`}
        onClick={() => setIsGridView(!isGridView)}
        aria-label="Toggle grid view"
        title={isGridView ? 'Quay lại quả cầu 3D' : 'Xem dạng lưới phẳng'}
      >
        <b className="h-full w-full" />
        <b className="h-full w-full" />
        <b className="h-full w-full" />
        <b className="h-full w-full" />
      </button>

      {/* Scroll Cue .cue */}
      <div
        className={`cue-card cue chrome fixed left-1/2 bottom-[calc(var(--pad)+6px)] -translate-x-1/2 z-54 flex items-center gap-2.5 text-[10px] uppercase tracking-[0.24em] text-[#f4f2ef]/45 whitespace-nowrap pointer-events-none transition-opacity duration-500 ${
          isGridView || activeLitRecord ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <s className="cue-line w-[44px] h-[1px] bg-[#f4f2ef]/25 overflow-hidden relative block">
          <span />
        </s>
        <span>KÉO ĐỂ XOAY QUẢ CẦU 3D</span>
      </div>

      {/* Super Admin Floating Quick Trigger */}
      {isSuperAdmin && (
        <div className="fixed right-[var(--pad)] bottom-[calc(var(--pad)+36px)] z-56 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditBioForm(founderProfile);
              setAdminModalTab('milestones');
              setIsEditBioModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold shadow-[0_12px_32px_rgba(245,158,11,0.45)] transition-all cursor-pointer"
          >
            <Settings className="w-4 h-4 text-black" />
            <span>Quản Trị Ảnh &amp; Nội Dung Vinh Danh (Admin)</span>
          </button>
        </div>
      )}

      {/* Layer 6: #menu (Full-screen Drawer) */}
      <div
        id="menu"
        className={`fixed inset-0 z-80 bg-[#050505] flex flex-col justify-center items-center transition-all duration-700 ${
          isMenuOpen
            ? 'opacity-100 pointer-events-auto clip-path-open'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <nav className="flex flex-col gap-3 text-center">
          <a
            href="#archive"
            onClick={(e) => {
              e.preventDefault();
              setIsMenuOpen(false);
              setIsGridView(true);
            }}
            className="menu-link font-['Playfair_Display'] text-[clamp(34px,7.6vw,72px)] text-[#f4f2ef]/60 hover:text-white transition-colors"
          >
            The Archive
          </a>
          <a
            href="#memory"
            onClick={(e) => {
              e.preventDefault();
              setIsMenuOpen(false);
              if (onNavigate) {
                onNavigate('memory');
              } else {
                onExit();
              }
            }}
            className="menu-link font-['Playfair_Display'] text-[clamp(34px,7.6vw,72px)] text-[#f4f2ef]/60 hover:text-white transition-colors"
          >
            Miền Ký Ức
          </a>
          <a
            href="#qa"
            onClick={(e) => {
              e.preventDefault();
              setIsMenuOpen(false);
              if (onNavigate) {
                onNavigate('qa');
              } else {
                onExit();
              }
            }}
            className="menu-link font-['Playfair_Display'] text-[clamp(34px,7.6vw,72px)] text-[#f4f2ef]/60 hover:text-white transition-colors"
          >
            F-Forum Q&A
          </a>
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              setIsMenuOpen(false);
              onExit();
            }}
            className="menu-link font-['Playfair_Display'] text-[clamp(34px,7.6vw,72px)] text-amber-400 hover:text-amber-300 transition-colors"
          >
            Quay Lại Trang Chủ
          </a>
        </nav>

        <div className="addr absolute bottom-[var(--pad)] inset-x-[var(--pad)] text-center text-[12.5px] text-[#8c8783] leading-[1.7] font-mono">
          Da Nang · Hanoi · Ho Chi Minh City
        </div>
      </div>

      {/* Layer 7: #lit (FLIP Lightbox) */}
      {activeLitRecord && (
        <div
          id="lit"
          role="dialog"
          aria-modal="true"
          aria-label="Chi tiết vinh danh"
          className="fixed inset-0 z-90 grid place-items-center p-4 sm:p-8 animate-fade-in bg-black/85 backdrop-blur-md"
        >
          {/* Backdrop button */}
          <button
            type="button"
            tabIndex={-1}
            aria-label="Đóng xem chi tiết"
            className="fixed inset-0 bg-transparent border-none outline-none cursor-default"
            onClick={closeLightbox}
          />
          <div
            className="lit-dialog relative z-10 w-full max-w-[min(78vw,920px)] rounded-3xl bg-[#0b111d] border border-white/20 p-5 sm:p-7 shadow-[0_30px_90px_rgba(0,0,0,0.95)]"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/70 border border-white/20 text-white/80 hover:text-white hover:bg-black/90 transition-all cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Photo Container */}
            <div className="relative w-full aspect-[3/2] rounded-2xl overflow-hidden bg-black border border-white/15 shadow-2xl">
              <img
                src={
                  fullImgLoaded
                    ? activeLitRecord.customImgUrl || `${CDN_BASE}${activeLitRecord.imgId}.png`
                    : activeLitRecord.customImgUrl || `${CDN_BASE}${activeLitRecord.imgId}_min.webp`
                }
                alt={activeLitRecord.title}
                onError={(e) => handleImageError(e, DEFAULT_CLUB_COVER)}
                loading="lazy"
                decoding="async"
                width={960}
                height={640}
                className="w-full h-full object-cover"
              />
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => handleOpenEditRecord(activeLitRecord)}
                  className="absolute bottom-3.5 right-3.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-xl cursor-pointer transition-all"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Thay ảnh &amp; Sửa nội dung</span>
                </button>
              )}
            </div>

            {/* Meta Row */}
            <div className="lit-meta grid grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] gap-6 pt-5">
              <div>
                <h2 className="font-['Playfair_Display'] text-xl sm:text-2xl text-white font-normal">
                  {activeLitRecord.title}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-[#8c8783] mt-1 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{activeLitRecord.place}</span>
                </div>

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditRecord(activeLitRecord)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/45 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Sửa cột mốc này</span>
                  </button>
                )}
              </div>

              <div>
                <p className="text-xs sm:text-sm text-[#f4f2ef]/90 leading-relaxed font-light">
                  {activeLitRecord.note}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Layer 8 & 9: #intro & #splash */}
      {!isSplashDone && (
        <div id="splash" className="fixed inset-0 z-[250] bg-black grid place-items-center content-center gap-6">
          <div className="font-['Playfair_Display'] text-[clamp(28px,4.4vw,52px)] tracking-[0.005em] text-[#f4f2ef]">
            BroAmStuck<em className="not-italic font-normal">Studio</em>
          </div>
          <div className="w-[clamp(120px,17vw,210px)] h-[1px] bg-[#f4f2ef]/20 relative overflow-hidden">
            <span className="absolute inset-y-0 left-0 bg-[#f4f2ef] w-full animate-pulse" />
          </div>
          <div className="text-[10px] tracking-[0.26em] uppercase text-[#f4f2ef]/40">
            F-FORUM HALL OF FAME 2026
          </div>
        </div>
      )}

      {isIntroFilmPlaying && (
        <div
          id="intro"
          className={`fixed inset-0 z-[200] bg-black grid place-items-center overflow-hidden transition-opacity duration-700 ${
            isIntroFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <video
            ref={filmVideoRef}
            src={introFilmUrl}
            preload="auto"
            onError={finishIntroFilm}
            onEnded={finishIntroFilm}
            onLoadedMetadata={handleSetVideoSpeed}
            onPlay={handleSetVideoSpeed}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div
            className={`veil absolute inset-0 bg-black pointer-events-none transition-opacity duration-700 ${
              isIntroFading ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <button
            type="button"
            onClick={finishIntroFilm}
            className="absolute right-[calc(var(--pad)+10px)] bottom-[calc(var(--pad)+10px)] z-10 px-5 py-2 rounded-full border border-white/30 bg-black/40 text-white/70 hover:text-white hover:border-white text-xs tracking-widest uppercase backdrop-blur-md cursor-pointer transition-all"
          >
            Skip
          </button>
        </div>
      )}

      {/* Layer 10: #dot custom cursor placeholder (managed by GlobalCursor) */}
      <div
        id="dot"
        ref={dotRef}
        className="hidden"
      />

      {/* Admin Edit Record Modal — Rộng rãi, rõ ràng, xem trước ảnh trực tiếp */}
      {isEditRecordModalOpen && editingRecord && isSuperAdmin && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md">
          <form
            onSubmit={handleSaveRecord}
            className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#0b111e] border border-amber-400/45 p-6 sm:p-8 space-y-5 shadow-[0_30px_90px_rgba(0,0,0,0.95)]"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-white">Chỉnh Sửa Cột Mốc &amp; Thay Thế Hình Ảnh</h3>
                <p className="text-xs text-slate-400 mt-0.5">Thay đổi được lưu trực tiếp lên máy chủ và đồng bộ cho toàn bộ thành viên</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditRecordModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Khung xem trước ảnh trực quan */}
            <div className="rounded-2xl bg-[#070b13] border border-white/15 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-amber-300">Hình ảnh cột mốc hiện tại</span>
                {editingRecord.customImgUrl && (
                  <button
                    type="button"
                    onClick={() => setEditingRecord({ ...editingRecord, customImgUrl: undefined })}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Khôi phục ảnh gốc</span>
                  </button>
                )}
              </div>
              <div className="relative w-full aspect-[16/9] max-h-56 rounded-xl overflow-hidden bg-black border border-white/10">
                <img
                  src={editingRecord.customImgUrl || `${CDN_BASE}${editingRecord.imgId}.png`}
                  alt={editingRecord.title}
                  onError={(e) => handleImageError(e, DEFAULT_CLUB_COVER)}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input
                  id="anh-dan-url-hoac-tai-tep"
                  type="text"
                  placeholder="Dán đường dẫn ảnh (https://... hoặc /uploads/...)"
                  maxLength={500}
                  value={editingRecord.customImgUrl || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, customImgUrl: e.target.value })}
                  className="flex-1 bg-[#0b111e] border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-md"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isUploadingMedia ? 'Đang tải...' : 'Tải ảnh từ máy'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  maxLength={200}
                  onChange={(e) => handleFileUpload(e, 'record')}
                  className="hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tieu-de-cot-moc" className="text-xs sm:text-sm font-bold text-slate-200 block mb-1.5">Tiêu đề cột mốc (*)</label>
                <input
                  id="tieu-de-cot-moc"
                  type="text"
                  required
                  maxLength={100}
                  value={editingRecord.title}
                  onChange={(e) => setEditingRecord({ ...editingRecord, title: e.target.value })}
                  className="w-full bg-[#070b13] border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label htmlFor="dia-diem-danh-muc" className="text-xs sm:text-sm font-bold text-slate-200 block mb-1.5">Địa điểm / Danh mục (*)</label>
                <input
                  id="dia-diem-danh-muc"
                  type="text"
                  required
                  maxLength={80}
                  value={editingRecord.place}
                  onChange={(e) => setEditingRecord({ ...editingRecord, place: e.target.value })}
                  className="w-full bg-[#070b13] border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="noi-dung-ghi-chu" className="text-xs sm:text-sm font-bold text-slate-200 block mb-1.5">Nội dung mô tả chi tiết (*)</label>
              <textarea
                id="noi-dung-ghi-chu"
                required
                rows={4}
                maxLength={400}
                value={editingRecord.note}
                onChange={(e) => setEditingRecord({ ...editingRecord, note: e.target.value })}
                className="w-full bg-[#070b13] border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 leading-relaxed resize-y"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <label htmlFor="field" className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200 font-semibold cursor-pointer">
                <input
                  id="field"
                  type="checkbox"
                  maxLength={10}
                  checked={Boolean(editingRecord.isTall)}
                  onChange={(e) => setEditingRecord({ ...editingRecord, isTall: e.target.checked })}
                  className="w-4 h-4 rounded accent-amber-500"
                />
                <span>Hiển thị khung ảnh dọc (Tall Portrait)</span>
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditRecordModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm font-bold text-slate-300 hover:text-white cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 text-black font-extrabold text-xs sm:text-sm hover:bg-amber-400 transition-colors shadow-lg cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Admin Edit Bio, 21 Milestones & Scene Studio Modal */}
      {isEditBioModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#0b111e] border border-amber-400/45 p-6 sm:p-8 space-y-5 shadow-[0_30px_90px_rgba(0,0,0,0.95)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white">Quản Trị Khu Vinh Danh Toàn Diện</h3>
                <p className="text-xs text-slate-400 mt-0.5">Thay thế hình ảnh, hồ sơ Founder, 21 cột mốc và tiêu đề 3D ở mọi nơi</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditBioModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab switchers: Founder Bio | 21 Milestones | Scene & Headlines */}
            <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-[#070b13] border border-white/10">
              <button
                type="button"
                onClick={() => setAdminModalTab('bio')}
                className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  adminModalTab === 'bio'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                1. Hồ sơ Founder &amp; Ảnh
              </button>
              <button
                type="button"
                onClick={() => setAdminModalTab('milestones')}
                className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  adminModalTab === 'milestones'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                2. Cột mốc Vinh danh (21)
              </button>
              <button
                type="button"
                onClick={() => setAdminModalTab('scene')}
                className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  adminModalTab === 'scene'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                3. Tiêu đề 3D &amp; Giao diện
              </button>
            </div>

            {adminModalTab === 'bio' ? (
              <form onSubmit={handleSaveBio} className="space-y-4">
                <div className="rounded-2xl bg-[#070b13] border border-white/15 p-4 flex flex-col sm:flex-row items-center gap-4">
                  <img
                    src={editBioForm.avatarUrl}
                    alt={editBioForm.name}
                    onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                    loading="lazy"
                    decoding="async"
                    className="w-20 h-20 rounded-2xl object-cover border border-amber-400/50 shrink-0"
                  />
                  <div className="flex-1 w-full space-y-2">
                    <label htmlFor="anh-dai-dien-url-hoac-tai-tep" className="text-xs sm:text-sm font-bold text-amber-300 block">
                      Ảnh đại diện Founder (Dán URL hoặc tải ảnh từ máy)
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        id="anh-dai-dien-url-hoac-tai-tep"
                        type="text"
                        maxLength={500}
                        value={editBioForm.avatarUrl}
                        onChange={(e) => setEditBioForm({ ...editBioForm, avatarUrl: e.target.value })}
                        className="flex-1 bg-[#0b111e] border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                      />
                      <label htmlFor="field-2" className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                        <Upload className="w-4 h-4" />
                        <span>{isUploadingMedia ? 'Đang tải...' : 'Tải ảnh'}</span>
                        <input
                          id="field-2"
                          type="file"
                          accept="image/*"
                          maxLength={200}
                          onChange={(e) => handleFileUpload(e, 'avatar')}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ho-va-ten" className="text-xs sm:text-sm font-bold text-slate-200 block mb-1.5">Họ và tên (*)</label>
                    <input
                      id="ho-va-ten"
                      type="text"
                      required
                      maxLength={80}
                      value={editBioForm.name}
                      onChange={(e) => setEditBioForm({ ...editBioForm, name: e.target.value })}
                      className="w-full bg-[#070b13] border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label htmlFor="chuc-danh-vai-tro" className="text-xs sm:text-sm font-bold text-slate-200 block mb-1.5">Chức danh / Vai trò (*)</label>
                    <input
                      id="chuc-danh-vai-tro"
                      type="text"
                      required
                      maxLength={100}
                      value={editBioForm.role}
                      onChange={(e) => setEditBioForm({ ...editBioForm, role: e.target.value })}
                      className="w-full bg-[#070b13] border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="loi-ngo-tieu-su" className="text-xs sm:text-sm font-bold text-slate-200 block mb-1.5">Lời ngỏ / Tiểu sử (*)</label>
                  <textarea
                    id="loi-ngo-tieu-su"
                    required
                    rows={4}
                    maxLength={400}
                    value={editBioForm.bio}
                    onChange={(e) => setEditBioForm({ ...editBioForm, bio: e.target.value })}
                    className="w-full bg-[#070b13] border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 leading-relaxed resize-y"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsEditBioModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm font-bold text-slate-300 hover:text-white cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-amber-500 text-black font-extrabold text-xs sm:text-sm hover:bg-amber-400 transition-colors shadow-lg cursor-pointer"
                  >
                    Lưu hồ sơ Founder
                  </button>
                </div>
              </form>
            ) : adminModalTab === 'milestones' ? (
              <div className="space-y-4">
                {/* Lưới chọn nhanh 21 cột mốc bằng ảnh thu nhỏ */}
                <div>
                  <label className="text-xs sm:text-sm font-bold text-slate-200 block mb-2">
                    Chọn cột mốc cần thay ảnh / sửa nội dung ({adminSelectedMilestoneIdx + 1}/21):
                  </label>
                  <div className="grid grid-cols-7 gap-1.5 p-2 rounded-2xl bg-[#070b13] border border-white/10 max-h-36 overflow-y-auto">
                    {records.map((r, i) => {
                      const active = i === adminSelectedMilestoneIdx;
                      const thumb = r.customImgUrl || `${CDN_BASE}${r.imgId}_min.webp`;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setAdminSelectedMilestoneIdx(i)}
                          className={`relative aspect-[4/3] rounded-lg overflow-hidden border transition-all cursor-pointer ${
                            active ? 'border-amber-400 ring-2 ring-amber-400/60 scale-[1.03]' : 'border-white/15 opacity-70 hover:opacity-100'
                          }`}
                          title={`#${i + 1}: ${r.title}`}
                        >
                          <img
                            src={thumb}
                            alt={r.title}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => handleImageError(e, DEFAULT_CLUB_COVER)}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-0.5 right-1 px-1 rounded bg-black/80 text-[9px] font-mono text-white">
                            {i + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Khung xem trước & thay thế ảnh cột mốc đang chọn */}
                {records[adminSelectedMilestoneIdx] && (
                  <div className="rounded-2xl bg-[#070b13] border border-white/15 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-bold text-amber-300">
                        Ảnh Cột mốc #{adminSelectedMilestoneIdx + 1}: {records[adminSelectedMilestoneIdx].title}
                      </span>
                      {records[adminSelectedMilestoneIdx].customImgUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setRecords((prev) =>
                              prev.map((r, i) =>
                                i === adminSelectedMilestoneIdx ? { ...r, customImgUrl: undefined } : r,
                              ),
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Khôi phục ảnh gốc</span>
                        </button>
                      )}
                    </div>
                    <div className="relative w-full aspect-[16/9] max-h-48 rounded-xl overflow-hidden bg-black border border-white/10">
                      <img
                        src={
                          records[adminSelectedMilestoneIdx].customImgUrl ||
                          `${CDN_BASE}${records[adminSelectedMilestoneIdx].imgId}.png`
                        }
                        alt={records[adminSelectedMilestoneIdx].title}
                        onError={(e) => handleImageError(e, DEFAULT_CLUB_COVER)}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        maxLength={500}
                        placeholder="Dán URL ảnh mới (https://... hoặc /uploads/...)"
                        value={records[adminSelectedMilestoneIdx]?.customImgUrl || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRecords((prev) =>
                            prev.map((r, i) =>
                              i === adminSelectedMilestoneIdx ? { ...r, customImgUrl: val } : r,
                            ),
                          );
                        }}
                        className="flex-1 bg-[#0b111e] border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => milestoneFileInputRef.current?.click()}
                        className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{isUploadingMedia ? 'Đang tải...' : 'Tải ảnh từ máy'}</span>
                      </button>
                      <input
                        ref={milestoneFileInputRef}
                        type="file"
                        accept="image/*"
                        maxLength={200}
                        onChange={(e) => handleFileUpload(e, 'milestone-tab')}
                        className="hidden"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="tieu-de-cot-moc-2" className="text-xs sm:text-sm font-bold text-slate-200 block mb-1.5">Tiêu đề cột mốc (*)</label>
                    <input
                      id="tieu-de-cot-moc-2"
                      type="text"
                      required
                      maxLength={100}
                      value={records[adminSelectedMilestoneIdx]?.title || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRecords((prev) =>
                          prev.map((r, i) => (i === adminSelectedMilestoneIdx ? { ...r, title: val } : r))
                        );
                      }}
                      className="w-full bg-[#070b13] border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label htmlFor="dia-diem-danh-muc-2" className="text-xs sm:text-sm font-bold text-slate-200 block mb-1.5">Địa điểm / Danh mục (*)</label>
                    <input
                      id="dia-diem-danh-muc-2"
                      type="text"
                      required
                      maxLength={80}
                      value={records[adminSelectedMilestoneIdx]?.place || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRecords((prev) =>
                          prev.map((r, i) => (i === adminSelectedMilestoneIdx ? { ...r, place: val } : r))
                        );
                      }}
                      className="w-full bg-[#070b13] border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="noi-dung-ghi-chu-2" className="text-xs sm:text-sm font-bold text-slate-200 block mb-1.5">Nội dung ghi chú (*)</label>
                  <textarea
                    id="noi-dung-ghi-chu-2"
                    required
                    rows={3}
                    maxLength={400}
                    value={records[adminSelectedMilestoneIdx]?.note || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRecords((prev) =>
                        prev.map((r, i) => (i === adminSelectedMilestoneIdx ? { ...r, note: val } : r))
                      );
                    }}
                    className="w-full bg-[#070b13] border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 leading-relaxed resize-y"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <label className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      maxLength={10}
                      checked={Boolean(records[adminSelectedMilestoneIdx]?.isTall)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setRecords((prev) =>
                          prev.map((r, i) =>
                            i === adminSelectedMilestoneIdx ? { ...r, isTall: checked } : r,
                          ),
                        );
                      }}
                      className="w-4 h-4 rounded accent-amber-500"
                    />
                    <span>Hiển thị khung ảnh dọc (Tall Portrait)</span>
                  </label>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditBioModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm font-bold text-slate-300 hover:text-white cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        safeStorage.setItem('fforum_vinhdanh_records', JSON.stringify(records));
                        syncToServer(founderProfile, records);
                        setIsEditBioModalOpen(false);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-amber-500 text-black font-extrabold text-xs sm:text-sm hover:bg-amber-400 transition-colors shadow-lg cursor-pointer"
                    >
                      Lưu ghi chú cột mốc
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs sm:text-sm font-bold text-slate-200 block mb-2">
                    5 Cụm từ Tiêu đề Trung tâm Quả cầu 3D (#headline):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {headlineWords.map((word, idx) => (
                      <input
                        key={idx}
                        type="text"
                        maxLength={40}
                        value={word}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHeadlineWords((prev) => prev.map((w, i) => (i === idx ? val : w)));
                        }}
                        className="bg-[#070b13] border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white text-center focus:outline-none focus:border-amber-400"
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs sm:text-sm font-bold text-slate-200 block mb-1.5">
                    Dòng chữ Chân trang góc phải (Colophon):
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={colophonText}
                    onChange={(e) => setColophonText(e.target.value)}
                    className="w-full bg-[#070b13] border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs sm:text-sm font-bold text-slate-200 block mb-1.5">
                    Đường dẫn Video Mở đầu (Intro Film URL):
                  </label>
                  <input
                    type="text"
                    maxLength={500}
                    value={introFilmUrl}
                    onChange={(e) => setIntroFilmUrl(e.target.value)}
                    className="w-full bg-[#070b13] border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setHeadlineWords(DEFAULT_HEADLINE_WORDS);
                      setColophonText(DEFAULT_COLOPHON);
                      setIntroFilmUrl(INTRO_FILM_URL);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Khôi phục mặc định</span>
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditBioModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm font-bold text-slate-300 hover:text-white cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        syncToServer(founderProfile, records, {
                          headlineWords,
                          colophon: colophonText,
                          introFilmUrl,
                        });
                        setIsEditBioModalOpen(false);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-amber-500 text-black font-extrabold text-xs sm:text-sm hover:bg-amber-400 transition-colors shadow-lg cursor-pointer"
                    >
                      Lưu Tiêu đề &amp; Giao diện
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KhuVinhDanhView;
