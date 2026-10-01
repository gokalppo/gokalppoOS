import { describe, it, expect } from 'vitest';
import {
    resolveAddress, isKnownPath, toAddress, initialHistory, navigate, back, forward,
    canGoBack, canGoForward, currentPath
} from './ieNavigation';

describe('resolveAddress', () => {
    it('treats empty input as home', () => {
        expect(resolveAddress('')).toEqual({ type: 'internal', path: 'home' });
        expect(resolveAddress('   ')).toEqual({ type: 'internal', path: 'home' });
        expect(resolveAddress('gokalppo://')).toEqual({ type: 'internal', path: 'home' });
    });

    it('resolves bare names, scheme URLs and slashes to internal pages', () => {
        expect(resolveAddress('projects')).toEqual({ type: 'internal', path: 'projects' });
        expect(resolveAddress('Gokalppo://About/')).toEqual({ type: 'internal', path: 'about' });
        expect(resolveAddress('/links')).toEqual({ type: 'internal', path: 'links' });
        expect(resolveAddress('gokalppo://projects/cindranet')).toEqual({ type: 'internal', path: 'projects/cindranet' });
    });

    it('flags unknown internal pages as missing (the 404 page)', () => {
        expect(resolveAddress('nope')).toEqual({ type: 'internal', path: 'nope', missing: true });
        expect(resolveAddress('projects/not-a-project')).toMatchObject({ missing: true });
    });

    it('sends real URLs and hostnames to a new tab', () => {
        expect(resolveAddress('https://github.com/gokalppo')).toEqual({ type: 'external', url: 'https://github.com/gokalppo' });
        expect(resolveAddress('example.com/page')).toEqual({ type: 'external', url: 'https://example.com/page' });
    });

    it('never produces a javascript: or other non-http URL', () => {
        const result = resolveAddress('javascript:alert(1)');
        expect(result.type).toBe('internal');
        expect(result.missing).toBe(true);
    });
});

describe('isKnownPath / toAddress', () => {
    it('knows the top-level pages and every project slug', () => {
        for (const p of ['home', 'about', 'projects', 'links', 'projects/cindranet', 'projects/iot-air-quality']) {
            expect(isKnownPath(p), p).toBe(true);
        }
        expect(isKnownPath('projects/')).toBe(false);
        expect(isKnownPath('admin')).toBe(false);
    });

    it('formats addresses', () => {
        expect(toAddress('projects')).toBe('gokalppo://projects');
    });
});

describe('history', () => {
    it('starts at home with nothing to go back or forward to', () => {
        const h = initialHistory();
        expect(currentPath(h)).toBe('home');
        expect(canGoBack(h)).toBe(false);
        expect(canGoForward(h)).toBe(false);
    });

    it('navigates, goes back and forward', () => {
        let h = initialHistory();
        h = navigate(h, 'projects');
        h = navigate(h, 'projects/cindranet');
        expect(currentPath(h)).toBe('projects/cindranet');
        h = back(h);
        expect(currentPath(h)).toBe('projects');
        expect(canGoForward(h)).toBe(true);
        h = forward(h);
        expect(currentPath(h)).toBe('projects/cindranet');
    });

    it('drops the forward entries when navigating from the middle', () => {
        let h = initialHistory();
        h = navigate(navigate(h, 'projects'), 'links');
        h = back(back(h));
        h = navigate(h, 'about');
        expect(h.entries).toEqual(['home', 'about']);
        expect(canGoForward(h)).toBe(false);
    });

    it('ignores re-navigating to the current page and clamps back/forward', () => {
        const h = initialHistory();
        expect(navigate(h, 'home')).toBe(h);
        expect(back(h)).toBe(h);
        expect(forward(h)).toBe(h);
    });
});
