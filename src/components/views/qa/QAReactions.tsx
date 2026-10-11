/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import type { Solution, User } from '../../../types';
import {
  REACTION_KINDS,
  REACTION_META,
  hasReacted,
  reactionCount,
  type ReactionKind,
} from '../../../../shared/qaReactions';
import { isOwnSolution } from './authors';
import './QADetail.css';

interface QAReactionsProps {
  solution: Solution;
  currentUser: User | null;
  onReact: (solutionId: string, kind: ReactionKind) => void;
  /** Khách bấm vào → mở hộp đăng nhập (giống ô soạn lời giải). */
  onOpenLoginModal?: () => void;
}

/**
 * Phản ứng nhanh dưới một lời giải: 👍 Hữu ích · 🤯 Hay đó · 🙏 Cảm ơn.
 *
 * Một cú bấm là xong, bấm lần nữa để bỏ; mỗi người chọn được nhiều loại. Chỉ là tín hiệu xã hội —
 * không cộng XP/Coin (xem shared/qaReactions.ts). Tác giả của lời giải không tự bấm cho mình, chỉ XEM
 * những gì mình nhận được. Số đếm đến từ máy chủ nên mọi người cùng thấy một con số.
 */
export const QAReactions: React.FC<QAReactionsProps> = ({ solution, currentUser, onReact, onOpenLoginModal }) => {
  if (isOwnSolution(currentUser, solution)) {
    const received = REACTION_KINDS.filter((kind) => reactionCount(solution.reactions, kind) > 0);
    if (received.length === 0) return null;
    return (
      /* Chỉ là số liệu để đọc, KHÔNG phải nút: không viền/nền kiểu "viên thuốc" để không bị tưởng bấm được. */
      <ul aria-label="Phản ứng bạn nhận được" className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {received.map((kind) => (
          <li
            key={kind}
            data-reaction={kind}
            title={`Bạn nhận được ${reactionCount(solution.reactions, kind)} lượt “${REACTION_META[kind].label}”`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-300 cursor-default select-none"
          >
            <span aria-hidden="true">{REACTION_META[kind].emoji}</span>{' '}
            <span>{REACTION_META[kind].label}</span>{' '}
            <span className="font-mono tabular-nums text-[11px]">{reactionCount(solution.reactions, kind)}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div role="group" aria-label="Phản ứng nhanh với lời giải này" className="mt-3 flex flex-wrap items-center gap-2">
      {REACTION_KINDS.map((kind) => {
        const meta = REACTION_META[kind];
        const count = reactionCount(solution.reactions, kind);
        const mine = hasReacted(solution.reactions, kind, currentUser?.id);
        return (
          <button
            key={kind}
            type="button"
            data-reaction={kind}
            aria-pressed={mine}
            title={currentUser ? meta.hint : 'Đăng nhập để bày tỏ phản ứng'}
            onClick={() => (currentUser ? onReact(solution.id, kind) : onOpenLoginModal?.())}
            className={`ff-qa-react inline-flex items-center gap-1.5 px-3 min-h-9 rounded-full border text-xs font-semibold cursor-pointer transition-colors ${
              mine
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                : 'bg-white/5 border-white/15 text-neutral-200 hover:bg-white/10'
            }`}
          >
            <span aria-hidden="true" className="ff-qa-react__emoji">
              {meta.emoji}
            </span>{' '}
            <span>{meta.label}</span>
            {count > 0 && (
              <>
                {' '}
                <span className="font-mono tabular-nums text-[11px]">{count}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
};
