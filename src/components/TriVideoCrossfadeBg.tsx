/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect } from 'react';
import { handleVideoError } from '../utils/mediaFallback';
import { TRI_CHAT_VIDEOS } from '../utils/chatVideos';
import { safeStorage } from '../utils/storage';

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
  const [potatoMode, setPotatoMode] = useState(() => safeStorage.getItem('fforum_potato_mode') === 'true');

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

  useEffect(() => {
    const handleSync = () => setPotatoMode(safeStorage.getItem('fforum_potato_mode') === 'true');
    window.addEventListener('fforum_theme_sync', handleSync);
    return () => window.removeEventListener('fforum_theme_sync', handleSync);
  }, []);

  if (potatoMode) {
    return (
      <div className="z-0 absolute inset-0 pointer-events-none overflow-hidden select-none bg-slate-950">
        <div className="absolute inset-0" style={{
          backgroundColor: '#0f172a',
          backgroundImage: `
            radial-gradient(at 40% 20%, hsla(253,86%,50%,0.3) 0px, transparent 50%),
            radial-gradient(at 80% 0%, hsla(189,100%,56%,0.3) 0px, transparent 50%),
            radial-gradient(at 0% 50%, hsla(335,100%,65%,0.3) 0px, transparent 50%),
            radial-gradient(at 80% 50%, hsla(340,100%,76%,0.3) 0px, transparent 50%),
            radial-gradient(at 0% 100%, hsla(22,100%,77%,0.3) 0px, transparent 50%),
            radial-gradient(at 80% 100%, hsla(242,100%,70%,0.3) 0px, transparent 50%),
            radial-gradient(at 0% 0%, hsla(343,100%,76%,0.3) 0px, transparent 50%)
          `
        }} />
      </div>
    );
  }

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
