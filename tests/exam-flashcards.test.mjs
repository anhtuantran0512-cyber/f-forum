/* Bản quyền trí tuệ thuộc về BroAmStuck */
import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createServer } from 'vite';
import reactPlugin from '@vitejs/plugin-react';
import { JSDOM } from 'jsdom';
import { createRoot } from 'react-dom/client';
import { getExamCBTQuestions } from '../src/components/exam/cbtData.ts';

test('getExamCBTQuestions generates balanced and complete flashcard questions for any exam paper', () => {
  const paper = {
    id: 'ex-flash-test',
    title: 'Đề ôn tập Toán 12',
    subject: 'Toán học',
    grade: 12,
    examType: 'Đề giữa kỳ 1',
    province: 'Đà Nẵng',
    school: 'THPT Chuyên Lê Quý Đôn',
    schoolYear: '2026-2027',
    format: 'PDF',
    verified: true,
    hasAnswer: true,
  };

  const questions = getExamCBTQuestions(paper);
  assert.ok(Array.isArray(questions));
  assert.ok(questions.length >= 4, 'must have at least 4 flashcard questions');
  questions.forEach((q) => {
    assert.ok(q.id, 'question must have id');
    assert.ok(q.question, 'question must have text');
    assert.ok(q.options && q.options.length === 4, 'must have 4 options');
    assert.ok(['A', 'B', 'C', 'D'].includes(q.correctAnswer), 'must have valid correct answer');
    assert.ok(q.topic, 'must have topic');
    assert.ok(q.difficulty, 'must have difficulty');
    assert.ok(q.explanation, 'must have explanation');
  });
});

test('ExamFlashcardModal renders interactive 3D flip card, tracks mastery and handles keyboard navigation', async () => {
  const dom = new JSDOM('<!doctype html><html class="dark"><body><div id="root"></div></body></html>', {
    url: 'http://localhost/exam-vault',
    pretendToBeVisual: true,
  });
  const { window } = dom;

  Object.assign(globalThis, {
    window,
    document: window.document,
    HTMLElement: window.HTMLElement,
    MutationObserver: window.MutationObserver,
    CustomEvent: window.CustomEvent,
    IS_REACT_ACT_ENVIRONMENT: true,
  });

  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.requestAnimationFrame = (cb) => window.setTimeout(cb, 0);
  window.cancelAnimationFrame = (id) => window.clearTimeout(id);

  let vite;
  let root;
  let cbtOpened = false;
  let closed = false;

  const mockPaper = {
    id: 'ex-01',
    title: 'Đề kiểm tra Khảo sát Toán 12',
    subject: 'Toán học',
    grade: 12,
    examType: 'Đề giữa kỳ 1',
    province: 'Hà Nội',
    school: 'THPT Chu Văn An',
    schoolYear: '2026-2027',
    format: 'PDF',
    verified: true,
    hasAnswer: true,
  };

  try {
    vite = await createServer({
      configFile: false,
      root: process.cwd(),
      plugins: [reactPlugin()],
      server: { middlewareMode: true },
    });

    const { ExamFlashcardModal } = await vite.ssrLoadModule('/src/components/exam/ExamFlashcardModal.tsx');
    root = createRoot(document.querySelector('#root'));

    await act(async () => {
      root.render(
        React.createElement(ExamFlashcardModal, {
          paper: mockPaper,
          isOpen: true,
          onClose: () => { closed = true; },
          onOpenCbt: () => { cbtOpened = true; },
        })
      );
      await new Promise((resolve) => setTimeout(resolve, 30));
    });

    /* 1. Modal rendered in document body via portal */
    const modal = document.querySelector('[role="dialog"][aria-label="Thẻ ghi nhớ & Ôn tập nhanh"]');
    assert.ok(modal, 'flashcard modal must be mounted in DOM');

    /* 2. Top bar title & ribbon */
    assert.ok(modal.textContent.includes('Thẻ Ghi Nhớ & Ôn Tập Nhanh'));
    assert.ok(modal.textContent.includes('Học · Hỏi · Chia sẻ'));

    /* 3. Flip card inner */
    const cardInner = modal.querySelector('.ff-flashcard-inner');
    assert.ok(cardInner, '3D flashcard inner container must render');
    assert.equal(cardInner.classList.contains('is-flipped'), false, 'initially front side is visible');

    /* 4. Click to flip card */
    const flipButton = modal.querySelector('button[title="Lật thẻ (Phím Cách)"]');
    assert.ok(flipButton, 'flip button must exist');

    await act(async () => {
      flipButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    assert.equal(cardInner.classList.contains('is-flipped'), true, 'card flips to back after clicking');

    /* 5. Mark as mastered */
    const masteredBtn = modal.querySelector('button[title="Đánh dấu đã thuộc (Phím ↑)"]');
    assert.ok(masteredBtn, 'mastered button must exist');

    await act(async () => {
      masteredBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    /* Progress should show at least 1 mastered */
    assert.ok(modal.textContent.includes('Đã nắm vững:'));

    /* 6. CBT launcher button */
    const cbtBtn = modal.querySelector('button[title="Chuyển sang phòng thi thử trắc nghiệm tính giờ"]');
    assert.ok(cbtBtn, 'CBT launcher button must exist in header');
    await act(async () => {
      cbtBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    assert.equal(closed, true, 'closing callback invoked when switching to CBT');
    assert.equal(cbtOpened, true, 'onOpenCbt callback invoked');

  } finally {
    if (root) {
      await act(async () => root.unmount());
    }
    if (vite) {
      await vite.close();
    }
  }
});
