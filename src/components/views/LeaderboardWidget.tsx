/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useMemo, useState } from 'react';
import { Trophy, ArrowRight, HelpCircle, Sparkles, Medal, Clock, Crown, Minus, Flame } from 'lucide-react';
import type { User, Question, Solution, ChatMessage } from '../../types';
import { DEFAULT_AVATAR, handleImageError } from '../../utils/mediaFallback';
import { MagneticButton } from '../MagneticButton';
import { OdometerDigits } from '../OdometerDigits';
import { StudyPulsePanel } from '../StudyPulsePanel';
import {
  buildStudyLeaderboard,
  computeStudyTotals,
  periodMinutes,
  readDailyTargetMinutes,
  readStudySessions,
  readWeeklyGoalMinutes,
  type StudySession,
  type StudyTotals,
} from '../../utils/studyLog';

type Period = 'week' | 'month' | 'year' | 'all';
type Metric = 'points' | 'hours';

interface LeaderboardMember {
  key: string;
  id: string;
  name: string;
  avatar: string;
  points: number;
  minutes: number;
  level: number;
  email?: string;
  rank: number;
  isYou?: boolean;
  estimated?: boolean;
}

interface LeaderboardWidgetProps {
  currentUser: User | null;
  users?: Record<string, User>;
  questions?: Question[];
  solutions?: Solution[];
  chatMessages?: ChatMessage[];
  onOpenProfile?: (user: { id: string; name: string; avatar: string; email?: string; level?: number }) => void;
  onOpenAskModal: () => void;
  onOpenFocusMode?: () => void;
  className?: string;
}

const PERIOD_LABELS: Record<Period, string> = {
  week: 'Tuần',
  month: 'Tháng',
  year: 'Năm',
  all: 'Toàn thời gian',
};

const METRIC_LABELS: Record<Metric, string> = {
  points: 'Điểm đóng góp',
  hours: 'Giờ học',
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
      minutes: 0,
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

const buildHoursMembers = (
  users: Record<string, User>,
  sessions: StudySession[],
  period: Period,
  currentUserEmail?: string | null,
): LeaderboardMember[] =>
  buildStudyLeaderboard(users, sessions, period, currentUserEmail).map((m, i) => ({
    key: m.key,
    id: m.id,
    name: m.name,
    avatar: m.avatar,
    email: m.email,
    level: m.level,
    minutes: m.minutes,
    points: 0,
    rank: i + 1,
    isYou: m.isYou,
    estimated: m.estimated,
  }));

const RANK_MEDAL = ['🥇', '🥈', '🥉'];

export const LeaderboardWidget: React.FC<LeaderboardWidgetProps> = ({
  currentUser,
  users = {},
  questions = [],
  solutions = [],
  chatMessages = [],
  onOpenProfile,
  onOpenAskModal,
  onOpenFocusMode,
  className = '',
}) => {
  const [period, setPeriod] = useState<Period>('week');
  const [metric, setMetric] = useState<Metric>('points');
  const [sessions, setSessions] = useState<StudySession[]>(() => readStudySessions());
  const [weeklyGoal, setWeeklyGoal] = useState<number>(() => readWeeklyGoalMinutes());
  const [dailyTarget, setDailyTarget] = useState<number>(() => readDailyTargetMinutes());

  /* Nhật ký giờ học cập nhật realtime khi Focus Sanctuary ghi phiên mới */
  useEffect(() => {
    const sync = () => {
      setSessions(readStudySessions());
      setWeeklyGoal(readWeeklyGoalMinutes());
      setDailyTarget(readDailyTargetMinutes());
    };
    window.addEventListener('fforum_study_sync', sync);
    window.addEventListener('fforum_coin_sync', sync);
    return () => {
      window.removeEventListener('fforum_study_sync', sync);
      window.removeEventListener('fforum_coin_sync', sync);
    };
  }, []);

  const totals: StudyTotals = useMemo(() => computeStudyTotals(sessions), [sessions]);

  const pointsMembers = useMemo(
    () => computeMembers(users, questions, solutions, chatMessages, period),
    [users, questions, solutions, chatMessages, period],
  );

  const hoursMembers = useMemo(
    () => buildHoursMembers(users, sessions, period, currentUser?.email),
    [users, sessions, period, currentUser?.email],
  );

  const members = metric === 'points' ? pointsMembers : hoursMembers;
  const top = members.slice(0, 8);
  const currentUserKey = currentUser ? currentUser.email.toLowerCase() : '';
  const meEntry = members.find((m) => m.key === currentUserKey);
  const maxValue = members.length > 0 ? Math.max(members[0].points, members[0].minutes) : 1;

  const myPeriodMinutes = currentUser ? periodMinutes(totals, period) : periodMinutes(totals, period);

  const formatValue = (m: LeaderboardMember) =>
    metric === 'hours' ? `${(m.minutes / 60).toFixed(1)} giờ` : `${m.points.toLocaleString()} điểm`;

  const progressOf = (m: LeaderboardMember) => {
    const value = metric === 'hours' ? m.minutes : m.points;
    return Math.max(4, Math.round((value / Math.max(1, maxValue)) * 100));
  };

  const openProfile = (m: LeaderboardMember) =>
    onOpenProfile?.({ id: m.id, name: m.name, avatar: m.avatar, email: m.email, level: m.level });

  const podium = top.slice(0, 3);
  const list = top.slice(3);

  return (
    <aside className={`space-y-4 ${className}`} aria-label="Bảng xếp hạng và đặt câu hỏi">
      <div className="ff-board">
        <div className="ff-board__topline" aria-hidden="true" />

        {/* Header */}
        <div className="ff-board__head">
          <span className="ff-board__crest" aria-hidden="true">
            <Trophy className="w-[18px] h-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="ff-board__title">Bảng xếp hạng</h3>
            <p className="ff-board__sub">
              {metric === 'hours' ? 'Ai học nhiều nhất kỳ này' : 'Ai đóng góp nhiều nhất kỳ này'}
            </p>
          </div>
          {meEntry && (
            <span className="ff-board__you-badge">#{meEntry.rank}</span>
          )}
        </div>

        {/* Metric switch */}
        <div role="tablist" aria-label="Chọn bảng xếp hạng" className="ff-board__switch">
          {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={metric === m}
              onClick={() => setMetric(m)}
              className={`ff-board__switch-btn ${metric === m ? 'is-active' : ''}`}
            >
              {m === 'points' ? <Sparkles className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              {METRIC_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Period filter */}
        <div className="ff-board__periods" role="group" aria-label="Chọn khoảng thời gian">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              aria-pressed={period === p}
              className={`ff-board__period-btn ${period === p ? 'is-active' : ''}`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Tổng của bạn bằng đồng hồ cơ */}
        <div className="ff-board__total">
          <div className="min-w-0">
            <p className="ff-board__total-label">
              {metric === 'hours' ? `Giờ học của bạn · ${PERIOD_LABELS[period]}` : `Điểm của bạn · ${PERIOD_LABELS[period]}`}
            </p>
            <OdometerDigits
              value={metric === 'hours' ? myPeriodMinutes / 60 : meEntry?.points ?? 0}
              decimals={metric === 'hours' ? 1 : 0}
              unit={metric === 'hours' ? 'giờ' : 'điểm'}
              size="md"
              ariaLabel={
                metric === 'hours'
                  ? `${(myPeriodMinutes / 60).toFixed(1)} giờ học`
                  : `${meEntry?.points ?? 0} điểm`
              }
            />
          </div>
          <div className="ff-board__total-side">
            <span className="ff-board__total-chip inline-flex items-center gap-1">
              <Flame className="w-3 h-3 text-rose-300" />
              {totals.streakDays} ngày liên tiếp
            </span>
            <span className="ff-board__total-chip inline-flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-300" />
              Hôm nay {totals.todayMinutes}′
            </span>
          </div>
        </div>

        {/* Podium */}
        {podium.length > 0 ? (
          <div className="ff-podium" aria-label="Ba vị trí dẫn đầu">
            {[1, 0, 2].map((slot) => {
              const m = podium[slot];
              if (!m) return <span key={`empty-${slot}`} className="ff-podium__empty" aria-hidden="true" />;
              const place = slot + 1;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => openProfile(m)}
                  className={`ff-podium__slot ff-podium__slot--${place} group`}
                  title={`Xem hồ sơ của ${m.name}`}
                >
                  <span className="ff-podium__medal" aria-hidden="true">
                    {RANK_MEDAL[slot]}
                  </span>
                  <span className="ff-podium__avatar-wrap">
                    <img
                      src={m.avatar || DEFAULT_AVATAR}
                      alt={m.name}
                      onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                      loading="lazy"
                      decoding="async"
                      width={place === 1 ? 60 : 50}
                      height={place === 1 ? 60 : 50}
                      className="ff-podium__avatar"
                    />
                    {place === 1 && (
                      <Crown className="ff-podium__crown" aria-hidden="true" />
                    )}
                  </span>
                  <span className="ff-podium__name">{m.name}</span>
                  <span className="ff-podium__value font-mono">{formatValue(m)}</span>
                  <span className="ff-podium__plinth" aria-hidden="true">
                    <i style={{ height: `${place === 1 ? 58 : place === 2 ? 40 : 30}px` }} />
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="ff-board__empty">
            <Medal className="w-6 h-6 text-white/20 mx-auto" />
            <p className="text-xs text-neutral-300 mt-2">Chưa có dữ liệu trong kỳ này.</p>
            <p className="text-[10px] text-neutral-500 mt-1">
              {metric === 'hours'
                ? 'Hoàn thành một phiên Pomodoro 25 phút để mở bảng xếp hạng giờ học!'
                : 'Hỏi đáp, trả lời và thảo luận để trở thành người dẫn đầu!'}
            </p>
          </div>
        )}

        {/* Danh sách các hạng tiếp theo */}
        {list.length > 0 && (
          <ol className="ff-board__list">
            {list.map((m) => (
              <li key={m.key}>
                <button
                  type="button"
                  onClick={() => openProfile(m)}
                  className={`ff-row ${m.isYou ? 'ff-row--you' : ''}`}
                  title={`Xem hồ sơ của ${m.name}`}
                >
                  <span className="ff-row__rank font-mono">{m.rank}</span>
                  <img
                    src={m.avatar || DEFAULT_AVATAR}
                    alt={m.name}
                    onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                    loading="lazy"
                    decoding="async"
                    width={30}
                    height={30}
                    className="ff-row__avatar"
                  />
                  <span className="ff-row__body">
                    <span className="ff-row__name">
                      {m.name}
                      {m.isYou && <em className="ff-row__you">Bạn</em>}
                    </span>
                    <span className="ff-row__track" aria-hidden="true">
                      <i style={{ width: `${progressOf(m)}%` }} />
                    </span>
                  </span>
                  <span className="ff-row__value font-mono">{formatValue(m)}</span>
                </button>
              </li>
            ))}
          </ol>
        )}

        {metric === 'hours' && list.length === 0 && podium.length > 0 && (
          <p className="ff-board__micro">
            <Minus className="w-3 h-3" /> Chưa có thêm thành viên nào khác trong kỳ này.
          </p>
        )}

        {/* Vị trí của bạn */}
        {currentUser && meEntry && (
          <button type="button" onClick={() => openProfile(meEntry)} className="ff-board__me">
            <span className="ff-board__me-rank font-mono">#{meEntry.rank}</span>
            <img
              src={currentUser.avatar || DEFAULT_AVATAR}
              alt={currentUser.name}
              onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-sky-400/70"
            />
            <span className="ff-board__me-name truncate">{currentUser.name}</span>
            <span className="ff-board__me-value font-mono">{formatValue(meEntry)}</span>
          </button>
        )}

        {metric === 'hours' && (
          <p className="ff-board__note">
            Số giờ của bạn lấy từ nhật ký Phòng Tập Trung (mỗi phiên 25 phút); thành viên khác được quy đổi từ XP tích luỹ.
          </p>
        )}

        <div className="pt-0.5 flex justify-end">
          <button
            type="button"
            onClick={() => setPeriod('all')}
            className="text-xs text-[#38bdf8] hover:text-sky-300 font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Toàn thời gian</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bảng nhịp học tập: chỉ số tuần/tháng + ghi nhanh giờ học */}
      <StudyPulsePanel
        totals={totals}
        weeklyGoalMinutes={weeklyGoal}
        dailyTargetMinutes={dailyTarget}
        onOpenFocusMode={onOpenFocusMode}
      />

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
