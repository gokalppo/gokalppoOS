import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { DisplayProvider } from '../context/DisplayContext';
import { DISPLAY_STORAGE_KEY } from '../display/displayConfig';
import ScreenSaver from './ScreenSaver';

const mockReducedMotion = (reduce) => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: reduce && query.includes('reduce'), media: query, addEventListener() { }, removeEventListener() { }
    }));
};

const setup = (display) => {
    if (display) localStorage.setItem(DISPLAY_STORAGE_KEY, JSON.stringify(display));
    return render(<DisplayProvider><ScreenSaver /></DisplayProvider>);
};

const overlay = () => document.querySelector('.screensaver-overlay');

beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
        fillRect() { }, beginPath() { }, moveTo() { }, lineTo() { }, stroke() { }, closePath() { }
    }));
    window.requestAnimationFrame = vi.fn(() => 1);
    window.cancelAnimationFrame = vi.fn();
    mockReducedMotion(false);
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe('ScreenSaver', () => {
    it('starts after the configured idle time and not before', () => {
        setup({ saver: 'starfield', saverMinutes: 5 });
        act(() => { vi.advanceTimersByTime(4 * 60 * 1000); });
        expect(overlay()).toBeNull();
        act(() => { vi.advanceTimersByTime(61 * 1000); });
        expect(overlay()).not.toBeNull();
    });

    it('activity restarts the idle countdown', () => {
        setup({ saver: 'starfield', saverMinutes: 1 });
        act(() => { vi.advanceTimersByTime(50 * 1000); });
        act(() => { window.dispatchEvent(new Event('mousemove')); });
        act(() => { vi.advanceTimersByTime(50 * 1000); });
        expect(overlay()).toBeNull();
        act(() => { vi.advanceTimersByTime(15 * 1000); });
        expect(overlay()).not.toBeNull();
    });

    it('never starts when the saver is set to None', () => {
        setup({ saver: 'none', saverMinutes: 1 });
        act(() => { vi.advanceTimersByTime(30 * 60 * 1000); });
        expect(overlay()).toBeNull();
    });

    it('never starts for people who prefer reduced motion', () => {
        mockReducedMotion(true);
        setup({ saver: 'starfield', saverMinutes: 1 });
        act(() => { vi.advanceTimersByTime(30 * 60 * 1000); });
        expect(overlay()).toBeNull();
    });

    it('ignores the preview request under reduced motion, honours it otherwise', () => {
        mockReducedMotion(true);
        const reduced = setup({ saver: 'mystify' });
        act(() => { window.dispatchEvent(new CustomEvent('screensaver-preview', { detail: { saver: 'mystify' } })); });
        expect(overlay()).toBeNull();
        reduced.unmount();

        mockReducedMotion(false);
        setup({ saver: 'none' });
        act(() => { window.dispatchEvent(new CustomEvent('screensaver-preview', { detail: { saver: 'mystify' } })); });
        expect(overlay()).not.toBeNull();
    });

    it('dismisses on input once the short grace period has passed', () => {
        setup({ saver: 'starfield', saverMinutes: 1 });
        act(() => { vi.advanceTimersByTime(61 * 1000); });
        expect(overlay()).not.toBeNull();

        act(() => { window.dispatchEvent(new Event('mousemove')); }); // jitter right after it appears
        expect(overlay()).not.toBeNull();

        act(() => { vi.advanceTimersByTime(600); });
        act(() => { window.dispatchEvent(new Event('mousedown')); });
        expect(overlay()).toBeNull();
    });
});
