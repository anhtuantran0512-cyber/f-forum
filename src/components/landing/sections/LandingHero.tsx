import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, MousePointerClick, Play, Sparkles, Star } from 'lucide-react';
import { AppWindowMock } from '../LandingMocks';
import { AuroraBackdrop, MagneticButton, Reveal, ScrambleText } from '../LandingPrimitives';
import { scrollToSection, usePrefersReducedMotion } from '../useLandingMotion';
import { HERO_TRUST } from '../landingContent';

interface LandingHeroProps {
  onOpenAuth: () => void;
  onlineCount: number;
  totalClubs: number;
  totalQuestions: number;
}

/** Floating "scroll to explore" affordance, visible while the hero owns the viewport. */
const ScrollToExplore: React.FC<{ visible: boolean }> = ({ visible }) => (
  <div
    aria-hidden={!visible}
    className={`fixed bottom-6 left-1/2 z-30 -translate-x-1/2 transition-all duration-700 sm:bottom-8 ${
      visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
    }`}
  >
    <button
      type="button"
      tabIndex={visible ? 0 : -1}
      onClick={() => scrollToSection('kham-pha')}
      className="ff-chip group flex flex-col items-center gap-1.5 !rounded-full px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ff-text-soft)] transition-colors hover:text-[var(--ff-text)]"
      aria-label="Cuộn để khám phá F-Forum"
    >
      <span className="flex items-center gap-2">
        <MousePointerClick className="h-3.5 w-3.5 text-amber-400" />
        Cuộn để khám phá
      </span>
      <span className="relative flex h-6 w-4 items-start justify-center rounded-full border border-[var(--ff-border-strong)] pt-1">
        <span className="ff-scroll-dot h-1.5 w-1 rounded-full bg-amber-400" />
      </span>
    </button>
  </div>
);

const AVATARS = [
  { label: 'MA', from: '#fbbf24', to: '#f97316' },
  { label: 'KL', from: '#38bdf8', to: '#818cf8' },
  { label: 'MQ', from: '#34d399', to: '#22d3ee' },
  { label: 'TT', from: '#f472b6', to: '#a855f7' },
  { label: 'HN', from: '#94a3b8', to: '#64748b' },
];

export const LandingHero: React.FC<LandingHeroProps> = ({
  onOpenAuth,
  onlineCount,
  totalClubs,
  totalQuestions,
}) => {
  const reduced = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const reducedRef = useRef(false);
  const [showScrollCue, setShowScrollCue] = useState(true);

  useEffect(() => {
    reducedRef.current = reduced;
    if (reduced && shellRef.current) {
      shellRef.current.style.transform = '';
      shellRef.current.style.opacity = '1';
    }
  }, [reduced]);

  // Parallax is written straight to the DOM so scrolling never re-renders the mock.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const viewport = window.innerHeight;
      const progress = Math.min(1, Math.max(0, y / (viewport * 0.85)));
      const shell = shellRef.current;
      if (shell && !reducedRef.current) {
        shell.style.transform = `translate3d(0, ${(progress * -26).toFixed(2)}px, 0)`;
        shell.style.opacity = (1 - progress * 0.25).toFixed(3);
      }
      setShowScrollCue(y < viewport * 0.55);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Cursor-tracked spotlight for the hero backdrop.
  const handlePointer = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const node = sectionRef.current;
      if (!node || reduced) return;
      const rect = node.getBoundingClientRect();
      node.style.setProperty('--hero-x', `${event.clientX - rect.left}px`);
      node.style.setProperty('--hero-y', `${event.clientY - rect.top}px`);
    },
    [reduced],
  );

  return (
    <section
      id="top"
      ref={sectionRef}
      onMouseMove={handlePointer}
      className="relative isolate flex w-full flex-col items-center overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pt-32 lg:pb-24 lg:pt-36"
      aria-label="Giới thiệu F-Forum"
    >
      {/* ---------- Ambient backdrop ---------- */}
      <AuroraBackdrop variant="mixed" />
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="ff-grid absolute inset-0" />
        <div
          className="absolute inset-0 opacity-70 transition-opacity duration-500"
          style={{
            background:
              'radial-gradient(520px circle at var(--hero-x, 50%) var(--hero-y, 30%), rgba(251,191,36,0.10), transparent 70%)',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--ff-bg)]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center text-center">
        {/* Eyebrow */}
        <Reveal y={14}>
          <span className="ff-chip px-4 py-2">
            <span className="relative flex h-2 w-2">
              <span className="ff-ping-ring absolute inline-flex h-full w-full rounded-full bg-amber-400" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
            </span>
            <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--ff-text-soft)]">
              Nền tảng học tập &amp; cộng đồng sinh viên FPT
            </span>
          </span>
        </Reveal>

        {/* Headline */}
        <Reveal y={26} delay={80}>
          <h1 className="ff-display mt-7 text-[2.35rem] leading-[1.06] sm:text-6xl lg:text-[4.25rem]">
            <span className="block text-[var(--ff-text)]">Nơi tri thức sinh viên</span>
            <span className="ff-gradient-text ff-gradient-pan mt-1 block">
              <ScrambleText text="tỏa sáng cùng nhau." delay={300} />
            </span>
          </h1>
        </Reveal>

        {/* Subheadline */}
        <Reveal y={24} delay={170}>
          <p className="ff-balance mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-[var(--ff-text-soft)] sm:text-lg">
            F-Forum gom <strong className="font-semibold text-[var(--ff-text)]">hỏi đáp bài học</strong>,{' '}
            <strong className="font-semibold text-[var(--ff-text)]">câu lạc bộ</strong>,{' '}
            <strong className="font-semibold text-[var(--ff-text)]">phòng chat thời gian thực</strong> và công cụ
            học tập trung vào một không gian số duy nhất — nhanh, đẹp và miễn phí cho mọi sinh viên.
          </p>
        </Reveal>

        {/* Calls to action */}
        <Reveal y={22} delay={250} className="w-full">
          <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
            <MagneticButton size="lg" onClick={onOpenAuth} className="w-full sm:w-auto">
              <Sparkles className="h-4 w-4" />
              Tham gia miễn phí
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </MagneticButton>

            <MagneticButton
              size="lg"
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => scrollToSection('kham-pha')}
            >
              <Play className="h-4 w-4 text-amber-400" />
              Xem F-Forum hoạt động
            </MagneticButton>
          </div>
        </Reveal>

        {/* Trust bullets */}
        <Reveal y={18} delay={330}>
          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {HERO_TRUST.map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-[12.5px] text-[var(--ff-text-dim)]">
                <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Live social proof */}
        <Reveal y={18} delay={400}>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
            <div className="flex items-center -space-x-2.5">
              {AVATARS.map((avatar) => (
                <span
                  key={avatar.label}
                  aria-hidden="true"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold text-black/80 ring-2 ring-[var(--ff-bg)]"
                  style={{ backgroundImage: `linear-gradient(135deg, ${avatar.from}, ${avatar.to})` }}
                >
                  {avatar.label}
                </span>
              ))}
              <span className="inline-flex h-9 items-center rounded-full bg-[var(--ff-surface-2)] px-3 text-[11px] font-semibold text-[var(--ff-text-soft)] ring-2 ring-[var(--ff-bg)]">
                +{Math.max(onlineCount, 1).toLocaleString('vi-VN')}
              </span>
            </div>

            <div className="text-left">
              <div className="flex items-center justify-center gap-0.5 sm:justify-start" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mt-1 text-[12.5px] text-[var(--ff-text-soft)]">
                <span className="font-semibold text-[var(--ff-text)]">{Math.max(onlineCount, 1)} sinh viên</span> đang
                online · {totalClubs} câu lạc bộ · {totalQuestions} câu hỏi
              </p>
            </div>
          </div>
        </Reveal>
      </div>

      {/* ---------- Product mock with scroll parallax ---------- */}
      <div
        ref={shellRef}
        className="relative z-10 mx-auto mt-14 w-full max-w-5xl will-change-transform sm:mt-16"
      >
        <Reveal variant="scale" y={40} delay={120}>
          <AppWindowMock />
        </Reveal>
      </div>

      {/* Scroll hint directly under the mock */}
      <div className="relative z-10 mt-10 hidden items-center gap-2 text-[11px] font-mono uppercase tracking-[0.22em] text-[var(--ff-text-dim)] lg:flex">
        <span className="h-[1px] w-10 bg-gradient-to-r from-transparent to-[var(--ff-border-strong)]" />
        <ChevronDown className="ff-chevron-1 h-3.5 w-3.5" />
        Cuộn để khám phá
        <ChevronDown className="ff-chevron-2 h-3.5 w-3.5" />
        <span className="h-[1px] w-10 bg-gradient-to-l from-transparent to-[var(--ff-border-strong)]" />
      </div>

      <ScrollToExplore visible={showScrollCue} />
    </section>
  );
};

export default LandingHero;
