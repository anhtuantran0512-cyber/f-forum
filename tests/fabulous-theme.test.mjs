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
