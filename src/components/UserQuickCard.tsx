/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useState } from 'react';
import { Award, Coins, Flame, HelpCircle, CheckCircle2, Sparkles, User as UserIcon, X } from 'lucide-react';
import type { User, Question, Solution } from '../types';
import { getTierForLevel } from '../utils/tier';
import { TierBadge, AdminVerifiedBadge } from './Badges10Tier';
import { DEFAULT_AVATAR } from '../utils/mediaFallback';
import { effectiveCoinBalance, formatCoinBalance } from '../utils/coinDisplay';
import { PremiumMark } from './PremiumMark';
import { isMasterAdmin } from '../config/admin';
import { DecoratedAvatar, DecoratedName, UserNameplateBg } from './decorations/DecoratedAvatar';
import { parseBannerUrl, bannerImageStyle, DEFAULT_PROFILE_BANNER_URL } from '../utils/bannerLayout';

export interface UserQuickCardProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenFullProfile: (user: User, tab?: 'overview' | 'card' | 'stats' | 'shop' | 'activity' | 'edit') => void;
  questions?: Question[];
  solutions?: Solution[];
}

/**
 * CodeFronts pc-09 + pc-12 — Discord-style User Card with translucent 3D depth.
 * Opens on user click; clicking "Xem hồ sơ" escalates to the full ProfileModal.
 */
export const UserQuickCard: React.FC<UserQuickCardProps> = ({
  user,
  isOpen,
  onClose,
  onOpenFullProfile,
  questions = [],
  solutions = [],
}) => {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const isSuperAdmin = isMasterAdmin(user.email);
  const tier = getTierForLevel(user.level);
  const userQuestions = questions.filter((q) => q.authorId === user.id);
  const userSolutions = solutions.filter((s) => s.authorId === user.id);
  const bestSolutions = userSolutions.filter((s) => s.isBest);
  /* Super Admin hiển thị Coin = ∞ (vô vùng). */
  const userCoin = formatCoinBalance(effectiveCoinBalance(user.role, user.coin));
  const ownerKey = (user.email || user.id || '').toLowerCase();
  const parsedBanner = parseBannerUrl(user.bannerUrl, ownerKey);
  const bannerImgStyle = bannerImageStyle(parsedBanner.layout);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Thẻ nhanh của ${user.name}`}
      className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-fade-up"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <article className="pc-09 pc-12-shell relative w-full max-w-[380px] rounded-[24px] text-[#f4f1de] overflow-hidden select-none">
        {/* Ảnh nền người dùng liền mạch 1 lớp kéo dài rộng từ đỉnh xuống tận đáy thẻ nhanh */}
        <div
          className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
          aria-hidden="true"
          style={{
            background:
              user.profileGradient ||
              (isSuperAdmin
                ? 'linear-gradient(125deg, #f2cc8f 0%, #e07a5f 52%, #1b2436 100%)'
                : 'linear-gradient(125deg, #1b2436 0%, #2a364f 55%, #81b29a 100%)'),
          }}
        >
          <img
            loading="lazy"
            decoding="async"
            src={parsedBanner.cleanSrc || DEFAULT_PROFILE_BANNER_URL}
            alt={user.name}
            style={bannerImgStyle}
            className="w-full h-full"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, rgba(8, 12, 22, 0.04) 0%, rgba(8, 12, 22, ${Math.max(0.18, (parsedBanner.layout.dim - 8) / 100)}) 125px, rgba(8, 12, 22, ${Math.min(0.76, (parsedBanner.layout.dim + 18) / 100)}) 100%)`,
            }}
          />
        </div>

        {/* Vùng đỉnh thẻ trong suốt hoàn toàn để ảnh nền chảy liền mạch xuống dưới */}
        <div className="relative z-[1] h-[124px] overflow-hidden bg-transparent">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng thẻ"
            className="ff-tactile-btn absolute top-2.5 right-2.5 w-7 h-7 rounded-lg bg-[#0b0d12]/80 hover:bg-[#151a26] border border-[#f4f1de]/20 flex items-center justify-center text-[#f4f1de] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Floating avatar + status dot + badge tray */}
        <div className="relative z-[2] px-4">
          <div className="relative -mt-11 w-[78px] h-[78px] rounded-full bg-[#111214]/85 backdrop-blur-md p-[5px] flex items-center justify-center">
            <DecoratedAvatar
              user={user}
              fallbackSrc={user.avatar || DEFAULT_AVATAR}
              size={68}
              eager
              animate
              alt={user.name}
              className="rounded-full"
            />
            <span
              className="absolute right-1 bottom-1 z-[4] w-4 h-4 rounded-full bg-[#23a55a] border-[3px] border-[#111214]"
              title="Đang hoạt động"
            />
          </div>

          {/* Badge tray */}
          <div className="pc-12-well absolute right-4 top-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/45 backdrop-blur-md">
            <TierBadge level={user.level} size={16} showTooltip={false} />
            {isSuperAdmin && <AdminVerifiedBadge size={14} />}
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
        </div>

        {/* Inner surface body — kính mờ trong suốt để ảnh nền phía sau hiện rõ xuống tận đáy */}
        <div
          className="pc-12-card relative z-[2] m-3 mt-2.5 p-3.5 rounded-2xl space-y-3 backdrop-blur-md border border-white/15"
          style={{ background: 'rgba(11, 17, 28, 0.52)' }}
        >
          {/* Identity — Discord Nameplate Bar + Tag trên tên */}
          <div className="ff-discord-userbar relative rounded-xl p-2.5 border border-white/10">
            <UserNameplateBg
              user={user}
              width={296}
              eager
              animate
              priority="high"
            />
            <div className="relative z-[2] flex items-center gap-1.5 flex-nowrap min-w-0">
              <DecoratedName
                user={user}
                name={user.name.replace(/ \(.*\)/, '')}
                width={186}
                height={38}
                eager
                animate
                priority="high"
                showFallbackTag
                className="min-w-0 shrink"
              />
              {isSuperAdmin && <AdminVerifiedBadge size={15} />}
              <PremiumMark user={user} compact />
            </div>
            <p className="relative z-[2] text-xs text-white/80 font-mono mt-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {tier.titleVi} • Lv.{user.level}
            </p>
          </div>

          {user.bio && (
            <p className="text-xs text-[#dbdee1] leading-relaxed pb-2.5 border-b border-white/[0.07]">
              {user.bio}
            </p>
          )}

          {/* Activity stats */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#949ba4] mb-1.5">
              Hoạt động
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="pc-12-well p-1.5">
                <div className="text-xs font-extrabold text-amber-300 font-mono flex items-center justify-center gap-1">
                  <Coins className="w-3 h-3" />
                  {userCoin}
                </div>
                <div className="text-[9.5px] text-[#949ba4]">Coin</div>
              </div>
              <div className="pc-12-well p-1.5">
                <div className="text-xs font-extrabold text-[#f2cc8f] font-mono flex items-center justify-center gap-1">
                  <HelpCircle className="w-3 h-3" />
                  {userSolutions.length}
                </div>
                <div className="text-[9.5px] text-[#949ba4]">Lời giải</div>
              </div>
              <div className="pc-12-well p-1.5">
                <div className="text-xs font-extrabold text-emerald-300 font-mono flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {bestSolutions.length}
                </div>
                <div className="text-[9.5px] text-[#949ba4]">Hay nhất</div>
              </div>
            </div>
          </div>

          {/* Roles */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#949ba4] mb-1.5">
              Vai trò
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="pc-12-pill inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold text-[#dbdee1]">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                {tier.titleVi}
              </span>
              <span className="pc-12-pill inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold text-[#dbdee1]">
                <span className="w-2 h-2 rounded-full bg-[#81b29a]" />
                {user.role === 'SUPER_ADMIN'
                  ? 'Super Admin'
                  : user.role === 'CLUB_LEADER'
                  ? 'Trưởng CLB'
                  : 'Học sinh'}
              </span>
              {user.staffRole && (
                <span className="pc-12-pill inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold text-[#dbdee1]">
                  <span className={`w-2 h-2 rounded-full ${user.staffRole === 'TEACHER' ? 'bg-[#f2cc8f]' : 'bg-violet-400'}`} />
                  {user.staffRole === 'TEACHER' ? 'Giáo viên' : 'Moderator'}
                </span>
              )}
              {(user.streakCount || 0) > 0 && (
                <span className="pc-12-pill inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold text-orange-300">
                  <Flame className="w-3 h-3 text-orange-400" />
                  {user.streakCount} ngày
                </span>
              )}
              {userQuestions.length > 0 && (
                <span className="pc-12-pill inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold text-[#dbdee1]">
                  <Award className="w-3 h-3 text-emerald-400" />
                  {userQuestions.length} câu hỏi
                </span>
              )}
            </div>
          </div>

          {/* Quick note input */}
          <input
            type="text"
            value={note}
            maxLength={80}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú..."
            className="w-full pc-12-well rounded-lg px-2.5 py-1.5 text-xs text-[#f4f1de] placeholder-[#9a978e] focus:outline-none focus:border-[#f2cc8f]/60 transition-colors"
          />

          {/* Primary action: escalate to full profile modal */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullProfile(user, 'overview');
              }}
              className="ff-tactile-btn py-2 px-3 rounded-xl bg-[#f4f1de] hover:bg-[#f2cc8f] text-[#0b0d12] border-2 border-[#0b0d12] text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <UserIcon className="w-3.5 h-3.5 text-[#e07a5f]" />
              <span>Hồ sơ</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullProfile(user, 'card');
              }}
              className="ff-tactile-btn py-2 px-3 rounded-xl bg-[#151a26] hover:bg-[#1e2536] text-[#f4f1de] border-[1.5px] border-[#f4f1de]/20 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#f2cc8f]" />
              <span>F-Pass</span>
            </button>
          </div>
        </div>
      </article>
    </div>
  );
};

export default UserQuickCard;
