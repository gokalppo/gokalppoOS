import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { FileSystemProvider } from '../../context/FileSystemContext';
import { LanguageProvider } from '../../context/LanguageContext';
import Terminal from './Terminal';
import { setPrograms } from './programRegistry';
import { setWindows } from '../windowRegistry';
import { OPEN_APP_EVENT, OPEN_FILE_EVENT, CLOSE_APP_EVENT } from '../appBus';

const STORAGE_KEY = 'gokalppoOS_fileSystem';

beforeEach(() => {
    localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
    setPrograms([{ id: 'notepad', title: 'Notepad' }, { id: 'paint', title: 'Paint' }, { id: 'terminal', title: 'Terminal' }]);
    setWindows([{ id: 'notepad', title: 'Notepad' }]);
});
afterEach(() => cleanup());

const setup = () => render(<LanguageProvider><FileSystemProvider><Terminal /></FileSystemProvider></LanguageProvider>);
const input = () => document.querySelector('.terminal-input');
const run = (cmd) => {
    fireEvent.change(input(), { target: { value: cmd } });
    fireEvent.keyDown(input(), { key: 'Enter' });
};
const screenText = () => document.querySelector('.terminal-history').textContent;
const prompt = () => document.querySelector('.terminal-prompt').textContent;
const savedDocs = () => {
    const fs = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return fs.documents.children.map((id) => fs[id]);
};
const capture = (type) => {
    const seen = [];
    const handler = (e) => seen.push(e.detail);
    window.addEventListener(type, handler);
    return { seen, stop: () => window.removeEventListener(type, handler) };
};

describe('Terminal and the file system', () => {
    it('shows the folder in the prompt and lists My Documents like My Computer does', () => {
        setup();
        expect(prompt()).toBe('C:\\>');
        run('cd "my documents"');
        expect(prompt()).toBe('C:\\My Documents>');
        run('ls');
        expect(screenText()).toContain('Welcome.txt');
    });

    it('creates real files that persist, and cat reads them back', () => {
        setup();
        run('cd "My Documents"');
        run('echo merhaba dünya > selam.txt');
        run('mkdir projeler');
        run('cat selam.txt');
        expect(screenText()).toContain('merhaba dünya');
        const docs = savedDocs();
        expect(docs.find((n) => n.name === 'selam.txt').content).toBe('merhaba dünya');
        expect(docs.some((n) => n.name === 'projeler' && n.type === 'folder')).toBe(true);
    });

    it('mv, cp and rm change the stored file system', () => {
        setup();
        run('cd "My Documents"');
        run('cp welcome.txt kopya.txt');
        run('mv kopya.txt yeni.txt');
        run('rm welcome.txt');
        const names = savedDocs().map((n) => n.name);
        expect(names).toContain('yeni.txt');
        expect(names).not.toContain('kopya.txt');
        expect(names).not.toContain('Welcome.txt');
        const fs = JSON.parse(localStorage.getItem(STORAGE_KEY));
        expect(fs.recycle.children).toHaveLength(1);
    });
});

describe('Terminal and the desktop', () => {
    it('start opens the program through the app bus', () => {
        const { seen, stop } = capture(OPEN_APP_EVENT);
        setup();
        run('start paint');
        run('terminal');
        stop();
        expect(seen).toEqual([{ id: 'paint' }, { id: 'terminal' }]);
    });

    it('notepad <file> asks the desktop to open that file', () => {
        const { seen, stop } = capture(OPEN_FILE_EVENT);
        setup();
        run('cd "My Documents"');
        run('notepad welcome.txt');
        run('notepad brandnew');
        stop();
        expect(seen[0].name).toBe('Welcome.txt');
        expect(seen[1].name).toBe('brandnew.txt');
        expect(savedDocs().some((n) => n.name === 'brandnew.txt')).toBe(true);
    });

    it('tasklist and kill use the open windows', () => {
        const { seen, stop } = capture(CLOSE_APP_EVENT);
        setup();
        run('tasklist');
        expect(screenText()).toContain('Notepad');
        run('kill notepad');
        stop();
        expect(seen).toEqual([{ id: 'notepad' }]);
    });
});

describe('Terminal keyboard', () => {
    const key = (k, extra = {}) => fireEvent.keyDown(input(), { key: k, ...extra });

    it('Up and Down recall earlier commands and give the unfinished line back', () => {
        setup();
        run('echo one');
        run('echo two');
        fireEvent.change(input(), { target: { value: 'dra' } });
        key('ArrowUp');
        expect(input().value).toBe('echo two');
        key('ArrowUp');
        expect(input().value).toBe('echo one');
        key('ArrowDown');
        key('ArrowDown');
        expect(input().value).toBe('dra');
    });

    it('remembers commands across reloads', () => {
        const first = setup();
        run('echo kept');
        first.unmount();
        setup();
        key('ArrowUp');
        expect(input().value).toBe('echo kept');
    });

    it('Tab completes commands and file names, and lists several candidates', () => {
        setup();
        fireEvent.change(input(), { target: { value: 'neof' } });
        key('Tab');
        expect(input().value).toBe('neofetch ');
        fireEvent.change(input(), { target: { value: 'cd my d' } });
        key('Tab');
        expect(input().value).toBe('cd "My Documents\\');
        fireEvent.change(input(), { target: { value: 'ta' } });
        key('Tab');
        expect(screenText()).toContain('tasklist');
    });

    it('Ctrl+C cancels the line and Ctrl+L clears the screen', () => {
        setup();
        fireEvent.change(input(), { target: { value: 'half typed' } });
        key('c', { ctrlKey: true });
        expect(input().value).toBe('');
        expect(screenText()).toContain('half typed^C');
        key('l', { ctrlKey: true });
        expect(screenText()).not.toContain('half typed');
        expect(screenText()).not.toContain('Kernel');
    });

    it('runs chains and pipes, and the history command lists what was typed', () => {
        setup();
        run('mkdir box && cd box && echo hi > a.txt');
        expect(prompt()).toBe('C:\\box>');
        run('ls | grep txt');
        expect(screenText()).toContain('a.txt');
        run('history');
        expect(screenText()).toContain('1  mkdir box && cd box && echo hi > a.txt');
        expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).root.children).toHaveLength(3);
    });
});

describe('Terminal: streaming, sudo, themes', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    const key = (k, extra = {}) => fireEvent.keyDown(input(), { key: k, ...extra });
    const tick = (ms) => act(() => { vi.advanceTimersByTime(ms); });

    it('ping plays line by line, hides the prompt while it runs and Ctrl+C stops it', () => {
        setup();
        run('ping gokalppo.me');
        expect(document.querySelector('.terminal-input-line').className).toContain('busy');
        tick(0);
        expect(screenText()).toContain('Pinging gokalppo.me');
        expect(screenText()).not.toContain('Reply from');
        tick(460);
        expect(screenText()).toContain('Reply from');
        key('c', { ctrlKey: true });
        expect(document.querySelector('.terminal-input-line').className).not.toContain('busy');
        const before = screenText();
        tick(5000);
        expect(screenText()).toBe(before);
    });

    it('a finished stream gives the prompt back', () => {
        setup();
        run('ping gokalppo.me');
        tick(10000);
        expect(screenText()).toContain('simulation');
        expect(document.querySelector('.terminal-input-line').className).not.toContain('busy');
    });

    it('progress lines rewrite themselves instead of piling up', () => {
        setup();
        run('hack');
        tick(5000);
        const text = screenText();
        expect(text).toContain('[##########] 100%');
        expect(text).not.toContain('[#####.....] 50%');
        expect(text).toContain('Access granted');
    });

    it('sudo asks for a hidden password, refuses three times, then explains', () => {
        setup();
        run('sudo make me a sandwich');
        expect(input().type).toBe('password');
        expect(document.querySelector('.terminal-prompt').textContent).toContain('[sudo] password for guest');
        run('hunter2');
        expect(screenText()).toContain('Sorry, try again.');
        expect(screenText()).not.toContain('hunter2');
        run('letmein');
        expect(input().type).toBe('password');
        run('please');
        expect(input().type).toBe('text');
        expect(screenText()).toContain('3 incorrect password attempts');
        expect(screenText()).toContain('root privileges');
    });

    it('Ctrl+C leaves the sudo prompt', () => {
        setup();
        run('sudo ls');
        key('c', { ctrlKey: true });
        expect(input().type).toBe('text');
    });

    it('theme recolours the terminal and is remembered', () => {
        const first = setup();
        run('theme amber');
        expect(document.querySelector('.terminal-container').style.getPropertyValue('--term-fg')).toBe('#ffb000');
        first.unmount();
        setup();
        expect(document.querySelector('.terminal-container').style.getPropertyValue('--term-fg')).toBe('#ffb000');
    });

    it('sl shows the train and exit closes the window', () => {
        const { seen, stop } = capture(CLOSE_APP_EVENT);
        setup();
        run('sl');
        expect(document.querySelector('.terminal-train')).not.toBeNull();
        run('exit');
        stop();
        expect(seen).toEqual([{ id: 'terminal' }]);
    });

    it('neofetch reports real facts about this desktop', () => {
        setup();
        run('neofetch');
        const text = document.querySelector('.neofetch-container').textContent;
        expect(text).toContain('guest@gokalppo-pc');
        expect(text).toContain('Windows:');
        expect(text).toContain('Files:');
        expect(text).toMatch(/Theme:\s*green/);
    });
});
