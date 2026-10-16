/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Upload,
  Check,
  AlertCircle,
  BarChart3,
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
  Palette as PaletteIcon,
  Move,
  ZoomIn,
  ZoomOut,
  Crop,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  User as UserIcon,
  CreditCard,
  ShoppingBag,
  Activity,
  SlidersHorizontal,
} from 'lucide-react';
import type { User, Question, Solution, ShopItem } from '../types';
import { TierBadge, TierSvg, AdminVerifiedBadge } from './Badges10Tier';
import { TIER_CONFIGS, getTierForLevel } from '../utils/tier';
import { HologramStudentCard } from './HologramStudentCard';
import { PremiumStat } from './PremiumStats';
import { SignatureEmblem } from './SignatureEmblem';
import './ProfileSignature.css';
import { DEFAULT_AVATAR, handleImageError } from '../utils/mediaFallback';
import {
  SHOP_ITEMS,
  effectivePrice,
  rarityDotClass,
  rarityFrameClass,
  rarityOf,
  resolveEquippedCombo,
} from '../utils/shopData';
import { GachaBoutique } from './shop/GachaBoutique';
import { TrophyShelf } from './shop/TrophyShelf';
import { AvatarWithDecoration, type DecorationAssetRef } from './decorations/AvatarWithDecoration';
import { DecoratedName } from './decorations/DecoratedAvatar';
import { useDecorationCatalog, useUserDecorations } from '../utils/decorationStore';
import { DECORATION_RARITY_META, resolveAssetUrl } from '../utils/decorations';
import { pushNotification } from '../utils/notifications';
import { LikeHeartButton } from './LikeHeartButton';
import { safeStorage } from '../utils/storage';
import { effectiveCoinBalance, formatCoinBalance } from '../utils/coinDisplay';
import { getGradient, resolveProfileGradientId } from '../utils/gradients';
import { GradientSwatchPicker } from './GradientSwatchPicker';
import { GradientSurface } from './GradientSurface';
import {
  parseBannerUrl,
  serializeBannerUrl,
  bannerImageStyle,
  cropFacebookPhotoToDataUrl,
  facebookCropImageStyle,
  DEFAULT_BANNER_LAYOUT,
  DEFAULT_FB_CROP_CONFIG,
  DEFAULT_PROFILE_BANNER_URL,
  BUILTIN_COVER_PRESETS,
  type BannerLayoutConfig,
  type FacebookCropConfig,
} from '../utils/bannerLayout';
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
import { RadarSpiderChart } from './charts/RadarSpiderChart';
import { prepareImageForUpload, uploadProcessedImage } from '../utils/imagePipeline';
import { isMasterAdmin } from '../config/admin';
import { postJson } from '../utils/session';
import { describeReportResult, settleReportRequest } from '../utils/reports';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  viewerUser?: User | null;
  onSaveProfile: (updates: Partial<User>) => void;
  onPurchaseItem: (itemId: string) => Promise<boolean>;
  onEquipItem: (itemId: string) => Promise<boolean>;
  /** Nhiệm vụ 10 — trang bị/gỡ trang trí Discord theo slot (itemId null = gỡ). */
  onEquipDecoration?: (slot: 'avatar_frame' | 'avatar_aura' | 'nameplate', itemId: string | null) => Promise<boolean>;
  onToggleWishlist?: (item: ShopItem) => void;
  initialTab?: 'overview' | 'card' | 'stats' | 'shop' | 'activity' | 'edit';
  questions?: Question[];
  solutions?: Solution[];
  /** Số tài khoản sở hữu từng vật phẩm (dữ liệu thật) — nhãn "Hot" trong Boutique. */
  shopOwnership?: Record<string, number>;
}

type TabType = 'overview' | 'card' | 'stats' | 'shop' | 'activity' | 'edit';

const profileActivityTimestamp = (createdAt?: string, createdAtMs?: number): number => {
  if (typeof createdAtMs === 'number' && Number.isFinite(createdAtMs)) return createdAtMs;
  const parsed = Date.parse(createdAt || '');
  return Number.isFinite(parsed) ? parsed : 0;
};

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
    color: 'text-[#81b29a] bg-[#81b29a]/15 border-[#81b29a]/40',
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
    name: 'Thần Đồng',
    desc: 'Đạt cấp độ 50',
    requirement: 'Đạt Level 50',
    IconComponent: Crown,
    isEarned: (l) => l >= 50,
    progress: (l) => ({ current: l, target: 50, unit: 'cấp' }),
    color: 'text-amber-300 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-400/40',
  },
];

/* Tim hồ sơ: lưu theo từng hồ sơ + người thả tim để mở lại vẫn đúng 1 tim */

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
  /** Nhiệm vụ 10 — trang bị/gỡ trang trí Discord theo slot (itemId null = gỡ). */
  onEquipDecoration?: (slot: 'avatar_frame' | 'avatar_aura' | 'nameplate', itemId: string | null) => Promise<boolean>;
  onToggleWishlist?: (item: ShopItem) => void;
  initialTab?: TabType;
  questions?: Question[];
  solutions?: Solution[];
  shopOwnership?: Record<string, number>;
}> = ({
  currentUser,
  viewerUser,
  onClose,
  onSaveProfile,
  onPurchaseItem,
  onEquipItem,
  onEquipDecoration,
  onToggleWishlist,
  initialTab = 'overview',
  questions = [],
  solutions = [],
  shopOwnership,
}) => {
  const isSuperAdmin = isMasterAdmin(currentUser.email) || currentUser.role === 'SUPER_ADMIN';
  const isOwnProfile = !viewerUser || viewerUser.id === currentUser.id;
  const [requestedTab, setRequestedTab] = useState<TabType>(initialTab);
  const activeTab = !isOwnProfile && requestedTab === 'edit' ? 'overview' : requestedTab;
  const setActiveTab = setRequestedTab;

  /* Hộp thoại này khai báo aria-modal="true" nhưng trước đây không có đường
     thoát bằng phím: screen reader coi phần còn lại của trang là không tồn tại,
     nên người dùng bàn phím bị kẹt trong hộp thoại. */
  useEscapeKey(onClose);

  const [name, setName] = useState(currentUser.name);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [bannerUrl, setBannerUrl] = useState(currentUser.bannerUrl || '');
  const [profileGradient, setProfileGradient] = useState(
    getGradient(resolveProfileGradientId(currentUser.profileGradient)).css
  );
  const [bio, setBio] = useState(currentUser.bio || '');
  const [gender, setGender] = useState(currentUser.gender || 'Nam');
  const [city, setCity] = useState(currentUser.city || '');
  const [className, setClassName] = useState(currentUser.className || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  /** EPIC 5: ảnh đang được xử lý/tải lên — khoá nút Lưu để không lưu nhầm bản tạm. */
  const [mediaBusy, setMediaBusy] = useState<null | 'avatar' | 'banner'>(null);

  /* Mở ngay lập tức — không giữ skeleton nhân tạo gây giật bố cục */
  const [isBooting, setIsBooting] = useState(false);

  const [bootingForId, setBootingForId] = useState(currentUser.id);
  if (bootingForId !== currentUser.id) {
    setBootingForId(currentUser.id);
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
  const [reportErrorMsg, setReportErrorMsg] = useState<string | null>(null);

  /* GUI nhỏ "Bảng rank · danh hiệu · yêu cầu" mở từ khối Danh hiệu */
  const [isRankSheetOpen, setIsRankSheetOpen] = useState(false);

  /* Tim hồ sơ — MỘT nguồn sự thật: likesMap. Nút tim chỉ hiển thị số cha tính
     ra, không tự cộng trừ, nên một lần bấm luôn đúng ±1 (không thể nhân đôi). */
  const [likesMap, setLikesMap] = useState<ProfileLikesMap>(() => readProfileLikes());
  const profileKey = (currentUser.email || currentUser.id || '').toLowerCase();
  const viewerKey = (viewerUser?.email || viewerUser?.id || '').toLowerCase();
  const profileLikers = profileLikersOf(likesMap, profileKey);
  const likedByMe = isProfileLikedBy(likesMap, profileKey, viewerKey);

  /* Cấu hình vị trí / thu phóng / cắt ảnh nền & đại diện chuẩn Facebook */
  const [bannerLayout, setBannerLayout] = useState<BannerLayoutConfig>(
    () => parseBannerUrl(currentUser.bannerUrl || '', profileKey).layout,
  );
  const [isAdjustingBanner, setIsAdjustingBanner] = useState(false);
  const [bannerStudioMode, setBannerStudioMode] = useState<'reposition' | 'crop'>('reposition');
  const bannerCardRef = useRef<HTMLDivElement | null>(null);
  const cropStageRef = useRef<HTMLDivElement | null>(null);
  const fbCropStageRef = useRef<HTMLDivElement | null>(null);
  const [fbCropModal, setFbCropModal] = useState<{
    kind: 'avatar' | 'banner';
    src: string;
    config: FacebookCropConfig;
  } | null>(null);
  const [isDraggingFbCrop, setIsDraggingFbCrop] = useState(false);
  const [isSavingFbCrop, setIsSavingFbCrop] = useState(false);
  const bannerDragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

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
  const equippedItem = SHOP_ITEMS.find(item => item.id === currentUser.equippedBadge && currentUser.inventory?.includes(item.id));

  /* Super Admin: quyền lợi VÔ VÙNG COIN — số dư hiệu dụng = ∞ (server cũng
     không chặn/trừ Coin). Mọi chỗ mua/gacha/đều dùng giá trị này. */
  const userCoin = effectiveCoinBalance(currentUser.role, currentUser.coin);
  const userInventory = useMemo(
    () => currentUser.inventory || [],
    [currentUser.inventory]
  );

  const [shopCategoryJump, setShopCategoryJump] = useState<string | null>(null);

  const equippedCombo = useMemo(
    () => resolveEquippedCombo(
      userInventory,
      currentUser.equippedBadge,
      currentUser.email || currentUser.name || 'default',
    ),
    [userInventory, currentUser.equippedBadge, currentUser.email, currentUser.name],
  );

  /* Nhiệm vụ 10 — trang trí Discord đã trang bị (catalog + inventory của CHÍNH user
     đang xem — hồ sơ người khác cũng hiển thị trang trí của họ qua /api/sync). */
  const userDecorations = useUserDecorations(currentUser);
  const { items: catalogItems } = useDecorationCatalog();
  const [quickWardrobeSlot, setQuickWardrobeSlot] = useState<'all' | 'nameplate' | 'avatar_frame' | 'avatar_aura'>('all');
  const [wardrobeSearch, setWardrobeSearch] = useState('');

  const ownedDecorationsBySlot = useMemo(() => {
    const ownedSet = new Set(userInventory);
    const owned = catalogItems.filter((item) => item.isActive !== false && ownedSet.has(item.id));
    return {
      all: owned,
      nameplate: owned.filter((item) => item.category === 'Nameplate'),
      avatar_frame: owned.filter((item) => item.category === 'Avatar Frame'),
      avatar_aura: owned.filter((item) => item.category === 'Avatar Aura'),
    };
  }, [catalogItems, userInventory]);

  const decoFrameAsset: DecorationAssetRef | null = userDecorations.frame
    ? {
        id: userDecorations.frame.id,
        type: 'avatar_frame',
        fullAssetUrl: userDecorations.frame.fullAssetUrl,
        animatedAssetUrl: userDecorations.frame.animatedAssetUrl,
        isAnimated: !!userDecorations.frame.isAnimated && !!userDecorations.frame.animatedAssetUrl,
      }
    : null;
  const decoAuraAsset: DecorationAssetRef | null = userDecorations.aura
    ? {
        id: userDecorations.aura.id,
        type: 'avatar_aura',
        fullAssetUrl: userDecorations.aura.fullAssetUrl,
        animatedAssetUrl: userDecorations.aura.animatedAssetUrl,
        isAnimated: !!userDecorations.aura.isAnimated && !!userDecorations.aura.animatedAssetUrl,
      }
    : null;
  const activeDecoAsset = decoFrameAsset || decoAuraAsset;

  const activeAvatarRarity = equippedCombo.frame
    ? rarityOf(equippedCombo.frame)
    : equippedItem
      ? rarityOf(equippedItem)
      : equippedCombo.highestRarity;
  const activeAvatarFrameClass = rarityFrameClass(activeAvatarRarity);

  const handleEquipDecoration = async (slot: 'avatar_frame' | 'avatar_aura' | 'nameplate', itemId: string | null): Promise<boolean> => {
    if (!isOwnProfile || !onEquipDecoration) return false;
    const ok = await onEquipDecoration(slot, itemId);
    if (ok) {
      pushNotification({
        type: 'system',
        category: 'system',
        title: itemId ? 'Đã trang bị trang trí mới' : 'Đã gỡ trang trí',
        body: itemId ? 'Trang trí mới đã được gắn vào hồ sơ của bạn.' : 'Slot trang trí đã được để trống.',
        targetView: 'home',
      });
    }
    return ok;
  };

  const openShopAtCategory = (category: string | null) => {
    setShopCategoryJump(category);
    setActiveTab('shop');
  };

  const userQuestions = useMemo(
    () => questions.filter((q) => q.authorId === currentUser.id),
    [questions, currentUser.id]
  );
  const userSolutions = useMemo(
    () => solutions.filter((s) => s.authorId === currentUser.id),
    [solutions, currentUser.id]
  );
  const profileActivity = useMemo(() => [
    ...userQuestions.map((question) => ({
      id: `question:${question.id}`,
      kind: 'question' as const,
      createdAt: question.createdAt,
      timestamp: profileActivityTimestamp(question.createdAt, question.createdAtMs),
      question,
    })),
    ...userSolutions.map((solution) => ({
      id: `solution:${solution.id}`,
      kind: 'solution' as const,
      createdAt: solution.createdAt,
      timestamp: profileActivityTimestamp(solution.createdAt, solution.createdAtMs),
      solution,
    })),
  ].sort((a, b) => b.timestamp - a.timestamp), [userQuestions, userSolutions]);

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



  const handleBuyItem = async (item: ShopItem): Promise<boolean> => {
    /* Giá thật (đã áp ưu đãi tuần) — máy chủ tính lại bằng đúng hàm này khi trừ Coin. */
    const price = effectivePrice(item);
    if (!isOwnProfile || userCoin < price) return false;
    if (!(await onPurchaseItem(item.id))) return false;
    pushNotification({
      type: 'coin',
      category: 'system',
      title: 'Mở khoá vật phẩm thành công!',
      body: `Đã mở khoá "${item.name}" với giá ${price} Coin tại Gacha Boutique.`,
      targetView: 'home',
    });
    return true;
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

  const openFacebookCropper = (kind: 'avatar' | 'banner', rawSrc: string) => {
    if (!isOwnProfile) return;
    const cleanSrc = kind === 'banner' ? (parseBannerUrl(rawSrc, profileKey).cleanSrc || rawSrc) : rawSrc;
    if (!cleanSrc) return;
    setFbCropModal({
      kind,
      src: cleanSrc,
      config: { ...DEFAULT_FB_CROP_CONFIG, zoom: 1.08 },
    });
  };

  /*
    EPIC 5 — pipeline ảnh: thu nhỏ nhiều bước + unsharp mask nhẹ trên canvas
    (src/utils/imagePipeline.ts), mở ngay trình cắt & đặt vị trí kiểu Facebook
    (kéo ảnh dưới mặt nạ cố định + thanh trượt zoom + lăn chuột không cuộn trang),
    rồi tải lên máy chủ khi người dùng xác nhận Lưu.
  */
  const processProfileImage = async (file: File, kind: 'avatar' | 'banner') => {
    const limitMb = kind === 'avatar' ? 15 : 25;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chỉ chọn tệp hình ảnh (PNG, JPG, WebP, GIF)!');
      return;
    }
    if (file.size > limitMb * 1024 * 1024) {
      setErrorMsg(
        `Kích thước ${kind === 'avatar' ? 'ảnh đại diện' : 'ảnh bìa'} (${(file.size / (1024 * 1024)).toFixed(2)}MB) vượt quá ${limitMb}MB cho phép!`
      );
      return;
    }
    setErrorMsg(null);
    setMediaBusy(kind);
    try {
      const prepared = await prepareImageForUpload(file, { maxSide: kind === 'avatar' ? 1024 : 2400 });
      openFacebookCropper(kind, prepared.dataUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi xử lý ảnh. Vui lòng thử lại!');
    } finally {
      setMediaBusy(null);
    }
  };

  const handleConfirmFacebookCrop = async () => {
    if (!fbCropModal || isSavingFbCrop || !isOwnProfile) return;
    const { kind, src, config } = fbCropModal;
    setIsSavingFbCrop(true);
    setMediaBusy(kind);
    setErrorMsg(null);
    const apply = kind === 'avatar' ? setAvatar : setBannerUrl;
    try {
      const croppedDataUrl = await cropFacebookPhotoToDataUrl(src, config, kind);
      const resetCfg: BannerLayoutConfig = { ...DEFAULT_BANNER_LAYOUT, dim: bannerLayout.dim };
      if (kind === 'banner') {
        setBannerLayout(resetCfg);
      }
      apply(croppedDataUrl);
      setFbCropModal(null);
      setIsAdjustingBanner(false);
      try {
        const uploaded = await uploadProcessedImage(kind, croppedDataUrl);
        if (kind === 'banner') {
          const withLayout = serializeBannerUrl(uploaded.url, resetCfg, profileKey);
          apply(withLayout);
          onSaveProfile({ bannerUrl: withLayout });
        } else {
          apply(uploaded.url);
          onSaveProfile({ avatar: uploaded.url });
        }
      } catch {
        if (kind === 'banner') {
          onSaveProfile({ bannerUrl: croppedDataUrl });
        } else {
          onSaveProfile({ avatar: croppedDataUrl });
        }
      }
      pushNotification({
        type: 'system',
        category: 'system',
        title: kind === 'avatar' ? 'Đã cập nhật ảnh đại diện!' : 'Đã cập nhật ảnh bìa!',
        body:
          kind === 'avatar'
            ? 'Ảnh đại diện đã được căn chỉnh và lưu thành công.'
            : 'Ảnh bìa hồ sơ đã được căn chỉnh và lưu thành công.',
        targetView: 'home',
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể cắt ảnh. Vui lòng thử lại!');
    } finally {
      setIsSavingFbCrop(false);
      setMediaBusy(null);
    }
  };

  const beginFbCropDrag = (e: React.PointerEvent<HTMLElement>) => {
    if (!fbCropModal) return;
    if ((e.target as HTMLElement).closest('button, input')) return;
    e.preventDefault();
    e.stopPropagation();
    const stageEl = fbCropStageRef.current || e.currentTarget;
    const rect = stageEl.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const origPanX = fbCropModal.config.panX;
    const origPanY = fbCropModal.config.panY;
    setIsDraggingFbCrop(true);

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const sensX = 180 / Math.max(200, rect.width);
      const sensY = 180 / Math.max(200, rect.height);
      const nextPanX = Math.max(-100, Math.min(100, Math.round((origPanX + dx * sensX) * 10) / 10));
      const nextPanY = Math.max(-100, Math.min(100, Math.round((origPanY + dy * sensY) * 10) / 10));
      setFbCropModal((prev) =>
        prev
          ? {
              ...prev,
              config: {
                ...prev.config,
                panX: nextPanX,
                panY: nextPanY,
              },
            }
          : null,
      );
    };

    const onUp = () => {
      setIsDraggingFbCrop(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  /* Chặn tuyệt đối lăn chuột làm cuộn trang/modal khi đang căn chỉnh ảnh bìa hoặc mở khung cắt Facebook */
  useEffect(() => {
    if (!isOwnProfile || !isAdjustingBanner) return undefined;
    const cardEl = bannerCardRef.current || cropStageRef.current;
    if (!cardEl) return undefined;
    const onNativeWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      const delta = ev.deltaY < 0 ? 0.08 : -0.08;
      setBannerLayout((prev) => ({
        ...prev,
        zoom: Math.round(Math.max(1, Math.min(3, prev.zoom + delta)) * 100) / 100,
      }));
    };
    cardEl.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => cardEl.removeEventListener('wheel', onNativeWheel);
  }, [isOwnProfile, isAdjustingBanner]);

  useEffect(() => {
    if (!fbCropModal) return undefined;
    const stageEl = fbCropStageRef.current;
    if (!stageEl) return undefined;
    const onNativeWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      const delta = ev.deltaY < 0 ? 0.08 : -0.08;
      setFbCropModal((prev) =>
        prev
          ? {
              ...prev,
              config: {
                ...prev.config,
                zoom: Math.round(Math.max(1, Math.min(3, prev.config.zoom + delta)) * 100) / 100,
              },
            }
          : null,
      );
    };
    stageEl.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => stageEl.removeEventListener('wheel', onNativeWheel);
  }, [fbCropModal]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void processProfileImage(file, 'avatar');
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void processProfileImage(file, 'banner');
  };

  const beginBannerDrag = (e: React.PointerEvent<HTMLElement>) => {
    if (!isOwnProfile || (!isAdjustingBanner && activeTab !== 'edit')) return;
    if (isAdjustingBanner && bannerStudioMode === 'crop') return;
    if ((e.target as HTMLElement).closest('button, label, input')) return;
    e.preventDefault();
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    bannerDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: bannerLayout.x,
      origY: bannerLayout.y,
    };
    const onMove = (ev: PointerEvent) => {
      if (!bannerDragRef.current) return;
      const dx = ev.clientX - bannerDragRef.current.startX;
      const dy = ev.clientY - bannerDragRef.current.startY;
      const sensitivity = 100 / Math.max(180, rect.height * bannerLayout.zoom);
      const nextX = Math.max(0, Math.min(100, Math.round(bannerDragRef.current.origX - dx * sensitivity)));
      const nextY = Math.max(0, Math.min(100, Math.round(bannerDragRef.current.origY - dy * sensitivity)));
      setBannerLayout((prev) => ({ ...prev, x: nextX, y: nextY }));
    };
    const onUp = () => {
      bannerDragRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const handleSelectBuiltinCover = (presetUrl: string) => {
    if (!isOwnProfile) return;
    const serialized = serializeBannerUrl(presetUrl, bannerLayout, profileKey);
    setBannerUrl(serialized);
    onSaveProfile({ bannerUrl: serialized });
  };

  const handleBannerWheel = (e: React.WheelEvent<HTMLElement>) => {
    if (!isOwnProfile || !isAdjustingBanner) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setBannerLayout((prev) => ({
      ...prev,
      zoom: Math.round(Math.max(1, Math.min(3, prev.zoom + delta)) * 100) / 100,
    }));
  };

  const handleSaveBannerLayout = () => {
    if (!isOwnProfile) return;
    const raw = bannerUrl || currentUser.bannerUrl || DEFAULT_PROFILE_BANNER_URL;
    const nextUrl = serializeBannerUrl(raw, bannerLayout, profileKey);
    setBannerUrl(nextUrl);
    onSaveProfile({ bannerUrl: nextUrl });
    setIsAdjustingBanner(false);
    pushNotification({
      type: 'system',
      category: 'system',
      title: 'Đã lưu vị trí ảnh nền',
      body: 'Bố cục và vị trí ảnh nền hồ sơ đã được cập nhật.',
      targetView: 'home',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || mediaBusy) return;
    if (!name.trim()) {
      setErrorMsg('Tên hiển thị không được để trống!');
      return;
    }

    setIsSaving(true);
    const baseBanner = bannerUrl || currentUser.bannerUrl || DEFAULT_PROFILE_BANNER_URL;
    const finalBannerUrl = serializeBannerUrl(baseBanner, bannerLayout, profileKey);
    onSaveProfile({
      name: name.trim().slice(0, 50),
      avatar,
      bannerUrl: finalBannerUrl,
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
    setReportErrorMsg(null);
    try {
      /* EPIC 5: máy chủ bắt buộc đăng nhập và tự lấy danh tính người tố cáo từ phiên. */
      const outcome = describeReportResult(
        await settleReportRequest(
          postJson('/api/reports', {
            reportedUserId: currentUser.id,
            reportedUserName: currentUser.name,
            reason: reportReason,
            details: reportDetails.trim(),
          }),
        ),
      );
      if (!outcome.ok) {
        setReportErrorMsg(outcome.message);
        return;
      }
      setReportSuccess(outcome.message || 'Đã gửi tố cáo tài khoản tới Ban Quản Trị.');
      pushNotification({
        type: 'system',
        category: 'system',
        title: 'Đã Tiếp Nhận Báo Cáo',
        body: `Báo cáo về "${currentUser.name}" đã được chuyển tới Ban Quản Trị để xử lý.`,
        targetView: 'home',
      });
    } catch {
      setReportErrorMsg('Mất kết nối máy chủ — tố cáo CHƯA được gửi. Vui lòng thử lại.');
    } finally {
      setIsSubmittingReport(false);
    }
  };


  const rawEffectiveBanner = isOwnProfile
    ? bannerUrl || currentUser.bannerUrl || DEFAULT_PROFILE_BANNER_URL
    : currentUser.bannerUrl || bannerUrl || DEFAULT_PROFILE_BANNER_URL;
  const parsedEffectiveBanner = parseBannerUrl(rawEffectiveBanner, profileKey);
  const effectiveBannerUrl = parsedEffectiveBanner.cleanSrc || DEFAULT_PROFILE_BANNER_URL;
  const activeBannerLayout = isOwnProfile ? bannerLayout : parsedEffectiveBanner.layout;
  const activeBannerImgStyle = bannerImageStyle(activeBannerLayout);
  const effectiveBannerGradient =
    getGradient(resolveProfileGradientId(currentUser.profileGradient || profileGradient)).css;

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
      className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4 bg-black/45 backdrop-blur-md animate-fade-up"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      {/* Translucent Backdrop — lets the outside campus scene softly shine through */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Đóng hồ sơ"
        className="fixed inset-0 bg-transparent border-none outline-none cursor-default"
        onClick={onClose}
      />

      {/* Main Card Container — Spacious max-w-5xl Academic Shell */}
      <div className={`pc-12-shell ff-keep-dark signature-profile profile-modal-shell ${equippedItem?.category === 'Khung avatar' ? 'signature-profile--frame' : equippedItem?.category === 'Hiệu ứng' ? 'signature-profile--effect' : ''} w-full max-w-5xl rounded-[26px] p-4 sm:p-6 relative z-10 overflow-hidden max-h-[94vh] flex flex-col`}>
        {/* Navigation tabs: labeled so profile areas are discoverable beyond their icons. */}
        <div className="profile-modal-header relative z-10 flex items-center justify-between pb-3 border-b border-dashed border-[#f4f1de]/15 mb-3 gap-2.5 shrink-0">
          <div className="profile-modal-identity flex items-center gap-2 min-w-0">
            <span className="profile-modal-status-dot w-2.5 h-2.5 rounded-full bg-[#81b29a]" aria-hidden="true" />
            <div className="min-w-0">
              <span className="profile-modal-kicker flex items-center gap-1">
                <span className="ff-swash-cap text-xs">F</span>·FORUM / SỔ TAY HỌC THUẬT
              </span>
              <div className="flex items-center gap-2">
                <h2 id="profile-modal-title" className="profile-modal-name text-sm sm:text-base font-extrabold text-[#f8f7f4] tracking-wide truncate">
                  {currentUser.name.replace(/ \(.*\)/, '')}
                </h2>
                <span className="ff-atelier-ribbon !py-0.5 !px-2 !text-[9px] hidden sm:inline-flex">
                  Học · Hỏi · Chia sẻ
                </span>
              </div>
            </div>
            <span className="profile-modal-level pc-12-pill text-[10px] font-mono px-2 py-0.5 text-[#f2cc8f]">
              Lv.{currentUser.level}
            </span>
          </div>

          <div className="profile-modal-actions flex items-center justify-end gap-1.5 overflow-x-auto no-scrollbar">
            <div
              className="profile-modal-tabs pc-12-well flex items-center p-1 rounded-xl shrink-0 gap-1"
              role="tablist"
              aria-label="Các mục hồ sơ"
              onKeyDown={(event) => {
                if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
                const currentTarget = event.target instanceof HTMLElement
                  ? event.target.closest<HTMLButtonElement>('[role="tab"]')
                  : null;
                if (!currentTarget) return;
                const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
                const currentIndex = tabs.indexOf(currentTarget);
                if (currentIndex < 0 || tabs.length === 0) return;
                event.preventDefault();
                const nextIndex = event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? tabs.length - 1
                    : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
                tabs[nextIndex].focus();
                tabs[nextIndex].click();
              }}
            >
              <button
                id="profile-tab-overview"
                type="button"
                role="tab"
                aria-controls="profile-tab-panel"
                aria-selected={activeTab === 'overview'}
                tabIndex={activeTab === 'overview' ? 0 : -1}
                onClick={() => setActiveTab('overview')}
                title="Hồ sơ"
                className="profile-modal-tab"
              >
                <UserIcon className="w-4 h-4" aria-hidden="true" /><span>Hồ sơ</span>
              </button>
              <button
                id="profile-tab-stats"
                type="button"
                role="tab"
                aria-controls="profile-tab-panel"
                aria-selected={activeTab === 'stats'}
                tabIndex={activeTab === 'stats' ? 0 : -1}
                onClick={() => setActiveTab('stats')}
                title="Thành tích"
                className="profile-modal-tab"
              >
                <BarChart3 className="w-4 h-4" aria-hidden="true" /><span>Thành tích</span>
              </button>
              <button
                id="profile-tab-card"
                type="button"
                role="tab"
                aria-controls="profile-tab-panel"
                aria-selected={activeTab === 'card'}
                tabIndex={activeTab === 'card' ? 0 : -1}
                onClick={() => setActiveTab('card')}
                title="Thẻ F-Pass"
                className="profile-modal-tab"
              >
                <CreditCard className="w-4 h-4" aria-hidden="true" /><span>F-Pass</span>
              </button>
              <button
                id="profile-tab-shop"
                type="button"
                role="tab"
                aria-controls="profile-tab-panel"
                aria-selected={activeTab === 'shop'}
                tabIndex={activeTab === 'shop' ? 0 : -1}
                onClick={() => setActiveTab('shop')}
                title="Cửa hàng"
                className="profile-modal-tab"
              >
                <ShoppingBag className="w-4 h-4" aria-hidden="true" /><span>Cửa hàng</span>
              </button>
              <button
                id="profile-tab-activity"
                type="button"
                role="tab"
                aria-controls="profile-tab-panel"
                aria-selected={activeTab === 'activity'}
                tabIndex={activeTab === 'activity' ? 0 : -1}
                onClick={() => setActiveTab('activity')}
                title="Hoạt động"
                className="profile-modal-tab"
              >
                <Activity className="w-4 h-4" aria-hidden="true" /><span>Hoạt động</span>
              </button>
              {isOwnProfile && (
                <button
                  id="profile-tab-edit"
                  type="button"
                  role="tab"
                  aria-controls="profile-tab-panel"
                  aria-selected={activeTab === 'edit'}
                  tabIndex={activeTab === 'edit' ? 0 : -1}
                  onClick={() => setActiveTab('edit')}
                  title="Cài đặt"
                  className="profile-modal-tab"
                >
                  <SlidersHorizontal className="w-4 h-4" aria-hidden="true" /><span>Cài đặt</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="pc-12-btn p-2 rounded-lg text-[#d8d5ce] hover:text-[#f4f1de] transition-colors cursor-pointer shrink-0"
              aria-label="Đóng cửa sổ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div role="alert" className="profile-modal-error relative z-10 mb-3 p-2.5 rounded-xl bg-red-950/50 border border-red-500/30 text-xs text-red-300 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab Content Container — khoá cuộn trang tuyệt đối khi đang kéo/lăn chuột chỉnh ảnh */}
        <div
          id="profile-tab-panel"
          role="tabpanel"
          aria-labelledby={`profile-tab-${activeTab}`}
          aria-busy={isBooting}
          tabIndex={0}
          data-profile-scroll-container="true"
          className={`profile-modal-content relative z-10 flex-1 ${
            isAdjustingBanner || Boolean(fbCropModal)
              ? 'overflow-y-hidden overscroll-contain'
              : 'overflow-y-auto'
          } pr-1 space-y-4 no-scrollbar`}
        >
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
              <div
                ref={bannerCardRef}
                onPointerDown={beginBannerDrag}
                className={`pc-12-card relative overflow-hidden ${
                  isAdjustingBanner
                    ? 'cursor-grab active:cursor-grabbing ring-2 ring-[#f2cc8f]/80'
                    : ''
                }`}
              >
                {/* Vùng Banner Đỉnh Thẻ Độc Lập — gọn gàng, không tràn xuống làm đục chữ bên dưới */}
                <div
                  ref={cropStageRef}
                  className={`${
                    isAdjustingBanner ? 'h-52 sm:h-64' : 'h-36 sm:h-44'
                  } relative z-[2] overflow-hidden border-b border-white/10 transition-all duration-200 select-none discord-dynamic-banner--${
                    equippedCombo.highestRarity === 'legendary' ? 'mythic' : equippedCombo.highestRarity
                  }`}
                >
                  <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
                    <GradientSurface gradient={effectiveBannerGradient} className="absolute inset-0 opacity-85" />
                    <img
                      loading="lazy"
                      decoding="async"
                      src={effectiveBannerUrl}
                      alt="Ảnh bìa hồ sơ"
                      style={activeBannerImgStyle}
                      className="w-full h-full transition-transform duration-150"
                    />
                    <div
                      className="absolute inset-0 transition-opacity duration-200"
                      style={{
                        background: `linear-gradient(180deg, rgba(6, 10, 18, 0.08) 0%, rgba(8, 12, 20, ${Math.min(0.72, activeBannerLayout.dim / 100)}) 100%)`,
                      }}
                    />
                  </div>
                  {/* Chế độ đặt lại vị trí trực tiếp kiểu Facebook: kéo ảnh tự do & lăn chuột phóng to (không cuộn trang) */}
                  {isAdjustingBanner && (
                    <div className="absolute inset-0 z-[5] pointer-events-none">
                      {/* Lưới 3×3 mảnh hỗ trợ căn bố cục chuẩn Facebook */}
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-35">
                        <div className="border-r border-b border-white/40" />
                        <div className="border-r border-b border-white/40" />
                        <div className="border-b border-white/40" />
                        <div className="border-r border-b border-white/40" />
                        <div className="border-r border-b border-white/40" />
                        <div className="border-b border-white/40" />
                        <div className="border-r border-white/40" />
                        <div className="border-r border-white/40" />
                        <div />
                      </div>
                      <div className="absolute inset-x-0 top-12 flex justify-center px-3">
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/80 border border-[#f2cc8f]/65 text-[11px] font-bold text-[#f4f1de] shadow-xl backdrop-blur-md">
                          <Move className="w-3.5 h-3.5 text-[#f2cc8f]" />
                          <span>{Math.round(bannerLayout.zoom * 100)}%</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {equippedItem && (
                    <span
                      className="signature-equipped absolute top-2.5 left-3 z-[7]"
                      title={equippedItem.name}
                    >
                      <SignatureEmblem icon={equippedItem.iconType} size={20} /> {equippedItem.name}
                    </span>
                  )}
                  {equippedCombo.theme && (
                    <button
                      type="button"
                      onClick={() => isOwnProfile && openShopAtCategory('Theme Focus')}
                      className="absolute bottom-2 right-3 z-[7] inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-[10px] font-mono text-white/90 hover:border-purple-400/50 transition cursor-pointer"
                      title={equippedCombo.theme.name}
                    >
                      <span className={`rarity-dot ${rarityDotClass(rarityOf(equippedCombo.theme))}`} aria-hidden="true" />
                      <span>{equippedCombo.theme.name}</span>
                    </button>
                  )}
                  {isOwnProfile && (
                    <div className="absolute top-2.5 right-3 z-[8] flex items-center gap-1.5 flex-wrap justify-end">
                      <label
                        htmlFor="overview-banner-upload"
                        className="pc-12-btn px-2.5 py-1 rounded-full text-[10px] font-mono text-white/95 hover:text-amber-300 flex items-center gap-1 cursor-pointer backdrop-blur-md bg-black/65 border border-white/15"
                        title="Ảnh bìa"
                      >
                        <ImageIcon className="w-3 h-3 text-amber-400" />
                        <span>{mediaBusy === 'banner' ? '…' : 'Ảnh bìa'}</span>
                      </label>
                      <input
                        id="overview-banner-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleBannerChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => openFacebookCropper('banner', effectiveBannerUrl)}
                        className="pc-12-btn px-2.5 py-1 rounded-full text-[10px] font-mono flex items-center gap-1 cursor-pointer backdrop-blur-md bg-black/65 text-amber-200 border border-amber-400/35 hover:text-white"
                        title="Cắt ảnh bìa"
                      >
                        <Crop className="w-3 h-3 text-amber-300" />
                        <span>Cắt</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAdjustingBanner((v) => !v);
                          setBannerStudioMode('reposition');
                        }}
                        className={`pc-12-btn px-2.5 py-1 rounded-full text-[10px] font-mono flex items-center gap-1 cursor-pointer backdrop-blur-md border ${
                          isAdjustingBanner
                            ? 'bg-[#f2cc8f] text-[#0b0d12] font-bold border-[#f4f1de]'
                            : 'bg-black/65 text-[#f2cc8f] border-[#f2cc8f]/45 hover:text-[#f4f1de]'
                        }`}
                        title="Vị trí ảnh bìa"
                      >
                        <Move className="w-3 h-3" />
                        <span>{isAdjustingBanner ? 'Đóng' : 'Vị trí'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Thanh đặt lại vị trí & thu phóng */}
                {isOwnProfile && isAdjustingBanner && (
                  <div className="relative z-20 mx-3 sm:mx-5 mt-1 p-3.5 rounded-xl bg-[#0b0d12]/95 border-[1.5px] border-[#f2cc8f]/45 backdrop-blur-xl shadow-2xl space-y-3 animate-fade-up">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-dashed border-[#f4f1de]/15">
                      <span className="text-[11px] font-bold text-[#f2cc8f] inline-flex items-center gap-1.5">
                        <Move className="w-3.5 h-3.5 text-[#f2cc8f]" />
                        <span>Vị trí ảnh bìa</span>
                      </span>

                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setBannerLayout((prev) => ({ ...prev, fit: 'cover' }))}
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-semibold cursor-pointer border transition ${
                            bannerLayout.fit === 'cover'
                              ? 'bg-[#e07a5f]/25 border-[#e07a5f] text-[#f4f1de]'
                              : 'bg-white/5 border-white/10 text-neutral-300 hover:text-white'
                          }`}
                        >
                          Phủ kín
                        </button>
                        <button
                          type="button"
                          onClick={() => setBannerLayout((prev) => ({ ...prev, fit: 'contain' }))}
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-semibold cursor-pointer border transition ${
                            bannerLayout.fit === 'contain'
                              ? 'bg-[#e07a5f]/25 border-[#e07a5f] text-[#f4f1de]'
                              : 'bg-white/5 border-white/10 text-neutral-300 hover:text-white'
                          }`}
                        >
                          Vừa khung
                        </button>
                        <button
                          type="button"
                          onClick={() => openFacebookCropper('banner', effectiveBannerUrl)}
                          className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/45 text-amber-200 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Crop className="w-3 h-3" />
                          <span>Cắt</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                      <div className="flex items-center gap-2 text-neutral-200 bg-white/[0.03] px-3 py-1.5 rounded-xl border border-white/10">
                        <button
                          type="button"
                          onClick={() =>
                            setBannerLayout((prev) => ({
                              ...prev,
                              zoom: Math.max(1, Math.round((prev.zoom - 0.1) * 100) / 100),
                            }))
                          }
                          className="p-1 rounded-lg hover:bg-white/10 text-[#f2cc8f] cursor-pointer"
                          title="Thu nhỏ"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="range"
                          maxLength={4}
                          min={100}
                          max={300}
                          step={2}
                          value={Math.round(bannerLayout.zoom * 100)}
                          onChange={(e) => setBannerLayout((prev) => ({ ...prev, zoom: Number(e.target.value) / 100 }))}
                          className="flex-1 accent-[#f2cc8f] cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setBannerLayout((prev) => ({
                              ...prev,
                              zoom: Math.min(3, Math.round((prev.zoom + 0.1) * 100) / 100),
                            }))
                          }
                          className="p-1 rounded-lg hover:bg-white/10 text-[#f2cc8f] cursor-pointer"
                          title="Phóng to"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <span className="shrink-0 w-11 text-right font-mono text-[10.5px] text-[#f2cc8f]">
                          {Math.round(bannerLayout.zoom * 100)}%
                        </span>
                      </div>

                      <label className="flex items-center gap-2 text-neutral-300 bg-white/[0.03] px-3 py-1.5 rounded-xl border border-white/10">
                        <span className="shrink-0 w-24 font-mono text-[10.5px]">
                          Độ rõ: {100 - bannerLayout.dim}%
                        </span>
                        <input
                          type="range"
                          maxLength={4}
                          min={15}
                          max={90}
                          step={5}
                          value={100 - bannerLayout.dim}
                          onChange={(e) => setBannerLayout((prev) => ({ ...prev, dim: 100 - Number(e.target.value) }))}
                          className="flex-1 accent-amber-400 cursor-pointer"
                        />
                      </label>
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-white/10">
                      <span className="text-[10.5px] font-mono text-neutral-400">
                        Mẫu:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {BUILTIN_COVER_PRESETS.map((preset) => {
                          const isSelected = effectiveBannerUrl === preset.url;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => handleSelectBuiltinCover(preset.url)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold cursor-pointer border transition ${
                                isSelected
                                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300'
                              }`}
                              title={preset.label}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/10 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setBannerLayout(DEFAULT_BANNER_LAYOUT);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/12 border border-white/10 text-[11px] text-neutral-300 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Đặt lại</span>
                      </button>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setIsAdjustingBanner(false)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-white/5 hover:bg-white/12 border border-white/10 text-[11px] font-semibold text-neutral-300 cursor-pointer"
                        >
                          <span>Hủy</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveBannerLayout}
                          className="ff-tactile-btn inline-flex items-center gap-1.5 px-4 py-1 rounded-lg bg-[#e07a5f] hover:bg-[#f2cc8f] text-[#0b0d12] border border-[#f4f1de] text-[11px] font-extrabold cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Lưu</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="relative z-10 p-4 sm:p-6 space-y-5">
                  {/* A. Thanh Định Danh Ngang (Avatar Trái · Thông Tin Giữa · Thao Tác Phải — Không đè lấp) */}
                  <div className="space-y-4 pb-5 border-b border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-end gap-4 min-w-0">
                        <div className="flex flex-col items-start gap-2 shrink-0">
                          <div
                            className={`ff-profile__avatar-wrap relative shrink-0 -mt-14 sm:-mt-16 p-1.5 rounded-full bg-[#0d1420] border border-white/15 z-10 ${isOwnProfile ? 'cursor-pointer group' : ''}`}
                            onClick={() => {
                              if (!isOwnProfile) return;
                              if (ownedDecorationsBySlot.avatar_frame.length > 0 || ownedDecorationsBySlot.avatar_aura.length > 0) {
                                setQuickWardrobeSlot('avatar_frame');
                              } else {
                                openShopAtCategory('Avatar Frame');
                              }
                            }}
                            title={isOwnProfile ? 'Đổi trang trí Avatar' : currentUser.name}
                          >
                            {activeDecoAsset ? (
                              <AvatarWithDecoration
                                avatarUrl={currentUser.avatar}
                                frameAsset={decoFrameAsset}
                                auraAsset={decoAuraAsset}
                                size={112}
                                eager
                                priority="high"
                                className="ff-profile__avatar"
                              />
                            ) : (
                              <div
                                className={`relative w-[112px] h-[112px] rounded-full flex items-center justify-center ${activeAvatarFrameClass}`}
                                style={{ '--orbit-r': '62px' } as React.CSSProperties}
                              >
                                {activeAvatarRarity === 'legendary' &&
                                  Array.from({ length: 6 }, (_, idx) => (
                                    <span
                                      key={idx}
                                      className="mythic-particle"
                                      style={{ animationDelay: `${(-idx * 4) / 6}s` }}
                                      aria-hidden="true"
                                    />
                                  ))}
                                <img
                                  src={currentUser.avatar}
                                  alt={currentUser.name}
                                  onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                                  loading="lazy"
                                  decoding="async"
                                  width={112}
                                  height={112}
                                  className="w-full h-full rounded-full object-cover bg-[#0b0d12] shadow-md"
                                />
                              </div>
                            )}
                            <span className="absolute -bottom-1 -right-1 z-10">
                              <TierBadge level={currentUser.level} size={22} showTooltip={false} />
                            </span>
                          </div>

                          {isOwnProfile && (
                            <div className="flex items-center gap-1.5 pl-1">
                              <label
                                htmlFor="overview-avatar-upload"
                                className="px-2.5 py-0.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-[10px] font-semibold text-neutral-200 hover:text-amber-300 inline-flex items-center gap-1 cursor-pointer transition"
                                title="Đổi ảnh"
                              >
                                <Upload className="w-3 h-3 text-amber-400" />
                                <span>Đổi ảnh</span>
                              </label>
                              <input
                                id="overview-avatar-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => openFacebookCropper('avatar', avatar || currentUser.avatar)}
                                className="px-2.5 py-0.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-[#f2cc8f]/40 text-[10px] font-semibold text-[#f2cc8f] hover:text-[#f4f1de] inline-flex items-center gap-1 cursor-pointer transition"
                                title="Cắt ảnh"
                              >
                                <Crop className="w-3 h-3 text-[#f2cc8f]" />
                                <span>Cắt</span>
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 space-y-2 pb-0.5">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="text-lg sm:text-2xl font-extrabold text-white inline-flex items-center gap-2 min-w-0 tracking-tight">
                              <span className={`truncate ${isSuperAdmin ? 'discord-admin-name' : 'text-white'}`}>
                                {currentUser.name}
                              </span>
                              {isSuperAdmin && <AdminVerifiedBadge size={18} />}
                            </h3>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#81b29a]/18 border border-[#81b29a]/40 text-[#d8f3dc] text-[11px] font-semibold">
                              <UserCheck className="w-3 h-3 text-[#81b29a] shrink-0" />
                              <span>
                                {currentUser.role === 'SUPER_ADMIN'
                                  ? 'Quản trị'
                                  : currentUser.role === 'CLUB_LEADER'
                                  ? 'Chủ nhiệm CLB'
                                  : 'Học sinh'}
                              </span>
                            </span>

                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#e07a5f]/15 border border-[#e07a5f]/40 text-[#f4f1de] text-[11px] font-semibold">
                              <span>{tier.titleVi}</span>
                              <span className="text-white/40">·</span>
                              <span className="font-mono text-[10.5px]">Lv.{currentUser.level}</span>
                            </span>

                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/12 border border-amber-400/25 text-amber-300 text-[11px] font-mono font-bold">
                              <span>{formatCoinBalance(userCoin)} Coin</span>
                            </span>

                            {equippedCombo.mythicTitle && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold bg-amber-500/15 text-amber-200 border border-amber-400/35">
                                <span className={`rarity-dot ${rarityDotClass(equippedCombo.highestRarity)}`} aria-hidden="true" />
                                <span>{equippedCombo.mythicTitle}</span>
                              </span>
                            )}
                          </div>

                          {currentUser.bio && (
                            <p className="text-xs text-neutral-300 leading-relaxed line-clamp-2 max-w-xl">
                              {currentUser.bio}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-end">
                        <div className="flex items-center gap-1.5" title="Thả tim cho thành viên này">
                          <LikeHeartButton
                            count={profileHeartCount}
                            liked={likedByMe}
                            onToggle={handleProfileLike}
                            disabled={!viewerKey}
                          />
                        </div>

                        {!isOwnProfile && (
                          <button
                            type="button"
                            onClick={() => setIsReporting(true)}
                            className="pc-12-btn px-2.5 py-1.5 rounded-xl text-red-300 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
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
                          className="pc-12-btn px-2.5 py-1.5 rounded-xl text-neutral-200 text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title="Chia sẻ hồ sơ"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Chia sẻ</span>
                        </button>
                      </div>
                    </div>

                    {/* Đang trang bị & Tủ đồ nhanh — Bố cục 3 cột rộng rãi, không chồng lấp */}
                    <div className="pt-2 space-y-3" aria-label="Khu vực trang bị đang đeo">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-xs font-bold text-white/90 flex items-center gap-2" title="🎨 Đang trang bị:">
                          <span>Trang bị</span>
                          <span className="px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-[10px] font-mono text-neutral-300">
                            {[userDecorations.nameplate, userDecorations.frame, userDecorations.aura].filter(Boolean).length}/3
                          </span>
                        </div>
                        {isOwnProfile && (
                          <button
                            type="button"
                            onClick={() => openShopAtCategory(null)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/35 border border-purple-400/40 text-purple-200 text-xs font-bold transition cursor-pointer"
                          >
                            <PaletteIcon className="w-3.5 h-3.5" /> Cửa hàng
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          {
                            slotLabel: 'Bảng tên',
                            slot: 'nameplate' as const,
                            filterSlot: 'nameplate' as const,
                            shopCategory: 'Nameplate',
                            item: userDecorations.nameplate,
                            ownedCount: ownedDecorationsBySlot.nameplate.length,
                          },
                          {
                            slotLabel: 'Khung',
                            slot: 'avatar_frame' as const,
                            filterSlot: 'avatar_frame' as const,
                            shopCategory: 'Avatar Frame',
                            item: userDecorations.frame,
                            ownedCount: ownedDecorationsBySlot.avatar_frame.length,
                          },
                          {
                            slotLabel: 'Hào quang',
                            slot: 'avatar_aura' as const,
                            filterSlot: 'avatar_aura' as const,
                            shopCategory: 'Avatar Aura',
                            item: userDecorations.aura,
                            ownedCount: ownedDecorationsBySlot.avatar_aura.length,
                          },
                        ].map((slot) => {
                          const rarity = slot.item?.rarity || 'common';
                          const meta = DECORATION_RARITY_META[rarity];
                          const isSelected = quickWardrobeSlot === slot.filterSlot;
                          return (
                            <div
                              key={slot.slotLabel}
                              className={`flex items-center justify-between gap-2.5 p-3 rounded-xl border transition ${
                                isSelected
                                  ? 'bg-[#e07a5f]/20 border-[#e07a5f]/60 shadow-[2px_2px_0px_rgba(4,6,11,0.9)]'
                                  : 'bg-white/[0.035] hover:bg-white/[0.07] border-white/12'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isOwnProfile) {
                                    openShopAtCategory(slot.shopCategory);
                                    return;
                                  }
                                  setQuickWardrobeSlot(slot.filterSlot);
                                }}
                                className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                                title={slot.item?.name || slot.slotLabel}
                              >
                                {slot.item?.previewUrl ? (
                                  <span className="w-10 h-10 rounded-xl bg-black/50 border border-white/12 p-1 flex items-center justify-center shrink-0">
                                    <img
                                      src={resolveAssetUrl(slot.item.previewUrl) || undefined}
                                      alt=""
                                      loading="lazy"
                                      decoding="async"
                                      width={32}
                                      height={32}
                                      className="w-full h-full object-contain"
                                    />
                                  </span>
                                ) : (
                                  <span
                                    className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0 text-[10px] font-mono text-white/55"
                                    aria-hidden="true"
                                  >
                                    {slot.filterSlot === 'nameplate' ? 'TAG' : slot.filterSlot === 'avatar_frame' ? 'FRM' : 'AUR'}
                                  </span>
                                )}
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center gap-1.5 text-[10.5px] font-mono text-white/70">
                                    <span className="rarity-dot" style={{ background: meta.color }} aria-hidden="true" />
                                    <span>{slot.slotLabel}</span>
                                    {isOwnProfile && (
                                      <span className={isSelected ? 'text-[#f2cc8f] font-bold' : 'text-white/50'}>
                                        · {slot.ownedCount}
                                      </span>
                                    )}
                                  </span>
                                  <strong className="block text-xs font-bold text-white truncate mt-0.5">
                                    {slot.item ? slot.item.name : 'Trống'}
                                  </strong>
                                </span>
                              </button>

                              {isOwnProfile && slot.item && onEquipDecoration && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleEquipDecoration(slot.slot, null);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-red-500/25 border border-white/10 text-[10.5px] font-semibold text-white/75 hover:text-red-300 transition cursor-pointer shrink-0"
                                  title="Gỡ"
                                >
                                  Gỡ
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {isOwnProfile && (
                        <div className="pc-12-well p-3.5 rounded-2xl space-y-3 border border-white/10">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {(
                                [
                                  { id: 'all', label: 'Tất cả', count: ownedDecorationsBySlot.all.length },
                                  { id: 'nameplate', label: 'Bảng tên', count: ownedDecorationsBySlot.nameplate.length },
                                  { id: 'avatar_frame', label: 'Khung', count: ownedDecorationsBySlot.avatar_frame.length },
                                  { id: 'avatar_aura', label: 'Hào quang', count: ownedDecorationsBySlot.avatar_aura.length },
                                ] as const
                              ).map((tab) => (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={() => setQuickWardrobeSlot(tab.id)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                    quickWardrobeSlot === tab.id
                                      ? 'bg-[#e07a5f] text-[#0b0d12] shadow-sm'
                                      : 'bg-white/[0.06] text-neutral-300 hover:text-white'
                                  }`}
                                >
                                  {tab.label} ({tab.count})
                                </button>
                              ))}
                            </div>

                            {ownedDecorationsBySlot.all.length >= 4 && (
                              <input
                                type="text"
                                value={wardrobeSearch}
                                onChange={(e) => setWardrobeSearch(e.target.value)}
                                maxLength={80}
                                placeholder="Tìm..."
                                className="bg-black/40 border border-[#f4f1de]/18 rounded-lg px-2.5 py-1 text-xs text-[#f4f1de] placeholder-neutral-500 focus:outline-none focus:border-[#f2cc8f] w-40"
                              />
                            )}
                          </div>

                          {(() => {
                            const q = wardrobeSearch.trim().toLowerCase();
                            const sourceList = ownedDecorationsBySlot[quickWardrobeSlot];
                            const filteredList = q
                              ? sourceList.filter((item) => item.name.toLowerCase().includes(q))
                              : sourceList;

                            if (filteredList.length === 0) {
                              return (
                                <div className="py-2.5 px-3 rounded-xl bg-black/25 border border-white/5 flex items-center justify-between gap-3 flex-wrap">
                                  <span className="text-xs text-neutral-400">
                                    Trống
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openShopAtCategory(
                                        quickWardrobeSlot === 'nameplate'
                                          ? 'Nameplate'
                                          : quickWardrobeSlot === 'avatar_aura'
                                          ? 'Avatar Aura'
                                          : quickWardrobeSlot === 'avatar_frame'
                                          ? 'Avatar Frame'
                                          : null,
                                      )
                                    }
                                    className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold cursor-pointer transition"
                                  >
                                    Cửa hàng →
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-0.5 no-scrollbar">
                                {filteredList.map((item) => {
                                  const itemSlot: 'nameplate' | 'avatar_frame' | 'avatar_aura' =
                                    item.category === 'Nameplate'
                                      ? 'nameplate'
                                      : item.category === 'Avatar Aura'
                                      ? 'avatar_aura'
                                      : 'avatar_frame';
                                  const isEquipped =
                                    itemSlot === 'nameplate'
                                      ? userDecorations.nameplate?.id === item.id
                                      : itemSlot === 'avatar_frame'
                                      ? userDecorations.frame?.id === item.id
                                      : userDecorations.aura?.id === item.id;
                                  const slotBadgeLabel =
                                    itemSlot === 'nameplate'
                                      ? 'Bảng tên'
                                      : itemSlot === 'avatar_frame'
                                      ? 'Khung'
                                      : 'Hào quang';

                                  if (itemSlot === 'nameplate') {
                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        onClick={() =>
                                          void handleEquipDecoration('nameplate', isEquipped ? null : item.id)
                                        }
                                        className={`flex flex-col justify-between gap-2.5 p-3 rounded-xl border transition cursor-pointer ${
                                          isEquipped
                                            ? 'bg-emerald-500/15 border-emerald-400/70'
                                            : 'bg-black/40 hover:bg-white/[0.07] border-white/12 hover:border-[#f2cc8f]/45'
                                        }`}
                                      >
                                        <span className="w-full h-12 rounded-lg bg-black/55 border border-white/10 flex items-center justify-center px-2 overflow-hidden">
                                          <DecoratedName
                                            name={currentUser.name.replace(/ \(.*\)/, '')}
                                            width={172}
                                            height={32}
                                            animate
                                            overrideAsset={{
                                              id: item.id,
                                              type: 'nameplate',
                                              fullAssetUrl: item.fullAssetUrl,
                                              animatedAssetUrl: item.animatedAssetUrl,
                                              isAnimated: !!item.isAnimated && !!item.animatedAssetUrl,
                                            }}
                                          />
                                        </span>
                                        <span className="w-full flex items-center justify-between text-xs gap-2">
                                          <strong className="text-white truncate">{item.name}</strong>
                                          <span
                                            className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold shrink-0 ${
                                              isEquipped
                                                ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40'
                                                : 'bg-[#f2cc8f]/20 text-[#f2cc8f] border border-[#f2cc8f]/40'
                                            }`}
                                          >
                                            {isEquipped ? 'Đang đeo' : 'Đeo'}
                                          </span>
                                        </span>
                                      </button>
                                    );
                                  }

                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() =>
                                        void handleEquipDecoration(itemSlot, isEquipped ? null : item.id)
                                      }
                                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
                                        isEquipped
                                          ? 'bg-emerald-500/15 border-emerald-400/70'
                                          : 'bg-black/40 hover:bg-white/[0.07] border-white/12 hover:border-[#f2cc8f]/45'
                                      }`}
                                    >
                                      <span className="w-14 h-14 rounded-xl bg-black/55 border border-white/10 shrink-0 flex items-center justify-center p-1.5 overflow-hidden">
                                        <AvatarWithDecoration
                                          avatarUrl={currentUser.avatar || DEFAULT_AVATAR}
                                          decorationAsset={{
                                            id: item.id,
                                            type: itemSlot,
                                            fullAssetUrl: item.fullAssetUrl || item.previewUrl || null,
                                            animatedAssetUrl: item.animatedAssetUrl || null,
                                            isAnimated: Boolean(item.isAnimated && item.animatedAssetUrl),
                                          }}
                                          size={38}
                                          animate
                                          alt={item.name}
                                        />
                                      </span>
                                      <span className="min-w-0 flex-1 space-y-1.5">
                                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9.5px] font-mono text-white/75 inline-block">
                                          {slotBadgeLabel}
                                        </span>
                                        <strong className="block text-xs text-white truncate">
                                          {item.name}
                                        </strong>
                                        <span
                                          className={`inline-block px-2 py-0.5 rounded-md text-[10.5px] font-bold ${
                                            isEquipped
                                              ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40'
                                              : 'bg-[#f2cc8f]/20 text-[#f2cc8f] border border-[#f2cc8f]/40'
                                          }`}
                                        >
                                          {isEquipped ? 'Đang đeo' : 'Đeo'}
                                        </span>
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Hệ SVG cũ — giữ tới khi migration A/B được áp dụng */}
                      {(equippedCombo.theme || equippedCombo.corner) && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          {[
                            { slotLabel: 'Theme', category: 'Theme Focus', item: equippedCombo.theme },
                            { slotLabel: 'Góc hồ sơ', category: 'Góc hồ sơ', item: equippedCombo.corner },
                          ].map((slot) => {
                            const slotRarity = slot.item ? rarityOf(slot.item) : 'common';
                            const dot = slot.item ? rarityDotClass(slotRarity) : 'common';
                            return (
                              <span key={slot.category} className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openShopAtCategory(null)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/12 hover:border-purple-400/45 text-[11px] text-white/90 transition cursor-pointer"
                                  title={`Mở Boutique · Đổi ${slot.category}`}
                                >
                                  <span className={`rarity-dot ${dot}`} aria-hidden="true" />
                                  <span className="text-white/55 font-mono">{slot.slotLabel}:</span>
                                  <strong className="font-bold text-white">
                                    {slot.item ? slot.item.name : 'Chưa gắn'}
                                  </strong>
                                </button>
                                {isOwnProfile && slot.item && (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void handleEquipItem(slot.item!.id);
                                    }}
                                    className="px-1.5 py-1 rounded-lg bg-white/[0.06] hover:bg-red-500/25 border border-white/10 text-[10px] text-white/60 hover:text-red-300 transition cursor-pointer"
                                    title={`Gỡ ${slot.category}`}
                                  >
                                    Gỡ
                                  </button>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bento thành tích: 6 chỉ số thật */}
                  <div className="signature-stats-wrap">
                    <div className="signature-stats-heading"><span>Thành tích</span></div>
                    <div className="signature-stats-grid">
                      {([
                        { label: 'Điểm số', value: statsMetrics.xp, icon: <Sparkles size={19} />, detail: 'XP', featured: true },
                        { label: 'Cảm ơn', value: statsMetrics.thanks, icon: <Heart size={19} />, detail: 'Cảm ơn' },
                        { label: 'Hay nhất', value: statsMetrics.bestSolutions, icon: <Award size={19} />, detail: 'Hay nhất', featured: true },
                        { label: '5 Sao', value: statsMetrics.fiveStar, icon: <Star size={19} />, detail: '5 Sao' },
                        { label: 'Xác thực', value: statsMetrics.verified, icon: <CheckCircle2 size={19} />, detail: 'Xác thực' },
                        { label: 'Đã giúp', value: statsMetrics.helped, icon: <Users size={19} />, detail: 'Đã giúp' },
                      ] as const).map((metric) => (
                        <PremiumStat key={metric.label} {...metric} />
                      ))}
                    </div>
                  </div>

                  {/* B. Khối Danh Hiệu & Chill Box */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-white/10">
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

                      <button
                        type="button"
                        onClick={() => setIsRankSheetOpen(true)}
                        title="Bảng cấp bậc"
                        className="pc-12-well p-2.5 flex items-center gap-2.5 w-full text-left cursor-pointer transition-colors hover:border-amber-400/40"
                      >
                        <TierSvg tierNumber={tier.tierNumber} size={36} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate">
                            {isSuperAdmin ? 'Quản trị' : `${tier.roman}. ${tier.name}`}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono truncate">
                            Lv.{currentUser.level} · {statsMetrics.xp.toLocaleString()} XP
                          </div>
                        </div>
                        <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      </button>

                      {/* Tre Việt — 8 Cấp Độ */}
                      <div className="pc-12-well p-2.5 space-y-2" aria-label="Hành trình 8 cấp độ Tre Việt">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-emerald-300 uppercase tracking-wider font-mono">
                            Tre Việt ({tier.tierNumber}/8)
                          </span>
                          <span className="text-neutral-400 font-mono">
                            {tier.minPoints.toLocaleString('vi-VN')} điểm
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {TIER_CONFIGS.map((t) => {
                            const unlocked = currentUser.level >= t.minLevel;
                            const isCurrentTier = t.tierNumber === tier.tierNumber;
                            return (
                              <button
                                key={t.tierNumber}
                                type="button"
                                onClick={() => setIsRankSheetOpen(true)}
                                title={`${t.roman}. ${t.name}`}
                                className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition cursor-pointer ${
                                  isCurrentTier
                                    ? 'bg-white/[0.09] border-amber-400/60 shadow-[0_0_12px_rgba(251,191,36,0.22)]'
                                    : unlocked
                                    ? 'bg-white/[0.04] border-white/15 hover:border-white/30'
                                    : 'bg-black/25 border-white/5 opacity-45 hover:opacity-80'
                                }`}
                              >
                                <TierSvg tierNumber={t.tierNumber} size={26} />
                                <span className="text-[9px] font-bold text-white/90 truncate max-w-full mt-1">
                                  {t.name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {earnedBadgesList.length > 0 && (
                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          {earnedBadgesList.map((b, index) => (
                            <div
                              key={b.id}
                              style={{ '--i': index } as React.CSSProperties}
                              className={`ac-01__card pc-12-well p-2 border text-center flex flex-col items-center justify-center relative ${b.color}`}
                              title={b.name}
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
                        Bảng cấp bậc
                      </button>
                    </div>

                    {/* CHILL BOX & KỆ SÁCH */}
                    <div className="space-y-3">
                      {SHOP_ITEMS.some((i) => userInventory.includes(i.id)) && (
                        <TrophyShelf
                          inventory={userInventory}
                          items={SHOP_ITEMS}
                          equippedId={currentUser.equippedBadge}
                          onOpenShop={isOwnProfile ? () => setActiveTab('shop') : undefined}
                        />
                      )}

                      <BookshelfPanel
                        key={profileKey}
                        ownerKey={profileKey}
                        ownerName={currentUser.name}
                        canEdit={isOwnProfile}
                      />
                    </div>
                  </div>
                  {/* C. Khối Biểu Đồ Mạng Nhện (Radar Spider Chart) */}
                  <div className="pb-4 border-b border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-mono">
                        <BarChart3 className="w-4 h-4 text-amber-400" />
                        Môn học
                      </span>
                      <span className="pc-12-pill px-2.5 py-0.5 text-[10px] text-amber-400 font-mono">
                        {userSolutions.length} bài
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      <div className="md:col-span-6 flex flex-col items-center justify-center p-3 pc-12-well h-[270px]">
                        <RadarSpiderChart
                          data={radarAxes}
                          max={100}
                          stroke="#EAB308"
                          fill="rgba(14, 165, 233, 0.25)"
                          dotFill="#06b6d4"
                          title="Môn học"
                        />
                      </div>

                      <div className="md:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="pc-12-well p-3 space-y-1.5">
                          <span className="text-xs font-bold text-white block">KHTN</span>
                          <div className="text-amber-400/90 text-xs font-mono leading-relaxed">
                            Toán ({subjectCounts.toan || 0}) · Lý ({subjectCounts.ly || 0}) · Hóa ({subjectCounts.hoa || 0}) · Sinh ({subjectCounts.sinh || 0})
                          </div>
                        </div>

                        <div className="pc-12-well p-3 space-y-1.5">
                          <span className="text-xs font-bold text-white block">KHXH</span>
                          <div className="text-amber-400 text-xs font-mono leading-relaxed">
                            Văn ({subjectCounts.van || 0}) · Sử ({subjectCounts.su || 0}) · Địa ({subjectCounts.dia || 0})
                          </div>
                        </div>

                        <div className="pc-12-well p-3 space-y-1.5">
                          <span className="text-xs font-bold text-white block">KHCN</span>
                          <div className="text-amber-400 text-xs font-mono leading-relaxed">
                            Tin ({subjectCounts.tin || 0}) · Công nghệ ({(subjectCounts.congnghe || 0) + (subjectCounts.hotro || 0)})
                          </div>
                        </div>

                        <div className="pc-12-well p-3 space-y-1.5">
                          <span className="text-xs font-bold text-white block">Ngoại Ngữ &amp; Nghệ Thuật</span>
                          <div className="text-amber-300 text-xs font-mono leading-relaxed">
                            Anh ({subjectCounts.anh || 0}) · Nghệ thuật ({(subjectCounts.tamsu || 0) + (subjectCounts.share || 0) + (subjectCounts.kinhnghiem || 0) + (subjectCounts.tamly || 0)})
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* D. Thanh Tóm Tắt Tài Khoản & Lối Tắt Hoạt Động */}
                  <div className="pc-12-well flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 text-xs">
                    <div className="flex items-center gap-2.5 flex-wrap text-neutral-300">
                      <span className="text-neutral-400">Tham gia:</span>
                      <span className="text-white font-mono font-semibold">{accountJoinedInfo.joinedDateStr}</span>
                      <span>·</span>
                      <span className="text-white font-mono font-semibold">{accountJoinedInfo.ageStr}</span>
                      <span>·</span>
                      <span>
                        Trả lời: <b className="text-[#f2cc8f] font-mono">{statsMetrics.answersCount}</b>
                      </span>
                      <span>·</span>
                      <span>
                        Câu hỏi: <b className="text-white font-mono">{userQuestions.length}</b>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('activity')}
                      className="pc-12-btn px-3 py-1.5 rounded-xl text-xs font-bold text-[#f2cc8f] hover:text-white inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Hoạt động →</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="profile-statistics space-y-4 ff-tab-panel-enter">
              <section className="pc-12-card profile-statistics-hero p-4 sm:p-5">
                <div className="profile-statistics-heading">
                  <div>
                    <span className="profile-modal-kicker">SỔ THEO DÕI / HỎI ĐÁP</span>
                    <h3>Hành trình học tập</h3>
                    <p>Các chỉ số lấy từ hoạt động và hồ sơ đang có.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('activity')}
                    className="pc-12-btn profile-statistics-link"
                  >
                    <Activity className="w-4 h-4" aria-hidden="true" />
                    <span>Xem hoạt động</span>
                  </button>
                </div>

                <div className="signature-stats-wrap mt-5">
                  <div className="signature-stats-heading">
                    <span>Thành tích</span>
                    <span>Hồ sơ hiện tại</span>
                  </div>
                  <div className="signature-stats-grid">
                    {([
                      { label: 'Điểm số', value: statsMetrics.xp, icon: <Sparkles size={19} />, detail: 'XP', featured: true },
                      { label: 'Cảm ơn', value: statsMetrics.thanks, icon: <Heart size={19} />, detail: 'Cảm ơn' },
                      { label: 'Hay nhất', value: statsMetrics.bestSolutions, icon: <Award size={19} />, detail: 'Đáp án được chọn', featured: true },
                      { label: '5 Sao', value: statsMetrics.fiveStar, icon: <Star size={19} />, detail: '5 Sao' },
                      { label: 'Xác thực', value: statsMetrics.verified, icon: <CheckCircle2 size={19} />, detail: 'Xác thực' },
                      { label: 'Đã giúp', value: statsMetrics.helped, icon: <Users size={19} />, detail: 'Đã giúp' },
                    ] as const).map((metric) => (
                      <PremiumStat key={metric.label} {...metric} />
                    ))}
                  </div>
                </div>

                <div className="profile-statistics-totals" role="group" aria-label="Tổng hoạt động hỏi đáp">
                  <span><strong>{userQuestions.length}</strong> câu hỏi đã đăng</span>
                  <span><strong>{statsMetrics.answersCount}</strong> lời giải đã gửi</span>
                  <span><strong>{statsMetrics.bestSolutions}</strong> đáp án hay nhất</span>
                </div>
              </section>

              <section className="pc-12-card profile-subject-panel p-4 sm:p-5">
                <div className="profile-statistics-heading">
                  <div>
                    <span className="profile-modal-kicker">BẢN ĐỒ MÔN HỌC</span>
                    <h3>Nhịp học theo nhóm</h3>
                    <p>Biểu đồ quy đổi tương đối từ câu hỏi và lời giải, không phải điểm số. Các số bên cạnh là lời giải đã gửi.</p>
                  </div>
                </div>
                <div className="profile-subject-layout">
                  <div className="profile-subject-chart">
                    {userQuestions.length + userSolutions.length > 0 ? (
                      <RadarSpiderChart
                        data={radarAxes}
                        max={100}
                        stroke="#EAB308"
                        fill="rgba(129, 178, 154, 0.25)"
                        dotFill="#e07a5f"
                        title="Hoạt động theo nhóm môn học"
                      />
                    ) : (
                      <div className="profile-statistics-empty">
                        <BarChart3 className="w-7 h-7" aria-hidden="true" />
                        <span>Chưa có hoạt động để lập bản đồ.</span>
                      </div>
                    )}
                  </div>
                  <div className="profile-subject-counts">
                    {[
                      { label: 'Khoa học tự nhiên', detail: `Toán ${subjectCounts.toan || 0} · Lý ${subjectCounts.ly || 0} · Hóa ${subjectCounts.hoa || 0} · Sinh ${subjectCounts.sinh || 0}` },
                      { label: 'Khoa học xã hội', detail: `Văn ${subjectCounts.van || 0} · Sử ${subjectCounts.su || 0} · Địa ${subjectCounts.dia || 0} · GDCD ${subjectCounts.gdcd || 0}` },
                      { label: 'Công nghệ', detail: `Tin ${subjectCounts.tin || 0} · Công nghệ ${(subjectCounts.congnghe || 0) + (subjectCounts.hotro || 0)}` },
                      { label: 'Ngoại ngữ', detail: `Tiếng Anh ${subjectCounts.anh || 0}` },
                      { label: 'Đời sống & nghệ thuật', detail: `Tâm sự ${(subjectCounts.tamsu || 0) + (subjectCounts.tamly || 0)} · Chia sẻ ${(subjectCounts.share || 0) + (subjectCounts.kinhnghiem || 0)}` },
                    ].map((group) => (
                      <div className="profile-subject-count" key={group.label}>
                        <strong>{group.label}</strong>
                        <span>Lời giải: {group.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: 3D Hologram Student Card */}
          {activeTab === 'card' && (
            <div className="space-y-4 ff-tab-panel-enter">
              <HologramStudentCard
                user={currentUser}
                questionsAskedCount={userQuestions.length}
                solutionsApprovedCount={userSolutions.length}
              />
            </div>
          )}

          {/* TAB 3: Chill Box Shop GUI (12 Custom SVG Items in 3D Rounded Cards) */}
          {activeTab === 'shop' && (
            <div className="ff-tab-panel-enter">
              <GachaBoutique
                inventory={userInventory}
                equippedDecorations={currentUser.equippedDecorations}
                coin={userCoin}
                ownership={shopOwnership}
                userName={currentUser.name}
                userAvatar={currentUser.avatar}
                initialCategoryFilter={shopCategoryJump}
                readOnly={!isOwnProfile}
                onBuy={handleBuyItem}
                onEquip={(item, nextItemId) => {
                  const slot = item.category === 'Nameplate' ? 'nameplate' : item.category === 'Avatar Aura' ? 'avatar_aura' : 'avatar_frame';
                  void handleEquipDecoration(slot, nextItemId);
                }}
                wishlist={currentUser.wishlist || []}
                onToggleWishlist={(item) => {
                  if (!isOwnProfile) return;
                  onToggleWishlist?.(item);
                }}
              />
            </div>
          )}

          {/* TAB 4: Activity History (Questions & Solutions) */}
          {activeTab === 'activity' && (
            <div className="space-y-4 ff-tab-panel-enter">
              <div className="pc-12-card profile-activity-summary p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-300">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-neutral-400">Tham gia</span>
                  <strong className="text-white font-mono">{accountJoinedInfo.joinedDateStr}</strong>
                  <span aria-hidden="true">·</span>
                  <span className="text-white font-mono">{accountJoinedInfo.ageStr}</span>
                </div>
                <div className="profile-activity-metrics">
                  <span><b>{userQuestions.length}</b> câu hỏi</span>
                  <span><b>{statsMetrics.answersCount}</b> lời giải</span>
                  <span><b>{statsMetrics.bestSolutions}</b> đáp án hay nhất</span>
                </div>
              </div>

              {/* Real question and solution events, in one newest-first timeline. */}
              <div className="profile-activity-feed" aria-label="Dòng thời gian hỏi đáp">
                {profileActivity.length === 0 ? (
                  <div className="pc-12-card profile-activity-empty py-10 text-center text-neutral-400 space-y-2" role="status">
                    <HelpCircle className="w-7 h-7 text-neutral-500 mx-auto" aria-hidden="true" />
                    <p className="text-xs">Chưa có hoạt động hỏi đáp.</p>
                  </div>
                ) : (
                  profileActivity.map((entry) => entry.kind === 'question' ? (
                    <article key={entry.id} className="pc-12-card profile-activity-item profile-activity-item--question p-3.5 space-y-1.5">
                      <div className="profile-activity-item-head">
                        <span className="pc-12-pill profile-activity-kind profile-activity-kind--question">Câu hỏi · #{entry.question.subject}</span>
                        <time className="profile-activity-time" dateTime={entry.question.createdAt}>{entry.createdAt}</time>
                      </div>
                      <h4>{entry.question.title}</h4>
                      <p>{entry.question.content}</p>
                    </article>
                  ) : (() => {
                    const parentQuestion = questions.find((question) => question.id === entry.solution.questionId);
                    return (
                      <article key={entry.id} className="pc-12-card profile-activity-item profile-activity-item--solution p-3.5 space-y-1.5">
                        <div className="profile-activity-item-head">
                          <span className="pc-12-pill profile-activity-kind profile-activity-kind--solution">Lời giải</span>
                          <time className="profile-activity-time" dateTime={entry.solution.createdAt}>{entry.createdAt}</time>
                        </div>
                        {parentQuestion && <h4 className="profile-activity-parent">Trả lời: {parentQuestion.title}</h4>}
                        <p>{entry.solution.content}</p>
                        {entry.solution.isBest && <span className="profile-activity-best"><CheckCircle2 size={13} aria-hidden="true" /> Đáp án hay nhất</span>}
                      </article>
                    );
                  })())
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Edit Profile Form */}
          {activeTab === 'edit' && isOwnProfile && (
            <form onSubmit={handleSubmit} className="space-y-4 ff-tab-panel-enter">
              <div
                onPointerDown={beginBannerDrag}
                onWheel={handleBannerWheel}
                className="pc-12-card relative overflow-hidden"
              >
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
                  <GradientSurface gradient={profileGradient} className="absolute inset-0 opacity-80" />
                  <img
                    loading="lazy"
                    decoding="async"
                    src={effectiveBannerUrl}
                    alt="Ảnh bìa xem trước"
                    style={activeBannerImgStyle}
                    className="w-full h-full transition-transform duration-150"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(180deg, rgba(6, 10, 18, 0.04) 0%, rgba(8, 12, 20, ${Math.max(0.12, (activeBannerLayout.dim - 14) / 100)}) 210px, rgba(8, 12, 20, ${Math.min(0.82, (activeBannerLayout.dim + 12) / 100)}) 100%)`,
                    }}
                  />
                </div>

                <div
                  className="relative z-[2] h-44 sm:h-56 overflow-hidden bg-transparent group cursor-grab active:cursor-grabbing select-none"
                >
                  <div className="absolute inset-0 bg-black/15 group-hover:bg-black/30 transition-colors flex flex-col items-center justify-center gap-2 px-3">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <label
                        htmlFor="banner-upload"
                        className="pc-12-btn px-3.5 py-1.5 rounded-full text-xs font-bold text-white hover:text-amber-300 flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                        <span>{mediaBusy === 'banner' ? '…' : 'Ảnh bìa'}</span>
                      </label>
                      {effectiveBannerUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() => openFacebookCropper('banner', effectiveBannerUrl)}
                            disabled={mediaBusy === 'banner'}
                            className="pc-12-btn px-3 py-1.5 rounded-full text-xs font-bold text-amber-200 hover:text-amber-100 flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
                            title="Cắt ảnh bìa"
                          >
                            <Crop className="w-3.5 h-3.5 text-amber-300" />
                            <span>Cắt</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBannerUrl('');
                              setBannerLayout(DEFAULT_BANNER_LAYOUT);
                            }}
                            className="pc-12-btn p-1.5 rounded-full text-rose-300 hover:text-rose-200 cursor-pointer"
                            title="Gỡ ảnh bìa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
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
                </div>

                {effectiveBannerUrl && (
                  <div className="relative z-10 px-4 py-2.5 bg-black/45 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px]">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <ZoomOut className="w-3.5 h-3.5 text-[#f2cc8f] shrink-0" />
                      <span className="font-mono text-[10.5px] text-neutral-300 w-16 shrink-0">
                        {Math.round(bannerLayout.zoom * 100)}%
                      </span>
                      <input
                        type="range"
                        min={100}
                        max={250}
                        step={2}
                        value={Math.round(bannerLayout.zoom * 100)}
                        onChange={(e) =>
                          setBannerLayout((prev) => ({ ...prev, zoom: Number(e.target.value) / 100 }))
                        }
                        className="flex-1 accent-[#f2cc8f] cursor-pointer"
                      />
                      <ZoomIn className="w-3.5 h-3.5 text-[#f2cc8f] shrink-0" />
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setBannerLayout((prev) => ({ ...prev, fit: 'cover' }))}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border cursor-pointer ${
                          bannerLayout.fit === 'cover'
                            ? 'bg-[#e07a5f]/25 border-[#e07a5f] text-[#f4f1de]'
                            : 'bg-white/5 border-white/10 text-neutral-300'
                        }`}
                      >
                        Phủ kín
                      </button>
                      <button
                        type="button"
                        onClick={() => setBannerLayout((prev) => ({ ...prev, fit: 'contain' }))}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border cursor-pointer ${
                          bannerLayout.fit === 'contain'
                            ? 'bg-[#e07a5f]/25 border-[#e07a5f] text-[#f4f1de]'
                            : 'bg-white/5 border-white/10 text-neutral-300'
                        }`}
                      >
                        Vừa khung
                      </button>
                      <button
                        type="button"
                        onClick={() => setBannerLayout(DEFAULT_BANNER_LAYOUT)}
                        className="px-2 py-0.5 rounded-lg text-[10px] bg-white/5 hover:bg-white/12 border border-white/10 text-neutral-300 cursor-pointer"
                      >
                        Đặt lại
                      </button>
                    </div>
                  </div>
                )}

                <div className="relative z-10 p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-4">
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
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400/70 shadow-xl bg-[#0b0d12]"
                      />
                      <label
                        htmlFor="avatar-upload"
                        className="absolute inset-0 bg-black/65 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] text-white font-medium"
                      >
                        <Upload className="w-4 h-4 mb-0.5" />
                        {mediaBusy === 'avatar' ? '…' : 'Đổi ảnh'}
                      </label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
                        <h5 className={`text-lg font-extrabold leading-tight truncate ${isSuperAdmin ? 'discord-admin-name' : 'text-white'}`}>
                          {name || 'Học sinh'}
                        </h5>
                        {isSuperAdmin && <AdminVerifiedBadge size={14} />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <TierBadge level={currentUser.level} size={18} showTooltip={false} />
                        <span className="text-xs text-amber-300 font-mono font-semibold">
                          {tier.titleVi} · Lv.{currentUser.level}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 min-w-0 w-full sm:w-[300px]">
                    <span className="text-[10px] font-mono text-neutral-400 block">
                      Màu nền
                    </span>
                    <div className="pc-12-well p-2 rounded-2xl w-full">
                      <GradientSwatchPicker
                        label="Màu nền"
                        value={resolveProfileGradientId(profileGradient)}
                        onChange={id => setProfileGradient(getGradient(id).css)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pc-12-card p-4 space-y-3.5">
                <div>
                  <label htmlFor="ten-hien-thi" className="block text-xs font-semibold text-neutral-300 mb-1">
                    Tên
                  </label>
                  <input id="ten-hien-thi"
                    type="text"
                    value={name}
                    maxLength={50}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pc-12-well px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors"
                    placeholder="Họ và tên..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-neutral-300">
                      Tiểu sử
                    </label>
                    <span
                      className={`text-[11px] font-mono ${
                        bio.length >= 95 ? 'text-amber-400 font-bold' : 'text-neutral-400'
                      }`}
                    >
                      {bio.length}/100
                    </span>
                  </div>
                  <textarea
                    value={bio}
                    onChange={(e) => {
                      if (e.target.value.length <= 100) setBio(e.target.value);
                    }}
                    rows={2}
                    maxLength={100}
                    placeholder="Giới thiệu ngắn..."
                    className="w-full pc-12-well px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Giới tính
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full pc-12-well px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer bg-[#0b1018]"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="lop-khoa-hoc" className="block text-xs font-semibold text-neutral-300 mb-1">
                      Lớp
                    </label>
                    <input id="lop-khoa-hoc"
                      type="text"
                      value={className}
                      maxLength={50}
                      onChange={(e) => setClassName(e.target.value)}
                      placeholder="VD: 11A1"
                      className="w-full pc-12-well px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label htmlFor="thanh-pho" className="block text-xs font-semibold text-neutral-300 mb-1">
                      Thành phố
                    </label>
                    <input id="thanh-pho"
                      type="text"
                      value={city}
                      maxLength={50}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="VD: Đà Nẵng"
                      className="w-full pc-12-well px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className="pc-12-btn px-4 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || mediaBusy !== null}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:opacity-90 active:scale-95 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-[0_4px_16px_rgba(245,158,11,0.4)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Đang lưu...' : mediaBusy ? '…' : 'Lưu'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Tố Cáo Modal Popup — portaled to document.body */}
      {isReporting && typeof document !== 'undefined' && createPortal(
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-up"
        >
          <div className="pc-12-shell w-full max-w-md rounded-2xl border border-red-500/40 shadow-2xl p-6 relative">
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
                {reportErrorMsg && (
                  <p role="alert" className="ff-report-error">{reportErrorMsg}</p>
                )}
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
        </div>,
        document.body
      )}

      {/* Modal Cắt & Đặt Lại Vị Trí Ảnh Chuẩn Facebook (Dùng cho cả Ảnh Đại Diện hình tròn & Ảnh Bìa hồ sơ) */}
      {fbCropModal && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={fbCropModal.kind === 'avatar' ? 'Cắt và căn chỉnh ảnh đại diện' : 'Cắt và căn chỉnh ảnh bìa'}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSavingFbCrop) setFbCropModal(null);
          }}
          className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 bg-black/88 backdrop-blur-md animate-fade-up select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-container w-full max-w-2xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-dashed border-[#f4f1de]/15 bg-[#0b0d12]/60">
              <h3 className="text-base font-extrabold text-[#f4f1de]">
                {fbCropModal.kind === 'avatar' ? 'Cắt ảnh đại diện' : 'Cắt ảnh bìa'}
              </h3>
              <button
                type="button"
                onClick={() => !isSavingFbCrop && setFbCropModal(null)}
                className="p-2 rounded-lg bg-[#0b0d12] border border-[#f4f1de]/18 text-[#d8d5ce] hover:text-[#f4f1de] cursor-pointer"
                aria-label="Đóng trình cắt ảnh"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sân khấu kéo ảnh dưới mặt nạ cố định kiểu Facebook (Kèm native wheel listener chống cuộn trang) */}
            <div className="p-4 sm:p-6 bg-[#0b0d12] flex flex-col items-center justify-center">
              <div
                ref={fbCropStageRef}
                onPointerDown={beginFbCropDrag}
                className={`relative overflow-hidden bg-[#04070d] border border-[#f4f1de]/20 shadow-2xl cursor-grab active:cursor-grabbing ${
                  fbCropModal.kind === 'avatar'
                    ? 'w-[280px] h-[280px] sm:w-[330px] sm:h-[330px] rounded-2xl'
                    : 'w-full max-w-[580px] aspect-[12/10] sm:aspect-[14/10] rounded-2xl'
                }`}
              >
                <img
                  loading="lazy"
                  decoding="async"
                  src={fbCropModal.src}
                  alt="Ảnh đang căn chỉnh"
                  style={facebookCropImageStyle(fbCropModal.config)}
                  className="w-full h-full pointer-events-none select-none"
                />

                {/* Mặt nạ (Mask) chuẩn Facebook: hình tròn cho Avatar, khung chữ nhật cho Ảnh bìa */}
                {fbCropModal.kind === 'avatar' ? (
                  <div
                    className="absolute inset-4 sm:inset-5 rounded-full border-2 border-[#f2cc8f] pointer-events-none"
                    style={{
                      boxShadow: '0 0 0 9999px rgba(4, 7, 13, 0.68)',
                    }}
                  />
                ) : (
                  <div
                    className="absolute inset-3 sm:inset-4 rounded-xl border-2 border-[#f2cc8f] pointer-events-none flex flex-col items-center justify-center"
                    style={{
                      boxShadow: '0 0 0 9999px rgba(4, 7, 13, 0.58)',
                    }}
                  >
                    {/* Vòng tròn định vị Avatar trên Ảnh bìa giúp người dùng căn mặt/chủ thể không bị che */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-dashed border-white/45 bg-black/25 flex items-center justify-center text-[9.5px] font-mono text-white/75">
                      Vị trí Avatar
                    </div>
                  </div>
                )}

                <div
                  className={`absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none transition-opacity duration-150 ${
                    isDraggingFbCrop ? 'opacity-70' : 'opacity-25'
                  }`}
                >
                  <div className="border-r border-b border-white/45" />
                  <div className="border-r border-b border-white/45" />
                  <div className="border-b border-white/45" />
                  <div className="border-r border-b border-white/45" />
                  <div className="border-r border-b border-white/45" />
                  <div className="border-b border-white/45" />
                  <div className="border-r border-white/45" />
                  <div className="border-r border-white/45" />
                  <div />
                </div>
              </div>

              <div className="w-full max-w-[520px] mt-4 space-y-3">
                <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-[#151a26] border border-[#f4f1de]/15">
                  <button
                    type="button"
                    onClick={() =>
                      setFbCropModal((prev) =>
                        prev
                          ? {
                              ...prev,
                              config: {
                                ...prev.config,
                                zoom: Math.max(1, Math.round((prev.config.zoom - 0.1) * 100) / 100),
                              },
                            }
                          : null,
                      )
                    }
                    className="p-1.5 rounded-lg bg-[#0b0d12] hover:bg-[#f2cc8f]/20 text-[#f2cc8f] cursor-pointer"
                    title="Thu nhỏ"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <input
                    type="range"
                    maxLength={4}
                    min={100}
                    max={300}
                    step={2}
                    value={Math.round(fbCropModal.config.zoom * 100)}
                    onChange={(e) =>
                      setFbCropModal((prev) =>
                        prev
                          ? {
                              ...prev,
                              config: {
                                ...prev.config,
                                zoom: Number(e.target.value) / 100,
                              },
                            }
                          : null,
                      )
                    }
                    className="flex-1 accent-[#f2cc8f] cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFbCropModal((prev) =>
                        prev
                          ? {
                              ...prev,
                              config: {
                                ...prev.config,
                                zoom: Math.min(3, Math.round((prev.config.zoom + 0.1) * 100) / 100),
                              },
                            }
                          : null,
                      )
                    }
                    className="p-1.5 rounded-lg bg-[#0b0d12] hover:bg-[#f2cc8f]/20 text-[#f2cc8f] cursor-pointer"
                    title="Phóng to"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-right font-mono text-xs font-bold text-[#f2cc8f]">
                    {Math.round(fbCropModal.config.zoom * 100)}%
                  </span>
                </div>

                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      setFbCropModal((prev) =>
                        prev
                          ? {
                              ...prev,
                              config: {
                                ...prev.config,
                                rotation: (prev.config.rotation + 90) % 360,
                              },
                            }
                          : null,
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-[#151a26] hover:bg-[#f4f1de]/10 border border-[#f4f1de]/15 text-xs font-semibold text-[#f4f1de] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-[#f2cc8f]" />
                    <span>Xoay 90°</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFbCropModal((prev) =>
                        prev
                          ? {
                              ...prev,
                              config: {
                                ...prev.config,
                                flipH: !prev.config.flipH,
                              },
                            }
                          : null,
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                      fbCropModal.config.flipH
                        ? 'bg-[#e07a5f]/25 border-[#e07a5f] text-[#f4f1de]'
                        : 'bg-[#151a26] hover:bg-[#f4f1de]/10 border-[#f4f1de]/15 text-[#f4f1de]'
                    }`}
                  >
                    <FlipHorizontal className="w-3.5 h-3.5 text-[#f2cc8f]" />
                    <span>Lật ngang</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFbCropModal((prev) =>
                        prev
                          ? {
                              ...prev,
                              config: { ...DEFAULT_FB_CROP_CONFIG, zoom: 1.08 },
                            }
                          : null,
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-[#151a26] hover:bg-[#f4f1de]/10 border border-[#f4f1de]/15 text-xs font-semibold text-[#d8d5ce] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Đặt lại</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="px-5 sm:px-6 py-4 border-t border-dashed border-[#f4f1de]/15 bg-[#0b0d12]/60 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSavingFbCrop}
                onClick={() => setFbCropModal(null)}
                className="px-4 py-2 rounded-xl bg-[#0b0d12] hover:bg-[#f4f1de]/10 border border-[#f4f1de]/18 text-xs sm:text-sm font-bold text-[#d8d5ce] hover:text-[#f4f1de] cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSavingFbCrop}
                onClick={() => void handleConfirmFacebookCrop()}
                className="ff-tactile-btn px-5 py-2 rounded-xl bg-[#e07a5f] hover:bg-[#f2cc8f] text-[#0b0d12] border border-[#f4f1de] font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isSavingFbCrop ? 'Đang lưu…' : 'Lưu'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
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
  onEquipDecoration,
  onToggleWishlist,
  initialTab = 'overview',
  questions = [],
  solutions = [],
  shopOwnership,
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
      onEquipDecoration={onEquipDecoration}
      onToggleWishlist={onToggleWishlist}
      initialTab={initialTab}
      questions={questions}
      solutions={solutions}
      shopOwnership={shopOwnership}
    />
  );
};

export default ProfileModal;
