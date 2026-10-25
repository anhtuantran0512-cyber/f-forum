import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

test('Phase 21 - 1. Chuyen Nut Thiet Bi Sang Icon-Only (Smartphone & Laptop)', () => {
  const hardware = read('src/components/HardwareShowcase.tsx');

  assert.ok(
    !hardware.includes('<span>iPhone 16 Pro</span>'),
    'HardwareShowcase khong duoc chua nhan text iPhone 16 Pro',
  );
  assert.ok(
    !hardware.includes('<span>MacBook Pro</span>'),
    'HardwareShowcase khong duoc chua nhan text MacBook Pro',
  );
  assert.ok(
    hardware.includes('<Smartphone className="w-5 h-5" />') || hardware.includes('<Smartphone className="w-4 h-4" />'),
    'HardwareShowcase phai co icon Smartphone cho nut dien thoai',
  );
  assert.ok(
    hardware.includes('<Laptop className="w-5 h-5" />') || hardware.includes('<Laptop className="w-4 h-4" />'),
    'HardwareShowcase phai co icon Laptop cho nut may tinh',
  );
  assert.ok(
    hardware.includes('title="Điện Thoại (iPhone 16 Pro)"') && hardware.includes('aria-label="Điện Thoại (iPhone 16 Pro)"'),
    'HardwareShowcase phai giu title va aria-label de dam bao tieu chuan tiep can a11y',
  );
  assert.ok(
    hardware.includes('title="Máy Tính (MacBook Pro)"') && hardware.includes('aria-label="Máy Tính (MacBook Pro)"'),
    'HardwareShowcase phai giu title va aria-label may tinh cho a11y',
  );
});

test('Phase 21 - 2. Loai Bo Vien Trang Ben Ngoai iPhone Va Iframe Embed Mode Transparent', () => {
  const hardware = read('src/components/HardwareShowcase.tsx');
  const iphoneHtml = read('public/iphone5-showcase.html');

  assert.ok(
    hardware.includes("style={{ background: 'transparent', colorScheme: 'dark' }}"),
    'Iframe trong HardwareShowcase phai co style background transparent va colorScheme dark',
  );
  assert.ok(
    hardware.includes('bg-transparent') && hardware.includes('border-0') && hardware.includes('outline-none'),
    'Iframe va container phai co style borderless khong co vien trang',
  );
  assert.ok(
    iphoneHtml.includes('color-scheme: dark !important;'),
    'public/iphone5-showcase.html phai cau hinh color-scheme dark cho embed-mode',
  );
  assert.ok(
    iphoneHtml.includes('background: transparent !important;') && iphoneHtml.includes('background-color: transparent !important;'),
    'public/iphone5-showcase.html phai co background transparent hoan toan cho body va html',
  );
  assert.ok(
    iphoneHtml.includes('body.embed-mode .iphone-shell'),
    'public/iphone5-showcase.html phai co override shadow khong co vien trang cho iphone-shell',
  );
});
