import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Welcome from './Welcome';
import AboutMe from './AboutMe';
import MyResume from './MyResume';
import Gallery from './Gallery';
import { OPEN_APP_EVENT } from '../appBus';
import { WELCOME_HIDDEN_KEY, isWelcomeHidden, setWelcomeHidden } from './welcomeStorage';

const openedApps = () => {
    const ids = [];
    const listener = (e) => ids.push(e.detail.id);
    window.addEventListener(OPEN_APP_EVENT, listener);
    return { ids, stop: () => window.removeEventListener(OPEN_APP_EVENT, listener) };
};

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('welcomeStorage', () => {
    it('defaults to showing the window and remembers "don\'t show again"', () => {
        expect(isWelcomeHidden()).toBe(false);
        setWelcomeHidden(true);
        expect(isWelcomeHidden()).toBe(true);
        expect(localStorage.getItem(WELCOME_HIDDEN_KEY)).toBe('1');
        setWelcomeHidden(false);
        expect(isWelcomeHidden()).toBe(false);
    });
});

describe('Welcome', () => {
    it('introduces the owner and the three latest projects', () => {
        render(<Welcome />);
        expect(screen.getByText('Welcome to gokalppoOS!')).toBeTruthy();
        expect(screen.getByText(/Gökalp Eker/)).toBeTruthy();
        for (const title of ['CindraNet', 'AI Image Detector', 'Document Scanner']) {
            expect(screen.getByText(title)).toBeTruthy();
        }
    });

    it('the startup checkbox starts ticked and un-ticking it persists the choice', () => {
        render(<Welcome />);
        const box = screen.getByLabelText('Show this window at startup');
        expect(box.checked).toBe(true);
        fireEvent.click(box);
        expect(isWelcomeHidden()).toBe(true);
        fireEvent.click(box);
        expect(isWelcomeHidden()).toBe(false);
    });

    it('starts un-ticked for someone who already opted out', () => {
        setWelcomeHidden(true);
        render(<Welcome />);
        expect(screen.getByLabelText('Show this window at startup').checked).toBe(false);
    });

    it('its buttons ask the desktop to open the matching app', () => {
        const spy = openedApps();
        render(<Welcome />);
        fireEvent.click(screen.getByText('Open resume'));
        fireEvent.click(screen.getByText('See projects'));
        fireEvent.click(screen.getByText('About me'));
        fireEvent.click(screen.getByText('Contact'));
        spy.stop();
        expect(spy.ids).toEqual(['myresume', 'gallery', 'aboutme', 'contact']);
    });
});

describe('AboutMe', () => {
    it('shows the owner and opens apps from its buttons', () => {
        const spy = openedApps();
        render(<AboutMe />);
        expect(screen.getByRole('heading', { name: 'Gökalp Eker' })).toBeTruthy();
        fireEvent.click(screen.getByText('View resume'));
        fireEvent.click(screen.getByText('Contact me'));
        fireEvent.click(screen.getByText('Browse projects'));
        spy.stop();
        expect(spy.ids).toEqual(['myresume', 'contact', 'internetexplorer']);
    });

    it('external profile links are safe', () => {
        render(<AboutMe />);
        for (const name of ['GitHub', 'LinkedIn']) {
            const link = screen.getByText(name).closest('a');
            expect(link.getAttribute('href')).toMatch(/^https:\/\//);
            expect(link.getAttribute('target')).toBe('_blank');
            expect(link.getAttribute('rel')).toContain('noopener');
        }
    });
});

describe('MyResume', () => {
    it('offers download and open-in-new-tab links next to the embedded PDF', () => {
        render(<MyResume />);
        const download = screen.getByText(/Download PDF/).closest('a');
        expect(download.getAttribute('href')).toBe('/resume.pdf');
        expect(download.hasAttribute('download')).toBe(true);
        const newTab = screen.getByText(/Open in new tab/).closest('a');
        expect(newTab.getAttribute('target')).toBe('_blank');
        expect(newTab.getAttribute('rel')).toContain('noopener');
        expect(document.querySelector('iframe').getAttribute('src')).toContain('/resume.pdf');
    });
});

describe('Gallery project buttons', () => {
    it('shows Source / demo links for a public project and none for the private one', () => {
        render(<Gallery />);
        fireEvent.click(screen.getByText('IoT Smart Air Quality'));
        expect(screen.getByText('Source code').closest('a').getAttribute('href')).toContain('github.com/gokalppo/IoT-Air-Quality-Monitor');
        expect(screen.getByText('Watch demo')).toBeTruthy();
        fireEvent.click(document.querySelector('.gallery-modal-close'));

        fireEvent.click(screen.getByText('CindraNet'));
        expect(screen.queryByText('Source code')).toBeNull();
    });
});
