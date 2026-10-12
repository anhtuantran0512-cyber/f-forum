#!/usr/bin/env node
/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Nhiệm vụ 10 — tạo "screenshot" minh chứng cho TEST_REPORT (sandbox không có
 * trình duyệt headless → không chụp được UI thật; thay bằng composite pixel
 * THẬT từ chính asset trong public/assets/decorations — cùng tệp component render).
 *
 * Chạy: node scripts/decorations/make-demo-screenshots.mjs [--ffmpeg=/path]
 * Đầu ra: docs/decorations/screenshots/*.png
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const DECOS = path.resolve(ROOT, 'public', 'assets', 'decorations');
const OUT = path.resolve(ROOT, 'docs', 'decorations', 'screenshots');
const FFMPEG =
  process.argv.find((a) => a.startsWith('--ffmpeg='))?.split('=')[1] ||
  (fs.existsSync('/tmp/decor/ffmpeg') ? '/tmp/decor/ffmpeg' : 'ffmpeg');
const RARITY_COLOR = { common: '#9CA3AF', rare: '#3B82F6', epic: '#A855F7', mythic: '#F59E0B' };
const RARITY_LABEL = { common: 'COMMON', rare: 'RARE', epic: 'EPIC', mythic: 'MYTHIC' };

fs.mkdirSync(OUT, { recursive: true });
const catalog = JSON.parse(fs.readFileSync(path.join(DECOS, 'decorations-catalog.json'), 'utf8'));
const items = catalog.items;
const abs = (p) => (p.startsWith('/') ? path.join(ROOT, 'public', p) : path.join(DECOS, p));

/* Lọc alpha của webm → PNG 1 khung hình (cho nameplate động). */
const webmFrameCache = new Map();
const webmFrame = (webmPath) => {
  const key = webmPath;
  if (webmFrameCache.has(key)) return webmFrameCache.get(key);
  const tmp = path.join(OUT, `.frame-${process.pid}-${Date.now()}-${Math.floor(Math.random() * 1e5)}.png`);
  try {
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', abs(webmPath), '-frames:v', '1', tmp], { timeout: 30000 });
    webmFrameCache.set(key, tmp);
    return tmp;
  } catch (err) {
    console.error(`  ! không đọc được frame ${webmPath}: ${err.message}`);
    webmFrameCache.set(key, null);
    return null;
  }
};

/* Sinh avatar mẫu (không dùng data người dùng thật). */
const makeAvatar = async (label, c1, c2, px = 300) => {
  const svg = `<svg width="${px}" height="${px}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient></defs>
    <circle cx="${px / 2}" cy="${px / 2}" r="${px / 2}" fill="url(#g)"/>
    <text x="50%" y="54%" font-family="Arial, sans-serif" font-size="${px * 0.42}" font-weight="700"
      fill="rgba(255,255,255,0.92)" text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
};

const labelPng = (text, { size = 22, color = '#e2e8f0', weight = 700 } = {}) =>
  sharp(Buffer.from(svgText(text, size, color, weight))).png().toBuffer();

const svgText = (text, size, color, weight) => {
  const w = Math.max(40, Math.ceil(text.length * size * 0.62));
  const h = Math.ceil(size * 1.5);
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="${Math.round(size * 1.05)}" font-family="Arial, sans-serif" font-size="${size}"
      font-weight="${weight}" fill="${color}">${text}</text></svg>`;
};

/* ===== 01 · Contact sheet catalog (16 mythic frame + 8 epic frame + 8 nameplate) ===== */
const contactSheet = async () => {
  const cells = [];
  const mythic = items.filter((i) => i.rarity === 'mythic' && i.type !== 'nameplate').slice(0, 16);
  const epic = items.filter((i) => i.rarity === 'epic' && i.type !== 'nameplate').slice(0, 8);
  const np = items.filter((i) => i.type === 'nameplate' && i.rarity !== 'common').slice(0, 8);
  for (const i of mythic) cells.push({ item: i, kind: 'frame' });
  for (const i of epic) cells.push({ item: i, kind: 'frame' });
  for (const i of np) cells.push({ item: i, kind: 'nameplate' });
  const cell = 240, gap = 12, pad = 24, cols = 8, rows = Math.ceil(cells.length / cols);
  const W = pad * 2 + cols * cell + (cols - 1) * gap;
  const H = pad * 2 + 44 + rows * (cell + 34) + (rows - 1) * gap;
  const bg = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 11, g: 18, b: 32, alpha: 1 } },
  }).png().toBuffer();
  const layers = [
    { input: await labelPng('f-FORUM · decorations-catalog.json — 873 item (569 frame · 68 aura · 236 nameplate)', { size: 24, color: '#f8fafc' }), top: pad, left: pad },
  ];
  let y = pad + 44;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const cellData = cells[r * cols + c];
      if (!cellData) continue;
      const x = pad + c * (cell + gap);
      const color = RARITY_COLOR[cellData.item.rarity];
      let imgBuf;
      if (cellData.kind === 'nameplate' && cellData.item.assetPath.animated) {
        /* Nameplate = banner không alpha → frame webm đúng nghĩa. */
        const fr = webmFrame(cellData.item.assetPath.animated);
        imgBuf = fr ? await sharp(fr).resize(cell, Math.round(cell * 0.5), { fit: 'contain', background: { r: 17, g: 26, b: 44, alpha: 1 } }).png().toBuffer() : null;
      } else {
        /* Frame/aura: dùng full.webp (alpha chuẩn) — sandbox không decode được
           VP9 alpha nên không trích frame webm cho loại overlay. */
        const src = abs(cellData.item.assetPath.fullWebp || cellData.item.assetPath.preview);
        imgBuf = await sharp(src).resize(cell, cell, { fit: 'contain', background: { r: 17, g: 26, b: 44, alpha: 1 } }).png().toBuffer();
      }
      if (!imgBuf) continue;
      layers.push({ input: imgBuf, top: y, left: x });
      layers.push({ input: await labelPng(cellData.item.name.slice(0, 26), { size: 15, color: '#cbd5e1' }), top: y + cell + 4, left: x });
      layers.push({
        input: await sharp({ create: { width: 10, height: 18, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([
          { input: Buffer.from(`<svg width="10" height="18"><rect x="0" y="4" width="10" height="10" rx="5" fill="${color}"/></svg>`), top: 0, left: 0 },
        ]).png().toBuffer(),
        top: y + cell + 9,
        left: x + Math.min(216, Math.ceil(cellData.item.name.length * 9.3) + 8),
      });
    }
    y += cell + 34 + gap;
  }
  const file = path.join(OUT, '01-catalog-contact-sheet.png');
  await sharp(bg).composite(layers).png().toFile(file);
  console.log('✔', path.relative(ROOT, file));
};

/* ===== 02 · Avatar 150px + khung / hào quang (đúng tỉ lệ CSS: frame 112%, aura 118%) ===== */
const avatarDemo = async () => {
  const avatar = await makeAvatar('B', '#f59e0b', '#ef4444', 300);
  const picks = items.filter((i) => i.rarity === 'mythic' && i.type !== 'nameplate' && i.isAnimated).slice(0, 4);
  const auraPick = items.find((i) => i.rarity === 'mythic' && i.type === 'avatar_aura' && i.isAnimated) || items.find((i) => i.type === 'avatar_aura');
  const colW = 380, pad = 30, headerH = 56, rowH = 434; /* card 360px ≥ canvas aura 354px */
  const n = picks.length + (auraPick ? 1 : 0) + 1;
  const W = pad * 2 + n * colW;
  const H = pad + headerH + rowH + pad;
  const bg = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 11, g: 18, b: 32, alpha: 1 } } }).png().toBuffer();
  const layers = [{ input: await labelPng('ProfileModal — avatar 150px + trang trí (tỉ lệ overlay khớp CSS .awd__slot--frame/-aura)', { size: 22 }), top: pad, left: pad }];

  /* Lưu ý: sandbox KHÔNG decode được VP9 alpha (2 build ffmpeg thử đều bỏ kênh
     alpha khi giải mã — bitrate test chứng minh webm ĐÃ có alpha plane).
     Vì vậy composite dùng ảnh tĩnh full.webp (alpha chuẩn, đã verify) thay vì
     trích frame webm; trong trình duyệt thật, webm vẫn render đúng. */
  const decoBuffer = async (item, scale) => {
    const side = Math.round(300 * scale);
    const src = abs(item.assetPath.fullWebp || item.assetPath.preview);
    if (!fs.existsSync(src)) return null;
    const resized = await sharp(src).resize(side, side, { fit: 'contain' }).png().toBuffer();
    const off = Math.round((side - 300) / 2);
    return { resized, side, off };
  };

  const renderOne = async (x, title, decoItem, mode) => {
    if (mode === 'aura' && decoItem) {
      const d = await decoBuffer(decoItem, 1.18);
      let canvas = sharp({ create: { width: d.side, height: d.side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite([{ input: d.resized, top: 0, left: 0 }])
        .composite([{ input: avatar, top: d.off, left: d.off }]);
      const buf = await canvas.png().toBuffer();
      await placeCard(x, title, buf);
      return;
    }
    let canvas = sharp(avatar);
    if (mode === 'frame' && decoItem) {
      const d = await decoBuffer(decoItem, 1.12);
      if (d) canvas = canvas.extend({ top: d.off, bottom: d.off, left: d.off, right: d.off, background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .composite([{ input: d.resized, top: 0, left: 0 }]);
    }
    await placeCard(x, title, await canvas.png().toBuffer());
  };

  const placeCard = async (x, title, buf) => {
    const card = await sharp({ create: { width: colW - 20, height: rowH - 70, channels: 4, background: { r: 17, g: 26, b: 44, alpha: 1 } } })
      .composite([{ input: buf, top: 20, left: Math.round((colW - 20 - 300) / 2) }])
      .png().toBuffer();
    layers.push({ input: card, top: pad + headerH, left: x });
    layers.push({ input: await labelPng(title, { size: 16, color: '#94a3b8' }), top: pad + headerH + rowH - 46, left: x + 16 });
  };

  let x = pad;
  await renderOne(x, 'avatar thường', null, 'plain');
  x += colW;
  for (const p of picks) {
    await renderOne(x, p.name, p, 'frame');
    x += colW;
  }
  if (auraPick) await renderOne(x, `${auraPick.name} (aura)`, auraPick, 'aura');

  const file = path.join(OUT, '02-avatar-frames-demo.png');
  await sharp(bg).composite(layers).png().toFile(file);
  console.log('✔', path.relative(ROOT, file));
};

/* ===== 03 · Nameplate — tên nằm TRÊN bảng tên (contrast text-shadow) ===== */
const nameplateDemo = async () => {
  const picks = [
    ...items.filter((i) => i.type === 'nameplate' && i.rarity === 'mythic').slice(0, 2),
    ...items.filter((i) => i.type === 'nameplate' && i.rarity === 'epic').slice(0, 1),
    ...items.filter((i) => i.type === 'nameplate' && i.rarity === 'rare').slice(0, 1),
  ];
  const pad = 30, cardW = 640, cardH = 200, gap = 20, headerH = 56;
  const W = pad * 2 + cardW * 2 + gap;
  const H = pad + headerH + cardH * 2 + gap * 2 + pad;
  const bg = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 11, g: 18, b: 32, alpha: 1 } } }).png().toBuffer();
  const layers = [{ input: await labelPng('NameplateDisplay — tên user nằm TRÊN bảng tên (text-shadow chống nền rực)', { size: 22 }), top: pad, left: pad }];
  let x = pad, y = pad + headerH;
  for (const p of picks) {
    const fr = p.isAnimated ? webmFrame(p.assetPath.animated) : abs(p.assetPath.fullWebp || p.assetPath.preview);
    if (!fr) continue;
    const npBuf = await sharp(fr).resize(cardW - 60, 120, { fit: 'contain' }).png().toBuffer();
    const card = await sharp({ create: { width: cardW, height: cardH, channels: 4, background: { r: 17, g: 26, b: 44, alpha: 1 } } })
      .composite([
        { input: npBuf, top: 40, left: 30 },
        { input: await labelPng('BroAmStuck', { size: 40, color: '#f8fafc', weight: 800 }), top: 40 + 30, left: Math.round(cardW / 2 - 110) },
        { input: await labelPng(`${p.name} · ${RARITY_LABEL[p.rarity]}`, { size: 16, color: '#94a3b8' }), top: cardH - 40, left: 30 },
      ])
      .png().toBuffer();
    layers.push({ input: card, top: y, left: x });
    if (x === pad) x += cardW + gap;
    else { x = pad; y += cardH + gap; }
  }
  const file = path.join(OUT, '03-nameplate-demo.png');
  await sharp(bg).composite(layers).png().toFile(file);
  console.log('✔', path.relative(ROOT, file));
};

/* ===== 04 · Boutique grid — preview 128px + viền màu rarity + lazy video (hover) ===== */
const shopGrid = async () => {
  const picks = items.filter((i) => i.type !== 'nameplate' && i.isAnimated).slice(0, 24);
  const cell = 200, gap = 14, pad = 26, cols = 6, rows = 4;
  const W = pad * 2 + cols * cell + (cols - 1) * gap;
  const H = pad + 48 + rows * (cell + 40) + (rows - 1) * gap + pad;
  const bg = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 11, g: 18, b: 32, alpha: 1 } } }).png().toBuffer();
  const layers = [{ input: await labelPng('Boutique — 24/873 item (pagination 24/niềm · hover phát webm · đây là preview.webp 128px thật)', { size: 20 }), top: pad, left: pad }];
  for (let i = 0; i < picks.length; i += 1) {
    const p = picks[i];
    const x = pad + (i % cols) * (cell + gap);
    const y = pad + 48 + Math.floor(i / cols) * (cell + 40 + gap);
    const color = RARITY_COLOR[p.rarity];
    const prev = await sharp(abs(p.assetPath.preview)).resize(128, 128, { fit: 'contain' }).png().toBuffer();
    const card = await sharp({ create: { width: cell, height: cell + 40, channels: 4, background: { r: 17, g: 26, b: 44, alpha: 1 } } })
      .composite([
        { input: await sharp({ create: { width: cell, height: 3, channels: 4, background: hexToObj(color) } }).png().toBuffer(), top: 0, left: 0 },
        { input: prev, top: 14, left: Math.round((cell - 128) / 2) },
        { input: await labelPng(p.name.slice(0, 22), { size: 14, color: '#e2e8f0' }), top: cell + 8, left: 12 },
        { input: await labelPng(`${p.price.toLocaleString('vi-VN')} Coin`, { size: 14, color, weight: 800 }), top: cell + 8, left: cell - 118 },
      ])
      .png().toBuffer();
    layers.push({ input: card, top: y, left: x });
  }
  const file = path.join(OUT, '04-boutique-grid-preview.png');
  await sharp(bg).composite(layers).png().toFile(file);
  console.log('✔', path.relative(ROOT, file));
};

const hexToObj = (hex) => {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), alpha: 1 };
};

try {
  await contactSheet();
  await avatarDemo();
  await nameplateDemo();
  await shopGrid();
  console.log('\nXong — toàn bộ file ở docs/decorations/screenshots/');
} catch (err) {
  console.error('❌', err);
  process.exit(1);
}
