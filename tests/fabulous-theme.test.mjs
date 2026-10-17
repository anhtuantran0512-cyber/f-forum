import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  DARK_GRADIENT_PRESETS,
  getDarkGradient,
  resolveDarkGradientId,
} from '../src/utils/darkGradients.ts';

const read = (path) => fs.readFileSync(path, 'utf8');

test('Dark gradient choices are stable, dark, selectable, and fail safe', () => {
  assert.equal(DARK_GRADIENT_PRESETS.length, 5);
  assert.equal(new Set(DARK_GRADIENT_PRESETS.map((preset) => preset.id)).size, 5);
  assert.equal(resolveDarkGradientId('forest'), 'forest');
  assert.equal(resolveDarkGradientId('not-a-gradient'), 'obsidian');
  assert.equal(resolveDarkGradientId(null), 'obsidian');
  assert.equal(getDarkGradient('plum').id, 'plum');
  assert.ok(DARK_GRADIENT_PRESETS.every((preset) => /linear-gradient/.test(preset.gradient)));

  const settings = read('src/components/SettingsModal.tsx');
  assert.match(settings, /title="Fabulous"/);
  assert.match(settings, /fabulousMode/);
  assert.match(settings, /theme === 'dark'[\s\S]*?DARK_GRADIENT_PRESETS\.map/);
  assert.match(settings, /aria-label=\{`Gradient \$\{preset\.label\}`\}/);
});

test('Fabulous and dark gradient persist independently of light/dark and Potator', () => {
  const navbar = read('src/components/Navbar.tsx');
  const boot = read('index.html');
  const css = read('src/styles/fabulousTheme.css');
  assert.match(navbar, /fforum_fabulous_mode/);
  assert.match(navbar, /fforum_dark_gradient/);
  assert.match(navbar, /classList\.toggle\('fabulous-mode', fabulousMode\)/);
  assert.match(navbar, /dataset\.darkGradient = darkGradient/);
  assert.match(boot, /fforum_fabulous_mode/);
  assert.match(boot, /\['obsidian', 'midnight', 'forest', 'plum', 'ember'\]/);
  assert.match(css, /html\.dark\[data-dark-gradient='obsidian'\]/);
  assert.match(css, /html\.light\.fabulous-mode/);
  assert.match(css, /html\.dark\.fabulous-mode/);
  assert.match(css, /\.ff-nav-capsule\.liquid-glass/);
  assert.match(css, /\.ff-qa-detail/);
  assert.doesNotMatch(navbar, /setPotatorMode\(\(prev\) => \{[\s\S]{0,180}fabulousMode/);
});

test('Nhiemvu 12: compact nametags, CozyGhibliIcons, unified background settings, scoped Light Mode glass, opt-in Fabulous stage, and proximity profile effects', () => {
  const decoratedAvatar = read('src/components/decorations/DecoratedAvatar.tsx');
  const decorationsCss = read('src/components/decorations/decorations.css');
  assert.match(decoratedAvatar, /npd-np--tag/);
  assert.match(decoratedAvatar, /if \(!asset && !overrideAsset\)/);
  assert.match(decorationsCss, /\.npd-np\.npd-np--tag/);

  const ghibliIcons = read('src/components/ui/CozyGhibliIcons.tsx');
  const navbar = read('src/components/Navbar.tsx');
  const chatDock = read('src/components/ChatDock.tsx');
  const chatView = read('src/components/views/ChatView.tsx');
  assert.match(ghibliIcons, /HelpCircle/);
  assert.match(ghibliIcons, /MessageCircleMore/);
  assert.match(navbar, /from '\.\/ui\/CozyGhibliIcons'/);
  assert.match(chatDock, /from '\.\/ui\/CozyGhibliIcons'/);
  assert.match(chatView, /from '\.\.\/ui\/CozyGhibliIcons'/);

  const settings = read('src/components/SettingsModal.tsx');
  assert.match(settings, /Cấu hình nền/);
  assert.match(settings, /grid-cols-2 gap-2/);
  assert.equal(
    (settings.match(/title="Fabulous"/g) || []).length,
    1,
    'Fabulous & Potator Mode must only appear in one unified control group, not scattered across multiple tabs',
  );
  assert.equal(
    (settings.match(/title="Potator Mode"/g) || []).length,
    1,
    'Potator Mode must only appear once alongside Fabulous',
  );

  const fabulousCss = read('src/styles/fabulousTheme.css');
  assert.match(fabulousCss, /html\.light:not\(\.potator-mode\) \.ff-nav-capsule\.liquid-glass/);
  assert.match(
    fabulousCss,
    /@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)/,
  );
  assert.match(
    fabulousCss,
    /html\.light :is\(\.liquid-glass, \.obsidian-glass, \.ff-glass-depth-1, \.ff-glass-depth-2, \.ff-glass-depth-3\):not\(\.ff-nav-capsule\):not\(\.ff-mobile-header\):not\(\.ff-mobile-dock\)/,
  );
  assert.match(fabulousCss, /\.ff-fabulous-stage/);

  const app = read('src/App.tsx');
  assert.match(app, /fabulousMode && !potatorMode && !reducedMotion/);
  assert.match(app, /TriVideoCrossfadeBg/);

  const triVideo = read('src/components/TriVideoCrossfadeBg.tsx');
  assert.match(triVideo, /useReducedMotion/);

  const decoMedia = read('src/components/decorations/useDecorationMedia.ts');
  assert.match(decoMedia, /useActiveInViewport\(ref, enabled && !reducedMotion\)/);
  assert.match(decoMedia, /:focus-visible/);
  assert.doesNotMatch(decoMedia, /interface ProfileProximityBindings[^}]*ref:/);

  const profileModal = read('src/components/ProfileModal.tsx');
  const quickCard = read('src/components/UserQuickCard.tsx');
  const dropdown = read('src/components/ProfileDropdown.tsx');
  const signatureCss = read('src/components/ProfileSignature.css');
  assert.match(profileModal, /useProfileProximityEffect/);
  assert.match(quickCard, /useProfileProximityEffect/);
  assert.match(dropdown, /useProfileProximityEffect/);
  assert.match(signatureCss, /\.ff-profile-surface\[data-profile-active="false"\]/);

  const designSystemCss = read('src/styles/forumDesignSystem.css');
  assert.match(
    designSystemCss,
    /html\.light :is\(\.ff-keep-dark, \.signature-profile\) \.ff-swash-cap/,
  );

  const qaView = read('src/components/views/QAForumView.tsx');
  const clubsView = read('src/components/views/ClubsView.tsx');
  const threadsView = read('src/components/views/ThreadsView.tsx');
  const examVault = read('src/components/views/ExamVaultView.tsx');
  const focusSanctuary = read('src/components/FocusSanctuary.tsx');
  assert.doesNotMatch(qaView, /ff-atelier-ribbon/);
  assert.doesNotMatch(clubsView, /ff-atelier-ribbon/);
  assert.doesNotMatch(threadsView, /ff-atelier-ribbon/);
  assert.doesNotMatch(examVault, /ff-atelier-ribbon/);
  assert.doesNotMatch(focusSanctuary, /ff-atelier-ribbon/);
});

test('useProfileProximityEffect runtime behavior: rests by default, wakes on proximity/keyboard focus, and returns to rest after pointer leave or tab hide', async () => {
  const { JSDOM } = await import('jsdom');
  const React = (await import('react')).default;
  const { act } = await import('react');
  const { createRoot } = await import('react-dom/client');

  const dom = new JSDOM('<!doctype html><html class="dark"><body><div id="root"></div></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
  });
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const prevHTMLElement = globalThis.HTMLElement;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  try {
    const { useProfileProximityEffect } = await import('../src/components/decorations/useDecorationMedia.ts');

    function Probe() {
      const boxRef = React.useRef(null);
      const prox = useProfileProximityEffect(boxRef, true, 80);
      return React.createElement(
        'div',
        {
          id: 'probe-card',
          ref: boxRef,
          'data-profile-active': prox.dataProfileActive,
          onPointerEnter: prox.onPointerEnter,
          onPointerLeave: prox.onPointerLeave,
          onFocusCapture: prox.onFocusCapture,
          onBlurCapture: prox.onBlurCapture,
        },
        React.createElement('button', { id: 'probe-btn', type: 'button' }, 'Action'),
      );
    }

    const container = dom.window.document.getElementById('root');
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(Probe));
    });

    const card = dom.window.document.getElementById('probe-card');
    const btn = dom.window.document.getElementById('probe-btn');
    card.getBoundingClientRect = () => ({
      left: 100,
      top: 100,
      right: 300,
      bottom: 260,
      width: 200,
      height: 160,
    });

    /* 1. Default calm rest state */
    assert.equal(card.getAttribute('data-profile-active'), 'false');

    /* 2. Pointer approaches within 80px (at x=50, y=150 -> dx=50 <= 80) */
    await act(async () => {
      const ev = new dom.window.Event('pointermove', { bubbles: true });
      Object.assign(ev, { clientX: 50, clientY: 150 });
      dom.window.dispatchEvent(ev);
      await new Promise((r) => setTimeout(r, 25));
    });
    assert.equal(card.getAttribute('data-profile-active'), 'true');

    /* 3. Mouse click on child button (not :focus-visible) then pointer moves far away (x=600, y=600) */
    btn.matches = (sel) => sel !== ':focus-visible';
    await act(async () => {
      btn.focus();
      const ev = new dom.window.Event('pointermove', { bubbles: true });
      Object.assign(ev, { clientX: 600, clientY: 600 });
      dom.window.dispatchEvent(ev);
      await new Promise((r) => setTimeout(r, 25));
    });
    assert.equal(
      card.getAttribute('data-profile-active'),
      'false',
      'mouse focus without :focus-visible must not keep profile active after pointer moves away',
    );

    /* 4. Keyboard focus (:focus-visible) activates, and tab hide (visibilitychange) returns to rest */
    await act(async () => {
      btn.blur();
    });
    btn.matches = (sel) => sel === ':focus-visible';
    await act(async () => {
      btn.focus();
    });
    assert.equal(card.getAttribute('data-profile-active'), 'true');

    Object.defineProperty(dom.window.document, 'hidden', { configurable: true, get: () => true });
    await act(async () => {
      dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));
    });
    assert.equal(card.getAttribute('data-profile-active'), 'false');

    await act(async () => {
      root.unmount();
    });
  } finally {
    globalThis.window = prevWindow;
    globalThis.document = prevDocument;
    globalThis.HTMLElement = prevHTMLElement;
  }
});


