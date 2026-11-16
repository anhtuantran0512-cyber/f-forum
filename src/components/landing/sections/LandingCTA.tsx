/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import { ArrowRight, BookOpenCheck, MessageSquare } from 'lucide-react';
import { AuroraBackdrop, MagneticButton, Reveal } from '../LandingPrimitives';
import { scrollToSection } from '../useLandingMotion';

interface LandingCTAProps {
  onOpenAuth: () => void;
}

export const LandingCTA: React.FC<LandingCTAProps> = ({ onOpenAuth }) => (
  <section aria-label="Bắt đầu trao đổi trên F-Forum" className="relative w-full px-4 pb-24 pt-6 sm:px-6 sm:pb-28">
    <div className="mx-auto max-w-6xl">
      <Reveal variant="scale" y={30}>
        <div className="ff-glass relative isolate overflow-hidden rounded-[32px] px-6 py-12 sm:px-12 sm:py-16">
          <AuroraBackdrop variant="amber" className="opacity-80" />
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                'linear-gradient(160deg, rgba(251,191,36,0.12) 0%, transparent 48%, rgba(129,178,154,0.10) 100%)',
            }}
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-3xl text-center">
            <span className="ff-chip px-4 py-2">
              <MessageSquare className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--ff-text-soft)]">
                Hỏi đáp · Học liệu · Cùng học
              </span>
            </span>

            <h2 className="ff-display ff-balance mt-6 text-3xl sm:text-4xl md:text-5xl">
              Mang điều đang vướng <span className="ff-gradient-text">vào cuộc trao đổi.</span>
            </h2>
            <p className="ff-balance mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-[var(--ff-text-soft)] sm:text-base">
              Bạn không cần có sẵn đáp án. Hãy bắt đầu bằng môn học, phần chưa rõ và điều mình đã thử — rồi cùng kiểm
              tra cách nghĩ.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <MagneticButton size="lg" onClick={onOpenAuth} className="w-full sm:w-auto">
                <BookOpenCheck className="h-4 w-4" />
                Đặt câu hỏi
                <ArrowRight className="h-4 w-4" />
              </MagneticButton>
              <MagneticButton
                size="lg"
                variant="ghost"
                className="w-full sm:w-auto"
                onClick={() => scrollToSection('nang-luc')}
              >
                Xem gợi ý
              </MagneticButton>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

export default LandingCTA;
