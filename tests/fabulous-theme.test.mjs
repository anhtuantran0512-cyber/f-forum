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

  const fabulousCss = read('src/styles/fabulousTheme.css');
  assert.match(fabulousCss, /html\.light \.ff-nav-capsule\.liquid-glass/);
  assert.match(fabulousCss, /html\.light \.liquid-glass:not\(\.ff-nav-capsule\):not\(\.ff-mobile-header\):not\(\.ff-mobile-dock\)/);
  assert.match(fabulousCss, /\.ff-fabulous-stage/);

  const app = read('src/App.tsx');
  assert.match(app, /fabulousMode && !potatorMode/);
  assert.match(app, /TriVideoCrossfadeBg/);

  const profileModal = read('src/components/ProfileModal.tsx');
  const quickCard = read('src/components/UserQuickCard.tsx');
  const dropdown = read('src/components/ProfileDropdown.tsx');
  const signatureCss = read('src/components/ProfileSignature.css');
  assert.match(profileModal, /useProfileProximityEffect/);
  assert.match(quickCard, /useProfileProximityEffect/);
  assert.match(dropdown, /useProfileProximityEffect/);
  assert.match(signatureCss, /\.ff-profile-surface\[data-profile-active="false"\]/);
});
