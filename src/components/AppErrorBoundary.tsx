/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import {
  clearChunkReloadBudget,
  isChunkLoadError,
  takeChunkReloadBudget,
} from '../utils/lazyWithRetry';

/* ==========================================================================
   Lưới an toàn cuối cùng của giao diện.
   --------------------------------------------------------------------------
   Nếu một lỗi bất ngờ xảy ra (chunk tải hỏng, dữ liệu sai…), React sẽ tháo cả
   cây giao diện và người dùng chỉ thấy màn hình trống — bấm gì cũng không mở.
   Thay vì để trang "chết im lặng", boundary này hiện một màn hình khôi phục
   tử tế kèm nút tải lại (và nút tải lại kèm xoá cờ chunk lỗi).

   Với lỗi "chunk không tải được" (Failed to fetch dynamically imported
   module — mạng gián đoạn, dev server trả 500, module graph cũ sau khi app
   cập nhật): tự tải lại 1 nhịp nếu còn ngân sách chung (lazyWithRetry
   quản lý, tối đa 3 lần/60s chống lặp vô hạn) — người dùng không cần làm gì.
   ========================================================================== */

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
  autoReloading: boolean;
}

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null, autoReloading: false };

  /* Chặn schedule tự tải lặp (StrictMode / lỗi ném nhiều lần). */
  private autoReloadScheduled = false;

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error, autoReloading: false };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[F-Forum] Lỗi giao diện — đã chặn để không khoá tương tác:', error, info);
    /* Lỗi chunk: tự tải lại 1 nhịp (còn ngân sách chung) để khỏi phải bấm. */
    if (isChunkLoadError(error) && !this.autoReloadScheduled && takeChunkReloadBudget()) {
      this.autoReloadScheduled = true;
      this.setState({ autoReloading: true });
      window.setTimeout(() => this.reload(true), 500);
    }
  }

  private reload = (clearChunkFlags = false) => {
    try {
      if (clearChunkFlags && typeof window !== 'undefined' && window.sessionStorage) {
        const keys: string[] = [];
        for (let i = 0; i < window.sessionStorage.length; i += 1) {
          const key = window.sessionStorage.key(i);
          if (key && key.startsWith('fforum_chunk_reload_')) keys.push(key);
        }
        keys.forEach((key) => window.sessionStorage.removeItem(key));
        /* Bấm nút thủ công / tự tải sau màn báo lỗi = ý định mới → reset ngân
           sách chung để các chunk khác không bị "cháy" lượt. */
        clearChunkReloadBudget();
      }
    } catch {
      /* bỏ qua */
    }
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    const { error, autoReloading } = this.state;
    if (!error) return this.props.children;
    const chunkError = isChunkLoadError(error);
    const title = chunkError ? 'Mất kết nối khi tải giao diện' : 'Giao diện vừa gặp lỗi';
    const subtitle = chunkError
      ? 'Một phần của app không tải được (mạng gián đoạn, hoặc app vừa cập nhật phiên bản mới). Thường tự khỏi khi tải lại.'
      : 'F-Forum đã dừng phần bị lỗi để phần còn lại không bị khoá.';

    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="F-Forum gặp lỗi khi hiển thị"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100000,
          display: 'grid',
          placeItems: 'center',
          padding: 20,
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          background:
            'radial-gradient(90% 60% at 50% -10%, rgba(245,158,11,0.18), transparent 62%), radial-gradient(70% 50% at 90% 100%, rgba(56,189,248,0.14), transparent 60%), #070a0f',
          color: '#f4f2ef',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 460,
            borderRadius: 26,
            padding: '22px 20px 18px',
            background: 'rgba(12,17,24,0.92)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 40px 120px rgba(0,0,0,0.8)',
            backdropFilter: 'blur(14px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span
              aria-hidden="true"
              style={{
                width: 36,
                height: 36,
                borderRadius: 14,
                display: 'grid',
                placeItems: 'center',
                background: 'linear-gradient(135deg, rgba(245,158,11,0.35), rgba(236,72,153,0.25))',
                border: '1px solid rgba(251,191,36,0.35)',
                fontSize: 18,
              }}
            >
              ⚠️
            </span>
            <div>
              <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>
                {title}
              </h1>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                {subtitle}
              </p>
            </div>
          </div>

          <pre
            style={{
              margin: '0 0 14px',
              padding: '10px 12px',
              borderRadius: 14,
              maxHeight: 132,
              overflow: 'auto',
              fontSize: 11,
              lineHeight: 1.5,
              color: '#fca5a5',
              background: 'rgba(0,0,0,0.45)',
              border: '1px solid rgba(248,113,113,0.25)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {String(error?.message || error)}
          </pre>

          {autoReloading && (
            <p
              style={{
                margin: '0 0 10px',
                fontSize: 12,
                fontWeight: 700,
                color: '#86efac',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 999,
                  background: '#4ade80',
                  animation: 'ff-err-pulse 1s ease-in-out infinite',
                }}
              />
              Đang tự động tải lại trang…
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              onClick={() => this.reload(false)}
              style={{
                flex: '1 1 160px',
                cursor: 'pointer',
                border: 'none',
                borderRadius: 14,
                padding: '11px 14px',
                fontSize: 12.5,
                fontWeight: 700,
                color: '#0b0e13',
                background: 'linear-gradient(135deg,#fde68a,#f59e0b)',
              }}
            >
              Tải lại trang
            </button>
            <button
              type="button"
              onClick={() => this.reload(true)}
              style={{
                flex: '1 1 160px',
                cursor: 'pointer',
                borderRadius: 14,
                padding: '11px 14px',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#f4f2ef',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.16)',
              }}
            >
              Tải lại &amp; xoá bộ nhớ tạm
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
