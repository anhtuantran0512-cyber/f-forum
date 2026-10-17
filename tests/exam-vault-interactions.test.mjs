/* Bản quyền trí tuệ thuộc về BroAmStuck */
import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createServer } from 'vite';
import reactPlugin from '@vitejs/plugin-react';
import { JSDOM } from 'jsdom';
import { createRoot } from 'react-dom/client';
import {
  addExamPaperReview,
  buildExamInteractionSnapshots,
  emptyExamPaperInteraction,
  sanitizeExamInteractions,
  setExamPaperLike,
  setExamPaperRating,
} from '../server/examInteractions.ts';

const response = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

test('Exam interaction storage deduplicates account actions and only builds public snapshots', () => {
  const store = sanitizeExamInteractions({
    'ex-01': {
      likes: ['student-1', 'student-1', '', 3],
      ratings: { 'student-1': 5, bad: 8 },
      reviews: [
        { id: 'r1', authorId: 'student-1', authorName: '<script>', authorRole: 'Học sinh', rating: 5, content: '  Hữu ích  ', createdAt: '2026-10-01T12:00:00.000Z' },
        { id: 'r2', authorId: 'student-1', authorName: 'Tên lặp', authorRole: 'Học sinh', rating: 4, content: 'Lặp nhận xét', createdAt: '2026-10-02T12:00:00.000Z' },
      ],
    },
    'pending-paper': { likes: ['student-2'], ratings: {}, reviews: [] },
  });
  const snapshot = buildExamInteractionSnapshots(store, ['ex-01'], 'student-1')['ex-01'];
  assert.equal(snapshot.likeCount, 1, 'a single account contributes at most one like');
  assert.equal(snapshot.likedByUser, true);
  assert.equal(snapshot.averageRating, 5);
  assert.equal(snapshot.hasReviewed, true);
  assert.equal(snapshot.reviews.length, 1, 'duplicate account reviews are removed during recovery');
  assert.equal(snapshot.reviews[0].content, 'Hữu ích');
  assert.deepEqual(Object.keys(buildExamInteractionSnapshots(store, [], 'student-1')), [], 'non-public paper ids are omitted');

  const record = emptyExamPaperInteraction();
  setExamPaperLike(record, 'student-1', true);
  setExamPaperLike(record, 'student-1', true);
  setExamPaperRating(record, 'student-1', 2);
  setExamPaperRating(record, 'student-1', 4);
  assert.equal(record.likes.length, 1);
  assert.equal(Object.keys(record.ratings).length, 1, 'a rating update replaces the account value');
  const review = {
    id: 'review-1', authorId: 'student-1', authorName: 'Học sinh', authorRole: 'Học sinh',
    rating: 4, content: 'Bài hay', createdAt: '2026-10-15T00:00:00.000Z',
  };
  assert.equal(addExamPaperReview(record, review), true);
  assert.equal(addExamPaperReview(record, { ...review, id: 'review-2' }), false, 'review submission is unique per account and paper');
});

test('Exam Vault uses server-backed community actions and blocks a duplicate review while pending', async () => {
  const dom = new JSDOM('<!doctype html><html class="dark"><body><div id="root"></div></body></html>', {
    url: 'http://localhost/exam-vault',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalFetch = globalThis.fetch;
  let vite;
  let root;
  let likeCalls = 0;
  let reviewCalls = 0;
  let releasePendingReview;
  let interaction = {
    likeCount: 2,
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
    File: window.File,
    FileReader: window.FileReader,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.requestAnimationFrame = (callback) => window.setTimeout(callback, 0);
  window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  window.scrollTo = () => {};
  const openedUrls = [];
  window.open = (url, target, features) => {
    openedUrls.push({ url: String(url), target, features });
    return null;
  };
  let printCalls = 0;
  window.print = () => { printCalls += 1; };
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url === '/api/exam-submissions') {
      return response({ success: true, submissions: [], approvedSubmissions: [] });
    }
    if (url === '/api/exam-interactions') {
      return response({ success: true, interactions: { 'ex-01': interaction } });
    }
    if (url.endsWith('/like')) {
      likeCalls += 1;
      const body = JSON.parse(init.body);
      interaction = { ...interaction, likedByUser: body.liked, likeCount: body.liked ? interaction.likeCount + 1 : Math.max(0, interaction.likeCount - 1) };
      return response({ success: true, interaction });
    }
    if (url.endsWith('/reviews')) {
      reviewCalls += 1;
      return new Promise((resolve) => {
        releasePendingReview = () => {
          interaction = {
            ...interaction,
            averageRating: 5,
            ratingCount: 1,
            userRating: 5,
            hasReviewed: true,
            reviews: [{ id: 'r-ui-1', authorName: 'Nguyễn An', authorRole: 'Học sinh', rating: 5, date: '15/10/2026', content: 'Lời giải rõ ràng.' }],
          };
          resolve(response({ success: true, interaction }));
        };
      });
    }
    if (url.endsWith('/rating')) {
      const body = JSON.parse(init.body);
      interaction = { ...interaction, averageRating: body.rating, ratingCount: 1, userRating: body.rating };
      return response({ success: true, interaction });
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
    const { ExamVaultView } = await vite.ssrLoadModule('/src/components/views/ExamVaultView.tsx');
    root = createRoot(document.querySelector('#root'));
    await act(async () => root.render(React.createElement(ExamVaultView, {
      currentUser: {
        id: 'student-ui-1',
        name: 'Nguyễn An',
        email: 'nguyen.an@example.vn',
        avatar: '/avatar.png',
        role: 'STUDENT',
        level: 1,
        xp: 0,
        bio: '',
        scopedClubIds: [],
      },
      onNavigate() {},
    })));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });

    const firstCard = document.querySelector('.ff-exam-card');
    assert.ok(firstCard, 'the first exam card should render');
    const likeButton = firstCard.querySelector('button[aria-label^="Yêu thích"]');
    assert.ok(likeButton, 'the community like control should render for a public paper');
    assert.equal(Number(likeButton.textContent.trim()), 2, 'the displayed count comes from the server snapshot');
    await act(async () => {
      likeButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.equal(likeCalls, 1, 'like action is sent to the server');
    assert.equal(likeButton.getAttribute('aria-pressed'), 'true');
    assert.equal(Number(likeButton.textContent.trim()), 3);
    assert.equal(document.querySelector('[role="dialog"]'), null, 'liking must not open the card preview');
    assert.doesNotMatch(firstCard.textContent, /\b\d+ lượt tải|\b\d+ lượt xem/, 'unavailable counters are not fabricated');

    const themeButton = document.querySelector('button[aria-label="Chuyển sang chế độ sáng"]');
    assert.ok(themeButton, 'the Exam Vault should expose a working theme control without the Navbar');
    await act(async () => {
      themeButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    assert.ok(document.documentElement.classList.contains('light'), 'the standalone Exam Vault toggle applies light mode directly');
    assert.equal(window.localStorage.getItem('fforum_theme'), 'light', 'the theme preference is persisted');
    const returnToDarkButton = document.querySelector('button[aria-label="Chuyển sang chế độ tối"]');
    await act(async () => {
      returnToDarkButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    assert.ok(document.documentElement.classList.contains('dark'), 'the theme toggle also restores dark mode');

    const readerLink = [...firstCard.querySelectorAll('a')]
      .find((link) => link.textContent.includes('Đọc đề'));
    assert.ok(readerLink, 'the dedicated reader action should render');
    assert.equal(readerLink.target, '_blank', 'the reader opens separately from the vault');
    assert.match(readerLink.href, /view=exam-viewer.*paper=ex-01/);
    await act(async () => {
      firstCard.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    assert.equal(openedUrls.length, 1, 'selecting an exam card opens a separate reader page');
    assert.match(openedUrls[0].url, /view=exam-viewer.*paper=ex-01/);
    assert.equal(openedUrls[0].target, '_blank');

    const detailsButton = [...firstCard.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Chi tiết'));
    assert.ok(detailsButton, 'the separate details action should keep the full review and discussion panel available');
    await act(async () => {
      detailsButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    const dialog = document.querySelector('[role="dialog"]');
    assert.ok(dialog, 'details click should open the full community and discussion panel');
    const reviewTextarea = dialog.querySelector('textarea[placeholder*="Chia sẻ"]');
    assert.ok(reviewTextarea, 'public preview should render the server-backed review form');
    const reactPropsKey = Object.keys(reviewTextarea).find((key) => key.startsWith('__reactProps$'));
    assert.ok(reactPropsKey, 'React should attach the controlled textarea handler');
    const reviewForm = reviewTextarea.closest('form');
    await act(async () => {
      reviewTextarea.value = 'Lời giải rõ ràng.';
      reviewTextarea[reactPropsKey].onChange({ target: reviewTextarea, currentTarget: reviewTextarea });
    });
    assert.equal([...reviewForm.querySelectorAll('button')].find((button) => button.type === 'submit').disabled, false);
    await act(async () => {
      reviewForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
      reviewForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.equal(reviewCalls, 1, 'a synchronous in-flight guard prevents duplicate network requests');
    const sendReviewButton = [...reviewForm.querySelectorAll('button')].find((button) => button.type === 'submit');
    assert.ok(sendReviewButton.disabled, 'review submission stays disabled until its request resolves');
    await act(async () => {
      releasePendingReview();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.match(dialog.textContent, /Bạn đã gửi nhận xét/);
    assert.match(dialog.textContent, /Lời giải rõ ràng\./);

    const closeButton = [...document.querySelectorAll('[role="dialog"] button')]
      .find((button) => /đóng/i.test(`${button.getAttribute('aria-label') || ''} ${button.textContent}`));
    assert.ok(closeButton, 'the preview dialog should provide a close button');
    await act(async () => {
      closeButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    const exportButton = [...firstCard.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Xuất PDF'));
    assert.ok(exportButton, 'the PDF export action should render for a paper without an attachment');
    await act(async () => {
      exportButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
      const deadline = Date.now() + 2000;
      while (!document.querySelector('[role="dialog"]') && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    });
    assert.ok(document.querySelector('[role="dialog"]'), 'export click should open the lazy-loaded print/export dialog');
    assert.match(document.body.textContent, /Lưu dưới dạng PDF/, 'export dialog should explain PDF saving');

    const printButton = [...document.querySelectorAll('[role="dialog"] button')]
      .find((button) => button.textContent.includes('In / Lưu thành PDF'));
    assert.ok(printButton, 'the export dialog should provide a print-to-PDF action');
    await act(async () => {
      printButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    assert.equal(printCalls, 1, 'the print-to-PDF action should invoke the browser print dialog');
    assert.match(document.body.textContent, /Trong hộp thoại in/, 'export should provide the Save as PDF instruction');
  } finally {
    if (root) await act(async () => root.unmount());
    if (vite) await vite.close();
    window.close();
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete globalThis.navigator;
    globalThis.fetch = originalFetch;
  }
});
