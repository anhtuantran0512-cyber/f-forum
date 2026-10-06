/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { useLayoutEffect, useState, type RefObject, type CSSProperties } from 'react';

export type DockPosition = 'top' | 'bottom' | 'left' | 'right';

export interface PopoverPosition {
  style: CSSProperties;
  ready: boolean;
}

/**
 * Computes a viewport-fixed position for a popover anchored to a trigger element,
 * aware of which screen edge the navbar dock is attached to. The panel is always
 * clamped inside the viewport so it never gets clipped or covered by the dock.
 */
export function computePopoverPosition(
  anchorEl: HTMLElement | null,
  dockPos: DockPosition,
  panelWidth: number,
  panelMaxHeight: number,
): PopoverPosition {
  if (!anchorEl || typeof window === 'undefined') {
    return { style: { position: 'fixed', top: 16, left: 16 }, ready: false };
  }

  const rect = anchorEl.getBoundingClientRect();
  const visualViewport = window.visualViewport;
  const viewportLeft = Math.max(0, visualViewport?.offsetLeft ?? 0);
  const viewportTop = Math.max(0, visualViewport?.offsetTop ?? 0);
  const viewportWidth = Math.max(1, visualViewport?.width || window.innerWidth);
  const viewportHeight = Math.max(1, visualViewport?.height || window.innerHeight);
  const viewportRight = viewportLeft + viewportWidth;
  const viewportBottom = viewportTop + viewportHeight;
  const MARGIN = 12;
  const GAP = 12;

  /* Guard against invisible or zero-rect anchors. */
  if (rect.width === 0 && rect.height === 0) {
    return { style: { position: 'fixed', top: 16, left: 16 }, ready: false };
  }

  const width = Math.min(panelWidth, Math.max(1, viewportWidth - MARGIN * 2));
  const horizontalInset = Math.min(MARGIN, viewportWidth / 2);
  const minLeft = viewportLeft + horizontalInset;
  const maxLeft = Math.max(minLeft, viewportRight - horizontalInset - width);
  const clampLeft = (left: number) => Math.max(minLeft, Math.min(Math.round(left), maxLeft));
  const verticalInset = Math.min(MARGIN, viewportHeight / 2);
  const minTop = viewportTop + verticalInset;
  const maxBottom = viewportBottom - verticalInset;
  const clampHeight = (available: number) => Math.max(1, Math.min(panelMaxHeight, Math.max(0, available)));
  const isLowerHalf = rect.top + rect.height / 2 > viewportTop + viewportHeight * 0.52;

  if (dockPos === 'left' || dockPos === 'right') {
    const availableHeight = isLowerHalf
      ? rect.top - GAP - minTop
      : maxBottom - Math.max(minTop, rect.top);
    const maxHeight = clampHeight(availableHeight);
    const top = isLowerHalf
      ? Math.max(minTop, Math.round(rect.top - GAP - maxHeight))
      : Math.max(minTop, Math.round(rect.top));
    const clampedTop = Math.min(top, Math.max(minTop, maxBottom - maxHeight));
    const preferredLeft = dockPos === 'left'
      ? rect.right + GAP
      : rect.left - GAP - width;

    return {
      style: {
        position: 'fixed',
        top: clampedTop,
        left: clampLeft(preferredLeft),
        width,
        maxWidth: width,
        maxHeight,
        transformOrigin: `${isLowerHalf ? 'bottom' : 'top'} ${dockPos === 'left' ? 'left' : 'right'}`,
        zIndex: 85,
      },
      ready: true,
    };
  }

  const belowTop = Math.max(minTop, Math.round(rect.bottom + GAP));
  const availableBelow = Math.max(0, maxBottom - belowTop);
  const availableAbove = Math.max(0, Math.round(rect.top - GAP - minTop));
  const openAbove = dockPos === 'bottom'
    ? availableAbove >= availableBelow
    : availableBelow < Math.min(panelMaxHeight, 220) && availableAbove > availableBelow;
  const availableHeight = openAbove ? availableAbove : availableBelow;
  const maxHeight = clampHeight(availableHeight);
  const top = openAbove
    ? Math.max(minTop, Math.round(rect.top - GAP - maxHeight))
    : belowTop;
  const clampedTop = Math.min(top, Math.max(minTop, maxBottom - maxHeight));
  const left = clampLeft(rect.right - width);

  return {
    style: {
      position: 'fixed',
      top: clampedTop,
      left,
      width,
      maxWidth: width,
      maxHeight,
      transformOrigin: `${openAbove ? 'bottom' : 'top'} right`,
      zIndex: 85,
    },
    ready: true,
  };
}

/**
 * Hook: keeps a popover pinned & clamped while open (recomputes on resize/scroll/dock shift).
 */
export function usePopoverPosition(
  isOpen: boolean,
  anchorRef: RefObject<HTMLElement | null> | undefined,
  dockPos: DockPosition,
  panelWidth: number,
  panelMaxHeight = 560,
): PopoverPosition {
  const [pos, setPos] = useState<PopoverPosition>({
    style: { position: 'fixed', top: -9999, left: -9999, opacity: 0 },
    ready: false,
  });

  useLayoutEffect(() => {
    if (!isOpen) return;

    let frame = 0;
    const update = () => {
      const anchorEl = anchorRef?.current || null;
      const next = computePopoverPosition(anchorEl, dockPos, panelWidth, panelMaxHeight);
      setPos(next);
    };
    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    const visualViewport = window.visualViewport;

    update();
    /* Recompute after dock transition frames and viewport/zoom movement. */
    const t1 = setTimeout(scheduleUpdate, 60);
    const t2 = setTimeout(scheduleUpdate, 220);
    const t3 = setTimeout(scheduleUpdate, 440);
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    window.addEventListener('orientationchange', scheduleUpdate, { passive: true });
    window.addEventListener('scroll', scheduleUpdate, { passive: true, capture: true });
    visualViewport?.addEventListener('resize', scheduleUpdate, { passive: true });
    visualViewport?.addEventListener('scroll', scheduleUpdate, { passive: true });
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('orientationchange', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
      visualViewport?.removeEventListener('resize', scheduleUpdate);
      visualViewport?.removeEventListener('scroll', scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [isOpen, dockPos, panelWidth, panelMaxHeight, anchorRef]);

  if (!isOpen) {
    return { style: { position: 'fixed', top: -9999, left: -9999, opacity: 0 }, ready: false };
  }
  return pos;
}
