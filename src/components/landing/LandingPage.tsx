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
import { LandingTestimonials } from './sections/LandingTestimonials';
import { LandingPricing } from './sections/LandingPricing';
import { LandingFAQ } from './sections/LandingFAQ';
import { LandingCTA } from './sections/LandingCTA';
import { LandingFooter } from './sections/LandingFooter';

export interface LandingPageProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  onEnterApp: () => void;
  onlineCount: number;
  totalQuestions: number;
  solvedQuestions: number;
  totalClubs: number;
}

/**
 * F-Forum marketing landing page.
 *
 * Fully self-contained: sticky navbar with reading progress, hero with
 * scroll-to-explore cue, animated social proof, bento features, a scroll-scrubbed
 * product tour, benefits, testimonials, pricing, FAQ, closing CTA and footer.
 */
export const LandingPage: React.FC<LandingPageProps> = ({
  currentUser,
  onOpenAuth,
  onEnterApp,
  onlineCount,
  totalQuestions,
  solvedQuestions,
  totalClubs,
}) => {
  // Remember that the visitor has met the marketing surface so they land
  // straight in the product on their next visit.
  useEffect(() => {
    safeStorage.setItem('fforum_landing_seen', 'true');
  }, []);

  return (
    <div className="ff-landing select-text">
      <a href="#ff-main" className="ff-skip-link">
        Chuyển đến nội dung chính
      </a>

      <LandingNav currentUser={currentUser} onOpenLogin={onOpenAuth} onEnterApp={onEnterApp} />

      <main id="ff-main" tabIndex={-1} className="relative w-full outline-none">
        <LandingHero
          onOpenAuth={onOpenAuth}
          onlineCount={onlineCount}
          totalClubs={totalClubs}
          totalQuestions={totalQuestions}
        />
        <LandingProof
          onlineCount={onlineCount}
          totalQuestions={totalQuestions}
          solvedQuestions={solvedQuestions}
          totalClubs={totalClubs}
        />
        <LandingFeatures />
        <LandingShowcase />
        <LandingBenefits onOpenAuth={onOpenAuth} />
        <LandingTestimonials />
        <LandingPricing onOpenAuth={onOpenAuth} />
        <LandingFAQ onOpenAuth={onOpenAuth} />
        <LandingCTA onOpenAuth={onOpenAuth} />
      </main>

      <LandingFooter onEnterApp={onEnterApp} onOpenAuth={onOpenAuth} />
      <BackToTop />
    </div>
  );
};

export default LandingPage;
