/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useRef, useState } from 'react';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260611_183632_c311af08-e4b7-458f-81e7-79847a49b3d3.mp4';

export const BoomerangVideoBg: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [useCanvas, setUseCanvas] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let isCancelled = false;
    const frames: ImageBitmap[] = [];
    const maxDimension = 960;
    let captureAnimId: number | null = null;
    let loopAnimId: number | null = null;

    const ctx = canvas.getContext('2d', { alpha: false });

    const setupCanvas = () => {
      const w = video.videoWidth || 960;
      const h = video.videoHeight || 540;
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

      try {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          if (canvas.width === 0 || canvas.height === 0) {
            setupCanvas();
          }
          const bitmap = await createImageBitmap(video, {
            resizeWidth: canvas.width || 960,
            resizeHeight: canvas.height || 540,
            resizeQuality: 'medium',
          });
          frames.push(bitmap);
        }
      } catch {
        setLoadError(true);
        video.loop = true;
        return;
      }

      const rvfc = (video as unknown as { requestVideoFrameCallback?: (cb: () => void) => number }).requestVideoFrameCallback;
      if (rvfc) {
        rvfc.call(video, captureFrame);
      } else {
        captureAnimId = requestAnimationFrame(captureFrame);
      }
    };

    const handlePlay = () => {
      setupCanvas();
      captureFrame();
    };

    const handleEnded = () => {
      if (frames.length > 5 && ctx && !isCancelled) {
        setUseCanvas(true);
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
      const frameInterval = 1000 / 30;

      const renderLoop = (time: number) => {
        if (isCancelled || !ctx) return;

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

      loopAnimId = requestAnimationFrame(renderLoop);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('ended', handleEnded);

    video.play().catch(() => {
    });

    return () => {
      isCancelled = true;
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('ended', handleEnded);
      if (captureAnimId) cancelAnimationFrame(captureAnimId);
      if (loopAnimId) cancelAnimationFrame(loopAnimId);
      frames.forEach(f => f.close?.());
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 scale-[1.08] origin-center overflow-hidden pointer-events-none bg-neutral-950">
      <video
        ref={videoRef}
        src={VIDEO_URL}
        autoPlay
        muted
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        loop={loadError}
        onError={(e) => {
          setLoadError(true);
          (e.currentTarget as HTMLElement).style.display = 'none';
        }}
        className={`w-full h-full object-cover transition-opacity duration-700 ${
          useCanvas ? 'opacity-0 absolute pointer-events-none' : 'opacity-100'
        }`}
      />

      {/* Ping-pong Canvas */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-cover transition-opacity duration-700 ${
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
