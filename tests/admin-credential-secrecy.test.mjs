/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Bảo mật riêng tư quản trị (yêu cầu Chủ tịch 18/10/2026; bổ sung mã hoá 19/10/2026).
 *
 * Sự cố: giao diện đăng nhập từng có nút "Tài khoản Quản trị viên (BroAmStuck)"
 * tự điền email + mật khẩu mẫu cho bất kỳ ai bấm vào — lộ danh tính và mật khẩu
 * admin ngay trên web công khai. Bộ test này khoá vĩnh viễn:
 *   1. AuthModal không được chứa mật khẩu mẫu, nhãn quảng bá tài khoản admin,
 *      hay prefill email/mật khẩu bằng chuỗi literal.
 *   2. Không file mã nguồn công khai nào được nhúng mật khẩu mẫu dạng nguyên văn.
 *   3. Không file mã nguồn nào viết lại nguyên văn email Super Admin — mọi nơi
 *      phải import từ `shared/identityStrings.ts`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MASTER_ADMIN_EMAIL_LOWER } from '../shared/identityStrings.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const readSource = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

/* Chuỗi ghép tại chỗ để chính tệp test không chứa nguyên văn mật khẩu mẫu. */
const SAMPLE_PASSWORD_PATTERNS = [
  new RegExp('\\b' + ['1234', '5678'].join('') + '\\b'),
  new RegExp('\\b' + ['admin', '123'].join('') + '\\b'),
];
const containsSamplePassword = (source) => SAMPLE_PASSWORD_PATTERNS.some((pattern) => pattern.test(source));

const collectSources = (dir, extensions) => {
  const out = [];
  for (const entry of fs.readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) out.push(...collectSources(full, extensions));
    else if (extensions.test(entry)) out.push(full);
  }
  return out;
};

const CODE_DIRECTORIES = ['src', 'server', 'shared', 'scripts', 'tests'];
const SOURCE_EXTENSIONS = /\.(ts|tsx|mjs|js)$/;
const collectCodeSources = () => CODE_DIRECTORIES.flatMap((dir) => collectSources(path.join(root, dir), SOURCE_EXTENSIONS));

test('AuthModal không lộ tài khoản quản trị trên giao diện đăng nhập', () => {
  const source = readSource('src/components/AuthModal.tsx');
  assert.ok(source.includes('auth-panel-login'), 'đang quét đúng form đăng nhập của AuthModal');
  assert.doesNotMatch(source, SAMPLE_PASSWORD_PATTERNS[0], 'mật khẩu mẫu không được xuất hiện trong AuthModal');
  assert.doesNotMatch(source, /Tài khoản Quản trị viên/, 'form đăng nhập không được quảng bá tài khoản quản trị');
  assert.doesNotMatch(source, /setLoginEmail\('\S+'\)/, 'không được prefill email đăng nhập bằng chuỗi literal');
  assert.doesNotMatch(source, /setLoginPassword\('\S+'\)/, 'không được prefill mật khẩu bằng chuỗi literal');
});

test('Toàn bộ mã nguồn công khai không nhúng mật khẩu mẫu', () => {
  const offenders = collectCodeSources()
    .filter((file) => containsSamplePassword(fs.readFileSync(file, 'utf8')))
    .map((file) => path.relative(root, file));
  assert.deepEqual(offenders, [], `không file nào được chứa mật khẩu mẫu: ${offenders.join(', ')}`);
});

test('Email Super Admin chỉ tồn tại dưới dạng che giấu trong shared/identityStrings.ts', () => {
  const offenders = collectCodeSources()
    .filter((file) => fs.readFileSync(file, 'utf8').toLowerCase().includes(MASTER_ADMIN_EMAIL_LOWER))
    .map((file) => path.relative(root, file));
  assert.deepEqual(offenders, [], `email Super Admin phải import từ shared/identityStrings.ts, không viết nguyên văn trong mã nguồn: ${offenders.join(', ')}`);
});
