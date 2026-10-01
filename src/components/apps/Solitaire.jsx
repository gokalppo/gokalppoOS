import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useOS } from '../../context/OSContext';
import {
    SUITS, SUIT_SYMBOL, isRed, rankLabel, deal, moveCards, drawFromStock, autoMoveToFoundation,
    canMove, getMovingCards, isWon
} from './solitaireLogic';
import './Solitaire.css';

const HISTORY_LIMIT = 200;
const FACE_DOWN_GAP = 10;
const FACE_UP_GAP = 22;

const sameLocation = (a, b) =>
    a && b && a.pile === b.pile && a.index === b.index && (a.cardIndex ?? null) === (b.cardIndex ?? null);

const Card = ({ card, selected, draggable, onClick, onDoubleClick, onDragStart, style }) => (
    <div
        className={`sol-card ${card.faceUp ? (isRed(card.suit) ? 'red' : 'black') : 'back'} ${selected ? 'selected' : ''}`}
        style={style}
        draggable={draggable}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onDragStart={onDragStart}
        data-card={card.id}
    >
        {card.faceUp && (
            <>
                <span className="sol-corner">{rankLabel(card.rank)}{SUIT_SYMBOL[card.suit]}</span>
                <span className="sol-pip">{SUIT_SYMBOL[card.suit]}</span>
                <span className="sol-corner bottom">{rankLabel(card.rank)}{SUIT_SYMBOL[card.suit]}</span>
            </>
        )}
    </div>
);

const Solitaire = () => {
    const { t } = useLanguage();
    const { playSound } = useOS();
    const [game, setGame] = useState(() => deal());
    const [history, setHistory] = useState([]);
    const [selected, setSelected] = useState(null);
    const [started, setStarted] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const dragFromRef = useRef(null);

    const won = isWon(game);

    useEffect(() => {
        if (!started || won) return;
        const timer = setInterval(() => setElapsed((s) => Math.min(s + 1, 5999)), 1000);
        return () => clearInterval(timer);
    }, [started, won]);

    const commit = (next) => {
        if (!next) return false;
        setHistory((h) => [...h.slice(-(HISTORY_LIMIT - 1)), game]);
        setGame(next);
        setSelected(null);
        setStarted(true);
        return true;
    };

    const newGame = () => {
        setGame(deal());
        setHistory([]);
        setSelected(null);
        setStarted(false);
        setElapsed(0);
    };

    const undo = () => {
        if (!history.length) return;
        setGame(history[history.length - 1]);
        setHistory((h) => h.slice(0, -1));
        setSelected(null);
    };

    const tryMove = (from, to) => {
        if (commit(moveCards(game, from, to))) playSound('click');
    };

    const handleStockClick = () => {
        if (won) return;
        commit(drawFromStock(game));
    };

    // Click a card: complete a pending move onto it, otherwise pick it up.
    const handleCardClick = (location) => {
        if (won) return;
        if (selected && !sameLocation(selected, location) && location.pile !== 'waste') {
            const to = { pile: location.pile, index: location.index };
            if (canMove(game, selected, to)) {
                tryMove(selected, to);
                return;
            }
        }
        const cards = getMovingCards(game, location);
        setSelected(cards.length && cards[0].faceUp && !sameLocation(selected, location) ? location : null);
    };

    const handleDoubleClick = (location) => {
        if (won) return;
        if (commit(autoMoveToFoundation(game, location))) playSound('click');
    };

    const handlePileClick = (to) => {
        if (selected && canMove(game, selected, to)) tryMove(selected, to);
        else setSelected(null);
    };

    const startDrag = (e, location) => {
        dragFromRef.current = location;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'card');
    };

    const allowDrop = (e) => { if (dragFromRef.current) e.preventDefault(); };

    const dropOn = (e, to) => {
        e.preventDefault();
        const from = dragFromRef.current;
        dragFromRef.current = null;
        if (from) tryMove(from, to);
    };

    const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const seconds = String(elapsed % 60).padStart(2, '0');

    const wasteTop = game.waste[game.waste.length - 1];
    const wasteLocation = { pile: 'waste' };

    return (
        <div className="sol-root">
            <div className="sol-toolbar">
                <button className="sol-btn" onClick={newGame}>{t('sol.newGame')}</button>
                <button className="sol-btn" onClick={undo} disabled={!history.length}>{t('sol.undo')}</button>
                <span className="sol-stat">{t('sol.moves')}: {game.moves}</span>
                <span className="sol-stat">{t('sol.time')}: {minutes}:{seconds}</span>
            </div>

            <div className="sol-board">
                <div className="sol-top">
                    <div className="sol-slot" onClick={handleStockClick} data-pile="stock" title={t('sol.stock')}>
                        {game.stock.length > 0
                            ? <Card card={game.stock[game.stock.length - 1]} />
                            : <div className="sol-recycle">{game.waste.length ? '↻' : ''}</div>}
                    </div>
                    <div className="sol-slot" data-pile="waste">
                        {wasteTop && (
                            <Card
                                card={wasteTop}
                                selected={sameLocation(selected, wasteLocation)}
                                draggable
                                onClick={() => handleCardClick(wasteLocation)}
                                onDoubleClick={() => handleDoubleClick(wasteLocation)}
                                onDragStart={(e) => startDrag(e, wasteLocation)}
                            />
                        )}
                    </div>
                    <div className="sol-spacer" />
                    {SUITS.map((suit, index) => {
                        const pile = game.foundations[index];
                        const location = { pile: 'foundation', index };
                        const topCard = pile[pile.length - 1];
                        return (
                            <div
                                key={suit}
                                className="sol-slot foundation"
                                data-pile={`foundation-${index}`}
                                onClick={() => handlePileClick(location)}
                                onDragOver={allowDrop}
                                onDrop={(e) => dropOn(e, location)}
                            >
                                <span className="sol-suit-hint">{SUIT_SYMBOL[suit]}</span>
                                {topCard && (
                                    <Card
                                        card={topCard}
                                        selected={sameLocation(selected, location)}
                                        draggable
                                        onClick={(e) => { e.stopPropagation(); handleCardClick(location); }}
                                        onDragStart={(e) => startDrag(e, location)}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="sol-tableau">
                    {game.tableau.map((pile, index) => {
                        let offset = 0;
                        const column = { pile: 'tableau', index };
                        return (
                            <div
                                key={index}
                                className="sol-column"
                                data-pile={`tableau-${index}`}
                                onClick={() => handlePileClick(column)}
                                onDragOver={allowDrop}
                                onDrop={(e) => dropOn(e, column)}
                            >
                                {pile.map((card, cardIndex) => {
                                    const location = { ...column, cardIndex };
                                    const style = { top: offset };
                                    offset += card.faceUp ? FACE_UP_GAP : FACE_DOWN_GAP;
                                    return (
                                        <Card
                                            key={card.id}
                                            card={card}
                                            style={style}
                                            selected={selected && selected.pile === 'tableau' && selected.index === index && cardIndex >= selected.cardIndex}
                                            draggable={card.faceUp}
                                            onClick={(e) => { e.stopPropagation(); handleCardClick(location); }}
                                            onDoubleClick={() => handleDoubleClick(location)}
                                            onDragStart={(e) => startDrag(e, location)}
                                        />
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            {won && (
                <div className="sol-win" role="dialog" aria-label={t('sol.won')}>
                    <div className="sol-win-box">
                        <div className="sol-win-title">🎉 {t('sol.won')}</div>
                        <div>{t('sol.winText', { moves: game.moves, time: `${minutes}:${seconds}` })}</div>
                        <button className="sol-btn" onClick={newGame}>{t('sol.newGame')}</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Solitaire;
