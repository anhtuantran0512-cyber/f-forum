/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useMemo } from 'react';
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
  Medal,
  Pencil,
  Bookmark,
  Crown,
  GraduationCap,
  Rocket,
  Sprout,
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

const ALL_SYSTEM_BADGES = [
  { id: 'b-active', name: 'Tích Cực', desc: 'Đóng góp năng nổ trong học tập & hỗ trợ bạn bè', IconComponent: Sprout, levelReq: 1, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { id: 'b-pioneer', name: 'Tiên Phong', desc: 'Thành viên sáng lập & khai mở diễn đàn', IconComponent: Rocket, levelReq: 5, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  { id: 'b-mentor', name: 'Cố Vấn Tri Thức', desc: 'Có trên 20 câu trả lời chính xác được chấp nhận', IconComponent: GraduationCap, levelReq: 10, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { id: 'b-scholar', name: 'Học Bá F-Forum', desc: 'Đạt giải đáp xuất sắc trong các phân môn KHTN & KHCN', IconComponent: Star, levelReq: 20, color: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30' },
  { id: 'b-ambassador', name: 'Đại Sứ Tri Thức', desc: 'Đại sứ kết nối văn hóa học đường văn minh', IconComponent: Award, levelReq: 35, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  { id: 'b-genius', name: 'Thần Đồng FPT', desc: 'Top 1% học sinh có chỉ số đóng góp cao nhất toàn trường', IconComponent: Crown, levelReq: 50, color: 'text-amber-300 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-400/40' },
];

const MOCK_ANSWERS_FEED = [
  {
    id: '4292916',
    time: '08:30:28 07/12/2022',
    subject: 'Ngữ Văn',
    snippet: '1 B cây bưởi to tướng do ông trồng thuộc giống bưởi ngon ngọt nổi tiếng / 2 C Bắt sâu tưới nước cho cây thêm tốt / 3 A giật mình bật dậy, hứng...',
  },
  {
    id: '5352240',
    time: '07:32:46 05/12/2022',
    subject: 'Ngữ Văn',
    snippet: 'xôn xao là từ láy (1 phần nguyên âm và phụ âm láy như nhau) / lúng túng là từ ghép (âm vần ghép lại tạo nghĩa phân loại)...',
  },
  {
    id: '5350818',
    time: '07:31:19 05/12/2022',
    subject: 'Ngữ Văn',
    snippet: 'Trong cuộc đời mỗi con người, chúng ta chắc hẳn luôn có những người bạn giúp chúng ta vượt qua những khó khăn và kề bên mỗi khi gặp chuyện vui...',
  },
  {
    id: '5351042',
    time: '07:24:31 05/12/2022',
    subject: 'Tin Học',
    snippet: 'Để tối ưu hóa truy vấn SQL và giải bài tập thuật toán: Sử dụng chỉ mục B-Tree trên các trường điều kiện WHERE, tránh SELECT * và dùng JOIN thay vì subquery lồng nhau...',
  },
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
  const [bio, setBio] = useState(currentUser.bio || '');
  const [gender, setGender] = useState(currentUser.gender || 'Nam');
  const [city, setCity] = useState(currentUser.city || '');
  const [className, setClassName] = useState(currentUser.className || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState('Nội dung vi phạm / Gây war / Không đúng chuẩn mực');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  const isSuperAdmin = currentUser.email === 'anhtuantran0512@gmail.com';
  const isOwnProfile = !viewerUser || viewerUser.id === currentUser.id;
  const tier = getTierForLevel(currentUser.level);

  const userCoin = currentUser.coin ?? (isSuperAdmin ? 99999 : 100);
  const userInventory = useMemo(
    () => currentUser.inventory || ['ribbon_pink_gem', 'ribbon_buddha_seal', 'pencil_starter'],
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
    const thanks =
      currentUser.stats?.thanksCount ??
      userSolutions.reduce((acc, s) => acc + (s.upvotes || 0), 0) + (isSuperAdmin ? 128 : 35);
    const bestSolutions =
      currentUser.stats?.bestCount ??
      userSolutions.filter((s) => s.isBest).length + (isSuperAdmin ? 36 : 5);
    const fiveStar =
      currentUser.stats?.fiveStarCount ??
      (isSuperAdmin ? 50 : 33);
    const verified =
      currentUser.stats?.verifiedCount ??
      (isSuperAdmin ? 1 : 0);
    const helped =
      currentUser.stats?.helpedCount ??
      userSolutions.length + (isSuperAdmin ? 88 : 38);
    const xp = isSuperAdmin ? 45000 : currentUser.xp || 374;

    return {
      xp,
      coin: userCoin,
      thanks,
      bestSolutions,
      fiveStar,
      verified,
      helped,
      answersCount: Math.max(40, userSolutions.length),
    };
  }, [currentUser, userSolutions, userCoin, isSuperAdmin]);

  const radarAxes = useMemo(() => {
    const axes = [
      { name: 'KHTN', full: 'Khoa Học Tự Nhiên', angle: -Math.PI / 2, score: isSuperAdmin ? 95 : 68 },
      { name: 'KHXH', full: 'Khoa Học Xã Hội', angle: -Math.PI / 2 + (2 * Math.PI) / 5, score: isSuperAdmin ? 92 : 88 },
      { name: 'Ngoại Ngữ', full: 'Ngoại Ngữ & Ngôn Ngữ', angle: -Math.PI / 2 + (4 * Math.PI) / 5, score: isSuperAdmin ? 90 : 55 },
      { name: 'Nghệ Thuật', full: 'Nghệ Thuật & Đời Sống', angle: -Math.PI / 2 + (6 * Math.PI) / 5, score: isSuperAdmin ? 94 : 60 },
      { name: 'KHCN', full: 'Khoa Học Công Nghệ', angle: -Math.PI / 2 + (8 * Math.PI) / 5, score: isSuperAdmin ? 98 : 92 },
    ];
    return axes;
  }, [isSuperAdmin]);

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
      setReportSuccess(data.message || 'Đã gửi tố cáo tài khoản tới Ban Quản Trị (anhtuantran0512@gmail.com).');
      pushNotification({
        type: 'system',
        category: 'system',
        title: 'Đã Tiếp Nhận Báo Cáo',
        body: `Báo cáo về "${currentUser.name}" đã được chuyển tới Ban Giám Hiệu và Super Admin.`,
        targetView: 'home',
      });
    } catch {
      setReportSuccess('Đã tiếp nhận tố cáo của bạn và chuyển tới anhtuantran0512@gmail.com.');
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
              HỒ SƠ THÀNH VIÊN
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              NEXT-GEN
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
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 no-scrollbar">
          {/* TAB 1: PHÂN VÙNG HỒ SƠ THÀNH VIÊN (USER PROFILE CARD) [Ảnh 1 & 2] */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Thẻ Card chính: viền mảnh, bo góc cong, chia khối border-b */}
              <div className="rounded-2xl bg-white/[0.04] border border-white/15 p-4 sm:p-5 space-y-4 shadow-xl">
                
                {/* A. Khối Đầu Trang (Header Thông Tin Cá Nhân) */}
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pb-4 border-b border-white/10">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Ảnh đại diện (Avatar): nằm góc trái, hình vuông bo góc hoặc tròn viền ngoài */}
                    <div className="relative shrink-0">
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                        loading="lazy"
                        decoding="async"
                        width={68}
                        height={68}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-cyan-400/50 shadow-md"
                      />
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
                              ? 'SUPER ADMIN TEAM'
                              : currentUser.role === 'CLUB_LEADER'
                              ? 'CLUB LEADER TEAM'
                              : 'INTERVIEWER TEAM'}
                          </span>
                        </span>
                      </div>

                      {/* Châm ngôn cá nhân (Bio): Dòng chữ nghiêng nhỏ màu xám đậm */}
                      <p className="text-xs italic text-neutral-400 leading-snug line-clamp-2">
                        ❝ {currentUser.bio || 'TG_Call me went you need :D'} ❞
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
                  {/* DANH HIỆU CỦA BẠN */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-mono">
                        <Award className="w-4 h-4 text-emerald-400" />
                        DANH HIỆU CỦA BẠN
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono font-semibold">Tất cả huy hiệu</span>
                    </div>

                    {/* Huy hiệu tròn viền xanh lá đôi + nhánh mầm 3 lá + nhãn Tích cực */}
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-500/10 border-2 border-emerald-400/40">
                      <div className="w-12 h-12 rounded-full border-2 border-emerald-400 border-dashed p-1 flex items-center justify-center bg-emerald-950/40 shrink-0 shadow-[0_0_12px_rgba(52,211,153,0.3)]">
                        <Sprout className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">Tích Cực</span>
                        <p className="text-[10px] text-neutral-300">
                          Thành viên đóng góp tích cực và giải đáp nhiều bài tập hữu ích nhất.
                        </p>
                      </div>
                    </div>

                    {/* Danh sách các huy hiệu khác đã sở hữu */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      {ALL_SYSTEM_BADGES.map((b, index) => (
                        <div
                          key={b.id}
                          style={{ '--i': index } as React.CSSProperties}
                          className={`ac-01__card p-1.5 rounded-xl border text-center flex flex-col items-center justify-center ${b.color}`}
                          title={`${b.name}: ${b.desc}`}
                        >
                          <span className="text-base flex items-center justify-center"><b.IconComponent className="w-4 h-4 inline" /></span>
                          <span className="text-[9px] font-bold truncate max-w-full mt-0.5">{b.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CHILL BOX & KỆ SÁCH */}
                  <div className="space-y-3">
                    {/* CHILL BOX (Kho đồ trang bị) */}
                    <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-mono">
                          <ShoppingBag className="w-4 h-4 text-amber-400" />
                          CHILL BOX (KHO ĐỒ TRANG BỊ)
                        </span>
                        <span className="text-[10px] text-amber-300 font-mono">Đã sở hữu</span>
                      </div>

                      {/* Danh sách vật phẩm ảo dạng ô mini */}
                      <div className="grid grid-cols-4 gap-2">
                        {/* Vật phẩm 1: Ruy băng tròn hồng có đính đá/ngọc, badge x1 */}
                        <div style={{ '--i': 0 } as React.CSSProperties} className="ac-01__card relative p-2 rounded-xl bg-pink-500/10 border border-pink-500/30 flex flex-col items-center text-center shadow-sm">
                          <Sparkles className="w-5 h-5 text-pink-400" />
                          <span className="text-[9px] font-semibold text-pink-200 mt-1 truncate max-w-full">Ruy băng ngọc</span>
                          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-neutral-800 text-[9px] font-mono text-neutral-300 border border-white/20">
                            1
                          </span>
                        </div>

                        {/* Vật phẩm 2: Ruy băng tròn hồng đính huy hiệu tâm linh, badge x1 */}
                        <div style={{ '--i': 1 } as React.CSSProperties} className="ac-01__card relative p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col items-center text-center shadow-sm">
                          <Medal className="w-5 h-5 text-amber-400" />
                          <span className="text-[9px] font-semibold text-amber-200 mt-1 truncate max-w-full">Huy hiệu thiền</span>
                          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-neutral-800 text-[9px] font-mono text-neutral-300 border border-white/20">
                            1
                          </span>
                        </div>

                        {/* Vật phẩm 3: Bút Chì Khởi Đầu */}
                        <div style={{ '--i': 2 } as React.CSSProperties} className="ac-01__card relative p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col items-center text-center shadow-sm">
                          <Pencil className="w-5 h-5 text-emerald-400" />
                          <span className="text-[9px] font-semibold text-emerald-200 mt-1 truncate max-w-full">Bút chì</span>
                          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-neutral-800 text-[9px] font-mono text-neutral-300 border border-white/20">
                            1
                          </span>
                        </div>

                        {/* Vật phẩm 4: Thẻ Thư Viện */}
                        <div style={{ '--i': 3 } as React.CSSProperties} className="ac-01__card relative p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex flex-col items-center text-center shadow-sm">
                          <Bookmark className="w-5 h-5 text-cyan-400" />
                          <span className="text-[9px] font-semibold text-cyan-200 mt-1 truncate max-w-full">Thẻ đọc</span>
                          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-neutral-800 text-[9px] font-mono text-neutral-300 border border-white/20">
                            1
                          </span>
                        </div>
                      </div>
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
                      MOCK_ANSWERS_FEED.map((item, idx) => (
                        <div
                          key={item.id}
                          style={{ '--i': idx } as React.CSSProperties}
                          className="ac-01__card p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 space-y-1 transition-colors"
                        >
                          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                            <span className="text-sky-400 font-bold">ID câu hỏi: {item.id}</span>
                            <span>{item.time}</span>
                          </div>
                          <p className="text-xs text-neutral-200 leading-relaxed font-light">
                            {item.snippet}
                          </p>
                        </div>
                      ))
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
                    Thông báo sẽ được chuyển trực tiếp về hòm thư Admin (anhtuantran0512@gmail.com) và Ban Giám Hiệu để xử lý kỷ luật.
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
