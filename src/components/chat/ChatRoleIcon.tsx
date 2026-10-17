/* Chat keeps the legacy export name; the shared role mapping is canonical. */
import { RoleMark, type RoleMarkProps } from '../RoleMark';

export type ChatRoleIconProps = Pick<RoleMarkProps, 'user' | 'isSuperAdmin' | 'size'>;

export function ChatRoleIcon({ user, isSuperAdmin = false, size = 13 }: ChatRoleIconProps) {
  return <RoleMark user={user} isSuperAdmin={isSuperAdmin} size={size} className="ff-chat-role-mark" />;
}
