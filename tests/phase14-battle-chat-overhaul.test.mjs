import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function read(relPath) {
  return fs.readFileSync(path.resolve(relPath), 'utf8');
}

test('Phase 14 - 1. Đấu Trường Tranh Tài 1vs1: Radar Elo Matchmaking, 2 Làn Đấu Sĩ & Thẻ Chiến Thắng Khải Hoàn', () => {
  const modal = read('src/components/exam/PeerBattleModal.tsx');
  const lines = modal.split('\n');

  assert.equal(
    lines[0].trim(),
    '/* Bản quyền trí tuệ thuộc về BroAmStuck */',
    'Dòng 1 PeerBattleModal.tsx phải chứa bản quyền BroAmStuck',
  );

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    assert.ok(
      !line.startsWith('//'),
      `PeerBattleModal.tsx không được có single-line comment ở dòng ${i + 1}: ${line}`,
    );
  }

  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  for (let i = 0; i < lines.length; i++) {
    assert.ok(
      !emojiRegex.test(lines[i]),
      `PeerBattleModal.tsx không được có emoji ở dòng ${i + 1}: ${lines[i]}`,
    );
  }

  assert.ok(modal.includes('Cơ Chế Ghép Cặp Theo Điểm Uy Tín Học Thuật'), 'Phải có cơ chế ghép cặp theo Điểm Uy Tín');
  assert.ok(modal.includes('Elo-based Matchmaking'), 'Phải có mô phỏng ghép cặp theo Elo');
  assert.ok(modal.includes('animate-spin-slow'), 'Phải có vòng radar quét sóng SVG êm ái');

  assert.ok(modal.includes('card-hard') && modal.includes('sinh lực') || modal.includes('Sinh lực'), 'Phải có bảng tranh tài đấu sĩ tinh hoa');
  assert.ok(modal.includes('COMBO x'), 'Phải có thanh năng lượng combo streak');
  assert.ok(modal.includes('playHeartbeatPulse'), 'Phải tích hợp âm thanh Web Audio nhịp tim đập dồn dập');

  assert.ok(modal.includes('Thẻ Chiến Thắng Khải Hoàn (Victory Honor Card)'), 'Phải có Thẻ Chiến Thắng Khải Hoàn');
  assert.ok(modal.includes('Chuỗi Thắng Khải Hoàn'), 'Phải chúc mừng chuỗi thắng (Win Streak Flame)');
  assert.ok(modal.includes('Điểm Uy Tín Học Thuật'), 'Phải cộng Điểm Uy Tín Học Thuật danh giá');
  assert.ok(modal.includes('Elo Xếp Hạng'), 'Phải cộng điểm Elo Xếp Hạng khi thắng');
  assert.ok(modal.includes('card-hard rounded-[16px]'), 'Thẻ chiến thắng phải đạt chuẩn .card-hard rounded-[16px]');
});

test('Phase 14 - 2. Đàm Thoại Học Thuật: Thanh Ghim Câu Hỏi Thử Thách Nhóm & Bộ Nhập Liệu Học Thuật Nhanh', () => {
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

    assert.ok(content.includes('Thử Thách') && content.includes('Nhóm Tuần Này'), `${name} phải có Thanh Ghim Câu Hỏi Thử Thách Nhóm`);
    assert.ok(content.includes('Mở Bước Giải'), `${name} phải có nút xúc giác Mở Bước Giải Gợi Ý`);
    assert.ok(content.includes('StepSolutionAccordion'), `${name} phải tích hợp StepSolutionAccordion vào thử thách nhóm`);

    assert.ok(content.includes('π'), `${name} phải có nút chèn ký hiệu Pi`);
    assert.ok(content.includes('√(x)'), `${name} phải có nút chèn căn bậc hai`);
    assert.ok(content.includes('Δ'), `${name} phải có nút chèn Delta`);
    assert.ok(content.includes('∫'), `${name} phải có nút chèn tích phân`);
    assert.ok(content.includes('∑'), `${name} phải có nút chèn tổng Sigma`);
    assert.ok(content.includes('spoiler'), `${name} phải có định dạng spoiler ẩn đáp án`);
  }
});
