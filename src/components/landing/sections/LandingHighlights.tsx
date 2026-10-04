/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import {
  BookOpen,
  GraduationCap,
  Headphones,
  MessageSquare,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { Marquee, Reveal, SectionHeading } from '../LandingPrimitives';
import { HIGHLIGHTS } from '../landingContent';

const HIGHLIGHT_ICONS: Record<(typeof HIGHLIGHTS)[number]['icon'], React.ReactNode> = {
  qa: <GraduationCap className="h-5 w-5" aria-hidden="true" />,
  chat: <MessageSquare className="h-5 w-5" aria-hidden="true" />,
  rank: <Trophy className="h-5 w-5" aria-hidden="true" />,
  focus: <Headphones className="h-5 w-5" aria-hidden="true" />,
  clubs: <Users className="h-5 w-5" aria-hidden="true" />,
  memory: <BookOpen className="h-5 w-5" aria-hidden="true" />,
};

/**
 * Khối năng lực hệ thống (thay cho khối "đánh giá" của nhân vật mô phỏng).
 * Mỗi thẻ nói về một tính năng có thật, kèm nhãn "Đang chạy thật" để người xem
 * biết đây là năng lực của sản phẩm chứ không phải lời chứng thực của ai đó.
 */
const HighlightCard: React.FC<{ item: (typeof HIGHLIGHTS)[number] }> = ({ item }) => (
  <figure className="ff-glass ff-card flex h-full min-w-[290px] flex-1 flex-col p-5">
    <span
      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-black/80"
      style={{ backgroundImage: `linear-gradient(135deg, ${item.from}, ${item.to})` }}
      aria-hidden="true"
    >
      {HIGHLIGHT_ICONS[item.icon]}
    </span>
    <h3 className="mt-4 text-[14.5px] font-semibold leading-snug text-[var(--ff-text)]">{item.title}</h3>
    <p className="mt-2 flex-1 text-[13px] leading-relaxed text-[var(--ff-text-soft)]">{item.body}</p>
    <figcaption className="mt-5 flex items-center gap-2 border-t border-[var(--ff-border)] pt-4">
      <span className="rounded-full bg-sky-500/12 px-2.5 py-1 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-sky-300 ring-1 ring-sky-400/25">
        {item.tag}
      </span>
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--ff-text-dim)]">
        <Sparkles className="h-3 w-3 text-emerald-400" aria-hidden="true" />
        Đang chạy thật
      </span>
    </figcaption>
  </figure>
);

export const LandingHighlights: React.FC = () => {
  const firstRow = HIGHLIGHTS.slice(0, 3);
  const secondRow = HIGHLIGHTS.slice(3);

  return (
    <section id="tinh-nang" aria-label="Năng lực hệ thống" className="relative w-full py-20 sm:py-28">
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
          eyebrow="Năng lực hệ thống"
          title="F-Forum làm được gì cho việc học của bạn"
          description="Sáu năng lực dưới đây đều đang chạy thật trong ứng dụng — bạn có thể mở và dùng ngay sau khi đăng ký."
        />
      </div>

      <div className="relative mt-14 space-y-5">
        <Reveal y={26}>
          <Marquee duration={52} itemClassName="[&>*]:min-w-[290px]">
            {firstRow.map((item) => (
              <HighlightCard key={item.id} item={item} />
            ))}
          </Marquee>
        </Reveal>
        <Reveal y={26} delay={90}>
          <Marquee duration={62} reverse itemClassName="[&>*]:min-w-[290px]">
            {secondRow.map((item) => (
              <HighlightCard key={item.id} item={item} />
            ))}
          </Marquee>
        </Reveal>
      </div>

      {/* Tuyên ngôn của người sáng lập (người thật, tài khoản thật) */}
      <div className="relative mx-auto mt-14 max-w-4xl px-4 sm:px-6">
        <Reveal variant="scale" y={26}>
          <div className="ff-glass ff-card relative overflow-hidden p-7 text-center sm:p-10">
            <Sparkles className="mx-auto h-8 w-8 text-amber-400/80" aria-hidden="true" />
            <blockquote className="ff-brand-serif mt-5 text-[24px] leading-snug text-[var(--ff-text)] sm:text-[30px]">
              “Mỗi câu hỏi của học sinh đều xứng đáng có một người trả lời tử tế — F-Forum được xây chỉ để làm đúng việc đó.”
            </blockquote>
            <figcaption className="mt-6 flex flex-col items-center gap-1">
              <span className="text-[13.5px] font-semibold text-[var(--ff-text)]">Trần Văn Anh Tuấn</span>
              <span className="text-[12px] text-[var(--ff-text-dim)]">
                Sáng lập &amp; Quản trị F-Forum · Tuyên ngôn của người sáng lập
              </span>
            </figcaption>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default LandingHighlights;
