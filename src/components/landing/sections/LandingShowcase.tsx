import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, MousePointerClick } from 'lucide-react';
import { ArenaMock, ClubsMock, QAMock } from '../LandingMocks';
import { Reveal } from '../LandingPrimitives';
import { SHOWCASE_STEPS } from '../landingContent';

const MOCKS = [<QAMock key="qa" />, <ClubsMock key="clubs" />, <ArenaMock key="arena" />];

/**
 * "Scroll to explore" product tour.
 *
 * On large screens the section becomes a pinned track: scrolling scrubs through
 * the three product surfaces while the copy column stays put. On mobile the same
 * content is stacked so nothing is hidden behind a hover-only interaction.
 */
export const LandingShowcase: React.FC = () => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const node = trackRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const next = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;
      setProgress(next);
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

  const activeIndex = Math.min(SHOWCASE_STEPS.length - 1, Math.floor(progress * SHOWCASE_STEPS.length));

  const scrollToStep = useCallback((index: number) => {
    const node = trackRef.current;
    if (!node) return;
    const top = node.getBoundingClientRect().top + window.scrollY;
    const scrollable = node.offsetHeight - window.innerHeight;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: top + (scrollable * (index + 0.08)) / SHOWCASE_STEPS.length,
      behavior: reduced ? 'auto' : 'smooth',
    });
  }, []);

  return (
    <section id="kham-pha" aria-label="Khám phá sản phẩm" className="relative w-full py-20 sm:py-24">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="ff-aurora ff-aurora-anim-slow"
          style={{
            width: '600px',
            height: '600px',
            top: '20%',
            left: '-14%',
            background: 'radial-gradient(circle at 50% 50%, rgba(34,211,238,0.28), transparent 66%)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal y={18}>
            <span className="ff-eyebrow inline-flex items-center gap-2">
              <span className="h-[1px] w-6 bg-current opacity-60" aria-hidden="true" />
              Hành trình 3 bước
            </span>
          </Reveal>
          <Reveal y={24} delay={80}>
            <h2 className="ff-display ff-balance mt-4 text-3xl sm:text-4xl md:text-[2.75rem]">
              Cuộn để khám phá F-Forum
            </h2>
          </Reveal>
          <Reveal y={22} delay={160}>
            <p className="mt-5 text-base leading-relaxed text-[var(--ff-text-soft)]">
              Từ câu hỏi đầu tiên đến tấm huy hiệu đầu tiên — mỗi bước đều được thiết kế để bạn tiến xa hơn
              một chút so với hôm qua.
            </p>
          </Reveal>
        </div>
      </div>

      {/* ---------- Mobile: stacked story ---------- */}
      <div className="relative mx-auto mt-12 grid max-w-6xl gap-12 px-4 sm:px-6 lg:hidden">
        {SHOWCASE_STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <Reveal key={step.id} y={30} delay={60}>
              <article className="ff-glass ff-card p-6">
                <span className="ff-eyebrow">{step.eyebrow}</span>
                <h3 className="mt-3 flex items-center gap-2.5 text-xl font-semibold tracking-tight text-[var(--ff-text)]">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/12 ring-1 ring-amber-400/25">
                    <Icon className="h-4 w-4 text-amber-300" aria-hidden="true" />
                  </span>
                  {step.title}
                </h3>
                <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--ff-text-soft)]">{step.description}</p>
                <ul className="mt-4 grid gap-2">
                  {step.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-[12.5px] text-[var(--ff-text-dim)]">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">{MOCKS[index]}</div>
              </article>
            </Reveal>
          );
        })}
      </div>

      {/* ---------- Desktop: pinned scroll-scrubbed tour ---------- */}
      <div ref={trackRef} className="relative hidden lg:block" style={{ height: '320vh' }}>
        <div className="sticky top-24 flex h-[calc(100vh-7rem)] items-center">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] gap-12 px-6">
            {/* Copy column */}
            <div className="flex flex-col justify-center">
              <ol className="space-y-3">
                {SHOWCASE_STEPS.map((step, index) => {
                  const isActive = index === activeIndex;
                  const Icon = step.icon;
                  return (
                    <li key={step.id}>
                      <button
                        type="button"
                        onClick={() => scrollToStep(index)}
                        aria-pressed={isActive}
                        className={`w-full rounded-3xl border p-5 text-left transition-all duration-500 ${
                          isActive
                            ? 'border-amber-400/35 bg-[var(--ff-surface-2)] shadow-[0_20px_60px_rgba(0,0,0,0.35)]'
                            : 'border-[var(--ff-border)] bg-transparent hover:border-[var(--ff-border-strong)]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl transition-colors duration-500 ${
                              isActive
                                ? 'bg-amber-500/18 text-amber-300 ring-1 ring-amber-400/30'
                                : 'bg-[var(--ff-surface)] text-[var(--ff-text-dim)] ring-1 ring-[var(--ff-border)]'
                            }`}
                          >
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <span
                              className={`font-mono text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors duration-500 ${
                                isActive ? 'text-amber-300' : 'text-[var(--ff-text-dim)]'
                              }`}
                            >
                              {step.eyebrow}
                            </span>
                            <h3
                              className={`text-[17px] font-semibold tracking-tight transition-colors duration-500 ${
                                isActive ? 'text-[var(--ff-text)]' : 'text-[var(--ff-text-soft)]'
                              }`}
                            >
                              {step.title}
                            </h3>
                          </div>
                        </div>

                        <div
                          className={`grid transition-all duration-500 ${
                            isActive ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                          }`}
                        >
                          <div className="overflow-hidden">
                            <p className="text-[13.5px] leading-relaxed text-[var(--ff-text-soft)]">
                              {step.description}
                            </p>
                            <ul className="mt-3 grid gap-1.5">
                              {step.points.map((point) => (
                                <li
                                  key={point}
                                  className="flex items-start gap-2 text-[12.5px] text-[var(--ff-text-dim)]"
                                >
                                  <Check
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400"
                                    aria-hidden="true"
                                  />
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ol>

              {/* Scrub progress */}
              <div className="mt-6 flex items-center gap-3 pl-1">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--ff-border)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-[width] duration-150 ease-out"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ff-text-dim)]">
                  <MousePointerClick className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                  Cuộn để chuyển bước
                </span>
              </div>
            </div>

            {/* Visual column with crossfading surfaces */}
            <div className="relative h-[440px]">
              {MOCKS.map((mock, index) => (
                <div
                  key={index}
                  aria-hidden={index !== activeIndex}
                  className={`absolute inset-0 transition-all duration-700 ${
                    index === activeIndex
                      ? 'pointer-events-auto translate-y-0 scale-100 opacity-100 blur-0'
                      : 'pointer-events-none translate-y-4 scale-[0.97] opacity-0 blur-[2px]'
                  }`}
                  style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                >
                  {mock}
                </div>
              ))}

              {/* Step dots */}
              <div className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2">
                {SHOWCASE_STEPS.map((step, index) => (
                  <span
                    key={step.id}
                    aria-hidden="true"
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      index === activeIndex ? 'w-8 bg-amber-400' : 'w-1.5 bg-[var(--ff-border-strong)]'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingShowcase;
