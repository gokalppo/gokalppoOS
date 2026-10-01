import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { FileSystemProvider } from '../../context/FileSystemContext';
import Notepad from './Notepad';

const STORAGE_KEY = 'gokalppoOS_fileSystem';

const setup = (props = {}) => render(<FileSystemProvider><Notepad {...props} /></FileSystemProvider>);
const area = () => document.querySelector('.notepad-textarea');
const type = (value) => fireEvent.change(area(), { target: { value } });
const menu = (name) => fireEvent.click(screen.getByRole('menuitem', { name }));
const escapeRe = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const item = (name) => fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(`^${escapeRe(name)}`) }));
const selection = () => [area().selectionStart, area().selectionEnd];
const savedFiles = () => {
    const fs = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return fs.documents.children.map((id) => fs[id]);
};

beforeEach(() => {
    localStorage.clear();
    window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 5)); });

describe('Notepad menus', () => {
    it('has File, Edit, Search and Help menus that actually open', () => {
        setup();
        for (const name of ['File', 'Edit', 'Search', 'Help']) expect(screen.getByRole('menuitem', { name })).toBeTruthy();
        menu('Edit');
        for (const label of ['Undo', 'Cut', 'Copy', 'Paste', 'Select All', 'Time/Date', '✓ Word Wrap']) {
            expect(screen.getByRole('menuitem', { name: new RegExp(`^${escapeRe(label)}`) })).toBeTruthy();
        }
        menu('Search');
        expect(screen.getByRole('menuitem', { name: /^Find\.\.\./ })).toBeTruthy();
        expect(screen.getByRole('menuitem', { name: /^Replace\.\.\./ })).toBeTruthy();
    });

    it('moves between open menus with the arrow keys and closes with Escape', () => {
        setup();
        menu('File');
        fireEvent.keyDown(screen.getByRole('menubar'), { key: 'ArrowRight' });
        expect(screen.getByRole('menu', { name: 'Edit' })).toBeTruthy();
        fireEvent.keyDown(screen.getByRole('menubar'), { key: 'Escape' });
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('Select All selects the whole text', () => {
        setup();
        type('hello world');
        menu('Edit');
        item('Select All');
        expect(selection()).toEqual([0, 11]);
    });

    it('Time/Date inserts a stamp at the caret', () => {
        setup();
        type('A B');
        area().setSelectionRange(1, 1);
        menu('Edit');
        item('Time/Date');
        expect(area().value.startsWith('A')).toBe(true);
        expect(area().value).toMatch(/\d{4}/);
        expect(area().value.endsWith(' B')).toBe(true);
    });

    it('Word Wrap can be switched off and on', () => {
        setup();
        expect(area().getAttribute('wrap')).toBe('soft');
        menu('Edit');
        item('✓ Word Wrap');
        expect(area().getAttribute('wrap')).toBe('off');
        expect(area().classList.contains('nowrap')).toBe(true);
    });

    it('Copy puts the selection on the clipboard; Cut also removes it', async () => {
        const writeText = vi.fn(() => Promise.resolve());
        Object.assign(navigator, { clipboard: { writeText, readText: vi.fn(() => Promise.resolve('PASTED')) } });
        setup();
        type('abcdef');
        area().setSelectionRange(1, 4);
        menu('Edit'); item('Copy'); await flush();
        expect(writeText).toHaveBeenCalledWith('bcd');
        expect(area().value).toBe('abcdef');

        area().setSelectionRange(1, 4);
        menu('Edit'); item('Cut'); await flush();
        expect(area().value).toBe('aef');
    });

    it('Paste inserts clipboard text, and explains when the browser blocks it', async () => {
        Object.assign(navigator, { clipboard: { writeText: vi.fn(), readText: vi.fn(() => Promise.resolve('XYZ')) } });
        setup();
        type('ab');
        area().setSelectionRange(1, 1);
        menu('Edit'); item('Paste'); await flush();
        expect(area().value).toBe('aXYZb');

        navigator.clipboard.readText = vi.fn(() => Promise.reject(new Error('denied')));
        menu('Edit'); item('Paste'); await flush();
        expect(screen.getByText(/Press Ctrl\+V instead/)).toBeTruthy();
    });
});

describe('Notepad find', () => {
    it('opens with Ctrl+F, seeds the box from the selection and counts matches', () => {
        setup();
        type('one two one two one');
        area().setSelectionRange(0, 3);
        fireEvent.keyDown(area(), { key: 'f', ctrlKey: true });
        expect(screen.getByLabelText('Find what:').value).toBe('one');
        expect(screen.getByText('Matches: 3')).toBeTruthy();
    });

    it('Find Next walks through the matches and wraps around', () => {
        setup();
        type('one two one two one');
        menu('Search'); item('Find...');
        fireEvent.change(screen.getByLabelText('Find what:'), { target: { value: 'one' } });

        fireEvent.click(screen.getByText('Find Next', { selector: 'button' }));
        expect(selection()).toEqual([0, 3]);
        fireEvent.click(screen.getByText('Find Next', { selector: 'button' }));
        expect(selection()).toEqual([8, 11]);
        fireEvent.click(screen.getByText('Find Next', { selector: 'button' }));
        expect(selection()).toEqual([16, 19]);
        fireEvent.click(screen.getByText('Find Next', { selector: 'button' }));
        expect(selection()).toEqual([0, 3]);
    });

    it('F3 repeats the search; Enter in the box finds too', () => {
        setup();
        type('a b a b');
        menu('Search'); item('Find...');
        const box = screen.getByLabelText('Find what:');
        fireEvent.change(box, { target: { value: 'a' } });
        fireEvent.keyDown(box, { key: 'Enter' });
        expect(selection()).toEqual([0, 1]);
        fireEvent.keyDown(area(), { key: 'F3' });
        expect(selection()).toEqual([4, 5]);
    });

    it('is case-insensitive unless Match case is ticked', () => {
        setup();
        type('Cat cat');
        menu('Search'); item('Find...');
        fireEvent.change(screen.getByLabelText('Find what:'), { target: { value: 'cat' } });
        expect(screen.getByText('Matches: 2')).toBeTruthy();
        fireEvent.click(screen.getByLabelText('Match case'));
        expect(screen.getByText('Matches: 1')).toBeTruthy();
    });

    it('says when there is nothing to find, and treats special characters literally', () => {
        setup();
        type('price (5) [ok]');
        menu('Search'); item('Find...');
        const box = screen.getByLabelText('Find what:');
        fireEvent.change(box, { target: { value: 'zzz' } });
        expect(screen.getByText('No matches')).toBeTruthy();
        fireEvent.click(screen.getByText('Find Next', { selector: 'button' }));
        expect(screen.getByText('Cannot find "zzz"')).toBeTruthy();

        fireEvent.change(box, { target: { value: '(5)' } });
        expect(screen.getByText('Matches: 1')).toBeTruthy();
    });

    it('Escape closes the find panel', () => {
        setup();
        menu('Search'); item('Find...');
        expect(screen.getByRole('dialog', { name: 'Find...' })).toBeTruthy();
        fireEvent.keyDown(screen.getByLabelText('Find what:'), { key: 'Escape' });
        expect(screen.queryByRole('dialog', { name: 'Find...' })).toBeNull();
    });
});

describe('Notepad replace', () => {
    const openReplace = (find, replacement) => {
        menu('Search'); item('Replace...');
        fireEvent.change(screen.getByLabelText('Find what:'), { target: { value: find } });
        fireEvent.change(screen.getByLabelText('Replace with:'), { target: { value: replacement } });
    };

    it('Ctrl+H opens the replace panel', () => {
        setup();
        fireEvent.keyDown(area(), { key: 'h', ctrlKey: true });
        expect(screen.getByLabelText('Replace with:')).toBeTruthy();
    });

    it('Replace All changes every match and reports the count', () => {
        setup();
        type('a-b-a-b-a');
        openReplace('a', 'XX');
        fireEvent.click(screen.getByText('Replace All'));
        expect(area().value).toBe('XX-b-XX-b-XX');
        expect(screen.getByText('Replaced 3 occurrence(s)')).toBeTruthy();
    });

    it('Replace All respects Match case and can delete text', () => {
        setup();
        type('Cat cat CAT');
        openReplace('cat', '');
        fireEvent.click(screen.getByLabelText('Match case'));
        fireEvent.click(screen.getByText('Replace All'));
        expect(area().value).toBe('Cat  CAT');
    });

    it('Replace swaps the selected match and jumps to the next one', async () => {
        setup();
        type('one two one');
        openReplace('one', 'ONE');
        fireEvent.click(screen.getByText('Replace', { selector: 'button' })); // finds the first
        expect(selection()).toEqual([0, 3]);
        fireEvent.click(screen.getByText('Replace', { selector: 'button' })); // replaces it, selects the next
        await flush();
        expect(area().value).toBe('ONE two one');
        expect(selection()).toEqual([8, 11]);
    });

    it('does nothing when the find box is empty', () => {
        setup();
        type('abc');
        menu('Search'); item('Replace...');
        expect(screen.getByText('Replace All').disabled).toBe(true);
    });
});

describe('Notepad files', () => {
    it('Save As writes a .txt into My Documents and Save updates it', () => {
        setup();
        type('first draft');
        menu('File'); item('Save As...');
        fireEvent.change(document.querySelector('#fd-name'), { target: { value: 'ideas' } });
        fireEvent.click(screen.getByText('Save', { selector: '.fd-btn' }));
        expect(savedFiles().some((f) => f.name === 'ideas.txt' && f.content === 'first draft')).toBe(true);
        expect(screen.getByText('Saved')).toBeTruthy();

        type('second draft');
        fireEvent.keyDown(area(), { key: 's', ctrlKey: true });
        expect(savedFiles().find((f) => f.name === 'ideas.txt').content).toBe('second draft');
    });

    it('saving under an existing name replaces that file instead of duplicating it', () => {
        setup();
        type('v1');
        menu('File'); item('Save As...');
        fireEvent.change(document.querySelector('#fd-name'), { target: { value: 'Welcome.txt' } });
        expect(screen.getByText(/will be replaced/)).toBeTruthy();
        fireEvent.click(screen.getByText('Replace', { selector: '.fd-btn' }));

        const welcomes = savedFiles().filter((f) => f.name.toLowerCase() === 'welcome.txt');
        expect(welcomes).toHaveLength(1);
        expect(welcomes[0].content).toBe('v1');
    });

    it('refuses to save when the virtual disk is full', () => {
        setup();
        type('x'.repeat(4_000_000));
        menu('File'); item('Save As...');
        fireEvent.click(screen.getByText('Save', { selector: '.fd-btn' }));
        expect(screen.getByRole('alert').textContent).toMatch(/Not enough space/);
        expect(savedFiles().some((f) => f.name === 'Untitled.txt')).toBe(false);
    });

    it('opens a text file chosen in the Open dialog', () => {
        setup();
        menu('File'); item('Open...');
        fireEvent.doubleClick(screen.getByText('My Documents'));
        fireEvent.doubleClick(screen.getByText('Welcome.txt'));
        expect(area().value).toMatch(/hoş geldin/);
        expect(screen.queryByRole('dialog', { name: 'Open' })).toBeNull();
    });

    it('starts with the content of the file it was opened with', () => {
        setup({ initialFileId: 'welcome' });
        expect(area().value).toMatch(/gokalppoOS/);
        expect(screen.getByText('Welcome.txt')).toBeTruthy();
    });

    it('New clears the page', () => {
        setup({ initialFileId: 'welcome' });
        menu('File'); item('New');
        expect(area().value).toBe('');
    });
});
