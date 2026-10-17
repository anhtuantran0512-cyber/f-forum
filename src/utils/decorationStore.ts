/* Bản quyền trí tuệ thuộc về BroAmStuck */
/* Client-side decoration catalog, ownership resolution, and codec hints. */
import { useEffect, useMemo, useState } from 'react';
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

/** Fetch once per page; the browser handles HTTP caching for the JSON catalog. */
export const loadDecorationCatalog = (): Promise<DecorationCatalog | null> => {
  if (resolvedCatalog) return Promise.resolve(resolvedCatalog);
  if (!catalogPromise) {
    catalogPromise = fetch(resolveAssetUrl(CATALOG_PATH) || CATALOG_PATH, { cache: 'force-cache' })
      .then((response) => (response.ok ? response.json() as Promise<DecorationCatalog> : null))
      .catch(() => null)
      .then((catalog) => {
        if (catalog && Array.isArray(catalog.items) && catalog.items.length > 0) {
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

/** Catalog and O(1) item lookup shared by decoration views. */
export const useDecorationCatalog = () => {
  const [catalog, setCatalog] = useState<DecorationCatalog | null>(() => resolvedCatalog);
  const [loading, setLoading] = useState<boolean>(() => !resolvedCatalog);
  useEffect(() => {
    if (resolvedCatalog) return;
    let active = true;
    loadDecorationCatalog().then((result) => {
      if (!active) return;
      setCatalog(result);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);
  const activeCatalog = catalog ?? resolvedCatalog;
  const items = useMemo(
    () => activeCatalog ? (activeCatalog === resolvedCatalog ? resolvedItems : catalogToShopItems(activeCatalog)) : [],
    [activeCatalog],
  );
  const byId = useMemo(
    () => activeCatalog === resolvedCatalog && resolvedByIdMap.size > 0
      ? resolvedByIdMap
      : new Map(items.map((item) => [item.id, item])),
    [activeCatalog, items],
  );
  return { catalog: activeCatalog, items, byId, loading: !activeCatalog && loading, setDecorationPool };
};

/** Return only decoration slots the user owns; callers still verify ownership server-side for changes. */
export const resolveUserDecorations = (
  user: Pick<User, 'inventory' | 'equippedDecorations'> | null | undefined,
  pool: ShopItem[],
): EquippedDecorations => {
  const owned = new Set<string>(user?.inventory || []);
  const out: EquippedDecorations = { avatar_frame: null, avatar_aura: null, nameplate: null };
  if (!user) return out;
  for (const slot of ['avatar_frame', 'avatar_aura', 'nameplate'] as const) {
    const id = user.equippedDecorations?.[slot];
    if (id && owned.has(id) && isDecorationId(id)) out[slot] = id;
  }
  if (out.avatar_frame && out.avatar_aura) out.avatar_aura = null;
  void pool;
  return out;
};

/** Convenience hook: owned slots mapped to catalog items. */
export const useUserDecorations = (user: Pick<User, 'inventory' | 'equippedDecorations'> | null | undefined) => {
  const { items, byId } = useDecorationCatalog();
  return useMemo(() => {
    const slots = resolveUserDecorations(user, items);
    const frame = slots.avatar_frame ? byId.get(slots.avatar_frame) || null : null;
    const aura = !frame && slots.avatar_aura ? byId.get(slots.avatar_aura) || null : null;
    return {
      slots,
      frame,
      aura,
      nameplate: slots.nameplate ? byId.get(slots.nameplate) || null : null,
    };
  }, [user, items, byId]);
};

const detectWebmAlphaSupport = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIOS = /iP(hone|ad|od)/i.test(ua) || /CriOS|FxiOS/i.test(ua);
  const isRealSafari = /Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Brave|Vivaldi|Firefox/i.test(ua);
  return !isIOS && !isRealSafari;
};

const detectWebpSupport = (): boolean => {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return false;
  try {
    return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
};
const cachedFeatures = typeof document !== 'undefined'
  ? { webp: detectWebpSupport(), webmAlpha: detectWebmAlphaSupport() }
  : null;
export const supportsWebp = (): boolean => cachedFeatures?.webp ?? false;
export const supportsWebmAlpha = (): boolean => cachedFeatures?.webmAlpha ?? false;

/* Animated media is passed through by URL; <video> uses native range requests and browser cache. */
export { getDecorationPool };
