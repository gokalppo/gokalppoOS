import { describe, it, expect } from 'vitest';
import { checkTeachable, hasBlockedWord, TEACH_A_MAX, TEACH_Q_MAX } from './botModeration';

describe('what visitors may teach', () => {
    it('accepts ordinary, friendly sentences in both languages', () => {
        for (const t of ['Bugün hava çok güzel', 'selam nasılsın', 'I love pizza', 'cats are better than dogs', 'Kanka bu iş tamam', 'got it, thanks', 'my pic is in the album']) {
            expect(checkTeachable(t), t).toBe('ok');
        }
    });

    it('turns away insults and slurs, even with odd spelling or separators', () => {
        for (const t of ['siktir git', 'Sen bir orospusun', 'fuck you', 'what the f.u.c.k', 's i k t i r', 'you bitch', 'ORospu çocuğu', 'amk']) {
            expect(checkTeachable(t), t).toBe('rude');
        }
        expect(hasBlockedWord('picnic with a cocktail')).toBe(false);
        expect(hasBlockedWord('Gotham is nice')).toBe(false);
    });

    it('turns away links, e-mail addresses and phone numbers', () => {
        expect(checkTeachable('visit www.example.com now')).toBe('link');
        expect(checkTeachable('go to https://evil.example/x')).toBe('link');
        expect(checkTeachable('see gokalp.me for more')).toBe('link');
        expect(checkTeachable('mail me at a@b.com')).toBe('contact');
        expect(checkTeachable('call 0532 123 45 67')).toBe('contact');
    });

    it('turns away empty, too long and keyboard-mash input', () => {
        expect(checkTeachable('')).toBe('short');
        expect(checkTeachable('1')).toBe('short');
        expect(checkTeachable('x'.repeat(TEACH_A_MAX + 1))).toBe('long');
        expect(checkTeachable('x'.repeat(TEACH_Q_MAX + 1), 'question')).toBe('long');
        expect(checkTeachable('a'.repeat(TEACH_Q_MAX), 'question')).toBe('spam');
        expect(checkTeachable('aaaaaaaaaa')).toBe('spam');
    });
});
