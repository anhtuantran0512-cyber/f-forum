import React from 'react';
import { useScrollProgress } from '../utils/useScrollProgress';

type DockPosition = 'top' | 'bottom' | 'left' | 'right';

interface ScrollProgressRailProps {
  /** Vị trí dock, để vạch tiến trình nằm ở cạnh "hướng vào trang". */
  position?: DockPosition;
}

/**
 * Vạch tiến trình cuộn nằm sát mép thanh điều hướng.
 *
 * Chỉ dùng `transform: scaleX()` — thuộc tính được GPU xử lý, không kích hoạt
 * layout/paint, nên cuộn mượt kể cả trên máy yếu. Ẩn hẳn khi trang ngắn không
 * có gì để cuộn, và khi người dùng bật chế độ giảm chuyển động.
 */
export const ScrollProgressRail: React.FC<ScrollProgressRailProps> = ({ position = 'top' }) => {
  const { progress, scrollable } = useScrollProgress();

  if (!scrollable) return null;

  const vertical = position === 'left' || position === 'right';

  /* Dock nằm trên → vạch ở mép dưới; nằm dưới → mép trên; dọc → mép trong. */
  const edgeStyle: React.CSSProperties = vertical
    ? position === 'left'
      ? { right: 2, top: 14, bottom: 14, width: 2 }
      : { left: 2, top: 14, bottom: 14, width: 2 }
    : position === 'bottom'
      ? { top: 2, left: 18, right: 18, height: 2 }
      : { bottom: 2, left: 18, right: 18, height: 2 };

  const pct = Math.round(progress * 100);

  return (
    <span
      className="ff-scroll-rail"
      style={edgeStyle}
      aria-hidden="true"
    >
      <span
        className="ff-scroll-rail__fill"
        style={{
          transform: vertical
            ? `scaleY(${Math.max(progress, 0.001)})`
            : `scaleX(${Math.max(progress, 0.001)})`,
          transformOrigin: vertical
            ? position === 'left'
              ? 'top'
              : 'top'
            : 'left',
        }}
      />
      {/* Con số nhỏ hiện khi gần cuối trang, giúp người dùng biết còn bao nhiêu. */}
      {pct > 0 && !vertical && (
        <span
          className="ff-scroll-rail__knob"
          style={{ left: `${pct}%` }}
          data-pct={pct}
        />
      )}
    </span>
  );
};

export default ScrollProgressRail;
