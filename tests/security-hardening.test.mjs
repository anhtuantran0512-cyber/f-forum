import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';

/* Mỗi tệp test chạy trong một tiến trình riêng và cùng ghi `data/forum-data.json`.
   Chốt thư mục dữ liệu riêng TRƯỚC khi nạp module máy chủ để các khẳng định
   đọc tệp bên dưới không bị tiến trình khác ghi đè. */
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fforum-sec-'));
process.env.FFORUM_DATA_DIR = DATA_DIR;

const { setupForumServer } = await import('../server/forumServer.ts');
const {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  sanitizeUserUpdate,
  solverAwardFor,
  normalizeBounty,
  SlidingWindowRateLimiter,
} = await import('../server/authGuard.ts');
const { setProviderLookupForTest } = await import('../server/socialAuth.ts');

/* ==========================================================================
   Kiểm thử lớp bảo mật & toàn vẹn dữ liệu (server/authGuard + forumServer)
   Mọi khẳng định dưới đây chạy trên MÁY CHỦ THẬT qua HTTP/WebSocket.
   ========================================================================== */

const DATA_FILE = path.join(DATA_DIR, 'forum-data.json');

function createTestServer() {
  const middlewares = [];
  const middlewareRunner = { use(fn) { middlewares.push(fn); } };

  const server = http.createServer((req, res) => {
    let index = 0;
    function next() {
      if (index < middlewares.length) middlewares[index++](req, res, next);
      else { res.statusCode = 404; res.end('Not Found'); }
    }
    next();
  });

  setupForumServer(server, middlewareRunner);

  /* server.close() chờ mọi socket đóng. Nếu một assertion fail giữa chừng thì
     WebSocket vẫn mở và cả bộ test sẽ treo — nên tự dọn socket khi đóng. */
  const sockets = new Set();
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({
        server,
        port,
        baseUrl: `http://127.0.0.1:${port}`,
        wsUrl: `ws://127.0.0.1:${port}/ws`,
        close: () =>
          new Promise((res) => {
            server.close(res);
            for (const socket of sockets) socket.destroy();
            sockets.clear();
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

const get = async (baseUrl, url) => {
  const res = await fetch(`${baseUrl}${url}`);
  return { status: res.status, data: await res.json().catch(() => null) };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const register = async (baseUrl, name, email, password) => {
  const out = await post(baseUrl, '/api/auth/register', { name, email, password });
  assert.equal(out.status, 200, `register ${email} phải thành công: ${JSON.stringify(out.data)}`);
  return out.data;
};

/** Kết nối WS, tuỳ chọn xác thực, trả về socket + hàng đợi thông báo. */
function connectWs(wsUrl, token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const inbox = [];
    const waiters = [];

    ws.on('message', (raw) => {
      try {
        const parsed = JSON.parse(raw.toString());
        const waiter = waiters.find((w) => w.type === parsed.type);
        if (waiter) {
          waiters.splice(waiters.indexOf(waiter), 1);
          waiter.resolve(parsed);
        } else {
          inbox.push(parsed);
        }
      } catch { /* ignore */ }
    });

    const waitFor = (type, timeoutMs = 1500) =>
      new Promise((res, rej) => {
        const hit = inbox.find((m) => m.type === type);
        if (hit) { inbox.splice(inbox.indexOf(hit), 1); res(hit); return; }
        const timer = setTimeout(() => rej(new Error(`timeout chờ ${type}`)), timeoutMs);
        waiters.push({
          type,
          resolve: (msg) => { clearTimeout(timer); res(msg); },
        });
      });

    ws.on('error', reject);
    ws.on('open', async () => {
      if (token) {
        ws.send(JSON.stringify({ type: 'AUTH', payload: { token } }));
        try {
          await waitFor('AUTH_OK');
        } catch (err) {
          reject(err);
          return;
        }
      }
      resolve({ ws, send: (type, payload) => ws.send(JSON.stringify({ type, payload })), waitFor, inbox });
    });
  });
}

/* -------------------------------------------------------------------------- */
/* 1. Đơn vị: hàm băm mật khẩu và token                                       */
/* -------------------------------------------------------------------------- */

test('1. Mật khẩu được băm scrypt — không thể đọc ngược, sai mật khẩu là trượt', () => {
  const record = hashPassword('mat-khau-bi-mat-123');

  assert.ok(record.startsWith('scrypt$'), 'Bản ghi phải ở dạng scrypt$<salt>$<hash>');
  assert.ok(!record.includes('mat-khau-bi-mat-123'), 'Mật khẩu thô không được xuất hiện trong bản băm');
  assert.notEqual(hashPassword('mat-khau-bi-mat-123'), record, 'Mỗi lần băm phải dùng salt khác nhau');

  assert.equal(verifyPassword('mat-khau-bi-mat-123', record).ok, true, 'Đúng mật khẩu phải khớp');
  assert.equal(verifyPassword('sai-mat-khau', record).ok, false, 'Sai mật khẩu phải trượt');
  assert.equal(verifyPassword('', record).ok, false, 'Mật khẩu rỗng phải trượt');

  /* LỖ HỔNG GỐC: không có bản ghi mật khẩu thì không được cho qua. */
  assert.equal(verifyPassword('bat-ky', undefined).ok, false, 'Thiếu bản ghi mật khẩu = từ chối');
  assert.equal(verifyPassword('bat-ky', '').ok, false, 'Bản ghi mật khẩu rỗng = từ chối');

  /* Tương thích ngược: dữ liệu plaintext cũ vẫn đăng nhập được và được báo cần băm lại. */
  const legacy = verifyPassword('admin123', 'admin123');
  assert.equal(legacy.ok, true, 'Mật khẩu plaintext cũ vẫn khớp');
  assert.equal(legacy.needsRehash, true, 'Bản ghi plaintext phải được đánh dấu để băm lại');
  assert.equal(verifyPassword('khac', 'admin123').ok, false, 'Plaintext sai vẫn trượt');
});

test('2. Token phiên có chữ ký HMAC — sửa một ký tự là vô hiệu', () => {
  const token = createSessionToken('Hoc.Sinh@Example.com', 'STUDENT');

  assert.ok(token.startsWith('f_token_'), 'Giữ tiền tố f_token_ để tương thích client cũ');
  const claims = verifySessionToken(token);
  assert.ok(claims, 'Token hợp lệ phải xác minh được');
  assert.equal(claims.email, 'hoc.sinh@example.com', 'Email trong token luôn ở dạng chữ thường');
  assert.equal(claims.role, 'STUDENT');
  assert.ok(claims.exp > Date.now(), 'Token phải có hạn dùng');

  /* Giả mạo: đổi nội dung nhưng giữ chữ ký cũ. */
  const [, bodyPart, sigPart] = token.match(/^f_token_([^.]+)\.(.+)$/) || [];
  const forgedBody = Buffer.from(
    JSON.stringify({ email: 'anhtuantran0512@gmail.com', role: 'SUPER_ADMIN', iat: Date.now(), exp: Date.now() + 99999 }),
    'utf8',
  ).toString('base64url');
  assert.equal(verifySessionToken(`f_token_${forgedBody}.${sigPart}`), null, 'Đổi nội dung phải mất hiệu lực');

  /* Đổi chữ ký. */
  assert.equal(verifySessionToken(`f_token_${bodyPart}.AAAA`), null, 'Chữ ký sai phải bị từ chối');
  assert.equal(verifySessionToken('f_token_179110_abc'), null, 'Token dạng cũ (không chữ ký) phải bị từ chối');
  assert.equal(verifySessionToken(''), null);
  assert.equal(verifySessionToken(null), null);
  assert.equal(verifySessionToken(undefined), null);

  /* Hết hạn. */
  const expired = createSessionToken('a@b.co', 'STUDENT', -1000);
  assert.equal(verifySessionToken(expired), null, 'Token hết hạn phải bị từ chối');
});

test('3. sanitizeUserUpdate chặn tự phong quyền và kẹp giá trị vô lý', () => {
  const clean = sanitizeUserUpdate({
    name: 'Đổi Tên Hợp Lệ',
    role: 'SUPER_ADMIN',
    id: 'user-hacker',
    email: 'khac@gmail.com',
    coin: 99999999999,
    xp: -500,
    level: 999,
    bio: 'x'.repeat(30000),
    inventory: ['a', 'a', 'b'],
    hacked: { nested: true },
  });

  assert.equal(clean.name, 'Đổi Tên Hợp Lệ', 'Trường hồ sơ bình thường vẫn đi qua');
  assert.equal('role' in clean, false, 'role là của server — client không ghi được');
  assert.equal('id' in clean, false, 'id là của server');
  assert.equal('email' in clean, false, 'email là của server');
  assert.equal(clean.coin, 10000000, 'coin phải bị kẹp về trần hợp lý');
  assert.equal(clean.xp, 0, 'xp âm phải về 0');
  assert.equal(clean.level, 150, 'level phải bị kẹp về 1..150');
  assert.ok(clean.bio.length <= 20000, 'chuỗi quá dài phải bị cắt');
  assert.deepEqual(clean.inventory, ['a', 'b'], 'inventory phải khử trùng lặp');
  assert.equal('hacked' in clean, false, 'object lạ không được ghi vào bản ghi');
  assert.deepEqual(sanitizeUserUpdate(null), {}, 'payload null → rỗng');
  assert.deepEqual(sanitizeUserUpdate('chuỗi'), {}, 'payload sai kiểu → rỗng');
});

test('4. Công thức thưởng & chặn ghi: nhất quán giữa hai đường HTTP và WS', () => {
  assert.equal(solverAwardFor(20), 110, '20 coin cược → 10 + 100 danh dự');
  assert.equal(solverAwardFor(100), 150, '100 coin cược → 50 + 100 danh dự');
  assert.equal(solverAwardFor(0), 100, 'Không cược vẫn có 100 coin danh dự');
  assert.equal(normalizeBounty(undefined), 20, 'Mặc định 20 coin');
  assert.equal(normalizeBounty(5), 10, 'Dưới sàn bị nâng lên 10');
  assert.equal(normalizeBounty(5000), 100, 'Vượt trần bị kẹp về 100');

  const limiter = new SlidingWindowRateLimiter(1000, 3);
  const now = 1000;
  assert.equal(limiter.check('k', now).allowed, true);
  assert.equal(limiter.check('k', now + 1).allowed, true);
  assert.equal(limiter.check('k', now + 2).allowed, true);
  const blocked = limiter.check('k', now + 3);
  assert.equal(blocked.allowed, false, 'Vượt ngưỡng phải bị chặn');
  assert.ok(blocked.retryAfterMs > 0, 'Phải báo thời gian chờ');
  assert.equal(limiter.check('k', now + 1001).allowed, true, 'Hết cửa sổ thì được phép lại');
});

/* -------------------------------------------------------------------------- */
/* 2. Tích hợp: các lỗ hổng đã vá                                            */
/* -------------------------------------------------------------------------- */

test('5. LỖ HỔNG ĐĂNG NHẬP: tài khoản social không còn bị chiếm bằng mật khẩu bất kỳ', async () => {
  const env = await createTestServer();
  try {
    /* Tài khoản tạo qua Google/Facebook KHÔNG có bản ghi mật khẩu. */
    const social = await post(env.baseUrl, '/api/auth/social', {
      provider: 'google',
      name: 'Người Bị Hại',
      email: 'victim.social@example.com',
    });
    assert.equal(social.status, 200);
    assert.equal(social.data.user.email, 'victim.social@example.com');

    /* Trước khi vá: lệnh này trả 200 + token hợp lệ. */
    const takeover = await post(env.baseUrl, '/api/auth/login', {
      email: 'victim.social@example.com',
      password: 'khong-can-dung-mat-khau',
    });
    assert.equal(takeover.status, 400, 'Không có mật khẩu thì không được đăng nhập bằng form');
    assert.equal(takeover.data.success, false);
    assert.equal(takeover.data.token, undefined, 'Không được cấp token');
    assert.ok(/Google\/Facebook/.test(takeover.data.message), 'Phải hướng người dùng sang đăng nhập social');

    /* Tài khoản có mật khẩu thì vẫn đăng nhập bình thường. */
    await register(env.baseUrl, 'Học Sinh Mật Khẩu', 'password.user@example.com', 'mat-khau-dung-123');
    const wrongPass = await post(env.baseUrl, '/api/auth/login', {
      email: 'password.user@example.com',
      password: 'mat-khau-sai',
    });
    assert.equal(wrongPass.status, 400);
    assert.ok(/Mật khẩu không chính xác/.test(wrongPass.data.message));

    const goodLogin = await post(env.baseUrl, '/api/auth/login', {
      email: 'password.user@example.com',
      password: 'mat-khau-dung-123',
    });
    assert.equal(goodLogin.status, 200, 'Mật khẩu đúng vẫn đăng nhập được');
    assert.ok(goodLogin.data.token.startsWith('f_token_'));
  } finally {
    await env.close();
  }
});

test('6. Mật khẩu không còn nằm plaintext trong data/forum-data.json', async () => {
  const env = await createTestServer();
  try {
    const uniqueEmail = `hashtest.${Date.now()}@example.com`;
    const plainPassword = 'MatKhauRoRang123';
    await register(env.baseUrl, 'Kiểm Tra Băm', uniqueEmail, plainPassword);

    /* persistStoreToDisk debounce 200ms. */
    await sleep(500);
    assert.ok(fs.existsSync(DATA_FILE), 'Máy chủ phải ghi dữ liệu ra đĩa');

    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const record = saved.passwords?.[uniqueEmail];
    assert.ok(record, 'Phải có bản ghi mật khẩu cho tài khoản vừa đăng ký');
    assert.ok(record.startsWith('scrypt$'), `Mật khẩu phải được băm, thực nhận: ${String(record).slice(0, 24)}...`);
    assert.ok(!record.includes(plainPassword), 'Mật khẩu thô không được xuất hiện trong tệp dữ liệu');
    assert.ok(
      !JSON.stringify(saved.passwords).includes(plainPassword),
      'Không bản ghi nào trong tệp được chứa mật khẩu thô',
    );
  } finally {
    await env.close();
  }
});

test('7. LỖ HỔNG WS: client lạ không thể tự phong SUPER_ADMIN qua SYNC_USER', async () => {
  const env = await createTestServer();
  try {
    const client = await connectWs(env.wsUrl);
    try {
    client.send('SYNC_USER', {
      id: 'user-hacker',
      name: 'Hacker',
      email: 'hacker.ws@example.com',
      role: 'SUPER_ADMIN',
      level: 150,
      xp: 45000,
      coin: 9999999,
      avatar: '',
      bio: '',
      scopedClubIds: [],
    });

    const denied = await client.waitFor('FORBIDDEN');
    assert.equal(denied.payload.action, 'SYNC_USER', 'Phải trả FORBIDDEN cho client chưa xác thực');

    const sync = await get(env.baseUrl, '/api/sync');
    assert.equal(sync.data.data.users['hacker.ws@example.com'], undefined, 'Tài khoản giả không được tạo');
    } finally {
      client.ws.close();
    }
  } finally {
    await env.close();
  }
});

test('8. WS AUTH hợp lệ: sửa được hồ sơ của chính mình nhưng KHÔNG đổi được role', async () => {
  const env = await createTestServer();
  try {
    const account = await register(env.baseUrl, 'Chủ Tài Khoản', 'ws.owner@example.com', 'mat-khau-chu-123');

    const client = await connectWs(env.wsUrl, account.token);
    try {
    client.send('SYNC_USER', {
      email: 'ws.owner@example.com',
      name: 'Đã Đổi Tên',
      bio: 'Tiểu sử mới',
      role: 'SUPER_ADMIN',
      coin: 5000,
    });

    await sleep(250);
    const sync = await get(env.baseUrl, '/api/sync');
    const saved = sync.data.data.users['ws.owner@example.com'];

    assert.equal(saved.name, 'Đã Đổi Tên', 'Chủ tài khoản sửa được tên của mình');
    assert.equal(saved.bio, 'Tiểu sử mới', 'Chủ tài khoản sửa được tiểu sử');
    assert.equal(saved.role, 'STUDENT', 'role phải do server quyết định, không theo payload');
    assert.equal(saved.coin, 5000, 'coin của chính mình vẫn cập nhật được');

    /* Token của người này không dùng để sửa hồ sơ người khác được. */
    client.send('SYNC_USER', { email: 'anhtuantran0512@gmail.com', name: 'Bị Chiếm' });
    const denied = await client.waitFor('FORBIDDEN');
    assert.equal(denied.payload.action, 'SYNC_USER');

    await sleep(150);
    const after = await get(env.baseUrl, '/api/sync');
    assert.equal(after.data.data.users['anhtuantran0512@gmail.com'].name, 'Trần Văn Anh Tuấn');
    } finally {
      client.ws.close();
    }
  } finally {
    await env.close();
  }
});

test('9. MARK_BEST_SOLUTION: phải có quyền, và gọi lại không phát thưởng lần hai', async () => {
  const env = await createTestServer();
  try {
    const asker = await register(env.baseUrl, 'Người Hỏi', 'best.asker@example.com', 'mat-khau-hoi-123');
    const solver = await register(env.baseUrl, 'Người Giải', 'best.solver@example.com', 'mat-khau-giai-123');

    const question = await post(env.baseUrl, '/api/questions', {
      title: 'Chứng minh bất đẳng thức Cauchy-Schwarz',
      content: 'Cho dãy số thực, chứng minh BĐT.',
      subject: 'toan',
      authorId: asker.user.id,
      authorName: asker.user.name,
      authorEmail: 'best.asker@example.com',
      bountyCoin: 40,
    }, asker.token);
    assert.equal(question.status, 200, `đăng câu hỏi: ${JSON.stringify(question.data)}`);

    const solution = await post(env.baseUrl, '/api/solutions', {
      questionId: question.data.question.id,
      content: 'Dùng tích vô hướng của hai vector.',
      authorId: solver.user.id,
      authorName: solver.user.name,
      authorEmail: 'best.solver@example.com',
    }, solver.token);
    assert.equal(solution.status, 200, `gửi lời giải: ${JSON.stringify(solution.data)}`);

    /* 9.1 Client chưa xác thực không chọn được đáp án chuẩn. */
    const stranger = await connectWs(env.wsUrl);
    try {
      stranger.send('MARK_BEST_SOLUTION', { questionId: question.data.question.id, solutionId: solution.data.solution.id });
      const denied = await stranger.waitFor('FORBIDDEN');
      assert.equal(denied.payload.action, 'MARK_BEST_SOLUTION');
    } finally {
      stranger.ws.close();
    }

    let sync = await get(env.baseUrl, '/api/sync');
    assert.equal(sync.data.data.users['best.solver@example.com'].coin, 100, 'Chưa xác thực thì chưa phát thưởng');

    /* 9.2 Chính chủ câu hỏi chọn đáp án → thưởng đúng một lần. */
    const owner = await connectWs(env.wsUrl, asker.token);
    try {
    const payload = { questionId: question.data.question.id, solutionId: solution.data.solution.id };
    owner.send('MARK_BEST_SOLUTION', payload);
    await sleep(250);

    sync = await get(env.baseUrl, '/api/sync');
    const coinAfterFirst = sync.data.data.users['best.solver@example.com'].coin;
    assert.equal(coinAfterFirst, 100 + solverAwardFor(40), '40 coin cược → +120 coin');

    /* 9.3 Phát lại đúng lệnh đó 4 lần nữa → không được cộng thêm. */
    for (let i = 0; i < 4; i++) owner.send('MARK_BEST_SOLUTION', payload);
    await sleep(350);

    sync = await get(env.baseUrl, '/api/sync');
    assert.equal(
      sync.data.data.users['best.solver@example.com'].coin,
      coinAfterFirst,
      'Chọn lại đáp án cũ không được phát thưởng lần hai',
    );

    const marked = sync.data.data.questions.find((q) => q.id === question.data.question.id);
    assert.equal(marked.bestSolutionId, solution.data.solution.id);
    assert.equal(marked.isSolved, true);
    } finally {
      owner.ws.close();
    }
  } finally {
    await env.close();
  }
});

test('10. Tiền thưởng: không đủ Coin thì không treo thưởng được (hết đường in tiền)', async () => {
  const env = await createTestServer();
  try {
    const account = await register(env.baseUrl, 'Người Hỏi Nghèo', 'bounty.poor@example.com', 'mat-khau-ngheo-1');
    assert.equal(account.user.coin, 100, 'Tài khoản mới có 100 Coin');

    const first = await post(env.baseUrl, '/api/questions', {
      title: 'Câu hỏi treo thưởng tối đa',
      content: 'Nội dung câu hỏi thứ nhất.',
      authorEmail: 'bounty.poor@example.com',
      bountyCoin: 100,
    }, account.token);
    assert.equal(first.status, 200);

    let sync = await get(env.baseUrl, '/api/sync');
    assert.equal(sync.data.data.users['bounty.poor@example.com'].coin, 0, '100 - 100 = 0 Coin');

    /* Trước khi vá: câu thứ hai vẫn được tạo, coin bị kẹp về 0 → thưởng miễn phí. */
    const second = await post(env.baseUrl, '/api/questions', {
      title: 'Câu hỏi treo thưởng khi đã hết tiền',
      content: 'Nội dung câu hỏi thứ hai.',
      authorEmail: 'bounty.poor@example.com',
      bountyCoin: 100,
    }, account.token);
    assert.equal(second.status, 402, 'Hết Coin phải bị từ chối');
    assert.ok(/Số dư không đủ/.test(second.data.message));

    sync = await get(env.baseUrl, '/api/sync');
    assert.equal(
      sync.data.data.questions.filter((q) => q.authorEmail === 'bounty.poor@example.com').length,
      1,
      'Câu hỏi bị từ chối không được ghi vào kho',
    );

    /* Không có token → không treo thưởng được. */
    const anonymous = await post(env.baseUrl, '/api/questions', {
      title: 'Khách ẩn danh treo thưởng',
      content: 'Nội dung câu hỏi của khách.',
      authorEmail: 'bounty.poor@example.com',
      bountyCoin: 100,
    });
    assert.equal(anonymous.status, 401, 'Phải đăng nhập mới treo thưởng được');

    /* Khách không khai tài khoản → câu hỏi vẫn tạo được nhưng thưởng = 0. */
    const guest = await post(env.baseUrl, '/api/questions', {
      title: 'Câu hỏi của khách vãng lai',
      content: 'Nội dung câu hỏi khách vãng lai.',
      authorEmail: 'khong.ton.tai@example.com',
      bountyCoin: 100,
    });
    assert.equal(guest.status, 200);
    assert.equal(guest.data.question.bountyCoin, 0, 'Email chưa đăng ký không được treo thưởng miễn phí');
  } finally {
    await env.close();
  }
});

test('11. LỖ HỔNG SOCIAL: không thể tự khai email admin để lấy quyền SUPER_ADMIN', async () => {
  const env = await createTestServer();
  try {
    /* Trước khi vá: một lệnh POST này trả về token SUPER_ADMIN. */
    const takeover = await post(env.baseUrl, '/api/auth/social', {
      provider: 'facebook',
      name: 'Kẻ Giả Mạo',
      email: 'anhtuantran0512@gmail.com',
    });
    assert.equal(takeover.status, 403, 'Khai email admin mà không xác minh được thì phải bị chặn');
    assert.equal(takeover.data.token, undefined, 'Không được cấp token quản trị');
    assert.ok(/xác minh/.test(takeover.data.message));

    /* Viết hoa để lách bộ lọc so khớp chuỗi cũng vô ích. */
    const uppercase = await post(env.baseUrl, '/api/auth/social', {
      provider: 'google',
      name: 'Kẻ Giả Mạo',
      email: 'ANHTUANTRAN0512@GMAIL.COM',
    });
    assert.equal(uppercase.status, 403, 'Email viết hoa vẫn bị chặn');

    /* Token giả cũng không cứu được. */
    const withFakeToken = await post(env.baseUrl, '/api/auth/social', {
      provider: 'google',
      name: 'Kẻ Giả Mạo',
      email: 'anhtuantran0512@gmail.com',
      accessToken: 'ya29.gia-mao-khong-co-that',
    });
    assert.equal(withFakeToken.status, 403, 'Access token không xác minh được vẫn bị chặn');

    /* Khi nhà cung cấp xác nhận đúng email đó → mới được vào. */
    const restore = setProviderLookupForTest('google', async (accessToken) =>
      accessToken === 'ya29.token-that' ? { email: 'anhtuantran0512@gmail.com' } : null,
    );
    try {
      const verified = await post(env.baseUrl, '/api/auth/social', {
        provider: 'google',
        name: 'Trần Anh Tuấn',
        email: 'anhtuantran0512@gmail.com',
        accessToken: 'ya29.token-that',
      });
      assert.equal(verified.status, 200, 'Xác minh thành công thì đăng nhập được');
      assert.equal(verified.data.user.role, 'SUPER_ADMIN');
      assert.equal(verified.data.user.level, 150);
    } finally {
      restore();
    }

    /* Nhà cung cấp trả về email KHÁC với email khai → vẫn chặn. */
    const restore2 = setProviderLookupForTest('google', async () => ({ email: 'nguoi.khac@gmail.com' }));
    try {
      const mismatch = await post(env.baseUrl, '/api/auth/social', {
        provider: 'google',
        name: 'Kẻ Giả Mạo',
        email: 'anhtuantran0512@gmail.com',
        accessToken: 'ya29.token-that',
      });
      assert.equal(mismatch.status, 403, 'Email nhà cung cấp trả về phải khớp email khai báo');
    } finally {
      restore2();
    }
  } finally {
    await env.close();
  }
});

test('12. API quản trị: chỉ adminEmail trong body là chưa đủ — phải có token thật', async () => {
  const env = await createTestServer();
  try {
    const about = await get(env.baseUrl, '/api/admin/about');
    assert.equal(about.status, 200);
    const initial = about.data.about || about.data;

    /* Trước khi vá: chỉ cần gõ đúng chuỗi email admin là ghi đè được. */
    const spoofed = await post(env.baseUrl, '/api/admin/about', {
      adminEmail: 'anhtuantran0512@gmail.com',
      aboutData: { ...initial, headline: 'Bị Chiếm Quyền' },
    });
    assert.equal(spoofed.status, 403, 'Khai adminEmail mà không có token phải bị chặn');

    const student = await register(env.baseUrl, 'Học Sinh', 'admin.probe@example.com', 'mat-khau-probe-1');
    const studentAttempt = await post(env.baseUrl, '/api/admin/about', {
      adminEmail: 'anhtuantran0512@gmail.com',
      aboutData: { ...initial, headline: 'Học Sinh Leo Quyền' },
    }, student.token);
    assert.equal(studentAttempt.status, 403, 'Token của học sinh không mở được cổng admin');

    /* Admin thật: đăng nhập bằng mật khẩu để lấy token hợp lệ. */
    const adminLogin = await post(env.baseUrl, '/api/auth/login', {
      email: 'anhtuantran0512@gmail.com',
      password: 'admin123',
    });
    assert.equal(adminLogin.status, 200, `admin login: ${JSON.stringify(adminLogin.data)}`);

    const legit = await post(env.baseUrl, '/api/admin/about', {
      adminEmail: 'anhtuantran0512@gmail.com',
      aboutData: { ...initial, headline: 'Cập Nhật Hợp Lệ Từ Admin' },
    }, adminLogin.data.token);
    assert.equal(legit.status, 200, 'Admin có token hợp lệ vẫn cập nhật được');
    assert.equal(legit.data.headline, 'Cập Nhật Hợp Lệ Từ Admin');

    /* Các cổng kiểm duyệt khác cũng theo cùng một luật. */
    const question = await post(env.baseUrl, '/api/questions', {
      title: 'Bài viết để kiểm tra kiểm duyệt',
      content: 'Nội dung bài viết kiểm duyệt.',
      authorEmail: 'admin.probe@example.com',
      bountyCoin: 10,
    }, student.token);
    assert.equal(question.status, 200);

    const noTokenDelete = await post(env.baseUrl, '/api/questions/delete', {
      questionId: question.data.question.id,
      adminEmail: 'anhtuantran0512@gmail.com',
    });
    assert.equal(noTokenDelete.status, 403, 'Xóa bài mà không có token phải bị chặn');

    const withTokenDelete = await post(env.baseUrl, '/api/questions/delete', {
      questionId: question.data.question.id,
      adminEmail: 'anhtuantran0512@gmail.com',
    }, adminLogin.data.token);
    assert.equal(withTokenDelete.status, 200, 'Admin có token thì xóa được');
  } finally {
    await env.close();
  }
});

test('13. /api/users/update: phải là chính chủ, và role/id/email không ghi đè được', async () => {
  const env = await createTestServer();
  try {
    const account = await register(env.baseUrl, 'Người Sửa Hồ Sơ', 'profile.edit@example.com', 'mat-khau-sua-123');

    const anonymous = await post(env.baseUrl, '/api/users/update', {
      email: 'profile.edit@example.com',
      updates: { name: 'Bị Sửa Lậu', role: 'SUPER_ADMIN' },
    });
    assert.equal(anonymous.status, 401, 'Không có token thì không sửa được hồ sơ');

    const other = await register(env.baseUrl, 'Người Khác', 'profile.other@example.com', 'mat-khau-khac-123');
    const crossAccount = await post(env.baseUrl, '/api/users/update', {
      email: 'profile.edit@example.com',
      updates: { name: 'Bị Sửa Lậu' },
    }, other.token);
    assert.equal(crossAccount.status, 401, 'Token của người khác không sửa được hồ sơ này');

    const selfUpdate = await post(env.baseUrl, '/api/users/update', {
      email: 'profile.edit@example.com',
      updates: { name: 'Tên Mới Chính Chủ', role: 'SUPER_ADMIN', id: 'user-gia-mao', city: 'Đà Nẵng' },
    }, account.token);
    assert.equal(selfUpdate.status, 200);
    assert.equal(selfUpdate.data.user.name, 'Tên Mới Chính Chủ', 'Sửa hồ sơ của mình vẫn hoạt động');
    assert.equal(selfUpdate.data.user.city, 'Đà Nẵng');
    assert.equal(selfUpdate.data.user.role, 'STUDENT', 'role không được ghi đè từ client');
    assert.equal(selfUpdate.data.user.id, account.user.id, 'id không được ghi đè từ client');
    assert.equal(selfUpdate.data.user.email, 'profile.edit@example.com', 'email không được ghi đè');
  } finally {
    await env.close();
  }
});

test('14. Chặn brute-force: quá nhiều lượt đăng nhập sai sẽ nhận 429', async () => {
  const env = await createTestServer();
  try {
    await register(env.baseUrl, 'Mục Tiêu', 'brute.target@example.com', 'mat-khau-that-123');

    let sawTooMany = false;
    let retryAfterHeader = null;
    for (let i = 0; i < 16; i++) {
      const res = await fetch(`${env.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'brute.target@example.com', password: `sai-${i}` }),
      });
      if (res.status === 429) {
        sawTooMany = true;
        retryAfterHeader = res.headers.get('Retry-After');
        break;
      }
      assert.equal(res.status, 400, 'Mật khẩu sai phải trả 400 cho tới khi bị chặn');
    }

    assert.ok(sawTooMany, 'Phải chặn sau một số lượt thử nhất định');
    assert.ok(retryAfterHeader && Number(retryAfterHeader) > 0, 'Phải kèm header Retry-After');
  } finally {
    await env.close();
  }
});

test('15. Rò rỉ timer SSE đã được dọn: ngắt kết nối là bộ đếm giảm về 0', async () => {
  const env = await createTestServer();
  try {
    const health = await get(env.baseUrl, '/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.data.status, 'ok');
    assert.ok(typeof health.data.counts.users === 'number', '/api/health phải báo số tài khoản');
    const baseline = health.data.connections.sse;

    const controller = new AbortController();
    const stream = fetch(`${env.baseUrl}/api/events`, { signal: controller.signal });
    const reader = (await stream).body.getReader();
    await reader.read(); /* đọc gói CONNECTED đầu tiên */

    let open = await get(env.baseUrl, '/api/health');
    assert.equal(open.data.connections.sse, baseline + 1, 'Kết nối SSE phải được đếm');

    controller.abort();
    try { await reader.cancel(); } catch { /* ignore */ }
    await sleep(300);

    const closed = await get(env.baseUrl, '/api/health');
    assert.equal(closed.data.connections.sse, baseline, 'Ngắt kết nối phải dọn ngay, không rò timer');
  } finally {
    await env.close();
  }
});

test('16. Phát lại nội dung qua WS không nhân đôi bản ghi, không tự cộng XP', async () => {
  const env = await createTestServer();
  try {
    const account = await register(env.baseUrl, 'Người Đăng', 'relay.author@example.com', 'mat-khau-relay-1');
    const client = await connectWs(env.wsUrl, account.token);
    try {
    const payload = {
      id: 'q-relay-cung-id',
      title: 'Câu hỏi phát lại',
      content: 'Nội dung',
      authorEmail: 'relay.author@example.com',
    };
    for (let i = 0; i < 5; i++) client.send('NEW_QUESTION', payload);
    await sleep(300);

    const sync = await get(env.baseUrl, '/api/sync');
    const copies = sync.data.data.questions.filter((q) => q.id === 'q-relay-cung-id').length;
    assert.equal(copies, 1, 'Cùng một id chỉ được ghi một lần');
    assert.equal(
      sync.data.data.users['relay.author@example.com'].xp,
      0,
      'Đường WS chỉ chuyển tiếp nội dung — XP do đường HTTP đã kiểm soát cấp',
    );
    } finally {
      client.ws.close();
    }
  } finally {
    await env.close();
  }
});

/* -------------------------------------------------------------------------- */
/* 3. Toàn vẹn phía client                                                    */
/* -------------------------------------------------------------------------- */

test('17. addXP: state updater phải thuần — không còn fetch/toast/âm thanh bên trong', () => {
  const store = fs.readFileSync(path.resolve('src/store/forumStore.ts'), 'utf8');

  /* Cắt đúng thân hàm addXP (từ khai báo tới hàm kế tiếp). */
  const start = store.indexOf('const addXP = (amount: number');
  assert.ok(start > 0, 'addXP phải tồn tại trong forumStore');
  const end = store.indexOf('const updateProfile = ', start);
  assert.ok(end > start, 'Phải xác định được điểm kết thúc của addXP');
  const body = store.slice(start, end);

  /* Lấy riêng khối commitUsers(prev => { ... }) bên trong addXP. */
  const updaterStart = body.indexOf('commitUsers(prev => {');
  assert.ok(updaterStart > 0, 'addXP phải cập nhật sổ tài khoản qua cổng commitUsers');
  let depth = 0;
  let updaterEnd = -1;
  for (let i = body.indexOf('{', updaterStart); i < body.length; i++) {
    if (body[i] === '{') depth++;
    else if (body[i] === '}') {
      depth--;
      if (depth === 0) { updaterEnd = i; break; }
    }
  }
  assert.ok(updaterEnd > updaterStart, 'Phải đóng được khối updater');
  const updater = body.slice(updaterStart, updaterEnd + 1);

  const banned = ['fetch(', 'postJson(', 'setCurrentUser(', 'playChime(', 'setToastMessage(', 'pushNotification('];
  for (const call of banned) {
    assert.ok(
      !updater.includes(call),
      `Updater của addXP không được chứa ${call} — StrictMode gọi updater 2 lần sẽ nhân đôi tác dụng phụ`,
    );
  }

  /* Tác dụng phụ vẫn phải tồn tại, chỉ là nằm NGOÀI updater. */
  assert.ok(body.includes("postJson('/api/users/update'"), 'Thưởng XP vẫn phải đồng bộ lên server');
  assert.ok(body.includes("playChime('level-up')"), 'Vẫn phải có âm thanh thăng cấp');
  assert.ok(body.includes('pushNotification({'), 'Vẫn phải đẩy thông báo thăng cấp');
  assert.ok(body.includes('usersRef.current[emailToCredit]'), 'Phải đọc snapshot ngoài updater qua usersRef');

  /* Cổng commitUsers phải giữ usersRef khớp NGAY trong cùng một tick, nếu không
     đọc snapshot sẽ ra số cũ (ví dụ hoàn lại Coin vừa trừ khi treo thưởng). */
  const commitStart = store.indexOf('const commitUsers = useCallback(');
  assert.ok(commitStart > 0, 'commitUsers phải tồn tại');
  const commitBody = store.slice(commitStart, store.indexOf('}, []);', commitStart) + 7);
  assert.ok(commitBody.includes('usersRef.current = resolved'), 'commitUsers phải cập nhật usersRef đồng bộ');
  assert.ok(commitBody.includes('setUsers(resolved)'), 'commitUsers phải là nơi duy nhất gọi setUsers');
  assert.ok(
    !/usersRef\.current = users;/.test(store),
    'Không gán ref trong lúc render — phải đồng bộ qua commitUsers',
  );

  /* Ngoài commitUsers, không chỗ nào được gọi setUsers trực tiếp. */
  assert.ok(
    store.includes('const [users, setUsers] = useState<Record<string, User>>('),
    'useState vẫn khai báo setUsers',
  );
  const directCalls = store.match(/(?<![\w.])setUsers\(/g) || [];
  assert.equal(directCalls.length, 1, 'Chỉ bên trong commitUsers được gọi setUsers');
});

test('18. Client luôn gắn token phiên vào các API ghi dữ liệu', () => {
  const store = fs.readFileSync(path.resolve('src/store/forumStore.ts'), 'utf8');
  const adminStore = fs.readFileSync(path.resolve('src/store/adminStore.ts'), 'utf8');
  const session = fs.readFileSync(path.resolve('src/utils/session.ts'), 'utf8');

  assert.ok(session.includes("AUTH_TOKEN_KEY = 'f_forum_auth_token'"), 'Khóa lưu token phải giữ nguyên để không đăng xuất người dùng cũ');
  assert.ok(session.includes('Authorization: `Bearer ${token}`'), 'Helper phải gắn header Bearer');

  /* `postJson` gắn `authHeaders()` theo định nghĩa, nên lời gọi qua helper này
     đương nhiên có token. Kiểm cả hai đường: fetch trực tiếp và qua helper. */
  assert.ok(
    /export const postJson[\s\S]*?authHeaders\(\)/.test(session),
    'postJson phải dùng authHeaders để mọi lời gọi qua helper đều có token'
  );

  /* `runServerAction` bọc `postJson` và còn đọc kết quả thật từ máy chủ, nên
     lời gọi qua nó vừa có token vừa không nuốt lỗi. */
  assert.ok(
    /const runServerAction[\s\S]*?postJson\(/.test(store),
    'runServerAction phải gọi qua postJson (có token)'
  );

  const protectedEndpoints = [
    '/api/questions',
    '/api/solutions',
    '/api/solutions/best',
    '/api/users/update',
    '/api/questions/delete',
    '/api/questions/edit',
    '/api/solutions/delete',
    '/api/chat/delete',
  ];
  for (const endpoint of protectedEndpoints) {
    const viaHelper = store.indexOf(`postJson('${endpoint}'`);
    const viaAction = store.indexOf(`runServerAction('${endpoint}'`);
    const directAt = store.indexOf(`fetch('${endpoint}'`);
    assert.ok(
      viaHelper > 0 || viaAction > 0 || directAt > 0,
      `forumStore phải gọi ${endpoint} (qua runServerAction, postJson hoặc fetch)`
    );

    if (directAt > 0) {
      const block = store.slice(directAt, directAt + 260);
      assert.ok(block.includes('authHeaders()'), `${endpoint} gọi fetch trực tiếp phải gửi kèm token`);
      assert.ok(
        !block.includes("headers: { 'Content-Type': 'application/json' }"),
        `${endpoint} không được dùng header trần`,
      );
    }
  }

  const aboutAt = adminStore.indexOf("fetch('/api/admin/about', {");
  assert.ok(aboutAt > 0, 'adminStore phải gọi POST /api/admin/about');
  assert.ok(adminStore.slice(aboutAt, aboutAt + 220).includes('authHeaders()'), 'Ghi Khu Vinh Danh phải kèm token');

  /* Socket cũng phải xác thực, không chỉ HTTP. */
  assert.ok(store.includes("type: 'AUTH'"), 'forumStore phải gửi AUTH qua WebSocket');
  assert.ok(store.includes('authenticateSocketRef.current()'), 'Phải xác thực lại socket sau khi đăng nhập');
});

test('19. /api/auth/session: token hợp lệ trả đúng tài khoản, token hỏng trả 401', async () => {
  const env = await createTestServer();
  try {
    /* Chưa đăng nhập -> 401 */
    const anon = await fetch(`${env.baseUrl}/api/auth/session`);
    assert.equal(anon.status, 401, 'Không token phải trả 401');

    const account = await register(env.baseUrl, 'Kiểm Phiên', 'session.check@example.com', 'mat-khau-phien-1');

    const ok = await fetch(`${env.baseUrl}/api/auth/session`, {
      headers: { Authorization: `Bearer ${account.token}` },
    });
    assert.equal(ok.status, 200, 'Token hợp lệ phải trả 200');
    const okData = await ok.json();
    assert.equal(okData.user.email, 'session.check@example.com');
    assert.equal(okData.role, 'STUDENT', 'Role phải đọc từ bản ghi thật, không từ token');
    assert.ok(okData.expiresAt > Date.now(), 'Phải báo hạn dùng của phiên');

    /* Token bị sửa một ký tự -> 401 */
    const tampered = account.token.slice(0, -2) + 'xx';
    const bad = await fetch(`${env.baseUrl}/api/auth/session`, {
      headers: { Authorization: `Bearer ${tampered}` },
    });
    assert.equal(bad.status, 401, 'Token giả mạo phải trả 401');

    /* Token đúng chữ ký nhưng tài khoản không tồn tại -> 401 */
    const ghost = createSessionToken('khong.ton.tai@example.com', 'STUDENT');
    const ghostRes = await fetch(`${env.baseUrl}/api/auth/session`, {
      headers: { Authorization: `Bearer ${ghost}` },
    });
    assert.equal(ghostRes.status, 401, 'Token của tài khoản đã bị xoá phải trả 401');
  } finally {
    await env.close();
  }
});

test('20. Client kiểm tra lại phiên lúc khởi động thay vì tin localStorage', () => {
  const store = fs.readFileSync(path.resolve('src/store/forumStore.ts'), 'utf8');

  assert.ok(store.includes("fetch('/api/auth/session'"), 'Phải hỏi server xem token còn hiệu lực không');
  assert.ok(store.includes("sessionRes.status === 401"), 'Phải xử lý nhánh phiên hết hạn');

  const start = store.indexOf("if (savedToken) {");
  assert.ok(start > 0, 'Phải có nhánh khôi phục phiên theo token');
  const block = store.slice(start, start + 1400);
  assert.ok(block.includes('clearAuthToken()'), 'Phiên hỏng phải xoá token');
  assert.ok(block.includes("safeStorage.removeItem('fforum_current_user_email')"), 'Phiên hỏng phải xoá email đã lưu');
  assert.ok(block.includes('setCurrentUser(null)'), 'Phiên hỏng phải đưa người dùng về chế độ khách');
});

test('21. Khu Vinh Danh: payload một phần phải GỘP, không được xoá founder/milestones', async () => {
  const env = await createTestServer();
  try {
    const initial = await get(env.baseUrl, '/api/admin/about');
    const before = initial.data.about || initial.data;
    assert.ok(before.founder, 'Tài liệu gốc phải có founder');
    assert.ok(Array.isArray(before.milestones) && before.milestones.length > 0, 'Tài liệu gốc phải có milestones');

    const adminLogin = await post(env.baseUrl, '/api/auth/login', {
      email: 'anhtuantran0512@gmail.com',
      password: 'admin123',
    });
    assert.equal(adminLogin.status, 200);

    /* Gửi lên CHỈ một trường — đây chính là payload từng xoá sạch tài liệu
       rồi ghi xuống đĩa, làm hỏng dữ liệu cho mọi lần khởi động sau. */
    const partial = await post(env.baseUrl, '/api/admin/about', {
      adminEmail: 'anhtuantran0512@gmail.com',
      aboutData: { headline: 'Chỉ Đổi Tiêu Đề' },
    }, adminLogin.data.token);
    assert.equal(partial.status, 200);
    assert.equal(partial.data.headline, 'Chỉ Đổi Tiêu Đề', 'Trường gửi lên phải được cập nhật');
    assert.ok(partial.data.founder, 'founder không được biến mất');
    assert.equal(partial.data.founder.name, before.founder.name, 'founder phải giữ nguyên');
    assert.equal(partial.data.milestones.length, before.milestones.length, 'milestones phải giữ nguyên');

    /* Payload cố tình null hoá hai khối lõi cũng không phá được tài liệu. */
    const hostile = await post(env.baseUrl, '/api/admin/about', {
      adminEmail: 'anhtuantran0512@gmail.com',
      aboutData: { headline: 'Phá Dữ Liệu', founder: null, milestones: [] },
    }, adminLogin.data.token);
    assert.equal(hostile.status, 200);
    assert.ok(hostile.data.founder, 'founder = null phải bị bỏ qua');
    assert.ok(Array.isArray(hostile.data.milestones), 'milestones phải còn là mảng');

    /* Đọc lại vẫn phải nguyên vẹn. */
    const after = await get(env.baseUrl, '/api/admin/about');
    const doc = after.data.about || after.data;
    assert.equal(doc.headline, 'Phá Dữ Liệu');
    assert.equal(doc.founder.name, before.founder.name);
    assert.ok(doc.milestones.length > 0);
  } finally {
    await env.close();
  }
});

/* -------------------------------------------------------------------------- */
/* 4. Quy trình tố cáo vi phạm                                                */
/* -------------------------------------------------------------------------- */

test('22. Tố cáo vi phạm: không mất khi khởi động lại, chỉ admin đọc được', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fforum-reports-'));
  process.env.FFORUM_DATA_DIR = dir;

  let env = await createTestServer();
  try {
    /* Gửi một tố cáo như người dùng thật. */
    const submitted = await post(env.baseUrl, '/api/reports', {
      reporterId: 'u-reporter',
      reporterName: 'Người Tố Cáo',
      reporterEmail: 'reporter@example.com',
      reportedUserId: 'u-spammer',
      reportedUserName: 'Kẻ Spam',
      reason: 'Spam',
      details: 'Đăng lặp cùng một nội dung 20 lần trong 5 phút.',
    });
    assert.equal(submitted.status, 200);
    assert.ok(submitted.data.reportId, 'Phải trả về reportId');
    assert.equal(submitted.data.duplicated, undefined, 'Lần đầu không phải bản trùng');

    /* Gửi y hệt lần nữa → gộp lại, không làm ngập hộp thư. */
    const again = await post(env.baseUrl, '/api/reports', {
      reporterId: 'u-reporter',
      reportedUserId: 'u-spammer',
      reason: 'Spam',
      details: 'Đăng lặp cùng một nội dung 20 lần trong 5 phút.',
    });
    assert.equal(again.data.duplicated, true, 'Tố cáo trùng phải được gộp');

    /* Chưa đăng nhập → không đọc được hộp thư. */
    const forbidden = await get(env.baseUrl, '/api/admin/reports');
    assert.equal(forbidden.status, 403, 'Hộp thư tố cáo phải khoá với người lạ');

    const adminLogin = await post(env.baseUrl, '/api/auth/login', {
      email: 'anhtuantran0512@gmail.com',
      password: 'admin123',
    });
    const adminToken = adminLogin.data.token;

    const inbox = await fetch(`${env.baseUrl}/api/admin/reports`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    assert.equal(inbox.success, true);
    assert.equal(inbox.reports.length, 1, 'Hai lượt gửi trùng chỉ tạo một báo cáo');
    assert.equal(inbox.pending, 1);
    assert.equal(inbox.reports[0].status, 'PENDING');
    const reportId = inbox.reports[0].id;

    /* Học sinh có token hợp lệ vẫn không đọc được. */
    const student = await register(env.baseUrl, 'Học Sinh', 'report.probe@example.com', 'mat-khau-probe-9');
    const studentInbox = await fetch(`${env.baseUrl}/api/admin/reports`, {
      headers: { Authorization: `Bearer ${student.token}` },
    });
    assert.equal(studentInbox.status, 403, 'Token học sinh không mở được hộp thư');

    /* Xử lý báo cáo. */
    const resolved = await post(env.baseUrl, '/api/admin/reports/resolve', {
      reportId,
      status: 'RESOLVED',
      note: 'Đã khoá tài khoản 7 ngày.',
    }, adminToken);
    assert.equal(resolved.status, 200);
    assert.equal(resolved.data.report.status, 'RESOLVED');
    assert.equal(resolved.data.report.resolutionNote, 'Đã khoá tài khoản 7 ngày.');

    await sleep(400); /* chờ persistStoreToDisk (debounce 200ms) */
  } finally {
    await env.close();
  }

  /* ---- Mô phỏng khởi động lại server trên cùng thư mục dữ liệu ---- */
  const saved = JSON.parse(fs.readFileSync(path.join(dir, 'forum-data.json'), 'utf8'));
  assert.equal((saved.reports || []).length, 1, 'Báo cáo phải nằm trong tệp dữ liệu');
  assert.equal(saved.reports[0].status, 'RESOLVED', 'Trạng thái đã xử lý phải được lưu');

  env = await createTestServer();
  try {
    const adminLogin = await post(env.baseUrl, '/api/auth/login', {
      email: 'anhtuantran0512@gmail.com',
      password: 'admin123',
    });
    const after = await fetch(`${env.baseUrl}/api/admin/reports`, {
      headers: { Authorization: `Bearer ${adminLogin.data.token}` },
    }).then((r) => r.json());
    /* TRƯỚC KHI VÁ: loadStoreFromDisk dựng lại store mà bỏ quên `reports`,
       nên toàn bộ tố cáo biến mất sau mỗi lần khởi động lại. */
    assert.equal(after.reports.length, 1, 'Khởi động lại KHÔNG được làm mất báo cáo');
    assert.equal(after.reports[0].reportedUserName, 'Kẻ Spam');
    assert.equal(after.reports[0].status, 'RESOLVED');
  } finally {
    await env.close();
    process.env.FFORUM_DATA_DIR = DATA_DIR;
  }
});

test('23. Chat & góp ý: server tự giữ giới hạn, không tin maxLength của client', async () => {
  const env = await createTestServer();
  try {
    /* Ô nhập phía client chặn 300 ký tự, nhưng một request thủ công thì không. */
    const oversized = await post(env.baseUrl, '/api/chat', {
      channelId: 'hallway',
      content: 'A'.repeat(5000),
      authorName: 'Kẻ phá',
    });
    assert.equal(oversized.status, 400, 'Tin nhắn quá dài phải bị từ chối');
    assert.ok(/tối đa/.test(oversized.data.message));

    const ok = await post(env.baseUrl, '/api/chat', {
      channelId: 'hallway',
      content: 'Tin nhắn hợp lệ',
      authorName: 'Học sinh',
      authorLevel: 150,
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.data.message.authorLevel, 1, 'Cấp bậc phải lấy từ bản ghi thật, không từ client tự khai');

    /* Nội dung rỗng / chỉ khoảng trắng. */
    const blank = await post(env.baseUrl, '/api/chat', { channelId: 'hallway', content: '   ' });
    assert.equal(blank.status, 400, 'Tin nhắn chỉ có khoảng trắng phải bị từ chối');

    /* Góp ý: quá ngắn đã chặn từ trước, giờ chặn luôn quá dài. */
    const longFeedback = await post(env.baseUrl, '/api/feedback', {
      name: 'Người góp ý',
      email: 'gopy@example.com',
      content: 'B'.repeat(9000),
    });
    assert.equal(longFeedback.status, 400, 'Góp ý quá dài phải bị từ chối');

    const shortFeedback = await post(env.baseUrl, '/api/feedback', {
      name: 'Người góp ý',
      email: 'gopy@example.com',
      content: 'Ngắn',
    });
    assert.equal(shortFeedback.status, 400, 'Góp ý quá ngắn vẫn bị từ chối như cũ');

    const goodFeedback = await post(env.baseUrl, '/api/feedback', {
      name: 'Người góp ý',
      email: 'gopy@example.com',
      content: 'Giao diện rất đẹp nhưng mong có thêm chế độ đọc ban đêm cho phần diễn đàn.',
    });
    assert.equal(goodFeedback.status, 200);

    /* Chặn spam: bắn nhiều tin liên tiếp phải chạm 429. */
    let sawTooMany = false;
    for (let i = 0; i < 140; i++) {
      const res = await fetch(`${env.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: 'hallway', content: `spam ${i}` }),
      });
      if (res.status === 429) { sawTooMany = true; break; }
    }
    assert.ok(sawTooMany, 'Bắn tin liên tục phải bị chặn 429');
  } finally {
    await env.close();
  }
});

test('24. Kho tin nhắn/góp ý/báo cáo có trần — không phình vô hạn theo thời gian chạy', () => {
  const server = fs.readFileSync(path.resolve('server/forumServer.ts'), 'utf8');

  assert.ok(server.includes('const capTail ='), 'Phải có hàm cắt kho dữ liệu');
  assert.ok(server.includes('MAX_CHAT_MESSAGES'), 'Kho tin nhắn phải có trần');
  assert.ok(server.includes('MAX_FEEDBACKS'), 'Kho góp ý phải có trần');
  assert.ok(server.includes('MAX_REPORTS'), 'Kho báo cáo phải có trần');

  /* Mỗi kho phải thực sự được cắt khi thêm mới, không chỉ khai báo hằng số. */
  assert.ok(server.includes('capTail([...store.chatMessages, msg], MAX_CHAT_MESSAGES)'), 'chatMessages phải được cắt');
  assert.ok(server.includes('capTail([...store.feedbacks, submission], MAX_FEEDBACKS)'), 'feedbacks phải được cắt');
  assert.ok(server.includes('capTail([...store.reports, reportSubmission], MAX_REPORTS)'), 'reports phải được cắt');
  assert.ok(!/store\.chatMessages\.push\(/.test(server), 'Không push thẳng vào kho tin nhắn nữa');
});

test('25. Câu lạc bộ: bốn endpoint từng trả 404 nay lưu thật và kiểm quyền đúng', async () => {
  const env = await createTestServer();
  try {
    /* Khách chưa đăng nhập không lập được CLB. */
    const anon = await post(env.baseUrl, '/api/clubs', { name: 'CLB Ẩn Danh', purpose: 'Thử' });
    assert.equal(anon.status, 401, 'Chưa đăng nhập thì không lập được CLB');

    /* Khai leaderEmail của người khác mà không có token của họ → không mạo danh được. */
    const attacker = await register(env.baseUrl, 'Kẻ Mạo Danh', 'maodanh@example.com', 'mat-khau-mao-danh');
    const spoofed = await post(env.baseUrl, '/api/clubs', {
      name: 'CLB Mạo Danh',
      purpose: 'Mượn danh admin',
      leaderEmail: 'anhtuantran0512@gmail.com',
    }, attacker.token);
    assert.equal(spoofed.status, 200);
    assert.notEqual(
      spoofed.data.club.leaderName,
      'anhtuantran0512@gmail.com',
      'Người sáng lập phải lấy từ phiên đăng nhập, không từ body tự khai'
    );

    /* Hồ sơ mới luôn ở trạng thái chờ — người dùng không tự duyệt cho mình. */
    assert.equal(spoofed.data.club.status, 'PENDING', 'CLB mới phải ở trạng thái PENDING');

    const founder = await register(env.baseUrl, 'Chủ Nhiệm', 'chunhiem@example.com', 'mat-khau-chu-nhiem');
    const created = await post(env.baseUrl, '/api/clubs', {
      name: 'CLB Lập Trình',
      slogan: 'Code cùng nhau',
      category: 'Công nghệ',
      purpose: 'Học thuật toán và dự án nhóm mỗi tuần.',
      foundingMembers: ['Bạn A', 'Bạn B'],
    }, founder.token);
    assert.equal(created.status, 200, `tạo CLB: ${JSON.stringify(created.data)}`);
    const clubId = created.data.club.id;
    assert.equal(created.data.club.leaderName, 'Chủ Nhiệm');
    assert.equal(created.data.club.membersCount, 2);

    /* Học sinh thường không duyệt được. */
    const studentApprove = await post(env.baseUrl, '/api/clubs/approve', { clubId }, attacker.token);
    assert.equal(studentApprove.status, 403, 'Học sinh không duyệt được CLB');

    /* Không có token thì cũng không duyệt được. */
    const anonApprove = await post(env.baseUrl, '/api/clubs/approve', {
      clubId,
      adminEmail: 'anhtuantran0512@gmail.com',
    });
    assert.equal(anonApprove.status, 403, 'Khai adminEmail không mở được quyền duyệt');

    /* Admin thật duyệt được, và chủ nhiệm được thăng cấp + XP. */
    const adminLogin = await post(env.baseUrl, '/api/auth/login', {
      email: 'anhtuantran0512@gmail.com',
      password: 'admin123',
    });
    assert.equal(adminLogin.status, 200, `admin login: ${JSON.stringify(adminLogin.data)}`);

    const approved = await post(env.baseUrl, '/api/clubs/approve', { clubId }, adminLogin.data.token);
    assert.equal(approved.status, 200, `duyệt CLB: ${JSON.stringify(approved.data)}`);
    assert.equal(approved.data.club.status, 'APPROVED');

    const sync = await get(env.baseUrl, '/api/sync');
    const syncData = sync.data.data;
    const founderRow = Object.values(syncData.users).find((u) => u.email === 'chunhiem@example.com');
    assert.equal(founderRow.role, 'CLUB_LEADER', 'Chủ nhiệm phải được thăng cấp');
    assert.ok(founderRow.xp >= 250, `Chủ nhiệm phải nhận XP, thực tế = ${founderRow.xp}`);
    assert.ok(founderRow.scopedClubIds.includes(clubId), 'Phải gắn CLB vào phạm vi quản lý');

    /* Bài viết trong CLB cần đăng nhập và CLB phải tồn tại. */
    const ghostPost = await post(env.baseUrl, '/api/clubs/posts', {
      clubId,
      title: 'Ma',
      content: 'Không ai đăng được đâu',
    });
    assert.equal(ghostPost.status, 401, 'Chưa đăng nhập thì không đăng bài được');

    const badClubPost = await post(env.baseUrl, '/api/clubs/posts', {
      clubId: 'club-khong-ton-tai',
      title: 'Lạc đề',
      content: 'CLB này không có thật',
    }, founder.token);
    assert.equal(badClubPost.status, 404, 'Đăng vào CLB không tồn tại phải 404');

    const posted = await post(env.baseUrl, '/api/clubs/posts', {
      clubId,
      title: 'Buổi học đầu tiên',
      content: 'Mọi người mang laptop, mình bắt đầu với quy hoạch động.',
    }, founder.token);
    assert.equal(posted.status, 200, `đăng bài: ${JSON.stringify(posted.data)}`);
    assert.equal(posted.data.post.authorName, 'Chủ Nhiệm', 'Tác giả lấy từ phiên, không từ body');

    /* Cả CLB lẫn bài viết phải xuống đĩa và về lại qua /api/sync. */
    assert.ok(
      syncData.clubs.some((c) => c.id === clubId),
      '/api/sync phải trả CLB về để thiết bị khác thấy'
    );
  } finally {
    await env.close();
  }
});

test('26. Luồng từ chối CLB: ghi lý do và không cho học sinh đụng vào', async () => {
  const env = await createTestServer();
  try {
    const founder = await register(env.baseUrl, 'Người Đề Xuất', 'dexuat@example.com', 'mat-khau-de-xuat');
    const created = await post(env.baseUrl, '/api/clubs', {
      name: 'CLB Thiếu Mục Đích',
      purpose: 'Chưa rõ.',
    }, founder.token);
    assert.equal(created.status, 200);
    const clubId = created.data.club.id;

    const studentReject = await post(env.baseUrl, '/api/clubs/reject', {
      clubId,
      reason: 'Tự ý từ chối',
    }, founder.token);
    assert.equal(studentReject.status, 403, 'Học sinh không từ chối được hồ sơ CLB');

    const missing = await post(env.baseUrl, '/api/clubs/reject', {});
    assert.equal(missing.status, 400, 'Thiếu mã CLB phải báo 400');

    const adminLogin = await post(env.baseUrl, '/api/auth/login', {
      email: 'anhtuantran0512@gmail.com',
      password: 'admin123',
    });
    const rejected = await post(env.baseUrl, '/api/clubs/reject', {
      clubId,
      reason: 'Thiếu mục tiêu hoạt động cụ thể.',
    }, adminLogin.data.token);
    assert.equal(rejected.status, 200, `từ chối CLB: ${JSON.stringify(rejected.data)}`);

    const ghost = await post(env.baseUrl, '/api/clubs/reject', { clubId: 'club-khong-co' }, adminLogin.data.token);
    assert.equal(ghost.status, 404, 'Từ chối CLB không tồn tại phải 404');

    const sync = await get(env.baseUrl, '/api/sync');
    const row = sync.data.data.clubs.find((c) => c.id === clubId);
    assert.equal(row.status, 'REJECTED');
    assert.equal(row.rejectReason, 'Thiếu mục tiêu hoạt động cụ thể.', 'Lý do từ chối phải được lưu');
  } finally {
    await env.close();
  }
});

test('27. Presence: không mạo danh được email/role qua gói ping tự khai', async () => {
  const env = await createTestServer();
  const ws = new WebSocket(env.wsUrl);
  const received = [];
  ws.on('message', (raw) => { try { received.push(JSON.parse(raw.toString())); } catch { /* ignore */ } });

  try {
    await new Promise((res) => ws.once('open', res));

    /* Khách chưa đăng nhập khai email của Super Admin. */
    ws.send(JSON.stringify({
      type: 'PRESENCE_PING',
      payload: {
        id: 'ke-gia-danh',
        name: 'Admin Rởm',
        email: 'anhtuantran0512@gmail.com',
        role: 'SUPER_ADMIN',
        level: 150,
      },
    }));
    await sleep(250);

    const spoofed = received.filter((m) => m.type === 'PRESENCE_PING');
    assert.ok(spoofed.length >= 1, 'Phải nhận lại được gói PRESENCE_PING');
    const last = spoofed[spoofed.length - 1];
    assert.equal(last.payload.email, undefined, 'Khách chưa đăng nhập không được gắn email');
    assert.equal(last.payload.role, undefined, 'Khách chưa đăng nhập không được gắn role');
    assert.equal(last.payload.level, 150, 'Cấp bậc vẫn được giữ (không phải trường nhạy cảm)');

    /* Người đã đăng nhập khai email NGƯỜI KHÁC → server ghi đè bằng email thật. */
    const student = await register(env.baseUrl, 'Học Sinh Thật', 'hoc-sinh-that@example.com', 'mat-khau-that-123');
    ws.send(JSON.stringify({ type: 'AUTH', payload: { token: student.token } }));
    await sleep(200);

    received.length = 0;
    ws.send(JSON.stringify({
      type: 'PRESENCE_PING',
      payload: {
        id: 'chinh-chu',
        name: 'Tôi là admin',
        email: 'anhtuantran0512@gmail.com',
        role: 'SUPER_ADMIN',
      },
    }));
    await sleep(250);

    const authed = received.filter((m) => m.type === 'PRESENCE_PING');
    assert.ok(authed.length >= 1, 'Phải nhận lại gói ping sau khi xác thực');
    const mine = authed[authed.length - 1];
    assert.equal(mine.payload.email, 'hoc-sinh-that@example.com', 'Email phải lấy từ phiên, không từ body');
    assert.notEqual(mine.payload.role, 'SUPER_ADMIN', 'Không được tự phong SUPER_ADMIN');
  } finally {
    ws.close();
    await env.close();
  }
});

test('28. Presence qua HTTP: lọc trường, chặn thiếu id, và chặn flood', async () => {
  const env = await createTestServer();
  try {
    const missingId = await post(env.baseUrl, '/api/presence', { user: { name: 'Vô danh' } });
    assert.equal(missingId.status, 400, 'Thiếu id phải báo 400');

    const noUser = await post(env.baseUrl, '/api/presence', {});
    assert.equal(noUser.status, 400, 'Thiếu user phải báo 400');

    const student = await register(env.baseUrl, 'Ping HTTP', 'ping-http@example.com', 'mat-khau-ping-123');
    const ok = await post(env.baseUrl, '/api/presence', {
      user: {
        id: 'ping-http',
        name: 'Khai man tên',
        email: 'anhtuantran0512@gmail.com',
        role: 'SUPER_ADMIN',
      },
    }, student.token);
    assert.equal(ok.status, 200);

    /* Gói quá dài phải bị cắt, không nhét được payload khổng lồ vào broadcast. */
    const huge = await post(env.baseUrl, '/api/presence', {
      user: { id: 'ping-dai', name: 'A'.repeat(5000), avatar: 'B'.repeat(20000) },
    });
    assert.equal(huge.status, 200);

    /* Chặn flood: client thật ping mỗi 15 giây nên 40/phút là rất rộng. */
    let sawTooMany = false;
    for (let i = 0; i < 70; i++) {
      const res = await fetch(`${env.baseUrl}/api/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: { id: `spam-${i}` } }),
      });
      if (res.status === 429) { sawTooMany = true; break; }
    }
    assert.ok(sawTooMany, 'Bắn presence liên tục phải bị chặn 429');
  } finally {
    await env.close();
  }
});

test('29. Presence: server không còn broadcast nguyên khối dữ liệu client tự khai', () => {
  const server = fs.readFileSync(path.resolve('server/forumServer.ts'), 'utf8');
  assert.ok(server.includes('function sanitizePresence'), 'Phải có bộ lọc presence');
  assert.ok(
    server.includes("broadcastServerEvent('PRESENCE_PING', cleaned)"),
    'Cả hai đường phải phát gói đã lọc, không phát payload gốc'
  );
  assert.ok(
    !/broadcastServerEvent\('PRESENCE_PING', (payload|body\.user)\)/.test(server),
    'Không được phát thẳng payload/body.user nữa'
  );
  assert.ok(server.includes('presenceLimiter'), 'Presence phải có rate limit');
});

test('30. Câu hỏi & lời giải: danh tính hiển thị lấy từ bản ghi thật, không từ body', async () => {
  const env = await createTestServer();
  try {
    const asker = await register(env.baseUrl, 'Người Hỏi Thật', 'nguoi-hoi-that@example.com', 'mat-khau-hoi-12345');
    const solver = await register(env.baseUrl, 'Người Giải Thật', 'nguoi-giai-that@example.com', 'mat-khau-giai-12345');

    /* Đặt câu hỏi nhưng khai tên + ảnh đại diện của người khác. */
    const asked = await post(env.baseUrl, '/api/questions', {
      title: 'Giải giúp bài tích phân này',
      content: 'Tính tích phân của x^2 từ 0 đến 1.',
      authorEmail: 'nguoi-hoi-that@example.com',
      authorName: 'Super Admin Giả Mạo',
      authorId: 'id-cua-nguoi-khac',
      authorAvatar: 'https://example.com/avatar-gia.jpg',
      authorLevel: 150,
    }, asker.token);
    assert.equal(asked.status, 200, `đặt câu hỏi: ${JSON.stringify(asked.data)}`);

    const q = asked.data.question;
    assert.equal(q.authorName, 'Người Hỏi Thật', 'Tên tác giả phải lấy từ bản ghi thật');
    assert.notEqual(q.authorId, 'id-cua-nguoi-khac', 'authorId không được lấy từ body tự khai');
    assert.notEqual(q.authorAvatar, 'https://example.com/avatar-gia.jpg', 'Ảnh đại diện không được lấy từ body');
    assert.notEqual(q.authorLevel, 150, 'Cấp bậc không được tự khai');

    const questionId = q.id;

    /* Trả lời cũng vậy. */
    const answered = await post(env.baseUrl, '/api/solutions', {
      questionId,
      content: 'Kết quả là 1/3.',
      authorEmail: 'nguoi-giai-that@example.com',
      authorName: 'Thầy Giáo Giả Mạo',
      authorAvatar: 'https://example.com/giao-vien.jpg',
      authorLevel: 150,
    }, solver.token);
    assert.equal(answered.status, 200, `gửi lời giải: ${JSON.stringify(answered.data)}`);

    const sol = answered.data.solution;
    assert.equal(sol.authorName, 'Người Giải Thật', 'Tên người giải phải lấy từ bản ghi thật');
    assert.notEqual(sol.authorAvatar, 'https://example.com/giao-vien.jpg', 'Ảnh người giải không được lấy từ body');
    assert.notEqual(sol.authorLevel, 150, 'Cấp bậc người giải không được tự khai');

    /* Trường tự do vẫn bị cắt độ dài. */
    const longOne = await post(env.baseUrl, '/api/questions', {
      title: 'T'.repeat(500),
      content: 'C'.repeat(50000),
      subject: 'S'.repeat(500),
      imageUrl: 'U'.repeat(9000),
      authorEmail: 'nguoi-hoi-that@example.com',
    }, asker.token);
    assert.equal(longOne.status, 200);
    assert.ok(longOne.data.question.title.length <= 200, `title phải ≤200, thực tế ${longOne.data.question.title.length}`);
    assert.ok(longOne.data.question.content.length <= 20000, 'content phải ≤20000');
    assert.ok(longOne.data.question.subject.length <= 40, `subject phải ≤40, thực tế ${longOne.data.question.subject.length}`);
    assert.ok(longOne.data.question.imageUrl.length <= 2000, 'imageUrl phải ≤2000');
  } finally {
    await env.close();
  }
});

test('31. WS: không bơm được bountyCoin khổng lồ để tự nhận thưởng', async () => {
  const env = await createTestServer();
  const client = await connectWs(env.wsUrl);
  try {
    /* Trước khi vá: AUTH → NEW_QUESTION{bountyCoin:999999} → NEW_SOLUTION
       → MARK_BEST_SOLUTION biến tài khoản mới 100 coin thành 500.199 coin. */
    const account = await register(env.baseUrl, 'Kẻ Bơm', 'ke-bom@example.com', 'mat-khau-bom-12345');
    const authed = await connectWs(env.wsUrl, account.token);
    try {
      const stamp = Date.now();
      authed.send('NEW_QUESTION', {
        id: `q-bom-${stamp}`,
        title: 'Câu hỏi bơm',
        content: 'Bơm coin',
        authorEmail: 'ke-bom@example.com',
        bountyCoin: 999999,
      });
      await sleep(250);
      authed.send('NEW_SOLUTION', {
        id: `s-bom-${stamp}`,
        questionId: `q-bom-${stamp}`,
        authorEmail: 'ke-bom@example.com',
        content: 'Tự trả lời',
      });
      await sleep(250);

      const sync0 = await get(env.baseUrl, '/api/sync');
      const q = sync0.data.data.questions.find((x) => x.id === `q-bom-${stamp}`);
      assert.ok(q, 'Câu hỏi phải được ghi');
      assert.ok(q.bountyCoin <= 100, `bountyCoin phải bị kẹp về trần, thực tế = ${q.bountyCoin}`);

      authed.send('MARK_BEST_SOLUTION', { questionId: `q-bom-${stamp}`, solutionId: `s-bom-${stamp}` });
      await sleep(350);

      const sync1 = await get(env.baseUrl, '/api/sync');
      const after = sync1.data.data.users['ke-bom@example.com'];
      /* Thưởng tối đa với bounty 100 là 150; trừ bounty đã trả thì còn +50,
         chứ không phải +500.099 như trước khi vá. */
      assert.ok(after.coin <= 250, `Coin phải nằm trong giới hạn hợp lệ, thực tế = ${after.coin}`);
      assert.ok(after.xp <= 250, `XP phải nằm trong giới hạn hợp lệ, thực tế = ${after.xp}`);
    } finally {
      authed.ws.close();
    }

    /* Không xác thực thì không ghi được câu hỏi qua WS. */
    const before = await get(env.baseUrl, '/api/sync');
    const beforeCount = before.data.data.questions.length;
    client.send('NEW_QUESTION', {
      id: 'q-khong-auth',
      title: 'Không auth',
      content: 'Không auth',
      authorEmail: 'ke-bom@example.com',
      bountyCoin: 999999,
    });
    const forbidden = await client.waitFor('FORBIDDEN');
    assert.equal(forbidden.payload.action, 'NEW_QUESTION', 'Phải trả FORBIDDEN cho NEW_QUESTION không auth');
    await sleep(200);
    const after = await get(env.baseUrl, '/api/sync');
    assert.equal(
      after.data.data.questions.filter((x) => x.id === 'q-khong-auth').length,
      0,
      'Không auth thì không ghi được câu hỏi vào kho'
    );
    assert.equal(after.data.data.questions.length, beforeCount, 'Số câu hỏi không được tăng');
  } finally {
    client.ws.close();
    await env.close();
  }
});

test('32. Không tự chọn câu trả lời của chính mình làm đáp án chuẩn', async () => {
  const env = await createTestServer();
  try {
    /* Trước khi vá, mỗi vòng tự hỏi → tự trả lời → tự chọn bỏ túi +50 coin và
       +225 XP, lặp vô hạn. */
    const farmer = await register(env.baseUrl, 'Nông Dân', 'nong-dan@example.com', 'mat-khau-cay-12345');

    const asked = await post(env.baseUrl, '/api/questions', {
      title: 'Câu tự hỏi',
      content: 'Tự hỏi rồi tự trả lời để lấy thưởng.',
      authorEmail: 'nong-dan@example.com',
      authorName: 'Nông Dân',
      bountyCoin: 100,
    }, farmer.token);
    assert.equal(asked.status, 200, `đặt câu hỏi: ${JSON.stringify(asked.data)}`);
    const questionId = asked.data.question.id;

    const solved = await post(env.baseUrl, '/api/solutions', {
      questionId,
      content: 'Tự trả lời.',
      authorEmail: 'nong-dan@example.com',
      authorName: 'Nông Dân',
    }, farmer.token);
    assert.equal(solved.status, 200);
    const solutionId = solved.data.solution.id;

    const selfAward = await post(env.baseUrl, '/api/solutions/best', {
      questionId,
      solutionId,
      authorEmail: 'nong-dan@example.com',
    }, farmer.token);
    assert.equal(selfAward.status, 409, 'Tự chọn đáp án của chính mình phải bị từ chối');
    assert.ok(/chính bạn/.test(selfAward.data.message), `Thông báo phải rõ ràng: ${selfAward.data.message}`);

    /* Coin đã bị trừ khi đặt câu và KHÔNG được trả lại. */
    const sync = await get(env.baseUrl, '/api/sync');
    const me = sync.data.data.users['nong-dan@example.com'];
    assert.ok(me.coin <= 100, `Coin không được tăng nhờ tự chọn, thực tế = ${me.coin}`);
    assert.ok(me.xp <= 100, `XP không được tăng vọt nhờ tự chọn, thực tế = ${me.xp}`);

    /* Người khác trả lời thì vẫn được chọn bình thường — không phá luồng chính. */
    const helper = await register(env.baseUrl, 'Người Giúp', 'nguoi-giup@example.com', 'mat-khau-giup-12345');
    const helperAnswer = await post(env.baseUrl, '/api/solutions', {
      questionId,
      content: 'Để mình giải giúp bạn.',
      authorEmail: 'nguoi-giup@example.com',
      authorName: 'Người Giúp',
    }, helper.token);
    assert.equal(helperAnswer.status, 200);

    const legit = await post(env.baseUrl, '/api/solutions/best', {
      questionId,
      solutionId: helperAnswer.data.solution.id,
      authorEmail: 'nong-dan@example.com',
    }, farmer.token);
    assert.equal(legit.status, 200, `Chọn đáp án của người khác vẫn phải được: ${JSON.stringify(legit.data)}`);

    const sync2 = await get(env.baseUrl, '/api/sync');
    const rewarded = sync2.data.data.users['nguoi-giup@example.com'];
    assert.ok(rewarded.coin > 100, `Người giải đúng phải nhận thưởng, thực tế = ${rewarded.coin}`);
  } finally {
    await env.close();
  }
});

test('33. WS: không chèn được CLB tự duyệt và bài viết CLB khi chưa đăng nhập', async () => {
  const env = await createTestServer();
  const stamp = Date.now();
  const anon = await connectWs(env.wsUrl);
  try {
    /* Trước khi vá: chèn được CLB có sẵn status:'APPROVED' kèm số thành viên
       và tên lãnh đạo tự đặt, vòng qua toàn bộ quy trình duyệt. */
    anon.send('NEW_CLUB', {
      id: `club-tu-duyet-${stamp}`,
      name: 'CLB Tự Duyệt',
      slogan: 'Không cần ban quản trị',
      foundingMembers: ['Kẻ chèn'],
      purpose: 'Chèn thẳng CLB đã duyệt qua WS.',
      leaderName: 'Lãnh đạo giả',
      followerCount: 9999,
      membersCount: 9999,
      status: 'APPROVED',
    });
    const forbidden = await anon.waitFor('FORBIDDEN');
    assert.equal(forbidden.payload.action, 'NEW_CLUB', 'Phải trả FORBIDDEN cho NEW_CLUB không auth');

    anon.send('NEW_CLUB_POST', {
      id: `cpost-lau-${stamp}`,
      clubId: 'club-bat-ky',
      title: 'Bài lậu',
      content: 'Không ai duyệt được',
    });
    const forbidden2 = await anon.waitFor('FORBIDDEN');
    assert.equal(forbidden2.payload.action, 'NEW_CLUB_POST', 'Phải trả FORBIDDEN cho NEW_CLUB_POST không auth');

    await sleep(250);
    const sync = await get(env.baseUrl, '/api/sync');
    assert.equal(
      sync.data.data.clubs.filter((c) => c.id === `club-tu-duyet-${stamp}`).length,
      0,
      'CLB chèn không auth không được vào kho'
    );
    assert.equal(
      sync.data.data.clubPosts.filter((p) => p.id === `cpost-lau-${stamp}`).length,
      0,
      'Bài viết CLB chèn không auth không được vào kho'
    );
  } finally {
    anon.ws.close();
  }

  /* Đã đăng nhập thì lập được, nhưng luôn ở trạng thái chờ và lãnh đạo là chính mình. */
  const founder = await register(env.baseUrl, 'Chủ Nhiệm WS', 'chunhiem-ws@example.com', 'mat-khau-ws-12345');
  const authed = await connectWs(env.wsUrl, founder.token);
  try {
    authed.send('NEW_CLUB', {
      id: `club-hop-le-${stamp}`,
      name: 'CLB Hợp Lệ',
      purpose: 'Lập đúng quy trình.',
      foundingMembers: ['Bạn A'],
      leaderName: 'Lãnh đạo giả mạo',
      followerCount: 9999,
      membersCount: 9999,
      status: 'APPROVED',
    });
    await sleep(300);

    const sync = await get(env.baseUrl, '/api/sync');
    const club = sync.data.data.clubs.find((c) => c.id === `club-hop-le-${stamp}`);
    assert.ok(club, 'CLB hợp lệ phải được ghi');
    assert.equal(club.status, 'PENDING', 'Không tự phong APPROVED được');
    assert.equal(club.leaderName, 'Chủ Nhiệm WS', 'Lãnh đạo phải lấy từ bản ghi thật');
    assert.equal(club.followerCount, 1, 'Số người theo dõi không được tự khai');
    assert.equal(club.membersCount, 1, 'Số thành viên tính từ foundingMembers thật');

    /* Bài viết vào CLB chưa được duyệt thì CLB vẫn phải tồn tại mới ghi được. */
    authed.send('NEW_CLUB_POST', {
      id: `cpost-hop-le-${stamp}`,
      clubId: `club-hop-le-${stamp}`,
      title: 'Bài hợp lệ',
      content: 'Đăng đúng quy trình.',
      authorName: 'Tác giả giả mạo',
    });
    await sleep(300);

    const sync2 = await get(env.baseUrl, '/api/sync');
    const postRow = sync2.data.data.clubPosts.find((p) => p.id === `cpost-hop-le-${stamp}`);
    assert.ok(postRow, 'Bài viết hợp lệ phải được ghi');
    assert.equal(postRow.authorName, 'Chủ Nhiệm WS', 'Tác giả phải lấy từ bản ghi thật');
    assert.equal(postRow.likes, 0, 'Số lượt thích không được tự khai');

    const ghost = await connectWs(env.wsUrl, founder.token);
    try {
      ghost.send('NEW_CLUB_POST', {
        id: `cpost-ma-${stamp}`,
        clubId: 'club-khong-ton-tai',
        title: 'Lạc đề',
        content: 'CLB này không có thật',
      });
      await sleep(300);
      const sync3 = await get(env.baseUrl, '/api/sync');
      assert.equal(
        sync3.data.data.clubPosts.filter((p) => p.id === `cpost-ma-${stamp}`).length,
        0,
        'Không ghi được bài vào CLB không tồn tại'
      );
    } finally {
      ghost.ws.close();
    }
  } finally {
    authed.ws.close();
    await env.close();
  }
});

test('34. Sửa câu hỏi: không ghi đè được authorEmail / bountyCoin (mass-assignment)', async () => {
  const env = await createTestServer();
  try {
    const owner = await register(env.baseUrl, 'Chủ Câu Hỏi', 'chu-cau-hoi@example.com', 'mat-khau-chu-12345');
    const victim = await register(env.baseUrl, 'Người Khác', 'nguoi-khac@example.com', 'mat-khau-khac-12345');

    const asked = await post(env.baseUrl, '/api/questions', {
      title: 'Bài cần sửa',
      content: 'Nội dung gốc.',
      authorEmail: 'chu-cau-hoi@example.com',
      authorName: 'Chủ Câu Hỏi',
      bountyCoin: 40,
    }, owner.token);
    assert.equal(asked.status, 200, `đặt câu hỏi: ${JSON.stringify(asked.data)}`);
    const questionId = asked.data.question.id;

    const adminLogin = await post(env.baseUrl, '/api/auth/login', {
      email: 'anhtuantran0512@gmail.com',
      password: 'admin123',
    });
    assert.equal(adminLogin.status, 200);

    /* Payload cố tình kèm các trường không được phép sửa. */
    const edited = await post(env.baseUrl, '/api/questions/edit', {
      questionId,
      updates: {
        title: 'Tiêu đề đã sửa',
        content: 'Nội dung đã sửa.',
        subject: 'ly',
        authorEmail: 'nguoi-khac@example.com',
        authorName: 'Đổi chủ',
        bountyCoin: 999999,
        id: 'id-bi-doi',
        isSolved: true,
      },
    }, adminLogin.data.token);
    assert.equal(edited.status, 200, `sửa bài: ${JSON.stringify(edited.data)}`);

    const q = edited.data.question;
    assert.equal(q.title, 'Tiêu đề đã sửa', 'Ba trường nội dung vẫn sửa được');
    assert.equal(q.content, 'Nội dung đã sửa.');
    assert.equal(q.subject, 'ly');

    /* Các trường nhạy cảm phải giữ nguyên. */
    assert.equal(q.authorEmail, 'chu-cau-hoi@example.com', 'authorEmail không được đổi chủ');
    assert.equal(q.authorName, 'Chủ Câu Hỏi', 'authorName không được đổi');
    assert.equal(q.bountyCoin, 40, `bountyCoin không được thổi, thực tế = ${q.bountyCoin}`);
    assert.equal(q.id, questionId, 'id không được đổi');
    assert.equal(q.isSolved, false, 'isSolved không được tự bật');

    /* Không có trường nào hợp lệ thì báo 400. */
    const empty = await post(env.baseUrl, '/api/questions/edit', {
      questionId,
      updates: { authorEmail: 'nguoi-khac@example.com', bountyCoin: 999999 },
    }, adminLogin.data.token);
    assert.equal(empty.status, 400, 'Payload chỉ có trường cấm phải bị từ chối');

    /* Câu hỏi không tồn tại thì 404. */
    const ghost = await post(env.baseUrl, '/api/questions/edit', {
      questionId: 'q-khong-ton-tai',
      updates: { title: 'Ma' },
    }, adminLogin.data.token);
    assert.equal(ghost.status, 404, 'Sửa câu hỏi không tồn tại phải 404');

    /* Học sinh vẫn không sửa được. */
    const studentAttempt = await post(env.baseUrl, '/api/questions/edit', {
      questionId,
      updates: { title: 'Học sinh sửa' },
    }, victim.token);
    assert.equal(studentAttempt.status, 403, 'Học sinh không sửa được bài');
  } finally {
    await env.close();
  }
});

test('35. Sửa câu hỏi qua WS: cùng một bộ lọc trường như đường HTTP', async () => {
  const env = await createTestServer();
  const adminLogin = await post(env.baseUrl, '/api/auth/login', {
    email: 'anhtuantran0512@gmail.com',
    password: 'admin123',
  });
  const admin = await connectWs(env.wsUrl, adminLogin.data.token);
  try {
    const owner = await register(env.baseUrl, 'Chủ Bài WS', 'chu-bai-ws@example.com', 'mat-khau-ws-12345');
    const asked = await post(env.baseUrl, '/api/questions', {
      title: 'Bài WS',
      content: 'Nội dung WS.',
      authorEmail: 'chu-bai-ws@example.com',
      bountyCoin: 40,
    }, owner.token);
    const questionId = asked.data.question.id;

    admin.send('EDIT_QUESTION', {
      questionId,
      updates: {
        title: 'Sửa qua WS',
        authorEmail: 'anhtuantran0512@gmail.com',
        bountyCoin: 999999,
      },
    });
    await sleep(300);

    const sync = await get(env.baseUrl, '/api/sync');
    const q = sync.data.data.questions.find((x) => x.id === questionId);
    assert.equal(q.title, 'Sửa qua WS', 'Tiêu đề sửa được qua WS');
    assert.equal(q.authorEmail, 'chu-bai-ws@example.com', 'authorEmail không đổi được qua WS');
    assert.equal(q.bountyCoin, 40, `bountyCoin không thổi được qua WS, thực tế = ${q.bountyCoin}`);

    /* Học sinh không sửa được qua WS. */
    const student = await connectWs(env.wsUrl, owner.token);
    try {
      student.send('EDIT_QUESTION', { questionId, updates: { title: 'Học sinh sửa qua WS' } });
      const forbidden = await student.waitFor('FORBIDDEN');
      assert.equal(forbidden.payload.action, 'EDIT_QUESTION');
    } finally {
      student.ws.close();
    }
  } finally {
    admin.ws.close();
    await env.close();
  }
});

test('36. Trần kết nối và giới hạn khung WebSocket', async () => {
  const env = await createTestServer();
  try {
    /* Khung WS phải bị giới hạn — mặc định của thư viện `ws` là 100 MiB. */
    const big = await connectWs(env.wsUrl);
    try {
      const closed = new Promise((resolve) => {
        big.ws.once('close', () => resolve(true));
        setTimeout(() => resolve(false), 1500);
      });
      /* Vượt trần 256 KiB. Dùng send nhị phân để không phải dựng chuỗi khổng lồ. */
      big.ws.send(Buffer.alloc(512 * 1024));
      const wasClosed = await closed;
      assert.ok(wasClosed, 'Khung vượt 256 KiB phải bị đóng kết nối');
    } finally {
      big.ws.close();
    }

    /* Cấu hình phải thực sự được đặt, không chỉ khai báo hằng số. */
    const server = fs.readFileSync(path.resolve('server/forumServer.ts'), 'utf8');
    assert.ok(
      server.includes('maxPayload: MAX_WS_FRAME_BYTES'),
      'WebSocketServer phải nhận maxPayload'
    );
    assert.ok(server.includes('wsClients.size >= MAX_WS_CLIENTS'), 'Phải chặn khi WS vượt trần');
    assert.ok(server.includes('sseClients.size >= MAX_SSE_CLIENTS'), 'Phải chặn khi SSE vượt trần');
  } finally {
    await env.close();
  }
});

test('37. Thao tác ghi dữ liệu phải đọc kết quả máy chủ, không nuốt lỗi', () => {
  const store = fs.readFileSync(path.resolve('src/store/forumStore.ts'), 'utf8');

  assert.ok(
    /const runServerAction[\s\S]*?status >= 200 && status < 300/.test(store),
    'runServerAction phải kiểm tra mã trạng thái'
  );
  assert.ok(
    /const runServerAction[\s\S]*?Không kết nối được máy chủ/.test(store),
    'runServerAction phải xử lý cả lỗi mạng'
  );

  /*
    Chính kiểu `.catch(() => {})` này đã che giấu việc bốn endpoint câu lạc bộ trả
    404 trong thời gian dài: máy chủ từ chối mà giao diện vẫn báo thành công.
    Các đường ghi quan trọng phải đi qua helper có đọc kết quả.
  */
  const criticalWrites = [
    '/api/questions/delete',
    '/api/questions/edit',
    '/api/solutions/delete',
    '/api/chat/delete',
    '/api/clubs',
    '/api/clubs/approve',
    '/api/clubs/reject',
    '/api/clubs/posts',
    /* Các đường tạo nội dung cũng phải đọc kết quả: createQuestion TRỪ COIN
       trước khi gửi, nên máy chủ từ chối (402/429/401) mà không hoàn tác là
       người dùng mất tiền mà bài không được đăng. */
    '/api/questions',
    '/api/solutions',
    '/api/chat',
    '/api/feedback',
    /* Sửa hồ sơ: máy chủ loại các trường nó sở hữu (role/id/email) nên có thể
       từ chối — nuốt lỗi thì giao diện vẫn báo "Hồ sơ đã lưu thành công!". */
    '/api/users/update',
    /* Chọn đáp án chuẩn: máy chủ trả 409 khi tự chọn đáp án của chính mình.
       Client phải đọc mã đó thay vì cộng thưởng rồi báo thành công. */
    '/api/solutions/best',
  ];
  for (const endpoint of criticalWrites) {
    assert.ok(
      store.includes(`runServerAction('${endpoint}'`),
      `${endpoint} phải đi qua runServerAction để đọc kết quả máy chủ`
    );
  }

  /* Các đường đó không được quay lại kiểu gọi rồi bỏ mặc. */
  for (const endpoint of criticalWrites) {
    const at = store.indexOf(`runServerAction('${endpoint}'`);
    const tail = store.slice(at, at + 700);
    assert.ok(
      tail.includes('type: \'error\''),
      `${endpoint} phải báo lỗi cho người dùng khi máy chủ từ chối`
    );
  }

  /* Chọn đáp án chuẩn: phải hỏi máy chủ trước rồi mới cộng thưởng. */
  const bestAt = store.indexOf("runServerAction('/api/solutions/best'");
  assert.ok(bestAt > 0, 'markBestSolution phải đọc kết quả máy chủ');
  const awardAt = store.indexOf('addXP(solverCoinAward', bestAt);
  assert.ok(awardAt > bestAt, 'Thưởng chỉ được cộng SAU khi máy chủ xác nhận');

  /* Và phải chặn tự chọn ngay phía client, khớp với 409 của máy chủ. */
  assert.ok(
    store.includes('Không thể chọn đáp án của chính bạn'),
    'Client phải chặn tự chọn đáp án của chính mình'
  );

  /* Toast phải có biến thể lỗi để hiển thị được. */
  assert.ok(
    store.includes("'xp' | 'success' | 'level' | 'error'"),
    'Toast phải hỗ trợ loại error'
  );
  const app = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
  assert.ok(
    app.includes("toastMessage.type === 'error'"),
    'App phải render được toast lỗi'
  );
});

test('38. Ẩn danh: giữ bí danh mà vẫn không cho mạo danh người khác', async () => {
  const env = await createTestServer();
  try {
    const asker = await register(env.baseUrl, 'Tên Thật Của Tôi', 'an-danh@example.com', 'mat-khau-an-12345');

    /* Câu hỏi ẩn danh phải giữ bí danh — giao diện render chính authorName. */
    const anon = await post(env.baseUrl, '/api/questions', {
      title: 'Câu hỏi ẩn danh',
      content: 'Tôi muốn hỏi mà không lộ tên.',
      authorEmail: 'an-danh@example.com',
      authorName: 'Pháp Sư Ghibli',
      isAnonymous: true,
      anonymousAlias: 'Pháp Sư Ghibli',
      anonymousMask: 'https://example.com/mat-na.png',
    }, asker.token);
    assert.equal(anon.status, 200, `câu hỏi ẩn danh: ${JSON.stringify(anon.data)}`);
    assert.equal(anon.data.question.authorName, 'Pháp Sư Ghibli', 'Ẩn danh phải giữ bí danh, không lộ tên thật');
    assert.notEqual(anon.data.question.authorName, 'Tên Thật Của Tôi', 'Không được lộ tên thật');
    assert.equal(anon.data.question.isAnonymous, true);
    /* Danh tính thật vẫn phải có để kiểm quyền chọn đáp án chuẩn. */
    assert.equal(anon.data.question.authorEmail, 'an-danh@example.com', 'authorEmail vẫn là thật để kiểm quyền');

    /* Câu hỏi KHÔNG ẩn danh thì vẫn chống mạo danh như test #30. */
    const normal = await post(env.baseUrl, '/api/questions', {
      title: 'Câu hỏi thường',
      content: 'Không ẩn danh.',
      authorEmail: 'an-danh@example.com',
      authorName: 'Super Admin Giả Mạo',
      authorAvatar: 'https://example.com/gia.jpg',
    }, asker.token);
    assert.equal(normal.status, 200);
    assert.equal(normal.data.question.authorName, 'Tên Thật Của Tôi', 'Không ẩn danh thì tên lấy từ bản ghi thật');
    assert.notEqual(normal.data.question.authorAvatar, 'https://example.com/gia.jpg');

    /* Ẩn danh không phải cửa sau để mạo danh: bí danh bị cắt độ dài. */
    const longAlias = await post(env.baseUrl, '/api/questions', {
      title: 'Bí danh dài',
      content: 'Thử cắt độ dài bí danh.',
      authorEmail: 'an-danh@example.com',
      isAnonymous: true,
      anonymousAlias: 'A'.repeat(500),
    }, asker.token);
    assert.equal(longAlias.status, 200);
    assert.ok(longAlias.data.question.authorName.length <= 120, `bí danh phải ≤120, thực tế ${longAlias.data.question.authorName.length}`);
  } finally {
    await env.close();
  }
});

test('39. WS nối lại phải đóng kênh SSE dự phòng — không xử lý sự kiện hai lần', () => {
  const store = fs.readFileSync(path.resolve('src/store/forumStore.ts'), 'utf8');

  const onOpenAt = store.indexOf('ws.onopen = () =>');
  assert.ok(onOpenAt > 0, 'phải có ws.onopen');
  const onOpenBlock = store.slice(onOpenAt, onOpenAt + 900);

  /*
    Trước khi vá, SSE chỉ bị đóng khi chính nó lỗi hoặc khi unmount. Sau một lần
    rớt mạng (WS đóng → SSE bật → WS nối lại sau 4 giây) cả hai kênh cùng sống,
    nên mọi sự kiện máy chủ bị handleServerBroadcast xử lý HAI LẦN: hai thông báo,
    hai tiếng chuông, hai toast cho cùng một tin.
  */
  assert.ok(
    onOpenBlock.includes('sse.close()') && onOpenBlock.includes('sse = null'),
    'ws.onopen phải đóng và giải phóng kênh SSE dự phòng'
  );

  /* Timer nối lại phải được dọn trước khi đặt timer mới. */
  const onCloseAt = store.indexOf('ws.onclose = () =>');
  assert.ok(onCloseAt > 0, 'phải có ws.onclose');
  const onCloseBlock = store.slice(onCloseAt, onCloseAt + 500);
  assert.ok(
    onCloseBlock.includes('clearTimeout(reconnectTimer)'),
    'onclose phải dọn timer cũ để không để lại timer mồ côi'
  );

  /* startSSE phải có guard chống tạo EventSource trùng. */
  assert.ok(
    store.includes('if (isDisposed || sse) return;'),
    'startSSE phải có guard chống tạo EventSource thứ hai'
  );
});

test('40. Tin chat phát lại không được đếm chưa đọc lần hai, và phải đọc ref người dùng', () => {
  const store = fs.readFileSync(path.resolve('src/store/forumStore.ts'), 'utf8');

  /*
    Cùng một tin tới được hai lần: qua BroadcastChannel (tab khác của cùng trình
    duyệt) và qua broadcast của máy chủ. Trước khi vá, `setUnreadChatCount(c => c+1)`
    nằm NGOÀI phần dedupe nên badge nhân đôi và chuông kêu hai lần.
  */
  assert.ok(
    store.includes('const noteChatMessage = (id: string): boolean =>'),
    'phải có hàm ghi nhận mã tin đã gặp'
  );

  const occurrences = store.split('noteChatMessage(newMsg.id)').length - 1;
  assert.equal(occurrences, 2, 'Cả hai đường nhận tin đều phải hỏi noteChatMessage');

  /* Số chưa đọc phải nằm sau khi biết tin là mới. */
  const checks = store.split('if (\n            !alreadySeen &&');
  assert.ok(checks.length >= 2, 'Cả hai nhánh phải chặn đếm trùng bằng alreadySeen');

  /*
    `handleServerBroadcast` nằm trong effect deps rỗng nên `currentUser` bị chốt ở
    lần render đầu (null khi chưa đăng nhập) — tin của chính mình cũng bị tính là
    chưa đọc. Phải đọc qua ref.
  */
  const serverBranchAt = store.indexOf('const handleServerBroadcast = ');
  const serverBranch = store.slice(serverBranchAt, serverBranchAt + 3000);
  const chatCaseAt = serverBranch.indexOf("case 'NEW_CHAT_MESSAGE'");
  const chatCase = serverBranch.slice(chatCaseAt, chatCaseAt + 1200);
  assert.ok(
    chatCase.includes('currentUserRef.current'),
    'Nhánh chat của server broadcast phải đọc currentUserRef, không đọc currentUser bị chốt'
  );
  assert.ok(
    !/newMsg\.authorId !== currentUser\?\.id/.test(chatCase),
    'Không được so với currentUser bị chốt trong closure'
  );

  /* Ref mirror phải được gán trong effect, không gán lúc render (react/refs). */
  assert.ok(
    /useEffect\(\(\) => \{\s*chatMessagesRef\.current = chatMessages;\s*\}, \[chatMessages\]\)/.test(store),
    'chatMessagesRef phải được đồng bộ trong effect'
  );
});

test('41. Bản ghi người dùng kiểu cũ thiếu trường không làm sập luồng duyệt CLB', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fforum-legacy-'));
  process.env.FFORUM_DATA_DIR = dir;

  /* Gieo một bản ghi kiểu cũ: có trước khi `scopedClubIds` tồn tại, nên thiếu
     hẳn trường này. `sanitizeUsers` chỉ spread thô nên nó đi thẳng vào store. */
  fs.writeFileSync(path.join(dir, 'forum-data.json'), JSON.stringify({
    users: {
      'legacy@example.com': {
        id: 'user-legacy-0001',
        name: 'Người Dùng Cũ',
        email: 'legacy@example.com',
        avatar: '',
        role: 'STUDENT',
        level: 3,
        xp: 400,
        coin: 100,
      },
    },
    passwords: {},
    clubs: [{
      id: 'club-legacy-0001',
      name: 'CLB Từ Bản Cũ',
      leaderId: 'user-legacy-0001',
      leaderName: 'Người Dùng Cũ',
      status: 'PENDING',
      foundingMembers: [],
      purpose: 'Kiểm tra khả năng tương thích ngược.',
      createdAt: '2024-01-01',
    }],
    clubPosts: [], questions: [], solutions: [], chatMessages: [], feedbacks: [], reports: [],
  }));

  const env = await createTestServer();
  try {
    const sync0 = await get(env.baseUrl, '/api/sync');
    const legacy = sync0.data.data.users['legacy@example.com'];
    assert.ok(legacy, 'Bản ghi kiểu cũ phải nạp được');
    /* sanitizeUsers phải lấp trường thiếu ngay khi nạp, không để undefined lọt
       vào store rồi nổ ở chỗ nào đó sâu bên trong một luồng mutate nhiều bước. */
    assert.ok(
      Array.isArray(legacy.scopedClubIds),
      `scopedClubIds phải được chuẩn hoá thành mảng, thực tế = ${JSON.stringify(legacy.scopedClubIds)}`
    );
    assert.equal(legacy.xp, 400, 'xp gốc phải giữ nguyên');

    const adminLogin = await post(env.baseUrl, '/api/auth/login', {
      email: 'anhtuantran0512@gmail.com',
      password: 'admin123',
    });
    assert.equal(adminLogin.status, 200, `admin login: ${JSON.stringify(adminLogin.data)}`);

    /* Đường WS: nhánh này spread `[...creator.scopedClubIds, clubId]` KHÔNG phòng
       undefined, nên scopedClubIds của bản ghi kiểu cũ làm ném TypeError. */
    const adminWs = await connectWs(env.wsUrl, adminLogin.data.token);
    try {
      adminWs.send('APPROVE_CLUB', 'club-legacy-0001');
      await sleep(400);
    } finally {
      adminWs.ws.close();
    }

    /* Đường HTTP (đã có `|| []`) cũng phải chạy được và cho cùng kết quả. */
    const approved = await post(env.baseUrl, '/api/clubs/approve', {
      clubId: 'club-legacy-0001',
    }, adminLogin.data.token);
    assert.equal(approved.status, 200, `duyệt CLB của user kiểu cũ: ${JSON.stringify(approved.data)}`);
    assert.equal(approved.data.club.status, 'APPROVED', 'Duyệt qua WS phải có hiệu lực');

    const sync1 = await get(env.baseUrl, '/api/sync');
    const after = sync1.data.data.users['legacy@example.com'];
    assert.equal(after.role, 'CLUB_LEADER', 'Chủ nhiệm kiểu cũ vẫn phải được thăng cấp');
    assert.ok(
      Array.isArray(after.scopedClubIds) && after.scopedClubIds.includes('club-legacy-0001'),
      `scopedClubIds phải được tạo và gắn CLB, thực tế = ${JSON.stringify(after.scopedClubIds)}`
    );
    /*
      TRƯỚC KHI VÁ, nhánh WS ném TypeError ngay tại dòng gán scopedClubIds nên các
      bước SAU đó không bao giờ chạy: xp đứng ở 400 thay vì 650, và
      persistStoreToDisk() không được gọi — CLB hiện là APPROVED trong RAM nhưng
      vẫn PENDING trên đĩa. Phải kiểm cả hai để không lọt trạng thái dở dang.
    */
    assert.equal(after.xp, 650, `xp phải được cộng 250, thực tế = ${after.xp}`);

    await sleep(400); /* chờ persistStoreToDisk (debounce 200ms) */
    const onDisk = JSON.parse(fs.readFileSync(path.join(dir, 'forum-data.json'), 'utf8'));
    const diskClub = (onDisk.clubs || []).find((c) => c.id === 'club-legacy-0001');
    assert.equal(diskClub?.status, 'APPROVED', 'Trạng thái duyệt phải được ghi xuống đĩa');
    const diskUser = onDisk.users['legacy@example.com'];
    assert.equal(diskUser?.xp, 650, 'XP phải được ghi xuống đĩa');
    assert.ok(
      Array.isArray(diskUser?.scopedClubIds) && diskUser.scopedClubIds.includes('club-legacy-0001'),
      'scopedClubIds phải được ghi xuống đĩa'
    );
  } finally {
    await env.close();
    process.env.FFORUM_DATA_DIR = DATA_DIR;
  }
});

test('42. fPoints không bị cộng đôi khi thiếu trường (thứ tự xp/fPoints)', async () => {
  const env = await createTestServer();
  try {
    /*
      Bản cũ viết `x.fPoints = (x.fPoints ?? x.xp) + N` SAU dòng `x.xp += N`.
      Nếu fPoints thiếu thì nhánh ?? lấy XP đã cộng làm gốc, thành cộng đôi:
      xp tăng N nhưng fPoints tăng 2N.
    */
    const solver = await register(env.baseUrl, 'Người Giải F', 'giai-f@example.com', 'mat-khau-giai-f-123');
    const asker = await register(env.baseUrl, 'Người Hỏi F', 'hoi-f@example.com', 'mat-khau-hoi-f-12345');

    const sync0 = await get(env.baseUrl, '/api/sync');
    const before = sync0.data.data.users['giai-f@example.com'];
    assert.equal(before.xp, 0, 'xp khởi điểm phải 0');
    assert.equal(before.fPoints, 0, 'fPoints khởi điểm phải 0');

    const asked = await post(env.baseUrl, '/api/questions', {
      title: 'Câu hỏi cho test fPoints',
      content: 'Cần kiểm tra fPoints không bị cộng đôi.',
      authorEmail: 'hoi-f@example.com',
      bountyCoin: 40,
    }, asker.token);
    assert.equal(asked.status, 200);

    const solved = await post(env.baseUrl, '/api/solutions', {
      questionId: asked.data.question.id,
      content: 'Đáp án là 42.',
      authorEmail: 'giai-f@example.com',
    }, solver.token);
    assert.equal(solved.status, 200);

    /* Người hỏi được +50 XP khi đặt câu hỏi. */
    const syncAsker = await get(env.baseUrl, '/api/sync');
    const askerRow = syncAsker.data.data.users['hoi-f@example.com'];
    assert.equal(askerRow.xp, askerRow.fPoints, `XP và fPoints của người hỏi phải bằng nhau: xp=${askerRow.xp} fPoints=${askerRow.fPoints}`);

    /* Người giải được +25 XP khi gửi lời giải. */
    const syncSolver1 = await get(env.baseUrl, '/api/sync');
    const solverMid = syncSolver1.data.data.users['giai-f@example.com'];
    assert.equal(solverMid.xp, 25, `xp người giải phải 25, thực tế ${solverMid.xp}`);
    assert.equal(solverMid.fPoints, 25, `fPoints phải bằng xp, thực tế ${solverMid.fPoints}`);

    /* Chọn đáp án chuẩn: thưởng = 40*0.5 + 100 = 120. */
    const best = await post(env.baseUrl, '/api/solutions/best', {
      questionId: asked.data.question.id,
      solutionId: solved.data.solution.id,
      authorEmail: 'hoi-f@example.com',
    }, asker.token);
    assert.equal(best.status, 200);

    const syncFinal = await get(env.baseUrl, '/api/sync');
    const after = syncFinal.data.data.users['giai-f@example.com'];
    assert.equal(after.xp, 145, `xp phải 25 + 120 = 145, thực tế ${after.xp}`);
    assert.equal(after.fPoints, after.xp, `fPoints phải bằng xp, thực tế fPoints=${after.fPoints} xp=${after.xp}`);
  } finally {
    await env.close();
  }
});

test('43. Tắt tiến trình phải ghi nốt thay đổi đang chờ — không mất lần ghi cuối', () => {
  const server = fs.readFileSync(path.resolve('server/forumServer.ts'), 'utf8');

  /*
    persistStoreToDisk debounce 200ms và gọi .unref(), nên timer không giữ tiến
    trình sống. Trước khi vá không có chỗ nào ghi nốt: tắt server trong vòng 200ms
    sau một thao tác là lần ghi cuối MẤT. Repro xác nhận trước khi vá không có cả
    tệp dữ liệu sau SIGTERM.
  */
  assert.ok(
    server.includes('function flushStoreToDisk()'),
    'phải có hàm ghi đồng bộ dùng được lúc tắt'
  );
  assert.ok(
    server.includes('function flushPendingSave()'),
    'phải có hàm ghi nốt lần thay đổi đang chờ'
  );
  assert.ok(
    server.includes('installShutdownFlush()'),
    'setupForumServer phải cài móc ghi khi tắt'
  );
  for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
    assert.ok(
      server.includes(`'${signal}'`),
      `phải ghi nốt khi nhận ${signal}`
    );
  }
  /* Bản hiện tại bọc trong một handler đặt tên để còn gỡ được khi reload
     module — chỉ cần khẳng định có gắn vào sự kiện 'exit' và nó gọi flush. */
  assert.ok(
    /process\.on\('exit',\s*exitHandler\)/.test(server),
    "phải ghi nốt ở sự kiện 'exit'"
  );
  assert.ok(
    /const exitHandler = \(\) => flushPendingSave\(\)/.test(server),
    "handler sự kiện 'exit' phải gọi flushPendingSave"
  );

  /* flushPendingSave chỉ ghi khi thực sự có lần ghi đang chờ. */
  const flushAt = server.indexOf('function flushPendingSave()');
  const flushBody = server.slice(flushAt, flushAt + 400);
  assert.ok(
    flushBody.includes('if (saveTimeout)'),
    'flushPendingSave phải kiểm tra có lần ghi đang chờ hay không'
  );
});

test('44. Ghi atomic và giữ lại tệp dữ liệu hỏng thay vì ghi đè mất', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fforum-atomic-'));
  process.env.FFORUM_DATA_DIR = dir;

  /* JSON cắt cụt — đúng thứ còn lại nếu writeFileSync bị ngắt giữa chừng. */
  const truncated = '{"users":{"a@b.com":{"id":"u1","name":"A","email":"a@b.com","xp":500,"coin":300}},"questions":[{"id":"q1"';
  fs.writeFileSync(path.join(dir, 'forum-data.json'), truncated);

  const env = await createTestServer();
  try {
    /* Kích hoạt một lần ghi. Trước khi vá, lần ghi này đè mất tệp hỏng vì
       store đã rơi về giá trị rỗng mặc định sau khi JSON.parse ném lỗi.
       Dùng /api/reports vì limiter của /api/chat đã bị test #23 làm cạn
       (limiter đặt ở cấp module nên dùng chung giữa các test trong cùng tiến trình). */
    const report = await post(env.baseUrl, '/api/reports', {
      reporterId: 'u-atomic',
      reporterName: 'Người Tố Cáo',
      reportedUserId: 'u-spam',
      reportedUserName: 'Kẻ Spam',
      reason: 'Spam',
      details: 'Kiểm tra tệp hỏng có bị ghi đè mất hay không.',
    });
    assert.equal(report.status, 200, `gửi tố cáo: ${JSON.stringify(report.data)}`);
    await sleep(400); /* chờ persistStoreToDisk */

    const files = fs.readdirSync(dir);
    const kept = files.find((f) => f.includes('.corrupt-'));
    assert.ok(kept, `Tệp hỏng phải được giữ lại để còn cứu, thực tế có: ${files.join(', ')}`);

    const raw = fs.readFileSync(path.join(dir, kept), 'utf8');
    assert.equal(raw, truncated, 'Bản giữ lại phải đúng nguyên văn nội dung hỏng ban đầu');
    assert.ok(raw.includes('"xp":500'), 'Dữ liệu cũ phải còn đọc được để khôi phục tay');

    /* Server vẫn phải chạy được và có tệp dữ liệu mới hợp lệ. */
    const fresh = JSON.parse(fs.readFileSync(path.join(dir, 'forum-data.json'), 'utf8'));
    assert.ok(Array.isArray(fresh.reports), 'Tệp mới phải là JSON hợp lệ');
    assert.equal(fresh.reports.length, 1, 'Tố cáo vừa gửi phải nằm trong tệp mới');
  } finally {
    await env.close();
    process.env.FFORUM_DATA_DIR = DATA_DIR;
  }
});

test('45. Ghi xuống đĩa phải atomic (ghi tệp tạm rồi rename)', () => {
  const server = fs.readFileSync(path.resolve('server/forumServer.ts'), 'utf8');
  const flushAt = server.indexOf('function flushStoreToDisk()');
  assert.ok(flushAt > 0, 'phải có flushStoreToDisk');
  const body = server.slice(flushAt, flushAt + 900);

  /*
    rename là atomic trên cùng hệ tệp, nên tệp dữ liệu không bao giờ ở trạng thái
    viết dở. Ghi thẳng bằng writeFileSync mà bị ngắt giữa chừng sẽ để lại JSON cắt
    cụt — không parse được, tức mất toàn bộ dữ liệu ở lần khởi động sau.
  */
  assert.ok(body.includes('renameSync(tmp, target)'), 'phải ghi tệp tạm rồi rename');
  assert.ok(body.includes('.tmp-'), 'tệp tạm phải có tên riêng theo pid');
  const writeAt = body.indexOf('writeFileSync(tmp');
  const renameAt = body.indexOf('renameSync(tmp, target)');
  assert.ok(writeAt > 0 && renameAt > writeAt, 'phải ghi tệp tạm TRƯỚC rồi mới rename');
  assert.ok(
    !/writeFileSync\(dataFilePath\(\)/.test(server),
    'không được ghi thẳng vào tệp dữ liệu nữa'
  );
});

test('46. REJECT_CLUB qua WS phải validate như bản HTTP và rút quyền chủ nhiệm', async () => {
  /* Limiter ở cấp module nên dùng chung cả tiến trình; đặt lại để không va trần
     giới hạn đăng ký 30 lượt/10 phút do các test trước đó đã dùng hết. */
  (await import('../server/forumServer.ts')).resetRateLimitersForTest();
  const env = await createTestServer();
  try {
    /* Quyền duyệt/từ chối CLB chỉ thuộc tài khoản Super Admin thật. */
    const adminLogin = await post(env.baseUrl, '/api/auth/login', {
      email: 'anhtuantran0512@gmail.com',
      password: 'admin123',
    });
    assert.equal(adminLogin.status, 200, `admin login: ${JSON.stringify(adminLogin.data)}`);
    const founder = await register(env.baseUrl, 'Sáng Lập Bị Từ Chối', 'founder-reject@example.com', 'mat-khau-founder-rej1');
    const adminWs = await connectWs(env.wsUrl, adminLogin.data.token);

    /* Tạo và duyệt một CLB để chủ nhiệm có quyền. */
    const created = await post(env.baseUrl, '/api/clubs', {
      name: 'CLB Sắp Bị Từ Chối',
      slogan: 'Kiểm thử rút quyền',
      purpose: 'Kiểm thử rằng từ chối một CLB đã duyệt thì rút lại quyền đã trao.',
    }, founder.token);
    assert.equal(created.status, 200);
    const clubId = created.data.club.id;

    adminWs.send('APPROVE_CLUB', { clubId });
    const approved = await adminWs.waitFor('APPROVE_CLUB');
    assert.ok(approved, 'duyệt CLB qua WS');

    const syncA = await get(env.baseUrl, '/api/sync');
    const leaderAfter = syncA.data.data.users['founder-reject@example.com'];
    assert.equal(leaderAfter.role, 'CLUB_LEADER', 'chủ nhiệm phải lên CLUB_LEADER');
    assert.ok(leaderAfter.scopedClubIds.includes(clubId), 'phải có mã CLB trong scopedClubIds');

    /* (a) Từ chối một mã không tồn tại phải báo NOT_FOUND, không phát sóng. */
    adminWs.send('REJECT_CLUB', { clubId: 'club-khong-ton-tai', reason: 'ma ảo' });
    const ghost = await adminWs.waitFor('NOT_FOUND');
    assert.ok(ghost, 'mã CLB không tồn tại phải trả NOT_FOUND');

    /* (b) Lý do phải bị cắt 500 ký tự. */
    adminWs.send('REJECT_CLUB', { clubId, reason: 'x'.repeat(5000) });
    const rejected = await adminWs.waitFor('REJECT_CLUB');
    assert.ok(rejected, 'từ chối CLB');
    assert.equal(String(rejected.payload?.reason || '').length, 500, 'lý do phải bị cắt còn 500 ký tự');

    /* (c) Phát sóng phải là bản đã làm sạch, không phải nguyên payload client. */
    assert.deepEqual(Object.keys(rejected.payload).sort(), ['clubId', 'reason'], 'payload phát ra chỉ có clubId và reason');

    /* (d) Chủ nhiệm phải bị rút quyền. */
    const syncR = await get(env.baseUrl, '/api/sync');
    const demoted = syncR.data.data.users['founder-reject@example.com'];
    assert.ok(!demoted.scopedClubIds.includes(clubId), 'mã CLB phải bị rút khỏi scopedClubIds');
    assert.equal(demoted.role, 'STUDENT', 'hết CLB nào thì phải hạ về STUDENT');
  } finally {
    await env.close();
  }
});

test('47. Không vượt được rate limit bằng cách giả header X-Forwarded-For', async () => {
  const env = await createTestServer();
  try {
    (await import('../server/forumServer.ts')).resetRateLimitersForTest();

    /*
      clientIpOf từng luôn tin X-Forwarded-For do client gửi, mà header đó client
      tự đặt được. Mọi rate limiter đều khoá theo IP nên chỉ cần đổi giá trị mỗi
      request là mỗi lần thử rơi vào một ô đếm khác nhau — toàn bộ chống
      brute-force bị vô hiệu.

      Repro với giới hạn đăng ký 30 lượt/10 phút:
        không đổi header    -> 30/60 thành công, 30 bị chặn
        đổi header mỗi lượt -> 61/61 thành công (vượt hoàn toàn)
    */
    const attempt = (i, headers) =>
      post(env.baseUrl, '/api/auth/register',
        { name: `Kẻ Thử ${i}`, email: `xff${i}@example.com`, password: 'mat-khau-xff-12345' },
        undefined, headers);

    /* Đổi IP giả mỗi lượt — phải bị chặn như thường, không được vượt trần. */
    let succeeded = 0;
    for (let i = 0; i < 45; i++) {
      const res = await attempt(i, { 'X-Forwarded-For': `10.0.${Math.floor(i / 250)}.${i % 250}` });
      if (res.status === 200) succeeded++;
    }
    assert.ok(
      succeeded <= 30,
      `Đổi X-Forwarded-For không được vượt trần 30 lượt đăng ký, thực tế thành công ${succeeded}/45`
    );
  } finally {
    await env.close();
  }
});

test('48. clientIpOf chỉ tin X-Forwarded-For khi khai báo đứng sau proxy', async () => {
  const { clientIpOf } = await import('../server/authGuard.ts');
  const reqWith = (xff) => ({ headers: { 'x-forwarded-for': xff }, socket: { remoteAddress: '203.0.113.7' } });

  const saved = process.env.FFORUM_TRUST_PROXY;
  try {
    /* Mặc định: bỏ qua header, dùng địa chỉ socket thật. */
    delete process.env.FFORUM_TRUST_PROXY;
    assert.equal(clientIpOf(reqWith('10.1.2.3')), '203.0.113.7',
      'Mặc định phải dùng địa chỉ socket, không tin header client gửi');

    /* Khi người vận hành khai báo đứng sau proxy thì mới dùng header. */
    process.env.FFORUM_TRUST_PROXY = '1';
    assert.equal(clientIpOf(reqWith('10.1.2.3, 10.0.0.1')), '10.1.2.3',
      'Khi bật FFORUM_TRUST_PROXY mới lấy IP từ header');
  } finally {
    if (saved === undefined) delete process.env.FFORUM_TRUST_PROXY;
    else process.env.FFORUM_TRUST_PROXY = saved;
  }
});

test('49. Nạp lại module server không được cộng dồn listener tín hiệu tắt', () => {
  const server = fs.readFileSync(path.resolve('server/forumServer.ts'), 'utf8');

  /*
    installShutdownFlush từng dùng cờ `shutdownHooksInstalled` ở CẤP MODULE để chỉ
    cài một lần. Nhưng Vite reload module server mỗi lần tệp thay đổi, nên biến đó
    bị đặt lại và mỗi lần reload cộng thêm một bộ handler mới.

    Repro (nạp module 6 lần qua query string khác nhau để Node tạo instance mới):
      trước khi sửa: SIGTERM = 1, 2, 3, 4, 5, 6
      sau khi sửa:   SIGTERM = 1, 1, 1, 1, 1, 1

    Nguy hiểm hơn việc tràn listener: handler của module CŨ vẫn giữ closure trỏ tới
    `store` của module cũ, nên nếu chúng chạy sẽ ghi đè tệp dữ liệu bằng bản đã
    lỗi thời.
  */
  assert.ok(
    server.includes("Symbol.for('fforum.shutdownHooks')"),
    'phải lưu trạng thái handler trên globalThis để sống sót qua reload module'
  );
  const installAt = server.indexOf('function installShutdownFlush()');
  assert.ok(installAt > 0, 'phải có installShutdownFlush');
  const body = server.slice(installAt, installAt + 1600);

  assert.ok(
    body.includes('removeListener'),
    'phải GỠ bộ handler của lần nạp module trước khi gắn bộ mới'
  );
  assert.ok(
    !/let shutdownHooksInstalled/.test(server),
    'không được dùng cờ cấp module để chặn cài lặp — nó bị reset khi reload'
  );
});
