/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Coins,
  Flag,
  Heart,
  HelpCircle,
  Save,
  Share2,
  ShoppingBag,
  Sparkles,
  Star,
  Upload,
  X,
} from 'lucide-react';
import type { User, Question, Solution, ShopItem, ShopTierColor } from '../types';
import { TierBadge, AdminVerifiedBadge } from './Badges10Tier';
import { getTierForLevel } from '../utils/tier';
import { getXPForLevel } from '../store/forumStore';
import { HologramStudentCard } from './HologramStudentCard';
import { DEFAULT_AVATAR, handleImageError } from '../utils/mediaFallback';
import { SHOP_ITEMS, getTierColorStyles } from '../utils/shopData';
import { ShopItemSvg } from './ShopItemSvg';
import { LikeHeartButton } from './LikeHeartButton';
import { EARNED_BADGES } from '../utils/badges';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  viewerUser?: User | null;
  onSaveProfile: (updates: Partial<User>) => Promise<boolean> | boolean | void;
  onPurchaseShopItem: (itemId: string) => Promise<{ success: boolean; message?: string }>;
  initialTab?: 'overview' | 'card' | 'stats' | 'shop' | 'activity' | 'edit';
  questions?: Question[];
  solutions?: Solution[];
}

type TabType = NonNullable<ProfileModalProps['initialTab']>;
type SubjectTag = Question['subject'];

const SUBJECT_NAMES: Record<SubjectTag, string> = {
  toan: 'Toán', ly: 'Vật lý', hoa: 'Hóa học', sinh: 'Sinh học', anh: 'Tiếng Anh',
  tin: 'Tin học', van: 'Ngữ văn', su: 'Lịch sử', hotro: 'Hỗ trợ',
  kinhnghiem: 'Kinh nghiệm', share: 'Chia sẻ', tamsu: 'Tâm sự', tamly: 'Tâm lý',
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('vi-VN');
};

const ProfileModalInner: React.FC<Omit<ProfileModalProps, 'isOpen'>> = ({
  currentUser,
  viewerUser,
  onClose,
  onSaveProfile,
  onPurchaseShopItem,
  initialTab = 'overview',
  questions = [],
  solutions = [],
}) => {
  const isOwnProfile = Boolean(viewerUser && viewerUser.id === currentUser.id);
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
  const tier = getTierForLevel(currentUser.level);
  const userCoin = Math.max(0, Number(currentUser.coin) || 0);
  const userInventory = currentUser.inventory || [];
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [shopFilter, setShopFilter] = useState<'all' | ShopTierColor>('all');
  const [activityFilter, setActivityFilter] = useState<'questions' | 'answers'>('answers');
  const [shopMessage, setShopMessage] = useState('');
  const [isBuying, setIsBuying] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [name, setName] = useState(currentUser.name);
  const [avatar, setAvatar] = useState(currentUser.avatar || DEFAULT_AVATAR);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [gender, setGender] = useState(currentUser.gender || '');
  const [city, setCity] = useState(currentUser.city || '');
  const [className, setClassName] = useState(currentUser.className || '');
  const [editError, setEditError] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Nội dung vi phạm');
  const [reportDetails, setReportDetails] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  useEffect(() => {
    setName(currentUser.name);
    setAvatar(currentUser.avatar || DEFAULT_AVATAR);
    setBio(currentUser.bio || '');
    setGender(currentUser.gender || '');
    setCity(currentUser.city || '');
    setClassName(currentUser.className || '');
  }, [currentUser.id, currentUser.name, currentUser.avatar, currentUser.bio, currentUser.gender, currentUser.city, currentUser.className]);

  useEffect(() => {
    if (activeTab === 'edit' && !isOwnProfile) setActiveTab('overview');
    if (activeTab === 'shop' && !isOwnProfile) setActiveTab('overview');
  }, [activeTab, isOwnProfile]);

  useEffect(() => {
    if (!isReportOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsReportOpen(false);
        setReportMessage('');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isReportOpen]);

  const userQuestions = useMemo(
    () => questions.filter((question) => question.authorId === currentUser.id).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [questions, currentUser.id],
  );
  const userSolutions = useMemo(
    () => solutions.filter((solution) => solution.authorId === currentUser.id).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [solutions, currentUser.id],
  );
  const questionsById = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions]);
  const earnedBadges = useMemo(() => {
    const earned = new Set(currentUser.earnedBadges || []);
    return EARNED_BADGES.filter((badge) => earned.has(badge.id));
  }, [currentUser.earnedBadges]);
  const inventoryItems = useMemo(
    () => SHOP_ITEMS.filter((item) => userInventory.includes(item.id)),
    [userInventory],
  );
  const thanksCount = Number(currentUser.stats?.thanksCount) || 0;
  const bestAnswersCount = userSolutions.filter((solution) => solution.isBest).length;
  const nextLevelXP = getXPForLevel(Math.min(150, currentUser.level + 1));
  const levelStartXP = getXPForLevel(currentUser.level);
  const levelProgress = currentUser.level >= 150
    ? 100
    : Math.min(100, Math.max(0, Math.round(((currentUser.xp - levelStartXP) / Math.max(1, nextLevelXP - levelStartXP)) * 100)));
  const ownedTabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Cá nhân' },
    { id: 'card', label: 'Thẻ' },
    { id: 'stats', label: 'Thống kê' },
    { id: 'activity', label: 'Hoạt động' },
    ...(isOwnProfile ? [{ id: 'shop' as TabType, label: 'Cửa hàng' }, { id: 'edit' as TabType, label: 'Chỉnh sửa' }] : []),
  ];
  const filteredShopItems = useMemo(
    () => shopFilter === 'all' ? SHOP_ITEMS : SHOP_ITEMS.filter((item) => item.tierColor === shopFilter),
    [shopFilter],
  );
  const subjectCounts = useMemo(() => {
    const counts = new Map<SubjectTag, number>();
    userSolutions.forEach((solution) => {
      const subject = questionsById.get(solution.questionId)?.subject;
      if (subject) counts.set(subject, (counts.get(subject) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [userSolutions, questionsById]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setEditError('Chọn một tệp ảnh hợp lệ.');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setEditError('Ảnh cần nhỏ hơn 5 MB.');
      event.target.value = '';
      return;
    }
    setEditError('');
    const reader = new FileReader();
    reader.onerror = () => setEditError('Không thể đọc ảnh. Hãy thử lại.');
    reader.onload = () => {
      const source = typeof reader.result === 'string' ? reader.result : '';
      const image = new Image();
      image.onerror = () => setEditError('Không thể mở ảnh đã chọn.');
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const side = 256;
        canvas.width = side;
        canvas.height = side;
        const context = canvas.getContext('2d');
        if (!context) {
          setEditError('Không thể xử lý ảnh trên thiết bị này.');
          return;
        }
        const scale = Math.max(side / image.width, side / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        context.drawImage(image, (side - width) / 2, (side - height) / 2, width, height);
        setAvatar(canvas.toDataURL('image/jpeg', 0.76));
      };
      image.src = source;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isOwnProfile || isSaving) return;
    if (!name.trim()) {
      setEditError('Tên hiển thị không được để trống.');
      return;
    }
    setIsSaving(true);
    setEditError('');
    setSaveMessage('');
    try {
      const result = await onSaveProfile({
        name: name.trim().slice(0, 50),
        avatar,
        bio: bio.trim().slice(0, 100),
        gender,
        city: city.trim().slice(0, 50),
        className: className.trim().slice(0, 50),
      });
      if (result === false) throw new Error('Không thể lưu hồ sơ. Vui lòng thử lại.');
      setSaveMessage('Đã lưu thay đổi.');
      setActiveTab('overview');
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Không thể lưu hồ sơ.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBuyItem = async (item: ShopItem) => {
    if (!isOwnProfile || isBuying) return;
    setIsBuying(item.id);
    setShopMessage('Đang xử lý giao dịch…');
    try {
      const result = await onPurchaseShopItem(item.id);
      if (!result.success) throw new Error(result.message || 'Không thể mua vật phẩm.');
      setShopMessage(`Đã thêm “${item.name}” vào túi đồ.`);
    } catch (error) {
      setShopMessage(error instanceof Error ? error.message : 'Không thể mua vật phẩm.');
    } finally {
      setIsBuying(null);
    }
  };

  const handleEquipItem = async (itemId: string) => {
    if (!isOwnProfile) return;
    const nextBadge = currentUser.equippedBadge === itemId ? '' : itemId;
    const result = await onSaveProfile({ equippedBadge: nextBadge });
    if (result === false) setShopMessage('Không thể cập nhật trang bị.');
    else setShopMessage(nextBadge ? 'Đã trang bị vật phẩm.' : 'Đã gỡ trang bị.');
  };

  const handleReportSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isReporting) return;
    if (!viewerUser) {
      setReportMessage('Đăng nhập để gửi tố cáo.');
      return;
    }
    setIsReporting(true);
    setReportMessage('');
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: viewerUser.id,
          reportedUserId: currentUser.id,
          reason: reportReason,
          details: reportDetails.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể gửi tố cáo.');
      setReportMessage('Đã ghi nhận tố cáo.');
    } catch (error) {
      setReportMessage(error instanceof Error ? error.message : 'Không thể gửi tố cáo.');
    } finally {
      setIsReporting(false);
    }
  };

  const handleShare = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('profile', currentUser.id);
    try {
      if (navigator.share) {
        await navigator.share({ title: `Hồ sơ của ${currentUser.name}`, url: url.toString() });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url.toString());
        setSaveMessage('Đã sao chép liên kết hồ sơ.');
      }
    } catch {
      // Sharing can be dismissed by the user without changing the profile.
    }
  };

  const closeReport = () => {
    setIsReportOpen(false);
    setReportMessage('');
    setReportDetails('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label={`Hồ sơ của ${currentUser.name}`}>
      <button type="button" aria-label="Đóng hồ sơ" onClick={onClose} className="absolute inset-0 cursor-default bg-transparent" />
      <section className="relative z-10 flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0c1218]/[0.98] shadow-2xl">
        <header className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <img src={currentUser.avatar || DEFAULT_AVATAR} alt="" onError={(event) => handleImageError(event, DEFAULT_AVATAR)} className="h-10 w-10 rounded-xl border border-white/10 object-cover" />
            <div className="min-w-0">
              <h2 className="flex items-center gap-1.5 truncate text-sm font-bold text-white">
                {currentUser.name}
                {isSuperAdmin && <AdminVerifiedBadge size={14} />}
              </h2>
              <p className="truncate text-[11px] text-white/45">{tier.name} · Cấp {currentUser.level}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            <nav className="flex min-w-max items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1" aria-label="Các mục hồ sơ">
              {ownedTabs.map((tab) => (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`rounded-full px-3 py-1.5 text-xs transition ${activeTab === tab.id ? 'bg-teal-400/15 text-teal-100' : 'text-white/55 hover:text-white'}`}>
                  {tab.label}
                </button>
              ))}
            </nav>
            <button type="button" onClick={onClose} aria-label="Đóng hồ sơ" className="rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-white"><X size={16} /></button>
          </div>
        </header>

        {(saveMessage || shopMessage) && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-teal-300/15 bg-teal-300/[0.06] px-3 py-2 text-xs text-teal-100 sm:mx-5">
            <CheckCircle2 size={14} /> {shopMessage || saveMessage}
            <button type="button" className="ml-auto text-white/40 hover:text-white" onClick={() => { setSaveMessage(''); setShopMessage(''); }} aria-label="Đóng thông báo"><X size={13} /></button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-teal-400/[0.08] via-white/[0.025] to-indigo-400/[0.08] p-4 sm:p-5">
                <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-teal-300/[0.08] blur-3xl" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="relative shrink-0">
                    <img src={currentUser.avatar || DEFAULT_AVATAR} alt={currentUser.name} onError={(event) => handleImageError(event, DEFAULT_AVATAR)} className="h-20 w-20 rounded-2xl border border-white/15 object-cover" />
                    <span className="absolute -bottom-2 -right-2"><TierBadge level={currentUser.level} size={24} showTooltip={false} /></span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-white">{currentUser.name}</h3>
                      {isSuperAdmin && <AdminVerifiedBadge size={15} />}
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/60">
                        {currentUser.role === 'SUPER_ADMIN' ? 'Quản trị viên' : currentUser.role === 'CLUB_LEADER' ? 'Chủ nhiệm CLB' : 'Thành viên'}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-white/55">{currentUser.bio || 'Chưa có tiểu sử.'}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/55">
                      <span className="inline-flex items-center gap-1.5"><TierBadge level={currentUser.level} size={16} showTooltip={false} /> {tier.name}</span>
                      <span className="inline-flex items-center gap-1.5"><Sparkles size={14} className="text-teal-200" /> {currentUser.xp.toLocaleString()} XP</span>
                      <span className="inline-flex items-center gap-1.5"><Coins size={14} className="text-amber-200" /> {userCoin.toLocaleString()} Coin</span>
                      {currentUser.streakCount ? <span className="inline-flex items-center gap-1.5"><span aria-hidden="true">🔥</span> {currentUser.streakCount} ngày liên tiếp</span> : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {viewerUser && viewerUser.id !== currentUser.id && (
                        <LikeHeartButton targetUserId={currentUser.id} viewerUserId={viewerUser.id} initialCount={thanksCount} />
                      )}
                      <button type="button" onClick={handleShare} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/65 transition hover:bg-white/[0.08] hover:text-white"><Share2 size={14} /> Chia sẻ</button>
                      {!isOwnProfile && (
                        <button type="button" onClick={() => { setIsReportOpen(true); setReportMessage(''); }} title="Tố cáo" className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-3 py-2 text-xs text-rose-200/80 transition hover:bg-rose-300/10 hover:text-rose-100"><Flag size={14} /> <span>Tố cáo</span></button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  { label: 'XP', value: currentUser.xp, icon: <Sparkles size={14} />, tone: 'text-teal-200' },
                  { label: 'Coin', value: userCoin, icon: <Coins size={14} />, tone: 'text-amber-200' },
                  { label: 'Câu hỏi', value: userQuestions.length, icon: <HelpCircle size={14} />, tone: 'text-sky-200' },
                  { label: 'Lời giải', value: userSolutions.length, icon: <BookOpen size={14} />, tone: 'text-indigo-200' },
                  { label: 'Được chọn', value: bestAnswersCount, icon: <Award size={14} />, tone: 'text-yellow-200' },
                  { label: 'Cảm ơn', value: thanksCount, icon: <Heart size={14} />, tone: 'text-rose-200' },
                ].map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3">
                    <div className={`flex items-center gap-1.5 text-[11px] ${metric.tone}`}>{metric.icon}{metric.label}</div>
                    <div className="mt-2 text-lg font-semibold text-white">{metric.value.toLocaleString()}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-white">Tiến độ cấp độ</h4>
                    <span className="text-xs text-white/50">{currentUser.level >= 150 ? 'Tối đa' : `${levelProgress}%`}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Tiến độ lên cấp" aria-valuemin={0} aria-valuemax={100} aria-valuenow={levelProgress}>
                    <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-300 transition-[width]" style={{ width: `${levelProgress}%` }} />
                  </div>
                  <p className="mt-2 text-[11px] text-white/45">{currentUser.level >= 150 ? 'Đã đạt cấp độ cao nhất.' : `${Math.max(0, nextLevelXP - currentUser.xp).toLocaleString()} XP đến cấp ${currentUser.level + 1}`}</p>
                </section>

                <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-white">Huy hiệu đã đạt</h4>
                    <span className="text-xs text-white/45">{earnedBadges.length}</span>
                  </div>
                  {earnedBadges.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {earnedBadges.map((badge) => (
                        <span key={badge.id} title={badge.description} className="inline-flex items-center gap-1.5 rounded-full border border-teal-200/15 bg-teal-300/[0.06] px-2.5 py-1.5 text-[11px] text-teal-100"><BadgeCheck size={14} />{badge.name}</span>
                      ))}
                    </div>
                  ) : <p className="mt-3 text-xs text-white/45">Chưa có huy hiệu. Huy hiệu sẽ được ghi nhận khi bạn hoàn thành cột mốc.</p>}
                </section>
              </div>

              <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-white">Vật phẩm đang sở hữu</h4>
                  {isOwnProfile && <button type="button" onClick={() => setActiveTab('shop')} className="text-xs text-teal-200 hover:text-teal-100">Mở cửa hàng</button>}
                </div>
                {inventoryItems.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {inventoryItems.map((item) => (
                      <span key={item.id} className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-2 text-xs ${getTierColorStyles(item.tierColor).bg} ${getTierColorStyles(item.tierColor).border}`}>
                        <ShopItemSvg type={item.iconType} size={20} />{item.name}
                        {currentUser.equippedBadge === item.id && <span className="text-[10px] text-emerald-200">Đang trang bị</span>}
                      </span>
                    ))}
                  </div>
                ) : <p className="mt-3 text-xs text-white/45">Chưa có vật phẩm nào.</p>}
              </section>
            </div>
          )}

          {activeTab === 'card' && <HologramStudentCard user={currentUser} showPrivateDetails={isOwnProfile} />}

          {activeTab === 'stats' && (
            <div className="space-y-4">
              <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <h3 className="text-sm font-semibold text-white">Đóng góp theo chủ đề</h3>
                {subjectCounts.length ? (
                  <div className="mt-3 space-y-2">
                    {subjectCounts.map(([subject, count]) => (
                      <div key={subject} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 text-xs text-white/55">{SUBJECT_NAMES[subject]}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-sky-300" style={{ width: `${Math.max(8, count / Math.max(...subjectCounts.map(([, value]) => value)) * 100)}%` }} /></div>
                        <span className="w-8 text-right text-xs text-white/65">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="mt-3 text-xs text-white/45">Chưa có lời giải để thống kê theo chủ đề.</p>}
              </section>
              <section className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"><p className="text-xs text-white/45">Ngày tham gia</p><p className="mt-1 text-sm font-medium text-white">{formatDate(currentUser.joinedAt)}</p></div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"><p className="text-xs text-white/45">Chuỗi điểm danh</p><p className="mt-1 text-sm font-medium text-white">{currentUser.streakCount || 0} ngày</p></div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"><p className="text-xs text-white/45">Ngày điểm danh đã lưu</p><p className="mt-1 text-sm font-medium text-white">{currentUser.attendanceDates?.length || 0}</p></div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"><p className="text-xs text-white/45">Huy hiệu đã đạt</p><p className="mt-1 text-sm font-medium text-white">{earnedBadges.length}</p></div>
              </section>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setActivityFilter('answers')} className={`rounded-full px-3 py-1.5 text-xs ${activityFilter === 'answers' ? 'bg-teal-300/15 text-teal-100' : 'text-white/50 hover:text-white'}`}>Lời giải ({userSolutions.length})</button>
                <button type="button" onClick={() => setActivityFilter('questions')} className={`rounded-full px-3 py-1.5 text-xs ${activityFilter === 'questions' ? 'bg-teal-300/15 text-teal-100' : 'text-white/50 hover:text-white'}`}>Câu hỏi ({userQuestions.length})</button>
              </div>
              {activityFilter === 'questions' ? (
                userQuestions.length ? <div className="space-y-2">{userQuestions.map((question) => (
                  <article key={question.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between gap-3 text-[11px] text-white/40"><span>{SUBJECT_NAMES[question.subject] || question.subject}</span><time>{formatDate(question.createdAt)}</time></div>
                    <h4 className="mt-1 text-sm font-semibold text-white">{question.title}</h4>
                    <p className="mt-1 line-clamp-2 text-xs text-white/55">{question.content}</p>
                    <div className="mt-2 text-[11px] text-white/40">{question.isSolved ? 'Đã giải quyết' : 'Đang chờ lời giải'}{question.bountyPaid ? ' · Thưởng đã trả' : ''}</div>
                  </article>
                ))}</div> : <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-white/45">Chưa có câu hỏi nào.</p>
              ) : (
                userSolutions.length ? <div className="space-y-2">{userSolutions.map((solution) => {
                  const question = questionsById.get(solution.questionId);
                  return <article key={solution.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between gap-3 text-[11px] text-white/40"><span>{question ? SUBJECT_NAMES[question.subject] : 'Lời giải'}</span><time>{formatDate(solution.createdAt)}</time></div>
                    <h4 className="mt-1 text-sm font-semibold text-white">{question?.title || 'Câu hỏi đã bị gỡ'}</h4>
                    <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-white/55">{solution.content}</p>
                    {solution.isBest && <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-200/15 bg-amber-200/[0.06] px-2 py-1 text-[10px] text-amber-100"><Star size={12} /> Được chọn</span>}
                  </article>;
                })}</div> : <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-white/45">Chưa có lời giải nào.</p>
              )}
            </div>
          )}

          {activeTab === 'shop' && isOwnProfile && (
            <div className="space-y-4">
              <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/10 bg-gradient-to-r from-amber-200/[0.06] to-teal-200/[0.04] p-4">
                <div><h3 className="flex items-center gap-2 text-sm font-semibold text-white"><ShoppingBag size={16} className="text-amber-200" /> Cửa hàng</h3><p className="mt-1 text-xs text-white/45">Vật phẩm được trừ Coin và ghi nhận vào túi đồ của bạn.</p></div>
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200/15 bg-black/20 px-3 py-2 text-sm font-semibold text-amber-100"><Coins size={15} />{userCoin.toLocaleString()} Coin</div>
              </section>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {([
                  { id: 'all', label: 'Tất cả' }, { id: 'green', label: 'Lục' }, { id: 'blue', label: 'Lam' }, { id: 'red', label: 'Đỏ' }, { id: 'purple', label: 'Tím' },
                ] as const).map((filter) => <button key={filter.id} type="button" onClick={() => setShopFilter(filter.id)} className={`rounded-full px-3 py-1.5 text-xs ${shopFilter === filter.id ? 'bg-teal-300/15 text-teal-100' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>{filter.label}</button>)}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredShopItems.map((item) => {
                  const owned = userInventory.includes(item.id);
                  const equipped = currentUser.equippedBadge === item.id;
                  const canAfford = userCoin >= item.price;
                  const styles = getTierColorStyles(item.tierColor);
                  return <article key={item.id} className={`flex flex-col justify-between rounded-2xl border p-3.5 ${styles.bg} ${styles.border}`}>
                    <div><div className="flex items-start justify-between"><div className="grid h-11 w-11 place-items-center rounded-xl bg-black/20"><ShopItemSvg type={item.iconType} size={32} /></div><span className="rounded-full bg-black/20 px-2 py-1 text-[10px] text-white/55">{item.tierColor}</span></div><h4 className="mt-3 text-sm font-semibold text-white">{item.name}</h4><p className="mt-1 min-h-9 text-xs text-white/50">{item.description}</p></div>
                    <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3"><span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-100"><Coins size={13} />{item.price}</span>
                      {owned ? <button type="button" onClick={() => void handleEquipItem(item.id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${equipped ? 'bg-emerald-300/15 text-emerald-100' : 'bg-white/10 text-white hover:bg-white/15'}`}>{equipped ? 'Đang dùng' : 'Trang bị'}</button> : <button type="button" disabled={!canAfford || isBuying !== null} onClick={() => void handleBuyItem(item)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${canAfford ? 'bg-white/10 text-white hover:bg-white/15' : 'cursor-not-allowed bg-black/20 text-white/35'}`}>{isBuying === item.id ? 'Đang mua…' : canAfford ? 'Mua' : 'Thiếu Coin'}</button>}
                    </div>
                  </article>;
                })}
              </div>
              {shopMessage && <p className="text-xs text-white/55" aria-live="polite">{shopMessage}</p>}
            </div>
          )}

          {activeTab === 'edit' && isOwnProfile && (
            <form onSubmit={handleSaveProfile} className="mx-auto max-w-2xl space-y-4">
              <div className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10">
                  <img src={avatar} alt="Ảnh đại diện xem trước" onError={(event) => handleImageError(event, DEFAULT_AVATAR)} className="h-full w-full object-cover" />
                  <label htmlFor="profile-avatar-upload" className="absolute inset-0 grid cursor-pointer place-items-center bg-black/60 text-white opacity-0 transition group-hover:opacity-100"><Upload size={18} /><span className="sr-only">Chọn ảnh</span></label>
                  <input id="profile-avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} className="sr-only" />
                </div>
                <div><p className="text-sm font-semibold text-white">Ảnh đại diện</p><p className="mt-1 text-xs text-white/45">JPG, PNG hoặc WebP · tối đa 5 MB</p></div>
              </div>
              <label className="block text-xs text-white/60">Tên hiển thị<input value={name} onChange={(event) => setName(event.target.value)} maxLength={50} required className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-300/40" /></label>
              <label className="block text-xs text-white/60">Tiểu sử<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={100} rows={3} className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-300/40" /><span className="mt-1 block text-right text-[10px] text-white/35">{bio.length}/100</span></label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-xs text-white/60">Giới tính<select value={gender} onChange={(event) => setGender(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#101820] px-3 py-2.5 text-sm text-white outline-none"><option value="">Chưa chọn</option><option value="Nam">Nam</option><option value="Nữ">Nữ</option><option value="Khác">Khác</option></select></label>
                <label className="block text-xs text-white/60">Lớp / khóa<input value={className} onChange={(event) => setClassName(event.target.value)} maxLength={50} className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-300/40" /></label>
                <label className="block text-xs text-white/60">Thành phố<input value={city} onChange={(event) => setCity(event.target.value)} maxLength={50} className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-300/40" /></label>
              </div>
              {editError && <p className="flex items-center gap-2 text-xs text-rose-200"><AlertCircle size={14} />{editError}</p>}
              <div className="flex justify-end"><button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-teal-300/15 px-4 py-2.5 text-sm font-semibold text-teal-100 transition hover:bg-teal-300/20 disabled:opacity-50"><Save size={15} />{isSaving ? 'Đang lưu…' : 'Lưu thay đổi'}</button></div>
            </form>
          )}
        </div>
      </section>

      {isReportOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Tố cáo" onMouseDown={(event) => { if (event.target === event.currentTarget) closeReport(); }}>
          <section className="w-full max-w-md rounded-2xl border border-rose-200/15 bg-[#101820] p-5 shadow-2xl">
            <header className="mb-4 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Flag size={16} className="text-rose-200" />Tố cáo</h3><button type="button" aria-label="Đóng" onClick={closeReport} className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white"><X size={15} /></button></header>
            {reportMessage ? <div className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-center"><p className="text-sm text-white/75">{reportMessage}</p><button type="button" onClick={closeReport} className="rounded-lg bg-white/10 px-4 py-2 text-xs text-white">Đóng</button></div> : (
              <form onSubmit={handleReportSubmit} className="space-y-3">
                <p className="rounded-xl bg-white/[0.03] p-3 text-xs text-white/65">Đối tượng: <strong className="text-white">{currentUser.name}</strong></p>
                <label className="block text-xs text-white/60">Lý do<select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0c1218] px-3 py-2.5 text-sm text-white"><option>Nội dung vi phạm</option><option>Spam hoặc quảng cáo</option><option>Xúc phạm hoặc quấy rối</option><option>Gian lận</option><option>Khác</option></select></label>
                <label className="block text-xs text-white/60">Chi tiết<textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={500} rows={3} className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white" /></label>
                <p className="text-[11px] text-white/40">Tố cáo sẽ được xem xét theo nội quy cộng đồng.</p>
                <div className="flex justify-end gap-2"><button type="button" onClick={closeReport} className="rounded-lg px-3 py-2 text-xs text-white/55 hover:text-white">Hủy</button><button type="submit" disabled={isReporting} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-300/15 px-3 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-300/20 disabled:opacity-50"><Flag size={13} />{isReporting ? 'Đang gửi…' : 'Gửi tố cáo'}</button></div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, currentUser, initialTab = 'overview', ...props }) => {
  if (!isOpen) return null;
  return <ProfileModalInner key={`${currentUser.id}-${initialTab}`} currentUser={currentUser} initialTab={initialTab} {...props} />;
};

export default ProfileModal;
