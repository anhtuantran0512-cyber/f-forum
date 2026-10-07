import React from 'react';
import { ArrowUp } from 'lucide-react';
import { useScrollProgress } from '../utils/useScrollProgress';

interface ScrollToTopDockProps {
  /** Dock đang nằm dưới thì đẩy nút lên cao hơn để không chồng lên nhau. */
  navbarAtBottom?: boolean;
  onJump?: () => void;
}

const RING_R = 20;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

/**
 * Nút nổi cuộn về đầu trang, viền là vòng tiến trình cuộn.
 *
 * Chỉ xuất hiện sau khi người dùng đã cuộn qua một ngưỡng, tự ẩn khi tới
 * cuối trang (lúc đó không còn cần nữa). Cuộn có hoạt ảnh trừ khi người dùng
 * bật chế độ giảm chuyển động.
 */
export const ScrollToTopDock: React.FC<ScrollToTopDockProps> = ({ navbarAtBottom = false, onJump }) => {
  const { progress, scrollable } = useScrollProgress();

  /* Suy ra trực tiếp từ tiến trình cuộn ngay trong lúc render — không cần
     state riêng, nhờ vậy không có setState trong effect gây render dây chuyền.
     Ẩn khi trang quá ngắn (< 6%) và khi đã sát đáy trang. */
  const visible = scrollable && progress > 0.06 && progress < 0.995;
  if (!visible) return null;

  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);
  const reducedMotion =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.classList.contains('reduce-motion'));

  const jump = () => {
    onJump?.();
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={jump}
      aria-label={`Cuộn về đầu trang (đã đọc ${Math.round(progress * 100)}%)`}
      title="Về đầu trang"
      className={`ff-totop ${navbarAtBottom ? 'ff-totop--raised' : ''}`}
    >
      <svg className="ff-totop__ring" viewBox="0 0 48 48" aria-hidden="true">
        <circle className="ff-totop__track" cx="24" cy="24" r={RING_R} />
        <circle
          className="ff-totop__arc"
          cx="24"
          cy="24"
          r={RING_R}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <ArrowUp className="ff-totop__icon" size={17} />
    </button>
  );
};

export default ScrollToTopDock;
