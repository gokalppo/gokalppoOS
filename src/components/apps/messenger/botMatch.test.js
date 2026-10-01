import { describe, it, expect } from 'vitest';
import { createMatcher } from './botMatch';
import { normalizeText, tokenize } from './botNlp';

const find = (matcher, text) => matcher.match(normalizeText(text), tokenize(text));

const matcher = createMatcher([
    { id: 'doing', patterns: ['ne yapıyorsun', 'napıyorsun', 'what are you doing'] },
    { id: 'food', patterns: ['pizza sever misin', 'do you like pizza'] },
    { id: 'hello', patterns: ['selam', 'merhaba'] },
    { id: 'bored', patterns: ['sıkıldım', 'i am bored'] },
    { id: 'football', patterns: ['hangi takımı tutuyorsun', 'which team do you support'] }
]);

describe('sentence matching', () => {
    it('finds the same sentence with extra words, typos and missing accents', () => {
        expect(find(matcher, 'sen ne yapıyorsun bugün').id).toBe('doing');
        expect(find(matcher, 'ne yapiyorsun').id).toBe('doing');
        expect(find(matcher, 'napiyorsun').id).toBe('doing');
        expect(find(matcher, 'pizza severmisin').score).toBeLessThan(1);
        expect(find(matcher, 'sen pizza sever misin').id).toBe('food');
        expect(find(matcher, 'hangi takimi tutuyosun').id).toBe('football');
    });

    it('is a perfect score for the exact sentence', () => {
        expect(find(matcher, 'Selam!').score).toBe(1);
        expect(find(matcher, 'What are you doing?').score).toBe(1);
    });

    it('gives a short greeting inside a long story a low score', () => {
        expect(find(matcher, 'selam ben ali bugün okula gittim ve çok yoruldum akşam eve geldim').score).toBeLessThan(0.78);
    });

    it('scores unrelated text low', () => {
        expect(find(matcher, 'qwerty zzz asdf').score).toBeLessThan(0.3);
        expect(find(matcher, 'bugün hava nasıl olacak yarın').score).toBeLessThan(0.78);
    });

    it('prefers the more specific sentence on a tie', () => {
        const m = createMatcher([{ id: 'a', patterns: ['pizza'] }, { id: 'b', patterns: ['pizza sever misin'] }]);
        expect(find(m, 'pizza sever misin').id).toBe('b');
    });

    it('handles empty input and an empty matcher', () => {
        expect(matcher.match('', [])).toBeNull();
        expect(createMatcher([]).match('x', ['x'])).toBeNull();
    });

    it('stays fast with a thousand sentences', () => {
        const entries = Array.from({ length: 400 }, (_, i) => ({ id: i, patterns: [`soru numarasi ${i} nedir`, `başka bir kelime ${i} burada`, `merhaba dünya ${i}`] }));
        const big = createMatcher(entries);
        const t = performance.now();
        for (let i = 0; i < 20; i++) find(big, 'soru numarasi 17 nedir acaba');
        expect((performance.now() - t) / 20).toBeLessThan(40);
    });
});
