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
    'LandingHighlights',
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

  ['FEATURES', 'SHOWCASE_STEPS', 'BENEFITS', 'HIGHLIGHTS', 'PRICING_PLANS', 'FAQ_ITEMS'].forEach((exportName) => {
    assert.ok(content.includes(`export const ${exportName}`), `${exportName} must be exported from landingContent`);
  });

  assert.doesNotMatch(pricing, /Theo năm · −20%|cycle === 'monthly'/, 'no meaningless discount switch on free membership');
  assert.match(pricing, /Đang phát triển/, 'unfinished tier is labelled, not sold');
  assert.doesNotMatch(content, /monthly: 49000|yearly: 470000/, 'unpublished prices must not contradict free membership');
  assert.match(content, /id: 'student',[\s\S]*?highlight: true,[\s\S]*?id: 'pro'/, 'feature the available student tier, not the unfinished one');
  assert.ok(
    pricing.includes('Miễn phí trọn đời cho sinh viên') || content.includes('Không quảng cáo, không phí ẩn.'),
    'Free-forever student promise must be visible in the pricing section',
  );
});

test('5. App integration: landing is the first-run route and wheel navigation is fully removed', () => {
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
    app.includes("onOpenAuth={() => handleOpenAuth('register')}"),
    'Landing CTAs must open the auth dialog on the register tab',
  );
  // Logo F đưa thẳng về Home; Giới thiệu vẫn còn trong menu Khám phá.
  assert.ok(!navbar.includes("{ id: 'landing', label: 'GIỚI THIỆU' }"));
  assert.equal((navbar.match(/onViewChange\('home'\)/g) || []).length, 2,
    'desktop and mobile F-Forum logos both navigate home');
  assert.ok(navbar.includes('aria-label="Giới thiệu F-Forum"') && navbar.includes("onViewChange('landing')"),
    'the Explore menu still provides access to the landing page');
  const landingBrand = read(`${LANDING_DIR}/LandingNav.tsx`).split('{/* Brand */}')[1].split('{/* Desktop links */}')[0];
  assert.match(landingBrand, /aria-label="Về trang chủ F-Forum"/);
  assert.match(landingBrand, /onEnterApp\(\)/, 'landing page F-Forum brand also goes home');

  // Wheel-scroll chuyển tab đã bị xóa hoàn toàn (EPIC 4) — landing không còn bị
  // engine cuộn nào đụng tới, và App không còn giữ pipeline/cooldown cũ.
  assert.ok(
    !app.includes('CORE_SCROLL_VIEWS') && !app.includes('SCROLL_COOLDOWN_MS'),
    'Wheel-navigation pipeline (CORE_SCROLL_VIEWS / SCROLL_COOLDOWN_MS) must be fully removed',
  );
  assert.ok(
    !app.includes("addEventListener('wheel'"),
    'No wheel listener may switch views anywhere in App',
  );
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

// Design audit regressions: contrast is checked numerically, not by substring alone.
const luminance = (hex) => {
  const channels = hex.replace('#', '').match(/../g).map((pair) => parseInt(pair, 16) / 255);
  return channels.reduce((sum, value, index) => {
    const linear = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    return sum + linear * [0.2126, 0.7152, 0.0722][index];
  }, 0);
};
const contrast = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

test('Design: role-based inks and light gradient stops remain readable in both themes', () => {
  const css = read(`${LANDING_DIR}/landing.css`);
  const dark = css.split('.ff-landing {')[1].split('\n}')[0];
  const light = css.split('html.light .ff-landing {')[1].split('\n}')[0];
  for (const [theme, block, background] of [
    ['dark', dark, '#05070c'],
    ['light', light, '#ffffff'],
  ]) {
    for (const role of ['amber', 'blue', 'green', 'violet', 'rose']) {
      const ink = block.match(new RegExp(`--ff-${role}-ink: (#[0-9a-f]{6})`))?.[1];
      assert.ok(ink, `${theme}: ${role} has a dedicated text token`);
      assert.ok(contrast(ink, background) >= 4.5, `${theme}: ${role} ink ${ink} fails AA on ${background}`);
    }
  }
  const lightGradient = css.split('html.light .ff-gradient-text {')[1].split('\n}')[0];
  for (const stop of [...lightGradient.matchAll(/#[0-9a-f]{6}/g)].map(([value]) => value)) {
    assert.ok(contrast(stop, '#ffffff') >= 4.5, `light gradient stop ${stop} must read on white`);
  }
  assert.match(css, /@supports \(\(background-clip: text\)/, 'gradient title has a plain-text fallback');
});

test('Design: pricing uses theme-aware foregrounds, unique anchors, and accessible touch targets', () => {
  const pricing = read(`${LANDING_DIR}/sections/LandingPricing.tsx`);
  const planPart = pricing.split('{/* Dedicated Luxury Donate Card Section */}')[0];
  assert.match(planPart, /ff-plan-card--featured/);
  assert.match(planPart, /text-\[var\(--ff-text\)\]/);
  assert.doesNotMatch(planPart, /text-white/, 'light tiers must not have white type on milky surfaces');
  assert.match(planPart, /ff-btn-ghost/, 'available tiers use the theme-aware action');
  assert.doesNotMatch(planPart, /Kích Hoạt Miễn Phí/, 'registration must not pretend to activate a future tier');
  assert.match(read(`${LANDING_DIR}/landing.css`), /\.ff-plan-card__action \{ min-height: 44px; \}/);
  assert.match(read(`${LANDING_DIR}/LandingNav.tsx`), /\{ id: 'nang-luc', label: 'Năng lực' \}/);
  const highlights = read(`${LANDING_DIR}/sections/LandingHighlights.tsx`);
  const features = read(`${LANDING_DIR}/sections/LandingFeatures.tsx`);
  assert.match(highlights, /id="nang-luc"/);
  assert.doesNotMatch(highlights, /id="tinh-nang"/, 'Năng lực must not shadow Tính năng anchor');
  assert.match(features, /id="tinh-nang"/);
  assert.match(read('src/components/views/QAForumView.tsx'), /w-11 h-11 rounded-lg bg-neutral-900/);
});

test('Design: Vietnamese mono glyphs are self-hosted rather than blocked by CSP', () => {
  const css = read('src/index.css');
  assert.match(css, /@import "@fontsource-variable\/geist-mono\/wght\.css"/);
  assert.doesNotMatch(css, /static\.figma\.com\/font/);
  assert.ok(JSON.parse(read('package.json')).dependencies['@fontsource-variable/geist-mono']);
  assert.match(read('src/components/views/ComingSoonView.tsx'), /Sắp ra mắt/);
});
