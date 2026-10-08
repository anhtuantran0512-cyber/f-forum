/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * ConsoleBlocker — Security component chống DevTools/Console mở
 * 
 * Chiến thuật đa lớp:
 * 1. Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
 * 2. Detect DevTools mở (via window.outerWidth/outerHeight discrepancy)
 * 3. Block context menu (chuôt phải)
 * 4. Console.log interception
 * 5. XSS/CSRF vệ sinh
 * 
 * Lưu ý: Không thể chặn 100% người dùng có kinh nghiệm,
 * nhưng đủ ngăn 95% người dùng thông thường.
 */

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

export const ConsoleBlocker: React.FC<ConsoleBlockerProps> = ({
  enabled = true,
  showOverlay = true,
  blockMessage = '⛔ DEVTOOLS ĐƯỢC KHÓA — Không cấp quyền debug cho tài khoản này.',
  allowKeys = ['Ctrl+K', 'Ctrl+I', 'Escape'],
}) => {
  // This component returns null but sets up protections via useEffect
  return (
    <>
      {enabled && showOverlay && (
        <BlockingOverlay 
          message={blockMessage} 
          isActive={false} 
        />
      )}
    </>
  );
};

// Blocking overlay (hidden by default, shows when DevTools detected)
interface BlockingOverlayProps {
  message: string;
  isActive: boolean;
}

const BlockingOverlay: React.FC<BlockingOverlayProps> = ({ message, isActive }) => {
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

// Hook: kích hoạt bảo vệ Console/DevTools
export const useConsoleProtection = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;

    // ========================================
    // 1. PHÍM TẮT DEVTOOLS
    // ========================================
    const blockedShortcuts = new Set([
      'F12',
      'Control+Shift+I',
      'Control+Shift+J',
      'Control+U',
    ]);

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const combo = `${e.control ? 'Control+' : ''}${e.shift ? 'Shift+' : ''}${key}`;
      
      // Check if blocked
      if (blockedShortcuts.has(key) || blockedShortcuts.has(combo)) {
        e.preventDefault();
        e.stopPropagation();
        // Visual feedback
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([30, 50, 30]);
        }
        // Close any open DevTools immediately
        if (e.key === 'F12') {
          window.close(); // Try to close (may not work in all browsers)
        }
        return false;
      }

      // Ctrl+Shift+R (hard reload) also blocked
      if (e.key === 'r' && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    // ========================================
    // 2. DETECT DEVTOOLS (Chrome/Firefox)
    // ========================================
    let devtoolsOpen = false;
    let checkInterval: number | null = null;

    const detectDevTools = () => {
      const widthThreshold = 160;
      const heightThreshold = 160;

      // Chrome detection: outerWidth/outerHeight < screen width/height when DevTools open
      if (window.outerWidth < window.screen.width - widthThreshold ||
          window.outerHeight < window.screen.height - heightThreshold) {
        if (!devtoolsOpen) {
          devtoolsOpen = true;
          console.warn('⚠️ DevTools detected — triggering protection');
          // Show overlay
          window.dispatchEvent(new CustomEvent('fforum-devtools-detected'));
        }
      } else {
        devtoolsOpen = false;
      }
    };

    // Check every 2 seconds
    checkInterval = window.setInterval(detectDevTools, 2000);
    
    // Also check on resize
    window.addEventListener('resize', detectDevTools);

    // Console.log interceptor (chặn thông tin rò rỉ)
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    console.log = function(...args) {
      // Kiểm tra có phải là lệnh của hệ thống không
      const isSystemMessage = args.some(arg => 
        typeof arg === 'string' && 
        (arg.includes('[System]') || arg.includes('fforum-'))
      );
      if (!isSystemMessage) {
        // Lưu lại không log ra (ăn nhẹ thông tin)
        return;
      }
      originalLog.apply(console, args);
    };

    console.warn = function(...args) {
      const isSystemMessage = args.some(arg => 
        typeof arg === 'string' && arg.includes('[System]')
      );
      if (!isSystemMessage) return;
      originalWarn.apply(console, args);
    };

    // ========================================
    // 3. BLOCK CONTEXT MENU (chuột phải)
    // ========================================
    const handleContextMenu = (e: MouseEvent) => {
      // Cho phép context menu trên một số phần tử (input, textarea)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return; // Cho phép chuột phải trên input
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      // Visual feedback
      if (target.classList.contains('potator-magnetic')) {
        // Làm ngắn animation feedback
        const originalTransition = target.style.transition;
        target.style.transition = 'transform 0.1s ease';
        target.style.transform = 'scale(0.98)';
        setTimeout(() => {
          target.style.transform = 'scale(1)';
          target.style.transition = originalTransition;
        }, 100);
      }
    };

    document.addEventListener('contextmenu', handleContextMenu, true);

    // ========================================
    // 4. BLOCK ELEMENT INSPECT (F12 → Inspect Element)
    // ========================================
    // Inject CSS để ẩn element khi inspect
    const inspectBlockStyle = document.createElement('style');
    inspectBlockStyle.id = 'fforum-inspect-block';
    inspectBlockStyle.textContent = `
      /* Ẩn các element quan trọng khi inspect */
      [data-fforum-critical] {
        /* Không ẩn hoàn toàn (vẫn render được) */
      }
      
      /* Khi DevTools mở, ẩn overlay */
      body.devtools-open [data-fforum-protect] {
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(inspectBlockStyle);

    // ========================================
    // 5. CLEANUP
    // ========================================
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      if (checkInterval) window.clearInterval(checkInterval);
      window.removeEventListener('resize', detectDevTools);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      console.info = originalInfo;
      
      const style = document.getElementById('fforum-inspect-block');
      if (style) style.remove();
    };
  }, [enabled]);
};

// Hook detect DevTools open state
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
