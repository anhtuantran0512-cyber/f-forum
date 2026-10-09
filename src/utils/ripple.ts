/**
 * Gợn sóng (ripple) toả ra từ đúng điểm người dùng bấm.
 *
 * Tự dọn phần tử sau khi hoạt ảnh chạy xong nên không rò rỉ DOM. Tôn trọng
 * `prefers-reduced-motion` và lớp `.reduce-motion` mà app đang dùng: khi người
 * dùng tắt chuyển động thì chỉ trả về mà không thêm phần tử nào.
 */
export function spawnRipple(target: HTMLElement, event?: { clientX: number; clientY: number }) {
  if (typeof window === 'undefined') return;
  if (
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.classList.contains('reduce-motion')
  ) {
    return;
  }

  const rect = target.getBoundingClientRect();
  /* Không có toạ độ (bấm bằng bàn phím) thì gợn sóng toả từ tâm. */
  const x = event ? event.clientX - rect.left : rect.width / 2;
  const y = event ? event.clientY - rect.top : rect.height / 2;
  const size = Math.max(rect.width, rect.height) * 2.2;

  const ripple = document.createElement('span');
  ripple.className = 'ff-ripple';
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${x - size / 2}px`;
  ripple.style.top = `${y - size / 2}px`;
  ripple.setAttribute('aria-hidden', 'true');

  /* Nút cần `overflow: hidden` để gợn sóng không tràn ra ngoài viền tròn, và phải là
     khối định vị để gợn sóng (absolute) bám đúng nút thay vì tổ tiên gần nhất. */
  const previousOverflow = target.style.overflow;
  const previousPosition = target.style.position;
  target.style.overflow = 'hidden';
  if (window.getComputedStyle(target).position === 'static') target.style.position = 'relative';

  target.appendChild(ripple);
  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    ripple.remove();
    target.style.overflow = previousOverflow;
    target.style.position = previousPosition;
  };
  ripple.addEventListener('animationend', remove, { once: true });
  /* Lưới an toàn: nếu animationend không bắn (tab bị ẩn giữa chừng) vẫn dọn. */
  window.setTimeout(remove, 900);
}
