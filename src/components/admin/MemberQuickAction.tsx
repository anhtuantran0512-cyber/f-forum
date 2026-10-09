/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Sheet thao tác nhanh trên từng dòng thành viên (Epic 3 — mục 3.4):
 * Cấm đăng (1 ngày / 3 ngày / 1 tuần / vĩnh viễn), Cảnh cáo (lưu lịch sử), Khoá chat,
 * Cấp vai trò (chỉ Admin/Super Admin). Component chỉ thu thập lựa chọn — việc gọi API
 * do AdminInsightsModal thực hiện, máy chủ là nơi quyết định cuối cùng.
 */
import { useEffect, useId, useRef, useState, type CSSProperties, type FC, type ReactNode } from 'react';
import { AlertTriangle, Ban, BadgeCheck, Check, GraduationCap, LoaderCircle, MessageSquareOff, Shield, UserRound, X } from 'lucide-react';
import { CustomRoleBadge } from './CustomRoleBadge';
import { QUICK_DURATIONS, safeRoleColor } from './adminConstants';
import type { CustomRoleRow } from './RoleStudio';
import './AdminStudio.css';

export type QuickActionKind = 'ban' | 'mute' | 'warn' | 'role';
export type RoleChoice = 'NONE' | 'MODERATOR' | 'TEACHER' | `custom:${string}`;
export type ActionResult = { ok: boolean; message: string };


export interface QuickActionMember {
  name: string;
  email: string;
  staffRole: 'MODERATOR' | 'TEACHER' | null;
  customRole: string | null;
  warningCount: number;
  moderation: { banned: boolean; muted: boolean; reason?: string };
}

interface MemberQuickActionProps {
  kind: QuickActionKind;
  member: QuickActionMember;
  roles: CustomRoleRow[];
  allowStaffRoles: boolean;
  onModerate: (action: 'ban' | 'mute' | 'unban' | 'unmute', durationMinutes: number, reason: string) => Promise<ActionResult>;
  onWarn: (reason: string) => Promise<ActionResult>;
  onAssignRole: (choice: RoleChoice) => Promise<ActionResult>;
  onDone: (message: string) => void;
  onClose: () => void;
}

const currentChoiceOf = (member: QuickActionMember): RoleChoice =>
  member.customRole ? `custom:${member.customRole}` : member.staffRole || 'NONE';

export const MemberQuickAction: FC<MemberQuickActionProps> = ({
  kind,
  member,
  roles,
  allowStaffRoles,
  onModerate,
  onWarn,
  onAssignRole,
  onDone,
  onClose,
}) => {
  const titleId = useId();
  const firstFocusRef = useRef<HTMLButtonElement | HTMLTextAreaElement | null>(null);
  const [duration, setDuration] = useState(1440);
  const [reason, setReason] = useState('');
  const [choice, setChoice] = useState<RoleChoice>(() => currentChoiceOf(member));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lifting = (kind === 'ban' && member.moderation.banned) || (kind === 'mute' && member.moderation.muted);

  useEffect(() => {
    const timer = window.setTimeout(() => firstFocusRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, []);

  const meta = {
    ban: lifting
      ? { title: 'Gỡ cấm đăng', tone: 'good', Icon: Check, cta: 'Gỡ cấm đăng' }
      : { title: 'Cấm đăng', tone: 'danger', Icon: Ban, cta: 'Xác nhận cấm đăng' },
    mute: lifting
      ? { title: 'Mở khoá chat', tone: 'good', Icon: Check, cta: 'Mở khoá chat' }
      : { title: 'Khoá chat', tone: 'warn', Icon: MessageSquareOff, cta: 'Xác nhận khoá chat' },
    warn: { title: 'Gửi cảnh cáo', tone: 'warn', Icon: AlertTriangle, cta: 'Gửi cảnh cáo' },
    role: { title: 'Cấp vai trò', tone: 'accent', Icon: BadgeCheck, cta: 'Lưu vai trò' },
  }[kind];

  const needsReason = (kind === 'ban' || kind === 'mute') ? !lifting : kind === 'warn';
  const reasonValid = !needsReason || reason.trim().length >= 3;
  const roleChanged = kind !== 'role' || choice !== currentChoiceOf(member);

  const submit = async () => {
    if (busy || !reasonValid || !roleChanged) return;
    if ((kind === 'ban' || kind === 'mute') && !lifting && duration === 0
      && !window.confirm(`${kind === 'ban' ? 'Cấm đăng' : 'Khoá chat'} ${member.email} vĩnh viễn?`)) return;
    setBusy(true);
    setError(null);
    let result: ActionResult;
    if (kind === 'ban') result = await onModerate(lifting ? 'unban' : 'ban', duration, reason.trim());
    else if (kind === 'mute') result = await onModerate(lifting ? 'unmute' : 'mute', duration, reason.trim());
    else if (kind === 'warn') result = await onWarn(reason.trim());
    else result = await onAssignRole(choice);
    setBusy(false);
    if (result.ok) onDone(result.message);
    else setError(result.message);
  };

  const roleOptions: Array<{ value: RoleChoice; label: string; hint: string; node?: ReactNode }> = [
    { value: 'NONE', label: 'Thành viên thường', hint: 'Thu hồi mọi vai trò quản trị', node: <UserRound size={14} aria-hidden="true" /> },
    ...(allowStaffRoles ? [
      { value: 'TEACHER' as RoleChoice, label: 'Giáo viên', hint: 'Cấm đăng · cảnh cáo · khoá chat', node: <GraduationCap size={14} aria-hidden="true" /> },
      { value: 'MODERATOR' as RoleChoice, label: 'Moderator', hint: 'Cấm đăng · cảnh cáo · khoá chat', node: <Shield size={14} aria-hidden="true" /> },
    ] : []),
    ...roles.map((role) => ({
      value: `custom:${role.id}` as RoleChoice,
      label: role.name,
      hint: `${role.permissions.length} quyền · ${role.memberCount || 0} người đang giữ`,
      node: <CustomRoleBadge name={role.name} icon={role.icon} color={role.color} specialChar={role.specialChar} />,
    })),
  ];

  return (
    <div
      className="ffq-backdrop"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}
    >
      <section className={`ffq-sheet ffq-sheet--${meta.tone}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="ffq-sheet__head">
          <span className="ffq-sheet__icon"><meta.Icon size={17} aria-hidden="true" /></span>
          <div>
            <h4 id={titleId}>{meta.title}</h4>
            <p>{member.name} · <span>{member.email}</span></p>
          </div>
          <button type="button" className="faa-icon-button" aria-label="Đóng" onClick={onClose} disabled={busy}><X size={16} /></button>
        </header>

        {(kind === 'ban' || kind === 'mute') && !lifting && (
          <div className="ffq-block">
            <span className="ffq-label">Thời hạn</span>
            <div className="ffq-chips" role="radiogroup" aria-label="Thời hạn áp dụng">
              {QUICK_DURATIONS.map((option, index) => (
                <button
                  key={option.value}
                  ref={index === 0 ? (node) => { firstFocusRef.current = node; } : undefined}
                  type="button"
                  role="radio"
                  aria-checked={duration === option.value}
                  className={`${duration === option.value ? 'is-on' : ''} ${option.value === 0 ? 'is-forever' : ''}`}
                  onClick={() => setDuration(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {lifting && (
          <p className="ffq-note">
            {kind === 'ban' ? 'Thành viên đang bị cấm đăng.' : 'Thành viên đang bị khoá chat.'}
            {member.moderation.reason ? ` Lý do hiện tại: ${member.moderation.reason}` : ''}
          </p>
        )}

        {needsReason && (
          <label className="ffq-block">
            <span className="ffq-label">
              {kind === 'warn' ? 'Nội dung cảnh cáo' : 'Lý do'} <small>(bắt buộc, 3–500 ký tự{kind === 'warn' ? ' · gửi riêng cho thành viên' : ''})</small>
            </span>
            <textarea
              ref={kind === 'warn' ? (node) => { firstFocusRef.current = node; } : undefined}
              value={reason}
              maxLength={500}
              rows={3}
              onChange={(event) => setReason(event.target.value.slice(0, 500))}
              placeholder={kind === 'warn' ? 'Trích dẫn hành vi và yêu cầu khắc phục cụ thể…' : 'Nêu rõ hành vi và nội dung vi phạm…'}
            />
            <small className="ffq-counter">{reason.trim().length}/500</small>
          </label>
        )}

        {kind === 'warn' && member.warningCount > 0 && (
          <p className="ffq-note">Đã có {member.warningCount} cảnh cáo trước đó — xem lịch sử trong hồ sơ (nút ⋯).</p>
        )}

        {kind === 'role' && (
          <div className="ffq-block">
            <span className="ffq-label">Chọn vai trò</span>
            <div className="ffq-roles" role="radiogroup" aria-label="Vai trò sẽ cấp">
              {roleOptions.map((option, index) => {
                const customId = option.value.startsWith('custom:') ? option.value.slice(7) : null;
                const tint = customId ? safeRoleColor(roles.find((role) => role.id === customId)?.color) : undefined;
                return (
                  <button
                    key={option.value}
                    ref={index === 0 ? (node) => { firstFocusRef.current = node; } : undefined}
                    type="button"
                    role="radio"
                    aria-checked={choice === option.value}
                    className={choice === option.value ? 'is-on' : ''}
                    style={tint ? ({ '--ffr-color': tint } as CSSProperties) : undefined}
                    onClick={() => setChoice(option.value)}
                  >
                    <span className="ffq-roles__visual">{option.node}</span>
                    {!customId && <b>{option.label}</b>}
                    <small>{option.hint}</small>
                    {currentChoiceOf(member) === option.value && <em>Hiện tại</em>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="faa-alert faa-alert--error" role="alert"><AlertTriangle size={15} aria-hidden="true" />{error}</p>}

        <footer className="ffq-sheet__foot">
          <button type="button" className="ffq-ghost" onClick={onClose} disabled={busy}>Huỷ</button>
          <button type="button" className="ffq-cta" onClick={() => void submit()} disabled={busy || !reasonValid || !roleChanged}>
            {busy ? <LoaderCircle className="faa-spin" size={14} aria-hidden="true" /> : <meta.Icon size={14} aria-hidden="true" />}
            {meta.cta}
          </button>
        </footer>
      </section>
    </div>
  );
};
