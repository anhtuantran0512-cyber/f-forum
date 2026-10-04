import { useCallback, useEffect, useRef, useState } from 'react';
import { safeStorage } from './storage';

interface DraftPayload {
  [key: string]: string;
}

interface StoredDraft<T extends DraftPayload> {
  fields: T;
  savedAt: number;
}

/** Nháp cũ hơn số ngày này thì coi như bỏ, không làm phiền người dùng. */
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Ghi cách nhau tối thiểu bấy nhiêu ms để không đụng localStorage mỗi phím. */
const WRITE_THROTTLE_MS = 600;

/**
 * Tự lưu nháp biểu mẫu vào localStorage.
 *
 * Ô soạn câu hỏi trước đây giữ nội dung trong state thuần: reload trang, bấm nhầm
 * nút đóng, hoặc trình duyệt sập là mất sạch phần đã gõ — có khi cả vài trăm chữ.
 * Hook này ghi nháp theo nhịp (không phải mỗi phím bấm), và khôi phục khi mở lại.
 *
 * Trả về:
 * - `fields` / `setField`: state của biểu mẫu, khởi tạo từ nháp nếu có.
 * - `hasRestoredDraft`: để UI hỏi người dùng có muốn dùng lại nháp không.
 * - `clearDraft`: gọi sau khi gửi thành công hoặc khi người dùng bỏ nháp.
 */
export function useDraftAutosave<T extends DraftPayload>(storageKey: string, initial: T) {
  const [fields, setFields] = useState<T>(() => {
    const stored = readDraft<T>(storageKey);
    return stored ? { ...initial, ...stored.fields } : initial;
  });
  const [restoredAt, setRestoredAt] = useState<number | null>(() => {
    const stored = readDraft<T>(storageKey);
    return stored ? stored.savedAt : null;
  });

  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<T | null>(null);

  const setField = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setFields((prev) => {
        const next = { ...prev, [key]: value };
        pendingRef.current = next;
        return next;
      });
    },
    [],
  );

  /* Ghi theo nhịp. Viết trong effect chứ không phải trong setState để không gây
     side effect lúc render. */
  useEffect(() => {
    if (throttleRef.current) return undefined;
    throttleRef.current = setTimeout(() => {
      throttleRef.current = null;
      const pending = pendingRef.current;
      if (!pending) return;
      pendingRef.current = null;
      const isEmpty = Object.values(pending).every((v) => String(v ?? '').trim() === '');
      if (isEmpty) {
        safeStorage.removeItem(storageKey);
        return;
      }
      const payload: StoredDraft<T> = { fields: pending, savedAt: Date.now() };
      safeStorage.setItem(storageKey, JSON.stringify(payload));
    }, WRITE_THROTTLE_MS);
    return () => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
        throttleRef.current = null;
      }
    };
  }, [fields, storageKey]);

  /* Ghi nốt trước khi người dùng rời trang, vì nhịp ghi có thể chưa tới. */
  useEffect(() => {
    const flush = () => {
      const pending = pendingRef.current;
      if (!pending) return;
      const isEmpty = Object.values(pending).every((v) => String(v ?? '').trim() === '');
      if (isEmpty) {
        safeStorage.removeItem(storageKey);
        return;
      }
      const payload: StoredDraft<T> = { fields: pending, savedAt: Date.now() };
      safeStorage.setItem(storageKey, JSON.stringify(payload));
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    safeStorage.removeItem(storageKey);
    setRestoredAt(null);
    pendingRef.current = null;
  }, [storageKey]);

  const discardDraft = useCallback(() => {
    clearDraft();
    setFields(initial);
  }, [clearDraft, initial]);

  return {
    fields,
    setField,
    setFields,
    /** Thời điểm của nháp vừa khôi phục; null nghĩa là không có nháp. */
    restoredAt,
    hasRestoredDraft: restoredAt !== null,
    clearDraft,
    discardDraft,
  };
}

function readDraft<T extends DraftPayload>(storageKey: string): StoredDraft<T> | null {
  const raw = safeStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredDraft<T>;
    if (!parsed || typeof parsed !== 'object' || !parsed.fields) return null;
    if (typeof parsed.savedAt !== 'number') return null;
    /* Nháp quá cũ thì vứt luôn để không hỏi lại mãi. */
    if (Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      safeStorage.removeItem(storageKey);
      return null;
    }
    return parsed;
  } catch {
    /* Nháp hỏng (JSON cắt cụt) thì bỏ, đừng để ô soạn vỡ theo. */
    safeStorage.removeItem(storageKey);
    return null;
  }
}
