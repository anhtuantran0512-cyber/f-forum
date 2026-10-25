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
  RotateCcw,
  Globe,
  Maximize2,
  Minimize2,
  Swords,
} from 'lucide-react';
import type { Club, ClubPost, User, ClubCategory, ChatMessage } from '../../types';
import { DEFAULT_AVATAR, DEFAULT_CLUB_COVER, handleImageError } from '../../utils/mediaFallback';
import { MASTER_ADMIN_EMAIL_LOWER, isMasterAdmin } from '../../config/admin';
import { DecoratedAvatar, DecoratedName } from '../decorations/DecoratedAvatar';
import { RoleMark } from '../RoleMark';
import { PeerBattleModal } from '../exam/PeerBattleModal';
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
  onOpenProfile?: (user?: { id: string; name: string; avatar: string; email?: string; level?: number }) => void;
  isEmbedded?: boolean;
}

const SOLAR_SYSTEM_3D_URL = '/solar-system-3d.html';

const DEFAULT_ASTRONOMY_CLUB: Club = {
  id: 'club-astronomy-physics',
  name: 'CLB Thiên văn & Vật lý vũ trụ',
  slogan: 'Ngắm nhìn vì sao · Giải mã cấu trúc và quy luật chuyển động thiên thể',
  coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=600&fit=crop',
  category: 'Học thuật',
  foundingMembers: ['GS. Thiên Văn', 'Trần Thùy Linh', 'Nguyễn Minh Khôi'],
  purpose: 'Nghiên cứu cơ học thiên thể, vật lý vũ trụ, quan sát bầu trời đêm và thực nghiệm mô phỏng chuyển động 3D các hành tinh trong Hệ Mặt Trời.',
  status: 'APPROVED',
  leaderId: 'astronomy-lead',
  leaderName: 'Chủ nhiệm CLB Thiên văn',
  followerCount: 185,
  membersCount: 320,
  createdAt: '2026-09-01',
};

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
      return 'bg-[#81b29a]/25 text-[#f4f1de] border-[#81b29a]/45';
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
  onOpenProfile,
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
        if ((id === 'admin-master' || id === 'user-admin') && users[MASTER_ADMIN_EMAIL_LOWER]) {
          return users[MASTER_ADMIN_EMAIL_LOWER];
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
  const [isSolarStationExpanded, setIsSolarStationExpanded] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBattleModalOpen, setIsBattleModalOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);

  useEffect(() => {
    const handleOpenBattle = () => setIsBattleModalOpen(true);
    window.addEventListener('fforum_open_peer_battle', handleOpenBattle);
    return () => window.removeEventListener('fforum_open_peer_battle', handleOpenBattle);
  }, []);
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
    const sourceClubs = clubs.some(c => c.name.includes('Thiên văn') || c.id === DEFAULT_ASTRONOMY_CLUB.id)
      ? clubs
      : [DEFAULT_ASTRONOMY_CLUB, ...clubs];
    return sourceClubs.filter(
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
    <section className={`club-plaza-page relative w-full ${isEmbedded ? 'min-h-screen' : 'h-[100dvh] md:h-screen overflow-y-auto'} flex flex-col pt-[calc(54px+var(--safe-top)+12px)] md:pt-[var(--navbar-height)] pb-[calc(56px+var(--safe-bottom)+16px)] md:pb-10 px-4 sm:px-8`}>
      {/* Nền phong cách Forum Hiện Đại: Tối ưu triệt để dung lượng và GPU, không dùng video nền trong sảnh CLB */}
      <div className="ff-clubs-bg ff-raw-grid-surface absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0d12] via-[#10141d] to-[#080a0f]" />
        <div className="absolute top-[-15%] right-[10%] w-[550px] h-[550px] rounded-full bg-[#81b29a]/[0.05] blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[5%] w-[650px] h-[650px] rounded-full bg-[#e07a5f]/[0.05] blur-[150px]" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex-1 flex flex-col pt-3">
        
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
                    <span className="ff-swash-cap">C</span>âu lạc bộ <em className="font-['Cormorant_Garamond',Georgia,serif] italic font-semibold text-[#f2cc8f]">Club</em>
                  </h1>
                  <span className="ff-brutal-index">
                    {approvedClubs.length} CLB
                  </span>
                </div>
                <svg className="w-24 h-2 mt-0.5 ff-organic-squiggle" viewBox="0 0 120 8" aria-hidden="true">
                  <path d="M2 5 C24 1, 48 8, 72 4 S98 1, 118 5" />
                </svg>
                <p className="text-xs text-[#b5b2a9] mt-1">
                  Không gian sinh hoạt chuyên đề, rèn luyện kỹ năng và đồng hành cùng những người chung chí hướng.
                </p>
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
                  placeholder="Tìm CLB..."
                  className="w-full pl-8 pr-4 py-2 rounded-lg text-xs bg-[#0b0d12]/85 border-[1.5px] border-[#f4f1de]/15 text-[#f4f1de] placeholder-[#84817a] focus:outline-none focus:border-[#f2cc8f]/60 transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsBattleModalOpen(true)}
                className="ff-tactile-btn px-4 py-2 rounded-xl text-xs font-black bg-rose-500 hover:bg-rose-400 text-white border-2 border-[#0b0d12] transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-[2px_2px_0px_#0b0d12]"
              >
                <Swords className="w-4 h-4 text-amber-300" />
                <span>Đấu Trường 1vs1</span>
              </button>

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
                  className="ff-tactile-btn px-4 py-2 rounded-xl text-xs font-extrabold bg-[#f4f1de] hover:bg-[#f2cc8f] text-[#0b0d12] border-2 border-[#0b0d12] transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-[#e07a5f]" />
                  <span>Tạo CLB</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter by category: Neo-Brutalist Tags */}
          <div className="flex items-center gap-2 flex-wrap pt-2.5 border-t border-dashed border-[#f4f1de]/10">
            <Filter className="w-3.5 h-3.5 text-[#9a978e] shrink-0 mr-0.5" />
            <span className="text-xs text-[#9a978e] font-mono font-bold mr-1 shrink-0">Nhóm:</span>
            {CATEGORIES.map(cat => {
              const isActive = selectedCategory === cat;
              const CatIcon = getCategoryIcon(cat);
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`ff-tactile-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold border whitespace-nowrap transition-colors focus:outline-none cursor-pointer ${
                    isActive
                      ? 'bg-[#f4f1de] text-[#0b0d12] border-[#0b0d12]'
                      : 'bg-[#0b0d12] text-[#d8d5ce] hover:bg-[#f4f1de]/[0.08] border-[#f4f1de]/16'
                  }`}
                >
                  <CatIcon className={`w-3.5 h-3.5 ${isActive ? 'text-[#e07a5f]' : 'text-[#9a978e]'}`} />
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
                          {pClub.leaderName}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-300 mt-1 line-clamp-2">
                        {pClub.purpose}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/10">
                      <button
                        onClick={() => void onApproveClub(pClub.id)}
                        className="ff-tactile-btn flex-1 py-1.5 rounded-lg bg-[#81b29a] hover:bg-[#95c4ae] text-[#0b0d12] border-2 border-[#0b0d12] font-extrabold text-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Duyệt (+250 XP)
                      </button>
                      <button
                        onClick={() => setRejectPromptClubId(pClub.id)}
                        className="ff-tactile-btn py-1.5 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold text-xs flex items-center justify-center gap-1 border border-rose-400/40 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Từ chối
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bento Grid Container */}
        <div className="flex-1 space-y-5 pb-12">
          {(selectedCategory === 'Tất cả' || selectedCategory === 'Học thuật') && (
            <div
              className="ff-astronomy-station rounded-2xl p-5 sm:p-6 backdrop-blur-xl border border-white/10 shadow-[0_16px_50px_rgba(0,0,0,0.6)] overflow-hidden transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, rgba(13, 20, 36, 0.88) 0%, rgba(9, 12, 18, 0.95) 100%)',
                border: '1px solid rgba(148, 163, 184, 0.18)',
              }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-md">
                    <Globe className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md text-[10.5px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/40">
                        TRẠM KHÁM PHÁ THIÊN VĂN 3D
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-400/30">
                        CLB Thiên văn &amp; Vật lý vũ trụ
                      </span>
                    </div>
                    <h2 className="text-base sm:text-xl font-bold text-white mt-1">
                      Mô Phỏng Tương Tác Hệ Mặt Trời 3D Thời Gian Thực
                    </h2>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Không gian thực nghiệm số dành cho thành viên CLB Thiên văn &amp; Vật lý vũ trụ và sinh viên F-Forum.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const astro = approvedClubs.find(c => c.name.includes('Thiên văn')) || DEFAULT_ASTRONOMY_CLUB;
                      setSelectedClub(astro);
                    }}
                    className="ff-tactile-btn px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Vào CLB</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSolarStationExpanded(!isSolarStationExpanded)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors cursor-pointer"
                    title={isSolarStationExpanded ? 'Thu nhỏ trạm thiên văn' : 'Mở rộng trạm thiên văn'}
                  >
                    {isSolarStationExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isSolarStationExpanded && (
                <div className="mt-4 space-y-3 animate-fade-in">
                  <div
                    className="relative w-full h-[440px] sm:h-[520px] rounded-xl overflow-hidden bg-black border border-white/10 shadow-2xl"
                    style={{ boxShadow: '0 0 30px rgba(99, 102, 241, 0.15)' }}
                  >
                    <iframe
                      src={SOLAR_SYSTEM_3D_URL}
                      title="Trạm Khám Phá Thiên Văn 3D - CLB Thiên văn & Vật lý vũ trụ"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; camera; encrypted-media; gyroscope; picture-in-picture"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2 text-[11px] font-mono text-slate-300 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white/50">Điểm quan sát:</span>
                      <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-amber-300">Mặt Trời</span>
                      <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-emerald-300">Trái Đất</span>
                      <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-rose-300">Sao Hỏa</span>
                      <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-indigo-300">Sao Mộc</span>
                    </div>
                    <span className="text-slate-400">Cuộn chuột để zoom · Giữ chuột trái để xoay góc nhìn 3D</span>
                  </div>
                </div>
              )}
            </div>
          )}
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
                      Tiêu biểu
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
                    <button
                      type="button"
                      onClick={() => {
                        const u = resolveClubUser(spotlightClub.leaderId, spotlightClub.leaderName);
                        onOpenProfile?.({
                          id: u?.id || spotlightClub.leaderId,
                          name: u?.name || spotlightClub.leaderName,
                          avatar: u?.avatar || DEFAULT_AVATAR,
                          email: u?.email,
                          level: u?.level || 1,
                        });
                      }}
                      className="inline-flex items-center gap-2 hover:underline cursor-pointer"
                    >
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
                      <RoleMark user={resolveClubUser(spotlightClub.leaderId, spotlightClub.leaderName)} size={11} />
                    </button>
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
              <div className="col-span-full flex flex-col items-center justify-center text-center py-16 px-4 space-y-3 ff-bento-cell">
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#f2cc8f]/15 border border-[#f2cc8f]/35 shadow-[2px_2px_0px_rgba(4,6,11,0.85)]">
                  <Users className="w-8 h-8 text-[#f2cc8f]" />
                  <Sparkles className="w-4 h-4 text-[#e07a5f] absolute -top-1 -right-1" />
                </div>
                <h3 className="text-base font-bold text-[#f4f1de] max-w-md">
                  <span className="ff-swash-cap text-base">C</span>hưa có câu lạc bộ phù hợp
                </h3>
                <p className="text-xs text-[#a39f96] max-w-md leading-relaxed">
                  Mỗi nhóm học là một xưởng tri thức nhỏ. Hãy thử điều chỉnh từ khoá tìm kiếm hoặc trở thành người đầu tiên thành lập câu lạc bộ để kết nối bạn bè cùng chí hướng!
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {(searchTerm || selectedCategory !== 'Tất cả') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedCategory('Tất cả');
                      }}
                      className="ff-tactile-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b0d12] hover:bg-white/10 text-[#f4f1de] border border-[#f4f1de]/20 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#f2cc8f]" />
                      <span>Xóa bộ lọc</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentUser) {
                        onOpenLoginModal?.();
                      } else {
                        setIsCreateModalOpen(true);
                      }
                    }}
                    className="ff-tactile-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f4f1de] hover:bg-[#f2cc8f] text-[#0b0d12] border-2 border-[#0b0d12] font-extrabold text-xs transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-[#e07a5f]" />
                    <span>Tạo CLB</span>
                  </button>
                </div>
              </div>
            ) : null}
            {regularClubs.map(club => (
              <div
                key={club.id}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="ff-media-card p-4 transition-transform duration-200 group overflow-hidden"
              >
                <div className="ff-media-card__layout">
                  {/* Card Cover: ảnh + tag category + số thành viên */}
                  <div className="ff-media-card__cover relative w-full rounded-xl overflow-hidden border border-[#f4f1de]/15">
                    <img
                      src={club.coverImage}
                      alt={club.name}
                      onError={e => handleImageError(e, DEFAULT_CLUB_COVER)}
                      loading="lazy"
                      decoding="async"
                      width={480}
                      height={184}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d12]/88 via-[#0b0d12]/25 to-transparent" />
                    <span className="absolute bottom-2.5 left-2.5 text-[10.5px] font-mono bg-[#0b0d12]/85 px-2.5 py-0.5 rounded-md text-[#f4f1de] border border-[#f4f1de]/18">
                      {club.membersCount} thành viên
                    </span>
                    <span className={`absolute top-2.5 right-2.5 text-[10.5px] font-mono font-bold px-2.5 py-0.5 rounded-md shadow border ${getCategoryBadgeClass(club.category)}`}>
                      {club.category}
                    </span>
                  </div>

                  {/* Card Content: tên + slogan + chủ nhiệm + 2 nút ('Tham gia' / 'Xem →') */}
                  <div className="ff-media-card__content">
                    <div>
                      <h3 className="ff-typo-thread-title font-bold text-base sm:text-lg text-[#f4f1de] group-hover:text-[#f2cc8f] transition-colors line-clamp-1 ff-kinetic-title ff-kinetic-underline">
                        {club.name}
                      </h3>
                      {club.slogan && (
                        <p className="text-xs text-[#f2cc8f]/85 italic line-clamp-1 mt-1 font-sans">
                          "{club.slogan}"
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const u = resolveClubUser(club.leaderId, club.leaderName);
                          onOpenProfile?.({
                            id: u?.id || club.leaderId,
                            name: u?.name || club.leaderName,
                            avatar: u?.avatar || DEFAULT_AVATAR,
                            email: u?.email,
                            level: u?.level || 1,
                          });
                        }}
                        className="flex items-center gap-2 text-xs text-neutral-300 mt-2.5 pt-2.5 border-t border-white/[0.06] hover:text-[#f8f7f4] cursor-pointer w-full text-left"
                      >
                        <DecoratedAvatar
                          user={resolveClubUser(club.leaderId, club.leaderName)}
                          fallbackSrc={DEFAULT_AVATAR}
                          size={22}
                          animate
                        />
                        <DecoratedName
                          user={resolveClubUser(club.leaderId, club.leaderName)}
                          name={club.leaderName.replace(/ \(.*\)/, '')}
                          width={136}
                          height={24}
                          animate
                          showFallbackTag
                        />
                        <RoleMark user={resolveClubUser(club.leaderId, club.leaderName)} size={11} />
                      </button>
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-dashed border-[#f4f1de]/12 flex items-center justify-between gap-2.5">
                      <button
                        onClick={() => setApplicationSubmitted(club.id)}
                        className={`ff-tactile-btn flex-1 py-2 px-3 rounded-lg text-xs font-bold border-[1.5px] transition-colors cursor-pointer ${
                          applicationSubmitted === club.id
                            ? 'bg-[#81b29a]/25 text-[#d8f3dc] border-[#81b29a]/55'
                            : 'bg-[#e07a5f]/20 hover:bg-[#e07a5f]/35 text-[#f4f1de] border-[#e07a5f]/45'
                        }`}
                      >
                        {applicationSubmitted === club.id ? '✓ Đã tham gia' : 'Tham gia'}
                      </button>
                      <button
                        onClick={() => setSelectedClub(club)}
                        className="ff-tactile-btn flex-1 py-2 px-3 rounded-lg bg-[#f4f1de] hover:bg-[#f2cc8f] text-[#0b0d12] text-xs font-extrabold border-2 border-[#0b0d12] transition-colors cursor-pointer"
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
            <div className="modal-container w-full max-w-2xl p-6 sm:p-8 relative max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-dashed border-[#f4f1de]/15 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#e07a5f]/18 border-[1.5px] border-[#e07a5f]/45 flex items-center justify-center shadow-[2px_2px_0px_rgba(4,6,11,0.9)]">
                    <Sparkles className="w-5 h-5 text-[#f2cc8f]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg text-[#f4f1de] flex items-center gap-2 flex-wrap">
                      <span className="ff-swash-cap text-base">T</span>hành lập Câu Lạc Bộ
                    </h3>
                    <p className="text-xs text-[#9a978e] mt-0.5">Xây dựng không gian học tập và kết nối chuyên môn.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="ff-tactile-btn p-2 rounded-lg bg-[#0b0d12] hover:bg-[#f4f1de]/10 border border-[#f4f1de]/18 text-[#d8d5ce] hover:text-[#f4f1de] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ten-cau-lac-bo" className="block text-xs sm:text-sm font-bold text-[#f4f1de] mb-1.5">
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
                      className="w-full bg-[#0b0d12] border-[1.5px] border-[#f4f1de]/18 rounded-xl px-4 py-3 text-sm text-[#f4f1de] focus:outline-none focus:border-[#f2cc8f]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-[#f4f1de] mb-1.5">
                      Chuyên mục hoạt động (*):
                    </label>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value as ClubCategory)}
                      className="w-full bg-[#0b0d12] border-[1.5px] border-[#f4f1de]/18 rounded-xl px-4 py-3 text-sm text-[#f4f1de] focus:outline-none focus:border-[#f2cc8f] cursor-pointer"
                    >
                      <option value="Công nghệ">Công nghệ</option>
                      <option value="Nghệ thuật">Nghệ thuật</option>
                      <option value="Thể thao">Thể thao</option>
                      <option value="Học thuật">Học thuật</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="khau-hieu-slogan" className="block text-xs sm:text-sm font-bold text-[#f4f1de] mb-1.5">
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
                    className="w-full bg-[#0b0d12] border-[1.5px] border-[#f4f1de]/18 rounded-xl px-4 py-3 text-sm text-[#f4f1de] focus:outline-none focus:border-[#f2cc8f]"
                  />
                </div>

                {/* Khung chọn & xem trước ảnh bìa CLB */}
                <div className="rounded-xl bg-[#0b0d12]/80 border-[1.5px] border-[#f4f1de]/15 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs sm:text-sm font-bold text-[#f2cc8f]">
                      Ảnh bìa CLB (Dán URL hoặc tải ảnh từ máy &lt; 5MB)
                    </label>
                  </div>
                  {newCover && (
                    <div className="relative w-full h-36 rounded-xl overflow-hidden bg-black border border-[#f4f1de]/15">
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
                      className="flex-1 bg-[#151a26] border-[1.5px] border-[#f4f1de]/18 rounded-xl px-4 py-2.5 text-sm text-[#f4f1de] focus:outline-none focus:border-[#f2cc8f]"
                    />
                    <label
                      htmlFor="club-cover-upload"
                      className="ff-tactile-btn px-4 py-2.5 rounded-xl bg-[#f2cc8f] hover:bg-[#e07a5f] text-[#0b0d12] border-[1.5px] border-[#f4f1de] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Tải ảnh</span>
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
                  <label htmlFor="danh-sach-thanh-vien-sang-lap-ca" className="block text-xs sm:text-sm font-bold text-[#f4f1de] mb-1.5">
                    Danh sách thành viên sáng lập (cách nhau bởi dấu phẩy):
                  </label>
                  <input
                    id="danh-sach-thanh-vien-sang-lap-ca"
                    type="text"
                    maxLength={200}
                    value={newFounders}
                    onChange={e => setNewFounders(e.target.value)}
                    placeholder="Nguyễn Văn A, Trần Thị B..."
                    className="w-full bg-[#0b0d12] border-[1.5px] border-[#f4f1de]/18 rounded-xl px-4 py-3 text-sm text-[#f4f1de] focus:outline-none focus:border-[#f2cc8f]"
                  />
                </div>

                <div>
                  <label htmlFor="ton-chi-hoat-dong" className="block text-xs sm:text-sm font-bold text-[#f4f1de] mb-1.5">
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
                    className="w-full bg-[#0b0d12] border-[1.5px] border-[#f4f1de]/18 rounded-xl px-4 py-3 text-sm text-[#f4f1de] focus:outline-none focus:border-[#f2cc8f] leading-relaxed resize-y"
                  />
                </div>

                <div className="p-3 rounded-xl bg-[#f2cc8f]/12 border-[1.5px] border-[#f2cc8f]/35 text-xs text-[#f2cc8f] font-mono leading-relaxed">
                  Chờ Ban Quản Trị duyệt · Duyệt xong: huy hiệu Chủ nhiệm + 250 XP
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-dashed border-[#f4f1de]/15">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="ff-tactile-btn px-4 py-2.5 rounded-xl bg-[#0b0d12] hover:bg-[#f4f1de]/10 border-[1.5px] border-[#f4f1de]/18 text-xs sm:text-sm font-bold text-[#d8d5ce] hover:text-[#f4f1de] cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={createCooldown > 0 || isSubmittingClub}
                    className="ff-tactile-btn px-6 py-2.5 rounded-xl bg-[#e07a5f] hover:bg-[#f2cc8f] text-[#0b0d12] border-[1.5px] border-[#f4f1de] font-extrabold text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
            <div className="modal-container w-full max-w-3xl p-6 sm:p-8 relative max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-dashed border-[#f4f1de]/15 mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="ff-typo-poster !text-lg sm:!text-2xl text-[#f4f1de]">{selectedClub.name}</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-[#f2cc8f] italic mt-0.5">"{selectedClub.slogan}"</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClub(null)}
                  className="ff-tactile-btn p-2 rounded-lg bg-[#0b0d12] hover:bg-[#f4f1de]/10 border border-[#f4f1de]/18 text-[#d8d5ce] hover:text-[#f4f1de] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="h-52 w-full rounded-xl overflow-hidden mb-5 border-[1.5px] border-[#f4f1de]/18 shadow-[4px_4px_0px_rgba(4,6,11,0.9)]">
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

              <div className="space-y-4 text-xs sm:text-sm text-[#d8d5ce]">
                {/* Giới thiệu & Tôn chỉ */}
                <div className="p-4 rounded-xl bg-[#0b0d12]/80 border-[1.5px] border-[#f4f1de]/14 space-y-1.5">
                  <span className="font-bold text-[#f4f1de] block">Giới thiệu &amp; Tôn chỉ:</span>
                  <p className="italic text-[#f2cc8f]">"{selectedClub.slogan}"</p>
                  <p className="text-[#d8d5ce] leading-relaxed pt-1">{selectedClub.purpose}</p>
                </div>

                {(selectedClub.name.includes('Thiên văn') || selectedClub.name.includes('Vật lý vũ trụ')) && (
                  <div className="p-4 rounded-xl bg-[#0b0d12]/90 border-[1.5px] border-indigo-400/35 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-indigo-400" />
                        <span className="font-bold text-[#f4f1de] text-xs sm:text-sm">Trạm Tương Tác Hệ Mặt Trời 3D</span>
                      </div>
                      <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-400/30">
                        Khám phá trực quan
                      </span>
                    </div>
                    <div className="relative w-full h-64 sm:h-80 rounded-xl overflow-hidden bg-black border border-white/10">
                      <iframe
                        src={SOLAR_SYSTEM_3D_URL}
                        title="Khám phá Hệ Mặt Trời 3D - CLB Thiên văn & Vật lý vũ trụ"
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; camera; encrypted-media; gyroscope; picture-in-picture"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      />
                    </div>
                  </div>
                )}

                {/* Member Roster */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-xl bg-[#0b0d12]/80 border-[1.5px] border-[#f4f1de]/14">
                    <span className="font-bold text-[#f4f1de] block mb-2">Chủ nhiệm:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const u = resolveClubUser(selectedClub.leaderId, selectedClub.leaderName);
                        onOpenProfile?.({
                          id: u?.id || selectedClub.leaderId,
                          name: u?.name || selectedClub.leaderName,
                          avatar: u?.avatar || DEFAULT_AVATAR,
                          email: u?.email,
                          level: u?.level || 1,
                        });
                      }}
                      className="flex items-center gap-2 flex-wrap hover:underline cursor-pointer text-left"
                    >
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
                      <RoleMark user={resolveClubUser(selectedClub.leaderId, selectedClub.leaderName)} size={11} />
                    </button>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0b0d12]/80 border-[1.5px] border-[#f4f1de]/14">
                    <span className="font-bold text-[#f4f1de] block mb-2">Thành viên sáng lập:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedClub.foundingMembers && selectedClub.foundingMembers.length > 0 ? (
                        selectedClub.foundingMembers.map((m, idx) => (
                          <span
                            key={`${m}-${idx}`}
                            className="px-2.5 py-1 rounded-md bg-[#151a26] text-[#f4f1de] text-xs font-mono border border-[#f4f1de]/15"
                          >
                            {m}
                          </span>
                        ))
                      ) : (
                        <span className="text-[#9a978e]">Đang cập nhật danh sách...</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Scoped Posting Board Section */}
                <div className="pt-4 border-t border-dashed border-[#f4f1de]/15">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-extrabold text-[#f4f1de] text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#f2cc8f]" />
                      BẢNG TIN
                    </h4>
                    {/* Scoped permission indicator */}
                    {isSuperAdmin || currentUser?.scopedClubIds?.includes(selectedClub.id) ? (
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-[#81b29a]/20 text-[#d8f3dc] border border-[#81b29a]/40">
                        Được đăng
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-[#0b0d12] text-[#9a978e] border border-[#f4f1de]/12 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Chỉ xem
                      </span>
                    )}
                  </div>

                  {/* Form to post: visible/scoped only to leader or Super Admin */}
                  {(isSuperAdmin || currentUser?.scopedClubIds?.includes(selectedClub.id)) && (
                    <div className="p-4 sm:p-5 rounded-xl bg-[#0b0d12]/85 border-[1.5px] border-[#f2cc8f]/40 mb-4 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-[#f2cc8f] mb-1.5">Tiêu đề (*):</label>
                        <input
                          type="text"
                          maxLength={100}
                          value={postTitle}
                          onChange={e => setPostTitle(e.target.value)}
                          placeholder="Tiêu đề thông báo mới..."
                          className="w-full bg-[#151a26] border-[1.5px] border-[#f4f1de]/18 rounded-xl px-4 py-2.5 text-sm text-[#f4f1de] focus:outline-none focus:border-[#f2cc8f]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#f2cc8f] mb-1.5">Nội dung (*):</label>
                        <textarea
                          rows={4}
                          maxLength={1000}
                          value={postContent}
                          onChange={e => setPostContent(e.target.value)}
                          placeholder="Nội dung bài viết..."
                          className="w-full bg-[#151a26] border-[1.5px] border-[#f4f1de]/18 rounded-xl px-4 py-2.5 text-sm text-[#f4f1de] focus:outline-none focus:border-[#f2cc8f] leading-relaxed resize-y"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleNewPost(selectedClub.id)}
                          disabled={postCooldown > 0 || isSubmittingPost}
                          className="ff-tactile-btn px-5 py-2.5 rounded-xl bg-[#f4f1de] hover:bg-[#f2cc8f] text-[#0b0d12] border-2 border-[#0b0d12] font-extrabold text-xs sm:text-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Send className="w-4 h-4 text-[#e07a5f]" />
                          <span>{postCooldown > 0 ? `Chờ ${postCooldown}s...` : isSubmittingPost ? 'Đang gửi...' : 'Đăng bài'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Posts List */}
                  <div className="space-y-2.5">
                    {clubPosts.filter(p => p.clubId === selectedClub.id).length === 0 ? (
                      <div className="text-center py-8 px-4 rounded-xl bg-[#0b0d12]/50 border border-dashed border-[#f4f1de]/10">
                        <p className="text-xs text-[#a39f96]">
                          Chưa có bài viết hay thông báo mới. Các thành viên câu lạc bộ hãy cùng nhau thảo luận và chia sẻ kiến thức nhé!
                        </p>
                      </div>
                    ) : (
                      clubPosts
                        .filter(p => p.clubId === selectedClub.id)
                        .map(post => (
                          <div key={post.id} className="p-4 rounded-xl bg-[#0b0d12]/80 border-[1.5px] border-[#f4f1de]/14 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#f4f1de] text-sm">{post.title}</span>
                              <span className="text-xs text-[#9a978e] font-mono">{post.createdAt}</span>
                            </div>
                            <p className="text-[#d8d5ce] text-xs sm:text-sm leading-relaxed">{post.content}</p>
                            <div className="text-xs text-[#9a978e] pt-2 flex items-center gap-2">
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
                              <RoleMark user={resolveClubUser(post.authorId, post.authorName)} size={10} />
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
            <div className="modal-container w-full max-w-md p-6">
              <h4 className="font-bold text-[#f4f1de] text-base mb-3">Lý do từ chối hồ sơ CLB:</h4>
              <textarea
                rows={4}
                maxLength={200}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="VD: Cần bổ sung thêm danh sách thành viên sáng lập..."
                className="w-full bg-[#0b0d12] border-[1.5px] border-[#f4f1de]/18 rounded-xl p-3 text-sm text-[#f4f1de] focus:outline-none focus:border-[#e07a5f] mb-4"
              />
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRejectPromptClubId(null)}
                  className="ff-tactile-btn px-4 py-2 rounded-xl bg-[#0b0d12] border border-[#f4f1de]/18 text-xs sm:text-sm font-bold text-[#d8d5ce] cursor-pointer"
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
                  className="ff-tactile-btn px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white border border-rose-300 font-bold text-xs sm:text-sm cursor-pointer"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <PeerBattleModal
        isOpen={isBattleModalOpen}
        onClose={() => setIsBattleModalOpen(false)}
        currentUser={currentUser}
      />
    </section>
  );
};
