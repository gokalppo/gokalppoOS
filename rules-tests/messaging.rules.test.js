import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupEnv, seed, sendMessage, dbAs, anonDb, assertSucceeds, assertFails, NOW } from './helpers';

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

describe('guests and friend requests', () => {
    const guestDb = () => env.authenticatedContext('guest1', { firebase: { sign_in_provider: 'anonymous' } }).database();
    const request = (fromUid) => ({ fromUid, fromName: fromUid, status: 'pending' });

    it('a normal account can send a friend request', async () => {
        await assertSucceeds(dbAs(env, 'alice').ref('friendRequests/bob/alice').set(request('alice')));
    });

    it('a guest (anonymous account) cannot send one', async () => {
        await assertFails(guestDb().ref('friendRequests/bob/guest1').set(request('guest1')));
    });

    it('a guest can still answer or withdraw a request addressed to them', async () => {
        await seed(env, { 'friendRequests/guest1/alice': request('alice') });
        await assertSucceeds(guestDb().ref('friendRequests/guest1/alice').remove());
    });

    it('nobody can send a request in someone else\'s name', async () => {
        await assertFails(dbAs(env, 'alice').ref('friendRequests/bob/carol').set(request('carol')));
    });
});

describe('what visitors teach Gökalp Bot', () => {
    const lesson = (uid, extra = {}, stamp = NOW) => ({ q: 'how is life', a: 'pretty good', lang: 'en', uid, timestamp: stamp, ...extra });
    const teach = (db, uid, key, extra, options = {}) => db.ref().update({
        [`botTaught/pending/${key}`]: lesson(uid, extra),
        ...(options.stamp === false ? {} : { [`botTeachMeta/${uid}/lastAt`]: NOW })
    });

    it('lets a signed-in visitor (even a guest) submit a lesson, stamped by the server', async () => {
        await assertSucceeds(teach(dbAs(env, 'alice'), 'alice', 'l1'));
        await assertFails(teach(dbAs(env, 'alice'), 'alice', 'l2', { timestamp: Date.now() })); // client clock
    });

    it('needs a sign-in and the visitor\'s own id', async () => {
        await assertFails(anonDb(env).ref('botTaught/pending/l1').set(lesson('x')));
        await assertFails(teach(dbAs(env, 'alice'), 'bob', 'l3'));
    });

    it('limits one visitor to a lesson every ten seconds, and the stamp cannot be skipped or faked', async () => {
        await assertSucceeds(teach(dbAs(env, 'alice'), 'alice', 'l1'));
        await assertFails(teach(dbAs(env, 'alice'), 'alice', 'l2'));
        await seed(env, { 'botTeachMeta/bob/lastAt': Date.now() - 20000 });
        await assertSucceeds(teach(dbAs(env, 'bob'), 'bob', 'l3'));
        await assertFails(teach(dbAs(env, 'alice'), 'alice', 'l4', {}, { stamp: false }));
        await assertFails(dbAs(env, 'alice').ref('botTeachMeta/alice/lastAt').set(5));
        await assertFails(dbAs(env, 'alice').ref('botTeachMeta/bob/lastAt').set(NOW));
    });

    it('checks the shape and size of a lesson', async () => {
        const alice = dbAs(env, 'alice');
        await assertFails(teach(alice, 'alice', 'a1', { q: 'x' }));
        await assertFails(teach(alice, 'alice', 'a2', { q: 'x'.repeat(81) }));
        await assertFails(teach(alice, 'alice', 'a3', { a: 'y'.repeat(201) }));
        await assertFails(teach(alice, 'alice', 'a4', { lang: 'fr' }));
        await assertFails(teach(alice, 'alice', 'a5', { evil: 'payload' }));
        await assertSucceeds(teach(alice, 'alice', 'a6', { q: 'x'.repeat(80), a: 'y'.repeat(200) }));
    });

    it('only an admin can read the waiting lessons, and visitors cannot change or delete them', async () => {
        await assertSucceeds(teach(dbAs(env, 'alice'), 'alice', 'l1'));
        await assertFails(dbAs(env, 'alice').ref('botTaught/pending').get());
        await assertFails(dbAs(env, 'alice').ref('botTaught/pending/l1').get());
        await assertFails(anonDb(env).ref('botTaught/pending').get());
        await assertSucceeds(dbAs(env, 'root').ref('botTaught/pending').get());
        await assertFails(dbAs(env, 'alice').ref('botTaught/pending/l1/a').set('hacked'));
        await assertFails(dbAs(env, 'alice').ref('botTaught/pending/l1').remove());
    });

    it('an admin approves a lesson: it moves to the public list in one step', async () => {
        await assertSucceeds(teach(dbAs(env, 'alice'), 'alice', 'l1'));
        await assertSucceeds(dbAs(env, 'root').ref().update({
            'botTaught/approved/l1': { q: 'how is life', a: 'pretty good', lang: 'en', approvedAt: Date.now() },
            'botTaught/pending/l1': null
        }));
        const snap = await assertSucceeds(anonDb(env).ref('botTaught/approved').get());
        expect(Object.keys(snap.val())).toEqual(['l1']);
        await assertSucceeds(dbAs(env, 'root').ref('botTaught/pending').get());
    });

    it('anyone can read the approved lessons, but only an admin can add, change or remove them', async () => {
        const entry = { q: 'hi there', a: 'hello', lang: 'en', approvedAt: 1 };
        await assertFails(dbAs(env, 'alice').ref('botTaught/approved/x1').set(entry));
        await assertFails(anonDb(env).ref('botTaught/approved/x1').set(entry));
        await assertSucceeds(dbAs(env, 'root').ref('botTaught/approved/x1').set(entry));
        await assertSucceeds(anonDb(env).ref('botTaught/approved').get());
        await assertFails(dbAs(env, 'alice').ref('botTaught/approved/x1').remove());
        await assertFails(dbAs(env, 'root').ref('botTaught/approved/x2').set({ ...entry, lang: 'de' }));
        await assertFails(dbAs(env, 'root').ref('botTaught/approved/x3').set({ ...entry, extra: 1 }));
        await assertSucceeds(dbAs(env, 'root').ref('botTaught/approved/x1').remove());
    });
});
