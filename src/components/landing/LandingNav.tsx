import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, LogIn, Menu, Sparkles, X } from 'lucide-react';
import type { User } from '../../types';
import { DEFAULT_AVATAR, handleImageError } from '../../utils/mediaFallback';
import { scrollToSection, useScrollProgress, useScrollY } from './useLandingMotion';

export interface LandingNavProps {
  currentUser: User | null;
  onOpenLogin: () => void;
  onEnterApp: () => void;
}

const NAV_LINKS: { id: string; label: string }[] = [
  { id: 'tinh-nang', label: 'Tính năng' },
  { id: 'kham-pha', label: 'Khám phá' },
  { id: 'loi-ich', label: 'Lợi ích' },
  { id: 'danh-gia', label: 'Đánh giá' },
  { id: 'bang-gia', label: 'Bảng giá' },
  { id: 'faq', label: 'Hỏi đáp' },
];

export const LandingNav: React.FC<LandingNavProps> = ({ currentUser, onOpenLogin, onEnterApp }) => {
  const scrollY = useScrollY();
  const progress = useScrollProgress();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');

  const scrolled = scrollY > 24;

  /** Smooth-scroll to a section while closing the mobile drawer first. */
  const goToSection = useCallback((id: string) => {
    setMenuOpen(false);
    scrollToSection(id);
  }, []);

  // Close the mobile drawer with Escape and freeze background scroll while open.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  // Scrollspy: highlight the section currently in the middle of the viewport.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0.01, 0.2, 0.5] },
    );
    NAV_LINKS.forEach((link) => {
      const el = document.getElementById(link.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Reading progress rail */}
      <div className="h-[3px] w-full bg-transparent" aria-hidden="true">
        <div
          className="h-full origin-left bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 transition-[width] duration-150 ease-out"
          style={{ width: `${Math.max(progress * 100, 0)}%` }}
        />
      </div>

      <div
        className={`mx-auto flex items-center justify-between gap-3 px-4 transition-all duration-500 sm:px-6 ${
          scrolled ? 'py-2.5' : 'py-4'
        }`}
      >
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 -z-10 h-full transition-all duration-500 ${
            scrolled ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        >
          <div className="h-full w-full border-b border-[var(--ff-border)] bg-[color-mix(in_srgb,var(--ff-bg)_82%,transparent)] backdrop-blur-xl" />
        </div>

        {/* Brand */}
        <a
          href="#top"
          onClick={(event) => {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="group flex shrink-0 items-center gap-2.5"
          aria-label="F-Forum — về đầu trang"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-yellow-200 p-[1.5px] transition-transform duration-500 group-hover:scale-105">
            <span className="flex h-full w-full items-center justify-center rounded-full bg-[var(--ff-bg)] text-sm font-bold text-amber-400">
              F
            </span>
            <span className="ff-ping-ring absolute inset-0 rounded-full border border-amber-400/40" />
          </span>
          <span className="ff-brand-serif whitespace-nowrap bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-xl text-transparent">
            F-Forum
          </span>
        </a>

        {/* Desktop links */}
        <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => {
            const active = activeSection === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => goToSection(link.id)}
                aria-current={active ? 'true' : undefined}
                className={`relative rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors duration-300 ${
                  active ? 'text-[var(--ff-text)]' : 'text-[var(--ff-text-soft)] hover:text-[var(--ff-text)]'
                }`}
              >
                {link.label}
                <span
                  className={`absolute inset-x-3 -bottom-0.5 h-[2px] origin-left rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-transform duration-300 ${
                    active ? 'scale-x-100' : 'scale-x-0'
                  }`}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 lg:flex">
          {currentUser ? (
            <>
              <span className="ff-chip px-3 py-1.5">
                <img
                  src={currentUser.avatar}
                  alt=""
                  onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                  className="h-5 w-5 rounded-full object-cover ring-1 ring-amber-400/60"
                />
                <span className="max-w-[110px] truncate font-medium text-[var(--ff-text)]">
                  {currentUser.name.replace(/ \(.*\)/, '')}
                </span>
              </span>
              <button type="button" onClick={onEnterApp} className="ff-btn ff-btn-primary px-5 py-2.5 text-sm">
                Vào diễn đàn <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onOpenLogin}
                className="ff-btn ff-btn-ghost px-4 py-2.5 text-sm"
              >
                <LogIn className="h-4 w-4" /> Đăng nhập
              </button>
              <button type="button" onClick={onOpenLogin} className="ff-btn ff-btn-primary px-5 py-2.5 text-sm">
                <Sparkles className="h-4 w-4" /> Tham gia miễn phí
              </button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-controls="ff-mobile-menu"
          aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
          className="ff-btn ff-btn-ghost h-10 w-10 !p-0 lg:hidden"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        id="ff-mobile-menu"
        hidden={!menuOpen}
        className={`lg:hidden ${menuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        <div
          className="ff-fade-in fixed inset-0 -z-10 bg-black/60 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
        <div className="ff-drawer-in mx-4 mt-2 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-3xl border border-[var(--ff-border)] bg-[var(--ff-bg-soft)]/95 p-5 shadow-2xl backdrop-blur-2xl">
          <nav aria-label="Điều hướng di động" className="grid gap-1">
            {NAV_LINKS.map((link, index) => (
              <button
                key={link.id}
                type="button"
                onClick={() => goToSection(link.id)}
                style={{ transitionDelay: `${index * 30}ms` }}
                className="flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-[var(--ff-text-soft)] transition-colors hover:bg-[var(--ff-surface)] hover:text-[var(--ff-text)]"
              >
                {link.label}
                <ArrowRight className="h-4 w-4 opacity-60" />
              </button>
            ))}
          </nav>

          <div className="mt-4 grid gap-2 border-t border-[var(--ff-border)] pt-4">
            {currentUser ? (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEnterApp();
                }}
                className="ff-btn ff-btn-primary w-full px-5 py-3.5 text-sm"
              >
                Vào diễn đàn <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenLogin();
                  }}
                  className="ff-btn ff-btn-primary w-full px-5 py-3.5 text-sm"
                >
                  <Sparkles className="h-4 w-4" /> Tham gia miễn phí
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenLogin();
                  }}
                  className="ff-btn ff-btn-ghost w-full px-5 py-3.5 text-sm"
                >
                  <LogIn className="h-4 w-4" /> Đăng nhập
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default LandingNav;
