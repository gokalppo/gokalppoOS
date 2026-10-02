/* global process */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isTrackable, sanitizeAppId, sortUsage, trackAppOpen, KNOWN_APPS } from './appUsage';

const updateMock = vi.fn(() => Promise.resolve());
vi.mock('../firebase', () => ({ db: {} }));
vi.mock('firebase/database', () => ({
    ref: (_db, path) => ({ path }),
    update: (...args) => updateMock(...args),
    increment: (n) => ({ __increment: n })
}));

beforeEach(() => updateMock.mockClear());

describe('isTrackable', () => {
    it('is on for real visitors', () => {
        expect(isTrackable({ doNotTrack: null, hostname: 'gokalppo.me' })).toBe(true);
        expect(isTrackable({ doNotTrack: '0', hostname: 'gokalppo.me' })).toBe(true);
    });

    it('respects Do Not Track', () => {
        expect(isTrackable({ doNotTrack: '1', hostname: 'gokalppo.me' })).toBe(false);
        expect(isTrackable({ doNotTrack: 'yes', hostname: 'gokalppo.me' })).toBe(false);
    });

    it('ignores local development', () => {
        for (const hostname of ['localhost', '127.0.0.1', '[::1]']) {
            expect(isTrackable({ doNotTrack: null, hostname })).toBe(false);
        }
    });
});

describe('sanitizeAppId', () => {
    it('keeps simple ids and strips unsafe key characters', () => {
        expect(sanitizeAppId('musicplayer')).toBe('musicplayer');
        expect(sanitizeAppId('My.App/1#2')).toBe('my_app_1_2');
        expect(sanitizeAppId('x'.repeat(80))).toHaveLength(40);
        expect(sanitizeAppId(undefined)).toBe('');
    });
});

describe('sortUsage', () => {
    it('sorts by opens (descending), then by name', () => {
        expect(sortUsage({ paint: 3, terminal: 9, gallery: 3 })).toEqual([
            { app: 'terminal', opens: 9 },
            { app: 'gallery', opens: 3 },
            { app: 'paint', opens: 3 }
        ]);
        expect(sortUsage(null)).toEqual([]);
    });
});

describe('trackAppOpen', () => {
    const prod = { doNotTrack: null, hostname: 'gokalppo.me' };

    it('increments the app counter by exactly one', async () => {
        await trackAppOpen('paint', prod);
        expect(updateMock).toHaveBeenCalledTimes(1);
        expect(updateMock).toHaveBeenCalledWith({ path: 'analytics/appOpens' }, { paint: { __increment: 1 } });
    });

    it('sends nothing for opted-out visitors, local dev or empty ids', async () => {
        await trackAppOpen('paint', { doNotTrack: '1', hostname: 'gokalppo.me' });
        await trackAppOpen('paint', { doNotTrack: null, hostname: 'localhost' });
        await trackAppOpen('', prod);
        expect(updateMock).not.toHaveBeenCalled();
    });

    it('swallows backend failures', async () => {
        updateMock.mockRejectedValueOnce(new Error('offline'));
        await expect(trackAppOpen('paint', prod)).resolves.toBeUndefined();
    });
});

describe('only real apps are counted', () => {
    const prod = { doNotTrack: null, hostname: 'gokalppo.me' };

    it('ignores made-up ids and the names of the visitor\'s own files', async () => {
        await trackAppOpen('totally-made-up', prod);
        await trackAppOpen('my-secret-notes_txt', prod);
        expect(updateMock).not.toHaveBeenCalled();
    });

    it('counts every app that exists', async () => {
        for (const id of KNOWN_APPS) await trackAppOpen(id, prod);
        expect(updateMock).toHaveBeenCalledTimes(KNOWN_APPS.length);
    });

    it('agrees with the database rules, so a counter is never refused (or invented)', () => {
        const rules = JSON.parse(readFileSync(resolve(process.cwd(), 'database.rules.json'), 'utf8'));
        const clause = rules.rules.analytics.appOpens.$app['.write'];
        const allowed = new RegExp(clause.match(/matches\(\/(.*)\/\)/)[1]);
        for (const id of KNOWN_APPS) expect(allowed.test(id), id).toBe(true);
        expect(allowed.test('made-up')).toBe(false);
        // and nothing the rules accept is missing from the client list
        const listed = clause.match(/\^\((.*)\)\$/)[1].split('|');
        expect(listed.sort()).toEqual([...KNOWN_APPS].sort());
    });
});
