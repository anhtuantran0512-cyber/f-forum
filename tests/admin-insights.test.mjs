/* Bản quyền trí tuệ thuộc về BroAmStuck */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fforum-insights-'));
process.env.FFORUM_DATA_DIR = DATA_DIR;
const TEST_ADMIN_PASSWORD = 'test-only-super-admin-password-2026';
process.env.FFORUM_ADMIN_PASSWORD = TEST_ADMIN_PASSWORD;
const { setupForumServer, resetRateLimitersForTest, flushPendingSave } = await import('../server/forumServer.ts');
const {
  buildAnalyticsReport,
  createEmptyAnalytics,
  hashAnalyticsId,
  recordAnalyticsHeartbeat,
  recordAnalyticsVisit,
  sanitizeAnalyticsStore,
} = await import('../server/analytics.ts');

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
      const baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve({
        server,
        baseUrl,
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

async function register(baseUrl, label) {
  const suffix = `${label}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const result = await post(baseUrl, '/api/auth/register', {
    name: `Thành viên ${label}`,
    email: `${suffix}@example.test`,
    password: 'mat-khau-test-123',
  });
  assert.equal(result.status, 200, `đăng ký ${label}: ${JSON.stringify(result.data)}`);
  return result.data;
}

function connectWs(wsUrl, token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const inbox = [];
    const waiters = [];
    let authenticated = false;
    const waitFor = (type, timeoutMs = 1500) => new Promise((done, fail) => {
      const index = inbox.findIndex((message) => message.type === type);
      if (index >= 0) {
        done(inbox.splice(index, 1)[0]);
        return;
      }
      const timer = setTimeout(() => fail(new Error(`timeout chờ sự kiện ${type}`)), timeoutMs);
      waiters.push({ type, resolve: (message) => { clearTimeout(timer); done(message); } });
    });
    ws.on('message', (raw) => {
      let message;
      try { message = JSON.parse(raw.toString()); } catch { return; }
      const waiter = waiters.find((entry) => entry.type === message.type);
      if (waiter) {
        waiters.splice(waiters.indexOf(waiter), 1);
        waiter.resolve(message);
      } else if (message.type === 'AUTH_OK' && !authenticated) {
        authenticated = true;
        resolve({ ws, waitFor });
      } else {
        inbox.push(message);
      }
    });
    ws.on('error', reject);
    ws.on('open', () => ws.send(JSON.stringify({ type: 'AUTH', payload: { token } })));
  });
}

const testId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), 'utf8');

test('Insights: thống kê bền vững, danh bạ có phân quyền và thao tác cập nhật máy chủ thật', async () => {
  resetRateLimitersForTest();
  let env = await createTestServer();
  let studentWs = null;
  try {
    assert.equal((await get(env.baseUrl, '/api/admin/analytics')).status, 403, 'khách không xem được số liệu');
    assert.equal((await get(env.baseUrl, '/api/admin/members')).status, 403, 'khách không xem được danh bạ');

    const adminLogin = await post(env.baseUrl, '/api/auth/login', {
      email: 'anhtuantran0512@gmail.com',
      password: TEST_ADMIN_PASSWORD,
    });
    assert.equal(adminLogin.status, 200);
    const adminToken = adminLogin.data.token;

    const teacher = await register(env.baseUrl, 'teacher-insights');
    const moderator = await register(env.baseUrl, 'moderator-insights');
    const student = await register(env.baseUrl, 'student-insights');

    const grantTeacher = await post(env.baseUrl, '/api/admin/role', {
      email: teacher.user.email,
      staffRole: 'TEACHER',
      reason: 'Hỗ trợ quản lý cộng đồng.',
    }, adminToken);
    const grantModerator = await post(env.baseUrl, '/api/admin/role', {
      email: moderator.user.email,
      staffRole: 'MODERATOR',
      reason: 'Hỗ trợ kiểm duyệt nội dung.',
    }, adminToken);
    assert.equal(grantTeacher.status, 200);
    assert.equal(grantModerator.status, 200);
    studentWs = await connectWs(`${env.baseUrl.replace(/^http/, 'ws')}/ws`, student.token);

    /* Hồ sơ qua HTTP lẫn WebSocket không được phép tự cấp vai trò, Premium
       hay phạm vi quản lý CLB — nếu lọt đây thì API quản trị có thể bị chiếm. */
    const wsUserSync = studentWs.waitFor('SYNC_USER');
    studentWs.ws.send(JSON.stringify({
      type: 'SYNC_USER',
      payload: {
        email: student.user.email,
        role: 'SUPER_ADMIN',
        staffRole: 'MODERATOR',
        premiumUntil: 0,
        premiumGrantedAt: Date.now(),
        scopedClubIds: ['club-gia-mao'],
      },
    }));
    const wsUserResult = await wsUserSync;
    assert.equal(wsUserResult.payload.role, 'STUDENT', 'SYNC_USER không thể đổi vai trò gốc');
    assert.equal(wsUserResult.payload.staffRole, undefined, 'SYNC_USER không thể tự cấp Moderator');
    assert.equal(wsUserResult.payload.premiumUntil, undefined, 'SYNC_USER không thể tự cấp Premium vĩnh viễn');
    assert.deepEqual(wsUserResult.payload.scopedClubIds, [], 'SYNC_USER không thể tự cấp quyền quản lý CLB');

    const httpUserUpdate = await post(env.baseUrl, '/api/users/update', {
      email: student.user.email,
      updates: {
        staffRole: 'TEACHER',
        premiumUntil: 0,
        premiumGrantedAt: Date.now(),
        scopedClubIds: ['club-gia-mao'],
      },
    }, student.token);
    assert.equal(httpUserUpdate.status, 200);
    assert.equal(httpUserUpdate.data.user.staffRole, undefined, 'HTTP hồ sơ không thể tự cấp Giáo viên');
    assert.equal(httpUserUpdate.data.user.premiumUntil, undefined, 'HTTP hồ sơ không thể tự cấp Premium');
    assert.deepEqual(httpUserUpdate.data.user.scopedClubIds, [], 'HTTP hồ sơ không thể tự cấp quyền CLB');

    const deniedAnalytics = await get(env.baseUrl, '/api/admin/analytics?range=7d', teacher.token);
    assert.equal(deniedAnalytics.status, 403, 'Giáo viên không xem dữ liệu thống kê riêng');
    const deniedRole = await post(env.baseUrl, '/api/admin/role', {
      email: student.user.email,
      staffRole: 'MODERATOR',
      reason: 'Tự nâng quyền thử nghiệm.',
    }, teacher.token);
    assert.equal(deniedRole.status, 403, 'nhân sự không thể cấp vai trò');
    const deniedPremium = await post(env.baseUrl, '/api/admin/premium', {
      email: student.user.email,
      action: 'grant',
      durationDays: 30,
      reason: 'Thử vượt quyền.',
    }, moderator.token);
    assert.equal(deniedPremium.status, 403, 'nhân sự không thể quản lý Premium');

    const teacherList = await get(env.baseUrl, '/api/admin/members?role=TEACHER&page=1&limit=50', teacher.token);
    assert.equal(teacherList.status, 200);
    assert.equal(teacherList.data.canAssignRoles, false);
    assert.ok(teacherList.data.members.some((member) => member.email === teacher.user.email));
    const staffAllList = await get(env.baseUrl, '/api/admin/members?role=ALL', teacher.token);
    assert.equal(staffAllList.data.members.find((member) => member.email === student.user.email).profile, undefined,
      'nhân sự chỉ nhận dữ liệu tối thiểu, không nhận hồ sơ riêng tư');
    const underlyingRoleList = await get(env.baseUrl, '/api/admin/members?role=STUDENT', teacher.token);
    assert.ok(underlyingRoleList.data.members.some((member) => member.email === teacher.user.email),
      'bộ lọc vẫn tìm được vai trò gốc của người đồng thời là giáo viên');

    const staffCannotModerateStaff = await post(env.baseUrl, '/api/admin/moderate', {
      email: moderator.user.email,
      action: 'ban',
      durationMinutes: 60,
      reason: 'Kiểm tra giới hạn vai trò.',
    }, teacher.token);
    assert.equal(staffCannotModerateStaff.status, 403, 'Giáo viên không kiểm duyệt nhân sự khác');
    const staffCannotBanSelf = await post(env.baseUrl, '/api/admin/moderate', {
      email: teacher.user.email,
      action: 'ban',
      durationMinutes: 60,
      reason: 'Kiểm tra tự kiểm duyệt.',
    }, teacher.token);
    assert.equal(staffCannotBanSelf.status, 400, 'không thể tự áp chế');
    const warningNoticePromise = studentWs.waitFor('USER_WARNED');
    const staffWarn = await post(env.baseUrl, '/api/admin/warn', {
      email: student.user.email,
      reason: 'Vui lòng không đăng nội dung xúc phạm thành viên khác.',
    }, teacher.token);
    assert.equal(staffWarn.status, 200, 'Giáo viên có thể gửi cảnh cáo có nội dung');
    const warningNotice = await warningNoticePromise;
    assert.equal(warningNotice.payload.reason, staffWarn.data.warning.reason, 'nội dung được gửi riêng cho đúng tài khoản');
    assert.equal(warningNotice.payload.id, staffWarn.data.warning.id, 'mã sự kiện ổn định để tránh thông báo trùng giữa tab');
    const staffBan = await post(env.baseUrl, '/api/admin/moderate', {
      email: student.user.email,
      action: 'ban',
      durationMinutes: 60,
      reason: 'Vi phạm quy tắc cộng đồng nhiều lần.',
    }, teacher.token);
    assert.equal(staffBan.status, 200, 'Giáo viên có thể cấm đăng trong thời hạn');
    assert.equal(staffBan.data.status.banned, true);

    const premiumGrant = await post(env.baseUrl, '/api/admin/premium', {
      email: student.user.email,
      action: 'grant',
      durationDays: 30,
      reason: 'Tri ân đóng góp cho diễn đàn.',
    }, adminToken);
    assert.equal(premiumGrant.status, 200);
    assert.equal(premiumGrant.data.premium.active, true);
    assert.ok(premiumGrant.data.premium.until > Date.now());
    assert.equal((await post(env.baseUrl, '/api/admin/premium', {
      email: student.user.email,
      action: 'grant',
      durationDays: 60,
      reason: 'Thời hạn không được công bố.',
    }, adminToken)).status, 400);

    const protectedRole = await post(env.baseUrl, '/api/admin/role', {
      email: 'anhtuantran0512@gmail.com',
      staffRole: 'MODERATOR',
      reason: 'Thử sửa Super Admin.',
    }, adminToken);
    assert.equal(protectedRole.status, 400, 'Super Admin luôn được bảo vệ');

    const chat = await post(env.baseUrl, '/api/chat', {
      id: testId('insights-chat'),
      channelId: 'hallway',
      authorEmail: moderator.user.email,
      authorName: moderator.user.name,
      content: 'Tin nhắn kiểm thử thống kê cộng đồng.',
    }, moderator.token);
    assert.equal(chat.status, 200, `chat phải lưu được: ${JSON.stringify(chat.data)}`);

    const accountVisitorId = testId('visitor-admin-account');
    const accountSessionId = testId('session-admin-account');
    const visitEventId = testId('event-admin-visit');
    const accountVisit = await post(env.baseUrl, '/api/analytics/track', {
      type: 'visit', visitorId: accountVisitorId, sessionId: accountSessionId, eventId: visitEventId,
    }, adminToken);
    assert.equal(accountVisit.status, 200);
    const duplicateVisit = await post(env.baseUrl, '/api/analytics/track', {
      type: 'visit', visitorId: accountVisitorId, sessionId: accountSessionId, eventId: visitEventId,
    }, adminToken);
    assert.equal(duplicateVisit.data.duplicate, true, 'retry không nhân đôi lượt truy cập');
    const pageView = await post(env.baseUrl, '/api/analytics/track', {
      type: 'page_view', visitorId: accountVisitorId, sessionId: accountSessionId,
      eventId: testId('event-admin-page'), view: 'home',
    }, adminToken);
    assert.equal(pageView.status, 200);
    const heartbeat = await post(env.baseUrl, '/api/analytics/track', {
      type: 'heartbeat', visitorId: accountVisitorId, sessionId: accountSessionId,
      eventId: testId('event-admin-time'), activeSeconds: 35,
    }, adminToken);
    assert.equal(heartbeat.status, 200);

    const guestVisit = await post(env.baseUrl, '/api/analytics/track', {
      type: 'visit', visitorId: testId('visitor-anonymous'), sessionId: testId('session-anonymous'),
      eventId: testId('event-anonymous-visit'),
    });
    assert.equal(guestVisit.status, 200, 'khách vẫn được tính bằng mã trình duyệt ngẫu nhiên');

    const report = await get(env.baseUrl, '/api/admin/analytics?range=7d', adminToken);
    assert.equal(report.status, 200);
    const stats = report.data.analytics;
    assert.equal(stats.range, '7d');
    assert.equal(stats.period.visits, 2, 'hai trình duyệt/phiên đã tạo đúng hai lượt mở');
    assert.equal(stats.period.pageViews, 1);
    assert.ok(stats.period.activeSeconds < 35,
      'server only credits elapsed wall time, not the duration claimed by the browser');
    assert.equal(stats.totals.messages, 1, 'tin nhắn chỉ được thống kê sau khi lưu thành công');
    assert.ok(stats.totals.uniqueVisitors >= 2);
    assert.ok(stats.totals.registeredVisitors >= 1);
    assert.ok(stats.totals.anonymousBrowsers >= 1);
    assert.ok(Array.isArray(stats.series) && stats.series.length === 7);
    assert.ok(stats.topMembers.some((member) => member.email === 'anhtuantran0512@gmail.com'));

    const monthly = await get(env.baseUrl, '/api/admin/analytics?range=12m', adminToken);
    assert.equal(monthly.data.analytics.series.length, 12);
    const yearly = await get(env.baseUrl, '/api/admin/analytics?range=years', adminToken);
    assert.ok(yearly.data.analytics.series.length >= 1);

    const superAdminBan = await post(env.baseUrl, '/api/admin/moderate', {
      email: 'anhtuantran0512@gmail.com',
      action: 'ban',
      durationMinutes: 60,
      reason: 'Thử cấm Super Admin.',
    }, adminToken);
    assert.equal(superAdminBan.status, 400, 'không ai được cấm Super Admin');

    flushPendingSave();
    await env.close();
    env = await createTestServer();
    const persisted = await get(env.baseUrl, '/api/admin/analytics?range=7d', adminToken);
    assert.equal(persisted.status, 200);
    assert.equal(persisted.data.analytics.totals.activeSeconds, stats.totals.activeSeconds,
      'số liệu đã được giới hạn vẫn sống sót sau khi máy chủ khởi động lại');
    const persistedMembers = await get(env.baseUrl, `/api/admin/members?q=${encodeURIComponent(student.user.email)}`, adminToken);
    assert.equal(persistedMembers.status, 200);
    assert.equal(persistedMembers.data.members[0].moderation.banned, true);
    assert.equal(persistedMembers.data.members[0].premium.active, true);
    assert.equal(persistedMembers.data.members[0].warningCount, 1);
  } finally {
    studentWs?.ws.close();
    await env.close();
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }
});

test('Analytics chỉ cộng thời gian heartbeat đã trôi qua theo đồng hồ máy chủ', () => {
  const startedAt = 1_700_000_000_000;
  const analytics = createEmptyAnalytics(startedAt);
  const session = { visitorId: 'active-time-browser', sessionId: 'active-time-session' };
  const visit = recordAnalyticsVisit(analytics, {
    ...session, eventId: 'active-time-visit', now: startedAt,
  });
  assert.equal(visit.ok, true);

  const heartbeat = (eventId, at) => recordAnalyticsHeartbeat(analytics, {
    ...session, eventId, activeSeconds: 60, now: at,
  });
  heartbeat('active-time-1', startedAt + 35_000);
  assert.equal(analytics.totals.activeSeconds, 35,
    'khai báo 60 giây nhưng chỉ 35 giây đã trôi qua');

  const retry = heartbeat('active-time-1', startedAt + 45_000);
  assert.equal(retry.duplicate, true);
  assert.equal(analytics.totals.activeSeconds, 35, 'retry không cộng thời gian lần hai');

  heartbeat('active-time-2', startedAt + 46_000);
  assert.equal(analytics.totals.activeSeconds, 46,
    'thời gian giữa heartbeat được cộng, không cộng bù từ thời điểm retry');
  heartbeat('active-time-3', startedAt + 46_000);
  assert.equal(analytics.totals.activeSeconds, 46,
    'heartbeat tức thời không thể tạo thêm thời gian');
  heartbeat('active-time-4', startedAt + 50_000);
  assert.equal(analytics.totals.activeSeconds, 50);
});

test('Analytics nạp phiên cũ không có mốc heartbeat mà không bịa thời gian hoạt động', () => {
  const now = 1_700_000_100_000;
  const visitorId = 'legacy-analytics-visitor';
  const sessionId = 'legacy-analytics-session';
  const lastSeenAt = now - 12_000;
  const migrated = sanitizeAnalyticsStore({
    trackingStartedAt: now - 100_000,
    sessions: {
      [hashAnalyticsId(sessionId)]: {
        visitorKey: hashAnalyticsId(visitorId),
        lastSeenAt,
        eventIds: [],
        visitIdentities: [],
      },
    },
  }, now);

  assert.equal(migrated.sessions[hashAnalyticsId(sessionId)].lastHeartbeatAt, lastSeenAt,
    'dữ liệu tồn tại được tiếp tục từ lastSeenAt thay vì cộng một khoảng không xác thực');
});

test('Analytics không gắn cố định trình duyệt dùng chung vào tài khoản đăng nhập đầu tiên', () => {
  const now = Date.now();
  const analytics = createEmptyAnalytics(now);
  const visitorId = 'shared-browser-first-party-id';
  const sessionId = 'shared-tab-session-id';
  const event = (eventId, email, at) => recordAnalyticsVisit(analytics, {
    visitorId,
    sessionId,
    eventId,
    email,
    now: at,
  });

  event('guest-visit-before-login', undefined, now);
  event('account-one-sign-in', 'one@example.test', now + 1);
  event('account-two-sign-in', 'two@example.test', now + 2);
  event('repeat-account-two-event', 'two@example.test', now + 3);

  assert.equal(analytics.members['one@example.test'].visits, 1);
  assert.equal(analytics.members['two@example.test'].visits, 1);
  assert.equal(analytics.visitors[hashAnalyticsId(visitorId)].hadAnonymousActivity, true);
  const report = buildAnalyticsReport(analytics, {}, '7d', now + 3);
  assert.equal(report.period.visits, 3, 'mỗi danh tính chỉ có một lượt trong cùng phiên');
  assert.equal(report.totals.registeredVisitors, 2);
  assert.equal(report.totals.anonymousBrowsers, 1);
  assert.equal(report.totals.uniqueVisitors, 3);
});

test('Insights UI: Bento responsive, phân trang và công cụ có nhãn, API được gọi bằng phiên xác thực', () => {
  const component = read('src/components/AdminInsightsModal.tsx');
  const css = read('src/components/AdminInsightsModal.css');
  const app = read('src/App.tsx');
  const radial = read('src/components/RadialQuickMenu.tsx');
  const store = read('src/store/forumStore.ts');
  const notifications = read('src/utils/notifications.ts');

  assert.match(component, /\/api\/admin\/analytics\?range=/);
  assert.match(component, /\/api\/admin\/members\?/);
  assert.match(component, /headers: authHeaders\(\)/);
  assert.match(component, /postJson\('\/api\/admin\/role'/);
  assert.match(component, /postJson\('\/api\/admin\/warn'/);
  assert.match(component, /postJson\('\/api\/admin\/premium'/);
  assert.match(component, /postJson\('\/api\/admin\/moderate'/);
  assert.match(component, /aria-modal="true"/);
  assert.match(component, /role="group" aria-label="Lọc thành viên theo vai trò"/);
  assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /@container \(max-width: 650px\)/);
  assert.match(css, /position: sticky/);
  assert.match(app, /<AdminInsightsModal/);
  assert.match(radial, /id: 'admin'/);
  assert.match(store, /case 'USER_WARNED'/);
  assert.match(store, /Cảnh cáo từ Ban Quản Trị/);
  assert.match(notifications, /list\.some\(\(notification\) => notification\?\.id === item\.id\)/);
});
