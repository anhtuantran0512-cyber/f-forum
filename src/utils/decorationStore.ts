/* Bản quyền trí tuệ thuộc về BroAmStuck */
/*
 * Nhiệm vụ 10 — trạng thái client cho trang trí Discord:
 *  - load catalog (fetch + cache bộ nhớ, gắn vào pool giá/gacha của shopData);
 *  - resolve slot đã trang bị của user (chỉ item HỮU — chống lộ trang trí);
 *  - phát hiện năng lực trình duyệt (WebP / VP9 alpha — Safari, iOS dùng ảnh tĩnh);
 *  - cache blob URL trong RAM + preload cho avatar của chính user.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EquippedDecorations, ShopItem, User } from '../types/index.ts';
import { setDecorationPool, getDecorationPool } from './shopData';
import {
  type DecorationCatalog,
  catalogToShopItems,
  isDecorationId,
  resolveAssetUrl,
} from './decorations';

const CATALOG_PATH = '/assets/decorations/decorations-catalog.json';

let catalogPromise: Promise<DecorationCatalog | null> | null = null;

/** Fetch catalog (cache bộ nhớ). Lỗi → null (shop tự động chỉ hiện item SVG cũ). */
export const loadDecorationCatalog = (): Promise<DecorationCatalog | null> => {
  if (!catalogPromise) {
    catalogPromise = fetch(resolveAssetUrl(CATALOG_PATH) || CATALOG_PATH, { cache: 'force-cache' })
      .then((res) => (res.ok ? (res.json() as Promise<DecorationCatalog>) : null))
      .catch(() => null)
      .then((catalog) => {
        if (catalog && Array.isArray(catalog.items) && catalog.items.length) {
          const items = catalogToShopItems(catalog);
          setDecorationPool(items);
        }
        return catalog;
      });
  }
  return catalogPromise;
};

/** Hook: catalog + danh sách item decoration đã map sang ShopItem. */
export const useDecorationCatalog = () => {
  const [catalog, setCatalog] = useState<DecorationCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    loadDecorationCatalog().then((c) => {
      if (!alive) return;
      setCatalog(c);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);
  const items = useMemo(() => (catalog ? catalogToShopItems(catalog) : []), [catalog]);
  return { catalog, items, loading, setDecorationPool };
};

/**
 * Resolve trang trí ĐÃ TRANG BỊ của một user từ dữ liệu /api/sync.
 * Chỉ trả item HỮU (inventory hoặc equipped) — user ẩn danh / chưa mua không lộ gì.
 */
export const resolveUserDecorations = (
  user: Pick<User, 'inventory' | 'equippedDecorations'> | null | undefined,
  pool: ShopItem[],
): EquippedDecorations => {
  const owned = new Set<string>(user?.inventory || []);
  if (!user) return { avatar_frame: null, avatar_aura: null, nameplate: null };
  const out: EquippedDecorations = { avatar_frame: null, avatar_aura: null, nameplate: null };
  for (const slot of ['avatar_frame', 'avatar_aura', 'nameplate'] as const) {
    const id = user.equippedDecorations?.[slot];
    if (id && owned.has(id) && isDecorationId(id)) out[slot] = id;
  }
  void pool;
  return out;
};

/** Hook tiện dụng: slot → ShopItem của user hiện tại (catalog chưa có → null). */
export const useUserDecorations = (user: Pick<User, 'inventory' | 'equippedDecorations'> | null | undefined) => {
  const { items } = useDecorationCatalog();
  return useMemo(() => {
    const slots = resolveUserDecorations(user, items);
    const byId = new Map(items.map((item) => [item.id, item]));
    return {
      slots,
      frame: slots.avatar_frame ? byId.get(slots.avatar_frame) || null : null,
      aura: slots.avatar_aura ? byId.get(slots.avatar_aura) || null : null,
      nameplate: slots.nameplate ? byId.get(slots.nameplate) || null : null,
    };
  }, [user, items]);
};

/* ---- Năng lực trình duyệt ---- */

const cachedFeatures: { webp: boolean; webmAlpha: boolean } | null =
  typeof document !== 'undefined'
    ? {
        webp: typeof document.createElement !== 'function' ? false : document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0,
        /* VP9 alpha không có API chuẩn — Safari/iOS chắc chắn không hỗ trợ, Chrome/Firefox/Edge hỗ trợ. */
        webmAlpha: !/iP(hone|ad|od)/.test(navigator.userAgent) && !/CriOS|FxiOS|Safari/.test(navigator.userAgent),
      }
    : null;

export const supportsWebp = (): boolean => cachedFeatures?.webp ?? false;
export const supportsWebmAlpha = (): boolean => cachedFeatures?.webmAlpha ?? false;

/* ---- Cache blob URL (RAM) — video WebM alpha không chạy được qua HTTP cache của <video> ---- */

const blobCache = new Map<string, string>();
let blobCount = 0;
const MAX_BLOBS = 80;

const revokeIfNotUsed = () => {
  /* Không revoke ngay: <video> có thể đang đọc. Revoked khi vượt trần. */
  if (blobCount > MAX_BLOBS && blobCache.size) {
    const first = blobCache.keys().next().value as string | undefined;
    if (first) {
      blobCache.delete(first);
      try {
        URL.revokeObjectURL(first);
      } catch {
        /* đã revoked */
      }
      blobCount = Math.max(0, blobCount - 1);
    }
  }
};

/** Tải asset (webm/webp/png) về blob URL, cache RAM — dùng cho <video>/<img> ổn định. */
export const loadCachedAsset = async (url: string | null): Promise<string | null> => {
  if (!url) return null;
  const absolute = resolveAssetUrl(url) || url;
  if (blobCache.has(absolute)) return blobCache.get(absolute) || null;
  try {
    const res = await fetch(absolute, { cache: 'force-cache' });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.size) return null;
    const objectUrl = URL.createObjectURL(blob);
    blobCache.set(absolute, objectUrl);
    blobCount += 1;
    revokeIfNotUsed();
    return objectUrl;
  } catch {
    return null;
  }
};

/** Preload một vài asset (dùng cho avatar của chính user — hiện ngay khi mở tab). */
export const preloadDecorations = (urls: Array<string | null | undefined>): void => {
  for (const url of urls) {
    if (!url) continue;
    void loadCachedAsset(url);
  }
};

/** Hook: URL blob (hoặc null khi chưa tải xong / không có). Retry = tải lại 1 url.
 *  Tải LỖI (mất mạng, dev server vừa restart, proxy preview gián đoạn) KHÔNG được
 *  cache thành "null vĩnh viễn" — nếu không, icon động sẽ biến thành ảnh tĩnh
 *  hết phiên mà không bao giờ thử lại. Tự retry tối đa 3 lần, cách nhau 2s. */
export const useCachedAsset = (url: string | null, enabled: boolean = true): readonly [string | null, () => void] => {
  const target = enabled ? url : null;
  const [cache, setCache] = useState<Record<string, string | null>>({});
  const [attempt, setAttempt] = useState(0);
  const failCountRef = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!target) return;
    if (target in cache) return;
    let alive = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    loadCachedAsset(target).then((objectUrl) => {
      if (!alive) return;
      if (objectUrl) {
        setCache((prev) => ({ ...prev, [target]: objectUrl }));
        return;
      }
      const fails = (failCountRef.current[target] ?? 0) + 1;
      failCountRef.current[target] = fails;
      if (fails <= 3) {
        retryTimer = setTimeout(() => {
          if (alive) setAttempt((n) => n + 1);
        }, 2000);
      }
    });
    return () => {
      alive = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [target, attempt, cache]);
  const retry = useCallback(() => {
    if (target) setCache((prev) => {
      const next = { ...prev };
      delete next[target];
      return next;
    });
    setAttempt((n) => n + 1);
  }, [target]);
  return [target ? (target in cache ? cache[target] : null) : null, retry] as const;
};

export { getDecorationPool };
