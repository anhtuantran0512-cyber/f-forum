/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * AI Moderation v1.0 — Kiểm duyệt câu trả lời theo mức độ LIÊN QUAN.
 *
 *  AM.1  Bộ lọc an toàn: spam link/quảng cáo/điện thoại/email/xúc phạm;
 *        "ngủ" (to sleep) KHÔNG bị coi là xúc phạm (đồng âm khi bỏ dấu).
 *  AM.2  Heuristic liên quan (không AI key): ma trận ví dụ đặc tả —
 *        on-topic, lạc đề, gián tiếp, một phần, lời khuyên, sai nhưng liên quan,
 *        phản biện, gõ không dấu, câu ngắn, đề mở.
 *  AM.3  moderateAnswer: spam → REJECT (bước an toàn riêng), on-topic → ACCEPT,
 *        engine 'heuristic' khi không có FFORUM_AI_API_KEY.
 *  AM.4  Prompt AI (khi có key) giữ đúng 4 nguyên tắc đặc tả.
 *  AM.5  E2E HTTP: ACCEPT đăng ngay; REJECT 422 + không lưu + giữ nội dung
 *        (feedback có nội dung); REVIEW → ẩn với người lạ, hiện với tác giả,
 *        vào hàng chờ Admin; Admin duyệt → công khai + thưởng; Admin từ chối
 *        → ẩn khỏi mọi nơi; client KHÔNG thể tự khai ACCEPT; retry cùng id
 *        không tạo bản ghi trùng.
 *  AM.6  E2E WS: lời giải lạc đề qua socket → SOLUTION_REJECTED, on-topic →
 *        NEW_SOLUTION phát ra bình thường.
 */
import { MASTER_ADMIN_EMAIL } from '../shared/identityStrings.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';

const TEST_ADMIN_PASSWORD = 'test-only-moderation-admin-pw-2026';
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fforum-amod-'));
process.env.FFORUM_DATA_DIR = DATA_DIR;
process.env.FFORUM_ADMIN_PASSWORD = TEST_ADMIN_PASSWORD;
/* Đảm bảo KHÔNG có AI key trong môi trường test → luôn đi nhánh heuristic
   tất định (kết quả reproducible giữa các lần chạy). */
delete process.env.FFORUM_AI_API_KEY;

const mod = await import('../server/answerModeration.ts');
const { setupForumServer } = await import('../server/forumServer.ts');

test.after(() => fs.rmSync(DATA_DIR, { recursive: true, force: true }));

/* ------------------------------ AM.1 — Safety ------------------------------ */

test('AM.1a an toàn: câu trả lời sạch không dính flag', () => {
  const r = mod.checkAnswerSafety('Dùng công thức nghiệm để giải phương trình, mình làm được rồi cảm ơn.');
  assert.equal(r.ok, true);
  assert.equal(r.flags.length, 0);
});

test('AM.1b an toàn: 3 link → spam-links', () => {
  const r = mod.checkAnswerSafety('Xem đây: https://a.com/1 https://b.com/2 https://c.com/3');
  assert.equal(r.ok, false);
  assert.ok(r.flags.includes('spam-links'));
});

test('AM.1c an toàn: quảng cáo + số điện thoại → spam-promo + pii-phone', () => {
  const r = mod.checkAnswerSafety('Sách giáo khoa giá rẻ, ship cod, hotline 0912345678 đặt hàng ngay!');
  assert.equal(r.ok, false);
  assert.ok(r.flags.includes('spam-promo'));
  assert.ok(r.flags.includes('pii-phone'));
});

test('AM.1d an toàn: lộ email → pii-email', () => {
  const r = mod.checkAnswerSafety('Liên hệ mình qua email hocsinh123@gmail.com để trao đổi nhé.');
  assert.equal(r.ok, false);
  assert.ok(r.flags.includes('pii-email'));
});

test('AM.1e an toàn: xúc phạm "đồ ngốc / ngu vo" → insult', () => {
  assert.ok(mod.checkAnswerSafety('Câu hỏi ngu vo quá, đồ ngốc.').flags.includes('insult'));
  assert.ok(mod.checkAnswerSafety('Sao ngu nhập vậy, trả lời đố ngu.').flags.includes('insult'));
});

test('AM.1f an toàn: "ngủ" (to sleep) KHÔNG phải xúc phạm — không chặn oan bài học tập', () => {
  const r = mod.checkAnswerSafety('Mình thường nghe nhạc tiếng Anh trước khi ngủ để nhớ từ lâu hơn.');
  assert.equal(r.ok, true, `chờ ok=true nhưng nhận flags: ${r.flags.join(',')}`);
});

/* --------------------------- AM.2 — Heuristic ------------------------------ */

const Q_QUADRATIC = {
  questionTitle: 'Làm sao giải phương trình bậc 2?',
  questionContent: 'Tôi không hiểu cách tìm nghiệm của phương trình bậc hai dạng ax^2+bx+c=0.',
  questionSubject: 'toan',
};

test('AM.2a on-topic → ACCEPT', () => {
  const r = mod.classifyRelevance({
    ...Q_QUADRATIC,
    answerContent: 'Bạn có thể dùng công thức nghiệm hoặc phân tích thành nhân tử. Ví dụ x^2-5x+6=0 có nghiệm 2 và 3.',
  });
  assert.equal(r.status, 'ACCEPT');
});

test('AM.2b lạc đề rõ ràng (bóng đá) → REJECT + feedback có nội dung', () => {
  const r = mod.classifyRelevance({
    ...Q_QUADRATIC,
    answerContent: 'Mình thích chơi bóng đá vào cuối tuần, đội mình vừa thắng 3-1.',
  });
  assert.equal(r.status, 'REJECT');
  assert.equal(r.relevance, 'LOW');
  assert.ok(r.feedback.length > 10, 'REJECT phải kèm phản hồi để học sinh sửa');
});

test('AM.2c liên quan gián tiếp (biến đổi khí hậu) → ACCEPT, không đòi từ khoá chính xác', () => {
  const r = mod.classifyRelevance({
    questionTitle: 'Tại sao biến đổi khí hậu là vấn đề lớn?',
    questionContent: 'Bài văn yêu cầu phân tích tác động của biến đổi khí hậu.',
    questionSubject: 'su',
    answerContent: 'Các khí nhà kính như CO2 giữ nhiệt trong khí quyển, khiến băng tan và mực nước biển dâng.',
  });
  assert.equal(r.status, 'ACCEPT');
});

test('AM.2d giải thích một phần (định luật 2 Newton) → ACCEPT', () => {
  const r = mod.classifyRelevance({
    questionTitle: 'Giải thích định luật 2 Newton',
    questionContent: 'Môn vật lý lớp 10, cần giải thích định luật 2 Newton có ví dụ.',
    questionSubject: 'ly',
    answerContent: 'Lực bằng khối lượng nhân gia tốc. Ví dụ chiếc xe 10kg đẩy 2N sẽ có gia tốc 0.2 m/s2.',
  });
  assert.equal(r.status, 'ACCEPT');
});

test('AM.2e lời khuyên học tiếng Anh → ACCEPT', () => {
  const r = mod.classifyRelevance({
    questionTitle: 'Học tiếng Anh như thế nào cho hiệu quả?',
    questionContent: 'Mình muốn cải thiện nghe nói tiếng Anh trong 3 tháng.',
    questionSubject: 'anh',
    answerContent: 'Mình nghe nhạc và xem phim có phụ đề tiếng Anh mỗi ngày, ghi chú từ mới rồi ôn lại trước khi ngủ.',
  });
  assert.equal(r.status, 'ACCEPT');
});

test('AM.2f SAI nhưng liên quan → KHÔNG bị REJECT (bot không chấm đúng/sai)', () => {
  const r = mod.classifyRelevance({
    ...Q_QUADRATIC,
    answerContent: 'Mình nghĩ nghiệm của mọi phương trình bậc 2 đều bằng 2, vậy nên đáp án luôn là 2.',
  });
  assert.notEqual(r.status, 'REJECT', 'đáp án sai nhưng đúng đề không được từ chối');
  assert.equal(r.status, 'ACCEPT');
});

test('AM.2g phản biện → ACCEPT (ý kiến trái chiều vẫn là liên quan)', () => {
  const r = mod.classifyRelevance({
    questionTitle: 'Tại sao nên đọc sách?',
    questionContent: 'Luận văn: đọc sách có cần thiết trong thời đại số?',
    questionSubject: 'van',
    answerContent: 'Mình cho là không cần thiết, vì video giải thích nhanh hơn sách nhiều. Nhưng sách vẫn tốt cho khả năng tập trung.',
  });
  assert.equal(r.status, 'ACCEPT');
});

test('AM.2h gõ không dấu / lỗi chính tả → vẫn ACCEPT', () => {
  const r = mod.classifyRelevance({
    ...Q_QUADRATIC,
    answerContent: 'phuong trinh bac hai thi dung cong thuc nghiem la ok nhe',
  });
  assert.equal(r.status, 'ACCEPT');
});

test('AM.2i câu ngắn KHÔNG BAO GIỜ bị REJECT vì ngắn (chưa rõ → REVIEW)', () => {
  const r = mod.classifyRelevance({
    questionTitle: 'Giải thích định luật 2 Newton',
    questionContent: 'Môn vật lý lớp 10, cần giải thích định luật 2 Newton có ví dụ.',
    questionSubject: 'ly',
    answerContent: 'F = m.a bạn ơi.',
  });
  assert.notEqual(r.status, 'REJECT', 'câu ngắn không được tự động từ chối');
  assert.equal(r.status, 'REVIEW');
});

test('AM.2j đề mở + trả lời chưa rõ → REVIEW (không kết án)', () => {
  const r = mod.classifyRelevance({
    questionTitle: 'Cái này là gì?',
    questionContent: 'Xem ảnh.',
    questionSubject: 'hotro',
    answerContent: 'Có lẽ nó là một hàm số liên quan đến toán, nhưng mình cũng không chắc lắm đâu.',
  });
  assert.equal(r.status, 'REVIEW');
});

/* --------------------------- AM.3 — Orchestrate ----------------------------- */

test('AM.3a moderateAnswer: spam → REJECT qua bước an toàn, lưu flags', async () => {
  const v = await mod.moderateAnswer({
    questionTitle: 'Học tiếng Anh như thế nào cho hiệu quả?',
    questionContent: 'Mình muốn cải thiện nghe nói tiếng Anh trong 3 tháng.',
    questionSubject: 'anh',
    answerContent: 'Shop giá rẻ https://a.com/b https://c.com/d https://e.com/f đặt hàng ngay hotline 0912345678',
  });
  assert.equal(v.status, 'REJECT');
  assert.equal(v.safety.ok, false);
  assert.ok(v.safety.flags.length > 0);
  assert.ok(v.reason.length > 0);
});

test('AM.3b moderateAnswer: on-topic → ACCEPT, engine heuristic (không key AI)', async () => {
  const v = await mod.moderateAnswer({
    ...Q_QUADRATIC,
    answerContent: 'Bạn có thể dùng công thức nghiệm hoặc phân tích thành nhân tử.',
  });
  assert.equal(v.status, 'ACCEPT');
  assert.equal(v.engine, 'heuristic');
  assert.ok(['HIGH', 'MEDIUM', 'LOW'].includes(v.relevance));
  assert.ok(typeof v.at === 'number');
});

test('AM.3c hợp đồng JSON verdict đầy đủ 4 key theo đặc tả', async () => {
  const v = await mod.moderateAnswer({
    ...Q_QUADRATIC,
    answerContent: 'Mình thích chơi bóng đá vào cuối tuần.',
  });
  for (const key of ['status', 'relevance', 'reason', 'feedback']) {
    assert.ok(key in v, `thiếu key ${key} trong verdict`);
  }
});

/* --------------------------- AM.4 — AI prompt ------------------------------ */

test('AM.4 prompt AI giữ đúng 4 nguyên tắc đặc tả', () => {
  const src = fs.readFileSync(
    path.resolve(new URL('.', import.meta.url).pathname, '..', 'server', 'answerModeration.ts'),
    'utf8',
  );
  assert.match(src, /Relevance is the ONLY criterion/i, 'prompt phải tuyên bố chỉ xét liên quan');
  assert.match(src, /never.*reject.*short|Do NOT reject short/i, 'prompt phải cấm từ chối vì ngắn');
  assert.match(src, /uncertain.*REVIEW|When uncertain/i, 'prompt phải hướng REVIEW khi không chắc');
  assert.match(src, /"status":"ACCEPT\|REJECT\|REVIEW"/, 'prompt phải định dạng JSON status đúng');
  assert.match(src, /FFORUM_AI_API_KEY/, 'key AI phải đọc từ env server-side');
});

/* ------------------------------- E2E setup --------------------------------- */

function createTestServer() {
  const middlewares = [];
  const runner = { use(fn) { middlewares.push(fn); } };
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
  setupForumServer(server, runner);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({
        server,
        port,
        baseUrl: `http://127.0.0.1:${port}`,
        wsUrl: `ws://127.0.0.1:${port}/ws`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

const post = async (baseUrl, url, body, token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${url}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return { status: res.status, data: await res.json().catch(() => null) };
};

const get = async (baseUrl, url, token) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${url}`, { headers });
  return { status: res.status, data: await res.json().catch(() => null) };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const register = async (baseUrl, name, email, password) => {
  const out = await post(baseUrl, '/api/auth/register', { name, email, password });
  assert.equal(out.status, 200, `register ${email}: ${JSON.stringify(out.data)}`);
  return out.data;
};

async function openWsAuthed(wsUrl, token) {
  const ws = new WebSocket(wsUrl);
  const inbox = [];
  ws.on('message', (raw) => {
    try { inbox.push(JSON.parse(raw.toString())); } catch { /* ignore */ }
  });
  await new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); });
  ws.send(JSON.stringify({ type: 'AUTH', payload: { token } }));
  await sleep(120);
  return { ws, inbox };
}

/* ------------------------------- AM.5 — HTTP -------------------------------- */

test('AM.5 E2E: full luồng ACCEPT / REJECT / REVIEW / hàng chờ Admin', async () => {
  const env = await createTestServer();
  try {
    const uA = await register(env.baseUrl, 'Người Hỏi', 'amod-asker@test.local', 'pass12345');
    const uB = await register(env.baseUrl, 'Người Trả', 'amod-answerer@test.local', 'pass12345');
    const uC = await register(env.baseUrl, 'Người Xem', 'amod-observer@test.local', 'pass12345');
    const adminLogin = await post(env.baseUrl, '/api/auth/login', {
      email: MASTER_ADMIN_EMAIL,
      password: TEST_ADMIN_PASSWORD,
    });
    assert.equal(adminLogin.status, 200, `admin login: ${JSON.stringify(adminLogin.data)}`);
    const adminToken = adminLogin.data.token;

    /* Câu hỏi toan rõ chủ đề (tác giả A). */
    const q1 = await post(env.baseUrl, '/api/questions', {
      id: `q-amod-${Date.now()}`,
      title: 'Làm sao giải phương trình bậc 2?',
      content: 'Tôi không hiểu cách tìm nghiệm của phương trình bậc hai dạng ax^2+bx+c=0.',
      subject: 'toan',
      authorEmail: uA.user.email,
      token: uA.token,
    });
    assert.equal(q1.status, 200, `create q1: ${JSON.stringify(q1.data)}`);

    /* --- ACCEPT: trả lời đúng đề → đăng ngay, có thưởng 25 --- */
    const solAccept = {
      id: `sol-amod-accept-${Date.now()}`,
      questionId: q1.data.question.id,
      content: 'Bạn có thể dùng công thức nghiệm hoặc phân tích thành nhân tử, ví dụ x^2-5x+6=0 có nghiệm 2 và 3.',
      authorEmail: uB.user.email,
      authorName: uB.user.name,
    };
    const coinBefore = uB.user.coin;
    const r1 = await post(env.baseUrl, '/api/solutions', { ...solAccept, token: uB.token });
    assert.equal(r1.status, 200, `accept: ${JSON.stringify(r1.data)}`);
    assert.equal(r1.data.solution.status, 'active');
    assert.equal(r1.data.moderation.status, 'ACCEPT');
    assert.equal(r1.data.reward, 25, 'trả lời được chấp nhận nhận thưởng 25');
    assert.ok(r1.data.solution.moderation && r1.data.solution.moderation.at > 0, 'verdict được lưu kèm lời giải (audit)');

    /* --- REJECT: lạc đề → 422, KHÔNG lưu, client tự khai ACCEPT cũng vô ích --- */
    const r2 = await post(env.baseUrl, '/api/solutions', {
      id: `sol-amod-reject-${Date.now()}`,
      questionId: q1.data.question.id,
      content: 'Mình thích chơi bóng đá vào cuối tuần, đội mình vừa thắng 3-1 nên vui lắm.',
      authorEmail: uB.user.email,
      authorName: uB.user.name,
      /* Cố tình nhét verdict do client tự khai — server phải bỏ qua. */
      moderation: { status: 'ACCEPT', relevance: 'HIGH', reason: 'client-side', feedback: '' },
      status: 'active',
      token: uB.token,
    });
    assert.equal(r2.status, 422, `reject: ${JSON.stringify(r2.data)}`);
    assert.equal(r2.data.code, 'ANSWER_REJECTED');
    assert.equal(r2.data.moderation.status, 'REJECT');
    assert.ok(String(r2.data.moderation.feedback).length > 10, 'kèm feedback thân thiện để sửa');
    /* Không có bản ghi nào cho lời giải bị từ chối. */
    const syncAfterReject = await get(env.baseUrl, '/api/sync', uB.token);
    const leaked = (syncAfterReject.data.data.solutions || []).find(
      (s) => String(s.content || '').includes('bóng đá vào cuối tuần, đội mình vừa thắng 3-1'),
    );
    assert.equal(leaked, undefined, 'lời giải bị REJECT không được lưu bất kỳ đâu');

    /* --- REVIEW: đề mở + trả lời chưa rõ → vào hàng chờ --- */
    const q2 = await post(env.baseUrl, '/api/questions', {
      id: `q-amod2-${Date.now()}`,
      title: 'Cái này là gì?',
      content: 'Xem ảnh.',
      subject: 'hotro',
      authorEmail: uA.user.email,
      token: uA.token,
    });
    assert.equal(q2.status, 200, `create q2: ${JSON.stringify(q2.data)}`);
    const r3 = await post(env.baseUrl, '/api/solutions', {
      id: `sol-amod-review-${Date.now()}`,
      questionId: q2.data.question.id,
      content: 'Có lẽ nó là một hàm số liên quan đến toán, nhưng mình cũng không chắc lắm đâu.',
      authorEmail: uB.user.email,
      authorName: uB.user.name,
      token: uB.token,
    });
    assert.equal(r3.status, 200, `review: ${JSON.stringify(r3.data)}`);
    assert.equal(r3.data.solution.status, 'review');
    assert.equal(r3.data.moderation.status, 'REVIEW');
    assert.equal(r3.data.reward, 0, 'chưa đăng thì chưa được thưởng');
    const reviewSol = r3.data.solution;

    /* Người lạ (C) KHÔNG thấy nội dung chờ duyệt trong sync. */
    const syncC = await get(env.baseUrl, '/api/sync', uC.token);
    const cSeesReview = (syncC.data.data.solutions || []).some((s) => s.id === reviewSol.id);
    assert.equal(cSeesReview, false, 'câu trả lời chờ duyệt phải ẩn với người lạ');

    /* Tác giả (B) VẪN thấy câu trả lời của mình ở trạng thái chờ. */
    const syncB = await get(env.baseUrl, '/api/sync', uB.token);
    const bSeesReview = (syncB.data.data.solutions || []).find((s) => s.id === reviewSol.id);
    assert.ok(bSeesReview, 'tác giả phải thấy câu trả lời chờ duyệt của mình');
    assert.equal(bSeesReview.status, 'review');

    /* Hàng chờ Admin: không token → 403; admin → thấy đầy đủ. */
    const forbidden = await get(env.baseUrl, '/api/admin/moderation/answers', null);
    assert.equal(forbidden.status, 403, 'hàng chờ chỉ dành cho nhân sự kiểm duyệt');
    const queue1 = await get(env.baseUrl, '/api/admin/moderation/answers', adminToken);
    assert.equal(queue1.status, 200);
    const inQueue = (queue1.data.queue || []).find((s) => s.id === reviewSol.id);
    assert.ok(inQueue, 'câu chờ duyệt phải có trong hàng chờ Admin');
    assert.equal(inQueue.questionTitle, 'Cái này là gì?');
    assert.ok(inQueue.moderation && inQueue.moderation.reason);

    /* --- Admin DUYỆT → công khai cho mọi người + thưởng 25 --- */
    const coinBeforeApprove = (await get(env.baseUrl, '/api/sync', uB.token)).data.data.users[uB.user.email].coin;
    const appr = await post(env.baseUrl, '/api/admin/moderation/answers', {
      solutionId: reviewSol.id,
      action: 'approve',
      note: 'Liên quan, cho đăng',
    }, adminToken);
    assert.equal(appr.status, 200, `approve: ${JSON.stringify(appr.data)}`);
    assert.equal(appr.data.reward, 25, 'duyệt câu chờ → phát thưởng 25');
    const syncCAfter = await get(env.baseUrl, '/api/sync', uC.token);
    const nowPublic = (syncCAfter.data.data.solutions || []).find((s) => s.id === reviewSol.id);
    assert.ok(nowPublic, 'sau khi duyệt, câu trả lời hiện với người lạ');
    assert.equal(nowPublic.status, 'active');
    assert.ok(nowPublic.moderation.review && nowPublic.moderation.review.by, 'lưu lại người duyệt (audit)');
    const coinAfterApprove = (await get(env.baseUrl, '/api/sync', uB.token)).data.data.users[uB.user.email].coin;
    assert.equal(coinAfterApprove, coinBeforeApprove + 25, 'tác giả nhận thưởng khi câu chờ được duyệt');

    /* --- Admin TỪ CHỐI → ẩn khỏi mọi nơi, không xoá dữ liệu (status deleted) --- */
    const q3 = await post(env.baseUrl, '/api/questions', {
      id: `q-amod3-${Date.now()}`,
      title: 'Cái này là gì vậy?',
      content: 'Nhìn hình này giúp mình.',
      subject: 'hotro',
      authorEmail: uA.user.email,
      token: uA.token,
    });
    const r5 = await post(env.baseUrl, '/api/solutions', {
      id: `sol-amod-review2-${Date.now()}`,
      questionId: q3.data.question.id,
      content: 'Có thể liên quan đến đồ thị hàm số, nhưng mình cũng không thật sự chắc.',
      authorEmail: uB.user.email,
      authorName: uB.user.name,
      token: uB.token,
    });
    assert.equal(r5.status, 200, `review2: ${JSON.stringify(r5.data)}`);
    assert.equal(r5.data.solution.status, 'review', `đề mở 2 kỳ vọng REVIEW: ${JSON.stringify(r5.data.moderation)}`);
    const rej = await post(env.baseUrl, '/api/admin/moderation/answers', {
      solutionId: r5.data.solution.id,
      action: 'reject',
    }, adminToken);
    assert.equal(rej.status, 200, `admin reject: ${JSON.stringify(rej.data)}`);
    const syncBAfterRej = await get(env.baseUrl, '/api/sync', uB.token);
    assert.equal(
      (syncBAfterRej.data.data.solutions || []).some((s) => s.id === r5.data.solution.id),
      false,
      'sau khi Admin từ chối, câu trả lời ẩn với cả tác giả',
    );
    const queue2 = await get(env.baseUrl, '/api/admin/moderation/answers', adminToken);
    assert.equal(
      (queue2.data.queue || []).some((s) => s.id === r5.data.solution.id),
      false,
      'câu đã xử lý không còn trong hàng chờ',
    );

    /* --- Idempotent retry: POST lại đúng id+content đã ACCEPT → không trùng --- */
    const countBefore = (await get(env.baseUrl, '/api/sync', uC.token)).data.data.solutions.filter(
      (s) => s.questionId === q1.data.question.id,
    ).length;
    const retry = await post(env.baseUrl, '/api/solutions', { ...solAccept, token: uB.token });
    assert.equal(retry.status, 200);
    assert.equal(retry.data.duplicate, true, 'retry cùng id phải được nhận dạng là bản đã nhận');
    const countAfter = (await get(env.baseUrl, '/api/sync', uC.token)).data.data.solutions.filter(
      (s) => s.questionId === q1.data.question.id,
    ).length;
    assert.equal(countAfter, countBefore, 'retry không tạo bản ghi lời giải mới');

    /* Phần thưởng của lần accept đầu vẫn đúng một lần. */
    const uBFinal = (await get(env.baseUrl, '/api/sync', uB.token)).data.data.users[uB.user.email];
    assert.equal(uBFinal.coin, coinBefore + 25 + 25, 'tổng thưởng = 1 lần ACCEPT + 1 lần duyệt, không lặp');
  } finally {
    await env.close();
  }
});

/* ------------------------------- AM.6 — WS ---------------------------------- */

test('AM.6 E2E WS: lạc đề → SOLUTION_REJECTED riêng, on-topic → NEW_SOLUTION công khai', async () => {
  const env = await createTestServer();
  try {
    const uA = await register(env.baseUrl, 'WS Hỏi', 'amod-ws-asker@test.local', 'pass12345');
    const uB = await register(env.baseUrl, 'WS Trả', 'amod-ws-answerer@test.local', 'pass12345');

    const q = await post(env.baseUrl, '/api/questions', {
      id: `q-amod-ws-${Date.now()}`,
      title: 'Phương trình bậc nhất một ẩn giải thế nào?',
      content: 'Mình chưa biết cách đưa về dạng ax+b=0 để tìm x.',
      subject: 'toan',
      authorEmail: uA.user.email,
      token: uA.token,
    });
    assert.equal(q.status, 200);

    const { ws: wsB, inbox: inboxB } = await openWsAuthed(env.wsUrl, uB.token);
    const { ws: wsC, inbox: inboxC } = await openWsAuthed(env.wsUrl, (await register(env.baseUrl, 'WS Xem', 'amod-ws-observer@test.local', 'pass12345')).token);
    await sleep(80);

    /* (1) Lạc đề qua socket → riêng tư SOLUTION_REJECTED, không có bản ghi. */
    wsB.send(JSON.stringify({
      type: 'NEW_SOLUTION',
      payload: {
        id: `sol-ws-rej-${Date.now()}`,
        questionId: q.data.question.id,
        content: 'Chiều nay mưa to quá, mình nghỉ học nên không đi chơi được.',
      },
    }));
    await sleep(400);
    const rejected = inboxB.find((m) => m.type === 'SOLUTION_REJECTED');
    assert.ok(rejected, 'tác giả phải nhận SOLUTION_REJECTED qua socket');
    assert.equal(rejected.payload.moderation.status, 'REJECT');
    assert.equal(
      inboxC.some((m) => m.type === 'NEW_SOLUTION' && m.payload.id === rejected.payload.solutionId),
      false,
      'câu bị từ chối không được phát ra hệ thống',
    );

    /* (2) Đúng đề qua socket → NEW_SOLUTION phát công khai. */
    wsB.send(JSON.stringify({
      type: 'NEW_SOLUTION',
      payload: {
        id: `sol-ws-ok-${Date.now()}`,
        questionId: q.data.question.id,
        content: 'Bạn chuyển vế rồi chia cho hệ số của x là ra nghiệm, ví dụ 2x+3=7 thì x=2.',
      },
    }));
    await sleep(400);
    const publishedC = inboxC.find((m) => m.type === 'NEW_SOLUTION' && m.payload.questionId === q.data.question.id);
    assert.ok(publishedC, 'câu trả lời on-topic qua WS vẫn được phát công khai');
    assert.equal(publishedC.payload.moderation.status, 'ACCEPT');

    wsB.close();
    wsC.close();
  } finally {
    await env.close();
  }
});
