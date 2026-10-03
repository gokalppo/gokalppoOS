import { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { ref, onValue } from 'firebase/database';
import { chatAccess, nowMs } from '../chatUtils';

// Whether this person may post in the global chat now, using the SERVER's clock for the account's age
// (the same clock the database rules use), so a wrong clock on the visitor's computer changes nothing.
export const useChatAccess = ({ user }) => {
    const isAdmin = user.role === 'admin';
    const isGuest = Boolean(user.isGuest);
    const [createdAt, setCreatedAt] = useState(null);
    const [offset, setOffset] = useState(0);
    const [now, setNow] = useState(() => nowMs());

    useEffect(() => {
        if (isGuest || isAdmin) return undefined;
        const stopCreated = onValue(ref(db, `users/${user.uid}/createdAt`), (snap) => setCreatedAt(snap.val()));
        const stopOffset = onValue(ref(db, '.info/serverTimeOffset'), (snap) => setOffset(Number(snap.val()) || 0));
        return () => { stopCreated(); stopOffset(); };
    }, [user.uid, isGuest, isAdmin]);

    const serverNow = now + offset;
    const access = chatAccess({ isGuest, isAdmin, createdAt, serverNow });

    // While the wait is running, re-check every second so the countdown moves and the box unlocks by itself.
    useEffect(() => {
        if (access.reason !== 'wait') return undefined;
        const timer = setInterval(() => setNow(nowMs()), 1000);
        return () => clearInterval(timer);
    }, [access.reason]);

    return access;
};
