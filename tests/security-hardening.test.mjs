import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { WebSocket } from 'ws';
import { createServer } from 'vite';
import { setupForumServer } from '../server/forumServer.ts';

function createTestServer() {
  const middlewares = [];
  const middlewareRunner = { use(fn) { middlewares.push(fn); } };
  const server = http.createServer((req, res) => {
    let index = 0;
    const next = () => {
      if (index < middlewares.length) middlewares[index++](req, res, next);
      else { res.statusCode = 404; res.end('Not Found'); }
    };
    next();
  });
  setupForumServer(server, middlewareRunner);
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise(done => server.close(done)),
      });
    });
  });
}

async function postJson(env, route, body, options = {}) {
  return fetch(`${env.baseUrl}${route}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.cookie ? { Cookie: options.cookie } : {}),
      ...(options.origin ? { Origin: options.origin } : {}),
    },
    body: JSON.stringify(body),
  });
}

function sessionCookie(response) {
  const value = response.headers.get('set-cookie');
  assert.ok(value, 'Expected the server to issue an authentication cookie');
  assert.match(value, /HttpOnly/);
  assert.match(value, /SameSite=Lax/);
  return value.split(';')[0];
}

let registeredCounter = 0;
async function registerStudent(env) {
  registeredCounter += 1;
  const email = `hardening-${Date.now()}-${registeredCounter}@example.test`;
  const response = await postJson(env, '/api/auth/register', {
    name: 'Security Test Student',
    email,
    password: `Strong-password-${registeredCounter}-2026!`,
  });
  const data = await response.json();
  assert.equal(response.status, 200, data.message);
  return { user: data.user, cookie: sessionCookie(response) };
}

test('API authorization ignores client-supplied admin fields and redacts account emails', async () => {
  const env = await createTestServer();
  try {
    const student = await registerStudent(env);

    const anonymousSync = await fetch(`${env.baseUrl}/api/sync`);
    assert.equal(anonymousSync.status, 401, 'Shared forum data is not available without an authenticated account');
    assert.equal((await fetch(`${env.baseUrl}/api/sync/extra`)).status, 401, 'Sync prefix aliases must not bypass the session check');
    const anonymousEvents = await fetch(`${env.baseUrl}/api/events`);
    assert.equal(anonymousEvents.status, 401, 'Realtime event streams require an authenticated session');
    const anonymousRewardState = await fetch(`${env.baseUrl}/api/rewards/daily/state`);
    assert.equal(anonymousRewardState.status, 401, 'Daily reward eligibility is account-bound');

    const anonymousWrite = await postJson(env, '/api/questions', {
      title: 'Should not be stored', content: 'Unauthenticated writes fail closed.',
    });
    assert.equal(anonymousWrite.status, 401);

    const forgedProfile = await postJson(env, '/api/users/update', {
      email: 'anhtuantran0512@gmail.com',
      updates: { role: 'SUPER_ADMIN', xp: 999_999_999, coin: 999_999_999 },
    }, { cookie: student.cookie });
    assert.equal(forgedProfile.status, 403, 'Profile updates cannot target another user or set privileged fields');

    const forgedRole = await postJson(env, '/api/users/update', {
      email: student.user.email,
      updates: { role: 'SUPER_ADMIN' },
    }, { cookie: student.cookie });
    assert.equal(forgedRole.status, 403);

    const forgedXpReward = await postJson(env, '/api/users/update', {
      updates: { xp: student.user.xp + 1_000_000, fPoints: student.user.fPoints + 1_000_000 },
    }, { cookie: student.cookie });
    assert.equal(forgedXpReward.status, 403, 'XP, FPoints, levels, and roles are server-managed, not profile fields');

    const forgedCoinCredit = await postJson(env, '/api/rewards/coin', {
      amount: 500,
      email: 'anhtuantran0512@gmail.com',
      date: '2030-01-01',
    }, { cookie: student.cookie });
    assert.equal(forgedCoinCredit.status, 410, 'The client-amount Coin endpoint is permanently disabled');

    const attendanceClaim = await postJson(env, '/api/rewards/daily/attendance', {
      amount: 500,
      email: 'anhtuantran0512@gmail.com',
      date: '2030-01-01',
      streak: 999,
      boxType: 'red',
    }, { cookie: student.cookie });
    const attendanceData = await attendanceClaim.json();
    assert.equal(attendanceClaim.status, 200, attendanceData.message);
    assert.equal(attendanceData.rewardCoins, 25, 'Attendance pays the server-defined fixed amount');
    assert.equal(attendanceData.user.coin, student.user.coin + 25);
    assert.equal(attendanceData.state.attendanceStreak, 1, 'The server computes streak from its own date ledger');
    assert.equal(attendanceData.state.boxes.red.length, 0, 'Client-supplied streak and box type cannot mint inventory');

    const repeatedAttendance = await postJson(env, '/api/rewards/daily/attendance', {}, { cookie: student.cookie });
    const repeatedAttendanceData = await repeatedAttendance.json();
    assert.equal(repeatedAttendance.status, 200);
    assert.equal(repeatedAttendanceData.alreadyClaimed, true);
    assert.equal(repeatedAttendanceData.rewardCoins, 0, 'Attendance claims are idempotent per Vietnam calendar day');

    const forgedBox = await postJson(env, '/api/rewards/daily/boxes/open', {
      boxId: 'forged-box-id-0001', type: 'red', amount: 200,
    }, { cookie: student.cookie });
    assert.equal(forgedBox.status, 409, 'A box ID must exist in the server-owned inventory');

    const forgedTrivia = await postJson(env, '/api/rewards/daily/trivia', {
      answerIndex: -1, amount: 500, date: '2030-01-01',
    }, { cookie: student.cookie });
    const forgedTriviaData = await forgedTrivia.json();
    assert.equal(forgedTrivia.status, 200);
    assert.equal(forgedTriviaData.rewardCoins, 0, 'Wrong answers never receive client-selected Coin');
    const repeatedTrivia = await postJson(env, '/api/rewards/daily/trivia', {
      answerIndex: 0,
    }, { cookie: student.cookie });
    assert.equal((await repeatedTrivia.json()).alreadyClaimed, true, 'Trivia can be consumed only once per day');

    const forgedCoinMutation = await postJson(env, '/api/users/update', {
      updates: { coin: student.user.coin + 501 },
    }, { cookie: student.cookie });
    assert.equal(forgedCoinMutation.status, 403, 'Coin cannot be changed through the generic profile API');

    const validShopPurchase = await postJson(env, '/api/users/update', {
      updates: {
        coin: student.user.coin + 25 - 50,
        inventory: [...(student.user.inventory || []), 'pencil_starter'],
      },
    }, { cookie: student.cookie });
    assert.equal(validShopPurchase.status, 200, 'The daily reward cap must not break server-validated shop purchases');

    const forgedAdminAbout = await postJson(env, '/api/admin/about', {
      adminEmail: 'anhtuantran0512@gmail.com',
      about: { headline: 'Not authorized' },
    }, { cookie: student.cookie });
    assert.equal(forgedAdminAbout.status, 403);

    const crossOriginProfile = await postJson(env, '/api/users/update', {
      email: student.user.email,
      updates: { name: 'Cross-origin mutation' },
    }, { cookie: student.cookie, origin: 'https://attacker.example' });
    assert.equal(crossOriginProfile.status, 403, 'Cookie-authenticated writes reject a foreign Origin');
    const sameHostWrongScheme = await postJson(env, '/api/users/update', {
      email: student.user.email,
      updates: { name: 'Scheme downgrade mutation' },
    }, { cookie: student.cookie, origin: `https://${new URL(env.baseUrl).host}` });
    assert.equal(sameHostWrongScheme.status, 403, 'Origin validation must compare scheme as well as host');

    const syncResponse = await fetch(`${env.baseUrl}/api/sync`, { headers: { Cookie: student.cookie } });
    assert.equal(syncResponse.status, 200);
    const sync = await syncResponse.json();
    const serialized = JSON.stringify(sync.data);
    assert.ok(!serialized.includes(student.user.email), 'Public sync must not disclose a member email');
    assert.ok(!serialized.includes('anhtuantran0512@gmail.com'), 'Public sync must not disclose the admin email');
    assert.equal(sync.data.feedbacks.length, 0, 'Private feedback records are not part of public sync');
    assert.equal(sync.data.about.founder.email, undefined, 'Public About data omits founder email');
    assert.ok(Object.values(sync.data.users).some(user => user.id === student.user.id));
    assert.equal((await (await fetch(`${env.baseUrl}/api/auth/session`, { headers: { Cookie: student.cookie } })).json()).user.role, 'STUDENT');
  } finally {
    await env.close();
  }
});

test('Anonymous Q&A hides the real author ID from other accounts and blocks self-answer correlation', async () => {
  const env = await createTestServer();
  let readerSocket;
  let broadcastTimer;
  try {
    const author = await registerStudent(env);
    const reader = await registerStudent(env);
    readerSocket = new WebSocket(`${env.baseUrl.replace(/^http/, 'ws')}/ws`, {
      headers: { Cookie: reader.cookie, Origin: env.baseUrl },
    });
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out connecting to authenticated WebSocket')), 2_000);
      readerSocket.once('open', () => { clearTimeout(timeout); resolve(); });
      readerSocket.once('error', error => { clearTimeout(timeout); reject(error); });
    });
    const title = `Anonymous security test ${Date.now()}`;
    const broadcastPromise = new Promise(resolve => {
      const onMessage = raw => {
        try {
          const event = JSON.parse(raw.toString());
          if (event.type === 'NEW_QUESTION' && event.payload?.title === title) {
            clearTimeout(broadcastTimer);
            readerSocket.off('message', onMessage);
            resolve(event);
          }
        } catch { /* ignore malformed events */ }
      };
      readerSocket.on('message', onMessage);
      broadcastTimer = setTimeout(() => {
        readerSocket.off('message', onMessage);
        resolve(null);
      }, 3_000);
    });
    const created = await postJson(env, '/api/questions', {
      title,
      content: 'The account identifier must not be exposed in shared API data.',
      isAnonymous: true,
      bountyCoin: 10,
    }, { cookie: author.cookie });
    const createdData = await created.json();
    assert.equal(created.status, 200, createdData.message);
    const questionId = createdData.question.id;
    assert.equal(createdData.question.authorId, author.user.id, 'The author may see their own identity in their authenticated response');
    const liveEvent = await broadcastPromise;
    assert.ok(liveEvent, 'The question should be broadcast to the authenticated reader');
    assert.equal(liveEvent.payload.authorId, '', 'Realtime broadcasts must not expose anonymous author IDs');
    assert.equal(liveEvent.payload.authorEmail, '', 'Realtime broadcasts must not expose anonymous author emails');

    const ownerSync = await (await fetch(`${env.baseUrl}/api/sync`, { headers: { Cookie: author.cookie } })).json();
    const readerSync = await (await fetch(`${env.baseUrl}/api/sync`, { headers: { Cookie: reader.cookie } })).json();
    const ownerQuestion = ownerSync.data.questions.find(question => question.id === questionId);
    const sharedQuestion = readerSync.data.questions.find(question => question.id === questionId);
    assert.equal(ownerQuestion.authorId, author.user.id, 'The owner retains their personal profile actions');
    assert.equal(sharedQuestion.authorId, '', 'Other accounts must not receive the real ID behind an anonymous post');
    assert.equal(sharedQuestion.authorEmail, '', 'Other accounts must not receive the anonymous author email');

    const selfAnswer = await postJson(env, '/api/solutions', {
      questionId,
      content: 'An answer by the anonymous question owner would reveal the account link.',
    }, { cookie: author.cookie });
    assert.equal(selfAnswer.status, 403, 'An anonymous author cannot link their account by answering their own post');
  } finally {
    clearTimeout(broadcastTimer);
    if (readerSocket?.readyState === WebSocket.OPEN) {
      await new Promise(resolve => {
        readerSocket.once('close', resolve);
        readerSocket.close();
      });
    } else if (readerSocket && readerSocket.readyState !== WebSocket.CLOSED) {
      readerSocket.terminate();
    }
    await env.close();
  }
});

test('Authenticated bulk-read endpoints apply per-account throttles', async () => {
  const env = await createTestServer();
  try {
    const student = await registerStudent(env);
    let limited = null;
    for (let requestNumber = 0; requestNumber < 65; requestNumber += 1) {
      const response = await fetch(`${env.baseUrl}/api/sync`, { headers: { Cookie: student.cookie } });
      if (response.status === 429) {
        limited = response;
        await response.arrayBuffer();
        break;
      }
      assert.equal(response.status, 200);
      await response.arrayBuffer();
    }
    assert.ok(limited, 'Repeated full-store downloads should be throttled for one authenticated account');
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
  } finally {
    await env.close();
  }
});

test('Study rewards use server-timed heartbeats and grant each milestone only once', async () => {
  const env = await createTestServer();
  const realNow = Date.now;
  let fakeNow = 0;
  try {
    const student = await registerStudent(env);
    const start = await postJson(env, '/api/rewards/study/start', {}, { cookie: student.cookie });
    const startData = await start.json();
    assert.equal(start.status, 200);
    assert.match(startData.sessionId, /^[a-zA-Z0-9_-]{8,100}$/);

    fakeNow = realNow();
    Date.now = () => fakeNow;
    const rewardsAtMilestones = new Map();
    for (let pulseNumber = 1; pulseNumber <= 240; pulseNumber += 1) {
      fakeNow += 30_000;
      const response = await postJson(env, '/api/rewards/study/pulse', {
        sessionId: startData.sessionId,
        amount: 500,
        minutes: 120,
        date: '2030-01-01',
      }, { cookie: student.cookie });
      const data = await response.json();
      assert.equal(response.status, 200, data.message);
      if (data.rewards?.length) rewardsAtMilestones.set(pulseNumber, data.rewards.map(reward => [reward.minutes, reward.coins]));
    }

    assert.deepEqual(rewardsAtMilestones.get(50), [[25, 25]], '25 real server-timed minutes award exactly 25 Coin');
    assert.deepEqual(rewardsAtMilestones.get(120), [[60, 35]], 'The 60-minute goal awards only its additional Coin');
    assert.deepEqual(rewardsAtMilestones.get(240), [[120, 60]], 'The 120-minute goal remains capped at 120 study Coin/day');

    const duplicatePulse = await postJson(env, '/api/rewards/study/pulse', {
      sessionId: startData.sessionId, amount: 500, minutes: 120,
    }, { cookie: student.cookie });
    assert.deepEqual((await duplicatePulse.json()).rewards, [], 'Repeating a heartbeat cannot repeat a milestone');
    const stop = await postJson(env, '/api/rewards/study/stop', {
      sessionId: startData.sessionId,
    }, { cookie: student.cookie });
    assert.deepEqual((await stop.json()).rewards, [], 'Stopping an awarded session cannot replay rewards');
    const afterStop = await postJson(env, '/api/rewards/study/pulse', {
      sessionId: startData.sessionId,
    }, { cookie: student.cookie });
    assert.equal(afterStop.status, 409, 'A closed server session cannot accrue more study time');

    const session = await (await fetch(`${env.baseUrl}/api/auth/session`, {
      headers: { Cookie: student.cookie },
    })).json();
    assert.equal(session.user.coin, student.user.coin + 120);
  } finally {
    Date.now = realNow;
    await env.close();
  }
});

test('Per-account API throttles and Q&A attachment validation curb abuse', async () => {
  const env = await createTestServer();
  try {
    const student = await registerStudent(env);
    for (let index = 0; index < 30; index += 1) {
      const response = await postJson(env, '/api/chat', {
        channelId: 'hallway',
        content: `Rate-limit test message ${index}`,
      }, { cookie: student.cookie });
      assert.equal(response.status, 200, `Expected chat attempt ${index + 1} to be allowed`);
      await response.json();
    }

    const throttled = await postJson(env, '/api/chat', {
      channelId: 'hallway', content: 'This message should be throttled.',
    }, { cookie: student.cookie });
    assert.equal(throttled.status, 429, 'A single account cannot flood chat at the shared-IP allowance');
    assert.ok(Number(throttled.headers.get('retry-after')) > 0);

    const otherStudent = await registerStudent(env);
    const independentAccount = await postJson(env, '/api/chat', {
      channelId: 'hallway', content: 'A separate account keeps its own allowance.',
    }, { cookie: otherStudent.cookie });
    assert.equal(independentAccount.status, 200, 'Account limits must not be shared between different users');

    const invalidImage = await postJson(env, '/api/questions', {
      title: 'Unsupported image type',
      content: 'This SVG data URL must be rejected by the server.',
      imageUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      bountyCoin: 10,
    }, { cookie: otherStudent.cookie });
    assert.equal(invalidImage.status, 400, 'SVG and arbitrary data URLs are not accepted as Q&A attachments');

    const forgedPng = await postJson(env, '/api/questions', {
      title: 'Forged PNG content',
      content: 'A PNG MIME label must match actual PNG bytes.',
      imageUrl: 'data:image/png;base64,SGVsbG8=',
      bountyCoin: 10,
    }, { cookie: otherStudent.cookie });
    assert.equal(forgedPng.status, 400, 'The server verifies attachment signatures, not only client MIME labels');

    const validImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jKp8AAAAASUVORK5CYII=';
    const accepted = await postJson(env, '/api/questions', {
      title: 'Valid bounded attachment',
      content: 'A small, valid PNG image should remain supported.',
      imageUrl: validImage,
      bountyCoin: 10,
    }, { cookie: otherStudent.cookie });
    const acceptedData = await accepted.json();
    assert.equal(accepted.status, 200, acceptedData.message);
    assert.equal(acceptedData.question.imageUrl, validImage);
    assert.equal(acceptedData.user.xp, otherStudent.user.xp + 50, 'The server returns its authoritative Q&A reward state');
    assert.equal(acceptedData.user.coin, otherStudent.user.coin - 10);
  } finally {
    await env.close();
  }
});

test('Admin password is not hard-coded; security headers and CORS policy are fail-closed', async () => {
  const previousPassword = process.env.FFORUM_ADMIN_PASSWORD;
  delete process.env.FFORUM_ADMIN_PASSWORD;
  const env = await createTestServer();
  try {
    const defaultPassword = await postJson(env, '/api/auth/login', {
      email: 'anhtuantran0512@gmail.com', password: 'admin123',
    });
    assert.equal(defaultPassword.status, 401, 'The former hard-coded admin password must not work');
    assert.equal(defaultPassword.headers.get('set-cookie'), null);

    process.env.FFORUM_ADMIN_PASSWORD = 'Runtime-only-admin-secret-2026!';
    const adminLogin = await postJson(env, '/api/auth/login', {
      email: 'anhtuantran0512@gmail.com', password: process.env.FFORUM_ADMIN_PASSWORD,
    });
    const adminData = await adminLogin.json();
    assert.equal(adminLogin.status, 200, adminData.message);
    assert.equal(adminData.user.role, 'SUPER_ADMIN');
    assert.equal(adminData.token, undefined, 'The session token must not be exposed in JSON/local storage');
    const adminCookie = sessionCookie(adminLogin);

    const apiResponse = await fetch(`${env.baseUrl}/api/sync`, { headers: { Cookie: adminCookie } });
    assert.equal(apiResponse.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(apiResponse.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.match(apiResponse.headers.get('content-security-policy'), /object-src 'none'/);
    assert.equal(apiResponse.headers.get('cache-control'), 'no-store');
    assert.equal(apiResponse.headers.get('access-control-allow-origin'), null);

    const preflight = await fetch(`${env.baseUrl}/api/users/update`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://attacker.example', 'Access-Control-Request-Method': 'POST' },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), null);

    const adminMutation = await postJson(env, '/api/admin/about', {
      about: { headline: 'authorized update' },
    }, { cookie: adminCookie });
    assert.equal(adminMutation.status, 200);
  } finally {
    if (previousPassword === undefined) delete process.env.FFORUM_ADMIN_PASSWORD;
    else process.env.FFORUM_ADMIN_PASSWORD = previousPassword;
    await env.close();
  }
});

test('Password login attempts are rate-limited and return a retry interval', async () => {
  const env = await createTestServer();
  try {
    let limitedResponse = null;
    for (let attempt = 0; attempt < 30 && !limitedResponse; attempt += 1) {
      const response = await postJson(env, '/api/auth/login', {
        email: `unknown-${attempt}@example.test`, password: 'wrong-password',
      });
      if (response.status === 429) limitedResponse = response;
    }
    assert.ok(limitedResponse, 'The login endpoint must throttle repeated attempts from one source');
    assert.ok(Number(limitedResponse.headers.get('retry-after')) > 0);
    assert.equal((await limitedResponse.json()).success, false);
  } finally {
    await env.close();
  }
});

test('Public tunnel dry-run never exposes the app and vulnerable LocalTunnel is removed', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
  const runner = fs.readFileSync(path.resolve('scripts/start-public.mjs'), 'utf8');
  assert.equal(packageJson.dependencies?.localtunnel, undefined);
  assert.equal(packageJson.devDependencies?.localtunnel, undefined);
  assert.ok(!runner.toLowerCase().includes('localtunnel'));
  const dryRunGuard = runner.indexOf('if (isTestMode)');
  const publicTunnelStart = runner.indexOf('const cfResult = await startCloudflareTunnel()');
  assert.ok(dryRunGuard >= 0 && publicTunnelStart > dryRunGuard, 'Test/dry-run must return before creating any public tunnel');
});

test('Private persisted account data is outside the project root and cannot be served by Vite', async () => {
  const serverSource = fs.readFileSync(path.resolve('server/forumServer.ts'), 'utf8');
  const viteConfig = fs.readFileSync(path.resolve('vite.config.ts'), 'utf8');
  const gitignore = fs.readFileSync(path.resolve('.gitignore'), 'utf8');
  assert.ok(serverSource.includes("path.join(os.homedir(), '.local', 'share', 'f-forum')"));
  assert.ok(gitignore.includes('.env\n') && gitignore.includes('!.env.example'), 'Local secrets stay out of Git while the template remains tracked');
  assert.ok(viteConfig.includes("deny: ['**/data/**']"));
  assert.ok(viteConfig.includes("'.e2b.app'"), 'The Arena preview remains available through a narrow host allowlist');
  assert.ok(!/allowedHosts:\s*true/.test(viteConfig), 'Vite must not allow arbitrary Host headers');

  const dataDir = path.resolve('data');
  const sentinelPath = path.join(dataDir, `__private-serve-test-${process.pid}.txt`);
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(sentinelPath, 'PRIVATE_TEST_SENTINEL');
  const vite = await createServer({
    configFile: path.resolve('vite.config.ts'),
    server: { host: '127.0.0.1', port: 0, strictPort: false },
  });
  try {
    await vite.listen();
    const address = vite.httpServer.address();
    assert.ok(address && typeof address !== 'string');
    const port = address.port;
    for (const route of [
      '/data/__private-serve-test-' + process.pid + '.txt',
      `/@fs${sentinelPath}`,
    ]) {
      const response = await fetch(`http://127.0.0.1:${port}${route}`);
      const body = await response.text();
      assert.equal(response.status, 403, `Expected Vite to deny ${route}`);
      assert.ok(!body.includes('PRIVATE_TEST_SENTINEL'), 'Private file contents must never be returned');
    }
  } finally {
    await vite.close();
    fs.rmSync(sentinelPath, { force: true });
  }
});
