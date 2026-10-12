/* Bản quyền trí tuệ thuộc về BroAmStuck */
/*
 * Nhiệm vụ 10 & Kiến trúc Adaptive Quality — media layer dùng chung cho khung/hào quang/bảng tên:
 *  - Multi-quality Video Decoration (4K / HD / SD) giống YouTube Adaptive Bitrate.
 *  - Priority Hints (fetchPriority="high" cho trang trí của chính user, "low" cho user khác).
 *  - Concurrent Animation Scheduler: ở Tier C, ưu tiên tuyệt đối animation của chính user trước,
 *    giới hạn số animation đồng thời của người khác ở mức an toàn (vượt ngưỡng thì hiển thị
 *    frame tĩnh chất lượng cao fullAssetUrl — không bao giờ cắt bỏ tính năng hay làm mất icon).
 *  - onError của thẻ video → tự chuyển về ảnh tĩnh (file hỏng, trình duyệt kén).
 */
import { useEffect, useId, useMemo, useState } from 'react';
import { buildAdaptiveVideoSources, resolveAssetUrl } from '../../utils/decorations';
import { supportsWebmAlpha, useCachedAsset } from '../../utils/decorationStore';
import { animationBudget, useAdaptiveQuality } from '../../utils/adaptiveQuality';
import { useReducedMotion } from './useDecorationMedia';
import type { DecorationAssetRef } from './AvatarWithDecoration';

export const DecorationMedia = ({
  asset,
  enabled,
  className,
  animate = true,
  priority = 'auto',
}: {
  asset: DecorationAssetRef;
  /** false = placeholder rỗng (chưa vào viewport / không được phép phát). */
  enabled: boolean;
  className?: string;
  animate?: boolean;
  /** 'high' = trang trí của chính user (luôn ưu tiên tải và chạy animation trước). */
  priority?: 'high' | 'low' | 'auto';
}) => {
  const instanceId = useId();
  const reducedMotion = useReducedMotion();
  const { tier, capabilities } = useAdaptiveQuality();
  const isOwnPriority = priority === 'high';
  const fetchPriorityAttr: 'high' | 'low' | 'auto' =
    priority === 'high' ? 'high' : priority === 'low' ? 'low' : 'auto';

  const animated = !!asset.isAnimated && !!asset.animatedAssetUrl;
  const baseCanAnimate = animated && enabled && animate && !reducedMotion && supportsWebmAlpha();
  const withinBudget = useMemo(
    () => (baseCanAnimate ? animationBudget.acquire(instanceId, isOwnPriority) : true),
    [baseCanAnimate, instanceId, isOwnPriority],
  );

  useEffect(() => {
    if (!baseCanAnimate) {
      animationBudget.release(instanceId);
      return;
    }
    animationBudget.acquire(instanceId, isOwnPriority);
    return () => {
      animationBudget.release(instanceId);
    };
  }, [baseCanAnimate, instanceId, isOwnPriority, tier]);

  const useVideo = baseCanAnimate && (isOwnPriority || withinBudget);
  const [videoFailed, setVideoFailed] = useState(false);
  const adaptiveSet = useVideo && !videoFailed
    ? buildAdaptiveVideoSources(asset.animatedAssetUrl, tier)
    : null;
  const videoUrl = adaptiveSet?.primaryUrl || null;
  const [blobUrl] = useCachedAsset(videoUrl, !!videoUrl);

  if (!enabled) {
    return <div className={className} aria-hidden="true" />;
  }
  /* Blob WebM CHƯA SẴN (đang tải) hoặc tải lỗi → hiện ảnh tĩnh chất lượng cao ngay:
     không để thẻ video rỗng (src undefined) vô hình — asset luôn thấy được. */
  if (useVideo && !blobUrl) {
    const stillUrl = asset.fullAssetUrl ? resolveAssetUrl(asset.fullAssetUrl) : null;
    if (!stillUrl) return null;
    return (
      <img
        className={className}
        src={stillUrl}
        alt=""
        aria-hidden="true"
        loading={isOwnPriority ? 'eager' : 'lazy'}
        fetchPriority={fetchPriorityAttr}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    );
  }
  if (useVideo) {
    return (
      <video
        className={className}
        src={blobUrl || undefined}
        data-quality={capabilities.videoQuality}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onError={() => setVideoFailed(true)}
      >
        {adaptiveSet?.sources.map((source) => (
          <source
            key={source.quality}
            src={blobUrl || source.src}
            media={source.media}
            type={source.type}
          />
        ))}
      </video>
    );
  }
  const stillUrl = asset.fullAssetUrl ? resolveAssetUrl(asset.fullAssetUrl) : null;
  if (!stillUrl) return null;
  return (
    <img
      className={className}
      src={stillUrl}
      alt=""
      aria-hidden="true"
      loading={isOwnPriority ? 'eager' : 'lazy'}
      fetchPriority={fetchPriorityAttr}
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
    />
  );
};
