/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Reveal, SectionHeading } from '../LandingPrimitives';
import { QUESTION_GUIDE } from '../landingContent';

interface LandingHighlightsProps {
  onOpenAuth: () => void;
}

export const LandingHighlights: React.FC<LandingHighlightsProps> = ({ onOpenAuth }) => (
  <section id="nang-luc" aria-label="Gợi ý đặt câu hỏi rõ ràng" className="relative w-full py-20 sm:py-28">
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="ff-aurora ff-aurora-anim"
        style={{
          width: '460px',
          height: '460px',
          bottom: '4%',
          right: '-10%',
          background: 'radial-gradient(circle at 50% 50%, rgba(251,191,36,0.22), transparent 66%)',
        }}
      />
    </div>

    <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
      <SectionHeading
        eyebrow="Gợi ý đặt câu hỏi"
        title="Không cần viết dài. Chỉ cần đủ ngữ cảnh."
        description="Một vài chi tiết cụ thể giúp người khác hiểu đúng điều bạn muốn làm rõ — và giúp bạn tự sắp xếp lại cách nghĩ."
      />

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {QUESTION_GUIDE.map((item, index) => {
          const Icon = item.icon;
          return (
            <Reveal key={item.id} y={26} delay={index * 80}>
              <article className="ff-glass ff-card flex h-full flex-col p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="ff-eyebrow">{item.tag}</span>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/12 ring-1 ring-amber-400/25">
                    <Icon className="h-4 w-4 text-amber-300" aria-hidden="true" />
                  </span>
                </div>
                <h3 className="mt-5 text-[17px] font-semibold tracking-tight text-[var(--ff-text)]">{item.title}</h3>
                <p className="mt-2.5 flex-1 text-[13.5px] leading-relaxed text-[var(--ff-text-soft)]">{item.body}</p>
              </article>
            </Reveal>
          );
        })}
      </div>

      <Reveal y={18} delay={120}>
        <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-[var(--ff-border)] bg-[var(--ff-surface)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
            <p className="max-w-3xl text-[12.5px] leading-relaxed text-[var(--ff-text-dim)]">
              Bút danh không thay thế việc bảo vệ dữ liệu cá nhân. Trước khi đăng, hãy kiểm tra ảnh và tệp đính kèm để
              chắc chắn không lộ thông tin riêng tư.
            </p>
          </div>
          <button type="button" onClick={onOpenAuth} className="ff-btn ff-btn-ghost group shrink-0 px-5 py-3 text-sm">
            Thử đặt câu hỏi
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </Reveal>
    </div>
  </section>
);

export default LandingHighlights;
