import { useCallback } from 'react';
import nudgeSoundFile from '../../../../assets/nudge.mp3';

export const useSounds = (volume) => {
    const playDing = useCallback(() => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            gain.gain.setValueAtTime(volume * 0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } catch {
            // Web Audio unavailable (e.g. autoplay policy) — stay silent.
        }
    }, [volume]);

    const playNudgeSound = useCallback(() => {
        try {
            const audio = new Audio(nudgeSoundFile);
            audio.volume = volume;
            audio.play().catch(() => playDing());
        } catch {
            playDing();
        }
    }, [volume, playDing]);

    return { playDing, playNudgeSound };
};
