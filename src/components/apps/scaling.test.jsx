import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { fakeDb } from '../../test/fakeDatabase';

vi.mock('firebase/database', async () => (await import('../../test/fakeDatabase')).databaseMock);
vi.mock('../../firebase', () => ({ db: {} }));

import Solitaire from './Solitaire';
import Minesweeper from './Minesweeper';

// A stand-in for the browser's ResizeObserver, so a test can "resize the window" and see the game react.
let observers = [];
let bodySize = { width: 0, height: 0 };

beforeEach(() => {
    observers = [];
    bodySize = { width: 0, height: 0 };
    fakeDb.reset();
    localStorage.clear();
    globalThis.ResizeObserver = class {
        constructor(callback) { this.callback = callback; observers.push(this); }
        observe() { }
        disconnect() { observers = observers.filter((o) => o !== this); }
    };
    // Every element reports the "window body" size set by the test.
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return bodySize.width; } });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return bodySize.height; } });
});

afterEach(() => {
    cleanup();
    delete globalThis.ResizeObserver;
    delete HTMLElement.prototype.clientWidth;
    delete HTMLElement.prototype.clientHeight;
});

const resizeTo = (width, height) => act(() => {
    bodySize = { width, height };
    observers.forEach((o) => o.callback());
});

describe('Solitaire scales with its window', () => {
    it('keeps the normal size until the window is bigger, then enlarges cards in proportion', () => {
        resizeTo(600, 480);
        const { container } = render(<Solitaire />);
        const root = container.querySelector('.sol-root');
        expect(root.style.getPropertyValue('--k')).toBe('1');

        resizeTo(1800, 900);
        const k = Number(root.style.getPropertyValue('--k'));
        expect(k).toBeGreaterThan(1.6);
    });

    it('spreads the overlapping cards of a column out by the same factor', () => {
        resizeTo(1800, 900);
        const { container } = render(<Solitaire />);
        const k = Number(container.querySelector('.sol-root').style.getPropertyValue('--k'));
        const column = container.querySelector('[data-pile="tableau-6"]');
        const tops = [...column.querySelectorAll('.sol-card')].map((c) => parseFloat(c.style.top));
        // six face-down cards then one face-up: each step is the face-down gap (10px) times the scale
        expect(tops[1] - tops[0]).toBeCloseTo(10 * k, 5);
    });

    it('shrinks back when the window is restored', () => {
        resizeTo(1800, 900);
        const { container } = render(<Solitaire />);
        resizeTo(600, 480);
        expect(container.querySelector('.sol-root').style.getPropertyValue('--k')).toBe('1');
    });

    it('still renders normally where nothing can be measured', () => {
        const { container } = render(<Solitaire />);
        expect(container.querySelector('.sol-root').style.getPropertyValue('--k')).toBe('1');
        expect(container.querySelectorAll('.sol-card').length).toBeGreaterThan(20);
    });
});

describe('Minesweeper scales with its window', () => {
    it('keeps 20px cells at the normal size and grows the board when the window is bigger', () => {
        resizeTo(400, 280);
        const { container } = render(<Minesweeper />);
        const root = container.querySelector('.minesweeper-container');
        expect(root.style.getPropertyValue('--ms-cell')).toBe('20px');

        resizeTo(1800, 900);
        const cell = parseInt(root.style.getPropertyValue('--ms-cell'), 10);
        expect(cell).toBeGreaterThan(50);
    });

    it('keeps all 81 cells and plays the same at any size', () => {
        resizeTo(1800, 900);
        const { container } = render(<Minesweeper />);
        expect(container.querySelectorAll('.ms-cell')).toHaveLength(81);
    });

    it('returns to 20px when the window is restored', () => {
        resizeTo(1800, 900);
        const { container } = render(<Minesweeper />);
        resizeTo(400, 280);
        expect(container.querySelector('.minesweeper-container').style.getPropertyValue('--ms-cell')).toBe('20px');
    });
});
