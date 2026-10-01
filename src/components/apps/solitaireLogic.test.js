import { describe, it, expect } from 'vitest';
import {
    createDeck, shuffle, deal, canMoveToFoundation, canMoveToTableau, canMove, moveCards,
    drawFromStock, findFoundationMove, autoMoveToFoundation, isWon, getMovingCards, isRed, rankLabel
} from './solitaireLogic';

const card = (rank, suit, faceUp = true) => ({ id: `${rank}${suit}`, rank, suit, faceUp });

// A tiny seeded RNG so deals are reproducible.
const seeded = (seed) => () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
};

const emptyState = () => ({
    stock: [], waste: [], foundations: [[], [], [], []], tableau: [[], [], [], [], [], [], []], moves: 0
});

describe('deck and deal', () => {
    it('has 52 unique cards', () => {
        const deck = createDeck();
        expect(deck).toHaveLength(52);
        expect(new Set(deck.map((c) => c.id)).size).toBe(52);
    });

    it('shuffles deterministically with a seeded rng, without losing cards', () => {
        const a = shuffle(createDeck(), seeded(7));
        const b = shuffle(createDeck(), seeded(7));
        expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
        expect(a.map((c) => c.id).sort()).toEqual(createDeck().map((c) => c.id).sort());
        expect(a.map((c) => c.id)).not.toEqual(createDeck().map((c) => c.id));
    });

    it('deals 1..7 cards per column with only the top face up, and 24 in the stock', () => {
        const state = deal(seeded(1));
        state.tableau.forEach((pile, i) => {
            expect(pile).toHaveLength(i + 1);
            pile.forEach((c, j) => expect(c.faceUp).toBe(j === pile.length - 1));
        });
        expect(state.stock).toHaveLength(24);
        expect(state.stock.every((c) => !c.faceUp)).toBe(true);
        expect(state.moves).toBe(0);
        const all = [...state.stock, ...state.tableau.flat()];
        expect(new Set(all.map((c) => c.id)).size).toBe(52);
    });
});

describe('placement rules', () => {
    it('foundations start with an Ace and build up in suit', () => {
        expect(canMoveToFoundation(card(1, 'S'), [])).toBe(true);
        expect(canMoveToFoundation(card(2, 'S'), [])).toBe(false);
        expect(canMoveToFoundation(card(2, 'S'), [card(1, 'S')])).toBe(true);
        expect(canMoveToFoundation(card(2, 'H'), [card(1, 'S')])).toBe(false);
        expect(canMoveToFoundation(card(3, 'S'), [card(1, 'S')])).toBe(false);
    });

    it('tableau builds down in alternating colours; only Kings fill an empty column', () => {
        expect(canMoveToTableau(card(13, 'H'), [])).toBe(true);
        expect(canMoveToTableau(card(12, 'H'), [])).toBe(false);
        expect(canMoveToTableau(card(6, 'S'), [card(7, 'H')])).toBe(true);
        expect(canMoveToTableau(card(6, 'C'), [card(7, 'S')])).toBe(false);
        expect(canMoveToTableau(card(5, 'S'), [card(7, 'H')])).toBe(false);
        expect(canMoveToTableau(card(6, 'S'), [card(7, 'H', false)])).toBe(false);
    });

    it('knows colours and labels', () => {
        expect(isRed('H')).toBe(true);
        expect(isRed('C')).toBe(false);
        expect([1, 10, 11, 12, 13].map(rankLabel)).toEqual(['A', '10', 'J', 'Q', 'K']);
    });
});

describe('moving cards', () => {
    it('moves a card between tableau columns and flips the newly exposed card', () => {
        const state = emptyState();
        state.tableau[0] = [card(9, 'C', false), card(6, 'S')];
        state.tableau[1] = [card(7, 'H')];
        const next = moveCards(state, { pile: 'tableau', index: 0, cardIndex: 1 }, { pile: 'tableau', index: 1 });
        expect(next.tableau[1].map((c) => c.id)).toEqual(['7H', '6S']);
        expect(next.tableau[0]).toHaveLength(1);
        expect(next.tableau[0][0].faceUp).toBe(true);
        expect(next.moves).toBe(1);
        expect(state.tableau[0]).toHaveLength(2); // original untouched (immutable)
    });

    it('moves a whole run of cards together', () => {
        const state = emptyState();
        state.tableau[0] = [card(6, 'S'), card(5, 'H'), card(4, 'C')];
        state.tableau[1] = [card(7, 'H')];
        const next = moveCards(state, { pile: 'tableau', index: 0, cardIndex: 0 }, { pile: 'tableau', index: 1 });
        expect(next.tableau[1].map((c) => c.id)).toEqual(['7H', '6S', '5H', '4C']);
        expect(next.tableau[0]).toEqual([]);
    });

    it('rejects broken runs, face-down cards, wrong targets and same-pile drops', () => {
        const state = emptyState();
        state.tableau[0] = [card(6, 'S'), card(5, 'S')]; // not alternating
        state.tableau[1] = [card(7, 'H')];
        state.tableau[2] = [card(3, 'D', false)];
        expect(moveCards(state, { pile: 'tableau', index: 0, cardIndex: 0 }, { pile: 'tableau', index: 1 })).toBeNull();
        expect(moveCards(state, { pile: 'tableau', index: 2, cardIndex: 0 }, { pile: 'tableau', index: 1 })).toBeNull();
        expect(moveCards(state, { pile: 'tableau', index: 0, cardIndex: 1 }, { pile: 'tableau', index: 1 })).toBeNull();
        expect(canMove(state, { pile: 'tableau', index: 1, cardIndex: 0 }, { pile: 'tableau', index: 1 })).toBe(false);
    });

    it('moves from the waste and to the right-suit foundation only', () => {
        const state = emptyState();
        state.waste = [card(1, 'H')];
        expect(moveCards(state, { pile: 'waste' }, { pile: 'foundation', index: 0 })).toBeNull(); // spades pile
        const next = moveCards(state, { pile: 'waste' }, { pile: 'foundation', index: 1 }); // hearts pile
        expect(next.foundations[1].map((c) => c.id)).toEqual(['1H']);
        expect(next.waste).toEqual([]);
    });

    it('lets a foundation card come back down onto the tableau', () => {
        const state = emptyState();
        state.foundations[1] = [card(1, 'H'), card(2, 'H')];
        state.tableau[0] = [card(3, 'S')];
        const next = moveCards(state, { pile: 'foundation', index: 1 }, { pile: 'tableau', index: 0 });
        expect(next.tableau[0].map((c) => c.id)).toEqual(['3S', '2H']);
        expect(next.foundations[1].map((c) => c.id)).toEqual(['1H']);
    });

    it('only multi-card runs are refused on foundations', () => {
        const state = emptyState();
        state.tableau[0] = [card(2, 'S'), card(1, 'H')];
        expect(canMove(state, { pile: 'tableau', index: 0, cardIndex: 0 }, { pile: 'foundation', index: 0 })).toBe(false);
    });
});

describe('stock and waste', () => {
    it('draws one face-up card at a time', () => {
        const state = emptyState();
        state.stock = [card(2, 'S', false), card(3, 'S', false)];
        const next = drawFromStock(state);
        expect(next.waste.map((c) => [c.id, c.faceUp])).toEqual([['3S', true]]);
        expect(next.stock).toHaveLength(1);
        expect(next.moves).toBe(1);
    });

    it('recycles the waste back into the stock (face down, original order)', () => {
        let state = emptyState();
        state.stock = [card(2, 'S', false), card(3, 'S', false)];
        state = drawFromStock(drawFromStock(state)); // waste: 3S, 2S
        const recycled = drawFromStock(state);
        expect(recycled.waste).toEqual([]);
        expect(recycled.stock.map((c) => [c.id, c.faceUp])).toEqual([['2S', false], ['3S', false]]);
        const again = drawFromStock(recycled);
        expect(again.waste[0].id).toBe('3S');
    });

    it('returns null when there is nothing to draw', () => {
        expect(drawFromStock(emptyState())).toBeNull();
    });
});

describe('auto-move and winning', () => {
    it('sends an Ace to its foundation on double-click', () => {
        const state = emptyState();
        state.tableau[2] = [card(5, 'C', false), card(1, 'D')];
        const to = findFoundationMove(state, { pile: 'tableau', index: 2, cardIndex: 1 });
        expect(to).toEqual({ pile: 'foundation', index: 2 });
        const next = autoMoveToFoundation(state, { pile: 'tableau', index: 2, cardIndex: 1 });
        expect(next.foundations[2].map((c) => c.id)).toEqual(['1D']);
        expect(next.tableau[2][0].faceUp).toBe(true);
    });

    it('does not auto-move a card that cannot go up', () => {
        const state = emptyState();
        state.waste = [card(5, 'H')];
        expect(autoMoveToFoundation(state, { pile: 'waste' })).toBeNull();
    });

    it('reports moving cards for each pile type', () => {
        const state = emptyState();
        state.tableau[0] = [card(9, 'S'), card(8, 'H')];
        expect(getMovingCards(state, { pile: 'tableau', index: 0, cardIndex: 0 })).toHaveLength(2);
        expect(getMovingCards(state, { pile: 'waste' })).toEqual([]);
    });

    it('detects a win only when all four foundations are complete', () => {
        const state = emptyState();
        expect(isWon(state)).toBe(false);
        state.foundations = state.foundations.map((_, i) =>
            Array.from({ length: 13 }, (_, r) => card(r + 1, ['S', 'H', 'D', 'C'][i])));
        expect(isWon(state)).toBe(true);
        state.foundations[3] = state.foundations[3].slice(0, 12);
        expect(isWon(state)).toBe(false);
    });
});
