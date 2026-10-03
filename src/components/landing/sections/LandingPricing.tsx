/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState } from 'react';
import { ArrowRight, Check, Sparkles, Users } from 'lucide-react';
import { Reveal, SectionHeading } from '../LandingPrimitives';
import { PRICING_PLANS } from '../landingContent';

interface LandingPricingProps {
  onOpenAuth: () => void;
}

const formatVnd = (value: number) => `${value.toLocaleString('vi-VN')}₫`;

export const LandingPricing: React.FC<LandingPricingProps> = ({ onOpenAuth }) => {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <section
      id="bang-gia"
      aria-label="Bảng giá"
      className="relative w-full border-y border-[var(--ff-border)] bg-[var(--ff-bg-soft)] py-20 sm:py-28"
    >
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Bảng giá"
          title="Miễn phí cho sinh viên. Mãi mãi."
          description="Bạn không cần trả tiền để học tốt hơn. Các gói nâng cao chỉ dành cho ai muốn thêm công cụ và sẽ ra mắt cùng bản 3.0."
        />

        {/* Billing cycle toggle */}
        <Reveal y={18} delay={200}>
          <div className="mt-8 flex justify-center">
            <div
              role="group"
              aria-label="Chọn chu kỳ thanh toán"
              className="ff-chip relative grid w-full max-w-[330px] grid-cols-2 items-center !rounded-full p-1"
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-transform duration-500"
                style={{ transform: cycle === 'monthly' ? 'translateX(0)' : 'translateX(100%)' }}
              />
              {(
                [
                  { id: 'monthly', label: 'Theo tháng' },
                  { id: 'yearly', label: 'Theo năm · −20%' },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCycle(option.id)}
                  aria-pressed={cycle === option.id}
                  className={`relative z-10 w-full rounded-full px-4 py-2 text-center text-[12.5px] font-semibold transition-colors duration-300 ${
                    cycle === option.id ? 'text-[#1b1204]' : 'text-[var(--ff-text-soft)] hover:text-[var(--ff-text)]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Plans */}
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {PRICING_PLANS.map((plan, index) => {
            const isContact = plan.monthly < 0;
            const price = cycle === 'monthly' ? plan.monthly : Math.round(plan.yearly / 12);

            return (
              <Reveal key={plan.id} y={32} delay={index * 90} className="h-full">
                <div
                  className={`ff-card relative flex h-full flex-col p-6 sm:p-7 ${
                    plan.highlight
                      ? 'border border-amber-400/35 bg-[var(--ff-surface-2)] shadow-[0_30px_80px_rgba(251,191,36,0.14)]'
                      : 'ff-glass'
                  }`}
                >
                  {plan.highlight && (
                    <>
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-70"
                        style={{
                          background:
                            'linear-gradient(140deg, rgba(251,191,36,0.4), transparent 45%, rgba(251,191,36,0.22))',
                          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                          WebkitMaskComposite: 'xor',
                          maskComposite: 'exclude',
                          padding: '1px',
                        }}
                      />
                      {plan.badge && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1b1204] shadow-lg">
                          {plan.badge}
                        </span>
                      )}
                    </>
                  )}

                  <div className="flex items-center gap-2">
                    {plan.id === 'org' ? (
                      <Users className="h-4 w-4 text-amber-400" aria-hidden="true" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-amber-400" aria-hidden="true" />
                    )}
                    <h3 className="text-[17px] font-semibold tracking-tight text-[var(--ff-text)]">{plan.name}</h3>
                  </div>
                  <p className="mt-2 min-h-[40px] text-[13px] leading-relaxed text-[var(--ff-text-soft)]">
                    {plan.tagline}
                  </p>

                  <div className="mt-5 flex items-end gap-2">
                    {isContact ? (
                      <span className="ff-display text-4xl text-[var(--ff-text)]">Liên hệ</span>
                    ) : price === 0 ? (
                      <span className="ff-display text-4xl text-[var(--ff-text)]">0₫</span>
                    ) : (
                      <>
                        <span className="ff-display text-4xl text-[var(--ff-text)]">{formatVnd(price)}</span>
                        <span className="pb-1 text-[12.5px] text-[var(--ff-text-dim)]">/tháng</span>
                      </>
                    )}
                  </div>
                  {!isContact && price > 0 && (
                    <p className="mt-1 font-mono text-[11px] text-[var(--ff-text-dim)]">
                      {cycle === 'yearly'
                        ? `Thanh toán ${formatVnd(plan.yearly)} mỗi năm`
                        : 'Huỷ bất cứ lúc nào'}
                    </p>
                  )}
                  {!isContact && price === 0 && (
                    <p className="mt-1 font-mono text-[11px] text-[var(--ff-text-dim)]">Không cần thẻ tín dụng</p>
                  )}

                  <ul className="mt-6 flex-1 space-y-2.5 border-t border-[var(--ff-border)] pt-5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-[13px] text-[var(--ff-text-soft)]">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className={`ff-btn group mt-7 w-full px-6 py-3.5 text-sm ${
                      plan.highlight ? 'ff-btn-primary' : 'ff-btn-ghost'
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>

                  {plan.footnote && (
                    <p className="mt-3 text-center text-[11.5px] text-[var(--ff-text-dim)]">{plan.footnote}</p>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal y={18} delay={120}>
          <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {['Miễn phí trọn đời cho sinh viên', 'Không quảng cáo xen kẽ', 'Dữ liệu thuộc về bạn'].map((item) => (
              <li key={item} className="flex items-center gap-2 text-[12.5px] text-[var(--ff-text-dim)]">
                <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
};

export default LandingPricing;
