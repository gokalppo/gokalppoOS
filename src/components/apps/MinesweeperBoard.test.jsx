import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useState } from 'react';
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
const RUN = 'a1b2c3d4e5f60718293a'; // a finished game, as the server recorded it

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

const playAndSubmit = async (name, time) => {
    const view = render(<SubmitScore time={time} run={RUN} onSubmitted={() => { }} />);
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: name } });
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy());
    const message = screen.getByRole('status').textContent;
    view.unmount();
    return message;
};

describe('one record per player', () => {
    it('a faster second game replaces the first (89s then 65s leaves a single 65s row)', async () => {
        expect(await playAndSubmit('Gokalp', 89)).toContain('Your time was submitted');
        expect(await playAndSubmit('Gokalp', 65)).toContain('New personal best');

        expect(scores()).toHaveLength(1);
        expect(scores()[0]).toMatchObject({ name: 'Gokalp', time: 65 });

        render(<BestTimes onClose={() => { }} refreshKey={0} />);
        await waitFor(() => expect(document.querySelectorAll('.ms-scores li')).toHaveLength(1));
        expect(document.querySelector('.ms-scores').textContent).toContain('65s');
        expect(document.querySelector('.ms-scores').textContent).not.toContain('89s');
    });

    it('a slower second game leaves the better time alone and says so', async () => {
        await playAndSubmit('Gokalp', 65);
        const message = await playAndSubmit('Gokalp', 89);
        expect(message).toContain('already have a faster time');
        expect(message).toContain('65s');
        expect(scores()).toHaveLength(1);
        expect(scores()[0].time).toBe(65);
    });

    it('treats the same name with different casing/spacing as the same player', async () => {
        await playAndSubmit('Ada Lovelace', 80);
        await playAndSubmit('  ada   lovelace ', 70);
        expect(scores()).toHaveLength(1);
        expect(scores()[0].time).toBe(70);
    });

    it('different players each keep their own row', async () => {
        await playAndSubmit('Ada', 80);
        await playAndSubmit('Bob', 70);
        expect(scores()).toHaveLength(2);
    });

    it('an equal time is not a new record', async () => {
        await playAndSubmit('Ada', 50);
        expect(await playAndSubmit('Ada', 50)).toContain('already have a faster time');
    });
});

describe('SubmitScore', () => {
    it('stores the time with a server timestamp and remembers the name', async () => {
        const onSubmitted = vi.fn();
        render(<SubmitScore time={27} run={RUN} onSubmitted={onSubmitted} />);
        fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: '  Ada  ' } });
        fireEvent.click(screen.getByText('Submit'));

        await waitFor(() => expect(scores()).toHaveLength(1));
        expect(scores()[0]).toMatchObject({ name: 'Ada', time: 27 });
        expect(typeof scores()[0].timestamp).toBe('number');
        await waitFor(() => expect(screen.getByText(/Your time was submitted/)).toBeTruthy());
        expect(onSubmitted).toHaveBeenCalled();
        expect(localStorage.getItem('gokalppoOS_minesweeperName')).toBe('Ada');
    });

    it('rejects an empty name without writing', () => {
        render(<SubmitScore time={27} run={RUN} onSubmitted={() => { }} />);
        fireEvent.click(screen.getByText('Submit'));
        expect(screen.getByText('Please enter your name.')).toBeTruthy();
        expect(scores()).toHaveLength(0);
    });

    it('refuses an impossible time (e.g. tampered to 0)', () => {
        render(<SubmitScore time={0} run={RUN} onSubmitted={() => { }} />);
        fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Ada' } });
        fireEvent.click(screen.getByText('Submit'));
        expect(screen.getByText('That time cannot be submitted.')).toBeTruthy();
        expect(scores()).toHaveLength(0);
    });

    it('records a time only once even when Submit is hammered', async () => {
        render(<SubmitScore time={27} run={RUN} onSubmitted={() => { }} />);
        fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Ada' } });
        const form = screen.getByText('Submit').closest('form');
        for (let i = 0; i < 6; i++) fireEvent.submit(form);

        await waitFor(() => expect(screen.getByText(/Your time was submitted/)).toBeTruthy());
        expect(scores()).toHaveLength(1);
    });

    it('swaps the form for a confirmation and cannot be submitted again afterwards', async () => {
        render(<SubmitScore time={27} run={RUN} onSubmitted={() => { }} />);
        fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Ada' } });
        fireEvent.click(screen.getByText('Submit'));

        await waitFor(() => expect(screen.getByText(/Your time was submitted/)).toBeTruthy());
        expect(screen.queryByText('Submit')).toBeNull();
        expect(screen.queryByPlaceholderText('Your name')).toBeNull();
        expect(scores()).toHaveLength(1);
    });

    it('keeps the confirmation when the parent re-renders (e.g. the board refreshes)', async () => {
        const Parent = () => {
            const [version, setVersion] = useState(0);
            return <SubmitScore time={27} run={RUN} onSubmitted={() => setVersion((v) => v + 1)} onViewBoard={() => { }} data-v={version} />;
        };
        render(<Parent />);
        fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Ada' } });
        fireEvent.click(screen.getByText('Submit'));

        await waitFor(() => expect(screen.getByText(/Your time was submitted/)).toBeTruthy());
        await new Promise((r) => setTimeout(r, 50));
        expect(screen.getByText(/Your time was submitted/)).toBeTruthy();
        expect(screen.queryByText('Submit')).toBeNull();
    });

    it('offers a button to open the best times after submitting', async () => {
        const onViewBoard = vi.fn();
        render(<SubmitScore time={27} run={RUN} onSubmitted={() => { }} onViewBoard={onViewBoard} />);
        fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Ada' } });
        fireEvent.click(screen.getByText('Submit'));
        await waitFor(() => expect(screen.getByText(/View best times/)).toBeTruthy());
        fireEvent.click(screen.getByText(/View best times/));
        expect(onViewBoard).toHaveBeenCalled();
    });
});
