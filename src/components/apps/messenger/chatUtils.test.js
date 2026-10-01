import { describe, it, expect } from 'vitest';
import {
    getPrivateRoomId,
    getMessagesPath,
    censorText,
    formatTime,
    messagesFromSnapshot,
    requestsFromSnapshot,
    mergeUsersWithPrivate,
    buildUsernameCandidates,
    declineCooldownMinutesLeft,
    DECLINE_COOLDOWN_MS
} from './chatUtils';

describe('getPrivateRoomId', () => {
    it('is the same regardless of argument order', () => {
        expect(getPrivateRoomId('zed', 'amy')).toBe('amy_zed');
        expect(getPrivateRoomId('amy', 'zed')).toBe('amy_zed');
    });
});

describe('getMessagesPath', () => {
    it('uses the shared path for global rooms', () => {
        expect(getMessagesPath('global-2', null, 'me')).toBe('messages/global-2');
    });

    it('uses the sorted pair path for private chats', () => {
        expect(getMessagesPath('private', 'bob', 'me')).toBe('privateMessages/bob_me');
    });

    it('returns null for the private tab with no contact selected', () => {
        expect(getMessagesPath('private', null, 'me')).toBeNull();
    });
});

describe('censorText', () => {
    it('masks blocked words case-insensitively, everywhere they appear', () => {
        expect(censorText('Bad evil CURSED bad')).toBe('*** *** *** ***');
    });

    it('leaves clean text alone', () => {
        expect(censorText('hello world')).toBe('hello world');
    });
});

describe('formatTime', () => {
    it('returns an empty string for missing timestamps', () => {
        expect(formatTime(undefined)).toBe('');
        expect(formatTime(0)).toBe('');
    });

    it('passes preformatted strings through', () => {
        expect(formatTime('12:00:00')).toBe('12:00:00');
    });

    it('formats numeric timestamps as HH:MM:SS', () => {
        expect(formatTime(new Date(2024, 0, 1, 9, 5, 7).getTime())).toBe('09:05:07');
    });
});

describe('messagesFromSnapshot', () => {
    it('returns an empty array for no data', () => {
        expect(messagesFromSnapshot(null)).toEqual([]);
    });

    it('keeps the database key and sorts by timestamp', () => {
        const result = messagesFromSnapshot({
            b: { text: 'second', timestamp: 20 },
            a: { text: 'first', timestamp: 10 }
        });
        expect(result.map((m) => [m.key, m.text])).toEqual([['a', 'first'], ['b', 'second']]);
    });
});

describe('requestsFromSnapshot', () => {
    it('maps requests and keeps their keys', () => {
        expect(requestsFromSnapshot({ u1: { fromName: 'Ann' } })).toEqual([{ fromName: 'Ann', key: 'u1' }]);
        expect(requestsFromSnapshot(null)).toEqual([]);
    });
});

describe('mergeUsersWithPrivate', () => {
    it('attaches each user\'s private email, tolerating missing records', () => {
        const merged = mergeUsersWithPrivate(
            { u1: { username: 'ann' }, u2: { username: 'bob' } },
            { u1: { email: 'ann@x.com' } }
        );
        expect(merged).toEqual([
            { username: 'ann', uid: 'u1', email: 'ann@x.com' },
            { username: 'bob', uid: 'u2', email: undefined }
        ]);
    });
});

describe('buildUsernameCandidates', () => {
    it('tries the exact string first', () => {
        expect(buildUsernameCandidates('Gokalp')).toEqual(['Gokalp', 'gokalp']);
    });

    it('also tries the numeric form for numeric usernames', () => {
        expect(buildUsernameCandidates('444')).toEqual(['444', 444]);
    });

    it('does not duplicate an already-lowercase name', () => {
        expect(buildUsernameCandidates('bob')).toEqual(['bob']);
    });
});

describe('declineCooldownMinutesLeft', () => {
    it('reports remaining minutes inside the cooldown, rounded up', () => {
        const declinedAt = 1_000_000;
        expect(declineCooldownMinutesLeft(declinedAt, declinedAt + 30 * 60000)).toBe(30);
        expect(declineCooldownMinutesLeft(declinedAt, declinedAt + 1)).toBe(60);
    });

    it('is 0 once the cooldown has passed', () => {
        expect(declineCooldownMinutesLeft(0, DECLINE_COOLDOWN_MS)).toBe(0);
        expect(declineCooldownMinutesLeft(0, DECLINE_COOLDOWN_MS + 5000)).toBe(0);
    });
});
