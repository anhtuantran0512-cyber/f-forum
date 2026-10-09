/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * SecurityNoticeToast — thông báo bảo mật nhỏ, không chặn thao tác (EPIC 5).
 *
 * Nghe sự kiện từ src/security/devtoolsGuard.ts (chỉ phát ở bản production):
 *  - cố mở DevTools bằng phím tắt → nhắc bản chính thức đã khoá;
 *  - chuột phải → nhắc MỘT lần mỗi phiên (không làm phiền mỗi cú click);
 *  - DevTools có vẻ đang mở → cảnh báo lừa đảo Self-XSS.
 * Thay cho overlay chặn toàn màn hình của bản cũ (đã bị tắt vì báo nhầm).
 */
import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { SECURITY_NOTICE_EVENT, type SecurityNoticeKind } from '../security/devtoolsGuard';
import './system/SystemToasts.css';

const COPY: Record<SecurityNoticeKind, { title: string; body: string }> = {
  shortcut: {
    title: 'Công cụ nhà phát triển đã được khoá',
    body: 'Bản chính thức của F-Forum không mở DevTools. Ai bảo cậu mở console để dán mã là đang lừa đảo đấy.',
  },
  'context-menu': {
    title: 'Chuột phải đã được khoá',
    body: 'Cậu vẫn bôi đen chữ để sao chép và dùng menu trong ô nhập liệu bình thường.',
  },
  devtools: {
    title: 'Cảnh báo bảo mật',
    body: 'Có vẻ công cụ nhà phát triển đang mở. Đừng dán mã lạ vào console — kẻ gian có thể chiếm tài khoản của cậu (Self-XSS).',
  },
};

/** Khoảng tối thiểu giữa hai lần nhắc cùng loại. */
const REPEAT_GAP_MS = 30_000;

export const SecurityNoticeToast: React.FC = () => {
  const [notice, setNotice] = useState<SecurityNoticeKind | null>(null);
  const lastShownRef = useRef<Partial<Record<SecurityNoticeKind, number>>>({});

  useEffect(() => {
    let hideTimer: number | null = null;
    const onNotice = (event: Event) => {
      const kind = (event as CustomEvent<{ kind?: SecurityNoticeKind }>).detail?.kind;
      if (!kind || !(kind in COPY)) return;
      const now = Date.now();
      const last = lastShownRef.current[kind];
      if (kind === 'context-menu' && last) return;
      if (last && now - last < REPEAT_GAP_MS) return;
      lastShownRef.current[kind] = now;
      setNotice(kind);
      if (hideTimer) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setNotice(null), kind === 'devtools' ? 9000 : 5000);
    };
    window.addEventListener(SECURITY_NOTICE_EVENT, onNotice);
    return () => {
      window.removeEventListener(SECURITY_NOTICE_EVENT, onNotice);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, []);

  if (!notice) return null;
  const copy = COPY[notice];
  return (
    <div className="ff-sys-toast ff-sys-toast--security" role="status" aria-live="polite">
      <span className="ff-sys-toast__icon" aria-hidden="true">
        <ShieldAlert className="w-4 h-4" />
      </span>
      <div className="ff-sys-toast__body">
        <p className="ff-sys-toast__title">{copy.title}</p>
        <p className="ff-sys-toast__text">{copy.body}</p>
      </div>
      <button type="button" className="ff-sys-toast__close" onClick={() => setNotice(null)} aria-label="Đóng thông báo">
        ×
      </button>
    </div>
  );
};

export default SecurityNoticeToast;
