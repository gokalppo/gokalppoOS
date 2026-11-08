import { describe, it, expect } from 'vitest';
import { solitaireScale, minesweeperCell, SOL_MAX_SCALE, MS_BASE_CELL, MS_MAX_CELL } from './layoutScale';

describe('Solitaire card scale', () => {
    it('stays at the original size for the normal window and for anything smaller or unmeasured', () => {
        expect(solitaireScale({ width: 600, height: 480 })).toBe(1);     // the default 620x540 window's board
        expect(solitaireScale({ width: 600, height: 500 })).toBe(1);     // a little roomier still looks the same
        expect(solitaireScale({ width: 300, height: 200 })).toBe(1);
        expect(solitaireScale({ width: 0, height: 0 })).toBe(1);
        expect(solitaireScale({})).toBe(1);
    });

    it('grows with the width when there is plenty of height', () => {
        const small = solitaireScale({ width: 900, height: 2000 });
        const big = solitaireScale({ width: 1500, height: 2000 });
        expect(small).toBeGreaterThan(1.5);
        expect(big).toBeGreaterThan(small);
    });

    it('is held back by the height, so a wide but short window does not make cards too tall', () => {
        const wideButShort = solitaireScale({ width: 1900, height: 700 });
        const wideAndTall = solitaireScale({ width: 1900, height: 1400 });
        expect(wideButShort).toBeLessThan(wideAndTall);
        expect(wideButShort).toBeLessThan(1.7);
    });

    it('never grows past the maximum and rounds to two decimals', () => {
        expect(solitaireScale({ width: 5000, height: 5000 })).toBe(SOL_MAX_SCALE);
        const k = solitaireScale({ width: 1111, height: 999 });
        expect(Math.round(k * 100) / 100).toBe(k);
    });

    it('a full-screen window gives clearly bigger cards', () => {
        expect(solitaireScale({ width: 1900, height: 950 })).toBeGreaterThan(1.7);
    });
});

describe('Minesweeper cell size', () => {
    it('is the normal 20px for the normal window and below, and when unmeasured', () => {
        expect(minesweeperCell({ width: 400, height: 280 })).toBe(MS_BASE_CELL);
        expect(minesweeperCell({ width: 100, height: 100 })).toBe(MS_BASE_CELL);
        expect(minesweeperCell({ width: 0, height: 0 })).toBe(MS_BASE_CELL);
    });

    it('grows with the window, limited by whichever side is tighter', () => {
        const roomy = minesweeperCell({ width: 1200, height: 900 });
        expect(roomy).toBeGreaterThan(40);
        expect(minesweeperCell({ width: 1200, height: 500 })).toBeLessThan(roomy);
        expect(minesweeperCell({ width: 500, height: 900 })).toBeLessThan(roomy);
    });

    it('uses whole pixels and never exceeds the maximum', () => {
        expect(Number.isInteger(minesweeperCell({ width: 777, height: 888 }))).toBe(true);
        expect(minesweeperCell({ width: 5000, height: 5000 })).toBe(MS_MAX_CELL);
    });

    it('the whole board always fits inside the measured space once it is bigger than the minimum', () => {
        for (const [width, height] of [[900, 700], [1300, 800], [1900, 950], [700, 1200]]) {
            const cell = minesweeperCell({ width, height });
            expect(cell * 9 + 18).toBeLessThanOrEqual(width);
            expect(cell * 9 + 12 + 44 + 12 + 100).toBeLessThanOrEqual(height + 1);
        }
    });
});
