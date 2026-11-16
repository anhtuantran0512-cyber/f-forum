import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (relPath) => fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');

test('Phase 23 - 1. Tăng Cường Khoảng Thở Whitespace & Responsive Padding Tại QAForum, Threads & ExamVault', () => {
  const qaTsx = read('src/components/views/QAForumView.tsx');
  const qaCss = read('src/components/views/QAForumView.css');
  const threadsCss = read('src/components/views/ThreadsView.css');
  const examTsx = read('src/components/views/ExamVaultView.tsx');

  assert.ok(
    qaTsx.includes('space-y-4 sm:space-y-5') || qaTsx.includes('space-y-4'),
    'QAForumView phai tang khoang tho giua cac the cau hoi (space-y-4 hoac space-y-4 sm:space-y-5)',
  );
  assert.ok(
    qaCss.includes('clamp(16px, 2.2vw, 24px)'),
    'QAForumView.css phai co optical padding clamp thoai mai cho the cau hoi',
  );

  assert.ok(
    threadsCss.includes('clamp(16px, 2.2vw, 22px)'),
    'ThreadsView.css .thread-feed phai co khoang cach clamp tang cuong khoang tho',
  );

  assert.ok(
    examTsx.includes('gap-4 sm:gap-5 lg:gap-6'),
    'ExamVaultView phai tang khoang tho gap luoi de thi len gap-4 sm:gap-5 lg:gap-6',
  );
  assert.ok(
    examTsx.includes('p-4.5 sm:p-5.5 lg:p-6'),
    'ExamVaultView the de thi phai co optical padding rong rai tren cac man hinh',
  );
});

test('Phase 23 - 2. Chuan Hoa Nhan Sieu Tinh Gon (≤ 3 Tu) & Uu Tien Icon-Only', () => {
  const examTsx = read('src/components/views/ExamVaultView.tsx');
  const threadsTsx = read('src/components/views/ThreadsView.tsx');
  const qaTsx = read('src/components/views/QAForumView.tsx');

  assert.ok(
    examTsx.includes('<span>Thi CBT</span>'),
    'ExamVaultView nut hanh dong chinh phai tinh gon thanh Thi CBT (2 tu)',
  );
  assert.ok(
    examTsx.includes('title="Luyện Thi Ngay · Bắt Đầu Thi CBT"'),
    'ExamVaultView nut Thi CBT phai giu title va aria-label a11y',
  );

  assert.ok(
    threadsTsx.includes('aria-label="Báo cáo vi phạm"'),
    'ThreadsView nut bao cao Icon-Only phai co aria-label day du',
  );

  assert.ok(
    qaTsx.includes('<span>Xem tất cả</span>'),
    'QAForumView nut xem tat ca phai <= 3 tu (Xem tat ca)',
  );
});

test('Phase 23 - 3. Bao Toan 100% 3 Asset 3D Nguyen Ban Va Switcher Thiet Bi Icon-Only', () => {
  const solarHtml = read('public/solar-system-3d.html');
  const solarLines = solarHtml.trim().split('\n');
  assert.equal(solarLines.length, 557, 'solar-system-3d.html phai bao toan dung 557 dong');

  const iphoneHtml = read('public/iphone5-showcase.html');
  assert.ok(iphoneHtml.length > 3000000, 'iphone5-showcase.html phai bao toan day du > 3MB');

  const machiHtml = read('public/machi-mart-3d.html');
  assert.ok(machiHtml.length > 900000, 'machi-mart-3d.html phai bao toan day du > 900KB');

  const hardware = read('src/components/HardwareShowcase.tsx');
  assert.ok(!hardware.includes('<span>iPhone 16 Pro</span>') && hardware.includes('<Smartphone'), 'Nut dien thoai phai la icon-only');
  assert.ok(!hardware.includes('<span>MacBook Pro</span>') && hardware.includes('<Laptop'), 'Nut may tinh phai la icon-only');
});
