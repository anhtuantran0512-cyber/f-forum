#!/usr/bin/env node
/* Bản quyền trí tuệ thuộc về BroAmStuck */
/*
 * pipeline.mjs — pipeline asset Nhiệm vụ 10 (Bước 1.1 → 1.3).
 *
 * Cách chạy (từ gốc repo):
 *   FFMPEG_PATH=/tmp/decor/ffmpeg node scripts/decorations/pipeline.mjs audit
 *   FFMPEG_PATH=/tmp/decor/ffmpeg node scripts/decorations/pipeline.mjs build [--force] [--concurrency N]
 *   FFMPEG_PATH=/tmp/decor/ffmpeg node scripts/decorations/pipeline.mjs catalog
 *   FFMPEG_PATH=/tmp/decor/ffmpeg node scripts/decorations/pipeline.mjs all
 *
 * Lệnh build hỗ trợ thêm:
 *   --only=<tên file gốc>   chỉ xử lý đúng 1 entry (vd. cherry_blossoms.png, 2035.webm)
 *   --slugs=a,b,c           chỉ xử lý các slug đã đặt (dựng lại một vài item)
 *   --limit=N               chỉ lấy N item đầu (test nhanh)
 *   --reset                 xoá output + catalog rồi dựng lại từ đầu
 *
 * Đầu ra:
 *   public/assets/decorations/avatar-frames/{slug}/   preview.png, preview.webp, full.png, full.webp[, animated.webm]
 *   public/assets/decorations/nameplates/{slug}/ preview.png, preview.webp[, animated.webm]
 *   public/assets/decorations/decorations-catalog.json
 *   docs/decorations/ASSET_AUDIT.md + asset-audit.json
 *
 * Quy tắc tối ưu: preview < 100KB; ảnh tĩnh có WebP + PNG fallback; động là WebM
 * (VP9 alpha) và vẫn giữ ảnh tĩnh fallback (Safari/iOS không hỗ trợ VP9 alpha).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { openZip } from './lib/zip.mjs';
import { readPngInfo, stripAncillaryChunks } from './lib/png.mjs';
import { probeVideo, decodeFramesRgba, extractFrameRgba, runFfmpeg, requireFfmpeg } from './lib/ffmpeg.mjs';
import { slugify, classifyAvatarDecoration, deriveTags, proposeDisplayName, describe } from './lib/naming.mjs';
import { assignRarities, priceFor, REFERENCE_VND, COIN_PER_VND, vndToCoin } from './lib/pricing.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const COSMETICS_DIR = path.join(REPO_ROOT, 'cosmetics');
const OUT_DIR = path.join(REPO_ROOT, 'public', 'assets', 'decorations');
const DOCS_DIR = path.join(REPO_ROOT, 'docs', 'decorations');
const CATALOG_PATH = path.join(OUT_DIR, 'decorations-catalog.json');
const AUDIT_JSON_PATH = path.join(DOCS_DIR, 'asset-audit.json');
const AUDIT_MD_PATH = path.join(DOCS_DIR, 'ASSET_AUDIT.md');
const TMP_DIR = path.join(REPO_ROOT, 'scripts', 'decorations', '.tmp');

/* Cấu hình encode — cân bằng chất lượng và dung lượng (GitHub ~100MB/file, patchset ~128MB). */
const ENCODE = {
  frameWebM: { scale: 240, crf: 45, retryBytes: 200 * 1024, retryCrf: 52, maxInputFps: 30.5 },
  still: { previewWidth: 128, fullMax: 576, previewQuality: 82, fullQuality: 80, alphaQuality: 88, previewMaxBytes: 100 * 1024, paletteColors: 192 },
  nameplate: { maxWidth: 448, copyMaxBytes: 150 * 1024, crf: 37, previewWidth: 448, previewQuality: 82, previewMaxBytes: 100 * 1024 },
};

/* ============================ tiện ích chung ============================ */

function parseArgs(argv) {
  const args = { command: null, only: null, limit: 0, force: false, reset: false, concurrency: 2, slugs: null };
  for (const raw of argv) {
    if (raw === '--force') args.force = true;
    else if (raw === '--reset') args.reset = true;
    else if (raw.startsWith('--only=')) args.only = raw.slice(7);
    else if (raw.startsWith('--limit=')) args.limit = Number(raw.slice(8)) || 0;
    else if (raw.startsWith('--concurrency=')) args.concurrency = Math.max(1, Number(raw.slice(14)) || 1);
    else if (raw.startsWith('--slugs=')) args.slugs = raw.slice(8).split(',').map((s) => s.trim()).filter(Boolean);
    else if (!args.command) args.command = raw;
  }
  return args;
}

function ensureDirs() {
  for (const dir of [OUT_DIR, path.join(OUT_DIR, 'avatar-frames'), path.join(OUT_DIR, 'nameplates'), DOCS_DIR, TMP_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function collectFrameZips() {
  const dir = path.join(COSMETICS_DIR, 'avatar_border');
  if (!fs.existsSync(dir)) return [];
  const names = fs.readdirSync(dir).filter((n) => /^avatar_\d+\.zip$/.test(n));
  const byNum = (n) => Number(n.match(/^avatar_(\d+)\.zip$/)[1]);
  return names.sort((a, b) => byNum(a) - byNum(b)).map((n) => path.join(dir, n));
}

const NAMEPLATE_ZIP = path.join(COSMETICS_DIR, 'nameplate.zip');

function vnNowIso() {
  const d = new Date(Date.now() + (7 * 60 - new Date().getTimezoneOffset()) * 60000);
  return d.toISOString().replace('Z', '+07:00');
}

function fmtBytes(n) {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

async function withConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function lane() {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await worker(items[i], i);
    }
  }
  const lanes = [];
  for (let i = 0; i < Math.min(limit, items.length); i += 1) lanes.push(lane());
  await Promise.all(lanes);
  return results;
}

/* ============================ Bước 1.1: audit ============================ */

async function runAudit() {
  ensureDirs();
  requireFfmpeg();
  const rows = [];
  const frameZips = collectFrameZips();
  console.log(`[audit] ${frameZips.length} phần zip avatar_border + 1 zip nameplate`);

  const zip = openZip(frameZips);
  let frameCount = 0;
  for (const [name, entry] of zip.entries) {
    if (!/\.png$/i.test(name)) continue;
    const buf = zip.readEntry(entry);
    const m = readPngInfo(buf);
    if (!m.valid) {
      rows.push({ source: 'avatar_border', name, valid: false, error: 'PNG hỏng' });
      continue;
    }
    frameCount += 1;
    rows.push({
      source: 'avatar_border', name, valid: true, width: m.width, height: m.height, bitDepth: m.bitDepth, colorType: m.colorType,
      hasTransparency: m.hasTransparency, animated: m.animated, frames: m.frames, loops: m.loops, durationMs: m.durationMs, bytes: buf.length,
    });
  }
  console.log(`[audit] ${frameCount} PNG avatar`);

  if (fs.existsSync(NAMEPLATE_ZIP)) {
    const nzip = openZip([NAMEPLATE_ZIP]);
    let npCount = 0;
    for (const [name, entry] of nzip.entries) {
      if (!/\.webm$/i.test(name)) continue;
      const buf = nzip.readEntry(entry);
      const file = path.join(TMP_DIR, 'probe.webm');
      fs.writeFileSync(file, buf);
      const probe = await probeVideo([], file);
      npCount += 1;
      rows.push({ source: 'nameplate', name, valid: true, width: probe.width, height: probe.height, codec: probe.codec, hasAlpha: probe.hasAlpha, fps: probe.fps, durationMs: probe.durationMs, bytes: buf.length, animated: true, frames: null });
    }
    console.log(`[audit] ${npCount} WebM bảng tên`);
  }

  const frames = rows.filter((r) => r.source === 'avatar_border' && r.valid);
  const animatedFrames = frames.filter((r) => r.animated);
  const staticFrames = frames.filter((r) => !r.animated);
  const nameplates = rows.filter((r) => r.source === 'nameplate');
  const fpsMedian = (vals) => (vals.length ? Math.round(median(vals)) : 0);
  const summary = {
    generatedAt: new Date().toISOString(),
    frameZips: frameZips.length,
    frames: {
      total: frames.length,
      animated: animatedFrames.length,
      static: staticFrames.length,
      sizes: sizeBreakdown(frames.map((f) => `${f.width}x${f.height}`)),
      fps: fpsMedian(animatedFrames.map((f) => (f.frames && f.durationMs ? (f.frames / f.durationMs) * 1000 : 0)).filter(Boolean)),
      framesPerFile: minMax(animatedFrames.map((f) => f.frames).filter(Boolean)),
      bytes: minMaxSum(frames.map((f) => f.bytes)),
      invalid: rows.filter((r) => r.source === 'avatar_border' && !r.valid).length,
    },
    nameplates: {
      total: nameplates.length,
      sizes: sizeBreakdown(nameplates.map((f) => `${f.width}x${f.height}`)),
      fps: fpsMedian(nameplates.map((f) => f.fps).filter(Boolean)),
      durationMs: minMaxSum(nameplates.map((f) => f.durationMs).filter(Boolean)),
      bytes: minMaxSum(nameplates.map((f) => f.bytes)),
      alpha: nameplates.filter((f) => f.hasAlpha).length,
    },
  };
  fs.writeFileSync(AUDIT_JSON_PATH, JSON.stringify({ summary, rows }, null, 2));
  fs.writeFileSync(AUDIT_MD_PATH, renderAuditMd(summary));
  console.log(`[audit] xong → ${path.relative(REPO_ROOT, AUDIT_JSON_PATH)} + ASSET_AUDIT.md`);
  return summary;
}

function sizeBreakdown(vals) {
  const out = new Map();
  for (const v of vals) out.set(v, (out.get(v) || 0) + 1);
  return [...out.entries()].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));
}
function minMax(vals) {
  return { min: Math.min(...vals), max: Math.max(...vals), median: median(vals) };
}
function minMaxSum(vals) {
  return { min: Math.min(...vals), max: Math.max(...vals), median: median(vals), sum: vals.reduce((a, b) => a + b, 0) };
}

function renderAuditMd(s) {
  const lines = [];
  lines.push('# Audit asset trang trí (Nhiệm vụ 10 — Bước 1.1)');
  lines.push('');
  lines.push(`Tạo: ${s.generatedAt} — pipeline: \`scripts/decorations/pipeline.mjs audit\``);
  lines.push('');
  lines.push('## Avatar frame (cosmetics/avatar_border/avatar_1..23.zip — zip chia phần, tự nối)');
  lines.push('');
  lines.push('| Chỉ số | Giá trị |');
  lines.push('|---|---|');
  lines.push(`| Tổng file PNG | ${s.frames.total} |`);
  lines.push(`| Có animation (APNG) | ${s.frames.animated} |`);
  lines.push(`| Tĩnh (PNG thường) | ${s.frames.static} |`);
  lines.push(`| Kích thước | ${s.frames.sizes.slice(0, 5).map((x) => `${x.value} ×${x.count}`).join(', ')} |`);
  lines.push(`| FPS trung vị | ${s.frames.fps} |`);
  lines.push(`| Số frame/file | min ${s.frames.framesPerFile.min} · median ${s.frames.framesPerFile.median} · max ${s.frames.framesPerFile.max} |`);
  lines.push(`| Dung lượng gốc | median ${fmtBytes(s.frames.bytes.median)} · max ${fmtBytes(s.frames.bytes.max)} · tổng ${fmtBytes(s.frames.bytes.sum)} |`);
  lines.push(`| File hỏng | ${s.frames.invalid} |`);
  lines.push('');
  lines.push('## Bảng tên (cosmetics/nameplate.zip)');
  lines.push('');
  lines.push('| Chỉ số | Giá trị |');
  lines.push('|---|---|');
  lines.push(`| Tổng file WebM (VP9) | ${s.nameplates.total} (kèm alpha: ${s.nameplates.alpha}) |`);
  lines.push(`| Kích thước | ${s.nameplates.sizes.slice(0, 4).map((x) => `${x.value} ×${x.count}`).join(', ')} |`);
  lines.push(`| FPS trung vị | ${s.nameplates.fps} |`);
  lines.push(`| Thời lượng | ${s.nameplates.durationMs.min}–${s.nameplates.durationMs.max} ms (trung vị ${s.nameplates.durationMs.median}) |`);
  lines.push(`| Dung lượng | median ${fmtBytes(s.nameplates.bytes.median)} · max ${fmtBytes(s.nameplates.bytes.max)} · tổng ${fmtBytes(s.nameplates.bytes.sum)} |`);
  lines.push('');
  lines.push('## Ghi chú xử lý');
  lines.push('');
  lines.push('- Slug kebab-case không dấu; tên hiển thị tiếng Việt (bảng tay + từ điển).');
  lines.push('- APNG → WebM VP9 alpha 240px (crf 45, retry crf 52 nếu >200KB) + ảnh tĩnh làm fallback.');
  lines.push('- PNG tĩnh → WebP (q80) + PNG palette fallback; preview 128px, tổng 2 file < 100KB.');
  lines.push('- Bảng tên ≤150KB giữ nguyên; lớn hơn thì re-encode 448px crf 37; preview = frame giữa có độ phủ ≥85%.');
  lines.push('- Chi tiết từng file: `asset-audit.json`.');
  lines.push('');
  return lines.join('\n');
}

/* ============================ Bước 1.2: build ============================ */

/*
 * Chọn frame tĩnh "đẹp nhất" cho vòng avatar: điểm = phủ ring − 1.5 × phủ tâm
 * (không che mặt). Dùng frame 0 nếu điểm ≥ 60% điểm cao nhất (tránh sai tông).
 */
async function pickStillFrame(file, info, count, inputArgs) {
  const small = 48;
  const scale = small / Math.max(info.width, info.height);
  const sw = Math.max(8, Math.round(info.width * scale));
  const sh = Math.max(8, Math.round(info.height * scale));
  const { buffer } = await decodeFramesRgba(file, { width: sw, height: sh, inputArgs, maxFrames: count });
  const n = Math.floor(buffer.length / (sw * sh * 4));
  const half = Math.min(sw, sh) / 2;
  const centerR = half * 0.55;
  const cx = sw / 2;
  const cy = sh / 2;
  const scores = [];
  for (let f = 0; f < n; f += 1) {
    let ring = 0;
    let ringN = 0;
    let center = 0;
    let centerN = 0;
    const off = f * sw * sh * 4;
    for (let y = 0; y < sh; y += 1) {
      for (let x = 0; x < sw; x += 1) {
        const i = off + (y * sw + x) * 4;
        const a = buffer[i + 3] / 255;
        if (a < 0.05) continue;
        const dx = x - cx;
        const dy = y - cy;
        if (Math.sqrt(dx * dx + dy * dy) > centerR) {
          ring += a;
          ringN += 1;
        } else {
          center += a;
          centerN += 1;
        }
      }
    }
    scores.push((ringN ? ring / ringN : 0) - 1.5 * (centerN ? center / centerN : 0));
  }
  if (!scores.length) return { index: 0, coverage: 0 };
  let best = 0;
  for (let i = 1; i < scores.length; i += 1) if (scores[i] > scores[best]) best = i;
  const index = scores[0] >= 0.6 * scores[best] ? 0 : best;
  const i = index * sw * sh * 4;
  let alphaSum = 0;
  for (let p = 3; p < sw * sh * 4; p += 4) alphaSum += buffer[i + p];
  return { index, coverage: alphaSum / (sw * sh * 255) };
}

function coverageOfRgba(rgba, w, h) {
  let sum = 0;
  for (let p = 3; p < rgba.length; p += 4) sum += rgba[p];
  return sum / (w * h * 255);
}

async function resizeRgba(rgba, wIn, hIn, wOut, hOut) {
  if (wIn === wOut && hIn === hOut) return Buffer.from(rgba);
  return sharp(Buffer.from(rgba), { raw: { width: wIn, height: hIn, channels: 4 } })
    .resize({ width: wOut, height: hOut, kernel: 'lanczos3' })
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then((r) => r.data);
}

/** Viết preview + full từ buffer RGBA, bảo đảm preview (2 file) < 100KB. */
async function writeStillOutputs(outDir, rgba, w, h, maxFull) {
  const still = ENCODE.still;
  let quality = still.previewQuality;
  for (;;) {
    await sharp(Buffer.from(rgba), { raw: { width: w, height: h, channels: 4 } }).webp({ quality: still.fullQuality, alphaQuality: still.alphaQuality, effort: 6 }).toFile(path.join(outDir, 'full.webp'));
    await sharp(Buffer.from(rgba), { raw: { width: w, height: h, channels: 4 } }).png({ palette: true, colors: still.paletteColors, alphaThreshold: 0, effort: 6 }).toFile(path.join(outDir, 'full.png'));
    await sharp(Buffer.from(rgba), { raw: { width: w, height: h, channels: 4 } }).resize({ width: still.previewWidth, kernel: 'lanczos3' }).webp({ quality, alphaQuality: 88, effort: 6 }).toFile(path.join(outDir, 'preview.webp'));
    await sharp(Buffer.from(rgba), { raw: { width: w, height: h, channels: 4 } }).resize({ width: still.previewWidth, kernel: 'lanczos3' }).png({ palette: true, colors: still.paletteColors, alphaThreshold: 0, effort: 6 }).toFile(path.join(outDir, 'preview.png'));
    const size = fs.statSync(path.join(outDir, 'preview.png')).size + fs.statSync(path.join(outDir, 'preview.webp')).size;
    if (size <= still.previewMaxBytes || quality <= 40) break;
    quality -= 12;
  }
  void maxFull;
}

const buildState = { force: false, only: null, slugs: null, limit: 0 };

async function buildFrame(entryName, buf, zipLabel) {
  const original = path.basename(entryName, path.extname(entryName));
  const slug = slugify(original);
  if (buildState.slugs && !buildState.slugs.includes(slug)) return { skipped: true, reason: 'slug-not-in-filter' };
  const info = readPngInfo(buf);
  if (!info.valid) throw new Error('PNG không đọc được');
  const type = classifyAvatarDecoration(original);
  const naming = proposeDisplayName(original);
  const outDir = path.join(OUT_DIR, 'avatar-frames', slug);
  const expected = info.animated ? ['preview.png', 'preview.webp', 'full.png', 'full.webp', 'animated.webm'] : ['preview.png', 'preview.webp', 'full.png', 'full.webp'];
  if (!buildState.force && expected.every((f) => fs.existsSync(path.join(outDir, f)))) {
    return { skipped: true, reason: 'exists', slug, type, original };
  }
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  let staticFrame;
  let coverage;
  if (info.animated) {
    const clean = stripAncillaryChunks(buf);
    const tmpApng = path.join(TMP_DIR, `${slug}.apng`);
    fs.writeFileSync(tmpApng, clean);
    const fps = (info.frames / Math.max(1, info.durationMs)) * 1000;
    const probe = await decodeFramesRgba(tmpApng, { width: 8, height: 8, inputArgs: ['-f', 'apng'], maxFrames: info.frames + 2 });
    const pick = await pickStillFrame(tmpApng, info, probe.count, ['-f', 'apng']);
    staticFrame = pick.index;
    coverage = pick.coverage;
    const full = await extractFrameRgba(tmpApng, { index: pick.index, width: info.width, height: info.height, inputArgs: ['-f', 'apng'] });
    const scale = Math.min(1, ENCODE.still.fullMax / Math.max(info.width, info.height));
    const fw = Math.round(info.width * scale);
    const fh = Math.round(info.height * scale);
    const scaled = await resizeRgba(full, info.width, info.height, fw, fh);
    await writeStillOutputs(outDir, scaled, fw, fh, ENCODE.still.fullMax);

    let filter = `scale='${ENCODE.frameWebM.scale}':-2:flags=lanczos,format=yuva420p`;
    if (fps > ENCODE.frameWebM.maxInputFps) filter = `fps=30,${filter}`;
    const webmPath = path.join(outDir, 'animated.webm');
    const encArgs = ['-loglevel', 'error', '-y', '-f', 'apng', '-i', tmpApng, '-vf', filter, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', String(ENCODE.frameWebM.crf), '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4', '-auto-alt-ref', '1', '-lag-in-frames', '16', '-an', webmPath];
    await runFfmpeg(encArgs);
    if (fs.statSync(webmPath).size > ENCODE.frameWebM.retryBytes) {
      const crfIdx = encArgs.indexOf('-crf');
      const before = fs.statSync(webmPath).size;
      encArgs[crfIdx + 1] = String(ENCODE.frameWebM.retryCrf);
      await runFfmpeg(encArgs);
      if (fs.statSync(webmPath).size >= before) fs.copyFileSync(webmPath, webmPath);
    }
    fs.rmSync(tmpApng, { force: true });
  } else {
    const meta = await sharp(buf).metadata();
    const raw = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    coverage = coverageOfRgba(raw.data, meta.width, meta.height);
    staticFrame = 0;
    const scale = Math.min(1, ENCODE.still.fullMax / Math.max(meta.width, meta.height));
    const fw = Math.round(meta.width * scale);
    const fh = Math.round(meta.height * scale);
    const scaled = await resizeRgba(raw.data, meta.width, meta.height, fw, fh);
    await writeStillOutputs(outDir, scaled, fw, fh, ENCODE.still.fullMax);
  }

  const files = fs.readdirSync(outDir);
  const outputBytes = files.reduce((sum, f) => sum + fs.statSync(path.join(outDir, f)).size, 0);
  const fps = info.animated ? Math.round(((info.frames / Math.max(1, info.durationMs)) * 1000) * 10) / 10 : 0;
  return {
    slug, type, originalName: original, name: naming.name, nameEn: naming.nameEn, nameSource: naming.nameSource,
    isAnimated: !!info.animated,
    metrics: { bytes: buf.length, coverage, frames: info.animated ? info.frames : 1, fps, width: info.width, height: info.height },
    staticFrame, zipName: zipLabel, files, outputBytes, tags: deriveTags(original, type),
  };
}

async function buildNameplate(entryName, buf, zipLabel) {
  const original = path.basename(entryName, path.extname(entryName));
  const slug = slugify(original);
  if (buildState.slugs && !buildState.slugs.includes(slug)) return { skipped: true, reason: 'slug-not-in-filter' };
  const type = 'nameplate';
  const naming = proposeDisplayName(original);
  const outDir = path.join(OUT_DIR, 'nameplates', slug);
  const expected = ['preview.png', 'preview.webp', 'animated.webm'];
  if (!buildState.force && expected.every((f) => fs.existsSync(path.join(outDir, f)))) {
    return { skipped: true, reason: 'exists', slug, type, original };
  }
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const srcFile = path.join(TMP_DIR, `${slug}.src.webm`);
  fs.writeFileSync(srcFile, buf);
  const probe = await probeVideo([], srcFile);
  if (!probe.width) throw new Error(`Không probe được ${entryName}`);

  const webmPath = path.join(outDir, 'animated.webm');
  if (buf.length <= ENCODE.nameplate.copyMaxBytes) {
    fs.copyFileSync(srcFile, webmPath);
  } else {
    const rePath = path.join(TMP_DIR, `${slug}.re.webm`);
    const scaleW = Math.min(1, ENCODE.nameplate.maxWidth / probe.width);
    const outW = Math.max(2, Math.floor((probe.width * scaleW) / 2) * 2);
    const outH = Math.max(2, Math.floor((probe.height * scaleW) / 2) * 2);
    await runFfmpeg(['-loglevel', 'error', '-y', '-i', srcFile, '-vf', `scale=${outW}:${outH}:flags=lanczos,format=yuva420p`, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', String(ENCODE.nameplate.crf), '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4', '-auto-alt-ref', '0', '-lag-in-frames', '8', '-an', rePath]);
    fs.copyFileSync(fs.statSync(rePath).size < buf.length ? rePath : srcFile, webmPath);
    fs.rmSync(rePath, { force: true });
  }

  const smallW = 112;
  const smallH = Math.max(2, Math.round(((probe.height / probe.width) * smallW) / 2) * 2);
  const count = Math.max(1, Math.round((probe.durationMs / 1000) * (probe.fps || 12)));
  const decoded = await decodeFramesRgba(srcFile, { width: smallW, height: smallH, maxFrames: count });
  const coverages = [];
  for (let f = 0; f < decoded.count; f += 1) {
    coverages.push(coverageOfRgba(decoded.buffer.subarray(f * decoded.frameBytes, (f + 1) * decoded.frameBytes), smallW, smallH));
  }
  const maxC = Math.max(0.0001, ...coverages);
  let pickIndex = Math.floor(decoded.count / 2);
  for (let f = 0; f < decoded.count; f += 1) {
    if (coverages[f] >= 0.85 * maxC && Math.abs(f - decoded.count / 2) < Math.abs(pickIndex - decoded.count / 2)) pickIndex = f;
  }
  const fw = ENCODE.nameplate.previewWidth;
  const fh = Math.max(2, Math.round((probe.height / probe.width) * fw / 2) * 2);
  const full = await extractFrameRgba(srcFile, { index: pickIndex, width: fw, height: fh });
  const still = ENCODE.nameplate;
  let quality = still.previewQuality;
  for (;;) {
    await sharp(Buffer.from(full), { raw: { width: fw, height: fh, channels: 4 } }).webp({ quality, alphaQuality: 88, effort: 6 }).toFile(path.join(outDir, 'preview.webp'));
    await sharp(Buffer.from(full), { raw: { width: fw, height: fh, channels: 4 } }).png({ palette: true, colors: ENCODE.still.paletteColors, alphaThreshold: 0, effort: 6 }).toFile(path.join(outDir, 'preview.png'));
    const size = fs.statSync(path.join(outDir, 'preview.png')).size + fs.statSync(path.join(outDir, 'preview.webp')).size;
    if (size <= still.previewMaxBytes || quality <= 40) break;
    quality -= 12;
  }
  fs.rmSync(srcFile, { force: true });

  const files = fs.readdirSync(outDir);
  const outputBytes = files.reduce((sum, f) => sum + fs.statSync(path.join(outDir, f)).size, 0);
  return {
    slug, type, originalName: original, name: naming.name, nameEn: naming.nameEn, nameSource: naming.nameSource,
    isAnimated: true,
    metrics: { bytes: buf.length, duration: probe.durationMs, bps: probe.durationMs ? (buf.length * 8) / (probe.durationMs / 1000) : 0, resolution: probe.width * probe.height, width: probe.width, height: probe.height },
    staticFrame: pickIndex, zipName: zipLabel, files, outputBytes, tags: deriveTags(original, 'nameplate'),
  };
}

async function runBuild(args) {
  ensureDirs();
  requireFfmpeg();
  buildState.force = args.force;
  buildState.only = args.only;
  buildState.slugs = args.slugs;
  buildState.limit = args.limit;
  if (args.reset) {
    for (const sub of ['avatar-frames', 'nameplates']) fs.rmSync(path.join(OUT_DIR, sub), { recursive: true, force: true });
    fs.rmSync(CATALOG_PATH, { force: true });
    console.log('[build] --reset: đã xoá output cũ');
  }

  const frameZipPaths = collectFrameZips();
  const zip = openZip(frameZipPaths);
  const tasks = [];
  for (const [name, entry] of zip.entries) {
    if (!/\.png$/i.test(name)) continue;
    if (args.only && path.basename(name) !== args.only) continue;
    tasks.push({ kind: 'frame', name, entry, zipName: `avatar_border (${frameZipPaths.length} phần zip)` });
  }
  let nameplateZip = null;
  if (fs.existsSync(NAMEPLATE_ZIP)) {
    nameplateZip = openZip([NAMEPLATE_ZIP]);
    for (const [name, entry] of nameplateZip.entries) {
      if (!/\.webm$/i.test(name)) continue;
      if (args.only && path.basename(name) !== args.only) continue;
      tasks.push({ kind: 'nameplate', name, entry, zipName: 'nameplate.zip' });
    }
  }
  if (args.slugs) {
    for (let i = tasks.length - 1; i >= 0; i -= 1) {
      const slug = slugify(path.basename(tasks[i].name, path.extname(tasks[i].name)));
      if (!args.slugs.includes(slug)) tasks.splice(i, 1);
    }
  }
  if (args.limit > 0) tasks.length = Math.min(tasks.length, args.limit);
  console.log(`[build] ${tasks.length} item cần xử lý (concurrency ${args.concurrency})`);
  if (!tasks.length) return { processed: 0, skipped: 0, errors: [], records: [] };

  const results = [];
  const errors = [];
  let done = 0;
  await withConcurrency(tasks, args.concurrency, async (task) => {
    const buf = task.kind === 'frame' ? zip.readEntry(task.entry) : nameplateZip.readEntry(task.entry);
    try {
      const res = task.kind === 'frame' ? await buildFrame(task.name, buf, task.zipName) : await buildNameplate(task.name, buf, task.zipName);
      results.push(res);
    } catch (error) {
      errors.push({ item: task.name, error: String(error && error.message ? error.message : error) });
    }
    done += 1;
    if (done % 25 === 0 || done === tasks.length) process.stdout.write(`\r[build] ${done}/${tasks.length}`.padEnd(60));
  });
  console.log('');
  const skipped = results.filter((r) => r.skipped).length;
  const processed = results.length - skipped;
  console.log(`[build] xong: ${processed} item dựng mới, ${skipped} bỏ qua (đã có), ${errors.length} lỗi`);
  if (errors.length) {
    console.log('[build] lỗi chi tiết:');
    for (const e of errors.slice(0, 20)) console.log(`  - ${e.item}: ${e.error.slice(0, 160)}`);
  }
  return { processed, skipped, errors, records: results.filter((r) => !r.skipped) };
}

/* ============================ Bước 1.3: catalog ============================ */

function loadExistingCatalog() {
  try {
    return JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function scanOutputDir(subdir, type) {
  const dir = path.join(OUT_DIR, subdir);
  if (!fs.existsSync(dir)) return [];
  const records = [];
  for (const slug of fs.readdirSync(dir)) {
    const itemDir = path.join(dir, slug);
    if (!fs.statSync(itemDir).isDirectory()) continue;
    const files = fs.readdirSync(itemDir);
    records.push({
      slug, type, originalName: slug, name: null, isAnimated: files.includes('animated.webm'),
      metrics: { bytes: 0, coverage: undefined, frames: 0, bps: 0, duration: 0, resolution: 0 },
      staticFrame: 0, zipName: subdir === 'avatar-frames' ? 'avatar_border-zips' : 'nameplate.zip', files,
      outputBytes: files.reduce((sum, f) => sum + fs.statSync(path.join(itemDir, f)).size, 0),
      tags: [],
    });
  }
  return records;
}

function runCatalog(buildRecords) {
  ensureDirs();
  const existing = loadExistingCatalog();
  const byId = new Map((existing?.items || []).map((it) => [it.id, it]));

  let records = (buildRecords || []).filter((r) => !r.skipped);
  if (!records.length) records = scanOutputDir('avatar-frames', 'frame').concat(scanOutputDir('nameplates', 'nameplate'));
  for (const record of records) {
    if (record.type === 'frame') record.type = 'avatar_frame';
  }

  /* Xếp độ hiếm theo nhóm (frame/aura và nameplate tính điểm khác nhau). */
  const frames = records.filter((r) => r.type === 'avatar_frame' || r.type === 'avatar_aura');
  const nameplates = records.filter((r) => r.type === 'nameplate');
  assignRarities(frames, { bytes: 0.45, coverage: 0.3, frames: 0.25 });
  assignRarities(nameplates, { bps: 0.5, duration: 0.3, resolution: 0.2 });

  const items = [];
  const addedAtNow = vnNowIso();
  for (const record of records) {
    const id = `${record.type === 'nameplate' ? 'nameplate' : 'frame'}-${record.slug}`;
    const { price, originalPriceNote } = priceFor(record.type, record.rarity);
    const prev = byId.get(id);
    const isFrameOrAura = record.type !== 'nameplate';
    const basePath = `/assets/decorations/${record.type === 'nameplate' ? 'nameplates' : 'avatar-frames'}/${record.slug}`;
    const hasWebm = record.isAnimated && (record.files ? record.files.includes('animated.webm') : fs.existsSync(path.join(OUT_DIR, record.type === 'nameplate' ? 'nameplates' : 'avatar-frames', record.slug, 'animated.webm')));
    items.push({
      id,
      slug: record.slug,
      name: record.name || prev?.name || record.originalName,
      nameEn: record.nameEn || prev?.nameEn || record.originalName,
      originalName: record.originalName,
      type: record.type,
      rarity: record.rarity,
      assetPath: {
        preview: `${basePath}/preview.webp`,
        previewPng: `${basePath}/preview.png`,
        full: isFrameOrAura ? `${basePath}/full.png` : `${basePath}/preview.png`,
        fullWebp: isFrameOrAura ? `${basePath}/full.webp` : `${basePath}/preview.webp`,
        animated: hasWebm ? `${basePath}/animated.webm` : null,
      },
      description: record.description || prev?.description || describe({ type: record.type, isAnimated: !!record.isAnimated, tags: record.tags || [], nameEn: record.nameEn }),
      price,
      originalPriceNote,
      isAnimated: !!record.isAnimated,
      tags: record.tags || prev?.tags || [],
      isActive: prev?.isActive ?? true,
      reviewStatus: prev?.reviewStatus || 'auto',
      nameSource: record.nameSource || prev?.nameSource || 'auto-vi',
      addedAt: prev?.addedAt || addedAtNow,
      source: {
        zip: record.zipName || 'unknown',
        coverage: record.metrics?.coverage !== undefined ? Math.round(record.metrics.coverage * 1000) / 1000 : undefined,
        staticFrame: record.staticFrame,
        rarityScore: record.rarityScore,
      },
      outputBytes: record.outputBytes,
    });
  }

  items.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name, 'vi') : a.type.localeCompare(b.type)));

  const byType = {};
  const byRarity = {};
  let totalOutputBytes = 0;
  for (const it of items) {
    byType[it.type] = (byType[it.type] || 0) + 1;
    byRarity[it.rarity] = (byRarity[it.rarity] || 0) + 1;
    totalOutputBytes += it.outputBytes || 0;
  }

  const catalog = {
    version: 1,
    generatedAt: new Date().toISOString(),
    generator: 'scripts/decorations/pipeline.mjs (Nhiệm vụ 10)',
    note: 'Catalog trang trí Discord import — người dùng xem lại tên/độ hiếm/giá trước khi bật. ID: frame-*/nameplate-* (tiền tố để khỏi đụng ID 35 item SVG cũ).',
    pricing: {
      rule: 'VND mẫu × 4100/79000 (tỉ lệ 79.000đ → 4.100 Coin), làm tròn lên bội 50',
      coinPerVnd: Math.round(COIN_PER_VND * 1e6) / 1e6,
      referenceVnd: REFERENCE_VND,
      coins: Object.fromEntries(Object.entries(REFERENCE_VND).map(([t, tbl]) => [t, Object.fromEntries(Object.entries(tbl).map(([r, v]) => [r, vndToCoin(v)]))])),
      rarityRule: 'Phân vị: top 10% mythic · 25% epic · 35% rare · còn lại common; ảnh tĩnh → common. Điểm: frame 0.45·dung lượng + 0.30·độ phủ + 0.25·số frame; nameplate 0.5·bitrate + 0.3·thời lượng + 0.2·độ phân giải.',
    },
    counts: { total: items.length, byType, byRarity, totalOutputBytes },
    items,
  };
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
  console.log(`[catalog] ${items.length} item → ${path.relative(REPO_ROOT, CATALOG_PATH)}`);
  console.log(`[catalog] theo loại: ${JSON.stringify(byType)} · theo hiếm: ${JSON.stringify(byRarity)}`);
  console.log(`[catalog] tổng dung lượng output: ${fmtBytes(totalOutputBytes)}`);
  return catalog;
}

/* ============================ main ============================ */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.command || !['audit', 'build', 'catalog', 'all'].includes(args.command)) {
    console.log('Dùng: pipeline.mjs <audit|build|catalog|all> [--force] [--only=X] [--slugs=a,b] [--limit=N] [--concurrency=N] [--reset]');
    process.exit(1);
  }
  if (args.reset) fs.rmSync(TMP_DIR, { recursive: true, force: true });

  let buildRecords = null;
  if (args.command === 'audit' || args.command === 'all') await runAudit();
  if (args.command === 'build' || args.command === 'all') {
    const res = await runBuild(args);
    buildRecords = res.records;
    const isFullBuild = !args.only && !args.slugs && !args.limit;
    if (args.command === 'build' && isFullBuild) runCatalog(buildRecords);
  }
  if (args.command === 'catalog') runCatalog(null);
  if (args.command === 'all') runCatalog(buildRecords || []);
  console.log('[pipeline] hoàn tất.');
}

main().catch((error) => {
  console.error('PIPELINE LỖI:', error);
  process.exit(1);
});
