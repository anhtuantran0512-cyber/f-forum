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

const DARK_BG: Record<number, string> = {
  1: '#071a12',
  2: '#071f15',
  3: '#082419',
  4: '#071c29',
  5: '#082233',
  6: '#16112b',
  7: '#1d1033',
  8: '#261a05',
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
  const darkCore = DARK_BG[tier] || '#0a0f1a';

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
          <stop offset="55%" stopColor={color} />
          <stop offset="100%" stopColor={light} />
        </linearGradient>
        <linearGradient id={g('stem')} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} />
          <stop offset="45%" stopColor={light} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
        <linearGradient id={g('leaf')} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={light} stopOpacity="0.96" />
          <stop offset="100%" stopColor={color} stopOpacity="0.72" />
        </linearGradient>
        <radialGradient id={g('bg')} cx="50%" cy="38%" r="65%">
          <stop offset="0%" stopColor={color} stopOpacity="0.24" />
          <stop offset="58%" stopColor={darkCore} stopOpacity="0.95" />
          <stop offset="100%" stopColor="#050811" stopOpacity="0.98" />
        </radialGradient>
        <radialGradient id={g('halo')} cx="50%" cy="42%" r="48%">
          <stop offset="0%" stopColor={light} stopOpacity="0.42" />
          <stop offset="65%" stopColor={color} stopOpacity="0.12" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Lớp nền ngọc bích / huy chương đa tầng */}
      <circle cx="30" cy="30" r="27.5" fill={`url(#${g('bg')})`} />
      <circle cx="30" cy="27" r="21" fill={`url(#${g('halo')})`} />

      {/* Khung viền trang trí tiến hóa theo bậc (plain → ring → diamond) */}
      {ornate === 'plain' && (
        <>
          <circle cx="30" cy="30" r="24.6" stroke={color} strokeWidth="0.65" strokeDasharray="2.5 2.5" opacity="0.42" />
          <circle cx="30" cy="4.2" r="1.1" fill={light} opacity="0.75" />
          <circle cx="30" cy="55.8" r="1.1" fill={color} opacity="0.55" />
        </>
      )}
      {ornate === 'ring' && (
        <>
          <circle cx="30" cy="30" r="24.8" stroke={`url(#${g('glyph')})`} strokeWidth="0.9" opacity="0.55" />
          <circle cx="30" cy="30" r="22.8" stroke={light} strokeWidth="0.55" strokeDasharray="3 2" opacity="0.38" />
          <polygon points="30,1.8 31.8,4.6 30,6.4 28.2,4.6" fill={light} opacity="0.9" />
          <polygon points="30,58.2 31.8,55.4 30,53.6 28.2,55.4" fill={color} opacity="0.8" />
          <polygon points="1.8,30 4.6,28.2 6.4,30 4.6,31.8" fill={color} opacity="0.8" />
          <polygon points="58.2,30 55.4,28.2 53.6,30 55.4,31.8" fill={light} opacity="0.85" />
        </>
      )}
      {ornate === 'diamond' && (
        <>
          <circle cx="30" cy="30" r="25.2" stroke={`url(#${g('glyph')})`} strokeWidth="1.1" opacity="0.68" />
          <circle cx="30" cy="30" r="23.1" stroke={light} strokeWidth="0.65" strokeDasharray="1.8 1.8" opacity="0.48" />
          <polygon points="30,1.2 32.3,4.8 30,7.2 27.7,4.8" fill={light} />
          <polygon points="30,58.8 32.3,55.2 30,52.8 27.7,55.2" fill={light} opacity="0.9" />
          <polygon points="1.2,30 4.8,27.7 7.2,30 4.8,32.3" fill={light} opacity="0.9" />
          <polygon points="58.8,30 55.2,27.7 52.8,30 55.2,32.3" fill={light} />
          <circle cx="10.5" cy="10.5" r="1.35" fill={light} opacity="0.85" />
          <circle cx="49.5" cy="10.5" r="1.35" fill={light} opacity="0.85" />
          <circle cx="10.5" cy="49.5" r="1.35" fill={color} opacity="0.85" />
          <circle cx="49.5" cy="49.5" r="1.35" fill={color} opacity="0.85" />
        </>
      )}

      {render(uid)}

      {/* Vệt phản quang kính cong phía trên mặt huy hiệu */}
      <path
        d="M 13 13.5 A 22 22 0 0 1 47 13.5"
        stroke={light}
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.32"
      />
    </svg>
  );
};

/* ── Biểu tượng từng bậc (8 cấp độ Tre Việt chi tiết cao, viewBox 0 0 60 60) ── */

/* Cấp 1 — MĂNG NON (0 điểm) 🟢: Mầm măng bụ bẫm nhú khỏi gò đất ẩm, bẹ măng đan chéo & giọt sương mai */
const GlyphSprout = ({ c, l, p }: { c: string; l: string; p: string }) => (
  <>
    <circle cx="30" cy="30" r="27" fill="none" stroke={`url(#${p}-glyph)`} strokeWidth="1.9" />
    {/* Gò đất ẩm 2 lớp */}
    <path d="M15 44 Q30 40.5 45 44 Q30 47.5 15 44 Z" fill={c} fillOpacity="0.18" />
    <path d="M16 43.5 Q30 46 44 43.5" stroke={`url(#${p}-glyph)`} strokeWidth="1.7" strokeLinecap="round" />
    <path d="M21 46.2 Q30 47.8 39 46.2" stroke={c} strokeWidth="1" strokeLinecap="round" opacity="0.55" />
    {/* Thân măng non hình búp mập có tô chuyển sắc */}
    <path
      d="M30 16.5 C26.2 23 23.2 33 23.5 43.2 Q30 45.2 36.5 43.2 C36.8 33 33.8 23 30 16.5 Z"
      fill={`url(#${p}-leaf)`}
      stroke={`url(#${p}-glyph)`}
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
    {/* Bẹ măng ôm chéo đa tầng */}
    <path d="M24.2 39.5 Q30 35.5 35.8 39" stroke={l} strokeWidth="1.25" fill="none" strokeLinecap="round" />
    <path d="M24.8 33.8 Q30 29.8 35.2 33.5" stroke={l} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <path d="M26.5 27.5 Q30 24.8 33.5 27.5" stroke={l} strokeWidth="1.15" fill="none" strokeLinecap="round" />
    {/* Sống sáng dọc búp măng */}
    <path d="M29.2 20.5 Q28 29 28.4 38" stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" opacity="0.45" />
    {/* Hai mầm cỏ nhỏ bên gốc & giọt sương đỉnh măng */}
    <path d="M22.5 43 Q19.5 39.5 17.5 41" stroke={l} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <path d="M37.5 43 Q40.5 39.5 42.5 41" stroke={l} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <circle cx="30" cy="14" r="1.4" fill={l} />
    <circle cx="24" cy="21" r="0.8" fill={l} opacity="0.7" />
  </>
);

/* Cấp 2 — MĂNG VƯƠN (100 điểm) 🟢: Măng vươn cao, bẹ tách mở, 2 phiến lá non đầu tiên bung cánh */
const GlyphTwinLeaves = ({ c, l, p }: { c: string; l: string; p: string }) => (
  <>
    <circle cx="30" cy="30" r="27" fill="none" stroke={`url(#${p}-glyph)`} strokeWidth="1.9" />
    {/* Gò đất & sương sớm */}
    <path d="M14 44.5 Q30 41 46 44.5 Q30 48 14 44.5 Z" fill={c} fillOpacity="0.18" />
    <path d="M16 44 Q30 46.8 44 44" stroke={`url(#${p}-glyph)`} strokeWidth="1.7" strokeLinecap="round" />
    {/* Hai phiến lá non hé mở hai bên đỉnh măng (có thịt lá + gân lá) */}
    <path
      d="M29.5 21 C24 17 17.5 16.5 14.5 20.5 C18.5 22.8 24.5 23.2 29.5 21 Z"
      fill={`url(#${p}-leaf)`}
      stroke={l}
      strokeWidth="1.15"
      strokeLinejoin="round"
    />
    <path
      d="M30.5 18.5 C36 14 42.5 13.5 45.5 17.5 C41.5 20 35.5 20.8 30.5 18.5 Z"
      fill={`url(#${p}-leaf)`}
      stroke={l}
      strokeWidth="1.15"
      strokeLinejoin="round"
    />
    {/* Thân măng vươn cao */}
    <path
      d="M30 11.5 C26 19.5 23 31.5 23 43.8 Q30 46 37 43.8 C37 31.5 34 19.5 30 11.5 Z"
      fill={`url(#${p}-leaf)`}
      stroke={`url(#${p}-glyph)`}
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    {/* Các tầng bẹ măng đan chéo */}
    <path d="M23.8 39.5 Q30 35 36.2 39.5" stroke={l} strokeWidth="1.25" fill="none" strokeLinecap="round" />
    <path d="M24.6 33.2 Q30 28.8 35.4 33.2" stroke={l} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <path d="M25.8 26.8 Q30 23 34.2 26.8" stroke={l} strokeWidth="1.15" fill="none" strokeLinecap="round" />
    <path d="M27.3 20.5 Q30 18 32.7 20.5" stroke={l} strokeWidth="1.1" fill="none" strokeLinecap="round" />
    {/* Chồi lá búp trên đỉnh & đom đóm lục bảo */}
    <path d="M30 11.8 Q28 7.8 25.5 6.8" stroke={l} strokeWidth="1.35" fill="none" strokeLinecap="round" />
    <path d="M30 11.8 Q32.5 8.2 34.8 7.5" stroke={l} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <circle cx="20" cy="13.5" r="1.1" fill={l} opacity="0.85" />
    <circle cx="41" cy="11" r="0.9" fill={l} opacity="0.7" />
  </>
);

/* Cấp 3 — TRE NON (250 điểm) 🟢: Thân tre non 3 lóng rõ đốt, chồi măng phụ & 4 phiến lá sắc nét */
const GlyphTriLeaf = ({ c, l, p }: { c: string; l: string; p: string }) => (
  <>
    <circle cx="30" cy="30" r="27" fill="none" stroke={`url(#${p}-glyph)`} strokeWidth="1.9" />
    {/* Thảm cỏ & mặt đất */}
    <path d="M15 46 Q30 43 45 46 Q30 49 15 46 Z" fill={c} fillOpacity="0.18" />
    <path d="M16 45.5 Q30 48 44 45.5" stroke={`url(#${p}-glyph)`} strokeWidth="1.6" strokeLinecap="round" />
    {/* Phiến lá tre non có thịt lá (trái & phải) */}
    <path
      d="M28 24 C21.5 20.5 14.5 21 11.5 25 C16.5 26.8 23 26.2 28 24 Z"
      fill={`url(#${p}-leaf)`}
      stroke={l}
      strokeWidth="1.1"
    />
    <path
      d="M28.5 14.5 C22 10.2 15.5 10.5 12.5 14.2 C17.5 16.2 23.5 16 28.5 14.5 Z"
      fill={`url(#${p}-leaf)`}
      stroke={l}
      strokeWidth="1.1"
    />
    <path
      d="M31 18.5 C37.5 14.5 44 15 47.5 19 C42.5 21 36 20.5 31 18.5 Z"
      fill={`url(#${p}-leaf)`}
      stroke={l}
      strokeWidth="1.1"
    />
    <path
      d="M30.5 11 C36 7.5 41.5 8 44.5 11.2 C40 13 35 12.6 30.5 11 Z"
      fill={`url(#${p}-leaf)`}
      stroke={l}
      strokeWidth="1.05"
    />
    {/* Thân tre non có độ dày lóng (culm) */}
    <path
      d="M27.4 45.5 Q26.6 27 28.2 8.5 L31.2 8.5 Q29.8 27 31 45.5 Z"
      fill={`url(#${p}-stem)`}
      stroke={c}
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
    {/* Đốt tre đôi (double-node rings) tạo cảm giác chân thật */}
    <path d="M25.2 35.5 L32.8 35.1 M25.4 36.8 L32.6 36.4" stroke={l} strokeWidth="1.25" strokeLinecap="round" />
    <path d="M25.5 24.5 L32.5 24.1 M25.7 25.7 L32.3 25.3" stroke={l} strokeWidth="1.25" strokeLinecap="round" />
    <path d="M26.2 14.5 L32.2 14.2" stroke={l} strokeWidth="1.2" strokeLinecap="round" />
    {/* Mầm măng nhỏ mọc kèm dưới gốc */}
    <path d="M34.5 45.5 L33 39.5 L36.8 45.5 Z" fill={l} opacity="0.85" />
  </>
);

/* Cấp 4 — TRE VƯƠN MÌNH (500 điểm · 5 🏅) 🔵: Thân tre xanh lam vươn cao, 4 đốt rõ nét, 2 tầng tán lá dày */
const GlyphPrism = ({ c, l, p }: { c: string; l: string; p: string }) => (
  <>
    <circle cx="30" cy="30" r="27" fill="none" stroke={`url(#${p}-glyph)`} strokeWidth="1.95" />
    {/* Vòng cung gió / trăng khuyết mờ phía sau */}
    <circle cx="30" cy="27" r="17.5" stroke={c} strokeWidth="0.75" strokeDasharray="4 3" opacity="0.35" />
    <path d="M15 46.8 Q30 43.8 45 46.8 Q30 49.5 15 46.8 Z" fill={c} fillOpacity="0.2" />
    <path d="M16 46.2 Q30 48.8 44 46.2" stroke={`url(#${p}-glyph)`} strokeWidth="1.65" strokeLinecap="round" />
    {/* Tán lá tầng dưới & tầng trên (6 phiến lá thon nhọn có gân sáng) */}
    <path d="M27.5 28 C20 24.5 13 25.5 9.5 29.8 C15.5 31.2 22.5 30.2 27.5 28 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.1" />
    <path d="M30.5 30 C38 26.5 44.5 27.5 48.5 31.5 C42.5 33 35.5 32 30.5 30 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.1" />
    <path d="M27.5 18.5 C19.5 14 12.5 14.8 9 19.2 C15 21 22 20.4 27.5 18.5 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.15" />
    <path d="M30.5 20.5 C38.5 16.2 45.5 17 49 21.5 C43 23.2 36 22.4 30.5 20.5 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.15" />
    <path d="M28.2 10.5 C22 6 16 6.5 13 10 C18 11.8 23.5 11.6 28.2 10.5 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.05" />
    <path d="M30.2 9.5 C36.5 5.2 42 5.8 45.5 9.2 C40.5 11 35 10.8 30.2 9.5 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.05" />
    {/* Thân tre chính */}
    <path
      d="M27.2 46.2 Q25.6 26 27.8 6.5 L31.2 6.5 Q29.2 26 31 46.2 Z"
      fill={`url(#${p}-stem)`}
      stroke={c}
      strokeWidth="1.15"
      strokeLinejoin="round"
    />
    {/* 4 đốt tre đôi nổi khối */}
    <path d="M24.8 38 L32.8 37.5 M25 39.2 L32.6 38.7" stroke={l} strokeWidth="1.25" strokeLinecap="round" />
    <path d="M24.8 28.2 L32.4 27.7 M25 29.4 L32.2 28.9" stroke={l} strokeWidth="1.25" strokeLinecap="round" />
    <path d="M25.2 18.5 L32.2 18.1 M25.4 19.6 L32 19.2" stroke={l} strokeWidth="1.2" strokeLinecap="round" />
    <path d="M26 10.2 L32 9.8" stroke={l} strokeWidth="1.15" strokeLinecap="round" />
    {/* Hai búp măng nhỏ dưới chân */}
    <path d="M22.5 46.2 L24.2 39.8 L26 46.2 Z" fill={l} opacity="0.85" />
    <path d="M33.2 46.2 L34.8 40.8 L36.6 46.2 Z" fill={c} opacity="0.85" />
  </>
);

/* Cấp 5 — TRE TRƯỞNG THÀNH (1000 điểm · 10 🏅) 🔵: Thân tre vững chãi, tán lá 3 tầng + ngôi sao tri thức trên đỉnh */
const GlyphStar = ({ c, l, p }: { c: string; l: string; p: string }) => (
  <>
    <circle cx="30" cy="30" r="27" fill="none" stroke={`url(#${p}-glyph)`} strokeWidth="2" />
    {/* Vòng hào quang nội tâm */}
    <circle cx="30" cy="25" r="18.5" stroke={l} strokeWidth="0.8" opacity="0.32" />
    <path d="M14 47.5 Q30 44.2 46 47.5 Q30 50.2 14 47.5 Z" fill={c} fillOpacity="0.22" />
    <path d="M15 47 Q30 49.5 45 47" stroke={`url(#${p}-glyph)`} strokeWidth="1.75" strokeLinecap="round" />
    {/* Tán lá 3 tầng (8 phiến lá dày dặn đối xứng) */}
    <path d="M27.2 31 C18.5 27 11 28 7.5 32.5 C14 34.2 21.5 33.2 27.2 31 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.1" />
    <path d="M30.8 32.5 C39.5 28.5 46.5 29.5 50.5 34 C44 35.8 36.5 34.8 30.8 32.5 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.1" />
    <path d="M27 21.5 C18 16.8 10.5 17.5 7 22.2 C13.5 24.2 21 23.5 27 21.5 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.15" />
    <path d="M30.8 23 C39.5 18.2 47 19 51 23.8 C44.5 25.8 37 25 30.8 23 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.15" />
    <path d="M27.5 13 C20 8.2 13.5 8.8 10 12.8 C15.8 14.8 22.2 14.5 27.5 13 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.1" />
    <path d="M30.5 14 C38 9.2 44.5 9.8 48 13.8 C42.2 15.8 35.8 15.5 30.5 14 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.1" />
    <path d="M28.5 7.8 C23.5 4 18.5 4.5 16 7.5 C20.5 9 25 8.8 28.5 7.8 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1" />
    <path d="M30.5 7.8 C35.5 4 40.5 4.5 43 7.5 C38.5 9 34 8.8 30.5 7.8 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1" />
    {/* Thân tre trưởng thành */}
    <path
      d="M26.8 47 Q25 25.5 27.6 5.5 L31.4 5.5 Q29.2 25.5 31.2 47 Z"
      fill={`url(#${p}-stem)`}
      stroke={c}
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    {/* 4 đốt tre đôi sắc nét */}
    <path d="M24.2 38.8 L33 38.3 M24.4 40 L32.8 39.5" stroke={l} strokeWidth="1.3" strokeLinecap="round" />
    <path d="M24.4 29.2 L32.6 28.7 M24.6 30.4 L32.4 29.9" stroke={l} strokeWidth="1.3" strokeLinecap="round" />
    <path d="M24.8 19.6 L32.4 19.1 M25 20.7 L32.2 20.2" stroke={l} strokeWidth="1.25" strokeLinecap="round" />
    <path d="M25.6 10.8 L32.2 10.4" stroke={l} strokeWidth="1.2" strokeLinecap="round" />
    {/* Ngôi sao 4 cánh lấp lánh trên đỉnh ngọn */}
    <path d="M29.5 1.8 L30.6 4.4 L33.2 5.5 L30.6 6.6 L29.5 9.2 L28.4 6.6 L25.8 5.5 L28.4 4.4 Z" fill="#ffffff" opacity="0.92" />
  </>
);

/* Cấp 6 — BỤI TRE (2000 điểm · 20 🏅) 🟣: Khóm tre đôi + măng non quây quần, tán lá tím huyền ảo */
const GlyphWheat = ({ c, l, p }: { c: string; l: string; p: string }) => (
  <>
    <circle cx="30" cy="30" r="27" fill="none" stroke={`url(#${p}-glyph)`} strokeWidth="2" />
    {/* Vầng sáng khóm tre */}
    <circle cx="30" cy="26" r="19" stroke={l} strokeWidth="0.85" opacity="0.35" />
    <path d="M13 48 Q30 44.5 47 48 Q30 51 13 48 Z" fill={c} fillOpacity="0.24" />
    <path d="M14 47.5 Q30 50 46 47.5" stroke={`url(#${p}-glyph)`} strokeWidth="1.8" strokeLinecap="round" />
    {/* Tán lá rậm 2 bên khóm tre (8 phiến lá có thịt lá) */}
    <path d="M23.5 27 C15.5 23 8.5 24 5.5 28.2 C11.5 30 18.2 29.2 23.5 27 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.1" />
    <path d="M23.5 17.5 C15 12.8 8 13.8 5 18.2 C11 20.2 18 19.5 23.5 17.5 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.15" />
    <path d="M24.5 9.5 C18 5 12 5.5 9 9.2 C14.2 11 19.8 10.8 24.5 9.5 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.05" />
    <path d="M36.5 29 C44 25.5 50.5 26.5 54 30.5 C48.2 32.2 41.8 31.2 36.5 29 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.1" />
    <path d="M36.5 19.5 C44.5 15.2 51 16.2 54.5 20.5 C48.5 22.2 42 21.5 36.5 19.5 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.15" />
    <path d="M35.5 12 C42 7.8 48 8.5 51 12 C46 13.8 40.5 13.5 35.5 12 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.05" />
    {/* Lá đan giữa 2 thân */}
    <path d="M26.5 14 C30.5 10.5 34.5 10.8 37 13.8 C33.5 15.2 29.8 15.2 26.5 14 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1" />
    {/* Thân chính bên trái */}
    <path
      d="M22.8 47.5 Q20.5 25 23.8 5 L27.4 5 Q24.5 25 26.8 47.5 Z"
      fill={`url(#${p}-stem)`}
      stroke={c}
      strokeWidth="1.15"
      strokeLinejoin="round"
    />
    <path d="M20.5 37.8 L28 37.3 M20.7 39 L27.8 38.5" stroke={l} strokeWidth="1.25" strokeLinecap="round" />
    <path d="M20.8 27.2 L27.6 26.7 M21 28.4 L27.4 27.9" stroke={l} strokeWidth="1.25" strokeLinecap="round" />
    <path d="M21.5 16.5 L27.6 16.1" stroke={l} strokeWidth="1.2" strokeLinecap="round" />
    {/* Thân phụ bên phải */}
    <path
      d="M33.2 47.5 Q36.2 28 33.4 10.5 L36.6 10.5 Q39.2 28 36.8 47.5 Z"
      fill={`url(#${p}-stem)`}
      stroke={c}
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
    <path d="M32.2 39.2 L38.8 38.8 M32.4 40.3 L38.6 39.9" stroke={l} strokeWidth="1.15" strokeLinecap="round" />
    <path d="M32.6 29.2 L38.8 28.8 M32.8 30.3 L38.6 29.9" stroke={l} strokeWidth="1.15" strokeLinecap="round" />
    <path d="M32.4 19.5 L38.2 19.1" stroke={l} strokeWidth="1.1" strokeLinecap="round" />
    {/* Búp măng mọc giữa khóm */}
    <path d="M28.2 47.5 L30 38.5 L31.8 47.5 Z" fill={l} stroke={c} strokeWidth="0.9" />
    <circle cx="30" cy="21" r="1.1" fill={l} opacity="0.9" />
    <circle cx="16" cy="11" r="0.9" fill={l} opacity="0.75" />
    <circle cx="44" cy="15" r="0.9" fill={l} opacity="0.75" />
  </>
);

/* Cấp 7 — LŨY TRE LÀNG (4000 điểm · 35 🏅) 🟣✨: 3 thân tre uy nghi, vầng trăng hào quang mờ & tán lá rậm rạp */
const GlyphTorch = ({ c, l, p }: { c: string; l: string; p: string }) => (
  <>
    <circle cx="30" cy="30" r="27" fill="none" stroke={`url(#${p}-glyph)`} strokeWidth="2.1" />
    {/* Hào quang mờ (giữ nguyên circle[opacity="0.4"] cho animation aura-breathe) */}
    <circle cx="30" cy="28" r="20" stroke={c} strokeWidth="1.1" fill={c} fillOpacity="0.08" opacity="0.4" />
    <circle cx="30" cy="24" r="14.5" stroke={l} strokeWidth="0.75" strokeDasharray="3 2" opacity="0.45" />
    {/* Gò đất lũy tre làng */}
    <path d="M12 48.5 Q30 44.8 48 48.5 Q30 51.8 12 48.5 Z" fill={c} fillOpacity="0.26" />
    <path d="M13 48 Q30 50.8 47 48" stroke={`url(#${p}-glyph)`} strokeWidth="1.85" strokeLinecap="round" />
    {/* Tán lá lũy tre 3 tầng dày đặc */}
    <path d="M19 25 C11.5 21 5.5 22 3 26 C8.5 27.8 14.5 27 19 25 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.05" />
    <path d="M19.5 15 C12 10.5 6 11.2 3.5 15.2 C9 17.2 15 16.6 19.5 15 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.1" />
    <path d="M41 26 C48.5 22 54.5 23 57 27 C51.5 28.8 45.5 28 41 26 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.05" />
    <path d="M40.5 16 C48 11.5 54 12.2 56.5 16.2 C51 18.2 45 17.6 40.5 16 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.1" />
    <path d="M28.5 9.5 C21 4.5 14.5 5 11.5 9 C17 11 23.2 10.8 28.5 9.5 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.1" />
    <path d="M31.5 9.5 C39 4.5 45.5 5 48.5 9 C43 11 36.8 10.8 31.5 9.5 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.1" />
    <path d="M28.5 18.5 C22.5 15 17 15.5 14.5 18.8 C19.2 20.2 24.2 20 28.5 18.5 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1" />
    <path d="M31.5 18.5 C37.5 15 43 15.5 45.5 18.8 C40.8 20.2 35.8 20 31.5 18.5 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1" />
    {/* Thân trái */}
    <path d="M18.2 48 Q15.5 28 19.2 9.5 L22.2 9.5 Q18.8 28 21.4 48 Z" fill={`url(#${p}-stem)`} stroke={c} strokeWidth="1.05" />
    <path d="M16.2 38.2 L22.6 37.8 M16.8 27.5 L22.4 27.1 M17.5 17.5 L22.6 17.2" stroke={l} strokeWidth="1.15" strokeLinecap="round" />
    {/* Thân giữa (trụ cột cao nhất) */}
    <path d="M28 48.2 Q26.2 24 28.5 3.2 L31.8 3.2 Q29.8 24 31.8 48.2 Z" fill={`url(#${p}-stem)`} stroke={c} strokeWidth="1.2" />
    <path d="M25.5 37 L33.5 36.5 M25.7 38.2 L33.3 37.7" stroke={l} strokeWidth="1.3" strokeLinecap="round" />
    <path d="M25.8 25.5 L33.2 25 M26 26.7 L33 26.2" stroke={l} strokeWidth="1.3" strokeLinecap="round" />
    <path d="M26.4 14.5 L33 14.1" stroke={l} strokeWidth="1.25" strokeLinecap="round" />
    {/* Thân phải */}
    <path d="M38.6 48 Q41.5 29 38.2 11 L41.2 11 Q44.5 29 41.8 48 Z" fill={`url(#${p}-stem)`} stroke={c} strokeWidth="1.05" />
    <path d="M37.4 39.2 L43.8 38.8 M37.8 28.5 L43.6 28.1 M37.5 18.5 L42.8 18.2" stroke={l} strokeWidth="1.15" strokeLinecap="round" />
    {/* Hai mầm măng phụ & đốm sáng linh khí */}
    <path d="M23.5 48.2 L25 40.5 L26.6 48.2 Z" fill={l} opacity="0.9" />
    <path d="M33.4 48.2 L35 41.2 L36.5 48.2 Z" fill={l} opacity="0.9" />
    <circle cx="13" cy="8.5" r="1" fill="#ffffff" opacity="0.85" />
    <circle cx="47" cy="9.5" r="1" fill="#ffffff" opacity="0.85" />
  </>
);

/* Cấp 8 — LŨY TRE CỔ THỤ (8000 điểm · 50 🏅) 🟡✨: Hoàng Kim Trúc Hóa Rồng — hào quang mặt trời xoay & 3 thân cổ thụ */
const GlyphCrystal = ({ c, l, p }: { c: string; l: string; p: string }) => (
  <>
    <circle cx="30" cy="30" r="27" fill="none" stroke={`url(#${p}-glyph)`} strokeWidth="2.2" />
    {/* Tia sáng hoàng kim xoay quanh viền (.badge-tier-8 g xoay 360 độ) */}
    <g className="ff-rank-rays" stroke={l} strokeWidth="1.35" strokeLinecap="round">
      <line x1="30" y1="1.8" x2="30" y2="6.2" />
      <line x1="30" y1="53.8" x2="30" y2="58.2" />
      <line x1="1.8" y1="30" x2="6.2" y2="30" />
      <line x1="53.8" y1="30" x2="58.2" y2="30" />
      <line x1="9.8" y1="9.8" x2="13.2" y2="13.2" />
      <line x1="46.8" y1="46.8" x2="50.2" y2="50.2" />
      <line x1="50.2" y1="9.8" x2="46.8" y2="13.2" />
      <line x1="13.2" y1="46.8" x2="9.8" y2="50.2" />
      <line x1="19.5" y1="3.8" x2="21" y2="7.2" opacity="0.75" />
      <line x1="40.5" y1="3.8" x2="39" y2="7.2" opacity="0.75" />
      <line x1="3.8" y1="19.5" x2="7.2" y2="21" opacity="0.75" />
      <line x1="56.2" y1="19.5" x2="52.8" y2="21" opacity="0.75" />
    </g>
    {/* Nhật nguyệt kim hoàn phía sau lũy tre cổ thụ */}
    <circle cx="30" cy="24" r="16.5" fill={c} fillOpacity="0.12" stroke={l} strokeWidth="1" opacity="0.65" />
    <circle cx="30" cy="24" r="11.5" stroke="#ffffff" strokeWidth="0.7" strokeDasharray="2.5 2" opacity="0.55" />
    {/* Gò đất long mạch vàng kim */}
    <path d="M11 49.2 Q30 45 49 49.2 Q30 52.8 11 49.2 Z" fill={c} fillOpacity="0.32" />
    <path d="M12 48.8 Q30 51.8 48 48.8" stroke={`url(#${p}-glyph)`} strokeWidth="2" strokeLinecap="round" />
    {/* Tán lá hoàng kim rậm rạp 4 tầng (10 phiến lá có thịt lá + ánh kim) */}
    <path d="M18.5 27 C10.5 23 4.5 24 2 28.2 C7.8 30 14 29.2 18.5 27 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.1" />
    <path d="M19 16.5 C11 11.8 4.8 12.6 2.2 16.8 C8 18.8 14.2 18.2 19 16.5 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.15" />
    <path d="M41.5 27 C49.5 23 55.5 24 58 28.2 C52.2 30 46 29.2 41.5 27 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.1" />
    <path d="M41 16.5 C49 11.8 55.2 12.6 57.8 16.8 C52 18.8 45.8 18.2 41 16.5 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.15" />
    <path d="M28.2 8.8 C20.2 3.5 13.2 4.2 10 8.5 C16 10.5 22.8 10.2 28.2 8.8 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.15" />
    <path d="M31.8 8.8 C39.8 3.5 46.8 4.2 50 8.5 C44 10.5 37.2 10.2 31.8 8.8 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.15" />
    <path d="M28.2 18.5 C21.8 14.5 16 15.2 13.2 18.8 C18.2 20.4 23.8 20 28.2 18.5 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.05" />
    <path d="M31.8 18.5 C38.2 14.5 44 15.2 46.8 18.8 C41.8 20.4 36.2 20 31.8 18.5 Z" fill={`url(#${p}-leaf)`} stroke={l} strokeWidth="1.05" />
    {/* Thân cổ thụ trái */}
    <path d="M17.5 49 Q14.5 28 18.5 9 L21.8 9 Q18 28 21 49 Z" fill={`url(#${p}-stem)`} stroke={c} strokeWidth="1.15" />
    <path d="M15.4 38.8 L22.2 38.3 M16 27.5 L22 27.1 M16.8 17 L22.2 16.6" stroke={l} strokeWidth="1.25" strokeLinecap="round" />
    {/* Thân cổ thụ giữa (Long Trúc chí tôn) */}
    <path d="M27.6 49.2 Q25.6 23.5 28.2 2.2 L32 2.2 Q29.8 23.5 32.2 49.2 Z" fill={`url(#${p}-stem)`} stroke={c} strokeWidth="1.3" />
    <path d="M24.8 37.8 L34 37.2 M25 39.1 L33.8 38.5" stroke="#ffffff" strokeWidth="1.35" strokeLinecap="round" opacity="0.9" />
    <path d="M25.2 25.5 L33.6 25 M25.4 26.8 L33.4 26.3" stroke="#ffffff" strokeWidth="1.35" strokeLinecap="round" opacity="0.9" />
    <path d="M26 13.5 L33.2 13.1 M26.2 14.7 L33 14.3" stroke={l} strokeWidth="1.3" strokeLinecap="round" />
    {/* Thân cổ thụ phải */}
    <path d="M39 49 Q42 28 38.2 9.5 L41.5 9.5 Q45.5 28 42.5 49 Z" fill={`url(#${p}-stem)`} stroke={c} strokeWidth="1.15" />
    <path d="M37.8 39.2 L44.6 38.7 M38 28 L44 27.6 M37.8 17.5 L43.2 17.1" stroke={l} strokeWidth="1.25" strokeLinecap="round" />
    {/* Hai búp măng kim bảo & sao sáng đỉnh Long Trúc */}
    <path d="M22.8 49.2 L24.6 40.5 L26.4 49.2 Z" fill={l} stroke={c} strokeWidth="0.9" />
    <path d="M33.6 49.2 L35.4 40.5 L37.2 49.2 Z" fill={l} stroke={c} strokeWidth="0.9" />
    <polygon points="30,0.4 31.2,3.2 34,4.2 31.2,5.2 30,8 28.8,5.2 26,4.2 28.8,3.2" fill="#ffffff" />
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
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 z-50 opacity-0 group-hover:opacity-100 transition-all duration-200 text-xs font-semibold text-white px-2.5 py-1 rounded-md bg-neutral-900/95 border border-cyan-400/40 whitespace-nowrap shadow-xl ${
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
