/* Bản quyền trí tuệ thuộc về BroAmStuck — click thật qua React + DOM mô phỏng. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// Install DOM BEFORE importing ReactDOM so its event polyfill sees an actual document.
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
// jsdom lacks AnimationEvent; expose it before ReactDOM chooses vendor-prefixed listeners.
dom.window.AnimationEvent = dom.window.Event;
dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { createServer } = await import('vite');
const { default: reactPlugin } = await import('@vitejs/plugin-react');

const nextFrame = () => new Promise((resolve) => window.requestAnimationFrame(resolve));

function press(target, key, shiftKey = false) {
  const event = new window.KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

function fill(selector, value) {
  const input = document.querySelector(selector);
  assert.ok(input, `${selector} exists`);
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
}

// Real React handlers, including native input, double click, submit, and immediate close.
test('Cú Bông → form → đăng nhập/đăng ký: click nhanh không kẹt, lần nào mở cũng gặp Cú Bông', async () => {
  const vite = await createServer({ configFile: false, plugins: [reactPlugin()],
    server: { middlewareMode: true }, appType: 'custom' });
  const root = createRoot(document.getElementById('root'));
  try {
    let canvasFrames = 0;
    window.HTMLCanvasElement.prototype.getContext = () => ({
      clearRect() { canvasFrames++; }, setTransform() {}, beginPath() {}, arc() {}, fill() {},
      moveTo() {}, lineTo() {}, stroke() {},
      createLinearGradient() { return { addColorStop() {} }; },
    });
    const { AuthModal } = await vite.ssrLoadModule('/src/components/AuthModal.tsx');
    const { OwlOutcome } = await vite.ssrLoadModule('/src/components/auth/OwlOutcome.tsx');
    const { safeStorage } = await vite.ssrLoadModule('/src/utils/storage.ts');
    safeStorage.setItem('fforum_auth_intro_seen', 'true'); // Legacy flag must not suppress the intro.

    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const flows = [];
    let closes = 0;
    let loginCalls = 0;
    const props = { isOpen: true, onClose: () => { closes++; }, onSuccess: (flow) => flows.push(flow),
      onLoginWithPassword: async () => { loginCalls++; return { id: 'account' }; },
      onRegister: async () => ({ id: 'new-account' }) };

    await React.act(async () => root.render(React.createElement(AuthModal, { ...props, key: 'login', initialTab: 'login' })));
    assert.ok(document.querySelector('.auth-welcome-board'));
    assert.equal(document.querySelector('.auth-panel').hasAttribute('inert'), true);
    await React.act(nextFrame);
    assert.equal(document.activeElement, document.querySelector('.auth-welcome-board'), 'focus starts on welcome, not behind its inert panel');
    assert.equal(document.querySelector('.auth-sky'), null, 'hidden sky stars do not animate while owl lands');
    assert.equal(document.querySelector('.galaxy-sky'), null, 'canvas listeners are not mounted during entrance');
    const welcomeOwl = document.querySelector('.auth-welcome-owl');
    const welcomeSvg = welcomeOwl.firstElementChild;
    await React.act(async () => {
      for (let i = 0; i < 40; i++) document.querySelector('.auth-stage').dispatchEvent(
        new window.MouseEvent('pointermove', { bubbles: true, clientX: 90 + i })
      );
    });
    assert.equal(welcomeSvg.style.getPropertyValue('--cb-look-x'), '0.00px', 'pointer storm does not rerender owl mid-flight');
    const landed = new window.Event('animationend', { bubbles: true });
    Object.defineProperty(landed, 'animationName', { value: 'owlWelcomeLand' });
    await React.act(async () => welcomeOwl.dispatchEvent(landed));
    assert.ok(welcomeOwl.classList.contains('is-landed'), 'release will-change after entrance');
    await React.act(async () => {
      for (let i = 0; i < 40; i++) document.querySelector('.auth-stage').dispatchEvent(
        new window.MouseEvent('pointermove', { bubbles: true, clientX: 150 + i })
      );
    });
    await React.act(nextFrame);
    assert.equal(welcomeSvg.style.getPropertyValue('--cb-look-x'), '5.00px', 'eyes follow pointer without React renders');
    await React.act(async () => document.querySelector('.auth-welcome-switch').click());
    assert.match(document.querySelector('.auth-welcome-board').textContent, /ĐĂNG KÝ/);
    assert.match(document.querySelector('.auth-overlay').getAttribute('aria-label'), /đăng ký/);
    await React.act(async () => document.querySelector('.auth-welcome-board').click());
    assert.ok(document.querySelector('#field-3'), 'welcome switches the actual form');
    await React.act(nextFrame);
    assert.equal(document.activeElement, document.querySelector('#field-3'));
    await React.act(async () => document.querySelector('.auth-replay').click());
    assert.ok(document.querySelector('.auth-welcome-board'), 'replay reopens intro');
    assert.equal(document.querySelector('.auth-panel').hasAttribute('inert'), true);
    await React.act(nextFrame);
    assert.equal(document.activeElement, document.querySelector('.auth-welcome-board'));
    await React.act(async () => document.querySelector('.auth-welcome-switch').click());
    const board = document.querySelector('.auth-welcome-board');
    await React.act(async () => { board.click(); board.click(); });
    assert.equal(document.querySelectorAll('.auth-board-morph').length, 1, 'chỉ một ghost khi double-click');
    assert.equal(document.querySelector('.auth-panel').hasAttribute('inert'), false, 'form mở ngay, không chờ animation');
    await React.act(nextFrame);
    assert.equal(document.activeElement, document.querySelector('#field'));
    assert.equal(document.querySelectorAll('.galaxy-sky').length, 1);
    assert.equal(document.querySelector('.galaxy-sky').dataset.active, 'false');
    await React.act(async () => document.querySelector('.ffl__torch').dispatchEvent(
      new window.MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 160, clientY: 150 })
    ));
    assert.equal(document.querySelector('.galaxy-sky').dataset.active, 'true', 'password beam reveals entire viewport');
    assert.ok(document.querySelector('.auth-overlay > .galaxy-sky > canvas'));
    await React.act(async () => new Promise(resolve => setTimeout(resolve, 90)));
    assert.ok(canvasFrames > 0, 'canvas starfield paints when beam is on');
    let tabHidden = false;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => tabHidden });
    await React.act(async () => { tabHidden = true; document.dispatchEvent(new window.Event('visibilitychange')); });
    assert.ok(document.querySelector('.galaxy-sky--paused'));
    const hiddenFrames = canvasFrames;
    await React.act(async () => new Promise(resolve => setTimeout(resolve, 60)));
    assert.equal(canvasFrames, hiddenFrames, 'hidden tab stops canvas updates');
    await React.act(async () => { tabHidden = false; document.dispatchEvent(new window.Event('visibilitychange')); });
    await React.act(async () => { document.documentElement.classList.add('potator-mode'); await Promise.resolve(); });
    assert.ok(document.querySelector('.galaxy-sky--lite .galaxy-sky__lite-stars'), 'Lite uses one CSS shadow field');
    const liteFrames = canvasFrames;
    await React.act(async () => new Promise(resolve => setTimeout(resolve, 60)));
    assert.equal(canvasFrames, liteFrames, 'Lite stops canvas drawing');
    await React.act(async () => {
      document.documentElement.classList.remove('potator-mode');
      document.documentElement.classList.add('reduce-motion');
      await Promise.resolve();
    });
    assert.ok(document.querySelector('.galaxy-sky--reduced'), 'reduce motion selects static gradient');
    assert.equal(document.querySelector('.galaxy-sky__lite-stars'), null);
    await React.act(async () => { document.documentElement.classList.remove('reduce-motion'); await Promise.resolve(); });
    await React.act(async () => press(document.querySelector('#field-2'), 'Escape'));
    assert.equal(document.querySelector('.galaxy-sky').dataset.active, 'false', 'torch off fades starfield');
    assert.equal(document.querySelector('.ffl__viewport-beam'), null);
    const first = document.querySelector('.auth-replay');
    const last = [...document.querySelectorAll('.auth-overlay button:not(:disabled)')].at(-1);
    await React.act(async () => first.focus());
    let trapped;
    await React.act(async () => { trapped = press(first, 'Tab', true).defaultPrevented; });
    assert.equal(trapped, true);
    assert.equal(document.activeElement, last, 'Shift+Tab loops to last form action');
    await React.act(async () => { trapped = press(last, 'Tab').defaultPrevented; });
    assert.equal(trapped, true);
    assert.equal(document.activeElement, first, 'Tab loops to first form action');
    const tabs = document.querySelector('.auth-tabs');
    await React.act(async () => { document.querySelector('#auth-tab-login').focus(); press(tabs, 'End'); });
    assert.equal(document.querySelector('#auth-tab-register').getAttribute('aria-selected'), 'true');
    assert.equal(document.activeElement.id, 'auth-tab-register');
    await React.act(async () => press(tabs, 'Home'));
    assert.equal(document.querySelector('#auth-tab-login').getAttribute('aria-selected'), 'true');
    await React.act(async () => { fill('#field', 'user@example.com'); fill('#field-2', 'password123'); });
    await React.act(async () => { document.querySelector('form.auth-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })); });
    assert.equal(loginCalls, 1);
    assert.equal(closes, 1);
    assert.deepEqual(flows, ['login']);
    assert.equal(document.querySelector('.auth-alert'), null);

    // Every opening shows the owl, including register and users with a saved legacy 'seen' flag.
    await React.act(async () => root.render(React.createElement(AuthModal, { ...props, key: 'register', initialTab: 'register' })));
    assert.match(document.querySelector('.auth-welcome-board').textContent, /ĐĂNG KÝ/);
    await React.act(async () => document.querySelector('.auth-welcome-board').click());
    assert.ok(document.querySelector('#field-3'));
    await React.act(async () => {
      fill('#field-3', 'Bạn Học'); fill('#field-4', 'new@example.com');
      fill('#field-5', 'short'); fill('#field-6', 'wrong');
    });
    assert.equal(document.querySelectorAll('.ffl__torch').length, 1, 'register uses one torch in confirmation');
    assert.equal(document.querySelector('#field-5').closest('.ffl').querySelector('.ffl__torch'), null);
    assert.equal(document.querySelector('#field-5').type, 'password');
    const confirmTorch = document.querySelector('#field-6').closest('.ffl').querySelector('.ffl__torch');
    await React.act(async () => confirmTorch.dispatchEvent(new window.MouseEvent('pointerdown',
      { bubbles: true, cancelable: true, clientX: 20, clientY: 20 })));
    await React.act(nextFrame);
    const initialAngle = confirmTorch.style.getPropertyValue('--ffl-angle');
    await React.act(async () => window.dispatchEvent(new window.MouseEvent('pointermove',
      { bubbles: true, clientX: 120, clientY: 200 })));
    await React.act(nextFrame);
    assert.notEqual(confirmTorch.style.getPropertyValue('--ffl-angle'), initialAngle, 'torch rotates with beam');
    await React.act(async () => press(document.querySelector('#field-6'), 'Escape'));
    assert.equal(document.querySelector('.galaxy-sky').dataset.active, 'false');
    assert.match(document.querySelector('.auth-password-guide').textContent, /Còn 1 ký tự.*Chưa khớp/);
    await React.act(async () => { fill('#field-5', 'password123'); fill('#field-6', 'password123'); });
    assert.match(document.querySelector('.auth-password-guide').textContent, /Đã khớp/);
    assert.ok(document.querySelector('.auth-password-guide .is-filled'));

    await React.act(async () => { document.querySelector('form.auth-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })); });
    assert.equal(closes, 2);
    assert.deepEqual(flows, ['login', 'register']);

    await React.act(async () => root.render(React.createElement(OwlOutcome, { flow: 'register', onSkip: () => flows.push('skip') })));
    assert.ok(document.querySelector('.owl-outcome__gift'), 'đăng ký có kịch bản riêng');
    await React.act(async () => document.querySelector('.owl-outcome__skip').click());
    assert.equal(flows.at(-1), 'skip');

    // Skip remains functional on every opening, with no morph ghost.
    await React.act(async () => root.render(React.createElement(AuthModal, { ...props, key: 'skip', initialTab: 'login' })));
    assert.ok(document.querySelector('.auth-welcome-board'));
    await React.act(async () => document.querySelector('.auth-welcome-skip').click());
    assert.equal(document.querySelector('.auth-panel').hasAttribute('inert'), false);
    assert.equal(document.querySelector('.auth-board-morph'), null);

    await React.act(async () => root.render(React.createElement(AuthModal, { ...props, key: 'close', initialTab: 'login' })));
    await React.act(async () => document.querySelector('.auth-welcome-switch').click());
    assert.match(document.querySelector('.auth-welcome-board').textContent, /ĐĂNG KÝ/);
    await React.act(async () => document.querySelector('.auth-welcome-close').click());
    assert.equal(closes, 3, 'welcome có lối đóng rõ ràng, không kẹt trong modal');
    await React.act(async () => root.render(React.createElement(AuthModal, { ...props, key: 'close', isOpen: false })));
    assert.equal(document.activeElement, trigger, 'close restores the original CTA focus');
    await React.act(async () => root.render(React.createElement(AuthModal, { ...props, key: 'close', isOpen: true })));
    assert.match(document.querySelector('.auth-welcome-board').textContent, /ĐĂNG NHẬP/, 'same component shows login owl again on reopen');
    assert.equal(document.querySelectorAll('.auth-welcome-owl').length, 1, 'rapid close/reopen never stacks owls');
    assert.equal(document.querySelector('.auth-welcome-owl').classList.contains('is-landed'), false, 'new entrance starts fresh');
    await React.act(nextFrame);
    assert.equal(document.activeElement, document.querySelector('.auth-welcome-board'));
    await React.act(async () => root.render(React.createElement(AuthModal, { ...props, key: 'close', isOpen: false })));

    // Duplicate submit and a late response must not display a success/error scene after close.
    let resolvePending;
    let pendingCalls = 0;
    const pendingProps = { ...props, onLoginWithPassword: () => {
      pendingCalls++;
      return new Promise((resolve) => { resolvePending = resolve; });
    } };
    trigger.focus();
    await React.act(async () => root.render(React.createElement(AuthModal, { ...pendingProps, key: 'pending' })));
    assert.ok(document.querySelector('.auth-welcome-board'));
    await React.act(async () => document.querySelector('.auth-welcome-skip').click());
    await React.act(async () => { fill('#field', 'user@example.com'); fill('#field-2', 'password123'); });
    await React.act(async () => {
      const form = document.querySelector('form.auth-form');
      form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    });
    assert.equal(pendingCalls, 1, 'submissions are locked synchronously');
    assert.equal(document.querySelector('.auth-submit').disabled, true);
    await React.act(async () => document.querySelector('.auth-close').click());
    await React.act(async () => root.render(React.createElement(AuthModal, { ...pendingProps, key: 'pending', isOpen: false })));
    assert.equal(document.activeElement, trigger);
    await React.act(async () => resolvePending({ id: 'late-account' }));
    assert.deepEqual(flows, ['login', 'register', 'skip'], 'late success has no outcome');
    assert.equal(closes, 4, 'late success cannot close the dialog again');

    // Closing from the parent rather than the close button must also invalidate requests.
    let rejectPending;
    const rejectingProps = { ...props, onLoginWithPassword: () => new Promise((_, reject) => { rejectPending = reject; }) };
    await React.act(async () => root.render(React.createElement(AuthModal, { ...rejectingProps, key: 'pending', isOpen: true })));
    assert.ok(document.querySelector('.auth-welcome-board'), 'pending close still resets welcome');
    await React.act(async () => document.querySelector('.auth-welcome-skip').click());
    await React.act(async () => { fill('#field', 'user@example.com'); fill('#field-2', 'password123'); });
    await React.act(async () => document.querySelector('form.auth-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
    await React.act(async () => root.render(React.createElement(AuthModal, { ...rejectingProps, key: 'pending', isOpen: false })));
    await React.act(async () => rejectPending(new Error('stale failure')));
    await React.act(async () => root.render(React.createElement(AuthModal, { ...props, key: 'pending', isOpen: true })));
    assert.ok(document.querySelector('.auth-welcome-board'), 'parent-controlled close also resets welcome');
    assert.equal(document.querySelector('.auth-alert'), null, 'old rejection cannot leak into reopened form');
    await React.act(async () => document.querySelector('.auth-welcome-skip').click());
    assert.equal(document.querySelector('#field-2').value, '', 'sensitive fields cleared on close');
    await React.act(async () => { press(document.querySelector('.auth-overlay'), 'Escape'); });
    assert.equal(closes, 5, 'Escape closes the active dialog');

  } finally {
    await React.act(async () => root.unmount());
    await vite.close();
    dom.window.close();
  }
});
