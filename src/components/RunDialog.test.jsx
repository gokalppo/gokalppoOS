import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import RunDialog from './RunDialog';

afterEach(() => cleanup());

describe('RunDialog', () => {
    it('is a labelled dialog with the input focused', () => {
        render(<RunDialog onExecute={() => { }} onClose={() => { }} />);
        expect(screen.getByRole('dialog', { name: 'Run' })).toBeTruthy();
        expect(document.activeElement).toBe(screen.getByLabelText('Open:'));
    });

    it('OK is disabled until something is typed', () => {
        render(<RunDialog onExecute={() => { }} onClose={() => { }} />);
        expect(screen.getByText('OK').disabled).toBe(true);
        fireEvent.change(screen.getByLabelText('Open:'), { target: { value: 'paint' } });
        expect(screen.getByText('OK').disabled).toBe(false);
    });

    it('submitting with Enter runs the text and closes', () => {
        const onExecute = vi.fn();
        const onClose = vi.fn();
        render(<RunDialog onExecute={onExecute} onClose={onClose} />);
        const input = screen.getByLabelText('Open:');
        fireEvent.change(input, { target: { value: 'neofetch' } });
        fireEvent.submit(input.closest('form'));
        expect(onExecute).toHaveBeenCalledWith('neofetch');
        expect(onClose).toHaveBeenCalled();
    });

    it('does not run empty or blank input', () => {
        const onExecute = vi.fn();
        render(<RunDialog onExecute={onExecute} onClose={() => { }} />);
        const input = screen.getByLabelText('Open:');
        fireEvent.change(input, { target: { value: '   ' } });
        fireEvent.submit(input.closest('form'));
        expect(onExecute).not.toHaveBeenCalled();
    });

    it('Escape and Cancel close without running', () => {
        const onExecute = vi.fn();
        const onClose = vi.fn();
        render(<RunDialog onExecute={onExecute} onClose={onClose} />);
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
        fireEvent.click(screen.getByText('Cancel'));
        expect(onClose).toHaveBeenCalledTimes(2);
        expect(onExecute).not.toHaveBeenCalled();
    });
});
