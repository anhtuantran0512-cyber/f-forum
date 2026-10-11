/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import { BadgeCheck, Check, Coins, Sparkles, Trash2 } from 'lucide-react';
import type { Question, Solution, User } from '../../../types';
import { TierBadge, AdminVerifiedBadge } from '../../Badges10Tier';
import { DEFAULT_AVATAR, handleImageError } from '../../../utils/mediaFallback';
import { bestRewardCoin } from '../../../utils/qaDetail';
import type { ReactionKind } from '../../../../shared/qaReactions';
import { resolveSolutionAuthor, solverIdentity, type OpenAuthor } from './authors';
import { QAReactions } from './QAReactions';
import './QADetail.css';

interface QASolutionCardProps {
  solution: Solution;
  question: Question;
  users: Record<string, User>;
  currentUser: User | null;
  isSuperAdmin: boolean;
  canEditContent: boolean;
  /** Vừa được công nhận NGAY LÚC đang xem → nổi lên + phát sáng một nhịp. */
  celebrate: boolean;
  /** Hiện "+XP thưởng thêm" (chỉ cho chính người giải, lần xác nhận đầu tiên). */
  showXpBonus: boolean;
  onConfirm: (questionId: string, solutionId: string) => void;
  /** Phản ứng nhanh (👍 Hữu ích · 🤯 Hay đó · 🙏 Cảm ơn). */
  onReact: (solutionId: string, kind: ReactionKind) => void;
  onOpenLoginModal?: () => void;
  onDelete?: (solutionId: string) => void;
  onOpenAuthor: OpenAuthor;
}

export const QASolutionCard: React.FC<QASolutionCardProps> = ({
  solution,
  question,
  users,
  currentUser,
  isSuperAdmin,
  canEditContent,
  celebrate,
  showXpBonus,
  onConfirm,
  onReact,
  onOpenLoginModal,
  onDelete,
  onOpenAuthor,
}) => {
  const identity = solverIdentity(solution);
  const reward = bestRewardCoin(question.bountyCoin);
  /* Quyền xác nhận GIỮ NGUYÊN: chỉ tác giả câu hỏi hoặc Super Admin (máy chủ kiểm lại một lần nữa). */
  const canConfirmBest = isSuperAdmin || currentUser?.id === question.authorId;

  return (
    <article
      id={`qa-solution-${solution.id}`}
      data-official={solution.isBest ? 'true' : undefined}
      className={`relative rounded-2xl p-4 sm:p-5 transition-all ${
        solution.isBest
          ? `ff-qa-official bg-neutral-950/70 border-2 border-emerald-400 ${celebrate ? 'ff-qa-official--new' : ''}`
          : 'bg-neutral-950/60 border border-white/10 backdrop-blur-sm'
      }`}
    >
      {celebrate && showXpBonus && (
        <span
          aria-hidden="true"
          className="ff-qa-xp-pop absolute right-4 -top-3 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-neutral-950 text-[11px] font-extrabold shadow-lg"
        >
          <Sparkles className="w-3 h-3" /> +XP thưởng thêm
        </span>
      )}

      <header className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <button
          type="button"
          onClick={(e) => onOpenAuthor(resolveSolutionAuthor(solution, users, currentUser), { x: e.clientX, y: e.clientY })}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity cursor-pointer text-left"
          title="Xem hồ sơ người giải bài"
        >
          <div className="relative">
            <img
              src={identity.avatar}
              alt={identity.name}
              onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
              loading="lazy"
              decoding="async"
              width={36}
              height={36}
              className={`w-9 h-9 rounded-full object-cover ${identity.isAdmin ? 'border border-amber-400' : ''}`}
            />
            <span className="absolute -bottom-1 -right-1">
              <TierBadge level={identity.isAdmin ? 150 : solution.authorLevel} size={15} showTooltip={false} />
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-sm ${identity.isAdmin ? 'discord-admin-name' : 'font-bold text-white'}`}>{identity.name}</span>
            {identity.isAdmin && <AdminVerifiedBadge size={13} />}
            <span className="text-[11px] text-neutral-400 font-mono">• Lv.{solution.authorLevel}</span>
          </div>
        </button>

        {solution.isBest && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-emerald-950 text-[11px] font-extrabold shadow-md">
              <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />
              Đáp án chính thức
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-[11px] font-mono font-bold text-amber-300">
              <Coins className="w-3 h-3 text-amber-400" aria-hidden="true" />+{reward} Coin
            </span>
          </div>
        )}
      </header>

      <p className="text-sm sm:text-[15px] text-neutral-100 leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
        {solution.content}
      </p>

      {solution.imageUrl && (
        <div className="mt-3 rounded-xl overflow-hidden border border-white/10 max-w-md bg-black/40 p-1">
          <img
            loading="lazy"
            decoding="async"
            src={solution.imageUrl}
            alt="Hình ảnh lời giải"
            className="max-h-72 rounded-lg object-contain mx-auto"
          />
        </div>
      )}

      <QAReactions solution={solution} currentUser={currentUser} onReact={onReact} onOpenLoginModal={onOpenLoginModal} />

      <footer className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
        <span className="text-[11px] font-mono">{solution.createdAt}</span>

        <div className="flex flex-wrap items-center gap-2">
          {/* Xoá lời giải (Super Admin / quyền edit_content) */}
          {canEditContent && (
            <button
              type="button"
              onClick={() => onDelete?.(solution.id)}
              className="inline-flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded bg-red-500/10 border border-red-500/20 cursor-pointer"
              title="Xóa phản hồi vi phạm"
            >
              <Trash2 size={11} /> Xóa phản hồi vi phạm
            </button>
          )}

          {canConfirmBest && !solution.isBest && (
            <button
              type="button"
              onClick={() => onConfirm(question.id, solution.id)}
              className="inline-flex items-center gap-1.5 px-3 min-h-9 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-bold text-xs border border-amber-400/40 transition-all cursor-pointer"
              title={`Xác nhận đáp án chính xác nhất để thưởng +${reward} Coin`}
              aria-label={`Xác nhận đúng — người giải nhận +${reward} Coin`}
            >
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Xác nhận đúng</span>
              <span className="font-mono text-[11px]">+{reward} Coin</span>
            </button>
          )}
        </div>
      </footer>
    </article>
  );
};
