/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import { BookOpenCheck, HelpCircle, ShieldCheck } from 'lucide-react';
import { Reveal, SpotlightCard } from '../LandingPrimitives';

const PRINCIPLES = [
  { label: 'Câu hỏi có bối cảnh', icon: HelpCircle },
  { label: 'Lời giải có lập luận', icon: BookOpenCheck },
  { label: 'Thông tin được đối chiếu', icon: ShieldCheck },
];

export const LandingProof: React.FC = () => (
  <section
    id="cong-dong"
    aria-label="Quan điểm học thuật của F-Forum"
    className="relative w-full border-y border-[var(--ff-border)] bg-[var(--ff-bg-soft)] py-16 sm:py-20"
  >
    <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
      <div>
        <Reveal y={16}>
          <p className="ff-eyebrow">Một lời hứa vừa đủ</p>
        </Reveal>
        <Reveal y={22} delay={60}>
          <h2 className="ff-display ff-balance mt-4 max-w-2xl text-3xl text-[var(--ff-text)] sm:text-4xl">
            Đừng tin một con số. Hãy xem cách mọi người cùng học.
          </h2>
        </Reveal>
        <Reveal y={18} delay={120}>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[var(--ff-text-soft)]">
            Số người đang online hay lượt thích không nói lên chất lượng học thuật. F-Forum không dùng những con số đó
            làm bằng chứng; điều đáng xem là câu hỏi có đủ ngữ cảnh, lời giải có lập luận và thông tin có thể đối chiếu.
          </p>
        </Reveal>

        <ul className="mt-7 grid gap-3 sm:grid-cols-3">
          {PRINCIPLES.map(({ label, icon: Icon }, index) => (
            <Reveal as="li" key={label} y={16} delay={140 + index * 60}>
              <div className="flex h-full items-start gap-2.5 rounded-2xl border border-[var(--ff-border)] bg-[var(--ff-surface)] p-3.5">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                <span className="text-[12.5px] font-medium leading-snug text-[var(--ff-text-soft)]">{label}</span>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>

      <Reveal variant="right" y={22} delay={100}>
        <SpotlightCard className="relative overflow-hidden p-6 sm:p-8">
          <span className="ff-eyebrow">Mẫu câu hỏi</span>
          <blockquote className="ff-brand-serif mt-5 text-[22px] leading-snug text-[var(--ff-text)] sm:text-[27px]">
            “Mình đã thử đến bước này. Có thể giúp mình tìm chỗ chưa đúng không?”
          </blockquote>
          <p className="mt-5 border-t border-[var(--ff-border)] pt-4 text-[13px] leading-relaxed text-[var(--ff-text-dim)]">
            Không cần biết sẵn đáp án để đặt câu hỏi. Chia sẻ điều bạn đã thử là một điểm bắt đầu tốt.
          </p>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-16 -right-12 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl"
          />
        </SpotlightCard>
      </Reveal>
    </div>
  </section>
);

export default LandingProof;
