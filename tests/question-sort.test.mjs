/* Bản quyền trí tuệ thuộc về BroAmStuck */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  DEFAULT_QUESTION_SORT,
  QUESTION_SORT_OPTIONS,
  SAVED_SORT_KEY,
  buildSolutionCounts,
  normalizeSortMode,
  questionTimeOf,
  sortQuestions,
} from '../src/utils/questionSort.ts';

const read = (rel) => fs.readFileSync(path.resolve(rel), 'utf8');

const q = (id, over = {}) => ({ id, createdAtMs: 1000, isSolved: false, ...over });

test('Sắp xếp 1. "Mới nhất" đưa câu hỏi mới hơn lên trước', () => {
  const list = [q('a', { createdAtMs: 100 }), q('b', { createdAtMs: 300 }), q('c', { createdAtMs: 200 })];
  assert.deepEqual(sortQuestions(list, 'newest').map((x) => x.id), ['b', 'c', 'a']);
});

test('Sắp xếp 2. "Thưởng cao" xếp theo bountyCoin giảm dần', () => {
  const list = [
    q('a', { bountyCoin: 10, createdAtMs: 900 }),
    q('b', { bountyCoin: 80, createdAtMs: 100 }),
    q('c', { bountyCoin: 40, createdAtMs: 500 }),
  ];
  assert.deepEqual(sortQuestions(list, 'bounty').map((x) => x.id), ['b', 'c', 'a']);
});

test('Sắp xếp 3. "Sôi nổi" xếp theo số lời giải giảm dần', () => {
  const list = [q('a'), q('b'), q('c')];
  const counts = buildSolutionCounts([
    { questionId: 'a' },
    { questionId: 'c' },
    { questionId: 'c' },
    { questionId: 'c' },
    { questionId: 'b' },
    { questionId: 'b' },
  ]);
  assert.deepEqual(counts, { a: 1, c: 3, b: 2 });
  assert.deepEqual(sortQuestions(list, 'active', counts).map((x) => x.id), ['c', 'b', 'a']);
});

test('Sắp xếp 4. "Chưa có lời giải" đưa câu chưa giải lên trước', () => {
  const list = [
    q('a', { isSolved: true, createdAtMs: 900 }),
    q('b', { isSolved: false, createdAtMs: 100 }),
    q('c', { isSolved: true, createdAtMs: 500 }),
  ];
  const out = sortQuestions(list, 'unsolved').map((x) => x.id);
  assert.equal(out[0], 'b', 'Câu chưa giải phải đứng đầu');
  assert.deepEqual(out.slice(1), ['a', 'c'], 'Nhóm đã giải vẫn giữ mới-nhất-trước');
});

test('Sắp xếp 5. Không sửa mảng gốc (React cần tham chiếu gốc nguyên vẹn)', () => {
  const list = [q('a', { createdAtMs: 100 }), q('b', { createdAtMs: 300 })];
  const before = list.map((x) => x.id).join(',');
  const out = sortQuestions(list, 'newest');
  assert.notEqual(out, list, 'Phải trả mảng MỚI');
  assert.equal(list.map((x) => x.id).join(','), before, 'Mảng gốc không được bị sắp xếp lại');
});

test('Sắp xếp 6. Thiếu createdAtMs thì coi như 0, đẩy về cuối, không ném lỗi', () => {
  /* Viết tường minh, không dùng helper q() — helper mặc định createdAtMs: 1000
     nên sẽ che mất đúng trường hợp "thiếu thời điểm" mà test này nhắm tới. */
  const list = [
    { id: 'a' },
    { id: 'b', createdAtMs: 500 },
    { id: 'c', createdAtMs: undefined },
  ];
  const out = sortQuestions(list, 'newest').map((x) => x.id);
  assert.equal(out[0], 'b', 'Câu có thời điểm hợp lệ lên trước');
  assert.deepEqual(out.slice(1).sort(), ['a', 'c'], 'Hai câu thiếu thời điểm về cuối');
  assert.equal(questionTimeOf({ id: 'x' }), 0);
  assert.equal(questionTimeOf({ id: 'x', createdAtMs: Number.NaN }), 0, 'NaN → 0');
  assert.equal(questionTimeOf({ id: 'x', createdAtMs: -5 }), 0, 'Số âm → 0');
});

test('Sắp xếp 7. Thứ tự ỔN ĐỊNH: cùng điểm thì phá hoà bằng id, không nhảy chỗ giữa các lần render', () => {
  const list = [q('z', { bountyCoin: 50 }), q('m', { bountyCoin: 50 }), q('a', { bountyCoin: 50 })];
  const once = sortQuestions(list, 'bounty').map((x) => x.id);
  const twice = sortQuestions(list, 'bounty').map((x) => x.id);
  assert.deepEqual(once, twice, 'Hai lần sắp xếp phải ra cùng thứ tự');
  assert.deepEqual(once, ['a', 'm', 'z'], 'Phá hoà theo id tăng dần');
});

test('Sắp xếp 8. Chế độ lạ / dữ liệu cũ trong storage rơi về mặc định', () => {
  assert.equal(normalizeSortMode('bounty'), 'bounty');
  assert.equal(normalizeSortMode('  active  '), 'active', 'Bỏ khoảng trắng');
  assert.equal(normalizeSortMode('khong-ton-tai'), DEFAULT_QUESTION_SORT);
  assert.equal(normalizeSortMode(null), DEFAULT_QUESTION_SORT);
  assert.equal(normalizeSortMode(undefined), DEFAULT_QUESTION_SORT);
  assert.equal(normalizeSortMode(''), DEFAULT_QUESTION_SORT);
  assert.equal(DEFAULT_QUESTION_SORT, 'newest');
});

test('Sắp xếp 9. sortQuestions tự chuẩn hoá chế độ lạ, không ném lỗi', () => {
  const list = [q('a', { createdAtMs: 100 }), q('b', { createdAtMs: 300 })];
  assert.deepEqual(
    sortQuestions(list, 'rac-tung-bay').map((x) => x.id),
    ['b', 'a'],
    'Chế độ lạ phải xử sự như mặc định',
  );
});

test('Sắp xếp 10. Mảng rỗng / một phần tử trả về an toàn', () => {
  assert.deepEqual(sortQuestions([], 'newest'), []);
  assert.deepEqual(sortQuestions([q('a')], 'bounty').map((x) => x.id), ['a']);
});

test('Sắp xếp 11. buildSolutionCounts bỏ qua bản ghi thiếu questionId', () => {
  const counts = buildSolutionCounts([
    { questionId: 'a' },
    { questionId: '' },
    { questionId: undefined },
    null,
  ]);
  assert.deepEqual(counts, { a: 1 }, 'Chỉ đếm bản ghi hợp lệ');
});

test('Sắp xếp 12. buildSolutionCounts với đầu vào rỗng', () => {
  assert.deepEqual(buildSolutionCounts([]), {});
});

test('Sắp xếp 13. Danh sách chế độ hiển thị khớp với kiểu được nhận', () => {
  const ids = QUESTION_SORT_OPTIONS.map((o) => o.id);
  assert.deepEqual(ids, ['newest', 'bounty', 'active', 'unsolved']);
  QUESTION_SORT_OPTIONS.forEach((o) => {
    assert.ok(o.label && o.label.length > 0, `Thiếu nhãn cho ${o.id}`);
    assert.ok(o.hint && o.hint.length > 0, `Thiếu gợi ý cho ${o.id}`);
  });
});

test('Sắp xếp 14. QAForumView dùng module sắp xếp, không tự sort trong view', () => {
  const view = read('src/components/views/QAForumView.tsx');
  assert.match(view, /sortQuestions/, 'Phải gọi sortQuestions từ module');
  assert.match(view, /QUESTION_SORT_OPTIONS/, 'Phải dựng menu từ danh sách chế độ');
  assert.match(view, /SAVED_SORT_KEY/, 'Phải nhớ lựa chọn sắp xếp giữa các phiên');
  assert.match(view, /safeStorage/, 'Phải dùng safeStorage, không phải localStorage thô');
});

test('Sắp xếp 15. Module thuần không import gì (giữ test được bằng node)', () => {
  const src = read('src/utils/questionSort.ts');
  assert.doesNotMatch(src, /^import\s/m, 'Không được import gì để node test trực tiếp được');
  assert.equal(SAVED_SORT_KEY, 'fforum_question_sort_v1');
});
