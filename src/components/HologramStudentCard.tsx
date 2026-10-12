/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useRef } from 'react';
import {
  Flame,
  ShieldCheck,
  Sparkles,
  Award,
  Zap,
  QrCode,
  RotateCw,
  CheckCircle2,
  Coins,
} from 'lucide-react';
import type { User } from '../types';
import { getTierForLevel, getXPProgress } from '../utils/tier';
import { rarityDotClass, rarityFrameClass, rarityOf, resolveEquippedCombo } from '../utils/shopData';
import { TierBadge, AdminVerifiedBadge } from './Badges10Tier';
import { DEFAULT_AVATAR, handleImageError } from '../utils/mediaFallback';
import { effectiveCoinBalance, formatCoinBalance } from '../utils/coinDisplay';
import { PremiumMark } from './PremiumMark';
import { isMasterAdmin } from '../config/admin';
import { DecoratedAvatar } from './decorations/DecoratedAvatar';
import { useUserDecorations } from '../utils/decorationStore';
import './shop/Boutique.css';

interface HologramStudentCardProps {
  user: User;
  questionsAskedCount?: number;
  solutionsApprovedCount?: number;
}

export const HologramStudentCard: React.FC<HologramStudentCardProps> = ({
  user,
  questionsAskedCount = 0,
  solutionsApprovedCount = 0,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const [isFlipped, setIsFlipped] = useState(false);
  const [pulseWave, setPulseWave] = useState(false);

  const tier = getTierForLevel(user.level);
  const progress = getXPProgress(user.xp, user.level);
  const fPoints = user.fPoints ?? user.xp;
  const streakCount = user.streakCount ?? 0;
  const isSuperAdmin = isMasterAdmin(user.email);
  const equippedCombo = resolveEquippedCombo(
    user.inventory || [],
    user.equippedBadge,
    user.email || user.name || 'default',
  );
  const avatarRarity = equippedCombo.frame ? rarityOf(equippedCombo.frame) : equippedCombo.highestRarity;
  const avatarFrameClass = rarityFrameClass(avatarRarity);
  const userDecorations = useUserDecorations(user);
  const hasDiscordAvatarDeco = !!(userDecorations.frame || userDecorations.aura);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -14;
    const rotateY = ((x - centerX) / centerX) * 14;

    setTilt({ rotateX, rotateY });
    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.42,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  const triggerCardFlip = () => {
    setPulseWave(true);
    setIsFlipped((prev) => !prev);
    setTimeout(() => setPulseWave(false), 650);
  };

  return (
    <div className="w-full max-w-[440px] mx-auto select-none">
      {/* Top interactive toolbar with 3D Neumorphic Pill controls */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="pc-12-pill px-3 py-1 flex items-center gap-1.5 text-[10px] font-mono text-amber-300">
          <Sparkles className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>HOLOGRAM F-PASS 3D</span>
        </div>
        <button
          type="button"
          onClick={triggerCardFlip}
          className="pc-12-btn px-3 py-1 rounded-full flex items-center gap-1.5 text-[10px] font-mono font-bold text-cyan-300 hover:text-white cursor-pointer"
        >
          <RotateCw className={`w-3 h-3 transition-transform duration-500 ${isFlipped ? 'rotate-180' : ''}`} />
          <span>{isFlipped ? 'Mặt trước' : 'Lật mặt sau'}</span>
        </button>
      </div>

      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={triggerCardFlip}
        title="Di chuột để nghiêng 3D • Nhấp để lật mặt sau Thẻ Học Sinh"
        className="hologram-card w-full cursor-pointer"
      >
        <div
          className="relative w-full transition-transform duration-700"
          style={{
            transformStyle: 'preserve-3d',
            transform: `perspective(1200px) rotateX(${tilt.rotateX}deg) rotateY(${
              tilt.rotateY + (isFlipped ? 180 : 0)
            }deg)`,
          }}
        >
          {/* Pulse shockwave ring on flip */}
          {pulseWave && (
            <div className="pointer-events-none absolute -inset-2 rounded-[32px] border-2 border-amber-400/60 animate-ping z-30" />
          )}

          {/* ==================== FRONT FACE ==================== */}
          <div
            className="hologram-inner pc-12-card relative rounded-[28px] p-6 overflow-hidden border border-white/20"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {/* Dynamic Interactive Specular Glare */}
            <div
              className="pointer-events-none absolute inset-0 transition-opacity duration-300 z-20"
              style={{
                opacity: glare.opacity,
                background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.45) 0%, rgba(251, 191, 36, 0.22) 28%, rgba(34, 211, 238, 0.14) 52%, transparent 72%)`,
                mixBlendMode: 'overlay',
              }}
            />

            {/* Animated Prismatic Foil Diagonal Sweep */}
            <div className="pointer-events-none absolute -inset-full w-[220%] h-[220%] bg-gradient-to-tr from-transparent via-white/10 to-transparent animate-sheen z-10" />

            {/* Subtle Laser Scan Line */}
            <div
              className="pointer-events-none absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent z-10 animate-pulse"
              style={{ top: `${Math.max(12, Math.min(88, glare.y))}%` }}
            />

            {/* Ambient Aura Glows */}
            <div
              className="pointer-events-none absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-35 transition-all duration-500"
              style={{ background: tier.accentColor }}
            />
            <div className="pointer-events-none absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-cyan-500/20 blur-3xl" />

            {/* Top Header: Institutional Crest & Hologram Chip */}
            <div className="relative z-10 flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-300 to-cyan-400 p-[1px] shadow-[0_0_16px_rgba(245,158,11,0.4)]">
                  <div className="w-full h-full bg-[#0a0f14]/90 rounded-[15px] flex items-center justify-center text-amber-400 font-bold text-sm font-['Playfair_Display'] italic">
                    F
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-amber-300/90 font-semibold">
                    F-FORUM STUDENT ID
                  </div>
                  <div className="text-[9px] font-mono text-neutral-400">
                    VERIFIED ACADEMIC PASS • {isSuperAdmin ? 'FOUNDER' : user.staffRole || user.role}
                  </div>
                </div>
              </div>

              {/* Blue Flame Streak Indicator inside Neumorphic Pill */}
              <div
                className="pc-12-pill flex items-center gap-1.5 px-3 py-1 border border-cyan-400/35"
                title={`Chuỗi hoạt động liên tiếp: ${streakCount} ngày`}
              >
                <Flame className="w-4 h-4 text-cyan-400 fill-cyan-400/40 animate-blue-flame" />
                <span className="text-xs font-mono font-bold text-cyan-300">
                  {streakCount}d
                </span>
              </div>
            </div>

            {/* Center: Student Avatar & Identity */}
            <div className="relative z-10 flex items-center gap-4 mb-5">
              <div className="relative shrink-0 group/avatar">
                {hasDiscordAvatarDeco ? (
                  <DecoratedAvatar
                    user={user}
                    size={80}
                    eager
                    priority="high"
                    alt={user.name}
                  />
                ) : (
                  <div
                    className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-transform duration-300 group-hover/avatar:scale-105 ${avatarFrameClass}`}
                  >
                    {avatarRarity === 'legendary' &&
                      Array.from({ length: 6 }, (_, idx) => (
                        <span
                          key={idx}
                          className="mythic-particle"
                          style={{ animationDelay: `${(-idx * 4) / 6}s` }}
                          aria-hidden="true"
                        />
                      ))}
                    <img
                      src={user.avatar}
                      alt={user.name}
                      onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                      loading="lazy"
                      decoding="async"
                      width={80}
                      height={80}
                      className="w-full h-full rounded-full object-cover bg-neutral-900"
                    />
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 drop-shadow-lg z-10">
                  <TierBadge level={user.level} size={28} showTooltip={false} />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className={`text-lg font-bold tracking-tight flex items-center gap-1.5 min-w-0 max-w-full ${isSuperAdmin ? 'discord-admin-name' : 'text-white'}`}>
                    <span className="truncate">{user.name.replace(/ \(.*\)/, '')}</span>
                  </h3>
                  {isSuperAdmin ? (
                    <AdminVerifiedBadge size={16} />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <PremiumMark user={user} compact />
                  {equippedCombo.mythicTitle && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-extrabold bg-gradient-to-r from-amber-500/25 via-pink-500/25 to-purple-500/25 text-amber-200 border border-amber-400/40">
                      <span className={`rarity-dot ${rarityDotClass(equippedCombo.highestRarity)}`} aria-hidden="true" />
                      <span>{equippedCombo.mythicTitle}</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-neutral-400 truncate mb-2 font-mono">
                  {user.className || 'Học Sinh F-Forum'} • {user.city || 'Việt Nam'}
                </p>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-amber-500/15 border border-amber-400/35 text-amber-300">
                  <Sparkles className="w-3 h-3" />
                  <span>
                    Lv.{user.level} • {isSuperAdmin ? ' Quản Trị Viên Tối Cao' : `${tier.roman}. ${tier.titleVi}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Bio Quote inside 3D Neumorphic Inset Well */}
            <div className="relative z-10 mb-5 px-3.5 py-2.5 pc-12-well">
              <p className="text-xs text-neutral-300 italic line-clamp-2 leading-relaxed">
                &ldquo;{user.bio || 'Chưa cập nhật tiểu sử học thuật.'}&rdquo;
              </p>
            </div>

            {/* Telemetry Stats Grid (3D Neumorphic Inset Wells) */}
            <div className="relative z-10 grid grid-cols-3 gap-2.5 mb-4">
              <div className="pc-12-well p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] font-mono uppercase text-neutral-400 mb-0.5">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>F-Point</span>
                </div>
                <div className="text-sm font-bold font-mono text-amber-300">
                  {fPoints.toLocaleString()}
                </div>
              </div>

              <div className="pc-12-well p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] font-mono uppercase text-neutral-400 mb-0.5">
                  <Coins className="w-3 h-3 text-yellow-400" />
                  <span>Coin</span>
                </div>
                <div className="text-sm font-bold font-mono text-yellow-300">
                  {formatCoinBalance(effectiveCoinBalance(user.role, user.coin))}
                </div>
              </div>

              <div className="pc-12-well p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] font-mono uppercase text-neutral-400 mb-0.5">
                  <Award className="w-3 h-3 text-emerald-400" />
                  <span>Lời Giải</span>
                </div>
                <div className="text-sm font-bold font-mono text-emerald-300">
                  {solutionsApprovedCount}
                </div>
              </div>
            </div>

            {/* Bottom Progress & Serial ID */}
            <div className="relative z-10">
              <div className="flex justify-between text-[10px] font-mono text-neutral-400 mb-1">
                <span>TIẾN ĐỘ HỌC THUẬT ({questionsAskedCount} câu hỏi)</span>
                <span className="text-amber-300 font-bold">{progress.percent}%</span>
              </div>
              <div className="w-full h-2 pc-12-well rounded-full overflow-hidden p-[1px]">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progress.percent}%`,
                    background: `linear-gradient(90deg, ${tier.accentColor}, #fbbf24, #38bdf8)`,
                  }}
                />
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-neutral-400">
                <span>ID: #{user.id.toUpperCase().slice(0, 12)}</span>
                <span className="text-amber-400/90 flex items-center gap-1">
                  <RotateCw className="w-2.5 h-2.5" /> Nhấp thẻ để lật 3D
                </span>
              </div>
            </div>
          </div>

          {/* ==================== BACK FACE (180 DEG FLIP) ==================== */}
          <div
            className="hologram-inner pc-12-card absolute inset-0 rounded-[28px] p-6 overflow-hidden border border-amber-500/35 flex flex-col justify-between"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            {/* Top Magnetic Strip */}
            <div>
              <div className="-mx-6 -mt-2 mb-4 h-10 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 border-y border-white/10 flex items-center justify-between px-6">
                <span className="text-[9px] font-mono tracking-[0.3em] text-amber-400/80 uppercase">
                  MAGNETIC SECURITY STRIP • F-PASS
                </span>
                <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> ACTIVE
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
                    Xác Thực Học Sinh F-Forum
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  VERIFIED PASS
                </span>
              </div>
            </div>

            <div className="my-auto py-3 flex items-center gap-4">
              {/* Simulated QR Verification Matrix inside 3D Well */}
              <div className="w-24 h-24 rounded-2xl pc-12-well p-2.5 flex flex-col items-center justify-center shrink-0">
                <QrCode className="w-14 h-14 text-amber-400" />
                <span className="text-[8px] font-mono text-neutral-400 mt-1">
                  F-PASS AUTH
                </span>
              </div>

              <div className="space-y-1.5 text-xs flex-1 min-w-0">
                <div className="text-white font-bold truncate">{user.name}</div>
                <div className="text-neutral-300 text-[11px] font-mono">
                  Cấp độ: <span className="text-amber-300 font-bold">Lv.{user.level}</span> ({tier.titleVi})
                </div>
                <div className="text-neutral-300 text-[11px] font-mono">
                  Tích lũy: <span className="text-emerald-300 font-bold">{fPoints.toLocaleString()} XP</span> •{' '}
                  <span className="text-yellow-300 font-bold">{formatCoinBalance(effectiveCoinBalance(user.role, user.coin))} Coin</span>
                </div>
                <div className="text-neutral-400 text-[10px] leading-relaxed pt-1">
                  Thẻ định danh học thuật dùng để tham gia CLB, hỏi đáp tích điểm và mở khóa đặc quyền trên F-Forum.
                </div>
              </div>
            </div>

            <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-neutral-400">
              <span>BẢN QUYỀN © F-FORUM</span>
              <span className="flex items-center gap-1 text-amber-400">
                <RotateCw className="w-3 h-3" /> Nhấp để quay lại mặt trước
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HologramStudentCard;
