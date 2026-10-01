import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBotChat } from './hooks/useBotChat';
import { setBotTimingScale } from './botEngine';

beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    setBotTimingScale(1);
});
afterEach(() => {
    vi.useRealTimers();
    setBotTimingScale(1);
});

const run = (ms) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const texts = (hook) => hook.result.current.messages.map((m) => m.text);

describe('useBotChat', () => {
    it('starts with the two-bubble greeting and quick replies on the last one', () => {
        const hook = renderHook(() => useBotChat('en'));
        const { messages } = hook.result.current;
        expect(messages).toHaveLength(2);
        expect(messages[0].suggestions).toEqual([]);
        expect(messages[1].suggestions).toEqual(['Projects', 'Skills', 'Resume', 'Contact']);
    });

    it('shows your message at once, then "typing", then the answer bubble by bubble', async () => {
        const hook = renderHook(() => useBotChat('en'));
        await act(async () => { await hook.result.current.send('cindranet'); });

        expect(texts(hook).at(-1)).toBe('cindranet');
        expect(hook.result.current.isTyping).toBe(true);

        await run(300);
        expect(hook.result.current.messages).toHaveLength(3);     // nothing yet: the bot is still "reading"
        await run(2500);
        const afterFirst = hook.result.current.messages.length;
        expect(afterFirst).toBeGreaterThanOrEqual(4);              // first bubble arrived
        await run(5000);
        const all = hook.result.current.messages;
        expect(all.at(-1).text).toMatch(/Built with Rust/);
        expect(hook.result.current.isTyping).toBe(false);
        expect(all.at(-1).suggestions[0]).toBe('More details'); // buttons only on the last bubble
        expect(all.at(-2).suggestions).toEqual([]);
    });

    it('queues answers so two quick questions are answered in order', async () => {
        const hook = renderHook(() => useBotChat('en'));
        await act(async () => { await hook.result.current.send('github'); });
        await act(async () => { await hook.result.current.send('linkedin'); });
        await run(20000);
        const t = texts(hook);
        expect(t.findIndex((x) => /His GitHub/.test(x))).toBeLessThan(t.findIndex((x) => /His LinkedIn/.test(x)));
        expect(hook.result.current.isTyping).toBe(false);
    });

    it('ignores blank messages', async () => {
        const hook = renderHook(() => useBotChat('en'));
        let sent;
        await act(async () => { sent = await hook.result.current.send('   '); });
        expect(sent).toBe(false);
        expect(hook.result.current.messages).toHaveLength(2);
    });

    it('remembers the visitor name for next time, and welcomes them back', async () => {
        const first = renderHook(() => useBotChat('en'));
        await act(async () => { await first.result.current.send('my name is ayşe'); });
        await run(10000);
        first.unmount();
        expect(JSON.parse(localStorage.getItem('gokalppoOS_botMemory'))).toEqual({ name: 'Ayşe', visits: 1 });

        const second = renderHook(() => useBotChat('en'));
        expect(second.result.current.messages[0].text).toMatch(/Welcome back, Ayşe/);
        expect(JSON.parse(localStorage.getItem('gokalppoOS_botMemory')).visits).toBe(2);
    });

    it('nudges once after a quiet spell but not before the visitor said anything', async () => {
        const hook = renderHook(() => useBotChat('en'));
        await run(300000);
        expect(hook.result.current.messages).toHaveLength(2);

        await act(async () => { await hook.result.current.send('github'); });
        await run(10000);
        const before = hook.result.current.messages.length;
        await run(80000);
        expect(hook.result.current.messages.length).toBe(before + 1);
        expect(texts(hook).at(-1)).toMatch(/Still there|No rush/);
        await run(300000);
        expect(hook.result.current.messages.length).toBe(before + 1);
    });

    it('does not nudge someone who said goodbye', async () => {
        const hook = renderHook(() => useBotChat('en'));
        await act(async () => { await hook.result.current.send('bye'); });
        await run(10000);
        const count = hook.result.current.messages.length;
        await run(300000);
        expect(hook.result.current.messages.length).toBe(count);
    });

    it('passes a confirmed message on and reports the result', async () => {
        const submit = vi.fn().mockResolvedValue('sent');
        const hook = renderHook(() => useBotChat('en', { submit }));
        const say = async (m) => { await act(async () => { await hook.result.current.send(m); }); await run(10000); };
        await say('leave a message');
        await say('Hello Gökalp, I would love to talk about an internship.');
        await say('jane@example.com');
        expect(submit).not.toHaveBeenCalled();
        await say('yes');
        expect(submit).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Hello Gökalp, I would love to talk about an internship.', contact: 'jane@example.com', lang: 'en'
        }));
        const t = texts(hook);
        expect(t.some((x) => /Sending it now/.test(x))).toBe(true);
        expect(t.at(-1)).toMatch(/on its way/);
    });

    it('tells the visitor when sending fails or is too soon', async () => {
        for (const [submit, expected] of [
            [vi.fn().mockRejectedValue(new Error('denied')), /couldn't send that/],
            [vi.fn().mockResolvedValue('tooSoon'), /wait a minute/]
        ]) {
            const hook = renderHook(() => useBotChat('en', { submit }));
            const say = async (m) => { await act(async () => { await hook.result.current.send(m); }); await run(10000); };
            await say('leave a message');
            await say('A message that is long enough to be sent.');
            await say('skip');
            await say('yes');
            expect(texts(hook).at(-1)).toMatch(expected);
        }
    });

    it('stops quietly when the chat is closed mid-answer', async () => {
        const hook = renderHook(() => useBotChat('en'));
        await act(async () => { await hook.result.current.send('projects'); });
        hook.unmount();
        await expect(run(20000)).resolves.not.toThrow();
    });
});
