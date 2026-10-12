/* Bản quyền trí tuệ thuộc về BroAmStuck */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fforum-adaptive-'));
process.env.FFORUM_DATA_DIR = DATA_DIR;
const TEST_ADMIN_PASSWORD = 'adaptive-admin-password-2026';
process.env.FFORUM_ADMIN_PASSWORD = TEST_ADMIN_PASSWORD;

const {
  classifyDeviceProfile,
  getCapabilitiesForTier,
  animationBudget,
  computeSSIM,
  computePerceptualHash,
  evaluateOptimizationABTest,
} = await import('../src/utils/adaptiveQuality.ts');
const {
  createParticleBuffer,
  stepParticleBuffer,
  PARTICLE_STRIDE,
} = await import('../src/utils/particlePhysicsWorker.ts');
const { buildAdaptiveVideoSources } = await import('../src/utils/decorations.ts');
const { MULTI_QUALITY_WEBM_PROFILES } = await import('../scripts/decorations/lib/ffmpeg.mjs');
const {
  MultiLayerCache,
  ReadWriteDataPlane,
  IsolatedServiceAndQueue,
} = await import('../server/adaptiveScale.ts');
const {
  enqueueOfflineAction,
  flushOfflineQueue,
  readOfflineQueue,
} = await import('../src/utils/backgroundSyncQueue.ts');
const { setupForumServer, resetRateLimitersForTest, flushPendingSave } = await import('../server/forumServer.ts');

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('1. Device Capability Detection & 3-Tier Classification (Tier A / B / C) + Self-Priority Animation Budget', () => {
  const highEnd = classifyDeviceProfile({
    memory: 16,
    cores: 12,
    connection: '4g',
    downlinkMbps: 45,
    rttMs: 20,
    saveData: false,
    gpu: { tier: 3, renderer: 'ANGLE (NVIDIA GeForce RTX 4080)', webgl: true, webgl2: true, isSoftware: false, estimatedFps: 120 },
    screenSize: 2560 * 1440,
    devicePixelRatio: 2,
    prefersReducedMotion: false,
  });
  assert.equal(highEnd.tier, 'tier-a');
  assert.equal(highEnd.capabilities.videoQuality, '4k');
  assert.equal(highEnd.capabilities.particleScale, 1.0);

  const midRange = classifyDeviceProfile({
    memory: 6,
    cores: 6,
    connection: '4g',
    downlinkMbps: 15,
    rttMs: 45,
    saveData: false,
    gpu: { tier: 2, renderer: 'Intel(R) UHD Graphics 630', webgl: true, webgl2: true, isSoftware: false, estimatedFps: 58 },
    screenSize: 1920 * 1080,
    devicePixelRatio: 1,
    prefersReducedMotion: false,
  });
  assert.equal(midRange.tier, 'tier-b');
  assert.equal(midRange.capabilities.videoQuality, 'hd');
  assert.equal(midRange.capabilities.particleScale, 0.65);

  const lowEnd = classifyDeviceProfile({
    memory: 2,
    cores: 2,
    connection: '3g',
    downlinkMbps: 1.1,
    rttMs: 180,
    saveData: true,
    gpu: { tier: 1, renderer: 'Mali-400 MP', webgl: true, webgl2: false, isSoftware: false, estimatedFps: 28 },
    screenSize: 1280 * 720,
    devicePixelRatio: 1,
    prefersReducedMotion: false,
  });
  assert.equal(lowEnd.tier, 'tier-c');
  assert.equal(lowEnd.capabilities.videoQuality, 'sd', 'Tier C vẫn phát video SD chứ không cắt bỏ tính năng');
  assert.ok(lowEnd.capabilities.particleScale > 0, 'Tier C vẫn hiển thị particle');

  /* Ngân sách concurrent animation ở Tier C: ưu tiên tuyệt đối chính user */
  animationBudget.resetForTest();
  animationBudget.setMaxConcurrentOther(getCapabilitiesForTier('tier-c').maxConcurrentOtherAnimations);
  for (let i = 0; i < 6; i += 1) {
    assert.equal(animationBudget.acquire(`other-${i}`, false), true, `slot phụ #${i} được cấp`);
  }
  assert.equal(animationBudget.acquire('other-overflow', false), false, 'vượt 6 video phụ ở Tier C → dùng HQ keyframe');
  assert.equal(animationBudget.acquire('my-own-avatar', true), true, 'trang trí của CHÍNH USER luôn được chạy animation 100%');
  animationBudget.resetForTest();
});

test('2. GPU-Safe Animation Audit: 0 @keyframes gây Layout Reflow trong toàn bộ src/**/*.css + will-change có chủ đích', () => {
  const walkCss = (dir) => {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walkCss(p));
      else if (p.endsWith('.css')) out.push(p);
    }
    return out;
  };

  const violations = [];
  for (const file of walkCss(path.join(ROOT, 'src'))) {
    const src = fs.readFileSync(file, 'utf8');
    const re = /@keyframes\s+([\w-]+)\s*\{([\s\S]*?\})\s*\}/g;
    let m;
    while ((m = re.exec(src))) {
      const body = m[2];
      if (/\b(width|height|top|left|right|bottom|margin|margin-top|padding|box-shadow)\s*:/i.test(body)) {
        violations.push(`${path.relative(ROOT, file)}:${m[1]}`);
      }
    }
  }
  assert.deepEqual(violations, [], 'Mọi @keyframes chỉ được phép dùng GPU compositor (transform/opacity)');

  const decoCss = read('src/components/decorations/decorations.css');
  assert.match(decoCss, /\.decoration-mythic[\s\S]{0,120}will-change:\s*transform,\s*opacity/);
  assert.match(decoCss, /will-change:\s*auto/);
});

test('3. Adaptive Media Delivery: Multi-quality Video (4K/HD/SD), Priority Hints, LQIP & Resource Hints', () => {
  const sources = buildAdaptiveVideoSources('/assets/decorations/avatar-frames/cyber-katana/animated.webm', 'tier-a');
  assert.ok(sources);
  assert.equal(sources.sources.length, 3);
  assert.deepEqual(sources.sources.map((s) => s.quality), ['4k', 'hd', 'sd']);
  assert.equal(sources.sources[0].media, '(min-width: 1200px)');
  assert.equal(sources.sources[1].media, '(min-width: 600px)');

  assert.ok(MULTI_QUALITY_WEBM_PROFILES['4k']);
  assert.ok(MULTI_QUALITY_WEBM_PROFILES.hd);
  assert.ok(MULTI_QUALITY_WEBM_PROFILES.sd);

  const decoMedia = read('src/components/decorations/DecorationMedia.tsx');
  assert.match(decoMedia, /fetchPriority=\{fetchPriorityAttr\}/);
  assert.match(decoMedia, /<source/);

  const html = read('index.html');
  assert.match(html, /rel="preconnect"/);
  assert.match(html, /rel="dns-prefetch"/);
  assert.match(html, /rel="preload"[^>]+as="font"/);
  assert.match(html, /rel="prefetch"/);
});

test('4. Canvas/WebGL + Offscreen Worker Particle System: Float32Array physics & 1-canvas batching', () => {
  const buf = createParticleBuffer({ count: 32, width: 800, height: 600, seed: 7, mode: 'confetti' });
  assert.equal(buf.length, 32 * PARTICLE_STRIDE);
  const alive = stepParticleBuffer(buf, 16, 800, 600, 'confetti');
  assert.equal(alive, 32);

  const canvasSrc = read('src/components/effects/GpuParticleCanvas.tsx');
  assert.match(canvasSrc, /gl\.drawArrays\(gl\.POINTS,\s*0,\s*count\)/, 'vẽ toàn bộ hạt trong 1 draw call WebGL');
  assert.match(read('src/components/CelebrationBurst.tsx'), /<GpuParticleCanvas/);
});

test('5. Multi-layer Cache (Smart Invalidation), Read Replicas, Sharding, Microservice & Background Sync', async () => {
  const cache = new MultiLayerCache(100);
  const plane = new ReadWriteDataPlane();
  const svc = new IsolatedServiceAndQueue();

  let dbCalls = 0;
  const first = await cache.getOrLoad('profile:alice@fpt.edu.vn', () => {
    dbCalls += 1;
    return { name: 'Alice', coin: 500 };
  }, { tags: ['profile:alice@fpt.edu.vn'] });
  assert.equal(first.layer, 'DB');

  const second = await cache.getOrLoad('profile:alice@fpt.edu.vn', () => {
    dbCalls += 1;
    return { name: 'Alice', coin: 500 };
  });
  assert.equal(second.layer, 'L1');
  assert.equal(dbCalls, 1);

  await cache.getOrLoad('shop:catalog', () => ({ total: 873 }), { tags: ['shop:catalog'] });
  /* Smart invalidation: chỉ xoá đúng profile của Alice, giữ nguyên shop:catalog */
  plane.executeWrite(cache, ['profile:alice@fpt.edu.vn'], () => true);
  const catalogAfter = await cache.getOrLoad('shop:catalog', () => ({ total: 0 }));
  assert.equal(catalogAfter.layer, 'L1', 'shop:catalog không bị xoá oan khi Alice đổi hồ sơ');
  assert.equal(catalogAfter.value.total, 873);

  const shard = plane.resolveUserShard('alice@fpt.edu.vn');
  assert.match(shard.shardId, /^shard-0[0-7]$/);

  const msOut = svc.runInShopGachaService(() => 'gacha-ok');
  assert.equal(msOut.service, 'shop-gacha-ms');

  /* Offline Background Sync Queue */
  enqueueOfflineAction('/api/shop/wishlist', { itemId: 'frame-air' });
  assert.ok(readOfflineQueue().length >= 1);
  const flushed = await flushOfflineQueue(async () => ({ status: 200, data: { success: true } }));
  assert.ok(flushed.sent >= 1);
  assert.equal(flushed.remaining, 0);
});

test('6. SSIM Quality Gate (SSIM ≥ 0.95) & Admin Performance by Device Tier API + Docs', async () => {
  const w = 16;
  const h = 16;
  const ref = new Uint8Array(w * h * 4);
  const near = new Uint8Array(w * h * 4);
  const degraded = new Uint8Array(w * h * 4);
  for (let i = 0; i < ref.length; i += 4) {
    ref[i] = 180; ref[i + 1] = 140; ref[i + 2] = 90; ref[i + 3] = 255;
    near[i] = 179; near[i + 1] = 139; near[i + 2] = 90; near[i + 3] = 255;
    degraded[i] = (i * 17) % 255; degraded[i + 1] = 10; degraded[i + 2] = 240; degraded[i + 3] = 255;
  }
  const ssimHigh = computeSSIM(ref, near, w, h);
  const ssimLow = computeSSIM(ref, degraded, w, h);
  assert.ok(ssimHigh > 0.99, `SSIM gần giống phải > 0.99 (đo được ${ssimHigh})`);
  assert.ok(ssimLow < 0.5, `SSIM ảnh hỏng phải thấp (đo được ${ssimLow})`);
  assert.equal(computePerceptualHash(ref, w, h).length, 16);

  const approved = evaluateOptimizationABTest(
    { lcpMs: 1800, fidMs: 30, memoryMb: 150, fps: 48, ssim: 1, engagementRate: 0.62 },
    { lcpMs: 1150, fidMs: 18, memoryMb: 110, fps: 60, ssim: 0.978, engagementRate: 0.64 },
  );
  assert.equal(approved.approved, true);

  const rejected = evaluateOptimizationABTest(
    { lcpMs: 1800, fidMs: 30, memoryMb: 150, fps: 48, ssim: 1, engagementRate: 0.62 },
    { lcpMs: 1100, fidMs: 18, memoryMb: 100, fps: 60, ssim: 0.89, engagementRate: 0.64 },
  );
  assert.equal(rejected.approved, false, 'SSIM < 0.95 phải bị từ chối');

  /* Kiểm thử trực tiếp endpoint RUM & Admin Performance Tiers */
  resetRateLimitersForTest();
  const middlewares = [];
  const server = http.createServer((req, res) => {
    let idx = 0;
    const next = () => (idx < middlewares.length ? middlewares[idx++](req, res, next) : (res.statusCode = 404, res.end()));
    next();
  });
  setupForumServer(server, { use(fn) { middlewares.push(fn); } });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    const rumRes = await fetch(`${baseUrl}/api/analytics/performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: 'tier-c', lcpMs: 1520, fidMs: 32, fps: 49, memoryMb: 74, ssimScore: 0.968 }),
    });
    assert.equal(rumRes.status, 200);

    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'broamstuck@gmail.com', password: TEST_ADMIN_PASSWORD }),
    });
    const loginData = await loginRes.json();
    assert.equal(loginRes.status, 200);

    const perfRes = await fetch(`${baseUrl}/api/admin/performance-tiers`, {
      headers: { Authorization: `Bearer ${loginData.token}` },
    });
    const perfData = await perfRes.json();
    assert.equal(perfRes.status, 200);
    assert.equal(perfData.tiers['tier-a'].featureParityPercent, 100);
    assert.equal(perfData.tiers['tier-b'].featureParityPercent, 100);
    assert.equal(perfData.tiers['tier-c'].featureParityPercent, 100);
    assert.ok(perfData.abQualityExperiments.every((e) => e.ssimScore >= 0.95));

    const edgeRes1 = await fetch(`${baseUrl}/api/edge/catalog`);
    assert.equal(edgeRes1.status, 200);
    const etag = edgeRes1.headers.get('etag');
    assert.ok(etag);
    const edgeRes2 = await fetch(`${baseUrl}/api/edge/catalog`, { headers: { 'If-None-Match': etag } });
    assert.equal(edgeRes2.status, 304, 'Edge Cache trả 304 khi ETag khớp');
  } finally {
    flushPendingSave();
    await new Promise((r) => server.close(r));
  }

  assert.ok(fs.existsSync(path.join(ROOT, 'docs/ADAPTIVE_QUALITY_ARCHITECTURE.md')));
  assert.ok(fs.existsSync(path.join(ROOT, 'public/sw.js')));
});
