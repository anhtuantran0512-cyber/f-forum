/* Bản quyền trí tuệ thuộc về BroAmStuck */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';

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

  // Verify Badges and Chill Box
  assert.ok(profileModal.includes('DANH HIỆU CỦA BẠN'), 'Must include DANH HIỆU CỦA BẠN');
  assert.ok(profileModal.includes('Tích Cực'), 'Must include badge Tích Cực');
  assert.ok(profileModal.includes('CHILL BOX'), 'Must include CHILL BOX');
  assert.ok(profileModal.includes('Ruy băng ngọc'), 'Must include Chill box item: Ruy băng ngọc');
  assert.ok(profileModal.includes('Huy hiệu thiền'), 'Must include Chill box item: Huy hiệu thiền');
  assert.ok(profileModal.includes('KỆ SÁCH'), 'Must include KỆ SÁCH');
  assert.ok(profileModal.includes('Đọc sách gì hay, chia sẻ ngay cùng cộng đồng Hoidap247!'), 'Must include Kệ Sách description');

  // Verify Answer history feed IDs from spec
  assert.ok(profileModal.includes('4292916'), 'Must include answer ID 4292916');
  assert.ok(profileModal.includes('5352240'), 'Must include answer ID 5352240');
  assert.ok(profileModal.includes('5350818'), 'Must include answer ID 5350818');
  assert.ok(profileModal.includes('5351042'), 'Must include answer ID 5351042');

  // Verify LikeHeartButton integration
  assert.ok(profileModal.includes('LikeHeartButton'), 'Must integrate LikeHeartButton for user profiles');
});

test('2. Chat View & Dock: Avatar/User click triggers Profile modal and Report to Admin', () => {
  const chatView = fs.readFileSync('src/components/views/ChatView.tsx', 'utf8');
  const chatDock = fs.readFileSync('src/components/ChatDock.tsx', 'utf8');

  // ChatView avatar/name interaction
  assert.ok(chatView.includes('Trang Cá Nhân (Xem đầy đủ thông tin & tất cả huy hiệu)'), 'ChatView must offer view profile');
  assert.ok(chatView.includes('Tố Cáo Tài Khoản Vi Phạm (Gửi Gmail anhtuantran0512@gmail.com)'), 'ChatView must offer report to admin');
  assert.ok(chatView.includes('/api/reports'), 'ChatView must submit report to /api/reports');

  // ChatDock avatar/name interaction
  assert.ok(chatDock.includes('Trang Cá Nhân (Xem đầy đủ thông tin & tất cả huy hiệu)'), 'ChatDock must offer view profile');
  assert.ok(chatDock.includes('Tố Cáo Tài Khoản Vi Phạm (Gửi Gmail anhtuantran0512@gmail.com)'), 'ChatDock must offer report to admin');
  assert.ok(chatDock.includes('/api/reports'), 'ChatDock must submit report to /api/reports');
});

test('3. Leaderboard Widget & "Đặt Câu Hỏi" CTA in QAForum', () => {
  const qaForum = fs.readFileSync('src/components/views/QAForumView.tsx', 'utf8');
  const leaderboard = fs.readFileSync('src/components/views/LeaderboardWidget.tsx', 'utf8');

  assert.ok(qaForum.includes('LeaderboardWidget'), 'QAForumView must embed LeaderboardWidget');
  assert.ok(leaderboard.includes('THÀNH VIÊN HĂNG HÁI NHẤT'), 'Must have THÀNH VIÊN HĂNG HÁI NHẤT title');
  assert.ok(leaderboard.includes('Trong ngày'), 'Must have "Trong ngày" filter');
  assert.ok(leaderboard.includes('Trong tuần'), 'Must have "Trong tuần" filter');
  assert.ok(leaderboard.includes('Bạn muốn hỏi điều gì?'), 'Must have "Bạn muốn hỏi điều gì?" CTA title');
  assert.ok(leaderboard.includes('ĐẶT CÂU HỎI'), 'Must have "ĐẶT CÂU HỎI" CTA button');
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

test('5. Page Resource Loader (.la-08) with Healthcare Confirmation Animation', () => {
  const appFile = fs.readFileSync('src/App.tsx', 'utf8');
  const loaderFile = fs.readFileSync('src/components/PageResourceLoader.tsx', 'utf8');
  const indexCss = fs.readFileSync('src/index.css', 'utf8');

  assert.ok(appFile.includes('PageResourceLoader'), 'App.tsx must mount PageResourceLoader');
  assert.ok(loaderFile.includes('la-08__cal'), 'Loader must render calendar tile');
  assert.ok(loaderFile.includes('la-08__ecg'), 'Loader must render ECG trace');
  assert.ok(indexCss.includes('.la-08'), 'Must include .la-08 styles');
  assert.ok(indexCss.includes('@keyframes la-08-glow'), 'Must include la-08-glow keyframes');
  assert.ok(indexCss.includes('@keyframes la-08-beat'), 'Must include la-08-beat keyframes');
});
