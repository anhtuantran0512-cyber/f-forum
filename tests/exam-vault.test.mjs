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
  assert.ok(
    app.includes('isScrollableView') && app.includes("'exam-vault'"),
    'App.tsx must include exam-vault in isScrollableView to avoid layout scroll lock',
  );
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

test('11. Hoàn thiện Kho Đề Thi: Đồng bộ đa tab, Deep link URL, Nháp Q&A & Layout Responsive', () => {
  const tsx = read('src/components/views/ExamVaultView.tsx');

  /* Multi-tab storage sync */
  assert.ok(tsx.includes("addEventListener('storage'"), 'Must register storage listener for multi-tab sync');

  /* Deep linking URL parameter parsing */
  assert.ok(tsx.includes('URLSearchParams'), 'Must parse URL parameters for deep linking');
  assert.ok(tsx.includes('params.get(\'id\')') || tsx.includes('params.get("id")'), 'Must support ?id= deep link');

  /* Q&A draft integration */
  assert.ok(tsx.includes('fforum_draft_ask'), 'Must pre-populate fforum_draft_ask when navigating to Q&A');

  /* Multiline peer reviews */
  assert.ok(tsx.includes('<textarea'), 'Peer review input must support multiline textarea');
  assert.ok(tsx.includes('whitespace-pre-line'), 'Peer reviews must display with whitespace-pre-line formatting');

  /* Responsive mobile grid in modal */
  assert.ok(tsx.includes('grid-cols-1 sm:grid-cols-2'), 'Submission modal must use responsive 2-column grid');
  assert.ok(tsx.includes('grid-cols-1 sm:grid-cols-3'), 'Submission modal must use responsive 3-column grid');
});

test('12. Interactive CBT Practice Mode: Ngân hàng câu hỏi, chọn A/B/C/D, ma trận kiến thức & tính điểm tức thì', async () => {
  const cbtData = read('src/components/exam/cbtData.ts');
  const cbtModal = read('src/components/exam/CbtPracticeModal.tsx');
  const types = read('src/types/index.ts');

  /* Type contracts */
  assert.ok(types.includes('export interface ExamCBTOption'), 'Must define ExamCBTOption');
  assert.ok(types.includes('export interface ExamCBTQuestion'), 'Must define ExamCBTQuestion');
  assert.ok(types.includes('export interface CBTResult'), 'Must define CBTResult');

  /* CBT Data and fallback generation */
  assert.ok(cbtData.includes('SEED_CBT_QUESTIONS'), 'Must define seed CBT questions for curriculum exams');
  assert.ok(cbtData.includes('getExamCBTQuestions'), 'Must export getExamCBTQuestions helper');

  /* Modal capabilities */
  assert.ok(cbtModal.includes('CBT_HISTORY_KEY'), 'Must define CBT history storage key');
  assert.ok(cbtModal.includes('secondsLeft'), 'Must track countdown timer in seconds');
  assert.ok(cbtModal.includes('topicBreakdown'), 'Must compute knowledge topic breakdown');
  assert.ok(cbtModal.includes('difficultyBreakdown'), 'Must compute cognitive level difficulty breakdown');
  assert.ok(cbtModal.includes('calculateResult'), 'Must calculate 10-point scale result');
  assert.ok(cbtModal.includes('showReviewMode'), 'Must provide answer review with detailed explanations');

  /* Functional verification using node import */
  const { getExamCBTQuestions } = await import('../src/components/exam/cbtData.ts');
  const mockPaper = {
    id: 'ex-01',
    title: 'Đề thi Toán 12',
    subject: 'Toán học',
    grade: 12,
    examType: 'Đề giữa kỳ 1',
    duration: 90,
  };
  const qs = getExamCBTQuestions(mockPaper);
  assert.ok(Array.isArray(qs) && qs.length >= 4, 'Must return at least 4 CBT questions for mock exam');
  qs.forEach((q) => {
    assert.ok(q.question && q.options.length === 4, 'Each question must have 4 options');
    assert.ok(['A', 'B', 'C', 'D'].includes(q.correctAnswer), 'Correct answer must be A, B, C, or D');
    assert.ok(q.topic && q.difficulty, 'Question must have topic and cognitive difficulty');
  });
});

test('13. Exam Bookmarking / Yêu Thích Drawer: Quản lý đề đã lưu, lọc tìm kiếm & thi thử trực tiếp', () => {
  const drawer = read('src/components/exam/ExamBookmarkDrawer.tsx');
  const vault = read('src/components/views/ExamVaultView.tsx');

  /* Drawer integration in ExamVaultView */
  assert.ok(vault.includes('ExamBookmarkDrawer'), 'ExamVaultView must import and render ExamBookmarkDrawer');
  assert.ok(vault.includes('isBookmarkDrawerOpen'), 'ExamVaultView must manage isBookmarkDrawerOpen state');
  assert.ok(vault.includes('handleClearAllBookmarks'), 'ExamVaultView must provide clear all bookmarks action');
  assert.ok(vault.includes('handleRemoveBookmark'), 'ExamVaultView must provide remove single bookmark action');

  /* Drawer UI components */
  assert.ok(drawer.includes('onStartCBT'), 'Drawer must support launching CBT practice directly');
  assert.ok(drawer.includes('onSelectPreview'), 'Drawer must support quick preview');
  assert.ok(drawer.includes('onOpenPrint'), 'Drawer must support print modal trigger');
  assert.ok(drawer.includes('filteredSavedPapers'), 'Drawer must support search and filtering within saved list');
  assert.ok(drawer.includes('animate-slide-left'), 'Drawer must use silky smooth 60 FPS slide-left animation');
});

test('14. Offline / Cache Indicators & Export / Print Formatting Options for Study Papers', async () => {
  const offlineModule = read('src/components/exam/offlineStorage.ts');
  const printModal = read('src/components/exam/ExamPrintExportModal.tsx');
  const vaultCss = read('src/components/views/ExamVaultView.css');
  const vaultTsx = read('src/components/views/ExamVaultView.tsx');

  /* Offline Storage logic */
  assert.ok(offlineModule.includes('OFFLINE_EXAMS_CACHE_KEY'), 'Must define offline cache key');
  assert.ok(offlineModule.includes('cacheExamOffline'), 'Must export cacheExamOffline');
  assert.ok(offlineModule.includes('isExamCachedOffline'), 'Must export isExamCachedOffline');
  assert.ok(offlineModule.includes('removeExamFromOfflineCache'), 'Must export removeExamFromOfflineCache');

  /* Offline UI Indicators */
  assert.ok(vaultTsx.includes('cachedExamIds'), 'Must track cachedExamIds state in Vault');
  assert.ok(vaultTsx.includes('handleToggleOfflineCache'), 'Must handle offline cache toggling');
  assert.ok(vaultTsx.includes('isOnline'), 'Must monitor online/offline network status');
  assert.ok(vaultCss.includes('.ff-cached-pill'), 'CSS must define .ff-cached-pill styles');

  /* Print and Export Options Modal */
  assert.ok(printModal.includes('window.print()'), 'Must trigger native window.print()');
  assert.ok(printModal.includes('columns'), 'Must support 1-column and 2-column layout options');
  assert.ok(printModal.includes('fontSize'), 'Must support font size adjustments');
  assert.ok(printModal.includes('includeSolutions'), 'Must support hiding/showing answers and solutions');
  assert.ok(printModal.includes('includeStudentHeader'), 'Must support official student header & score box');

  /* Printable CSS styling */
  assert.ok(vaultCss.includes('@media print'), 'CSS must include @media print stylesheet rules');
  assert.ok(vaultCss.includes('#ff-printable-exam-paper'), 'CSS must isolate #ff-printable-exam-paper during print');
});

test('15. Kỷ luật mã nguồn tuyệt đối: Zero // Comments, Bản quyền BroAmStuck & Zero Emojis', () => {
  const files = [
    'src/components/views/ExamVaultView.tsx',
    'src/components/views/ExamVaultView.css',
    'src/components/exam/cbtData.ts',
    'src/components/exam/offlineStorage.ts',
    'src/components/exam/CbtPracticeModal.tsx',
    'src/components/exam/ExamBookmarkDrawer.tsx',
    'src/components/exam/ExamPrintExportModal.tsx',
  ];

  files.forEach((file) => {
    const content = read(file);
    assert.ok(
      content.startsWith('/* Bản quyền trí tuệ thuộc về BroAmStuck */'),
      `${file} must have intellectual property copyright header`,
    );

    /* Zero single line // comments in functional code */
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      assert.ok(
        !trimmed.startsWith('//'),
        `${file} line ${idx + 1} must not contain single-line comment: ${line}`,
      );
    });

    /* Zero emojis in component files */
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert.ok(!emojiRegex.test(content), `${file} must not contain emoji characters (use Lucide icons)`);
  });
});



