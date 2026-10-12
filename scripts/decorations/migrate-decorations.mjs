#!/usr/bin/env node
/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Nhiệm vụ 10 — Migration thay item SVG cũ bằng trang trí Discord import.
 *
 * ⚠️ Mặc định là DRY-RUN: chỉ QUERRY và BÁO CÁO inventory đang giữ item cũ —
 * không chạm dữ liệu. Chạy apply KHI server ĐÃ TẮT:
 *   node scripts/decorations/migrate-decorations.mjs --apply --plan=A --confirm
 *   node scripts/decorations/migrate-decorations.mjs --apply --plan=B --confirm
 *
 *   Phương án A — hoàn 100% Coin: mỗi item cũ bị gỡ khỏi inventory được hoàn
 *     giá MUA THEO CATALOG (giá niêm yết, không phải giá đang giảm).
 *   Phương án B — đổi item mới cùng độ hiếm (PHƯƠNG ÁN ĐÃ CHỌN — tạo điểm
 *     nhấn trực quan): mỗi item cũ được thay bằng MỘT item Discord import
 *     CÙNG BẬC HIẾM (tierColor→rarity), khớp loại với hạng mục item cũ
 *     (khung avatar → frame/aura, hiệu ứng → aura, góc hồ sơ → nameplate…),
 *     ưu tiên item ĐỘNG và chất lượng cao (qualityScore), chọn tất định theo
 *     hash(email+id) để chạy lại cho ra cùng kết quả. Item được tặng sẽ TỰ
 *     ĐỘNG TRANG BỊ vào slot trống (equippedDecorations) — avatar mới ngay.
 *
 * Cả hai phương án:
 *   - equippedBadge nếu là item cũ → bỏ ('');
 *   - equippedDecorations: chỉ chạm slot còn TRỐNG (không ghi đè item mới
 *     user đã đeo);
 *   - ghi thông báo in-app (store.userNotices, id server-migration-…) kèm
 *     PAYLOAD (gifts/showcase) để client mở màn hình ăn mừng
 *     (MigrationCelebrationModal) với preview thật của item;
 *   - backup file data TRƯỚC khi ghi; ghi atomic (tmp + rename);
 *   - idempotent: marker store.migrations['decoration-replacement'] + file
 *     public/assets/decorations/decorations-migration.json (server đọc marker
 *     để soft-delete item cũ sau migration).
 *
 * LƯU Ý: data path FFORUM_DATA_DIR (mặc định ./data/forum-data.json) — cùng
 * công thức server dùng. Marker là artifact triển khai: KHÔNG commit.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEGACY_SVG_ITEMS, LEGACY_SHOP_ITEM_IDS, RARITY_OF_TIER } from '../../src/utils/shopData.ts';
import { catalogToShopItems } from '../../src/utils/decorations.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = process.env.FFORUM_DATA_DIR
  ? path.resolve(process.env.FFORUM_DATA_DIR)
  : path.resolve(PROJECT_ROOT, 'data');
const DATA_PATH = path.join(DATA_DIR, 'forum-data.json');
const CATALOG_PATH = path.resolve(PROJECT_ROOT, 'public/assets/decorations/decorations-catalog.json');
/* Marker mặc định nằm trong public/ (server đọc); test override bằng env để
   không bẩn repo (marker là artifact triển khai — KHÔNG commit). */
const MARKER_PATH = process.env.FFORUM_MIGRATION_MARKER
  ? path.resolve(process.env.FFORUM_MIGRATION_MARKER)
  : path.resolve(PROJECT_ROOT, 'public/assets/decorations/decorations-migration.json');
const MIGRATION_KEY = 'decoration-replacement';
/* Khớp MAX_USER_COIN của server/forumServer.ts. */
const MAX_USER_COIN = 10_000_000;
const NOW = Date.now();

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const CONFIRM = args.has('--confirm');
const planFlag = [...args].find((a) => a.startsWith('--plan='));
const PLAN = planFlag ? planFlag.split('=')[1] : null;
if (planFlag && !['A', 'B'].includes(PLAN)) {
  console.error('❌ --plan=A hoặc --plan=B');
  process.exit(2);
}
if (APPLY && (!PLAN || !CONFIRM)) {
  console.error('❌ --apply bắt buộc kèm --plan=A|B và --confirm (chống chạy nhầm).');
  process.exit(2);
}

const fail = (message) => {
  console.error(`❌ ${message}`);
  process.exit(1);
};

/* ------------------------------------------------------------------ */
/* Đọc dữ liệu + catalog                                               */
/* ------------------------------------------------------------------ */
let store = null;
try {
  store = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
} catch {
  console.log('ℹ️ Không tìm thấy file dữ liệu (data/forum-data.json) — chưa có user thật nào.');
  console.log('   Migration không có việc gì phải làm. Khi có dữ liệu, chạy lại script này.');
  process.exit(0);
}
if (!store || typeof store.users !== 'object' || store.users === null) {
  fail(`File ${DATA_PATH} không giống forum-data.json (thiếu users).`);
}

let catalog = null;
try {
  catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
} catch {
  fail(`Không đọc được catalog ${CATALOG_PATH} — chưa build asset? (scripts/decorations/pipeline.mjs)`);
}
const newItems = catalogToShopItems(catalog);
if (newItems.length === 0) fail('Catalog rỗng — không có item mới nào để đổi (phương án B).');

/* Hạng mục item cũ → loại item mới ưu tiên (tạo điểm nhấn đúng ngữ cảnh). */
const TYPE_PRIORITY_BY_CATEGORY = {
  'Khung avatar': ['avatar_frame', 'avatar_aura'],
  'Hiệu ứng': ['avatar_aura', 'avatar_frame'],
  'Theme Focus': ['avatar_aura', 'avatar_frame'],
  'Góc hồ sơ': ['nameplate', 'avatar_aura'],
};
const FALLBACK_TYPES = ['avatar_frame', 'avatar_aura', 'nameplate'];

/* Pool item mới theo rarity → type (dùng entry NGUYÊN của catalog: có type,
   isAnimated, qualityScore, assetPath). Sắp quality giảm → tên, tất định. */
const poolByRarityType = new Map();
for (const entry of catalog.items || []) {
  if (!entry.isActive) continue;
  const byType = poolByRarityType.get(entry.rarity) || new Map();
  const list = byType.get(entry.type) || [];
  list.push(entry);
  byType.set(entry.type, list);
  poolByRarityType.set(entry.rarity, byType);
}
for (const byType of poolByRarityType.values()) {
  for (const list of byType.values()) {
    list.sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0) || a.name.localeCompare(b.name, 'vi'));
  }
}

/* Chọn tất định: hash FNV-1a(email + '|' + legacyId) mod độ dài pool.
   Ưu tiên pool ĐỘNG (điểm nhấn animation); rỗng thì lấy pool tĩnh; rồi loại
   tiếp theo theo TYPE_PRIORITY. */
const fnv1a = (text) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};
const pickReplacement = (email, legacyId, legacyRarity, legacyCategory) => {
  const order = TYPE_PRIORITY_BY_CATEGORY[legacyCategory] || FALLBACK_TYPES;
  const byType = poolByRarityType.get(poolRarityOf(legacyRarity));
  if (!byType) return null;
  for (const type of order) {
    const list = byType.get(type) || [];
    if (list.length === 0) continue;
    const animated = list.filter((item) => item.isAnimated);
    const pool = animated.length > 0 ? animated : list;
    return pool[fnv1a(`${email}|${legacyId}`) % pool.length];
  }
  return null;
};

/* Entry gift cho payload thông báo (client render preview thật). */
const giftPayload = (entry) => ({
  id: entry.id,
  name: entry.name,
  rarity: entry.rarity,
  isAnimated: !!entry.isAnimated,
  previewUrl: entry.assetPath.preview,
  fullUrl: entry.assetPath.fullWebp,
  equipped: false, /* cập nhật ở bước auto-equip */
});

/* Bộ trưng bày toàn hệ thống: top 1 MYTHIC mỗi loại (frame, aura, nameplate)
   — điểm nhấn "những viên ngọc" của bộ sưu tập mới. */
const buildShowcase = () => {
  const out = [];
  for (const type of ['avatar_frame', 'avatar_aura', 'nameplate']) {
    const top = (poolByRarityType.get('mythic')?.get(type) || [])[0];
    if (top) out.push(giftPayload(top));
  }
  return out;
};

/* ------------------------------------------------------------------ */
/* Chặn chạy trùng (idempotent)                                        */
/* ------------------------------------------------------------------ */
const alreadyApplied =
  (store.migrations && typeof store.migrations[MIGRATION_KEY] === 'number') ||
  (() => {
    try {
      return JSON.parse(fs.readFileSync(MARKER_PATH, 'utf8')).applied === true;
    } catch {
      return false;
    }
  })();
if (alreadyApplied) {
  console.log(`✅ Migration ${MIGRATION_KEY} đã được áp dụng trước đó — không làm gì thêm (idempotent).`);
  process.exit(0);
}

/* ------------------------------------------------------------------ */
/* Querry inventory giữ item cũ                                        */
/* ------------------------------------------------------------------ */
const legacyItemById = new Map(LEGACY_SVG_ITEMS.map((item) => [item.id, item]));
/* BUGFIX 1: LEGACY_SVG_ITEMS không có trường rarity — suy ra từ tierColor
   (green=common, blue=rare, red=epic, purple=legendary). Script cũ đọc
   legacy?.rarity (undefined) → mọi gift đều common, kể cả user giữ item top.
   BUGFIX 2: bậc cao nhất của hệ cũ là 'legendary', của catalog mới là
   'mythic' — phải map khi tra pool, nếu không user giữ item top không nhận
   được gì ("KHÔNG có item cùng hiếm!"). */
const legacyRarityOf = (item) => (item ? RARITY_OF_TIER[item.tierColor] || 'common' : 'common');
const poolRarityOf = (rarity) => (rarity === 'legendary' ? 'mythic' : rarity);

const affected = [];
for (const [email, user] of Object.entries(store.users)) {
  const inventory = Array.isArray(user.inventory) ? user.inventory : [];
  const held = inventory.filter((id) => LEGACY_SHOP_ITEM_IDS.has(id));
  if (held.length === 0) continue;
  const refundTotal = held.reduce((sum, id) => sum + (legacyItemById.get(id)?.price || 0), 0);
  const gifts = held.map((id) => {
    const legacy = legacyItemById.get(id);
    const rarity = legacyRarityOf(legacy);
    return {
      legacyId: id,
      legacyName: legacy?.name || id,
      legacyCategory: legacy?.category || '',
      rarity,
      refund: legacy?.price || 0,
      gift: PLAN === 'B' || !PLAN ? pickReplacement(email, id, rarity, legacy?.category) : null,
    };
  });
  const badgeLost = typeof user.equippedBadge === 'string' && held.includes(user.equippedBadge);
  affected.push({ email, user, held, refundTotal, gifts, badgeLost });
}

const totalRefund = affected.reduce((sum, entry) => sum + entry.refundTotal, 0);
const totalSwapped = affected.reduce((sum, entry) => sum + entry.held.length, 0);

/* ------------------------------------------------------------------ */
/* Báo cáo                                                             */
/* ------------------------------------------------------------------ */
console.log('══════════════════════════════════════════════════════════════');
console.log(APPLY ? 'MIGRATION TRANG TRÍ — CHẾ ĐỘ APPLY (đã --confirm)' : 'MIGRATION TRANG TRÍ — DRY-RUN (chỉ báo cáo, không đổi data)');
console.log('══════════════════════════════════════════════════════════════');
console.log(`File data   : ${DATA_PATH}`);
console.log(`Tổng user   : ${Object.keys(store.users).length}`);
console.log(`User giữ item cũ: ${affected.length}`);
console.log(`Item cũ liên quan: ${totalSwapped} (trong ${affected.length} inventory)`);
console.log(`Tổng giá hoàn (phương án A): ${totalRefund.toLocaleString('vi-VN')} Coin`);
console.log('');

if (affected.length === 0) {
  console.log('✅ Không có user nào giữ item SVG cũ — migration không cần làm gì.');
  process.exit(0);
}

const showPlan = (plan) => {
  console.log(`— Phương án ${plan === 'A' ? 'A · Hoàn 100% Coin theo giá catalog' : 'B · Đổi 1 item Discord mới cùng độ hiếm (động + chất lượng, tự trang bị)'} —`);
  for (const entry of affected) {
    console.log(`  • ${entry.email}`);
    for (const gift of entry.gifts) {
      const right =
        plan === 'A'
          ? `hoàn ${gift.refund.toLocaleString('vi-VN')} Coin`
          : `→ ${gift.gift ? `${gift.gift.name} (${gift.gift.id}, ${gift.gift.rarity}, ${gift.gift.isAnimated ? 'động' : 'tĩnh'})` : 'KHÔNG có item cùng hiếm!'}`;
      console.log(`      - ${gift.legacyName} [${gift.rarity}]  ${right}`);
    }
    if (entry.badgeLost) console.log('      ⚠ badge đang đeo là item cũ → sẽ được gỡ (equippedBadge = "")');
  }
  console.log('');
};

if (!APPLY) {
  if (PLAN) showPlan(PLAN);
  else {
    showPlan('A');
    showPlan('B');
    console.log('Để áp dụng (khi đã chọn): tắt server rồi chạy');
    console.log('  node scripts/decorations/migrate-decorations.mjs --apply --plan=A --confirm');
    console.log('  node scripts/decorations/migrate-decorations.mjs --apply --plan=B --confirm');
    console.log('Script sẽ backup data, đổi inventory/coin, tự trang bị item mới, ghi thông báo');
    console.log('ăn mừng (kèm payload preview) + marker. Marker KHÔNG commit (artifact triển khai).');
  }
  process.exit(0);
}

/* ------------------------------------------------------------------ */
/* APPLY — backup → đổi data → atomic write → marker + thông báo       */
/* ------------------------------------------------------------------ */
const stamp = new Date(NOW).toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(DATA_DIR, `forum-data.backup-${stamp}.json`);
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.copyFileSync(DATA_PATH, backupPath);
console.log(`📦 Đã backup → ${backupPath}`);

const showcase = buildShowcase();

/* Thông báo TOÀN HỆ THỐNG — mọi user đều thấy màn hình ăn mừng (kèm showcase
   3 viên ngọc mythic) kể cả user không giữ item cũ. */
store.userNotices = Array.isArray(store.userNotices) ? [...store.userNotices] : [];
store.userNotices.push({
  id: `server-migration-${MIGRATION_KEY}`,
  email: '',
  title: 'Khai trương 873 trang trí Discord — Boutique mới đã sẵn sàng',
  body:
    PLAN === 'B'
      ? 'Hệ thống trang trí Discord (khung avatar, hào quang, bảng tên) chính thức mở cửa. Nếu bạn đang dùng vật phẩm SVG cũ, chúng đã được NÂNG CẤP MIỄN PHÍ thành trang trí Discord cùng độ hiếm và tự động đeo lên avatar. Xem những viên ngọc Huyền thoại mới nổi bật nhất ngay đây!'
      : 'Hệ thống trang trí Discord (khung avatar, hào quang, bảng tên) chính thức mở cửa. Coin bạn đã trả cho vật phẩm SVG cũ được HOÀN 100%. Xem những viên ngọc Huyền thoại mới nổi bật nhất ngay đây!',
  at: NOW,
  readAt: null,
  payload: { kind: 'migration-global', plan: PLAN, showcase },
});

const planLabel = PLAN === 'A' ? 'A (hoàn 100% Coin)' : 'B (đổi item cùng hiếm, tự trang bị)';
for (const entry of affected) {
  const kept = entry.user.inventory.filter((id) => !LEGACY_SHOP_ITEM_IDS.has(id));
  const giftEntries = (PLAN === 'B' ? entry.gifts.map((g) => g.gift).filter(Boolean) : []);
  const giftedIds = [...new Set(giftEntries.map((g) => g.id))];
  entry.user.inventory = [...new Set([...kept, ...giftedIds])];
  if (PLAN === 'A') {
    entry.user.coin = Math.min(MAX_USER_COIN, (Number.isFinite(entry.user.coin) ? entry.user.coin : 0) + entry.refundTotal);
  }
  if (entry.badgeLost) entry.user.equippedBadge = '';

  /* Tự động trang bị (chỉ slot TRỐNG — không ghi đè item mới user đã đeo).
     Mỗi loại chọn gift chất lượng cao nhất (qualityScore). */
  const payloadGifts = giftEntries.map(giftPayload);
  const equippedSet = new Set();
  if (PLAN === 'B') {
    const deco = { ...(entry.user.equippedDecorations || { avatar_frame: null, avatar_aura: null, nameplate: null }) };
    for (const type of ['avatar_frame', 'avatar_aura', 'nameplate']) {
      if (deco[type]) continue;
      const candidates = giftEntries
        .filter((g) => g.type === type)
        .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));
      if (candidates.length > 0) {
        deco[type] = candidates[0].id;
        equippedSet.add(candidates[0].id);
      }
    }
    entry.user.equippedDecorations = deco;
    for (const g of payloadGifts) g.equipped = equippedSet.has(g.id);
  }
  entry.user.inventory = entry.user.inventory.slice(0, 2000);

  store.userNotices.push({
    id: `server-migration-${MIGRATION_KEY}-${entry.email}`,
    email: entry.email,
    title:
      PLAN === 'A'
        ? `Hoàn ${entry.refundTotal.toLocaleString('vi-VN')} Coin — Boutique làm mới`
        : equippedSet.size > 0
          ? `Bạn có ${giftedIds.length} trang trí mới — đã tự động trang bị cho bạn`
          : `Bạn có ${giftedIds.length} trang trí mới trong Boutique`,
    body:
      PLAN === 'A'
        ? `Gỡ ${entry.held.length} vật phẩm cũ: ${entry.held.map((id) => legacyItemById.get(id)?.name || id).join(', ')} → hoàn ${entry.refundTotal.toLocaleString('vi-VN')} Coin. 873 trang trí Discord đang chờ ở Boutique.`
        : `Nâng cấp miễn phí — ${entry.held.length} vật phẩm SVG cũ được đổi thành: ${giftEntries.map((g) => g.name).join(', ')}. Mở Boutique để khám phá 800+ trang trí còn lại.`,
    at: NOW,
    readAt: null,
    payload:
      PLAN === 'A'
        ? { kind: 'migration-refund', plan: 'A', showcase }
        : { kind: 'migration-gift', plan: 'B', gifts: payloadGifts },
  });
  console.log(`✔ ${entry.email}: gỡ ${entry.held.length} item${PLAN === 'A' ? `, hoàn ${entry.refundTotal.toLocaleString('vi-VN')} Coin` : `, tặng ${giftedIds.length} item (tự trang bị ${equippedSet.size})`}${entry.badgeLost ? ', gỡ badge' : ''}`);
}

store.migrations = { ...(store.migrations || {}), [MIGRATION_KEY]: NOW };

const tmpPath = `${DATA_PATH}.tmp-${process.pid}`;
fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf8');
fs.renameSync(tmpPath, DATA_PATH);

fs.writeFileSync(
  MARKER_PATH,
  JSON.stringify({ applied: true, plan: PLAN, at: NOW, usersAffected: affected.length, itemsSwapped: totalSwapped, backup: path.relative(PROJECT_ROOT, backupPath) }, null, 2),
  'utf8',
);
console.log('');
console.log(`✅ Migration ${planLabel} hoàn tất: ${affected.length} user, ${totalSwapped} item.`);
console.log(`   Marker: ${path.relative(PROJECT_ROOT, MARKER_PATH)} — server sẽ soft-delete item cũ từ đây.`);
console.log('   ⚠ Marker là artifact triển khai — KHÔNG commit vào git.');
