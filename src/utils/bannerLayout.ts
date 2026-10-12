/* Bản quyền trí tuệ thuộc về BroAmStuck */
import type React from 'react';
import { safeStorage } from './storage';

export type BannerFitMode = 'cover' | 'contain';

export interface BannerLayoutConfig {
  /** Tâm ngang (0% = sát trái, 50% = giữa, 100% = sát phải) */
  x: number;
  /** Tâm dọc (0% = sát đỉnh, 50% = giữa, 100% = sát đáy) */
  y: number;
  /** Độ phóng đại (1 = 100%, tối đa 2.5 = 250%) */
  zoom: number;
  /** Chế độ đặt ảnh: cover (phủ kín rộng xuống dưới) | contain (vừa khung) */
  fit: BannerFitMode;
  /** Độ phủ tối lớp dưới (10%..85%) để chữ nổi bật trên nền ảnh kéo dài xuống đáy */
  dim: number;
}

export const DEFAULT_BANNER_LAYOUT: BannerLayoutConfig = {
  x: 50,
  y: 50,
  zoom: 1,
  fit: 'cover',
  dim: 42,
};

const STORAGE_KEY = 'fforum_banner_layout_v1';

const clamp = (val: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Number.isFinite(val) ? val : min));

export const normalizeBannerLayout = (
  partial?: Partial<BannerLayoutConfig> | null,
): BannerLayoutConfig => ({
  x: Math.round(clamp(partial?.x ?? DEFAULT_BANNER_LAYOUT.x, 0, 100)),
  y: Math.round(clamp(partial?.y ?? DEFAULT_BANNER_LAYOUT.y, 0, 100)),
  zoom: Math.round(clamp(partial?.zoom ?? DEFAULT_BANNER_LAYOUT.zoom, 1, 2.5) * 100) / 100,
  fit: partial?.fit === 'contain' ? 'contain' : 'cover',
  dim: Math.round(clamp(partial?.dim ?? DEFAULT_BANNER_LAYOUT.dim, 10, 85)),
});

const readStoredLayout = (ownerKey?: string): Partial<BannerLayoutConfig> | null => {
  if (!ownerKey) return null;
  try {
    const raw = safeStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, Partial<BannerLayoutConfig>>;
    return map[ownerKey.toLowerCase()] || null;
  } catch {
    return null;
  }
};

export const saveStoredBannerLayout = (
  ownerKey: string | undefined,
  layout: BannerLayoutConfig,
): void => {
  if (!ownerKey) return;
  try {
    const raw = safeStorage.getItem(STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, BannerLayoutConfig>) : {};
    map[ownerKey.toLowerCase()] = normalizeBannerLayout(layout);
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
};

export interface ParsedBannerUrl {
  cleanSrc: string;
  layout: BannerLayoutConfig;
}

/**
 * Tách URL ảnh nền và cấu hình vị trí/thu phóng (tương tự ảnh bìa Facebook).
 * Hỗ trợ đọc từ query `?x=50&y=40&z=1.2&fit=cover&dim=42` hoặc bộ nhớ cục bộ.
 */
export const parseBannerUrl = (
  rawUrl?: string | null,
  ownerKey?: string,
): ParsedBannerUrl => {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return {
      cleanSrc: '',
      layout: normalizeBannerLayout(readStoredLayout(ownerKey)),
    };
  }

  if (trimmed.startsWith('data:')) {
    return {
      cleanSrc: trimmed,
      layout: normalizeBannerLayout(readStoredLayout(ownerKey)),
    };
  }

  const qIdx = trimmed.indexOf('?');
  if (qIdx === -1) {
    return {
      cleanSrc: trimmed,
      layout: normalizeBannerLayout(readStoredLayout(ownerKey)),
    };
  }

  const base = trimmed.slice(0, qIdx);
  const queryStr = trimmed.slice(qIdx + 1);
  const params = new URLSearchParams(queryStr);
  const hasLayoutParams =
    params.has('x') || params.has('y') || params.has('z') || params.has('fit') || params.has('dim');

  if (!hasLayoutParams) {
    return {
      cleanSrc: trimmed,
      layout: normalizeBannerLayout(readStoredLayout(ownerKey)),
    };
  }

  const parsed: Partial<BannerLayoutConfig> = {
    x: params.has('x') ? Number(params.get('x')) : undefined,
    y: params.has('y') ? Number(params.get('y')) : undefined,
    zoom: params.has('z') ? Number(params.get('z')) : undefined,
    fit: params.get('fit') === 'contain' ? 'contain' : 'cover',
    dim: params.has('dim') ? Number(params.get('dim')) : undefined,
  };

  params.delete('x');
  params.delete('y');
  params.delete('z');
  params.delete('fit');
  params.delete('dim');
  const remaining = params.toString();

  return {
    cleanSrc: remaining ? `${base}?${remaining}` : base,
    layout: normalizeBannerLayout(parsed),
  };
};

/**
 * Gắn cấu hình vị trí/thu phóng vào URL ảnh bìa để đồng bộ lên máy chủ
 * (vẫn hợp lệ 100% với `SAFE_RELATIVE_MEDIA` trong `server/authGuard.ts`).
 */
export const serializeBannerUrl = (
  rawUrl: string,
  layout: BannerLayoutConfig,
  ownerKey?: string,
): string => {
  const norm = normalizeBannerLayout(layout);
  saveStoredBannerLayout(ownerKey, norm);
  const { cleanSrc } = parseBannerUrl(rawUrl, ownerKey);
  if (!cleanSrc || cleanSrc.startsWith('data:')) {
    return cleanSrc;
  }
  const sep = cleanSrc.includes('?') ? '&' : '?';
  return `${cleanSrc}${sep}x=${norm.x}&y=${norm.y}&z=${norm.zoom}&fit=${norm.fit}&dim=${norm.dim}`;
};

export const bannerImageStyle = (layout: BannerLayoutConfig): React.CSSProperties => ({
  objectFit: layout.fit,
  objectPosition: `${layout.x}% ${layout.y}%`,
  transform: layout.zoom !== 1 ? `scale(${layout.zoom})` : undefined,
  transformOrigin: `${layout.x}% ${layout.y}%`,
});

/**
 * Cắt (crop) ảnh nền thật trên HTML5 Canvas theo đúng vùng người dùng đã kéo & phóng to.
 */
export const cropBannerToDataUrl = (
  imageSrc: string,
  layout: BannerLayoutConfig,
  targetWidth = 1440,
  targetHeight = 960,
): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Trình duyệt không hỗ trợ xử lý ảnh Canvas.'));
          return;
        }

        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        const srcW = Math.max(1, img.naturalWidth || img.width);
        const srcH = Math.max(1, img.naturalHeight || img.height);
        const zoom = clamp(layout.zoom, 1, 2.5);
        const posX = clamp(layout.x, 0, 100) / 100;
        const posY = clamp(layout.y, 0, 100) / 100;

        if (layout.fit === 'contain') {
          const baseScale = Math.min(targetWidth / srcW, targetHeight / srcH) * zoom;
          const drawW = srcW * baseScale;
          const drawH = srcH * baseScale;
          const dx = (targetWidth - drawW) * posX;
          const dy = (targetHeight - drawH) * posY;
          ctx.drawImage(img, dx, dy, drawW, drawH);
        } else {
          const baseScale = Math.max(targetWidth / srcW, targetHeight / srcH) * zoom;
          const drawW = srcW * baseScale;
          const drawH = srcH * baseScale;
          const dx = (targetWidth - drawW) * posX;
          const dy = (targetHeight - drawH) * posY;
          ctx.drawImage(img, dx, dy, drawW, drawH);
        }

        const out = canvas.toDataURL('image/webp', 0.9);
        resolve(out.startsWith('data:image/webp') ? out : canvas.toDataURL('image/jpeg', 0.9));
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Không thể cắt ảnh nền.'));
      }
    };
    img.onerror = () => reject(new Error('Không tải được ảnh nền để cắt.'));
    img.src = imageSrc;
  });
