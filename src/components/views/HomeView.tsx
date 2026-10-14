/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowUpRight, Compass, HelpCircle } from 'lucide-react';
import type { DimensionView } from '../../types';
import { BoomerangVideoBg } from '../BoomerangVideoBg';
import './HomeHeroTitle.css';

interface HomeViewProps {
  onNavigate: (view: DimensionView) => void;
  /** Opens the marketing landing page (optional: falls back to hidden). */
  onOpenLanding?: () => void;
  totalClubs: number;
  totalQuestions?: number;
  solvedQuestionsCount: number;
  onlineCount?: number;
  onlineUsersCount?: number;
  resolvedQuestionsCount?: number;
  totalClubsCount?: number;
  chatMessagesTodayCount?: number;
  streakCount?: number;
  onOpenDaily?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onOpenLanding,
}) => {
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
        <div className="animate-fade-up delay-1 mb-6 flex items-center justify-center gap-3 flex-wrap">
          <div className="liquid-glass rounded-full px-4 py-1.5 text-xs sm:text-sm text-amber-300 inline-flex items-center gap-2 border border-amber-400/25 shadow-[0_0_15px_rgba(245,158,11,0.15)] bg-[#0c1218]/60 backdrop-blur-xl">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-ping" />
            <span className="font-semibold tracking-wider uppercase font-mono">
              F-FORUM • HỆ THỐNG GIAO LƯU TRI THỨC TOÀN TRƯỜNG
            </span>
          </div>
        </div>

        {/* Headline with Alternating Phrases (3s / 4s) & Single-Line Styled F-Forum */}
        <div className="relative min-h-[180px] sm:min-h-[230px] flex items-center justify-center w-full">
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

          {/* A deliberate vertical composition, not incidental line wrapping. */}
          <h1
            className={`home-hero-title ${
              headlinePhase === 1
                ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                : 'opacity-0 translate-y-2 scale-98 pointer-events-none absolute inset-0'
            }`}
            style={{
              transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s var(--ease, cubic-bezier(0.16, 1, 0.3, 1))',
            }}
          >
            <span className="home-hero-title__top">Nơi Khai Phóng</span>
            <span className="home-hero-title__focus">
              <span className="home-hero-title__word">Tiềm</span>{' '}
              <span className="home-hero-title__word">Năng</span>
              <svg className="home-hero-title__wave" viewBox="0 0 320 18" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                <path d="M1 10 C28 -1 52 -1 80 10 S132 21 160 10 S212 -1 240 10 S292 21 319 10" />
              </svg>
            </span>
            <span className="home-hero-title__bottom"><i aria-hidden="true" />Tuổi Trẻ Việt Nam<i aria-hidden="true" /></span>
          </h1>
        </div>

        {/* Subtext */}
        <p className="animate-fade-up delay-3 mt-5 sm:mt-6 max-w-xl text-neutral-300 text-sm sm:text-base leading-relaxed px-2 font-['Inter']">
          Không gian trao đổi bài học, giao lưu câu lạc bộ và kết nối bạn bè.
        </p>

        {/* Dual Action Buttons */}
        <div className="animate-fade-up delay-4 mt-7 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
          <button
            onClick={() => onNavigate('clubs')}
            className="ff-tactile-btn group w-full sm:w-auto rounded-full bg-white px-7 py-3 text-sm font-semibold text-neutral-900 inline-flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(255,255,255,0.25)] cursor-pointer"
          >
            <Compass className="w-4 h-4 text-amber-600" />
            <span>Khám Phá Câu Lạc Bộ</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:rotate-45" />
          </button>

          <button
            onClick={() => onNavigate('qa')}
            className="ff-tactile-btn w-full sm:w-auto liquid-glass rounded-full px-7 py-3 text-sm font-medium text-white inline-flex items-center justify-center gap-2 border border-white/20 hover:border-amber-400/40 shadow-lg cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>Sàn Hỏi Đáp Tri Thức</span>
          </button>
        </div>

        {/* Tertiary: marketing landing page */}
        {onOpenLanding && (
          <button
            type="button"
            onClick={onOpenLanding}
            className="animate-fade-up delay-5 group mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-neutral-300 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <span className="ff-kinetic-underline">Tìm hiểu về F-Forum</span>
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        )}
      </div>
    </section>
  );
};

export default HomeView;
