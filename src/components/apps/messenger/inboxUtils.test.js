import { describe, it, expect } from 'vitest';
import { sourceOf, entriesFromSnapshot, unreadCount, replyAddress, replyHref, filterEntries } from './inboxUtils';

const entries = entriesFromSnapshot({
    a: { from: 'jane@example.com', subject: 'Message via Gökalp Bot from Jane', body: 'hi', sentVia: 'gokalp-bot', timestamp: 30 },
    b: { from: 'bob@example.com', subject: 'Hello', body: 'yo', sentVia: 'emailjs', timestamp: 10, readAt: 11 },
    c: { from: 'Gökalp Bot visitor', subject: 'Message via Gökalp Bot', body: 'x', sentVia: 'gokalp-bot', timestamp: 20 }
});

describe('inbox helpers', () => {
    it('lists newest first and ignores junk', () => {
        expect(entries.map((e) => e.id)).toEqual(['a', 'c', 'b']);
        expect(entriesFromSnapshot(null)).toEqual([]);
        expect(entriesFromSnapshot({ x: 'nope', y: null })).toEqual([]);
    });

    it('tells bot messages from form messages', () => {
        expect(sourceOf(entries[0])).toBe('bot');
        expect(sourceOf(entries[2])).toBe('form');
        expect(sourceOf(undefined)).toBe('form');
    });

    it('counts unread and filters', () => {
        expect(unreadCount(entries)).toBe(2);
        expect(filterEntries(entries, 'unread').map((e) => e.id)).toEqual(['a', 'c']);
        expect(filterEntries(entries, 'bot').map((e) => e.id)).toEqual(['a', 'c']);
        expect(filterEntries(entries, 'form').map((e) => e.id)).toEqual(['b']);
        expect(filterEntries(entries, 'all')).toHaveLength(3);
    });

    it('finds a reply address only when one exists', () => {
        expect(replyAddress(entries[0])).toBe('jane@example.com');
        expect(replyAddress(entries[1])).toBeNull();
        expect(replyHref(entries[0])).toBe('mailto:jane@example.com?subject=Re%3A%20Message%20via%20G%C3%B6kalp%20Bot%20from%20Jane');
        expect(replyHref(entries[1])).toBeNull();
        expect(replyHref({ from: 'a@b.co', subject: 'Re: Hi' })).toBe('mailto:a@b.co?subject=Re%3A%20Hi');
    });
});
