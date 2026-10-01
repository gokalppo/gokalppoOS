import { describe, it, expect } from 'vitest';
import { findAll, findNext, replaceRange, replaceAll, timeDateStamp } from './textSearch';

describe('findAll', () => {
    it('finds every non-overlapping match, case-insensitive by default', () => {
        expect(findAll('Cat cat CAT', 'cat')).toEqual([
            { start: 0, end: 3 }, { start: 4, end: 7 }, { start: 8, end: 11 }
        ]);
    });

    it('can match case', () => {
        expect(findAll('Cat cat CAT', 'cat', { matchCase: true })).toEqual([{ start: 4, end: 7 }]);
    });

    it('treats the query literally, not as a pattern', () => {
        expect(findAll('a.b a*b aXb', 'a.b')).toEqual([{ start: 0, end: 3 }]);
        expect(findAll('1+1=2 (ok) [x]', '(ok)')).toEqual([{ start: 6, end: 10 }]);
        expect(findAll('x[abc]y', '[abc]')).toHaveLength(1);
        expect(findAll('price $5', '$5')).toHaveLength(1);
    });

    it('returns nothing for an empty query or no match', () => {
        expect(findAll('abc', '')).toEqual([]);
        expect(findAll('abc', 'z')).toEqual([]);
    });

    it('handles overlapping text without double counting', () => {
        expect(findAll('aaaa', 'aa')).toHaveLength(2);
    });

    it('keeps indices correct for Turkish characters', () => {
        const text = 'İstanbul ve ISTANBUL ve istanbul';
        const matches = findAll(text, 'istanbul');
        for (const m of matches) expect(text.slice(m.start, m.end).toLowerCase().replace('i̇', 'i')).toContain('stanbul');
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    it('matches newlines and multi-line text', () => {
        expect(findAll('a\nb\na', 'a')).toHaveLength(2);
    });
});

describe('findNext', () => {
    const text = 'one two one two one';

    it('returns the next match at or after the position', () => {
        expect(findNext(text, 'one', 0)).toEqual({ start: 0, end: 3 });
        expect(findNext(text, 'one', 1)).toEqual({ start: 8, end: 11 });
        expect(findNext(text, 'one', 9)).toEqual({ start: 16, end: 19 });
    });

    it('wraps to the first match after the last one', () => {
        expect(findNext(text, 'one', 17)).toEqual({ start: 0, end: 3 });
    });

    it('does not wrap when told not to', () => {
        expect(findNext(text, 'one', 17, { wrap: false })).toBeNull();
    });

    it('returns null when nothing matches', () => {
        expect(findNext(text, 'xyz', 0)).toBeNull();
    });
});

describe('replace', () => {
    it('replaces one match in place', () => {
        const m = { start: 4, end: 7 };
        expect(replaceRange('one two three', m, 'TWO')).toBe('one TWO three');
    });

    it('replaces every match and reports how many', () => {
        expect(replaceAll('a b a b a', 'a', 'x')).toEqual({ text: 'x b x b x', count: 3 });
    });

    it('respects match case and leaves the text alone when nothing matches', () => {
        expect(replaceAll('Cat cat', 'cat', 'dog', { matchCase: true })).toEqual({ text: 'Cat dog', count: 1 });
        expect(replaceAll('abc', 'z', 'y')).toEqual({ text: 'abc', count: 0 });
    });

    it('does not interpret $ patterns in the replacement', () => {
        expect(replaceAll('a', 'a', '$&$1').text).toBe('$&$1');
    });

    it('can delete text by replacing with an empty string', () => {
        expect(replaceAll('a-b-c', '-', '').text).toBe('abc');
    });

    it('does not re-scan the replacement (no infinite growth)', () => {
        expect(replaceAll('a', 'a', 'aa')).toEqual({ text: 'aa', count: 1 });
    });
});

describe('timeDateStamp', () => {
    it('combines a time and a date', () => {
        const stamp = timeDateStamp(new Date(2026, 9, 1, 14, 5), 'en');
        expect(stamp).toMatch(/2:05|02:05/);
        expect(stamp).toMatch(/2026/);
    });
});
