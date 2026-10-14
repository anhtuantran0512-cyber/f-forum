/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import { Compass, HelpCircle, MessageSquare, Sparkles, Users } from 'lucide-react';
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

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-4 pb-16 max-w-5xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto space-y-2.5">
          <h1 className="ff-typo-hero text-3xl sm:text-5xl md:text-6xl text-[#fff4d9]">
            Sắp ra mắt
          </h1>

          <svg className="mx-auto w-36 h-3 ff-organic-squiggle" viewBox="0 0 180 12" aria-hidden="true">
            <path d="M2 7 C32 1, 62 12, 92 6 S148 1, 178 7" />
          </svg>

          <p className="ff-typo-measure text-slate-300 text-sm sm:text-base mx-auto">
            Phân khu mới đang được hoàn thiện. Trong lúc chờ đợi, bạn có thể khám phá ngay các không gian hoạt động sôi nổi bên dưới.
          </p>
        </div>

        <div className="w-full mt-7 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="lg:col-span-5 ff-bento-cell ff-glass-depth-1 flex flex-col items-center justify-center p-5">
            <DepthLandscapeCard eyebrow="Bình minh đang tới" title="Phân khu mới đang được dựng từng lớp" />
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <button
              type="button"
              onClick={() => onReturnHome('qa')}
              className="ff-bento-cell ff-scifi-accent-bar ff-tactile-btn group text-left cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-cyan-300 font-semibold">Hỏi đáp</span>
                <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/35 flex items-center justify-center text-cyan-300">
                  <HelpCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-base font-bold text-white ff-kinetic-title ff-kinetic-underline">
                  Sàn Hỏi Đáp Tri Thức
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  Đặt câu hỏi, giải bài tập và tích lũy Coin
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onReturnHome('clubs')}
              className="ff-bento-cell ff-tactile-btn group text-left cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-amber-300 font-semibold">Cộng đồng</span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/35 flex items-center justify-center text-amber-300">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-base font-bold text-white ff-kinetic-title ff-kinetic-underline">
                  Quảng Trường CLB
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  Tham gia các câu lạc bộ học thuật, nghệ thuật &amp; thể thao
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onReturnHome('threads')}
              className="ff-bento-cell ff-tactile-btn group text-left cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-violet-300 font-semibold">Chia sẻ</span>
                <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-400/35 flex items-center justify-center text-violet-300">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-base font-bold text-white ff-kinetic-title ff-kinetic-underline">
                  Luồng Cảm Xúc
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  Góc tâm sự, chia sẻ khoảnh khắc học đường
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onReturnHome('chat')}
              className="ff-bento-cell ff-tactile-btn group text-left cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-emerald-300 font-semibold">Trực tuyến</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center text-emerald-300">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-base font-bold text-white ff-kinetic-title ff-kinetic-underline">
                  Phòng Đàm Thoại
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  Trò chuyện trực tiếp cùng bạn bè theo từng chuyên kênh
                </p>
              </div>
            </button>
          </div>
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
