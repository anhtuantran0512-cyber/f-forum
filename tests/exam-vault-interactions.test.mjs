import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createServer } from 'vite';
import reactPlugin from '@vitejs/plugin-react';
import { JSDOM } from 'jsdom';
import { createRoot } from 'react-dom/client';

test('Exam Vault Like, Preview, and Export PDF buttons respond to clicks', async () => {
  const dom = new JSDOM('<!doctype html><html class="dark"><body><div id="root"></div></body></html>', {
    url: 'http://localhost/exam-vault',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalFetch = globalThis.fetch;
  let vite;
  let root;

  Object.assign(globalThis, {
    window,
    document: window.document,
    HTMLElement: window.HTMLElement,
    MutationObserver: window.MutationObserver,
    CustomEvent: window.CustomEvent,
    File: window.File,
    FileReader: window.FileReader,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.requestAnimationFrame = (callback) => window.setTimeout(callback, 0);
  window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  window.scrollTo = () => {};
  let printCalls = 0;
  window.print = () => { printCalls += 1; };
  globalThis.fetch = async () => new Response(JSON.stringify({
    success: true,
    submissions: [],
    approvedSubmissions: [],
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  try {
    vite = await createServer({
      configFile: false,
      root: process.cwd(),
      plugins: [reactPlugin()],
      server: { middlewareMode: true },
    });
    const { ExamVaultView } = await vite.ssrLoadModule('/src/components/views/ExamVaultView.tsx');
    root = createRoot(document.querySelector('#root'));
    await act(async () => root.render(React.createElement(ExamVaultView, {
      currentUser: null,
      onNavigate() {},
    })));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });

    const firstCard = document.querySelector('.ff-exam-card');
    assert.ok(firstCard, 'the first exam card should render');

    const likeButton = firstCard.querySelector('button[aria-label^="Yêu thích"]');
    assert.ok(likeButton, 'the like button should render');
    const countBeforeLike = Number(likeButton.textContent.trim());
    await act(async () => {
      likeButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    assert.equal(likeButton.getAttribute('aria-pressed'), 'true');
    assert.equal(Number(likeButton.textContent.trim()), countBeforeLike + 1);
    assert.equal(document.querySelector('[role="dialog"]'), null, 'liking must not open the card preview');

    const previewButton = [...firstCard.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Xem thử'));
    assert.ok(previewButton, 'the preview button should render');
    await act(async () => {
      previewButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    assert.ok(document.querySelector('[role="dialog"]'), 'preview click should open its dialog');

    const closeButton = [...document.querySelectorAll('[role="dialog"] button')]
      .find((button) => /đóng/i.test(`${button.getAttribute('aria-label') || ''} ${button.textContent}`));
    assert.ok(closeButton, 'the preview dialog should provide a close button');
    await act(async () => {
      closeButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    const exportButton = [...firstCard.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Xuất PDF'));
    assert.ok(exportButton, 'the PDF export button should render for a paper without an attachment');
    await act(async () => {
      exportButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    assert.ok(document.querySelector('[role="dialog"]'), 'export click should open the print/export dialog');
    assert.match(document.body.textContent, /Lưu dưới dạng PDF/, 'the export dialog should explain PDF saving');

    const printButton = [...document.querySelectorAll('[role="dialog"] button')]
      .find((button) => button.textContent.includes('In / Lưu thành PDF'));
    assert.ok(printButton, 'the export dialog should provide a print-to-PDF action');
    await act(async () => {
      printButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    assert.equal(printCalls, 1, 'the print-to-PDF action should invoke the browser print dialog');
    assert.match(document.body.textContent, /Trong hộp thoại in/, 'the export should provide the Save as PDF instruction');
  } finally {
    if (root) await act(async () => root.unmount());
    if (vite) await vite.close();
    window.close();
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete globalThis.navigator;
    globalThis.fetch = originalFetch;
  }
});
