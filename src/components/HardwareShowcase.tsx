/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState } from 'react';
import {
  Smartphone,
  Laptop,
  CheckCircle2,
  RotateCcw,
  Gamepad2,
  Compass,
  Lock,
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
          title="Điện Thoại (iPhone 16 Pro)"
          aria-label="Điện Thoại (iPhone 16 Pro)"
          className={`flex items-center justify-center p-2.5 rounded-xl transition-all cursor-pointer ${
            deviceType === 'iphone'
              ? 'bg-amber-400 text-[#0b0d12] shadow-md'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Smartphone className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => setDeviceType('macbook')}
          title="Máy Tính (MacBook Pro)"
          aria-label="Máy Tính (MacBook Pro)"
          className={`flex items-center justify-center p-2.5 rounded-xl transition-all cursor-pointer ${
            deviceType === 'macbook'
              ? 'bg-amber-400 text-[#0b0d12] shadow-md'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Laptop className="w-5 h-5" />
        </button>
      </div>

      {deviceType === 'iphone' ? (
        <div
          className="iphone-interactive-container relative flex flex-col items-center justify-center select-none transition-all duration-300 bg-transparent overflow-hidden"
          style={{ width: '380px', height: '810px' }}
          title="Màn hình chính iOS Springboard: Mở ứng dụng F-Forum, Bấm để về Màn hình chính, Dynamic Island"
          aria-label="Điện thoại iPhone iOS Springboard Màn hình chính: Mở ứng dụng F-Forum, Bấm để về Màn hình chính, Dynamic Island"
        >
          <iframe
            src="/iphone5-showcase.html?embed=true"
            title="iPhone 5 / iOS 6 Interactive Showcase"
            className="w-full h-full border-0 outline-none rounded-[44px] shadow-2xl bg-transparent"
            style={{ background: 'transparent', colorScheme: 'dark' }}
            allow="geolocation; microphone; camera"
          />
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
