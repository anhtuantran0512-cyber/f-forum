/* Bản quyền trí tuệ thuộc về BroAmStuck */
/*
 * Nhiệm vụ 10 — hooks media cho trang trí Discord:
 *  - useReducedMotion: tôn trọng prefers-reduced-motion (không phát video).
 *  - useInViewOnce: IntersectionObserver — lazy load preview khi vào viewport.
 *  - useCachedAsset: blob URL cache RAM (import lại từ utils/decorationStore).
 */
import { useEffect, useRef, useState } from 'react';
import { useCachedAsset as useCachedAssetImpl } from '../../utils/decorationStore';

export const useCachedAsset = useCachedAssetImpl;

/** Người dùng bật "giảm chuyển động" → mọi animation của trang trí bị tắt. */
export const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
};

/**
 * IntersectionObserver 1 lần: trả true khi element hiện trên màn hình lần đầu
 * (preview video chỉ tải khi cần — 873 item không thể preload hết).
 */
export const useInViewOnce = <T extends Element>(): readonly [React.RefObject<T | null>, boolean] => {
  const ref = useRef<T | null>(null);
  /* Môi trường không có IntersectionObserver → coi như đã in-view ngay từ đầu (tránh setState trong effect). */
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (inView) return;
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: '120px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [inView]);
  return [ref, inView] as const;
};
