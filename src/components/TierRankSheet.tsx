/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useMemo, useState } from 'react';
import { X, Award, Trophy, Target, CheckCircle2, Lock } from 'lucide-react';
import { TIER_CONFIGS, getTierForLevel, xpThresholdForLevel } from '../utils/tier';
import { TITLE_CONFIGS } from '../utils/titles';
import { TierSvg } from './Badges10Tier';
import { SignatureEmblem } from './SignatureEmblem';
import './ProfileSignature.css';

/* ==========================================================================
   BẢNG RANK & DANH HIỆU (GUI nhỏ mở từ khối "Danh hiệu" trong hồ sơ)
   --------------------------------------------------------------------------
   Ba tab:
     • Bảng rank    — 8 bậc danh hiệu, mốc cấp & mốc XP thật của hệ thống
     • Danh hiệu    — huy hiệu đã mở/chưa mở kèm tiến độ yêu cầu
     • Yêu cầu      — cách kiếm XP/điểm và điều kiện thăng hạng
   Số liệu lấy đúng công thức của store: XP mốc cấp = 140·(L-1) + 1.08·(L-1)².
   ========================================================================== */

export interface SheetBadge {
  id: string;
  name: string;
  desc: string;
  requirement: string;
  IconComponent: React.ComponentType<{ className?: string }>;
  color: string;
  earned: boolean;
  progress: { current: number; target: number; unit: string };
}

interface TierRankSheetProps {
  isOpen: boolean;
  onClose: () => void;
  level: number;
  xp: number;
  badges: SheetBadge[];
  isSuperAdmin?: boolean;
}

type SheetTab = 'rank' | 'titles' | 'requirements';

const TABS: { id: SheetTab; label: string; icon: React.ReactNode }[] = [
  { id: 'rank', label: 'Bảng rank', icon: <Trophy className="w-3.5 h-3.5" /> },
  { id: 'titles', label: 'Danh hiệu', icon: <Award className="w-3.5 h-3.5" /> },
  { id: 'requirements', label: 'Yêu cầu', icon: <Target className="w-3.5 h-3.5" /> },
];

const REQUIREMENT_ROWS: { action: string; reward: string; note: string }[] = [
  { action: 'Đặt câu hỏi', reward: '+50 XP · +50 điểm', note: '' },
  { action: 'Gửi lời giải', reward: '+25 XP · +25 điểm', note: '' },
  { action: 'Đáp án chuẩn', reward: '+100 XP · +50% Coin', note: '' },
  { action: 'Nhắn tin cộng đồng', reward: '+2 điểm', note: '' },
  { action: 'Phiên tập trung 25′', reward: '+25 XP · +25′ học', note: '' },
  { action: 'Điểm danh mỗi ngày', reward: '+25 Coin', note: '' },
];

export const TierRankSheet: React.FC<TierRankSheetProps> = ({
  isOpen,
  onClose,
  level,
  xp,
  badges,
  isSuperAdmin = false,
}) => {
  const [tab, setTab] = useState<SheetTab>('rank');

  /* Esc luôn đóng được — không bao giờ kẹt trong GUI nhỏ */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const tier = useMemo(() => getTierForLevel(level), [level]);

  const levelProgress = useMemo(() => {
    const safeLevel = Math.max(1, Math.min(150, level));
    const currentFloor = xpThresholdForLevel(safeLevel);
    const nextFloor = safeLevel >= 150 ? currentFloor : xpThresholdForLevel(safeLevel + 1);
    const span = Math.max(1, nextFloor - currentFloor);
    const into = Math.max(0, xp - currentFloor);
    return {
      into,
      span,
      remaining: Math.max(0, nextFloor - xp),
      percent: safeLevel >= 150 ? 100 : Math.max(0, Math.min(100, Math.round((into / span) * 100))),
    };
  }, [level, xp]);

  const earnedCount = badges.filter((b) => b.earned).length;

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bảng rank, danh hiệu và yêu cầu"
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-up"
    >
      {/* Bấm ra ngoài để đóng (tấm phủ nhìn thấy được, không bao giờ vô hình) */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Đóng bảng rank"
        onClick={onClose}
        className="absolute inset-0 bg-transparent border-none outline-none cursor-default"
      />

      <div className="relative w-full max-w-[540px] max-h-[86vh] flex flex-col rounded-[26px] pc-12-shell p-4 sm:p-5 text-white shadow-[0_40px_120px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: `linear-gradient(135deg, ${tier.badgeColor}30, ${tier.badgeColor}0d)`,
                border: `1px solid ${tier.badgeColor}66`,
              }}
            >
              <TierSvg tierNumber={tier.tierNumber} size={34} />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold uppercase tracking-wide leading-tight truncate flex items-center gap-1.5 text-[#f4f1de]">
                <span>{isSuperAdmin ? 'Quản Trị Viên Tối Cao' : `${tier.roman}. ${tier.titleVi}`}</span>
              </h3>
              <p className="text-[10.5px] font-mono text-[#9a978e] leading-tight mt-0.5">
                Lv.{level} · {xp.toLocaleString('vi-VN')} XP · {earnedCount}/{badges.length} huy hiệu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="ff-tactile-btn p-1.5 rounded-xl bg-[#0b0d12] border border-white/15 text-white/70 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tiến độ cấp hiện tại */}
        <div className="pt-3 shrink-0">
          <div className="flex items-center justify-between text-[10.5px] text-neutral-400 mb-1">
            <span className="font-mono">
              {levelProgress.into.toLocaleString('vi-VN')} / {levelProgress.span.toLocaleString('vi-VN')} XP
            </span>
            <span className="text-[#f2cc8f] font-semibold font-mono">
              {levelProgress.percent}% → Lv.{Math.min(150, level + 1)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${levelProgress.percent}%`,
                background: `linear-gradient(90deg, ${tier.badgeColor}, #fbbf24)`,
              }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1.5 mt-3 p-1 rounded-2xl bg-[#0b0d12] border border-white/12 shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-selected={tab === t.id}
              role="tab"
              className={`ff-tactile-btn flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
                tab === t.id
                  ? 'bg-[#f4f1de] text-[#0b0d12] border border-[#0b0d12]'
                  : 'text-neutral-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Nội dung */}
        <div className="flex-1 overflow-y-auto no-scrollbar mt-3 space-y-2 pr-0.5">
          {tab === 'rank' && (
            <>
              {TIER_CONFIGS.map((t) => {
                const isCurrent = t.tierNumber === tier.tierNumber;
                const nextThreshold = t.maxLevel >= 150 ? xpThresholdForLevel(150) : xpThresholdForLevel(t.maxLevel + 1);
                const startThreshold = xpThresholdForLevel(t.minLevel);
                const span = Math.max(1, nextThreshold - startThreshold);
                const percent = isCurrent
                  ? Math.max(0, Math.min(100, Math.round(((xp - startThreshold) / span) * 100)))
                  : 0;
                return (
                  <div
                    key={t.tierNumber}
                    className={`rounded-2xl border p-2.5 transition-colors ${
                      isCurrent
                        ? 'border-amber-400/50 bg-amber-500/10'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: `${t.badgeColor}18`,
                          border: `1px solid ${t.badgeColor}55`,
                        }}
                      >
                        <TierSvg tierNumber={t.tierNumber} size={30} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="text-[10px] font-black font-mono px-1.5 py-0.5 rounded"
                            style={{ background: `${t.badgeColor}22`, color: t.badgeColor }}
                          >
                            Cấp {t.tierNumber} · {t.roman}
                          </span>
                          <span className="text-[12px] font-bold text-white truncate">{t.name}</span>
                          {isCurrent && (
                            <span className="text-[9.5px] font-bold px-1.5 py-px rounded-full bg-amber-400 text-neutral-950 shrink-0">
                              Bạn ở đây
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-400 font-mono">
                          {t.minPoints.toLocaleString('vi-VN')} điểm · Lv.{t.minLevel}–{t.maxLevel} · {startThreshold.toLocaleString('vi-VN')} XP
                        </p>
                      </div>
                    </div>
                    {isCurrent && (
                      <div className="mt-2">
                        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percent}%`,
                              background: `linear-gradient(90deg, ${t.badgeColor}, #fbbf24)`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {tab === 'titles' && (
            <>
              <p className="signature-section-label">Danh hiệu cấp độ</p>
              <div className="signature-title-grid">
                {TITLE_CONFIGS.map((title) => <div key={title.id} className={`signature-title ${level >= title.minLevel ? 'is-earned' : 'is-locked'}`} title={`${title.name} · Lv.${title.minLevel}`}>
                  <SignatureEmblem icon={title.icon} rarity={title.rarity} size={38} />
                  <span><strong>{title.name}</strong><small>Lv.{title.minLevel} · {title.rarity === 'common' ? 'Thường' : title.rarity === 'rare' ? 'Hiếm' : title.rarity === 'epic' ? 'Sử thi' : 'Huyền thoại'}</small></span>
                </div>)}
              </div>
              <p className="signature-section-label">Huy hiệu</p>
              {badges.map((b) => (
                <div
                  key={b.id}
                  className={`rounded-2xl border p-2.5 ${b.earned ? b.color : 'border-white/10 bg-white/[0.03]'}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center shrink-0">
                      {b.earned ? (
                        <b.IconComponent className="w-4 h-4" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-neutral-400" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-bold text-white truncate">{b.name}</span>
                        {b.earned && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Yêu cầu: {b.requirement}</p>

                      {!b.earned && b.progress.target > 0 && (
                        <div className="mt-1.5">
                          <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-0.5">
                            <span className="font-mono">
                              {Math.min(b.progress.current, b.progress.target)}/{b.progress.target} {b.progress.unit}
                            </span>
                            <span>{Math.round((Math.min(b.progress.current, b.progress.target) / b.progress.target) * 100)}%</span>
                          </div>
                          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#e07a5f] to-[#f2cc8f]"
                              style={{
                                width: `${Math.min(100, Math.round((b.progress.current / b.progress.target) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === 'requirements' && (
            <>
              {REQUIREMENT_ROWS.map((r) => (
                <div
                  key={r.action}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-semibold text-white leading-tight">{r.action}</p>
                  </div>
                  <span className="text-[10.5px] font-mono font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-400/25 rounded-full px-2 py-0.5 shrink-0">
                    {r.reward}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TierRankSheet;
