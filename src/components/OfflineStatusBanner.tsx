/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

const browserIsOnline = (): boolean =>
  typeof navigator === 'undefined' || navigator.onLine !== false;

/** A small, non-blocking notice for operations that require the forum server. */
export const OfflineStatusBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(browserIsOnline);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="ff-offline-banner" role="status" aria-live="polite" aria-atomic="true">
      <span className="ff-offline-banner__icon" aria-hidden="true">
        <WifiOff className="w-4 h-4" />
      </span>
      <span className="ff-offline-banner__copy">
        <strong>Đang ngoại tuyến</strong>
        <span>Kết nối lại rồi thử lại các thao tác cần máy chủ; chúng có thể chưa được ghi nhận.</span>
      </span>
    </div>
  );
};

export default OfflineStatusBanner;
