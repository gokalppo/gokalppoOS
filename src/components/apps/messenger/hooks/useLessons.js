import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../../../../firebase';
import { ref, onValue, query, orderByChild, limitToLast, update, remove } from 'firebase/database';
import { checkTeachable, TEACH_Q_MAX, TEACH_A_MAX } from '../botModeration';

const LIMIT = 200;

const toList = (value) => Object.entries(value || {})
    .filter(([, e]) => e && typeof e.q === 'string' && typeof e.a === 'string')
    .map(([id, e]) => ({ id, ...e }));

// Admin-only: what visitors taught Gökalp Bot. `pending` waits for approval; `approved` is what everyone's bot uses.
// The database rules enforce the role; this only drives the UI.
export const useLessons = ({ user, showNotification }) => {
    const isAdmin = user.role === 'admin';
    const [pending, setPending] = useState([]);
    const [approved, setApproved] = useState([]);
    const knownRef = useRef(null);
    const notifyRef = useRef(showNotification);
    useEffect(() => { notifyRef.current = showNotification; });

    useEffect(() => {
        if (!isAdmin) return undefined;
        const q = query(ref(db, 'botTaught/pending'), orderByChild('timestamp'), limitToLast(LIMIT));
        const stopPending = onValue(q, (snapshot) => {
            const next = toList(snapshot.val()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            if (knownRef.current) {
                const fresh = next.filter((e) => !knownRef.current.has(e.id));
                if (fresh.length && notifyRef.current) notifyRef.current('A visitor taught Gökalp Bot something new. Check the Inbox.', 'success');
            }
            knownRef.current = new Set(next.map((e) => e.id));
            setPending(next);
        }, () => setPending([]));
        const stopApproved = onValue(ref(db, 'botTaught/approved'), (snapshot) => {
            setApproved(toList(snapshot.val()).sort((a, b) => (b.approvedAt || 0) - (a.approvedAt || 0)));
        }, () => setApproved([]));
        return () => { stopPending(); stopApproved(); };
    }, [isAdmin]);

    const guard = useCallback(async (action, failure) => {
        if (!isAdmin) return false;
        try {
            await action();
            return true;
        } catch (e) {
            notifyRef.current?.(`${failure}: ${e.message}`, 'error');
            return false;
        }
    }, [isAdmin]);

    // Approving can also fix a typo: the text that is saved is the (edited) text passed in.
    const approve = useCallback((lesson, edits = {}) => {
        const q = String(edits.q ?? lesson.q).trim();
        const a = String(edits.a ?? lesson.a).trim();
        if (checkTeachable(q, 'question') === 'short' || checkTeachable(a, 'answer') === 'short' || q.length > TEACH_Q_MAX || a.length > TEACH_A_MAX) {
            notifyRef.current?.('That lesson is empty or too long to approve.', 'error');
            return Promise.resolve(false);
        }
        return guard(() => update(ref(db), {
            [`botTaught/approved/${lesson.id}`]: { q, a, lang: lesson.lang, approvedAt: Date.now() },
            [`botTaught/pending/${lesson.id}`]: null
        }), 'Could not approve the lesson');
    }, [guard]);

    const reject = useCallback((id) => guard(() => remove(ref(db, `botTaught/pending/${id}`)), 'Could not reject the lesson'), [guard]);
    const revoke = useCallback((id) => guard(() => remove(ref(db, `botTaught/approved/${id}`)), 'Could not remove the lesson'), [guard]);

    return { pending, approved, approve, reject, revoke };
};

// Why a waiting lesson looks suspicious, or null.
export const lessonWarning = (lesson) => {
    const reasons = [checkTeachable(lesson.q, 'question'), checkTeachable(lesson.a, 'answer')].filter((r) => r !== 'ok');
    return reasons.length ? reasons[0] : null;
};
