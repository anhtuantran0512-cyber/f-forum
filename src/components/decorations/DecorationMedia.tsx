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
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { buildAdaptiveVideoSources, resolveAssetUrl } from '../../utils/decorations';
import { supportsWebmAlpha, useCachedAsset } from '../../utils/decorationStore';
import { animationBudget, useAdaptiveQuality } from '../../utils/adaptiveQuality';
import { useActiveInViewport, useReducedMotion } from './useDecorationMedia';
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
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

  const [videoFailed, setVideoFailed] = useState(false);
  const useVideo = baseCanAnimate && (isOwnPriority || withinBudget) && !videoFailed;
  const isActiveInViewport = useActiveInViewport(videoRef, useVideo);

  const adaptiveSet = useVideo
    ? buildAdaptiveVideoSources(asset.animatedAssetUrl, tier)
    : null;
  const targetVideoUrl = adaptiveSet?.primaryUrl || (asset.animatedAssetUrl ? resolveAssetUrl(asset.animatedAssetUrl) : null);
  const [blobUrl] = useCachedAsset(targetVideoUrl, Boolean(useVideo && targetVideoUrl));
  const activeVideoSrc = blobUrl || targetVideoUrl;

  useEffect(() => {
    if (!useVideo || !isActiveInViewport) {
      animationBudget.release(instanceId);
      const vid = videoRef.current;
      if (vid && !vid.paused) {
        try {
          vid.pause();
        } catch {
          /* ignore */
        }
      }
      return;
    }
    const granted = animationBudget.acquire(instanceId, isOwnPriority);
    const vid = videoRef.current;
    if (vid && (isOwnPriority || granted) && vid.paused) {
      vid.play().catch(() => {});
    }
    return () => {
      animationBudget.release(instanceId);
    };
  }, [useVideo, isActiveInViewport, activeVideoSrc, instanceId, isOwnPriority, tier]);

  if (!enabled) {
    return <div className={className} aria-hidden="true" />;
  }
  const stillUrl = asset.fullAssetUrl ? resolveAssetUrl(asset.fullAssetUrl) : null;

  const handleVideoLoadedData = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (isActiveInViewport && e.currentTarget.paused) {
      e.currentTarget.play().catch(() => {});
    }
  };
  const handleVideoError = () => setVideoFailed(true);

  if (useVideo && activeVideoSrc) {
    return (
      <video
        ref={videoRef}
        className={className}
        src={activeVideoSrc}
        poster={stillUrl || undefined}
        data-quality={capabilities.videoQuality}
        autoPlay
        loop
        muted
        playsInline
        preload={isOwnPriority ? 'auto' : 'metadata'}
        aria-hidden="true"
        style={{ width: '100%', height: '100%' }}
        onError={handleVideoError}
        onLoadedData={handleVideoLoadedData}
      >
        {adaptiveSet?.sources.map((source) => (
          <source
            key={source.quality}
            src={source.src}
            media={source.media}
            type={source.type}
          />
        ))}
      </video>
    );
  }
  if (!stillUrl) return null;
  return (
    <img
      className={className}
      src={stillUrl}
      alt=""
      aria-hidden="true"
      decoding="async"
      loading={isOwnPriority ? 'eager' : 'lazy'}
      fetchPriority={fetchPriorityAttr}
      style={{ width: '100%', height: '100%' }}
    />
  );
};
