/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { useEffect, useState, type CSSProperties } from 'react';
import { Flame } from 'lucide-react';
import { formatCountdown, msUntilNextDay, streakFlameLevel, streakUrgency } from '../../utils/streakWindow';
import './StreakCountdown.css';

interface StreakCountdownProps {
  streak: number;
  claimedToday: boolean;
}

const COPY = {
  done: 'Đã giữ lửa hôm nay · lượt mới mở sau',
  safe: 'Điểm danh trước 0h để giữ chuỗi · còn',
  warn: 'Lửa đang yếu dần · còn',
  critical: 'Sắp mất chuỗi! Chỉ còn',
} as const;

/**
 * Đếm ngược tới 0h (giờ Việt Nam) — mốc chuỗi điểm danh bị reset.
 * Ngọn lửa mờ và nhỏ lại khi cửa sổ trong ngày khép dần (code_yeucau · cdt-16).
 */
export function StreakCountdown({ streak, claimedToday }: StreakCountdownProps) {
  const [msLeft, setMsLeft] = useState(() => msUntilNextDay());

  useEffect(() => {
    const tick = () => setMsLeft(msUntilNextDay());
    const id = window.setInterval(tick, 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const urgency = streakUrgency(msLeft, claimedToday);
  const level = claimedToday ? 1 : streakFlameLevel(msLeft);
  const style = { '--flame': level.toFixed(3) } as CSSProperties;

  return (
    <div className="ff-streak-cd" data-urgency={urgency} style={style}>
      <span className="ff-streak-cd__flame" aria-hidden="true">
        <Flame className="w-5 h-5" />
      </span>
      <div className="ff-streak-cd__body">
        <p className="ff-streak-cd__title">
          Chuỗi <b>{streak}</b> ngày
        </p>
        <p className="ff-streak-cd__copy">
          {COPY[urgency]}{' '}
          <time className="ff-streak-cd__time" dateTime={`PT${Math.floor(msLeft / 1000)}S`}>
            {formatCountdown(msLeft)}
          </time>
        </p>
      </div>
      <span className="ff-streak-cd__meter" aria-hidden="true">
        <span className="ff-streak-cd__meter-fill" />
      </span>
    </div>
  );
}

export default StreakCountdown;
