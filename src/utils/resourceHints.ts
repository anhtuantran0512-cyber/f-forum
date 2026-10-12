/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * PHẦN 3.4 — Resource Hints thông minh (preconnect / dns-prefetch / preload / prefetch)
 *
 * Tự động điều chỉnh mức độ preload/prefetch theo Device Tier:
 *  - Tier A: preload aggressive các tài nguyên quan trọng + prefetch trang kế tiếp
 *  - Tier B: preconnect CDN + prefetch có chọn lọc khi trình duyệt rảnh
 *  - Tier C: chỉ giữ preconnect/dns-prefetch, tránh prefetch tốn băng thông của user
 */
import type { AdaptiveQualityTier } from './adaptiveQuality.ts';

const injectedHints = new Set<string>();

export const injectResourceHint = (
  rel: 'preconnect' | 'dns-prefetch' | 'prefetch' | 'preload',
  href: string,
  extra?: { as?: string; type?: string; crossOrigin?: string },
): boolean => {
  if (typeof document === 'undefined' || !document.head || !href) return false;
  const key = `${rel}:${href}`;
  if (injectedHints.has(key)) return false;
  if (document.head.querySelector(`link[rel="${rel}"][href="${href}"]`)) {
    injectedHints.add(key);
    return false;
  }
  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  if (extra?.as) link.setAttribute('as', extra.as);
  if (extra?.type) link.type = extra.type;
  if (extra?.crossOrigin !== undefined) link.crossOrigin = extra.crossOrigin;
  document.head.appendChild(link);
  injectedHints.add(key);
  return true;
};

/** Kích hoạt prefetch thông minh khi chuyển phân khu theo Device Tier. */
export const scheduleSmartPrefetch = (
  tier: AdaptiveQualityTier,
  urls: string[],
): void => {
  if (tier === 'tier-c' || typeof window === 'undefined') return;
  const maxItems = tier === 'tier-a' ? urls.length : Math.min(2, urls.length);
  const run = () => {
    for (const url of urls.slice(0, maxItems)) {
      injectResourceHint('prefetch', url);
    }
  };
  if ('requestIdleCallback' in window && typeof (window as any).requestIdleCallback === 'function') {
    (window as any).requestIdleCallback(run, { timeout: 2000 });
  } else {
    window.setTimeout(run, 650);
  }
};
