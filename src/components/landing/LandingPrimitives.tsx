import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { useInView, usePrefersReducedMotion, useScrollProgress } from './useLandingMotion';

/* ==========================================================================
   Motion primitives
   ========================================================================== */
/* ==========================================================================
   Motion primitives
   ========================================================================== */

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** ms */
  delay?: number;
  /** Vertical offset in px */
  y?: number;
  scale?: number;
  variant?: 'up' | 'left' | 'right' | 'scale';
  as?: 'div' | 'section' | 'li' | 'article' | 'span' | 'header' | 'footer';
  threshold?: number;
}

/**
 * Scroll-reveal wrapper. Uses a single IntersectionObserver per element and a
 * translate/opacity transition so the main thread stays free while scrolling.
 */
export const Reveal: React.FC<RevealProps> = ({
  children,
  className = '',
  delay = 0,
  y = 30,
  scale,
  variant = 'up',
  as,
  threshold = 0.16,
}) => {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold });
  const Tag = (as ?? 'div') as React.ElementType;

  const style = useMemo(
    () =>
      ({
        '--ff-reveal-delay': `${delay}ms`,
        '--ff-reveal-y': `${y}px`,
        ...(scale !== undefined ? { '--ff-reveal-scale': `${scale}` } : {}),
      }) as React.CSSProperties,
    [delay, y, scale],
  );

  const variantClass =
    variant === 'left'
      ? 'ff-reveal-left'
      : variant === 'right'
        ? 'ff-reveal-right'
        : variant === 'scale'
          ? 'ff-reveal-scale'
          : '';

  return (
    <Tag
      ref={ref}
      className={`ff-reveal ${variantClass} ${inView ? 'is-visible' : ''} ${className}`}
      style={style}
    >
      {children}
    </Tag>
  );
};

interface CounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/** Animated number that counts up the first time it is scrolled into view. */
export const Counter: React.FC<CounterProps> = ({
  value,
  duration = 1600,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const { ref, inView } = useInView<HTMLSpanElement>({ threshold: 0.4 });
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    // Reduced motion jumps straight to the final value on the first frame.
    const total = reduced ? 0 : duration;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = total === 0 ? 1 : Math.min(1, (now - start) / total);
      const eased = 1 - Math.pow(2, -10 * t); // easeOutExpo
      setDisplay(value * (t === 1 ? 1 : eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduced]);

  const formatted = useMemo(
    () =>
      display.toLocaleString('vi-VN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    [display, decimals],
  );

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};

/* ==========================================================================
   Building blocks
   ========================================================================== */

export const SectionHeading: React.FC<{
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: 'center' | 'left';
  className?: string;
}> = ({ eyebrow, title, description, align = 'center', className = '' }) => (
  <div
    className={`${align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl text-left'} ${className}`}
  >
    <Reveal y={18}>
      <span className="ff-eyebrow inline-flex items-center gap-2">
        <span className="h-[1px] w-6 bg-current opacity-60" aria-hidden="true" />
        {eyebrow}
      </span>
    </Reveal>
    <Reveal y={24} delay={90}>
      <h2 className="ff-display ff-balance mt-4 text-3xl sm:text-4xl md:text-[2.75rem]">{title}</h2>
    </Reveal>
    {description && (
      <Reveal y={22} delay={170}>
        <p className="mt-5 text-base leading-relaxed text-[var(--ff-text-soft)] sm:text-lg">{description}</p>
      </Reveal>
    )}
  </div>
);

/** Glass card with a cursor-tracked radial spotlight. */
export const SpotlightCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'article' | 'li';
}> = ({ children, className = '', as = 'div' }) => {
  const Tag = as as React.ElementType;
  const handleMove = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--ff-mx', `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty('--ff-my', `${event.clientY - rect.top}px`);
  }, []);

  return (
    <Tag
      onMouseMove={handleMove}
      className={`ff-card ff-glass ff-spotlight ${className}`}
    >
      {children}
    </Tag>
  );
};

/** Button with a subtle magnetic pull toward the cursor (pointer devices only). */
export const MagneticButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'ghost';
  size?: 'md' | 'lg';
  href?: string;
  ariaLabel?: string;
  type?: 'button' | 'submit';
}> = ({
  children,
  onClick,
  className = '',
  variant = 'primary',
  size = 'md',
  href,
  ariaLabel,
  type = 'button',
}) => {
  const ref = useRef<HTMLElement | null>(null);
  const reduced = usePrefersReducedMotion();

  const handleMove = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const node = ref.current;
      if (!node || reduced || !window.matchMedia('(hover: hover)').matches) return;
      const rect = node.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (event.clientY - rect.top - rect.height / 2) / rect.height;
      node.style.transform = `translate3d(${x * 8}px, ${y * 6 - 2}px, 0) scale(1.02)`;
    },
    [reduced],
  );

  const handleLeave = useCallback(() => {
    const node = ref.current;
    if (node) node.style.transform = '';
  }, []);

  const classes = `group ff-btn ${variant === 'primary' ? 'ff-btn-primary' : 'ff-btn-ghost'} ${
    size === 'lg' ? 'px-8 py-4 text-[15px]' : 'px-6 py-3 text-sm'
  } ${className}`;

  if (href) {
    return (
      <a
        ref={ref as React.RefObject<HTMLAnchorElement>}
        href={href}
        aria-label={ariaLabel}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      type={type}
      aria-label={ariaLabel}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={classes}
    >
      {children}
    </button>
  );
};

/**
 * Infinite horizontal marquee. The children are rendered twice (the second copy
 * is aria-hidden) and each half translates by its own width, which keeps the
 * loop seamless whatever the viewport width is.
 */
export const Marquee: React.FC<{
  children: React.ReactNode;
  duration?: number;
  reverse?: boolean;
  className?: string;
  /** Classes applied to each half — use it to size the individual items. */
  itemClassName?: string;
}> = ({ children, duration = 46, reverse = false, className = '', itemClassName = '' }) => (
  <div className={`ff-marquee-host ff-fade-x relative flex overflow-hidden ${className}`}>
    <div
      className={`ff-marquee ${reverse ? 'ff-marquee-reverse' : ''}`}
      style={{ '--ff-marquee-duration': `${duration}s` } as React.CSSProperties}
    >
      <div className={`ff-marquee-half gap-4 ${itemClassName}`}>{children}</div>
      <div className={`ff-marquee-half gap-4 ${itemClassName}`} aria-hidden="true">
        {children}
      </div>
    </div>
  </div>
);

/** Soft animated gradient orbs used as ambient section backdrops. */
export const AuroraBackdrop: React.FC<{
  className?: string;
  variant?: 'amber' | 'cool' | 'mixed';
}> = ({ className = '', variant = 'mixed' }) => {
  const amber = 'radial-gradient(circle at 30% 30%, rgba(251,191,36,0.55), transparent 62%)';
  const cyan = 'radial-gradient(circle at 60% 60%, rgba(34,211,238,0.42), transparent 62%)';
  const violet = 'radial-gradient(circle at 50% 50%, rgba(167,139,250,0.42), transparent 62%)';

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {(variant === 'amber' || variant === 'mixed') && (
        <div
          className="ff-aurora ff-aurora-anim"
          style={{ width: '620px', height: '620px', top: '-18%', left: '-8%', background: amber }}
        />
      )}
      {(variant === 'cool' || variant === 'mixed') && (
        <div
          className="ff-aurora ff-aurora-anim-slow"
          style={{ width: '560px', height: '560px', top: '12%', right: '-10%', background: cyan }}
        />
      )}
      {variant === 'mixed' && (
        <div
          className="ff-aurora ff-aurora-anim"
          style={{
            width: '520px',
            height: '520px',
            bottom: '-22%',
            left: '28%',
            background: violet,
            animationDelay: '-8s',
            opacity: 0.42,
          }}
        />
      )}
    </div>
  );
};

/** Floating "back to top" affordance that fades in after the hero. */
export const BackToTop: React.FC = () => {
  const progress = useScrollProgress();
  const visible = progress > 0.12;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Quay lại đầu trang"
      className={`ff-btn ff-btn-ghost fixed bottom-6 right-5 z-40 h-11 w-11 !p-0 sm:bottom-8 sm:right-8 ${
        visible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      style={{ transitionProperty: 'opacity, transform, box-shadow, border-color' }}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
};
