/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Ô mật khẩu "Đèn pin soi mật khẩu" (Epic 5 · Nhiemvu_4 Task 3.1 · Nhiemvu_5 Phase D).
 *
 *  - Mặc định: •••••, đèn tắt.
 *  - NHẤN GIỮ đèn pin rồi RÊ lên ô (chuột hoặc ngón tay): nón sáng chạy theo con trỏ,
 *    CHỈ ký tự nằm trong vùng sáng hiện chữ thật; ngoài vùng sáng vẫn là chấm.
 *    Thả tay → đèn tắt (fade nhanh).
 *  - CHẠM NHANH đèn pin: bật "đèn treo" — vùng sáng đi theo chuột trên ô; chạm lần nữa để tắt.
 *  - ♿ Fallback bắt buộc: NHẤN ĐÚP đèn pin, hoặc GIỮ PHÍM CÁCH (Space) khi đang chọn
 *    nút đèn → hiện toàn bộ mật khẩu; Enter để bật/tắt. Không ép phải dùng chuột.
 *
 * Kỹ thuật: 2 lớp chữ cùng font monospace trùng khít từng ô ký tự — lớp chấm và lớp
 * chữ thật — được cắt lộ bằng `mask-image: radial-gradient(...)` theo toạ độ con trỏ
 * (biến CSS cập nhật trực tiếp, không re-render khi rê). Thêm lớp bóng tối có "lỗ sáng",
 * quầng sáng chớp nháy (flicker) và bụi sáng bay trong vùng chiếu.
 */
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FC,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { playFlashlightClick } from '../../utils/audio';
import './AuthExperience.css';

export type FlashlightMode = 'off' | 'beam' | 'reveal';

interface FlashlightPasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  autoComplete?: 'current-password' | 'new-password';
  maxLength?: number;
  required?: boolean;
  invalid?: boolean;
  onFocusChange?: (focused: boolean) => void;
  onModeChange?: (mode: FlashlightMode) => void;
}

const TORCH_SPACE = 52;
const DOUBLE_TAP_MS = 320;
const QUICK_TAP_MS = 240;

const TorchIcon: FC<{ on: boolean }> = ({ on }) => (
  <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true" focusable="false" className="ffl__torch-svg">
    {on && (
      <g className="ffl__torch-rays" stroke="#fde68a" strokeWidth="2" strokeLinecap="round">
        <path d="M5 9 L1.5 6.5" />
        <path d="M4 16 L0.5 16" />
        <path d="M5 23 L1.5 25.5" />
      </g>
    )}
    <path d="M8 10.5 L13 8 V24 L8 21.5 Z" fill={on ? '#fef3c7' : '#94a3b8'} stroke={on ? '#fbbf24' : '#cbd5e1'} strokeWidth="1.4" strokeLinejoin="round" />
    <rect x="13" y="9.5" width="15" height="13" rx="3.5" fill={on ? '#f59e0b' : '#475569'} stroke={on ? '#fde68a' : '#94a3b8'} strokeWidth="1.4" />
    <rect x="18" y="12.6" width="5" height="3" rx="1.2" fill={on ? '#fff7d6' : '#cbd5e1'} />
    <circle cx="10.4" cy="16" r="2.2" fill={on ? '#fffbeb' : '#64748b'} />
  </svg>
);

export const FlashlightPasswordField: FC<FlashlightPasswordFieldProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete = 'current-password',
  maxLength = 60,
  required = false,
  invalid = false,
  onFocusChange,
  onModeChange,
}) => {
  const hintId = useId();
  const [mode, setMode] = useState<FlashlightMode>('off');
  const [sticky, setSticky] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const torchRef = useRef<HTMLButtonElement>(null);
  const press = useRef<{ id: number; t: number; x: number; y: number; moved: boolean; wasSticky: boolean } | null>(null);
  const lastTap = useRef(0);

  useEffect(() => { onModeChange?.(mode); }, [mode, onModeChange]);

  /* Đồng bộ vị trí cuộn ngang của ô nhập với 2 lớp chữ (mật khẩu dài hơn bề rộng ô). */
  useEffect(() => {
    if (mode !== 'beam') return undefined;
    let frame = 0;
    const loop = () => {
      const box = boxRef.current;
      const input = inputRef.current;
      if (box && input) box.style.setProperty('--ffl-scroll', `${input.scrollLeft}px`);
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [mode]);

  const setSpot = (clientX: number, clientY: number, fromTorch = false) => {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    let x = clientX - rect.left;
    const y = Math.max(6, Math.min(rect.height - 6, clientY - rect.top));
    if (fromTorch || x > rect.width - TORCH_SPACE) {
      /* Đang đè ngay lên đèn pin → chiếu vào giữa phần chữ đang hiển thị. */
      const fontSize = parseFloat(getComputedStyle(box).fontSize) || 15;
      const textWidth = value.length * fontSize * 0.72;
      x = Math.min(16 + Math.max(24, textWidth) / 2, rect.width - TORCH_SPACE - 24);
    }
    x = Math.max(12, Math.min(rect.width - TORCH_SPACE, x));
    box.style.setProperty('--ffl-x', `${x.toFixed(1)}px`);
    box.style.setProperty('--ffl-y', `${y.toFixed(1)}px`);
    const torch = torchRef.current?.getBoundingClientRect();
    if (torch) {
      box.style.setProperty('--ffl-tx', `${(torch.left - rect.left + torch.width * 0.28).toFixed(1)}px`);
      box.style.setProperty('--ffl-ty', `${(torch.top - rect.top + torch.height / 2).toFixed(1)}px`);
    }
  };

  const turnOff = (withSound = true) => {
    setSticky(false);
    if (mode !== 'off' && withSound) playFlashlightClick(false);
    setMode('off');
  };

  const onTorchPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault(); /* giữ con trỏ gõ trong ô mật khẩu */
    const now = performance.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      /* Nhấn đúp → hiện toàn bộ (fallback trợ năng) */
      lastTap.current = 0;
      press.current = null;
      setSticky(false);
      setMode((current) => (current === 'reveal' ? 'off' : 'reveal'));
      playFlashlightClick(true);
      return;
    }
    lastTap.current = now;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* trình duyệt cũ */ }
    press.current = { id: event.pointerId, t: now, x: event.clientX, y: event.clientY, moved: false, wasSticky: sticky };
    setSpot(event.clientX, event.clientY, true);
    if (mode !== 'beam') {
      setMode('beam');
      playFlashlightClick(true);
    }
  };

  const onTorchPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const current = press.current;
    if (!current || current.id !== event.pointerId) return;
    if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) > 6) current.moved = true;
    if (current.moved) setSpot(event.clientX, event.clientY);
  };

  const finishPress = (event: PointerEvent<HTMLButtonElement>, cancelled = false) => {
    const current = press.current;
    if (!current || current.id !== event.pointerId) return;
    press.current = null;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* đã nhả */ }
    if (cancelled) { turnOff(); return; }
    const quickTap = performance.now() - current.t < QUICK_TAP_MS && !current.moved;
    if (quickTap) {
      if (current.wasSticky) turnOff();
      else setSticky(true);
    } else if (!current.wasSticky) {
      turnOff(); /* giữ-rê xong thả tay → tắt đèn */
    }
  };

  const onTorchKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      if (!event.repeat && mode !== 'reveal') {
        setSticky(false);
        setMode('reveal');
        playFlashlightClick(true);
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      setSticky(false);
      setMode((current) => (current === 'reveal' ? 'off' : 'reveal'));
      playFlashlightClick(mode !== 'reveal');
    } else if (event.key === 'Escape' && mode !== 'off') {
      event.preventDefault();
      event.stopPropagation();
      turnOff();
    }
  };

  const onTorchKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      if (mode === 'reveal') turnOff();
    }
  };

  const onBoxPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (mode === 'beam' && sticky && !press.current) setSpot(event.clientX, event.clientY);
  };

  const chars = Array.from(value);
  const showLayers = mode === 'beam';

  return (
    <div
      ref={wrapRef}
      className={`ffl ffl--${mode} ${invalid ? 'is-invalid' : ''}`}
      onBlur={(event) => {
        if (!wrapRef.current?.contains(event.relatedTarget as Node | null)) {
          onFocusChange?.(false);
          if (mode !== 'off') turnOff(false);
        }
      }}
      onFocus={() => onFocusChange?.(true)}
    >
      <label htmlFor={id} className="auth-label">{label}</label>
      <div ref={boxRef} className="ffl__box" onPointerMove={onBoxPointerMove}>
        <input
          ref={inputRef}
          id={id}
          className="ffl__input auth-input"
          type={mode === 'off' ? 'password' : 'text'}
          value={value}
          required={required}
          maxLength={maxLength}
          autoComplete={autoComplete}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={hintId}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value.slice(0, maxLength))}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && mode !== 'off') {
              event.preventDefault();
              event.stopPropagation();
              turnOff();
            }
          }}
        />

        {showLayers && (
          <div className="ffl__layers" aria-hidden="true">
            <span className="ffl__cone" />
            <span className="ffl__mask ffl__mask--dots">
              <span className="ffl__text">
                {chars.map((_, index) => <span key={index} className="ffl__dot">•</span>)}
              </span>
            </span>
            <span className="ffl__mask ffl__mask--real">
              <span className="ffl__text">{value}</span>
            </span>
            <span className="ffl__dark" />
            <span className="ffl__glow" />
            <span className="ffl__dust">
              {Array.from({ length: 7 }, (_, dust) => <i key={dust} className={`ffl__mote ffl__mote--${dust}`} />)}
            </span>
          </div>
        )}

        <button
          ref={torchRef}
          type="button"
          data-silent
          className="ffl__torch"
          aria-label={mode === 'reveal' ? 'Đang hiện mật khẩu — thả phím Cách hoặc nhấn Enter để ẩn' : 'Đèn pin soi mật khẩu'}
          aria-pressed={mode !== 'off'}
          aria-describedby={hintId}
          onPointerDown={onTorchPointerDown}
          onPointerMove={onTorchPointerMove}
          onPointerUp={(event) => finishPress(event)}
          onPointerCancel={(event) => finishPress(event, true)}
          onKeyDown={onTorchKeyDown}
          onKeyUp={onTorchKeyUp}
          onContextMenu={(event) => event.preventDefault()}
        >
          <TorchIcon on={mode !== 'off'} />
        </button>
        <span className="ffl__hint" id={hintId}>Giữ &amp; rê đèn để soi · Space hoặc nhấn đúp để xem hết</span>
      </div>
      <span className="sr-only" aria-live="polite">
        {mode === 'reveal' ? 'Đang hiện toàn bộ mật khẩu.' : mode === 'beam' ? 'Đèn pin đang bật.' : ''}
      </span>
    </div>
  );
};
