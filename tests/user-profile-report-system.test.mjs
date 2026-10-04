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
  /* Kệ sách: vòng 9 thay khối mô tả suông bằng KỆ THẬT (lưu theo từng tài khoản) */
  assert.ok(profileModal.includes('BookshelfPanel'), 'Profile must mount the real bookshelf panel');
  const bookshelf = fs.readFileSync('src/components/BookshelfPanel.tsx', 'utf8');
  assert.ok(bookshelf.includes('fforum_bookshelf_v1'), 'Bookshelf must persist per account');
  assert.ok(bookshelf.includes('safeStorage'), 'Bookshelf must use the safeStorage wrapper');
  assert.ok(!bookshelf.includes('localStorage.'), 'Bookshelf must not touch raw localStorage');
  assert.ok(bookshelf.includes('ownerKey'), 'Bookshelf must be scoped to the profile owner');
  assert.ok(profileModal.includes('TierRankSheet'), 'Danh hiệu card must open the rank/badge sheet');
  assert.ok(
    !profileModal.includes('hoidap') && !bookshelf.includes('hoidap'),
    'Every hoidap247 reference must be purged from the profile',
  );

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

test('6. Vòng 9 — một lượt thích chỉ cộng ĐÚNG 1, bảng rank mở từ thẻ danh hiệu', () => {
  const heart = fs.readFileSync('src/components/LikeHeartButton.tsx', 'utf8');
  const profile = fs.readFileSync('src/components/ProfileModal.tsx', 'utf8');
  const sheet = fs.readFileSync('src/components/TierRankSheet.tsx', 'utf8');

  /* Tim: nền = số đã có trừ đi lượt của chính mình, để 1 lượt thích = +1 */
  assert.ok(
    heart.includes('baseCount') && /Math\.max\(0, initialCount - \(initialLiked \? 1 : 0\)\)/.test(heart),
    'Like count must subtract my own like from the base so one like adds exactly one',
  );
  assert.ok(
    heart.includes('const currentCount = isLiked ? baseCount + 1 : baseCount'),
    'Rendered count must derive from the base, never double-count',
  );

  /* Hồ sơ: số lượt thích = cảm ơn thật + danh sách người đã thích, lưu theo tài khoản */
  assert.ok(profile.includes('fforum_profile_likes_v1'), 'Profile likes must persist per account');
  assert.ok(profile.includes('PROFILE_LIKES_KEY'), 'Profile likes key must be a named constant');
  assert.ok(profile.includes('writeProfileLikes') && profile.includes('readProfileLikes'), 'Profile likes must be read + written through helpers');
  assert.ok(profile.includes('handleProfileLike'), 'Heart must be wired to a real handler');
  assert.ok(
    profile.includes('statsMetrics.thanks + profileLikers.length'),
    'Heart count must be real thanks + real likers',
  );

  /* Thẻ "danh hiệu" → mở bảng rank + danh hiệu + yêu cầu */
  assert.ok(profile.includes('setIsRankSheetOpen(true)'), 'Rank card must open the sheet');
  assert.ok(sheet.includes('Bảng rank') && sheet.includes('Danh hiệu') && sheet.includes('Yêu cầu'), 'Sheet must have the three tabs');
  assert.ok(sheet.includes('TIER_CONFIGS'), 'Sheet must list every tier');
  assert.ok(sheet.includes('xpThresholdForLevel'), 'Sheet must use the shared XP threshold helper');
  assert.ok(sheet.includes('requirement'), 'Every badge row must state its requirement');
  const tier = fs.readFileSync('src/utils/tier.ts', 'utf8');
  assert.ok(/export (const|function) xpThresholdForLevel/.test(tier), 'XP threshold helper must be shared, not duplicated');
});
