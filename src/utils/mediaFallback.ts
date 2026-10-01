import React from 'react';

// Elegant SVG fallback avatar encoded as vector data URI (works completely offline)
export const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="48" fill="#0f172a" stroke="#f59e0b" stroke-width="2"/>
      <circle cx="50" cy="38" r="18" fill="#38bdf8"/>
      <path d="M22 84 C22 66 34 58 50 58 C66 58 78 66 78 84 Z" fill="#38bdf8"/>
    </svg>`
  );

// Elegant SVG fallback cover image for clubs encoded as vector data URI
export const DEFAULT_CLUB_COVER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" fill="none">
      <defs>
        <linearGradient id="coverBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="50%" stop-color="#1e1b4b"/>
          <stop offset="100%" stop-color="#090d16"/>
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill="url(#coverBg)"/>
      <circle cx="400" cy="225" r="90" fill="#1e293b" stroke="#f59e0b" stroke-width="3"/>
      <text x="400" y="235" font-family="'Inter', sans-serif" font-size="32" font-weight="bold" fill="#f59e0b" text-anchor="middle">F-FORUM</text>
    </svg>`
  );

// Safe image error handler preventing infinite loops
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement>,
  fallbackSrc: string = DEFAULT_AVATAR
) {
  const target = e.currentTarget;
  if (target.src !== fallbackSrc) {
    target.onerror = null; // Prevent infinite error loops
    target.src = fallbackSrc;
  }
}

// Safe video error handler
export function handleVideoError(e: React.SyntheticEvent<HTMLVideoElement>) {
  const target = e.currentTarget;
  target.onerror = null;
  target.style.display = 'none';
}
