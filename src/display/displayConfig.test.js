import { describe, it, expect } from 'vitest';
import {
    DEFAULT_DISPLAY, SCHEMES, SCHEME_IDS, WALLPAPER_IDS, SAVER_IDS, SAVER_MINUTES,
    normalizeDisplay, loadDisplay, saveDisplay, schemeCssVars, saverDelayMs, DISPLAY_STORAGE_KEY
} from './displayConfig';

const makeStorage = (initial = {}) => {
    const data = { ...initial };
    return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; }, data };
};

describe('normalizeDisplay', () => {
    it('keeps valid choices', () => {
        const display = { wallpaper: 'bliss', scheme: 'rainy', saver: 'mystify', saverMinutes: 5 };
        expect(normalizeDisplay(display)).toEqual(display);
    });

    it('falls back to defaults for unknown or malicious values', () => {
        expect(normalizeDisplay({ wallpaper: '../../etc', scheme: 'neon', saver: 'x', saverMinutes: 99999 })).toEqual(DEFAULT_DISPLAY);
        expect(normalizeDisplay(null)).toEqual(DEFAULT_DISPLAY);
        expect(normalizeDisplay('nope')).toEqual(DEFAULT_DISPLAY);
    });

    it('repairs only the invalid fields', () => {
        expect(normalizeDisplay({ wallpaper: 'bliss', scheme: 'bogus' })).toEqual({ ...DEFAULT_DISPLAY, wallpaper: 'bliss' });
    });
});

describe('persistence', () => {
    it('round-trips through storage', () => {
        const storage = makeStorage();
        saveDisplay({ wallpaper: 'win98', scheme: 'hotdog', saver: 'none', saverMinutes: 10 }, storage);
        expect(loadDisplay(storage)).toEqual({ wallpaper: 'win98', scheme: 'hotdog', saver: 'none', saverMinutes: 10 });
    });

    it('survives corrupt storage and missing data', () => {
        expect(loadDisplay(makeStorage({ [DISPLAY_STORAGE_KEY]: '{broken' }))).toEqual(DEFAULT_DISPLAY);
        expect(loadDisplay(makeStorage())).toEqual(DEFAULT_DISPLAY);
    });

    it('does not throw if storage is blocked', () => {
        const blocked = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
        expect(() => saveDisplay(DEFAULT_DISPLAY, blocked)).not.toThrow();
        expect(loadDisplay(blocked)).toEqual(DEFAULT_DISPLAY);
    });
});

describe('schemes', () => {
    it('the standard scheme matches the original Win98 colours', () => {
        expect(schemeCssVars('standard')).toMatchObject({
            '--win-gray': '#c0c0c0', '--title-from': '#000080', '--title-to': '#1084d0', '--os-bg': '#008080'
        });
    });

    it('every scheme defines every colour as a valid hex', () => {
        for (const id of SCHEME_IDS) {
            for (const [key, value] of Object.entries(SCHEMES[id])) {
                expect(value, `${id}.${key}`).toMatch(/^#[0-9a-f]{6}$/i);
            }
        }
    });

    it('keeps button-face colours light enough for black text', () => {
        const luminance = (hex) => {
            const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        for (const id of SCHEME_IDS) expect(luminance(SCHEMES[id].face), id).toBeGreaterThan(0.5);
    });

    it('falls back to the standard scheme for unknown ids', () => {
        expect(schemeCssVars('nope')).toEqual(schemeCssVars('standard'));
    });
});

describe('options', () => {
    it('lists the wallpapers, savers and delays the UI offers', () => {
        expect(WALLPAPER_IDS).toEqual(['starfield', 'win98', 'bliss', 'teal']);
        expect(SAVER_IDS).toEqual(['starfield', 'mystify', 'none']);
        expect(SAVER_MINUTES).toEqual([1, 2, 5, 10]);
    });

    it('converts minutes to milliseconds', () => {
        expect(saverDelayMs(2)).toBe(120000);
    });
});
