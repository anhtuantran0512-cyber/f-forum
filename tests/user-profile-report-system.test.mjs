/* Bản quyền trí tuệ thuộc về BroAmStuck */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('1. Profile shows real account data, server-earned badges, and owned inventory', () => {
  const profileModal = fs.readFileSync('src/components/ProfileModal.tsx', 'utf8');
  const badgeCatalog = fs.readFileSync('src/utils/badges.ts', 'utf8');
  const sanitizer = fs.readFileSync('src/utils/userSanitizer.ts', 'utf8');

  assert.ok(profileModal.includes('Câu hỏi'), 'Profile includes real question count/activity');
  assert.ok(profileModal.includes('Lời giải'), 'Profile includes real solution count/activity');
  assert.ok(profileModal.includes('Huy hiệu đã đạt'), 'Profile groups earned badges');
  assert.ok(profileModal.includes('currentUser.earnedBadges'), 'Profile reads earned badges from account state');
  assert.ok(profileModal.includes('currentUser.inventory'), 'Profile reads owned inventory from account state');
  assert.ok(profileModal.includes('onPurchaseShopItem'), 'Shop purchase calls the server-backed action');
  assert.ok(badgeCatalog.includes("id: 'first-question'"), 'Badge catalog contains the first-question milestone');
  assert.ok(badgeCatalog.includes("id: 'streak-7'"), 'Badge catalog contains a streak milestone');
  assert.ok(sanitizer.includes('EARNED_BADGE_IDS.has(badge)'), 'Unrecognized/client-injected badges are discarded');
  assert.ok(!profileModal.includes('MOCK_ANSWERS_FEED'), 'Profile has no canned answer feed');
  assert.ok(!profileModal.includes('Math.max(40'), 'Profile does not fabricate answer counts');
  assert.ok(!profileModal.includes('ribbon_pink_gem'), 'Profile does not grant starter inventory in the UI');
  assert.ok(profileModal.includes('LikeHeartButton'), 'Profile includes a functional thank-you action');
});

test('2. Chat and Q&A offer concise profile/report actions without exposing report routing', () => {
  const chatView = fs.readFileSync('src/components/views/ChatView.tsx', 'utf8');
  const chatDock = fs.readFileSync('src/components/ChatDock.tsx', 'utf8');
  const qaForum = fs.readFileSync('src/components/views/QAForumView.tsx', 'utf8');

  for (const [name, content] of [['ChatView', chatView], ['ChatDock', chatDock], ['QAForumView', qaForum]]) {
    assert.ok(content.includes('<span>Cá nhân</span>'), `${name} offers a concise profile action`);
    assert.ok(content.includes('<span>Tố cáo</span>'), `${name} shows only the concise report label`);
    assert.ok(content.includes('/api/reports'), `${name} submits reports to the server`);
    const reportModalStart = content.indexOf('{/* Modal: Tố cáo tài khoản */}');
    assert.notEqual(reportModalStart, -1, `${name} has a report modal`);
    const reportModal = content.slice(reportModalStart);
    assert.ok(!reportModal.includes('anhtuantran0512@gmail.com'), `${name} does not disclose report-routing email in report UI`);
    assert.ok(!reportModal.includes('Gửi Gmail'), `${name} does not claim reports are sent by Gmail`);
  }
});

test('3. Leaderboard uses account activity and offers week/month/year/all-time filters', () => {
  const qaForum = fs.readFileSync('src/components/views/QAForumView.tsx', 'utf8');
  const leaderboard = fs.readFileSync('src/components/views/LeaderboardWidget.tsx', 'utf8');

  assert.ok(qaForum.includes('LeaderboardWidget'), 'QAForumView embeds LeaderboardWidget');
  assert.ok(leaderboard.includes('users: Record<string, User>'), 'Leaderboard receives real users');
  assert.ok(leaderboard.includes('activityLog'), 'Time-scoped scores are derived from dated activity');
  assert.ok(leaderboard.includes("week: 'Tuần này'"), 'Leaderboard offers the week filter');
  assert.ok(leaderboard.includes("month: 'Tháng này'"), 'Leaderboard offers the month filter');
  assert.ok(leaderboard.includes("year: 'Năm nay'"), 'Leaderboard offers the year filter');
  assert.ok(leaderboard.includes("all: 'Mọi thời gian'"), 'Leaderboard offers the all-time filter');
  assert.ok(!leaderboard.includes('DEFAULT_LEADERBOARD'), 'Leaderboard contains no seeded rankings');
  assert.ok(leaderboard.includes('MagneticButton'), 'Question CTA keeps its button component');
});

test('4. 100% Free Membership, Metallic Gold Shimmer & chuyentien.jpeg Donation Box', () => {
  const pricing = fs.readFileSync('src/components/landing/sections/LandingPricing.tsx', 'utf8');
  const indexCss = fs.readFileSync('src/index.css', 'utf8');

  assert.ok(fs.existsSync('public/chuyentien.jpeg'), 'public/chuyentien.jpeg must exist');
  assert.ok(pricing.includes('src="/chuyentien.jpeg"'), 'LandingPricing must render /chuyentien.jpeg');
  assert.ok(pricing.includes('87905122009'), 'Must show bank account 87905122009');
  assert.ok(pricing.includes('TRAN VAN ANH TUAN'), 'Must show bank account owner TRAN VAN ANH TUAN');
  assert.ok(indexCss.includes('.tg-10__gold'), 'Must include .tg-10__gold shimmer CSS');
  assert.ok(indexCss.includes('--gold-grad'), 'Must include --gold-grad gradient definition');
});

test('5. Page resource loader reports measured progress through 100%', () => {
  const appFile = fs.readFileSync('src/App.tsx', 'utf8');
  const loaderFile = fs.readFileSync('src/components/PageResourceLoader.tsx', 'utf8');

  assert.ok(appFile.includes('PageResourceLoader'), 'App mounts PageResourceLoader');
  assert.ok(loaderFile.includes('role="progressbar"'), 'Loader exposes accessible progress semantics');
  assert.ok(loaderFile.includes('aria-valuenow={progress}'), 'Progress value reflects measured loading state');
  assert.ok(loaderFile.includes('setProgress(100)'), 'Progress completes at 100%');
  assert.ok(loaderFile.includes('document.images'), 'Progress waits for actual image resources');
  assert.ok(loaderFile.includes('document.fonts.ready'), 'Progress waits for actual font resources');
});
