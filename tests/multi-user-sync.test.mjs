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

test('1. Security: unauthenticated WebSocket writes cannot persist forged chat messages', async () => {
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

    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal(receivedMessagesByB.length, 0, 'Unauthenticated client-authored WebSocket messages are ignored');

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
    assert.equal(regData.token, undefined, 'Session secret is not exposed to JavaScript');
    const sessionCookie = registerRes.headers.get('set-cookie');
    assert.ok(sessionCookie?.includes('HttpOnly'), 'Session cookie must be HttpOnly');
    const cookie = sessionCookie.split(';')[0];
    const sessionRes = await fetch(`${testEnv.baseUrl}/api/auth/session`, { headers: { Cookie: cookie } });
    const sessionData = await sessionRes.json();
    assert.equal(sessionRes.status, 200);
    assert.equal(sessionData.user.id, regData.user.id);
    assert.deepEqual(regData.user.inventory, [], 'New accounts start with empty inventory');
    assert.deepEqual(regData.user.earnedBadges, [], 'New accounts start without earned badges');

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
    const loginCookie = validLoginRes.headers.get('set-cookie')?.split(';')[0];
    assert.ok(loginCookie, 'Successful password login sets a session cookie');
    const validatedSession = await fetch(`${testEnv.baseUrl}/api/auth/session`, { headers: { Cookie: loginCookie } });
    assert.equal(validatedSession.status, 200);

    // Caller-supplied identity cannot target another account or claim XP.
    const forgedReward = await fetch(`${testEnv.baseUrl}/api/users/award-xp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: loginCookie },
      body: JSON.stringify({ email: 'another.user@example.test', userId: 'other-user', action: 'focus_session' }),
    });
    assert.notEqual(forgedReward.status, 200, 'A session cannot mutate another account by changing request identity');

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

test('3. Super Admin role is server-defined and cannot be claimed through registration or OAuth', async () => {
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

    const registration = await fetch(`${testEnv.baseUrl}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Spoofed Admin', email: 'anhtuantran0512@gmail.com', password: 'test-password' }),
    });
    assert.equal(registration.status, 400, 'Reserved admin identity cannot self-register');
    const social = await fetch(`${testEnv.baseUrl}/api/auth/social`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'google', email: 'anhtuantran0512@gmail.com', name: 'Spoofed Admin' }),
    });
    assert.equal(social.status, 501, 'An email claim cannot authenticate as admin');
    const appCode = fs.readFileSync('src/App.tsx', 'utf8');
    assert.ok(!appCode.includes('XPSandboxDock'), 'Arbitrary XP and Coin controls are removed');
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
