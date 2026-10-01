import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FileSystemProvider } from '../../context/FileSystemContext';
import FileExplorer from './FileExplorer';

const KEY = 'gokalppoOS_fileSystem';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

const setup = (onOpenFile = vi.fn(), rootId = 'documents') => {
    render(<FileSystemProvider><FileExplorer rootId={rootId} onOpenFile={onOpenFile} /></FileSystemProvider>);
    return onOpenFile;
};

const addFile = (name, content) => {
    render(<FileSystemProvider><div /></FileSystemProvider>);
    cleanup();
    const fs = JSON.parse(localStorage.getItem(KEY));
    const id = `f_${name}`;
    fs[id] = { id, type: 'file', name, parentId: 'documents', content, modifiedAt: 1 };
    fs.documents.children.push(id);
    localStorage.setItem(KEY, JSON.stringify(fs));
};

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('FileExplorer file types', () => {
    it('shows pictures as thumbnails of themselves and text files with the document icon', () => {
        addFile('pic.png', PNG);
        setup();
        const icons = Object.fromEntries([...document.querySelectorAll('.fe-item')].map((el) => [
            el.querySelector('.fe-item-name').textContent, el.querySelector('img').getAttribute('src')
        ]));
        expect(icons['pic.png']).toBe(PNG);
        expect(icons['Welcome.txt']).not.toContain('data:image');
    });

    it('never uses a non-image string as a thumbnail', () => {
        addFile('bad.png', 'javascript:alert(1)');
        setup();
        const bad = [...document.querySelectorAll('.fe-item')].find((el) => el.textContent.includes('bad.png'));
        expect(bad.querySelector('img').getAttribute('src')).not.toContain('javascript');
    });

    it('hands any double-clicked file to the caller, which decides what it can open', () => {
        addFile('pic.png', PNG);
        const onOpenFile = setup();
        fireEvent.doubleClick(screen.getByText('pic.png'));
        expect(onOpenFile).toHaveBeenCalledWith(expect.objectContaining({ name: 'pic.png' }));
    });

    it('creates new items with localized default names', () => {
        setup();
        fireEvent.contextMenu(document.querySelector('.fe-body'));
        fireEvent.click(screen.getByText('New Folder', { selector: '.fe-context-item' }));
        expect(document.querySelector('.fe-rename-input').value).toBe('New Folder');
    });
});
