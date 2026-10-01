import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { fakeDb } from '../../test/fakeDatabase';

vi.mock('firebase/database', async () => (await import('../../test/fakeDatabase')).databaseMock);
vi.mock('../../firebase', () => ({ db: {} }));

import { BestTimes, SubmitScore } from './MinesweeperBoard';

beforeEach(() => {
    localStorage.clear();
    fakeDb.reset();
});

afterEach(() => cleanup());

const scores = () => Object.values(fakeDb.read('leaderboards/minesweeper') || {});

describe('BestTimes', () => {
    it('lists the fastest times first', async () => {
        fakeDb.seed('leaderboards/minesweeper', {
            a: { name: 'Slow', time: 80, timestamp: 1 },
            b: { name: 'Fast', time: 9, timestamp: 2 },
            c: { name: 'Mid', time: 33, timestamp: 3 }
        });
        render(<BestTimes onClose={() => { }} refreshKey={0} />);
        await waitFor(() => expect(screen.getByText('Fast')).toBeTruthy());
        const rows = [...document.querySelectorAll('.ms-scores li')].map((li) => li.textContent);
        expect(rows).toEqual(['Fast9s', 'Mid33s', 'Slow80s']);
    });

    it('shows an empty state and closes on request', async () => {
        const onClose = vi.fn();
        render(<BestTimes onClose={onClose} refreshKey={0} />);
        await waitFor(() => expect(screen.getByText(/No times yet/)).toBeTruthy());
        fireEvent.click(screen.getByText('Close'));
        expect(onClose).toHaveBeenCalled();
    });
});

describe('SubmitScore', () => {
    it('stores the time with a server timestamp and remembers the name', async () => {
        const onSubmitted = vi.fn();
        render(<SubmitScore time={27} onSubmitted={onSubmitted} />);
        fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: '  Ada  ' } });
        fireEvent.click(screen.getByText('Submit'));

        await waitFor(() => expect(scores()).toHaveLength(1));
        expect(scores()[0]).toMatchObject({ name: 'Ada', time: 27 });
        expect(typeof scores()[0].timestamp).toBe('number');
        await waitFor(() => expect(screen.getByText(/Time submitted/)).toBeTruthy());
        expect(onSubmitted).toHaveBeenCalled();
        expect(localStorage.getItem('gokalppoOS_minesweeperName')).toBe('Ada');
    });

    it('rejects an empty name without writing', () => {
        render(<SubmitScore time={27} onSubmitted={() => { }} />);
        fireEvent.click(screen.getByText('Submit'));
        expect(screen.getByText('Please enter your name.')).toBeTruthy();
        expect(scores()).toHaveLength(0);
    });

    it('refuses an impossible time (e.g. tampered to 0)', () => {
        render(<SubmitScore time={0} onSubmitted={() => { }} />);
        fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Ada' } });
        fireEvent.click(screen.getByText('Submit'));
        expect(screen.getByText('That time cannot be submitted.')).toBeTruthy();
        expect(scores()).toHaveLength(0);
    });
});
