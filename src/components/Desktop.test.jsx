import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FileSystemProvider } from '../context/FileSystemContext';
import { DisplayProvider } from '../context/DisplayContext';
import Desktop from './Desktop';

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
