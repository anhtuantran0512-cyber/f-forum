/* Shared color-theory palette. IDs are stable storage keys; no marketing names. */
export type GradientGroup = 'analogous' | 'complementary' | 'monochrome' | 'neutral';
export interface GradientPreset {
  id: string;
  group: GradientGroup;
  colors: readonly string[];
  css: string;
}
export const GRADIENT_GROUPS: { id: GradientGroup; label: string }[] = [
  { id: 'analogous', label: 'Màu liền kề' },
  { id: 'complementary', label: 'Màu tương phản' },
  { id: 'monochrome', label: 'Đơn sắc' },
  { id: 'neutral', label: 'Trung tính / sáng' },
];
export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: '01', group: 'analogous', colors: ['#667EEA', '#764BA2'], css: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)' },
  { id: '02', group: 'analogous', colors: ['#4FACFE', '#00F2FE'], css: 'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)' },
  { id: '03', group: 'analogous', colors: ['#43E97B', '#38F9D7'], css: 'linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)' },
  { id: '04', group: 'analogous', colors: ['#FA709A', '#FEE140'], css: 'linear-gradient(135deg, #FA709A 0%, #FEE140 100%)' },
  { id: '05', group: 'complementary', colors: ['#FF9A8B', '#A18CD1'], css: 'linear-gradient(135deg, #FF9A8B 0%, #A18CD1 100%)' },
  { id: '06', group: 'complementary', colors: ['#F6D365', '#FDA085'], css: 'linear-gradient(135deg, #F6D365 0%, #FDA085 100%)' },
  { id: '07', group: 'complementary', colors: ['#30CFD0', '#330867'], css: 'linear-gradient(135deg, #30CFD0 0%, #330867 100%)' },
  { id: '08', group: 'monochrome', colors: ['#2C3E50', '#4CA1AF'], css: 'linear-gradient(135deg, #2C3E50 0%, #4CA1AF 100%)' },
  { id: '09', group: 'monochrome', colors: ['#0F2027', '#203A43', '#2C5364'], css: 'linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)' },
  { id: '10', group: 'monochrome', colors: ['#434343', '#000000'], css: 'linear-gradient(135deg, #434343 0%, #000000 100%)' },
  { id: '11', group: 'neutral', colors: ['#E0EAFC', '#CFDEF3'], css: 'linear-gradient(135deg, #E0EAFC 0%, #CFDEF3 100%)' },
  { id: '12', group: 'neutral', colors: ['#FDFCFB', '#E2D1C3'], css: 'linear-gradient(135deg, #FDFCFB 0%, #E2D1C3 100%)' },
];

export const getGradient = (id: string) => GRADIENT_PRESETS.find(p => p.id === id) || GRADIENT_PRESETS[0];

/* Preserve saved choices from older versions without exposing their old names in the UI. */
const oldGodray: Record<string, string> = {
  'godray-gold': '06', 'godray-sunset': '05', 'godray-ember': '06',
  'godray-peach': '04', 'godray-solar': '06', 'godray-ruby': '05',
  'godray-aurora': '03', 'godray-cyber': '02', 'godray-crystal': '01',
  'godray-ocean': '02', 'godray-emerald': '03', 'godray-mint': '03',
  'godray-cosmic': '01', 'godray-neon': '01', 'godray-midnight': '09',
  'godray-twilight': '05',
};
export const resolveGodrayId = (stored: string | null | undefined) =>
  (stored && (oldGodray[stored] || (GRADIENT_PRESETS.some(g => g.id === stored && g.id !== '10') ? stored : null))) || '06';
export const resolvePotatorId = (stored: string | null | undefined) =>
  (stored && ({ gunmetal: '09', aurora: '07', void: '10' }[stored] ||
    (GRADIENT_PRESETS.some(g => g.id === stored) ? stored : null))) || '09';

const oldProfileGradients = [
  'linear-gradient(120deg, rgba(245,158,11,0.38), rgba(167,139,250,0.28), rgba(34,211,238,0.32))',
  'linear-gradient(120deg, rgba(6,182,212,0.42), rgba(59,130,246,0.35), rgba(16,185,129,0.28))',
  'linear-gradient(120deg, rgba(244,63,94,0.42), rgba(249,115,22,0.32), rgba(168,85,247,0.3))',
  'linear-gradient(120deg, rgba(16,185,129,0.42), rgba(20,184,166,0.35), rgba(234,179,8,0.25))',
  'linear-gradient(120deg, rgba(139,92,246,0.45), rgba(236,72,153,0.35), rgba(56,189,248,0.3))',
  'linear-gradient(120deg, rgba(234,179,8,0.45), rgba(217,119,6,0.35), rgba(15,23,42,0.85))',
];
export const resolveProfileGradientId = (stored: string | null | undefined) => {
  const match = GRADIENT_PRESETS.find(g => g.id !== '10' && (g.id === stored || g.css === stored));
  if (match) return match.id;
  const index = oldProfileGradients.indexOf(stored || '');
  return index >= 0 ? ['06', '02', '05', '03', '01', '09'][index] : '01';
};
