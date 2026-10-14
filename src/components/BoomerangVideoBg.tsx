/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useRef, useState } from 'react';
import { LOW_FPS_PLAYBACK_RATE, VIDEO_TARGET_FPS, toWebmVideoUrl } from '../utils/chatVideos';
import { handleVideoError } from '../utils/mediaFallback';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260611_183632_c311af08-e4b7-458f-81e7-79847a49b3d3.mp4';
const WEBM_VIDEO_URL = toWebmVideoUrl(VIDEO_URL);

export const BoomerangVideoBg: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [useCanvas, setUseCanvas] = useState(false);
  const useCanvasRef = useRef(false);
  useEffect(() => {
    useCanvasRef.current = useCanvas;
  }, [useCanvas]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let isCancelled = false;
    const frames: ImageBitmap[] = [];
    const maxDimension = 540;
    const frameInterval = 1000 / VIDEO_TARGET_FPS;
    let lastCaptureTime = 0;
    let captureAnimId: number | null = null;
    let loopAnimId: number | null = null;
    /* EPIC 5 — hiệu năng: vòng vẽ canvas 18fps chỉ chạy khi nền đang nằm trong
       khung nhìn và tab đang hiện. Trước đây nó vẽ liên tục kể cả khi đã cuộn
       xuống dưới (tốn GPU vô ích trên máy yếu). Hình ảnh không đổi. */
    let inView = true;
    let resumeLoop: (() => void) | null = null;
    const isActive = () => inView && document.visibilityState === 'visible';

    const ctx = canvas.getContext('2d', { alpha: false });

    const setupCanvas = () => {
      const w = video.videoWidth || 540;
      const h = video.videoHeight || 304;
      const aspect = w / h;
      let targetW = w;
      let targetH = h;
      if (targetW > maxDimension) {
        targetW = maxDimension;
        targetH = Math.round(targetW / aspect);
      }
      canvas.width = targetW;
      canvas.height = targetH;
    };

    const captureFrame = async () => {
      if (isCancelled || video.paused || video.ended) return;

      const now = performance.now();
      if (now - lastCaptureTime >= frameInterval && frames.length < 45) {
        lastCaptureTime = now;
        try {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            if (canvas.width === 0 || canvas.height === 0) {
              setupCanvas();
            }
            const bitmap = await createImageBitmap(video, {
              resizeWidth: canvas.width || 540,
              resizeHeight: canvas.height || 304,
              resizeQuality: 'low',
            });
            frames.push(bitmap);
          }
        } catch {
          video.loop = true;
          return;
        }
      }

      const rvfc = (video as unknown as { requestVideoFrameCallback?: (cb: () => void) => number }).requestVideoFrameCallback;
      if (rvfc) {
        rvfc.call(video, captureFrame);
      } else {
        captureAnimId = requestAnimationFrame(captureFrame);
      }
    };

    const handlePlay = () => {
      video.playbackRate = LOW_FPS_PLAYBACK_RATE;
      setupCanvas();
      captureFrame();
    };

    const handleEnded = () => {
      if (frames.length > 5 && ctx && !isCancelled) {
        setUseCanvas(true);
        video.pause();
        startBoomerangLoop();
      } else {
        video.loop = true;
        video.play().catch(() => {});
      }
    };

    const startBoomerangLoop = () => {
      let currentIdx = 0;
      let direction = 1;
      let lastTime = performance.now();

      const renderLoop = (time: number) => {
        if (isCancelled || !ctx) return;
        if (!isActive()) {
          /* Dừng hẳn; observer/visibilitychange sẽ gọi resumeLoop khi hiện lại. */
          loopAnimId = null;
          return;
        }

        if (time - lastTime >= frameInterval) {
          lastTime = time;
          const frame = frames[currentIdx];
          if (frame) {
            ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
          }

          currentIdx += direction;
          if (currentIdx >= frames.length) {
            direction = -1;
            currentIdx = frames.length - 2;
          } else if (currentIdx < 0) {
            direction = 1;
            currentIdx = 1;
          }
        }

        loopAnimId = requestAnimationFrame(renderLoop);
      };

      resumeLoop = () => {
        if (isCancelled || loopAnimId !== null || !isActive()) return;
        lastTime = performance.now();
        loopAnimId = requestAnimationFrame(renderLoop);
      };
      loopAnimId = requestAnimationFrame(renderLoop);
    };

    const host = canvas.parentElement;
    const observer =
      typeof IntersectionObserver === 'function' && host
        ? new IntersectionObserver(([entry]) => {
            inView = entry ? entry.isIntersecting : true;
            if (inView) {
              resumeLoop?.();
              if (!useCanvasRef.current && video.paused) {
                video.play().catch(() => {});
              }
            } else {
              if (loopAnimId !== null) {
                cancelAnimationFrame(loopAnimId);
                loopAnimId = null;
              }
              if (!video.paused) {
                video.pause();
              }
            }
          })
        : null;
    if (observer && host) observer.observe(host);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        resumeLoop?.();
        if (!useCanvasRef.current && inView && video.paused) {
          video.play().catch(() => {});
        }
      } else {
        if (loopAnimId !== null) {
          cancelAnimationFrame(loopAnimId);
          loopAnimId = null;
        }
        if (!video.paused) {
          video.pause();
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    video.addEventListener('play', handlePlay);
    video.addEventListener('ended', handleEnded);

    video.play().catch(() => {
    });

    return () => {
      isCancelled = true;
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('ended', handleEnded);
      if (captureAnimId) cancelAnimationFrame(captureAnimId);
      if (loopAnimId) cancelAnimationFrame(loopAnimId);
      frames.forEach(f => f.close?.());
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
    <div className="ff-video-bg absolute inset-0 z-0 scale-[1.06] origin-center overflow-hidden pointer-events-none bg-neutral-950">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        loop
        onError={(e) => handleVideoError(e, VIDEO_URL)}
        className={`w-full h-full object-cover ${WEBM_VIDEO_URL ? '' : 'blur-[3px]'} transition-opacity duration-500 ${
          useCanvas ? 'opacity-0 absolute pointer-events-none' : 'opacity-100'
        }`}
      >
        {WEBM_VIDEO_URL ? <source src={WEBM_VIDEO_URL} type="video/webm" /> : null}
        <source src={VIDEO_URL} type="video/mp4" />
      </video>

      {/* Ping-pong Canvas (18 FPS + soft blur optimization) */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-cover ${WEBM_VIDEO_URL ? '' : 'blur-[3px]'} transition-opacity duration-500 ${
          useCanvas ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
        }`}
      />

      {/* Fallback ambient obsidian/gold illumination if external media is blocked */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-600/10 via-transparent to-neutral-950 pointer-events-none" />
      {/* Subtle Black/30 overlay */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      {/* Gradient vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 pointer-events-none" />
    </div>
  );
};
