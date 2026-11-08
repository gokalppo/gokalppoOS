import { describe, it, expect } from 'vitest';
import { describeHint, hintCards, cardLabel } from './solitaireHint';

const card = (rank, suit, faceUp = true) => ({ id: `${rank}${suit}`, rank, suit, faceUp });
const state = () => ({
    stock: [card(2, 'D', false)], waste: [card(4, 'C')], foundations: [[], [], [], []],
    tableau: [[card(5, 'H')], [], [card(1, 'S'), ], [], [], [], []], moves: 0
});

describe('describing a hint', () => {
    it('names the cards with rank and suit', () => {
        expect(cardLabel(card(12, 'H'))).toBe('Q♥');
        expect(cardLabel(card(1, 'S'))).toBe('A♠');
        expect(cardLabel(card(10, 'D'))).toBe('10♦');
    });

    it('says what to do for each kind of move', () => {
        const s = state();
        expect(describeHint(s, { kind: 'draw' })).toEqual({ key: 'sol.hintDraw', params: {} });
        expect(describeHint({ ...s, stock: [] }, { kind: 'draw' }).key).toBe('sol.hintRecycle');
        expect(describeHint(s, { kind: 'move', from: { pile: 'tableau', index: 2, cardIndex: 0 }, to: { pile: 'foundation', index: 0 } }))
            .toEqual({ key: 'sol.hintFoundation', params: { card: 'A♠' } });
        expect(describeHint(s, { kind: 'move', from: { pile: 'waste' }, to: { pile: 'tableau', index: 0 } }))
            .toEqual({ key: 'sol.hintOnto', params: { card: '4♣', target: '5♥' } });
        expect(describeHint({ ...s, waste: [card(13, 'S')] }, { kind: 'move', from: { pile: 'waste' }, to: { pile: 'tableau', index: 1 } }))
            .toEqual({ key: 'sol.hintEmpty', params: { card: 'K♠' } });
    });

    it('lists the cards to highlight: the ones that move and the one they land on', () => {
        const s = state();
        expect(hintCards(s, { kind: 'move', from: { pile: 'waste' }, to: { pile: 'tableau', index: 0 } })).toEqual({ moving: ['4C'], landingOn: '5H' });
        expect(hintCards(s, { kind: 'move', from: { pile: 'tableau', index: 2, cardIndex: 0 }, to: { pile: 'foundation', index: 0 } })).toEqual({ moving: ['1S'], landingOn: null });
        expect(hintCards(s, { kind: 'draw' })).toEqual({ moving: [], landingOn: null });
    });
});
