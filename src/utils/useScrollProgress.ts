import { useEffect, useRef, useState } from 'react';

/**
 * Tiến trình cuộn trang, giá trị 0 → 1.
 *
 * Dùng `requestAnimationFrame` để gộp nhiều sự kiện scroll liên tiếp thành một
 * lần tính, và chỉ cập nhật state khi giá trị thực sự đổi (làm tròn 2 chữ số)
 * nên không gây re-render dồn dập khi người dùng cuộn.
 *
 * Trả thêm `scrollable` để chỗ nào không có nội dung tràn (trang ngắn) thì ẩn
 * thanh tiến trình đi thay vì hiện một vạch đầy 100% vô nghĩa.
 */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  const [scrollable, setScrollable] = useState(false);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const compute = () => {
      frameRef.current = null;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const canScroll = max > 8;
      const ratio = canScroll ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      /* Làm tròn 2 chữ số: đổi 0.4123 → 0.4124 không đáng để re-render. */
      const next = Math.round(ratio * 100) / 100;
      setScrollable(canScroll);
      setProgress((prev) => (prev === next ? prev : next));
    };

    const onScroll = () => {
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return { progress, scrollable };
}
