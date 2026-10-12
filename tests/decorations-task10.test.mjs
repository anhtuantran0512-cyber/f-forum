/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Nhiệm vụ 10 — Hệ thống trang trí Discord import: test hợp đồng chuyên biệt.
 *
 *  10.1 Catalog: schema, file thật trên disk, preview < 100KB, giá khớp bảng rarity
 *  10.2 Registry: 873 item active, slot theo loại, item SVG cũ vẫn bán (chưa migration)
 *  10.3 Mua trang trí: tài khoản mới 100 Coin → 402 + thông báo ĐÚNG giá
 *       effectivePrice (ưu đãi tuần + flash 6h — client/server cùng hàm)
 *  10.4 Equip theo slot: lẫn lộn slot → 400; đúng slot → 200; gỡ → null
 *  10.5 Thông báo in-app: chỉ đọc của mình; đánh dấu đã đọc
 *
 * Kỹ thuật: server A register → flush → inject inventory + notices vào file data
 * trên disk → server B (setupForumServer gọi loadStoreFromDisk) đăng nhập lại.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fforum-deco10-'));
process.env.FFORUM_DATA_DIR = DATA_DIR;
/* Marker migration là artifact triển khai cục bộ (chưa migration) — test luôn
   chạy với marker KHÔNG tồn tại để độc lập với môi trường dev đã apply. */
process.env.FFORUM_MIGRATION_MARKER = path.join(DATA_DIR, 'decorations-migration.none.json');
const { setupForumServer, resetRateLimitersForTest, flushPendingSave } = await import('../server/forumServer.ts');
const shop = await import('../src/utils/shopData.ts');
const registry = await import('../server/decorationRegistry.ts');
const deco = await import('../src/utils/decorations.ts');

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const DECOS = path.join(ROOT, 'public', 'assets', 'decorations');
const CATALOG = JSON.parse(fs.readFileSync(path.join(DECOS, 'decorations-catalog.json'), 'utf8'));
const DATA_FILE = path.join(DATA_DIR, 'forum-data.json');

const RARITIES = new Set(['common', 'rare', 'epic', 'mythic']);
const TYPES = new Set(['avatar_frame', 'avatar_aura', 'nameplate']);

test('10.1 Catalog: 873 item — schema, file trên disk, preview < 100KB, giá theo rarity', () => {
  assert.equal(CATALOG.items.length, 873, 'catalog đủ 873 item');
  const byType = {};
  const byRarity = {};
  const seen = new Set();
  for (const item of CATALOG.items) {
    assert.ok(TYPES.has(item.type), `type lạ: ${item.id}`);
    assert.ok(RARITIES.has(item.rarity), `rarity lạ: ${item.id}`);
    assert.ok(!seen.has(item.id), `id trùng: ${item.id}`);
    seen.add(item.id);
    assert.match(item.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, `slug không kebab-case: ${item.slug}`);
    assert.equal(item.price, CATALOG.pricing.coins[item.type][item.rarity], `giá lệch bảng: ${item.id}`);
    assert.ok(typeof item.originalPriceNote === 'string' && item.originalPriceNote.length > 0, `thiếu originalPriceNote: ${item.id}`);
    assert.ok(Array.isArray(item.tags), `tags không phải mảng: ${item.id}`);
    byType[item.type] = (byType[item.type] || 0) + 1;
    byRarity[item.rarity] = (byRarity[item.rarity] || 0) + 1;

    const ap = item.assetPath;
    for (const p of [ap.preview, ap.previewPng, ap.fullWebp || ap.full]) {
      assert.ok(p, `${item.id} thiếu path ${p}`);
      const file = path.join(ROOT, 'public', p);
      assert.ok(fs.existsSync(file), `thiếu file trên disk: ${p}`);
      if (p.endsWith('preview.png') || p.endsWith('preview.webp')) {
        assert.ok(fs.statSync(file).size < 100 * 1024, `preview > 100KB: ${p}`);
      }
    }
    assert.equal(Boolean(ap.animated), item.isAnimated, `isAnimated không khớp file: ${item.id}`);
    if (ap.animated) {
      assert.ok(fs.existsSync(path.join(ROOT, 'public', ap.animated)), `thiếu webm: ${ap.animated}`);
    }
  }
  assert.deepEqual(byType, { avatar_frame: 569, avatar_aura: 68, nameplate: 236 }, 'đúng cấu thành 569/68/236');
  assert.ok(Object.keys(byRarity).length >= 3, 'phủ ít nhất 3 bậc hiếm');
});

test('10.2 Registry: 873 active + slot đúng loại + item SVG cũ vẫn bán (chưa migration)', () => {
  /* resolveAssetUrl KHÔNG được sinh URL '//…' (protocol-relative) khi BASE_URL = '/' —
     đó chính là lỗi khiến Boutique rỗng (fetch catalog chết). */
  for (const p of ['/assets/decorations/decorations-catalog.json', '/assets/decorations/avatar-frames/black-mana/full.webp']) {
    assert.equal(deco.resolveAssetUrl(p), p, `resolveAssetUrl giữ path gốc: ${p}`);
  }
  assert.equal(deco.resolveAssetUrl(null), null);
  assert.equal(deco.resolveAssetUrl('https://cdn.example.com/x.webp'), 'https://cdn.example.com/x.webp');
  const items = registry.getDecorationItems();
  assert.equal(items.length, 873, 'registry nạp đủ catalog');
  assert.ok(items.every((i) => i.isActive && i.originalSource === 'discord_import'), 'tất cả active + discord_import');

  const frame = CATALOG.items.find((i) => i.type === 'avatar_frame');
  const aura = CATALOG.items.find((i) => i.type === 'avatar_aura');
  const np = CATALOG.items.find((i) => i.type === 'nameplate');
  assert.equal(registry.decorationSlotForId(frame.id), 'avatar_frame');
  assert.equal(registry.decorationSlotForId(aura.id), 'avatar_aura');
  assert.equal(registry.decorationSlotForId(np.id), 'nameplate');
  assert.equal(registry.decorationSlotForId('pencil_starter'), null, 'item cũ không thuộc slot mới');

  const legacy = registry.getShopItemById('pencil_starter');
  assert.ok(legacy, 'item SVG cũ vẫn đăng ký');
  assert.notEqual(legacy.isActive, false, 'chưa migration → item cũ vẫn bán (test 9e)');
  assert.ok(registry.isKnownInventoryId(frame.id), 'id decoration mới hợp lệ trong inventory');
  assert.ok(registry.isKnownInventoryId('frame-chua-ton-tai-xyz'), 'id decoration chưa có trong catalog vẫn giữ (chống mất data)');
  assert.ok(!registry.isKnownInventoryId('rubbish-id-###'), 'id rác bị loại');
});

/* ------------------------------------------------------------------ */
/* Fixture server                                                      */
/* ------------------------------------------------------------------ */
function boot() {
  resetRateLimitersForTest();
  const middlewares = [];
  const server = http.createServer((req, res) => {
    let index = 0;
    const next = () => (index < middlewares.length ? middlewares[index++](req, res, next) : (res.statusCode = 404, res.end('Not Found')));
    next();
  });
  setupForumServer(server, { use(fn) { middlewares.push(fn); } });
  const sockets = new Set();
  server.on('connection', (s) => {
    sockets.add(s);
    s.on('close', () => sockets.delete(s));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        baseUrl: `http://127.0.0.1:${server.address().port}`,
        close: () =>
          new Promise((done) => {
            server.close(() => {
              for (const s of sockets) s.destroy();
              sockets.clear();
              done();
            });
          }),
      });
    });
  });
}

const post = async (baseUrl, url, body, token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${url}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return { status: res.status, data: await res.json().catch(() => null) };
};
const getAuthed = async (baseUrl, url, token) => {
  const res = await fetch(`${baseUrl}${url}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return { status: res.status, data: await res.json().catch(() => null) };
};

test('10.3 Mua trang trí: 402 đúng giá effectivePrice (khớp nhãn "Giảm giá")', async () => {
  const a = await boot();
  try {
    const reg = await post(a.baseUrl, '/api/auth/register', { name: 'Deco Tester', email: `deco10.${Date.now()}@example.test`, password: 'mat-khau-deco-10' });
    assert.equal(reg.status, 200, JSON.stringify(reg.data));

    const frame = CATALOG.items.find((i) => i.type === 'avatar_frame' && i.rarity === 'common');
    const serverItem = registry.getShopItemById(frame.id);
    const price = shop.effectivePrice(serverItem, Date.now());
    const attempt = await post(a.baseUrl, '/api/shop/purchase', { itemId: frame.id, price: 1 }, reg.data.token);
    assert.equal(attempt.status, 402, `tài khoản mới 100 Coin không đủ mua frame ${frame.price}`);
    assert.match(attempt.data.message, new RegExp(`Bạn cần ${price} Coin`), 'máy chủ báo đúng giá effectivePrice, không phải giá niêm yết');
  } finally {
    flushPendingSave();
    await a.close();
  }
});

test('10.4 + 10.5 Equip theo slot & thông báo in-app', async () => {
  /* Server A: đăng ký user. */
  const a = await boot();
  let email;
  try {
    const reg = await post(a.baseUrl, '/api/auth/register', { name: 'Deco Equip', email: `deco10.eq.${Date.now()}@example.test`, password: 'mat-khau-deco-10' });
    assert.equal(reg.status, 200, JSON.stringify(reg.data));
    email = reg.data.user.email;
  } finally {
    flushPendingSave();
    await a.close();
  }

  /* Inject: sở hữu 1 frame + 1 aura + 1 nameplate, seed 2 thông báo. */
  const store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const user = store.users[email];
  assert.ok(user, 'user đã persist lên disk');
  const frame = CATALOG.items.find((i) => i.type === 'avatar_frame' && i.rarity === 'common');
  const aura = CATALOG.items.find((i) => i.type === 'avatar_aura');
  const np = CATALOG.items.find((i) => i.type === 'nameplate');
  user.inventory = [...new Set([...(user.inventory || []), frame.id, aura.id, np.id])];
  user.equippedDecorations = { avatar_frame: null, avatar_aura: null, nameplate: null };
  store.userNotices = [
    { id: 'server-deco10-own', email, title: 'T10 own', body: 'thông báo của chính user', at: Date.now(), readAt: null },
    { id: 'server-deco10-other', email: 'someone-else@example.test', title: 'T10 other', body: 'thông báo của người khác', at: Date.now(), readAt: null },
  ];
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));

  /* Server B: đọc lại từ disk (setupForumServer → loadStoreFromDisk). */
  const b = await boot();
  try {
    const login = await post(b.baseUrl, '/api/auth/login', { email, password: 'mat-khau-deco-10' });
    assert.equal(login.status, 200, `login lại phải thành công: ${JSON.stringify(login.data)}`);
    const token = login.data.token;

    /* Equip: slot lẫn lộn → 400. */
    const bad = await post(b.baseUrl, '/api/shop/equip', { itemId: frame.id, slot: 'nameplate' }, token);
    assert.equal(bad.status, 400, 'frame không được gắn vào slot nameplate');
    const badAura = await post(b.baseUrl, '/api/shop/equip', { itemId: np.id, slot: 'avatar_frame' }, token);
    assert.equal(badAura.status, 400, 'nameplate không được gắn vào slot avatar_frame');

    /* Equip đúng slot → 200, equippedDecorations cập nhật. */
    const okFrame = await post(b.baseUrl, '/api/shop/equip', { itemId: frame.id, slot: 'avatar_frame' }, token);
    assert.equal(okFrame.status, 200);
    assert.equal(okFrame.data.user.equippedDecorations.avatar_frame, frame.id);
    const okAura = await post(b.baseUrl, '/api/shop/equip', { itemId: aura.id, slot: 'avatar_aura' }, token);
    assert.equal(okAura.status, 200);
    assert.equal(okAura.data.user.equippedDecorations.avatar_aura, aura.id);
    /* Đeo frame + aura CÙNG LÚC được phép (2 slot độc lập). */
    const okNp = await post(b.baseUrl, '/api/shop/equip', { itemId: np.id, slot: 'nameplate' }, token);
    assert.equal(okNp.status, 200);
    assert.equal(okNp.data.user.equippedDecorations.nameplate, np.id);
    assert.equal(okNp.data.user.equippedDecorations.avatar_frame, frame.id, 'slot khác không bị đụng');

    /* Gỡ: { itemId: '', slot } → null, slot khác giữ nguyên. */
    const un = await post(b.baseUrl, '/api/shop/equip', { itemId: '', slot: 'avatar_frame' }, token);
    assert.equal(un.status, 200);
    assert.equal(un.data.user.equippedDecorations.avatar_frame, null);
    assert.equal(un.data.user.equippedDecorations.nameplate, np.id);

    /* Không sở hữu → 403. */
    const notOwned = CATALOG.items.find((i) => i.type === 'avatar_frame' && i.id !== frame.id);
    const forbidden = await post(b.baseUrl, '/api/shop/equip', { itemId: notOwned.id, slot: 'avatar_frame' }, token);
    assert.equal(forbidden.status, 403, 'không tự trang bị item chưa sở hữu');

    /* Thông báo: chỉ thấy của mình. */
    const n1 = await getAuthed(b.baseUrl, '/api/notices', token);
    assert.equal(n1.status, 200);
    const ids = n1.data.notices.map((n) => n.id);
    assert.ok(ids.includes('server-deco10-own'), 'thấy thông báo của mình');
    assert.ok(!ids.includes('server-deco10-other'), 'KHÔNG thấy thông báo của user khác');

    /* Đánh dấu đã đọc. */
    const read = await post(b.baseUrl, '/api/notices/read', { ids: ['server-deco10-own'] }, token);
    assert.equal(read.status, 200);
    const n2 = await getAuthed(b.baseUrl, '/api/notices', token);
    assert.ok(n2.data.notices.find((n) => n.id === 'server-deco10-own').readAt > 0, 'readAt được ghi');
  } finally {
    flushPendingSave();
    await b.close();
  }
});

/* ========================================================================== */
/* 10.6 — Màn hình ăn mừng sau migration (MigrationCelebrationModal)         */
/* ========================================================================== */
test('10.6 Ăn mừng migration: modal + wiring store/App + overlay keep-dark', () => {
  const modalSrc = fs.readFileSync('src/components/decorations/MigrationCelebrationModal.tsx', 'utf8');
  assert.ok(modalSrc.includes("import './MigrationCelebrationModal.css'"), 'CSS co-located import');
  assert.ok(modalSrc.includes('CelebrationBurst'), 'dùng confetti có sẵn (CelebrationBurst)');
  assert.ok(modalSrc.includes('role="dialog"'), 'đúng ngữ nghĩa dialog');
  assert.ok(modalSrc.includes('resolveAssetUrl'), 'preview asset qua resolveAssetUrl (BASE_URL)');
  assert.ok(modalSrc.includes('loading="eager"'), 'img preview có loading=');
  assert.ok(!/<video[\s>]/.test(modalSrc), 'KHÔNG có thẻ video trần trong modal');
  assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(modalSrc.replace(/aria-label=[^>]*>/g, '')), 'icon là SVG, không emoji');

  const css = fs.readFileSync('src/components/decorations/MigrationCelebrationModal.css', 'utf8');
  assert.ok(css.includes('ff-keep-dark') || modalSrc.includes('ff-keep-dark'), 'overlay giữ tối trong light mode');
  assert.ok(css.includes('prefers-reduced-motion'), 'tôn trọng giảm chuyển động');

  const storeSrc = fs.readFileSync('src/store/forumStore.ts', 'utf8');
  assert.ok(storeSrc.includes('setMigrationCelebration'), 'store có state celebration');
  assert.ok(storeSrc.includes("startsWith('server-migration-')"), 'lọc thông báo migration riêng khỏi feed');

  const appSrc = fs.readFileSync('src/App.tsx', 'utf8');
  assert.ok(appSrc.includes('<MigrationCelebrationModal'), 'App mount modal');
  assert.ok(appSrc.includes('onExploreBoutique'), 'CTA mở Boutique (tab shop)');

  const types = fs.readFileSync('src/types/index.ts', 'utf8');
  assert.ok(types.includes('MigrationCelebrationPayload'), 'type payload có trong types');
  assert.ok(types.includes('MigrationCelebrationGift'), 'type gift có trong types');
});

/* ========================================================================== */
/* 10.7 — Migration script: payload ăn mừng + cùng hiếm + tự trang bị (e2e)  */
/* ========================================================================== */
test('10.7 Migration e2e: phương án B tặng ĐÚNG BẬC HIẾM, khớp loại, tự trang bị, payload preview', async () => {
  const scriptSrc = fs.readFileSync('scripts/decorations/migrate-decorations.mjs', 'utf8');
  assert.ok(scriptSrc.includes('RARITY_OF_TIER'), 'suy rarity legacy từ tierColor (bugfix: không còn gift common cho user mythic)');
  assert.ok(scriptSrc.includes('TYPE_PRIORITY_BY_CATEGORY'), 'khớp loại item mới theo hạng mục item cũ');
  assert.ok(scriptSrc.includes('FFORUM_MIGRATION_MARKER'), 'marker override được (artifact triển khai, không commit)');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fforum-migration-'));
  const markerPath = path.join(tmp, 'marker.json');
  const dataPath = path.join(tmp, 'forum-data.json');
  /* 2 user giả: 1 giữ item MYTHIC + common (badge là mythic), 1 giữ item common. */
  fs.writeFileSync(dataPath, JSON.stringify({
    users: {
      'boss@demo.dev': {
        name: 'Boss', email: 'boss@demo.dev', role: 'member', avatar: '', level: 1, xp: 0,
        fPoints: 0, coin: 5000, streakCount: 0,
        inventory: ['prism_universe', 'pencil_starter'],
        equippedDecorations: { avatar_frame: null, avatar_aura: null, nameplate: null },
        equippedBadge: 'prism_universe',
      },
      'learner@demo.dev': {
        name: 'Learner', email: 'learner@demo.dev', role: 'member', avatar: '', level: 1, xp: 0,
        fPoints: 0, coin: 100, streakCount: 0,
        inventory: ['theme_cream'],
        equippedDecorations: null,
        equippedBadge: '',
      },
    },
    userNotices: [],
  }, null, 2));

  const env = { ...process.env, FFORUM_DATA_DIR: tmp, FFORUM_MIGRATION_MARKER: markerPath };
  const run = (extra = []) =>
    execFileSync('node', ['scripts/decorations/migrate-decorations.mjs', ...extra], {
      env, encoding: 'utf8', cwd: process.cwd(),
    });

  /* Dry-run trước: chỉ báo cáo, không đổi data, không marker. */
  const dry = run(['--plan=B']);
  assert.ok(dry.includes('DRY-RUN'), 'dry-run chỉ báo cáo');
  assert.ok(!fs.existsSync(markerPath), 'dry-run không ghi marker');

  /* Apply phương án B. */
  const out = run(['--apply', '--plan=B', '--confirm']);
  assert.ok(out.includes('hoàn tất'), 'apply thành công');
  assert.ok(fs.existsSync(markerPath), 'marker được ghi (override env)');
  assert.equal(JSON.parse(fs.readFileSync(markerPath, 'utf8')).applied, true);

  const after = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const boss = after.users['boss@demo.dev'];
  const learner = after.users['learner@demo.dev'];
  assert.ok(!boss.inventory.includes('prism_universe'), 'item mythic cũ bị gỡ');
  assert.ok(!boss.inventory.includes('pencil_starter'), 'item common cũ bị gỡ');
  assert.equal(boss.equippedBadge, '', 'badge cũ được gỡ');
  assert.ok(boss.inventory.length >= 2, '2 gift được tặng');

  /* GIFT ĐÚNG BẬC HIẾM (bugfix rarity) + khớp loại + là item active trong catalog. */
  const giftIds = new Set(boss.inventory);
  const bossGifts = CATALOG.items.filter((i) => giftIds.has(i.id));
  assert.equal(bossGifts.length, 2, 'cả 2 gift đều là item catalog thật');
  const rarities = bossGifts.map((g) => g.rarity).sort();
  assert.deepEqual(rarities, ['common', 'mythic'], 'mythic legacy → gift mythic, common → common (KHÔNG phải common-all)');
  for (const g of bossGifts) {
    assert.ok(['avatar_frame', 'avatar_aura'].includes(g.type), 'legacy khung avatar → gift frame/aura');
    assert.ok(g.isActive, 'gift là item đang bán');
  }

  /* TỰ TRANG BỊ vào slot trống. */
  const deco = boss.equippedDecorations || {};
  const equippedIds = [deco.avatar_frame, deco.avatar_aura, deco.nameplate].filter(Boolean);
  assert.ok(equippedIds.length >= 1, 'ít nhất 1 slot được tự trang bị');
  for (const id of equippedIds) assert.ok(giftIds.has(id), 'chỉ tự trang bị item đã tặng');
  const giftFrame = bossGifts.find((g) => g.type === 'avatar_frame');
  const giftAura = bossGifts.find((g) => g.type === 'avatar_aura');
  if (giftFrame && giftAura) {
    assert.ok(deco.avatar_frame === giftFrame.id || deco.avatar_aura === giftAura.id, 'khung hoặc hào quang được đeo');
  }

  /* Learner: theme common (Theme Focus) → gift aura common. */
  const learnerGift = CATALOG.items.find((i) => learner.inventory.includes(i.id));
  assert.ok(learnerGift, 'learner nhận gift');
  assert.equal(learnerGift.rarity, 'common');
  assert.equal(learnerGift.type, 'avatar_aura');

  /* PAYLOAD thông báo: global (showcase 3 mythic) + cá nhân (gifts + equipped). */
  const notices = after.userNotices;
  const globalNotice = notices.find((n) => n.id === 'server-migration-decoration-replacement' && n.email === '');
  assert.ok(globalNotice, 'thông báo toàn hệ thống');
  assert.equal(globalNotice.payload.kind, 'migration-global');
  assert.equal(globalNotice.payload.showcase.length, 3, 'showcase: top 1 mythic mỗi loại');
  for (const s of globalNotice.payload.showcase) {
    assert.equal(s.rarity, 'mythic');
    assert.ok(s.previewUrl.startsWith('/assets/decorations/'), 'preview url chuẩn');
  }
  const bossNotice = notices.find((n) => n.id === 'server-migration-decoration-replacement-boss@demo.dev');
  assert.ok(bossNotice, 'thông báo cá nhân cho user giữ item cũ');
  assert.equal(bossNotice.payload.kind, 'migration-gift');
  assert.equal(bossNotice.payload.gifts.length, 2);
  for (const g of bossNotice.payload.gifts) {
    assert.ok(g.id && g.name && g.previewUrl, 'gift payload đủ trường cho modal');
  }
  const equippedInPayload = bossNotice.payload.gifts.filter((g) => g.equipped);
  assert.ok(equippedInPayload.length >= 1, 'payload đánh dấu item đã tự trang bị');
  for (const g of equippedInPayload) {
    assert.ok([deco.avatar_frame, deco.avatar_aura, deco.nameplate].includes(g.id), 'equipped khớp slot thật');
  }

  /* Idempotent: chạy lại — không làm gì thêm. */
  const rerunOut = run(['--apply', '--plan=B', '--confirm']);
  assert.ok(rerunOut.includes('idempotent') || rerunOut.includes('đã được áp dụng'), 'chạy lại không làm gì');
  assert.equal(fs.readFileSync(dataPath, 'utf8'), JSON.stringify(after, null, 2), 'data không đổi sau re-run');
});
