import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (relPath) => fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');

test('Phase 16 - 1. Mô hình dữ liệu Đề Thi 3 Phần GDPT 2018 & CBTResult Breakdown', () => {
  const typesContent = read('src/types/index.ts');

  assert.ok(typesContent.includes('export interface ExamCBTStatement'), 'Phải định nghĩa ExamCBTStatement');
  assert.ok(typesContent.includes("part?: 1 | 2 | 3"), 'ExamCBTQuestion phải hỗ trợ part 1 | 2 | 3');
  assert.ok(typesContent.includes("questionType?: 'single_choice' | 'true_false' | 'short_answer'"), 'ExamCBTQuestion phải hỗ trợ questionType 3 phần');
  assert.ok(typesContent.includes('statements?: Array<'), 'ExamCBTQuestion phải hỗ trợ statements cho Phần II');
  assert.ok(typesContent.includes('numericAnswer?: number | string'), 'ExamCBTQuestion phải hỗ trợ numericAnswer cho Phần III');
  assert.ok(typesContent.includes('tolerance?: number'), 'ExamCBTQuestion phải hỗ trợ tolerance cho Phần III');

  assert.ok(typesContent.includes('partBreakdown?: {'), 'CBTResult phải có partBreakdown');
  assert.ok(typesContent.includes('part1: { total: number; correct: number; score: number }'), 'partBreakdown phải có thống kê part1');
  assert.ok(typesContent.includes('part2: { total: number; correctStatements: number; score: number }'), 'partBreakdown phải có thống kê part2');
  assert.ok(typesContent.includes('part3: { total: number; correct: number; score: number }'), 'partBreakdown phải có thống kê part3');
});

test('Phase 16 - 2. Ngân Hàng Câu Hỏi cbtData.ts: Chuẩn Ma Trận 3 Phần GDPT 2018 & Generator', () => {
  const cbtData = read('src/components/exam/cbtData.ts');

  assert.ok(cbtData.includes('part: 1'), 'cbtData.ts phải có câu hỏi Phần I');
  assert.ok(cbtData.includes('part: 2'), 'cbtData.ts phải có câu hỏi Phần II');
  assert.ok(cbtData.includes('part: 3'), 'cbtData.ts phải có câu hỏi Phần III');
  assert.ok(cbtData.includes("questionType: 'single_choice'"), 'cbtData.ts phải định nghĩa single_choice');
  assert.ok(cbtData.includes("questionType: 'true_false'"), 'cbtData.ts phải định nghĩa true_false');
  assert.ok(cbtData.includes("questionType: 'short_answer'"), 'cbtData.ts phải định nghĩa short_answer');
  assert.ok(cbtData.includes('statements: ['), 'cbtData.ts phải cấu hình statements cho Phần II');
  assert.ok(cbtData.includes('numericAnswer:'), 'cbtData.ts phải cấu hình numericAnswer cho Phần III');
});

test('Phase 16 - 3. CbtPracticeModal.tsx: Bộ Điều Hướng 3 Phân Khu, Tactile Đúng/Sai, Bàn Phím Ảo & Quy Chế Điểm Bộ GD&ĐT', () => {
  const modal = read('src/components/exam/CbtPracticeModal.tsx');

  assert.ok(modal.includes('/* Bản quyền trí tuệ thuộc về BroAmStuck */'), 'CbtPracticeModal.tsx phải có bản quyền BroAmStuck dòng 1');
  assert.ok(modal.includes('card-hard'), 'CbtPracticeModal.tsx phải sử dụng class .card-hard');
  assert.ok(modal.includes('rounded-[16px]'), 'CbtPracticeModal.tsx phải sử dụng bo góc rounded-[16px]');

  assert.ok(modal.includes('Phần I: 4 Lựa chọn'), 'Phải có nhãn điều hướng Phần I');
  assert.ok(modal.includes('Phần II: Đúng/Sai (4 ý)'), 'Phải có nhãn điều hướng Phần II');
  assert.ok(modal.includes('Phần III: Điền số thực'), 'Phải có nhãn điều hướng Phần III');

  assert.ok(modal.includes('handleSelectTrueFalse'), 'Phải có hàm xử lý chọn Đúng/Sai');
  assert.ok(modal.includes('Đúng'), 'Phải có nút xúc giác Đúng');
  assert.ok(modal.includes('Sai'), 'Phải có nút xúc giác Sai');
  assert.ok(modal.includes('0.1') && modal.includes('0.25') && modal.includes('0.5') && modal.includes('1.0'), 'Phải tính điểm Phần II quy chế Bộ GD&ĐT: 0.1 - 0.25 - 0.5 - 1.0');

  assert.ok(modal.includes('handleKeypadPress'), 'Phải có hàm xử lý bàn phím số tactile ảo');
  assert.ok(modal.includes('Xoá ký tự lùi') || modal.includes('backspace'), 'Phải có chức năng xoá ký tự trên bàn phím ảo');

  assert.ok(modal.includes('StepSolutionAccordion'), 'Phải import và sử dụng StepSolutionAccordion');
  assert.ok(modal.includes('Xem Lời Giải Chi Tiết Từng Bước'), 'Phải có nút xem giải thích chi tiết từng bước');
  assert.ok(modal.includes('Bảng Tổng Kết Kết Quả CBT'), 'Phải có dashboard tổng kết Calm EdTech');
});

test('Phase 16 - 4. ExamVaultView.tsx: Bộ Lọc Đề Thi Đánh Giá Năng Lực & Huy Hiệu .card-hard', () => {
  const vault = read('src/components/views/ExamVaultView.tsx');

  assert.ok(vault.includes('/* Bản quyền trí tuệ thuộc về BroAmStuck */'), 'ExamVaultView.tsx phải có bản quyền BroAmStuck dòng 1');
  assert.ok(vault.includes('GDPT 2018 (3 Phần Chuẩn)'), 'Phải có bộ lọc GDPT 2018 (3 Phần Chuẩn)');
  assert.ok(vault.includes('ĐGNL HSA (ĐHQG Hà Nội)'), 'Phải có bộ lọc ĐGNL HSA');
  assert.ok(vault.includes('ĐGNL V-ACT (ĐHQG TP.HCM)'), 'Phải có bộ lọc ĐGNL V-ACT');
  assert.ok(vault.includes('ĐGTD TSA (Bách Khoa Hà Nội)'), 'Phải có bộ lọc ĐGTD TSA');

  assert.ok(vault.includes('getExamStructureBadge'), 'Phải có hàm tính toán huy hiệu cấu trúc đề thi');
  assert.ok(vault.includes('card-hard rounded-[16px]'), 'Thẻ đề thi phải mang huy hiệu .card-hard rounded-[16px]');
  assert.ok(vault.includes('Luyện Thi Ngay') && vault.includes('Bắt Đầu Thi CBT'), 'Thẻ đề thi phải có lời gọi hành động Luyện Thi Ngay');
});

test('Phase 16 - 5. Kỷ luật mã nguồn tuyệt đối: 0 comment trong mã JS/TS & 0 emoji', () => {
  const filesToCheck = [
    'src/components/exam/CbtPracticeModal.tsx',
    'src/components/exam/cbtData.ts',
    'src/components/views/ExamVaultView.tsx',
    'src/types/index.ts',
  ];

  filesToCheck.forEach((filePath) => {
    const content = read(filePath);
    const lines = content.split('\n');

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();
      if (lineIdx === 0 && trimmed.startsWith('/* Bản quyền trí tuệ thuộc về BroAmStuck */')) {
        return;
      }
      assert.ok(
        !trimmed.startsWith('//'),
        `Tệp ${filePath} dòng ${lineIdx + 1} không được chứa single-line comment: ${trimmed}`,
      );
    });

    for (let i = 0; i < content.length; i++) {
      const code = content.codePointAt(i) || 0;
      const isEmoji =
        (code >= 0x1f300 && code <= 0x1faff) ||
        (code >= 0x2600 && code <= 0x27bf) ||
        (code >= 0x1f600 && code <= 0x1f64f) ||
        (code >= 0x1f680 && code <= 0x1f6ff);
      assert.ok(!isEmoji, `Tệp ${filePath} không được chứa emoji tại vị trí ${i}`);
    }
  });
});
