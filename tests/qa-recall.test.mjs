import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildRecallEntry,
  buildSavedRecallDeck,
  splitRecallSolution,
} from '../src/utils/qaRecall.ts';

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), 'utf8');

const makeQuestion = (id, overrides = {}) => ({
  id,
  title: `Bài ${id}`,
  subject: 'toan',
  content: 'Đề bài mẫu.',
  authorId: `author-${id}`,
  authorName: 'Người hỏi',
  authorAvatar: '',
  isAnonymous: false,
  createdAt: '2026-10-17',
  isSolved: true,
  bestSolutionId: `solution-${id}`,
  views: 0,
  ...overrides,
});

const makeSolution = (id, questionId, overrides = {}) => ({
  id,
  questionId,
  authorId: `solver-${id}`,
  authorName: 'Người giải',
  authorAvatar: '',
  authorLevel: 1,
  content: `Lời giải gốc ${id}.`,
  createdAt: '2026-10-17',
  isBest: true,
  upvotes: 0,
  ...overrides,
});

test('QA recall 1. Bộ mục đã lưu giữ đúng thứ tự và chỉ lấy câu học thuật đã giải', () => {
  const questions = [
    makeQuestion('q-1'),
    makeQuestion('q-2', { isSolved: false }),
    makeQuestion('q-3', { subject: 'tamsu' }),
    makeQuestion('q-4', { status: 'deleted' }),
    makeQuestion('q-5'),
    makeQuestion('q-6'),
    makeQuestion('q-7', { bestSolutionId: undefined }),
  ];
  const approved = makeSolution('solution-q-1', 'q-1', { content: 'Lời giải thành viên được chọn.' });
  const chosenById = makeSolution('solution-q-1-preferred', 'q-1', {
    content: 'Phương án thực sự được câu hỏi chọn.',
  });
  const solutions = [
    approved,
    chosenById,
    makeSolution('solution-q-2', 'q-2'),
    makeSolution('solution-q-3', 'q-3'),
    makeSolution('solution-q-4', 'q-4'),
    makeSolution('solution-q-5', 'q-5', { status: 'review' }),
    makeSolution('solution-q-6', 'q-6', { content: '   ' }),
    makeSolution('solution-q-7', 'q-7', { status: undefined }),
  ];
  questions[0].bestSolutionId = chosenById.id;

  const deck = buildSavedRecallDeck(
    questions,
    solutions,
    ['q-7', 'q-1', 'q-1', 'q-2', 'missing', 'q-3', 'q-4', 'q-5', 'q-6'],
  );

  assert.deepEqual(deck.map((entry) => entry.question.id), ['q-7', 'q-1']);
  assert.equal(deck[1].solution, chosenById, 'Lấy lời giải được chọn, không tự dựng đáp án');
  assert.equal(deck[1].solution.content, 'Phương án thực sự được câu hỏi chọn.');
  assert.equal(deck[0].solution, solutions.at(-1), 'Câu trả lời cũ không có status vẫn dùng được');
});

test('QA recall 2. Một câu chỉ đủ điều kiện khi có lời giải gốc đang hoạt động', () => {
  const question = makeQuestion('q-image');
  const imageOnly = makeSolution('image-answer', question.id, {
    content: ' ',
    imageUrl: 'data:image/png;base64,answer',
  });
  assert.deepEqual(buildRecallEntry(question, [imageOnly]), { question, solution: imageOnly });

  assert.equal(
    buildRecallEntry(question, [makeSolution('deleted-answer', question.id, { status: 'deleted' })]),
    null,
  );
  assert.equal(
    buildRecallEntry(question, [makeSolution('unselected-answer', question.id, { isBest: false })]),
    null,
  );
  assert.equal(buildRecallEntry(makeQuestion('blank', { title: ' ' }), [imageOnly]), null);
});

test('QA recall 3. Lời giải mở tuần tự theo dòng gốc, giữ nguyên chữ và ảnh', () => {
  const solution = makeSolution('s-1', 'q-1', {
    content: 'Bước đầu: lập phương trình.\nDòng tiếp theo giữ nguyên.\n\nThay số vào biểu thức.',
    imageUrl: 'https://example.invalid/solution.png',
  });

  assert.deepEqual(splitRecallSolution(solution), [
    { type: 'text', content: 'Bước đầu: lập phương trình.' },
    { type: 'text', content: 'Dòng tiếp theo giữ nguyên.' },
    { type: 'text', content: 'Thay số vào biểu thức.' },
    { type: 'image', url: 'https://example.invalid/solution.png' },
  ]);
  assert.deepEqual(
    splitRecallSolution(makeSolution('image-only', 'q-1', { content: '', imageUrl: ' image.png ' })),
    [{ type: 'image', url: 'image.png' }],
  );
});

test('QA recall 4. Giao diện mở lời giải cộng đồng sau lượt thử và không lưu bản nháp hay kết quả', () => {
  const view = read('src/components/views/QAForumView.tsx');
  const studio = read('src/components/views/QuestionRecallStudio.tsx');
  const css = read('src/components/views/QuestionRecallStudio.css');

  assert.match(view, /buildSavedRecallDeck\(questions, solutions, mySavedIds\)/);
  assert.match(view, /startRecallSession\(savedRecallDeck\)/);
  assert.match(view, /Bắt đầu luyện nhớ/);
  assert.match(view, /React\.lazy\(\(\) => import\('\.\/QuestionRecallStudio'\)\)/);
  assert.match(studio, /Tôi đã thử — mở lời giải/);
  assert.match(studio, /SOẠN BỘ ÔN TẬP/);
  assert.match(studio, /Chỉ chọn kết quả/);
  assert.match(studio, /aria-pressed={isSelected}/);
  assert.match(studio, /không lưu bộ chọn này/);
  assert.match(studio, /splitRecallSolution\(currentEntry\.solution\)/);
  assert.match(studio, /được đánh dấu tốt nhất/i);
  assert.match(studio, /không sinh hay diễn giải lại nội dung trong phiên này/);
  assert.match(studio, /không gửi đi hay lưu lại/);
  assert.match(studio, /aria-modal="true"/);
  assert.match(studio, /event\.key === 'Escape'/);
  assert.doesNotMatch(studio, /localStorage|sessionStorage|sendBeacon|postJson|fetch\(/);
  assert.match(css, /html\.light \.ff-recall-backdrop/);
  assert.match(css, /html\.fabulous-mode \.ff-recall-studio/);
  assert.match(css, /\.ff-recall-deck-builder/);
  assert.match(css, /\.ff-recall-deck-card\.is-selected/);
  assert.match(css, /prefers-reduced-motion/);
});
