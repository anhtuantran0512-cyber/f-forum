import { useEffect, useRef } from 'react';

/**
 * Đóng lớp phủ (modal / popover) khi người dùng bấm Escape.
 *
 * Nhiều modal trong app chỉ đóng được bằng cách bấm vào nền mờ hoặc nút "Đóng".
 * Với `aria-modal="true"` thì screen reader coi phần còn lại của trang là không
 * tồn tại, nên người dùng bàn phím bị kẹt trong hộp thoại nếu thiếu đường thoát
 * bằng phím. Hook này lấp chỗ đó.
 *
 * Escape vẫn đóng kể cả khi con trỏ đang ở trong ô nhập — khớp với hành vi sẵn có
 * của CommandPalette và đúng chuẩn WAI-ARIA cho hộp thoại.
 *
 * `enabled` cho phép tắt tạm thời (ví dụ khi một hộp thoại con mở chồng lên) để
 * Escape chỉ đóng lớp trên cùng, không đóng luôn cả hai.
 *
 * Handler được giữ trong ref và đồng bộ bằng effect, nên listener chỉ gắn lại khi
 * `enabled` đổi — không bị gỡ/ gắn lại mỗi lần component cha render.
 */
export function useEscapeKey(handler: () => void, enabled = true) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      handlerRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
