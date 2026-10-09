/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { useRef, type PointerEvent, type ReactNode } from 'react';
import './DepthLandscapeCard.css';

interface DepthLandscapeCardProps {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}

/**
 * Thẻ phong cảnh bình minh nhiều lớp (code_yeucau · tch-15 depth parallax card):
 * bầu trời, mặt trời, dãy núi xa, đồi gần và tiền cảnh trôi lệch tốc độ theo con
 * trỏ. Toàn bộ là gradient + clip-path (không tải ảnh). Vị trí con trỏ chỉ ghi vào
 * biến CSS qua ref trong requestAnimationFrame → không re-render React.
 */
export function DepthLandscapeCard({ eyebrow, title, children }: DepthLandscapeCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const write = (x: number, y: number) => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      ref.current?.style.setProperty('--mx', x.toFixed(3));
      ref.current?.style.setProperty('--my', y.toFixed(3));
    });
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const r = e.currentTarget.getBoundingClientRect();
    write(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
  };

  return (
    <div ref={ref} className="ff-depth-card" onPointerMove={onMove} onPointerLeave={() => write(0, 0)}>
      <div className="ff-depth-card__scene" aria-hidden="true">
        <span className="ff-depth-card__layer ff-depth-card__sky" />
        <span className="ff-depth-card__layer ff-depth-card__sun" />
        <span className="ff-depth-card__layer ff-depth-card__ridge-far" />
        <span className="ff-depth-card__layer ff-depth-card__ridge-near" />
        <span className="ff-depth-card__layer ff-depth-card__hills" />
      </div>
      <div className="ff-depth-card__copy">
        {eyebrow && <p className="ff-depth-card__eyebrow">{eyebrow}</p>}
        <p className="ff-depth-card__title">{title}</p>
        {children}
      </div>
    </div>
  );
}

export default DepthLandscapeCard;
