import { describe, it, expect } from 'vitest';
import { cleanName, validateScore, topScores, NAME_MAX, MAX_TIME } from './minesweeperScores';

describe('cleanName', () => {
    it('trims and collapses whitespace', () => {
        expect(cleanName('  Ada   Lovelace ')).toBe('Ada Lovelace');
        expect(cleanName(undefined)).toBe('');
    });
});

describe('validateScore', () => {
    it('accepts a normal score', () => {
        expect(validateScore({ name: 'Ada', time: 42 })).toEqual([]);
        expect(validateScore({ name: 'a'.repeat(NAME_MAX), time: MAX_TIME })).toEqual([]);
    });

    it('requires a name within the limit', () => {
        expect(validateScore({ name: '  ', time: 10 })).toEqual(['nameRequired']);
        expect(validateScore({ name: 'a'.repeat(NAME_MAX + 1), time: 10 })).toEqual(['nameTooLong']);
    });

    it('requires a whole number of seconds from 1 to 999', () => {
        for (const time of [0, -3, 1000, 12.5, NaN, '30']) {
            expect(validateScore({ name: 'Ada', time }), String(time)).toEqual(['badTime']);
        }
    });
});

describe('topScores', () => {
    const data = {
        a: { name: 'Slow', time: 90, timestamp: 1 },
        b: { name: 'Fast', time: 12, timestamp: 5 },
        c: { name: 'AlsoFast', time: 12, timestamp: 2 },
        d: { name: 'Broken' }
    };

    it('sorts fastest first, earlier submission wins ties, and skips malformed rows', () => {
        expect(topScores(data).map((e) => e.name)).toEqual(['AlsoFast', 'Fast', 'Slow']);
    });

    it('limits the list and handles empty data', () => {
        expect(topScores(data, 2)).toHaveLength(2);
        expect(topScores(null)).toEqual([]);
    });
});
