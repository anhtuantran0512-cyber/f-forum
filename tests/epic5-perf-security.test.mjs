/* Bản quyền trí tuệ thuộc về BroAmStuck */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';
import sharp from 'sharp';

/* ==========================================================================
   EPIC 5 (Nhiemvu_3) — Hiệu năng & Bảo mật.
   Server chạy THẬT qua HTTP/WebSocket; phần client kiểm bằng hàm thuần.
   ========================================================================== */

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fforum-epic5-'));
process.env.FFORUM_DATA_DIR = DATA_DIR;
const TEST_ADMIN_PASSWORD = 'test-only-super-admin-password-2026';
process.env.FFORUM_ADMIN_PASSWORD = TEST_ADMIN_PASSWORD;

const { setupForumServer, resetRateLimitersForTest } = await import('../server/forumServer.ts');
const {
  createSessionToken,
  sanitizeMediaUrl,
  sanitizeCssGradient,
  sanitizePlainText,
  sanitizeUserUpdate,
  SESSION_COOKIE_NAME,
} = await import('../server/authGuard.ts');
const {
  buildContentSecurityPolicy,
  securityHeadersMiddleware,
  allowedCorsOrigin,
  CSP_ORIGINS,
} = await import('../server/securityHeaders.ts');
const { sniffImageFormat } = await import('../server/mediaPipeline.ts');
const { GHIBLI_MASKS } = await import('../src/utils/ghibliMasks.ts');
const { scoreDeviceSignals, shouldSuggestPotato, parsePotatoHint, POTATO_SNOOZE_MS } = await import('../src/utils/deviceTier.ts');
const { isDevtoolsShortcut, isLikelyDevtoolsResize } = await import('../src/security/devtoolsSignals.ts');
const session = await import('../src/utils/session.ts');
const { describeReportResult } = await import('../src/utils/reports.ts');
const { unsharpMask } = await import('../src/utils/imagePipeline.ts');

const read = (p) => fs.readFileSync(path.resolve(p), 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function createTestServer() {
  resetRateLimitersForTest();
  const middlewares = [];
  const runner = { use(fn) { middlewares.push(fn); } };
  const server = http.createServer((req, res) => {
    let index = 0;
    const next = () => {
      if (index < middlewares.length) middlewares[index++](req, res, next);
      else { res.statusCode = 404; res.end('Not Found'); }
    };
    next();
  });
  setupForumServer(server, runner);
  const sockets = new Set();
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        wsUrl: `ws://127.0.0.1:${port}/ws`,
        close: () => new Promise((done) => {
          sockets.forEach((s) => s.destroy());
          server.close(() => done());
        }),
      });
    });
  });
}

const post = async (baseUrl, url, body, token, extraHeaders) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (extraHeaders) Object.assign(headers, extraHeaders);
  const res = await fetch(`${baseUrl}${url}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return { status: res.status, data: await res.json().catch(() => null), res };
};

const register = async (baseUrl, name, email, password) => {
  const out = await post(baseUrl, '/api/auth/register', { name, email, password });
  assert.equal(out.status, 200, `register ${email}: ${JSON.stringify(out.data)}`);
  return out.data;
};

const adminLogin = async (baseUrl) => {
  const out = await post(baseUrl, '/api/auth/login', { email: 'BroAmStuck@gmail.com', password: TEST_ADMIN_PASSWORD });
  assert.equal(out.status, 200, `admin login: ${JSON.stringify(out.data)}`);
  return out.data;
};

/** WS kèm hộp thư; `headers` để giả lập cookie/Origin của trình duyệt. */
function openWs(wsUrl, headers = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl, { headers });
    const inbox = [];
    ws.on('message', (raw) => {
      try { inbox.push(JSON.parse(raw.toString())); } catch { /* ignore */ }
    });
    ws.once('open', () => resolve({ ws, inbox }));
    ws.once('error', reject);
  });
}

const waitFor = async (inbox, predicate, ms = 1500) => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const found = inbox.find(predicate);
    if (found) return found;
    await sleep(25);
  }
  return null;
};

/* -------------------------------------------------------------------------- */
/* 1. Header bảo mật & CSP                                                     */
/* -------------------------------------------------------------------------- */

test('1. CSP: production chặt (không unsafe-inline cho script), dev nới cho React Refresh', () => {
  const prod = buildContentSecurityPolicy({ mode: 'preview', host: 'fforum.example', frameAncestors: "'self'" });
  const dev = buildContentSecurityPolicy({ mode: 'dev', host: 'localhost:5173', frameAncestors: null });
  const directive = (csp, name) => csp.split('; ').find((d) => d.startsWith(`${name} `)) || '';

  assert.ok(!directive(prod, 'script-src').includes("'unsafe-inline'"), 'script-src production KHÔNG được có unsafe-inline');
  assert.ok(!prod.includes("'unsafe-eval'"), 'không bao giờ cho phép eval');
  assert.ok(directive(dev, 'script-src').includes("'unsafe-inline'"), 'dev cần preamble React Refresh nội tuyến');
  assert.equal(directive(prod, 'object-src'), "object-src 'none'");
  assert.equal(directive(prod, 'base-uri'), "base-uri 'self'");
  assert.equal(directive(prod, 'frame-ancestors'), "frame-ancestors 'self'", 'production chống clickjacking');
  assert.equal(directive(dev, 'frame-ancestors'), '', 'dev KHÔNG chặn nhúng — khung xem trước cần iframe');
  assert.ok(directive(prod, 'connect-src').includes('wss://fforum.example'), 'WebSocket cùng host được phép');
});

test('2. CSP phủ ĐỦ mọi nguồn ngoài mà index.html và SDK đăng nhập thật sự tải', () => {
  const csp = buildContentSecurityPolicy({ mode: 'preview', host: 'fforum.example', frameAncestors: "'self'" });
  const directive = (name) => csp.split('; ').find((d) => d.startsWith(`${name} `)) || '';
  const html = read('index.html');
  const main = read('src/main.tsx');

  for (const m of html.matchAll(/<link[^>]+href="(https:\/\/[^"]+)"[^>]*rel="stylesheet"|<link[^>]+rel="stylesheet"[^>]+href="(https:\/\/[^"]+)"/g)) {
    const origin = new URL(m[1] || m[2]).origin;
    assert.ok(directive('style-src').includes(origin), `style-src thiếu ${origin}`);
  }
  for (const m of html.matchAll(/url\(['"]?(https:\/\/[^'")]+)['"]?\)/g)) {
    const origin = new URL(m[1]).origin;
    assert.ok(directive('font-src').includes(origin) || directive('img-src').includes('https:'), `font/img-src thiếu ${origin}`);
  }
  assert.ok(directive('font-src').includes('https://fonts.gstatic.com'), 'font Google');
  assert.ok(main.includes('connect.facebook.net') && directive('script-src').includes('https://connect.facebook.net'), 'SDK Facebook');
  assert.ok(main.includes('accounts.google.com/gsi/client') && directive('script-src').includes('https://accounts.google.com'), 'SDK Google');

  /* Mọi video trong mã nguồn đều đến từ host được phép ở media-src. */
  const srcFiles = fs.readdirSync('src', { recursive: true }).filter((f) => /\.(tsx?|css)$/.test(f));
  const videoHosts = new Set();
  for (const f of srcFiles) {
    for (const m of read(path.join('src', f)).matchAll(/https:\/\/([a-z0-9.-]+)\/[^"'`\s)]+\.(?:mp4|webm)/gi)) videoHosts.add(`https://${m[1]}`);
  }
  assert.ok(videoHosts.size > 0, 'phải tìm thấy video nền');
  videoHosts.forEach((origin) => assert.ok(directive('media-src').includes(origin), `media-src thiếu ${origin}`));
  assert.ok(CSP_ORIGINS.media.includes('https://d8j0ntlcm91z4.cloudfront.net'));
});

test('3. Middleware header: nosniff, Referrer-Policy, COOP, chống clickjacking; HSTS chỉ khi HTTPS ở production', async () => {
  const serve = (mode) => new Promise((resolve) => {
    const mw = securityHeadersMiddleware(mode);
    const server = http.createServer((req, res) => mw(req, res, () => { res.end('ok'); }));
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
  const prodServer = await serve('preview');
  const devServer = await serve('dev');
  try {
    const prodUrl = `http://127.0.0.1:${prodServer.address().port}/`;
    const devUrl = `http://127.0.0.1:${devServer.address().port}/`;
    const plain = await fetch(prodUrl);
    assert.equal(plain.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(plain.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(plain.headers.get('cross-origin-opener-policy'), 'same-origin-allow-popups', 'popup OAuth vẫn hoạt động');
    assert.match(plain.headers.get('permissions-policy') || '', /camera=\(\)/);
    assert.equal(plain.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.ok(plain.headers.get('content-security-policy')?.includes("default-src 'self'"));
    assert.equal(plain.headers.get('strict-transport-security'), null, 'HTTP thường không gửi HSTS');

    const viaHttps = await fetch(prodUrl, { headers: { 'X-Forwarded-Proto': 'https' } });
    assert.match(viaHttps.headers.get('strict-transport-security') || '', /max-age=31536000/);

    const dev = await fetch(devUrl, { headers: { 'X-Forwarded-Proto': 'https' } });
    assert.equal(dev.headers.get('x-frame-options'), null, 'dev cho phép nhúng iframe (live preview)');
    assert.equal(dev.headers.get('strict-transport-security'), null, 'dev không gửi HSTS');
    assert.equal(dev.headers.get('x-content-type-options'), 'nosniff');
  } finally {
    prodServer.close();
    devServer.close();
  }
});

test('4. CORS: bỏ `*`, chỉ phản hồi cho chính site hoặc origin được khai báo; JSON API không bị cache', async () => {
  const fakeReq = (origin, host) => ({ headers: { origin, host } });
  assert.equal(allowedCorsOrigin(fakeReq('https://fforum.example', 'fforum.example')), 'https://fforum.example');
  assert.equal(allowedCorsOrigin(fakeReq('https://evil.example', 'fforum.example')), null);
  assert.equal(allowedCorsOrigin(fakeReq('https://partner.example', 'fforum.example'), { FFORUM_ALLOWED_ORIGINS: 'https://partner.example' }), 'https://partner.example');

  const env = await createTestServer();
  try {
    const evil = await fetch(`${env.baseUrl}/api/health`, { headers: { Origin: 'https://evil.example' } });
    assert.notEqual(evil.headers.get('access-control-allow-origin'), '*', 'không còn CORS mở toang');
    assert.equal(evil.headers.get('access-control-allow-origin'), null);
    const same = await fetch(`${env.baseUrl}/api/health`, { headers: { Origin: env.baseUrl } });
    assert.equal(same.headers.get('access-control-allow-origin'), env.baseUrl);
    const session = await fetch(`${env.baseUrl}/api/auth/session`);
    assert.equal(session.headers.get('cache-control'), 'no-store', 'phản hồi API có dữ liệu cá nhân không được cache');
  } finally {
    await env.close();
  }
});

/* -------------------------------------------------------------------------- */
/* 2. Tố cáo: bắt buộc đăng nhập + rate limit riêng + không lộ người tố cáo      */
/* -------------------------------------------------------------------------- */

test('5. Tố cáo: giới hạn 6 lượt/10 phút mỗi tài khoản; tự tố cáo bị chặn; bản trùng không tốn lượt', async () => {
  const env = await createTestServer();
  try {
    const reporter = await register(env.baseUrl, 'Người Báo', `epic5.reporter.${Date.now()}@example.com`, 'mat-khau-bao-cao-1');
    const self = await post(env.baseUrl, '/api/reports', { reportedUserId: reporter.user.id, reason: 'Spam' }, reporter.token);
    assert.equal(self.status, 400, 'không tự tố cáo chính mình');

    for (let i = 0; i < 6; i++) {
      const ok = await post(env.baseUrl, '/api/reports', { reportedUserId: `u-target-${i}`, reason: 'Spam' }, reporter.token);
      assert.equal(ok.status, 200, `lượt ${i + 1}: ${JSON.stringify(ok.data)}`);
    }
    const dup = await post(env.baseUrl, '/api/reports', { reportedUserId: 'u-target-0', reason: 'Spam' }, reporter.token);
    assert.equal(dup.data.duplicated, true, 'bản trùng vẫn được gộp (không tính lượt)');
    const blocked = await post(env.baseUrl, '/api/reports', { reportedUserId: 'u-target-new', reason: 'Spam' }, reporter.token);
    assert.equal(blocked.status, 429, 'lượt thứ 7 trong cửa sổ bị chặn');
    assert.ok(blocked.res.headers.get('retry-after'), 'kèm Retry-After');
  } finally {
    await env.close();
  }
});

test('6. Sự kiện NEW_REPORT chỉ tới socket Super Admin và không chứa danh tính người tố cáo', async () => {
  const env = await createTestServer();
  const sockets = [];
  try {
    const admin = await adminLogin(env.baseUrl);
    const reporter = await register(env.baseUrl, 'Người Báo WS', `epic5.ws.${Date.now()}@example.com`, 'mat-khau-bao-ws-1');
    const guest = await openWs(env.wsUrl);
    const adminWs = await openWs(env.wsUrl);
    sockets.push(guest.ws, adminWs.ws);
    adminWs.ws.send(JSON.stringify({ type: 'AUTH', payload: { token: admin.token } }));
    assert.ok(await waitFor(adminWs.inbox, (m) => m.type === 'AUTH_OK'), 'admin xác thực WS');

    const sent = await post(env.baseUrl, '/api/reports', { reportedUserId: 'u-ws-target', reportedUserName: 'Mục Tiêu', reason: 'Quấy rối' }, reporter.token);
    assert.equal(sent.status, 200);
    const event = await waitFor(adminWs.inbox, (m) => m.type === 'NEW_REPORT');
    assert.ok(event, 'Super Admin nhận thông báo realtime');
    assert.equal(event.payload.reason, 'Quấy rối');
    for (const key of ['reporterEmail', 'reporterName', 'reporterId', 'details']) {
      assert.equal(key in event.payload, false, `payload realtime không được chứa ${key}`);
    }
    await sleep(250);
    assert.equal(guest.inbox.some((m) => m.type === 'NEW_REPORT'), false, 'khách KHÔNG được nhận tố cáo');
  } finally {
    sockets.forEach((ws) => ws.close());
    await env.close();
  }
});

/* -------------------------------------------------------------------------- */
/* 3. Đăng nhập: chống rải mật khẩu & dò một tài khoản từ nhiều IP               */
/* -------------------------------------------------------------------------- */

test('7. Rate limit đăng nhập: rải mật khẩu qua nhiều email từ một IP bị chặn ở lần sai thứ 41', async () => {
  const env = await createTestServer();
  try {
    for (let i = 0; i < 40; i++) {
      const res = await post(env.baseUrl, '/api/auth/login', { email: `spray${i}@example.com`, password: 'Mat-khau-pho-bien-1' });
      assert.equal(res.status, 400, `lượt ${i + 1} vẫn chỉ là "sai"`);
    }
    const blocked = await post(env.baseUrl, '/api/auth/login', { email: 'spray-new@example.com', password: 'Mat-khau-pho-bien-1' });
    assert.equal(blocked.status, 429, 'IP đã sai 40 lần (mọi email) phải bị chặn');
  } finally {
    await env.close();
  }
});

test('8. Rate limit đăng nhập: một tài khoản bị dò từ nhiều IP bị khoá; đăng nhập đúng xoá bộ đếm tài khoản', async () => {
  const previous = process.env.FFORUM_TRUST_PROXY;
  process.env.FFORUM_TRUST_PROXY = '1';
  const env = await createTestServer();
  try {
    const email = `epic5.victim.${Date.now()}@example.com`;
    await register(env.baseUrl, 'Nạn Nhân', email, 'mat-khau-that-123');
    const attempt = (ip, password) => post(env.baseUrl, '/api/auth/login', { email, password }, null, { 'X-Forwarded-For': ip });

    for (let i = 0; i < 20; i++) assert.equal((await attempt(`10.0.0.${i + 1}`, 'sai-sai-sai')).status, 400);
    assert.equal((await attempt('10.0.1.1', 'mat-khau-that-123')).status, 200, 'chủ tài khoản vẫn đăng nhập được');
    /* Bộ đếm theo tài khoản đã được xoá → 25 lần sai mới (IP khác nhau) mới chạm trần. */
    for (let i = 0; i < 25; i++) assert.equal((await attempt(`10.0.2.${i + 1}`, 'sai-sai-sai')).status, 400, `lượt sai ${i + 1}`);
    const locked = await attempt('10.0.3.1', 'mat-khau-that-123');
    assert.equal(locked.status, 429, 'đã sai 25 lần từ nhiều IP → khoá tạm thời cả khi đúng mật khẩu');
  } finally {
    await env.close();
    if (previous === undefined) delete process.env.FFORUM_TRUST_PROXY;
    else process.env.FFORUM_TRUST_PROXY = previous;
  }
});

/* -------------------------------------------------------------------------- */
/* 4. Cookie phiên HttpOnly + thu hồi phiên + hạn token                          */
/* -------------------------------------------------------------------------- */

test('9. Cookie phiên: HttpOnly; Secure; SameSite=Strict chỉ khi HTTPS; dùng được thay Bearer; khác site bị từ chối', async () => {
  const env = await createTestServer();
  try {
    const email = `epic5.cookie.${Date.now()}@example.com`;
    await register(env.baseUrl, 'Người Cookie', email, 'mat-khau-cookie-1');

    const httpLogin = await post(env.baseUrl, '/api/auth/login', { email, password: 'mat-khau-cookie-1' }, null, { 'X-FForum-Session': 'cookie' });
    assert.equal(httpLogin.data.sessionTransport, 'bearer', 'HTTP thường: không đặt cookie Secure');
    assert.equal(httpLogin.res.headers.get('set-cookie'), null);

    const login = await post(env.baseUrl, '/api/auth/login', { email, password: 'mat-khau-cookie-1' }, null, {
      'X-FForum-Session': 'cookie',
      'X-Forwarded-Proto': 'https',
    });
    assert.equal(login.status, 200);
    assert.equal(login.data.sessionTransport, 'cookie');
    assert.equal(typeof login.data.expiresAt, 'number');
    const setCookie = login.res.headers.get('set-cookie') || '';
    assert.ok(setCookie.startsWith(`${SESSION_COOKIE_NAME}=`), 'tên cookie có tiền tố __Host-');
    for (const flag of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']) assert.ok(setCookie.includes(flag), `cookie phải có ${flag}`);
    assert.ok(!/Domain=/i.test(setCookie), '__Host- không được có Domain');
    const cookie = setCookie.split(';')[0];

    const viaCookie = await fetch(`${env.baseUrl}/api/auth/session`, { headers: { Cookie: cookie, 'Sec-Fetch-Site': 'same-origin' } });
    assert.equal(viaCookie.status, 200, 'cookie thay được Bearer');
    const crossSite = await fetch(`${env.baseUrl}/api/auth/session`, { headers: { Cookie: cookie, 'Sec-Fetch-Site': 'cross-site' } });
    assert.equal(crossSite.status, 401, 'request khác site không được dùng cookie (CSRF)');
    const foreignOrigin = await fetch(`${env.baseUrl}/api/auth/session`, { headers: { Cookie: cookie, Origin: 'https://evil.example' } });
    assert.equal(foreignOrigin.status, 401, 'Origin lạ không được dùng cookie');

    const logout = await post(env.baseUrl, '/api/auth/logout', {}, null, { Cookie: cookie, 'Sec-Fetch-Site': 'same-origin' });
    assert.match(logout.res.headers.get('set-cookie') || '', /Max-Age=0/, 'đăng xuất phải xoá cookie HttpOnly');

    const probe = await fetch(`${env.baseUrl}/api/auth/session?probe=1`);
    assert.equal(probe.status, 200, 'probe không làm đỏ console của khách');
    assert.equal((await probe.json()).authenticated, false);
  } finally {
    await env.close();
  }
});

test('10. WebSocket nhận phiên từ cookie khi bắt tay cùng nguồn; Origin lạ thì không (chống CSWSH)', async () => {
  const env = await createTestServer();
  const sockets = [];
  try {
    const email = `epic5.wscookie.${Date.now()}@example.com`;
    const reg = await register(env.baseUrl, 'Người WS Cookie', email, 'mat-khau-ws-cookie');
    const cookie = `${SESSION_COOKIE_NAME}=${reg.token}`;
    const same = await openWs(env.wsUrl, { Cookie: cookie, Origin: env.baseUrl });
    const evil = await openWs(env.wsUrl, { Cookie: cookie, Origin: 'https://evil.example' });
    sockets.push(same.ws, evil.ws);
    const ok = await waitFor(same.inbox, (m) => m.type === 'AUTH_OK');
    assert.ok(ok, 'bắt tay cùng nguồn được gắn phiên');
    assert.equal(ok.payload.via, 'cookie');
    assert.equal(ok.payload.email, email);
    await sleep(200);
    assert.equal(evil.inbox.some((m) => m.type === 'AUTH_OK'), false, 'Origin lạ không được gắn phiên');
  } finally {
    sockets.forEach((ws) => ws.close());
    await env.close();
  }
});

test('11. "Đăng xuất mọi thiết bị" thu hồi mọi token cũ; đăng nhập mới vẫn dùng được', async () => {
  const env = await createTestServer();
  try {
    const email = `epic5.revoke.${Date.now()}@example.com`;
    const reg = await register(env.baseUrl, 'Người Thu Hồi', email, 'mat-khau-thu-hoi-1');
    await sleep(5);
    const revoke = await post(env.baseUrl, '/api/auth/logout', { everywhere: true }, reg.token);
    assert.equal(revoke.data.revoked, true);
    const old = await fetch(`${env.baseUrl}/api/auth/session`, { headers: { Authorization: `Bearer ${reg.token}` } });
    assert.equal(old.status, 401, 'token cũ bị thu hồi');
    await sleep(5);
    const fresh = await post(env.baseUrl, '/api/auth/login', { email, password: 'mat-khau-thu-hoi-1' });
    const now = await fetch(`${env.baseUrl}/api/auth/session`, { headers: { Authorization: `Bearer ${fresh.data.token}` } });
    assert.equal(now.status, 200, 'phiên mới hợp lệ');
  } finally {
    await env.close();
  }
});

test('12. Client kiểm hạn token: giải mã exp, phát hiện hết hạn, chỉ bỏ token khi cookie đã kiểm chứng', async () => {
  const token = createSessionToken('han.dung@example.com', 'STUDENT', 60_000);
  const exp = session.decodeTokenExpiry(token);
  assert.ok(exp > Date.now() && exp <= Date.now() + 60_000, 'đọc đúng exp');
  assert.equal(session.decodeTokenExpiry('rac'), null);

  session.clearAuthToken();
  session.setAuthToken(createSessionToken('het.han@example.com', 'STUDENT', -1000));
  assert.equal(session.isSessionExpired(), true, 'token quá hạn bị phát hiện ngay ở client');
  session.setAuthToken(token);
  assert.equal(session.isSessionExpired(), false);
  assert.equal(session.canUseCookieSession(), false, 'ngoài trình duyệt HTTPS thì không xin cookie');

  const realFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true });
    assert.equal(await session.adoptSession({ token, expiresAt: exp, sessionTransport: 'cookie' }), 'cookie');
    assert.equal(session.getAuthToken(), null, 'chế độ cookie: token KHÔNG còn nằm trong localStorage');
    assert.equal(session.usesCookieSession(), true);
    assert.equal(session.getSessionExpiry(), exp);

    globalThis.fetch = async () => ({ ok: false });
    assert.equal(await session.adoptSession({ token, expiresAt: exp, sessionTransport: 'cookie' }), 'bearer', 'cookie bị chặn (vd. iframe khác site) → quay về Bearer');
    assert.equal(session.getAuthToken(), token);
  } finally {
    globalThis.fetch = realFetch;
    session.clearAuthToken();
  }
});

/* -------------------------------------------------------------------------- */
/* 5. Làm sạch đầu vào (XSS)                                                   */
/* -------------------------------------------------------------------------- */

test('13. Làm sạch đầu vào: chặn javascript:/data:text/html/SVG, ký tự điều khiển & định hướng; gradient chỉ là gradient', () => {
  assert.equal(sanitizeMediaUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeMediaUrl('JaVaScRiPt:alert(1)'), null);
  assert.equal(sanitizeMediaUrl('data:text/html;base64,PHNjcmlwdD4='), null);
  assert.equal(sanitizeMediaUrl('data:image/svg+xml;base64,PHN2Zz4='), null);
  assert.equal(sanitizeMediaUrl('https://cdn.example.com/a.png'), 'https://cdn.example.com/a.png');
  assert.equal(sanitizeMediaUrl('/media/avatars/abc.webp'), '/media/avatars/abc.webp');
  assert.equal(sanitizeMediaUrl('//evil.example/x.png'), null, 'URL không giao thức bị từ chối');
  assert.equal(sanitizeMediaUrl(`data:image/png;base64,${'A'.repeat(5000)}`), null, 'quá dài → từ chối, không cắt hỏng');

  assert.equal(sanitizePlainText('Tên\u202Egnp.exe', 50), 'Têngnp.exe', 'bỏ ký tự đảo chiều hiển thị');
  assert.equal(sanitizePlainText('a\u0000b\u0007c', 50), 'a b c');
  assert.equal(sanitizePlainText('dòng 1\ndòng 2\u0000', 50, true), 'dòng 1\ndòng 2', 'nhiều dòng giữ xuống dòng');
  assert.equal(sanitizePlainText('a < b && c > d', 50), 'a < b && c > d', 'không phá nội dung học tập — React đã escape');

  const preset = 'linear-gradient(120deg, rgba(245,158,11,0.38), rgba(167,139,250,0.28), rgba(34,211,238,0.32))';
  assert.equal(sanitizeCssGradient(preset), preset);
  assert.equal(sanitizeCssGradient('linear-gradient(red, blue); background: url(https://evil.example/x)'), null);
  assert.equal(sanitizeCssGradient('url(https://evil.example/track.png)'), null);

  const clean = sanitizeUserUpdate({ avatar: 'javascript:alert(1)', bannerUrl: '/media/banners/x.webp', name: 'A\u202EB', profileGradient: preset });
  assert.equal('avatar' in clean, false, 'avatar nguy hiểm bị bỏ, giữ ảnh cũ');
  assert.equal(clean.bannerUrl, '/media/banners/x.webp');
  assert.equal(clean.name, 'AB');
  assert.equal(clean.profileGradient, preset);
});

test('14. Mặt nạ ẩn danh: chỉ nhận mặt nạ chính thức, KHÔNG còn bị cắt hỏng ở 2000 ký tự', async () => {
  const env = await createTestServer();
  try {
    const asker = await register(env.baseUrl, 'Người Hỏi Ẩn', `epic5.anon.${Date.now()}@example.com`, 'mat-khau-an-danh-1');
    const longest = [...GHIBLI_MASKS].sort((a, b) => b.length - a.length)[0];
    assert.ok(longest.length > 2000, 'có mặt nạ dài hơn 2000 ký tự (lỗi cũ)');
    const ok = await post(env.baseUrl, '/api/questions', {
      title: 'Câu hỏi ẩn danh', content: 'Nội dung', subject: 'toan', isAnonymous: true,
      anonymousMask: longest, authorEmail: asker.user.email, authorId: asker.user.id,
    }, asker.token);
    assert.equal(ok.status, 200, JSON.stringify(ok.data));
    assert.equal(ok.data.question.authorAvatar, longest, 'mặt nạ giữ nguyên vẹn');

    const forged = await post(env.baseUrl, '/api/questions', {
      title: 'Câu hỏi ẩn danh 2', content: 'Nội dung', subject: 'toan', isAnonymous: true,
      anonymousMask: 'https://evil.example/track.png', authorEmail: asker.user.email, authorId: asker.user.id,
    }, asker.token);
    assert.equal(forged.status, 200);
    assert.ok(GHIBLI_MASKS.includes(forged.data.question.authorAvatar), 'chuỗi lạ bị thay bằng mặt nạ chính thức');
  } finally {
    await env.close();
  }
});

/* -------------------------------------------------------------------------- */
/* 6. Pipeline ảnh đại diện (sharp, 3 cỡ, cache)                                */
/* -------------------------------------------------------------------------- */

test('15. Upload ảnh: bắt buộc đăng nhập; sharp sinh thumb/medium(≥256)/original WebP; xoá EXIF; phục vụ cache immutable', async () => {
  const env = await createTestServer();
  try {
    const png = await sharp({ create: { width: 900, height: 600, channels: 3, background: { r: 210, g: 90, b: 40 } } })
      .composite([{ input: Buffer.from('<svg width="900" height="600"><circle cx="450" cy="300" r="180" fill="#123456"/></svg>') }])
      .withExif({ IFD0: { Copyright: 'GPS-co-the-lo-vi-tri' } })
      .png()
      .toBuffer();
    const dataUrl = `data:image/png;base64,${png.toString('base64')}`;

    const anonymous = await post(env.baseUrl, '/api/media/upload', { kind: 'avatar', dataUrl });
    assert.equal(anonymous.status, 401, 'khách không được tải ảnh');

    const user = await register(env.baseUrl, 'Người Ảnh', `epic5.media.${Date.now()}@example.com`, 'mat-khau-anh-123');
    const up = await post(env.baseUrl, '/api/media/upload', { kind: 'avatar', dataUrl }, user.token);
    assert.equal(up.status, 200, JSON.stringify(up.data));
    assert.equal(up.data.engine, 'sharp');
    const { thumb, medium, original } = up.data.variants;
    assert.deepEqual([thumb.width, thumb.height], [128, 128]);
    assert.ok(medium.width >= 256 && medium.width === medium.height, 'medium vuông và ≥ 256px');
    assert.equal(medium.width, 512);
    assert.deepEqual([original.width, original.height], [900, 600], 'original giữ nguyên tỷ lệ, không phóng to');
    assert.equal(up.data.url, medium.url, 'hồ sơ lưu bản medium');
    assert.ok(up.data.url.length < 200 && up.data.url.startsWith('/media/avatars/'), 'URL ngắn thay cho data URL dài');
    assert.ok(!up.data.url.includes(user.user.email), 'URL không lộ email');

    const file = await fetch(`${env.baseUrl}${medium.url}`);
    assert.equal(file.status, 200);
    assert.equal(file.headers.get('content-type'), 'image/webp');
    assert.match(file.headers.get('cache-control') || '', /immutable/);
    assert.equal(file.headers.get('x-content-type-options'), 'nosniff');
    const bytes = Buffer.from(await file.arrayBuffer());
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.format, 'webp');
    assert.equal(meta.exif, undefined, 'metadata EXIF (có thể chứa GPS) đã bị xoá');

    assert.equal((await fetch(`${env.baseUrl}/media/avatars/../../forum-data.json`)).status, 404, 'không có path traversal');
    assert.equal((await fetch(`${env.baseUrl}/media/avatars/..%2f..%2fforum-data.json`)).status, 404, 'traversal mã hoá cũng bị chặn');
    const traversal = await new Promise((resolve) => {
      /* Gửi đường dẫn thô (không qua chuẩn hoá URL của fetch). */
      const req = http.request(`${env.baseUrl}/media/avatars/../../forum-data.json`, { method: 'GET', path: '/media/avatars/../../forum-data.json' }, (res) => {
        res.resume();
        resolve(res.statusCode);
      });
      req.end();
    });
    assert.equal(traversal, 404, 'đường dẫn thô có ".." không thoát khỏi thư mục media');
    assert.equal((await fetch(`${env.baseUrl}/media/avatars/khong-ton-tai.webp`)).status, 404);

    const fake = await post(env.baseUrl, '/api/media/upload', { kind: 'avatar', dataUrl: `data:image/png;base64,${Buffer.from('<script>alert(1)</script>').toString('base64')}` }, user.token);
    assert.equal(fake.status, 400, 'nội dung không phải ảnh bị từ chối dù khai image/png');
    const tiny = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } }).png().toBuffer();
    const small = await post(env.baseUrl, '/api/media/upload', { kind: 'avatar', dataUrl: `data:image/png;base64,${tiny.toString('base64')}` }, user.token);
    assert.equal(small.status, 400, 'ảnh quá nhỏ bị từ chối');

    assert.equal(sanitizeUserUpdate({ avatar: up.data.url }).avatar, up.data.url, 'URL ảnh mới lưu được vào hồ sơ');
    assert.equal(sniffImageFormat(png), 'png');
  } finally {
    await env.close();
  }
});

test('16. Client: unsharp mask làm nét cạnh nhưng giữ nguyên vùng phẳng (không khuếch đại nhiễu)', () => {
  const w = 6;
  const h = 1;
  const px = new Uint8ClampedArray(w * h * 4);
  [40, 40, 40, 200, 200, 200].forEach((v, i) => { px.set([v, v, v, 255], i * 4); });
  const before = Array.from(px);
  unsharpMask(px, w, h, 0.35);
  assert.equal(px[0], before[0], 'vùng phẳng giữ nguyên');
  assert.ok(px[2 * 4] < before[2 * 4], 'phía tối của cạnh tối hơn');
  assert.ok(px[3 * 4] > before[3 * 4], 'phía sáng của cạnh sáng hơn');
  assert.equal(px[3], 255, 'kênh alpha không đổi');

  const pipeline = read('src/utils/imagePipeline.ts');
  assert.ok(pipeline.includes("imageSmoothingQuality = 'high'"), 'làm mịn chất lượng cao');
  assert.ok(pipeline.includes("canvas.toDataURL('image/jpeg', 0.9)"), 'xuất JPEG 0.9 như yêu cầu');
  assert.ok(read('src/components/ProfileModal.tsx').includes('uploadProcessedImage(kind'), 'hồ sơ tải ảnh qua pipeline máy chủ');
});

/* -------------------------------------------------------------------------- */
/* 7. Hiệu năng & gợi ý Potato Mode                                             */
/* -------------------------------------------------------------------------- */

test('17. Chấm điểm thiết bị: máy vẽ bằng CPU + 2 luồng → gợi ý; máy mạnh không bao giờ bị làm phiền', () => {
  const weak = scoreDeviceSignals({ webgl: true, renderer: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))', cores: 2, memoryGb: 2, saveData: false, fps: 24 });
  assert.equal(weak.tier, 'low');
  assert.ok(weak.reasons.some((r) => r.includes('CPU')), 'nêu lý do dễ hiểu');
  const strong = scoreDeviceSignals({ webgl: true, renderer: 'ANGLE (NVIDIA GeForce RTX 4070)', cores: 16, memoryGb: 8, saveData: false, fps: 144 });
  assert.equal(strong.tier, 'high');
  assert.equal(scoreDeviceSignals({ webgl: false, saveData: false, cores: 8 }).tier, 'mid', 'thiếu WebGL đơn lẻ chưa đủ kết luận máy yếu');

  const now = Date.now();
  assert.equal(shouldSuggestPotato(weak, { kind: 'none' }, false, now), true);
  assert.equal(shouldSuggestPotato(strong, { kind: 'none' }, false, now), false, 'máy mạnh: không gợi ý');
  assert.equal(shouldSuggestPotato(weak, { kind: 'none' }, true, now), false, 'đã bật Potato: không hỏi');
  assert.equal(shouldSuggestPotato(weak, { kind: 'never' }, false, now), false, '"Không hỏi lại" được tôn trọng');
  assert.equal(shouldSuggestPotato(weak, { kind: 'snoozed', until: now + 1000 }, false, now), false, '"Để sau" chưa hết hạn');
  assert.equal(shouldSuggestPotato(weak, { kind: 'snoozed', until: now - 1 }, false, now), true);
  assert.deepEqual(parsePotatoHint('never'), { kind: 'never' });
  assert.equal(POTATO_SNOOZE_MS, 3 * 24 * 60 * 60 * 1000);

  const suggestion = read('src/components/system/PotatoSuggestion.tsx');
  assert.ok(suggestion.includes("'fforum_potator_request'") && suggestion.includes('Không hỏi lại') && suggestion.includes('Để sau'), 'gợi ý có đủ 3 lựa chọn, không ép');
  assert.ok(read('src/components/Navbar.tsx').includes("addEventListener('fforum_potator_request'"), 'Navbar (nơi giữ trạng thái) nhận yêu cầu bật');
});

test('18. prefers-reduced-motion của hệ điều hành được tôn trọng khi người dùng chưa tự chọn', () => {
  const navbar = read('src/components/Navbar.tsx');
  const init = navbar.slice(navbar.indexOf('const [reducedMotion, setReducedMotion] = useState(() => {'), navbar.indexOf('const [reducedMotion, setReducedMotion] = useState(() => {') + 500);
  assert.ok(init.includes("matchMedia?.('(prefers-reduced-motion: reduce)')"), 'giá trị mặc định đọc thiết lập hệ điều hành');
  assert.ok(init.includes("saved === 'true' || saved === 'false'"), 'lựa chọn trong Cài đặt vẫn được ưu tiên');
  assert.ok(navbar.includes("query.addEventListener('change', onChange)"), 'đổi thiết lập OS khi đang mở trang được áp ngay');
  assert.match(read('src/components/system/SystemToasts.css'), /prefers-reduced-motion: reduce/);
  assert.match(read('src/components/charts/RadarSpiderChart.css'), /prefers-reduced-motion: reduce/);
});

test('19. Lazy-load: video nền chỉ giải mã khi cần, canvas dừng khi khuất, ảnh tải lười; recharts đã bị loại', () => {
  const tri = read('src/components/TriVideoCrossfadeBg.tsx');
  assert.ok(tri.includes('autoPlay={idx === currentIdx}'), 'chỉ video đang hiện tự phát');
  assert.ok(tri.includes("data-ff-idle={idx === currentIdx ? undefined : '1'}"), 'video chờ lượt được đánh dấu');
  assert.ok(read('src/App.tsx').includes("if (v.dataset.ffIdle === '1') return;"), 'App không đánh thức video chờ lượt');
  const boomerang = read('src/components/BoomerangVideoBg.tsx');
  assert.ok(boomerang.includes('new IntersectionObserver') && boomerang.includes('isActive()'), 'canvas 30fps dừng khi khuất / tab ẩn');

  const eager = new Set(['Navbar.tsx', 'LandingNav.tsx', 'ViewTransitionLoader.tsx']);
  const files = fs.readdirSync('src', { recursive: true }).filter((f) => f.endsWith('.tsx'));
  let lazy = 0;
  for (const f of files) {
    const src = read(path.join('src', f));
    for (const m of src.matchAll(/<img\b/g)) {
      const tag = src.slice(m.index, m.index + 600);
      if (eager.has(path.basename(f))) continue;
      assert.ok(/loading=/.test(tag.slice(0, tag.indexOf('/>') > 0 ? tag.indexOf('/>') : 600)), `${f}: <img> phải có loading=`);
      lazy += 1;
    }
  }
  assert.ok(lazy >= 40, 'phần lớn ảnh được tải lười');

  const pkg = JSON.parse(read('package.json'));
  assert.equal('recharts' in (pkg.dependencies || {}), false, 'recharts (~300 kB) đã được thay bằng SVG thuần');
  assert.ok('sharp' in (pkg.dependencies || {}), 'sharp cho pipeline ảnh');
  const profile = read('src/components/ProfileModal.tsx');
  assert.ok(profile.includes('<RadarSpiderChart') && !profile.includes("from 'recharts'"));
  assert.ok(read('src/components/charts/RadarSpiderChart.tsx').includes('React.memo'), 'biểu đồ được memo');
});

/* -------------------------------------------------------------------------- */
/* 8. Khoá console ở production                                                 */
/* -------------------------------------------------------------------------- */

test('20. Production: bỏ console/debugger khi build, tắt React DevTools, chặn phím DevTools; dev không bị ảnh hưởng', () => {
  const vite = read('vite.config.ts');
  assert.ok(vite.includes('dropConsole: true') && vite.includes('dropDebugger: true'), 'minifier loại console.* và debugger');
  assert.ok(vite.includes('securityBootPlugin()'));
  const plugin = read('server/forumPlugin.ts');
  assert.ok(plugin.includes("apply: 'build'") && plugin.includes("'/security-boot.js'"), 'script khởi động chỉ chèn ở bản build');
  assert.ok(plugin.includes("securityHeadersMiddleware('dev')") && plugin.includes("securityHeadersMiddleware('preview')"));
  const boot = read('public/security-boot.js');
  assert.ok(boot.includes('hook.isDisabled = true'), 'tắt cầu nối React DevTools');
  assert.ok(boot.includes('Dừng lại!'), 'cảnh báo Self-XSS');

  const app = read('src/App.tsx');
  assert.ok(app.includes('const productionGuard = import.meta.env.PROD;'), 'lớp chặn chỉ bật ở production');
  assert.ok(app.includes('useConsoleProtection(productionGuard)') && app.includes('useRightClickBlock(productionGuard)') && app.includes('useDevToolsDetection(productionGuard)'));
  const main = read('src/main.tsx');
  assert.ok(!main.includes('console.error = noop') && !main.includes("alert('BroAmStuck Studio"), 'bỏ lớp khoá cũ chạy cả ở dev + alert() chặn màn hình');

  assert.equal(isDevtoolsShortcut({ key: 'F12', code: 'F12' }), true);
  assert.equal(isDevtoolsShortcut({ key: 'I', code: 'KeyI', ctrlKey: true, shiftKey: true }), true);
  assert.equal(isDevtoolsShortcut({ key: 'ˆ', code: 'KeyJ', metaKey: true, altKey: true }), true, 'Cmd+Opt+J trên Mac (Option sinh ký tự lạ)');
  assert.equal(isDevtoolsShortcut({ key: 'u', code: 'KeyU', ctrlKey: true }), true, 'Ctrl+U xem nguồn');
  assert.equal(isDevtoolsShortcut({ key: 'c', code: 'KeyC', ctrlKey: true }), false, 'Ctrl+C sao chép không bị chặn');

  const base = { innerWidth: 1600, innerHeight: 900, outerWidth: 1600, outerHeight: 1000, dpr: 1 };
  assert.equal(isLikelyDevtoolsResize(base, { ...base, innerWidth: 1100 }), true, 'DevTools dock bên phải');
  assert.equal(isLikelyDevtoolsResize(base, { ...base, innerWidth: 1280, dpr: 1.25 }), false, 'zoom không phải DevTools');
  assert.equal(isLikelyDevtoolsResize(base, { ...base, innerWidth: 900, outerWidth: 900 }), false, 'thu nhỏ cửa sổ không phải DevTools');
});

test('21. Form tố cáo báo lỗi THẬT (không còn báo "đã tiếp nhận" khi thất bại) và gửi kèm phiên', () => {
  assert.equal(describeReportResult(null).ok, false);
  assert.match(describeReportResult(null).message, /CHƯA được gửi/);
  assert.equal(describeReportResult({ status: 401, data: {} }).needsLogin, true);
  assert.equal(describeReportResult({ status: 200, data: { success: true, message: 'ok' } }).ok, true);
  for (const f of ['src/components/ChatDock.tsx', 'src/components/ProfileDropdown.tsx', 'src/components/views/ChatView.tsx', 'src/components/views/QAForumView.tsx', 'src/components/ProfileModal.tsx']) {
    const src = read(f);
    assert.ok(src.includes("postJson('/api/reports'"), `${f}: gửi kèm xác thực`);
    assert.ok(!/reporterEmail:/.test(src), `${f}: không tự khai danh tính người tố cáo`);
    assert.ok(src.includes('setReportErrorMsg(outcome.message)'), `${f}: hiện lỗi thật`);
  }
});
