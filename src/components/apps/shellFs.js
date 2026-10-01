// Pure virtual-file-system commands for the Terminal (ls, cd, cat, mkdir, ...).
// They read the file system's flat id -> node map and never mutate it: every change is returned as
// a list of "ops" that the Terminal applies through the FileSystemContext. That keeps this unit-testable.
import { fileKind, extensionOf, sanitizeFileName, isImageDataUrl } from './fileTypes';

const ROOT_ID = 'root';
const HOME_ID = 'documents';
const PROTECTED_IDS = new Set(['root', 'documents', 'localdisk', 'recycle']);
const MAX_NAME_LENGTH = 100;
const TREE_LINE_LIMIT = 200;

const MSG = {
    en: {
        noFs: (c) => `${c}: the file system is not available`,
        noSuch: (c, p) => `${c}: ${p}: No such file or directory`,
        notDir: (c, p) => `${c}: ${p}: Not a directory`,
        isDir: (c, p) => `${c}: ${p}: Is a folder`,
        exists: (c, p) => `${c}: ${p}: Already exists`,
        badName: (c, p) => `${c}: ${p}: Invalid name (these characters are not allowed: \\ / : * ? " < > |)`,
        missing: (c) => `${c}: missing operand`,
        missingTarget: (c) => `${c}: missing file name after the redirect`,
        protectedItem: (c, p) => `${c}: ${p}: This system folder cannot be changed`,
        needR: (c, p) => `${c}: ${p}: Is a folder (use -r to remove it)`,
        full: (c) => `${c}: The disk is full`,
        notText: (c, p) => `${c}: ${p}: Not a text file`,
        binary: (p) => `${p}: picture file - use: paint ${quote(p)}`,
        empty: '(empty)',
        trashed: (p) => `Moved to Recycle Bin: ${p}`,
        intoSelf: (c, p) => `${c}: ${p}: Cannot move a folder into itself`,
        noFolderCopy: (c, p) => `${c}: ${p}: Folders cannot be copied (files only)`,
        manyToFile: (c) => `${c}: The target must be a folder when there are several sources`
    },
    tr: {
        noFs: (c) => `${c}: dosya sistemi kullanılamıyor`,
        noSuch: (c, p) => `${c}: ${p}: Böyle bir dosya veya klasör yok`,
        notDir: (c, p) => `${c}: ${p}: Klasör değil`,
        isDir: (c, p) => `${c}: ${p}: Bu bir klasör`,
        exists: (c, p) => `${c}: ${p}: Zaten var`,
        badName: (c, p) => `${c}: ${p}: Geçersiz ad (şu karakterler olmaz: \\ / : * ? " < > |)`,
        missing: (c) => `${c}: eksik argüman`,
        missingTarget: (c) => `${c}: yönlendirmeden sonra dosya adı eksik`,
        protectedItem: (c, p) => `${c}: ${p}: Bu sistem klasörü değiştirilemez`,
        needR: (c, p) => `${c}: ${p}: Bu bir klasör (silmek için -r kullan)`,
        full: (c) => `${c}: Disk dolu`,
        notText: (c, p) => `${c}: ${p}: Metin dosyası değil`,
        binary: (p) => `${p}: resim dosyası - şunu kullan: paint ${quote(p)}`,
        empty: '(boş)',
        trashed: (p) => `Geri Dönüşüm Kutusu'na taşındı: ${p}`,
        intoSelf: (c, p) => `${c}: ${p}: Klasör kendi içine taşınamaz`,
        noFolderCopy: (c, p) => `${c}: ${p}: Klasörler kopyalanamaz (sadece dosyalar)`,
        manyToFile: (c) => `${c}: Birden fazla kaynak varsa hedef bir klasör olmalı`
    }
};

function quote(name) {
    return /\s/.test(name) ? `"${name}"` : name;
}

const lower = (s) => String(s).toLowerCase();

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

// Splits a command line into words (honouring "double" and 'single' quotes) and pulls out a
// trailing `> file` / `>> file` redirect. Case is preserved: file names and echo text keep theirs.
export const tokenize = (raw) => {
    const s = String(raw ?? '');
    const words = [];
    let redirect = null;
    let awaiting = null;
    let cur = '';
    let has = false;
    let quoteChar = null;

    const push = () => {
        if (!has) return;
        if (awaiting) {
            redirect = { mode: awaiting, target: cur };
            awaiting = null;
        } else {
            words.push(cur);
        }
        cur = '';
        has = false;
    };

    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (quoteChar) {
            if (ch === quoteChar) quoteChar = null;
            else cur += ch;
            continue;
        }
        // A quote only opens at the start of a word, so "it's" keeps its apostrophe.
        if ((ch === '"' || ch === "'") && !has) {
            quoteChar = ch;
            has = true;
            continue;
        }
        if (/\s/.test(ch)) {
            push();
            continue;
        }
        if (ch === '>') {
            push();
            awaiting = s[i + 1] === '>' ? '>>' : '>';
            if (awaiting === '>>') i++;
            continue;
        }
        cur += ch;
        has = true;
    }
    push();
    return { words, redirect, dangling: awaiting !== null };
};

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const SEP = /[\\/]+/;

export const childByName = (nodes, folder, name) => {
    const kids = (folder.children || []).map((id) => nodes[id]).filter(Boolean);
    return kids.find((k) => k.name === name) || kids.find((k) => lower(k.name) === lower(name)) || null;
};

const startOf = (nodes, cwd, path) => {
    if (path === '~' || path.startsWith('~/') || path.startsWith('~\\')) {
        return { node: nodes[HOME_ID] || nodes[ROOT_ID], rest: path.slice(1) };
    }
    if (/^c:(?=[\\/]|$)/i.test(path)) return { node: nodes[ROOT_ID], rest: path.slice(2) };
    if (/^[\\/]/.test(path)) return { node: nodes[ROOT_ID], rest: path };
    return { node: nodes[cwd] || nodes[ROOT_ID], rest: path };
};

// "docs\\a.txt", "..", "C:\\My Documents", "~/x" -> node, or null if it does not exist.
export const resolvePath = (nodes, cwd, path) => {
    const { node, rest } = startOf(nodes, cwd, String(path));
    let cur = node;
    for (const seg of rest.split(SEP).filter(Boolean)) {
        if (seg === '.') continue;
        if (seg === '..') {
            if (cur.parentId && nodes[cur.parentId]) cur = nodes[cur.parentId];
            continue;
        }
        if (cur.type !== 'folder') return null;
        cur = childByName(nodes, cur, seg);
        if (!cur) return null;
    }
    return cur;
};

// For things that do not exist yet: the folder that would contain it, plus the new name.
export const splitTarget = (nodes, cwd, path) => {
    const trimmed = String(path).replace(/[\\/]+$/, '');
    const idx = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
    const name = trimmed.slice(idx + 1);
    if (!name) return null;
    const dir = idx >= 0 ? trimmed.slice(0, idx + 1) : '';
    const parent = dir ? resolvePath(nodes, cwd, dir) : (nodes[cwd] || nodes[ROOT_ID]);
    if (!parent || parent.type !== 'folder') return { parent: null, name };
    return { parent, name };
};

export const pathOf = (nodes, id) => {
    const chain = [];
    let cur = nodes[id];
    while (cur) {
        chain.unshift(cur);
        cur = cur.parentId ? nodes[cur.parentId] : null;
    }
    if (chain.length === 0) return 'C:\\';
    if (chain[0].id === ROOT_ID) return `C:\\${chain.slice(1).map((n) => n.name).join('\\')}`;
    return chain.map((n) => n.name).join('\\');
};

export const promptFor = (nodes, cwd) => `${pathOf(nodes, nodes[cwd] ? cwd : ROOT_ID)}>`;

const isSelfOrDescendant = (nodes, candidate, ancestorId) => {
    let cur = candidate;
    while (cur) {
        if (cur.id === ancestorId) return true;
        cur = cur.parentId ? nodes[cur.parentId] : null;
    }
    return false;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const cleanName = (raw) => {
    const name = sanitizeFileName(raw);
    if (!name || name !== String(raw).trim() || name.length > MAX_NAME_LENGTH || name === '.' || name === '..') return null;
    return name;
};

// Files without an extension would not open in Notepad, so new ones get ".txt".
const withExtension = (name) => (extensionOf(name) ? name : `${name}.txt`);

const bytesOf = (node) => {
    const content = node.content || '';
    if (isImageDataUrl(content)) return Math.floor(((content.length - content.indexOf(',') - 1) * 3) / 4);
    return new TextEncoder().encode(content).length;
};

const sizeLabel = (n) => {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const sortedChildren = (nodes, folder) =>
    (folder.children || [])
        .map((id) => nodes[id])
        .filter(Boolean)
        .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1));

const out = (lines, extra = {}) => ({ type: 'text', lines, ...extra });

// ---------------------------------------------------------------------------
// Redirects: `echo hi > a.txt`, `ls >> list.txt`
// ---------------------------------------------------------------------------

export const writeRedirect = (lines, redirect, ctx) => {
    const { nodes, cwd, lang, canStore } = ctx;
    const m = MSG[lang] || MSG.en;
    const fail = (message) => out([message], { error: true });
    const text = lines.join('\n');
    const existing = resolvePath(nodes, cwd, redirect.target);

    if (existing) {
        if (existing.type === 'folder') return fail(m.isDir('>', redirect.target));
        if (fileKind(existing.name) === 'image') return fail(m.notText('>', redirect.target));
        const old = existing.content || '';
        const content = redirect.mode === '>>' ? `${old}${old && !old.endsWith('\n') ? '\n' : ''}${text}` : text;
        if (!canStore(Math.max(0, content.length - old.length))) return fail(m.full('>'));
        return out([], { ops: [{ op: 'write', id: existing.id, content }] });
    }

    const target = splitTarget(nodes, cwd, redirect.target);
    if (!target || !target.parent) return fail(m.noSuch('>', redirect.target));
    const name = cleanName(target.name);
    if (!name) return fail(m.badName('>', target.name));
    if (!canStore(text.length)) return fail(m.full('>'));
    return out([], { ops: [{ op: 'create', parentId: target.parent.id, name: withExtension(name), content: text }] });
};

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

const ALIASES = {
    dir: 'ls', type: 'cat', md: 'mkdir', copy: 'cp', move: 'mv', ren: 'mv', rename: 'mv', del: 'rm', erase: 'rm', rmdir: 'rm'
};

export const FS_COMMANDS = ['pwd', 'cd', 'ls', 'cat', 'tree', 'mkdir', 'touch', 'rm', 'mv', 'cp', ...Object.keys(ALIASES)];

const splitFlags = (args) => ({
    flags: args.filter((a) => /^-[a-z]+$/i.test(a)).join('').replace(/-/g, '').toLowerCase(),
    paths: args.filter((a) => !/^-[a-z]+$/i.test(a))
});

const listing = (nodes, folder, long, lang) =>
    sortedChildren(nodes, folder).map((n) => {
        if (!long) return n.type === 'folder' ? `${n.name}\\` : n.name;
        const tag = n.type === 'folder' ? '<DIR>' : '';
        const size = n.type === 'folder' ? '' : sizeLabel(bytesOf(n));
        const date = n.modifiedAt ? new Date(n.modifiedAt).toLocaleDateString(lang) : '';
        return `${tag.padEnd(6)}${size.padStart(9)}  ${date.padEnd(11)}${n.name}`;
    });

const treeLines = (nodes, folder, prefix = '', acc = []) => {
    const kids = sortedChildren(nodes, folder);
    kids.forEach((kid, i) => {
        if (acc.length >= TREE_LINE_LIMIT) return;
        const last = i === kids.length - 1;
        acc.push(`${prefix}${last ? '└── ' : '├── '}${kid.name}${kid.type === 'folder' ? '\\' : ''}`);
        if (kid.type === 'folder') treeLines(nodes, kid, `${prefix}${last ? '    ' : '│   '}`, acc);
    });
    return acc;
};

// Returns a result descriptor, or null when `name` is not a file-system command.
export const fsCommand = (name, args, ctx) => {
    const cmd = ALIASES[name] || name;
    if (!FS_COMMANDS.includes(name)) return null;

    const { nodes, lang } = ctx;
    const m = MSG[lang] || MSG.en;
    if (!nodes || !nodes[ROOT_ID]) return out([m.noFs(name)], { error: true });

    const cwd = nodes[ctx.cwd] ? ctx.cwd : ROOT_ID;
    const canStore = ctx.canStore || (() => true);
    const errors = [];
    const ops = [];
    const fail = (message) => errors.push(message);
    const done = (lines = [], extra = {}) => out([...lines, ...errors], { ops, ...(errors.length && !lines.length ? { error: true } : {}), ...extra });
    const { flags, paths } = splitFlags(args);

    switch (cmd) {
        case 'pwd':
            return out([pathOf(nodes, cwd)]);

        case 'cd': {
            const target = args.join(' ');
            const dest = target ? resolvePath(nodes, cwd, target) : nodes[HOME_ID];
            if (!dest) return out([m.noSuch(name, target)], { error: true });
            if (dest.type !== 'folder') return out([m.notDir(name, target)], { error: true });
            return out([], { cwd: dest.id });
        }

        case 'ls': {
            const long = name === 'dir' || flags.includes('l');
            const targets = paths.length ? paths : ['.'];
            const lines = [];
            targets.forEach((p) => {
                const node = resolvePath(nodes, cwd, p);
                if (!node) return fail(m.noSuch(name, p));
                if (targets.length > 1) lines.push(`${p}:`);
                if (node.type === 'file') {
                    lines.push(node.name);
                } else {
                    const rows = listing(nodes, node, long, lang);
                    lines.push(...(rows.length ? rows : [m.empty]));
                }
            });
            return done(lines);
        }

        case 'tree': {
            const p = paths[0] || '.';
            const node = resolvePath(nodes, cwd, p);
            if (!node) return out([m.noSuch(name, p)], { error: true });
            if (node.type !== 'folder') return out([m.notDir(name, p)], { error: true });
            const label = node.id === ROOT_ID ? 'C:\\' : `${node.name}\\`;
            return out([label, ...treeLines(nodes, node)]);
        }

        case 'cat': {
            if (!paths.length) return out([m.missing(name)], { error: true });
            const lines = [];
            paths.forEach((p) => {
                const node = resolvePath(nodes, cwd, p);
                if (!node) return fail(m.noSuch(name, p));
                if (node.type === 'folder') return fail(m.isDir(name, p));
                if (fileKind(node.name) === 'image') return fail(m.binary(node.name));
                lines.push(...String(node.content ?? '').split('\n'));
            });
            return done(lines);
        }

        case 'mkdir': {
            if (!paths.length) return out([m.missing(name)], { error: true });
            const claimed = new Set();
            paths.forEach((p) => {
                const target = splitTarget(nodes, cwd, p);
                if (!target) return fail(m.badName(name, p));
                if (!target.parent) return fail(m.noSuch(name, p));
                const clean = cleanName(target.name);
                if (!clean) return fail(m.badName(name, target.name));
                const key = `${target.parent.id}/${lower(clean)}`;
                if (childByName(nodes, target.parent, clean) || claimed.has(key)) return fail(m.exists(name, p));
                if (!canStore(clean.length + 120)) return fail(m.full(name));
                claimed.add(key);
                ops.push({ op: 'mkdir', parentId: target.parent.id, name: clean });
            });
            return done();
        }

        case 'touch': {
            if (!paths.length) return out([m.missing(name)], { error: true });
            paths.forEach((p) => {
                const existing = resolvePath(nodes, cwd, p);
                if (existing) {
                    if (existing.type === 'file') ops.push({ op: 'write', id: existing.id, content: existing.content ?? '' });
                    return;
                }
                const target = splitTarget(nodes, cwd, p);
                if (!target) return fail(m.badName(name, p));
                if (!target.parent) return fail(m.noSuch(name, p));
                const clean = cleanName(target.name);
                if (!clean) return fail(m.badName(name, target.name));
                if (!canStore(clean.length + 200)) return fail(m.full(name));
                ops.push({ op: 'create', parentId: target.parent.id, name: withExtension(clean), content: '' });
            });
            return done();
        }

        case 'rm': {
            if (!paths.length) return out([m.missing(name)], { error: true });
            const recursive = flags.includes('r') || name === 'rmdir';
            const lines = [];
            let newCwd = null;
            paths.forEach((p) => {
                const node = resolvePath(nodes, cwd, p);
                if (!node) return flags.includes('f') ? undefined : fail(m.noSuch(name, p));
                if (PROTECTED_IDS.has(node.id)) return fail(m.protectedItem(name, p));
                if (node.type === 'folder' && !recursive) return fail(m.needR(name, p));
                ops.push({ op: 'recycle', id: node.id });
                lines.push(m.trashed(node.name));
                if (isSelfOrDescendant(nodes, nodes[cwd], node.id)) newCwd = node.parentId || ROOT_ID;
            });
            return done(lines, newCwd ? { cwd: newCwd } : {});
        }

        case 'mv':
        case 'cp': {
            if (paths.length < 2) return out([m.missing(name)], { error: true });
            const destPath = paths[paths.length - 1];
            const sources = paths.slice(0, -1);
            const destNode = resolvePath(nodes, cwd, destPath);
            const destIsFolder = destNode && destNode.type === 'folder';
            if (sources.length > 1 && !destIsFolder) return out([m.manyToFile(name)], { error: true });

            let budget = 0;
            sources.forEach((p) => {
                const node = resolvePath(nodes, cwd, p);
                if (!node) return fail(m.noSuch(name, p));
                if (cmd === 'mv' && PROTECTED_IDS.has(node.id)) return fail(m.protectedItem(name, p));
                if (cmd === 'cp' && node.type === 'folder') return fail(m.noFolderCopy(name, p));

                let parent;
                let newName;
                if (destIsFolder) {
                    parent = destNode;
                    newName = node.name;
                    if (cmd === 'mv' && node.type === 'folder' && isSelfOrDescendant(nodes, destNode, node.id)) {
                        return fail(m.intoSelf(name, p));
                    }
                    if (cmd === 'mv' && node.parentId === destNode.id) return; // already there
                } else if (destNode) {
                    return fail(m.exists(name, destPath)); // would overwrite a file
                } else {
                    const target = splitTarget(nodes, cwd, destPath);
                    if (!target) return fail(m.badName(name, destPath));
                    if (!target.parent) return fail(m.noSuch(name, destPath));
                    parent = target.parent;
                    newName = cleanName(target.name);
                    if (!newName) return fail(m.badName(name, target.name));
                    if (cmd === 'mv' && node.type === 'folder' && isSelfOrDescendant(nodes, parent, node.id)) {
                        return fail(m.intoSelf(name, p));
                    }
                }
                if (childByName(nodes, parent, newName)) return fail(m.exists(name, newName));

                if (cmd === 'cp') {
                    budget += String(node.content ?? '').length;
                    ops.push({ op: 'create', parentId: parent.id, name: newName, content: node.content ?? '' });
                } else {
                    if (newName !== node.name) ops.push({ op: 'rename', id: node.id, name: newName });
                    if (parent.id !== node.parentId) ops.push({ op: 'move', id: node.id, parentId: parent.id });
                }
            });
            if (budget && !canStore(budget)) return out([m.full(name)], { error: true });
            return done();
        }

        default:
            return null;
    }
};
