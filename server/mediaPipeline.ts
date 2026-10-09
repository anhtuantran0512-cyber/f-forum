/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * EPIC 5 — Pipeline ảnh đại diện / ảnh bìa.
 *
 * Lỗi trước đây:
 *  - Client nén một bước trên canvas (imageSmoothingQuality mặc định "low") → ảnh
 *    lớn thu nhỏ bị răng cưa/mờ.
 *  - Data URL ảnh (30–80 KB) được nhét thẳng vào bản ghi người dùng, rồi server CẮT
 *    còn 2000 ký tự → ảnh hỏng ở mọi máy khác và mất sau khi tải lại trang.
 *
 * Nay:
 *  - Client vẫn thu nhỏ chất lượng cao trước khi gửi (bớt băng thông, xem
 *    src/utils/imagePipeline.ts), server xử lý lại bằng `sharp` (libvips):
 *    kiểm tra magic bytes, giới hạn số điểm ảnh (chống "bom giải nén"), tự xoay
 *    theo EXIF rồi XOÁ metadata (ảnh điện thoại thường kèm toạ độ GPS).
 *  - Sinh 3 cỡ WebP: thumb / medium / original. Avatar cắt vuông theo vùng nổi bật
 *    (`attention`), medium luôn ≥ 256 px (mặc định 512), làm nét nhẹ sau khi thu nhỏ
 *    thay vì nén cứng gây mờ.
 *  - Tên tệp chứa hash nội dung → phục vụ với `Cache-Control: immutable`; đặt
 *    FFORUM_MEDIA_CDN_BASE để trả URL qua CDN (CDN kéo từ /media/ của máy chủ).
 *  - Không có sharp (nền tảng thiếu binary) → vẫn nhận ảnh JPEG/PNG/WebP đã được
 *    client xử lý, lưu một bản duy nhất. Không bao giờ làm hỏng tính năng upload.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

export type MediaKind = 'avatar' | 'banner';
export type MediaVariantName = 'thumb' | 'medium' | 'original';

export class MediaUploadError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'MediaUploadError';
    this.status = status;
  }
}

/** Giới hạn dung lượng SAU khi giải mã base64. */
export const MEDIA_MAX_BYTES: Record<MediaKind, number> = {
  avatar: 8 * 1024 * 1024,
  banner: 15 * 1024 * 1024,
};

/** Ảnh nhỏ hơn mức này không đáng giữ (thường là icon/ảnh lỗi). */
export const MEDIA_MIN_SIDE = 32;
/** Avatar medium không bao giờ nhỏ hơn 256 px (yêu cầu Epic 5). */
export const AVATAR_MEDIUM_MIN = 256;
export const AVATAR_MEDIUM_MAX = 512;

/** Chặn ảnh khổng lồ trước khi giải nén vào RAM (60 MP ≈ ảnh 9000×6600). */
const LIMIT_INPUT_PIXELS = 60_000_000;

type ImageFormat = 'png' | 'jpeg' | 'webp' | 'gif' | 'avif';

/** Nhận diện định dạng bằng magic bytes — không tin MIME client khai. */
export const sniffImageFormat = (buf: Buffer): ImageFormat | null => {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buf.length >= 6 && /^GIF8[79]a$/.test(buf.toString('ascii', 0, 6))) return 'gif';
  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp' && /^(?:avif|avis)$/.test(buf.toString('ascii', 8, 12))) return 'avif';
  return null;
};

const DATA_URL = /^data:image\/(?:png|jpe?g|webp|gif|avif);base64,([a-z0-9+/=]+)$/i;

export const decodeImageDataUrl = (value: unknown, maxBytes: number): { buffer: Buffer; format: ImageFormat } => {
  if (typeof value !== 'string' || !value) throw new MediaUploadError('Thiếu dữ liệu ảnh.');
  /* Kiểm độ dài chuỗi trước khi giải mã để không cấp phát vô ích. */
  if (value.length > Math.ceil((maxBytes * 4) / 3) + 64) {
    throw new MediaUploadError(`Ảnh vượt quá ${Math.round(maxBytes / (1024 * 1024))}MB cho phép.`, 413);
  }
  const match = DATA_URL.exec(value.trim());
  if (!match) throw new MediaUploadError('Định dạng ảnh không được hỗ trợ (PNG, JPG, WebP, GIF, AVIF).');
  const buffer = Buffer.from(match[1], 'base64');
  if (buffer.length === 0) throw new MediaUploadError('Tệp ảnh rỗng.');
  if (buffer.length > maxBytes) {
    throw new MediaUploadError(`Ảnh vượt quá ${Math.round(maxBytes / (1024 * 1024))}MB cho phép.`, 413);
  }
  const format = sniffImageFormat(buffer);
  if (!format) throw new MediaUploadError('Tệp không phải ảnh hợp lệ.');
  return { buffer, format };
};

/* -------------------------------------------------------------------------- */
/* Lưu trữ                                                                     */
/* -------------------------------------------------------------------------- */

/** Tính lại mỗi lần gọi: bộ test đổi FFORUM_DATA_DIR giữa các ca. */
export const mediaRoot = (): string => {
  const dataDir = process.env.FFORUM_DATA_DIR
    ? path.resolve(process.env.FFORUM_DATA_DIR)
    : path.resolve(process.cwd(), 'data');
  return path.join(dataDir, 'media');
};

const KIND_DIR: Record<MediaKind, string> = { avatar: 'avatars', banner: 'banners' };

/** Không để email/ID lộ trên URL công khai: khoá chủ sở hữu là hash rút gọn. */
const ownerKeyOf = (email: string): string =>
  crypto.createHash('sha256').update(`fforum-media:${email.trim().toLowerCase()}`).digest('hex').slice(0, 12);

export const mediaPublicUrl = (kind: MediaKind, file: string, env: NodeJS.ProcessEnv = process.env): string => {
  const cdn = String(env.FFORUM_MEDIA_CDN_BASE || '').trim().replace(/\/+$/, '');
  const safeCdn = /^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/[a-z0-9._~\-/]*)?$/i.test(cdn) ? cdn : '';
  return `${safeCdn}/media/${KIND_DIR[kind]}/${file}`;
};

const MEDIA_FILE = /^\/media\/(avatars|banners)\/([a-f0-9]{12}-[a-f0-9]{16}-(?:thumb|medium|original)\.(?:webp|jpg|png))$/;
const CONTENT_TYPES: Record<string, string> = { webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png' };

/** Hash (16 hex) trong URL ảnh của chính hệ thống, nếu có. */
const mediaHashOf = (url: unknown): string | null => {
  if (typeof url !== 'string') return null;
  const match = /\/media\/(?:avatars|banners)\/[a-f0-9]{12}-([a-f0-9]{16})-/.exec(url);
  return match ? match[1] : null;
};

/** Xoá ảnh cũ không còn dùng của cùng chủ sở hữu (giữ ảnh vừa tải + ảnh đang đặt). */
const pruneOwnerFiles = (dir: string, owner: string, keepHashes: Set<string>): void => {
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return;
  }
  names.forEach((name) => {
    if (!name.startsWith(`${owner}-`)) return;
    const hash = name.slice(owner.length + 1, owner.length + 17);
    if (keepHashes.has(hash)) return;
    try {
      fs.unlinkSync(path.join(dir, name));
    } catch {
      /* tệp đang được đọc — lần sau dọn tiếp */
    }
  });
};

/* -------------------------------------------------------------------------- */
/* Xử lý ảnh                                                                   */
/* -------------------------------------------------------------------------- */

type SharpFactory = typeof import('sharp');
let sharpLoader: Promise<SharpFactory | null> | null = null;

/** Nạp sharp một lần; thiếu binary native thì trả null để dùng chế độ dự phòng. */
export const loadSharp = (): Promise<SharpFactory | null> => {
  if (!sharpLoader) {
    sharpLoader = import('sharp')
      .then((mod) => {
        const factory = ((mod as unknown as { default?: SharpFactory }).default ?? mod) as SharpFactory;
        factory.cache(false);
        return factory;
      })
      .catch(() => null);
  }
  return sharpLoader;
};

interface VariantPlan {
  name: MediaVariantName;
  width: number;
  height: number;
  fit: 'cover' | 'inside';
  enlarge: boolean;
  sharpen: boolean;
  quality: number;
}

const planVariants = (kind: MediaKind, width: number, height: number): VariantPlan[] => {
  if (kind === 'avatar') {
    const shortSide = Math.min(width, height);
    const medium = Math.max(AVATAR_MEDIUM_MIN, Math.min(AVATAR_MEDIUM_MAX, shortSide));
    return [
      { name: 'thumb', width: 128, height: 128, fit: 'cover', enlarge: true, sharpen: true, quality: 86 },
      { name: 'medium', width: medium, height: medium, fit: 'cover', enlarge: true, sharpen: true, quality: 88 },
      { name: 'original', width: 1024, height: 1024, fit: 'inside', enlarge: false, sharpen: false, quality: 90 },
    ];
  }
  return [
    { name: 'thumb', width: 480, height: 480, fit: 'inside', enlarge: false, sharpen: true, quality: 84 },
    { name: 'medium', width: 1600, height: 1600, fit: 'inside', enlarge: false, sharpen: true, quality: 86 },
    { name: 'original', width: 2400, height: 2400, fit: 'inside', enlarge: false, sharpen: false, quality: 88 },
  ];
};

export interface ProcessedMedia {
  kind: MediaKind;
  /** URL nên lưu vào hồ sơ: avatar = medium (≥256px), ảnh bìa = medium. */
  url: string;
  variants: Record<MediaVariantName, { url: string; width: number; height: number; bytes: number }>;
  engine: 'sharp' | 'passthrough';
}

export interface ProcessOptions {
  kind: MediaKind;
  ownerEmail: string;
  dataUrl: unknown;
  /** URL đang dùng của người dùng — giữ lại khi dọn ảnh cũ. */
  keepUrls?: unknown[];
}

export const processUploadedImage = async ({ kind, ownerEmail, dataUrl, keepUrls = [] }: ProcessOptions): Promise<ProcessedMedia> => {
  const { buffer, format } = decodeImageDataUrl(dataUrl, MEDIA_MAX_BYTES[kind]);
  const owner = ownerKeyOf(ownerEmail);
  const dir = path.join(mediaRoot(), KIND_DIR[kind]);
  fs.mkdirSync(dir, { recursive: true });

  const sharp = await loadSharp();
  const variants = {} as ProcessedMedia['variants'];
  let hash: string;
  let engine: ProcessedMedia['engine'];

  if (sharp) {
    const inputOptions = { failOn: 'error' as const, limitInputPixels: LIMIT_INPUT_PIXELS, animated: false };
    let meta: { width?: number; height?: number; orientation?: number };
    try {
      meta = await sharp(buffer, inputOptions).metadata();
    } catch {
      throw new MediaUploadError('Không đọc được ảnh — tệp có thể bị hỏng hoặc quá lớn.');
    }
    const swap = (meta.orientation ?? 1) >= 5;
    const width = (swap ? meta.height : meta.width) ?? 0;
    const height = (swap ? meta.width : meta.height) ?? 0;
    if (width < MEDIA_MIN_SIDE || height < MEDIA_MIN_SIDE) {
      throw new MediaUploadError(`Ảnh quá nhỏ (tối thiểu ${MEDIA_MIN_SIDE}×${MEDIA_MIN_SIDE} px).`);
    }

    const outputs: Array<{ plan: VariantPlan; data: Buffer; width: number; height: number }> = [];
    for (const plan of planVariants(kind, width, height)) {
      let pipeline = sharp(buffer, inputOptions)
        .rotate() /* áp hướng EXIF; metadata (kể cả GPS) bị bỏ khi xuất */
        .resize({
          width: plan.width,
          height: plan.height,
          fit: plan.fit,
          position: plan.fit === 'cover' ? sharp.strategy.attention : undefined,
          withoutEnlargement: !plan.enlarge,
          kernel: sharp.kernel.lanczos3,
        });
      /* Làm nét NHẸ sau khi thu nhỏ: bù phần chi tiết lanczos làm mềm, không gây viền. */
      if (plan.sharpen) pipeline = pipeline.sharpen({ sigma: 0.6, m1: 0.6, m2: 1.6 });
      const { data, info } = await pipeline
        .webp({ quality: plan.quality, effort: 4, smartSubsample: true })
        .toBuffer({ resolveWithObject: true });
      outputs.push({ plan, data, width: info.width, height: info.height });
    }

    hash = crypto.createHash('sha256').update(outputs.map((o) => o.data.toString('base64')).join('|')).digest('hex').slice(0, 16);
    outputs.forEach(({ plan, data, width: w, height: h }) => {
      const file = `${owner}-${hash}-${plan.name}.webp`;
      fs.writeFileSync(path.join(dir, file), data);
      variants[plan.name] = { url: mediaPublicUrl(kind, file), width: w, height: h, bytes: data.length };
    });
    engine = 'sharp';
  } else {
    /* Dự phòng: chỉ định dạng trình duyệt nào cũng hiển thị, đã được client thu nhỏ. */
    const ext = format === 'jpeg' ? 'jpg' : format === 'png' ? 'png' : format === 'webp' ? 'webp' : null;
    if (!ext) throw new MediaUploadError('Máy chủ chưa hỗ trợ định dạng này — hãy dùng JPG, PNG hoặc WebP.');
    if (buffer.length > 3 * 1024 * 1024) throw new MediaUploadError('Ảnh quá lớn (tối đa 3MB khi máy chủ không có bộ xử lý ảnh).', 413);
    hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
    const file = `${owner}-${hash}-original.${ext}`;
    fs.writeFileSync(path.join(dir, file), buffer);
    const entry = { url: mediaPublicUrl(kind, file), width: 0, height: 0, bytes: buffer.length };
    variants.thumb = entry;
    variants.medium = entry;
    variants.original = entry;
    engine = 'passthrough';
  }

  const keep = new Set<string>([hash]);
  keepUrls.forEach((url) => {
    const kept = mediaHashOf(url);
    if (kept) keep.add(kept);
  });
  pruneOwnerFiles(dir, owner, keep);

  return { kind, url: variants.medium.url, variants, engine };
};

/* -------------------------------------------------------------------------- */
/* Phục vụ tệp tĩnh                                                            */
/* -------------------------------------------------------------------------- */

/**
 * GET/HEAD /media/... — trả `true` nếu đã phản hồi (kể cả 404, để SPA fallback
 * không trả index.html dưới dạng "ảnh"). Tên tệp khớp regex chặt → không có
 * đường nào đi ra ngoài thư mục media (path traversal).
 */
export const handleMediaRequest = (req: IncomingMessage, res: ServerResponse): boolean => {
  const pathname = (req.url || '').split('?')[0];
  const match = MEDIA_FILE.exec(pathname);
  const notFound = () => {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end('Not found');
  };
  if (!match) {
    notFound();
    return true;
  }
  const filePath = path.join(mediaRoot(), match[1], match[2]);
  let size = 0;
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) throw new Error('not a file');
    size = stat.size;
  } catch {
    notFound();
    return true;
  }
  const ext = match[2].slice(match[2].lastIndexOf('.') + 1);
  res.statusCode = 200;
  res.setHeader('Content-Type', CONTENT_TYPES[ext] || 'application/octet-stream');
  res.setHeader('Content-Length', String(size));
  /* Tên tệp chứa hash nội dung → không bao giờ đổi → cache vĩnh viễn. */
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  if (req.method === 'HEAD') {
    res.end();
    return true;
  }
  fs.createReadStream(filePath)
    .on('error', () => {
      if (!res.headersSent) notFound();
      else res.destroy();
    })
    .pipe(res);
  return true;
};
