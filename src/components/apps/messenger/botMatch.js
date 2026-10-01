// Finds the stored sentence that is closest to what the visitor typed (the way old chat bots like
// SimSimi did): word overlap weighted by how telling each word is, tolerant of typos and endings.
// Pure and unit-tested.
import { tokenize, normalizeText, tokenMatches } from './botNlp';

// Little words that carry almost no meaning on their own (Turkish and English).
const STOP = new Set([
    'ne', 'mi', 'mu', 'sen', 'ben', 'bir', 'bu', 'su', 'o', 'de', 'da', 've', 'ya', 'ki', 'ha', 'hani', 'yani', 'ama', 'iyi',
    'bugun', 'simdi', 'yine', 'yarin', 'dun', 'cok', 'biraz', 'bi', 'hic', 'artik', 'today', 'now', 'right', 'then', 'too', 'really', 'very', 'again', 'the', 'a', 'an', 'is', 'are', 'you', 'i', 'me', 'my', 'your', 'to', 'of', 'it', 'do', 'does', 'what', 'how', 'am', 'be',
    'and', 'in', 'on', 'at', 'for', 'with', 'that', 'this', 'just', 'so', 'im', 'ur', 'u', 'yaa', 'ki', 'lan', 'ya', 'abi'
]);

export const DEFAULT_THRESHOLD = 0.78;

// entries: [{ id, patterns: [string, ...] }]
export const createMatcher = (entries) => {
    const rows = [];
    const df = new Map();
    entries.forEach((entry) => {
        const seen = new Set();
        entry.patterns.forEach((pattern) => {
            const tokens = tokenize(pattern);
            if (!tokens.length) return;
            rows.push({ id: entry.id, tokens, text: normalizeText(pattern) });
            tokens.forEach((t) => seen.add(t));
        });
        seen.forEach((t) => df.set(t, (df.get(t) || 0) + 1));
    });
    const total = Math.max(1, entries.length);
    const weight = (token) => (STOP.has(token) ? 0.3 : 1 + Math.log(1 + total / (df.get(token) || 1)) / 4);

    // Best row for the typed text, or null.
    const match = (text, tokens) => {
        if (!tokens.length) return null;
        const normalized = ` ${text} `;
        const userWeights = tokens.map(weight);
        const userTotal = userWeights.reduce((a, b) => a + b, 0);
        let best = null;

        rows.forEach((row) => {
            let score;
            if (row.text === text) {
                score = 1;
            } else {
                const used = new Set();
                let matched = 0;
                let userMatched = 0;
                let patternTotal = 0;
                let fuzzy = false;
                row.tokens.forEach((pt) => {
                    const w = weight(pt);
                    patternTotal += w;
                    const at = tokens.findIndex((ut, i) => !used.has(i) && tokenMatches(ut, pt));
                    if (at >= 0) {
                        used.add(at);
                        // an exact word is worth more than a typo-corrected or suffix-extended one
                        const closeness = tokens[at] === pt ? 1 : 0.9;
                        if (tokens[at] !== pt) fuzzy = true;
                        matched += w * closeness;
                        userMatched += userWeights[at] * closeness;
                    }
                });
                const coverage = matched / patternTotal;
                score = coverage * (0.6 + 0.4 * (userMatched / userTotal));
                if (row.tokens.length >= 2 && normalized.includes(` ${row.text} `)) score = Math.min(1, score + 0.06);
                // a one-word sentence matched only through a typo or a suffix is too weak a signal ("üşüyorum" is not "uyuyorum")
                if (row.tokens.length === 1 && fuzzy) score *= 0.8;
            }
            if (!best || score > best.score || (score === best.score && row.tokens.length > best.length)) {
                best = { id: row.id, score, length: row.tokens.length, pattern: row.text };
            }
        });
        return best;
    };

    return { match, size: rows.length };
};
