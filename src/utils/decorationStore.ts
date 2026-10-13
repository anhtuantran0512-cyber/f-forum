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
import { setDecorationPool, getDecorationPool } from './shopData.ts';
import {
  type DecorationCatalog,
  catalogToShopItems,
  isDecorationId,
  resolveAssetUrl,
} from './decorations.ts';

const CATALOG_PATH = '/assets/decorations/decorations-catalog.json';

let catalogPromise: Promise<DecorationCatalog | null> | null = null;
let resolvedCatalog: DecorationCatalog | null = null;
let resolvedItems: ShopItem[] = [];
let resolvedByIdMap: Map<string, ShopItem> = new Map();

/** Fetch catalog (cache bộ nhớ). Lỗi → null (shop tự động chỉ hiện item SVG cũ). */
export const loadDecorationCatalog = (): Promise<DecorationCatalog | null> => {
  if (resolvedCatalog) return Promise.resolve(resolvedCatalog);
  if (!catalogPromise) {
    catalogPromise = fetch(resolveAssetUrl(CATALOG_PATH) || CATALOG_PATH, { cache: 'force-cache' })
      .then((res) => (res.ok ? (res.json() as Promise<DecorationCatalog>) : null))
      .catch(() => null)
      .then((catalog) => {
        if (catalog && Array.isArray(catalog.items) && catalog.items.length) {
          const items = catalogToShopItems(catalog);
          resolvedCatalog = catalog;
          resolvedItems = items;
          resolvedByIdMap = new Map(items.map((item) => [item.id, item]));
          setDecorationPool(items);
        }
        return catalog;
      });
  }
  return catalogPromise;
};

/** Hook: catalog + danh sách item decoration đã map sang ShopItem (singleton O(1) map). */
export const useDecorationCatalog = () => {
  const [catalog, setCatalog] = useState<DecorationCatalog | null>(() => resolvedCatalog);
  const [loading, setLoading] = useState<boolean>(() => !resolvedCatalog);
  useEffect(() => {
    if (resolvedCatalog) return;
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
  const activeCatalog = catalog ?? resolvedCatalog;
  const items = useMemo(
    () => (activeCatalog ? (activeCatalog === resolvedCatalog ? resolvedItems : catalogToShopItems(activeCatalog)) : []),
    [activeCatalog],
  );
  const byId = useMemo(
    () =>
      activeCatalog === resolvedCatalog && resolvedByIdMap.size > 0
        ? resolvedByIdMap
        : new Map(items.map((item) => [item.id, item])),
    [activeCatalog, items],
  );
  return { catalog: activeCatalog, items, byId, loading: !activeCatalog && loading, setDecorationPool };
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
  /* Không cho phép mang 2 viền avatar (Khung + Hào quang) cùng một lúc. */
  if (out.avatar_frame && out.avatar_aura) {
    out.avatar_aura = null;
  }
  void pool;
  return out;
};

/** Hook tiện dụng: slot → ShopItem của user hiện tại (catalog chưa có → null). */
export const useUserDecorations = (user: Pick<User, 'inventory' | 'equippedDecorations'> | null | undefined) => {
  const { items, byId } = useDecorationCatalog();
  return useMemo(() => {
    const slots = resolveUserDecorations(user, items);
    const frameItem = slots.avatar_frame ? byId.get(slots.avatar_frame) || null : null;
    const auraItem = !frameItem && slots.avatar_aura ? byId.get(slots.avatar_aura) || null : null;
    return {
      slots,
      frame: frameItem,
      aura: auraItem,
      nameplate: slots.nameplate ? byId.get(slots.nameplate) || null : null,
    };
  }, [user, items, byId]);
};

/* ---- Năng lực trình duyệt ---- */

const detectWebmAlphaSupport = (): boolean => {
  if (typeof navigator === 'undefined') return true;
  const ua = navigator.userAgent || '';
  const isIOS = /iP(hone|ad|od)/i.test(ua) || /CriOS|FxiOS/i.test(ua);
  const isRealSafari = /Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Brave|Vivaldi|Firefox/i.test(ua);
  return !isIOS && !isRealSafari;
};

const cachedFeatures: { webp: boolean; webmAlpha: boolean } | null =
  typeof document !== 'undefined'
    ? {
        webp: typeof document.createElement !== 'function' ? false : document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0,
        /* VP9 alpha: Chrome/Edge/Brave/Opera/Firefox hỗ trợ; Safari/iOS không hỗ trợ. */
        webmAlpha: detectWebmAlphaSupport(),
      }
    : null;

export const supportsWebp = (): boolean => cachedFeatures?.webp ?? false;
export const supportsWebmAlpha = (): boolean => cachedFeatures?.webmAlpha ?? false;

/* ---- Cache blob URL (RAM) — video WebM alpha không chạy được qua HTTP cache của <video> ---- */

interface BlobMeta {
  lastAccessed: number;
  refCount: number;
}

const blobCache = new Map<string, string>();
const blobMeta = new Map<string, BlobMeta>();
const inflightBlobPromises = new Map<string, Promise<string | null>>();
let blobLimit = 80;
let totalEvictedCount = 0;
let cacheHitCount = 0;
let cacheMissCount = 0;

export const setMediaCacheLimit = (limit: number): void => {
  blobLimit = Math.max(1, limit);
};

export const registerMediaReference = (url: string | null): void => {
  if (!url) return;
  const absolute = resolveAssetUrl(url) || url;
  const meta = blobMeta.get(absolute);
  if (meta) {
    meta.refCount += 1;
    meta.lastAccessed = Date.now();
  } else {
    blobMeta.set(absolute, { lastAccessed: Date.now(), refCount: 1 });
  }
};

export const unregisterMediaReference = (url: string | null): void => {
  if (!url) return;
  const absolute = resolveAssetUrl(url) || url;
  const meta = blobMeta.get(absolute);
  if (meta) {
    meta.refCount = Math.max(0, meta.refCount - 1);
    /* Nếu mục trở thành inactive và bộ nhớ cache đang vượt ngưỡng limit, giải phóng ngay */
    if (meta.refCount === 0 && blobCache.size > blobLimit) {
      revokeIfNotUsed();
    }
  }
};

export const evictInactiveMediaBlobs = (maxAgeMs = 15000): number => {
  if (!blobCache.size) return 0;
  const now = Date.now();
  let evicted = 0;

  for (const [key, objectUrl] of Array.from(blobCache.entries())) {
    const meta = blobMeta.get(key);
    const isInactive = !meta || meta.refCount <= 0;
    const isStale = meta ? now - meta.lastAccessed >= maxAgeMs : true;

    if (isInactive && isStale) {
      blobCache.delete(key);
      blobMeta.delete(key);
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        /* đã revoked */
      }
      evicted += 1;
      totalEvictedCount += 1;
    }
  }
  return evicted;
};

export const clearMediaCache = (force = false): void => {
  for (const [key, objectUrl] of Array.from(blobCache.entries())) {
    const meta = blobMeta.get(key);
    if (force || !meta || meta.refCount <= 0) {
      blobCache.delete(key);
      blobMeta.delete(key);
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        /* đã revoked */
      }
      totalEvictedCount += 1;
    }
  }
};

export const getMediaCacheStats = () => {
  let active = 0;
  for (const meta of blobMeta.values()) {
    if (meta.refCount > 0) active += 1;
  }
  return {
    totalEntries: blobCache.size,
    activeEntries: active,
    evictedCount: totalEvictedCount,
    hitCount: cacheHitCount,
    missCount: cacheMissCount,
    limit: blobLimit,
  };
};

const revokeIfNotUsed = () => {
  if (blobCache.size > blobLimit) {
    for (const [key, objectUrl] of Array.from(blobCache.entries())) {
      const meta = blobMeta.get(key);
      /* Chỉ thu hồi các tài nguyên inactive (không còn thẻ UI nào trên màn hình sử dụng) */
      if (!meta || meta.refCount <= 0) {
        blobCache.delete(key);
        blobMeta.delete(key);
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          /* đã revoked */
        }
        totalEvictedCount += 1;
        if (blobCache.size <= blobLimit) return;
      }
    }
  }
};

if (typeof document !== 'undefined') {
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) {
        evictInactiveMediaBlobs(5000);
      }
    },
    { passive: true },
  );
}

/** Tải asset (webm/webp/png) về blob URL, cache RAM + deduplicate in-flight request. */
export const loadCachedAsset = async (url: string | null): Promise<string | null> => {
  if (!url) return null;
  const absolute = resolveAssetUrl(url) || url;
  if (blobCache.has(absolute)) {
    cacheHitCount += 1;
    const objectUrl = blobCache.get(absolute)!;
    blobCache.delete(absolute);
    blobCache.set(absolute, objectUrl);
    const meta = blobMeta.get(absolute);
    if (meta) {
      meta.lastAccessed = Date.now();
    } else {
      blobMeta.set(absolute, { lastAccessed: Date.now(), refCount: 0 });
    }
    return objectUrl;
  }
  cacheMissCount += 1;
  const inflight = inflightBlobPromises.get(absolute);
  if (inflight) return inflight;
  const request = (async (): Promise<string | null> => {
    try {
      const res = await fetch(absolute, { cache: 'force-cache' });
      if (!res.ok) return null;
      const blob = await res.blob();
      if (!blob.size) return null;
      const objectUrl = URL.createObjectURL(blob);
      blobCache.set(absolute, objectUrl);
      blobMeta.set(absolute, { lastAccessed: Date.now(), refCount: 0 });
      revokeIfNotUsed();
      return objectUrl;
    } catch {
      return null;
    } finally {
      inflightBlobPromises.delete(absolute);
    }
  })();
  inflightBlobPromises.set(absolute, request);
  return request;
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
  const resolvedTarget = target ? resolveAssetUrl(target) || target : null;
  const syncHit = resolvedTarget ? blobCache.get(resolvedTarget) ?? null : null;
  const [cache, setCache] = useState<Record<string, string | null>>({});
  const [attempt, setAttempt] = useState(0);
  const failCountRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!target) return;
    registerMediaReference(target);
    return () => {
      unregisterMediaReference(target);
    };
  }, [target]);

  useEffect(() => {
    if (!target) return;
    if (syncHit || target in cache) return;
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
  }, [target, syncHit, attempt, cache]);
  const retry = useCallback(() => {
    if (target) setCache((prev) => {
      const next = { ...prev };
      delete next[target];
      return next;
    });
    setAttempt((n) => n + 1);
  }, [target]);
  return [target ? syncHit ?? (target in cache ? cache[target] : null) : null, retry] as const;
};

export { getDecorationPool };

