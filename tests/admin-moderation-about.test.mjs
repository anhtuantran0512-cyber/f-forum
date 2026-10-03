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

// 2. REST endpoints: admin claims in JSON are not authentication.
test('2. REST Endpoint: /api/admin/about rejects forged administrator identity', async () => {
  const testEnv = await createTestServer();
  try {
    const getRes = await fetch(`${testEnv.baseUrl}/api/admin/about`);
    assert.equal(getRes.status, 200);
    const initialJson = await getRes.json();
    const initialData = initialJson.about || initialJson;
    assert.ok(initialData.founder);
    assert.equal(initialData.founder.name, 'Trần Văn Anh Tuấn');
    assert.ok(Array.isArray(initialData.milestones));

    const attempted = { ...initialData, headline: 'Forged overwrite attempt' };
    const spoofedAdmin = await fetch(`${testEnv.baseUrl}/api/admin/about`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminEmail: 'anhtuantran0512@gmail.com', aboutData: attempted }),
    });
    assert.equal(spoofedAdmin.status, 403, 'A claimed admin email without a session is rejected');

    const register = await fetch(`${testEnv.baseUrl}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Student', email: 'about-test-student@example.test', password: 'secure-pass' }),
    });
    assert.equal(register.status, 200);
    const cookie = register.headers.get('set-cookie')?.split(';')[0];
    const studentSpoof = await fetch(`${testEnv.baseUrl}/api/admin/about`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ adminEmail: 'anhtuantran0512@gmail.com', aboutData: attempted }),
    });
    assert.equal(studentSpoof.status, 403, 'A student session cannot be elevated by request-body email');

    const verify = await (await fetch(`${testEnv.baseUrl}/api/admin/about`)).json();
    assert.equal((verify.about || verify).headline, initialData.headline, 'Rejected update leaves server content unchanged');
  } finally {
    await testEnv.close();
  }
});
