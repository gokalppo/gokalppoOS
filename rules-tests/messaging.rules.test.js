import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupEnv, seed, sendMessage, dbAs, assertSucceeds, assertFails, NOW } from './helpers';

let env;
beforeAll(async () => { env = await setupEnv(); });
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
    await env.clearDatabase();
    await seed(env, {
        users: {
            alice: { uid: 'alice', username: 'alice', role: 'user' },
            bob: { uid: 'bob', username: 'bob', role: 'user' },
            root: { uid: 'root', username: 'root', role: 'admin' }
        }
    });
});

const send = (db, room, key, extra = {}, options) => sendMessage(db, 'alice', room, key, extra, options);

describe('message timestamps', () => {
    it('are set by the server, not the client', async () => {
        const alice = dbAs(env, 'alice');
        await assertSucceeds(send(alice, 'messages/global-1', 'm1'));
        await assertFails(send(alice, 'messages/global-1', 'm2', {}, { timestamp: Date.now() }));
        await assertFails(send(alice, 'messages/global-1', 'm3', {}, { timestamp: 1 }));
    });

    it('apply to private messages too', async () => {
        const alice = dbAs(env, 'alice');
        await assertSucceeds(send(alice, 'privateMessages/alice_bob', 'm1'));
        await assertFails(send(alice, 'privateMessages/alice_bob', 'm2', {}, { timestamp: Date.now() }));
    });
});

describe('message rate limit', () => {
    it('allows a first message, then rejects another one sent immediately', async () => {
        const alice = dbAs(env, 'alice');
        await assertSucceeds(send(alice, 'messages/global-1', 'm1'));
        await assertFails(send(alice, 'messages/global-1', 'm2'));
        await assertFails(send(alice, 'privateMessages/alice_bob', 'm3'));
    });

    it('allows the next message once enough time has passed', async () => {
        await seed(env, { 'users/alice/lastMessageAt': Date.now() - 5000 });
        await assertSucceeds(send(dbAs(env, 'alice'), 'messages/global-1', 'm1'));
    });

    it('still blocks a message sent less than a second after the previous one', async () => {
        await seed(env, { 'users/alice/lastMessageAt': Date.now() - 100 });
        await assertFails(send(dbAs(env, 'alice'), 'messages/global-1', 'm1'));
    });

    it('cannot be skipped by leaving out the lastMessageAt stamp', async () => {
        await assertFails(send(dbAs(env, 'alice'), 'messages/global-1', 'm1', {}, { stamp: false }));
    });

    it('cannot be skipped by writing a fake lastMessageAt', async () => {
        await assertFails(dbAs(env, 'alice').ref('users/alice/lastMessageAt').set(5));
        await assertFails(dbAs(env, 'alice').ref('users/alice/lastMessageAt').set(Date.now()));
        await assertSucceeds(dbAs(env, 'alice').ref('users/alice/lastMessageAt').set(NOW));
    });

    it('nudges (sent as messages) count toward the limit too', async () => {
        const alice = dbAs(env, 'alice');
        const nudge = (key) => alice.ref().update({
            [`privateMessages/alice_bob/${key}`]: { type: 'nudge', senderUid: 'alice', senderName: 'alice', timestamp: NOW },
            'users/alice/lastMessageAt': NOW
        });
        await assertSucceeds(nudge('n1'));
        await assertFails(nudge('n2'));
    });

    it('does not slow down admin moderation of existing messages', async () => {
        await seed(env, {
            'messages/global-1/m1': { senderUid: 'bob', senderName: 'bob', text: 'spam', timestamp: 1 },
            'users/root/lastMessageAt': Date.now()
        });
        await assertSucceeds(dbAs(env, 'root').ref('messages/global-1/m1').update({ text: 'removed', isDeleted: true }));
    });

    it('limits are per user, so two people can chat at once', async () => {
        await assertSucceeds(send(dbAs(env, 'alice'), 'messages/global-1', 'a1'));
        await assertSucceeds(dbAs(env, 'bob').ref().update({
            'messages/global-1/b1': { senderUid: 'bob', senderName: 'bob', text: 'yo', timestamp: NOW },
            'users/bob/lastMessageAt': NOW
        }));
    });
});

describe('unread counters still work alongside sending', () => {
    it('lets the sender bump the receiver\'s unread count in the same update', async () => {
        await seed(env, { 'users/bob/friends/alice': { uid: 'alice', unreadCount: 0 } });
        await assertSucceeds(dbAs(env, 'alice').ref().update({
            'privateMessages/alice_bob/m1': { senderUid: 'alice', senderName: 'alice', text: 'hi', timestamp: NOW },
            'users/alice/lastMessageAt': NOW,
            'users/bob/friends/alice/unreadCount': 1
        }));
    });
});

describe('read receipts', () => {
    it('a user can stamp when they last read a friend\'s messages, and the friend can read it', async () => {
        await seed(env, { 'users/bob/friends/alice': { uid: 'alice' }, 'users/alice/friends/bob': { uid: 'bob' } });
        await assertSucceeds(dbAs(env, 'bob').ref('users/bob/friends/alice/lastReadAt').set(NOW));
        await assertSucceeds(dbAs(env, 'alice').ref('users/bob/friends/alice/lastReadAt').get());
    });

    it('nobody can fake someone else\'s read marker', async () => {
        await seed(env, { 'users/bob/friends/alice': { uid: 'alice' } });
        await assertFails(dbAs(env, 'carol').ref('users/bob/friends/alice/lastReadAt').set(NOW));
    });
});

describe('guest (anonymous) accounts', () => {
    it('can create their own profile like any other user', async () => {
        await assertSucceeds(dbAs(env, 'guest123').ref('users/guest123').set({ uid: 'guest123', username: 'Guest-1234', status: 'online', avatar: 'default', isGuest: true }));
        await assertFails(dbAs(env, 'guest123').ref('users/guest123/role').set('admin'));
    });
});
