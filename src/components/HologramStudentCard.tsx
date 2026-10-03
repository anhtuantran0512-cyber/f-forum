/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useRef } from 'react';
import type { User } from '../types';
import { TierBadge, AdminVerifiedBadge } from './Badges10Tier';
import { getTierForLevel } from '../utils/tier';
import { Flame, Sparkles, Shield, Wifi, Award } from 'lucide-react';
import { DEFAULT_AVATAR, handleImageError } from '../utils/mediaFallback';

interface HologramStudentCardProps {
  user: User;
}

export const HologramStudentCard: React.FC<HologramStudentCardProps> = ({ user }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });
  const [isFlipped, setIsFlipped] = useState(false);

  const isSuperAdmin = user.email === 'anhtuantran0512@gmail.com';
  const tier = getTierForLevel(user.level);
  const streakCount = user.streakCount ?? (isSuperAdmin ? 36 : user.role === 'CLUB_LEADER' ? 24 : 14);
  const fPoints = user.fPoints ?? user.xp;

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = containerRef.current || cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -16;
    const rotY = ((x - centerX) / centerX) * 16;

    setRotateX(rotX);
    setRotateY(rotY);

    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;
    setGlarePos({ x: glareX, y: glareY, opacity: 0.85 });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlarePos(prev => ({ ...prev, opacity: 0 }));
  };

  const currentRotY = isFlipped ? -rotateY : rotateY;

  return (
    <div className="w-full flex flex-col items-center">
      {/* 3D Hologram Card Container */}
      <button
        type="button"
        ref={containerRef as unknown as React.RefObject<HTMLButtonElement>}
        className="hologram-card w-full max-w-[420px] aspect-[1.586/1] cursor-pointer relative py-2 block text-left border-none bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => setIsFlipped(prev => !prev)}
        aria-label="Thẻ sinh viên 3D (Bấm để lật thẻ)"
        title="Di chuột để tương tác 3D tilt • Nhấp chuột để lật thẻ"
      >
        <div
          ref={cardRef}
          style={{
            transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${currentRotY + (isFlipped ? 180 : 0)}deg)`,
            transformStyle: 'preserve-3d',
          }}
          className="hologram-inner w-full h-full rounded-2xl relative overflow-hidden select-none p-4 sm:p-5 flex flex-col justify-between border border-white/30 backdrop-blur-2xl transition-transform duration-150 ease-out shadow-[0_25px_60px_rgba(0,0,0,0.85)]"
        >
          {/* Iridescent Gradient Sheen Overlay */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-30"
            style={{
              background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.45) 0%, rgba(56,189,248,0.25) 25%, rgba(192,132,252,0.2) 45%, rgba(251,191,36,0.15) 65%, transparent 85%)`,
              opacity: glarePos.opacity,
              mixBlendMode: 'color-dodge',
            }}
          />

          {/* Animated Iridescent Diagonal Rainbow Foil */}
          <div
            className="absolute inset-0 pointer-events-none opacity-30 animate-sheen z-20"
            style={{
              background:
                'linear-gradient(115deg, transparent 20%, rgba(56,189,248,0.3) 38%, rgba(244,114,182,0.35) 48%, rgba(251,191,36,0.3) 58%, transparent 75%)',
              backgroundSize: '200% 200%',
              mixBlendMode: 'screen',
            }}
          />

          {/* Deep Cyberpunk Carbon / Glass Foil Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-900/90 via-neutral-950/95 to-black/95 z-0" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-900/30 via-transparent to-purple-900/20 z-0" />

          {/* CARD FRONT SIDE (when !isFlipped) */}
          {!isFlipped ? (
            <div className="relative z-10 w-full h-full flex flex-col justify-between">
              {/* Card Header: Brand, NFC, Smart Chip */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Gold F-Logo */}
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 p-[1.5px] shadow-[0_0_12px_rgba(245,158,11,0.6)]">
                    <div className="w-full h-full bg-neutral-950 rounded-[7px] flex items-center justify-center">
                      <span className="font-extrabold text-amber-400 text-xs font-['Inter']">F</span>
                    </div>
                  </div>
                  <div>
                    <span className="font-extrabold tracking-wider text-xs sm:text-sm text-white block leading-tight font-['Inter']">
                      F-PASS • STUDENT ID
                    </span>
                    <span className="text-[9px] font-mono text-cyan-300 tracking-widest uppercase">
                      Campus Digital Passport
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-neutral-400">
                  <Wifi className="w-4 h-4 text-cyan-300 rotate-90" />
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-white border border-white/15">
                    {user.role}
                  </span>
                </div>
              </div>

              {/* Card Center: Avatar, Student Info, Roman Rank */}
              <div className="flex items-center gap-3.5 my-2">
                {/* Holographic Avatar with Cyan/Gold Ring */}
                <div className="relative shrink-0">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-cyan-400 via-purple-500 to-amber-400 blur-[3px] opacity-75 animate-pulse" />
                  <img
                    src={user.avatar}
                    alt={user.name}
                    onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                    loading="lazy"
                    decoding="async"
                    width={64}
                    height={64}
                    className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-white/80 shadow-2xl"
                  />
                  <div className="absolute -bottom-1 -right-1 z-10">
                    <TierBadge level={user.level} size={22} showTooltip={false} />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3
                      className={`text-sm sm:text-base font-bold truncate ${
                        isSuperAdmin ? 'discord-admin-name' : 'text-white'
                      }`}
                    >
                      {user.name}
                    </h3>
                    {isSuperAdmin && <AdminVerifiedBadge size={15} />}
                  </div>

                  <p className="text-[11px] text-neutral-300 truncate font-mono mt-0.5">
                    {user.className || 'FPT University Vietnam'} • {user.city || 'Hà Nội'}
                  </p>

                  {/* Rank Badge & Tier Specs */}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold">
                      <Award className="w-3 h-3 text-amber-400" />
                      Tier {tier.roman} (Lv.{user.level})
                    </span>

                    <span className="text-[10px] text-neutral-400 font-mono">
                      {tier.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer: F-Points, Blue Flame Streak, ID Barcode */}
              <div className="pt-2 border-t border-white/15 flex items-center justify-between">
                {/* F-Points */}
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 block font-mono">
                      F-Points
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold font-mono text-cyan-300">
                      {fPoints.toLocaleString()} <span className="text-[10px] text-cyan-400/80">PTS</span>
                    </span>
                  </div>
                </div>

                {/* Blue Flame Streak Count */}
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded-lg bg-cyan-950/60 text-cyan-300 border border-cyan-400/40 animate-blue-flame">
                    <Flame className="w-4 h-4 text-cyan-400 fill-cyan-400/80" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 block font-mono">
                      Blue Flame Streak
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold font-mono text-cyan-200 flex items-center gap-1">
                      {streakCount} Ngày <span className="text-[10px] text-cyan-400">🔥</span>
                    </span>
                  </div>
                </div>

                {/* Card Security Token */}
                <div className="hidden sm:block text-right">
                  <span className="text-[8px] uppercase tracking-widest text-neutral-400 font-mono block">
                    F-ID AUTH
                  </span>
                  <span className="text-[10px] font-mono text-neutral-300 tracking-wider">
                    {user.id.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* CARD BACK SIDE (when isFlipped) */
            <div
              className="relative z-10 w-full h-full flex flex-col justify-between"
              style={{ transform: 'rotateY(180deg)' }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    CHỨNG NHẬN DANH TÍNH ĐIỆN TỬ
                  </span>
                </div>
                <span className="text-[10px] font-mono text-cyan-400">VERIFIED PVC</span>
              </div>

              {/* Bio & Details */}
              <div className="my-2 space-y-1.5 text-xs text-neutral-300">
                <p className="italic text-[11px] text-neutral-200 line-clamp-2 bg-white/5 p-2 rounded-xl border border-white/10">
                  "{user.bio || 'Thành viên cộng đồng tri thức F-forum.'}"
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                  <div>
                    <span className="text-neutral-400">Email:</span>{' '}
                    <span className="text-white truncate block">{user.email}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400">Giới tính:</span>{' '}
                    <span className="text-white">{user.gender || 'Chưa cập nhật'}</span>
                  </div>
                </div>
              </div>

              {/* Magnetic Strip & Barcode Simulation */}
              <div className="pt-2 border-t border-white/15 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {/* Stylized Barcode */}
                  <div className="h-6 w-32 bg-white/20 rounded flex items-center justify-around px-1 overflow-hidden">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-full bg-white/80 ${i % 3 === 0 ? 'w-1' : i % 2 === 0 ? 'w-0.5' : 'w-1.5'}`}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-[9px] font-mono text-neutral-400">
                  Click để lật lại mặt trước
                </span>
              </div>
            </div>
          )}
        </div>
      </button>

      <div className="mt-2 text-[11px] text-neutral-400 flex items-center gap-2 font-mono">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span>Di chuột quanh thẻ để trải nghiệm hiệu ứng 3D Holographic Glare & Tilt</span>
      </div>
    </div>
  );
};

export default HologramStudentCard;
