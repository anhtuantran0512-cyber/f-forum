/* Bản quyền trí tuệ thuộc về BroAmStuck */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function read(relPath) {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf-8');
}

test('Phase 15 - 1. Thẻ Ghi Nhớ Học Thuật 3D Haptic: Chuẩn .card-hard rounded-[16px], màu giấy kem #FBF2E1 & mận sẫm #2B2331', () => {
  const modalTsx = read('src/components/exam/ExamFlashcardModal.tsx');
  const modalCss = read('src/components/exam/ExamFlashcardModal.css');
  const realmTsx = read('src/components/MemoryRealm.tsx');

  assert.ok(modalTsx.includes('card-hard rounded-[16px]'), 'ExamFlashcardModal must use .card-hard rounded-[16px]');
  assert.ok(realmTsx.includes('card-hard rounded-[16px]'), 'MemoryRealm must use .card-hard rounded-[16px]');
  assert.ok(modalCss.includes('#FBF2E1'), 'ExamFlashcardModal.css must feature cream paper #FBF2E1');
  assert.ok(modalCss.includes('#2B2331'), 'ExamFlashcardModal.css must feature deep plum #2B2331');
  assert.ok(realmTsx.includes('#FBF2E1') && realmTsx.includes('#2B2331'), 'MemoryRealm must use cream paper #FBF2E1 and deep plum #2B2331');

  assert.ok(modalCss.includes('perspective: 1200px'), 'Perspective 3D must be defined');
  assert.ok(modalCss.includes('transform-style: preserve-3d'), 'Preserve-3d must be configured for 3D flip');
  assert.ok(modalCss.includes('backface-visibility: hidden'), 'Backface visibility must be hidden');
});

test('Phase 15 - 2. Âm thanh Web Audio API: Paper Page Flip, Crystalline Chime & Machi Mart Chime', () => {
  const audio = read('src/utils/audio.ts');
  const modalTsx = read('src/components/exam/ExamFlashcardModal.tsx');
  const realmTsx = read('src/components/MemoryRealm.tsx');

  assert.ok(audio.includes('export function playPaperPageFlip(): void'), 'audio.ts must export playPaperPageFlip');
  assert.ok(audio.includes('export function playCrystallineChime(): void'), 'audio.ts must export playCrystallineChime');
  assert.ok(audio.includes('export function playMachiMartChime(): void'), 'audio.ts must export playMachiMartChime');

  assert.ok(modalTsx.includes('playPaperPageFlip'), 'ExamFlashcardModal must call playPaperPageFlip on flip');
  assert.ok(modalTsx.includes('playCrystallineChime'), 'ExamFlashcardModal must call playCrystallineChime on mastery');
  assert.ok(realmTsx.includes('playPaperPageFlip'), 'MemoryRealm must call playPaperPageFlip on flip');
  assert.ok(realmTsx.includes('playCrystallineChime'), 'MemoryRealm must call playCrystallineChime on mastery');
});

test('Phase 15 - 3. Thanh Tiến Trình Làm Chủ Tri Thức (Mastery Progress Tracker) với năng lượng 3 dải màu', () => {
  const modalTsx = read('src/components/exam/ExamFlashcardModal.tsx');
  const realmTsx = read('src/components/MemoryRealm.tsx');

  assert.ok(modalTsx.includes('Đã thuộc:') && modalTsx.includes('Đang học:') && modalTsx.includes('Cần ôn gấp:'), 'Modal must track all 3 stages');
  assert.ok(modalTsx.includes('bg-emerald-500') && modalTsx.includes('bg-amber-500') && modalTsx.includes('bg-[#73324c]'), 'Modal must render emerald, amber and deep plum energy bars');

  assert.ok(realmTsx.includes('Thuộc:') && realmTsx.includes('Đang học:') && realmTsx.includes('Cần ôn:'), 'MemoryRealm must track all 3 stages');
  assert.ok(realmTsx.includes('bg-emerald-500') && realmTsx.includes('bg-amber-500') && realmTsx.includes('bg-[#73324c]'), 'MemoryRealm must render emerald, amber and deep plum energy bars');
});

test('Phase 15 - 4. Phân Luồng Thẻ 12 Môn Học đồng bộ với Phòng Truyền Thống và Thư Viện Đề Thi', () => {
  const modalTsx = read('src/components/exam/ExamFlashcardModal.tsx');
  const realmTsx = read('src/components/MemoryRealm.tsx');

  const expected12 = [
    'Toán học',
    'Vật lý',
    'Hóa học',
    'Sinh học',
    'Lịch sử',
    'Địa lý',
    'Ngữ văn',
    'Tiếng Anh',
    'Tin học',
    'Triết học',
    'Thiên văn',
    'Nghệ thuật',
  ];

  expected12.forEach((subject) => {
    assert.ok(modalTsx.includes(subject), `ExamFlashcardModal must include subject ${subject}`);
    assert.ok(realmTsx.includes(subject), `MemoryRealm must include subject ${subject}`);
  });
});

test('Phase 15 - 5. Trung Tâm Thiết Lập Cá Nhân Hóa Sĩ Tử (SettingsModal.tsx) với chuẩn .card-hard 16px & 4 khu vực', () => {
  const settings = read('src/components/SettingsModal.tsx');

  assert.ok(settings.includes('card-hard rounded-[16px]'), 'Settings cards must feature card-hard rounded-[16px]');

  assert.ok(settings.includes('Trải nghiệm Âm thanh Xúc giác'), 'Settings must feature Tactile Sound Experience section');
  assert.ok(settings.includes('Chuông Tây Tạng (432Hz)'), 'Settings must include Tibetan bowl chime');
  assert.ok(settings.includes('Âm lofi Machi Mart'), 'Settings must include Machi Mart sound');

  assert.ok(settings.includes('Cỡ chữ đọc sách'), 'Settings must feature reading font size');
  assert.ok(settings.includes('animate-[spin_10s_linear_infinite]'), 'Theme switch spinning sun rays preserved');
  assert.ok(settings.includes('bg-amber-500/25'), 'Theme switch moon crater dots preserved');

  assert.ok(settings.includes('Sao Lưu Dữ Liệu Ngoại Tuyến'), 'Settings must feature Offline Data Backup section');
  assert.ok(settings.includes('btn-feastables'), 'Settings must feature Feastables 3D tactile buttons');
  assert.ok(settings.includes('Xuất Bản Sao Lưu Dữ Liệu Học Tập JSON'), 'Settings must feature JSON backup button');
  assert.ok(settings.includes('Khôi Phục Dữ Liệu'), 'Settings must feature data restore button');

  assert.ok(settings.includes('Bảo Mật Sĩ Tử'), 'Settings must feature Scholar Security section');
  assert.ok(settings.includes('Đăng xuất mọi thiết bị'), 'Settings must feature sign-out all devices button');
  assert.ok(settings.includes('<PasswordChangeForm'), 'Settings must render PasswordChangeForm');
});

test('Phase 15 - 6. Bảo vệ chất lượng mã nguồn: 0 comment trong mã JS/TS & 0 emoji', () => {
  const filesToCheck = [
    'src/utils/audio.ts',
    'src/components/exam/ExamFlashcardModal.tsx',
    'src/components/MemoryRealm.tsx',
    'src/components/SettingsModal.tsx',
  ];

  filesToCheck.forEach((filePath) => {
    const raw = read(filePath);
    const lines = raw.split('\n');
    assert.ok(lines[0].includes('/* Bản quyền trí tuệ thuộc về BroAmStuck */'), `${filePath} must have copyright header on line 1`);

    lines.slice(1).forEach((line, index) => {
      const trimmed = line.trim();
      assert.ok(!trimmed.startsWith('//'), `Forbidden single-line comment at ${filePath}:${index + 2}`);
      assert.ok(!trimmed.startsWith('/*') && !trimmed.startsWith('*'), `Forbidden block comment at ${filePath}:${index + 2}`);
    });

    const emojiMatches = raw.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g) || [];
    assert.equal(emojiMatches.length, 0, `No emojis allowed in ${filePath}, found: ${emojiMatches.join(', ')}`);
  });
});
