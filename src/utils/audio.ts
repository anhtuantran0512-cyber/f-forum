/* Bản quyền trí tuệ thuộc về BroAmStuck */

let audioCtx: AudioContext | null = null;
let ambientGain: GainNode | null = null;
let ambientOscillators: OscillatorNode[] = [];
let ambientStopTimeout: ReturnType<typeof setTimeout> | null = null;
let isAmbientPlaying = false;

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

export function toggleAmbientAudio(preferredCtx?: AudioContext | null): boolean {
  try {
    const ctx = getAudioContext(preferredCtx);
    if (!ctx) return false;

    if (ambientStopTimeout) {
      clearTimeout(ambientStopTimeout);
      ambientStopTimeout = null;
    }

    if (isAmbientPlaying) {
      const oscsToStop = [...ambientOscillators];
      const gainToStop = ambientGain;
      ambientOscillators = [];

      if (gainToStop) {
        gainToStop.gain.setValueAtTime(gainToStop.gain.value, ctx.currentTime);
        gainToStop.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
      }

      ambientStopTimeout = setTimeout(() => {
        oscsToStop.forEach(osc => {
          try {
            osc.stop();
            osc.disconnect();
          } catch {
          }
        });
        if (ambientGain === gainToStop) {
          ambientGain = null;
        }
        ambientStopTimeout = null;
      }, 1300);
      isAmbientPlaying = false;
      return false;
    } else {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 2);
      gain.connect(ctx.destination);
      ambientGain = gain;

      const freqs = [108, 114, 216, 324, 432];
      ambientOscillators = freqs.map((f, i) => {
        const osc = ctx.createOscillator();
        const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, ctx.currentTime);

        if (panner) {
          panner.pan.value = (i % 2 === 0 ? -0.5 : 0.5) * (i / freqs.length);
          osc.connect(filter);
          filter.connect(panner);
          panner.connect(gain);
        } else {
          osc.connect(filter);
          filter.connect(gain);
        }
        osc.start();
        return osc;
      });

      isAmbientPlaying = true;
      return true;
    }
  } catch {
    return false;
  }
}

export function isAmbientActive(): boolean {
  return isAmbientPlaying;
}

let focusGain: GainNode | null = null;
let focusOscillators: OscillatorNode[] = [];
let focusInterval: ReturnType<typeof setInterval> | null = null;
let focusStopTimeout: ReturnType<typeof setTimeout> | null = null;
let isFocusLofiPlaying = false;

export function startFocusLofiAmbient(preferredCtx?: AudioContext | null): boolean {
  try {
    const ctx = getAudioContext(preferredCtx);
    if (!ctx) return false;

    if (focusStopTimeout) {
      clearTimeout(focusStopTimeout);
      focusStopTimeout = null;
    }

    if (isFocusLofiPlaying) return true;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 2);
    master.connect(ctx.destination);
    focusGain = master;

    const baseFreqs = [54, 108, 114, 216];
    focusOscillators = baseFreqs.map((freq, i) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.connect(filter);
      filter.connect(master);
      osc.start();
      return osc;
    });

    const chordProgression = [
      [146.83, 220.0, 261.63, 329.63],
      [130.81, 196.0, 246.94, 329.63],
      [116.54, 174.61, 220.0, 261.63],
      [130.81, 164.81, 196.0, 246.94],
    ];
    let chordIndex = 0;

    const playNextChord = () => {
      try {
        if (!focusGain || !isFocusLofiPlaying) return;
        const chord = chordProgression[chordIndex % chordProgression.length];
        chordIndex++;

        chord.forEach((freq, idx) => {
          const padOsc = ctx.createOscillator();
          const padGain = ctx.createGain();
          const padFilter = ctx.createBiquadFilter();

          padOsc.type = 'triangle';
          padOsc.frequency.setValueAtTime(freq, ctx.currentTime);

          padFilter.type = 'lowpass';
          padFilter.frequency.setValueAtTime(450 + idx * 50, ctx.currentTime);

          const now = ctx.currentTime;
          padGain.gain.setValueAtTime(0.0001, now);
          padGain.gain.exponentialRampToValueAtTime(0.04, now + 1.2);
          padGain.gain.exponentialRampToValueAtTime(0.0001, now + 5.8);

          padOsc.connect(padFilter);
          padFilter.connect(padGain);
          padGain.connect(master);

          padOsc.start(now);
          padOsc.stop(now + 6.0);
        });
      } catch {
        /* ignore */
      }
    };

    playNextChord();
    focusInterval = setInterval(playNextChord, 6000);
    isFocusLofiPlaying = true;
    return true;
  } catch {
    return false;
  }
}

export function stopFocusLofiAmbient(): void {
  try {
    const ctx = getAudioContext();
    if (!isFocusLofiPlaying) return;

    if (focusStopTimeout) {
      clearTimeout(focusStopTimeout);
      focusStopTimeout = null;
    }

    if (focusInterval) {
      clearInterval(focusInterval);
      focusInterval = null;
    }

    const oscsToStop = [...focusOscillators];
    const gainToStop = focusGain;
    focusOscillators = [];

    if (gainToStop && ctx) {
      gainToStop.gain.setValueAtTime(gainToStop.gain.value, ctx.currentTime);
      gainToStop.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1);
    }

    focusStopTimeout = setTimeout(() => {
      oscsToStop.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
        }
      });
      if (focusGain === gainToStop) {
        focusGain = null;
      }
      focusStopTimeout = null;
    }, 1100);

    isFocusLofiPlaying = false;
  } catch {
    isFocusLofiPlaying = false;
  }
}

export function toggleFocusLofiAmbient(): boolean {
  if (isFocusLofiPlaying) {
    stopFocusLofiAmbient();
    return false;
  } else {
    return startFocusLofiAmbient();
  }
}

export function isFocusLofiActive(): boolean {
  return isFocusLofiPlaying;
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
