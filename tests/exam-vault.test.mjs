/* Bản quyền trí tuệ thuộc về BroAmStuck */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (rel) => fs.readFileSync(path.resolve(rel), 'utf8');

test('1. Hợp đồng kiểu dữ liệu & DimensionView: exam-vault được định nghĩa đầy đủ', () => {
  const types = read('src/types/index.ts');
  assert.ok(types.includes("'exam-vault'"), 'DimensionView must include exam-vault');
  assert.ok(types.includes('export interface ExamPaper'), 'ExamPaper interface must be defined');
  assert.ok(types.includes('export type ExamType'), 'ExamType must be defined');
  ['Đề giữa kỳ 1', 'Đề giữa kỳ 2', 'Đề cuối kỳ 1', 'Đề cuối kỳ 2', 'Đề 15 phút', 'Đề cương ôn tập', 'Khảo sát chất lượng'].forEach((t) => {
    assert.ok(types.includes(t), `ExamType must include ${t}`);
  });
});

test('2. Tệp ExamVaultView.tsx & ExamVaultView.css: Bản quyền & Zero // Comments', () => {
  const tsx = read('src/components/views/ExamVaultView.tsx');
  const css = read('src/components/views/ExamVaultView.css');

  assert.ok(tsx.startsWith('/* Bản quyền trí tuệ thuộc về BroAmStuck */'), 'TSX must have intellectual property header');
  assert.ok(css.startsWith('/* Bản quyền trí tuệ thuộc về BroAmStuck */'), 'CSS must have intellectual property header');

  const tsxLines = tsx.split('\n');
  tsxLines.forEach((line, idx) => {
    const trimmed = line.trim();
    assert.ok(!trimmed.startsWith('//'), `ExamVaultView.tsx line ${idx + 1} must not contain single-line comment: ${line}`);
  });
});

test('3. Nút quay lại trang chủ góc trên bên trái: gọi onNavigate("home")', () => {
  const tsx = read('src/components/views/ExamVaultView.tsx');
  assert.ok(
    tsx.includes("onNavigate('home')"),
    'ExamVaultView must have back to home action calling onNavigate("home")',
  );
  assert.ok(
    tsx.includes('Về Trang Chủ') || tsx.includes('Trang chủ') || tsx.includes('aria-label="Quay lại trang chủ"'),
    'ExamVaultView top-left corner must have home navigation branding',
  );
});

test('4. Bộ lọc đa chiều: Khối lớp (6..12), Loại đề, Môn học, Tỉnh thành, Trường học, Năm học', () => {
  const tsx = read('src/components/views/ExamVaultView.tsx');

  assert.ok(tsx.includes('selectedGrade'), 'Must have grade filter state');
  assert.ok(tsx.includes('selectedExamType'), 'Must have exam type filter state');
  assert.ok(tsx.includes('selectedSubject'), 'Must have subject filter state');
  assert.ok(tsx.includes('selectedProvince'), 'Must have province filter state');
  assert.ok(tsx.includes('selectedSchool'), 'Must have school filter state');
  assert.ok(tsx.includes('selectedYear'), 'Must have school year filter state');
  assert.ok(tsx.includes('sortBy'), 'Must have sort order state');

  [6, 7, 8, 9, 10, 11, 12].forEach((grade) => {
    assert.ok(tsx.includes(`Lớp ${grade}`), `Must support grade ${grade}`);
  });
});

test('5. Quy trình đóng góp đề thi & duyệt đề: upload modal, lưu storage, duyệt/từ chối', () => {
  const tsx = read('src/components/views/ExamVaultView.tsx');

  assert.ok(tsx.includes('SUBMISSIONS_KEY'), 'Must define submissions storage key');
  assert.ok(tsx.includes('fforum_exam_submissions'), 'Must use persistent storage key fforum_exam_submissions');
  assert.ok(tsx.includes('isSubmitModalOpen'), 'Must have upload submission modal state');
  assert.ok(tsx.includes("status: 'pending'"), 'Student submissions start with pending status');
  assert.ok(tsx.includes('handleApproveSubmission'), 'Admin must have approve action');
  assert.ok(tsx.includes('handleRejectSubmission'), 'Admin must have reject action');
});

test('6. Tương tác nhanh: Xem thử (preview) & Tải xuống (download progress) & Lưu đề (bookmark)', () => {
  const tsx = read('src/components/views/ExamVaultView.tsx');

  assert.ok(tsx.includes('previewExam'), 'Must support previewing exam paper');
  assert.ok(tsx.includes('downloadingId'), 'Must track active downloading item');
  assert.ok(tsx.includes('downloadProgress'), 'Must show download progress animation');
  assert.ok(tsx.includes('handleToggleBookmark'), 'Must support bookmarking / saving exam papers');
  assert.ok(tsx.includes('SAVED_EXAMS_KEY'), 'Must define saved exams storage key');
});

test('7. Tích hợp thanh điều hướng Navbar, App shell & HomeView', () => {
  const navbar = read('src/components/Navbar.tsx');
  const app = read('src/App.tsx');
  const home = read('src/components/views/HomeView.tsx');

  assert.ok(navbar.includes("'exam-vault'"), 'Navbar must have exam-vault dock item');
  assert.ok(app.includes("currentView === 'exam-vault'"), 'App.tsx must conditionally render ExamVaultView');
  assert.ok(app.includes("ExamVaultView"), 'App.tsx must import ExamVaultView');
  assert.ok(home.includes("onNavigate('exam-vault')"), 'HomeView must link to exam-vault');
});

test('8. Đèn pin Cú Bông: soi sáng đồng thời cả hai ô mật khẩu', () => {
  const authModal = read('src/components/AuthModal.tsx');
  const flashlight = read('src/components/auth/FlashlightPasswordField.tsx');

  assert.ok(
    authModal.includes('mode={torchMode}'),
    'AuthModal must wire controlled torchMode to password fields',
  );
  assert.ok(
    flashlight.includes('mode?: FlashlightMode'),
    'FlashlightPasswordField must accept mode prop',
  );
  assert.ok(
    flashlight.includes('virtual lamp') || flashlight.includes('rect.right - 40'),
    'Virtual lamp source allows identical beam on field without button',
  );
});

test('9. Tương tác Kho Đề Thi Vòng 2: Mức độ khó, Đánh giá sao & Bộ đếm tải thực tế', () => {
  const tsx = read('src/components/views/ExamVaultView.tsx');
  const css = read('src/components/views/ExamVaultView.css');
  const types = read('src/types/index.ts');

  /* Difficulty contract */
  assert.ok(types.includes('export type ExamDifficulty'), 'ExamDifficulty must be defined');
  ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'].forEach((d) => {
    assert.ok(types.includes(d), `ExamDifficulty must include ${d}`);
  });
  assert.ok(css.includes('.ff-diff-badge--nhan-biet'), 'CSS must define badge for Nhận biết');
  assert.ok(css.includes('.ff-diff-badge--thong-hieu'), 'CSS must define badge for Thông hiểu');
  assert.ok(css.includes('.ff-diff-badge--van-dung'), 'CSS must define badge for Vận dụng');
  assert.ok(css.includes('.ff-diff-badge--van-dung-cao'), 'CSS must define badge for Vận dụng cao');

  /* Real-time download counter */
  assert.ok(tsx.includes('DOWNLOAD_COUNTS_KEY'), 'Must define DOWNLOAD_COUNTS_KEY');
  assert.ok(tsx.includes('downloadOverrides'), 'Must track real download overrides');

  /* Rating system */
  assert.ok(tsx.includes('USER_RATINGS_KEY'), 'Must define USER_RATINGS_KEY');
  assert.ok(tsx.includes('handleRateExam'), 'Must support rating exams');

  /* Difficulty filter */
  assert.ok(tsx.includes('selectedDifficulty'), 'Must have difficulty filter state');
  assert.ok(tsx.includes('DIFFICULTY_OPTIONS'), 'Must define DIFFICULTY_OPTIONS');
});

test('10. Hướng dẫn giải chi tiết, Phản biện học sinh (Peer Review) & Liên kết Q&A / CLB', () => {
  const tsx = read('src/components/views/ExamVaultView.tsx');
  const types = read('src/types/index.ts');

  /* Solution inspection */
  assert.ok(types.includes('export interface ExamSolutionItem'), 'ExamSolutionItem must be defined');
  assert.ok(tsx.includes('showDetailedSolutions'), 'Must have detailed solutions toggle');
  assert.ok(tsx.includes('sampleSolutions'), 'Must render sample solutions');

  /* Peer reviews */
  assert.ok(types.includes('export interface ExamPeerReview'), 'ExamPeerReview must be defined');
  assert.ok(tsx.includes('PEER_REVIEWS_KEY'), 'Must define PEER_REVIEWS_KEY');
  assert.ok(tsx.includes('handleAddPeerReview'), 'Must support submitting peer reviews');

  /* Cross community links */
  assert.ok(tsx.includes('handleDiscussInQA'), 'Must support jumping to Q&A');
  assert.ok(tsx.includes('handleShareToClub'), 'Must support sharing to Club');
});

