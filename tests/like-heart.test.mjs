/* Bản quyền trí tuệ thuộc về BroAmStuck */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  PROFILE_LIKES_KEY,
  isProfileLikedBy,
  parseProfileLikes,
  profileLikeCount,
  profileLikersOf,
  serializeProfileLikes,
  setProfileLike,
  toggleProfileLike,
} from '../src/utils/profileLikes.ts';

const read = (rel) => fs.readFileSync(path.resolve(rel), 'utf8');

test('Tim 1. Một lần thả tim = đúng +1, bấm lặp lại không cộng dồn', () => {
  const profile = 'ban@fpt.edu.vn';
  const viewer = 'toi@fpt.edu.vn';

  let map = {};
  assert.equal(profileLikersOf(map, profile).length, 0, 'Ban đầu chưa có ai thả tim');

  /* Lần 1: thả tim → +1 */
  map = setProfileLike(map, profile, viewer, true);
  assert.equal(profileLikersOf(map, profile).length, 1, 'Thả tim một lần phải là +1');
  assert.equal(isProfileLikedBy(map, profile, viewer), true, 'Trạng thái đã thích');

  /* Sự kiện bắn lặp (label/input, double click…) → KHÔNG được +thêm */
  const again = setProfileLike(map, profile, viewer, true);
  assert.equal(again, map, 'Gọi lại với cùng trạng thái phải trả về chính map cũ (no-op)');
  assert.equal(profileLikersOf(again, profile).length, 1, 'Bấm lặp vẫn chỉ 1 tim, không nhảy 2');

  /* Bỏ tim → −1, và bỏ lặp cũng không trừ thêm */
  map = setProfileLike(map, profile, viewer, false);
  assert.equal(profileLikersOf(map, profile).length, 0, 'Bỏ tim phải là −1');
  assert.equal(setProfileLike(map, profile, viewer, false), map, 'Bỏ lặp phải là no-op');
});

test('Tim 2. Nút đảo trạng thái: mỗi cú bấm đổi đúng một lần', () => {
  const profile = 'an@fpt.edu.vn';
  const viewer = 'toi@fpt.edu.vn';

  let map = {};
  map = toggleProfileLike(map, profile, viewer);
  assert.equal(isProfileLikedBy(map, profile, viewer), true, 'Bấm lần 1 → thích');
  assert.equal(profileLikersOf(map, profile).length, 1, 'Sau 1 cú bấm đúng 1 tim');

  map = toggleProfileLike(map, profile, viewer);
  assert.equal(isProfileLikedBy(map, profile, viewer), false, 'Bấm lần 2 → bỏ');
  assert.equal(profileLikersOf(map, profile).length, 0, 'Sau 2 cú bấm về lại 0');
});

test('Tim 3. Nhiều người thích: mỗi người tính một lần, không trùng lặp', () => {
  const profile = 'lop@fpt.edu.vn';
  let map = {};
  map = setProfileLike(map, profile, 'a@fpt.edu.vn', true);
  map = setProfileLike(map, profile, 'b@fpt.edu.vn', true);
  map = setProfileLike(map, profile, 'A@FPT.EDU.VN', true); /* trùng, khác hoa thường */

  assert.deepEqual(
    profileLikersOf(map, profile).sort(),
    ['a@fpt.edu.vn', 'b@fpt.edu.vn'],
    'Email trùng (khác hoa/thường) chỉ tính một lần',
  );

  /* Số hiển thị = cảm ơn thật + số người thả tim */
  assert.equal(profileLikeCount(10, profileLikersOf(map, profile)), 12, 'Cảm ơn thật + 2 người thả tim');
  assert.equal(profileLikeCount(0, []), 0, 'Chưa có gì thì bằng 0');
  assert.equal(profileLikeCount(5, ['x', 'x', 'y']), 7, 'Danh sách trùng vẫn chỉ tính 2');
});

test('Tim 4. Lưu trữ: đọc/ghi an toàn, bỏ dữ liệu rác, không đổi khoá lưu', () => {
  assert.equal(PROFILE_LIKES_KEY, 'fforum_profile_likes_v1', 'Khoá lưu phải giữ nguyên để không mất dữ liệu cũ');

  assert.deepEqual(parseProfileLikes(null), {}, 'Không có dữ liệu → map rỗng');
  assert.deepEqual(parseProfileLikes('không phải json'), {}, 'JSON hỏng → map rỗng, không ném lỗi');
  assert.deepEqual(parseProfileLikes('[1,2,3]'), {}, 'Mảng → map rỗng');
  assert.deepEqual(
    parseProfileLikes('{"A@FPT.EDU.VN":["ME","me",""],"B":[],"C":"sai"}'),
    { 'a@fpt.edu.vn': ['me'] },
    'Chuẩn hoá chữ thường, bỏ trùng/rỗng và bỏ giá trị không phải mảng',
  );

  const map = { 'z@fpt.edu.vn': ['x@fpt.edu.vn'] };
  assert.deepEqual(parseProfileLikes(serializeProfileLikes(map)), map, 'Ghi rồi đọc lại phải như nhau');

  const heart = read('src/components/LikeHeartButton.tsx');
  const profile = read('src/components/ProfileModal.tsx');
  assert.ok(profile.includes('safeStorage'), 'Likes must go through the safeStorage wrapper');
  assert.ok(!/localStorage\\./.test(profile), 'No raw localStorage access (test #13 rule)');
  assert.ok(profile.includes('parseProfileLikes') && profile.includes('serializeProfileLikes'), 'Profile must reuse the shared parse/serialize helpers');
  assert.ok(heart.includes("aria-pressed={liked}"), 'Heart must expose its state to screen readers');
});
