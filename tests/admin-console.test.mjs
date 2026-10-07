/* Bản quyền trí tuệ thuộc về BroAmStuck */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (rel) => fs.readFileSync(path.resolve(rel), 'utf8');
const app = read('src/App.tsx');
const modal = read('src/components/AdminConsoleModal.tsx');
const server = read('server/forumServer.ts');

test('Admin UI 1. Lối vào và modal chỉ dành cho tài khoản Super Admin', () => {
  assert.match(app, /currentUser\?\.email === 'anhtuantran0512@gmail\.com'/);
  assert.match(app, /AdminConsoleModal/);
  assert.match(app, /isAdminConsoleOpen/);
  assert.match(modal, /role="dialog"/);
  assert.match(modal, /aria-modal="true"/);
});

test('Admin UI 2. Tìm kiếm gửi query lên API có xác thực, không tải toàn bộ danh bạ', () => {
  assert.match(modal, /fetch\(`\/api\/admin\/users\?q=\$\{encodeURIComponent\(query\)\}`/);
  assert.match(modal, /headers: authHeaders\(\)/);
  const usersRouteStart = server.indexOf("method === 'GET' && url.split('?')[0] === '/api/admin/users'");
  const auditRouteStart = server.indexOf("method === 'GET' && url.startsWith('/api/admin/audit')", usersRouteStart);
  const usersRoute = server.slice(usersRouteStart, auditRouteStart);
  assert.ok(usersRouteStart >= 0 && auditRouteStart > usersRouteStart, 'route tra cứu có ranh giới rõ');
  assert.match(usersRoute, /status\.banned \|\| status\.muted/,
    'query rỗng chỉ được lọc tài khoản đang có áp chế');
  assert.match(usersRoute, /active-moderation/);
  assert.match(usersRoute, /\.slice\(0, 20\)/);
  assert.match(usersRoute, /avatar: String\(user\?\.avatar/);
  assert.doesNotMatch(usersRoute, /users: store\.users/);
});

test('Admin UI 3. Tất cả thao tác cấm/gỡ đi qua endpoint moderation duy nhất', () => {
  assert.match(modal, /postJson\('\/api\/admin\/moderate'/);
  assert.match(modal, /action: 'ban' \| 'mute' \| 'unban' \| 'unmute'/);
  assert.match(modal, /durationMinutes: appliesRestriction \? moderationDuration/);
  assert.match(modal, /reason: appliesRestriction \? reason/);
  assert.match(server, /method === 'POST' && url === '\/api\/admin\/moderate'/);
});

test('Admin UI 4. Cấm/khoá phải có lý do, thời hạn rõ; vĩnh viễn có xác nhận', () => {
  for (const label of ['15 phút', '1 giờ', '1 ngày', '7 ngày', 'Vĩnh viễn']) {
    assert.ok(modal.includes(label), `thiếu thời hạn ${label}`);
  }
  assert.match(modal, /reason\.length < 3/);
  assert.match(modal, /window\.confirm/);
  assert.match(server, /reason\.length < 3/);
  assert.match(server, /MODERATION_DURATIONS_MIN\.some/);
  assert.match(server, /targetUser\.role === 'SUPER_ADMIN'/);
});

test('Admin UI 5. Nhật ký đọc qua API có giới hạn và được làm mới sau thao tác', () => {
  assert.match(modal, /\/api\/admin\/audit\?limit=8/);
  assert.match(modal, /setAuditRefreshTick\(\(tick\) => tick \+ 1\)/);
  assert.match(modal, /Nhật ký quản trị/);
  assert.match(server, /Math\.min\(100, Math\.floor\(rawLimit\)\)/);
  assert.match(server, /auditLog: log\.slice\(0, limit\)/);
});

test('Admin UI 6. Người bị áp chế được báo riêng; các chính sách được nói đúng', () => {
  const store = read('src/store/forumStore.ts');
  assert.match(store, /case 'USER_MODERATED'/);
  assert.match(store, /Tài khoản đang bị hạn chế đăng/);
  assert.match(store, /Tạm khoá gửi tin chat/);
  assert.match(modal, /vẫn có thể đăng nhập để xem nội dung/);
  assert.match(modal, /Khoá chat chỉ chặn gửi tin/);
});

test('Admin UI 7. Escape, nhãn truy cập và giảm chuyển động được hỗ trợ', () => {
  assert.match(modal, /useEscapeKey\(\(\) => onClose\(\), isOpen\)/);
  assert.match(modal, /aria-label="Bảng điều khiển quản trị"/);
  assert.match(modal, /aria-label="Tìm thành viên theo tên, email, mã hoặc lớp"/);
  assert.match(modal, /motion-safe:animate-spin/);
  assert.match(modal, /motion-safe:animate-pulse/);
});
