import { useState, useEffect, useRef } from 'react';
import { db } from '../../../../firebase';
import { ref, onValue, update, serverTimestamp } from 'firebase/database';
import { newestIncomingTimestamp } from '../chatUtils';

// Read receipts without writing to anyone else's data:
//  - when I have a friend's chat open I stamp users/{me}/friends/{friend}/lastReadAt
//  - I watch users/{friend}/friends/{me}/lastReadAt to know when THEY last read MY messages
export const useReadReceipts = ({ uid, peerId, enabled, messages }) => {
    const [peerRead, setPeerRead] = useState({ peerId: null, at: null });
    const markedRef = useRef({}); // peerId -> newest incoming timestamp already acknowledged

    useEffect(() => {
        if (!enabled || !peerId) return;
        const unsubscribe = onValue(ref(db, `users/${peerId}/friends/${uid}/lastReadAt`), (snap) => {
            setPeerRead({ peerId, at: snap.val() ?? null });
        });
        return () => unsubscribe();
    }, [enabled, peerId, uid]);

    const newestIncoming = newestIncomingTimestamp(messages, uid);

    useEffect(() => {
        if (!enabled || !peerId || !newestIncoming) return;

        const mark = () => {
            if (document.visibilityState === 'hidden') return;
            if ((markedRef.current[peerId] || 0) >= newestIncoming) return;
            markedRef.current[peerId] = newestIncoming;
            update(ref(db, `users/${uid}/friends/${peerId}`), { lastReadAt: serverTimestamp() }).catch(() => { });
        };

        mark();
        document.addEventListener('visibilitychange', mark);
        return () => document.removeEventListener('visibilitychange', mark);
    }, [enabled, peerId, uid, newestIncoming]);

    return peerRead.peerId === peerId ? peerRead.at : null;
};
