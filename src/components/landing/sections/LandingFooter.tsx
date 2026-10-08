/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import { ArrowUpRight, Heart, Mail, ShieldCheck } from 'lucide-react';
import { scrollToSection } from '../useLandingMotion';

/** Inline brand marks (lucide no longer ships third-party logo icons). */
const FacebookMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.25-1.5 1.55-1.5H16.6V4.4c-.3-.04-1.3-.14-2.47-.14-2.45 0-4.13 1.5-4.13 4.24v2.5H7.4v3h2.6V21h3.5Z" />
  </svg>
);

const GithubMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M12 2.2a10 10 0 0 0-3.16 19.5c.5.1.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.1-1.47-1.1-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.88 1.52 2.32 1.08 2.88.82.09-.64.35-1.08.63-1.33-2.22-.25-4.56-1.12-4.56-4.98 0-1.1.39-2 1.03-2.7-.1-.26-.45-1.29.1-2.68 0 0 .84-.27 2.75 1.03a9.5 9.5 0 0 1 5 0c1.9-1.3 2.74-1.03 2.74-1.03.55 1.39.2 2.42.1 2.68.64.7 1.03 1.6 1.03 2.7 0 3.87-2.35 4.72-4.58 4.97.36.31.68.92.68 1.85v2.74c0 .27.18.59.69.48A10 10 0 0 0 12 2.2Z" />
  </svg>
);

interface LandingFooterProps {
  onEnterApp: () => void;
  onOpenAuth: () => void;
}

const LINK_GROUPS: { title: string; links: { label: string; section?: string; href?: string }[] }[] = [
  {
    title: 'Sản phẩm',
    links: [
      { label: 'Tính năng', section: 'tinh-nang' },
      { label: 'Khám phá 3 bước', section: 'kham-pha' },
      { label: 'Lợi ích', section: 'loi-ich' },
      { label: 'Bảng giá', section: 'bang-gia' },
    ],
  },
  {
    title: 'Cộng đồng',
    links: [
      { label: 'Sàn hỏi đáp', section: 'kham-pha' },
      { label: 'Câu lạc bộ', section: 'kham-pha' },
      { label: 'Năng lực hệ thống', section: 'tinh-nang' },
      { label: 'Khu vinh danh', section: 'kham-pha' },
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { label: 'Câu hỏi thường gặp', section: 'faq' },
      { label: 'Gửi góp ý', section: 'faq' },
      { label: 'Chính sách dữ liệu', section: 'faq' },
      { label: 'Liên hệ Ban Quản Trị', href: 'https://www.facebook.com/TuanNotTun/' },
    ],
  },
];

export const LandingFooter: React.FC<LandingFooterProps> = ({ onEnterApp, onOpenAuth }) => {
  return (
    <footer className="relative w-full border-t border-[var(--ff-border)] bg-[var(--ff-bg-soft)]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,2fr)]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-yellow-200 p-[1.5px]">
                <span className="flex h-full w-full items-center justify-center rounded-full bg-[var(--ff-bg)] text-sm font-bold text-amber-400">
                  F
                </span>
              </span>
              <span className="ff-brand-serif bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-xl text-transparent">
                F-Forum
              </span>
            </div>
            <p className="mt-5 max-w-sm text-[13.5px] leading-relaxed text-[var(--ff-text-soft)]">
              Không gian số của sinh viên FPT: hỏi đáp bài học, câu lạc bộ, phòng chat thời gian thực và công cụ
              học tập trung — tất cả miễn phí, được xây dựng bởi chính sinh viên.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button type="button" onClick={onEnterApp} className="ff-btn ff-btn-primary group px-5 py-2.5 text-[13px]">
                Vào diễn đàn
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </button>
              <button type="button" onClick={onOpenAuth} className="ff-btn ff-btn-ghost px-5 py-2.5 text-[13px]">
                Đăng nhập
              </button>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://www.facebook.com/TuanNotTun/"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Facebook F-Forum"
                className="ff-btn ff-btn-ghost h-9 w-9 !p-0"
              >
                <FacebookMark className="h-4 w-4" />
              </a>
              <a
                href="https://github.com/anhtuantran0512-cyber"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="GitHub dự án F-Forum"
                className="ff-btn ff-btn-ghost h-9 w-9 !p-0"
              >
                <GithubMark className="h-4 w-4" />
              </a>
              <a
                href="mailto:BroAmStuck@gmail.com"
                aria-label="Gửi email cho Ban Quản Trị"
                className="ff-btn ff-btn-ghost h-9 w-9 !p-0"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {LINK_GROUPS.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[var(--ff-text-dim)]">
                  {group.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      {link.href ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="group inline-flex items-center gap-1 text-[13px] text-[var(--ff-text-soft)] transition-colors hover:text-[var(--ff-text)]"
                        >
                          {link.label}
                          <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => link.section && scrollToSection(link.section)}
                          className="text-[13px] text-[var(--ff-text-soft)] transition-colors hover:text-[var(--ff-text)]"
                        >
                          {link.label}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--ff-border)] pt-6 sm:flex-row">
          <p className="text-center text-[12px] text-[var(--ff-text-dim)] sm:text-left">
            © {new Date().getFullYear()} F-Forum · Dự án nền tảng sinh viên FPT. Được xây dựng với{' '}
            <Heart className="inline h-3 w-3 -translate-y-[1px] text-rose-400" aria-label="tình yêu" /> bởi sinh
            viên, cho sinh viên.
          </p>
          <p className="flex items-center gap-1.5 text-[12px] text-[var(--ff-text-dim)]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            Bản 2.0 · Liquid Glass 2026
          </p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
