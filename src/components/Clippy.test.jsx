import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { LanguageProvider } from '../context/LanguageContext';
import Clippy from './Clippy';
import { CLIPPY_TIPS } from '../i18n/clippyTips';

beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

const setup = (props = {}) => render(
    <LanguageProvider><Clippy openWindows={[]} focusedWindowId={null} {...props} /></LanguageProvider>
);
const advance = (ms) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const bubble = () => document.querySelector('.clippy-bubble-text')?.textContent ?? null;
const EN = CLIPPY_TIPS.en;

describe('Clippy', () => {
    it('appears after a moment with a general tip', async () => {
        setup();
        expect(bubble()).toBeNull();
        await advance(2600);
        expect(EN.default).toContain(bubble());
    });

    it('shows a different tip each time it is clicked, and every tip once before repeating', async () => {
        setup();
        await advance(2600);
        const seen = [bubble()];
        for (let i = 1; i < EN.default.length; i++) {
            fireEvent.click(screen.getByRole('button', { name: 'Click me' }));
            seen.push(bubble());
        }
        expect(new Set(seen).size).toBe(EN.default.length);
    });

    it('has an "Another tip" link in the bubble', async () => {
        setup();
        await advance(2600);
        const first = bubble();
        fireEvent.click(screen.getByText('Another tip ▸'));
        expect(bubble()).not.toBe(first);
        expect(EN.default).toContain(bubble());
    });

    it('speaks about the app that is in focus', async () => {
        const view = setup();
        await advance(2600);
        view.rerender(
            <LanguageProvider>
                <Clippy openWindows={[{ id: 'terminal', title: 'Terminal' }]} focusedWindowId="terminal" />
            </LanguageProvider>
        );
        expect(EN.terminal).toContain(bubble());
        view.rerender(
            <LanguageProvider>
                <Clippy openWindows={[{ id: 'a.txt', title: 'a.txt' }]} focusedWindowId="a.txt" />
            </LanguageProvider>
        );
        expect(EN.notepad).toContain(bubble());
    });

    it('nudges towards an app you have not opened after a quiet spell, once per app', async () => {
        setup();
        await advance(2600);
        document.querySelector('.clippy-bubble-close').click();
        await advance(60000);
        expect(bubble()).toBeNull(); // not quiet for long enough yet
        await advance(30000);
        expect(bubble()).toBe(EN.discover.terminal);
        await advance(100000);
        expect(bubble()).toBe(EN.discover.messenger);
    });

    it('does not nudge while you keep clicking or typing', async () => {
        setup();
        await advance(2600);
        document.querySelector('.clippy-bubble-close').click();
        for (let i = 0; i < 8; i++) {
            fireEvent.pointerDown(window);
            await advance(30000);
        }
        expect(bubble()).toBeNull();
    });

    it('skips apps you already opened and gives general tips once all were seen', async () => {
        const view = setup();
        await advance(2600);
        for (const id of ['terminal', 'messenger']) {
            view.rerender(
                <LanguageProvider><Clippy openWindows={[{ id, title: id }]} focusedWindowId={id} /></LanguageProvider>
            );
        }
        document.querySelector('.clippy-bubble-close').click();
        await advance(100000);
        expect(bubble()).toBe(EN.discover.paint);
    });

    it('can be hidden', async () => {
        setup();
        await advance(2600);
        fireEvent.click(screen.getByLabelText('Hide the assistant'));
        expect(document.querySelector('.clippy-root')).toBeNull();
    });
});
