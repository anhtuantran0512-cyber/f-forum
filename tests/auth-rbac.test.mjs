import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const testDataDir = path.join(os.tmpdir(), `f-forum-auth-rbac-${process.pid}`);
process.env.FFORUM_DATA_DIR = testDataDir;
process.env.FFORUM_TEST_SESSION_TTL_MS = '5000';
const { setUserRoleForTest, setupForumServer } = await import('../server/forumServer.ts');

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

let serial = 0;
async function postJson(env, route, body, cookie, extraHeaders = {}) {
  return fetch(`${env.baseUrl}${route}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

function cookieFrom(response) {
  const header = response.headers.get('set-cookie');
  assert.ok(header, 'Authentication response must set a cookie');
  assert.match(header, /HttpOnly/);
  assert.match(header, /SameSite=Lax/);
  assert.match(header, /Max-Age=5/);
  return header.split(';')[0];
}

async function register(env, name = 'Auth test user') {
  serial += 1;
  const email = `auth-rbac-${process.pid}-${serial}@example.test`;
  const password = `A-strong-test-password-${serial}-2026!`;
  const response = await postJson(env, '/api/auth/register', { name, email, password });
  const registrationData = await response.json();
  assert.equal(response.status, 202, registrationData.message);
  assert.equal(registrationData.success, true);
  assert.equal(response.headers.get('set-cookie'), null, 'Registration does not disclose account existence via a login cookie');
  const authenticated = await login(env, email, password);
  assert.equal(authenticated.response.status, 200, authenticated.data.message);
  return { user: authenticated.data.user, email, password, cookie: authenticated.cookie, registrationData };
}

async function login(env, email, password, cookie) {
  const response = await postJson(env, '/api/auth/login', { email, password }, cookie);
  const data = await response.json();
  return { response, data, cookie: response.headers.get('set-cookie') ? cookieFrom(response) : null };
}

test('Registration stores only a password hash and creates the least-privileged role', async () => {
  const env = await createTestServer();
  try {
    const account = await register(env);
    assert.equal(account.user.role, 'user');
    assert.equal('password' in account.user, false);
    assert.equal('passwordHash' in account.user, false);
    assert.equal('token' in account.user, false);

    await new Promise(resolve => setTimeout(resolve, 250));
    const persisted = JSON.parse(fs.readFileSync(path.join(testDataDir, 'forum-data.json'), 'utf8'));
    const passwordHash = persisted.passwords[account.email];
    assert.match(passwordHash, /^pbkdf2-sha256\$600000\$/);
    assert.notEqual(passwordHash, account.password);
    assert.equal(persisted.users[account.email].role, 'user');
    const duplicateRegistration = await postJson(env, '/api/auth/register', {
      name: 'Different submitted name', email: account.email, password: 'Different-valid-password-2026!',
    });
    const duplicateResult = await duplicateRegistration.json();
    assert.equal(duplicateRegistration.status, 202);
    assert.deepEqual(duplicateResult, account.registrationData, 'New and existing addresses receive the same registration response');
    assert.equal(duplicateRegistration.headers.get('set-cookie'), null);
  } finally {
    await env.close();
  }
});

test('Login rotates the HttpOnly session; logout revokes it and account errors do not enumerate users', async () => {
  const env = await createTestServer();
  try {
    const account = await register(env);
    const wrong = await login(env, account.email, 'incorrect-password-2026!');
    const unknown = await login(env, `missing-${account.email}`, 'incorrect-password-2026!');
    assert.equal(wrong.response.status, 401);
    assert.equal(unknown.response.status, 401);
    assert.equal(wrong.data.message, unknown.data.message);

    const firstSession = await fetch(`${env.baseUrl}/api/auth/session`, { headers: { Cookie: account.cookie } });
    assert.equal(firstSession.status, 200);
    const nextLogin = await login(env, account.email, account.password, account.cookie);
    assert.equal(nextLogin.response.status, 200, nextLogin.data.message);
    assert.ok(nextLogin.cookie);
    const oldSession = await fetch(`${env.baseUrl}/api/auth/session`, { headers: { Cookie: account.cookie } });
    assert.equal(oldSession.status, 401, 'The old session cookie is invalid after rotation');

    const logout = await postJson(env, '/api/auth/logout', {}, nextLogin.cookie);
    assert.equal(logout.status, 200);
    const revoked = await fetch(`${env.baseUrl}/api/auth/session`, { headers: { Cookie: nextLogin.cookie } });
    assert.equal(revoked.status, 401);
  } finally {
    await env.close();
  }
});

test('Expired sessions are rejected server-side even when the browser retains its cookie', async () => {
  const env = await createTestServer();
  try {
    const account = await register(env);
    const immediate = await fetch(`${env.baseUrl}/api/auth/session`, { headers: { Cookie: account.cookie } });
    assert.equal(immediate.status, 200);
    await new Promise(resolve => setTimeout(resolve, 5_100));
    const expired = await fetch(`${env.baseUrl}/api/auth/session`, { headers: { Cookie: account.cookie } });
    assert.equal(expired.status, 401);
  } finally {
    await env.close();
  }
});

test('Registration does not publish account creation to authenticated realtime listeners', async () => {
  const env = await createTestServer();
  let reader;
  const streamController = new AbortController();
  try {
    const watcher = await register(env, 'Realtime privacy watcher');
    const response = await fetch(`${env.baseUrl}/api/events`, { headers: { Cookie: watcher.cookie }, signal: streamController.signal });
    assert.equal(response.status, 200);
    reader = response.body.getReader();
    const initial = await Promise.race([
      reader.read().then(value => ({ value })),
      new Promise(resolve => setTimeout(() => resolve({ timedOut: true }), 2_000)),
    ]);
    assert.equal(initial.timedOut, undefined, 'SSE sends its connection marker promptly');
    assert.match(new TextDecoder().decode(initial.value.value), /CONNECTED/);

    const email = `quiet-registration-${process.pid}-${++serial}@example.test`;
    const accepted = await postJson(env, '/api/auth/register', {
      name: 'Unannounced new user', email, password: 'Another-strong-password-2026!',
    });
    assert.equal(accepted.status, 202);
    const nextEvent = await Promise.race([
      reader.read().then(value => ({ value })),
      new Promise(resolve => setTimeout(() => resolve({ timedOut: true }), 250)),
    ]);
    assert.equal(nextEvent.timedOut, true, 'A registered or duplicate email is not announced through realtime broadcasts');
  } finally {
    streamController.abort();
    await env.close();
  }
});

test('Role changes revoke open event streams as well as HTTP sessions', async () => {
  const env = await createTestServer();
  let reader;
  const streamController = new AbortController();
  try {
    const candidate = await register(env, 'Realtime role candidate');
    setUserRoleForTest(candidate.email, 'super_admin');
    const admin = await login(env, candidate.email, candidate.password);
    const target = await register(env, 'Realtime revocation target');
    const stream = await fetch(`${env.baseUrl}/api/events`, { headers: { Cookie: target.cookie }, signal: streamController.signal });
    assert.equal(stream.status, 200);
    reader = stream.body.getReader();
    const initial = await reader.read();
    assert.match(new TextDecoder().decode(initial.value), /CONNECTED/);

    const changed = await postJson(env, '/api/admin/users/role', {
      userId: target.user.id,
      role: 'moderator',
      reason: 'Assign approved community duties',
      currentPassword: candidate.password,
    }, admin.cookie);
    assert.equal(changed.status, 200);
    const revokedEvent = await Promise.race([
      reader.read().then(value => ({ value })),
      new Promise(resolve => setTimeout(() => resolve({ timedOut: true }), 2_000)),
    ]);
    assert.equal(revokedEvent.timedOut, undefined, 'Role change should actively close existing streams');
    assert.match(new TextDecoder().decode(revokedEvent.value.value), /SESSION_REVOKED/);
    const expired = await fetch(`${env.baseUrl}/api/auth/session`, { headers: { Cookie: target.cookie } });
    assert.equal(expired.status, 401);
  } finally {
    streamController.abort();
    await env.close();
  }
});

test('Only server-assigned super_admin can change roles; reauthentication, audit and revocation are enforced', async () => {
  const env = await createTestServer();
  try {
    const actor = await register(env, 'First Admin Candidate');
    const target = await register(env, 'Role-change target');
    const secondAccount = await register(env, 'Unrelated account');

    const forged = await postJson(env, '/api/admin/users/role', {
      userId: target.user.id,
      role: 'super_admin',
      reason: 'Forged client-side role',
      currentPassword: actor.password,
      adminEmail: actor.email,
      currentUserRole: 'super_admin',
    }, actor.cookie);
    assert.equal(forged.status, 403, 'Client-supplied role and admin identity cannot grant authorization');

    setUserRoleForTest(actor.email, 'super_admin');
    const adminSession = await login(env, actor.email, actor.password, actor.cookie);
    assert.equal(adminSession.response.status, 200);
    assert.equal(adminSession.data.user.role, 'super_admin');
    const adminCookie = adminSession.cookie;

    const snapshotResponse = await fetch(`${env.baseUrl}/api/admin/console`, { headers: { Cookie: adminCookie } });
    const snapshot = await snapshotResponse.json();
    assert.equal(snapshotResponse.status, 200);
    assert.ok(snapshot.data.permissions.includes('users.role'));
    assert.ok(snapshot.data.permissions.includes('settings.view'));
    assert.ok(snapshot.data.settings.roles.includes('super_admin'));
    assert.equal(snapshot.data.content.questions.length >= 0, true);

    const wrongPassword = await postJson(env, '/api/admin/users/role', {
      userId: target.user.id,
      role: 'moderator',
      reason: 'Incorrect reauthentication test',
      currentPassword: 'not-the-current-password',
    }, adminCookie);
    assert.equal(wrongPassword.status, 401);

    const missingPassword = await postJson(env, '/api/admin/users/role', {
      userId: target.user.id,
      role: 'moderator',
      reason: 'Missing reauthentication test',
    }, adminCookie);
    assert.equal(missingPassword.status, 401);

    const changed = await postJson(env, '/api/admin/users/role', {
      userId: target.user.id,
      role: 'moderator',
      reason: 'Promote after moderation review',
      currentPassword: actor.password,
    }, adminCookie, { 'User-Agent': 'auth-rbac-test-agent' });
    const changedData = await changed.json();
    assert.equal(changed.status, 200, changedData.message);
    assert.equal(changedData.account.role, 'moderator');
    assert.equal(changedData.sessionsRevoked, true);

    const oldTargetSession = await fetch(`${env.baseUrl}/api/auth/session`, { headers: { Cookie: target.cookie } });
    assert.equal(oldTargetSession.status, 401, 'Role changes revoke all sessions for the target');
    const newTargetLogin = await login(env, target.email, target.password);
    assert.equal(newTargetLogin.response.status, 200);
    assert.equal(newTargetLogin.data.user.role, 'moderator');

    const moderatorSnapshotResponse = await fetch(`${env.baseUrl}/api/admin/console`, { headers: { Cookie: newTargetLogin.cookie } });
    const moderatorSnapshot = await moderatorSnapshotResponse.json();
    assert.equal(moderatorSnapshotResponse.status, 200);
    assert.equal(moderatorSnapshot.data.permissions.includes('users.role'), false);
    assert.equal(moderatorSnapshot.data.permissions.includes('settings.view'), false);
    assert.equal(moderatorSnapshot.data.settings, null);
    assert.deepEqual(moderatorSnapshot.data.auditLog, []);

    const moderatorPrivilegeEscalation = await postJson(env, '/api/admin/users/role', {
      userId: secondAccount.user.id,
      role: 'admin',
      reason: 'Try privilege escalation',
      currentUserRole: 'super_admin',
    }, newTargetLogin.cookie);
    assert.equal(moderatorPrivilegeEscalation.status, 403);

    const adminLogResponse = await fetch(`${env.baseUrl}/api/admin/logs`, { headers: { Cookie: adminCookie } });
    const adminLog = await (await adminLogResponse).json();
    assert.equal(adminLogResponse.status, 200);
    assert.ok(adminLog.auditLog.some(event => event.action === 'role_change_reauth_failure' && event.targetId === target.user.id));
    const successfulRoleEvent = adminLog.auditLog.find(event => event.action === 'role_change' && event.targetId === target.user.id);
    assert.ok(successfulRoleEvent);
    assert.equal(successfulRoleEvent.userAgent, 'auth-rbac-test-agent');
    assert.equal(successfulRoleEvent.result, 'success');
  } finally {
    await env.close();
  }
});

test('Account deletion requires authorized rank, exact confirmation, a reason and password reauthentication', async () => {
  const env = await createTestServer();
  try {
    const owner = await register(env, 'Deletion Super Admin');
    const peerAdmin = await register(env, 'Peer Admin');
    const targetAdmin = await register(env, 'Protected Admin');
    const target = await register(env, 'Deletion target');
    setUserRoleForTest(owner.email, 'super_admin');
    setUserRoleForTest(peerAdmin.email, 'admin');
    setUserRoleForTest(targetAdmin.email, 'admin');
    const superAdminSession = await login(env, owner.email, owner.password);
    const adminSession = await login(env, peerAdmin.email, peerAdmin.password);

    const selfDelete = await postJson(env, '/api/admin/users/delete', {
      userId: owner.user.id,
      reason: 'Self deletion attempt',
      confirmation: owner.email,
      currentPassword: owner.password,
    }, superAdminSession.cookie);
    assert.equal(selfDelete.status, 403, 'A Super Admin cannot delete the account needed for recovery');

    const peerDelete = await postJson(env, '/api/admin/users/delete', {
      userId: targetAdmin.user.id,
      reason: 'Delete an equal-rank administrator',
      confirmation: targetAdmin.email,
      currentPassword: peerAdmin.password,
    }, adminSession.cookie);
    assert.equal(peerDelete.status, 403, 'An Admin cannot delete an account with equal or higher rank');

    const missingReason = await postJson(env, '/api/admin/users/delete', {
      userId: target.user.id,
      confirmation: target.email,
      currentPassword: owner.password,
    }, superAdminSession.cookie);
    assert.equal(missingReason.status, 400);
    const wrongConfirmation = await postJson(env, '/api/admin/users/delete', {
      userId: target.user.id,
      reason: 'Policy-based account removal',
      confirmation: 'wrong@example.test',
      currentPassword: owner.password,
    }, superAdminSession.cookie);
    assert.equal(wrongConfirmation.status, 400);
    const wrongPassword = await postJson(env, '/api/admin/users/delete', {
      userId: target.user.id,
      reason: 'Policy-based account removal',
      confirmation: target.email,
      currentPassword: 'incorrect-password-2026!',
    }, superAdminSession.cookie);
    assert.equal(wrongPassword.status, 401);
    assert.equal((await fetch(`${env.baseUrl}/api/auth/session`, { headers: { Cookie: target.cookie } })).status, 200,
      'Failed reauthentication leaves the target account intact');

    const deleted = await postJson(env, '/api/admin/users/delete', {
      userId: target.user.id,
      reason: 'Confirmed policy-based account removal',
      confirmation: target.email,
      currentPassword: owner.password,
    }, superAdminSession.cookie);
    assert.equal(deleted.status, 200);
    assert.equal((await fetch(`${env.baseUrl}/api/auth/session`, { headers: { Cookie: target.cookie } })).status, 401,
      'Deletion revokes already-issued sessions');
    const targetLogin = await login(env, target.email, target.password);
    assert.equal(targetLogin.response.status, 401);
    const logs = await (await fetch(`${env.baseUrl}/api/admin/logs`, { headers: { Cookie: superAdminSession.cookie } })).json();
    assert.ok(logs.auditLog.some(event => event.action === 'delete_user' && event.targetId === target.user.id && event.result === 'success'));
  } finally {
    await env.close();
  }
});

test('Profile ownership is session-bound; a valid user cannot update another account by changing email/ID', async () => {
  const env = await createTestServer();
  try {
    const first = await register(env, 'First profile owner');
    const other = await register(env, 'Second profile owner');
    const byEmail = await postJson(env, '/api/users/update', {
      email: other.email,
      updates: { name: 'Unauthorized overwrite' },
    }, first.cookie);
    assert.equal(byEmail.status, 403);
    const byId = await postJson(env, '/api/users/update', {
      userId: other.user.id,
      updates: { name: 'Unauthorized overwrite' },
    }, first.cookie);
    assert.equal(byId.status, 403);
    const ownUpdate = await postJson(env, '/api/users/update', {
      updates: { name: 'Owner-controlled profile edit' },
    }, first.cookie);
    assert.equal(ownUpdate.status, 200);
    const session = await (await fetch(`${env.baseUrl}/api/auth/session`, { headers: { Cookie: first.cookie } })).json();
    assert.equal(session.user.name, 'Owner-controlled profile edit');
  } finally {
    await env.close();
  }
});

test('Offline bootstrap promotes only one existing password-enabled account and closes after first use', () => {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fforum-bootstrap-cli-'));
  try {
    const email = 'first-admin-candidate@example.test';
    const account = {
      id: 'existing-account-id', name: 'Existing user', email, role: 'user', updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const fixture = {
      schemaVersion: 3,
      users: { [email]: account },
      passwords: { [email]: `pbkdf2-sha256$600000$0123456789abcdef0123456789abcdef$${'a'.repeat(64)}` },
    };
    const dataFile = path.join(fixtureDir, 'forum-data.json');
    fs.writeFileSync(dataFile, JSON.stringify(fixture), { mode: 0o600 });
    const scriptPath = path.resolve('scripts/promote-super-admin.mjs');
    const lockFile = `${dataFile}.bootstrap.lock`;
    fs.writeFileSync(lockFile, 'another-bootstrap-process');
    const lockBlocked = spawnSync(process.execPath, [scriptPath, email], {
      encoding: 'utf8',
      env: { ...process.env, FFORUM_DATA_DIR: fixtureDir },
    });
    assert.notEqual(lockBlocked.status, 0, 'An existing lock prevents overlapping bootstrap');
    assert.match(lockBlocked.stderr, /exclusive bootstrap lock/i);
    assert.equal(fs.existsSync(lockFile), true, 'A failed process does not remove a lock owned by another process');
    fs.unlinkSync(lockFile);

    const promoted = spawnSync(process.execPath, [scriptPath, email], {
      encoding: 'utf8',
      env: { ...process.env, FFORUM_DATA_DIR: fixtureDir },
    });
    assert.equal(promoted.status, 0, promoted.stderr);
    const afterPromotion = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'forum-data.json'), 'utf8'));
    assert.equal(afterPromotion.users[email].role, 'super_admin');
    assert.equal(afterPromotion.passwords[email], fixture.passwords[email], 'Bootstrap does not read or replace passwords');
    if (process.platform !== 'win32') {
      assert.equal(fs.statSync(dataFile).mode & 0o777, 0o600, 'The promoted data file is owner-readable only');
      assert.equal(fs.statSync(fixtureDir).mode & 0o777, 0o700, 'The data directory is owner-only');
    }
    assert.equal(fs.existsSync(lockFile), false);

    const secondPromotion = spawnSync(process.execPath, [scriptPath, email], {
      encoding: 'utf8',
      env: { ...process.env, FFORUM_DATA_DIR: fixtureDir },
    });
    assert.notEqual(secondPromotion.status, 0, 'First-admin bootstrap is permanently closed once a Super Admin exists');
    assert.match(secondPromotion.stderr, /already exists/i);
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});
