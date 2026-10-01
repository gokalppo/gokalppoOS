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
