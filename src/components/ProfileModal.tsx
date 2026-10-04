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
  BookOpen,
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
  GraduationCap,
  Rocket,
  Sprout,
  ImagePlus,
  Trash2,
} from 'lucide-react';
import { COVER_MAX_BYTES, saveCover, deleteCover, useCoverUrl } from '../utils/coverStore';
import type { User, Question, Solution, ShopItem, ShopTierColor } from '../types';
import { TierBadge, AdminVerifiedBadge } from './Badges10Tier';
import { getTierForLevel } from '../utils/tier';
import { HologramStudentCard } from './HologramStudentCard';
import { DEFAULT_AVATAR, handleImageError } from '../utils/mediaFallback';
import { SHOP_ITEMS, getTierColorStyles } from '../utils/shopData';
import { ShopItemSvg } from './ShopItemSvg';
import { pushNotification } from '../utils/notifications';
import { LikeHeartButton } from './LikeHeartButton';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  viewerUser?: User | null;
  onSaveProfile: (updates: Partial<User>) => void;
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
  color: string;
}

const ALL_SYSTEM_BADGES: SystemBadge[] = [
  { id: 'b-active', name: 'Tích Cực', desc: 'Gửi 3 câu trả lời đầu tiên', requirement: 'Trả lời 3 câu hỏi', IconComponent: Sprout, isEarned: (_l, s) => s >= 3, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { id: 'b-pioneer', name: 'Tiên Phong', desc: 'Đạt cấp độ 5', requirement: 'Đạt Level 5', IconComponent: Rocket, isEarned: (l) => l >= 5, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  { id: 'b-mentor', name: 'Cố Vấn Tri Thức', desc: 'Có 5 đáp án chuẩn được xác nhận', requirement: '5 đáp án chuẩn', IconComponent: GraduationCap, isEarned: (_l, _s, best) => best >= 5, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { id: 'b-scholar', name: 'Học Bá F-Forum', desc: 'Đạt cấp độ 20', requirement: 'Đạt Level 20', IconComponent: Star, isEarned: (l) => l >= 20, color: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30' },
  { id: 'b-ambassador', name: 'Đại Sứ Tri Thức', desc: 'Đạt cấp độ 35', requirement: 'Đạt Level 35', IconComponent: Award, isEarned: (l) => l >= 35, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  { id: 'b-genius', name: 'Thần Đồng FPT', desc: 'Đạt cấp độ 50', requirement: 'Đạt Level 50', IconComponent: Crown, isEarned: (l) => l >= 50, color: 'text-amber-300 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-400/40' },
];



const ProfileModalInner: React.FC<{
  currentUser: User;
  viewerUser?: User | null;
  onClose: () => void;
  onSaveProfile: (updates: Partial<User>) => void;
  initialTab?: TabType;
  questions?: Question[];
  solutions?: Solution[];
}> = ({
  currentUser,
  viewerUser,
  onClose,
  onSaveProfile,
  initialTab = 'overview',
  questions = [],
  solutions = [],
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [shopFilter, setShopFilter] = useState<'all' | ShopTierColor>('all');
  const [activitySubTab, setActivitySubTab] = useState<'questions' | 'solutions'>('solutions');

  const [name, setName] = useState(currentUser.name);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const savedCoverUrl = useCoverUrl(currentUser);
  const [coverDraft, setCoverDraft] = useState<{ blob: Blob; url: string } | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const coverPreview = coverDraft?.url ?? (coverRemoved ? null : savedCoverUrl);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [gender, setGender] = useState(currentUser.gender || 'Nam');
  const [city, setCity] = useState(currentUser.city || '');
  const [className, setClassName] = useState(currentUser.className || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /* Brief shimmer skeleton so the profile feels loaded, not popped */
  const [isBooting, setIsBooting] = useState(true);
  useEffect(() => {
    setIsBooting(true);
    const t = setTimeout(() => setIsBooting(false), 460);
    return () => clearTimeout(t);
  }, [currentUser.id]);

  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState('Nội dung vi phạm / Gây war / Không đúng chuẩn mực');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  const isSuperAdmin = currentUser.email === 'anhtuantran0512@gmail.com';
  const isOwnProfile = !viewerUser || viewerUser.id === currentUser.id;
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

  const statsMetrics = useMemo(() => {
    /* Toàn bộ chỉ số tính từ hoạt động thật — không có số ảo. */
    const thanks =
      currentUser.stats?.thanksCount ??
      userSolutions.reduce((acc, s) => acc + (s.upvotes || 0), 0);
    const bestSolutions =
      currentUser.stats?.bestCount ?? userSolutions.filter((s) => s.isBest).length;
    const fiveStar = currentUser.stats?.fiveStarCount ?? 0;
    const verified = currentUser.stats?.verifiedCount ?? (currentUser.role === 'SUPER_ADMIN' ? 1 : 0);
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

  const radarAxes = useMemo(() => {
    /* Radar tính theo môn học người dùng thật sự tham gia (câu hỏi + lời giải). */
    const SUBJECT_GROUPS: Record<string, string[]> = {
      KHTN: ['toan', 'ly', 'hoa', 'sinh'],
      KHXH: ['van', 'su'],
      'Ngoại Ngữ': ['anh'],
      'Nghệ Thuật': ['tamsu', 'share', 'kinhnghiem', 'tamly'],
      KHCN: ['tin', 'hotro'],
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
      full: name === 'KHTN' ? 'Khoa Học Tự Nhiên' : name === 'KHXH' ? 'Khoa Học Xã Hội' : name === 'KHCN' ? 'Khoa Học Công Nghệ' : name === 'Ngoại Ngữ' ? 'Ngoại Ngữ & Ngôn Ngữ' : 'Nghệ Thuật & Đời Sống',
      angle: -Math.PI / 2 + (i * 2 * Math.PI) / 5,
      score: scale(counts[name] || 0),
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

  const handleBuyItem = (item: ShopItem) => {
    if (userCoin < item.price) return;
    const newCoin = userCoin - item.price;
    const newInventory = Array.from(new Set([...userInventory, item.id]));
    onSaveProfile({
      coin: newCoin,
      inventory: newInventory,
    });
    pushNotification({
      type: 'coin',
      category: 'system',
      title: 'Mua Vật Phẩm Thành Công!',
      body: `Đã mở khóa "${item.name}" với giá ${item.price} Coin từ Chill Box.`,
      targetView: 'home',
    });
  };

  const handleEquipItem = (itemId: string) => {
    const isCurrentlyEquipped = currentUser.equippedBadge === itemId;
    const nextBadge = isCurrentlyEquipped ? '' : itemId;
    onSaveProfile({
      equippedBadge: nextBadge,
    });
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
        `Kích thước file (${(file.size / (1024 * 1024)).toFixed(2)}MB) vượt quá 5MB cho phép!`
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

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Ảnh nền chỉ nhận tệp hình ảnh (PNG, JPG, WebP, GIF)!');
      return;
    }
    if (file.size > COVER_MAX_BYTES) {
      setErrorMsg(`Ảnh nền (${(file.size / (1024 * 1024)).toFixed(2)}MB) vượt quá 15MB cho phép!`);
      return;
    }
    setErrorMsg(null);
    if (coverDraft) URL.revokeObjectURL(coverDraft.url);
    setCoverDraft({ blob: file, url: URL.createObjectURL(file) });
    setCoverRemoved(false);
  };

  const handleCoverRemove = () => {
    if (coverDraft) URL.revokeObjectURL(coverDraft.url);
    setCoverDraft(null);
    setCoverRemoved(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!name.trim()) {
      setErrorMsg('Tên hiển thị không được để trống!');
      return;
    }

    setIsSaving(true);
    let coverImage = currentUser.coverImage;
    try {
      if (coverDraft) {
        coverImage = await saveCover(currentUser.id, coverDraft.blob);
        setCoverDraft(null);
      } else if (coverRemoved && currentUser.coverImage) {
        await deleteCover(currentUser.id);
        coverImage = undefined;
      }
    } catch {
      setErrorMsg('Không thể lưu ảnh nền trên trình duyệt này. Vui lòng thử ảnh khác!');
      setIsSaving(false);
      return;
    }
    setCoverRemoved(false);
    onSaveProfile({
      coverImage,
      name: name.trim().slice(0, 50),
      avatar,
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
        body: `Báo cáo về "${currentUser.name}" đã được chuyển tới Ban Giám Hiệu và Super Admin.`,
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-up"
      role="dialog"
      aria-modal="true"
      aria-label={`Hồ sơ cá nhân của ${currentUser.name}`}
    >
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Đóng hồ sơ"
        className="fixed inset-0 bg-transparent border-none outline-none cursor-default"
        onClick={onClose}
      />

      {/* Main Card Container */}
      <div className="w-full max-w-3xl rounded-3xl bg-[#0c1218]/95 border border-white/20 shadow-[0_25px_60px_rgba(0,0,0,0.85)] p-4 sm:p-6 relative z-10 overflow-hidden max-h-[95vh] flex flex-col">
        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10 mb-3 gap-2.5 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
            <h2 className="text-sm sm:text-base font-extrabold text-white tracking-wide truncate">
              Cá nhân
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Lv.{currentUser.level}
            </span>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center bg-black/50 p-1 rounded-full border border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-[#0284C7] text-white shadow-md'
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
                    ? 'bg-amber-500 text-black shadow-md'
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
                    ? 'bg-amber-500 text-black shadow-md'
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
                    ? 'bg-amber-500 text-black shadow-md'
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
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Sửa F-ID
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0"
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
        <div key={activeTab} className="ff-tab-enter flex-1 overflow-y-auto pr-1 space-y-4 no-scrollbar">
          {/* Shimmer skeleton while the profile content boots */}
          {isBooting && (
            <div className="rounded-2xl bg-white/[0.04] border border-white/15 p-4 sm:p-5 space-y-4" role="status" aria-busy="true">
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
            <div className="space-y-4">
              {/* Thẻ Card chính với dải gradient aurora */}
              <div className="rounded-2xl bg-white/[0.04] border border-white/15 shadow-xl overflow-hidden">
                {/* Aurora banner */}
                <div className={`${savedCoverUrl ? 'h-28 sm:h-36' : 'h-16'} ff-aurora-surface ff-cover relative overflow-hidden transition-[height] duration-500`} style={{ background: 'linear-gradient(120deg, rgba(245,158,11,0.25), rgba(167,139,250,0.2), rgba(34,211,238,0.22))' }}>
                  {savedCoverUrl ? (
                    <>
                      <img src={savedCoverUrl} alt="Ảnh nền hồ sơ" className="ff-cover-img absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-[#0c1218]/90" aria-hidden="true" />
                    </>
                  ) : (
                    <div className="absolute inset-0 ff-aurora-bar opacity-25" aria-hidden="true" />
                  )}
                </div>

                <div className="p-4 sm:p-5 space-y-4">
                {/* A. Khối Đầu Trang (Header Thông Tin Cá Nhân) */}
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pb-4 border-b border-white/10">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Avatar với vòng gradient xoay */}
                    <div className="relative shrink-0 -mt-12">
                      <div className="ff-gradient-ring-sq">
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
                        {/* Tên tài khoản in đậm màu xanh dương (#0284C7) */}
                        <h3 className="text-base sm:text-xl font-bold text-[#0284C7] flex items-center gap-1.5 truncate">
                          <span>{currentUser.name}</span>
                          {/* Icon giá sách/tủ sách màu nâu gỗ */}
                          <span title="Kệ sách cá nhân" className="inline-flex items-center">
                            <BookOpen className="w-4 h-4 text-amber-600 inline shrink-0" />
                          </span>
                          {isSuperAdmin && <AdminVerifiedBadge size={15} />}
                        </h3>

                        {/* Role Badge: Viên thuốc nền xanh ngọc (#0D9488 / #14B8A6), chữ trắng in hoa */}
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

                      {/* Châm ngôn cá nhân (Bio): Dòng chữ nghiêng nhỏ màu xám đậm */}
                      <p className="text-xs italic text-neutral-400 leading-snug line-clamp-2">
                        ❝ {currentUser.bio || 'Chưa có mô tả'} ❞
                      </p>

                      <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono pt-0.5">
                        <span>Cấp độ: Lv.{currentUser.level}</span>
                        <span>•</span>
                        <span className="text-amber-400 font-bold">{userCoin} Coin</span>
                        <span>•</span>
                        <span>{tier.name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Header Controls: Like Heart Button & Action Buttons */}
                  <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
                    {/* Nút Tim Cá Nhân (Tailwind Like Heart Button CodeFronts) */}
                    <div className="flex items-center gap-1.5" title="Thả tim cho thành viên này">
                      <LikeHeartButton
                        initialCount={statsMetrics.thanks}
                        initialLiked={false}
                        onLikeChange={(_liked, nextCount) => {
                          pushNotification({
                            type: 'system',
                            category: 'system',
                            title: 'Đã Thả Tim Hồ Sơ!',
                            body: `Bạn đã thả tim cho ${currentUser.name}. Lượt cảm ơn hiện tại: ${nextCount}.`,
                            targetView: 'home',
                          });
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isOwnProfile && (
                        <button
                          type="button"
                          onClick={() => setIsReporting(true)}
                          className="px-2.5 py-1 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
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
                        className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                        title="Chia sẻ hồ sơ"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Chia sẻ</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Thanh 6 Chỉ Số Thành Tích Nhanh (Stats Grid): Bố trí thẳng hàng ngang */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pb-4 border-b border-white/10 text-center">
                  {/* 1. Điểm số: icon chữ H hai màu vàng - xanh kèm số */}
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center">
                    <span className="text-[10px] text-neutral-400 font-semibold mb-0.5">Điểm số</span>
                    <div className="flex items-center gap-1 font-bold font-mono text-xs text-amber-300">
                      <span className="text-amber-400 font-black">H</span>
                      <span>{statsMetrics.xp}</span>
                    </div>
                  </div>

                  {/* 2. Cảm ơn: icon trái tim đỏ kèm số */}
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col items-center">
                    <span className="text-[10px] text-neutral-400 font-semibold mb-0.5">Cảm ơn</span>
                    <div className="flex items-center gap-1 font-bold font-mono text-xs text-rose-400">
                      <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400 shrink-0" />
                      <span>{statsMetrics.thanks}</span>
                    </div>
                  </div>

                  {/* 3. Hay nhất: icon huy hiệu ngôi sao vàng kèm số */}
                  <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex flex-col items-center">
                    <span className="text-[10px] text-neutral-400 font-semibold mb-0.5">Hay nhất</span>
                    <div className="flex items-center gap-1 font-bold font-mono text-xs text-yellow-300">
                      <Award className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                      <span>{statsMetrics.bestSolutions}</span>
                    </div>
                  </div>

                  {/* 4. 5 Sao: icon ngôi sao vàng lớn kèm số */}
                  <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/20 flex flex-col items-center">
                    <span className="text-[10px] text-neutral-400 font-semibold mb-0.5">5 Sao</span>
                    <div className="flex items-center gap-1 font-bold font-mono text-xs text-amber-300">
                      <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300 shrink-0" />
                      <span>{statsMetrics.fiveStar}</span>
                    </div>
                  </div>

                  {/* 5. Xác thực: icon vòng tròn xanh lá có dấu tích trắng kèm số */}
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center">
                    <span className="text-[10px] text-neutral-400 font-semibold mb-0.5">Xác thực</span>
                    <div className="flex items-center gap-1 font-bold font-mono text-xs text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{statsMetrics.verified}</span>
                    </div>
                  </div>

                  {/* 6. Đã giúp: icon hai người bạn màu xanh lam kèm số */}
                  <div className="p-2 rounded-xl bg-[#0284C7]/10 border border-[#0284C7]/20 flex flex-col items-center">
                    <span className="text-[10px] text-neutral-400 font-semibold mb-0.5">Đã giúp</span>
                    <div className="flex items-center gap-1 font-bold font-mono text-xs text-sky-400">
                      <Users className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>{statsMetrics.helped}</span>
                    </div>
                  </div>
                </div>

                {/* B. Khối Danh Hiệu & Túi Đồ Ảo (Badges & Chill Box) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-white/10">
                  {/* DANH HIỆU — chỉ hiển thị những gì thật sự đạt được */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-mono">
                        <Award className="w-4 h-4 text-emerald-400" />
                        Danh hiệu
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                        {ALL_SYSTEM_BADGES.filter((b) => b.isEarned(currentUser.level, userSolutions.length, userSolutions.filter((s) => s.isBest).length)).length}/{ALL_SYSTEM_BADGES.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      {ALL_SYSTEM_BADGES.map((b, index) => {
                        const earned = b.isEarned(
                          currentUser.level,
                          userSolutions.length,
                          userSolutions.filter((s) => s.isBest).length,
                        );
                        return (
                          <div
                            key={b.id}
                            style={{ '--i': index } as React.CSSProperties}
                            className={`ac-01__card p-1.5 rounded-xl border text-center flex flex-col items-center justify-center relative ${
                              earned ? b.color : 'text-neutral-500 bg-white/[0.02] border-white/10 opacity-60'
                            }`}
                            title={earned ? `${b.name}: ${b.desc}` : `${b.name} — chưa mở khóa (${b.requirement})`}
                          >
                            <span className="text-base flex items-center justify-center">
                              <b.IconComponent className="w-4 h-4 inline" />
                            </span>
                            <span className="text-[9px] font-bold truncate max-w-full mt-0.5">{b.name}</span>
                            {!earned && (
                              <span className="text-[8px] text-neutral-500 font-mono">{b.requirement}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[9.5px] text-neutral-500">
                      Danh hiệu mở khóa bằng hoạt động thật: cấp độ và số lời giải của bạn.
                    </p>
                  </div>

                  {/* CHILL BOX & KỆ SÁCH */}
                  <div className="space-y-3">
                    {/* CHILL BOX (Kho đồ trang bị) */}
                    <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-mono">
                          <ShoppingBag className="w-4 h-4 text-amber-400" />
                          Chill Box
                        </span>
                        <span className="text-[10px] text-amber-300 font-mono">{userInventory.length} vật phẩm</span>
                      </div>

                      {/* Trang bị thật đã mua từ cửa hàng */}
                      {userInventory.length === 0 ? (
                        <div className="py-4 px-3 rounded-xl bg-white/[0.02] border border-dashed border-white/15 text-center">
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
                                className="ac-01__card relative p-2 rounded-xl bg-white/[0.04] border border-white/15 flex flex-col items-center text-center shadow-sm"
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

                    {/* KỆ SÁCH */}
                    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-xs font-bold text-white font-mono uppercase">KỆ SÁCH</span>
                        </div>
                        <p className="text-[11px] text-neutral-300 mt-0.5">
                          Đọc sách gì hay, chia sẻ ngay cùng cộng đồng Hoidap247!
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          pushNotification({
                            type: 'system',
                            category: 'system',
                            title: 'Kệ Sách Cộng Đồng',
                            body: 'Tính năng chia sẻ tài liệu học tập và sách hay đang sẵn sàng kết nối cộng đồng.',
                            targetView: 'home',
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#0284C7]/20 hover:bg-[#0284C7]/30 border border-[#0284C7]/40 text-[#0284C7] text-xs font-bold whitespace-nowrap cursor-pointer transition-colors"
                      >
                        Viết chia sẻ
                      </button>
                    </div>
                  </div>
                </div>

                {/* C. Khối Biểu Đồ Mạng Nhện (Radar Spider Chart) - CÁC MÔN ĐÃ GIÚP ĐỠ BẠN BÈ */}
                <div className="pb-4 border-b border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-mono">
                      <BarChart3 className="w-4 h-4 text-amber-400" />
                      CÁC MÔN ĐÃ GIÚP ĐỠ BẠN BÈ
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono">Biểu đồ Radar 5 Trục</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Cột trái: Biểu đồ Radar đa giác 5 đỉnh trục */}
                    <div className="md:col-span-6 flex flex-col items-center justify-center p-2 bg-black/40 rounded-2xl border border-white/10">
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

                        {/* Data Polygon: Viền vàng kim #EAB308, nền xanh ngọc biển nhạt rgba(14, 165, 233, 0.25) */}
                        <polygon
                          points={dataPolygonPoints}
                          fill="rgba(14, 165, 233, 0.25)"
                          stroke="#EAB308"
                          strokeWidth="2.5"
                        />

                        {/* Axis Points: Chấm tròn xanh cyan */}
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
                            />
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

                    {/* Cột phải: Danh sách môn học chi tiết */}
                    <div className="md:col-span-6 space-y-2.5">
                      {/* Khoa Học Tự Nhiên (KHTN) */}
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                        <span className="text-xs font-bold text-white block">Khoa Học Tự Nhiên (KHTN):</span>
                        <div className="text-amber-400/90 text-xs font-mono">
                          Toán Học (1), Hóa Học (1)
                        </div>
                      </div>

                      {/* Khoa Học Xã Hội (KHXH) */}
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                        <span className="text-xs font-bold text-white block">Khoa Học Xã Hội (KHXH):</span>
                        <div className="text-amber-400 text-xs font-mono">
                          Ngữ Văn (21), Địa Lý (1)
                        </div>
                      </div>

                      {/* Khoa Học Công Nghệ (KHCN) */}
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                        <span className="text-xs font-bold text-white block">Khoa Học Công Nghệ (KHCN):</span>
                        <div className="text-amber-400 text-xs font-mono">
                          Tin Học (15), Công Nghệ (1)
                        </div>
                      </div>

                      {/* Ngoại Ngữ & Nghệ Thuật */}
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                        <span className="text-xs font-bold text-white block">Ngoại Ngữ & Nghệ Thuật:</span>
                        <div className="text-amber-300 text-xs font-mono">
                          Tiếng Anh (2), Âm Nhạc / Hội Họa (1)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* D. Thông Tin Hoạt Động & Lịch Sử Câu Trả Lời [Ảnh 2] */}
                <div className="space-y-3">
                  {/* Metadata Tài Khoản */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-black/40 border border-white/10 text-xs">
                    <div className="flex items-center gap-2 flex-wrap text-neutral-300">
                      <span className="text-neutral-400">Ngày tham gia:</span>
                      <span className="text-white font-mono font-semibold">10/07/2022</span>
                      <span>|</span>
                      <span className="text-neutral-400">Tuổi F-Forum:</span>
                      <span className="text-white font-mono font-semibold">4 năm</span>
                      <span>|</span>
                      <span className="text-[#0284C7] hover:underline cursor-pointer">Xem thêm thông tin</span>
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
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        activitySubTab === 'questions'
                          ? 'bg-[#0284C7] text-white shadow-sm'
                          : 'bg-white/5 text-neutral-400 hover:text-white border border-white/10'
                      }`}
                    >
                      [Câu hỏi] ({userQuestions.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivitySubTab('solutions')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        activitySubTab === 'solutions'
                          ? 'bg-[#0284C7] text-white shadow-sm'
                          : 'bg-white/5 text-neutral-400 hover:text-white border border-white/10'
                      }`}
                    >
                      [Câu trả lời] ({statsMetrics.answersCount})
                    </button>
                  </div>

                  {/* Answer Feed / Question Feed */}
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                    {activitySubTab === 'solutions' ? (
                      userSolutions.length === 0 ? (
                        <div className="py-6 text-center text-xs text-neutral-400 italic">
                          Chưa có câu trả lời nào. Hãy bắt đầu giúp đỡ bạn bè trên sàn hỏi đáp!
                        </div>
                      ) : (
                        userSolutions.map((s, idx) => {
                          const parentQ = questions.find((q) => q.id === s.questionId);
                          return (
                            <div
                              key={s.id}
                              style={{ '--i': idx } as React.CSSProperties}
                              className="ac-01__card p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 space-y-1 transition-colors"
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
                    ) : (
                      userQuestions.length === 0 ? (
                        <div className="py-6 text-center text-xs text-neutral-400 italic">
                          Chưa có câu hỏi nào được đặt.
                        </div>
                      ) : (
                        userQuestions.map((q) => (
                          <div
                            key={q.id}
                            className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1"
                          >
                            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                              <span className="text-amber-400 font-bold">#{q.subject}</span>
                              <span>{q.createdAt}</span>
                            </div>
                            <h5 className="text-xs font-bold text-white">{q.title}</h5>
                            <p className="text-xs text-neutral-300 line-clamp-1">{q.content}</p>
                          </div>
                        ))
                      )
                    )}
                  </div>
                </div>

                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 3D Hologram Student Card */}
          {activeTab === 'card' && (
            <div className="space-y-4">
              <HologramStudentCard user={currentUser} />

              {/* Equipped item banner if any */}
              {userInventory.length > 0 && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-black/40 border border-amber-400/30 flex items-center justify-center p-1">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Huy hiệu trang bị đang hoạt động</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
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

          {/* TAB 3: Chill Box Shop GUI (12 Custom SVG Items) */}
          {activeTab === 'shop' && (
            <div className="space-y-4">
              {/* Shop Header Banner */}
              <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-cyan-500/15 border border-amber-400/30 flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-amber-400" />
                    <span>CHILL BOX • TIỆM VẬT PHẨM HỌC ĐƯỜNG</span>
                  </h3>
                  <p className="text-[11px] text-neutral-300 mt-0.5">
                    Dùng F-Coin tích lũy từ điểm danh và giải bài tập để mở khóa vật phẩm độc bản.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-black/60 border border-amber-400/40 text-amber-300 font-mono font-bold text-xs shrink-0 shadow-lg">
                  <Coins className="w-4 h-4 text-amber-400 animate-spin" />
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
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      shopFilter === f.id
                        ? 'bg-amber-500 text-black font-bold shadow-md'
                        : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10'
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
                      className={`p-3.5 rounded-3xl ${styles.bg} border ${styles.border} flex flex-col justify-between transition-transform duration-200 hover:scale-[1.02] shadow-lg`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/15 flex items-center justify-center p-1.5 shadow-inner">
                            <ShopItemSvg type={item.iconType} size={36} />
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 border border-white/10">
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
                                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
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
                                : 'bg-neutral-800 text-neutral-500 border border-white/5 cursor-not-allowed'
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
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-300">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-neutral-400">Ngày tham gia:</span>
                  <span className="text-white font-mono font-semibold">{currentUser.joinedAt || '10/07/2022'}</span>
                  <span>•</span>
                  <span className="text-neutral-400">Tuổi F-Forum:</span>
                  <span className="text-white font-mono font-semibold">4 năm</span>
                </div>
                <div className="flex items-center gap-3">
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

              {/* Questions Feed */}
              <div className="space-y-2.5">
                {userQuestions.length === 0 ? (
                  <div className="py-12 text-center text-neutral-400 space-y-2">
                    <HelpCircle className="w-8 h-8 text-neutral-500 mx-auto" />
                    <p className="text-xs">Chưa có câu hỏi nào được tạo bởi học sinh này.</p>
                  </div>
                ) : (
                  userQuestions.map((q) => (
                    <div key={q.id} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold uppercase">
                          #{q.subject}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">{q.createdAt}</span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2">{q.title}</h4>
                      <p className="text-xs text-neutral-300 line-clamp-2">{q.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Edit Profile Form */}
          {activeTab === 'edit' && isOwnProfile && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Cover image (≤15MB, stored in IndexedDB) */}
              <div className="relative h-32 rounded-2xl overflow-hidden border border-white/15 group ff-cover shadow-[0_18px_40px_rgba(0,0,0,0.45)]" style={{ background: 'linear-gradient(120deg, rgba(245,158,11,0.28), rgba(167,139,250,0.24), rgba(34,211,238,0.24))' }}>
                {coverPreview ? (
                  <img src={coverPreview} alt="Xem trước ảnh nền" className="ff-cover-img absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 ff-aurora-bar opacity-30" aria-hidden="true" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden="true" />
                <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-white drop-shadow">Ảnh nền hồ sơ</p>
                    <p className="text-[10px] text-white/60 font-mono">PNG, JPG, WebP, GIF • tối đa 15MB</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {coverPreview && (
                      <button type="button" onClick={handleCoverRemove} className="p-2 rounded-xl bg-black/50 border border-white/15 text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer" aria-label="Gỡ ảnh nền" title="Gỡ ảnh nền">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <label htmlFor="cover-upload" className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-[11px] font-semibold text-white flex items-center gap-1.5 cursor-pointer transition-all hover:-translate-y-0.5">
                      <ImagePlus className="w-3.5 h-3.5" />
                      {coverPreview ? 'Đổi ảnh nền' : 'Thêm ảnh nền'}
                    </label>
                    <input id="cover-upload" type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="relative group shrink-0">
                  <img
                    src={avatar}
                    alt="Avatar"
                    onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                    loading="lazy"
                    decoding="async"
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-full object-cover border-2 border-amber-400/60 shadow-lg"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] text-white font-medium"
                  >
                    <Upload className="w-4 h-4 mb-0.5" />
                    Thay đổi
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={isSuperAdmin ? 'discord-admin-name text-sm' : 'text-sm font-bold text-white'}>
                      {name || 'Học sinh FPT'}
                    </span>
                    {isSuperAdmin && <AdminVerifiedBadge size={14} />}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <TierBadge level={currentUser.level} size={20} showTooltip={false} />
                    <span className="text-xs text-amber-300 font-mono font-semibold">
                      Tier {tier.roman} • Level {currentUser.level}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/50 mt-1 font-mono">
                    Yêu cầu upload: file ảnh &lt; 5MB (PNG, JPG, WebP)
                  </p>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Tên hiển thị:
                </label>
                <input
                  type="text"
                  value={name}
                  maxLength={50}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors"
                  placeholder="Nhập họ và tên..."
                />
              </div>

              {/* Bio with live counter */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-neutral-300">
                    Tiểu sử cá nhân (Bio):
                  </label>
                  <span className={`text-[11px] font-mono ${bio.length >= 95 ? 'text-amber-400 font-bold' : 'text-neutral-400'}`}>
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
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors resize-none"
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
                    className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác / Ẩn</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Lớp / Khoá học:
                  </label>
                  <input
                    type="text"
                    value={className}
                    maxLength={50}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="VD: K19 SE..."
                    className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Thành phố:
                  </label>
                  <input
                    type="text"
                    value={city}
                    maxLength={50}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="VD: Hà Nội..."
                    className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Footer Submit */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Quay lại xem hồ sơ
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:opacity-90 active:scale-95 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-[0_2px_12px_rgba(245,158,11,0.4)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi F-ID'}</span>
                </button>
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
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-up"
        >
          <div className="w-full max-w-md rounded-3xl bg-[#0c1218]/95 border border-red-500/40 shadow-2xl p-6 relative">
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
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300">
                  Đối tượng tố cáo: <strong className="text-white">{currentUser.name}</strong>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Lý do vi phạm (*):
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400 cursor-pointer"
                  >
                    <option value="Toxic / Gây war / Xúc phạm bạn học">Toxic / Gây war / Xúc phạm bạn học</option>
                    <option value="Spam / Quảng cáo / Lừa đảo">Spam / Quảng cáo / Lừa đảo</option>
                    <option value="Nội dung phản cảm / Đồi trụy">Nội dung phản cảm / Đồi trụy</option>
                    <option value="Gian lận điểm / Hack Coin">Gian lận điểm / Hack Coin</option>
                    <option value="Khác">Lý do khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Chi tiết vi phạm:
                  </label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Mô tả cụ thể bằng chứng vi phạm..."
                    className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400 resize-none"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-500/20 text-[10px] text-red-300 space-y-1">
                  <span className="font-bold flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-red-400" />
                    Kỷ luật nghiêm minh:
                  </span>
                  <p>
                    Thông báo sẽ được chuyển tới Ban Quản Trị để xử lý kỷ luật.
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
                    className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isSubmittingReport ? 'Đang gửi...' : 'Gửi Tố Cáo Về Gmail Admin'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  viewerUser,
  onSaveProfile,
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
      initialTab={initialTab}
      questions={questions}
      solutions={solutions}
    />
  );
};

export default ProfileModal;
