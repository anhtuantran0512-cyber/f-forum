/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * PHẦN 3.3 — Progressive Image Loading (LQIP - Low Quality Image Placeholder)
 *
 *  - Hiển thị ảnh mờ 20px (< 1KB, tức thì) trước khi ảnh full chất lượng tải xong.
 *  - Khi ảnh full giải mã hoàn tất, chuyển mượt blur-to-sharp bằng GPU compositor
 *    (transform + opacity thuần, không gây layout reflow).
 *  - Hỗ trợ Priority Hints (fetchPriority="high" cho avatar/banner của chính user,
 *    "low" cho ảnh trong feed).
 */
import React, { useMemo, useState } from 'react';

export interface ProgressiveImageProps {
  src: string;
  alt: string;
  /** Ảnh mờ 20px (< 1KB) tuỳ chọn; nếu không truyền sẽ sinh SVG LQIP siêu nhẹ (< 320B). */
  lqipSrc?: string;
  eager?: boolean;
  priority?: 'high' | 'low' | 'auto';
  className?: string;
  style?: React.CSSProperties;
}

const buildInstantSvgLqip = (seedUrl: string): string => {
  let hash = 0;
  for (let i = 0; i < seedUrl.length; i += 1) {
    hash = (hash * 31 + seedUrl.charCodeAt(i)) | 0;
  }
  const hueA = Math.abs(hash) % 360;
  const hueB = (hueA + 42) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="hsl(${hueA},45%,22%)"/><stop offset="100%" stop-color="hsl(${hueB},50%,14%)"/></linearGradient></defs><rect width="20" height="20" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  lqipSrc,
  eager = false,
  priority = 'auto',
  className,
  style,
}) => {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const isLoaded = loadedSrc === src;
  const placeholder = useMemo(() => lqipSrc || buildInstantSvgLqip(src), [lqipSrc, src]);

  return (
    <span
      className={`ff-lqip-wrap${isLoaded ? ' is-loaded' : ''}${className ? ` ${className}` : ''}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        overflow: 'hidden',
        ...style,
      }}
    >
      <img
        src={placeholder}
        alt=""
        aria-hidden="true"
        loading="eager"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'blur(6px)',
          transform: isLoaded ? 'scale(1)' : 'scale(1.04)',
          opacity: isLoaded ? 0 : 1,
          transition: 'opacity 160ms ease-out, transform 160ms ease-out',
          pointerEvents: 'none',
        }}
      />
      <img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={priority}
        decoding="async"
        onLoad={() => setLoadedSrc(src)}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: isLoaded ? 1 : 0,
          transform: isLoaded ? 'scale(1)' : 'scale(1.01)',
          transition: 'opacity 160ms ease-out, transform 160ms ease-out',
        }}
      />
    </span>
  );
};
