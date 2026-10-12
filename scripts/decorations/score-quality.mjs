#!/usr/bin/env node
/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Nhiệm vụ 10 — Chấm điểm CHẤT LƯỢNG thực của 873 asset và gán lại rarity/giá.
 *
 * Vì sao: pipeline ban đầu gán rarity theo chỉ số kỹ thuật (số frame + độ phủ alpha)
 * — không phản ánh chất lượng hình. Script này đo TRỰC TIẾP trên file output:
 *
 *  - Cấu trúc alpha (từ full.webp — alpha decode tin cậy):
 *      frame/aura phải có VÒNG TRÒN nội dung quanh viền + tâm TRỐNG
 *      (tâm đặc = khung che mặt avatar — lỗi cấu trúc → đánh dấu low-quality).
 *  - Nét (Laplacian variance), màu (sát màu TB), tương phản — từ full.webp.
 *  - Animation: decode WebM RGB 64×64 (VP9 RGB decode chuẩn; alpha webm trong
 *    sandbox không tin nhưng không cần — alpha lấy từ webp) → motion = chênh lệch
 *    giữa các frame. "Animation" mà motion ≈ 0 → tag static-content.
 *
 * Gán rarity theo điểm, theo nhóm (frame+aura một bảng, nameplate một bảng):
 *   10% mythic · 25% epic · 35% rare · còn lại common. Item TĨNH (không animation)
 *   chốt common (giá trị thấp nhất — không có animation).
 * Giá Coin theo bảng coins[type][rarity] trong catalog (common → mythic tăng dần).
 *
 * Chạy: node scripts/decorations/score-quality.mjs [--limit=50]  (dev)
 * Viết lại rarity/price/tags/qualityScore/isActive trong decorations-catalog.json
 * (giữ nguyên mọi trường khác). Idempotent — chạy lại cho cùng kết quả.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const DECOS = path.resolve(ROOT, 'public', 'assets', 'decorations');
const CATALOG_PATH = path.join(DECOS, 'decorations-catalog.json');
const FFMPEG =
  process.env.FFMPEG_PATH ||
  (fs.existsSync('/tmp/decor/ffmpeg') ? '/tmp/decor/ffmpeg' : 'ffmpeg');
const CONCURRENCY = Number(process.env.SCORING_CONCURRENCY || 5);
const limitFlag = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitFlag ? Number(limitFlag.split('=')[1]) : 0;

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
/* Idempotent: dọn tags do script này quản lý từ run cũ trước khi chấm lại. */
const SCRIPT_TAGS = new Set(['static-content', 'low-quality', 'opaque-center']);
for (const item of catalog.items) {
  if (Array.isArray(item.tags)) item.tags = item.tags.filter((t) => !SCRIPT_TAGS.has(t));
}
const items = catalog.items.slice(0, LIMIT || undefined);
const isDev = LIMIT > 0;
console.log(`Scoring ${items.length}/${catalog.items.length} item (ffmpeg: ${FFMPEG})`);

/* ------------------------------------------------------------------ */
/* Metric từ ảnh tĩnh (full.webp — RGBA decode tin cậy)               */
/* ------------------------------------------------------------------ */
const stillMetrics = (item) => {
  const file = path.join(ROOT, 'public', item.assetPath.fullWebp || item.assetPath.preview);
  return sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true }).then(({ data, info }) => {
    const { width: w, height: h, channels } = info;
    const px = (x, y) => (y * w + x) * channels;
    const alpha = (x, y) => data[px(x, y) + channels - 1];
    const gray = (x, y) => {
      const i = px(x, y);
      return (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) | 0;
    };
    /* Vùng tâm 36% (khung che mặt ở đây là LỖI). */
    const c0 = Math.floor(w * 0.32), c1 = Math.ceil(w * 0.68);
    const r0 = Math.floor(h * 0.32), r1 = Math.ceil(h * 0.68);
    let centerSum = 0;
    let centerN = 0;
    for (let y = r0; y < r1; y += 2) {
      for (let x = c0; x < c1; x += 2) {
        centerSum += alpha(x, y);
        centerN += 1;
      }
    }
    const centerAlpha = centerSum / centerN;
    /* Vòng viền ngoài 10% — nơi khung/vầng sáng phải có nội dung. */
    let ringOpaque = 0;
    let ringTotal = 0;
    const B = Math.max(2, Math.floor(w * 0.1));
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        if (x < B || x >= w - B || y < B || y >= h - B) {
          ringTotal += 1;
          if (alpha(x, y) > 128) ringOpaque += 1;
        }
      }
    }
    const ringCoverage = ringTotal ? (ringOpaque / ringTotal) * 100 : 0;
    /* Nét: phương sai Laplacian trên gray (chỉ px có alpha). */
    let lapSum = 0;
    let lapSq = 0;
    let lapN = 0;
    let satSum = 0;
    let satN = 0;
    let lumSum = 0;
    let lumSq = 0;
    let lumN = 0;
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        if (alpha(x, y) < 128) continue;
        const g = gray(x, y);
        const lap = 4 * g - gray(x - 1, y) - gray(x + 1, y) - gray(x, y - 1) - gray(x, y + 1);
        lapSum += lap;
        lapSq += lap * lap;
        lapN += 1;
        const i = px(x, y);
        const r = data[i], g2 = data[i + 1], b = data[i + 2];
        satSum += (Math.max(r, g2, b) - Math.min(r, g2, b)) / 255;
        satN += 1;
        lumSum += g;
        lumSq += g * g;
        lumN += 1;
      }
    }
    const lapVar = lapN ? lapSq / lapN - (lapSum / lapN) ** 2 : 0;
    return {
      centerAlpha,
      ringCoverage,
      sharpness: lapVar,
      saturation: satN ? satSum / satN : 0,
      contrast: lumN ? Math.sqrt(Math.max(0, lumSq / lumN - (lumSum / lumN) ** 2)) : 0,
    };
  });
};

/* ------------------------------------------------------------------ */
/* Motion từ WebM (RGB 64×64, tối đa 14 frame — vp9 RGB decode chuẩn) */
/* ------------------------------------------------------------------ */
const motionMetrics = (item) =>
  new Promise((resolve) => {
    const file = path.join(ROOT, 'public', item.assetPath.animated);
    const importFfmpeg = import('node:child_process').then(({ spawn }) => spawn);
    importFfmpeg
      .then((spawn) => {
        return new Promise((res2) => {
          const child = spawn(
            FFMPEG,
            [
              '-loglevel', 'error',
              '-i', file,
              '-frames:v', '14',
              '-vf', 'scale=64:64:flags=area,format=rgb24',
              '-f', 'rawvideo', 'pipe:1',
            ],
            { stdio: ['ignore', 'pipe', 'ignore'] },
          );
          const chunks = [];
          child.stdout.on('data', (c) => chunks.push(c));
          child.on('close', () => {
            const buf = Buffer.concat(chunks);
            const fw = 64, fh = 64, fb = fw * fh * 3;
            const n = Math.floor(buf.length / fb);
            if (n < 2) return res2({ motion: 0, motionMax: 0, frames: n });
            let diff = 0;
            let maxPair = 0;
            let pairs = 0;
            for (let f = 1; f < n; f += 1) {
              const a = buf.subarray((f - 1) * fb, f * fb);
              const b = buf.subarray(f * fb, (f + 1) * fb);
              let s = 0;
              for (let i = 0; i < a.length; i += 12) s += Math.abs(a[i] - b[i]);
              const perPair = s / (a.length / 12);
              diff += perPair;
              if (perPair > maxPair) maxPair = perPair;
              pairs += 1;
            }
            res2({ motion: diff / pairs, motionMax: maxPair, frames: n });
          });
          child.on('error', () => res2({ motion: 0, motionMax: 0, frames: 0 }));
          setTimeout(() => {
            try { child.kill(); } catch { /* đã tắt */ }
            res2({ motion: 0, motionMax: 0, frames: 0 });
          }, 20000);
        });
      })
      .then(resolve)
      .catch(() => resolve({ motion: 0, motionMax: 0, frames: 0 }));
  });

/* ------------------------------------------------------------------ */
/* Chạy song song                                                      */
/* ------------------------------------------------------------------ */
const raw = [];
const t0 = Date.now();
for (let i = 0; i < items.length; i += CONCURRENCY) {
  const batch = items.slice(i, i + CONCURRENCY);
  const results = await Promise.all(
    batch.map(async (item) => {
      /* Đo motion cho mọi item có webm trên đĩa — độc lập với trạng thái catalog,
         để re-run luôn tái hiện cùng kết quả. */
      const webm = item.assetPath?.animated ? path.join(ROOT, "public", item.assetPath.animated) : null;
      const hasWebm = !!(webm && fs.existsSync(webm));
      const [s, m] = await Promise.all([stillMetrics(item), hasWebm ? motionMetrics(item) : Promise.resolve({ motion: 0, motionMax: 0, frames: 0 })]);
      return { id: item.id, ...s, motion: m.motion, motionMax: m.motionMax, frames: m.frames };
    }),
  );
  raw.push(...results);
  if (i % (CONCURRENCY * 20) === 0) {
    console.log(`  …${i + batch.length}/${items.length} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
}
const byId = new Map(raw.map((r) => [r.id, r]));

/* ------------------------------------------------------------------ */
/* "Animation" đứng hình (mọi frame giống nhau, maxDiff<0.5) → TĨNH.
   Deterministic từ webm trên đĩa: re-run cho cùng kết quả.            */
/* ------------------------------------------------------------------ */
let staticConverted = 0;
for (const item of items) {
  const webm = item.assetPath?.animated ? path.join(ROOT, "public", item.assetPath.animated) : null;
  if (!webm || !fs.existsSync(webm)) continue;
  const m = byId.get(item.id);
  if (m && m.frames >= 2 && m.motionMax < 0.5) {
    item.isAnimated = false;
    item.assetPath.animated = null;
    item.tags = [...new Set([...(item.tags || []), 'static-content'])];
    staticConverted += 1;
  }
}

/* ------------------------------------------------------------------ */
/* Percentile trong nhóm → điểm 0-100                                  */
/* ------------------------------------------------------------------ */
const percentile = (values, v) => {
  let less = 0;
  for (const x of values) if (x < v) less += 1;
  return values.length ? (less / (values.length - 1)) * 100 : 0;
};

const groups = {
  frame_aura: items.filter((i) => i.type !== 'nameplate'),
  nameplate: items.filter((i) => i.type === 'nameplate'),
};

const scoreOf = (item, pool) => {
  const m = byId.get(item.id);
  if (!m) return null;
  const ring = percentile(pool.map((p) => byId.get(p.id)?.ringCoverage ?? 0), m.ringCoverage);
  const sharp = percentile(pool.map((p) => byId.get(p.id)?.sharpness ?? 0), m.sharpness);
  const sat = percentile(pool.map((p) => byId.get(p.id)?.saturation ?? 0), m.saturation);
  const contrast = percentile(pool.map((p) => byId.get(p.id)?.contrast ?? 0), m.contrast);
  const motion = percentile(pool.map((p) => byId.get(p.id)?.motion ?? 0), m.motion);
  const transparency = percentile(pool.map((p) => byId.get(p.id) ? 255 - byId.get(p.id).centerAlpha : 0), 255 - m.centerAlpha);
  if (item.type === 'nameplate') {
    return Math.round(0.35 * sharp + 0.30 * sat + 0.25 * (item.isAnimated ? motion : 0) + 0.10 * contrast);
  }
  if (item.type === 'avatar_aura') {
    /* Aura: vầng sáng quanh viền là giá trị chính; tâm không quan trọng (nằm sau avatar). */
    return Math.round(0.30 * ring + 0.25 * (item.isAnimated ? motion : 0) + 0.25 * sat + 0.10 * sharp + 0.10 * contrast);
  }
  /* Frame: vòng viền + tâm trống là bắt buộc; nét/màu/motion tăng dần giá trị. */
  return Math.round(0.30 * ring + 0.20 * transparency + 0.15 * sharp + 0.15 * sat + 0.20 * (item.isAnimated ? motion : 0));
};

/* ------------------------------------------------------------------ */
/* Lỗi cấu trúc + gán rarity                                           */
/* ------------------------------------------------------------------ */
const RARITY_ORDER = ['common', 'rare', 'epic', 'mythic'];
const targets = [0.3, 0.35, 0.25, 0.1]; /* common, rare, epic, mythic (tỷ lệ trên phần ĐỘNG) */

const report = { groups: {}, defects: [] };
for (const [gName, pool] of Object.entries(groups)) {
  const animated = pool.filter((i) => i.isAnimated);
  const scored = animated.map((i) => ({ item: i, score: scoreOf(i, pool) })).filter((r) => r.score !== null);
  scored.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, 'vi'));
  /* mythic top 10%, epic 25%, rare 35%, common phần còn lại (trong nhóm ĐỘNG). */
  const n = scored.length;
  const cutMythic = Math.round(n * targets[3]);
  const cutEpic = cutMythic + Math.round(n * targets[2]);
  const cutRare = cutEpic + Math.round(n * targets[1]);
  scored.forEach(({ item, score }, idx) => {
    const rarity = idx < cutMythic ? 'mythic' : idx < cutEpic ? 'epic' : idx < cutRare ? 'rare' : 'common';
    item.rarity = rarity;
    item.price = catalog.pricing.coins[item.type][rarity];
    item.qualityScore = score;
    const m = byId.get(item.id);
    /* Lỗi cấu trúc: FRAME có tâm đặc → che mặt avatar → ngừng bán. */
    if (item.type === 'avatar_frame' && m.centerAlpha > 190) {
      item.isActive = false;
      item.tags = [...new Set([...(item.tags || []), 'low-quality', 'opaque-center'])];
      report.defects.push({ id: item.id, name: item.name, centerAlpha: Math.round(m.centerAlpha) });
    }
    /* (chuyển static đã chạy ở pass riêng phía trên — deterministic từ đĩa) */
  });
  /* Item TĨNH (không animation — kể cả vừa bị chuyển từ 'static-content') —
     chốt common, vẫn chấm điểm cho review. */
  for (const item of pool) {
    if (item.isAnimated) continue;
    item.rarity = 'common';
    item.price = catalog.pricing.coins[item.type]['common'];
    item.qualityScore = scoreOf(item, pool) ?? 0;
  }
  const dist = { common: 0, rare: 0, epic: 0, mythic: 0 };
  for (const item of pool) dist[item.rarity] += 1;
  report.groups[gName] = dist;
}

/* ------------------------------------------------------------------ */
/* Ghi catalog (chỉ khi không --limit) + báo cáo                        */
/* ------------------------------------------------------------------ */
if (!isDev) {
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
}

console.log('\n=== BÁO CÁO CHẤT LƯỢNG ===');
for (const [g, dist] of Object.entries(report.groups)) {
  console.log(`${g}:`, RARITY_ORDER.map((r) => `${r}=${dist[r]}`).join(' · '));
}
console.log(`Defect (frame tâm đặc → ngừng bán): ${report.defects.length}`);
for (const d of report.defects.slice(0, 15)) console.log(`  ✗ ${d.id} (${d.name}) centerAlpha=${d.centerAlpha}`);
console.log(`'Animation' đứng hình → chuyển static (maxDiff<0.5): ${staticConverted}`);
const all = catalog.items;
const totalDist = { common: 0, rare: 0, epic: 0, mythic: 0 };
for (const i of all) totalDist[i.rarity] += 1;
console.log('TOÀN CATALOG:', RARITY_ORDER.map((r) => `${r}=${totalDist[r]}`).join(' · '), `| inactive: ${all.filter((i) => !i.isActive).length}`);
console.log(isDev ? '\n(--limit: KHÔNG ghi catalog)' : `\nCatalog đã ghi: ${path.relative(ROOT, CATALOG_PATH)}`);
