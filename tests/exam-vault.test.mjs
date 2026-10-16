/* Bản quyền trí tuệ thuộc về BroAmStuck */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  examAttachmentFormat,
  formatExamFileSize,
  isSupportedExamAttachment,
} from '../src/utils/examAttachments.ts';

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

test('5. Quy trình đóng góp đề thi & duyệt đề: tải tệp lên máy chủ và lưu trạng thái chờ duyệt', () => {
  const tsx = read('src/components/views/ExamVaultView.tsx');
  const api = read('src/utils/examSubmissionApi.ts');
  const server = read('server/forumServer.ts');

  assert.ok(tsx.includes('SUBMISSIONS_KEY'), 'Must define submissions storage key');
  assert.ok(tsx.includes('fforum_exam_submissions'), 'Must use persistent storage key fforum_exam_submissions');
  assert.ok(tsx.includes('isSubmitModalOpen'), 'Must have upload submission modal state');
  assert.ok(tsx.includes('.jpg,.jpeg,.png,.webp,.gif,.avif'), 'Submission must accept common image formats');
  assert.ok(tsx.includes('.pdf,.docx,.doc,.md,.markdown'), 'Submission must accept PDF, DOC/DOCX, and Markdown');
  assert.ok(tsx.includes('multiple'), 'Students must be able to attach multiple pages/files');
  assert.ok(api.includes('submitExamPaper') && api.includes('dataUrl: await readFileAsDataUrl(file)'), 'Selected file bytes must be uploaded, not only stored as metadata');
  assert.ok(server.includes("examSubmissionPath === '/api/exam-submissions'"), 'Server must persist exam submissions');
  assert.ok(server.includes('storeExamSubmissionAttachments'), 'Server must validate and store attachment bytes');
  assert.ok(server.includes('examSubmissionAttachmentPath'), 'Server must serve stored attachments through an authorized route');
  assert.ok(tsx.includes('submissionStorageKey'), 'Submission status cache must be scoped to the signed-in account');
  assert.ok(server.includes("status: 'pending'"), 'Server submissions start in a pending review state');
  assert.ok(tsx.includes('handleApproveSubmission'), 'Admin must have approve action');
  assert.ok(tsx.includes('handleRejectSubmission'), 'Admin must have reject action');
});

test('5a. Định dạng tệp đề: ảnh, PDF, DOCX/DOC và Markdown được phân loại chính xác', () => {
  const cases = [
    [{ name: 'scan.webp', type: 'image/webp' }, 'IMAGE'],
    [{ name: 'semester.pdf', type: 'application/pdf' }, 'PDF'],
    [{ name: 'answer.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }, 'DOCX'],
    [{ name: 'notes.md', type: 'text/plain' }, 'MD'],
  ];

  cases.forEach(([file, expected]) => {
    assert.equal(isSupportedExamAttachment(file), true, `${file.name} must be accepted`);
    assert.equal(examAttachmentFormat(file), expected, `${file.name} must be classified correctly`);
  });
  assert.equal(isSupportedExamAttachment({ name: 'payload.exe', type: 'application/octet-stream' }), false);
  assert.equal(formatExamFileSize(1024 * 1024), '1.0 MB');
});

test('6. Tương tác nhanh: xem trước, xuất PDF thật và lưu đề', () => {
  const tsx = read('src/components/views/ExamVaultView.tsx');
  const printModal = read('src/components/exam/ExamPrintExportModal.tsx');

  assert.ok(tsx.includes('previewExam'), 'Must support previewing exam paper');
  assert.ok(tsx.includes('onClick={(e) => handleToggleLike(paper.id, e)}'), 'Like button must call the anti-spam toggle handler');
  assert.ok(tsx.includes('openExamViewer(paper.id)') && tsx.includes('<span>Đọc đề</span>'), 'Selecting or previewing a paper must open its dedicated reader page');
  assert.ok(tsx.includes('target="_blank"') && tsx.includes('view=exam-viewer'), 'Reader links must open in a separate tab and include the paper route');
  assert.ok(tsx.includes('handleDownload(paper, e)') && tsx.includes('<span>Xuất PDF</span>'), 'PDF button must open the export flow');
  assert.ok(tsx.includes("closest('button, a, input, select, textarea')"), 'Card clicks must not swallow action-button clicks');
  assert.ok(tsx.includes('onPrint={() => showToast('), 'PDF export may confirm the print action without inventing download metrics');
  assert.ok(printModal.includes('window.print()'), 'Export must open the browser print dialog so Save as PDF works');
  assert.ok(!tsx.includes('downloadProgress'), 'Do not fake a download with a progress-only animation');
  assert.ok(tsx.includes('handleToggleBookmark'), 'Must support bookmarking / saving exam papers');
  assert.ok(tsx.includes('SAVED_EXAMS_KEY'), 'Must define saved exams storage key');
});

test('7. Tích hợp thanh điều hướng Navbar, App shell & HomeView', () => {
  const navbar = read('src/components/Navbar.tsx');
  const app = read('src/App.tsx');
  const home = read('src/components/views/HomeView.tsx');

  assert.ok(navbar.includes("'exam-vault'"), 'Navbar must have exam-vault dock item');
  assert.ok(app.includes("currentView === 'exam-vault'"), 'App.tsx must conditionally render ExamVaultView');
  assert.ok(app.includes("currentView === 'exam-viewer'"), 'App.tsx must mount the separate exam reader route');
  assert.ok(app.includes('ExamPaperViewerView'), 'App.tsx must import the exam reader');
  const store = read('src/store/forumStore.ts');
  assert.ok(store.includes("requestedView === 'exam-viewer'"), 'Deep links must initialize directly into the dedicated reader');
  assert.ok(app.includes("'exam-viewer'"), 'The standalone reader must use the app shell route');
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
    flashlight.includes('SHARED_BEAM_EVENT') && flashlight.includes('latestSharedBeam'),
    'The first registration field must receive the real confirmation-field beam',
  );
  assert.ok(
    !flashlight.includes('rect.right - 40'),
    'A field without a button must never invent a second virtual torch',
  );
});

test('9. Tương tác Kho Đề Thi: mức độ khó và dữ liệu cộng đồng có nguồn máy chủ', () => {
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

  /* Community interaction APIs */
  const api = read('src/utils/examSubmissionApi.ts');
  const server = read('server/forumServer.ts');
  assert.ok(api.includes('fetchExamInteractions') && api.includes('setExamLike'), 'Community data and likes must use API calls');
  assert.ok(api.includes('rateExamPaper') && api.includes('submitExamReview'), 'Ratings and reviews must use API calls');
  assert.ok(server.includes("'/api/exam-interactions'"), 'Server must expose a public snapshot for public papers');
  assert.ok(server.includes('examInteractionLimiter') && server.includes('examReviewLimiter'), 'Server must rate-limit account interaction requests');
  assert.ok(!tsx.includes('DOWNLOAD_COUNTS_KEY') && !tsx.includes('USER_RATINGS_KEY') && !tsx.includes('PEER_REVIEWS_KEY'), 'Community values must not be persisted as local client metrics');
  assert.ok(!tsx.includes('paper.downloads') && !tsx.includes('paper.views'), 'Cards must not show unavailable download/view counters');
  const seedData = read('src/components/exam/seedExamPapers.ts');
  const seedStart = seedData.indexOf('export const SEED_EXAMS: ExamPaper[] = [');
  assert.doesNotMatch(seedData.slice(seedStart), /\n\s+(?:fileSize|downloads|views|likes|pageCount|duration|rating|ratingCount|peerReviews):/, 'Seed papers must not carry fabricated engagement or availability metrics');
  const viewer = read('src/components/views/ExamPaperViewerView.tsx');
  assert.ok(viewer.includes("format === 'PDF' ?") && viewer.includes('examAttachmentUrl(activePaperId, selectedAttachment, true)'), 'Uploaded PDFs must be rendered inline in the dedicated reader');
  assert.ok(viewer.includes('format === \'DOCX\'') || viewer.includes('DOCX'), 'Word attachments must have a clear viewing/download path');
  const paperConverter = server.slice(server.indexOf('function examSubmissionToPaper'), server.indexOf('/** Miền email', server.indexOf('function examSubmissionToPaper')));
  assert.doesNotMatch(paperConverter, /(?:downloads|views|likes|pageCount):\s*0/, 'Server must not assign placeholder counters to submitted papers');
  assert.ok(tsx.includes('handleRateExam'), 'Must support authenticated rating actions');

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
  assert.ok(tsx.includes('submitExamReview'), 'Review submissions must call the server API');
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
  assert.ok(read('src/components/views/ExamVaultView.css').includes('white-space: pre-line'), 'Peer reviews must preserve multiline formatting');

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

  /* Check that all 10 seed exams (ex-01 to ex-10) are defined in SEED_CBT_QUESTIONS */
  ['ex-01', 'ex-02', 'ex-03', 'ex-04', 'ex-05', 'ex-06', 'ex-07', 'ex-08', 'ex-09', 'ex-10'].forEach((id) => {
    assert.ok(cbtData.includes(`'${id}': [`), `SEED_CBT_QUESTIONS must cover seed exam ${id}`);
  });

  /* Modal capabilities */
  assert.ok(cbtModal.includes('CBT_HISTORY_KEY'), 'Must define CBT history storage key');
  assert.ok(cbtModal.includes('secondsLeft'), 'Must track countdown timer in seconds');
  assert.ok(cbtModal.includes('topicBreakdown'), 'Must compute knowledge topic breakdown');
  assert.ok(cbtModal.includes('difficultyBreakdown'), 'Must compute cognitive level difficulty breakdown');
  assert.ok(cbtModal.includes('calculateResult'), 'Must calculate 10-point scale result');
  assert.ok(cbtModal.includes('finalizeSubmit'), 'Must use unified finalizeSubmit helper');
  assert.ok(cbtModal.includes('showReviewMode'), 'Must provide answer review with detailed explanations');
  assert.ok(cbtModal.includes('ring-2 ring-amber-400'), 'Must highlight active question button in review mode palette');

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

  /* Verify fallback question generator distributes answers across A, B, C, D */
  const fallbackPaper = {
    id: 'custom-unseeded-exam',
    title: 'Đề thi tuỳ biến',
    subject: 'Vật lý',
    grade: 11,
    examType: 'Khảo sát chất lượng',
    sampleQuestions: ['Câu 1: Câu hỏi 1', 'Câu 2: Câu hỏi 2', 'Câu 3: Câu hỏi 3', 'Câu 4: Câu hỏi 4'],
  };
  const fallbackQs = getExamCBTQuestions(fallbackPaper);
  const distinctAnswers = new Set(fallbackQs.map((q) => q.correctAnswer));
  assert.ok(distinctAnswers.size > 1, 'Fallback question generator must diversify answers across options (not always A)');
});

test('12a. Likes, ratings và reviews không thể bị tăng giả bằng localStorage', () => {
  const vault = read('src/components/views/ExamVaultView.tsx');
  const api = read('src/utils/examSubmissionApi.ts');
  const server = read('server/examInteractions.ts');
  assert.ok(vault.includes('aria-pressed={isLiked}'), 'Heart state must be announced accessibly');
  assert.ok(vault.includes('setExamLike(paperId, !currentLike)'), 'Like state must be changed by a server request');
  assert.ok(vault.includes('pendingInteractionIds'), 'Community controls must reflect pending network activity');
  assert.ok(vault.includes('reviewRequestIdsRef.current.has(paperId)'), 'A synchronous guard must stop duplicate review requests while pending');
  assert.ok(api.includes("'/api/exam-interactions'"), 'Client must fetch authoritative community snapshots');
  assert.ok(server.includes('new Set(record.likes).size'), 'Like count must be deduplicated by account');
  assert.ok(server.includes('record.ratings[review.authorId] = review.rating'), 'A review can replace only that account’s single rating');
  assert.ok(!vault.includes("addEventListener('storage'") || !vault.slice(vault.indexOf("addEventListener('storage'")).includes('EXAM_LIKES_KEY'), 'Community metrics must not sync through localStorage events');
  assert.ok(!vault.includes('likesOverrides'), 'Like counts must not be stored as unbounded numeric overrides');
});

test('13. Exam Bookmarking / Yêu Thích Drawer: quản lý đề đã lưu, tìm nhanh & in tài liệu', () => {
  const drawer = read('src/components/exam/ExamBookmarkDrawer.tsx');
  const vault = read('src/components/views/ExamVaultView.tsx');

  /* Drawer integration in ExamVaultView */
  assert.ok(vault.includes('ExamBookmarkDrawer'), 'ExamVaultView must import and render ExamBookmarkDrawer');
  assert.ok(vault.includes('isBookmarkDrawerOpen'), 'ExamVaultView must manage isBookmarkDrawerOpen state');
  assert.ok(vault.includes('handleClearAllBookmarks'), 'ExamVaultView must provide clear all bookmarks action');
  assert.ok(vault.includes('handleRemoveBookmark'), 'ExamVaultView must provide remove single bookmark action');
  assert.ok(vault.includes('cachedExamIds={cachedExamIds}'), 'ExamVaultView must pass cachedExamIds to drawer');
  assert.ok(!vault.includes('Thi thử'), 'Exam cards and preview must not expose a Thi thử CTA');
  assert.ok(!vault.includes('Lưu Offline'), 'Exam cards and preview must not expose an Offline save CTA');

  /* Drawer UI keeps relevant actions but removes CBT CTA as requested */
  assert.ok(!drawer.includes('onStartCBT'), 'Drawer must not expose a Thi thử launch action');
  assert.ok(!drawer.includes('Thi thử CBT'), 'Drawer must not render a Thi thử button');
  assert.ok(vault.includes('onSelectPreview'), 'Vault must keep quick preview in the saved drawer');
  assert.ok(drawer.includes('onOpenPrint'), 'Drawer must support print modal trigger');
  assert.ok(drawer.includes('filteredSavedPapers'), 'Drawer must support search and filtering within saved list');
  assert.ok(drawer.includes('animate-slide-left'), 'Drawer must use silky smooth 60 FPS slide-left animation');
  assert.ok(drawer.includes('cachedExamIds'), 'Drawer must support showing offline cached status');
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

  /* Offline UI Indicators & Multi-tab Storage Sync */
  assert.ok(vaultTsx.includes('cachedExamIds'), 'Must track cachedExamIds state in Vault');
  assert.ok(!vaultTsx.includes('handleToggleOfflineCache'), 'The Offline action button and toggle handler must be removed');
  assert.ok(!vaultTsx.includes('Lưu Offline'), 'The preview modal must not expose an Offline save button');
  assert.ok(vaultTsx.includes('isOnline'), 'Must monitor online/offline network status');
  assert.ok(vaultTsx.includes('OFFLINE_EXAMS_CACHE_KEY'), 'Must synchronize OFFLINE_EXAMS_CACHE_KEY across tabs');
  assert.ok(vaultTsx.includes("activeTab === 'cached'"), 'Must support filtering to offline cached exams');
  assert.ok(vaultTsx.includes('hasHandledDeepLinkRef'), 'Must prevent deep link repeated trigger loop');
  assert.ok(vaultTsx.includes('document.body.style.overflow'), 'Must lock body scroll during modal open to avoid layout shift');
  assert.ok(vaultTsx.includes('createPortal') && printModal.includes('createPortal'), 'Dialogs must render at the document root to avoid route clipping');
  assert.ok(vaultCss.includes('.ff-exam-dialog-panel') && vaultCss.includes('100dvh'), 'All dialog panels must stay within the dynamic viewport');
  assert.ok(vaultCss.includes('.ff-cached-pill'), 'CSS must define .ff-cached-pill styles');

  /* Print and Export Options Modal */
  assert.ok(printModal.includes('window.print()'), 'Must trigger native window.print()');
  assert.ok(printModal.includes('columns'), 'Must support 1-column and 2-column layout options');
  assert.ok(printModal.includes('data-columns'), 'Must mark data-columns for print layout enforcement');
  assert.ok(printModal.includes('fontSize'), 'Must support font size adjustments');
  assert.ok(printModal.includes('includeSolutions'), 'Must support hiding/showing answers and solutions');
  assert.ok(printModal.includes('includeStudentHeader'), 'Must support official student header & score box');
  assert.ok(!printModal.includes('paper.duration || 60'), 'Print preview must not invent a 60-minute limit when source metadata is absent');
  assert.ok(read('src/components/exam/CbtPracticeModal.tsx').includes('Bộ đếm mặc định · 45 phút'), 'A practice-only timer default must be clearly distinguished from original paper metadata');

  /* Printable CSS styling */
  assert.ok(vaultCss.includes('@media print'), 'CSS must include @media print stylesheet rules');
  assert.ok(vaultCss.includes('#ff-printable-exam-paper'), 'CSS must isolate #ff-printable-exam-paper during print');
  assert.ok(vaultCss.includes('break-inside-avoid'), 'CSS must define break-inside-avoid to prevent page break clipping');
  assert.ok(vaultCss.includes('data-columns="2"'), 'CSS must style 2-column layout for print');
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
    'src/utils/examAttachments.ts',
    'src/utils/examSubmissionApi.ts',
    'server/examInteractions.ts',
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

test('16. QA dùng cuộn toàn trang, nền cố định và thẻ ảo giữ đúng chiều cao', () => {
  const app = read('src/App.tsx');
  const qa = read('src/components/views/QAForumView.tsx');
  const exam = read('src/components/views/ExamVaultView.tsx');
  const examCss = read('src/components/views/ExamVaultView.css');

  assert.ok(app.includes("currentView === 'qa' ||"), 'QA phải dùng cùng mô hình cuộn toàn trang với Kho Đề');
  assert.ok(app.includes('isScrollableView ? \'min-h-screen\' : \'h-full\''), 'Trang cuộn không bị khóa trong khung cao cố định');
  assert.ok(app.includes('              isEmbedded\n'), 'QA route phải bỏ cuộn lồng bên trong');
  assert.ok(qa.includes('ff-qa-bg ff-raw-grid-surface fixed'), 'Nền QA phải đứng yên khi cuộn');
  assert.ok(qa.includes('questionHeightCacheRef'), 'Thẻ ảo phải giữ chiều cao đã đo để tránh nhảy trang');
  assert.ok(qa.includes('window.scrollTo({ top: savedListScrollTopRef.current'), 'Đóng chi tiết phải khôi phục vị trí cuộn');
  assert.ok(exam.includes('aria-expanded={isAdvancedFiltersOpen}'), 'Bộ lọc phụ phải có trạng thái truy cập được');
  assert.ok(!exam.includes('sticky top-0 z-40'), 'Header Kho Đề không được che nội dung khi cuộn');
  assert.ok(exam.includes('activeTab === \'syllabus\' ?'), 'Đầu trang phải nhận diện rõ chế độ đề cương');
  assert.ok(exam.includes('ff-exam-card-actions grid grid-cols-2 gap-2 sm:grid-cols-4'), 'Nút thao tác đề phải nằm trong lưới gọn responsive');
  assert.ok(exam.includes('getCompactPaperTitle'), 'Thẻ đề phải rút gọn tiêu đề lặp');
  assert.ok(examCss.includes('.ff-exam-filter-panel'), 'Bộ lọc dùng một bề mặt thống nhất');
  assert.ok(exam.includes('pointermove') && examCss.includes('.ff-exam-vault::before'), 'Kho Đề phải có parallax nền tinh tế');
  assert.ok(examCss.includes('prefers-reduced-motion: reduce'), 'Parallax phải tắt khi người dùng giảm chuyển động');
});
