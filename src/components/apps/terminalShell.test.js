import { describe, it, expect } from 'vitest';
import { executeCommand, executeLine, promptFor } from './terminalCommands';
import { tokenize, resolvePath, pathOf, applyOpsToNodes } from './shellFs';

const makeFS = () => ({
    root: { id: 'root', type: 'folder', name: 'My Computer', parentId: null, children: ['documents', 'localdisk'] },
    documents: { id: 'documents', type: 'folder', name: 'My Documents', parentId: 'root', children: ['welcome', 'pic'] },
    localdisk: { id: 'localdisk', type: 'folder', name: 'Local Disk (C:)', parentId: 'root', children: [] },
    welcome: { id: 'welcome', type: 'file', name: 'Welcome.txt', parentId: 'documents', content: 'hello\nworld', modifiedAt: 1 },
    pic: { id: 'pic', type: 'file', name: 'drawing.png', parentId: 'documents', content: 'data:image/png;base64,AAAA', modifiedAt: 1 },
    recycle: { id: 'recycle', type: 'folder', name: 'Recycle Bin', parentId: null, children: [] }
});

const PROGRAMS = [
    { id: 'mycomputer', title: 'My Computer' },
    { id: 'notepad', title: 'Notepad' },
    { id: 'paint', title: 'Paint' },
    { id: 'internetexplorer', title: 'Internet Explorer' },
    { id: 'terminal', title: 'Terminal' }
];

// A tiny stand-in for the Terminal + FileSystemContext so multi-step scenarios can be tested end to end.
const session = (lang = 'en', windows = []) => {
    let nodes = makeFS();
    let cwd = 'root';
    const opened = [];
    const history = [];
    const runLine = (cmd) => {
        history.push(cmd);
        const results = executeLine(cmd, new Date(), lang, { programs: PROGRAMS, windows, nodes, cwd, canStore: () => true, history });
        results.forEach((result) => {
            (result.ops || []).forEach((op) => {
                if (op.op === 'open' || (op.op === 'create' && op.open)) opened.push(op.id);
            });
            nodes = applyOpsToNodes(nodes, result.ops);
            if (result.cwd) cwd = result.cwd;
        });
        return results;
    };
    const run = (cmd) => runLine(cmd).at(-1);
    return { run, runLine, opened, get nodes() { return nodes; }, get cwd() { return cwd; } };
};

const names = (s, folderId) => s.nodes[folderId].children.map((id) => s.nodes[id].name);

describe('tokenize', () => {
    it('splits words, keeps their case and honours quotes', () => {
        expect(tokenize('cat "My Notes.txt" Two').words).toEqual(['cat', 'My Notes.txt', 'Two']);
        expect(tokenize("echo it's fine").words).toEqual(['echo', "it's", 'fine']);
    });

    it('pulls out a redirect, attached or spaced', () => {
        expect(tokenize('echo hi > a.txt')).toMatchObject({ words: ['echo', 'hi'], redirect: { mode: '>', target: 'a.txt' } });
        expect(tokenize('echo hi>>a.txt').redirect).toEqual({ mode: '>>', target: 'a.txt' });
        expect(tokenize('echo "a > b"').redirect).toBeNull();
        expect(tokenize('echo hi >').dangling).toBe(true);
    });
});

describe('paths and prompt', () => {
    it('resolves relative, absolute, drive and ~ paths case-insensitively', () => {
        const nodes = makeFS();
        expect(resolvePath(nodes, 'root', 'my documents').id).toBe('documents');
        expect(resolvePath(nodes, 'documents', '..').id).toBe('root');
        expect(resolvePath(nodes, 'localdisk', 'C:\\My Documents\\welcome.TXT').id).toBe('welcome');
        expect(resolvePath(nodes, 'localdisk', '~/Welcome.txt').id).toBe('welcome');
        expect(resolvePath(nodes, 'root', 'nope')).toBeNull();
        expect(resolvePath(nodes, 'root', '..').id).toBe('root');
    });

    it('draws a DOS-style prompt', () => {
        const nodes = makeFS();
        expect(pathOf(nodes, 'root')).toBe('C:\\');
        expect(promptFor(nodes, 'documents')).toBe('C:\\My Documents>');
        expect(promptFor(nodes, 'missing')).toBe('C:\\>');
    });
});

describe('navigation and reading', () => {
    it('cd / pwd / ls follow the real file system', () => {
        const s = session();
        expect(s.run('ls').lines).toEqual(['Local Disk (C:)\\', 'My Documents\\']);
        s.run('cd my documents');
        expect(s.cwd).toBe('documents');
        expect(s.run('pwd').lines).toEqual(['C:\\My Documents']);
        expect(s.run('ls').lines).toEqual(['drawing.png', 'Welcome.txt']);
        s.run('cd ..');
        expect(s.cwd).toBe('root');
        s.run('cd');
        expect(s.cwd).toBe('documents');
    });

    it('reports a missing or non-folder target for cd', () => {
        const s = session();
        expect(s.run('cd nowhere')).toMatchObject({ error: true });
        s.run('cd "My Documents"');
        expect(s.run('cd Welcome.txt').lines[0]).toMatch(/Not a directory/);
    });

    it('ls -l shows sizes and folders', () => {
        const s = session();
        s.run('cd "My Documents"');
        const lines = s.run('ls -l').lines;
        expect(lines.some((l) => l.includes('Welcome.txt') && l.includes('11 B'))).toBe(true);
        expect(s.run('ls -l ..').lines[0]).toContain('<DIR>');
    });

    it('cat prints text, refuses folders and points pictures to Paint', () => {
        const s = session();
        s.run('cd "My Documents"');
        expect(s.run('cat welcome.txt').lines).toEqual(['hello', 'world']);
        expect(s.run('cat drawing.png').lines[0]).toMatch(/paint drawing\.png/);
        expect(s.run('cat ..').lines[0]).toMatch(/Is a folder/);
        expect(s.run('cat nope.txt')).toMatchObject({ error: true });
    });

    it('tree draws the hierarchy', () => {
        const s = session();
        expect(s.run('tree').lines).toEqual([
            'C:\\',
            '├── Local Disk (C:)\\',
            '└── My Documents\\',
            '    ├── drawing.png',
            '    └── Welcome.txt'
        ]);
        expect(s.run('tree').lines[0]).toBe('C:\\');
        expect(s.run('tree').lines).toContain('    └── Welcome.txt');
    });
});

describe('changing files', () => {
    it('mkdir and touch create things (touch adds .txt when there is no extension)', () => {
        const s = session();
        s.run('cd "My Documents"');
        s.run('mkdir stuff');
        s.run('touch notes');
        s.run('touch todo.txt');
        expect(names(s, 'documents')).toEqual(expect.arrayContaining(['stuff', 'notes.txt', 'todo.txt']));
        expect(s.run('mkdir stuff')).toMatchObject({ error: true });
        expect(s.run('mkdir "bad:name"')).toMatchObject({ error: true });
        expect(s.run('mkdir')).toMatchObject({ error: true });
    });

    it('echo with > and >> writes and appends', () => {
        const s = session();
        s.run('cd "My Documents"');
        s.run('echo Hello World > hi.txt');
        expect(s.run('cat hi.txt').lines).toEqual(['Hello World']);
        s.run('echo second line >> hi.txt');
        expect(s.run('cat hi.txt').lines).toEqual(['Hello World', 'second line']);
        s.run('echo fresh > hi.txt');
        expect(s.run('cat hi.txt').lines).toEqual(['fresh']);
    });

    it('any text command can be redirected, errors are not', () => {
        const s = session();
        s.run('ls > listing.txt');
        expect(s.run('cat listing.txt').lines).toEqual(['Local Disk (C:)\\', 'My Documents\\']);
        const bad = s.run('cat missing.txt > out.txt');
        expect(bad.error).toBe(true);
        expect(names(s, 'root')).not.toContain('out.txt');
        expect(s.run('echo hi >')).toMatchObject({ error: true });
    });

    it('cannot redirect into a folder or over a picture', () => {
        const s = session();
        expect(s.run('echo x > "My Documents"')).toMatchObject({ error: true });
        s.run('cd "My Documents"');
        expect(s.run('echo x > drawing.png')).toMatchObject({ error: true });
    });

    it('cp copies files and refuses to overwrite or copy folders', () => {
        const s = session();
        s.run('cd "My Documents"');
        s.run('cp welcome.txt copy.txt');
        expect(s.run('cat copy.txt').lines).toEqual(['hello', 'world']);
        expect(s.run('cp welcome.txt copy.txt')).toMatchObject({ error: true });
        s.run('mkdir box');
        s.run('cp welcome.txt box');
        expect(names(s, s.nodes.documents.children.find((id) => s.nodes[id].name === 'box'))).toEqual(['Welcome.txt']);
        expect(s.run('cp .. x')).toMatchObject({ error: true });
    });

    it('mv renames and moves, and cannot move a folder into itself', () => {
        const s = session();
        s.run('cd "My Documents"');
        s.run('mv welcome.txt readme.txt');
        expect(names(s, 'documents')).toContain('readme.txt');
        s.run('mv readme.txt "C:\\Local Disk (C:)"');
        expect(names(s, 'localdisk')).toEqual(['readme.txt']);
        expect(names(s, 'documents')).not.toContain('readme.txt');
        s.run('mkdir a');
        expect(s.run('mv a a')).toMatchObject({ error: true });
        expect(s.run('mv "..\\My Documents" a')).toMatchObject({ error: true }); // protected system folder
    });

    it('rm sends things to the Recycle Bin; folders need -r; system folders are protected', () => {
        const s = session();
        s.run('cd "My Documents"');
        expect(s.run('rm welcome.txt').lines[0]).toMatch(/Recycle Bin/);
        expect(s.nodes.recycle.children).toEqual(['welcome']);
        s.run('mkdir box');
        expect(s.run('rm box').lines[0]).toMatch(/use -r/);
        s.run('rm -r box');
        expect(s.nodes.recycle.children).toHaveLength(2);
        expect(s.run('rm ..\\"My Documents"')).toMatchObject({ error: true });
        expect(s.run('rm -f ghost.txt').lines).toEqual([]);
    });

    it('rm of the folder you are standing in moves you out of it', () => {
        const s = session();
        s.run('mkdir box');
        s.run('cd box');
        s.run('rm -r ..\\box');
        expect(s.cwd).toBe('root');
    });

    it('answers in Turkish', () => {
        const s = session('tr');
        expect(s.run('cd yok').lines[0]).toMatch(/Böyle bir dosya/);
        expect(s.run('rm').lines[0]).toMatch(/eksik/);
    });

    it('stops writes when the disk is full', () => {
        const nodes = makeFS();
        const result = executeCommand('echo hi > a.txt', new Date(), 'en', { nodes, cwd: 'root', canStore: () => false });
        expect(result.error).toBe(true);
        expect(result.lines[0]).toMatch(/full/);
    });
});

describe('programs', () => {
    it('start / open launch programs by name, id or alias', () => {
        const s = session();
        expect(s.run('start paint').appId).toBe('paint');
        expect(s.run('start "Internet Explorer"').appId).toBe('internetexplorer');
        expect(s.run('start ie').appId).toBe('internetexplorer');
        expect(s.run('open Notepad.exe').appId).toBe('notepad');
        expect(s.run('start explorer').appId).toBe('mycomputer');
    });

    it('a program name works as a command, with a file for notepad/paint', () => {
        const s = session();
        expect(s.run('paint').appId).toBe('paint');
        s.run('cd "My Documents"');
        s.run('notepad welcome.txt');
        s.run('paint drawing.png');
        expect(s.opened).toEqual(['welcome', 'pic']);
        expect(s.run('notepad drawing.png').lines[0]).toMatch(/Not a text file/);
        expect(s.run('paint welcome.txt').lines[0]).toMatch(/Not a picture/);
        expect(s.run('paint ghost.png')).toMatchObject({ error: true });
    });

    it('notepad creates a missing text file and opens it', () => {
        const s = session();
        s.run('cd "My Documents"');
        const result = s.run('notepad fresh');
        expect(result.lines[0]).toBe('Created fresh.txt');
        expect(names(s, 'documents')).toContain('fresh.txt');
        expect(s.opened).toHaveLength(1);
    });

    it('start opens files by their type and rejects unknown things', () => {
        const s = session();
        s.run('cd "My Documents"');
        s.run('start welcome.txt');
        s.run('start drawing.png');
        expect(s.opened).toEqual(['welcome', 'pic']);
        expect(s.run('start nothing')).toMatchObject({ error: true });
        expect(s.run('start')).toMatchObject({ error: true });
        expect(s.run('start ..').lines[0]).toMatch(/Is a folder/);
    });

    it('built-in commands win over program names', () => {
        const s = session();
        expect(s.run('resume').type).toBe('open');
        expect(s.run('terminal').appId).toBe('terminal');
    });

    it('tasklist lists open windows and kill closes one by name or PID', () => {
        const windows = [
            { id: 'terminal', title: 'Terminal' },
            { id: 'notepad', title: 'Notepad', isMinimized: true },
            { id: 'paint', title: 'Paint', isClosing: true }
        ];
        const s = session('en', windows);
        const list = s.run('tasklist').lines.join('\n');
        expect(list).toContain('Terminal');
        expect(list).toContain('Minimized');
        expect(list).not.toContain('Paint');
        expect(s.run('kill notepad').closeIds).toEqual(['notepad']);
        expect(s.run('taskkill 1000').closeIds).toEqual(['terminal']);
        expect(s.run('kill paint')).toMatchObject({ error: true });
        expect(s.run('kill')).toMatchObject({ error: true });
        expect(session().run('tasklist').lines).toEqual(['No windows are open.']);
    });
});

describe('chaining and pipes', () => {
    it('&& runs the next command only after a success, ; always continues', () => {
        const s = session();
        s.runLine('mkdir box && cd box && echo hi > a.txt');
        expect(s.nodes[s.cwd].name).toBe('box');
        expect(names(s, s.cwd)).toEqual(['a.txt']);

        const failed = session();
        const results = failed.runLine('cd nowhere && mkdir never');
        expect(results).toHaveLength(1);
        expect(results[0].error).toBe(true);
        expect(names(failed, 'root')).not.toContain('never');

        const always = session();
        always.runLine('cd nowhere ; mkdir yes');
        expect(names(always, 'root')).toContain('yes');
    });

    it('prints every segment in order and ignores operators inside quotes', () => {
        const s = session();
        expect(s.runLine('echo one && echo two').map((r) => r.lines[0])).toEqual(['one', 'two']);
        expect(s.runLine('echo "a && b"').map((r) => r.lines[0])).toEqual(['a && b']);
        expect(s.runLine('echo hi &&')).toHaveLength(1);
    });

    it('pipes one command into a filter', () => {
        const s = session();
        s.run('cd "My Documents"');
        expect(s.run('ls | grep txt').lines).toEqual(['Welcome.txt']);
        expect(s.run('ls | grep -c .').lines).toEqual(['2']);
        expect(s.run('ls | sort -r | head -n 1').lines).toEqual(['Welcome.txt']);
        expect(s.run('ls | wc -l').lines).toEqual(['2']);
        expect(s.run('cat welcome.txt | tail -n 1').lines).toEqual(['world']);
    });

    it('a pipe can end in a redirect', () => {
        const s = session();
        s.run('cd "My Documents"');
        s.run('ls | grep png > pics.txt');
        expect(s.run('cat pics.txt').lines).toEqual(['drawing.png']);
    });

    it('stops a pipeline when an early stage fails', () => {
        const s = session();
        const result = s.run('cat nope.txt | grep x');
        expect(result.error).toBe(true);
        expect(result.lines[0]).toMatch(/No such file/);
    });

    it('filters read files directly too', () => {
        const s = session();
        s.run('cd "My Documents"');
        expect(s.run('grep -n world welcome.txt').lines).toEqual(['2:world']);
        expect(s.run('grep -i HELLO welcome.txt').lines).toEqual(['hello']);
        expect(s.run('grep -v hello welcome.txt').lines).toEqual(['world']);
        expect(s.run('head -1 welcome.txt').lines).toEqual(['hello']);
        expect(s.run('wc welcome.txt').lines).toEqual(['2 2 11']);
        expect(s.run('grep x')).toMatchObject({ error: true });
        expect(s.run('grep')).toMatchObject({ error: true });
        expect(s.run('grep x drawing.png')).toMatchObject({ error: true });
    });

    it('history lists the commands typed so far', () => {
        const s = session();
        s.runLine('echo a');
        s.runLine('echo b');
        expect(s.run('history').lines).toEqual(['   1  echo a', '   2  echo b', '   3  history']);
    });
});
