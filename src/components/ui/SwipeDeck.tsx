/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './SwipeDeck.css';

export interface SwipeDeckItem {
  id: string;
  title: string;
  body: ReactNode;
  icon?: ReactNode;
}

interface SwipeDeckProps {
  items: SwipeDeckItem[];
  label: string;
}

const DISMISS_PX = 90;
const VISIBLE = 3;

/**
 * Chồng thẻ kéo-để-lướt (code_yeucau · stk-02 "swipe card deck drag-to-dismiss").
 * Kéo thẻ trên cùng quá 90px (hoặc vẩy nhanh) → thẻ bay ra và xuống cuối chồng.
 * Không chặn cuộn dọc (touch-action: pan-y); có nút ‹ › và phím ← → cho bàn phím.
 */
export function SwipeDeck({ items, label }: SwipeDeckProps) {
  const [order, setOrder] = useState(() => items.map((_, i) => i));
  const [dragX, setDragX] = useState(0);
  const [leaving, setLeaving] = useState<null | 'left' | 'right'>(null);
  const start = useRef<{ x: number; t: number; id: number } | null>(null);

  const top = items[order[0]];
  if (!top) return null;

  const cycle = (dir: 'left' | 'right') => {
    if (leaving) return;
    setLeaving(dir);
    window.setTimeout(() => {
      setOrder((prev) => (dir === 'left' ? [...prev.slice(1), prev[0]] : [prev[prev.length - 1], ...prev.slice(0, -1)]));
      setLeaving(null);
      setDragX(0);
    }, 260);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (leaving || (e.pointerType === 'mouse' && e.button !== 0)) return;
    start.current = { x: e.clientX, t: performance.now(), id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!start.current || start.current.id !== e.pointerId) return;
    setDragX(e.clientX - start.current.x);
  };
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const velocity = Math.abs(dx) / Math.max(1, performance.now() - s.t);
    if (Math.abs(dx) > DISMISS_PX || (Math.abs(dx) > 30 && velocity > 0.6)) cycle(dx < 0 ? 'left' : 'right');
    else setDragX(0);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      cycle('left');
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      cycle('right');
    }
  };

  const position = items.findIndex((it) => it.id === top.id) + 1;

  return (
    <div className="ff-deck" role="group" aria-roledescription="chồng thẻ" aria-label={label}>
      <div className="ff-deck__stack" tabIndex={0} onKeyDown={onKeyDown} aria-live="polite">
        {order
          .slice(0, VISIBLE)
          .reverse()
          .map((itemIndex) => {
            const item = items[itemIndex];
            const depth = order.indexOf(itemIndex);
            const isTop = depth === 0;
            const offset = isTop ? (leaving ? (leaving === 'left' ? -420 : 420) : dragX) : 0;
            const style = isTop
              ? { transform: `translateX(${offset}px) rotate(${offset / 18}deg)`, opacity: leaving ? 0 : 1 }
              : undefined;
            return (
              <div
                key={item.id}
                className={`ff-deck__card${isTop ? ' is-top' : ''}${isTop && dragX !== 0 && !leaving ? ' is-dragging' : ''}`}
                data-depth={depth}
                style={style}
                aria-hidden={!isTop}
                onPointerDown={isTop ? onPointerDown : undefined}
                onPointerMove={isTop ? onPointerMove : undefined}
                onPointerUp={isTop ? onPointerEnd : undefined}
                onPointerCancel={isTop ? onPointerEnd : undefined}
              >
                {item.icon && <span className="ff-deck__icon" aria-hidden="true">{item.icon}</span>}
                <div className="min-w-0">
                  <p className="ff-deck__title">{item.title}</p>
                  <p className="ff-deck__body">{item.body}</p>
                </div>
              </div>
            );
          })}
      </div>
      <div className="ff-deck__controls">
        <button type="button" className="ff-deck__btn" onClick={() => cycle('right')} aria-label="Thẻ trước">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="ff-deck__count" aria-hidden="true">
          {position}/{items.length}
        </span>
        <button type="button" className="ff-deck__btn" onClick={() => cycle('left')} aria-label="Thẻ tiếp theo">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <span className="sr-only">Thẻ {position} trên {items.length} — kéo ngang hoặc dùng phím mũi tên để lướt.</span>
      </div>
    </div>
  );
}

export default SwipeDeck;
