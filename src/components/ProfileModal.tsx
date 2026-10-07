/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Upload,
  Check,
  AlertCircle,
  BarChart3,
  ShoppingBag,
  Coins,
  CheckCircle2,
  HelpCircle,
  Award,
  Flag,
  Share2,
  Shield,
  Sparkles,
  Heart,
  Star,
  Users,
  UserCheck,
  Crown,
  Trophy,
  GraduationCap,
  Rocket,
  Sprout,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import type { User, Question, Solution, ShopItem, ShopTierColor } from '../types';
import { TierBadge, AdminVerifiedBadge } from './Badges10Tier';
import { getTierForLevel } from '../utils/tier';
import { HologramStudentCard } from './HologramStudentCard';
import { DEFAULT_AVATAR, handleImageError } from '../utils/mediaFallback';
import { SHOP_ITEMS, getTierColorStyles } from '../utils/shopData';
import { ShopItemSvg } from './ShopItemSvg';
import { pushNotification } from '../utils/notifications';
import { LikeHeartButton } from './LikeHeartButton';
import { safeStorage } from '../utils/storage';
import {
  PROFILE_LIKES_KEY,
  isProfileLikedBy,
  parseProfileLikes,
  profileLikeCount,
  profileLikersOf,
  serializeProfileLikes,
  setProfileLike,
  type ProfileLikesMap,
} from '../utils/profileLikes';

/* Đọc/ghi lượt thả tim qua safeStorage — mọi phép tính nằm ở utils/profileLikes */
const readProfileLikes = (): ProfileLikesMap =>
  parseProfileLikes(safeStorage.getItem(PROFILE_LIKES_KEY));
const writeProfileLikes = (map: ProfileLikesMap): void => {
  try {
    safeStorage.setItem(PROFILE_LIKES_KEY, serializeProfileLikes(map));
  } catch {
    /* bỏ qua khi trình duyệt chặn ghi */
  }
};
import { BookshelfPanel } from './BookshelfPanel';
import { TierRankSheet } from './TierRankSheet';
import { useEscapeKey } from '../utils/useEscapeKey';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  viewerUser?: User | null;
  onSaveProfile: (updates: Partial<User>) => void;
  onPurchaseItem: (itemId: string) => Promise<boolean>;
  onEquipItem: (itemId: string) => Promise<boolean>;
  initialTab?: 'overview' | 'card' | 'stats' | 'shop' | 'activity' | 'edit';
  questions?: Question[];
  solutions?: Solution[];
}

type TabType = 'overview' | 'card' | 'stats' | 'shop' | 'activity' | 'edit';

interface SystemBadge {
  id: string;
  name: string;
  desc: string;
  IconComponent: React.ComponentType<{ className?: string }>;
  requirement: string;
  isEarned: (level: number, solutions: number, best: number) => boolean;
  /** Tiến độ mở khoá: hiện `current/target` cho người chưa đạt. */
  progress: (level: number, solutions: number, best: number) => {
    current: number;
    target: number;
    unit: string;
  };
  color: string;
}

const ALL_SYSTEM_BADGES: SystemBadge[] = [
  {
    id: 'b-active',
    name: 'Tích Cực',
    desc: 'Gửi 3 câu trả lời đầu tiên',
    requirement: 'Trả lời 3 câu hỏi',
    IconComponent: Sprout,
    isEarned: (_l, s) => s >= 3,
    progress: (_l, s) => ({ current: s, target: 3, unit: 'lời giải' }),
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
  {
    id: 'b-pioneer',
    name: 'Tiên Phong',
    desc: 'Đạt cấp độ 5',
    requirement: 'Đạt Level 5',
    IconComponent: Rocket,
    isEarned: (l) => l >= 5,
    progress: (l) => ({ current: l, target: 5, unit: 'cấp' }),
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  },
  {
    id: 'b-mentor',
    name: 'Cố Vấn Tri Thức',
    desc: 'Có 5 đáp án chuẩn được xác nhận',
    requirement: '5 đáp án chuẩn',
    IconComponent: GraduationCap,
    isEarned: (_l, _s, best) => best >= 5,
    progress: (_l, _s, best) => ({ current: best, target: 5, unit: 'đáp án chuẩn' }),
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  {
    id: 'b-scholar',
    name: 'Học Bá F-Forum',
    desc: 'Đạt cấp độ 20',
    requirement: 'Đạt Level 20',
    IconComponent: Star,
    isEarned: (l) => l >= 20,
    progress: (l) => ({ current: l, target: 20, unit: 'cấp' }),
    color: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30',
  },
  {
    id: 'b-ambassador',
    name: 'Đại Sứ Tri Thức',
    desc: 'Đạt cấp độ 35',
    requirement: 'Đạt Level 35',
    IconComponent: Award,
    isEarned: (l) => l >= 35,
    progress: (l) => ({ current: l, target: 35, unit: 'cấp' }),
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  },
  {
    id: 'b-genius',
    name: 'Thần Đồng FPT',
    desc: 'Đạt cấp độ 50',
    requirement: 'Đạt Level 50',
    IconComponent: Crown,
    isEarned: (l) => l >= 50,
    progress: (l) => ({ current: l, target: 50, unit: 'cấp' }),
    color: 'text-amber-300 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-400/40',
  },
];

/* Tim hồ sơ: lưu theo từng hồ sơ + người thả tim để mở lại vẫn đúng 1 tim */
const PROFILE_BANNER_GRADIENTS = [
  {
    id: 'aurora-gold',
    label: 'Hổ Phách',
    css: 'linear-gradient(120deg, rgba(245,158,11,0.38), rgba(167,139,250,0.28), rgba(34,211,238,0.32))',
    swatch: '#f59e0b',
  },
  {
    id: 'ocean-cyan',
    label: 'Băng Lam',
    css: 'linear-gradient(120deg, rgba(6,182,212,0.42), rgba(59,130,246,0.35), rgba(16,185,129,0.28))',
    swatch: '#06b6d4',
  },
  {
    id: 'crimson-rose',
    label: 'Hồng Ngọc',
    css: 'linear-gradient(120deg, rgba(244,63,94,0.42), rgba(249,115,22,0.32), rgba(168,85,247,0.3))',
    swatch: '#f43f5e',
  },
  {
    id: 'emerald-jade',
    label: 'Ngọc Lục',
    css: 'linear-gradient(120deg, rgba(16,185,129,0.42), rgba(20,184,166,0.35), rgba(234,179,8,0.25))',
    swatch: '#10b981',
  },
  {
    id: 'nebula-violet',
    label: 'Tinh Vân',
    css: 'linear-gradient(120deg, rgba(139,92,246,0.45), rgba(236,72,153,0.35), rgba(56,189,248,0.3))',
    swatch: '#8b5cf6',
  },
  {
    id: 'midnight-gold',
    label: 'Hoàng Kim',
    css: 'linear-gradient(120deg, rgba(234,179,8,0.45), rgba(217,119,6,0.35), rgba(15,23,42,0.85))',
    swatch: '#eab308',
  },
];

function formatAccountJoinedInfo(joinedAt?: string): { joinedDateStr: string; ageStr: string } {
  const now = new Date();
  if (!joinedAt) {
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return { joinedDateStr: `${d}/${m}/${y}`, ageStr: 'Mới tham gia' };
  }

  let parsed: Date | null = null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(joinedAt.trim())) {
    const [dd, mm, yyyy] = joinedAt.trim().split('/').map(Number);
    parsed = new Date(yyyy, mm - 1, dd);
  } else {
    const candidate = new Date(joinedAt);
    if (!Number.isNaN(candidate.getTime())) {
      parsed = candidate;
    }
  }

  if (!parsed) {
    return { joinedDateStr: joinedAt, ageStr: 'Mới tham gia' };
  }

  const d = String(parsed.getDate()).padStart(2, '0');
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const y = parsed.getFullYear();
  const joinedDateStr = `${d}/${m}/${y}`;

  const diffMs = Math.max(0, now.getTime() - parsed.getTime());
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let ageStr = 'Mới tham gia';
  if (diffDays >= 365) {
    ageStr = `${Math.floor(diffDays / 365)} năm`;
  } else if (diffDays >= 30) {
    ageStr = `${Math.floor(diffDays / 30)} tháng`;
  } else if (diffDays >= 1) {
    ageStr = `${diffDays} ngày`;
  }

  return { joinedDateStr, ageStr };
}

const ProfileModalInner: React.FC<{
  currentUser: User;
  viewerUser?: User | null;
  onClose: () => void;
  onSaveProfile: (updates: Partial<User>) => void;
  onPurchaseItem: (itemId: string) => Promise<boolean>;
  onEquipItem: (itemId: string) => Promise<boolean>;
  initialTab?: TabType;
  questions?: Question[];
  solutions?: Solution[];
}> = ({
  currentUser,
  viewerUser,
  onClose,
  onSaveProfile,
  onPurchaseItem,
  onEquipItem,
  initialTab = 'overview',
  questions = [],
  solutions = [],
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  /* Hộp thoại này khai báo aria-modal="true" nhưng trước đây không có đường
     thoát bằng phím: screen reader coi phần còn lại của trang là không tồn tại,
     nên người dùng bàn phím bị kẹt trong hộp thoại. */
  useEscapeKey(onClose);

  const [shopFilter, setShopFilter] = useState<'all' | ShopTierColor>('all');
  const [activitySubTab, setActivitySubTab] = useState<'questions' | 'solutions'>('solutions');
  const [selectedStatNote, setSelectedStatNote] = useState<string | null>(null);

  const [name, setName] = useState(currentUser.name);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [bannerUrl, setBannerUrl] = useState(currentUser.bannerUrl || '');
  const [profileGradient, setProfileGradient] = useState(
    currentUser.profileGradient || PROFILE_BANNER_GRADIENTS[0].css
  );
  const [bio, setBio] = useState(currentUser.bio || '');
  const [gender, setGender] = useState(currentUser.gender || 'Nam');
  const [city, setCity] = useState(currentUser.city || '');
  const [className, setClassName] = useState(currentUser.className || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /* Brief shimmer skeleton so the profile feels loaded, not popped */
  const [isBooting, setIsBooting] = useState(true);

  /* Đổi sang hồ sơ khác thì chạy lại skeleton. Phần "bật skeleton" được suy ra
     lúc render (mẫu điều chỉnh state khi prop đổi); effect chỉ giữ phần hẹn giờ. */
  const [bootingForId, setBootingForId] = useState(currentUser.id);
  if (bootingForId !== currentUser.id) {
    setBootingForId(currentUser.id);
    setIsBooting(true);
  }

  useEffect(() => {
    if (!isBooting) return undefined;
    const t = setTimeout(() => setIsBooting(false), 420);
    return () => clearTimeout(t);
  }, [isBooting, currentUser.id]);

  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState('Nội dung vi phạm / Gây war / Không đúng chuẩn mực');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  const isSuperAdmin = currentUser.email === 'anhtuantran0512@gmail.com';
  const isOwnProfile = !viewerUser || viewerUser.id === currentUser.id;

  /* GUI nhỏ "Bảng rank · danh hiệu · yêu cầu" mở từ khối Danh hiệu */
  const [isRankSheetOpen, setIsRankSheetOpen] = useState(false);

  /* Tim hồ sơ — MỘT nguồn sự thật: likesMap. Nút tim chỉ hiển thị số cha tính
     ra, không tự cộng trừ, nên một lần bấm luôn đúng ±1 (không thể nhân đôi). */
  const [likesMap, setLikesMap] = useState<ProfileLikesMap>(() => readProfileLikes());
  const profileKey = currentUser.email.toLowerCase();
  const viewerKey = (viewerUser?.email || viewerUser?.id || '').toLowerCase();
  const profileLikers = profileLikersOf(likesMap, profileKey);
  const likedByMe = isProfileLikedBy(likesMap, profileKey, viewerKey);

  const handleProfileLike = (next: boolean) => {
    if (!viewerKey) return;
    const already = isProfileLikedBy(likesMap, profileKey, viewerKey);
    if (already === next) return; /* bấm lặp / sự kiện trùng → không làm gì */
    setLikesMap((prev) => {
      const nextMap = setProfileLike(prev, profileKey, viewerKey, next);
      writeProfileLikes(nextMap);
      return nextMap;
    });
    if (next) {
      pushNotification({
        type: 'system',
        category: 'system',
        title: 'Đã Thả Tim Hồ Sơ!',
        body: `Bạn đã thả tim cho ${currentUser.name}.`,
        targetView: 'home',
      });
    }
  };
  const tier = getTierForLevel(currentUser.level);

  const userCoin = currentUser.coin ?? 0;
  const userInventory = useMemo(
    () => currentUser.inventory || [],
    [currentUser.inventory]
  );

  const userQuestions = useMemo(
    () => questions.filter((q) => q.authorId === currentUser.id),
    [questions, currentUser.id]
  );
  const userSolutions = useMemo(
    () => solutions.filter((s) => s.authorId === currentUser.id),
    [solutions, currentUser.id]
  );

  /* Per-subject real solution counts (0 when user hasn't answered any) */
  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    userSolutions.forEach((s) => {
      const q = questions.find((qq) => qq.id === s.questionId);
      const subj = q?.subject || 'khac';
      counts[subj] = (counts[subj] || 0) + 1;
    });
    return counts;
  }, [userSolutions, questions]);

  const accountJoinedInfo = useMemo(
    () => formatAccountJoinedInfo(currentUser.joinedAt),
    [currentUser.joinedAt]
  );

  const statsMetrics = useMemo(() => {
    /* Toàn bộ chỉ số tính từ hoạt động thật — không có số ảo. */
    const thanks =
      currentUser.stats?.thanksCount ??
      userSolutions.reduce((acc, s) => acc + (s.upvotes || 0), 0);
    const bestSolutions =
      currentUser.stats?.bestCount ?? userSolutions.filter((s) => s.isBest).length;
    const fiveStar =
      currentUser.stats?.fiveStarCount ??
      userSolutions.filter(
        (s) => (s.fiveStarCount && s.fiveStarCount > 0) || (s.upvotes || 0) >= 5 || s.isBest
      ).length;
    const verified =
      currentUser.stats?.verifiedCount ??
      bestSolutions + (currentUser.role === 'SUPER_ADMIN' ? 1 : 0);
    const helped = currentUser.stats?.helpedCount ?? userSolutions.length;

    return {
      xp: currentUser.xp || 0,
      coin: userCoin,
      thanks,
      bestSolutions,
      fiveStar,
      verified,
      helped,
      answersCount: userSolutions.length,
    };
  }, [currentUser, userSolutions, userCoin]);

  /* Số trên nút tim = cảm ơn thật + số người đã thả tim (mỗi người một lần) */
  const profileHeartCount = profileLikeCount(statsMetrics.thanks, profileLikers);

  const radarAxes = useMemo(() => {
    /* Radar tính theo môn học người dùng thật sự tham gia (câu hỏi + lời giải). */
    const SUBJECT_GROUPS: Record<string, string[]> = {
      KHTN: ['toan', 'ly', 'hoa', 'sinh'],
      KHXH: ['van', 'su', 'dia', 'gdcd'],
      'Ngoại Ngữ': ['anh'],
      'Nghệ Thuật': ['tamsu', 'share', 'kinhnghiem', 'tamly'],
      KHCN: ['tin', 'congnghe', 'hotro'],
    };

    const counts: Record<string, number> = {};
    const countByGroup = (subject: string, weight: number) => {
      for (const [group, subjects] of Object.entries(SUBJECT_GROUPS)) {
        if (subjects.includes(subject)) {
          counts[group] = (counts[group] || 0) + weight;
          return;
        }
      }
    };
    userQuestions.forEach((q) => countByGroup(q.subject, 1));
    userSolutions.forEach((s) => {
      const q = questions.find((qq) => qq.id === s.questionId);
      if (q) countByGroup(q.subject, s.isBest ? 3 : 1.5);
    });

    const max = Math.max(1, ...Object.values(counts));
    const scale = (v: number) => Math.round((v / max) * 100);

    const order = ['KHTN', 'KHXH', 'Ngoại Ngữ', 'Nghệ Thuật', 'KHCN'];
    return order.map((name, i) => ({
      name,
      full:
        name === 'KHTN'
          ? 'Khoa Học Tự Nhiên'
          : name === 'KHXH'
          ? 'Khoa Học Xã Hội'
          : name === 'KHCN'
          ? 'Khoa Học Công Nghệ'
          : name === 'Ngoại Ngữ'
          ? 'Ngoại Ngữ & Ngôn Ngữ'
          : 'Nghệ Thuật & Đời Sống',
      angle: -Math.PI / 2 + (i * 2 * Math.PI) / 5,
      score: scale(counts[name] || 0),
      rawCount: Math.round(counts[name] || 0),
    }));
  }, [userQuestions, userSolutions, questions]);

  const radarCx = 140;
  const radarCy = 135;
  const radarRadius = 80;

  const dataPolygonPoints = radarAxes
    .map((a) => {
      const r = (a.score / 100) * radarRadius;
      const x = radarCx + r * Math.cos(a.angle);
      const y = radarCy + r * Math.sin(a.angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const gridRings = [0.25, 0.5, 0.75, 1.0].map((level) => {
    const points = radarAxes
      .map((a) => {
        const x = radarCx + level * radarRadius * Math.cos(a.angle);
        const y = radarCy + level * radarRadius * Math.sin(a.angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    return { level, points };
  });

  const handleBuyItem = async (item: ShopItem) => {
    if (userCoin < item.price) return;
    if (!(await onPurchaseItem(item.id))) return;
    pushNotification({
      type: 'coin',
      category: 'system',
      title: 'Mua Vật Phẩm Thành Công!',
      body: `Đã mở khóa "${item.name}" với giá ${item.price} Coin từ Chill Box.`,
      targetView: 'home',
    });
  };

  const handleEquipItem = async (itemId: string) => {
    const isCurrentlyEquipped = currentUser.equippedBadge === itemId;
    const nextBadge = isCurrentlyEquipped ? '' : itemId;
    if (!(await onEquipItem(nextBadge))) return;
    const it = SHOP_ITEMS.find((s) => s.id === itemId);
    pushNotification({
      type: 'system',
      category: 'system',
      title: isCurrentlyEquipped ? 'Đã Gỡ Trang Bị' : 'Đã Trang Bị Thành Công!',
      body: isCurrentlyEquipped
        ? `Đã cất "${it?.name || itemId}" vào túi Chill Box.`
        : `Đã gắn "${it?.name || itemId}" làm biểu tượng trang bị.`,
      targetView: 'home',
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chỉ chọn tệp hình ảnh (PNG, JPG, WebP, GIF)!');
      e.target.value = '';
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMsg(
        `Kích thước ảnh đại diện (${(file.size / (1024 * 1024)).toFixed(2)}MB) vượt quá 5MB cho phép!`
      );
      e.target.value = '';
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      if (typeof uploadEvent.target?.result === 'string') {
        setAvatar(uploadEvent.target.result);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Đã xảy ra lỗi khi đọc tệp ảnh. Vui lòng thử lại!');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  /* 15MB Profile Banner Upload Handler */
  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chỉ chọn tệp hình ảnh cho ảnh bìa (PNG, JPG, WebP, GIF)!');
      e.target.value = '';
      return;
    }

    const maxSize = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSize) {
      setErrorMsg(
        `Kích thước ảnh bìa (${(file.size / (1024 * 1024)).toFixed(2)}MB) vượt quá giới hạn 15MB!`
      );
      e.target.value = '';
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      if (typeof uploadEvent.target?.result === 'string') {
        setBannerUrl(uploadEvent.target.result);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Không thể đọc tệp ảnh bìa. Vui lòng thử lại!');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!name.trim()) {
      setErrorMsg('Tên hiển thị không được để trống!');
      return;
    }

    setIsSaving(true);
    onSaveProfile({
      name: name.trim().slice(0, 50),
      avatar,
      bannerUrl,
      profileGradient,
      bio: bio.trim().slice(0, 100),
      gender,
      city: city.trim().slice(0, 50),
      className: className.trim().slice(0, 50),
    });

    setTimeout(() => {
      setIsSaving(false);
      setActiveTab('overview');
    }, 200);
  };

  const handleReportUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingReport) return;
    setIsSubmittingReport(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: viewerUser?.id || 'guest',
          reporterName: viewerUser?.name || 'Thành viên F-Forum',
          reporterEmail: viewerUser?.email || '',
          reportedUserId: currentUser.id,
          reportedUserName: currentUser.name,
          reason: reportReason,
          details: reportDetails.trim(),
        }),
      });
      const data = await res.json();
      setReportSuccess(data.message || 'Đã gửi tố cáo tài khoản tới Ban Quản Trị.');
      pushNotification({
        type: 'system',
        category: 'system',
        title: 'Đã Tiếp Nhận Báo Cáo',
        body: `Báo cáo về "${currentUser.name}" đã được chuyển tới Ban Quản Trị để xử lý.`,
        targetView: 'home',
      });
    } catch {
      setReportSuccess('Đã tiếp nhận tố cáo của bạn và chuyển tới Ban Quản Trị.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const filteredShopItems = useMemo(() => {
    if (shopFilter === 'all') return SHOP_ITEMS;
    return SHOP_ITEMS.filter((it) => it.tierColor === shopFilter);
  }, [shopFilter]);

  const effectiveBannerUrl = currentUser.bannerUrl || bannerUrl;
  const effectiveBannerGradient =
    currentUser.profileGradient || profileGradient || PROFILE_BANNER_GRADIENTS[0].css;

  const earnedBadgesList = useMemo(
    () =>
      ALL_SYSTEM_BADGES.filter((b) =>
        b.isEarned(
          currentUser.level,
          userSolutions.length,
          userSolutions.filter((s) => s.isBest).length
        )
      ),
    [currentUser.level, userSolutions]
  );

  /* Danh hiệu gửi sang GUI nhỏ: kèm trạng thái mở khoá + tiến độ yêu cầu */
  const sheetBadges = useMemo(() => {
    const solutionCount = userSolutions.length;
    const bestCount = userSolutions.filter((s) => s.isBest).length;
    return ALL_SYSTEM_BADGES.map((b) => ({
      id: b.id,
      name: b.name,
      desc: b.desc,
      requirement: b.requirement,
      IconComponent: b.IconComponent,
      color: b.color,
      earned: b.isEarned(currentUser.level, solutionCount, bestCount),
      progress: b.progress(currentUser.level, solutionCount, bestCount),
    }));
  }, [currentUser.level, userSolutions]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/45 backdrop-blur-md animate-fade-up"
      role="dialog"
      aria-modal="true"
      aria-label={`Hồ sơ cá nhân của ${currentUser.name}`}
    >
      {/* Translucent Backdrop — lets the outside campus scene softly shine through */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Đóng hồ sơ"
        className="fixed inset-0 bg-transparent border-none outline-none cursor-default"
        onClick={onClose}
      />

      {/* Main Card Container — CodeFronts pc-12 Neumorphic Soft-Shadow Translucent Shell */}
      <div className="pc-12-shell w-full max-w-3xl rounded-[32px] p-4 sm:p-6 relative z-10 overflow-hidden max-h-[94vh] flex flex-col">
        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10 mb-3 gap-2.5 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
            <h2 className="text-sm sm:text-base font-extrabold text-white tracking-wide truncate">
              Cá nhân
            </h2>
            <span className="pc-12-pill text-[10px] font-mono px-2.5 py-0.5 text-cyan-300">
              Lv.{currentUser.level} • {tier.titleVi}
            </span>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto no-scrollbar">
            <div className="pc-12-well flex items-center p-1 rounded-full shrink-0 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-[#0284C7] text-white shadow-[0_4px_12px_rgba(2,132,199,0.45)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Hồ Sơ Đầy Đủ
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('card')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'card'
                    ? 'bg-amber-500 text-black shadow-[0_4px_12px_rgba(245,158,11,0.4)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Thẻ F-Pass
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('shop')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'shop'
                    ? 'bg-amber-500 text-black shadow-[0_4px_12px_rgba(245,158,11,0.4)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Chill Box
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'activity'
                    ? 'bg-amber-500 text-black shadow-[0_4px_12px_rgba(245,158,11,0.4)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Hoạt Động
              </button>

              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'edit'
                      ? 'bg-amber-500 text-black shadow-[0_4px_12px_rgba(245,158,11,0.4)]'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Sửa F-ID
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="pc-12-btn p-1.5 rounded-full text-neutral-300 hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Đóng cửa sổ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-red-950/50 border border-red-500/30 text-xs text-red-300 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 no-scrollbar">
          {/* Shimmer skeleton while the profile content boots (.ssc-01) */}
          {isBooting && (
            <div className="pc-12-card p-4 sm:p-5 space-y-4" role="status" aria-busy="true">
              <span className="sr-only">Đang tải hồ sơ…</span>
              <div aria-hidden="true">
                <div className="flex items-center gap-4">
                  <div className="ff-gradient-ring shrink-0">
                    <div className="ff-skeleton w-16 h-16 sm:w-20 sm:h-20 rounded-full" style={{ borderRadius: '50%' }} />
                  </div>
                  <div className="flex-1 space-y-2.5">
                    <div className="ff-skeleton h-3.5 rounded-full" style={{ width: '60%' }} />
                    <div className="ff-skeleton h-2.5 rounded-full" style={{ width: '90%' }} />
                    <div className="ff-skeleton h-2.5 rounded-full" style={{ width: '40%' }} />
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <div className="ff-skeleton flex-1 h-9 rounded-xl" />
                  <div className="ff-skeleton flex-1 h-9 rounded-xl" />
                  <div className="ff-skeleton flex-1 h-9 rounded-xl" />
                </div>
              </div>
            </div>
          )}

          {!isBooting && activeTab === 'overview' && (
            <div className="space-y-4 ff-tab-panel-enter">
              {/* Main 3D Rounded Neumorphic Card with Custom Banner / Gradient */}
              <div className="pc-12-card overflow-hidden">
                {/* Banner Header (supports uploaded 15MB banner image or custom gradient) */}
                <div
                  className="h-24 sm:h-28 ff-aurora-surface relative overflow-hidden"
                  style={{ background: effectiveBannerGradient }}
                >
                  {effectiveBannerUrl ? (
                    <img
                      src={effectiveBannerUrl}
                      alt="Ảnh bìa hồ sơ"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 ff-aurora-bar opacity-25" aria-hidden="true" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c1218]/80 via-transparent to-transparent" />
                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('edit')}
                      className="pc-12-btn absolute top-2.5 right-3 px-2.5 py-1 rounded-full text-[10px] font-mono text-white/90 hover:text-amber-300 flex items-center gap-1 cursor-pointer backdrop-blur-md"
                      title="Đổi ảnh bìa (tối đa 15MB)"
                    >
                      <ImageIcon className="w-3 h-3 text-amber-400" />
                      <span>Đổi ảnh bìa</span>
                    </button>
                  )}
                </div>

                <div className="p-4 sm:p-5 space-y-4">
                  {/* A. Khối Đầu Trang (Header Thông Tin Cá Nhân) */}
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pb-4 border-b border-white/10">
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      {/* Avatar với vòng gradient xoay */}
                      <div className="relative shrink-0 -mt-12">
                        <div className="ff-gradient-ring-sq p-[3px] rounded-[18px] shadow-xl">
                          <img
                            src={currentUser.avatar}
                            alt={currentUser.name}
                            onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                            loading="lazy"
                            decoding="async"
                            width={68}
                            height={68}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-[14px] object-cover bg-[#0c1218] shadow-md"
                          />
                        </div>
                        <span className="absolute -bottom-1 -right-1">
                          <TierBadge level={currentUser.level} size={22} showTooltip={false} />
                        </span>
                      </div>

                      {/* Tên hiển thị, Huy hiệu nhóm & Châm ngôn (Bio) */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-xl font-bold text-[#0284C7] flex items-center gap-1.5 truncate">
                            <span>{currentUser.name}</span>
                            {isSuperAdmin && <AdminVerifiedBadge size={15} />}
                          </h3>

                          {/* Role Badge */}
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0D9488] text-white text-[10px] font-bold tracking-wider uppercase shadow-sm">
                            <UserCheck className="w-3 h-3 text-white inline shrink-0" />
                            <span>
                              {currentUser.role === 'SUPER_ADMIN'
                                ? 'Quản trị'
                                : currentUser.role === 'CLUB_LEADER'
                                ? 'Chủ nhiệm CLB'
                                : 'Học sinh'}
                            </span>
                          </span>
                        </div>

                        {/* Châm ngôn cá nhân (Bio) */}
                        <p className="text-xs italic text-neutral-300 leading-snug line-clamp-2">
                          ❝ {currentUser.bio || 'Chưa có mô tả'} ❞
                        </p>

                        <div className="flex items-center gap-2 flex-wrap text-[10px] text-neutral-400 font-mono pt-0.5">
                          <span>Cấp độ: Lv.{currentUser.level}</span>
                          <span>•</span>
                          <span className="text-amber-400 font-bold">{userCoin} Coin</span>
                          <span>•</span>
                          <span className="text-cyan-300 font-semibold">{tier.titleVi}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Header Controls: Like Heart Button & Action Buttons */}
                    <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
                      <div className="flex items-center gap-1.5" title="Thả tim cho thành viên này">
                        <LikeHeartButton
                          count={profileHeartCount}
                          liked={likedByMe}
                          onToggle={handleProfileLike}
                          disabled={!viewerKey}
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isOwnProfile && (
                          <button
                            type="button"
                            onClick={() => setIsReporting(true)}
                            className="pc-12-btn px-2.5 py-1 rounded-xl text-red-300 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Tố cáo người dùng này"
                          >
                            <Flag className="w-3.5 h-3.5 text-red-400" />
                            <span>Tố cáo</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (navigator?.clipboard) {
                              navigator.clipboard.writeText(window.location.href);
                              pushNotification({
                                type: 'system',
                                category: 'system',
                                title: 'Đã Sao Chép Liên Kết',
                                body: `Đã copy liên kết hồ sơ của ${currentUser.name}.`,
                                targetView: 'home',
                              });
                            }
                          }}
                          className="pc-12-btn px-2.5 py-1 rounded-xl text-neutral-200 text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title="Chia sẻ hồ sơ"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Chia sẻ</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Thanh 6 Chỉ Số Thành Tích Nhanh (3D Neumorphic Inset Wells - Interactive) */}
                  <div className="space-y-2 pb-4 border-b border-white/10">
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                      {/* 1. Điểm số */}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedStatNote(
                            `Điểm số (XP): ${statsMetrics.xp.toLocaleString()} XP — tích lũy từ đặt câu hỏi (+50 XP) và giải bài tập (+100~300 XP).`
                          )
                        }
                        className="pc-12-well p-2.5 flex flex-col items-center cursor-pointer"
                      >
                        <span className="text-[10px] text-neutral-400 font-semibold mb-0.5">Điểm số</span>
                        <div className="flex items-center gap-1 font-bold font-mono text-xs text-amber-300">
                          <span className="text-amber-400 font-black">H</span>
                          <span>{statsMetrics.xp}</span>
                        </div>
                      </button>

                      {/* 2. Cảm ơn */}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedStatNote(
                            `Cảm ơn: ${statsMetrics.thanks} lượt — bình chọn hữu ích nhận được từ các lời giải của bạn.`
                          )
                        }
                        className="pc-12-well p-2.5 flex flex-col items-center cursor-pointer"
                      >
                        <span className="text-[10px] text-neutral-400 font-semibold mb-0.5">Cảm ơn</span>
                        <div className="flex items-center gap-1 font-bold font-mono text-xs text-rose-400">
                          <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400 shrink-0" />
                          <span>{statsMetrics.thanks}</span>
                        </div>
                      </button>

                      {/* 3. Hay nhất */}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedStatNote(
                            `Hay nhất: ${statsMetrics.bestSolutions} câu trả lời được tác giả câu hỏi chứng nhận là Đáp Án Chuẩn.`
                          )
                        }
                        className="pc-12-well p-2.5 flex flex-col items-center cursor-pointer"
                      >
                        <span className="text-[10px] text-neutral-400 font-semibold mb-0.5">Hay nhất</span>
                        <div className="flex items-center gap-1 font-bold font-mono text-xs text-yellow-300">
                          <Award className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                          <span>{statsMetrics.bestSolutions}</span>
                        </div>
                      </button>

                      {/* 4. 5 Sao */}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedStatNote(
                            `5 Sao: ${statsMetrics.fiveStar} lời giải xuất sắc đạt đánh giá tối đa từ cộng đồng.`
                          )
                        }
                        className="pc-12-well p-2.5 flex flex-col items-center cursor-pointer"
                      >
                        <span className="text-[10px] text-neutral-400 font-semibold mb-0.5">5 Sao</span>
                        <div className="flex items-center gap-1 font-bold font-mono text-xs text-amber-300">
                          <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300 shrink-0" />
                          <span>{statsMetrics.fiveStar}</span>
                        </div>
                      </button>

                      {/* 5. Xác thực */}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedStatNote(
                            `Xác thực: ${statsMetrics.verified} lời giải đã được xác minh tính chính xác học thuật.`
                          )
                        }
                        className="pc-12-well p-2.5 flex flex-col items-center cursor-pointer"
                      >
                        <span className="text-[10px] text-neutral-400 font-semibold mb-0.5">Xác thực</span>
                        <div className="flex items-center gap-1 font-bold font-mono text-xs text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{statsMetrics.verified}</span>
                        </div>
                      </button>

                      {/* 6. Đã giúp */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStatNote(
                            `Đã giúp: ${statsMetrics.helped} lượt giải đáp hỗ trợ bạn bè trên sàn hỏi đáp.`
                          );
                          setActivitySubTab('solutions');
                        }}
                        className="pc-12-well p-2.5 flex flex-col items-center cursor-pointer"
                      >
                        <span className="text-[10px] text-neutral-400 font-semibold mb-0.5">Đã giúp</span>
                        <div className="flex items-center gap-1 font-bold font-mono text-xs text-sky-400">
                          <Users className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>{statsMetrics.helped}</span>
                        </div>
                      </button>
                    </div>

                    {selectedStatNote && (
                      <div className="pc-12-well px-3 py-2 text-[11px] text-amber-200 flex items-center justify-between gap-2 animate-fade-up">
                        <span>{selectedStatNote}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedStatNote(null)}
                          className="text-neutral-400 hover:text-white text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  {/* B. Khối Danh Hiệu & Túi Đồ Ảo (Badges & Chill Box) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-white/10">
                    {/* DANH HIỆU — chỉ hiển thị danh hiệu thật sự đạt được, không lộ trước danh hiệu chưa mở khóa */}
                    <div className="pc-12-card p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-mono">
                          <Award className="w-4 h-4 text-emerald-400" />
                          Danh hiệu
                        </span>
                        <span className="pc-12-pill px-2 py-0.5 text-[10px] text-emerald-400 font-mono font-semibold">
                          {tier.titleVi}
                        </span>
                      </div>

                      {/* Rank hiện tại — bấm vào để mở GUI nhỏ bảng rank/danh hiệu/yêu cầu */}
                      <button
                        type="button"
                        onClick={() => setIsRankSheetOpen(true)}
                        title="Xem bảng rank, danh hiệu và yêu cầu thăng hạng"
                        className="pc-12-well p-2.5 flex items-center gap-2.5 w-full text-left cursor-pointer transition-colors hover:border-amber-400/40"
                      >
                        <TierBadge level={currentUser.level} size={26} showTooltip={false} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate">
                            {isSuperAdmin ? 'Quản Trị Viên Tối Cao' : tier.titleVi}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono">
                            Cấp {currentUser.level} • {statsMetrics.xp.toLocaleString()} XP
                          </div>
                        </div>
                        <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      </button>

                      {earnedBadgesList.length === 0 ? (
                        <div className="pc-12-well py-3 px-3 text-center">
                          <p className="text-[11px] text-neutral-300 font-medium">
                            Đang giữ cấp bậc <strong className="text-amber-300">{tier.titleVi}</strong>
                          </p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">
                            Tham gia giải bài và tích lũy XP để mở khóa các huy hiệu thành tích.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          {earnedBadgesList.map((b, index) => (
                            <div
                              key={b.id}
                              style={{ '--i': index } as React.CSSProperties}
                              className={`ac-01__card pc-12-well p-2 border text-center flex flex-col items-center justify-center relative ${b.color}`}
                              title={`${b.name}: ${b.desc}`}
                            >
                              <span className="text-base flex items-center justify-center">
                                <b.IconComponent className="w-4 h-4 inline" />
                              </span>
                              <span className="text-[9px] font-bold truncate max-w-full mt-0.5">
                                {b.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setIsRankSheetOpen(true)}
                        className="pc-12-btn w-full py-1.5 rounded-xl text-[11px] font-bold text-amber-200 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Trophy className="w-3.5 h-3.5" />
                        Bảng rank · danh hiệu · yêu cầu
                      </button>
                    </div>

                    {/* CHILL BOX & KỆ SÁCH */}
                    <div className="space-y-3">
                      {/* CHILL BOX (Kho đồ trang bị) */}
                      <div className="pc-12-card p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-mono">
                            <ShoppingBag className="w-4 h-4 text-amber-400" />
                            Chill Box
                          </span>
                          <span className="pc-12-pill px-2 py-0.5 text-[10px] text-amber-300 font-mono">
                            {userInventory.length} vật phẩm
                          </span>
                        </div>

                        {userInventory.length === 0 ? (
                          <div className="pc-12-well py-4 px-3 text-center">
                            <p className="text-[11px] text-neutral-400">Chưa sở hữu trang bị nào.</p>
                            <button
                              type="button"
                              onClick={() => setActiveTab('shop')}
                              className="mt-1.5 text-[11px] font-bold text-amber-300 hover:text-amber-200 cursor-pointer underline underline-offset-2"
                            >
                              Ghé cửa hàng bằng Coin của bạn →
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-4 gap-2">
                            {userInventory.map((itemId, index) => {
                              const item = SHOP_ITEMS.find((s) => s.id === itemId);
                              return (
                                <div
                                  key={itemId}
                                  style={{ '--i': index } as React.CSSProperties}
                                  className="ac-01__card pc-12-well relative p-2 flex flex-col items-center text-center"
                                  title={item?.name || itemId}
                                >
                                  <span className="w-5 h-5 flex items-center justify-center">
                                    <ShopItemSvg type={item?.iconType || 'sparkle'} size={20} />
                                  </span>
                                  <span className="text-[9px] font-semibold text-white/80 mt-1 truncate max-w-full">
                                    {item?.name || itemId}
                                  </span>
                                  {currentUser.equippedBadge === itemId && (
                                    <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-[8px] font-bold text-black border border-amber-200">
                                      Đeo
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* KỆ SÁCH — kệ sách thật, lưu theo tài khoản */}
                      <BookshelfPanel
                        key={profileKey}
                        ownerKey={profileKey}
                        ownerName={currentUser.name}
                        canEdit={isOwnProfile}
                      />
                    </div>
                  </div>
                  {/* C. Khối Biểu Đồ Mạng Nhện (Radar Spider Chart) - CÁC MÔN ĐÃ GIÚP ĐỠ BẠN BÈ */}
                  <div className="pb-4 border-b border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-mono">
                        <BarChart3 className="w-4 h-4 text-amber-400" />
                        CÁC MÔN ĐÃ GIÚP ĐỠ BẠN BÈ
                      </span>
                      <span className="pc-12-pill px-2.5 py-0.5 text-[10px] text-amber-400 font-mono">
                        Đã giải: {userSolutions.length} bài
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      {/* Cột trái: Biểu đồ Radar đa giác 5 đỉnh trục */}
                      <div className="md:col-span-6 flex flex-col items-center justify-center p-3 pc-12-well">
                        <svg viewBox="0 0 280 270" className="w-full max-w-[260px] h-auto overflow-visible">
                          {/* Concentric Grid Rings */}
                          {gridRings.map((ring, idx) => (
                            <polygon
                              key={idx}
                              points={ring.points}
                              fill="none"
                              stroke="rgba(255, 255, 255, 0.1)"
                              strokeDasharray={ring.level === 1.0 ? 'none' : '3 3'}
                              strokeWidth="1"
                            />
                          ))}

                          {/* Spoke Lines */}
                          {radarAxes.map((axis, idx) => {
                            const x2 = radarCx + radarRadius * Math.cos(axis.angle);
                            const y2 = radarCy + radarRadius * Math.sin(axis.angle);
                            return (
                              <line
                                key={idx}
                                x1={radarCx}
                                y1={radarCy}
                                x2={x2}
                                y2={y2}
                                stroke="rgba(255, 255, 255, 0.15)"
                                strokeWidth="1"
                              />
                            );
                          })}

                          {/* Data Polygon */}
                          <polygon
                            points={dataPolygonPoints}
                            fill="rgba(14, 165, 233, 0.25)"
                            stroke="#EAB308"
                            strokeWidth="2.5"
                          />

                          {/* Axis Points */}
                          {radarAxes.map((axis, idx) => {
                            const r = (axis.score / 100) * radarRadius;
                            const x = radarCx + r * Math.cos(axis.angle);
                            const y = radarCy + r * Math.sin(axis.angle);
                            return (
                              <circle
                                key={idx}
                                cx={x}
                                cy={y}
                                r="4.5"
                                fill="#06b6d4"
                                stroke="#0c1218"
                                strokeWidth="2"
                              >
                                <title>{`${axis.full}: ${axis.score}%`}</title>
                              </circle>
                            );
                          })}

                          {/* Axis Labels */}
                          {radarAxes.map((axis, idx) => {
                            const labelDist = radarRadius + 22;
                            const lx = radarCx + labelDist * Math.cos(axis.angle);
                            const ly = radarCy + labelDist * Math.sin(axis.angle);
                            return (
                              <text
                                key={idx}
                                x={lx}
                                y={ly + 4}
                                textAnchor="middle"
                                fill="#e2e8f0"
                                fontSize="9.5"
                                fontWeight="bold"
                                fontFamily="monospace"
                              >
                                {axis.name}
                              </text>
                            );
                          })}
                        </svg>
                      </div>

                      {/* Cột phải: Danh sách môn học chi tiết (100% dữ liệu thật từ câu trả lời của học sinh) */}
                      <div className="md:col-span-6 space-y-2.5">
                        {/* Khoa Học Tự Nhiên (KHTN) */}
                        <div className="pc-12-well p-2.5 space-y-1">
                          <span className="text-xs font-bold text-white block">Khoa Học Tự Nhiên (KHTN):</span>
                          <div className="text-amber-400/90 text-xs font-mono">
                            Toán Học ({subjectCounts.toan || 0}), Vật Lý ({subjectCounts.ly || 0}), Hóa Học ({subjectCounts.hoa || 0}), Sinh Học ({subjectCounts.sinh || 0})
                          </div>
                        </div>

                        {/* Khoa Học Xã Hội (KHXH) */}
                        <div className="pc-12-well p-2.5 space-y-1">
                          <span className="text-xs font-bold text-white block">Khoa Học Xã Hội (KHXH):</span>
                          <div className="text-amber-400 text-xs font-mono">
                            Ngữ Văn ({subjectCounts.van || 0}), Lịch Sử ({subjectCounts.su || 0}), Địa Lý ({subjectCounts.dia || 0})
                          </div>
                        </div>

                        {/* Khoa Học Công Nghệ (KHCN) */}
                        <div className="pc-12-well p-2.5 space-y-1">
                          <span className="text-xs font-bold text-white block">Khoa Học Công Nghệ (KHCN):</span>
                          <div className="text-amber-400 text-xs font-mono">
                            Tin Học ({subjectCounts.tin || 0}), Công Nghệ ({(subjectCounts.congnghe || 0) + (subjectCounts.hotro || 0)})
                          </div>
                        </div>

                        {/* Ngoại Ngữ & Nghệ Thuật */}
                        <div className="pc-12-well p-2.5 space-y-1">
                          <span className="text-xs font-bold text-white block">Ngoại Ngữ &amp; Nghệ Thuật:</span>
                          <div className="text-amber-300 text-xs font-mono">
                            Tiếng Anh ({subjectCounts.anh || 0}), Nghệ Thuật / Chia Sẻ ({(subjectCounts.tamsu || 0) + (subjectCounts.share || 0) + (subjectCounts.kinhnghiem || 0) + (subjectCounts.tamly || 0)})
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* D. Thông Tin Hoạt Động & Lịch Sử Câu Trả Lời (100% dữ liệu thật) */}
                  <div className="space-y-3">
                    {/* Metadata Tài Khoản */}
                    <div className="pc-12-well flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 text-xs">
                      <div className="flex items-center gap-2 flex-wrap text-neutral-300">
                        <span className="text-neutral-400">Ngày tham gia:</span>
                        <span className="text-white font-mono font-semibold">{accountJoinedInfo.joinedDateStr}</span>
                        <span>|</span>
                        <span className="text-neutral-400">Tuổi F-Forum:</span>
                        <span className="text-white font-mono font-semibold">{accountJoinedInfo.ageStr}</span>
                        <span>|</span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('card')}
                          className="text-[#38bdf8] hover:underline cursor-pointer"
                        >
                          Xem thẻ F-Pass
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <div>
                          <span className="text-neutral-400">Số câu trả lời: </span>
                          <span className="text-cyan-300 font-bold font-mono">{statsMetrics.answersCount}</span>
                        </div>
                        <span>|</span>
                        <div>
                          <span className="text-neutral-400">Cảnh báo: </span>
                          <span className="text-emerald-400 font-bold font-mono">0</span>
                        </div>
                      </div>
                    </div>

                    {/* Tab chuyển đổi hoạt động: [Câu hỏi] & [Câu trả lời] */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActivitySubTab('questions')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          activitySubTab === 'questions'
                            ? 'bg-[#0284C7] text-white shadow-sm'
                            : 'pc-12-btn text-neutral-400 hover:text-white'
                        }`}
                      >
                        [Câu hỏi] ({userQuestions.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setActivitySubTab('solutions')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          activitySubTab === 'solutions'
                            ? 'bg-[#0284C7] text-white shadow-sm'
                            : 'pc-12-btn text-neutral-400 hover:text-white'
                        }`}
                      >
                        [Câu trả lời] ({statsMetrics.answersCount})
                      </button>
                    </div>

                    {/* Answer Feed / Question Feed */}
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                      {activitySubTab === 'solutions' ? (
                        userSolutions.length === 0 ? (
                          <div className="pc-12-well py-6 text-center text-xs text-neutral-400 italic">
                            Chưa có câu trả lời nào. Hãy bắt đầu giúp đỡ bạn bè trên sàn hỏi đáp!
                          </div>
                        ) : (
                          userSolutions.map((s, idx) => {
                            const parentQ = questions.find((q) => q.id === s.questionId);
                            return (
                              <div
                                key={s.id}
                                style={{ '--i': idx } as React.CSSProperties}
                                className="ac-01__card pc-12-well p-3 space-y-1 transition-colors"
                              >
                                <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                                  <span className="text-sky-400 font-bold truncate max-w-[65%]">
                                    {parentQ ? parentQ.title : 'Câu hỏi'}
                                  </span>
                                  <span>{s.createdAt}</span>
                                </div>
                                <p className="text-xs text-neutral-200 leading-relaxed font-light line-clamp-2">
                                  {s.content}
                                </p>
                                {s.isBest && (
                                  <span className="inline-block text-[9px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 rounded-full px-2 py-0.5">
                                    ✓ Đáp án chuẩn
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )
                      ) : userQuestions.length === 0 ? (
                        <div className="pc-12-well py-6 text-center text-xs text-neutral-400 italic">
                          Chưa có câu hỏi nào được đặt.
                        </div>
                      ) : (
                        userQuestions.map((q) => (
                          <div key={q.id} className="pc-12-well p-3 space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                              <span className="text-amber-400 font-bold">#{q.subject}</span>
                              <span>{q.createdAt}</span>
                            </div>
                            <h5 className="text-xs font-bold text-white">{q.title}</h5>
                            <p className="text-xs text-neutral-300 line-clamp-1">{q.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 3D Hologram Student Card */}
          {activeTab === 'card' && (
            <div className="space-y-4 ff-tab-panel-enter">
              <HologramStudentCard
                user={currentUser}
                questionsAskedCount={userQuestions.length}
                solutionsApprovedCount={userSolutions.length}
              />

              {/* Equipped item banner if any */}
              {userInventory.length > 0 && (
                <div className="pc-12-card p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl pc-12-well flex items-center justify-center p-1">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Huy hiệu trang bị đang hoạt động</span>
                        <span className="pc-12-pill px-2 py-0.5 text-[9px] font-mono text-amber-300">
                          Active
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400">Hiển thị rực rỡ trên hồ sơ và phòng chat</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Chill Box Shop GUI (12 Custom SVG Items in 3D Rounded Cards) */}
          {activeTab === 'shop' && (
            <div className="space-y-4 ff-tab-panel-enter">
              {/* Shop Header Banner */}
              <div className="pc-12-card p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-amber-400" />
                    <span>CHILL BOX • TIỆM VẬT PHẨM HỌC ĐƯỜNG</span>
                  </h3>
                  <p className="text-[11px] text-neutral-300 mt-0.5">
                    Dùng F-Coin tích lũy từ điểm danh và giải bài tập để mở khóa vật phẩm độc bản.
                  </p>
                </div>
                <div className="pc-12-well flex items-center gap-1.5 px-3.5 py-2 text-amber-300 font-mono font-bold text-xs shrink-0">
                  <Coins className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '5s' }} />
                  <span>{userCoin} Coin</span>
                </div>
              </div>

              {/* Color Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {(
                  [
                    { id: 'all', label: 'Tất Cả (12)' },
                    { id: 'green', label: '🟢 Lục' },
                    { id: 'blue', label: '🔵 Lam' },
                    { id: 'red', label: '🔴 Đỏ' },
                    { id: 'purple', label: '🟣 Tím' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setShopFilter(f.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      shopFilter === f.id
                        ? 'bg-amber-500 text-black font-bold shadow-md'
                        : 'pc-12-pill text-neutral-300 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* 12 Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredShopItems.map((item) => {
                  const isOwned = userInventory.includes(item.id);
                  const isEquipped = currentUser.equippedBadge === item.id;
                  const canAfford = userCoin >= item.price;
                  const styles = getTierColorStyles(item.tierColor);

                  return (
                    <div
                      key={item.id}
                      className={`pc-12-card p-4 border ${styles.border} flex flex-col justify-between transition-transform duration-200 hover:scale-[1.02]`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="w-12 h-12 rounded-2xl pc-12-well flex items-center justify-center p-1.5">
                            <ShopItemSvg type={item.iconType} size={36} />
                          </div>
                          <div className="pc-12-pill flex items-center gap-1 px-2 py-1">
                            <span className={`w-3 h-3 rounded-full ${styles.dot}`} />
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                            <span>{item.name}</span>
                            {isEquipped && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                          </h4>
                          <p className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5 leading-snug">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-300">
                          <Coins className="w-3.5 h-3.5 text-amber-400" />
                          <span>{item.price} Coin</span>
                        </div>

                        {isOwned ? (
                          <button
                            type="button"
                            onClick={() => handleEquipItem(item.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isEquipped
                                ? 'bg-amber-500 text-black shadow-md'
                                : 'pc-12-btn text-white'
                            }`}
                          >
                            {isEquipped ? 'Đang Dùng' : 'Trang Bị'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleBuyItem(item)}
                            disabled={!canAfford}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              canAfford
                                ? `${styles.btn} shadow-md cursor-pointer hover:opacity-90 active:scale-95`
                                : 'pc-12-well text-neutral-500 cursor-not-allowed'
                            }`}
                          >
                            {canAfford ? 'Mua Ngay' : 'Chưa Đủ Coin'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: Activity History (Questions & Solutions) */}
          {activeTab === 'activity' && (
            <div className="space-y-4 ff-tab-panel-enter">
              <div className="pc-12-card p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-300">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-neutral-400">Ngày tham gia:</span>
                  <span className="text-white font-mono font-semibold">{accountJoinedInfo.joinedDateStr}</span>
                  <span>•</span>
                  <span className="text-neutral-400">Tuổi F-Forum:</span>
                  <span className="text-white font-mono font-semibold">{accountJoinedInfo.ageStr}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-400">Số câu hỏi:</span>
                    <span className="text-amber-300 font-mono font-bold">{userQuestions.length}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-400">Số câu trả lời:</span>
                    <span className="text-cyan-300 font-mono font-bold">{statsMetrics.answersCount}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-400">Cảnh báo:</span>
                    <span className="text-emerald-400 font-mono font-bold">0</span>
                  </div>
                </div>
              </div>

              {/* Questions & Solutions Feed */}
              <div className="space-y-2.5">
                {userQuestions.length === 0 && userSolutions.length === 0 ? (
                  <div className="pc-12-card py-12 text-center text-neutral-400 space-y-2">
                    <HelpCircle className="w-8 h-8 text-neutral-500 mx-auto" />
                    <p className="text-xs">Chưa có hoạt động hỏi đáp nào từ học sinh này.</p>
                  </div>
                ) : (
                  <>
                    {userQuestions.map((q) => (
                      <div key={q.id} className="pc-12-card p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="pc-12-pill px-2.5 py-0.5 text-amber-300 text-[10px] font-mono font-bold uppercase">
                            Câu hỏi • #{q.subject}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">{q.createdAt}</span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2">{q.title}</h4>
                        <p className="text-xs text-neutral-300 line-clamp-2">{q.content}</p>
                      </div>
                    ))}
                    {userSolutions.map((s) => {
                      const parentQ = questions.find((q) => q.id === s.questionId);
                      return (
                        <div key={s.id} className="pc-12-card p-3.5 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="pc-12-pill px-2.5 py-0.5 text-cyan-300 text-[10px] font-mono font-bold">
                              Lời giải • {parentQ ? parentQ.title : 'Hỏi đáp'}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">{s.createdAt}</span>
                          </div>
                          <p className="text-xs text-neutral-200 line-clamp-2">{s.content}</p>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Edit Profile Form (Neumorphic 3D Rounded + 15MB Banner Upload) */}
          {activeTab === 'edit' && isOwnProfile && (
            <form onSubmit={handleSubmit} className="space-y-4 ff-tab-panel-enter">
              {/* Banner & Avatar Live Preview Card */}
              <div className="pc-12-card overflow-hidden">
                {/* Banner Preview & Upload (Max 15MB) */}
                <div
                  className="relative h-28 sm:h-32 overflow-hidden group"
                  style={{ background: profileGradient }}
                >
                  {bannerUrl ? (
                    <img
                      src={bannerUrl}
                      alt="Ảnh bìa xem trước"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 ff-aurora-bar opacity-25" aria-hidden="true" />
                  )}
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/45 transition-colors flex items-center justify-center gap-2">
                    <label
                      htmlFor="banner-upload"
                      className="pc-12-btn px-3.5 py-1.5 rounded-full text-xs font-bold text-white hover:text-amber-300 flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span>Tải ảnh bìa (tối đa 15MB)</span>
                    </label>
                    {bannerUrl && (
                      <button
                        type="button"
                        onClick={() => setBannerUrl('')}
                        className="pc-12-btn p-1.5 rounded-full text-rose-300 hover:text-rose-200 cursor-pointer"
                        title="Gỡ ảnh bìa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <input
                      id="banner-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleBannerChange}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Avatar & Horizontal Banner Gradient Picker */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="relative group shrink-0 -mt-10">
                      <img
                        src={avatar}
                        alt="Avatar"
                        onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                        loading="lazy"
                        decoding="async"
                        width={68}
                        height={68}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400/70 shadow-xl bg-[#0c1218]"
                      />
                      <label
                        htmlFor="avatar-upload"
                        className="absolute inset-0 bg-black/65 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] text-white font-medium"
                      >
                        <Upload className="w-4 h-4 mb-0.5" />
                        Đổi ảnh
                      </label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={isSuperAdmin ? 'discord-admin-name text-sm' : 'text-sm font-bold text-white'}>
                          {name || 'Học sinh'}
                        </span>
                        {isSuperAdmin && <AdminVerifiedBadge size={14} />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <TierBadge level={currentUser.level} size={18} showTooltip={false} />
                        <span className="text-xs text-amber-300 font-mono font-semibold">
                          {tier.titleVi} • Lv.{currentUser.level}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/55 mt-0.5 font-mono">
                        Avatar &lt; 5MB • Ảnh bìa nền &le; 15MB (PNG, JPG, WebP, GIF)
                      </p>
                    </div>
                  </div>

                  {/* Horizontal Banner Color Bar */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-neutral-400 block">
                      Bảng màu nền hồ sơ:
                    </span>
                    <div className="pc-12-well p-1.5 flex items-center gap-1.5 rounded-full">
                      {PROFILE_BANNER_GRADIENTS.map((g) => {
                        const active = profileGradient === g.css;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setProfileGradient(g.css)}
                            title={g.label}
                            className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                              active ? 'scale-110 ring-2 ring-white shadow-md' : 'opacity-75 hover:opacity-100'
                            }`}
                            style={{ background: g.swatch }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Fields inside 3D Neumorphic Card */}
              <div className="pc-12-card p-4 space-y-3.5">
                {/* Full Name */}
                <div>
                  <label htmlFor="ten-hien-thi" className="block text-xs font-semibold text-neutral-300 mb-1">
                    Tên hiển thị:
                  </label>
                  <input id="ten-hien-thi"
                    type="text"
                    value={name}
                    maxLength={50}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pc-12-well px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors"
                    placeholder="Nhập họ và tên..."
                  />
                </div>

                {/* Bio with live counter */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-neutral-300">
                      Tiểu sử cá nhân (Bio):
                    </label>
                    <span
                      className={`text-[11px] font-mono ${
                        bio.length >= 95 ? 'text-amber-400 font-bold' : 'text-neutral-400'
                      }`}
                    >
                      {bio.length}/100 ký tự
                    </span>
                  </div>
                  <textarea
                    value={bio}
                    onChange={(e) => {
                      if (e.target.value.length <= 100) setBio(e.target.value);
                    }}
                    rows={2}
                    maxLength={100}
                    placeholder="Chia sẻ ngắn về bản thân, sở thích hoặc châm ngôn học tập..."
                    className="w-full pc-12-well px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors resize-none"
                  />
                </div>

                {/* 3 Columns: Gender, Class, City */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Giới tính:
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full pc-12-well px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer bg-[#0b1018]"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác / Ẩn</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="lop-khoa-hoc" className="block text-xs font-semibold text-neutral-300 mb-1">
                      Lớp / Khoá học:
                    </label>
                    <input id="lop-khoa-hoc"
                      type="text"
                      value={className}
                      maxLength={50}
                      onChange={(e) => setClassName(e.target.value)}
                      placeholder="VD: Lớp 11A1..."
                      className="w-full pc-12-well px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label htmlFor="thanh-pho" className="block text-xs font-semibold text-neutral-300 mb-1">
                      Thành phố:
                    </label>
                    <input id="thanh-pho"
                      type="text"
                      value={city}
                      maxLength={50}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="VD: Hà Nội..."
                      className="w-full pc-12-well px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Footer Submit */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className="pc-12-btn px-4 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Quay lại xem hồ sơ
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:opacity-90 active:scale-95 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-[0_4px_16px_rgba(245,158,11,0.4)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi F-ID'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Tố Cáo Modal Popup */}
      {isReporting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tố cáo người dùng vi phạm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsReporting(false);
              setReportSuccess(null);
            }
          }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-up"
        >
          <div className="pc-12-shell w-full max-w-md rounded-3xl border border-red-500/40 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2 text-red-400">
                <Flag className="w-5 h-5 text-red-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">Tố Cáo Tài Khoản Vi Phạm</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsReporting(false);
                  setReportSuccess(null);
                }}
                className="p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs text-emerald-200">{reportSuccess}</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsReporting(false);
                    setReportSuccess(null);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 text-black text-xs font-bold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportUserSubmit} className="space-y-3.5">
                <div className="pc-12-well p-2.5 text-xs text-neutral-300">
                  Đối tượng tố cáo: <strong className="text-white">{currentUser.name}</strong>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Lý do vi phạm (*):
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full pc-12-well px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400 cursor-pointer bg-[#0b1018]"
                  >
                    <option value="Toxic / Gây war / Xúc phạm bạn học">Toxic / Gây war / Xúc phạm bạn học</option>
                    <option value="Spam / Quảng cáo / Lừa đảo">Spam / Quảng cáo / Lừa đảo</option>
                    <option value="Nội dung phản cảm / Đồi trụy">Nội dung phản cảm / Đồi trụy</option>
                    <option value="Gian lận điểm / Hack Coin">Gian lận điểm / Hack Coin</option>
                    <option value="Khác">Lý do khác</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="chi-tiet-vi-pham" className="block text-xs font-semibold text-neutral-300 mb-1">
                    Chi tiết vi phạm:
                  </label>
                  <textarea id="chi-tiet-vi-pham"
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Mô tả cụ thể bằng chứng vi phạm..."
                    className="w-full pc-12-well px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400 resize-none"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-500/20 text-[10px] text-red-300 space-y-1">
                  <span className="font-bold flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-red-400" />
                    Xử lý vi phạm:
                  </span>
                  <p>
                    Báo cáo sẽ được chuyển tới Ban Quản Trị để xem xét và xử lý theo nội quy.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsReporting(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs text-neutral-400 hover:text-white cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer shadow-md disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>{isSubmittingReport ? 'Đang gửi...' : 'Gửi Tố Cáo'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <TierRankSheet
        isOpen={isRankSheetOpen}
        onClose={() => setIsRankSheetOpen(false)}
        level={currentUser.level}
        xp={statsMetrics.xp}
        badges={sheetBadges}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
};

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  viewerUser,
  onSaveProfile,
  onPurchaseItem,
  onEquipItem,
  initialTab = 'overview',
  questions = [],
  solutions = [],
}) => {
  if (!isOpen) return null;
  return (
    <ProfileModalInner
      key={`${currentUser.id}-${initialTab}`}
      currentUser={currentUser}
      viewerUser={viewerUser}
      onClose={onClose}
      onSaveProfile={onSaveProfile}
      onPurchaseItem={onPurchaseItem}
      onEquipItem={onEquipItem}
      initialTab={initialTab}
      questions={questions}
      solutions={solutions}
    />
  );
};

export default ProfileModal;
