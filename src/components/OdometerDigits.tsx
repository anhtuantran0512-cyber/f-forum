/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useRef, useState } from 'react';

/**
 * CodeFronts cnc-08 — Odometer rolling digits (phiên bản dùng dữ liệu thật)
 * ---------------------------------------------------------------------------
 * Khác bản demo thuần CSS (quay vô hạn), ở đây mỗi cột số lăn tới ĐÚNG giá trị
 * cần hiển thị bằng transition, nên vừa giữ cảm giác cơ khí của đồng hồ cơ,
 * vừa đọc được số liệu thật (giờ học, điểm, phút…).
 */
export interface OdometerDigitsProps {
  value: number;
  /** Số chữ số thập phân hiển thị (mặc định 1 cho giờ học). */
  decimals?: number;
  /** Hậu tố nhỏ nằm cạnh số, ví dụ "giờ" hoặc "điểm". */
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Nhãn cho trình đọc màn hình. */
  ariaLabel?: string;
  /** Đếm tăng dần từ 0 tới giá trị thật khi vừa xuất hiện (mặc định bật). */
  countUp?: boolean;
}

const SIZE_CLASS: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-[22px]',
  md: 'text-[34px] sm:text-[40px]',
  lg: 'text-[44px] sm:text-[56px]',
};

const COLUMN_WIDTH: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-[0.62em]',
  md: 'w-[0.62em]',
  lg: 'w-[0.62em]',
};

interface DigitProps {
  char: string;
  size: 'sm' | 'md' | 'lg';
}

const DigitColumn: React.FC<DigitProps> = ({ char, size }) => {
  const digit = Number(char);
  const isDigit = Number.isFinite(digit);

  if (!isDigit) {
    return (
      <span
        className={`${COLUMN_WIDTH[size]} inline-flex items-end justify-center font-mono font-bold text-amber-300`}
        aria-hidden="true"
      >
        {char}
      </span>
    );
  }

  return (
    <span
      className={`ff-odo__col ${COLUMN_WIDTH[size]}`}
      aria-hidden="true"
      data-digit={digit}
    >
      <span
        className="ff-odo__strip"
        style={{ transform: `translateY(calc(var(--ff-odo-d, ${digit}) * -1em))` }}
      >
        {Array.from({ length: 11 }).map((_, i) => (
          <i key={i} className={size === 'sm' ? 'text-[22px]' : undefined}>
            {i % 10}
          </i>
        ))}
      </span>
    </span>
  );
};

export const OdometerDigits: React.FC<OdometerDigitsProps> = ({
  value,
  decimals = 1,
  unit,
  size = 'md',
  className = '',
  ariaLabel,
  countUp = true,
}) => {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const [animated, setAnimated] = useState<number>(countUp ? 0 : safeValue);
  const fromRef = useRef<number>(countUp ? 0 : safeValue);

  /* Đếm tăng dần: cột số lăn liên tục nhờ transition ngắn của .ff-odo__strip */
  useEffect(() => {
    if (!countUp) return;
    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduce ? 1 : 900;
    const from = fromRef.current;
    const to = safeValue;
    const startedAt = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimated(from + (to - from) * eased);
      if (t < 1) raf = window.requestAnimationFrame(step);
      else fromRef.current = to;
    };
    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, [safeValue, countUp]);

  const shownValue = countUp ? animated : safeValue;
  const fixed = shownValue.toFixed(decimals);
  /* Nhãn đọc màn hình luôn dùng giá trị đích, không dùng số đang đếm dở */
  const finalFixed = safeValue.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const groupedInt = Number(intPart).toLocaleString('en-US');

  return (
    <span
      className={`ff-odo inline-flex items-end gap-[2px] ${SIZE_CLASS[size]} ${className}`}
      role="img"
      aria-label={ariaLabel || `${finalFixed} ${unit || ''}`.trim()}
    >
      <span className="ff-odo__meter inline-flex items-center" aria-hidden="true">
        {groupedInt.split('').map((char, idx) => (
          <React.Fragment key={`i-${idx}`}>
            <DigitColumn char={char} size={size} />
          </React.Fragment>
        ))}
        {decPart !== undefined && decimals > 0 && (
          <>
            <span className="ff-odo__sep" aria-hidden="true">
              ,
            </span>
            {decPart.split('').map((char, idx) => (
              <DigitColumn key={`d-${idx}`} char={char} size={size} />
            ))}
          </>
        )}
      </span>
      {unit && <small className="ff-odo__unit">{unit}</small>}
    </span>
  );
};

export default OdometerDigits;
