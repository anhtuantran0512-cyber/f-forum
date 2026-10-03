/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState } from 'react';

interface LikeHeartButtonProps {
  initialCount?: number;
  initialLiked?: boolean;
  onLikeChange?: (isLiked: boolean, nextCount: number) => void;
  className?: string;
}

export const LikeHeartButton: React.FC<LikeHeartButtonProps> = ({
  initialCount = 2417,
  initialLiked = false,
  onLikeChange,
  className = '',
}) => {
  const [isLiked, setIsLiked] = useState<boolean>(initialLiked);
  const currentCount = isLiked ? initialCount + (initialLiked ? 0 : 1) : initialCount - (initialLiked ? 1 : 0);
  const nextRolloverCount = currentCount + 1;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsLiked(checked);
    const newCount = checked ? initialCount + (initialLiked ? 0 : 1) : initialCount - (initialLiked ? 1 : 0);
    if (onLikeChange) {
      onLikeChange(checked, newCount);
    }
  };

  return (
    <div className={`inline-flex items-center ${className}`}>
      <label className="group relative cursor-pointer inline-flex items-center gap-2 min-h-10 pl-3 pr-3.5 rounded-full bg-white/5 border border-white/15 text-xs font-bold tabular-nums text-neutral-300 shadow-lg transition-all duration-300 hover:border-rose-500/50 hover:text-white hover:scale-[1.03] active:scale-[0.97] has-checked:text-rose-400 has-checked:border-rose-500/60 has-checked:bg-rose-500/10 select-none">
        <input
          type="checkbox"
          checked={isLiked}
          onChange={handleChange}
          aria-label="Thả tim hồ sơ này"
          className="sr-only"
        />

        {/* Heart SVG & Radial Sparks */}
        <span aria-hidden="true" className="relative grid place-items-center size-6 text-neutral-400 group-hover:text-rose-400 group-has-checked:text-rose-400">
          <svg
            viewBox="0 0 24 24"
            fill={isLiked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`size-5 transition-all duration-300 ${isLiked ? 'fill-rose-500 text-rose-500 animate-tb11-pop' : ''}`}
          >
            <path d="M12 20.2s-7.4-4.3-7.4-9.4A4.3 4.3 0 0 1 12 8.1a4.3 4.3 0 0 1 7.4 2.7c0 5.1-7.4 9.4-7.4 9.4z" />
          </svg>

          {/* 8 Radial Sparks */}
          {isLiked && (
            <span className="absolute inset-0 pointer-events-none">
              <span className="absolute top-1/2 left-1/2 size-1 -mt-0.5 -ml-0.5 rounded-full bg-rose-500 opacity-0 rotate-0 animate-tb11-spark" />
              <span className="absolute top-1/2 left-1/2 size-1 -mt-0.5 -ml-0.5 rounded-full bg-orange-400 opacity-0 rotate-45 animate-tb11-spark" />
              <span className="absolute top-1/2 left-1/2 size-1 -mt-0.5 -ml-0.5 rounded-full bg-rose-500 opacity-0 rotate-90 animate-tb11-spark" />
              <span className="absolute top-1/2 left-1/2 size-1 -mt-0.5 -ml-0.5 rounded-full bg-orange-400 opacity-0 rotate-[135deg] animate-tb11-spark" />
              <span className="absolute top-1/2 left-1/2 size-1 -mt-0.5 -ml-0.5 rounded-full bg-rose-500 opacity-0 rotate-180 animate-tb11-spark" />
              <span className="absolute top-1/2 left-1/2 size-1 -mt-0.5 -ml-0.5 rounded-full bg-purple-400 opacity-0 rotate-[225deg] animate-tb11-spark" />
              <span className="absolute top-1/2 left-1/2 size-1 -mt-0.5 -ml-0.5 rounded-full bg-rose-500 opacity-0 rotate-[270deg] animate-tb11-spark" />
              <span className="absolute top-1/2 left-1/2 size-1 -mt-0.5 -ml-0.5 rounded-full bg-purple-400 opacity-0 rotate-[315deg] animate-tb11-spark" />
            </span>
          )}
        </span>

        {/* Rollover Counter */}
        <span aria-hidden="true" className="block h-5 overflow-hidden font-mono font-bold">
          <span
            className={`grid transition-transform duration-500 ease-out ${
              isLiked ? '-translate-y-5 text-rose-300' : 'translate-y-0 text-neutral-300'
            }`}
          >
            <span className="block h-5 leading-5">{currentCount.toLocaleString()}</span>
            <span className="block h-5 leading-5">{nextRolloverCount.toLocaleString()}</span>
          </span>
        </span>
      </label>
    </div>
  );
};
