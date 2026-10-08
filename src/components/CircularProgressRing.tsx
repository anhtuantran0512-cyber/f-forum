/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useRef } from 'react';

interface CircularProgressRingProps {
  progress: number;          // 0-100
  size?: number;              // px, mặc định 280
  strokeWidth?: number;       // mặc định 6
  duration?: number;          // total seconds
  elapsed?: number;           // elapsed seconds
  label?: string;
  milestone?: { reached: boolean; label: string; minutes: number };
  className?: string;
}

export const CircularProgressRing: React.FC<CircularProgressRingProps> = ({
  progress,
  size = 280,
  strokeWidth = 6,
  label,
  milestone,
  className = '',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const center = size / 2;
  
  // Gradient animation: rotate gradient angle based on progress
  // Confetti burst trigger
  const burstRef = useRef(false);
  const prevProgressRef = useRef(0);
  
  useEffect(() => {
    if (milestone?.reached && prevProgressRef.current < 95 && progress >= 95 && !burstRef.current) {
      burstRef.current = true;
      // Dispatch custom event for confetti
      window.dispatchEvent(new CustomEvent('fforum-milestone-reached', {
        detail: { minutes: milestone.minutes, label: milestone.label }
      }));
      
      // Auto-reset burst flag after animation
      setTimeout(() => { burstRef.current = false; }, 2000);
    }
    prevProgressRef.current = progress;
  }, [progress, milestone]);

  // Breathing effect: subtle scale pulse
  const breathClass = milestone?.reached 
    ? 'animate-[ringBreath_2s_ease-in-out_infinite]' 
    : '';

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
            <stop 
              offset="0%" 
              stopColor="#f59e0b" 
              style={{ animation: `gradientShift 4s ease-in-out infinite` }}
            />
            <stop 
              offset="50%" 
              stopColor="#f472b6" 
              style={{ animation: `gradientShift 4s ease-in-out infinite 1s` }}
            />
            <stop 
              offset="100%" 
              stopColor="#a78bfa" 
              style={{ animation: `gradientShift 4s ease-in-out infinite 2s` }}
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
            filter: milestone?.reached 
              ? 'drop-shadow(0 0 12px rgba(245,158,11,0.6)) drop-shadow(0 0 24px rgba(244,114,182,0.4))'
              : 'drop-shadow(0 0 8px rgba(245,158,11,0.4))',
            transition: 'stroke-dashoffset 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
        
        {/* Inner glow ring (breathing) */}
        <circle
          cx={center}
          cy={center}
          r={radius + 8}
          fill="none"
          stroke={milestone?.reached ? 'rgba(245,158,11,0.3)' : 'transparent'}
          strokeWidth={2}
          opacity={milestone?.reached ? 0.6 : 0}
          style={{
            animation: milestone?.reached 
              ? 'ringBreath 2s ease-in-out infinite' 
              : 'none',
            transition: 'opacity 0.3s ease',
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
        <span
          className="text-4xl sm:text-5xl font-extrabold tracking-tight"
          style={{
            fontFamily: "'Geist Mono', ui-monospace, monospace",
            color: '#f1f5f9',
            lineHeight: 1,
            textShadow: milestone?.reached 
              ? '0 0 30px rgba(245,158,11,0.5), 0 0 60px rgba(244,114,182,0.3)' 
              : '0 0 20px rgba(255,255,255,0.2)',
            fontSize: size > 240 ? '3.5rem' : '2.5rem',
          }}
        >
          {label}
        </span>

        {/* State label */}
        <span
          className="text-xs font-semibold uppercase tracking-widest mt-1"
          style={{
            color: milestone?.reached ? '#fbbf24' : '#64748b',
            letterSpacing: '0.15em',
          }}
        >
          {milestone?.reached ? milestone.label : (label || 'ĐANG CHỜ')}
        </span>

        {/* Milestone indicator */}
        {milestone?.reached && (
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

      {/* Ambient glow behind ring (breathing effect) */}
      <div
        className={`absolute inset-0 rounded-full overflow-hidden ${breathClass}`}
        style={{
          background: milestone?.reached 
            ? 'radial-gradient(circle at center, rgba(245,158,11,0.2), transparent 70%)'
            : 'transparent',
          filter: 'blur(20px)',
          opacity: milestone?.reached ? 0.8 : 0,
          transition: 'opacity 0.5s ease, transform 0.5s ease',
          transform: milestone?.reached ? 'scale(1)' : 'scale(0.8)',
        }}
        aria-hidden="true"
      />
    </div>
  );
};

// Global keyframes for gradient animation (injected dynamically if not present)
export const injectGradientAnimation = (): void => {
  if (document.getElementById('circular-ring-keyframes')) return;
  
  const style = document.createElement('style');
  style.id = 'circular-ring-keyframes';
  style.textContent = `
    @keyframes ringBreath {
      0%, 100% { opacity: 0.6; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.05); }
    }
    
    @keyframes gradientShift {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    
    @keyframes confettiFall {
      0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
      100% { transform: translateY(100vh) rotate(720deg) scale(0.3); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
};

export default CircularProgressRing;
