/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { useCallback, useSyncExternalStore } from 'react';

/** Theo dõi một media query (vd. '(max-width: 767px)'); render phía máy chủ/không có matchMedia → false. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    [query],
  );
  const getSnapshot = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
