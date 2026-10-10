/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { useEffect, useState, type FC, type ReactNode } from 'react';
import './ProfileSignature.css';
export const PremiumStat: FC<{ value: number; label: string; icon: ReactNode; detail: string; featured?: boolean; onClick: () => void }> = ({ value, label, icon, detail, featured, onClick }) => {
  const [display, setDisplay] = useState(0);
  const reducedMotion = typeof window !== 'undefined' &&
    (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion'));
  useEffect(() => {
    if (reducedMotion) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 850);
      setDisplay(Math.round(value * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reducedMotion]);
  return <button type="button" className={`signature-stat ${featured ? 'signature-stat--featured' : ''}`} onClick={onClick} aria-label={`${label}: ${value.toLocaleString('vi-VN')}. ${detail}`}>
    <span className="signature-stat__icon" aria-hidden="true">{icon}</span>
    <span className="signature-stat__number" aria-hidden="true">{(reducedMotion ? value : display).toLocaleString('vi-VN')}</span>
    <span className="signature-stat__label" aria-hidden="true">{label}</span>
  </button>;
};
