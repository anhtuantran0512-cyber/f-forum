import React from 'react';
import { BadgeCheck, Quote, Star } from 'lucide-react';
import { Marquee, Reveal, SectionHeading } from '../LandingPrimitives';
import { TESTIMONIALS } from '../landingContent';

const TestimonialCard: React.FC<{ item: (typeof TESTIMONIALS)[number] }> = ({ item }) => (
  <figure className="ff-glass ff-card flex h-full min-w-[290px] flex-1 flex-col p-5">
    <div className="flex items-center gap-1" aria-label="Đánh giá 5 trên 5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
      ))}
    </div>
    <blockquote className="mt-4 flex-1 text-[13.5px] leading-relaxed text-[var(--ff-text-soft)]">
      “{item.quote}”
    </blockquote>
    <figcaption className="mt-5 flex items-center gap-3 border-t border-[var(--ff-border)] pt-4">
      <span
        aria-hidden="true"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-bold text-black/80"
        style={{ backgroundImage: `linear-gradient(135deg, ${item.from}, ${item.to})` }}
      >
        {item.initials}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-[13px] font-semibold text-[var(--ff-text)]">
          {item.name}
          <BadgeCheck className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
        </span>
        <span className="block truncate text-[11.5px] text-[var(--ff-text-dim)]">{item.role}</span>
      </span>
      <span className="ml-auto shrink-0 rounded-full bg-amber-500/12 px-2.5 py-1 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/25">
        {item.tier}
      </span>
    </figcaption>
  </figure>
);

export const LandingTestimonials: React.FC = () => {
  const firstRow = TESTIMONIALS.slice(0, 3);
  const secondRow = TESTIMONIALS.slice(3);

  return (
    <section id="danh-gia" aria-label="Câu chuyện từ cộng đồng" className="relative w-full py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="ff-aurora ff-aurora-anim"
          style={{
            width: '520px',
            height: '520px',
            bottom: '4%',
            right: '-10%',
            background: 'radial-gradient(circle at 50% 50%, rgba(167,139,250,0.3), transparent 66%)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Câu chuyện cộng đồng"
          title="Sinh viên nói gì khi dùng F-Forum mỗi ngày"
          description="Những chia sẻ được gửi trực tiếp từ hộp thư góp ý của nền tảng — chúng tôi đọc từng cái một."
        />
      </div>

      <div className="relative mt-14 space-y-5">
        <Reveal y={26}>
          <Marquee duration={52} itemClassName="[&>*]:min-w-[290px]">
            {firstRow.map((item) => (
              <TestimonialCard key={item.id} item={item} />
            ))}
          </Marquee>
        </Reveal>
        <Reveal y={26} delay={90}>
          <Marquee duration={62} reverse itemClassName="[&>*]:min-w-[290px]">
            {secondRow.map((item) => (
              <TestimonialCard key={item.id} item={item} />
            ))}
          </Marquee>
        </Reveal>
      </div>

      {/* Featured quote */}
      <div className="relative mx-auto mt-14 max-w-4xl px-4 sm:px-6">
        <Reveal variant="scale" y={26}>
          <div className="ff-glass ff-card relative overflow-hidden p-7 text-center sm:p-10">
            <Quote className="mx-auto h-8 w-8 text-amber-400/80" aria-hidden="true" />
            <blockquote className="ff-brand-serif mt-5 text-[24px] leading-snug text-[var(--ff-text)] sm:text-[30px]">
              “F-Forum là nơi câu hỏi của mình được trả lời trước khi mình kịp mất niềm tin vào môn học đó.”
            </blockquote>
            <figcaption className="mt-6 flex flex-col items-center gap-1">
              <span className="text-[13.5px] font-semibold text-[var(--ff-text)]">Trần Văn Anh Tuấn</span>
              <span className="text-[12px] text-[var(--ff-text-dim)]">
                Sáng lập &amp; Quản trị F-Forum · Sinh viên FPT
              </span>
            </figcaption>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default LandingTestimonials;
