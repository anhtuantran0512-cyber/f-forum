/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useRef } from 'react';

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'gold' | 'cyan' | 'ghost';
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  onClick,
  ...props
}) => {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const boxRef = useRef<DOMRect | null>(null);

  const handlePointerEnter = () => {
    if (btnRef.current) {
      boxRef.current = btnRef.current.getBoundingClientRect();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== 'mouse') return;
    const btn = btnRef.current;
    if (!btn) return;
    const box = boxRef.current || btn.getBoundingClientRect();
    boxRef.current = box;

    const nx = Math.max(0, Math.min(1, (e.clientX - box.left) / box.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - box.top) / box.height));

    btn.style.setProperty('--mx', `${(nx * 100).toFixed(2)}%`);
    btn.style.setProperty('--my', `${(ny * 100).toFixed(2)}%`);
    btn.style.setProperty('--dx', (nx - 0.5).toFixed(3));
    btn.style.setProperty('--dy', (ny - 0.5).toFixed(3));
  };

  const handlePointerLeave = () => {
    boxRef.current = null;
    const btn = btnRef.current;
    if (btn) {
      btn.style.setProperty('--dx', '0');
      btn.style.setProperty('--dy', '0');
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = btnRef.current;
    if (btn) {
      btn.classList.remove('is-rippling');
      void btn.offsetWidth;
      btn.classList.add('is-rippling');
    }
    if (onClick) {
      onClick(e);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'gold':
        return 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-neutral-950 font-bold border border-amber-300 shadow-[0_4px_20px_rgba(245,158,11,0.35)] hover:shadow-[0_8px_30px_rgba(245,158,11,0.5)]';
      case 'cyan':
        return 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold border border-cyan-300/40 shadow-[0_4px_20px_rgba(6,182,212,0.35)] hover:shadow-[0_8px_30px_rgba(6,182,212,0.5)]';
      case 'ghost':
        return 'bg-white/5 hover:bg-white/10 text-neutral-200 border border-white/15';
      case 'primary':
      default:
        return 'bg-gradient-to-r from-amber-500 to-orange-500 text-neutral-950 font-bold border border-amber-400/40 shadow-[0_4px_20px_rgba(245,158,11,0.3)] hover:shadow-[0_8px_25px_rgba(245,158,11,0.45)]';
    }
  };

  return (
    <button
      ref={btnRef}
      type="button"
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      className={`tb-15__btn group relative overflow-hidden isolate cursor-pointer select-none transition-all duration-300 transform active:scale-95 translate-x-[calc(var(--dx,0)*var(--tb-15-pull,11px))] translate-y-[calc(var(--dy,0)*var(--tb-15-pull,11px)*0.6)] ${getVariantStyles()} ${className}`}
      {...props}
    >
      {/* Mercury highlight layer */}
      <span
        aria-hidden="true"
        className="absolute -inset-px z-10 rounded-[inherit] opacity-0 blur-[2px] transition-opacity duration-300 pointer-events-none group-hover:opacity-70"
        style={{
          background: 'radial-gradient(9rem 6rem at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.4), transparent 62%)',
        }}
      />
      {/* Contact point ripple effect */}
      <span
        aria-hidden="true"
        className="absolute z-10 size-4 -mt-2 -ml-2 rounded-full pointer-events-none opacity-0 group-[.is-rippling]:animate-tb15-ripple"
        style={{
          top: 'var(--my, 50%)',
          left: 'var(--mx, 50%)',
          background: 'radial-gradient(circle, rgba(255,255,255,0.8), transparent 70%)',
        }}
      />
      {/* Inner label content with subtle parallax */}
      <span className="relative z-20 inline-flex items-center justify-center gap-2 transition-transform duration-300 group-hover:translate-x-[calc(var(--dx,0)*3px)] group-hover:translate-y-[calc(var(--dy,0)*2px)]">
        {children}
      </span>
    </button>
  );
};
