// Session guard for the visitor counter.
const COUNTED_KEY = 'gokalppoOS_visitCounted';

// One increment per browser session, so reloads and scripted reloads don't inflate the badge.
export const shouldCountVisit = (storage = window.sessionStorage) => {
    try {
        if (storage.getItem(COUNTED_KEY) === '1') return false;
        storage.setItem(COUNTED_KEY, '1');
    } catch {
        // Storage blocked: fall back to counting (the rules still cap each write at +1).
    }
    return true;
};
