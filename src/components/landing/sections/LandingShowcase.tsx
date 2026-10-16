/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import { ArrowUpRight, BookOpenCheck, HelpCircle, Users, PenLine } from 'lucide-react';
import type { DimensionView } from '../../../types';
import { Reveal } from '../LandingPrimitives';
import { QUESTION_GUIDE } from '../landingContent';

interface LandingShowcaseProps {
  onNavigate: (view: DimensionView) => void;
}

const DESTINATIONS: {
  id: DimensionView;
  title: string;
  label: string;
  icon: typeof HelpCircle;
  accent: string;
}[] = [
  { id: 'qa', title: 'Hỏi đáp học thuật', label: 'Nêu đề bài, đối chiếu từng bước lập luận và tháo gỡ chỗ vướng', icon: HelpCircle, accent: 'terracotta' },
  { id: 'clubs', title: 'Câu lạc bộ & chuyên đề', label: 'Đồng hành cùng nhóm học thuật, công nghệ, nghệ thuật và thể thao', icon: Users, accent: 'sage' },
  { id: 'exam-vault', title: 'Kho đề & học liệu', label: 'Tra cứu đề thi, đề kiểm tra phân loại rõ theo khối lớp và môn học', icon: BookOpenCheck, accent: 'amber' },
  { id: 'threads', title: 'Sổ chung mỗi ngày', label: 'Ghi lại góc nhìn, kinh nghiệm tự học và câu chuyện học đường', icon: PenLine, accent: 'terracotta' },
];

/** Short route launcher & academic inquiry guide: opens the actual app views and shares critical-thinking principles. */
export const LandingShowcase: React.FC<LandingShowcaseProps> = ({ onNavigate }) => (
  <section id="kham-pha" aria-label="Không gian học tập F-Forum" className="relative w-full px-4 py-14 sm:px-6 sm:py-20">
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="ff-showcase-light absolute inset-0" />
    </div>

    <div className="relative mx-auto max-w-6xl">
      <Reveal y={16}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="ff-eyebrow">Học hỏi · Trao đổi</span>
            <h2 className="ff-display ff-balance mt-3 text-2xl text-[var(--ff-text)] sm:text-3xl">
              <span className="ff-swash-cap">B</span>a nhịp tự học gắn kết trên cùng một mặt bàn.
            </h2>
          </div>
          <p className="max-w-md text-[13px] leading-relaxed text-[var(--ff-text-dim)]">
            Từ lúc đọc đề, đặt câu hỏi cần phản biện cho đến khi thảo luận chuyên đề cùng câu lạc bộ — mọi không gian đều hướng thẳng vào việc hiểu bài từ gốc.
          </p>
        </div>
      </Reveal>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DESTINATIONS.map(({ id, title, label, icon: Icon, accent }, index) => (
          <Reveal key={id} y={18} delay={index * 55}>
            <button
              type="button"
              onClick={() => onNavigate(id)}
              className={`ff-demo-route ff-demo-route--${accent} group flex min-h-[104px] w-full items-center gap-3.5 rounded-2xl border border-[var(--ff-border)] bg-[var(--ff-surface)] p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[var(--ff-border-strong)] hover:bg-[var(--ff-surface-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300`}
            >
              <span className="ff-demo-route__icon inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--ff-border)] bg-[var(--ff-surface-2)]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-[var(--ff-text)]">{title}</span>
                <span className="mt-1 block text-[11.5px] leading-snug text-[var(--ff-text-dim)]">{label}</span>
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--ff-text-dim)] transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--ff-text)]" aria-hidden="true" />
            </button>
          </Reveal>
        ))}
      </div>

      {/* Sổ tay phản biện học thuật: Ba nguyên tắc đặt câu hỏi rõ bản chất */}
      <Reveal y={20} delay={140}>
        <div className="mt-10 rounded-2xl border border-[var(--ff-border)] bg-[var(--ff-surface)] p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--ff-border)] pb-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="ff-atelier-ribbon">
                <span className="ff-swash-cap !text-xs">N</span>ếp nghĩ học thuật
              </span>
              <h3 className="text-base sm:text-lg font-bold text-[var(--ff-text)]">
                Đặt câu hỏi sao cho người đọc muốn cùng suy nghĩ
              </h3>
            </div>
            <span className="font-mono text-[11px] text-[var(--ff-text-dim)]">
              Rõ đề bài · Rõ chỗ vướng · Có đối chiếu
            </span>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {QUESTION_GUIDE.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={step.id}
                  className="rounded-xl border border-[var(--ff-border)] bg-[var(--ff-surface-2)] p-4 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest ff-ink--amber">
                      0{idx + 1} · {step.tag}
                    </span>
                    <StepIcon className="h-4 w-4 text-[var(--ff-text-dim)]" aria-hidden="true" />
                  </div>
                  <h4 className="text-[13.5px] font-semibold text-[var(--ff-text)]">{step.title}</h4>
                  <p className="text-[12px] leading-relaxed text-[var(--ff-text-soft)]">{step.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

export default LandingShowcase;

