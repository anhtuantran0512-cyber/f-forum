/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useMemo, useState } from 'react';
import { X, Award, Trophy, Sparkles, Target, CheckCircle2, Lock, TrendingUp } from 'lucide-react';
import { TIER_CONFIGS, getTierForLevel, xpThresholdForLevel } from '../utils/tier';
import { TITLE_CONFIGS } from '../utils/titles';
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
  { action: 'Đặt câu hỏi cho cộng đồng', reward: '+50 XP · +50 điểm', note: 'Bảng xếp hạng đóng góp' },
  { action: 'Gửi lời giải cho một câu hỏi', reward: '+25 XP · +25 điểm', note: 'Mỗi lời giải được duyệt' },
  { action: 'Được xác nhận Đáp án chuẩn', reward: '+100 XP · +50% Coin thưởng', note: 'Cộng thêm khi tác giả xác nhận' },
  { action: 'Nhắn tin trong cộng đồng', reward: '+2 điểm', note: 'Tính vào bảng đóng góp' },
  { action: 'Hoàn thành phiên tập trung 25′', reward: '+25 XP · ghi 25′ giờ học', note: 'Bảng xếp hạng giờ học' },
  { action: 'Điểm danh mỗi ngày', reward: '+25 Coin', note: 'Chuỗi ngày mốc 5 · 10 · 15 mở hộp quà' },
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

      <div className="relative w-full max-w-[440px] max-h-[86vh] flex flex-col rounded-[26px] pc-12-shell p-3.5 text-white shadow-[0_40px_120px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black font-mono shrink-0"
              style={{
                background: `linear-gradient(135deg, ${tier.badgeColor}44, ${tier.badgeColor}12)`,
                border: `1px solid ${tier.badgeColor}66`,
                color: tier.badgeColor,
              }}
            >
              {tier.roman}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold leading-tight truncate">
                {isSuperAdmin ? 'Quản Trị Viên Tối Cao' : tier.titleVi}
              </h3>
              <p className="text-[10.5px] text-neutral-400 leading-tight">
                Cấp {level} • {xp.toLocaleString('vi-VN')} XP • {earnedCount}/{badges.length} danh hiệu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer shrink-0"
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
            <span className="text-amber-300 font-semibold">
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
          <p className="text-[10px] text-neutral-500 mt-1">
            Còn {levelProgress.remaining.toLocaleString('vi-VN')} XP để lên cấp tiếp theo
          </p>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1 mt-3 p-1 rounded-2xl bg-black/40 border border-white/10 shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-selected={tab === t.id}
              role="tab"
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                tab === t.id
                  ? 'bg-gradient-to-r from-amber-400/90 to-yellow-300/80 text-neutral-950 shadow-md'
                  : 'text-neutral-300 hover:text-white hover:bg-white/5'
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
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black font-mono shrink-0"
                        style={{
                          background: `${t.badgeColor}22`,
                          border: `1px solid ${t.badgeColor}66`,
                          color: t.badgeColor,
                        }}
                      >
                        {t.roman}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-bold text-white truncate">{t.name}</span>
                          {isCurrent && (
                            <span className="text-[9.5px] font-bold px-1.5 py-px rounded-full bg-amber-400 text-neutral-950 shrink-0">
                              Bạn ở đây
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-400 font-mono">
                          Lv.{t.minLevel}–{t.maxLevel} • từ {startThreshold.toLocaleString('vi-VN')} XP
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
              <p className="signature-section-label">30 danh hiệu · mỗi 5 cấp mở một dấu mốc</p>
              <div className="signature-title-grid">
                {TITLE_CONFIGS.map((title) => <div key={title.id} className={`signature-title ${level >= title.minLevel ? 'is-earned' : 'is-locked'}`} title={`${title.name} · ${title.iconDescription} · cấp ${title.minLevel}`}>
                  <SignatureEmblem icon={title.icon} rarity={title.rarity} size={38} />
                  <span><strong>{title.name}</strong><small>Lv.{title.minLevel} · {title.rarity === 'common' ? 'Thường' : title.rarity === 'rare' ? 'Hiếm' : title.rarity === 'epic' ? 'Sử thi' : 'Huyền thoại'}</small></span>
                </div>)}
              </div>
              <p className="signature-section-label">Huy hiệu hoạt động</p>
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
                      <p className="text-[10.5px] text-neutral-300 leading-snug">{b.desc}</p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">Yêu cầu: {b.requirement}</p>

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
                              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-amber-300"
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
              <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-2.5 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-100 leading-snug">
                  XP và Coin cộng song song (1 XP = 1 Coin). Cấp độ được tính từ tổng XP:{' '}
                  <span className="font-mono font-bold">Lv.L = 140·(L−1) + 1.08·(L−1)² XP</span>.
                </p>
              </div>

              {REQUIREMENT_ROWS.map((r) => (
                <div
                  key={r.action}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-semibold text-white leading-tight">{r.action}</p>
                    <p className="text-[10px] text-neutral-500">{r.note}</p>
                  </div>
                  <span className="text-[10.5px] font-mono font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-400/25 rounded-full px-2 py-0.5 shrink-0">
                    {r.reward}
                  </span>
                </div>
              ))}

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2.5">
                <p className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-300" />
                  Mẹo lên hạng nhanh
                </p>
                <ul className="mt-1.5 space-y-1 text-[10.5px] text-neutral-300 leading-snug list-disc pl-4">
                  <li>Mỗi ngày: điểm danh (+25) và một phiên tập trung 25′ (+25 XP).</li>
                  <li>Trả lời câu hỏi đang mở — được xác nhận Đáp án chuẩn là mốc cộng lớn nhất.</li>
                  <li>Giữ chuỗi ngày để mở hộp quà mốc 5 · 10 · 15 (30–200 Coin).</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TierRankSheet;
