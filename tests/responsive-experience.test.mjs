import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/responsiveExperience.css', import.meta.url), 'utf8');
const appEntry = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const navbar = readFileSync(new URL('../src/components/Navbar.tsx', import.meta.url), 'utf8');

test('Responsive continuum loads after the shared design system', () => {
  const designSystemImport = appEntry.indexOf("import './styles/forumDesignSystem.css'");
  const responsiveImport = appEntry.indexOf("import './styles/responsiveExperience.css'");

  assert.notEqual(designSystemImport, -1);
  assert.notEqual(responsiveImport, -1);
  assert.ok(responsiveImport > designSystemImport);
});

test('The layout adapts phone, tablet, and wide workspaces with safe viewport units', () => {
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /@media \(min-width: 768px\) and \(max-width: 1100px\)/);
  assert.match(css, /@media \(min-width: 768px\) \{\s*\.ff-mobile-dock \{\s*display: none !important/);
  assert.match(css, /@media \(min-width: 1440px\)/);
  assert.match(css, /100dvh/);
  assert.match(css, /env\(safe-area-inset-left/);
  assert.match(css, /env\(safe-area-inset-right/);
});

test('Mobile navigation exposes active destinations and expandable exploration state', () => {
  assert.match(navbar, /aria-label="Điều hướng nhanh trên di động"/);
  assert.match(navbar, /aria-current=\{currentView === 'qa' \? 'page' : undefined\}/);
  assert.match(navbar, /aria-current=\{currentView === 'threads' \? 'page' : undefined\}/);
  assert.match(navbar, /aria-current=\{currentView === 'chat' \? 'page' : undefined\}/);
  assert.match(navbar, /aria-expanded=\{isMobileMenuOpen\}/);
  assert.match(navbar, /ff-mobile-context/);
});

test('Phone home and chat layouts avoid desktop viewport offsets and hidden content', () => {
  assert.match(css, /\.ff-view-home \.content-layer section[\s\S]*?overflow-y: auto/);
  assert.match(css, /\.ff-view-chat \.page-content-wrapper[\s\S]*?height: auto !important/);
  assert.match(css, /\.ff-app-shell \.modal-container[\s\S]*?max-height:/);
});

test('Touch targets and reduced-motion preferences remain supported', () => {
  assert.match(css, /--ff-touch-target: 44px/);
  assert.match(css, /@media \(hover: none\) and \(pointer: coarse\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
