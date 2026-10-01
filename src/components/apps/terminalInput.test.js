import { describe, it, expect } from 'vitest';
import { splitLine } from './shellLine';
import { pushHistory, stepHistory, formatHistory } from './terminalHistory';
import { completeInput } from './shellComplete';
import { COMMAND_NAMES } from './terminalCommands';

describe('splitLine', () => {
    it('splits on && and ; and into pipe stages', () => {
        expect(splitLine('a && b ; c | d')).toEqual([
            { stages: ['a '], op: '&&' },
            { stages: [' b '], op: ';' },
            { stages: [' c ', ' d'], op: null }
        ]);
    });

    it('keeps quoted operators and a lone empty line', () => {
        expect(splitLine('echo "x | y ; z"')).toHaveLength(1);
        expect(splitLine('')).toEqual([{ stages: [''], op: null }]);
        expect(splitLine('ls &&')).toHaveLength(1);
    });
});

describe('history', () => {
    it('pushes commands, skipping blanks and immediate repeats, and caps the size', () => {
        expect(pushHistory([], '  ')).toEqual([]);
        expect(pushHistory(['ls'], 'ls')).toEqual(['ls']);
        expect(pushHistory(['ls'], ' cd .. ')).toEqual(['ls', 'cd ..']);
        expect(pushHistory(['a', 'b'], 'c', 2)).toEqual(['b', 'c']);
    });

    it('steps up and down, restoring the line you were typing', () => {
        const list = ['one', 'two', 'three'];
        let st = { index: 3, draft: '' };
        st = stepHistory({ list, index: st.index, direction: 'up', draft: st.draft, current: 'dra' });
        expect(st).toMatchObject({ input: 'three', index: 2, draft: 'dra' });
        st = stepHistory({ list, ...st, direction: 'up', current: st.input });
        st = stepHistory({ list, ...st, direction: 'up', current: st.input });
        st = stepHistory({ list, ...st, direction: 'up', current: st.input });
        expect(st).toMatchObject({ input: 'one', index: 0 });
        st = stepHistory({ list, ...st, direction: 'down', current: st.input });
        expect(st.input).toBe('two');
        st = stepHistory({ list, ...st, direction: 'down', current: st.input });
        st = stepHistory({ list, ...st, direction: 'down', current: st.input });
        expect(st).toMatchObject({ input: 'dra', index: 3 });
    });

    it('does nothing with an empty history, and numbers the listing', () => {
        expect(stepHistory({ list: [], index: 0, direction: 'up', draft: '', current: 'x' }).input).toBe('x');
        expect(formatHistory(['a', 'b'])).toEqual(['   1  a', '   2  b']);
    });
});

describe('completeInput', () => {
    const nodes = {
        root: { id: 'root', type: 'folder', name: 'My Computer', parentId: null, children: ['documents', 'localdisk'] },
        documents: { id: 'documents', type: 'folder', name: 'My Documents', parentId: 'root', children: ['a', 'b', 'c'] },
        localdisk: { id: 'localdisk', type: 'folder', name: 'Local Disk (C:)', parentId: 'root', children: [] },
        a: { id: 'a', type: 'file', name: 'notes.txt', parentId: 'documents', content: '' },
        b: { id: 'b', type: 'file', name: 'notes-old.txt', parentId: 'documents', content: '' },
        c: { id: 'c', type: 'file', name: 'My Picture.png', parentId: 'documents', content: '' }
    };
    const env = {
        commands: COMMAND_NAMES, nodes, cwd: 'root',
        programs: [{ id: 'paint', title: 'Paint' }, { id: 'notepad', title: 'Notepad' }],
        windows: [{ id: 'notepad', title: 'Notepad' }]
    };
    const complete = (input, over = {}) => completeInput(input, { ...env, ...over });

    it('completes a unique command name and adds a space', () => {
        expect(complete('neof').input).toBe('neofetch ');
        expect(complete('taskl').input).toBe('tasklist ');
        expect(complete('tas').input).toBe('task');
    });

    it('extends to the common prefix and lists the candidates', () => {
        const r = complete('t');
        expect(r.options).toEqual(expect.arrayContaining(['tasklist', 'tree', 'touch', 'tail', 'taskkill']));
        expect(complete('ta').input).toBe('ta');
    });

    it('completes folders with a trailing backslash and quotes names with spaces', () => {
        expect(complete('cd my d').input).toBe('cd "My Documents\\');
        expect(complete('cd "My Doc').input).toBe('cd "My Documents\\');
        expect(complete('cd loc').input).toBe('cd "Local Disk (C:)\\');
    });

    it('completes files inside a folder path and closes the quote on a unique file', () => {
        expect(complete('cat "My Documents\\my p').input).toBe('cat "My Documents\\My Picture.png" ');
        expect(complete('cat my documents\\x').input).toBe('cat my documents\\x');
        expect(complete('cat ~/not', { cwd: 'root' }).input).toBe('cat ~/notes');
    });

    it('offers only folders for cd and finishes a common prefix for files', () => {
        expect(complete('cd ').options.sort()).toEqual(['Local Disk (C:)\\', 'My Documents\\']);
        const r = complete('cat "My Documents\\no');
        expect(r.input).toBe('cat "My Documents\\notes');
        expect(r.options.sort()).toEqual(['notes-old.txt', 'notes.txt']);
    });

    it('start/open also offer program names; kill offers open windows', () => {
        expect(complete('start pai').input).toBe('start paint ');
        expect(complete('kill note').input).toBe('kill notepad ');
        expect(complete('paint ghost').input).toBe('paint ghost');
    });

    it('works after && and | and after a redirect', () => {
        expect(complete('echo hi && neof').input).toBe('echo hi && neofetch ');
        expect(complete('ls | gre').input).toBe('ls | grep ');
        expect(complete('echo x > my').input).toBe('echo x > "My Documents\\');
    });

    it('does nothing when nothing matches', () => {
        expect(complete('zzz')).toEqual({ input: 'zzz', options: [] });
    });
});
