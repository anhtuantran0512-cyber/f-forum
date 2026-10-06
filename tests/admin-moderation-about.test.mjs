import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { setUserRoleForTest, setupForumServer } from '../server/forumServer.ts';
import { WebSocket } from 'ws';

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

// 1. Static Architecture & Security Audit for Hall of Fame & Admin Controls
test('1. Static Architecture & Security Audit: Khu Vinh Danh & Super Admin Moderation', () => {
  const aboutUsPath = path.resolve('src/components/AboutUs.tsx');
  const chroniclesPath = path.resolve('src/components/views/ChroniclesView.tsx');
  const qaForumPath = path.resolve('src/components/views/QAForumView.tsx');
  const chatViewPath = path.resolve('src/components/views/ChatView.tsx');
  const chatDockPath = path.resolve('src/components/ChatDock.tsx');

  const aboutUsContent = fs.readFileSync(aboutUsPath, 'utf8');
  const chroniclesContent = fs.readFileSync(chroniclesPath, 'utf8');
  const qaForumContent = fs.readFileSync(qaForumPath, 'utf8');
  const chatViewContent = fs.readFileSync(chatViewPath, 'utf8');
  const chatDockContent = fs.readFileSync(chatDockPath, 'utf8');

  assert.ok(
    chroniclesContent.includes('<AboutUs'),
    'ChroniclesView must embed AboutUs component'
  );

  // Verify Playfair Display aesthetic & Dark Cinematic tokens
  assert.ok(
    aboutUsContent.includes('font-playfair') || aboutUsContent.includes('Playfair Display'),
    'AboutUs must apply Playfair Display for dark cinematic archive typography'
  );
  assert.ok(
    aboutUsContent.includes('obsidian-glass') || aboutUsContent.includes('liquid-glass'),
    'AboutUs must use obsidian/liquid glass dark styling'
  );

  // Verify Founder Tribute: Trần Văn Anh Tuấn & BroAmStuck Studio
  assert.ok(
    aboutUsContent.includes('Trần Văn Anh Tuấn') || aboutUsContent.includes('aboutData.founder.name'),
    'AboutUs must render Founder name'
  );
  assert.ok(
    aboutUsContent.includes('BroAmStuck Studio') || aboutUsContent.includes('DEFAULT_ABOUT_DATA'),
    'AboutUs must reference BroAmStuck Studio or default founder data'
  );

  // Verify 3D Tilt interactive cards and Lightbox FLIP Modal
  assert.ok(
    aboutUsContent.includes('rotateX') && aboutUsContent.includes('rotateY'),
    'AboutUs must implement dynamic 3D tilt perspective interactions'
  );
  assert.ok(
    aboutUsContent.includes('activeLightboxMilestone'),
    'AboutUs must have Lightbox inspection modal for milestone cards'
  );

  // Non-Admin Isolation in AboutUs: Floating button & edit modal
  assert.ok(
    aboutUsContent.includes('canManageAbout') && aboutUsContent.includes('isAdminRole'),
    'AboutUs must gate edit controls by a recognized server role'
  );
  assert.ok(
    aboutUsContent.includes('Chỉnh sửa trang Vinh danh'),
    'AboutUs must contain the floating edit button text for Super Admin'
  );

  // Non-Admin Isolation in QAForumView: Delete/Edit question & Delete solution
  assert.ok(
    qaForumContent.includes('isSuperAdmin'),
    'QAForumView must check isSuperAdmin for moderation actions'
  );
  assert.ok(
    qaForumContent.includes('Xóa phản hồi vi phạm') || qaForumContent.includes('Xóa câu hỏi'),
    'QAForumView must contain admin moderation action triggers'
  );

  // Non-Admin Isolation in ChatView & ChatDock: Recall / Delete message
  assert.ok(
    chatViewContent.includes('isSuperAdmin') && chatViewContent.includes('Thu hồi tin nhắn'),
    'ChatView must protect message recall with isSuperAdmin check'
  );
  assert.ok(
    chatDockContent.includes('isSuperAdmin') && chatDockContent.includes('Thu hồi tin nhắn'),
    'ChatDock must protect message recall with isSuperAdmin check'
  );

  // Verify Milestone place field rendered in AboutUs Lightbox
  assert.ok(
    aboutUsContent.includes('place'),
    'AboutUs must render place information for milestones'
  );

  // Verify File Upload capability in AboutUs
  assert.ok(
    aboutUsContent.includes('type="file"') && aboutUsContent.includes('handleFileToDataUrl'),
    'AboutUs must support direct image file upload'
  );

  // Verify 3-dots moderation menu in QAForumView
  assert.ok(
    qaForumContent.includes('MoreVertical') && qaForumContent.includes('openMenuQuestionId'),
    'QAForumView must contain 3-dots moderation dropdown menu on question cards'
  );

  // Verify Reusable ForumPost moderation component exists and operates
  const forumPostPath = path.resolve('src/components/ForumPost.tsx');
  assert.ok(fs.existsSync(forumPostPath), 'src/components/ForumPost.tsx must exist');
  const forumPostContent = fs.readFileSync(forumPostPath, 'utf8');
  assert.ok(
    forumPostContent.includes('Xóa bài viết') && forumPostContent.includes('Sửa nội dung'),
    'ForumPost must render standard moderation actions'
  );

  // Audit: Form inputs must have maxLength boundaries
  const inputTags = aboutUsContent.match(/<input[^>]*>/g) || [];
  for (const tag of inputTags) {
    if (!tag.includes('type="checkbox"') && !tag.includes('type="file"') && !tag.includes('type="hidden"')) {
      assert.ok(tag.includes('maxLength'), `All text inputs in AboutUs must have maxLength: ${tag}`);
    }
  }
  const textareaTags = aboutUsContent.match(/<textarea[^>]*>/g) || [];
  for (const tag of textareaTags) {
    assert.ok(tag.includes('maxLength'), `All textareas in AboutUs must have maxLength: ${tag}`);
  }
});

let generatedUser = 0;
const adminByEnv = new WeakMap();

function cookieFrom(response) {
  const value = response.headers.get('set-cookie');
  assert.ok(value, 'Successful authentication must issue a session cookie');
  return value.split(';')[0];
}

async function postJson(testEnv, route, body, cookie) {
  return fetch(`${testEnv.baseUrl}${route}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function registerUser(testEnv, name = 'Student') {
  generatedUser += 1;
  const email = `security-test-${generatedUser}-${Date.now()}@example.org`;
  const password = `Strong-Password-${generatedUser}-2026!`;
  const response = await postJson(testEnv, '/api/auth/register', { name, email, password });
  const registrationData = await response.json();
  assert.equal(response.status, 202, registrationData.message);
  const loginResponse = await postJson(testEnv, '/api/auth/login', { email, password });
  const data = await loginResponse.json();
  assert.equal(loginResponse.status, 200, data.message);
  return { cookie: cookieFrom(loginResponse), user: data.user, password };
}

async function getTestAdmin(testEnv) {
  const existing = adminByEnv.get(testEnv);
  if (existing) return existing;
  const registered = await registerUser(testEnv, 'Test Super Admin');
  setUserRoleForTest(registered.user.email, 'super_admin');
  const response = await postJson(testEnv, '/api/auth/login', {
    email: registered.user.email,
    password: registered.password,
  });
  const data = await response.json();
  assert.equal(response.status, 200, data.message);
  const admin = { ...registered, user: data.user, cookie: cookieFrom(response) };
  adminByEnv.set(testEnv, admin);
  return admin;
}

async function loginAdmin(testEnv) {
  return (await getTestAdmin(testEnv)).cookie;
}

test('Super Admin has a separate console entry and the console uses real moderation APIs', () => {
  const profilePath = path.resolve('src/components/ProfileDropdown.tsx');
  const navbarPath = path.resolve('src/components/Navbar.tsx');
  const appPath = path.resolve('src/App.tsx');
  const consolePath = path.resolve('src/components/AdminConsole.tsx');
  const profile = fs.readFileSync(profilePath, 'utf8');
  const navbar = fs.readFileSync(navbarPath, 'utf8');
  const app = fs.readFileSync(appPath, 'utf8');
  const adminConsole = fs.readFileSync(consolePath, 'utf8');

  assert.ok(profile.includes('isAdminRole(currentUser.role)'), 'The profile menu must gate the admin entry by the server role');
  assert.ok(profile.includes('Bảng điều khiển quản trị') && profile.includes('onOpenAdminConsole'), 'The admin console must have its own menu entry');
  assert.ok(navbar.includes('onOpenAdminConsole={onOpenAdminConsole}'), 'Desktop and mobile account menus must receive the admin action');
  assert.ok(app.includes('isAdminConsoleOpen &&') && app.includes('<AdminConsole'), 'The separate console should load only while open');
  for (const endpoint of ['/api/admin/console', '/api/admin/users/moderation', '/api/admin/reports/review']) {
    assert.ok(adminConsole.includes(endpoint), `The console must call server endpoint ${endpoint}`);
  }
  assert.ok(adminConsole.includes('onDeleteQuestion') && adminConsole.includes('onDeleteClubPost'), 'The console must support existing forum posts and club posts');
  assert.ok(adminConsole.includes('Nhật ký') && adminConsole.includes('Lý do / căn cứ xử lý'), 'Moderation should leave auditable reasons');
});

test('Admin console GET and report triage are restricted to a server-authenticated Super Admin', async () => {
  const testEnv = await createTestServer();
  try {
    const reporter = await registerUser(testEnv, 'Report submitter');
    const reportResponse = await postJson(testEnv, '/api/reports', {
      reportedUserId: 'unregistered-target',
      reportedUserName: 'Reported account',
      reason: 'Spam / lừa đảo',
      details: 'Bằng chứng cần được rà soát bởi quản trị viên.',
      reporterEmail: 'forged@example.org',
    }, reporter.cookie);
    const reportResult = await reportResponse.json();
    assert.equal(reportResponse.status, 200, reportResult.message);

    const anonymousRead = await fetch(`${testEnv.baseUrl}/api/admin/console`);
    assert.equal(anonymousRead.status, 401);
    const studentRead = await fetch(`${testEnv.baseUrl}/api/admin/console`, { headers: { Cookie: reporter.cookie } });
    assert.equal(studentRead.status, 403);

    const adminCookie = await loginAdmin(testEnv);
    const snapshotResponse = await fetch(`${testEnv.baseUrl}/api/admin/console`, { headers: { Cookie: adminCookie } });
    const snapshot = await snapshotResponse.json();
    assert.equal(snapshotResponse.status, 200);
    const report = snapshot.data.reports.find(item => item.id === reportResult.reportId);
    assert.ok(report);
    assert.equal(report.status, 'open');
    assert.equal(report.reporterEmail, reporter.user.email, 'The server must use the authenticated reporter identity');
    assert.equal(snapshot.data.accounts.some(account => account.email === reporter.user.email), true);

    const resolved = await postJson(testEnv, '/api/admin/reports/review', {
      reportId: report.id,
      status: 'resolved',
      reviewNote: 'Đã kiểm tra bằng chứng.',
    }, adminCookie);
    assert.equal(resolved.status, 200);
    const reopened = await postJson(testEnv, '/api/admin/reports/review', {
      reportId: report.id,
      status: 'open',
      reviewNote: 'Cần bổ sung rà soát.',
    }, adminCookie);
    assert.equal(reopened.status, 200, 'Resolved and dismissed reports can be reopened');

    const after = await (await fetch(`${testEnv.baseUrl}/api/admin/console`, { headers: { Cookie: adminCookie } })).json();
    assert.equal(after.data.reports.find(item => item.id === report.id).status, 'open');
    assert.ok(after.data.auditLog.some(item => item.action === 'resolve_report' && item.targetId === report.id));
    assert.ok(after.data.auditLog.some(item => item.action === 'reopen_report' && item.targetId === report.id));
  } finally {
    await testEnv.close();
  }
});

test('Chat mute and account lock are persisted, reversible, and enforced on the server', async () => {
  const testEnv = await createTestServer();
  try {
    const student = await registerUser(testEnv, 'Moderation target');
    const forged = await postJson(testEnv, '/api/admin/users/moderation', {
      userId: student.user.id,
      action: 'lock',
      reason: 'Forged admin request',
      adminEmail: 'forged-admin@example.org',
    });
    assert.equal(forged.status, 401);

    const adminCookie = await loginAdmin(testEnv);
    const studentAttempt = await postJson(testEnv, '/api/admin/users/moderation', {
      userId: student.user.id,
      action: 'mute',
      durationMinutes: 60,
      reason: 'Spam in chat',
    }, student.cookie);
    assert.equal(studentAttempt.status, 403);

    const invalidDuration = await postJson(testEnv, '/api/admin/users/moderation', {
      userId: student.user.id,
      action: 'mute',
      durationMinutes: 999,
      reason: 'Spam in chat',
    }, adminCookie);
    assert.equal(invalidDuration.status, 400);

    const mute = await postJson(testEnv, '/api/admin/users/moderation', {
      userId: student.user.id,
      action: 'mute',
      durationMinutes: 60,
      reason: 'Repeated disruptive messages',
    }, adminCookie);
    assert.equal(mute.status, 200);
    assert.equal((await mute.json()).account.chatMuted, true);

    const blockedChat = await postJson(testEnv, '/api/chat', {
      channelId: 'hallway',
      content: 'This must not be persisted while muted',
    }, student.cookie);
    const blockedChatResult = await blockedChat.json();
    assert.equal(blockedChat.status, 403);
    assert.equal(blockedChatResult.code, 'CHAT_MUTED');
    assert.equal((await (await fetch(`${testEnv.baseUrl}/api/auth/session`, { headers: { Cookie: student.cookie } })).json()).success, true,
      'A chat mute must not lock the entire account');

    const activeSnapshot = await (await fetch(`${testEnv.baseUrl}/api/admin/console`, { headers: { Cookie: adminCookie } })).json();
    const account = activeSnapshot.data.accounts.find(item => item.id === student.user.id);
    assert.equal(account.chatMuted, true);
    assert.ok(account.mutedUntil > Date.now());

    const unmute = await postJson(testEnv, '/api/admin/users/moderation', {
      userId: student.user.id,
      action: 'unmute',
      reason: 'Review complete; chat access restored',
    }, adminCookie);
    assert.equal(unmute.status, 200);
    assert.equal((await unmute.json()).account.chatMuted, false);
    const allowedChat = await postJson(testEnv, '/api/chat', {
      channelId: 'hallway',
      content: 'Chat access restored after unmute',
    }, student.cookie);
    assert.equal(allowedChat.status, 200);

    const lock = await postJson(testEnv, '/api/admin/users/moderation', {
      userId: student.user.id,
      action: 'lock',
      reason: 'Repeated account abuse',
    }, adminCookie);
    assert.equal(lock.status, 200);
    assert.equal((await lock.json()).account.accountLocked, true);
    const revokedSession = await fetch(`${testEnv.baseUrl}/api/auth/session`, { headers: { Cookie: student.cookie } });
    assert.equal(revokedSession.status, 401, 'Locking revokes already-issued session cookies');
    const blockedLogin = await postJson(testEnv, '/api/auth/login', {
      email: student.user.email,
      password: student.password,
    });
    assert.equal(blockedLogin.status, 401, 'Locked accounts receive the same generic failure as invalid credentials');
    assert.equal((await blockedLogin.json()).message, 'Thông tin đăng nhập không chính xác.');

    const testAdmin = await getTestAdmin(testEnv);
    const selfLock = await postJson(testEnv, '/api/admin/users/moderation', {
      userId: testAdmin.user.id, action: 'lock', reason: 'Should never lock the root admin',
    }, adminCookie);
    assert.equal(selfLock.status, 403);

    const unlock = await postJson(testEnv, '/api/admin/users/moderation', {
      userId: student.user.id,
      action: 'unlock',
      reason: 'Identity verified; access restored',
    }, adminCookie);
    assert.equal(unlock.status, 200);
    const restoredLogin = await postJson(testEnv, '/api/auth/login', {
      email: student.user.email,
      password: student.password,
    });
    assert.equal(restoredLogin.status, 200);
  } finally {
    await testEnv.close();
  }
});

test('Club posts are stored with server-derived authorship and removable through admin moderation', async () => {
  const testEnv = await createTestServer();
  try {
    const student = await registerUser(testEnv, 'Regular member');
    const deniedPost = await postJson(testEnv, '/api/clubs/posts', {
      clubId: 'club-test', title: 'Student post', content: 'Unapproved post', authorId: 'forged-admin',
    }, student.cookie);
    assert.equal(deniedPost.status, 403);

    const adminCookie = await loginAdmin(testEnv);
    const created = await postJson(testEnv, '/api/clubs/posts', {
      clubId: 'club-test',
      title: 'Moderation test post',
      content: 'Post created with trusted server authorship.',
      authorId: 'forged-author',
      authorName: 'Forged Author',
      likes: 99999,
    }, adminCookie);
    const createdData = await created.json();
    assert.equal(created.status, 200, createdData.message);
    assert.equal(createdData.post.authorId, (await getTestAdmin(testEnv)).user.id);
    assert.notEqual(createdData.post.authorName, 'Forged Author');
    assert.equal(createdData.post.likes, 0);

    const deleted = await postJson(testEnv, '/api/admin/club-posts/delete', {
      postId: createdData.post.id,
      reason: 'Community guidelines violation',
    }, adminCookie);
    assert.equal(deleted.status, 200);
    const sync = await (await fetch(`${testEnv.baseUrl}/api/sync`, { headers: { Cookie: adminCookie } })).json();
    assert.equal(sync.data.clubPosts.some(post => post.id === createdData.post.id), false);
    const snapshot = await (await fetch(`${testEnv.baseUrl}/api/admin/console`, { headers: { Cookie: adminCookie } })).json();
    assert.ok(snapshot.data.auditLog.some(item => item.action === 'delete_club_post' && item.targetId === createdData.post.id));
  } finally {
    await testEnv.close();
  }
});

// 2. REST Endpoints: session-bound Super Admin authorization
 test('2. REST Endpoint: /api/admin/about requires a server-authenticated Super Admin session', async () => {
  const testEnv = await createTestServer();
  try {
    const publicAboutResponse = await fetch(`${testEnv.baseUrl}/api/about`);
    assert.equal(publicAboutResponse.status, 200);
    const publicJson = await publicAboutResponse.json();
    const initialData = publicJson.about;
    assert.equal(initialData.founder.name, 'Trần Văn Anh Tuấn');
    assert.equal(initialData.founder.email, undefined, 'Public About data must not expose legacy founder email');
    const getRes = await fetch(`${testEnv.baseUrl}/api/admin/about`);
    assert.equal(getRes.status, 401, 'Admin About requires an authenticated role');

    const forgedAdmin = await postJson(testEnv, '/api/admin/about', {
      adminEmail: 'forged-admin@example.org',
      aboutData: { ...initialData, headline: 'Forged client admin' },
    });
    assert.equal(forgedAdmin.status, 401, 'A client-supplied admin email is not authentication');

    const student = await registerUser(testEnv);
    const studentEdit = await postJson(testEnv, '/api/admin/about', {
      adminEmail: 'forged-admin@example.org',
      aboutData: { ...initialData, headline: 'Student overwrite attempt' },
    }, student.cookie);
    assert.equal(studentEdit.status, 403, 'A signed-in student still cannot administer the site');

    const adminCookie = await loginAdmin(testEnv);
    const response = await postJson(testEnv, '/api/admin/about', {
      aboutData: {
        ...initialData,
        headline: 'Đại Kỷ Nguyên F-Forum 2026: Đỉnh Cao Công Nghệ FPT',
        founder: { ...initialData.founder, bio: 'Kiến trúc sư hệ thống F-Forum.' },
      },
    }, adminCookie);
    assert.equal(response.status, 200);
    const saved = await response.json();
    assert.equal(saved.headline, 'Đại Kỷ Nguyên F-Forum 2026: Đỉnh Cao Công Nghệ FPT');
    const verifyResponse = await fetch(`${testEnv.baseUrl}/api/admin/about`, { headers: { Cookie: adminCookie } });
    const verify = await verifyResponse.json();
    assert.equal(verifyResponse.status, 200);
    assert.equal(verify.about.founder.bio, 'Kiến trúc sư hệ thống F-Forum.');
    assert.equal(verify.about.founder.email, undefined, 'Admin read APIs also strip legacy founder emails');
  } finally {
    await testEnv.close();
  }
});

// 3. REST Endpoints: Q&A moderation uses the session role, not the request body.
test('3. REST Endpoint: Q&A moderation enforces server-side roles', async () => {
  const testEnv = await createTestServer();
  try {
    const student = await registerUser(testEnv, 'Sinh Viên FPT');
    const adminCookie = await loginAdmin(testEnv);
    const created = await postJson(testEnv, '/api/questions', {
      title: 'Cần giải gấp bài toán rời rạc',
      content: 'Chi tiết bài tập số 5 liên quan đến ma trận kề...',
      subject: 'toan',
      authorId: 'forged-author-id',
      authorName: 'Forged author',
      authorEmail: 'forged-admin@example.org',
      bountyCoin: 20,
    }, student.cookie);
    const qData = await created.json();
    assert.equal(created.status, 200, qData.message);
    assert.equal(qData.question.authorId, student.user.id, 'The server must derive the author from the session');
    assert.equal(qData.question.authorEmail, student.user.email);
    assert.equal(qData.user.xp, student.user.xp + 50, 'Question XP is granted and returned by the authenticated server route');
    const questionId = qData.question.id;

    const forbidden = await postJson(testEnv, '/api/questions/delete', {
      questionId,
      adminEmail: 'forged-admin@example.org',
    }, student.cookie);
    assert.equal(forbidden.status, 403);

    const forgedEdit = await postJson(testEnv, '/api/questions/edit', {
      questionId,
      updates: { authorId: 'forged-author', bountyCoin: 999_999, isSolved: true },
      reason: 'Attempted protected-field change',
    }, adminCookie);
    assert.equal(forgedEdit.status, 400, 'Moderation edit allowlists only ordinary question content fields');

    const edit = await postJson(testEnv, '/api/questions/edit', {
      questionId,
      updates: { title: '[Đã điều chỉnh bởi BQT] Câu hỏi' },
      reason: 'Clarify misleading title',
      adminEmail: 'not-an-admin@example.org',
    }, adminCookie);
    assert.equal(edit.status, 200);
    const editedQuestion = (await edit.json()).question;
    assert.ok(editedQuestion.title.startsWith('[Đã điều chỉnh bởi BQT]'));
    assert.equal(editedQuestion.authorId, student.user.id);
    assert.equal(editedQuestion.bountyCoin, 20);

    const noReasonDelete = await postJson(testEnv, '/api/questions/delete', { questionId }, adminCookie);
    assert.equal(noReasonDelete.status, 400, 'Destructive moderation requires an auditable reason');
    const deleted = await postJson(testEnv, '/api/questions/delete', {
      questionId,
      reason: 'Remove policy-violating question',
      adminEmail: 'attacker@example.org',
    }, adminCookie);
    assert.equal(deleted.status, 200);
    const sync = await (await fetch(`${testEnv.baseUrl}/api/sync`, { headers: { Cookie: student.cookie } })).json();
    assert.equal(sync.data.questions.some(question => question.id === questionId), false);
  } finally {
    await testEnv.close();
  }
});

// 4. REST Endpoints: Solution moderation requires authenticated admin.
test('4. REST Endpoint: solution moderation rejects body-only admin identity', async () => {
  const testEnv = await createTestServer();
  try {
    const author = await registerUser(testEnv, 'Question author');
    const solver = await registerUser(testEnv, 'Java Guru');
    const adminCookie = await loginAdmin(testEnv);
    const qResponse = await postJson(testEnv, '/api/questions', {
      title: 'Hỏi về giải thuật Dijkstra',
      content: 'Làm sao tối ưu bằng Min-Heap trong Java?',
      subject: 'cntt',
      bountyCoin: 20,
    }, author.cookie);
    const qData = await qResponse.json();
    assert.equal(qResponse.status, 200, qData.message);
    const solResponse = await postJson(testEnv, '/api/solutions', {
      questionId: qData.question.id,
      content: 'Giải pháp dùng PriorityQueue trong java.util...',
      authorEmail: 'forged-admin@example.org',
    }, solver.cookie);
    const solData = await solResponse.json();
    assert.equal(solResponse.status, 200, solData.message);
    assert.equal(solData.solution.authorId, solver.user.id);
    assert.equal(solData.user.xp, solver.user.xp + 25, 'Solution XP comes from the server, not a client profile update');

    const duplicateSolution = await postJson(testEnv, '/api/solutions', {
      questionId: qData.question.id,
      content: 'Duplicate answer should not generate XP.',
    }, solver.cookie);
    assert.equal(duplicateSolution.status, 409, 'One account must not farm solution rewards by reposting');

    const forged = await postJson(testEnv, '/api/solutions/delete', {
      solutionId: solData.solution.id,
      adminEmail: 'forged-admin@example.org',
    });
    assert.equal(forged.status, 401);
    const studentDelete = await postJson(testEnv, '/api/solutions/delete', {
      solutionId: solData.solution.id,
    }, solver.cookie);
    assert.equal(studentDelete.status, 403);
    const noReasonDelete = await postJson(testEnv, '/api/solutions/delete', {
      solutionId: solData.solution.id,
    }, adminCookie);
    assert.equal(noReasonDelete.status, 400, 'Solution deletion requires an auditable reason');
    const adminDelete = await postJson(testEnv, '/api/solutions/delete', {
      solutionId: solData.solution.id,
      reason: 'Remove unsafe answer content',
    }, adminCookie);
    assert.equal(adminDelete.status, 200);
    const sync = await (await fetch(`${testEnv.baseUrl}/api/sync`, { headers: { Cookie: solver.cookie } })).json();
    assert.equal(sync.data.solutions.some(solution => solution.id === solData.solution.id), false);
  } finally {
    await testEnv.close();
  }
});

// 5. REST Endpoints: Chat messages are authored from the session, then moderated by admin.
test('5. REST Endpoint: chat author identity is session-bound and moderation is admin-only', async () => {
  const testEnv = await createTestServer();
  try {
    const student = await registerUser(testEnv, 'Chat Student');
    const adminCookie = await loginAdmin(testEnv);
    const created = await postJson(testEnv, '/api/chat', {
      channelId: 'hallway',
      content: 'Nội dung chat cần thu hồi vi phạm',
      authorId: 'forged-admin-id',
      authorName: 'Fake Admin',
      authorEmail: 'forged-admin@example.org',
      authorAvatar: 'javascript:alert(1)',
    }, student.cookie);
    const messageData = await created.json();
    assert.equal(created.status, 200, messageData.message);
    assert.equal(messageData.message.authorId, student.user.id);
    assert.equal(messageData.message.authorEmail, student.user.email);

    const forbidden = await postJson(testEnv, '/api/chat/delete', {
      messageId: messageData.message.id,
      adminEmail: 'forged-admin@example.org',
    }, student.cookie);
    assert.equal(forbidden.status, 403);
    const noReasonDelete = await postJson(testEnv, '/api/chat/delete', {
      messageId: messageData.message.id,
    }, adminCookie);
    assert.equal(noReasonDelete.status, 400, 'Chat deletion requires an auditable reason');
    const deleted = await postJson(testEnv, '/api/chat/delete', {
      messageId: messageData.message.id,
      reason: 'Remove harassment from chat',
    }, adminCookie);
    assert.equal(deleted.status, 200);
    const sync = await (await fetch(`${testEnv.baseUrl}/api/sync`, { headers: { Cookie: student.cookie } })).json();
    assert.equal(sync.data.chatMessages.some(message => message.id === messageData.message.id), false);
  } finally {
    await testEnv.close();
  }
});

// 6. WebSocket is read-only for client messages; all writes go through the authenticated API.
test('6. WebSocket rejects client-originated moderation and state writes', async () => {
  const testEnv = await createTestServer();
  let clientA;
  let clientB;
  try {
    const userA = await registerUser(testEnv, 'Realtime Student A');
    const userB = await registerUser(testEnv, 'Realtime Student B');
    clientA = new WebSocket(testEnv.wsUrl, { headers: { Cookie: userA.cookie } });
    clientB = new WebSocket(testEnv.wsUrl, { headers: { Cookie: userB.cookie } });
    await Promise.all([
      new Promise((resolve, reject) => { clientA.once('open', resolve); clientA.once('error', reject); }),
      new Promise((resolve, reject) => { clientB.once('open', resolve); clientB.once('error', reject); }),
    ]);
    const eventsByB = [];
    clientB.on('message', raw => {
      try { eventsByB.push(JSON.parse(raw.toString())); } catch { /* ignore */ }
    });
    const rejectedMessage = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket did not reject mutation')), 2_000);
      clientA.on('message', raw => {
        const parsed = JSON.parse(raw.toString());
        if (parsed.type === 'WS_ERROR') {
          clearTimeout(timeout);
          resolve(parsed);
        }
      });
    });
    clientA.send(JSON.stringify({ type: 'DELETE_CHAT_MESSAGE', payload: { messageId: 'test-msg', adminEmail: 'forged-admin@example.org' } }));
    const error = await rejectedMessage;
    assert.equal(error.payload.status, 403);
    clientA.send(JSON.stringify({ type: 'SYNC_ABOUT', payload: { headline: 'Forged update' } }));
    await new Promise(resolve => setTimeout(resolve, 80));
    assert.equal(eventsByB.some(event => ['DELETE_CHAT_MESSAGE', 'SYNC_ABOUT'].includes(event.type)), false);
    const about = await (await fetch(`${testEnv.baseUrl}/api/admin/about`)).json();
    assert.notEqual(about.headline, 'Forged update');
  } finally {
    if (clientA?.readyState === WebSocket.OPEN) clientA.close();
    if (clientB?.readyState === WebSocket.OPEN) clientB.close();
    await new Promise(resolve => setTimeout(resolve, 50));
    await testEnv.close();
  }
});

// 7. Best-answer choice is tied to the question owner and awarded only once.
test('7. REST Endpoint: best solution requires question ownership and cannot be re-awarded', async () => {
  const testEnv = await createTestServer();
  try {
    const author = await registerUser(testEnv, 'Original author');
    const solver1 = await registerUser(testEnv, 'Student one');
    const solver2 = await registerUser(testEnv, 'Student two');
    const stranger = await registerUser(testEnv, 'Imposter');
    const qResponse = await postJson(testEnv, '/api/questions', {
      title: 'Câu hỏi kiểm tra đáp án chuẩn',
      content: 'Nội dung câu hỏi...',
      subject: 'toan',
      bountyCoin: 20,
    }, author.cookie);
    const question = (await qResponse.json()).question;
    assert.ok(question);
    const selfSolutionResponse = await postJson(testEnv, '/api/solutions', {
      questionId: question.id, content: 'Tác giả tự trả lời để thử tự nhận Coin.',
    }, author.cookie);
    assert.equal(selfSolutionResponse.status, 200);
    const selfSolution = (await selfSolutionResponse.json()).solution;
    const sol1 = (await (await postJson(testEnv, '/api/solutions', {
      questionId: question.id, content: 'Lời giải số 1', authorId: 'forged-solver',
    }, solver1.cookie)).json()).solution;
    const sol2 = (await (await postJson(testEnv, '/api/solutions', {
      questionId: question.id, content: 'Lời giải số 2',
    }, solver2.cookie)).json()).solution;

    const spoofed = await postJson(testEnv, '/api/solutions/best', {
      questionId: question.id,
      solutionId: sol1.id,
      currentUserId: author.user.id,
      currentUserEmail: 'spoofed@example.org',
    }, stranger.cookie);
    assert.equal(spoofed.status, 403);

    const selfAward = await postJson(testEnv, '/api/solutions/best', {
      questionId: question.id, solutionId: selfSolution.id,
    }, author.cookie);
    assert.equal(selfAward.status, 403, 'Authors cannot transfer bounty or bonus Coin to their own answer');

    const firstSelection = await postJson(testEnv, '/api/solutions/best', {
      questionId: question.id, solutionId: sol1.id,
    }, author.cookie);
    assert.equal(firstSelection.status, 200);
    const solverSession = await (await fetch(`${testEnv.baseUrl}/api/auth/session`, {
      headers: { Cookie: solver1.cookie },
    })).json();
    assert.equal(solverSession.user.xp, solver1.user.xp + 25 + 110);
    assert.equal(solverSession.user.coin, solver1.user.coin + 110);
    const repeat = await postJson(testEnv, '/api/solutions/best', {
      questionId: question.id, solutionId: sol2.id,
    }, author.cookie);
    assert.equal(repeat.status, 409, 'A solved question cannot award a second best-answer reward');

    const sync = await (await fetch(`${testEnv.baseUrl}/api/sync`, { headers: { Cookie: author.cookie } })).json();
    assert.equal(sync.data.solutions.find(solution => solution.id === sol1.id).isBest, true);
    assert.equal(sync.data.solutions.find(solution => solution.id === sol2.id).isBest, false);
    assert.equal(sync.data.solutions.find(solution => solution.id === selfSolution.id).isBest, false);
  } finally {
    await testEnv.close();
  }
});

// 8. 3D Fibonacci Sphere Mathematical Engine, Optical Invariance & 21 Hall of Fame Records
test('8. 3D Fibonacci Sphere Engine: Golden angle, optical invariance, FLIP plate & 21 milestone records', () => {
  const aboutUsPath = path.resolve('src/components/AboutUs.tsx');
  const adminStorePath = path.resolve('src/store/adminStore.ts');
  const aboutUsContent = fs.readFileSync(aboutUsPath, 'utf8');
  const adminStoreContent = fs.readFileSync(adminStorePath, 'utf8');

  // 8.1 Verify Exact DOM Structure matching specification
  assert.ok(aboutUsContent.includes('id="stage"'), 'AboutUs must contain #stage');
  assert.ok(aboutUsContent.includes('id="world"'), 'AboutUs must contain #world');
  assert.ok(aboutUsContent.includes('id="orb"'), 'AboutUs must contain #orb');
  assert.ok(aboutUsContent.includes('id="headline"'), 'AboutUs must contain #headline');
  assert.ok(aboutUsContent.includes('id="dot"'), 'AboutUs must contain smooth cursor #dot');
  assert.ok(aboutUsContent.includes('className="vig'), 'AboutUs must contain vignette .vig');
  assert.ok(aboutUsContent.includes('className="plate'), 'AboutUs must contain FLIP lightbox .plate');

  // 8.2 Verify 21 Fibonacci Sphere Distribution & Golden Angle Math
  assert.ok(
    aboutUsContent.includes('Math.PI * (3 - Math.sqrt(5))'),
    'AboutUs must compute Golden Angle GA = pi * (3 - sqrt(5))'
  );
  assert.ok(
    aboutUsContent.includes('N = 21') || aboutUsContent.includes('length: 21') || aboutUsContent.includes('length: N'),
    'AboutUs must distribute exactly 21 milestone nodes'
  );
  assert.ok(
    aboutUsContent.includes('Math.asin(y) * (180 / Math.PI)') || aboutUsContent.includes('asin(y)'),
    'AboutUs must compute latitude in degrees via arcsin(y)'
  );
  assert.ok(
    aboutUsContent.includes('Math.atan2(x, z) * (180 / Math.PI)') || aboutUsContent.includes('atan2(x, z)'),
    'AboutUs must compute longitude in degrees via atan2(x, z)'
  );

  // 8.3 Verify Camera Loop & Optical Center Invariance
  assert.ok(
    aboutUsContent.includes('rotateX(${-sx}deg) rotateY(${-sy}deg) translateZ(') &&
    aboutUsContent.includes('0.62'),
    'AboutUs must apply exact optical invariance formula rotateX(-sx) rotateY(-sy) translateZ(R * 0.62) to headline'
  );
  assert.ok(
    aboutUsContent.includes('translateZ(${camZ}px) rotateY(${sy}deg) rotateX(${sx}deg)'),
    'AboutUs must apply exact world transform translateZ rotateY rotateX without translateX/Y'
  );
  assert.ok(
    aboutUsContent.includes('0.13') && aboutUsContent.includes('32'),
    'AboutUs must apply 0.13 deg/px drag sensitivity and clamp pitch within +-32 deg'
  );

  // 8.4 Verify 21 Default Records Celebrating Trần Văn Anh Tuấn & BroAmStuck Studio
  assert.ok(adminStoreContent.includes('ms-21'), 'adminStore must define up to 21 milestone records');
  assert.ok(adminStoreContent.includes('Khởi sinh F-Forum'), 'Record 1 must celebrate Khởi sinh F-Forum');
  assert.ok(adminStoreContent.includes('Da Nang · Vietnam'), 'Record 1 place must be Da Nang · Vietnam');
  assert.ok(adminStoreContent.includes('BroAmStuck Studio'), 'Record 2 must celebrate BroAmStuck Studio');
  assert.ok(adminStoreContent.includes('Miền Ký Ức'), 'Record 3 must celebrate Miền Ký Ức');
  assert.ok(adminStoreContent.includes('isTall'), 'MilestoneItem must support isTall aspect-ratio toggle');

  // 8.5 Verify Storage Key fforum_vinhdanh_records
  assert.ok(
    aboutUsContent.includes('fforum_vinhdanh_records') && adminStoreContent.includes('fforum_vinhdanh_records'),
    'Khu Vinh Danh records must persist to fforum_vinhdanh_records storage key'
  );

  // 8.6 Verify Depth Wash without CSS blur filter on cards
  assert.ok(
    aboutUsContent.includes('--d') && aboutUsContent.includes('rgba(0, 0, 0, var(--d'),
    'AboutUs must apply flat black depth wash rgba(0,0,0,var(--d)) via figure::after without CSS blur'
  );

  // 8.7 Verify CSS 3D Y-axis inversion in depth wash calculation (-pt.y * sinX)
  assert.ok(
    aboutUsContent.includes('-pt.y * sinX'),
    'AboutUs depth shading must correctly invert pt.y for CSS 3D coordinate space (-pt.y * sinX)'
  );

  // 8.8 Verify Persistent Wheel Zoom + Scroll Dolly combined camera engine
  assert.ok(
    aboutUsContent.includes('wheelCamZ'),
    'AboutUs engineState must maintain persistent wheelCamZ'
  );
  assert.ok(
    aboutUsContent.includes('state.wheelCamZ + scrollDolly'),
    'AboutUs tick loop must combine wheelCamZ and scrollDolly without overwriting user zoom'
  );

  // 8.9 Verify FLIP Lightbox transition & high-res image decode
  assert.ok(
    aboutUsContent.includes('isLightboxEntering') && aboutUsContent.includes('translate3d'),
    'AboutUs must implement genuine FLIP transform transition from source coordinates'
  );
  assert.ok(
    aboutUsContent.includes('decode()'),
    'AboutUs must invoke image.decode() for high-res flicker-free plate preview'
  );

  // 8.10 Verify ChroniclesView forwards isEmbedded to AboutUs
  const chroniclesContent = fs.readFileSync(path.resolve('src/components/views/ChroniclesView.tsx'), 'utf8');
  assert.ok(
    chroniclesContent.includes('isEmbedded={isEmbedded}'),
    'ChroniclesView must forward isEmbedded={isEmbedded} to AboutUs'
  );

  // 8.11 Verify Navbar navigation item for chronicles is KHU VINH DANH
  const navbarContent = fs.readFileSync(path.resolve('src/components/Navbar.tsx'), 'utf8');
  assert.ok(
    navbarContent.includes("id: 'chronicles', label: 'KHU VINH DANH'"),
    'Navbar must label the chronicles tab as KHU VINH DANH'
  );

  // 8.12 Verify BroadcastChannel fforum_sync cross-tab synchronization
  assert.ok(
    aboutUsContent.includes('fforum_sync') && adminStoreContent.includes('fforum_sync'),
    'AboutUs and adminStore must broadcast updates over fforum_sync BroadcastChannel'
  );
});


test('Vòng 9 — nhịp gửi tin mới, không khoá ô nhập, đã xoá nội dung văn hoá FPT', () => {
  const chatView = fs.readFileSync(path.resolve('src/components/views/ChatView.tsx'), 'utf8');
  const chatDock = fs.readFileSync(path.resolve('src/components/ChatDock.tsx'), 'utf8');
  const hook = fs.readFileSync(path.resolve('src/utils/chatCooldown.ts'), 'utf8');
  const bar = fs.readFileSync(path.resolve('src/components/ChatCooldownBar.tsx'), 'utf8');
  const css = fs.readFileSync(path.resolve('src/index.css'), 'utf8');

  /* Cơ chế mới: neo theo mốc thời gian kết thúc, KHÔNG trừ dần một biến đếm */
  assert.ok(hook.includes('CHAT_COOLDOWN_MS'), 'Cooldown duration must be a named constant');
  assert.ok(hook.includes('export const useChatCooldown'), 'Cooldown logic must be one shared hook');
  assert.ok(hook.includes('Date.now() + durationMs'), 'Cooldown must be anchored to an end timestamp');
  assert.ok(!/setCooldownRemaining/.test(hook), 'The drift-prone counter state must be gone');
  assert.ok(hook.includes('const left = endsAt - Date.now()'), 'Remaining time must be computed from the end timestamp');
  assert.ok(hook.includes('window.clearInterval'), 'The tick interval must always be cleaned up');

  for (const [name, src] of [['ChatView', chatView], ['ChatDock', chatDock]]) {
    assert.ok(src.includes('useChatCooldown()'), `${name} must use the shared cooldown hook`);
    assert.ok(!/cooldownRemaining/.test(src), `${name} must not keep the old ad-hoc counter`);
    assert.ok(src.includes('ChatCooldownBar'), `${name} must render the new cooldown bar`);
    assert.ok(src.includes('ff-cd-btn'), `${name} send button must show the waiting ring`);
    assert.ok(src.includes('cooldown.nudge()'), `${name} must nudge instead of silently dropping a send`);
    /* Ô nhập phải LUÔN gõ được — chỉ nút Gửi chờ tới hạn */
    assert.ok(!/disabled=\{cooldownRemaining/.test(src), `${name} must not disable the input while cooling`);
  }
  assert.ok(bar.includes('pointer-events') === false, 'The bar relies on CSS for hit-testing (no inline tricks)');
  assert.ok(css.includes('.ff-cd.is-cooling') && css.includes('.ff-cd__dial-arc'), 'The cooldown bar must be styled');
  assert.ok(css.includes('html.light .ff-cd'), 'The cooldown bar needs a light-mode variant');
  assert.ok(css.includes('.reduce-motion .ff-cd'), 'The cooldown bar must honour reduced motion');
  assert.ok(
    /\.ff-cd \{[\s\S]{0,400}pointer-events: none;/.test(css),
    'The cooldown bar must never swallow clicks',
  );

  /* Nội dung đã xoá hẳn */
  for (const gone of ['VĂN HOÁ NÓI CHUYỆN FPT', 'Chào đón tân sinh viên', 'Đại sảnh giao lưu kết bạn toàn trường']) {
    assert.ok(!chatView.includes(gone), `ChatView must no longer contain "${gone}"`);
    assert.ok(!chatDock.includes(gone), `ChatDock must no longer contain "${gone}"`);
  }
});

test('Khu Vinh Danh uses the requested Hall of frame title', () => {
  const source = fs.readFileSync(path.resolve('src/components/views/KhuVinhDanhView.tsx'), 'utf8');
  const headingId = source.indexOf('id="headline"');
  const headingStart = source.lastIndexOf('<h1', headingId);
  const headingEnd = source.indexOf('</h1>', headingId);
  assert.ok(headingId >= 0 && headingStart >= 0 && headingEnd > headingId, 'Khu Vinh Danh headline must exist');

  const heading = source.slice(headingStart, headingEnd);
  assert.ok(heading.includes('>Hall</span>') && heading.includes('>of</span>') && heading.includes('>frame</span>'));
  assert.ok(!heading.includes('BroAmStuck') && !heading.includes('Trần'), 'Old studio/founder headline must be removed');
  assert.ok(source.includes("headline: 'Hall of frame'"), 'Saved About headline must match the visible title');
});
