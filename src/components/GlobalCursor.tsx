/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useRef } from 'react';

export const GlobalCursor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const haloRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({
    mouseX: -100,
    mouseY: -100,
    curX: -100,
    curY: -100,
    isHovering: false,
    isVisible: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    const isHoverCapable = window.matchMedia('(hover: hover)').matches;
    if (!isFinePointer || !isHoverCapable) return;

    const handleMouseMove = (e: MouseEvent) => {
      const state = stateRef.current;
      state.mouseX = e.clientX;
      state.mouseY = e.clientY;
      if (!state.isVisible) {
        state.isVisible = true;
        state.curX = e.clientX;
        state.curY = e.clientY;
      }

      const target = e.target as HTMLElement | null;
      if (target) {
        const isClickable = Boolean(
          target.closest('button, a, input, textarea, select, [role="button"], .cursor-pointer')
        );
        state.isHovering = isClickable;
      }
    };

    const handleMouseLeave = () => {
      stateRef.current.isVisible = false;
    };

    let animId: number;
    const tick = () => {
      const state = stateRef.current;
      const container = containerRef.current;
      const halo = haloRef.current;

      if (container && state.isVisible) {
        state.curX += (state.mouseX - state.curX) * 0.2;
        state.curY += (state.mouseY - state.curY) * 0.2;

        container.style.opacity = '1';
        container.style.transform = `translate3d(${state.curX}px, ${state.curY}px, 0)`;

        if (halo) {
          const scale = state.isHovering ? 1.5 : 1.0;
          halo.style.transform = `scale(${scale})`;
        }
      } else if (container) {
        container.style.opacity = '0';
      }

      animId = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="fixed top-0 left-0 pointer-events-none z-[99999] opacity-0 transition-opacity duration-300 hidden md:block"
      style={{ willChange: 'transform' }}
    >
      {/* Ambient Halo: 32px soft luminous radial white aura expanding to 48px on hover */}
      <div
        ref={haloRef}
        className="absolute -top-4 -left-4 w-8 h-8 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 50%, transparent 70%)',
          transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          willChange: 'transform',
        }}
      />

      {/* Core Dot: 8px solid white circle centered on pointer */}
      <div
        className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"
      />
    </div>
  );
};

export default GlobalCursor;
