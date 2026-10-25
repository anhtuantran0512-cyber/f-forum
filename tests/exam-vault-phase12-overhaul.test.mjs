import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function read(relPath) {
  return fs.readFileSync(path.resolve(relPath), 'utf8');
}

test('Phase 12 - 1. StepSolutionAccordion: Bản quyền, 0 // Comments, 0 Emojis & Cấu trúc 3 bước', () => {
  const content = read('src/components/exam/StepSolutionAccordion.tsx');
  const lines = content.split('\n');

  assert.equal(
    lines[0].trim(),
    '/* Bản quyền trí tuệ thuộc về BroAmStuck */',
    'Dòng 1 StepSolutionAccordion.tsx phải chứa bản quyền BroAmStuck',
  );

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    assert.ok(
      !line.startsWith('//'),
      `StepSolutionAccordion.tsx không được có single-line comment ở dòng ${i + 1}: ${line}`,
    );
  }

  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  for (let i = 0; i < lines.length; i++) {
    assert.ok(
      !emojiRegex.test(lines[i]),
      `StepSolutionAccordion.tsx không được có emoji ở dòng ${i + 1}: ${lines[i]}`,
    );
  }

  assert.ok(content.includes('export const StepSolutionAccordion'), 'Phải export component StepSolutionAccordion');
  assert.ok(content.includes('Mở Bước Tiếp Theo'), 'Phải có nút bấm xúc giác 3D Mở Bước Tiếp Theo');
  assert.ok(content.includes('Gợi Ý Công Thức Trọng Tâm'), 'Phải có Thẻ Gợi Ý Công Thức Trọng Tâm');
  assert.ok(content.includes('Bước 1: Phân tích đề'), 'Phải hỗ trợ Bước 1: Phân tích đề');
  assert.ok(content.includes('Bước 2: Thiết lập phương trình'), 'Phải hỗ trợ Bước 2: Thiết lập phương trình');
  assert.ok(content.includes('Bước 3: Biện luận kết quả'), 'Phải hỗ trợ Bước 3: Biện luận kết quả');
});

test('Phase 12 - 2. ExamVaultView: Hệ Thống Phân Luồng 12 Môn Học, Ma Trận Tư Duy 2027 & Thẻ Đề Tinh Hoa', () => {
  const content = read('src/components/views/ExamVaultView.tsx');
  const lines = content.split('\n');

  assert.equal(
    lines[0].trim(),
    '/* Bản quyền trí tuệ thuộc về BroAmStuck */',
    'Dòng 1 ExamVaultView.tsx phải chứa bản quyền BroAmStuck',
  );

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    assert.ok(
      !line.startsWith('//'),
      `ExamVaultView.tsx không được có single-line comment ở dòng ${i + 1}: ${line}`,
    );
  }

  assert.ok(!content.includes('Thi thử'), 'Tuyệt đối KHÔNG được chứa chuỗi "Thi thử"');
  assert.ok(!content.includes('Lưu Offline'), 'Tuyệt đối KHÔNG được chứa chuỗi "Lưu Offline"');

  const subjects = [
    'Toán học', 'Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý',
    'Ngữ văn', 'Tiếng Anh', 'Tin học', 'Triết học', 'Thiên văn', 'Nghệ thuật'
  ];
  for (const subj of subjects) {
    assert.ok(content.includes(subj), `ExamVaultView phải hỗ trợ môn ${subj} đồng bộ Phòng Truyền Thống`);
  }

  assert.ok(content.includes('card-hard rounded-[14px]'), 'Thẻ môn học phải có chuẩn card-hard rounded-[14px]');
  assert.ok(content.includes('Nhận biết'), 'Ma trận tư duy phải có Nhận biết');
  assert.ok(content.includes('Thông hiểu'), 'Ma trận tư duy phải có Thông hiểu');
  assert.ok(content.includes('Vận dụng'), 'Ma trận tư duy phải có Vận dụng');
  assert.ok(content.includes('Vận dụng cao'), 'Ma trận tư duy phải có Vận dụng cao');

  assert.ok(content.includes('sĩ tử đã hoàn thành'), 'Thẻ đề thi phải hiển thị số lượng sĩ tử đã hoàn thành');
  assert.ok(content.includes('Điểm Uy Tín'), 'Thẻ đề thi phải hiển thị Điểm Uy Tín Học Thuật thưởng');
  assert.ok(content.includes('Bắt Đầu Thi CBT'), 'Thẻ đề thi phải có nút Feastables 3D Bắt Đầu Thi CBT');
  assert.ok(content.includes('btn-feastables'), 'Nút thi CBT phải dùng style Feastables 3D tactile');
});

test('Phase 12 - 3. Tích hợp StepSolutionAccordion vào ThreadsView và QAForumView', () => {
  const threadsContent = read('src/components/views/ThreadsView.tsx');
  const qaContent = read('src/components/views/QAForumView.tsx');

  assert.ok(
    threadsContent.includes('StepSolutionAccordion'),
    'ThreadsView.tsx phải import và sử dụng StepSolutionAccordion',
  );
  assert.ok(
    qaContent.includes('StepSolutionAccordion'),
    'QAForumView.tsx phải import và sử dụng StepSolutionAccordion',
  );
  assert.ok(
    qaContent.includes('Chèn mẫu 3 bước giải chuẩn'),
    'QAForumView.tsx phải có nút chèn mẫu 3 bước giải chuẩn',
  );
});
