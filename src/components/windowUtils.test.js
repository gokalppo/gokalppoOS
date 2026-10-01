import { describe, it, expect } from 'vitest';
import {
    parsePx,
    resolveInitialSize,
    cascadePosition,
    computeResize,
    switcherOrder,
    nextSwitcherIndex,
    nextFocusAfterMinimize
} from './windowUtils';

const viewport = { width: 1000, height: 700 };

describe('parsePx', () => {
    it('parses numbers and px strings', () => {
        expect(parsePx(480)).toBe(480);
        expect(parsePx('480px')).toBe(480);
        expect(parsePx(' 12.5px ')).toBe(12.5);
    });

    it('rejects anything that is not a plain pixel size', () => {
        expect(parsePx('50%')).toBeUndefined();
        expect(parsePx('auto')).toBeUndefined();
        expect(parsePx(undefined)).toBeUndefined();
        expect(parsePx(NaN)).toBeUndefined();
    });
});

describe('resolveInitialSize', () => {
    it('uses the defaults when no options are given', () => {
        expect(resolveInitialSize({}, viewport)).toEqual({ width: 450, height: 350, minWidth: 260, minHeight: 160 });
    });

    it('honors width/height/min options', () => {
        const size = resolveInitialSize({ width: '480px', height: '380px', minWidth: '360px', minHeight: '280px' }, viewport);
        expect(size).toEqual({ width: 480, height: 380, minWidth: 360, minHeight: 280 });
    });

    it('never exceeds the desktop and lowers the minimums to match', () => {
        const small = { width: 600, height: 400 };
        const size = resolveInitialSize({ width: '830px', height: '600px', minWidth: '750px', minHeight: '550px' }, small);
        expect(size.width).toBe(580);
        expect(size.height).toBe(350);
        expect(size.minWidth).toBeLessThanOrEqual(size.width);
        expect(size.minHeight).toBeLessThanOrEqual(size.height);
    });
});

describe('cascadePosition', () => {
    it('keeps the window fully on the desktop', () => {
        const size = { width: 450, height: 350 };
        for (let i = 0; i < 12; i++) {
            const { x, y } = cascadePosition(size, viewport, i);
            expect(x).toBeGreaterThanOrEqual(0);
            expect(y).toBeGreaterThanOrEqual(0);
            expect(x + size.width).toBeLessThanOrEqual(viewport.width);
            expect(y + size.height).toBeLessThanOrEqual(viewport.height - 30);
        }
    });

    it('staggers consecutive windows', () => {
        const size = { width: 450, height: 350 };
        const a = cascadePosition(size, viewport, 0);
        const b = cascadePosition(size, viewport, 1);
        expect(b.x).toBeGreaterThan(a.x);
        expect(b.y).toBeGreaterThan(a.y);
    });
});

describe('computeResize', () => {
    const start = { x: 100, y: 100, width: 400, height: 300 };
    const min = { width: 200, height: 150 };

    it('east/south grow the size and keep the origin', () => {
        expect(computeResize('se', start, 50, 40, min, viewport)).toEqual({ x: 100, y: 100, width: 450, height: 340 });
    });

    it('west/north move the origin so the opposite edge stays fixed', () => {
        const r = computeResize('nw', start, -30, -20, min, viewport);
        expect(r).toEqual({ x: 70, y: 80, width: 430, height: 320 });
        expect(r.x + r.width).toBe(500);
        expect(r.y + r.height).toBe(400);
    });

    it('stops at the minimum size without drifting the fixed edge', () => {
        const r = computeResize('w', start, 999, 0, min, viewport);
        expect(r.width).toBe(200);
        expect(r.x + r.width).toBe(500);
    });

    it('cannot grow past the desktop edges or under the taskbar', () => {
        const r = computeResize('se', start, 5000, 5000, min, viewport);
        expect(r.x + r.width).toBe(viewport.width);
        expect(r.y + r.height).toBe(viewport.height - 30);
    });

    it('cannot be dragged past the top-left corner', () => {
        const r = computeResize('nw', start, -5000, -5000, min, viewport);
        expect(r.x).toBe(0);
        expect(r.y).toBe(0);
    });

    it('edge handles only change one axis', () => {
        expect(computeResize('e', start, 20, 99, min, viewport)).toEqual({ x: 100, y: 100, width: 420, height: 300 });
        expect(computeResize('n', start, 99, -20, min, viewport)).toEqual({ x: 100, y: 80, width: 400, height: 320 });
    });
});

describe('switcher and focus order', () => {
    const windows = [
        { id: 'a', zIndex: 1001 },
        { id: 'b', zIndex: 1005 },
        { id: 'c', zIndex: 1003, isMinimized: true },
        { id: 'd', zIndex: 1009, isClosing: true }
    ];

    it('orders by most recently used and skips closing windows', () => {
        expect(switcherOrder(windows).map((w) => w.id)).toEqual(['b', 'c', 'a']);
    });

    it('cycles forwards and backwards with wrap-around', () => {
        expect(nextSwitcherIndex(0, 3, 1)).toBe(1);
        expect(nextSwitcherIndex(2, 3, 1)).toBe(0);
        expect(nextSwitcherIndex(0, 3, -1)).toBe(2);
        expect(nextSwitcherIndex(0, 0, 1)).toBe(0);
    });

    it('focuses the top-most visible window after a minimize', () => {
        expect(nextFocusAfterMinimize(windows, 'b')).toBe('a');
        expect(nextFocusAfterMinimize(windows, 'a')).toBe('b');
    });

    it('returns null when nothing else is left', () => {
        expect(nextFocusAfterMinimize([{ id: 'a', zIndex: 1 }], 'a')).toBeNull();
        expect(nextFocusAfterMinimize([{ id: 'a', zIndex: 1 }, { id: 'b', zIndex: 2, isMinimized: true }], 'a')).toBeNull();
    });
});
