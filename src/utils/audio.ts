/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { safeStorage } from './storage.ts';

let audioCtx: AudioContext | null = null;

/**
 * Nút "Hiệu ứng âm thanh" trong Cài đặt lưu ở `fforum_sfx`. Trước đây không hàm âm
 * thanh nào đọc khoá này nên tắt đi vẫn kêu — giờ mọi âm UI đều đi qua chốt này.
 */
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
      audioCtx.resume().catch(() => {
      });
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function toggleAmbientAudio(): boolean {
  /* Removed: ambient audio (was 432Hz + binaural beats) per user request. */
  /* Kept as no-op stub so existing call sites compile without changes. */
  return false;
}

export function isAmbientActive(): boolean {
  return false;
}

export function startFocusLofiAmbient(): boolean {
  /* Removed: chill lofi background per user request. */
  return false;
}

export function stopFocusLofiAmbient(): void {
  /* No-op stub: lofi system removed. */
}

export function toggleFocusLofiAmbient(): boolean {
  /* Removed: chill lofi background per user request. */
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
  } catch {
  }
}

/**
 * Tiếng "tách" của công tắc đèn pin (Epic 5 — Flashlight Password Reveal):
 * một xung bấm cao tần + tiếng "thịch" trầm rất ngắn; tắt đèn thấp giọng hơn.
 */
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
  } catch {
    /* âm thanh chỉ là trang trí — lỗi thì bỏ qua */
  }
}

let lastUiTick = 0;

/**
 * R3 · Delighter: tiếng "tick" siêu nhẹ khi bấm nút (~30ms, âm lượng 0.022).
 * Đi qua chốt isSfxEnabled() như mọi âm UI khác; tự giãn cách ≥ 45ms để bấm
 * liên tục không thành tiếng rè.
 */
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
  } catch {
    /* âm thanh chỉ là trang trí — lỗi thì bỏ qua */
  }
}
