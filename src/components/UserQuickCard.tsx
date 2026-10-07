/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useState } from 'react';
import { Award, Coins, Flame, HelpCircle, CheckCircle2, Sparkles, User as UserIcon, X } from 'lucide-react';
import type { User, Question, Solution } from '../types';
import { getTierForLevel } from '../utils/tier';
import { TierBadge, AdminVerifiedBadge } from './Badges10Tier';
import { DEFAULT_AVATAR, handleImageError } from '../utils/mediaFallback';
import { PremiumMark } from './PremiumMark';

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

  const isSuperAdmin = user.email === 'anhtuantran0512@gmail.com';
  const tier = getTierForLevel(user.level);
  const userQuestions = questions.filter((q) => q.authorId === user.id);
  const userSolutions = solutions.filter((s) => s.authorId === user.id);
  const bestSolutions = userSolutions.filter((s) => s.isBest);
  const userCoin = user.coin ?? 0;

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
      <article className="pc-09 pc-12-shell relative w-full max-w-[340px] rounded-[24px] text-[#f2f3f5] overflow-hidden select-none">
        {/* Banner with custom bannerUrl or profileGradient */}
        <div
          className="relative h-[96px] overflow-hidden"
          style={{
            background:
              user.profileGradient ||
              (isSuperAdmin
                ? 'linear-gradient(125deg, #f59e0b 0%, #ec4899 50%, #5865f2 100%)'
                : 'linear-gradient(125deg, #5865f2 0%, #9b59b6 55%, #06b6d4 100%)'),
          }}
        >
          {user.bannerUrl ? (
            <img src={user.bannerUrl} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background:
                  'radial-gradient(circle at 22% 30%, rgba(255,255,255,0.45), transparent 45%), radial-gradient(circle at 78% 70%, rgba(0,0,0,0.35), transparent 55%)',
              }}
            />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng thẻ"
            className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/45 hover:bg-black/70 border border-white/15 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Floating avatar + status dot + badge tray */}
        <div className="relative px-4">
          <div className="relative -mt-11 w-[78px] h-[78px] rounded-full bg-[#111214] p-[5px]">
            <img
              src={user.avatar}
              alt={user.name}
              onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
              width={68}
              height={68}
              className="w-full h-full rounded-full object-cover bg-[#1e1f22]"
            />
            <span
              className="absolute right-1 bottom-1 w-4 h-4 rounded-full bg-[#23a55a] border-[3px] border-[#111214]"
              title="Đang hoạt động"
            />
          </div>

          {/* Badge tray */}
          <div className="pc-12-well absolute right-4 top-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg">
            <TierBadge level={user.level} size={16} showTooltip={false} />
            {isSuperAdmin && <AdminVerifiedBadge size={14} />}
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
        </div>

        {/* Inner surface body */}
        <div className="pc-12-card m-3 mt-2.5 p-3.5 rounded-2xl space-y-3">
          {/* Identity */}
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className={`text-[17px] font-extrabold leading-tight ${isSuperAdmin ? 'discord-admin-name' : 'text-white'}`}>
                {user.name.replace(/ \(.*\)/, '')}
              </h3>
              {isSuperAdmin && <AdminVerifiedBadge size={15} />}
              <PremiumMark user={user} compact />
            </div>
            <p className="text-xs text-[#949ba4] font-mono">
              {tier.titleVi} • Lv.{user.level}
            </p>
          </div>

          {/* Custom status / bio */}
          <p className="text-xs text-[#dbdee1] leading-relaxed pb-2.5 border-b border-white/[0.07]">
            {user.bio || 'Thành viên học tập tại F-Forum.'}
          </p>

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
                <div className="text-xs font-extrabold text-cyan-300 font-mono flex items-center justify-center gap-1">
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
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                {user.role === 'SUPER_ADMIN'
                  ? 'Quản trị'
                  : user.role === 'CLUB_LEADER'
                  ? 'Chủ nhiệm CLB'
                  : 'Học sinh'}
              </span>
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
            placeholder="Thêm ghi chú cá nhân..."
            className="w-full pc-12-well rounded-lg px-2.5 py-1.5 text-xs text-[#dbdee1] placeholder-[#949ba4] focus:outline-none focus:border-[#5865f2] transition-colors"
          />

          {/* Primary action: escalate to full profile modal */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullProfile(user, 'overview');
              }}
              className="py-2 px-3 rounded-xl bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Xem hồ sơ</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullProfile(user, 'card');
              }}
              className="pc-12-btn py-2 px-3 rounded-xl text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Thẻ F-Pass</span>
            </button>
          </div>
        </div>
      </article>
    </div>
  );
};

export default UserQuickCard;
