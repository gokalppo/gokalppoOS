import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { fakeDb } from '../../../test/fakeDatabase';

vi.mock('firebase/database', async () => (await import('../../../test/fakeDatabase')).databaseMock);

const authMock = vi.hoisted(() => ({
    signInAnonymously: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    updateProfile: vi.fn()
}));
vi.mock('firebase/auth', () => authMock);
vi.mock('../../../firebase', () => ({ db: {}, auth: { signOut: vi.fn(() => Promise.resolve()) } }));

import LoginScreen from './LoginScreen';
import MessengerContainer from './MessengerContainer';

beforeEach(() => {
    localStorage.clear();
    fakeDb.reset();
    authMock.signInAnonymously.mockReset();
    Element.prototype.scrollIntoView = vi.fn();
    window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
});

afterEach(() => cleanup());

describe('guest sign-in', () => {
    it('creates a guest profile and signs in without email or password', async () => {
        authMock.signInAnonymously.mockResolvedValue({ user: { uid: 'guest-uid' } });
        const onLogin = vi.fn();
        render(<LoginScreen onLogin={onLogin} onBot={() => { }} />);
        fireEvent.click(screen.getByText(/Continue as guest/));

        await waitFor(() => expect(onLogin).toHaveBeenCalled());
        const user = onLogin.mock.calls[0][0];
        expect(user).toMatchObject({ uid: 'guest-uid', email: null, role: 'user', isGuest: true });
        expect(user.username).toMatch(/^Guest-\d{4}$/);
        expect(fakeDb.read('users/guest-uid')).toMatchObject({ uid: 'guest-uid', username: user.username, isGuest: true });
    });

    it('reuses the same guest name when the guest returns', async () => {
        fakeDb.seed('users/guest-uid', { uid: 'guest-uid', username: 'Guest-7777', isGuest: true });
        authMock.signInAnonymously.mockResolvedValue({ user: { uid: 'guest-uid' } });
        const onLogin = vi.fn();
        render(<LoginScreen onLogin={onLogin} />);
        fireEvent.click(screen.getByText(/Continue as guest/));
        await waitFor(() => expect(onLogin).toHaveBeenCalled());
        expect(onLogin.mock.calls[0][0].username).toBe('Guest-7777');
    });

    it('explains when guest sign-in is not enabled in Firebase', async () => {
        authMock.signInAnonymously.mockRejectedValue(Object.assign(new Error('x'), { code: 'auth/admin-restricted-operation' }));
        const onLogin = vi.fn();
        render(<LoginScreen onLogin={onLogin} />);
        fireEvent.click(screen.getByText(/Continue as guest/));
        await waitFor(() => expect(screen.getByText('Guest sign-in is not available right now.')).toBeTruthy());
        expect(onLogin).not.toHaveBeenCalled();
    });
});

describe('chat with the bot without signing in', () => {
    it('opens the bot chat from the login screen and goes back', async () => {
        render(<MessengerContainer />);
        fireEvent.click(screen.getByText(/Chat with Gökalp Bot/));
        expect(screen.getByText(/Chatting with Gökalp Bot/)).toBeTruthy();
        expect(screen.getByText(/automated assistant/)).toBeTruthy();

        fireEvent.click(screen.getByText(/Sign in/));
        expect(screen.getByText('Continue as guest', { exact: false })).toBeTruthy();
    });

    it('answers without any account or database access', async () => {
        render(<MessengerContainer />);
        fireEvent.click(screen.getByText(/Chat with Gökalp Bot/));
        fireEvent.change(document.querySelector('.msn-textarea'), { target: { value: 'how can I contact him?' } });
        fireEvent.click(screen.getByText('Send'));
        await waitFor(() => expect(screen.getByText(/ekergokalp@gmail.com/)).toBeTruthy(), { timeout: 4000 });
        expect(authMock.signInAnonymously).not.toHaveBeenCalled();
        expect(fakeDb.read('')).toBeNull();
    });
});
