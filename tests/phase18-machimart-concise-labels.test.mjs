import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function read(relPath) {
  return fs.readFileSync(path.resolve(relPath), 'utf8');
}

test('Phase 18 - 1. Phòng Tập Trung Machi Mart 3D Tự Host: Cục bộ /machi-mart-3d.html & Fallback CSP', () => {
  const sanctuary = read('src/components/FocusSanctuary.tsx');
  const lines = sanctuary.split('\n');

  assert.equal(
    lines[0].trim(),
    '/* Bản quyền trí tuệ thuộc về BroAmStuck */',
    'Dòng 1 FocusSanctuary.tsx phải chứa bản quyền BroAmStuck',
  );

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    assert.ok(
      !line.startsWith('//'),
      `FocusSanctuary.tsx không được có single-line comment ở dòng ${i + 1}: ${line}`,
    );
  }

  assert.ok(
    sanctuary.includes('/machi-mart-3d.html'),
    'FocusSanctuary phải ưu tiên nạp file /machi-mart-3d.html tự host cục bộ',
  );
  assert.ok(
    sanctuary.includes('01a16606-3f4a-7e46-a701-0c5f36bb2e5c.arena.site'),
    'FocusSanctuary phải giữ fallback URL để tương thích kiểm thử hồi quy',
  );
  assert.ok(
    sanctuary.includes('MACHI_MART_FALLBACK_URL') && sanctuary.includes('MACHI_MART_3D_URL'),
    'FocusSanctuary phải định nghĩa cả MACHI_MART_FALLBACK_URL và MACHI_MART_3D_URL',
  );

  const htmlExists = fs.existsSync(path.resolve('public/machi-mart-3d.html'));
  assert.ok(htmlExists, 'File public/machi-mart-3d.html phải tồn tại');

  const htmlContent = read('public/machi-mart-3d.html');
  assert.ok(htmlContent.includes('MACHI MART 24/7'), 'Machi Mart 3D phải có biển hiệu Machi Mart 24/7');
  assert.ok(htmlContent.includes('canvas3d'), 'Machi Mart 3D phải có canvas 3D');
  assert.ok(htmlContent.includes('Tiếng mưa'), 'Machi Mart 3D phải có trình phát âm thanh mưa');
});

test('Phase 18 - 2. Bảo Toàn Tuyệt Đối Hệ Mặt Trời 3D Thiên Văn Nguyên Bản', () => {
  const clubs = read('src/components/views/ClubsView.tsx');
  assert.ok(
    clubs.includes("const SOLAR_SYSTEM_3D_URL = '/solar-system-3d.html';"),
    'ClubsView.tsx phải trỏ chính xác vào /solar-system-3d.html',
  );
  assert.ok(
    clubs.includes('src={SOLAR_SYSTEM_3D_URL}'),
    'ClubsView.tsx phải nhúng iframe SOLAR_SYSTEM_3D_URL',
  );

  const solarHtml = read('public/solar-system-3d.html');
  const solarLines = solarHtml.trim().split('\n');
  assert.equal(solarLines.length, 557, 'File public/solar-system-3d.html phải bảo tồn chính xác 557 dòng nguyên bản');
  assert.ok(solarHtml.includes('Mô Phỏng Hệ Mặt Trời 3D'), 'solar-system-3d.html phải giữ nguyên tiêu đề');
  assert.ok(solarHtml.includes('Mặt Trời') && solarHtml.includes('Sao Thổ'), 'solar-system-3d.html phải có đủ các hành tinh');
});

test('Phase 18 - 3. Thực Thi Luật Nhãn Siêu Tinh Gọn (≤ 3 Từ) Tại ChatView, ChatDock & HardwareShowcase', () => {
  const chatView = read('src/components/views/ChatView.tsx');
  const chatDock = read('src/components/ChatDock.tsx');
  const hardware = read('src/components/HardwareShowcase.tsx');

  for (const [name, content] of [['ChatView', chatView], ['ChatDock', chatDock]]) {
    assert.ok(content.includes('<span>Giải chi tiết</span>'), `${name} phải dùng nhãn tinh gọn <span>Giải chi tiết</span> (3 từ)`);
    assert.ok(content.includes('+50 Bounty'), `${name} phải dùng nhãn tinh gọn +50 Bounty (2 từ)`);
    assert.ok(content.includes('Thủ khoa duyệt'), `${name} phải dùng nhãn tinh gọn Thủ khoa duyệt (3 từ)`);
    assert.ok(content.includes('Lời giải chuẩn'), `${name} phải dùng nhãn tinh gọn Lời giải chuẩn (3 từ)`);
  }

  assert.ok(
    hardware.includes('<span>iPhone 16 Pro</span>'),
    'HardwareShowcase phải dùng nhãn nút [ iPhone 16 Pro ] (3 từ)',
  );
  assert.ok(
    hardware.includes('<span>MacBook Pro</span>'),
    'HardwareShowcase phải dùng nhãn nút [ MacBook Pro ] (2 từ)',
  );
});

test('Phase 18 - 4. Kiểm Thử Hồi Quy Epic 4 Chấp Nhận 0 Emoji Trong Mã Nguồn', () => {
  const epic4 = read('tests/epic4-profile-shop.test.mjs');
  assert.ok(
    epic4.includes('/(?:🎨\\s*)?Đang trang bị:/'),
    'tests/epic4-profile-shop.test.mjs phải dùng regex cho phép không có emoji 🎨',
  );

  const profileModal = read('src/components/ProfileModal.tsx');
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  const lines = profileModal.split('\n');
  for (let i = 0; i < lines.length; i++) {
    assert.ok(
      !emojiRegex.test(lines[i]),
      `ProfileModal.tsx không được có emoji ở dòng ${i + 1}: ${lines[i]}`,
    );
  }
});
