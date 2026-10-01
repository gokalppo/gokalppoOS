import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Window from './Window';

afterEach(() => cleanup());

describe('Window accessibility', () => {
    it('is a dialog labelled by its title bar', () => {
        render(<Window id="demo" title="Demo App"><p>hello</p></Window>);
        const dialog = screen.getByRole('dialog', { name: 'Demo App' });
        expect(dialog).toBeTruthy();
        expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    });

    it('moves keyboard focus into a newly opened window', () => {
        render(<Window id="demo" title="Demo App"><p>hello</p></Window>);
        expect(document.activeElement).toBe(screen.getByRole('dialog'));
    });

    it('does not steal focus from an input that already has it', () => {
        const Wrapped = () => (
            <Window id="demo" title="Demo App"><input aria-label="field" autoFocus /></Window>
        );
        render(<Wrapped />);
        expect(document.activeElement).toBe(screen.getByLabelText('field'));
    });

    it('title-bar controls are labelled buttons', () => {
        render(<Window id="demo" title="Demo App" />);
        for (const name of ['Minimize', 'Maximize', 'Close']) {
            expect(screen.getByRole('button', { name })).toBeTruthy();
        }
    });

    it('marks inactive windows for styling and has resize handles only when resizable', () => {
        const { container, rerender } = render(<Window id="demo" title="Demo App" isActive={false} />);
        expect(container.querySelector('.window.inactive')).toBeTruthy();
        expect(container.querySelectorAll('.resize-handle')).toHaveLength(8);
        rerender(<Window id="demo" title="Demo App" resizable={false} />);
        expect(container.querySelectorAll('.resize-handle')).toHaveLength(0);
    });
});
