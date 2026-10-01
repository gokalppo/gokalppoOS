import { describe, it, expect } from 'vitest';
import { FORTUNES } from './terminalFortunes';
import { executeCommand } from './terminalCommands';
import { hasBlockedWord } from './messenger/botModeration';

describe('fortune', () => {
    it('has at least a hundred different fortunes in each language', () => {
        for (const lang of ['en', 'tr']) {
            expect(FORTUNES[lang].length, lang).toBeGreaterThanOrEqual(100);
            expect(new Set(FORTUNES[lang]).size, `${lang} has duplicates`).toBe(FORTUNES[lang].length);
        }
    });

    it('keeps every one short enough for the Terminal window and free of anything rude', () => {
        for (const lang of ['en', 'tr']) {
            FORTUNES[lang].forEach((f) => {
                expect(f.trim().length, f).toBeGreaterThan(8);
                expect(f.length, f).toBeLessThanOrEqual(190);
                expect(hasBlockedWord(f), f).toBe(false);
            });
        }
    });

    it('picks any of them, depending on the dice, in both languages', () => {
        for (const lang of ['en', 'tr']) {
            const first = executeCommand('fortune', new Date(), lang, { random: () => 0 }).lines[0];
            const last = executeCommand('fortune', new Date(), lang, { random: () => 0.999999 }).lines[0];
            expect(first).toBe(FORTUNES[lang][0]);
            expect(last).toBe(FORTUNES[lang][FORTUNES[lang].length - 1]);
        }
    });

    it('does not run out of variety: forty draws give many different ones', () => {
        const seen = new Set();
        for (let i = 0; i < 40; i++) seen.add(executeCommand('fortune').lines[0]);
        expect(seen.size).toBeGreaterThan(25);
    });
});
