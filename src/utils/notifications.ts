/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { safeStorage } from './storage';
import type { NotificationItem } from '../components/NotificationsModal';

export const pushNotification = (item: Omit<NotificationItem, 'id' | 'isRead'>) => {
  const newNotif: NotificationItem = {
    ...item,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    isRead: false,
  };

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

  list = [newNotif, ...list].slice(0, 30);
  safeStorage.setItem('fforum_notifications', JSON.stringify(list));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fforum_notif_sync'));
  }
};
