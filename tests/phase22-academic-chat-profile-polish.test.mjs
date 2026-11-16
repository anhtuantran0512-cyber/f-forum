import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (relPath) => fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');

test('Phase 22 - 1. Phong Dam Thoai Hoc Thuat Lazi: 4 Nut Goi Y Nhanh & Thanh Ky Hieu Toan Khoa Hoc', () => {
  const chatView = read('src/components/views/ChatView.tsx');
  const chatDock = read('src/components/ChatDock.tsx');

  const requiredShortcuts = [
    'Giải chi tiết',
    'Tóm tắt bước',
    'Công thức nhanh',
    'Cách giải khác',
  ];

  const requiredSymbols = ['√', 'π', '∑', '∫', 'Δ', '±', '∞', '→'];

  for (const [name, content] of [['ChatView', chatView], ['ChatDock', chatDock]]) {
    for (const shortcut of requiredShortcuts) {
      assert.ok(
        content.includes(`<span>${shortcut}</span>`),
        `${name} phai co nut goi y hoc thuat: <span>${shortcut}</span>`,
      );
      const wordCount = shortcut.trim().split(/\s+/).length;
      assert.ok(wordCount <= 3, `Nhan "${shortcut}" phai <= 3 tu`);
    }

    for (const sym of requiredSymbols) {
      assert.ok(
        content.includes(`'${sym}'`) || content.includes(`"${sym}"`),
        `${name} phai co ky hieu toan/khoa hoc ${sym} trong thanh cong cu`,
      );
    }
  }
});

test('Phase 22 - 2. Triet Tieu Hieu Ung Hover Giut Lun / Co Nho Tren Ho So & Chuyen Action Buttons Sang Icon-Only', () => {
  const profileModal = read('src/components/ProfileModal.tsx');
  const profileCss = read('src/components/ProfileSignature.css');

  assert.ok(
    !profileCss.includes('transform:translateY(-2px)'),
    'ProfileSignature.css khong duoc co transform:translateY(-2px) tren stat cards',
  );
  assert.ok(
    !profileCss.includes('transform: translateY(-1px)'),
    'ProfileSignature.css khong duoc co translateY(-1px) tren hover profile items',
  );
  assert.ok(
    !profileModal.includes('active:scale-95 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-[0_4px_16px_rgba(245,158,11,0.4)]'),
    'ProfileModal form submit khong duoc chua active:scale-95',
  );

  const hologramCard = read('src/components/HologramStudentCard.tsx');
  assert.ok(
    hologramCard.includes('perspective') || hologramCard.includes('rotateX') || hologramCard.includes('rotateY') || hologramCard.includes('shimmer'),
    'HologramStudentCard (the danh du F-Pass) phai duoc bao toan hieu ung 3D tilt/shimmer',
  );

  assert.ok(
    profileModal.includes('title="Tố cáo"') && profileModal.includes('aria-label="Tố cáo"'),
    'Nut To cao tren the ho so phai chuyen sang Icon-Only co title va aria-label',
  );
  assert.ok(
    profileModal.includes('title="Chia sẻ"') && profileModal.includes('aria-label="Chia sẻ"'),
    'Nut Chia se tren the ho so phai chuyen sang Icon-Only co title va aria-label',
  );
  assert.ok(
    profileModal.includes('title="Cửa hàng"') && profileModal.includes('aria-label="Cửa hàng"'),
    'Nut Cua hang tren the ho so phai chuyen sang Icon-Only co title va aria-label',
  );
});

test('Phase 22 - 3. Bao Toan 3 Asset 3D Nguyen Ban Va Switcher Thiet Bi Icon-Only', () => {
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
