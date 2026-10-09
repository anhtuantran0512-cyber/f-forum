/**
 * Giai đoạn hoàn thiện: Nhiemvu_6 (orb · steampunk · liquid palette), các demo còn lại
 * của code_yeucau.md, 5 vòng tự nâng cấp (R1–R5) và "Đăng xuất mọi thiết bị".
 * Hàm thuần được nạp và chạy thật; phần giao diện kiểm bằng nội dung mã nguồn.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';

const TEST_ADMIN_PASSWORD = 'test-only-super-admin-password-final';
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fforum-final-'));
process.env.FFORUM_DATA_DIR = DATA_DIR;
process.env.FFORUM_ADMIN_PASSWORD = TEST_ADMIN_PASSWORD;

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const streak = await import('../src/utils/streakWindow.ts');
const share = await import('../src/utils/shareLinks.ts');
const notice = await import('../src/utils/moderationNotice.ts');
const { rafThrottle } = await import('../src/utils/rafThrottle.ts');
const { moderationForLogin } = await import('../server/moderation.ts');
const delighters = await import('../src/utils/delighters.ts');
const { setupForumServer } = await import('../server/forumServer.ts');

test.after(() => fs.rmSync(DATA_DIR, { recursive: true, force: true }));

/* ------------------------------------------------------------------ Nhiemvu_6 */

test('Nhiemvu_6 (1): nút orb giữ đúng công thức mẫu và được dùng ở sổ tay + phòng Focus', () => {
  const css = read('src/components/ui/OrbButton.css');
  for (const glow of ['52, 142, 150', '180, 195, 210', '188, 108, 148']) {
    assert.ok(css.includes(glow), `thiếu sắc ${glow}`);
  }
  assert.match(css, /\.ff-orb::before \{/, 'highlight ::before');
  assert.match(css, /ffOrbShimmer/, 'shimmer sweep ::after');
  assert.match(css, /transform: scale\(1\.06\)/, 'hover phóng 1.06');
  assert.match(css, /transform: scale\(0\.92\)/, 'active thu 0.92');
  assert.match(css, /stroke-dasharray: 40/, 'dấu ✓ tự vẽ');
  assert.match(css, /letter-spacing: 3px/);
  assert.match(css, /letter-spacing: 5px/, 'nhãn giãn chữ 3 → 5px');
  assert.match(css, /animation-delay: calc\(var\(--orb-i, 0\) \* 90ms\)/, 'floatIn so le');
  assert.match(css, /backwards/, 'fill backwards để không khoá transform của :hover');
  const tsx = read('src/components/ui/OrbButton.tsx');
  assert.match(tsx, /aria-label=\{rest\['aria-label'\] \?\? label\}/, 'nút icon vẫn có tên truy cập');
  for (const file of ['src/components/QuickNotesDock.tsx', 'src/components/FocusSanctuary.tsx']) {
    const src = read(file);
    assert.match(src, /<OrbButton/, `${file} dùng OrbButton`);
    assert.match(src, /tone=\{copied \? 'mauve' : 'silver'\}/, `${file}: chép → mauve vẽ dấu ✓`);
  }
});

test('Nhiemvu_6 (2): nút submit đăng nhập/đăng ký là nút đồng thau steampunk', () => {
  const css = read('src/components/auth/AuthExperience.css');
  for (const token of ['--sp-bronze-dark: #2b2927', '--sp-bronze-hi: #fce3a1', '--sp-glass-deep: #281d08', '--sp-amber: #ffc95e']) {
    assert.ok(css.includes(token), token);
  }
  assert.match(css, /\.auth-submit::before \{[^}]*radial-gradient\(circle at 50% 50%, var\(--sp-glass-bright\)/, 'mặt kính hổ phách');
  assert.match(css, /\.auth-submit::after \{[^}]*mix-blend-mode: color-dodge/, 'quầng amber');
  assert.match(css, /@keyframes ffAmberPulse/);
  assert.equal((read('src/components/AuthModal.tsx').match(/className="auth-submit"/g) || []).length, 3, 'cả 3 form dùng chung');
});

test('Nhiemvu_6 (3): bảng màu liquid glass cho navbar + Cài đặt ở chế độ sáng, không phá invariant', () => {
  const css = read('src/index.css');
  assert.ok(css.includes('--lq-rim: rgba(51, 51, 51, 0.08);'));
  assert.ok(css.includes('--lq-hi: rgba(255, 255, 255, 0.9);'));
  assert.ok(css.includes('--lq-hi-soft: rgba(255, 255, 255, 0.55);'));
  assert.ok(css.includes('--lq-ink: #3e3e3e;'));
  assert.match(css, /html\.light \.ff-nav-aura::after \{[^}]*linear-gradient\(45deg, var\(--lq-sheen\) 0%, transparent 25%, transparent 75%, var\(--lq-sheen\) 100%\)[^}]*filter: blur\(7px\)/);
  assert.match(css, /html\.light \.settings-modal\.ff-settings-panel\.liquid-glass \{[^}]*rgba\(247, 247, 249, 0\.98\)/, 'kính Cài đặt đục ≥ .95');
  assert.ok(css.includes('background: linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(241, 245, 249, 0.30));'), 'capsule sáng giữ độ trong cũ');
  const settings = read('src/components/SettingsModal.tsx');
  assert.match(settings, /ff-set-card rounded-2xl/);
  assert.match(settings, /ff-set-ico w-5 h-5/);
});

/* ------------------------------------------------------------ code_yeucau.md */

test('cdt-16: cửa sổ giữ chuỗi tính theo giờ Việt Nam', () => {
  // 2026-03-10 16:30:15 UTC = 23:30:15 giờ VN → còn 29 phút 45 giây tới 0h
  const at = Date.UTC(2026, 2, 10, 16, 30, 15);
  assert.equal(streak.secondsIntoDay(at), 23 * 3600 + 30 * 60 + 15);
  assert.equal(streak.msUntilNextDay(at), (29 * 60 + 45) * 1000);
  assert.equal(streak.formatCountdown(streak.msUntilNextDay(at)), '00:29:45');
  // Đúng 0h VN (17:00 UTC hôm trước) → còn trọn 24 giờ
  assert.equal(streak.msUntilNextDay(Date.UTC(2026, 2, 10, 17, 0, 0)), streak.DAY_MS);
  assert.equal(streak.streakUrgency(30 * 60_000, false), 'critical');
  assert.equal(streak.streakUrgency(5 * 3_600_000, false), 'warn');
  assert.equal(streak.streakUrgency(10 * 3_600_000, false), 'safe');
  assert.equal(streak.streakUrgency(1000, true), 'done');
  assert.equal(streak.streakFlameLevel(streak.DAY_MS / 2), 0.5, 'lửa mờ dần theo thời gian còn lại');
  const modal = read('src/components/DailyEngagementModal.tsx');
  assert.match(modal, /<StreakCountdown streak=\{streak\} claimedToday=\{hasClaimedToday\} \/>/);
});

test('cdt-22 / stk-02: đồng hồ lật ở vòng Focus, chồng thẻ vuốt cho mẹo hằng ngày', () => {
  assert.match(read('src/components/FocusSanctuary.tsx'), /label=\{remainingLabel\}\n\s*flip\n/);
  const ring = read('src/components/CircularProgressRing.tsx');
  assert.match(ring, /<FlipClock value=\{label\}/);
  const flipCss = read('src/components/ui/FlipClock.css');
  assert.match(flipCss, /@keyframes ffFlipTop \{\s*to \{ transform: rotateX\(-90deg\); \}/);
  assert.match(flipCss, /\.ff-flip__card::after \{/, 'bản lề giữa thẻ');
  assert.match(read('src/components/ui/FlipClock.tsx'), /onAnimationEnd=\{settle\}/, 'chốt số mới khi lật xong');
  const deck = read('src/components/ui/SwipeDeck.tsx');
  assert.match(deck, /const DISMISS_PX = 90;/);
  assert.match(deck, /setPointerCapture/);
  assert.match(deck, /e\.key === 'ArrowRight'/, 'điều khiển được bằng bàn phím');
  assert.match(read('src/components/ui/SwipeDeck.css'), /touch-action: pan-y/, 'không chặn cuộn dọc');
  const modal = read('src/components/DailyEngagementModal.tsx');
  assert.match(modal, /<SwipeDeck/);
  assert.doesNotMatch(modal, /setTipIndex/, 'bỏ dải chữ tự chạy 6 giây');
});

test('tcg-12 / masonry / tcl-14 / tch-15: bố cục ảnh, cột và thẻ container query', () => {
  const about = read('src/components/AboutUs.tsx');
  assert.match(about, /ff-collage__tile--\$\{i \+ 1\}/);
  assert.match(about, /collageMilestones = aboutData\.milestones\.filter/);
  assert.match(about, /className="bento-grid ff-masonry"/);
  const aboutCss = read('src/components/about/AboutLayouts.css');
  assert.match(aboutCss, /\.ff-collage__tile--5 \{ grid-column: 3 \/ span 2; grid-row: 5 \/ span 2; \}/);
  assert.match(aboutCss, /break-inside: avoid/);
  const clubsCss = read('src/components/views/ClubsView.css');
  assert.match(clubsCss, /container: ff-media \/ inline-size;/);
  assert.match(clubsCss, /@container ff-media \(min-width: 420px\)/);
  assert.match(read('src/components/views/ClubsView.tsx'), /className="ff-media-grid"/);
  assert.match(read('src/components/views/ComingSoonView.tsx'), /<DepthLandscapeCard/);
  assert.match(read('src/components/ui/DepthLandscapeCard.tsx'), /requestAnimationFrame/, 'con trỏ chỉ ghi biến CSS theo khung hình');
});

test('social share + deep-link ?q=: id được lọc chặt', () => {
  assert.equal(share.readSharedQuestionId('?q=q-1700000000_abc'), 'q-1700000000_abc');
  assert.equal(share.readSharedQuestionId('?q=%3Cscript%3E'), null, 'chặn ký tự lạ');
  assert.equal(share.readSharedQuestionId(`?q=${'a'.repeat(81)}`), null, 'chặn id quá dài');
  assert.equal(share.readSharedQuestionId('?x=1'), null);
  assert.equal(share.buildQuestionShareUrl('q 1', 'https://f.forum', '/'), 'https://f.forum/?q=q%201');
  assert.equal(share.stripSharedQuestionParam('https://f.forum/app?q=abc&tab=2#top'), '/app?tab=2#top');
  const qa = read('src/components/views/QAForumView.tsx');
  assert.match(qa, /<ShareRow/);
  assert.match(qa, /window\.history\.replaceState/, 'đóng câu hỏi thì gỡ ?q=');
  assert.match(read('src/store/forumStore.ts'), /readSharedQuestionId\(window\.location\.search\)\) return 'qa'/);
  const row = read('src/components/ui/ShareRow.tsx');
  assert.match(row, /rel="noopener noreferrer"/);
  assert.match(row, /navigator\.clipboard\.writeText\(url\)/);
});

test('tpop-04 / ntf-13 / cl-03: popover đủ 3 phần, badge khoét thật, thang bo góc', () => {
  const tip = read('src/components/ui/InfoTip.css');
  assert.match(tip, /@starting-style \{/);
  assert.match(tip, /display 0\.2s allow-discrete/);
  assert.match(tip, /\.ff-infotip:focus-within \.ff-infotip__bubble/, 'vẫn mở được bằng bàn phím');
  const nav = read('src/components/Navbar.tsx');
  assert.equal((nav.match(/ff-notif-notched/g) || []).length, 2, 'cả chuông desktop lẫn mobile');
  assert.doesNotMatch(nav, /ring-\[#0a0f14\]/, 'bỏ vòng giả màu nền');
  const css = read('src/index.css');
  assert.match(css, /clip-path: path\(evenodd, 'M0 0H18V18H0Z M29 1A10 10 0 1 0 9 1A10 10 0 1 0 29 1Z'\)/);
  assert.match(css, /--clay-r-lg: 28px;/);
  assert.match(css, /\.pc-12-well \{\n  border-radius: var\(--clay-r-md\);/);
  assert.match(css, /\.clay-card \{[^}]*border-radius: var\(--clay-r-xl\);/);
});

/* ------------------------------------------------------------ 5 vòng nâng cấp */

test('R1 · CSS: code chết đã xoá, gradient aurora chạy bằng transform', () => {
  const css = read('src/index.css');
  assert.equal(fs.existsSync(path.join(root, 'src/components/DataVizChart.tsx')), false);
  assert.doesNotMatch(css, /\.circular-progress-ring|\.clay-stat|\.clay-avatar/);
  const drift = css.slice(css.indexOf('@keyframes ff-aurora-drift'), css.indexOf('@keyframes ff-aurora-drift') + 200);
  assert.match(drift, /translate3d/);
  assert.doesNotMatch(drift, /background-position/, 'không repaint mỗi khung hình');
});

test('R2 · Màu: xám chữ phụ ở nền tối đạt AA, số liệu clay nổi khối bằng drop-shadow', () => {
  const css = read('src/index.css');
  assert.match(css, /html:not\(\.light\) \{\n  --color-neutral-400: #a3a9b3;\n  --color-neutral-500: #80868f;/);
  const lum = (hex) => {
    const c = hex.match(/\w\w/g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  assert.ok(ratio('80868f', '0b0f17') >= 4.5, 'neutral-500 mới đạt AA trên nền tối');
  assert.ok(ratio('737373', '0b0f17') < 4.5, 'giá trị cũ không đạt (lý do sửa)');
  assert.match(css, /\.pc-12-stat__value \{\n  color: color-mix\(in srgb, var\(--stat-accent\) 84%, #e2e8f0\);\n  filter: drop-shadow/);
});

test('R3 · Delighters + logic khoá khi đăng nhập lại', () => {
  assert.ok(delighters.TICK_SELECTOR.includes('button'));
  assert.ok(!delighters.RIPPLE_SELECTOR.includes('ff-share__btn'), 'nút có tooltip tràn viền không bị gợn sóng cắt');
  assert.match(read('src/App.tsx'), /useEffect\(\(\) => installDelighters\(\), \[\]\);/);
  const audio = read('src/utils/audio.ts');
  assert.match(audio, /export function playUiTick\(\): void \{\n  if \(!isSfxEnabled\(\)\) return;/, 'tôn trọng nút tắt âm thanh');
  assert.match(read('src/components/auth/FlashlightPasswordField.tsx'), /data-silent/, 'đèn pin đã có âm riêng');

  const now = Date.UTC(2026, 9, 9, 12, 0, 0);
  const map = {
    'active@x.vn': { bannedUntil: now + 60_000, reason: 'spam' },
    'expired@x.vn': { bannedUntil: now - 1, reason: 'cũ' },
    'forever@x.vn': { bannedUntil: 0 },
  };
  const active = moderationForLogin(map, 'ACTIVE@x.vn', now);
  assert.equal(active.status.banned, true, 'so email không phân biệt hoa thường');
  assert.equal(active.staleKey, null);
  const boundary = moderationForLogin(map, 'active@x.vn', now + 60_000);
  assert.equal(boundary.status.banned, false, 'đúng thời điểm hết hạn là đã gỡ');
  const expired = moderationForLogin(map, 'expired@x.vn', now);
  assert.equal(expired.status.banned, false);
  assert.equal(expired.staleKey, 'expired@x.vn', 'bản ghi hết hạn được đánh dấu để dọn');
  assert.equal(moderationForLogin(map, 'forever@x.vn', now + 1e12).status.banned, true, 'cấm vĩnh viễn (0) không bao giờ hết hạn');
  assert.deepEqual(moderationForLogin(map, 'none@x.vn', now), { status: { banned: false, muted: false }, staleKey: null });

  assert.equal(notice.describeLoginModeration({ banned: false, muted: false }), null);
  assert.match(notice.describeLoginModeration({ banned: true, bannedUntil: 0, reason: 'spam' }).subtitle, /vĩnh viễn\. Lý do: spam/);
  assert.match(notice.describeLoginModeration({ muted: true, mutedUntil: now }).title, /khoá gửi tin/);
});

test('R4 · Hiệu năng: rafThrottle gộp nhiều lần gọi trong 1 khung, popover/scroll dùng nó', async () => {
  const calls = [];
  const fn = rafThrottle((v) => calls.push(v));
  fn(1);
  fn(2);
  fn(3);
  await new Promise((r) => setTimeout(r, 40));
  assert.deepEqual(calls, [3], 'chỉ xử lý 1 lần với đối số cuối');
  fn(4);
  fn.cancel();
  await new Promise((r) => setTimeout(r, 40));
  assert.deepEqual(calls, [3], 'cancel huỷ khung đang chờ');
  const pop = read('src/utils/popover.ts');
  assert.match(pop, /window\.addEventListener\('scroll', onFrame, \{ capture: true, passive: true \}\);/);
  assert.match(pop, /JSON\.stringify\(prev\.style\) === JSON\.stringify\(next\.style\) \? prev : next/, 'cùng vị trí thì không render lại');
  assert.match(read('src/App.tsx'), /const onScrollFrame = rafThrottle\(checkScroll\);/);
});

test('R5 · Responsive: bộ chọn nền Potator chuyển danh sách dọc trên điện thoại', () => {
  const css = read('src/index.css');
  const block = css.slice(css.indexOf('VÒNG NÂNG CẤP R5'));
  assert.match(block, /@media \(max-width: 640px\) \{\n  \.ff-potator-presets \{\n    grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(block, /min-height: 48px;/, 'vùng chạm đủ lớn');
  assert.match(read('src/components/SettingsModal.tsx'), /className="ff-potator-presets grid grid-cols-3 gap-2"/);
});

/* --------------------------------------------- Tích hợp máy chủ: khoá + đăng xuất */

function createTestServer() {
  const middleware = [];
  const runner = { use(fn) { middleware.push(fn); } };
  const server = http.createServer((req, res) => {
    let index = 0;
    const next = () => {
      if (index < middleware.length) middleware[index++](req, res, next);
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
      resolve({
        baseUrl: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise((done) => {
          server.close(done);
          for (const socket of sockets) socket.destroy();
        }),
      });
    });
  });
}

async function call(baseUrl, method, route, body, token) {
  const res = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

test('Máy chủ: đăng nhập/khôi phục phiên trả trạng thái khoá theo giờ hiện tại; đăng xuất mọi thiết bị thu hồi token', async () => {
  const env = await createTestServer();
  try {
    const email = `ban.${Date.now()}@example.test`;
    const reg = await call(env.baseUrl, 'POST', '/api/auth/register', { name: 'Học sinh thử', email, password: 'mat-khau-test-123' });
    assert.equal(reg.status, 200, JSON.stringify(reg.data));

    const admin = await call(env.baseUrl, 'POST', '/api/auth/login', { email: 'BroAmStuck@gmail.com', password: TEST_ADMIN_PASSWORD });
    assert.equal(admin.status, 200);

    const fresh = await call(env.baseUrl, 'POST', '/api/auth/login', { email, password: 'mat-khau-test-123' });
    assert.deepEqual(fresh.data.moderation, { banned: false, muted: false }, 'chưa bị khoá');

    const ban = await call(env.baseUrl, 'POST', '/api/admin/moderate', { email, action: 'ban', durationMinutes: 60, reason: 'Thử nghiệm' }, admin.data.token);
    assert.equal(ban.status, 200, JSON.stringify(ban.data));

    const login = await call(env.baseUrl, 'POST', '/api/auth/login', { email, password: 'mat-khau-test-123' });
    assert.equal(login.status, 200, 'người bị cấm đăng bài vẫn đăng nhập để xem được');
    assert.equal(login.data.moderation.banned, true);
    assert.ok(login.data.moderation.bannedUntil > Date.now(), 'kèm thời hạn');
    assert.equal(login.data.moderation.reason, 'Thử nghiệm');

    const session = await call(env.baseUrl, 'GET', '/api/auth/session', undefined, login.data.token);
    assert.equal(session.data.moderation.banned, true, 'khôi phục phiên cũng báo trạng thái');

    const unban = await call(env.baseUrl, 'POST', '/api/admin/moderate', { email, action: 'unban' }, admin.data.token);
    assert.equal(unban.status, 200, JSON.stringify(unban.data));
    const after = await call(env.baseUrl, 'POST', '/api/auth/login', { email, password: 'mat-khau-test-123' });
    assert.equal(after.data.moderation.banned, false, 'gỡ khoá có hiệu lực ngay lần đăng nhập sau');

    // Đăng xuất mọi thiết bị: token ở "máy khác" (login trước) cũng mất hiệu lực
    const otherDevice = after.data.token;
    const thisDevice = (await call(env.baseUrl, 'POST', '/api/auth/login', { email, password: 'mat-khau-test-123' })).data.token;
    await new Promise((r) => setTimeout(r, 5));
    const out = await call(env.baseUrl, 'POST', '/api/auth/logout', { everywhere: true }, thisDevice);
    assert.equal(out.data.revoked, true);
    const stale = await call(env.baseUrl, 'GET', '/api/auth/session', undefined, otherDevice);
    assert.equal(stale.status, 401, 'token của thiết bị khác bị thu hồi');
  } finally {
    await env.close();
  }
});

test('Cài đặt có nút "Đăng xuất mọi thiết bị" chỉ xoá phiên cục bộ khi máy chủ xác nhận', () => {
  const settings = read('src/components/SettingsModal.tsx');
  assert.match(settings, /Đăng xuất mọi thiết bị/);
  assert.match(settings, /const ok = await onLogoutEverywhere\(\);/);
  assert.match(settings, /\{isAuthenticated && onLogoutEverywhere && \(/, 'khách không thấy mục này');
  const store = read('src/store/forumStore.ts');
  assert.match(store, /const revoked = await requestServerLogout\(true\);\n\s+if \(!revoked\) return false;\n\s+logout\(\{ skipServer: true \}\);/);
  assert.match(read('src/components/Navbar.tsx'), /isAuthenticated: Boolean\(currentUser\),\n    onLogoutEverywhere,/);
});

/** Socket thử nghiệm: hộp thư + chờ đúng loại sự kiện (kể cả sự kiện đã tới trước). */
function openSocket(baseUrl) {
  const ws = new WebSocket(`${baseUrl.replace(/^http/, 'ws')}/ws`);
  const inbox = [];
  const waiters = [];
  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    const waiter = waiters.find((w) => w.match(msg));
    if (waiter) {
      waiters.splice(waiters.indexOf(waiter), 1);
      clearTimeout(waiter.timer);
      waiter.resolve(msg);
    } else {
      inbox.push(msg);
    }
  });
  const next = (match, label, timeoutMs = 3000) => new Promise((resolve, reject) => {
    const index = inbox.findIndex(match);
    if (index >= 0) { resolve(inbox.splice(index, 1)[0]); return; }
    const waiter = { match, resolve, timer: setTimeout(() => reject(new Error(`Hết giờ chờ ${label}`)), timeoutMs) };
    waiters.push(waiter);
  });
  return {
    ws,
    opened: new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); }),
    send: (type, payload) => ws.send(JSON.stringify({ type, payload })),
    next: (type, timeoutMs) => next((m) => m.type === type, type, timeoutMs),
    nextWhere: (match, label, timeoutMs) => next(match, label, timeoutMs),
  };
}

test('WebSocket: "đăng xuất mọi thiết bị" gỡ danh tính socket đang mở ở thiết bị khác ngay lập tức', async () => {
  const env = await createTestServer();
  const opened = [];
  try {
    const email = `ws.revoke.${Date.now()}@example.test`;
    const password = 'mat-khau-test-456';
    const reg = await call(env.baseUrl, 'POST', '/api/auth/register', { name: 'Thiết bị thử', email, password });
    assert.equal(reg.status, 200, JSON.stringify(reg.data));
    const tokenA = (await call(env.baseUrl, 'POST', '/api/auth/login', { email, password })).data.token;

    const deviceA = openSocket(env.baseUrl);
    const bystander = openSocket(env.baseUrl);
    opened.push(deviceA.ws, bystander.ws);
    await Promise.all([deviceA.opened, bystander.opened]);
    deviceA.send('AUTH', { token: tokenA });
    assert.equal((await deviceA.next('AUTH_OK')).payload.email, email);

    // Đối chứng: trước khi thu hồi, socket đã AUTH gửi chat được.
    const beforeId = `chat-before-${Date.now()}`;
    deviceA.send('NEW_CHAT_MESSAGE', { id: beforeId, content: 'trước khi thu hồi', authorEmail: email });
    await deviceA.nextWhere((m) => m.type === 'NEW_CHAT_MESSAGE' && m.payload?.id === beforeId, 'tin đối chứng');

    // Thiết bị B đăng xuất mọi nơi.
    await new Promise((r) => setTimeout(r, 5));
    const tokenB = (await call(env.baseUrl, 'POST', '/api/auth/login', { email, password })).data.token;
    const out = await call(env.baseUrl, 'POST', '/api/auth/logout', { everywhere: true }, tokenB);
    assert.equal(out.data.revoked, true);

    const sync = await call(env.baseUrl, 'GET', '/api/sync');
    assert.equal(Object.keys(sync.data.data.users[email]).some((k) => /revok/i.test(k)), false, 'mốc thu hồi không lộ qua /api/sync');

    const notice = await deviceA.next('SESSION_REVOKED');
    assert.equal(notice.payload.reason, 'everywhere', 'socket của tài khoản nhận lệnh dọn phiên');
    await assert.rejects(bystander.next('SESSION_REVOKED', 250), /Hết giờ/, 'socket khách/người khác không nhận');

    // Socket cũ mất quyền ngay, không đợi kết nối lại.
    deviceA.send('NEW_CHAT_MESSAGE', { id: `chat-after-${Date.now()}`, content: 'sau khi thu hồi', authorEmail: email });
    const denied = await deviceA.next('FORBIDDEN');
    assert.equal(denied.payload.action, 'NEW_CHAT_MESSAGE');

    deviceA.send('AUTH', { token: tokenA });
    await deviceA.next('AUTH_ERROR');

    // Mốc thu hồi không chặn lần đăng nhập mới.
    await new Promise((r) => setTimeout(r, 5));
    const fresh = await call(env.baseUrl, 'POST', '/api/auth/login', { email, password });
    assert.equal((await call(env.baseUrl, 'GET', '/api/auth/session', undefined, fresh.data.token)).status, 200);
    deviceA.send('AUTH', { token: fresh.data.token });
    assert.equal((await deviceA.next('AUTH_OK')).payload.email, email);
  } finally {
    for (const ws of opened) { try { ws.terminate(); } catch { /* đã đóng */ } }
    await env.close();
  }
});

test('Mốc thu hồi cũ nằm trong bản ghi user được chuyển sang kho riêng khi khởi động, không lộ qua /api/sync', async () => {
  const password = 'mat-khau-test-789';
  const stamp = Date.now();
  const victim = `legacy.revoke.${stamp}@example.test`;
  const control = `legacy.control.${stamp}@example.test`;
  let env = await createTestServer();
  let victimToken;
  let controlToken;
  try {
    for (const email of [victim, control]) {
      const reg = await call(env.baseUrl, 'POST', '/api/auth/register', { name: 'Tài khoản thử', email, password });
      assert.equal(reg.status, 200, JSON.stringify(reg.data));
    }
    victimToken = (await call(env.baseUrl, 'POST', '/api/auth/login', { email: victim, password })).data.token;
    controlToken = (await call(env.baseUrl, 'POST', '/api/auth/login', { email: control, password })).data.token;
  } finally {
    await env.close();
  }

  // Chờ lượt ghi đĩa (debounce 200ms) rồi giả lập tệp dữ liệu định dạng CŨ.
  await new Promise((r) => setTimeout(r, 400));
  const file = path.join(DATA_DIR, 'forum-data.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.ok(data.users[victim], 'tài khoản thử đã được ghi xuống đĩa');
  data.users[victim].sessionsRevokedAt = Date.now() + 1;
  delete data.sessionRevocations;
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');

  env = await createTestServer(); // khởi động lại → loadStoreFromDisk đọc tệp cũ
  try {
    const stale = await call(env.baseUrl, 'GET', '/api/auth/session', undefined, victimToken);
    assert.equal(stale.status, 401, 'token đã bị thu hồi theo định dạng cũ vẫn bị từ chối sau nâng cấp');
    const untouched = await call(env.baseUrl, 'GET', '/api/auth/session', undefined, controlToken);
    assert.equal(untouched.status, 200, 'đối chứng: token tài khoản khác vẫn hợp lệ (không phải do đổi khoá ký)');

    const sync = await call(env.baseUrl, 'GET', '/api/sync');
    assert.equal('sessionsRevokedAt' in sync.data.data.users[victim], false, 'trường cũ bị gỡ khỏi bản ghi công khai');

    await new Promise((r) => setTimeout(r, 5));
    const fresh = await call(env.baseUrl, 'POST', '/api/auth/login', { email: victim, password });
    assert.equal(fresh.status, 200);
    assert.equal('sessionsRevokedAt' in fresh.data.user, false);
    const session = await call(env.baseUrl, 'GET', '/api/auth/session', undefined, fresh.data.token);
    assert.equal(session.status, 200, 'đăng nhập mới sau mốc thu hồi vẫn dùng được');
  } finally {
    await env.close();
  }
});

test('Client dọn phiên khi nhận SESSION_REVOKED, bỏ qua sự kiện dội về thiết bị khởi xướng', () => {
  const store = read('src/store/forumStore.ts');
  assert.match(store, /case 'SESSION_REVOKED': \{\n[\s\S]{0,400}?if \(everywherePendingRef\.current \|\| !currentUserRef\.current\) break;\n\s+sessionRevokedRef\.current\(\);/);
  assert.match(store, /everywherePendingRef\.current = true;\n\s+try \{[\s\S]{0,300}?\} finally \{\n\s+everywherePendingRef\.current = false;/);
  assert.match(store, /sessionRevokedRef\.current = \(\) => \{\n\s+logout\(\{ skipServer: true \}\);/);
  const server = read('server/forumServer.ts');
  assert.match(server, /const sessionOf = \(ws: WebSocket\): SessionClaims \| null => \{[\s\S]{0,500}?if \(isSessionRevoked\(session\)\) \{/);
  assert.match(server, /store\.sessionRevocations = \{ \.\.\.\(store\.sessionRevocations \|\| \{\}\), \[claims\.email\]: Date\.now\(\) \};\n\s+persistStoreToDisk\(\);\n\s+revokeAccountSockets\(claims\.email\);/);
});

test('Mở lại app khi đang bị khoá: khôi phục phiên (Bearer lẫn cookie) cũng báo trạng thái khoá', () => {
  const store = read('src/store/forumStore.ts');
  assert.match(store, /setCurrentUser\(fresh\);\n\s+announceRestoredLock\(sessionJson\.moderation\);/);
  assert.match(store, /setCurrentUser\(fresh\);\n\s+announceRestoredLock\(probed\.moderation\);/);
  assert.match(store, /const notice = describeLoginModeration\(moderation as LoginModeration \| null \| undefined\);\n\s+if \(notice && isMounted\) setToastMessage/);
  assert.match(read('src/utils/session.ts'), /return \{ user: data\.user, expiresAt: data\.expiresAt, moderation: data\.moderation \};/);
});

test('msn-10: bảng tổng quan quản trị là masonry lượng tử, xếp dense KÍN ở cả 4 cột và 2 cột', () => {
  const css = read('src/components/AdminInsightsModal.css');
  const block = css.slice(css.indexOf('code_yeucau · msn-10'));
  assert.match(block, /grid-auto-rows: minmax\(var\(--faa-unit\), auto\);\n  grid-auto-flow: row dense;/);
  assert.match(block, /--faa-unit: 132px;/);
  // Bất biến cũ của test Admin Insights vẫn còn
  assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /@container \(max-width: 650px\)/);

  // Thứ tự ô thật trong JSX (khớp với mô phỏng bên dưới)
  const tsx = read('src/components/AdminInsightsModal.tsx');
  const board = tsx.slice(tsx.indexOf('faa-bento cdl-01__board'), tsx.indexOf('faa-privacy-note'));
  const order = [...board.matchAll(/faa-tile--(hero|chart|reports|clubs|activity|top-members)\b|<MetricTile|faa-tile--gauge/g)].map((m) => m[1] || (m[0] === '<MetricTile' ? 'metric' : 'gauge'));
  assert.deepEqual(order, ['hero', 'metric', 'metric', 'metric', 'metric', 'chart', 'metric', 'metric', 'metric', 'gauge', 'reports', 'clubs', 'activity', 'top-members']);

  // Mô phỏng thuật toán grid-auto-flow: row dense (mỗi ô tìm chỗ trống đầu tiên từ góc trên-trái)
  const spans = (cols) => ({
    hero: [2, 2], chart: [2, 2], metric: [1, 1], gauge: [1, 1], reports: [1, 2], clubs: [1, 2],
    activity: [2, 2], 'top-members': [cols, 1],
  });
  const pack = (cols) => {
    const grid = [];
    const free = (r, c, w, h) => {
      for (let y = r; y < r + h; y += 1) for (let x = c; x < c + w; x += 1) if (x >= cols || grid[y]?.[x]) return false;
      return true;
    };
    for (const kind of order) {
      const [w, h] = spans(cols)[kind];
      let placed = false;
      for (let r = 0; !placed; r += 1) {
        for (let c = 0; c + w <= cols && !placed; c += 1) {
          if (free(r, c, w, h)) {
            for (let y = r; y < r + h; y += 1) { grid[y] = grid[y] || Array(cols).fill(null); for (let x = c; x < c + w; x += 1) grid[y][x] = kind; }
            placed = true;
          }
        }
      }
    }
    return grid;
  };
  for (const cols of [4, 2]) {
    const grid = pack(cols);
    const holes = grid.flat().filter((cell) => cell === null).length;
    assert.equal(holes, 0, `${cols} cột: không còn ô trống`);
    assert.equal(grid.length, cols === 4 ? 7 : 13, `${cols} cột: số hàng như thiết kế`);
  }
});
