/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import { ArrowRight, Quote } from 'lucide-react';
import { Counter, Reveal, SectionHeading, SpotlightCard } from '../LandingPrimitives';
import { BENEFITS } from '../landingContent';

interface LandingBenefitsProps {
  onOpenAuth: () => void;
}

export const LandingBenefits: React.FC<LandingBenefitsProps> = ({ onOpenAuth }) => (
  <section
    id="loi-ich"
    aria-label="Lợi ích khi tham gia F-Forum"
    className="relative w-full border-y border-[var(--ff-border)] bg-[var(--ff-bg-soft)] py-20 sm:py-28"
  >
    <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
      <SectionHeading
        align="left"
        eyebrow="Vì sao là F-Forum"
        title="Không chỉ là một diễn đàn — đây là hệ điều hành cho học kỳ của bạn"
        description="Chúng tôi lo phần kết nối, kỷ luật và ghi nhận nỗ lực. Bạn chỉ cần tập trung vào việc học."
      />

      <div className="mt-14 grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        {/* Benefit list */}
        <div className="grid gap-4 sm:grid-cols-2">
          {BENEFITS.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <Reveal key={benefit.id} y={28} delay={index * 80}>
                <SpotlightCard className="flex h-full flex-col p-5">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--ff-surface-2)] ring-1 ring-[var(--ff-border)]">
                    <Icon className="h-4 w-4 text-amber-300" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-[15.5px] font-semibold tracking-tight text-[var(--ff-text)]">
                    {benefit.title}
                  </h3>
                  <p className="mt-2 flex-1 text-[13px] leading-relaxed text-[var(--ff-text-soft)]">
                    {benefit.description}
                  </p>
                  <div className="mt-4 flex items-baseline gap-2 border-t border-[var(--ff-border)] pt-3">
                    <span className="ff-display text-2xl text-amber-300">{benefit.stat}</span>
                    <span className="text-[12px] text-[var(--ff-text-dim)]">{benefit.statLabel}</span>
                  </div>
                </SpotlightCard>
              </Reveal>
            );
          })}
        </div>

        {/* Highlight panel */}
        <Reveal variant="right" y={20} delay={120}>
          <div className="ff-glass ff-card relative flex h-full flex-col justify-between overflow-hidden p-7">
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-70 blur-3xl"
              style={{
                background: 'radial-gradient(circle, rgba(251,191,36,0.4), transparent 65%)',
              }}
              aria-hidden="true"
            />

            <div className="relative">
              <Quote className="h-7 w-7 text-amber-400/70" aria-hidden="true" />
              <p className="ff-brand-serif mt-5 text-[22px] leading-snug text-[var(--ff-text)] sm:text-[25px]">
                “Một học kỳ tốt bắt đầu từ việc bạn biết mình không học một mình.”
              </p>
              <p className="mt-4 text-[13px] text-[var(--ff-text-dim)]">
                Tuyên ngôn của Ban Quản Trị F-Forum
              </p>
            </div>

            <div className="relative mt-8 grid grid-cols-3 gap-3 border-t border-[var(--ff-border)] pt-6">
              <div>
                <p className="ff-display text-2xl text-[var(--ff-text)]">
                  <Counter value={150} />
                </p>
                <p className="mt-1 text-[11.5px] text-[var(--ff-text-dim)]">cấp độ XP</p>
              </div>
              <div>
                <p className="ff-display text-2xl text-[var(--ff-text)]">
                  <Counter value={10} />
                </p>
                <p className="mt-1 text-[11.5px] text-[var(--ff-text-dim)]">bậc huy hiệu</p>
              </div>
              <div>
                <p className="ff-display text-2xl text-[var(--ff-text)]">
                  <Counter value={3700} suffix="px" />
                </p>
                <p className="mt-1 text-[11.5px] text-[var(--ff-text-dim)]">miền ký ức</p>
              </div>
            </div>

            <button type="button" onClick={onOpenAuth} className="ff-btn ff-btn-primary group relative mt-7 w-full px-6 py-3.5 text-sm">
              Bắt đầu hành trình của bạn
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

export default LandingBenefits;
