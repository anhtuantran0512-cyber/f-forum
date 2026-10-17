/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Bảo mật riêng tư quản trị (yêu cầu Chủ tịch 18/10/2026).
 *
 * Sự cố: giao diện đăng nhập từng có nút "Tài khoản Quản trị viên (BroAmStuck)"
 * tự điền email + mật khẩu mẫu cho bất kỳ ai bấm vào — lộ danh tính và mật khẩu
 * admin ngay trên web công khai. Bộ test này khoá vĩnh viễn:
 *   1. AuthModal không được chứa mật khẩu mẫu, nhãn quảng bá tài khoản admin,
 *      hay prefill email/mật khẩu bằng chuỗi literal.
 *   2. Toàn bộ mã nguồn client không được nhúng mật khẩu mẫu (12345678 / admin123).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const readSource = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const collectClientSources = (dir) => {
  const out = [];
  for (const entry of fs.readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) out.push(...collectClientSources(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
};

test('AuthModal không lộ tài khoản quản trị trên giao diện đăng nhập', () => {
  const source = readSource('src/components/AuthModal.tsx');
  assert.ok(source.includes('auth-panel-login'), 'đang quét đúng form đăng nhập của AuthModal');
  assert.doesNotMatch(source, /\b12345678\b/, 'mật khẩu mẫu không được xuất hiện trong AuthModal');
  assert.doesNotMatch(source, /Tài khoản Quản trị viên/, 'form đăng nhập không được quảng bá tài khoản quản trị');
  assert.doesNotMatch(source, /setLoginEmail\('\S+'\)/, 'không được prefill email đăng nhập bằng chuỗi literal');
  assert.doesNotMatch(source, /setLoginPassword\('\S+'\)/, 'không được prefill mật khẩu bằng chuỗi literal');
});

test('Toàn bộ mã nguồn client không nhúng mật khẩu mẫu công khai', () => {
  const offenders = [];
  for (const file of collectClientSources(path.join(root, 'src'))) {
    const source = fs.readFileSync(file, 'utf8');
    if (/\b12345678\b/.test(source) || /\badmin123\b/.test(source)) {
      offenders.push(path.relative(root, file));
    }
  }
  assert.deepEqual(offenders, [], `không file client nào được chứa mật khẩu mẫu: ${offenders.join(', ')}`);
});
