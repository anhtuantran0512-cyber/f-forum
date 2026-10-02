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
];
