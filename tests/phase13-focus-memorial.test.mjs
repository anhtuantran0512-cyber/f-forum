import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function read(relPath) {
  return fs.readFileSync(path.resolve(relPath), 'utf8');
}

test('Phase 13 - 1. Phòng Tập Trung Machi Mart: Live Presence, Tibetan Bowl Chime & Ambient Atmosphere Dimmer', () => {
  const focus = read('src/components/FocusSanctuary.tsx');
  const lines = focus.split('\n');

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

  assert.ok(focus.includes('MACHI_MART_3D_URL'), 'Phải bảo tồn mô hình 3D Machi Mart đêm mưa nguyên bản');
  assert.ok(focus.includes('01a16606-3f4a-7e46-a701-0c5f36bb2e5c.arena.site'), 'Phải giữ nguyên iframe URL của Machi Mart 3D');

  assert.ok(focus.includes('đồng môn đang cùng học'), 'Phải có Live Study Presence HUD hiển thị sĩ tử cùng học');
  assert.ok(focus.includes('playTibetanBowlChime'), 'Phải tích hợp Chuông Tây Tạng Web Audio API');
  assert.ok(focus.includes('Chuông Tây Tạng'), 'Phải có nút ngân vang chuông đồng Tây Tạng');

  assert.ok(focus.includes('Hoàng Hôn Vàng Ấm'), 'Bộ điều chỉnh ánh sáng phải có mốc Hoàng Hôn Vàng Ấm');
  assert.ok(focus.includes('Mưa Đêm Sâu Lắng'), 'Bộ điều chỉnh ánh sáng phải có mốc Mưa Đêm Sâu Lắng');
  assert.ok(focus.includes('atmosphereDimmer'), 'Phải có state điều chỉnh độ tối nền xung quanh mô hình 3D');
});

test('Phase 13 - 2. Chuông Tây Tạng Web Audio API trong audio.ts: Tôn trọng isSfxEnabled & Bộ dao động đa sóng', () => {
  const audio = read('src/utils/audio.ts');
  assert.ok(audio.includes('export function playTibetanBowlChime'), 'audio.ts phải export playTibetanBowlChime');
  assert.match(audio, /export function playTibetanBowlChime\(\): void \{\n  if \(!isSfxEnabled\(\)\) return;/, 'Chuông Tây Tạng phải tôn trọng công tắc isSfxEnabled()');
  assert.ok(audio.includes('createOscillator'), 'Chuông phải tổng hợp sóng âm Web Audio API');
});

test('Phase 13 - 3. Bức Tường Lưu Bút 2027: Phong Thư Origami 3D, 4 Kỳ Thi Trọng Điểm & Nút Gửi Lời Động Viên', () => {
  const modal = read('src/components/MemorialWallModal.tsx');
  const css = read('src/components/MemorialWallModal.css');
  const lines = modal.split('\n');

  assert.equal(
    lines[0].trim(),
    '/* Bản quyền trí tuệ thuộc về BroAmStuck */',
    'Dòng 1 MemorialWallModal.tsx phải chứa bản quyền BroAmStuck',
  );

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    assert.ok(
      !line.startsWith('//'),
      `MemorialWallModal.tsx không được có single-line comment ở dòng ${i + 1}: ${line}`,
    );
  }

  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  for (let i = 0; i < lines.length; i++) {
    assert.ok(
      !emojiRegex.test(lines[i]),
      `MemorialWallModal.tsx không được có emoji ở dòng ${i + 1}: ${lines[i]}`,
    );
  }

  assert.ok(modal.includes('card-hard') && modal.includes('rounded-[16px]'), 'Thẻ phong thư phải đạt chuẩn .card-hard rounded-[16px]');
  assert.ok(modal.includes('origami-envelope-card'), 'Phải có class origami-envelope-card');
  assert.ok(modal.includes('origami-letter-body'), 'Phải có hiệu ứng mở phong thư Origami 3D');
  assert.ok(modal.includes('Mở phong thư'), 'Phải có nhãn mở phong thư chi tiết');

  assert.ok(modal.includes('THPT Quốc Gia'), 'Phải có bộ lọc kỳ thi THPT Quốc Gia');
  assert.ok(modal.includes('Đánh Giá Năng Lực (ĐGNL)'), 'Phải có bộ lọc kỳ thi Đánh Giá Năng Lực (ĐGNL)');
  assert.ok(modal.includes('Chứng Chỉ Quốc Tế (IELTS/SAT)'), 'Phải có bộ lọc kỳ thi Chứng Chỉ Quốc Tế (IELTS/SAT)');
  assert.ok(modal.includes('Đội Tuyển Chuyên Học Sinh Giỏi'), 'Phải có bộ lọc kỳ thi Đội Tuyển Chuyên Học Sinh Giỏi');

  assert.ok(modal.includes('Gửi Lời Động Viên'), 'Phải có nút xúc giác Gửi Lời Động Viên');
  assert.ok(modal.includes('btn-feastables'), 'Nút gửi lời động viên phải mang kiểu dáng Feastables 3D');
  assert.ok(modal.includes('Điểm Uy Tín Học Thuật'), 'Phải thưởng Điểm Uy Tín Học Thuật cho người gửi động viên');
  assert.ok(css.includes('micro-star-particle') || modal.includes('micro-star-particle'), 'Phải có hiệu ứng hạt sao vi mô bay nhẹ');
});
