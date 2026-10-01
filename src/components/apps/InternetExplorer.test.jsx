import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import InternetExplorer from './InternetExplorer';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const address = () => document.querySelector('#ie-address-input');
const typeAddress = (value) => {
    fireEvent.change(address(), { target: { value } });
    fireEvent.submit(address().closest('form'));
};

describe('Internet Explorer', () => {
    it('starts on the home page with Back and Forward disabled', () => {
        render(<InternetExplorer />);
        expect(address().value).toBe('gokalppo://home');
        expect(screen.getByText('Welcome to my home page')).toBeTruthy();
        expect(screen.getByText('◀ Back').disabled).toBe(true);
        expect(screen.getByText('Forward ▶').disabled).toBe(true);
    });

    it('navigates by typing an address, and Back/Forward walk the history', () => {
        render(<InternetExplorer />);
        typeAddress('projects');
        expect(address().value).toBe('gokalppo://projects');
        typeAddress('projects/cindranet');
        expect(screen.getByRole('heading', { name: 'CindraNet' })).toBeTruthy();

        fireEvent.click(screen.getByText('◀ Back'));
        expect(address().value).toBe('gokalppo://projects');
        fireEvent.click(screen.getByText('Forward ▶'));
        expect(address().value).toBe('gokalppo://projects/cindranet');
    });

    it('opens a project from its card and links back to the list', () => {
        render(<InternetExplorer />);
        typeAddress('projects');
        fireEvent.click(screen.getByText('Document Scanner').closest('button'));
        expect(screen.getByRole('heading', { name: 'Document Scanner' })).toBeTruthy();
        expect(screen.getByText('OpenCV')).toBeTruthy();
        fireEvent.click(screen.getByText('« Back to projects'));
        expect(address().value).toBe('gokalppo://projects');
    });

    it('lets the Favorites menu jump to pages', () => {
        render(<InternetExplorer />);
        fireEvent.click(screen.getByText('Favorites'));
        fireEvent.click(screen.getByRole('menuitem', { name: 'AI Image Detector' }));
        expect(address().value).toBe('gokalppo://projects/ai-image-detector');
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('shows the classic "cannot be displayed" page for unknown addresses', () => {
        render(<InternetExplorer />);
        typeAddress('does-not-exist');
        expect(screen.getByText('The page cannot be displayed')).toBeTruthy();
        fireEvent.click(screen.getByText('Go to the home page'));
        expect(address().value).toBe('gokalppo://home');
    });

    it('opens real URLs in a new tab with noopener and stays on the current page', () => {
        const open = vi.spyOn(window, 'open').mockImplementation(() => null);
        render(<InternetExplorer />);
        typeAddress('https://github.com/gokalppo');
        expect(open).toHaveBeenCalledWith('https://github.com/gokalppo', '_blank', 'noopener,noreferrer');
        expect(address().value).toBe('gokalppo://home');
        expect(screen.getByText('Opened in a new tab')).toBeTruthy();
    });

    it('external links on the Links page open safely in a new tab', () => {
        render(<InternetExplorer />);
        typeAddress('links');
        const github = screen.getByText('GitHub').closest('a');
        expect(github.getAttribute('href')).toBe('https://github.com/gokalppo');
        expect(github.getAttribute('target')).toBe('_blank');
        expect(github.getAttribute('rel')).toContain('noopener');
    });
});

describe('Internet Explorer project links', () => {
    it('shows safe Source / demo links on a project page, and none for a private project', () => {
        render(<InternetExplorer />);
        typeAddress('projects/iot-air-quality');
        const source = screen.getByText('Source code').closest('a');
        expect(source.getAttribute('href')).toBe('https://github.com/gokalppo/IoT-Air-Quality-Monitor');
        expect(source.getAttribute('rel')).toContain('noopener');
        expect(screen.getByText('Watch demo').closest('a').getAttribute('target')).toBe('_blank');

        typeAddress('projects/cindranet');
        expect(screen.queryByText('Source code')).toBeNull();
    });
});
