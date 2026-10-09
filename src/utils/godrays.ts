/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Bộ preset "godray" (Epic 4 — Settings: preset gradient hài hoà, cảm hứng
 * grainient godrays). Mỗi preset là 2–3 chùm tia radial chồng lớp theo một bảng
 * màu tương đồng/bổ trợ chia đôi, thay vì 1 vệt màu đơn như trước.
 * GIỮ NGUYÊN id + tên để lựa chọn đã lưu của người dùng (fforum_godray_preset) không mất.
 */
export type GodrayMood = 'warm' | 'cool' | 'mystic';

export interface GodrayPreset {
  id: string;
  name: string;
  color: string;
  gradient: string;
  accent: string;
  mood: GodrayMood;
}

export const GODRAY_MOODS: Array<{ id: GodrayMood; label: string }> = [
  { id: 'warm', label: 'Ấm áp' },
  { id: 'cool', label: 'Mát lạnh' },
  { id: 'mystic', label: 'Huyền ảo' },
];

/** Hai chùm tia chính + một quầng phụ — vị trí lệch nhau để ánh sáng có chiều sâu. */
const beams = (
  primary: string,
  primarySoft: string,
  secondary: string,
  tertiary: string,
  origin: [number, number] = [20, 78],
): string => [
  `radial-gradient(ellipse 72% 58% at ${origin[0]}% -12%, ${primary}, ${primarySoft} 42%, transparent 72%)`,
  `radial-gradient(ellipse 52% 42% at ${origin[1]}% -8%, ${secondary}, transparent 70%)`,
  `radial-gradient(ellipse 90% 40% at 50% 112%, ${tertiary}, transparent 72%)`,
].join(', ');

export const GODRAY_PRESETS: GodrayPreset[] = [
  /* ---------- Ấm áp ---------- */
  {
    id: 'godray-gold',
    name: 'Hoàng Kim',
    color: 'from-amber-500/40 via-yellow-400/20 to-transparent',
    gradient: beams('rgba(251, 191, 36, 0.5)', 'rgba(245, 158, 11, 0.18)', 'rgba(244, 114, 182, 0.24)', 'rgba(251, 146, 60, 0.12)'),
    accent: '#f59e0b',
    mood: 'warm',
  },
  {
    id: 'godray-sunset',
    name: 'Hoàng Hôn',
    color: 'from-orange-500/40 via-pink-500/20 to-transparent',
    gradient: beams('rgba(249, 115, 22, 0.48)', 'rgba(219, 39, 119, 0.2)', 'rgba(168, 85, 247, 0.22)', 'rgba(244, 63, 94, 0.14)', [70, 18]),
    accent: '#f97316',
    mood: 'warm',
  },
  {
    id: 'godray-ember',
    name: 'Hổ Phách',
    color: 'from-amber-600/40 via-orange-500/20 to-transparent',
    gradient: beams('rgba(217, 119, 6, 0.5)', 'rgba(239, 68, 68, 0.16)', 'rgba(251, 191, 36, 0.2)', 'rgba(185, 28, 28, 0.14)', [30, 85]),
    accent: '#d97706',
    mood: 'warm',
  },
  {
    id: 'godray-peach',
    name: 'Hồng Đào',
    color: 'from-rose-500/40 via-orange-300/20 to-transparent',
    gradient: beams('rgba(244, 63, 94, 0.42)', 'rgba(251, 146, 60, 0.18)', 'rgba(253, 224, 71, 0.2)', 'rgba(236, 72, 153, 0.12)', [76, 22]),
    accent: '#f43f5e',
    mood: 'warm',
  },
  {
    id: 'godray-solar',
    name: 'Thái Dương',
    color: 'from-yellow-500/40 via-orange-400/20 to-transparent',
    gradient: beams('rgba(234, 179, 8, 0.52)', 'rgba(251, 146, 60, 0.2)', 'rgba(254, 240, 138, 0.22)', 'rgba(249, 115, 22, 0.12)', [50, 12]),
    accent: '#eab308',
    mood: 'warm',
  },
  {
    id: 'godray-ruby',
    name: 'Hồng Ngọc',
    color: 'from-red-600/40 via-pink-600/20 to-transparent',
    gradient: beams('rgba(220, 38, 38, 0.46)', 'rgba(190, 24, 93, 0.2)', 'rgba(251, 113, 133, 0.22)', 'rgba(127, 29, 29, 0.16)', [24, 80]),
    accent: '#dc2626',
    mood: 'warm',
  },
  /* ---------- Mát lạnh ---------- */
  {
    id: 'godray-aurora',
    name: 'Bắc Cực',
    color: 'from-emerald-500/40 via-teal-400/20 to-transparent',
    gradient: beams('rgba(16, 185, 129, 0.46)', 'rgba(45, 212, 191, 0.18)', 'rgba(139, 92, 246, 0.26)', 'rgba(34, 211, 238, 0.12)', [76, 20]),
    accent: '#10b981',
    mood: 'cool',
  },
  {
    id: 'godray-cyber',
    name: 'Lam Điện',
    color: 'from-cyan-500/40 via-blue-500/20 to-transparent',
    gradient: beams('rgba(6, 182, 212, 0.48)', 'rgba(59, 130, 246, 0.2)', 'rgba(99, 102, 241, 0.24)', 'rgba(14, 165, 233, 0.12)', [28, 80]),
    accent: '#06b6d4',
    mood: 'cool',
  },
  {
    id: 'godray-crystal',
    name: 'Pha Lê',
    color: 'from-indigo-400/40 via-sky-300/20 to-transparent',
    gradient: beams('rgba(129, 140, 248, 0.44)', 'rgba(56, 189, 248, 0.18)', 'rgba(233, 213, 255, 0.24)', 'rgba(125, 211, 252, 0.12)', [50, 85]),
    accent: '#818cf8',
    mood: 'cool',
  },
  {
    id: 'godray-ocean',
    name: 'Biển Sâu',
    color: 'from-blue-600/40 via-teal-500/20 to-transparent',
    gradient: beams('rgba(37, 99, 235, 0.48)', 'rgba(20, 184, 166, 0.18)', 'rgba(56, 189, 248, 0.22)', 'rgba(30, 64, 175, 0.18)', [36, 84]),
    accent: '#2563eb',
    mood: 'cool',
  },
  {
    id: 'godray-emerald',
    name: 'Ngọc Lục',
    color: 'from-emerald-600/40 via-lime-400/20 to-transparent',
    gradient: beams('rgba(5, 150, 105, 0.48)', 'rgba(163, 230, 53, 0.16)', 'rgba(52, 211, 153, 0.22)', 'rgba(6, 95, 70, 0.18)', [62, 16]),
    accent: '#059669',
    mood: 'cool',
  },
  {
    id: 'godray-mint',
    name: 'Bạc Hà',
    color: 'from-teal-500/40 via-emerald-300/20 to-transparent',
    gradient: beams('rgba(20, 184, 166, 0.44)', 'rgba(110, 231, 183, 0.18)', 'rgba(125, 211, 252, 0.22)', 'rgba(45, 212, 191, 0.12)', [18, 72]),
    accent: '#14b8a6',
    mood: 'cool',
  },
  /* ---------- Huyền ảo ---------- */
  {
    id: 'godray-cosmic',
    name: 'Vũ Trụ',
    color: 'from-purple-500/40 via-pink-500/20 to-transparent',
    gradient: beams('rgba(168, 85, 247, 0.5)', 'rgba(236, 72, 153, 0.2)', 'rgba(59, 130, 246, 0.24)', 'rgba(124, 58, 237, 0.16)', [48, 84]),
    accent: '#a855f7',
    mood: 'mystic',
  },
  {
    id: 'godray-neon',
    name: 'Neon Tím',
    color: 'from-fuchsia-600/40 via-purple-500/20 to-transparent',
    gradient: beams('rgba(192, 38, 211, 0.5)', 'rgba(139, 92, 246, 0.2)', 'rgba(34, 211, 238, 0.24)', 'rgba(217, 70, 239, 0.14)', [22, 82]),
    accent: '#c026d3',
    mood: 'mystic',
  },
  {
    id: 'godray-midnight',
    name: 'Nửa Đêm',
    color: 'from-indigo-700/40 via-violet-600/20 to-transparent',
    gradient: beams('rgba(67, 56, 202, 0.44)', 'rgba(124, 58, 237, 0.16)', 'rgba(56, 189, 248, 0.14)', 'rgba(30, 27, 75, 0.3)', [64, 14]),
    accent: '#4338ca',
    mood: 'mystic',
  },
  {
    id: 'godray-twilight',
    name: 'Chạng Vạng',
    color: 'from-violet-600/40 via-rose-400/20 to-transparent',
    gradient: beams('rgba(124, 58, 237, 0.46)', 'rgba(251, 113, 133, 0.18)', 'rgba(251, 191, 36, 0.2)', 'rgba(76, 29, 149, 0.18)', [30, 76]),
    accent: '#7c3aed',
    mood: 'mystic',
  },
];
