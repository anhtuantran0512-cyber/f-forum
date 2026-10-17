/* Shared delayed staff marker; visual identity comes from the canonical RoleMark. */
import { useEffect, useState, type FC } from 'react';
import { RoleMark } from './RoleMark';
import { getRoleDetails } from '../utils/roleIdentity';

interface RoleBadgeProps {
  userEmail: string;
  staffRole?: 'MODERATOR' | 'TEACHER' | null;
  isSuperAdmin: boolean;
}

export const RoleBadge: FC<RoleBadgeProps> = ({ userEmail, staffRole, isSuperAdmin }) => {
  const [visible, setVisible] = useState(false);
  const [tooltip, setTooltip] = useState(false);

  useEffect(() => {
    if (!userEmail) return;
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [userEmail]);

  const details = getRoleDetails({ staffRole }, isSuperAdmin);
  if (!visible || !userEmail || !details) return null;

  return (
    <div className="fixed z-40 transition-all duration-300 opacity-100 translate-y-0" style={{ bottom: '24px', left: '50%', transform: 'translateX(-50%)' }}>
      <div
        className="relative flex items-center gap-2 px-3 py-1.5 rounded-full liquid-glass bg-black/80 border border-white/10 shadow-xl cursor-default"
        onMouseEnter={() => setTooltip(true)}
        onMouseLeave={() => setTooltip(false)}
      >
        <RoleMark user={{ staffRole }} isSuperAdmin={isSuperAdmin} size={13} />
        <span className="text-[10px] font-bold text-white/90 tracking-wide">{details.label}</span>
        {tooltip && <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-black/95 border border-white/10 shadow-2xl text-[10px] text-white whitespace-nowrap">{details.description}</span>}
      </div>
    </div>
  );
};
