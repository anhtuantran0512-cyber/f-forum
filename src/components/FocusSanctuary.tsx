/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
  Compass,
  Maximize2,
  Target,
  RefreshCw,
  Sparkles,
  Sliders,
  Disc,
  Bell,
  BookOpen,
  Clock,
  Users,
} from 'lucide-react';
import { CircularProgressRing } from './CircularProgressRing';
import { CelebrationBurst } from './CelebrationBurst';
import { OrbButton } from './ui/OrbButton';
import { safeStorage } from '../utils/storage';
import { computeStudyTotals, formatDuration, readStudySessions, sessionsForOwner } from '../utils/studyLog';
import { getLifetimeFocusMinutes, addLifetimeFocusMinutes } from '../utils/spiritStorage';
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
import { getAudioContext, playTibetanBowlChime } from '../utils/audio';
import './FocusTheme.css';

interface FocusSanctuaryProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRewardSession?: (targetMinutes: number) => Promise<string | null>;
  userEmail?: string;
  equippedItemId?: string;
}

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

  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isMasterMuted, setIsMasterMuted] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.7);
  const [volRain, setVolRain] = useState(0.65);
  const [volVinyl, setVolVinyl] = useState(0.45);
  const [volChime, setVolChime] = useState(0.35);
  const [volPage, setVolPage] = useState(0.30);
  const [isMixerExpanded, setIsMixerExpanded] = useState(false);
  const [lifetimeMinutes, setLifetimeMinutes] = useState(() => getLifetimeFocusMinutes());

  const [isNotesCollapsed, setIsNotesCollapsed] = useState(false);
  const [interactive3D, setInteractive3D] = useState(true);

  const [atmosphereDimmer, setAtmosphereDimmer] = useState<number>(() => {
    const saved = safeStorage.getItem('fforum_focus_dimmer');
    return saved ? Math.min(100, Math.max(0, parseInt(saved, 10))) : 40;
  });

  const handleDimmerChange = useCallback((val: number) => {
    setAtmosphereDimmer(val);
    safeStorage.setItem('fforum_focus_dimmer', String(val));
  }, []);

  const [livePeersCount] = useState<number>(() => {
    const hour = new Date().getHours();
    const base = hour >= 20 || hour <= 2 ? 46 : hour >= 13 && hour <= 17 ? 35 : 28;
    return base + Math.floor(Math.random() * 8);
  });

  const audioEngineRef = useRef<{
    ctx: AudioContext | null;
    masterGain: GainNode | null;
    rainGain: GainNode | null;
    vinylGain: GainNode | null;
    chimeGain: GainNode | null;
    pageGain: GainNode | null;
    cleanups: (() => void)[];
  }>({
    ctx: null,
    masterGain: null,
    rainGain: null,
    vinylGain: null,
    chimeGain: null,
    pageGain: null,
    cleanups: [],
  });

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
    const onLifetimeSync = (e: Event) => {
      const mins = (e as CustomEvent<{ minutes?: number }>).detail?.minutes;
      if (typeof mins === 'number') setLifetimeMinutes(mins);
    };
    window.addEventListener('ff_lifetime_focus_changed', onLifetimeSync);
    return () => window.removeEventListener('ff_lifetime_focus_changed', onLifetimeSync);
  }, []);

  useEffect(() => {
    const onCredited = (event: Event) => {
      const detail = (event as CustomEvent<{ minutes: number }>).detail;
      const minutes = detail?.minutes || FOCUS_WORK_MINUTES;
      const total = computeStudyTotals(readStudySessions()).todayMinutes;
      setFlash({ minutes, total });
      setMode('break');
      playTibetanBowlChime();
      if (minutes >= 25) {
        setBurstTick((n) => n + 1);
        setBurstHeadline(`Mốc ${minutes} phút · +${minutes} Coin`);
      }
      const updatedLifetime = addLifetimeFocusMinutes(minutes);
      setLifetimeMinutes(updatedLifetime);
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

  const stopCurrentAudio = useCallback(() => {
    const engine = audioEngineRef.current;
    engine.cleanups.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
    if (engine.masterGain && engine.ctx) {
      try {
        engine.masterGain.gain.setValueAtTime(0, engine.ctx.currentTime);
      } catch {}
    }
    audioEngineRef.current = {
      ctx: null,
      masterGain: null,
      rainGain: null,
      vinylGain: null,
      chimeGain: null,
      pageGain: null,
      cleanups: [],
    };
  }, []);

  const startAmbientAudio = useCallback(() => {
    stopCurrentAudio();
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const masterGain = ctx.createGain();
      const rainGain = ctx.createGain();
      const vinylGain = ctx.createGain();
      const chimeGain = ctx.createGain();
      const pageGain = ctx.createGain();

      masterGain.gain.setValueAtTime(isMasterMuted ? 0 : masterVolume * 0.4, ctx.currentTime);
      rainGain.gain.setValueAtTime(volRain * 0.45, ctx.currentTime);
      vinylGain.gain.setValueAtTime(volVinyl * 0.35, ctx.currentTime);
      chimeGain.gain.setValueAtTime(volChime * 0.35, ctx.currentTime);
      pageGain.gain.setValueAtTime(volPage * 0.4, ctx.currentTime);

      rainGain.connect(masterGain);
      vinylGain.connect(masterGain);
      chimeGain.connect(masterGain);
      pageGain.connect(masterGain);
      masterGain.connect(ctx.destination);

      const cleanups: (() => void)[] = [];

      const rainBufSize = ctx.sampleRate * 2;
      const rainBuffer = ctx.createBuffer(1, rainBufSize, ctx.sampleRate);
      const rData = rainBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < rainBufSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        rData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
      const rainSrc = ctx.createBufferSource();
      rainSrc.buffer = rainBuffer;
      rainSrc.loop = true;
      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.setValueAtTime(820, ctx.currentTime);
      rainSrc.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainSrc.start();
      cleanups.push(() => {
        try { rainSrc.stop(); } catch {}
      });

      const dropTimer = window.setInterval(() => {
        if (Math.random() > 0.45) return;
        try {
          const osc = ctx.createOscillator();
          const dGain = ctx.createGain();
          osc.type = 'sine';
          const freq = 900 + Math.random() * 500;
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(freq * 0.6, ctx.currentTime + 0.035);
          dGain.gain.setValueAtTime(0.04, ctx.currentTime);
          dGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.035);
          osc.connect(dGain);
          dGain.connect(rainGain);
          osc.start();
          osc.stop(ctx.currentTime + 0.04);
        } catch {}
      }, 240);
      cleanups.push(() => window.clearInterval(dropTimer));

      const rumbleOsc = ctx.createOscillator();
      const rumbleGain = ctx.createGain();
      rumbleOsc.type = 'sine';
      rumbleOsc.frequency.setValueAtTime(55, ctx.currentTime);
      rumbleGain.gain.setValueAtTime(0.025, ctx.currentTime);
      rumbleOsc.connect(rumbleGain);
      rumbleGain.connect(vinylGain);
      rumbleOsc.start();
      cleanups.push(() => {
        try { rumbleOsc.stop(); } catch {}
      });

      const vinylBufSize = ctx.sampleRate * 2;
      const vinylBuffer = ctx.createBuffer(1, vinylBufSize, ctx.sampleRate);
      const vData = vinylBuffer.getChannelData(0);
      for (let i = 0; i < vinylBufSize; i++) {
        const isPop = Math.random() < 0.0018;
        vData[i] = isPop ? (Math.random() * 2 - 1) * 0.38 : (Math.random() * 2 - 1) * 0.012;
      }
      const vinylSrc = ctx.createBufferSource();
      vinylSrc.buffer = vinylBuffer;
      vinylSrc.loop = true;
      const vinylFilter = ctx.createBiquadFilter();
      vinylFilter.type = 'bandpass';
      vinylFilter.frequency.setValueAtTime(2600, ctx.currentTime);
      vinylFilter.Q.setValueAtTime(2.2, ctx.currentTime);
      vinylSrc.connect(vinylFilter);
      vinylFilter.connect(vinylGain);
      vinylSrc.start();
      cleanups.push(() => {
        try { vinylSrc.stop(); } catch {}
      });

      const chimeTimer = window.setInterval(() => {
        if (Math.random() > 0.65) return;
        try {
          const notes = [784, 880, 1046.5, 1174.7, 1318.5, 1568];
          const n1 = notes[Math.floor(Math.random() * notes.length)];
          const n2 = notes[Math.floor(Math.random() * notes.length)];
          [n1, n2].forEach((baseFreq, i) => {
            const delay = i * 0.12;
            const cOsc = ctx.createOscillator();
            const cGain = ctx.createGain();
            cOsc.type = 'sine';
            cOsc.frequency.setValueAtTime(baseFreq, ctx.currentTime + delay);
            cGain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
            cGain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + delay + 0.008);
            cGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 3.0);
            cOsc.connect(cGain);
            cGain.connect(chimeGain);
            cOsc.start(ctx.currentTime + delay);
            cOsc.stop(ctx.currentTime + delay + 3.1);

            const overtone = ctx.createOscillator();
            const oGain = ctx.createGain();
            overtone.type = 'sine';
            overtone.frequency.setValueAtTime(baseFreq * 2.76, ctx.currentTime + delay);
            oGain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
            oGain.gain.exponentialRampToValueAtTime(0.02, ctx.currentTime + delay + 0.008);
            oGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 1.8);
            overtone.connect(oGain);
            oGain.connect(chimeGain);
            overtone.start(ctx.currentTime + delay);
            overtone.stop(ctx.currentTime + delay + 1.9);
          });
        } catch {}
      }, 4200);
      cleanups.push(() => window.clearInterval(chimeTimer));

      const pageTimer = window.setInterval(() => {
        if (Math.random() > 0.55) return;
        try {
          const dur = 0.22;
          const pBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
          const pData = pBuf.getChannelData(0);
          for (let i = 0; i < pData.length; i++) {
            pData[i] = (Math.random() * 2 - 1) * 0.18;
          }
          const pSrc = ctx.createBufferSource();
          pSrc.buffer = pBuf;
          const pHigh = ctx.createBiquadFilter();
          pHigh.type = 'highpass';
          pHigh.frequency.setValueAtTime(1400, ctx.currentTime);
          const pLow = ctx.createBiquadFilter();
          pLow.type = 'lowpass';
          pLow.frequency.setValueAtTime(4500, ctx.currentTime);
          const pGain = ctx.createGain();
          pGain.gain.setValueAtTime(0.0001, ctx.currentTime);
          pGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.06);
          pGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
          pSrc.connect(pHigh);
          pHigh.connect(pLow);
          pLow.connect(pGain);
          pGain.connect(pageGain);
          pSrc.start();
        } catch {}
      }, 8500);
      cleanups.push(() => window.clearInterval(pageTimer));

      audioEngineRef.current = {
        ctx,
        masterGain,
        rainGain,
        vinylGain,
        chimeGain,
        pageGain,
        cleanups,
      };
    } catch {}
  }, [stopCurrentAudio, isMasterMuted, masterVolume, volRain, volVinyl, volChime, volPage]);

  useEffect(() => {
    if (isAudioPlaying) {
      startAmbientAudio();
    } else {
      stopCurrentAudio();
    }
    return () => {
      stopCurrentAudio();
    };
  }, [isAudioPlaying, startAmbientAudio, stopCurrentAudio]);

  useEffect(() => {
    const engine = audioEngineRef.current;
    if (!engine.ctx) return;
    try {
      if (engine.masterGain) {
        engine.masterGain.gain.setValueAtTime(
          isMasterMuted ? 0 : masterVolume * 0.4,
          engine.ctx.currentTime
        );
      }
      if (engine.rainGain) {
        engine.rainGain.gain.setValueAtTime(volRain * 0.45, engine.ctx.currentTime);
      }
      if (engine.vinylGain) {
        engine.vinylGain.gain.setValueAtTime(volVinyl * 0.35, engine.ctx.currentTime);
      }
      if (engine.chimeGain) {
        engine.chimeGain.gain.setValueAtTime(volChime * 0.35, engine.ctx.currentTime);
      }
      if (engine.pageGain) {
        engine.pageGain.gain.setValueAtTime(volPage * 0.4, engine.ctx.currentTime);
      }
    } catch {}
  }, [masterVolume, isMasterMuted, volRain, volVinyl, volChime, volPage]);

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
        <div
          className="pointer-events-none absolute inset-0 z-1 transition-colors duration-500"
          style={{
            backgroundColor: `rgba(${Math.round(31 * (1 - atmosphereDimmer / 100) + 7 * (atmosphereDimmer / 100))}, ${Math.round(22 * (1 - atmosphereDimmer / 100) + 10 * (atmosphereDimmer / 100))}, ${Math.round(16 * (1 - atmosphereDimmer / 100) + 18 * (atmosphereDimmer / 100))}, ${0.15 + (atmosphereDimmer / 100) * 0.65})`,
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
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <Users className="w-3 h-3 text-emerald-400" />
                <span>{livePeersCount} đồng môn đang cùng học</span>
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
            onClick={() => playTibetanBowlChime()}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 transition-all cursor-pointer"
            title="Ngân vang Chuông Tây Tạng (Tibetan Singing Bowl Chime)"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Chuông Tây Tạng</span>
          </button>

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono">
            <Sliders className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-[10px] text-amber-200/90 whitespace-nowrap">
              {atmosphereDimmer < 35 ? 'Hoàng Hôn Vàng Ấm' : atmosphereDimmer > 65 ? 'Mưa Đêm Sâu Lắng' : 'Ánh Sáng Dịu Êm'}
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={atmosphereDimmer}
              onChange={(e) => handleDimmerChange(Number(e.target.value))}
              aria-label="Bộ điều chỉnh ánh sáng môi trường 3D"
              className="w-16 sm:w-20 accent-amber-400 cursor-pointer h-1.5 bg-white/20 rounded-lg"
            />
          </div>

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
        className="floating-glass-bottom absolute bottom-3 sm:bottom-4 inset-x-3 sm:inset-x-8 z-30 flex flex-col gap-2.5 p-3 sm:px-5 sm:py-3 rounded-2xl backdrop-blur-xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
        style={{
          background: 'rgba(9, 12, 18, 0.78)',
          border: '1px solid rgba(148, 163, 184, 0.18)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsAudioPlaying(!isAudioPlaying)}
              className={`btn-feastables px-3.5 py-1.5 rounded-xl flex items-center gap-2 font-black text-xs cursor-pointer border transition-all ${
                isAudioPlaying
                  ? 'bg-amber-400 text-[#2B2331] border-[#2B2331] shadow-[2px_2px_0px_#2B2331]'
                  : 'bg-white/10 text-white/80 border-white/20 hover:text-white'
              }`}
            >
              {isAudioPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isAudioPlaying ? 'Dừng phát' : 'Phát lofi'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMasterMuted(!isMasterMuted)}
              className={`btn-feastables p-2 rounded-xl flex items-center justify-center cursor-pointer border transition-all ${
                isMasterMuted
                  ? 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                  : 'bg-white/10 text-white/80 border-white/20 hover:text-white'
              }`}
              title={isMasterMuted ? 'Bật lại âm thanh' : 'Tắt tiếng tổng (Mute)'}
            >
              {isMasterMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setIsMixerExpanded(!isMixerExpanded)}
              className={`btn-feastables px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold cursor-pointer border transition-all ${
                isMixerExpanded
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-sm'
                  : 'bg-white/10 text-white/70 border-white/20 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Mixer 4 Kênh</span>
            </button>

            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-300 text-xs font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Đồng hồ trọn đời: {formatDuration(lifetimeMinutes)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="hidden md:inline text-[11px] font-mono font-bold text-white/60">
              Tổng: {Math.round((isMasterMuted ? 0 : masterVolume) * 100)}%
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMasterMuted ? 0 : masterVolume}
              onChange={(e) => {
                setMasterVolume(parseFloat(e.target.value));
                if (isMasterMuted) setIsMasterMuted(false);
              }}
              className="w-20 sm:w-28 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
              aria-label="Điều chỉnh âm lượng tổng"
            />
          </div>
        </div>

        {isMixerExpanded && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-white/10 animate-fade-in text-xs">
            <div className="card-hard p-2 rounded-xl bg-black/40 border border-white/10 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-cyan-300 font-bold">
                <span className="flex items-center gap-1">
                  <CloudRain className="w-3.5 h-3.5" /> Mưa Mái Hiên
                </span>
                <span className="font-mono text-[10px]">{Math.round(volRain * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volRain}
                onChange={(e) => setVolRain(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                aria-label="Âm lượng mưa mái hiên"
              />
            </div>

            <div className="card-hard p-2 rounded-xl bg-black/40 border border-white/10 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-amber-300 font-bold">
                <span className="flex items-center gap-1">
                  <Disc className="w-3.5 h-3.5" /> Lofi Vinyl
                </span>
                <span className="font-mono text-[10px]">{Math.round(volVinyl * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volVinyl}
                onChange={(e) => setVolVinyl(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
                aria-label="Âm lượng lofi vinyl"
              />
            </div>

            <div className="card-hard p-2 rounded-xl bg-black/40 border border-white/10 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-purple-300 font-bold">
                <span className="flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5" /> Chuông Gió Cổ
                </span>
                <span className="font-mono text-[10px]">{Math.round(volChime * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volChime}
                onChange={(e) => setVolChime(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-400"
                aria-label="Âm lượng chuông gió"
              />
            </div>

            <div className="card-hard p-2 rounded-xl bg-black/40 border border-white/10 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-emerald-300 font-bold">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" /> Lật Trang Sách
                </span>
                <span className="font-mono text-[10px]">{Math.round(volPage * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volPage}
                onChange={(e) => setVolPage(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                aria-label="Âm lượng lật trang sách"
              />
            </div>
          </div>
        )}
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
