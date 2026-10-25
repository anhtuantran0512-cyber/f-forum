import { getAudioContext, isSfxEnabled } from './audio';
import { safeStorage } from './storage';

export const isTactileSoundActive = (): boolean => isSfxEnabled();

export const toggleTactileSound = (): boolean => {
  const current = isSfxEnabled();
  const next = !current;
  safeStorage.setItem('fforum_sfx', next ? 'true' : 'false');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fforum_sfx_toggle', { detail: next }));
  }
  return next;
};

export const playCrystalComboChime = (combo: number = 1): void => {
  if (!isSfxEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.24, now);
    master.connect(ctx.destination);

    const safeCombo = Math.max(1, Math.min(combo, 10));
    const baseFreq = 523.25 * Math.pow(1.06, safeCombo - 1);
    const harmonics = [1, 1.2599, 1.4983, 2.0, 2.666];

    harmonics.forEach((ratio, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      const freq = baseFreq * ratio;
      osc.frequency.setValueAtTime(freq, now + idx * 0.025);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.025);
      gain.gain.exponentialRampToValueAtTime(0.12 / (idx + 1), now + idx * 0.025 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.025 + 0.45 + idx * 0.08);

      osc.connect(gain);
      gain.connect(master);
      osc.start(now + idx * 0.025);
      osc.stop(now + idx * 0.025 + 0.55 + idx * 0.08);
    });
  } catch {
  }
};

export const playHeartbeatPulse = (urgency: number = 1): void => {
  if (!isSfxEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    const vol = Math.min(0.4, 0.22 + urgency * 0.04);
    master.gain.setValueAtTime(vol, now);
    master.connect(ctx.destination);

    const playThump = (startTime: number, startFreq: number, endFreq: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, startTime);
      osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + dur);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.28, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

      osc.connect(gain);
      gain.connect(master);
      osc.start(startTime);
      osc.stop(startTime + dur + 0.02);
    };

    playThump(now, 72, 44, 0.09);
    playThump(now + 0.12, 60, 38, 0.08);
  } catch {
  }
};

export const playFeastablesTactilePop = (): void => {
  if (!isSfxEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.3, now);
    master.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.035);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.24, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + 0.05);

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(130, now);
    sub.frequency.exponentialRampToValueAtTime(55, now + 0.05);
    subGain.gain.setValueAtTime(0.12, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    sub.connect(subGain);
    subGain.connect(master);
    sub.start(now);
    sub.stop(now + 0.06);
  } catch {
  }
};

export const playVictoryFanfare = (): void => {
  if (!isSfxEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.28, now);
    master.connect(ctx.destination);

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const offset = idx * 0.09;
      osc.frequency.setValueAtTime(freq, now + offset);

      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.2, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + (idx === 3 ? 0.8 : 0.28));

      osc.connect(gain);
      gain.connect(master);
      osc.start(now + offset);
      osc.stop(now + offset + (idx === 3 ? 0.85 : 0.32));
    });
  } catch {
  }
};

export const playEnergyDeplete = (): void => {
  if (!isSfxEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.16);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  } catch {
  }
};
