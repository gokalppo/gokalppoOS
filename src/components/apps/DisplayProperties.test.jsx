import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DisplayProvider } from '../../context/DisplayContext';
import { DISPLAY_STORAGE_KEY } from '../../display/displayConfig';
import DisplayProperties from './DisplayProperties';

const setup = () => render(<DisplayProvider><DisplayProperties /></DisplayProvider>);
const rootVar = (name) => document.documentElement.style.getPropertyValue(name);
const saved = () => JSON.parse(localStorage.getItem(DISPLAY_STORAGE_KEY) || 'null');

beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('style');
});

afterEach(() => cleanup());

describe('Display Properties', () => {
    it('starts on Background with the saved wallpaper selected', () => {
        setup();
        expect(screen.getByRole('radio', { name: /gokalppoOS Starfield/ }).getAttribute('aria-checked')).toBe('true');
        expect(screen.getByRole('radio', { name: /Bliss/ }).getAttribute('aria-checked')).toBe('false');
    });

    it('applies the standard scheme variables on load', () => {
        setup();
        expect(rootVar('--win-gray')).toBe('#c0c0c0');
        expect(rootVar('--title-from')).toBe('#000080');
    });

    it('picking a wallpaper only changes the draft until Apply', () => {
        setup();
        fireEvent.click(screen.getByRole('radio', { name: /Bliss/ }));
        expect(screen.getByRole('radio', { name: /Bliss/ }).getAttribute('aria-checked')).toBe('true');
        expect(saved()).toBeNull();

        fireEvent.click(screen.getByText('Apply'));
        expect(saved().wallpaper).toBe('bliss');
        expect(screen.getByText('Apply').disabled).toBe(true);
    });

    it('applies a colour scheme to the page and remembers it', () => {
        setup();
        fireEvent.click(screen.getByRole('tab', { name: 'Appearance' }));
        fireEvent.change(screen.getByLabelText('Scheme:'), { target: { value: 'hotdog' } });
        expect(rootVar('--title-from')).toBe('#000080'); // untouched until applied

        fireEvent.click(screen.getByText('Apply'));
        expect(rootVar('--title-from')).toBe('#d00000');
        expect(rootVar('--win-gray')).toBe('#ffe800');
        expect(saved().scheme).toBe('hotdog');
    });

    it('Cancel throws the draft away', () => {
        setup();
        fireEvent.click(screen.getByRole('tab', { name: 'Appearance' }));
        fireEvent.change(screen.getByLabelText('Scheme:'), { target: { value: 'rainy' } });
        fireEvent.click(screen.getByText('Cancel'));
        expect(saved()).toBeNull();
        expect(rootVar('--title-from')).toBe('#000080');
    });

    it('screen saver tab lets you pick a saver and a wait time', () => {
        setup();
        fireEvent.click(screen.getByRole('tab', { name: 'Screen Saver' }));
        fireEvent.change(screen.getByLabelText('Screen saver:'), { target: { value: 'mystify' } });
        fireEvent.change(screen.getByLabelText('Wait:'), { target: { value: '5' } });
        fireEvent.click(screen.getByText('Apply'));
        expect(saved()).toMatchObject({ saver: 'mystify', saverMinutes: 5 });
    });

    it('disables the wait time and preview when the saver is off', () => {
        setup();
        fireEvent.click(screen.getByRole('tab', { name: 'Screen Saver' }));
        fireEvent.change(screen.getByLabelText('Screen saver:'), { target: { value: 'none' } });
        expect(screen.getByLabelText('Wait:').disabled).toBe(true);
        expect(screen.getByText('Preview').disabled).toBe(true);
    });
});
