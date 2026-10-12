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
import type { DecorationType } from '../../types/index';
import './decorations.css';
import { useInViewOnce } from './useDecorationMedia';
import { NameplateDisplay } from './NameplateDisplay';
import { DecorationMedia } from './DecorationMedia';

export interface DecorationAssetRef {
  type: DecorationType;
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
  nameplateAsset?: DecorationAssetRef | null;
  name?: string;
  className?: string;
  alt?: string;
}

export const AvatarWithDecoration = ({
  avatarUrl,
  decorationAsset,
  frameAsset,
  auraAsset,
  size,
  animate = true,
  eager = false,
  nameplateAsset,
  name,
  className,
  alt = 'Ảnh đại diện',
}: AvatarWithDecorationProps) => {
  const [inViewRef, inView] = useInViewOnce<HTMLDivElement>();
  const enabled = eager || inView;
  const frame = frameAsset || (decorationAsset && decorationAsset.type !== 'avatar_aura' ? decorationAsset : null) || null;
  const aura = auraAsset || (decorationAsset && decorationAsset.type === 'avatar_aura' ? decorationAsset : null) || null;
  const frameRef = eager ? undefined : inViewRef;

  return (
    <div
      ref={frameRef}
      className={`awd${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      data-size={size}
    >
      {aura && (
        <div className="awd__slot awd__slot--aura">
          <DecorationMedia asset={aura} enabled={enabled} animate={animate} className="awd__deco awd__deco--aura" />
        </div>
      )}
      <img className="awd__avatar" src={avatarUrl} alt={alt} loading={eager ? 'eager' : 'lazy'} />
      {frame && (
        <div className="awd__slot awd__slot--frame">
          <DecorationMedia asset={frame} enabled={enabled} animate={animate} className="awd__deco awd__deco--frame" />
        </div>
      )}
      {nameplateAsset && name && (
        <div className="awd__nameplate-row">
          <NameplateDisplay asset={nameplateAsset} size={Math.max(96, size)} animate={animate && eager} />
          <span className="awd__nameplate-name">{name}</span>
        </div>
      )}
    </div>
  );
};
