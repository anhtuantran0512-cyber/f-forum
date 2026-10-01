import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  X,
  MessageSquare,
  HelpCircle,
  Sparkles,
  Compass,
} from 'lucide-react';
import type { DimensionView } from '../types';
import { safeStorage } from '../utils/storage';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  content?: string;
  time: string;
  type: 'system' | 'qa' | 'chat' | 'club' | 'achievement' | 'interactive';
  targetView?: DimensionView;
  isRead: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Chào mừng gia nhập F-Forum!',
    body: 'Hệ thống diễn đàn học sinh chính thức hoạt động với dữ liệu thực và công nghệ kết nối đa thiết bị.',
    content: 'Hệ thống diễn đàn học sinh chính thức hoạt động với dữ liệu thực và công nghệ kết nối đa thiết bị.',
    time: 'Vừa xong',
    type: 'system',
    targetView: 'home',
    isRead: false,
  },
  {
    id: 'notif-2',
    title: 'Sàn Q&A Tri Thức sôi nổi',
    body: 'Nhiều bài tập khó đang chờ các cao thủ chia sẻ lời giải chuẩn để nhận huy hiệu và +100 XP.',
    content: 'Nhiều bài tập khó đang chờ các cao thủ chia sẻ lời giải chuẩn để nhận huy hiệu và +100 XP.',
    time: '5 phút trước',
    type: 'qa',
    targetView: 'qa',
    isRead: false,
  },
  {
    id: 'notif-3',
    title: 'Phòng Chat thời gian thực',
    body: 'Kết bạn bốn phương và trao đổi bài học nhanh chóng cùng học sinh khắp các cơ sở.',
    content: 'Kết bạn bốn phương và trao đổi bài học nhanh chóng cùng học sinh khắp các cơ sở.',
    time: '15 phút trước',
    type: 'chat',
    targetView: 'chat',
    isRead: false,
  },
  {
    id: 'notif-4',
    title: 'Khám phá Quả Cầu 3D Vinh Danh',
    body: 'Khu Vinh Danh 3D Fibonacci tôn vinh nhà sáng lập và ghi lại những cột mốc đáng nhớ của F-Forum.',
    content: 'Khu Vinh Danh 3D Fibonacci tôn vinh nhà sáng lập và ghi lại những cột mốc đáng nhớ của F-Forum.',
    time: '1 giờ trước',
    type: 'achievement',
    targetView: 'chronicles',
    isRead: true,
  },
];

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: DimensionView) => void;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onUnreadCountChange,
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
      if (target && target.closest('[data-notif-trigger]')) {
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
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('touchstart', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
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
    if (notifTab === 'system') return n.type === 'system' || n.type === 'achievement';
    if (notifTab === 'interactive') return n.type === 'qa' || n.type === 'chat' || n.type === 'club' || n.type === 'interactive';
    return true;
  });

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'qa':
        return <HelpCircle size={15} />;
      case 'chat':
        return <MessageSquare size={15} />;
      case 'achievement':
        return <Sparkles size={15} />;
      case 'club':
        return <Compass size={15} />;
      case 'interactive':
        return <MessageSquare size={15} />;
      default:
        return <Bell size={15} />;
    }
  };

  return (
    <>
      {/* Invisible backdrop to catch outside clicks */}
      <div 
        className="fixed inset-0 z-40 bg-transparent cursor-default" 
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }} 
      />

      {/* Popover anchored directly below Bell button */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Thông Báo"
        onClick={(e) => e.stopPropagation()}
        className="absolute top-[calc(100%+12px)] right-0 z-50 w-[380px] max-w-[calc(100vw-32px)] liquid-glass rounded-3xl p-4 shadow-[0_25px_60px_rgba(0,0,0,0.9)] animate-fade-up pointer-events-auto border border-white/15"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bell className="text-amber-400" size={16} />
            <span className="font-semibold text-xs tracking-wider uppercase text-white">Thông Báo</span>
            {unreadCount > 0 && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                {unreadCount} mới
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-[11px] text-white/40 hover:text-amber-300 transition-colors cursor-pointer"
            >
              Đã đọc tất cả
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-white/40 hover:text-white transition-colors cursor-pointer"
              aria-label="Đóng thông báo"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-black/40 rounded-xl mb-3">
          {(['all', 'system', 'interactive'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setNotifTab(tab)}
              className={`py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                notifTab === tab ? 'bg-white/15 text-white shadow-sm' : 'text-white/40 hover:text-white'
              }`}
            >
              {tab === 'all' ? 'Tất cả' : tab === 'system' ? 'Hệ thống' : 'Tương tác'}
            </button>
          ))}
        </div>

        {/* Notification Feed */}
        <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 no-scrollbar">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400 space-y-1">
              <p>Chưa có thông báo nào trong mục này.</p>
            </div>
          ) : (
            filtered.map((n) => (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  n.isRead
                    ? 'bg-white/[0.02] border-white/5 opacity-60'
                    : 'bg-white/[0.06] border-white/15 hover:bg-white/10'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-300 mt-0.5 shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{n.title}</p>
                    <p className="text-[11px] text-white/60 line-clamp-2 mt-0.5 leading-relaxed">
                      {n.body || n.content}
                    </p>
                    <span className="text-[9px] text-white/30 mt-1 block">{n.time}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationsModal;
