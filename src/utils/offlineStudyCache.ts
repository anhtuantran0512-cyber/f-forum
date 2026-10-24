import { safeStorage } from './storage';

export interface OfflineFlashcardState {
  deckKey: string;
  cardIndex: number;
  masteredIds: string[];
  reviewIds: string[];
  savedAt: number;
}

export interface OfflineSyncItem {
  id: string;
  type: 'exam_submission' | 'flashcard_result' | 'cbt_result';
  payload: Record<string, unknown>;
  createdAt: number;
}

const FLASHCARD_OFFLINE_KEY = 'fforum_offline_flashcards_progress';
const PENDING_SYNC_KEY = 'fforum_pending_offline_sync';
export const OFFLINE_BADGE_LABEL = 'Chế độ Ngoại Tuyến Tĩnh Tâm';

export function saveOfflineFlashcardProgress(
  deckKey: string,
  cardIndex: number,
  masteredIds: string[],
  reviewIds: string[]
): void {
  try {
    const raw = safeStorage.getItem(FLASHCARD_OFFLINE_KEY);
    const map: Record<string, OfflineFlashcardState> = raw ? JSON.parse(raw) : {};
    map[deckKey] = {
      deckKey,
      cardIndex,
      masteredIds,
      reviewIds,
      savedAt: Date.now(),
    };
    safeStorage.setItem(FLASHCARD_OFFLINE_KEY, JSON.stringify(map));
  } catch {}
}

export function loadOfflineFlashcardProgress(deckKey: string): OfflineFlashcardState | null {
  try {
    const raw = safeStorage.getItem(FLASHCARD_OFFLINE_KEY);
    if (!raw) return null;
    const map: Record<string, OfflineFlashcardState> = JSON.parse(raw);
    return map[deckKey] || null;
  } catch {
    return null;
  }
}

export function enqueueOfflineSyncItem(
  type: OfflineSyncItem['type'],
  payload: Record<string, unknown>
): void {
  try {
    const raw = safeStorage.getItem(PENDING_SYNC_KEY);
    const list: OfflineSyncItem[] = raw ? JSON.parse(raw) : [];
    const item: OfflineSyncItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      payload,
      createdAt: Date.now(),
    };
    list.push(item);
    safeStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(list));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ff_offline_sync_updated', { detail: { count: list.length } }));
    }
  } catch {}
}

export function getPendingOfflineSyncCount(): number {
  try {
    const raw = safeStorage.getItem(PENDING_SYNC_KEY);
    if (!raw) return 0;
    const list: OfflineSyncItem[] = JSON.parse(raw);
    return Array.isArray(list) ? list.length : 0;
  } catch {
    return 0;
  }
}

export async function flushPendingOfflineSync(): Promise<number> {
  try {
    const raw = safeStorage.getItem(PENDING_SYNC_KEY);
    if (!raw) return 0;
    const list: OfflineSyncItem[] = JSON.parse(raw);
    if (!Array.isArray(list) || list.length === 0) return 0;

    const remaining: OfflineSyncItem[] = [];
    let syncedCount = 0;

    for (const item of list) {
      try {
        if (item.type === 'cbt_result') {
          const res = await fetch('/api/cbt/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload),
          });
          if (res.ok) {
            syncedCount++;
          } else {
            remaining.push(item);
          }
        } else {
          syncedCount++;
        }
      } catch {
        remaining.push(item);
      }
    }

    safeStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(remaining));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ff_offline_sync_updated', { detail: { count: remaining.length } }));
    }
    return syncedCount;
  } catch {
    return 0;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void flushPendingOfflineSync();
  });
}
