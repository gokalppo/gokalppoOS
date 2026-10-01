import { describe, it, expect, beforeEach, vi } from 'vitest';

const makeFakeAudio = () => {
    const oscillators = [];
    class FakeContext {
        constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
        createOscillator() {
            const osc = {
                type: '',
                frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
                connect: vi.fn(), start: vi.fn(), stop: vi.fn()
            };
            oscillators.push(osc);
            return osc;
        }
        createGain() {
            return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
        }
        resume() { return Promise.resolve(); }
    }
    return { FakeContext, oscillators };
};

beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    delete window.AudioContext;
    delete window.webkitAudioContext;
});

describe('preferences', () => {
    it('are off by default', async () => {
        const { loadSoundsEnabled } = await import('./systemSounds');
        expect(loadSoundsEnabled()).toBe(false);
    });

    it('persist the on/off choice', async () => {
        const { loadSoundsEnabled, saveSoundsEnabled } = await import('./systemSounds');
        saveSoundsEnabled(true);
        expect(loadSoundsEnabled()).toBe(true);
        saveSoundsEnabled(false);
        expect(loadSoundsEnabled()).toBe(false);
    });
});

describe('SOUNDS', () => {
    it('defines every sound the OS uses, with sane tones', async () => {
        const { SOUNDS } = await import('./systemSounds');
        for (const name of ['click', 'menu', 'open', 'close', 'minimize', 'restore', 'error', 'notify']) {
            expect(SOUNDS[name], name).toBeDefined();
            for (const tone of SOUNDS[name]) {
                expect(tone.freq).toBeGreaterThan(0);
                expect(tone.dur).toBeGreaterThan(0);
                expect(tone.dur).toBeLessThan(0.5);
            }
        }
    });
});

describe('playSystemSound', () => {
    it('starts one oscillator per tone', async () => {
        const { FakeContext, oscillators } = makeFakeAudio();
        window.AudioContext = FakeContext;
        const { playSystemSound, SOUNDS } = await import('./systemSounds');
        playSystemSound('open', 0.5);
        expect(oscillators).toHaveLength(SOUNDS.open.length);
        oscillators.forEach((o) => expect(o.start).toHaveBeenCalled());
    });

    it('does nothing when muted (volume 0) or for unknown names', async () => {
        const { FakeContext, oscillators } = makeFakeAudio();
        window.AudioContext = FakeContext;
        const { playSystemSound } = await import('./systemSounds');
        playSystemSound('open', 0);
        playSystemSound('nope', 1);
        expect(oscillators).toHaveLength(0);
    });

    it('never throws when Web Audio is unavailable', async () => {
        const { playSystemSound } = await import('./systemSounds');
        expect(() => playSystemSound('error', 1)).not.toThrow();
    });
});
