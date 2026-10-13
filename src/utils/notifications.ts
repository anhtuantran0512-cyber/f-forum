/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { safeStorage } from './storage';
import type { NotificationItem } from '../components/NotificationsModal';

type NotificationInput = Omit<NotificationItem, 'id' | 'isRead'> & { id?: string };

export const pushNotification = (item: NotificationInput) => {
  let list: NotificationItem[] = [];
  const saved = safeStorage.getItem('fforum_notifications');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      /* ignore */
    }
  }

  const id = item.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  if (item.id && list.some((notification) => notification?.id === item.id)) return;
  if (!item.id && list.length > 0 && list[0]?.title === item.title && list[0]?.body === item.body) return;

  const defaultTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const newNotif: NotificationItem = {
    ...item,
    time: item.time || defaultTime,
    id,
    isRead: false,
  };
  list = [newNotif, ...list].slice(0, 30);
  safeStorage.setItem('fforum_notifications', JSON.stringify(list));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fforum_notif_sync'));
  }
};
