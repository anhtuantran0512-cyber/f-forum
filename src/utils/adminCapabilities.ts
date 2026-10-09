/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Năng lực quản trị của người dùng hiện tại (Epic 3 — RBAC).
 *
 * - Super Admin / Giáo viên / Moderator: biết ngay từ hồ sơ (không cần gọi mạng).
 * - Vai trò tùy chỉnh: hồ sơ chỉ có ID → hỏi máy chủ qua GET /api/admin/me.
 *
 * App gọi `useAdminCapabilitiesLoader(currentUser)` đúng MỘT lần; mọi component
 * khác đọc qua `useAdminCaps()` (useSyncExternalStore), code ngoài React đọc qua
 * `getAdminCaps()`. Đây chỉ là lớp HIỂN THỊ — máy chủ vẫn kiểm quyền ở từng endpoint.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { authHeaders } from './session';
import {
  ADMIN_PERMISSIONS,
  MODERATION_PERMISSIONS,
  isSuperAdminUser,
  type AdminPermission,
  type CustomRoleDef,
} from './rbac';

export interface AdminCapabilities {
  /** false khi đang chờ máy chủ trả quyền của vai trò tùy chỉnh. */
  ready: boolean;
  isSuperAdmin: boolean;
  staffRole: 'MODERATOR' | 'TEACHER' | null;
  customRoleDef: CustomRoleDef | null;
  permissions: AdminPermission[];
  /** true khi máy chủ từ chối phiên hiện tại (token hết hạn / không hợp lệ / phiên giả). */
  sessionInvalid?: boolean;
}

export const NO_ADMIN_CAPS: AdminCapabilities = Object.freeze({
  ready: true,
  isSuperAdmin: false,
  staffRole: null,
  customRoleDef: null,
  permissions: [],
}) as AdminCapabilities;

interface CapsSource {
  email?: string;
  role?: string;
  staffRole?: string | null;
  customRole?: string | null;
}

/** Quyền suy ra được ngay từ hồ sơ, không cần mạng. */
export function localCapsFor(user: CapsSource | null | undefined): AdminCapabilities {
  if (!user || !user.email) return NO_ADMIN_CAPS;
  if (isSuperAdminUser({ email: user.email, role: user.role })) {
    return { ready: true, isSuperAdmin: true, staffRole: null, customRoleDef: null, permissions: [...ADMIN_PERMISSIONS] };
  }
  if (user.staffRole === 'MODERATOR' || user.staffRole === 'TEACHER') {
    return { ready: true, isSuperAdmin: false, staffRole: user.staffRole, customRoleDef: null, permissions: [...MODERATION_PERMISSIONS] };
  }
  if (user.customRole) {
    return { ready: false, isSuperAdmin: false, staffRole: null, customRoleDef: null, permissions: [] };
  }
  return NO_ADMIN_CAPS;
}

const sanitizePermissions = (value: unknown): AdminPermission[] =>
  Array.isArray(value)
    ? value.filter((permission): permission is AdminPermission =>
      typeof permission === 'string' && (ADMIN_PERMISSIONS as readonly string[]).includes(permission))
    : [];

let snapshot: AdminCapabilities = NO_ADMIN_CAPS;
const listeners = new Set<() => void>();

const emit = (next: AdminCapabilities): void => {
  snapshot = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

const getSnapshot = (): AdminCapabilities => snapshot;

/** Đọc ngoài React (ví dụ trong store) — không đăng ký re-render. */
export const getAdminCaps = (): AdminCapabilities => snapshot;

/** Đọc trong component — tự re-render khi quyền thay đổi. */
export const useAdminCaps = (): AdminCapabilities => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

export const capsHas = (caps: AdminCapabilities, permission: AdminPermission): boolean =>
  caps.permissions.includes(permission);

/** Có quyền mở Bảng quản trị (icon Admin trên menu tia sét — mục 3.2). */
export const capsCanOpenAdminPanel = (caps: AdminCapabilities): boolean =>
  caps.isSuperAdmin
  || Boolean(caps.staffRole)
  || (['ban', 'warn', 'mute', 'give_role', 'view_analytics'] as AdminPermission[]).some((permission) => capsHas(caps, permission));

/** Gọi đúng MỘT lần ở App để đồng bộ quyền theo người dùng đang đăng nhập. */
export function useAdminCapabilitiesLoader(user: CapsSource | null | undefined): void {
  const email = user?.email || '';
  const role = user?.role || '';
  const staffRole = user?.staffRole || '';
  const customRole = user?.customRole || '';

  useEffect(() => {
    const local = localCapsFor(email ? { email, role, staffRole, customRole } : null);
    emit(local);
    /* Mọi phiên TRÔNG có quyền quản trị (Super Admin / GV / Mod / vai trò tùy chỉnh)
       đều phải được máy chủ xác nhận — hồ sơ cục bộ có thể cũ, token có thể hết hạn. */
    const looksAdmin = local.isSuperAdmin || Boolean(local.staffRole) || Boolean(customRole);
    if (!email || !looksAdmin) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/admin/me', { headers: authHeaders() });
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        if (response.status === 401) {
          /* Giữ giao diện quản trị để người dùng THẤY thông báo "đăng nhập lại",
             thay vì lỗi quyền khó hiểu ở từng thao tác. */
          emit({ ...local, ready: true, sessionInvalid: true });
        } else if (response.status === 200 && data?.success) {
          emit({
            ready: true,
            isSuperAdmin: Boolean(data.isSuperAdmin),
            staffRole: data.staffRole === 'MODERATOR' || data.staffRole === 'TEACHER' ? data.staffRole : null,
            customRoleDef: data.customRoleDef && typeof data.customRoleDef === 'object' ? data.customRoleDef as CustomRoleDef : null,
            permissions: sanitizePermissions(data.permissions),
            sessionInvalid: false,
          });
        } else {
          emit(local.ready ? local : NO_ADMIN_CAPS);
        }
      } catch {
        /* Ngoại tuyến: giữ quyền suy ra từ hồ sơ, máy chủ vẫn kiểm khi có mạng lại. */
        if (!cancelled) emit(local.ready ? local : NO_ADMIN_CAPS);
      }
    })();
    return () => { cancelled = true; };
  }, [email, role, staffRole, customRole]);
}
