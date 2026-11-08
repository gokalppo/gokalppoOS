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

// ---------------------------------------------------------------------------
// Hints and "no more moves"
// ---------------------------------------------------------------------------
// A move counts as PROGRESS when it cannot simply be undone by shuffling: a card goes to a foundation, a face-down
// card is turned over, or a card from the stock/waste is placed on the board. Moving runs between columns, drawing
// from the stock and recycling the waste are not progress (they can be repeated forever).

const faceDownCount = (state) => state.tableau.reduce((n, pile) => n + pile.filter((c) => !c.faceUp).length, 0);
const foundationTotal = (state) => state.foundations.reduce((n, pile) => n + pile.length, 0);
const boardTotal = (state) => foundationTotal(state) + state.tableau.reduce((n, pile) => n + pile.length, 0);

export const madeProgress = (before, after) =>
    faceDownCount(after) < faceDownCount(before) ||
    foundationTotal(after) > foundationTotal(before) ||
    boardTotal(after) > boardTotal(before);

// Every legal move from here: { kind: 'move', from, to } or { kind: 'draw' } (draw / recycle).
export const legalMoves = (state) => {
    const moves = [];
    const sources = [];
    if (state.waste.length) sources.push({ pile: 'waste' });
    state.foundations.forEach((pile, index) => { if (pile.length) sources.push({ pile: 'foundation', index }); });
    state.tableau.forEach((pile, index) => {
        pile.forEach((c, cardIndex) => { if (c.faceUp) sources.push({ pile: 'tableau', index, cardIndex }); });
    });
    const targets = [
        ...SUITS.map((_, index) => ({ pile: 'foundation', index })),
        ...state.tableau.map((_, index) => ({ pile: 'tableau', index }))
    ];
    for (const from of sources) {
        for (const to of targets) {
            if (!canMove(state, from, to)) continue;
            // A whole column that is already a run starting at its bottom, moved to an empty column, changes nothing.
            if (from.pile === 'tableau' && to.pile === 'tableau' && from.cardIndex === 0 && !state.tableau[to.index].length) continue;
            moves.push({ kind: 'move', from, to });
        }
    }
    if (drawFromStock(state)) moves.push({ kind: 'draw' });
    return moves;
};

export const applyMove = (state, move) => (move.kind === 'draw' ? drawFromStock(state) : moveCards(state, move.from, move.to));

const ids = (pile) => pile.map((c) => c.id).join(',');
// Two states are the same position when every pile holds the same cards, face up or down, in the same order.
const stateKey = (state) => [
    ids(state.stock), ids(state.waste),
    state.foundations.map((p) => p.length).join(','),
    state.tableau.map((p) => p.map((c) => `${c.id}${c.faceUp ? 'u' : 'd'}`).join(',')).join('/')
].join('|');

export const SEARCH_LIMIT = 6000;

// Breadth-first search for the shortest series of moves that ends in progress.
// -> { found: true, move }                  the first move of that series
//    { found: false, exhausted: true }      every reachable position was checked: nothing can ever progress
//    { found: false, exhausted: false }     gave up (too many positions): unknown
export const searchProgress = (root, limit = SEARCH_LIMIT) => {
    const seen = new Set([stateKey(root)]);
    let queue = [{ state: root, first: null }];
    while (queue.length) {
        const next = [];
        for (const { state, first } of queue) {
            for (const move of legalMoves(state)) {
                const after = applyMove(state, move);
                if (!after) continue;
                const firstMove = first || move;
                if (madeProgress(root, after)) return { found: true, move: firstMove };
                const key = stateKey(after);
                if (seen.has(key)) continue;
                if (seen.size >= limit) return { found: false, exhausted: false };
                seen.add(key);
                next.push({ state: after, first: firstMove });
            }
        }
        queue = next;
    }
    return { found: false, exhausted: true };
};

// How good an immediately available progress move is (higher first): to a foundation, then turning a card over
// (the column with most hidden cards first), then playing from the waste.
const movePriority = (state, move) => {
    if (move.kind !== 'move') return 0;
    if (move.to.pile === 'foundation') return 3000 + (move.from.pile === 'tableau' ? 1 : 0);
    if (move.from.pile === 'tableau') {
        const pile = state.tableau[move.from.index];
        const hidden = pile.slice(0, move.from.cardIndex).filter((c) => !c.faceUp).length;
        if (hidden > 0 && move.from.cardIndex > 0 && !pile[move.from.cardIndex - 1].faceUp) return 2000 + hidden;
        return 500; // frees a column
    }
    return 1000; // waste -> tableau
};

// The best next move: { found: true, move } or { found: false, stuck } (stuck = true only when it is certain).
export const findHint = (state) => {
    if (isWon(state)) return { found: false, stuck: false };
    const direct = legalMoves(state)
        .map((move) => ({ move, after: applyMove(state, move) }))
        .filter(({ move, after }) => after && move.kind === 'move' && madeProgress(state, after))
        .sort((a, b) => movePriority(state, b.move) - movePriority(state, a.move));
    if (direct.length) return { found: true, move: direct[0].move };
    const result = searchProgress(state);
    if (result.found) return { found: true, move: result.move };
    return { found: false, stuck: result.exhausted };
};

// True only when no series of moves, however long, can ever make progress.
export const isStuck = (state) => !isWon(state) && findHint(state).stuck === true;
