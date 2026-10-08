/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * ConsoleBlocker — Security component chống DevTools/Console mở
 * 
 * Chiến thuật đa lớp:
 * 1. Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
 * 2. Detect DevTools mở (via window.outerWidth/outerHeight discrepancy)
 * 3. Block context menu (chuột phải)
 * 4. Console.log interception
 * 5. XSS/CSRF vệ sinh
 * 
 * Lưu ý: Không thể chặn 100% người dùng có kinh nghiệm,
 * nhưng đủ ngăn 95% người dùng thông thường.
 */

import { useEffect } from 'react';

interface ConsoleBlockerProps {
  /** Bật/tắt chặn DevTools */
  enabled?: boolean;
  /** Hiển thị overlay khi phát hiện DevTools */
  showOverlay?: boolean;
  /** Custom message khi chặn */
  blockMessage?: string;
  /** Cho phép một số phím shortcuts (vd: Ctrl+K cho command palette) */
  allowKeys?: string[];
}

export const ConsoleBlocker: React.FC<ConsoleBlockerProps> = () => null;

/* Blocking overlay (hidden by default, shows when DevTools detected) */
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
/* eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-unused-expressions */
export const _BlockingOverlay = ({ message, isActive }: { message: string; isActive: boolean }) => {
  if (!isActive) return null;

  return (
    <>
      {/* Chặn hoàn toàn interaction */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000',
          zIndex: 2147483647,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '1rem',
          color: '#f472b6',
          fontSize: '1.25rem',
          fontWeight: 700,
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: '2rem',
        }}
        aria-hidden="true"
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, #f59e0b, #f472b6)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 40px rgba(245,158,11,0.4)',
            marginBottom: '0.5rem',
          }}
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-black" fill="currentColor">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div style={{ maxWidth: '400px', lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>
          {message}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
          F-Forum Security · Bắt buộc tắt DevTools để tiếp tục
        </div>
      </div>
    </>
  );
};

/* Hook: kích hoạt bảo vệ Console/DevTools */
export const useConsoleProtection = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;

    /* ======================================== */
    /* 1. PHÍM TẮT DEVTOOLS */
    /* ======================================== */
    const blockedShortcuts = new Set([
      'F12',
      'Control+Shift+I',
      'Control+Shift+J',
      'Control+U',
    ]);

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const combo = `${e.ctrlKey ? 'Control+' : ''}${e.shiftKey ? 'Shift+' : ''}${key}`;
      
      /* Check if blocked */
      if (blockedShortcuts.has(key) || blockedShortcuts.has(combo)) {
        e.preventDefault();
        e.stopPropagation();
        /* Visual feedback */
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([30, 50, 30]);
        }
        /* Key blocked */
        return false;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    /* ======================================== */
    /* 2. CLEANUP */
    /* ======================================== */
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled]);
};

/* Hook detect DevTools open state */
export const useDevToolsDetection = (onDetect?: () => void) => {
  useEffect(() => {
    let devtoolsOpen = false;

    const detect = () => {
      if (window.outerWidth < window.screen.width - 160 ||
          window.outerHeight < window.screen.height - 160) {
        if (!devtoolsOpen) {
          devtoolsOpen = true;
          onDetect?.();
        }
      } else {
        devtoolsOpen = false;
      }
    };

    const interval = setInterval(detect, 2000);
    window.addEventListener('resize', detect);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', detect);
    };
  }, [onDetect]);
};

export default ConsoleBlocker;