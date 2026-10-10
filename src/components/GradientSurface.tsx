import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import './GradientSurface.css';

/** Cross-fade images instead of transitioning CSS background-image (which jumps). */
export function GradientSurface({ gradient, className = '', style }: {
  gradient: string;
  className?: string;
  style?: CSSProperties;
}) {
  const current = useRef(gradient);
  const [previous, setPrevious] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (current.current === gradient) return;
    setPrevious(current.current);
    current.current = gradient;
    const timer = window.setTimeout(() => setPrevious(null), 600);
    return () => window.clearTimeout(timer);
  }, [gradient]);
  return (
    <div className={`gradient-surface ${className}`} style={style} aria-hidden="true">
      {previous && <span className="gradient-surface__image" style={{ background: previous }} />}
      <span key={gradient} className="gradient-surface__image gradient-surface__image--enter" style={{ background: gradient }} />
    </div>
  );
}
