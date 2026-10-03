/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';

/** Thanh shimmer skeleton dạng bình luận / tin nhắn (xếp tầng lệch nhịp). */
export const CommentSkeletonList: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div role="status" aria-busy="true" aria-label="Đang tải bình luận" className="space-y-1">
    <span className="sr-only">Đang tải…</span>
    {Array.from({ length: rows }, (_, i) => (
      <div
        key={i}
        aria-hidden="true"
        className="flex gap-3 px-3 py-2.5 border-b border-white/5 last:border-b-0"
        style={{ opacity: 1 - i * 0.12 }}
      >
        <div
          className="ff-skeleton w-9 h-9 rounded-full shrink-0 mt-0.5"
          style={{
            borderRadius: '50%',
            background: `color-mix(in oklab, ${['#f59e0b', '#22d3ee', '#f472b6', '#a78bfa'][i % 4]} 18%, rgba(255,255,255,0.07))`,
          }}
        />
        <div className="flex-1 flex flex-col gap-2">
          <div className="ff-skeleton h-2.5 rounded-full" style={{ width: `${34 - (i % 3) * 5}%` }} />
          <div className="ff-skeleton h-2.5 rounded-full" style={{ width: '100%' }} />
          <div className="ff-skeleton h-2.5 rounded-full" style={{ width: `${88 - i * 13}%` }} />
        </div>
      </div>
    ))}
  </div>
);

/** Skeleton thẻ hồ sơ kiểu story-ring (dùng khi nội dung profile đang nạp). */
export const ProfileCardSkeleton: React.FC = () => (
  <div role="status" aria-busy="true" aria-label="Đang tải hồ sơ" className="w-full">
    <span className="sr-only">Đang tải hồ sơ…</span>
    <div aria-hidden="true">
      <div className="flex items-center gap-4">
        <div className="ff-gradient-ring shrink-0">
          <div className="ff-skeleton w-16 h-16" style={{ borderRadius: '50%' }} />
        </div>
        <div className="flex-1 space-y-2.5">
          <div className="ff-skeleton h-3.5 rounded-full" style={{ width: '60%' }} />
          <div className="ff-skeleton h-2.5 rounded-full" style={{ width: '90%' }} />
          <div className="ff-skeleton h-2.5 rounded-full" style={{ width: '40%' }} />
        </div>
      </div>
      <div className="flex gap-3 mt-5">
        <div className="ff-skeleton flex-1 h-9 rounded-xl" />
        <div className="ff-skeleton flex-1 h-9 rounded-xl" />
        <div className="ff-skeleton flex-1 h-9 rounded-xl" />
      </div>
    </div>
  </div>
);
