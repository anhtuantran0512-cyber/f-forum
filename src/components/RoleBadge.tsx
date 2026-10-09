/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useState, useRef, type FC } from 'react';
import { ShieldCheck, Shield, GraduationCap, Crown, CheckCircle } from 'lucide-react';
import { isMasterAdmin } from '../config/admin';

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

interface RoleManagerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { email: string; role: string; staffRole?: string };
  onCreateRole: (name: string, icon: string, color: string, specialChar: string) => Promise<boolean>;
}

export const RoleManager: FC<RoleManagerProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCreateRole,
}) => {
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleIcon, setNewRoleIcon] = useState('shield');
  const [newRoleColor, setNewRoleColor] = useState('#58d7e8');
  const [newRoleSpecialChar, setNewRoleSpecialChar] = useState('★');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isSuperAdmin = isMasterAdmin(currentUser.email) || currentUser.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isOpen) {
      setNewRoleName('');
      setNewRoleIcon('shield');
      setNewRoleColor('#58d7e8');
      setNewRoleSpecialChar('★');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      setError('Vui lòng nhập tên vai trò');
      return;
    }
    if (newRoleName.length > 30) {
      setError('Tên vai trò tối đa 30 ký tự');
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const ok = await onCreateRole(
        newRoleName.trim(),
        newRoleIcon,
        newRoleColor,
        newRoleSpecialChar.slice(0, 2)
      );
      if (ok) {
        setSuccess(`Đã tạo vai trò "${newRoleName}" thành công`);
        setNewRoleName('');
        setTimeout(() => {
          setSuccess(null);
          onClose();
        }, 1500);
      } else {
        setError('Không thể tạo vai trò. Vui lòng thử lại.');
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng kiểm tra mạng.');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen || !isSuperAdmin) return null;

  const iconOptions = [
    { value: 'shield', label: 'Bông hiệu', icon: <ShieldCheck size={16} /> },
    { value: 'crown', label: 'Vương miện', icon: <Crown size={16} /> },
    { value: 'award', label: 'Huy chương', icon: <CheckCircle size={16} /> },
    { value: 'star', label: 'Sao', icon: <span className="text-yellow-400">⭐</span> },
    { value: 'flame', label: 'Lửa', icon: <span className="text-orange-400">🔥</span> },
    { value: 'gem', label: 'Đá quý', icon: <span className="text-purple-400">◆</span> },
    { value: 'bolt', label: 'Tia chớp', icon: <span className="text-yellow-300">⚡</span> },
    { value: 'heart', label: 'Trái tim', icon: <span className="text-rose-400">❤</span> },
  ];

  const colorPresets = [
    '#58d7e8', '#69e4b8', '#c1a4ff', '#f7cb76', '#8db8ff',
    '#fda4af', '#86efac', '#fcd34d', '#a78bfa', '#34d399',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl liquid-glass bg-black/90 border border-white/10 shadow-2xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400/25 to-violet-500/20 border border-amber-400/30 flex items-center justify-center">
              <ShieldCheck size={16} className="text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Quản lý vai trò</h3>
              <p className="text-[10px] text-white/50">Tạo vai trò mới với icon và màu sắc</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-white/70 uppercase tracking-wide mb-1.5">
              Tên vai trò
            </label>
            <input
              type="text"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value.slice(0, 30))}
              placeholder="Ví dụ: Trợ lý học tập"
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50"
              maxLength={30}
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-white/70 uppercase tracking-wide mb-1.5">
              Icon đại diện
            </label>
            <div className="grid grid-cols-4 gap-2">
              {iconOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setNewRoleIcon(opt.value)}
                  className={`flex flex-col items-center gap-1 py-2 px-2 rounded-lg border transition-all ${
                    newRoleIcon === opt.value
                      ? 'border-cyan-400 bg-cyan-400/10 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                      : 'border-white/5 bg-black/20 hover:bg-black/40'
                  }`}
                >
                  {opt.icon}
                  <span className="text-[8px] text-white/60">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-white/70 uppercase tracking-wide mb-1.5">
              Màu sắc đặc trưng
            </label>
            <div className="flex gap-2 flex-wrap">
              {colorPresets.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewRoleColor(color)}
                  className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                    newRoleColor === color ? 'ring-2 ring-white/50 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="color"
                value={newRoleColor}
                onChange={(e) => setNewRoleColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
              />
              <input
                type="text"
                value={newRoleColor}
                onChange={(e) => setNewRoleColor(e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                maxLength={7}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-white/70 uppercase tracking-wide mb-1.5">
              Ký tự đặc biệt
            </label>
            <input
              type="text"
              value={newRoleSpecialChar}
              onChange={(e) => setNewRoleSpecialChar(e.target.value.slice(0, 2))}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50"
              maxLength={2}
              placeholder="★"
            />
            <div className="mt-2 flex gap-1 flex-wrap">
              {['★', '●', '◆', '▲', '❖', '♦', '❤', '⚡', '👑', '🎖'].map((char) => (
                <button
                  key={char}
                  type="button"
                  onClick={() => setNewRoleSpecialChar(char)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all ${
                    newRoleSpecialChar === char
                      ? 'bg-cyan-400/20 border border-cyan-400/50'
                      : 'bg-black/20 border border-white/5 hover:bg-black/40'
                  }`}
                >
                  {char}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-sm">
              {success}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-sm font-semibold transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleCreateRole}
              disabled={isCreating || !newRoleName.trim()}
              className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-sm font-bold shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isCreating ? 'Đang tạo...' : 'Tạo vai trò'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
