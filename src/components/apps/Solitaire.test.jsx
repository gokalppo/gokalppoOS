import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Solitaire from './Solitaire';

afterEach(() => cleanup());

const count = (selector) => document.querySelectorAll(selector).length;
const stat = (label) => screen.getByText(new RegExp(`^${label}:`)).textContent;

describe('Solitaire', () => {
    it('deals a fresh Klondike layout', () => {
        render(<Solitaire />);
        expect(count('[data-pile^="tableau-"]')).toBe(7);
        expect(count('[data-pile^="tableau-"] .sol-card')).toBe(28);
        expect(count('[data-pile="stock"] .sol-card')).toBe(1);
        expect(count('.sol-column .sol-card:not(.back)')).toBe(7);
        expect(stat('Moves')).toBe('Moves: 0');
    });

    it('draws a card from the stock to the waste and counts the move', () => {
        render(<Solitaire />);
        fireEvent.click(document.querySelector('[data-pile="stock"]'));
        expect(count('[data-pile="waste"] .sol-card')).toBe(1);
        expect(stat('Moves')).toBe('Moves: 1');
    });

    it('undo reverses the last action and is disabled with no history', () => {
        render(<Solitaire />);
        const undo = screen.getByText('Undo');
        expect(undo.disabled).toBe(true);

        fireEvent.click(document.querySelector('[data-pile="stock"]'));
        expect(undo.disabled).toBe(false);
        fireEvent.click(undo);
        expect(count('[data-pile="waste"] .sol-card')).toBe(0);
        expect(stat('Moves')).toBe('Moves: 0');
    });

    it('New Game resets moves and the board', () => {
        render(<Solitaire />);
        fireEvent.click(document.querySelector('[data-pile="stock"]'));
        fireEvent.click(screen.getByText('New Game'));
        expect(stat('Moves')).toBe('Moves: 0');
        expect(count('[data-pile="waste"] .sol-card')).toBe(0);
        expect(count('[data-pile="stock"] .sol-card')).toBe(1);
    });

    it('only lets face-up tableau cards be dragged', () => {
        render(<Solitaire />);
        const cards = [...document.querySelectorAll('.sol-column .sol-card')];
        for (const el of cards) {
            expect(el.getAttribute('draggable') === 'true').toBe(!el.classList.contains('back'));
        }
    });

    it('selects a face-up card on click and clears the selection on a second click', () => {
        render(<Solitaire />);
        const faceUp = document.querySelector('.sol-column .sol-card:not(.back)');
        fireEvent.click(faceUp);
        expect(faceUp.classList.contains('selected')).toBe(true);
        fireEvent.click(faceUp);
        expect(faceUp.classList.contains('selected')).toBe(false);
    });
});

import { vi } from 'vitest';
import { act } from '@testing-library/react';

const c = (rank, suit, faceUp = true) => ({ id: `${rank}${suit}`, rank, suit, faceUp });
const position = (overrides = {}) => ({
    stock: [], waste: [], foundations: [[], [], [], []], tableau: [[], [], [], [], [], [], []], moves: 0, ...overrides
});

describe('Solitaire hint', () => {
    it('highlights the card to move and where it goes, and says it in words', () => {
        const state = position({
            waste: [c(4, 'C')],
            tableau: [[c(9, 'D', false), c(5, 'H')], [c(1, 'S')], [], [], [], [], []]
        });
        render(<Solitaire initialState={state} />);
        fireEvent.click(screen.getByText('Hint'));

        // an Ace can go straight up: that comes first
        expect(screen.getByRole('status').textContent).toBe('Hint: move A♠ up to its foundation.');
        expect(document.querySelector('[data-card="1S"]').classList.contains('hinted')).toBe(true);
        expect(document.querySelector('[data-pile="foundation-0"]').classList.contains('hint-target')).toBe(true);
    });

    it('suggests landing a card on another and highlights both', () => {
        const state = position({ waste: [c(4, 'C')], tableau: [[c(5, 'H')], [], [], [], [], [], []] });
        render(<Solitaire initialState={state} />);
        fireEvent.click(screen.getByText('Hint'));
        expect(screen.getByRole('status').textContent).toBe('Hint: move 4♣ onto 5♥.');
        expect(document.querySelector('[data-card="4C"]').classList.contains('hinted')).toBe(true);
        expect(document.querySelector('[data-card="5H"]').classList.contains('landing')).toBe(true);
    });

    it('points at the stock when drawing is the way forward', () => {
        const state = position({ stock: [c(4, 'S', false)], tableau: [[c(5, 'H')], [], [], [], [], [], []] });
        render(<Solitaire initialState={state} />);
        fireEvent.click(screen.getByText('Hint'));
        expect(screen.getByRole('status').textContent).toBe('Hint: draw a card from the stock.');
        expect(document.querySelector('[data-pile="stock"]').classList.contains('hint-target')).toBe(true);
    });

    it('fades after a few seconds and when you make a move', () => {
        vi.useFakeTimers();
        try {
            const state = position({ waste: [c(4, 'C')], tableau: [[c(5, 'H')], [], [], [], [], [], []] });
            render(<Solitaire initialState={state} />);
            fireEvent.click(screen.getByText('Hint'));
            expect(screen.queryByRole('status')).not.toBeNull();
            act(() => { vi.advanceTimersByTime(4000); });
            expect(screen.queryByRole('status')).toBeNull();
            expect(document.querySelector('.hinted')).toBeNull();

            fireEvent.click(screen.getByText('Hint'));
            fireEvent.click(document.querySelector('[data-pile="waste"] .sol-card'));
            fireEvent.click(document.querySelector('[data-pile="tableau-0"]'));
            expect(screen.queryByRole('status')).toBeNull();
        } finally {
            vi.useRealTimers();
        }
    });

    it('following the hint really is a legal move', () => {
        const state = position({ waste: [c(4, 'C')], tableau: [[c(5, 'H')], [], [], [], [], [], []] });
        render(<Solitaire initialState={state} />);
        fireEvent.click(screen.getByText('Hint'));
        fireEvent.click(document.querySelector('[data-card="4C"]'));
        fireEvent.click(document.querySelector('[data-card="5H"]'));
        expect(count('[data-pile="tableau-0"] .sol-card')).toBe(2);
        expect(stat('Moves')).toBe('Moves: 1');
    });
});

describe('Solitaire "no more moves"', () => {
    const dead = () => position({ tableau: [[c(7, 'S')], [c(9, 'H')], [], [], [], [], []] });

    it('tells you when nothing is left, and offers undo, new game or carrying on', async () => {
        render(<Solitaire initialState={dead()} />);
        const box = await screen.findByRole('dialog', { name: 'No more moves' });
        expect(box.textContent).toMatch(/nothing left to play/);
        expect(screen.getByText('Undo', { selector: '.sol-stuck-actions button' }).disabled).toBe(true); // nothing to undo yet

        fireEvent.click(screen.getByText('Keep looking'));
        expect(screen.queryByRole('dialog', { name: 'No more moves' })).toBeNull();
    });

    it('stays quiet while moves remain', async () => {
        render(<Solitaire />);
        await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
        expect(screen.queryByRole('dialog', { name: 'No more moves' })).toBeNull();
    });

    it('New Game from the box starts a fresh deal', async () => {
        render(<Solitaire initialState={dead()} />);
        await screen.findByRole('dialog', { name: 'No more moves' });
        fireEvent.click(screen.getByText('New Game', { selector: '.sol-stuck-actions button' }));
        expect(screen.queryByRole('dialog', { name: 'No more moves' })).toBeNull();
        expect(count('[data-pile^="tableau-"] .sol-card')).toBe(28);
    });

    it('the Hint button explains it too, even after the box was closed', async () => {
        render(<Solitaire initialState={dead()} />);
        await screen.findByRole('dialog', { name: 'No more moves' });
        fireEvent.click(screen.getByText('Keep looking'));
        fireEvent.click(screen.getByText('Hint'));
        expect(screen.getByRole('dialog', { name: 'No more moves' })).toBeTruthy();
    });

    it('appears after a move that leads nowhere, and Undo from the box brings the position back', async () => {
        const nearlyDead = position({
            stock: [c(3, 'C', false)],
            tableau: [[c(7, 'S')], [c(9, 'H')], [], [], [], [], []]
        });
        render(<Solitaire initialState={nearlyDead} />);
        // drawing the 3♣ changes nothing for the board, but it is not the end yet: the box shows once everything was seen
        await screen.findByRole('dialog', { name: 'No more moves' });
        fireEvent.click(screen.getByText('Keep looking'));
        fireEvent.click(document.querySelector('[data-pile="stock"]'));
        const again = await screen.findByRole('dialog', { name: 'No more moves' });
        expect(again).toBeTruthy();
        fireEvent.click(screen.getByText('Undo', { selector: '.sol-stuck-actions button' }));
        expect(count('[data-pile="waste"] .sol-card')).toBe(0);
    });
});
