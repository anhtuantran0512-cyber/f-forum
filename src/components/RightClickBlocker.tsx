/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useState, useCallback, useRef } from 'react';

interface RightClickBlockerProps {
  /** Bật/tắt chặn chuột phải */
  enabled?: boolean;
  /** Hiển thị custom context menu khi chặn */
  showFeedback?: boolean;
  /** Custom message khi chặn chuột phải */
  feedbackMessage?: string;
  /** Cho phép chuột phải trên một số element */
  allowedSelectors?: string[];
}

const DEFAULT_MESSAGE = '🔒 Bấm chuột phải bị chặn — Bảo mật F-Forum';

/**
 * RightClickBlocker — Component chặn chuột phải với hiệu ứng visual
 * 
 * Feature:
 * - Chặn context menu mặc định
 * - Hiển thị floating feedback khi chặn
 * - Cho phép whitelist một số selector
 * - Tích hợp với magnetic hover cards
 */
export const RightClickBlocker: React.FC<RightClickBlockerProps> = ({
  enabled = true,
  showFeedback = true,
  feedbackMessage = DEFAULT_MESSAGE,
  allowedSelectors = ['input', 'textarea', '[contenteditable]', '.allow-right-click'],
}) => {
  const [feedback, setFeedback] = useState<{
    visible: boolean;
    x: number;
    y: number;
  }>({ visible: false, x: 0, y: 0 });
  
  const timeoutRef = useRef<number | null>(null);

  const showFeedbackEffect = useCallback((x: number, y: number) => {
    setFeedback({ visible: true, x, y });
    
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = window.setTimeout(() => {
      setFeedback({ visible: false, x: 0, y: 0 });
    }, 800);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleContextMenu = (e: MouseEvent) => {
      /* Check nếu element được whitelist */
      const target = e.target as HTMLElement;
      
      for (const selector of allowedSelectors) {
        if (target.matches(selector)) {
          return; /* Cho phép chuột phải trên element này */
        }
      }

      /* Chặn context menu */
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      /* Hiện feedback */
      if (showFeedback) {
        showFeedbackEffect(e.clientX, e.clientY);
      }

      /* Haptic feedback (nếu có) */
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(30);
      }
    };

    /* Sử dụng capture: true để chặn trước khi propagate */
    document.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, showFeedback, allowedSelectors, showFeedbackEffect]);

  return (
    <>
      {/* Feedback toast khi chặn chuột phải */}
      <RightClickFeedback
        visible={feedback.visible}
        x={feedback.x}
        y={feedback.y}
        message={feedbackMessage}
      />
    </>
  );
};

/* Custom feedback UI */
interface RightClickFeedbackProps {
  visible: boolean;
  x: number;
  y: number;
  message: string;
}

const RightClickFeedback: React.FC<RightClickFeedbackProps> = ({
  visible,
  x,
  y,
  message,
}) => {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        transform: 'translate(-50%, -100%)',
        zIndex: 2147483646,
        pointerEvents: 'none',
        animation: 'rightClickBlockFade 0.8s ease-out forwards',
      }}
      aria-hidden="true"
    >
      {/* Icon lock */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(8,11,17,0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '8px 12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '12px',
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: '#f472b6' }}
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>{message}</span>
      </div>

      {/* Arrow pointing to cursor */}
      <div
        style={{
          position: 'absolute',
          bottom: '-6px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid rgba(8,11,17,0.95)',
        }}
        aria-hidden="true"
      />
    </div>
  );
};

/* Global keyframes for feedback animation */
export const injectRightClickStyles = (): void => {
  if (document.getElementById('right-click-block-styles')) return;

  const style = document.createElement('style');
  style.id = 'right-click-block-styles';
  style.textContent = `
    @keyframes rightClickBlockFade {
      0% {
        opacity: 0;
        transform: translate(-50%, -100%) scale(0.8);
      }
      15% {
        opacity: 1;
        transform: translate(-50%, -100%) scale(1);
      }
      85% {
        opacity: 1;
        transform: translate(-50%, calc(-100% - 8px)) scale(1);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, calc(-100% - 20px)) scale(0.95);
      }
    }
    
    /* Visual feedback trên element bị chặn */
    .right-click-blocked {
      transition: background 0.15s ease;
    }
    
    .right-click-blocked:active {
      background: rgba(244, 114, 182, 0.1) !important;
    }
  `;
  document.head.appendChild(style);
};

/* Hook đơn giản hơn cho việc chặn chuột phải */
export const useRightClickBlock = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      /* Skip trên input/textarea */
      if (target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.isContentEditable) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [enabled]);
};

export default RightClickBlocker;
