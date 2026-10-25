/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState } from 'react';
import {
  Smartphone,
  Laptop,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  Trophy,
  ChevronRight,
  ShieldCheck,
  Check,
  RotateCcw,
  Calculator,
  CloudSun,
  FileText,
  Gamepad2,
  Phone,
  Compass,
  MessageCircle,
  Music,
  Lock,
  Flame,
  Award,
  Terminal,
  Folder,
} from 'lucide-react';
import type { DimensionView } from '../types';

interface HardwareShowcaseProps {
  onNavigate?: (view: DimensionView) => void;
  className?: string;
}

export const HardwareShowcase: React.FC<HardwareShowcaseProps> = ({
  className = '',
}) => {
  const [deviceType, setDeviceType] = useState<'iphone' | 'macbook'>('iphone');

  const [isIphoneHome, setIsIphoneHome] = useState(false);
  const [iphoneTab, setIphoneTab] = useState<'qa' | 'cbt' | 'leaderboard' | 'battle' | 'machi'>('qa');
  const [selectedCbtAnswer, setSelectedCbtAnswer] = useState<number | null>(1);
  const [iphoneMiniApp, setIphoneMiniApp] = useState<string | null>(null);

  const [isMacWindowOpen, setIsMacWindowOpen] = useState(true);
  const [macTab, setMacTab] = useState<'qa' | 'cbt' | 'battle' | 'machi'>('cbt');
  const [macCbtAnswer, setMacCbtAnswer] = useState<number | null>(0);

  return (
    <div className={`hardware-showcase-wrapper relative flex flex-col items-center justify-center ${className}`}>
      <div className="absolute -inset-10 -z-10 rounded-[60px] bg-gradient-to-tr from-amber-500/10 via-emerald-500/10 to-indigo-500/10 blur-3xl opacity-70 pointer-events-none" />

      <div className="mb-4 flex items-center justify-center gap-2 p-1.5 rounded-2xl bg-[#141b28]/90 border border-white/10 shadow-lg z-20 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setDeviceType('iphone')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
            deviceType === 'iphone'
              ? 'bg-amber-400 text-[#0b0d12] shadow-md font-black'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Điện Thoại (iPhone 16 Pro)</span>
        </button>

        <button
          type="button"
          onClick={() => setDeviceType('macbook')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
            deviceType === 'macbook'
              ? 'bg-amber-400 text-[#0b0d12] shadow-md font-black'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>Máy Tính (MacBook Pro)</span>
        </button>
      </div>

      {deviceType === 'iphone' ? (
        <div
          className="iphone-shell relative flex items-center justify-center p-[4px] select-none transition-all duration-300"
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
                  <div className="w-20 h-3.5 bg-black rounded-full flex items-center justify-center text-[8px] text-amber-300 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                    Dynamic Island
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px]">
                    <span>5G</span>
                    <div className="w-4 h-2 rounded-[2px] border border-white/60 p-[1px]">
                      <div className="w-full h-full bg-emerald-400 rounded-[1px]" />
                    </div>
                  </div>
                </div>

                {isIphoneHome ? (
                  <div className="flex-1 flex flex-col justify-between p-4 bg-gradient-to-b from-[#1a1429] via-[#0d1020] to-[#080a14] select-none text-center">
                    <div className="pt-2">
                      <div className="text-3xl font-light text-white tracking-tight font-sans">09:41</div>
                      <div className="text-[11px] text-white/60 font-medium">Thứ Bảy, 25 Tháng 10</div>
                    </div>

                    {iphoneMiniApp ? (
                      <div className="p-4 rounded-2xl bg-black/70 border border-white/10 text-left space-y-2 animate-fade-in my-auto">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <span className="text-xs font-bold text-white">{iphoneMiniApp}</span>
                          <button
                            type="button"
                            onClick={() => setIphoneMiniApp(null)}
                            className="text-white/50 hover:text-white text-xs"
                          >
                            Đóng
                          </button>
                        </div>
                        <p className="text-[11px] text-white/70 leading-relaxed">
                          Ứng dụng tiện ích hệ thống đang chạy giả lập trên thiết bị. Bạn có thể mở ứng dụng F-Forum để tiếp tục luyện thi!
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-y-4 gap-x-2 my-auto px-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsIphoneHome(false);
                            setIphoneMiniApp(null);
                          }}
                          title="Mở ứng dụng F-Forum"
                          aria-label="Mở ứng dụng F-Forum"
                          className="flex flex-col items-center gap-1.5 group cursor-pointer"
                        >
                          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-[#FBF2E1] flex items-center justify-center shadow-lg border-2 border-[#FBF2E1] group-hover:scale-105 transition-transform">
                            <span className="text-lg font-black font-serif text-[#2B2331]">F</span>
                          </div>
                          <span className="text-[10.5px] font-bold text-white tracking-wide">F-Forum</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIphoneMiniApp('Đồng hồ Pomodoro')}
                          className="flex flex-col items-center gap-1.5 group cursor-pointer"
                        >
                          <div className="w-13 h-13 rounded-2xl bg-[#1e293b] flex items-center justify-center shadow-md border border-white/10 group-hover:scale-105 transition-transform text-cyan-300">
                            <Clock className="w-6 h-6" />
                          </div>
                          <span className="text-[10.5px] font-medium text-white/80">Đồng hồ</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIphoneMiniApp('Máy tính bỏ túi')}
                          className="flex flex-col items-center gap-1.5 group cursor-pointer"
                        >
                          <div className="w-13 h-13 rounded-2xl bg-[#1e293b] flex items-center justify-center shadow-md border border-white/10 group-hover:scale-105 transition-transform text-amber-300">
                            <Calculator className="w-6 h-6" />
                          </div>
                          <span className="text-[10.5px] font-medium text-white/80">Máy tính</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIphoneMiniApp('Thời tiết học tập')}
                          className="flex flex-col items-center gap-1.5 group cursor-pointer"
                        >
                          <div className="w-13 h-13 rounded-2xl bg-[#1e293b] flex items-center justify-center shadow-md border border-white/10 group-hover:scale-105 transition-transform text-blue-300">
                            <CloudSun className="w-6 h-6" />
                          </div>
                          <span className="text-[10.5px] font-medium text-white/80">Thời tiết</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIphoneMiniApp('Sổ tay ghi chú')}
                          className="flex flex-col items-center gap-1.5 group cursor-pointer"
                        >
                          <div className="w-13 h-13 rounded-2xl bg-[#1e293b] flex items-center justify-center shadow-md border border-white/10 group-hover:scale-105 transition-transform text-emerald-300">
                            <FileText className="w-6 h-6" />
                          </div>
                          <span className="text-[10.5px] font-medium text-white/80">Ghi chú</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIphoneMiniApp('Sinh tồn học thuật')}
                          className="flex flex-col items-center gap-1.5 group cursor-pointer"
                        >
                          <div className="w-13 h-13 rounded-2xl bg-[#1e293b] flex items-center justify-center shadow-md border border-white/10 group-hover:scale-105 transition-transform text-rose-300">
                            <Gamepad2 className="w-6 h-6" />
                          </div>
                          <span className="text-[10.5px] font-medium text-white/80">Mini-game</span>
                        </button>
                      </div>
                    )}

                    <div className="p-2.5 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/15 flex items-center justify-around">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-sm">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-sm">
                        <Compass className="w-5 h-5" />
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center text-white shadow-sm">
                        <MessageCircle className="w-5 h-5" />
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow-sm">
                        <Music className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-[#0b0d12] via-[#0d1017] to-[#090b0e]">
                    <div className="p-2 bg-[#121620]/95 border-b border-white/10 shrink-0 z-10 backdrop-blur-md">
                      <div className="grid grid-cols-5 gap-1 bg-[#090b10] p-1 rounded-xl border border-white/10">
                        <button
                          type="button"
                          onClick={() => setIphoneTab('qa')}
                          className={`py-1 text-[9px] font-bold rounded-lg transition-all ${
                            iphoneTab === 'qa'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                              : 'text-white/50 hover:text-white'
                          }`}
                        >
                          Hỏi đáp
                        </button>
                        <button
                          type="button"
                          onClick={() => setIphoneTab('cbt')}
                          className={`py-1 text-[9px] font-bold rounded-lg transition-all ${
                            iphoneTab === 'cbt'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                              : 'text-white/50 hover:text-white'
                          }`}
                        >
                          CBT
                        </button>
                        <button
                          type="button"
                          onClick={() => setIphoneTab('leaderboard')}
                          className={`py-1 text-[9px] font-bold rounded-lg transition-all ${
                            iphoneTab === 'leaderboard'
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/40'
                              : 'text-white/50 hover:text-white'
                          }`}
                        >
                          Vinh danh
                        </button>
                        <button
                          type="button"
                          onClick={() => setIphoneTab('battle')}
                          className={`py-1 text-[9px] font-bold rounded-lg transition-all ${
                            iphoneTab === 'battle'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                              : 'text-white/50 hover:text-white'
                          }`}
                        >
                          1vs1
                        </button>
                        <button
                          type="button"
                          onClick={() => setIphoneTab('machi')}
                          className={`py-1 text-[9px] font-bold rounded-lg transition-all ${
                            iphoneTab === 'machi'
                              ? 'bg-teal-500/20 text-teal-300 border border-teal-400/40'
                              : 'text-white/50 hover:text-white'
                          }`}
                        >
                          Tự học
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar select-none">
                      {iphoneTab === 'qa' && (
                        <div className="space-y-2.5 animate-fade-in">
                          <div className="p-3 rounded-xl bg-[#131722]/90 border border-white/10 hover:border-amber-400/30 transition-all shadow-md">
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-[#81b29a]/20 text-emerald-300 border border-[#81b29a]/40">
                                Toán học · Lớp 12
                              </span>
                              <span className="text-[9px] font-mono text-white/50">15p trước</span>
                            </div>

                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1 shadow-sm">
                                <Coins className="w-2.5 h-2.5 text-amber-400" />
                                +50 Bounty
                              </span>
                            </div>

                            <h4 className="text-xs font-bold text-white mb-1 leading-snug">
                              Tìm cực trị hàm số f(x) = x^3 - 3x + 2 trên đoạn [0; 2]?
                            </h4>
                            <p className="text-[10.5px] text-white/70 line-clamp-2 leading-relaxed">
                              Đạo hàm f&apos;(x) = 3x^2 - 3 = 0 cho nghiệm x = 1. Giá trị f(1) = 0 là cực tiểu.
                            </p>

                            <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                Thủ khoa kiểm chứng
                              </span>
                              <span className="text-[9px] text-amber-300 font-semibold flex items-center gap-0.5">
                                Chi tiết <ChevronRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {iphoneTab === 'cbt' && (
                        <div className="space-y-2.5 animate-fade-in">
                          <div className="p-3 rounded-xl bg-[#131722]/90 border border-emerald-500/30 shadow-md">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[9.5px] font-bold font-mono text-emerald-400 flex items-center gap-1">
                                <Cpu className="w-3 h-3" /> THI THỬ GDPT 2018
                              </span>
                              <span className="text-[10px] font-mono font-extrabold text-amber-300 px-1.5 py-0.5 rounded bg-black/40 border border-amber-400/30 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> 38:42
                              </span>
                            </div>

                            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-2">
                              <div className="bg-emerald-400 h-full w-[42%]" />
                            </div>

                            <p className="text-[11px] font-semibold text-white mb-2 leading-relaxed">
                              Câu 14 (Phần I): Giới hạn lim (x→0) của [ln(1 + 3x)] / sin(2x) bằng bao nhiêu?
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
                                  className={`w-full text-left p-1.5 rounded-lg text-[10.5px] font-mono flex items-center justify-between transition-all cursor-pointer ${
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

                          <div className="p-2 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between text-[9.5px] text-white/70">
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Giám sát CBT AI
                            </span>
                            <span className="font-mono text-emerald-300">Bảo mật</span>
                          </div>
                        </div>
                      )}

                      {iphoneTab === 'leaderboard' && (
                        <div className="space-y-2 animate-fade-in">
                          <div className="text-center pb-0.5">
                            <span className="text-[9.5px] font-bold uppercase tracking-widest text-amber-400 font-mono">
                              Bảng Vàng Thủ Khoa
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-transparent border border-amber-400/40 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-amber-500 text-black font-extrabold text-[9px] flex items-center justify-center">
                                1
                              </div>
                              <div>
                                <div className="text-[10.5px] font-bold text-white">Nguyễn Minh Khôi</div>
                                <div className="text-[8.5px] text-white/60">Trạng Nguyên · 3,420 XP</div>
                              </div>
                            </div>
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          </div>

                          <div className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-slate-300 text-black font-extrabold text-[9px] flex items-center justify-center">
                                2
                              </div>
                              <div>
                                <div className="text-[10.5px] font-bold text-white">Trần Thùy Linh</div>
                                <div className="text-[8.5px] text-white/60">Bảng Nhãn · 2,980 XP</div>
                              </div>
                            </div>
                            <Award className="w-3.5 h-3.5 text-slate-300" />
                          </div>
                        </div>
                      )}

                      {iphoneTab === 'battle' && (
                        <div className="space-y-2.5 animate-fade-in">
                          <div className="p-3 rounded-xl bg-[#1e1528] border border-rose-500/30 text-center space-y-2">
                            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-300">
                              <Flame className="w-3.5 h-3.5 text-rose-400" /> Đấu Trường Tranh Tài 1vs1
                            </div>
                            <div className="flex items-center justify-around py-2">
                              <div className="text-center">
                                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 font-bold text-xs flex items-center justify-center mx-auto">
                                  Bạn
                                </div>
                                <span className="text-[9px] font-mono text-white/70">1250 Elo</span>
                              </div>
                              <span className="text-xs font-mono font-black text-rose-400">VS</span>
                              <div className="text-center">
                                <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold text-xs flex items-center justify-center mx-auto">
                                  Đối thủ
                                </div>
                                <span className="text-[9px] font-mono text-white/70">1280 Elo</span>
                              </div>
                            </div>
                            <span className="px-3 py-1 rounded-lg bg-rose-500 text-white font-bold text-[10px] inline-block shadow-sm">
                              Khớp Đấu Nhanh
                            </span>
                          </div>
                        </div>
                      )}

                      {iphoneTab === 'machi' && (
                        <div className="space-y-2.5 animate-fade-in">
                          <div className="p-3 rounded-xl bg-[#0f2027] border border-teal-500/30 text-center space-y-2">
                            <span className="text-xs font-bold text-teal-300 block">
                              Không Gian Tự Học Machi Mart
                            </span>
                            <div className="text-2xl font-mono font-black text-amber-300 tracking-wider">
                              25:00
                            </div>
                            <p className="text-[9.5px] text-white/60">
                              Âm thanh chuông Tây Tạng định tâm, hỗ trợ tập trung cao độ.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full h-[74px] flex items-center justify-center shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsIphoneHome((prev) => !prev);
                    setIphoneMiniApp(null);
                  }}
                  className="w-[52px] h-[52px] rounded-full bg-[#0a0c0e] flex items-center justify-center shadow-inner cursor-pointer hover:border-amber-400/50 transition-colors"
                  style={{
                    border: '1.5px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.85), 0 1px 1px rgba(255,255,255,0.06)',
                  }}
                  title="Nút Home vật lý: Bấm để về Màn hình chính (iOS Springboard)"
                  aria-label="Nút Home vật lý: Bấm để về Màn hình chính"
                >
                  <div
                    className="w-[18px] h-[18px] rounded-[5px]"
                    style={{ border: '1.5px solid rgba(255, 255, 255, 0.35)' }}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="macbook-showcase-container flex flex-col items-center justify-center w-full max-w-[560px] select-none transition-all duration-300">
          <div
            className="macbook-lid relative w-full h-[360px] rounded-t-2xl p-[10px] flex flex-col"
            style={{
              background: 'linear-gradient(180deg, #373b44 0%, #1e2024 100%)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
              border: '1px solid #4a4f59',
            }}
          >
            <div className="absolute top-[3px] left-1/2 -translate-x-1/2 w-28 h-3.5 bg-black rounded-b-md flex items-center justify-center z-30">
              <div className="w-1.5 h-1.5 rounded-full bg-[#1b354b] border border-white/20" />
            </div>

            <div className="macbook-screen flex-1 rounded-lg overflow-hidden bg-gradient-to-br from-[#12072b] via-[#09152b] to-[#040814] flex flex-col relative border border-black/80">
              <div className="h-5 w-full bg-[#1e2330]/85 border-b border-white/10 px-3 flex items-center justify-between text-[9px] font-sans text-white/80 z-20 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white text-[10px]"></span>
                  <span className="font-bold text-white">F-Forum</span>
                  <span className="text-white/60">File</span>
                  <span className="text-white/60">Edit</span>
                  <span className="text-white/60">View</span>
                  <span className="text-white/60">Window</span>
                  <span className="text-white/60">Help</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[9px] text-white/70">
                  <span>100%</span>
                  <span>Sat Oct 25 09:41</span>
                </div>
              </div>

              <div className="flex-1 p-2 relative flex flex-col overflow-hidden">
                {isMacWindowOpen ? (
                  <div className="macbook-browser-window flex-1 rounded-xl bg-[#0f141d] border border-white/15 flex flex-col overflow-hidden shadow-2xl animate-fade-in">
                    <div className="h-7 bg-[#171d28] border-b border-white/10 px-2.5 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsMacWindowOpen(false)}
                          className="w-2.5 h-2.5 rounded-full bg-rose-500 hover:bg-rose-600 transition-colors cursor-pointer"
                          title="Đóng cửa sổ F-Forum về Desktop"
                        />
                        <button
                          type="button"
                          onClick={() => setIsMacWindowOpen(false)}
                          className="w-2.5 h-2.5 rounded-full bg-amber-500 hover:bg-amber-600 transition-colors cursor-pointer"
                          title="Thu nhỏ cửa sổ"
                        />
                        <button
                          type="button"
                          className="w-2.5 h-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 transition-colors cursor-pointer"
                          title="Phóng to"
                        />
                      </div>

                      <div className="flex-1 max-w-[280px] mx-auto h-5 rounded-md bg-black/40 border border-white/10 px-2 flex items-center justify-center gap-1.5 text-[9px] font-mono text-white/70">
                        <Lock className="w-2.5 h-2.5 text-emerald-400" />
                        <span className="text-amber-200">https://f-forum.edu.vn</span>
                      </div>

                      <div className="w-10 flex justify-end text-white/40 text-[9px]">
                        <RotateCcw className="w-2.5 h-2.5" />
                      </div>
                    </div>

                    <div className="p-2 bg-[#121822] border-b border-white/10 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-black text-amber-300 text-xs">F-Forum</span>
                        <div className="flex items-center gap-1 bg-black/30 p-0.5 rounded-lg border border-white/10 font-mono text-[9px]">
                          <button
                            type="button"
                            onClick={() => setMacTab('cbt')}
                            className={`px-2 py-0.5 rounded ${
                              macTab === 'cbt' ? 'bg-amber-400 text-black font-bold' : 'text-white/60 hover:text-white'
                            }`}
                          >
                            Thi CBT 2018
                          </button>
                          <button
                            type="button"
                            onClick={() => setMacTab('qa')}
                            className={`px-2 py-0.5 rounded ${
                              macTab === 'qa' ? 'bg-amber-400 text-black font-bold' : 'text-white/60 hover:text-white'
                            }`}
                          >
                            Diễn đàn
                          </button>
                          <button
                            type="button"
                            onClick={() => setMacTab('battle')}
                            className={`px-2 py-0.5 rounded ${
                              macTab === 'battle' ? 'bg-amber-400 text-black font-bold' : 'text-white/60 hover:text-white'
                            }`}
                          >
                            1vs1
                          </button>
                          <button
                            type="button"
                            onClick={() => setMacTab('machi')}
                            className={`px-2 py-0.5 rounded ${
                              macTab === 'machi' ? 'bg-amber-400 text-black font-bold' : 'text-white/60 hover:text-white'
                            }`}
                          >
                            Machi Mart
                          </button>
                        </div>
                      </div>

                      <span className="text-[9px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Trực tuyến
                      </span>
                    </div>

                    <div className="flex-1 p-3 overflow-y-auto custom-scrollbar text-left text-white space-y-2.5">
                      {macTab === 'cbt' && (
                        <div className="p-3 rounded-xl bg-[#171e2b] border border-white/10 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-amber-300 uppercase font-bold">
                              Đề thi thử GDPT 2018 · Toán học
                            </span>
                            <span className="text-[10px] font-mono text-cyan-300">Thời gian: 42:15</span>
                          </div>
                          <p className="text-xs font-semibold text-slate-100 leading-relaxed">
                            Câu 1: Cho hàm số y = f(x) có đạo hàm f&apos;(x) = x(x - 1)^2(x + 2). Số điểm cực trị của hàm số là:
                          </p>
                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            {[
                              { id: 0, label: 'A. 2' },
                              { id: 1, label: 'B. 3' },
                              { id: 2, label: 'C. 1' },
                              { id: 3, label: 'D. 4' },
                            ].map((o) => (
                              <button
                                key={o.id}
                                type="button"
                                onClick={() => setMacCbtAnswer(o.id)}
                                className={`p-1.5 rounded-lg border text-[10px] font-mono text-left transition-all ${
                                  macCbtAnswer === o.id
                                    ? 'bg-amber-400/20 border-amber-400 text-amber-200 font-bold'
                                    : 'bg-black/30 border-white/10 text-white/70 hover:bg-white/5'
                                }`}
                              >
                                {o.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {macTab === 'qa' && (
                        <div className="p-3 rounded-xl bg-[#171e2b] border border-white/10 space-y-1.5">
                          <span className="text-[10px] font-mono text-emerald-300 font-bold">
                            Chủ đề thảo luận phong cách Lazi:
                          </span>
                          <h4 className="text-xs font-bold text-white">
                            Gợi ý hướng giải bài toán hình không gian Oxyz mặt cầu tiếp xúc mặt phẳng
                          </h4>
                          <p className="text-[10.5px] text-white/70">
                            Phương pháp tính khoảng cách d(I, P) = R và viết phương trình đường kính vuông góc.
                          </p>
                        </div>
                      )}

                      {macTab === 'battle' && (
                        <div className="p-3 rounded-xl bg-[#1e1528] border border-rose-500/30 text-center space-y-1.5">
                          <span className="text-xs font-bold text-rose-300 block">
                            Đấu Trường Tranh Tài 1vs1 Real-time
                          </span>
                          <p className="text-[10px] text-white/70">
                            Hệ thống ghép cặp Elo chuẩn xác giữa hai sĩ tử cùng hạng thi đấu.
                          </p>
                        </div>
                      )}

                      {macTab === 'machi' && (
                        <div className="p-3 rounded-xl bg-[#0f2027] border border-teal-500/30 text-center space-y-1.5">
                          <span className="text-xs font-bold text-teal-300 block">
                            Không Gian Tự Học Machi Mart
                          </span>
                          <p className="text-[10px] text-white/70">
                            Chuông Tây Tạng định tâm 25 phút Pomodoro &amp; Bức Tường Lưu Bút.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-1.5">
                      <span className="text-xs font-bold text-white block">Desktop macOS</span>
                      <p className="text-[10px] text-white/60">
                        Cửa sổ F-Forum đã được thu gọn. Hãy nhấp vào biểu tượng F-Forum ở thanh Dock bên dưới để mở lại!
                      </p>
                    </div>
                  </div>
                )}

                <div className="h-9 self-center rounded-2xl bg-white/15 backdrop-blur-xl border border-white/20 px-3 flex items-center gap-2 mt-auto shadow-xl z-20">
                  <div className="w-6 h-6 rounded-lg bg-sky-500 flex items-center justify-center text-white text-[10px] shadow-sm">
                    <Folder className="w-3.5 h-3.5" />
                  </div>
                  <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white text-[10px] shadow-sm">
                    <Compass className="w-3.5 h-3.5" />
                  </div>
                  <div className="w-6 h-6 rounded-lg bg-black flex items-center justify-center text-white text-[10px] shadow-sm border border-white/10">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="w-6 h-6 rounded-lg bg-purple-600 flex items-center justify-center text-white text-[10px] shadow-sm">
                    <Gamepad2 className="w-3.5 h-3.5" />
                  </div>

                  <div className="w-[1px] h-4 bg-white/20 mx-0.5" />

                  <button
                    type="button"
                    onClick={() => setIsMacWindowOpen(true)}
                    className={`w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-[#FBF2E1] flex items-center justify-center text-[#2B2331] font-serif font-black text-xs shadow-md border border-[#FBF2E1] cursor-pointer hover:scale-110 transition-transform relative ${
                      isMacWindowOpen ? 'ring-2 ring-amber-400' : ''
                    }`}
                    title="Mở ứng dụng F-Forum Web"
                  >
                    <span>F</span>
                    {isMacWindowOpen && (
                      <span className="w-1 h-1 rounded-full bg-amber-400 absolute -bottom-1 left-1/2 -translate-x-1/2" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            className="macbook-base relative w-[600px] h-3.5 rounded-b-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, #535863 0%, #292c33 100%)',
              boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
              borderTop: '1px solid #6b7280',
            }}
          >
            <div className="w-16 h-1 rounded-full bg-[#1e2025]" />
          </div>
        </div>
      )}
    </div>
  );
};

export default HardwareShowcase;
