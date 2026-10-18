/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useRef, useState } from 'react';
import { LOW_FPS_PLAYBACK_RATE, toWebmVideoUrl } from '../utils/chatVideos';
import { handleVideoError } from '../utils/mediaFallback';
import { safeStorage } from '../utils/storage';
import { useActiveInViewport, useInViewOnce, useReducedMotion } from './decorations/useDecorationMedia';

const VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260611_183632_c311af08-e4b7-458f-81e7-79847a49b3d3.mp4';
const WEBM_VIDEO_URL = toWebmVideoUrl(VIDEO_URL);

type NetworkInformationLike = EventTarget & { saveData?: boolean };

export const BoomerangVideoBg: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hostRef, nearViewport] = useInViewOnce<HTMLDivElement>();
  const reducedMotion = useReducedMotion();
  /* Potator Mode (nền tĩnh) đọc thẳng từ <html class="potator-mode"> + localStorage
     để video không bắt đầu nạp trong lúc chờ Navbar áp class. */
  const [potatorMode, setPotatorMode] = useState(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('potator-mode')
      || safeStorage.getItem('fforum_potator_mode') === 'true';
  });
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setPotatorMode(root.classList.contains('potator-mode')));
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  const [saveData, setSaveData] = useState(() => {
    const connection = (typeof navigator !== 'undefined'
      ? (navigator as Navigator & { connection?: NetworkInformationLike }).connection
      : undefined);
    return connection?.saveData === true;
  });
  const mayLoadVideo = nearViewport && !reducedMotion && !saveData && !potatorMode;
  const videoInViewport = useActiveInViewport(videoRef, mayLoadVideo);

  useEffect(() => {
    const connection = (typeof navigator !== 'undefined'
      ? (navigator as Navigator & { connection?: NetworkInformationLike }).connection
      : undefined);
    if (!connection || typeof connection.addEventListener !== 'function') return;
    const onChange = () => setSaveData(connection.saveData === true);
    connection.addEventListener('change', onChange);
    return () => connection.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!mayLoadVideo || !videoInViewport || document.visibilityState !== 'visible') {
      if (!video.paused) video.pause();
      return;
    }
    video.playbackRate = LOW_FPS_PLAYBACK_RATE;
    video.play().catch(() => {});
    const handlePlay = () => { video.playbackRate = LOW_FPS_PLAYBACK_RATE; };
    video.addEventListener('play', handlePlay);
    return () => {
      video.removeEventListener('play', handlePlay);
      video.pause();
    };
  }, [mayLoadVideo, videoInViewport]);

  useEffect(() => {
    if (!mayLoadVideo) return;
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') videoRef.current?.pause();
      else if (videoInViewport) videoRef.current?.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisibility, { passive: true });
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [mayLoadVideo, videoInViewport]);

  return (
    <div ref={hostRef} className="ff-video-bg absolute inset-0 z-0 scale-[1.04] origin-center overflow-hidden pointer-events-none bg-neutral-950">
      {mayLoadVideo && (
        <video
          ref={videoRef}
          muted
          playsInline
          preload={videoInViewport ? 'metadata' : 'none'}
          loop
          onError={(event) => handleVideoError(event, VIDEO_URL)}
          className={`w-full h-full object-cover ${WEBM_VIDEO_URL ? '' : 'blur-[3px]'}`}
        >
          {WEBM_VIDEO_URL ? <source src={WEBM_VIDEO_URL} type="video/webm" /> : null}
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/45 pointer-events-none" />
    </div>
  );
};
