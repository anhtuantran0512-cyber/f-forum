/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import { Compass } from 'lucide-react';
import type { DimensionView } from '../../types';
import { handleVideoError } from '../../utils/mediaFallback';
import { COMING_SOON_VIDEO_URL, toWebmVideoUrl } from '../../utils/chatVideos';
import { DepthLandscapeCard } from '../ui/DepthLandscapeCard';

interface ComingSoonViewProps {
  onReturnHome: (view: DimensionView) => void;
}

export const ComingSoonView: React.FC<ComingSoonViewProps> = ({ onReturnHome }) => {
  const webmUrl = toWebmVideoUrl(COMING_SOON_VIDEO_URL);

  return (
    <div
      className="ff-keep-dark ff-raw-grid-surface relative min-h-screen w-full bg-[#070b14] text-white overflow-y-auto select-none flex flex-col justify-between font-sans"
    >
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        onError={(e) => handleVideoError(e, COMING_SOON_VIDEO_URL)}
        onLoadedMetadata={(e) => {
          e.currentTarget.playbackRate = 0.72;
        }}
        className={`ff-video-bg fixed inset-0 w-full h-full object-cover scale-[1.04] opacity-40 ${webmUrl ? '' : 'blur-[3px]'} z-0 pointer-events-none`}
      >
        {webmUrl ? <source src={webmUrl} type="video/webm" /> : null}
        <source src={COMING_SOON_VIDEO_URL} type="video/mp4" />
      </video>

      <div className="fixed inset-0 bg-[#070b14]/70 z-0 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-t from-[#050811] via-transparent to-[#050811]/85 z-0 pointer-events-none" />

      <div className="h-20 shrink-0" />

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-4 pb-16 max-w-3xl mx-auto w-full">
        <div className="text-center max-w-xl mx-auto space-y-2.5">
          <h1 className="ff-typo-hero text-3xl sm:text-5xl md:text-6xl text-[#fff4d9]">
            Sắp ra mắt
          </h1>

          <svg className="mx-auto w-36 h-3 ff-organic-squiggle" viewBox="0 0 180 12" aria-hidden="true">
            <path d="M2 7 C32 1, 62 12, 92 6 S148 1, 178 7" />
          </svg>

          <p className="ff-typo-measure text-slate-300 text-sm sm:text-base mx-auto">
            Phân khu mới đang được hoàn thiện. Hãy quay lại sau để trải nghiệm nhé!
          </p>
        </div>

        <div className="mt-7 flex items-center justify-center">
          <DepthLandscapeCard eyebrow="Bình minh đang tới" title="Phân khu mới đang được dựng từng lớp" />
        </div>

        <button
          onClick={() => onReturnHome('home')}
          className="ff-tactile-btn liquid-glass rounded-full px-9 py-3.5 text-sm font-semibold text-white mt-8 hover:bg-white/10 transition-colors duration-200 cursor-pointer shadow-2xl inline-flex items-center gap-2 border border-white/20 hover:border-amber-400/40"
        >
          <Compass className="w-4 h-4 text-amber-300" />
          <span>Quay lại Trang Chủ</span>
        </button>
      </main>

      <footer className="relative z-10 w-full py-4 text-center text-xs text-neutral-400 font-mono">
        <span>F-Forum • Luôn có điều để khám phá</span>
      </footer>
    </div>
  );
};

export default ComingSoonView;
