/* Bản quyền trí tuệ thuộc về BroAmStuck */
/*
 * Nhiệm vụ 10 — avatar + trang trí Discord (khung / hào quang / bảng tên).
 *  - Bản động dùng native video URL; reduced motion pauses playback, browsers without VP9 alpha use the still asset.
 *  - Đeo ĐƯỢC CẢ HAI: hào quang nằm SAU ảnh (z1), khung nằm TRÊN ảnh (z3);
 *    cả hai overflow visible (cánh, tia sáng… không bị cắt).
 *  - Lazy load qua IntersectionObserver (eager=true bỏ qua — navbar).
 *  - Priority Hints (PHẦN 3.2): fetchPriority="high" cho avatar & trang trí của chính user,
 *    "low" cho user khác.
 */
import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { DecorationType } from '../../types/index';
import './decorations.css';
import { useActiveInViewport, useInViewOnce, useReducedMotion } from './useDecorationMedia';
import { DecorationMedia } from './DecorationMedia';
import { getDecorationSafeZone } from '../../utils/decorationSafeZones.ts';
import { DEFAULT_AVATAR } from '../../utils/mediaFallback';

export interface DecorationAssetRef {
  type: DecorationType;
  /** Id catalog — tra safe zone (căn tâm artwork theo từng file). */
  id?: string;
  fullAssetUrl?: string | null;
  animatedAssetUrl?: string | null;
  isAnimated?: boolean;
}

/* Avatar video uses native browser streaming, pauses when offscreen, and respects reduced motion. */
const AVATAR_VIDEO_EXT = /\.(webm|mp4|m4v|ogv)(\?|#|$)/i;

const isVideoAvatarUrl = (url: string): boolean => AVATAR_VIDEO_EXT.test(url);

const AvatarMedia = ({
  url,
  alt,
  eager,
  priority,
}: {
  url: string;
  alt: string;
  eager: boolean;
  priority: 'high' | 'low';
}) => {
  const reducedMotion = useReducedMotion();
  const [failedVideoUrl, setFailedVideoUrl] = useState<string | null>(null);
  const avatarVideoRef = useRef<HTMLVideoElement | null>(null);
  const safeUrl = url || DEFAULT_AVATAR;
  const videoFailed = failedVideoUrl === safeUrl;
  const isVideo = isVideoAvatarUrl(safeUrl) && !videoFailed;
  const inViewport = useActiveInViewport(avatarVideoRef, isVideo);
  const isActive = eager || inViewport;

  useEffect(() => {
    if (!isVideo || reducedMotion) return;
    const vid = avatarVideoRef.current;
    if (!vid) return;
    if (!isActive) {
      if (!vid.paused) {
        try {
          vid.pause();
        } catch {
          /* ignore */
        }
      }
    } else if (vid.paused) {
      vid.play().catch(() => {});
    }
    return () => {
      if (vid) {
        try {
          vid.pause();
          vid.removeAttribute('src');
          vid.load();
        } catch {
          /* ignore */
        }
      }
    };
  }, [isActive, isVideo, reducedMotion]);

  if (!isVideoAvatarUrl(safeUrl)) {
    return (
      <img
        className="awd__avatar"
        src={safeUrl}
        alt={alt}
        decoding="async"
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={priority}
        onError={(e) => {
          if (e.currentTarget.src !== DEFAULT_AVATAR) {
            e.currentTarget.src = DEFAULT_AVATAR;
          }
        }}
      />
    );
  }
  if (videoFailed) {
    /* Video hỏng (404/host không cho phép) → avatar mặc định, KHÔNG để chỗ
       trống/ảnh lỗi — không mất thành phần avatar. */
    return (
      <img
        className="awd__avatar"
        src={DEFAULT_AVATAR}
        alt={alt}
        decoding="async"
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={priority}
      />
    );
  }
  return (
    <video
      ref={avatarVideoRef}
      className="awd__avatar"
      src={url}
      aria-label={alt}
      muted
      playsInline
          preload={!isActive ? 'none' : reducedMotion ? 'metadata' : priority === 'high' ? 'metadata' : 'none'}
          loop={!reducedMotion}
      onError={() => setFailedVideoUrl(safeUrl)}
    />
  );
};

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
  /** Ưu tiên tải và chạy animation cho chính user ('high') so với user khác ('low'). */
  priority?: 'high' | 'low';
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

export const AvatarWithDecoration = memo(({
  avatarUrl,
  decorationAsset,
  frameAsset,
  auraAsset,
  size,
  animate = true,
  eager = false,
  priority,
  className,
  alt = 'Ảnh đại diện',
}: AvatarWithDecorationProps) => {
  const [inViewRef, inView] = useInViewOnce<HTMLDivElement>();
  const enabled = eager || inView;
  const effectivePriority: 'high' | 'low' = priority || (eager ? 'high' : 'low');
  const frame = frameAsset || (decorationAsset && decorationAsset.type !== 'avatar_aura' ? decorationAsset : null) || null;
  /* Khung và hào quang là hai slot độc lập: aura nằm sau ảnh, frame phủ phía trên. */
  const aura = auraAsset || (decorationAsset && decorationAsset.type === 'avatar_aura' ? decorationAsset : null) || null;
  const frameRef = eager ? undefined : inViewRef;
  const isAnimating = enabled && animate && Boolean(frame?.isAnimated || aura?.isAnimated);
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
      className={`awd${isAnimating ? ' awd--animating' : ''}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      data-size={size}
      data-priority={effectivePriority}
    >
      {aura && (
        <div className="awd__slot awd__slot--aura" style={zoneStyle(aura?.id)}>
          <DecorationMedia
            asset={aura}
            enabled={enabled}
            animate={animate}
            priority={effectivePriority}
            className="awd__deco awd__deco--aura"
          />
        </div>
      )}
      <AvatarMedia url={avatarUrl} alt={alt} eager={eager} priority={effectivePriority} />
      {frame && (
        <div className="awd__slot awd__slot--frame" style={zoneStyle(frame?.id)}>
          <DecorationMedia
            asset={frame}
            enabled={enabled}
            animate={animate}
            priority={effectivePriority}
            className="awd__deco awd__deco--frame"
          />
        </div>
      )}
    </div>
  );
});
