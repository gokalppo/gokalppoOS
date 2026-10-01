// Literal (non-regex) find / replace helpers for Notepad. Pure and unit-tested.

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A global regex for the query. Using a regex (instead of lower-casing the text) keeps indices
// correct for characters whose lower-case form has a different length (e.g. Turkish İ).
const makeRegex = (query, matchCase) => new RegExp(escapeRegExp(query), matchCase ? 'gu' : 'giu');

// All non-overlapping matches as [{ start, end }].
export const findAll = (text, query, { matchCase = false } = {}) => {
    if (!query) return [];
    const re = makeRegex(query, matchCase);
    const matches = [];
    let m;
    while ((m = re.exec(text)) !== null) {
        matches.push({ start: m.index, end: m.index + m[0].length });
        if (m[0].length === 0) re.lastIndex++;
    }
    return matches;
};

// The first match starting at/after `from` (wrapping to the top when `wrap` is true).
export const findNext = (text, query, from = 0, { matchCase = false, wrap = true } = {}) => {
    const matches = findAll(text, query, { matchCase });
    if (matches.length === 0) return null;
    const after = matches.find((m) => m.start >= from);
    if (after) return after;
    return wrap ? matches[0] : null;
};

export const replaceRange = (text, match, replacement) =>
    text.slice(0, match.start) + replacement + text.slice(match.end);

export const replaceAll = (text, query, replacement, { matchCase = false } = {}) => {
    const matches = findAll(text, query, { matchCase });
    if (matches.length === 0) return { text, count: 0 };
    let out = '';
    let cursor = 0;
    for (const m of matches) {
        out += text.slice(cursor, m.start) + replacement;
        cursor = m.end;
    }
    return { text: out + text.slice(cursor), count: matches.length };
};

// Notepad's F5 "Time/Date" format.
export const timeDateStamp = (date = new Date(), locale = 'en') =>
    `${date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} ${date.toLocaleDateString(locale)}`;
