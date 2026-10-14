/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import { ArrowRight, Compass, Cpu, HelpCircle, Layers, MessageSquare, Sparkles, Users } from 'lucide-react';
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
      {/* Video Background: Fullscreen looping video (WebM + 18fps + soft blur optimization) */}
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

      {/* Atmospheric Vignette & Depth Overlay */}
      <div className="fixed inset-0 bg-[#070b14]/70 z-0 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-t from-[#050811] via-transparent to-[#050811]/85 z-0 pointer-events-none" />

      {/* Top Spacer for Global Fixed Navbar */}
      <div className="h-20 shrink-0" />

      {/* Main Content Area: 10-Style Editorial + Bento Roadmap Showcase */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-6 pb-20 max-w-6xl mx-auto w-full">
        {/* Style 1 + 9 + 10: Typography-Led Hero + Holographic Status + Organic Squiggle */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 flex-wrap justify-center">
            <span className="ff-brutal-index">BUILD · 2026.10</span>
            <span className="ff-holo-badge px-3 py-1 rounded-full text-xs font-mono font-semibold text-cyan-100 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Kiến trúc Giao diện 10 Phong cách &amp; P0–P4 60FPS
            </span>
          </div>

          <h1 className="ff-typo-hero text-3xl sm:text-5xl md:text-6xl text-[#fff4d9]">
            Sắp ra mắt
          </h1>

          <svg className="mx-auto w-44 h-3 ff-organic-squiggle" viewBox="0 0 180 12" aria-hidden="true">
            <path d="M2 7 C32 1, 62 12, 92 6 S148 1, 178 7" />
          </svg>

          <p className="ff-typo-measure text-slate-300 text-sm sm:text-base mx-auto">
            Phân khu mở rộng tiếp theo của F-Forum đang được hoàn thiện với ngôn ngữ thiết kế Bento mô-đun,
            Typography biểu cảm và bộ nhân đồ họa thích ứng 60 FPS trên mọi thiết bị.
          </p>
        </div>

        {/* Style 2 + 4: Modular Bento Grid Layout */}
        <div className="w-full mt-8 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left Featured Cell (Col 5): DepthLandscapeCard */}
          <div className="lg:col-span-5 ff-bento-cell ff-glass-depth-1 flex flex-col items-center justify-center p-5">
            <DepthLandscapeCard eyebrow="Bình minh đang tới" title="Phân khu mới đang được dựng từng lớp" />
            <div className="mt-4 w-full flex items-center justify-between pt-3 border-t border-white/10">
              <span className="ff-raw-meta">STAGE: PARALLAX_DEPTH</span>
              <span className="ff-organic-badge">Nét vẽ thủ công &amp; Đa lớp</span>
            </div>
          </div>

          {/* Right Roadmap Bento Cells (Col 7) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="ff-bento-cell ff-scifi-accent-bar flex flex-col justify-between text-left">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="ff-brutal-tag bg-cyan-500/15 text-cyan-200 border-cyan-400/40">
                    <Cpu className="w-3.5 h-3.5 text-cyan-300" />
                    ENGINE P0–P4
                  </span>
                  <span className="ff-raw-meta">DPR &lt;= 2.0</span>
                </div>
                <h2 className="text-base font-extrabold text-white ff-kinetic-title">
                  Render On-Demand &amp; Culling
                </h2>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Vòng lặp đồ họa chỉ kích hoạt khi có tương tác thực tế, kết hợp loại bỏ mặt khuất bán cầu sau và tự động điều chỉnh chất lượng theo FPS.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between">
                <span className="ff-raw-meta text-emerald-300">STATUS: ACTIVE</span>
                <span className="ff-raw-meta">60 FPS TARGET</span>
              </div>
            </div>

            <div className="ff-bento-cell flex flex-col justify-between text-left">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="ff-brutal-tag bg-violet-500/15 text-violet-200 border-violet-400/40">
                    <Layers className="w-3.5 h-3.5 text-violet-300" />
                    10-STYLE UI
                  </span>
                  <span className="ff-raw-meta">WCAG AAA</span>
                </div>
                <h2 className="text-base font-extrabold text-white ff-kinetic-title">
                  Typography, Bento &amp; Tactile
                </h2>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Sự kết hợp hài hòa giữa Typography cỡ lớn, lưới Bento, nhãn Neo-Brutalism, kính mờ đa tầng và phản hồi chạm vật lý Squishy.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between">
                <span className="ff-raw-meta text-amber-300">COLOR: 60-30-10</span>
                <span className="ff-raw-meta">EYE-SAFE</span>
              </div>
            </div>

            {/* Quick Navigation Cards into Active Forum Views */}
            <button
              type="button"
              onClick={() => onReturnHome('qa')}
              className="ff-bento-cell ff-tactile-btn group text-left cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <span className="ff-brutal-index">#QA · HỎI ĐÁP</span>
                <p className="text-sm font-bold text-white mt-1.5 ff-kinetic-title ff-kinetic-underline">
                  Vào Sàn Hỏi Đáp Tri Thức
                </p>
                <p className="text-xs text-slate-300 mt-0.5 truncate">
                  Giải bài tập, tích lũy Coin &amp; Huy hiệu
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/35 flex items-center justify-center shrink-0 text-cyan-300 group-hover:translate-x-0.5 transition-transform">
                <HelpCircle className="w-4 h-4" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => onReturnHome('clubs')}
              className="ff-bento-cell ff-tactile-btn group text-left cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <span className="ff-brutal-index">#CLUBS · CỘNG ĐỒNG</span>
                <p className="text-sm font-bold text-white mt-1.5 ff-kinetic-title ff-kinetic-underline">
                  Khám Phá Quảng Trường CLB
                </p>
                <p className="text-xs text-slate-300 mt-0.5 truncate">
                  Giao lưu học thuật, nghệ thuật &amp; công nghệ
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/35 flex items-center justify-center shrink-0 text-amber-300 group-hover:translate-x-0.5 transition-transform">
                <Users className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>

        {/* Action Row: Tactile Squishy Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => onReturnHome('home')}
            className="ff-tactile-btn liquid-glass rounded-full px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors duration-200 cursor-pointer shadow-2xl inline-flex items-center gap-2 border border-white/20 hover:border-amber-400/40"
          >
            <Compass className="w-4 h-4 text-amber-300" />
            <span>Quay lại Trang Chủ</span>
          </button>

          <button
            onClick={() => onReturnHome('threads')}
            className="ff-tactile-btn rounded-full px-6 py-3.5 text-sm font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-slate-100 border border-white/15 inline-flex items-center gap-2 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-violet-300" />
            <span>Mở Luồng Cảm Xúc</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </main>

      {/* Footer info */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-neutral-400 font-mono">
        <span>F-Forum • Luôn có điều để khám phá</span>
      </footer>
    </div>
  );
};

export default ComingSoonView;
