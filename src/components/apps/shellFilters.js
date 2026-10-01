// Text filters for pipes and files: grep, head, tail, wc, sort.
// `ctx.stdin` is the previous command's output when piped; otherwise they read the files they are given.
import { fileKind } from './fileTypes';
import { resolvePath } from './shellFs';

export const FILTER_COMMANDS = ['grep', 'head', 'tail', 'wc', 'sort'];

const MSG = {
    en: {
        noPattern: (c) => `${c}: missing pattern`,
        noInput: (c) => `${c}: nothing to read (pipe something in, or give a file name)`,
        noSuch: (c, p) => `${c}: ${p}: No such file or directory`,
        isDir: (c, p) => `${c}: ${p}: Is a folder`,
        notText: (c, p) => `${c}: ${p}: Not a text file`,
        badCount: (c) => `${c}: invalid line count`
    },
    tr: {
        noPattern: (c) => `${c}: aranacak ifade eksik`,
        noInput: (c) => `${c}: okunacak bir şey yok (bir çıktıyı boruya ver ya da dosya adı yaz)`,
        noSuch: (c, p) => `${c}: ${p}: Böyle bir dosya veya klasör yok`,
        isDir: (c, p) => `${c}: ${p}: Bu bir klasör`,
        notText: (c, p) => `${c}: ${p}: Metin dosyası değil`,
        badCount: (c) => `${c}: geçersiz satır sayısı`
    }
};

const out = (lines) => ({ type: 'text', lines });
const fail = (message) => ({ type: 'text', lines: [message], error: true });

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const makeMatcher = (pattern, ignoreCase) => {
    const flags = ignoreCase ? 'i' : '';
    try {
        return new RegExp(pattern, flags);
    } catch {
        return new RegExp(escapeRegExp(pattern), flags);
    }
};

// Reads each named file (or the piped input) into { name, lines } sources.
const readSources = (name, files, ctx, m) => {
    if (!files.length) {
        if (!ctx.stdin) return { error: m.noInput(name) };
        return { sources: [{ name: null, lines: ctx.stdin }] };
    }
    const sources = [];
    for (const f of files) {
        const node = ctx.nodes && resolvePath(ctx.nodes, ctx.cwd || 'root', f);
        if (!node) return { error: m.noSuch(name, f) };
        if (node.type === 'folder') return { error: m.isDir(name, f) };
        if (fileKind(node.name) === 'image') return { error: m.notText(name, f) };
        sources.push({ name: f, lines: String(node.content ?? '').split('\n') });
    }
    return { sources };
};

export const filterCommand = (name, args, ctx) => {
    if (!FILTER_COMMANDS.includes(name)) return null;
    const m = MSG[ctx.lang] || MSG.en;

    // "-n 5" and "-5" count flags, plus single-letter flags like -i -v -c.
    const flags = new Set();
    let count = null;
    const rest = [];
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '-n' && (name === 'head' || name === 'tail')) {
            count = Number(args[++i]);
            if (!Number.isInteger(count) || count < 0) return fail(m.badCount(name));
        } else if (/^-\d+$/.test(a) && (name === 'head' || name === 'tail')) {
            count = Number(a.slice(1));
        } else if (/^-[a-z]+$/i.test(a)) {
            [...a.slice(1).toLowerCase()].forEach((f) => flags.add(f));
        } else {
            rest.push(a);
        }
    }

    if (name === 'grep') {
        if (!rest.length) return fail(m.noPattern(name));
        const [pattern, ...files] = rest;
        const read = readSources(name, files, ctx, m);
        if (read.error) return fail(read.error);
        const matcher = makeMatcher(pattern, flags.has('i'));
        const lines = [];
        let total = 0;
        read.sources.forEach(({ name: file, lines: src }) => {
            src.forEach((line, i) => {
                if (matcher.test(line) === flags.has('v')) return;
                total++;
                const tag = `${read.sources.length > 1 ? `${file}:` : ''}${flags.has('n') ? `${i + 1}:` : ''}`;
                lines.push(`${tag}${line}`);
            });
        });
        return out(flags.has('c') ? [String(total)] : lines);
    }

    const read = readSources(name, rest, ctx, m);
    if (read.error) return fail(read.error);
    const all = read.sources.flatMap((s) => s.lines);
    // A trailing newline in a file is not an extra line.
    const lines = all.length && all[all.length - 1] === '' && !ctx.stdin ? all.slice(0, -1) : all;

    switch (name) {
        case 'head': return out(lines.slice(0, count ?? 10));
        case 'tail': return out(count === 0 ? [] : lines.slice(-(count ?? 10)));
        case 'sort': {
            const sorted = [...lines].sort((a, b) => a.localeCompare(b));
            return out(flags.has('r') ? sorted.reverse() : sorted);
        }
        case 'wc': {
            const words = lines.reduce((n, l) => n + (l.trim() ? l.trim().split(/\s+/).length : 0), 0);
            const chars = lines.join('\n').length;
            if (flags.has('l')) return out([String(lines.length)]);
            if (flags.has('w')) return out([String(words)]);
            if (flags.has('c')) return out([String(chars)]);
            return out([`${lines.length} ${words} ${chars}`]);
        }
        default: return null;
    }
};
