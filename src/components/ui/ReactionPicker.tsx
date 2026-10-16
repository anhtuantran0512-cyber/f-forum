/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { useId, useRef, useState } from 'react';
import { Smile } from 'lucide-react';
import './ReactionPicker.css';

export interface ReactionOption<T extends string> {
  type: T;
  label: string;
  emoji: string;
}

interface ReactionPickerProps<T extends string> {
  options: readonly ReactionOption<T>[];
  counts?: Partial<Record<T, number>>;
  selected?: readonly T[];
  onReact: (type: T) => void;
  label?: string;
}

/** One compact reaction affordance; popular emoji appear on hover, focus, or tap. */
export function ReactionPicker<T extends string>({
  options,
  counts,
  selected = [],
  onReact,
  label = 'Bày tỏ cảm xúc',
}: ReactionPickerProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const pointerDownOpenState = useRef<boolean | null>(null);
  const popoverId = useId();
  const totalCount = Object.values(counts || {}).reduce<number>(
    (total, count) => total + (typeof count === 'number' ? Math.max(0, count) : 0),
    0,
  );

  return (
    <div
      className={`ff-reaction-picker${isOpen ? ' is-open' : ''}`}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch') setIsOpen(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'touch') setIsOpen(false);
      }}
      onFocusCapture={() => setIsOpen(true)}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setIsOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setIsOpen(false);
      }}
    >
      <button
        type="button"
        className="ff-reaction-trigger"
        aria-label={`${label}${totalCount > 0 ? `, ${totalCount} lượt` : ''}`}
        aria-expanded={isOpen}
        aria-controls={popoverId}
        title={label}
        onPointerDown={() => { pointerDownOpenState.current = isOpen; }}
        onClick={(event) => {
          const wasOpenBeforePointer = pointerDownOpenState.current;
          pointerDownOpenState.current = null;
          if (event.detail > 0 && wasOpenBeforePointer === false) {
            setIsOpen(true);
            return;
          }
          setIsOpen((open) => !open);
        }}
      >
        <Smile aria-hidden="true" className="ff-reaction-trigger__icon" />
        <span className="ff-reaction-trigger__label">{totalCount > 0 ? totalCount : 'Cảm xúc'}</span>
      </button>

      {isOpen && (
        <div
          id={popoverId}
          className="ff-reaction-popover"
          role="group"
          aria-label="Chọn cảm xúc"
        >
          {options.map((option) => {
            const active = selected.includes(option.type);
            const count = counts?.[option.type] || 0;
            return (
              <button
                key={option.type}
                type="button"
                className={`ff-reaction-option${active ? ' is-selected' : ''}`}
                aria-label={`${option.label}${active ? ' (đã chọn)' : ''}${count > 0 ? `, ${count} lượt` : ''}`}
                aria-pressed={active}
                title={option.label}
                onClick={() => {
                  onReact(option.type);
                  setIsOpen(false);
                }}
              >
                <span className="ff-reaction-option__emoji" aria-hidden="true">{option.emoji}</span>
                {count > 0 && <span className="ff-reaction-option__count" aria-hidden="true">{count}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ReactionPicker;
