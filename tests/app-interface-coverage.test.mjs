import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { LIGHT_VIEWS } from '../scripts/generate-light-adapter.mjs';

const read = async (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [types, app, main, indexCss, responsiveCss, designCss, landingCss, homeView, clubsCss, qaCss, threadsCss, chatView, memoryCss, chroniclesView, comingSoonView, examVaultCss, paperViewerCss, lightAudit] = await Promise.all([
  read('src/types/index.ts'),
  read('src/App.tsx'),
  read('src/main.tsx'),
  read('src/index.css'),
  read('src/styles/responsiveExperience.css'),
  read('src/styles/forumDesignSystem.css'),
  read('src/components/landing/landing.css'),
  read('src/components/views/HomeView.tsx'),
  read('src/components/views/ClubsView.css'),
  read('src/components/views/QAForumView.css'),
  read('src/components/views/ThreadsView.css'),
  read('src/components/views/ChatView.tsx'),
  read('src/components/MemoryRealm.css'),
  read('src/components/views/ChroniclesView.tsx'),
  read('src/components/views/ComingSoonView.tsx'),
  read('src/components/views/ExamVaultView.css'),
  read('src/components/views/ExamPaperViewerView.css'),
  read('tests/light-mode-contrast.test.mjs'),
]);

const typeBody = types.match(/export type DimensionView\s*=([\s\S]*?);/)?.[1] ?? '';
const appViewBody = app.match(/const VIEW_ORDER: DimensionView\[\] = \[([\s\S]*?)\];/)?.[1] ?? '';
const declaredViews = [...typeBody.matchAll(/'([^']+)'/g)].map((match) => match[1]);
const orderedViews = [...appViewBody.matchAll(/'([^']+)'/g)].map((match) => match[1]);

const adaptedViews = new Set(LIGHT_VIEWS);
const routeResponsiveEvidence = {
  landing: landingCss.includes('@media'),
  home: responsiveCss.includes('.ff-view-home .content-layer section'),
  clubs: clubsCss.includes('@media'),
  qa: qaCss.includes('@media (max-width:'),
  threads: threadsCss.includes('@media (max-width:'),
  chat: chatView.includes('ff-chat-view') && designCss.includes('@media (max-width: 480px)'),
  memory: memoryCss.includes('@media'),
  chronicles: /\b(sm|md|lg):/.test(chroniclesView),
  'coming-soon': /\b(sm|md|lg):/.test(comingSoonView),
  'exam-vault': examVaultCss.includes('@media (max-width: 640px)'),
  'exam-viewer': paperViewerCss.includes('@media (max-width: 640px)'),
};

test('every declared application view is routed and rendered exactly once in the view catalog', () => {
  assert.deepEqual(orderedViews, declaredViews, 'DimensionView and App.VIEW_ORDER must stay in sync');
  assert.equal(new Set(orderedViews).size, orderedViews.length, 'the route catalog must not duplicate views');

  for (const view of declaredViews) {
    assert.ok(app.includes(`currentView === '${view}'`), `${view} has no render branch in App`);
    assert.ok(app.includes(`ff-view-${view}`) || app.includes('ff-view-${currentView}'), `${view} is missing its route shell class`);
  }
});

test('every view has an explicit light-mode strategy: adapter, bespoke palette, or intentional cinema', () => {
  assert.deepEqual([...adaptedViews], ['clubs', 'qa', 'threads', 'chat', 'chronicles', 'coming-soon']);
  const generatedAdapter = indexCss.slice(
    indexCss.indexOf('/* @generated light-adapter:start'),
    indexCss.indexOf('/* @generated light-adapter:end */'),
  );
  assert.ok(generatedAdapter.length > 0, 'the generated light adapter is present');
  for (const view of adaptedViews) {
    assert.ok(generatedAdapter.includes(`.ff-view-${view}`), `${view} is missing from generated light adaptation`);
  }
  assert.ok(app.includes("const LIGHT_ADAPTED_VIEW_SELECTOR = '.ff-view-clubs, .ff-view-qa, .ff-view-threads, .ff-view-chat, .ff-view-chronicles, .ff-view-coming-soon'"));

  assert.match(landingCss, /html\.light \.ff-landing/);
  assert.match(examVaultCss, /html\.light \.ff-exam-vault/);
  assert.match(paperViewerCss, /html\.light \.ff-paper-viewer/);

  // The home video and Memory Realm are deliberate cinematic canvases, not missed
  // adapters. Their chrome still participates in light mode and this exception is
  // covered by the contrast audit rather than silently inheriting a dark palette.
  assert.ok(homeView.includes('<BoomerangVideoBg />'));
  assert.ok(app.includes('<MemoryRealm'));
  assert.ok(indexCss.includes('html.light .ff-app-shell:is(.ff-view-home, .ff-view-memory) .ff-nav-capsule.liquid-glass'));
  assert.match(lightAudit, /Trang chủ \(video\).*Ký ức \(rạp\) giữ trải nghiệm điện ảnh/);
  assert.ok(!adaptedViews.has('home') && !adaptedViews.has('memory'));
});

test('all views receive shared mobile-safe geometry plus route-specific responsive evidence', () => {
  assert.match(main, /import '\.\/styles\/responsiveExperience\.css'/);
  assert.match(responsiveCss, /\.ff-app-shell :is\(main, \.content-layer, \.content-layer > div, section, article, form, aside\)/);
  assert.match(responsiveCss, /@media \(max-width: 767px\)/);
  assert.match(responsiveCss, /env\(safe-area-inset-left/);
  assert.match(responsiveCss, /env\(safe-area-inset-right/);
  assert.match(responsiveCss, /\.ff-app-shell \[role='dialog'\][\s\S]*?max-height: calc\(100dvh/);
  assert.match(responsiveCss, /\.ff-app-shell \[role='dialog'\][\s\S]*?overscroll-behavior: contain/);

  for (const view of declaredViews) {
    assert.equal(routeResponsiveEvidence[view], true, `${view} needs local responsive evidence alongside the shared shell`);
  }
});

test('shared high-use dialogs retain modal semantics and are included in mobile sizing rules', async () => {
  const dialogFiles = [
    'src/components/SettingsModal.tsx',
    'src/components/AuthModal.tsx',
    'src/components/ProfileModal.tsx',
    'src/components/AdminInsightsModal.tsx',
    'src/components/DailyEngagementModal.tsx',
    'src/components/exam/ExamPrintExportModal.tsx',
    'src/components/exam/ExamBookmarkDrawer.tsx',
    'src/components/views/ExamVaultView.tsx',
  ];
  const sources = await Promise.all(dialogFiles.map(read));
  for (const [index, source] of sources.entries()) {
    assert.match(source, /role="dialog"/, `${dialogFiles[index]} should expose dialog semantics`);
    assert.match(source, /aria-modal="true"/, `${dialogFiles[index]} should expose modal state`);
  }
});

test('Fabulous appearance is wired globally and includes dedicated exam surfaces in both base palettes', async () => {
  const fabulousCss = await read('src/styles/fabulousTheme.css');
  assert.match(main, /import '\.\/styles\/fabulousTheme\.css'/);
  assert.match(fabulousCss, /html\.dark\.fabulous-mode \.layer-gradient-aura/);
  assert.match(fabulousCss, /html\.light\.fabulous-mode \.layer-gradient-aura/);
  assert.match(fabulousCss, /html\.dark\.fabulous-mode \.ff-exam-vault/);
  assert.match(fabulousCss, /html\.light\.fabulous-mode \.ff-exam-vault/);
  assert.match(fabulousCss, /html\.dark\.fabulous-mode \.ff-paper-viewer/);
  assert.match(fabulousCss, /html\.light\.fabulous-mode \.ff-paper-viewer/);
  assert.match(fabulousCss, /ff-paper-document__canvas/);
});
