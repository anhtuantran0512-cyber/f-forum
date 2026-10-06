import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (rel) => fs.readFileSync(path.resolve(rel), 'utf8');

test('App shell keeps content selectable and provides one valid main landmark', () => {
  const html = read('index.html');
  const app = read('src/App.tsx');
  const landing = read('src/components/landing/LandingPage.tsx');

  assert.ok(!/<body[^>]*\bselect-none\b/.test(html), 'Forum content and answers must be selectable and copyable');
  assert.ok(app.includes('className="ff-skip-link" href="#main-content"'), 'Every non-landing view must have a keyboard skip link');
  assert.ok(app.includes("currentView === 'landing' ? 'div' : 'main'"), 'Landing must not be nested inside a second main landmark');
  assert.ok(app.includes("id={currentView === 'landing' ? undefined : 'main-content'}"), 'Skip link must target the shared main landmark');
  assert.ok(landing.includes('<main id="ff-main"'), 'Landing keeps its own main landmark and skip target');
});

test('Offline state is announced without blocking controls, and reconnect reloads server state', () => {
  const banner = read('src/components/OfflineStatusBanner.tsx');
  const app = read('src/App.tsx');
  const store = read('src/store/forumStore.ts');
  const css = read('src/index.css');

  assert.ok(banner.includes("window.addEventListener('offline', handleOffline)"));
  assert.ok(banner.includes("window.addEventListener('online', handleOnline)"));
  assert.ok(banner.includes('role="status"') && banner.includes('aria-live="polite"'), 'Connection loss must be announced accessibly');
  assert.ok(banner.includes('có thể chưa được ghi nhận'), 'Copy must not falsely promise offline writes are saved');
  assert.ok(app.includes('<OfflineStatusBanner />'), 'The status is mounted across app views');
  assert.ok(store.includes("window.addEventListener('online', handleOnline)"), 'Restoring a browser connection retries the authoritative state sync');
  assert.ok(store.includes('void fetchServerState()'), 'Reconnect handler must refresh server state');
  assert.ok(css.includes('.ff-offline-banner') && css.includes('pointer-events: none'), 'The notice must not block the interface');
  assert.ok(css.includes('top: calc(var(--safe-top, 0px) + 88px)'), 'Keep the notice below the fixed navigation bars');
  assert.ok(css.includes('html.light .ff-offline-banner') && css.includes('backdrop-filter: blur(20px)'), 'Offline notice keeps the tinted glass treatment');
});

test('Crash recovery hides internal exception details in production', () => {
  const boundary = read('src/components/AppErrorBoundary.tsx');
  const css = read('src/index.css');

  assert.ok(boundary.includes('role="alertdialog"') && boundary.includes('aria-labelledby="ff-error-title"'));
  assert.match(boundary, /\{import\.meta\.env\.DEV && \([\s\S]*?<pre>\{String\(error\?\.stack/);
  assert.ok(!boundary.includes('{String(error?.message || error)}'), 'Production fallback must not reveal raw internal errors');
  assert.ok(boundary.includes('autoFocus type="button"'), 'Move keyboard focus into the recovery dialog');
  assert.ok(boundary.includes('this.reload(false)') && boundary.includes('this.reload(true)'), 'Both reload recovery paths remain available');
  assert.ok(css.includes('.ff-error-boundary__card') && css.includes('html.light .ff-error-boundary__card'));
  assert.ok(css.includes('.ff-error-boundary__actions button {') && css.includes('min-height: 44px'), 'Recovery buttons must remain touch friendly');
});

test('Loading screen has no fake theme control and does not live-announce every progress tick', () => {
  const loader = read('src/components/PageResourceLoader.tsx');
  assert.ok(!loader.includes('isDarkTheme') && !loader.includes('setIsDarkTheme'), 'Remove the theme toggle that never changed the app theme');
  assert.ok(loader.includes('aria-live="off"') && loader.includes('aria-label="Đang tải F-Forum"'));
  assert.ok(loader.includes('aria-busy="true"') && loader.includes('aria-valuenow={pct}'), 'Keep a static loading announcement and inspectable progress value');
  assert.ok(loader.includes('onClick={handleManualSkip}'), 'Keep the real skip action available');
});

test('Focus HUD frame escapes clipped app shells and fits the visible viewport', () => {
  const focus = read('src/components/FocusSanctuary.tsx');
  const css = read('src/index.css');

  assert.ok(focus.includes("import { createPortal } from 'react-dom'"));
  assert.ok(focus.includes('createPortal(<FocusSanctuaryInner onClose={onClose} userEmail={userEmail} />, document.body)'));
  assert.ok(focus.includes('className="ff-focus-backdrop bg-black/90 backdrop-blur-2xl animate-fade-up"'));
  assert.ok(css.includes('.ff-focus-backdrop {') && css.includes('z-index: 10000;'));
  assert.ok(css.includes('max-height: max(1px, calc(var(--ff-visible-height, 100vh)'));
  assert.ok(css.includes('.ff-focus-panel {') && css.includes('overflow-y: auto;'));
  assert.ok(css.includes('.ff-focus-panel::before') && css.includes('content: none !important;'), 'Remove the generic specular overlay that can leave a stray inner edge');
  assert.ok(css.includes('html.dark .ff-focus-panel') && css.includes('html.light .ff-focus-panel'), 'Keep one controlled frame in both themes');
  assert.ok(css.includes('@media (max-width: 480px)') && css.includes('.ff-focus-timepiece {'));
  assert.ok(css.includes('@media (max-height: 620px)'), 'Small-height screens must shrink the clock and panel padding');
});

test('Light-mode white utility surfaces are replaced by translucent tinted glass', () => {
  const css = read('src/index.css');
  assert.ok(css.includes('background-color: rgba(57, 91, 130, 0.32) !important;'));
  assert.ok(css.includes('background-color: rgba(118, 157, 198, 0.15) !important;'));
  assert.ok(css.includes('backdrop-filter: blur(var(--glass-blur, 14px)) saturate(160%);'));
  assert.ok(!css.includes('background-color: rgba(213, 228, 245, 0.76) !important;'), 'Do not wash light mode in near-opaque white');
});
