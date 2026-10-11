/* Bản quyền trí tuệ thuộc về BroAmStuck */
import type { ChangeEvent } from 'react';

/** Giới hạn ảnh đính kèm câu hỏi / lời giải. */
export const QA_IMAGE_MAX_BYTES = 20 * 1024 * 1024;

/**
 * Xử lý ô chọn ảnh của câu hỏi và lời giải (dùng chung, để hai nơi không lệch quy tắc):
 * chỉ nhận ảnh, tối đa 20MB, đọc thành data URL. Lỗi nào cũng báo bằng tiếng Việt qua `setError`.
 */
export function handleImageUpload(
  e: ChangeEvent<HTMLInputElement>,
  setImage: (img: string | null) => void,
  setError: (err: string | null) => void,
): void {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    setError('Vui lòng chỉ tải lên tệp hình ảnh (PNG, JPG, WebP)!');
    e.target.value = '';
    return;
  }
  if (file.size > QA_IMAGE_MAX_BYTES) {
    setError(`Kích thước ảnh (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn cho phép 20MB!`);
    e.target.value = '';
    return;
  }
  setError(null);
  const reader = new FileReader();
  reader.onload = (ev) => {
    if (typeof ev.target?.result === 'string') {
      setImage(ev.target.result);
    }
  };
  reader.onerror = () => {
    setError('Lỗi khi đọc file ảnh. Vui lòng thử lại!');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}
