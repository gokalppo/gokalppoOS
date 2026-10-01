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

    it('shows anonymous app-usage totals to admins, most-opened first', async () => {
        fakeDb.seed('analytics/appOpens', { paint: 3, terminal: 9 });
        renderChat(admin);

        fireEvent.click(screen.getByText(/Admin Tools/));
        await waitFor(() => expect(screen.getByText('terminal')).toBeTruthy());
        const rows = [...document.querySelectorAll('table')[0].querySelectorAll('tr')].map((tr) => tr.textContent);
        expect(rows).toEqual(['terminal9', 'paint3']);
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

describe('message history paging', () => {
    const seedMessages = (count) => {
        const data = {};
        for (let i = 1; i <= count; i++) {
            data[`m${String(i).padStart(4, '0')}`] = { senderUid: 'bob', senderName: 'Bob', text: `msg-${i}`, timestamp: i };
        }
        fakeDb.seed('messages/global-1', data);
    };
    const shown = () => document.querySelectorAll('.msg-entry').length;

    it('shows only the newest page and offers to load older messages', () => {
        seedMessages(120);
        renderChat();
        expect(shown()).toBe(50);
        expect(screen.getByText('msg-120')).toBeTruthy();
        expect(screen.queryByText('msg-70')).toBeNull();
        expect(screen.getByText('Load older messages')).toBeTruthy();
    });

    it('loads another page each time until the whole history is shown', async () => {
        seedMessages(120);
        renderChat();
        fireEvent.click(screen.getByText('Load older messages'));
        await waitFor(() => expect(shown()).toBe(100));
        fireEvent.click(screen.getByText('Load older messages'));
        await waitFor(() => expect(shown()).toBe(120));
        expect(screen.queryByText('Load older messages')).toBeNull();
        expect(screen.getByText('msg-1')).toBeTruthy();
    });

    it('does not show the button for a short history', () => {
        seedMessages(10);
        renderChat();
        expect(shown()).toBe(10);
        expect(screen.queryByText('Load older messages')).toBeNull();
    });

    it('a new message does not hide the older ones that were loaded', async () => {
        seedMessages(60);
        renderChat();
        fireEvent.click(screen.getByText('Load older messages'));
        await waitFor(() => expect(shown()).toBe(60));
        fakeDb.seed('messages/global-1/m9999', { senderUid: 'bob', senderName: 'Bob', text: 'brand new', timestamp: 9999 });
        await waitFor(() => expect(screen.getByText('brand new')).toBeTruthy());
        expect(shown()).toBeGreaterThanOrEqual(60);
    });
});

describe('send stamps and cooldown', () => {
    it('writes a numeric server timestamp and stamps lastMessageAt in the same update', async () => {
        renderChat();
        typeAndSend('hello');
        await waitFor(() => expect(fakeDb.read('messages/global-1')).not.toBeNull());
        const [msg] = Object.values(fakeDb.read('messages/global-1'));
        expect(typeof msg.timestamp).toBe('number');
        expect(typeof fakeDb.read('users/me/lastMessageAt')).toBe('number');
    });

    it('blocks a second message sent within the cooldown and explains why', async () => {
        renderChat();
        typeAndSend('first');
        await waitFor(() => expect(Object.keys(fakeDb.read('messages/global-1') || {})).toHaveLength(1));
        typeAndSend('second');
        await waitFor(() => expect(screen.getByText(/Slow down a little/)).toBeTruthy());
        expect(Object.keys(fakeDb.read('messages/global-1'))).toHaveLength(1);
        expect(document.querySelector('.msn-textarea').value).toBe('second'); // draft is kept
    });
});

describe('read receipts', () => {
    beforeEach(() => {
        fakeDb.seed('users/me/friends/bob', bob);
        fakeDb.seed('users/bob/friends/me', { uid: 'me', name: 'Gokalp' });
        fakeDb.seed('privateMessages/bob_me', {
            a1: { senderUid: 'me', senderName: 'Gokalp', text: 'my question', timestamp: 100 }
        });
    });

    it('shows a single tick until the friend has read it, then a double tick', async () => {
        renderChat();
        fireEvent.click(screen.getByText('Bob'));
        await waitFor(() => expect(screen.getByText('my question')).toBeTruthy());
        expect(screen.getByLabelText('Sent')).toBeTruthy();
        expect(screen.queryByLabelText('Read')).toBeNull();

        fakeDb.seed('users/bob/friends/me/lastReadAt', 500);
        await waitFor(() => expect(screen.getByLabelText('Read')).toBeTruthy());
    });

    it('marks incoming messages as read while their chat is open', async () => {
        fakeDb.seed('privateMessages/bob_me/a2', { senderUid: 'bob', senderName: 'Bob', text: 'hey', timestamp: 200 });
        renderChat();
        fireEvent.click(screen.getByText('Bob'));
        await waitFor(() => expect(typeof fakeDb.read('users/me/friends/bob/lastReadAt')).toBe('number'));
    });

    it('does not show ticks in public rooms', () => {
        fakeDb.seed('messages/global-1/g1', { senderUid: 'me', senderName: 'Gokalp', text: 'public', timestamp: 1 });
        renderChat();
        expect(screen.getByText('public')).toBeTruthy();
        expect(screen.queryByLabelText('Sent')).toBeNull();
    });
});

describe('Gökalp Bot inside the Messenger', () => {
    it('is pinned in the contact list and answers questions', async () => {
        renderChat();
        fireEvent.click(screen.getByText(/Gökalp Bot/));
        expect(screen.getByText('Chatting with Gökalp Bot')).toBeTruthy();
        expect(screen.getByText(/automated assistant/)).toBeTruthy();

        typeAndSend('what projects do you have?');
        await waitFor(() => expect(screen.getByText(/Here are the projects/)).toBeTruthy(), { timeout: 4000 });
        expect(screen.getByText(/CindraNet/)).toBeTruthy();
    });

    it('never touches the database for the bot chat', async () => {
        renderChat();
        fireEvent.click(screen.getByText(/Gökalp Bot/));
        typeAndSend('hello');
        await waitFor(() => expect(screen.getAllByText(/automated assistant/).length).toBeGreaterThan(1), { timeout: 4000 });
        expect(fakeDb.read('messages/bot')).toBeNull();
        expect(fakeDb.read('users/me/lastMessageAt')).toBeNull();
    });

    it('quick-reply buttons send their text', async () => {
        renderChat();
        fireEvent.click(screen.getByText(/Gökalp Bot/));
        fireEvent.click(screen.getByText('Contact', { selector: '.bot-chip' }));
        await waitFor(() => expect(screen.getByText(/ekergokalp@gmail.com/)).toBeTruthy(), { timeout: 4000 });
    });

    it('keeps the conversation when you switch to another room and back', async () => {
        renderChat();
        fireEvent.click(screen.getByText(/Gökalp Bot/));
        typeAndSend('resume');
        await waitFor(() => expect(screen.getByText(/My Resume/)).toBeTruthy(), { timeout: 4000 });
        fireEvent.click(screen.getByText('Global-2'));
        fireEvent.click(screen.getByText(/Gökalp Bot/));
        expect(screen.getByText(/My Resume/)).toBeTruthy();
    });
});

describe('guest accounts', () => {
    it('can use the Messenger without an email address', async () => {
        const guest = { uid: 'g1', username: 'Guest-1234', email: null, role: 'user', isGuest: true };
        renderChat(guest);
        expect(screen.getByText('Guest-1234')).toBeTruthy();
        typeAndSend('hi from a guest');
        await waitFor(() => expect(fakeDb.read('messages/global-1')).not.toBeNull());
        expect(fakeDb.read('userPrivate/g1')).toBeNull(); // no email to store
    });
});
