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
  glowColor,
  onClick,
  role,
  "aria-label": ariaLabel,
}) => {
  /* Epic 4 — Clay 2.0 đồng bộ: cùng một công thức với .pc-12-card (index.css),
     có sẵn biến thể chế độ sáng; không còn inline style riêng lệch tông. */
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      role={role}
      aria-label={ariaLabel}
      className={`pc-12-card relative overflow-hidden ${hover ? 'pc-12-card--lift' : ''} ${onClick ? 'cursor-pointer text-left' : ''} ${paddingMap[padding]} ${className}`}
      style={glowColor ? ({ '--clay-glow': glowColor } as React.CSSProperties) : undefined}
    >
      {children}
    </Component>
  );
};

/* Clay Avatar sub-component */
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

  return (
    <div
      className={`pc-12-avatar relative shrink-0 overflow-hidden ${className}`}
      style={{ width, height, borderRadius: `${radius}px` }}
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

/* Clay Stat Block sub-component */
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
  <div className={`pc-12-stat text-center ${className}`} style={{ '--stat-accent': accentColor } as React.CSSProperties}>
    {icon && <div className="pc-12-stat__icon flex justify-center mb-1">{icon}</div>}
    <div className="pc-12-stat__value font-mono">{value}</div>
    <div className="pc-12-stat__label">{label}</div>
  </div>
);

export default ClaymorphismCard;
