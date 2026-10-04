/* Bản quyền trí tuệ thuộc về BroAmStuck */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('1. User Profile Architecture: 6 Fast Metrics, Radar Spider Chart, Badges & Chill Box', () => {
  const profileModal = fs.readFileSync('src/components/ProfileModal.tsx', 'utf8');

  // Verify 6 quick stats
  assert.ok(profileModal.includes('Điểm số'), 'Must include metric: Điểm số');
  assert.ok(profileModal.includes('Cảm ơn'), 'Must include metric: Cảm ơn');
  assert.ok(profileModal.includes('Hay nhất'), 'Must include metric: Hay nhất');
  assert.ok(profileModal.includes('5 Sao'), 'Must include metric: 5 Sao');
  assert.ok(profileModal.includes('Xác thực'), 'Must include metric: Xác thực');
  assert.ok(profileModal.includes('Đã giúp'), 'Must include metric: Đã giúp');

  // Verify Radar Spider Chart 5 axes
  assert.ok(profileModal.includes('KHTN'), 'Radar chart must have KHTN axis');
  assert.ok(profileModal.includes('KHXH'), 'Radar chart must have KHXH axis');
  assert.ok(profileModal.includes('Ngoại Ngữ'), 'Radar chart must have Ngoại Ngữ axis');
  assert.ok(profileModal.includes('Nghệ Thuật'), 'Radar chart must have Nghệ Thuật axis');
  assert.ok(profileModal.includes('KHCN'), 'Radar chart must have KHCN axis');
  assert.ok(profileModal.includes('#EAB308'), 'Radar data polygon must have gold border #EAB308');
  assert.ok(profileModal.includes('rgba(14, 165, 233, 0.25)'), 'Radar data polygon must have cyan fill rgba(14, 165, 233, 0.25)');

  // Verify Badges (earned, not pre-loaded) and Chill Box (real inventory)
  assert.ok(profileModal.includes('Danh hiệu'), 'Must include Danh hiệu section');
  assert.ok(profileModal.includes('Tích Cực'), 'Must include badge Tích Cực');
  assert.ok(profileModal.includes('isEarned'), 'Badges must be gated by real earn predicates');
  assert.ok(profileModal.includes('Chill Box'), 'Must include Chill Box');
  assert.ok(profileModal.includes('SHOP_ITEMS'), 'Chill box must render real shop inventory');
  assert.ok(profileModal.includes('userInventory'), 'Chill box must render the user own inventory only');
  assert.ok(profileModal.includes('Kệ Sách Cộng Đồng'), 'Must include Kệ Sách Cộng Đồng');
  assert.ok(profileModal.includes('Đọc sách gì hay, chia sẻ ngay cùng cộng đồng Hoidap247!'), 'Must include Kệ Sách description');

  // Verify the answer history feed is built from REAL user solutions (no mock ids)
  assert.ok(profileModal.includes('userSolutions.map'), 'Answers feed must render real user solutions');
  assert.ok(!profileModal.includes('MOCK_ANSWERS_FEED'), 'No mock answers feed may remain');

  // Verify LikeHeartButton integration
  assert.ok(profileModal.includes('LikeHeartButton'), 'Must integrate LikeHeartButton for user profiles');
});

test('2. Chat View & Dock: Avatar/User click triggers Profile modal and Report to Admin', () => {
  const chatView = fs.readFileSync('src/components/views/ChatView.tsx', 'utf8');
  const chatDock = fs.readFileSync('src/components/ChatDock.tsx', 'utf8');

  // ChatView avatar/name interaction (labels simplified, no personal email leaked)
  assert.ok(chatView.includes('Trang cá nhân'), 'ChatView must offer view profile');
  assert.ok(chatView.includes('Tố cáo'), 'ChatView must offer report');
  assert.ok(!chatView.includes('anhtuantran0512@gmail.com'), 'ChatView must not leak personal email');
  assert.ok(chatView.includes('/api/reports'), 'ChatView must submit report to /api/reports');

  // ChatDock avatar/name interaction (labels simplified, no personal email leaked)
  assert.ok(chatDock.includes('Trang cá nhân'), 'ChatDock must offer view profile');
  assert.ok(chatDock.includes('Tố cáo'), 'ChatDock must offer report');
  assert.ok(!chatDock.includes('anhtuantran0512@gmail.com'), 'ChatDock must not leak personal email');
  assert.ok(chatDock.includes('/api/reports'), 'ChatDock must submit report to /api/reports');
});

test('3. Leaderboard Widget & "Đặt Câu Hỏi" CTA in QAForum', () => {
  const qaForum = fs.readFileSync('src/components/views/QAForumView.tsx', 'utf8');
  const leaderboard = fs.readFileSync('src/components/views/LeaderboardWidget.tsx', 'utf8');

  assert.ok(qaForum.includes('LeaderboardWidget'), 'QAForumView must embed LeaderboardWidget');
  assert.ok(leaderboard.includes('Bảng xếp hạng'), 'Must have "Bảng xếp hạng" title');
  assert.ok(leaderboard.includes("week: 'Tuần'"), 'Must have "Tuần" period');
  assert.ok(leaderboard.includes("month: 'Tháng'"), 'Must have "Tháng" period');
  assert.ok(leaderboard.includes("year: 'Năm'"), 'Must have "Năm" period');
  assert.ok(leaderboard.includes("all: 'Toàn thời gian'"), 'Must have "Toàn thời gian" period');
  assert.ok(leaderboard.includes('computeMembers'), 'Scores must be computed from real activity');
  assert.ok(leaderboard.includes('Bạn muốn hỏi điều gì?'), 'Must have "Bạn muốn hỏi điều gì?" CTA title');
  assert.ok(leaderboard.includes('Đặt câu hỏi'), 'Must have "Đặt câu hỏi" CTA button');
  assert.ok(leaderboard.includes('MagneticButton'), 'CTA button must utilize MagneticButton effect');
});

test('4. 100% Free Membership, Metallic Gold Shimmer & chuyentien.jpeg Donation Box', () => {
  const pricing = fs.readFileSync('src/components/landing/sections/LandingPricing.tsx', 'utf8');
  const indexCss = fs.readFileSync('src/index.css', 'utf8');

  // Verify transfer image exists
  assert.ok(fs.existsSync('public/chuyentien.jpeg'), 'public/chuyentien.jpeg must exist');
  assert.ok(pricing.includes('src="/chuyentien.jpeg"'), 'LandingPricing must render /chuyentien.jpeg');
  assert.ok(pricing.includes('87905122009'), 'Must show bank account 87905122009');
  assert.ok(pricing.includes('TRAN VAN ANH TUAN'), 'Must show bank account owner TRAN VAN ANH TUAN');

  // Verify Metallic gold CSS
  assert.ok(indexCss.includes('.tg-10__gold'), 'Must include .tg-10__gold shimmer CSS');
  assert.ok(indexCss.includes('--gold-grad'), 'Must include --gold-grad gradient definition');
});

test('5. Page Resource Loader (.la-08) with real progress bar & mini console', () => {
  const appFile = fs.readFileSync('src/App.tsx', 'utf8');
  const loaderFile = fs.readFileSync('src/components/PageResourceLoader.tsx', 'utf8');
  const indexCss = fs.readFileSync('src/index.css', 'utf8');

  assert.ok(appFile.includes('PageResourceLoader'), 'App.tsx must mount PageResourceLoader');
  assert.ok(loaderFile.includes('la-08__cal'), 'Loader must render calendar tile');
  assert.ok(loaderFile.includes("fetch('/api/sync')"), 'Loader must track the real /api/sync fetch');
  assert.ok(loaderFile.includes('.fonts.ready'), 'Loader must track real font loading');
  assert.ok(loaderFile.includes('WebSocket'), 'Loader must track the real WebSocket connection');
  assert.ok(loaderFile.includes('minDuration'), 'Loader must hold a minimum duration before completing');
  assert.ok(loaderFile.includes('role="progressbar"'), 'Loader must render the bottom progress bar');
  assert.ok(loaderFile.includes('aria-valuenow'), 'Progress bar must expose real percentage');
  assert.ok(indexCss.includes('.la-08'), 'Must include .la-08 styles');
  assert.ok(indexCss.includes('@keyframes la-08-glow'), 'Must include la-08-glow keyframes');
  assert.ok(indexCss.includes('@keyframes la-08-beat'), 'Must include la-08-beat keyframes');
});
