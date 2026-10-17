/* Bản quyền trí tuệ thuộc về BroAmStuck */
/* Shared native media layer for avatar frames, auras, and nameplates. */
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { resolveAssetUrl, resolveDecorationVideoSource } from '../../utils/decorations';
import { supportsWebmAlpha } from '../../utils/decorationStore';
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
  enabled: boolean;
  className?: string;
  animate?: boolean;
  priority?: 'high' | 'low' | 'auto';
}) => {
  const instanceId = useId();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();
  const { tier } = useAdaptiveQuality();
  const isOwnPriority = priority === 'high';
  const fetchPriorityAttr: 'high' | 'low' | 'auto' = priority === 'high' ? 'high' : priority === 'low' ? 'low' : 'auto';
  const animated = Boolean(asset.isAnimated && asset.animatedAssetUrl);
  const baseCanAnimate = animated && enabled && animate && !reducedMotion && supportsWebmAlpha();
  const isActiveInViewport = useActiveInViewport(hostRef, baseCanAnimate);
  const sourceKey = asset.animatedAssetUrl || null;
  const [retryState, setRetryState] = useState(() => ({ source: sourceKey, count: 0, failed: false }));
  const currentRetry = retryState.source === sourceKey
    ? retryState
    : { source: sourceKey, count: 0, failed: false };
  const subscribeBudget = useCallback((listener: () => void) => animationBudget.subscribe(instanceId, listener), [instanceId]);
  const getBudgetSnapshot = useCallback(() => animationBudget.hasSlot(instanceId), [instanceId]);
  const withinBudget = useSyncExternalStore(subscribeBudget, getBudgetSnapshot, () => false);

  useEffect(() => () => {
    if (retryTimerRef.current !== null) clearTimeout(retryTimerRef.current);
  }, [sourceKey]);

  const handleVideoError = () => {
    if (currentRetry.count >= 2) {
      setRetryState({ source: sourceKey, count: currentRetry.count, failed: true });
      return;
    }
    const nextCount = currentRetry.count + 1;
    if (retryTimerRef.current !== null) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      setRetryState((latest) => latest.source === sourceKey
        ? { ...latest, count: Math.max(latest.count, nextCount) }
        : { source: sourceKey, count: nextCount, failed: false });
    }, nextCount * 800);
  };

  useEffect(() => {
    if (baseCanAnimate && isActiveInViewport) animationBudget.acquire(instanceId, isOwnPriority);
    else animationBudget.release(instanceId);
    return () => animationBudget.release(instanceId);
  }, [baseCanAnimate, isActiveInViewport, instanceId, isOwnPriority, tier]);

  const useVideo = baseCanAnimate && isActiveInViewport && (isOwnPriority || withinBudget) && !currentRetry.failed;
  const videoSource = useVideo ? resolveDecorationVideoSource(asset.animatedAssetUrl) : null;
  const stillUrl = asset.fullAssetUrl ? resolveAssetUrl(asset.fullAssetUrl) : null;
  const objectFit = className?.split(/\s+/).includes('npd__media') ? 'cover' : 'contain';

  useEffect(() => {
    const currentVideo = videoRef.current;
    if (!useVideo || !isActiveInViewport || !currentVideo) {
      if (currentVideo && !currentVideo.paused) currentVideo.pause();
      return;
    }
    if ((isOwnPriority || withinBudget) && currentVideo.paused) currentVideo.play().catch(() => {});
    return () => {
      try {
        currentVideo.pause();
        currentVideo.removeAttribute('src');
        currentVideo.load();
      } catch {
        /* ignore */
      }
    };
  }, [useVideo, isActiveInViewport, videoSource?.src, isOwnPriority, withinBudget]);

  if (!enabled) return <div className={className} aria-hidden="true" />;
  const showStill = Boolean(stillUrl && (!baseCanAnimate || isActiveInViewport));

  return (
    <div ref={hostRef} className={className} aria-hidden="true" style={{ width: '100%', height: '100%', display: 'block' }}>
      {useVideo && videoSource ? (
        <video
          key={currentRetry.count}
          ref={videoRef}
          className="awd__deco-media"
          src={videoSource.src}
          poster={stillUrl || undefined}
          loop
          muted
          playsInline
          preload={isOwnPriority ? 'metadata' : 'none'}
          style={{ width: '100%', height: '100%', objectFit, display: 'block' }}
          onError={handleVideoError}
        />
      ) : showStill ? (
        <img
          className="awd__deco-media"
          src={stillUrl!}
          alt=""
          decoding="async"
          loading={isOwnPriority ? 'eager' : 'lazy'}
          fetchPriority={fetchPriorityAttr}
          style={{ width: '100%', height: '100%', objectFit, display: 'block' }}
        />
      ) : null}
    </div>
  );
};
