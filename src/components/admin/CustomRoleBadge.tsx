/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Huy hiệu vai trò tùy chỉnh (Epic 3 — mục 3.5). Icon chỉ lấy từ whitelist
 * trùng khớp CUSTOM_ROLE_ICONS phía máy chủ; màu là mã hex đã được server kiểm tra.
 */
import type { CSSProperties, FC } from 'react';
import { Crown, Flame, Gem, GraduationCap, Heart, Shield, Sparkles, Star, Swords, Zap } from 'lucide-react';
import { safeRoleColor } from './adminConstants';

/** Icon vai trò theo ID — switch tĩnh, không tạo component động trong lúc render. */
export const RoleIcon: FC<{ id: string; size?: number }> = ({ id, size = 12 }) => {
  switch (id) {
    case 'graduation-cap': return <GraduationCap size={size} aria-hidden="true" />;
    case 'star': return <Star size={size} aria-hidden="true" />;
    case 'zap': return <Zap size={size} aria-hidden="true" />;
    case 'crown': return <Crown size={size} aria-hidden="true" />;
    case 'sparkles': return <Sparkles size={size} aria-hidden="true" />;
    case 'heart': return <Heart size={size} aria-hidden="true" />;
    case 'swords': return <Swords size={size} aria-hidden="true" />;
    case 'gem': return <Gem size={size} aria-hidden="true" />;
    case 'flame': return <Flame size={size} aria-hidden="true" />;
    default: return <Shield size={size} aria-hidden="true" />;
  }
};

interface CustomRoleBadgeProps {
  name: string;
  icon: string;
  color: string;
  specialChar?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CustomRoleBadge: FC<CustomRoleBadgeProps> = ({ name, icon, color, specialChar = '', size = 'sm', className = '' }) => {
  const tint = safeRoleColor(color);
  const iconSize = size === 'lg' ? 15 : size === 'md' ? 13 : 12;
  return (
    <span
      className={`ffr-badge ffr-badge--${size} ${className}`}
      style={{ '--ffr-color': tint } as CSSProperties}
      title={`Vai trò: ${name}`}
    >
      <RoleIcon id={icon} size={iconSize} />
      {specialChar && <span className="ffr-badge__char" aria-hidden="true">{specialChar}</span>}
      <span className="ffr-badge__name">{name}</span>
    </span>
  );
};
