import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  CURRENT_RELEASE_DATE,
  CURRENT_VERSION,
  RELEASES,
  RELEASE_KIND_META,
  ROADMAP,
  ROADMAP_STATUS_META,
  formatReleaseDate,
} from '../src/data/changelog.ts';

function read(file) {
  return fs.readFileSync(path.resolve(file), 'utf8');
}

/* ------------------------------------------------------------------ *
 * 1. Dữ liệu nhật ký phát hành
 * ------------------------------------------------------------------ */
test('1. Nhật ký phát hành: phiên bản hợp lệ, ngày ISO, đủ loại thay đổi', () => {
  assert.ok(RELEASES.length >= 5, 'Cần ghi lại tối thiểu 5 mốc phát hành');
  assert.ok(
    RELEASES.some(release => release.version === CURRENT_VERSION),
    'Phiên bản đang chạy phải có mặt trong nhật ký phát hành',
  );

  const seenVersions = new Set();
  RELEASES.forEach(release => {
    assert.match(release.version, /^\d+\.\d+\.\d+$/, `Phiên bản ${release.version} phải theo chuẩn x.y.z`);
    assert.ok(!seenVersions.has(release.version), 'Phiên bản không được trùng lặp');
    seenVersions.add(release.version);

    assert.match(release.date, /^\d{4}-\d{2}-\d{2}$/, 'Ngày phát hành phải theo ISO');
    assert.equal(formatReleaseDate(release.date), release.date.split('-').reverse().join('/'));
    assert.ok(release.title.trim().length > 8, 'Tiêu đề phát hành phải mô tả rõ');
    assert.ok(release.summary.trim().length >= 60, 'Tóm tắt phát hành phải đủ chi tiết');
    assert.ok(release.codename.trim().length > 2);
    assert.ok(release.highlights.length >= 3, `v${release.version} cần tối thiểu 3 thay đổi được ghi lại`);

    release.highlights.forEach(highlight => {
      assert.ok(highlight.text.trim().length >= 20, 'Mỗi dòng thay đổi phải nêu rõ nội dung');
      assert.ok(RELEASE_KIND_META[highlight.kind], `Loại thay đổi ${highlight.kind} phải có nhãn hiển thị`);
    });
  });

  // Mới nhất lên đầu
  const dates = RELEASES.map(release => release.date);
  const sorted = [...dates].sort().reverse();
  assert.deepEqual(dates, sorted, 'Nhật ký phát hành phải xếp mới nhất lên đầu');
  assert.equal(dates[0], CURRENT_RELEASE_DATE);

  ['feature', 'improvement', 'fix', 'security'].forEach(kind => {
    assert.ok(
      RELEASES.some(release => release.highlights.some(highlight => highlight.kind === kind)),
      `Nhật ký nên có ít nhất một mục thuộc loại ${kind}`,
    );
    assert.ok(RELEASE_KIND_META[kind].label.length > 0);
  });
});

/* ------------------------------------------------------------------ *
 * 2. Dữ liệu lộ trình
 * ------------------------------------------------------------------ */
test('2. Lộ trình: trạng thái, tiến độ và mốc thời gian hợp lệ', () => {
  assert.ok(ROADMAP.length >= 6, 'Lộ trình cần đủ chi tiết để minh bạch với học sinh');

  const ids = new Set();
  ROADMAP.forEach(item => {
    assert.ok(!ids.has(item.id), `Mã lộ trình ${item.id} không được trùng`);
    ids.add(item.id);
    assert.ok(item.title.trim().length > 5);
    assert.ok(item.description.trim().length >= 30, 'Mô tả lộ trình phải đủ rõ');
    assert.ok(ROADMAP_STATUS_META[item.status], `Trạng thái ${item.status} phải có nhãn`);
    assert.ok(Number.isInteger(item.progress) && item.progress >= 0 && item.progress <= 100);
    assert.ok(item.horizon.trim().length > 2);
    assert.ok(RELEASE_KIND_META[item.kind], 'Loại lộ trình phải nằm trong bộ nhãn chung');
  });

  ROADMAP.filter(item => item.status === 'shipped').forEach(item => {
    assert.equal(item.progress, 100, 'Hạng mục đã phát hành phải đạt 100%');
  });

  assert.ok(ROADMAP.some(item => item.status === 'in-progress'), 'Cần thể hiện việc đang triển khai');
  assert.ok(ROADMAP.some(item => item.status === 'planned' || item.status === 'exploring'));
});

/* ------------------------------------------------------------------ *
 * 3. Bất biến mã nguồn giao diện
 * ------------------------------------------------------------------ */
test('3. Trang Cập nhật thay thế hoàn toàn placeholder "Comming soon!!!"', () => {
  const hub = read('src/components/views/UpdateHubView.tsx');
  const app = read('src/App.tsx');

  assert.ok(
    !fs.existsSync(path.resolve('src/components/views/ComingSoonView.tsx')),
    'Trang placeholder Comming soon phải được gỡ bỏ',
  );
  assert.ok(!app.includes('ComingSoonView'), 'App không còn tham chiếu trang placeholder');
  assert.ok(app.includes("const UpdateHubView = lazy"), 'Bảng tin Cập nhật phải được nạp lười (lazy)');
  assert.ok(app.includes("currentView === 'coming-soon'"), 'Route UPDATE cũ phải trỏ sang bảng tin mới');
  assert.ok(app.includes('<UpdateHubView'), 'App phải render UpdateHubView');
  assert.ok(app.includes('feedbacks={feedbacks}'), 'Bảng tin phải đọc được góp ý người dùng đã gửi');
  assert.ok(app.includes('onSubmitFeedback={submitFeedback}'), 'Bảng tin phải tái dùng luồng gửi góp ý của store');
  assert.ok(app.includes('decks: studyDecks.length'), 'Thống kê bảng tin phải lấy số liệu thật từ store');

  // Nội dung thật, không còn câu chữ chờ đợi
  assert.ok(!hub.includes('Comming soon'), 'Không còn nội dung "Comming soon"');
  assert.ok(hub.includes('Nhật ký phát hành'), 'Phải có nhật ký phát hành');
  assert.ok(hub.includes('Lộ trình sắp tới'), 'Phải có lộ trình');
  assert.ok(hub.includes('Đề xuất tính năng cho F-Forum'), 'Phải có biểu mẫu đề xuất tính năng');
  assert.ok(hub.includes('RELEASES.map'), 'Nhật ký phải render từ dữ liệu');
  assert.ok(hub.includes('ROADMAP.map'), 'Lộ trình phải render từ dữ liệu');
});

test('4. Biểu mẫu đề xuất tính năng: ràng buộc độ dài, trạng thái và accessibility', () => {
  const hub = read('src/components/views/UpdateHubView.tsx');

  assert.ok(hub.includes('content.trim().length < 20'), 'Nội dung góp ý phải yêu cầu tối thiểu 20 ký tự');
  assert.ok(hub.includes('maxLength={1200}'), 'Ô nội dung phải có giới hạn ký tự');
  assert.ok(hub.includes('maxLength={60}') && hub.includes('maxLength={120}'), 'Họ tên và email phải có giới hạn ký tự');
  assert.ok(hub.includes('role="status"'), 'Trạng thái gửi thành công phải được thông báo cho trình đọc màn hình');
  assert.ok(hub.includes('role="alert"'), 'Lỗi nhập liệu phải được thông báo rõ');
  assert.ok(hub.includes('onSubmitFeedback({ name:'), 'Biểu mẫu phải gọi hàm gửi góp ý của store');
  assert.ok(hub.includes('feedback'), 'Phải hiển thị lại các góp ý người dùng đã gửi');
});

test('5. Store: danh sách góp ý được giữ trong state và lưu cục bộ', () => {
  const store = read('src/store/forumStore.ts');
  assert.ok(store.includes('const [feedbacks, setFeedbacks] = useState<FeedbackSubmission[]>'), 'Store phải giữ danh sách góp ý trong state');
  assert.ok(store.includes("safeStorage.setItem('fforum_feedbacks'"), 'Góp ý phải được lưu cục bộ');
  assert.ok(store.includes('setFeedbacks(list)'), 'Gửi góp ý phải cập nhật state để bảng tin hiển thị ngay');
  assert.ok(store.includes('feedbacks,'), 'Store phải xuất danh sách góp ý cho giao diện');
  assert.ok(store.includes("if (Array.isArray(data.feedbacks)"), 'Danh sách góp ý phải đồng bộ từ máy chủ');
});

test('6. Bản quyền & thương hiệu: mọi tệp mới đều giữ tiêu đề bản quyền', () => {
  const files = [
    'src/data/changelog.ts',
    'src/store/studyLogic.ts',
    'src/components/views/UpdateHubView.tsx',
    'src/components/views/StudyRoomView.tsx',
    'src/components/study/DeckEditorModal.tsx',
    'src/components/study/ReviewSessionModal.tsx',
    'src/components/study/QuizSessionModal.tsx',
  ];

  files.forEach(file => {
    const content = read(file);
    assert.ok(content.startsWith('/* Bản quyền trí tuệ thuộc về BroAmStuck */'), `${file} phải giữ dòng bản quyền`);
    assert.ok(!/(?<!safeStorage\.)localStorage\.(getItem|setItem|removeItem|clear)/.test(content), `${file} không được dùng localStorage trực tiếp`);
  });
});
