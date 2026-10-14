/* Bản quyền trí tuệ thuộc về BroAmStuck */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* ========================================================================== */
/* ROUND 1: VIRTUAL WINDOWING & NODE RECYCLER                                 */
/* ========================================================================== */

test('Round 1: Virtual Windowing & Node Recycling Architecture', async () => {
  const virtModule = await import('../src/utils/virtualWindow.ts');
  assert.ok(virtModule.useVirtualWindow, 'useVirtualWindow hook phải được export');
  assert.ok(virtModule.calculateVirtualRange, 'calculateVirtualRange phải được export');
  assert.ok(virtModule.getScrollContainer, 'getScrollContainer phải được export');

  /* 1. Kiểm chứng thuật toán tính toán cửa sổ ảo theo dòng và cột */
  const singleColRange = virtModule.calculateVirtualRange({
    scrolledPast: 480,
    viewportHeight: 800,
    itemHeight: 160,
    columns: 1,
    totalItems: 100,
    overscan: 2,
  });
  /* 480 / 160 = 3 rows scrolled. startRow = max(0, 3 - 2) = 1. startIndex = 1 */
  assert.equal(singleColRange.startRow, 1, 'Hàng bắt đầu phải lùi lại 2 hàng đệm overscan');
  assert.equal(singleColRange.startIndex, 1, 'Index bắt đầu khớp với cột 1');
  /* (480 + 800) / 160 = 8 rows. endRow = min(100, 8 + 2) = 10. endIndex = 10 */
  assert.equal(singleColRange.endRow, 10, 'Hàng kết thúc phải cộng thêm overscan');
  assert.equal(singleColRange.endIndex, 10, 'Index kết thúc khớp với cột 1');

  /* 2. Kiểm chứng thuật toán cho lưới 3 cột (Boutique Shop) */
  const gridRange = virtModule.calculateVirtualRange({
    scrolledPast: 720,
    viewportHeight: 720,
    itemHeight: 240,
    columns: 3,
    totalItems: 300,
    overscan: 1,
  });
  /* 720 / 240 = 3 rows scrolled. startRow = max(0, 3 - 1) = 2. startIndex = 2 * 3 = 6 */
  assert.equal(gridRange.startRow, 2, 'Lưới 3 cột: hàng bắt đầu lùi lại overscan');
  assert.equal(gridRange.startIndex, 6, 'Lưới 3 cột: index bắt đầu là 6');
  /* (720 + 720) / 240 = 6 rows. endRow = 6 + 1 = 7. endIndex = 7 * 3 = 21 */
  assert.equal(gridRange.endRow, 7, 'Lưới 3 cột: hàng kết thúc tính đúng overscan');
  assert.equal(gridRange.endIndex, 21, 'Lưới 3 cột: index kết thúc là 21');

  /* 3. Kiểm chứng file Boutique.css, QAForumView.tsx và ThreadsView.tsx có tích hợp virtual stub & refs */
  const boutiqueCss = read('src/components/shop/Boutique.css');
  assert.match(boutiqueCss, /\.gb-cell--virtual-stub[\s\S]*?contain:\s*strict/, 'Boutique CSS có class recycled stub với contain: strict');

  const gachaBoutique = read('src/components/shop/GachaBoutique.tsx');
  assert.match(gachaBoutique, /useVirtualWindow/, 'GachaBoutique tích hợp useVirtualWindow');
  assert.match(gachaBoutique, /gb-cell--virtual-stub/, 'GachaBoutique sử dụng recycled node stub khi thẻ ngoài viewport');
  assert.match(gachaBoutique, /boutiqueGridRef/, 'GachaBoutique gắn boutiqueGridRef để đo đạc chính xác container cuộn');
  assert.match(gachaBoutique, /useInteractionDebounce/, 'GachaBoutique tích hợp useInteractionDebounce cho ô tìm kiếm');

  const qaView = read('src/components/views/QAForumView.tsx');
  assert.match(qaView, /useVirtualWindow/, 'QAForumView tích hợp useVirtualWindow');
  assert.match(qaView, /ff-virtual-card--recycled/, 'QAForumView tái sử dụng recycled stub cho câu hỏi ngoài viewport');
  assert.match(qaView, /useInteractionDebounce/, 'QAForumView tích hợp useInteractionDebounce cho ô tìm kiếm câu hỏi');

  const threadsView = read('src/components/views/ThreadsView.tsx');
  assert.match(threadsView, /useVirtualWindow/, 'ThreadsView tích hợp useVirtualWindow');
  assert.match(threadsView, /thread-card--virtual-stub/, 'ThreadsView tái sử dụng recycled stub cho thread ngoài viewport');
  assert.match(threadsView, /feedScrollRef/, 'ThreadsView gắn feedScrollRef để kết nối trực tiếp với scroll container');
  assert.match(threadsView, /useInteractionDebounce/, 'ThreadsView tích hợp useInteractionDebounce cho thanh tìm kiếm');

  const threadsCss = read('src/components/views/ThreadsView.css');
  assert.match(threadsCss, /\.thread-card--virtual-stub[\s\S]*?contain:\s*strict/, 'ThreadsView CSS có class recycled stub với contain: strict');
});

/* ========================================================================== */
/* ROUND 2: ADAPTIVE RAF SCHEDULER & 0MS INTERACTION PRIORITY                 */
/* ========================================================================== */

test('Round 2: Adaptive RAF Scheduler, Task Priorities & 0ms Latency', async () => {
  const sched = await import('../src/utils/interactionScheduler.ts');
  assert.ok(sched.scheduleTask, 'scheduleTask phải được export');
  assert.ok(sched.yieldToMain, 'yieldToMain phải được export');
  assert.ok(sched.markUserInteraction, 'markUserInteraction phải được export');
  assert.ok(sched.isUserInteracting, 'isUserInteracting phải được export');
  assert.ok(sched.isScrollActive, 'isScrollActive phải được export');
  assert.ok(sched.runWhenIdle, 'runWhenIdle phải được export');

  /* 1. Kiểm tra ưu tiên user-blocking thực thi ngay lập tức */
  let userBlockingRan = false;
  await sched.scheduleTask(() => {
    userBlockingRan = true;
  }, 'user-blocking');
  assert.equal(userBlockingRan, true, 'Tác vụ user-blocking phải chạy ngay lập tức không trễ');

  /* 2. Kiểm tra yieldToMain không ném lỗi và hoàn thành */
  let yielded = false;
  await sched.yieldToMain().then(() => {
    yielded = true;
  });
  assert.equal(yielded, true, 'yieldToMain phải nhường thread và hoàn thành');

  /* 3. Kiểm tra cơ chế đánh dấu tương tác người dùng 0ms */
  sched.markUserInteraction();
  assert.equal(sched.isUserInteracting(), true, 'isUserInteracting phải trả về true ngay sau khi user tương tác');

  /* 4. Kiểm tra runWhenIdle có thể chạy và có hàm huỷ */
  let idleRan = false;
  const cancelIdle = sched.runWhenIdle(() => {
    idleRan = true;
  }, 50);
  assert.equal(typeof cancelIdle, 'function', 'runWhenIdle trả về hàm huỷ');

  /* 5. Kiểm tra isScrollActive trả về boolean an toàn */
  assert.equal(typeof sched.isScrollActive(), 'boolean', 'isScrollActive trả về boolean an toàn');
});

/* ========================================================================== */
/* ROUND 3: ZERO-OVERHEAD GLASSMORPHISM & GPU COMPOSITE LAYERS                */
/* ========================================================================== */

test('Round 3: Zero-Overhead Glassmorphism & GPU Composite Layers', () => {
  const indexCss = read('src/index.css');

  /* 1. Hardware acceleration translateZ(0) trên các thẻ và thanh điều hướng */
  assert.match(
    indexCss,
    /:is\(\.liquid-glass|\.liquid-glass[\s\S]*?transform:\s*translateZ\(0\)/,
    'Bề mặt kính và thẻ phải được kích hoạt GPU composite layer với translateZ(0)',
  );

  /* 2. Loại bỏ backdrop-filter nặng nề trên Tier C và Battery Saver */
  assert.match(
    indexCss,
    /\[data-quality-tier="tier-c"\]\s+\.liquid-glass[\s\S]*?backdrop-filter:\s*none\s*!important/,
    'Tier C loại bỏ backdrop-filter đắt đỏ trên liquid-glass',
  );
  assert.match(
    indexCss,
    /\[data-battery-saver="true"\]\s+\.liquid-glass[\s\S]*?backdrop-filter:\s*none\s*!important/,
    'Battery Saver loại bỏ backdrop-filter đắt đỏ trên liquid-glass',
  );

  /* 3. Hòa trộn màu flat high-fidelity color blending thay thế */
  assert.match(
    indexCss,
    /\[data-quality-tier="tier-c"\]\s+\.liquid-glass[\s\S]*?background-color:\s*rgba\(15,\s*23,\s*42/,
    'Hòa trộn màu độ mờ cao cấp cho dark mode khi tắt blur',
  );
  assert.match(
    indexCss,
    /html\.light\[data-quality-tier="tier-c"\]\s+\.liquid-glass[\s\S]*?background-color:\s*rgba\(248,\s*250,\s*252/,
    'Hòa trộn màu sắc nét cho light mode khi tắt blur',
  );

  /* 4. Tắt hover nặng khi cuộn nhanh (is-scrolling) */
  assert.match(
    indexCss,
    /body\.is-scrolling\s+\.gb-card:hover[\s\S]*?pointer-events:\s*none/,
    'Khi cuộn nhanh, tạm hoãn hover để giữ locked 60 FPS',
  );
});

/* ========================================================================== */
/* ROUND 4: PROACTIVE LRU MEDIA CACHE EVICTION & MEMORY GC                    */
/* ========================================================================== */

test('Round 4: Proactive LRU Media Cache Eviction & Garbage Collection', async () => {
  const store = await import('../src/utils/decorationStore.ts');
  assert.ok(store.loadCachedAsset, 'loadCachedAsset phải được export');
  assert.ok(store.evictInactiveMediaBlobs, 'evictInactiveMediaBlobs phải được export');
  assert.ok(store.clearMediaCache, 'clearMediaCache phải được export');
  assert.ok(store.getMediaCacheStats, 'getMediaCacheStats phải được export');
  assert.ok(store.setMediaCacheLimit, 'setMediaCacheLimit phải được export');
  assert.ok(store.registerMediaReference, 'registerMediaReference phải được export');
  assert.ok(store.unregisterMediaReference, 'unregisterMediaReference phải được export');

  /* 1. Thiết lập giới hạn cache LRU cho bài test */
  store.setMediaCacheLimit(3);
  let stats = store.getMediaCacheStats();
  assert.equal(stats.limit, 3, 'Giới hạn LRU cache phải được cập nhật');

  /* 2. Mock URL.createObjectURL và URL.revokeObjectURL */
  const revokedUrls = [];
  const origCreate = globalThis.URL.createObjectURL;
  const origRevoke = globalThis.URL.revokeObjectURL;

  let counter = 0;
  globalThis.URL.createObjectURL = (blob) => `blob:http://localhost/test-${++counter}`;
  globalThis.URL.revokeObjectURL = (url) => {
    revokedUrls.push(url);
  };

  /* Mock fetch để trả về dummy blob */
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url) => ({
    ok: true,
    blob: async () => ({ size: 1024, type: 'video/webm' }),
  });

  try {
    /* Nạp 3 asset vào cache */
    const u1 = await store.loadCachedAsset('/assets/decorations/item1.webm');
    const u2 = await store.loadCachedAsset('/assets/decorations/item2.webm');
    const u3 = await store.loadCachedAsset('/assets/decorations/item3.webm');

    assert.ok(u1 && u1.startsWith('blob:'), 'Asset 1 phải tạo object URL');
    assert.ok(u2 && u2.startsWith('blob:'), 'Asset 2 phải tạo object URL');
    assert.ok(u3 && u3.startsWith('blob:'), 'Asset 3 phải tạo object URL');

    stats = store.getMediaCacheStats();
    assert.equal(stats.totalEntries, 3, 'Tổng số mục nạp là 3');

    /* Đăng ký reference cho item2 và item3 (đang active trong UI) */
    store.registerMediaReference('/assets/decorations/item2.webm');
    store.registerMediaReference('/assets/decorations/item3.webm');

    stats = store.getMediaCacheStats();
    assert.equal(stats.activeEntries, 2, 'Có 2 mục đang active');

    /* Nạp mục thứ 4 -> vượt quá limit=3 -> item1 (inactive và cũ nhất) phải bị thu hồi ngay */
    const u4 = await store.loadCachedAsset('/assets/decorations/item4.webm');
    assert.ok(u4, 'Asset 4 nạp thành công');
    assert.ok(revokedUrls.includes(u1), 'Mục inactive cũ nhất (u1) phải bị URL.revokeObjectURL giải phóng RAM');

    /* Bảo vệ tài nguyên đang active: item2 và item3 KHÔNG bị thu hồi */
    assert.equal(revokedUrls.includes(u2), false, 'Asset 2 đang active không được phép bị thu hồi');
    assert.equal(revokedUrls.includes(u3), false, 'Asset 3 đang active không được phép bị thu hồi');

    /* Unregister item2 -> evictInactiveMediaBlobs giải phóng mục khi không còn ai dùng */
    store.unregisterMediaReference('/assets/decorations/item2.webm');
    const evicted = store.evictInactiveMediaBlobs(0);
    assert.ok(evicted >= 1, 'evictInactiveMediaBlobs phải giải phóng ít nhất 1 mục');
    assert.ok(revokedUrls.includes(u2), 'u2 sau khi unregister về 0 refCount phải bị giải phóng bộ nhớ');

    /* Dọn sạch cache */
    store.clearMediaCache(true);
    stats = store.getMediaCacheStats();
    assert.equal(stats.totalEntries, 0, 'Toàn bộ cache được dọn dẹp sạch sẽ');
  } finally {
    globalThis.URL.createObjectURL = origCreate;
    globalThis.URL.revokeObjectURL = origRevoke;
    globalThis.fetch = origFetch;
  }
});

/* ========================================================================== */
/* ROUND 5: P0 -> P4 GPU / 3D / DOM RENDER ENGINE & RENDERER.INFO PROFILER    */
/* ========================================================================== */

test('Round 5: P0 -> P4 GPU Render Engine (DPR Cap, On-Demand Loop, Batching, Culling, Adaptive FPS < 30 / < 15)', async () => {
  const engine = await import('../src/utils/gpuRenderEngine.ts');

  /* P0: Giới hạn DPR <= 2 */
  assert.equal(engine.clampPixelRatio(3.5, 2), 2, 'DPR=3.5 trên màn Retina phải được giới hạn về 2');
  assert.equal(engine.clampPixelRatio(4, 1.5), 1.5, 'DPR tuân thủ trần tùy chỉnh <= 2');
  assert.equal(engine.clampPixelRatio(0.5, 2), 1, 'DPR tối thiểu luôn >= 1');

  /* P1: Ngân sách Draw Calls (< 100 Desktop, < 50 Mobile) & Dirty-Checked Sphere Batcher */
  assert.equal(engine.getDrawCallBudget(false).maxDrawCalls, 100, 'Desktop draw call budget < 100');
  assert.equal(engine.getDrawCallBudget(true).maxDrawCalls, 50, 'Mobile draw call budget < 50');

  const batcher = new engine.SphereCardBatchUpdater(4);
  const mockEl = {
    style: {
      visibility: '',
      zIndex: '',
      pointerEvents: '',
      props: {},
      setProperty(k, v) {
        this.props[k] = v;
      },
    },
  };
  const firstUpdate = batcher.updateCard(0, mockEl, 0.8, 0.25, -0.42, 1);
  assert.equal(firstUpdate.visible, true, 'Thẻ ở mặt trước (zf=0.8) phải hiển thị');
  assert.equal(firstUpdate.mutated, true, 'Lần đầu cập nhật phải ghi DOM');

  const secondSameUpdate = batcher.updateCard(0, mockEl, 0.8, 0.25, -0.42, 1);
  assert.equal(secondSameUpdate.mutated, false, 'Giá trị không đổi thì Dirty-Checker không được ghi lại DOM');

  const culledBackCard = batcher.updateCard(1, mockEl, -0.75, 0.8, -0.42, 1);
  assert.equal(culledBackCard.visible, false, 'P4: Thẻ ở bán cầu sau (zf=-0.75 < -0.42) phải bị Frustum/Backface Cull');
  assert.equal(mockEl.style.visibility, 'hidden', 'Thẻ bị cull phải đặt visibility: hidden');

  /* P2: Tắt Antialias khi DPR >= 2 và giới hạn Post-Processing <= 2 pass (0 pass khi FPS < 30) */
  assert.equal(engine.shouldEnableAntialias(2), false, 'DPR >= 2 phải tắt MSAA');
  assert.equal(engine.shouldEnableAntialias(1.5), true, 'DPR < 2 bật MSAA');
  assert.equal(engine.clampPostProcessingPasses(5, 60), 2, 'Tối đa 2 pass Post-Processing ở 60 FPS');
  assert.equal(engine.clampPostProcessingPasses(2, 24), 0, 'FPS < 30 tự động tắt toàn bộ Post-Processing');

  /* P3: Nén kích thước Texture <= 2048px, Power-of-Two mipmap & .dispose() lifecycle */
  const clampedTex = engine.clampTextureDimensions(4096, 2048, 2048);
  assert.equal(clampedTex.width, 2048, 'Texture 4K phải được hạ xuống tối đa 2048px');
  assert.equal(clampedTex.height, 1024, 'Giữ nguyên tỉ lệ khung hình khi hạ độ phân giải texture');
  assert.equal(engine.nearestPowerOfTwo(980), 1024, 'Làm tròn về lũy thừa của 2 (1024) cho mipmap');

  let disposedFlag = false;
  const disposeTex = engine.registerDisposableResource('test-tex-1', 'texture', () => {
    disposedFlag = true;
  });
  assert.ok(engine.getRendererInfo().memory.textures >= 1, 'renderer.info ghi nhận texture đang cấp phát');
  disposeTex();
  assert.equal(disposedFlag, true, 'P3: Hàm .dispose() phải được thực thi khi giải phóng tài nguyên');

  /* P4: Adaptive Quality Governor khi FPS < 30 và FPS < 15 */
  const dropUnder30 = engine.evaluateAdaptiveQualityStep({
    fps: 22,
    currentDpr: 2,
    nativeDpr: 2,
    postProcessingEnabled: true,
    qualityMode: 'high',
  });
  assert.equal(dropUnder30.dpr, 1.6, 'FPS < 30 tự động giảm DPR * 0.8 (2.0 -> 1.6)');
  assert.equal(dropUnder30.postProcessingEnabled, false, 'FPS < 30 tự động tắt Post-Processing');

  const dropUnder15 = engine.evaluateAdaptiveQualityStep({
    fps: 11,
    currentDpr: 1.6,
    nativeDpr: 2,
    postProcessingEnabled: false,
    qualityMode: 'balanced',
  });
  assert.equal(dropUnder15.qualityMode, 'low-poly', 'FPS < 15 tự động chuyển sang chế độ Low-Poly');
  assert.equal(dropUnder15.lowPolyStep, 2, 'Chế độ Low-Poly giảm mật độ đối tượng 3D (LOD step = 2)');
});

test('Round 6: 3D render loops sleep while hidden or inactive and resume on visibility', () => {
  for (const file of ['src/components/AboutUs.tsx', 'src/components/views/KhuVinhDanhView.tsx']) {
    const source = read(file);
    assert.match(source, /const shouldRunAnimation = \(\) =>[\s\S]{0,140}!document\.hidden/);
    assert.match(source, /if \(!shouldRunAnimation\(\)\) return;/);
    assert.match(source, /if \(animId \|\| !shouldRunAnimation\(\)\) return;/);
    assert.match(source, /document\.addEventListener\('visibilitychange', onVisibilityChange\)/);
    assert.match(source, /if \(animId\) cancelAnimationFrame\(animId\)/);
    assert.doesNotMatch(source, /animId = requestAnimationFrame\(tick\);\s*return;/);
  }
});
