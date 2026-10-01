// Splits a command line into segments joined by `&&` / `;`, each made of piped stages (`a | b`).
// Operators inside "quotes" are ordinary text. Pure and unit-tested.
export const splitLine = (raw) => {
    const s = String(raw ?? '');
    const segments = [];
    let stages = [];
    let cur = '';
    let quoteChar = null;
    let atWordStart = true;

    const endStage = () => {
        stages.push(cur);
        cur = '';
        atWordStart = true;
    };
    const endSegment = (op) => {
        endStage();
        segments.push({ stages: stages.some((st) => st.trim()) ? stages.filter((st) => st.trim()) : [''], op });
        stages = [];
    };

    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (quoteChar) {
            if (ch === quoteChar) quoteChar = null;
            cur += ch;
            continue;
        }
        if ((ch === '"' || ch === "'") && atWordStart) {
            quoteChar = ch;
            cur += ch;
            atWordStart = false;
            continue;
        }
        if (ch === '&' && s[i + 1] === '&') { endSegment('&&'); i++; continue; }
        if (ch === ';') { endSegment(';'); continue; }
        if (ch === '|') { endStage(); continue; }
        atWordStart = /\s/.test(ch);
        cur += ch;
    }
    endSegment(null);

    // Drop empty trailing segments ("ls &&" or "ls;"), but keep a lone empty line as one segment.
    const cleaned = segments.filter((seg) => seg.stages.some((st) => st.trim()));
    return cleaned.length ? cleaned : [{ stages: [''], op: null }];
};
