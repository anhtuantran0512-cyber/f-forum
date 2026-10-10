/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import type { DimensionView } from '../../types';
import { handleVideoError } from '../../utils/mediaFallback';
import { DepthLandscapeCard } from '../ui/DepthLandscapeCard';

interface ComingSoonViewProps {
  onReturnHome: (view: DimensionView) => void;
}

export const ComingSoonView: React.FC<ComingSoonViewProps> = ({ onReturnHome }) => {
  return (
    <div
      className="ff-keep-dark relative min-h-screen w-full bg-[#001428] text-white overflow-hidden select-none flex flex-col justify-between font-sans"
    >
      {/* Video Background: Fullscreen looping video */}
      <video
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        onError={handleVideoError}
        className="ff-video-bg absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
      />

      {/* Atmospheric Vignette & Depth Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/70 z-0 pointer-events-none" />

      {/* Top Spacer for Global Fixed Navbar */}
      <div className="h-20 shrink-0" />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pt-12 pb-24 max-w-4xl mx-auto my-auto">
        {/* A calm, legible promise rather than a placeholder headline. */}
        <h1 className="animate-fade-rise font-geist-mono text-3xl font-semibold tracking-tight text-[#fff4d9] sm:text-5xl md:text-6xl">
          Sắp ra mắt
        </h1>

        {/* Thẻ phong cảnh bình minh nhiều lớp — rê chuột để thấy chiều sâu (code_yeucau · tch-15) */}
        <div className="animate-fade-rise-delay my-8 mx-auto">
          <DepthLandscapeCard eyebrow="Bình minh đang tới" title="Phân khu mới đang được dựng từng lớp" />
        </div>

        {/* Body Copy */}
        <p className="animate-fade-rise-delay text-neutral-200 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-light">
          Phân khu này đang được nâng cấp — quay lại sớm nhé, Cú Bông hứa sẽ đáng chờ!
        </p>

        {/* Action Button: Liquid-glass pill button returning to Homepage */}
        <button
          onClick={() => onReturnHome('home')}
          className="animate-fade-rise-delay-2 liquid-glass rounded-full px-10 sm:px-12 py-3.5 sm:py-4 text-sm font-semibold text-white mt-9 hover:bg-white/10 transition-colors duration-200 cursor-pointer shadow-2xl inline-flex items-center gap-2 border border-white/20 hover:border-amber-400/40"
        >
          <span>Quay lại Trang Chủ</span>
        </button>
      </main>

      {/* Footer info */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-neutral-400 font-mono">
        <span>F-Forum • Luôn có điều để khám phá</span>
      </footer>
    </div>
  );
};

export default ComingSoonView;
