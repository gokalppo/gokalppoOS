import { describe, it, expect } from 'vitest';
import { cleanName, validateScore, topScores, scoreKey, bestPerName, NAME_MAX, MAX_TIME } from './minesweeperScores';

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

describe('scoreKey', () => {
    it('treats casing and spacing differences as the same player', () => {
        expect(scoreKey('Ada Lovelace')).toBe('ada-lovelace');
        expect(scoreKey('  ada   LOVELACE ')).toBe('ada-lovelace');
    });

    it('only produces database-safe keys', () => {
        expect(scoreKey('A.b/c#d$[e]')).toBe('a-b-c-d-e');
        expect(scoreKey('x'.repeat(50))).toHaveLength(NAME_MAX);
        expect(scoreKey('***')).toBe('player');
        expect(scoreKey('')).toBe('player');
    });
});

describe('bestPerName', () => {
    it('keeps each player\'s fastest time only', () => {
        const rows = [
            { name: 'Ada', time: 89, timestamp: 1 },
            { name: 'ada ', time: 65, timestamp: 2 },
            { name: 'Bob', time: 70, timestamp: 3 }
        ];
        expect(bestPerName(rows).map((r) => [r.name, r.time]).sort()).toEqual([['Bob', 70], ['ada ', 65]]);
    });

    it('on an exact tie keeps the earlier submission', () => {
        const rows = [
            { name: 'Ada', time: 50, timestamp: 9 },
            { name: 'ada', time: 50, timestamp: 4 }
        ];
        expect(bestPerName(rows)).toEqual([{ name: 'ada', time: 50, timestamp: 4 }]);
    });
});

describe('topScores with legacy duplicates', () => {
    it('shows a player once, with their best time (89s then 65s -> 65s)', () => {
        const data = {
            '-OldPushKey1': { name: 'Gokalp', time: 89, timestamp: 1 },
            '-OldPushKey2': { name: 'Gokalp', time: 65, timestamp: 2 },
            other: { name: 'Bob', time: 70, timestamp: 3 }
        };
        expect(topScores(data).map((e) => [e.name, e.time])).toEqual([['Gokalp', 65], ['Bob', 70]]);
    });
});
