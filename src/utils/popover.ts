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
  if (!anchorEl) {
    return { style: { position: 'fixed', top: 12, left: 12 }, ready: false };
  }

  const rect = anchorEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const MARGIN = 10;
  const GAP = 12;

  const width = Math.min(panelWidth, vw - MARGIN * 2);
  const maxHeight = Math.min(panelMaxHeight, vh - MARGIN * 2);

  let top = 0;
  let left = 0;
  let origin = 'top center';

  if (dockPos === 'left') {
    left = rect.right + GAP;
    if (left + width > vw - MARGIN) left = Math.max(MARGIN, vw - MARGIN - width);
    top = rect.top + rect.height / 2 - maxHeight / 2;
    top = Math.max(MARGIN, Math.min(top, vh - MARGIN - Math.min(maxHeight, vh - 2 * MARGIN)));
    origin = 'left center';
  } else if (dockPos === 'right') {
    left = rect.left - GAP - width;
    if (left < MARGIN) left = MARGIN;
    top = rect.top + rect.height / 2 - maxHeight / 2;
    top = Math.max(MARGIN, Math.min(top, vh - MARGIN - Math.min(maxHeight, vh - 2 * MARGIN)));
    origin = 'right center';
  } else if (dockPos === 'bottom') {
    left = rect.right - width;
    left = Math.max(MARGIN, Math.min(left, vw - MARGIN - width));
    top = rect.top - GAP - maxHeight;
    if (top < MARGIN) top = MARGIN;
    origin = 'bottom right';
  } else {
    /* top dock: panel opens below */
    left = rect.right - width;
    left = Math.max(MARGIN, Math.min(left, vw - MARGIN - width));
    top = rect.bottom + GAP;
    if (top + maxHeight > vh - MARGIN) top = Math.max(MARGIN, vh - MARGIN - maxHeight);
    origin = 'top right';
  }

  return {
    style: {
      position: 'fixed',
      top: Math.round(top),
      left: Math.round(left),
      width,
      maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
      maxHeight: Math.min(maxHeight, vh - MARGIN * 2),
      transformOrigin: origin,
      zIndex: 80,
    },
    ready: true,
  };
}

/**
 * Hook: keeps a popover pinned & clamped while open (recomputes on resize/scroll).
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

    const update = () => {
      const anchorEl = anchorRef?.current || null;
      const next = computePopoverPosition(anchorEl, dockPos, panelWidth, panelMaxHeight);
      setPos(next);
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isOpen, dockPos, panelWidth, panelMaxHeight, anchorRef]);

  if (!isOpen) {
    return { style: { position: 'fixed', top: -9999, left: -9999, opacity: 0 }, ready: false };
  }
  return pos;
}
