import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
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
