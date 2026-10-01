import { describe, it, expect, beforeEach, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { OSProvider } from '../../../context/OSContext';
import { fakeDb } from '../../../test/fakeDatabase';

vi.mock('firebase/database', async () => (await import('../../../test/fakeDatabase')).databaseMock);
vi.mock('../../../firebase', () => ({
    db: {},
    auth: { signOut: vi.fn(() => Promise.resolve()) }
}));

import ChatInterface from './ChatInterface';

const me = { uid: 'me', username: 'Gokalp', email: 'g@example.com', role: 'user' };
const admin = { ...me, role: 'admin' };

const bob = { uid: 'bob', id: 'bob', name: 'Bob', status: 'online', avatar: 'star', unreadCount: 2 };

const renderChat = (user = me) =>
    render(
        <OSProvider>
            <ChatInterface user={user} onLogout={vi.fn()} />
        </OSProvider>
    );

const typeAndSend = (text) => {
    fireEvent.change(document.querySelector('.msn-textarea'), { target: { value: text } });
    fireEvent.click(screen.getByText('Send'));
};

beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
    window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
});

beforeEach(() => {
    localStorage.clear();
    fakeDb.reset();
    fakeDb.seed('.info/connected', true);
    fakeDb.seed('users/me', { uid: 'me', username: 'Gokalp' });
});

afterEach(() => cleanup());

describe('global rooms', () => {
    it('shows messages in chronological order', () => {
        fakeDb.seed('messages/global-1', {
            m2: { senderUid: 'bob', senderName: 'Bob', text: 'second', timestamp: 2 },
            m1: { senderUid: 'bob', senderName: 'Bob', text: 'first', timestamp: 1 }
        });
        renderChat();

        const text = document.querySelector('.chat-history').textContent;
        expect(text.indexOf('first')).toBeGreaterThan(-1);
        expect(text.indexOf('first')).toBeLessThan(text.indexOf('second'));
    });

    it('sends a censored message and clears the input', async () => {
        renderChat();
        typeAndSend('this is bad');

        await waitFor(() => expect(fakeDb.read('messages/global-1')).not.toBeNull());
        const [msg] = Object.values(fakeDb.read('messages/global-1'));
        expect(msg).toMatchObject({ senderUid: 'me', senderName: 'Gokalp', text: 'this is ***' });
        await waitFor(() => expect(document.querySelector('.msn-textarea').value).toBe(''));
    });

    it('does not send empty messages', () => {
        renderChat();
        typeAndSend('   ');
        expect(fakeDb.read('messages/global-1')).toBeNull();
    });

    it('switching rooms replaces the visible messages', async () => {
        fakeDb.seed('messages/global-1', { m1: { senderUid: 'bob', senderName: 'Bob', text: 'only in one', timestamp: 1 } });
        renderChat();
        expect(screen.getByText(/only in one/)).toBeTruthy();

        fireEvent.click(screen.getByText('Global-2'));
        await waitFor(() => expect(screen.queryByText(/only in one/)).toBeNull());
    });
});

describe('private chats', () => {
    beforeEach(() => {
        fakeDb.seed('users/me/friends/bob', bob);
    });

    it('opens a conversation, clears unread, and disables input until a contact is chosen', async () => {
        renderChat();
        fireEvent.click(screen.getByText('Bob'));

        expect(screen.getByText('Chatting with Bob')).toBeTruthy();
        await waitFor(() => expect(fakeDb.read('users/me/friends/bob/unreadCount')).toBe(0));
    });

    it('writes to the sorted private room and increments the receiver\'s unread count', async () => {
        fakeDb.seed('users/bob/friends/me', { uid: 'me', name: 'Gokalp', unreadCount: 0 });
        renderChat();
        fireEvent.click(screen.getByText('Bob'));
        typeAndSend('hi bob');

        await waitFor(() => expect(fakeDb.read('privateMessages/bob_me')).not.toBeNull());
        const [msg] = Object.values(fakeDb.read('privateMessages/bob_me'));
        expect(msg).toMatchObject({ senderUid: 'me', text: 'hi bob' });
        expect(fakeDb.read('users/bob/friends/me/unreadCount')).toBe(1);
    });

    it('broadcasts my typing state, shows the contact\'s, and stops when I send', async () => {
        renderChat();
        fireEvent.click(screen.getByText('Bob'));

        fireEvent.change(document.querySelector('.msn-textarea'), { target: { value: 'h' } });
        await waitFor(() => expect(fakeDb.read('typing/bob_me/me')).toBe(true));

        fakeDb.seed('typing/bob_me/bob', true);
        await waitFor(() => expect(screen.getByText('Bob is typing...')).toBeTruthy());

        fireEvent.click(screen.getByText('Send'));
        await waitFor(() => expect(fakeDb.read('typing/bob_me/me')).toBeNull());
    });

    it('hides the typing indicator when the contact stops typing', async () => {
        fakeDb.seed('typing/bob_me/bob', true);
        renderChat();
        fireEvent.click(screen.getByText('Bob'));
        await waitFor(() => expect(screen.getByText('Bob is typing...')).toBeTruthy());

        fakeDb.seed('typing/bob_me/bob', null);
        await waitFor(() => expect(screen.queryByText('Bob is typing...')).toBeNull());
    });

    it('unfriending removes both sides and returns to the global room', async () => {
        fakeDb.seed('users/bob/friends/me', { uid: 'me', name: 'Gokalp' });
        renderChat();
        fireEvent.click(screen.getByText('Bob'));
        fireEvent.click(screen.getByTitle('Unfriend'));

        await waitFor(() => expect(fakeDb.read('users/me/friends/bob')).toBeNull());
        expect(fakeDb.read('users/bob/friends/me')).toBeNull();
        expect(screen.getByText('Public Room: GLOBAL-1')).toBeTruthy();
    });
});

describe('friend requests', () => {
    it('accepting creates both friend entries and removes the request', async () => {
        fakeDb.seed('friendRequests/me/carol', { fromUid: 'carol', fromName: 'Carol', status: 'pending' });
        renderChat();

        expect(screen.getByText('Requests (1):')).toBeTruthy();
        fireEvent.click(screen.getByTitle('Accept'));

        await waitFor(() => expect(fakeDb.read('friendRequests/me/carol')).toBeNull());
        expect(fakeDb.read('users/me/friends/carol')).toMatchObject({ uid: 'carol', name: 'Carol' });
        expect(fakeDb.read('users/carol/friends/me')).toMatchObject({ uid: 'me', name: 'Gokalp' });
    });

    it('declining removes the request and records the decline time', async () => {
        fakeDb.seed('friendRequests/me/carol', { fromUid: 'carol', fromName: 'Carol', status: 'pending' });
        renderChat();
        fireEvent.click(screen.getByTitle('Decline'));

        await waitFor(() => expect(fakeDb.read('friendRequests/me/carol')).toBeNull());
        expect(typeof fakeDb.read('declinedHistory/me/carol')).toBe('number');
    });
});

describe('admin tools', () => {
    const seedMessage = () => fakeDb.seed('messages/global-1', {
        m1: { senderUid: 'bob', senderName: 'Bob', text: 'spam', timestamp: 1 }
    });

    it('hides admin controls from regular users', () => {
        seedMessage();
        renderChat(me);
        expect(screen.queryByText(/Admin Tools/)).toBeNull();
        expect(screen.queryByTitle('Delete Message')).toBeNull();
    });

    it('lets an admin soft-delete a message after confirming', async () => {
        seedMessage();
        renderChat(admin);

        fireEvent.click(screen.getByTitle('Delete Message'));
        expect(screen.getByText('System Verification')).toBeTruthy();
        fireEvent.click(screen.getByText('OK'));

        await waitFor(() => expect(fakeDb.read('messages/global-1/m1/isDeleted')).toBe(true));
        expect(fakeDb.read('messages/global-1/m1/text')).toBe('This message was removed by admin');
    });

    it('cancelling the confirmation keeps the message', () => {
        seedMessage();
        renderChat(admin);
        fireEvent.click(screen.getByTitle('Delete Message'));
        fireEvent.click(screen.getByText('Cancel'));

        expect(screen.queryByText('System Verification')).toBeNull();
        expect(fakeDb.read('messages/global-1/m1/isDeleted')).toBeNull();
    });

    it('lists users in the admin panel and bans one', async () => {
        fakeDb.seed('users/bob', { username: 'bob', role: 'user' });
        fakeDb.seed('userPrivate/bob', { email: 'bob@example.com' });
        renderChat(admin);

        fireEvent.click(screen.getByText(/Admin Tools/));
        await waitFor(() => expect(screen.getByText('bob@example.com')).toBeTruthy());
        fireEvent.click(screen.getByText('BAN'));

        await waitFor(() => expect(fakeDb.read('users/bob/isBanned')).toBe(true));
    });
});

describe('ban kill-switch', () => {
    it('shows the system-error overlay when the signed-in user is banned', async () => {
        fakeDb.seed('users/me/isBanned', true);
        renderChat();
        await waitFor(() => expect(screen.getByText('SYSTEM ERROR: ACCESS_DENIED')).toBeTruthy());
    });
});
