/* Bản quyền trí tuệ thuộc về BroAmStuck */

const memoryStore = new Map<string, string>();

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {
    }
    return memoryStore.get(key) ?? null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
    }
    memoryStore.set(key, value);
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
    }
    memoryStore.delete(key);
  },
  clear: (): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {
    }
    memoryStore.clear();
  },
  /** Liệt kê các khóa đang lưu trên trình duyệt (chỉ đọc, an toàn với chế độ riêng tư). */
  keys: (): string[] => {
    const keys = new Set<string>(memoryStore.keys());
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k) keys.add(k);
        }
      }
    } catch {
    }
    return Array.from(keys);
  },
  /** Gom toàn bộ khóa bắt đầu bằng `prefix` thành object để sao lưu/khôi phục. */
  entriesWithPrefix: (prefix: string): Record<string, string> => {
    const result: Record<string, string> = {};
    safeStorage.keys().forEach((k) => {
      if (k.startsWith(prefix)) {
        const val = safeStorage.getItem(k);
        if (val !== null) result[k] = val;
      }
    });
    return result;
  },
  /** Xóa mọi khóa bắt đầu bằng `prefix`, trả về số khóa đã xóa. */
  removeWithPrefix: (prefix: string, keep: string[] = []): number => {
    const keepSet = new Set(keep);
    let removed = 0;
    safeStorage.keys().forEach((k) => {
      if (k.startsWith(prefix) && !keepSet.has(k)) {
        safeStorage.removeItem(k);
        removed += 1;
      }
    });
    return removed;
  },
};
