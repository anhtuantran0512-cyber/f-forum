/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowUpRight, Compass, HelpCircle, Search, BookOpen, Sparkles } from 'lucide-react';
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
    const duration = 12000;
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
        {/* Style 10: Organic + Hand-Drawn Warm Eyebrow */}
        <div className="animate-fade-up delay-1 mb-5 flex items-center justify-center gap-2.5 flex-wrap">
          <div className="ff-organic-badge !px-3.5 !py-1.5 !rounded-lg backdrop-blur-md">
            <svg className="w-3.5 h-3.5 text-[#f2cc8f] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2 C13.5 7.5, 16.5 10.5, 22 12 C16.5 13.5, 13.5 16.5, 12 22 C10.5 16.5, 7.5 13.5, 2 12 C7.5 10.5, 10.5 7.5, 12 2 Z" />
            </svg>
            <span className="font-mono text-xs tracking-wide text-[#f4f1de]">
              Góc học tập &amp; kết nối học sinh
            </span>
          </div>
        </div>

        {/* Style 1 + 5: Typography-Led Hero with Alternating Phrases */}
        <div className="relative min-h-[180px] sm:min-h-[230px] flex items-center justify-center w-full">
          <h1
            className={`ff-typo-hero text-4xl sm:text-6xl text-[#f8f7f4] font-normal tracking-tight text-center leading-tight max-w-4xl flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 ${
              headlinePhase === 0
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 pointer-events-none absolute inset-0'
            }`}
            style={{
              transition: 'opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            Diễn Đàn Học Sinh{" "}
            <span className="font-['Playfair_Display'] italic font-bold tracking-wider text-[110%] bg-gradient-to-r from-[#f8f7f4] to-[#e9c46a] bg-clip-text text-transparent whitespace-nowrap">
              F-Forum
            </span>
          </h1>

          <h1
            className={`home-hero-title ${
              headlinePhase === 1
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 pointer-events-none absolute inset-0'
            }`}
            style={{
              transition: 'opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
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
        <p className="animate-fade-up delay-3 mt-4 sm:mt-5 max-w-xl text-[#d8d5ce] text-sm sm:text-base leading-relaxed px-2 font-['Inter']">
          Không gian trao đổi bài học, giao lưu câu lạc bộ và kết nối bạn bè.
        </p>

        {/* Thanh tìm kiếm Đề thi & Đề cương: Bấm vào chuyển hướng ngay sang trang riêng */}
        <div className="animate-fade-up delay-35 mt-5 w-full max-w-md mx-auto">
          <div
            onClick={() => onNavigate('exam-vault')}
            className="group relative cursor-pointer select-none rounded-2xl p-1 bg-white/[0.05] hover:bg-white/[0.09] border border-white/20 hover:border-amber-400/50 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-300"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onNavigate('exam-vault');
              }
            }}
            aria-label="Tìm kiếm đề thi và đề cương — Mở trang kho đề riêng"
          >
            <div className="flex items-center justify-between gap-2.5 px-3.5 py-2">
              <div className="flex items-center gap-2.5 text-white/70 group-hover:text-white transition-colors flex-1 min-w-0">
                <Search className="w-4 h-4 text-amber-300 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-xs sm:text-sm text-neutral-300 group-hover:text-white truncate">
                  Tìm kiếm đề thi, đề cương ôn tập toàn quốc... ↗
                </span>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-400/15 border border-amber-400/30 text-[10px] font-mono font-bold text-amber-300 tracking-wider uppercase shrink-0">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Kho Đề Thi
              </span>
            </div>
          </div>
        </div>

        {/* Style 3 + 8: Neo-Brutalist & Tactile Squishy Action Buttons */}
        <div className="animate-fade-up delay-4 mt-6 sm:mt-7 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => onNavigate('clubs')}
            className="ff-tactile-btn group w-full sm:w-auto rounded-xl bg-[#f4f1de] hover:bg-[#f2cc8f] px-5 py-2.5 sm:px-6 sm:py-3 text-sm font-extrabold text-[#0b0d12] border-2 border-[#0b0d12] inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Compass className="w-4 h-4 text-[#e07a5f]" />
            <span>Câu Lạc Bộ</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>

          <button
            onClick={() => onNavigate('qa')}
            className="ff-tactile-btn w-full sm:w-auto ff-glass-depth-1 rounded-xl px-5 py-2.5 sm:px-6 sm:py-3 text-sm font-bold text-[#f4f1de] inline-flex items-center justify-center gap-2 hover:border-[#81b29a]/60 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-[#81b29a]" />
            <span>Hỏi Đáp Bài Tập</span>
          </button>

          <button
            onClick={() => onNavigate('exam-vault')}
            className="ff-tactile-btn w-full sm:w-auto rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 border border-amber-400/40 px-5 py-2.5 sm:px-6 sm:py-3 text-sm font-bold text-amber-200 inline-flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_18px_rgba(245,158,11,0.18)]"
          >
            <BookOpen className="w-4 h-4 text-amber-300" />
            <span>Kho Đề Thi</span>
          </button>
        </div>

        {onOpenLanding && (
          <button
            type="button"
            onClick={onOpenLanding}
            className="animate-fade-up delay-5 group mt-4 inline-flex items-center gap-1.5 text-xs font-mono text-[#d8d5ce] hover:text-[#f2cc8f] transition-colors cursor-pointer"
          >
            <span className="ff-kinetic-underline">Giới thiệu dự án</span>
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        )}
      </div>
    </section>
  );
};

export default HomeView;
