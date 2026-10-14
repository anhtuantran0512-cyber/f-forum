/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  PlusCircle,
  Users,
  Trophy,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Sparkles,
  Send,
  Lock,
  ExternalLink,
  X,
  FileText,
  Filter,
  Upload,
  Cpu,
  Palette,
  Activity,
  BookOpen,
} from 'lucide-react';
import type { Club, ClubPost, User, ClubCategory, ChatMessage } from '../../types';
import { DEFAULT_AVATAR, DEFAULT_CLUB_COVER, handleImageError } from '../../utils/mediaFallback';
import { isMasterAdmin } from '../../config/admin';
import { DecoratedAvatar, DecoratedName } from '../decorations/DecoratedAvatar';
import { InfoTip } from '../ui/InfoTip';
import './ClubsView.css';

interface ClubsViewProps {
  currentUser: User | null;
  users?: Record<string, User>;
  clubs: Club[];
  clubPosts: ClubPost[];
  onCreateClub: (clubData: {
    name: string;
    slogan: string;
    coverImage: string;
    category?: ClubCategory;
    foundingMembers: string[];
    purpose: string;
  }) => void | Promise<void>;
  /* Các thao tác này nay đọc kết quả thật từ máy chủ nên trả về Promise. */
  onApproveClub: (clubId: string) => void | Promise<void>;
  onRejectClub: (clubId: string, reason: string) => void | Promise<void>;
  onCreateClubPost: (clubId: string, title: string, content: string) => boolean | Promise<boolean>;
  chatMessages?: ChatMessage[];
  onOpenLoginModal?: () => void;
  isEmbedded?: boolean;
}

const CATEGORIES: ('Tất cả' | ClubCategory)[] = [
  'Tất cả',
  'Công nghệ',
  'Nghệ thuật',
  'Thể thao',
  'Học thuật',
];

const getCategoryBadgeClass = (category?: ClubCategory): string => {
  switch (category) {
    case 'Công nghệ':
      return 'bg-cyan-500/25 text-cyan-200 border-cyan-400/40';
    case 'Nghệ thuật':
      return 'bg-purple-500/25 text-purple-200 border-purple-400/40';
    case 'Thể thao':
      return 'bg-emerald-500/25 text-emerald-200 border-emerald-400/40';
    case 'Học thuật':
      return 'bg-amber-500/25 text-amber-200 border-amber-400/40';
    default:
      return 'bg-neutral-800/90 text-neutral-200 border-white/20';
  }
};

const getCategoryIcon = (category: 'Tất cả' | ClubCategory) => {
  switch (category) {
    case 'Công nghệ':
      return Cpu;
    case 'Nghệ thuật':
      return Palette;
    case 'Thể thao':
      return Activity;
    case 'Học thuật':
      return BookOpen;
    default:
      return Sparkles;
  }
};

export const ClubsView: React.FC<ClubsViewProps> = ({
  currentUser,
  users = {},
  clubs,
  clubPosts,
  onCreateClub,
  onApproveClub,
  onRejectClub,
  onCreateClubPost,
  chatMessages = [],
  onOpenLoginModal,
  isEmbedded = false,
}) => {
  const clubUsersLookup = useMemo(() => {
    const byId = new Map<string, User>();
    const byName = new Map<string, User>();
    for (const k in users) {
      const u = users[k];
      if (!u) continue;
      if (u.id) byId.set(u.id, u);
      if (u.name) byName.set(u.name.trim().toLowerCase(), u);
    }
    return { byId, byName };
  }, [users]);

  const resolveClubUser = useCallback(
    (id?: string | null, name?: string | null): User | null => {
      if (id) {
        if ((id === 'admin-master' || id === 'user-admin') && users['broamstuck@gmail.com']) {
          return users['broamstuck@gmail.com'];
        }
        const foundById = clubUsersLookup.byId.get(id);
        if (foundById) return foundById;
      }
      if (name) {
        const clean = name.trim().toLowerCase();
        const foundByName = clubUsersLookup.byName.get(clean);
        if (foundByName) return foundByName;
      }
      return null;
    },
    [users, clubUsersLookup],
  );
  const [selectedCategory, setSelectedCategory] = useState<'Tất cả' | ClubCategory>('Tất cả');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [rejectPromptClubId, setRejectPromptClubId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [applicationSubmitted, setApplicationSubmitted] = useState<string | null>(null);

  const [createCooldown, setCreateCooldown] = useState(0);
  const [isSubmittingClub, setIsSubmittingClub] = useState(false);
  const [postCooldown, setPostCooldown] = useState(0);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);

  const isCreateCooling = createCooldown > 0;
  useEffect(() => {
    if (!isCreateCooling) return;
    const timer = setInterval(() => {
      setCreateCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isCreateCooling]);

  const isPostCooling = postCooldown > 0;
  useEffect(() => {
    if (!isPostCooling) return;
    const timer = setInterval(() => {
      setPostCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPostCooling]);

  const [newClubName, setNewClubName] = useState('');
  const [newSlogan, setNewSlogan] = useState('');
  const [newCover, setNewCover] = useState('');
  const [newCategory, setNewCategory] = useState<ClubCategory>('Công nghệ');
  const [newFounders, setNewFounders] = useState('');
  const [newPurpose, setNewPurpose] = useState('');

  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');

  const isSuperAdmin = isMasterAdmin(currentUser?.email);

  const approvedClubs = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return clubs.filter(
      c =>
        c.status === 'APPROVED' &&
        (selectedCategory === 'Tất cả' || c.category === selectedCategory) &&
        (!q ||
          c.name.toLowerCase().includes(q) ||
          c.slogan.toLowerCase().includes(q) ||
          c.purpose.toLowerCase().includes(q))
    );
  }, [clubs, selectedCategory, searchTerm]);

  const pendingClubs = useMemo(() => clubs.filter(c => c.status === 'PENDING'), [clubs]);

  const clubScores = useMemo(
    () =>
      approvedClubs.map(club => {
        const postCount = clubPosts.filter(p => p.clubId === club.id).length;
        const msgCount = chatMessages.filter(
          m => m.channelId === 'club-hub' && m.content.toLowerCase().includes(club.name.toLowerCase())
        ).length;
        const score = postCount * 2 + msgCount;
        return { club, score };
      }),
    [approvedClubs, clubPosts, chatMessages],
  );

  const bestClubObj = clubScores.length > 0
    ? [...clubScores].sort((a, b) => b.score - a.score)[0]
    : null;

  /* Banner "CLB xuất sắc" CHỈ hiện khi có dữ liệu hoạt động thật (score > 0) */
  const spotlightClub = bestClubObj && bestClubObj.score > 0 ? bestClubObj.club : null;
  const regularClubs = spotlightClub
    ? approvedClubs.filter(c => c.id !== spotlightClub.id)
    : approvedClubs;

  const handleCoverFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setCoverUploadError('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP)!');
      e.target.value = '';
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setCoverUploadError(
        `Kích thước file (${(file.size / (1024 * 1024)).toFixed(2)}MB) vượt quá giới hạn 5MB!`
      );
      e.target.value = '';
      return;
    }

    setCoverUploadError(null);
    const reader = new FileReader();
    reader.onload = ev => {
      if (typeof ev.target?.result === 'string') {
        setNewCover(ev.target.result);
      }
    };
    reader.onerror = () => {
      setCoverUploadError('Lỗi đọc file ảnh. Vui lòng thử lại!');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (createCooldown > 0 || isSubmittingClub) return;
    if (!currentUser) {
      alert('Vui lòng đăng nhập để đăng ký thành lập CLB!');
      onOpenLoginModal?.();
      return;
    }

    if (!newClubName.trim() || !newSlogan.trim() || !newPurpose.trim()) {
      alert('Vui lòng điền đủ Tên CLB, Slogan và Tôn chỉ hoạt động!');
      return;
    }

    setIsSubmittingClub(true);

    const foundersList = newFounders
      .split(',')
      .map(f => f.trim().slice(0, 50))
      .filter(Boolean);

    void onCreateClub({
      name: newClubName.trim().slice(0, 60),
      slogan: newSlogan.trim().slice(0, 120),
      coverImage: newCover.trim().slice(0, 500) || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&h=500&fit=crop',
      category: newCategory,
      foundingMembers: foundersList.length > 0 ? foundersList : [currentUser?.name || 'Sáng lập viên'],
      purpose: newPurpose.trim().slice(0, 500),
    });

    setNewClubName('');
    setNewSlogan('');
    setNewCover('');
    setNewCategory('Công nghệ');
    setNewFounders('');
    setNewPurpose('');
    setIsCreateModalOpen(false);
    setIsSubmittingClub(false);
    setCreateCooldown(5);
  };

  const handleNewPost = async (clubId: string) => {
    if (postCooldown > 0 || isSubmittingPost) return;
    if (!postTitle.trim() || !postContent.trim()) return;

    setIsSubmittingPost(true);
    /* Phải await: nếu không thì `ok` là một Promise luôn truthy, form sẽ tự xoá
       nội dung và bật cooldown kể cả khi máy chủ từ chối bài viết. */
    const ok = await onCreateClubPost(clubId, postTitle.trim().slice(0, 100), postContent.trim().slice(0, 1000));
    if (ok) {
      setPostTitle('');
      setPostContent('');
      setPostCooldown(3);
    }
    setIsSubmittingPost(false);
  };

  /* Tối ưu hiệu năng: dùng CSS micro-lift thay vì tính ma trận góc xoay trực tiếp trên DOM */
  const handleMouseMove = () => {};
  const handleMouseLeave = () => {};

  return (
    <section className={`club-plaza-page relative w-full ${isEmbedded ? 'min-h-screen' : 'h-[100dvh] md:h-screen overflow-hidden'} flex flex-col pt-[calc(54px+var(--safe-top)+12px)] md:pt-[var(--navbar-height)] pb-[calc(56px+var(--safe-bottom)+12px)] md:pb-6 px-4 sm:px-8`}>
      {/* Nền phong cách Forum Hiện Đại: Tối ưu triệt để dung lượng và GPU, không dùng video nền trong sảnh CLB */}
      <div className="ff-clubs-bg ff-raw-grid-surface absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-[#080d15] via-[#09111e] to-[#060a12]" />
        <div className="absolute top-[-15%] right-[10%] w-[550px] h-[550px] rounded-full bg-emerald-500/[0.035] blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[5%] w-[650px] h-[650px] rounded-full bg-amber-500/[0.03] blur-[150px]" />
      </div>

      {/* Main Container */}
      <div className={`relative z-10 w-full max-w-7xl mx-auto flex-1 flex flex-col pt-3 ${isEmbedded ? '' : 'overflow-hidden'}`}>
        
        {/* Top Editorial Bento Header & Category Filter */}
        <div className="ff-bento-cell !p-4 sm:!p-5 mb-5 shrink-0 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-10 h-10 rounded-xl bg-[#f2cc8f]/15 border-[1.5px] border-[#f2cc8f]/45 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_rgba(4,6,11,0.9)]">
                <Trophy className="club-badge-accent w-5 h-5 text-[#f2cc8f] shrink-0" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="ff-typo-poster !text-xl sm:!text-2xl text-[#f4f1de]">
                    Câu Lạc Bộ
                  </h1>
                  <InfoTip label="Cách tính danh hiệu CLB xuất sắc" align="start">
                    Danh hiệu CLB Xuất Sắc Nhất Tháng được tổng hợp tự động dựa trên tần suất đăng bài hoạt động và mức độ thảo luận thực tế của thành viên.
                  </InfoTip>
                </div>
                <svg className="w-24 h-2 mt-0.5 ff-organic-squiggle" viewBox="0 0 120 8" aria-hidden="true">
                  <path d="M2 5 C24 1, 48 8, 72 4 S98 1, 118 5" />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {/* Search Input */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#9a978e] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={100}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Tìm tên CLB, sở thích..."
                  className="w-full pl-8 pr-4 py-2 rounded-lg text-xs bg-[#0b0d12]/85 border-[1.5px] border-[#f4f1de]/15 text-[#f4f1de] placeholder-[#84817a] focus:outline-none focus:border-[#f2cc8f]/60 transition-colors"
                />
              </div>

              {approvedClubs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      onOpenLoginModal?.();
                    } else {
                      setIsCreateModalOpen(true);
                    }
                  }}
                  className="ff-tactile-btn px-4 py-2 rounded-lg text-xs font-extrabold bg-[#e07a5f] hover:bg-[#f2cc8f] text-[#0b0d12] border-[1.5px] border-[#f4f1de] transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-[#0b0d12]" />
                  <span>Đăng ký thành lập CLB</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter by category: Neo-Brutalist Tags */}
          <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-dashed border-[#f4f1de]/10 pb-0.5 scrollbar-none">
            <Filter className="w-3.5 h-3.5 text-[#9a978e] shrink-0 mr-0.5" />
            <span className="text-xs text-[#9a978e] font-mono font-bold mr-1 shrink-0">Nhóm:</span>
            {CATEGORIES.map(cat => {
              const isActive = selectedCategory === cat;
              const CatIcon = getCategoryIcon(cat);
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border-[1.5px] whitespace-nowrap transition-colors focus:outline-none cursor-pointer ${
                    isActive
                      ? 'bg-[#f2cc8f] text-[#0b0d12] border-[#f4f1de] shadow-[2px_2px_0px_rgba(4,6,11,0.9)]'
                      : 'bg-[#f4f1de]/[0.04] text-[#d8d5ce] hover:bg-[#f4f1de]/[0.1] border-[#f4f1de]/14'
                  }`}
                >
                  <CatIcon className={`w-3.5 h-3.5 ${isActive ? 'text-[#0b0d12]' : 'text-[#9a978e]'}`} />
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Duyệt đơn CLB (Admin) — gọn, không khoa trương */}
        {isSuperAdmin && (
          <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-neutral-900/80 border border-white/10 shrink-0">
            <div className="flex items-center gap-2 text-xs text-neutral-300 font-medium">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{pendingClubs.length} đơn đang chờ duyệt</span>
            </div>

            {pendingClubs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1 mt-3 pt-3 border-t border-white/10">
                {pendingClubs.map(pClub => (
                  <div
                    key={pClub.id}
                    className="p-3 rounded-xl bg-black/60 border border-amber-500/20 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-white text-xs">{pClub.name}</h4>
                        <span className="text-[10px] font-mono text-neutral-400">
                          Người nộp: {pClub.leaderName}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-300 mt-1 line-clamp-2">
                        {pClub.purpose}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/10">
                      <button
                        onClick={() => void onApproveClub(pClub.id)}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-1 shadow-md cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Phê Duyệt (+250 XP)
                      </button>
                      <button
                        onClick={() => setRejectPromptClubId(pClub.id)}
                        className="py-1.5 px-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 font-medium text-xs flex items-center justify-center gap-1 border border-red-500/30 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Từ Chối
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bento 3D Tilt Grid Container (Scrollable when standalone) */}
        <div className={`flex-1 ${isEmbedded ? '' : 'overflow-y-auto pr-1'} space-y-4 pb-12`}>
          
          {/* Fix 3: Banner "CLB xuất sắc" CHỈ hiện khi có dữ liệu thật */}
          {spotlightClub ? (
            <div
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="ff-holo-card relative w-full rounded-2xl p-5 sm:p-6 transition-transform duration-200 overflow-hidden group"
            >
              <div
                className="absolute inset-0 bg-cover bg-center opacity-25 group-hover:opacity-35 transition-opacity duration-500"
                style={{ backgroundImage: `url(${spotlightClub.coverImage})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0b0d12] via-[#0b0d12]/88 to-[#0b0d12]/55" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="max-w-xl space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="club-badge-accent ff-holo-badge inline-flex items-center gap-2 px-3 py-1 rounded-md text-[11px] font-bold text-[#f4f1de]">
                      <Trophy className="w-3.5 h-3.5 text-[#f2cc8f]" />
                      CLB TIÊU BIỂU THÁNG
                    </div>
                    {(() => {
                      const SpotIcon = getCategoryIcon(spotlightClub.category);
                      return (
                        <span className={`ff-brutal-tag ${getCategoryBadgeClass(spotlightClub.category)}`}>
                          <SpotIcon className="w-3 h-3 shrink-0" />
                          <span>{spotlightClub.category}</span>
                        </span>
                      );
                    })()}
                  </div>

                  <h2 className="ff-typo-poster !text-xl sm:!text-3xl text-[#f4f1de]">
                    {spotlightClub.name}
                  </h2>

                  {spotlightClub.slogan && (
                    <p className="text-xs sm:text-sm text-[#f2cc8f] italic line-clamp-2 max-w-xl font-sans">
                      "{spotlightClub.slogan}"
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-[#d8d5ce] pt-1 font-mono flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#81b29a]" />
                      {spotlightClub.membersCount} thành viên
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span>Chủ nhiệm:</span>
                      <DecoratedAvatar
                        user={resolveClubUser(spotlightClub.leaderId, spotlightClub.leaderName)}
                        fallbackSrc={DEFAULT_AVATAR}
                        size={24}
                        animate
                      />
                      <DecoratedName
                        user={resolveClubUser(spotlightClub.leaderId, spotlightClub.leaderName)}
                        name={spotlightClub.leaderName.replace(/ \(.*\)/, '')}
                        width={136}
                        height={26}
                        animate
                        showFallbackTag
                      />
                    </span>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col gap-2.5 shrink-0">
                  <button
                    onClick={() => setApplicationSubmitted(spotlightClub.id)}
                    className="ff-tactile-btn flex-1 md:flex-initial px-5 py-2.5 rounded-lg bg-[#81b29a]/20 hover:bg-[#81b29a]/35 border-[1.5px] border-[#81b29a]/50 text-[#f4f1de] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#81b29a]" />
                    {applicationSubmitted === spotlightClub.id ? '✓ Đã Tham Gia' : 'Tham gia'}
                  </button>

                  <button
                    onClick={() => setSelectedClub(spotlightClub)}
                    className="ff-tactile-btn flex-1 md:flex-initial px-5 py-2.5 rounded-lg bg-[#f4f1de] hover:bg-[#f2cc8f] text-[#0b0d12] font-extrabold text-xs border-[1.5px] border-[#0b0d12] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Xem →
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Regular Club Cards Grid — Thẻ ngang 2 cột (code_yeucau · tcl-14) */}
          <div className="ff-media-grid">
            {approvedClubs.length === 0 ? (
              /* Fix 3: Gộp thành 1 Empty State DUY NHẤT khi chưa có CLB nào (Illustration + 1 câu + 1 nút, giữa màn hình) */
              <div className="col-span-full flex flex-col items-center justify-center text-center py-20 space-y-4">
                <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/25 shadow-[0_0_30px_rgba(245,158,11,0.18)]">
                  <Users className="w-10 h-10 text-amber-300" />
                  <Sparkles className="w-4 h-4 text-amber-400 absolute -top-1.5 -right-1.5 animate-pulse" />
                </div>
                <h3 className="text-base font-bold text-white max-w-md">
                  Chưa có CLB nào — bạn sẽ là người đầu tiên khởi tạo! 🚀
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      onOpenLoginModal?.();
                    } else {
                      setIsCreateModalOpen(true);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Đăng ký thành lập CLB</span>
                </button>
              </div>
            ) : null}
            {regularClubs.map(club => (
              <div
                key={club.id}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="ff-media-card rounded-2xl liquid-glass bg-neutral-950/75 border border-white/10 hover:border-amber-400/40 p-4 shadow-xl transition-transform duration-200 group overflow-hidden"
              >
                <div className="ff-media-card__layout">
                  {/* Card Cover: ảnh + tag category + số thành viên */}
                  <div className="ff-media-card__cover relative h-32 w-full rounded-xl overflow-hidden mb-3 border border-white/10">
                    <img
                      src={club.coverImage}
                      alt={club.name}
                      onError={e => handleImageError(e, DEFAULT_CLUB_COVER)}
                      loading="lazy"
                      decoding="async"
                      width={480}
                      height={128}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <span className="absolute bottom-2 left-2 text-[10px] font-mono bg-black/70 px-2 py-0.5 rounded text-neutral-200 border border-white/10">
                      {club.membersCount} thành viên
                    </span>
                    <span className={`absolute top-2 right-2 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md shadow border ${getCategoryBadgeClass(club.category)}`}>
                      {club.category}
                    </span>
                  </div>

                  {/* Card Content: tên + slogan + chủ nhiệm + 2 nút ('Tham gia' / 'Xem →') */}
                  <div className="ff-media-card__content">
                    <div>
                      <h3 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors line-clamp-1 ff-kinetic-title ff-kinetic-underline">
                        {club.name}
                      </h3>
                      {club.slogan && (
                        <p className="text-[11.5px] text-amber-200/80 italic line-clamp-1 mt-0.5 font-sans">
                          "{club.slogan}"
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-2 pt-2 border-t border-white/[0.06]">
                        <span className="text-neutral-400">Chủ nhiệm:</span>
                        <DecoratedAvatar
                          user={resolveClubUser(club.leaderId, club.leaderName)}
                          fallbackSrc={DEFAULT_AVATAR}
                          size={18}
                          animate
                        />
                        <DecoratedName
                          user={resolveClubUser(club.leaderId, club.leaderName)}
                          name={club.leaderName.replace(/ \(.*\)/, '')}
                          width={112}
                          height={22}
                          animate
                          showFallbackTag
                        />
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-dashed border-[#f4f1de]/12 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setApplicationSubmitted(club.id)}
                        className={`ff-tactile-btn flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border-[1.5px] transition-colors cursor-pointer ${
                          applicationSubmitted === club.id
                            ? 'bg-[#81b29a]/25 text-[#d8f3dc] border-[#81b29a]/55'
                            : 'bg-[#e07a5f]/20 hover:bg-[#e07a5f]/35 text-[#f4f1de] border-[#e07a5f]/45'
                        }`}
                      >
                        {applicationSubmitted === club.id ? '✓ Đã tham gia' : 'Tham gia'}
                      </button>
                      <button
                        onClick={() => setSelectedClub(club)}
                        className="ff-tactile-btn flex-1 py-1.5 px-3 rounded-lg bg-[#f4f1de]/[0.08] hover:bg-[#f4f1de]/[0.16] text-[#f4f1de] text-xs font-bold border-[1.5px] border-[#f4f1de]/18 transition-colors cursor-pointer"
                      >
                        Xem →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: Thành Lập CLB Mới — Portaled & Rộng rãi */}
      {isCreateModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label="Đăng ký thành lập CLB" className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-up">
            <div className="liquid-glass w-full max-w-2xl rounded-3xl bg-[#0b111e] border border-amber-500/45 shadow-[0_30px_90px_rgba(0,0,0,0.95)] p-6 sm:p-8 relative max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/35 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg text-white">Đăng Ký Thành Lập CLB Mới</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Hoàn thiện hồ sơ rõ ràng để Ban Quản Trị xét duyệt nhanh chóng</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ten-cau-lac-bo" className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5">
                      Tên Câu Lạc Bộ (*):
                    </label>
                    <input
                      id="ten-cau-lac-bo"
                      type="text"
                      required
                      maxLength={60}
                      value={newClubName}
                      onChange={e => setNewClubName(e.target.value)}
                      placeholder="VD: CLB Lập Trình Game F-Dev..."
                      className="w-full bg-[#070b13] border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5">
                      Chuyên mục hoạt động (*):
                    </label>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value as ClubCategory)}
                      className="w-full bg-[#070b13] border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      <option value="Công nghệ">Công nghệ</option>
                      <option value="Nghệ thuật">Nghệ thuật</option>
                      <option value="Thể thao">Thể thao</option>
                      <option value="Học thuật">Học thuật</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="khau-hieu-slogan" className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5">
                    Khẩu hiệu / Slogan (*):
                  </label>
                  <input
                    id="khau-hieu-slogan"
                    type="text"
                    required
                    maxLength={120}
                    value={newSlogan}
                    onChange={e => setNewSlogan(e.target.value)}
                    placeholder="VD: Kết nối đam mê, vươn tầm công nghệ..."
                    className="w-full bg-[#070b13] border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Khung chọn & xem trước ảnh bìa CLB */}
                <div className="rounded-2xl bg-[#070b13] border border-white/15 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs sm:text-sm font-bold text-amber-300">
                      Ảnh bìa CLB (Dán URL hoặc tải ảnh từ máy &lt; 5MB)
                    </label>
                  </div>
                  {newCover && (
                    <div className="relative w-full h-36 rounded-xl overflow-hidden bg-black border border-white/10">
                      <img
                        src={newCover}
                        alt="Xem trước ảnh bìa CLB"
                        loading="lazy"
                        decoding="async"
                        onError={e => handleImageError(e, DEFAULT_CLUB_COVER)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <input
                      type="url"
                      maxLength={500}
                      value={newCover}
                      onChange={e => setNewCover(e.target.value)}
                      placeholder="https://images.unsplash.com/... hoặc chọn tệp ảnh"
                      className="flex-1 bg-[#0b111e] border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                    <label
                      htmlFor="club-cover-upload"
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Upload className="w-4 h-4" />
                      <span>+ Tải tệp ảnh</span>
                    </label>
                    <input
                      id="club-cover-upload"
                      type="file"
                      accept="image/*"
                      maxLength={200}
                      onChange={handleCoverFileUpload}
                      className="hidden"
                    />
                  </div>
                  {coverUploadError && (
                    <p className="text-xs text-red-400 mt-1">{coverUploadError}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="danh-sach-thanh-vien-sang-lap-ca" className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5">
                    Danh sách thành viên sáng lập (cách nhau bởi dấu phẩy):
                  </label>
                  <input
                    id="danh-sach-thanh-vien-sang-lap-ca"
                    type="text"
                    maxLength={200}
                    value={newFounders}
                    onChange={e => setNewFounders(e.target.value)}
                    placeholder="Nguyễn Văn A, Trần Thị B..."
                    className="w-full bg-[#070b13] border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label htmlFor="ton-chi-hoat-dong" className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5">
                    Tôn chỉ hoạt động (*):
                  </label>
                  <textarea
                    id="ton-chi-hoat-dong"
                    required
                    rows={4}
                    maxLength={500}
                    value={newPurpose}
                    onChange={e => setNewPurpose(e.target.value)}
                    placeholder="Mô tả mục tiêu, lộ trình sinh hoạt định kỳ và kế hoạch tổ chức sự kiện..."
                    className="w-full bg-[#070b13] border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 leading-relaxed resize-y"
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 leading-relaxed">
                  ⏳ Chờ Ban Quản Trị duyệt · 🎖️ Duyệt xong: huy hiệu Chủ nhiệm + 250 XP
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm font-bold text-slate-300 hover:text-white cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={createCooldown > 0 || isSubmittingClub}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-xs sm:text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {createCooldown > 0
                      ? `Chờ ${createCooldown}s...`
                      : isSubmittingClub
                      ? 'Đang gửi...'
                      : 'Gửi Hồ Sơ Xét Duyệt'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal: Xem Chi Tiết CLB & Scoped Discussion Board — Portaled & Rộng rãi */}
      {selectedClub &&
        typeof document !== 'undefined' &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label="Chi tiết câu lạc bộ" className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-up">
            <div className="liquid-glass w-full max-w-3xl rounded-3xl bg-[#0b111e] border border-white/20 shadow-[0_30px_90px_rgba(0,0,0,0.95)] p-6 sm:p-8 relative max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div>
                  <h3 className="font-extrabold text-lg sm:text-xl text-white">{selectedClub.name}</h3>
                  <p className="text-xs sm:text-sm text-amber-200/90 italic mt-0.5">"{selectedClub.slogan}"</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClub(null)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="h-52 w-full rounded-2xl overflow-hidden mb-5 border border-white/15">
                <img
                  src={selectedClub.coverImage}
                  alt={selectedClub.name}
                  onError={e => handleImageError(e, DEFAULT_CLUB_COVER)}
                  loading="lazy"
                  decoding="async"
                  width={640}
                  height={208}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-neutral-300">
                {/* Founding Manifesto */}
                <div className="p-4 rounded-2xl bg-[#070b13] border border-white/10 space-y-1.5">
                  <span className="font-bold text-white block">Tuyên Ngôn Sáng Lập &amp; Tôn Chỉ (Founding Manifesto):</span>
                  <p className="italic text-amber-200">"{selectedClub.slogan}"</p>
                  <p className="text-neutral-300 leading-relaxed pt-1">{selectedClub.purpose}</p>
                </div>

                {/* Member Roster */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-2xl bg-[#070b13] border border-white/10">
                    <span className="font-bold text-white block mb-2">Chủ nhiệm &amp; Trưởng ban:</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <DecoratedAvatar
                        user={resolveClubUser(selectedClub.leaderId, selectedClub.leaderName)}
                        fallbackSrc={DEFAULT_AVATAR}
                        size={28}
                        animate
                      />
                      <DecoratedName
                        user={resolveClubUser(selectedClub.leaderId, selectedClub.leaderName)}
                        name={selectedClub.leaderName.replace(/ \(.*\)/, '')}
                        width={136}
                        height={26}
                        animate
                        showFallbackTag
                      />
                      <span className="text-[11px] text-neutral-400 font-mono">(Trưởng CLB)</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#070b13] border border-white/10">
                    <span className="font-bold text-white block mb-2">Hội đồng Sáng Lập (Founding Roster):</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedClub.foundingMembers && selectedClub.foundingMembers.length > 0 ? (
                        selectedClub.foundingMembers.map((m, idx) => (
                          <span
                            key={`${m}-${idx}`}
                            className="px-2.5 py-1 rounded-lg bg-white/10 text-neutral-200 text-xs font-mono border border-white/10"
                          >
                            {m}
                          </span>
                        ))
                      ) : (
                        <span className="text-neutral-400">Đang cập nhật danh sách...</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Scoped Posting Board Section */}
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-400" />
                      BẢNG TIN THÔNG BÁO NỘI BỘ
                    </h4>
                    {/* Scoped permission indicator */}
                    {isSuperAdmin || currentUser?.scopedClubIds?.includes(selectedClub.id) ? (
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Quyền Đăng Bài: ĐÃ CẤP
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Chỉ Xem
                      </span>
                    )}
                  </div>

                  {/* Form to post: visible/scoped only to leader or Super Admin */}
                  {isSuperAdmin || currentUser?.scopedClubIds?.includes(selectedClub.id) ? (
                    <div className="p-4 sm:p-5 rounded-2xl bg-[#070b13] border border-cyan-400/35 mb-4 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-cyan-300 mb-1.5">Tiêu đề thông báo (*):</label>
                        <input
                          type="text"
                          maxLength={100}
                          value={postTitle}
                          onChange={e => setPostTitle(e.target.value)}
                          placeholder="Tiêu đề thông báo mới..."
                          className="w-full bg-[#0b111e] border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-cyan-300 mb-1.5">Nội dung chi tiết (*):</label>
                        <textarea
                          rows={4}
                          maxLength={1000}
                          value={postContent}
                          onChange={e => setPostContent(e.target.value)}
                          placeholder="Nội dung bài viết..."
                          className="w-full bg-[#0b111e] border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 leading-relaxed resize-y"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleNewPost(selectedClub.id)}
                          disabled={postCooldown > 0 || isSubmittingPost}
                          className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs sm:text-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg"
                        >
                          <Send className="w-4 h-4" />
                          <span>{postCooldown > 0 ? `Chờ ${postCooldown}s...` : isSubmittingPost ? 'Đang gửi...' : 'Đăng bài thông báo'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500 italic mb-3">
                      * Quy tắc scoped permission: Bạn đang ở chế độ xem. Chỉ Chủ nhiệm của CLB này hoặc Super Admin mới có quyền đăng thông báo.
                    </p>
                  )}

                  {/* Posts List */}
                  <div className="space-y-2.5">
                    {clubPosts.filter(p => p.clubId === selectedClub.id).length === 0 ? (
                      <p className="text-neutral-500 text-center py-5">Chưa có thông báo nào được đăng.</p>
                    ) : (
                      clubPosts
                        .filter(p => p.clubId === selectedClub.id)
                        .map(post => (
                          <div key={post.id} className="p-4 rounded-2xl bg-[#070b13] border border-white/10 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-sm">{post.title}</span>
                              <span className="text-xs text-neutral-500">{post.createdAt}</span>
                            </div>
                            <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed">{post.content}</p>
                            <div className="text-xs text-neutral-400 pt-2 flex items-center gap-2">
                              <span>Người đăng:</span>
                              <DecoratedAvatar
                                user={resolveClubUser(post.authorId, post.authorName)}
                                fallbackSrc={DEFAULT_AVATAR}
                                size={22}
                                animate
                              />
                              <DecoratedName
                                user={resolveClubUser(post.authorId, post.authorName)}
                                name={post.authorName.replace(/ \(.*\)/, '')}
                                width={126}
                                height={24}
                                animate
                                showFallbackTag
                              />
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Reject Reason Prompt */}
      {rejectPromptClubId &&
        typeof document !== 'undefined' &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label="Từ chối duyệt CLB" className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-up">
            <div className="liquid-glass w-full max-w-md rounded-2xl bg-[#0b111e] p-6 border border-red-500/35 shadow-2xl">
              <h4 className="font-bold text-white text-base mb-3">Lý do từ chối hồ sơ CLB:</h4>
              <textarea
                rows={4}
                maxLength={200}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="VD: Cần bổ sung thêm danh sách thành viên sáng lập..."
                className="w-full bg-[#070b13] border border-white/20 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-400 mb-4"
              />
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRejectPromptClubId(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs sm:text-sm font-semibold text-neutral-300 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void onRejectClub(rejectPromptClubId, rejectReason || 'Không đủ điều kiện theo quy chế.');
                    setRejectPromptClubId(null);
                    setRejectReason('');
                  }}
                  className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs sm:text-sm cursor-pointer"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
};
