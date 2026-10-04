/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useId, useMemo } from 'react';
import { TIER_CONFIGS, getTierForLevel } from '../utils/tier';

/* ==========================================================================
   HỆ THỐNG ICON RANK — bộ huy hiệu 8 bậc, vẽ lại toàn bộ
   --------------------------------------------------------------------------
   Nguyên tắc của bộ mới (để 8 bậc trông như MỘT họ huy hiệu, không phải 8 hình
   rời rạc):
     • Cùng một khung huy hiệu 8 cạnh (bezel) + đĩa nền tối + vòng sáng ngoài.
     • Màu lấy trực tiếp từ TIER_CONFIGS (utils/tier) nên luôn khớp với thanh
       tiến trình, thẻ hồ sơ, bảng rank… — sửa màu ở một nơi là đổi cả hệ thống.
     • Biểu tượng bên trong tiến hoá theo bậc: mầm → hai lá → sách mở → lăng
       kính → ngôi sao → bông lúa & mặt trời → ngọn đuốc → tinh thể.
     • Bậc càng cao khung càng được trang trí thêm (vòng điểm nhấn, viên kim
       cương 4 góc) nên nhìn ra ngay bậc nào cao hơn.
   Tất cả đều là vector thuần, id gradient được đặt tiền tố riêng theo bậc
   (ffr{tier}-) để không xung đột khi nhiều huy hiệu cùng hiển thị.
   ========================================================================== */

const LIGHT: Record<number, string> = {
  1: '#bbf7d0',
  2: '#a7f3d0',
  3: '#99f6e4',
  4: '#a5f3fc',
  5: '#bfdbfe',
  6: '#fde68a',
  7: '#fecaca',
  8: '#e9d5ff',
};

const OCTAGON = 'M50 7 L79.7 20.3 L93 50 L79.7 79.7 L50 93 L20.3 79.7 L7 50 L20.3 20.3 Z';

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
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      data-rank-tier={tier}
      role="img"
      aria-hidden="true"
      className="ff-rank-icon transition-transform duration-300 hover:scale-110"
    >
      <defs>
        <radialGradient id={g('glow')} cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor={color} stopOpacity="0.34" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={g('frame')} x1="12%" y1="0%" x2="88%" y2="100%">
          <stop offset="0%" stopColor={light} stopOpacity="0.95" />
          <stop offset="45%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={g('glyph')} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={light} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
        <linearGradient id={g('shine')} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Vòng sáng ngoài */}
      <circle cx="50" cy="50" r="48" fill={`url(#${g('glow')})`} />

      {/* Khung huy hiệu 8 cạnh */}
      <path d={OCTAGON} fill="#0b1220" fillOpacity="0.92" stroke={`url(#${g('frame')})`} strokeWidth="2.6" strokeLinejoin="round" />

      {/* Điểm nhấn cho bậc cao */}
      {ornate === 'ring' && (
        <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeOpacity="0.4" strokeWidth="1" strokeDasharray="3 3" />
      )}
      {ornate === 'diamond' && (
        <>
          <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeOpacity="0.45" strokeWidth="1" strokeDasharray="3 3" />
          <path d="M50 1.5 L53.5 5 L50 8.5 L46.5 5 Z" fill={light} />
          <path d="M50 91.5 L53.5 95 L50 98.5 L46.5 95 Z" fill={light} />
          <path d="M1.5 50 L5 46.5 L8.5 50 L5 53.5 Z" fill={light} />
          <path d="M91.5 50 L95 46.5 L98.5 50 L95 53.5 Z" fill={light} />
        </>
      )}

      {/* Đĩa nền tối */}
      <circle cx="50" cy="50" r="32" fill="#080d16" fillOpacity="0.94" stroke={color} strokeOpacity="0.32" strokeWidth="1.2" />

      {/* Vệt sáng trên đỉnh */}
      <path d="M25 33 A32 32 0 0 1 75 33" stroke={`url(#${g('shine')})`} strokeWidth="2" strokeLinecap="round" />

      {render(uid)}
    </svg>
  );
};

/* ── Biểu tượng từng bậc ─────────────────────────────────────────────────── */

const GlyphSprout = ({ c, l, p }: { c: string; l: string; p: string }) => (
  <>
    <path d="M50 70 C50 60 50 54 50 45" stroke={`url(#${p}-glyph)`} strokeWidth="3.2" strokeLinecap="round" />
    <path d="M50 53 C56 41 68 39 72 47 C70 57 58 61 50 53 Z" fill={l} fillOpacity="0.92" stroke={c} strokeWidth="1.2" strokeLinejoin="round" />
    <circle cx="50" cy="43" r="2.6" fill={l} />
  </>
);

const GlyphTwinLeaves = ({ c, l, p }: { c: string; l: string; p: string }) => (
  <>
    <path d="M50 72 L50 40" stroke={`url(#${p}-glyph)`} strokeWidth="3" strokeLinecap="round" />
    <path d="M50 56 C38 52 32 41 39 33 C49 35 51 47 50 56 Z" fill={l} fillOpacity="0.9" stroke={c} strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M50 56 C62 52 68 41 61 33 C51 35 49 47 50 56 Z" fill={l} fillOpacity="0.9" stroke={c} strokeWidth="1.2" strokeLinejoin="round" />
    <circle cx="50" cy="30" r="2.8" fill={l} />
  </>
);

const GlyphTriLeaf = ({ c, l, p }: { c: string; l: string; p: string }) => (
  <>
    <path d="M50 74 C50 64 50 54 50 46" stroke={`url(#${p}-glyph)`} strokeWidth="2.8" strokeLinecap="round" />
    <path d="M50 60 C40 58 33 49 38 41 C48 42 52 52 50 60 Z" fill={l} fillOpacity="0.88" stroke={c} strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M50 56 C60 54 67 45 62 37 C52 38 48 48 50 56 Z" fill={l} fillOpacity="0.88" stroke={c} strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M50 44 C46 36 48 29 50 25 C52 29 54 36 50 44 Z" fill={l} fillOpacity="0.95" stroke={c} strokeWidth="1.1" strokeLinejoin="round" />
    <circle cx="50" cy="22" r="3.2" fill="#fff7ed" fillOpacity="0.9" stroke={c} strokeWidth="1" />
    <circle cx="43" cy="24" r="2.1" fill={l} fillOpacity="0.85" />
    <circle cx="57" cy="24" r="2.1" fill={l} fillOpacity="0.85" />
  </>
);

const GlyphPrism = ({ c, l, p }: { c: string; l: string; p: string }) => (
  <>
    <path d="M50 33 L68 64 L32 64 Z" fill="#0e1729" stroke={`url(#${p}-glyph)`} strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M50 33 L50 64" stroke={c} strokeWidth="1.1" strokeOpacity="0.5" />
    <path d="M26 44 L41 47" stroke={l} strokeWidth="2" strokeLinecap="round" />
    <path d="M74 44 L59 47" stroke={l} strokeWidth="2" strokeLinecap="round" />
    <path d="M30 32 C34 28 38 27 42 29 C39 34 34 35 30 32 Z" fill={l} fillOpacity="0.85" stroke={c} strokeWidth="1" strokeLinejoin="round" />
    <path d="M70 32 C66 28 62 27 58 29 C61 34 66 35 70 32 Z" fill={l} fillOpacity="0.85" stroke={c} strokeWidth="1" strokeLinejoin="round" />
    <path d="M34 68 C36 63 40 61 44 62 C42 67 38 69 34 68 Z" fill={l} fillOpacity="0.7" stroke={c} strokeWidth="1" strokeLinejoin="round" />
    <path d="M66 68 C64 63 60 61 56 62 C58 67 62 69 66 68 Z" fill={l} fillOpacity="0.7" stroke={c} strokeWidth="1" strokeLinejoin="round" />
    <circle cx="50" cy="30" r="2" fill={l} />
  </>
);

const GlyphStar = ({ c, l, p }: { c: string; l: string; p: string }) => (
  <>
    <path
      d="M50 28 L55.2 42.6 L70.4 43.2 L58.4 52.4 L62.4 67.2 L50 59 L37.6 67.2 L41.6 52.4 L29.6 43.2 L44.8 42.6 Z"
      fill={`url(#${p}-glyph)`}
      stroke={l}
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <circle cx="50" cy="50" r="8.6" fill="none" stroke={c} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2.5 2.5" />
    <circle cx="50" cy="50" r="3" fill="#0b1220" fillOpacity="0.55" />
    <circle cx="50" cy="50" r="1.4" fill={l} />
    <circle cx="73" cy="33" r="1.8" fill={l} fillOpacity="0.85" />
    <circle cx="27" cy="33" r="1.8" fill={l} fillOpacity="0.85" />
  </>
);

const GlyphWheat = ({ c, l, p }: { c: string; l: string; p: string }) => (
  <>
    <circle cx="50" cy="34" r="6.4" fill={`url(#${p}-glyph)`} stroke={l} strokeWidth="1.2" />
    <path d="M50 20 L50 24" stroke={l} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M38 24 L40.5 27.5" stroke={l} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M62 24 L59.5 27.5" stroke={l} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M33 34 L29 34" stroke={l} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M67 34 L71 34" stroke={l} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M38 45 C34 56 40 66 50 70" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
    <path d="M62 45 C66 56 60 66 50 70" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
    <path d="M43 48 C39 50 37 54 38 58 C43 57 46 53 43 48 Z" fill={l} fillOpacity="0.85" />
    <path d="M57 48 C61 50 63 54 62 58 C57 57 54 53 57 48 Z" fill={l} fillOpacity="0.85" />
    <path d="M46 58 C43 60 42 63 43 66 C47 65 49 62 46 58 Z" fill={l} fillOpacity="0.7" />
    <path d="M54 58 C57 60 58 63 57 66 C53 65 51 62 54 58 Z" fill={l} fillOpacity="0.7" />
  </>
);

const GlyphTorch = ({ c, l, p }: { c: string; l: string; p: string }) => (
  <>
    <path d="M45 73 L55 73 L53 52 L47 52 Z" fill="#0e1729" stroke={`url(#${p}-glyph)`} strokeWidth="2" strokeLinejoin="round" />
    <path d="M46 62 L54 62" stroke={l} strokeWidth="1.3" strokeOpacity="0.75" />
    <path d="M41 50 L46 43 L50 49 L54 43 L59 50 Z" fill={c} fillOpacity="0.85" stroke={l} strokeWidth="1.2" strokeLinejoin="round" />
    <circle cx="46" cy="45.5" r="1.5" fill="#fff1f2" />
    <circle cx="54" cy="45.5" r="1.5" fill="#fff1f2" />
    <circle cx="50" cy="48" r="1.5" fill="#fff1f2" />
    <path d="M50 22 C58 30 58 39 50 44 C42 39 42 30 50 22 Z" fill={`url(#${p}-glyph)`} stroke={l} strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M50 30 C54 34 53 38 50 41 C47 38 46 34 50 30 Z" fill="#fff7ed" fillOpacity="0.85" />
    <path d="M36 36 L32 32" stroke={l} strokeWidth="1.7" strokeLinecap="round" strokeOpacity="0.8" />
    <path d="M64 36 L68 32" stroke={l} strokeWidth="1.7" strokeLinecap="round" strokeOpacity="0.8" />
    <path d="M34 58 L30 58" stroke={l} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.55" />
    <path d="M66 58 L70 58" stroke={l} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.55" />
  </>
);

const GlyphCrystal = ({ c, l, p }: { c: string; l: string; p: string }) => (
  <>
    <path d="M50 27 L67 44 L50 73 L33 44 Z" fill="#0e1729" stroke={`url(#${p}-glyph)`} strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M33 44 L67 44" stroke={l} strokeWidth="1.3" strokeOpacity="0.85" />
    <path d="M50 27 L41 44 L50 73" stroke={l} strokeWidth="1.1" strokeOpacity="0.55" />
    <path d="M50 27 L59 44 L50 73" stroke={l} strokeWidth="1.1" strokeOpacity="0.55" />
    <ellipse cx="50" cy="50" rx="24" ry="9" stroke={c} strokeWidth="1.2" strokeOpacity="0.5" transform="rotate(-24 50 50)" />
    <circle cx="70" cy="41" r="2.2" fill={l} />
    <circle cx="30" cy="59" r="1.8" fill={l} fillOpacity="0.8" />
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
