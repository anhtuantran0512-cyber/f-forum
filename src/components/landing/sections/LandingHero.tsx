import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpenCheck, Check, ChevronDown, MousePointerClick, Play, Sparkles, LogIn, Swords, GraduationCap } from 'lucide-react';
import type { DimensionView, User } from '../../../types';
import { AuroraBackdrop, MagneticButton, Reveal } from '../LandingPrimitives';
import { HardwareShowcase } from '../../HardwareShowcase';
import { scrollToSection, usePrefersReducedMotion } from '../useLandingMotion';
import { HERO_TRUST } from '../landingContent';

interface LandingHeroProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  onOpenLogin: () => void;
  onNavigate: (view: DimensionView) => void;
}

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
      className="relative isolate flex w-full flex-col justify-center overflow-hidden px-4 pb-16 pt-28 sm:px-8 sm:pt-36 lg:min-h-[calc(100svh-1rem)] lg:pb-24 lg:pt-36"
      aria-label="Giới thiệu F-Forum"
    >
      <AuroraBackdrop variant="amber" />
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="ff-grid absolute inset-0 opacity-40" />
        <div className="ff-landing-hero-light absolute inset-0" />
        <div
          className="absolute inset-0 opacity-70 transition-opacity duration-500"
          style={{
            background:
              'radial-gradient(640px circle at var(--hero-x, 50%) var(--hero-y, 30%), rgba(251,191,36,0.14), transparent 75%)',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-b from-transparent to-[var(--ff-bg)]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1360px] flex-col items-center">
        <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="flex flex-col items-start text-left lg:col-span-7">
            <Reveal y={14}>
              <div
                className="inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[11px] font-mono font-bold tracking-[0.16em] uppercase text-amber-300 backdrop-blur-md"
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                }}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                <span>Cộng đồng học thuật · Tri thức lớn từ đối thoại nhỏ</span>
              </div>
            </Reveal>

            <Reveal y={26} delay={80}>
              <h1 className="ff-display mt-8 text-[2.75rem] leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.15rem] text-[var(--ff-text)]">
                <span className="block font-serif italic text-amber-200/90 font-normal">
                  <span className="ff-swash-cap">K</span>hai phóng tư duy,
                </span>
                <span className="mt-2 block font-sans font-extrabold text-white">
                  chạm sâu bản chất tri thức.
                </span>
              </h1>
            </Reveal>

            <Reveal y={24} delay={170}>
              <p
                className="mt-6 max-w-xl text-[15.5px] leading-relaxed text-slate-300 sm:text-[17px] p-5 rounded-2xl backdrop-blur-lg"
                style={{
                  background: 'rgba(15, 23, 42, 0.45)',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                }}
              >
                Không giải bài hộ, không tạo thói quen thụ động. F-Forum 2027 mang đến giao diện 2.5D phi đối xứng chuẩn mực,
                nơi học sinh - sinh viên cùng mổ xẻ bài toán hóc búa, cọ xát phòng thi CBT và khám phá vũ trụ khoa học chân thực.
              </p>
            </Reveal>

            <Reveal y={22} delay={250} className="w-full">
              <div className="mt-8 flex w-full flex-col items-start gap-3.5 sm:flex-row sm:items-center flex-wrap">
                <button
                  type="button"
                  onClick={() => onNavigate('exam-vault')}
                  className="btn-feastables ff-tactile-pop px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-[#0b0d12] font-black text-sm border-2 border-[#0b0d12] shadow-[4px_4px_0px_#0b0d12] flex items-center justify-center gap-2 cursor-pointer transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#0b0d12]"
                >
                  <GraduationCap className="h-4.5 w-4.5 text-[#0b0d12]" />
                  <span>Khám Phá Sảnh Thi CBT</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('fforum_open_peer_battle'));
                  }}
                  className="btn-feastables ff-tactile-pop px-5 py-3 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-sm border-2 border-[#0b0d12] shadow-[4px_4px_0px_#0b0d12] flex items-center justify-center gap-2 cursor-pointer transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#0b0d12]"
                >
                  <Swords className="h-4.5 w-4.5 text-amber-300" />
                  <span>Vào Đấu Trường 1vs1</span>
                </button>

                {!currentUser ? (
                  <div className="flex items-center gap-2">
                    <MagneticButton
                      size="lg"
                      variant="ghost"
                      className="w-full sm:w-auto backdrop-blur-md"
                      onClick={onOpenAuth}
                    >
                      <BookOpenCheck className="h-4 w-4 text-amber-300" />
                      Đăng ký
                    </MagneticButton>

                    <MagneticButton
                      size="lg"
                      variant="ghost"
                      className="w-full sm:w-auto backdrop-blur-md"
                      onClick={onOpenLogin}
                    >
                      <LogIn className="h-4 w-4 text-emerald-400" />
                      Đăng nhập
                    </MagneticButton>
                  </div>
                ) : (
                  <MagneticButton
                    size="lg"
                    variant="ghost"
                    className="w-full sm:w-auto backdrop-blur-md"
                    onClick={() => onNavigate('home')}
                  >
                    <Play className="h-4 w-4 text-amber-400" />
                    Vào bàn học
                  </MagneticButton>
                )}
              </div>
            </Reveal>

            <Reveal y={18} delay={330}>
              <div
                className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 p-4 rounded-xl backdrop-blur-sm"
                style={{
                  background: 'rgba(2, 6, 23, 0.4)',
                  border: '1px solid rgba(148, 163, 184, 0.12)',
                }}
              >
                {HERO_TRUST.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-[12.5px] text-slate-300">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <div className="flex w-full items-center justify-center lg:col-span-5">
            <Reveal variant="scale" y={20} delay={140} className="w-full flex justify-center">
              <div className="relative group perspective-[1200px]">
                <HardwareShowcase onNavigate={onNavigate} />
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto mt-14 hidden items-center gap-2 text-[11px] font-mono uppercase tracking-[0.22em] text-[var(--ff-text-dim)] lg:flex">
        <span className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[var(--ff-border-strong)]" />
        <ChevronDown className="ff-chevron-1 h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
        Cuộn để trải nghiệm toàn cảnh
        <ChevronDown className="ff-chevron-2 h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
        <span className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[var(--ff-border-strong)]" />
      </div>

      <ScrollToExplore visible={showScrollCue} />
    </section>
  );
};

export default LandingHero;
