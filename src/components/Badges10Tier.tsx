/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useId, useMemo } from 'react';
import { TIER_CONFIGS, getTierForLevel } from '../utils/tier';

/* ==========================================================================
   "TRE VIỆT" — BỘ ICON RANK 8 BẬC PHONG CÁCH CARTOON
   --------------------------------------------------------------------------
   Ngôn ngữ tạo hình: sticker huy hiệu tròn, viền mực dày, màu phẳng nhiều lớp,
   nhân vật măng/tre có mắt, miệng và má hồng. Không dùng emoji trong hình.
   Tiến hóa: Măng Non → Măng Vươn → Tre Non → Tre Vươn Mình → Tre Trưởng Thành
             → Bụi Tre → Lũy Tre Làng → Lũy Tre Cổ Thụ.
   ========================================================================== */

const LIGHT: Record<number, string> = {
  1: '#d9fbe5',
  2: '#d9fbe5',
  3: '#d9fbe5',
  4: '#d9f3ff',
  5: '#d9f3ff',
  6: '#ede9fe',
  7: '#f3e8ff',
  8: '#fef3c7',
};

interface RankPalette {
  deep: string;
  ink: string;
  plate: string;
  blush: string;
}

const PALETTE: Record<number, RankPalette> = {
  1: { deep: '#15803d', ink: '#08251a', plate: '#071f16', blush: '#fb7185' },
  2: { deep: '#15803d', ink: '#08251a', plate: '#071f16', blush: '#fb7185' },
  3: { deep: '#0f766e', ink: '#062a24', plate: '#071f1c', blush: '#fb7185' },
  4: { deep: '#0369a1', ink: '#062636', plate: '#061b27', blush: '#fda4af' },
  5: { deep: '#0e7490', ink: '#052a33', plate: '#051e26', blush: '#fda4af' },
  6: { deep: '#6d28d9', ink: '#1b1038', plate: '#120b27', blush: '#f0abfc' },
  7: { deep: '#7e22ce', ink: '#23103b', plate: '#170a29', blush: '#f0abfc' },
  8: { deep: '#b45309', ink: '#3a2203', plate: '#241703', blush: '#fdba74' },
};

const tierAnimClass = (tier: number): string => {
  if (tier <= 3) return 'badge-tier-1-3';
  if (tier <= 5) return 'badge-tier-4-5';
  if (tier === 6) return 'badge-tier-6';
  if (tier === 7) return 'badge-tier-7';
  return 'badge-tier-8';
};

interface MedallionProps {
  tier: number;
  size?: number;
  color: string;
  light: string;
  ornate?: 'plain' | 'ring' | 'diamond';
  render: (prefix: string) => React.ReactNode;
}

const gemPoint = (angle: number, radius: number): { x: number; y: number } => {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: 30 + Math.cos(rad) * radius, y: 30 + Math.sin(rad) * radius };
};

const Medallion: React.FC<MedallionProps> = ({ tier, size = 28, color, light, ornate = 'plain', render }) => {
  const rawId = useId();
  const uid = useMemo(() => `ffr${tier}-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`, [tier, rawId]);
  const g = (name: string) => `${uid}-${name}`;
  const pal = PALETTE[tier] || PALETTE[1];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      data-rank-tier={tier}
      role="img"
      aria-hidden="true"
      className={`ff-rank-icon ${tierAnimClass(tier)} transition-transform duration-300 hover:scale-110`}
    >
      <defs>
        <linearGradient id={g('glyph')} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={light} />
          <stop offset="52%" stopColor={color} />
          <stop offset="100%" stopColor={light} />
        </linearGradient>
        <linearGradient id={g('rim')} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={light} />
          <stop offset="36%" stopColor={color} />
          <stop offset="100%" stopColor={pal.deep} />
        </linearGradient>
        <radialGradient id={g('bg')} cx="50%" cy="34%" r="70%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="52%" stopColor={pal.plate} stopOpacity="1" />
          <stop offset="100%" stopColor="#04070c" stopOpacity="1" />
        </radialGradient>
        <linearGradient id={g('body')} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={light} stopOpacity="0.55" />
          <stop offset="34%" stopColor={color} stopOpacity="0" />
          <stop offset="76%" stopColor={pal.deep} stopOpacity="0.34" />
          <stop offset="100%" stopColor={pal.ink} stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Huy hiệu tròn: vành ngoài dày + mặt trong tối để nhân vật nổi khối */}
      <circle cx="30" cy="30" r="27.6" fill={`url(#${g('rim')})`} stroke={pal.ink} strokeWidth="1.7" />
      <circle cx="30" cy="30" r="24.6" fill={`url(#${g('bg')})`} stroke={pal.ink} strokeWidth="1" />
      <circle cx="30" cy="30" r="25.3" stroke={light} strokeWidth="0.55" opacity="0.5" />

      {ornate === 'plain' && (
        <>
          <circle cx="30" cy="30" r="23.2" stroke={light} strokeWidth="0.6" strokeDasharray="1.6 2.6" opacity="0.34" />
          {[0, 90, 180, 270].map((angle) => {
            const pt = gemPoint(angle, 26.4);
            return <circle key={angle} cx={pt.x} cy={pt.y} r="1" fill={light} opacity="0.85" />;
          })}
        </>
      )}

      {ornate === 'ring' && (
        <>
          <circle cx="30" cy="30" r="25.1" stroke={pal.ink} strokeWidth="1.5" opacity="0.55" />
          <circle cx="30" cy="30" r="23.1" stroke={light} strokeWidth="0.7" strokeDasharray="3 2" opacity="0.42" />
          {[0, 90, 180, 270].map((angle) => {
            const pt = gemPoint(angle, 26);
            return (
              <polygon
                key={angle}
                points={`${pt.x},${pt.y - 2.3} ${pt.x + 1.7},${pt.y} ${pt.x},${pt.y + 2.3} ${pt.x - 1.7},${pt.y}`}
                fill={light}
                stroke={pal.ink}
                strokeWidth="0.55"
              />
            );
          })}
        </>
      )}

      {ornate === 'diamond' && (
        <>
          <circle cx="30" cy="30" r="25.2" stroke={pal.ink} strokeWidth="1.6" opacity="0.6" />
          <circle cx="30" cy="30" r="23" stroke={light} strokeWidth="0.75" strokeDasharray="2 2" opacity="0.5" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
            const pt = gemPoint(angle, 26);
            const big = angle % 90 === 0;
            return (
              <polygon
                key={angle}
                points={`${pt.x},${pt.y - (big ? 2.7 : 2)} ${pt.x + (big ? 1.9 : 1.5)},${pt.y} ${pt.x},${pt.y + (big ? 2.7 : 2)} ${pt.x - (big ? 1.9 : 1.5)},${pt.y}`}
                fill={light}
                stroke={pal.ink}
                strokeWidth="0.6"
              />
            );
          })}
          <circle cx="30" cy="30" r="22.2" stroke={light} strokeWidth="0.45" opacity="0.22" />
        </>
      )}

      {render(uid)}

      {/* Vệt sáng cong trên mặt huy hiệu tạo cảm giác sticker bóng */}
      <path d="M12.2 14.6 A 21.8 21.8 0 0 1 30 6.8" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.22" />
      <path d="M47.6 46.2 A 19.6 19.6 0 0 1 37.6 51.8" stroke={pal.ink} strokeWidth="2" strokeLinecap="round" opacity="0.16" />
    </svg>
  );
};

/* ── Nguyên liệu tạo hình dùng chung ─────────────────────────────────────── */

interface LeafProps {
  x: number;
  y: number;
  rot?: number;
  flip?: 1 | -1;
  scale?: number;
  c: string;
  l: string;
  ink: string;
}

const RankLeaf: React.FC<LeafProps> = ({ x, y, rot = 0, flip = 1, scale = 1, c, l, ink }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip * scale} ${scale})`}>
    <g className="ff-rank-leaf">
      <path
        d="M0 0C-4.4-5-11.6-5.8-16-1.4C-11 3-4.2 3.4 0 0Z"
        fill={c}
        stroke={ink}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M-1.4-0.5C-5.4-3.2-10.4-3.6-14.2-1.8C-10.2-0.6-5.4 0.2-1.4-0.5Z" fill={l} opacity="0.4" />
      <path
        d="M-1.6-0.2C-6-1.4-10.4-1.2-13.6-0.2"
        stroke={l}
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path d="M-0.6 0.2C-4.4 1.2-8 1.4-11.4 1" stroke={ink} strokeWidth="0.5" strokeLinecap="round" opacity="0.35" />
    </g>
  </g>
);

interface FaceProps {
  x: number;
  y: number;
  ink: string;
  blush: string;
  mood?: 'smile' | 'grin';
}

const RankFace: React.FC<FaceProps> = ({ x, y, ink, blush, mood = 'smile' }) => (
  <g className="ff-rank-face">
    <ellipse cx={x - 2.6} cy={y} rx="1.55" ry="2.05" fill={ink} />
    <ellipse cx={x + 2.6} cy={y} rx="1.55" ry="2.05" fill={ink} />
    <circle cx={x - 3.1} cy={y - 0.7} r="0.48" fill="#ffffff" />
    <circle cx={x + 2.1} cy={y - 0.7} r="0.48" fill="#ffffff" />
    <path
      d={
        mood === 'grin'
          ? `M${x - 2.3} ${y + 3.2} Q${x} ${y + 5.7} ${x + 2.3} ${y + 3.2}`
          : `M${x - 2} ${y + 3.3} Q${x} ${y + 5} ${x + 2} ${y + 3.3}`
      }
      stroke={ink}
      strokeWidth="1.1"
      strokeLinecap="round"
      fill="none"
    />
    <ellipse cx={x - 5.2} cy={y + 2.4} rx="1.8" ry="1" fill={blush} opacity="0.55" />
    <ellipse cx={x + 5.2} cy={y + 2.4} rx="1.8" ry="1" fill={blush} opacity="0.55" />
  </g>
);

interface CulmProps {
  x: number;
  top: number;
  bottom: number;
  width: number;
  nodes: number[];
  c: string;
  l: string;
  deep: string;
  ink: string;
  alt?: boolean;
  children?: React.ReactNode;
}

const Culm: React.FC<CulmProps> = ({ x, top, bottom, width, nodes, c, l, deep, ink, alt = false, children }) => {
  const left = x - width / 2;
  const height = bottom - top;
  return (
    <g className={alt ? 'ff-rank-sway ff-rank-sway--alt' : 'ff-rank-sway'}>
      <rect x={left} y={top} width={width} height={height} rx={width / 2} fill={c} stroke={ink} strokeWidth="1.55" />
      <rect
        x={left + width * 0.18}
        y={top + 2.2}
        width={Math.max(1.2, width * 0.17)}
        height={Math.max(2, height - 4.4)}
        rx={width * 0.08}
        fill={l}
        opacity="0.5"
      />
      <rect
        x={left + width * 0.71}
        y={top + 2.4}
        width={Math.max(1, width * 0.15)}
        height={Math.max(2, height - 4.8)}
        rx={width * 0.07}
        fill={deep}
        opacity="0.5"
      />
      {nodes.map((y) => (
        <g key={y}>
          <rect x={left - 0.5} y={y - 0.9} width={width + 1} height="1.8" rx="0.9" fill={l} stroke={ink} strokeWidth="0.5" />
          <path d={`M${left + 0.4} ${y + 1.7} Q${x} ${y + 2.3} ${left + width - 0.4} ${y + 1.7}`} stroke={deep} strokeWidth="0.7" fill="none" opacity="0.6" />
        </g>
      ))}
      {children}
    </g>
  );
};

const Soil: React.FC<{ y: number; ink: string }> = ({ y, ink }) => (
  <g>
    <path
      d={`M15 ${y} Q19 ${y - 4.4} 30 ${y - 4.8} Q41 ${y - 4.4} 45 ${y} Q38 ${y + 3.6} 30 ${y + 3.8} Q22 ${y + 3.6} 15 ${y}Z`}
      fill="#6b4423"
      stroke={ink}
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path d={`M19 ${y - 1.2} Q24 ${y - 3.2} 30 ${y - 3.4}`} stroke="#d6a46a" strokeWidth="0.9" strokeLinecap="round" fill="none" opacity="0.55" />
    <path d={`M25 ${y + 1.4} Q30 ${y + 3} 35 ${y + 1.2}`} stroke="#2f1c0c" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.4" />
  </g>
);

const Sparkle: React.FC<{ x: number; y: number; r?: number; p: string }> = ({ x, y, r = 3, p }) => (
  <path
    d={`M${x} ${y - r} L${x + r * 0.28} ${y - r * 0.28} L${x + r} ${y} L${x + r * 0.28} ${y + r * 0.28} L${x} ${y + r} L${x - r * 0.28} ${y + r * 0.28} L${x - r} ${y} L${x - r * 0.28} ${y - r * 0.28}Z`}
    fill={`url(#${p}-glyph)`}
    opacity="0.95"
  />
);

interface GlyphProps {
  p: string;
  c: string;
  l: string;
  deep: string;
  ink: string;
}

/* ── Cấp 1 — Măng Non ────────────────────────────────────────────────────── */

const GlyphSprout: React.FC<GlyphProps> = ({ c, l, deep, ink, p }) => (
  <>
    <Soil y={45} ink={ink} />
    <g className="ff-rank-sway">
      <path
        d="M30 15.2C25.2 20.2 22.8 30.4 23.4 43.2Q30 46.4 36.6 43.2C37.2 30.4 34.8 20.2 30 15.2Z"
        fill={c}
        stroke={ink}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M30 15.2C33.2 21 34.8 30 34.2 43.1Q32.2 44.6 30 44.8Z"
        fill={deep}
        opacity="0.32"
      />
      <path d="M24.6 38.8Q30 35.4 35.4 38.8" stroke={l} strokeWidth="1.35" strokeLinecap="round" fill="none" />
      <path d="M25.2 32.4Q30 28.8 34.8 32.2" stroke={l} strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M26.4 26.2Q30 23.4 33.6 26.2" stroke={l} strokeWidth="1.1" strokeLinecap="round" fill="none" />
      <path d="M29 18.8Q28 27 28.4 37.6" stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" opacity="0.4" />
      <RankFace x={30} y={33.4} ink={ink} blush={PALETTE[1].blush} />
    </g>
    <RankLeaf x={24.4} y={27.6} rot={-24} scale={0.82} c={c} l={l} ink={ink} />
    <RankLeaf x={35.6} y={24.4} rot={-18} flip={-1} scale={0.9} c={c} l={l} ink={ink} />
    <path d="M23.2 44.2Q20.2 40.4 17.8 41.6" stroke={ink} strokeWidth="1.3" strokeLinecap="round" fill="none" />
    <path d="M36.8 44.2Q39.8 40.6 42.2 41.8" stroke={ink} strokeWidth="1.3" strokeLinecap="round" fill="none" />
    <ellipse cx="30" cy="12.4" rx="1.9" ry="2.4" fill={l} stroke={ink} strokeWidth="0.9" />
    <circle cx="29.4" cy="11.8" r="0.55" fill="#ffffff" opacity="0.9" />
    <Sparkle x={42.6} y={17.2} r={2.2} p={p} />
  </>
);

/* ── Cấp 2 — Măng Vươn ───────────────────────────────────────────────────── */

const GlyphTwinLeaves: React.FC<GlyphProps> = ({ c, l, deep, ink, p }) => (
  <>
    <Soil y={45.4} ink={ink} />
    <RankLeaf x={30} y={18.6} rot={-38} scale={1.12} c={c} l={l} ink={ink} />
    <RankLeaf x={30} y={18.6} rot={-38} flip={-1} scale={1.12} c={c} l={l} ink={ink} />
    <g className="ff-rank-sway">
      <path
        d="M30 10.6C26.4 16.6 24.6 28 24.8 43.4Q30 46.2 35.2 43.4C35.4 28 33.6 16.6 30 10.6Z"
        fill={c}
        stroke={ink}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M30 10.6C33.2 17 34.6 28 34.2 43.3Q32.2 44.8 30 45Z" fill={deep} opacity="0.3" />
      <path d="M24.8 40.4Q30 36.8 35.2 40.4" stroke={l} strokeWidth="1.35" strokeLinecap="round" fill="none" />
      <path d="M25.2 34Q30 30.4 34.8 34" stroke={l} strokeWidth="1.25" strokeLinecap="round" fill="none" />
      <path d="M25.8 27.6Q30 24.4 34.2 27.6" stroke={l} strokeWidth="1.15" strokeLinecap="round" fill="none" />
      <path d="M26.8 21.4Q30 18.8 33.2 21.4" stroke={l} strokeWidth="1.05" strokeLinecap="round" fill="none" />
      <RankFace x={30} y={31.6} ink={ink} blush={PALETTE[2].blush} mood="grin" />
    </g>
    <RankLeaf x={26.2} y={36.4} rot={12} scale={0.7} c={c} l={l} ink={ink} />
    <path d="M22.4 44.6Q19.8 40.8 17.4 42" stroke={ink} strokeWidth="1.25" strokeLinecap="round" fill="none" />
    <path d="M37.6 44.6Q40.2 41 42.6 42.2" stroke={ink} strokeWidth="1.25" strokeLinecap="round" fill="none" />
    <Sparkle x={45} y={22} r={2.4} p={p} />
    <Sparkle x={14.6} y={30} r={1.7} p={p} />
  </>
);

/* ── Cấp 3 — Tre Non ─────────────────────────────────────────────────────── */

const GlyphTriLeaf: React.FC<GlyphProps> = ({ c, l, deep, ink, p }) => (
  <>
    <Soil y={46} ink={ink} />
    <RankLeaf x={30} y={13.8} rot={-38} scale={0.98} c={c} l={l} ink={ink} />
    <RankLeaf x={30} y={13.8} rot={-38} flip={-1} scale={0.98} c={c} l={l} ink={ink} />
    <RankLeaf x={30} y={18.2} rot={-12} scale={0.86} c={c} l={l} ink={ink} />
    <RankLeaf x={30} y={18.2} rot={-12} flip={-1} scale={0.86} c={c} l={l} ink={ink} />
    <Culm x={30} top={12.4} bottom={46} width={8} nodes={[21.4, 30.4, 39.4]} c={c} l={l} deep={deep} ink={ink}>
      <RankFace x={30} y={26} ink={ink} blush={PALETTE[3].blush} />
    </Culm>
    <RankLeaf x={23.4} y={36} rot={18} scale={0.68} c={c} l={l} ink={ink} />
    <path d="M36.6 46Q38.4 40.4 41 44.8Z" fill={l} stroke={ink} strokeWidth="0.9" strokeLinejoin="round" />
    <path d="M23.4 44.8Q21.6 41.4 19.8 43.4" stroke={ink} strokeWidth="1.1" strokeLinecap="round" fill="none" />
    <Sparkle x={44.6} y={36.4} r={2} p={p} />
  </>
);

/* ── Cấp 4 — Tre Vươn Mình ───────────────────────────────────────────────── */

const GlyphPrism: React.FC<GlyphProps> = ({ c, l, deep, ink, p }) => (
  <>
    <path d="M12 34Q7.6 28 9.2 21.6" stroke={l} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />
    <path d="M9.4 40.4Q5.8 35.6 6.6 30.2" stroke={l} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.45" />
    <Soil y={46.4} ink={ink} />
    <RankLeaf x={30} y={11.8} rot={-30} scale={1.08} c={c} l={l} ink={ink} />
    <RankLeaf x={30} y={11.8} rot={-30} flip={-1} scale={1.08} c={c} l={l} ink={ink} />
    <RankLeaf x={30} y={16.8} rot={-4} scale={1} c={c} l={l} ink={ink} />
    <RankLeaf x={30} y={16.8} rot={-4} flip={-1} scale={1} c={c} l={l} ink={ink} />
    <Culm x={30} top={9.4} bottom={46.4} width={9} nodes={[19, 29.4, 39.4]} c={c} l={l} deep={deep} ink={ink}>
      <RankFace x={30} y={24.4} ink={ink} blush={PALETTE[4].blush} mood="grin" />
    </Culm>
    <Culm x={38} top={27} bottom={38.6} width={4.6} nodes={[33]} c={c} l={l} deep={deep} ink={ink} alt>
      <RankLeaf x={40} y={27.6} rot={-28} flip={-1} scale={0.78} c={c} l={l} ink={ink} />
    </Culm>
    <path d="M22.6 45.4Q20.6 41.6 18.6 43.2" stroke={ink} strokeWidth="1.15" strokeLinecap="round" fill="none" />
    <Sparkle x={14} y={14.8} r={2.3} p={p} />
    <Sparkle x={46.4} y={40.6} r={1.7} p={p} />
  </>
);

/* ── Cấp 5 — Tre Trưởng Thành ────────────────────────────────────────────── */

const GlyphStar: React.FC<GlyphProps> = ({ c, l, deep, ink, p }) => (
  <>
    <g opacity="0.5">
      <path d="M11.6 37.4Q6.4 31.4 8.2 23.6" stroke={l} strokeWidth="1.1" strokeLinecap="round" fill="none" />
      <path d="M48.4 37.4Q53.6 31.4 51.8 23.6" stroke={l} strokeWidth="1.1" strokeLinecap="round" fill="none" />
    </g>
    <Soil y={46.6} ink={ink} />
    <RankLeaf x={30} y={10} rot={-40} scale={1.02} c={c} l={l} ink={ink} />
    <RankLeaf x={30} y={10} rot={-40} flip={-1} scale={1.02} c={c} l={l} ink={ink} />
    <RankLeaf x={30} y={14.8} rot={-14} scale={0.98} c={c} l={l} ink={ink} />
    <RankLeaf x={30} y={14.8} rot={-14} flip={-1} scale={0.98} c={c} l={l} ink={ink} />
    <RankLeaf x={30} y={20.8} rot={4} scale={0.9} c={c} l={l} ink={ink} />
    <RankLeaf x={30} y={20.8} rot={4} flip={-1} scale={0.9} c={c} l={l} ink={ink} />
    <Culm x={30} top={8.6} bottom={46.6} width={10} nodes={[17.2, 25.6, 34.2, 42.2]} c={c} l={l} deep={deep} ink={ink}>
      <RankFace x={30} y={21.6} ink={ink} blush={PALETTE[5].blush} />
    </Culm>
    <Sparkle x={30} y={5.2} r={2.8} p={p} />
    <Sparkle x={15.2} y={25.2} r={1.8} p={p} />
    <Sparkle x={45} y={31.6} r={2} p={p} />
    <path d="M21 46Q19.2 42.2 17.2 43.8" stroke={ink} strokeWidth="1.1" strokeLinecap="round" fill="none" />
    <path d="M39 46Q40.8 42.4 42.8 44" stroke={ink} strokeWidth="1.1" strokeLinecap="round" fill="none" />
  </>
);

/* ── Cấp 6 — Bụi Tre ─────────────────────────────────────────────────────── */

const GlyphWheat: React.FC<GlyphProps> = ({ c, l, deep, ink, p }) => (
  <>
    <Soil y={46.8} ink={ink} />
    <RankLeaf x={27} y={13.4} rot={-34} scale={1} c={c} l={l} ink={ink} />
    <RankLeaf x={27} y={13.4} rot={-34} flip={-1} scale={0.92} c={c} l={l} ink={ink} />
    <RankLeaf x={27} y={18.6} rot={-4} scale={0.94} c={c} l={l} ink={ink} />
    <RankLeaf x={38} y={26.4} rot={-22} flip={-1} scale={0.9} c={c} l={l} ink={ink} />
    <RankLeaf x={38} y={31.2} rot={6} flip={-1} scale={0.82} c={c} l={l} ink={ink} />
    <RankLeaf x={27} y={23} rot={-8} scale={0.84} c={c} l={l} ink={ink} />
    <RankLeaf x={24} y={25.6} rot={14} scale={0.78} c={c} l={l} ink={ink} />
    <Culm x={26.4} top={11.6} bottom={46.8} width={8.6} nodes={[20, 29.4, 38.8]} c={c} l={l} deep={deep} ink={ink}>
      <RankFace x={26.4} y={34} ink={ink} blush={PALETTE[6].blush} />
    </Culm>
    <Culm x={38.4} top={24.4} bottom={46.8} width={6.8} nodes={[32, 40]} c={c} l={l} deep={deep} ink={ink} alt />
    <ellipse cx="38.4" cy="36.8" rx="0.75" ry="1.05" fill={ink} />
    <ellipse cx="41.2" cy="36.8" rx="0.75" ry="1.05" fill={ink} />
    <path d="M38.6 39.2Q39.8 40.2 41 39.2" stroke={ink} strokeWidth="0.85" strokeLinecap="round" fill="none" />
    <circle cx="14.6" cy="17.4" r="1.3" fill={l} opacity="0.95" />
    <circle cx="16.4" cy="12.8" r="0.7" fill={l} opacity="0.8" />
    <circle cx="45.8" cy="14" r="1" fill={l} opacity="0.9" />
    <Sparkle x={43.4} y={22.2} r={1.7} p={p} />
  </>
);

/* ── Cấp 7 — Lũy Tre Làng ────────────────────────────────────────────────── */

const GlyphTorch: React.FC<GlyphProps> = ({ c, l, deep, ink, p }) => (
  <>
    <g className="ff-rank-aura">
      <circle cx="30" cy="27.6" r="20" fill={c} opacity="0.08" />
      <circle cx="30" cy="27.6" r="20" stroke={l} strokeWidth="0.8" opacity="0.35" />
    </g>
    <path
      d="M38 11A14.6 14.6 0 1 0 38 41A11.8 11.8 0 1 1 38 11Z"
      fill={l}
      opacity="0.22"
      stroke={l}
      strokeWidth="0.75"
      strokeOpacity="0.55"
    />
    <Soil y={47.2} ink={ink} />
    <RankLeaf x={30} y={8.4} rot={-42} scale={0.98} c={c} l={l} ink={ink} />
    <RankLeaf x={30} y={8.4} rot={-42} flip={-1} scale={0.98} c={c} l={l} ink={ink} />
    <RankLeaf x={30} y={13.2} rot={-16} scale={0.94} c={c} l={l} ink={ink} />
    <RankLeaf x={30} y={13.2} rot={-16} flip={-1} scale={0.94} c={c} l={l} ink={ink} />
    <RankLeaf x={30} y={19} rot={0} scale={0.88} c={c} l={l} ink={ink} />
    <RankLeaf x={30} y={19} rot={0} flip={-1} scale={0.88} c={c} l={l} ink={ink} />
    <Culm x={20.4} top={18.4} bottom={47.2} width={6.4} nodes={[27.4, 36.6, 44]} c={c} l={l} deep={deep} ink={ink} alt>
      <RankLeaf x={20.4} y={19} rot={-52} scale={0.72} c={c} l={l} ink={ink} />
    </Culm>
    <Culm x={39.6} top={20.4} bottom={47.2} width={6.4} nodes={[29, 37.8, 44.4]} c={c} l={l} deep={deep} ink={ink} alt>
      <RankLeaf x={39.6} y={21} rot={-52} flip={-1} scale={0.72} c={c} l={l} ink={ink} />
    </Culm>
    <Culm x={30} top={6.8} bottom={47.2} width={9} nodes={[15.4, 24.4, 33.6, 42.4]} c={c} l={l} deep={deep} ink={ink}>
      <RankFace x={30} y={29} ink={ink} blush={PALETTE[7].blush} mood="grin" />
    </Culm>
    <Sparkle x={30} y={4.2} r={2.4} p={p} />
    <Sparkle x={14} y={33} r={1.7} p={p} />
    <Sparkle x={46} y={34.4} r={1.7} p={p} />
  </>
);

/* ── Cấp 8 — Lũy Tre Cổ Thụ ─────────────────────────────────────────────── */

const GlyphCrystal: React.FC<GlyphProps> = ({ c, l, deep, ink, p }) => (
  <>
    <g className="ff-rank-rays" stroke={l} strokeWidth="1.1" strokeLinecap="round" opacity="0.8">
      <line x1="30" y1="3.6" x2="30" y2="7.4" />
      <line x1="30" y1="52.6" x2="30" y2="56.4" />
      <line x1="3.6" y1="30" x2="7.4" y2="30" />
      <line x1="52.6" y1="30" x2="56.4" y2="30" />
      <line x1="11.4" y1="11.4" x2="14.2" y2="14.2" />
      <line x1="45.8" y1="45.8" x2="48.6" y2="48.6" />
      <line x1="48.6" y1="11.4" x2="45.8" y2="14.2" />
      <line x1="14.2" y1="45.8" x2="11.4" y2="48.6" />
      <line x1="20" y1="5" x2="21.2" y2="8.4" opacity="0.7" />
      <line x1="40" y1="5" x2="38.8" y2="8.4" opacity="0.7" />
      <line x1="5" y1="20" x2="8.4" y2="21.2" opacity="0.7" />
      <line x1="55" y1="20" x2="51.6" y2="21.2" opacity="0.7" />
      <line x1="5" y1="40" x2="8.4" y2="38.8" opacity="0.7" />
      <line x1="55" y1="40" x2="51.6" y2="38.8" opacity="0.7" />
      <line x1="20" y1="55" x2="21.2" y2="51.6" opacity="0.7" />
      <line x1="40" y1="55" x2="38.8" y2="51.6" opacity="0.7" />
    </g>
    <circle cx="30" cy="25.4" r="16.4" fill={c} opacity="0.34" stroke={`url(#${p}-glyph)`} strokeWidth="1" />
    <circle cx="30" cy="25.4" r="11.6" stroke={l} strokeWidth="0.55" strokeDasharray="2.4 2" opacity="0.6" />
    <Soil y={47.4} ink={ink} />
    <RankLeaf x={30} y={7.6} rot={-44} scale={1} c={c} l={l} ink={ink} />
    <RankLeaf x={30} y={7.6} rot={-44} flip={-1} scale={1} c={c} l={l} ink={ink} />
    <RankLeaf x={30} y={12.4} rot={-18} scale={0.96} c={c} l={l} ink={ink} />
    <RankLeaf x={30} y={12.4} rot={-18} flip={-1} scale={0.96} c={c} l={l} ink={ink} />
    <RankLeaf x={30} y={18.2} rot={-2} scale={0.9} c={c} l={l} ink={ink} />
    <RankLeaf x={30} y={18.2} rot={-2} flip={-1} scale={0.9} c={c} l={l} ink={ink} />
    <Culm x={19} top={17.2} bottom={47.4} width={6.4} nodes={[26.4, 35.6, 43.4]} c={c} l={l} deep={deep} ink={ink} alt>
      <RankLeaf x={19} y={18} rot={-56} scale={0.7} c={c} l={l} ink={ink} />
    </Culm>
    <Culm x={41} top={19.2} bottom={47.4} width={6.4} nodes={[28, 37, 43.8]} c={c} l={l} deep={deep} ink={ink} alt>
      <RankLeaf x={41} y={20} rot={-56} flip={-1} scale={0.7} c={c} l={l} ink={ink} />
    </Culm>
    <Culm x={30} top={5.6} bottom={47.4} width={9.2} nodes={[14.4, 23.6, 32.8, 41.6]} c={c} l={l} deep={deep} ink={ink}>
      <RankFace x={30} y={28.2} ink={ink} blush={PALETTE[8].blush} mood="grin" />
    </Culm>
    <path d="M27 7.2Q23.4 4.2 19.6 5.6" stroke={l} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.85" />
    <path d="M33 7.2Q36.6 4.2 40.4 5.6" stroke={l} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.85" />
    <circle cx="13.2" cy="15.6" r="1" fill={l} opacity="0.9" />
    <circle cx="46.8" cy="17.2" r="1" fill={l} opacity="0.9" />
    <circle cx="15.6" cy="42.6" r="0.8" fill={l} opacity="0.8" />
    <Sparkle x={30} y={2.6} r={2.6} p={p} />
    <Sparkle x={13.4} y={26.6} r={1.8} p={p} />
    <Sparkle x={46.6} y={27.4} r={1.8} p={p} />
  </>
);

/* ── Xuất bộ icon ────────────────────────────────────────────────────────── */

export const Tier1HocSinh = ({ size = 28 }: { size?: number }) => (
  <Medallion tier={1} size={size} color={TIER_CONFIGS[0].badgeColor} light={LIGHT[1]} ornate="plain"
    render={(p: string) => <GlyphSprout p={p} c={TIER_CONFIGS[0].badgeColor} l={LIGHT[1]} deep={PALETTE[1].deep} ink={PALETTE[1].ink} />}
  />
);

export const Tier2HocSinhGioi = ({ size = 28 }: { size?: number }) => (
  <Medallion tier={2} size={size} color={TIER_CONFIGS[1].badgeColor} light={LIGHT[2]} ornate="plain"
    render={(p: string) => <GlyphTwinLeaves p={p} c={TIER_CONFIGS[1].badgeColor} l={LIGHT[2]} deep={PALETTE[2].deep} ink={PALETTE[2].ink} />}
  />
);

export const Tier3HocSinhXuatSac = ({ size = 28 }: { size?: number }) => (
  <Medallion tier={3} size={size} color={TIER_CONFIGS[2].badgeColor} light={LIGHT[3]} ornate="plain"
    render={(p: string) => <GlyphTriLeaf p={p} c={TIER_CONFIGS[2].badgeColor} l={LIGHT[3]} deep={PALETTE[3].deep} ink={PALETTE[3].ink} />}
  />
);

export const Tier4ThongThai = ({ size = 28 }: { size?: number }) => (
  <Medallion tier={4} size={size} color={TIER_CONFIGS[3].badgeColor} light={LIGHT[4]} ornate="ring"
    render={(p: string) => <GlyphPrism p={p} c={TIER_CONFIGS[3].badgeColor} l={LIGHT[4]} deep={PALETTE[4].deep} ink={PALETTE[4].ink} />}
  />
);

export const Tier5TaiNang = ({ size = 28 }: { size?: number }) => (
  <Medallion tier={5} size={size} color={TIER_CONFIGS[4].badgeColor} light={LIGHT[5]} ornate="ring"
    render={(p: string) => <GlyphStar p={p} c={TIER_CONFIGS[4].badgeColor} l={LIGHT[5]} deep={PALETTE[5].deep} ink={PALETTE[5].ink} />}
  />
);

export const Tier6ThienTai = ({ size = 28 }: { size?: number }) => (
  <Medallion tier={6} size={size} color={TIER_CONFIGS[5].badgeColor} light={LIGHT[6]} ornate="diamond"
    render={(p: string) => <GlyphWheat p={p} c={TIER_CONFIGS[5].badgeColor} l={LIGHT[6]} deep={PALETTE[6].deep} ink={PALETTE[6].ink} />}
  />
);

export const Tier7BacThay = ({ size = 28 }: { size?: number }) => (
  <Medallion tier={7} size={size} color={TIER_CONFIGS[6].badgeColor} light={LIGHT[7]} ornate="diamond"
    render={(p: string) => <GlyphTorch p={p} c={TIER_CONFIGS[6].badgeColor} l={LIGHT[7]} deep={PALETTE[7].deep} ink={PALETTE[7].ink} />}
  />
);

export const Tier8ChuyenGia = ({ size = 28 }: { size?: number }) => (
  <Medallion tier={8} size={size} color={TIER_CONFIGS[7].badgeColor} light={LIGHT[8]} ornate="diamond"
    render={(p: string) => <GlyphCrystal p={p} c={TIER_CONFIGS[7].badgeColor} l={LIGHT[8]} deep={PALETTE[8].deep} ink={PALETTE[8].ink} />}
  />
);

export const TierSvg = ({
  tierNumber,
  size = 28,
}: {
  tierNumber: number;
  size?: number;
}) => {
  switch (tierNumber) {
    case 1:
      return <Tier1HocSinh size={size} />;
    case 2:
      return <Tier2HocSinhGioi size={size} />;
    case 3:
      return <Tier3HocSinhXuatSac size={size} />;
    case 4:
      return <Tier4ThongThai size={size} />;
    case 5:
      return <Tier5TaiNang size={size} />;
    case 6:
      return <Tier6ThienTai size={size} />;
    case 7:
      return <Tier7BacThay size={size} />;
    case 8:
      return <Tier8ChuyenGia size={size} />;
    default:
      return <Tier1HocSinh size={size} />;
  }
};

interface TierBadgeProps {
  level: number;
  size?: number;
  showTooltip?: boolean;
  tooltipPosition?: 'top' | 'bottom';
  className?: string;
}

export const TierBadge: React.FC<TierBadgeProps> = ({
  level,
  size = 28,
  showTooltip = true,
  tooltipPosition = 'top',
  className = '',
}) => {
  const tier = getTierForLevel(level);

  return (
    <div
      className={`relative group inline-flex items-center justify-center ${className}`}
    >
      <TierSvg tierNumber={tier.tierNumber} size={size} />
      {showTooltip && (
        <div
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 z-50 opacity-0 group-hover:opacity-100 transition-all duration-200 text-xs font-medium text-white px-2.5 py-1 rounded-md bg-neutral-900/95 border border-white/20 whitespace-nowrap shadow-xl ${
            tooltipPosition === 'bottom'
              ? 'top-full mt-2'
              : 'bottom-full mb-2'
          }`}
        >
          {tier.name} • Cấp {level} ({tier.description})
          <div
            className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
              tooltipPosition === 'bottom'
                ? 'bottom-full -mb-1 border-b-neutral-900'
                : 'top-full -mt-1 border-t-neutral-900'
            }`}
          />
        </div>
      )}
    </div>
  );
};

export const AdminVerifiedBadge: React.FC<{
  size?: number;
  tooltipPosition?: 'top' | 'bottom';
  className?: string;
}> = ({ size = 18, tooltipPosition = 'top', className = '' }) => {
  return (
    <span className={`relative group inline-flex items-center shrink-0 align-middle leading-none ${className}`}>
      <span
        style={{ width: size, height: size }}
        className="admin-verified-badge shrink-0"
      >
        <svg
          viewBox="0 0 24 24"
          width={size * 0.75}
          height={size * 0.75}
          fill="none"
          stroke="white"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 z-50 opacity-0 group-hover:opacity-100 transition-all duration-200 text-xs font-semibold text-[#f4f1de] px-2.5 py-1 rounded-md bg-[#0b0d12]/95 border border-[#f2cc8f]/45 whitespace-nowrap shadow-xl ${
          tooltipPosition === 'bottom'
            ? 'top-full mt-2'
            : 'bottom-full mb-2'
        }`}
      >
        Super Admin F-Forum
        <span
          className={`block absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
            tooltipPosition === 'bottom'
              ? 'bottom-full -mb-1 border-b-neutral-900'
              : 'top-full -mt-1 border-t-neutral-900'
          }`}
        />
      </span>
    </span>
  );
};

export default TierBadge;
