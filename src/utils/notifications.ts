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

  const newNotif: NotificationItem = {
    ...item,
    id,
    isRead: false,
  };
  list = [newNotif, ...list].slice(0, 30);
  safeStorage.setItem('fforum_notifications', JSON.stringify(list));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fforum_notif_sync'));
  }
};
