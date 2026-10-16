/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect } from 'react';
import type { DimensionView, User } from '../../types';
import { safeStorage } from '../../utils/storage';
import { BackToTop } from './LandingPrimitives';
import { LandingNav } from './LandingNav';
import { LandingHero } from './sections/LandingHero';
import { LandingShowcase } from './sections/LandingShowcase';
import { LandingPricing } from './sections/LandingPricing';
import { LandingFAQ } from './sections/LandingFAQ';
import { LandingFooter } from './sections/LandingFooter';

export interface LandingPageProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  onOpenLogin: () => void;
  onEnterApp: () => void;
  onNavigate: (view: DimensionView) => void;
}

/** Academic landing page with practical product examples and no usage counters. */
export const LandingPage: React.FC<LandingPageProps> = ({
  currentUser,
  onOpenAuth,
  onOpenLogin,
  onEnterApp,
  onNavigate,
}) => {
  const handleStart = currentUser ? onEnterApp : onOpenAuth;

  useEffect(() => {
    safeStorage.setItem('fforum_landing_seen', 'true');
  }, []);

  return (
    <div className="ff-landing select-text">
      <a href="#ff-main" className="ff-skip-link">
        Chuyển đến nội dung chính
      </a>

      <LandingNav currentUser={currentUser} onOpenLogin={onOpenLogin} onOpenRegister={onOpenAuth} onEnterApp={onEnterApp} />

      <main id="ff-main" tabIndex={-1} className="relative z-10 w-full outline-none">
        <LandingHero
          currentUser={currentUser}
          onOpenAuth={handleStart}
          onOpenLogin={onOpenLogin}
          onNavigate={onNavigate}
        />
        <LandingShowcase onNavigate={onNavigate} />
        <LandingPricing onOpenAuth={handleStart} />
        <LandingFAQ onOpenAuth={handleStart} />
      </main>

      <LandingFooter currentUser={currentUser} onEnterApp={onEnterApp} onOpenAuth={onOpenAuth} />
      <BackToTop />
    </div>
  );
};

export default LandingPage;
