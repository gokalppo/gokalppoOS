import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupEnv, seed, seedAccounts, guestDb, deviceIdOf, sendMessage, dbAs, anonDb, assertSucceeds, assertFails, NOW } from './helpers';

// Attacks a malicious (but signed-in) visitor could try against the database. Every one of these must fail.
let env;
beforeAll(async () => { env = await setupEnv(); });
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
    await env.clearDatabase();
    await seed(env, {
        users: {
            alice: { uid: 'alice', username: 'alice', role: 'user', status: 'online' },
            bob: { uid: 'bob', username: 'bob', role: 'user', status: 'online' },
            mallory: { uid: 'mallory', username: 'mallory', role: 'user', status: 'online', isBanned: true },
            root: { uid: 'root', username: 'root', role: 'admin' }
        }
    });
    await seedAccounts(env);
});

describe('moderation cannot be undone by the person it targets', () => {
    it('a banned user cannot delete their own ban flag, directly or by rewriting their profile', async () => {
        const mallory = dbAs(env, 'mallory');
        await assertFails(mallory.ref('users/mallory/isBanned').remove());
        await assertFails(mallory.ref('users/mallory/isBanned').set(null));
        await assertFails(mallory.ref('users/mallory').set({ uid: 'mallory', username: 'mallory', status: 'online' }));
        await assertFails(mallory.ref('users/mallory').update({ isBanned: null }));
        await assertFails(mallory.ref().update({ 'users/mallory/isBanned': null }));
    });

    it('nobody can remove or change their own role, but an admin can ban and un-ban', async () => {
        await assertFails(dbAs(env, 'alice').ref('users/alice/role').remove());
        await assertFails(dbAs(env, 'alice').ref('users/alice').set({ uid: 'alice', username: 'alice', role: 'admin' }));
        await assertFails(dbAs(env, 'alice').ref('users/alice').set({ uid: 'alice', username: 'alice' })); // dropping role
        await assertSucceeds(dbAs(env, 'root').ref('users/mallory/isBanned').remove());
        await assertSucceeds(dbAs(env, 'root').ref('users/alice/isBanned').set(true));
    });

    it('a regular profile update still works', async () => {
        await assertSucceeds(dbAs(env, 'alice').ref('users/alice').update({ status: 'busy' }));
        await assertSucceeds(dbAs(env, 'alice').ref('users/alice/username').set('alice2'));
    });
});

describe('friendships need both people to agree', () => {
    it('a stranger cannot fake a friend request in their own inbox and use it to join someone else\'s friend list', async () => {
        const mallory = dbAs(env, 'alice'); // alice plays the attacker here, bob is the victim
        await assertFails(mallory.ref('friendRequests/alice/bob').set({ fromUid: 'bob', fromName: 'bob', status: 'pending' }));
        await assertFails(mallory.ref('users/bob/friends/alice').set({ id: 'alice', uid: 'alice', name: 'Admin Gökalp', status: 'online' }));
    });

    it('the real flow still works: request, accept, both entries, remove', async () => {
        const alice = dbAs(env, 'alice');
        const bob = dbAs(env, 'bob');
        await seed(env, { 'users/alice/isGuest': false });
        await assertSucceeds(alice.ref('friendRequests/bob/alice').set({ fromUid: 'alice', fromName: 'alice', status: 'pending' }));
        await assertSucceeds(bob.ref('users/bob/friends/alice').set({ id: 'alice', uid: 'alice', name: 'alice', status: 'online', avatar: 'star' }));
        await assertSucceeds(bob.ref('users/alice/friends/bob').set({ id: 'bob', uid: 'bob', name: 'bob', status: 'online', avatar: 'star' }));
        await assertSucceeds(bob.ref('friendRequests/bob/alice').remove());
    });

    it('the target may only delete a request, not invent or rewrite one', async () => {
        await seed(env, { 'friendRequests/bob/alice': { fromUid: 'alice', fromName: 'alice', status: 'pending' } });
        await assertFails(dbAs(env, 'bob').ref('friendRequests/bob/alice').set({ fromUid: 'alice', fromName: 'The Admin', status: 'pending' }));
        await assertFails(dbAs(env, 'bob').ref('friendRequests/bob/carol').set({ fromUid: 'carol', fromName: 'carol', status: 'pending' }));
        await assertSucceeds(dbAs(env, 'bob').ref('friendRequests/bob/alice').remove());
    });

    it('friend entries only hold the expected, small fields', async () => {
        await seed(env, { 'friendRequests/alice/bob': { fromUid: 'bob', fromName: 'bob', status: 'pending' } });
        const alice = dbAs(env, 'alice');
        await assertFails(alice.ref('users/bob/friends/alice').set({ id: 'alice', uid: 'alice', name: 'x'.repeat(500), status: 'online' }));
        await assertFails(alice.ref('users/bob/friends/alice').set({ id: 'alice', uid: 'alice', name: 'alice', evil: 'payload' }));
        await assertSucceeds(alice.ref('users/bob/friends/alice').set({ id: 'alice', uid: 'alice', name: 'alice', status: 'online', avatar: 'star' }));
    });
});

describe('nudges and presence only between friends', () => {
    it('a stranger cannot shake someone else\'s window', async () => {
        const nudge = { senderUid: 'alice', senderName: 'alice', timestamp: 1, isProcessed: false };
        await assertFails(dbAs(env, 'alice').ref('users/bob/latestNudge').set(nudge));
        await seed(env, { 'users/bob/friends/alice': { id: 'alice', uid: 'alice', name: 'alice', status: 'online' } });
        await assertSucceeds(dbAs(env, 'alice').ref('users/bob/latestNudge').set(nudge));
        await assertFails(dbAs(env, 'alice').ref('users/bob/latestNudge').set({ ...nudge, senderUid: 'bob' }));
    });

    it('the recipient can still acknowledge their own nudge', async () => {
        await seed(env, { 'users/bob/latestNudge': { senderUid: 'alice', senderName: 'alice', timestamp: 1, isProcessed: false } });
        await assertSucceeds(dbAs(env, 'bob').ref('users/bob/latestNudge').update({ isProcessed: true }));
    });
});

describe('profile data is validated', () => {
    it('rejects huge or odd profile fields and unknown fields', async () => {
        const alice = dbAs(env, 'alice');
        await assertFails(alice.ref('users/alice/username').set('x'.repeat(200)));
        await assertFails(alice.ref('users/alice/username').set(''));
        await assertFails(alice.ref('users/alice/username').set({ nested: 'object' }));
        await assertFails(alice.ref('users/alice/status').set('x'.repeat(100)));
        await assertFails(alice.ref('users/alice/avatar').set('x'.repeat(100)));
        await assertFails(alice.ref('users/alice/junk').set('x'.repeat(10000)));
        await assertFails(alice.ref('users/alice/uid').set('bob'));
    });

    it('rejects an oversized private e-mail record', async () => {
        await assertFails(dbAs(env, 'alice').ref('userPrivate/alice/email').set('a'.repeat(400)));
        await assertFails(dbAs(env, 'alice').ref('userPrivate/alice/other').set('x'));
        await assertSucceeds(dbAs(env, 'alice').ref('userPrivate/alice/email').set('alice@example.com'));
    });
});

describe('chat messages cannot impersonate or pile up junk', () => {
    const send = (db, uid, room, key, extra, options) => sendMessage(db, uid, room, key, extra, options);

    it('the display name has to be the sender\'s own name', async () => {
        await assertFails(send(dbAs(env, 'alice'), 'alice', 'messages/global-1', 'm1', { senderName: 'Gökalp (admin)' }));
        await assertSucceeds(send(dbAs(env, 'alice'), 'alice', 'messages/global-1', 'm2', { senderName: 'alice' }));
    });

    it('only the known fields are accepted, and only in real rooms', async () => {
        await assertFails(send(dbAs(env, 'alice'), 'alice', 'messages/global-1', 'm1', { senderName: 'alice', evil: 'x'.repeat(5000) }));
        await assertFails(send(dbAs(env, 'alice'), 'alice', 'messages/some-made-up-room-name', 'm2', { senderName: 'alice' }));
        await assertFails(send(dbAs(env, 'alice'), 'alice', 'messages/' + 'r'.repeat(80), 'm3', { senderName: 'alice' }));
        await assertSucceeds(send(dbAs(env, 'alice'), 'alice', 'messages/global-2', 'm4', { senderName: 'alice' }));
    });

    it('a nudge message is allowed, text must be text', async () => {
        await assertSucceeds(send(dbAs(env, 'alice'), 'alice', 'privateMessages/alice_bob', 'n1', { senderName: 'alice', type: 'nudge', text: null }));
        await assertFails(send(dbAs(env, 'bob'), 'bob', 'privateMessages/alice_bob', 'n2', { senderName: 'bob', text: { not: 'a string' } }));
    });
});

describe('public forms cannot be turned into a mail relay or a junk drawer', () => {
    const entry = (extra = {}) => ({ from: 'a@x.com', to: 'gokalppoos@gmail.com', subject: 'Hi', body: 'Hello', sentVia: 'emailjs', timestamp: 123, ...extra });

    it('outbox messages can only be addressed to Gökalp, never to someone else', async () => {
        await assertSucceeds(anonDb(env).ref('outbox/o1').set(entry()));
        await assertFails(anonDb(env).ref('outbox/o2').set(entry({ to: 'victim@example.com' })));
        await assertFails(anonDb(env).ref('outbox/o3').set({ from: 'a@x.com', subject: 'Hi', body: 'Hello', timestamp: 1 })); // no recipient at all
    });

    it('analytics only counts the apps that exist', async () => {
        await assertSucceeds(anonDb(env).ref('analytics/appOpens/paint').set(1));
        await assertFails(anonDb(env).ref('analytics/appOpens/totally-made-up-app').set(1));
    });
});

describe('the hardened rules still accept exactly what the app writes', () => {
    it('signing up and continuing as a guest', async () => {
        await assertSucceeds(dbAs(env, 'newbie').ref('users/newbie').set({ uid: 'newbie', username: 'Newbie', status: 'online', avatar: 'default' }));
        await assertSucceeds(dbAs(env, 'newbie').ref('userPrivate/newbie').set({ email: 'newbie@example.com' }));
        await assertSucceeds(dbAs(env, 'guest1').ref('users/guest1').set({ uid: 'guest1', username: 'Guest-1234', status: 'online', avatar: 'default', isGuest: true }));
    });

    it('sending, accepting and removing a friend request, then chatting, nudging and going offline', async () => {
        const alice = dbAs(env, 'alice');
        const bob = dbAs(env, 'bob');
        await assertSucceeds(alice.ref('friendRequests/bob/alice').set({ fromUid: 'alice', fromName: 'alice', status: 'pending' }));
        await assertSucceeds(bob.ref('users/bob/friends/alice').set({ id: 'alice', uid: 'alice', name: 'alice', status: 'online', avatar: 'star' }));
        await assertSucceeds(bob.ref('users/alice/friends/bob').set({ id: 'bob', uid: 'bob', name: 'bob', status: 'online', avatar: 'star' }));
        await assertSucceeds(bob.ref('friendRequests/bob/alice').remove());

        await assertSucceeds(alice.ref().update({
            'users/bob/friends/alice/unreadCount': { '.sv': { increment: 1 } },
            'privateMessages/alice_bob/m1': { senderName: 'alice', senderUid: 'alice', text: 'hi', timestamp: NOW },
            'users/alice/lastMessageAt': NOW
        }));
        await assertSucceeds(bob.ref('users/bob/friends/alice').update({ unreadCount: 0 }));
        await assertSucceeds(alice.ref('users/bob/latestNudge').set({ senderUid: 'alice', senderName: 'alice', timestamp: Date.now(), isProcessed: false }));
        await assertSucceeds(bob.ref('users/bob/latestNudge').update({ isProcessed: true }));
        await assertSucceeds(bob.ref('users/bob').update({ status: 'busy' }));
        await assertSucceeds(alice.ref('users/bob/friends/alice').update({ status: 'busy' }));
        await assertSucceeds(bob.ref('users/bob/status').set('offline'));
    });

    it('an admin soft-deleting a message and handling the inbox and lessons', async () => {
        await seed(env, { 'messages/global-1/m1': { senderUid: 'alice', senderName: 'alice', text: 'spam', timestamp: 1 } });
        await assertSucceeds(dbAs(env, 'root').ref('messages/global-1/m1').update({ text: 'This message was removed by admin', isDeleted: true }));
        await assertFails(dbAs(env, 'alice').ref('messages/global-1/m1').update({ text: 'edited' }));
    });

    it('declining a request removes it and remembers the decision', async () => {
        await seed(env, { 'friendRequests/bob/alice': { fromUid: 'alice', fromName: 'alice', status: 'pending' } });
        await assertSucceeds(dbAs(env, 'bob').ref('friendRequests/bob/alice').remove());
        await assertSucceeds(dbAs(env, 'bob').ref('declinedHistory/bob/alice').set(Date.now()));
    });
});

describe('small side doors', () => {
    it('typing indicators only exist for real private rooms', async () => {
        await assertSucceeds(dbAs(env, 'alice').ref('typing/alice_bob/alice').set(true));
        await assertFails(dbAs(env, 'alice').ref('typing/' + 'alice'.repeat(30) + '/alice').set(true));
        await assertFails(dbAs(env, 'alice').ref('typing/alice-bob-with-dashes/alice').set(true));
    });

    it('the "declined" record is just a time stamp', async () => {
        await assertSucceeds(dbAs(env, 'bob').ref('declinedHistory/bob/alice').set(Date.now()));
        await assertFails(dbAs(env, 'bob').ref('declinedHistory/bob/carol').set('x'.repeat(5000)));
    });

    it('nobody can read the whole database or write at the root', async () => {
        await assertFails(dbAs(env, 'alice').ref().get());
        await assertFails(dbAs(env, 'root').ref().get());
        await assertFails(dbAs(env, 'root').ref('somethingNew').set(1));
        await assertFails(anonDb(env).ref('somethingNew').set(1));
    });
});

describe('who may post in the global chat', () => {
    const post = (db, uid, key = 'm1', extra = {}) => sendMessage(db, uid, 'messages/global-1', key, extra);

    it('guests can read the global chat but not write to it, and still use private chats', async () => {
        await seed(env, {
            'users/guest1': { uid: 'guest1', username: 'guest1', isGuest: true, createdAt: 1 },
            'userPrivate/guest1/deviceId': deviceIdOf('guest1'),
            'messages/global-1/old': { senderUid: 'alice', senderName: 'alice', text: 'hi', timestamp: 1 }
        });
        const guest = guestDb(env, 'guest1');
        await assertSucceeds(guest.ref('messages/global-1').get());
        await assertFails(post(guest, 'guest1'));
        await assertSucceeds(sendMessage(guest, 'guest1', 'privateMessages/alice_guest1', 'p1'));
    });

    it('a brand-new account has to wait three minutes, an older one does not', async () => {
        const stamp = (uid, createdAt) => seed(env, { [`users/${uid}`]: { uid, username: uid, role: 'user', createdAt }, [`userPrivate/${uid}/deviceId`]: deviceIdOf(uid) });
        await stamp('fresh', Date.now() - 60000);       // one minute old
        await stamp('settled', Date.now() - 200000);    // a bit over three minutes old
        await assertFails(post(dbAs(env, 'fresh'), 'fresh'));
        await assertSucceeds(post(dbAs(env, 'settled'), 'settled'));
        await assertSucceeds(sendMessage(dbAs(env, 'fresh'), 'fresh', 'privateMessages/alice_fresh', 'p1')); // friends chats are not held back
    });

    it('an account with no creation time at all cannot post (there is no way around the wait)', async () => {
        await seed(env, { 'users/ghost': { uid: 'ghost', username: 'ghost', role: 'user' }, 'userPrivate/ghost/deviceId': deviceIdOf('ghost') });
        await assertFails(post(dbAs(env, 'ghost'), 'ghost'));
    });

    it('the creation time is stamped by the server, once, and cannot be changed or removed', async () => {
        const fresh = dbAs(env, 'fresh');
        await assertSucceeds(fresh.ref('users/fresh').set({ uid: 'fresh', username: 'fresh', createdAt: NOW }));
        await assertFails(fresh.ref('users/fresh/createdAt').set(1));
        await assertFails(fresh.ref('users/fresh/createdAt').set(NOW));
        await assertFails(fresh.ref('users/fresh/createdAt').remove());
        await assertFails(fresh.ref('users/fresh').set({ uid: 'fresh', username: 'fresh' }));
        await assertFails(dbAs(env, 'noclock').ref('users/noclock').set({ uid: 'noclock', username: 'x', createdAt: 1 })); // a made-up past date
    });

    it('an admin can always post', async () => {
        await seed(env, { 'users/root/createdAt': Date.now() });
        await assertSucceeds(post(dbAs(env, 'root'), 'root'));
    });
});

describe('bans are enforced by the database, not only by the screen', () => {
    it('a banned account cannot post anywhere or send friend requests', async () => {
        await assertFails(sendMessage(dbAs(env, 'mallory'), 'mallory', 'messages/global-1', 'm1'));
        await assertFails(sendMessage(dbAs(env, 'mallory'), 'mallory', 'privateMessages/alice_mallory', 'm2'));
        await assertFails(dbAs(env, 'mallory').ref('friendRequests/alice/mallory').set({ fromUid: 'mallory', fromName: 'mallory', status: 'pending' }));
    });

    it('a ban on a device blocks every account that uses it, until an admin lifts it', async () => {
        await assertSucceeds(sendMessage(dbAs(env, 'alice'), 'alice', 'messages/global-1', 'm1'));
        await assertSucceeds(dbAs(env, 'root').ref(`bannedDevices/${deviceIdOf('alice')}`).set(true));
        await assertFails(sendMessage(dbAs(env, 'alice'), 'alice', 'messages/global-2', 'm2'));
        await assertFails(sendMessage(dbAs(env, 'alice'), 'alice', 'privateMessages/alice_bob', 'm3'));
        await assertSucceeds(sendMessage(dbAs(env, 'bob'), 'bob', 'messages/global-1', 'm4')); // other devices are untouched
        await assertSucceeds(dbAs(env, 'root').ref(`bannedDevices/${deviceIdOf('alice')}`).remove());
        await seed(env, { 'users/alice/lastMessageAt': Date.now() - 5000 }); // past the one-message-per-second limit
        await assertSucceeds(sendMessage(dbAs(env, 'alice'), 'alice', 'messages/global-2', 'm5'));
    });

    it('chatting needs a stored device id, so leaving it out does not dodge a device ban', async () => {
        await seed(env, { 'users/nodev': { uid: 'nodev', username: 'nodev', role: 'user', createdAt: 1 } });
        await assertFails(sendMessage(dbAs(env, 'nodev'), 'nodev', 'messages/global-1', 'm1'));
        await assertSucceeds(dbAs(env, 'nodev').ref('userPrivate/nodev/deviceId').set(deviceIdOf('nodev')));
        await assertSucceeds(sendMessage(dbAs(env, 'nodev'), 'nodev', 'messages/global-1', 'm2'));
    });

    it('only an admin can list or change banned devices; anyone can ask about one specific id', async () => {
        const id = deviceIdOf('someone');
        await assertFails(dbAs(env, 'alice').ref(`bannedDevices/${id}`).set(true));
        await assertFails(anonDb(env).ref(`bannedDevices/${id}`).set(true));
        await assertSucceeds(dbAs(env, 'root').ref(`bannedDevices/${id}`).set(true));
        await assertSucceeds(anonDb(env).ref(`bannedDevices/${id}`).get());
        await assertFails(anonDb(env).ref('bannedDevices').get());
        await assertFails(dbAs(env, 'root').ref('bannedDevices/not-a-device-id').set(true));
        await assertFails(dbAs(env, 'root').ref(`bannedDevices/${deviceIdOf('x')}`).set('yes'));
    });

    it('the device id is private and has a fixed shape', async () => {
        await assertFails(dbAs(env, 'bob').ref('userPrivate/alice/deviceId').get());
        await assertSucceeds(dbAs(env, 'alice').ref('userPrivate/alice/deviceId').get());
        await assertSucceeds(dbAs(env, 'root').ref('userPrivate/alice/deviceId').get());
        await assertFails(dbAs(env, 'alice').ref('userPrivate/alice/deviceId').set('not hex'));
        await assertFails(dbAs(env, 'alice').ref('userPrivate/alice/deviceId').set('A'.repeat(32)));
    });
});
