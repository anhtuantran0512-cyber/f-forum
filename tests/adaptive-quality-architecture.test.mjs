/* Bản quyền trí tuệ thuộc về BroAmStuck */
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fforum-adaptive-'));
process.env.FFORUM_DATA_DIR = DATA_DIR;
const TEST_ADMIN_PASSWORD = crypto.randomBytes(32).toString('base64url');
process.env.FFORUM_ADMIN_PASSWORD = TEST_ADMIN_PASSWORD;

const {
  classifyDeviceProfile,
  getCapabilitiesForTier,
  DEFAULT_DEVICE_PROFILE,
  animationBudget,
  computeSSIM,
  computePerceptualHash,
  evaluateOptimizationABTest,
} = await import('../src/utils/adaptiveQuality.ts');
const { createParticleBuffer, stepParticleBuffer, PARTICLE_STRIDE } = await import('../src/utils/particlePhysicsWorker.ts');
const { resolveDecorationVideoSource } = await import('../src/utils/decorations.ts');
const {
  AdaptivePerformanceMonitor,
  MultiLayerCache,
  ProcessLocalDataAccess,
  ProcessLocalTaskScheduler,
} = await import('../server/adaptiveScale.ts');
const { enqueueOfflineAction, flushOfflineQueue, readOfflineQueue } = await import('../src/utils/backgroundSyncQueue.ts');
const { setupForumServer, resetRateLimitersForTest, flushPendingSave } = await import('../server/forumServer.ts');

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const sampleProfile = (overrides = {}) => ({
  memory: 16,
  cores: 12,
  connection: '4g',
  downlinkMbps: 45,
  rttMs: 20,
  saveData: false,
  gpu: { tier: 3, renderer: 'ANGLE (NVIDIA GeForce RTX 4080)', webgl: true, webgl2: true, isSoftware: false },
  screenSize: 2560 * 1440,
  devicePixelRatio: 2,
  prefersReducedMotion: false,
  ...overrides,
});

test('1. Device tiers are conservative, observable hints—not a benchmark or video-resolution promise', () => {
  const highEnd = classifyDeviceProfile(sampleProfile());
  assert.equal(highEnd.tier, 'tier-a');
  assert.equal(highEnd.capabilities.particleScale, 1);

  const midRange = classifyDeviceProfile(sampleProfile({
    memory: 6,
    cores: 6,
    gpu: { tier: 2, renderer: 'Intel(R) UHD Graphics 630', webgl: true, webgl2: true, isSoftware: false },
  }));
  assert.equal(midRange.tier, 'tier-b');
  assert.equal(midRange.capabilities.particleScale, 0.65);

  const lowEnd = classifyDeviceProfile(sampleProfile({
    memory: 2,
    cores: 2,
    connection: '3g',
    downlinkMbps: 1.1,
    saveData: true,
    gpu: { tier: 1, renderer: 'Mali-400 MP', webgl: true, webgl2: false, isSoftware: false },
  }));
  assert.equal(lowEnd.tier, 'tier-c');
  assert.equal(lowEnd.capabilities.particleScale, 0.35);
  assert.equal('videoQuality' in lowEnd.capabilities, false);

  const unknown = classifyDeviceProfile(DEFAULT_DEVICE_PROFILE);
  assert.equal(unknown.tier, 'tier-b', 'unavailable hints use the balanced fallback');
  assert.ok(unknown.reasons.some((reason) => reason.includes('device memory')));
  assert.equal(DEFAULT_DEVICE_PROFILE.memory, null);
  assert.equal(DEFAULT_DEVICE_PROFILE.connection, 'unknown');

  animationBudget.resetForTest();
  animationBudget.setMaxConcurrentOther(getCapabilitiesForTier('tier-c').maxConcurrentOtherAnimations);
  for (let i = 0; i < 6; i += 1) assert.equal(animationBudget.acquire(`other-${i}`, false), true);
  assert.equal(animationBudget.acquire('other-overflow', false), false);
  assert.equal(animationBudget.acquire('my-own-avatar', true), true);
  animationBudget.release('other-0');
  assert.equal(animationBudget.hasSlot('other-overflow'), true, 'a queued avatar receives the next freed slot');
  animationBudget.resetForTest();
});

test('2. GPU-safe motion and shared viewport observers remain covered', () => {
  const cssFiles = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (file.endsWith('.css')) cssFiles.push(file);
    }
  };
  visit(path.join(ROOT, 'src'));
  const violations = [];
  for (const file of cssFiles) {
    const css = fs.readFileSync(file, 'utf8');
    const re = /@keyframes\s+([\w-]+)\s*\{([\s\S]*?\})\s*\}/g;
    let match;
    while ((match = re.exec(css))) {
      if (/\b(width|height|top|left|right|bottom|margin|padding|box-shadow)\s*:/i.test(match[2])) {
        violations.push(`${path.relative(ROOT, file)}:${match[1]}`);
      }
    }
  }
  assert.deepEqual(violations, []);
  assert.match(read('src/components/decorations/useDecorationMedia.ts'), /typeof IntersectionObserver === 'undefined'/);
  assert.match(read('src/components/decorations/useDecorationMedia.ts'), /useSyncExternalStore/);
  assert.match(read('src/styles/forumDesignSystem.css'), /html\.reduce-motion \.ff-global-cursor/);
});

test('3. Decoration videos keep the real URL, use native streaming, and defer offscreen work', () => {
  const original = '/assets/decorations/avatar-frames/cyber-katana/animated.webm';
  assert.deepEqual(resolveDecorationVideoSource(original), { src: original, type: 'video/webm' });
  assert.equal(resolveDecorationVideoSource(null), null);

  const media = read('src/components/decorations/DecorationMedia.tsx');
  const store = read('src/utils/decorationStore.ts');
  const avatar = read('src/components/decorations/AvatarWithDecoration.tsx');
  const navbar = read('src/components/Navbar.tsx');
  const boomerang = read('src/components/BoomerangVideoBg.tsx');
  assert.match(media, /preload=\{isOwnPriority \? 'metadata' : 'none'\}/);
  assert.match(media, /useActiveInViewport\(hostRef, baseCanAnimate\)/);
  assert.match(media, /animationBudget\.acquire\(instanceId, isOwnPriority\)/);
  assert.doesNotMatch(media, /buildAdaptiveVideoSources|useCachedAsset|URL\.createObjectURL|fetch\(|tier=4k|tier=hd|tier=sd|<source/);
  assert.doesNotMatch(store, /loadCachedAsset|useCachedAsset|blobCache|URL\.createObjectURL|setInterval\(/);
  assert.match(avatar, /preload=\{!isActive \? 'none' : reducedMotion \? 'metadata' : priority === 'high' \? 'metadata' : 'none'\}/);
  assert.doesNotMatch(navbar, /preloadDecorations/);
  assert.match(boomerang, /!reducedMotion && !saveData/);
  assert.match(boomerang, /preload=\{videoInViewport \? 'metadata' : 'none'\}/);

  const html = read('index.html');
  assert.match(html, /rel="preconnect"/);
  assert.match(html, /rel="dns-prefetch"/);
  assert.match(html, /rel="preload"[^>]+as="font"/);
  assert.match(html, /rel="prefetch"/);
});

test('3b. Optional browser RUM omits unsupported values and never invents a tier metric', () => {
  const context = read('src/context/AdaptiveQualityContext.tsx');
  assert.match(context, /createObserver\('largest-contentful-paint'/);
  assert.match(context, /createObserver\('first-input'/);
  assert.match(context, /credentials: 'omit'/);
  assert.doesNotMatch(context, /fidMs:|fps:|ssimScore:|profile\.memory \*|effectiveTier === 'tier-a' \?/);
  assert.match(context, /observer\.takeRecords\(\)/);

  const quality = read('src/utils/adaptiveQuality.ts');
  assert.match(quality, /nav\.deviceMemory[\s\S]{0,140}: null/);
  assert.match(quality, /nav\.hardwareConcurrency[\s\S]{0,140}: null/);
  assert.doesNotMatch(quality, /measureFps|effectiveType \|\| '4g'|deviceMemory \|\| 4/);

  const dashboard = read('src/components/admin/PerformanceTiersDashboard.tsx');
  assert.match(dashboard, /Chưa có mẫu/);
  assert.match(dashboard, /chưa được xác minh độc lập/);
  assert.doesNotMatch(dashboard, /featureParityPercent|avgFps|avgSsim|Read Replicas & Sharding|Microservices & Message Queue|4K|4k/);
});

test('3c. RUM aggregation accepts only finite observed fields and has no seeded buckets', () => {
  const monitor = new AdaptivePerformanceMonitor();
  let report = monitor.getTierReport();
  assert.equal(report['tier-a'].reports, 0);
  assert.equal(report['tier-a'].metrics.lcpMs.average, null);
  assert.equal(monitor.recordSample({ tier: 'tier-a', fps: 60, ssimScore: 0.99 }), null);
  assert.equal(monitor.recordSample({ tier: 'tier-c', lcpMs: 1520, firstInputDelayMs: 0, activeAnimations: 0 }), 'tier-c');
  assert.equal(monitor.recordSample({ tier: 'tier-b', lcpMs: Number.POSITIVE_INFINITY }), null);
  report = monitor.getTierReport();
  assert.equal(report['tier-a'].reports, 0);
  assert.equal(report['tier-c'].reports, 1);
  assert.deepEqual(report['tier-c'].metrics.lcpMs, { samples: 1, average: 1520 });
  assert.deepEqual(report['tier-c'].metrics.firstInputDelayMs, { samples: 1, average: 0 });
  assert.deepEqual(report['tier-c'].metrics.jsHeapMb, { samples: 0, average: null });
  assert.deepEqual(report['tier-c'].metrics.activeAnimations, { samples: 1, average: 0 });
});

test('4. Particle buffers and single-canvas rendering stay functional', () => {
  const buffer = createParticleBuffer({ count: 32, width: 800, height: 600, seed: 7, mode: 'confetti' });
  assert.equal(buffer.length, 32 * PARTICLE_STRIDE);
  assert.equal(stepParticleBuffer(buffer, 16, 800, 600, 'confetti'), 32);
  const canvasSource = read('src/components/effects/GpuParticleCanvas.tsx');
  assert.match(canvasSource, /canvas\.getContext\('webgl'/);
  assert.match(canvasSource, /gl\.drawArrays\(gl\.POINTS,\s*0,\s*count\)/);
  assert.match(canvasSource, /loseContext/);
  assert.match(read('src/components/CelebrationBurst.tsx'), /<GpuParticleCanvas/);
});

test('5. Process-local cache invalidation, selected operation counters, and volatile callbacks', async () => {
  const cache = new MultiLayerCache(20);
  const dataAccess = new ProcessLocalDataAccess();
  const tasks = new ProcessLocalTaskScheduler();
  let loaderCalls = 0;
  const first = await cache.getOrLoad('profile:alice', () => { loaderCalls += 1; return { name: 'Alice' }; }, { tags: ['profile:alice'] });
  assert.equal(first.layer, 'loader');
  const second = await cache.getOrLoad('profile:alice', () => { loaderCalls += 1; return {}; });
  assert.equal(second.layer, 'L1');
  assert.equal(loaderCalls, 1);
  await cache.getOrLoad('shop:catalog', () => ({ count: 873 }), { tags: ['shop:catalog'] });
  dataAccess.executeWrite(cache, ['profile:alice'], () => true);
  const catalog = await cache.getOrLoad('shop:catalog', () => ({ count: 0 }));
  assert.equal(catalog.layer, 'L1');
  assert.equal(catalog.value.count, 873);
  assert.equal(cache.getStats().backend, 'in-process-memory');
  assert.equal(cache.getStats().hitRatePercent, 50);
  assert.equal(dataAccess.getStats().writeOperations, 1);
  assert.equal(dataAccess.getStats().readOperations, 0);
  assert.equal(tasks.runShopHandler(() => 'local-handler'), 'local-handler');
  const task = tasks.enqueueTask('gacha.pull', { id: 'sample' }, (payload) => payload.id);
  assert.equal(task.status, 'queued');
  await new Promise((resolve) => setImmediate(resolve));
  const stats = tasks.getStats();
  assert.equal(stats.taskScheduler.completedJobs, 1);
  assert.match(stats.taskScheduler.durability, /volatile/);
  assert.match(stats.taskScheduler.engine, /in-process/);

  const taggedCache = new MultiLayerCache(1);
  taggedCache.set('profile:old', { id: 'old' }, { tags: ['profile'] });
  taggedCache.set('profile:new', { id: 'new' }, { tags: ['profile'] });
  assert.equal(taggedCache.getStats().totalKeys, 1, 'L1 stays bounded while the in-memory second map retains its copy');
  const secondLevelHit = await taggedCache.getOrLoad('profile:old', () => ({ id: 'reloaded' }));
  assert.equal(secondLevelHit.layer, 'L2-memory', 'L2 is a bounded in-process memory map, not external storage');
  assert.equal(taggedCache.invalidateByTag('profile'), 2, 'tag invalidation clears entries from both in-process maps');

  enqueueOfflineAction('/api/shop/wishlist', { itemId: 'frame-air' });
  assert.ok(readOfflineQueue().length >= 1);
  const flushed = await flushOfflineQueue(async () => ({ status: 200, data: { success: true } }));
  assert.ok(flushed.sent >= 1);
  assert.equal(flushed.remaining, 0);
});

test('6. SSIM utilities, RUM endpoint, and admin report expose only observed samples', async () => {
  const width = 16;
  const height = 16;
  const reference = new Uint8Array(width * height * 4);
  const near = new Uint8Array(width * height * 4);
  const degraded = new Uint8Array(width * height * 4);
  for (let index = 0; index < reference.length; index += 4) {
    reference[index] = 180; reference[index + 1] = 140; reference[index + 2] = 90; reference[index + 3] = 255;
    near[index] = 179; near[index + 1] = 139; near[index + 2] = 90; near[index + 3] = 255;
    degraded[index] = (index * 17) % 255; degraded[index + 1] = 10; degraded[index + 2] = 240; degraded[index + 3] = 255;
  }
  assert.ok(computeSSIM(reference, near, width, height) > 0.99);
  assert.ok(computeSSIM(reference, degraded, width, height) < 0.5);
  assert.equal(computePerceptualHash(reference, width, height).length, 16);
  const thresholdResult = evaluateOptimizationABTest(
    { lcpMs: 1800, fidMs: 30, memoryMb: 150, fps: 48, ssim: 1, engagementRate: 0.62 },
    { lcpMs: 1150, fidMs: 18, memoryMb: 110, fps: 60, ssim: 0.978, engagementRate: 0.64 },
  );
  assert.equal(thresholdResult.approved, true, 'pure utility test uses supplied sample numbers only');

  resetRateLimitersForTest();
  const middlewares = [];
  const server = http.createServer((req, res) => {
    let index = 0;
    const next = () => (index < middlewares.length ? middlewares[index++](req, res, next) : (res.statusCode = 404, res.end()));
    next();
  });
  setupForumServer(server, { use(handler) { middlewares.push(handler); } });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    const unsupported = await fetch(`${baseUrl}/api/analytics/performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: 'tier-a', fps: 60, ssimScore: 0.99 }),
    });
    assert.equal(unsupported.status, 200);
    assert.equal((await unsupported.json()).accepted, false);

    const rum = await fetch(`${baseUrl}/api/analytics/performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: 'tier-c', lcpMs: 1520, firstInputDelayMs: 32, jsHeapMb: 74, activeAnimations: 0 }),
    });
    assert.equal(rum.status, 200);
    assert.equal((await rum.json()).accepted, true);

    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'broamstuck@gmail.com', password: TEST_ADMIN_PASSWORD }),
    });
    const loginData = await login.json();
    assert.equal(login.status, 200);

    const reportResponse = await fetch(`${baseUrl}/api/admin/performance-tiers`, {
      headers: { Authorization: `Bearer ${loginData.token}` },
    });
    const report = await reportResponse.json();
    assert.equal(reportResponse.status, 200);
    assert.equal(report.tiers['tier-a'].reports, 0);
    assert.equal(report.tiers['tier-a'].metrics.lcpMs.average, null);
    assert.equal(report.tiers['tier-c'].metrics.lcpMs.average, 1520);
    assert.equal(report.tiers['tier-c'].metrics.firstInputDelayMs.average, 32);
    assert.equal(report.tiers['tier-c'].metrics.jsHeapMb.average, 74);
    assert.equal(report.tiers['tier-c'].metrics.activeAnimations.average, 0);
    assert.deepEqual(report.abQualityExperiments, []);
    assert.equal(report.cache.backend, 'in-process-memory');
    assert.equal(report.dataAccess.readOperations, 0);
    assert.match(report.processLocal.taskScheduler.engine, /in-process/);

    const catalog = await fetch(`${baseUrl}/api/edge/catalog`);
    assert.equal(catalog.status, 200);
    const etag = catalog.headers.get('etag');
    assert.ok(etag);
    const conditional = await fetch(`${baseUrl}/api/edge/catalog`, { headers: { 'If-None-Match': etag } });
    assert.equal(conditional.status, 304);
  } finally {
    flushPendingSave();
    await new Promise((resolve) => server.close(resolve));
  }
  assert.ok(fs.existsSync(path.join(ROOT, 'docs/ADAPTIVE_QUALITY_ARCHITECTURE.md')));
  assert.ok(fs.existsSync(path.join(ROOT, 'public/sw.js')));
});

test('7. Comment and virtual-card discipline', () => {
  const functionalFiles = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (file.endsWith('.ts') || file.endsWith('.tsx')) functionalFiles.push(file);
    }
  };
  for (const directory of ['src', 'server']) walk(path.join(ROOT, directory));
  const comments = [];
  for (const file of functionalFiles) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      if (/^\s*\/\//.test(line)) comments.push(`${path.relative(ROOT, file)}:${index + 1}`);
    });
  }
  assert.deepEqual(comments, []);
  assert.match(read('src/index.css'), /\.ff-virtual-card[\s\S]*?content-visibility:\s*auto/);
});

test('8. Battery hints and offline-queue concurrency remain safe', async () => {
  const lowBattery = classifyDeviceProfile(sampleProfile({ batteryLow: true }));
  assert.equal(lowBattery.tier, 'tier-c');
  assert.ok(lowBattery.reasons.some((reason) => reason.includes('Pin yếu')));
  assert.equal(classifyDeviceProfile(sampleProfile({ batteryLow: false })).tier, 'tier-a');

  enqueueOfflineAction('/api/test/concurrent-sync', { action: 'test-1' });
  let sendCount = 0;
  const sender = async () => {
    sendCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return { status: 200, data: { ok: true } };
  };
  const [firstFlush, secondFlush] = await Promise.all([flushOfflineQueue(sender), flushOfflineQueue(sender)]);
  assert.equal(sendCount, 1);
  assert.equal(firstFlush.sent, 1);
  assert.equal(secondFlush.sent, 1);
});
