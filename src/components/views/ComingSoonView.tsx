/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import type { DimensionView } from '../../types';
import { handleVideoError } from '../../utils/mediaFallback';

interface ComingSoonViewProps {
  onReturnHome: (view: DimensionView) => void;
}

export const ComingSoonView: React.FC<ComingSoonViewProps> = ({ onReturnHome }) => {
  return (
    <div
      className="ff-coming-soon relative min-h-screen w-full bg-[#001428] text-white overflow-hidden select-none flex flex-col justify-between font-sans"
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
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
      />

      {/* Atmospheric Vignette & Depth Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/70 z-0 pointer-events-none" />

      {/* Top Spacer for Global Fixed Navbar */}
      <div className="ff-coming-soon__nav-spacer h-20 shrink-0" />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pt-12 pb-24 max-w-4xl mx-auto my-auto">
        {/* Heading: Comming soon!!! with clean gradient fill */}
        <h1
          className="animate-fade-rise text-3xl sm:text-5xl md:text-6xl font-['Geist_Mono:SemiBold'] font-semibold tracking-tight bg-gradient-to-r from-white via-neutral-100 to-amber-200 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,255,255,0.25)]"
          style={{ fontFamily: '"Geist Mono", monospace' }}
        >
          Comming soon!!!
        </h1>

        {/* 425px 1px solid white line divider */}
        <div
          className="my-7 mx-auto bg-white"
          style={{ width: '425px', maxWidth: '90vw', height: '1px' }}
        />

        {/* Body Copy */}
        <p className="animate-fade-rise-delay text-neutral-200 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-light">
          Không gian số đang được tinh chỉnh và nâng cấp. Ban Quản Trị F-Forum đang chuẩn bị các phân khu học thuật và tính năng mới để mang đến trải nghiệm tốt nhất cho học sinh.
        </p>

        {/* Action Button: Liquid-glass pill button returning to Homepage */}
        <button
          onClick={() => onReturnHome('home')}
          className="animate-fade-rise-delay-2 liquid-glass rounded-full px-10 sm:px-12 py-3.5 sm:py-4 text-sm font-semibold text-white mt-9 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shadow-2xl inline-flex items-center gap-2 border border-white/20 hover:border-amber-400/40"
        >
          <span>Quay lại Trang Chủ</span>
        </button>
      </main>

      {/* Footer info */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-neutral-400 font-mono">
        <span>F-Forum Platform • Bản nâng cấp 2.0 (2026)</span>
      </footer>
    </div>
  );
};

export default ComingSoonView;
