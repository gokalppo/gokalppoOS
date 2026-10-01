// Firebase access for the Minesweeper board. Loaded on demand so the game itself
// stays light and keeps working if the backend is unreachable.
import { BOARD_PATH, topScores, cleanName, validateScore, scoreKey } from './minesweeperScores';

const load = () => Promise.all([import('../../firebase'), import('firebase/database')]);

// A little headroom: old duplicate rows (from before records were per-name) are folded client-side.
const FETCH_LIMIT = 60;

export const fetchTopTimes = async () => {
    const [{ db }, { ref, query, orderByChild, limitToFirst, get }] = await load();
    const snap = await get(query(ref(db, BOARD_PATH), orderByChild('time'), limitToFirst(FETCH_LIMIT)));
    return topScores(snap.val());
};

// One record per name. Returns:
//   { status: 'saved' }                         first time on the board
//   { status: 'improved', previous }            beat the player's own earlier time
//   { status: 'not-faster', best }              the existing record is as fast or faster (nothing written)
export const submitTime = async ({ name, time }) => {
    const errors = validateScore({ name, time });
    if (errors.length) throw new Error(errors[0]);

    const [{ db }, { ref, get, set, serverTimestamp }] = await load();
    const recordRef = ref(db, `${BOARD_PATH}/${scoreKey(name)}`);

    const existing = (await get(recordRef)).val();
    if (existing && Number.isFinite(existing.time) && existing.time <= time) {
        return { status: 'not-faster', best: existing.time };
    }

    await set(recordRef, { name: cleanName(name), time, timestamp: serverTimestamp() });
    return existing && Number.isFinite(existing.time)
        ? { status: 'improved', previous: existing.time }
        : { status: 'saved' };
};
