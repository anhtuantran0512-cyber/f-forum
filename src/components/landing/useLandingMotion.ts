/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { useEffect, useRef, useState } from 'react';

/* ==========================================================================
   Motion & scroll hooks shared by the landing sections.
   Kept in a dedicated module so every consumer can be tree-shaken and so the
   component files stay Fast-Refresh friendly.
   ========================================================================== */

/** True when the user asked the OS (or the in-app setting) for reduced motion. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () =>
      setReduced(mq.matches || document.documentElement.classList.contains('reduce-motion'));
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return reduced;
}

/**
 * A single IntersectionObserver is shared by every reveal/counter on the page,
 * keyed by its options. Building ~200 observers for one landing page is wasteful;
 * this keeps it at one or two regardless of how much content we add.
 */
type VisibilityHandler = (isIntersecting: boolean) => void;

const visibilityHandlers = new WeakMap<Element, VisibilityHandler>();
const sharedObservers = new Map<string, IntersectionObserver>();

function observeVisibility(
  element: Element,
  handler: VisibilityHandler,
  threshold: number,
  rootMargin: string,
): () => void {
  const key = `${threshold}|${rootMargin}`;
  let observer = sharedObservers.get(key);

  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visibilityHandlers.get(entry.target)?.(entry.isIntersecting);
        });
      },
      { threshold, rootMargin },
    );
    sharedObservers.set(key, observer);
  }

  visibilityHandlers.set(element, handler);
  observer.observe(element);

  return () => {
    observer?.unobserve(element);
    visibilityHandlers.delete(element);
  };
}

/** Observe an element and report the first time it enters the viewport. */
export function useInView<T extends HTMLElement>(
  options: { threshold?: number; rootMargin?: string; once?: boolean } = {},
) {
  const { threshold = 0.18, rootMargin = '0px 0px -8% 0px', once = true } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    let seen = false;
    return observeVisibility(
      node,
      (isIntersecting) => {
        if (isIntersecting) {
          if (once && seen) return;
          seen = true;
          setInView(true);
          if (once && ref.current) visibilityHandlers.delete(ref.current);
        } else if (!once) {
          seen = false;
          setInView(false);
        }
      },
      threshold,
      rootMargin,
    );
  }, [threshold, rootMargin, once]);

  return { ref, inView };
}

/** Vertical scroll progress (0 → 1) for the whole document. */
export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return progress;
}

/** Raw window scrollY (rAF throttled) — used for parallax and section scrubbing. */
export function useScrollY(): number {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrollY(window.scrollY);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return scrollY;
}

/** Smooth-scroll helper that respects the sticky header offset. */
export function scrollToSection(sectionId: string, offset = 88): void {
  const target = document.getElementById(sectionId);
  if (!target) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({
    top: target.getBoundingClientRect().top + window.scrollY - offset,
    behavior: reduced ? 'auto' : 'smooth',
  });
}
