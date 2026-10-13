/* Bản quyền trí tuệ thuộc về BroAmStuck */
/*
 * Nhiệm vụ 10 — lớp đọc catalog trang trí (decorations-catalog.json) + ánh xạ
 * sang ShopItem + hằng số hiển thị (rarity, loại) + giá BASE_URL cho asset.
 * File này KHÔNG có effect (pure) để dùng chung client/server-side render test.
 */
import type { ShopItem, DecorationType, DecorationRarity, EquippedDecorations } from '../types/index.ts';

/* ---- Hình dạng item trong decorations-catalog.json ---- */
export interface DecorationCatalogEntry {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  originalName: string;
  type: DecorationType;
  rarity: DecorationRarity;
  /** Điểm chất lượng 0–100 (score-quality.mjs) — xếp hạng trong Boutique. */
  qualityScore?: number;
  assetPath: {
    /** preview.webp (~128px) — url gốc tuyệt đối /assets/decorations/... */
    preview: string;
    previewPng: string;
    /** Ảnh tĩnh full (png) — với nameplate trỏ về preview. */
    full: string;
    fullWebp: string;
    /** WebM VP9 alpha — null nếu item tĩnh. */
    animated: string | null;
  };
  description: string;
  price: number;
  originalPriceNote: string;
  isAnimated: boolean;
  tags: string[];
  isActive: boolean;
  reviewStatus: string;
  nameSource: string;
  addedAt: string;
  source?: {
    zip: string;
    coverage?: number;
    staticFrame?: number;
    rarityScore?: number;
  };
  outputBytes?: number;
}

export interface DecorationCatalog {
  version: number;
  generatedAt: string;
  generator: string;
  note: string;
  pricing: {
    rule: string;
    coinPerVnd: number;
    referenceVnd: Record<string, Record<string, number>>;
    coins: Record<string, Record<string, number>>;
    rarityRule: string;
  };
  counts: {
    total: number;
    byType: Record<string, number>;
    byRarity: Record<string, number>;
    totalOutputBytes: number;
  };
  items: DecorationCatalogEntry[];
}

/**
 * Chuyển 1 entry catalog → ShopItem (khớp schema shop hiện có + trường Nv10).
 * category: avatar_frame → 'Avatar Frame', avatar_aura → 'Avatar Aura', nameplate → 'Nameplate'.
 */
export const catalogEntryToShopItem = (entry: DecorationCatalogEntry): ShopItem => {
  const category = entry.type === 'nameplate' ? 'Nameplate' : entry.type === 'avatar_aura' ? 'Avatar Aura' : 'Avatar Frame';
  return {
    id: entry.id,
    name: entry.name,
    nameEn: entry.nameEn,
    originalName: entry.originalName,
    slug: entry.slug,
    price: entry.price,
    tierColor: RARITY_TO_TIER[entry.rarity],
    description: entry.description,
    iconType: 'Decoration',
    category,
    addedAt: entry.addedAt?.slice(0, 10) || undefined,
    assetType: entry.isAnimated ? 'image_animated' : 'image_static',
    previewUrl: entry.assetPath.preview,
    fullAssetUrl: entry.assetPath.fullWebp,
    animatedAssetUrl: entry.assetPath.animated,
    originalSource: 'discord_import',
    rarity: entry.rarity,
    isAnimated: entry.isAnimated,
    isActive: entry.isActive,
    tags: entry.tags,
    qualityScore: entry.qualityScore,
  };
};

export const catalogToShopItems = (catalog: DecorationCatalog): ShopItem[] =>
  (catalog.items || []).map(catalogEntryToShopItem);

const RARITY_TO_TIER: Record<DecorationRarity, ShopItem['tierColor']> = {
  common: 'green',
  rare: 'blue',
  epic: 'red',
  mythic: 'purple',
};

/* ---- Metadata hiển thị (màu hiếm theo yêu cầu: xám/xanh/tím/vàng) ---- */
export const DECORATION_TYPE_META: Record<DecorationType, { label: string; short: string }> = {
  avatar_frame: { label: 'Avatar Frame', short: 'Khung' },
  avatar_aura: { label: 'Avatar Aura', short: 'Hào quang' },
  nameplate: { label: 'Nameplate', short: 'Bảng tên' },
};

export const DECORATION_RARITY_META: Record<DecorationRarity, { label: string; en: string; color: string; glow: string; order: number }> = {
  common: { label: 'Phổ biến', en: 'Common', color: '#9CA3AF', glow: 'rgba(156,163,175,0.35)', order: 0 },
  rare: { label: 'Hiếm', en: 'Rare', color: '#3B82F6', glow: 'rgba(59,130,246,0.45)', order: 1 },
  epic: { label: 'Sử thi', en: 'Epic', color: '#A855F7', glow: 'rgba(168,85,247,0.5)', order: 2 },
  mythic: { label: 'Huyền thoại', en: 'Mythic', color: '#F59E0B', glow: 'rgba(245,158,11,0.55)', order: 3 },
};

export const DECORATION_RARITIES: DecorationRarity[] = ['common', 'rare', 'epic', 'mythic'];
export const DECORATION_TYPES: DecorationType[] = ['avatar_frame', 'avatar_aura', 'nameplate'];

/** ID item decoration luôn có dạng frame-* hoặc nameplate-*. */
export const isDecorationId = (id: string | null | undefined): boolean =>
  !!id && (id.startsWith('frame-') || id.startsWith('nameplate-'));

/**
 * URL asset tuyệt đối: catalog chứa đường dẫn gốc (/assets/...),
 * client phải gắn BASE_URL khi chạy ngoài origin gốc (preview proxy, CDN…).
 */
export const resolveAssetUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (!url.startsWith('/')) return url;
  const base = typeof import.meta !== 'undefined' && (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL;
  /* BASE_URL mặc định '/' của Vite: KHÔNG ghép base vào (ghép ra '//assets/…' —
     URL protocol-relative, trình duyệt hiểu host là "assets" → mọi fetch/src chết,
     Boutique rỗng và asset vô hình). Chỉ prepend base khác '/'. */
  const prefix = base && base !== '/' ? base.replace(/\/+$/, '') : '';
  return `${prefix}${url}`;
};

/** Chọn ảnh tĩnh làm fallback: ưu tiên WebP, sau đó PNG (theo thứ tự nguồn hợp lệ). */
export const stillSources = (
  item: Pick<ShopItem, 'fullAssetUrl' | 'previewUrl'>,
): Array<{ url: string; png: boolean }> => {
  const out: Array<{ url: string; png: boolean }> = [];
  if (item.fullAssetUrl) out.push({ url: item.fullAssetUrl, png: item.fullAssetUrl.endsWith('.png') });
  if (item.previewUrl && item.previewUrl !== item.fullAssetUrl) out.push({ url: item.previewUrl, png: item.previewUrl.endsWith('.png') });
  return out;
};

/**
 * Vệ sinh equippedDecorations từ nguồn không tin cậy:
 * - chỉ giữ 3 slot hợp lệ;
 * - giá trị phải là string không rỗng (id decoration);
 * - KHÔNG kiểm tra sở hữu ở đây (server làm ở tầng auth/equip).
 */
export const sanitizeEquippedDecorations = (input: unknown): EquippedDecorations => {
  const out: EquippedDecorations = { avatar_frame: null, avatar_aura: null, nameplate: null };
  if (!input || typeof input !== 'object') return out;
  const record = input as Record<string, unknown>;
  for (const slot of ['avatar_frame', 'avatar_aura', 'nameplate'] as const) {
    const value = record[slot];
    out[slot] = typeof value === 'string' && value.trim() ? value.trim() : null;
  }
  return out;
};

/** Khoảng giá của pool (hiển thị trung thực cho gacha: 1.5K–6.2K). */
export const priceRange = (items: Pick<ShopItem, 'price'>[]): string => {
  if (!items.length) return '0';
  let min = Infinity;
  let max = -Infinity;
  for (const item of items) {
    if (item.price < min) min = item.price;
    if (item.price > max) max = item.price;
  }
  const fmt = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(v));
  return min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`;
};

/* --------------------------------------------------------------------------
   Đại cập nhật — "Deal hôm nay" + "Bộ sưu tập" (hàm THUẦN, test được,
   client dùng trực tiếp — giá luôn khớp server vì dùng effectivePrice).
   -------------------------------------------------------------------------- */
import { effectivePrice } from './shopData.ts';

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface DailyDeal {
  item: ShopItem;
  /** % giảm EFFECTIVE (khớp đúng số Coin server thu). */
  percent: number;
  price: number;
  /** Hết hạn của khung ưu đãi đang áp dụng (ms). */
  endsAt: number;
  isWeekly: boolean;
  isSuperSale: boolean;
}

export interface DailyDealInputs {
  /** Item đang trong khung flash 6h (id + percent + super sale). */
  flashList: Array<{ itemId: string; percent: number; isSuperSale?: boolean }>;
  /** Mốc kết thúc khung flash hiện tại (ms). */
  flashEndsAt: number;
  weekly: { itemId: string; percent: number; endsAt: number };
}

/**
 * "Deal hôm nay" — item nổi bật của ngày:
 *  - ứng viên = item đang flash sale 6h + item ưu đãi tuần (nếu chưa trong flash);
 *  - chỉ lấy TOP 12 CHẤT LƯỢNG (qualityScore) — deal phải là điểm nhấn;
 *  - chọn tất định theo NGÀY VIỆT NAM (cả hệ thống xem cùng 1 deal, xoay mỗi ngày).
 */
export const getDailyDeal = (
  now: number,
  items: ShopItem[],
  input: DailyDealInputs,
): DailyDeal | null => {
  const byId = new Map(items.map((i) => [i.id, i]));
  const candidates: Array<{ item: ShopItem; percent: number; isSuperSale: boolean; endsAt: number }> = [];
  for (const deal of input.flashList) {
    const item = byId.get(deal.itemId);
    if (item) {
      candidates.push({ item, percent: deal.percent, isSuperSale: !!deal.isSuperSale, endsAt: input.flashEndsAt });
    }
  }
  const weeklyItem = byId.get(input.weekly.itemId);
  if (weeklyItem && !candidates.some((c) => c.item.id === weeklyItem.id)) {
    candidates.push({ item: weeklyItem, percent: input.weekly.percent, isSuperSale: false, endsAt: input.weekly.endsAt });
  }
  if (candidates.length === 0) return null;
  candidates.sort(
    (a, b) => (b.item.qualityScore ?? 0) - (a.item.qualityScore ?? 0) || a.item.name.localeCompare(b.item.name, 'vi'),
  );
  const dayIndex = Math.floor((now + VN_OFFSET_MS) / (24 * 60 * 60 * 1000));
  const top = candidates.slice(0, 12);
  const pick = top[dayIndex % top.length];
  /* Giá EFFECTIVE — cùng hàm server tính tiền → nhãn bao giờ cũng khớp. */
  const price = effectivePrice(pick.item, now);
  const percent = Math.max(0, Math.round((1 - price / pick.item.price) * 100));
  return { item: pick.item, percent, price, endsAt: pick.endsAt, isWeekly: pick.item.id === input.weekly.itemId, isSuperSale: pick.isSuperSale };
};

export interface CollectionRarityProgress {
  rarity: DecorationRarity;
  total: number;
  owned: number;
}

export interface CollectionStats {
  total: number;
  owned: number;
  /** Phần trăm hoàn thành 0–100. */
  percent: number;
  byRarity: CollectionRarityProgress[];
  /** Item Mythic đã sở hữu (top 6 theo qualityScore) — "vinh danh". */
  mythicOwned: ShopItem[];
}

/** Thống kê "Bộ sưu tập của bạn": tiến độ theo độ hiếm + mythic đã sưu tầm. */
export const getCollectionStats = (items: ShopItem[], ownedIds: Iterable<string>): CollectionStats => {
  const owned = new Set(ownedIds);
  const order: DecorationRarity[] = ['common', 'rare', 'epic', 'mythic'];
  const byRarity: CollectionRarityProgress[] = order.map((rarity) => ({ rarity, total: 0, owned: 0 }));
  const mythicOwned: ShopItem[] = [];
  let ownedCount = 0;
  for (const item of items) {
    const rarity = item.rarity || 'common';
    const row = byRarity.find((r) => r.rarity === rarity);
    if (!row) continue;
    row.total += 1;
    if (owned.has(item.id)) {
      row.owned += 1;
      ownedCount += 1;
      if (rarity === 'mythic') mythicOwned.push(item);
    }
  }
  mythicOwned.sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0) || a.name.localeCompare(b.name, 'vi'));
  return {
    total: items.length,
    owned: ownedCount,
    percent: items.length ? Math.min(100, Math.round((ownedCount / items.length) * 1000) / 10) : 0,
    byRarity,
    mythicOwned: mythicOwned.slice(0, 6),
  };
};

/**
 * "Vừa xem" (Boutique): giữ tối đa `max` id, mới nhất trước, khử trùng lặp.
 * Pure — test được.
 */
export const pushRecentItem = (recent: string[], id: string, max = 8): string[] => {
  if (!id) return recent;
  return [id, ...recent.filter((x) => x !== id)].slice(0, max);
};

/* --------------------------------------------------------------------------
   PHẦN 3.1 — Multi-quality Video Decoration (4K / HD / SD Adaptive Bitrate)
   -------------------------------------------------------------------------- */

export interface AdaptiveVideoSource {
  quality: '4k' | 'hd' | 'sd';
  src: string;
  media?: string;
  type: string;
}

export interface AdaptiveVideoSourceSet {
  primaryUrl: string;
  sources: AdaptiveVideoSource[];
}

/**
 * Sinh bộ nguồn video đa chất lượng (4K / HD / SD) tương tự YouTube/Netflix Adaptive Bitrate:
 *  - Tier A (màn lớn ≥ 1200px): bản 4K / gốc chất lượng cao nhất
 *  - Tier B (màn vừa ≥ 600px): bản HD tối ưu bitrate
 *  - Tier C (máy yếu / mạng chậm): bản SD vẫn giữ trọn chuyển động mượt mà
 */
export const buildAdaptiveVideoSources = (
  animatedAssetUrl: string | null | undefined,
  tier: 'tier-a' | 'tier-b' | 'tier-c' = 'tier-a',
): AdaptiveVideoSourceSet | null => {
  const base = resolveAssetUrl(animatedAssetUrl);
  if (!base) return null;
  const sep = base.includes('?') ? '&' : '?';
  const url4k = `${base}${sep}tier=4k`;
  const urlHd = `${base}${sep}tier=hd`;
  const urlSd = `${base}${sep}tier=sd`;

  const primaryUrl = tier === 'tier-c' ? urlSd : tier === 'tier-b' ? urlHd : url4k;
  return {
    primaryUrl,
    sources: [
      { quality: '4k', src: url4k, media: '(min-width: 1200px)', type: 'video/webm' },
      { quality: 'hd', src: urlHd, media: '(min-width: 600px)', type: 'video/webm' },
      { quality: 'sd', src: urlSd, type: 'video/webm' },
    ],
  };
};

