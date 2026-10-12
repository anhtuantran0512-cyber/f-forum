/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* Kiểu props nào cũng nhận — giống hệt cách React.lazy tự khai báo kiểu. */
type AnyProps = any;

/* ==========================================================================
   Nạp module theo kiểu "có lưới an toàn"
   --------------------------------------------------------------------------
   Vì sao cần: app chia nhỏ gói (lazy chunk). Nếu một chunk lỗi mạng, dev
   server vừa đổi file / trả 500 đúng lúc trình duyệt đang tải (vite trả lỗi
   cho module CSS/TS), hoặc phiên bản mới làm module graph cũ bị "dỏm",
   trình duyệt ném lỗi "Failed to fetch dynamically imported module" và —
   vì React.lazy không tự hồi phục — cả cây giao diện có thể "chết".

   Cách xử lý (2 lớp):
   1. lazyWithRetry: thử lại 1 lần sau 400ms (phần lớn lỗi chỉ là nhất
      thời). Vẫn lỗi VÀ lỗi thuộc kiểu "chunk không tải được" → tự tải lại
      trang, nhưng chỉ khi còn "ngân sách" reload (budget) — xem bên dưới.
   2. AppErrorBoundary: bắt phần còn lại, hiện màn hình khôi phục tử tế
      (nút tải lại, nút xoá bộ nhớ tạm) và tự tải lại 1 nhịp nữa nếu còn
      budget.

   Chống lặp vô hạn: mọi lần tự tải (cả 2 lớp) đều tiêu 1 lượt từ
   RELOAD_BUDGET — tối đa RELOAD_BUDGET_LIMIT lần trong 60s. Hết budget →
   dừng tự tải, để người dùng bấm nút thủ công (bấm nút "xoá bộ nhớ tạm"
   sẽ reset budget vì đó là ý định rõ ràng của người dùng).
   ========================================================================== */

const RELOAD_FLAG_PREFIX = 'fforum_chunk_reload_';
/* Mỗi chunk được một khoá riêng (thứ tự khai báo trong App là cố định, nên khoá
   vẫn ổn định qua các lần tải lại trang). */
let autoChunkId = 0;

const markReloadAttempt = (key: string): boolean => {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return false;
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, '1');
    return true;
  } catch {
    return false;
  }
};

const clearReloadFlag = (key: string): void => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
};

/* ==========================================================================
   Nhận diện lỗi "chunk không tải được" — đúng dạng người dùng gặp:
   • Chrome: "Failed to fetch dynamically imported module: https://…"
   • Firefox: "error loading dynamically imported module: https://…"
   • Vite dev khi module con trả 504/500 (file CSS/TS đang sửa dở, server
     vừa restart): chunk cha nhận đúng 2 message trên.
   Lỗi KHÁC (syntax error, runtime…) reload không chữa được → không tiêu
   budget, ném thẳng ra boundary.
   ========================================================================== */
export const isChunkLoadError = (error: unknown): boolean => {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  return (
    /failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /failed to load url/i.test(msg)
  );
};

/* ==========================================================================
   Ngân sách tự tải lại (chống vòng lặp reload vô hạn khi lỗi là THẬT SỰ —
   ví dụ file bị vỡ giữa chừng, server down).
   ========================================================================== */
const RELOAD_BUDGET_KEY = 'fforum_chunk_err_budget';
const RELOAD_BUDGET_LIMIT = 3;
const RELOAD_BUDGET_WINDOW_MS = 60_000;

interface ReloadBudget {
  n: number;
  t0: number;
}

const readBudget = (): ReloadBudget | null => {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    const raw = window.sessionStorage.getItem(RELOAD_BUDGET_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReloadBudget;
    return typeof parsed?.n === 'number' && typeof parsed?.t0 === 'number' ? parsed : null;
  } catch {
    return null;
  }
};

/* Lấy 1 lượt ngân sách. Trả về true nếu được phép tự tải (và đã ghi sổ). */
export const takeChunkReloadBudget = (): boolean => {
  const now = Date.now();
  const cur = readBudget();
  const next: ReloadBudget =
    !cur || now - cur.t0 > RELOAD_BUDGET_WINDOW_MS ? { n: 1, t0: now } : { n: cur.n + 1, t0: cur.t0 };
  if (next.n > RELOAD_BUDGET_LIMIT) return false;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(RELOAD_BUDGET_KEY, JSON.stringify(next));
    }
  } catch {
    /* storage lỗi vẫn cho qua — hành vi cũ tốt hơn là kẹt cứng */
  }
  return true;
};

/* Xoá sổ ngân sách (dùng khi người dùng BẤM NÚT thủ công — ý định rõ ràng). */
export const clearChunkReloadBudget = (): void => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(RELOAD_BUDGET_KEY);
    }
  } catch {
    /* ignore */
  }
};

/* Xoá cờ chunk cũ SAU khi vừa tự tải lại (budget còn "nóng" trong cửa sổ)
   — cho các chunk khác cơ hội tự hồi phục tiếp, trong khi budget vẫn giữ vai
   trò chặn vòng lặp. Gọi ở main.tsx khi app boot. */
export const resetChunkFlagsAfterAutoReload = (): void => {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    const budget = readBudget();
    if (!budget || Date.now() - budget.t0 > RELOAD_BUDGET_WINDOW_MS) return;
    const keys: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (key && key.startsWith(RELOAD_FLAG_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    /* ignore */
  }
};

export function lazyWithRetry<T extends ComponentType<AnyProps>>(
  factory: () => Promise<{ default: T }>,
  name?: string,
): LazyExoticComponent<T> {
  autoChunkId += 1;
  const flagKey = `${RELOAD_FLAG_PREFIX}${name ?? `auto-${autoChunkId}`}`;

  return lazy(() => {
    const attempt = () =>
      factory().then((mod) => {
        /* Nạp được rồi thì xoá cờ, lần sau có lỗi vẫn được phép thử lại */
        clearReloadFlag(flagKey);
        return mod;
      });

    return attempt().catch(
      () =>
        new Promise<{ default: T }>((_resolve, reject) => {
          window.setTimeout(() => {
            attempt().catch((error) => {
              /* Chỉ tự tải lại khi lỗi là "chunk không tải được" (mạng / module
                 graph) và còn đủ cả cờ per-chunk lẫn ngân sách chung; mọi lỗi
                 khác ném ra AppErrorBoundary để hiện màn hình khôi phục. */
              if (isChunkLoadError(error) && markReloadAttempt(flagKey) && takeChunkReloadBudget()) {
                window.location.reload();
                return;
              }
              reject(error);
            });
          }, 400);
        }),
    );
  });
}

export default lazyWithRetry;
