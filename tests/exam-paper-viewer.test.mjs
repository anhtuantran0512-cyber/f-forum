/* Bản quyền trí tuệ thuộc về BroAmStuck */
import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createServer } from 'vite';
import reactPlugin from '@vitejs/plugin-react';
import { JSDOM } from 'jsdom';
import { createRoot } from 'react-dom/client';

const jsonResponse = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

test('Dedicated exam reader embeds PDF attachments inline and toggles its own theme', async () => {
  const dom = new JSDOM('<!doctype html><html class="dark"><body><div id="root"></div></body></html>', {
    url: 'http://localhost/?view=exam-viewer&paper=pdf-paper-1',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalFetch = globalThis.fetch;
  let vite;
  let root;
  let backCalls = 0;
  const paper = {
    id: 'pdf-paper-1',
    title: 'Đề kiểm tra Toán học kỳ một',
    subject: 'Toán học',
    grade: 12,
    examType: 'Đề giữa kỳ 1',
    province: 'Gia Lai',
    school: 'THPT Pleiku',
    schoolYear: '2026-2027',
    format: 'PDF',
    attachments: [{ id: 'pdf-file-1', name: 'de-toan.pdf', size: 128, mimeType: 'application/pdf', format: 'PDF' }],
    verified: true,
    hasAnswer: false,
    uploader: { name: 'Học sinh Pleiku' },
    uploadDate: '15/10/2026',
    summary: 'Đề kiểm tra mẫu dùng để xác nhận trình đọc PDF.',
    status: 'approved',
  };
  const interaction = {
    likeCount: 3,
    likedByUser: false,
    averageRating: null,
    ratingCount: 0,
    userRating: null,
    hasReviewed: false,
    reviews: [],
  };

  Object.assign(globalThis, {
    window,
    document: window.document,
    HTMLElement: window.HTMLElement,
    MutationObserver: window.MutationObserver,
    CustomEvent: window.CustomEvent,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
  window.localStorage.setItem('fforum_theme', 'dark');
  window.requestAnimationFrame = (callback) => window.setTimeout(callback, 0);
  window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  window.scrollTo = () => {};
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === '/api/exam-submissions') {
      return jsonResponse({ success: true, submissions: [], approvedSubmissions: [paper] });
    }
    if (url === '/api/exam-interactions') {
      return jsonResponse({ success: true, interactions: { [paper.id]: interaction } });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    vite = await createServer({
      configFile: false,
      root: process.cwd(),
      plugins: [reactPlugin()],
      server: { middlewareMode: true },
    });
    const { ExamPaperViewerView } = await vite.ssrLoadModule('/src/components/views/ExamPaperViewerView.tsx');
    root = createRoot(document.querySelector('#root'));
    await act(async () => {
      root.render(React.createElement(ExamPaperViewerView, {
        currentUser: null,
        onBack: () => { backCalls += 1; },
      }));
      await new Promise((resolve) => setTimeout(resolve, 25));
    });

    assert.match(document.querySelector('h1#ff-paper-title')?.textContent || '', /Đề kiểm tra Toán/);
    const frame = document.querySelector('iframe.ff-paper-pdf-frame');
    assert.ok(frame, 'PDF is displayed in an embedded reader, not only as a download');
    assert.match(frame.src, /\/api\/exam-submissions\/pdf-paper-1\/attachments\/pdf-file-1\?inline=1/);
    assert.match(document.body.textContent, /3/, 'community counts are read from the server snapshot');

    const themeButton = document.querySelector('button[aria-label="Chuyển sang chế độ sáng"]');
    assert.ok(themeButton, 'the standalone reader provides a theme toggle even with the Navbar hidden');
    await act(async () => {
      themeButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    assert.ok(document.documentElement.classList.contains('light'));
    assert.equal(window.localStorage.getItem('fforum_theme'), 'light');

    const backButton = [...document.querySelectorAll('button')].find((button) => button.textContent.includes('Kho đề thi'));
    assert.ok(backButton, 'reader provides a clear return action');
    await act(async () => {
      backButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    assert.equal(backCalls, 1);
  } finally {
    if (root) await act(async () => root.unmount());
    if (vite) await vite.close();
    window.close();
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete globalThis.navigator;
    globalThis.fetch = originalFetch;
  }
});
