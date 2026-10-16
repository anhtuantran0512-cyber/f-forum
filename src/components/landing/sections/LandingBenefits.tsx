/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Reveal, SectionHeading, SpotlightCard } from '../LandingPrimitives';
import { BENEFITS } from '../landingContent';

interface LandingBenefitsProps {
  onOpenAuth: () => void;
}

export const LandingBenefits: React.FC<LandingBenefitsProps> = ({ onOpenAuth }) => (
  <section
    id="loi-ich"
    aria-label="Nguyên tắc cùng học trên F-Forum"
    className="relative w-full border-y border-[var(--ff-border)] bg-[var(--ff-bg-soft)] py-20 sm:py-28"
  >
    <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
      <SectionHeading
        align="left"
        eyebrow="Cùng học, có suy nghĩ"
        title="Một diễn đàn tốt cũng biết giới hạn của mình."
        description="F-Forum giúp mở đầu cuộc trao đổi. Việc hiểu và kiểm tra kiến thức vẫn thuộc về mỗi người học."
      />

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {BENEFITS.map((benefit, index) => {
          const Icon = benefit.icon;
          return (
            <Reveal key={benefit.id} y={24} delay={index * 70}>
              <SpotlightCard className="flex h-full flex-col p-5 sm:p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--ff-surface-2)] ring-1 ring-[var(--ff-border)]">
                  <Icon className="h-4 w-4 text-amber-300" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-[15.5px] font-semibold tracking-tight text-[var(--ff-text)]">
                  {benefit.title}
                </h3>
                <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--ff-text-soft)]">
                  {benefit.description}
                </p>
              </SpotlightCard>
            </Reveal>
          );
        })}
      </div>

      <Reveal y={20} delay={160}>
        <div className="mt-5 grid gap-5 rounded-2xl border border-[var(--ff-border)] bg-[var(--ff-surface)] p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
            <div>
              <p className="ff-eyebrow">Giới hạn cần nhớ</p>
              <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-[var(--ff-text-soft)]">
                Câu trả lời trên diễn đàn do thành viên đóng góp. Hãy xem chúng như một góc nhìn để trao đổi, rồi đối
                chiếu với giáo trình, đề cương hoặc hướng dẫn của giảng viên.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenAuth}
            className="ff-btn ff-btn-primary group w-full px-5 py-3 text-sm md:w-auto"
          >
            Bắt đầu trao đổi
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </Reveal>
    </div>
  </section>
);

export default LandingBenefits;
