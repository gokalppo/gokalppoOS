// Sends what a visitor taught Gökalp Bot to the approval queue, and loads the lessons Gökalp approved.
// Nothing here is shown to other people until an admin approves it (database rules + the Inbox).
export const TEACH_MIN_GAP_MS = 10000;
const LAST_TEACH_KEY = 'gokalppoOS_botLastTeach';
const MAX_SHARED = 500;

const isLesson = (v) => v && typeof v.q === 'string' && typeof v.a === 'string' && (v.lang === 'en' || v.lang === 'tr');

// The shared list is read once per visit.
let sharedPromise = null;
export const resetSharedLessons = () => { sharedPromise = null; };

const defaultFetch = async () => {
    const [{ ref, get }, { db }] = await Promise.all([import('firebase/database'), import('../../../firebase')]);
    const snap = await get(ref(db, 'botTaught/approved'));
    return snap.val();
};

// Approved lessons as [{ q, a, lang }]; an empty list if offline or unavailable.
export const loadSharedLessons = (fetchApproved = defaultFetch) => {
    if (!sharedPromise) {
        sharedPromise = Promise.resolve()
            .then(fetchApproved)
            .then((value) => Object.values(value || {}).filter(isLesson).slice(-MAX_SHARED).map(({ q, a, lang }) => ({ q, a, lang })))
            .catch(() => []);
    }
    return sharedPromise;
};

const defaultSend = async ({ q, a, lang }) => {
    const [{ ref, push, update, serverTimestamp }, { auth, db }, { signInAnonymously }] = await Promise.all([
        import('firebase/database'), import('../../../firebase'), import('firebase/auth')
    ]);
    const user = auth.currentUser || (await signInAnonymously(auth)).user;
    const key = push(ref(db, 'botTaught/pending')).key;
    await update(ref(db), {
        [`botTaught/pending/${key}`]: { q, a, lang, uid: user.uid, timestamp: serverTimestamp() },
        [`botTeachMeta/${user.uid}/lastAt`]: serverTimestamp()
    });
};

// Resolves to 'sent' or 'tooSoon' (one lesson every ten seconds); rejects if the database refuses it.
export const submitLesson = async (lesson, { send = defaultSend, now = Date.now, storage } = {}) => {
    let store = storage;
    if (!store) {
        try { store = window.sessionStorage; } catch { store = null; }
    }
    const last = Number(store?.getItem(LAST_TEACH_KEY) || 0);
    if (last && now() - last < TEACH_MIN_GAP_MS) return 'tooSoon';
    await send({ q: String(lesson.q).slice(0, 80), a: String(lesson.a).slice(0, 200), lang: lesson.lang === 'tr' ? 'tr' : 'en' });
    try { store?.setItem(LAST_TEACH_KEY, String(now())); } catch { /* the limit just will not be remembered */ }
    return 'sent';
};
