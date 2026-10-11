/* Bản quyền trí tuệ thuộc về BroAmStuck
   Phản ứng nhanh dưới lời giải Hỏi đáp (👍 Hữu ích · 🤯 Hay đó · 🙏 Cảm ơn):
   phép tính thuần (shared/qaReactions), API máy chủ THẬT qua HTTP/WebSocket (đăng nhập, tự phản ứng, idempotent,
   nhiều người/nhiều loại, phát lại cho mọi kết nối, lưu qua khởi động lại, giới hạn tốc độ, tài khoản bị khoá),
   và những điều KHÔNG được đổi: không XP/Coin, không đụng `upvotes`, thưởng đáp án chuẩn giữ nguyên.
   (Phần giao diện nằm ở tests/qa-detail-page.test.mjs vì dùng chung khung jsdom.) */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { WebSocket } from 'ws';

/* Mỗi tệp test chạy trong một tiến trình riêng: chốt thư mục dữ liệu riêng TRƯỚC khi nạp máy chủ. */
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fforum-react-'));
process.env.FFORUM_DATA_DIR = DATA_DIR;
const TEST_ADMIN_PASSWORD = 'test-only-super-admin-password-2026';
process.env.FFORUM_ADMIN_PASSWORD = TEST_ADMIN_PASSWORD;

const { setupForumServer, resetRateLimitersForTest, flushPendingSave } = await import('../server/forumServer.ts');
const R = await import('../shared/qaReactions.ts');
const DATA_FILE = path.join(DATA_DIR, 'forum-data.json');
const read = (file) => fs.readFileSync(file, 'utf8');

/* ═════════════════════════════ Phép tính thuần ═════════════════════════════ */

test('Phản ứng nhanh: đúng 3 loại, đúng thứ tự, nhãn + emoji như thiết kế', () => {
  assert.deepEqual([...R.REACTION_KINDS], ['helpful', 'wow', 'thanks']);
  assert.deepEqual(
    R.REACTION_KINDS.map((kind) => `${R.REACTION_META[kind].emoji} ${R.REACTION_META[kind].label}`),
    ['👍 Hữu ích', '🤯 Hay đó', '🙏 Cảm ơn'],
  );
  for (const kind of R.REACTION_KINDS) assert.ok(R.REACTION_META[kind].hint.length > 5, `${kind} có gợi ý`);
  assert.equal(R.isReactionKind('helpful'), true);
  for (const bad of ['', 'like', 'HELPFUL', 'constructor', '__proto__', 'toString', 7, null, undefined, {}, ['wow']]) {
    assert.equal(R.isReactionKind(bad), false, `${String(bad)} không phải loại hợp lệ`);
  }
});

test('setReaction: đặt/bỏ đúng một lần, idempotent (cùng tham chiếu), không sửa đầu vào, mỗi loại độc lập', () => {
  const empty = undefined;
  const a = R.setReaction(empty, 'helpful', 'u1', true);
  assert.deepEqual(a, { helpful: ['u1'] });
  assert.equal(R.setReaction(a, 'helpful', 'u1', true), a, 'đã đặt rồi → trả về CHÍNH object cũ (bấm lặp không cộng dồn)');

  const snapshot = JSON.stringify(a);
  const b = R.setReaction(a, 'helpful', 'u2', true);
  assert.deepEqual(b, { helpful: ['u1', 'u2'] });
  assert.equal(JSON.stringify(a), snapshot, 'không sửa object đầu vào');
  assert.notEqual(b, a);

  const c = R.setReaction(b, 'thanks', 'u1', true);
  assert.deepEqual(c, { helpful: ['u1', 'u2'], thanks: ['u1'] }, 'mỗi người chọn được nhiều loại');
  assert.equal(R.reactionCount(c, 'helpful'), 2);
  assert.equal(R.reactionCount(c, 'wow'), 0);
  assert.equal(R.hasReacted(c, 'thanks', 'u1'), true);
  assert.equal(R.hasReacted(c, 'thanks', 'u2'), false);
  assert.equal(R.hasReacted(c, 'thanks', ''), false, 'không có người dùng → chưa chọn');
  assert.equal(R.hasReacted(c, 'thanks', null), false);

  const d = R.setReaction(c, 'thanks', 'u1', false);
  assert.deepEqual(d, { helpful: ['u1', 'u2'] }, 'bỏ người cuối cùng của một loại → xoá hẳn khoá loại đó');
  assert.equal(R.setReaction(d, 'thanks', 'u1', false), d, 'bỏ lặp là no-op');
  assert.deepEqual(R.setReaction(R.setReaction(d, 'helpful', 'u1', false), 'helpful', 'u2', false), {}, 'hết sạch → object rỗng');
  assert.deepEqual(R.setReaction(undefined, 'wow', 'u1', false), {}, 'bỏ khi chưa có gì → rỗng, không ném lỗi');
  assert.equal(R.reactionCount(undefined, 'wow'), 0);
  assert.equal(R.reactionCount(null, 'wow'), 0);
});

test('setReaction: có trần người cho mỗi loại — đủ rồi thì không thêm nữa nhưng người đã chọn vẫn bỏ được', () => {
  const ids = Array.from({ length: R.MAX_REACTORS_PER_KIND }, (_, i) => `u${i}`);
  const full = { wow: ids };
  assert.equal(R.setReaction(full, 'wow', 'newcomer', true), full, 'vượt trần → nguyên trạng');
  const afterLeave = R.setReaction(full, 'wow', 'u0', false);
  assert.equal(afterLeave.wow.length, R.MAX_REACTORS_PER_KIND - 1);
  assert.equal(R.setReaction(afterLeave, 'wow', 'newcomer', true).wow.length, R.MAX_REACTORS_PER_KIND, 'có chỗ trống lại thì thêm được');
});

test('sanitizeReactions: chỉ giữ loại hợp lệ, ID chuỗi không rỗng, không trùng, có trần; rác → undefined', () => {
  for (const junk of [null, undefined, 7, 'x', [], [['helpful']], {}, { bogus: ['a'] }, { helpful: 'nope' }, { helpful: [] }, { helpful: [1, null, {}, ' '] }]) {
    assert.equal(R.sanitizeReactions(junk), undefined, `rác ${JSON.stringify(junk)} → undefined`);
  }
  assert.deepEqual(
    R.sanitizeReactions({ helpful: ['a', 'a', ' b ', 7, null, '', 'x'.repeat(121)], wow: 'nope', thanks: ['c'], bogus: ['z'], __proto__: { wow: ['p'] } }),
    { helpful: ['a', 'b'], thanks: ['c'] },
  );
  const huge = R.sanitizeReactions({ helpful: Array.from({ length: R.MAX_REACTORS_PER_KIND + 50 }, (_, i) => `id-${i}`) });
  assert.equal(huge.helpful.length, R.MAX_REACTORS_PER_KIND, 'cắt theo trần');
  const clean = { thanks: ['c'] };
  assert.deepEqual(R.sanitizeReactions(clean), clean);
  assert.notEqual(R.sanitizeReactions(clean), clean, 'luôn trả bản sao, không dùng chung tham chiếu với dữ liệu vào');
});

/* ═════════════════════════════ Máy chủ thật ═════════════════════════════ */

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
          server.close(done);
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
const getSync = async (baseUrl) => (await (await fetch(`${baseUrl}/api/sync`)).json()).data;
let seq = 0;
const register = async (baseUrl, name) => {
  const email = `${name}-${Date.now()}-${seq += 1}@example.com`;
  const out = await post(baseUrl, '/api/auth/register', { name, email, password: 'mat-khau-phan-ung-12345' });
  assert.equal(out.status, 200, `đăng ký ${name}: ${JSON.stringify(out.data)}`);
  return { token: out.data.token, user: out.data.user, email };
};
function connectWs(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const inbox = [];
    const waiters = [];
    ws.on('message', (raw) => {
      let parsed;
      try { parsed = JSON.parse(raw.toString()); } catch { return; }
      const waiter = waiters.find((w) => w.type === parsed.type);
      if (waiter) { waiters.splice(waiters.indexOf(waiter), 1); waiter.resolve(parsed); } else inbox.push(parsed);
    });
    const waitFor = (type, timeoutMs = 1500) => new Promise((res, rej) => {
      const hit = inbox.find((m) => m.type === type);
      if (hit) { inbox.splice(inbox.indexOf(hit), 1); res(hit); return; }
      const waiter = { type, resolve: (msg) => { clearTimeout(timer); res(msg); } };
      /* Hết giờ thì GỠ người chờ khỏi hàng, nếu không nó nuốt mất sự kiện kế tiếp của lần chờ sau. */
      const timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); rej(new Error(`timeout chờ ${type}`)); }, timeoutMs);
      waiters.push(waiter);
    });
    ws.on('error', reject);
    ws.on('open', () => resolve({ ws, waitFor, inbox }));
  });
}

/** Một câu hỏi + một lời giải của người khác, sẵn sàng để phản ứng. */
async function seedQuestionWithSolution(baseUrl) {
  const asker = await register(baseUrl, 'asker');
  const solver = await register(baseUrl, 'solver');
  const asked = await post(baseUrl, '/api/questions', {
    title: 'Đạo hàm của x^3', content: 'Cần giải gấp', authorEmail: asker.email, authorName: 'asker', bountyCoin: 20,
  }, asker.token);
  assert.equal(asked.status, 200, JSON.stringify(asked.data));
  const answered = await post(baseUrl, '/api/solutions', {
    questionId: asked.data.question.id, content: '3x^2', authorEmail: solver.email, authorName: 'solver',
  }, solver.token);
  assert.equal(answered.status, 200, JSON.stringify(answered.data));
  return { asker, solver, questionId: asked.data.question.id, solutionId: answered.data.solution.id };
}
const react = (env, who, solutionId, kind, active) =>
  post(env.baseUrl, '/api/solutions/react', active === undefined ? { solutionId, kind } : { solutionId, kind, active }, who?.token);
const solutionOf = async (env, solutionId) => (await getSync(env.baseUrl)).solutions.find((s) => s.id === solutionId);

test('API: khách 401 · loại/tham số sai 400 · lời giải không có 404 · tự phản ứng lời giải của mình 409', async () => {
  const env = await createTestServer();
  try {
    const { asker, solver, solutionId } = await seedQuestionWithSolution(env.baseUrl);
    const fan = await register(env.baseUrl, 'fan');

    assert.equal((await react(env, null, solutionId, 'helpful', true)).status, 401, 'khách không phản ứng được');
    assert.equal((await post(env.baseUrl, '/api/solutions/react', { solutionId, kind: 'helpful' }, 'token-gia')).status, 401, 'token giả');
    assert.equal((await solutionOf(env, solutionId)).reactions, undefined, 'bị từ chối thì không để lại dấu vết');

    for (const [label, body] of [
      ['loại lạ', { solutionId, kind: 'love' }],
      ['thiếu loại', { solutionId }],
      ['thiếu id', { kind: 'helpful' }],
      ['id không phải chuỗi', { solutionId: 123, kind: 'helpful' }],
      ['loại là prototype', { solutionId, kind: '__proto__' }],
      ['active không phải boolean', { solutionId, kind: 'helpful', active: 'yes' }],
      ['active là số', { solutionId, kind: 'helpful', active: 1 }],
    ]) {
      const out = await post(env.baseUrl, '/api/solutions/react', body, fan.token);
      assert.equal(out.status, 400, `${label} → 400, nhận ${out.status}`);
    }
    assert.equal((await react(env, fan, 'sol-khong-ton-tai', 'helpful', true)).status, 404);

    const self = await react(env, solver, solutionId, 'thanks', true);
    assert.equal(self.status, 409, 'không tự bình chọn lời giải của chính mình');
    assert.match(self.data.message, /chính mình/);
    assert.equal((await solutionOf(env, solutionId)).reactions, undefined);
    /* Chủ câu hỏi là NGƯỜI KHÁC của lời giải nên được phản ứng. */
    assert.equal((await react(env, asker, solutionId, 'thanks', true)).status, 200);
  } finally {
    await env.close();
  }
});

test('API: bật/tắt đúng một lần, idempotent, nhiều người + nhiều loại; /api/sync chỉ chứa ID; KHÔNG đổi XP/Coin/upvotes', async () => {
  const env = await createTestServer();
  try {
    const { asker, solver, solutionId } = await seedQuestionWithSolution(env.baseUrl);
    const fan = await register(env.baseUrl, 'fan');
    const economy = (sync) => JSON.stringify([asker, solver, fan].map((who) => {
      const u = Object.values(sync.users).find((x) => x.id === who.user.id);
      return [u.xp, u.coin, u.level];
    }));
    const before = await getSync(env.baseUrl);
    const usersBefore = economy(before);
    const upvotesBefore = before.solutions.find((s) => s.id === solutionId).upvotes;

    const on = await react(env, fan, solutionId, 'helpful', true);
    assert.equal(on.status, 200);
    assert.deepEqual({ active: on.data.active, changed: on.data.changed, kind: on.data.kind }, { active: true, changed: true, kind: 'helpful' });
    assert.deepEqual(on.data.reactions, { helpful: [fan.user.id] });

    const again = await react(env, fan, solutionId, 'helpful', true);
    assert.equal(again.status, 200);
    assert.deepEqual({ active: again.data.active, changed: again.data.changed }, { active: true, changed: false }, 'gửi lại → không đổi');
    assert.deepEqual(again.data.reactions, { helpful: [fan.user.id] }, 'vẫn đúng 1, không nhảy 2');

    const asker1 = await react(env, asker, solutionId, 'helpful', true);
    assert.deepEqual(asker1.data.reactions.helpful.sort(), [asker.user.id, fan.user.id].sort(), 'người thứ hai cộng thêm đúng một');
    await react(env, fan, solutionId, 'thanks', true);
    await react(env, fan, solutionId, 'wow', true);
    const mid = await solutionOf(env, solutionId);
    assert.equal(mid.reactions.helpful.length, 2);
    assert.deepEqual(mid.reactions.thanks, [fan.user.id], 'một người chọn được nhiều loại');
    assert.deepEqual(mid.reactions.wow, [fan.user.id]);
    assert.ok(!JSON.stringify(mid.reactions).includes('@'), 'chỉ lưu ID tài khoản, không lộ email');

    /* thiếu `active` → đảo trạng thái */
    const toggledOff = await react(env, fan, solutionId, 'wow');
    assert.deepEqual({ active: toggledOff.data.active, changed: toggledOff.data.changed }, { active: false, changed: true });
    assert.equal(toggledOff.data.reactions.wow, undefined, 'người cuối bỏ → khoá loại biến mất');
    const toggledOn = await react(env, fan, solutionId, 'wow');
    assert.equal(toggledOn.data.active, true);
    const off = await react(env, fan, solutionId, 'wow', false);
    const offAgain = await react(env, fan, solutionId, 'wow', false);
    assert.equal(off.data.changed, true);
    assert.equal(offAgain.data.changed, false, 'bỏ lặp là no-op');

    await react(env, fan, solutionId, 'helpful', false);
    await react(env, asker, solutionId, 'helpful', false);
    await react(env, fan, solutionId, 'thanks', false);
    assert.equal((await solutionOf(env, solutionId)).reactions, undefined, 'hết sạch phản ứng → lời giải không mang trường `reactions`');

    /* Nghiệp vụ cũ không bị đụng tới. */
    const after = await getSync(env.baseUrl);
    assert.equal(economy(after), usersBefore, 'phản ứng không cộng/trừ XP, Coin hay cấp của ai');
    assert.equal(after.solutions.find((s) => s.id === solutionId).upvotes, upvotesBefore, '`upvotes` (nuôi thống kê hồ sơ) giữ nguyên');
  } finally {
    await env.close();
  }
});

test('WebSocket: mọi kết nối (kể cả khách) nhận ảnh chụp đầy đủ khi có thay đổi; thao tác no-op không phát gì', async () => {
  const env = await createTestServer();
  const observer = await connectWs(env.wsUrl);
  try {
    const { solutionId } = await seedQuestionWithSolution(env.baseUrl);
    const fan = await register(env.baseUrl, 'fan');
    observer.inbox.length = 0;

    await react(env, fan, solutionId, 'thanks', true);
    const event = await observer.waitFor('SOLUTION_REACTIONS');
    assert.equal(event.payload.solutionId, solutionId);
    assert.deepEqual(event.payload.reactions, { thanks: [fan.user.id] }, 'ảnh chụp ĐẦY ĐỦ (áp lại bao nhiêu lần cũng ra cùng kết quả)');

    await react(env, fan, solutionId, 'thanks', true); /* no-op */
    await assert.rejects(observer.waitFor('SOLUTION_REACTIONS', 350), /timeout/, 'không đổi gì thì không phát lại');

    await react(env, fan, solutionId, 'thanks', false);
    const cleared = await observer.waitFor('SOLUTION_REACTIONS');
    assert.deepEqual(cleared.payload, { solutionId, reactions: {} }, 'bỏ hết → ảnh chụp rỗng để mọi client xoá số đếm');
  } finally {
    observer.ws.close();
    await env.close();
  }
});

test('Lưu bền: sống qua khởi động lại, dữ liệu rác trên đĩa được làm sạch, đáp án chuẩn vẫn giữ phản ứng và đúng thưởng cũ', async () => {
  let env = await createTestServer();
  try {
    const { asker, solver, questionId, solutionId } = await seedQuestionWithSolution(env.baseUrl);
    const fan = await register(env.baseUrl, 'fan');
    /* Chờ qua khoảng gộp ghi 200ms để KHÔNG còn lần ghi nào đang chờ: chỉ chính endpoint phản ứng mới được đặt lịch ghi. */
    await sleep(450);
    await react(env, fan, solutionId, 'helpful', true);
    await react(env, fan, solutionId, 'wow', true);
    flushPendingSave();
    assert.deepEqual(JSON.parse(read(DATA_FILE)).solutions.find((s) => s.id === solutionId).reactions, { helpful: [fan.user.id], wow: [fan.user.id] },
      'phản ứng tự đặt lịch ghi xuống đĩa (không dựa vào một thao tác khác ghi hộ)');

    /* Tác giả câu hỏi chọn đáp án chuẩn SAU khi đã có phản ứng: phản ứng giữ nguyên, thưởng đúng như cũ (+5 upvote, coin cho người giải). */
    const before = await getSync(env.baseUrl);
    const solverCoinBefore = Object.values(before.users).find((u) => u.id === solver.user.id).coin;
    const best = await post(env.baseUrl, '/api/solutions/best', { questionId, solutionId, authorEmail: asker.email }, asker.token);
    assert.equal(best.status, 200, JSON.stringify(best.data));
    const picked = await solutionOf(env, solutionId);
    assert.equal(picked.isBest, true);
    assert.equal(picked.upvotes, 6, '1 + 5 — chỉ do việc chọn đáp án chuẩn, phản ứng không cộng thêm');
    assert.deepEqual(Object.keys(picked.reactions).sort(), ['helpful', 'wow'], 'chọn đáp án chuẩn không làm mất phản ứng');
    const solverCoinAfter = Object.values((await getSync(env.baseUrl)).users).find((u) => u.id === solver.user.id).coin;
    assert.ok(solverCoinAfter > solverCoinBefore, 'người giải vẫn nhận thưởng đáp án chuẩn như cũ');

    flushPendingSave();
    await env.close();
    const onDisk = JSON.parse(read(DATA_FILE));
    assert.deepEqual(onDisk.solutions.find((s) => s.id === solutionId).reactions.helpful, [fan.user.id], 'đã ghi xuống đĩa');

    /* Dữ liệu hỏng/độc hại trên đĩa không được lọt vào bộ nhớ. */
    onDisk.solutions.find((s) => s.id === solutionId).reactions = {
      helpful: [fan.user.id, fan.user.id, 7, null, `  ${asker.user.id}  `],
      bogus: ['x'],
      wow: 'không-phải-mảng',
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(onDisk));
    env = await createTestServer();
    const reloaded = await solutionOf(env, solutionId);
    assert.deepEqual(reloaded.reactions, { helpful: [fan.user.id, asker.user.id] }, 'chỉ còn ID hợp lệ, không trùng');
    assert.equal(reloaded.isBest, true);
    assert.equal(reloaded.upvotes, 6);

    /* Sau khi nạp lại vẫn phản ứng tiếp được. */
    const newfan = await register(env.baseUrl, 'newfan');
    assert.equal((await react(env, newfan, solutionId, 'thanks', true)).status, 200);
  } finally {
    await env.close();
  }
});

test('Giới hạn tốc độ theo TÀI KHOẢN: 60 lượt/phút; người khác không bị ảnh hưởng', async () => {
  const env = await createTestServer();
  try {
    const { solutionId } = await seedQuestionWithSolution(env.baseUrl);
    const spammer = await register(env.baseUrl, 'spammer');
    const other = await register(env.baseUrl, 'other');
    let ok = 0;
    for (let i = 0; i < 60; i += 1) {
      const out = await react(env, spammer, solutionId, 'helpful');
      if (out.status === 200) ok += 1;
    }
    assert.equal(ok, 60, '60 lượt đầu đều được (người thật bấm liên tục vẫn thoải mái)');
    const blocked = await react(env, spammer, solutionId, 'helpful');
    assert.equal(blocked.status, 429, 'lượt thứ 61 bị chặn');
    assert.ok(Number(blocked.res.headers.get('retry-after')) >= 1, 'kèm Retry-After');
    const fine = await react(env, other, solutionId, 'wow', true);
    assert.equal(fine.status, 200, 'tài khoản khác dùng bình thường');
  } finally {
    await env.close();
  }
});

test('Tài khoản bị khoá không phản ứng được (403); mở khoá thì được lại; lời giải bị xoá thì 404', async () => {
  const env = await createTestServer();
  try {
    const { solutionId } = await seedQuestionWithSolution(env.baseUrl);
    const fan = await register(env.baseUrl, 'fan');
    const login = await post(env.baseUrl, '/api/auth/login', { email: 'BroAmStuck@gmail.com', password: TEST_ADMIN_PASSWORD });
    assert.equal(login.status, 200, JSON.stringify(login.data));
    const adminToken = login.data.token;

    const ban = await post(env.baseUrl, '/api/admin/moderate', { email: fan.email, action: 'ban', durationMinutes: 60, reason: 'Thử khoá.' }, adminToken);
    assert.equal(ban.status, 200, JSON.stringify(ban.data));
    const denied = await react(env, fan, solutionId, 'helpful', true);
    assert.equal(denied.status, 403, 'tài khoản bị khoá không tương tác được');
    assert.equal((await solutionOf(env, solutionId)).reactions, undefined);

    const unban = await post(env.baseUrl, '/api/admin/moderate', { email: fan.email, action: 'unban' }, adminToken);
    assert.equal(unban.status, 200, JSON.stringify(unban.data));
    assert.equal((await react(env, fan, solutionId, 'helpful', true)).status, 200, 'mở khoá → phản ứng lại được');

    const removed = await post(env.baseUrl, '/api/solutions/delete', { solutionId }, adminToken);
    assert.equal(removed.status, 200, JSON.stringify(removed.data));
    assert.equal((await react(env, fan, solutionId, 'helpful', false)).status, 404, 'lời giải đã xoá → không còn gì để phản ứng');
    assert.equal((await getSync(env.baseUrl)).solutions.some((s) => s.id === solutionId), false, 'phản ứng đi theo lời giải, không rò rỉ');
  } finally {
    await env.close();
  }
});

/* ═════════════════════════════ Ràng buộc mã nguồn ═════════════════════════════ */

test('Mã nguồn: endpoint chỉ là tín hiệu xã hội (không XP/Coin/upvotes) và store nhận sự kiện qua đúng kênh máy chủ', () => {
  const server = read('server/forumServer.ts');
  const start = server.indexOf("url === '/api/solutions/react'");
  const end = server.indexOf("url === '/api/auth/register'", start);
  assert.ok(start > 0 && end > start, 'tìm thấy khối endpoint');
  const block = server.slice(start, end);
  assert.doesNotMatch(block, /grantCoinsAndExperience|upvotes|\.xp\b|\.coin\b|SYNC_USER/, 'không đụng tới thưởng/XP/upvotes');
  assert.match(block, /authenticatedUser\(req, body\)/, 'bắt buộc đăng nhập');
  assert.match(block, /checkCanPost\(actor\.user\.email, 'content'\)/, 'tài khoản bị khoá bị chặn như mọi đường ghi khác');
  assert.match(block, /reactionLimiter\.check/, 'có giới hạn tốc độ');
  assert.match(server, /reactionLimiter\.reset\(\)/, 'bộ giới hạn được đặt lại giữa các test như các bộ khác');
  assert.match(server, /parsed\.solutions\.map\(sanitizeLoadedSolution\)/, 'dữ liệu nạp từ đĩa đi qua bộ lọc');

  const store = read('src/store/forumStore.ts');
  const serverSwitchEnd = store.indexOf("case 'SOLUTION_REACTIONS'");
  assert.ok(serverSwitchEnd > 0, 'store xử lý SOLUTION_REACTIONS');
  assert.equal(store.split("case 'SOLUTION_REACTIONS'").length - 1, 1, 'chỉ ở bộ xử lý sự kiện máy chủ (không có sự kiện BroadcastChannel tương ứng)');
  assert.match(store, /reactToSolution,\n/, 'store xuất hành động cho giao diện');
  assert.match(store, /runServerAction\('\/api\/solutions\/react', \{ solutionId, kind, active \}\)/);
  assert.match(read('src/App.tsx'), /onReactSolution=\{reactToSolution\}/, 'App nối hành động vào trang Hỏi đáp');
  assert.match(read('src/components/views/QAForumView.tsx'), /onReactSolution=\{onReactSolution\}/, 'shell chuyền hành động xuống trang chi tiết');
  assert.match(read('src/components/views/qa/QADetailPage.tsx'), /onReact=\{onReactSolution\}/, 'trang chi tiết chuyền xuống từng thẻ');

  const action = store.slice(store.indexOf('const reactToSolution'), store.indexOf('const sendChatMessage'));
  assert.ok(action.length > 200, 'tìm thấy hành động reactToSolution');
  assert.match(action, /isAuthoredBy\(target, currentUser, currentUser\.email\.toLowerCase\(\)\)/, 'tự phản ứng bị chặn sớm kèm lời giải thích');
  assert.match(action, /reactionsInFlightRef\.current\.has\(key\)\) return;\s*reactionsInFlightRef\.current\.add\(key\);\s*const userId/,
    'bấm đúp/bấm dồn cùng một nút chỉ gửi MỘT yêu cầu (khoá đặt TRƯỚC khi cập nhật lạc quan)');
  assert.match(action, /const active = !hasReacted\(target\.reactions, kind, userId\);\s*setMine\(active\);/, 'cập nhật lạc quan: thấy ngay');
  assert.match(action, /if \(!outcome\.ok\) \{\s*setMine\(!active\);[\s\S]*?Chưa gửi được phản ứng/, 'lỗi → hoàn tác đúng trạng thái cũ và báo cho người dùng');
  assert.match(action, /setMine\(Boolean\(outcome\.data\?\.active\)\)/, 'thành công → chốt trạng thái CỦA MÌNH theo máy chủ');
  assert.doesNotMatch(action, /outcome\.data\?\.reactions/, 'không ghi đè phản ứng của người khác bằng phản hồi HTTP (có thể cũ hơn sự kiện WebSocket)');
  assert.match(action, /finally \{\s*reactionsInFlightRef\.current\.delete\(key\);/, 'luôn nhả khoá, kể cả khi ném lỗi');
  assert.match(store, /const clean = sanitizeReactions\(reactions\);\s*setSolutions\(prev => prev\.map\(s => \(s\.id === solutionId \? \{ \.\.\.s, reactions: clean \} : s\)\)\);/,
    'sự kiện WebSocket thay NGUYÊN ảnh chụp của đúng lời giải đó');
});
