/* Bản quyền trí tuệ thuộc về BroAmStuck */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { flashlightCone } from '../src/utils/flashlightCone.ts';
import { TITLE_CONFIGS, getTitleForLevel } from '../src/utils/titles.ts';
import { SHOP_ITEMS } from '../src/utils/shopData.ts';
const read = (name) => fs.readFileSync(name, 'utf8');
test('Nón đèn: gốc cố định; khẩu độ mở theo khoảng cách và không giới hạn tại chuột', () => {
  const source = { x: 500, y: 220 };
  const cone = flashlightCone(source, { x: 200, y: 220 }, 2000);
  assert.equal(cone.length, 4);
  assert.equal(Math.hypot(cone[0].x - cone[1].x, cone[0].y - cone[1].y), 10);
  assert.ok(Math.hypot(cone[2].x - cone[3].x, cone[2].y - cone[3].y) > 1000);
  assert.ok(cone[2].x < -1000, 'vượt xa vị trí chuột và viewport');
  assert.equal(cone[0].x, source.x);
  const upward = flashlightCone(source, { x: 500, y: 30 }, 2000);
  assert.ok(upward[2].y < -1000, 'tia không phụ thuộc hướng');
  const field = read('src/components/auth/FlashlightPasswordField.tsx');
  assert.match(field, /window.addEventListener\('pointermove', onMove, \{ passive: true \}\)/);
  assert.match(field, /aimFrame.current = window.requestAnimationFrame/, 'pointer updates share one frame');
  assert.match(field, /box.style.setProperty\('--ffl-cone'/);
});
test('30 danh hiệu có icon riêng và mốc cấp liên tục', () => {
  assert.equal(TITLE_CONFIGS.length, 30);
  assert.equal(new Set(TITLE_CONFIGS.map(t => t.name)).size, 30);
  assert.equal(new Set(TITLE_CONFIGS.map(t => t.icon)).size, 30);
  assert.deepEqual([...new Set(TITLE_CONFIGS.map(t => t.rarity))], ['common', 'rare', 'epic', 'legendary']);
  for (let level = 1; level <= 150; level++) assert.equal(getTitleForLevel(level).minLevel, Math.floor((level - 1) / 5) * 5 + 1);
});
test('35 vật phẩm khác tên và icon, nhóm hữu dụng, không mất id cũ', () => {
  assert.equal(SHOP_ITEMS.length, 35);
  for (const field of ['id', 'name', 'iconType']) assert.equal(new Set(SHOP_ITEMS.map(i => i[field])).size, 35);
  assert.equal(new Set(SHOP_ITEMS.map(i => i.category)).size, 4);
  assert.ok(SHOP_ITEMS.some(i => i.id === 'pencil_starter'));
  assert.ok(SHOP_ITEMS.every(i => i.description.length < 70));
});
test('Đăng xuất trực tiếp; hoạt cảnh cũ đã xoá hoàn toàn', () => {
  const auth = read('src/components/AuthModal.tsx');
  const app = read('src/App.tsx');
  assert.match(auth, /handleClose\(\);\s*onSuccess\?\.\(/);
  assert.match(app, /onLogout=\{\(\) => logout\(\)\}/);
  for (const source of [auth, app]) {
    assert.doesNotMatch(source, /SessionDoor|session-scene|closeTimer|leaveTimer/);
  }
  assert.equal(fs.existsSync('src/components/auth/SessionDoor.tsx'), false);
});

test('Profile workbench: named keyboard tabs, real stats, chronological activity, responsive views', () => {
  const profile = read('src/components/ProfileModal.tsx');
  const css = read('src/components/ProfileSignature.css');
  assert.match(profile, /role="tablist"/);
  assert.match(profile, /role="tab"[\s\S]*?aria-selected=\{activeTab === 'stats'\}/);
  assert.match(profile, /event\.key === 'ArrowRight'/);
  assert.match(profile, /activeTab === 'stats' &&/);
  assert.match(profile, /id="profile-tab-panel"[\s\S]*?role="tabpanel"/);
  assert.match(profile, /profileActivityTimestamp\(question\.createdAt, question\.createdAtMs\)/);
  assert.match(profile, /\.sort\(\(a, b\) => b\.timestamp - a\.timestamp\)/);
  assert.match(profile, /statsMetrics\.bestSolutions/);
  assert.match(profile, /Chưa có hoạt động hỏi đáp/);
  assert.doesNotMatch(profile, /Cảnh báo:[\s\S]{0,80}>0</, 'không khẳng định không có cảnh báo khi dữ liệu không được cung cấp');
  assert.match(css, /\.profile-modal-tab\[aria-selected='true'\]/);
  assert.match(css, /\.profile-activity-feed/);
  assert.match(css, /max-width: 760px/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
