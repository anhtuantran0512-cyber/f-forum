import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  HelpCircle,
  Trophy,
  ChevronRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import type { DimensionView } from '../types';

interface HardwareShowcaseProps {
  onNavigate?: (view: DimensionView) => void;
  className?: string;
}

export const HardwareShowcase: React.FC<HardwareShowcaseProps> = ({
  onNavigate,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'qa' | 'cbt' | 'leaderboard'>('qa');
  const [selectedCbtAnswer, setSelectedCbtAnswer] = useState<number | null>(1);

  return (
    <div className={`hardware-showcase-wrapper relative flex flex-col items-center justify-center ${className}`}>
      <div className="absolute -inset-10 -z-10 rounded-[60px] bg-gradient-to-tr from-amber-500/10 via-emerald-500/10 to-indigo-500/10 blur-3xl opacity-70 pointer-events-none" />

      <div
        className="iphone-shell relative flex items-center justify-center p-[4px] select-none"
        style={{
          width: '376px',
          minWidth: '376px',
          height: '794px',
          borderRadius: '47px',
          boxShadow:
            '0 0 0 1px #7c817f, 0 0 0 3px #202424, 0 0 0 4px #535a56, 30px 40px 70px rgba(32, 44, 33, 0.25)',
          background: '#0d1110',
        }}
      >
        <div
          className="steel-rim w-full h-full relative flex flex-col items-center p-[8px]"
          style={{
            borderRadius: '43px',
            background:
              'linear-gradient(100deg, #7e8481, #2c3230 1.3%, #0b0d0d 4%, #050707, #0d1110 96%, #727876 98.7%, #202523)',
          }}
        >
          <div
            className="iphone-bezel w-full h-full relative flex flex-col items-center bg-[#07090b] overflow-hidden"
            style={{ borderRadius: '37px' }}
          >
            <div className="w-full h-[62px] relative flex flex-col items-center justify-center shrink-0">
              <div
                className="sensor-dot w-[7px] h-[7px] rounded-full bg-[#151c20] mb-2 shadow-inner"
                style={{ border: '1px solid rgba(255, 255, 255, 0.05)' }}
              />

              <div className="flex items-center justify-center relative w-full">
                <div
                  className="front-camera absolute left-[120px] w-[11px] h-[11px] rounded-full bg-[#0d151c] flex items-center justify-center shadow-inner"
                  style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <div className="w-[4px] h-[4px] rounded-full bg-[#1b354b]/80" />
                </div>

                <div
                  className="earpiece-slot w-[56px] h-[7px] rounded-full bg-[#131718] flex items-center justify-center shadow-inner"
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)',
                  }}
                >
                  <div className="w-[48px] h-[2px] rounded-full bg-[#242b2d] opacity-70" />
                </div>
              </div>
            </div>

            <div
              className="iphone-screen relative w-[326px] h-[582px] bg-[#0b0d12] rounded-[6px] overflow-hidden flex flex-col border border-white/5 text-left"
              style={{
                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.85)',
              }}
            >
              <div className="h-6 w-full px-4 flex items-center justify-between text-[10px] font-mono font-bold text-white/70 bg-[#0e121a]/95 border-b border-white/5 shrink-0 z-20">
                <span>09:41</span>
                <span className="text-[9px] uppercase tracking-wider text-amber-400 font-extrabold">F-FORUM 2027</span>
                <div className="flex items-center gap-1.5 text-[9px]">
                  <span>5G</span>
                  <div className="w-4 h-2 rounded-[2px] border border-white/60 p-[1px]">
                    <div className="w-full h-full bg-emerald-400 rounded-[1px]" />
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-[#121620]/90 border-b border-white/10 shrink-0 z-10 backdrop-blur-md">
                <div className="grid grid-cols-3 gap-1 bg-[#090b10] p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setActiveTab('qa')}
                    className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                      activeTab === 'qa'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Hỏi đáp
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('cbt')}
                    className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                      activeTab === 'cbt'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-sm'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Thi CBT
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('leaderboard')}
                    className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                      activeTab === 'leaderboard'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 shadow-sm'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Vinh danh
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar select-none bg-gradient-to-b from-[#0b0d12] via-[#0d1017] to-[#090b0e]">
                {activeTab === 'qa' && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="p-3 rounded-xl bg-[#131722]/90 border border-white/10 hover:border-amber-400/30 transition-all shadow-md">
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-[#81b29a]/20 text-emerald-300 border border-[#81b29a]/40">
                          Toán học · Lớp 12
                        </span>
                        <span className="text-[9px] font-mono text-white/50">15 phút trước</span>
                      </div>

                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1 shadow-sm">
                          <Coins className="w-2.5 h-2.5 text-amber-400" />
                          +50 Điểm Thưởng (Bounty)
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white mb-1.5 leading-snug">
                        Tìm nguyên hàm hàm ẩn f(x) + x·f&apos;(x) = cos(x) với f(π/2) = 1?
                      </h4>
                      <p className="text-[11px] text-white/70 line-clamp-2 leading-relaxed">
                        Em đang bị vướng chỗ nhân cả 2 vế cho thừa số tích phân để đưa về đạo hàm của một tích...
                      </p>

                      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Đã kiểm chứng bởi Thủ khoa
                        </span>
                        <span className="text-[9px] text-amber-300 font-semibold flex items-center gap-0.5">
                          Xem lời giải <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#131722]/70 border border-white/10 hover:border-white/20 transition-all">
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/40">
                          Vật lý · Dao động cơ
                        </span>
                        <span className="text-[9px] font-mono text-white/50">Vừa xong</span>
                      </div>

                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                          <Coins className="w-2.5 h-2.5 text-amber-400" />
                          +30 Bounty
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white mb-1.5 leading-snug">
                        Con lắc lò xo treo thẳng đứng khi thang máy đi xuống nhanh dần đều?
                      </h4>
                      <div className="mt-2 flex items-center justify-between text-[9px] text-white/50">
                        <span>2 lời giải chi tiết</span>
                        <span className="text-white/70">Chờ Thủ khoa duyệt</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'cbt' && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="p-3 rounded-xl bg-[#131722]/90 border border-emerald-500/30 shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9.5px] font-bold font-mono text-emerald-400 flex items-center gap-1">
                          <Cpu className="w-3 h-3" /> PHÒNG THI CBT 2027
                        </span>
                        <span className="text-[10px] font-mono font-extrabold text-amber-300 px-1.5 py-0.5 rounded bg-black/40 border border-amber-400/30 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> 38:42
                        </span>
                      </div>

                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-2.5">
                        <div className="bg-emerald-400 h-full w-[42%]" />
                      </div>

                      <p className="text-[11px] font-semibold text-white mb-2 leading-relaxed">
                        Câu 14: Giới hạn lim (x→0) của [ln(1 + 3x)] / sin(2x) bằng bao nhiêu?
                      </p>

                      <div className="space-y-1.5">
                        {[
                          { id: 0, text: 'A. 0' },
                          { id: 1, text: 'B. 3/2' },
                          { id: 2, text: 'C. 2/3' },
                          { id: 3, text: 'D. 1' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setSelectedCbtAnswer(opt.id)}
                            className={`w-full text-left p-2 rounded-lg text-[10.5px] font-mono flex items-center justify-between transition-all ${
                              selectedCbtAnswer === opt.id
                                ? 'bg-emerald-500/25 border border-emerald-400 text-emerald-200'
                                : 'bg-black/30 border border-white/5 text-white/80 hover:bg-white/5'
                            }`}
                          >
                            <span>{opt.text}</span>
                            {selectedCbtAnswer === opt.id && <Check className="w-3 h-3 text-emerald-400" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between text-[10px] text-white/70">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" /> Hệ thống chống gian lận AI
                      </span>
                      <span className="font-mono text-emerald-300">Đang giám sát</span>
                    </div>
                  </div>
                )}

                {activeTab === 'leaderboard' && (
                  <div className="space-y-2.5 animate-fade-in">
                    <div className="text-center pb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 font-mono">
                        Bảng Vàng Thủ Khoa Tuần
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-400/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-500 text-black font-extrabold text-[10px] flex items-center justify-center shadow-md">
                          1
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-white flex items-center gap-1">
                            Nguyễn Minh Khôi <Trophy className="w-3 h-3 text-amber-400" />
                          </div>
                          <div className="text-[9px] text-white/60">Trạng Nguyên · 48 giải đáp</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-extrabold text-amber-300">3,420 XP</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-300 text-black font-extrabold text-[10px] flex items-center justify-center">
                          2
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-white">Trần Thùy Linh</div>
                          <div className="text-[9px] text-white/60">Bảng Nhãn · 42 giải đáp</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-extrabold text-slate-300">2,980 XP</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-700 text-white font-extrabold text-[10px] flex items-center justify-center">
                          3
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-white">Lê Quốc Bảo</div>
                          <div className="text-[9px] text-white/60">Thám Hoa · 36 giải đáp</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-extrabold text-amber-400">2,650 XP</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-2 bg-[#0d1017] border-t border-white/10 flex items-center justify-around shrink-0 text-white/60">
                <button
                  type="button"
                  onClick={() => onNavigate?.('qa')}
                  className="flex flex-col items-center gap-0.5 text-[9px] hover:text-amber-300 transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Diễn đàn</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.('exam-vault')}
                  className="flex flex-col items-center gap-0.5 text-[9px] hover:text-emerald-300 transition-colors"
                >
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Kho đề</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.('home')}
                  className="flex flex-col items-center gap-0.5 text-[9px] hover:text-indigo-300 transition-colors"
                >
                  <Trophy className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Vinh danh</span>
                </button>
              </div>
            </div>

            <div className="w-full h-[74px] flex items-center justify-center shrink-0">
              <div
                className="w-[52px] h-[52px] rounded-full bg-[#0a0c0e] flex items-center justify-center shadow-inner cursor-pointer hover:border-amber-400/40 transition-colors"
                style={{
                  border: '1.5px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.85), 0 1px 1px rgba(255,255,255,0.06)',
                }}
              >
                <div
                  className="w-[18px] h-[18px] rounded-[5px]"
                  style={{ border: '1.5px solid rgba(255, 255, 255, 0.28)' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HardwareShowcase;
