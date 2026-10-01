import { describe, it, expect } from 'vitest';
import { CLIPPY_TIPS, getClippyTips } from './clippyTips';
import { DISCOVERY_ORDER } from '../components/clippyLogic';
import { COMMAND_NAMES } from '../components/apps/terminalCommands';

const categories = (lang) => Object.keys(CLIPPY_TIPS[lang]);
const tipLists = (lang) => Object.entries(CLIPPY_TIPS[lang]).filter(([key]) => key !== 'discover');

describe('Clippy tips', () => {
    it('Turkish and English have exactly the same categories, with the same number of tips', () => {
        expect(categories('tr').sort()).toEqual(categories('en').sort());
        for (const [key, list] of tipLists('en')) {
            expect(CLIPPY_TIPS.tr[key].length, `${key}`).toBe(list.length);
        }
        expect(Object.keys(CLIPPY_TIPS.tr.discover).sort()).toEqual(Object.keys(CLIPPY_TIPS.en.discover).sort());
    });

    it('has plenty to say: over a hundred tips and a long general list per language', () => {
        for (const lang of ['tr', 'en']) {
            const total = tipLists(lang).reduce((sum, [, list]) => sum + list.length, 0);
            expect(total, lang).toBeGreaterThanOrEqual(100);
            expect(CLIPPY_TIPS[lang].default.length, lang).toBeGreaterThanOrEqual(30);
            expect(CLIPPY_TIPS[lang].terminal.length, lang).toBeGreaterThanOrEqual(10);
        }
    });

    it('has no empty tips and no repeats inside one list', () => {
        for (const lang of ['tr', 'en']) {
            for (const [key, list] of tipLists(lang)) {
                expect(new Set(list).size, `${lang}.${key}`).toBe(list.length);
                list.forEach((tip) => expect(tip.trim().length, `${lang}.${key}`).toBeGreaterThan(10));
            }
            Object.values(CLIPPY_TIPS[lang].discover).forEach((tip) => expect(tip.trim().length).toBeGreaterThan(10));
        }
    });

    it('covers every app it nudges towards, and only those', () => {
        expect(Object.keys(CLIPPY_TIPS.en.discover).sort()).toEqual([...DISCOVERY_ORDER].sort());
    });

    it('only mentions Terminal commands that really exist', () => {
        const quoted = [];
        for (const lang of ['tr', 'en']) {
            for (const tip of [...CLIPPY_TIPS[lang].terminal, ...CLIPPY_TIPS[lang].default, ...CLIPPY_TIPS[lang].messenger]) {
                // 'ls | grep txt' style snippets and single words in quotes
                for (const m of tip.matchAll(/(?<![A-Za-z])'([^']{2,40})'/g)) quoted.push(m[1]);
            }
        }
        // program names work as commands too (apps registry), so they are fine here
        const known = new Set([...COMMAND_NAMES, 'projects', 'crash', 'notepad', 'paint']);
        const checked = quoted
            .flatMap((snippet) => snippet.split(/\s*(?:&&|\|)\s*/))
            .map((part) => part.trim().split(/\s+/)[0])
            .filter((word) => /^[a-z]+$/.test(word) && known.has(word.toLowerCase()));
        expect(checked.length).toBeGreaterThan(10);
        // every quoted single-word command-like thing in the terminal list must exist
        for (const lang of ['tr', 'en']) {
            for (const tip of CLIPPY_TIPS[lang].terminal) {
                for (const m of tip.matchAll(/(?<![A-Za-z])'([a-z]+)(?: [^']*)?'/g)) {
                    expect(known.has(m[1]), `"${m[1]}" in: ${tip}`).toBe(true);
                }
            }
        }
    });

    it('falls back to English for an unknown language', () => {
        expect(getClippyTips('de')).toBe(CLIPPY_TIPS.en);
    });
});
