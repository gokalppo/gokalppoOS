// Klondike Solitaire rules (draw-one). Pure and immutable: every function returns a
// new state (or null for an illegal move), which makes Undo trivial.
//
// State: { stock, waste, foundations: [S, H, D, C], tableau: [7 piles], moves }
// A pile is an array of cards, last element = top. Card: { id, rank 1..13, suit, faceUp }.

export const SUITS = ['S', 'H', 'D', 'C'];
export const SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const isRed = (suit) => suit === 'H' || suit === 'D';
export const rankLabel = (rank) => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }[rank] ?? String(rank));

export const createDeck = () =>
    SUITS.flatMap((suit) =>
        Array.from({ length: 13 }, (_, i) => ({ id: `${i + 1}${suit}`, rank: i + 1, suit, faceUp: false })));

export const shuffle = (deck, rng = Math.random) => {
    const cards = [...deck];
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
};

export const deal = (rng = Math.random) => {
    const deck = shuffle(createDeck(), rng);
    const tableau = [];
    let cursor = 0;
    for (let col = 0; col < 7; col++) {
        const pile = deck.slice(cursor, cursor + col + 1).map((card, i, arr) => ({ ...card, faceUp: i === arr.length - 1 }));
        tableau.push(pile);
        cursor += col + 1;
    }
    return { stock: deck.slice(cursor), waste: [], foundations: [[], [], [], []], tableau, moves: 0 };
};

const top = (pile) => pile[pile.length - 1];

export const canMoveToFoundation = (card, pile) => {
    if (!pile.length) return card.rank === 1;
    const t = top(pile);
    return t.suit === card.suit && card.rank === t.rank + 1;
};

export const canMoveToTableau = (card, pile) => {
    if (!pile.length) return card.rank === 13;
    const t = top(pile);
    return t.faceUp && isRed(t.suit) !== isRed(card.suit) && card.rank === t.rank - 1;
};

// Cards that would move if the player picks up `from`.
export const getMovingCards = (state, from) => {
    if (from.pile === 'waste') return state.waste.length ? [top(state.waste)] : [];
    if (from.pile === 'foundation') {
        const pile = state.foundations[from.index];
        return pile.length ? [top(pile)] : [];
    }
    if (from.pile === 'tableau') {
        const pile = state.tableau[from.index];
        return pile.slice(from.cardIndex ?? pile.length - 1);
    }
    return [];
};

const isValidRun = (cards) =>
    cards.length > 0 &&
    cards.every((c) => c.faceUp) &&
    cards.every((c, i) => i === 0 || (isRed(cards[i - 1].suit) !== isRed(c.suit) && c.rank === cards[i - 1].rank - 1));

export const canMove = (state, from, to) => {
    const cards = getMovingCards(state, from);
    if (!isValidRun(cards)) return false;
    if (from.pile === to.pile && from.index === to.index) return false;
    if (to.pile === 'foundation') {
        return cards.length === 1 &&
            SUITS.indexOf(cards[0].suit) === to.index &&
            canMoveToFoundation(cards[0], state.foundations[to.index]);
    }
    if (to.pile === 'tableau') return canMoveToTableau(cards[0], state.tableau[to.index]);
    return false;
};

export const moveCards = (state, from, to) => {
    if (!canMove(state, from, to)) return null;
    const cards = getMovingCards(state, from);
    const next = {
        ...state,
        waste: state.waste,
        foundations: [...state.foundations],
        tableau: [...state.tableau],
        moves: state.moves + 1
    };

    if (from.pile === 'waste') {
        next.waste = state.waste.slice(0, -1);
    } else if (from.pile === 'foundation') {
        next.foundations[from.index] = state.foundations[from.index].slice(0, -1);
    } else {
        const remaining = state.tableau[from.index].slice(0, from.cardIndex);
        if (remaining.length && !top(remaining).faceUp) {
            remaining[remaining.length - 1] = { ...top(remaining), faceUp: true };
        }
        next.tableau[from.index] = remaining;
    }

    if (to.pile === 'foundation') next.foundations[to.index] = [...state.foundations[to.index], ...cards];
    else next.tableau[to.index] = [...state.tableau[to.index], ...cards];
    return next;
};

export const drawFromStock = (state) => {
    if (state.stock.length) {
        const card = { ...top(state.stock), faceUp: true };
        return { ...state, stock: state.stock.slice(0, -1), waste: [...state.waste, card], moves: state.moves + 1 };
    }
    if (state.waste.length) {
        const recycled = [...state.waste].reverse().map((c) => ({ ...c, faceUp: false }));
        return { ...state, stock: recycled, waste: [], moves: state.moves + 1 };
    }
    return null;
};

// Where could the top card of `from` go on a foundation? (double-click shortcut)
export const findFoundationMove = (state, from) => {
    const cards = getMovingCards(state, from);
    if (cards.length !== 1) return null;
    const to = { pile: 'foundation', index: SUITS.indexOf(cards[0].suit) };
    return canMove(state, from, to) ? to : null;
};

export const autoMoveToFoundation = (state, from) => {
    const to = findFoundationMove(state, from);
    return to ? moveCards(state, from, to) : null;
};

export const isWon = (state) => state.foundations.every((pile) => pile.length === 13);
