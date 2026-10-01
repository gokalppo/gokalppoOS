import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { fakeDb } from '../../test/fakeDatabase';

vi.mock('firebase/database', async () => (await import('../../test/fakeDatabase')).databaseMock);
vi.mock('../../firebase', () => ({ db: {} }));

import Guestbook from './Guestbook';

const fill = (name, message) => {
    fireEvent.change(document.querySelector('#gb-name'), { target: { value: name } });
    fireEvent.change(document.querySelector('#gb-message'), { target: { value: message } });
};
const sign = () => fireEvent.click(screen.getByText('Sign Guestbook'));
const entries = () => Object.values(fakeDb.read('guestbook') || {});

beforeEach(() => {
    localStorage.clear();
    fakeDb.reset();
});

afterEach(() => cleanup());

describe('Guestbook', () => {
    it('shows an empty state, then existing entries newest first', () => {
        const { unmount } = render(<Guestbook />);
        expect(screen.getByText(/No entries yet/)).toBeTruthy();
        unmount();

        fakeDb.seed('guestbook', {
            a: { name: 'Old', message: 'first post', timestamp: 1 },
            b: { name: 'New', message: 'second post', timestamp: 2 }
        });
        render(<Guestbook />);
        const text = document.querySelector('.gb-list').textContent;
        expect(text.indexOf('second post')).toBeLessThan(text.indexOf('first post'));
    });

    it('saves a signed entry with a server timestamp and shows a thank-you', async () => {
        render(<Guestbook />);
        fill('  Ada  ', 'Lovely   site!');
        sign();

        await waitFor(() => expect(entries()).toHaveLength(1));
        expect(entries()[0]).toMatchObject({ name: 'Ada', message: 'Lovely site!' });
        expect(typeof entries()[0].timestamp).toBe('number');
        await waitFor(() => expect(screen.getByText('Thanks for signing the guestbook!')).toBeTruthy());
        expect(document.querySelector('#gb-message').value).toBe('');
    });

    it('remembers the visitor name for next time', async () => {
        const first = render(<Guestbook />);
        fill('Ada', 'hello');
        sign();
        await waitFor(() => expect(entries()).toHaveLength(1));
        first.unmount();

        render(<Guestbook />);
        expect(document.querySelector('#gb-name').value).toBe('Ada');
    });

    it('validates empty fields without writing anything', () => {
        render(<Guestbook />);
        fill('Ada', '   ');
        sign();
        expect(screen.getByText('Please write a message.')).toBeTruthy();
        expect(fakeDb.read('guestbook')).toBeNull();
    });

    it('rate-limits a second post right after the first', async () => {
        render(<Guestbook />);
        fill('Ada', 'first');
        sign();
        await waitFor(() => expect(entries()).toHaveLength(1));

        fill('Ada', 'second');
        sign();
        await waitFor(() => expect(screen.getByText(/Please wait \d+s before posting again/)).toBeTruthy());
        expect(entries()).toHaveLength(1);
    });

    it('silently ignores submissions that fill the hidden honeypot field', () => {
        render(<Guestbook />);
        fill('Bot', 'buy cheap stuff');
        fireEvent.change(document.querySelector('.gb-honeypot'), { target: { value: 'http://spam' } });
        sign();
        expect(fakeDb.read('guestbook')).toBeNull();
    });

    it('renders messages as plain text (no HTML injection)', () => {
        fakeDb.seed('guestbook', { a: { name: '<b>x</b>', message: '<img src=x onerror=alert(1)>', timestamp: 1 } });
        render(<Guestbook />);
        expect(document.querySelector('.gb-list img')).toBeNull();
        expect(document.querySelector('.gb-list').textContent).toContain('<img src=x onerror=alert(1)>');
    });
});
