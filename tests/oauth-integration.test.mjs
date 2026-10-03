import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import { setupForumServer } from '../server/forumServer.ts';
import { isGoogleConfigured, isFacebookConfigured, loginWithGooglePopup, loginWithFacebookPopup } from '../src/utils/oauth.ts';

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

test('2. Social auth rejects client-asserted identities until a verified OAuth callback exists', async () => {
  const testEnv = await createTestServer();
  try {
    for (const identity of [
      { provider: 'google', name: 'Impersonated Student', email: 'spoof.student@example.test' },
      { provider: 'facebook', name: 'Impersonated Admin', email: 'anhtuantran0512@gmail.com' },
    ]) {
      const response = await fetch(`${testEnv.baseUrl}/api/auth/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(identity),
      });
      const result = await response.json();
      assert.equal(response.status, 501);
      assert.equal(result.success, false);
      assert.equal(response.headers.get('set-cookie'), null, 'Unverified identity must not create a session');
    }
    const sync = await (await fetch(`${testEnv.baseUrl}/api/sync`)).json();
    assert.equal(sync.data.users['spoof.student@example.test'], undefined, 'Unverified OAuth must not create an account');
    assert.equal(sync.data.users['anhtuantran0512@gmail.com'].role, 'SUPER_ADMIN', 'Built-in admin role remains server-defined');
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

test('5. OAuth email claims cannot create, elevate, or authenticate an account', async () => {
  const testEnv = await createTestServer();
  try {
    const response = await fetch(`${testEnv.baseUrl}/api/auth/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'google', name: 'Admin', email: 'ANHTUANTRAN0512@GMAIL.COM' }),
    });
    assert.equal(response.status, 501);
    assert.equal(response.headers.get('set-cookie'), null);

    const session = await fetch(`${testEnv.baseUrl}/api/auth/session`);
    assert.equal(session.status, 401, 'An email string alone is not an authenticated session');
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


