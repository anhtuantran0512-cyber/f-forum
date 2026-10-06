/* Bản quyền trí tuệ thuộc về BroAmStuck */

let audioCtx: AudioContext | null = null;

/** Shared AudioContext for short, user-facing UI sound effects only. */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx?.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function playChime(type: 'xp' | 'level-up' | 'success' | 'send' = 'xp'): void {
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
        const startAt = now + idx * 0.07;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startAt);
        gain.gain.setValueAtTime(0.001, startAt);
        gain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.5);
        osc.connect(gain);
        gain.connect(master);
        osc.start(startAt);
        osc.stop(startAt + 0.55);
      });
    } else if (type === 'level-up') {
      const chord = [440, 554.37, 659.25, 880, 1108.73];
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startAt = now + idx * 0.05;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startAt);
        gain.gain.setValueAtTime(0.001, startAt);
        gain.gain.exponentialRampToValueAtTime(0.15, startAt + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 1.2);
        osc.connect(gain);
        gain.connect(master);
        osc.start(startAt);
        osc.stop(startAt + 1.25);
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
        const startAt = now + idx * 0.08;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startAt);
        gain.gain.setValueAtTime(0.001, startAt);
        gain.gain.exponentialRampToValueAtTime(0.1, startAt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.4);
        osc.connect(gain);
        gain.connect(master);
        osc.start(startAt);
        osc.stop(startAt + 0.45);
      });
    }
  } catch {
    // UI sound effects must never interrupt the action that triggered them.
  }
}
