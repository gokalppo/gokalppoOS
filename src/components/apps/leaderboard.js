// Firebase access for the Minesweeper board. Loaded on demand so the game itself
// stays light and keeps working if the backend is unreachable.
import { BOARD_PATH, topScores, cleanName, validateScore, TOP_COUNT } from './minesweeperScores';

const load = () => Promise.all([import('../../firebase'), import('firebase/database')]);

export const fetchTopTimes = async () => {
    const [{ db }, { ref, query, orderByChild, limitToFirst, get }] = await load();
    const snap = await get(query(ref(db, BOARD_PATH), orderByChild('time'), limitToFirst(TOP_COUNT * 3)));
    return topScores(snap.val());
};

export const submitTime = async ({ name, time }) => {
    const errors = validateScore({ name, time });
    if (errors.length) throw new Error(errors[0]);
    const [{ db }, { ref, push, serverTimestamp }] = await load();
    await push(ref(db, BOARD_PATH), { name: cleanName(name), time, timestamp: serverTimestamp() });
};
