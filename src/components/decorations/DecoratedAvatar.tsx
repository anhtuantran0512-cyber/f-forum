/* Bản quyền trí tuệ thuộc về BroAmStuck */
/*
 * Nhiệm vụ 10 — wrapper tiện lợi: user (từ /api/sync) → avatar + trang trí.
 *  - DecoratedAvatar: tự resolve 3 slot đã TRANG BỊ (chỉ item hữu — không lộ).
 *  - DecoratedName: tên hiển thị nằm TRÊN bảng tên (contrast bằng text-shadow).
 * Catalog chưa tải xong → render avatar thường (không có khung) — không lỗi.
 */
import { memo } from 'react';
import type { User } from '../../types/index';
import type { ShopItem, DecorationType } from '../../types/index';
import { useUserDecorations } from '../../utils/decorationStore';
import { AvatarWithDecoration, type DecorationAssetRef } from './AvatarWithDecoration';
import { NameplateDisplay } from './NameplateDisplay';

const shopItemToAsset = (item: ShopItem | null | undefined): DecorationAssetRef | null => {
  if (!item) return null;
  const type: DecorationType = item.category === 'Nameplate' ? 'nameplate' : item.category === 'Avatar Aura' ? 'Avatar Aura' === item.category ? 'avatar_aura' : 'avatar_frame' : 'avatar_frame';
  return {
    type,
    id: item.id,
    fullAssetUrl: item.fullAssetUrl,
    animatedAssetUrl: item.animatedAssetUrl,
    isAnimated: !!item.isAnimated && !!item.animatedAssetUrl,
  };
};

interface DecoratedAvatarProps {
  user: Pick<User, 'inventory' | 'equippedDecorations' | 'avatar'> | null | undefined;
  fallbackSrc?: string;
  size: number;
  animate?: boolean;
  eager?: boolean;
  priority?: 'high' | 'low';
  className?: string;
  alt?: string;
}

export const DecoratedAvatar = memo(({
  user,
  fallbackSrc,
  size,
  animate = true,
  eager = false,
  priority,
  className,
  alt,
}: DecoratedAvatarProps) => {
  const { frame, aura } = useUserDecorations(user);
  /* KHUNG và HÀO QUANG là 2 slot độc lập — truyền CẢ HAI (trước đây chỉ gộp
     1 slot → user đeo đủ 2 chỉ thấy khung, mất hào quang — gãy trải nghiệm). */
  return (
    <AvatarWithDecoration
      avatarUrl={user?.avatar || fallbackSrc || ''}
      frameAsset={shopItemToAsset(frame)}
      auraAsset={shopItemToAsset(aura)}
      size={size}
      animate={animate}
      eager={eager}
      priority={priority || (eager ? 'high' : 'low')}
      className={className}
      alt={alt}
    />
  );
});

interface UserNameplateBgProps {
  user?: Pick<User, 'inventory' | 'equippedDecorations'> | null | undefined;
  width?: number;
  animate?: boolean;
  eager?: boolean;
  priority?: 'high' | 'low';
  className?: string;
  overrideAsset?: DecorationAssetRef | null;
}

/**
 * Lớp nền Nameplate chuẩn Discord cho Thanh Profile Người Dùng (Navbar, Menu Tài Khoản,
 * và Thẻ nhanh Trang cá nhân / Tố cáo). Đặt tuyệt đối bên trong thanh user bar với
 * overflow-hidden riêng để KHÔNG cắt mất cánh/tia sáng của khung viền Avatar (DecoratedAvatar).
 */
export const UserNameplateBg = memo(({
  user,
  width = 240,
  animate = true,
  eager = true,
  priority = 'high',
  className,
  overrideAsset,
}: UserNameplateBgProps) => {
  const { nameplate } = useUserDecorations(user);
  const asset = overrideAsset !== undefined ? overrideAsset : shopItemToAsset(nameplate);
  if (!asset) return null;
  return (
    <span className={`ff-discord-np-layer${className ? ` ${className}` : ''}`} aria-hidden="true">
      <NameplateDisplay
        asset={asset}
        size={width}
        animate={animate}
        eager={eager}
        priority={priority}
        fill
        className="npd-np__bg"
      />
      <span className="ff-discord-np-layer__scrim" />
    </span>
  );
});

interface DecoratedNameProps {
  user?: Pick<User, 'inventory' | 'equippedDecorations'> | null | undefined;
  name: string;
  /** Rộng vùng bảng tên (px). Mặc định 240 (tỉ lệ chuẩn 448:84). */
  width?: number;
  /** Giới hạn bề rộng tối đa khi tên dài tự giãn (mặc định 340px). */
  maxWidth?: number;
  /** Chiều cao vùng bảng tên (px). Tự suy ra từ width nếu không truyền. */
  height?: number;
  animate?: boolean;
  eager?: boolean;
  priority?: 'high' | 'low';
  className?: string;
  /** Khi chưa gắn nameplate từ shop, vẫn hiển thị khung nametag mặc định để tên luôn căn giữa trên bảng tên. */
  showFallbackTag?: boolean;
  /** Cho phép truyền trực tiếp asset để xem trước/đổi nhanh trên Trang cá nhân hoặc Boutique. */
  overrideAsset?: DecorationAssetRef | null;
}

export const DecoratedName = memo(({
  user,
  name,
  width = 240,
  maxWidth = 340,
  height: customHeight,
  animate = true,
  eager = true,
  priority = 'high',
  className,
  showFallbackTag = false,
  overrideAsset,
}: DecoratedNameProps) => {
  const { nameplate } = useUserDecorations(user);
  const asset = overrideAsset !== undefined ? overrideAsset : shopItemToAsset(nameplate);
  const height = customHeight ?? Math.max(24, Math.round((width * 84) / 448));
  const len = name.trim().length;
  const charPx = height <= 28 ? 7.6 : height <= 34 ? 8.3 : 9.0;
  const adaptiveWidth = Math.max(width, Math.min(maxWidth, Math.ceil(len * charPx + 28)));
  const fontSize =
    len > 28
      ? '10px'
      : len > 24
      ? '10.5px'
      : len > 18
      ? '11px'
      : height <= 30
      ? '11.5px'
      : height <= 35
      ? '12.5px'
      : undefined;
  const letterSpacing = len > 24 ? '-0.015em' : undefined;
  const textStyle: React.CSSProperties | undefined =
    fontSize || letterSpacing ? { fontSize, letterSpacing } : undefined;
  const horizontalPad = len > 18 ? '8px' : height <= 30 ? '10px' : height <= 35 ? '12px' : undefined;
  const boxStyle: React.CSSProperties = {
    minWidth: 0,
    width: adaptiveWidth,
    maxWidth: '100%',
    height,
    aspectRatio: 'auto',
    paddingLeft: horizontalPad,
    paddingRight: horizontalPad,
  };

  if (!asset) {
    if (!showFallbackTag) {
      return <span className={className} title={name}>{name}</span>;
    }
    return (
      <span
        className={`npd-np npd-np--default${className ? ` ${className}` : ''}`}
        style={boxStyle}
        title={name}
      >
        <span className="npd-np__text" style={textStyle}>{name}</span>
      </span>
    );
  }
  /*
   * CHUẨN DISCORD: container inline-flex căn giữa theo cả 2 trục, tự mở rộng
   * bề ngang theo độ dài tên (tới tối đa khung chứa) để tên dài không bị cắt "..."
   * trong phòng chat.
   */
  return (
    <span
      className={`npd-np${className ? ` ${className}` : ''}`}
      style={boxStyle}
      title={name}
    >
      <NameplateDisplay
        asset={asset}
        size={adaptiveWidth}
        animate={animate}
        eager={eager}
        priority={priority}
        fill
        className="npd-np__bg"
      />
      <span className="npd-np__text" style={textStyle}>{name}</span>
    </span>
  );
});
