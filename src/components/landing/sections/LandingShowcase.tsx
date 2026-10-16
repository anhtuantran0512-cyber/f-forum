/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import { ArrowUpRight, BookOpenCheck, HelpCircle, Users } from 'lucide-react';
import type { DimensionView } from '../../../types';
import { Reveal } from '../LandingPrimitives';

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
  { id: 'qa', title: 'Hỏi đáp', label: 'Trao đổi theo môn học', icon: HelpCircle, accent: 'terracotta' },
  { id: 'clubs', title: 'Câu lạc bộ', label: 'Tìm nhóm cùng mối quan tâm', icon: Users, accent: 'sage' },
  { id: 'exam-vault', title: 'Kho đề & học liệu', label: 'Mở tài liệu ngay trên web', icon: BookOpenCheck, accent: 'amber' },
];

/** Short route launcher: each card opens the actual app view, not another mockup. */
export const LandingShowcase: React.FC<LandingShowcaseProps> = ({ onNavigate }) => (
  <section id="kham-pha" aria-label="Mở các khu vực thật của F-Forum" className="relative w-full px-4 py-14 sm:px-6 sm:py-20">
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="ff-showcase-light absolute inset-0" />
    </div>

    <div className="relative mx-auto max-w-6xl">
      <Reveal y={16}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="ff-eyebrow">Từ bản xem trước đến trang thật</span>
            <h2 className="ff-display ff-balance mt-3 text-2xl text-[var(--ff-text)] sm:text-3xl">
              Chọn nơi bạn muốn bắt đầu.
            </h2>
          </div>
          <p className="max-w-md text-[13px] leading-relaxed text-[var(--ff-text-dim)]">
            Mỗi lối tắt sẽ mở chính giao diện F-Forum — không phải một bản demo tách rời.
          </p>
        </div>
      </Reveal>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        {DESTINATIONS.map(({ id, title, label, icon: Icon, accent }, index) => (
          <Reveal key={id} y={18} delay={index * 55}>
            <button
              type="button"
              onClick={() => onNavigate(id)}
              className={`ff-demo-route ff-demo-route--${accent} group flex min-h-[94px] w-full items-center gap-3.5 rounded-2xl border border-[var(--ff-border)] bg-[var(--ff-surface)] p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[var(--ff-border-strong)] hover:bg-[var(--ff-surface-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300`}
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
    </div>
  </section>
);

export default LandingShowcase;
