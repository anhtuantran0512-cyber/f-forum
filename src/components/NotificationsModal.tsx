/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MessageSquare,
  HelpCircle,
  Sparkles,
  Compass,
  ShoppingBag,
  ShieldAlert,
  Cake,
  CheckCheck,
  Coins,
} from 'lucide-react';
import type { DimensionView } from '../types';
import { safeStorage } from '../utils/storage';
import { usePopoverPosition, type DockPosition } from '../utils/popover';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  content?: string;
  time?: string;
  type: 'system' | 'qa' | 'chat' | 'club' | 'achievement' | 'interactive' | 'shop' | 'report' | 'coin';
  category?: string;
  targetView?: DimensionView;
  isRead: boolean;
  actorName?: string;
  systemName?: string;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [];

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: DimensionView) => void;
  onUnreadCountChange?: (count: number) => void;
  dockPosition?: DockPosition;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onUnreadCountChange,
  dockPosition = 'top',
  anchorRef,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = safeStorage.getItem('fforum_notifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        /* ignore */
      }
    }
    return DEFAULT_NOTIFICATIONS;
  });

  const [notifTab, setNotifTab] = useState<'all' | 'system' | 'interactive'>('all');
  const modalRef = useRef<HTMLDivElement>(null);
  const pop = usePopoverPosition(isOpen, anchorRef, dockPosition, 400, 560);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
    safeStorage.setItem('fforum_notifications', JSON.stringify(notifications));
  }, [notifications, unreadCount, onUnreadCountChange]);

  useEffect(() => {
    const handleSync = () => {
      const saved = safeStorage.getItem('fforum_notifications');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setNotifications(parsed);
          }
        } catch {
          /* ignore */
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('fforum_notif_sync', handleSync);
      window.addEventListener('storage', handleSync);
      return () => {
        window.removeEventListener('fforum_notif_sync', handleSync);
        window.removeEventListener('storage', handleSync);
      };
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.closest('[data-notif-trigger]') || target.closest('[role="dialog"]'))) {
        return;
      }
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('touchstart', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('touchstart', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      safeStorage.setItem('fforum_notifications', JSON.stringify(updated));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fforum_notif_sync'));
      }
      return updated;
    });
  };

  const handleItemClick = (item: NotificationItem) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n));
      safeStorage.setItem('fforum_notifications', JSON.stringify(updated));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fforum_notif_sync'));
      }
      return updated;
    });
    if (item.targetView) {
      onNavigate(item.targetView);
      onClose();
    }
  };

  const filtered = notifications.filter((n) => {
    if (notifTab === 'system') {
      return (
        n.type === 'system' ||
        n.type === 'achievement' ||
        n.type === 'shop' ||
        n.type === 'report' ||
        n.type === 'coin'
      );
    }
    if (notifTab === 'interactive') {
      return (
        n.type === 'qa' ||
        n.type === 'chat' ||
        n.type === 'club' ||
        n.type === 'interactive'
      );
    }
    return true;
  });

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'qa':
        return <HelpCircle size={16} className="text-cyan-400" />;
      case 'chat':
        return <MessageSquare size={16} className="text-orange-400" />;
      case 'achievement':
        return <Sparkles size={16} className="text-amber-400" />;
      case 'club':
        return <Compass size={16} className="text-emerald-400" />;
      case 'shop':
        return <ShoppingBag size={16} className="text-purple-400" />;
      case 'report':
        return <ShieldAlert size={16} className="text-rose-400" />;
      case 'coin':
        return <Coins size={16} className="text-amber-400" />;
      case 'interactive':
        return <MessageSquare size={16} className="text-amber-400" />;
      case 'system':
      default:
        return <Cake size={16} className="text-amber-400" />;
    }
  };

  return (
    <>
      {/* Invisible backdrop to catch outside clicks without closing from within modal */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Đóng bảng thông báo"
        className="fixed inset-0 z-40 bg-transparent cursor-default border-none outline-none"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />

      {/* Popover anchored to Bell button, clamped to viewport for every dock edge */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Trung tâm thông báo"
        className={`z-[70] liquid-glass rounded-3xl p-4 shadow-[0_25px_60px_rgba(0,0,0,0.92)] border border-white/20 pointer-events-auto select-none popover-morph-enter bg-[#0c1218]/95 ${
          !anchorRef || !pop.ready ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] max-w-[calc(100vw-28px)]' : ''
        }`}
        style={anchorRef ? pop.style : undefined}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Header: Brand Hoidap/F-Forum Icon & Actions */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            {/* Stylized Brand H/F Icon */}
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-cyan-400 p-[1.5px] shadow-[0_0_12px_rgba(245,158,11,0.4)]">
              <div className="w-full h-full bg-[#0a0f14] rounded-[9px] flex items-center justify-center font-black text-xs text-amber-300 font-mono">
                F
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs tracking-wider uppercase text-white font-mono">
                  THÔNG BÁO
                </span>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-semibold font-mono">
                    {unreadCount} mới
                  </span>
                )}
              </div>
              <span className="text-[9.5px] text-white/50 block">Trung tâm sự kiện thời gian thực</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-[11px] text-white/50 hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1"
              title="Đánh dấu tất cả là đã đọc"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Đã đọc</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Đóng thông báo"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Tab Filters: Tất cả | Hệ thống | Tương tác */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-black/50 rounded-2xl mb-3 border border-white/10">
          {(['all', 'system', 'interactive'] as const).map((tab) => {
            const isActive = notifTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setNotifTab(tab);
                }}
                className={`py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                    : 'text-white/60 hover:text-white border border-transparent'
                }`}
              >
                {tab === 'all' ? 'Tất cả' : tab === 'system' ? 'Hệ thống' : 'Tương tác'}
              </button>
            );
          })}
        </div>

        {/* Notification Feed */}
        <div className="max-h-[340px] overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-xs text-neutral-400 space-y-1">
              <p>Chưa có thông báo nào trong mục này.</p>
              <p className="text-[10px] text-neutral-500">Các cập nhật bài giải, coin và hệ thống sẽ xuất hiện tại đây.</p>
            </div>
          ) : (
            filtered.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleItemClick(n)}
                className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer block group ${
                  n.isRead
                    ? 'bg-white/[0.02] border-white/5 opacity-70 hover:opacity-100 hover:bg-white/[0.05]'
                    : 'bg-white/[0.06] border-white/15 hover:bg-white/10 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10 mt-0.5 shrink-0 group-hover:scale-105 transition-transform">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-white truncate">
                        {n.actorName && (
                          <strong className="text-white font-extrabold mr-1">
                            {n.actorName}
                          </strong>
                        )}
                        {n.systemName && (
                          <span className="text-cyan-400 font-bold mr-1">
                            [{n.systemName}]
                          </span>
                        )}
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b] shrink-0" />
                      )}
                    </div>
                    <p className="text-[11.5px] text-white/70 line-clamp-2 mt-1 leading-relaxed">
                      {n.body || n.content}
                    </p>
                    <div className="flex items-center justify-between mt-1.5 text-[9.5px] text-white/40 font-mono">
                      <span>{n.time}</span>
                      {n.targetView && (
                        <span className="text-amber-300 group-hover:underline">
                          Xem chi tiết →
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer Action: "Xem tất cả" button as in design specification */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onNavigate('home');
              onClose();
            }}
            className="text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors cursor-pointer"
          >
            Xem tất cả thông báo
          </button>
          <span className="text-[10px] text-white/30 font-mono">F-Forum Live Engine</span>
        </div>
      </div>
    </>
  );
};

export default NotificationsModal;
