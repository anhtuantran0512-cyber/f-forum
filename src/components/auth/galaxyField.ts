/* Galaxy Reveal · dữ liệu thuần để canvas chỉ vẽ, không tạo hàng trăm DOM node. */
export interface GalaxyStar {
  x: number;
  y: number;
  radius: number;
  period: number;
  phase: number;
  drift: number;
  depth: number;
  warm: boolean;
  sparkle: boolean;
}

export const GALAXY_SMALL_STARS = 190;
export const GALAXY_NEAR_STARS = 18;
export const GALAXY_LITE_STARS = 60;

export function createGalaxyStars(random: () => number = Math.random): GalaxyStar[] {
  return Array.from({ length: GALAXY_SMALL_STARS + GALAXY_NEAR_STARS }, (_, index) => {
    const near = index >= GALAXY_SMALL_STARS;
    return {
      x: random(), y: random(),
      radius: near ? 1.5 + random() * .5 : .5 + random() * .5,
      period: 2 + random() * 3,
      phase: random() * Math.PI * 2,
      drift: (random() - .5) * .28,
      depth: near ? 14 : 5,
      warm: random() < .24,
      sparkle: near && index % 4 === 0,
    };
  });
}

export const galaxyDpr = (value: number) => Math.min(1.5, Math.max(1, value || 1));
export const nextShootingDelay = (random: () => number = Math.random) => 8000 + random() * 7000;

// Single CSS box-shadow field for Lite: no canvas, no 60 independent elements.
export function liteGalaxyShadow(count = GALAXY_LITE_STARS): string {
  let seed = 9187;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  return Array.from({ length: count }, () => {
    const x = (random() * 100).toFixed(2);
    const y = (random() * 100).toFixed(2);
    return `${x}vw ${y}vh 0 ${random() > .83 ? '1px' : '0'} rgba(255,244,224,${(.4 + random() * .5).toFixed(2)})`;
  }).join(',');
}
