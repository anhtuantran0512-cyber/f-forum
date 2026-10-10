import { useRef, useState, type KeyboardEvent } from 'react';
import { GRADIENT_GROUPS, GRADIENT_PRESETS } from '../utils/gradients';
import './GradientSwatchPicker.css';
import { GradientSurface } from './GradientSurface';

interface GradientSwatchPickerProps {
  value: string;
  onChange: (id: string) => void;
  label: string;
  includeDarkMetal?: boolean;
}

/** Shared, keyboard-accessible palette; hover/focus previews only inside this control. */
export function GradientSwatchPicker({ value, onChange, label, includeDarkMetal = false }: GradientSwatchPickerProps) {
  const options = GRADIENT_PRESETS.filter(g => includeDarkMetal || g.id !== '10');
  const selected = options.find(g => g.id === value) || options[0];
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const preview = options.find(g => g.id === hoverId) || selected;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = options.findIndex(g => refs.current[g.id] === event.target);
    if (index < 0) return;
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % options.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    else return;
    event.preventDefault();
    const id = options[next].id;
    refs.current[id]?.focus();
    onChange(id);
    setPulse(p => p + 1);
  };

  return (
    <div className="gradient-picker">
      <div className="gradient-picker__preview" aria-hidden="true">
        <GradientSurface gradient={preview.css} className="gradient-picker__preview-color" />
        <span className="gradient-picker__preview-code">{preview.colors.join(' · ')}</span>
      </div>
      <div role="radiogroup" aria-label={label} className="gradient-picker__groups" onKeyDown={handleKeyDown} onMouseLeave={() => setHoverId(null)}>
        {GRADIENT_GROUPS.map(group => {
          const presets = options.filter(g => g.group === group.id);
          return (
            <div key={group.id} className="gradient-picker__group">
              <span className="gradient-picker__heading" aria-hidden="true">{group.label}</span>
              <div className="gradient-picker__grid">
                {presets.map(g => {
                  const active = selected.id === g.id;
                  const hex = g.colors.join(' → ');
                  return (
                    <button
                      key={g.id}
                      ref={el => { refs.current[g.id] = el; }}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={`Gradient ${g.id}: ${hex}`}
                      title={hex}
                      tabIndex={active ? 0 : -1}
                      className={`gradient-swatch${active ? ' gradient-swatch--active' : ''}`}
                      style={{ background: g.css }}
                      onMouseEnter={() => setHoverId(g.id)}
                      onFocus={() => setHoverId(g.id)}
                      onBlur={() => setHoverId(null)}
                      onClick={() => { onChange(g.id); setPulse(p => p + 1); }}
                    >
                      {active && <span className="gradient-swatch__check" aria-hidden="true">✓</span>}
                      {active && pulse > 0 && <span key={pulse} className="gradient-swatch__ripple" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
