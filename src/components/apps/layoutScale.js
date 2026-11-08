// How big Solitaire cards and Minesweeper cells should be for the room a window gives them (pure, unit-tested).
// At the normal window size everything stays exactly as designed; a bigger or maximized window scales it up in proportion.

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const round2 = (n) => Math.round(n * 100) / 100;

// --- Solitaire -------------------------------------------------------------------------------------------------
export const CARD_W = 56;
export const CARD_H = 78;
export const SOL_MAX_SCALE = 2.6;
const SOL_COLUMNS = 7;
const SOL_GAP = 8;
const SOL_PADDING = 20;          // 10px each side of the board
const SOL_TOP_ROW_GAP = 14;
const FACE_DOWN_GAP = 10;
const FACE_UP_GAP = 22;
// A realistic tall column: a few face-down cards, a long face-up run, and the last card in full.
// (A rare longer column simply makes the board scroll.)
const TALL_COLUMN = CARD_H + 5 * FACE_DOWN_GAP + 9 * FACE_UP_GAP;
// Below this the difference is not worth changing the look: the normal window keeps the original size exactly.
const SOL_SNAP = 1.15;

// k = 1 is the original size. The board is measured (its inside, without the toolbar).
export const solitaireScale = ({ width, height }) => {
    if (!width || !height) return 1;
    const byWidth = (width - SOL_PADDING - SOL_GAP * (SOL_COLUMNS - 1)) / SOL_COLUMNS / CARD_W;
    const byHeight = (height - SOL_PADDING) / (CARD_H + SOL_TOP_ROW_GAP + TALL_COLUMN);
    const k = Math.min(byWidth, byHeight);
    return k < SOL_SNAP ? 1 : round2(clamp(k, 1, SOL_MAX_SCALE));
};

// --- Minesweeper -----------------------------------------------------------------------------------------------
export const MS_BASE_CELL = 20;
export const MS_MAX_CELL = 64;
const MS_SIZE = 9;
const MS_CHROME_X = 12 + 6;          // container padding + grid border
const MS_CHROME_Y = 12 + 44 + 6 + 6; // container padding + header panel + its margin + grid border
const MS_BANNER_RESERVE = 100;       // the "you won" box under the grid, so winning does not make the board jump

// The cell size in pixels for a window body of the given size.
export const minesweeperCell = ({ width, height }) => {
    if (!width || !height) return MS_BASE_CELL;
    const byWidth = (width - MS_CHROME_X) / MS_SIZE;
    const byHeight = (height - MS_CHROME_Y - MS_BANNER_RESERVE) / MS_SIZE;
    return clamp(Math.floor(Math.min(byWidth, byHeight)), MS_BASE_CELL, MS_MAX_CELL);
};
