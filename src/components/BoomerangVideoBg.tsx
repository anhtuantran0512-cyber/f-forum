/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useRef } from 'react';
import { LOW_FPS_PLAYBACK_RATE, toWebmVideoUrl } from '../utils/chatVideos';
import { handleVideoError } from '../utils/mediaFallback';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260611_183632_c311af08-e4b7-458f-81e7-79847a49b3d3.mp4';
const WEBM_VIDEO_URL = toWebmVideoUrl(VIDEO_URL);

export const BoomerangVideoBg: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let inView = true;
    const isActive = () => inView && document.visibilityState === 'visible';

    const syncPlayback = () => {
      if (isActive()) {
        video.playbackRate = LOW_FPS_PLAYBACK_RATE;
        if (video.paused) {
          video.play().catch(() => {});
        }
      } else if (!video.paused) {
        video.pause();
      }
    };

    const host = video.parentElement;
    const observer =
      typeof IntersectionObserver === 'function' && host
        ? new IntersectionObserver(([entry]) => {
            inView = entry ? entry.isIntersecting : true;
            syncPlayback();
          })
        : null;
    if (observer && host) observer.observe(host);

    const onVisibility = () => {
      syncPlayback();
    };
    const handlePlay = () => {
      video.playbackRate = LOW_FPS_PLAYBACK_RATE;
    };

    document.addEventListener('visibilitychange', onVisibility);
    video.addEventListener('play', handlePlay);
    syncPlayback();

    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      video.removeEventListener('play', handlePlay);
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return (
    <div className="ff-video-bg absolute inset-0 z-0 scale-[1.04] origin-center overflow-hidden pointer-events-none bg-neutral-950">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="metadata"
        loop
        onError={(e) => handleVideoError(e, VIDEO_URL)}
        className={`w-full h-full object-cover ${WEBM_VIDEO_URL ? '' : 'blur-[3px]'}`}
      >
        {WEBM_VIDEO_URL ? <source src={WEBM_VIDEO_URL} type="video/webm" /> : null}
        <source src={VIDEO_URL} type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/45 pointer-events-none" />
    </div>
  );
};
