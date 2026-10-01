import React from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { Reveal, SectionHeading, SpotlightCard } from '../LandingPrimitives';
import { FEATURES } from '../landingContent';

const ACCENTS: Record<string, { text: string; bg: string; ring: string; glow: string }> = {
  amber: {
    text: 'text-amber-300',
    bg: 'bg-amber-500/12',
    ring: 'ring-amber-400/25',
    glow: 'shadow-[0_0_28px_rgba(251,191,36,0.22)]',
  },
  sky: {
    text: 'text-sky-300',
    bg: 'bg-sky-500/12',
    ring: 'ring-sky-400/25',
    glow: 'shadow-[0_0_28px_rgba(56,189,248,0.2)]',
  },
  violet: {
    text: 'text-violet-300',
    bg: 'bg-violet-500/12',
    ring: 'ring-violet-400/25',
    glow: 'shadow-[0_0_28px_rgba(167,139,250,0.2)]',
  },
  emerald: {
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/12',
    ring: 'ring-emerald-400/25',
    glow: 'shadow-[0_0_28px_rgba(52,211,153,0.2)]',
  },
};

const spanClass = (feature: { id: string; span: 'lg' | 'md' }) => {
  // The closing "Memory Realm" band stretches the full bento width.
  if (feature.id === 'memory') return 'md:col-span-6';
  return feature.span === 'lg' ? 'md:col-span-4' : 'md:col-span-2';
};

export const LandingFeatures: React.FC = () => (
  <section id="tinh-nang" aria-label="Tính năng nổi bật" className="relative w-full py-20 sm:py-28">
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="ff-aurora ff-aurora-anim"
        style={{
          width: '520px',
          height: '520px',
          top: '6%',
          right: '-12%',
          background: 'radial-gradient(circle at 40% 40%, rgba(251,191,36,0.32), transparent 65%)',
        }}
      />
    </div>

    <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
      <SectionHeading
        eyebrow="Tính năng"
        title={
          <>
            Mọi thứ cho một học kỳ bứt phá,
            <br className="hidden sm:block" /> gói gọn trong một nền tảng
          </>
        }
        description="Bảy phân khu được thiết kế để bạn hỏi nhanh hơn, học sâu hơn và thuộc về một cộng đồng thật sự."
      />

      <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-6">
        {FEATURES.map((feature, index) => {
          const Icon = feature.icon;
          const accent = ACCENTS[feature.accent] ?? ACCENTS.amber;
          return (
            <Reveal
              key={feature.id}
              y={30}
              delay={(index % 3) * 90}
              className={`${spanClass(feature)} md:min-h-[210px]`}
            >
              <SpotlightCard className="group flex h-full flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ring-1 transition-transform duration-500 group-hover:scale-105 ${accent.bg} ${accent.ring} ${accent.glow}`}
                  >
                    <Icon className={`h-5 w-5 ${accent.text}`} aria-hidden="true" />
                  </span>
                  <ArrowUpRight
                    className="h-4 w-4 shrink-0 text-[var(--ff-text-dim)] opacity-0 transition-all duration-500 group-hover:translate-x-0.5 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </div>

                <h3 className="mt-5 text-[17px] font-semibold tracking-tight text-[var(--ff-text)]">
                  {feature.title}
                </h3>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-[var(--ff-text-soft)]">
                  {feature.description}
                </p>

                {feature.bullets && (
                  <ul className="mt-5 grid gap-2 border-t border-[var(--ff-border)] pt-4 sm:grid-cols-3">
                    {feature.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2 text-[12px] text-[var(--ff-text-dim)]">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </SpotlightCard>
            </Reveal>
          );
        })}
      </div>
    </div>
  </section>
);

export default LandingFeatures;
