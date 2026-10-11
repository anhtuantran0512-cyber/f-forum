/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useId, useMemo } from 'react';
import { TIER_CONFIGS, getTierForLevel } from '../utils/tier';

/* ==========================================================================
   🎋 "TRE VIỆT" — HỆ THỐNG ICON RANK 8 BẬC (Từ Măng Non Đến Lũy Tre Cổ Thụ)
   --------------------------------------------------------------------------
   Logic tiến hóa:
     1. Măng Non (#4ADE80)         — Mầm măng vừa nhú khỏi đất, còn bọc bẹ
     2. Măng Vươn (#4ADE80)        — Măng cao hơn, bẹ bắt đầu hé, lộ chút lá non
     3. Tre Non (#4ADE80)          — Thành thân tre mảnh đầu tiên, 2 đốt, vài lá nhỏ
     4. Tre Vươn Mình (#38BDF8)    — Cao hơn, 3 đốt, 2 tầng lá
     5. Tre Trưởng Thành (#38BDF8) — 4 đốt, tán lá 3 tầng tỏa rộng
     6. Bụi Tre (#A78BFA)          — 2 thân tre mọc cùng bụi, lá rậm 2 bên
     7. Lũy Tre Làng (#C084FC)     — 3 thân, lá rậm rạp, hào quang mờ bao bọc
     8. Lũy Tre Cổ Thụ (#FBBF24)   — 3 thân cao nhất, vàng kim, hào quang tia sáng rực
   ========================================================================== */

const LIGHT: Record<number, string> = {
  1: '#86efac',
  2: '#86efac',
  3: '#86efac',
  4: '#7dd3fc',
  5: '#7dd3fc',
  6: '#c4b5fd',
  7: '#e9d5ff',
  8: '#fde68a',
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
  /** Trang trí thêm cho bậc cao */
  ornate?: 'plain' | 'ring' | 'diamond';
  /** Biểu tượng bên trong, nhận tiền tố id riêng của huy hiệu này */
  render: (prefix: string) => React.ReactNode;
}

const Medallion: React.FC<MedallionProps> = ({ tier, size = 28, color, light, ornate = 'plain', render }) => {
  /* useId cho mỗi instance một id duy nhất; lọc ký tự lạ để url(#…) an toàn trên mọi trình duyệt */
  const rawId = useId();
  const uid = useMemo(() => `ffr${tier}-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`, [tier, rawId]);
  const g = (name: string) => `${uid}-${name}`;
  void ornate;
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
      {render(uid)}
      <defs>
        <linearGradient id={g('glyph')} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={light} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
    </svg>
  );
};

/* ── Biểu tượng từng bậc (8 cấp độ Tre Việt, viewBox 0 0 60 60) ─────────── */

/* Cấp 1 — MĂNG NON (0 điểm) 🟢 */
const GlyphSprout = ({ c, p }: { c: string; l: string; p: string }) => (
  <>
    <circle cx="30" cy="30" r="27" fill="rgba(10, 15, 26, 0.88)" stroke={c} strokeWidth="1.8" />
    {/* Mặt đất */}
    <path d="M18 42 Q30 44 42 42" stroke={`url(#${p}-glyph)`} strokeWidth="1.4" strokeLinecap="round" />
    {/* Măng hình nón, bọc bẹ */}
    <path d="M30 18 L24 42 Q30 44 36 42 Z" stroke={c} strokeWidth="1.8" fill="none" strokeLinejoin="round" />
    {/* Vằn bẹ măng */}
    <path d="M25.5 36 Q30 38 34.5 36" stroke={c} strokeWidth="1.2" fill="none" />
    <path d="M27 29 Q30 30.5 33 29" stroke={c} strokeWidth="1.2" fill="none" />
  </>
);

/* Cấp 2 — MĂNG VƯƠN (100 điểm) 🟢 */
const GlyphTwinLeaves = ({ c, p }: { c: string; l: string; p: string }) => (
  <>
    <circle cx="30" cy="30" r="27" fill="rgba(10, 15, 26, 0.88)" stroke={c} strokeWidth="1.8" />
    <path d="M18 42 Q30 44 42 42" stroke={`url(#${p}-glyph)`} strokeWidth="1.4" strokeLinecap="round" />
    <path d="M30 13 L23 42 Q30 44.5 37 42 Z" stroke={c} strokeWidth="1.8" fill="none" strokeLinejoin="round" />
    <path d="M24.5 36 Q30 38 35.5 36" stroke={c} strokeWidth="1.2" fill="none" />
    <path d="M26 28 Q30 30 34 28" stroke={c} strokeWidth="1.2" fill="none" />
    {/* Lá non hé ra ở đỉnh */}
    <path d="M30 13 Q27 10 26 7" stroke={c} strokeWidth="1.3" fill="none" strokeLinecap="round" />
  </>
);

/* Cấp 3 — TRE NON (250 điểm) 🟢 */
const GlyphTriLeaf = ({ c, p }: { c: string; l: string; p: string }) => (
  <>
    <circle cx="30" cy="30" r="27" fill="rgba(10, 15, 26, 0.88)" stroke={c} strokeWidth="1.8" />
    <path d="M18 45 Q30 47 42 45" stroke={`url(#${p}-glyph)`} strokeWidth="1.4" strokeLinecap="round" />
    {/* Thân tre */}
    <path d="M29 45 Q28 28 29 10" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* Đốt tre */}
    <line x1="25" y1="34" x2="33" y2="33.5" stroke={c} strokeWidth="1.2" />
    <line x1="25.5" y1="22" x2="33" y2="21.5" stroke={c} strokeWidth="1.2" />
    {/* Lá tre */}
    <path d="M29 12 Q21 8 17 11" stroke={c} strokeWidth="1.3" fill="none" strokeLinecap="round" />
    <path d="M29 16 Q38 13 42 16" stroke={c} strokeWidth="1.3" fill="none" strokeLinecap="round" />
  </>
);

/* Cấp 4 — TRE VƯƠN MÌNH (500 điểm · 5 🏅) 🔵 */
const GlyphPrism = ({ c, p }: { c: string; l: string; p: string }) => (
  <>
    <circle cx="30" cy="30" r="27" fill="rgba(10, 15, 26, 0.88)" stroke={c} strokeWidth="1.8" />
    <path d="M18 46 Q30 48 42 46" stroke={`url(#${p}-glyph)`} strokeWidth="1.4" strokeLinecap="round" />
    <path d="M28 46 Q26 26 28 7" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />
    <line x1="24" y1="37" x2="32" y2="36.5" stroke={c} strokeWidth="1.2" />
    <line x1="24.5" y1="26" x2="32" y2="25.5" stroke={c} strokeWidth="1.2" />
    <line x1="25.5" y1="16" x2="32" y2="15.5" stroke={c} strokeWidth="1.2" />
    {/* Lá tre nhiều hơn, 2 tầng */}
    <path d="M28 18 Q19 14 15 18" stroke={c} strokeWidth="1.3" fill="none" strokeLinecap="round" />
    <path d="M28 22 Q37 19 41 23" stroke={c} strokeWidth="1.3" fill="none" strokeLinecap="round" />
    <path d="M28 9 Q22 5 19 7" stroke={c} strokeWidth="1.2" fill="none" strokeLinecap="round" />
  </>
);

/* Cấp 5 — TRE TRƯỞNG THÀNH (1000 điểm · 10 🏅) 🔵 */
const GlyphStar = ({ c, p }: { c: string; l: string; p: string }) => (
  <>
    <circle cx="30" cy="30" r="27" fill="rgba(10, 15, 26, 0.88)" stroke={c} strokeWidth="1.8" />
    <path d="M17 47 Q30 49 43 47" stroke={`url(#${p}-glyph)`} strokeWidth="1.4" strokeLinecap="round" />
    <path d="M28 47 Q24 25 28 5" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />
    <line x1="23" y1="38" x2="32" y2="37.5" stroke={c} strokeWidth="1.2" />
    <line x1="23.5" y1="28" x2="32" y2="27.5" stroke={c} strokeWidth="1.2" />
    <line x1="24.5" y1="18" x2="32" y2="17.5" stroke={c} strokeWidth="1.2" />
    <line x1="25.5" y1="9" x2="31" y2="8.7" stroke={c} strokeWidth="1.1" />
    {/* Tán lá 3 tầng tỏa rộng */}
    <path d="M28 19 Q17 14 12 19" stroke={c} strokeWidth="1.3" fill="none" strokeLinecap="round" />
    <path d="M28 24 Q39 20 44 25" stroke={c} strokeWidth="1.3" fill="none" strokeLinecap="round" />
    <path d="M28 10 Q20 5 16 8" stroke={c} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <path d="M28 7 Q35 3 39 6" stroke={c} strokeWidth="1.2" fill="none" strokeLinecap="round" />
  </>
);

/* Cấp 6 — BỤI TRE (2000 điểm · 20 🏅) 🟣 */
const GlyphWheat = ({ c, p }: { c: string; l: string; p: string }) => (
  <>
    <circle cx="30" cy="30" r="27" fill="rgba(10, 15, 26, 0.88)" stroke={c} strokeWidth="1.8" />
    <path d="M15 48 Q30 50 45 48" stroke={`url(#${p}-glyph)`} strokeWidth="1.4" strokeLinecap="round" />
    {/* Thân chính */}
    <path d="M26 48 Q22 24 26 4" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />
    <line x1="21" y1="38" x2="30" y2="37.5" stroke={c} strokeWidth="1.2" />
    <line x1="21.5" y1="27" x2="30" y2="26.5" stroke={c} strokeWidth="1.2" />
    <line x1="22.5" y1="16" x2="30" y2="15.5" stroke={c} strokeWidth="1.1" />
    {/* Thân phụ */}
    <path d="M35 48 Q38 30 35 14" stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    <line x1="32" y1="40" x2="38" y2="39.7" stroke={c} strokeWidth="1" />
    <line x1="32" y1="29" x2="38" y2="28.7" stroke={c} strokeWidth="1" />
    {/* Lá rậm 2 bên */}
    <path d="M26 18 Q14 13 9 18" stroke={c} strokeWidth="1.3" fill="none" strokeLinecap="round" />
    <path d="M35 16 Q45 12 49 17" stroke={c} strokeWidth="1.3" fill="none" strokeLinecap="round" />
    <path d="M26 8 Q19 3 15 6" stroke={c} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <path d="M35 14 Q42 9 46 11" stroke={c} strokeWidth="1.2" fill="none" strokeLinecap="round" />
  </>
);

/* Cấp 7 — LŨY TRE LÀNG (4000 điểm · 35 🏅) 🟣✨ */
const GlyphTorch = ({ c, p }: { c: string; l: string; p: string }) => (
  <>
    <circle cx="30" cy="30" r="27" fill="rgba(10, 15, 26, 0.88)" stroke={c} strokeWidth="1.8" />
    {/* Hào quang mờ */}
    <circle cx="30" cy="28" r="20" stroke={c} strokeWidth="0.7" opacity="0.4" />
    <path d="M14 49 Q30 51 46 49" stroke={`url(#${p}-glyph)`} strokeWidth="1.4" strokeLinecap="round" />
    {/* Thân trái */}
    <path d="M20 49 Q17 28 21 10" stroke={c} strokeWidth="1.7" fill="none" strokeLinecap="round" />
    <line x1="17" y1="38" x2="24" y2="37.5" stroke={c} strokeWidth="1" />
    {/* Thân giữa (chính) */}
    <path d="M30 49 Q27 24 30 3" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />
    <line x1="25" y1="37" x2="34" y2="36.5" stroke={c} strokeWidth="1.2" />
    <line x1="26" y1="24" x2="34" y2="23.5" stroke={c} strokeWidth="1.2" />
    {/* Thân phải */}
    <path d="M39 49 Q43 30 39 13" stroke={c} strokeWidth="1.7" fill="none" strokeLinecap="round" />
    <line x1="36" y1="40" x2="43" y2="39.5" stroke={c} strokeWidth="1" />
    {/* Lá rậm tỏa khắp */}
    <path d="M21 14 Q11 9 7 14" stroke={c} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <path d="M30 6 Q22 1 18 4" stroke={c} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <path d="M30 10 Q38 6 42 9" stroke={c} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <path d="M39 16 Q48 12 52 16" stroke={c} strokeWidth="1.2" fill="none" strokeLinecap="round" />
  </>
);

/* Cấp 8 — LŨY TRE CỔ THỤ (8000 điểm · 50 🏅) 🟡✨ */
const GlyphCrystal = ({ c, p }: { c: string; l: string; p: string }) => (
  <>
    <circle cx="30" cy="30" r="27" fill="rgba(10, 15, 26, 0.9)" stroke={c} strokeWidth="2" />
    {/* Tia sáng tỏa quanh viền */}
    <g stroke={c} strokeWidth="1.3" strokeLinecap="round">
      <line x1="30" y1="2" x2="30" y2="6" />
      <line x1="30" y1="54" x2="30" y2="58" />
      <line x1="2" y1="30" x2="6" y2="30" />
      <line x1="54" y1="30" x2="58" y2="30" />
      <line x1="10" y1="10" x2="13" y2="13" />
      <line x1="47" y1="47" x2="50" y2="50" />
      <line x1="50" y1="10" x2="47" y2="13" />
      <line x1="13" y1="47" x2="10" y2="50" />
    </g>
    <path d="M13 50 Q30 52 47 50" stroke={`url(#${p}-glyph)`} strokeWidth="1.5" strokeLinecap="round" />
    {/* Thân trái */}
    <path d="M19 50 Q16 28 20 11" stroke={c} strokeWidth="1.7" fill="none" strokeLinecap="round" />
    <line x1="16" y1="39" x2="23" y2="38.5" stroke={c} strokeWidth="1" />
    <line x1="17" y1="22" x2="23" y2="21.7" stroke={c} strokeWidth="1" />
    {/* Thân giữa (chính, cao nhất) */}
    <path d="M30 50 Q27 23 30 2" stroke={c} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <line x1="25" y1="38" x2="34" y2="37.5" stroke={c} strokeWidth="1.3" />
    <line x1="26" y1="24" x2="34" y2="23.5" stroke={c} strokeWidth="1.3" />
    <line x1="27" y1="12" x2="33" y2="11.7" stroke={c} strokeWidth="1.1" />
    {/* Thân phải */}
    <path d="M40 50 Q44 29 40 13" stroke={c} strokeWidth="1.7" fill="none" strokeLinecap="round" />
    <line x1="37" y1="40" x2="44" y2="39.5" stroke={c} strokeWidth="1" />
    <line x1="38" y1="24" x2="44" y2="23.7" stroke={c} strokeWidth="1" />
    {/* Lá rậm rạp toàn bộ */}
    <path d="M20 15 Q9 10 5 15" stroke={c} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <path d="M30 5 Q22 0 17 3" stroke={c} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <path d="M30 9 Q39 5 43 8" stroke={c} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <path d="M40 17 Q49 13 53 17" stroke={c} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <path d="M20 26 Q11 23 8 27" stroke={c} strokeWidth="1.1" fill="none" strokeLinecap="round" />
    <path d="M40 27 Q49 24 52 28" stroke={c} strokeWidth="1.1" fill="none" strokeLinecap="round" />
  </>
);

export const Tier1HocSinh = ({ size = 28 }: { size?: number }) => (
  <Medallion tier={1} size={size} color={TIER_CONFIGS[0].badgeColor} light={LIGHT[1]} ornate="plain"
    render={(p: string) => <GlyphSprout p={p} c={TIER_CONFIGS[0].badgeColor} l={LIGHT[1]} />}
  />
);

export const Tier2HocSinhGioi = ({ size = 28 }: { size?: number }) => (
  <Medallion tier={2} size={size} color={TIER_CONFIGS[1].badgeColor} light={LIGHT[2]} ornate="plain"
    render={(p: string) => <GlyphTwinLeaves p={p} c={TIER_CONFIGS[1].badgeColor} l={LIGHT[2]} />}
  />
);

export const Tier3HocSinhXuatSac = ({ size = 28 }: { size?: number }) => (
  <Medallion tier={3} size={size} color={TIER_CONFIGS[2].badgeColor} light={LIGHT[3]} ornate="plain"
    render={(p: string) => <GlyphTriLeaf p={p} c={TIER_CONFIGS[2].badgeColor} l={LIGHT[3]} />}
  />
);

export const Tier4ThongThai = ({ size = 28 }: { size?: number }) => (
  <Medallion tier={4} size={size} color={TIER_CONFIGS[3].badgeColor} light={LIGHT[4]} ornate="plain"
    render={(p: string) => <GlyphPrism p={p} c={TIER_CONFIGS[3].badgeColor} l={LIGHT[4]} />}
  />
);

export const Tier5TaiNang = ({ size = 28 }: { size?: number }) => (
  <Medallion tier={5} size={size} color={TIER_CONFIGS[4].badgeColor} light={LIGHT[5]} ornate="ring"
    render={(p: string) => <GlyphStar p={p} c={TIER_CONFIGS[4].badgeColor} l={LIGHT[5]} />}
  />
);

export const Tier6ThienTai = ({ size = 28 }: { size?: number }) => (
  <Medallion tier={6} size={size} color={TIER_CONFIGS[5].badgeColor} light={LIGHT[6]} ornate="ring"
    render={(p: string) => <GlyphWheat p={p} c={TIER_CONFIGS[5].badgeColor} l={LIGHT[6]} />}
  />
);

export const Tier7BacThay = ({ size = 28 }: { size?: number }) => (
  <Medallion tier={7} size={size} color={TIER_CONFIGS[6].badgeColor} light={LIGHT[7]} ornate="diamond"
    render={(p: string) => <GlyphTorch p={p} c={TIER_CONFIGS[6].badgeColor} l={LIGHT[7]} />}
  />
);

export const Tier8ChuyenGia = ({ size = 28 }: { size?: number }) => (
  <Medallion tier={8} size={size} color={TIER_CONFIGS[7].badgeColor} light={LIGHT[8]} ornate="diamond"
    render={(p: string) => <GlyphCrystal p={p} c={TIER_CONFIGS[7].badgeColor} l={LIGHT[8]} />}
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
    <div className={`relative group inline-flex items-center ${className}`}>
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
      <div
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 z-50 opacity-0 group-hover:opacity-100 transition-all duration-200 text-xs font-semibold text-white px-2.5 py-1 rounded-md bg-neutral-900/95 border border-cyan-400/40 whitespace-nowrap shadow-xl ${
          tooltipPosition === 'bottom'
            ? 'top-full mt-2'
            : 'bottom-full mb-2'
        }`}
      >
        Super Admin F-Forum
        <div
          className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
            tooltipPosition === 'bottom'
              ? 'bottom-full -mb-1 border-b-neutral-900'
              : 'top-full -mt-1 border-t-neutral-900'
          }`}
        />
      </div>
    </div>
  );
};

export default TierBadge;
