/* Một hình nón vô hạn về mặt tương tác: kéo tới mép viewport thay vì dừng ở con trỏ.
 * w(d) = khẩu độ/2 + tan(nửa góc mở) × d; hai mép = tâm tia ± pháp tuyến × w(d).
 * Cùng một đa giác được dùng cho lớp sáng và clip ký tự mật khẩu.
 */
export type Point = { x: number; y: number };
export function flashlightCone(source: Point, target: Point, reach: number, aperture = 10, halfAngle = Math.PI / 11): Point[] {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const nx = -uy;
  const ny = ux;
  const far = aperture / 2 + Math.tan(halfAngle) * reach;
  return [
    { x: source.x + nx * aperture / 2, y: source.y + ny * aperture / 2 },
    { x: source.x - nx * aperture / 2, y: source.y - ny * aperture / 2 },
    { x: source.x + ux * reach - nx * far, y: source.y + uy * reach - ny * far },
    { x: source.x + ux * reach + nx * far, y: source.y + uy * reach + ny * far },
  ];
}
/* SVG đèn hướng trái ở 0°, quay quanh chính đầu phát sáng. Góc chuẩn hoá
 * [-180, 180] để không nhảy một vòng khi con trỏ cắt đường ngang bên trái. */
export function torchAimDegrees(source: Point, target: Point): number {
  if (source.x === target.x && source.y === target.y) return 0;
  const angle = Math.atan2(target.y - source.y, target.x - source.x) * 180 / Math.PI - 180;
  return angle < -180 ? angle + 360 : angle;
}
export function continuousTorchAngle(previous: number, next: number): number {
  // Pick the nearest equivalent rotation so crossing ±180° never spins a full turn.
  return previous + (((next - previous + 540) % 360) - 180);
}
export function conePolygon(points: Point[], offset: Point = { x: 0, y: 0 }): string {
  return `polygon(${points.map(p => `${(p.x - offset.x).toFixed(1)}px ${(p.y - offset.y).toFixed(1)}px`).join(', ')})`;
}
