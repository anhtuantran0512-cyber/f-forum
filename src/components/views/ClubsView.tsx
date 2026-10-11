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
  X,
  FileText,
  ArrowRight,
} from 'lucide-react';
import type { Club, ClubPost, User, ClubCategory, ChatMessage } from '../../types';
import { DEFAULT_CLUB_COVER, handleImageError, handleVideoError } from '../../utils/mediaFallback';
import { isMasterAdmin } from '../../config/admin';
import { CuBong } from '../mascot/CuBong';
import './ClubsView.css';

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

  const isSuperAdmin = isMasterAdmin(currentUser?.email);

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

  /* Dải "CLB xuất sắc" chỉ hiện khi có số liệu thật: CLB dẫn đầu phải có hoạt động (điểm > 0).
     Không còn "chọn đại CLB đầu tiên" — vinh danh một CLB chưa làm gì là sai sự thật. */
  const spotlightClub = bestClubObj && bestClubObj.score > 0 ? bestClubObj.club : null;

  /* "Đã có CLB chưa" tính trên TOÀN hệ thống, không phụ thuộc bộ lọc/ô tìm kiếm, để tách hai trạng
     thái trống khác hẳn nhau: chưa ai lập CLB  ↔  bộ lọc hiện tại không khớp CLB nào. */
  const hasAnyApprovedClub = clubs.some(c => c.status === 'APPROVED');
  const resetFilters = () => {
    setSelectedCategory('Tất cả');
    setSearchTerm('');
  };
  const openCreateModal = () => {
    if (!currentUser) {
      onOpenLoginModal?.();
    } else {
      setIsCreateModalOpen(true);
    }
  };

  /* NÚT DUY NHẤT "Đăng ký thành lập CLB" của cả trang. Luôn chỉ render đúng một nơi:
     trên header khi đã có CLB, hoặc ngay giữa trạng thái trống khi chưa có CLB nào. */
  const createClubButton = (large = false) => (
    <button
      type="button"
      onClick={openCreateModal}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-bold whitespace-nowrap cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:opacity-95 active:scale-95 transition-all shadow-[0_0_20px_rgba(245,158,11,0.5)] ${
        large ? 'px-6 py-3 text-sm' : 'px-4 py-2 text-xs'
      }`}
    >
      <PlusCircle className={large ? 'w-5 h-5 text-black' : 'w-4 h-4 text-black'} />
      <span>Đăng ký thành lập CLB</span>
    </button>
  );

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
      <div className="ff-video-bg absolute inset-0 z-0 pointer-events-none overflow-hidden">
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
        
        {/* Header: tiêu đề · tìm kiếm · CTA (khi đã có CLB) + tab chuyên mục */}
        <div className="flex flex-col gap-3 mb-5 pb-3 border-b border-white/10 shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex flex-wrap items-center gap-x-2 gap-y-1">
                <Trophy className="w-6 h-6 text-amber-400" />
                <span>Quảng Trường Câu Lạc Bộ</span>
                <span className="text-xs font-mono font-normal text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 whitespace-nowrap">
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
                  aria-label="Tìm câu lạc bộ"
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-neutral-900/80 border border-white/15 text-white placeholder-neutral-400 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              {/* Khi CHƯA có CLB nào, nút này nằm giữa trạng thái trống (không lặp hai nơi) */}
              {hasAnyApprovedClub && createClubButton()}
            </div>
          </div>

          {/* Tab chuyên mục — nhãn "Chuyên mục:" thừa nên bỏ, chip đã tự giải thích */}
          <div role="group" aria-label="Lọc theo chuyên mục" className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map(cat => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={isActive}
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

        {/* Master Admin Approval Board (EXCLUSIVELY rendered for BroAmStuck@gmail.com) */}
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
                Scoped Admin Zone • BroAmStuck@gmail.com
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

        {/* Vùng nội dung (cuộn được khi đứng riêng). Mỗi lúc chỉ hiện MỘT trong ba trạng thái:
            A) chưa có CLB nào → một trạng thái trống duy nhất, ở giữa trang
            B) đã có CLB       → dải "CLB xuất sắc" (chỉ khi có số liệu thật) + lưới thẻ gọn
            C) đã có CLB nhưng bộ lọc/tìm kiếm không khớp → thông báo nhỏ + nút xóa bộ lọc */}
        <div className={`flex-1 flex flex-col gap-4 pb-12 ${isEmbedded ? '' : 'overflow-y-auto pr-1'}`}>
          {!hasAnyApprovedClub ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 py-10 text-center">
              <CuBong mood="sleepy" size={176} decorative />
              <p className="max-w-md text-balance text-base sm:text-lg font-semibold leading-snug text-white">
                Chưa có CLB nào — bạn sẽ là người đầu tiên khởi tạo! 🚀
              </p>
              {createClubButton(true)}
            </div>
          ) : (
            <>
              {/* Dải CLB xuất sắc: avatar + tên + thành viên; ẩn hoàn toàn khi chưa có số liệu */}
              {spotlightClub && (
                <section aria-label="CLB xuất sắc nhất tháng" className="shrink-0">
                  <h2 className="flex items-center gap-1.5 mb-2 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    CLB xuất sắc nhất tháng
                  </h2>
                  <button
                    type="button"
                    onClick={() => setSelectedClub(spotlightClub)}
                    className="group w-full flex items-center gap-3 sm:gap-4 p-3 rounded-2xl liquid-glass bg-neutral-950/70 border border-amber-500/40 hover:border-amber-400/70 text-left transition-colors cursor-pointer"
                  >
                    <img
                      src={spotlightClub.coverImage}
                      alt=""
                      onError={e => handleImageError(e, DEFAULT_CLUB_COVER)}
                      loading="lazy"
                      decoding="async"
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                        {spotlightClub.name}
                      </span>
                      <span className="flex items-center gap-1.5 mt-0.5 text-xs text-neutral-300">
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        {spotlightClub.membersCount} thành viên
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 shrink-0 text-xs font-semibold text-amber-300">
                      <span className="hidden sm:inline">Xem</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                  </button>
                </section>
              )}

              {approvedClubs.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-14 text-center">
                  <Search className="w-9 h-9 text-neutral-400" />
                  <p className="text-sm text-neutral-300">Không có CLB nào khớp bộ lọc.</p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-xs font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-4 cursor-pointer"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              ) : (
                /* Lưới thẻ gọn: 1 → 2 → 3 cột; mỗi thẻ là một container query (code_yeucau · tcl-14) */
                <div className="ff-media-grid">
                  {approvedClubs.map(club => (
                    <div
                      key={club.id}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                      className="ff-media-card rounded-2xl liquid-glass bg-neutral-950/70 border border-white/10 hover:border-amber-400/40 p-4 shadow-xl transition-transform duration-200 group overflow-hidden"
                    >
                      <div className="ff-media-card__layout">
                        {/* Ảnh bìa */}
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
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        </div>

                        <div className="ff-media-card__content">
                          {/* Tag chuyên mục · tên · thành viên — không mô tả dài (xem trong chi tiết) */}
                          <div className="space-y-1.5">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/30 text-[10px] font-mono font-bold text-amber-300">
                              {club.category}
                            </span>
                            <h3 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                              {club.name}
                            </h3>
                            <p className="flex items-center gap-1.5 text-xs text-neutral-300">
                              <Users className="w-3.5 h-3.5 text-amber-400" />
                              {club.membersCount} thành viên
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setApplicationSubmitted(club.id)}
                              aria-label={applicationSubmitted === club.id ? `Đã đăng ký ${club.name}` : `Tham gia ${club.name}`}
                              className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors cursor-pointer"
                            >
                              {applicationSubmitted === club.id ? '✓ Đã đăng ký' : 'Tham gia'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedClub(club)}
                              aria-label={`Xem chi tiết ${club.name}`}
                              className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors cursor-pointer"
                            >
                              Xem <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
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
                ⏳ Chờ Ban Quản Trị duyệt · 🎖️ Duyệt xong: huy hiệu Chủ nhiệm + 250 XP
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
