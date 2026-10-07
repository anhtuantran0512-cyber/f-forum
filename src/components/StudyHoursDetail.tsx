/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useMemo } from 'react';
import {
  BarChart3,
  CalendarRange,
  Clock,
  Flame,
  Target,
  Trash2,
  Timer,
  Trophy,
  History,
} from 'lucide-react';
import {
  computeStudyStats,
  formatDuration,
  recentStudySessions,
  removeStudySession,
  STUDY_SOURCE_LABELS,
  studyDaySeries,
  type StudySession,
} from '../utils/studyLog';

/**
 * "Chi tiết giờ học" — bảng phân tích nhật ký học tập.
 * Trả lời được: học bao nhiêu, học những ngày nào, phiên nào, dài ngắn ra sao.
 * Toàn bộ số liệu đọc từ nhật ký thật (không ước lượng, không làm tròn ảo).
 */
interface StudyHoursDetailProps {
  sessions: StudySession[];
  onOpenFocusMode?: () => void;
}

export const StudyHoursDetail: React.FC<StudyHoursDetailProps> = ({ sessions, onOpenFocusMode }) => {
  const stats = useMemo(() => computeStudyStats(sessions), [sessions]);
  const days = useMemo(() => studyDaySeries(sessions, 7), [sessions]);
  const recent = useMemo(() => recentStudySessions(sessions, 6), [sessions]);

  const handleRemove = (id: string, label: string) => {
    if (!window.confirm(`Xoá phiên học ${label} khỏi nhật ký? Số giờ tương ứng sẽ được trừ lại.`)) return;
    removeStudySession(id);
  };

  const tiles = [
    {
      id: 'total',
      label: 'Tổng đã ghi',
      value: `${(stats.totalMinutes / 60).toFixed(1)} giờ`,
      hint: `${stats.sessionCount} phiên`,
      icon: <Clock className="w-3.5 h-3.5" />,
      tone: 'text-cyan-300',
    },
    {
      id: 'avg',
      label: 'Trung bình / ngày học',
      value: formatDuration(stats.avgMinutesPerActiveDay),
      hint: `${stats.activeDays} ngày có học`,
      icon: <BarChart3 className="w-3.5 h-3.5" />,
      tone: 'text-emerald-300',
    },
    {
      id: 'best',
      label: 'Ngày học nhiều nhất',
      value: formatDuration(stats.bestDayMinutes),
      hint: stats.bestDayMinutes > 0 ? `Ngày ${stats.bestDayLabel}` : 'chưa có dữ liệu',
      icon: <Trophy className="w-3.5 h-3.5" />,
      tone: 'text-amber-300',
    },
    {
      id: 'longest',
      label: 'Phiên dài nhất',
      value: formatDuration(stats.longestSessionMinutes),
      hint: 'mỗi phiên tối đa 25 phút',
      icon: <Timer className="w-3.5 h-3.5" />,
      tone: 'text-sky-300',
    },
  ];

  return (
    <div className="ff-hours" aria-label="Chi tiết giờ học">
      <div className="ff-hours__head">
        <span className="ff-hours__crest" aria-hidden="true">
          <CalendarRange className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="ff-hours__title">Chi tiết giờ học</h4>
          <p className="ff-hours__sub">Số liệu thật từ nhật ký Phòng Tập Trung</p>
        </div>
        <span className="ff-hours__chip inline-flex items-center gap-1">
          <Flame className="w-3 h-3 text-rose-300" />
          {stats.sessionCount} phiên
        </span>
      </div>

      {/* Biểu đồ 7 ngày gần nhất */}
      <div className="ff-hours__chart" role="img" aria-label="Số phút học 7 ngày gần nhất">
        {days.map((d) => (
          <div
            key={d.key}
            className={`ff-hours__col ${d.isToday ? 'is-today' : ''} ${d.minutes > 0 ? 'has-data' : ''}`}
            title={`${d.label} ${d.dateLabel}: ${d.minutes > 0 ? formatDuration(d.minutes) : 'chưa học'}`}
          >
            <span className="ff-hours__value font-mono">{d.minutes > 0 ? d.minutes : ''}</span>
            <span className="ff-hours__bar" style={{ height: `${d.heightPercent}%` }} />
            <span className="ff-hours__day">{d.label}</span>
          </div>
        ))}
      </div>

      <dl className="ff-hours__grid">
        {tiles.map((t) => (
          <div key={t.id}>
            <dt className={t.tone}>
              {t.icon}
              {t.label}
            </dt>
            <dd>{t.value}</dd>
            <small>{t.hint}</small>
          </div>
        ))}
      </dl>

      {/* Danh sách phiên gần đây */}
      {recent.length > 0 ? (
        <div className="ff-hours__recent">
          <span className="ff-hours__recent-label inline-flex items-center gap-1.5">
            <History className="w-3 h-3" /> Phiên gần đây
          </span>
          <ul>
            {recent.map((s) => (
              <li key={s.id}>
                <span className="ff-hours__dot" aria-hidden="true" />
                <span className="ff-hours__when">
                  <b>{s.dayLabel}</b>
                  <small>{s.clock}</small>
                </span>
                <span className="ff-hours__source">{STUDY_SOURCE_LABELS[s.source] || s.source}</span>
                <span className="ff-hours__minutes font-mono">{s.minutes}′</span>
                <button
                  type="button"
                  className="ff-hours__del"
                  onClick={() => handleRemove(s.id, `${s.minutes} phút ngày ${s.dayLabel}`)}
                  title="Xoá phiên ghi nhầm"
                  aria-label={`Xoá phiên ${s.minutes} phút lúc ${s.clock} ${s.dayLabel}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
          <p className="ff-hours__note">
            Nhật ký chỉ ghi tự động từ phiên Pomodoro — nút thùng rác dùng khi phiên bị ghi nhầm.
          </p>
        </div>
      ) : (
        <div className="ff-hours__empty">
          <Target className="w-5 h-5 text-white/25 mx-auto" />
          <p>Chưa có phiên học nào trong nhật ký.</p>
          {onOpenFocusMode && (
            <button type="button" onClick={onOpenFocusMode} className="ff-hours__cta">
              Bắt đầu phiên 25 phút đầu tiên
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default StudyHoursDetail;
