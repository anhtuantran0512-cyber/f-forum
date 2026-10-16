/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpenCheck, Check, ChevronDown, MousePointerClick, Play } from 'lucide-react';
import type { DimensionView, User } from '../../../types';
import { AuroraBackdrop, MagneticButton, Reveal, ScrambleText } from '../LandingPrimitives';
import { LandingHomePreview } from '../LandingHomePreview';
import { scrollToSection, usePrefersReducedMotion } from '../useLandingMotion';
import { HERO_TRUST } from '../landingContent';

interface LandingHeroProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  onOpenLogin: () => void;
  onNavigate: (view: DimensionView) => void;
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

export const LandingHero: React.FC<LandingHeroProps> = ({ currentUser, onOpenAuth, onOpenLogin, onNavigate }) => {
  const reduced = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const [showScrollCue, setShowScrollCue] = useState(true);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setShowScrollCue(window.scrollY < window.innerHeight * 0.55);
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
      className="relative isolate flex w-full flex-col justify-center overflow-hidden px-4 pb-12 pt-28 sm:px-6 sm:pt-32 lg:min-h-[calc(100svh-2rem)] lg:pb-16 lg:pt-32"
      aria-label="Giới thiệu F-Forum"
    >
      <AuroraBackdrop variant="amber" />
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="ff-grid absolute inset-0" />
        <div className="ff-landing-hero-light absolute inset-0" />
        <div
          className="absolute inset-0 opacity-75 transition-opacity duration-500"
          style={{
            background:
              'radial-gradient(540px circle at var(--hero-x, 50%) var(--hero-y, 30%), rgba(251,191,36,0.12), transparent 72%)',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--ff-bg)]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-col items-center">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
          <Reveal y={14}>
            <span className="ff-chip gap-2 px-4 py-2">
              <BookOpenCheck className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--ff-text-soft)]">
                Diễn đàn học thuật · Học · Hỏi · Chia sẻ
              </span>
            </span>
          </Reveal>

          <Reveal y={26} delay={80}>
            <h1 className="ff-display ff-balance mt-7 text-[2.35rem] leading-[1.06] sm:text-6xl lg:text-[3.8rem] xl:text-[4.25rem]">
              <span className="block text-[var(--ff-text)]">
                <span className="ff-swash-cap">Đ</span>iều còn vướng,
              </span>
              <span className="ff-gradient-text ff-gradient-pan mt-1 inline-flex flex-col items-center">
                <ScrambleText text="cùng tìm cách hiểu." delay={300} />
                <svg className="mt-1 h-3 w-48 sm:w-64 text-amber-300/75 ff-swash-flourish" viewBox="0 0 240 16" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M2 11 C46 1, 92 16, 142 7 S204 1, 238 10" />
                </svg>
              </span>
            </h1>
          </Reveal>

          <Reveal y={24} delay={170}>
            <p className="ff-balance mt-6 max-w-2xl text-[15px] leading-relaxed text-[var(--ff-text-soft)] sm:text-lg">
              F-Forum là không gian để học sinh, sinh viên và thầy cô cùng mổ xẻ bài tập theo từng bước lập luận, đối
              chiếu học liệu và rèn tư duy phản biện. Không giải bài hộ — chỉ mở ra một bàn học để cùng hiểu rõ bản chất.
            </p>
          </Reveal>

          <Reveal y={22} delay={250} className="w-full">
            <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
              <MagneticButton size="lg" onClick={onOpenAuth} className="w-full sm:w-auto">
                <BookOpenCheck className="h-4 w-4" />
                {currentUser ? 'Vào diễn đàn' : 'Đặt câu hỏi'}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </MagneticButton>

              <MagneticButton
                size="lg"
                variant="ghost"
                className="w-full sm:w-auto"
                onClick={() => scrollToSection('kham-pha')}
              >
                <Play className="h-4 w-4 text-amber-400" />
                Xem F-Forum
              </MagneticButton>
            </div>
          </Reveal>

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
        </div>

        <Reveal variant="scale" y={24} delay={140} className="relative z-10 mx-auto mt-12 w-full max-w-[1200px]">
          <LandingHomePreview
            currentUser={currentUser}
            onNavigate={onNavigate}
            onOpenLogin={onOpenLogin}
          />
        </Reveal>
      </div>

      <div className="relative z-10 mx-auto mt-8 hidden items-center gap-2 text-[11px] font-mono uppercase tracking-[0.22em] text-[var(--ff-text-dim)] lg:flex">
        <span className="h-[1px] w-10 bg-gradient-to-r from-transparent to-[var(--ff-border-strong)]" />
        <ChevronDown className="ff-chevron-1 h-3.5 w-3.5" aria-hidden="true" />
        Cuộn để khám phá
        <ChevronDown className="ff-chevron-2 h-3.5 w-3.5" aria-hidden="true" />
        <span className="h-[1px] w-10 bg-gradient-to-l from-transparent to-[var(--ff-border-strong)]" />
      </div>

      <ScrollToExplore visible={showScrollCue} />
    </section>
  );
};

export default LandingHero;
