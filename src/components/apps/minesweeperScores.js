// Pure helpers for the Minesweeper best-times board.

export const NAME_MAX = 20;
export const MAX_TIME = 999;
export const TOP_COUNT = 10;
export const BOARD_PATH = 'leaderboards/minesweeper';

export const cleanName = (name) => String(name ?? '').replace(/\s+/g, ' ').trim();

// Returns error codes (translated by the UI); empty means valid.
export const validateScore = ({ name, time }) => {
    const errors = [];
    const n = cleanName(name);
    if (n.length < 1) errors.push('nameRequired');
    if (n.length > NAME_MAX) errors.push('nameTooLong');
    if (!Number.isInteger(time) || time < 1 || time > MAX_TIME) errors.push('badTime');
    return errors;
};

// Firebase snapshot ({id: {name,time,timestamp}}) -> fastest first, ties broken by who got there first.
export const topScores = (data, limit = TOP_COUNT) =>
    Object.entries(data || {})
        .map(([id, entry]) => ({ id, ...entry }))
        .filter((e) => Number.isFinite(e.time))
        .sort((a, b) => a.time - b.time || (a.timestamp || 0) - (b.timestamp || 0))
        .slice(0, limit);
