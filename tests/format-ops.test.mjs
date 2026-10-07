/* Bản quyền trí tuệ thuộc về BroAmStuck */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { formatBytes, formatUptime, limiterLoadLevel } from '../src/utils/formatOps.ts';

const read = (rel) => fs.readFileSync(path.resolve(rel), 'utf8');

test('Định dạng 1. formatBytes đổi đơn vị đúng bậc', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(6199), '6.1 KB');
  assert.equal(formatBytes(1023), '1023 B', 'Dưới 1 KB vẫn giữ B');
  assert.equal(formatBytes(1024), '1.0 KB', 'Đúng 1 KB');
  assert.equal(formatBytes(1024 * 1024), '1.00 MB');
  assert.equal(formatBytes(5 * 1024 * 1024 + 512 * 1024), '5.50 MB');
  assert.equal(formatBytes(1024 * 1024 * 1024), '1.00 GB');
});

test('Định dạng 2. formatBytes chịu được dữ liệu rác, không ném lỗi', () => {
  assert.equal(formatBytes(Number.NaN), '—');
  assert.equal(formatBytes(Number.POSITIVE_INFINITY), '—');
  assert.equal(formatBytes(-100), '—', 'Số âm vô nghĩa → dấu gạch');
  assert.equal(formatBytes(undefined), '—', 'undefined → dấu gạch');
  assert.equal(formatBytes(null), '—', 'null → dấu gạch');
  assert.equal(formatBytes('1024'), '1.0 KB', 'Chuỗi số vẫn đổi được');
});

test('Định dạng 3. formatUptime ra đơn vị lớn nhất có nghĩa', () => {
  assert.equal(formatUptime(0), '0 phút 0 giây');
  assert.equal(formatUptime(59), '0 phút 59 giây');
  assert.equal(formatUptime(90), '1 phút 30 giây');
  assert.equal(formatUptime(3600), '1 giờ 0 phút');
  assert.equal(formatUptime(3600 + 1800), '1 giờ 30 phút');
  assert.equal(formatUptime(86400), '1 ngày 0 giờ');
  assert.equal(formatUptime(86400 * 2 + 3600 * 3), '2 ngày 3 giờ');
});

test('Định dạng 4. formatUptime không in ra giây âm hay NaN', () => {
  assert.equal(formatUptime(-500), '—');
  assert.equal(formatUptime(Number.NaN), '—');
  assert.equal(formatUptime(undefined), '—');
  assert.equal(formatUptime(190000), '2 ngày 4 giờ', 'Không in "190000 giây"');
});

test('Định dạng 5. limiterLoadLevel phân biệt im ắng / bận / nóng', () => {
  assert.equal(limiterLoadLevel(0, 0), 'calm', 'Không ai bị chặn → im ắng');
  assert.equal(limiterLoadLevel(0, 50), 'calm', 'Có theo dõi nhưng chưa chặn ai');
  assert.equal(limiterLoadLevel(1, 10), 'busy', 'Chặn ít hơn nửa → bận');
  assert.equal(limiterLoadLevel(5, 10), 'hot', 'Chặn đúng nửa → nóng');
  assert.equal(limiterLoadLevel(9, 10), 'hot', 'Chặn gần hết → nóng');
  assert.equal(limiterLoadLevel(3, 0), 'hot', 'Bị chặn mà không đếm được nguồn → nóng');
});

test('Định dạng 6. limiterLoadLevel chịu được dữ liệu rác', () => {
  assert.equal(limiterLoadLevel(Number.NaN, Number.NaN), 'calm');
  assert.equal(limiterLoadLevel(-5, 10), 'calm', 'Số âm bị kẹp về 0');
  assert.equal(limiterLoadLevel(undefined, undefined), 'calm');
});

test('Định dạng 7. Module thuần không import gì (giữ test được bằng node)', () => {
  const src = read('src/utils/formatOps.ts');
  assert.doesNotMatch(src, /^import\s/m, 'Không được import gì để node test trực tiếp được');
});

test('Định dạng 8. AdminConsoleModal nhập từ module, không tự định nghĩa lại', () => {
  const view = read('src/components/AdminConsoleModal.tsx');
  assert.match(view, /from '..\/utils\/formatOps'/, 'Phải nhập từ utils/formatOps');
  assert.doesNotMatch(
    view,
    /export const formatBytes/,
    'Không được định nghĩa formatBytes ngay trong tệp component — sẽ phá Fast Refresh',
  );
  assert.doesNotMatch(
    view,
    /export const formatUptime/,
    'Không được định nghĩa formatUptime ngay trong tệp component',
  );
});
