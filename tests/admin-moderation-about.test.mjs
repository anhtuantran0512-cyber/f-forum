import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { setupForumServer } from '../server/forumServer.ts';
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
    aboutUsContent.includes('isSuperAdmin'),
    'AboutUs must check isSuperAdmin before showing edit controls'
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

// 2. REST Endpoints: GET and POST /api/admin/about with strict Super Admin authorization
test('2. REST Endpoint: GET & POST /api/admin/about isolation and persistence', async () => {
  const testEnv = await createTestServer();

  try {
    // 2.1 GET /api/admin/about returns founder and milestone data
    const getRes = await fetch(`${testEnv.baseUrl}/api/admin/about`);
    assert.equal(getRes.status, 200);
    const initialJson = await getRes.json();
    const initialData = initialJson.about || initialJson;
    assert.ok(initialData.founder);
    assert.equal(initialData.founder.name, 'Trần Văn Anh Tuấn');
    assert.ok(Array.isArray(initialData.milestones));
    assert.ok(initialData.milestones.length > 0);

    // 2.2 POST /api/admin/about from non-admin (student) MUST be rejected with 403
    const forbiddenRes = await fetch(`${testEnv.baseUrl}/api/admin/about`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminEmail: 'student@fpt.edu.vn',
        aboutData: {
          ...initialData,
          headline: 'Hacker Overwrite Attempt',
        },
      }),
    });
    assert.equal(forbiddenRes.status, 403, 'Non-admin POST /api/admin/about must return 403 Forbidden');

    // 2.3 POST /api/admin/about without adminEmail MUST be rejected with 403
    const anonRes = await fetch(`${testEnv.baseUrl}/api/admin/about`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aboutData: {
          ...initialData,
          headline: 'Anonymous Overwrite Attempt',
        },
      }),
    });
    assert.equal(anonRes.status, 403, 'Anonymous POST /api/admin/about must return 403 Forbidden');

    // 2.4 POST /api/admin/about from Super Admin (anhtuantran0512@gmail.com) MUST succeed
    const updatedDataPayload = {
      ...initialData,
      headline: 'Đại Kỷ Nguyên F-Forum 2026: Đỉnh Cao Công Nghệ FPT',
      founder: {
        ...initialData.founder,
        bio: 'Kiến trúc sư hệ thống F-Forum & Chủ nhiệm BroAmStuck Studio.',
      },
    };

    const adminRes = await fetch(`${testEnv.baseUrl}/api/admin/about`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminEmail: 'anhtuantran0512@gmail.com',
        aboutData: updatedDataPayload,
      }),
    });
    assert.equal(adminRes.status, 200, 'Super Admin POST /api/admin/about must return 200 OK');
    const savedData = await adminRes.json();
    assert.equal(savedData.headline, 'Đại Kỷ Nguyên F-Forum 2026: Đỉnh Cao Công Nghệ FPT');

    // 2.5 Verify persistence on subsequent GET
    const verifyRes = await fetch(`${testEnv.baseUrl}/api/admin/about`);
    assert.equal(verifyRes.status, 200);
    const verifyJson = await verifyRes.json();
    const persisted = verifyJson.about || verifyJson;
    assert.equal(persisted.headline, 'Đại Kỷ Nguyên F-Forum 2026: Đỉnh Cao Công Nghệ FPT');
    assert.equal(persisted.founder.bio, 'Kiến trúc sư hệ thống F-Forum & Chủ nhiệm BroAmStuck Studio.');
  } finally {
    await testEnv.close();
  }
});

// 3. REST Endpoints: Q&A Moderation (/api/questions/delete and /api/questions/edit)
test('3. REST Endpoint: Q&A Question Moderation (Delete & Edit authorization)', async () => {
  const testEnv = await createTestServer();

  try {
    // Create a question first
    const createQRes = await fetch(`${testEnv.baseUrl}/api/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Cần giải gấp bài toán rời rạc',
        content: 'Chi tiết bài tập số 5 liên quan đến ma trận kề...',
        subject: 'toan',
        authorId: 'student-q-1',
        authorName: 'Sinh Viên FPT',
        authorEmail: 'studentq@fpt.edu.vn',
        authorAvatar: 'avatar.png',
        authorLevel: 1,
      }),
    });
    const qData = await createQRes.json();
    assert.ok(qData.success && qData.question);
    const targetQ = qData.question;

    // 3.1 Non-admin delete attempt -> 403
    const badDelete = await fetch(`${testEnv.baseUrl}/api/questions/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: targetQ.id,
        adminEmail: 'guest_user@fpt.edu.vn',
      }),
    });
    assert.equal(badDelete.status, 403, 'Non-admin cannot delete question');

    // 3.2 Non-admin edit attempt -> 403
    const badEdit = await fetch(`${testEnv.baseUrl}/api/questions/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: targetQ.id,
        updates: { title: 'Vandalized Title' },
        adminEmail: 'guest_user@fpt.edu.vn',
      }),
    });
    assert.equal(badEdit.status, 403, 'Non-admin cannot edit question');

    // 3.3 Super Admin edit attempt -> 200
    const goodEdit = await fetch(`${testEnv.baseUrl}/api/questions/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: targetQ.id,
        updates: { title: '[Đã điều chỉnh bởi BQT] ' + targetQ.title, subject: 'cntt' },
        adminEmail: 'anhtuantran0512@gmail.com',
      }),
    });
    assert.equal(goodEdit.status, 200, 'Super admin can edit question');
    const editResult = await goodEdit.json();
    assert.ok(editResult.question.title.startsWith('[Đã điều chỉnh bởi BQT]'));

    // 3.4 Super Admin delete attempt -> 200
    const goodDelete = await fetch(`${testEnv.baseUrl}/api/questions/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: targetQ.id,
        adminEmail: 'anhtuantran0512@gmail.com',
      }),
    });
    assert.equal(goodDelete.status, 200, 'Super admin can delete question');

    // Verify question is removed from sync
    const afterSyncRes = await fetch(`${testEnv.baseUrl}/api/sync`);
    const afterSyncData = await afterSyncRes.json();
    const found = afterSyncData.data.questions.some((q) => q.id === targetQ.id);
    assert.equal(found, false, 'Deleted question must no longer exist in data store');
  } finally {
    await testEnv.close();
  }
});

// 4. REST Endpoints: Solution Moderation (/api/solutions/delete)
test('4. REST Endpoint: Solution Moderation (Delete solution vi phạm)', async () => {
  const testEnv = await createTestServer();

  try {
    // Create question and solution
    const createQRes = await fetch(`${testEnv.baseUrl}/api/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Hỏi về giải thuật Dijkstra',
        content: 'Làm sao tối ưu bằng Min-Heap trong Java?',
        subject: 'cntt',
        authorId: 'student-dijkstra',
        authorName: 'Coder Pro',
        authorEmail: 'coder@fpt.edu.vn',
        authorAvatar: 'avatar.png',
        authorLevel: 2,
      }),
    });
    const qData = await createQRes.json();
    const questionId = qData.question.id;

    const createSolRes = await fetch(`${testEnv.baseUrl}/api/solutions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId,
        content: 'Giải pháp dùng PriorityQueue trong java.util...',
        authorId: 'solver-pro',
        authorName: 'Java Guru',
        authorEmail: 'javaguru@fpt.edu.vn',
        authorAvatar: 'avatar.png',
        authorLevel: 3,
      }),
    });
    const solData = await createSolRes.json();
    assert.ok(solData.success && solData.solution);
    const targetSol = solData.solution;

    // 4.1 Non-admin delete attempt -> 403
    const badDelete = await fetch(`${testEnv.baseUrl}/api/solutions/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        solutionId: targetSol.id,
        adminEmail: 'imposter@gmail.com',
      }),
    });
    assert.equal(badDelete.status, 403, 'Non-admin cannot delete solution');

    // 4.2 Super Admin delete attempt -> 200
    const goodDelete = await fetch(`${testEnv.baseUrl}/api/solutions/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        solutionId: targetSol.id,
        adminEmail: 'anhtuantran0512@gmail.com',
      }),
    });
    assert.equal(goodDelete.status, 200, 'Super admin can delete solution');

    // Verify solution is removed
    const afterSyncRes = await fetch(`${testEnv.baseUrl}/api/sync`);
    const afterSyncData = await afterSyncRes.json();
    const found = afterSyncData.data.solutions.some((s) => s.id === targetSol.id);
    assert.equal(found, false, 'Deleted solution must no longer exist in data store');
  } finally {
    await testEnv.close();
  }
});

// 5. REST Endpoints: Chat Message Moderation (/api/chat/delete)
test('5. REST Endpoint: Chat Message Recall (/api/chat/delete)', async () => {
  const testEnv = await createTestServer();

  try {
    const createMsgRes = await fetch(`${testEnv.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: 'hallway',
        content: 'Nội dung chat cần thu hồi vi phạm',
        authorId: 'spammer-1',
        authorName: 'Spam User',
        authorEmail: 'spammer@fpt.edu.vn',
        authorAvatar: 'avatar.png',
        authorLevel: 1,
      }),
    });
    const msgData = await createMsgRes.json();
    assert.ok(msgData.success && msgData.message);
    const targetMsg = msgData.message;

    // 5.1 Non-admin recall attempt -> 403
    const badDelete = await fetch(`${testEnv.baseUrl}/api/chat/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId: targetMsg.id,
        adminEmail: 'regular_student@fpt.edu.vn',
      }),
    });
    assert.equal(badDelete.status, 403, 'Non-admin cannot recall chat message');

    // 5.2 Super Admin recall attempt -> 200
    const goodDelete = await fetch(`${testEnv.baseUrl}/api/chat/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId: targetMsg.id,
        adminEmail: 'anhtuantran0512@gmail.com',
      }),
    });
    assert.equal(goodDelete.status, 200, 'Super admin can recall chat message');

    // Verify chat message is removed
    const afterSyncRes = await fetch(`${testEnv.baseUrl}/api/sync`);
    const afterSyncData = await afterSyncRes.json();
    const found = afterSyncData.data.chatMessages.some((m) => m.id === targetMsg.id);
    assert.equal(found, false, 'Recalled message must no longer exist in data store');
  } finally {
    await testEnv.close();
  }
});

// 6. WebSocket Real-Time Broadcasting of Moderation Actions
test('6. WebSocket Real-Time Broadcast: DELETE_QUESTION, DELETE_CHAT_MESSAGE, SYNC_ABOUT', async () => {
  const testEnv = await createTestServer();

  try {
    const clientA = new WebSocket(testEnv.wsUrl);
    const clientB = new WebSocket(testEnv.wsUrl);

    await Promise.all([
      new Promise((res) => clientA.on('open', res)),
      new Promise((res) => clientB.on('open', res)),
    ]);

    const receivedEventsByB = [];
    clientB.on('message', (raw) => {
      try {
        const parsed = JSON.parse(raw.toString());
        receivedEventsByB.push(parsed);
      } catch {
        /* ignore */
      }
    });

    // Client A sends DELETE_CHAT_MESSAGE
    clientA.send(
      JSON.stringify({
        type: 'DELETE_CHAT_MESSAGE',
        payload: {
          messageId: 'test-msg-123',
          adminEmail: 'anhtuantran0512@gmail.com',
        },
      })
    );

    // Client A sends SYNC_ABOUT
    clientA.send(
      JSON.stringify({
        type: 'SYNC_ABOUT',
        payload: {
          headline: 'Realtime WebSocket About Update',
          adminEmail: 'anhtuantran0512@gmail.com',
        },
      })
    );

    // Wait for propagation
    await new Promise((r) => setTimeout(r, 120));

    const chatDeleteEvent = receivedEventsByB.find((e) => e.type === 'DELETE_CHAT_MESSAGE');
    assert.ok(chatDeleteEvent, 'Client B should receive DELETE_CHAT_MESSAGE broadcast');
    assert.equal(chatDeleteEvent.payload.messageId, 'test-msg-123');

    const aboutSyncEvent = receivedEventsByB.find((e) => e.type === 'SYNC_ABOUT');
    assert.ok(aboutSyncEvent, 'Client B should receive SYNC_ABOUT broadcast');
    assert.equal(aboutSyncEvent.payload.headline, 'Realtime WebSocket About Update');

    clientA.close();
    clientB.close();
  } finally {
    await testEnv.close();
  }
});

// 7. REST Endpoint: Best Solution Award & Authorization (/api/solutions/best)
test('7. REST Endpoint: Best Solution Award authorization & single-best invariant', async () => {
  const testEnv = await createTestServer();

  try {
    const createQRes = await fetch(`${testEnv.baseUrl}/api/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Câu hỏi kiểm tra đáp án chuẩn',
        content: 'Nội dung câu hỏi...',
        subject: 'toan',
        authorId: 'original-author-id',
        authorName: 'Tác Giả Gốc',
        authorEmail: 'author@fpt.edu.vn',
        authorAvatar: 'avatar.png',
        authorLevel: 1,
      }),
    });
    const qData = await createQRes.json();
    const questionId = qData.question.id;

    // Create Solution 1
    const createSol1 = await fetch(`${testEnv.baseUrl}/api/solutions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId,
        content: 'Lời giải số 1',
        authorId: 'solver-1',
        authorName: 'Học sinh 1',
        authorEmail: 'student1@fpt.edu.vn',
        authorAvatar: 'avatar.png',
        authorLevel: 1,
      }),
    });
    const sol1Data = await createSol1.json();
    const sol1Id = sol1Data.solution.id;

    // Create Solution 2
    const createSol2 = await fetch(`${testEnv.baseUrl}/api/solutions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId,
        content: 'Lời giải số 2 xuất sắc hơn',
        authorId: 'solver-2',
        authorName: 'Học sinh 2',
        authorEmail: 'student2@fpt.edu.vn',
        authorAvatar: 'avatar.png',
        authorLevel: 2,
      }),
    });
    const sol2Data = await createSol2.json();
    const sol2Id = sol2Data.solution.id;

    // 7.1 Non-author, non-admin attempt -> 403
    const badMarkRes = await fetch(`${testEnv.baseUrl}/api/solutions/best`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId,
        solutionId: sol1Id,
        currentUserId: 'imposter-student',
        currentUserEmail: 'imposter@fpt.edu.vn',
      }),
    });
    assert.equal(badMarkRes.status, 403, 'Unauthorized student cannot confirm best solution');

    // 7.2 Super Admin marks Solution 1 -> 200
    const adminMarkRes = await fetch(`${testEnv.baseUrl}/api/solutions/best`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId,
        solutionId: sol1Id,
        currentUserEmail: 'anhtuantran0512@gmail.com',
      }),
    });
    assert.equal(adminMarkRes.status, 200, 'Super admin can award best solution');

    // Verify Solution 1 is best
    let syncRes = await fetch(`${testEnv.baseUrl}/api/sync`);
    let syncData = await syncRes.json();
    let s1 = syncData.data.solutions.find((s) => s.id === sol1Id);
    assert.equal(s1.isBest, true, 'Solution 1 should be marked best');

    // 7.3 Super Admin marks Solution 2 -> Solution 1 must be reset to false!
    const adminMarkRes2 = await fetch(`${testEnv.baseUrl}/api/solutions/best`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId,
        solutionId: sol2Id,
        currentUserEmail: 'anhtuantran0512@gmail.com',
      }),
    });
    assert.equal(adminMarkRes2.status, 200);

    syncRes = await fetch(`${testEnv.baseUrl}/api/sync`);
    syncData = await syncRes.json();
    s1 = syncData.data.solutions.find((s) => s.id === sol1Id);
    const s2 = syncData.data.solutions.find((s) => s.id === sol2Id);
    assert.equal(s1.isBest, false, 'Solution 1 must no longer be best');
    assert.equal(s2.isBest, true, 'Solution 2 must now be best');
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


