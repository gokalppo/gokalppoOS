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

// One record per player: the database key is the name, lower-cased, so a second
// submission under the same name updates that record instead of adding another.
// "Ada Lovelace" and "  ada   lovelace " are the same player.
export const scoreKey = (name) =>
    cleanName(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, NAME_MAX) || 'player';

const isFaster = (a, b) => a.time < b.time || (a.time === b.time && (a.timestamp || 0) < (b.timestamp || 0));

// Keeps only each name's fastest entry (also folds old duplicate rows saved before records were per-name).
export const bestPerName = (rows) => {
    const best = new Map();
    for (const row of rows) {
        const key = scoreKey(row.name);
        if (!best.has(key) || isFaster(row, best.get(key))) best.set(key, row);
    }
    return [...best.values()];
};

// Firebase snapshot ({id: {name,time,timestamp}}) -> fastest first, one row per player,
// ties broken by who got there first.
export const topScores = (data, limit = TOP_COUNT) =>
    bestPerName(
        Object.entries(data || {})
            .map(([id, entry]) => ({ id, ...entry }))
            .filter((e) => Number.isFinite(e.time))
    )
        .sort((a, b) => a.time - b.time || (a.timestamp || 0) - (b.timestamp || 0))
        .slice(0, limit);
