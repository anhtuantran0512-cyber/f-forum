/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * imageOptimize — nén & thu nhỏ ảnh ngay trên trình duyệt trước khi lưu.
 *
 * Vì F-Forum lưu dữ liệu dạng JSON (localStorage + /api/*), ảnh gốc
 * 5MB–20MB mã hoá base64 sẽ phình lên ~1.37 lần và vượt hạn mức lưu trữ.
 * Hàm dưới đây resize theo cạnh dài và nén WebP/JPEG để ảnh luôn nhẹ
 * (mặc định ≤ ~700KB) mà mắt thường vẫn nét.
 */

export interface ImageOptimizeOptions {
  /** Cạnh dài tối đa (px). */
  maxDimension?: number;
  /** Chất lượng nén 0..1. */
  quality?: number;
  /** Dung lượng mục tiêu (bytes) sau khi nén. */
  targetBytes?: number;
}

const SKIP_OPTIMIZE_TYPES = ['image/gif', 'image/svg+xml'];

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('Không đọc được tệp ảnh'));
    };
    reader.onerror = () => reject(reader.error || new Error('Lỗi đọc tệp ảnh'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Ảnh không hợp lệ hoặc bị hỏng'));
    img.src = src;
  });
}

function fitWithin(width: number, height: number, maxDimension: number) {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToDataURL(canvas: HTMLCanvasElement, quality: number): string {
  try {
    const webp = canvas.toDataURL('image/webp', quality);
    if (webp.startsWith('data:image/webp')) return webp;
  } catch {
    /* WebP không được hỗ trợ */
  }
  try {
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return canvas.toDataURL();
  }
}

/** Ước lượng dung lượng thật của chuỗi base64 (bytes). */
function approximateBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.floor((base64.length * 3) / 4);
}

/**
 * Trả về data URL đã tối ưu cho tệp ảnh.
 * Luôn fallback về ảnh gốc nếu trình duyệt không hỗ trợ canvas/WebP.
 */
export async function optimizeImageFile(
  file: File,
  options: ImageOptimizeOptions = {}
): Promise<string> {
  const { maxDimension = 1600, quality = 0.82, targetBytes = 700 * 1024 } = options;

  const raw = await readFileAsDataURL(file);

  if (typeof document === 'undefined') return raw;
  if (SKIP_OPTIMIZE_TYPES.includes(file.type)) return raw;
  if (!file.type.startsWith('image/')) return raw;

  try {
    const img = await loadImageElement(raw);
    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;
    if (!naturalWidth || !naturalHeight) return raw;

    let { width, height } = fitWithin(naturalWidth, naturalHeight, maxDimension);
    let currentQuality = quality;
    let output = '';

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return raw;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      output = canvasToDataURL(canvas, currentQuality);

      if (approximateBytes(output) <= targetBytes) break;

      if (currentQuality > 0.55) {
        currentQuality = Math.max(0.5, currentQuality - 0.12);
      } else {
        width = Math.max(1, Math.round(width * 0.78));
        height = Math.max(1, Math.round(height * 0.78));
      }
    }

    if (!output) return raw;
    return output.length < raw.length ? output : raw;
  } catch {
    return raw;
  }
}
