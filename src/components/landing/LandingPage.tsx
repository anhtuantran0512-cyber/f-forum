/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect } from 'react';
import type { User } from '../../types';
import { safeStorage } from '../../utils/storage';
import { BackToTop } from './LandingPrimitives';
import { LandingNav } from './LandingNav';
import { LandingHero } from './sections/LandingHero';
import { LandingProof } from './sections/LandingProof';
import { LandingFeatures } from './sections/LandingFeatures';
import { LandingShowcase } from './sections/LandingShowcase';
import { LandingBenefits } from './sections/LandingBenefits';
import { LandingHighlights } from './sections/LandingHighlights';
import { LandingPricing } from './sections/LandingPricing';
import { LandingFAQ } from './sections/LandingFAQ';
import { LandingCTA } from './sections/LandingCTA';
import { LandingFooter } from './sections/LandingFooter';

export interface LandingPageProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  onOpenLogin: () => void;
  onEnterApp: () => void;
}

/** Academic landing page with practical product examples and no usage counters. */
export const LandingPage: React.FC<LandingPageProps> = ({ currentUser, onOpenAuth, onOpenLogin, onEnterApp }) => {
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

      <main id="ff-main" tabIndex={-1} className="relative w-full outline-none">
        <LandingHero onOpenAuth={handleStart} />
        <LandingProof />
        <LandingFeatures />
        <LandingShowcase />
        <LandingBenefits onOpenAuth={handleStart} />
        <LandingHighlights onOpenAuth={handleStart} />
        <LandingPricing onOpenAuth={handleStart} />
        <LandingFAQ onOpenAuth={handleStart} />
        <LandingCTA onOpenAuth={handleStart} />
      </main>

      <LandingFooter currentUser={currentUser} onEnterApp={onEnterApp} onOpenAuth={onOpenAuth} />
      <BackToTop />
    </div>
  );
};

export default LandingPage;
