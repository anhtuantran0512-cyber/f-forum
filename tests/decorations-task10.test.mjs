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

/* ========================================================================== */
/* 10.8 — Điểm nhấn Boutique: confetti khi trang bị (ruy-băng khai trương đã gỡ) */
/* ========================================================================== */
test('10.8 Boutique: confetti khi trang bị + ruy-băng khai trương/chữ Discord đã gỡ (yêu cầu sếp)', () => {
  const boutique = fs.readFileSync('src/components/shop/GachaBoutique.tsx', 'utf8');
  /* Ruy-băng KHAI TRƯƠNG + nội dung sự kiện đã gỡ theo yêu cầu — không được mọc lại. */
  assert.ok(!boutique.includes('gb-grand-opening'), 'ruy-băng KHAI TRƯƠNG đã gỡ khỏi Boutique');
  assert.ok(!boutique.includes('decorations-migration.json'), 'Boutique không còn đọc marker để hiện sự kiện');
  /* Chữ "trang trí Discord" thừa đã gỡ khỏi văn bản hiển thị. */
  assert.ok(!boutique.includes('trang trí Discord import'), 'không còn chữ "trang trí Discord import" trong UI');

  const css = fs.readFileSync('src/components/shop/Boutique.css', 'utf8');
  assert.ok(!css.includes('.gb-grand-opening'), 'CSS ruy-băng đã gỡ');
  assert.ok(css.includes('prefers-reduced-motion'), 'tôn trọng giảm chuyển động');

  const storeSrc = fs.readFileSync('src/store/forumStore.ts', 'utf8');
  assert.ok(storeSrc.includes('decoEquipBurst'), 'store có trigger confetti trang bị');
  assert.ok(/if \(itemId\)\s*{[\s\S]{0,200}setDecoEquipBurst/.test(storeSrc), 'chỉ bắn khi đeo (không khi gỡ)');

  const appSrc = fs.readFileSync('src/App.tsx', 'utf8');
  const burstCount = appSrc.split('<CelebrationBurst').length - 1;
  assert.ok(burstCount >= 2, 'App có burst riêng cho trang bị (không đụng burst hệ thống)');
  assert.ok(appSrc.includes('decoEquipBurst.tick'), 'trigger đọc từ store');
});

/* ========================================================================== */
/* 10.9 — "Deal hôm nay": tất định theo ngày, giá khớp server, top chất lượng */
/* ========================================================================== */
test('10.9 Deal hôm nay: tất định theo ngày VN, ứng viên từ sale, giá = effectivePrice', () => {
  /* 16 item decoration (8 epic + 8 mythic, qualityScore khác nhau). */
  const mk = (i, rarity, q) => ({
    id: `deco-item-${i}`,
    name: `Item ${i}`,
    price: rarity === 'mythic' ? 6200 : 4100,
    tierColor: rarity === 'mythic' ? 'purple' : 'red',
    description: 'test',
    iconType: 'Decoration',
    category: 'Avatar Frame',
    rarity,
    isAnimated: true,
    previewUrl: `/assets/decorations/avatar-frames/t${i}/preview.webp`,
    fullAssetUrl: `/assets/decorations/avatar-frames/t${i}/full.webp`,
    animatedAssetUrl: `/assets/decorations/avatar-frames/t${i}/animated.webm`,
    originalSource: 'discord_import',
    qualityScore: q,
    addedAt: '2026-09-01',
  });
  const items = [];
  for (let i = 0; i < 8; i += 1) items.push(mk(i, 'epic', 60 + i));
  for (let i = 8; i < 16; i += 1) items.push(mk(i, 'mythic', 70 + i * 2));
  shop.setDecorationPool(items);
  try {
    const now = Date.UTC(2026, 9, 12, 18, 0, 0); /* 01:00 ngày 13/10/2026 giờ VN */
    const weekly = shop.getWeeklyDeal(now, items);
    const flash = shop.getDynamicDiscounts(now, items);
    assert.ok(flash.list.length > 0, 'khung 6h luôn có item sale');
    const input = {
      flashList: flash.list.map((d) => ({ itemId: d.itemId, percent: d.percent, isSuperSale: d.isSuperSale })),
      flashEndsAt: flash.endsAt,
      weekly,
    };
    const deal = deco.getDailyDeal(now, items, input);
    assert.ok(deal, 'có deal hôm nay');
    assert.ok(items.some((i) => i.id === deal.item.id), 'deal là item thật trong catalog');
    /* Ứng viên chỉ gồm item đang sale (flash hoặc ưu đãi tuần). */
    const inFlash = flash.list.some((d) => d.itemId === deal.item.id);
    assert.ok(inFlash || deal.isWeekly, 'deal phải đang flash sale hoặc là ưu đãi tuần');
    /* Giá LUÔN khớp effectivePrice (cùng hàm server tính tiền). */
    assert.equal(deal.price, shop.effectivePrice(deal.item, now), 'giá deal = effectivePrice');
    assert.ok(deal.percent >= 0 && deal.percent <= 90, 'percent hợp lý');
    assert.ok(deal.endsAt > now, 'endsAt trong tương lai');
    /* Tất định: cùng ngày VN + cùng snapshot → cùng item. */
    const again = deco.getDailyDeal(now + 3_600_000, items, input);
    assert.equal(again.item.id, deal.item.id, 'cùng ngày → cùng deal');
    /* Ngày VN khác (cùng snapshot) → deal khác. */
    const nextDay = deco.getDailyDeal(now + 24 * 3600_000, items, input);
    assert.notEqual(nextDay.item.id, deal.item.id, 'ngày sau → deal xoay');
    /* Không có sale nào → null. */
    assert.equal(deco.getDailyDeal(now, items, { flashList: [], flashEndsAt: flash.endsAt, weekly: { itemId: 'chưa-tồn-tại', percent: 20, endsAt: flash.endsAt } }), null);
  } finally {
    shop.setDecorationPool([]);
  }
});

/* ========================================================================== */
/* 10.10 — "Bộ sưu tập": tiến độ theo độ hiếm + vinh danh mythic             */
/* ========================================================================== */
test('10.10 Bộ sưu tập: tiến độ theo rarity, mythic sở hữu top chất lượng', () => {
  const mk = (id, rarity, q) => ({
    id, name: id, price: 100, tierColor: 'green', description: 't', iconType: 'Decoration',
    category: 'Avatar Frame', rarity, isAnimated: false,
    previewUrl: '/x.webp', fullAssetUrl: '/y.webp', animatedAssetUrl: null,
    originalSource: 'discord_import', qualityScore: q,
  });
  const items = [
    mk('c1', 'common', 20), mk('c2', 'common', 30),
    mk('r1', 'rare', 40),
    mk('e1', 'epic', 55), mk('e2', 'epic', 65),
    mk('m1', 'mythic', 80), mk('m2', 'mythic', 90), mk('m3', 'mythic', 70),
  ];
  const stats = deco.getCollectionStats(items, new Set(['c2', 'e2', 'm3', 'm1']));
  assert.equal(stats.total, 8);
  assert.equal(stats.owned, 4);
  assert.equal(stats.percent, 50);
  const row = (r) => stats.byRarity.find((x) => x.rarity === r);
  assert.deepEqual([row('common').total, row('common').owned], [2, 1]);
  assert.deepEqual([row('rare').total, row('rare').owned], [1, 0]);
  assert.deepEqual([row('epic').total, row('epic').owned], [2, 1]);
  assert.deepEqual([row('mythic').total, row('mythic').owned], [3, 2]);
  /* Vinh danh: 2 mythic đã sở hữu (m1 q80, m3 q70) — SẮP XẾP qualityScore giảm. */
  assert.deepEqual(stats.mythicOwned.map((i) => i.id), ['m1', 'm3']);
  assert.ok(stats.mythicOwned.length <= 6, 'tối đa 6 viên ngọc');
  /* Trống: 0 sở hữu. */
  const empty = deco.getCollectionStats(items, new Set());
  assert.equal(empty.owned, 0);
  assert.equal(empty.percent, 0);
  assert.deepEqual(empty.mythicOwned, []);
});

/* ========================================================================== */
/* 10.11 — "Yêu thích" (wishlist): toggle server-persisted + bảo vệ          */
/* ========================================================================== */
test('10.11 Wishlist: add/remove qua API, 400 id rác, 401 khách, persist lại disk', async () => {
  const a = await boot();
  let email;
  try {
    const reg = await post(a.baseUrl, '/api/auth/register', {
      name: 'Wish Tester', email: `deco10.wish.${Date.now()}@example.test`, password: 'mat-khau-deco-10',
    });
    assert.equal(reg.status, 200, JSON.stringify(reg.data));
    const token = reg.data.token;
    email = reg.data.user.email;
    const frame = CATALOG.items.find((i) => i.type === 'avatar_frame');
    const aura = CATALOG.items.find((i) => i.type === 'avatar_aura');

    /* Khách (không token) → 401. */
    const anon = await post(a.baseUrl, '/api/shop/wishlist', { itemId: frame.id });
    assert.equal(anon.status, 401, 'khách không được lưu yêu thích');

    /* Id không phải trang trí → 400. */
    const bad = await post(a.baseUrl, '/api/shop/wishlist', { itemId: 'không-tồn-tại-12345' }, token);
    assert.equal(bad.status, 400, 'id rác phải bị từ chối');

    /* Thêm 2 item. */
    const add1 = await post(a.baseUrl, '/api/shop/wishlist', { itemId: frame.id }, token);
    assert.equal(add1.status, 200, JSON.stringify(add1.data));
    assert.equal(add1.data.added, true);
    assert.deepEqual(add1.data.wishlist, [frame.id]);
    const add2 = await post(a.baseUrl, '/api/shop/wishlist', { itemId: aura.id }, token);
    assert.equal(add2.data.added, true);
    assert.deepEqual(add2.data.wishlist, [frame.id, aura.id]);

    /* Thêm lần nữa = bỏ (toggle) → 200, added=false. */
    const rm = await post(a.baseUrl, '/api/shop/wishlist', { itemId: frame.id }, token);
    assert.equal(rm.status, 200);
    assert.equal(rm.data.added, false);
    assert.deepEqual(rm.data.wishlist, [aura.id]);
  } finally {
    flushPendingSave();
    await a.close();
  }

  /* Persist: disk giữ đúng wishlist cuối. */
  const store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const user = store.users[email];
  const aura = CATALOG.items.find((i) => i.type === 'avatar_aura');
  assert.deepEqual(user.wishlist, [aura.id], 'wishlist được ghi xuống disk');
});

/* ========================================================================== */
/* 10.12 — UI: nút yêu thích + lọc sở hữu + lưu bộ lọc (khớp server)         */
/* ========================================================================== */
test('10.12 UI: nút yêu thích, bộ lọc Đã có/Chưa có, bộ lọc lưu localStorage khớp server', () => {
  const card = fs.readFileSync(path.join(ROOT, 'src', 'components', 'shop', 'GachaBoutique.tsx'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'src', 'components', 'shop', 'Boutique.css'), 'utf8');
  const store = fs.readFileSync(path.join(ROOT, 'src', 'store', 'forumStore.ts'), 'utf8');
  const server = fs.readFileSync(path.join(ROOT, 'server', 'forumServer.ts'), 'utf8');
  const modal = fs.readFileSync(path.join(ROOT, 'src', 'components', 'ProfileModal.tsx'), 'utf8');

  /* Card là div role=button (tránh button lồng button) + nút trái tim thật. */
  assert.match(card, /<div\s+role="button"\s+tabIndex={0}[^]*?gb-card gb-card--/, 'card root = div role=button');
  assert.match(card, /gb-card__wish/, 'nút yêu thích có class riêng');
  assert.match(card, /<Heart size=\{13\}/, 'trái tim là SVG (không emoji)');
  assert.match(card, /event\.stopPropagation\(\);\s*onToggleWishlist\(item\);/, 'nhấn trái tim không mở card');
  assert.match(card, /aria-pressed={wishlist\.includes\(item\.id\)}/, 'trạng thái yêu thích đọc được');

  /* Bộ lọc sở hữu từ panel Bộ sưu tập + áp dụng vào lưới. */
  assert.match(card, /ownedFilter === 'owned' && !inventory\.includes\(item\.id\)/, 'lọc "Đã có" đúng nghĩa');
  assert.match(card, /ownedFilter === 'unowned' && inventory\.includes\(item\.id\)/, 'lọc "Chưa có" đúng nghĩa');
  assert.match(card, /Đã có \(\{collection\.owned\}\)/, 'nút Đã có hiện số lượng');
  assert.match(card, /Chưa có \(\{collection\.total - collection\.owned\}\)/, 'nút Chưa có hiện số lượng');
  assert.match(card, /setRarityFilter\(\(cur\) => \(cur === row\.rarity \? 'all' : row\.rarity\)\)/, 'd Rarity row bấm để lọc');

  /* Bộ lọc GỘP 1 hàng: loại = dropdown, sở hữu = pill, rarity = pill toggle. */
  assert.match(card, /<select[\s\S]{0,400}value={typeFilter}[\s\S]{0,400}gb-filters__type/, 'loại trang trí = dropdown trong hàng filter');
  assert.match(card, /aria-pressed={ownedFilter === 'owned'}[\s\S]{0,400}Đã có \(\{collection\.owned\}\)/, 'pill "Đã có" trong hàng filter (gộp với toggle)');
  assert.match(card, /saveFilters\(\{ type: event\.target\.value \}\)/, 'đổi type được lưu');
  assert.match(card, /saveFilters\(\{ rarity: rarityFilter === rarity \? 'all' : rarity \}\)/, 'đổi rarity được lưu');

  /* Bộ lọc lưu localStorage: 1 key (const), dùng cho cả đọc lẫn ghi. */
  assert.match(card, /const FILTERS_STORAGE_KEY = 'fforum_boutique_filters_v1'/, 'key lưu bộ lọc được khai báo 1 lần');
  assert.match(card, /safeStorage\.getItem\(FILTERS_STORAGE_KEY\)/, 'đọc bộ lọc từ localStorage');
  assert.match(card, /safeStorage\.setItem\(FILTERS_STORAGE_KEY, JSON\.stringify/, 'ghi bộ lọc vào localStorage');
  assert.match(card, /saveFilters\(\{ sort: event\.target\.value \}\)/, 'đổi sort được lưu');

  /* Store: action gọi đúng endpoint của server. */
  assert.match(store, /postStoreAction\('\/api\/shop\/wishlist', \{ itemId \}\)/, 'store gọi đúng endpoint');
  assert.match(server, /url === '\/api\/shop\/wishlist'/, 'server có endpoint wishlist');
  assert.match(server, /isDecorationId\(itemId\)/, 'server validate id qua isDecorationId');

  /* ProfileModal truyền wishlist + handler; chỉ profile mình mới bấm được. */
  assert.match(modal, /wishlist=\{currentUser\.wishlist \|\| \[\]\}/, 'modal truyền wishlist');
  assert.match(modal, /if \(!isOwnProfile\) return;/, 'khách xem profile không đổi yêu thích');

  /* CSS cho nút yêu thích + dropdown loại + stacked bar rarity bấm được. */
  assert.match(css, /\.gb-card__wish \{/, 'CSS nút yêu thích');
  assert.match(css, /\.gb-filters__type \{/, 'CSS dropdown loại trong hàng filter');
  assert.match(css, /\.gb-collection__seg\[aria-pressed="true"\]/, 'stacked bar rarity có trạng thái active');
});

/* ========================================================================== */
/* 10.13 — Đợt #3: lọc giá tối đa + chỉ xem yêu thích + xoá bộ lọc           */
/* ========================================================================== */
test('10.13 Đợt #3: giá tối đa (giá thật), chip Yêu thích, nút Xoá bộ lọc', () => {
  const card = fs.readFileSync(path.join(ROOT, 'src', 'components', 'shop', 'GachaBoutique.tsx'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'src', 'components', 'shop', 'Boutique.css'), 'utf8');

  /* Giá tối đa: lọc theo giá HIỆN HÀNH (min weekly + flash) — khớp giá trên card. */
  assert.match(card, /const weekly = effectivePrice\(item, now\);/, 'dùng effectivePrice (khớp server)');
  assert.match(card, /const flash = dynamicDiscounts\.deals\[item\.id\];[\s\S]{0,160}current > Number\(priceMax\)/, 'áp cả flash sale, so với giới hạn');
  assert.match(card, /if \(wishOnly && !wishlist\.includes\(item\.id\)\) return false;/, 'chip Yêu thích lọc đúng wishlist');
  assert.match(card, /priceMax, dynamicDiscounts, now/, 'deps memo đầy đủ (không stale)');

  /* UI: 3 mức giá + chip yêu thích có số lượng + nút xoá. */
  assert.match(card, /<option value="2500">/, 'mức giá 2.500');
  assert.match(card, /<option value="5000">/, 'mức giá 5.000');
  assert.match(card, /Yêu thích \(\{wishlist\.length\}\)/, 'chip yêu thích hiện số item');
  assert.match(card, /aria-pressed={wishOnly}/, 'trạng thái chip đọc được');
  assert.match(card, /\{hasActiveFilters && \([\s\S]{0,400}Xoá bộ lọc/, 'nút xoá chỉ hiện khi đang lọc');
  assert.match(card, /const resetAllFilters = \(\) => \{[\s\S]{0,500}setPriceMax\('all'\);[\s\S]{0,200}setQuery\(''\);/, 'reset đủ trạng thái');
  assert.match(card, /saveFilters\(\{ type: 'all', rarity: 'all', motion: 'all', price: 'all' \}\)/, 'reset đồng bộ localStorage');

  /* Lưu giá tối đa cùng bộ lọc. */
  assert.match(card, /saveFilters\(\{ price: event\.target\.value \}\)/, 'đổi mức giá được lưu');
  /* Chip nhanh "Giá thấp → cao": 1 chạm bật/tắt sắp xếp giá, đồng bộ với dropdown. */
  assert.match(card, /<TrendingUp size=\{12\} aria-hidden="true" \/> Giá thấp → cao/, 'chip sắp xếp giá nhanh tồn tại');
  assert.match(card, /aria-pressed={sortMode === 'price-asc'}/, 'chip active khớp sortMode');

  /* CSS: chip yêu thích + nút xoá. */
  assert.match(css, /\.gb-filters button\.is-wished/, 'CSS chip yêu thích');
  assert.match(css, /\.gb-searchbar__reset/, 'CSS nút xoá bộ lọc');
});

/* ========================================================================== */
/* 10.14 — Chuẩn Discord: nameplate 1 vị trí + safe zone + 1 modal preview    */
/* ========================================================================== */
test('10.14 Chuẩn Discord: nameplate chỉ ở Hồ Sơ, safe zone aura, 1 preview, filter 1 hàng', () => {
  const awd = fs.readFileSync(path.join(ROOT, 'src', 'components', 'decorations', 'AvatarWithDecoration.tsx'), 'utf8');
  const boutique = fs.readFileSync(path.join(ROOT, 'src', 'components', 'shop', 'GachaBoutique.tsx'), 'utf8');
  const decoCss = fs.readFileSync(path.join(ROOT, 'src', 'components', 'decorations', 'decorations.css'), 'utf8');
  const zones = fs.readFileSync(path.join(ROOT, 'src', 'utils', 'decorationSafeZones.ts'), 'utf8');

  /* 1.2 — Nameplate KHÔNG thể render qua AvatarWithDecoration (mọi context nhỏ). */
  assert.ok(!awd.includes('<NameplateDisplay'), 'AvatarWithDecoration không render NameplateDisplay');
  assert.ok(!awd.includes('import { NameplateDisplay }'), 'không import NameplateDisplay');
  assert.ok(!awd.includes('nameplateAsset'), 'không còn prop nameplateAsset');

  /* 1.1 — Nameplate = background thuần + text HTML riêng, height cố định, ellipsis. */
  assert.match(decoCss, /\.npd-np \{[\s\S]{0,300}aspect-ratio: 448 \/ 84;/, 'height cố định theo tỉ lệ asset (không giãn theo tên)');
  assert.match(decoCss, /\.npd-np \{[\s\S]{0,300}overflow: hidden;/, 'khung nameplate overflow hidden');
  assert.match(decoCss, /\.npd-np__text \{[\s\S]{0,400}white-space: nowrap;[\s\S]{0,200}text-overflow: ellipsis;/, 'tên dài chỉ ellipsis, không tràn');
  assert.match(decoCss, /\.npd-np__text \{[\s\S]{0,200}z-index: 2;/, 'text là lớp riêng z2 trên nền z1');
  assert.match(decoCss, /object-fit: cover;/, 'background layer cover khung');

  /* 2 — Safe zone: config theo id, áp dụng transform cho slot aura/frame. */
  assert.match(zones, /'frame-air': \{ dx: 3, dy: -3 \}/, 'Air có config căn tâm riêng');
  assert.match(zones, /export const getDecorationSafeZone = /, 'trợ lý tra safe zone');
  assert.match(awd, /getDecorationSafeZone/, 'slot aura/frame tra safe zone');
  assert.match(awd, /transform: `translate\(\$\{z\.dx \|\| 0\}%, \$\{z\.dy \|\| 0\}%\) scale\(\$\{z\.scale \?\? 1\}\)`/, 'áp dụng translate+scale theo config');

  /* 3 — 1 modal preview duy nhất: hero banner không có nút riêng. */
  assert.ok(!boutique.includes('Xem thử trên Avatar'), 'bỏ nút "Xem thử trên Avatar" riêng');
  assert.ok(!boutique.includes('gb-hero-cta'), 'không còn CTA hero riêng');
  assert.match(boutique, /className="gb-hero-carousel"[\s\S]{0,300}setInspectId\(currentHeroItem\.id\)/, 'bấm banner → mở modal preview chung');

  /* 4 — Gộp filter 1 hàng + không lặp số "873" ở header. */
  assert.ok(!boutique.includes('gb-filters--sub'), 'không còn 2 hàng filter');
  assert.ok(!boutique.includes('trang trí · F-Coin'), 'header không còn count lặp');
  assert.match(boutique, /<span className="gb-collection__count">/, 'chỉ "Bộ sưu tập" hiển thị tổng');
  assert.match(boutique, /gb-collection__stack/, 'rarity breakdown = 1 stacked bar compact');

  /* 5 — "Xem khi đeo": context nhỏ 40px chuẩn; nameplate = thông báo (không render). */
  assert.match(boutique, /size=\{40\}[\s\S]{0,120}eager[\s\S]{0,120}alt=\{userName\}/, 'context nhỏ dùng AvatarWithDecoration 40px');
  assert.match(boutique, /Nameplate chỉ hiển thị trên <b>Hồ Sơ đầy đủ<\/b>/, 'nameplate ở context nhỏ → thông báo');
  assert.match(boutique, /gb-np-note/, 'try-on dock nameplate có note');
});
