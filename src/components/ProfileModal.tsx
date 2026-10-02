import React, { useState, useMemo } from 'react';
import {
  X,
  Upload,
  Check,
  AlertCircle,
  Sparkles,
  CreditCard,
  UserPen,
  BarChart3,
  ShoppingBag,
  History,
  Coins,
  Heart,
  Trophy,
  Star,
  CheckCircle2,
  Users,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';
import type { User, Question, Solution, ShopItem, ShopTierColor } from '../types';
import { TierBadge, AdminVerifiedBadge } from './Badges10Tier';
import { getTierForLevel } from '../utils/tier';
import { HologramStudentCard } from './HologramStudentCard';
import { DEFAULT_AVATAR, handleImageError } from '../utils/mediaFallback';
import { SHOP_ITEMS, getTierColorStyles } from '../utils/shopData';
import { ShopItemSvg } from './ShopItemSvg';
import { pushNotification } from '../utils/notifications';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  viewerUser?: User | null;
  onSaveProfile: (updates: Partial<User>) => void;
  initialTab?: 'card' | 'stats' | 'shop' | 'activity' | 'edit';
  questions?: Question[];
  solutions?: Solution[];
}

type TabType = 'card' | 'stats' | 'shop' | 'activity' | 'edit';

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
  initialTab = 'card',
  questions = [],
  solutions = [],
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [shopFilter, setShopFilter] = useState<'all' | ShopTierColor>('all');
  const [activitySubTab, setActivitySubTab] = useState<'questions' | 'solutions'>('questions');

  // Edit form states
  const [name, setName] = useState(currentUser.name);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [gender, setGender] = useState(currentUser.gender || 'Nam');
  const [city, setCity] = useState(currentUser.city || '');
  const [className, setClassName] = useState(currentUser.className || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isSuperAdmin = currentUser.email === 'anhtuantran0512@gmail.com';
  const isOwnProfile = !viewerUser || viewerUser.id === currentUser.id;
  const tier = getTierForLevel(currentUser.level);

  // User Coin & Inventory
  const userCoin =
    currentUser.coin ?? (isSuperAdmin ? 99999 : 100);
  const userInventory = useMemo(
    () => currentUser.inventory || ['pencil_starter'],
    [currentUser.inventory]
  );

  // User questions & solutions
  const userQuestions = useMemo(
    () => questions.filter((q) => q.authorId === currentUser.id),
    [questions, currentUser.id]
  );
  const userSolutions = useMemo(
    () => solutions.filter((s) => s.authorId === currentUser.id),
    [solutions, currentUser.id]
  );

  // 6 Metrics calculation
  const statsMetrics = useMemo(() => {
    const thanks =
      currentUser.stats?.thanksCount ??
      userSolutions.reduce((acc, s) => acc + (s.upvotes || 0), 0) + (isSuperAdmin ? 128 : 12);
    const bestSolutions =
      currentUser.stats?.bestCount ??
      userSolutions.filter((s) => s.isBest).length + (isSuperAdmin ? 36 : 4);
    const fiveStar =
      currentUser.stats?.fiveStarCount ??
      Math.min(99, Math.floor((currentUser.level || 1) * 3) + (isSuperAdmin ? 50 : 8));
    const verified =
      currentUser.stats?.verifiedCount ??
      Math.min(100, Math.floor((currentUser.level || 1) * 2) + (isSuperAdmin ? 80 : 5));
    const helped =
      currentUser.stats?.helpedCount ??
      userSolutions.length + Math.max(1, Math.floor((currentUser.level || 1) * 3.5));

    return {
      coin: userCoin,
      thanks,
      bestSolutions,
      fiveStar,
      verified,
      helped,
    };
  }, [currentUser, userSolutions, userCoin, isSuperAdmin]);

  // 6-Axis Radar Spider Chart setup
  const radarAxes = useMemo(() => {
    const disciplines = [
      { name: 'KHTN', full: 'Tự Nhiên', tags: ['toan', 'ly', 'hoa', 'sinh'] },
      { name: 'KHXH', full: 'Xã Hội', tags: ['van', 'su', 'tamsu', 'tamly'] },
      { name: 'KHCN', full: 'Công Nghệ', tags: ['tin', 'hotro'] },
      { name: 'Nghệ Thuật', full: 'Sáng Tạo', tags: ['share', 'kinhnghiem'] },
      { name: 'Ngoại Ngữ', full: 'Ngôn Ngữ', tags: ['anh'] },
      { name: 'Hoạt Động', full: 'Cộng Đồng', tags: [] },
    ];

    let hash = 0;
    for (let i = 0; i < currentUser.id.length; i++) {
      hash = (hash * 31 + currentUser.id.charCodeAt(i)) % 1000;
    }
    const levelBonus = Math.min(40, (currentUser.level || 1) * 2);

    return disciplines.map((disc, idx) => {
      const angle = (idx * 60 - 90) * (Math.PI / 180);
      if (isSuperAdmin) {
        return { name: disc.name, full: disc.full, score: 98, angle };
      }
      const matched =
        userQuestions.filter((q) => (disc.tags as string[]).includes(q.subject)).length +
        userSolutions.length;
      const seedVal = (hash + idx * 43) % 25;
      const computedScore = Math.min(
        98,
        Math.max(38, 48 + levelBonus + matched * 4 + (seedVal - 10))
      );

      return {
        name: disc.name,
        full: disc.full,
        score: computedScore,
        angle,
      };
    });
  }, [currentUser, userQuestions, userSolutions, isSuperAdmin]);

  const radarCx = 160;
  const radarCy = 145;
  const radarRadius = 88;

  const dataPolygonPoints = radarAxes
    .map((a) => {
      const r = (a.score / 100) * radarRadius;
      const x = radarCx + r * Math.cos(a.angle);
      const y = radarCy + r * Math.sin(a.angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const gridRings = [0.25, 0.5, 0.75, 1.0].map((level) => {
    const points = [0, 1, 2, 3, 4, 5]
      .map((i) => {
        const a = (i * 60 - 90) * (Math.PI / 180);
        const x = radarCx + level * radarRadius * Math.cos(a);
        const y = radarCy + level * radarRadius * Math.sin(a);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    return { level, points };
  });

  // Shop actions
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

  // Avatar upload with size verification (< 5MB)
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
        `Kích thước file (${(file.size / (1024 * 1024)).toFixed(
          2
        )}MB) vượt quá 5MB cho phép!`
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
      setActiveTab('card');
    }, 200);
  };

  const filteredShopItems = useMemo(() => {
    if (shopFilter === 'all') return SHOP_ITEMS;
    return SHOP_ITEMS.filter((it) => it.tierColor === shopFilter);
  }, [shopFilter]);

  const equippedItemObj = useMemo(
    () => SHOP_ITEMS.find((it) => it.id === currentUser.equippedBadge),
    [currentUser.equippedBadge]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-up"
      role="dialog"
      aria-modal="true"
      aria-label="F-PASS Virtual Campus ID"
    >
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Đóng hồ sơ"
        className="fixed inset-0 bg-transparent border-none outline-none cursor-default"
        onClick={onClose}
      />

      <div className="liquid-glass w-full max-w-2xl rounded-3xl bg-[#0c1218]/95 border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.85)] p-4 sm:p-6 relative z-10 overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10 mb-4 gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-600/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-1.5 truncate">
                <span>{currentUser.name}</span>
                {isSuperAdmin && <AdminVerifiedBadge size={14} />}
              </h2>
              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-white/50 font-mono">
                <span>Danh hiệu: {tier.name}</span>
                <span>•</span>
                <span className="text-amber-400 font-semibold">{userCoin} Coin</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            {/* Scrollable Tab Pills */}
            <div className="flex items-center bg-black/50 p-1 rounded-full border border-white/10 overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setActiveTab('card')}
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'card'
                    ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)] font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-3 h-3" />
                <span>Thẻ F-Pass</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('stats')}
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'stats'
                    ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)] font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3 h-3" />
                <span>Chỉ Số & Radar</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('shop')}
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'shop'
                    ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)] font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <ShoppingBag className="w-3 h-3" />
                <span>Chill Box</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'activity'
                    ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)] font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <History className="w-3 h-3" />
                <span>Hoạt Động</span>
              </button>

              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'edit'
                      ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)] font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <UserPen className="w-3 h-3" />
                  <span>Sửa F-ID</span>
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
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-xs text-red-300 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* TAB 1: 3D Hologram Student Card */}
          {activeTab === 'card' && (
            <div className="space-y-4">
              <HologramStudentCard user={currentUser} />

              {/* Equipped item banner if any */}
              {equippedItemObj && (
                <div className="p-3 rounded-2xl liquid-glass bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-black/40 border border-amber-400/30 flex items-center justify-center p-1">
                      <ShopItemSvg type={equippedItemObj.iconType} size={24} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Vật phẩm trang bị: {equippedItemObj.name}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Active
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400">{equippedItemObj.description}</p>
                    </div>
                  </div>
                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => handleEquipItem(equippedItemObj.id)}
                      className="px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-white/10 hover:bg-white/20 text-neutral-300 cursor-pointer"
                    >
                      Tháo ra
                    </button>
                  )}
                </div>
              )}

              {/* Quick Action Footer in Card View */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <div className="text-[11px] text-white/50 font-mono">
                  Bảo chứng danh tính mã hóa F-Forum.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('stats')}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Xem Radar Chỉ Số</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition-all shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Stats & 6-Axis Radar Spider Chart */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              {/* 6-Metric Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col items-center text-center">
                  <Coins className="w-4 h-4 text-amber-400 mb-1" />
                  <span className="text-xs font-bold text-amber-300 font-mono">{statsMetrics.coin}</span>
                  <span className="text-[10px] text-neutral-400">Ví Coin</span>
                </div>

                <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex flex-col items-center text-center">
                  <Heart className="w-4 h-4 text-rose-400 mb-1" />
                  <span className="text-xs font-bold text-rose-300 font-mono">{statsMetrics.thanks}</span>
                  <span className="text-[10px] text-neutral-400">Cảm Ơn</span>
                </div>

                <div className="p-2.5 rounded-2xl bg-yellow-500/10 border border-yellow-500/25 flex flex-col items-center text-center">
                  <Trophy className="w-4 h-4 text-yellow-400 mb-1" />
                  <span className="text-xs font-bold text-yellow-300 font-mono">{statsMetrics.bestSolutions}</span>
                  <span className="text-[10px] text-neutral-400">Hay Nhất</span>
                </div>

                <div className="p-2.5 rounded-2xl bg-amber-400/10 border border-amber-400/25 flex flex-col items-center text-center">
                  <Star className="w-4 h-4 text-amber-300 mb-1" />
                  <span className="text-xs font-bold text-amber-200 font-mono">{statsMetrics.fiveStar}</span>
                  <span className="text-[10px] text-neutral-400">5 Sao</span>
                </div>

                <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col items-center text-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-1" />
                  <span className="text-xs font-bold text-emerald-300 font-mono">{statsMetrics.verified}</span>
                  <span className="text-[10px] text-neutral-400">Xác Thực</span>
                </div>

                <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex flex-col items-center text-center">
                  <Users className="w-4 h-4 text-cyan-400 mb-1" />
                  <span className="text-xs font-bold text-cyan-300 font-mono">{statsMetrics.helped}</span>
                  <span className="text-[10px] text-neutral-400">Đã Giúp</span>
                </div>
              </div>

              {/* 6-Axis Radar Spider Chart Container */}
              <div className="p-4 rounded-3xl bg-black/40 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="w-full md:w-1/2 flex flex-col items-center">
                  <div className="text-center mb-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center justify-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                      BIỂU ĐỒ NĂNG LỰC HỌC TẬP (6 TRỤ CỘT)
                    </span>
                    <p className="text-[10px] text-neutral-400">Đánh giá đa chiều dựa trên đóng góp thực tế</p>
                  </div>

                  <svg viewBox="0 0 320 290" className="w-full max-w-[290px] h-auto overflow-visible">
                    <defs>
                      <radialGradient id="profileRadarGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1" />
                      </radialGradient>
                    </defs>

                    {/* Concentric rings */}
                    {gridRings.map((ring, idx) => (
                      <polygon
                        key={idx}
                        points={ring.points}
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeDasharray={ring.level === 1.0 ? 'none' : '3 3'}
                        strokeWidth={ring.level === 1.0 ? '1.5' : '1'}
                      />
                    ))}

                    {/* Spoke lines */}
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
                          stroke="rgba(255,255,255,0.12)"
                          strokeWidth="1"
                        />
                      );
                    })}

                    {/* User Data Polygon */}
                    <polygon
                      points={dataPolygonPoints}
                      fill="url(#profileRadarGrad)"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                    />

                    {/* Data dots */}
                    {radarAxes.map((axis, idx) => {
                      const r = (axis.score / 100) * radarRadius;
                      const x = radarCx + r * Math.cos(axis.angle);
                      const y = radarCy + r * Math.sin(axis.angle);
                      return (
                        <circle
                          key={idx}
                          cx={x}
                          cy={y}
                          r="4"
                          fill="#fbbf24"
                          stroke="#0c1218"
                          strokeWidth="2"
                        />
                      );
                    })}

                    {/* Axis Labels */}
                    {radarAxes.map((axis, idx) => {
                      const labelDist = radarRadius + 24;
                      const lx = radarCx + labelDist * Math.cos(axis.angle);
                      const ly = radarCy + labelDist * Math.sin(axis.angle);
                      return (
                        <g key={idx}>
                          <text
                            x={lx}
                            y={ly - 4}
                            textAnchor="middle"
                            fill="#e2e8f0"
                            fontSize="9.5"
                            fontWeight="bold"
                          >
                            {axis.name}
                          </text>
                          <text
                            x={lx}
                            y={ly + 8}
                            textAnchor="middle"
                            fill="#f59e0b"
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {axis.score}%
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Radar Details list */}
                <div className="w-full md:w-1/2 space-y-2">
                  <span className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider block font-mono">
                    CHI TIẾT PHÂN BỔ TRÍ TUỆ
                  </span>
                  {radarAxes.map((axis, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-300 font-medium">
                          {axis.name} ({axis.full})
                        </span>
                        <span className="text-amber-400 font-mono font-bold">{axis.score}%</span>
                      </div>
                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full"
                          style={{ width: `${axis.score}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Bảng thống kê số lượng câu đã giải theo từng phân môn */}
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2 mt-3">
                    <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider block font-mono">
                      THỐNG KÊ GIẢI BÀI THEO PHÂN MÔN
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-neutral-400 font-semibold">Khoa Học Tự Nhiên (KHTN):</span>
                        <div className="text-amber-300 font-mono text-[11px] pl-2">
                          Toán Học ({userQuestions.filter(q => q.subject === 'toan').length + userSolutions.length}), Hóa Học (1)
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-neutral-400 font-semibold">Khoa Học Xã Hội (KHXH):</span>
                        <div className="text-amber-200 font-mono text-[11px] pl-2">
                          Ngữ Văn ({userQuestions.filter(q => q.subject === 'van').length + 2}), Địa Lý (1)
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-neutral-400 font-semibold">Khoa Học Công Nghệ (KHCN):</span>
                        <div className="text-amber-300 font-mono text-[11px] pl-2">
                          Tin Học ({userQuestions.filter(q => q.subject === 'tin').length + 3}), Công Nghệ (1)
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-neutral-400 font-semibold">Sáng Tạo & Ngôn Ngữ:</span>
                        <div className="text-amber-200 font-mono text-[11px] pl-2">
                          Ngoại Ngữ ({userQuestions.filter(q => q.subject === 'anh').length + 1}), Nghệ Thuật (2)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Equipped Rank Bar */}
                  <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TierBadge level={currentUser.level} size={22} showTooltip={false} />
                      <div>
                        <div className="text-xs font-bold text-white">Danh hiệu: {tier.name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">Cấp độ học thuật {currentUser.level}/150</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('shop')}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 text-xs font-semibold cursor-pointer"
                    >
                      Tiệm Chill Box →
                    </button>
                  </div>
                </div>
              </div>

              {/* Túi Chill Box (Inventory preview) */}
              <div className="p-3.5 rounded-3xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                    TÚI ĐỒ CHILL BOX ({userInventory.length} VẬT PHẨM)
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">Nhấn để trang bị</span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {userInventory.map((itemId) => {
                    const item = SHOP_ITEMS.find((s) => s.id === itemId);
                    if (!item) return null;
                    const isEquipped = currentUser.equippedBadge === item.id;
                    const styles = getTierColorStyles(item.tierColor);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleEquipItem(item.id)}
                        className={`p-2 rounded-2xl flex flex-col items-center text-center transition-all cursor-pointer relative ${
                          isEquipped
                            ? 'bg-amber-500/20 border-2 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                            : `${styles.bg} border ${styles.border}`
                        }`}
                        title={`${item.name}: ${item.description}`}
                      >
                        <ShopItemSvg type={item.iconType} size={28} />
                        <span className="text-[10px] font-semibold text-white truncate max-w-full mt-1">
                          {item.name}
                        </span>
                        {isEquipped && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-black flex items-center justify-center text-[9px] font-bold">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
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

              {/* Color Filter Tabs (No Tier Names) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
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
                          {/* Color Tier Dot Indicator (Strictly No Tier Name Text) */}
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 border border-white/10">
                            <span
                              className={`w-3 h-3 rounded-full ${styles.dot}`}
                              title="Huy hiệu màu sắc độc bản"
                            />
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                            <span>{item.name}</span>
                            {isEquipped && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            )}
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
                                ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.5)]'
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
              {/* Metadata Tài Khoản */}
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-300">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-neutral-400">Ngày tham gia:</span>
                  <span className="text-white font-mono font-semibold">{currentUser.joinedAt || '10/07/2024'}</span>
                  <span>•</span>
                  <span className="text-neutral-400">Tuổi F-Forum:</span>
                  <span className="text-white font-mono font-semibold">2 năm</span>
                  <span>•</span>
                  <span className="text-sky-400 hover:underline cursor-pointer">Xem thêm thông tin</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-400">Số câu trả lời:</span>
                    <span className="text-cyan-300 font-mono font-bold">{userSolutions.length}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-400">Cảnh báo:</span>
                    <span className="text-emerald-400 font-mono font-bold">0</span>
                  </div>
                </div>
              </div>

              {/* Activity Sub-tabs */}
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                <button
                  type="button"
                  onClick={() => setActivitySubTab('questions')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activitySubTab === 'questions'
                      ? 'bg-amber-500 text-black shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Câu Hỏi Đã Tạo ({userQuestions.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivitySubTab('solutions')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activitySubTab === 'solutions'
                      ? 'bg-amber-500 text-black shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Lời Giải Đóng Góp ({userSolutions.length})</span>
                </button>
              </div>

              {/* Questions Stream */}
              {activitySubTab === 'questions' && (
                <div className="space-y-2.5">
                  {userQuestions.length === 0 ? (
                    <div className="py-12 text-center text-neutral-400 space-y-2">
                      <HelpCircle className="w-8 h-8 text-neutral-500 mx-auto" />
                      <p className="text-xs">Chưa có câu hỏi nào được tạo bởi học sinh này.</p>
                    </div>
                  ) : (
                    userQuestions.map((q) => (
                      <div
                        key={q.id}
                        className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold uppercase">
                            #{q.subject}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
                            {q.bountyCoin && q.bountyCoin > 0 ? (
                              <span className="text-amber-400 font-bold">+{q.bountyCoin} Coin</span>
                            ) : null}
                            <span>{q.views} lượt xem</span>
                            <span>• {q.createdAt}</span>
                          </div>
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2">
                          {q.title}
                        </h4>
                        <p className="text-xs text-neutral-300 line-clamp-2">{q.content}</p>

                        <div className="pt-2 flex items-center justify-between text-[11px]">
                          <span
                            className={
                              q.isSolved
                                ? 'text-emerald-400 font-semibold flex items-center gap-1'
                                : 'text-neutral-400 flex items-center gap-1'
                            }
                          >
                            {q.isSolved ? '✓ Đã giải quyết' : 'Đang chờ giải đáp'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Solutions Stream */}
              {activitySubTab === 'solutions' && (
                <div className="space-y-2.5">
                  {userSolutions.length === 0 ? (
                    <div className="py-12 text-center text-neutral-400 space-y-2">
                      <MessageSquare className="w-8 h-8 text-neutral-500 mx-auto" />
                      <p className="text-xs">Chưa có lời giải nào được đóng góp bởi học sinh này.</p>
                    </div>
                  ) : (
                    userSolutions.map((s) => (
                      <div
                        key={s.id}
                        className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {s.isBest && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold flex items-center gap-1">
                                <Trophy className="w-3 h-3 text-amber-400" />
                                Lời giải hay nhất
                              </span>
                            )}
                            <span className="text-xs text-neutral-400 font-mono">
                              ▲ {s.upvotes} ủng hộ
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {s.createdAt}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed">
                          {s.content}
                        </p>

                        {s.rewardCoin && s.rewardCoin > 0 ? (
                          <div className="pt-1 text-[10px] font-mono text-amber-400 font-semibold">
                            + Thưởng {s.rewardCoin} Coin vinh danh
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Edit Profile Form */}
          {activeTab === 'edit' && isOwnProfile && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Avatar & Rank preview row */}
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
                    <span
                      className={
                        isSuperAdmin
                          ? 'discord-admin-name text-sm'
                          : 'text-sm font-bold text-white'
                      }
                    >
                      {name || 'Học sinh FPT'}
                    </span>
                    {isSuperAdmin && <AdminVerifiedBadge size={14} />}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <TierBadge
                      level={currentUser.level}
                      size={20}
                      showTooltip={false}
                    />
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

              {/* Bio with live counter (Max 100 characters) */}
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
                  onClick={() => setActiveTab('card')}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Quay lại xem thẻ
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
    </div>
  );
};

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  viewerUser,
  onSaveProfile,
  initialTab = 'card',
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
