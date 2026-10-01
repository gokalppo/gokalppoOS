import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import StartMenu from './StartMenu';

afterEach(() => cleanup());

const programs = [
    { id: 'paint', title: 'Paint', icon: <span>P</span>, content: <div>paint</div>, options: { width: '10px' } },
    { id: 'terminal', title: 'Terminal', icon: <span>T</span>, content: <div>term</div> }
];

const setup = (props = {}) => {
    const handlers = {
        onClose: vi.fn(), onLaunch: vi.fn(), onShutdown: vi.fn(), onRun: vi.fn(),
        actions: {
            openDocuments: vi.fn(), openHelp: vi.fn(), openSystemProperties: vi.fn(), openDisplayProperties: vi.fn()
        }
    };
    render(<StartMenu isOpen programs={programs} {...handlers} {...props} />);
    return handlers;
};

describe('StartMenu', () => {
    it('renders nothing when closed', () => {
        render(<StartMenu isOpen={false} programs={programs} actions={{}} />);
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('exposes real menu items with the main entries', () => {
        setup();
        const names = screen.getAllByRole('menuitem').map((el) => el.textContent.replace('▶', '').trim());
        expect(names).toEqual(expect.arrayContaining(['Programs', 'Documents', 'Settings', 'Help', 'Run...', 'Shut Down...']));
        expect(screen.getByText('Programs').closest('button').getAttribute('aria-haspopup')).toBe('menu');
    });

    it('focuses the first entry when opened', () => {
        setup();
        expect(document.activeElement.textContent).toContain('Programs');
    });

    it('opens the Programs submenu and launches a program with its options', () => {
        const { onLaunch, onClose } = setup();
        fireEvent.click(screen.getByText('Programs'));
        fireEvent.click(screen.getByText('Paint'));
        expect(onLaunch).toHaveBeenCalledTimes(1);
        const [title, content, options] = onLaunch.mock.calls[0];
        expect(title).toBe('Paint');
        expect(content).toBeTruthy();
        expect(options.width).toBe('10px');
        expect(onClose).toHaveBeenCalled();
    });

    it('opens Settings with Display and System Properties', () => {
        const { actions } = setup();
        fireEvent.click(screen.getByText('Settings'));
        fireEvent.click(screen.getByText('Display Properties'));
        expect(actions.openDisplayProperties).toHaveBeenCalled();

        fireEvent.click(screen.getByText('Settings'));
        fireEvent.click(screen.getByText('System Properties'));
        expect(actions.openSystemProperties).toHaveBeenCalled();
    });

    it('Run... and Shut Down call their handlers', () => {
        const { onRun, onShutdown } = setup();
        fireEvent.click(screen.getByText('Run...'));
        expect(onRun).toHaveBeenCalled();
        fireEvent.click(screen.getByText('Shut Down...'));
        expect(onShutdown).toHaveBeenCalledWith('shutdown');
    });

    it('arrow keys move through the items and wrap around', () => {
        setup();
        const first = document.activeElement;
        fireEvent.keyDown(first, { key: 'ArrowDown' });
        expect(document.activeElement.textContent).toContain('Documents');
        fireEvent.keyDown(document.activeElement, { key: 'ArrowUp' });
        fireEvent.keyDown(document.activeElement, { key: 'ArrowUp' });
        expect(document.activeElement.textContent).toContain('Shut Down');
    });

    it('ArrowRight opens a submenu and ArrowLeft/Escape return to its parent', async () => {
        setup();
        const programsItem = screen.getByText('Programs').closest('button');
        programsItem.focus();
        fireEvent.keyDown(programsItem, { key: 'ArrowRight' });
        expect(screen.getByRole('menu', { name: 'Programs' })).toBeTruthy();

        const paint = await screen.findByText('Paint');
        await vi.waitFor(() => expect(document.activeElement).toBe(paint.closest('button')));
        fireEvent.keyDown(document.activeElement, { key: 'ArrowLeft' });
        expect(screen.queryByRole('menu', { name: 'Programs' })).toBeNull();
        expect(document.activeElement).toBe(programsItem);
    });

    it('Escape closes the whole menu from the top level', () => {
        const { onClose } = setup();
        fireEvent.keyDown(document.activeElement, { key: 'Escape' });
        expect(onClose).toHaveBeenCalled();
    });
});

describe('StartMenu inside the page', () => {
    it('clicks inside the menu do not reach the page-level "click outside" handler', () => {
        setup();
        const outside = vi.fn();
        window.addEventListener('click', outside);
        fireEvent.click(screen.getByText('Programs'));
        window.removeEventListener('click', outside);
        expect(outside).not.toHaveBeenCalled();
        expect(screen.getByRole('menu', { name: 'Programs' })).toBeTruthy();
    });
});

describe('StartMenu submenu hover + click', () => {
    it('hovering opens a submenu and clicking afterwards keeps it open', () => {
        setup();
        const programsItem = screen.getByText('Programs').closest('button');
        fireEvent.mouseEnter(programsItem);
        expect(screen.getByRole('menu', { name: 'Programs' })).toBeTruthy();
        fireEvent.click(programsItem);
        expect(screen.getByRole('menu', { name: 'Programs' })).toBeTruthy();
    });

    it('hovering another top-level item closes the open submenu', () => {
        setup();
        fireEvent.mouseEnter(screen.getByText('Programs').closest('button'));
        fireEvent.mouseEnter(screen.getByText('Documents').closest('button'));
        expect(screen.queryByRole('menu', { name: 'Programs' })).toBeNull();
    });
});
