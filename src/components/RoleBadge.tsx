/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useState, useRef, type FC } from 'react';
import { ShieldCheck, Shield, GraduationCap, Crown } from 'lucide-react';

interface RoleBadgeProps {
  userEmail: string;
  staffRole?: 'MODERATOR' | 'TEACHER' | null;
  isSuperAdmin: boolean;
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  SUPER_ADMIN: <Crown size={14} className="text-amber-300" />,
  MODERATOR: <Shield size={14} className="text-violet-300" />,
  TEACHER: <GraduationCap size={14} className="text-emerald-300" />,
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  MODERATOR: 'Moderator',
  TEACHER: 'Giáo viên',
};

export const RoleBadge: FC<RoleBadgeProps> = ({
  userEmail,
  staffRole,
  isSuperAdmin,
}) => {
  const [visible, setVisible] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  /* Hiển thị badge sau 1.5s khi component mount (tránh flash không cần thiết) */
  useEffect(() => {
    if (!userEmail) return;
    const t = setTimeout(() => {
      setVisible(true);
    }, 1500);
    return () => clearTimeout(t);
  }, [userEmail]);

  /* Xử lý hover tooltip */
  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (isSuperAdmin) {
      setTooltip('Super Admin · Quản trị toàn hệ thống');
    } else if (staffRole === 'MODERATOR') {
      setTooltip('Moderator · Kiểm duyệt nội dung');
    } else if (staffRole === 'TEACHER') {
      setTooltip('Giáo viên · Quản lý học tập');
    } else {
      setTooltip('Thành viên');
    }
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setTooltip(null), 200);
  };

  if (!visible || !userEmail) return null;

  const isAdmin = isSuperAdmin || staffRole === 'MODERATOR' || staffRole === 'TEACHER';
  if (!isAdmin) return null;

  const roleKey = isSuperAdmin ? 'SUPER_ADMIN' : (staffRole || 'STUDENT');
  const icon = ROLE_ICONS[roleKey] || <ShieldCheck size={14} />;
  const label = ROLE_LABELS[roleKey] || 'Nhân sự';

  return (
    <div
      ref={badgeRef}
      className={`fixed z-40 transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      style={{
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full liquid-glass bg-black/80 border border-white/10 shadow-xl cursor-default"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-500/10 border border-amber-400/30 flex items-center justify-center">
          {icon}
        </span>
        <span className="text-[10px] font-bold text-white/90 tracking-wide">{label}</span>
        {tooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-black/95 border border-white/10 shadow-2xl text-[10px] text-white whitespace-nowrap">
            {tooltip}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/95" />
          </div>
        )}
      </div>
    </div>
  );
};
