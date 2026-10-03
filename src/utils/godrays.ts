/* Bản quyền trí tuệ thuộc về BroAmStuck */
export interface GodrayPreset {
  id: string;
  name: string;
  color: string;
  gradient: string;
  accent: string;
}

export const GODRAY_PRESETS: GodrayPreset[] = [
  {
    id: 'godray-gold',
    name: 'Hoàng Kim',
    color: 'from-amber-500/40 via-yellow-400/20 to-transparent',
    gradient: 'radial-gradient(ellipse 80% 60% at 20% -10%, rgba(245, 158, 11, 0.45), rgba(251, 191, 36, 0.15) 45%, transparent 75%)',
    accent: '#f59e0b',
  },
  {
    id: 'godray-aurora',
    name: 'Bắc Cực',
    color: 'from-emerald-500/40 via-teal-400/20 to-transparent',
    gradient: 'radial-gradient(ellipse 80% 60% at 80% -10%, rgba(16, 185, 129, 0.45), rgba(45, 212, 191, 0.15) 50%, transparent 80%)',
    accent: '#10b981',
  },
  {
    id: 'godray-cosmic',
    name: 'Vũ Trụ',
    color: 'from-purple-500/40 via-pink-500/20 to-transparent',
    gradient: 'radial-gradient(ellipse 90% 70% at 50% -20%, rgba(168, 85, 247, 0.5), rgba(236, 72, 153, 0.2) 45%, transparent 75%)',
    accent: '#a855f7',
  },
  {
    id: 'godray-cyber',
    name: 'Lam Điện',
    color: 'from-cyan-500/40 via-blue-500/20 to-transparent',
    gradient: 'radial-gradient(ellipse 85% 65% at 30% -15%, rgba(6, 182, 212, 0.45), rgba(59, 130, 246, 0.18) 50%, transparent 80%)',
    accent: '#06b6d4',
  },
  {
    id: 'godray-sunset',
    name: 'Hoàng Hôn',
    color: 'from-orange-500/40 via-rose-500/20 to-transparent',
    gradient: 'radial-gradient(ellipse 85% 65% at 70% -15%, rgba(249, 115, 22, 0.45), rgba(244, 63, 94, 0.2) 50%, transparent 80%)',
    accent: '#f97316',
  },
  {
    id: 'godray-crystal',
    name: 'Pha Lê',
    color: 'from-indigo-400/30 via-slate-300/20 to-transparent',
    gradient: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(129, 140, 248, 0.35), rgba(203, 213, 225, 0.15) 50%, transparent 80%)',
    accent: '#818cf8',
  },
  {
    id: 'godray-ocean',
    name: 'Biển Sâu',
    color: 'from-blue-600/40 via-cyan-400/20 to-transparent',
    gradient: 'radial-gradient(ellipse 85% 65% at 40% -10%, rgba(37, 99, 235, 0.45), rgba(34, 211, 238, 0.18) 50%, transparent 80%)',
    accent: '#2563eb',
  },
  {
    id: 'godray-emerald',
    name: 'Ngọc Lục',
    color: 'from-emerald-600/40 via-green-400/20 to-transparent',
    gradient: 'radial-gradient(ellipse 80% 60% at 65% -10%, rgba(5, 150, 105, 0.45), rgba(74, 222, 128, 0.18) 50%, transparent 80%)',
    accent: '#059669',
  },
  {
    id: 'godray-ember',
    name: 'Hổ Phách',
    color: 'from-amber-600/40 via-orange-400/20 to-transparent',
    gradient: 'radial-gradient(ellipse 80% 60% at 30% -10%, rgba(217, 119, 6, 0.45), rgba(251, 146, 60, 0.18) 45%, transparent 75%)',
    accent: '#d97706',
  },
  {
    id: 'godray-peach',
    name: 'Hồng Đào',
    color: 'from-rose-500/40 via-orange-300/20 to-transparent',
    gradient: 'radial-gradient(ellipse 85% 65% at 50% -15%, rgba(244, 63, 94, 0.45), rgba(253, 186, 116, 0.18) 45%, transparent 75%)',
    accent: '#f43f5e',
  },
  {
    id: 'godray-neon',
    name: 'Neon Tím',
    color: 'from-fuchsia-600/40 via-purple-400/20 to-transparent',
    gradient: 'radial-gradient(ellipse 90% 70% at 60% -20%, rgba(192, 38, 211, 0.5), rgba(168, 85, 247, 0.2) 45%, transparent 75%)',
    accent: '#c026d3',
  },
  {
    id: 'godray-mint',
    name: 'Bạc Hà',
    color: 'from-teal-500/40 via-emerald-300/20 to-transparent',
    gradient: 'radial-gradient(ellipse 80% 60% at 45% -10%, rgba(20, 184, 166, 0.45), rgba(110, 231, 183, 0.18) 50%, transparent 80%)',
    accent: '#14b8a6',
  },
  {
    id: 'godray-midnight',
    name: 'Nửa Đêm',
    color: 'from-indigo-700/40 via-blue-500/20 to-transparent',
    gradient: 'radial-gradient(ellipse 85% 65% at 50% -15%, rgba(67, 56, 202, 0.45), rgba(59, 130, 246, 0.18) 50%, transparent 80%)',
    accent: '#4338ca',
  },
  {
    id: 'godray-solar',
    name: 'Thái Dương',
    color: 'from-yellow-500/40 via-amber-300/20 to-transparent',
    gradient: 'radial-gradient(ellipse 85% 65% at 50% -10%, rgba(234, 179, 8, 0.5), rgba(252, 211, 77, 0.2) 45%, transparent 75%)',
    accent: '#eab308',
  },
  {
    id: 'godray-twilight',
    name: 'Chạng Vạng',
    color: 'from-violet-600/40 via-rose-400/20 to-transparent',
    gradient: 'radial-gradient(ellipse 85% 65% at 70% -15%, rgba(124, 58, 237, 0.45), rgba(251, 113, 133, 0.2) 50%, transparent 80%)',
    accent: '#7c3aed',
  },
  {
    id: 'godray-ruby',
    name: 'Hồng Ngọc',
    color: 'from-red-600/40 via-pink-400/20 to-transparent',
    gradient: 'radial-gradient(ellipse 85% 65% at 30% -15%, rgba(220, 38, 38, 0.45), rgba(244, 114, 182, 0.18) 50%, transparent 80%)',
    accent: '#dc2626',
  },
];
