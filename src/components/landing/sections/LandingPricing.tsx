/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState } from 'react';
import { ArrowRight, BookOpenCheck, Check, CheckCircle2, Copy, HeartHandshake, Sparkles } from 'lucide-react';
import { Reveal, SectionHeading } from '../LandingPrimitives';
import { PRICING_PLANS } from '../landingContent';

interface LandingPricingProps {
  onOpenAuth: () => void;
}

export const LandingPricing: React.FC<LandingPricingProps> = ({ onOpenAuth }) => {
  const [copiedBank, setCopiedBank] = useState(false);
  const [showDonateBox, setShowDonateBox] = useState(false);

  const handleCopyBank = async () => {
    if (!navigator?.clipboard) return;
    try {
      await navigator.clipboard.writeText('87905122009');
      setCopiedBank(true);
      window.setTimeout(() => setCopiedBank(false), 2000);
    } catch {
      setCopiedBank(false);
    }
  };

  return (
    <section
      id="bang-gia"
      aria-label="Chi phí và hỗ trợ F-Forum"
      className="relative w-full border-y border-[var(--ff-border)] bg-[var(--ff-bg-soft)] py-20 sm:py-28"
    >
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Chi phí & tiếp cận"
          title={
            <>
              <span className="ff-swash-cap">M</span>ở cửa tự do cho việc học và trao đổi học thuật.
            </>
          }
          description="Các tính năng học tập cốt lõi hiện mở miễn phí cho học sinh, sinh viên. Bạn có thể đọc bài, tra cứu đề thi hoặc tạo tài khoản để cùng thảo luận."
        />

        <Reveal y={18} delay={120}>
          <p className="ff-chip mx-auto mt-8 flex w-fit max-w-full items-center gap-2 px-4 py-2.5 text-center text-[12px] sm:text-[13px]">
            <Check className="ff-ink--green h-4 w-4 shrink-0" aria-hidden="true" />
            Không cần thẻ thanh toán
          </p>
        </Reveal>

        <div className="mx-auto mt-10 max-w-3xl">
          {PRICING_PLANS.map((plan) => (
            <Reveal key={plan.id} y={28}>
              <article className="ff-glass ff-card ff-plan-card ff-plan-card--featured relative rounded-2xl p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/12 ring-1 ring-amber-400/25">
                      <BookOpenCheck className="h-5 w-5 text-amber-300" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-[18px] font-bold tracking-tight text-[var(--ff-text)]">{plan.name}</h3>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--ff-text-soft)]">{plan.tagline}</p>
                    </div>
                  </div>
                  <span className="ff-plan-card__badge rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider">
                    {plan.badge}
                  </span>
                </div>

                <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[var(--ff-border)] pb-5">
                  <span className="tg-10__gold text-4xl font-black font-mono sm:text-5xl">0₫</span>
                  <span className="text-sm text-[var(--ff-text-dim)]">hiện miễn phí</span>
                </div>

                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-[13px] text-[var(--ff-text-soft)]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7 flex flex-col gap-3 border-t border-[var(--ff-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-lg text-[11.5px] leading-relaxed text-[var(--ff-text-dim)]">{plan.footnote}</p>
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="ff-btn ff-btn-primary ff-plan-card__action group shrink-0 px-5 py-3 text-sm"
                  >
                    Vào diễn đàn
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <div className="mt-7 text-center">
          <button
            type="button"
            onClick={() => setShowDonateBox((open) => !open)}
            aria-expanded={showDonateBox}
            aria-controls={showDonateBox ? 'ff-voluntary-support' : undefined}
            className="ff-btn ff-btn-ghost px-4 py-2.5 text-[12.5px]"
          >
            <HeartHandshake className="h-4 w-4 text-rose-400" aria-hidden="true" />
            {showDonateBox ? 'Ẩn thông tin ủng hộ tự nguyện' : 'Xem thông tin ủng hộ tự nguyện'}
          </button>
        </div>

        {showDonateBox && (
          <Reveal y={20} className="mt-6">
            <div id="ff-voluntary-support" className="ff-glass ff-card mx-auto max-w-4xl overflow-hidden p-5 sm:p-8">
              <div className="grid gap-7 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-center">
                <div className="mx-auto w-full max-w-[230px] text-center">
                  <img
                    src="/chuyentien.jpeg"
                    alt="Mã QR ủng hộ F-Forum tự nguyện"
                    loading="lazy"
                    decoding="async"
                    width={230}
                    height={300}
                    className="w-full rounded-xl border border-amber-400/35 bg-black/20 p-2 object-contain"
                  />
                  <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-mono text-[var(--ff-text-dim)]">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                    Ủng hộ hoàn toàn tự nguyện
                  </span>
                </div>

                <div>
                  <p className="ff-eyebrow">Góp sức duy trì</p>
                  <h3 className="ff-display mt-3 text-2xl text-[var(--ff-text)]">Đồng hành tự nguyện cùng không gian học thuật.</h3>
                  <p className="mt-3 text-[13px] leading-relaxed text-[var(--ff-text-soft)]">
                    Nếu F-Forum hữu ích với việc học của bạn, bạn có thể gửi một khoản đóng góp tùy tâm để phụ giúp chi
                    phí máy chủ. Mọi thành viên đều bình đẳng trong quyền truy cập và thảo luận học thuật.
                  </p>

                  <div className="mt-5 rounded-2xl border border-[var(--ff-border)] bg-[var(--ff-surface)] p-4 font-mono text-[12px]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-[var(--ff-text-dim)]">Số tài khoản</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--ff-text)]">87905122009</span>
                        <button
                          type="button"
                          onClick={handleCopyBank}
                          className="ff-btn ff-btn-ghost min-h-9 px-2.5 py-1 text-[10px]"
                          title="Sao chép số tài khoản"
                        >
                          {copiedBank ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                              Đã chép
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                              Sao chép
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 border-t border-[var(--ff-border)] pt-3 sm:grid-cols-2">
                      <p><span className="text-[var(--ff-text-dim)]">Chủ tài khoản: </span><span className="font-semibold text-[var(--ff-text)]">TRAN VAN ANH TUAN</span></p>
                      <p><span className="text-[var(--ff-text-dim)]">Nội dung: </span><span className="font-semibold text-[var(--ff-text)]">Ủng hộ F-Forum</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        )}

        <Reveal y={18} delay={120}>
          <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {['Tính năng cốt lõi hiện miễn phí', 'Không quảng cáo xen kẽ', 'Ủng hộ hoàn toàn tự nguyện'].map((item) => (
              <li key={item} className="flex items-center gap-2 text-[12.5px] font-medium text-[var(--ff-text-dim)]">
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
