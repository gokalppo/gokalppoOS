import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
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

describe('users', () => {
    it('only signed-in users can read profiles', async () => {
        await assertFails(anonDb(env).ref('users/alice').get());
        await assertSucceeds(dbAs(env, 'bob').ref('users/alice').get());
    });

    it('a user can edit their own profile but not someone else\'s', async () => {
        await assertSucceeds(dbAs(env, 'alice').ref('users/alice/status').set('away'));
        await assertFails(dbAs(env, 'alice').ref('users/bob/status').set('away'));
    });

    it('a normal user cannot make themselves admin or un-ban themselves', async () => {
        await assertFails(dbAs(env, 'alice').ref('users/alice/role').set('admin'));
        await assertFails(dbAs(env, 'alice').ref('users/alice/isBanned').set(false));
        await assertFails(dbAs(env, 'alice').ref('users/alice').update({ role: 'admin' }));
    });

    it('an admin can ban another user', async () => {
        await assertSucceeds(dbAs(env, 'root').ref('users/bob/isBanned').set(true));
    });

    it('email can never be written to the public users node', async () => {
        await assertFails(dbAs(env, 'alice').ref('users/alice/email').set('a@x.com'));
    });

    it('friends lists cannot be forged by someone else without consent', async () => {
        await assertFails(dbAs(env, 'bob').ref('users/alice/friends/bob').set({ uid: 'bob' }));
        await seed(env, { friendRequests: { bob: { alice: { fromUid: 'alice' } } } });
        // alice -> bob request exists under friendRequests/bob/alice; bob accepting writes both entries
        await assertSucceeds(dbAs(env, 'bob').ref('users/bob/friends/alice').set({ uid: 'alice' }));
        await assertSucceeds(dbAs(env, 'alice').ref('users/alice/friends/bob').set({ uid: 'bob' }));
    });
});

describe('public chat rooms', () => {
    it('require sign-in', async () => {
        await assertFails(anonDb(env).ref('messages/global-1').get());
        await assertFails(anonDb(env).ref('messages/global-1/m1').set({ senderUid: 'x', text: 'hi', timestamp: NOW }));
    });

    it('let a user post as themselves, not as someone else', async () => {
        await assertSucceeds(sendMessage(dbAs(env, 'alice'), 'alice', 'messages/global-1', 'm1'));
        await assertFails(sendMessage(dbAs(env, 'bob'), 'bob', 'messages/global-1', 'm2', { senderUid: 'alice' }));
    });

    it('stop users from editing existing messages, but let admins moderate', async () => {
        await seed(env, { 'messages/global-1/m1': { senderUid: 'alice', senderName: 'alice', text: 'hi', timestamp: 1 } });
        await assertFails(dbAs(env, 'alice').ref('messages/global-1/m1/text').set('edited'));
        await assertSucceeds(dbAs(env, 'root').ref('messages/global-1/m1').update({ text: 'removed', isDeleted: true }));
    });

    it('cap message text at 1000 characters and sender name at 40', async () => {
        const alice = dbAs(env, 'alice');
        await assertSucceeds(sendMessage(alice, 'alice', 'messages/global-1', 'ok', { text: 'x'.repeat(1000) }));
        await seed(env, { 'users/alice/lastMessageAt': null });
        await assertFails(sendMessage(alice, 'alice', 'messages/global-1', 'long', { text: 'x'.repeat(1001) }));
        await assertFails(sendMessage(alice, 'alice', 'messages/global-1', 'name', { senderName: 'n'.repeat(41) }));
    });
});

describe('private messages', () => {
    it('are only readable and writable by the two participants', async () => {
        await assertSucceeds(sendMessage(dbAs(env, 'alice'), 'alice', 'privateMessages/alice_bob', 'm1', { text: 'secret' }));
        await assertSucceeds(dbAs(env, 'bob').ref('privateMessages/alice_bob').get());
        await assertFails(dbAs(env, 'root').ref('privateMessages/alice_bob').get());
        await assertFails(sendMessage(dbAs(env, 'carol'), 'carol', 'privateMessages/alice_bob', 'm2'));
    });
});

describe('typing indicator', () => {
    it('can only be set by the person typing, inside their own conversation', async () => {
        await assertSucceeds(dbAs(env, 'alice').ref('typing/alice_bob/alice').set(true));
        await assertFails(dbAs(env, 'alice').ref('typing/alice_bob/bob').set(true));
        await assertFails(dbAs(env, 'carol').ref('typing/alice_bob/carol').set(true));
        await assertFails(dbAs(env, 'alice').ref('typing/alice_bob/alice').set('yes'));
    });
});

describe('visitor counter', () => {
    it('lets anyone read it and add exactly one', async () => {
        await seed(env, { siteStats: { visitorCount: 41 } });
        await assertSucceeds(anonDb(env).ref('siteStats/visitorCount').get());
        await assertSucceeds(anonDb(env).ref('siteStats/visitorCount').set(42));
    });

    it('rejects jumps, rewinds and arbitrary values', async () => {
        await seed(env, { siteStats: { visitorCount: 41 } });
        await assertFails(anonDb(env).ref('siteStats/visitorCount').set(99999));
        await assertFails(anonDb(env).ref('siteStats/visitorCount').set(40));
        await assertFails(anonDb(env).ref('siteStats/visitorCount').set(0));
        await assertFails(anonDb(env).ref('siteStats/visitorCount').set('42'));
    });
});

describe('outbox', () => {
    const entry = (extra = {}) => ({ from: 'a@x.com', to: 'me@x.com', subject: 'Hi', body: 'Hello', sentVia: 'emailjs', timestamp: 123, ...extra });

    it('lets visitors create a well-formed entry but never read or overwrite it', async () => {
        await assertSucceeds(anonDb(env).ref('outbox/o1').set(entry()));
        await assertFails(anonDb(env).ref('outbox/o1').get());
        await assertFails(anonDb(env).ref('outbox/o1').set(entry({ body: 'tampered' })));
        await assertFails(dbAs(env, 'root').ref('outbox').get());
    });

    it('rejects missing fields, oversized fields and unknown fields', async () => {
        await assertFails(anonDb(env).ref('outbox/o2').set({ from: 'a', subject: 's' }));
        await assertFails(anonDb(env).ref('outbox/o3').set(entry({ body: 'x'.repeat(5001) })));
        await assertFails(anonDb(env).ref('outbox/o4').set(entry({ subject: 's'.repeat(201) })));
        await assertFails(anonDb(env).ref('outbox/o5').set(entry({ evil: 'payload' })));
    });
});

describe('analytics counters', () => {
    it('anyone can add exactly one to a valid app counter', async () => {
        await assertSucceeds(anonDb(env).ref('analytics/appOpens/paint').set(1));
        await assertSucceeds(anonDb(env).ref('analytics/appOpens/paint').set(2));
        await assertFails(anonDb(env).ref('analytics/appOpens/paint').set(10));
        await assertFails(anonDb(env).ref('analytics/appOpens/paint').set(1));
    });

    it('rejects invalid app names', async () => {
        await assertFails(anonDb(env).ref('analytics/appOpens/Bad Name').set(1));
        await assertFails(anonDb(env).ref('analytics/appOpens/' + 'a'.repeat(41)).set(1));
    });

    it('only admins can read the totals', async () => {
        await seed(env, { analytics: { appOpens: { paint: 3 } } });
        await assertFails(anonDb(env).ref('analytics/appOpens').get());
        await assertFails(dbAs(env, 'alice').ref('analytics/appOpens').get());
        await assertSucceeds(dbAs(env, 'root').ref('analytics/appOpens').get());
    });

    it('works with the client\'s multi-path update form', async () => {
        await assertSucceeds(anonDb(env).ref('analytics/appOpens').update({ terminal: 1 }));
    });
});

describe('guestbook', () => {
    const post = (extra = {}) => ({ name: 'Ada', message: 'Great site!', timestamp: NOW, ...extra });

    it('is publicly readable', async () => {
        await seed(env, { guestbook: { g1: { name: 'x', message: 'y', timestamp: 1 } } });
        await assertSucceeds(anonDb(env).ref('guestbook').get());
    });

    it('lets visitors post with a server timestamp', async () => {
        await assertSucceeds(anonDb(env).ref('guestbook').push(post()));
    });

    it('rejects a client-supplied timestamp, missing, empty, long or extra fields', async () => {
        await assertFails(anonDb(env).ref('guestbook').push(post({ timestamp: 1 })));
        await assertFails(anonDb(env).ref('guestbook').push({ name: 'Ada', timestamp: NOW }));
        await assertFails(anonDb(env).ref('guestbook').push(post({ name: '' })));
        await assertFails(anonDb(env).ref('guestbook').push(post({ name: 'n'.repeat(31) })));
        await assertFails(anonDb(env).ref('guestbook').push(post({ message: 'm'.repeat(281) })));
        await assertFails(anonDb(env).ref('guestbook').push(post({ admin: true })));
    });

    it('cannot be edited or deleted by visitors, but admins can moderate', async () => {
        await seed(env, { guestbook: { g1: { name: 'x', message: 'y', timestamp: 1 } } });
        await assertFails(anonDb(env).ref('guestbook/g1/message').set('hacked'));
        await assertFails(anonDb(env).ref('guestbook/g1').remove());
        await assertFails(dbAs(env, 'alice').ref('guestbook/g1').remove());
        await assertSucceeds(dbAs(env, 'root').ref('guestbook/g1').remove());
    });
});

describe('minesweeper leaderboard', () => {
    const score = (extra = {}) => ({ name: 'Ada', time: 90, timestamp: NOW, ...extra });

    it('is publicly readable and lets anyone create a record', async () => {
        await assertSucceeds(anonDb(env).ref('leaderboards/minesweeper/ada').set(score()));
        await assertSucceeds(anonDb(env).ref('leaderboards/minesweeper').get());
    });

    it('allows improving your own time but not making it worse or equal', async () => {
        await assertSucceeds(anonDb(env).ref('leaderboards/minesweeper/ada').set(score({ time: 90 })));
        await assertSucceeds(anonDb(env).ref('leaderboards/minesweeper/ada').set(score({ time: 65 })));
        await assertFails(anonDb(env).ref('leaderboards/minesweeper/ada').set(score({ time: 89 })));
        await assertFails(anonDb(env).ref('leaderboards/minesweeper/ada').set(score({ time: 65 })));
    });

    it('cannot be deleted', async () => {
        await seed(env, { leaderboards: { minesweeper: { ada: { name: 'Ada', time: 50, timestamp: 1 } } } });
        await assertFails(anonDb(env).ref('leaderboards/minesweeper/ada').remove());
    });

    it('validates keys, names, times and timestamps', async () => {
        await assertFails(anonDb(env).ref('leaderboards/minesweeper/Ada Lovelace').set(score()));
        await assertFails(anonDb(env).ref('leaderboards/minesweeper/ok1').set(score({ name: '' })));
        await assertFails(anonDb(env).ref('leaderboards/minesweeper/ok2').set(score({ name: 'n'.repeat(21) })));
        await assertFails(anonDb(env).ref('leaderboards/minesweeper/ok3').set(score({ time: 0 })));
        await assertFails(anonDb(env).ref('leaderboards/minesweeper/ok4').set(score({ time: 1000 })));
        await assertFails(anonDb(env).ref('leaderboards/minesweeper/ok5').set(score({ time: 12.5 })));
        await assertFails(anonDb(env).ref('leaderboards/minesweeper/ok6').set(score({ timestamp: 5 })));
        await assertFails(anonDb(env).ref('leaderboards/minesweeper/ok7').set(score({ extra: 1 })));
    });
});
