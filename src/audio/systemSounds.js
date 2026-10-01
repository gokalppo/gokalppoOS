// Short synthesized UI sounds (Web Audio, no asset files). Off by default.

export const SOUNDS_STORAGE_KEY = 'gokalppoOS_systemSounds';

// A sound is a list of tones: frequency glide, start offset and length in seconds.
export const SOUNDS = {
    click: [{ freq: 1300, dur: 0.025, type: 'square', gain: 0.35 }],
    menu: [{ freq: 900, dur: 0.03, type: 'square', gain: 0.35 }],
    open: [
        { freq: 520, freqEnd: 700, dur: 0.07, type: 'triangle', gain: 0.6 },
        { freq: 780, freqEnd: 1040, start: 0.07, dur: 0.09, type: 'triangle', gain: 0.6 }
    ],
    close: [
        { freq: 700, freqEnd: 520, dur: 0.07, type: 'triangle', gain: 0.6 },
        { freq: 480, freqEnd: 330, start: 0.07, dur: 0.09, type: 'triangle', gain: 0.6 }
    ],
    minimize: [{ freq: 760, freqEnd: 300, dur: 0.14, type: 'triangle', gain: 0.55 }],
    restore: [{ freq: 300, freqEnd: 760, dur: 0.14, type: 'triangle', gain: 0.55 }],
    error: [
        { freq: 220, freqEnd: 196, dur: 0.16, type: 'square', gain: 0.5 },
        { freq: 165, freqEnd: 147, start: 0.17, dur: 0.22, type: 'square', gain: 0.5 }
    ],
    notify: [
        { freq: 988, dur: 0.12, type: 'sine', gain: 0.7 },
        { freq: 1319, start: 0.1, dur: 0.22, type: 'sine', gain: 0.6 }
    ]
};

export const loadSoundsEnabled = () => {
    try {
        return localStorage.getItem(SOUNDS_STORAGE_KEY) === 'on';
    } catch {
        return false;
    }
};

export const saveSoundsEnabled = (enabled) => {
    try {
        localStorage.setItem(SOUNDS_STORAGE_KEY, enabled ? 'on' : 'off');
    } catch {
        // Storage unavailable — the preference just won't persist.
    }
};

let audioCtx = null;

const getContext = () => {
    if (!audioCtx) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return null;
        audioCtx = new Ctor();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => { });
    return audioCtx;
};

const MASTER_GAIN = 0.12; // system sounds sit well under music/nudge levels

export const playSystemSound = (name, volume = 0.5) => {
    const tones = SOUNDS[name];
    if (!tones || volume <= 0) return;
    try {
        const ctx = getContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        tones.forEach(({ freq, freqEnd, start = 0, dur, type = 'sine', gain = 1 }) => {
            const osc = ctx.createOscillator();
            const amp = ctx.createGain();
            const t0 = now + start;
            osc.type = type;
            osc.frequency.setValueAtTime(freq, t0);
            if (freqEnd) osc.frequency.linearRampToValueAtTime(freqEnd, t0 + dur);
            const level = Math.max(0.0001, MASTER_GAIN * gain * volume);
            amp.gain.setValueAtTime(level, t0);
            amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            osc.connect(amp);
            amp.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + dur + 0.02);
        });
    } catch {
        // Audio unavailable — UI sounds are optional.
    }
};
