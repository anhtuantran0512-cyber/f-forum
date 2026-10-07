/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import type { Club, ClubPost, User, ClubCategory, ChatMessage } from '../../types';
import { DEFAULT_CLUB_COVER, handleImageError, handleVideoError } from '../../utils/mediaFallback';

interface ClubsViewProps {
  currentUser: User | null;
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

export const ClubsView: React.FC<ClubsViewProps> = ({
  currentUser,
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

  useEffect(() => {
    if (createCooldown <= 0) return;
    const timer = setInterval(() => {
      setCreateCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [createCooldown]);

  useEffect(() => {
    if (postCooldown <= 0) return;
    const timer = setInterval(() => {
      setPostCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [postCooldown]);

  const [newClubName, setNewClubName] = useState('');
  const [newSlogan, setNewSlogan] = useState('');
  const [newCover, setNewCover] = useState('');
  const [newCategory, setNewCategory] = useState<ClubCategory>('Công nghệ');
  const [newFounders, setNewFounders] = useState('');
  const [newPurpose, setNewPurpose] = useState('');

  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');

  const isSuperAdmin = currentUser?.email === 'anhtuantran0512@gmail.com';

  const approvedClubs = clubs.filter(
    c =>
      c.status === 'APPROVED' &&
      (selectedCategory === 'Tất cả' || c.category === selectedCategory) &&
      (c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.slogan.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.purpose.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const pendingClubs = clubs.filter(c => c.status === 'PENDING');

  const clubScores = approvedClubs.map(club => {
    const postCount = clubPosts.filter(p => p.clubId === club.id).length;
    const msgCount = chatMessages.filter(
      m => m.channelId === 'club-hub' && m.content.toLowerCase().includes(club.name.toLowerCase())
    ).length;
    const score = postCount * 2 + msgCount;
    return { club, score };
  });

  const bestClubObj = clubScores.length > 0
    ? [...clubScores].sort((a, b) => b.score - a.score)[0]
    : null;

  const spotlightClub = bestClubObj && bestClubObj.score > 0 ? bestClubObj.club : (approvedClubs.length > 0 && clubPosts.length > 0 ? approvedClubs[0] : null);
  const regularClubs = approvedClubs.filter(c => c.id !== spotlightClub?.id);

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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  };

  return (
    <section className={`relative w-full ${isEmbedded ? 'min-h-screen' : 'h-[100dvh] md:h-screen overflow-hidden'} flex flex-col pt-[calc(54px+var(--safe-top)+12px)] md:pt-24 pb-[calc(56px+var(--safe-bottom)+12px)] md:pb-8 px-4 sm:px-8`}>
      {/* Background Video Engine */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <video
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onError={handleVideoError}
          className="w-full h-full object-cover scale-[1.05]"
        />
        {/* Amber / Orange Ambient Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40" />
        <div className="absolute inset-0 bg-amber-950/20 mix-blend-color" />
      </div>

      {/* Main Container */}
      <div className={`relative z-10 w-full max-w-7xl mx-auto flex-1 flex flex-col ${isEmbedded ? '' : 'overflow-hidden'}`}>
        
        {/* Top Header Bar & Category Filter */}
        <div className="flex flex-col gap-3 mb-5 pb-3 border-b border-white/10 shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-400" />
                <span>Quảng Trường Câu Lạc Bộ</span>
                <span className="text-xs font-mono font-normal text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
                  CLUBS PLAZA
                </span>
              </h1>
              <p className="text-xs text-neutral-300 mt-0.5">
                Khám phá các tổ chức năng động, tham gia dự án học sinh và khẳng định bản lĩnh.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Search Input */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={100}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Tìm tên CLB, sở thích..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-neutral-900/80 border border-white/15 text-white placeholder-neutral-400 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              {/* Glowing + Đăng Ký Thành Lập CLB Button */}
              <button
                onClick={() => {
                  if (!currentUser) {
                    onOpenLoginModal?.();
                  } else {
                    setIsCreateModalOpen(true);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:opacity-95 active:scale-95 transition-all shadow-[0_0_20px_rgba(245,158,11,0.5)] flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-black" />
                <span>+ Đăng Ký Thành Lập CLB</span>
              </button>
            </div>
          </div>

          {/* Filter by category: Công nghệ, Nghệ thuật, Thể thao, Học thuật */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <Filter className="w-3.5 h-3.5 text-neutral-400 shrink-0 mr-0.5" />
            <span className="text-xs text-neutral-400 font-semibold mr-1 shrink-0">Chuyên mục:</span>
            {CATEGORIES.map(cat => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all focus:outline-none ${
                    isActive
                      ? 'bg-amber-400 text-black font-bold shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                      : 'bg-white/5 text-neutral-300 hover:bg-white/15 border border-white/10'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Master Admin Approval Board (EXCLUSIVELY rendered for anhtuantran0512@gmail.com) */}
        {isSuperAdmin && (
          <div className="mb-5 p-4 rounded-2xl liquid-glass bg-amber-950/40 border border-amber-500/40 shadow-xl shrink-0 animate-fade-up">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-500/20">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-xs sm:text-sm font-bold text-amber-300 uppercase tracking-wider">
                  MASTER ADMIN APPROVAL BOARD ({pendingClubs.length} ĐƠN ĐANG CHỜ DUYỆT)
                </h3>
              </div>
              <span className="text-[10px] text-amber-400/80 font-mono">
                Scoped Admin Zone • anhtuantran0512@gmail.com
              </span>
            </div>

            {pendingClubs.length === 0 ? (
              <div className="p-3 text-center text-xs text-amber-200/70 font-mono bg-black/40 rounded-xl border border-amber-500/20">
                ✓ Hiện không có đơn thành lập CLB nào đang chờ duyệt. Toàn bộ hồ sơ đã hoàn tất!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
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
                        className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-1 shadow-md"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Phê Duyệt (+250 XP)
                      </button>
                      <button
                        onClick={() => setRejectPromptClubId(pClub.id)}
                        className="py-1.5 px-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 font-medium text-xs flex items-center justify-center gap-1 border border-red-500/30"
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
          
          {/* Spotlight Card (Top 1) or Authentic Empty State */}
          {spotlightClub ? (
            <div
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="relative w-full rounded-3xl liquid-glass bg-neutral-950/70 border border-amber-500/40 p-5 sm:p-6 shadow-2xl transition-transform duration-200 overflow-hidden group"
            >
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-40 transition-opacity duration-500"
                style={{ backgroundImage: `url(${spotlightClub.coverImage})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-transparent" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="max-w-xl space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-[11px] font-bold text-amber-300">
                      <Trophy className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                      CLB XUẤT SẮC NHẤT THÁNG
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[10px] font-mono font-bold">
                      {spotlightClub.category}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {spotlightClub.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-300 italic font-serif">
                    "{spotlightClub.slogan}"
                  </p>
                  <p className="text-xs text-neutral-400 line-clamp-2">
                    {spotlightClub.purpose}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-neutral-300 pt-2 font-mono">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      {spotlightClub.membersCount} Thành viên • {spotlightClub.followerCount} Theo dõi
                    </span>
                    <span>Chủ nhiệm: {spotlightClub.leaderName}</span>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col gap-2.5 shrink-0">
                  <button
                    onClick={() => setSelectedClub(spotlightClub)}
                    className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl bg-white text-neutral-900 font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Xem Chi Tiết
                  </button>

                  <button
                    onClick={() => setApplicationSubmitted(spotlightClub.id)}
                    className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl liquid-glass bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {applicationSubmitted === spotlightClub.id ? '✓ Đã Nộp Đơn' : 'Nộp Đơn Ứng Tuyển'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-full rounded-3xl liquid-glass bg-neutral-950/70 border border-white/10 p-6 sm:p-8 text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-xs font-bold text-amber-300">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                CLB XUẤT SẮC NHẤT THÁNG
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white max-w-lg mx-auto">
                Chưa có CLB nào hoạt động trong tháng này. Hãy đăng ký thành lập CLB đầu tiên!
              </h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                Danh hiệu được tự động cập nhật theo số lượng bài viết và tin nhắn trao đổi thời gian thực.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      onOpenLoginModal?.();
                    } else {
                      setIsCreateModalOpen(true);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 text-xs font-semibold transition-all cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Đăng ký thành lập CLB</span>
                </button>
              </div>
            </div>
          )}

          {/* Regular Club Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularClubs.length === 0 && !spotlightClub ? (
              <div className="col-span-full text-center py-12 text-neutral-400 space-y-2">
                <Users className="w-10 h-10 text-neutral-600 mx-auto" />
                <p className="text-sm">Chưa có câu lạc bộ nào trong danh mục này.</p>
              </div>
            ) : null}
            {regularClubs.map(club => (
              <div
                key={club.id}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="rounded-2xl liquid-glass bg-neutral-950/70 border border-white/10 hover:border-amber-400/40 p-4 shadow-xl transition-transform duration-200 flex flex-col justify-between group overflow-hidden"
              >
                <div>
                  {/* Card Cover */}
                  <div className="relative h-32 w-full rounded-xl overflow-hidden mb-3 border border-white/10">
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                    <span className="absolute bottom-2 left-2 text-[10px] font-mono bg-black/60 px-2 py-0.5 rounded text-neutral-300 border border-white/10">
                      {club.membersCount} thành viên
                    </span>
                    <span className="absolute top-2 right-2 text-[10px] font-mono font-bold bg-amber-500/80 text-black px-2 py-0.5 rounded-md shadow">
                      {club.category}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                    {club.name}
                  </h3>
                  <p className="text-xs text-neutral-400 italic line-clamp-1 mt-0.5">
                    {club.slogan}
                  </p>
                  <p className="text-[11px] text-neutral-300 mt-2 line-clamp-2">
                    {club.purpose}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedClub(club)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
                  >
                    Xem Chi Tiết
                  </button>
                  <button
                    onClick={() => setApplicationSubmitted(club.id)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors"
                  >
                    {applicationSubmitted === club.id ? '✓ Đã Nộp' : 'Nộp Đơn'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: Thành Lập CLB Mới */}
      {isCreateModalOpen && (
        <div role="dialog" aria-modal="true" aria-label="Đăng ký thành lập CLB" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-up">
          <div className="liquid-glass w-full max-w-lg rounded-3xl bg-neutral-950/95 border border-amber-500/40 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Đăng Ký Thành Lập CLB Mới</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label htmlFor="ten-cau-lac-bo" className="block text-xs font-semibold text-neutral-300 mb-1">
                  Tên Câu Lạc Bộ (*):
                </label>
                <input id="ten-cau-lac-bo"
                  type="text"
                  required
                  maxLength={60}
                  value={newClubName}
                  onChange={e => setNewClubName(e.target.value)}
                  placeholder="VD: CLB Lập Trình Game F-Dev..."
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Chuyên mục hoạt động (*):
                </label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as ClubCategory)}
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="Công nghệ">Công nghệ</option>
                  <option value="Nghệ thuật">Nghệ thuật</option>
                  <option value="Thể thao">Thể thao</option>
                  <option value="Học thuật">Học thuật</option>
                </select>
              </div>

              <div>
                <label htmlFor="khau-hieu-slogan" className="block text-xs font-semibold text-neutral-300 mb-1">
                  Khẩu hiệu / Slogan (*):
                </label>
                <input id="khau-hieu-slogan"
                  type="text"
                  required
                  maxLength={120}
                  value={newSlogan}
                  onChange={e => setNewSlogan(e.target.value)}
                  placeholder="VD: Kết nối đam mê, vươn tầm công nghệ..."
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-neutral-300">
                    Ảnh bìa URL hoặc tải ảnh (&lt; 5MB):
                  </label>
                  <label
                    htmlFor="club-cover-upload"
                    className="text-[11px] text-amber-400 hover:text-amber-300 cursor-pointer font-medium"
                  >
                    + Tải tệp ảnh
                  </label>
                  <input
                    id="club-cover-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleCoverFileUpload}
                    className="hidden"
                  />
                </div>
                <input
                  type="url"
                  maxLength={500}
                  value={newCover}
                  onChange={e => setNewCover(e.target.value)}
                  placeholder="https://images.unsplash.com/... hoặc chọn tệp ảnh"
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
                {coverUploadError && (
                  <p className="text-[11px] text-red-400 mt-1">{coverUploadError}</p>
                )}
              </div>

              <div>
                <label htmlFor="danh-sach-thanh-vien-sang-lap-ca" className="block text-xs font-semibold text-neutral-300 mb-1">
                  Danh sách thành viên sáng lập (cách nhau bởi dấu phẩy):
                </label>
                <input id="danh-sach-thanh-vien-sang-lap-ca"
                  type="text"
                  maxLength={200}
                  value={newFounders}
                  onChange={e => setNewFounders(e.target.value)}
                  placeholder="Nguyễn Văn A, Trần Thị B..."
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label htmlFor="ton-chi-hoat-dong" className="block text-xs font-semibold text-neutral-300 mb-1">
                  Tôn chỉ hoạt động (*):
                </label>
                <textarea id="ton-chi-hoat-dong"
                  required
                  rows={3}
                  maxLength={500}
                  value={newPurpose}
                  onChange={e => setNewPurpose(e.target.value)}
                  placeholder="Mô tả mục tiêu, lộ trình sinh hoạt định kỳ và kế hoạch tổ chức sự kiện..."
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 leading-relaxed">
                ℹ️ Hồ sơ sẽ được chuyển trạng thái PENDING tới Ban Quản Trị. Khi được phê duyệt, bạn sẽ nhận huy hiệu Chủ nhiệm CLB scoped và +250 XP!
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createCooldown > 0 || isSubmittingClub}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-xs shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
        </div>
      )}

      {/* Modal: Xem Chi Tiết CLB & Scoped Discussion Board */}
      {selectedClub && (
        <div role="dialog" aria-modal="true" aria-label="Chi tiết câu lạc bộ" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-up">
          <div className="liquid-glass w-full max-w-2xl rounded-3xl bg-neutral-950/95 border border-white/20 shadow-2xl p-6 relative max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <h3 className="font-bold text-lg text-white">{selectedClub.name}</h3>
                <p className="text-xs text-neutral-400 italic">"{selectedClub.slogan}"</p>
              </div>
              <button
                onClick={() => setSelectedClub(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="h-44 w-full rounded-2xl overflow-hidden mb-4 border border-white/15">
              <img
                src={selectedClub.coverImage}
                alt={selectedClub.name}
                onError={e => handleImageError(e, DEFAULT_CLUB_COVER)}
                loading="lazy"
                decoding="async"
                width={640}
                height={176}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-3 text-xs text-neutral-300">
              {/* Founding Manifesto */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <span className="font-bold text-white block">Tuyên Ngôn Sáng Lập & Tôn Chỉ (Founding Manifesto):</span>
                <p className="italic text-amber-200">"{selectedClub.slogan}"</p>
                <p className="text-neutral-300 leading-relaxed pt-1">{selectedClub.purpose}</p>
              </div>

              {/* Member Roster */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="font-bold text-white block mb-1">Chủ nhiệm & Trưởng ban:</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-amber-300 font-bold">{selectedClub.leaderName}</span>
                    <span className="text-[10px] text-neutral-400 font-mono">(Trưởng CLB)</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="font-bold text-white block mb-1">Hội đồng Sáng Lập (Founding Roster):</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedClub.foundingMembers && selectedClub.foundingMembers.length > 0 ? (
                      selectedClub.foundingMembers.map((m, idx) => (
                        <span
                          key={`${m}-${idx}`}
                          className="px-2 py-0.5 rounded-md bg-white/10 text-neutral-200 text-[11px] font-mono border border-white/10"
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
              <div className="pt-3 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    BẢNG TIN THÔNG BÁO NỘI BỘ
                  </h4>
                  {/* Scoped permission indicator */}
                  {isSuperAdmin || currentUser?.scopedClubIds?.includes(selectedClub.id) ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Quyền Đăng Bài: ĐÃ CẤP
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Chỉ Xem
                    </span>
                  )}
                </div>

                {/* Form to post: visible/scoped only to leader or Super Admin */}
                {isSuperAdmin || currentUser?.scopedClubIds?.includes(selectedClub.id) ? (
                  <div className="p-3 rounded-xl bg-white/5 border border-cyan-400/30 mb-3 space-y-2">
                    <input
                      type="text"
                      maxLength={100}
                      value={postTitle}
                      onChange={e => setPostTitle(e.target.value)}
                      placeholder="Tiêu đề thông báo mới..."
                      className="w-full bg-neutral-900 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                    <textarea
                      rows={2}
                      maxLength={1000}
                      value={postContent}
                      onChange={e => setPostContent(e.target.value)}
                      placeholder="Nội dung bài viết..."
                      className="w-full bg-neutral-900 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleNewPost(selectedClub.id)}
                        disabled={postCooldown > 0 || isSubmittingPost}
                        className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>{postCooldown > 0 ? `Chờ ${postCooldown}s...` : isSubmittingPost ? 'Đang gửi...' : 'Đăng bài'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-500 italic mb-3">
                    * Quy tắc scoped permission: Bạn đang ở chế độ xem. Chỉ Chủ nhiệm của CLB này hoặc Super Admin mới có quyền đăng thông báo.
                  </p>
                )}

                {/* Posts List */}
                <div className="space-y-2">
                  {clubPosts.filter(p => p.clubId === selectedClub.id).length === 0 ? (
                    <p className="text-neutral-500 text-center py-4">Chưa có thông báo nào được đăng.</p>
                  ) : (
                    clubPosts
                      .filter(p => p.clubId === selectedClub.id)
                      .map(post => (
                        <div key={post.id} className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-xs">{post.title}</span>
                            <span className="text-[10px] text-neutral-500">{post.createdAt}</span>
                          </div>
                          <p className="text-neutral-300 text-xs leading-relaxed">{post.content}</p>
                          <div className="text-[10px] text-neutral-400 pt-1">Người đăng: {post.authorName}</div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Prompt */}
      {rejectPromptClubId && (
        <div role="dialog" aria-modal="true" aria-label="Từ chối duyệt CLB" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-up">
          <div className="liquid-glass w-full max-w-sm rounded-2xl bg-neutral-950 p-5 border border-red-500/30">
            <h4 className="font-bold text-white text-sm mb-2">Lý do từ chối hồ sơ CLB:</h4>
            <textarea
              rows={3}
              maxLength={200}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="VD: Cần bổ sung thêm danh sách thành viên sáng lập..."
              className="w-full bg-neutral-900 border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-400 mb-3"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectPromptClubId(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-neutral-400"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  void onRejectClub(rejectPromptClubId, rejectReason || 'Không đủ điều kiện theo quy chế.');
                  setRejectPromptClubId(null);
                  setRejectReason('');
                }}
                className="px-4 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-white font-bold text-xs"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
