/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { safeStorage } from './storage.ts';

let audioCtx: AudioContext | null = null;

export const isSfxEnabled = (): boolean => safeStorage.getItem('fforum_sfx') !== 'false';

export function getAudioContext(preferredCtx?: AudioContext | null): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (preferredCtx) {
      audioCtx = preferredCtx;
    }
    if (!audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function toggleAmbientAudio(): boolean {
  return false;
}

export function isAmbientActive(): boolean {
  return false;
}

export function startFocusLofiAmbient(): boolean {
  return false;
}

export function stopFocusLofiAmbient(): void {}

export function toggleFocusLofiAmbient(): boolean {
  return false;
}

export function isFocusLofiActive(): boolean {
  return false;
}

export function playChime(type: 'xp' | 'level-up' | 'success' | 'send' = 'xp') {
  if (!isSfxEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.connect(ctx.destination);

    if (type === 'xp') {
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.001, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.5);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.55);
      });
    } else if (type === 'level-up') {
      const chord = [440, 554.37, 659.25, 880, 1108.73];
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.001, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.15, now + idx * 0.05 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 1.2);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 1.25);
      });
    } else if (type === 'send') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.16);
    } else {
      const notes = [659.25, 987.77];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.001, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.1, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.45);
      });
    }
  } catch {}
}

export function playFlashlightClick(on: boolean = true): void {
  if (!isSfxEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.55, now);
    master.connect(ctx.destination);

    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(on ? 2100 : 1500, now);
    click.frequency.exponentialRampToValueAtTime(on ? 900 : 600, now + 0.025);
    clickGain.gain.setValueAtTime(0.06, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    click.connect(clickGain);
    clickGain.connect(master);
    click.start(now);
    click.stop(now + 0.035);

    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(on ? 180 : 130, now);
    thump.frequency.exponentialRampToValueAtTime(70, now + 0.06);
    thumpGain.gain.setValueAtTime(0.09, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    thump.connect(thumpGain);
    thumpGain.connect(master);
    thump.start(now);
    thump.stop(now + 0.08);
  } catch {}
}

let lastUiTick = 0;

export function playUiTick(): void {
  if (!isSfxEnabled()) return;
  const t = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (t - lastUiTick < 45) return;
  lastUiTick = t;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1850, now);
    osc.frequency.exponentialRampToValueAtTime(1150, now + 0.018);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.022, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.035);
  } catch {}
}

export function playTibetanBowlChime(): void {
  if (!isSfxEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.65, now);
    master.connect(ctx.destination);

    const partials = [
      { freq: 216, gain: 0.35, decay: 4.8 },
      { freq: 432, gain: 0.25, decay: 4.2 },
      { freq: 581, gain: 0.16, decay: 3.4 },
      { freq: 864, gain: 0.08, decay: 2.8 },
      { freq: 1296, gain: 0.04, decay: 2.0 },
    ];

    partials.forEach(({ freq, gain, decay }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(gain, now + 0.07);
      g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      osc.connect(g);
      g.connect(master);
      osc.start(now);
      osc.stop(now + decay + 0.1);
    });
  } catch {}
}

export function playPaperPageFlip(): void {
  if (!isSfxEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * 0.14);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.038));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(3600, now + 0.045);
    filter.frequency.exponentialRampToValueAtTime(950, now + 0.13);
    filter.Q.setValueAtTime(2.6, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.135);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.14);
  } catch {}
}

export function playCrystallineChime(): void {
  if (!isSfxEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.48, now);
    master.connect(ctx.destination);

    const freqs = [1760, 2637, 3520, 4400, 5274];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.025);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.025);
      gain.gain.linearRampToValueAtTime(0.08 / (idx + 1), now + idx * 0.025 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.025 + 1.1);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + idx * 0.025);
      osc.stop(now + idx * 0.025 + 1.15);
    });
  } catch {}
}

export function playMachiMartChime(): void {
  if (!isSfxEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [587.33, 783.99, 880];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0.001, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.1 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.48);
    });
  } catch {}
}
