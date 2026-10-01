import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import { FileSystemProvider } from '../../context/FileSystemContext';
import Paint from './Paint';

const STORAGE_KEY = 'gokalppoOS_fileSystem';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

let ctx;
const makeCtx = () => ({
    fillRect: vi.fn(), clearRect: vi.fn(), fillText: vi.fn(), drawImage: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), strokeRect: vi.fn(),
    ellipse: vi.fn(), fill: vi.fn(), closePath: vi.fn(), putImageData: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4 * 700 * 480) }))
});

class FakeImage {
    constructor() { this.width = 100; this.height = 50; }
    set src(value) {
        this._src = value;
        setTimeout(() => (value.startsWith('data:image') ? this.onload?.() : this.onerror?.()), 0);
    }
    get src() { return this._src; }
}

const setup = (props = {}) => render(<FileSystemProvider><Paint {...props} /></FileSystemProvider>);
const preview = () => document.querySelector('.paint-preview-canvas');
const menu = (name) => fireEvent.click(screen.getByRole('menuitem', { name }));
const item = (name) => fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }));
const files = () => {
    const fs = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return fs.documents.children.map((id) => fs[id]);
};
const seedImage = (name, content = PNG) => {
    if (!localStorage.getItem(STORAGE_KEY)) { setup(); cleanup(); } // let the provider write the default disk first
    const fs = JSON.parse(localStorage.getItem(STORAGE_KEY));
    fs.img1 = { id: 'img1', type: 'file', name, parentId: 'documents', content, modifiedAt: 1 };
    fs.documents.children.push('img1');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fs));
};

beforeEach(() => {
    localStorage.clear();
    ctx = makeCtx();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx);
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => PNG);
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({ left: 0, top: 0, width: 700, height: 480 }));
    window.Image = FakeImage;
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const clickCanvas = (x, y) => fireEvent.mouseDown(preview(), { clientX: x, clientY: y });

describe('Paint text tool', () => {
    const useTextTool = () => fireEvent.click(screen.getByRole('button', { name: 'Text' }));

    it('shows font, size and bold options only while the Text tool is selected', () => {
        setup();
        expect(screen.queryByLabelText('Bold')).toBeNull();
        useTextTool();
        expect(screen.getByLabelText('Bold')).toBeTruthy();
        expect(screen.getByLabelText('Font')).toBeTruthy();
        expect(screen.getByLabelText('Size')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Pencil' }));
        expect(screen.queryByLabelText('Bold')).toBeNull();
    });

    it('clicking the canvas opens a text box where you click', () => {
        setup();
        useTextTool();
        clickCanvas(120, 80);
        const box = document.querySelector('.paint-text-input');
        expect(box).toBeTruthy();
        expect(box.style.left).toBe('120px');
        expect(box.style.top).toBe('80px');
        expect(document.activeElement).toBe(box);
    });

    it('Enter stamps the text onto the canvas at that spot in the chosen colour', () => {
        setup();
        useTextTool();
        fireEvent.click(screen.getByTitle('#ff0000'));
        clickCanvas(50, 60);
        const box = document.querySelector('.paint-text-input');
        fireEvent.change(box, { target: { value: 'Hello' } });
        fireEvent.keyDown(box, { key: 'Enter' });

        expect(ctx.fillText).toHaveBeenCalledWith('Hello', 50, 60);
        expect(ctx.fillStyle).toBe('#ff0000');
        expect(document.querySelector('.paint-text-input')).toBeNull();
    });

    it('Shift+Enter makes a new line and each line is drawn below the last', () => {
        setup();
        useTextTool();
        clickCanvas(10, 10);
        const box = document.querySelector('.paint-text-input');
        fireEvent.change(box, { target: { value: 'one\ntwo' } });
        fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
        expect(document.querySelector('.paint-text-input')).toBeTruthy(); // still editing
        fireEvent.keyDown(box, { key: 'Enter' });
        expect(ctx.fillText).toHaveBeenCalledTimes(2);
        expect(ctx.fillText.mock.calls[1][2]).toBeGreaterThan(ctx.fillText.mock.calls[0][2]);
    });

    it('uses the selected font size and bold', () => {
        setup();
        useTextTool();
        fireEvent.change(screen.getByLabelText('Size'), { target: { value: '36' } });
        fireEvent.click(screen.getByLabelText('Bold'));
        clickCanvas(5, 5);
        const box = document.querySelector('.paint-text-input');
        fireEvent.change(box, { target: { value: 'Big' } });
        fireEvent.keyDown(box, { key: 'Enter' });
        expect(ctx.font).toMatch(/^bold 36px/);
    });

    it('Escape cancels without drawing', () => {
        setup();
        useTextTool();
        clickCanvas(5, 5);
        const box = document.querySelector('.paint-text-input');
        fireEvent.change(box, { target: { value: 'nope' } });
        fireEvent.keyDown(box, { key: 'Escape' });
        expect(ctx.fillText).not.toHaveBeenCalled();
        expect(document.querySelector('.paint-text-input')).toBeNull();
    });

    it('an empty box disappears without drawing anything', () => {
        setup();
        useTextTool();
        clickCanvas(5, 5);
        fireEvent.blur(document.querySelector('.paint-text-input'));
        expect(ctx.fillText).not.toHaveBeenCalled();
    });

    it('clicking somewhere else commits the first text and starts a new box', () => {
        setup();
        useTextTool();
        clickCanvas(10, 10);
        fireEvent.change(document.querySelector('.paint-text-input'), { target: { value: 'first' } });
        clickCanvas(200, 200);
        expect(ctx.fillText).toHaveBeenCalledWith('first', 10, 10);
        expect(document.querySelector('.paint-text-input').style.left).toBe('200px');
    });

    it('the text counts as one undoable step', () => {
        setup();
        useTextTool();
        const before = HTMLCanvasElement.prototype.toDataURL.mock.calls.length;
        clickCanvas(5, 5);
        const box = document.querySelector('.paint-text-input');
        fireEvent.change(box, { target: { value: 'x' } });
        fireEvent.keyDown(box, { key: 'Enter' });
        expect(HTMLCanvasElement.prototype.toDataURL.mock.calls.length).toBe(before + 1);
    });
});

describe('Paint files', () => {
    it('Save As stores the picture as a .png in My Documents', () => {
        setup();
        menu('File'); item('Save As...');
        fireEvent.change(document.querySelector('#fd-name'), { target: { value: 'my art' } });
        fireEvent.click(screen.getByText('Save', { selector: '.fd-btn' }));
        const saved = files().find((f) => f.name === 'my art.png');
        expect(saved).toBeTruthy();
        expect(saved.content).toBe(PNG);
        expect(screen.getByText(/Saved to My Documents/)).toBeTruthy();
    });

    it('a second Save updates the same file (no duplicate)', () => {
        setup();
        menu('File'); item('Save As...');
        fireEvent.click(screen.getByText('Save', { selector: '.fd-btn' }));
        HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,QUJD');
        fireEvent.keyDown(document.querySelector('.paint-container'), { key: 's', ctrlKey: true });
        const pngs = files().filter((f) => f.name.endsWith('.png'));
        expect(pngs).toHaveLength(1);
        expect(pngs[0].content).toBe('data:image/png;base64,QUJD');
    });

    it('refuses to save when the virtual disk is full', () => {
        setup();
        HTMLCanvasElement.prototype.toDataURL = vi.fn(() => `data:image/png;base64,${'A'.repeat(4_000_000)}`);
        menu('File'); item('Save As...');
        fireEvent.click(screen.getByText('Save', { selector: '.fd-btn' }));
        expect(screen.getByRole('alert').textContent).toMatch(/Not enough space/);
        expect(files().some((f) => f.name.endsWith('.png'))).toBe(false);
    });

    it('Open lists pictures only and loads the chosen one onto the canvas', async () => {
        seedImage('sunset.png');
        setup();
        menu('File'); item('Open...');
        fireEvent.doubleClick(screen.getByText('My Documents'));
        fireEvent.doubleClick(screen.getByText('Welcome.txt')); // a text file: ignored
        expect(screen.getByRole('dialog', { name: 'Open Picture' })).toBeTruthy();
        fireEvent.doubleClick(screen.getByText('sunset.png'));
        await waitFor(() => expect(ctx.drawImage).toHaveBeenCalled());
        expect(screen.getByText('sunset.png')).toBeTruthy(); // now the current file
    });

    it('opens the picture it was launched with from My Computer', async () => {
        seedImage('logo.png');
        setup({ initialFileId: 'img1' });
        await waitFor(() => expect(ctx.drawImage).toHaveBeenCalled());
        expect(screen.getByText('logo.png')).toBeTruthy();
    });

    it('never loads something that is not a real image data URL', async () => {
        seedImage('evil.png', 'javascript:alert(1)');
        setup({ initialFileId: 'img1' });
        await waitFor(() => expect(screen.getByText(/Could not open that picture/)).toBeTruthy());
        expect(ctx.drawImage).not.toHaveBeenCalled();
    });

    it('New clears the canvas and detaches from the file', async () => {
        seedImage('logo.png');
        setup({ initialFileId: 'img1' });
        await waitFor(() => expect(screen.getByText('logo.png')).toBeTruthy());
        ctx.fillRect.mockClear();
        menu('File'); item('New');
        expect(ctx.fillRect).toHaveBeenCalled();
        expect(screen.getByText(/Untitled\.png/)).toBeTruthy();
    });
});

describe('Paint basics still work', () => {
    it('has the original drawing tools plus the new one', () => {
        setup();
        for (const name of ['Pencil', 'Eraser', 'Line', 'Rectangle', 'Filled Rectangle', 'Ellipse', 'Filled Ellipse', 'Fill', 'Text']) {
            expect(screen.getByRole('button', { name })).toBeTruthy();
        }
    });

    it('the pencil still draws on mouse down + move', () => {
        setup();
        fireEvent.mouseDown(preview(), { clientX: 10, clientY: 10 });
        act(() => { window.dispatchEvent(new MouseEvent('mousemove', { clientX: 30, clientY: 40 })); });
        act(() => { window.dispatchEvent(new MouseEvent('mouseup', { clientX: 30, clientY: 40 })); });
        expect(ctx.lineTo).toHaveBeenCalledWith(30, 40);
    });
});
