import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitLesson, loadSharedLessons, resetSharedLessons, TEACH_MIN_GAP_MS } from './botTeach';

const memoryStore = () => {
    const data = {};
    return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
};

beforeEach(() => resetSharedLessons());

describe('submitLesson', () => {
    it('sends a trimmed lesson once, then asks to wait ten seconds', async () => {
        const send = vi.fn().mockResolvedValue();
        let now = 1_000_000;
        const options = { send, storage: memoryStore(), now: () => now };
        expect(await submitLesson({ q: 'q'.repeat(100), a: 'a'.repeat(300), lang: 'tr' }, options)).toBe('sent');
        expect(send).toHaveBeenCalledWith({ q: 'q'.repeat(80), a: 'a'.repeat(200), lang: 'tr' });
        expect(await submitLesson({ q: 'x1', a: 'y1' }, options)).toBe('tooSoon');
        now += TEACH_MIN_GAP_MS + 1;
        expect(await submitLesson({ q: 'x2', a: 'y2', lang: 'fr' }, options)).toBe('sent');
        expect(send).toHaveBeenLastCalledWith({ q: 'x2', a: 'y2', lang: 'en' });
    });

    it('does not count a refused lesson against the limit', async () => {
        const storage = memoryStore();
        const now = () => 9_000_000;
        await expect(submitLesson({ q: 'aa', a: 'bb' }, { storage, now, send: vi.fn().mockRejectedValue(new Error('no')) })).rejects.toThrow('no');
        expect(await submitLesson({ q: 'aa', a: 'bb' }, { storage, now, send: vi.fn().mockResolvedValue() })).toBe('sent');
    });
});

describe('loadSharedLessons', () => {
    it('returns the approved lessons, ignoring malformed entries', async () => {
        const fetchApproved = async () => ({
            a: { q: 'hi there', a: 'hello', lang: 'en', approvedAt: 1 },
            b: { q: 'broken' },
            c: { q: 'selam', a: 'naber', lang: 'tr', approvedAt: 2 },
            d: { q: 'x', a: 'y', lang: 'de' }
        });
        expect(await loadSharedLessons(fetchApproved)).toEqual([
            { q: 'hi there', a: 'hello', lang: 'en' },
            { q: 'selam', a: 'naber', lang: 'tr' }
        ]);
    });

    it('asks the database only once per visit and falls back to an empty list when it fails', async () => {
        const failing = vi.fn().mockRejectedValue(new Error('offline'));
        expect(await loadSharedLessons(failing)).toEqual([]);
        expect(await loadSharedLessons(failing)).toEqual([]);
        expect(failing).toHaveBeenCalledTimes(1);
    });

    it('copes with an empty database', async () => {
        expect(await loadSharedLessons(async () => null)).toEqual([]);
    });
});
