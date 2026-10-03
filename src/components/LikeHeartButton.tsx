/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

interface LikeHeartButtonProps {
  targetUserId: string;
  viewerUserId?: string;
  initialCount?: number;
  onLikeChange?: (isLiked: boolean, nextCount: number) => void;
  className?: string;
}

export const LikeHeartButton: React.FC<LikeHeartButtonProps> = ({
  targetUserId,
  viewerUserId,
  initialCount = 0,
  onLikeChange,
  className = '',
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [count, setCount] = useState(Math.max(0, initialCount));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setCount(Math.max(0, initialCount));
    setIsLiked(false);
    if (!viewerUserId || !targetUserId) return;
    const params = new URLSearchParams({ targetId: targetUserId, viewerId: viewerUserId });
    let active = true;
    fetch(`/api/profile-likes?${params.toString()}`)
      .then(async (response) => {
        const result = await response.json();
        if (active && response.ok && result.success) {
          setCount(Math.max(0, Number(result.count) || 0));
          setIsLiked(Boolean(result.liked));
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [targetUserId, viewerUserId, initialCount]);

  const handleToggle = async () => {
    if (!viewerUserId) {
      setError('Đăng nhập để gửi cảm ơn.');
      return;
    }
    if (isLoading) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/profile-likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: targetUserId, viewerId: viewerUserId }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể cập nhật cảm ơn.');
      const nextLiked = Boolean(result.liked);
      const nextCount = Math.max(0, Number(result.count) || 0);
      setIsLiked(nextLiked);
      setCount(nextCount);
      onLikeChange?.(nextLiked, nextCount);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể cập nhật cảm ơn.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isLoading}
        aria-label={isLiked ? 'Bỏ cảm ơn hồ sơ' : 'Gửi cảm ơn hồ sơ'}
        aria-pressed={isLiked}
        className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium tabular-nums transition disabled:opacity-60 ${isLiked ? 'border-rose-300/25 bg-rose-300/10 text-rose-100' : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-rose-300/20 hover:text-rose-100'}`}
      >
        <Heart size={16} className={isLiked ? 'fill-rose-300 text-rose-300' : ''} />
        <span>{count.toLocaleString()}</span>
        <span className="sr-only">cảm ơn</span>
      </button>
      {error && <span className="text-[10px] text-rose-200" role="status">{error}</span>}
    </div>
  );
};
