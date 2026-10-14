/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useRef } from 'react';

export const GlobalCursor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    const isHoverCapable = window.matchMedia('(hover: hover)').matches;
    if (!isFinePointer || !isHoverCapable) return;

    let animId = 0;
    let mouseX = -100;
    let mouseY = -100;
    let visible = false;
    let lastOpacity = '0';

    const flush = () => {
      animId = 0;
      const container = containerRef.current;
      if (!container) return;

      if (visible) {
        if (lastOpacity !== '1') {
          container.style.opacity = '1';
          lastOpacity = '1';
        }
        container.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      } else if (lastOpacity !== '0') {
        container.style.opacity = '0';
        lastOpacity = '0';
      }
    };

    const scheduleFlush = () => {
      if (animId === 0) {
        animId = requestAnimationFrame(flush);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      visible = true;
      scheduleFlush();
    };

    const handleMouseLeave = () => {
      visible = false;
      scheduleFlush();
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (animId !== 0) cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="fixed top-0 left-0 pointer-events-none z-[99999] opacity-0 transition-opacity duration-200 hidden md:block"
      style={{ willChange: 'transform' }}
    >
      <div
        className="absolute -top-4 -left-4 w-8 h-8 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 55%, transparent 72%)',
        }}
      />
    </div>
  );
};

export default GlobalCursor;
