/* Bản quyền trí tuệ thuộc về BroAmStuck
 * Profile cover images (≤15MB) live in IndexedDB: localStorage (~5MB) cannot hold them. */
import { useEffect, useState } from 'react';

export const COVER_MAX_BYTES = 15 * 1024 * 1024;
const DB_NAME = 'fforum_media';
const STORE = 'covers';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const coverMarker = (userId: string) => `idb:${userId}`;

export async function saveCover(userId: string, blob: Blob): Promise<string> {
  await tx('readwrite', (s) => s.put(blob, userId));
  window.dispatchEvent(new CustomEvent('fforum_cover_sync', { detail: userId }));
  return coverMarker(userId);
}

export async function deleteCover(userId: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(userId));
  window.dispatchEvent(new CustomEvent('fforum_cover_sync', { detail: userId }));
}

export async function loadCover(userId: string): Promise<Blob | null> {
  try {
    const v = await tx<Blob | undefined>('readonly', (s) => s.get(userId) as IDBRequest<Blob | undefined>);
    return v ?? null;
  } catch {
    return null;
  }
}

/** Resolves a user's cover marker to an object URL (or passes through plain URLs). */
export function useCoverUrl(user: { id: string; coverImage?: string } | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const marker = user?.coverImage;
  const userId = user?.id;

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    const resolve = async () => {
      if (!marker || !userId) {
        setUrl(null);
        return;
      }
      if (!marker.startsWith('idb:')) {
        setUrl(marker);
        return;
      }
      const blob = await loadCover(userId);
      if (cancelled) return;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = blob ? URL.createObjectURL(blob) : null;
      setUrl(objectUrl);
    };
    void resolve();
    const onSync = (e: Event) => {
      if ((e as CustomEvent).detail === userId) void resolve();
    };
    window.addEventListener('fforum_cover_sync', onSync);
    return () => {
      cancelled = true;
      window.removeEventListener('fforum_cover_sync', onSync);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [marker, userId]);

  return url;
}
