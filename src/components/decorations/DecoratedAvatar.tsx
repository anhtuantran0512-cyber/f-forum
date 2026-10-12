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
  const type: DecorationType = item.category === 'Nameplate' ? 'nameplate' : item.category === 'Avatar Aura' ? 'avatar_aura' : 'avatar_frame';
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
  className?: string;
  alt?: string;
}

export const DecoratedAvatar = ({ user, size, animate = true, eager = false, className, alt }: DecoratedAvatarProps) => {
  const { frame, aura } = useUserDecorations(user);
  const slotAsset = shopItemToAsset(frame) || shopItemToAsset(aura) || null;
  return (
    <AvatarWithDecoration
      avatarUrl={user?.avatar || ''}
      decorationAsset={slotAsset}
      size={size}
      animate={animate}
      eager={eager}
      className={className}
      alt={alt}
    />
  );
};

interface DecoratedNameProps {
  user: Pick<User, 'inventory' | 'equippedDecorations'> | null | undefined;
  name: string;
  /** Rộng vùng bảng tên (px). Mặc định 180. */
  width?: number;
  animate?: boolean;
  className?: string;
}

export const DecoratedName = ({ user, name, width = 180, animate = true, className }: DecoratedNameProps) => {
  const { nameplate } = useUserDecorations(user);
  const asset = shopItemToAsset(nameplate);
  if (!asset) return <span className={className}>{name}</span>;
  /*
   * CHUẨN DISCORD: container height CỐ ĐỊNH theo tỉ lệ 448:84 (không giãn theo
   * tên), overflow hidden — tên dài bao nhiêu cũng chỉ ellipsis, KHÔNG TRÀN.
   * Background = asset thuần (fill, z1); tên = <span> HTML riêng (z2, ellipsis).
   */
  return (
    <span className={`npd-np${className ? ` ${className}` : ''}`} style={{ width }}>
      <NameplateDisplay asset={asset} size={width} animate={animate} fill className="npd-np__bg" />
      <span className="npd-np__text">{name}</span>
    </span>
  );
};
