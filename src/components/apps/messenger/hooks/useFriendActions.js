import { useCallback } from 'react';
import { db } from '../../../../firebase';
import { ref, get, set, remove } from 'firebase/database';
import { nowMs, declineCooldownMinutesLeft, GUEST_FRIENDS_MESSAGE } from '../chatUtils';

// Friend-request flows that originate from a chat message or the requests list.
export const useFriendActions = ({ user, contacts, status, showNotification }) => {
    const uid = user.uid;

    // Add-as-friend from a message's context menu (target = message author).
    const sendFriendRequest = useCallback(async (target) => {
        if (user.isGuest) {
            showNotification(GUEST_FRIENDS_MESSAGE, 'warning');
            return;
        }
        if (!target.senderUid || target.senderUid === uid) return;

        try {
            const declined = await get(ref(db, `declinedHistory/${target.senderUid}/${uid}`));
            if (declined.exists()) {
                const minutes = declineCooldownMinutesLeft(declined.val(), nowMs());
                if (minutes > 0) {
                    showNotification(`You can try again in ${minutes} minutes.`, 'warning');
                    return;
                }
            }
        } catch {
            // History unreadable — fall through and let the write rules decide.
        }

        const requestRef = ref(db, `friendRequests/${target.senderUid}/${uid}`);
        try {
            if ((await get(requestRef)).exists()) {
                showNotification('Request already sent!', 'warning');
                return;
            }
            await set(requestRef, { fromUid: uid, fromName: user.username, status: 'pending' });
            showNotification(`Request sent to ${target.senderName}!`, 'success');
        } catch (e) {
            showNotification('Error: ' + e.message, 'error');
        }
    }, [uid, user.username, user.isGuest, showNotification]);

    const acceptRequest = useCallback(async (req) => {
        const requestRef = ref(db, `friendRequests/${uid}/${req.fromUid}`);

        if (contacts.some((c) => c.uid === req.fromUid)) {
            showNotification(`${req.fromName} is already your friend.`, 'info');
            try { await remove(requestRef); } catch (e) { console.error(e); }
            return;
        }

        try {
            // Write both friend entries WHILE the pending request still exists —
            // the rules require it as proof of consent for the friendUid-side
            // write. Only remove the request once both entries are in.
            await set(ref(db, `users/${uid}/friends/${req.fromUid}`), {
                id: req.fromUid, uid: req.fromUid, name: req.fromName, status: 'online', avatar: 'star'
            });
            await set(ref(db, `users/${req.fromUid}/friends/${uid}`), {
                id: uid, uid, name: user.username, status, avatar: 'star'
            });
            await remove(requestRef);
            showNotification(`Accepted ${req.fromName}!`, 'success');
        } catch (e) {
            showNotification('Error accepting: ' + e.message, 'error');
        }
    }, [uid, user.username, contacts, status, showNotification]);

    const declineRequest = useCallback(async (req) => {
        try {
            await remove(ref(db, `friendRequests/${uid}/${req.fromUid}`));
            await set(ref(db, `declinedHistory/${uid}/${req.fromUid}`), nowMs());
            showNotification('Request declined.', 'info');
        } catch (e) {
            showNotification('Error declining: ' + e.message, 'error');
        }
    }, [uid, showNotification]);

    return { sendFriendRequest, acceptRequest, declineRequest };
};
