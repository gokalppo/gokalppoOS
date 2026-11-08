// Turns a hint move into something to show: which cards to highlight and what to say (pure, unit-tested).
import { SUIT_SYMBOL, rankLabel, getMovingCards } from './solitaireLogic';

export const cardLabel = (card) => `${rankLabel(card.rank)}${SUIT_SYMBOL[card.suit]}`;

// -> { key, params } for the translated sentence ('sol.hintDraw' | 'sol.hintFoundation' | 'sol.hintEmpty' | 'sol.hintOnto')
export const describeHint = (state, move) => {
    if (move.kind === 'draw') return { key: state.stock.length ? 'sol.hintDraw' : 'sol.hintRecycle', params: {} };
    const moving = getMovingCards(state, move.from);
    const card = cardLabel(moving[0]);
    if (move.to.pile === 'foundation') return { key: 'sol.hintFoundation', params: { card } };
    const target = state.tableau[move.to.index];
    if (!target.length) return { key: 'sol.hintEmpty', params: { card } };
    return { key: 'sol.hintOnto', params: { card, target: cardLabel(target[target.length - 1]) } };
};

// The ids of the cards the hint wants moved, and of the card (if any) they should land on.
export const hintCards = (state, move) => {
    if (move.kind !== 'move') return { moving: [], landingOn: null };
    const moving = getMovingCards(state, move.from).map((c) => c.id);
    let landingOn = null;
    if (move.to.pile === 'tableau') {
        const target = state.tableau[move.to.index];
        if (target.length) landingOn = target[target.length - 1].id;
    }
    return { moving, landingOn };
};
