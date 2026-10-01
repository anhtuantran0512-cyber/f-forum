import React, { useState, useEffect } from 'react';
import { handleVideoError } from '../utils/mediaFallback';
import { TRI_CHAT_VIDEOS } from '../utils/chatVideos';

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
    <div className="z-0 absolute inset-0 pointer-events-none overflow-hidden select-none">
      {TRI_CHAT_VIDEOS.map((v, idx) => (
        <video
          key={v.id}
          src={v.url}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
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
