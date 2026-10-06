import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import { getAttendanceBoxType, getNextAttendanceStreak, setupForumServer } from '../server/forumServer.ts';
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

let registeredCounter = 0;
async function registerTestUser(testEnv, name = 'Realtime Test User') {
  registeredCounter += 1;
  const email = `realtime-${Date.now()}-${registeredCounter}@example.org`;
  const password = `Strong-password-${registeredCounter}-2026!`;
  const response = await fetch(`${testEnv.baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const registrationData = await response.json();
  assert.equal(response.status, 202, registrationData.message);
  const authenticated = await fetch(`${testEnv.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await authenticated.json();
  assert.equal(authenticated.status, 200, data.message);
  const setCookie = authenticated.headers.get('set-cookie');
  assert.ok(setCookie, 'Successful login must issue an authentication cookie');
  return { user: data.user, cookie: setCookie.split(';')[0], email, password, registrationData };
}

test('Server attendance streak and box milestones use consecutive calendar dates', () => {
  assert.equal(getNextAttendanceStreak('', 0, '2026-03-01'), 1);
  assert.equal(getNextAttendanceStreak('2026-02-28', 4, '2026-03-01'), 5, 'Streak math crosses month boundaries');
  assert.equal(getNextAttendanceStreak('2026-03-02', 5, '2026-03-03'), 6);
  assert.equal(getNextAttendanceStreak('2026-03-01', 5, '2026-03-03'), 1, 'A missed calendar day resets the streak');
  assert.deepEqual([5, 10, 15, 20, 25, 30].map(getAttendanceBoxType), [
    'blue', 'gold', 'red', 'blue', 'gold', 'red',
  ]);
  assert.equal(getAttendanceBoxType(9), null);
});

test('Unauthenticated clients cannot read forum sync/events or open a realtime socket', async () => {
  const testEnv = await createTestServer();
  let socket;
  try {
    assert.equal((await fetch(`${testEnv.baseUrl}/api/sync`)).status, 401);
    assert.equal((await fetch(`${testEnv.baseUrl}/api/events`)).status, 401);

    socket = new WebSocket(testEnv.wsUrl);
    const handshake = await new Promise(resolve => {
      const timer = setTimeout(() => resolve('timeout'), 2_000);
      socket.once('open', () => { clearTimeout(timer); resolve('unexpected open'); });
      socket.once('error', error => { clearTimeout(timer); resolve(error.message); });
    });
    assert.match(String(handshake), /401/, 'Anonymous WebSocket handshake must be rejected');
  } finally {
    socket?.terminate();
    await testEnv.close();
  }
});

test('1. WebSocket accepts presence but refuses client-originated content writes', async () => {
  const testEnv = await createTestServer();
  let clientA;
  let clientB;
  try {
    const userA = await registerTestUser(testEnv, 'Realtime User A');
    const userB = await registerTestUser(testEnv, 'Realtime User B');
    clientA = new WebSocket(testEnv.wsUrl, { headers: { Cookie: userA.cookie } });
    clientB = new WebSocket(testEnv.wsUrl, { headers: { Cookie: userB.cookie } });
    await Promise.all([
      new Promise((resolve, reject) => { clientA.once('open', resolve); clientA.once('error', reject); }),
      new Promise((resolve, reject) => { clientB.once('open', resolve); clientB.once('error', reject); }),
    ]);
    const receivedByB = [];
    clientB.on('message', raw => {
      try { receivedByB.push(JSON.parse(raw.toString())); } catch { /* ignore */ }
    });
    const rejected = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Expected WS_ERROR for a client write')), 2_000);
      clientA.on('message', raw => {
        const event = JSON.parse(raw.toString());
        if (event.type === 'WS_ERROR') {
          clearTimeout(timer);
          resolve(event);
        }
      });
    });
    clientA.send(JSON.stringify({ type: 'NEW_CHAT_MESSAGE', payload: {
      id: 'forged-message', content: 'This write must not be accepted', authorEmail: 'owner@example.org',
    } }));
    const response = await rejected;
    assert.equal(response.payload.status, 403);
    await new Promise(resolve => setTimeout(resolve, 80));
    assert.equal(receivedByB.some(event => event.type === 'NEW_CHAT_MESSAGE'), false);
    const sync = await (await fetch(`${testEnv.baseUrl}/api/sync`, { headers: { Cookie: userB.cookie } })).json();
    assert.equal(sync.data.chatMessages.some(message => message.id === 'forged-message'), false);
  } finally {
    if (clientA?.readyState === WebSocket.OPEN) clientA.close();
    if (clientB?.readyState === WebSocket.OPEN) clientB.close();
    await new Promise(resolve => setTimeout(resolve, 50));
    await testEnv.close();
  }
});

test('2. Authentication uses strong passwords, hashed credentials and an HttpOnly session', async () => {
  const testEnv = await createTestServer();
  const email = `hocsinhmoi-${Date.now()}@fpt.edu.vn`;
  const password = 'secure_password_123';
  try {
    const unknown = await fetch(`${testEnv.baseUrl}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ghost_user_999@fpt.edu.vn', password: 'wrong-password' }),
    });
    const unknownData = await unknown.json();
    assert.equal(unknown.status, 401);
    assert.equal(unknownData.message, 'Thông tin đăng nhập không chính xác.');

    const weakRegistration = await fetch(`${testEnv.baseUrl}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Weak', email: `weak-${Date.now()}@example.org`, password: 'short12' }),
    });
    assert.equal(weakRegistration.status, 400, 'Passwords shorter than 12 characters are rejected');

    const registerRes = await fetch(`${testEnv.baseUrl}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Học Sinh Mới', email, password }),
    });
    const regData = await registerRes.json();
    assert.equal(registerRes.status, 202, regData.message);
    assert.equal(regData.success, true);
    assert.equal(registerRes.headers.get('set-cookie'), null, 'Registration does not create a client-readable or existence-revealing session');

    const duplicateRes = await fetch(`${testEnv.baseUrl}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Duplicate', email, password: 'another_password_2026' }),
    });
    const duplicateData = await duplicateRes.json();
    assert.equal(duplicateRes.status, 202);
    assert.deepEqual(duplicateData, regData, 'New and already-registered addresses receive the same response');
    assert.equal(duplicateRes.headers.get('set-cookie'), null);

    const validLogin = await fetch(`${testEnv.baseUrl}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const loginData = await validLogin.json();
    assert.equal(validLogin.status, 200, loginData.message);
    assert.equal(loginData.user.level, 1);
    assert.equal(loginData.user.xp, 0);
    assert.equal(loginData.user.role, 'user');
    assert.equal(loginData.token, undefined, 'The API does not expose a JS-readable bearer token');
    const cookie = validLogin.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    const sessionCookie = cookie.split(';')[0];

    const sessionRes = await fetch(`${testEnv.baseUrl}/api/auth/session`,{
      headers: { Cookie: sessionCookie },
    });
    assert.equal(sessionRes.status, 200);
    assert.equal((await sessionRes.json()).user.email, email);

    const logoutRes = await fetch(`${testEnv.baseUrl}/api/auth/logout`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: sessionCookie }, body: '{}',
    });
    assert.equal(logoutRes.status, 200);
    const revoked = await fetch(`${testEnv.baseUrl}/api/auth/session`, { headers: { Cookie: sessionCookie } });
    assert.equal(revoked.status, 401, 'Logout revokes the server-side session');

    const loginAfterLogout = await fetch(`${testEnv.baseUrl}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(loginAfterLogout.status, 200);
    assert.match(loginAfterLogout.headers.get('set-cookie'), /HttpOnly/);

    const wrongPassword = await fetch(`${testEnv.baseUrl}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'incorrect_password_2026' }),
    });
    assert.equal(wrongPassword.status, 401);
    assert.equal((await wrongPassword.json()).message, 'Thông tin đăng nhập không chính xác.');
  } finally {
    await testEnv.close();
  }
});

test('3. New accounts default to user and no email-based Super Admin identity exists', async () => {
  const testEnv = await createTestServer();

  try {
    const reader = await registerTestUser(testEnv, 'Role isolation reader');
    const syncRes = await fetch(`${testEnv.baseUrl}/api/sync`, { headers: { Cookie: reader.cookie } });
    const syncData = await syncRes.json();
    const storedReader = Object.values(syncData.data.users).find(user => user.id === reader.user.id);

    assert.ok(storedReader, 'The registered account must be present in the authenticated registry');
    assert.equal(storedReader.role, 'user', 'An email address cannot implicitly elevate an account');
    assert.equal(storedReader.email, `${reader.user.id}@public.invalid`, 'Public sync must not expose account email addresses');
    assert.equal(Object.values(syncData.data.users).some(user => user.role === 'super_admin'), false,
      'A new installation has no baked-in Super Admin account');

    const loginModalCode = fs.readFileSync('src/components/LoginModal.tsx', 'utf8');
    assert.ok(!loginModalCode.includes('Đăng nhập Super Admin'), 'LoginModal must not expose quick Super Admin login');
    assert.ok(!loginModalCode.includes('handleQuickAdmin'), 'LoginModal must not have handleQuickAdmin function');

    const appCode = fs.readFileSync('src/App.tsx', 'utf8');
    assert.ok(appCode.includes("import.meta.env.DEV && currentUser?.role === 'super_admin'"),
      'The local XP sandbox is development-only and role-labelled');
    assert.ok(!appCode.includes('@gmail.com'), 'Frontend admin gating must not depend on a personal email');
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
      body: JSON.stringify({ name: 'Tài Khoản Ảo', email: 'sinhvien01@sv.f-forum.vn', password: 'Strong-password-2026!' }),
    });
    assert.equal(blocked.status, 400, 'Virtual account domain must be rejected');
    const blockedData = await blocked.json();
    assert.equal(blockedData.success, false);
    assert.ok(blockedData.message.includes('không còn được hỗ trợ'), 'Rejection must explain the retired domain');

    /* 6.3 Sổ đăng ký server chỉ chứa tài khoản thật */
    const reader = await registerTestUser(testEnv, 'Registry Audit Reader');
    const syncRes = await fetch(`${testEnv.baseUrl}/api/sync`, { headers: { Cookie: reader.cookie } });
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
    store.includes('prev.id === broadcastUser.id') && store.includes('email: prev.email'),
    'Server broadcasts update profiles by server user id while preserving the signed-in account email',
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

  /* 6.7 Đổi hồ sơ ở bất kỳ đâu → mọi nội dung đã đăng cũng đổi theo */
  assert.ok(
    store.includes('function syncUserIdentityIntoContent'),
    'Store must have ONE shared identity-sync helper (no duplicated patch lists)',
  );
  assert.ok(
    (store.match(/syncUserIdentityIntoContent\(/g) || []).length >= 5,
    'The helper must run from updateProfile, /api/sync, the BroadcastChannel handler and the server broadcast handler',
  );
  assert.ok(store.includes('!q.isAnonymous'), 'Anonymous questions must keep their pen name');
  assert.ok(
    store.includes('setChatMessages, setClubPosts, setClubs'),
    'Chat messages, club posts and club leader names must be synced as well',
  );
  assert.ok(
    store.includes('const resolveOwner'),
    'Content loaded from the server must be re-labelled with the newest profile',
  );
  assert.ok(
    store.includes("candidate.id === c.leaderId"),
    'Club leader names must follow the leader profile',
  );
});
