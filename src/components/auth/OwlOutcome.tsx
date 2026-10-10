/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { useEffect, type FC } from 'react';
import { CuBong } from '../mascot/CuBong';
import './OwlOutcome.css';

/** Decorative conclusion, not a gate: parent closes auth first and removes this on a hard timeout. */
export const OwlOutcome: FC<{ flow: 'login' | 'register'; onSkip: () => void }> = ({ flow, onSkip }) => {
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onSkip(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [onSkip]);
  return <div className={`owl-outcome owl-outcome--${flow}`} role="status" aria-live="polite" aria-label={flow === 'login' ? 'Đã đăng nhập. Chào mừng trở lại.' : 'Đã đăng ký. Chào thành viên mới.'}>
    <div className="owl-outcome__scene" aria-hidden="true">
      <span className="owl-outcome__eyebrow">F - F O R U M</span>
      <span className="owl-outcome__caption">{flow === 'login' ? 'Chào mừng trở lại' : 'Chào thành viên mới'}</span>
      <div className="owl-outcome__owl"><CuBong mood="idle" size={114} decorative /></div>
      <div className="owl-outcome__door"><div className="owl-outcome__light"/><div className="owl-outcome__leaf"><i /></div></div>
      <svg className="owl-outcome__student" viewBox="0 0 90 158">
        <ellipse cx="45" cy="154" rx="22" ry="3" fill="#030a10" opacity=".35" />
        <g className="owl-outcome__leg owl-outcome__leg--back"><path d="M40 105 L35 141" stroke="#344253" strokeWidth="11" strokeLinecap="round"/><path d="M29 142 Q38 137 43 144 L43 151 H27Z" fill="#ead8b6"/></g>
        <g className="owl-outcome__leg"><path d="M53 105 L57 141" stroke="#344253" strokeWidth="11" strokeLinecap="round"/><path d="M51 142 Q59 136 65 143 L67 151 H49Z" fill="#ead8b6"/></g>
        <path d="M57 63 Q79 60 74 103 L60 108Z" fill="#8d7459" stroke="#d4b287" strokeWidth="2"/>
        <path d="M30 63 Q45 55 61 63 L64 106 Q46 114 29 105Z" fill="#d6c8af" stroke="#f8ead0" strokeWidth="2"/>
        <path d="M43 62 L47 73 L53 62 M47 73 V103" stroke="#857969" fill="none" strokeWidth="2"/>
        <g className="owl-outcome__arm"><path d="M61 70 Q76 78 66 98" stroke="#c7ae91" strokeWidth="10" fill="none" strokeLinecap="round"/><circle cx="65" cy="99" r="6" fill="#dab08d"/></g>
        <path d="M30 70 Q22 82 29 99" stroke="#c7ae91" strokeWidth="10" fill="none" strokeLinecap="round"/><circle cx="29" cy="100" r="6" fill="#dab08d"/>
        <ellipse cx="46" cy="40" rx="20" ry="24" fill="#dfb28e"/>
        <path d="M26 41 Q20 10 44 13 Q66 10 69 37 Q60 30 55 24 Q39 34 26 41Z" fill="#303541"/>
        <path d="M35 40 L39 40 M52 40 L56 40 M43 49 Q47 53 52 49" stroke="#674d40" fill="none" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
      {flow === 'register' && <><span className="owl-outcome__gift">✦</span><span className="owl-outcome__confetti" /></>}
      <span className="owl-outcome__floor" />
    </div>
    <button type="button" className="owl-outcome__skip" onClick={onSkip}>Bỏ qua <span aria-hidden="true">↗</span></button>
  </div>;
};
