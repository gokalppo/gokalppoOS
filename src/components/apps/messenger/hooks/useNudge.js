import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../../../../firebase';
import { ref, onValue, set, update, push } from 'firebase/database';
import { getMessagesPath, nowMs } from '../chatUtils';

const COOLDOWN_MS = 5000;

// Nudge: shakes the window, flags the sender in the contact list, and writes
// the nudge to the recipient (state-based, so it never re-fires on reload).
export const useNudge = ({ user, containerRef, currentRoom, activeContactId, activeContact, showNotification, playNudgeSound }) => {
    const [nudgedContacts, setNudgedContacts] = useState({});
    const cooldownRef = useRef(false);
    const uid = user.uid;

    const triggerShake = useCallback(() => {
        const el = containerRef.current;
        if (el) {
            el.classList.remove('shake-animation');
            void el.offsetWidth; // force reflow so the animation restarts
            el.classList.add('shake-animation');
            setTimeout(() => {
                if (containerRef.current) containerRef.current.classList.remove('shake-animation');
            }, 500);
        }
        playNudgeSound();
    }, [containerRef, playNudgeSound]);

    // Incoming nudges.
    useEffect(() => {
        const nudgeRef = ref(db, `users/${uid}/latestNudge`);
        const unsubscribe = onValue(nudgeRef, (snapshot) => {
            const data = snapshot.val();
            if (!data || data.isProcessed) return;

            triggerShake();

            if (data.senderUid !== activeContactId) {
                setNudgedContacts((prev) => ({ ...prev, [data.senderUid]: true }));
                window.dispatchEvent(new CustomEvent('flash-taskbar', { detail: { appId: 'messenger', force: true } }));
            }

            update(nudgeRef, { isProcessed: true }).catch((e) => console.error('Nudge ack failed', e));
        });
        return () => unsubscribe();
    }, [uid, activeContactId, triggerShake]);

    const clearNudgeFor = useCallback((contactUid) => {
        setNudgedContacts((prev) => {
            const next = { ...prev };
            delete next[contactUid];
            return next;
        });
    }, []);

    const handleNudge = useCallback(async () => {
        if (currentRoom !== 'private' || !activeContact) {
            showNotification('Nudges are only available in private chat!', 'warning');
            return;
        }
        if (cooldownRef.current) {
            showNotification('Wait a moment before nudging again!', 'warning');
            return;
        }

        cooldownRef.current = true;
        setTimeout(() => { cooldownRef.current = false; }, COOLDOWN_MS);

        triggerShake(); // the sender feels it immediately

        try {
            await set(ref(db, `users/${activeContact.uid}/latestNudge`), {
                senderUid: uid,
                senderName: user.username,
                timestamp: nowMs(),
                isProcessed: false
            });
        } catch (e) {
            console.error('Global nudge write failed', e);
        }

        try {
            await push(ref(db, getMessagesPath(currentRoom, activeContactId, uid)), {
                type: 'nudge',
                senderName: user.username,
                senderUid: uid,
                timestamp: nowMs()
            });
        } catch (error) {
            console.error('Nudge Error:', error);
        }
    }, [currentRoom, activeContact, activeContactId, uid, user.username, showNotification, triggerShake]);

    return { nudgedContacts, clearNudgeFor, handleNudge };
};
