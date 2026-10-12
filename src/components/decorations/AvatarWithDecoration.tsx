/* Bản quyền trí tuệ thuộc về BroAmStuck */
/*
 * Nhiệm vụ 10 — avatar + trang trí Discord (khung / hào quang / bảng tên).
 *  - Bản động: thẻ video autoplay / loop / muted / playsInline (blob URL từ cache RAM);
 *    người dùng bật prefers-reduced-motion hoặc trình duyệt không có VP9 alpha
 *    (Safari/iOS) → tự động về ảnh tĩnh fallback.
 *  - Đeo ĐƯỢC CẢ HAI: hào quang nằm SAU ảnh (z1), khung nằm TRÊN ảnh (z3);
 *    cả hai overflow visible (cánh, tia sáng… không bị cắt).
 *  - Lazy load qua IntersectionObserver (eager=true bỏ qua — navbar).
 */
import type { CSSProperties } from 'react';
import type { DecorationType } from '../../types/index';
import './decorations.css';
import { useInViewOnce } from './useDecorationMedia';
import { DecorationMedia } from './DecorationMedia';
import { getDecorationSafeZone } from '../../utils/decorationSafeZones.ts';

export interface DecorationAssetRef {
  type: DecorationType;
  /** Id catalog — tra safe zone (căn tâm artwork theo từng file). */
  id?: string;
  fullAssetUrl?: string | null;
  animatedAssetUrl?: string | null;
  isAnimated?: boolean;
}

interface AvatarWithDecorationProps {
  avatarUrl: string;
  /** Tiện dụng: 1 item (frame HOẶC aura) — tự về đúng slot theo type. */
  decorationAsset?: DecorationAssetRef | null;
  /** Khung (trên ảnh). Ưu tiên hơn decorationAsset nếu cùng type. */
  frameAsset?: DecorationAssetRef | null;
  /** Hào quang (sau ảnh). */
  auraAsset?: DecorationAssetRef | null;
  /** Cạnh avatar (px). Khung/hào quang tự scale theo size. */
  size: number;
  /** false = chỉ ảnh tĩnh (comment 32px, leaderboard…). Mặc định true. */
  animate?: boolean;
  /** Bỏ qua lazy-load (avatar navbar — luôn thấy). Mặc định false. */
  eager?: boolean;
  className?: string;
  alt?: string;
}
/*
 * CHUẨN DISCORD (fix 2026-10-12): component này CHỈ render frame/aura —
 * KHÔNG BAO GIỜ render nameplate. Nameplate (bảng tên + text tên) chỉ
 * xuất hiện ở Profile Card đầy đủ qua <DecoratedName/> (NameplateDisplay).
 * Mọi context avatar nhỏ (navbar, comment, leaderboard, shop preview) đều
 * đi qua component này → nameplate không thể hiện ở size nhỏ.
 */

export const AvatarWithDecoration = ({
  avatarUrl,
  decorationAsset,
  frameAsset,
  auraAsset,
  size,
  animate = true,
  eager = false,
  className,
  alt = 'Ảnh đại diện',
}: AvatarWithDecorationProps) => {
  const [inViewRef, inView] = useInViewOnce<HTMLDivElement>();
  const enabled = eager || inView;
  const frame = frameAsset || (decorationAsset && decorationAsset.type !== 'avatar_aura' ? decorationAsset : null) || null;
  const aura = auraAsset || (decorationAsset && decorationAsset.type === 'avatar_aura' ? decorationAsset : null) || null;
  const frameRef = eager ? undefined : inViewRef;
  /* Safe zone: dịch + scale từng slot theo config của asset (mặc định không đổi). */
  const zoneStyle = (id?: string): CSSProperties | undefined => {
    const z = getDecorationSafeZone(id);
    return z.dx || z.dy || (z.scale ?? 1) !== 1
      ? { transform: `translate(${z.dx || 0}%, ${z.dy || 0}%) scale(${z.scale ?? 1})` }
      : undefined;
  };

  return (
    <div
      ref={frameRef}
      className={`awd${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      data-size={size}
    >
      {aura && (
        <div className="awd__slot awd__slot--aura" style={zoneStyle(aura?.id)}>
          <DecorationMedia asset={aura} enabled={enabled} animate={animate} className="awd__deco awd__deco--aura" />
        </div>
      )}
      <img className="awd__avatar" src={avatarUrl} alt={alt} loading={eager ? 'eager' : 'lazy'} />
      {frame && (
        <div className="awd__slot awd__slot--frame" style={zoneStyle(frame?.id)}>
          <DecorationMedia asset={frame} enabled={enabled} animate={animate} className="awd__deco awd__deco--frame" />
        </div>
      )}
    </div>
  );
};
