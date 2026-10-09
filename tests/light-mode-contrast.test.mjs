/**
 * Light Mode — kiểm chứng tương phản WCAG AA (Nhiemvu_3 · Epic 4).
 *
 * "Bật sáng nhưng nhiều khu vực vẫn tối — audit lại toàn bộ token màu cho 2 theme
 *  light/dark, đảm bảo contrast chuẩn WCAG AA."
 *
 * Test tự cài công thức WCAG 2.x (không tin vào bộ sinh), ghép alpha của các bề mặt
 * kính lên nền XẤU NHẤT (đen kịt — video Trang chủ, tấm phủ modal) và yêu cầu:
 *   • chữ thường ≥ 4.5:1, chữ chính trên kính ≥ 7:1;
 *   • mọi màu chữ có sắc ≥ 4.5:1 cả trên nhãn tint đậm bg-{màu}-500/30.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  LIGHT_TOKENS,
  FAMILY_SHADE,
  FAMILY_TINT,
  LIGHT_VIEWS,
  START_MARKER,
  END_MARKER,
  buildLightAdapterCss,
} from '../scripts/generate-light-adapter.mjs';

const css = fs.readFileSync(path.resolve('src/index.css'), 'utf8');
const app = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');

/* ---------------- WCAG 2.x ---------------- */
const parseColor = (c) => {
  if (Array.isArray(c)) return c;
  const hex = c.trim().replace('#', '');
  if (/^[0-9a-f]{6}$/i.test(hex)) return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  throw new Error(`Không đọc được màu: ${c}`);
};
const luminance = (c) => {
  const [r, g, b] = parseColor(c).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** Ghép màu rgb + alpha lên nền (alpha compositing). */
const over = (rgb, alpha, backdrop) => {
  const f = parseColor(rgb);
  const b = parseColor(backdrop);
  return f.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)));
};
const rgbaStops = (value) =>
  [...value.matchAll(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/g)].map((m) => ({
    rgb: [Number(m[1]), Number(m[2]), Number(m[3])],
    a: Number(m[4]),
  }));
/** Lấy thân rule ngay sau đoạn selector (tìm chính xác). */
const ruleBody = (selector) => {
  const i = css.indexOf(selector);
  assert.ok(i !== -1, `Thiếu rule: ${selector}`);
  const open = css.indexOf('{', i);
  return css.slice(open + 1, css.indexOf('}', open));
};
const backgroundOf = (selector) => {
  const body = ruleBody(selector);
  const m = body.match(/background:\s*([^;]+);/);
  assert.ok(m, `Rule ${selector} phải khai báo background`);
  return m[1];
};

const BLACK = '#000000';
const PAGE = LIGHT_TOKENS.page;
const AA = 4.5;

test('WCAG helper: các mốc chuẩn', () => {
  assert.equal(Math.round(contrast('#000000', '#ffffff') * 100) / 100, 21);
  assert.ok(Math.abs(contrast('#777777', '#ffffff') - 4.48) < 0.01);
  assert.deepEqual(over([255, 255, 255], 0.5, '#000000'), [128, 128, 128]);
});

test('Bug gốc được tái hiện: kính sáng 3% + chữ #101827 trên nền tối chỉ ~1.13:1', () => {
  const oldGlass = over([255, 255, 255], 0.03, BLACK);
  assert.ok(contrast('#101827', oldGlass) < 1.2, 'Đây chính là lỗi "chữ tối trên nền tối" cần sửa');
});

test('Token chữ sáng đạt AA trên mọi bề mặt sáng (trang, thẻ, kính trên nền đen)', () => {
  const glassWorst = over([246, 248, 252], 0.88, BLACK); // điểm dừng mỏng nhất của kính sữa
  const surfaces = {
    'nền trang': PAGE,
    'thẻ bg-white/5 → 0.62': over([255, 255, 255], 0.62, PAGE),
    'thẻ bg-white/10 → 0.74': over([255, 255, 255], 0.74, PAGE),
    'bề mặt bg-black/40 → 0.6': over([255, 255, 255], 0.6, PAGE),
    'kính sữa trên nền ĐEN': glassWorst,
  };
  for (const [name, color] of Object.entries({
    ink: LIGHT_TOKENS.ink,
    ink3: LIGHT_TOKENS.ink3,
    muted: LIGHT_TOKENS.muted,
    faint: LIGHT_TOKENS.faint,
    placeholder: LIGHT_TOKENS.placeholder,
  })) {
    for (const [surface, bg] of Object.entries(surfaces)) {
      const ratio = contrast(color, bg);
      assert.ok(ratio >= AA, `${name} ${color} trên ${surface}: ${ratio.toFixed(2)}:1 < 4.5`);
    }
  }
  assert.equal(LIGHT_TOKENS.ink, '#101827', 'Mực chính của theme sáng là #101827 (quy ước repo)');
});

test('Màu chữ có sắc (bậc 800) đạt AA trên nền trang, nhãn tint đậm 500/30 và nền tint sáng', () => {
  const S500 = {
    amber: '#f59e0b', orange: '#f97316', rose: '#f43f5e', red: '#ef4444', emerald: '#10b981', green: '#22c55e',
    teal: '#14b8a6', cyan: '#06b6d4', sky: '#0ea5e9', blue: '#3b82f6', indigo: '#6366f1', violet: '#8b5cf6',
    purple: '#a855f7', fuchsia: '#d946ef', pink: '#ec4899', yellow: '#eab308', lime: '#84cc16',
  };
  assert.deepEqual(Object.keys(FAMILY_SHADE).sort(), Object.keys(S500).sort(), 'Đủ 17 họ màu');
  for (const [fam, shade] of Object.entries(FAMILY_SHADE)) {
    const onPage = contrast(shade, PAGE);
    const onTint = contrast(shade, over(parseColor(S500[fam]), 0.3, PAGE));
    const onLightTint = contrast(shade, over(parseColor(`rgb(${FAMILY_TINT[fam]})`), 0.78, PAGE));
    assert.ok(onPage >= AA, `${fam} ${shade} trên nền trang: ${onPage.toFixed(2)}`);
    assert.ok(onTint >= AA, `${fam} ${shade} trên bg-${fam}-500/30: ${onTint.toFixed(2)}`);
    assert.ok(onLightTint >= AA, `${fam} ${shade} trên nền tint sáng ${fam}: ${onLightTint.toFixed(2)}`);
  }
});

test('Kính sáng (liquid-glass / dialog / nav mobile / obsidian / popover) đủ đục để chữ đạt AA ngay cả trên nền đen', () => {
  const surfaces = [
    'html.light .liquid-glass {',
    'html.light div[role="dialog"].liquid-glass,',
    'html.light nav.liquid-glass,',
    'html.light .obsidian-glass {',
    'html.light .popover-morph-enter {',
  ];
  for (const selector of surfaces) {
    const stops = rgbaStops(backgroundOf(selector));
    assert.ok(stops.length > 0, `${selector} phải dùng màu rgba`);
    for (const { rgb, a } of stops) {
      assert.ok(a >= 0.85, `${selector}: alpha ${a} quá trong — chữ tối sẽ chìm trên nền tối`);
      const composite = over(rgb, a, BLACK);
      assert.ok(contrast('#101827', composite) >= 7, `${selector}: chữ chính trên nền đen chỉ ${contrast('#101827', composite).toFixed(2)}`);
      assert.ok(contrast(LIGHT_TOKENS.faint, composite) >= AA, `${selector}: chữ mờ trên nền đen chỉ ${contrast(LIGHT_TOKENS.faint, composite).toFixed(2)}`);
    }
  }
  // Kính vẫn là kính: còn blur theo cài đặt + viền phản quang, không thành giấy trắng phẳng
  assert.match(ruleBody('html.light .liquid-glass {'), /backdrop-filter: blur\(var\(--glass-blur, 14px\)\)/);
  assert.ok(css.includes('html.light .liquid-glass::before'), 'Giữ viền phản quang trắng/hổ phách');
  assert.ok(!css.includes('background-color: #f8fafc'), 'Không có nền "giấy trắng" phẳng');
});

test('Navbar: chữ được đổi sang tối, và capsule đủ đục trên trang nền tối (Trang chủ, Ký ức)', () => {
  const block = css.slice(css.indexOf(START_MARKER), css.indexOf(END_MARKER));
  assert.ok(block.includes('.ff-nav-capsule *'), 'Navbar nằm trong phạm vi chuyển đổi (chữ text-white/70 trên kính sáng)');
  assert.ok(/:is\([^)]*\.text-white\\\/70[^)]*\) \{ --lv-c: var\(--lv-ink-3\); \}/.test(block), 'text-white/70 (tab chưa chọn) → ink-3');
  assert.ok(/\.text-amber-100[^{]*\{ --lv-c: #92400e; \}/.test(block), 'text-amber-100 (tab đang chọn) → amber-800');

  const darkViews = backgroundOf('html.light .ff-app-shell:is(.ff-view-home, .ff-view-memory) .ff-nav-capsule.liquid-glass');
  for (const { rgb, a } of rgbaStops(darkViews)) {
    const composite = over(rgb, a, BLACK);
    assert.ok(contrast(LIGHT_TOKENS.ink3, composite) >= AA, `Capsule trên video tối: ink-3 chỉ ${contrast(LIGHT_TOKENS.ink3, composite).toFixed(2)}`);
  }
  // Trang nội dung (nền sáng): capsule trong suốt 0.42/0.30 của Epic 0 vẫn đạt AA
  for (const { rgb, a } of rgbaStops(backgroundOf('html.light .ff-nav-capsule.liquid-glass {\n  background: linear-gradient(180deg, rgba(255, 255, 255, 0.42)'))) {
    const composite = over(rgb, a, PAGE);
    assert.ok(contrast(LIGHT_TOKENS.ink3, composite) >= AA, 'Capsule trên nền trang sáng: ink-3 đạt AA');
  }
});

test('Khối light-adapter khớp class đang dùng trong src/ (npm run gen:light --check)', () => {
  const out = execFileSync(process.execPath, ['scripts/generate-light-adapter.mjs', '--check'], { encoding: 'utf8' });
  assert.match(out, /khớp/);
  const start = css.indexOf(START_MARKER);
  const end = css.indexOf(END_MARKER);
  assert.ok(start !== -1 && end > start, 'index.css chứa đúng một khối @generated');
  assert.equal(css.indexOf(START_MARKER, start + 1), -1, 'Không trùng khối');
  const block = css.slice(start, end);
  for (const cls of ['.text-white', '.text-neutral-400', '.bg-black\\/40', '.bg-white\\/5', '.border-white\\/10',
    '.text-amber-300', '.hover\\:text-white:hover', '.bg-neutral-900', '.bg-\\[\\#0c1218\\]', '.from-black']) {
    assert.ok(block.includes(cls), `Class tối phổ biến phải được phủ: ${cls}`);
  }
  assert.ok(Buffer.byteLength(block) < 40_000, `Khối sinh ra phải gọn (< 40 KB), hiện ${Buffer.byteLength(block)} byte`);
});

test('Phạm vi & vùng loại trừ: không đổi màu chữ trên ảnh, nút màu đặc, tấm phủ modal, khu tối có chủ đích', () => {
  const block = css.slice(css.indexOf(START_MARKER), css.indexOf(END_MARKER));
  for (const v of LIGHT_VIEWS) assert.ok(block.includes(`.ff-view-${v}`), `Trang ${v} nằm trong phạm vi`);
  assert.ok(!block.includes('.ff-view-home,') && !block.includes('.ff-view-memory,'), 'Trang chủ (video) & Ký ức (rạp) giữ trải nghiệm điện ảnh');
  assert.ok(block.includes(':has(> img, > video, > picture):has(> [class*="from-black"]'), 'Ảnh/video có lớp phủ tối giữ chữ trắng');
  assert.ok(block.includes('.ff-keep-dark') && block.includes('.faa-backdrop') && block.includes('.auth-overlay'), 'Có lối thoát .ff-keep-dark + loại trừ bảng quản trị/Auth');
  assert.ok(block.includes(':not(.fixed.inset-0, .inset-0[class*="backdrop-blur"], .inset-0.opacity-0)'), 'Tấm phủ modal & lớp phủ hover giữ tối');
  assert.ok(block.includes('.pc-12-shell *'), 'Hồ sơ / thẻ hồ sơ nhanh (nền sáng 0.85) nằm trong phạm vi');
  // Khu tối có chủ đích: dải "Khu Vinh Danh" trong Chronicles giữ tối, kể cả kính bên trong
  const about = fs.readFileSync(path.resolve('src/components/AboutUs.tsx'), 'utf8');
  assert.ok(about.includes('khu-vinh-danh-scope ff-keep-dark'), 'AboutUs (Khu Vinh Danh) là khu tối có chủ đích');
  const keepDark = ruleBody('html.light body .ff-keep-dark :is(.liquid-glass, .obsidian-glass),');
  const [{ rgb, a }] = rgbaStops(keepDark);
  assert.ok(contrast('#f4f2ef', over(rgb, a, BLACK)) >= 7, 'Chữ kem trên kính tối trong khu giữ-tối đạt ≥ 7:1');
  assert.match(keepDark, /color: #f4f2ef !important/);

  // Kiểm hành vi bộ phân loại trên một tập class tổng hợp
  const sample = buildLightAdapterCss(new Set([
    'text-white', 'text-white/70', 'bg-black/40', 'text-amber-300', 'hover:text-cyan-300', 'group-hover:text-rose-400',
    'bg-amber-500', 'from-amber-500', 'from-black/80', 'bg-red-950/30', 'border-white/10', 'placeholder-neutral-500',
    'md:text-white', 'bg-[#0c1218]', 'bg-[#f4f2ef]',
  ]));
  assert.ok(sample.includes('[class~="bg-amber-500"]') && sample.includes('[class~="from-amber-500"]'), 'Nền/gradient màu đặc giữ chữ trắng');
  assert.ok(sample.includes('{ --lv-c: #92400e; }'), 'amber-300 → amber-800');
  assert.ok(/\.hover\\:text-cyan-300:hover\) \{ --lv-c: #155e75; \}/.test(sample), 'Biến thể hover có rule riêng (thắng trạng thái thường)');
  assert.ok(/\.group:hover \.group-hover\\:text-rose-400\) \{ --lv-c: #9f1239; \}/.test(sample), 'Biến thể group-hover có rule riêng');
  assert.ok(sample.includes('rgba(254, 226, 226, 0.78)'), 'bg-red-950/30 (hộp lỗi) → tint đỏ sáng');
  assert.ok(sample.includes('--lv-from: rgba(248, 250, 252, 0.75)'), 'Gradient tối from-black/80 → sáng');
  assert.ok(sample.includes('.bg-\\[\\#0c1218\\]') && !sample.includes('.bg-\\[\\#f4f2ef\\]'), 'Chỉ màu hex TỐI mới bị đổi');
  assert.ok(!sample.includes('md\\:text-white'), 'Biến thể responsive không bị xử lý sai');
  // Chữ hex tuỳ ý: trung tính theo độ sáng, có sắc theo vòng màu, màu đậm sẵn giữ nguyên
  const hex = buildLightAdapterCss(new Set(['text-[#dbdee1]', 'text-[#949ba4]', 'text-[#38bdf8]', 'text-[#1b1204]', 'text-[#f4f2ef]/60', 'placeholder-[#949ba4]']));
  assert.ok(/\.text-\\\[\\#dbdee1\\\][^{]*\{ --lv-c: var\(--lv-ink\); \}/.test(hex), '#dbdee1 (xám rất nhạt) → mực chính');
  assert.ok(/\.text-\\\[\\#949ba4\\\][^{]*\{ --lv-c: var\(--lv-muted\); \}/.test(hex), '#949ba4 (xám giữa) → chú thích');
  assert.ok(/\.text-\\\[\\#38bdf8\\\][^{]*\{ --lv-c: #075985; \}/.test(hex), '#38bdf8 (xanh trời sáng) → sky-800');
  assert.ok(/\.text-\\\[\\#f4f2ef\\\]\\\/60[^{]*\{ --lv-c: var\(--lv-ink-3\); \}/.test(hex), 'alpha của chữ hex được tôn trọng');
  assert.ok(!hex.includes('#1b1204'), 'Chữ hex vốn đã tối giữ nguyên');
  assert.ok(hex.includes('.placeholder-\\[\\#949ba4\\]::placeholder'), 'placeholder hex cũng được đổi');
  const textIdx = sample.indexOf('.hover\\:text-cyan-300:hover) { --lv-c');
  const baseIdx = sample.indexOf('.text-amber-300) { --lv-c');
  assert.ok(baseIdx !== -1 && textIdx > baseIdx, 'Rule biến thể đứng sau rule thường');
});

test('Trang nội dung ở chế độ sáng: ẩn video tối, nền kính sữa gradient, tạm dừng video bị ẩn', () => {
  const block = css.slice(css.indexOf(START_MARKER), css.indexOf(END_MARKER));
  assert.ok(/\.ff-video-bg \{ display: none !important; \}/.test(block), 'Video nền tối bị ẩn');
  assert.ok(/\.ff-potator-bg \{\n  display: block;\n  background:\n    radial-gradient\(/.test(block), 'Nền trang là gradient "liquid", không phải giấy phẳng');
  assert.ok(block.includes('.pointer-events-none.inset-0:is([class*="from-black"]'), 'Lớp phủ tối trang trí bị ẩn');

  assert.ok(app.includes('new MutationObserver(') && app.includes("attributeFilter: ['class']"), 'App theo dõi class light trên <html>');
  assert.ok(app.includes('hiddenByLight') && app.includes('[potatorMode, currentView, isLightTheme]'), 'Video bị ẩn ở chế độ sáng được tạm dừng');
  const selector = app.match(/LIGHT_ADAPTED_VIEW_SELECTOR = '([^']+)'/);
  assert.ok(selector, 'App khai báo LIGHT_ADAPTED_VIEW_SELECTOR');
  assert.deepEqual(selector[1].split(',').map((s) => s.trim()), LIGHT_VIEWS.map((v) => `.ff-view-${v}`), 'Danh sách trang khớp bộ sinh');
});

test('Không còn chữ #64748b (3.9–4.2:1) trong các rule chữ sáng đang dùng', () => {
  assert.match(ruleBody('html.light .popover-morph-enter .text-white\\/60 {'), /color: #526075/);
  assert.match(css, /html\.light \.ff-row__est \{ color: #526075; \}/);
  assert.match(css, /html\.light \.pc-12-stat__label \{ color: #526075; \}/);
  assert.ok(contrast('#64748b', PAGE) < AA && contrast('#526075', PAGE) >= AA, 'Lý do thay màu');
});
