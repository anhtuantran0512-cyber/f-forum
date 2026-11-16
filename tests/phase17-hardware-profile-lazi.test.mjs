import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function read(relPath) {
  return fs.readFileSync(path.resolve(relPath), 'utf8');
}

test('Phase 17 - 1. Đại Tu Showcase Phần Cứng 3D: Đa Thiết Bị iPhone 16 Pro & MacBook Pro', () => {
  const code = read('src/components/HardwareShowcase.tsx');
  const lines = code.split('\n');

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

  assert.ok(code.includes('deviceType') && code.includes('iphone') && code.includes('macbook'), 'Phải có state chuyển đổi giữa iPhone và MacBook');
  assert.ok(code.includes('Điện Thoại (iPhone 16 Pro)'), 'Phải có nhãn nút Điện Thoại (iPhone 16 Pro)');
  assert.ok(code.includes('Máy Tính (MacBook Pro)'), 'Phải có nhãn nút Máy Tính (MacBook Pro)');

  assert.ok(code.includes('Dynamic Island') || code.includes('Dynamic island'), 'iPhone phải có Dynamic Island');
  assert.ok(code.includes('springboard') || code.includes('Springboard') || code.includes('Màn hình chính'), 'iPhone phải có màn hình chính iOS Springboard');
  assert.ok(code.includes('Mở ứng dụng F-Forum'), 'Màn hình chính iOS phải có icon ứng dụng F-Forum');
  assert.ok(code.includes('Bấm để về Màn hình chính'), 'Phải có nút Home vật lý điều hướng về Springboard');

  assert.ok(code.includes('') && code.includes('F-Forum'), 'MacBook Pro phải có menu bar chuẩn macOS');
  assert.ok(code.includes('https://f-forum.edu.vn'), 'Cửa sổ Safari/Browser phải có địa chỉ https://f-forum.edu.vn');
  assert.ok(code.includes('Đóng cửa sổ F-Forum') || code.includes('setIsMacWindowOpen(false)'), 'Nút đỏ Mac phải hỗ trợ đóng/thu nhỏ cửa sổ');
  assert.ok(code.includes('Desktop macOS') || code.includes('Mở ứng dụng F-Forum Web'), 'MacBook Pro phải có Dock ứng dụng chân thực');
});

test('Phase 17 - 2. Tinh Gọn Thư Mục Hồ Sơ: Chỉ Dùng Icon Tuyệt Đối & Bỏ Chữ Dài Dòng', () => {
  const profileCode = read('src/components/ProfileModal.tsx');
  const lines = profileCode.split('\n');

  assert.equal(
    lines[0].trim(),
    '/* Bản quyền trí tuệ thuộc về BroAmStuck */',
    'Dòng 1 ProfileModal.tsx phải chứa bản quyền BroAmStuck',
  );

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    assert.ok(
      !line.startsWith('//'),
      `ProfileModal.tsx không được có single-line comment ở dòng ${i + 1}: ${line}`,
    );
  }

  const tabListMatch = profileCode.match(/role="tablist"[\s\S]*?<\/div>/);
  assert.ok(tabListMatch, 'Phải có vùng role="tablist" trong ProfileModal');
  const tabListStr = tabListMatch[0];

  assert.ok(!tabListStr.includes('<span>Hồ sơ</span>'), 'Không được để span chữ Hồ sơ trong tab list');
  assert.ok(!tabListStr.includes('<span>Thành tích</span>'), 'Không được để span chữ Thành tích trong tab list');
  assert.ok(!tabListStr.includes('<span>F-Pass</span>') && !tabListStr.includes('<span>Thẻ học sinh</span>'), 'Không được để span chữ F-Pass trong tab list');
  assert.ok(!tabListStr.includes('<span>Cửa hàng</span>'), 'Không được để span chữ Cửa hàng trong tab list');
  assert.ok(!tabListStr.includes('<span>Hoạt động</span>'), 'Không được để span chữ Hoạt động trong tab list');
  assert.ok(!tabListStr.includes('<span>Sửa hồ sơ</span>'), 'Không được để span chữ Sửa hồ sơ trong tab list');

  assert.ok(tabListStr.includes('aria-label="Hồ sơ"') || tabListStr.includes('title="Hồ sơ"'), 'Nút icon Hồ sơ phải có title/aria-label hỗ trợ tiếp cận');
  assert.ok(tabListStr.includes('aria-label="Thành tích"') || tabListStr.includes('title="Thành tích"'), 'Nút icon Thành tích phải có title/aria-label');
  assert.ok(tabListStr.includes('aria-label="Thẻ F-Pass"') || tabListStr.includes('title="Thẻ F-Pass"'), 'Nút icon F-Pass phải có title/aria-label');
  assert.ok(tabListStr.includes('aria-label="Cửa hàng"') || tabListStr.includes('title="Cửa hàng"'), 'Nút icon Cửa hàng phải có title/aria-label');
  assert.ok(tabListStr.includes('aria-label="Hoạt động"') || tabListStr.includes('title="Hoạt động"'), 'Nút icon Hoạt động phải có title/aria-label');
  assert.ok(tabListStr.includes('aria-label="Sửa hồ sơ"') || tabListStr.includes('title="Sửa hồ sơ"'), 'Nút icon Sửa hồ sơ phải có title/aria-label');
});

test('Phase 17 - 3. Loại Bỏ Nghiêng 3D / Ấn Lõm Khỏi Trang Chủ Hồ Sơ (Giữ Lại Cho Thẻ F-Pass)', () => {
  const profileCode = read('src/components/ProfileModal.tsx');
  const hologramCode = read('src/components/HologramStudentCard.tsx');

  assert.ok(!profileCode.includes('handleCardPointerMove'), 'ProfileModal không được chứa hàm handleCardPointerMove gây rung lắc');
  assert.ok(!profileCode.includes('handleCardPointerLeave'), 'ProfileModal không được chứa hàm handleCardPointerLeave');
  assert.ok(!profileCode.includes('cardTilt'), 'ProfileModal không được chứa state cardTilt');
  assert.ok(!profileCode.includes('perspective(1000px) rotateX'), 'ProfileModal không được áp dụng perspective rotate 3D trên thẻ hồ sơ tổng quan');

  assert.ok(hologramCode.includes('rotateX') || hologramCode.includes('transform'), 'HologramStudentCard vẫn phải giữ hiệu ứng hologram phản chiếu 3D sang trọng');
});

test('Phase 17 - 4. Tái Cấu Trúc Phòng Đàm Thoại Phong Cách Lazi: Filter, Math Cards & Bước Giải', () => {
  const chatView = read('src/components/views/ChatView.tsx');
  const chatDock = read('src/components/ChatDock.tsx');

  for (const [name, content] of [['ChatView', chatView], ['ChatDock', chatDock]]) {
    const lines = content.split('\n');
    assert.equal(
      lines[0].trim(),
      '/* Bản quyền trí tuệ thuộc về BroAmStuck */',
      `Dòng 1 ${name} phải chứa bản quyền BroAmStuck`,
    );

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      assert.ok(
        !line.startsWith('//'),
        `${name} không được có single-line comment ở dòng ${i + 1}: ${line}`,
      );
    }

    assert.ok(content.includes('Thủ khoa kiểm chứng'), `${name} phải có huy hiệu Thủ khoa kiểm chứng`);
    assert.ok(content.includes('Đã có lời giải chuẩn'), `${name} phải có huy hiệu Đã có lời giải chuẩn`);
    assert.ok(content.includes('Bounty') || content.includes('Điểm Thưởng'), `${name} phải có điểm thưởng bounty`);
    assert.ok(content.includes('Gửi Bước Giải Chi Tiết'), `${name} phải có nút chèn Bước Giải Chi Tiết`);
    assert.ok(content.includes('\\frac{a}{b}'), `${name} phải có công cụ chèn phân số \\frac{a}{b}`);
  }

  assert.ok(chatView.includes('Môn học:'), 'ChatView phải có bộ lọc Lazi theo môn học');
  assert.ok(chatView.includes('Khối lớp:'), 'ChatView phải có bộ lọc Lazi theo khối lớp');
  assert.ok(chatView.includes('Toán') && chatView.includes('Lý') && chatView.includes('Hóa'), 'ChatView phải có các môn Toán, Lý, Hóa');
  assert.ok(chatView.includes('Lớp 10') && chatView.includes('Lớp 11') && chatView.includes('Lớp 12'), 'ChatView phải có các khối Lớp 10, 11, 12');
});
