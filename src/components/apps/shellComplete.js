// Tab completion for the Terminal: command names, file/folder names, program and window names.
import { resolvePath } from './shellFs';

const lower = (s) => String(s).toLowerCase();

// Walks the text typed so far and finds the word under the cursor and what came before it in its stage.
const scan = (s) => {
    let quote = null;
    let wordStart = -1;
    let stageWords = [];
    let stageStarts = [];
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (quote) {
            if (ch === quote) quote = null;
            continue;
        }
        if ((ch === '"' || ch === "'") && wordStart === -1) {
            quote = ch;
            wordStart = i;
            continue;
        }
        if (/\s/.test(ch)) {
            if (wordStart !== -1) { stageWords.push(s.slice(wordStart, i)); stageStarts.push(wordStart); }
            wordStart = -1;
            continue;
        }
        if (ch === '|' || ch === ';' || (ch === '&' && s[i + 1] === '&')) {
            if (ch === '&') i++;
            stageWords = [];
            stageStarts = [];
            wordStart = -1;
            continue;
        }
        if (ch === '>') {
            if (wordStart !== -1) { stageWords.push(s.slice(wordStart, i)); stageStarts.push(wordStart); }
            wordStart = -1;
            if (s[i + 1] === '>') i++;
            stageWords.push('>');
            stageStarts.push(i);
            continue;
        }
        if (wordStart === -1) wordStart = i;
    }
    return { quote, wordStart, stageWords, stageStarts };
};

const commonPrefix = (names) => {
    let prefix = names[0];
    for (const n of names.slice(1)) {
        let i = 0;
        while (i < prefix.length && i < n.length && lower(prefix[i]) === lower(n[i])) i++;
        prefix = prefix.slice(0, i);
    }
    return prefix;
};

const FOLDER_ONLY = new Set(['cd', 'tree', 'rmdir']);

// env: { commands, nodes, cwd, programs, windows }
// Returns { input, options }: the completed text, and every candidate when there is more than one.
export const completeInput = (input, env = {}) => {
    const { quote, wordStart, stageWords, stageStarts } = scan(input);
    let start = wordStart === -1 ? input.length : wordStart;
    // `cd my documents` joins its words, so complete everything after "cd" as one name.
    const joinedCd = !quote && lower(stageWords[0] || '') === 'cd' && stageWords.length >= 1
        && stageWords[stageWords.length - 1] !== '>' && !stageWords.includes('>');
    if (joinedCd) start = stageWords.length >= 2 ? stageStarts[1] : start;
    let value = input.slice(start);
    const quoteChar = quote || (/^["']/.test(value) ? value[0] : null);
    if (/^["']/.test(value)) value = value.slice(1);
    if (quoteChar && value.endsWith(quoteChar)) value = value.slice(0, -1);

    const afterRedirect = stageWords[stageWords.length - 1] === '>';
    const cmd = lower(stageWords[0] || '');
    let candidates = []; // { name, folder }
    let prefixPath = '';
    let base = value;

    if (stageWords.length === 0) {
        candidates = (env.commands || []).map((name) => ({ name, folder: false }));
    } else if (cmd === 'kill' || cmd === 'taskkill') {
        candidates = (env.windows || []).filter((w) => !w.isClosing).map((w) => ({ name: w.id, folder: false }));
    } else {
        const idx = Math.max(value.lastIndexOf('/'), value.lastIndexOf('\\'));
        prefixPath = value.slice(0, idx + 1);
        base = value.slice(idx + 1);
        const dir = prefixPath ? resolvePath(env.nodes || {}, env.cwd || 'root', prefixPath) : (env.nodes || {})[env.cwd || 'root'];
        if (dir && dir.type === 'folder') {
            candidates = (dir.children || [])
                .map((id) => env.nodes[id])
                .filter(Boolean)
                .filter((n) => !FOLDER_ONLY.has(cmd) || n.type === 'folder')
                .map((n) => ({ name: n.name, folder: n.type === 'folder' }));
        }
        if ((cmd === 'start' || cmd === 'open') && !afterRedirect && !prefixPath) {
            candidates = [...candidates, ...(env.programs || []).map((p) => ({ name: p.id, folder: false }))];
        }
    }

    const matches = candidates.filter((c) => lower(c.name).startsWith(lower(base)));
    // De-duplicate by name (a program id can equal a file name).
    const unique = matches.filter((c, i) => matches.findIndex((o) => o.name === c.name) === i);
    if (!unique.length) return { input, options: [] };

    const done = unique.length === 1;
    const completed = done ? unique[0].name : commonPrefix(unique.map((u) => u.name));
    const newValue = `${prefixPath}${completed}`;
    const isFolder = done && unique[0].folder;
    const isCommand = stageWords.length === 0;

    const q = quoteChar || (/\s/.test(newValue) ? '"' : null);
    let text;
    if (q) text = `${q}${newValue}${done && !isFolder ? `${q} ` : isFolder ? '\\' : ''}`;
    else text = `${newValue}${done ? (isFolder ? '\\' : ' ') : ''}`;
    if (isCommand && done) text = `${completed} `;

    return {
        input: input.slice(0, start) + text,
        options: done ? [] : unique.map((u) => (u.folder ? `${u.name}\\` : u.name))
    };
};
