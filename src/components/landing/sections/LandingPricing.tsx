/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState } from 'react';
import { ArrowRight, Check, Sparkles, Users, Copy, CheckCircle2, HeartHandshake } from 'lucide-react';
import { Reveal, SectionHeading } from '../LandingPrimitives';
import { PRICING_PLANS } from '../landingContent';

interface LandingPricingProps {
  onOpenAuth: () => void;
}

export const LandingPricing: React.FC<LandingPricingProps> = ({ onOpenAuth }) => {
  const [copiedBank, setCopiedBank] = useState(false);

  const handleCopyBank = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText('87905122009');
      setCopiedBank(true);
      setTimeout(() => setCopiedBank(false), 2000);
    }
  };

  return (
    <section
      id="bang-gia"
      aria-label="Bảng giá"
      className="relative w-full border-y border-[var(--ff-border)] bg-[var(--ff-bg-soft)] py-20 sm:py-28"
    >
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Đặc Quyền Thành Viên"
          title="Học tập miễn phí, rõ ràng từ đầu."
          description="Các tính năng đang mở đều miễn phí. Những tiện ích nâng cao vẫn đang được phát triển và sẽ được ghi rõ trạng thái."
        />

        {/* One honest membership promise, no fake monthly/yearly discount on free access. */}
        <Reveal y={18} delay={200}>
          <p className="ff-chip mx-auto mt-8 flex w-fit max-w-full items-center gap-2 px-4 py-2.5 text-center text-[12px] sm:text-[13px]">
            <Check className="ff-ink--green h-4 w-4 shrink-0" aria-hidden="true" />
            Tham gia miễn phí · Không cần thẻ ngân hàng
          </p>
        </Reveal>

        {/* Membership options: only available access has a working action. */}
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {PRICING_PLANS.map((plan, index) => {
            return (
              <Reveal key={plan.id} y={32} delay={index * 90} className="h-full">
                <div
                  className={`ff-glass ff-card ff-plan-card relative flex h-full flex-col rounded-3xl p-6 sm:p-7 ${
                    plan.highlight ? 'ff-plan-card--featured' : ''
                  }`}
                >
                  {/* Clear availability badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="tg-10__crown text-lg">✦</span>
                    <span className="ff-plan-card__badge rounded-full px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider">
                      {plan.id === 'student' ? 'MIỄN PHÍ 100%' : plan.id === 'pro' ? 'ĐANG PHÁT TRIỂN' : 'DÀNH CHO CLB'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {plan.id === 'org' ? (
                      <Users className="h-4 w-4 text-amber-400" aria-hidden="true" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-amber-400" aria-hidden="true" />
                    )}
                    <h3 className="text-[18px] font-bold tracking-tight text-[var(--ff-text)]">{plan.name}</h3>
                  </div>

                  <p className="mt-2 min-h-[40px] text-[13px] leading-relaxed text-[var(--ff-text-soft)]">
                    {plan.tagline}
                  </p>

                  {/* Cost where available; planned tier has no invented price. */}
                  <div className="mt-5 flex items-baseline gap-2">
                    {plan.id === 'pro' ? (
                      <span className="text-xl font-bold text-[var(--ff-text)]">Sắp ra mắt</span>
                    ) : (
                      <>
                        <span className="tg-10__gold text-4xl font-black font-mono sm:text-5xl">0₫</span>
                        <span className="ff-ink--amber pb-1 text-xs font-mono font-semibold">/ Trọn đời</span>
                      </>
                    )}
                  </div>
                  <p className="ff-ink--green mt-1 font-mono text-[11px] font-semibold">
                    {plan.id === 'pro' ? 'Chưa mở đăng ký gói này' : 'Không thu phí thành viên'}
                  </p>

                  <ul className="mt-6 flex-1 space-y-2.5 border-t border-[var(--ff-border)] pt-5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-[13px] text-[var(--ff-text-soft)]">
                        <span className="tg-10__check mt-0.5 text-xs text-amber-400 shrink-0">✦</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.id === 'pro' ? (
                    <p className="ff-plan-card__action mt-7 flex items-center justify-center rounded-2xl border border-[var(--ff-border-strong)] px-6 py-3.5 text-center text-sm font-semibold text-[var(--ff-text-soft)]">
                      Đang phát triển
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={onOpenAuth}
                      className="ff-btn ff-btn-ghost ff-plan-card__action group mt-7 w-full rounded-2xl px-6 py-3.5 text-sm font-bold"
                    >
                      <span>Tạo tài khoản miễn phí</span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </button>
                  )}

                  {plan.footnote && (
                    <p className="mt-3 text-center text-[11.5px] text-[var(--ff-text-dim)]">{plan.footnote}</p>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Dedicated Luxury Donate Card Section */}
        <Reveal y={24} delay={300} className="mt-16">
          <div className="relative rounded-3xl bg-gradient-to-b from-[#131722]/95 via-[#0e121a]/95 to-[#080b10]/95 border-2 border-amber-400/35 p-6 sm:p-10 shadow-[0_20px_70px_rgba(245,158,11,0.18)] max-w-4xl mx-auto overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              {/* Left Column: QR Code & Transfer Slip */}
              <div className="md:col-span-5 flex flex-col items-center text-center">
                <div className="relative group max-w-[230px] rounded-2xl overflow-hidden border-2 border-amber-400/50 shadow-[0_0_30px_rgba(245,158,11,0.3)] bg-black/60 p-2">
                  <img
                    src="/chuyentien.jpeg"
                    alt="Mã QR chuyển khoản ngân hàng ủng hộ F-Forum"
                    loading="lazy"
                    decoding="async"
                    width={230}
                    height={300}
                    className="w-full h-auto rounded-xl object-contain"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3 text-white text-xs font-semibold">
                    Quét VietQR chuyển tiền nhanh
                  </div>
                </div>
                <span className="mt-2 text-[11px] font-mono text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  VietQR Chuyển Khoản Trực Tiếp
                </span>
              </div>

              {/* Right Column: Information & Copy Button */}
              <div className="md:col-span-7 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="tg-10__crown text-2xl">✦</span>
                  <span className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
                    GÓC ỦNG HỘ PHÁT TRIỂN F-FORUM
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                  Đồng Hành Cùng <span className="tg-10__gold">BroAmStuck Studio</span>
                </h3>

                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-light">
                  Mọi tài nguyên và tính năng thành viên F-Forum đều hoàn toàn miễn phí. Nếu bạn thấy diễn đàn hữu ích cho việc học tập, bạn có thể ủng hộ tác giả ly cà phê để duy trì máy chủ Cloudflare và chi phí vận hành!
                </p>

                {/* Account Details Box */}
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-amber-400/25 space-y-2.5 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Số tài khoản:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-300 font-bold text-sm sm:text-base">87905122009</span>
                      <button
                        type="button"
                        onClick={handleCopyBank}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Sao chép số tài khoản"
                      >
                        {copiedBank ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300">Đã chép!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Chép STK</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/10 pt-2">
                    <span className="text-neutral-400">Chủ tài khoản:</span>
                    <span className="text-white font-bold">TRAN VAN ANH TUAN</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/10 pt-2">
                    <span className="text-neutral-400">Nội dung chuyển:</span>
                    <span className="text-amber-200">Ủng hộ F-Forum</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-neutral-400 italic">
                  <HeartHandshake className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Trân trọng cảm ơn sự ủng hộ và đóng góp quý báu từ cộng đồng học sinh, sinh viên!</span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Free Promise Badges */}
        <Reveal y={18} delay={120}>
          <ul className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {['Miễn phí trọn đời cho sinh viên', 'Không quảng cáo xen kẽ', 'Dữ liệu thuộc về bạn'].map((item) => (
              <li key={item} className="flex items-center gap-2 text-[12.5px] text-[var(--ff-text-dim)] font-medium">
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
