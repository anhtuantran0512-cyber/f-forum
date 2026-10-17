/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from './decorations/useDecorationMedia';

export const GlobalCursor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (typeof window === 'undefined' || reducedMotion) return;
    if (typeof window.matchMedia === 'function') {
      if (!window.matchMedia('(pointer: fine)').matches || !window.matchMedia('(hover: hover)').matches) return;
    }

    let frame = 0;
    let x = -100;
    let y = -100;
    let visible = false;
    const container = containerRef.current;
    if (!container) return;

    const flush = () => {
      frame = 0;
      if (!visible || document.visibilityState !== 'visible') {
        container.style.opacity = '0';
        return;
      }
      container.style.opacity = '1';
      container.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(flush);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      x = event.clientX;
      y = event.clientY;
      visible = true;
      schedule();
    };
    const onPointerLeave = () => {
      visible = false;
      schedule();
    };
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') visible = false;
      schedule();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave, { passive: true });
    document.addEventListener('visibilitychange', onVisibility, { passive: true });
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      container.style.willChange = 'auto';
    };
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="ff-global-cursor fixed top-0 left-0 pointer-events-none z-[99999] opacity-0 transition-opacity duration-200 hidden md:block"
    >
      <div
        className="absolute -top-4 -left-4 w-8 h-8 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 55%, transparent 72%)' }}
      />
    </div>
  );
};

export default GlobalCursor;
