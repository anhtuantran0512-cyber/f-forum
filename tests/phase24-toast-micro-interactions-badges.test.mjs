import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(path.resolve(file), 'utf8');

test('Phase 24 - 1. He Thong Toast Glassmorphism 2027 & Phien Ban Vien Nang (Capsule)', () => {
  const css = read('src/index.css');
  const app = read('src/App.tsx');

  assert.ok(css.includes('.ff-toast-capsule'), 'Phai co class .ff-toast-capsule');
  assert.ok(css.includes('ffToastCapsuleIn'), 'Phai co keyframes animation ffToastCapsuleIn');
  assert.ok(css.includes('backdrop-filter: blur('), 'Phai co backdrop blur kính mờ glassmorphism');
  assert.ok(css.includes('border-radius: 9999px'), 'Dạng viên nang pill capsule bo tròn');

  assert.ok(app.includes('ff-toast-capsule'), 'App.tsx phai dung ff-toast-capsule');
  assert.ok(app.includes('rounded-full'), 'App.tsx toast phai co rounded-full');
  assert.ok(app.includes('border-white/10'), 'App.tsx phai co vien tinh te border-white/10');
  assert.ok(app.includes('backdrop-blur-md'), 'App.tsx phai co backdrop-blur-md');
  assert.ok(app.includes("toastMessage.type === 'error'"), 'Bao toan render loai error cho toast');
});

test('Phase 24 - 2. Thong Bao Tuong Tac Toast Sieu Tinh Gon (<= 3 Tu)', () => {
  const store = read('src/store/forumStore.ts');
  const exam = read('src/components/views/ExamVaultView.tsx');
  const paper = read('src/components/views/ExamPaperViewerView.tsx');
  const share = read('src/components/ui/ShareRow.tsx');
  const profile = read('src/components/ProfileModal.tsx');
  const threads = read('src/components/views/ThreadsView.tsx');
  const qa = read('src/components/views/QAForumView.tsx');

  assert.ok(share.includes("'Đã sao chép'"), 'ShareRow phai co Đã sao chép');
  assert.ok(exam.includes("showToast('Đã sao chép')"), 'ExamVaultView phai co Đã sao chép');
  assert.ok(profile.includes("title: 'Đã sao chép'"), 'ProfileModal phai co Đã sao chép');

  assert.ok(exam.includes("'Đã lưu bài'"), 'ExamVaultView phai co Đã lưu bài');
  assert.ok(exam.includes("'Đã bỏ lưu'"), 'ExamVaultView phai co Đã bỏ lưu');
  assert.ok(paper.includes("'Đã lưu bài'"), 'ExamPaperViewerView phai co Đã lưu bài');
  assert.ok(paper.includes("'Đã bỏ lưu'"), 'ExamPaperViewerView phai co Đã bỏ lưu');
  assert.ok(threads.includes("'Đã lưu bài'"), 'ThreadsView phai co Đã lưu bài');
  assert.ok(threads.includes("'Đã bỏ lưu'"), 'ThreadsView phai co Đã bỏ lưu');
  assert.ok(qa.includes("'Đã lưu bài'"), 'QAForumView phai co Đã lưu bài');
  assert.ok(qa.includes("'Đã bỏ lưu'"), 'QAForumView phai co Đã bỏ lưu');

  assert.ok(exam.includes("showToast('Đã ghi nhận')"), 'ExamVaultView danh gia phai co Đã ghi nhận');
  assert.ok(threads.includes("setToastMsg('Đã ghi nhận')"), 'ThreadsView tha cam xuc phai co Đã ghi nhận');

  assert.ok(store.includes("title: 'Đã gửi câu'"), 'forumStore tao cau hoi phai co Đã gửi câu');
  assert.ok(store.includes("title: 'Đã gửi bài'"), 'forumStore gui bai / phan hoi phai co Đã gửi bài');
});

test('Phase 24 - 3. Dong Bo Badge Trang Thai & Chip Danh Muc Sieu Tinh Gon (<= 3 Tu)', () => {
  const qa = read('src/components/views/QAForumView.tsx');
  const threads = read('src/components/views/ThreadsView.tsx');
  const exam = read('src/components/views/ExamVaultView.tsx');
  const paper = read('src/components/views/ExamPaperViewerView.tsx');

  assert.ok(qa.includes('<span>Đã giải</span>'), 'QAForumView phai co badge Đã giải');
  assert.ok(qa.includes('<span>Chờ lời giải</span>'), 'QAForumView phai co badge Chờ lời giải');
  assert.ok(qa.includes('<span>Sôi nổi</span>'), 'QAForumView phai co badge Sôi nổi');

  assert.ok(threads.includes('<span>Sôi nổi</span>'), 'ThreadsView phai co badge Sôi nổi');
  assert.ok(threads.includes('<span>Mới nhất</span>'), 'ThreadsView phai co badge Mới nhất');

  assert.ok(exam.includes('Đề chuẩn'), 'ExamVaultView phai co badge Đề chuẩn');
  assert.ok(paper.includes('Đề chuẩn'), 'ExamPaperViewerView phai co badge Đề chuẩn');
});

test('Phase 24 - 4. Bao Toan 100% 3 Asset 3D Nguyen Ban Va Switcher Thiet Bi Icon-Only', () => {
  const iphonePath = path.resolve('public/iphone5-showcase.html');
  const iphoneStat = fs.statSync(iphonePath);
  assert.ok(iphoneStat.size > 3000000, 'iPhone 5 showcase phai giu nguyen dung luong > 3MB');

  const machiPath = path.resolve('public/machi-mart-3d.html');
  const machiStat = fs.statSync(machiPath);
  assert.ok(machiStat.size > 900000, 'Machi Mart 3D phai giu nguyen dung luong > 900KB');

  const solarPath = path.resolve('public/solar-system-3d.html');
  const solarLines = fs.readFileSync(solarPath, 'utf8').trim().split('\n').length;
  assert.equal(solarLines, 557, 'solar-system-3d.html phai chinh xac 557 dong');

  const hardware = read('src/components/HardwareShowcase.tsx');
  assert.ok(hardware.includes('<Smartphone'), 'HardwareShowcase co nut Smartphone');
  assert.ok(hardware.includes('<Laptop'), 'HardwareShowcase co nut Laptop');
});
