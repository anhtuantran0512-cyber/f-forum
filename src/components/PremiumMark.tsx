/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { Crown } from 'lucide-react';
import type { FC } from 'react';
import type { User } from '../types';

const isPremiumActive = (user: Pick<User, 'premiumUntil'> | null | undefined, now = Date.now()): boolean =>
  typeof user?.premiumUntil === 'number' && (user.premiumUntil === 0 || user.premiumUntil > now);

export const PremiumMark: FC<{
  user: Pick<User, 'premiumUntil'>;
  compact?: boolean;
}> = ({ user, compact = false }) => {
  if (!isPremiumActive(user)) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-fuchsia-300/30 bg-gradient-to-r from-fuchsia-500/15 to-amber-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-fuchsia-200 shadow-[0_0_14px_rgba(217,70,239,0.12)]"
      title="F-Forum Premium đang hoạt động"
      aria-label="Thành viên F-Forum Premium"
    >
      <Crown className="h-3 w-3 text-amber-300" aria-hidden="true" />
      {!compact && 'Premium'}
    </span>
  );
};
