/* Bản quyền trí tuệ thuộc về BroAmStuck */
/*
 * Nhiệm vụ 10 — wrapper tiện lợi: user (từ /api/sync) → avatar + trang trí.
 *  - DecoratedAvatar: tự resolve 3 slot đã TRANG BỊ (chỉ item hữu — không lộ).
 *  - DecoratedName: tên hiển thị nằm TRÊN bảng tên (contrast bằng text-shadow).
 * Catalog chưa tải xong → render avatar thường (không có khung) — không lỗi.
 */
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
  size: number;
  animate?: boolean;
  eager?: boolean;
  priority?: 'high' | 'low';
  className?: string;
  alt?: string;
}

export const DecoratedAvatar = ({
  user,
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
      avatarUrl={user?.avatar || ''}
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
};

interface DecoratedNameProps {
  user: Pick<User, 'inventory' | 'equippedDecorations'> | null | undefined;
  name: string;
  /** Rộng vùng bảng tên (px). Mặc định 224 (tỉ lệ chuẩn 448:84 ở cao 42px). */
  width?: number;
  animate?: boolean;
  priority?: 'high' | 'low';
  className?: string;
}

export const DecoratedName = ({
  user,
  name,
  width = 224,
  animate = true,
  priority = 'high',
  className,
}: DecoratedNameProps) => {
  const { nameplate } = useUserDecorations(user);
  const asset = shopItemToAsset(nameplate);
  if (!asset) return <span className={className}>{name}</span>;
  /*
   * CHUẨN DISCORD: container inline-flex căn giữa theo cả 2 trục, tỉ lệ 448:84
   * cố định — tên luôn nằm chính giữa bảng tên, không lệch góc, không đè viền.
   */
  const height = Math.round((width * 84) / 448);
  return (
    <span className={`npd-np${className ? ` ${className}` : ''}`} style={{ width, height }}>
      <NameplateDisplay
        asset={asset}
        size={width}
        animate={animate}
        priority={priority}
        fill
        className="npd-np__bg"
      />
      <span className="npd-np__text">{name}</span>
    </span>
  );
};
