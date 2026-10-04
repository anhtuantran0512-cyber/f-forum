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

const post = async (baseUrl, url, body, token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
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
    const at = store.indexOf(`fetch('${endpoint}'`);
    assert.ok(at > 0, `forumStore phải gọi ${endpoint}`);
    const block = store.slice(at, at + 260);
    assert.ok(block.includes('authHeaders()'), `${endpoint} phải gửi kèm token (authHeaders)`);
    assert.ok(
      !block.includes("headers: { 'Content-Type': 'application/json' }"),
      `${endpoint} không được dùng header trần`,
    );
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
