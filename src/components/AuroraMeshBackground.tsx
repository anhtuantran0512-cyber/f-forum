/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';

interface AuroraMeshBackgroundProps {
  /** Bật/tắt nền mesh */
  active?: boolean;
  /** Độ mờ của các orb */
  blur?: number;
  /** Tốc độ animation (giờ) */
  speed?: number;
  /** Độ in透明 của orb */
  opacity?: number;
  className?: string;
}

export const AuroraMeshBackground: React.FC<AuroraMeshBackgroundProps> = ({
  active = true,
  blur = 100,
  speed = 20,
  opacity = 0.5,
  className = '',
}) => {
  // Không render nếu không active
  if (!active) return null;

  return (
    <>
      {/* Injected keyframes nếu chưa có */}
      <style>{`
        @keyframes potatorMeshDrift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(3%, 2%) scale(1.02); }
          50% { transform: translate(-2%, 3%) scale(0.98); }
          75% { transform: translate(1%, -2%) scale(1.01); }
        }
        
        @keyframes auroraFloat {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: ${opacity}; }
          33% { transform: translate(2%, 1%) scale(1.05); opacity: ${opacity + 0.1}; }
          66% { transform: translate(-1%, -1%) scale(0.95); opacity: ${opacity - 0.05}; }
        }
      `}</style>

      {/* Main mesh container */}
      <div
        className={`potator-mesh-bg ${className}`}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {/* Amber orb - large, warm glow */}
        <div
          className="potator-mesh-bg__orb"
          style={{
            width: '60vmax',
            height: '60vmax',
            top: '-20%',
            left: '-10%',
            background: `
              radial-gradient(circle at 30% 40%, rgba(245,158,11,0.4), transparent 60%),
              radial-gradient(circle at 70% 60%, rgba(244,114,182,0.3), transparent 55%)
            `,
            filter: `blur(${blur}px)`,
            opacity,
            animation: `potatorMeshDrift ${speed}s ease-in-out infinite`,
            animationDelay: '0s',
          }}
        />

        {/* Violet orb - cool accent */}
        <div
          className="potator-mesh-bg__orb"
          style={{
            width: '50vmax',
            height: '50vmax',
            bottom: '-15%',
            right: '-5%',
            background: `
              radial-gradient(circle at 60% 30%, rgba(167,139,250,0.35), transparent 55%),
              radial-gradient(circle at 40% 70%, rgba(34,211,238,0.25), transparent 50%)
            `,
            filter: `blur(${blur * 0.9}px)`,
            opacity: opacity * 0.8,
            animation: `potatorMeshDrift ${speed * 1.1}s ease-in-out infinite`,
            animationDelay: '-7s',
          }}
        />

        {/* Cyan orb - subtle accent */}
        <div
          className="potator-mesh-bg__orb"
          style={{
            width: '40vmax',
            height: '40vmax',
            top: '40%',
            right: '20%',
            background: `
              radial-gradient(circle at 50% 50%, rgba(34,211,238,0.2), transparent 50%)
            `,
            filter: `blur(${blur * 0.8}px)`,
            opacity: opacity * 0.6,
            animation: `potatorMeshDrift ${speed * 0.9}s ease-in-out infinite`,
            animationDelay: '-14s',
          }}
        />

        {/* Subtle grain overlay (optional, performance-friendly) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              repeating-conic-gradient(
                rgba(255,255,255,0.01) 0deg 1deg,
                transparent 1deg 2deg
              )
            `,
            opacity: 0.3,
            mixBlendMode: 'overlay',
            pointerEvents: 'none',
            zIndex: 1,
          }}
          aria-hidden="true"
        />

        {/* Vignette overlay - посреди center sáng hơn edges */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(6,10,20,0.4) 100%)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
          aria-hidden="true"
        />
      </div>
    </>
  );
};

export default AuroraMeshBackground;
