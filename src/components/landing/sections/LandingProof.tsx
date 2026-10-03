/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import { Counter, Marquee, Reveal, SpotlightCard } from '../LandingPrimitives';
import { TRUST_PILLARS } from '../landingContent';

interface LandingProofProps {
  onlineCount: number;
  totalQuestions: number;
  solvedQuestions: number;
  totalClubs: number;
}

export const LandingProof: React.FC<LandingProofProps> = ({
  onlineCount,
  totalQuestions,
  solvedQuestions,
  totalClubs,
}) => {
  const stats = [
    {
      id: 'online',
      value: Math.max(onlineCount, 1),
      suffix: '',
      label: 'Sinh viên đang online',
      hint: 'Presence thời gian thực',
      accent: 'text-emerald-300',
    },
    {
      id: 'questions',
      value: totalQuestions,
      label: 'Câu hỏi trên sàn hỏi đáp',
      hint: '13 chủ đề học thuật',
      accent: 'text-amber-300',
    },
    {
      id: 'solved',
      value: solvedQuestions,
      label: 'Câu hỏi đã có lời giải',
      hint: 'Bình chọn bởi cộng đồng',
      accent: 'text-sky-300',
    },
    {
      id: 'clubs',
      value: totalClubs,
      label: 'Câu lạc bộ đã duyệt',
      hint: 'Công nghệ · Nghệ thuật · Thể thao · Học thuật',
      accent: 'text-violet-300',
    },
  ];

  return (
    <section
      id="cong-dong"
      aria-label="Cộng đồng và độ tin cậy"
      className="relative w-full border-y border-[var(--ff-border)] bg-[var(--ff-bg-soft)] py-14 sm:py-16"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal y={16}>
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--ff-text-dim)]">
            Được xây dựng cho sinh viên · Vận hành bởi cộng đồng
          </p>
        </Reveal>

        {/* Trust pillar marquee */}
        <Reveal y={18} delay={90} className="mt-7">
          <Marquee duration={38} itemClassName="[&>*]:flex-1">
            {TRUST_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <span
                  key={pillar.label}
                  className="ff-chip flex items-center gap-2 px-4 py-2.5 whitespace-nowrap"
                >
                  <Icon className="h-4 w-4 text-amber-400" aria-hidden="true" />
                  <span className="text-[12.5px] font-medium text-[var(--ff-text-soft)]">{pillar.label}</span>
                </span>
              );
            })}
          </Marquee>
        </Reveal>

        {/* Live platform metrics */}
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Reveal key={stat.id} y={26} delay={index * 90}>
              <SpotlightCard className="h-full p-4 sm:p-5">
                <p className={`ff-display text-3xl sm:text-4xl ${stat.accent}`}>
                  <Counter value={stat.value} />
                  {stat.id === 'online' && <span className="ml-1 align-middle text-base">•</span>}
                </p>
                <p className="mt-2 text-[13px] font-semibold text-[var(--ff-text)]">{stat.label}</p>
                <p className="mt-1 text-[11.5px] leading-snug text-[var(--ff-text-dim)]">{stat.hint}</p>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>

        <Reveal y={18} delay={140}>
          <p className="mx-auto mt-9 max-w-3xl text-center text-[13.5px] leading-relaxed text-[var(--ff-text-dim)]">
            F-Forum không mua người dùng và không chạy quảng cáo. Mọi con số trên đây đến từ hoạt động thật của
            sinh viên trong nền tảng, được cập nhật ngay khi bạn đang xem.
          </p>
        </Reveal>
      </div>
    </section>
  );
};

export default LandingProof;
