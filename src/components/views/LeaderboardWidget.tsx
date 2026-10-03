/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useMemo, useState } from 'react';
import { Trophy, ChevronDown, HelpCircle, Sparkles } from 'lucide-react';
import type { User } from '../../types';
import { DEFAULT_AVATAR, handleImageError } from '../../utils/mediaFallback';
import { MagneticButton } from '../MagneticButton';

interface LeaderboardWidgetProps {
  currentUser: User | null;
  users: Record<string, User>;
  onOpenProfile?: (user: { id: string; name: string; avatar: string; email?: string; level?: number }) => void;
  onOpenAskModal: () => void;
  className?: string;
}

type TimeFilter = 'week' | 'month' | 'year' | 'all';

const FILTER_LABELS: Record<TimeFilter, string> = {
  week: 'Tuần này',
  month: 'Tháng này',
  year: 'Năm nay',
  all: 'Mọi thời gian',
};

const getPeriodStart = (filter: Exclude<TimeFilter, 'all'>, now: Date): number => {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (filter === 'week') {
    const daysSinceMonday = (start.getUTCDay() + 6) % 7;
    start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  } else if (filter === 'month') {
    start.setUTCDate(1);
  } else {
    start.setUTCMonth(0, 1);
  }
  return start.getTime();
};

const pointsForPeriod = (user: User, filter: TimeFilter, now: Date): number => {
  if (filter === 'all') return Math.max(0, Number(user.xp) || 0);
  const start = getPeriodStart(filter, now);
  return (user.activityLog || []).reduce((total, activity) => {
    const timestamp = Date.parse(activity.createdAt);
    if (!Number.isFinite(timestamp) || timestamp < start || timestamp > now.getTime()) return total;
    return total + Math.max(0, Number(activity.points) || 0);
  }, 0);
};

export const LeaderboardWidget: React.FC<LeaderboardWidgetProps> = ({
  currentUser,
  users,
  onOpenProfile,
  onOpenAskModal,
  className = '',
}) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const now = useMemo(() => new Date(), [timeFilter, users]);

  const rankedUsers = useMemo(() => Object.values(users)
    .map((user) => ({ ...user, points: pointsForPeriod(user, timeFilter, now) }))
    .filter((user) => user.points > 0)
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    .map((user, index) => ({ ...user, rank: index + 1 })), [users, timeFilter, now]);
  const members = rankedUsers.slice(0, 5);
  const currentRank = currentUser ? rankedUsers.find((user) => user.id === currentUser.id) : undefined;
  const currentUserPoints = currentUser ? pointsForPeriod(currentUser, timeFilter, now) : 0;

  const openProfile = (user: User) => onOpenProfile?.({
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    email: user.email,
    level: user.level,
  });

  return (
    <aside className={`space-y-4 ${className}`} aria-label="Bảng xếp hạng và đặt câu hỏi">
      <section className="rounded-3xl border border-white/10 bg-[#0c1218]/90 p-4 shadow-xl">
        <div className="flex items-center justify-center gap-2 text-sm font-bold text-white">
          <Trophy className="h-4 w-4 text-amber-300" />
          <h2>Đóng góp cộng đồng</h2>
        </div>
        <div className="relative mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => setIsDropdownOpen((open) => !open)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/75 transition hover:bg-white/10"
            aria-expanded={isDropdownOpen}
            aria-haspopup="listbox"
          >
            {FILTER_LABELS[timeFilter]}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {isDropdownOpen && (
            <div className="absolute top-9 z-30 w-36 rounded-xl border border-white/10 bg-[#111a22] p-1 shadow-2xl" role="listbox" aria-label="Khoảng thời gian">
              {(Object.keys(FILTER_LABELS) as TimeFilter[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={timeFilter === option}
                  onClick={() => {
                    setTimeFilter(option);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${timeFilter === option ? 'bg-teal-500/15 text-teal-200' : 'text-white/65 hover:bg-white/5 hover:text-white'}`}
                >
                  {FILTER_LABELS[option]}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 space-y-1.5" aria-live="polite">
          {members.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 px-3 py-5 text-center text-xs text-white/45">
              Chưa có hoạt động được ghi nhận trong khoảng thời gian này.
            </p>
          ) : members.map((member, index) => (
            <button
              key={member.id}
              type="button"
              onClick={() => openProfile(member)}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2 text-left transition hover:border-white/15 hover:bg-white/[0.06]"
              title={`Xem hồ sơ ${member.name}`}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className={`w-4 shrink-0 text-center font-mono text-xs font-bold ${index === 0 ? 'text-amber-300' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-white/40'}`}>{member.rank}</span>
                <img
                  src={member.avatar || DEFAULT_AVATAR}
                  alt=""
                  onError={(event) => handleImageError(event, DEFAULT_AVATAR)}
                  loading="lazy"
                  decoding="async"
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 rounded-full border border-white/10 object-cover"
                />
                <span className="truncate text-xs font-medium text-white/80">{member.name}</span>
              </span>
              <span className="shrink-0 font-mono text-xs font-semibold text-teal-200">
                {member.points.toLocaleString()} <span className="font-sans font-normal text-white/40">XP</span>
              </span>
            </button>
          ))}
        </div>

        {currentUser && (
          <button
            type="button"
            onClick={() => openProfile(currentUser)}
            className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-teal-400/20 bg-teal-400/[0.06] p-2 text-left transition hover:bg-teal-400/10"
            title="Mở hồ sơ cá nhân"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-[11px] font-semibold text-teal-200">{currentRank ? `#${currentRank.rank}` : 'Bạn'}</span>
              <img
                src={currentUser.avatar || DEFAULT_AVATAR}
                alt=""
                onError={(event) => handleImageError(event, DEFAULT_AVATAR)}
                loading="lazy"
                decoding="async"
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 rounded-full border border-teal-300/30 object-cover"
              />
              <span className="truncate text-xs font-semibold text-teal-100">{currentUser.name}</span>
            </span>
            <span className="shrink-0 font-mono text-xs font-semibold text-teal-200">
              {currentUserPoints.toLocaleString()} <span className="font-sans font-normal text-white/40">XP</span>
            </span>
          </button>
        )}
      </section>

      <section className="relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-amber-400/20 bg-[#0c1218]/90 p-5 text-center shadow-xl">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-amber-500/[0.07] via-transparent to-teal-500/[0.06]" />
        <div className="relative z-10 flex items-center gap-1.5 text-xs font-semibold text-amber-200">
          <Sparkles className="h-3.5 w-3.5" /> Cần trợ giúp bài tập?
        </div>
        <h3 className="relative z-10 text-sm font-bold text-white">Đặt câu hỏi học tập</h3>
        <p className="relative z-10 max-w-xs text-xs leading-relaxed text-white/55">
          Chia sẻ câu hỏi và cùng cộng đồng tìm lời giải.
        </p>
        <MagneticButton
          variant="gold"
          onClick={onOpenAskModal}
          className="relative z-10 w-full rounded-xl px-5 py-2.5 text-xs font-bold text-neutral-950"
        >
          <HelpCircle className="h-4 w-4" />
          <span>Đặt câu hỏi</span>
        </MagneticButton>
      </section>
    </aside>
  );
};

export default LeaderboardWidget;
