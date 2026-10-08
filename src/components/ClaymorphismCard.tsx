/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';

interface ClaymorphismCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  glowColor?: string;
  role?: string;
  "aria-label"?: string;
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-6 sm:p-7',
  xl: 'p-8 sm:p-10',
};

export const ClaymorphismCard: React.FC<ClaymorphismCardProps> = ({
  children,
  className = '',
  padding = 'md',
  hover = true,
  glowColor = 'rgba(245,158,11,0.3)',
  onClick,
  role,
  "aria-label": ariaLabel,
}) => {
  const Component = onClick ? 'button' : 'div';
  const paddingClass = paddingMap[padding];

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      role={role}
      aria-label={ariaLabel}
      className={`
        relative overflow-hidden rounded-[2rem] cursor-pointer
        ${hover ? 'transition-all duration-300' : ''}
        ${paddingClass}
        ${className}
      `}
      style={{
        // Claymorphism 2.0 — nhiều lớp bóng tạo chiều sâu đất sét
        background: 'linear-gradient(145deg, rgba(255,255,255,0.12), rgba(0,0,0,0.25))',
        borderRadius: '2rem',
        boxShadow: hover 
          ? undefined 
          : `
            inset 0 2px 0 rgba(255,255,255,0.3),
            inset 0 -3px 0 rgba(0,0,0,0.2),
            0 15px 35px rgba(0,0,0,0.3)
          `,
        border: onClick ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        transition: hover 
          ? 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' 
          : undefined,
        cursor: onClick ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => {
        if (!hover) return;
        const target = e.currentTarget as HTMLElement;
        target.style.transform = 'translateY(-4px) scale(1.01)';
        target.style.boxShadow = `
          inset 0 2px 0 rgba(255,255,255,0.35),
          inset 0 -3px 0 rgba(0,0,0,0.25),
          0 24px 50px rgba(0,0,0,0.4),
          0 0 30px ${glowColor}
        `;
      }}
      onMouseLeave={(e) => {
        if (!hover) return;
        const target = e.currentTarget as HTMLElement;
        target.style.transform = 'translateY(0) scale(1)';
        target.style.boxShadow = `
          inset 0 2px 0 rgba(255,255,255,0.3),
          inset 0 -3px 0 rgba(0,0,0,0.2),
          0 15px 35px rgba(0,0,0,0.3)
        `;
      }}
    >
      {/* Specular highlight top-left (Claymorphism signature) */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[2rem] overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0) 60%)',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: '1px',
          opacity: 0.6,
        }}
        aria-hidden="true"
      />

      {/* Content wrapper with inner glow */}
      <div
        className="relative z-10"
        style={{
          background: 'linear-gradient(160deg, rgba(255,255,255,0.08), rgba(0,0,0,0.12))',
          borderRadius: '1.5rem',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
        }}
      >
        {children}
      </div>
    </Component>
  );
};

// Clay Avatar sub-component
interface ClayAvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  borderColor?: string;
  className?: string;
  onClick?: () => void;
}

const sizeMap = {
  sm: { width: 64, height: 64, radius: 12 },
  md: { width: 80, height: 80, radius: 14 },
  lg: { width: 100, height: 100, radius: 18 },
  xl: { width: 120, height: 120, radius: 20 },
};

export const ClayAvatar: React.FC<ClayAvatarProps> = ({
  src,
  alt,
  size = 'lg',
  className = '',
}) => {
  const { width, height, radius } = sizeMap[size];
  const border = 'rgba(255,255,255,0.18)';

  return (
    <div
      className={`relative shrink-0 overflow-hidden ${className}`}
      style={{
        width,
        height,
        borderRadius: `${radius}px`,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(0,0,0,0.1))',
        boxShadow: `
          inset 0 2px 0 rgba(255,255,255,0.3),
          0 8px 20px rgba(0,0,0,0.3)
        `,
        border: border ? `2px solid ${border}` : '2px solid rgba(255,255,255,0.08)',
        transition: 'box-shadow 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: `${radius - 2}px`,
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size === 'xl' ? '2rem' : '1.25rem',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.6)',
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1), transparent)',
          }}
        >
          {alt.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Clay shimmer overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 60%)',
          opacity: 0.5,
          mixBlendMode: 'overlay',
        }}
        aria-hidden="true"
      />
    </div>
  );
};

// Clay Stat Block sub-component
interface ClayStatProps {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  accentColor?: string;
  className?: string;
  onClick?: () => void;
}

export const ClayStat: React.FC<ClayStatProps> = ({
  value,
  label,
  icon,
  accentColor = '#f59e0b',
  className = '',
}) => (
  <div
    className={`text-center ${className}`}
    style={{
      background: 'linear-gradient(145deg, rgba(255,255,255,0.1), rgba(0,0,0,0.15))',
      borderRadius: '1rem',
      padding: '1rem',
      boxShadow: `
        inset 0 1px 0 rgba(255,255,255,0.15),
        0 4px 12px rgba(0,0,0,0.2)
      `,
    }}
  >
    {icon && (
      <div
        className="flex justify-center mb-1"
        style={{ opacity: 0.8 }}
      >
        {icon}
      </div>
    )}
    <div
      className="text-2xl font-bold font-mono"
      style={{
        color: accentColor,
        fontSize: '1.5rem',
        lineHeight: 1,
      }}
    >
      {value}
    </div>
    <div
      className="text-xs uppercase tracking-widest mt-1"
      style={{
        color: 'rgba(100,116,139,1)',
        fontSize: '0.7rem',
        letterSpacing: '0.1em',
      }}
    >
      {label}
    </div>
  </div>
);

export default ClaymorphismCard;
