import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Play,
  Pause,
  NotebookPen,
  Copy,
  Check,
  Trash2,
  Timer,
  Coffee,
  Flame,
  Volume2,
  VolumeX,
  CloudRain,
  Moon,
  Music,
  Compass,
  Maximize2,
  Target,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { CircularProgressRing } from './CircularProgressRing';
import { CelebrationBurst } from './CelebrationBurst';
import { OrbButton } from './ui/OrbButton';
import { safeStorage } from '../utils/storage';
import { computeStudyTotals, formatDuration, readStudySessions, sessionsForOwner } from '../utils/studyLog';
import {
  FOCUS_BREAK_MINUTES,
  FOCUS_CREDITED_EVENT,
  FOCUS_REWARD_MINIMUM_MINUTES,
  FOCUS_WORK_MINUTES,
  focusProgressPercent,
  focusRemainingLabel,
  readFocusSession,
  requestFocusStop,
  startFocusSession,
  subscribeFocusSession,
  type FocusMode,
  type FocusSessionState,
} from '../utils/focusSession';
import { SHOP_ITEMS } from '../utils/shopData';
import { getAudioContext } from '../utils/audio';
import './FocusTheme.css';

interface FocusSanctuaryProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRewardSession?: (targetMinutes: number) => Promise<string | null>;
  userEmail?: string;
  equippedItemId?: string;
}

type AmbientTrack = 'rain' | 'lofi' | 'night';

const MACHI_MART_3D_URL = 'https://01a16606-3f4a-7e46-a701-0c5f36bb2e5c.arena.site/?embed=true';

const FocusSanctuaryInner: React.FC<{
  onClose: () => void;
  onStartRewardSession?: (targetMinutes: number) => Promise<string | null>;
  userEmail?: string;
  equippedItemId?: string;
}> = ({ onClose, onStartRewardSession, userEmail, equippedItemId }) => {
  const [mode, setMode] = useState<FocusMode>('work');
  const [targetMinutes, setTargetMinutes] = useState(25);
  const [session, setSession] = useState<FocusSessionState | null>(() => readFocusSession());
  const [isStarting, setIsStarting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [flash, setFlash] = useState<{ minutes: number; total: number } | null>(null);
  const [burstTick, setBurstTick] = useState(0);
  const [burstHeadline, setBurstHeadline] = useState('');

  const [notes, setNotes] = useState(() => safeStorage.getItem('fforum_focus_scratchpad') || '');
  const [copied, setCopied] = useState(false);
  const [studyTick, setStudyTick] = useState(0);

  const [ambientTrack, setAmbientTrack] = useState<AmbientTrack>('rain');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.4);
  const audioVolumeRef = useRef(audioVolume);
  useEffect(() => {
    audioVolumeRef.current = audioVolume;
  }, [audioVolume]);
  const [isNotesCollapsed, setIsNotesCollapsed] = useState(false);
  const [interactive3D, setInteractive3D] = useState(true);

  const audioNodesRef = useRef<{
    gainNode: GainNode | null;
    sourceNodes: (AudioNode | number)[] | null;
  }>({ gainNode: null, sourceNodes: null });

  useEffect(() => {
    safeStorage.setItem('fforum_focus_scratchpad', notes);
  }, [notes]);

  useEffect(() => subscribeFocusSession(() => setSession(readFocusSession())), []);
  useEffect(() => {
    const sync = () => setStudyTick((n) => n + 1);
    window.addEventListener('fforum_study_sync', sync);
    return () => window.removeEventListener('fforum_study_sync', sync);
  }, []);

  useEffect(() => {
    const onCredited = (event: Event) => {
      const detail = (event as CustomEvent<{ minutes: number }>).detail;
      const minutes = detail?.minutes || FOCUS_WORK_MINUTES;
      const total = computeStudyTotals(readStudySessions()).todayMinutes;
      setFlash({ minutes, total });
      setMode('break');
      if (minutes >= 25) {
        setBurstTick((n) => n + 1);
        setBurstHeadline(`Mốc ${minutes} phút · +${minutes} Coin`);
      }
      window.setTimeout(() => setFlash(null), 9000);
    };
    window.addEventListener(FOCUS_CREDITED_EVENT, onCredited);
    return () => window.removeEventListener(FOCUS_CREDITED_EVENT, onCredited);
  }, []);

  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [session]);

  const totals = useMemo(() => {
    const revision = `${studyTick}:${session?.startedAt ?? 0}:${flash?.minutes ?? 0}`;
    void revision;
    return computeStudyTotals(sessionsForOwner(readStudySessions(), userEmail));
  }, [studyTick, session, flash, userEmail]);

  const isRunning = Boolean(session);
  const activeMode: FocusMode = session ? session.mode : mode;
  const remainingLabel = session
    ? focusRemainingLabel(session, now)
    : `${String(activeMode === 'work' ? targetMinutes : FOCUS_BREAK_MINUTES).padStart(2, '0')}:00`;
  const progressPercent = session ? focusProgressPercent(session, now) : 0;

  const rewardMilestone =
    targetMinutes >= 120
      ? { minutes: 120, reward: 120, label: 'Rương Huyền Bí' }
      : targetMinutes >= 60
      ? { minutes: 60, reward: 60, label: 'Hộp Quà Nhỏ' }
      : targetMinutes >= 25
      ? { minutes: 25, reward: 25, label: 'Mốc khởi động' }
      : null;

  const milestoneActive = targetMinutes >= FOCUS_REWARD_MINIMUM_MINUTES && flash !== null;

  const stopCurrentAudio = () => {
    try {
      if (audioNodesRef.current.gainNode) {
        audioNodesRef.current.gainNode.gain.setValueAtTime(0, 0);
      }
      if (audioNodesRef.current.sourceNodes) {
        audioNodesRef.current.sourceNodes.forEach((node) => {
          if (typeof node === 'number') {
            window.clearInterval(node);
          } else if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
            try {
              (node as AudioScheduledSourceNode).stop();
            } catch {}
          }
        });
      }
    } catch {}
    audioNodesRef.current = { gainNode: null, sourceNodes: null };
  };

  const startAmbientAudio = (track: AmbientTrack, vol: number) => {
    stopCurrentAudio();
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(vol * 0.35, ctx.currentTime);
      masterGain.connect(ctx.destination);
      audioNodesRef.current.gainNode = masterGain;

      if (track === 'rain') {
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0,
          b1 = 0,
          b2 = 0,
          b3 = 0,
          b4 = 0,
          b5 = 0,
          b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.969 * b2 + white * 0.153852;
          b3 = 0.8665 * b3 + white * 0.3104856;
          b4 = 0.55 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.016898;
          output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(850, ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(masterGain);
        whiteNoise.start();

        audioNodesRef.current.sourceNodes = [whiteNoise];
      } else if (track === 'lofi') {
        const chordFreqs = [220, 261.63, 329.63, 392.0];
        const oscList: AudioNode[] = [];
        chordFreqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          oscGain.gain.setValueAtTime(0.04, ctx.currentTime);
          osc.connect(oscGain);
          oscGain.connect(masterGain);
          osc.start();
          oscList.push(osc);
        });
        audioNodesRef.current.sourceNodes = oscList;
      } else {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(65.41, ctx.currentTime);
        oscGain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start();
        audioNodesRef.current.sourceNodes = [osc];
      }
    } catch {}
  };

  useEffect(() => {
    if (isAudioPlaying) {
      startAmbientAudio(ambientTrack, audioVolumeRef.current);
    } else {
      stopCurrentAudio();
    }
    return () => {
      stopCurrentAudio();
    };
  }, [isAudioPlaying, ambientTrack]);

  useEffect(() => {
    if (audioNodesRef.current.gainNode) {
      const ctx = getAudioContext();
      if (ctx) {
        audioNodesRef.current.gainNode.gain.setValueAtTime(audioVolume * 0.35, ctx.currentTime);
      }
    }
  }, [audioVolume]);

  const handleStart = async () => {
    if (isStarting) return;
    setIsStarting(true);
    let serverSessionId: string | null = null;
    try {
      if (mode === 'work' && targetMinutes >= FOCUS_REWARD_MINIMUM_MINUTES && userEmail && onStartRewardSession) {
        serverSessionId = await onStartRewardSession(targetMinutes);
      }
    } catch {
      serverSessionId = null;
    } finally {
      startFocusSession(mode, userEmail, serverSessionId, targetMinutes);
      setSession(readFocusSession());
      setNow(Date.now());
      setIsStarting(false);
    }
  };

  const handleStop = () => {
    requestFocusStop();
    setNow(Date.now());
  };

  const handleSwitchMode = (next: FocusMode) => {
    if (isRunning) requestFocusStop();
    setSession(null);
    setMode(next);
    if (next === 'work') {
      setTargetMinutes(25);
    } else {
      setTargetMinutes(5);
    }
    setNow(Date.now());
  };

  const handleCopyNotes = () => {
    if (!notes.trim()) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(notes)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {});
    }
  };

  const handleClearNotes = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ ghi chú tập trung?')) {
      setNotes('');
    }
  };

  const focusTheme = SHOP_ITEMS.find((item) => item.id === equippedItemId && item.category === 'Theme Focus');

  return (
    <div
      className={`focus-sanctuary-3d-root fixed inset-0 z-50 flex items-center justify-center bg-[#05070a] overflow-hidden select-none animate-fade-in ${
        focusTheme ? `focus-signature--${focusTheme.id}` : ''
      }`}
    >
      <CelebrationBurst trigger={burstTick} tone="gold" headline={burstHeadline} />

      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-black">
        <iframe
          src={MACHI_MART_3D_URL}
          title="Machi Mart Đêm Mưa 3D Focus Sanctuary"
          className={`w-full h-full border-0 transition-opacity duration-700 ${
            interactive3D ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
          allow="accelerometer; autoplay; camera; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />

        <div
          className="pointer-events-none absolute inset-0 z-1"
          style={{
            background:
              'radial-gradient(circle at center, transparent 35%, rgba(5,7,10,0.4) 70%, rgba(5,7,10,0.88) 100%)',
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#05070a]/90 to-transparent z-1" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#05070a]/90 to-transparent z-1" />
      </div>

      <header
        className="floating-glass-top absolute top-4 inset-x-4 sm:inset-x-8 z-30 flex items-center justify-between px-5 py-3.5 rounded-2xl backdrop-blur-xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
        style={{
          background: 'rgba(9, 12, 18, 0.68)',
          border: '1px solid rgba(148, 163, 184, 0.15)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-md">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-serif font-bold text-white tracking-wide">
                Phòng Tập Trung · Machi Mart Đêm Mưa
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                3D Atmospheric Sanctuary
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-300 font-mono">
              <span className="flex items-center gap-1 text-amber-300">
                <Flame className="w-3.5 h-3.5 fill-current text-rose-400" />
                Chuỗi {totals.streakDays} ngày
              </span>
              <span>·</span>
              <span>Hôm nay: {formatDuration(totals.todayMinutes)}</span>
              <span className="hidden lg:inline text-slate-400">
                · Đóng cửa sổ này vẫn KHÔNG mất phiên học — đồng hồ chạy theo thời gian thật
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setInteractive3D(!interactive3D)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              interactive3D
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
            }`}
            title="Bật/Tắt chế độ xoay góc nhìn 3D Machi Mart"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{interactive3D ? 'Đang xoay 3D' : 'Khóa góc nhìn'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Phòng Tập Trung"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/70 hover:text-rose-200 border border-white/10 hover:border-rose-400/40 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      <aside
        className="floating-glass-left absolute left-4 sm:left-8 top-24 bottom-24 sm:bottom-28 w-[310px] sm:w-[340px] z-20 flex flex-col justify-between p-5 rounded-2xl backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.7)] overflow-y-auto"
        style={{
          background: 'rgba(9, 12, 18, 0.72)',
          border: '1px solid rgba(148, 163, 184, 0.15)',
        }}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Timer className="w-4 h-4" /> Đồng hồ Pomodoro
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                isRunning ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' : 'bg-white/10 text-white/60'
              }`}
            >
              {isRunning ? 'ĐANG TẬP TRUNG' : 'CHỜ BẮT ĐẦU'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => handleSwitchMode('work')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeMode === 'work'
                  ? 'bg-amber-500 text-black shadow-md font-extrabold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Tập trung 25m</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('break')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeMode === 'break'
                  ? 'bg-emerald-500 text-black shadow-md font-extrabold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Nghỉ ngơi 5m</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center py-2">
            <CircularProgressRing
              progress={progressPercent}
              size={190}
              strokeWidth={6}
              breathing={isRunning && activeMode === 'work'}
              label={remainingLabel}
              flip
              milestone={
                milestoneActive
                  ? {
                      reached: flash !== null,
                      label: flash ? `Đã hoàn thành! +${flash.minutes}m` : rewardMilestone?.label || '',
                      minutes: flash?.minutes || rewardMilestone?.minutes || 0,
                    }
                  : undefined
              }
            />
          </div>

          {!isRunning && activeMode === 'work' && (
            <div className="space-y-2 bg-black/30 p-2.5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between text-[11px] text-white/70">
                <span>Mục tiêu thời gian:</span>
                <span className="font-mono font-bold text-amber-300">{targetMinutes} phút</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={targetMinutes}
                  onChange={(e) => setTargetMinutes(Number(e.target.value))}
                  aria-label="Mục tiêu thời gian (phút)"
                  className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                <input
                  type="number"
                  min={5}
                  max={120}
                  step={5}
                  maxLength={3}
                  value={targetMinutes}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) setTargetMinutes(Math.min(120, Math.max(5, v)));
                  }}
                  aria-label="Nhập số phút trực tiếp"
                  className="w-12 px-1.5 py-0.5 rounded-lg bg-[#151a26] border border-white/20 text-center text-xs font-mono font-bold text-amber-300 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                {[15, 25, 45, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTargetMinutes(m)}
                    className={`flex-1 py-1 rounded text-[10px] font-mono font-bold border transition-all ${
                      targetMinutes === m
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                        : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeMode === 'work' && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs">
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-400" />
                <span className="font-semibold">Thưởng hoàn thành:</span>
              </div>
              <span className="font-mono font-bold">+{targetMinutes} Coin</span>
            </div>
          )}

          {milestoneActive && flash && (
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-center text-xs text-emerald-200">
              <div className="flex items-center justify-center gap-1 font-bold">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Hoàn thành {flash.minutes} phút</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">Đã ghi vào nhật ký giờ học F-Forum</p>
            </div>
          )}
        </div>

        <div className="pt-4 space-y-2 border-t border-white/10">
          <button
            type="button"
            onClick={isRunning ? handleStop : () => void handleStart()}
            disabled={!isRunning && isStarting}
            className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
              isRunning
                ? 'bg-rose-500 hover:bg-rose-600 text-white border border-rose-400/50'
                : 'bg-amber-400 hover:bg-amber-300 text-black border border-amber-300 font-extrabold'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Tạm dừng phiên</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>{isStarting ? 'Đang chuẩn bị...' : 'Bắt đầu tập trung'}</span>
              </>
            )}
          </button>
        </div>
      </aside>

      <aside
        className={`floating-glass-right absolute right-4 sm:right-8 top-24 bottom-24 sm:bottom-28 z-20 flex flex-col p-5 rounded-2xl backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.7)] transition-all duration-300 ${
          isNotesCollapsed ? 'w-[64px] items-center' : 'w-[310px] sm:w-[340px]'
        }`}
        style={{
          background: 'rgba(9, 12, 18, 0.72)',
          border: '1px solid rgba(148, 163, 184, 0.15)',
        }}
      >
        <div className="w-full flex items-center justify-between pb-3 border-b border-white/10">
          {!isNotesCollapsed && (
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <NotebookPen className="w-4 h-4" /> Sổ tay &amp; Nhật ký giờ học
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsNotesCollapsed(!isNotesCollapsed)}
            className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title={isNotesCollapsed ? 'Mở rộng sổ tay' : 'Thu gọn sổ tay'}
          >
            {isNotesCollapsed ? <NotebookPen className="w-4 h-4 text-amber-400" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
        </div>

        {!isNotesCollapsed && (
          <div className="flex-1 flex flex-col pt-3 min-h-0 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                <span className="block text-white/50 text-[10px]">Tuần này:</span>
                <span className="font-bold text-emerald-300">{(totals.weekMinutes / 60).toFixed(1)}h</span>
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                <span className="block text-white/50 text-[10px]">Tháng này:</span>
                <span className="font-bold text-indigo-300">{(totals.monthMinutes / 60).toFixed(1)}h</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/70 font-semibold">Ghi chú tức thì:</span>
              <div className="flex items-center gap-1.5">
                <OrbButton
                  size="sm"
                  tone={copied ? 'mauve' : 'silver'}
                  motion={copied ? 'check' : 'fly'}
                  labelSide="left"
                  index={0}
                  label={copied ? 'Đã chép' : 'Sao chép'}
                  title="Sao chép"
                  icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  onClick={handleCopyNotes}
                />
                <OrbButton
                  size="sm"
                  tone="rose"
                  labelSide="left"
                  index={1}
                  label="Xóa"
                  title="Xóa"
                  icon={<Trash2 className="w-4 h-4" />}
                  onClick={handleClearNotes}
                  disabled={!notes}
                />
              </div>
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={5000}
              placeholder="Ghi nhanh công thức cốt lõi, thắc mắc cần tra cứu hoặc việc cần giải quyết sau nhịp Pomodoro..."
              className="w-full flex-1 p-3 rounded-xl bg-black/45 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400/50 leading-relaxed resize-none font-mono"
            />
            <div className="text-[10px] font-mono text-white/40 text-right">
              {notes.length} / 5000 ký tự
            </div>
          </div>
        )}
      </aside>

      <footer
        className="floating-glass-bottom absolute bottom-4 inset-x-4 sm:inset-x-8 z-30 flex items-center justify-between px-5 py-3 rounded-2xl backdrop-blur-xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
        style={{
          background: 'rgba(9, 12, 18, 0.68)',
          border: '1px solid rgba(148, 163, 184, 0.15)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsAudioPlaying(!isAudioPlaying)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
              isAudioPlaying
                ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-md'
                : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
            }`}
            title={isAudioPlaying ? 'Tắt âm thanh môi trường' : 'Bật âm thanh môi trường'}
          >
            {isAudioPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setAmbientTrack('rain');
                if (!isAudioPlaying) setIsAudioPlaying(true);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                ambientTrack === 'rain' && isAudioPlaying
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-sm'
                  : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
              }`}
            >
              <CloudRain className="w-3.5 h-3.5" />
              <span>Tiếng mưa rào</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAmbientTrack('lofi');
                if (!isAudioPlaying) setIsAudioPlaying(true);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                ambientTrack === 'lofi' && isAudioPlaying
                  ? 'bg-purple-500/20 text-purple-300 border-purple-400/50 shadow-sm'
                  : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Lofi Chill</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAmbientTrack('night');
                if (!isAudioPlaying) setIsAudioPlaying(true);
              }}
              className={`hidden sm:flex px-3 py-1.5 rounded-xl text-xs font-semibold items-center gap-1.5 transition-all border ${
                ambientTrack === 'night' && isAudioPlaying
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/50 shadow-sm'
                  : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Đêm khuya tĩnh lặng</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline text-[11px] font-mono text-white/50">
            Âm lượng: {Math.round(audioVolume * 100)}%
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={audioVolume}
            onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
            className="w-20 sm:w-28 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
            aria-label="Điều chỉnh âm lượng âm thanh môi trường"
          />
        </div>
      </footer>
    </div>
  );
};

export const FocusSanctuary: React.FC<FocusSanctuaryProps> = ({
  isOpen,
  onClose,
  onStartRewardSession,
  userEmail,
  equippedItemId,
}) => {
  if (!isOpen) return null;
  return (
    <FocusSanctuaryInner
      onClose={onClose}
      onStartRewardSession={onStartRewardSession}
      userEmail={userEmail}
      equippedItemId={equippedItemId}
    />
  );
};

export default FocusSanctuary;
