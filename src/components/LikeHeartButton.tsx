/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';

/* ==========================================================================
   NÚT THẢ TIM — điều khiển hoàn toàn bằng props (controlled)
   --------------------------------------------------------------------------
   Ba thay đổi so với bản cũ, để "một lần bấm = đúng một tim":
     1. Dùng <button> thay cho label bọc ô tick ẩn: mỗi cú bấm chỉ phát ra ĐÚNG
        MỘT sự kiện (label + ô tick có thể bắn lặp ở vài trình duyệt).
     2. Không giữ state đếm nội bộ và không có phép tính cộng trừ nào ở đây —
        con số duy nhất do cha truyền xuống qua prop `count`, cha là nguồn sự
        thật duy nhất về lượt thích.
     3. Hiển thị MỘT con số (bỏ kiểu hai hàng số chồng nhau của hiệu ứng
        rollover trước đây, vốn có thể lộ ra hai số cùng lúc khi box không cắt
        đúng) — thay bằng nhịp "pop" khi vừa thả tim.
   ========================================================================== */

interface LikeHeartButtonProps {
  /** Số lượt thích hiện tại (đã bao gồm lượt của bạn nếu `liked` = true) */
  count: number;
  /** Bạn đã thả tim cho hồ sơ này chưa */
  liked: boolean;
  /** Báo lại trạng thái MONG MUỐN (true = thả, false = bỏ) */
  onToggle: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const LikeHeartButton: React.FC<LikeHeartButtonProps> = ({
  count = 0,
  liked = false,
  onToggle,
  disabled = false,
  className = '',
}) => {
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;

  /* Truyền "trạng thái mong muốn" chứ không phải "đảo trạng thái": dù sự kiện
     bị bắn lặp, bên nhận vẫn chỉ thay đổi đúng một lần (xem utils/profileLikes). */
  const handleClick = () => {
    if (disabled) return;
    onToggle(!liked);
  };

  return (
    <div className={`inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-pressed={liked}
        aria-label={liked ? 'Bỏ thả tim hồ sơ này' : 'Thả tim hồ sơ này'}
        title={liked ? 'Bạn đã thả tim — bấm để bỏ' : 'Thả tim cho hồ sơ này'}
        className={`group relative inline-flex items-center gap-2 min-h-10 pl-3 pr-3.5 rounded-full border text-xs font-bold tabular-nums shadow-lg transition-all duration-300 cursor-pointer select-none disabled:cursor-not-allowed disabled:opacity-60 ${
          liked
            ? 'bg-rose-500/12 border-rose-500/60 text-rose-300 hover:bg-rose-500/20'
            : 'bg-white/5 border-white/15 text-neutral-300 hover:border-rose-500/50 hover:text-white'
        } hover:scale-[1.03] active:scale-[0.97]`}
      >
        {/* Trái tim + tia sáng toả ra */}
        <span
          aria-hidden="true"
          className={`relative grid place-items-center size-6 transition-colors ${
            liked ? 'text-rose-400' : 'text-neutral-400 group-hover:text-rose-400'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill={liked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`size-5 transition-all duration-300 ${
              liked ? 'fill-rose-500 text-rose-500 animate-tb11-pop' : ''
            }`}
          >
            <path d="M12 20.2s-7.4-4.3-7.4-9.4A4.3 4.3 0 0 1 12 8.1a4.3 4.3 0 0 1 7.4 2.7c0 5.1-7.4 9.4-7.4 9.4z" />
          </svg>

          {liked && (
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

        {/* Một con số duy nhất — không còn hai hàng số chồng nhau */}
        <span
          aria-live="off"
          className={`block font-mono font-bold leading-5 transition-colors ${
            liked ? 'text-rose-300' : 'text-neutral-300'
          }`}
        >
          {safeCount.toLocaleString()}
        </span>
      </button>
    </div>
  );
};

export default LikeHeartButton;
