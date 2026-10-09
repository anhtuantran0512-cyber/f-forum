/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect, useRef } from 'react';
import { handleVideoError } from '../utils/mediaFallback';
import { TRI_CHAT_VIDEOS } from '../utils/chatVideos';

/** Thời lượng pha mờ dần giữa hai video (khớp duration-[1400ms] bên dưới). */
const FADE_MS = 1400;

export interface TriVideoCrossfadeBgProps {
  activeIdx?: number;
  onIdxChange?: (idx: number) => void;
  cycleIntervalMs?: number;
}

export const TriVideoCrossfadeBg: React.FC<TriVideoCrossfadeBgProps> = ({
  activeIdx: controlledIdx,
  onIdxChange,
  cycleIntervalMs = 12000,
}) => {
  const [internalIdx, setInternalIdx] = useState(0);
  const isControlled = controlledIdx !== undefined;
  const currentIdx = isControlled ? controlledIdx : internalIdx;
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const bindVideo = (idx: number) => (el: HTMLVideoElement | null) => {
    videoRefs.current[idx] = el;
  };

  /*
    EPIC 5 — hiệu năng: trước đây cả 3 video cùng tự phát và lặp (2 video đang ở
    opacity 0 vẫn giải mã liên tục) → gấp 3 tải GPU/CPU. Nay chỉ video đang hiện
    được phát; video vừa rời đi phát tiếp hết pha mờ dần rồi mới dừng; video kế
    tiếp được tải trước (preload="auto") để chuyển cảnh không giật. Hình ảnh y hệt.
    `data-ff-suspended` do App đặt khi Potator/Light ẩn video — khi đó không phát.
  */
  useEffect(() => {
    const videos = videoRefs.current;
    const current = videos[currentIdx];
    if (current && current.dataset.ffSuspended !== '1') current.play().catch(() => {});
    const timer = window.setTimeout(() => {
      videos.forEach((video, idx) => {
        if (video && idx !== currentIdx && !video.paused) video.pause();
      });
    }, FADE_MS + 200);
    return () => window.clearTimeout(timer);
  }, [currentIdx]);

  useEffect(() => {
    const timer = setInterval(() => {
      const next = (currentIdx + 1) % TRI_CHAT_VIDEOS.length;
      if (isControlled && onIdxChange) {
        onIdxChange(next);
      } else {
        setInternalIdx(next);
      }
    }, cycleIntervalMs);
    return () => clearInterval(timer);
  }, [currentIdx, isControlled, onIdxChange, cycleIntervalMs]);

  return (
    <div className="ff-video-bg z-0 absolute inset-0 pointer-events-none overflow-hidden select-none">
      {TRI_CHAT_VIDEOS.map((v, idx) => (
        <video
          key={v.id}
          ref={bindVideo(idx)}
          src={v.url}
          autoPlay={idx === currentIdx}
          loop
          muted
          playsInline
          preload={idx === currentIdx || idx === (currentIdx + 1) % TRI_CHAT_VIDEOS.length ? 'auto' : 'metadata'}
          data-ff-idle={idx === currentIdx ? undefined : '1'}
          onError={handleVideoError}
          className={`absolute inset-0 w-full h-full object-cover scale-[1.04] transition-opacity duration-[1400ms] ease-in-out ${
            currentIdx === idx ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      {/* Semi-transparent dark wash allowing video to shine through */}
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60" />
    </div>
  );
};

export default TriVideoCrossfadeBg;
