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
      {flow === 'register' && <><span className="owl-outcome__gift">✦</span><span className="owl-outcome__confetti" /></>}
      <span className="owl-outcome__floor" />
    </div>
    <button type="button" className="owl-outcome__skip" onClick={onSkip}>Bỏ qua <span aria-hidden="true">↗</span></button>
  </div>;
};
