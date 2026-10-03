import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeDb } from '../../test/fakeDatabase';

vi.mock('firebase/database', async () => (await import('../../test/fakeDatabase')).databaseMock);
vi.mock('../../firebase', () => ({ db: {} }));

import { startRun, finishRun, submitTime } from './leaderboard';

beforeEach(() => fakeDb.reset());

describe('runs (the server\'s record of a game)', () => {
    it('starting a game stores a random 20-character id with a server start stamp', async () => {
        const a = await startRun();
        const b = await startRun();
        expect(a).toMatch(/^[a-f0-9]{20}$/);
        expect(b).not.toBe(a);
        expect(typeof fakeDb.read(`runs/${a}/startedAt`)).toBe('number');
    });

    it('finishing stamps the end of that run', async () => {
        const id = await startRun();
        await finishRun(id);
        expect(typeof fakeDb.read(`runs/${id}/finishedAt`)).toBe('number');
    });
});

describe('saving a time', () => {
    it('stores the record together with the run it belongs to, and marks the run used', async () => {
        const run = await startRun();
        await finishRun(run);
        const outcome = await submitTime({ name: 'Ada', time: 42, run });
        expect(outcome).toEqual({ status: 'saved' });
        expect(fakeDb.read('leaderboards/minesweeper/ada')).toMatchObject({ name: 'Ada', time: 42, run });
        expect(typeof fakeDb.read(`runs/${run}/usedAt`)).toBe('number');
    });

    it('refuses to save without a finished game or with an impossible time', async () => {
        await expect(submitTime({ name: 'Ada', time: 42 })).rejects.toThrow('noRun');
        await expect(submitTime({ name: 'Ada', time: 42, run: null })).rejects.toThrow('noRun');
        await expect(submitTime({ name: 'Ada', time: 2, run: 'a'.repeat(20) })).rejects.toThrow('badTime');
        expect(fakeDb.read('leaderboards/minesweeper')).toBeNull();
    });

    it('does not use up the game when the existing record is already as fast', async () => {
        fakeDb.seed('leaderboards/minesweeper/ada', { name: 'Ada', time: 30, timestamp: 1, run: 'b'.repeat(20) });
        const run = await startRun();
        await finishRun(run);
        const outcome = await submitTime({ name: 'Ada', time: 40, run });
        expect(outcome).toEqual({ status: 'not-faster', best: 30 });
        expect(fakeDb.read(`runs/${run}/usedAt`)).toBeNull();
    });
});
