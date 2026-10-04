/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import { Heart, Target, Timer, Flame, CalendarDays, TrendingUp } from 'lucide-react';
import { OdometerDigits } from './OdometerDigits';
import { formatDuration, type StudyTotals } from '../utils/studyLog';

/**
 * CodeFronts cnc-21 — Health Metrics & Heart Rate Animated Display
 * ---------------------------------------------------------------------------
 * Bảng "nhịp học tập": nhịp tim, đường ECG và vệt quét đều đập theo ĐÚNG cường
 * độ học hôm nay (animation-duration tính từ số phút thật), nên hình ảnh không
 * nói dối về dữ liệu. Kèm thước đo tiến độ tuần và lưới chỉ số.
 * Giờ học chỉ được ghi TỰ ĐỘNG từ phiên Phòng Tập Trung, không cộng tay.
 */
export interface StudyPulsePanelProps {
  totals: StudyTotals;
  weeklyGoalMinutes: number;
  dailyTargetMinutes: number;
  onOpenFocusMode?: () => void;
}

const ECG_PATH =
  'M0 60 H18 l5 -8 l5 16 l5 -8 H40 l4 -32 l5 58 l5 -32 H70 l7 -13 l7 13 H100';

export const StudyPulsePanel: React.FC<StudyPulsePanelProps> = ({
  totals,
  weeklyGoalMinutes,
  dailyTargetMinutes,
  onOpenFocusMode,
}) => {
  /* Nhịp đập suy ra từ số phút học hôm nay: 56 bpm (nghỉ) → 148 bpm (học căng) */
  const todayRatio = Math.min(1, totals.todayMinutes / Math.max(1, dailyTargetMinutes));
  const pulse = Math.round(58 + todayRatio * 78);
  const sweepSeconds = Math.max(1.1, 6 - todayRatio * 4.4);

  const goalProgress = Math.min(1, totals.weekMinutes / Math.max(1, weeklyGoalMinutes));
  const markerPercent = Math.max(3, Math.min(97, goalProgress * 100));
  const goalHours = (weeklyGoalMinutes / 60).toFixed(weeklyGoalMinutes % 60 === 0 ? 0 : 1);
  const weekHours = totals.weekMinutes / 60;

  const statItems: { id: string; label: string; value: string; icon: React.ReactNode; accent: string }[] = [
    {
      id: 'today',
      label: 'Hôm nay',
      value: formatDuration(totals.todayMinutes),
      icon: <Timer className="w-3.5 h-3.5" />,
      accent: 'text-emerald-300',
    },
    {
      id: 'week',
      label: 'Tuần này',
      value: `${weekHours.toFixed(1)} giờ`,
      icon: <CalendarDays className="w-3.5 h-3.5" />,
      accent: 'text-amber-300',
    },
    {
      id: 'month',
      label: 'Tháng này',
      value: `${(totals.monthMinutes / 60).toFixed(1)} giờ`,
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      accent: 'text-cyan-300',
    },
    {
      id: 'streak',
      label: 'Chuỗi ngày học',
      value: `${totals.streakDays} ngày`,
      icon: <Flame className="w-3.5 h-3.5" />,
      accent: 'text-rose-300',
    },
  ];

  return (
    <div
      className="ff-pulse"
      style={{ ['--ff-pulse' as string]: pulse } as React.CSSProperties}
      aria-label="Bảng nhịp học tập"
    >
      <div className="ff-pulse__head">
        <div className="min-w-0">
          <p className="ff-pulse__eyebrow">Nhịp học tập · dữ liệu thật</p>
          <h4 className="ff-pulse__title">Tiến độ tuần của bạn</h4>
        </div>
        <span className="ff-pulse__badge">
          <i aria-hidden="true" />
          Đang ghi nhận
        </span>
      </div>

      <div className="ff-pulse__hero">
        <span className="ff-pulse__heart" aria-hidden="true">
          <Heart className="w-7 h-7" />
        </span>

        <p className="ff-pulse__bpm">
          <OdometerDigits
            value={weekHours}
            decimals={1}
            size="lg"
            unit="giờ / tuần"
            ariaLabel={`${weekHours.toFixed(1)} giờ học trong tuần này`}
          />
        </p>

        <p className="ff-pulse__zone">
          Mục tiêu
          <b>{goalHours} giờ</b>
          <span>{Math.round(goalProgress * 100)}% hoàn thành</span>
        </p>
      </div>

      {/* Đường ECG: vệt quét chạy nhanh/chậm theo cường độ học hôm nay */}
      <div className="ff-pulse__ecg" aria-hidden="true">
        <svg viewBox="0 0 600 120" preserveAspectRatio="none">
          <defs>
            <path
              id="ff-pulse-beat"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              d={ECG_PATH}
            />
          </defs>
          <g className="ff-pulse__trace">
            {[0, 100, 200, 300, 400, 500].map((x) => (
              <use key={x} href="#ff-pulse-beat" x={x} />
            ))}
          </g>
        </svg>
        <span className="ff-pulse__sweep" style={{ animationDuration: `${sweepSeconds}s` }} />
      </div>

      {/* Thước đo tiến độ tuần */}
      <div className="ff-pulse__zones" aria-hidden="true">
        <span data-z="1" />
        <span data-z="2" />
        <span data-z="3" />
        <span data-z="4" />
        <i className="ff-pulse__marker" style={{ left: `${markerPercent}%` }} />
      </div>
      <div className="ff-pulse__zone-labels" aria-hidden="true">
        <span>Khởi động</span>
        <span>Đều đặn</span>
        <span>Bứt tốc</span>
        <span>Về đích</span>
      </div>

      <dl className="ff-pulse__grid">
        {statItems.map((item) => (
          <div key={item.id}>
            <dt>
              <span className={item.accent}>{item.icon}</span>
              {item.label}
            </dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>

      {/* Giờ học chỉ ghi tự động từ Phòng Tập Trung — không cộng tay */}
      {onOpenFocusMode && (
        <button type="button" onClick={onOpenFocusMode} className="ff-pulse__focus-btn">
          <Target className="w-3.5 h-3.5" />
          Vào Phòng Tập Trung để ghi giờ
        </button>
      )}
      <p className="ff-pulse__hint">
        Giờ học được ghi tự động sau mỗi phiên Pomodoro 25 phút — không cần bấm gì thêm. Dừng sớm vẫn ghi
        số phút thực học (từ 5 phút), nhưng chỉ phiên đủ 25 phút mới có XP.
      </p>
    </div>
  );
};

export default StudyPulsePanel;
