import React, { useState, useEffect } from 'react';
import { ArrowRight, Compass, HelpCircle } from 'lucide-react';
import type { DimensionView } from '../../types';
import { BoomerangVideoBg } from '../BoomerangVideoBg';

interface HomeViewProps {
  onNavigate: (view: DimensionView) => void;
  totalClubs: number;
  totalQuestions?: number;
  solvedQuestionsCount: number;
  onlineCount?: number;
  onlineUsersCount?: number;
  resolvedQuestionsCount?: number;
  totalClubsCount?: number;
  chatMessagesTodayCount?: number;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  totalClubs,
  solvedQuestionsCount,
  onlineCount = 1,
  onlineUsersCount = onlineCount,
  resolvedQuestionsCount = solvedQuestionsCount,
  totalClubsCount = totalClubs,
  chatMessagesTodayCount = 0,
}) => {
  // Alternating headline: 3s for "Diễn Đàn Học Sinh F-Forum", 4s for "Nơi Khai Phóng Tiềm Năng Tuổi Trẻ"
  const [headlinePhase, setHeadlinePhase] = useState<0 | 1>(0);

  useEffect(() => {
    const duration = headlinePhase === 0 ? 3000 : 4000;
    const timer = setTimeout(() => {
      setHeadlinePhase((prev) => (prev === 0 ? 1 : 0));
    }, duration);
    return () => clearTimeout(timer);
  }, [headlinePhase]);

  return (
    <section className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center">
      {/* Background Boomerang Engine */}
      <BoomerangVideoBg />

      {/* Hero Foreground Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center pt-16 sm:pt-10">
        
        {/* Tag Badge */}
        <div className="animate-fade-up delay-1 mb-6">
          <div className="liquid-glass rounded-full px-4 py-1.5 text-xs sm:text-sm text-amber-300 inline-flex items-center gap-2 border border-amber-400/25 shadow-[0_0_15px_rgba(245,158,11,0.15)] bg-[#0c1218]/60 backdrop-blur-xl">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-ping" />
            <span className="font-semibold tracking-wider uppercase font-mono">
              F-FORUM • HỆ THỐNG GIAO LƯU TRI THỨC TOÀN TRƯỜNG
            </span>
          </div>
        </div>

        {/* Headline with Alternating Phrases (3s / 4s) & Single-Line Styled F-Forum */}
        <div className="relative min-h-[90px] sm:min-h-[140px] flex items-center justify-center w-full">
          {/* Phase 1: Calligraphic Artistic F-FORUM */}
          <h1
            className={`text-4xl sm:text-6xl text-white font-normal tracking-tight text-center leading-tight max-w-4xl flex items-center justify-center ${
              headlinePhase === 0
                ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                : 'opacity-0 -translate-y-2 scale-98 pointer-events-none absolute inset-0'
            }`}
            style={{
              transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s var(--ease, cubic-bezier(0.16, 1, 0.3, 1))',
            }}
          >
            Diễn Đàn Học Sinh{" "}
            <span className="font-['Playfair_Display'] italic font-bold tracking-wider text-[110%] bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(245,158,11,0.5)] whitespace-nowrap">
              F-Forum
            </span>
          </h1>

          {/* Phase 2: Refined Calligraphic Vietnamese Tiềm Năng */}
          <h1
            className={`text-4xl sm:text-6xl text-white font-normal tracking-tight text-center leading-tight max-w-4xl flex items-center justify-center ${
              headlinePhase === 1
                ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                : 'opacity-0 translate-y-2 scale-98 pointer-events-none absolute inset-0'
            }`}
            style={{
              transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s var(--ease, cubic-bezier(0.16, 1, 0.3, 1))',
            }}
          >
            Nơi Khai Phóng{" "}
            <span className="font-['Playfair_Display'] italic font-semibold text-amber-300 drop-shadow-[0_0_18px_rgba(252,211,77,0.4)]">
              Tiềm Năng
            </span>{" "}
            Tuổi Trẻ FPT.
          </h1>
        </div>

        {/* Subtext */}
        <p className="animate-fade-up delay-3 mt-5 sm:mt-6 max-w-xl text-neutral-300 text-sm sm:text-base leading-relaxed px-2 font-['Inter']">
          Không gian trao đổi bài học, giao lưu câu lạc bộ và kết nối bạn bè.
        </p>

        {/* Dual Action Buttons */}
        <div className="animate-fade-up delay-4 mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
          {/* Primary: White pill button */}
          <button
            onClick={() => onNavigate('clubs')}
            className="group w-full sm:w-auto rounded-full bg-white px-7 py-3 text-sm font-semibold text-neutral-900 hover:scale-105 active:scale-95 transition-all duration-200 inline-flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(255,255,255,0.25)] cursor-pointer"
          >
            <Compass className="w-4 h-4 text-amber-600" />
            <span>Khám Phá Câu Lạc Bộ</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:rotate-45" />
          </button>

          {/* Secondary: Liquid-glass button */}
          <button
            onClick={() => onNavigate('qa')}
            className="w-full sm:w-auto liquid-glass rounded-full px-7 py-3 text-sm font-medium text-white hover:scale-105 active:scale-95 transition-all duration-200 inline-flex items-center justify-center gap-2 border border-white/20 hover:border-amber-400/40 shadow-lg cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>Sàn Hỏi Đáp Tri Thức</span>
          </button>
        </div>
      </div>

      {/* Live Campus Telemetry HUD (Bottom Right Floating Widget) */}
      <div className="fixed bottom-6 right-6 z-30 hidden md:block">
        <div className="liquid-glass rounded-2xl p-4 w-[250px] shadow-2xl border border-white/10 transition-transform duration-300 hover:scale-[1.02]">
          {/* Header Indicator */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-semibold">
                Campus Telemetry
              </span>
            </div>
            <span className="text-[9px] font-mono bg-white/5 px-2 py-0.5 rounded text-white/40 border border-white/10">
              LIVE
            </span>
          </div>

          {/* Metrics Grid */}
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between text-white/70">
              <span className="text-white/40">Học sinh online:</span>
              <span className="font-semibold text-emerald-300">{onlineUsersCount}</span>
            </div>
            <div className="flex items-center justify-between text-white/70">
              <span className="text-white/40">Câu hỏi đã giải:</span>
              <span className="font-semibold text-amber-300">{resolvedQuestionsCount}</span>
            </div>
            <div className="flex items-center justify-between text-white/70">
              <span className="text-white/40">Tổng CLB đăng ký:</span>
              <span className="font-semibold text-sky-300">{totalClubsCount}</span>
            </div>
            <div className="flex items-center justify-between text-white/70">
              <span className="text-white/40">Thảo luận 24h:</span>
              <span className="font-semibold text-purple-300">{chatMessagesTodayCount}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeView;
