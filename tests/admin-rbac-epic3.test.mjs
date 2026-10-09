/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Epic 3 — Admin / Mod / Teacher Panel & RBAC (Nhiemvu_3.md mục 3.1–3.5).
 * Kiểm chứng phía MÁY CHỦ (không chỉ ẩn nút): tạo vai trò tùy chỉnh, cấp vai trò,
 * chống leo thang quyền, quyền cụ thể (warn/ban/edit_content/view_analytics),
 * mốc cấm 3 ngày, lọc trạng thái, số liệu dashboard bổ sung — và các bất biến giao diện.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fforum-rbac-epic3-'));
process.env.FFORUM_DATA_DIR = DATA_DIR;
const TEST_ADMIN_PASSWORD = 'test-only-super-admin-password-epic3';
process.env.FFORUM_ADMIN_PASSWORD = TEST_ADMIN_PASSWORD;
const { setupForumServer, resetRateLimitersForTest, flushPendingSave } = await import('../server/forumServer.ts');
const { MODERATION_DURATIONS_MIN } = await import('../server/moderation.ts');
const rbac = await import('../src/utils/rbac.ts');
const { monotonePath, niceCeiling, donutArcs, QUICK_DURATIONS } = await import('../src/components/admin/adminConstants.ts');

const read = (rel) => fs.readFileSync(path.resolve(rel), 'utf8');

function createTestServer() {
  const middleware = [];
  const runner = { use(fn) { middleware.push(fn); } };
  const server = http.createServer((req, res) => {
    let index = 0;
    const next = () => {
      if (index < middleware.length) middleware[index++](req, res, next);
      else { res.statusCode = 404; res.end('Not Found'); }
    };
    next();
  });
  setupForumServer(server, runner);
  const sockets = new Set();
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        baseUrl: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise((done) => {
          server.close(done);
          for (const socket of sockets) socket.destroy();
          sockets.clear();
        }),
      });
    });
  });
}

async function request(baseUrl, method, route, body, token) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, data: await response.json().catch(() => null) };
}
const get = (baseUrl, route, token) => request(baseUrl, 'GET', route, undefined, token);
const post = (baseUrl, route, body, token) => request(baseUrl, 'POST', route, body, token);
const del = (baseUrl, route, token) => request(baseUrl, 'DELETE', route, undefined, token);

async function register(baseUrl, label) {
  resetRateLimitersForTest();
  const suffix = `${label}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const result = await post(baseUrl, '/api/auth/register', {
    name: `Thành viên ${label}`,
    email: `${suffix}@example.test`,
    password: 'mat-khau-test-123',
  });
  assert.equal(result.status, 200, `đăng ký ${label}: ${JSON.stringify(result.data)}`);
  return result.data;
}

test('Epic 3 RBAC: vai trò tùy chỉnh, cấp vai trò, chống leo thang & quyền cụ thể được MÁY CHỦ thực thi', async () => {
  const env = await createTestServer();
  try {
    resetRateLimitersForTest();
    const adminLogin = await post(env.baseUrl, '/api/auth/login', { email: 'BroAmStuck@gmail.com', password: TEST_ADMIN_PASSWORD });
    assert.equal(adminLogin.status, 200, JSON.stringify(adminLogin.data));
    const superToken = adminLogin.data.token;

    const teacher = await register(env.baseUrl, 'gv');
    const adminUser = await register(env.baseUrl, 'admin');
    const coordinator = await register(env.baseUrl, 'dieu-phoi');
    const helper = await register(env.baseUrl, 'tro-giang');
    const editor = await register(env.baseUrl, 'bien-tap');
    const target = await register(env.baseUrl, 'muc-tieu');
    const plain = await register(env.baseUrl, 'thuong');

    assert.equal((await post(env.baseUrl, '/api/admin/role', { email: teacher.user.email, staffRole: 'TEACHER' }, superToken)).status, 200);

    /* ---------- /api/admin/me ---------- */
    const superMe = await get(env.baseUrl, '/api/admin/me', superToken);
    assert.equal(superMe.status, 200);
    assert.equal(superMe.data.isSuperAdmin, true);
    assert.deepEqual([...superMe.data.permissions].sort(), [...rbac.ADMIN_PERMISSIONS].sort());
    const teacherMe = await get(env.baseUrl, '/api/admin/me', teacher.token);
    assert.equal(teacherMe.data.staffRole, 'TEACHER');
    assert.deepEqual([...teacherMe.data.permissions].sort(), ['ban', 'mute', 'warn']);
    assert.equal(teacherMe.data.canCreateRole, false, 'Giáo viên không được tạo role');
    assert.equal((await get(env.baseUrl, '/api/admin/me')).status, 401, 'chưa đăng nhập → 401');

    /* ---------- 3.5 Tạo role: chỉ Admin/Super Admin + kiểm tra dữ liệu ---------- */
    const valid = { name: 'Admin', icon: 'crown', color: '#f59e0b', specialChar: '♛', permissions: [...rbac.ADMIN_PERMISSIONS] };
    assert.equal((await post(env.baseUrl, '/api/admin/roles', valid, teacher.token)).status, 403, 'Giáo viên không tạo được role');
    assert.equal((await post(env.baseUrl, '/api/admin/roles', valid, plain.token)).status, 403, 'thành viên thường không tạo được role');
    assert.equal((await post(env.baseUrl, '/api/admin/roles', { ...valid, icon: 'skull' }, superToken)).status, 400, 'icon ngoài whitelist');
    assert.equal((await post(env.baseUrl, '/api/admin/roles', { ...valid, color: 'red;background:url(x)' }, superToken)).status, 400, 'màu phải là hex');
    assert.equal((await post(env.baseUrl, '/api/admin/roles', { ...valid, permissions: ['root'] }, superToken)).status, 400, 'quyền ngoài whitelist bị loại → rỗng');
    assert.equal((await post(env.baseUrl, '/api/admin/roles', { ...valid, name: 'A' }, superToken)).status, 400, 'tên quá ngắn');

    const adminRole = await post(env.baseUrl, '/api/admin/roles', valid, superToken);
    assert.equal(adminRole.status, 200, JSON.stringify(adminRole.data));
    assert.match(adminRole.data.role.id, /^role/);
    assert.equal(adminRole.data.role.specialChar, '♛');
    assert.equal((await post(env.baseUrl, '/api/admin/roles', valid, superToken)).status, 400, 'trùng tên');

    const coordRole = (await post(env.baseUrl, '/api/admin/roles', { name: 'Điều phối', icon: 'zap', color: '#22d3ee', specialChar: '⚡', permissions: ['give_role', 'warn'] }, superToken)).data.role;
    const editorRole = (await post(env.baseUrl, '/api/admin/roles', { name: 'Biên tập', icon: 'sparkles', color: '#a78bfa', specialChar: '❖', permissions: ['edit_content'] }, superToken)).data.role;
    assert.ok(coordRole?.id && editorRole?.id);

    const rolesList = await get(env.baseUrl, '/api/admin/roles', superToken);
    assert.equal(rolesList.status, 200);
    assert.equal(rolesList.data.roles.length, 3);
    assert.equal((await get(env.baseUrl, '/api/admin/roles', teacher.token)).status, 403, 'Giáo viên không xem danh sách role');

    /* ---------- Give Role: gán role tùy chỉnh ---------- */
    assert.equal((await post(env.baseUrl, '/api/admin/role', { email: adminUser.user.email, customRole: adminRole.data.role.id }, superToken)).status, 200);
    assert.equal((await post(env.baseUrl, '/api/admin/role', { email: coordinator.user.email, customRole: coordRole.id }, superToken)).status, 200);
    assert.equal((await post(env.baseUrl, '/api/admin/role', { email: editor.user.email, customRole: editorRole.id }, superToken)).status, 200);
    assert.equal((await post(env.baseUrl, '/api/admin/role', { email: plain.user.email, customRole: 'role-khong-ton-tai' }, superToken)).status, 404);
    assert.equal((await post(env.baseUrl, '/api/admin/role', { email: plain.user.email, staffRole: 'MODERATOR' }, teacher.token)).status, 403, 'Giáo viên không give role');

    const adminMe = await get(env.baseUrl, '/api/admin/me', adminUser.token);
    assert.equal(adminMe.data.customRoleDef.name, 'Admin');
    assert.ok(adminMe.data.permissions.includes('give_role'));
    assert.equal(adminMe.data.canCreateRole, true, 'Admin (give_role) được tạo role');
    assert.equal((await get(env.baseUrl, '/api/admin/analytics?range=7d', adminUser.token)).status, 200, 'Admin có view_analytics xem được thống kê');

    const memberList = await get(env.baseUrl, `/api/admin/members?q=${encodeURIComponent(adminUser.user.email)}`, superToken);
    const adminRow = memberList.data.members.find((member) => member.email === adminUser.user.email);
    assert.equal(adminRow.customRoleDef.name, 'Admin', 'danh sách thành viên trả định nghĩa role để vẽ badge');
    assert.ok('joinedAt' in adminRow, 'có cột ngày tạo');
    assert.ok(adminRow.profile, 'Super Admin nhận hồ sơ chi tiết');
    const adminView = await get(env.baseUrl, `/api/admin/members?q=${encodeURIComponent(target.user.email)}`, adminUser.token);
    assert.equal(adminView.status, 200);
    assert.equal(adminView.data.canAssignRoles, true);
    assert.ok(adminView.data.members[0].profile, 'Admin (give_role) xem được hồ sơ chi tiết (mục 3.4)');
    const teacherView = await get(env.baseUrl, `/api/admin/members?q=${encodeURIComponent(target.user.email)}`, teacher.token);
    assert.equal(teacherView.data.members[0].profile, undefined, 'Giáo viên chỉ nhận dữ liệu thống kê tối thiểu');

    /* ---------- Chống leo thang quyền (Admin giới hạn) ---------- */
    assert.equal((await post(env.baseUrl, '/api/admin/roles', { name: 'Vượt quyền', icon: 'flame', color: '#ef4444', permissions: ['ban'] }, coordinator.token)).status, 403,
      'không tạo được role có quyền mình không có');
    const warnRole = await post(env.baseUrl, '/api/admin/roles', { name: 'Nhắc nhở', icon: 'heart', color: '#10b981', specialChar: '✿', permissions: ['warn'] }, coordinator.token);
    assert.equal(warnRole.status, 200, 'tạo được role là tập con quyền của mình');
    assert.equal((await post(env.baseUrl, '/api/admin/role', { email: helper.user.email, staffRole: 'TEACHER' }, coordinator.token)).status, 403,
      'không cấp được Giáo viên (cần ban/mute)');
    assert.equal((await post(env.baseUrl, '/api/admin/role', { email: helper.user.email, customRole: editorRole.id }, coordinator.token)).status, 403,
      'không cấp được role có quyền edit_content mình không có');
    assert.equal((await post(env.baseUrl, '/api/admin/role', { email: helper.user.email, customRole: warnRole.data.role.id }, coordinator.token)).status, 200);
    assert.equal((await post(env.baseUrl, '/api/admin/role', { email: adminUser.user.email, staffRole: null }, coordinator.token)).status, 403,
      'không đụng được Admin khác');
    assert.equal((await post(env.baseUrl, '/api/admin/role', { email: coordinator.user.email, customRole: warnRole.data.role.id }, coordinator.token)).status, 400,
      'không tự đổi vai trò của mình');
    assert.equal((await post(env.baseUrl, '/api/admin/role', { email: 'BroAmStuck@gmail.com', staffRole: 'MODERATOR' }, adminUser.token)).status, 400,
      'Super Admin luôn được bảo vệ');
    assert.equal((await del(env.baseUrl, `/api/admin/roles?id=${encodeURIComponent(editorRole.id)}`, coordinator.token)).status, 403,
      'Admin chỉ xoá role do chính mình tạo');

    /* ---------- Quyền cụ thể: warn có, ban không; analytics không ---------- */
    assert.equal((await post(env.baseUrl, '/api/admin/warn', { email: target.user.email, reason: 'Nhắc nhở ngôn từ trong kênh chung.' }, helper.token)).status, 200,
      'role có warn → cảnh cáo được');
    assert.equal((await post(env.baseUrl, '/api/admin/moderate', { email: target.user.email, action: 'ban', durationMinutes: 1440, reason: 'Thử vượt quyền cấm.' }, helper.token)).status, 403,
      'role không có ban → bị chặn ở máy chủ');
    assert.equal((await get(env.baseUrl, '/api/admin/analytics?range=7d', helper.token)).status, 403, 'không có view_analytics');
    assert.equal((await post(env.baseUrl, '/api/admin/warn', { email: adminUser.user.email, reason: 'Thử cảnh cáo nhân sự.' }, helper.token)).status, 403,
      'nhân sự thường không cảnh cáo được nhân sự quản trị khác');
    assert.equal((await post(env.baseUrl, '/api/admin/moderate', { email: target.user.email, action: 'mute', durationMinutes: 60, reason: 'Thử khoá chat.' }, editor.token)).status, 403,
      'role chỉ có edit_content không vào được công cụ kiểm duyệt');

    /* ---------- edit_content: xoá nội dung vi phạm ---------- */
    const question = await post(env.baseUrl, '/api/questions', {
      title: 'Câu hỏi kiểm thử quyền biên tập',
      content: 'Nội dung câu hỏi dùng để kiểm thử quyền edit_content của vai trò tùy chỉnh.',
      subject: 'toan',
      authorId: 'rbac-q-1',
      authorName: 'Người hỏi',
      authorEmail: 'nguoi.hoi.rbac@example.test',
      authorAvatar: 'avatar.png',
      authorLevel: 1,
    });
    assert.ok(question.data?.success, JSON.stringify(question.data));
    assert.equal((await post(env.baseUrl, '/api/questions/delete', { questionId: question.data.question.id }, plain.token)).status, 403, 'thành viên thường không xoá được');
    assert.equal((await post(env.baseUrl, '/api/questions/delete', { questionId: question.data.question.id }, editor.token)).status, 200, 'edit_content xoá được');

    /* ---------- Mốc cấm 3 ngày + lọc trạng thái ---------- */
    assert.ok(MODERATION_DURATIONS_MIN.includes(4320), 'whitelist máy chủ có mốc 3 ngày');
    const ban3d = await post(env.baseUrl, '/api/admin/moderate', { email: target.user.email, action: 'ban', durationMinutes: 4320, reason: 'Spam liên tục trong 3 kênh.' }, superToken);
    assert.equal(ban3d.status, 200, JSON.stringify(ban3d.data));
    const bannedList = await get(env.baseUrl, '/api/admin/members?status=BANNED', superToken);
    assert.equal(bannedList.data.status, 'BANNED');
    assert.ok(bannedList.data.members.some((member) => member.email === target.user.email));
    assert.ok(bannedList.data.members.every((member) => member.moderation.banned));
    const activeList = await get(env.baseUrl, '/api/admin/members?status=ACTIVE&limit=100', superToken);
    assert.ok(!activeList.data.members.some((member) => member.email === target.user.email));
    const warnedList = await get(env.baseUrl, '/api/admin/members?status=WARNED&limit=100', superToken);
    assert.ok(warnedList.data.members.some((member) => member.email === target.user.email), 'lọc "có cảnh cáo"');

    /* ---------- Dashboard: số liệu bổ sung (mục 3.3) ---------- */
    const analytics = await get(env.baseUrl, '/api/admin/analytics?range=30d', superToken);
    assert.equal(analytics.status, 200);
    const extras = analytics.data.analytics.extras;
    assert.ok(extras, 'có extras');
    for (const key of ['pending', 'resolved', 'dismissed']) assert.equal(typeof extras.reportsByStatus[key], 'number');
    assert.equal(typeof extras.coinsIssued, 'number');
    assert.ok(Array.isArray(extras.topClubs));
    assert.ok(extras.retention7d >= 0 && extras.retention7d <= 1);

    /* ---------- Xoá role → gỡ mọi lượt gán ---------- */
    const removed = await del(env.baseUrl, `/api/admin/roles?id=${encodeURIComponent(warnRole.data.role.id)}`, superToken);
    assert.equal(removed.status, 200);
    assert.equal(removed.data.clearedAssignments, 1);
    const helperMe = await get(env.baseUrl, '/api/admin/me', helper.token);
    assert.deepEqual(helperMe.data.permissions, [], 'mất role → mất quyền ngay');
    assert.equal((await post(env.baseUrl, '/api/admin/warn', { email: target.user.email, reason: 'Thử sau khi mất quyền.' }, helper.token)).status, 403);
  } finally {
    await env.close();
    await flushPendingSave?.();
  }
});

test('Epic 3 RBAC: vai trò tùy chỉnh và lượt gán còn nguyên sau khi máy chủ khởi động lại', async () => {
  let env = await createTestServer();
  try {
    resetRateLimitersForTest();
    const superToken = (await post(env.baseUrl, '/api/auth/login', { email: 'BroAmStuck@gmail.com', password: TEST_ADMIN_PASSWORD })).data.token;
    const member = await register(env.baseUrl, 'ben-vung');
    const target = await register(env.baseUrl, 'doi-tuong');
    const created = await post(env.baseUrl, '/api/admin/roles', { name: 'Bền vững', icon: 'gem', color: '#6366f1', specialChar: '❖', permissions: ['warn'] }, superToken);
    assert.equal(created.status, 200, JSON.stringify(created.data));
    assert.equal((await post(env.baseUrl, '/api/admin/role', { email: member.user.email, customRole: created.data.role.id }, superToken)).status, 200);

    flushPendingSave();
    await env.close();
    env = await createTestServer(); // setupForumServer → loadStoreFromDisk() đọc lại từ đĩa

    const roles = await get(env.baseUrl, '/api/admin/roles', superToken);
    assert.equal(roles.status, 200);
    const reloaded = roles.data.roles.find((role) => role.id === created.data.role.id);
    assert.ok(reloaded, 'vai trò phải còn sau khi khởi động lại (customRoles được nạp lại)');
    assert.equal(reloaded.name, 'Bền vững');
    assert.equal(reloaded.memberCount, 1, 'lượt gán vẫn còn');
    const me = await get(env.baseUrl, '/api/admin/me', member.token);
    assert.deepEqual(me.data.permissions, ['warn'], 'quyền của vai trò vẫn hiệu lực sau khởi động lại');
    assert.equal((await post(env.baseUrl, '/api/admin/warn', { email: target.user.email, reason: 'Kiểm thử sau khởi động lại.' }, member.token)).status, 200);
  } finally {
    await env.close();
    flushPendingSave();
  }
});

test('Epic 3 RBAC: ma trận quyền phía client khớp cây quyền spec 3.1', () => {
  const superUser = { email: 'BroAmStuck@gmail.com', role: 'SUPER_ADMIN' };
  const teacher = { email: 'gv@example.test', role: 'STUDENT', staffRole: 'TEACHER' };
  const admin = { email: 'ad@example.test', role: 'STUDENT', customRoleDef: { id: 'r1', name: 'Admin', icon: 'crown', color: '#f59e0b', specialChar: '', permissions: ['give_role', 'ban', 'warn', 'mute'] } };
  const student = { email: 'hs@example.test', role: 'STUDENT' };

  assert.equal(rbac.isSuperAdminUser({ email: 'broamstuck@GMAIL.com' }), true, 'không phân biệt hoa thường');
  assert.equal(rbac.canGiveRole(superUser), true);
  assert.equal(rbac.canCreateRole(superUser), true);
  assert.equal(rbac.canGiveRole(admin), true, 'Admin thấy Give Role');
  assert.equal(rbac.canCreateRole(admin), true, 'Admin thấy Create Role');
  assert.equal(rbac.canModerate(teacher), true, 'Giáo viên kiểm duyệt được');
  assert.equal(rbac.canGiveRole(teacher), false, 'Giáo viên KHÔNG give role');
  assert.equal(rbac.canCreateRole(teacher), false, 'Giáo viên KHÔNG tạo role');
  assert.equal(rbac.canViewAnalytics(teacher), false);
  assert.equal(rbac.canAccessAdminPanel(student), false);
  assert.deepEqual(rbac.grantablePermissions(teacher), []);
  assert.deepEqual([...rbac.grantablePermissions(admin)].sort(), ['ban', 'give_role', 'mute', 'warn']);
});

test('Epic 3 Data Visualization Art: đường cong monotone, lưới "đẹp", cung donut', () => {
  const xs = [0, 100, 200, 300, 400];
  const ys = [80, 80, 10, 80, 80];
  const d = monotonePath(xs, ys);
  assert.match(d, /^M0,80( C[-\d.]+,[-\d.]+ [-\d.]+,[-\d.]+ [-\d.]+,[-\d.]+){4}$/, 'một lệnh M + 4 đoạn Bezier bậc 3');
  const numbers = d.replace(/[MC]/g, ' ').trim().split(/[\s,]+/).map(Number);
  const yValues = numbers.filter((_, index) => index % 2 === 1);
  assert.ok(Math.max(...yValues) <= 80 + 1e-9, 'monotone: không vọt xuống dưới đáy (không overshoot)');
  assert.ok(Math.min(...yValues) >= 10 - 1e-9, 'monotone: không vọt quá đỉnh');
  assert.equal(monotonePath([], []), '');
  assert.equal(niceCeiling(0), 1);
  assert.equal(niceCeiling(7), 10);
  assert.equal(niceCeiling(180), 200);
  assert.equal(niceCeiling(2300), 2500);
  const arcs = donutArcs([{ value: 1 }, { value: 3 }], 100, 0);
  assert.deepEqual(arcs.map((arc) => [arc.visible, arc.offset]), [[25, 0], [75, 25]]);
  assert.deepEqual(QUICK_DURATIONS.map((option) => option.label), ['1 ngày', '3 ngày', '1 tuần', 'Vĩnh viễn']);
  assert.ok(QUICK_DURATIONS.every((option) => MODERATION_DURATIONS_MIN.includes(option.value)), 'mọi mốc UI đều nằm trong whitelist máy chủ');
});

test('Epic 3 UI: bảng quản trị dùng biểu đồ Bezier, lưới ct-03 có thao tác từng dòng, Xưởng vai trò', () => {
  const modal = read('src/components/AdminInsightsModal.tsx');
  const charts = read('src/components/admin/AdminCharts.tsx');
  const chartsCss = read('src/components/admin/AdminCharts.css');
  const studio = read('src/components/admin/RoleStudio.tsx');
  const quick = read('src/components/admin/MemberQuickAction.tsx');
  const studioCss = read('src/components/admin/AdminStudio.css');
  const app = read('src/App.tsx');
  const radial = read('src/components/RadialQuickMenu.tsx');

  for (const piece of ['<SmoothAreaChart', '<StatusDonut', '<RetentionGauge', '<RoleStudio', '<MemberQuickAction', 'useAdminCaps()']) {
    assert.ok(modal.includes(piece), `AdminInsightsModal phải dùng ${piece}`);
  }
  assert.ok(!modal.includes('faa-chart__bar'), 'biểu đồ cột khô cứng đã được thay bằng đường cong');
  assert.match(charts, /monotonePath\(/);
  assert.match(charts, /<linearGradient id=\{`ffc-fill-/, 'gradient fill dưới đường cong');
  assert.match(charts, /<animate[\s\S]*attributeName="width"/, 'đường cong được "vẽ" vào');
  assert.match(chartsCss, /\.ffc-area__tip \{[\s\S]*transition:[\s\S]*left 280ms/, 'tooltip trượt mượt theo con trỏ');
  assert.match(chartsCss, /prefers-reduced-motion/);
  assert.match(modal, /role="group" aria-label="Lọc thành viên theo trạng thái"/);
  for (const kind of ["kind: 'ban'", "kind: 'warn'", "kind: 'mute'", "kind: 'role'"]) {
    assert.ok(modal.includes(kind), `mỗi dòng phải có thao tác ${kind}`);
  }
  assert.match(modal, /canAssignRoles && \(\s*<button[\s\S]*?ffg-act--role/, 'nút Give Role chỉ hiện với Admin/Super Admin');
  assert.match(modal, /MoreHorizontal/, 'menu ⋯ mở hồ sơ chi tiết');
  assert.match(studioCss, /\.faa-member-table--grid \.faa-member-head/);
  assert.match(studio, /role="radiogroup" aria-label="Chọn icon vai trò"/);
  assert.match(studio, /type="color"/, 'color picker');
  assert.match(studio, /Ký tự đặc biệt/);
  assert.match(studio, /ffr-preview/, 'preview trực tiếp');
  assert.match(studio, /Ma trận phân quyền/);
  assert.match(quick, /aria-modal="true"/);
  assert.match(app, /useAdminCapabilitiesLoader\(currentUser\)/);
  assert.match(app, /adminAccess=\{canOpenAdminPanel\}/);
  assert.match(radial, /id: 'admin'/, 'icon Admin cạnh menu tia sét (mục 3.2)');
});

test('Super Admin hồi quy: so khớp email không phân biệt hoa thường, không cửa hậu, không phiên giả', () => {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(tsx?|mjs)$/.test(entry.name)) files.push([full, fs.readFileSync(full, 'utf8')]);
    }
  };
  walk(path.resolve('src'));
  const find = (re) => files.filter(([, content]) => re.test(content)).map(([full]) => path.relative(process.cwd(), full));

  /* So sánh trực tiếp email với chuỗi Super Admin (bất kể hoa thường) — record có thể lưu
     'broamstuck@…' hoặc 'BroAmStuck@…'; chỉ isMasterAdmin() mới đúng ở mọi trường hợp. */
  assert.deepEqual(find(/[A-Za-z_.]*email\??\s*(===|!==)\s*['"]broamstuck@gmail\.com['"]/i), [],
    'Dùng isMasterAdmin() thay cho so sánh email trực tiếp');
  assert.deepEqual(find(/toLowerCase\(\)\s*(===|!==)\s*'BroAmStuck@gmail\.com'/), [],
    'Không so sánh email đã lowercase với chuỗi có chữ hoa (luôn false)');
  /* Cửa hậu cũ: so khớp mật khẩu hardcode ở client rồi tự tạo phiên Super Admin giả. */
  assert.deepEqual(find(/password\s*===\s*['"]/), [], 'Không được so khớp mật khẩu hardcode trong client (Yeucau.md §16)');
  assert.deepEqual(find(/mock-master-token/), [], 'Không được tạo token giả cho Super Admin');

  const store = read('src/store/forumStore.ts');
  assert.match(store, /if \(isMasterAdmin\(normalizedEmail\)\) \{\s*throw new Error\('Không kết nối được máy chủ để xác minh tài khoản quản trị/,
    'mất mạng không được tạo phiên Super Admin ngoại tuyến');
  const caps = read('src/utils/adminCapabilities.ts');
  assert.match(caps, /sessionInvalid: true/, 'phiên bị máy chủ từ chối phải được đánh dấu để hiện "Đăng nhập lại"');
  const modal = read('src/components/AdminInsightsModal.tsx');
  assert.match(modal, /faa-session-alert/);
  assert.match(modal, /onRelogin/);
});
