/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * InfoTip — nút "i" nhỏ, thông tin chi tiết chỉ hiện KHI CẦN (Epic 5 · Zero-Clutter,
 * Nhiemvu_4 Task 2 "Contextual Tooltips" · Nhiemvu_5 Phase C "Progressive Disclosure").
 * Hover/focus (chuột, bàn phím) hoặc chạm (cảm ứng) để mở; Esc để đóng.
 * Bong bóng luôn nằm trong DOM và được liên kết bằng aria-describedby → trình đọc màn hình
 * vẫn đọc được đầy đủ dù giao diện gọn.
 */
import { useId, useState, type FC, type ReactNode } from 'react';
import './InfoTip.css';

interface InfoTipProps {
  /** Nhãn cho trình đọc màn hình, ví dụ "Nội quy phòng chat". */
  label: string;
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export const InfoTip: FC<InfoTipProps> = ({ label, children, align = 'center', className = '' }) => {
  const tipId = useId();
  const [open, setOpen] = useState(false);
  return (
    <span
      className={`ff-infotip ff-infotip--${align} ${open ? 'is-open' : ''} ${className}`}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="ff-infotip__btn"
        aria-label={label}
        aria-describedby={tipId}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.stopPropagation();
            setOpen(false);
          }
        }}
      >
        i
      </button>
      <span className="ff-infotip__bubble" role="tooltip" id={tipId}>{children}</span>
    </span>
  );
};
