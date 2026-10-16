import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

test('Q&A exposes edit/delete only to the author or a content moderator', () => {
  const view = read('src/components/views/QAForumView.tsx');
  const server = read('server/forumServer.ts');
  assert.match(view, /const canManageQuestion = \(question: Question \| null \| undefined\) =>\s*canEditContent \|\| isQuestionOwner\(question\)/);
  assert.match(view, /if \(q && canManageQuestion\(q\)\)/);
  assert.match(server, /function questionOwnedBySession[\s\S]*?if \(accountId && authorId\) return authorId === String\(accountId\)/);
  assert.match(server, /case 'EDIT_QUESTION':[\s\S]*?questionOwnedBySession\(target, session\)/);
  assert.match(server, /case 'DELETE_QUESTION':[\s\S]*?questionOwnedBySession\(owned, session\)/);
  assert.match(server, /authorizeQuestionMutation\(req, body, targetQuestion\)/);
});

test('Only moderators get the optional BQT reminder; both edit and delete wait states are guarded', () => {
  const view = read('src/components/views/QAForumView.tsx');
  assert.match(view, /canEditContent && !isQuestionOwner\(questionToEdit\) && \(/);
  assert.match(view, /const mayAddBqtReminder = canEditContent && !isQuestionOwner\(questionToEdit\) && includeBQTReminder/);
  assert.match(view, /disabled=\{isSavingQuestionEdit\}/);
  assert.match(view, /isSavingQuestionEdit \? 'Đang lưu…'/);
  assert.match(view, /if \(!isDeletePending && e\.target === e\.currentTarget\)/);
  assert.match(view, /disabled=\{isDeletePending\}/);
  assert.match(view, /isDeletePending \? 'Đang xóa…'/);
});
