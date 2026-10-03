import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupEnv, seed, seedAccounts, seedRun, sendMessage, dbAs, anonDb, assertSucceeds, assertFails, NOW } from './helpers';

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
    await seedAccounts(env);
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
    const entry = (extra = {}) => ({ from: 'a@x.com', to: 'gokalppoos@gmail.com', subject: 'Hi', body: 'Hello', sentVia: 'emailjs', timestamp: 123, ...extra });

    it('lets visitors create a well-formed entry but never read or overwrite it', async () => {
        await assertSucceeds(anonDb(env).ref('outbox/o1').set(entry()));
        await assertFails(anonDb(env).ref('outbox/o1').get());
        await assertFails(anonDb(env).ref('outbox/o1').set(entry({ body: 'tampered' })));
        await assertFails(anonDb(env).ref('outbox/o1').remove());
    });

    it('only an admin can read the whole inbox', async () => {
        await seed(env, { 'outbox/o1': entry() });
        await assertSucceeds(dbAs(env, 'root').ref('outbox').get());
        await assertFails(dbAs(env, 'alice').ref('outbox').get());
        await assertFails(dbAs(env, 'alice').ref('outbox/o1').get());
        await assertFails(anonDb(env).ref('outbox').get());
    });

    it('lets an admin read it newest first (the timestamp is indexed)', async () => {
        await seed(env, { 'outbox/o1': entry({ timestamp: 1 }), 'outbox/o2': entry({ timestamp: 2 }) });
        const snap = await assertSucceeds(dbAs(env, 'root').ref('outbox').orderByChild('timestamp').limitToLast(1).get());
        expect(Object.keys(snap.val())).toEqual(['o2']);
    });

    it('lets an admin mark messages read and delete them, but nobody else', async () => {
        await seed(env, { 'outbox/o1': entry() });
        await assertFails(dbAs(env, 'alice').ref('outbox/o1/readAt').set(5));
        await assertFails(dbAs(env, 'alice').ref('outbox/o1').remove());
        await assertSucceeds(dbAs(env, 'root').ref('outbox/o1/readAt').set(5));
        await assertSucceeds(dbAs(env, 'root').ref('outbox/o1/readAt').remove());
        await assertSucceeds(dbAs(env, 'root').ref('outbox/o1').remove());
    });

    it('does not let a visitor create an entry that is already marked read', async () => {
        await assertFails(anonDb(env).ref('outbox/o9').set(entry({ readAt: 5 })));
        await assertFails(dbAs(env, 'alice').ref('outbox/o9').set(entry({ readAt: 5 })));
        await assertFails(dbAs(env, 'root').ref('outbox/o9/readAt').set('yes'));
    });

    it('still accepts what Gökalp Bot sends', async () => {
        await assertSucceeds(anonDb(env).ref('outbox/b1').set(entry({ sentVia: 'gokalp-bot', from: 'Gökalp Bot visitor' })));
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
    // Each game is a "run": the server stamps when it started and when it finished, and a record may only be
    // saved once, for a game that really lasted about as long as the time it claims.
    const RUN = 'a1b2c3d4e5f60718293a';
    const score = (extra = {}) => ({ name: 'Ada', time: 90, timestamp: NOW, run: RUN, ...extra });
    const save = (db, key, extra, runId = RUN) => db.ref().update({
        [`leaderboards/minesweeper/${key}`]: score({ ...extra, run: runId }),
        [`runs/${runId}/usedAt`]: NOW
    });
    const finishedRun = (id = RUN, seconds = 90) => seedRun(env, id, { startedAt: Date.now() - seconds * 1000 - 5000, finishedAt: Date.now() - 5000 });

    it('is publicly readable, and a finished game can save a record', async () => {
        await finishedRun();
        await assertSucceeds(save(anonDb(env), 'ada'));
        await assertSucceeds(anonDb(env).ref('leaderboards/minesweeper').get());
    });

    it('runs: the server stamps start and finish, in order, once', async () => {
        const db = anonDb(env);
        await assertSucceeds(db.ref(`runs/${RUN}/startedAt`).set(NOW));
        await assertFails(db.ref(`runs/${RUN}/startedAt`).set(NOW)); // cannot restart the clock
        await assertFails(db.ref('runs/b1b2c3d4e5f60718293a/finishedAt').set(NOW)); // no start, no finish
        await assertFails(db.ref(`runs/${RUN}/startedAt`).remove());
        await assertSucceeds(db.ref(`runs/${RUN}/finishedAt`).set(NOW));
        await assertFails(db.ref(`runs/${RUN}/finishedAt`).set(NOW));
        await assertFails(db.ref('runs/short/startedAt').set(NOW)); // ids must look like real ones
        await assertFails(db.ref('runs/c1b2c3d4e5f60718293a/startedAt').set(Date.now() - 5000)); // the clock is the server's
    });

    it('a record needs a finished game, and cannot use the same game twice', async () => {
        await assertFails(save(anonDb(env), 'ada')); // no such run
        await seedRun(env, RUN, { startedAt: Date.now() - 100000 });
        await assertFails(save(anonDb(env), 'ada')); // started but never finished
        await finishedRun();
        await assertSucceeds(save(anonDb(env), 'ada'));
        await assertFails(save(anonDb(env), 'grace')); // the game is already used up
    });

    it('cannot claim a time much shorter than the game really took', async () => {
        await finishedRun(RUN, 90);
        await assertFails(save(anonDb(env), 'ada', { time: 30 }));
        await assertFails(save(anonDb(env), 'ada', { time: 87 }));
        await assertSucceeds(save(anonDb(env), 'ada', { time: 89 })); // a little rounding is fine
    });

    it('a game that lasted under two seconds, or a claim under three, is never a record', async () => {
        await finishedRun('d1b2c3d4e5f60718293a', 1);
        await assertFails(save(anonDb(env), 'ada', { time: 3 }, 'd1b2c3d4e5f60718293a'));
        await finishedRun('e1b2c3d4e5f60718293a', 10);
        await assertFails(save(anonDb(env), 'ada', { time: 2 }, 'e1b2c3d4e5f60718293a'));
        await assertSucceeds(save(anonDb(env), 'ada', { time: 10 }, 'e1b2c3d4e5f60718293a'));
    });

    it('allows improving your own time with a new game, not making it worse or equal', async () => {
        await finishedRun('f1b2c3d4e5f60718293a', 90);
        await assertSucceeds(save(anonDb(env), 'ada', { time: 90 }, 'f1b2c3d4e5f60718293a'));
        await finishedRun('f2b2c3d4e5f60718293a', 65);
        await assertSucceeds(save(anonDb(env), 'ada', { time: 65 }, 'f2b2c3d4e5f60718293a'));
        await finishedRun('f3b2c3d4e5f60718293a', 89);
        await assertFails(save(anonDb(env), 'ada', { time: 89 }, 'f3b2c3d4e5f60718293a'));
        await finishedRun('f4b2c3d4e5f60718293a', 65);
        await assertFails(save(anonDb(env), 'ada', { time: 65 }, 'f4b2c3d4e5f60718293a'));
    });

    it('cannot be deleted or saved without a game', async () => {
        await seed(env, { leaderboards: { minesweeper: { ada: { name: 'Ada', time: 50, timestamp: 1, run: RUN } } } });
        await assertFails(anonDb(env).ref('leaderboards/minesweeper/ada').remove());
        await assertFails(anonDb(env).ref('leaderboards/minesweeper/grace').set({ name: 'Grace', time: 40, timestamp: NOW }));
    });

    it('validates keys, names, times and timestamps', async () => {
        await finishedRun(RUN, 90);
        const bad = (key, extra) => assertFails(save(anonDb(env), key, extra));
        await bad('Ada Lovelace', {});
        await bad('ok1', { name: '' });
        await bad('ok2', { name: 'n'.repeat(21) });
        await bad('ok3', { time: 0 });
        await bad('ok4', { time: 1000 });
        await bad('ok5', { time: 12.5 });
        await bad('ok6', { timestamp: 5 });
        await bad('ok7', { extra: 1 });
    });
});
