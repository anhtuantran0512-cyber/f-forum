/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * EPIC 5 — lớp răn đe DevTools cho BẢN PRODUCTION (Master Prompt · mục 4).
 *
 * - Chặn phím tắt mở DevTools / xem nguồn: F12, Ctrl+Shift+I/J/C/K, Ctrl+U,
 *   Cmd+Opt+I/J/C/U (macOS), Cmd+Shift+C (Safari). Kiểm theo `e.code` nên đúng cả
 *   khi phím Option sinh ký tự đặc biệt trên Mac.
 * - Chặn menu chuột phải (trừ ô nhập liệu và khi đang bôi đen chữ để sao chép).
 * - Phát hiện DevTools dạng "dock" và hiện cảnh báo Self-XSS (KHÔNG khoá trang).
 *
 * Chỉ bật khi `import.meta.env.PROD` (xem App.tsx) — bản dev vẫn debug tự do.
 *
 * Trung thực: không thể chặn 100% người dùng có kinh nghiệm (menu trình duyệt,
 * DevTools tách cửa sổ…). Đây là lớp răn đe + cảnh báo lừa đảo cho người dùng
 * phổ thông; mọi kiểm tra quyền thật đều ở máy chủ.
 */
import { useEffect } from 'react';
import { emitSecurityNotice, isDevtoolsShortcut, isLikelyDevtoolsResize, type ViewportSnapshot } from './devtoolsSignals.ts';

export {
  SECURITY_NOTICE_EVENT,
  emitSecurityNotice,
  isDevtoolsShortcut,
  isLikelyDevtoolsResize,
  type SecurityNoticeKind,
  type ViewportSnapshot,
} from './devtoolsSignals.ts';

const isEditableTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  return Boolean(el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], .allow-right-click'));
};

export const useConsoleProtection = (enabled: boolean): void => {
  useEffect(() => {
    if (!enabled) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isDevtoolsShortcut(e)) return;
      /* Ctrl+U trong ô soạn thảo có thể là "gạch chân" — không cướp phím đó. */
      if (e.code === 'KeyU' && isEditableTarget(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      emitSecurityNotice('shortcut');
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [enabled]);
};

export const useRightClickBlock = (enabled: boolean): void => {
  useEffect(() => {
    if (!enabled) return undefined;
    const onContextMenu = (e: MouseEvent) => {
      if (isEditableTarget(e.target)) return;
      /* Đang bôi đen chữ → cho phép menu để sao chép (đừng phá thao tác học tập). */
      const selection = typeof window.getSelection === 'function' ? window.getSelection() : null;
      if (selection && !selection.isCollapsed && String(selection).trim()) return;
      e.preventDefault();
      emitSecurityNotice('context-menu');
    };
    document.addEventListener('contextmenu', onContextMenu, true);
    return () => document.removeEventListener('contextmenu', onContextMenu, true);
  }, [enabled]);
};

const takeSnapshot = (): ViewportSnapshot => ({
  innerWidth: window.innerWidth,
  innerHeight: window.innerHeight,
  outerWidth: window.outerWidth,
  outerHeight: window.outerHeight,
  dpr: window.devicePixelRatio || 1,
});

export const useDevToolsDetection = (enabled: boolean): void => {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;
    /* Chỉ máy có chuột: trên di động bàn phím ảo cũng làm vùng nhìn co lại. */
    if (!window.matchMedia?.('(pointer: fine)').matches) return undefined;
    let snapshot = takeSnapshot();
    let fired = false;
    const onResize = () => {
      const next = takeSnapshot();
      if (!fired && isLikelyDevtoolsResize(snapshot, next)) {
        fired = true;
        emitSecurityNotice('devtools');
      }
      snapshot = next;
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [enabled]);
};
