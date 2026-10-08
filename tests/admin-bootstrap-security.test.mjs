/* Bản quyền trí tuệ thuộc về BroAmStuck */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fforum-admin-bootstrap-'));
process.env.FFORUM_DATA_DIR = DATA_DIR;
process.env.FFORUM_ADMIN_PASSWORD = 'too-short';

/* Mô phỏng một bản dữ liệu cũ: hash mật khẩu công khai từng có trong mã. */
const { hashPassword } = await import('../server/authGuard.ts');
const adminEmail = 'broamstuck@gmail.com';
fs.writeFileSync(path.join(DATA_DIR, 'forum-data.json'), JSON.stringify({
  users: {
    [adminEmail]: {
      id: 'user-admin',
      name: 'Trần Văn Anh Tuấn',
      email: 'BroAmStuck@gmail.com',
      role: 'SUPER_ADMIN',
      level: 150,
      xp: 45000,
      scopedClubIds: [],
    },
  },
  passwords: { [adminEmail]: hashPassword('admin123') },
}));

const { setupForumServer, flushPendingSave } = await import('../server/forumServer.ts');

test.after(() => fs.rmSync(DATA_DIR, { recursive: true, force: true }));

function createTestServer() {
  const middleware = [];
  const app = http.createServer((req, res) => {
    let index = 0;
    const next = () => {
      if (index < middleware.length) middleware[index++](req, res, next);
      else { res.statusCode = 404; res.end('Not Found'); }
    };
    next();
  });
  setupForumServer(app, { use(fn) { middleware.push(fn); } });
  const sockets = new Set();
  app.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  return new Promise((resolve) => {
    app.listen(0, '127.0.0.1', () => resolve({
      app,
      baseUrl: `http://127.0.0.1:${app.address().port}`,
      close: () => new Promise((done) => {
        app.close(done);
        for (const socket of sockets) socket.destroy();
        sockets.clear();
      }),
    }));
  });
}

const login = (baseUrl, password) => fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: adminEmail, password }),
});

test('Bootstrap production: thu hồi credential mẫu, yêu cầu secret mạnh và hỗ trợ xoay khoá', async () => {
  let saved;
  const firstServer = await createTestServer();
  try {
    assert.equal((await login(firstServer.baseUrl, 'admin123')).status, 400,
      'credential từng công khai phải bị vô hiệu hoá');
    assert.equal((await login(firstServer.baseUrl, 'too-short')).status, 400,
      'secret bootstrap ngắn hơn 12 ký tự không được chấp nhận');

    flushPendingSave();
    saved = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'forum-data.json'), 'utf8'));
    assert.equal(saved.passwords?.[adminEmail], undefined, 'bản ghi mật khẩu công khai phải bị xoá khỏi kho');
    assert.equal((await fetch(`${firstServer.baseUrl}/api/admin/analytics`)).status, 403,
      'không đăng nhập được thì không thể mở công cụ quản trị');
  } finally {
    await firstServer.close();
  }

  const bootstrapPassword = 'test-bootstrap-super-admin-password-2026';
  process.env.FFORUM_ADMIN_PASSWORD = bootstrapPassword;
  const secondServer = await createTestServer();
  try {
    assert.equal((await login(secondServer.baseUrl, bootstrapPassword)).status, 200,
      'secret mạnh phải bootstrap được tài khoản mới');
    flushPendingSave();
    saved = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'forum-data.json'), 'utf8'));
    assert.ok(saved.passwords[adminEmail].startsWith('scrypt$'), 'secret chỉ được lưu dưới dạng scrypt');
    assert.notEqual(saved.passwords[adminEmail], bootstrapPassword, 'không được ghi secret thô ra đĩa');
  } finally {
    await secondServer.close();
  }

  const rotatedPassword = 'test-rotated-super-admin-password-2026';
  process.env.FFORUM_ADMIN_PASSWORD = rotatedPassword;
  const thirdServer = await createTestServer();
  try {
    assert.equal((await login(thirdServer.baseUrl, bootstrapPassword)).status, 400,
      'secret cũ bị thu hồi sau khi nhà vận hành xoay secret');
    assert.equal((await login(thirdServer.baseUrl, rotatedPassword)).status, 200,
      'secret mới có hiệu lực ngay sau restart');
  } finally {
    await thirdServer.close();
  }
});
