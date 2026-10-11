/* Bản quyền trí tuệ thuộc về BroAmStuck
   Quảng Trường CLB — tương phản (WCAG AA), MỘT nút CTA, MỘT trạng thái trống, banner chỉ khi có số liệu thật,
   thẻ gọn 3 cột; cùng lớp phủ Potator dùng chung và chốt chặn hồi quy xếp chồng (modal phải che được navbar). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { LIGHT_TOKENS, LIGHT_VIEWS, START_MARKER, END_MARKER } from '../scripts/generate-light-adapter.mjs';

const { GRADIENT_PRESETS, POTATOR_SCRIM, potatorScrim, relativeLuminance } = await import('../src/utils/gradients.ts');

const css = fs.readFileSync('src/index.css', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');

/* ───────────────────────── tiện ích WCAG (8-bit như trình duyệt) ───────────────────────── */
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const ratio = (a, b) => {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const mix = (from, to, t) => from.map((v, i) => Math.round(v + (to[i] - v) * t));
/** 41 mẫu dọc gradient (các điểm dừng cách đều) — độc lập với cách lấy mẫu trong cài đặt. */
const along = (colors) => {
  const stops = colors.map(hex);
  return Array.from({ length: 41 }, (_, k) => {
    const x = (k / 40) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(x));
    return mix(stops[i], stops[i + 1], x - i);
  });
};

/* Chữ phụ nhạt nhất đặt TRỰC TIẾP lên nền — lấy từ nguồn chuẩn, không chép cứng. */
const neutral400 = hex(css.match(/html:not\(\.light\) \{\s*--color-neutral-400: (#[0-9a-fA-F]{6});/)[1]);
const WHITE = [255, 255, 255];

test('Nền Potator: mọi preset × theme tối đều giữ chữ trắng và chữ phụ ≥ 4.5:1', () => {
  assert.equal(GRADIENT_PRESETS.length, 12);
  for (const preset of GRADIENT_PRESETS) {
    const { dark } = potatorScrim(preset);
    for (const bg of along(preset.colors)) {
      const surface = mix(bg, POTATOR_SCRIM.dark.color, dark);
      assert.ok(ratio(WHITE, surface) >= 4.5, `preset ${preset.id}: chữ trắng ${ratio(WHITE, surface).toFixed(2)}:1`);
      assert.ok(ratio(neutral400, surface) >= 4.5, `preset ${preset.id}: chữ phụ ${ratio(neutral400, surface).toFixed(2)}:1`);
    }
  }
});

test('Nền Potator: mọi preset × theme sáng đều giữ mực chính và mực mờ nhất ≥ 4.5:1', () => {
  for (const preset of GRADIENT_PRESETS) {
    const { light } = potatorScrim(preset);
    for (const bg of along(preset.colors)) {
      const surface = mix(bg, POTATOR_SCRIM.light.color, light);
      assert.ok(ratio(hex(LIGHT_TOKENS.ink), surface) >= 4.5, `preset ${preset.id}: mực chính`);
      assert.ok(ratio(hex(LIGHT_TOKENS.faint), surface) >= 4.5,
        `preset ${preset.id}: mực mờ ${ratio(hex(LIGHT_TOKENS.faint), surface).toFixed(2)}:1`);
    }
  }
});

test('Lớp phủ chỉ đủ đục cần thiết: preset vốn đã tối/sáng gần như không đổi, không bao giờ vượt mức', () => {
  const byId = Object.fromEntries(GRADIENT_PRESETS.map((p) => [p.id, potatorScrim(p)]));
  assert.ok(byId['09'].dark <= 0.3, 'preset mặc định (xanh đen) chỉ bị tối nhẹ');
  assert.ok(byId['10'].dark <= 0.2, 'đen kim loại gần như giữ nguyên');
  assert.ok(byId['11'].light <= 0.05, 'preset sáng ở theme sáng gần như giữ nguyên');
  for (const preset of GRADIENT_PRESETS) {
    const { dark, light } = potatorScrim(preset);
    assert.ok(dark >= 0 && dark <= 0.9 && light >= 0 && light <= 0.9, `preset ${preset.id}: độ đục hợp lý`);
    /* Tối thiểu thật sự: bớt 0.02 là vi phạm ngưỡng thiết kế. */
    const samples = along(preset.colors);
    if (dark > 0.02) {
      const worst = Math.max(...samples.map((c) => relativeLuminance(c.map((v, i) => v + (POTATOR_SCRIM.dark.color[i] - v) * (dark - 0.02)))));
      assert.ok(worst > POTATOR_SCRIM.dark.maxLuminance, `preset ${preset.id}: lớp phủ tối không thừa`);
    }
    if (light > 0.02) {
      const worst = Math.min(...samples.map((c) => relativeLuminance(c.map((v, i) => v + (POTATOR_SCRIM.light.color[i] - v) * (light - 0.02)))));
      assert.ok(worst < POTATOR_SCRIM.light.minLuminance, `preset ${preset.id}: lớp phủ sáng không thừa`);
    }
  }
  /* Ngưỡng thiết kế phải còn đạt AA với chính token chữ (đổi token thì test này nhắc cập nhật hằng số). */
  assert.ok(POTATOR_SCRIM.dark.maxLuminance <= (relativeLuminance(neutral400) + 0.05) / 4.5 - 0.05);
  assert.ok(POTATOR_SCRIM.light.minLuminance >= 4.5 * (relativeLuminance(hex(LIGHT_TOKENS.faint)) + 0.05) - 0.05);
});

test('CSS lớp phủ khớp hằng số, đứng ngoài khối sinh tự động và thắng đúng thứ tự', () => {
  const dark = css.match(/\.ff-app-shell:not\(\.ff-view-home\):not\(\.ff-view-landing\) \.ff-potator-scrim \{[^}]*?background: rgb\((\d+) (\d+) (\d+) \/ var\(--ff-scrim-dark, 0\)\)/);
  const light = css.match(/html\.light\.potator-mode \.ff-app-shell:is\(([^)]*)\) \.ff-potator-scrim \{[^}]*?background: rgb\((\d+) (\d+) (\d+) \/ var\(--ff-scrim-light, 0\)\)/);
  assert.ok(dark && light, 'có cả hai rule lớp phủ');
  assert.deepEqual(dark.slice(1, 4).map(Number), [...POTATOR_SCRIM.dark.color]);
  assert.deepEqual(light.slice(2, 5).map(Number), [...POTATOR_SCRIM.light.color]);
  assert.deepEqual(light[1].split(',').map((s) => s.trim().replace('.ff-view-', '')), LIGHT_VIEWS,
    'lớp phủ sáng chỉ áp cho đúng các trang light-adapter đã chuyển sáng');
  assert.ok(css.indexOf('html.light.potator-mode .ff-app-shell:is(') > css.indexOf(':not(.ff-view-landing) .ff-potator-scrim'),
    'cùng độ ưu tiên → rule theme sáng phải đứng sau');
  const start = css.indexOf(START_MARKER), end = css.indexOf(END_MARKER);
  const at = css.indexOf('.ff-potator-scrim {');
  assert.ok(at > 0 && (at < start || at > end), 'gen:light sẽ không xóa lớp phủ');
  assert.match(css, /\.ff-potator-scrim \{\s*display: none;/, 'mặc định ẩn; chỉ hiện khi Potator bật và không phải home/landing');
  assert.match(app, /className="ff-potator-scrim"\s+aria-hidden="true"/);
  assert.match(app, /'--ff-scrim-dark': potatorTint\.dark,\s*'--ff-scrim-light': potatorTint\.light,/);
});

/* ───────────── Chốt chặn hồi quy xếp chồng (lỗi do bọc nội dung bằng `relative z-[1]`) ───────────── */
test('Xếp chồng: aura là lớp nền z âm trong shell `isolate`, nội dung KHÔNG bị nhốt dưới navbar', () => {
  assert.match(app, /className=\{`relative isolate w-full \$\{/, 'shell là một stacking context → màu nền shell là tầng đáy');
  const layers = [...app.matchAll(/className="(ff-godray-layer[^"]*)"/g)].map((m) => m[1]);
  assert.equal(layers.length, 2);
  for (const cls of layers) {
    assert.match(cls, /\bz-\[-2\]/, 'aura nằm dưới nội dung');
    assert.doesNotMatch(cls, /\bz-\[1\]|\bz-\d+\b/, 'không bao giờ phủ lên nội dung');
  }
  /* Thứ tự các lớp cấp shell: nền −3 → aura −2 → lớp phủ đọc-được −1 → nội dung (nền phải thấp hơn aura
     thì aura mới còn nhìn thấy; nếu để nền z-0 như trước, aura biến mất ở Potator và theme sáng). */
  const zOf = (selector) => Number(css.match(new RegExp(`(?:^|\\n)${selector.replace(/[.]/g, '\\.')} \\{[^}]*?z-index: (-?\\d+);`))[1]);
  assert.equal(zOf('.ff-potator-bg'), -3, 'nền (preset Potator / nền trang sáng) nằm dưới aura');
  assert.equal(zOf('.ff-potator-scrim'), -1, 'lớp phủ đọc-được nằm trên aura, dưới nội dung');
  assert.ok(zOf('.ff-potator-bg') < -2 && -2 < zOf('.ff-potator-scrim') && zOf('.ff-potator-scrim') < 0);
  const order = ['className="ff-potator-bg"', 'className="ff-potator-scrim"', 'className="ff-godray-layer'].map((m) => app.indexOf(m));
  assert.ok(order.every((n) => n > 0) && order[0] < order[1], 'trong DOM, lớp phủ đứng sau nền (cùng cấp thì sau đè lên)');
  const at = app.indexOf('key={currentView}');
  const wrapper = app.slice(at, at + 400).match(/className=\{`([\s\S]*?)`\}/)[1];
  assert.doesNotMatch(wrapper, /\bz-|\brelative\b|\bisolate\b/,
    'wrapper không tạo stacking context: modal `fixed z-50` trong view phải còn che được navbar `z-50`');
});

/* ───────────── Trang CLB: mount component thật (jsdom + React + Vite SSR) ───────────── */
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:5173/', pretendToBeVisual: true,
});
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent',
  'KeyboardEvent', 'MutationObserver', 'getComputedStyle']) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: dom.window[key] });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.AnimationEvent = dom.window.Event;
dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

const club = (i, over = {}) => ({
  id: `c${i}`, name: `CLB Thử Nghiệm ${i}`, slogan: `SLOGAN-RIÊNG-${i}`, coverImage: '/cover.png',
  category: ['Công nghệ', 'Nghệ thuật', 'Thể thao'][i % 3], foundingMembers: ['An'],
  purpose: `TÔN-CHỈ-DÀI-${i} `.repeat(6), leaderId: `u${i}`, leaderName: `Chủ nhiệm ${i}`,
  followerCount: 5, membersCount: 10 + i, status: 'APPROVED', createdAt: '2026-10-01', ...over,
});
const post = (i, clubId) => ({ id: `p${i}`, clubId, authorId: 'u1', authorName: 'An', title: `Bài ${i}`, content: 'x', createdAt: '2026-10-02' });
const user = { id: 'u9', name: 'Học sinh', email: 'hs@example.com', role: 'STUDENT' };

test('Trang CLB: trạng thái trống, khối xuất sắc, thẻ gọn, một CTA — đúng checklist', async () => {
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { createServer } = await import('vite');
  const { default: reactPlugin } = await import('@vitejs/plugin-react');
  const vite = await createServer({ configFile: false, plugins: [reactPlugin()], server: { middlewareMode: true }, appType: 'custom' });
  const root = createRoot(document.getElementById('root'));
  let key = 0;
  try {
    const { ClubsView } = await vite.ssrLoadModule('/src/components/views/ClubsView.tsx');
    const mount = (props = {}) => React.act(async () => root.render(React.createElement(ClubsView, {
      key: ++key, currentUser: null, clubs: [], clubPosts: [],
      onCreateClub() {}, onApproveClub() {}, onRejectClub() {}, onCreateClubPost: () => true, ...props,
    })));
    const buttons = (label) => [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === label);
    const click = (el) => React.act(async () => el.click());
    const typeInto = (input, value) => React.act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    const ctaMentions = () => (document.body.textContent.match(/đăng ký thành lập CLB/gi) || []).length;
    const banner = () => [...document.querySelectorAll('h2')].find((h) => /xuất sắc nhất tháng/i.test(h.textContent));

    /* ── Trường hợp A: chưa có CLB nào (kể cả khi có đơn đang chờ duyệt) ── */
    let logins = 0;
    await mount({ clubs: [club(1, { status: 'PENDING' })], onOpenLoginModal: () => { logins++; } });
    const text = document.body.textContent;
    assert.equal(buttons('Đăng ký thành lập CLB').length, 1, 'đúng MỘT nút CTA');
    assert.equal(ctaMentions(), 1, 'cụm "Đăng ký thành lập CLB" chỉ xuất hiện đúng một lần trên cả trang');
    assert.equal(document.querySelectorAll('svg.cb--sleepy').length, 1, 'minh họa Cú Bông (trạng thái trống)');
    assert.equal((text.match(/Chưa có CLB nào — bạn sẽ là người đầu tiên khởi tạo!/g) || []).length, 1, 'đúng MỘT câu trống');
    assert.equal(banner(), undefined, 'banner xuất sắc ẩn hoàn toàn khi rỗng');
    assert.doesNotMatch(text, /Danh hiệu được tự động cập nhật|Hãy đăng ký thành lập CLB đầu tiên|Chưa có câu lạc bộ nào trong danh mục này|Chưa có CLB nào hoạt động/);
    assert.equal(document.querySelectorAll('.ff-media-card').length, 0);
    assert.ok(document.querySelector('[role="group"][aria-label="Lọc theo chuyên mục"]'), 'vẫn có tab chuyên mục + ô tìm kiếm');
    assert.ok(document.querySelector('input[maxlength]'), 'ô tìm kiếm vẫn giới hạn độ dài');
    await click(buttons('Đăng ký thành lập CLB')[0]);
    assert.equal(logins, 1, 'chưa đăng nhập → mở hộp thoại đăng nhập (handler cũ)');

    /* Đã đăng nhập → mở hộp thoại thành lập; trang vẫn không có nút CTA thứ hai. */
    await mount({ currentUser: user });
    await click(buttons('Đăng ký thành lập CLB')[0]);
    assert.ok(document.querySelector('[role="dialog"][aria-label="Đăng ký thành lập CLB"]'), 'mở modal thành lập CLB');
    assert.equal(buttons('Đăng ký thành lập CLB').length, 1);

    /* ── Trường hợp B1: có CLB nhưng chưa ai hoạt động → không có banner, lưới thẻ gọn ── */
    const clubs = [club(1), club(2), club(3), club(4, { status: 'PENDING' })];
    await mount({ clubs });
    assert.equal(buttons('Đăng ký thành lập CLB').length, 1, 'có CLB → CTA nằm trên header, đúng một nút');
    assert.equal(ctaMentions(), 1);
    assert.equal(document.querySelectorAll('svg.cb--sleepy').length, 0, 'không còn trạng thái trống');
    assert.equal(banner(), undefined, 'chưa có hoạt động thật → không vinh danh CLB nào');
    assert.ok(document.querySelector('.ff-media-grid'));
    const cards = [...document.querySelectorAll('.ff-media-card')];
    assert.equal(cards.length, 3, 'chỉ CLB đã duyệt');
    for (const [index, card] of cards.entries()) {
      const n = index + 1;
      assert.deepEqual([...card.querySelectorAll('button')].map((b) => b.textContent.trim().replace(/\s+/g, ' ')), ['Tham gia', 'Xem'],
        'đúng 2 nút: [Tham gia] [Xem →]');
      assert.ok(card.querySelector('img'), 'có ảnh bìa');
      assert.ok(card.textContent.includes(`CLB Thử Nghiệm ${n}`) && card.textContent.includes(`${10 + n} thành viên`));
      assert.ok(card.textContent.includes(['Nghệ thuật', 'Thể thao', 'Công nghệ'][index]), 'có tag chuyên mục');
      assert.doesNotMatch(card.textContent, /TÔN-CHỈ-DÀI|SLOGAN-RIÊNG/, 'thẻ không còn mô tả/slogan dài');
    }

    /* Hành vi cũ giữ nguyên: "Xem" mở chi tiết, "Tham gia" đổi trạng thái. */
    await click(cards[0].querySelectorAll('button')[1]);
    assert.ok(document.querySelector('[role="dialog"]')?.textContent.includes('CLB Thử Nghiệm 1'), 'Xem → mở chi tiết CLB');
    assert.ok(document.querySelector('[role="dialog"]')?.textContent.includes('TÔN-CHỈ-DÀI-1'), 'mô tả dài nằm trong chi tiết');
    await click([...document.querySelectorAll('[role="dialog"] button')].find((b) => b.querySelector('svg') && !b.textContent.trim()));
    await click(cards[1].querySelectorAll('button')[0]);
    assert.equal(cards[1].querySelectorAll('button')[0].textContent.trim(), '✓ Đã đăng ký');

    /* ── Trường hợp B2: có hoạt động thật → dải "CLB xuất sắc" gọn, KHÔNG có CTA bên trong ── */
    await mount({ clubs, clubPosts: [post(1, 'c2'), post(2, 'c2'), post(3, 'c3')] });
    const strip = banner()?.closest('section');
    assert.ok(strip, 'có số liệu thật → hiện dải xuất sắc');
    assert.ok(strip.textContent.includes('CLB Thử Nghiệm 2') && strip.textContent.includes('12 thành viên'), 'CLB nhiều điểm nhất');
    assert.equal(strip.querySelectorAll('[class*="from-amber-500"]').length, 0);
    assert.doesNotMatch(strip.textContent, /Đăng ký|Nộp|TÔN-CHỈ-DÀI|Hãy/, 'banner không đóng vai trò CTA, không mô tả dài');
    assert.equal(ctaMentions(), 1, 'toàn trang vẫn chỉ một CTA');
    assert.equal(document.querySelectorAll('.ff-media-card').length, 3, 'CLB nổi bật vẫn nằm trong danh bạ');
    await click(strip.querySelector('button'));
    assert.ok(document.querySelector('[role="dialog"]')?.textContent.includes('CLB Thử Nghiệm 2'), 'bấm dải → xem chi tiết');

    /* ── Trường hợp C: có CLB nhưng bộ lọc không khớp → thông báo nhỏ, KHÔNG phải trạng thái trống của trang ── */
    await mount({ clubs, clubPosts: [post(1, 'c2')] });
    await typeInto(document.querySelector('input[type="text"]'), 'không-có-clb-nào-như-vậy');
    assert.match(document.body.textContent, /Không có CLB nào khớp bộ lọc\./);
    assert.equal(document.querySelectorAll('svg.cb--sleepy').length, 0, 'không dùng minh họa trống của trang');
    assert.equal(banner(), undefined);
    assert.equal(document.querySelectorAll('.ff-media-card').length, 0);
    assert.equal(ctaMentions(), 1, 'vẫn đúng một CTA');
    await click(buttons('Xóa bộ lọc')[0]);
    assert.equal(document.querySelectorAll('.ff-media-card').length, 3, 'xóa bộ lọc → quay lại danh sách');
    await click(buttons('Thể thao')[0]);
    assert.equal(buttons('Thể thao')[0].getAttribute('aria-pressed'), 'true');
    assert.equal(document.querySelectorAll('.ff-media-card').length, 1, 'lọc theo chuyên mục vẫn hoạt động');
  } finally {
    await React.act(async () => root.unmount());
    await vite.close();
    dom.window.close();
  }
});

test('Nguồn trang CLB: không còn nội dung thừa; lưới 3 cột nhưng vẫn giữ container query tcl-14', () => {
  const view = fs.readFileSync('src/components/views/ClubsView.tsx', 'utf8');
  assert.doesNotMatch(view, /Danh hiệu được tự động cập nhật|Hãy đăng ký thành lập CLB đầu tiên|trong danh mục này|>\s*Chuyên mục:\s*</);
  assert.equal((view.match(/<PlusCircle/g) || []).length, 1, 'chỉ định nghĩa MỘT nút CTA (dùng chung cho header và trạng thái trống)');
  assert.match(view, /hasAnyApprovedClub && createClubButton\(\)/, 'header chỉ có CTA khi đã có CLB');
  assert.match(view, /<CuBong mood="sleepy" size=\{176\} decorative \/>/, 'minh họa là linh vật chính thức của hệ thống');
  assert.doesNotMatch(view, /approvedClubs\[0\]/, 'không vinh danh bừa CLB đầu tiên khi chưa có số liệu');
  const styles = fs.readFileSync('src/components/views/ClubsView.css', 'utf8');
  assert.match(styles, /@media \(min-width: 1024px\)\s*\{\s*\.ff-media-grid \{ grid-template-columns: repeat\(3, minmax\(0, 1fr\)\); \}/);
  assert.match(styles, /container: ff-media \/ inline-size;/);
  assert.match(styles, /@container ff-media \(min-width: 420px\)/);
  assert.match(view, /className="ff-media-grid"/, 'giữ đúng chuỗi mà test tcl-14 ghim');
  for (const m of view.matchAll(/<img\b/g)) {
    const tag = view.slice(m.index, view.indexOf('/>', m.index));
    assert.match(tag, /loading="lazy"/, 'mọi ảnh của trang đều tải lười (chính sách hiệu năng Epic 5)');
  }
});
