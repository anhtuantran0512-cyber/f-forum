/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Trophy, ArrowRight, HelpCircle, Sparkles, Medal, Clock, Crown, Minus, Flame } from 'lucide-react';
import type { User, Question, Solution, ChatMessage } from '../../types';
import { DecoratedAvatar, DecoratedName, UserNameplateBg } from '../decorations/DecoratedAvatar';
import { MagneticButton } from '../MagneticButton';
import { OdometerDigits } from '../OdometerDigits';
import { StudyPulsePanel } from '../StudyPulsePanel';
import { StudyHoursDetail } from '../StudyHoursDetail';
import {
  buildStudyLeaderboard,
  computeStudyTotals,
  estimateMinutesFromXp,
  periodMinutes,
  readDailyTargetMinutes,
  readStudySessions,
  readWeeklyGoalMinutes,
  saveWeeklyGoalMinutes,
  sessionsForOwner,
  type StudySession,
  type StudyTotals,
} from '../../utils/studyLog';

type Period = 'day' | 'week' | 'month' | 'year' | 'all';
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
  /** Chỉ ở bảng giờ học: số phút quy đổi từ XP của tài khoản (chưa có phiên thật) */
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
  day: 'Hôm nay',
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
  if (period === 'day') {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
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
  currentUserEmail?: string | null,
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

  /* Điểm toàn thời gian = XP thật tích luỹ của từng tài khoản */
  if (period === 'all') {
    Object.entries(users).forEach(([email, u]) => {
      bump(email, u.xp || 0);
    });
  } else {
    /* Đảm bảo tiến độ Tuần / Ngày / Tháng / Năm ghi nhận cả nhịp hoạt động tích lũy + chuỗi ngày học của tài khoản thật */
    const periodShare = period === 'day' ? 0.04 : period === 'week' ? 0.2 : period === 'month' ? 0.5 : 0.85;
    Object.entries(users).forEach(([email, u]) => {
      const basePoints = Math.round((u.xp || 0) * periodShare) + (u.streakCount || 0) * (period === 'week' ? 15 : 5);
      if (basePoints > 0) bump(email, basePoints);
    });
  }

  const mine = currentUserEmail ? currentUserEmail.toLowerCase() : '';
  const members: LeaderboardMember[] = [];
  scores.forEach((points, emailKey) => {
    const u = users[emailKey];
    if (!u) return;
    const isYou = Boolean(mine) && emailKey === mine;
    if (points <= 0 && !isYou) return;
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
      isYou,
    });
  });

  /* Bạn luôn có mặt trên bảng — kể cả khi chưa có điểm nào — để thấy đúng hạng */
  if (mine && !members.some((m) => m.key === mine)) {
    const u = users[mine];
    members.push({
      key: mine,
      id: u?.id || 'me',
      name: u?.name || 'Bạn',
      avatar: u?.avatar || '',
      email: u?.email || mine,
      level: u?.level || 1,
      minutes: 0,
      points: 0,
      rank: 0,
      isYou: true,
    });
  }

  /* Điểm bằng nhau → xếp theo tên để thứ hạng luôn ổn định, không nhảy loạn */
  members.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'vi'));
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
/** Số thành viên tối đa hiển thị trên bảng */
const MAX_BOARD_ROWS = 100;

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
  /* Nhiệm vụ 10 — resolve user record (inventory + equippedDecorations) của thành viên. */
  const ownerOf = useCallback((m: LeaderboardMember): User | null => {
    if (m.email) {
      const byEmail = users[m.email.toLowerCase()];
      if (byEmail) return byEmail;
    }
    for (const u of Object.values(users)) {
      if (u.id === m.id) return u;
    }
    return null;
  }, [users]);
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

  /* Chỉ số cá nhân chỉ tính phiên của tài khoản đang đăng nhập */
  const mySessions = useMemo(() => sessionsForOwner(sessions, currentUser?.email), [sessions, currentUser?.email]);
  const rawTotals: StudyTotals = useMemo(() => computeStudyTotals(mySessions), [mySessions]);
  const totals: StudyTotals = useMemo(() => {
    if (!currentUser) return rawTotals;
    const emailKey = currentUser.email.toLowerCase();
    const xp = currentUser.xp || 0;
    const estDay = estimateMinutesFromXp(emailKey, xp, 'day');
    const estWeek = estimateMinutesFromXp(emailKey, xp, 'week');
    const estMonth = estimateMinutesFromXp(emailKey, xp, 'month');
    const estYear = estimateMinutesFromXp(emailKey, xp, 'year');
    const estAll = estimateMinutesFromXp(emailKey, xp, 'all');
    const todayMinutes = rawTotals.todayMinutes > 0 ? rawTotals.todayMinutes : estDay;
    const weekMinutes = rawTotals.weekMinutes > 0 ? rawTotals.weekMinutes : estWeek;
    const monthMinutes = rawTotals.monthMinutes > 0 ? rawTotals.monthMinutes : estMonth;
    const yearMinutes = rawTotals.yearMinutes > 0 ? rawTotals.yearMinutes : estYear;
    const allMinutes = rawTotals.allMinutes > 0 ? rawTotals.allMinutes : estAll;
    const streakDays = Math.max(rawTotals.streakDays, currentUser.streakCount || 0);
    const activeDaysThisWeek = Math.max(
      rawTotals.activeDaysThisWeek,
      currentUser.streakCount ? Math.min(7, currentUser.streakCount) : weekMinutes > 0 ? 1 : 0,
    );
    return {
      todayMinutes,
      weekMinutes,
      monthMinutes,
      yearMinutes,
      allMinutes,
      streakDays,
      activeDaysThisWeek,
      sessionCount: rawTotals.sessionCount,
    };
  }, [rawTotals, currentUser]);

  /* Danh bạ duy nhất: sổ đăng ký tài khoản thật (không còn dữ liệu mô phỏng) */
  const pointsMembers = useMemo(
    () => computeMembers(users, questions, solutions, chatMessages, period, currentUser?.email),
    [users, questions, solutions, chatMessages, period, currentUser?.email],
  );

  const hoursMembers = useMemo(
    () => buildHoursMembers(users, sessions, period, currentUser?.email),
    [users, sessions, period, currentUser?.email],
  );

  const members = metric === 'points' ? pointsMembers : hoursMembers;
  const boardRows = members.slice(0, MAX_BOARD_ROWS);
  const top = members.slice(0, 5);
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
  /* Bậc 4 & 5 nối tiếp bục 1-2-3 thành "thang rank" 5 bậc */
  const ladderSteps = top.slice(3, 5);
  const list = boardRows.slice(5);

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
            <h3 className="ff-board__title">THÀNH VIÊN HĂNG HÁI NHẤT</h3>
            <p className="ff-board__sub">
              {metric === 'hours' ? 'Ai học nhiều nhất kỳ này' : 'Ai đóng góp nhiều nhất kỳ này'}
              <span className="ff-board__count">
                {boardRows.length}/{members.length} thành viên
              </span>
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

        {/* Trạng thái khi trường mới chỉ có ít tài khoản thật */}
        {members.length <= 1 && (
          <p className="ff-board__micro">
            <Sparkles className="w-3 h-3" />
            {members.length === 0
              ? 'Bảng chỉ tính tài khoản thật — chưa có ai đăng ký. Hãy là người đầu tiên nhé!'
              : `Bảng chỉ tính tài khoản thật — hiện có ${members.length} người. Mời bạn bè đăng ký để cùng leo hạng!`}
          </p>
        )}

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
                    {/* Nhiệm vụ 10 — 58/46px + trang trí Discord (animation tắt). */}
                    <span className="ff-podium__deco">
                      <DecoratedAvatar
                        user={ownerOf(m)}
                        fallbackSrc={m.avatar}
                        size={place === 1 ? 58 : 46}
                        alt={m.name}
                        className="ff-podium__avatar"
                      />
                    </span>
                    {place === 1 && (
                      <Crown className="ff-podium__crown" aria-hidden="true" />
                    )}
                  </span>
                  <span className="ff-podium__name">
                    <DecoratedName
                      user={ownerOf(m)}
                      name={m.name.replace(/ \(.*\)/, '')}
                      width={136}
                      height={26}
                      animate
                      showFallbackTag
                    />
                  </span>
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

        {/* Thang rank: bậc 4 & 5 nối tiếp bục 1-2-3 */}
        {ladderSteps.length > 0 && (
          <div className="ff-ladder" aria-label="Các bậc tiếp theo của thang rank">
            {ladderSteps.map((m, i) => (
              <button
                key={m.key}
                type="button"
                onClick={() => openProfile(m)}
                title={`Xem hồ sơ của ${m.name}`}
                className={`ff-ladder__step ff-ladder__step--b${m.rank} ${m.isYou ? 'is-you' : ''}`}
              >
                <span className="ff-ladder__rank font-mono">{m.rank}</span>
                {/* Nhiệm vụ 10 — 40/36px + trang trí đồng bộ. */}
                <DecoratedAvatar
                  user={ownerOf(m)}
                  fallbackSrc={m.avatar}
                  size={i === 0 ? 40 : 36}
                  alt={m.name}
                  className="ff-ladder__avatar"
                />
                <span className="ff-ladder__body">
                  <span className="ff-ladder__name flex items-center gap-1.5">
                    <DecoratedName
                      user={ownerOf(m)}
                      name={m.name.replace(/ \(.*\)/, '')}
                      width={136}
                      height={26}
                      animate
                      showFallbackTag
                    />
                    {m.isYou && <em className="ff-row__you">Bạn</em>}
                  </span>
                  <span className="ff-ladder__track" aria-hidden="true">
                    <i style={{ width: `${progressOf(m)}%` }} />
                  </span>
                </span>
                <span className="ff-ladder__value font-mono">
                  {metric === 'hours' && m.estimated && (
                    <span className="ff-row__est" title="Quy đổi từ XP tích luỹ của tài khoản này">≈</span>
                  )}
                  {formatValue(m)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Danh sách các hạng tiếp theo — cuộn trong khung để trang không dài */}
        {list.length > 0 && (
          <div className="ff-board__scroll">
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
                  {/* Nhiệm vụ 10 — 30px + trang trí đồng bộ. */}
                  <DecoratedAvatar
                    user={ownerOf(m)}
                    fallbackSrc={m.avatar}
                    size={30}
                    alt={m.name}
                    className="ff-row__avatar"
                  />
                  <span className="ff-row__body">
                    <span className="ff-row__name flex items-center gap-1.5">
                      <DecoratedName
                        user={ownerOf(m)}
                        name={m.name.replace(/ \(.*\)/, '')}
                        width={136}
                        height={26}
                        animate
                        showFallbackTag
                      />
                      {m.isYou && <em className="ff-row__you">Bạn</em>}
                    </span>
                    <span className="ff-row__track" aria-hidden="true">
                      <i style={{ width: `${progressOf(m)}%` }} />
                    </span>
                  </span>
                  <span className="ff-row__value font-mono">
                    {metric === 'hours' && m.estimated && (
                      <span className="ff-row__est" title="Quy đổi từ XP tích luỹ của tài khoản này">≈</span>
                    )}
                    {formatValue(m)}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          </div>
        )}

        {list.length > 0 && (
          <p className="ff-board__micro">
            Bảng chỉ gồm tài khoản thật, xếp theo hoạt động thực tế (XP & giờ học).
          </p>
        )}

        {metric === 'hours' && list.length === 0 && podium.length > 0 && (
          <p className="ff-board__micro">
            <Minus className="w-3 h-3" /> Chưa có thêm thành viên trong kỳ này.
          </p>
        )}

        {/* Vị trí của bạn */}
        {currentUser && meEntry && (
          <button
            type="button"
            onClick={() => openProfile(meEntry)}
            className="ff-board__me ff-discord-userbar"
          >
            <UserNameplateBg
              user={currentUser}
              width={280}
              eager
              animate
              priority="high"
            />
            <span className="relative z-[2] ff-board__me-rank font-mono">#{meEntry.rank}</span>
            <span className="relative z-[2] shrink-0">
              <DecoratedAvatar
                user={currentUser}
                fallbackSrc={currentUser.avatar}
                size={34}
                eager
                animate
                alt={currentUser.name}
                className="rounded-full ring-2 ring-[#f2cc8f]/70"
              />
            </span>
            <span className="relative z-[2] ff-board__me-name flex items-center min-w-0">
              <DecoratedName
                user={currentUser}
                name={currentUser.name.replace(/ \(.*\)/, '')}
                width={144}
                height={27}
                eager
                animate
                priority="high"
                showFallbackTag
              />
            </span>
            <span className="relative z-[2] ff-board__me-value font-mono">{formatValue(meEntry)}</span>
          </button>
        )}

        <div className="pt-0.5 flex justify-end">
          <button
            type="button"
            onClick={() => setPeriod('all')}
            className="text-xs text-[#f2cc8f] hover:text-[#f4f1de] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Toàn thời gian</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bảng nhịp học tập: chỉ số tuần/tháng của bạn */}
      <StudyPulsePanel
        totals={totals}
        weeklyGoalMinutes={weeklyGoal}
        dailyTargetMinutes={dailyTarget}
        onOpenFocusMode={onOpenFocusMode}
        onAdjustWeeklyGoal={(nextMinutes) => setWeeklyGoal(saveWeeklyGoalMinutes(nextMinutes))}
      />

      {/* Chi tiết giờ học: biểu đồ 7 ngày, thống kê, danh sách phiên */}
      {metric === 'hours' && (
        <StudyHoursDetail sessions={mySessions} onOpenFocusMode={onOpenFocusMode} />
      )}

      {/* Ask CTA (Bento + Neo-Brutalist + Tactile Squishy) */}
      <div className="ff-bento-cell !p-4 flex flex-col items-start gap-2.5 relative overflow-hidden">
        <div className="flex items-center gap-1.5 text-[#f2cc8f] font-bold text-xs font-sans">
          <Sparkles className="w-3.5 h-3.5 text-[#e07a5f]" />
          <span>Bạn muốn hỏi điều gì?</span>
        </div>

        <p className="text-xs text-[#d8d5ce] leading-relaxed">
          Kẹt bài tập khó? Đăng câu hỏi kèm ảnh đề bài để cùng giải với mọi người.
        </p>

        <MagneticButton
          variant="gold"
          onClick={onOpenAskModal}
          className="ff-tactile-btn w-full py-2.5 px-4 rounded-xl !bg-[#e07a5f] hover:!bg-[#f2cc8f] text-[#0b0d12] font-extrabold text-xs border-[1.5px] border-[#f4f1de] cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-[#0b0d12]" />
          <span>Đặt câu hỏi</span>
        </MagneticButton>
      </div>
    </aside>
  );
};

export default LeaderboardWidget;
