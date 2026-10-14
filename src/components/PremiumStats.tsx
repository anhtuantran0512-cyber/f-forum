/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { useEffect, useRef, type FC, type ReactNode } from 'react';
import './ProfileSignature.css';

export const PremiumStat: FC<{
  value: number;
  label: string;
  icon: ReactNode;
  detail: string;
  featured?: boolean;
  onClick?: () => void;
}> = ({ value, label, icon, detail, featured, onClick }) => {
  const numRef = useRef<HTMLSpanElement | null>(null);
  const reducedMotion =
    typeof window !== 'undefined' &&
    (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.classList.contains('reduce-motion'));

  useEffect(() => {
    const el = numRef.current;
    if (!el) return;
    if (reducedMotion) {
      el.textContent = value.toLocaleString('vi-VN');
      return;
    }
    const start = performance.now();
    let frame = 0;
    let lastFormatted = '';
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 750);
      const nextVal = t === 1 ? value : Math.round(value * (1 - (1 - t) ** 3));
      const formatted = nextVal.toLocaleString('vi-VN');
      if (formatted !== lastFormatted) {
        el.textContent = formatted;
        lastFormatted = formatted;
      }
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reducedMotion]);

  return (
    <button
      type="button"
      className={`signature-stat ${featured ? 'signature-stat--featured' : ''}`}
      onClick={onClick}
      title={`${label}: ${value.toLocaleString('vi-VN')} · ${detail}`}
      aria-label={`${label}: ${value.toLocaleString('vi-VN')}. ${detail}`}
    >
      <span className="signature-stat__icon" aria-hidden="true">
        {icon}
      </span>
      <span ref={numRef} className="signature-stat__number" aria-hidden="true">
        {value.toLocaleString('vi-VN')}
      </span>
      <span className="signature-stat__label" aria-hidden="true">
        {label}
      </span>
    </button>
  );
};
