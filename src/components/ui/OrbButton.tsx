/* Bản quyền trí tuệ thuộc về BroAmStuck */
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import './OrbButton.css';

export type OrbTone = 'teal' | 'silver' | 'mauve' | 'amber' | 'rose';
/** spin = xoay nửa vòng (tạo) · fly = mũi tên bay (xuất/chép) · check = vẽ dấu ✓ (xác nhận) */
export type OrbMotion = 'spin' | 'fly' | 'check' | 'none';

export interface OrbButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Nhãn hiển thị khi rê/focus — đồng thời là tên truy cập của nút. */
  label: string;
  icon: ReactNode;
  tone?: OrbTone;
  motion?: OrbMotion;
  size?: 'sm' | 'md' | 'lg';
  /** Phía nhãn trượt ra: phải (mặc định như mẫu), trái (nút sát mép phải), trên (hàng nút ngang). */
  labelSide?: 'right' | 'left' | 'top';
  /** Thứ tự trong cụm để hiệu ứng floatIn xuất hiện so le. */
  index?: number;
}

/**
 * Nút icon dạng quả cầu kính phát sáng (Nhiemvu_6 · mẫu 1).
 * Nhãn là phần tử anh em với nút nên không bị overflow của quả cầu cắt mất,
 * và được ẩn khỏi trình đọc màn hình (aria-label của nút đã mang nội dung đó).
 */
export function OrbButton({
  label,
  icon,
  tone = 'teal',
  motion = 'none',
  size = 'md',
  labelSide = 'right',
  index = 0,
  className = '',
  type = 'button',
  ...rest
}: OrbButtonProps) {
  const wrapStyle = { '--orb-i': index } as CSSProperties;
  return (
    <span className={`ff-orb-wrap ff-orb-wrap--${labelSide} ff-orb-tone--${tone}`} style={wrapStyle}>
      <button
        {...rest}
        type={type === 'submit' ? 'submit' : type === 'reset' ? 'reset' : 'button'}
        aria-label={rest['aria-label'] ?? label}
        className={`ff-orb ff-orb--${size} ff-orb--${motion} ${className}`.trim()}
      >
        <span className="ff-orb__icon" aria-hidden="true">
          {icon}
        </span>
      </button>
      <span className="ff-orb__label" aria-hidden="true">
        {label}
      </span>
    </span>
  );
}

export default OrbButton;
