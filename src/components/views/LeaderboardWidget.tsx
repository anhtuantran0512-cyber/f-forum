/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useMemo, useState } from 'react';
import {
  Trophy,
  ArrowRight,
  HelpCircle,
  Sparkles,
  Medal,
} from 'lucide-react';
import type { User, Question, Solution, ChatMessage } from '../../types';
import { DEFAULT_AVATAR, handleImageError } from '../../utils/mediaFallback';
import { MagneticButton } from '../MagneticButton';

type Period = 'week' | 'month' | 'year' | 'all';

interface LeaderboardMember {
  key: string;
  id: string;
  name: string;
  avatar: string;
  points: number;
  level: number;
  email?: string;
  rank: number;
  isYou?: boolean;
}

interface LeaderboardWidgetProps {
  currentUser: User | null;
  users?: Record<string, User>;
  questions?: Question[];
  solutions?: Solution[];
  chatMessages?: ChatMessage[];
  onOpenProfile?: (user: { id: string; name: string; avatar: string; email?: string; level?: number }) => void;
  onOpenAskModal: () => void;
  className?: string;
}

const PERIOD_LABELS: Record<Period, string> = {
  week: 'Tuần',
  month: 'Tháng',
  year: 'Năm',
  all: 'Toàn thời gian',
};

const periodStart = (period: Period): number => {
  const now = new Date();
  if (period === 'week') {
    const d = new Date(now);
    const day = (d.getDay() + 6) % 7; /* Monday = 0 */
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }
  if (period === 'year') {
    return new Date(now.getFullYear(), 0, 1).getTime();
  }
  return 0;
};

/** Điểm = đóng góp thật trong kỳ (câu hỏi, lời giải, đáp án chuẩn, tin nhắn) + XP tích lũy (toàn thời gian). */
function computeMembers(
  users: Record<string, User>,
  questions: Question[],
  solutions: Solution[],
  chatMessages: ChatMessage[],
  period: Period,
): LeaderboardMember[] {
  const since = periodStart(period);
  const inPeriod = (ts?: number) => (period === 'all' ? true : ts !== undefined && ts >= since);

  const scores = new Map<string, number>();
  const bump = (emailKey: string, amount: number) => {
    if (!emailKey) return;
    scores.set(emailKey, (scores.get(emailKey) || 0) + amount);
  };

  const emailById = new Map<string, string>();
  Object.values(users).forEach((u) => {
    if (u?.id && u?.email) emailById.set(u.id, u.email.toLowerCase());
  });

  questions.forEach((q) => {
    if (!inPeriod(q.createdAtMs)) return;
    const email = emailById.get(q.authorId) || '';
    bump(email, 50);
  });

  solutions.forEach((s) => {
    if (!inPeriod(s.createdAtMs)) return;
    const email = (s.authorEmail || emailById.get(s.authorId) || '').toLowerCase();
    bump(email, 25);
    if (s.isBest) bump(email, 100);
  });

  chatMessages.forEach((m) => {
    if (!inPeriod(m.timestampMs)) return;
    const email = (m.authorEmail || '').toLowerCase();
    bump(email, 2);
  });

  if (period === 'all') {
    Object.entries(users).forEach(([email, u]) => {
      bump(email, u.xp || 0);
    });
  }

  const members: LeaderboardMember[] = [];
  scores.forEach((points, emailKey) => {
    const u = users[emailKey];
    if (!u || points <= 0) return;
    members.push({
      key: emailKey,
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      email: u.email,
      level: u.level,
      points: Math.round(points),
      rank: 0,
    });
  });

  members.sort((a, b) => b.points - a.points);
  members.forEach((m, i) => {
    m.rank = i + 1;
  });
  return members;
}

const RANK_STYLES: Record<number, string> = {
  1: 'from-amber-400/30 to-yellow-500/10 border-amber-400/50 text-amber-300',
  2: 'from-slate-300/20 to-slate-500/5 border-slate-300/40 text-slate-200',
  3: 'from-orange-500/25 to-amber-700/10 border-orange-400/40 text-orange-300',
};

export const LeaderboardWidget: React.FC<LeaderboardWidgetProps> = ({
  currentUser,
  users = {},
  questions = [],
  solutions = [],
  chatMessages = [],
  onOpenProfile,
  onOpenAskModal,
  className = '',
}) => {
  const [period, setPeriod] = useState<Period>('week');

  const members = useMemo(
    () => computeMembers(users, questions, solutions, chatMessages, period),
    [users, questions, solutions, chatMessages, period],
  );

  const top = members.slice(0, 8);
  const currentUserKey = currentUser ? currentUser.email.toLowerCase() : '';
  const meEntry = members.find((m) => m.key === currentUserKey);

  return (
    <aside className={`space-y-4 ${className}`} aria-label="Bảng xếp hạng và đặt câu hỏi">
      {/* Real leaderboard */}
      <div className="rounded-3xl bg-[#0c1218]/90 backdrop-blur-2xl border border-white/15 p-4 shadow-xl flex flex-col gap-3.5 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[3px] ff-aurora-bar opacity-80" aria-hidden="true" />

        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 font-extrabold text-xs sm:text-sm tracking-wider uppercase">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="ff-aurora-text">Bảng xếp hạng</span>
          </div>
          <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-amber-400/70 to-transparent mt-1 rounded-full" />
        </div>

        {/* Period filter */}
        <div className="flex justify-center">
          <div className="inline-flex items-center bg-black/50 border border-white/10 rounded-full p-1 gap-0.5">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                  period === p
                    ? 'bg-gradient-to-r from-amber-500 to-orange-400 text-neutral-950 shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-1.5">
          {top.length === 0 && (
            <div className="py-8 text-center space-y-1.5">
              <Medal className="w-6 h-6 text-white/20 mx-auto" />
              <p className="text-xs text-neutral-400">Chưa có dữ liệu trong kỳ này.</p>
              <p className="text-[10px] text-neutral-500">
                Hỏi đáp, trả lời và thảo luận để trở thành người dẫn đầu!
              </p>
            </div>
          )}

          {top.map((member, index) => {
            const medal = RANK_STYLES[member.rank];
            return (
              <button
                key={member.key}
                type="button"
                style={{ '--i': index } as React.CSSProperties}
                onClick={() =>
                  onOpenProfile?.({
                    id: member.id,
                    name: member.name,
                    avatar: member.avatar,
                    email: member.email,
                    level: member.level,
                  })
                }
                className={`ac-01__card w-full p-2 rounded-2xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer group text-left ${
                  medal
                    ? `bg-gradient-to-r ${medal}`
                    : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/20'
                }`}
                title={`Xem hồ sơ của ${member.name}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-5 text-center text-xs font-black font-mono shrink-0 ${member.rank <= 3 ? '' : 'text-neutral-400'}`}>
                    {member.rank}
                  </span>

                  <div className="relative shrink-0">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                      loading="lazy"
                      decoding="async"
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover border border-white/20 group-hover:scale-105 transition-transform"
                    />
                    {member.rank === 1 && (
                      <span className="absolute -top-1.5 -right-1 text-[11px]">👑</span>
                    )}
                  </div>

                  <span className="text-xs font-semibold text-neutral-200 group-hover:text-white truncate">
                    {member.name}
                  </span>
                </div>

                <div className="text-xs font-bold font-mono text-white shrink-0">
                  {member.points.toLocaleString()} <span className="text-[10px] font-normal text-neutral-400">điểm</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Current user pin */}
        {currentUser && (
          <button
            type="button"
            onClick={() => {
              onOpenProfile?.({
                id: currentUser.id,
                name: currentUser.name,
                avatar: currentUser.avatar,
                email: currentUser.email,
                level: currentUser.level,
              });
            }}
            className="mt-1 w-full p-2.5 rounded-2xl bg-[#0284C7]/15 border border-[#0284C7]/40 flex items-center justify-between gap-2.5 cursor-pointer transition-all hover:bg-[#0284C7]/25 shadow-sm text-left"
            title="Vị trí của bạn"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-[11px] font-bold font-mono text-[#0284C7] shrink-0">
                {meEntry ? `#${meEntry.rank}` : 'Bạn'}:
              </span>
              <div className="relative shrink-0">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                  loading="lazy"
                  decoding="async"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover border-2 border-[#0284C7] shadow-sm"
                />
              </div>
              <span className="text-xs font-bold text-[#0284C7] truncate">
                {currentUser.name}
              </span>
            </div>

            <div className="text-xs font-bold font-mono text-[#0284C7] shrink-0">
              {(meEntry?.points ?? 0).toLocaleString()} <span className="text-[10px] font-normal">điểm</span>
            </div>
          </button>
        )}

        <div className="pt-1 flex justify-end">
          <button
            type="button"
            onClick={() => setPeriod('all')}
            className="text-xs text-[#0284C7] hover:text-sky-300 font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Toàn thời gian</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Ask CTA */}
      <div className="rounded-3xl bg-[#0c1218]/90 backdrop-blur-2xl border border-amber-400/30 p-5 shadow-xl flex flex-col items-center text-center gap-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-orange-500/10 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-center gap-1.5 text-amber-400 font-bold text-xs uppercase font-mono tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Cần trợ giúp bài tập?</span>
        </div>

        <h3 className="relative z-10 text-sm sm:text-base font-extrabold text-white tracking-tight">
          Bạn muốn hỏi điều gì?
        </h3>
        <p className="relative z-10 text-xs text-neutral-300 max-w-xs leading-relaxed">
          Đăng bài tập toán, lý, hóa, văn, ngoại ngữ hay lập trình để nhận giải đáp từ cộng đồng.
        </p>

        <MagneticButton
          variant="gold"
          onClick={onOpenAskModal}
          className="relative z-10 w-full py-3 px-6 rounded-2xl !bg-gradient-to-r !from-[#EAB308] !to-[#F59E0B] text-neutral-950 font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_6px_25px_rgba(234,179,8,0.4)] hover:shadow-[0_8px_30px_rgba(234,179,8,0.6)] cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-neutral-950" />
          <span>Đặt câu hỏi</span>
        </MagneticButton>
      </div>
    </aside>
  );
};

export default LeaderboardWidget;
