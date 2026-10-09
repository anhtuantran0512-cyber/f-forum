/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * EPIC 5 — Chuẩn bị ảnh đại diện / ảnh bìa trước khi tải lên.
 *
 * Bản cũ vẽ ảnh gốc xuống canvas ≤512px trong MỘT bước với chất lượng làm mịn
 * mặc định ("low") → ảnh chụp lớn bị răng cưa / mờ. Ở đây:
 *  1. Giữ nguyên tỷ lệ khung hình (không kéo méo, không cắt — server tự cắt vuông
 *     theo vùng nổi bật cho bản thumb/medium).
 *  2. Thu nhỏ nhiều bước, mỗi bước tối đa 1/2 (step-down) với
 *     `imageSmoothingQuality = 'high'` — tránh răng cưa khi giảm một bước lớn.
 *  3. Unsharp mask nhẹ (amount 0.35, bán kính 1px, ngưỡng chống nhiễu) bù độ
 *     mềm sinh ra khi thu nhỏ.
 *  4. Xuất `canvas.toDataURL('image/jpeg', 0.9)`; ảnh có vùng trong suốt thì giữ
 *     kênh alpha bằng WebP 0.92 (hoặc PNG) để logo nền trong không bị nền đen.
 * Máy chủ xử lý lại bằng sharp (server/mediaPipeline.ts) và sinh 3 cỡ.
 */
import { postJson } from './session.ts';

export interface PreparedImage {
  dataUrl: string;
  width: number;
  height: number;
  mime: string;
  /** Dung lượng ước tính sau khi giải mã base64. */
  bytes: number;
}

export interface PrepareOptions {
  /** Cạnh dài tối đa của ảnh xuất ra. */
  maxSide: number;
  /** Cạnh ngắn tối thiểu của ảnh nguồn (nhỏ hơn thì từ chối). */
  minSide?: number;
  /** Mức làm nét 0..1 (mặc định 0.35 — "nhẹ"). */
  sharpenAmount?: number;
}

/** Ảnh nguồn quá lớn làm máy yếu tràn bộ nhớ khi giải mã. */
const MAX_SOURCE_PIXELS = 50_000_000;

type Drawable = ImageBitmap | HTMLImageElement | HTMLCanvasElement;

const sizeOf = (source: Drawable) =>
  'naturalWidth' in source
    ? { width: source.naturalWidth, height: source.naturalHeight }
    : { width: source.width, height: source.height };

const loadSource = async (file: Blob): Promise<Drawable> => {
  if (typeof createImageBitmap === 'function') {
    try {
      /* 'from-image' áp hướng xoay EXIF (ảnh chụp dọc từ điện thoại). */
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* Một số trình duyệt không nhận tuỳ chọn — dùng <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const makeCanvas = (width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh (canvas).');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return { canvas, ctx };
};

/** Thu nhỏ nhiều bước — mỗi bước tối đa còn 1/2 kích thước. */
export const stepDownResize = (source: Drawable, targetW: number, targetH: number): HTMLCanvasElement => {
  let { width: curW, height: curH } = sizeOf(source);
  let current: Drawable = source;
  while (curW / 2 > targetW && curH / 2 > targetH) {
    curW = Math.round(curW / 2);
    curH = Math.round(curH / 2);
    const step = makeCanvas(curW, curH);
    step.ctx.drawImage(current, 0, 0, curW, curH);
    current = step.canvas;
  }
  const out = makeCanvas(targetW, targetH);
  out.ctx.drawImage(current, 0, 0, out.canvas.width, out.canvas.height);
  return out.canvas;
};

/** Làm mờ hộp tách rời (ngang rồi dọc) bán kính 1 — đủ cho unsharp mask nhẹ. */
const boxBlur = (src: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray => {
  const tmp = new Uint8ClampedArray(src.length);
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const l = Math.max(0, x - 1);
      const r = Math.min(width - 1, x + 1);
      const i = (y * width + x) * 4;
      const il = (y * width + l) * 4;
      const ir = (y * width + r) * 4;
      for (let c = 0; c < 3; c++) tmp[i + c] = (src[il + c] + src[i + c] + src[ir + c]) / 3;
      tmp[i + 3] = src[i + 3];
    }
  }
  for (let y = 0; y < height; y++) {
    const t = Math.max(0, y - 1);
    const b = Math.min(height - 1, y + 1);
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const it = (t * width + x) * 4;
      const ib = (b * width + x) * 4;
      for (let c = 0; c < 3; c++) out[i + c] = (tmp[it + c] + tmp[i + c] + tmp[ib + c]) / 3;
      out[i + 3] = tmp[i + 3];
    }
  }
  return out;
};

/**
 * Unsharp mask: kết quả = gốc + amount × (gốc − mờ). Bỏ qua chênh lệch < ngưỡng
 * để không khuếch đại nhiễu/vệt nén JPEG ở vùng da, nền phẳng.
 */
export const unsharpMask = (pixels: Uint8ClampedArray, width: number, height: number, amount = 0.35, threshold = 3): void => {
  if (amount <= 0) return;
  const blurred = boxBlur(pixels, width, height);
  for (let i = 0; i < pixels.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const diff = pixels[i + c] - blurred[i + c];
      if (Math.abs(diff) >= threshold) pixels[i + c] = pixels[i + c] + diff * amount;
    }
  }
};

const hasTransparency = (pixels: Uint8ClampedArray): boolean => {
  /* Lấy mẫu thưa cho nhanh: ảnh có nền trong suốt thì vùng trong suốt rất rộng. */
  const stride = Math.max(4, Math.floor(pixels.length / 4 / 40_000) * 4);
  for (let i = 3; i < pixels.length; i += stride) if (pixels[i] < 250) return true;
  return false;
};

const estimateBytes = (dataUrl: string) => {
  const comma = dataUrl.indexOf(',');
  return Math.floor(((dataUrl.length - comma - 1) * 3) / 4);
};

export const prepareImageForUpload = async (file: Blob, options: PrepareOptions): Promise<PreparedImage> => {
  const { maxSide, minSide = 32, sharpenAmount = 0.35 } = options;
  const source = await loadSource(file);
  try {
    const { width, height } = sizeOf(source);
    if (!width || !height) throw new Error('Không đọc được kích thước ảnh.');
    if (width * height > MAX_SOURCE_PIXELS) throw new Error('Ảnh có độ phân giải quá lớn — hãy chọn ảnh dưới 50 megapixel.');
    if (Math.min(width, height) < minSide) throw new Error(`Ảnh quá nhỏ (tối thiểu ${minSide}×${minSide} px).`);

    const scale = Math.min(1, maxSide / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));
    const canvas = stepDownResize(source, targetW, targetH);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh (canvas).');

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const transparent = hasTransparency(image.data);
    /* Chỉ làm nét khi thật sự thu nhỏ — ảnh giữ nguyên cỡ không cần bù độ mềm. */
    if (scale < 1) {
      unsharpMask(image.data, canvas.width, canvas.height, sharpenAmount);
      ctx.putImageData(image, 0, 0);
    }

    let mime = 'image/jpeg';
    let dataUrl: string;
    if (transparent) {
      dataUrl = canvas.toDataURL('image/webp', 0.92);
      mime = 'image/webp';
      if (!dataUrl.startsWith('data:image/webp')) {
        dataUrl = canvas.toDataURL('image/png');
        mime = 'image/png';
      }
    } else {
      dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    }
    return { dataUrl, width: canvas.width, height: canvas.height, mime, bytes: estimateBytes(dataUrl) };
  } finally {
    if ('close' in source && typeof source.close === 'function') source.close();
  }
};

export interface UploadedImage {
  url: string;
  variants: Record<'thumb' | 'medium' | 'original', { url: string; width: number; height: number; bytes: number }>;
  engine: 'sharp' | 'passthrough';
}

/** Tải ảnh đã chuẩn bị lên máy chủ; trả URL ngắn (≤ vài chục ký tự) để lưu vào hồ sơ. */
export const uploadProcessedImage = async (kind: 'avatar' | 'banner', dataUrl: string): Promise<UploadedImage> => {
  let result: { status: number; data: any };
  try {
    result = await postJson('/api/media/upload', { kind, dataUrl });
  } catch {
    throw new Error('Không kết nối được máy chủ để tải ảnh lên. Ảnh mới chỉ hiển thị trên máy này.');
  }
  const { status, data } = result;
  if (status === 401) throw new Error('Phiên đăng nhập đã hết hạn — đăng nhập lại để lưu ảnh lên máy chủ.');
  if (status !== 200 || !data?.success || typeof data.url !== 'string') {
    throw new Error(data?.message || 'Máy chủ không xử lý được ảnh này. Vui lòng thử ảnh khác.');
  }
  return { url: data.url, variants: data.variants, engine: data.engine };
};
