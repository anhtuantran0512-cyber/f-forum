/* Bản quyền trí tuệ thuộc về BroAmStuck */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  MAX_SAVED_QUESTIONS,
  SAVED_QUESTIONS_KEY,
  isQuestionSaved,
  parseSavedQuestions,
  pruneSavedQuestions,
  savedIdsOf,
  serializeSavedQuestions,
  toggleSavedQuestion,
} from '../src/utils/savedQuestions.ts';

const read = (rel) => fs.readFileSync(path.resolve(rel), 'utf8');

test('Lưu câu hỏi 1. Lưu/bỏ lưu là idempotent — bấm lặp không tạo bản ghi trùng', () => {
  const owner = 'toi@fpt.edu.vn';
  let map = {};

  assert.deepEqual(savedIdsOf(map, owner), [], 'Ban đầu chưa lưu gì');

  /* Lần 1: lưu → có đúng 1 mục */
  map = toggleSavedQuestion(map, owner, 'q-1', true);
  assert.deepEqual(savedIdsOf(map, owner), ['q-1'], 'Lưu một lần phải cho đúng 1 mục');
  assert.equal(isQuestionSaved(map, owner, 'q-1'), true, 'Trạng thái đã lưu');

  /* Lần 2 và 3: bấm lại vẫn là "muốn lưu" → KHÔNG được cộng dồn */
  map = toggleSavedQuestion(map, owner, 'q-1', true);
  map = toggleSavedQuestion(map, owner, 'q-1', true);
  assert.equal(savedIdsOf(map, owner).length, 1, 'Bấm lặp lại không được tạo bản ghi trùng');
});

test('Lưu câu hỏi 2. Khoá email không phân biệt hoa/thường và khoảng trắng', () => {
  let map = toggleSavedQuestion({}, '  Toi@FPT.edu.vn  ', 'q-1', true);
  assert.equal(isQuestionSaved(map, 'toi@fpt.edu.vn', 'q-1'), true, 'Chuẩn hoá khoá chủ sở hữu');

  map = toggleSavedQuestion(map, 'TOI@FPT.EDU.VN', ' q-2 ', true);
  assert.equal(
    savedIdsOf(map, 'toi@fpt.edu.vn').includes('q-2'),
    true,
    'Chuẩn hoá cả mã câu hỏi (bỏ khoảng trắng)',
  );
});

test('Lưu câu hỏi 3. Mục mới lưu nhất phải đứng ĐẦU danh sách', () => {
  let map = {};
  map = toggleSavedQuestion(map, 'a@x.vn', 'q-1', true);
  map = toggleSavedQuestion(map, 'a@x.vn', 'q-2', true);
  map = toggleSavedQuestion(map, 'a@x.vn', 'q-3', true);
  assert.deepEqual(savedIdsOf(map, 'a@x.vn'), ['q-3', 'q-2', 'q-1'], 'Mới nhất đứng đầu');
});

test('Lưu câu hỏi 4. Bỏ lưu mục cuối thì xoá hẳn khoá, không để mảng rỗng', () => {
  let map = toggleSavedQuestion({}, 'a@x.vn', 'q-1', true);
  map = toggleSavedQuestion(map, 'a@x.vn', 'q-1', false);
  assert.deepEqual(savedIdsOf(map, 'a@x.vn'), [], 'Không còn mục nào');
  assert.equal(
    Object.prototype.hasOwnProperty.call(map, 'a@x.vn'),
    false,
    'Khoá phải bị xoá chứ không để lại mảng rỗng trong storage',
  );
  assert.equal(serializeSavedQuestions(map), '{}', 'Serialize ra object rỗng');
});

test('Lưu câu hỏi 5. Thiếu chủ sở hữu hoặc mã câu hỏi thì trả nguyên map, không tạo khoá rác', () => {
  const base = toggleSavedQuestion({}, 'a@x.vn', 'q-1', true);

  assert.equal(
    toggleSavedQuestion(base, '', 'q-2', true),
    base,
    'Thiếu chủ sở hữu → trả nguyên map (cùng tham chiếu)',
  );
  assert.equal(
    toggleSavedQuestion(base, 'a@x.vn', '', true),
    base,
    'Thiếu mã câu hỏi → trả nguyên map',
  );
  assert.deepEqual(savedIdsOf(base, ''), [], 'Khoá rỗng không đọc ra gì');
  assert.equal(isQuestionSaved(base, 'a@x.vn', ''), false, 'Mã rỗng không bao giờ là đã lưu');
});

test('Lưu câu hỏi 6. Bất biến — không sửa map cũ để React thấy tham chiếu đổi', () => {
  const before = toggleSavedQuestion({}, 'a@x.vn', 'q-1', true);
  const frozen = JSON.stringify(before);
  const after = toggleSavedQuestion(before, 'a@x.vn', 'q-2', true);

  assert.notEqual(after, before, 'Phải trả tham chiếu MỚI');
  assert.equal(JSON.stringify(before), frozen, 'Map cũ không được bị sửa tại chỗ');
});

test('Lưu câu hỏi 7. Cắt về trần, không để localStorage phình vô hạn', () => {
  let map = {};
  for (let i = 0; i < MAX_SAVED_QUESTIONS + 60; i += 1) {
    map = toggleSavedQuestion(map, 'a@x.vn', `q-${i}`, true);
  }
  assert.equal(
    savedIdsOf(map, 'a@x.vn').length,
    MAX_SAVED_QUESTIONS,
    `Không được vượt trần ${MAX_SAVED_QUESTIONS}`,
  );
  assert.equal(
    savedIdsOf(map, 'a@x.vn')[0],
    `q-${MAX_SAVED_QUESTIONS + 59}`,
    'Mục mới nhất vẫn phải được giữ',
  );
});

test('Lưu câu hỏi 8. Mỗi người dùng một danh sách riêng, không lẫn nhau', () => {
  let map = {};
  map = toggleSavedQuestion(map, 'a@x.vn', 'q-1', true);
  map = toggleSavedQuestion(map, 'b@x.vn', 'q-2', true);

  assert.deepEqual(savedIdsOf(map, 'a@x.vn'), ['q-1']);
  assert.deepEqual(savedIdsOf(map, 'b@x.vn'), ['q-2']);
  assert.equal(isQuestionSaved(map, 'a@x.vn', 'q-2'), false, 'A không thấy mục của B');
});

test('Lưu câu hỏi 9. Dữ liệu rác trong storage bị bỏ qua, không làm vỡ trang', () => {
  assert.deepEqual(parseSavedQuestions(null), {}, 'null → rỗng');
  assert.deepEqual(parseSavedQuestions(''), {}, 'chuỗi rỗng → rỗng');
  assert.deepEqual(parseSavedQuestions('{"a":['), {}, 'JSON cắt cụt → rỗng, không ném lỗi');
  assert.deepEqual(parseSavedQuestions('[1,2,3]'), {}, 'mảng ở gốc → rỗng');
  assert.deepEqual(parseSavedQuestions('"chuoi"'), {}, 'chuỗi ở gốc → rỗng');
  assert.deepEqual(parseSavedQuestions('{"":"q"}'), {}, 'khoá rỗng bị loại');
  assert.deepEqual(parseSavedQuestions('{"a":"khong-phai-mang"}'), {}, 'giá trị không phải mảng bị loại');
});

test('Lưu câu hỏi 10. parse(serialize(x)) === x (vòng tròn khép kín)', () => {
  let map = {};
  map = toggleSavedQuestion(map, 'a@x.vn', 'q-1', true);
  map = toggleSavedQuestion(map, 'b@x.vn', 'q-2', true);
  map = toggleSavedQuestion(map, 'a@x.vn', 'q-3', true);

  assert.deepEqual(parseSavedQuestions(serializeSavedQuestions(map)), map);
});

test('Lưu câu hỏi 11. Dọn các mục trỏ tới câu hỏi đã bị xoá', () => {
  let map = {};
  map = toggleSavedQuestion(map, 'a@x.vn', 'q-1', true);
  map = toggleSavedQuestion(map, 'a@x.vn', 'q-dead', true);
  map = toggleSavedQuestion(map, 'b@x.vn', 'q-dead', true);

  const pruned = pruneSavedQuestions(map, ['q-1']);
  assert.deepEqual(savedIdsOf(pruned, 'a@x.vn'), ['q-1'], 'Giữ mục còn sống');
  assert.equal(
    Object.prototype.hasOwnProperty.call(pruned, 'b@x.vn'),
    false,
    'Người chỉ lưu câu đã xoá thì mất hẳn khoá',
  );
});

test('Lưu câu hỏi 12. prune không đổi gì thì trả nguyên map (tránh ghi storage vô ích)', () => {
  const map = toggleSavedQuestion({}, 'a@x.vn', 'q-1', true);
  assert.equal(pruneSavedQuestions(map, ['q-1']), map, 'Cùng tham chiếu khi không có gì để dọn');
});

test('Lưu câu hỏi 13. QAForumView phải dùng safeStorage, không chạm localStorage thô', () => {
  const view = read('src/components/views/QAForumView.tsx');
  assert.match(view, /savedQuestions/i, 'QAForumView có tích hợp lưu câu hỏi');
  assert.doesNotMatch(view, /\blocalStorage\./, 'Không được dùng localStorage trực tiếp');
});

test('Lưu câu hỏi 14. Khoá storage là hằng số được xuất, không rải rác chuỗi thô', () => {
  assert.equal(SAVED_QUESTIONS_KEY, 'fforum_saved_questions_v1');
  const view = read('src/components/views/QAForumView.tsx');
  assert.match(view, /SAVED_QUESTIONS_KEY/, 'Nhập khoá từ module, không hard-code chuỗi');
  assert.doesNotMatch(view, /['"]fforum_saved_questions_v1['"]/, 'Không hard-code khoá trong view');
});

test('Lưu câu hỏi 15. Module thuần không import gì (giữ test được bằng node)', () => {
  const src = read('src/utils/savedQuestions.ts');
  assert.doesNotMatch(src, /^import\s/m, 'Không được import gì để node test trực tiếp được');
});

test('Lưu câu hỏi 16. Bảng lệnh có lối vào "Câu hỏi đã lưu" phát đúng sự kiện', () => {
  const app = read('src/App.tsx');
  assert.match(app, /id: 'act-saved-questions'/, 'Có lệnh trong bảng lệnh');
  assert.match(
    app,
    /fforum_show_saved_questions/,
    'Lệnh phải phát sự kiện fforum_show_saved_questions',
  );
  assert.match(app, /handleViewChange\('qa'\)/, 'Lệnh phải chuyển sang phân khu Hỏi đáp trước');

  const view = read('src/components/views/QAForumView.tsx');
  assert.match(
    view,
    /addEventListener\('fforum_show_saved_questions'/,
    'QAForumView phải lắng nghe sự kiện đó',
  );
});

test('Lưu câu hỏi 17. Không dùng .push() để dựng lệnh bảng lệnh (React Compiler)', () => {
  /*
    actionCommands.push(...) trong lúc render khiến React Compiler bỏ tối ưu cả
    component và phát cảnh báo react(refs). Dựng mảng bất biến bằng spread thay vì
    đột biến. Test này chốt lại để không ai đưa .push() quay trở lại.
  */
  const app = read('src/App.tsx');
  assert.doesNotMatch(app, /actionCommands\.push\(/, 'Không được đột biến actionCommands');
});
