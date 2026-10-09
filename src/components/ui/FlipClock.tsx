/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { useState } from 'react';
import './FlipClock.css';

/**
 * Một ô lật split-flap. Khi chữ số đổi: nửa trên của số cũ gập xuống
 * (rotateX 0 → -90°), rồi nửa dưới của số mới mở ra (90° → 0) — bản lề nằm giữa.
 * Trạng thái được suy ra ngay trong lúc render (mẫu "derived state" của React)
 * nên không cần effect.
 */
function FlipDigit({ digit }: { digit: string }) {
  const [state, setState] = useState({ cur: digit, prev: digit, n: 0, flipping: false });
  if (state.cur !== digit) {
    setState({ cur: digit, prev: state.cur, n: state.n + 1, flipping: true });
  }
  const { cur, prev, n, flipping } = state;
  const settle = () => setState((s) => (s.n === n ? { ...s, flipping: false } : s));
  return (
    <span className="ff-flip__card">
      <span className="ff-flip__half ff-flip__half--top"><span>{cur}</span></span>
      <span className="ff-flip__half ff-flip__half--bottom"><span>{flipping ? prev : cur}</span></span>
      {flipping && (
        <>
          <span key={`t${n}`} className="ff-flip__flap ff-flip__flap--top"><span>{prev}</span></span>
          <span key={`b${n}`} className="ff-flip__flap ff-flip__flap--bottom" onAnimationEnd={settle}>
            <span>{cur}</span>
          </span>
        </>
      )}
    </span>
  );
}

interface FlipClockProps {
  /** Chuỗi dạng "MM:SS" hoặc "HH:MM:SS". */
  value: string;
  size?: 'md' | 'lg';
  running?: boolean;
}

/** Đồng hồ lật retro (code_yeucau · cdt-22) — dùng cho bộ đếm của phòng Focus. */
export function FlipClock({ value, size = 'md', running = false }: FlipClockProps) {
  const groups = value.split(':');
  return (
    <span className={`ff-flip ff-flip--${size}${running ? ' is-running' : ''}`} aria-hidden="true">
      {groups.map((group, gi) => (
        <span key={gi} className="ff-flip__group">
          {gi > 0 && <span className="ff-flip__sep">:</span>}
          {group.split('').map((ch, ci) => (
            <FlipDigit key={ci} digit={ch} />
          ))}
        </span>
      ))}
    </span>
  );
}

export default FlipClock;
