/* Bản quyền trí tuệ thuộc về BroAmStuck */
/*
 * Nhiệm vụ 10 — bảng tên (nameplate): lớp media nằm SAU tên hiển thị.
 * Độ tương phản do `text-shadow` phía CSS đảm nhận (bảng tên nền có thể rực màu).
 * Người dùng gọi overlay <span> tên lên trên (xem .npd trong decorations.css).
 */
import './decorations.css';
import { useInViewOnce } from './useDecorationMedia';
import { DecorationMedia } from './DecorationMedia';
import type { DecorationAssetRef } from './AvatarWithDecoration';

interface NameplateDisplayProps {
  asset: DecorationAssetRef;
  /** Chiều rộng vùng hiển thị (px) — chiều cao tự theo tỉ lệ 448:84 của asset. */
  size?: number;
  /** false = chỉ ảnh tĩnh (kích thước nhỏ 32–40px tiết kiệm CPU). */
  animate?: boolean;
  eager?: boolean;
  className?: string;
  /** true = KHÔNG tự đặt width/height — parent quyết định kích thước (dùng làm
   *  background layer absolute trong .npd-np). Asset là ẢNH NỀN THUẦN TÚY,
   *  KHÔNG chứa text — tên user luôn là lớp HTML riêng đè lên (z-index 2). */
  fill?: boolean;
}

export const NameplateDisplay = ({ asset, size = 160, animate = true, eager = false, className, fill = false }: NameplateDisplayProps) => {
  const [inViewRef, inView] = useInViewOnce<HTMLSpanElement>();
  const ref = eager ? undefined : inViewRef;
  return (
    <span
      ref={ref}
      className={`npd${className ? ` ${className}` : ''}`}
      style={fill ? undefined : { width: size, height: Math.round((size * 84) / 448) }}
      aria-hidden="true"
    >
      <DecorationMedia asset={asset} enabled={eager || inView} animate={animate} className="npd__media" />
    </span>
  );
};
