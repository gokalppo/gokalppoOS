// Firebase access for the Minesweeper board. Loaded on demand so the game itself
// stays light and keeps working if the backend is unreachable.
import { BOARD_PATH, topScores, cleanName, validateScore, scoreKey } from './minesweeperScores';

// The Firebase modules are loaded once, on first use.
let loading = null;
const load = () => {
    if (!loading) {
        loading = Promise.all([import('../../firebase'), import('firebase/database')]).catch((e) => { loading = null; throw e; });
    }
    return loading;
};

// A little headroom: old duplicate rows (from before records were per-name) are folded client-side.
const FETCH_LIMIT = 60;

export const fetchTopTimes = async () => {
    const [{ db }, { ref, query, orderByChild, limitToFirst, get }] = await load();
    const snap = await get(query(ref(db, BOARD_PATH), orderByChild('time'), limitToFirst(FETCH_LIMIT)));
    return topScores(snap.val());
};

// A "run" is one game as the SERVER saw it: the database stamps when it started and when it ended (the player's
// computer cannot change that), and the rules only accept a record for a finished, unused run whose length matches
// the time that is claimed. So a fake 1-second record needs real waiting, and every game can be submitted once.
const newRunId = () => Array.from(globalThis.crypto.getRandomValues(new Uint8Array(10)), (b) => b.toString(16).padStart(2, '0')).join('');

// Called on the first click. Resolves to the run id (or rejects if the database is unreachable).
export const startRun = async () => {
    const id = newRunId();
    const [{ db }, { ref, set, serverTimestamp }] = await load();
    await set(ref(db, `runs/${id}/startedAt`), serverTimestamp());
    return id;
};

// Called the moment the game is won: the server stamps the end of the run.
export const finishRun = async (id) => {
    const [{ db }, { ref, set, serverTimestamp }] = await load();
    await set(ref(db, `runs/${id}/finishedAt`), serverTimestamp());
    return id;
};

// One record per name. Returns:
//   { status: 'saved' }                         first time on the board
//   { status: 'improved', previous }            beat the player's own earlier time
//   { status: 'not-faster', best }              the existing record is as fast or faster (nothing written)
export const submitTime = async ({ name, time, run }) => {
    const errors = validateScore({ name, time });
    if (errors.length) throw new Error(errors[0]);
    if (!run) throw new Error('noRun'); // no finished game to vouch for this time

    const [{ db }, { ref, get, update, serverTimestamp }] = await load();
    const recordRef = ref(db, `${BOARD_PATH}/${scoreKey(name)}`);

    const existing = (await get(recordRef)).val();
    if (existing && Number.isFinite(existing.time) && existing.time <= time) {
        return { status: 'not-faster', best: existing.time };
    }

    // The record and "this game is used up" are saved together, so a game can only ever count once.
    await update(ref(db), {
        [`${BOARD_PATH}/${scoreKey(name)}`]: { name: cleanName(name), time, timestamp: serverTimestamp(), run },
        [`runs/${run}/usedAt`]: serverTimestamp()
    });
    return existing && Number.isFinite(existing.time)
        ? { status: 'improved', previous: existing.time }
        : { status: 'saved' };
};
