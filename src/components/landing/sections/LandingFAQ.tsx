/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState } from 'react';
import { ArrowRight, HelpCircle, Minus, Plus } from 'lucide-react';
import { Reveal, SectionHeading } from '../LandingPrimitives';
import { FAQ_ITEMS } from '../landingContent';

interface LandingFAQProps {
  onOpenAuth: () => void;
}

export const LandingFAQ: React.FC<LandingFAQProps> = ({ onOpenAuth }) => {
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0]?.id ?? null);

  const toggle = (id: string) => setOpenId((current) => (current === id ? null : id));

  return (
    <section id="faq" aria-label="Câu hỏi thường gặp" className="relative w-full py-20 sm:py-28">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Hỏi đáp"
          title="Câu hỏi thường gặp"
          description="Nếu vẫn còn điều chưa rõ, Ban Quản Trị luôn có mặt trong phòng chat để trả lời bạn trực tiếp."
        />

        <div className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
          {/* Accordion */}
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openId === item.id;
              return (
                <Reveal key={item.id} y={22} delay={index * 60}>
                  <div
                    className={`ff-glass overflow-hidden rounded-3xl transition-colors duration-500 ${
                      isOpen ? 'border-[var(--ff-border-strong)]' : ''
                    }`}
                  >
                    <h3>
                      <button
                        type="button"
                        onClick={() => toggle(item.id)}
                        aria-expanded={isOpen}
                        aria-controls={`faq-panel-${item.id}`}
                        id={`faq-trigger-${item.id}`}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
                      >
                        <span
                          className={`text-[14.5px] font-semibold tracking-tight transition-colors duration-300 sm:text-[15.5px] ${
                            isOpen ? 'text-amber-200' : 'text-[var(--ff-text)]'
                          }`}
                        >
                          {item.question}
                        </span>
                        <span
                          aria-hidden="true"
                          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 transition-all duration-500 ${
                            isOpen
                              ? 'rotate-180 bg-amber-500/18 text-amber-300 ring-amber-400/30'
                              : 'bg-[var(--ff-surface-2)] text-[var(--ff-text-dim)] ring-[var(--ff-border)]'
                          }`}
                        >
                          {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        </span>
                      </button>
                    </h3>

                    <div
                      id={`faq-panel-${item.id}`}
                      role="region"
                      aria-labelledby={`faq-trigger-${item.id}`}
                      className="ff-accordion-panel"
                      data-open={isOpen}
                    >
                      <div>
                        <p className="px-5 pb-5 text-[13.5px] leading-relaxed text-[var(--ff-text-soft)] sm:px-6 sm:pb-6">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          {/* Support card */}
          <Reveal variant="right" y={22} delay={140}>
            <div className="ff-glass ff-card sticky top-28 flex h-full flex-col p-6">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/12 ring-1 ring-amber-400/25">
                <HelpCircle className="h-5 w-5 text-amber-300" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-[17px] font-semibold tracking-tight text-[var(--ff-text)]">
                Vẫn còn thắc mắc?
              </h3>
              <p className="mt-2.5 flex-1 text-[13.5px] leading-relaxed text-[var(--ff-text-soft)]">
                Đặt câu hỏi trực tiếp trong sàn hỏi đáp hoặc gửi góp ý cho Ban Quản Trị. Chúng tôi phản hồi
                trong vòng 24 giờ làm việc — kể cả những câu khó.
              </p>
              <button type="button" onClick={onOpenAuth} className="ff-btn ff-btn-primary group mt-6 w-full px-6 py-3.5 text-sm">
                Tham gia miễn phí
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
              <p className="mt-3 text-center text-[11.5px] text-[var(--ff-text-dim)]">
                Thiết lập trong 30 giây · Không cần thẻ
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default LandingFAQ;
