import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function read(relPath) {
  return fs.readFileSync(path.resolve(relPath), 'utf8');
}

test('Phase 19 - 1. Trao Tra Toan Dien iPhone Nguyen Ban: Nhung /iphone5-showcase.html?embed=true & Loai Bo Hoan Toan Mockup Chap Va', () => {
  const hardware = read('src/components/HardwareShowcase.tsx');
  const lines = hardware.split('\n');

  assert.equal(
    lines[0].trim(),
    '/* Bản quyền trí tuệ thuộc về BroAmStuck */',
    'Dòng 1 HardwareShowcase.tsx phải chứa bản quyền BroAmStuck',
  );

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    assert.ok(
      !line.startsWith('//'),
      `HardwareShowcase.tsx không được có single-line comment ở dòng ${i + 1}: ${line}`,
    );
  }

  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  for (let i = 0; i < lines.length; i++) {
    assert.ok(
      !emojiRegex.test(lines[i]),
      `HardwareShowcase.tsx không được có emoji ở dòng ${i + 1}: ${lines[i]}`,
    );
  }

  assert.ok(
    hardware.includes('/iphone5-showcase.html?embed=true'),
    'HardwareShowcase.tsx phải nhúng trực tiếp /iphone5-showcase.html?embed=true',
  );

  assert.ok(
    !hardware.includes('setIphoneTab'),
    'HardwareShowcase.tsx không được chứa state setIphoneTab chắp vá',
  );
  assert.ok(
    !hardware.includes('setIphoneMiniApp'),
    'HardwareShowcase.tsx không được chứa state setIphoneMiniApp chắp vá',
  );

  const iphoneHtmlExists = fs.existsSync(path.resolve('public/iphone5-showcase.html'));
  assert.ok(iphoneHtmlExists, 'File public/iphone5-showcase.html phải tồn tại');

  const iphoneStats = fs.statSync(path.resolve('public/iphone5-showcase.html'));
  assert.ok(
    iphoneStats.size > 4000000,
    `public/iphone5-showcase.html phải là bản nguyên vẹn > 4MB (kích thước hiện tại: ${iphoneStats.size} bytes)`,
  );

  const iphoneHtml = read('public/iphone5-showcase.html');
  assert.ok(
    iphoneHtml.includes('"F-Forum":"/favicon.svg"'),
    'iphone5-showcase.html phải tích hợp ứng dụng F-Forum với icon /favicon.svg',
  );
  assert.ok(
    iphoneHtml.includes('case"F-Forum":return w.jsx("iframe",{src:"/?embed=true"'),
    'iphone5-showcase.html phải mở F-Forum bên trong màn hình iPhone khi bấm icon',
  );
  assert.ok(
    iphoneHtml.includes('Messages') &&
    iphoneHtml.includes('Notes') &&
    iphoneHtml.includes('Calculator') &&
    iphoneHtml.includes('Maps') &&
    iphoneHtml.includes('Weather'),
    'iphone5-showcase.html phải bảo tồn toàn bộ các ứng dụng nguyên bản iOS 6',
  );
  assert.ok(
    iphoneHtml.includes('body.embed-mode .museum-intro') &&
    iphoneHtml.includes('body.embed-mode .museum-footer'),
    'iphone5-showcase.html phải có cơ chế embed-mode căn giữa điện thoại và ẩn cột thừa',
  );
});

test('Phase 19 - 2. Bao Toan Machi Mart 3D Tu Host Nguyen Ban (> 1MB) & He Mat Troi 3D', () => {
  const machiStats = fs.statSync(path.resolve('public/machi-mart-3d.html'));
  assert.ok(
    machiStats.size > 1000000,
    `public/machi-mart-3d.html phải là diorama 3D nguyên bản > 1MB (kích thước hiện tại: ${machiStats.size} bytes)`,
  );

  const sanctuary = read('src/components/FocusSanctuary.tsx');
  assert.ok(
    sanctuary.includes('/machi-mart-3d.html'),
    'FocusSanctuary phải nạp /machi-mart-3d.html tự host cục bộ',
  );

  const solarHtml = read('public/solar-system-3d.html');
  const solarLines = solarHtml.trim().split('\n');
  assert.equal(solarLines.length, 557, 'File public/solar-system-3d.html phải bảo tồn chính xác 557 dòng nguyên bản');
});

test('Phase 19 - 3. Ky Luat Tinh Gon Giao Dien Anti-Bloat: Khong Cong Don Tinh Nang Thua, Nhan <= 3 Tu', () => {
  const chatView = read('src/components/views/ChatView.tsx');
  const chatDock = read('src/components/ChatDock.tsx');
  const hardware = read('src/components/HardwareShowcase.tsx');

  assert.ok(chatView.includes('<span>Giải chi tiết</span>'), 'ChatView nhãn <= 3 từ');
  assert.ok(chatDock.includes('<span>Giải chi tiết</span>'), 'ChatDock nhãn <= 3 từ');
  assert.ok(hardware.includes('<span>iPhone 16 Pro</span>'), 'HardwareShowcase nhãn <= 3 từ');
  assert.ok(hardware.includes('<span>MacBook Pro</span>'), 'HardwareShowcase nhãn <= 3 từ');
});
