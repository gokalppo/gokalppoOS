import { describe, it, expect } from 'vitest';
import { shouldCountVisit } from './visitorSession';

const makeStorage = () => {
    const data = new Map();
    return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
};

describe('shouldCountVisit', () => {
    it('counts the first visit of a session and ignores reloads after that', () => {
        const storage = makeStorage();
        expect(shouldCountVisit(storage)).toBe(true);
        expect(shouldCountVisit(storage)).toBe(false);
        expect(shouldCountVisit(storage)).toBe(false);
    });

    it('a new session (empty storage) counts again', () => {
        expect(shouldCountVisit(makeStorage())).toBe(true);
    });

    it('still counts when storage is blocked, rather than throwing', () => {
        const blocked = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
        expect(shouldCountVisit(blocked)).toBe(true);
    });
});
