#!/usr/bin/env node
/**
 * Sinh "lớp chuyển đổi Light Mode" (WCAG AA) cho src/index.css.
 *
 * Bối cảnh: phần lớn giao diện được viết theo tông tối bằng class Tailwind
 * trung tính (text-white, bg-black/40, border-white/10, text-amber-300 …).
 * Khi bật chế độ sáng, các trang nội dung vẫn đen, còn bề mặt kính thì cho chữ
 * tối nằm trên nền tối. Script này QUÉT các class thật sự được dùng trong src/
 * và sinh rule đổi chúng sang bộ token sáng đã kiểm tra tương phản
 * (tests/light-mode-contrast.test.mjs tính tỷ lệ WCAG cho từng cặp màu).
 *
 *   npm run gen:light                                  → ghi lại khối @generated
 *   node scripts/generate-light-adapter.mjs --check    → exit 1 nếu khối đã cũ
 *
 * Phạm vi áp dụng (chỉ khi <html class="light">):
 *   • trang Câu lạc bộ, Hỏi đáp, Chat, Chronicles, Sắp ra mắt;
 *   • mọi bề mặt kính (.liquid-glass, .obsidian-glass), navbar (.ff-nav-capsule) và .ff-light-adapt.
 * Giữ nguyên (không đổi màu bên trong):
 *   • tấm phủ modal (fixed inset-0 …) và lớp phủ hover trên ảnh — vẫn tối như iOS/Material;
 *   • ảnh/video có lớp phủ tối (chữ trắng trên ảnh vẫn là chữ trắng);
 *   • nút/nhãn màu đặc và gradient màu (chữ trắng trên nền cam vẫn trắng);
 *   • bảng quản trị tối, overlay Boutique, Auth, và mọi thứ gắn .ff-keep-dark.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS_PATH = path.join(ROOT, 'src/index.css');
export const START_MARKER =
  '/* @generated light-adapter:start — sinh bởi scripts/generate-light-adapter.mjs (npm run gen:light). KHÔNG sửa tay. */';
export const END_MARKER = '/* @generated light-adapter:end */';

/* ---------- Bộ token sáng (đã kiểm tra AA trong tests/light-mode-contrast) ---------- */
export const LIGHT_TOKENS = {
  ink: '#101827', // chữ chính — mực sáng chuẩn của theme (xem tests/study-hours #6: không dùng #0f172a)
  ink3: '#334155', // chữ phụ
  muted: '#475569', // chú thích
  faint: '#526075', // chữ mờ nhất vẫn đạt ≥ 4.5:1 (thay #64748b chỉ đạt 3.9–4.2)
  placeholder: '#526075',
  page: '#eef2f8', // nền trang nội dung
};

/** Bậc 800 của từng họ màu: đạt ≥ 4.5:1 cả trên nhãn tint đậm bg-{màu}-500/30. */
export const FAMILY_SHADE = {
  amber: '#92400e', orange: '#9a3412', rose: '#9f1239', red: '#991b1b',
  emerald: '#065f46', green: '#166534', teal: '#115e59', cyan: '#155e75',
  sky: '#075985', blue: '#1e40af', indigo: '#3730a3', violet: '#5b21b6',
  purple: '#6b21a8', fuchsia: '#86198f', pink: '#9d174d', yellow: '#854d0e', lime: '#3f6212',
};
/** Bậc 100 (rgb) — dùng làm nền tint sáng thay cho bg-{màu}-900/950 (hộp lỗi, thẻ cảnh báo…). */
export const FAMILY_TINT = {
  amber: '254, 243, 199', orange: '255, 237, 213', rose: '255, 228, 230', red: '254, 226, 226',
  emerald: '209, 250, 229', green: '220, 252, 231', teal: '204, 251, 241', cyan: '207, 250, 254',
  sky: '224, 242, 254', blue: '219, 234, 254', indigo: '224, 231, 255', violet: '237, 233, 254',
  purple: '243, 232, 255', fuchsia: '250, 232, 255', pink: '252, 231, 243', yellow: '254, 249, 195', lime: '236, 252, 203',
};
const FAMILIES = Object.keys(FAMILY_SHADE);
const NEUTRALS = ['neutral', 'gray', 'slate', 'zinc', 'stone'];

export const LIGHT_VIEWS = ['clubs', 'qa', 'chat', 'chronicles', 'coming-soon'];
const VIEW_SHELL = `.ff-app-shell:is(${LIGHT_VIEWS.map((v) => `.ff-view-${v}`).join(', ')})`;
/* Navbar có nền kính sáng từ Epic 0 nhưng chữ/icon vẫn là text-white/70, text-amber-300…
   → phải nằm TRONG phạm vi, nếu không chữ trắng sẽ nằm trên kính sáng. */
/* .pc-12-shell (hồ sơ, thẻ hồ sơ nhanh) có nền trắng 0.85 ở chế độ sáng từ Epic 4 nhưng chữ có sắc /
   chữ hex kiểu Discord (#dbdee1, #949ba4) bên trong vẫn là màu cho nền tối. */
const GLASS_ROOTS = ['.liquid-glass', '.obsidian-glass', '.ff-nav-capsule', '.pc-12-shell', '.ff-light-adapt'];
const DESC = `:is(${[VIEW_SHELL, ...GLASS_ROOTS].map((s) => `${s} *`).join(', ')})`;
const SELF_OR_DESC = `:is(${[...[VIEW_SHELL, ...GLASS_ROOTS].map((s) => `${s} *`), ...GLASS_ROOTS].join(', ')})`;
const MEDIA = ':has(> img, > video, > picture)';
const MEDIA_SCRIM = `${MEDIA}:has(> [class*="from-black"], > [class*="via-black"], > [class*="bg-black/"])`;
/* Lớp phủ hover tối trên ảnh/avatar (inset-0 + opacity-0 + bg-black) giữ chữ sáng bên trong. */
const HOVER_SCRIM = '.inset-0.opacity-0:is([class~="bg-black"], [class*="bg-black/"])';
const ZONES = `:is(.faa-backdrop, .gb-inspect, .gb-unbox, .auth-overlay, .ff-keep-dark, ${MEDIA_SCRIM}, ${HOVER_SCRIM})`;
const NOT_ZONE = `:not(${ZONES}, ${ZONES} *)`;
const NOT_MEDIA_CHILD = `:not(${MEDIA} > *)`;
/* Tấm phủ modal (fixed inset-0 / inset-0 có backdrop-blur) và lớp phủ hover GIỮ TỐI ở chế độ sáng —
   giống iOS/Material: nền mờ tối làm nổi hộp thoại kính sữa, thay vì biến thành màn trắng. */
const NOT_SCRIM = ':not(.fixed.inset-0, .inset-0[class*="backdrop-blur"], .inset-0.opacity-0)';
/* Bề mặt chỉ đổi ở CON CHÁU của kính (không làm loãng chính tấm kính sữa); riêng .ff-light-adapt đổi cả chính nó. */
const SURFACE_SCOPE = `:is(${[VIEW_SHELL, ...GLASS_ROOTS].map((s) => `${s} *`).join(', ')}, .ff-light-adapt)`;

/* ---------- Quét class ---------- */
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) out.push(full);
  }
  return out;
}

export function collectTokens(srcDir = path.join(ROOT, 'src')) {
  const tokens = new Set();
  for (const file of walk(srcDir)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const raw of text.split(/[\s"'`{}(),;<>]+/)) {
      if (raw && raw.length < 80 && /^(?:[a-z-]+:)?(?:text|bg|border|from|via|to|ring|divide|placeholder)-/.test(raw)) tokens.add(raw);
    }
  }
  return tokens;
}

/* ---------- Tiện ích màu ---------- */
const hexLum = (hex) => {
  const h = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const alphaOf = (token) => {
  const m = token.match(/\/(\d{1,3})$/);
  return m ? Math.min(100, Number(m[1])) / 100 : 1;
};
const esc = (cls) => cls.replace(/([:/[\]#.%])/g, '\\$1');
const DARK_HEX = /^\[#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\]$/;
const isDarkHex = (part) => {
  const m = part.match(DARK_HEX);
  return !!m && hexLum(m[1]) < 0.06;
};
/** "black", "neutral-950", "[#0c1218]" … → có phải nền tối không */
/** Chữ hex tuỳ ý: trung tính (độ bão hoà thấp) xếp theo độ sáng; có sắc → họ màu gần nhất theo vòng màu. */
const HUE_FAMILIES = [
  [10, 'red'], [20, 'red'], [38, 'orange'], [50, 'amber'], [75, 'yellow'], [120, 'lime'], [145, 'green'],
  [165, 'emerald'], [180, 'teal'], [195, 'cyan'], [215, 'sky'], [235, 'blue'], [255, 'indigo'], [270, 'violet'],
  [290, 'purple'], [320, 'fuchsia'], [340, 'pink'], [350, 'rose'], [361, 'red'],
];
function hexTextBucket(hex, alpha) {
  const h = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lum = hexLum(h);
  if (max - min <= 40) {
    if (lum >= 0.45) return alpha >= 0.8 ? 'textInk' : alpha >= 0.6 ? 'textInk3' : alpha >= 0.45 ? 'textMuted' : 'textFaint';
    return lum >= 0.18 ? 'textMuted' : null; // xám giữa (#949ba4, #8c8783) → chú thích; đã tối thì giữ
  }
  if (lum < 0.25) return null; // màu đậm sẵn, đủ tương phản trên nền sáng
  const d = max - min;
  let hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  hue = (hue * 60 + 360) % 360;
  return `family:${HUE_FAMILIES.find(([limit]) => hue < limit)[1]}`;
}
const isDarkColor = (color) =>
  color === 'black' ||
  new RegExp(`^(${NEUTRALS.join('|')})-(800|900|950)$`).test(color) ||
  isDarkHex(color);

/* ---------- Phân loại & ánh xạ ---------- */
function classify(tokens) {
  const g = {
    textInk: new Set(), textInk3: new Set(), textMuted: new Set(), textFaint: new Set(),
    textFamily: Object.fromEntries(FAMILIES.map((f) => [f, new Set()])),
    placeholder: new Set(),
    surfaces: new Map(), // value -> Set(selectorPart)
    hoverSurfaces: new Map(),
    borders: new Map(),
    divides: new Map(),
    rings: new Map(),
    stops: new Map(), // `${prop}|${value}` -> Set
    solid: new Set(), // exact tokens: nền màu đặc / gradient màu → giữ chữ trắng
  };
  const add = (map, key, part) => {
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(part);
  };
  const textBucket = (color) => {
    let m;
    if ((m = color.match(/^white(?:\/(\d+))?$/))) {
      const a = m[1] ? Number(m[1]) / 100 : 1;
      return a >= 0.8 ? 'textInk' : a >= 0.6 ? 'textInk3' : a >= 0.45 ? 'textMuted' : 'textFaint';
    }
    if ((m = color.match(new RegExp(`^(?:${NEUTRALS.join('|')})-(\\d+)(?:/\\d+)?$`)))) {
      const s = Number(m[1]);
      return s <= 100 ? 'textInk' : s <= 300 ? 'textInk3' : s <= 400 ? 'textMuted' : s <= 600 ? 'textFaint' : null;
    }
    if ((m = color.match(new RegExp(`^(${FAMILIES.join('|')})-(50|100|200|300|400)(?:/\\d+)?$`)))) return `family:${m[1]}`;
    if ((m = color.match(/^\[#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\](?:\/(\d+))?$/))) return hexTextBucket(m[1], m[2] ? Number(m[2]) / 100 : 1);
    return null;
  };
  const pushText = (bucket, part) => {
    if (!bucket) return;
    if (bucket.startsWith('family:')) g.textFamily[bucket.slice(7)].add(part);
    else g[bucket].add(part);
  };

  for (const token of [...tokens].sort()) {
    const vm = token.match(/^(?:(hover|group-hover|placeholder):)?(.+)$/);
    const variant = vm[1] || '';
    const base = vm[2];
    let m;

    // ----- màu chữ
    if ((m = base.match(/^text-(.+)$/))) {
      const bucket = textBucket(m[1]);
      if (!bucket) continue;
      if (variant === '') pushText(bucket, `.${esc(token)}`);
      else if (variant === 'hover') pushText(bucket, `.${esc(token)}:hover`);
      else if (variant === 'group-hover') pushText(bucket, `.group:hover .${esc(token)}`);
      else if (variant === 'placeholder') g.placeholder.add(`.${esc(token)}::placeholder`);
      continue;
    }
    if (variant === '' && (m = base.match(/^placeholder-(white\/\d+|(?:neutral|gray|slate|zinc)-\d+|\[#[0-9a-fA-F]{3,6}\])$/))) {
      g.placeholder.add(`.${esc(token)}::placeholder`);
      continue;
    }

    // ----- nền
    if ((m = base.match(/^bg-(.+?)(?:\/(\d+))?$/))) {
      const color = m[1];
      const a = alphaOf(base);
      if (variant === '' && isDarkColor(color)) {
        // Không có bề mặt trắng đặc kiểu "giấy": kể cả bg-black đặc cũng thành kính trắng 0.92 (giữ chất liquid)
        const value = `rgba(255, 255, 255, ${a < 0.45 ? 0.6 : a < 0.7 ? 0.72 : a < 0.9 ? 0.84 : 0.92})`;
        add(g.surfaces, value, `.${esc(token)}`);
      } else if (variant === '' && color === 'white' && m[2] && a <= 0.3) {
        add(g.surfaces, `rgba(255, 255, 255, ${a <= 0.05 ? 0.62 : a <= 0.1 ? 0.74 : 0.84})`, `.${esc(token)}`);
      } else if (variant === 'hover' && color === 'white' && m[2] && a <= 0.3) {
        add(g.hoverSurfaces, `rgba(15, 23, 42, ${a <= 0.1 ? 0.06 : 0.09})`, `.${esc(token)}:hover`);
      } else if (variant === '' && (m = color.match(new RegExp(`^(${FAMILIES.join('|')})-(900|950)$`)))) {
        add(g.surfaces, `rgba(${FAMILY_TINT[m[1]]}, 0.78)`, `.${esc(token)}`);
      } else if (variant === '' && new RegExp(`^(${FAMILIES.join('|')})-(400|500|600|700|800)$`).test(color) && a >= 0.7) {
        g.solid.add(token);
      }
      continue;
    }

    // ----- viền / divider / ring
    if ((m = base.match(/^(border|divide|ring)-(.+?)(?:\/(\d+))?$/))) {
      const [, kind, color] = m;
      const a = alphaOf(base);
      let value = null;
      if (color === 'white' && m[3]) value = `rgba(15, 23, 42, ${a <= 0.05 ? 0.07 : a <= 0.1 ? 0.1 : a <= 0.2 ? 0.14 : 0.2})`;
      else if (new RegExp(`^(${NEUTRALS.join('|')})-(700|800|900)$`).test(color)) value = 'rgba(15, 23, 42, 0.12)';
      if (!value) continue;
      if (kind === 'border' && variant === '') add(g.borders, value, `.${esc(token)}`);
      else if (kind === 'border' && variant === 'hover') add(g.borders, value, `.${esc(token)}:hover`);
      else if (kind === 'divide' && variant === '') add(g.divides, value, `.${esc(token)} > :not(:last-child)`);
      else if (kind === 'ring' && variant === '') add(g.rings, value, `.${esc(token)}`);
      continue;
    }

    // ----- điểm dừng gradient (Tailwind v4 dùng --tw-gradient-from/via/to)
    if (variant === '' && (m = base.match(/^(from|via|to)-(.+?)(?:\/\d+)?$/))) {
      const [, stop, color] = m;
      if (isDarkColor(color)) {
        const a = alphaOf(base);
        add(g.stops, `--tw-gradient-${stop}|rgba(248, 250, 252, ${a < 0.5 ? 0.45 : a < 0.85 ? 0.75 : 0.94})`, `.${esc(token)}`);
      } else if (stop === 'from' && new RegExp(`^(${FAMILIES.join('|')})-(400|500|600|700|800)$`).test(color) && alphaOf(base) >= 0.7) {
        g.solid.add(token);
      }
    }
  }
  return g;
}

/* ---------- Sinh CSS ----------
   Để khối sinh ra gọn, điều kiện phạm vi + loại trừ (đắt vì có :has()) chỉ xuất
   hiện trong vài rule "áp dụng"; còn từng class chỉ gán một biến rẻ:
     html.light .text-amber-300 { --lv-c: #92400e }                  ← rẻ, không có điều kiện
     html.light <phạm vi>:is(.text-amber-300, …)<loại trừ> { color: var(--lv-c) }
   Biến hover (.hover\:x:hover) có độ ưu tiên cao hơn biến thường nên thắng khi rê chuột. */
const sortParts = (parts) => [...parts].sort();
/** Tách selector theo biến thể để cascade đúng: thường < :hover < .group:hover (rule sau, ưu tiên cao hơn).
    (:is() lấy độ ưu tiên của đối số MẠNH NHẤT, nên không được trộn các biến thể vào cùng một :is().) */
const variantOf = (part) => (part.startsWith('.group:hover ') ? 2 : part.endsWith(':hover') ? 1 : 0);
function varRules(groups, varName) {
  // groups: Map(value -> Set(selectorPart))
  const rules = [];
  for (const level of [0, 1, 2]) {
    for (const [value, parts] of groups) {
      const picked = [...parts].filter((p) => variantOf(p) === level);
      if (picked.length) rules.push(`html.light :is(${sortParts(picked).join(', ')}) { ${varName}: ${value}; }`);
    }
  }
  return rules;
}
function applyRule(scope, parts, tail, body) {
  return parts.length ? `html.light ${scope}:is(${sortParts(parts).join(', ')})${tail} { ${body} }` : '';
}

export function buildLightAdapterCss(tokens = collectTokens()) {
  const g = classify(tokens);
  const solid = g.solid.size ? `:is(${[...g.solid].sort().map((t) => `[class~="${t}"]`).join(', ')})` : '';
  const NOT_SOLID = solid ? `:not(${solid}, ${solid} *)` : '';
  const viewSel = (s) => `html.light ${VIEW_SHELL} ${s}`;
  const out = [];

  out.push(`html.light {
  --lv-ink: ${LIGHT_TOKENS.ink};
  --lv-ink-3: ${LIGHT_TOKENS.ink3};
  --lv-muted: ${LIGHT_TOKENS.muted};
  --lv-faint: ${LIGHT_TOKENS.faint};
  --lv-placeholder: ${LIGHT_TOKENS.placeholder};
  --lv-page: ${LIGHT_TOKENS.page};
}`);

  /* Nền trang: kính sữa "liquid" thay cho nền đen + video tối. */
  out.push(`html.light ${VIEW_SHELL} { background: var(--lv-page) !important; color: var(--lv-ink); }`);
  out.push(`${viewSel('.ff-video-bg')} { display: none !important; }`);
  out.push(`${viewSel('.ff-potator-bg')} {
  display: block;
  background:
    radial-gradient(900px 520px at 8% -8%, rgba(255, 214, 165, 0.55), transparent 62%),
    radial-gradient(820px 480px at 100% 0%, rgba(167, 139, 250, 0.32), transparent 62%),
    radial-gradient(900px 520px at 50% 110%, rgba(125, 211, 252, 0.28), transparent 62%),
    linear-gradient(180deg, #f7f8fc 0%, var(--lv-page) 100%);
}`);
  out.push(`${viewSel('.ff-potator-bg::before')}, ${viewSel('.ff-potator-bg::after')} { display: none; }`);
  /* Nền gốc tối phủ kín màn hình của một trang (vd. Sắp ra mắt bg-[#001428])
     nhường chỗ cho nền sáng của shell thay vì thành một tấm trắng đục che gradient. */
  const rootDark = [...tokens]
    .filter((t) => t === 'bg-black' || /^bg-(neutral|zinc|slate|gray)-950$/.test(t) || (/^bg-\[#[0-9a-fA-F]{3,6}\]$/.test(t) && isDarkHex(t.slice(3))))
    .sort();
  if (rootDark.length) {
    out.push(`html.light ${VIEW_SHELL} :is(.min-h-screen, .h-screen):is(${rootDark.map((t) => `.${esc(t)}`).join(', ')}) { background-color: transparent !important; }`);
  }
  /* Lớp phủ tối trang trí (rỗng, không bắt chuột) phủ lên nền → ẩn ở chế độ sáng.
     Tấm phủ bắt click để đóng hộp thoại có pointer-events nên KHÔNG bị ẩn. */
  out.push(`html.light ${VIEW_SHELL} .pointer-events-none.inset-0:is([class*="from-black"], [class*="via-black"], [class*="bg-black/"]):empty${NOT_MEDIA_CHILD} { display: none; }`);

  // ----- màu chữ: biến --lv-c theo từng class
  const textVars = new Map();
  const addVar = (value, parts) => {
    if (!parts.size) return;
    if (!textVars.has(value)) textVars.set(value, new Set());
    for (const p of parts) textVars.get(value).add(p);
  };
  addVar('var(--lv-ink)', g.textInk);
  addVar('var(--lv-ink-3)', g.textInk3);
  addVar('var(--lv-muted)', g.textMuted);
  addVar('var(--lv-faint)', g.textFaint);
  for (const fam of FAMILIES) addVar(FAMILY_SHADE[fam], g.textFamily[fam]);
  out.push(...varRules(textVars, '--lv-c'));
  // Chữ trung tính (trắng/xám): giữ nguyên khi nằm trên nút màu đặc / gradient màu
  out.push(applyRule(SELF_OR_DESC, [...g.textInk, ...g.textInk3, ...g.textMuted, ...g.textFaint], `${NOT_ZONE}${NOT_SOLID}`, 'color: var(--lv-c);'));
  // Chữ có sắc (amber-300 → amber-800 …)
  out.push(applyRule(SELF_OR_DESC, FAMILIES.flatMap((f) => [...g.textFamily[f]]), NOT_ZONE, 'color: var(--lv-c);'));

  // ----- placeholder (pseudo-element phải đứng cuối selector)
  if (g.placeholder.size) {
    out.push(sortParts(g.placeholder).map((p) => {
      const [cls, pseudo] = p.split('::');
      return `html.light ${DESC}${cls}::${pseudo}`;
    }).join(',\n') + ' { color: var(--lv-placeholder); }');
  }

  // ----- bề mặt (chỉ con cháu — không làm loãng chính tấm kính sữa)
  out.push(...varRules(g.surfaces, '--lv-bg'));
  out.push(applyRule(SURFACE_SCOPE, [...g.surfaces.values()].flatMap((s) => [...s]), `${NOT_ZONE}${NOT_MEDIA_CHILD}${NOT_SCRIM}`, 'background-color: var(--lv-bg);'));
  out.push(...varRules(g.hoverSurfaces, '--lv-bg-h'));
  out.push(applyRule(DESC, [...g.hoverSurfaces.values()].flatMap((s) => [...s]), NOT_ZONE, 'background-color: var(--lv-bg-h);'));
  // ----- viền / divider / ring
  out.push(...varRules(g.borders, '--lv-bd'));
  out.push(applyRule(DESC, [...g.borders.values()].flatMap((s) => [...s]), NOT_ZONE, 'border-color: var(--lv-bd);'));
  for (const [value, parts] of g.divides) out.push(applyRule(DESC, [...parts], NOT_ZONE, `border-color: ${value};`));
  for (const [value, parts] of g.rings) out.push(applyRule(DESC, [...parts], NOT_ZONE, `--tw-ring-color: ${value};`));
  // ----- điểm dừng gradient tối → sáng (Tailwind v4: --tw-gradient-from/via/to)
  for (const stop of ['from', 'via', 'to']) {
    const groups = new Map();
    for (const [key, parts] of g.stops) {
      const [prop, value] = key.split('|');
      if (prop === `--tw-gradient-${stop}`) groups.set(value, parts);
    }
    if (!groups.size) continue;
    out.push(...varRules(groups, `--lv-${stop}`));
    out.push(applyRule(DESC, [...groups.values()].flatMap((s) => [...s]), `${NOT_ZONE}${NOT_MEDIA_CHILD}`, `--tw-gradient-${stop}: var(--lv-${stop});`));
  }

  return `${START_MARKER}\n${out.filter(Boolean).join('\n')}\n${END_MARKER}`;
}

export function applyToCss(css, block) {
  const start = css.indexOf(START_MARKER);
  const end = css.indexOf(END_MARKER);
  if (start === -1 || end === -1) return `${css.replace(/\s*$/, '\n')}\n${block}\n`;
  return css.slice(0, start) + block + css.slice(end + END_MARKER.length);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  const next = applyToCss(css, buildLightAdapterCss());
  if (process.argv.includes('--check')) {
    if (next !== css) {
      console.error('✗ Khối light-adapter trong src/index.css đã cũ — chạy: npm run gen:light');
      process.exit(1);
    }
    console.log('✓ light-adapter đang khớp với class trong src/');
  } else {
    fs.writeFileSync(CSS_PATH, next);
    console.log(`✓ Đã ghi light-adapter (${Buffer.byteLength(buildLightAdapterCss())} byte) vào src/index.css`);
  }
}
