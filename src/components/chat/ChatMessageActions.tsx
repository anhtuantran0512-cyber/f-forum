/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CornerUpLeft, MoreHorizontal, Trash2 } from 'lucide-react';

interface ChatMessageActionsProps {
  canReply: boolean;
  canDelete: boolean;
  align?: 'start' | 'end';
  onReply: () => void;
  onDelete?: () => void;
}

interface MenuPosition {
  top: number;
  left: number;
  ready: boolean;
}

/**
 * Một nút "tùy chọn" duy nhất thay cho cụm icon luôn hiện trên từng tin nhắn.
 * Menu được render bằng portal + position: fixed để không bị khung cuộn hoặc
 * cột chat hẹp cắt mất; vị trí tự lật lên/xuống và kẹp trong viewport.
 */
export const ChatMessageActions: React.FC<ChatMessageActionsProps> = ({
  canReply,
  canDelete,
  align = 'start',
  onReply,
  onDelete,
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [position, setPosition] = useState<MenuPosition>({ top: 0, left: 0, ready: false });

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    setPosition(previous => ({ ...previous, ready: false }));
    if (returnFocus) triggerRef.current?.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;
      const margin = 8;
      const gap = 6;
      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      let top = triggerRect.top - menuRect.height - gap;
      if (top < margin) top = triggerRect.bottom + gap;
      if (top + menuRect.height > window.innerHeight - margin) {
        top = Math.max(margin, window.innerHeight - menuRect.height - margin);
      }
      let left = align === 'end' ? triggerRect.right - menuRect.width : triggerRect.left;
      left = Math.min(Math.max(margin, left), window.innerWidth - menuRect.width - margin);
      setPosition({ top, left, ready: true });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      close(true);
    };
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      close();
    };
    const handleScroll = () => close();
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);
    window.addEventListener('scroll', handleScroll, true);
    const frame = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus({ preventScroll: true });
    });
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, close]);

  if (!canReply && !canDelete) return null;

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') || []);
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      items[(index + 1 + items.length) % items.length].focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length].focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      items[0].focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      items[items.length - 1].focus();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      close(true);
    }
  };

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          id={menuId}
          className="ff-chat-actions-menu"
          role="menu"
          aria-label="Thao tác tin nhắn"
          onKeyDown={handleMenuKeyDown}
          style={{
            top: position.top,
            left: position.left,
            visibility: position.ready ? 'visible' : 'hidden',
          }}
        >
          {canReply && (
            <button
              type="button"
              role="menuitem"
              className="ff-chat-actions-item"
              onClick={() => {
                close(true);
                onReply();
              }}
            >
              <CornerUpLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Trả lời</span>
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              role="menuitem"
              className="ff-chat-actions-item ff-chat-actions-item--danger"
              onClick={() => {
                close(true);
                onDelete?.();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Thu hồi tin nhắn</span>
            </button>
          )}
        </div>,
        document.body,
      )
    : null;

  return (
    <div
      ref={wrapRef}
      className={`ff-chat-message-actions ${align === 'end' ? 'ff-chat-message-actions--end' : 'ff-chat-message-actions--start'}`}
      data-open={open ? 'true' : undefined}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (open) {
            close(true);
          } else {
            setPosition(previous => ({ ...previous, ready: false }));
            setOpen(true);
          }
        }}
        className="ff-chat-actions-trigger"
        aria-label="Tùy chọn tin nhắn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title="Tùy chọn tin nhắn"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      {menu}
    </div>
  );
};
