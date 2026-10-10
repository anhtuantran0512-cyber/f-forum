import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { quizSecondsLeft, QUIZ_DURATION_SECONDS } from '../src/utils/dailyQuizClock.ts';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:5173/', pretendToBeVisual: true,
});
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent',
  'PointerEvent', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle']) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true,
    value: key === 'requestAnimationFrame' ? dom.window.requestAnimationFrame.bind(dom.window)
      : key === 'cancelAnimationFrame' ? dom.window.cancelAnimationFrame.bind(dom.window) : dom.window[key] });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { createServer } = await import('vite');
const { default: reactPlugin } = await import('@vitejs/plugin-react');
const buttonWith = (text) => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === text);

test('Đếm giây bằng deadline: không đóng băng khi tab bị throttle', () => {
  assert.equal(QUIZ_DURATION_SECONDS, 15);
  assert.equal(quizSecondsLeft(16_000, 1000), 15);
  assert.equal(quizSecondsLeft(16_000, 6000), 10);
  assert.equal(quizSecondsLeft(16_000, 17_000), 0);
});

test('Tia sét: Admin chỉ có một chỗ thay Sổ tay, Hỏi bài rời quạt', async () => {
  const vite = await createServer({ configFile: false, plugins: [reactPlugin()], server: { middlewareMode: true }, appType: 'custom' });
  const root = createRoot(document.querySelector('#root'));
  try {
    const { RadialQuickMenu } = await vite.ssrLoadModule('/src/components/RadialQuickMenu.tsx');
    let opens = 0;
    const props = { onOpenFocusMode() {}, onOpenAdminPanel() { opens++; }, onOpenPalette() {}, onOpenSettings() {} };
    await React.act(async () => root.render(React.createElement(RadialQuickMenu, { ...props, adminAccess: false })));
    assert.equal(document.querySelectorAll('.ccm-02__item').length, 4);
    assert.equal(document.querySelector('[aria-label="Bảng thống kê quản trị"]'), null);
    assert.doesNotMatch(document.querySelector('.ccm-02').textContent, /Sổ tay nhanh|Hỏi bài/);
    await React.act(async () => root.render(React.createElement(RadialQuickMenu, { ...props, adminAccess: true })));
    assert.equal(document.querySelectorAll('.ccm-02__item').length, 5);
    assert.equal(document.querySelectorAll('[aria-label="Bảng thống kê quản trị"]').length, 1);
    await React.act(async () => document.querySelector('[aria-label="Bảng thống kê quản trị"]').click());
    assert.equal(opens, 1);
    assert.match(fs.readFileSync('src/App.tsx', 'utf8'), /adminAccess=\{canOpenAdminPanel\}/);
    assert.match(fs.readFileSync('src/components/RadialQuickMenu.tsx', 'utf8'), /tier: 'far' as const/);
  } finally {
    await React.act(async () => root.unmount());
    await vite.close();
  }
});

test('Mẹo Streak đổi thẻ theo nhịp 2 giây, vẫn lướt tay được', async () => {
  const vite = await createServer({ configFile: false, plugins: [reactPlugin()], server: { middlewareMode: true }, appType: 'custom' });
  const root = createRoot(document.querySelector('#root'));
  const originalSetInterval = window.setInterval;
  let autoTick;
  let period;
  window.setInterval = (callback, ms) => {
    if (ms === 2000) { autoTick = callback; period = ms; return originalSetInterval(() => {}, 100_000); }
    return originalSetInterval(callback, ms);
  };
  try {
    const { SwipeDeck } = await vite.ssrLoadModule('/src/components/ui/SwipeDeck.tsx');
    const items = [
      { id: 'a', title: 'Một', body: 'Gợi ý một' },
      { id: 'b', title: 'Hai', body: 'Gợi ý hai' },
      { id: 'c', title: 'Ba', body: 'Gợi ý ba' },
    ];
    await React.act(async () => root.render(React.createElement(SwipeDeck, { label: 'Mẹo hằng ngày', items, autoAdvanceMs: 2000 })));
    assert.equal(period, 2000);
    assert.equal(document.querySelector('.ff-deck__card.is-top .ff-deck__title').textContent, 'Một');
    await React.act(async () => { autoTick(); await new Promise(resolve => setTimeout(resolve, 285)); });
    assert.equal(document.querySelector('.ff-deck__card.is-top .ff-deck__title').textContent, 'Hai');
    await React.act(async () => { document.querySelector('[aria-label="Thẻ trước"]').click(); await new Promise(resolve => setTimeout(resolve, 285)); });
    assert.equal(document.querySelector('.ff-deck__card.is-top .ff-deck__title').textContent, 'Một');
  } finally {
    window.setInterval = originalSetInterval;
    await React.act(async () => root.unmount());
    await vite.close();
  }
});

test('Câu hỏi: chỉ chạy sau Sẵn sàng, đồng hồ tiến theo thời gian và lỗi không kẹt 0s', async () => {
  const vite = await createServer({ configFile: false, plugins: [reactPlugin()], server: { middlewareMode: true }, appType: 'custom' });
  const root = createRoot(document.querySelector('#root'));
  const realNow = Date.now;
  let now = realNow();
  Date.now = () => now;
  try {
    const { DailyEngagementModal } = await vite.ssrLoadModule('/src/components/DailyEngagementModal.tsx');
    const { safeStorage } = await vite.ssrLoadModule('/src/utils/storage.ts');
    safeStorage.removeItem('fforum_last_quiz_date');
    const claims = [];
    let shouldFail = true;
    const props = { isOpen: true, onClose() {}, isAuthenticated: true,
      onClaimReward: async action => { claims.push(action); return shouldFail
        ? { ok: false, message: 'Thử lại' }
        : { ok: true, correct: true, reward: 5 }; } };
    await React.act(async () => root.render(React.createElement(DailyEngagementModal, props)));
    assert.match(document.querySelector('.ff-daily-heading__title').textContent, /Nhịp học mỗi ngày/);
    assert.equal(document.querySelectorAll('.ff-daily-tab').length, 3);
    assert.equal(buttonWith('Điểm danh').getAttribute('aria-pressed'), 'true');
    assert.ok(document.querySelector('.ff-daily-day--active'), 'current day has a visible marker');
    await React.act(async () => buttonWith('Câu hỏi vui').click());
    assert.equal(buttonWith('Câu hỏi vui').getAttribute('aria-pressed'), 'true');
    assert.equal(buttonWith('Điểm danh').getAttribute('aria-pressed'), 'false');
    assert.match(document.querySelector('.ff-daily-quiz-intro').textContent, /Câu hỏi vui mỗi ngày/);
    assert.equal(document.querySelector('[role="timer"]'), null);
    now += 10_000;
    await React.act(async () => document.dispatchEvent(new window.Event('visibilitychange')));
    assert.equal(document.querySelector('[role="timer"]'), null, 'no clock before explicit ready');
    await React.act(async () => buttonWith('Sẵn sàng↗').click());
    assert.match(document.querySelector('[role="timer"]').textContent, /15s/);
    now += 5_000;
    await React.act(async () => document.dispatchEvent(new window.Event('visibilitychange')));
    assert.match(document.querySelector('[role="timer"]').textContent, /10s/);
    now += 11_000;
    await React.act(async () => document.dispatchEvent(new window.Event('visibilitychange')));
    assert.deepEqual(claims.map(c => c.answerIndex), [-1], 'time-out submits exactly once');
    assert.ok(buttonWith('Sẵn sàng↗'), 'server failure returns to ready instead of frozen 0s');
    await React.act(async () => buttonWith('Sẵn sàng↗').click());
    assert.match(document.querySelector('[role="timer"]').textContent, /15s/, 'retry receives a fresh clock');
    await React.act(async () => root.render(React.createElement(DailyEngagementModal, { ...props, isOpen: false })));
    now += 3000;
    await React.act(async () => root.render(React.createElement(DailyEngagementModal, props)));
    assert.match(document.querySelector('[role="timer"]').textContent, /12s/, 'clock catches up after closing/reopening');
    shouldFail = false;
    await React.act(async () => document.querySelector('.ff-daily-quiz-option').click());
    assert.match(document.querySelector('[role="dialog"]').textContent, /Trả lời đúng \+5 Coin/);
    assert.equal(document.querySelector('.ff-daily-quiz-result[role="status"]').dataset.outcome, 'correct');
    assert.equal(document.querySelector('[role="timer"]'), null, 'clock stops when answer succeeds');
    assert.equal(claims.length, 2);
    const quizCss = fs.readFileSync('src/components/engagement/DailyQuiz.css', 'utf8');
    assert.match(quizCss, /@property --quiz-progress/);
    assert.match(quizCss, /transition: --quiz-progress \.85s linear/);
    assert.match(quizCss, /\.reduce-motion \.ff-daily-quiz-clock \{ transition: none; \}/);
    assert.match(fs.readFileSync('src/components/DailyEngagementModal.tsx', 'utf8'), /autoAdvanceMs=\{2000\}/);
  } finally {
    Date.now = realNow;
    await React.act(async () => root.unmount());
    await vite.close();
    dom.window.close();
  }
});
