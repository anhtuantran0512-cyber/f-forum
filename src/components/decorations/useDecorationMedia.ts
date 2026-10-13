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

type IntersectionCallback = (isIntersecting: boolean) => void;

interface SharedObserverBucket {
  observer: IntersectionObserver;
  listeners: Map<Element, Set<IntersectionCallback>>;
}

const sharedObservers = new Map<string, SharedObserverBucket>();

const observeShared = (
  element: Element,
  callback: IntersectionCallback,
  rootMargin: string = '640px 0px',
): (() => void) => {
  if (typeof IntersectionObserver === 'undefined') {
    callback(true);
    return () => {};
  }
  let bucket = sharedObservers.get(rootMargin);
  if (!bucket) {
    const listeners = new Map<Element, Set<IntersectionCallback>>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const set = listeners.get(entry.target);
          if (!set) continue;
          for (const cb of set) {
            cb(entry.isIntersecting);
          }
        }
      },
      { rootMargin },
    );
    bucket = { observer, listeners };
    sharedObservers.set(rootMargin, bucket);
  }
  let set = bucket.listeners.get(element);
  if (!set) {
    set = new Set();
    bucket.listeners.set(element, set);
    bucket.observer.observe(element);
  }
  set.add(callback);
  return () => {
    const currentBucket = sharedObservers.get(rootMargin);
    if (!currentBucket) return;
    const currentSet = currentBucket.listeners.get(element);
    if (!currentSet) return;
    currentSet.delete(callback);
    if (currentSet.size === 0) {
      currentBucket.listeners.delete(element);
      currentBucket.observer.unobserve(element);
    }
  };
};

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
 * IntersectionObserver 1 lần dùng chung 1 observer pool toàn cục (kiểu Discord/Facebook):
 * trả true khi element hiện trên màn hình lần đầu (preview video chỉ tải khi cần —
 * 873 item không thể preload hết, và không tạo hàng trăm observer rời rạc).
 */
export const useInViewOnce = <T extends Element>(): readonly [React.RefObject<T | null>, boolean] => {
  const ref = useRef<T | null>(null);
  /* Môi trường không có IntersectionObserver → coi như đã in-view ngay từ đầu (tránh setState trong effect). */
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (inView) return;
    const node = ref.current;
    if (!node) return;
    if (typeof window !== 'undefined' && typeof node.getBoundingClientRect === 'function') {
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight || 900;
      if (rect.top <= vh + 640 && rect.bottom >= -640) {
        setInView(true);
        return;
      }
    }
    if (typeof IntersectionObserver === 'undefined') return;
    return observeShared(
      node,
      (isIntersecting: boolean) => {
        if (isIntersecting) {
          setInView(true);
        }
      },
      '640px 0px',
    );
  }, [inView]);
  return [ref, inView] as const;
};

/**
 * Theo dõi thời gian thực xem phần tử có đang nằm trong vùng nhìn VÀ tab trình duyệt
 * đang mở hay không. Khi cuộn khuất khỏi màn hình hoặc ẩn tab, tự động tạm dừng giải mã
 * video (0% GPU/CPU cho phần tử khuất) và lập tức chạy tiếp khi cuộn tới.
 */
export const useActiveInViewport = (
  ref: React.RefObject<Element | null>,
  enabled: boolean = true,
): boolean => {
  const [inViewport, setInViewport] = useState<boolean>(true);
  const [tabVisible, setTabVisible] = useState<boolean>(() =>
    typeof document === 'undefined' ? true : !document.hidden,
  );

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;
    const onVis = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis, { passive: true });
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    return observeShared(
      node,
      (isIntersecting: boolean) => {
        setInViewport(isIntersecting);
      },
      '480px 0px',
    );
  }, [ref, enabled]);

  return inViewport && tabVisible;
};
