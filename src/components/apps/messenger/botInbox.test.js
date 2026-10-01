import { describe, it, expect, vi } from 'vitest';
import { buildOutboxEntry, submitBotMessage, BOT_INBOX_MIN_GAP_MS } from './botInbox';

const memoryStore = () => {
    const data = {};
    return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
};

describe('outbox entry', () => {
    it('has every field the database rules require, within their limits', () => {
        const entry = buildOutboxEntry({ message: 'Hello Gökalp', contact: 'me@example.com', name: 'Ayşe', lang: 'tr' }, 123);
        expect(Object.keys(entry).sort()).toEqual(['body', 'from', 'sentVia', 'subject', 'timestamp', 'to']);
        expect(entry.from).toBe('me@example.com');
        expect(entry.subject).toBe('Message via Gökalp Bot from Ayşe');
        expect(entry.body).toContain('Hello Gökalp');
        expect(entry.body).toContain('Reply to: me@example.com');
        expect(entry.sentVia).toBe('gokalp-bot');
        expect(entry.timestamp).toBe(123);
    });

    it('trims everything to the rule limits', () => {
        const entry = buildOutboxEntry({ message: 'x'.repeat(9000), contact: 'a'.repeat(300), name: 'n'.repeat(300) });
        expect(entry.from.length).toBeLessThanOrEqual(120);
        expect(entry.subject.length).toBeLessThanOrEqual(200);
        expect(entry.body.length).toBeLessThanOrEqual(5000);
        expect(entry.sentVia.length).toBeLessThanOrEqual(30);
    });

    it('copes with no name and no reply address', () => {
        const entry = buildOutboxEntry({ message: 'Just a note' });
        expect(entry.from).toBe('Gökalp Bot visitor');
        expect(entry.body).toContain('(no reply address)');
    });
});

describe('submitBotMessage', () => {
    it('sends once, then asks to wait a minute', async () => {
        const send = vi.fn().mockResolvedValue();
        const storage = memoryStore();
        let now = 1_000_000;
        const options = { send, storage, now: () => now };

        expect(await submitBotMessage({ message: 'one' }, options)).toBe('sent');
        expect(await submitBotMessage({ message: 'two' }, options)).toBe('tooSoon');
        expect(send).toHaveBeenCalledTimes(1);

        now += BOT_INBOX_MIN_GAP_MS + 1;
        expect(await submitBotMessage({ message: 'three' }, options)).toBe('sent');
        expect(send).toHaveBeenCalledTimes(2);
    });

    it('does not count a failed send against the limit', async () => {
        const storage = memoryStore();
        const options = { storage, now: () => 5_000_000 };
        await expect(submitBotMessage({ message: 'x' }, { ...options, send: vi.fn().mockRejectedValue(new Error('denied')) })).rejects.toThrow('denied');
        expect(await submitBotMessage({ message: 'x' }, { ...options, send: vi.fn().mockResolvedValue() })).toBe('sent');
    });
});
