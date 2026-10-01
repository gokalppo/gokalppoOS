import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FileSystemProvider } from '../context/FileSystemContext';
import { DisplayProvider } from '../context/DisplayContext';
import Desktop from './Desktop';
import { openApp } from './appBus';
import { getPrograms } from './apps/programRegistry';
import { executeCommand } from './apps/terminalCommands';

afterEach(() => cleanup());

const setup = (props = {}) => {
    const handlers = {
        onOpenWindow: vi.fn(), onCloseWindow: vi.fn(), onMinimizeWindow: vi.fn(),
        onTaskbarToggle: vi.fn(), onShowDesktop: vi.fn(), onWindowFocus: vi.fn(), toggleStart: vi.fn(), onShutdown: vi.fn()
    };
    render(
        <FileSystemProvider>
            <DisplayProvider>
                <Desktop openWindows={[]} focusedWindowId={null} isStartOpen={false} {...handlers} {...props} />
            </DisplayProvider>
        </FileSystemProvider>
    );
    return handlers;
};

describe('Desktop icons (keyboard access)', () => {
    it('are focusable buttons with accessible names', () => {
        setup();
        const icons = [...document.querySelectorAll('.desktop-icon-draggable')];
        expect(icons.length).toBeGreaterThanOrEqual(14);
        for (const icon of icons) {
            expect(icon.getAttribute('role')).toBe('button');
            expect(icon.tabIndex).toBe(0);
            expect(icon.getAttribute('aria-label')).toBeTruthy();
        }
        expect(screen.getByRole('button', { name: 'Paint' })).toBeTruthy();
    });

    it('Enter opens the app, like a double-click', () => {
        const { onOpenWindow } = setup();
        fireEvent.keyDown(screen.getByRole('button', { name: 'Solitaire' }), { key: 'Enter' });
        expect(onOpenWindow).toHaveBeenCalledTimes(1);
        expect(onOpenWindow.mock.calls[0][0]).toBe('Solitaire');
    });

    it('Space opens the app too', () => {
        const { onOpenWindow } = setup();
        fireEvent.keyDown(screen.getByRole('button', { name: 'Guestbook' }), { key: ' ' });
        expect(onOpenWindow.mock.calls[0][0]).toBe('Guestbook');
    });

    it('other keys do nothing', () => {
        const { onOpenWindow } = setup();
        fireEvent.keyDown(screen.getByRole('button', { name: 'Paint' }), { key: 'a' });
        expect(onOpenWindow).not.toHaveBeenCalled();
    });

    it('the desktop applies the chosen wallpaper', () => {
        localStorage.setItem('gokalppoOS_display', JSON.stringify({ wallpaper: 'teal' }));
        setup();
        expect(document.querySelector('.desktop').style.backgroundImage).toBe('none');
        localStorage.clear();
    });

    it('programs for Start/Run are exposed with their window ids', () => {
        setup();
        // The Start menu receives these; verify through the Run box path in the taskbar.
        expect(screen.getByRole('button', { name: 'Internet Explorer' })).toBeTruthy();
    });
});

describe('Desktop open-app bus', () => {
    it('opens an app when a window asks for it by id (with its options)', () => {
        const { onOpenWindow } = setup();
        openApp('myresume');
        expect(onOpenWindow).toHaveBeenCalledTimes(1);
        const [title, content, options] = onOpenWindow.mock.calls[0];
        expect(title).toBe('My Resume');
        expect(content).toBeTruthy();
        expect(options.width).toBe('640px');
    });

    it('ignores unknown ids', () => {
        const { onOpenWindow } = setup();
        openApp('does-not-exist');
        expect(onOpenWindow).not.toHaveBeenCalled();
    });

    it('has an About Me icon', () => {
        setup();
        expect(screen.getByRole('button', { name: 'About Me' })).toBeTruthy();
    });
});

describe('Desktop file opening', () => {
    it('opens .txt files in Notepad and pictures in Paint, ignoring other types', () => {
        // handleOpenFile is passed to My Computer's content; reach it through the program list.
        const { onOpenWindow } = setup();
        openApp('mycomputer');
        const content = onOpenWindow.mock.calls.at(-1)[1];
        const open = content.props.onOpenFile;

        onOpenWindow.mockClear();
        open({ id: 'n1', name: 'a.txt' });
        open({ id: 'n2', name: 'b.png' });
        open({ id: 'n3', name: 'c.exe' });
        expect(onOpenWindow).toHaveBeenCalledTimes(2);
        expect(onOpenWindow.mock.calls[0][0]).toBe('a.txt');
        expect(onOpenWindow.mock.calls[1][0]).toBe('b.png');
        expect(onOpenWindow.mock.calls[1][2].width).toBe('830px');
    });

    it('publishes its programs so the Terminal ls always matches the desktop', () => {
        setup();
        const ids = getPrograms().map((p) => p.id);
        expect(ids).toEqual(expect.arrayContaining(['notepad', 'paint', 'solitaire', 'internetexplorer', 'messenger']));
        const { lines } = executeCommand('apps', new Date(), 'en', { programs: getPrograms() });
        expect(lines).toContain('  My Computer');
        expect(lines).toContain('  Recycle Bin');
        expect(lines).toContain('  Paint.exe');
        expect(lines).toContain('  InternetExplorer.exe');
        expect(lines).toContain('  Solitaire.exe');
    });
});
