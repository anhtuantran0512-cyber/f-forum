import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import { setupForumServer } from '../server/forumServer.ts';
import { WebSocket } from 'ws';

// Test Helper to spin up a mock server with connect middlewares
function createTestServer() {
  const middlewares = [];
  const middlewareRunner = {
    use(fn) {
      middlewares.push(fn);
    },
  };

  const server = http.createServer((req, res) => {
    let index = 0;
    function next() {
      if (index < middlewares.length) {
        const fn = middlewares[index++];
        fn(req, res, next);
      } else {
        res.statusCode = 404;
        res.end('Not Found');
      }
    }
    next();
  });

  setupForumServer(server, middlewareRunner);

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({
        server,
        port,
        baseUrl: `http://127.0.0.1:${port}`,
        wsUrl: `ws://127.0.0.1:${port}/ws`,
        close: () => new Promise((res) => server.close(res)),
      });
    });
  });
}

test('1. Real-Time Multi-Device WebSocket Sync: Client A message immediately received by Client B', async () => {
  const testEnv = await createTestServer();

  try {
    const clientA = new WebSocket(testEnv.wsUrl);
    const clientB = new WebSocket(testEnv.wsUrl);

    await Promise.all([
      new Promise((res) => clientA.on('open', res)),
      new Promise((res) => clientB.on('open', res)),
    ]);

    const receivedMessagesByB = [];
    clientB.on('message', (raw) => {
      try {
        const parsed = JSON.parse(raw.toString());
        if (parsed.type === 'NEW_CHAT_MESSAGE') {
          receivedMessagesByB.push(parsed.payload);
        }
      } catch {
        /* ignore */
      }
    });

    const testMessage = {
      id: `msg-test-${Date.now()}`,
      channelId: 'hallway',
      authorId: 'user-clone-123',
      authorName: 'Clone Account',
      authorEmail: 'clone@test.local',
      authorAvatar: 'avatar.png',
      authorLevel: 1,
      content: 'Chào acc chính, tôi là acc clone đang test real-time sync!',
      timestamp: '12:00',
    };

    // Client A sends message over WebSocket
    clientA.send(JSON.stringify({ type: 'NEW_CHAT_MESSAGE', payload: testMessage }));

    // Wait up to 1000ms for Client B to receive
    const start = Date.now();
    while (receivedMessagesByB.length === 0 && Date.now() - start < 1500) {
      await new Promise((r) => setTimeout(r, 50));
    }

    assert.equal(receivedMessagesByB.length, 1, 'Client B must have received 1 real-time message');
    assert.equal(receivedMessagesByB[0].content, testMessage.content);
    assert.equal(receivedMessagesByB[0].authorEmail, 'clone@test.local');

    clientA.close();
    clientB.close();
  } finally {
    await testEnv.close();
  }
});

test('2. Authentication Logic: Login rejects non-existent users; Register requires email and password', async () => {
  const testEnv = await createTestServer();

  try {
    // 2.1 Attempt login with unregistered email -> Must reject
    const nonExistentLogin = await fetch(`${testEnv.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ghost_user_999@fpt.edu.vn', password: 'password123' }),
    });
    const loginErr = await nonExistentLogin.json();
    assert.equal(nonExistentLogin.status, 400);
    assert.equal(loginErr.success, false);
    assert.ok(loginErr.message.includes('Tài khoản không tồn tại'));

    // 2.2 Register new valid student account
    const registerRes = await fetch(`${testEnv.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Học Sinh Mới',
        email: 'hocsinhmoi@fpt.edu.vn',
        password: 'secure_password_123',
      }),
    });
    const regData = await registerRes.json();
    assert.equal(registerRes.status, 200);
    assert.equal(regData.success, true);
    assert.equal(regData.user.level, 1, 'New student starts at Level 1');
    assert.equal(regData.user.xp, 0, 'New student starts with 0 XP');
    assert.equal(regData.user.role, 'STUDENT');
    assert.ok(regData.token.startsWith('f_token_'), 'Session token generated');

    // 2.3 Duplicate register attempt -> Must reject
    const duplicateRes = await fetch(`${testEnv.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Trùng Email',
        email: 'hocsinhmoi@fpt.edu.vn',
        password: 'another_password',
      }),
    });
    const dupErr = await duplicateRes.json();
    assert.equal(duplicateRes.status, 400);
    assert.ok(dupErr.message.includes('đã được đăng ký'));

    // 2.4 Login with registered credentials -> Must succeed
    const validLoginRes = await fetch(`${testEnv.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'hocsinhmoi@fpt.edu.vn',
        password: 'secure_password_123',
      }),
    });
    const validLoginData = await validLoginRes.json();
    assert.equal(validLoginRes.status, 200);
    assert.equal(validLoginData.success, true);
    assert.equal(validLoginData.user.email, 'hocsinhmoi@fpt.edu.vn');

    // 2.5 Login with incorrect password -> Must reject
    const wrongPassRes = await fetch(`${testEnv.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'hocsinhmoi@fpt.edu.vn',
        password: 'wrong_password',
      }),
    });
    const wrongPassData = await wrongPassRes.json();
    assert.equal(wrongPassRes.status, 400);
    assert.ok(wrongPassData.message.includes('Mật khẩu không chính xác'));
  } finally {
    await testEnv.close();
  }
});

test('3. Super Admin Isolation: ONLY anhtuantran0512@gmail.com receives SUPER_ADMIN role', async () => {
  const testEnv = await createTestServer();

  try {
    const syncRes = await fetch(`${testEnv.baseUrl}/api/sync`);
    const syncData = await syncRes.json();
    const adminUser = syncData.data.users['anhtuantran0512@gmail.com'];

    assert.ok(adminUser, 'Admin user must exist in registry');
    assert.equal(adminUser.role, 'SUPER_ADMIN', 'anhtuantran0512@gmail.com must have SUPER_ADMIN role');
    assert.equal(adminUser.name, 'Trần Văn Anh Tuấn');

    // Check that LoginModal source has NO "Đăng nhập Super Admin" shortcut button
    const loginModalCode = fs.readFileSync('src/components/LoginModal.tsx', 'utf8');
    assert.ok(!loginModalCode.includes('Đăng nhập Super Admin'), 'LoginModal must not expose quick Super Admin login');
    assert.ok(!loginModalCode.includes('handleQuickAdmin'), 'LoginModal must not have handleQuickAdmin function');

    // Check that App.tsx isolates XPSandboxDock strictly to admin
    const appCode = fs.readFileSync('src/App.tsx', 'utf8');
    assert.ok(
      appCode.includes("currentUser?.email === 'anhtuantran0512@gmail.com' &&"),
      'XPSandboxDock must strictly require currentUser.email === anhtuantran0512@gmail.com'
    );
  } finally {
    await testEnv.close();
  }
});

test('4. Feedback Form: Category select, >= 20 chars validation, and high-contrast submit button', async () => {
  const testEnv = await createTestServer();

  try {
    // 4.1 Short feedback (< 20 chars) -> rejected
    const shortRes = await fetch(`${testEnv.baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Nguyễn Văn A',
        email: 'vana@gmail.com',
        category: 'Báo lỗi giao diện',
        content: 'Ngắn quá',
      }),
    });
    const shortData = await shortRes.json();
    assert.equal(shortRes.status, 400);
    assert.ok(shortData.message.includes('tối thiểu 20 ký tự'));

    // 4.2 Valid feedback (>= 20 chars) -> accepted
    const validRes = await fetch(`${testEnv.baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Nguyễn Văn A',
        email: 'vana@gmail.com',
        category: 'Đề xuất tính năng',
        content: 'Đề xuất thêm tính năng ghim bài viết câu lạc bộ lên đầu bảng tin.',
      }),
    });
    const validData = await validRes.json();
    assert.equal(validRes.status, 200);
    assert.equal(validData.success, true);
    assert.ok(validData.message.includes('Ban Quản Trị'));

    // Check ChroniclesView has explicit "Gửi ý kiến đóng góp" button
    const chroniclesCode = fs.readFileSync('src/components/views/ChroniclesView.tsx', 'utf8');
    assert.ok(chroniclesCode.includes('Gửi ý kiến đóng góp'), 'ChroniclesView must have explicit submit button');
    assert.ok(!chroniclesCode.includes('100% Người thật & Tương tác thật'), 'Artificial slogan must be purged');
  } finally {
    await testEnv.close();
  }
});

test('5. Copywriting Purge: Hero Headline and Subtext grounded in student forum reality', () => {
  const homeCode = fs.readFileSync('src/components/views/HomeView.tsx', 'utf8');
  assert.ok(homeCode.includes('Diễn Đàn Học Sinh'), 'HomeView must include Diễn Đàn Học Sinh');
  assert.ok(
    homeCode.includes('Không gian trao đổi bài học, giao lưu câu lạc bộ và kết nối bạn bè.'),
    'HomeView must have the clean subtext'
  );
  assert.ok(!homeCode.includes('tham gia cộng đồng học sinh thật tương tác thật'), 'No artificial slogan');
});

test('6. Vòng 11 — tài khoản ảo bị xoá vĩnh viễn, hồ sơ người dùng đồng bộ qua sổ đăng ký thật', async () => {
  /* 6.1 Không còn module tài khoản mô phỏng nào trong mã nguồn */
  assert.ok(!fs.existsSync('src/utils/cohort.ts'), 'The virtual cohort module must be deleted, not shimmed');
  [
    'src/components/views/LeaderboardWidget.tsx',
    'src/store/forumStore.ts',
    'src/components/views/ChatView.tsx',
  ].forEach((rel) => {
    const code = fs.readFileSync(rel, 'utf8');
    assert.ok(
      !/COHORT|cohortActivityPoints|isCohortMember/.test(code),
      `${rel} must be free of virtual accounts`,
    );
    assert.ok(
      (code.match(/sv\.f-forum\.vn/g) || []).length <= 1,
      `${rel} may mention the retired domain once (the guard) and nowhere else`,
    );
  });

  /* 6.2 Server từ chối mọi email thuộc miền mô phỏng đã xoá */
  const testEnv = await createTestServer();
  try {
    const blocked = await fetch(`${testEnv.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Tài Khoản Ảo', email: 'sinhvien01@sv.f-forum.vn', password: 'password123' }),
    });
    assert.equal(blocked.status, 400, 'Virtual account domain must be rejected');
    const blockedData = await blocked.json();
    assert.equal(blockedData.success, false);
    assert.ok(blockedData.message.includes('không còn được hỗ trợ'), 'Rejection must explain the retired domain');

    /* 6.3 Sổ đăng ký server chỉ chứa tài khoản thật */
    const syncRes = await fetch(`${testEnv.baseUrl}/api/sync`);
    const syncData = await syncRes.json();
    const emails = Object.keys(syncData.data.users || {});
    assert.ok(emails.length >= 1, 'Server registry must expose the real accounts');
    assert.ok(
      !emails.some((email) => email.endsWith('@sv.f-forum.vn')),
      'Server registry must never contain a virtual account',
    );
  } finally {
    await testEnv.close();
  }

  /* 6.4 Client: sổ đăng ký được vệ sinh ở mọi cửa vào và luôn khoá theo email */
  const store = fs.readFileSync('src/store/forumStore.ts', 'utf8');
  assert.ok(store.includes("RETIRED_VIRTUAL_DOMAIN = '@sv.f-forum.vn'"), 'Store must retire the virtual domain');
  assert.ok(store.includes('sanitizeUsersRegistry(JSON.parse(saved))'), 'Hydration must sanitize the persisted registry');
  assert.ok(store.includes('sanitizeUsersRegistry(users)'), 'Every persist must write the sanitized registry');
  assert.ok(
    store.includes('sanitizeUsersRegistry({ ...prev, ...data.users })'),
    'Server sync must sanitize the merged registry (server wins on conflicts)',
  );
  assert.ok(
    store.includes('prev.email.toLowerCase() === updatedUser.email.toLowerCase() ? updatedUser : prev'),
    'Editing a profile in one tab must refresh the profile in every other tab',
  );

  /* 6.5 Bảng xếp hạng đọc thẳng sổ đăng ký thật, không gộp nguồn ảo nào */
  const board = fs.readFileSync('src/components/views/LeaderboardWidget.tsx', 'utf8');
  assert.ok(
    board.includes('computeMembers(users,') && board.includes('buildHoursMembers(users,'),
    'Both leaderboards must read the real registry directly',
  );
  assert.ok(!board.includes('...COHORT'), 'Board must not merge any virtual list');

  /* 6.6 Trang giới thiệu cũng không còn nhân vật mô phỏng */
  const mocks = fs.readFileSync('src/components/landing/LandingMocks.tsx', 'utf8');
  const content = fs.readFileSync('src/components/landing/landingContent.ts', 'utf8');
  assert.ok(!mocks.includes('Minh Anh') && !mocks.includes('Nguyễn Khánh Linh'), 'Landing mocks must not name virtual students');
  assert.ok(!content.includes('TESTIMONIALS'), 'The fake testimonial list must be replaced by real feature highlights');
  assert.ok(content.includes('export const HIGHLIGHTS'), 'Feature highlights must describe real system capabilities');
});
