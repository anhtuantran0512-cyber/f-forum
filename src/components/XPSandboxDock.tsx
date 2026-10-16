/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ChevronUp, Zap } from 'lucide-react';
import { TierBadge, TierSvg } from './Badges10Tier';
import { TIER_CONFIGS, getTierForLevel } from '../utils/tier';
import { getXPForLevel } from '../store/forumStore';

interface XPSandboxDockProps {
  level: number;
  xp: number;
  onAddXP: (amount: number) => void;
}

export const XPSandboxDock: React.FC<XPSandboxDockProps> = ({
  level,
  xp,
  onAddXP,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tier = getTierForLevel(level);

  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  const currentLevelBaseXP = getXPForLevel(level);
  const nextLevelBaseXP = getXPForLevel(Math.min(150, level + 1));
  const range = Math.max(1, nextLevelBaseXP - currentLevelBaseXP);
  const progress =
    level >= 150
      ? 100
      : Math.min(100, Math.max(0, Math.round(((xp - currentLevelBaseXP) / range) * 100)));

  return (
    <div ref={containerRef} className="fixed bottom-4 left-4 z-40 select-none">
      {/* Expanded XP Booster Panel (Upward Expansion) */}
      {isExpanded && (
        <div className="modal-container absolute bottom-[calc(100%+10px)] left-0 w-72 liquid-glass backdrop-blur-2xl p-4 animate-fade-up space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <TierBadge level={level} size={20} showTooltip={false} />
              <div>
                <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                  <span>{tier.roman}. {tier.name}</span>
                  <span className="text-amber-400">Lv.{level}</span>
                </div>
                <div className="text-[10px] text-white/60 font-mono truncate max-w-[165px]">
                  {tier.description}
                </div>
              </div>
            </div>

            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/25 font-bold">
              {xp.toLocaleString()} Coin
            </span>
          </div>

          {/* 8 Cấp Độ Tre Việt Preview */}
          <div className="space-y-1">
            <span className="text-[9.5px] font-mono uppercase tracking-wider text-emerald-300/85 block">
              8 Cấp Độ Tre Việt:
            </span>
            <div className="grid grid-cols-4 gap-1">
              {TIER_CONFIGS.map((t) => {
                const isCurrent = t.tierNumber === tier.tierNumber;
                return (
                  <div
                    key={t.tierNumber}
                    title={`Cấp ${t.tierNumber}: ${t.name} (${t.minPoints} điểm) — ${t.description}`}
                    className={`flex flex-col items-center justify-center p-1 rounded-xl border ${
                      isCurrent
                        ? 'bg-white/10 border-amber-400/60'
                        : 'bg-white/[0.03] border-white/10 opacity-75'
                    }`}
                  >
                    <TierSvg tierNumber={t.tierNumber} size={22} />
                    <span className="text-[8.5px] font-bold text-white/85 truncate max-w-full mt-0.5">
                      {t.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Level Gauge Progress */}
          <div>
            <div className="flex justify-between text-[10px] font-mono text-white/70 mb-1.5">
              <span>Cấp {level}</span>
              <span className="text-amber-300 font-semibold">
                {level >= 150 ? 'CẤP TỐI ĐA (MAX)' : `${progress}% tới Cấp ${level + 1}`}
              </span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 rounded-full transition-all duration-500 relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>

          {/* 5 Coin Testing Buttons */}
          <div className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wider flex items-center gap-1.5 pt-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Nạp Coin Thử Nghiệm:</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => onAddXP(25)}
              className="py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-[10px] font-mono font-semibold text-white/90 transition-all border border-white/10 cursor-pointer text-center"
            >
              +25 Coin
            </button>
            <button
              onClick={() => onAddXP(50)}
              className="py-1.5 px-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-[10px] font-mono font-semibold text-amber-300 transition-all border border-amber-500/30 cursor-pointer text-center"
            >
              +50 Coin
            </button>
            <button
              onClick={() => onAddXP(100)}
              className="py-1.5 px-2 rounded-xl bg-amber-500/25 hover:bg-amber-500/35 active:scale-95 text-[10px] font-mono font-semibold text-amber-200 transition-all border border-amber-400/40 cursor-pointer text-center"
            >
              +100 Coin
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onAddXP(250)}
              className="py-1.5 px-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 active:scale-95 text-[10px] font-mono font-semibold text-amber-300 transition-all border border-amber-400/30 flex items-center justify-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>+250 Coin</span>
            </button>
            <button
              onClick={() => onAddXP(1200)}
              className="py-1.5 px-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:opacity-90 active:scale-95 text-[10px] font-mono font-bold text-black transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-black" />
              <span>+1200 Coin</span>
            </button>
          </div>
        </div>
      )}

      {/* Sleek Glass Pill Trigger */}
      <button
        onClick={() => setIsExpanded(prev => !prev)}
        className="rounded-full bg-black/40 backdrop-blur-lg border border-white/10 px-4 py-2 hover:scale-105 transition-transform cursor-pointer flex items-center gap-3 text-xs shadow-[0_10px_30px_rgba(0,0,0,0.5)] focus:outline-none"
        title="Bảng Nạp Thử Nghiệm Coin & Xem Cấp Độ"
      >
        <div className="flex items-center gap-2">
          <TierBadge level={level} size={18} showTooltip={false} />
          <div className="flex flex-col text-left leading-none">
            <span className="font-bold text-white flex items-center gap-1 font-mono text-[11px]">
              COIN SANDBOX <span className="text-amber-400">Lv.{level}</span>
            </span>
            <span className="text-[9px] text-white/50 font-mono">
              {tier.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pl-1 text-white/60">
          <span className="text-[10px] font-mono text-amber-300 font-semibold">
            {xp.toLocaleString()} Coin
          </span>
          <ChevronUp
            className={`w-3.5 h-3.5 transition-transform duration-300 ${
              isExpanded ? 'rotate-180 text-amber-400' : 'text-white/60'
            }`}
          />
        </div>
      </button>
    </div>
  );
};

export default XPSandboxDock;
