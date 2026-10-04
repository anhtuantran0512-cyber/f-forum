/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { useCallback, useEffect, useState } from 'react';

/* ==========================================================================
   NHỊP GỬI TIN (cooldown) — dùng chung cho ChatDock và ChatView
   --------------------------------------------------------------------------
   Cơ chế cũ trừ dần một biến đếm (`prev - 100`) nên lệch dần theo thời gian và
   mỗi nhịp lại tạo một interval mới. Cơ chế mới neo vào MỐC THỜI GIAN KẾT THÚC
   (timestamp) nên luôn đúng kể cả khi tab bị ẩn, chỉ chạy một interval cho mỗi
   lượt chờ, và tự kết thúc chính xác.
   Ô nhập KHÔNG bị khoá — người dùng vẫn soạn được, chỉ nút Gửi chờ tới hạn.
   ========================================================================== */

/** Thời gian chờ giữa hai tin nhắn (ms) */
export const CHAT_COOLDOWN_MS = 1800;

/** Nhịp cập nhật nhãn đếm ngược — đủ mượt cho phần số, phần thanh chạy bằng CSS */
const TICK_MS = 80;

export interface ChatCooldown {
  /** Đang trong thời gian chờ gửi tin */
  isCooling: boolean;
  remainingMs: number;
  /** Nhãn số giây còn lại, ví dụ "1.2" */
  secondsLeft: string;
  /** 1 → 0, dùng cho vòng tròn quanh nút Gửi */
  progress: number;
  /** Tăng mỗi lần người dùng cố gửi khi đang chờ → rung nhẹ thanh nhịp */
  nudgeKey: number;
  /** Bắt đầu một lượt chờ mới */
  startCooldown: () => void;
  /** Báo hiệu "chưa gửi được" mà không đổi trạng thái */
  nudge: () => void;
}

export const useChatCooldown = (durationMs: number = CHAT_COOLDOWN_MS): ChatCooldown => {
  const [endsAt, setEndsAt] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [nudgeKey, setNudgeKey] = useState(0);

  const isCooling = remainingMs > 0;

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const left = endsAt - Date.now();
      if (left <= 0) {
        setRemainingMs(0);
        setEndsAt(0);
        return;
      }
      setRemainingMs(left);
    };
    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [endsAt]);

  const startCooldown = useCallback(() => {
    setEndsAt(Date.now() + durationMs);
    setRemainingMs(durationMs);
  }, [durationMs]);

  const nudge = useCallback(() => setNudgeKey((k) => k + 1), []);

  return {
    isCooling,
    remainingMs,
    secondsLeft: (remainingMs / 1000).toFixed(1),
    progress: durationMs > 0 ? Math.max(0, Math.min(1, remainingMs / durationMs)) : 0,
    nudgeKey,
    startCooldown,
    nudge,
  };
};
