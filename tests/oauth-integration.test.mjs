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
  assert.ok(!authModalCode.includes('handleFallbackCustomSubmit'), 'Manual social identity fallback is forbidden');
  assert.ok(!authModalCode.includes('fallbackCustomEmail'), 'Social login must not ask users to type an unverified email');

  // Verify LoginModal re-exports AuthModal
  const loginModalCode = fs.readFileSync('src/components/LoginModal.tsx', 'utf8');
  assert.ok(loginModalCode.includes("from './AuthModal'"), 'LoginModal re-exports AuthModal');
});

test('2. OAuth endpoint rejects client profiles and verifies provider tokens on the server', async () => {
  const testEnv = await createTestServer();
  const originalFetch = globalThis.fetch;
  const previousGoogleClientId = process.env.FFORUM_GOOGLE_CLIENT_ID;
  const previousFacebookAppId = process.env.FFORUM_FACEBOOK_APP_ID;
  const previousFacebookAppSecret = process.env.FFORUM_FACEBOOK_APP_SECRET;
  process.env.FFORUM_GOOGLE_CLIENT_ID = 'forum-google-client';
  process.env.FFORUM_FACEBOOK_APP_ID = 'forum-facebook-app';
  process.env.FFORUM_FACEBOOK_APP_SECRET = 'server-only-facebook-secret';
  const providerProfiles = new Map();
  providerProfiles.set('https://oauth2.googleapis.com/tokeninfo?', {
    aud: 'forum-google-client', azp: 'forum-google-client',
  });
  providerProfiles.set('https://graph.facebook.com/debug_token?', {
    data: { is_valid: true, app_id: 'forum-facebook-app', user_id: 'fb-verified-id' },
  });
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    for (const [providerUrl, profile] of providerProfiles) {
      if (url.startsWith(providerUrl)) {
        return new Response(JSON.stringify(profile), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    return originalFetch(input, init);
  };

  try {
    const forgedRes = await fetch(`${testEnv.baseUrl}/api/auth/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'google',
        name: 'Forged Super Admin',
        email: 'anhtuantran0512@gmail.com',
        avatar: 'https://attacker.example/avatar.png',
      }),
    });
    assert.equal(forgedRes.status, 401, 'A profile without an OAuth credential must not create a session');
    assert.equal(forgedRes.headers.get('set-cookie'), null);

    providerProfiles.set('https://www.googleapis.com/oauth2/v3/userinfo', {
      name: 'Verified Google Student',
      email: 'test.google.user@fpt.edu.vn',
      email_verified: true,
      picture: 'https://lh3.googleusercontent.com/a/verified-avatar',
    });
    const googleRes = await fetch(`${testEnv.baseUrl}/api/auth/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'google',
        credential: 'google-access-token-for-server-verification',
        email: 'attacker-supplied@example.org',
        name: 'Attacker supplied name',
      }),
    });
    const googleData = await googleRes.json();
    assert.equal(googleRes.status, 200, googleData.message);
    assert.equal(googleData.user.email, 'test.google.user@fpt.edu.vn');
    assert.equal(googleData.user.name, 'Verified Google Student');
    assert.equal(googleData.user.role, 'STUDENT');
    assert.equal(googleData.user.level, 1);
    assert.equal(googleData.token, undefined, 'Session bearer tokens are not returned to JavaScript');
    assert.match(googleRes.headers.get('set-cookie'), /HttpOnly/);
    assert.match(googleRes.headers.get('set-cookie'), /SameSite=Lax/);

    providerProfiles.set('https://oauth2.googleapis.com/tokeninfo?', { aud: 'attacker-owned-client' });
    providerProfiles.set('https://www.googleapis.com/oauth2/v3/userinfo', {
      name: 'Forged Admin via foreign OAuth app',
      email: 'anhtuantran0512@gmail.com',
      email_verified: true,
    });
    const foreignGoogleApp = await fetch(`${testEnv.baseUrl}/api/auth/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'google', credential: 'google-token-from-foreign-client' }),
    });
    assert.equal(foreignGoogleApp.status, 401, 'A valid Google token for another OAuth client cannot sign in to F-Forum');
    assert.equal(foreignGoogleApp.headers.get('set-cookie'), null);
    providerProfiles.set('https://oauth2.googleapis.com/tokeninfo?', {
      aud: 'forum-google-client', azp: 'forum-google-client',
    });

    providerProfiles.set('https://graph.facebook.com/me?', {
      name: 'Verified Facebook Owner',
      email: 'anhtuantran0512@gmail.com',
      picture: { data: { url: 'https://facebook.example/avatar.png' } },
      id: 'fb-verified-id',
    });
    const adminRes = await fetch(`${testEnv.baseUrl}/api/auth/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'facebook',
        credential: 'facebook-access-token-for-server-verification',
        email: 'student@example.org',
      }),
    });
    const adminData = await adminRes.json();
    assert.equal(adminRes.status, 200, adminData.message);
    assert.equal(adminData.user.email, 'anhtuantran0512@gmail.com');
    assert.equal(adminData.user.role, 'SUPER_ADMIN');
    assert.equal(adminData.user.level, 150);

    providerProfiles.set('https://graph.facebook.com/debug_token?', {
      data: { is_valid: true, app_id: 'attacker-owned-facebook-app', user_id: 'fb-verified-id' },
    });
    const foreignFacebookApp = await fetch(`${testEnv.baseUrl}/api/auth/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'facebook', credential: 'facebook-token-from-foreign-client' }),
    });
    assert.equal(foreignFacebookApp.status, 401, 'A Facebook token for another app cannot create an F-Forum session');
    assert.equal(foreignFacebookApp.headers.get('set-cookie'), null);

    providerProfiles.set('https://www.googleapis.com/oauth2/v3/userinfo', {
      email: 'unverified@example.org',
      email_verified: false,
      name: 'Unverified',
    });
    const unverifiedRes = await fetch(`${testEnv.baseUrl}/api/auth/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'google', credential: 'google-token-unverified-identity' }),
    });
    assert.equal(unverifiedRes.status, 401, 'Unverified Google email identities are rejected');
    assert.equal(unverifiedRes.headers.get('set-cookie'), null);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousGoogleClientId === undefined) delete process.env.FFORUM_GOOGLE_CLIENT_ID;
    else process.env.FFORUM_GOOGLE_CLIENT_ID = previousGoogleClientId;
    if (previousFacebookAppId === undefined) delete process.env.FFORUM_FACEBOOK_APP_ID;
    else process.env.FFORUM_FACEBOOK_APP_ID = previousFacebookAppId;
    if (previousFacebookAppSecret === undefined) delete process.env.FFORUM_FACEBOOK_APP_SECRET;
    else process.env.FFORUM_FACEBOOK_APP_SECRET = previousFacebookAppSecret;
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

test('5. Verified OAuth normalizes email and uses the verified provider avatar', async () => {
  const testEnv = await createTestServer();
  const originalFetch = globalThis.fetch;
  const previousGoogleClientId = process.env.FFORUM_GOOGLE_CLIENT_ID;
  process.env.FFORUM_GOOGLE_CLIENT_ID = 'normalization-google-client';
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith('https://oauth2.googleapis.com/tokeninfo?')) {
      return new Response(JSON.stringify({ aud: 'normalization-google-client' }), { status: 200 });
    }
    if (String(input).startsWith('https://www.googleapis.com/oauth2/v3/userinfo')) {
      return new Response(JSON.stringify({
        name: 'Verified Case Student',
        email: 'STUDENT.UPDATING@FPT.EDU.VN',
        email_verified: true,
        picture: 'https://custom-avatar.example/photo.png',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return originalFetch(input, init);
  };
  try {
    const response = await fetch(`${testEnv.baseUrl}/api/auth/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'google',
        credential: 'verified-google-token-for-normalization-test',
        name: 'Untrusted client name',
        email: 'untrusted@example.org',
        avatar: 'javascript:alert(1)',
      }),
    });
    const data = await response.json();
    assert.equal(response.status, 200, data.message);
    assert.equal(data.user.email, 'student.updating@fpt.edu.vn');
    assert.equal(data.user.name, 'Verified Case Student');
    assert.equal(data.user.avatar, 'https://custom-avatar.example/photo.png');
  } finally {
    globalThis.fetch = originalFetch;
    if (previousGoogleClientId === undefined) delete process.env.FFORUM_GOOGLE_CLIENT_ID;
    else process.env.FFORUM_GOOGLE_CLIENT_ID = previousGoogleClientId;
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


