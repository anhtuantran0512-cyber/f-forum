#!/usr/bin/env node
/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Nhiệm vụ 10 — Migration thay item SVG cũ bằng trang trí Discord import.
 *
 * ⚠️ CHƯA BAO GIỜ tự chạy bước --apply. Mặc định là DRY-RUN: chỉ QUERRY và
 * BÁO CÁO inventory đang giữ item cũ — không chạm dữ liệu.
 *
 * Khi user đã CHỌN phương án (A hoặc B), lệnh apply là:
 *   node scripts/decorations/migrate-decorations.mjs --apply --plan=A --confirm
 *   node scripts/decorations/migrate-decorations.mjs --apply --plan=B --confirm
 *
 *   Phương án A — hoàn 100% Coin: mỗi item cũ bị gỡ khỏi inventory được hoàn
 *     giá MUA THEO CATALOG (giá niêm yết, không phải giá đang giảm).
 *   Phương án B — đổi item mới cùng độ hiếm: mỗi item cũ được thay bằng MỘT
 *     item Discord import cùng bậc hiếm (chọn tất định theo hash(email+id)
 *     để chạy lại cho ra cùng kết quả).
 *
 * Cả hai phương án:
 *   - equippedBadge nếu là item cũ → bỏ ('');
 *   - equippedDecorations (hệ slot mới) KHÔNG bị đụng;
 *   - ghi thông báo in-app (store.userNotices, id server-migration-…) để user
 *     thấy kết quả ngay khi mở app;
 *   - backup file data TRƯỚC khi ghi; ghi atomic (tmp + rename);
 *   - idempotent: marker store.migrations['decoration-replacement'] + file
 *     public/assets/decorations/decorations-migration.json (server đọc marker
 *     để soft-delete item cũ sau migration).
 *
 * LƯU Ý: chạy --apply khi server ĐÃ TẮT (store in-memory có thể ghi đè file
 * khi thoát). Data path: FFORUM_DATA_DIR (mặc định ./data/forum-data.json)
 * — cùng công thức server dùng.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEGACY_SVG_ITEMS, LEGACY_SHOP_ITEM_IDS } from '../../src/utils/shopData.ts';
import { catalogToShopItems } from '../../src/utils/decorations.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = process.env.FFORUM_DATA_DIR
  ? path.resolve(process.env.FFORUM_DATA_DIR)
  : path.resolve(PROJECT_ROOT, 'data');
const DATA_PATH = path.join(DATA_DIR, 'forum-data.json');
const CATALOG_PATH = path.resolve(PROJECT_ROOT, 'public/assets/decorations/decorations-catalog.json');
const MARKER_PATH = path.resolve(PROJECT_ROOT, 'public/assets/decorations/decorations-migration.json');
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
const newItemById = new Map(newItems.map((item) => [item.id, item]));

/* Pool item mới theo bậc hiếm (sort tên để chọn tất định). */
const poolByRarity = new Map();
for (const item of newItems) {
  if (!item.isActive) continue;
  const list = poolByRarity.get(item.rarity) || [];
  list.push(item);
  poolByRarity.set(item.rarity, list);
}
for (const list of poolByRarity.values()) list.sort((a, b) => a.name.localeCompare(b.name, 'vi'));

/* Chọn tất định: hash FNV-1a(email + '|' + legacyId) mod độ dài pool. */
const fnv1a = (text) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};
const pickReplacement = (email, legacyId, legacyRarity) => {
  const pool = poolByRarity.get(legacyRarity) || [];
  if (pool.length === 0) return null;
  return pool[fnv1a(`${email}|${legacyId}`) % pool.length];
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
const affected = [];
for (const [email, user] of Object.entries(store.users)) {
  const inventory = Array.isArray(user.inventory) ? user.inventory : [];
  const held = inventory.filter((id) => LEGACY_SHOP_ITEM_IDS.has(id));
  if (held.length === 0) continue;
  const refundTotal = held.reduce((sum, id) => sum + (legacyItemById.get(id)?.price || 0), 0);
  const gifts = held.map((id) => {
    const legacy = legacyItemById.get(id);
    return {
      legacyId: id,
      legacyName: legacy?.name || id,
      rarity: legacy?.rarity || 'common',
      refund: legacy?.price || 0,
      gift: PLAN === 'B' || !PLAN ? pickReplacement(email, id, legacy?.rarity || 'common') : null,
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
  console.log(`— Phương án ${plan === 'A' ? 'A · Hoàn 100% Coin theo giá catalog' : 'B · Đổi 1 item Discord mới cùng độ hiếm'} —`);
  for (const entry of affected) {
    console.log(`  • ${entry.email}`);
    for (const gift of entry.gifts) {
      const right =
        plan === 'A'
          ? `hoàn ${gift.refund.toLocaleString('vi-VN')} Coin`
          : `→ ${gift.gift ? `${gift.gift.name} (${gift.gift.id}, ${gift.gift.rarity}, ${gift.gift.price.toLocaleString('vi-VN')} Coin)` : 'KHÔNG có item cùng hiếm!'}`;
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
    console.log('Script sẽ backup data, đổi inventory/coin, ghi thông báo in-app + marker.');
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

store.userNotices = Array.isArray(store.userNotices) ? [...store.userNotices] : [];
store.userNotices.push({
  id: `server-migration-${MIGRATION_KEY}`,
  email: '',
  title: 'Boutique đã làm mới — vật phẩm trang trí cũ được thay thế',
  body:
    PLAN === 'A'
      ? 'Toàn bộ vật phẩm SVG cũ trong Boutique đã ngừng bán. Coin bạn đã trả cho những vật phẩm đó đã được HOÀN 100% theo giá catalog. Trang trí mới (khung / hào quang / bảng tên) đang chờ ở Boutique.'
      : 'Toàn bộ vật phẩm SVG cũ trong Boutique đã ngừng bán và được ĐỔI bằng vật phẩm Discord cùng độ hiếm. Vào Boutique để xem và đeo trang trí mới.',
  at: NOW,
  readAt: null,
});

const planLabel = PLAN === 'A' ? 'A (hoàn 100% Coin)' : 'B (đổi item cùng hiếm)';
for (const entry of affected) {
  const kept = entry.user.inventory.filter((id) => !LEGACY_SHOP_ITEM_IDS.has(id));
  const giftedIds = PLAN === 'B' ? entry.gifts.map((g) => g.gift?.id).filter(Boolean) : [];
  entry.user.inventory = [...new Set([...kept, ...giftedIds])];
  if (PLAN === 'A') {
    entry.user.coin = Math.min(MAX_USER_COIN, (Number.isFinite(entry.user.coin) ? entry.user.coin : 0) + entry.refundTotal);
  }
  if (entry.badgeLost) entry.user.equippedBadge = '';
  entry.user.inventory = entry.user.inventory.slice(0, 2000);
  store.userNotices.push({
    id: `server-migration-${MIGRATION_KEY}-${entry.email}`,
    email: entry.email,
    title: PLAN === 'A' ? `Hoàn ${entry.refundTotal.toLocaleString('vi-VN')} Coin — Boutique làm mới` : 'Bạn có trang trí mới trong Boutique',
    body:
      PLAN === 'A'
        ? `Gỡ ${entry.held.length} vật phẩm cũ: ${entry.held.map((id) => legacyItemById.get(id)?.name || id).join(', ')} → hoàn ${entry.refundTotal.toLocaleString('vi-VN')} Coin.`
        : `Đổi ${entry.held.length} vật phẩm cũ → ${giftedIds.map((id) => newItemById.get(id)?.name || id).join(', ')}.`,
    at: NOW,
    readAt: null,
  });
  console.log(`✔ ${entry.email}: gỡ ${entry.held.length} item${PLAN === 'A' ? `, hoàn ${entry.refundTotal.toLocaleString('vi-VN')} Coin` : `, tặng ${giftedIds.length} item`}${entry.badgeLost ? ', gỡ badge' : ''}`);
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
