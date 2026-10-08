/* Bản quyền trí tuệ thuộc về BroAmStuck */

let audioCtx: AudioContext | null = null;

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
  // Removed: ambient audio (was 432Hz + binaural beats) per user request.
  // Kept as no-op stub so existing call sites compile without changes.
  return false;
}

export function isAmbientActive(): boolean {
  return false;
}

export function startFocusLofiAmbient(): boolean {
  // Removed: chill lofi background per user request.
  return false;
}

export function stopFocusLofiAmbient(): void {
  // No-op stub: lofi system removed.
}

export function toggleFocusLofiAmbient(): boolean {
  // Removed: chill lofi background per user request.
  return false;
}

export function isFocusLofiActive(): boolean {
  return false;
}

export function playChime(type: 'xp' | 'level-up' | 'success' | 'send' = 'xp') {
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
