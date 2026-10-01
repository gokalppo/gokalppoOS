import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { fakeDb } from '../test/fakeDatabase';

vi.mock('firebase/database', async () => (await import('../test/fakeDatabase')).databaseMock);
vi.mock('../firebase', () => ({ db: {} }));

import VisitorCounter from './VisitorCounter';

beforeEach(() => {
    sessionStorage.clear();
    fakeDb.reset();
    fakeDb.seed('siteStats/visitorCount', 41);
});

afterEach(() => cleanup());

describe('VisitorCounter', () => {
    it('increments once per session even if it mounts again (reloads)', async () => {
        const first = render(<VisitorCounter />);
        await waitFor(() => expect(fakeDb.read('siteStats/visitorCount')).toBe(42));
        first.unmount();

        render(<VisitorCounter />);
        render(<VisitorCounter />);
        await new Promise((r) => setTimeout(r, 30));
        expect(fakeDb.read('siteStats/visitorCount')).toBe(42);
    });

    it('shows the padded count', async () => {
        const { container } = render(<VisitorCounter />);
        await waitFor(() => expect(container.querySelector('.visitor-counter-digits').textContent).toBe('000042'));
    });
});
