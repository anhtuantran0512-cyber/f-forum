/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Mail, Sparkles } from 'lucide-react';
import { AuroraBackdrop, MagneticButton, Reveal } from '../LandingPrimitives';
import { scrollToSection } from '../useLandingMotion';

interface LandingCTAProps {
  onOpenAuth: () => void;
}

export const LandingCTA: React.FC<LandingCTAProps> = ({ onOpenAuth }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setStatus('error');
      setMessage('Email chưa hợp lệ — bạn kiểm tra lại giúp mình nhé.');
      return;
    }
    setStatus('loading');
    setMessage('');
    window.setTimeout(() => {
      setStatus('done');
      setMessage('Đã ghi danh! Ban Quản Trị sẽ gửi lời mời tham gia sớm nhất có thể.');
      setEmail('');
    }, 900);
  };

  return (
    <section aria-label="Bắt đầu với F-Forum" className="relative w-full px-4 pb-24 pt-6 sm:px-6 sm:pb-28">
      <div className="mx-auto max-w-6xl">
        <Reveal variant="scale" y={30}>
          <div className="ff-glass relative isolate overflow-hidden rounded-[32px] px-6 py-12 sm:px-12 sm:py-16">
            <AuroraBackdrop variant="mixed" className="opacity-90" />
            <div
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background:
                  'linear-gradient(160deg, rgba(251,191,36,0.14) 0%, transparent 42%, rgba(34,211,238,0.12) 100%)',
              }}
              aria-hidden="true"
            />

            <div className="relative mx-auto max-w-3xl text-center">
              <span className="ff-chip px-4 py-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--ff-text-soft)]">
                  Miễn phí · Không quảng cáo · Dành cho sinh viên
                </span>
              </span>

              <h2 className="ff-display ff-balance mt-6 text-3xl sm:text-4xl md:text-5xl">
                Sẵn sàng bắt đầu học kỳ <span className="ff-gradient-text">tỏa sáng</span> của bạn?
              </h2>
              <p className="ff-balance mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-[var(--ff-text-soft)] sm:text-base">
                Tạo tài khoản trong 30 giây, đặt câu hỏi đầu tiên và để cộng đồng F-Forum đồng hành cùng bạn
                trên từng môn học.
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <MagneticButton size="lg" onClick={onOpenAuth} className="w-full sm:w-auto">
                  <Sparkles className="h-4 w-4" />
                  Tham gia F-Forum miễn phí
                  <ArrowRight className="h-4 w-4" />
                </MagneticButton>
                <MagneticButton
                  size="lg"
                  variant="ghost"
                  className="w-full sm:w-auto"
                  onClick={() => scrollToSection('kham-pha')}
                >
                  Xem lại tính năng
                </MagneticButton>
              </div>

              {/* Waitlist form */}
              <form onSubmit={handleSubmit} className="mx-auto mt-10 max-w-xl" noValidate>
                <label htmlFor="ff-waitlist-email" className="sr-only">
                  Email sinh viên
                </label>
                <div className="ff-glass flex flex-col gap-2 rounded-3xl p-2 sm:flex-row sm:items-center sm:rounded-full">
                  <span className="hidden items-center pl-3 text-[var(--ff-text-dim)] sm:flex" aria-hidden="true">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    id="ff-waitlist-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (status === 'error') setStatus('idle');
                    }}
                    placeholder="email@fpt.edu.vn"
                    aria-invalid={status === 'error'}
                    aria-describedby="ff-waitlist-status"
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 text-[14px] text-[var(--ff-text)] outline-none placeholder:text-[var(--ff-text-dim)]"
                  />
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="ff-btn ff-btn-primary shrink-0 px-6 py-3 text-sm disabled:opacity-70"
                  >
                    {status === 'loading' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Đang gửi…
                      </>
                    ) : (
                      <>
                        Nhận lời mời <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>

                <p
                  id="ff-waitlist-status"
                  role="status"
                  aria-live="polite"
                  className={`mt-3 flex items-center justify-center gap-1.5 text-[12.5px] ${
                    status === 'error' ? 'ff-ink--rose' : 'text-[var(--ff-text-dim)]'
                  }`}
                >
                  {status === 'done' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />}
                  {message || 'Chúng tôi chỉ gửi thông tin về tính năng mới, không spam.'}
                </p>
              </form>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default LandingCTA;
