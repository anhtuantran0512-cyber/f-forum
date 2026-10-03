import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (relPath) => fs.readFileSync(path.resolve(relPath), 'utf8');

const LANDING_DIR = 'src/components/landing';

test('1. Landing page composes the complete conversion structure', () => {
  const page = read(`${LANDING_DIR}/LandingPage.tsx`);

  const requiredSections = [
    'LandingNav',
    'LandingHero',
    'LandingProof',
    'LandingFeatures',
    'LandingShowcase',
    'LandingBenefits',
    'LandingTestimonials',
    'LandingPricing',
    'LandingFAQ',
    'LandingCTA',
    'LandingFooter',
  ];

  requiredSections.forEach((section) => {
    assert.ok(
      page.includes(`<${section}`),
      `LandingPage must render <${section} /> to keep the landing structure complete`,
    );
  });

  assert.ok(page.includes('ff-landing'), 'Landing root must carry the .ff-landing theme scope');
  assert.ok(
    read('src/index.css').includes('@import "./components/landing/landing.css";'),
    'Landing stylesheet must be imported from index.css so layer order stays deterministic',
  );
  assert.ok(page.includes('select-text'), 'Landing must allow text selection (body defaults to select-none)');
});

test('2. Accessibility: skip link, landmarks and labelled sections', () => {
  const page = read(`${LANDING_DIR}/LandingPage.tsx`);
  const nav = read(`${LANDING_DIR}/LandingNav.tsx`);
  const faq = read(`${LANDING_DIR}/sections/LandingFAQ.tsx`);
  const hero = read(`${LANDING_DIR}/sections/LandingHero.tsx`);

  assert.ok(page.includes('ff-skip-link') && page.includes('Chuyển đến nội dung chính'), 'Skip-to-content link required');
  assert.ok(page.includes('<main id="ff-main"'), 'Landing needs a <main> landmark');
  assert.ok(nav.includes('aria-expanded={menuOpen}'), 'Mobile menu toggle must expose aria-expanded');
  assert.ok(nav.includes('aria-controls="ff-mobile-menu"'), 'Mobile menu toggle must reference the drawer');
  assert.ok(nav.includes('aria-label="Điều hướng chính"'), 'Primary navigation requires an aria-label');
  assert.ok(
    nav.includes("event.key === 'Escape'"),
    'Mobile drawer must close with the Escape key',
  );
  assert.ok(
    nav.includes("document.body.style.overflow = 'hidden'"),
    'Mobile drawer must lock background scrolling while open',
  );

  assert.ok(faq.includes('aria-expanded={isOpen}'), 'FAQ triggers must expose aria-expanded');
  assert.ok(faq.includes('aria-controls={`faq-panel-${item.id}`}'), 'FAQ triggers must reference their panel');
  assert.ok(faq.includes('role="region"'), 'FAQ panels need a region role');
  assert.ok(
    hero.includes('aria-label="Cuộn để khám phá F-Forum"'),
    'Scroll-to-explore affordance must be labelled for assistive tech',
  );
});

test('3. Motion system: scroll reveals, staggered delays and reduced-motion safety', () => {
  const css = read(`${LANDING_DIR}/landing.css`);
  const primitives = read(`${LANDING_DIR}/LandingPrimitives.tsx`);
  const motion = read(`${LANDING_DIR}/useLandingMotion.ts`);

  assert.ok(primitives.includes('IntersectionObserver'), 'Reveal engine must use IntersectionObserver');
  assert.ok(css.includes('.ff-reveal'), 'Landing CSS must define the reveal primitive');
  assert.ok(css.includes('.is-visible'), 'Reveal must have a visible state');
  assert.ok(primitives.includes("'--ff-reveal-delay'"), 'Reveal must support staggered entrance delays');
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'Reduced-motion media query required');
  assert.ok(css.includes('html.reduce-motion .ff-reveal'), 'In-app reduced-motion class must also disable reveals');
  assert.ok(
    css.includes('.ff-scroll-dot') && css.includes('.ff-chevron-1'),
    'Scroll-to-explore indicator animations must exist',
  );
  assert.ok(
    motion.includes('requestAnimationFrame'),
    'Scroll listeners must be rAF-throttled to avoid layout thrash',
  );
  assert.ok(
    motion.includes("behavior: reduced ? 'auto' : 'smooth'"),
    'Smooth scrolling must respect reduced-motion preferences',
  );
});

test('4. Pricing, FAQ and copy data stay in one iterable source', () => {
  const content = read(`${LANDING_DIR}/landingContent.ts`);
  const pricing = read(`${LANDING_DIR}/sections/LandingPricing.tsx`);

  ['FEATURES', 'SHOWCASE_STEPS', 'BENEFITS', 'TESTIMONIALS', 'PRICING_PLANS', 'FAQ_ITEMS'].forEach((exportName) => {
    assert.ok(content.includes(`export const ${exportName}`), `${exportName} must be exported from landingContent`);
  });

  assert.ok(pricing.includes("cycle === 'monthly'"), 'Pricing must support a monthly/yearly billing toggle');
  assert.ok(pricing.includes('aria-pressed='), 'Billing toggle buttons must expose aria-pressed');
  assert.ok(
    pricing.includes('Miễn phí trọn đời cho sinh viên') || content.includes('Không quảng cáo, không phí ẩn.'),
    'Free-forever student promise must be visible in the pricing section',
  );
});

test('5. App integration: landing is the first-run route and the wheel engine ignores it', () => {
  const app = read('src/App.tsx');
  const store = read('src/store/forumStore.ts');
  const types = read('src/types/index.ts');
  const navbar = read('src/components/Navbar.tsx');

  assert.ok(types.includes("| 'landing'"), "DimensionView must include the 'landing' route");
  assert.ok(
    store.includes("safeStorage.getItem('fforum_landing_seen')"),
    'Store must send returning visitors straight into the product',
  );
  assert.ok(app.includes("currentView === 'landing'"), 'App must route the landing view');
  assert.ok(
    app.includes("currentView === 'landing' ? null : (") && app.includes("currentView !== 'chat' && ("),
    'In-app chrome (navbar / chat dock) must be hidden on the landing page',
  );
  assert.ok(
    app.includes("if (currentView === 'landing') {"),
    'Wheel-scroll view switching must be disabled while the landing page scrolls',
  );
  assert.ok(
    app.includes("onOpenAuth={() => handleOpenAuth('register')}"),
    'Landing CTAs must open the auth dialog on the register tab',
  );
  assert.ok(navbar.includes("{ id: 'landing', label: 'Giới thiệu' }"), 'In-app navbar needs a way back to the landing page');

  // The wheel engine invariants asserted by the navigation test must survive.
  assert.ok(
    app.includes("const CORE_SCROLL_VIEWS: DimensionView[] = ['home', 'clubs', 'qa', 'coming-soon'];"),
    'CORE_SCROLL_VIEWS pipeline must be unchanged',
  );
  assert.ok(app.includes('const SCROLL_COOLDOWN_MS = 650;'), 'SCROLL_COOLDOWN_MS must be unchanged');
});

test('6. No fabricated social proof or placeholder copy in the landing surface', () => {
  const files = fs
    .readdirSync(path.resolve(`${LANDING_DIR}/sections`))
    .map((file) => read(`${LANDING_DIR}/sections/${file}`))
    .concat([read(`${LANDING_DIR}/LandingNav.tsx`), read(`${LANDING_DIR}/LandingMocks.tsx`), read('src/components/landing/landingContent.ts')])
    .join('\n');

  ['Lorem ipsum', 'TODO', 'FIXME', 'số liệu giả', '100% Người thật & Tương tác thật'].forEach((banned) => {
    assert.ok(!files.includes(banned), `Landing copy must not contain "${banned}"`);
  });

  assert.ok(!/>undefined</.test(files), 'Landing must not render literal undefined values');
});
