/* Shared role mark: one canonical icon and palette wherever identity is shown. */
import type { CSSProperties, FC } from 'react';
import { getRoleDetails, type RoleActor } from '../utils/roleIdentity';

export interface RoleMarkProps {
  user?: RoleActor | null;
  role?: string | null;
  staffRole?: string | null;
  isSuperAdmin?: boolean;
  size?: number;
  showLabel?: boolean;
  className?: string;
}

export const RoleMark: FC<RoleMarkProps> = ({
  user,
  role,
  staffRole,
  isSuperAdmin = false,
  size = 13,
  showLabel = false,
  className = '',
}) => {
  const details = getRoleDetails({
    role: role ?? user?.role,
    staffRole: staffRole ?? user?.staffRole,
  }, isSuperAdmin);
  if (!details) return null;

  const Icon = details.icon;
  const accessibleLabel = `${details.label} · ${details.description}`;
  const style = { '--ff-role-icon-size': `${size}px` } as CSSProperties;
  return (
    <span
      className={`ff-role-mark ff-role-mark--${details.key}${showLabel ? ' ff-role-mark--label' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      title={accessibleLabel}
      aria-label={accessibleLabel}
      role="img"
    >
      <Icon size={size} aria-hidden="true" />
      {showLabel && <span>{details.label}</span>}
    </span>
  );
};
