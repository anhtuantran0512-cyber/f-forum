/* Bản quyền trí tuệ thuộc về BroAmStuck */
/*
 * Nhiệm vụ 10 — registry trang trí phía server:
 *  - đọc decorations-catalog.json trên disk (cache theo mtime — không fetch);
 *  - getShopItemById: trỏ item từ BOTH 35 item SVG cũ (soft-delete) + catalog;
 *  - isKnownInventoryId: inventory hợp lệ gồm item đã biết + id decoration đúng hình thức
 *    (khống chế kích thước, giữ id lạ có hình thức frame-…/nameplate-… để không mất data
 *    khi catalog được thêm item mới);
 *  - decorationSlotForId: slot của item (avatar_frame / avatar_aura / nameplate).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHOP_ITEMS, setDecorationPool } from '../src/utils/shopData.ts';
import { catalogEntryToShopItem, type DecorationCatalog, isDecorationId } from '../src/utils/decorations.ts';
import type { ShopItem } from '../src/types/index.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.resolve(__dirname, '..', 'public', 'assets', 'decorations', 'decorations-catalog.json');
/* Marker do scripts/decorations/migrate-decorations.mjs ghi SAU khi user chọn kế hoạch A/B.
   Chưa có file → item SVG cũ vẫn bán bình thường (chưa migration). */
const MIGRATION_MARKER_PATH = path.resolve(__dirname, '..', 'public', 'assets', 'decorations', 'decorations-migration.json');

const readMigrationMarker = (): { mtimeMs: number | null; applied: boolean } => {
  try {
    const stat = fs.statSync(MIGRATION_MARKER_PATH);
    let applied = false;
    try {
      applied = JSON.parse(fs.readFileSync(MIGRATION_MARKER_PATH, 'utf8')).applied === true;
    } catch {
      applied = false;
    }
    return { mtimeMs: stat.mtimeMs, applied };
  } catch {
    return { mtimeMs: null, applied: false };
  }
};

export interface DecorationRegistry {
  items: Map<string, ShopItem>;
  /** id → slot (chỉ item decoration). */
  slots: Map<string, 'avatar_frame' | 'avatar_aura' | 'nameplate'>;
  /** id trang trí đang bán (isActive) — gacha / mua mới chỉ dùng pool này. */
  activeIds: Set<string>;
}

let registryCache: DecorationRegistry | null = null;
let cachedCatalogMtimeMs: number | null = null;
let cachedMarkerMtimeMs: number | null = null;

const buildRegistry = (catalog: DecorationCatalog | null, legacyActive: boolean): DecorationRegistry => {
  const items = new Map<string, ShopItem>();
  const slots = new Map<string, 'avatar_frame' | 'avatar_aura' | 'nameplate'>();
  const activeIds = new Set<string>();
  for (const item of SHOP_ITEMS) {
    /* Sau migration (A/B) → item SVG cũ bị soft-delete; trước đó vẫn bán. */
    items.set(item.id, legacyActive ? item : { ...item, isActive: false });
  }
  if (catalog && Array.isArray(catalog.items)) {
    for (const entry of catalog.items) {
      const shopItem = catalogEntryToShopItem(entry);
      items.set(shopItem.id, shopItem);
      slots.set(shopItem.id, entry.type);
      if (shopItem.isActive) activeIds.add(shopItem.id);
    }
  }
  return { items, slots, activeIds };
};

/** Đọc registry (cache theo mtime file catalog + mtime marker migration). */
export const getDecorationRegistry = (): DecorationRegistry => {
  let mtimeMs: number | null = null;
  try {
    mtimeMs = fs.statSync(CATALOG_PATH).mtimeMs;
  } catch {
    mtimeMs = null;
  }
  const marker = readMigrationMarker();
  if (registryCache && cachedCatalogMtimeMs === mtimeMs && cachedMarkerMtimeMs === marker.mtimeMs) return registryCache;
  let catalog: DecorationCatalog | null = null;
  if (mtimeMs !== null) {
    try {
      catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8')) as DecorationCatalog;
    } catch {
      catalog = null;
    }
  }
  registryCache = buildRegistry(catalog, !marker.applied);
  cachedCatalogMtimeMs = mtimeMs;
  cachedMarkerMtimeMs = marker.mtimeMs;
  /* Đồng bộ pool decoration vào shopData để effectivePrice/flash máy chủ
     khớp client (cùng danh sách, cùng thứ tự catalog). */
  setDecorationPool(getActiveDecorationItems());
  return registryCache;
};

/** Reset cache — chỉ dùng cho test (DATA_DIR tạm). */
export const resetDecorationRegistryForTest = (): void => {
  registryCache = null;
  cachedCatalogMtimeMs = null;
  cachedMarkerMtimeMs = null;
};

export const getShopItemById = (id: string): ShopItem | undefined => getDecorationRegistry().items.get(id);

/**
 * Inventory hợp lệ = item SVG cũ (đã biết) + id decoration đúng hình thức.
 * Giữ cả id decoration CHƯA có trong catalog (catalog có thể được nạp thêm)
 * để không xoá dữ liệu người dùng.
 */
export const isKnownInventoryId = (id: string): boolean => {
  if (getDecorationRegistry().items.has(id)) return true;
  return isDecorationId(id) && id.length <= 96;
};

export const decorationSlotForId = (id: string): 'avatar_frame' | 'avatar_aura' | 'nameplate' | null =>
  getDecorationRegistry().slots.get(id) || null;

export const getDecorationItems = (): ShopItem[] =>
  [...getDecorationRegistry().items.values()].filter((item) => item.originalSource === 'discord_import');

export const getActiveDecorationItems = (): ShopItem[] =>
  getDecorationItems().filter((item) => item.isActive);
