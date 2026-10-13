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

  /* Kiểm chứng file Boutique.css, QAForumView.tsx và ThreadsView.tsx có tích hợp virtual stub */
  const boutiqueCss = read('src/components/shop/Boutique.css');
  assert.match(boutiqueCss, /\.gb-cell--virtual-stub[\s\S]*?contain:\s*strict/, 'Boutique CSS có class recycled stub với contain: strict');

  const gachaBoutique = read('src/components/shop/GachaBoutique.tsx');
  assert.match(gachaBoutique, /useVirtualWindow/, 'GachaBoutique tích hợp useVirtualWindow');
  assert.match(gachaBoutique, /gb-cell--virtual-stub/, 'GachaBoutique sử dụng recycled node stub khi thẻ ngoài viewport');
  assert.match(gachaBoutique, /useInteractionDebounce/, 'GachaBoutique tích hợp useInteractionDebounce cho ô tìm kiếm');

  const qaView = read('src/components/views/QAForumView.tsx');
  assert.match(qaView, /useVirtualWindow/, 'QAForumView tích hợp useVirtualWindow');
  assert.match(qaView, /ff-virtual-card--recycled/, 'QAForumView tái sử dụng recycled stub cho câu hỏi ngoài viewport');
  assert.match(qaView, /useInteractionDebounce/, 'QAForumView tích hợp useInteractionDebounce cho ô tìm kiếm câu hỏi');

  const threadsView = read('src/components/views/ThreadsView.tsx');
  assert.match(threadsView, /useVirtualWindow/, 'ThreadsView tích hợp useVirtualWindow');
  assert.match(threadsView, /thread-card--virtual-stub/, 'ThreadsView tái sử dụng recycled stub cho thread ngoài viewport');
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

    /* Kiểm tra hàm thu hồi thủ công / khi tab chạy nền */
    store.unregisterMediaReference('/assets/decorations/item2.webm');
    const evicted = store.evictInactiveMediaBlobs(0);
    assert.ok(evicted >= 1, 'evictInactiveMediaBlobs phải giải phóng ít nhất 1 mục không còn component nào dùng');
    assert.ok(revokedUrls.includes(u2), 'u2 sau khi unregister phải bị giải phóng bộ nhớ');

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
