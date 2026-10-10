/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import { FlipClock } from './ui/FlipClock';

interface CircularProgressRingProps {
  progress: number; /* 0-100 */
  size?: number; /* px, mặc định 280 */
  strokeWidth?: number; /* mặc định 6 */
  label?: string;
  /** Hiển thị thời gian bằng đồng hồ lật (code_yeucau · cdt-22) thay cho chữ số tĩnh. */
  flip?: boolean;
  milestone?: { reached: boolean; label: string; minutes: number };
  /** Khi true: hào quang phía sau "thở" nhẹ — dùng trong lúc phiên đang chạy */
  breathing?: boolean;
  className?: string;
}

/**
 * Vòng tròn tiến trình cao cấp cho đồng hồ Focus:
 * - Gradient XOAY liên tục (SMIL animateTransform — chỉ đổi một thuộc tính
 *   SVG, không đụng layout nên gần như miễn phí CPU/GPU).
 * - Hiệu ứng "thở" (breathing) ở hào quang: luôn chạy nhẹ khi đang học,
 *   bung sáng rực khi đạt mốc phần thưởng.
 * - Keyframes ringBreath sống trong index.css; reduced-motion được CSS tự tắt.
 */
export const CircularProgressRing: React.FC<CircularProgressRingProps> = ({
  progress,
  size = 280,
  strokeWidth = 6,
  label,
  flip = false,
  milestone,
  breathing = false,
  className = '',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const center = size / 2;
  const isCelebrating = Boolean(milestone?.reached);
  const isBreathing = breathing || isCelebrating;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size, transform: 'translate3d(0,0,0)' }}
      role="timer"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || 'Tiến trình'}
    >
      {/* SVG Ring */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ transform: 'rotate(-90deg)' }}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="progressGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#a78bfa" />
            {/* Gradient xoay 360° quanh tâm — đồng hồ luôn "sống" và chuyển động */}
            <animateTransform
              attributeName="gradientTransform"
              type="rotate"
              from="0 0.5 0.5"
              to="360 0.5 0.5"
              dur="8s"
              repeatCount="indefinite"
            />
          </linearGradient>
        </defs>

        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />

        {/* Progress ring with glow */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            filter: isCelebrating
              ? 'drop-shadow(0 0 12px rgba(245,158,11,0.6)) drop-shadow(0 0 24px rgba(244,114,182,0.4))'
              : isBreathing
                ? 'drop-shadow(0 0 10px rgba(34,211,238,0.45))'
                : 'drop-shadow(0 0 8px rgba(245,158,11,0.4))',
            transition: 'stroke-dashoffset 0.5s cubic-bezier(0.22, 1, 0.36, 1), filter 0.4s ease',
          }}
        />

        {/* Inner glow ring (breathing khi đang chạy hoặc đạt mốc) */}
        <circle
          cx={center}
          cy={center}
          r={radius + 8}
          fill="none"
          stroke={isBreathing ? (isCelebrating ? 'rgba(245,158,11,0.35)' : 'rgba(34,211,238,0.28)') : 'transparent'}
          strokeWidth={2}
          opacity={isBreathing ? 0.6 : 0}
          style={{
            animation: isBreathing ? 'ringBreath 2.4s ease-in-out infinite' : 'none',
            transition: 'opacity 0.3s ease, stroke 0.3s ease',
          }}
        />
      </svg>

      {/* Inner content */}
      <div
        className="relative z-10 flex flex-col items-center justify-center text-center"
        style={{
          width: size * 0.65,
          height: size * 0.65,
          background: 'rgba(8,11,17,0.6)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '50%',
          padding: '1.5rem',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Time display */}
        {flip && label && /^\d{2}:\d{2}$/.test(label) ? (
          <FlipClock value={label} size={size > 240 ? 'lg' : 'md'} running={isBreathing} />
        ) : (
          <span
            className="text-4xl sm:text-5xl font-extrabold tracking-tight"
            style={{
              fontFamily: "'Geist Mono Variable', ui-monospace, monospace",
              color: '#f1f5f9',
              lineHeight: 1,
              textShadow: isCelebrating
                ? '0 0 30px rgba(245,158,11,0.5), 0 0 60px rgba(244,114,182,0.3)'
                : isBreathing
                  ? '0 0 24px rgba(34,211,238,0.35)'
                  : '0 0 20px rgba(255,255,255,0.2)',
              fontSize: size > 240 ? '3.5rem' : '2.5rem',
              transition: 'text-shadow 0.4s ease',
            }}
          >
            {label}
          </span>
        )}

        {/* State label */}
        <span
          className="text-xs font-semibold uppercase tracking-widest mt-1"
          style={{
            color: isCelebrating ? '#fbbf24' : isBreathing ? '#67e8f9' : '#64748b',
            letterSpacing: '0.15em',
          }}
        >
          {isCelebrating ? milestone?.label : isBreathing ? 'ĐANG TẬP TRUNG' : (label || 'ĐANG CHỜ')}
        </span>

        {/* Milestone indicator */}
        {isCelebrating && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center"
            style={{
              width: 28,
              height: 28,
              background: 'linear-gradient(135deg, #f59e0b, #f472b6)',
              borderRadius: '50%',
              boxShadow: '0 0 20px rgba(245,158,11,0.5)',
            }}
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-black" fill="currentColor">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        )}
      </div>

      {/* Ambient glow behind ring — "thở" nhẹ khi đang học, rực khi đạt mốc */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{
          background: isCelebrating
            ? 'radial-gradient(circle at center, rgba(245,158,11,0.2), transparent 70%)'
            : isBreathing
              ? 'radial-gradient(circle at center, rgba(34,211,238,0.14), transparent 70%)'
              : 'transparent',
          filter: 'blur(20px)',
          opacity: isBreathing ? (isCelebrating ? 0.8 : 0.4) : 0,
          animation: isBreathing ? 'ringBreath 2.4s ease-in-out infinite' : 'none',
          transition: 'opacity 0.5s ease, background 0.5s ease',
          transform: isBreathing ? 'scale(1)' : 'scale(0.8)',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />
    </div>
  );
};

export default CircularProgressRing;
