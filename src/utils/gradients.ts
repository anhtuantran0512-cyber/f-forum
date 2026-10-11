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

/* ── Potator: lớp phủ giúp chữ luôn đọc được trên nền gradient tĩnh ────────────────────────
   Preset chỉ là NỀN; chữ của giao diện vẫn theo theme (trắng/xám sáng ở theme tối, mực tối ở
   theme sáng). Preset sáng (mint, kem…) dưới chữ trắng chỉ còn ~1.1–1.5:1 nên tiêu đề "biến mất".
   potatorScrim() trả về độ đục TỐI THIỂU của lớp phủ cùng tông theme sao cho điểm xấu nhất của
   gradient vẫn đạt ngưỡng WCAG AA cho chữ phụ; preset vốn đã đủ tối/sáng thì được 0 (giữ nguyên). */
type Rgb = [number, number, number];
export const POTATOR_SCRIM = {
  /* Theme tối: chữ phụ nhạt nhất đặt trực tiếp lên nền là neutral-400 (#a3a9b3, độ chói ≈ .394).
     Cần nền ≤ .0487 để đạt 4.5:1 → chọn .045 để còn dư. */
  dark: { color: [5, 8, 14] as Rgb, maxLuminance: 0.045 },
  /* Theme sáng: mực phụ nhạt nhất là --lv-faint (#526075, ≈ .1145) → nền ≥ .690; chọn .71. */
  light: { color: [247, 249, 253] as Rgb, minLuminance: 0.71 },
} as const;

const hexToRgb = (hex: string): Rgb => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) as Rgb;
};
const toLinear = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
/** Độ chói tương đối theo WCAG 2.x (0 = đen, 1 = trắng). */
export const relativeLuminance = ([r, g, b]: readonly [number, number, number]) =>
  0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
/** Pha `from` về phía `to` với độ đục `alpha` — CSS cũng trộn trong không gian sRGB. */
const blend = (from: Rgb, to: readonly number[], alpha: number): Rgb =>
  from.map((v, i) => v + (to[i] - v) * alpha) as Rgb;
/** Màu gradient tại vị trí t ∈ [0,1]; các điểm dừng cách đều (đúng với mọi preset hiện có). */
const colorAt = (stops: Rgb[], t: number): Rgb => {
  if (stops.length < 2) return stops[0];
  const x = t * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  return blend(stops[i], stops[i + 1], x - i);
};
/** Độ đục nhỏ nhất (làm tròn LÊN 0.01) trong [0, 1] thỏa `ok`; `ok` đơn điệu theo alpha. */
const smallestAlpha = (ok: (alpha: number) => boolean) => {
  if (ok(0)) return 0;
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) hi = mid; else lo = mid;
  }
  return Math.min(1, Math.ceil(hi * 100) / 100);
};

export interface PotatorScrim { dark: number; light: number }
const scrimCache = new Map<string, PotatorScrim>();
export function potatorScrim(preset: Pick<GradientPreset, 'id' | 'colors'>): PotatorScrim {
  const cached = scrimCache.get(preset.id);
  if (cached) return cached;
  const stops = preset.colors.map(hexToRgb);
  /* Lấy mẫu dọc gradient: độ chói TỐI THIỂU (dùng cho theme sáng) có thể nằm giữa hai điểm dừng. */
  const samples = Array.from({ length: 21 }, (_, i) => colorAt(stops, i / 20));
  const result: PotatorScrim = {
    dark: smallestAlpha(a =>
      Math.max(...samples.map(c => relativeLuminance(blend(c, POTATOR_SCRIM.dark.color, a)))) <= POTATOR_SCRIM.dark.maxLuminance),
    light: smallestAlpha(a =>
      Math.min(...samples.map(c => relativeLuminance(blend(c, POTATOR_SCRIM.light.color, a)))) >= POTATOR_SCRIM.light.minLuminance),
  };
  scrimCache.set(preset.id, result);
  return result;
}

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
