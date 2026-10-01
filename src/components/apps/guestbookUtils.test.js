import { describe, it, expect } from 'vitest';
import {
    normalizeEntry, validateEntry, cooldownRemainingMs, entriesFromSnapshot,
    NAME_MAX, MESSAGE_MAX, POST_COOLDOWN_MS
} from './guestbookUtils';

describe('normalizeEntry', () => {
    it('trims and collapses whitespace, keeping the name on one line', () => {
        expect(normalizeEntry({ name: '  Ada \n Lovelace  ', message: '  hi   there \n\n\n\nbye ' })).toEqual({
            name: 'Ada Lovelace',
            message: 'hi there\n\nbye'
        });
    });

    it('survives missing fields', () => {
        expect(normalizeEntry({})).toEqual({ name: '', message: '' });
    });
});

describe('validateEntry', () => {
    it('accepts a normal entry', () => {
        expect(validateEntry({ name: 'Ece', message: 'Great site!' })).toEqual([]);
    });

    it('requires both fields (whitespace does not count)', () => {
        expect(validateEntry({ name: '   ', message: '' })).toEqual(['nameRequired', 'messageRequired']);
    });

    it('enforces the length limits', () => {
        expect(validateEntry({ name: 'a'.repeat(NAME_MAX + 1), message: 'ok' })).toEqual(['nameTooLong']);
        expect(validateEntry({ name: 'a', message: 'b'.repeat(MESSAGE_MAX + 1) })).toEqual(['messageTooLong']);
        expect(validateEntry({ name: 'a'.repeat(NAME_MAX), message: 'b'.repeat(MESSAGE_MAX) })).toEqual([]);
    });
});

describe('cooldownRemainingMs', () => {
    it('is zero when nothing was posted or the cooldown passed', () => {
        expect(cooldownRemainingMs(null, 1000)).toBe(0);
        expect(cooldownRemainingMs(1000, 1000 + POST_COOLDOWN_MS)).toBe(0);
    });

    it('counts down after a post', () => {
        expect(cooldownRemainingMs(1000, 1000)).toBe(POST_COOLDOWN_MS);
        expect(cooldownRemainingMs(1000, 11000)).toBe(POST_COOLDOWN_MS - 10000);
    });
});

describe('entriesFromSnapshot', () => {
    it('returns newest first with ids', () => {
        const result = entriesFromSnapshot({ a: { timestamp: 1, name: 'x' }, b: { timestamp: 5, name: 'y' } });
        expect(result.map((e) => e.id)).toEqual(['b', 'a']);
        expect(entriesFromSnapshot(null)).toEqual([]);
    });
});
