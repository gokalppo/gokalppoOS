import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../../../../firebase';
import { ref, onValue, onDisconnect, set, remove } from 'firebase/database';
import { getPrivateRoomId } from '../chatUtils';

const STOP_AFTER_MS = 2500;

// Broadcasts typing/{roomId}/{myUid} while I type in a private chat, and
// reports whether the active contact is typing to me.
export const useTypingIndicator = ({ uid, currentRoom, activeContactId }) => {
    const typingRoomId = currentRoom === 'private' && activeContactId
        ? getPrivateRoomId(uid, activeContactId)
        : null;
    const [peerTyping, setPeerTyping] = useState({ roomId: null, typing: false });
    const broadcastingRoomRef = useRef(null);
    const timerRef = useRef(null);

    const stopTyping = useCallback(() => {
        clearTimeout(timerRef.current);
        const roomId = broadcastingRoomRef.current;
        if (roomId) {
            broadcastingRoomRef.current = null;
            remove(ref(db, `typing/${roomId}/${uid}`)).catch(() => { });
        }
    }, [uid]);

    const notifyTyping = useCallback(() => {
        if (!typingRoomId) return;
        if (broadcastingRoomRef.current !== typingRoomId) {
            stopTyping();
            broadcastingRoomRef.current = typingRoomId;
            const myTypingRef = ref(db, `typing/${typingRoomId}/${uid}`);
            onDisconnect(myTypingRef).remove().catch(() => { });
            set(myTypingRef, true).catch(() => { });
        }
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(stopTyping, STOP_AFTER_MS);
    }, [typingRoomId, uid, stopTyping]);

    // Stop broadcasting when switching chats or closing the window.
    useEffect(() => stopTyping, [typingRoomId, stopTyping]);

    useEffect(() => {
        if (!typingRoomId) return;
        const unsubscribe = onValue(
            ref(db, `typing/${typingRoomId}/${activeContactId}`),
            (snap) => setPeerTyping({ roomId: typingRoomId, typing: snap.val() === true })
        );
        return () => unsubscribe();
    }, [typingRoomId, activeContactId]);

    const isTyping = peerTyping.roomId === typingRoomId && peerTyping.typing;

    return { isTyping, notifyTyping, stopTyping };
};
