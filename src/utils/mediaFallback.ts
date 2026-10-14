/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';

export const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="48" fill="#0f172a" stroke="#f59e0b" stroke-width="2"/>
      <circle cx="50" cy="38" r="18" fill="#38bdf8"/>
      <path d="M22 84 C22 66 34 58 50 58 C66 58 78 66 78 84 Z" fill="#38bdf8"/>
    </svg>`
  );

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

export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement>,
  fallbackSrc: string = DEFAULT_AVATAR
) {
  const target = e.currentTarget;
  if (target.src !== fallbackSrc) {
    target.onerror = null;
    target.src = fallbackSrc;
  }
}

/*
  React cho sự kiện `error` của <source> nổi bọt lên onError của <video> cha.
  Trước đây một <source> WebM lỗi (403/codec không hỗ trợ) là đủ để ẩn cả video dù trình duyệt vẫn
  đang chuyển sang <source> MP4 kế tiếp → nền đen. Chỉ coi là lỗi điểm cuối khi nguồn cuối cùng
  đã thử xong và không còn nguồn thay thế nào.
*/
export function isTerminalVideoError(video: HTMLVideoElement, origin: EventTarget | null): boolean {
  if (origin === video || !origin) return true;
  const sources = video.querySelectorAll('source');
  return sources.length === 0 || origin === sources[sources.length - 1];
}

export function handleVideoError(
  e: React.SyntheticEvent<HTMLVideoElement>,
  fallbackSrc?: string
) {
  const target = e.currentTarget;
  /* Nếu có nguồn MP4 dự phòng và video chưa chuyển sang MP4 đó, chuyển ngay để không bị màn hình đen */
  if (fallbackSrc && target.src !== fallbackSrc && !target.currentSrc.endsWith('.mp4')) {
    target.src = fallbackSrc;
    target.load();
    target.play().catch(() => {});
    return;
  }
  if (!isTerminalVideoError(target, e.target)) return;
  target.onerror = null;
  target.style.display = 'none';
}
