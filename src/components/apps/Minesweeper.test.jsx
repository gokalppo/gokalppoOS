import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { fakeDb } from '../../test/fakeDatabase';

vi.mock('firebase/database', async () => (await import('../../test/fakeDatabase')).databaseMock);
vi.mock('../../firebase', () => ({ db: {} }));

import Minesweeper from './Minesweeper';

// (0,0) is walled in by mines, so the first click's flood fill can't finish the game.
// Math.random is replayed to place them.
const MINES = [[0, 1], [1, 0], [1, 1], [8, 1], [8, 3], [8, 5], [8, 7], [7, 0], [7, 8], [3, 8]];

const cellAt = (r, c) => document.querySelectorAll('.ms-cell')[r * 9 + c];
const scores = () => Object.values(fakeDb.read('leaderboards/minesweeper') || {});

const winTheGame = async () => {
    const queue = MINES.flatMap(([r, c]) => [(r + 0.5) / 9, (c + 0.5) / 9]);
    vi.spyOn(Math, 'random').mockImplementation(() => queue.shift() ?? 0.99);

    fireEvent.click(cellAt(4, 4)); // first click lays the mines and floods
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); }); // let the timer reach > 0

    const isMine = (r, c) => MINES.some(([mr, mc]) => mr === r && mc === c);
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (!isMine(r, c) && !cellAt(r, c).classList.contains('revealed')) fireEvent.click(cellAt(r, c));
        }
    }
};

beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.clear();
    fakeDb.reset();
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe('Minesweeper keeps a server record of each game', () => {
    it('stamps the start on the first click and the end on the win, then uses the game up when the time is saved', async () => {
        render(<Minesweeper />);
        expect(fakeDb.read('runs')).toBeNull();
        await winTheGame();
        await act(async () => { await vi.advanceTimersByTimeAsync(100); });

        const runs = fakeDb.read('runs');
        const [id] = Object.keys(runs);
        expect(Object.keys(runs)).toHaveLength(1);
        expect(typeof runs[id].startedAt).toBe('number');
        expect(typeof runs[id].finishedAt).toBe('number');
        expect(runs[id].usedAt).toBeUndefined();

        fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Ada' } });
        fireEvent.click(screen.getByText('Submit'));
        await waitFor(() => expect(screen.getByText(/Your time was submitted/)).toBeTruthy());
        expect(scores()[0]).toMatchObject({ name: 'Ada', run: id });
        expect(typeof fakeDb.read(`runs/${id}/usedAt`)).toBe('number');
    });

    it('a new game is a new run', async () => {
        render(<Minesweeper />);
        await winTheGame();
        fireEvent.click(document.querySelector('.minesweeper-smiley'));
        Math.random.mockRestore(); // back to a real random board (only the Math.random spy, not the module mocks)
        fireEvent.click(cellAt(4, 4));
        await act(async () => { await vi.advanceTimersByTimeAsync(100); });
        await waitFor(() => expect(Object.keys(fakeDb.read('runs'))).toHaveLength(2));
    });

    it('cannot save a time when the game could not be recorded (the board was unreachable)', async () => {
        const { databaseMock } = await import('../../test/fakeDatabase');
        const original = databaseMock.set;
        databaseMock.set = (r, v) => (String(r.path).startsWith('runs/') ? Promise.reject(new Error('offline')) : original(r, v));
        try {
            render(<Minesweeper />);
            await winTheGame();
            fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Ada' } });
            fireEvent.click(screen.getByText('Submit'));
            await waitFor(() => expect(document.querySelector('.ms-error')).toBeTruthy());
            expect(scores()).toHaveLength(0);
        } finally {
            databaseMock.set = original;
        }
    });
});

describe('Minesweeper best times', () => {
    it('offers score submission only after a win', async () => {
        render(<Minesweeper />);
        expect(screen.queryByText('Submit')).toBeNull();
        await winTheGame();
        expect(screen.getByText(/You won in \d+ seconds/)).toBeTruthy();
    });

    it('submits once, shows a confirmation that stays, and cannot be submitted again', async () => {
        render(<Minesweeper />);
        await winTheGame();

        fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Ada' } });
        const form = screen.getByText('Submit').closest('form');
        for (let i = 0; i < 5; i++) fireEvent.submit(form);

        await waitFor(() => expect(screen.getByText(/Your time was submitted/)).toBeTruthy());
        await act(async () => { await vi.advanceTimersByTimeAsync(500); });

        // The confirmation survives the leaderboard refresh that follows a submit.
        expect(screen.getByText(/Your time was submitted/)).toBeTruthy();
        expect(screen.queryByText('Submit')).toBeNull();
        expect(scores()).toHaveLength(1);
        expect(scores()[0]).toMatchObject({ name: 'Ada' });
    });

    it('can open the best times straight from the confirmation', async () => {
        render(<Minesweeper />);
        await winTheGame();
        fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Ada' } });
        fireEvent.click(screen.getByText('Submit'));

        await waitFor(() => expect(screen.getByText(/View best times/)).toBeTruthy());
        fireEvent.click(screen.getByText(/View best times/));
        await waitFor(() => expect(document.querySelector('.ms-scores')).toBeTruthy());
        expect(document.querySelector('.ms-scores').textContent).toContain('Ada');
    });

    it('a new game clears the win banner', async () => {
        render(<Minesweeper />);
        await winTheGame();
        expect(screen.getByText('Submit')).toBeTruthy();
        fireEvent.click(document.querySelector('.minesweeper-smiley'));
        expect(screen.queryByText('Submit')).toBeNull();
    });
});
