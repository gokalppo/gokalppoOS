import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../../../../firebase';
import { ref, onValue, query, orderByChild, limitToLast, update, remove } from 'firebase/database';
import { entriesFromSnapshot, unreadCount } from '../inboxUtils';

const INBOX_LIMIT = 200;

// Admin-only: live list of messages left in `outbox`, with read/unread and delete.
// The database rules enforce the role; this only drives the UI.
export const useInbox = ({ user, showNotification }) => {
    const isAdmin = user.role === 'admin';
    const [entries, setEntries] = useState([]);
    const knownRef = useRef(null); // ids already seen, to announce only genuinely new messages
    const notifyRef = useRef(showNotification);
    useEffect(() => { notifyRef.current = showNotification; });

    useEffect(() => {
        if (!isAdmin) return undefined;
        const q = query(ref(db, 'outbox'), orderByChild('timestamp'), limitToLast(INBOX_LIMIT));
        const unsubscribe = onValue(q, (snapshot) => {
            const next = entriesFromSnapshot(snapshot.val());
            if (knownRef.current) {
                const fresh = next.filter((e) => !knownRef.current.has(e.id));
                if (fresh.length && notifyRef.current) {
                    notifyRef.current(`New message in your inbox from ${fresh[0].from || 'a visitor'}`, 'success');
                }
            }
            knownRef.current = new Set(next.map((e) => e.id));
            setEntries(next);
        }, () => setEntries([]));
        return () => unsubscribe();
    }, [isAdmin]);

    const setRead = useCallback(async (id, read) => {
        if (!isAdmin) return;
        try {
            await update(ref(db, `outbox/${id}`), { readAt: read ? Date.now() : null });
        } catch (e) { showNotification?.('Could not update the message: ' + e.message, 'error'); }
    }, [isAdmin, showNotification]);

    const markAllRead = useCallback(async () => {
        if (!isAdmin) return;
        const now = Date.now();
        const updates = {};
        entries.filter((e) => !e.readAt).forEach((e) => { updates[`${e.id}/readAt`] = now; });
        if (!Object.keys(updates).length) return;
        try {
            await update(ref(db, 'outbox'), updates);
        } catch (e) { showNotification?.('Could not update the inbox: ' + e.message, 'error'); }
    }, [isAdmin, entries, showNotification]);

    const deleteEntry = useCallback(async (id) => {
        if (!isAdmin) return;
        try {
            await remove(ref(db, `outbox/${id}`));
        } catch (e) { showNotification?.('Could not delete the message: ' + e.message, 'error'); }
    }, [isAdmin, showNotification]);

    return { entries, unread: unreadCount(entries), markRead: (id) => setRead(id, true), markUnread: (id) => setRead(id, false), markAllRead, deleteEntry };
};
