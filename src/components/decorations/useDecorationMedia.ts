/* Bản quyền trí tuệ thuộc về BroAmStuck */
/* Shared visibility and reduced-motion hooks for decorative media. */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

type IntersectionCallback = (isIntersecting: boolean) => void;
interface SharedObserverBucket {
  observer: IntersectionObserver;
  listeners: Map<Element, Set<IntersectionCallback>>;
}
const sharedObservers = new Map<string, SharedObserverBucket>();

const observeShared = (element: Element, callback: IntersectionCallback, rootMargin = '640px 0px'): (() => void) => {
  if (typeof IntersectionObserver === 'undefined') {
    callback(true);
    return () => {};
  }
  let bucket = sharedObservers.get(rootMargin);
  if (!bucket) {
    const listeners = new Map<Element, Set<IntersectionCallback>>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        for (const listener of listeners.get(entry.target) || []) listener(entry.isIntersecting);
      }
    }, { rootMargin });
    bucket = { observer, listeners };
    sharedObservers.set(rootMargin, bucket);
  }
  let listeners = bucket.listeners.get(element);
  if (!listeners) {
    listeners = new Set();
    bucket.listeners.set(element, listeners);
    bucket.observer.observe(element);
  }
  listeners.add(callback);
  return () => {
    const currentBucket = sharedObservers.get(rootMargin);
    const currentListeners = currentBucket?.listeners.get(element);
    if (!currentBucket || !currentListeners) return;
    currentListeners.delete(callback);
    if (currentListeners.size === 0) {
      currentBucket.listeners.delete(element);
      currentBucket.observer.unobserve(element);
    }
  };
};

/* One shared subscription for the OS preference and the in-app reduce-motion toggle. */
const reducedMotionListeners = new Set<() => void>();
let reducedMotionQuery: MediaQueryList | null = null;
let reducedMotionObserver: MutationObserver | null = null;
const readReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  const osPrefersReduced = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
  const appPrefersReduced = typeof document !== 'undefined'
    && document.documentElement.classList.contains('reduce-motion');
  return osPrefersReduced || appPrefersReduced;
};
const notifyReducedMotionListeners = (): void => reducedMotionListeners.forEach((listener) => listener());
const subscribeReducedMotion = (listener: () => void): (() => void) => {
  reducedMotionListeners.add(listener);
  if (reducedMotionListeners.size === 1 && typeof window !== 'undefined') {
    if (typeof window.matchMedia === 'function') {
      reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (typeof reducedMotionQuery.addEventListener === 'function') {
        reducedMotionQuery.addEventListener('change', notifyReducedMotionListeners);
      } else {
        reducedMotionQuery.addListener(notifyReducedMotionListeners);
      }
    }
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      reducedMotionObserver = new MutationObserver(notifyReducedMotionListeners);
      reducedMotionObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
  }
  return () => {
    reducedMotionListeners.delete(listener);
    if (reducedMotionListeners.size !== 0) return;
    if (reducedMotionQuery) {
      if (typeof reducedMotionQuery.removeEventListener === 'function') {
        reducedMotionQuery.removeEventListener('change', notifyReducedMotionListeners);
      } else {
        reducedMotionQuery.removeListener(notifyReducedMotionListeners);
      }
      reducedMotionQuery = null;
    }
    reducedMotionObserver?.disconnect();
    reducedMotionObserver = null;
  };
};

export const useReducedMotion = (): boolean =>
  useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => false);

/** Observe once, then keep the element enabled after its first approach to the viewport. */
export const useInViewOnce = <T extends Element>(): readonly [React.RefObject<T | null>, boolean] => {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (inView) return;
    const node = ref.current;
    if (!node) return;
    if (typeof window !== 'undefined' && typeof node.getBoundingClientRect === 'function') {
      const rect = node.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 900;
      if (rect.top <= viewportHeight + 640 && rect.bottom >= -640) {
        setInView(true);
        return;
      }
    }
    if (typeof IntersectionObserver === 'undefined') return;
    return observeShared(node, (isIntersecting) => {
      if (isIntersecting) setInView(true);
    });
  }, [inView]);
  return [ref, inView] as const;
};

/** Pause native media outside the viewport or while the tab is hidden. */
export const useActiveInViewport = (
  ref: React.RefObject<Element | null>,
  enabled = true,
): boolean => {
  const [inViewport, setInViewport] = useState(() => typeof IntersectionObserver === 'undefined');
  const [tabVisible, setTabVisible] = useState(() => typeof document === 'undefined' || !document.hidden);

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;
    const onVisibilityChange = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return;
    const node = ref.current;
    if (!node) return;
    return observeShared(node, setInViewport, '480px 0px');
  }, [ref, enabled]);

  return enabled && inViewport && tabVisible;
};

export interface ProfileProximityBindings<T extends HTMLElement = HTMLDivElement> {
  isActive: boolean;
  dataProfileActive: 'true' | 'false';
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onFocusCapture: (event: React.FocusEvent<T>) => void;
  onBlurCapture: (event: React.FocusEvent<T>) => void;
  onTouchStart: () => void;
}

/**
 * Keep profile effects in their calm normal state by default, and wake them up
 * when the pointer approaches within proximityPx, hovers directly, or keyboard focus enters.
 */
export const useProfileProximityEffect = <T extends HTMLElement = HTMLDivElement>(
  ref: React.RefObject<T | null>,
  enabled = true,
  proximityPx = 88,
): ProfileProximityBindings<T> => {
  const reducedMotion = useReducedMotion();
  const activeInViewport = useActiveInViewport(ref, enabled && !reducedMotion);
  const [pointerNear, setPointerNear] = useState(false);
  const [focusedWithin, setFocusedWithin] = useState(false);

  useEffect(() => {
    if (!activeInViewport || typeof window === 'undefined') return;

    let rafId = 0;
    const checkProximity = (clientX: number, clientY: number) => {
      const node = ref.current;
      if (!node || typeof node.getBoundingClientRect !== 'function') return;
      const rect = node.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      const viewportW = window.innerWidth || document.documentElement.clientWidth || 0;
      const viewportH = window.innerHeight || document.documentElement.clientHeight || 0;
      const inViewportBounds =
        rect.bottom >= 0 && rect.top <= viewportH && rect.right >= 0 && rect.left <= viewportW;
      const dx = Math.max(rect.left - clientX, 0, clientX - rect.right);
      const dy = Math.max(rect.top - clientY, 0, clientY - rect.bottom);
      const isNear = inViewportBounds && Math.hypot(dx, dy) <= proximityPx;
      setPointerNear((prev) => (prev === isNear ? prev : isNear));
    };

    const onPointerMove = (event: PointerEvent) => {
      if (rafId) return;
      const { clientX, clientY } = event;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        checkProximity(clientX, clientY);
      });
    };

    const resetActive = () => {
      setPointerNear(false);
      setFocusedWithin(false);
    };

    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        resetActive();
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('blur', resetActive);
    document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('blur', resetActive);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      resetActive();
    };
  }, [ref, activeInViewport, proximityPx]);

  const isActive = activeInViewport && (pointerNear || focusedWithin);

  return {
    isActive,
    dataProfileActive: isActive ? 'true' : 'false',
    onPointerEnter: () => {
      if (activeInViewport) setPointerNear(true);
    },
    onPointerLeave: () => {
      setPointerNear(false);
    },
    onFocusCapture: (event: React.FocusEvent<T>) => {
      if (!activeInViewport) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        typeof target.matches === 'function' &&
        target.matches(':focus-visible')
      ) {
        setFocusedWithin(true);
      }
    },
    onBlurCapture: (event: React.FocusEvent<T>) => {
      const nextTarget = event.relatedTarget as Node | null;
      if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
        setFocusedWithin(false);
      }
    },
    onTouchStart: () => {
      if (activeInViewport) setPointerNear(true);
    },
  };
};

