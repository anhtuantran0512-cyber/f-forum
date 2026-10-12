/* Bản quyền trí tuệ thuộc về BroAmStuck */
/*
 * Nhiệm vụ 10 — media layer dùng chung cho khung/hào quang/bảng tên:
 * WebM (blob URL, cache RAM) khi được phép, ngược lại ảnh tĩnh fallback.
 * onError của thẻ video → tự chuyển về ảnh tĩnh (file hỏng, trình duyệt kén).
 */
import { useState } from 'react';
import { resolveAssetUrl } from '../../utils/decorations';
import { supportsWebmAlpha, useCachedAsset } from '../../utils/decorationStore';
import { useReducedMotion } from './useDecorationMedia';
import type { DecorationAssetRef } from './AvatarWithDecoration';

export const DecorationMedia = ({
  asset,
  enabled,
  className,
  animate = true,
}: {
  asset: DecorationAssetRef;
  /** false = placeholder rỗng (chưa vào viewport / không được phép phát). */
  enabled: boolean;
  className?: string;
  animate?: boolean;
}) => {
  const reducedMotion = useReducedMotion();
  const animated = !!asset.isAnimated && !!asset.animatedAssetUrl;
  const useVideo = animated && enabled && animate && !reducedMotion && supportsWebmAlpha();
  const [videoFailed, setVideoFailed] = useState(false);
  const videoUrl = useVideo && !videoFailed ? resolveAssetUrl(asset.animatedAssetUrl) : null;
  const [blobUrl] = useCachedAsset(videoUrl, !!videoUrl);

  if (!enabled) {
    return <div className={className} aria-hidden="true" />;
  }
  /* Blob WebM CHƯA SẴN (đang tải) hoặc tải lỗi → hiện ảnh tĩnh ngay:
     không để thẻ video rỗng (src undefined) vô hình — asset luôn thấy được. */
  if (useVideo && !blobUrl) {
    const stillUrl = asset.fullAssetUrl ? resolveAssetUrl(asset.fullAssetUrl) : null;
    if (!stillUrl) return null;
    return <img className={className} src={stillUrl} alt="" aria-hidden="true" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
  }
  if (useVideo) {
    return (
      <video
        className={className}
        src={blobUrl || undefined}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onError={() => setVideoFailed(true)}
      />
    );
  }
  const stillUrl = asset.fullAssetUrl ? resolveAssetUrl(asset.fullAssetUrl) : null;
  if (!stillUrl) return null;
  return (
    <img className={className} src={stillUrl} alt="" aria-hidden="true" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
  );
};
