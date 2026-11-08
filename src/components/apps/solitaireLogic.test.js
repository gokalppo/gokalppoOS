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

import { madeProgress, legalMoves, applyMove, searchProgress, findHint, isStuck } from './solitaireLogic';

describe('progress', () => {
    it('counts foundation moves, turned cards and board placements, not shuffling', () => {
        const base = emptyState();
        base.tableau[0] = [card(9, 'S', false), card(5, 'H')];
        base.tableau[1] = [card(6, 'S')];
        base.waste = [card(4, 'C')];
        base.foundations[2] = [card(1, 'D')];
        base.stock = [card(7, 'D', false)];

        expect(madeProgress(base, applyMove(base, { kind: 'move', from: { pile: 'tableau', index: 0, cardIndex: 1 }, to: { pile: 'tableau', index: 1 } }))).toBe(true); // turns the 9♠
        expect(madeProgress(base, applyMove(base, { kind: 'move', from: { pile: 'waste' }, to: { pile: 'tableau', index: 0 } }))).toBe(true); // 4♣ onto 5♥
        expect(madeProgress(base, applyMove(base, { kind: 'draw' }))).toBe(false);
        // a lateral move that turns nothing
        const lateral = emptyState();
        lateral.tableau[0] = [card(6, 'S')];
        lateral.tableau[1] = [card(7, 'H')];
        expect(madeProgress(lateral, applyMove(lateral, { kind: 'move', from: { pile: 'tableau', index: 0, cardIndex: 0 }, to: { pile: 'tableau', index: 1 } }))).toBe(false);
    });

    it('moving a card to a foundation is progress, pulling it back is not', () => {
        const state = emptyState();
        state.tableau[0] = [card(1, 'S')];
        const up = applyMove(state, { kind: 'move', from: { pile: 'tableau', index: 0, cardIndex: 0 }, to: { pile: 'foundation', index: 0 } });
        expect(madeProgress(state, up)).toBe(true);
        const down = applyMove(up, { kind: 'move', from: { pile: 'foundation', index: 0 }, to: { pile: 'tableau', index: 1 } });
        expect(down).toBeNull(); // an Ace cannot go on an empty column, only a King
    });
});

describe('legal moves', () => {
    it('lists run moves, waste plays, foundation moves and the stock, and skips pointless shifts', () => {
        const state = emptyState();
        state.tableau[0] = [card(13, 'S')];            // a King alone: moving it to an empty column changes nothing
        state.tableau[1] = [card(5, 'H'), card(4, 'S')];
        state.tableau[2] = [card(6, 'C')];
        state.waste = [card(1, 'S')];
        state.stock = [card(2, 'D', false)];
        const moves = legalMoves(state);
        const has = (from, to) => moves.some((m) => m.kind === 'move' && m.from.pile === from.pile && m.from.index === from.index && m.to.pile === to.pile && m.to.index === to.index);

        expect(has({ pile: 'waste' }, { pile: 'foundation', index: 0 })).toBe(true);                     // A♠ up
        expect(has({ pile: 'tableau', index: 1 }, { pile: 'tableau', index: 2 })).toBe(true);            // 5♥,4♠ onto 6♣
        expect(moves.some((m) => m.kind === 'draw')).toBe(true);
        expect(moves.some((m) => m.kind === 'move' && m.from.index === 0 && m.from.pile === 'tableau' && m.to.pile === 'tableau')).toBe(false);
    });

    it('does not offer a draw when there is nothing to draw or recycle', () => {
        expect(legalMoves(emptyState()).some((m) => m.kind === 'draw')).toBe(false);
    });
});

describe('hints', () => {
    it('prefers a foundation move, then turning over a hidden card, then playing the waste', () => {
        const state = emptyState();
        state.tableau[0] = [card(9, 'S', false), card(5, 'H')];
        state.tableau[1] = [card(6, 'S')];
        state.tableau[2] = [card(1, 'C')];
        state.waste = [card(4, 'C')];
        let hint = findHint(state);
        expect(hint.move).toMatchObject({ from: { pile: 'tableau', index: 2 }, to: { pile: 'foundation', index: 3 } });

        state.tableau[2] = [];
        hint = findHint(state);
        expect(hint.move).toMatchObject({ from: { pile: 'tableau', index: 0, cardIndex: 1 }, to: { pile: 'tableau', index: 1 } });

        state.tableau[0] = [card(5, 'H')];
        hint = findHint(state);
        expect(hint.move).toMatchObject({ from: { pile: 'waste' }, to: { pile: 'tableau', index: 0 } });
    });

    it('points at the stock when drawing is what leads somewhere', () => {
        const state = emptyState();
        state.tableau[0] = [card(5, 'H')];
        state.stock = [card(4, 'S', false)];
        expect(findHint(state)).toEqual({ found: true, move: { kind: 'draw' } });
    });

    it('finds a lateral move that frees something useful', () => {
        const state = emptyState();
        state.tableau[0] = [card(5, 'H'), card(4, 'S')];
        state.tableau[1] = [card(6, 'C')];
        state.tableau[2] = [card(1, 'H', false), card(5, 'D')];
        const hint = findHint(state);
        expect(hint.found).toBe(true);     // 5♦ onto 6♣ turns the hidden Ace
    });

    it('says nothing is left, and is sure, when the position is dead', () => {
        const state = emptyState();
        state.tableau[0] = [card(7, 'S')];
        state.tableau[1] = [card(9, 'H')];
        expect(findHint(state)).toEqual({ found: false, stuck: true });
        expect(isStuck(state)).toBe(true);
    });

    it('a won game is neither hinted nor stuck', () => {
        const state = emptyState();
        state.foundations = [0, 1, 2, 3].map(() => Array.from({ length: 13 }, (_, i) => card(i + 1, 'S')));
        expect(findHint(state)).toEqual({ found: false, stuck: false });
        expect(isStuck(state)).toBe(false);
    });
});

describe('knowing when there are no more moves', () => {
    it('a stock that still holds a playable card is not stuck, even if the board looks blocked', () => {
        const state = emptyState();
        state.tableau[0] = [card(7, 'S')];
        state.tableau[1] = [card(9, 'H')];
        state.stock = [card(8, 'C', false), card(2, 'C', false)]; // draw the 2♣, then the 8♣, which fits on the 9♥
        expect(isStuck(state)).toBe(false);
    });

    it('cycling the whole stock without anything playable is stuck', () => {
        const state = emptyState();
        state.tableau[0] = [card(7, 'S')];
        state.tableau[1] = [card(9, 'H')];
        state.stock = [card(3, 'C', false), card(11, 'D', false)];
        expect(isStuck(state)).toBe(true);
    });

    it('a lateral shuffle that eventually frees a card is not stuck', () => {
        const state = emptyState();
        state.tableau[0] = [card(5, 'H'), card(4, 'S')];
        state.tableau[1] = [card(6, 'C')];
        state.tableau[2] = [card(10, 'D', false), card(5, 'D')];
        expect(isStuck(state)).toBe(false);
    });

    it('gives up quietly (not stuck) when the search would be too big', () => {
        const state = emptyState();
        state.tableau[0] = [card(7, 'S')];
        state.tableau[1] = [card(9, 'H')];
        state.stock = Array.from({ length: 4 }, (_, i) => card(3 + i * 0, 'C', false)).map((c, i) => ({ ...c, id: `x${i}` }));
        expect(searchProgress(state, 1)).toEqual({ found: false, exhausted: false });
    });

    it('fresh random deals are essentially never stuck, and the check is fast', () => {
        const started = performance.now();
        let stuck = 0;
        for (let seed = 1; seed <= 40; seed++) {
            if (isStuck(deal(seeded(seed)))) stuck++;
        }
        expect(stuck).toBe(0);
        expect((performance.now() - started) / 40).toBeLessThan(50);
    });

    it('plays out a whole game by following hints without ever getting stuck early or looping forever', () => {
        // Following the hint repeatedly must always make progress eventually, never cycle: count moves.
        let state = deal(seeded(5));
        let moves = 0;
        while (moves < 400) {
            const hint = findHint(state);
            if (!hint.found) break;
            const next = applyMove(state, hint.move);
            expect(next).not.toBeNull();
            state = next;
            moves++;
            if (isWon(state)) break;
        }
        expect(moves).toBeGreaterThan(10);
        expect(moves).toBeLessThan(400);
    });
});
