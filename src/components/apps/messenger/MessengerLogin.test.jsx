import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { fakeDb } from '../../../test/fakeDatabase';
import { setBotTimingScale } from './botEngine';

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
    setBotTimingScale(0.02);
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
        expect(screen.getByText(/I live in this Messenger/)).toBeTruthy();

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

describe('sign-up rules', () => {
    const fillAndSubmit = ({ name, email = 'a@example.com', password }) => {
        render(<LoginScreen onLogin={() => { }} onBot={() => { }} />);
        fireEvent.click(screen.getByText('Sign Up', { selector: 'span' }));
        fireEvent.change(screen.getByPlaceholderText('Screen Name'), { target: { value: name } });
        fireEvent.change(screen.getByPlaceholderText('example@hotmail.com'), { target: { value: email } });
        fireEvent.change(document.querySelector('input[type="password"]'), { target: { value: password } });
        fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));
    };

    it('turns away passwords shorter than 8 characters before asking Firebase', async () => {
        fillAndSubmit({ name: 'Ayşe', password: 'abc1234' });
        await waitFor(() => expect(screen.getByText('Password must be at least 8 characters.')).toBeTruthy());
        expect(authMock.createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });

    it('limits the screen name length in the form and in the check', () => {
        render(<LoginScreen onLogin={() => { }} onBot={() => { }} />);
        fireEvent.click(screen.getByText('Sign Up', { selector: 'span' }));
        expect(screen.getByPlaceholderText('Screen Name').getAttribute('maxLength')).toBe('30');
    });

    it('turns away a blank (spaces only) screen name', async () => {
        fillAndSubmit({ name: '   ', password: 'longenough1' });
        await waitFor(() => expect(screen.getByText(/Screen name must be 1 to 30 characters/)).toBeTruthy());
        expect(authMock.createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });

    it('creates the account with a trimmed name', async () => {
        authMock.createUserWithEmailAndPassword.mockResolvedValue({ user: { uid: 'new-uid' } });
        authMock.updateProfile.mockResolvedValue();
        fillAndSubmit({ name: '  Ayşe  ', password: 'longenough1' });
        await waitFor(() => expect(fakeDb.read('users/new-uid')).toMatchObject({ uid: 'new-uid', username: 'Ayşe' }));
        expect(fakeDb.read('userPrivate/new-uid')).toEqual({ email: 'a@example.com', deviceId: expect.stringMatching(/^[a-f0-9]{32}$/) });
        expect(typeof fakeDb.read('users/new-uid/createdAt')).toBe('number'); // starts the 3-minute wait
    });
});

describe('a banned device', () => {
    const banThisDevice = async () => {
        const { getDeviceId } = await import('../../../security/deviceId');
        fakeDb.seed(`bannedDevices/${getDeviceId()}`, true);
    };

    it('cannot continue as a guest, so ban-dodging with a new guest fails', async () => {
        await banThisDevice();
        const onLogin = vi.fn();
        render(<LoginScreen onLogin={onLogin} onBot={() => { }} />);
        fireEvent.click(screen.getByText(/Continue as guest/));
        await waitFor(() => expect(screen.getByText('This device has been banned from gokalppoOS.')).toBeTruthy());
        expect(authMock.signInAnonymously).not.toHaveBeenCalled();
        expect(onLogin).not.toHaveBeenCalled();
    });

    it('cannot sign in or create an account either', async () => {
        await banThisDevice();
        render(<LoginScreen onLogin={() => { }} onBot={() => { }} />);
        fireEvent.change(screen.getByPlaceholderText('example@hotmail.com'), { target: { value: 'a@example.com' } });
        fireEvent.change(document.querySelector('input[type="password"]'), { target: { value: 'longenough1' } });
        fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
        await waitFor(() => expect(screen.getByText('This device has been banned from gokalppoOS.')).toBeTruthy());
        expect(authMock.signInWithEmailAndPassword).not.toHaveBeenCalled();

        fireEvent.click(screen.getByText('Sign Up', { selector: 'span' }));
        fireEvent.change(screen.getByPlaceholderText('Screen Name'), { target: { value: 'Ayşe' } });
        fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));
        await waitFor(() => expect(screen.getAllByText('This device has been banned from gokalppoOS.').length).toBeGreaterThan(0));
        expect(authMock.createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });

    it('does not bother other devices', async () => {
        fakeDb.seed(`bannedDevices/${'c'.repeat(32)}`, true);
        authMock.signInAnonymously.mockResolvedValue({ user: { uid: 'guest-uid' } });
        const onLogin = vi.fn();
        render(<LoginScreen onLogin={onLogin} onBot={() => { }} />);
        fireEvent.click(screen.getByText(/Continue as guest/));
        await waitFor(() => expect(onLogin).toHaveBeenCalled());
    });
});
