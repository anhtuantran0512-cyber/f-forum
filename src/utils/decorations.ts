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
