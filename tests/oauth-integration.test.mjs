import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import { setupForumServer } from '../server/forumServer.ts';
import { isGoogleConfigured, isFacebookConfigured, loginWithGooglePopup, loginWithFacebookPopup } from '../src/utils/oauth.ts';
import { setProviderLookupForTest } from '../server/socialAuth.ts';

// Test Helper to spin up a mock server
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
        close: () => new Promise((res) => server.close(res)),
      });
    });
  });
}

test('1. Dual OAuth Codebase Inspection: SDK Initializer in main.tsx & AuthModal integration', () => {
  const mainCode = fs.readFileSync('src/main.tsx', 'utf8');
  assert.ok(mainCode.includes('initFacebookSdk'), 'main.tsx must define initFacebookSdk');
  assert.ok(mainCode.includes('fbAsyncInit'), 'main.tsx must declare fbAsyncInit');
  assert.ok(mainCode.includes('connect.facebook.net/vi_VN/sdk.js'), 'main.tsx must load Facebook SDK');
  assert.ok(mainCode.includes('accounts.google.com/gsi/client'), 'main.tsx must load Google Identity Services SDK');

  const authModalCode = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');
  assert.ok(authModalCode.includes('handleGoogleAuth'), 'AuthModal must handle Google OAuth 2.0');
  assert.ok(authModalCode.includes('handleFacebookAuth'), 'AuthModal must handle Facebook SDK login');

  // Verify fake text prompt is eliminated from default social flow
  assert.ok(!authModalCode.includes('socialModalProvider === \'google\' ? \'Google Student\' : \'Facebook Student\''), 'Fake prompt eliminated');
  assert.ok(!authModalCode.includes('Đăng nhập Super Admin'), 'Must not expose Đăng nhập Super Admin');
  assert.ok(!authModalCode.includes('handleQuickAdmin'), 'Must not expose handleQuickAdmin');

  // Verify LoginModal re-exports AuthModal
  const loginModalCode = fs.readFileSync('src/components/LoginModal.tsx', 'utf8');
  assert.ok(loginModalCode.includes("from './AuthModal'"), 'LoginModal re-exports AuthModal');
});

test('2. OAuth Server Endpoint (/api/auth/social): Student auto-registration and Super Admin verification', async () => {
  const testEnv = await createTestServer();

  try {
    // 2.1 Standard Student Registration via Google
    const googleRes = await fetch(`${testEnv.baseUrl}/api/auth/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'google',
        name: 'Nguyen Van Google',
        email: 'test.google.user@fpt.edu.vn',
        avatar: 'https://lh3.googleusercontent.com/a/test-avatar',
      }),
    });
    const googleData = await googleRes.json();
    assert.equal(googleRes.status, 200);
    assert.equal(googleData.success, true);
    assert.equal(googleData.user.email, 'test.google.user@fpt.edu.vn');
    assert.equal(googleData.user.role, 'STUDENT');
    assert.equal(googleData.user.level, 1);
    assert.equal(googleData.user.xp, 0);
    assert.equal(googleData.user.avatar, 'https://lh3.googleusercontent.com/a/test-avatar');

    // 2.2 Super Admin qua OAuth: email là do client tự khai nên PHẢI xác minh được
    //     với nhà cung cấp. Khai suông mà được cấp quyền là lỗ hổng chiếm quản trị.
    const unverifiedAdminRes = await fetch(`${testEnv.baseUrl}/api/auth/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'facebook',
        name: 'Trần Anh Tuấn',
        email: 'BroAmStuck@gmail.com',
      }),
    });
    const unverifiedAdminData = await unverifiedAdminRes.json();
    assert.equal(unverifiedAdminRes.status, 403, 'Khai email admin mà không xác minh được phải bị chặn');
    assert.equal(unverifiedAdminData.token, undefined, 'Không được cấp token quản trị');

    // 2.2b Khi nhà cung cấp xác nhận đúng email đó -> vẫn cấp SUPER_ADMIN như cũ
    const restoreFb = setProviderLookupForTest('facebook', async (accessToken) =>
      accessToken === 'fb-token-that' ? { email: 'BroAmStuck@gmail.com' } : null,
    );
    try {
      const adminRes = await fetch(`${testEnv.baseUrl}/api/auth/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'facebook',
          name: 'Trần Anh Tuấn',
          email: 'BroAmStuck@gmail.com',
          accessToken: 'fb-token-that',
        }),
      });
      const adminData = await adminRes.json();
      assert.equal(adminRes.status, 200);
      assert.equal(adminData.success, true);
      assert.equal(adminData.user.email, 'broamstuck@gmail.com');
      assert.equal(adminData.user.role, 'SUPER_ADMIN', 'BroAmStuck@gmail.com must have SUPER_ADMIN role');
      assert.equal(adminData.user.level, 150, 'Super admin must be Level 150');
    } finally {
      restoreFb();
    }

    // 2.3 Invalid email rejection
    const invalidRes = await fetch(`${testEnv.baseUrl}/api/auth/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'google',
        name: 'Invalid Email',
        email: 'not-an-email',
      }),
    });
    assert.equal(invalidRes.status, 400);
    const invalidData = await invalidRes.json();
    assert.equal(invalidData.success, false);
  } finally {
    await testEnv.close();
  }
});

test('3. Graceful Fallback Detection when OAuth credentials are absent', async () => {
  // Without environment variables set
  assert.equal(isGoogleConfigured(), false, 'isGoogleConfigured returns false when VITE_GOOGLE_CLIENT_ID is unset');
  assert.equal(isFacebookConfigured(), false, 'isFacebookConfigured returns false when VITE_FACEBOOK_APP_ID is unset');

  // Triggering login functions directly without config throws graceful errors
  await assert.rejects(
    async () => {
      await loginWithGooglePopup();
    },
    /MISSING_GOOGLE_CLIENT_ID/,
    'loginWithGooglePopup rejects with MISSING_GOOGLE_CLIENT_ID when unconfigured'
  );

  await assert.rejects(
    async () => {
      await loginWithFacebookPopup();
    },
    /MISSING_FACEBOOK_APP_ID/,
    'loginWithFacebookPopup rejects with MISSING_FACEBOOK_APP_ID when unconfigured'
  );
});

test('4. SDK Initializer Concurrency & Singleton Promise Protection', async () => {
  const { initFacebookSdk, initGoogleSdk } = await import('../src/utils/oauth.ts');

  // Verify concurrent calls return the exact same promise instance in Node (resolves immediately)
  const p1 = initFacebookSdk();
  const p2 = initFacebookSdk();
  assert.equal(p1, p2, 'Multiple calls to initFacebookSdk should return the same promise instance');

  const g1 = initGoogleSdk();
  const g2 = initGoogleSdk();
  assert.equal(g1, g2, 'Multiple calls to initGoogleSdk should return the same promise instance');

  await Promise.all([p1, p2, g1, g2]);
});

test('5. OAuth Server Endpoint Case-Insensitive Normalization & Avatar Updating', async () => {
  const testEnv = await createTestServer();

  try {
    // 5.1 Case-Insensitive Super Admin detection (email vẫn được chuẩn hoá về chữ
    //     thường, và vẫn phải qua xác minh nhà cung cấp)
    const restoreGoogle = setProviderLookupForTest('google', async (accessToken) =>
      accessToken === 'gg-token-that' ? { email: 'BroAmStuck@gmail.com' } : null,
    );
    try {
      const adminUpperRes = await fetch(`${testEnv.baseUrl}/api/auth/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          name: 'Trần Anh Tuấn',
          email: 'BroAmStuck@gmail.com',
          accessToken: 'gg-token-that',
        }),
      });
      const adminUpperData = await adminUpperRes.json();
      assert.equal(adminUpperRes.status, 200);
      assert.equal(adminUpperData.success, true);
      assert.equal(adminUpperData.user.email, 'broamstuck@gmail.com', 'Email phải được chuẩn hoá về chữ thường');
      assert.equal(adminUpperData.user.role, 'SUPER_ADMIN');
      assert.equal(adminUpperData.user.level, 150);

      // Viết hoa để lách bộ lọc, kèm access token không hợp lệ -> vẫn bị chặn
      const forgedUpperRes = await fetch(`${testEnv.baseUrl}/api/auth/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          name: 'Kẻ Giả Mạo',
          email: 'BroAmStuck@gmail.com',
          accessToken: 'gg-token-gia',
        }),
      });
      assert.equal(forgedUpperRes.status, 403, 'Access token không xác minh được vẫn bị chặn');
    } finally {
      restoreGoogle();
    }

    // 5.2 Avatar update on subsequent login
    const newAvatar = 'https://custom-avatar.com/photo.png';
    const studentUpdateRes = await fetch(`${testEnv.baseUrl}/api/auth/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'facebook',
        name: 'Test Student',
        email: 'student.updating@fpt.edu.vn',
        avatar: newAvatar,
      }),
    });
    const studentData = await studentUpdateRes.json();
    assert.equal(studentUpdateRes.status, 200);
    assert.equal(studentData.user.avatar, newAvatar);
  } finally {
    await testEnv.close();
  }
});

test('6. OAuth Popup Cancellation & Placeholder Detection Edge Cases', async () => {
  // Test placeholder detection with global process.env
  const originalGoogleId = process.env.VITE_GOOGLE_CLIENT_ID;
  const originalFbId = process.env.VITE_FACEBOOK_APP_ID;

  try {
    // 6.1 Whitespace and placeholders return false
    process.env.VITE_GOOGLE_CLIENT_ID = '   ';
    assert.equal(isGoogleConfigured(), false);
    process.env.VITE_GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
    assert.equal(isGoogleConfigured(), false);

    process.env.VITE_FACEBOOK_APP_ID = '   ';
    assert.equal(isFacebookConfigured(), false);
    process.env.VITE_FACEBOOK_APP_ID = 'YOUR_FACEBOOK_APP_ID';
    assert.equal(isFacebookConfigured(), false);

    // 6.2 Valid configured IDs return true
    process.env.VITE_GOOGLE_CLIENT_ID = '123456789.apps.googleusercontent.com';
    assert.equal(isGoogleConfigured(), true);
    process.env.VITE_FACEBOOK_APP_ID = '9876543210';
    assert.equal(isFacebookConfigured(), true);

    // 6.3 Mock Google SDK popup closure handling
    globalThis.window = {
      google: {
        accounts: {
          oauth2: {
            initTokenClient: ({ callback }) => ({
              requestAccessToken: () => {
                // Simulate user closing popup
                callback({ error: 'popup_closed_by_user' });
              },
            }),
          },
        },
      },
    };

    await assert.rejects(
      async () => {
        await loginWithGooglePopup();
      },
      /POPUP_CLOSED/,
      'Google popup closure must reject with POPUP_CLOSED'
    );

    // 6.4 Mock Facebook SDK popup closure handling
    globalThis.window = {
      FB: {
        login: (callback) => {
          // Simulate user cancelling / closing Facebook popup window
          callback({ status: 'unknown', authResponse: null });
        },
      },
    };

    await assert.rejects(
      async () => {
        await loginWithFacebookPopup();
      },
      /POPUP_CLOSED/,
      'Facebook popup closure must reject with POPUP_CLOSED'
    );
  } finally {
    if (originalGoogleId !== undefined) {
      process.env.VITE_GOOGLE_CLIENT_ID = originalGoogleId;
    } else {
      delete process.env.VITE_GOOGLE_CLIENT_ID;
    }
    if (originalFbId !== undefined) {
      process.env.VITE_FACEBOOK_APP_ID = originalFbId;
    } else {
      delete process.env.VITE_FACEBOOK_APP_ID;
    }
    delete globalThis.window;
  }
});


