/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Xưởng vai trò (Epic 3 — mục 3.1 & 3.5).
 *  - Form tạo vai trò: tên, icon (từ bộ icon cho sẵn), màu badge (preset + color picker),
 *    ký tự đặc biệt, danh sách quyền (checkbox) và PREVIEW TRỰC TIẾP trước khi lưu.
 *  - Ma trận phân quyền RBAC: vai trò × quyền — kiểm chứng trực quan ai được làm gì.
 *  - Danh sách vai trò tùy chỉnh: số người đang giữ, xoá (Super Admin / người tạo).
 * Mọi thao tác ghi đều qua máy chủ; Admin chỉ chọn được quyền mà chính mình đang có.
 */
import { useMemo, useState, type CSSProperties, type FC, type FormEvent } from 'react';
import { Check, KeyRound, Lock, LoaderCircle, Minus, Plus, ShieldCheck, Trash2, Wand2 } from 'lucide-react';
import { authHeaders, postJson } from '../../utils/session';
import { ADMIN_PERMISSIONS, PERMISSION_META, type AdminPermission, type CustomRoleDef } from '../../utils/rbac';
import type { AdminCapabilities } from '../../utils/adminCapabilities';
import { CustomRoleBadge } from './CustomRoleBadge';
import { ROLE_ICON_OPTIONS, safeRoleColor } from './adminConstants';
import './AdminStudio.css';

export interface CustomRoleRow extends CustomRoleDef {
  createdBy?: string;
  createdAt?: number;
  memberCount?: number;
}

const COLOR_PRESETS = ['#f59e0b', '#ef4444', '#ec4899', '#a78bfa', '#6366f1', '#22d3ee', '#10b981', '#84cc16'];
const SPECIAL_CHARS = ['✦', '⚡', '★', '♛', '❖', '✿', '☾', '⚔'];

interface RoleTemplate {
  id: string;
  label: string;
  name: string;
  icon: string;
  color: string;
  specialChar: string;
  permissions: AdminPermission[];
}

const TEMPLATES: RoleTemplate[] = [
  { id: 'admin', label: 'Admin', name: 'Admin', icon: 'crown', color: '#f59e0b', specialChar: '♛', permissions: [...ADMIN_PERMISSIONS] },
  { id: 'mod', label: 'Kiểm duyệt viên', name: 'Kiểm duyệt viên', icon: 'shield', color: '#22d3ee', specialChar: '✦', permissions: ['ban', 'warn', 'mute'] },
  { id: 'ta', label: 'Trợ giảng', name: 'Trợ giảng', icon: 'graduation-cap', color: '#10b981', specialChar: '✿', permissions: ['warn', 'edit_content'] },
  { id: 'editor', label: 'Biên tập viên', name: 'Biên tập viên', icon: 'sparkles', color: '#a78bfa', specialChar: '❖', permissions: ['edit_content'] },
];

const BUILT_IN_ROWS: Array<{ id: string; label: string; tone: string; permissions: AdminPermission[] }> = [
  { id: 'super', label: 'Super Admin', tone: '#fbbf24', permissions: [...ADMIN_PERMISSIONS] },
  { id: 'teacher', label: 'Giáo viên', tone: '#34d399', permissions: ['ban', 'warn', 'mute'] },
  { id: 'moderator', label: 'Moderator', tone: '#60a5fa', permissions: ['ban', 'warn', 'mute'] },
];

interface RoleStudioProps {
  caps: AdminCapabilities;
  currentUserEmail: string;
  roles: CustomRoleRow[];
  loading: boolean;
  error: string | null;
  onRolesChanged: () => void;
}

export const RoleStudio: FC<RoleStudioProps> = ({ caps, currentUserEmail, roles, loading, error, onRolesChanged }) => {
  const canCreate = caps.isSuperAdmin || caps.permissions.includes('give_role');
  const ownPermissions = caps.permissions;
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('shield');
  const [color, setColor] = useState('#22d3ee');
  const [specialChar, setSpecialChar] = useState('✦');
  const [permissions, setPermissions] = useState<AdminPermission[]>(['warn']);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const trimmedName = name.trim();
  const nameValid = trimmedName.length >= 2 && trimmedName.length <= 24;
  const duplicate = useMemo(
    () => roles.some((role) => role.name.toLowerCase() === trimmedName.toLowerCase()),
    [roles, trimmedName],
  );
  const formValid = nameValid && !duplicate && permissions.length > 0;

  const togglePermission = (permission: AdminPermission) => {
    if (!ownPermissions.includes(permission)) return;
    setPermissions((current) => current.includes(permission)
      ? current.filter((item) => item !== permission)
      : [...current, permission]);
  };

  const applyTemplate = (template: RoleTemplate) => {
    setName(template.name);
    setIcon(template.icon);
    setColor(template.color);
    setSpecialChar(template.specialChar);
    setPermissions(template.permissions.filter((permission) => ownPermissions.includes(permission)));
    setFormError(null);
    setNotice(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!formValid || busy) return;
    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      const { status, data } = await postJson('/api/admin/roles', {
        name: trimmedName,
        icon,
        color,
        specialChar: specialChar.trim(),
        permissions,
      });
      if (status !== 200 || !data?.success) {
        setFormError(data?.message || `Không tạo được vai trò (HTTP ${status}).`);
        return;
      }
      setNotice(`Đã tạo vai trò "${data.role?.name || trimmedName}". Gán cho thành viên ở tab Thành viên.`);
      setName('');
      onRolesChanged();
    } catch {
      setFormError('Không kết nối được máy chủ để tạo vai trò.');
    } finally {
      setBusy(false);
    }
  };

  const removeRole = async (role: CustomRoleRow) => {
    if (deleting) return;
    const holders = role.memberCount || 0;
    if (!window.confirm(`Xoá vai trò "${role.name}"?${holders > 0 ? ` ${holders} thành viên đang giữ sẽ bị gỡ vai trò này.` : ''}`)) return;
    setDeleting(role.id);
    setFormError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/roles?id=${encodeURIComponent(role.id)}`, { method: 'DELETE', headers: authHeaders() });
      const data = await response.json().catch(() => null);
      if (response.status !== 200 || !data?.success) {
        setFormError(data?.message || `Không xoá được vai trò (HTTP ${response.status}).`);
        return;
      }
      setNotice(`Đã xoá vai trò "${role.name}"${data.clearedAssignments ? ` và gỡ khỏi ${data.clearedAssignments} thành viên` : ''}.`);
      onRolesChanged();
    } catch {
      setFormError('Không kết nối được máy chủ để xoá vai trò.');
    } finally {
      setDeleting(null);
    }
  };

  const previewColor = safeRoleColor(color);
  const matrixRows = [
    ...BUILT_IN_ROWS.map((row) => ({ ...row, custom: null as CustomRoleRow | null })),
    ...roles.map((role) => ({
      id: role.id,
      label: role.name,
      tone: safeRoleColor(role.color),
      permissions: role.permissions as AdminPermission[],
      custom: role,
    })),
  ];

  return (
    <div className="ffr-studio">
      <header className="ffr-studio__head">
        <div>
          <p className="faa-eyebrow">XƯỞNG VAI TRÒ</p>
          <h3>Vai trò & phân quyền</h3>
          <p>Icon, màu, ký tự riêng — quyền do máy chủ kiểm tra ở từng thao tác.</p>
        </div>
        <span className="ffr-studio__seal"><ShieldCheck size={14} aria-hidden="true" /> RBAC kiểm tra phía máy chủ</span>
      </header>

      {(formError || error) && <div className="faa-alert faa-alert--error" role="alert">{formError || error}</div>}
      {notice && <div className="faa-alert faa-alert--success" role="status"><Check size={15} aria-hidden="true" />{notice}</div>}

      <div className="ffr-studio__grid">
        {canCreate ? (
          <form className="ffr-card ffr-form" onSubmit={submit} aria-label="Tạo vai trò mới">
            <div className="ffr-card__title">
              <span className="ffr-card__icon"><Plus size={15} aria-hidden="true" /></span>
              <div><h4>Tạo vai trò mới</h4><p>Điền thông tin — bản xem trước cập nhật ngay.</p></div>
            </div>

            <div className="ffr-templates" role="group" aria-label="Mẫu vai trò nhanh">
              <span><Wand2 size={12} aria-hidden="true" /> Mẫu nhanh</span>
              {TEMPLATES.map((template) => (
                <button key={template.id} type="button" onClick={() => applyTemplate(template)} style={{ '--ffr-color': template.color } as CSSProperties}>
                  {template.label}
                </button>
              ))}
            </div>

            <label className="ffr-field">
              <span>Tên vai trò <small>{trimmedName.length}/24</small></span>
              <input
                type="text"
                value={name}
                maxLength={24}
                onChange={(event) => setName(event.target.value.slice(0, 24))}
                placeholder="Ví dụ: Hội đồng học thuật"
                aria-invalid={Boolean(trimmedName) && (!nameValid || duplicate)}
              />
              {duplicate && <em className="ffr-field__error">Đã có vai trò trùng tên.</em>}
            </label>

            <fieldset className="ffr-field">
              <legend>Icon đại diện</legend>
              <div className="ffr-icons" role="radiogroup" aria-label="Chọn icon vai trò">
                {ROLE_ICON_OPTIONS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={icon === id}
                    aria-label={label}
                    title={label}
                    className={icon === id ? 'is-on' : ''}
                    style={{ '--ffr-color': previewColor } as CSSProperties}
                    onClick={() => setIcon(id)}
                  >
                    <Icon size={16} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="ffr-field-row">
              <fieldset className="ffr-field">
                <legend>Màu badge</legend>
                <div className="ffr-swatches" role="radiogroup" aria-label="Chọn màu badge">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      role="radio"
                      aria-checked={color.toLowerCase() === preset}
                      aria-label={`Màu ${preset}`}
                      className={color.toLowerCase() === preset ? 'is-on' : ''}
                      style={{ background: preset }}
                      onClick={() => setColor(preset)}
                    />
                  ))}
                  <label className="ffr-swatches__custom" title="Tự chọn màu">
                    <input
                      type="color"
                      value={previewColor}
                      maxLength={7}
                      onChange={(event) => setColor(event.target.value)}
                      aria-label="Tự chọn màu badge"
                    />
                    <span>{previewColor.toUpperCase()}</span>
                  </label>
                </div>
              </fieldset>

              <fieldset className="ffr-field">
                <legend>Ký tự đặc biệt</legend>
                <div className="ffr-chars" role="radiogroup" aria-label="Chọn ký tự đi kèm tên">
                  {SPECIAL_CHARS.map((char) => (
                    <button
                      key={char}
                      type="button"
                      role="radio"
                      aria-checked={specialChar === char}
                      className={specialChar === char ? 'is-on' : ''}
                      onClick={() => setSpecialChar(char)}
                    >
                      {char}
                    </button>
                  ))}
                  <input
                    type="text"
                    value={specialChar}
                    maxLength={2}
                    onChange={(event) => setSpecialChar(Array.from(event.target.value).slice(0, 2).join(''))}
                    aria-label="Hoặc nhập ký tự riêng (tối đa 2)"
                    className="ffr-chars__input"
                  />
                </div>
              </fieldset>
            </div>

            <fieldset className="ffr-field">
              <legend>Quyền hạn</legend>
              <div className="ffr-perms">
                {ADMIN_PERMISSIONS.map((permission) => {
                  const locked = !ownPermissions.includes(permission);
                  const on = permissions.includes(permission);
                  return (
                    <label key={permission} className={`ffr-perm ${on ? 'is-on' : ''} ${locked ? 'is-locked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={locked}
                        maxLength={1}
                        onChange={() => togglePermission(permission)}
                      />
                      <span className="ffr-perm__box" aria-hidden="true">{locked ? <Lock size={11} /> : on ? <Check size={12} /> : null}</span>
                      <span className="ffr-perm__text">
                        <b>{PERMISSION_META[permission].label} <code>{permission}</code></b>
                        <small>{locked ? 'Bạn không có quyền này nên không thể cấp' : PERMISSION_META[permission].hint}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="ffr-preview" aria-live="polite">
              <span className="ffr-preview__label">Xem trước</span>
              <div className="ffr-preview__row ffr-preview__row--dark">
                <span className="ffr-preview__avatar" aria-hidden="true">NA</span>
                <span className="ffr-preview__who"><b>Nguyễn An</b><small>an.nguyen@truong.edu.vn</small></span>
                <CustomRoleBadge name={trimmedName || 'Tên vai trò'} icon={icon} color={previewColor} specialChar={specialChar} size="md" />
              </div>
              <div className="ffr-preview__row ffr-preview__row--light">
                <CustomRoleBadge name={trimmedName || 'Tên vai trò'} icon={icon} color={previewColor} specialChar={specialChar} size="md" />
                <small>trên nền sáng</small>
              </div>
              <div className="ffr-preview__perms">
                {permissions.length === 0
                  ? <em>Chọn ít nhất 1 quyền</em>
                  : permissions.map((permission) => <span key={permission}>{PERMISSION_META[permission].label}</span>)}
              </div>
            </div>

            <button type="submit" className="ffr-submit" disabled={!formValid || busy}>
              {busy ? <LoaderCircle className="faa-spin" size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
              Tạo vai trò
            </button>
          </form>
        ) : (
          <div className="ffr-card ffr-card--locked">
            <KeyRound size={22} aria-hidden="true" />
            <h4>Chỉ Admin / Super Admin tạo được vai trò</h4>
            <p>Giáo viên và Moderator có công cụ cấm đăng, cảnh cáo, khoá chat nhưng không được cấp hay tạo vai trò.</p>
          </div>
        )}

        <div className="ffr-side">
          <section className="ffr-card ffr-matrix" aria-label="Ma trận phân quyền">
            <div className="ffr-card__title">
              <span className="ffr-card__icon"><ShieldCheck size={15} aria-hidden="true" /></span>
              <div><h4>Ma trận phân quyền</h4><p>Vai trò × quyền — đúng như máy chủ đang áp dụng.</p></div>
            </div>
            <div className="ffr-matrix__scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Vai trò</th>
                    {ADMIN_PERMISSIONS.map((permission) => (
                      <th key={permission} scope="col" title={PERMISSION_META[permission].hint}>{PERMISSION_META[permission].label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixRows.map((row) => (
                    <tr key={row.id}>
                      <th scope="row">
                        {row.custom
                          ? <CustomRoleBadge name={row.custom.name} icon={row.custom.icon} color={row.custom.color} specialChar={row.custom.specialChar} />
                          : <span className="ffr-matrix__builtin" style={{ '--ffr-color': row.tone } as CSSProperties}>{row.label}</span>}
                      </th>
                      {ADMIN_PERMISSIONS.map((permission) => {
                        const allowed = row.permissions.includes(permission);
                        return (
                          <td key={permission} className={allowed ? 'is-yes' : 'is-no'}>
                            {allowed
                              ? <Check size={13} aria-label="Có" />
                              : <Minus size={12} aria-label="Không" />}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="ffr-card ffr-list" aria-label="Vai trò tùy chỉnh đã tạo">
            <div className="ffr-card__title">
              <span className="ffr-card__icon"><Wand2 size={15} aria-hidden="true" /></span>
              <div><h4>Vai trò tùy chỉnh <span className="ffr-count">{roles.length}</span></h4><p>Gán cho thành viên ở tab Thành viên → nút cấp vai trò.</p></div>
            </div>
            {loading && roles.length === 0 ? (
              <div className="faa-loading"><LoaderCircle className="faa-spin" aria-hidden="true" /> Đang tải vai trò…</div>
            ) : roles.length === 0 ? (
              <p className="faa-muted-empty">Chưa có vai trò tùy chỉnh nào. Thử một mẫu nhanh ở form bên cạnh.</p>
            ) : (
              <ul className="ffr-list__items">
                {roles.map((role, index) => {
                  const canDelete = caps.isSuperAdmin || (canCreate && role.createdBy === currentUserEmail.toLowerCase());
                  return (
                    <li key={role.id} style={{ '--i': index } as CSSProperties}>
                      <div className="ffr-list__main">
                        <CustomRoleBadge name={role.name} icon={role.icon} color={role.color} specialChar={role.specialChar} size="md" />
                        <small>{role.memberCount || 0} thành viên đang giữ</small>
                      </div>
                      <div className="ffr-list__perms">
                        {(role.permissions as AdminPermission[]).map((permission) => (
                          <span key={permission}>{PERMISSION_META[permission]?.label || permission}</span>
                        ))}
                      </div>
                      {canDelete && (
                        <button
                          type="button"
                          className="ffr-list__delete"
                          aria-label={`Xoá vai trò ${role.name}`}
                          title="Xoá vai trò"
                          disabled={deleting === role.id}
                          onClick={() => void removeRole(role)}
                        >
                          {deleting === role.id ? <LoaderCircle className="faa-spin" size={14} aria-hidden="true" /> : <Trash2 size={14} aria-hidden="true" />}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
