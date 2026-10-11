/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useRef } from 'react';
import { rafThrottle } from '../../../utils/rafThrottle';
import { readingProgress } from '../../../utils/qaDetail';
import './QADetail.css';

/**
 * Thanh tiến độ đọc: mỏng, ngang, cố định ở mép trên trang (kiểu Medium).
 * Ghi thẳng biến CSS vào phần tử (không qua state) nên cuộn mượt kể cả khi trang rất dài.
 * Thuần trang trí → `aria-hidden`; không báo tiến độ cho trình đọc màn hình mỗi lần cuộn.
 */
export const QAReadingProgress: React.FC<{ scrollerRef: React.RefObject<HTMLElement | null> }> = ({ scrollerRef }) => {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    if (!scroller || !track) return;

    const update = rafThrottle(() => {
      const progress = readingProgress(scroller.scrollTop, scroller.scrollHeight, scroller.clientHeight);
      track.style.setProperty('--ff-qa-progress', progress.toFixed(4));
      /* Trang ngắn hoặc đang ở đầu trang → ẩn thanh thay vì để một vạch rỗng/đầy vô nghĩa. */
      track.dataset.active = progress > 0 ? 'true' : 'false';
    });

    update();
    scroller.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    /* Nội dung dài ra (ảnh tải xong, có lời giải mới qua WebSocket) → tính lại mà không cần cuộn. */
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(scroller);
    if (scroller.firstElementChild) observer?.observe(scroller.firstElementChild);

    return () => {
      update.cancel();
      scroller.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      observer?.disconnect();
    };
  }, [scrollerRef]);

  return (
    <div ref={trackRef} className="ff-qa-progress" data-active="false" aria-hidden="true">
      <div className="ff-qa-progress__bar" />
    </div>
  );
};
