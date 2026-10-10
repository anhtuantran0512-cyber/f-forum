import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const { GRADIENT_PRESETS, resolveGodrayId, resolvePotatorId, resolveProfileGradientId } = await import('../src/utils/gradients.ts');

test('Mười hai gradient có mã duy nhất và chuyển lựa chọn cũ an toàn', () => {
  assert.equal(GRADIENT_PRESETS.length, 12);
  assert.equal(new Set(GRADIENT_PRESETS.map(g => g.id)).size, 12);
  assert.ok(GRADIENT_PRESETS.every(g => g.css.startsWith('linear-gradient(135deg,')));
  assert.equal(resolveGodrayId('godray-gold'), '06');
  assert.equal(resolvePotatorId('aurora'), '07');
  assert.equal(resolvePotatorId('void'), '10');
  assert.equal(resolveProfileGradientId(GRADIENT_PRESETS[2].css), '03');
  assert.equal(resolveGodrayId('invalid'), '06');
  assert.equal(resolveGodrayId('10'), '06', 'metal black is exclusive to Potator');
  assert.equal(resolveProfileGradientId('10'), '01');
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  assert.match(app, /if \(typeof detail\?\.mode === 'boolean'\) setPotatorMode\(detail\.mode\)/,
    'changing only the background must not toggle Potator mode');
  assert.match(app, /gradient=\{getGradient\(potatorBg\)\.css\}/);
  assert.match(fs.readFileSync('src/components/GradientSurface.css', 'utf8'), /\.6s ease both/,
    'cross-fade instead of instantly swapping background-image');
});

test('Một picker dùng chung: swatch thật, hover cục bộ, click và phím mũi tên', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost:5173/', pretendToBeVisual: true,
  });
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent', 'MutationObserver']) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: dom.window[key] });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { createServer } = await import('vite');
  const { default: reactPlugin } = await import('@vitejs/plugin-react');
  const vite = await createServer({ configFile: false, plugins: [reactPlugin()], server: { middlewareMode: true }, appType: 'custom' });
  const root = createRoot(document.querySelector('#root'));
  try {
    const { GradientSwatchPicker } = await vite.ssrLoadModule('/src/components/GradientSwatchPicker.tsx');
    let selected = '01';
    let pagePreviews = 0;
    window.addEventListener('fforum_godray_preview', () => pagePreviews++);
    const draw = (includeDarkMetal = false) => React.createElement(GradientSwatchPicker, {
      label: 'Bảng màu', value: selected, includeDarkMetal,
      onChange: id => { selected = id; root.render(draw(includeDarkMetal)); },
    });
    await React.act(async () => root.render(draw()));
    assert.equal(document.querySelectorAll('.gradient-swatch').length, 11);
    assert.equal(document.querySelector('[role="radiogroup"]').getAttribute('aria-label'), 'Bảng màu');
    assert.equal(document.querySelectorAll('[role="radio"][aria-checked="true"]').length, 1);
    const second = document.querySelector('[aria-label^="Gradient 02:"]');
    assert.match(fs.readFileSync('src/components/GradientSwatchPicker.tsx', 'utf8'), /style=\{\{ background: g\.css \}\}/, 'swatch uses the actual CSS gradient');
    assert.equal(GRADIENT_PRESETS[1].colors[0], '#4FACFE');
    await React.act(async () => second.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true })));
    assert.equal(selected, '01', 'hover cannot save a choice');
    assert.match(document.querySelector('.gradient-picker__preview-code').textContent, /#4FACFE/);
    assert.equal(pagePreviews, 0, 'hover cannot repaint the page');
    await React.act(async () => second.click());
    assert.equal(selected, '02');
    assert.equal(document.querySelector('[aria-label^="Gradient 02:"]').getAttribute('aria-checked'), 'true');
    assert.equal(document.querySelector('[aria-label^="Gradient 02:"]').tabIndex, 0);
    await React.act(async () => document.querySelector('[aria-label^="Gradient 02:"]').dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    ));
    assert.equal(selected, '03');
    await React.act(async () => root.render(draw(true)));
    assert.equal(document.querySelectorAll('.gradient-swatch').length, 12);
    assert.ok(document.querySelector('[aria-label^="Gradient 10:"]'), 'metal black is exclusive to Potator');
    assert.equal(document.querySelector('.gradient-swatch--active').textContent, '✓');
    assert.doesNotMatch([...document.querySelectorAll('.gradient-swatch')].map(b => b.textContent).join(''), /Không Gian|Đại Dương/);
    const css = fs.readFileSync('src/components/GradientSwatchPicker.css', 'utf8');
    assert.match(css, /prefers-reduced-motion: reduce/);
  } finally {
    await React.act(async () => root.unmount());
    await vite.close();
    dom.window.close();
  }
});
