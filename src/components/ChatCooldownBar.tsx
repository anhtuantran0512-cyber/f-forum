/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { CHAT_COOLDOWN_MS } from '../utils/chatCooldown';

/* ==========================================================================
   THANH NHỊP GỬI TIN — hiển thị cơ chế chờ gửi của phòng chat
   --------------------------------------------------------------------------
   Thay cho hai khối cũ (một dòng chữ "đang khoá" + một thanh chạy riêng) vốn
   chồng chéo và nhấp nháy: nay là MỘT dải gọn nằm ngay trên ô nhập, gồm vòng
   tròn rút dần, nhãn số giây và đường ray tiến trình. Toàn bộ chuyển động do
   CSS lo (một animation duy nhất), JS chỉ cập nhật con số mỗi 80ms.
   Không có lớp phủ nào bắt sự kiện chuột → không bao giờ chặn tương tác.
   ========================================================================== */

interface ChatCooldownBarProps {
  isCooling: boolean;
  remainingMs: number;
  nudgeKey?: number;
  durationMs?: number;
  /** 'view' = bản đầy đủ trong trang chat, 'dock' = bản gọn trong khung nổi */
  variant?: 'view' | 'dock';
}

export function ChatCooldownBar({
  isCooling,
  remainingMs,
  nudgeKey = 0,
  durationMs = CHAT_COOLDOWN_MS,
  variant = 'view',
}: ChatCooldownBarProps) {
  const secondsLeft = (remainingMs / 1000).toFixed(1);
  const percent = durationMs > 0 ? Math.max(0, Math.min(100, (remainingMs / durationMs) * 100)) : 0;

  return (
    <div
      className={`ff-cd ff-cd--${variant} ${isCooling ? 'is-cooling' : 'is-ready'}`}
      /* Mỗi lần cố gửi sớm, component được remount → animation rung chạy lại */
      key={nudgeKey}
      role="timer"
      aria-label={isCooling ? 'Đang chờ để gửi tin tiếp theo' : 'Sẵn sàng gửi tin'}
    >
      <span className="ff-cd__dial" aria-hidden="true">
        <svg viewBox="0 0 36 36" className="ff-cd__svg">
          <circle className="ff-cd__dial-track" cx="18" cy="18" r="15.5" />
          <circle
            className="ff-cd__dial-arc"
            cx="18"
            cy="18"
            r="15.5"
            style={{ strokeDashoffset: `${97.4 - 97.4 * (percent / 100)}` }}
          />
        </svg>
        <b className="ff-cd__dial-value font-mono">{isCooling ? Math.ceil(remainingMs / 1000) : '✓'}</b>
      </span>

      <span className="ff-cd__body">
        <span className="ff-cd__label">
          {isCooling ? 'Đã gửi · nhịp chống spam đang chạy' : 'Nhịp gửi tin · sẵn sàng'}
        </span>
        <span className="ff-cd__rail" aria-hidden="true">
          <i style={{ width: isCooling ? `${percent}%` : '100%' }} />
        </span>
      </span>

      <span className="ff-cd__value font-mono">
        {isCooling ? `${secondsLeft}s` : 'Có thể gửi'}
      </span>
    </div>
  );
}

export default ChatCooldownBar;
