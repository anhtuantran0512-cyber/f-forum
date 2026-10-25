/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import { Compass, BookOpen, Trophy, Users, Film, Sparkles } from 'lucide-react';
import type { DimensionView } from '../../types';
import { handleVideoError } from '../../utils/mediaFallback';
import { COMING_SOON_VIDEO_URL, toWebmVideoUrl } from '../../utils/chatVideos';
import { DepthLandscapeCard } from '../ui/DepthLandscapeCard';

interface ComingSoonViewProps {
  onReturnHome: (view: DimensionView) => void;
}

const ROADMAP_MODULES = [
  { id: 'vault', code: '01', title: 'KHO ĐỀ THI', status: 'Đang phát triển', icon: BookOpen },
  { id: 'arena', code: '02', title: 'ĐẤU TRƯỜNG', status: 'Thử nghiệm', icon: Trophy },
  { id: 'archive', code: '03', title: 'THƯ VIỆN CLB', status: 'Hoàn thiện', icon: Users },
];

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
        poster="/assets/video/coming-soon-poster.webp"
        aria-hidden="true"
        onError={(e) => handleVideoError(e, COMING_SOON_VIDEO_URL)}
        onLoadedMetadata={(e) => {
          e.currentTarget.playbackRate = 0.72;
        }}
        className={`ff-video-bg ff-coming-soon-video fixed inset-0 w-full h-full object-cover scale-[1.02] opacity-60 ${webmUrl ? '' : 'blur-[2px]'} z-0 pointer-events-none`}
      >
        {webmUrl ? <source src={webmUrl} type="video/webm" /> : null}
        <source src={COMING_SOON_VIDEO_URL} type="video/mp4" />
      </video>

      <div className="fixed inset-0 bg-[#070b14]/44 z-0 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-t from-[#050811]/88 via-[#050811]/[0.04] to-[#050811]/72 z-0 pointer-events-none" />

      <div className="h-20 shrink-0" />

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-4 pb-16 max-w-4xl mx-auto w-full">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-[#13161f] border border-[#f2cc8f]/40 text-[10.5px] font-mono uppercase tracking-[0.22em] text-[#f2cc8f] font-bold">
            BẢN NÂNG CẤP 2.0
          </span>
          <h1 className="ff-typo-hero text-3xl sm:text-5xl md:text-6xl text-[#fff4d9] uppercase tracking-tight">
            Sắp ra mắt
          </h1>
        </div>

        <div className="mt-6 flex items-center justify-center w-full">
          <DepthLandscapeCard eyebrow="F-FORUM 2.0" title="Không gian học tập thế hệ mới" />
        </div>

        <div className="mt-6 w-full grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {ROADMAP_MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                className="p-4 rounded-2xl bg-[#13161f]/90 border-[1.5px] border-[#f4f1de]/16 shadow-[3px_3px_0px_rgba(4,6,11,0.9)] flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-mono font-bold text-[#f2cc8f]">#{mod.code}</span>
                  <h3 className="truncate whitespace-nowrap text-xs sm:text-sm font-extrabold tracking-wider uppercase text-[#f4f1de] mt-0.5">
                    {mod.title}
                  </h3>
                  <span className="block truncate whitespace-nowrap text-[10.5px] font-mono text-[#81b29a]">{mod.status}</span>
                </div>
                <span className="w-9 h-9 rounded-xl bg-[#f4f1de]/[0.06] border border-[#f4f1de]/15 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[#f2cc8f]" />
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-5 w-full max-w-lg p-3 rounded-2xl bg-[#13161f]/85 border border-pink-400/30 backdrop-blur-md flex items-center justify-between gap-3 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-400/40 flex items-center justify-center text-pink-300">
              <Film className="w-4 h-4" />
            </span>
            <div className="text-left">
              <span className="block text-[11px] font-bold text-pink-300">Tính năng ẩn · Miền Ký Ức</span>
              <span className="block text-[10px] text-white/60">Lưu bút học sinh &amp; kỷ niệm</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onReturnHome('memory')}
            className="ff-tactile-btn px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mở Ký Ức</span>
          </button>
        </div>

        <button
          onClick={() => onReturnHome('home')}
          className="ff-tactile-btn rounded-xl px-7 py-3 text-xs sm:text-sm font-extrabold bg-[#f4f1de] hover:bg-[#f2cc8f] text-[#0b0d12] mt-7 transition-colors duration-200 cursor-pointer shadow-[4px_4px_0px_rgba(4,6,11,0.95)] inline-flex items-center gap-2 border-2 border-[#0b0d12]"
        >
          <Compass className="w-4 h-4 text-[#e07a5f]" />
          <span>Về Trang Chủ</span>
        </button>
      </main>
    </div>
  );
};

export default ComingSoonView;
