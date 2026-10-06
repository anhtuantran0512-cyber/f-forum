/* Bản quyền trí tuệ thuộc về BroAmStuck */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  MODERATION_ACTIONS,
  MODERATION_DURATIONS_MIN,
  MODERATION_MAX_REASON,
  applyModerationAction,
  isUntilActive,
  moderationStatusOf,
  normalizeModerationKey,
  normalizeModerationReason,
  parseModerationMap,
  pruneModeration,
} from '../server/moderation.ts';

const read = (rel) => fs.readFileSync(path.resolve(rel), 'utf8');
const NOW = 1_700_000_000_000;

test('Quản lý 1. isUntilActive: 0 là VĨNH VIỄN, không phải "đã hết hạn"', () => {
  /* Đây là bẫy dễ chết nhất: nếu so `until > now` thì 0 (vĩnh viễn) sẽ bị coi
     là hết hạn ngay lập tức vì 0 không lớn hơn now. */
  assert.equal(isUntilActive(0, NOW), true, '0 = cấm vĩnh viễn, phải còn hiệu lực');
  assert.equal(isUntilActive(NOW + 60000, NOW), true, 'mốc tương lai còn hiệu lực');
  assert.equal(isUntilActive(NOW - 1, NOW), false, 'mốc quá khứ đã hết');
  assert.equal(isUntilActive(undefined, NOW), false, 'undefined = không bị áp chế');
  assert.equal(isUntilActive(null, NOW), false, 'null = không bị áp chế');
  assert.equal(isUntilActive(Number.NaN, NOW), false, 'NaN không được coi là vĩnh viễn');
});

test('Quản lý 2. Cấm có thời hạn rồi tự hết hiệu lực khi qua mốc', () => {
  const r = applyModerationAction({}, 'nguoi@x.vn', 'ban', { durationMinutes: 15, now: NOW });
  assert.equal(r.changed, true);
  assert.equal(r.record.bannedUntil, NOW + 15 * 60 * 1000);

  const before = moderationStatusOf(r.next, 'nguoi@x.vn', NOW + 1000);
  assert.equal(before.banned, true, 'trong thời hạn phải bị cấm');

  const after = moderationStatusOf(r.next, 'nguoi@x.vn', NOW + 16 * 60 * 1000);
  assert.equal(after.banned, false, 'qua mốc phải tự hết cấm, không cần admin gỡ');
});

test('Quản lý 3. Cấm vĩnh viễn không tự hết hạn', () => {
  const r = applyModerationAction({}, 'a@x.vn', 'ban', { durationMinutes: 0, now: NOW });
  assert.equal(r.record.bannedUntil, 0);
  const far = moderationStatusOf(r.next, 'a@x.vn', NOW + 1000 * 60 * 60 * 24 * 365 * 10);
  assert.equal(far.banned, true, 'cấm vĩnh viễn phải còn hiệu lực sau 10 năm');
});

test('Quản lý 4. durationMinutes rác (NaN/âm) rơi về vĩnh viễn, không ném lỗi', () => {
  for (const bad of [Number.NaN, -5, undefined, null]) {
    const r = applyModerationAction({}, 'a@x.vn', 'ban', { durationMinutes: bad, now: NOW });
    assert.equal(r.record.bannedUntil, 0, `durationMinutes=${bad} phải thành vĩnh viễn`);
  }
});

test('Quản lý 5. Cấm và khoá gửi tin độc lập với nhau', () => {
  let map = {};
  map = applyModerationAction(map, 'a@x.vn', 'mute', { durationMinutes: 60, now: NOW }).next;
  let st = moderationStatusOf(map, 'a@x.vn', NOW);
  assert.equal(st.muted, true, 'bị khoá gửi tin');
  assert.equal(st.banned, false, 'nhưng KHÔNG bị cấm hoàn toàn');

  map = applyModerationAction(map, 'a@x.vn', 'ban', { durationMinutes: 60, now: NOW }).next;
  st = moderationStatusOf(map, 'a@x.vn', NOW);
  assert.equal(st.muted && st.banned, true, 'cả hai cùng lúc');

  map = applyModerationAction(map, 'a@x.vn', 'unmute', { now: NOW }).next;
  st = moderationStatusOf(map, 'a@x.vn', NOW);
  assert.equal(st.muted, false, 'gỡ khoá gửi tin');
  assert.equal(st.banned, true, 'lệnh cấm vẫn còn nguyên');
});

test('Quản lý 6. Cùng yêu cầu bấm lặp là no-op; đổi thời hạn thì là quyết định mới', () => {
  const first = applyModerationAction({}, 'a@x.vn', 'ban', {
    durationMinutes: 60, reason: 'Spam', by: 'admin@x.vn', now: NOW,
  });
  assert.equal(first.changed, true);

  const duplicate = applyModerationAction(first.next, 'a@x.vn', 'ban', {
    durationMinutes: 60, reason: 'Spam', by: 'admin@x.vn', now: NOW,
  });
  assert.equal(duplicate.changed, false, 'cùng yêu cầu phải là no-op');
  assert.equal(duplicate.next, first.next, 'trả nguyên map, cùng tham chiếu');

  const extension = applyModerationAction(first.next, 'a@x.vn', 'ban', {
    durationMinutes: 1440, reason: 'Spam', by: 'admin@x.vn', now: NOW,
  });
  assert.equal(extension.changed, true, 'đổi thời hạn là quyết định mới');
  assert.equal(extension.record.bannedUntil, NOW + 1440 * 60 * 1000);

  /* Gỡ hai lần: lần hai phải là no-op. */
  const un1 = applyModerationAction(extension.next, 'a@x.vn', 'unban', { now: NOW });
  assert.equal(un1.changed, true);
  const un2 = applyModerationAction(un1.next, 'a@x.vn', 'unban', { now: NOW });
  assert.equal(un2.changed, false, 'gỡ lần hai phải là no-op');
  assert.equal(un2.next, un1.next, 'trả nguyên map, cùng tham chiếu');
});

test('Quản lý 7. Bất biến — không sửa map cũ', () => {
  const before = applyModerationAction({}, 'a@x.vn', 'ban', { now: NOW }).next;
  const frozen = JSON.stringify(before);
  applyModerationAction(before, 'b@x.vn', 'ban', { now: NOW });
  assert.equal(JSON.stringify(before), frozen, 'map cũ không được bị sửa tại chỗ');
});

test('Quản lý 8. Thiếu email hoặc hành động lạ thì trả nguyên map', () => {
  const base = applyModerationAction({}, 'a@x.vn', 'ban', { now: NOW }).next;
  assert.equal(applyModerationAction(base, '', 'ban', { now: NOW }).next, base, 'thiếu email');
  assert.equal(applyModerationAction(base, null, 'ban', { now: NOW }).next, base, 'email null');
  assert.equal(applyModerationAction(base, 'a@x.vn', 'khoa-tai-khoan', { now: NOW }).next, base, 'hành động lạ');
  assert.deepEqual(applyModerationAction(base, 'a@x.vn', 'khoa-tai-khoan', { now: NOW }).record, null);
});

test('Quản lý 9. Chuẩn hoá khoá email: không phân biệt hoa/thường và khoảng trắng', () => {
  const r = applyModerationAction({}, '  NguoiDung@FPT.edu.vn  ', 'ban', { now: NOW });
  /* 'NguoiDung' viết thường là 'nguoidung' — tra đúng khoá đã chuẩn hoá. */
  assert.deepEqual(Object.keys(r.next), ['nguoidung@fpt.edu.vn'], 'khoá lưu đã được chuẩn hoá');
  assert.equal(moderationStatusOf(r.next, 'nguoidung@fpt.edu.vn', NOW).banned, true);
  assert.equal(moderationStatusOf(r.next, '  NGUOIDUNG@FPT.EDU.VN  ', NOW).banned, true, 'tra kiểu nào cũng ra');
  assert.equal(normalizeModerationKey('  A@B.VN '), 'a@b.vn');
  assert.equal(normalizeModerationKey(null), '');
  assert.equal(normalizeModerationKey(undefined), '');
});

test('Quản lý 10. Lý do bị cắt về trần, không để chuỗi dài vô hạn vào store', () => {
  const long = 'x'.repeat(MODERATION_MAX_REASON + 300);
  assert.equal(normalizeModerationReason(long).length, MODERATION_MAX_REASON);
  assert.equal(normalizeModerationReason('  có khoảng trắng  '), 'có khoảng trắng');
  assert.equal(normalizeModerationReason(null), '');
  const r = applyModerationAction({}, 'a@x.vn', 'ban', { reason: long, now: NOW });
  assert.equal(r.record.reason.length, MODERATION_MAX_REASON);
});

test('Quản lý 11. Ghi lại ai ra quyết định và khi nào (truy vết)', () => {
  const r = applyModerationAction({}, 'a@x.vn', 'ban', {
    reason: 'Gây war trong phòng chat',
    by: 'Admin@FPT.edu.vn',
    now: NOW,
  });
  assert.equal(r.record.by, 'admin@fpt.edu.vn', 'email quản trị được chuẩn hoá');
  assert.equal(r.record.at, NOW);
  assert.equal(r.record.reason, 'Gây war trong phòng chat');
});

test('Quản lý 12. prune dọn bản ghi hết hạn để tệp dữ liệu không phình', () => {
  let map = applyModerationAction({}, 'tam@x.vn', 'ban', { durationMinutes: 10, now: NOW }).next;
  map = applyModerationAction(map, 'vinhvien@x.vn', 'ban', { durationMinutes: 0, now: NOW }).next;
  assert.equal(Object.keys(map).length, 2);

  const later = NOW + 11 * 60 * 1000;
  const pruned = pruneModeration(map, later);
  assert.deepEqual(Object.keys(pruned), ['vinhvien@x.vn'], 'chỉ giữ cấm vĩnh viễn');
});

test('Quản lý 13. prune không đổi gì thì trả nguyên map (tránh ghi đĩa vô ích)', () => {
  const map = applyModerationAction({}, 'a@x.vn', 'ban', { durationMinutes: 0, now: NOW }).next;
  assert.equal(pruneModeration(map, NOW), map, 'cùng tham chiếu');
});

test('Quản lý 14. parseModerationMap bỏ dữ liệu rác từ đĩa', () => {
  assert.deepEqual(parseModerationMap(null), {});
  assert.deepEqual(parseModerationMap(undefined), {});
  assert.deepEqual(parseModerationMap([1, 2]), {}, 'mảng ở gốc → rỗng');
  assert.deepEqual(parseModerationMap('chuoi'), {});
  assert.deepEqual(parseModerationMap({ '': { bannedUntil: 0 } }), {}, 'khoá rỗng bị loại');
  assert.deepEqual(parseModerationMap({ 'a@x.vn': 'khong-phai-object' }), {});
  assert.deepEqual(parseModerationMap({ 'a@x.vn': {} }), {}, 'bản ghi rỗng bị loại');
  assert.deepEqual(
    parseModerationMap({ 'a@x.vn': { bannedUntil: 'khong-phai-so' } }),
    {},
    'bannedUntil không phải số bị loại',
  );
  const ok = parseModerationMap({ ' A@X.VN ': { bannedUntil: 0, reason: 'x'.repeat(900), at: 5 } });
  assert.deepEqual(Object.keys(ok), ['a@x.vn'], 'khoá được chuẩn hoá');
  assert.equal(ok['a@x.vn'].reason.length, MODERATION_MAX_REASON, 'lý do bị cắt');
  assert.equal(ok['a@x.vn'].at, 5);
});

test('Quản lý 15. Danh sách hành động và thời hạn khớp UI', () => {
  assert.deepEqual(MODERATION_ACTIONS, ['ban', 'mute', 'unban', 'unmute']);
  assert.ok(MODERATION_DURATIONS_MIN.includes(0), 'phải có lựa chọn vĩnh viễn');
  MODERATION_DURATIONS_MIN.forEach((m) => assert.ok(m >= 0, 'thời hạn không được âm'));
});

test('Quản lý 16. forumServer phải thực thi ở CẢ HAI transport', () => {
  /*
    Bài học đã trả giá hai lần trong dự án này (defect 34 và 37): một đột biến có
    hai đường HTTP và WebSocket, vá một đường thì đường kia vẫn hở. Test này chốt
    lại rằng việc thực thi cấm/khoá phải xuất hiện ở cả hai, và dùng đúng helper
    tập trung thay vì mỗi nơi tự chế một phép so thời gian.
  */
  const server = read('server/forumServer.ts');
  assert.match(server, /from '\.\/moderation\.ts'/, 'phải nhập module moderation');

  /*
    Điểm thực thi là checkCanPost (bọc moderationStatusOf bên trong), nên đếm số
    lời gọi checkCanPost chứ không phải moderationStatusOf. Có 5 đường ghi HTTP
    (chat, questions, solutions, clubs, clubs/posts) + 1 khối nằm TRƯỚC switch của
    WebSocket phủ cả 5 case WS = 6 chỗ gọi, cộng 1 dòng định nghĩa hàm.
  */
  const gateHits = (server.match(/checkCanPost\(/g) || []).length;
  assert.ok(
    gateHits >= 7,
    `phải kiểm tra áp chế ở mọi đường ghi HTTP + WS (kỳ vọng >= 7 gồm định nghĩa), thực tế ${gateHits}`,
  );

  /* Chốt cả hai transport đều có mặt, không chỉ HTTP. */
  const httpPaths = ['/api/chat', '/api/questions', '/api/solutions', '/api/clubs', '/api/clubs/posts'];
  httpPaths.forEach((pathName) => {
    assert.ok(server.includes(pathName), `thiếu endpoint ${pathName}`);
  });
  const wsActions = ['NEW_CHAT_MESSAGE', 'NEW_QUESTION', 'NEW_SOLUTION', 'NEW_CLUB', 'NEW_CLUB_POST'];
  wsActions.forEach((a) => {
    assert.ok(server.includes(`'${a}'`), `thiếu hành động WS ${a}`);
  });
  /* Khối WS_WRITE_ACTIONS phải nằm trước switch để một check phủ cả năm. */
  const wsBlockIdx = server.indexOf('WS_WRITE_ACTIONS');
  const switchIdx = server.indexOf('switch (type)');
  assert.ok(wsBlockIdx > 0 && switchIdx > 0 && wsBlockIdx < switchIdx,
    'khối kiểm tra WS phải nằm TRƯỚC switch');
});
