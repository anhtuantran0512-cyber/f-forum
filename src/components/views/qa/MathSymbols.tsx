/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { MATH_SYMBOLS } from '../../../utils/mathSymbols';
import { useEscapeKey } from '../../../utils/useEscapeKey';
import './QADetail.css';

/* Bấm nút ký hiệu KHÔNG được cướp tiêu điểm của ô soạn: nếu không, con trỏ mất chỗ (chèn sai vị trí)
   và trên điện thoại bàn phím ảo bị đóng sau mỗi lần chạm. */
const keepEditorFocus = (event: React.MouseEvent) => event.preventDefault();

const SymbolButtons: React.FC<{ onInsert: (symbol: string) => void }> = ({ onInsert }) => (
  <>
    {MATH_SYMBOLS.map((sym) => (
      <button
        key={sym}
        type="button"
        onMouseDown={keepEditorFocus}
        onClick={() => onInsert(sym)}
        className="w-11 h-11 rounded-lg bg-neutral-900 hover:bg-cyan-500/20 text-neutral-200 hover:text-cyan-300 border border-white/10 hover:border-cyan-400/40 text-sm font-mono font-bold flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        title={`Chèn ${sym}`}
      >
        {sym}
      </button>
    ))}
  </>
);

/** Bảng ký hiệu nội tuyến (máy tính / máy tính bảng, và modal "Đặt câu hỏi"). */
export const MathSymbolsBar: React.FC<{ onInsert: (symbol: string) => void }> = ({ onInsert }) => (
  <div className="flex flex-col gap-1 p-2 rounded-xl bg-white/5 border border-white/10 my-1.5">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-mono font-semibold text-cyan-300 uppercase tracking-wider">
        ∑ Ký Hiệu Toán Học & Khoa Học ({MATH_SYMBOLS.length} ký tự)
      </span>
      <span className="text-[11px] text-neutral-400 font-mono">Chạm để chèn</span>
    </div>
    <div className="flex items-center gap-1 flex-wrap max-h-36 overflow-y-auto pr-1">
      <SymbolButtons onInsert={onInsert} />
    </div>
  </div>
);

interface MathSymbolsSheetProps {
  open: boolean;
  onClose: () => void;
  onInsert: (symbol: string) => void;
}

/**
 * Bottom Sheet bảng ký hiệu cho điện thoại. Không có lớp phủ chắn nền: người dùng vẫn thấy và chạm được
 * ô soạn phía trên trong lúc chọn ký hiệu. Đóng bằng nút ✕, phím Esc hoặc kéo tay nắm xuống.
 */
export const MathSymbolsSheet: React.FC<MathSymbolsSheetProps> = ({ open, onClose, onInsert }) => {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  useEscapeKey(onClose, open);

  if (!open || typeof document === 'undefined') return null;

  const onGripDown = (event: React.PointerEvent<HTMLDivElement>) => {
    startY.current = event.clientY;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onGripMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragY(Math.max(0, event.clientY - startY.current));
  };
  const onGripUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
    const shouldClose = dragY > 88;
    setDragY(0);
    if (shouldClose) onClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Bảng ký hiệu Toán học và Khoa học"
      className="ff-qa-sheet ff-light-adapt"
      style={{
        transform: dragY ? `translate3d(0, ${dragY}px, 0)` : undefined,
        transition: dragging ? 'none' : 'transform 180ms ease',
      }}
    >
      <div
        className="ff-qa-sheet__grip"
        onPointerDown={onGripDown}
        onPointerMove={onGripMove}
        onPointerUp={onGripUp}
        onPointerCancel={onGripUp}
        aria-hidden="true"
      >
        <span />
      </div>
      <div className="flex items-center justify-between pb-2">
        <span className="text-[11px] font-mono font-semibold text-cyan-300 uppercase tracking-wider">
          ∑ Ký hiệu ({MATH_SYMBOLS.length} ký tự) · chạm để chèn
        </span>
        <button
          type="button"
          onMouseDown={keepEditorFocus}
          onClick={onClose}
          className="inline-flex items-center justify-center w-9 h-9 -mr-1 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 cursor-pointer"
          aria-label="Đóng bảng ký hiệu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5 overflow-y-auto overscroll-contain pb-1">
        <SymbolButtons onInsert={onInsert} />
      </div>
    </div>,
    document.body,
  );
};
