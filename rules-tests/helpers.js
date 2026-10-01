import fs from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

export { assertSucceeds, assertFails };

// Matches Firebase's server timestamp placeholder.
export const NOW = { '.sv': 'timestamp' };

const RULES = fs.readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8');

export const setupEnv = async () => {
    const [host, port] = (process.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9000').split(':');
    return initializeTestEnvironment({
        projectId: 'demo-gokalppo',
        database: { host, port: Number(port), rules: RULES }
    });
};

// How the client really sends: one atomic multi-path update that also stamps the sender's
// lastMessageAt. `room` is e.g. 'messages/global-1' or 'privateMessages/alice_bob'.
export const sendMessage = (db, uid, room, key, extra = {}, { stamp = true, timestamp = NOW } = {}) =>
    db.ref().update({
        [`${room}/${key}`]: { senderUid: uid, senderName: uid, text: 'hi', timestamp, ...extra },
        ...(stamp ? { [`users/${uid}/lastMessageAt`]: NOW } : {})
    });

// Writes data with the rules switched off (to arrange a scenario). Keys may be multi-path
// ("users/alice/lastMessageAt") so existing siblings are not replaced.
export const seed = (env, data) =>
    env.withSecurityRulesDisabled(async (ctx) => { await ctx.database().ref().update(data); });

export const dbAs = (env, uid) => env.authenticatedContext(uid).database();
export const anonDb = (env) => env.unauthenticatedContext().database();
