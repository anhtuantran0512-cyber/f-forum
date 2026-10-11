/* Bản quyền trí tuệ thuộc về BroAmStuck
   Trang chi tiết Hỏi đáp (/hoi-dap/:id-slug) thay cho modal: định tuyến + Back khôi phục vị trí cuộn, trạng thái câu hỏi,
   đáp án chính thức nổi lên đầu, câu hỏi liên quan / top người giải tuần, soạn lời giải (+25 XP, nháp, bảng ký hiệu),
   và nghiệp vụ cũ giữ nguyên (chỉ tác giả/Super Admin xác nhận, đăng nhập mới gửi được, 38 ký hiệu, máy chủ quyết định thưởng). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const route = await import('../src/utils/qaRoute.ts');
const detail = await import('../src/utils/qaDetail.ts');
const { MATH_SYMBOLS } = await import('../src/utils/mathSymbols.ts');
const { solverAwardFor } = await import('../server/authGuard.ts');
const read = (file) => fs.readFileSync(file, 'utf8');

/* ═════════════════════════════ Địa chỉ & slug ═════════════════════════════ */

test('Slug tiếng Việt: bỏ dấu, chữ mũ thành số, đ → d, cắt theo ranh giới từ', () => {
  assert.equal(route.slugifyVi('Đạo hàm của pt x³+2x²+x+4'), 'dao-ham-cua-pt-x3-2x2-x-4');
  assert.equal(route.slugifyVi('ĐƯỜNG ĐI ĐẾN TRƯỜNG'), 'duong-di-den-truong');
  assert.equal(route.slugifyVi('  ∑ ∫ √  '), '', 'toàn ký hiệu → rỗng');
  assert.equal(route.slugifyVi(undefined), '');
  const text = 'một câu hỏi rất rất dài về phương trình vi phân cấp hai với hệ số hằng và vế phải đặc biệt cần giúp gấp';
  const long = route.slugifyVi(text);
  const full = route.slugifyVi(text, 1000);
  assert.ok(long.length <= 60 && long.length > 30, 'không dài quá 60 ký tự');
  assert.doesNotMatch(long, /^-|-$/, 'không có gạch nối thừa ở hai đầu');
  assert.ok(full.startsWith(long) && full[long.length] === '-', 'cắt đúng ở ranh giới từ (không bỏ lửng giữa chữ)');
  assert.equal(route.slugifyVi('abcdefghij'.repeat(10)).length, 60, 'một từ dài không có ranh giới → cắt cứng ở 60');
});

test('Đường dẫn: /hoi-dap/<id>-<slug>; tiêu đề toàn ký hiệu thì chỉ còn id; đọc ngược được', () => {
  const path = route.buildQuestionPath('q-1788000000000-ab12c', 'Đạo hàm của pt x³+2x²+x+4');
  assert.equal(path, '/hoi-dap/q-1788000000000-ab12c-dao-ham-cua-pt-x3-2x2-x-4');
  assert.equal(route.buildQuestionPath('q-1', '∑∫'), '/hoi-dap/q-1');
  assert.equal(route.buildQuestionPageUrl('https://f.forum', 'q-1', 'Tích phân'), 'https://f.forum/hoi-dap/q-1-tich-phan');
  assert.deepEqual(route.parseQaPath(path), { kind: 'detail', key: 'q-1788000000000-ab12c-dao-ham-cua-pt-x3-2x2-x-4' });
});

test('parseQaPath: danh sách, dấu / cuối, đoạn hỏng/độc hại quay về danh sách; địa chỉ ngoài Hỏi đáp là null', () => {
  assert.deepEqual(route.parseQaPath('/hoi-dap'), { kind: 'list' });
  assert.deepEqual(route.parseQaPath('/hoi-dap/'), { kind: 'list' });
  assert.deepEqual(route.parseQaPath('/hoi-dap/q-1-abc'), { kind: 'detail', key: 'q-1-abc' });
  assert.deepEqual(route.parseQaPath('/hoi-dap/q-1-abc/'), { kind: 'detail', key: 'q-1-abc' });
  assert.deepEqual(route.parseQaPath('/hoi-dap/%3Cscript%3Ealert(1)%3C%2Fscript%3E'), { kind: 'list' });
  assert.deepEqual(route.parseQaPath('/hoi-dap/%E0%A4%A'), { kind: 'list' }, 'mã % hỏng không làm vỡ');
  assert.deepEqual(route.parseQaPath(`/hoi-dap/${'a'.repeat(161)}`), { kind: 'list' }, 'chặn đoạn quá dài');
  for (const other of ['/', '', '/hoi-dapx', '/hoi-dap-khac', '/Hoi-Dap', '/chat', '/?q=1']) {
    assert.equal(route.parseQaPath(other), null, `"${other}" không thuộc Hỏi đáp`);
    assert.equal(route.isQaPath(other), false);
  }
  assert.equal(route.isQaPath('/hoi-dap/x'), true);
});

test('resolveQuestionKey: id chứa gạch nối nên khớp theo TIỀN TỐ id dài nhất, không cắt ở gạch nối đầu', () => {
  const ids = ['q-1', 'q-1788-ab12c', 'q-1788-ab12c-extra', 'q-2'];
  assert.equal(route.resolveQuestionKey('q-1788-ab12c', ids), 'q-1788-ab12c', 'khớp đúng id');
  assert.equal(route.resolveQuestionKey('q-1788-ab12c-dao-ham-x3', ids), 'q-1788-ab12c', 'id + slug');
  assert.equal(route.resolveQuestionKey('q-1788-ab12c-extra-tieu-de', ids), 'q-1788-ab12c-extra', 'id dài hơn thắng id là tiền tố của nó');
  assert.equal(route.resolveQuestionKey('q-12-abc', ids), null, 'q-1 KHÔNG được khớp nhầm q-12');
  assert.equal(route.resolveQuestionKey('q-3-abc', ids), null);
  assert.equal(route.resolveQuestionKey('q-2', ids), 'q-2');
  assert.equal(route.resolveQuestionKey('anything', []), null);
});

/* ═════════════════════════════ Trạng thái & sắp xếp lời giải ═════════════════════════════ */

test('Trạng thái câu hỏi: 🟡 chờ · 🔵 thảo luận · 🟢 đã có lời giải đúng', () => {
  assert.equal(detail.questionStatusOf({ isSolved: false }, []), 'waiting');
  assert.equal(detail.questionStatusOf({ isSolved: false }, [{ isBest: false }]), 'discussing');
  assert.equal(detail.questionStatusOf({ isSolved: false }, [{ isBest: false }, { isBest: true }]), 'solved', 'có lời giải isBest');
  assert.equal(detail.questionStatusOf({ isSolved: true }, []), 'solved', 'cờ isSolved của câu hỏi (khớp thẻ ở danh sách)');
  assert.deepEqual(Object.keys(detail.QUESTION_STATUS_META).sort(), ['discussing', 'solved', 'waiting']);
  assert.equal(detail.QUESTION_STATUS_META.solved.label, 'Đã có lời giải đúng');
  assert.equal(detail.QUESTION_STATUS_META.discussing.label, 'Đang thảo luận');
  assert.equal(detail.QUESTION_STATUS_META.waiting.label, 'Đang chờ giải đáp');
});

test('Đáp án chính thức nổi lên ĐẦU; còn lại giữ thứ tự gốc; không sửa mảng đầu vào', () => {
  const input = [{ id: 'a' }, { id: 'b', isBest: true }, { id: 'c' }, { id: 'd' }];
  const snapshot = JSON.stringify(input);
  assert.deepEqual(detail.orderSolutions(input).map((s) => s.id), ['b', 'a', 'c', 'd']);
  assert.equal(JSON.stringify(input), snapshot);
  assert.deepEqual(detail.orderSolutions([{ id: 'x' }, { id: 'y' }]).map((s) => s.id), ['x', 'y'], 'không có đáp án chuẩn → giữ nguyên');
});

test('Phần thưởng đáp án chuẩn khớp công thức của máy chủ (50% cược + 100 Coin)', () => {
  for (const bounty of [10, 20, 33, 50, 100]) assert.equal(detail.bestRewardCoin(bounty), solverAwardFor(bounty), `bounty ${bounty}`);
  assert.equal(detail.bestRewardCoin(undefined), solverAwardFor(20), 'không có bounty → mặc định 20 như giao diện cũ');
  assert.equal(detail.bestRewardCoin(20), 110);
});

/* ═════════════════════════════ Câu hỏi liên quan ═════════════════════════════ */

test('Câu hỏi liên quan: cùng chủ đề trước; khác chủ đề chỉ khi trùng ≥ 2 từ khoá; loại chính nó; ổn định; có giới hạn', () => {
  const cur = { id: 'q0', title: 'Đạo hàm của hàm số bậc ba', content: 'cần giải gấp', subject: 'toan', createdAtMs: 100 };
  const all = [
    cur,
    { id: 'q1', title: 'Tích phân từng phần', subject: 'toan', createdAtMs: 300 },
    { id: 'q2', title: 'Đạo hàm của hàm số bậc hai', subject: 'toan', createdAtMs: 200 },
    { id: 'q3', title: 'Đạo hàm hàm số trong vật lý', subject: 'ly', createdAtMs: 400 },
    { id: 'q4', title: 'Đạo diễn phim nổi tiếng', subject: 'ly', createdAtMs: 500 },
    { id: 'q5', title: 'Cách ôn thi cuối kỳ', subject: 'hotro', createdAtMs: 600 },
  ];
  const result = detail.relatedQuestions(cur, all, 5).map((q) => q.id);
  assert.ok(!result.includes('q0'), 'không gợi ý chính nó');
  assert.equal(result[0], 'q2', 'cùng chủ đề + trùng nhiều từ khoá nhất');
  assert.ok(result.indexOf('q2') < result.indexOf('q3') && result.indexOf('q1') < result.indexOf('q3'), 'cùng chủ đề trước khác chủ đề');
  assert.ok(result.includes('q3'), 'khác chủ đề nhưng trùng ≥ 2 từ khoá (đạo hàm, hàm, số)');
  assert.ok(!result.includes('q4'), 'khác chủ đề, chỉ trùng 1 từ khoá → loại');
  assert.ok(!result.includes('q5'), 'không liên quan → loại');
  assert.equal(detail.relatedQuestions(cur, all, 1).length, 1, 'tôn trọng giới hạn');
  assert.deepEqual(detail.relatedQuestions(cur, all, 5).map((q) => q.id), result, 'xác định: cùng đầu vào → cùng thứ tự');
  /* đồng điểm → mới hơn trước, rồi theo id */
  const tied = [cur, { id: 'b', title: 'xyz', subject: 'toan', createdAtMs: 10 }, { id: 'a', title: 'xyz', subject: 'toan', createdAtMs: 10 }, { id: 'c', title: 'xyz', subject: 'toan', createdAtMs: 99 }];
  assert.deepEqual(detail.relatedQuestions(cur, tied, 5).map((q) => q.id), ['c', 'a', 'b']);
  assert.deepEqual(detail.relatedQuestions(cur, [], 5), []);
  assert.deepEqual(detail.relatedQuestions(cur, tied, 0), []);
});

/* ═════════════════════════════ Top người giải tuần này ═════════════════════════════ */

test('Top người giải tuần: chỉ lời giải có mốc trong tuần (thứ Hai 0h → nay); 25 điểm/lời giải + 100/đáp án chuẩn; gộp theo email', () => {
  const now = new Date(2026, 9, 14, 10, 0, 0).getTime(); /* thứ Tư 14/10/2026 */
  const monday = new Date(2026, 9, 12, 0, 0, 0).getTime();
  assert.equal(detail.weekStartOf(now), monday);
  assert.equal(detail.weekStartOf(monday), monday, 'chính thứ Hai 0h vẫn thuộc tuần này');
  assert.equal(detail.weekStartOf(monday - 1), new Date(2026, 9, 5, 0, 0, 0).getTime(), 'Chủ nhật 23:59:59 thuộc tuần trước');

  const sol = (over) => ({ authorId: 'u', authorName: 'Ẩn', authorAvatar: '/x.png', authorLevel: 1, ...over });
  const solutions = [
    sol({ authorId: 'u1', authorName: 'Nam', authorEmail: 'Nam@x.vn', createdAtMs: monday }),
    sol({ authorId: 'u1', authorName: 'Nam', authorEmail: 'nam@x.vn', createdAtMs: now - 1000, isBest: true }),
    sol({ authorId: 'u2', authorName: 'Lan', authorEmail: 'lan@x.vn', createdAtMs: now - 5000 }),
    sol({ authorId: 'u2', authorName: 'Lan', authorEmail: 'lan@x.vn', createdAtMs: now - 6000 }),
    sol({ authorId: 'u3', authorName: 'Cũ', authorEmail: 'cu@x.vn', createdAtMs: monday - 1 }),
    sol({ authorId: 'u4', authorName: 'Thiếu mốc', authorEmail: 'tm@x.vn' }),
    sol({ authorId: 'u5', authorName: 'Tương lai', authorEmail: 'tl@x.vn', createdAtMs: now + 3 * 3600_000 }),
    sol({ authorId: 'u6', authorName: 'Khách', createdAtMs: now - 10, isBest: false }),
  ];
  const users = { 'nam@x.vn': { id: 'u1', name: 'Nam Anh (hồ sơ)', avatar: '/nam.png', email: 'nam@x.vn', level: 7 } };
  const top = detail.topSolversThisWeek(solutions, users, now, 5);
  assert.deepEqual(top.map((t) => t.name), ['Nam Anh (hồ sơ)', 'Lan', 'Khách'], 'bỏ tuần trước, thiếu mốc, mốc ở tương lai');
  assert.deepEqual(top[0], { key: 'nam@x.vn', authorId: 'u1', name: 'Nam Anh (hồ sơ)', avatar: '/nam.png', level: 7, email: 'nam@x.vn', solved: 2, best: 1, points: 2 * 25 + 100 });
  assert.equal(top[1].points, 50);
  assert.equal(top[2].key, 'u6', 'không có email thì gộp theo authorId');
  assert.equal(detail.topSolversThisWeek(solutions, users, now, 2).length, 2, 'giới hạn');
  assert.deepEqual(detail.topSolversThisWeek([], {}, now), []);
  assert.deepEqual(detail.topSolversThisWeek(solutions, undefined, now, 1).map((t) => t.name), ['Nam'], 'không có sổ người dùng thì dùng tên trong lời giải');
});

/* ═════════════════════════════ Soạn lời giải & tiến độ đọc ═════════════════════════════ */

test('Chèn ký hiệu đúng chỗ con trỏ / thay vùng bôi đen; vượt 1500 ký tự thì không chèn', () => {
  assert.deepEqual(detail.insertAtSelection('abcdef', 3, 3, '√'), { text: 'abc√def', caret: 4 });
  assert.deepEqual(detail.insertAtSelection('abcdef', 1, 4, 'π'), { text: 'aπef', caret: 2 }, 'thay phần đang bôi đen');
  assert.deepEqual(detail.insertAtSelection('abc', null, null, '²'), { text: 'abc²', caret: 4 }, 'không biết con trỏ → cuối văn bản');
  assert.deepEqual(detail.insertAtSelection('abc', -5, 99, '°'), { text: '°', caret: 1 }, 'ép về biên hợp lệ (cả đoạn bị thay)');
  const full = 'x'.repeat(1500);
  assert.deepEqual(detail.insertAtSelection(full, 10, 10, '√'), { text: full, caret: 10 }, 'đủ 1500 → giữ nguyên, không cắt cụt công thức');
  assert.equal(detail.insertAtSelection('x'.repeat(1499), 0, 0, '√').text.length, 1500);
});

test('Bảng ký hiệu: đúng 38 ký tự, không trùng, mỗi ký hiệu 1 đơn vị (để maxLength đếm chính xác)', () => {
  assert.equal(MATH_SYMBOLS.length, 38);
  assert.equal(new Set(MATH_SYMBOLS).size, 38);
  for (const symbol of MATH_SYMBOLS) assert.equal(symbol.length, 1, `"${symbol}"`);
});

test('Tiến độ đọc: 0 khi không có gì để cuộn; kẹp trong [0,1]', () => {
  assert.equal(detail.readingProgress(0, 500, 500), 0);
  assert.equal(detail.readingProgress(0, 505, 500), 0, 'chênh ≤ 8px coi như không cuộn được');
  assert.equal(detail.readingProgress(0, 1500, 500), 0);
  assert.equal(detail.readingProgress(500, 1500, 500), 0.5);
  assert.equal(detail.readingProgress(1000, 1500, 500), 1);
  assert.equal(detail.readingProgress(1400, 1500, 500), 1, 'cuộn quá đà (đàn hồi) vẫn là 1');
  assert.equal(detail.readingProgress(-30, 1500, 500), 0);
});

/* ═════════════════════════════ jsdom: hook định tuyến + trang thật ═════════════════════════════ */

const dom = new JSDOM(
  '<!doctype html><html><head><title>F-Forum</title><meta name="description" content="Mô tả gốc"></head><body><div id="root"></div></body></html>',
  { url: 'http://localhost:5173/hoi-dap', pretendToBeVisual: true },
);
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent',
  'CustomEvent', 'MutationObserver', 'getComputedStyle', 'HTMLInputElement', 'HTMLTextAreaElement']) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: dom.window[key] });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
dom.window.Element.prototype.scrollIntoView = function scrollIntoView() { this.dataset.scrolled = 'true'; };
const alerts = [];
globalThis.alert = (message) => alerts.push(message);
dom.window.alert = globalThis.alert;
dom.window.AnimationEvent = dom.window.Event;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/* Khi một khẳng định đỏ giữa chừng, cây React còn sống (interval/timeout của component) sẽ giữ tiến trình test không thoát.
   Mọi test DOM phải gỡ root trong `finally` bằng hàm này; `after` cuối tệp là lưới an toàn thứ hai. */
const safeUnmount = async (React, root) => {
  try {
    await React.act(async () => root.unmount());
  } catch {
    /* đã gỡ rồi */
  }
};
test.after(() => {
  dom.window.close();
  setTimeout(() => process.exit(process.exitCode ?? 0), 50).unref();
});
const resetUrl = (url = '/hoi-dap', state = null) => dom.window.history.replaceState(state, '', url);
const tick = (React, ms = 0) => React.act(async () => { await sleep(ms); });
const waitFor = async (React, predicate, label, ms = 3000) => {
  const started = Date.now();
  while (Date.now() - started < ms) {
    if (predicate()) return;
    await tick(React, 25);
  }
  assert.fail(`Hết thời gian chờ: ${label}`);
};

test('Hook định tuyến: URL khớp phân khu, liên kết cũ ?q= được chuẩn hoá, Back/Forward qua ranh giới Hỏi đáp', async () => {
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { createServer } = await import('vite');
  const { default: reactPlugin } = await import('@vitejs/plugin-react');
  const vite = await createServer({ configFile: false, plugins: [reactPlugin()], server: { middlewareMode: true }, appType: 'custom' });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    const router = await vite.ssrLoadModule('/src/utils/qaRouter.ts');
    /* Component thử nghiệm báo trạng thái ra ngoài qua effect (không gán biến ngoài lúc render). */
    const probe = { view: null, setView: null };
    const Harness = ({ initial }) => {
      const [view, setView] = React.useState(initial);
      React.useEffect(() => {
        probe.view = view;
        probe.setView = setView;
      }, [view, setView]);
      router.useQaUrlSync(view, setView);
      const routeNow = router.useQaRoute();
      return React.createElement('i', { 'data-view': view, 'data-route': JSON.stringify(routeNow) });
    };
    const mount = async (initial, url, state = null) => {
      await React.act(async () => root.render(null));
      resetUrl(url, state);
      await React.act(async () => root.render(React.createElement(Harness, { key: `${initial}${url}${Math.random()}`, initial })));
    };
    const here = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

    await mount('qa', '/');
    assert.equal(here(), '/hoi-dap', 'vào Hỏi đáp → thanh địa chỉ là /hoi-dap');
    assert.equal(window.history.state.ffView, 'qa');

    await mount('home', '/hoi-dap/q-1-abc');
    assert.equal(here(), '/', 'sang phân khu khác → trả địa chỉ về /');
    assert.equal(window.history.state.ffView, 'home', 'nhớ phân khu để Forward biết về đâu');

    await mount('chat', '/');
    assert.equal(here(), '/', 'phân khu khác không bị đụng tới');

    const lengthBefore = window.history.length;
    await mount('qa', '/?q=q-1788-ab12c&tab=2#top');
    assert.equal(here(), '/hoi-dap/q-1788-ab12c?tab=2#top', 'liên kết cũ ?q= → đường dẫn mới, giữ tham số khác');
    assert.equal(window.history.length, lengthBefore, 'replaceState, không thêm mục lịch sử');

    await mount('qa', '/hoi-dap/');
    assert.equal(here(), '/hoi-dap', 'dấu / cuối được chuẩn hoá');
    await mount('qa', '/hoi-dap/%3Cscript%3E');
    assert.equal(here(), '/hoi-dap', 'đoạn hỏng/độc hại → về danh sách chuẩn');
    await mount('qa', '/hoi-dap/q-1-abc');
    assert.equal(here(), '/hoi-dap/q-1-abc', 'trang chi tiết hợp lệ giữ nguyên');
    assert.equal(host.firstChild.dataset.route, JSON.stringify({ kind: 'detail', key: 'q-1-abc' }));

    /* Back/Forward đi qua ranh giới Hỏi đáp ↔ phân khu khác */
    await mount('chat', '/', { ffView: 'chat' });
    await React.act(async () => {
      window.history.pushState({ ffNav: true }, '', '/hoi-dap');
      window.dispatchEvent(new window.PopStateEvent('popstate'));
    });
    assert.equal(probe.view, 'qa', 'Back/Forward tới đường dẫn Hỏi đáp → mở phân khu Hỏi đáp');
    await React.act(async () => {
      window.history.pushState({ ffNav: true, ffView: 'clubs' }, '', '/');
      window.dispatchEvent(new window.PopStateEvent('popstate'));
    });
    assert.equal(probe.view, 'clubs', 'rời Hỏi đáp qua Back/Forward → về phân khu đã nhớ trong state');
    await React.act(async () => { probe.setView('qa'); });
    await React.act(async () => {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new window.PopStateEvent('popstate'));
    });
    assert.equal(probe.view, 'home', 'state không có phân khu → về Trang chủ');
    await React.act(async () => { probe.setView('qa'); });
    await React.act(async () => {
      window.history.pushState({ ffView: 'không-có-thật' }, '', '/');
      window.dispatchEvent(new window.PopStateEvent('popstate'));
    });
    assert.equal(probe.view, 'home', 'phân khu lạ trong state bị bỏ qua');

  } finally {
    await safeUnmount(React, root);
    await vite.close();
  }
});

test('Điều hướng: độ sâu chi tiết nối tiếp, bộ nhớ danh sách trên mục lịch sử, "Quay lại" lùi đúng số bước', async () => {
  const { createServer } = await import('vite');
  const { default: reactPlugin } = await import('@vitejs/plugin-react');
  const vite = await createServer({ configFile: false, plugins: [reactPlugin()], server: { middlewareMode: true }, appType: 'custom' });
  try {
    const router = await vite.ssrLoadModule('/src/utils/qaRouter.ts');
    resetUrl('/hoi-dap', null);
    assert.equal(router.getQaDepth(), 0);
    assert.equal(router.readQaListMemory(), null);

    router.rememberQaList({ tag: 'toan', search: 'đạo hàm', savedOnly: false, scrollTop: 640, focusId: 'q-9' });
    assert.deepEqual(router.readQaListMemory(), { tag: 'toan', search: 'đạo hàm', savedOnly: false, scrollTop: 640, focusId: 'q-9' });
    router.navigateTo('/hoi-dap', { replace: true });
    assert.equal(router.readQaListMemory()?.scrollTop, 640, 'chỉ thay URL (chuẩn hoá) không làm mất bộ nhớ danh sách');
    router.navigateTo('/hoi-dap', { replace: true, reset: true, state: { ffView: 'qa' } });
    assert.equal(router.readQaListMemory(), null, 'reset (đổi phân khu) xoá bộ nhớ cũ');

    for (const bad of [{ tag: 1, search: '', savedOnly: false, scrollTop: 1 }, { tag: 'a', search: '', savedOnly: 'no', scrollTop: 1 }, { tag: 'a', search: '', savedOnly: false, scrollTop: -5 }, { tag: 'a', search: '', savedOnly: false, scrollTop: NaN }]) {
      dom.window.history.replaceState({ ffQaList: bad }, '');
      assert.equal(router.readQaListMemory(), null, `bộ nhớ hỏng bị bỏ qua: ${JSON.stringify(bad)}`);
    }

    resetUrl('/hoi-dap', null);
    const lengthBefore = window.history.length;
    router.navigateTo('/hoi-dap/q-1-a', { state: { ffQaDepth: 1 } });
    router.navigateTo('/hoi-dap/q-2-b', { state: { ffQaDepth: 2 } });
    assert.equal(window.history.length, lengthBefore + 2, 'mỗi câu hỏi là một mục lịch sử riêng');
    assert.equal(router.getQaDepth(), 2);
    router.navigateTo('/hoi-dap/q-2-b', { state: { ffQaDepth: 2 } });
    assert.equal(window.history.length, lengthBefore + 2, 'cùng địa chỉ thì không chồng thêm mục');

    const calls = [];
    const realGo = dom.window.history.go.bind(dom.window.history);
    dom.window.history.go = (delta) => { calls.push(delta); };
    try {
      router.leaveQaDetail();
    } finally {
      dom.window.history.go = realGo;
    }
    assert.deepEqual(calls, [-2], 'đi từ danh sách qua 2 câu → lùi đúng 2 bước (không để lịch sử phình thêm)');

    /* vào thẳng bằng link (không có danh sách phía sau) → mở danh sách như một điều hướng bình thường */
    resetUrl('/hoi-dap/q-3-c', null);
    const before = window.history.length;
    router.leaveQaDetail();
    assert.equal(window.location.pathname, '/hoi-dap');
    assert.equal(window.history.length, before + 1);

    const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
    assert.equal(router.isPlainLeftClick(click), true);
    for (const patch of [{ button: 1 }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { defaultPrevented: true }]) {
      assert.equal(router.isPlainLeftClick({ ...click, ...patch }), false, JSON.stringify(patch));
    }
  } finally {
    await vite.close();
  }
});

/* ───────── Trang chi tiết: mount component thật ───────── */
const NOW = Date.now();
const question = (id, over = {}) => ({
  id, title: `Câu hỏi ${id} về đạo hàm`, subject: 'toan', content: `Nội dung ${id}`, authorId: 'u-author', authorName: 'Tác giả',
  authorAvatar: '/a.png', isAnonymous: false, createdAt: 'Vừa xong', createdAtMs: NOW, isSolved: false, views: 3, bountyCoin: 20, ...over,
});
const solution = (id, questionId, over = {}) => ({
  id, questionId, authorId: `u-${id}`, authorName: `Người giải ${id}`, authorEmail: `${id}@example.com`, authorAvatar: '/s.png',
  authorLevel: 2, content: `Lời giải ${id}`, createdAt: 'Vừa xong', createdAtMs: NOW, isBest: false, upvotes: 1, ...over,
});
const author = { id: 'u-author', name: 'Tác giả', email: 'author@example.com', avatar: '/a.png', role: 'STUDENT', level: 3 };
const outsider = { id: 'u-out', name: 'Người ngoài', email: 'out@example.com', avatar: '/o.png', role: 'STUDENT', level: 1 };
const admin = { id: 'u-admin', name: 'Admin', email: 'BroAmStuck@gmail.com', avatar: '/ad.png', role: 'SUPER_ADMIN', level: 150 };

test('Trang chi tiết: trạng thái chờ/không tìm thấy, đủ nội dung, đáp án chính thức nổi đầu, quyền xác nhận GIỮ NGUYÊN', async () => {
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { createServer } = await import('vite');
  const { default: reactPlugin } = await import('@vitejs/plugin-react');
  const vite = await createServer({ configFile: false, plugins: [reactPlugin()], server: { middlewareMode: true }, appType: 'custom' });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  let key = 0;
  try {
    const { QADetailPage } = await vite.ssrLoadModule('/src/components/views/qa/QADetailPage.tsx');
    const calls = { confirm: [], add: [], back: 0, open: [], login: 0, save: [], author: [], del: [] };
    const q1 = question('q-1', { isSolved: true, bestSolutionId: 's2' });
    const q2 = question('q-2', { subject: 'toan', title: 'Giới hạn của hàm số', content: 'x' });
    const q3 = question('q-3', { subject: 'ly', title: 'Con lắc đơn dao động', content: 'y' });
    const solutions = [
      solution('s1', 'q-1', { authorEmail: 'nam@example.com' }),
      solution('s2', 'q-1', { isBest: true, authorEmail: 'lan@example.com' }),
      solution('s3', 'q-1'),
      solution('t1', 'q-2'),
    ];
    const base = () => ({
      routeKey: 'q-1', questions: [q1, q2, q3], solutions, users: {}, currentUser: author, isSynced: true,
      isSuperAdmin: false, canEditContent: false, savedIds: [],
      onToggleSave: (id) => calls.save.push(id), onAddSolution: (...args) => calls.add.push(args),
      onMarkBestSolution: (...args) => calls.confirm.push(args), onReactSolution() {}, onDeleteSolution: (id) => calls.del.push(id),
      onOpenLoginModal: () => { calls.login += 1; }, onOpenAuthor: (...args) => calls.author.push(args),
      onEditPost() {}, onDeletePost() {}, onBack: () => { calls.back += 1; }, onOpenQuestion: (q) => calls.open.push(q.id),
    });
    const mount = async (props = {}) => {
      resetUrl('/hoi-dap/q-1');
      await React.act(async () => root.render(React.createElement(QADetailPage, { key: ++key, ...base(), ...props })));
      await tick(React, 10);
    };
    const buttonsWith = (text) => [...host.querySelectorAll('button')].filter((b) => b.textContent.includes(text));
    const click = (el) => React.act(async () => el.click());

    /* ── chưa đồng bộ: khung chờ, tuyệt đối không nháy "không tìm thấy" ── */
    await mount({ routeKey: 'q-khong-co', isSynced: false });
    assert.ok(host.querySelector('[aria-busy="true"]'), 'đang chờ dữ liệu → khung chờ');
    assert.doesNotMatch(host.textContent, /Không tìm thấy/);
    /* ── đã đồng bộ mà vẫn không có → chờ một nhịp rồi mới kết luận (isSynced bật trước khi dữ liệu vào state) ── */
    await mount({ routeKey: 'q-khong-co', isSynced: true });
    assert.doesNotMatch(host.textContent, /Không tìm thấy/, 'chưa kết luận ngay khi vừa đồng bộ');
    await waitFor(React, () => /Không tìm thấy câu hỏi này/.test(host.textContent), 'trạng thái không tìm thấy');
    assert.equal(host.querySelectorAll('h1').length, 1);
    await click(buttonsWith('Về danh sách Hỏi đáp')[0]);
    assert.equal(calls.back, 1, 'nút về danh sách gọi onBack');

    /* ── câu hỏi thật, vào bằng id trần → địa chỉ được chuẩn hoá có slug; tiêu đề tab; tiêu điểm vào đầu bài ── */
    await mount();
    assert.equal(host.querySelector('h1').textContent, 'Câu hỏi q-1 về đạo hàm');
    assert.equal(document.activeElement, host.querySelector('h1'), 'tiêu điểm vào tiêu đề của trang mới');
    assert.equal(window.location.pathname, '/hoi-dap/q-1-cau-hoi-q-1-ve-dao-ham', 'id trần → thêm slug theo tiêu đề');
    assert.equal(document.title, 'Câu hỏi q-1 về đạo hàm · Hỏi đáp F-Forum');
    assert.equal(document.querySelector('meta[name="description"]').content, 'Nội dung q-1');
    assert.equal(host.querySelector('[data-status]').dataset.status, 'solved');
    assert.match(host.querySelector('[data-status]').textContent, /Đã có lời giải đúng/);
    assert.match(host.textContent, /#toan/);
    assert.match(host.textContent, /\+20 Coin/);
    assert.match(host.textContent, /3 lượt xem/);

    /* ── đáp án chính thức nổi lên ĐẦU, có huy hiệu + phần thưởng ── */
    const cards = [...host.querySelectorAll('article[id^="qa-solution-"]')];
    assert.deepEqual(cards.map((c) => c.id), ['qa-solution-s2', 'qa-solution-s1', 'qa-solution-s3'], 'đáp án chuẩn lên đầu, còn lại giữ thứ tự');
    assert.equal(cards[0].dataset.official, 'true');
    assert.ok(cards[0].classList.contains('ff-qa-official'));
    assert.match(cards[0].textContent, /Đáp án chính thức/);
    assert.match(cards[0].textContent, /\+110 Coin/, '50% của 20 + 100');
    assert.equal(cards.slice(1).filter((c) => c.dataset.official).length, 0);
    assert.match(host.querySelector('#qa-solutions h2').textContent, /^3 lời giải/);
    assert.match(host.querySelector('[role="tooltip"]').textContent, /Chỉ tác giả hoặc Super Admin mới có quyền xác nhận đáp án chuẩn/);

    /* ── tác giả: xác nhận được các lời giải CHƯA chính thức; bấm gọi đúng handler cũ ── */
    assert.equal(buttonsWith('Xác nhận đúng').length, 2, 'một nút cho mỗi lời giải chưa phải đáp án chuẩn');
    await click(buttonsWith('Xác nhận đúng')[0]);
    assert.deepEqual(calls.confirm, [['q-1', 's1']]);
    /* ── không phải tác giả / khách: không có nút xác nhận ── */
    await mount({ currentUser: outsider });
    assert.equal(buttonsWith('Xác nhận đúng').length, 0, 'người ngoài không xác nhận được');
    await mount({ currentUser: null });
    assert.equal(buttonsWith('Xác nhận đúng').length, 0, 'khách không xác nhận được');
    /* ── Super Admin: xác nhận được dù không phải tác giả ── */
    await mount({ currentUser: admin, isSuperAdmin: true, canEditContent: true });
    assert.equal(buttonsWith('Xác nhận đúng').length, 2, 'Super Admin xác nhận được');
    assert.equal(host.querySelectorAll('button[title="Xóa phản hồi vi phạm"]').length, 3, 'Super Admin có nút xoá từng lời giải');
    assert.ok(buttonsWith('Xóa bài viết').length && buttonsWith('Sửa nội dung').length, 'và thanh quản trị câu hỏi');
    await click(host.querySelector('button[title="Xóa phản hồi vi phạm"]'));
    assert.deepEqual(calls.del, ['s2'], 'xoá đúng lời giải (đáp án chuẩn nằm đầu danh sách)');
    await mount({ currentUser: author });
    assert.equal(host.querySelectorAll('button[title="Xóa phản hồi vi phạm"]').length, 0, 'tác giả thường không có quyền xoá');
    assert.equal(buttonsWith('Xóa bài viết').length, 0);

    /* ── trạng thái các câu hỏi khác ── */
    await mount({ routeKey: 'q-2' });
    assert.equal(host.querySelector('[data-status]').dataset.status, 'discussing');
    assert.equal(host.querySelectorAll('article[data-official]').length, 0);
    await mount({ routeKey: 'q-3' });
    assert.equal(host.querySelector('[data-status]').dataset.status, 'waiting');
    assert.match(host.textContent, /Chưa có bạn nào trợ giúp giải câu này/);

    /* ── lưu câu hỏi ── */
    await mount({ savedIds: ['q-1'] });
    assert.equal(buttonsWith('Đã lưu')[0].getAttribute('aria-pressed'), 'true');
    await click(buttonsWith('Đã lưu')[0]);
    assert.deepEqual(calls.save, ['q-1']);

    /* ── bấm tên người giải → mở thẻ tác giả tại vị trí bấm ── */
    await mount();
    await click(host.querySelector('#qa-solution-s1 button[title="Xem hồ sơ người giải bài"]'));
    assert.equal(calls.author.at(-1)[0].id, 'u-s1');
    assert.equal(calls.author.at(-1)[0].level, 2);

    /* ── gỡ trang → trả lại tiêu đề + mô tả cũ ── */
    await React.act(async () => root.render(React.createElement('div')));
    assert.equal(document.title, 'F-Forum');
    assert.equal(document.querySelector('meta[name="description"]').content, 'Mô tả gốc');
  } finally {
    await safeUnmount(React, root);
    await vite.close();
  }
});

test('Phản ứng nhanh: 3 nút dưới MỌI lời giải (cả đáp án chính thức) — trạng thái, số đếm, khách → đăng nhập, tác giả chỉ xem', async () => {
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { createServer } = await import('vite');
  const { default: reactPlugin } = await import('@vitejs/plugin-react');
  const vite = await createServer({ configFile: false, plugins: [reactPlugin()], server: { middlewareMode: true }, appType: 'custom' });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    const { QADetailPage } = await vite.ssrLoadModule('/src/components/views/qa/QADetailPage.tsx');
    const calls = { react: [], login: 0, confirm: [] };
    const q = question('q-9');
    /* "Của mình" khớp theo id HOẶC email (như máy chủ và store): s3 chỉ khớp id, s4 chỉ khớp email. */
    const sols = (s1Reactions = { helpful: ['u-out', 'u-x'], thanks: ['u-y'] }) => [
      solution('s1', 'q-9', { reactions: s1Reactions }),
      solution('s2', 'q-9', { isBest: true, reactions: { wow: ['u-x'] } }),
      solution('s3', 'q-9', { authorId: 'u-out', authorEmail: 'khac@example.com', reactions: { thanks: ['u-x', 'u-y', 'u-z'] } }),
      solution('s4', 'q-9', { authorId: 'u-khac', authorEmail: 'OUT@example.com' }),
    ];
    const render = (solutions, currentUser) => React.act(async () => root.render(React.createElement(QADetailPage, {
      routeKey: 'q-9', questions: [q], solutions, users: {}, currentUser, isSynced: true, isSuperAdmin: false, canEditContent: false, savedIds: [],
      onToggleSave() {}, onAddSolution() {}, onMarkBestSolution: (...args) => calls.confirm.push(args),
      onReactSolution: (...args) => calls.react.push(args), onOpenLoginModal: () => { calls.login += 1; },
      onOpenAuthor() {}, onEditPost() {}, onDeletePost() {}, onBack() {}, onOpenQuestion() {},
    })));
    const card = (id) => host.querySelector(`#qa-solution-${id}`);
    const btn = (id, kind) => card(id).querySelector(`button[data-reaction="${kind}"]`);
    const click = (el) => React.act(async () => el.click());
    const label = (id, kind) => btn(id, kind).textContent.replace(/\s+/g, ' ').trim();

    /* ── người ngoài (đã đăng nhập) ── */
    resetUrl('/hoi-dap/q-9');
    await render(sols(), outsider);
    assert.deepEqual([...host.querySelectorAll('article[id^="qa-solution-"]')].map((c) => c.id),
      ['qa-solution-s2', 'qa-solution-s1', 'qa-solution-s3', 'qa-solution-s4'], 'đáp án chính thức vẫn nổi lên đầu');
    for (const id of ['s1', 's2']) {
      const group = card(id).querySelector('[role="group"]');
      assert.ok(group, `${id}: có nhóm phản ứng`);
      assert.match(group.getAttribute('aria-label'), /Phản ứng nhanh/);
      assert.deepEqual([...group.querySelectorAll('button')].map((b) => b.dataset.reaction), ['helpful', 'wow', 'thanks'], 'đúng thứ tự thiết kế');
      assert.ok([...group.querySelectorAll('button')].every((b) => b.type === 'button'), 'không phải nút submit');
    }
    assert.ok(card('s2').dataset.official === 'true' && btn('s2', 'wow'), 'đáp án chính thức cũng nhận phản ứng');
    assert.equal(label('s1', 'helpful'), '👍 Hữu ích 2');
    assert.equal(label('s1', 'wow'), '🤯 Hay đó', 'chưa ai chọn → không hiện số 0');
    assert.equal(label('s1', 'thanks'), '🙏 Cảm ơn 1');
    assert.equal(btn('s1', 'helpful').getAttribute('aria-pressed'), 'true', 'mình đã chọn 👍 → nút ở trạng thái bật');
    assert.equal(btn('s1', 'wow').getAttribute('aria-pressed'), 'false');
    assert.equal(btn('s1', 'thanks').getAttribute('aria-pressed'), 'false', 'người khác chọn không làm nút của mình bật');
    assert.equal(label('s2', 'wow'), '🤯 Hay đó 1');
    assert.equal(btn('s1', 'helpful').title, 'Lời giải này giúp mình hiểu bài');

    /* ── bấm: gọi đúng handler với đúng lời giải + loại (đảo trạng thái do store lo) ── */
    await click(btn('s1', 'wow'));
    await click(btn('s1', 'helpful'));
    await click(btn('s2', 'thanks'));
    assert.deepEqual(calls.react, [['s1', 'wow'], ['s1', 'helpful'], ['s2', 'thanks']]);
    assert.equal(calls.login, 0, 'đã đăng nhập thì không bật hộp đăng nhập');
    assert.deepEqual(calls.confirm, [], 'phản ứng không dính gì tới việc xác nhận đáp án chuẩn');

    /* ── ảnh chụp mới từ máy chủ (WebSocket) → số đếm và trạng thái cập nhật tại chỗ ── */
    await render(sols({ helpful: ['u-x'], wow: ['u-out'], thanks: ['u-y', 'u-w'] }), outsider);
    assert.equal(label('s1', 'helpful'), '👍 Hữu ích 1');
    assert.equal(btn('s1', 'helpful').getAttribute('aria-pressed'), 'false', 'đã bị bỏ → tắt');
    assert.equal(label('s1', 'wow'), '🤯 Hay đó 1');
    assert.equal(btn('s1', 'wow').getAttribute('aria-pressed'), 'true');
    assert.equal(label('s1', 'thanks'), '🙏 Cảm ơn 2');

    /* ── lời giải của CHÍNH MÌNH: không có nút, chỉ xem những gì nhận được ── */
    assert.equal(card('s3').querySelectorAll('button[data-reaction]').length, 0, 'không tự bấm cho mình');
    const received = [...card('s3').querySelectorAll('[data-reaction]')];
    assert.deepEqual(received.map((el) => [el.dataset.reaction, el.textContent.replace(/\s+/g, ' ').trim()]), [['thanks', '🙏 Cảm ơn 3']],
      'chỉ hiện loại đã nhận được, kèm số đếm');
    assert.equal(card('s4').querySelectorAll('[data-reaction]').length, 0, 'chưa nhận gì → không hiện gì');
    assert.equal(card('s4').querySelector('[role="group"]'), null);

    /* ── khách: bấm → mở hộp đăng nhập, KHÔNG gửi phản ứng ── */
    calls.react.length = 0;
    await render(sols(), null);
    assert.equal(card('s3').querySelectorAll('button[data-reaction]').length, 3, 'khách không phải tác giả của ai → thấy đủ 3 nút');
    assert.equal(btn('s1', 'helpful').getAttribute('aria-pressed'), 'false', 'khách chưa chọn gì');
    assert.equal(btn('s1', 'helpful').title, 'Đăng nhập để bày tỏ phản ứng');
    await click(btn('s1', 'helpful'));
    await click(btn('s2', 'thanks'));
    assert.equal(calls.login, 2, 'mỗi lần bấm mở hộp đăng nhập');
    assert.deepEqual(calls.react, [], 'khách không gửi được phản ứng');
    assert.equal(alerts.length, 0, 'không dùng alert() gây khó chịu');
  } finally {
    await safeUnmount(React, root);
    await vite.close();
  }
});

test('Đáp án vừa được xác nhận NGAY LÚC đang xem: thẻ nổi lên; "+XP thưởng thêm" chỉ cho chính người giải ở lần xác nhận đầu', async () => {
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { createServer } = await import('vite');
  const { default: reactPlugin } = await import('@vitejs/plugin-react');
  const vite = await createServer({ configFile: false, plugins: [reactPlugin()], server: { middlewareMode: true }, appType: 'custom' });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  let root2 = null;
  try {
    const { QADetailPage } = await vite.ssrLoadModule('/src/components/views/qa/QADetailPage.tsx');
    const q = question('q-7');
    const lanUser = { id: 'u-lan', name: 'Lan', email: 'lan@example.com', avatar: '/l.png', role: 'STUDENT', level: 2 };
    const sol = (id, email, best = false) => solution(id, 'q-7', { authorEmail: email, authorId: `id-${id}`, isBest: best });
    const props = (solutions, currentUser) => ({
      routeKey: 'q-7', questions: [q], solutions, users: {}, currentUser, isSynced: true, isSuperAdmin: false, canEditContent: false, savedIds: [],
      onToggleSave() {}, onAddSolution() {}, onMarkBestSolution() {}, onReactSolution() {}, onOpenAuthor() {}, onEditPost() {}, onDeletePost() {}, onBack() {}, onOpenQuestion() {},
    });
    const render = (solutions, currentUser) => React.act(async () => root.render(React.createElement(QADetailPage, props(solutions, currentUser))));
    const pop = () => host.querySelectorAll('.ff-qa-xp-pop').length;
    const fresh = () => host.querySelectorAll('.ff-qa-official--new').length;

    resetUrl('/hoi-dap/q-7');
    await render([sol('a', 'nam@example.com'), sol('b', 'lan@example.com')], lanUser);
    assert.equal(fresh(), 0, 'đang xem bình thường, chưa ai được xác nhận → không có hoạt ảnh');

    /* đáp án của Lan được xác nhận khi Lan đang xem trang */
    await render([sol('a', 'nam@example.com'), sol('b', 'lan@example.com', true)], lanUser);
    assert.deepEqual([...host.querySelectorAll('article[id^="qa-solution-"]')].map((c) => c.id), ['qa-solution-b', 'qa-solution-a']);
    assert.equal(fresh(), 1, 'thẻ vừa được công nhận nổi lên + phát sáng');
    assert.equal(pop(), 1, 'người giải thấy "+XP thưởng thêm"');
    assert.match(host.querySelector('.ff-qa-xp-pop').textContent, /\+XP thưởng thêm/);

    /* người khác xem cùng sự kiện: thấy thẻ nổi lên nhưng KHÔNG thấy "+XP" (không phải của họ) */
    await React.act(async () => root.unmount());
    root2 = createRoot(host);
    resetUrl('/hoi-dap/q-7');
    await React.act(async () => root2.render(React.createElement(QADetailPage, props([sol('a', 'nam@example.com'), sol('b', 'lan@example.com')], outsider))));
    await React.act(async () => root2.render(React.createElement(QADetailPage, props([sol('a', 'nam@example.com'), sol('b', 'lan@example.com', true)], outsider))));
    assert.equal(fresh(), 1);
    assert.equal(pop(), 0, 'chỉ người giải mới thấy +XP');

    /* đổi đáp án chuẩn từ b sang a: thưởng không phát lần hai → KHÔNG hứa +XP nữa */
    await React.act(async () => root2.render(React.createElement(QADetailPage, props([sol('a', 'nam@example.com', true), sol('b', 'lan@example.com')], { ...outsider, email: 'nam@example.com', id: 'id-a' }))));
    assert.equal(pop(), 0, 'chọn lại đáp án khác không có "+XP thưởng thêm" (máy chủ không thưởng lần hai)');
    assert.equal(fresh(), 1);
  } finally {
    await safeUnmount(React, root);
    if (root2) await safeUnmount(React, root2);
    await vite.close();
  }
});

test('Soạn lời giải: +25 XP, đăng nhập mới gửi được, nháp theo câu hỏi, chèn ký hiệu đúng chỗ, giới hạn 1500, chờ 3 giây', async () => {
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { createServer } = await import('vite');
  const { default: reactPlugin } = await import('@vitejs/plugin-react');
  const vite = await createServer({ configFile: false, plugins: [reactPlugin()], server: { middlewareMode: true }, appType: 'custom' });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    const { QAComposer } = await vite.ssrLoadModule('/src/components/views/qa/QAComposer.tsx');
    const sent = [];
    let logins = 0;
    const render = (currentUser, questionId = 'q-c1') => React.act(async () => root.render(React.createElement(QAComposer, {
      key: questionId, questionId, currentUser, onSubmit: (...args) => sent.push(args), onOpenLoginModal: () => { logins += 1; },
    })));
    const editor = () => host.querySelector('#qa-composer-text');
    const submitButton = () => [...host.querySelectorAll('button')].find((b) => /Gửi lời giải|Chờ \d|Đang gửi/.test(b.textContent));
    const type = (value) => React.act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(editor(), value);
      editor().dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    const symbolsButton = () => [...host.querySelectorAll('button')].find((b) => /Bảng ký hiệu/.test(b.textContent));
    window.localStorage.clear();

    await render(author);
    assert.match(host.textContent, /\+25 XP/, 'nhãn thưởng giữ nguyên');
    assert.equal(editor().maxLength, 1500);
    assert.equal(submitButton().disabled, true, 'chưa nhập gì → không gửi được');
    assert.match(host.textContent, /0\/1500/);
    await type('   ');
    assert.equal(submitButton().disabled, true, 'toàn khoảng trắng cũng không gửi được');

    /* bảng ký hiệu: bật/tắt, đúng 38 nút, chèn đúng chỗ con trỏ */
    assert.equal(host.querySelectorAll('button[title^="Chèn"]').length, 0, 'mặc định ẩn — không chiếm chỗ lúc đọc');
    await React.act(async () => symbolsButton().click());
    assert.equal(symbolsButton().getAttribute('aria-expanded'), 'true');
    assert.equal(host.querySelectorAll('button[title^="Chèn"]').length, 38);
    await type('f(x) = x2');
    editor().setSelectionRange(8, 8);
    await React.act(async () => host.querySelector('button[title="Chèn ²"]').click());
    assert.equal(editor().value, 'f(x) = x²2', 'chèn đúng vị trí con trỏ, không phải cuối văn bản');
    await React.act(async () => symbolsButton().click());
    assert.equal(host.querySelectorAll('button[title^="Chèn"]').length, 0);

    /* nháp theo câu hỏi: gỡ composer rồi dựng lại → khôi phục; câu hỏi khác thì không dính */
    await type('Bước 1: đặt u = x');
    await React.act(async () => root.render(React.createElement('div')));
    assert.equal(JSON.parse(window.localStorage.getItem('fforum_draft_solution_q-c1')).fields.text, 'Bước 1: đặt u = x', 'gỡ trang → ghi nốt nháp (không mất ký tự cuối)');
    await render(author, 'q-c1');
    assert.equal(editor().value, 'Bước 1: đặt u = x', 'quay lại → nháp được khôi phục');
    assert.match(host.textContent, /Đã khôi phục bản nháp/);
    await render(author, 'q-c2');
    assert.equal(editor().value, '', 'câu hỏi khác không dính nháp');
    await render(author, 'q-c1');

    /* gửi: đúng tham số, xoá ô + nháp, bắt đầu chờ 3 giây */
    await type('  Đáp số: 42  ');
    assert.equal(submitButton().disabled, false);
    await React.act(async () => submitButton().click());
    assert.deepEqual(sent, [['q-c1', 'Đáp số: 42', undefined]], 'cắt khoảng trắng, không kèm ảnh');
    assert.equal(editor().value, '');
    assert.equal(window.localStorage.getItem('fforum_draft_solution_q-c1'), null, 'gửi xong thì xoá nháp');
    assert.match(submitButton().textContent, /Chờ 3s/);
    assert.equal(submitButton().disabled, true);

    /* khách: cảnh báo đăng nhập + mở hộp thoại, KHÔNG gửi */
    await render(null, 'q-c3');
    await type('Em thử khi chưa đăng nhập');
    await React.act(async () => submitButton().click());
    assert.deepEqual(alerts.slice(-1), ['Vui lòng đăng nhập để gửi câu trả lời!']);
    assert.equal(logins, 1);
    assert.equal(sent.length, 1, 'không gửi khi chưa đăng nhập');
    assert.equal(editor().value, 'Em thử khi chưa đăng nhập', 'giữ nguyên nội dung để đăng nhập xong gửi tiếp');

    /* ảnh đính kèm quá lớn/không phải ảnh bị từ chối bằng thông báo */
    await render(author, 'q-c4');
    const file = host.querySelector('#qa-composer-image');
    Object.defineProperty(file, 'files', { configurable: true, value: [new dom.window.File(['x'], 'a.txt', { type: 'text/plain' })] });
    await React.act(async () => file.dispatchEvent(new window.Event('change', { bubbles: true })));
    assert.match(host.querySelector('[role="alert"]').textContent, /chỉ tải lên tệp hình ảnh/);
  } finally {
    await safeUnmount(React, root);
    await vite.close();
  }
});

test('Gợi ý bên cạnh: câu hỏi liên quan là link thật (Ctrl+click không bị chặn), top người giải tuần dùng dữ liệu thật', async () => {
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { createServer } = await import('vite');
  const { default: reactPlugin } = await import('@vitejs/plugin-react');
  const vite = await createServer({ configFile: false, plugins: [reactPlugin()], server: { middlewareMode: true }, appType: 'custom' });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    const { QADetailPage } = await vite.ssrLoadModule('/src/components/views/qa/QADetailPage.tsx');
    const opened = [];
    const authors = [];
    const questions = [question('q-1'), question('q-2', { title: 'Đạo hàm cấp hai', content: 'x' }), question('q-3', { subject: 'van', title: 'Phân tích nhân vật', content: 'y' })];
    const old = NOW - 20 * 86400_000;
    const solutions = [
      solution('s1', 'q-2', { authorEmail: 'nam@example.com', authorId: 'u-nam', authorName: 'Nam', isBest: true }),
      solution('s2', 'q-2', { authorEmail: 'nam@example.com', authorId: 'u-nam', authorName: 'Nam' }),
      solution('s3', 'q-3', { authorEmail: 'lan@example.com', authorId: 'u-lan', authorName: 'Lan' }),
      solution('s4', 'q-3', { authorEmail: 'cu@example.com', authorId: 'u-cu', authorName: 'Người tháng trước', createdAtMs: old }),
    ];
    resetUrl('/hoi-dap/q-1');
    await React.act(async () => root.render(React.createElement(QADetailPage, {
      routeKey: 'q-1', questions, solutions, users: {}, currentUser: author, isSynced: true, isSuperAdmin: false, canEditContent: false, savedIds: [],
      onToggleSave() {}, onAddSolution() {}, onMarkBestSolution() {}, onReactSolution() {}, onOpenAuthor: (a) => authors.push(a), onEditPost() {}, onDeletePost() {}, onBack() {},
      onOpenQuestion: (q) => opened.push(q.id),
    })));
    const side = [...host.querySelectorAll('aside')].find((a) => a.getAttribute('aria-label') === 'Gợi ý và bảng xếp hạng');
    const links = [...side.querySelectorAll('a[href^="/hoi-dap/"]')];
    assert.deepEqual(links.map((a) => a.getAttribute('href')), ['/hoi-dap/q-2-dao-ham-cap-hai'], 'chỉ câu liên quan (q-3 khác chủ đề, ít từ khoá chung)');
    const plain = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    await React.act(async () => links[0].dispatchEvent(plain));
    assert.equal(plain.defaultPrevented, true, 'click thường → điều hướng trong app');
    assert.deepEqual(opened, ['q-2']);
    const ctrl = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
    await React.act(async () => links[0].dispatchEvent(ctrl));
    assert.equal(ctrl.defaultPrevented, false, 'Ctrl+click để trình duyệt mở tab mới');
    assert.deepEqual(opened, ['q-2']);

    const top = [...side.querySelectorAll('ol li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim());
    assert.equal(top.length, 2, 'chỉ người có lời giải TRONG TUẦN (người tháng trước bị loại)');
    assert.match(top[0], /^1.*Nam.*2 lời giải · 1 đáp án chuẩn/);
    assert.match(top[1], /^2.*Lan.*1 lời giải/);
    assert.doesNotMatch(side.textContent, /Người tháng trước/);
    await React.act(async () => side.querySelector('ol li button').click());
    assert.equal(authors.at(-1).id, 'u-nam');

    /* dải cuộn ngang (máy tính bảng/điện thoại) cùng dữ liệu, nằm ngoài sidebar */
    const rail = host.querySelector('.snap-x');
    assert.ok(rail && !side.contains(rail), 'dải liên quan cuộn ngang ở cuối trang');
    assert.equal(rail.querySelectorAll('a').length, 1);
    assert.match(rail.closest('section').querySelector('h2').textContent, /Có thể bạn quan tâm/, 'điện thoại: "Có thể bạn quan tâm"');
  } finally {
    await safeUnmount(React, root);
    await vite.close();
  }
});

/* ───────── Shell Hỏi đáp: danh sách ↔ trang chi tiết ───────── */
test('Shell Hỏi đáp: thẻ là link thật, bấm thẻ → TRANG riêng, "Quay lại" về đúng danh sách giữ bộ lọc, không còn modal chi tiết', async () => {
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { createServer } = await import('vite');
  const { default: reactPlugin } = await import('@vitejs/plugin-react');
  const vite = await createServer({ configFile: false, plugins: [reactPlugin()], server: { middlewareMode: true }, appType: 'custom' });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  dom.window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  globalThis.ResizeObserver = dom.window.ResizeObserver;
  dom.window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  globalThis.IntersectionObserver = dom.window.IntersectionObserver;
  let root2 = null;
  try {
    const { QAForumView } = await vite.ssrLoadModule('/src/components/views/QAForumView.tsx');
    const questions = [
      question('q-a', { title: 'Đạo hàm của hàm hợp', subject: 'toan', content: 'Mô tả A' }),
      question('q-b', { title: 'Định luật Newton', subject: 'ly', content: 'Mô tả B' }),
      question('q-c', { title: 'Tích phân từng phần', subject: 'toan', content: 'Mô tả C' }),
    ];
    const solutions = [solution('s-a', 'q-a')];
    let logins = 0;
    resetUrl('/hoi-dap', null);
    const props = () => ({
      currentUser: null, questions, solutions, onCreateQuestion() {}, onAddSolution() {}, onMarkBestSolution() {}, onReactSolution() {},
      onOpenLoginModal: () => { logins += 1; }, users: {}, chatMessages: [], isSynced: true,
    });
    await React.act(async () => root.render(React.createElement(QAForumView, props())));
    await tick(React, 20);
    const cards = () => [...host.querySelectorAll('a[data-qa-card-link]')];
    assert.deepEqual(cards().map((a) => a.getAttribute('href')), [
      '/hoi-dap/q-a-dao-ham-cua-ham-hop', '/hoi-dap/q-b-dinh-luat-newton', '/hoi-dap/q-c-tich-phan-tung-phan',
    ], 'mỗi thẻ là link thật tới địa chỉ riêng của câu hỏi');
    assert.equal(host.querySelectorAll('[role="dialog"]').length, 0, 'không có modal nào mở');
    assert.equal(host.querySelector('[role="button"][aria-label^="Xem chi tiết câu hỏi"]'), null, 'thẻ không còn là div role=button giả link');

    /* lọc theo chủ đề + tìm kiếm trước khi mở câu hỏi */
    await React.act(async () => [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === '#toan').click());
    assert.equal(cards().length, 2);

    /* Ctrl+click: để trình duyệt xử lý (mở tab mới), app KHÔNG điều hướng */
    const ctrl = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
    await React.act(async () => cards()[0].dispatchEvent(ctrl));
    assert.equal(ctrl.defaultPrevented, false);
    assert.equal(window.location.pathname, '/hoi-dap');

    /* bấm nút "Lưu" trong thẻ không mở câu hỏi (nút con tự chặn nổi bọt) */
    await React.act(async () => host.querySelector('a[data-qa-card-link]').closest('.liquid-glass').querySelector('button[aria-pressed]').click());
    assert.equal(window.location.pathname, '/hoi-dap', 'bấm nút con không kích hoạt thẻ');
    assert.equal(logins, 1, 'khách bấm Lưu → mở đăng nhập (hành vi cũ)');
    /* hợp đồng chung: BẤT KỲ nút nào nằm trong thẻ — kể cả nút sau này thêm mà quên chặn nổi bọt — cũng không kích hoạt thẻ */
    const firstCard = host.querySelector('a[data-qa-card-link]').closest('.liquid-glass');
    const stray = document.createElement('button');
    stray.type = 'button';
    firstCard.appendChild(stray);
    await React.act(async () => stray.click());
    stray.remove();
    assert.equal(window.location.pathname, '/hoi-dap', 'nút con không tự chặn nổi bọt vẫn không mở câu hỏi');

    /* bấm vào thân thẻ → sang TRANG riêng */
    const historyBefore = window.history.length;
    const body = cards()[0].closest('.liquid-glass').querySelector('p');
    await React.act(async () => body.click());
    assert.equal(window.location.pathname, '/hoi-dap/q-a-dao-ham-cua-ham-hop');
    assert.equal(window.history.length, historyBefore + 1, 'một mục lịch sử mới (nút Back của trình duyệt dùng được)');
    assert.equal(window.history.state.ffQaDepth, 1);
    await waitFor(React, () => host.querySelector('h1')?.textContent === 'Đạo hàm của hàm hợp', 'trang chi tiết (chunk nạp lười)');
    assert.equal(host.querySelectorAll('[role="dialog"]').length, 0, 'chi tiết KHÔNG phải modal');
    assert.equal(host.querySelector('a[data-qa-card-link]'), null, 'danh sách được thay bằng trang, không nằm dưới một lớp phủ');
    assert.ok(host.querySelector('[data-qa-scroller]'), 'trang tự cuộn');

    /* "Quay lại" → danh sách, bộ lọc #toan vẫn còn */
    await React.act(async () => [...host.querySelectorAll('button')].find((b) => /Quay lại Hỏi đáp/.test(b.textContent)).click());
    await waitFor(React, () => window.location.pathname === '/hoi-dap', 'popstate về danh sách');
    await waitFor(React, () => cards().length > 0, 'danh sách hiện lại');
    assert.equal(cards().length, 2, 'bộ lọc #toan được giữ');
    assert.equal(document.activeElement, cards()[0], 'tiêu điểm bàn phím trả về đúng thẻ vừa mở');

    /* kênh sự kiện cũ (bảng lệnh / tìm kiếm toàn cục) vẫn mở được câu hỏi — nay bằng điều hướng */
    await React.act(async () => window.dispatchEvent(new dom.window.CustomEvent('fforum_open_question', { detail: { questionId: 'q-b' } })));
    assert.equal(window.location.pathname, '/hoi-dap/q-b-dinh-luat-newton');
    await waitFor(React, () => host.querySelector('h1')?.textContent === 'Định luật Newton', 'trang câu hỏi mở từ sự kiện');

    /* vào thẳng bằng địa chỉ → hiện luôn trang chi tiết */
    await React.act(async () => root.unmount());
    root2 = createRoot(host);
    resetUrl('/hoi-dap/q-c-bat-ky-slug-nao', null);
    await React.act(async () => root2.render(React.createElement(QAForumView, props())));
    await waitFor(React, () => host.querySelector('h1')?.textContent === 'Tích phân từng phần', 'deep link');
    assert.equal(window.location.pathname, '/hoi-dap/q-c-tich-phan-tung-phan', 'slug cũ/sai được chuẩn hoá theo tiêu đề hiện tại');
  } finally {
    await safeUnmount(React, root);
    if (root2) await safeUnmount(React, root2);
    await vite.close();
  }
});

test('Modal "Đặt câu hỏi" không bị ảnh hưởng: vẫn mở được và dùng chung bảng 38 ký hiệu', async () => {
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { createServer } = await import('vite');
  const { default: reactPlugin } = await import('@vitejs/plugin-react');
  const vite = await createServer({ configFile: false, plugins: [reactPlugin()], server: { middlewareMode: true }, appType: 'custom' });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    const { QAForumView } = await vite.ssrLoadModule('/src/components/views/QAForumView.tsx');
    resetUrl('/hoi-dap', null);
    window.localStorage.clear();
    await React.act(async () => root.render(React.createElement(QAForumView, {
      currentUser: author, questions: [question('q-a')], solutions: [], onCreateQuestion() {}, onAddSolution() {}, onMarkBestSolution() {}, onReactSolution() {},
      users: {}, chatMessages: [], isSynced: true,
    })));
    await tick(React, 20);
    await React.act(async () => [...host.querySelectorAll('button')].find((b) => /Đặt Câu Hỏi Mới/.test(b.textContent)).click());
    const dialog = host.querySelector('[role="dialog"][aria-label="Đặt câu hỏi mới"]');
    assert.ok(dialog, 'đăng nhập rồi thì mở modal đặt câu hỏi');
    assert.equal(dialog.querySelectorAll('button[title^="Chèn"]').length, 38, 'bảng ký hiệu dùng chung (38 ký tự)');
    const content = dialog.querySelector('#noi-dung-chi-tiet-thac-mac');
    assert.equal(content.maxLength, 1500);
    await React.act(async () => dialog.querySelector('button[title="Chèn π"]').click());
    assert.equal(content.value, 'π', 'bấm ký hiệu thì chèn vào nội dung câu hỏi như trước');
    assert.equal(window.location.pathname, '/hoi-dap', 'mở modal không đổi route');
  } finally {
    await safeUnmount(React, root);
    await vite.close();
  }
});

test('Shell → trang chi tiết → thẻ lời giải: phản ứng đi hết đường dây (hành động của store + hộp đăng nhập)', async () => {
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { createServer } = await import('vite');
  const { default: reactPlugin } = await import('@vitejs/plugin-react');
  const vite = await createServer({ configFile: false, plugins: [reactPlugin()], server: { middlewareMode: true }, appType: 'custom' });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    const { QAForumView } = await vite.ssrLoadModule('/src/components/views/QAForumView.tsx');
    const calls = { react: [], login: 0 };
    const props = (currentUser) => ({
      currentUser, questions: [question('q-r', { title: 'Đạo hàm cơ bản' })],
      solutions: [solution('s-r', 'q-r', { reactions: { thanks: ['u-x'] } })],
      onCreateQuestion() {}, onAddSolution() {}, onMarkBestSolution() {},
      onReactSolution: (...args) => calls.react.push(args), onOpenLoginModal: () => { calls.login += 1; },
      users: {}, chatMessages: [], isSynced: true,
    });
    resetUrl('/hoi-dap/q-r', null);
    window.localStorage.clear();
    await React.act(async () => root.render(React.createElement(QAForumView, props(outsider))));
    await waitFor(React, () => host.querySelector('#qa-solution-s-r'), 'trang chi tiết (chunk nạp lười)');
    const wow = () => host.querySelector('#qa-solution-s-r button[data-reaction="wow"]');
    await React.act(async () => wow().click());
    assert.deepEqual(calls.react, [['s-r', 'wow']], 'bấm 🤯 → hành động của store nhận đúng (lời giải, loại)');
    assert.equal(calls.login, 0);

    await React.act(async () => root.render(React.createElement(QAForumView, props(null))));
    await React.act(async () => wow().click());
    assert.equal(calls.login, 1, 'khách bấm → hộp đăng nhập của shell được mở');
    assert.equal(calls.react.length, 1, 'khách không gửi được phản ứng');
  } finally {
    await safeUnmount(React, root);
    await vite.close();
  }
});

/* ═════════════════════════════ Nguồn: ranh giới kiến trúc ═════════════════════════════ */

test('Nguồn: modal chi tiết đã gỡ; shell dùng định tuyến; nghiệp vụ cũ còn nguyên ở trang mới', () => {
  const shell = read('src/components/views/QAForumView.tsx');
  assert.doesNotMatch(shell, /selectedQuestion|setSelectedQuestion/, 'không còn state modal chi tiết');
  assert.doesNotMatch(shell, /aria-label="Chi tiết câu hỏi"/, 'không còn hộp thoại chi tiết');
  assert.doesNotMatch(shell, /CÁC BÀI GIẢI ĐÃ ĐÓNG GÓP|handleSolutionSubmit|solCooldown/, 'logic soạn lời giải đã chuyển sang trang');
  assert.doesNotMatch(shell, /const MATH_SYMBOLS|<ShareRow/, 'ký hiệu và chia sẻ nằm ở nơi dùng chung / trang chi tiết');
  assert.match(shell, /useQaRoute\(\)/);
  assert.match(shell, /navigateTo\(buildQuestionPath\(/);
  assert.match(shell, /rememberQaList\(/, 'ghi vị trí danh sách trước khi rời đi');
  assert.match(shell, /leaveQaDetail/);
  assert.match(shell, /import\('\.\/qa\/QADetailPage'\)/, 'trang chi tiết là chunk riêng, nạp sẵn khi rê chuột/rảnh');
  assert.match(shell, /onPointerEnter=\{prefetchQADetailPage\}/);
  /* các hộp thoại KHÁC vẫn còn: đặt câu hỏi, xác nhận xoá, sửa bài, tố cáo */
  for (const label of ['Đặt câu hỏi mới', 'Xác nhận xóa câu hỏi', 'Chỉnh sửa câu hỏi', 'Tố cáo tài khoản vi phạm']) {
    assert.match(shell, new RegExp(`aria-label="${label}"`), `giữ hộp thoại "${label}"`);
  }
  assert.match(shell, /MathSymbolsBar onInsert=\{sym => setNewContent\(newContent \+ sym\)\}/, 'modal đặt câu hỏi vẫn dùng bảng ký hiệu');

  const card = read('src/components/views/qa/QASolutionCard.tsx');
  assert.match(card, /const canConfirmBest = isSuperAdmin \|\| currentUser\?\.id === question\.authorId;/, 'quyền xác nhận: chỉ tác giả hoặc Super Admin');
  assert.match(card, /canConfirmBest && !solution\.isBest/);
  assert.match(card, /canEditContent && \(/, 'xoá lời giải: Super Admin / quyền edit_content');

  const page = read('src/components/views/qa/QADetailPage.tsx');
  assert.match(page, /Chỉ tác giả hoặc Super Admin mới có quyền xác nhận đáp án chuẩn/);
  assert.match(page, /<ShareRow url=\{buildQuestionPageUrl\(/, 'chia sẻ dùng địa chỉ trang mới');
  assert.match(page, /orderSolutions\(/);

  const composer = read('src/components/views/qa/QAComposer.tsx');
  assert.match(composer, /\+25 XP/);
  assert.match(composer, /maxLength=\{SOLUTION_MAX_LENGTH\}/);
  assert.match(composer, /SOLUTION_MAX_LENGTH = 1500/);
  assert.match(composer, /SOLUTION_COOLDOWN_SECONDS = 3/);
  assert.match(composer, /Vui lòng đăng nhập để gửi câu trả lời!/);
  assert.match(composer, /useDraftAutosave\(`fforum_draft_solution_\$\{questionId\}`/, 'nháp riêng cho từng câu hỏi');

  const app = read('src/App.tsx');
  assert.match(app, /useQaUrlSync\(currentView, handleViewChange\)/, 'App giữ thanh địa chỉ khớp phân khu');
  assert.match(app, /parseQaPath\(window\.location\.pathname\)\?\.kind === 'detail'/, 'bấm lại tab Hỏi đáp khi đang đọc → về danh sách');
  assert.match(read('src/store/forumStore.ts'), /isQaPath\(window\.location\.pathname\)\) return 'qa'/, 'tải thẳng /hoi-dap/... vào đúng phân khu');
});

test('Nguồn: giảm chuyển động được tôn trọng; chuyển cảnh chỉ bật khi hỗ trợ; có rào chắn cho chunk chưa nạp', () => {
  const css = read('src/components/views/qa/QADetail.css');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.ff-qa-page,\s*\.ff-qa-list-return \{ animation: none; \}/);
  assert.match(css, /\.ff-qa-sheet \{ animation: none; \}/);
  assert.match(css, /\.ff-qa-official--new \{ animation: none; \}/);
  assert.match(css, /ff-qa-page \{ animation: ffQaPageIn 250ms [^;]* backwards; \}/, 'mờ + trượt 250ms, fill-mode backwards (không để lại transform)');
  assert.doesNotMatch(css, /ff-qa-page \{[^}]*\bboth\b/, 'transform còn sót sẽ biến mọi position:fixed bên trong thành tương đối');
  assert.match(css, /html\.ff-vt-qa::view-transition-old\(qa-hero\)/, 'quy tắc chuyển cảnh nằm sau lớp ff-vt-qa');
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), /^::view-transition/m, 'không có quy tắc chuyển cảnh toàn cục');
  const vt = read('src/utils/viewTransition.ts');
  assert.match(vt, /prefersReducedMotion\(\)/);
  assert.match(vt, /typeof doc\.startViewTransition !== 'function'/);
  assert.match(vt, /flushSync\(update\)/);
  assert.match(vt, /setTimeout\(poll, 16\)/, 'đợi bằng timer: lúc chờ, rAF bị tạm dừng');
  const shell = read('src/components/views/QAForumView.tsx');
  assert.match(shell, /if \(qaDetailChunkReady\)/, 'chưa nạp xong chunk thì điều hướng ngay, không chuyển cảnh với khung chờ');
});

test('Nguồn: router không phá điều hướng cũ (chỉ Hỏi đáp có URL), liên kết ?q= cũ vẫn đọc được', () => {
  const router = read('src/utils/qaRouter.ts');
  assert.match(router, /readSharedQuestionId\(search\)/);
  assert.match(router, /window\.history\.go\(-depth\)/);
  assert.match(router, /reset: true, state: \{ ffView: 'qa' \}/);
  assert.match(router, /Record<DimensionView, true>/, 'thêm phân khu mới mà quên cập nhật là lỗi biên dịch');
  const share = read('src/utils/shareLinks.ts');
  assert.match(share, /readSharedQuestionId/, 'giữ bộ đọc liên kết cũ');
  for (const file of ['qaRoute.ts', 'mathSymbols.ts']) {
    assert.doesNotMatch(read(`src/utils/${file}`), /^import\s/m, `${file}: module thuần, test được bằng node`);
  }
});
