/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useId, useState, type FormEvent } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import {
  PASSWORD_MAX_LENGTH,
  passwordStrength,
  validatePasswordChange,
} from '../../utils/passwordRules';

export interface PasswordChangeFormProps {
  onChangePassword: (
    currentPassword: string,
    newPassword: string,
    signOutOthers: boolean,
  ) => Promise<{ ok: boolean; message: string }>;
  /** Super Admin: mật khẩu do secret máy chủ quản lý → chỉ hiện hướng dẫn. */
  managedByServer?: boolean;
}

type Status = { kind: 'idle' | 'busy' | 'error' | 'done'; message?: string };

const STRENGTH_LABEL = ['Quá ngắn', 'Tạm được', 'Khá', 'Mạnh'] as const;
const STRENGTH_TONE = ['bg-rose-400', 'bg-amber-400', 'bg-sky-400', 'bg-emerald-400'] as const;

const inputClass =
  'w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-[11px] text-white placeholder:text-white/40 ' +
  'focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 disabled:opacity-60';

/**
 * Đổi mật khẩu trong Cài đặt → Phiên đăng nhập. State nằm trong component này nên
 * mật khẩu đã gõ biến mất khi form bị gỡ (SettingsModal remount nó theo lần mở).
 */
export const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({ onChangePassword, managedByServer = false }) => {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [reveal, setReveal] = useState(false);
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const baseId = useId();
  const busy = status.kind === 'busy';

  const heading = (
    <p className="text-[11px] font-semibold text-white/85 flex items-center gap-1.5">
      <KeyRound className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
      Đổi mật khẩu
    </p>
  );

  if (managedByServer) {
    return (
      <>
        {heading}
        <p className="text-[10.5px] text-white/60 leading-snug">
          Mật khẩu Super Admin được quản lý bằng secret máy chủ{' '}
          <code className="font-mono text-amber-200">FFORUM_ADMIN_PASSWORD</code>. Đổi secret rồi khởi động lại máy
          chủ — mọi phiên Super Admin cũ sẽ tự bị thu hồi.
        </p>
      </>
    );
  }

  const clearFields = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setReveal(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const problem = validatePasswordChange(current, next, confirm);
    if (problem) {
      setStatus({ kind: 'error', message: problem });
      return;
    }
    setStatus({ kind: 'busy' });
    const result = await onChangePassword(current, next, signOutOthers);
    if (result.ok) {
      clearFields();
      setOpen(false);
      setStatus({ kind: 'done', message: result.message });
    } else {
      setStatus({ kind: 'error', message: result.message });
    }
  };

  const strength = passwordStrength(next);
  const fieldType = reveal ? 'text' : 'password';

  return (
    <>
      {heading}
      <p className="text-[10.5px] text-white/60 leading-snug">
        Nên đổi ngay nếu nghi bị lộ. Mặc định mọi thiết bị khác sẽ bị đăng xuất; máy này vẫn giữ đăng nhập.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setStatus({ kind: 'idle' });
          }}
          className="w-full px-2 py-2 rounded-xl text-[11px] font-semibold text-amber-200 hover:text-amber-100 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
          Đổi mật khẩu
        </button>
      ) : (
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-1.5" noValidate aria-busy={busy}>
          <label htmlFor={`${baseId}-current`} className="sr-only">Mật khẩu hiện tại</label>
          <input
            id={`${baseId}-current`}
            type={fieldType}
            autoComplete="current-password"
            maxLength={PASSWORD_MAX_LENGTH}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Mật khẩu hiện tại"
            disabled={busy}
            className={inputClass}
          />
          <label htmlFor={`${baseId}-next`} className="sr-only">Mật khẩu mới</label>
          <input
            id={`${baseId}-next`}
            type={fieldType}
            autoComplete="new-password"
            maxLength={PASSWORD_MAX_LENGTH}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="Mật khẩu mới (ít nhất 6 ký tự)"
            disabled={busy}
            aria-describedby={`${baseId}-strength`}
            className={inputClass}
          />
          <div id={`${baseId}-strength`} className="flex items-center gap-2" aria-live="polite">
            <div className="flex-1 grid grid-cols-3 gap-1" aria-hidden="true">
              {[1, 2, 3].map((step) => (
                <span
                  key={step}
                  className={`h-1 rounded-full transition-colors ${strength >= step ? STRENGTH_TONE[strength] : 'bg-white/10'}`}
                />
              ))}
            </div>
            <span className="text-[10px] text-white/55 whitespace-nowrap">
              {next ? `Độ mạnh: ${STRENGTH_LABEL[strength]}` : 'Nên ≥ 10 ký tự, trộn hoa/số/ký hiệu'}
            </span>
          </div>
          <label htmlFor={`${baseId}-confirm`} className="sr-only">Nhập lại mật khẩu mới</label>
          <input
            id={`${baseId}-confirm`}
            type={fieldType}
            autoComplete="new-password"
            maxLength={PASSWORD_MAX_LENGTH}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Nhập lại mật khẩu mới"
            disabled={busy}
            className={inputClass}
          />

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <label className="flex items-center gap-1.5 text-[10.5px] text-white/70 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={signOutOthers}
                onChange={(e) => setSignOutOthers(e.target.checked)}
                disabled={busy}
                className="accent-amber-400"
              />
              Đăng xuất các thiết bị khác
            </label>
            <button
              type="button"
              onClick={() => setReveal((value) => !value)}
              aria-pressed={reveal}
              aria-label={reveal ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {reveal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => {
                clearFields();
                setOpen(false);
                setStatus({ kind: 'idle' });
              }}
              disabled={busy}
              className="px-2 py-2 rounded-xl text-[11px] font-semibold text-white/80 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer disabled:opacity-60"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-2 py-2 rounded-xl text-[11px] font-bold text-black bg-amber-400 hover:bg-amber-300 border border-amber-300/60 transition-colors cursor-pointer disabled:opacity-60"
            >
              {busy ? 'Đang lưu…' : 'Lưu mật khẩu mới'}
            </button>
          </div>
        </form>
      )}

      {status.kind === 'error' && status.message && (
        <p className="text-[10.5px] text-rose-300" role="alert">{status.message}</p>
      )}
      {status.kind === 'done' && status.message && (
        <p className="text-[10.5px] text-emerald-300" role="status">{status.message}</p>
      )}
    </>
  );
};

export default PasswordChangeForm;
