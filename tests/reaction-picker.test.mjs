import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const OPTIONS = [
  { type: 'love', label: 'Thương', emoji: '❤️' },
  { type: 'haha', label: 'Haha', emoji: '😂' },
  { type: 'fire', label: 'Bùng', emoji: '🔥' },
  { type: 'wow', label: 'Wow', emoji: '😮' },
  { type: 'support', label: 'Ủng hộ', emoji: '🙌' },
];

test('One reaction control opens the popular emoji set on hover, focus, and tap', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost:5173/',
    pretendToBeVisual: true,
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
  let chosen = [];
  let ReactionPickerComponent;
  const draw = () => React.createElement(ReactionPickerComponent, {
    options: OPTIONS,
    counts: { love: 2, haha: 1 },
    selected: chosen,
    label: 'Bày tỏ cảm xúc',
    onReact: (type) => { chosen = [type]; },
  });
  try {
    ({ ReactionPicker: ReactionPickerComponent } = await vite.ssrLoadModule('/src/components/ui/ReactionPicker.tsx'));
    await React.act(async () => root.render(draw()));
    assert.equal(document.querySelectorAll('.ff-reaction-trigger').length, 1, 'chỉ có một nút mở reaction');
    assert.equal(document.querySelector('.ff-reaction-popover'), null, 'popover ban đầu gọn và đóng');

    const wrapper = document.querySelector('.ff-reaction-picker');
    const hover = new dom.window.MouseEvent('pointerover', { bubbles: true });
    Object.defineProperty(hover, 'pointerType', { value: 'mouse' });
    await React.act(async () => wrapper.dispatchEvent(hover));
    assert.equal(document.querySelectorAll('.ff-reaction-option').length, 5, 'hover mở ngay năm reaction phổ biến');

    await React.act(async () => document.querySelector('.ff-reaction-trigger').click());
    assert.equal(document.querySelector('.ff-reaction-popover'), null, 'nút chính đóng được popover');
    await React.act(async () => document.querySelector('.ff-reaction-trigger').click());
    const wow = [...document.querySelectorAll('.ff-reaction-option')].find((button) => button.title === 'Wow');
    assert.ok(wow, 'có reaction Wow trong nhóm phổ biến');
    await React.act(async () => wow.click());
    assert.deepEqual(chosen, ['wow'], 'chọn emoji gọi đúng callback reaction');
    assert.equal(document.querySelector('.ff-reaction-popover'), null, 'chọn reaction đóng popover');

    await React.act(async () => root.render(draw()));
    await React.act(async () => document.querySelector('.ff-reaction-trigger').focus());
    assert.equal(document.querySelectorAll('.ff-reaction-option').length, 5, 'keyboard focus mở được picker');
    const selectedWow = [...document.querySelectorAll('.ff-reaction-option')].find((button) => button.title === 'Wow');
    assert.equal(selectedWow.getAttribute('aria-pressed'), 'true', 'reaction đang chọn được công bố');
  } finally {
    await React.act(async () => root.unmount());
    await vite.close();
    dom.window.close();
  }
});

test('Thread and Q&A both use the shared one-icon reaction affordance', () => {
  const threads = fs.readFileSync('src/components/views/ThreadsView.tsx', 'utf8');
  const qa = fs.readFileSync('src/components/views/QAForumView.tsx', 'utf8');
  const picker = fs.readFileSync('src/components/ui/ReactionPicker.tsx', 'utf8');
  assert.match(threads, /<ReactionPicker[\s\S]*?options=\{REACTIONS\}/);
  assert.match(qa, /<ReactionPicker[\s\S]*?options=\{QUICK_REACTION_META\}/);
  assert.match(picker, /<Smile aria-hidden="true"/);
  assert.match(picker, /aria-expanded=\{isOpen\}/);
  assert.match(picker, /aria-pressed=\{active\}/);
  assert.match(picker, /event\.pointerType !== 'touch'/, 'hover behavior does not interfere with touch');
});
