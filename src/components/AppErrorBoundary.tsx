/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';

/* ==========================================================================
   Lưới an toàn cuối cùng của giao diện.
   --------------------------------------------------------------------------
   Nếu một lỗi bất ngờ xảy ra (chunk tải hỏng, dữ liệu sai…), React sẽ tháo cả
   cây giao diện và người dùng chỉ thấy màn hình trống — bấm gì cũng không mở.
   Thay vì để trang "chết im lặng", boundary này hiện một màn hình khôi phục
   tử tế kèm nút tải lại (và nút tải lại kèm xoá cờ chunk lỗi).
   ========================================================================== */

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[F-Forum] Lỗi giao diện — đã chặn để không khoá tương tác:', error, info);
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
      }
    } catch {
      /* bỏ qua */
    }
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        className="ff-error-boundary"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ff-error-title"
        aria-describedby="ff-error-description"
      >
        <section className="ff-error-boundary__card">
          <div className="ff-error-boundary__heading">
            <span className="ff-error-boundary__mark" aria-hidden="true">!</span>
            <div>
              <h1 id="ff-error-title">F-Forum gặp sự cố</h1>
              <p id="ff-error-description">
                Hãy tải lại để khôi phục giao diện. Dữ liệu đã lưu không bị xóa; nội dung đang soạn dở có thể cần gửi lại.
              </p>
            </div>
          </div>

          {import.meta.env.DEV && (
            <details className="ff-error-boundary__details">
              <summary>Chi tiết kỹ thuật (chỉ hiện trong môi trường phát triển)</summary>
              <pre>{String(error?.stack || error?.message || error)}</pre>
            </details>
          )}

          <div className="ff-error-boundary__actions">
            <button autoFocus type="button" onClick={() => this.reload(false)}>
              Tải lại trang
            </button>
            <button type="button" onClick={() => this.reload(true)}>
              Thử khôi phục mô-đun rồi tải lại
            </button>
          </div>
        </section>
      </div>
    );
  }
}

export default AppErrorBoundary;
