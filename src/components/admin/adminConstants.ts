/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Hằng số & hàm thuần dùng chung cho Bảng quản trị (Epic 3). Tách khỏi file
 * component để Fast Refresh hoạt động đúng (react/only-export-components).
 */
import {
  Crown,
  Flame,
  Gem,
  GraduationCap,
  Heart,
  Shield,
  Sparkles,
  Star,
  Swords,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/** Đúng 4 mốc theo spec (mục 3.4); máy chủ có whitelist tương ứng trong MODERATION_DURATIONS_MIN. */
export const QUICK_DURATIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 1440, label: '1 ngày' },
  { value: 4320, label: '3 ngày' },
  { value: 10080, label: '1 tuần' },
  { value: 0, label: 'Vĩnh viễn' },
];

/** Bộ icon vai trò — khớp whitelist CUSTOM_ROLE_ICONS phía máy chủ. */
export const ROLE_ICON_OPTIONS: ReadonlyArray<{ id: string; label: string; Icon: LucideIcon }> = [
  { id: 'shield', label: 'Khiên', Icon: Shield },
  { id: 'graduation-cap', label: 'Mũ tốt nghiệp', Icon: GraduationCap },
  { id: 'star', label: 'Ngôi sao', Icon: Star },
  { id: 'zap', label: 'Tia sét', Icon: Zap },
  { id: 'crown', label: 'Vương miện', Icon: Crown },
  { id: 'sparkles', label: 'Lấp lánh', Icon: Sparkles },
  { id: 'heart', label: 'Trái tim', Icon: Heart },
  { id: 'swords', label: 'Song kiếm', Icon: Swords },
  { id: 'gem', label: 'Đá quý', Icon: Gem },
  { id: 'flame', label: 'Ngọn lửa', Icon: Flame },
];

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Màu badge an toàn: chỉ nhận mã hex, sai định dạng thì về cyan mặc định. */
export const safeRoleColor = (color: string | undefined): string => (color && HEX_RE.test(color) ? color : '#58d7e8');

/** Làm tròn trần về số "đẹp" để vạch lưới dễ đọc (1, 2, 2.5, 5, 10 × 10^n). */
export const niceCeiling = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const base = 10 ** exponent;
  const fraction = value / base;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return niceFraction * base;
};

/**
 * Đường cong monotone cubic (Fritsch–Carlson, giống d3.curveMonotoneX):
 * mượt như Bezier nhưng không "vọt" quá điểm dữ liệu — số liệu 0 vẫn nằm đúng đáy.
 */
export const monotonePath = (xs: number[], ys: number[]): string => {
  const n = xs.length;
  if (n === 0) return '';
  const fmt = (value: number) => Number(value.toFixed(2));
  if (n === 1) return `M${fmt(xs[0])},${fmt(ys[0])}`;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let index = 0; index < n - 1; index += 1) {
    dx[index] = xs[index + 1] - xs[index];
    slope[index] = dx[index] === 0 ? 0 : (ys[index + 1] - ys[index]) / dx[index];
  }
  const tangent: number[] = new Array(n).fill(0);
  tangent[0] = slope[0];
  tangent[n - 1] = slope[n - 2];
  for (let index = 1; index < n - 1; index += 1) {
    if (slope[index - 1] * slope[index] <= 0) {
      tangent[index] = 0;
    } else {
      const w1 = 2 * dx[index] + dx[index - 1];
      const w2 = dx[index] + 2 * dx[index - 1];
      tangent[index] = (w1 + w2) / (w1 / slope[index - 1] + w2 / slope[index]);
    }
  }
  let d = `M${fmt(xs[0])},${fmt(ys[0])}`;
  for (let index = 0; index < n - 1; index += 1) {
    const third = dx[index] / 3;
    d += ` C${fmt(xs[index] + third)},${fmt(ys[index] + tangent[index] * third)}`
      + ` ${fmt(xs[index + 1] - third)},${fmt(ys[index + 1] - tangent[index + 1] * third)}`
      + ` ${fmt(xs[index + 1])},${fmt(ys[index + 1])}`;
  }
  return d;
};

/** Chia vòng tròn thành các cung liên tiếp (độ dài + điểm bắt đầu) — hàm thuần, không gán lại biến trong render. */
export const donutArcs = <T extends { value: number }>(
  segments: T[],
  circumference: number,
  gap: number,
): Array<T & { visible: number; offset: number }> => {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  const lengths = segments.map((segment) => (total > 0 ? (Math.max(0, segment.value) / total) * circumference : 0));
  return segments.map((segment, index) => ({
    ...segment,
    visible: Math.max(0, lengths[index] - gap),
    offset: lengths.slice(0, index).reduce((sum, length) => sum + length, 0),
  }));
};
