import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../../../../firebase';
import { ref, onValue, onDisconnect, set, update } from 'firebase/database';

const AWAY_AFTER_MS = 300000; // 5 minutes

// Own presence (connection + auto-away), status fan-out to friends, and the
// live status of every contact.
export const usePresence = ({ uid, contacts }) => {
    const [status, setStatus] = useState('online');
    const [friendStatuses, setFriendStatuses] = useState({});
    const statusRef = useRef(status);
    const contactsRef = useRef(contacts);

    useEffect(() => {
        statusRef.current = status;
        contactsRef.current = contacts;
    }, [status, contacts]);

    const handleStatusChange = useCallback((newStatus) => {
        setStatus(newStatus);
        update(ref(db, `users/${uid}`), { status: newStatus });
        contactsRef.current.forEach((friend) => {
            update(ref(db, `users/${friend.uid}/friends/${uid}`), { status: newStatus });
        });
    }, [uid]);

    // Connection monitoring: online while connected, offline on disconnect.
    useEffect(() => {
        const myStatusRef = ref(db, `users/${uid}/status`);
        const unsubscribe = onValue(ref(db, '.info/connected'), (snap) => {
            if (snap.val() === true) {
                onDisconnect(myStatusRef).set('offline');
                set(myStatusRef, 'online');
                setStatus('online');
            }
        });
        return () => unsubscribe();
    }, [uid]);

    // Live status of each friend.
    useEffect(() => {
        if (contacts.length === 0) return;
        const unsubscribes = contacts.map((contact) =>
            onValue(ref(db, `users/${contact.uid}/status`), (snap) => {
                setFriendStatuses((prev) => ({ ...prev, [contact.uid]: snap.val() || 'offline' }));
            })
        );
        return () => unsubscribes.forEach((fn) => fn());
    }, [contacts]);

    // Auto-away after inactivity; any activity brings the user back.
    useEffect(() => {
        let idleTimer;

        const setAway = () => {
            if (statusRef.current === 'online') handleStatusChange('away');
        };

        const resetTimer = () => {
            if (statusRef.current === 'away') handleStatusChange('online');
            clearTimeout(idleTimer);
            idleTimer = setTimeout(setAway, AWAY_AFTER_MS);
        };

        const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'];
        events.forEach((evt) => window.addEventListener(evt, resetTimer));
        resetTimer();

        return () => {
            clearTimeout(idleTimer);
            events.forEach((evt) => window.removeEventListener(evt, resetTimer));
        };
    }, [handleStatusChange]);

    return { status, friendStatuses, handleStatusChange };
};
