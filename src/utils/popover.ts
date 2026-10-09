/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { useLayoutEffect, useState, type RefObject, type CSSProperties } from 'react';
import { rafThrottle } from './rafThrottle';

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
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const MARGIN = 12;
  const GAP = 12;

  /* Guard against invisible or zero-rect anchor */
  if (rect.width === 0 && rect.height === 0) {
    return { style: { position: 'fixed', top: 16, left: 16 }, ready: false };
  }

  if (dockPos === 'left') {
    const left = Math.max(MARGIN, Math.round(rect.right + GAP));
    const availableW = Math.max(240, vw - left - MARGIN);
    const width = Math.min(panelWidth, availableW);
    const isLowerHalf = rect.top + rect.height / 2 > vh * 0.52;

    if (isLowerHalf) {
      const bottom = Math.max(MARGIN, Math.round(vh - rect.bottom));
      const maxH = Math.max(220, Math.min(panelMaxHeight, vh - bottom - MARGIN));
      return {
        style: {
          position: 'fixed',
          top: 'auto',
          bottom,
          left,
          right: 'auto',
          width,
          maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
          maxHeight: maxH,
          transformOrigin: 'bottom left',
          zIndex: 85,
        },
        ready: true,
      };
    }

    const top = Math.max(MARGIN, Math.round(rect.top));
    const maxH = Math.max(220, Math.min(panelMaxHeight, vh - top - MARGIN));
    return {
      style: {
        position: 'fixed',
        top,
        bottom: 'auto',
        left,
        right: 'auto',
        width,
        maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
        maxHeight: maxH,
        transformOrigin: 'top left',
        zIndex: 85,
      },
      ready: true,
    };
  }

  if (dockPos === 'right') {
    const right = Math.max(MARGIN, Math.round(vw - rect.left + GAP));
    const availableW = Math.max(240, vw - right - MARGIN);
    const width = Math.min(panelWidth, availableW);
    const isLowerHalf = rect.top + rect.height / 2 > vh * 0.52;

    if (isLowerHalf) {
      const bottom = Math.max(MARGIN, Math.round(vh - rect.bottom));
      const maxH = Math.max(220, Math.min(panelMaxHeight, vh - bottom - MARGIN));
      return {
        style: {
          position: 'fixed',
          top: 'auto',
          bottom,
          left: 'auto',
          right,
          width,
          maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
          maxHeight: maxH,
          transformOrigin: 'bottom right',
          zIndex: 85,
        },
        ready: true,
      };
    }

    const top = Math.max(MARGIN, Math.round(rect.top));
    const maxH = Math.max(220, Math.min(panelMaxHeight, vh - top - MARGIN));
    return {
      style: {
        position: 'fixed',
        top,
        bottom: 'auto',
        left: 'auto',
        right,
        width,
        maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
        maxHeight: maxH,
        transformOrigin: 'top right',
        zIndex: 85,
      },
      ready: true,
    };
  }

  if (dockPos === 'bottom') {
    const width = Math.min(panelWidth, vw - MARGIN * 2);
    let left = Math.round(rect.right - width);
    left = Math.max(MARGIN, Math.min(left, vw - MARGIN - width));
    const bottom = Math.max(MARGIN, Math.round(vh - rect.top + GAP));
    const maxH = Math.max(220, Math.min(panelMaxHeight, Math.round(rect.top - GAP - MARGIN)));

    return {
      style: {
        position: 'fixed',
        top: 'auto',
        bottom,
        left,
        right: 'auto',
        width,
        maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
        maxHeight: maxH,
        transformOrigin: 'bottom right',
        zIndex: 85,
      },
      ready: true,
    };
  }

  /* Default: top dock -> panel opens below the trigger */
  const width = Math.min(panelWidth, vw - MARGIN * 2);
  let left = Math.round(rect.right - width);
  left = Math.max(MARGIN, Math.min(left, vw - MARGIN - width));
  const top = Math.max(MARGIN, Math.round(rect.bottom + GAP));
  const maxH = Math.max(220, Math.min(panelMaxHeight, Math.round(vh - top - MARGIN)));

  return {
    style: {
      position: 'fixed',
      top,
      bottom: 'auto',
      left,
      right: 'auto',
      width,
      maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
      maxHeight: maxH,
      transformOrigin: 'top right',
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

    const update = () => {
      const anchorEl = anchorRef?.current || null;
      const next = computePopoverPosition(anchorEl, dockPos, panelWidth, panelMaxHeight);
      /* Cùng vị trí → giữ nguyên object cũ, React bỏ qua render */
      setPos(prev => (prev.ready === next.ready && JSON.stringify(prev.style) === JSON.stringify(next.style) ? prev : next));
    };

    update();
    /* Recompute after dock transition frames */
    const t1 = setTimeout(update, 60);
    const t2 = setTimeout(update, 220);
    const t3 = setTimeout(update, 440);
    /* R4: scroll ở pha capture bắn cho MỌI vùng cuộn trong trang → gộp về 1 lần/khung
       hình và để passive (không chặn cuộn mượt). */
    const onFrame = rafThrottle(update);
    window.addEventListener('resize', onFrame, { passive: true });
    window.addEventListener('scroll', onFrame, { capture: true, passive: true });
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      onFrame.cancel();
      window.removeEventListener('resize', onFrame);
      window.removeEventListener('scroll', onFrame, true);
    };
  }, [isOpen, dockPos, panelWidth, panelMaxHeight, anchorRef]);

  if (!isOpen) {
    return { style: { position: 'fixed', top: -9999, left: -9999, opacity: 0 }, ready: false };
  }
  return pos;
}
